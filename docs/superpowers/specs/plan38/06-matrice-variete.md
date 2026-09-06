# ÉTAPE 4 — MATRICE DE VARIÉTÉ

Le dépôt a déjà une matrice **exécutable** : `signatureVariante` (6 axes) avec un
plancher de 15 % et un plafond de 40 %, croisée par paires dans
`verifierVariantes`. Elle marche pour 4 variantes. **Elle ne peut pas marcher
pour 12.**

## 1. Pourquoi le garde-fou actuel casse à 12 biomes

`verifierVariantes` exige aujourd'hui, pour **chaque paire** d'un thème :

- **plancher** : au moins un axe sur 6 les sépare de ≥ 15 % ;
- **plafond** : aucun des 4 axes de `LOI_AXES` ne les sépare de ≥ 40 %.

Le plafond par paires est une contrainte **quadratique et transitive de fait** :
si A et B diffèrent de 39 % sur la densité, et B et C de 39 % dans le même sens,
alors A et C diffèrent de ~62 % et la paire (A, C) rougit — alors qu'aucune des
deux n'est sortie du thème. Avec 66 paires par thème, l'espace de solutions se
referme à quatre ou cinq biomes.

**Correction : le plafond devient une ENVELOPPE, le plancher reste par paires.**

- Le **thème** déclare son enveloppe : un intervalle `[min, max]` sur chacun des
  4 axes de loi. Un biome est dans le thème si ses 4 valeurs y tombent.
- Deux **thèmes** restent séparés si leurs enveloppes ne se recouvrent pas d'au
  moins `LOI_ECART` sur au moins un axe — c'est exactement `verifierBiomes`
  d'aujourd'hui, remonté d'un cran.
- Deux **biomes du même thème** restent distincts par le plancher, par paires.

La question « est-ce encore le même lieu ? » devient une question sur **un** biome
et son thème, et non sur 66 paires. C'est plus juste conceptuellement et
linéairement moins coûteux.

## 2. Les 9 axes

Les six premiers existent (`signatureVariante`). Les trois derniers sont neufs,
et chacun répond à une confusion que les six ne voyaient pas.

| axe | définition | ce qu'il sépare |
|---|---|---|
| `densite` | nombre de blocs par vue | l'atelier du dégagement |
| `encombrement` | somme des `w × h` en fractions de vue | une masse de dix éclats |
| `contraste` | surface max / surface min | la Nébuleuse de tout le reste |
| `elongation` | `max(w/h, h/w)` sur le plus allongé | une barre d'un pavé |
| `centrage` | distance moyenne au centre de cellule | le cratère du puits |
| `etalement` | écart-type des positions | un semis d'un groupement |
| **`verticalite`** | part de surface bâtie portée par des systèmes déclarés hauts | **le magasin de l'atelier** — même densité, silhouette opposée |
| **`anisotropie`** | `abs(var(x) − var(y)) / (var(x) + var(y))` | **COULOIRS de GRILLE, LINEAIRE de SEMIS** — la loi a-t-elle une direction |
| **`ouverture`** | part du carré central libre après `CORE_CLEARANCE`, par remplissage | **ce que le joueur ressent** : combien de sol est réellement jouable |

`verticalite` ne se lit **pas** sur l'AABB : un mât a une empreinte minuscule et
une silhouette énorme. Elle se lit sur `SYSTEME[s].hauteur`, déclarée une fois par
système d'obstacle (voir `07-obstacles-et-props.md`). C'est le seul axe qui
descende dans le rendu, et il faut qu'il y descende : sinon deux biomes à
géométrie identique et à silhouette opposée passent pour des doublons.

`ouverture` se mesure avec la machinerie de `celluleTraversable` déjà écrite —
même grille de 10 px, même `CORE_CLEARANCE`, on compte les cases au lieu de
chercher un chemin. Coût nul en plus.

## 3. Les seuils proposés

```
BIOME_PLANCHER      = 0.25   // deux biomes d un theme : >= 25 % sur >= 2 axes sur 9
BIOME_PLANCHER_N    = 2
THEME_ENVELOPPE     = declaree par theme, sur les 4 axes de loi
LOI_ECART           = 0.40   // inchange, mais applique aux ENVELOPPES de theme
ACCENT_LAB_MIN      = 1.5    // un accent invisible n en est pas un
ACCENT_LAB_MAX      = 6.0    // sur `arena` et `bloc`
ACCENT_EMIS_MAX     = 12.0   // l emissif a le droit de bouger plus : il est petit
```

