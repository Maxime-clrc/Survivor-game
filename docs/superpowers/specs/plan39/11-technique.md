# K — IMPACT TECHNIQUE

**Audit du dépôt en `0.42.1`.** Ce qui suit est ce qu'il faut toucher, dans
quel ordre, et **les cinq pièges qui ne lèveraient rien**.

---

## K.0 — Le réseau ne bouge pas d'un octet

C'est la première chose à établir, parce qu'elle décide du risque.

| donnée | circule ? | pourquoi |
|---|---|---|
| `BIOMES[]` (5 thèmes) | **oui**, par index | inchangé — le dossier n'ajoute aucun thème |
| `lois[]` (la région de chaque cellule) | **non** | `buildBiome` est déterministe, les deux côtés le rejouent sur la graine |
| `districts[]` | **non** | idem |
| `BLOCS[].kind` | **non** | « il ne circule PAS sur le réseau et la simulation ne le lit jamais » — le commentaire est dans `biomes.js` |
| la TRAME | **non** | elle sort dans `obstacles`, qui est déjà régénéré des deux côtés |

**Aucun champ d'instantané n'est ajouté, déplacé ni retiré.** `BLOCS` reste
append-only et gagne ~35 entrées à la fin. `BIOMES` ne bouge pas.

---

## K.1 — Les cinq pièges qui ne lèveraient rien

### 1. `verifierEmpreinte()` contre les silhouettes ouvertes

`blocs.js:423` mesure le vide **à l'intérieur de l'AABB** d'une silhouette et
refuse au-delà de `EMPREINTE_SEUIL = 0.10`. La règle est juste : « elle remplit
son rectangle : la collision est une AABB, une forme qui rentre ses coins fait
buter sur du vide ».

Trois des neuf formes nouvelles la violeraient :

| silhouette | verdict | résolution |
|---|---|---|
| `cadre` | **passe**, à une condition | un `cadre` n'est **jamais** habillé d'un vide : il porte toujours `verre` ou `claire_voie`, donc son intérieur est peint. C'est une **règle de table**, à écrire dans `verifierBlocs()` : `sil === CADRE` implique `hab ∈ {verre_enseigne, claire_voie, composite_blanc}` |
| `nappe` | **passe** | une faille est peinte bord à bord (surface sombre, eau, effluent). Elle remplit son rectangle ; c'est le sol qui manque, pas le dessin |
| `oblique` | **ÉCHOUE, et c'est correct** | une masse oblique ne remplit pas son AABB. **`oblique` n'est donc pas une silhouette : c'est un macro de pose** qui émet 3 à 5 blocs AABB en escalier, chacun remplissant le sien. Zéro changement de collision, zéro exception au vérificateur |

`oblique` disparaît donc de la liste des silhouettes et devient une entrée de
`poser` : `{ oblique: true, x0, y0, x1, y1, ep, kind }` développée par
`buildBiome` en une chaîne de rectangles. C'est la seule solution qui ne touche
ni `_obstacleBlock`, ni `construireNav`, ni `segmentCoupe`.

### 2. `signatureVariante()` : le plafond n'a plus de sens

`LOI_ECART = 0.40` est **à la fois** le seuil qui déclare deux LIEUX distincts et
le plafond au-delà duquel une variante « n'est plus une variante ». Avec quatre
lois par thème, ça tenait. Avec treize, **une NEF et un DEGAGEMENT du même thème
franchiront ce plafond**, et le vérificateur rougira sur une conception juste.

Correction : **le plafond se mesure contre l'ENVELOPPE DU THÈME, pas contre la
loi 0.** On calcule le centroïde des treize signatures et on exige que chacune
reste plus proche de son propre centroïde que de celui des quatre autres thèmes
(même forme que `verifierAccents`, qui a déjà cette idée d'**appartenance**
plutôt que de nombre en dur).

Et **le plancher de `signatureVariante` cesse d'être le garde-fou principal** :
deux biomes peuvent désormais partager une géométrie proche s'ils diffèrent par
le vocabulaire, le sol et la trame. Le garde-fou passe à
`verifierSignature()` (§I.7), qui mesure ce qui se voit.

### 3. `verifierRegions()` : la borne tombe à zéro toute seule

