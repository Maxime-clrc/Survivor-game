# Sauvegarde Supabase et comptes joueurs

Ce guide couvre la mise en place de la persistance Supabase et le
fonctionnement des comptes joueurs (pseudo + mot de passe, session par jeton).
Le raisonnement derrière chaque choix est documenté dans `CLAUDE.md` ; ici,
uniquement les étapes à suivre.

## Vue d'ensemble

Chaque joueur a un **compte** (pseudo + mot de passe) qui porte sa progression
permanente (noyaux, arbres, jalons). Les comptes vivent **en mémoire** sur le
serveur de jeu, et **Supabase en est la seule persistance** : une table
`comptes`, **une ligne par compte**, portant l'authentification (colonnes) et
la progression (jsonb). Chaque sauvegarde (fin de manche, achat, départ d'un
joueur) upserte les seules lignes concernées, en arrière-plan et par lots ; au
démarrage, le serveur recharge tout depuis Supabase **avant** d'accepter la
première connexion. **Les comptes survivent donc aux redéploiements** — y
compris la session en cours : le jeton étant en table, personne n'a à se
reconnecter après un push.

- Sans configuration Supabase, le jeu reste jouable en LAN sans internet, mais
  la progression **ne survit pas à un redémarrage** du serveur. Le journal le
  dit en toutes lettres au boot.
- Un échec réseau ne bloque jamais une partie : la lecture se réessaie toutes
  les 15 s, un envoi raté se réessaie tout seul après 10 s, et tant qu'aucune
  lecture n'a réussi le serveur **suspend ses écritures** pour ne jamais
  écraser la seule copie existante.

Aucune dépendance npm : les appels passent par le module natif `node:https`.

## Mise en place

### 1. Créer le projet Supabase (une fois, ~10 minutes)

1. Compte sur [supabase.com](https://supabase.com) (la connexion GitHub suffit).
2. **New project** — nom libre, région proche de l'hébergeur (ex. `eu-west`).
3. Dans **SQL Editor**, exécuter :

```sql
create table comptes (
  pseudo      text primary key,          -- en minuscules : la cle d'unicite
  affichage   text not null,             -- la casse choisie par le joueur
  pass_salt   text not null,
  pass_hash   text not null,             -- scrypt, jamais le mot de passe
  jeton_hash  text,                      -- session en cours (null = deconnecte)
  jeton_exp   timestamptz,
  version     int  not null,             -- version du format de `data`
  data        jsonb not null,            -- la progression du compte
  cree_le     timestamptz not null default now(),
  vu_le       timestamptz not null default now()
);

-- RLS active mais AUCUNE policy : seule la cle service_role passe.
-- Le navigateur ne doit jamais lire cette table.
alter table comptes enable row level security;
```

Si le projet date d'avant le passage aux comptes (table `progress` avec sa
ligne unique `serveur`) : la bascule a été **sèche**, décision actée — aucune
migration, chacun recrée son compte. Supprimer l'ancienne table :
`drop table if exists progress;`

4. Dans **Settings → API**, noter deux valeurs :
   - le **Project URL** (forme `https://xxxx.supabase.co`) ;
   - la clé **`service_role`** — attention, pas la clé `anon`. La `service_role`
     contourne la sécurité par lignes, c'est voulu : seul le serveur de jeu
     l'utilise, jamais un navigateur.

### 2. Configurer le serveur de jeu

Deux variables d'environnement, et rien d'autre — pas de fichier de
configuration :

- `SUPABASE_URL` — le Project URL ;
- `SUPABASE_SERVICE_KEY` — la clé `service_role`.

Sur le VPS, selon le mode de lancement :

- **conteneur avec redéploiement automatique** (Coolify, CapRover, Dokploy,
  compose…) — les poser **une fois** dans le panneau du service (« Environment
  Variables », « App Configs »… selon la plateforme) : elles survivent aux
  redéploiements. En `docker-compose.yml`, bloc `environment:` du service.

- **systemd** — dans l'unité (`/etc/systemd/system/survivor.service`), section
  `[Service]` :

  ```ini
  Environment=SUPABASE_URL=https://xxxx.supabase.co
  Environment=SUPABASE_SERVICE_KEY=eyJ...
  ```

  Puis `systemctl daemon-reload` et `systemctl restart survivor`. Variante qui
  garde la clé hors de l'unité : `EnvironmentFile=/etc/survivor.env` (fichier
  `CLE=valeur`, en `chmod 600`).