**Plancher à 2 axes et non 1.** Un seul axe suffisait pour 4 variantes ; avec 12,
un unique axe séparant deux biomes produit des jumeaux dont la différence tient à
un chiffre. Deux axes garantissent qu'on les distingue **en jouant** et pas
seulement en mesurant.

**`ACCENT_LAB_MIN`** est la contrepartie exacte de `ACCENT_LAB_MAX` : le dépôt
sait déjà refuser deux lieux trop proches (`verifierCharte`), il doit maintenant
refuser un accent qui n'existe pas. Symétrie identique au couple
plancher/plafond des variantes.

## 4. Les cinq enveloppes de thème

Valeurs cibles, à confirmer par mesure une fois les tables écrites. Elles sont
écrites **avant** les biomes, pas déduites après : c'est ce qui rend le
vérificateur capable de refuser quelque chose.

| thème | `densite` | `encombrement` | `contraste` | `elongation` | ce qui le tient |
|---|---|---|---|---|---|
| USINE | 0,55 – 1,45 | 0,050 – 0,105 | 2,0 – 7,0 | 4,0 – 9,0 | l'orthogonalité et la barre longue |
| FONDERIE | 0,50 – 1,35 | 0,060 – 0,110 | 3,0 – 9,0 | 2,0 – 6,0 | la masse : rien n'y est petit longtemps |
| FRICHE | 0,45 – 1,30 | 0,040 – 0,095 | 4,0 – 14,0 | 2,5 – 7,0 | le contraste de calibre, le plus large |
| NÉBULEUSE | 0,40 – 1,15 | 0,035 – 0,090 | 8,0 – 30,0 | 6,0 – 30,0 | le contraste extrême et la travée |
| SECTEUR | 0,65 – 1,75 | 0,055 – 0,105 | 2,5 – 8,0 | 3,0 – 16,0 | la densité haute et le pylône fin |

Séparations garanties par ces enveloppes, sur au moins un axe à `LOI_ECART` :
Nébuleuse ↔ tous (contraste et élongation) · Secteur ↔ Usine (densité haute) ·
Fonderie ↔ Usine (élongation basse contre haute) · Friche ↔ Fonderie (contraste) ·
Friche ↔ Secteur (densité). **Aucune paire ne passe sous le seuil.**

## 5. La matrice, thème par thème

Codage qualitatif 0–4 pour lecture humaine ; le vérificateur, lui, lit les
nombres réels. `ouv` = ouverture, `den` = densité, `con` = contraste, `elo` =
élongation, `cen` = centrage, `eta` = étalement, `ver` = verticalité, `ani` =
anisotropie, `circ` = type de circulation.

### USINE

| biome | ouv | den | con | elo | cen | eta | ver | ani | circ |
|---|---|---|---|---|---|---|---|---|---|
| U01 ligne | 2 | 2 | 2 | 4 | 2 | 3 | 1 | **4** | axiale |
| U02 carrefour | 3 | 2 | 2 | 3 | **3** | 3 | 1 | 2 | croisée |
| U03 atelier | 1 | 3 | 1 | 2 | 2 | 3 | 1 | 1 | libre |
| U04 dégagement | **4** | **0** | 2 | 3 | **4** | 2 | 1 | 2 | libre |
| U05 magasin | 1 | 3 | 2 | **4** | 2 | 1 | **4** | **4** | couloirs |
| U06 expédition | 3 | 2 | 3 | 3 | **4** | 2 | 3 | 3 | adossée |
| U07 utilités | 1 | 3 | 2 | 1 | 3 | 3 | 2 | 1 | poches |
| U08 traitement | 1 | 2 | 3 | **4** | 1 | 1 | 1 | **4** | file |
| U09 contrôle | **4** | **0** | 3 | 2 | 2 | 2 | **4** | 1 | libre |
| U10 galerie | **0** | **4** | 2 | 4 | 1 | 2 | 2 | 3 | labyrinthe |
| U11 démontée | 2 | 3 | **4** | 3 | 2 | **4** | 2 | 0 | libre |
| U12 étuve | 2 | 1 | 3 | **4** | 1 | 1 | **4** | **4** | choix |

Paires à surveiller : **U01/U08** (tous deux `ani` 4, `elo` 4) → séparés par
`ouv`, `den` et `cen` ; **U03/U07** (`den` 3, `ouv` 1) → séparés par `elo`
(2 contre 1), `ver` et la circulation ; **U04/U09** (tous deux très ouverts) →
séparés par `ver` (1 contre 4) et `con`.

### FONDERIE

