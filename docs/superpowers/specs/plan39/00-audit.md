# A — AUDIT DES BIOMES ACTUELS · B — DIAGNOSTIC

**Dépôt `0.42.1`. Aucune ligne de code modifiée.** Tout ce qui suit est relevé
sur le code et sur les deux captures de `docs/screens/`, pas sur les plans
antérieurs. **Le plan 38 est traité comme de l'histoire** : il a livré « une
carte = un thème » (0.42.0) et rien d'autre ; ses 61 fiches de biome n'ont
jamais existé en jeu, et sa conception est réexaminée ici comme le reste.

---

## B.0 — La mesure qui ouvre le dossier

Trois relevés faits sur le dépôt, rejouables, et aucun n'est signalé par les
54 vérificateurs.

### 1. Les vingt régions emploient les mêmes trois familles bâties

Balayage de `OBSTACLES` (`shared/biomes.js`), familles distinctes par région :

| thème | loi 0 | loi 1 | loi 2 | loi 3 |
|---|---|---|---|---|
| usine | CHAINE·POSTE·MACHINE | CHAINE·POSTE·MACHINE | CHAINE·POSTE·MACHINE | CHAINE·POSTE·MACHINE |
| fonderie | FOUR·CONDUITE·CUVE | FOUR·CONDUITE·CUVE | FOUR·CONDUITE·CUVE | FOUR·CONDUITE·CUVE |
| friche | RUINE·MUR·CARCASSE | RUINE·MUR·CARCASSE | RUINE·MUR·CARCASSE | RUINE·MUR·CARCASSE |
| nébuleuse | FRAGMENT·TRAVEE·DEBRIS | FRAGMENT·TRAVEE·DEBRIS | FRAGMENT·TRAVEE·DEBRIS | FRAGMENT·TRAVEE·DEBRIS |
| secteur | DEVANTURE·PYLONE·CONTENEUR | DEVANTURE·PYLONE·CONTENEUR | DEVANTURE·PYLONE·CONTENEUR | DEVANTURE·PYLONE·CONTENEUR |

**Vingt cases sur vingt sont pleines.** Un biome n'a aujourd'hui aucun objet qui
lui appartienne. C'est la mesure exacte de la plainte : « les mêmes machines,
rangées autrement ». Ce n'est pas une impression, c'est la table.

### 2. Une arène de 81 vues contient 16 vues distinctes

`buildBiome` pose la table de la loi **par cellule de 1600 × 900**, avec deux
miroirs `mx = (cx+cy)&1` et `my = (cx·2+cy)&1`. Or `cx·2` est pair, donc
`my = cy&1` : les deux miroirs ont une période de **2 cellules en x et en y**.

```
lieu        cellules  régions  lois distinctes  ARRANGEMENTS DISTINCTS  obstacles
usine          81        6           4                   16               626
fonderie       81        6           4                   16               422
friche         81        6           4                   16               662
nebuleuse      81        6           4                   16               558
secteur        81        6           4                   16               741
```

Une région fait 13,5 cellules en moyenne et ne contient que **quatre**
dispositions, chacune revue trois fois. À l'intérieur d'un quartier, **le décor
bâti se répète tous les deux écrans**. Aucune quantité de props ne rattrape ça :
c'est la structure qui se répète, et c'est elle qu'on lit.

### 3. Quatre thèmes sur cinq ont deux régions au vocabulaire de props identique

`AIR[theme][loi].zones` tire deux ou trois `ZONES` du thème. Deux régions qui
tirent **les mêmes** zones dans un autre ordre ont le même catalogue :

```
usine     lois 1 et 3 : VOCABULAIRE IDENTIQUE (5 props)   zones [2,1] contre [1,2]
friche    lois 1 et 3 : VOCABULAIRE IDENTIQUE (8 props)
nebuleuse lois 1 et 3 : VOCABULAIRE IDENTIQUE (5 props)   zones [0,2] contre [2,0]
secteur   lois 0 et 1 : VOCABULAIRE IDENTIQUE (7 props)   zones [0,1] contre [1,0]
friche    lois 0/1, 0/3, 1/2, 2/3 : Jaccard 0,63 à 0,67
```

