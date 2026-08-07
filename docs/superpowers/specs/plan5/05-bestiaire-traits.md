# Lot S — Bestiaire et traits

Dépend du lot P seulement. **Indépendant de Q et R, peut avancer en parallèle.**

C'est le lot qui rend les difficultés jouables différemment (D4), et il reprend
intégralement `plan4` lot M (nouveaux ennemis).

---

## S1. Le principe : des modules, pas des variantes

Le brief demande que *« un ennemi qui se contente de courir vers les joueurs en mode Calme
puisse effectuer un dash en Normal, puis laisser une traînée de feu ou lancer des
projectiles en Cauchemar »*.

Trois bestiaires distincts commettraient l'erreur que le dépôt a déjà refusée
explicitement : *« un seuil par mécanique plutôt qu'une variante de combat par effectif —
cinq variantes de cinq boss seraient impossibles à maintenir, et c'est le genre de
duplication qui dérive au premier réglage »*.

Un **trait** est un module de comportement attaché à un couple `(type, difficulté)`. Le
grunt **court** en calme, **charge** en normal (`DASH`), **laisse une traînée** en cauchemar
(`DASH` + `TRAIL`). Un seul type, une seule table de statistiques.

### Trois propriétés qui rendent ce choix tenable

1. **Zéro octet de réseau.** La difficulté est déjà connue du client (elle voyage dans le
   salon), le type est déjà dans le snapshot. Le client **déduit** l'ensemble des traits de
   `(diffIndex, type)`. Même règle que les trois informations déjà déduites — cadence des
   tireurs, direction des projectiles, déplacement d'un joueur.
2. **Un trait nouveau profite aux trois modes.** On écrit un comportement, on l'attache où
   on veut.
3. **Une seule table de statistiques à équilibrer.** Les PV, la vitesse et les dégâts
   restent ceux du type.

---

## S2. La table des traits

```js
export const TRAIT_DASH = 0;
export const TRAIT_TRAIL = 1;
export const TRAIT_VOLLEY = 2;
export const TRAIT_FRENZY = 3;
export const TRAIT_SPORE = 4;
export const TRAIT_AURA = 5;
```

| trait | effet | valeurs de départ |
|---|---|---|
| `DASH` | anticipation puis ruée | préavis 0,5 s, ×2,5 de vitesse pendant 0,35 s, recharge 6 s |
| `TRAIL` | laisse une zone persistante derrière lui | `_zone` avec `life` 4 s, `dot` 14, `r` 26 ; **plafond global** |
| `VOLLEY` | le tireur envoie un éventail de 3 au lieu d'un projectile | demi-ouverture 0,22 rad |
| `FRENZY` | accélère à mesure que ses PV descendent | jusqu'à ×1,6 à 10 % de PV |
| `SPORE` | petite zone rémanente à la mort | `life` 3 s, `dot` 10, `r` 22 |
| `AURA` | réduit les dégâts subis par les ennemis proches | −35 % dans 90 px |

`TRAITS` est un **tableau ordonné**, mais son index **ne circule pas** : c'est un registre
purement client au même titre que le son, le glyphe et l'image de sprite.

### Le plafond de `TRAIL` n'est pas indicatif

Même piège que les flaques de la Matriarche, où le dépôt l'a déjà rencontré : *« sans lui,
une fin de combat à 200 ennemis pavait le sol, le snapshot enflait et la mécanique devenait
illisible avant d'être difficile »*. `PUDDLE_MAX: 25` est le précédent, et 200 ennemis à
traînée sont un cas bien plus dense qu'un combat de boss.

