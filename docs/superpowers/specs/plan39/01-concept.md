# C — NOUVELLE ARCHITECTURE DE BIOMES · H — LES FAMILLES DE COMPOSITION

---

## C.1 — La hiérarchie

```
CARTE          arene 14400 x 8100, 81 vues de 1600 x 900
 └ THEME       5. Ce qui ne change JAMAIS dans une partie.
    │          charte (BIOME_SKIN), direction de lumiere, grille de 20 m,
    │          arriere-plan, ambiante, meteo, echelle des dangers.
    │
    └ BIOME    12 a 13 par theme. L UNITE DE RECONNAISSANCE.
       │       vocabulaire bati (2 a 4 familles), traitement de sol, TRAME,
       │       catalogue de props, amer, matieres de trace, profil emissif.
       │
       └ TRAME              1 par REGION, ancree au MONDE.
          │                 la structure a l echelle du quartier : ce qui se
          │                 reconnait de loin et ce qui traverse plusieurs vues.
          │
          └ ARRANGEMENT     2 a 4 par biome, tire PAR CELLULE.
             │              la loi d implantation actuelle, reduite : elle ne
             │              porte plus la composition, elle la GARNIT.
             │
             └ BLOCS        obstacles. collision, navigation, apparition.
                │
                └ PROPS     semis par cellule de 200 px, par quartier.
                   │
                   └ TRACES ce qui a marque le sol. une par cellule.
```

**Ce qui change par rapport au dépôt** tient en trois lignes :

| | aujourd'hui | proposé |
|---|---|---|
| unité de reconnaissance | la **loi d'implantation** (un rangement) | le **BIOME** (un vocabulaire) |
| plus grand objet du monde | 504 px (travée) | **la TRAME**, 3 000 à 6 000 px |
| ce qu'une région possède en propre | densité, calibre, 2 zones de props | familles bâties, sol, trame, amer, props |

---

## C.2 — LA TRAME — la couche qui manque

> **Rien dans le dépôt n'a la taille d'un écran.** C'est la cause racine de
> l'audit : sans objet plus grand que la vue, il ne peut y avoir ni silhouette,
> ni architecture, ni ligne de circulation, ni composition qui survive à la
> traversée.

### Définition

Une **trame** est un jeu d'obstacles **ancrés au monde**, généré une fois par
région à partir de `(graine, index de quartier, biome)`, en coordonnées de
**quartier** et non de cellule. Elle sort de `buildBiome` dans le **même tableau
`obstacles`** que le reste : collision, navigation, apparition, dépôt de loot et
séparation la voient sans une ligne de code en plus, et elle ne circule pas sur
le réseau (les deux côtés la rejouent sur la graine, comme `couleeDe`).

Un quartier fait 12 à 20 cellules, soit **3,5 à 4,5 vues de côté**. C'est la
bonne échelle : assez grand pour qu'on le traverse, assez petit pour qu'on en
voie un morceau d'un coup.

### La liste fermée — six primitives, pas un catalogue

Même discipline que `shared/director.js` : une liste fermée, un coût déduit, un
validateur qui compare. Chaque primitive déclare ses ouvertures.

| primitive | forme | ce qu'elle dit | gameplay |
|---|---|---|---|
| **RUBAN** | une ligne continue qui traverse le quartier, épaisseur 40 à 90 px, brèches régulières | « quelque chose passe ici » — rail, convoyeur maître, mur, conduite, passerelle, caniveau | coupe les lignes de tir sur un axe, force le kite le long ou à travers ; les brèches sont des points de rendez-vous |
| **NEF** | deux rubans parallèles écartés de 1 à 2 vues, fermés à un bout | « on est **dedans** » — halle, tunnel, dock couvert, galerie | combat en couloir large, la horde arrive par les deux bouts, les murs sont un dos |
| **PEIGNE** | une échine plus 4 à 9 dents perpendiculaires régulières | « on range ici » — racks, quais, étals, alvéoles, box | le plus fort effet spatial du jeu : autant de culs-de-sac courts que de dents, donc du kite en zigzag |
| **COURONNE** | un anneau de masse autour d'un centre vide, ou l'inverse | « il y a quelque chose au milieu » — cuve, cratère, place, réacteur, rond-point | on tourne autour ; la horde arrive toujours d'un côté qu'on ne regarde pas |
| **CRIBLE** | un réseau régulier de masses de même gabarit, avec 2 à 4 cases manquantes | « c'est stocké » — parc à cuves, tas de minerai, containers, modules | lignes de vue par allées orthogonales seulement, très fort sur les armes perforantes |
| **FAILLE** | une **absence** linéaire : bord franc des deux côtés, franchissable par des points nommés | « il manque du sol » — tranchée, canal, fosse, fissure, saignée | le seul obstacle qui ne bloque pas les projectiles ; sépare sans cacher |