Elles ne diffèrent plus que par `dens` et `ech` — **un nombre et un calibre**.
`verifierTraces()` vérifie la *couverture* (aucune zone orpheline) et jamais la
*distinction* : il ne peut pas voir ça, et il est vert.

---

## B.1 — Le diagnostic, en une phrase

> **Le dépôt n'a pas de couche ARCHITECTURE.** Il a des blocs (40 à 420 px) et
> des props (20 à 140 px). Une vue fait 1600 × 900. **Rien dans le jeu n'a la
> taille d'un écran ni davantage** — donc rien ne peut se reconnaître de loin,
> rien ne traverse plusieurs vues, et un biome ne peut être qu'un rangement.

Les dix niveaux du cahier des charges, confrontés au code :

| niveau | ce qui le porte aujourd'hui | par quoi il est indexé | verdict |
|---|---|---|---|
| 1 silhouette | *rien* | — | **absent** |
| 2 architecture | *rien* | — | **absent** |
| 3 gros obstacles | `BLOC[lieu][kind]`, 3 familles | **thème** | identique entre régions |
| 4 composition | `OBSTACLES[lieu][v].poser` | **région** | seul canal réel, 4 valeurs |
| 5 matériaux | `TUILE[cle]`, `BIOME_SKIN` | **thème** | identique entre régions |
| 6 props | `TABLE`/`ZONES` + `AIR[…].zones` | région (sous-ensemble) | 4 doublons mesurés |
| 7 sol | `floorPattern(bi, diff, seed, dpr)` | **thème** | identique entre régions |
| 8 background | `FOND[fond]`, `AMERS[cle]` | **thème** | identique entre régions |
| 9 micro-détails | `AIR[…].matieres`, 9 primitives | région | fonctionne, mais 3 px |
| 10 gameplay spatial | la loi d'implantation | région | fonctionne, faiblement |

**Trois canaux sur dix sont indexés par la région, et les deux niveaux qui
décident de la reconnaissance à l'œil — silhouette et architecture — n'existent
pas.** Le résultat est exactement ce que montrent les deux captures : deux
images qu'on ne peut pas distinguer autrement qu'en lisant le bandeau.

### Ce que les captures prouvent, objet par objet

`usine biome chaine.png` contre `usine biome carrefour.png` :

- même **convoyeur** (barre longue à taquets ambre) — `B_CHAINE`, présent dans
  les quatre lois de l'Usine ;
- même **armoire** (pavé chanfreiné, écran noir, liseré ambre) — `B_MACHINE`,
  idem ;
- même **disque hachuré** et même **disque à pales** — props `P_VENTILATION` /
  `P_PRESSE`, tirés par les zones 0 et 3, présentes dans trois lois sur quatre ;
- même **sol** au pixel : `floorPattern` n'a pas d'argument de région ;
- même **grille de 20 m**, même vignettage, même direction de lumière ;
- même **fond** (aucun : l'Usine n'a pas de `fond`).

Ce qui change réellement entre les deux images : la **densité** (7 blocs contre
5 visibles), et les **traces au sol** (bandes hachurées contre rayures
obliques). Deux canaux sur dix, dont un qui fait trois pixels d'épaisseur.

### La cause profonde, et elle est écrite noir sur blanc

`docs/regles/RENDU.md:531` :

> « `bloc`/`blocEdge` restent au thème : **une ruine de Friche doit être la même
> partout** — c'est le VOCABULAIRE du lieu, pas son ambiance. »

