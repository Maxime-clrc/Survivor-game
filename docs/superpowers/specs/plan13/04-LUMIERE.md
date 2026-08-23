# Survivor LAN — la lumière

**Le lot 3. Le lot qui change de catégorie.**

Il n'y a aujourd'hui **aucune lumière** dans le jeu : tout est éclairé à plat,
seul le vignettage module. C'est la cause n°1 de l'écart de gamme, et c'est aussi
la moins chère à corriger.

---

## L'idée, en une phrase

> **Une passe de lumière composée en `multiply` sur `#cvUnder` seul assombrit le
> décor et ne touche AUCUN élément de gameplay.**

Pas par réglage d'opacité — **par construction**. La pile de canvas sépare déjà
sol / entités / effets ; un `multiply` posé sur le canvas du bas ne peut
physiquement pas atteindre un ennemi, un projectile ou le boss.

C'est ce qui rend le §14 du brief (hiérarchie de lisibilité, décor moins
contrasté que le gameplay) **gratuit et non négociable** au lieu d'être un
équilibrage permanent.

---

## Le tampon

Un canvas 2D hors écran, à **1/4 de la vue** — 400 × 225.

```
1. remplir de l'AMBIANTE du biome (une couleur, pas noir)
2. ajouter chaque source en `lighter`, gradient radial
3. drawImage mis a l'echelle sur #cvUnder, en `multiply`
4. seconde passe `lighter` a tres faible opacite pour le halo emissif
```

Le sur-échantillonnage bilinéaire du `drawImage` donne la douceur **gratuitement** :
c'est précisément pour ça que le tampon est petit. Une lumière douce à pleine
résolution coûterait un flou ; ici elle coûte un agrandissement.

| palier | résolution du tampon |
|---|---|
| `low` / `medium` | pas de tampon |
| `high` | 1/4 |
| `ultra` | 1/2 |

**Coût attendu** : un remplissage 400 × 225, N gradients radiaux, un
`drawImage`. Sous 1 ms. Zéro WebGL, zéro shader, zéro framebuffer.

---

## Les deux passes

Une seule passe ne suffit pas, et c'est la raison pour laquelle le résultat
ressemble à de la lumière plutôt qu'à un assombrissement :

| passe | mélange | ce qu'elle fait |
|---|---|---|
| **1** | `multiply` | l'ombre — le sol loin de toute source **descend** |
| **2** | `lighter` | l'émission — le sol près d'une source **monte** |

La passe 1 seule fait un jeu plus sombre. La passe 2 seule fait un jeu délavé.
Les deux ensemble font de la **matière éclairée**.

L'ambiante n'est jamais noire : un sol à zéro n'est plus une matière, c'est un
trou. Elle est la couleur du biome à ~55-70 %.

---

## Les sources

**Toutes LUES, aucune poussée.** Écrire vers une couche supérieure est interdit
par la règle des couches, et rien ici n'y oblige : chaque source existe déjà
quelque part, il suffit de la lire en descendant.

| source | d'où | forme |
|---|---|---|
| **dangers** | `hazardsActifs()` + `hazardState(h, t)` — déjà partagé simulation ↔ rendu | ambre, intensité = `st.k` |
| **props émissifs** | `props.js`, qui déclare `{ x, y, r, col, hz }` | ambre faible, grésillement par `hz` |
| **souffles** | lecture de `bursts` / `blastMarks` exportés par `fx.js` | chaud, très bref, forte amplitude |
| **joueurs** | `v.playerList` | halo faible dans la couleur du joueur |
| **boss** | `v.boss` | aura, pilotée au lot 6 |

`hazardState()` est un point de passage unique déjà en place : la lumière d'un
geyser **est** son état, on ne recalcule rien et on ne peut pas désynchroniser.

**Ce qui n'est PAS une source** : les projectiles. Il y en a des centaines par
seconde à la minute 25 ; en faire des sources ferait clignoter le sol au rythme
de la cadence de tir. Le §16 du brief tranche : un effet doit avoir une fonction
artistique. Un stroboscope n'en a pas.

---

## Le point d'insertion

Dans `drawWorld()` (`render/world.js`), **juste après `drawFloor()`,
`drawGrid()` et les props** — donc avant `drawBlastMarks`, `drawHazards`,
`drawZones`, `drawObstacles`, `drawMarks`.

```
setCtx(underCtx);
drawFloor();
drawGrid();
drawProps();
drawLumiere(v);      <-- ici, une ligne
drawBlastMarks();
…
```

Conséquence directe : **aucun télégraphe, aucune zone, aucun marqueur, aucun
danger n'est jamais assombri** — ils se dessinent après. C'est la même règle que
`voileBrume()` s'impose déjà (« *ce que ça masque : la HORDE. Jamais un
télégraphe* »), obtenue ici par l'ordre de dessin au lieu d'une condition.

L'ordre de dessin existant n'est pas réorganisé. Une ligne insérée.

---

## Les obstacles

Ils sont dessinés **après** la passe, donc non assombris. C'est voulu : un
obstacle est une information de navigation, il doit rester lisible.

Leur intégration à la lumière passe par le lot 4 (`LUM_DIR`, ombre portée
cohérente) — pas par le tampon. Un obstacle **projette** de l'ombre ; il n'en
**reçoit** pas.

---

## La couche

`lumiere.js` importe `stage` (caméra, biome), `fx` (les souffles) et `props`.
Il est importé par `decor`. Ordre :

```
stage < interp < fx < material < props < lumiere < decor < actors
```

Aucun cycle, aucune écriture montante, aucun setter à ajouter.

---

## Critères de sortie

1. Un télégraphe de boss est **exactement** aussi lisible qu'avant, mesuré sur
   capture.
2. Le coût est relevé avec `?perf` et tient sous 1 ms à `high`.
3. `low` et `medium` rendent l'image du lot 2, sans tampon alloué.
4. Un geyser éclaire pendant qu'il monte et s'éteint avec lui — sans horloge
   propre, en lisant `hazardState()`.
5. À la minute 25, en cauchemar, avec 200 ennemis : la horde reste plus
   contrastée que le sol. Vérifié en jeu, pas sur une vue vide.