- **pm2** — dans l'`ecosystem.config.js`, bloc `env: { SUPABASE_URL: "…",
  SUPABASE_SERVICE_KEY: "…" }`, puis `pm2 restart survivor --update-env`.

- **lancement direct** (shell, `screen`, `tmux`) :

  ```bash
  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node server.js
  ```

Sous Windows (PowerShell), pour tester en local :

```bash
$env:SUPABASE_URL = "https://xxxx.supabase.co"; $env:SUPABASE_SERVICE_KEY = "eyJ..."; node server.js
```

Sur un PaaS (Railway, Fly.io, Render…), elles se posent dans l'interface du
service (« Variables », « Secrets »).

Une configuration incomplète (une seule des deux variables) est journalisée et
désactive la persistance — elle n'est jamais confondue avec le mode « sans
persistance » assumé.

### 3. Redémarrer et vérifier

1. Redémarrer le serveur (comme après toute mise à jour du code).
2. Le journal doit afficher `comptes Supabase : table vide, première
   utilisation` (premier lancement) ou `comptes Supabase chargés — N
   adopté(s)`.
3. Créer un compte depuis le jeu, puis jouer une manche ou faire un achat.
4. Dans le dashboard Supabase, **Table Editor → comptes** : une ligne par
   compte créé, `vu_le` à l'heure de la dernière connexion.

## Réinstallation ou changement d'hébergeur

Rien à restaurer à la main : poser les deux variables d'environnement sur la
nouvelle machine et lancer le serveur. Il recharge tout depuis Supabase avant
d'accepter la première connexion.

## Hébergement du serveur de jeu

Le serveur est un **processus Node persistant** : boucle de simulation à 60 Hz
et WebSocket maintenus ouverts pendant toute une manche. Il lui faut un
hébergeur qui fait tourner un processus en continu (VPS, Railway, Fly.io,
Render, machine du salon…). Les plateformes *serverless* (fonctions à la
demande, dont Vercel) ne conviennent **pas** pour ce processus : elles coupent
entre deux requêtes et ne portent pas de serveur WebSocket. Vercel peut en
revanche servir une page d'accueil ou de la documentation, séparément du jeu.

Avec un **redéploiement automatique à chaque push**, deux choses à savoir :

- à l'arrêt (SIGTERM), le serveur pousse une dernière sauvegarde vers Supabase
  avant de mourir — la progression déjà acquise ne se perd pas ;
- un push pendant qu'une table joue **coupe la manche en cours** (les gains de
  cette manche sont versés en fin de manche, donc perdus). Pousser de
  préférence quand personne ne joue.

## Page d'administration

`https://<serveur>/admin` — les fonctions d'opérateur : vérifier que l'accès
Supabase fonctionne **depuis la machine qui héberge** (sonde en direct avec
latence), voir les salles et la liste des comptes, réinitialiser le mot de
passe d'un compte, supprimer un compte, ou tout supprimer.

**Armement.** La page n'existe que si la variable d'environnement `ADMIN_KEY`
est posée (même panneau que les variables Supabase). Sans elle, tout `/admin`
répond 404. Choisir une clé longue et aléatoire (par exemple `openssl rand -hex
24`) : quiconque la possède peut effacer toute la progression. La clé se saisit
sur la page et voyage dans un en-tête HTTP, jamais dans l'adresse — elle ne
finit donc pas dans les journaux du reverse proxy.

**« Réinit. mdp »** est le seul rattrapage d'un mot de passe perdu (il n'y a
pas d'email) : un mot de passe temporaire est généré et affiché **une seule
fois** à l'opérateur, qui le transmet au joueur ; la session en cours du compte
est invalidée. Le joueur se connecte avec le temporaire et en choisit un neuf
depuis le hub (« mot de passe… »).

**La suppression fait les deux moitiés du travail** : la ou les lignes Supabase
**et** la mémoire du serveur, avec déconnexion immédiate des joueurs concernés
— un mot de passe ne se recrée pas d'office, chacun repasse par l'écran de
création. Contrairement à une suppression à la main dans le dashboard, **aucun
redémarrage n'est nécessaire** — et il n'y a pas de piège de re-poussée. La
suppression totale est refusée dès qu'une salle est en manche.