**FAILLE demande une primitive nouvelle au rendu** : le dépôt ne sait dessiner
que du plein. C'est le seul asset structurellement neuf de la liste, et c'est
lui qui débloque le cratère, le puits, la fosse de coulée, le canal du Secteur
et la brèche de la Nébuleuse — cinq régions dont le NOM promet un trou depuis le
début.

### Ce qu'une trame déclare

```js
{ type: RUBAN, axe: "x", n: 2, ecart: 0.34, ep: 62, kind: B_RAIL,
  brecheTous: 2, brecheLarge: 260 }
```

- `type` — l'une des six.
- l'**axe** ou le **centre**, en fraction de quartier.
- `n`, `ecart`, `ep` — le nombre, l'écartement, l'épaisseur.
- `kind` — la famille bâtie employée, donc le dessin.
- **les ouvertures**, obligatoires et déclarées : `brecheTous` (en cellules),
  `brecheLarge` (en pixels).

### Les invariants de la trame — non négociables

1. **`brecheLarge >= 3 x NAV_CFG.PASSAGE_MIN`**, soit 240 px. Une brèche de
   80 px est un goulot ; le §15 du cahier des charges l'interdit et la mesure de
   `navigation.js` le confirme (« au pire calage, une fente de 160 px est
   contestée en 4,2 s »).
2. **`brecheTous <= 3` cellules**, soit une ouverture tous les 4 800 px au plus.
3. **Aucune primitive ne ferme une boucle** : une COURONNE a au moins quatre
   ouvertures réparties sur les quatre quadrants.
4. **La trame ne franchit pas la frontière de son quartier** — sinon deux trames
   voisines se traversent et la frontière devient un tas.
5. **Budget de surface séparé** : `TRAME_SURFACE_MAX = 0.045`, la table par
   cellule descendant de `0.10` à `0.055`. Le total ne bouge pas, donc l'espace
   jouable non plus — **ce qu'on ajoute en structure, on le retire en semis de
   blocs**, et c'est exactement le bon échange : moins d'objets moyens
   interchangeables, plus de structure qui se lit.
6. **`verifierTrame()`** rejoue, sur 40 graines × 5 thèmes × 3 modes, la
   connexité de la grille de navigation **sur l'arène entière** (inondation
   depuis un coin, on exige 100 % des cases libres atteintes) et le nombre de
   cases dans le plus gros cul-de-sac (plafond : la surface d'une dent de
   PEIGNE). Le vérificateur actuel (`celluleTraversable`) ne teste que le carré
   central d'**une** cellule — il ne peut rien dire d'une structure de quartier.

### Ce que la trame rend gratuitement

- **la silhouette** (niveau 1) — une nef ou un peigne se reconnaît à 2 000 px ;
- **l'architecture** (niveau 2) — c'est sa définition ;
- **la composition** (niveau 4) — la disposition cesse d'être périodique à
  2 vues, puisque la structure dominante est unique par quartier ;
- **les lignes de circulation** — les brèches et les allées sont des chemins
  nommés, donc des points de rendez-vous en multijoueur ;
- **le quartier de props** — `sonder()` lit déjà la distance au bloc le plus
  proche et rend son quartier. Une trame étant faite d'obstacles, **le semis la
  suit sans une ligne de plus** : les props de quai naissent le long des quais.

---

## C.3 — Le vocabulaire bâti devient une propriété du BIOME

### La règle qui saute

`docs/regles/RENDU.md` : *« une ruine de Friche doit être la même partout —
c'est le VOCABULAIRE du lieu »*. Elle était juste quand une carte portait cinq
thèmes. Elle est **remplacée** :

> **LA CHARTE APPARTIENT AU THÈME, LE VOCABULAIRE APPARTIENT AU BIOME.**
> Charte = `amb`, `k`, `dir`, `emis`, grille de 20 m, arrière-plan, météo.
> Vocabulaire = les familles bâties, le traitement de sol, les props, l'amer.

Une ruine de Friche reste **éclairée** pareil partout, et c'est ce qui tenait
l'arène ensemble. Elle n'a aucune raison d'avoir la même **forme** dans une
casse automobile et dans un entrepôt effondré.

### La règle de vocabulaire — mesurable

Pour deux biomes `a` et `b` d'un même thème :

