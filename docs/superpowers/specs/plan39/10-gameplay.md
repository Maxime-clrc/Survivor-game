# J — IMPACT GAMEPLAY

**Contrat du §14 : on est un survivor-like.** Pas de puzzle, pas de labyrinthe,
pas de porte fermée, pas de parcours imposé. Ce qui change est la **lecture de
l'espace**, jamais l'accès.

---

## J.0 — LA CONTRAINTE QUE PERSONNE NE VOIT : `biomeNu`

```js
get biomeNu()   { return !!this.boss || this.bossPending; }
get obstacles() { return this.biomeNu ? EMPTY_LIST : this._biomeObstacles; }
get hazards()   { return this.biomeNu ? EMPTY_LIST : this._biomeHazards; }
```

**Pendant un boss, l'arène est vidée de ses blocs ET de ses dangers**, côté
simulation *et* côté rendu (`obstaclesActifs()`). Un combat de boss se joue sur
un sol nu.

Conséquences, et elles sont structurantes :

1. **Aucune des six trames n'existe pendant un boss.** Là où les fiches parlent
   d'« arène de boss », il faut lire *l'espace qu'on traverse pour y arriver et
   celui qu'on retrouve après*, pas la géométrie du combat lui-même.
2. **Ce qui survit à un boss est exactement : le SOL, le SEMIS de props
   (`obstaclesDuLieu()`, liste gelée), les TRACES, l'AMER, la LUMIÈRE et le
   FOND.** Cinq canaux sur dix, et le premier est le plus grand de l'écran.
3. **Donc : aujourd'hui, tous les combats de boss du jeu se ressemblent, quels
   que soient le thème et la région.** Le sol est unique par carte, l'amer est
   unique par arène et visible dans 4 vues sur 81, les props sont la seule
   variation. Le rendre régional (§C.5) est la **seule** façon de donner une
   identité à un combat de boss, et c'est un argument de plus, indépendant de
   tout le reste du dossier.

---

## J.1 — Ce que chaque trame fait au combat

| trame | ligne de vue | kite | regroupement de la horde | favorise | dessert |
|---|---|---|---|---|---|
| **RUBAN** | très longue sur l'axe, nulle en travers | aller-retour le long ; les brèches sont des points de bascule | **fort aux brèches** — la horde s'entonne, puis déborde | railgun, siège, précision, laser | grenade (peu de latéral), lame |
| **NEF** | longue dans l'axe, bornée par les parois | le mur est un **dos** : on ne se fait pas encercler | modéré, arrive par les deux bouts | assaut, dispersion, Rempart | précision (murs proches) |
| **PEIGNE** | courte, hachée par les dents | **zigzag** : la meilleure structure de kite du dossier | la horde **se scinde** en autant de flux que de dents | lame, tesla, dispersion, Tireur | siège, laser (rien ne reste aligné) |
| **COURONNE** | tangentielle, jamais radiale | **rotation continue** : le kite le plus lisible du jeu | la horde suit l'anneau et **s'étire** | tout, avec un avantage aux zones persistantes | rien |
| **CRIBLE** | **allées orthogonales seulement** | déplacements en L, angles morts courts | flux réguliers par les allées | perforation, ricochet, tesla | grenade lobée (les masses renvoient) |
| **FAILLE** | **libre** — elle ne coupe pas la vue | on kite **le long**, on engage **à travers** | la horde se concentre aux passages | toutes les armes à distance | mêlée, lame, contact |

**Aucune trame ne rend une arme inutilisable**, et c'est vérifiable : chaque
colonne « dessert » a au moins deux trames qui la favorisent en face.

Bilan par arme, sur les six trames :

| arme | favorisée par | desservie par | solde |
|---|---|---|---|
| standard | — | — | neutre partout |
| assaut | NEF, CRIBLE | — | **+2** |
| laser | RUBAN, FAILLE | PEIGNE | **+1** |
| tesla | PEIGNE, CRIBLE | — | **+2** |
| lame | PEIGNE, COURONNE | FAILLE, RUBAN | **0** |
| dispersion | NEF, PEIGNE | RUBAN | **+1** |
| railgun | RUBAN, FAILLE | PEIGNE | **+1** |
| grenade | COURONNE, NEF | RUBAN, CRIBLE | **0** |
| siège | RUBAN, FAILLE | PEIGNE | **+1** |
| précision | RUBAN, FAILLE | NEF | **+1** |

Et par classe :

