# Survivor LAN — ce que le rendu de map fait aujourd'hui

Relevé sur le dépôt, pas supposé. Ce fichier n'est pas un chantier : c'est la
mesure de départ des six autres.

---

## La pile

Trois canvas empilés dans `#arena` (`public/index.html:37-41`,
`public/css/ui.css:32-49`), imposés par la bascule WebGL :

| canvas | contenu | techno |
|---|---|---|
| `#cvUnder` | sol, grille, zones, télégraphes, obstacles, dangers, marqueurs | 2D |
| `#cvGl` | ennemis, joueurs, dépouilles, particules | WebGL2 |
| `#cv` | boss, drones, projectiles, anneaux, barres, vignettage | 2D |

`ctx` bascule une seule fois par image, dans `drawWorld()`
(`public/render/world.js`), juste après les monstres.

**C'est le fait le plus important du plan.** La pile sépare déjà sol / entités /
effets, donc une passe posée sur `#cvUnder` ne peut pas atteindre un élément de
gameplay. La hiérarchie de lisibilité est structurelle, pas réglée.

---

## Le sol

`public/render/material.js`, 182 lignes.

**UNE** tuile 400×400 cuite par `(biome, mode, graine, densité)`, mise en cache,
posée en `createPattern("repeat")` sur le rectangle de vue par `drawFloor()`.

Trois recettes :

| biome | ce que la tuile porte |
|---|---|
| `usine` | joints de dalle (ombre + arête de lumière), 16 boulons, 90 rayures fines, taches de rouille selon l'usure |
| `fonderie` | dalles décalées d'une rangée sur deux, 7 taches sombres, coulées orange serpentines |
| `friche` | 9 câbles serpentins, 260 graviers, taches de lichen et taches sombres |

`poser()` gère le repli aux bords pour que le motif se raccorde. `USURE` module
tout par difficulté (0 / 0,45 / 1).

**Le défaut** : 400 px répétés dans une vue de 1600×900, c'est 4 × 2,25
répétitions **visibles simultanément**. L'œil trouve la tuile en deux secondes.
Une seule échelle de matière, aucune variation à l'échelle de l'arène.

---

## La grille

`drawGrid()` (`public/render/decor.js`) trace 5 m (`GRID_FINE = 100 px`) et 20 m
(`GRID_MAJOR = 400 px`) **par-dessus** la matière, sur l'arène entière, en lignes
de 1 px. `decor.skip` en saute certaines en cauchemar.

**C'est le marqueur « prototype » n°1.** Des lignes posées sur la matière au lieu
de joints présents *dans* la matière. `joint()` dans `material.js` sait déjà
faire l'inverse — ombre + arête de lumière — pour les dalles.

Contrainte : `drawGridPings()` (ondes de niveau, `fx.js`) lit `GRID_FINE` pour
tracer sa maille locale. La 5 m ne peut pas disparaître de la géométrie, seulement
de la manière dont elle est rendue.

---

## Le relief

`drawObstacles()` (`public/render/decor.js:107-180`) dessine un obstacle
**quatre fois** :

1. ombre décalée en dur de `(OBST_OMBRE × 0.6, OBST_OMBRE × 0.7)`, noir 34 %
2. corps extrudé d'un vecteur **radial** depuis le centre de l'écran (`OBST_RELIEF = 7`)
3. face au sol, remplissage à 55 % + arête
4. arête du dessus, et un contour tireté si la couverture est destructible

Il y a donc **déjà une pseudo-3D, et elle est juste** : le radial, c'est la
**caméra** (un objet loin du centre montre son flanc) ; le décalage constant,
c'est la **lumière**. Les deux sont corrects et coexistent. La lumière est
seulement codée en dur, une seule fois, et rien d'autre dans le jeu ne la
partage.

---

## L'atmosphère

`champ()` (`public/render/decor.js:186-260`) — un champ de particules **sans
particules** : la position d'un brin est une fonction de son indice et du temps,
donc rien ne s'alloue, rien ne se garde entre deux images, et deux clients voient
la même chose. **Un seul `stroke` pour tout le champ.**