1. **Chacun a au moins une famille bâtie que personne d'autre du thème n'emploie**
   — c'est sa **SIGNATURE**. Sans elle, il n'existe pas.
2. **Jaccard(familles(a), familles(b)) <= 0,50.** Aujourd'hui : 1,00 partout.
3. **Jaccard(props(a), props(b)) <= 0,55.** Aujourd'hui : quatre paires à 1,00.
4. **Deux biomes ne partagent pas (type de trame, famille dominante).**
5. **Le traitement de sol diffère**, ou alors deux des trois autres axes doivent
   diverger franchement.

`verifierSignature()` — le vérificateur qui manque, et le seul du dépôt qui
**comparera deux biomes entre eux** au lieu de croiser deux tables.

### Le test du screenshot, en critère rejouable

Le §19 du cahier des charges devient un nombre : un biome est **identifiable**
si, sur une vue tirée au hasard dans sa région, on trouve au moins **trois**
éléments de son vocabulaire propre — une pièce de trame, une famille bâtie
signature, un prop signature, le traitement de sol, ou l'amer. `verifierVue()`
balaie les 81 vues et exige que **90 % des vues d'une région** en portent trois.

---

## C.4 — MUTUALISATION : silhouette × habillage × échelle

Le §16 du cahier des charges demande de la variété sans 500 assets. La réponse
est de **casser le couple 1:1** de `BLOC[lieu][kind] = { forme, habit }`.

Aujourd'hui : 15 familles = 15 formes = 15 habillages. Un container n'existe
qu'une fois, dans le Secteur.

Proposé : **une famille bâtie = (silhouette, habillage, gabarit, contour)**.

```
SILHOUETTES (~16)          HABILLAGES (~11)             = familles
caisson                    tole peinte                    silhouette x habillage
octogone                   tole rouillee                  reste une entree de
barre a taquets            beton                          table, mais la table
peigne (echine + dents)    beton lave / eclate            ne coute plus deux
cadre ouvert               composite blanc                dessins.
fut / cylindre             fonte noircie
pile (empilement)          verre + enseigne
chassis (vehicule)         grillage / claire-voie
voute / arceau             maconnerie
pan brise                  glace / givre
mat                        goudron / bitume
dalle                      trame perforee
gradin
poutre treillis
cuve a jupe
nappe (faille)
```

**Un conteneur** devient : `caisson x tole peinte` à l'Usine (neuf, empilé),
`caisson x tole rouillee` à la Friche (éventré), `caisson x verre+enseigne` au
Secteur (converti en boutique). **Trois biomes, trois lectures, un dessin de
silhouette et trois habillages** — dont deux existent déjà.

Le même raisonnement vaut pour le sol (§G) : **base de thème × traitement de
biome**, une dizaine de traitements partagés.

**Gain mesuré sur la proposition complète** : 63 biomes demandent ~48 familles
bâties, obtenues avec **16 silhouettes et 11 habillages** — 27 dessins, contre
48 si le couple restait 1:1, et 15 aujourd'hui. Le surcoût réel est de
**12 dessins**, pas de 33.

---

## C.5 — Le sol devient une propriété de la région

**Changement le plus rentable du dossier, et le plus petit.**

`floorPattern(ctx, biomeIndex, diffIndex, seed, dpr)` n'a **pas** d'argument de
région. Le sol est la plus grande surface de l'écran et il est constant sur
14 400 × 8 100 px.

```js
floorPattern(ctx, biomeIndex, diffIndex, seed, dpr, loi)   // + un argument
TUILE[cle]                    ->  TUILE[cle](g, rand, usure, traitement)
CACHE_MAX = 5                 ->  8   // une vue chevauche au plus 4 cellules
```

Le sol se peint **déjà par cellule** (`drawFloor`) : la couture existe, elle est
juste peinte avec le même motif des deux côtés. Il n'y a **rien à écrire côté
dessin**, seulement à donner un argument de plus à la cuisson.

Les traitements (§G) sont une liste fermée d'une dizaine d'entrées, appliquées
par-dessus la recette de thème avec la palette du thème.

---

## C.6 — L'amer devient un repère de région

Aujourd'hui : **un** amer par arène de 81 vues, visible dans 4 vues sur 81
(mesure `LISEZMOI`). Un repère unique ne repère rien.

Proposé : **un amer par quartier**, donc 3 à 6 par arène, tiré dans les poses de
son quartier, dessiné selon **le biome** de ce quartier. `AMERS[cle]` devient
`AMER[biome]` — cinq dessins existent déjà et se redistribuent, un par biome
principal. Les biomes secondaires partagent l'amer de leur famille, avec le
paramètre d'échelle du biome.

