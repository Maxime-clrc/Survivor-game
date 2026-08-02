# Plan — bascule WebGL de la couche entités

À exécuter **après** le plan « moteur de rendu et identité visuelle ». Ce
document suppose ses acquis et ne les répète pas.

## Prérequis, à vérifier avant de commencer

Sans ces quatre points, la migration coûte trois fois plus cher :

- [ ] **L'atlas existe** et toutes les entités sont des rectangles source, plus
      des tracés vectoriels.
- [ ] **`drawSprite(frame, x, y, {angle, scaleX, scaleY, tint, alpha})` est le
      point de passage unique.** Aucune entité ne dessine directement au
      contexte.
- [ ] **Le HUD est en DOM**, hors du canvas.
- [ ] **La densité de pixels est gérée** (`devicePixelRatio`, plafonné à 2).

Si l'un manque, ce n'est pas le moment.

## Ce que la bascule apporte, et ce qu'elle n'apporte pas

**Elle n'apporte pas de fluidité.** À ~800 sprites par image, le canvas 2D
accéléré tient largement. Si le jeu rame après le plan précédent, la cause est
ailleurs — taux de remplissage, grille redessinée, particules non regroupées —
et WebGL n'y changera rien.

**Elle apporte des capacités** que le canvas 2D ne sait pas produire :

| capacité | usage dans le jeu |
|---|---|
| teinte par sprite, gratuite | flash de dégât, élites, gel bleu, brûlure orange, états |
| mélange additif | projectiles, lueurs, explosions, aura de boss, bonus au sol |
| échange de palette par texture | variantes d'ennemis sans nouvelle image d'atlas |
| passe de post-traitement | vignettage, aberration chromatique à l'impact, étalonnage |
| distorsion | souffle d'explosion, aura du boss |
| dizaines de milliers de particules | poussière, débris, traînées |

C'est **cette liste** qui justifie la migration. Si aucune de ces lignes ne
t'intéresse, ne la fais pas.

---

# Partie A — Choix techniques

## A1. WebGL brut, pas une bibliothèque

Recommandation : **écrire le batcher à la main, en WebGL2**, sans PixiJS ni
équivalent.

La raison n'est pas idéologique, elle est architecturale. **PixiJS est un moteur
à graphe de scène, en mode retenu** : on crée des objets persistants qu'on
modifie. Le jeu, lui, est en **mode immédiat** — il redessine tout à chaque
image à partir d'un instantané interpolé, sans état de rendu persistant.

Marier les deux voudrait dire maintenir un objet d'affichage par entité, gérer
sa création et sa destruction au rythme des identifiants du serveur, et
synchroniser deux sources de vérité. C'est plus de travail que le batcher
lui-même, et ça introduit une classe entière de bugs (objets fantômes, fuites)
qui n'existe pas aujourd'hui.

Les besoins sont d'ailleurs étroits : des quads texturés, une teinte, deux modes
de mélange. C'est **400 à 500 lignes** compréhensibles, pas un moteur.

WebGL2 plutôt que WebGL1 : disponible partout où le jeu tourne, et donne
`VAO` et l'instanciation sans extension.

## A2. Trois couches empilées

```
DOM ───────────── HUD, cartes, menus, chiffres de degats
canvas 2D ─────── texte monde, barres de vie, zones, pointilles, telegraphes
canvas WebGL ──── entites, projectiles, particules, lueurs
```

Les trois canvas sont superposés en position absolue, même taille, même
`devicePixelRatio`. Le 2D est **transparent** et par-dessus.

Cette séparation est ce qui rend la migration abordable : les 46 `fillText` et
les 14 tracés pointillés restent où ils sont naturels. On ne porte que ce qui
est déjà en sprites.

**Conséquence sur l'ordre de dessin** : tout ce qui est en 2D passe forcément
au-dessus de tout ce qui est en WebGL. Les zones et télégraphes doivent donc
être **sous** les entités visuellement — ce qui est déjà le cas — sinon il
faudra un troisième canvas intercalé.

## A3. Format de sommet et regroupement

Un seul tampon dynamique, attributs entrelacés :

```
position   2 x float32   x, y en coordonnees monde
uv         2 x float32   coordonnees dans l'atlas
teinte     4 x uint8     rgb multiplicatif + alpha, normalise
                         = 20 octets par sommet
```

Quatre sommets par quad, indices en `Uint16Array` — donc **plafond à 16 383
quads par lot**, au-delà duquel les indices débordent. On en dessine 800, la
marge est confortable.

Un lot se vide (`flush`) quand :
- le mode de mélange change (normal → additif),
- la texture change (un seul atlas : jamais, sauf si l'atlas déborde de
  4096 × 4096 et doit être scindé),
- le plafond de quads est atteint,
- la fin de l'image arrive.

En pratique : **deux appels de dessin par image**, un normal et un additif.

## A4. Repère et projection

