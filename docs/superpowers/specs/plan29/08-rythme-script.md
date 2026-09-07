# 08 · Rythme de manche — 25 battements sur 30 sont muets

## Le constat, chiffré

`shared/timeline.js` : 6 segments × 5 battements = **30 battements**.

### A — cinq événements dans tout le script

| segment | battement | événement |
|---|---|---|
| 2 | 3 | `EV_NUEE` |
| 3 | 2 | `EV_CROISE` |
| 4 | 3 | `EV_SIEGE` |
| 5 | 2 | `EV_CHASSE` |
| 6 | 3 | `EV_NUEE` (répété) |

**83 % des battements ne sont qu'un taux et une géométrie.** Quatre types
d'événement existent, un seul apparaît deux fois, aucun n'apparaît trois fois.

### B — la courbe de taux est une dent de scie répétée six fois

| segment | taux des 5 battements |
|---|---|
| 1 | 0,6 → 0,9 → 1,2 → 1,5 → 1,8 |
| 2 | 1,4 → 1,7 → 2,0 → 2,3 → 2,6 |
| 3 | 2,0 → 2,4 → **2,2** → 2,8 → 3,2 |
| 4 | 2,2 → 2,5 → 2,9 → 3,3 → 3,8 |
| 5 | 3,0 → 3,4 → **3,2** → 3,9 → 4,4 |
| 6 | 3,4 → 3,7 → 4,0 → 4,6 → 5,0 |

Montée monotone, remise à zéro au boss, **même forme six fois**. Seuls les
segments 3 et 5 ont un creux au 3ᵉ battement — les seules respirations du
script, et elles sont involontairement rares.

### C — le solo joue un script plus pauvre au moment culminant

`quatre-fronts` exige `minPlayers: 3` et retombe sur un `fallback`. En solo, la
géométrie la plus spectaculaire **n'apparaît jamais** — et le segment 6, le
final, en contient **deux sur cinq**. Un joueur solo voit donc son apogée
dégradée précisément là où la tension devrait culminer.

Aggravé en cauchemar : `GEOM_CAUCHEMAR` mappe `pince → quatre-fronts`, donc
plus la difficulté monte, plus le solo subit de replis.

## Cible

Des micro-sommets à l'intérieur du cadre déterministe, sans rendre le script
aléatoire (le déterminisme est requis par le classement).

## Ce que ça coûte réellement

**`SCRIPT` est une table de données**, pas de la logique. Les leviers existent
déjà et sont sous-exploités :

- 4 types d'événement, utilisés 5 fois sur 30 ;
- 5 géométries (`bords`, `front`, `pince`, `quatre-fronts`, `anneau`) — et
  `anneau` **n'apparaît nulle part dans `SCRIPT`** : une géométrie écrite et
  jamais tirée ;
- le taux, aujourd'hui monotone.

Aucun système à construire.

## Étapes

1. **Utiliser `anneau`.** Elle est définie dans `GEOMETRIES` et absente du
   script. Vérifier d'abord qu'elle est bien implémentée côté spawn (une
   géométrie déclarée non tirée est exactement le schéma de bug du chantier 06).
2. **Densifier les événements** : viser 10-12 battements sur 30 plutôt que 5, en
   variant les 4 types au lieu de répéter `EV_NUEE`.
3. **Casser la monotonie du taux** : introduire une respiration après chaque
   boss (le segment repart aujourd'hui en montée sèche) et un pic court avant
   le boss, plutôt qu'une rampe linéaire. Cohérent avec le chantier 03, qui
   propose une rampe de reprise post-boss.
4. **Résoudre le trou du solo** : donner à `quatre-fronts` un `fallback` qui ne
   soit pas une géométrie déjà vue au battement précédent, ou introduire une
   géométrie solo spécifique pour le segment 6. Le repli actuel est silencieux
   — le joueur solo ne sait pas qu'il voit une version dégradée.
5. **Nouveaux types d'événement** (rejoint votre point « objectifs
   secondaires ») : détruire un convoi, cristal instable, tenir une zone. Ce
   sont des entrées de `EVENTS`, avec le mécanisme d'annonce déjà en place
   (`EVENT_ANNOUNCE: 2.6`). `TL_CFG` contient déjà `QUARRY_HP_MUL`,
   `QUARRY_SIZE_MUL`, `QUARRY_SPEED_MUL`, `QUARRY_XP_WORTH` — un « gibier » à
   forte valeur d'XP existe donc déjà comme concept : **vérifier s'il est
   utilisé avant d'en écrire un nouveau.**

## Contrainte à respecter

Le script doit rester **déterministe** : le classement (chantier 07) compare
des manches, et un script aléatoire les rendrait incomparables. La variété
vient de la composition, pas du hasard.

## Validation

`verifierScript()` existe déjà dans `timeline.js` — le rejouer après
réécriture. Critères d'acceptation proposés :
- aucun type d'événement utilisé plus de deux fois ;
- aucune géométrie déclarée dans `GEOMETRIES` absente du script ;
- deux segments consécutifs n'ont pas la même forme de courbe de taux ;
- en solo, aucun segment ne perd plus d'un battement par repli de géométrie.

## Fichiers

- `shared/timeline.js` — `SCRIPT`, `EVENTS`, `verifierScript`
- `shared/game_state.js` — si de nouveaux types d'événement demandent une
  mécanique (objectifs de zone, cible à détruire)
- `docs/regles/SIMULATION.md`