Contraintes conservées : plaque au sol, aucun collider, **sous** la grille de
20 m, pas de lumière, garde contre les dangers (`verifierAmers`).

---

## C.7 — Casser la périodicité de deux vues

Trois corrections, par ordre de coût :

1. **La trame** rend la périodicité de cellule beaucoup moins lisible : la
   structure dominante d'un quartier n'est plus périodique du tout.
2. **`my = (cx·2 + cy) & 1` vaut `cy & 1`.** Bug silencieux : deux miroirs pour
   le prix d'un. `my = (cx + cy·3) & 1` — ou mieux, un hachage
   `h2(cx, cy, seed)` à deux bits — porte la période à 4 cellules et **quadruple
   les arrangements distincts (16 → 64)** pour un opérateur.
   *Attention : ce changement déplace toutes les arènes déjà mesurées. Il se
   livre avec sa remesure, pas dans le même lot qu'un équilibrage.*
3. **Le tremblement `jMax` cesse d'être réservé à la Friche.** Il est déjà par
   cellule, déjà gardé contre les dangers (`cellePosePerturbe`). Une amplitude
   par biome (0 à 40 px) est une ligne de table.

---

## H — LES FAMILLES DE COMPOSITION

La composition d'une région se lit à **deux échelles**, et la faute du dépôt est
de n'en avoir qu'une.

### H.1 — Échelle de quartier : la TRAME (six primitives, §C.2)

Elle dit **ce qui structure l'espace**. C'est ce qu'on reconnaît de loin.

### H.2 — Échelle de cellule : l'ARRANGEMENT

Il dit **comment on garnit entre les structures**. Neuf lois, et elles
s'appliquent à tous les thèmes — ce sont des lois d'occupation, pas des décors.

| loi | forme | densité | ce qu'elle fait au combat |
|---|---|---|---|
| `AXE` | tout aligné sur une bande, le reste nu | moyenne | on longe, on tire long sur l'axe |
| `CROIX` | deux bandes franches, quatre îlots | moyenne | on traverse en croix, la horde se coupe |
| `SEMIS` | beaucoup de petit, réparti | forte | on tire court, on ne voit jamais loin |
| `POURTOUR` | dense aux bords, vide au centre | moyenne | on tient le milieu, dos à rien |
| `NOYAU` | une masse au centre, pourtour libre | faible | on tourne autour, angles morts |
| `DEGAGEMENT` | presque vide, deux masses aux bords | très faible | la respiration, on traverse droit |
| `ECHELON` | quinconce à écart ≥ 2 × `PASSAGE_MIN` | moyenne | zigzag, jamais de ligne droite longue |
| `ASYMETRIE` | tout d'un côté, l'autre nu | moyenne | le miroir de cellule la fait alterner |
| `CONTRASTE` | gabarits très inégaux, groupés | forte | la seule où la taille des masses varie |

**Un biome déclare 2 à 4 arrangements**, jamais les neuf : c'est ce qui empêche
deux biomes d'un même thème d'être « le même semis avec d'autres objets ».
Les quatre lois actuelles de chaque thème se répartissent dans ces neuf
(chaîne = `AXE`, carrefour = `CROIX`, atelier = `SEMIS`, dégagement =
`DEGAGEMENT`, cratère = `POURTOUR`, puits = `NOYAU`, refroidissement =
`ECHELON`, brèche = `ASYMETRIE`, effondrement = `CONTRASTE`) — **elles ne sont
pas perdues, elles descendent d'un cran.**

### H.3 — Pourquoi deux échelles et pas une

Le cahier des charges le dit au §13 : *« un biome ne devient pas réellement
différent parce que ses mêmes machines sont organisées en U »*. Exact — et c'est
pour ça que l'arrangement seul (ce que fait le dépôt) échoue.

Mais l'inverse est vrai aussi : une trame seule donnerait cinq quartiers à la
structure forte et au remplissage identique. **La combinaison est ce qui
compte** : `(trame, vocabulaire, sol) x arrangement`. Le premier terme fait la
reconnaissance, le second fait la rejouabilité.

Nombre de compositions distinctes atteignables par thème :
`12 biomes × 2 à 4 arrangements × 4 miroirs` = **96 à 192 vues distinctes**,
contre 16 aujourd'hui. Et une carte n'en montre que 3 à 6 régions, donc la
carte suivante ne ressemble pas à la précédente.