Cette règle était **juste quand une carte portait cinq thèmes** : il fallait
alors que le vocabulaire tienne le thème ensemble contre ses voisins. Depuis
0.42.0 une carte n'a plus qu'un thème, et **c'est la règle elle-même qui
empêche maintenant les régions d'exister**. Elle doit être remplacée, pas
contournée : le vocabulaire appartient désormais au **BIOME**, la **charte**
(lumière, ambiante, direction, grille) reste au thème.

### Le plafond arithmétique, tant qu'on y est

`districtsDe` tire **3 à 6 régions**. `OBSTACLES` en propose **4**. Quand une
carte tire 5 ou 6 régions, `grilleVariantes` doit **répéter une loi** — et
`verifierRegions` l'accepte explicitement (`borne = nq - vs.length`). Le jour où
un thème porte douze biomes, cette borne tombe à zéro d'elle-même. Le commentaire
du code le dit déjà ; personne n'a produit les biomes.

---

## A — LES VINGT RÉGIONS, UNE PAR UNE

Barème demandé : 0 identique · 1 variation mineure · 2 différence faible ·
3 différence perceptible · 4 véritable environnement différent · 5 identité forte.

**Aucune région du dépôt ne dépasse 2.** Le plafond est structurel : les
niveaux 1, 2, 5, 7 et 8 sont constants par construction, donc le maximum
atteignable avec le système actuel est de l'ordre de 2,5.

### USINE

#### `usine[0]` — La chaîne · **1/5**
- **Représente** une ligne de production : deux convoyeurs longs en diagonale,
  postes aux extrémités, machines au centre.
- **Fonctionne** : l'axe se lit, les convoyeurs orientent la vue.
- **Ne fonctionne pas** : c'est la loi historique du lieu, donc la référence —
  et les trois autres sont ses variantes de rangement. `dens` = 1.
- **Partagé** : les 3 familles bâties, le sol, la palette, 5 props sur 5 avec la
  loi 2 (convoyeur, bras, presse).
- **Générique** : le `B_MACHINE` central n'a aucun rapport avec une chaîne — il
  est là parce qu'il faut du contraste de taille (`signatureVariante`).

#### `usine[1]` — Le carrefour · **1/5**
- **Représente** deux allées larges qui se croisent, quatre îlots.
- **Fonctionne** : les bandes centrales sont franches, on traverse.
- **Ne fonctionne pas** : les îlots sont **les mêmes armoires** que la chaîne, et
  les convoyeurs sont toujours là (0.50/0.12 et 0.50/0.88). Un carrefour de quoi ?
  Rien ne dit ce qui circule.
- **Partagé** : voir la capture. Tout, sauf la position.
- **Incohérent** : un carrefour n'a pas de convoyeur en travers de sa tête.

#### `usine[2]` — L'atelier · **2/5**
- **Représente** un semis dense de petits postes.
- **Fonctionne** : le seul dont la densité (`dens` 1,34, 11 blocs) se sente
  vraiment ; on tire court.
- **Ne fonctionne pas** : « atelier » promet des établis, des machines ouvertes,
  des pièces au sol. Il pose des `B_POSTE` — c'est-à-dire l'armoire, en petit.
- **Partagé** : vocabulaire de props identique à la loi 0 aux deux tiers.

#### `usine[3]` — Le dégagement · **1/5**
- **Représente** la respiration : presque vide, deux masses aux bords.
- **Fonctionne** : c'est le seul où l'on traverse en ligne droite, et c'est un
  vrai service rendu au rythme.
- **Ne fonctionne pas** : **vocabulaire de props strictement identique à la
  loi 1**, à `dens` (0,58 contre 0,82) et `ech` près. Deux régions qui ne
  diffèrent que par « combien » ne sont pas deux endroits.
- **Injustifié** : un dégagement d'usine est un endroit **vide et marqué** (aire
  de manœuvre, zone de sécurité) ; ici il est vide et nu.

### FONDERIE

