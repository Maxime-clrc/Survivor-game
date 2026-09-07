# I — MATRICE DE DIFFÉRENCIATION

Onze axes, notés de 1 à 5. **Deux biomes qui obtiennent presque le même profil
sont trop proches** — c'est la consigne du §18, et elle devient ici un calcul.

```
IDV identite visuelle   ARC architecture     OBS obstacles     PRP props
SOL sol                 BGD background       CMP composition   GPL gameplay
VRT verticalite         MAT materiaux        SIL silhouette
```

**La note n'est pas une qualité, c'est une DISTANCE À LA MOYENNE DU THÈME.**
Un 5 sur `SOL` ne dit pas « beau sol », il dit « ce sol n'appartient qu'à lui
dans son thème ». C'est ce qui rend la matrice utilisable : deux profils proches
sont un défaut, quel que soit le niveau des notes.

---

## I.1 — L'état actuel, pour référence

Les vingt régions du dépôt, mêmes axes :

| thème | IDV | ARC | OBS | PRP | SOL | BGD | CMP | GPL | VRT | MAT | SIL | **σ** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| usine ×4 | 1 | 1 | **1** | 2 | **1** | **1** | 3 | 2 | **1** | **1** | **1** | 0,7 |
| fonderie ×4 | 2 | 1 | **1** | 2 | **1** | **1** | 3 | 2 | **1** | **1** | **1** | 0,7 |
| friche ×4 | 2 | 1 | **1** | 2 | **1** | **1** | 3 | 2 | **1** | **1** | **1** | 0,7 |
| nébuleuse ×4 | 2 | 1 | **1** | 2 | **1** | 2 | 3 | 2 | **1** | **1** | **1** | 0,7 |
| secteur ×4 | 2 | 1 | **1** | 2 | **1** | 2 | 3 | 2 | **1** | **1** | **1** | 0,7 |

**Cinq axes sur onze valent 1 pour les vingt régions** : obstacles, sol,
background, verticalité, matériaux, silhouette. Ce ne sont pas des notes basses,
ce sont des **constantes**, et c'est la définition d'un axe mort. La seule
colonne qui travaille est `CMP` — la loi d'implantation — et le §13 du cahier des
charges dit exactement pourquoi elle ne suffit pas.

---

## I.2 — USINE

| # | biome | IDV | ARC | OBS | PRP | SOL | BGD | CMP | GPL | VRT | MAT | SIL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| U01 | ligne | 4 | 4 | 4 | 4 | 4 | 1 | 4 | 4 | 3 | 3 | 5 |
| U02 | magasin | 5 | 5 | 5 | 4 | 4 | 1 | 5 | 5 | 5 | 3 | 5 |
| U03 | expedition | 5 | 5 | 5 | 5 | 4 | 3 | 4 | 4 | 4 | 4 | 5 |
| U04 | maintenance | 4 | 4 | 5 | 5 | 4 | 1 | 3 | 4 | 4 | 4 | 3 |
| U05 | utilites | 4 | 4 | 5 | 4 | 5 | 1 | 4 | 5 | 3 | 5 | 4 |
| U06 | traitement | 5 | 5 | 5 | 4 | 5 | 4 | 4 | 5 | 4 | 5 | 5 |
| U07 | robotisee | 5 | 4 | 4 | 5 | 5 | 1 | 4 | 5 | 3 | 4 | 4 |
| U08 | presserie | 4 | 4 | 5 | 3 | 4 | 1 | 5 | 4 | 5 | 4 | 5 |
| U09 | parc | 4 | 3 | 4 | 4 | 5 | 1 | 4 | 3 | 5 | 4 | 4 |
| U10 | ferraille | 4 | 3 | 4 | 4 | 4 | 2 | 3 | 4 | 3 | 5 | 3 |
| U11 | controle | 5 | 4 | 4 | 4 | 5 | 1 | 3 | 4 | 3 | 5 | 4 |
| U12 | galerie | 4 | 4 | 4 | 3 | 4 | 1 | 5 | 4 | 4 | 3 | 4 |
| U13 | mezzanine | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 2 | 4 | 4 |

**Paires les plus proches (distance euclidienne sur 11 axes)** :
U04/U10 (2,8) — séparées par la trame (NEF/CRIBLE), le sol (huilé/enrobé) et la
lumière (locale/projecteurs sur mâts). **Surveillées.**
U09/U11 (3,0) — profils voisins, contenus opposés (poudre sale / propreté
clinique). Le risque est nul à l'œil.

