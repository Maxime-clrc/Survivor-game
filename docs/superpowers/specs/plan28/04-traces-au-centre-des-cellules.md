# 04 · Les traces au sol suivent un réseau régulier, et deux n'ont pas de forme

## La mesure

Deux captures — la Friche et la Fonderie — montrent la même chose : des **ovales
lisses**, isolés, sans rapport avec ce qui les entoure, répartis à intervalle
régulier. C'est la couche de traces de `public/render/props.js`, et elle a deux
défauts indépendants.

### 4a · La position est quantifiée au centre de la cellule

```js
if (matieres && h2(cx, cy, s + 199) < TRACE_TAUX) {
  const mx = (cx + 0.5) * CELL, my = (cy + 0.5) * CELL;   // CELL = 200
  ...
}
```

`TRACE_TAUX = 0.66`. Une vue fait 1600 × 900, soit 8 × 4,5 cellules : **environ
24 traces par écran, toutes sur un réseau carré de 200 px**, c'est-à-dire de
10 m. Le semis de props, lui, tire une position libre dans la cellule
(`0.12 + h2(...) * 0.76`) — les traces sont donc la seule couche du sol dont la
grille se lit à l'œil, et elle se lit d'autant mieux que chaque marque est un
ovale centré.

Le commentaire du dépôt dit « Sonde au CENTRE de la cellule » : c'était vrai pour
**choisir le quartier** (une sonde au centre est stable), ce n'était pas censé
être le point de **dessin**. Les deux ont été confondus.

**Correction** : garder la sonde de quartier au centre — elle doit rester stable
et déterministe — et **déplacer le point de dessin** par un décalage tiré de la
même cellule, du même ordre que les props :

```js
const mq = sonder(mx, my, quartiers);
if (mq >= 0) {
  const t = matieres[mq % matieres.length];
  if (t) traces.push({ t, cx, cy,
                       x: (cx + 0.15 + h2(cx, cy, s + 201) * 0.70) * CELL,
                       y: (cy + 0.15 + h2(cx, cy, s + 202) * 0.70) * CELL, s });
}
```

Le contrat est intact : fonction pure de (cellule, graine), rien ne s'alloue,
tous les clients voient la même chose.

### 4b · Deux primitives sur six n'ont pas de forme

Six primitives sont écrites : `roulage`, `souillure`, `poussiere`, `cendres`,
`rayures`, `ruissellement`. Quatre disent quelque chose — deux traits parallèles,
un semis de points, des rayures, une coulée. Les deux entourées sur les captures
sont les deux autres :

| primitive | ce qui est dessiné | ce qu'on lit |
|---|---|---|
| `souillure` | une ellipse pleine (`r` = 16→36) + un halo radial de `1.9 r`, soit **jusqu'à 137 px de large** | un ovale sombre |
| `poussiere` | un dégradé radial découpé par un trapèze, mis à l'échelle | un ovale clair |

Elles sont **la plus grosse marque de chaque lieu** et la seule sans arête. Le
document de règles dit que ces six primitives sont « une grammaire et non un
catalogue » ; une grammaire dont deux mots sont des taches n'en est pas une.

**Correction, et c'est la seule décision de conception du lot.** Une flaque
d'huile et un film de poussière existent bien dans un atelier — ce n'est pas leur
sujet qui est faux, c'est qu'ils n'ont **ni bord ni direction**, les deux seules
choses qui font qu'une marque se lit comme une marque.

- `souillure` : garder le halo, remplacer l'ellipse par un contour **irrégulier**
  — quatre à six segments tirés de la cellule, refermés — et ajouter une **traînée**
  courte dans une direction tirée de la cellule, comme si ça avait coulé. Le bord
  net que le commentaire revendique déjà (« une flaque d'huile a un bord net »)
  n'existe pas dans le code : `alpha("#000000", 0.16)` sur une ellipse n'est pas
  un bord.
- `poussiere` : elle a déjà une arête (le trapèze, « le bord balayé »). Ce qui la
  fait lire comme un rond est que le dégradé est **radial** et déborde de son
  trapèze de tous les côtés. Le dégradé doit être **linéaire**, aligné sur l'arête
  balayée : la marque devient un coup de balai, pas une auréole.

Aucune des deux ne change de taille : c'est la forme qui manque, pas l'échelle.
Un ovale plus petit reste un ovale.

### 4c · Ce que ce lot ne corrige pas, et pourquoi c'est correct

Le semis de **props** (les objets : moules, lingots, brousse) est composé par
quartiers depuis plan 26 § 7a, et `verifierZones()` croise les deux tables dans
les deux sens. Il tire une position libre dans la cellule et suit l'architecture.
Ce n'est **pas** ce que les captures montrent d'entouré — les cercles rouges des
deux images portent sur des marques de sol, pas sur des objets.

Le seul reproche qui vaut aussi pour les props est la **corrélation locale** :
`plan26/07` § 3 prévoyait des grappes (« un prop de maintenance attire… ») et ce
point n'a pas été livré. Il n'entre pas dans ce plan-ci : c'est de la composition,
pas un défaut.

## Vérification

`BANC=1 BIOME=fonderie GRAINE=7 npm start`, puis `?banc`. Trois questions :

1. **La grille est-elle partie ?** Se placer immobile et regarder le sol : aucun
   alignement de marques à 200 px ne doit se lire. Répéter en Friche, le lieu où
   la trace est la plus claire sur fond sombre.
2. **Une marque se lit-elle comme une marque ?** Sur une capture fixe, chaque
   souillure doit avoir un bord identifiable et une direction.
3. `verifierTraces()` reste muet : au moins deux matières par lieu, aucune
   primitive orpheline.

Et le contrôle qui compte autant que les trois : **`GRAINE=7` deux fois de suite
doit donner exactement le même sol.** Un décalage tiré ailleurs que de la cellule
casserait ça sans rien lever.
