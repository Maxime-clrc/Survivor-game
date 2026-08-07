# Plan 4 — index

> **PARTIELLEMENT ANNULÉ PAR [`plan5`](../plan5/00-index.md).** La décision
> *« le modèle de vague actuel (budget puis nettoyage) est conservé »* (section
> « Décisions actées ») est **renversée** : `plan5` remplace les vagues par une
> chronologie scriptée de six segments. Sont également touchés le calendrier
> `vague % 5 === 3` du lot L (le calendrier devient explicite) et le classement au
> temps du lot N (sous horloge de horde fixe, le temps pour *atteindre* le boss
> final est constant).
>
> Ce qui reste valide et est **repris** par `plan5` : lot M (nouveaux ennemis) au
> lot S, lot L (vagues spéciales) au lot U, lot N (boss final) au lot W. Les lots
> H, I, J et K ne sont pas traités par `plan5`.

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

- **Lot H** : la migration se fait côté Supabase, par ligne de compte, avec
  instantané de table préalable (section F3 mise à jour).
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