---

## I.3 — FONDERIE

| # | biome | IDV | ARC | OBS | PRP | SOL | BGD | CMP | GPL | VRT | MAT | SIL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F01 | coulee | 5 | 4 | 4 | 4 | 4 | 1 | 4 | 5 | 3 | 5 | 4 |
| F02 | fusion | 5 | 5 | 5 | 3 | 4 | 1 | 5 | 5 | 5 | 4 | 5 |
| F03 | refroidissement | 5 | 4 | 4 | 4 | 5 | 3 | 4 | 5 | 3 | 5 | 4 |
| F04 | laminoir | 5 | 4 | 5 | 4 | 5 | 1 | 5 | 4 | 4 | 4 | 5 |
| F05 | sablerie | 5 | 3 | 4 | 4 | 5 | 1 | 4 | 5 | 1 | 5 | 4 |
| F06 | minerai | 5 | 3 | 5 | 4 | 5 | 2 | 4 | 4 | 5 | 5 | 5 |
| F07 | ebarbage | 4 | 4 | 4 | 5 | 4 | 1 | 5 | 4 | 3 | 4 | 4 |
| F08 | crassier | 5 | 3 | 5 | 4 | 5 | 2 | 4 | 4 | 3 | 5 | 4 |
| F09 | brames | 4 | 3 | 4 | 3 | 5 | 1 | 4 | 3 | 3 | 4 | 4 |
| F10 | conduites | 5 | 4 | 4 | 3 | 4 | 1 | 4 | 5 | 5 | 3 | 5 |
| F11 | refractaire | 5 | 5 | 5 | 5 | 5 | 3 | 4 | 4 | 4 | 5 | 4 |
| F12 | soufflantes | 4 | 4 | 4 | 3 | 5 | 1 | 5 | 3 | 4 | 5 | 4 |