- **Rempart** — la NEF et le CRIBLE lui donnent des dos et des goulots ; la
  FAILLE le dessert (il ne peut pas tenir un passage qu'on lui tire dessus).
  Deux trames pour, une contre.
- **Soigneur** — les liens de soin ont une portée et se rompent : le PEIGNE et le
  CRIBLE, qui séparent l'équipe, le desservent ; la COURONNE et la NEF, qui la
  gardent groupée, le servent. **C'est le seul point d'équilibrage à surveiller
  en mesure**, et il porte sur `_healLinks`, pas sur le décor.
- **Tireur** — favorisé par tout ce qui allonge (RUBAN, FAILLE), desservi par
  rien.

---

## J.2 — Les cinq garde-fous, chiffrés

| # | règle | valeur | d'où elle sort |
|---|---|---|---|
| 1 | **aucun goulot** | toute brèche ≥ 240 px (= 3 × `PASSAGE_MIN`) | mesure de `navigation.js` : « au pire calage, une fente de 160 px est contestée en 4,2 s, une de 200 px jamais » |
| 2 | **pas d'abri parfait** | tout couloir entre deux masses a une bande libre > `NAV_CFG.CELL` (40 px), donc un écart > 68 px | le piège déjà payé deux fois (`fonderie` conduites à 0,06, `usine` chaînes à 0,07) |
| 3 | **pas de cul-de-sac long** | profondeur ≤ 400 px pour une dent de PEIGNE ou une alvéole | au-delà, la horde bouchonne et le joueur tire dans un entonnoir |
| 4 | **connexité totale** | inondation de la grille de nav sur toute l'arène : 100 % des cases libres atteintes | `verifierTrame()`, 40 graines × 5 thèmes × 3 modes |
| 5 | **budget de surface constant** | `TRAME 0.045 + CELLULE 0.055 = 0.10`, inchangé | `BIOME_CFG.OBSTACLE_SURFACE_MAX` d'aujourd'hui |

**Le point 5 est le plus important du dossier côté jeu** : la quantité de matière
bâtie ne bouge pas. On ne remplit pas l'arène, on **redistribue** — moins
d'objets moyens interchangeables, plus de structure qui se lit. La population, la
vitesse, les dégâts et les plafonds ne bougent d'aucun chiffre.

---

## J.3 — La règle de composition d'une carte

Trois biomes du dossier sont **géométriquement contraignants** (couloir unique,
latéral quasi nul) : `U12 galerie`, `R08 cite`, `S02 ruelle`, `S11 station`,
`S13 sousniveau`, `N12 relique`.

> **Au plus UN quartier contraignant par carte**, et jamais adjacent à un autre.

Cela s'écrit dans `grilleVariantes` comme une contrainte de plus, du même type
que `loisAccordees` : un drapeau `contraignant: true` sur la loi, refusé si un
voisin le porte déjà ou si un quartier de la carte le porte déjà.

Symétriquement, **au moins un quartier « respiration »** par carte
(`U03 expedition`, `F03 refroidissement`, `N01 derive`, `R03 chantier`,
`S12 toit`, `S03 parvis`) : une carte entièrement dense n'a pas de rythme, et le
§13 le dit.

Ces deux contraintes sont **le seul ajout de logique** à `grilleVariantes`, qui
sait déjà refuser des voisinages.

---

## J.4 — Ce qui change pour la horde et la navigation

- **`_nav()` ne change pas.** Un champ par joueur, la trame est faite
  d'obstacles ordinaires, la grille les voit comme le reste. Le coût de
  `construireNav` suit le **nombre de cases** (8 160), pas le nombre d'obstacles :
  le relevé de `LISEZMOI` donne 0,04 à 0,07 ms pour 45 à 81 obstacles par vue —
  **plat**.
- **`droitPossible()` refusera plus souvent la ligne droite** dans les biomes à
  trame forte (PEIGNE, NEF), donc le champ servira plus. C'est exactement ce pour
  quoi il a été écrit, et le coût est amorti (`REBUILD_MIN`, ~0,014 ms/tick).
- **`_spawnPoint` / `_pushOffScreen`** : une trame de type NEF peut mettre un
  joueur contre une paroi, donc réduire les points d'apparition hors vue d'un
  côté. `_spawnPoint` a déjà un repli (`_edgePoint`) ; **`verifierTrame()` doit
  mesurer le nombre de points d'apparition valides autour d'un joueur placé au
  pire endroit de chaque trame**, et refuser en dessous d'un quart du périmètre.
  C'est le seul risque de jeu réel du dossier, et il est nommé.
- **`_groundZone` / `trailMax()`** : rien à changer. Une zone posée dans une nef
  couvre proportionnellement plus de passage — c'est un effet de terrain, pas un
  déséquilibre, et le plafond global reste.

---

## J.5 — Les dangers, inchangés

`HZ_NORMAL` et `HZ_CAUCHEMAR` restent **par thème**, et l'échelle
(`ECHELLE[lieu]`) aussi. Trois raisons :

1. `verifierBiomes()` compare déjà la surface de danger des cinq thèmes à ±25 %
   de la moyenne — c'est un garde-fou d'équilibre, et le casser par région
   rendrait certaines régions objectivement plus dures.
2. Le §12 du dépôt est explicite : « ce qui blesse doit blesser pareil partout,
   sinon le joueur réapprend un barème à chaque lieu ».
3. Un danger **se lit** déjà par lieu (`DANGER[biome][kind]`) — c'est la
   représentation qui change, pas la géométrie, et ça suffit.

Deux biomes seulement **groupent** les dangers existants au lieu d'en ajouter :
`U06 traitement` (le long de la fosse) et `R07 contaminee` (autour de la
rétention). Ils ne changent ni le nombre, ni le rayon, ni les dégâts : ils
changent **où** les positions de la table tombent, ce que `buildBiome` fait déjà
par cellule.

---

## J.6 — Le rythme de traversée, avant et après

| | aujourd'hui | proposé |
|---|---|---|
| vues distinctes par arène | **16** | 96 à 192 |
| vues distinctes par quartier | 4 | 8 à 16 |
| période de répétition du bâti | **2 vues** | 4 vues + trame unique par quartier |
| ce qui change en franchissant une frontière | densité, calibre, teinte de sol (ΔE 3 à 8), 2 zones de props | **structure, vocabulaire bâti, sol, props, traces, amer, lumière locale** |
| ce qui change pendant un boss | props | **sol, props, traces, amer, lumière, fond** |

Un joueur qui traverse une carte de 81 vues rencontre 3 à 6 quartiers. Avec
12 à 13 biomes par thème, **deux cartes consécutives du même thème ne montrent
presque jamais le même jeu de régions** : `C(12,5) = 792` combinaisons, contre
**une seule** aujourd'hui (les quatre lois sont toujours toutes présentes dès que
la carte a quatre quartiers ou plus).