WebGL a l'axe Y vers le haut, le canvas 2D vers le bas. **Absorber le retournement
dans la matrice de projection**, de sorte que le code de jeu continue à travailler
en coordonnées monde 1600 × 900 avec Y vers le bas. Aucun appelant ne change.

```
viewport = (0, 0, canvas.width, canvas.height)   // deja multiplie par le dpr
projection = orthographique(0, ARENA_W, ARENA_H, 0)
```

## A5. Alpha prémultiplié

**Point le plus fréquent d'échec visuel.** Sans lui, chaque sprite obtient un
liseré sombre sur ses bords transparents, et le mélange additif est faux.

```js
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
gl.enable(gl.BLEND);
// normal
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
// additif
gl.blendFunc(gl.ONE, gl.ONE);
```

Le canvas d'atlas doit être uploadé tel quel — il est déjà prémultiplié, c'est
la convention du canvas 2D.

## A6. Atlas : deux ajustements

L'atlas généré par le plan précédent doit être retouché sur deux points :

- **Une gouttière transparente de 2 px** autour de chaque image. Sans elle, le
  filtrage linéaire va chercher les pixels de l'image voisine et produit des
  franges. C'est invisible en canvas 2D, systématique en WebGL.
- **Filtrage** : `LINEAR` pour la minification et la magnification, avec
  `CLAMP_TO_EDGE` sur les deux axes. Pas de mipmaps : les sprites sont dessinés
  à leur échelle native ou proche.

---

# Partie B — Les shaders

## B1. Sommet

```glsl
#version 300 es
in vec2 aPos;
in vec2 aUV;
in vec4 aTint;
uniform mat4 uProj;
out vec2 vUV;
out vec4 vTint;
void main() {
  vUV = aUV;
  vTint = aTint;
  gl_Position = uProj * vec4(aPos, 0.0, 1.0);
}
```

La rotation et l'échelle sont appliquées **côté CPU** lors de l'écriture des
quatre sommets. C'est plus rapide que de passer une matrice par sprite, et ça
garde le shader trivial.

## B2. Fragment

```glsl
#version 300 es
precision mediump float;
in vec2 vUV;
in vec4 vTint;
uniform sampler2D uAtlas;
out vec4 fragColor;
void main() {
  vec4 c = texture(uAtlas, vUV);
  // Teinte multiplicative sur une texture premultipliee :
  // le canal alpha module deja rgb, on multiplie donc les quatre.
  fragColor = c * vTint;
}
```

`mediump` suffit et reste rapide sur les GPU intégrés. `highp` n'apporte rien
ici.

### Le flash blanc

Une teinte multiplicative ne peut pas éclaircir. Pour le flash de dégât, deux
options :

- **Recommandée** : un uniforme `uFlash` par lot et un `mix(c.rgb, vec3(1.0),
  vFlash)` — coûte un attribut de plus mais reste dans le même appel de dessin.
- Ou dessiner le sprite une seconde fois en additif avec une teinte blanche
  faible. Plus simple, deux fois plus de quads pour les entités touchées.

Prendre la première : le flash concerne potentiellement des dizaines d'entités
à la fois pendant une nova.

---

# Partie C — Perte de contexte

Ce n'est pas un cas d'école : bascule de GPU sur un portable, mise en veille,
redémarrage de pilote. Non géré, c'est un **écran noir définitif** et le joueur
doit recharger la page.

```js
cv.addEventListener("webglcontextlost", e => {
  e.preventDefault();          // sans ca, le contexte n'est jamais restaure
  renderer.mode = "canvas2d";  // repli immediat
});

cv.addEventListener("webglcontextrestored", () => {
  renderer.init();             // shaders, tampons, atlas a reuploader
  renderer.mode = "webgl";
});
```

**Le repli vers la couche 2D n'est pas optionnel.** Il est de toute façon
gratuit : le chemin canvas 2D existe déjà et le plan de migration demande de le
garder vivant (partie E). C'est le principal avantage de la stratégie de
migration progressive.

---

# Partie D — Ce qui migre

| élément | destination |
|---|---|
| monstres, joueurs, boss | **WebGL** |
| projectiles, balles | **WebGL** |
| particules | **WebGL** |
| bonus au sol | **WebGL** |
| lueurs, auras | **WebGL**, en additif |
| zones, télégraphes, pointillés | canvas 2D |
| grille, vignettage | canvas 2D |
| barres de vie au-dessus des entités | canvas 2D |
| noms de joueurs, texte monde | canvas 2D |
| HUD, chiffres de dégâts, menus | DOM |

Les particules méritent une note : elles sont aujourd'hui plafonnées à 300 pour
des raisons de coût. En WebGL, **le plafond peut monter à plusieurs milliers**
sans effet mesurable — c'est le gain le plus visible de la bascule, et il rend
les morts, les impacts et les explosions bien plus satisfaisants.

---

# Partie E — Stratégie de migration

## E1. Progressive, jamais d'un bloc