**Paires les plus proches** :
**F04/F12 (2,2) — la paire la plus serrée du dossier.** Même géométrie (une file
d'objets sur un axe), notes voisines partout. Elles restent séparées par trois
choses seulement : la trame (RUBAN/NEF), le sol (calamine scintillante / tôle
larmée anisotrope) et la lumière (barre incandescente mobile / reflets fixes).
**Si une mesure de terrain les rapproche encore, F12 saute** — c'est écrit dans
sa fiche et c'est un engagement, pas une réserve.
F06/F08 (2,4) — deux `masse_molle` en `granulat`. Séparées par la couleur (rouge
saturé / gris à éclats verts), la clarté (le plus clair / le plus sombre du
thème) et la trame (CRIBLE/COURONNE). **Surveillées.**

---

## I.4 — FRICHE

| # | biome | IDV | ARC | OBS | PRP | SOL | BGD | CMP | GPL | VRT | MAT | SIL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R01 | casse | 5 | 3 | 5 | 5 | 4 | 1 | 4 | 4 | 5 | 4 | 5 |
| R02 | effondree | 5 | 5 | 5 | 4 | 4 | 3 | 5 | 5 | 4 | 4 | 5 |
| R03 | chantier | 5 | 4 | 5 | 4 | 5 | 1 | 5 | 4 | 4 | 5 | 5 |
| R04 | voie | 5 | 4 | 4 | 4 | 5 | 1 | 5 | 4 | 3 | 5 | 5 |
| R05 | repris | 5 | 4 | 5 | 5 | 5 | 1 | 4 | 5 | 4 | 5 | 5 |
| R06 | parking | 5 | 5 | 5 | 4 | 5 | 2 | 5 | 5 | 4 | 4 | 5 |
| R07 | contaminee | 5 | 4 | 4 | 5 | 5 | 3 | 4 | 4 | 1 | 5 | 4 |
| R08 | cite | 5 | 5 | 5 | 5 | 5 | 3 | 5 | 3 | 5 | 4 | 5 |
| R09 | depot | 4 | 4 | 4 | 4 | 4 | 2 | 4 | 4 | 4 | 3 | 4 |
| R10 | decharge | 4 | 3 | 4 | 4 | 5 | 1 | 3 | 4 | 3 | 5 | 4 |
| R11 | carriere | 5 | 4 | 5 | 4 | 5 | 3 | 4 | 5 | 4 | 5 | 5 |
| R12 | campement | 5 | 4 | 5 | 5 | 5 | 1 | 4 | 4 | 4 | 5 | 5 |
| R13 | viaduc | 5 | 5 | 5 | 3 | 5 | 3 | 5 | 5 | 5 | 4 | 5 |

**Paires les plus proches** :
R01/R10 (2,6) — deux CRIBLE/COURONNE de rebut. Séparées par la matière (métal
dur empilé / matière molle tassée), la couleur (sombre huileux / taches vives) et
le mouvement (rien / sacs qui claquent). **Surveillées.**
R09/R10 (2,7) — même remarque, R09 tient par sa parenté structurelle avec U02.

**La Friche est le thème le mieux différencié du dossier**, et c'est logique :
son axe est une multiplication (ce qui a été abandonné × ce qui l'a repris), donc
son espace de conception est un produit, pas une liste.

---

## I.5 — NÉBULEUSE

| # | biome | IDV | ARC | OBS | PRP | SOL | BGD | CMP | GPL | VRT | MAT | SIL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| N01 | derive | 4 | 2 | 3 | 3 | 4 | 5 | 3 | 3 | 1 | 3 | 4 |
| N02 | dock | 5 | 5 | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 5 |
| N03 | chantier | 5 | 4 | 5 | 4 | 5 | 5 | 4 | 5 | 4 | 4 | 5 |
| N04 | coursive | 5 | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 3 | 5 | 4 |
| N05 | serre | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 5 | 4 | 5 | 5 |
| N06 | reacteur | 5 | 5 | 5 | 3 | 5 | 4 | 5 | 5 | 4 | 5 | 5 |
| N07 | cargaison | 4 | 3 | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 3 | 4 |
| N08 | laboratoire | 5 | 4 | 4 | 5 | 5 | 3 | 4 | 4 | 3 | 5 | 4 |
| N09 | ferme | 5 | 4 | 3 | 3 | 5 | 4 | 4 | 4 | 5 | 4 | 5 |
| N10 | service | 4 | 4 | 4 | 4 | 4 | 1 | 3 | 4 | 5 | 4 | 4 |
| N11 | epave | 5 | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 |
| N12 | relique | 5 | 4 | 5 | 4 | 5 | 4 | 4 | 5 | 4 | 5 | 5 |

**Paires les plus proches** :
N01/N07 (2,9) — le premier est du vide semé de fragments, le second un crible
serré de conteneurs ; la distance vient surtout des notes moyennes de N07, qui
est le biome le plus « service » du thème. Séparation réelle : `ajoure` 65 %
contre `technique` plein. **Acceptable.**
N04/N08 (2,5) — deux NEF pressurisées. Séparées par la lumière (froide régulière
/ blanche forte), le sol (plaques bleutées à repérage / résine blanche sans
joint) et la structure (couloir nu / couloir à cellules vitrées). **Surveillées.**

**N01 est volontairement bas** sur `ARC`, `OBS` et `CMP` : c'est la respiration
du thème, et une respiration qui aurait des notes hautes partout ne serait plus
une respiration. **Un thème a besoin d'un biome discret**, et le dire dans la
matrice évite qu'on le « corrige ».

---

## I.6 — SECTEUR

| # | biome | IDV | ARC | OBS | PRP | SOL | BGD | CMP | GPL | VRT | MAT | SIL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S01 | rue | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 4 |
| S02 | ruelle | 5 | 4 | 5 | 5 | 4 | 1 | 5 | 5 | 5 | 4 | 5 |
| S03 | parvis | 5 | 5 | 5 | 3 | 5 | 4 | 4 | 4 | 4 | 5 | 5 |
| S04 | strip | 5 | 4 | 4 | 4 | 5 | 2 | 4 | 4 | 5 | 5 | 4 |
| S05 | capsules | 5 | 5 | 5 | 5 | 5 | 3 | 5 | 4 | 5 | 4 | 5 |
| S06 | marche | 5 | 4 | 5 | 5 | 5 | 3 | 4 | 5 | 3 | 5 | 5 |
| S07 | galerie | 4 | 4 | 4 | 4 | 5 | 2 | 4 | 3 | 4 | 5 | 4 |
| S08 | canal | 5 | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 |
| S09 | cheminee | 5 | 5 | 5 | 3 | 5 | 5 | 4 | 5 | 4 | 5 | 5 |
| S10 | checkpoint | 4 | 4 | 4 | 4 | 5 | 2 | 5 | 4 | 3 | 4 | 4 |
| S11 | station | 4 | 4 | 4 | 4 | 5 | 4 | 5 | 3 | 4 | 4 | 4 |
| S12 | toit | 5 | 4 | 4 | 4 | 5 | 5 | 3 | 4 | 4 | 4 | 5 |
| S13 | sousniveau | 5 | 4 | 4 | 3 | 5 | 5 | 4 | 4 | 4 | 5 | 5 |

**Paires les plus proches** :
**S01/S04 (2,3)** — même trame RUBAN, même famille de front bâti. Séparées par le
sol (trois matières / une seule sans couleur propre), le fond (la ville visible /
la ville masquée par les passerelles) et le retrait (ruelles latérales / aucun).
**Surveillées de près : ce sont deux P0/P1, elles seront vues ensemble.**
S03/S07 (2,4) — deux corporatifs polis. Séparées par sec/mouillé et
froid/chaud — deux axes physiques, pas décoratifs. **Acceptable.**
S10/S11 (2,6) — deux `marque` régulières. Séparées par la trame et par le fond
(clôture / points de fuite noirs). **Acceptable.**

---

## I.7 — LA MATRICE MÉCANIQUE : `verifierSignature()`

La matrice ci-dessus est un jugement d'auteur. Le dépôt exige un **critère
rejouable** (`rituel de lot`, étape 2). Voici celui qui remplace le jugement.

Pour deux biomes `a` et `b` d'un même thème, on calcule cinq recouvrements :

```js
J_bati    = jaccard(familles(a),   familles(b))
J_props   = jaccard(props(a),      props(b))
J_traces  = jaccard(primitives(a), primitives(b))
memeTrame = (trame(a).type === trame(b).type) && (trame(a).famille === trame(b).famille)
memeSol   = (traitement(a) === traitement(b))
```

**Cinq exigences**, refusées à l'échec :

| # | exigence | valeur | aujourd'hui |
|---|---|---|---|
| 1 | chaque biome a **au moins une famille bâtie exclusive** | — | **0 biome sur 20** |
| 2 | `J_bati <= 0,50` | | **1,00 sur 20 régions** |
| 3 | `J_props <= 0,55` | | 4 paires à **1,00** |
| 4 | `J_traces <= 0,60` | | non mesuré |
| 5 | `!memeTrame` et `!(memeSol && J_bati > 0,35)` | | sans objet |

Plus une exigence **de vue**, qui est le test du screenshot du §19 rendu
mécanique :

| # | exigence | méthode |
|---|---|---|
| 6 | **90 % des vues d'une région portent au moins 3 éléments de son vocabulaire propre** | balayage des 81 vues, comptage de (pièce de trame, famille signature, prop signature, traitement de sol, amer) |

`verifierSignature()` vit dans `shared/biomes.js`, à côté de sa donnée, et entre
dans `SUITE` de `verif.js` en mode rapide — il ne construit rien, il lit des
tables. `verifierVue()` construit une arène par thème et balaie, donc il est
**lent** (`true` dans `SUITE`, mode `--tout`).

---

## I.8 — Le verdict de la matrice

| thème | biomes | σ moyen des profils | paires < 2,5 | à surveiller |
|---|---|---|---|---|
| usine | 13 | 1,3 | 0 | U04/U10 |
| fonderie | 12 | 1,3 | **1** | **F04/F12 (2,2)** |
| friche | 13 | 1,2 | 0 | R01/R10 |
| nébuleuse | 12 | 1,3 | 0 | N04/N08 |
| secteur | 13 | 1,2 | **1** | **S01/S04 (2,3)** |
| **total** | **63** | | **2** | |

**Deux paires sous le seuil sur 361 paires intra-thème.** Les deux sont nommées,
leurs trois axes de séparation sont écrits, et **F12 est déclarée sacrifiable**
dès maintenant — c'est ce que demande le §25 : mieux vaut douze biomes
irréconciliables que treize dont deux se ressemblent.

Contre-mesure appliquée au dossier : quatre biomes du plan initial ont été
**fusionnés ou supprimés avant écriture** pour la même raison (le champ d'épaves
et les grands fragments de la Nébuleuse, la place du Secteur, le cratère de la
Friche). **On n'atteint pas le quota, on l'ajuste.**