#### `fonderie[0]` — La coulée · **2/5**
- **Représente** deux fours et un couloir entre eux.
- **Fonctionne** : c'est le seul lieu du dépôt qui ait un **objet propre au
  monde** — `couleeDe()` trace un canal ancré à l'arène, dessiné par `decor.js`
  et allumé par `lumiere.js`. C'est exactement la couche « architecture » qui
  manque partout ailleurs, et elle existe une fois.
- **Ne fonctionne pas** : le canal est **par thème, pas par région**. Il traverse
  la coulée, les cuves, le refroidissement et le puits sans distinction.
- **Partagé** : les 3 familles, le sol, la palette.

#### `fonderie[1]` — Les cuves · **2/5**
- **Représente** un four et cinq cuves, aucun axe.
- **Fonctionne** : l'absence de direction se sent, c'est un vrai contraste avec
  la coulée.
- **Ne fonctionne pas** : « cuve » et « four » sont ici deux tailles d'octogone.
  L'objet ne dit pas ce qu'il contient.

#### `fonderie[2]` — Le refroidissement · **2/5**
- **Représente** des masses courtes en quinconce.
- **Fonctionne** : la contrainte d'écart (2 × `PASSAGE_MIN`) est propre et le
  quinconce se lit.
- **Ne fonctionne pas** : **rien n'y refroidit**. Un bassin, de la vapeur, du
  métal qui passe du rouge au gris — aucun des trois n'existe. Le nom est une
  promesse que le rendu ne tient pas : la teinte, l'émissif et la lumière sont
  ceux de la coulée, donc **il fait aussi chaud qu'ailleurs**.
- **Le pire cas du dépôt** pour l'écart entre l'intention écrite et le pixel.

#### `fonderie[3]` — Le puits · **2/5**
- **Représente** une masse centrale, pourtour dégagé.
- **Fonctionne** : le seul du thème dont le centre soit interdit ; on tourne
  autour, la horde arrive par un côté aveugle. Vrai effet de jeu.
- **Ne fonctionne pas** : la « masse centrale » est deux `B_FOUR` collés. Un
  puits est un **trou**, or le dépôt ne sait dessiner que du plein.

### FRICHE

#### `friche[0]` — Le champ · **2/5**
- **Représente** deux champs de ruines et du terrain nu au milieu.
- **Fonctionne** : les trois formats de carcasse (couché, carré, debout) sont la
  seule variation de **forme** intra-famille du dépôt. Le tremblement par cellule
  (`jMax = 40`) casse la grille de 1600 — la Friche est le seul lieu où la
  périodicité de 2 vues ne se voie pas franchement.
- **Ne fonctionne pas** : « champ » ne dit pas ce qui a été abandonné. Rien ne
  distingue une friche d'usine d'une friche de ville.

#### `friche[1]` — Le mur · **2/5**
- **Représente** une longue ruine à trois brèches.
- **Fonctionne** : la seule région du dépôt qui pose une **ligne** de plus d'une
  demi-vue (0,150 + 0,110 + 0,110 = 0,37 de cellule, soit 592 px). Elle est ce
  qui ressemble le plus à de l'architecture, et elle s'arrête à la cellule.
- **Ne fonctionne pas** : **vocabulaire de props identique à la loi 3** (8 props).
- **À conserver et à étendre** : c'est le prototype de la TRAME (§C).

#### `friche[2]` — Le cratère · **1/5**
- **Représente** vide au centre, dense au pourtour.
- **Ne fonctionne pas** : **il n'y a pas de cratère.** Le nom décrit une
  disposition, pas un objet. Aucun sol brûlé, aucun bourrelet, aucune pente. Un
  joueur qui traverse ne voit qu'un endroit un peu moins encombré.
- **Purement décoratif sans justification** : le nom lui-même.

