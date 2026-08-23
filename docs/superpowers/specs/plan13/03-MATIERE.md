# Survivor LAN — la matière du sol

**Le lot 2.** Il tue trois des quatre causes de l'écart de gamme : la tuile
qu'on trouve, la grille posée par-dessus, le décor qui n'existe que s'il bloque.

Il vient **avant** la lumière : une lumière sur un sol pauvre ne donne rien.

---

## 1 — Deux échelles au lieu d'une

Le problème est arithmétique : 400 px répétés dans 1600 × 900, c'est
4 × 2,25 répétitions visibles **en même temps**. Aucune quantité de détail dans
la tuile ne rattrape ça — c'est la période qui se voit, pas le contenu.

Deux tuiles cuites, deux périodes premières entre elles :

| tuile | taille | contenu |
|---|---|---|
| **matière** | 400 (existante) | grain, gravier, rayures, joints |
| **macro** | 1 200 | plaques, marquages peints, grandes coulées, zones d'usure |

La macro se pose en second, très faible opacité, en `createPattern` comme la
première. Deux `fillRect` au lieu d'un. Le battement des deux périodes ne se
referme qu'à 1 200 px, et à cette échelle la vue n'en montre plus qu'un peu plus
d'une.

`cache` (`material.js`) prend une clef de plus. Rien d'autre ne change dans
`drawFloor()`.

**Palier `low`** : une seule échelle, la macro n'est pas cuite.

---

## 2 — La grille descend dans la matière

La 5 m devient un **joint de dalle** : `joint()` sait déjà poser une ombre et une
arête de lumière, c'est ce qu'il fait pour `usine`. La différence avec une ligne
tracée est entière — un joint a une épaisseur, un côté sombre et un côté clair,
donc il décrit une **surface** ; une ligne décrit un **plan technique**.

La 20 m reste **tracée**, très faible, comme repère de distance : c'est la seule
qui serve à lire une portée.

Contraintes :

- `GRID_FINE` reste exporté et vaut toujours 100 px : `drawGridPings()` (`fx.js`)
  trace sa maille locale avec, et c'est un effet de gameplay (l'onde de niveau).
- `decor.skip` (la grille trouée en cauchemar) porte sur la 20 m seule désormais.
  En cauchemar, la matière porte l'usure ; elle n'a pas besoin d'un trou en plus.

**Palier `low`** : les deux grilles tracées, comme aujourd'hui.

---

## 3 — `props.js`, le semis

Le décor n'existe aujourd'hui que s'il bloque. Ce module ajoute ce qui **ne
bloque pas** — et il le fait sans allouer.

### Le principe

Le motif est déjà dans le dépôt, dans `champ()` (`decor.js:186-260`) : **la
position d'un élément est une fonction de son indice et d'une graine**, donc rien
ne se garde entre deux images et deux clients voient la même chose.

Ici, on l'ancre à une **cellule monde** plutôt qu'à un indice global :

```
pour chaque cellule de 200 px visible :
  h = hash(cellX, cellY, biomeSeed)
  n = 0..3 props selon h
  chaque prop tire son type, sa rotation, son echelle et son alpha du meme h
```

Le semis est donc **infini, non répétitif et déterministe** : il ne se cache pas
en mémoire, il se recalcule, et il coûte un hash par cellule. Le culling est la
boucle elle-même — on n'itère que sur les cellules visibles.

### Le catalogue, pour Friche

**ABANDONED FACILITY** : gris froid, noir, ambre faible, débris, lumières
défectueuses.

| famille | exemples | émissif |
|---|---|---|
| **au sol, plat** | plaque d'égout, trappe, caillebotis, dalle fissurée, marquage peint effacé | non |
| **débris** | gravats, ferraille, panneau tombé, éclats de verre | non |
| **technique** | chemin de câbles, tuyau qui court, boîtier mural, coffret ouvert | **certains** |
| **lumière défectueuse** | tube au sol qui grésille, LED de coffret, voyant | **oui** |
| **traces** | flaque, coulure de rouille, brûlure, trace de traînage | non |

Un prop émissif déclare `{ x, y, r, col, hz }` — c'est **exactement** ce que
`lumiere.js` consommera au lot 3. Le catalogue est donc écrit une fois et sert
deux lots.

### Les règles

- **Rien qui se lise comme bloquant.** Tout est au sol, ou plaqué. Un prop qui
  ferait hésiter un joueur sur une trajectoire est un bug.
- **Rien sous un obstacle, rien sous un danger.** Le semis interroge
  `obstaclesActifs()` et `hazardsActifs()` et saute la cellule.
- **Contraste plafonné.** Un prop ne dépasse jamais le contraste du sol : c'est
  du décor, il perd toujours contre un télégraphe.
- **Densité par palier** : 0 en `low`, croissante ensuite.

**Où c'est dessiné** : `decor.js`, juste après `drawGrid()`, avant tout ce qui
est gameplay. Un seul chemin, sur `#cvUnder`.

---

## 4 — La palette d'arène glisse vers l'anthracite

Deux tables, rien d'autre.

| table | ce qui change |
|---|---|
| `DECOR[]` (`palette.js:43`) | `arena`, `gridFine`, `gridMajor` des trois modes glissent du bleu-indigo vers l'anthracite neutre |
| `BIOMES[].tint` / `.grid` (`biomes.js`) | `friche` quitte le vert `#0d1a0d` pour un gris froid ; le vert reste comme trace secondaire dans la tuile, il ne pilote plus |

`teinter()` et `refreshSol()` (`stage.js`) font déjà la composition
mode × biome — aucun code de mélange n'est à écrire.

**Ce qui ne bouge pas** : `UI_THEME`, `UI`, HUD, menus, cartes, `cssVars()`.
`palette.js` sépare délibérément la palette du JEU de celle de l'INTERFACE ; on
ne touche que la première.

**L'ambre cesse d'être uniquement un signal.** Aujourd'hui il n'existe qu'en
avertissement (`BIOME.hazard`, `SIGNAL.warn`). Il devient aussi une **matière**
(rouille, cuivre, coulure) et une **lumière** (lot 3). Les deux ne se confondent
pas : un signal est **saturé et animé**, une matière est **désaturée et fixe**.
C'est la règle qui empêche le décor de mentir.

---

## La liste d'architecture

`CLAUDE.md` place `decor.js` avant `material.js`, alors que `decor` importe
`material`. La liste est fausse. Ce lot la corrige et y insère `props.js` :

```
public/render/fx.js
public/render/material.js
public/render/props.js
public/render/decor.js
```

---

## Critères de sortie

1. Sur une vue pleine de Friche, à l'arrêt, **on ne trouve pas la tuile**.
2. `drawGridPings()` ping toujours sur la maille de 5 m.
3. Aucun prop sous un obstacle ni sous un danger.
4. `low` rend l'image d'aujourd'hui.
5. Le HUD, les menus et les cartes n'ont pas changé de couleur.