| biome | ouv | den | con | elo | cen | eta | ver | ani | circ |
|---|---|---|---|---|---|---|---|---|---|
| F01 coulée | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 3 | axiale |
| F02 cuves | 2 | 2 | 2 | 1 | 2 | **4** | 2 | 0 | libre |
| F03 refroidissement | 2 | 1 | 3 | 2 | 3 | 2 | 2 | 2 | quinconce |
| F04 puits | 1 | 1 | 3 | 2 | **0** | 1 | 3 | 1 | annulaire |
| F05 minerai | 2 | 1 | **4** | 1 | 3 | 2 | **4** | 1 | poches |
| F06 crassier | **4** | **0** | 1 | 1 | 3 | **4** | 0 | 0 | libre |
| F07 lingots | 1 | 3 | 1 | 1 | 2 | 1 | **0** | 1 | grille |
| F08 sablerie | 1 | **4** | 1 | 1 | 2 | 3 | 0 | 0 | libre |
| F09 bassins | 1 | 2 | 3 | 3 | 2 | 2 | 1 | **4** | file |
| F10 continue | 1 | 1 | **4** | **4** | 1 | 1 | 2 | **4** | file |
| F11 réfection | 2 | 2 | 3 | 2 | 1 | 2 | 3 | 1 | masse |
| F12 pont | **4** | **0** | 2 | 1 | 3 | 2 | **4** | 1 | libre |

Paires à surveiller : **F02/F08** (`SEMIS`, `ani` 0) → séparés par `den` (2/4),
`eta` et la thermie ; **F06/F12** (tous deux `ouv` 4, `den` 0) → séparés par
`ver` (0 contre 4) et `eta` ; **F09/F10** (`ani` 4, file) → séparés par `elo`,
`con` et le nombre de passages.

### FRICHE

| biome | ouv | den | con | elo | cen | eta | ver | ani | circ |
|---|---|---|---|---|---|---|---|---|---|
| R01 champ | 3 | 1 | 3 | 3 | 3 | **4** | 1 | 1 | libre |
| R02 mur | 2 | 2 | 3 | **4** | 1 | 2 | 2 | **4** | brèches |
| R03 cratère | 2 | 2 | 3 | 2 | **4** | 2 | 2 | 1 | annulaire |
| R04 effondrement | 1 | 2 | **4** | 3 | 2 | 3 | 2 | 0 | libre |
| R05 ferraille | 3 | 2 | **4** | 2 | **4** | 2 | **4** | 1 | poches |
| R06 faisceau | 1 | 2 | 3 | **4** | 2 | 1 | 2 | **4** | couloirs |
| R07 parking | **4** | **0** | 2 | 3 | 3 | 3 | 1 | 2 | libre |
| R08 chantier | 2 | 3 | 3 | 1 | 2 | 1 | **4** | 1 | grille |
| R09 halle | 1 | 3 | 3 | **4** | **4** | 2 | 3 | 2 | enceinte |
| R10 verte | 1 | 3 | 2 | 1 | 2 | 3 | 3 | 0 | poches |
| R11 bassin | 2 | 1 | **4** | 2 | **0** | 1 | 1 | 1 | annulaire |
| R12 dépôt | 2 | 3 | 2 | 2 | 2 | 2 | 3 | 3 | couloirs |
| R13 cité | **0** | **4** | 2 | 2 | 2 | 1 | 3 | 2 | ruelles |

Paires à surveiller : **R03/R11** (tous deux annulaires) → séparés par `cen`
(4 contre 0 : l'un est vide au centre, l'autre y a une masse), `con` et la
végétation ; **R06/R12** (`COULOIRS`) → séparés par `elo` (4/2), `ani` et la
longueur des couloirs ; **R05/R08** (`ver` 4) → séparés par `ouv`, `elo`, `eta`
et surtout par la palette (accent nul contre accent neuf).

### NÉBULEUSE

| biome | ouv | den | con | elo | cen | eta | ver | ani | circ |
|---|---|---|---|---|---|---|---|---|---|
| N01 dérive | 3 | 1 | **4** | **4** | 3 | 3 | 2 | 2 | libre |
| N02 épaves | 2 | 2 | 1 | 2 | 2 | **4** | 1 | 0 | libre |
| N03 fragments | 3 | **0** | 3 | 2 | 3 | 2 | 3 | 1 | contournement |
| N04 brèche | 2 | 1 | 3 | 3 | **4** | 1 | 2 | 3 | asymétrique |
| N05 amarrage | 2 | 2 | 3 | **4** | **0** | 2 | 3 | 0 | **radiale** |
| N06 ferme | **4** | 1 | 1 | 1 | 2 | 1 | **4** | 1 | grille |
| N07 cale | 1 | **0** | **4** | **4** | 1 | 1 | **4** | 3 | masse |
| N08 habitat | **0** | 3 | 1 | 3 | 2 | 2 | 1 | 2 | labyrinthe |
| N09 serre | 1 | 2 | 2 | **4** | 2 | 1 | 2 | **4** | couloirs |
| N10 astéroïdes | 2 | 2 | **4** | 1 | 2 | 3 | 3 | 0 | libre |
| N11 cimetière | 2 | 1 | 3 | **4** | 2 | 1 | 3 | **4** | couloirs |
| N12 collecteur | 1 | 2 | 2 | 1 | **0** | 1 | 3 | 0 | concentrique |