#### `friche[3]` — L'effondrement · **1/5**
- **Représente** « le contraste » — des masses de toutes tailles, sans loi.
- **Ne fonctionne pas** : une variante dont la règle est « pas de règle » est
  une variante qui ne se reconnaît pas. Cinq corrections de superposition sont
  écrites dans ses commentaires : le contraste s'obtenait en empilant.
- **Candidate à la suppression / refonte totale.**

### NÉBULEUSE

#### `nebuleuse[0]` — La dérive · **2/5**
- **Fonctionne** : le contraste de taille (fragment 232×135 contre débris 67×34)
  est le plus fort des cinq thèmes, et la travée (32 × 504 px) est l'objet le
  plus allongé du dépôt.
- **Ne fonctionne pas** : rien ne dérive. Aucun objet ne bouge, alors que
  l'apesanteur est le seul argument du lieu.

#### `nebuleuse[1]` — Le champ d'épaves · **1/5**
- **Ne fonctionne pas** : **vocabulaire de props identique à la loi 3.** Sept
  débris et un fragment ; c'est « la dérive avec plus de petits ».

#### `nebuleuse[2]` — Les grands fragments · **2/5**
- **Fonctionne** : trois masses très espacées, contournements longs. Effet réel
  sur le kite.
- **Ne fonctionne pas** : `dens` 0,52 et `ech` [1,30 ; 1,34] — c'est un **facteur
  d'échelle** sur la même chose, exactement ce que le commentaire de `OBSTACLES`
  interdit deux cents lignes plus haut.

#### `nebuleuse[3]` — La brèche · **2/5**
- **Fonctionne** : la seule loi **asymétrique** du dépôt, et le miroir de cellule
  la fait changer de côté d'une région à l'autre. Idée juste.
- **Ne fonctionne pas** : « brèche » suppose une paroi percée. Il n'y a pas de
  paroi : le bâti se concentre d'un côté, c'est tout.

### SECTEUR

#### `secteur[0]` — La rue · **2/5**
- **Fonctionne** : le lieu le plus dense du dépôt (`dens` 1,28, 741 obstacles),
  le seul avec trois sources lumineuses au sol, le seul dont la lumière soit
  quasi horizontale. **Le plus abouti des vingt.**
- **Ne fonctionne pas** : **vocabulaire de props identique à la loi 1.**
- **Manque** : une rue a une **chaussée** et des **trottoirs**. Le sol ne les
  distingue pas ; `P_PASSAGE` et `P_MARQUAGE` sont des props semés, pas une voie.

#### `secteur[1]` — La place · **1/5**
- **Ne fonctionne pas** : catalogue identique à la rue. Une place se reconnaît à
  son **sol** (dallage, pavage, fontaine, monument) — aucun des quatre.

#### `secteur[2]` — Le marché · **2/5**
- **Fonctionne** : treize blocs, presque tous des conteneurs destructibles ;
  c'est la seule région du dépôt où l'on peut **rouvrir** un passage au tir.
- **Ne fonctionne pas** : un marché a des **étals**, un auvent, une allée
  centrale. Il pose des conteneurs, c'est-à-dire des caisses.

#### `secteur[3]` — Le parvis · **1/5**
- **Ne fonctionne pas** : deux devantures et un pylône. « Monumental » n'est
  porté par aucun objet — la plus grande devanture fait 99 × 126 px.

---

## A.bis — Ce qui, dans l'existant, est bon et doit être gardé

L'audit n'est pas à charge sur tout. Six choses sont justes et coûteuses à
refaire ; le nouveau système se construit **dessus**.

1. **Le découpage en quartiers** (`districtsDe`) — germes, croissance, bruit,
   réparation de connexité, un seul tenant garanti sur 60 graines. Excellent.
   Il ne change pas.
2. **Les Wang tiles de bord** (`BORD_*`, `loisAccordees`) — la contrainte remonte
   à la région, pas à la cellule. C'est la bonne granularité, elle est gardée.