`TRAIL_MAX` global, et la zone la plus ancienne cède sa place. Les traînées comptent dans
le plafond de surface du lot V (12 % de l'arène).

---

## S3. Ce qu'il faut payer quand même : l'anticipation doit se voir

Un `DASH` sans préavis visible est une téléportation. Or l'anticipation **ne se déduit
pas** : une position ne dit pas qu'un mouvement se prépare — c'est exactement la limite déjà
notée pour la cadence des tireurs, où *« avant le premier tir, le tireur reste au repos : un
télégraphe qui devine serait pire que pas de télégraphe »*.

D'où une clé **nommée** dans le snapshot :

```
wu: [id, id, ...]        // ennemis en anticipation a cet instant
```

Elle est **courte par construction** — quelques ennemis sur 200, la recharge est de 6 s et
le préavis de 0,5 s — et **absente** la plupart du temps, exactement comme `bn` et `wl` le
sont *« quatre-vingt-dix pour cent d'une manche »*.

Pas de champ par ennemi : ce serait un huitième élément payé sur les 200, vingt fois par
seconde, pour une information qui concerne trois entités. Le raisonnement est celui du rang
d'élite encodé dans le champ de type.

Côté client, l'anticipation est un **écrasement par `scale`**, pas une image d'atlas :
*« ne pas stocker en image ce qu'une transformation peut faire »*. Le vocabulaire existe
déjà — *« le brood gonfle avant d'éclater, le tireur recule son canon, le tank rentre ses
plaques »*.

---

## S4. Nouveau module : `shared/enemies.js`

Module **pur**, aucune dépendance, sur le modèle de `statuses.js`.

Contenu : `ENEMY_TYPES` **extrait de `game_state.js`**, `TRAITS`, la table d'attachement
`(difficulté, type) → traits`, et `adaptType()`.

### Pourquoi extraire `ENEMY_TYPES`

Ce n'est pas un refactor gratuit :

- `game_state.js` fait **5 929 lignes** ;
- le bestiaire passe de 5 à 9 types dans ce lot, avec des comportements propres ;
- `statuses.js`, `cards.js`, `classes.js` et `bosses.js` sont **déjà sortis pour cette
  raison exacte** — le bestiaire est la dernière table de contenu restée dans le fichier de
  simulation.

Les constantes de comportement des traits vivent **ici**, à côté de leur table, jamais dans
`CFG` — même règle que `CARD_CFG`, `SKILL_CFG`, `STATUS_CFG` et `BOSS_CFG`.

**`game_state.js` importe ce module, jamais l'inverse** : un cycle d'import casserait le
chargement dans le navigateur.

---

## S5. `adaptType` — la seule boucle de rétroaction du design

Le script nomme la composition de chaque beat (« minute 12 : 40 % grunts, 25 % tanks,
20 % tireurs, 15 % broods »). Mais D3 indexe l'accès aux types sur le niveau : une équipe
faible arrivée à la minute 12 au niveau 4 n'a pas les dégâts pour des tanks.

**`ENEMY_TYPES` porte `minLevel` et `fallback`, exactement comme `MECHS` porte `minPlayers`
et `fallback`.** Le point de passage unique existe déjà — `adaptMech` — et il suffit
d'écrire son jumeau.

| type | index | `minLevel` | `fallback` |
|---|---|---|---|
| grunt | 0 | 1 | — |
| runner | 1 | 2 | grunt |
| tank | 2 | 5 | grunt |
| shooter | 3 | 7 | runner |
| brood | 4 | 9 | runner |
| kamikaze | 5 | 11 | runner |
| bulwark | 6 | 13 | tank |
| medic | 7 | 15 | shooter |
| choeur | 8 | 17 | brood |

C'est **la seule boucle de rétroaction du design**, et elle est :

- **authored** — une table, pas une formule qui lit une performance ;
- **asymétrique** — elle n'aide jamais qu'une équipe en retard, elle ne punit jamais une
  équipe qui avance ;
- **lisible** — un seuil par type, pas une variante de script par niveau.

Comme `adaptMech`, **un seul niveau de repli** : un repli qui replie serait impossible à
lire dans la table, qui est justement ce qui rend le système tenable.

Effet secondaire précieux, le même que celui déjà noté pour les cartes verrouillées par
jalons : *« un nouveau joueur découvre un pool plus simple, c'est de l'onboarding sans écrire
une ligne de tutoriel »*.

---

## S6. Les quotas restent, et deviennent plus critiques

`share` (plafond de population par type) est le garde-fou déjà mesuré : *« sans lui, les
shooters — qui restent hors du corps à corps et meurent rarement — finissaient par occuper
117 des 180 places : les vagues ne contenaient plus que des tireurs et toute la variété
disparaissait »*.

En modèle continu il devient **plus** critique, puisque rien ne vide plus l'arène
périodiquement. À conserver, et à revérifier avec neuf types au lieu de cinq — la somme des
`share` peut dépasser 1 sans problème, mais aucun type ne doit pouvoir occuper seul la
moitié de l'arène.

---

## S7. Les trois types de `plan4` lot M, repris tels quels

Statistiques, signatures visuelles et **points de passage obligatoires** compris.

| type | ce qu'il force à décider |
|---|---|
| `kamikaze` | punit le corps-à-corps ; rend les cartes de dégâts de zone du joueur risquées à bout portant |
| `bulwark` | bouclier frontal ~100° : il faut gagner l'angle |
| `medic` | soigne le voisin blessé ; rompt son soin s'il est visé plus d'une seconde |

Les trois points de passage de `plan4/M5 bis` sont des invariants, pas des suggestions :

- **l'absorption du bouclier vit dans `_bulletHitEnemy()`** — la boucle de collision *et* le
  balayage d'apparition l'appellent, sinon une balle née à bout portant traverse le
  bouclier qu'une balle tirée à dix mètres respecte ;
- **l'explosion du kamikaze se branche au point unique de mort** — c'est ce qui garantit
  « quelle que soit la cause » (tir, zone, brûlure, contact) ;
- **le soin du medic est un chemin neuf, pas un `_damage()` négatif** — `_damage()` porte le
  vol de vie, les critiques et le compteur de touches, aucun n'a de sens sur un soin.

L'explosion du kamikaze ajoute une **provenance de dégâts en fin de `DAMAGE_SOURCES`**
(registre ordonné, l'index circule) et son glyphe dans `SRC_ICON`.

---

## S8. Le `choeur` — le seul type inédit de ce plan

Le brief demande des *« synergies inédites entre ennemis »*. Le `medic` pose une priorité
de cible sur un **individu** ; le `choeur` la pose sur un **groupe**.

```
key: "choeur"
minLevel: 17,  fallback: brood
weight: 0.20,  share: 0.08
hpMul: 1.6,  speed: 70,  dmg: 12,  r: 15
auraRadius: 130          // plus large que TRAIT_AURA du tank
auraReduction: 0.35      // degats subis par les ennemis dans le rayon
```

Il accorde `AURA` à **tous** les ennemis dans son rayon. Tuer le choeur d'abord débloque le
paquet ; l'ignorer rend une foule ordinaire près de deux fois plus longue à percer.

Trois contraintes de conception :

- **`share: 0.08`, le plus bas du bestiaire.** Comme le medic, *« c'est un multiplicateur de
  menace pour le reste de la horde, pas un ennemi qu'on veut voir en nombre »*. Deux choeurs
  qui se couvrent mutuellement sont un mur, et il faut que ce cas reste rare et
  intentionnel.
- **L'aura ne se cumule pas.** Deux choeurs sur la même cible appliquent la meilleure
  réduction, jamais le produit — même règle que le `effectiveCards` du Vœu partagé, qui prend
  le maximum et non la somme.
- **L'aura est visible sans être un télégraphe.** Un liseré sur les ennemis couverts, pas un
  disque au sol : un grand disque de plus dans l'arène entrerait en concurrence avec les
  zones de boss et le rempart, et le budget de lisibilité est déjà dépensé.

---

## S9. Répartition par difficulté (détail au lot T)

| type | calme | normal | cauchemar |
|---|---|---|---|
| grunt, runner, tank, shooter, brood | oui | oui | oui |
| `kamikaze` | — | oui | oui |
| `bulwark` | — | oui | oui |
| `medic` | — | — | oui |
| `choeur` | — | — | oui |

**Calme ne voit ni `medic`, ni `bulwark`, ni `choeur`** : ce sont les trois types qui
demandent de **choisir sa cible**, et c'est précisément la compétence que le mode calme n'a
pas à enseigner.

---

## S10. Fichiers touchés

| fichier | ce qui change |
|---|---|
| `shared/enemies.js` | **nouveau** — `ENEMY_TYPES` (9 entrées), `TRAITS`, table d'attachement, `adaptType()`, constantes de traits |
| `shared/game_state.js` | `ENEMY_TYPES` retiré et réexporté depuis le nouveau module (les appelants ne bougent pas) ; comportements de traits dans `_enemies` ; `_bulletHitEnemy` pour le bouclier ; explosion du kamikaze au point de mort ; soin du medic ; aura du choeur ; clé `wu` dans `snapshot()` |
| `shared/statuses.js` | rien — les traits ne sont pas des états : ils ne se purgent pas, ne se cumulent pas, et n'ont pas de durée |
| `public/sprites.js` | quatre silhouettes : `e5_*` à `e8_*` (membres, marche, étapes de mort) |
| `public/client.js` | anticipation de `DASH` par `scale` ; liseré d'aura ; lien de soin du medic ; plaque et éclat d'absorption du bulwark ; pulsation du kamikaze ; `DEATH_BURST` pour les quatre nouveaux types |
| `public/icons.js` | glyphe de la provenance « explosion » dans `SRC_ICON` |
| `shared/palette.js` | une teinte par nouveau type, avec ses six valeurs dérivées par `ramp()` |

### Contraintes de registre, non négociables

- **Les quatre nouveaux types s'ajoutent en FIN d'`ENEMY_TYPES`** (indices 5 à 8) : le
  tableau est ordonné et l'index circule. Compatible avec l'encodage d'élite (`+100`) qui
  suppose seulement des indices sous 100 — et le marquage de retardataire (`+200`) a disparu
  au lot P, ce qui laisse encore plus de marge.
- **Ne jamais écrire dans `ENEMY_TYPES`.** Le comportement de fuite du medic, comme le
  `standoff`, se copie sur l'ennemi (`e.standoff`), jamais sur son type.

---

## S11. Le test de la silhouette est un critère, pas une intention

`?planche` sort tous les sprites en noir uni sur fond blanc. Les quatre nouvelles
silhouettes doivent se regrouper par type **sans hésitation**, en **résolution native** —
le dépôt a déjà trouvé trois créatures percées d'un trou transparent invisible à 64 px par
case.

Le piège de `mirrored()` s'applique intégralement : un sous-tracé miroir change de sens de
parcours, et `fill()` applique la règle non nulle, donc un appendice miroir qui chevauche le
corps y perce un trou. `mirrored(g, s, pts)` est le point de passage unique et il **mesure
l'aire signée** — il ne devine pas quel côté est fautif.

La recette en sept couches s'applique sans exception : silhouette, ombrage décalé et écrêté,
lumière en arc haut-gauche, contre-jour, contour, accents, asymétrie du même côté à chaque
image. *« Si un type demande un traitement particulier, c'est le type qu'il faut revoir, pas
la recette. »*

---

## S12. Mesures

| mesure | attendu |
|---|---|
| survie d'un `medic` une fois repéré | doit chuter nettement une fois ciblé en priorité, sinon le lien de soin est trop généreux |
| taux de traversée du bouclier par tir de flanc | proche de **100 %**, sinon l'angle protégé est mal calé |
| dégâts subis au corps-à-corps imputables au `kamikaze` | mesurable via `DAMAGE_SOURCES` ; sert à calibrer le rayon |
| temps de percée d'un paquet avec `choeur` vivant vs mort | facteur **1,5 à 2** ; au-delà, baisser `auraReduction` |
| zones de `TRAIL` simultanées, cauchemar, arène pleine | **plafonnées**, jamais au-delà de `TRAIL_MAX` |
| part de l'arène couverte par les traînées | comptée dans les 12 % du lot V |
| poids d'instantané, clé `wu`, pire cas | **< 1 %** de hausse |
| CPU par tick, 200 ennemis avec traits, cauchemar, 4 joueurs | moyenne **< 1 ms**, p99 **< 8 ms** |
| respect des quotas `share` | aucun type au-dessus de son plafond, neuf types confondus |

---

## S13. Critères d'acceptation

- Un grunt en calme n'a **aucun** trait ; en normal il charge ; en cauchemar il charge et
  laisse une traînée.
- L'ensemble des traits d'un ennemi est **déductible côté client** de `(diffIndex, type)` :
  aucun champ de trait ne circule dans le snapshot.
- Tout `DASH` est précédé d'une anticipation **visible**, transmise par la clé `wu`, jamais
  par un champ sur chaque ennemi.
- `adaptType` substitue le repli quand le niveau est insuffisant, avec **un seul niveau de
  repli**.
- Le `medic` cesse de soigner dès qu'il subit des dégâts directs pendant plus d'une seconde.
- Le bouclier du `bulwark` ne protège jamais un angle supérieur à `shieldArc`, et
  l'absorption passe par `_bulletHitEnemy()` — vérifié à bout portant **et** à dix mètres.
- L'explosion du `kamikaze` se déclenche quelle que soit la source de sa mort, brûlure et
  zone comprises.
- Deux `choeur` qui se couvrent appliquent la **meilleure** réduction, jamais le produit.
- Les zones de `TRAIL` sont plafonnées ; le plafond est strict et non indicatif.
- Les quatre silhouettes passent la planche `?planche` en résolution native, sans trou
  transparent.
- `ENEMY_TYPES` n'est jamais muté en cours de manche.
