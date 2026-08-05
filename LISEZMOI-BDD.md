# Sauvegarde Supabase et comptes joueurs

Ce guide couvre la mise en place de la persistance Supabase de la progression
et le fonctionnement des comptes à pseudo réservé. Le raisonnement derrière
chaque choix est documenté dans `CLAUDE.md` (section lot D) ; ici, uniquement
les étapes à suivre.

## Vue d'ensemble

La progression permanente (noyaux, arbres, jalons) vit **en mémoire** sur le
serveur de jeu, et **Supabase en est la seule persistance** — il n'y a plus
aucun fichier local (`data/progress.json` a disparu). Chaque sauvegarde (fin de
manche, achat au salon, départ d'un joueur) pousse l'état vers Supabase en
arrière-plan ; au démarrage, le serveur recharge tout depuis Supabase **avant**
d'accepter la première connexion.

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
create table progress (
  account_id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS active mais AUCUNE policy : seule la cle service_role passe.
-- Le navigateur ne doit jamais lire cette table.
alter table progress enable row level security;
```

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
2. Le journal doit afficher `progression Supabase : table vide, première
   utilisation` (premier lancement) ou `progression Supabase chargée — N
   profil(s)`.
3. Jouer une manche jusqu'au bout, ou faire un achat au salon.
4. Dans le dashboard Supabase, **Table Editor → progress** : une ligne
   `serveur` doit exister, avec `updated_at` à l'heure de la sauvegarde.

Toute la progression tient dans cette ligne unique, versionnage compris.

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

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `envoi impossible (HTTP 401 …)` dans les logs | mauvaise clé (vérifier que c'est bien la `service_role`) |
| `envoi impossible (getaddrinfo …)` | URL fausse ou pas d'accès internet sortant |
| `envoi impossible (delai depasse)` | projet Supabase en pause (tier gratuit : suspension après 7 jours sans requête — jouer une manche par semaine suffit à l'éviter) |
| `lecture impossible (…) — nouvel essai dans 15 s` | Supabase injoignable au boot ; le jeu tourne, la sauvegarde reprend dès que la lecture aboutit |
| `sauvegarde suspendue pour ne pas l'écraser` | la ligne Supabase vient d'une version plus récente du serveur — mettre le serveur à jour |
| `configuration Supabase incomplète` | il manque `SUPABASE_URL` ou `SUPABASE_SERVICE_KEY` |
| `aucune configuration Supabase (…)` au boot | les variables ne sont pas posées : le serveur tourne sans persistance, c'est le comportement normal sans configuration |

Aucun de ces cas ne bloque le jeu : la partie en cours continue, les envois
reprennent au prochain succès.

## Comptes joueurs (pseudo réservé)

Par défaut, la progression d'un joueur est liée au navigateur (un identifiant
dans le `localStorage`). Changer de machine ou de navigateur repart de zéro —
sauf si le joueur réserve un pseudo.

**Réserver.** Au salon, bloc « Compte » : entrer un pseudo et cliquer
« Réserver ». Le serveur attribue un tag à quatre chiffres — l'identité
complète est `Pseudo#1234`, façon Discord, donc deux personnes peuvent porter
le même pseudo — et affiche un **code secret** (`XXXX-XXXX`), une seule fois.
Le noter avec le pseudo complet : le serveur n'en garde qu'une empreinte
chiffrée, il ne pourra jamais le réafficher.

**Récupérer.** Sur un autre navigateur : entrer le pseudo (`Kevin` ou
`Kevin#4821`) et le code, cliquer « Récupérer ». La progression suit. Le code
se tape indifféremment en majuscules ou minuscules, avec ou sans tiret.

**Code perdu.** Re-réserver le même pseudo depuis un navigateur encore
connecté au compte : un nouveau code est généré, l'ancien meurt, le tag ne
change pas.

Limites voulues : cinq essais de récupération par connexion, récupération
refusée si le compte est déjà connecté ailleurs, et le second onglet ouvert
sur un même compte reçoit un compte temporaire (les noyaux ne se comptent
jamais en double).