3. **`sonder()`** — un seul balayage rend « est-ce libre » **et** « quelle
   architecture est la plus proche ». `QUARTIER[lieu][kind]` fait déjà décider
   l'architecture avant le semis. **C'est le bon principe, appliqué à trois
   familles seulement.**
4. **Le canal de coulée** (`couleeDe`) — le seul objet ancré au MONDE et non à la
   cellule, généré une fois, lu par le décor **et** par la lumière. C'est la
   maquette de la TRAME.
5. **La table `EMISSIF`** — un prop déclare rayon et couleur, `lumiere.js` les
   consomme sans rien savoir du catalogue. Extensible sans coût.
6. **La discipline de vérificateur** — `verifierZones`, `verifierTraces`,
   `verifierLed`, `verifierBlocs`, `verifierMatiere` croisent leurs tables dans
   les deux sens. Il en manque un seul, et c'est celui du §I : **rien ne compare
   deux biomes entre eux.**

## A.ter — Ce qui est incohérent, générique ou irréaliste

- **`B_MACHINE` au centre de « la chaîne »** — présent pour satisfaire le
  contraste de `signatureVariante`, pas pour dire quelque chose.
- **Le convoyeur en tête du « carrefour »** — un convoyeur en travers d'une allée
  de circulation est un contresens industriel.
- **Le « refroidissement » à la même température que la coulée** — nom sans
  rendu.
- **Le « cratère » sans cratère, la « brèche » sans paroi, le « puits » sans
  trou** — trois noms qui décrivent une disposition et promettent un objet.
- **`P_CAILLEBOTIS` et `P_TUYAU` à la Fonderie** — justifiés dans le commentaire
  (« une fonderie a des grilles de sol »), mais ce sont deux props d'Usine
  recyclés, et ils sont dans la zone 2 **et** la zone 3, donc partout.
- **`AMER_POSES` : un seul amer par arène de 81 vues.** Le relevé de `LISEZMOI`
  dit « visible dans 4 vues sur 81 ». Un repère unique sur une carte de
  14400 × 8100 ne repère rien.
- **Le tremblement `jMax` réservé à la Friche.** Les quatre autres thèmes posent
  leur bâti sur une grille de 1600 px parfaitement régulière — et c'est visible
  à la traversée.

---

## B.2 — Pourquoi ça donne une impression de répétition, en cinq causes

1. **Le décor bâti se répète tous les deux écrans** (16 arrangements sur 81
   vues), et la répétition est *régulière*, donc lisible comme une grille.
2. **Le vocabulaire bâti est constant sur toute la carte** : 3 formes, quelle que
   soit la région. Ce sont les objets les plus grands de l'écran, donc ceux qui
   décident de ce qu'on croit voir.
3. **Le sol est constant sur toute la carte** : c'est la plus grande surface de
   l'écran, et elle est cuite sans terme de région.
4. **Rien n'a la taille d'une vue.** Le plus grand objet du dépôt est la travée
   de la Nébuleuse (504 px de long) ; une vue en fait 1600. Il n'existe aucune
   échelle intermédiaire entre le bloc et l'arène, donc **aucune silhouette**.
5. **Les canaux qui varient sont les plus faibles** : la densité (un nombre), le
   calibre (un nombre), et une trace au sol de trois pixels sous un semis.
   Le cahier des charges le dit au §8 : « un biome ne doit pas reposer uniquement
   sur les niveaux 8-9 ». Le dépôt repose sur 9 et 10.

**Conclusion de l'audit.** Le système actuel ne peut pas produire des biomes
distincts, quel que soit le nombre de lois qu'on lui ajoute — parce que la
distinction ne passe par aucun des canaux que l'œil lit en premier. Ajouter huit
lois par thème à `OBSTACLES` donnerait 32 rangements des trois mêmes formes, sur
le même sol, sous la même lumière. **Il faut changer la structure, et ensuite
seulement remplir la bibliothèque.**