Sert deux météos : bourrasque (brins longs, angle et force variables) et cendres
(brins courts, chute lente). Ancré au **monde**, pas à la caméra.

`voileBrume()` (`public/render/stage.js`) est un champ de vision, pas une teinte :
décroissance en carré, masque la horde et **jamais** un télégraphe.

C'est la mécanique la plus réutilisable du dépôt pour tout le lot 5 : vapeur,
poussière, étincelles s'écrivent avec, sans une allocation de plus.

---

## Le vignettage

`drawVignette()` — un gradient radial recuit à la demande, amplitude et distance
de départ par difficulté (`DECOR[].vignette`, `.vignetteFrom`), pulsation en
cauchemar, renforcé sous la brume. C'est **le seul modulateur de luminosité de
tout le jeu**.

---

## WebGL

`public/gl.js`, 311 lignes. Batcher de quads écrit à la main, WebGL2, sans
bibliothèque.

- un shader, un atlas, deux modes de mélange (normal, additif)
- alpha prémultiplié, éclair en attribut de sommet (`aFx`), couleur d'éclair comprise
- **2 appels de dessin par image** pour 220 ennemis + 3 000 particules
  (`LISEZMOI.md`, section « Rendu WebGL »)

**Pas de framebuffer. Pas de second shader. Pas de post-traitement.** Une seule
unité de texture utilisée. Tout ajout d'effet plein écran par cette voie demande
d'ouvrir un FBO — c'est le seul geste vraiment intrusif du plan, et il est
repoussé au lot 7 optionnel.

---

## La palette

`shared/palette.js` sépare volontairement deux palettes :

| table | portée |
|---|---|
| `SURFACE`, `DECOR`, `BIOME`, `ZONE`, `COMBAT`, `ENEMY` | le **JEU** — indigo froid |
| `UI_THEME`, `UI` | l'**INTERFACE hors partie** — graphite chaud |

Valeurs d'arène : `SURFACE.arena #0f1219`, teintes de biome `usine #0b1626`
(bleu froid), `fonderie #1e1010` (brun rouge), `friche #0d1a0d` (vert).

**L'ambre existe, mais seulement en signal** : `BIOME.hazard #e8912f`,
`SIGNAL.warn #f5a524`, `COMBAT.bullet #f4d35e`. Il n'est jamais une **matière**
ni une **lumière**, uniquement un avertissement.

L'arène est donc **indigo, pas anthracite**. C'est un écart entre la direction
décrite et ce que le code fait — tranché dans le README : on décale `DECOR[]` et
`BIOMES[].tint`, on ne touche pas `UI_THEME`.

---

## Le décor

`shared/biomes.js` : 2 à 7 rectangles par biome, tous **dérivés des collisions**.
Aucun objet non-bloquant, aucun élément purement visuel. Miroir par cellule
(`mx`, `my`) et gigue de 40 px en friche pour éviter la grille parfaite, plafond
de surface à 10 %.

Le décor ne raconte donc rien : il n'existe que ce qui bloque.

---

## Les quatre causes de l'écart de gamme

Dans l'ordre du gain par unité de travail.

| # | cause | où | lot |
|---|---|---|---|
| **1** | **Aucune lumière.** Zéro. Tout est éclairé à plat, seul le vignettage module. | tout le rendu | 3 |
| **2** | **Une seule échelle de matière.** 4 × 2,25 répétitions visibles à la fois. | `material.js` | 2 |
| **3** | **La grille est tracée par-dessus**, au lieu d'être un joint dans la matière. | `decor.js` | 2 |
| **4** | **Le décor n'existe que s'il bloque.** Aucun prop, aucun marquage, aucun câble. | `biomes.js` | 2 |

**1 est de loin le plus gros**, et c'est aussi le moins intrusif : une passe
`multiply` sur le canvas du bas, une ligne insérée dans `drawWorld()`.