Le chemin canvas 2D **reste en place et fonctionnel** pendant toute la
migration, derrière un drapeau :

```js
const RENDERER = localStorage.getItem("survivor.renderer") ?? "webgl";
```

Trois bénéfices : comparaison visuelle immédiate entre les deux, repli en cas de
perte de contexte, et possibilité de livrer à mi-chemin sans rien casser.

## E2. Ordre

1. **Contexte, shaders, batcher, atlas uploadé.** Rien à l'écran encore.
2. **Une seule famille d'entités** — les monstres. Comparer côte à côte avec le
   chemin 2D jusqu'à ce que ce soit identique au pixel près.
3. **Le reste des entités** : joueurs, projectiles, bonus, boss.
4. **Les particules**, et relever leur plafond.
5. **Le mélange additif** : lueurs sur les projectiles, aura du boss, bonus.
6. **La teinte** : flash de dégât, élites, états. Retirer le code de
   composition 2D correspondant, devenu inutile.
7. **Passe de post-traitement** (optionnelle, voir partie F).

Les étapes 1 à 3 ne doivent produire **aucun changement visuel**. C'est le
critère : si l'image change, c'est un bug, pas une amélioration.

## E3. Le piège de l'étape 6

C'est là qu'on est tenté de commencer à ajouter des effets, alors que la
migration n'est pas finie. Résiste : tant que l'étape 5 n'est pas stable, tout
nouvel effet rend impossible la comparaison avec le chemin 2D, qui est le seul
filet de sécurité.

---

# Partie F — Ce qu'on débloque ensuite

Une fois la bascule stable, par ordre de rapport effet/effort :

**Lueur additive** sur les projectiles, les bonus au sol et l'aura du boss.
Gratuit une fois le mode additif en place, et c'est ce qui donne le plus
immédiatement l'impression d'un jeu fini.

**Teinte d'état** : un ennemi gelé vire au bleu, un ennemi qui brûle à l'orange,
un ennemi marqué au blanc. Aujourd'hui impossible sans images dédiées ; devient
un attribut de sommet.

**Traînées de particules** massives sur les morts et les explosions.

**Passe de post-traitement** : rendre dans un framebuffer, puis dessiner un quad
plein écran avec un shader. Débloque le vignettage en une ligne, l'aberration
chromatique brève à l'impact, l'étalonnage colorimétrique par difficulté (froid
en calme, saturé en cauchemar), et un flou directionnel pendant l'esquive.

**Distorsion** de l'onde de choc et du souffle des bombes, en échantillonnant le
framebuffer avec un décalage radial.

**Échange de palette** par texture de correspondance : des variantes de couleur
d'ennemis sans une seule image d'atlas supplémentaire.

L'éclairage dynamique — une passe d'accumulation lumineuse avec des halos par
projectile — est possible mais c'est un chantier à part entière. À ne pas
embarquer dans la même migration.

---

# Partie G — Mesures et critères

## G1. Mesures

| mesure | attendu |
|---|---|
| images par seconde, 220 ennemis + 3 000 particules | 60 stable |
| appels de dessin par image | 2 à 4 |
| quads par image, pire cas | sous 4 000 |
| mémoire GPU de l'atlas | sous 16 Mo |
| temps d'initialisation WebGL | sous 100 ms |
| **comparaison visuelle 2D / WebGL aux étapes 1 à 3** | **identique** |

Relever aussi le taux de repli : si `webglcontextlost` se déclenche chez
quelqu'un en jeu réel, c'est une information qui vaut la peine d'être remontée
dans les journaux du serveur.

## G2. Critères d'acceptation

- Le jeu reste jouable après une perte de contexte, sans rechargement.
- Le drapeau de basculement permet de revenir au canvas 2D à tout moment.
- Aucun liseré sombre sur les bords des sprites (alpha prémultiplié).
- Aucune frange venue d'une image voisine de l'atlas (gouttière).
- Les étapes 1 à 3 ne changent pas une seule ligne de `drawSprite` côté
  appelant.
- Le texte, les barres et les zones restent nets — donc toujours en 2D.

## G3. Pièges connus

| piège | symptôme | correctif |
|---|---|---|
| alpha non prémultiplié | liseré sombre autour des sprites | `UNPACK_PREMULTIPLY_ALPHA_WEBGL` |
| pas de gouttière dans l'atlas | franges d'une image voisine | 2 px transparents |
| `preventDefault` oublié | contexte jamais restauré | l'ajouter dans le gestionnaire |
| indices en `Uint16` dépassés | géométrie corrompue au-delà de 16 383 quads | vider le lot avant |
| viewport non multiplié par le dpr | rendu à moitié dans le coin | `gl.viewport` sur `canvas.width/height` |
| teinte appliquée sans prémultiplication | additif trop lumineux | multiplier les 4 canaux |
| lots vidés à chaque sprite | des centaines d'appels de dessin | ne vider qu'au changement d'état |