```js
const borne = Math.max(0, nq - vs.length);   // nq = 3 a 6, vs.length = 4
```

Avec 12 à 13 lois par thème, `borne` vaut 0 pour toute carte. **Le commentaire du
code l'annonce déjà** (« le jour où un thème portera plus de lois qu'une carte
n'a de régions, la borne tombera d'elle-même à zéro »). Rien à écrire ; il faut
seulement vérifier que `grilleVariantes` ne prend jamais la branche de repli — ce
qui devient un test à part entière.

### 4. `verifierAccents()` : treize accents dans un gamut de six points

`LISEZMOI` mesure : les cinq `arena` tiennent dans **sept points de luminance**.
Les accents actuels s'écartent de leur base de ΔE 2,8 à 8,1. **Treize accents
mutuellement distincts dans ce gamut sont impossibles**, et le lot qui essaierait
produirait treize teintes indiscernables plus un vérificateur rouge.

Décision : **l'accent de palette cesse d'être le canal régional principal.** Le
sol par région (§C.5) le remplace — c'est de la matière, pas de la teinte, et une
matière n'a pas de gamut. `ACCENT` conserve **quatre familles** par thème, une
par grande classe de traitement de sol (clair / sombre / froid / chaud), et
`verifierAccents` n'exige plus le plancher **qu'entre régions adjacentes d'une
même carte**, ce que `grilleVariantes` sait déjà calculer.

### 5. `verifierDessin()` : le coût est multiplié par douze