Paires à surveiller : **N01/N10** (`con` 4) → séparés par `elo` (4 contre 1 : la
travée contre la roche), `den` et la matière ; **N09/N11** (`COULOIRS`, `ani` 4)
→ séparés par `ouv`, `den` et la transparence ; **N02/N10** (`SEMIS`) → séparés
par `con` (1 contre 4).

### SECTEUR

| biome | ouv | den | con | elo | cen | eta | ver | ani | circ |
|---|---|---|---|---|---|---|---|---|---|
| S01 artère | 2 | 3 | 2 | **4** | 3 | 3 | 2 | 3 | axiale |
| S02 place | 3 | 2 | 2 | 3 | **4** | 2 | 2 | 1 | annulaire |
| S03 marché | 1 | **4** | 1 | 3 | 2 | 3 | 1 | 1 | libre |
| S04 parvis | **4** | 1 | 2 | 3 | 1 | 1 | 3 | 1 | libre |
| S05 ruelle | **0** | **4** | 2 | **4** | 2 | 2 | **4** | 3 | labyrinthe |
| S06 docks | 2 | 3 | 2 | 2 | 2 | 1 | **4** | 2 | grille |
| S07 niveau P | 2 | 3 | 3 | 1 | 2 | 1 | 1 | 0 | grille |
| S08 station | 3 | 2 | 3 | 3 | 1 | 2 | 3 | **4** | file |
| S09 cages | **0** | **4** | 2 | 2 | 2 | 3 | **4** | 0 | poches |
| S10 viaduc | 3 | 1 | 3 | **4** | **4** | 1 | 2 | **4** | bande |
| S11 sous-station | 1 | 3 | 2 | 3 | 2 | 3 | 3 | 2 | libre |
| S12 chantier | 1 | 3 | **4** | 3 | **4** | 2 | **4** | 1 | enceinte |

Paires à surveiller : **S05/S09** (`ouv` 0, `den` 4, `ver` 4) → **la paire la plus
serrée des 61 biomes.** Séparées par `elo` (4 contre 2), `eta`, l'accent (sombre
et magenta latéral contre chaud et ambre) et la circulation (labyrinthe contre
poches). Si la mesure les rapproche sous le plancher, **S09 fusionne dans S05**
comme accent « habité » et un autre biome prend sa place. C'est le seul cas du
plan où la matrice pourrait imposer une fusion, et c'est très bien : c'est
exactement son travail.
**S06/S07** (`GRILLE`) → séparés par `elo` (2/1), `ver` (4/1) et le fond (visible
contre absent). **S03/S11** (`SEMIS` dense) → séparés par `con`, `ver` et l'accent.

## 6. Ce que le vérificateur doit rendre

`verifierBiomes()` (nouveau nom pour l'actuel `verifierVariantes`, étendu) doit
lever :

1. deux biomes d'un thème qui ne se séparent pas sur 2 axes à 25 % ;
2. un biome hors de l'enveloppe de son thème sur un des 4 axes de loi ;
3. deux thèmes dont les enveloppes se recouvrent partout à plus de
   `1 − LOI_ECART` ;
4. un accent de palette sous `ACCENT_LAB_MIN` ou au-dessus de `ACCENT_LAB_MAX` ;
5. un biome sans nom, sans bords, ou dont les 4 bords sont `BORD_MUR` ;
6. les arêtes incompatibles sur 50 graines (inchangé) ;
7. la monotonie calme < normal < cauchemar, **par biome** et non plus par thème ;
8. un biome dont le carré central n'est pas traversable sur les deux axes,
   **sur 50 graines et non 3** — le nombre passe à 50 parce que le nombre de
   compositions passe de 4 à 12 et que trois graines ne montrent plus rien.

Le point 8 est le plus important du plan : c'est lui qui empêche « un biome
magnifique qui fait bouchon ».
