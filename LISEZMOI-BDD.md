# Sauvegarde Supabase et comptes joueurs

Ce guide couvre la mise en place de la réplique Supabase de la progression et
le fonctionnement des comptes à pseudo réservé. Le raisonnement derrière chaque
choix est documenté dans `CLAUDE.md` (section lot D) ; ici, uniquement les
étapes à suivre.

## Vue d'ensemble

La progression permanente (noyaux, arbres, jalons) vit dans `data/progress.json`
sur la machine qui héberge le serveur. Ce fichier reste la **source de vérité**.
Supabase n'est qu'une **copie de secours hors machine**, mise à jour
automatiquement, qui permet de survivre à une réinstallation du VPS ou à un
disque mort.

- Sans configuration Supabase, rien ne change : le jeu fonctionne 100 % en
  local, jouable en LAN sans internet.
- Avec la configuration, chaque sauvegarde (fin de manche, achat au salon)
  pousse une copie vers Supabase en arrière-plan. Un échec réseau se journalise
  et n'affecte jamais la partie.
- Au démarrage, si `data/progress.json` est absent ou corrompu, le serveur
  récupère la copie Supabase et la réécrit sur disque.

Aucune dépendance npm : les appels passent par le module natif `node:https`.

## Mise en place

### 1. Créer le projet Supabase (une fois, ~10 minutes)

1. Compte sur [supabase.com](https://supabase.com) (la connexion GitHub suffit).
2. **New project** — nom libre, région proche du VPS (ex. `eu-west`).
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

Créer le fichier `data/supabase.json` à côté de `data/progress.json` :

```json
{
  "url": "https://xxxx.supabase.co",
  "key": "eyJ...la_cle_service_role..."
}
```

Recommandé, pour qu'il ne soit lisible que par le compte qui lance le serveur :

```bash
chmod 600 data/supabase.json
```

Le dossier `data/` est dans le `.gitignore` : la clé ne peut pas partir dans le
dépôt, même par accident.

Alternative : les variables d'environnement `SUPABASE_URL` et
`SUPABASE_SERVICE_KEY`, qui **priment** sur le fichier si elles sont posées
(pratique pour tester un second projet sans toucher à la configuration).

### 3. Redémarrer et vérifier

1. Redémarrer le serveur (comme après toute mise à jour du code).
2. Jouer une manche jusqu'au bout, ou faire un achat au salon.
3. Dans le dashboard Supabase, **Table Editor → progress** : une ligne
   `serveur` doit exister, avec `updated_at` à l'heure de la sauvegarde.

Toute la progression tient dans cette ligne unique : c'est le miroir exact du
fichier local, versionnage compris.

## Récupération après perte du VPS

1. Réinstaller le jeu (`git clone`, etc.).
2. Recréer `data/supabase.json` (étape 2 ci-dessus).
3. Lancer le serveur : il constate l'absence de `data/progress.json`, récupère
   la copie Supabase et la réécrit sur disque. Le journal affiche
   `réplique Supabase : N profil(s) récupéré(s)`.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `envoi impossible (HTTP 401 …)` dans les logs | mauvaise clé (vérifier que c'est bien la `service_role`) |
| `envoi impossible (getaddrinfo …)` | URL fausse ou pas d'accès internet sortant |
| `envoi impossible (delai depasse)` | projet Supabase en pause (tier gratuit : suspension après 7 jours sans requête — jouer une manche par semaine suffit à l'éviter) |
| `data/supabase.json présent mais incomplet` | il manque `url` ou `key` dans le fichier |
| rien dans les logs, rien dans Supabase | configuration absente : le serveur tourne en mode local pur, c'est le comportement normal sans fichier |

Aucun de ces cas ne bloque le jeu : le fichier local continue de fonctionner,
la réplique reprend au prochain succès.

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