Ce que montre l'état : configuration présente ou non, sonde en direct (latence
mesurée et nombre de lignes), lecture au boot réussie (écritures ouvertes) ou
suspendue, comptes en mémoire, salles et connectés, dernier échange réussi et
dernier échec.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `envoi impossible (HTTP 401 …)` dans les logs | mauvaise clé (vérifier que c'est bien la `service_role`) |
| `envoi impossible (getaddrinfo …)` | URL fausse ou pas d'accès internet sortant |
| `envoi impossible (delai depasse)` | projet Supabase en pause (tier gratuit : suspension après 7 jours sans requête — jouer une manche par semaine suffit à l'éviter) |
| `lecture impossible (…) — nouvel essai dans 15 s` | Supabase injoignable au boot ; le jeu tourne, la sauvegarde reprend dès que la lecture aboutit |
| `N gelé(s) (version inconnue)` au chargement | des lignes de `comptes` viennent d'une version plus récente du serveur — mettre le serveur à jour ; ces comptes ne sont ni utilisables ni écrasés d'ici là |
| `configuration Supabase incomplète` | il manque `SUPABASE_URL` ou `SUPABASE_SERVICE_KEY` |
| `aucune configuration Supabase (…)` au boot | les variables ne sont pas posées : le serveur tourne sans persistance, c'est le comportement normal sans configuration |

Aucun de ces cas ne bloque le jeu : la partie en cours continue, les envois
reprennent au prochain succès.

**Après le passage aux comptes (version de progression 2 → 3)** : la table a
changé de forme (`progress` → `comptes`, une ligne par compte) et la bascule a
été **sèche** — pas de migration, les anciennes clés `XXXX-XXXX` ne sont plus
acceptées, chacun recrée un compte. Supprimer l'ancienne table `progress` dans
le SQL Editor. Une ligne de `comptes` portant une version **future** (serveur
en retard sur la donnée) est **gelée** : ni adoptée, ni jamais réécrite, et son
pseudo reste indisponible jusqu'à mise à jour du serveur.

**Passage 3 → 4 (les vagues remplacées par les segments).** Celle-là est une
vraie **migration, faite par ligne au chargement** : la progression s'indexe
désormais sur le niveau d'équipe, donc les identifiants de jalon changent d'unité
(`vague8` → `niveau10`, `vague5/10/15/20` → `niveau6/12/18/24`). Ils sont
**renommés à rang égal** — un compte qui avait déjà le jalon garde ses cartes, et
un compte qui avait déjà touché le bonus ne le retouche pas. La ligne migrée est
aussitôt marquée sale et repart en version 4 ; rien à faire dans le SQL Editor.

`best.wave` est **conservé tel quel, sous son ancien nom, et n'est plus jamais
écrit** : c'est le record du modèle par vagues, il n'est pas convertible en
niveau — les deux ne mesurent pas la même chose. `best.level` et `best.segment`
démarrent à zéro. **Prendre un instantané de la table avant de déployer**, comme
pour toute migration.
**Économie refaite (version 3 → 4, lot H)** : rien à faire côté Supabase. Au
chargement, une ligne en version antérieure repart sur un **profil neuf** —
arbres, noyaux et jalons remis à zéro — mais le **compte est conservé** :
pseudo, mot de passe et session vivent dans les colonnes de la ligne, pas
dans le profil, et traversent intacts. Chaque remise à neuf est journalisée
au boot. Décision assumée : le jeu est en développement, pas de
remboursement.

## Comptes joueurs (pseudo + mot de passe)

Le système habituel : une page de **création** (pseudo, mot de passe et sa
confirmation), une page de **connexion**, et une **reprise en un clic** sur le
même navigateur.

**Créer un compte.** Onglet « Créer un compte » : pseudo (3 à 14 caractères),
mot de passe (8 minimum, 72 maximum — aucune règle de complexité imposée).
**Pas de récupération par email** : noter son mot de passe quelque part. Le
serveur n'en garde qu'une empreinte (scrypt), il ne pourra jamais le réafficher.

**Même navigateur, plus tard.** Le pseudo est prérempli : cliquer
« Se connecter » en laissant le mot de passe **vide** reprend la session — un
**jeton** mémorisé localement (jamais le mot de passe), valable 30 jours
glissants, chaque retour repousse l'échéance. Il survit aux redéploiements du
serveur. Pour changer de compte, taper un autre pseudo et son mot de passe.

**Autre navigateur ou autre machine.** Onglet « Se connecter », pseudo et mot
de passe. Chaque connexion émet un jeton neuf : **le dernier login gagne**,
l'appareil précédent devra retaper le mot de passe.

**Changer de mot de passe.** Depuis le hub (« mot de passe… »), en connaissant
l'ancien. La session en cours survit au changement.

**Mot de passe perdu.** Pas d'email, donc pas de réinitialisation autonome :
c'est l'opérateur du serveur qui génère un mot de passe temporaire depuis la
page admin (voir plus haut). Sur un serveur sans opérateur joignable, un mot
de passe perdu abandonne le compte — comme l'ancienne clé.

**Pseudo déjà pris ?** L'inscription le dit franchement — choisir un autre
pseudo, ou se connecter avec si c'est le sien.

Limites voulues : cinq tentatives par connexion avant reconnexion forcée, un
**gel de dix secondes** du pseudo visé après cinq échecs (même en rouvrant des
connexions), et le second onglet ouvert sur un même compte (déjà connecté
ailleurs) reçoit une session temporaire, non sauvegardée — les noyaux ne se
comptent jamais en double.