`verif_dessin.js` appelle le décor entier sur **5 thèmes × 3 modes × 4 points de
vue**. À 63 biomes il faudrait 63 × 3 × 4 — la suite rapide passe de moins de
3 s à plusieurs dizaines de secondes, et **une suite qu'on ne lance plus est une
suite morte** (c'est le constat qui a créé `npm run verif`).

Décision : en mode rapide, `verifierDessin` échantillonne **une région par type
de trame et par thème** (6 × 5 = 30 combinaisons, plus les 5 lois 0), et le
balayage complet des 63 passe en `--tout`. La règle du dépôt tient : le
vérificateur lent va dans la campagne, pas dans le lot.

---

## K.2 — Les changements, fichier par fichier

### `shared/biomes.js` — le gros du travail

| ce qui change | nature |
|---|---|
| `BLOCS[]` passe de 15 à ~50 entrées | **append-only**, `lieu` en déclare le propriétaire |
| `OBSTACLES[theme]` passe de 4 à 12-13 entrées | chaque entrée = un BIOME, avec `poser`, `bords`, `trame`, `contraignant`, `respiration` |
| **`TRAME[]` et `poserTrame()`** | table de six primitives + générateur en coordonnées de quartier |
| `BIOME_CFG` | `TRAME_SURFACE_MAX = 0.045`, `OBSTACLE_SURFACE_MAX` **0.10 → 0.055** (le total ne bouge pas) |
| `buildBiome` | une passe de plus, avant la boucle de cellules : pour chaque quartier, poser sa trame ; puis la boucle actuelle avec le budget réduit |
| macro `oblique` dans `poser` | développé en 3 à 5 AABB |
| `my = (cx*2+cy)&1` | **→ hachage à deux bits** : 16 arrangements → 64 (lot séparé, avec sa remesure) |
| `jMax` | par biome au lieu d'être réservé à la Friche |
| `signatureVariante` / `verifierVariantes` | plafond par enveloppe de thème (§K.1.2) |
| **`verifierSignature()`** | neuf — les six exigences du §I.7 |
| **`verifierTrame()`** | neuf — connexité pleine arène, brèches, culs-de-sac, points d'apparition |

### `public/render/blocs.js`

| ce qui change | nature |
|---|---|
| `BLOC[lieu][kind] = { forme, habit }` → `{ sil, hab, ech }` | 2 tables (`SILHOUETTE`, `HABILLAGE`) au lieu d'une |
| 8 silhouettes neuves, 14 habillages neufs, 1 macro `oblique` | 23 postes |
| `verifierBlocs` | + « une silhouette / un habillage que rien ne tire » ; + la règle `cadre ⇒ habillage peint` |
| `verifierEmpreinte` | inchangé, joue sur les nouvelles silhouettes |
| `LED[biome]` | reste **par thème** — l'émission appartient à la charte |
| `CONTOUR[cle]` | reste **par thème**, même raison |

### `public/render/material.js`

| ce qui change | nature |
|---|---|
| `floorPattern(ctx, bi, di, seed, dpr)` → `+ loi` | **un argument** |
| `cle` de cache | `+ loi` |
| `CACHE_MAX = 5` → **8** | une vue chevauche au plus 4 cellules, donc 4 régions |
| `TUILE[cle]` → `TUILE[cle]` + `TRAITEMENT[t](g, params)` | 12 traitements, une passe après la base |
| `macroPattern` | idem, mais **le macro reste par thème** — c'est la période de 1 200 px, elle traverse les frontières et doit rester continue |
| `verifierMatiere` | + « un biome sans traitement », + « un traitement que rien ne tire » |

**Le piège de cache** : `motif()` jette les entrées dont le « reste » de clef
diffère et garde celles qui ne diffèrent que par la famille. Ajouter `loi`
**après** `biomeIndex` dans la clef garde ce comportement ; l'ajouter à la fin le
casserait, et le cache se viderait à chaque traversée de frontière — exactement
le défaut que `fondCache` a déjà payé.

### `public/render/props.js`

| ce qui change | nature |
|---|---|
| `ZONES[theme]` → `ZONES[theme][biome]` | 3 quartiers par biome (activité / support / résidu) |
| `AIR[theme][loi]` | **fondu dans la table de biome** — plus de table parallèle à tenir en phase |
| `TABLE[theme]` | passe à ~30 props par thème, groupés en 11 familles paramétriques |
| `sonder()` | rend **aussi la position** du bloc le plus proche (elle est déjà calculée et jetée) |
| primitives de trace | 9 → 20, avec une **classe** (ancrée / orientée / libre) |
| `verifierTraces` | + « deux biomes au même jeu de primitives », + « une trace ancrée sans source possible » |
| `verifierZones` | inchangé dans son principe, indexé par biome |
| `DENSITE_LIEU` / `ECHELLE_LIEU` | descendent au biome (c'était déjà le rôle d'`AIR.dens` / `AIR.ech`) |

### `public/render/decor.js`

| ce qui change | nature |
|---|---|
| `AMERS[cle]` → `AMER[biome]` | 63 entrées, dont beaucoup partagées par famille |
| `drawAmer()` | boucle sur les quartiers, `inView` par amer ; `amerDe` prend l'index de quartier |
| `verifierAmers` | par quartier, garde inchangée |
| `GRILLE[cle]`, `drawFond`, `drawBaies`, `champ()` | **par thème, inchangés** |
| `BAIE_TAUX` | **par biome** — c'est le paramètre `taux de vide` du §G.2, et il porte à lui seul onze sols de Nébuleuse |

### `shared/palette.js`

| ce qui change | nature |
|---|---|
| `ACCENT[key]` | 4 → 4 **familles** d'accent (§K.1.4), pas 13 entrées |
| `verifierAccents` | plancher **entre régions adjacentes** seulement |
| `BIOME_SKIN` | **inchangé** — la charte reste au thème |
| `verifierCharte` | **inchangé** |

### `shared/i18n.js` et `shared/lang/en.js`

63 noms de région, clef `biome.${cle}.loi${i}`. **Attention** : la clef est
indexée, donc réordonner `OBSTACLES[theme]` réécrit tous les noms en silence. Il
faut **passer à une clef nommée** (`biome.usine.magasin`) dans le même lot que
l'extension, sinon le premier réordonnancement produira une carte qui s'appelle
mal sans que rien ne lève. `loiNom()` est le seul point de lecture.

### `verif.js` / `verif_dessin.js`

| entrée | mode |
|---|---|
| `signature` | rapide (lecture de tables) |
| `trame` | **lent** (40 graines × 5 thèmes × 3 modes) |
| `vue` | **lent** (balayage des 81 vues) |
| `dessin` | rapide **échantillonné** (§K.1.5), complet en `--tout` |

---

## K.3 — Performance : ce qu'il faut mesurer, et le budget

Relevés de `LISEZMOI` qui servent de référence :

```
objets par vue        6 a 15 blocs
props par vue         30 (nebuleuse) a 65 (secteur)
ops par vue, gfx haut props 819-2444 · obstacles 810-2681 · traces 161-305
construireNav         0,04 a 0,07 ms  (plat de 45 a 81 obstacles)
diffusion             0,202 ms, au plus une par image
generation par manche 0,5 a 1,9 ms
budget                16,6 ms
```

**Ce qui ne bouge pas** : le budget de surface bâtie (§J.2.5), donc le nombre
d'obstacles par vue reste dans la même bande. `construireNav` est plat.

**Ce qu'il faut mesurer avant de livrer** :

1. **`ops par vue, poste obstacles`** — les silhouettes de trame sont plus
   grandes, donc plus d'opérations par objet même à nombre constant. Plafond :
   le maximum actuel (2 681, Nébuleuse). Protocole existant : le contexte 2D
   enregistreur, balayage des 81 vues.
2. **`generation par manche`** — la trame ajoute une passe par quartier. Plafond :
   **5 ms**, soit deux fois et demie le pire actuel. Une génération est une fois
   par manche, jamais dans une boucle.
3. **`props par vue`** — le catalogue grandit mais `DENSITE` ne change pas.
   Contrôle de non-régression, pas une mesure neuve.
4. **`cuire()` par région** — une tuile de plus par région visible. Mesurer le
   coût d'une cuisson (`TILE = 400 px`) et vérifier que `CACHE_MAX = 8` suffit
   sur une traversée de carte complète : **si le cache se vide, on recuit à
   chaque frontière**, et c'est un pic visible, pas une moyenne.
5. **`gfx = low`** — le contrat écrit est « la technique d'avant le plan 13 :
   matière, semis, lumière, grille ». **La TRAME est de la GÉOMÉTRIE, pas de la
   qualité** : elle existe à tous les paliers, comme les blocs. Les traitements
   de sol, eux, sont de la matière et suivent `gfx` — mais la **teinte** de
   région reste à tous les paliers, comme la palette d'arène aujourd'hui (« c'est
   de la DA, pas de la qualité »).

---

## K.4 — Ce qui ne change pas, et il faut le dire

- **`districtsDe()`** — germes, croissance, bruit, réparation de connexité. Zéro
  ligne.
- **`loisAccordees` / `BORD_*`** — les Wang tiles à l'échelle de la région. Zéro
  ligne, sauf que chaque nouveau biome déclare ses quatre bords.
- **`shared/navigation.js`** — zéro ligne. La trame est faite d'obstacles.
- **`_obstacleBlock`, `segmentCoupe`, `_spawnPoint`, `_dropPoint`,
  `groundAt`** — zéro ligne. Tout reste AABB.
- **`HZ_NORMAL` / `HZ_CAUCHEMAR` / `ECHELLE`** — zéro ligne (§J.5).
- **`BIOME_SKIN`, `verifierCharte`, `lumDir()`, `LED`, `CONTOUR`, `GRILLE`,
  `drawFond`, la météo** — la charte reste au thème (§C.3).
- **L'instantané, le protocole, `prepareMessage`, `pushWorld`** — zéro ligne.

---

## K.5 — Le risque nommé

> **Le seul risque de jeu du dossier est `_spawnPoint` dans une trame fermée.**

Une NEF met un joueur contre une paroi ; les points d'apparition hors vue
disponibles autour de lui se réduisent d'un côté. Le repli existe (`_edgePoint`),
mais une horde qui arrive toujours du même côté change le combat sans que
personne ne l'ait décidé.

**Contrôle** : `verifierTrame()` place un joueur au pire endroit de chaque trame
(le fond d'une nef, le bout d'une dent de peigne, l'intérieur d'une couronne) et
compte les points d'apparition valides sur le périmètre de la fenêtre
d'apparition. **Plancher : un quart du périmètre.** En dessous, la trame est
rejetée ou ses ouvertures s'élargissent — et c'est une mesure, pas un avis.

Le second risque est de **production**, pas de jeu : 63 biomes × 3 quartiers de
props × 20 primitives de trace est un volume de table considérable, et une table
mal remplie ne lève rien. C'est exactement pourquoi les six exigences de
`verifierSignature()` (§I.7) sont écrites **avant** le premier lot de contenu,
et pas après.
