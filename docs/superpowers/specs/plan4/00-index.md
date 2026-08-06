# Plan 4 — index

Sept lots, issus de la validation en équipe du récapitulatif. Deux
vérifications faites sur le code actuel changent la donne par rapport au
brainstorm initial :

- **Aucune caméra n'existe.** Le rendu est câblé sur l'arène entière (1600×900)
  tenant dans un seul écran. La grande arène (lot I) demande donc un système de
  caméra complet, pas un simple agrandissement de `CFG.ARENA_W/H`.
- **Aucun mécanisme de bannissement n'existe.** Le lot J part de zéro.

Deux bascules du dépôt, postérieures à la rédaction initiale, sont désormais
intégrées dans les lots concernés :

- **La persistance est passée de `data/progress.json` à Supabase** (une ligne
  par compte, voir `LISEZMOI-BDD.md`). Toute mention de champ persistant se
  lit « colonne ou champ du JSON de la ligne compte », toute migration se
  fait par ligne avec un instantané de table en garde-fou.
- **Le serveur est multi-salons** (`hub.js` / `room.js`) : chaque salle a son
  `GameState`. Tout état de manche (éclats, offre du marchand, séquence de
  vagues spéciales, limite de légendaire) est PAR SALLE ; seuls le compte et
  le classement sont globaux.

## Ordre recommandé

| # | lot | dépend de | pourquoi cette place |
|---|---|---|---|
| H | [Économie du Terminal](01-economie-terminal.md) | — | déjà cadré, aucune dépendance |
| I | [Grande arène et caméra](02-grande-arene.md) | — | le plus gros morceau technique, à isoler tôt |
| J | [Bannissement de cartes](03-ban-cartes.md) | — | indépendant |
| K | [Marchand et reliques](04-marchand-reliques.md) | I | payé par la monnaie de manche du lot I |
| L | [Vagues spéciales](05-vagues-speciales.md) | I | se déroulent sur la carte principale |
| M | [Nouveaux ennemis](06-nouveaux-ennemis.md) | — | indépendant, peut avancer en parallèle |
| N | [Boss final](07-boss-final.md) | tous les précédents (contenu) | doit voir passer tout le reste avant d'être calibré |

**N doit être fait en dernier.** Il réutilise des patterns des cinq boss
existants et doit être calibré une fois la difficulté des vagues (I), les
reliques (K) et les nouveaux ennemis (M) stabilisés — sinon il faudrait le
recalibrer à chaque lot suivant.

## Décisions actées par l'équipe

- **Le modèle de vague actuel (budget puis nettoyage) est conservé**, y compris
  sur la grande arène. Pas de passage à un modèle par durée.
- **Aucun danger de bordure de carte** dans cette itération.
- **Aucune incitation à rester groupé** au-delà de ce qui existe déjà : le
  rayon d'action limité du soigneur et du tank est assumé comme un coût
  d'exploration, pas un défaut à corriger.
- **Classement basé sur le temps** pour atteindre et vaincre le boss final —
  nouvelle conséquence directe du lot N, à prévoir dans la persistance.
- **Vagues spéciales sur la carte principale**, pas d'arène dédiée.
- **Réussir une vague spéciale rend 100 % des PV et du bouclier.**
- **Le ban interdit toute autre sélection dans le même palier de rareté** pour
  cette phase de cartes — sauf s'il existe un palier supérieur accessible dans
  la même phase, auquel cas il reste choisissable.
- **Trois nouveaux types d'ennemis**, pas plus, pour cette itération.

## Décisions du porteur du projet (2026-08-06)

- **Lot H** : jeu en développement, impact joueurs accepté — pas de
  remboursement ni d'instantané : **reset de progression, comptes
  conservés** (profil neuf v4 pour toute version antérieure, auth et session
  intactes ; section F3 mise à jour). Rien à faire côté Supabase au
  déploiement.
- **Lot J** : le but du ban est qu'une carte précise ne revienne plus.
  **Bannir une carte bannit aussi les cartes qui dépendent d'elle** — rien de
  plus (section J1 mise à jour).
- **Lot L** : quatre vagues spéciales (le titre disait trois, c'était la
  table qui était juste) ; la réussite **relève aussi les joueurs à terre**.
- **Lot L×N** : calendrier déterministe calé sur la cadence des boss —
  vagues spéciales sur `vague % 5 === 3`, jamais de collision avec un boss
  (calcul en L3). L'équilibrage fin viendra plus tard.
- **Lot I** : approche caméra **par transform aux points de passage
  existants** (contextes 2D + projection WebGL), pas de conversion
  `worldToScreen` dans chaque fonction de dessin (section I2 réécrite).
- **Lot K** : les dix reliques proposées servent de liste de départ ;
  ajouts et équilibrage plus tard.

## Décisions du porteur du projet (2026-08-06, seconde passe)

Prises au lancement des trois lots restants (K, L, N — H, I, J et M sont faits).

- **Ordre d'exécution** : L, puis K, puis N, avec une validation entre chaque.
  L ne crée aucun écran et se mesure seul ; K a besoin des éclats (I, fait) ;
  N a besoin des deux, et la spec dit elle-même qu'il se calibre en dernier.
- **Lot K, section K2** (question laissée ouverte par la spec) : **oui, une
  relance de l'offre contre des éclats**, à coût **croissant avec la vague** —
  la proposition par défaut. Une relance à coût fixe se banalise en fin de
  manche, quand les éclats abondent, et le marchand n'offre plus de choix.
- **Lot N, section N4** : les **deux** mécaniques exclusives proposées sont
  retenues telles quelles — phase de synthèse (exaflares du Métronome
  traversant une zone de regroupement de l'Oracle) et sceau final (les joueurs
  vivants occupent simultanément des zones distinctes aux quatre coins,
  nombre adapté à l'effectif par `adaptMech`).
- **Lot N, section N8** : le classement au temps se consulte depuis le **hub
  des salles**, pas depuis le Terminal ni le salon. Le classement compare des
  comptes toutes salles confondues : sa place est là où l'on est justement
  hors salle, et il est ainsi visible dès la connexion.

## Corrections de spec relevées à l'exécution

- **`mémoire_gravee` (lot K, K4) est renommée `memoire_gravee`.** Les
  identifiants du dépôt sont en français **sans accents** ; seules les chaînes
  affichées au joueur en portent. L'identifiant circule dans le protocole
  d'achat, et un accent y aurait été le premier du dépôt.

## Ce qui reste à valider par le porteur du projet

- **La taille exacte de la grande arène** (lot I) et le rythme des points de
  récolte.

## Invariants du dépôt

Inchangés, à relire avant chaque lot (`CLAUDE.md`) :

- `shared/game_state.js` ne référence jamais le DOM, le canvas, le clavier, le
  réseau ni le système de fichiers.
- Snapshots en append-only, lecture client avec repli.
- Tableaux exportés ordonnés, index circulant sur le réseau.
- Tout ce qui blesse passe par `_hurt()` / `_damage()`.
- Les systèmes lisent `p.mods`, jamais la liste de cartes.
- Le serveur valide tout choix client.
- Commentaires et identifiants en français sans accents, chaînes affichées avec
  accents.
- Mesurer, ne pas extrapoler.
- Toute mesure de progression précise son profil de compte (neuf / maximal).
