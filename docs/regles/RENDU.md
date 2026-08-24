# Rendu, charte visuelle, retour sensoriel, audio, écrans

**Quand lire ce fichier :** on touche à `public/render/*`, `sprites.js`, `gl.js`, `hud.js`, `audio.js`, `public/css/*`, ou à un écran de menu.

Les règles qui valent pour *toute* tâche vivent dans `CLAUDE.md`, à la racine.
Celui-ci ne porte que ce qui ne sert qu'ici — et il n'est PAS chargé
automatiquement : c'est la carte de `CLAUDE.md` qui dit quand l'ouvrir.
## Rendu

- **Chaque effet dessiné autour d'un personnage occupe une bande de rayon
  exclusive**, table dans `render/fx.js` (la couche la plus basse qui en a
  besoin, les éclats de coque naissant sur `RING_SHIELD`) : `RING_SHIELD`,
  `RING_STATUS`, `RING_SKILL`, `RING_BUFF0`, puis 3,7 m lames orbitales, 8 m
  givre, 8,5 m rempart. **Vaut aussi autour d'un ENNEMI** : halo d'élite
  `r+6`→`r+8`, liseré d'aura `r+10`. Les lames se dessinent en passe séparée
  (`drawOrbiters`), le givre est un disque **sans anneau**.

**La ligne de partage est « où vit l'élément »**, pas « canvas ou CSS » :

| couche | contenu | technologie |
|---|---|---|
| **Monde** | entités, projectiles, zones, sol, particules | canvas (`render/*`, `sprites.js`, `gl.js`) |
| **Écran** | HUD, barres, recharges, consignes, chiffres de dégâts | DOM + CSS (`hud.js`) |
| **Menus** | chargement, salon, cartes, bilan, build, pause | DOM + CSS (`ui/*`) |

**Trois canvas empilés** (`#arena`), imposés par la bascule WebGL :

| canvas | contenu | techno |
|---|---|---|
| `#cvUnder` | sol, grille, obstacles et dangers, zones, télégraphes, remparts, tourelles, marqueurs, sillage | 2D |
| `#cvGl` | **entités** : monstres, joueurs, dépouilles, particules | WebGL2 |
| `#cv` | boss, drones, **projectiles**, anneaux, barres, noms, lames orbitales, murs, vignettage | 2D |

`ctx` dans `render/stage.js` est une **variable** : `drawWorld()` la bascule de
`underCtx` à `overCtx` une fois, juste après les monstres.

- **Ordre d'affichage imposé** : sol → zones → bonus → ennemis → **projectiles**
  → joueurs. `drawEffects` (nova, pulsar, ondes) reste **sous** les entités.
- **Seul `#cvUnder` peint un fond** ; les deux autres se vident à chaque image.
- **L'arène ne se dessine que pendant la manche**, décidé par la boucle de rendu
  (`phase` **et** `latest` dans la condition — `latest` n'est pas vidé en fin de
  manche). `visibility: hidden`, jamais `display: none` : `resize()` mesure par
  `getBoundingClientRect()`, qui rend zero sur un element non affiche.
- **Le canvas suit la densité de pixels** (`resize()`, plafonnée à 2). Les
  coordonnées monde restent en pixels de simulation.
- **Le tressaillement est un `transform` CSS** porté par `#arena` (les trois
  couches bougent ensemble). Le HUD est le **frère** de `#arena`. `#arena` porte
  un `scale(1.015)` permanent.
- **Le HUD n'écrit dans le DOM que si la valeur a changé** (table `memo`).

### La lumière

**`drawLumiere()` est appelée sur `#cvUnder`, juste après `drawFloor`,
`drawGrid` et `drawProps`, et AVANT le premier élément de gameplay.** C'est tout
le système : la pile de canvas sépare déjà sol / entités / effets, donc une passe
posée sur le canvas du bas ne peut pas atteindre un ennemi, un projectile, un
télégraphe ou un marqueur. **La hiérarchie de lisibilité est structurelle, pas
réglée** — la déplacer d'une ligne plus bas la casse en silence.

- Le tampon est à **1/4 de la vue** (1/2 en `ultra`) : le sur-échantillonnage
  bilinéaire du `drawImage` donne la douceur gratuitement. À pleine résolution il
  faudrait un flou.
- **Deux passes, pas une** : `multiply` fait l'ombre, `lighter` fait l'émission.
  `multiply` seul rend un jeu plus sombre, `lighter` seul un jeu délavé.
- **Toute source est LUE, aucune n'est poussée** : dangers via `hazardState()`,
  props via `forEachPropLight()`, souffles via `bursts`, joueurs via `playerList`.
  Écrire vers une couche supérieure est interdit, et rien ici n'y oblige.
- **Un projectile n'est pas une source.** Il y en a des centaines par seconde à la
  minute 25 : le sol clignoterait au rythme de la cadence de tir.
- **Une source ne monte jamais au blanc pur toute seule** (plafond 0,85) : c'est
  l'empilement qui fabrique le cœur clair, comme pour un souffle.

### Le volume

**`lumDir()` vit dans `stage.js`** — la couche la plus basse qui la connaisse,
sous `fx.js` (ombres de contact) et sous `decor.js` (ombres portées). **Deux
ombres qui pointent différemment sur le même écran, c'est le défaut le plus
visible d'un rendu 2D**, et le plus facile à éviter en refusant qu'il existe un
second endroit où l'écrire.

**Le relief radial de `drawObstacles` reste, et il ne concurrence pas l'ombre** :
le radial dit où est la **caméra** (un objet loin du centre montre son flanc), le
décalage constant dit d'où vient la **lumière**. Deux gestes distincts, pas deux
réglages du même — et les faire coexister est ce que fait la 2D haut de gamme.

- **`drawOmbre()` se dessine en passe SÉPARÉE**, avant les corps. Une ombre posée
  juste avant *son* corps tomberait sur le corps déjà dessiné du voisin.
- Même mode de mélange que les corps, donc **même lot GL** : aucun appel de
  dessin supplémentaire, seulement des quads.
- **Elle ne s'additionne pas.** À 200 ennemis serrés, 200 ombres empilées feraient
  une flaque noire.
- **Un projectile n'a pas d'ombre.** Même raison que pour la lumière : la
  fréquence.
- Le boss n'est pas dans l'atlas : son ombre est un **tracé**, pas un quad.

### Le sol et le semis

- **`TILE` vaut exactement `GRID_MAJOR`, `MAILLE` exactement `GRID_FINE`.** La
  tuile porte donc les deux grilles en **joints** au lieu de les laisser se tracer
  par-dessus — un joint a une épaisseur et deux côtés, donc il décrit une
  *surface* ; une ligne décrit un *plan technique*. Le motif est ancré à l'origine
  du **monde** (la caméra vit dans le transform), donc les joints tombent sur la
  maille réelle. `GRID_FINE` reste exporté : `drawGridPings()` s'en sert.
- **Deux biomes n'ont pas de maille de 5 m** : la Friche, dont le béton a des
  *joints de coulage* irréguliers — un joint technique régulier décrirait une
  installation entretenue — et la Nébuleuse, dont le nid d'abeille tient ce rôle.
  `cuire()` est le seul endroit où ça se décide.
- **Une seconde période sans aucune arête** (`MACRO`, 1 200) : à 400 px l'œil
  trouve la période en deux secondes, et aucune quantité de détail *dans* la tuile
  ne rattrape ça.
- **`props.js` ne garde rien** : présence, type, angle et échelle d'un prop sont
  des fonctions de sa cellule monde et de la graine — même motif que `champ()`,
  ancré à une cellule au lieu d'un indice. Le semis est donc infini, non répétitif
  et identique chez tous. Cache par rectangle de cellules, pas par image.
- **RÈGLE ABSOLUE : rien dans `props.js` ne se lit comme bloquant.** Tout est
  plaqué au sol, et le semis saute toute cellule occupée par un obstacle ou un
  danger. Un prop qui ferait hésiter sur une trajectoire est un bug. Ce qui doit
  se lire comme bloquant est un **obstacle**, dans `biomes.js`.
- **Un prop est de la matière, pas un signal** : un signal est saturé et animé,
  une matière est désaturée et fixe. C'est la seule règle qui empêche le décor de
  mentir maintenant que l'ambre n'est plus réservé à l'avertissement.

### L'atmosphère

Tout passe par `champ()` — **un champ de particules sans particules** : la
position d'un brin est une fonction de son indice et du temps, donc rien ne
s'alloue, rien ne se garde entre deux images, deux clients voient la même chose,
et **un champ coûte un `stroke`**.

C'est la propriété qui empêche ce système de dériver : **si un effet a besoin
d'un tableau qui persiste, il n'est pas là — il est dans `fx.js`, avec les
particules, sous `PARTICLE_MAX`.**

- `cx0/cy0/rayon` **ancrent** le champ sur une source au lieu de la vue. C'est le
  seul écart entre la météo et la vapeur d'un geyser : un paramètre, pas une
  seconde fonction. Positionnels et non un objet d'options — le module ne doit
  rien allouer par image.
- **Un prop émissif existe par trois canaux** : il grésille, il crache des
  étincelles, il éclaire son pourtour. Les trois lisent la **même** déclaration
  (`forEachPropLight`). Un coffret qui n'aurait que le premier serait du décor.

**Le premier plan** (`drawPremierPlan`), sur `#cv` après le vignettage :

1. **Rien au centre.** Il vit dans les bandes haute et basse. Le centre appartient
   au joueur.
2. **Jamais opaque.** Il ne masque rien, il assombrit un peu.
3. **Coupé pendant un boss.** L'arène se resserre déjà à une vue ; y ajouter du
   bord serait le contraire de ce que le resserrement cherche.

La parallaxe est une **dérive globale** proportionnelle à la position de caméra —
assez pour donner la profondeur, trop peu pour attirer l'œil.

### Le boss prend l'arène

Le profil vit dans **`BOSS_SKIN`** (`palette.js`), la table déjà indexée par
`kind` : `amb`, `k`, `vig`, `puls`, `atmo`. Ce sont des **nombres** — l'application
est une interpolation, pas une structure.

**Deux canaux à constantes de temps distinctes, et l'ordre compte :**

| canal | durée | ce qu'il porte |
|---|---|---|
| `kL` | 1,2 s | l'ambiante et le vignettage |
| `kS` | 0,8 s, **démarre à `kL > 0.85`** | la teinte du sol et l'atmosphère |

**La lumière change avant la matière.** On sent l'arrivée avant de la voir, ce qui
est l'ordre dans lequel une menace se manifeste. Une bascule instantanée de la
couleur du sol se lit comme un bug de rendu, pas comme une entrée en scène.

- **La teinte du sol passe par l'ambiante de la passe de lumière**, jamais par un
  recuit de la tuile : le mécanisme existe déjà et il coûte un `melange()`.
- **Le profil est GARDÉ pendant la sortie.** Il devient `null` dès la mort du
  boss alors que les deux canaux ont encore 1,5 s à redescendre.
- Une **rupture de barre** est une pointe, pas un palier.
- **Aucun télégraphe ne perd de contraste** : le profil ne pilote que l'ambiante,
  qui ne touche que le sol. Barre de PV, marqueurs et annonces vivent sur `#cv` et
  dans le HUD DOM — ils ne bougent jamais.
- Le champ d'atmosphère du boss est le **seul** qui ait le droit de traverser le
  centre : il annonce ce qui s'y trouve.

### Quatre lieux, pas quatre couleurs

**Même univers ≠ même environnement.** Le socle est commun — sci-fi industriel
sombre, ambre de signal réservé au gameplay, télégraphes jamais concurrencés —
et **la différence est structurelle** : forme, matière, source de lumière,
danger, implantation.

| | FRICHE | USINE | FONDERIE | NÉBULEUSE |
|---|---|---|---|---|
| **verbe** | a été laissée | fabrique | coule | flotte |
| **bloc** | ruine fissurée | machine panneautée | four maçonné | travée ajourée |
| **sol** | dalles et joints de coulage | tôle et maille de 5 m | plaques, voies, vitrifié | nid d'abeille |
| **pas de 20 m** | marquage peint effacé | trait franc | nœuds seuls | nervures du pont |
| **contour de bloc** | presque aucun | franc | sourd | franc |
| **source** | presque rien | bandes LED ambrées | la gueule des fours | feux de position froids |
| **implantation** | deux champs de ruines | bandes : chaîne, allée, chaîne | deux masses, un couloir | longues travées |
| **bord** | grillage affaissé | passerelle et conduites | cheminées et fumée | haubans et antennes |

**Le critère de non-régression** : si on échange les quatre noms et que les
captures restent difficiles à attribuer, le travail n'est pas fini.

**Le pas de 20 m reste, ce qui le PORTE change** (`GRILLE`, `decor.js`). La
graduation est la seule chose à l'écran qui serve à lire une portée : elle ne se
négocie pas. Mais la même ligne droite pleine arène dans les quatre lieux était
le signal le plus fort de l'écran **et** le seul qui n'y variait pas d'un pixel —
quatre sols, quatre blocs, quatre dangers, et par-dessus un plan technique
commun. La Nébuleuse n'avait d'ailleurs *que* des réseaux : nid d'abeille, puis
trame par-dessus.

- La forme d'un lieu **vaut à tous les paliers**, `low` compris : c'est de la
  direction artistique, pas une technique. `low` garde sa grille **fine**, pas la
  forme de l'autre. Aucun point de lecture de `gfx` en plus.
- Une **nervure** n'est pas une ligne, pour la même raison qu'un joint de tuile :
  elle a une épaisseur et un côté éclairé, donc elle décrit une structure. Le
  côté éclairé lit `lumDir()` et rien d'autre.
- Le marquage de la Friche est du **pigment** (`PROP.peint`), jamais la couleur
  de grille : ce qui reste au sol d'une installation abandonnée est de la
  peinture, pas un trait technique. Il est troué et désaxé — le pas se
  reconstruit d'un tronçon à l'autre, il ne se lit plus comme une trame.

**Un lieu se déclare à UN endroit** : `BIOME_SKIN` (`palette.js`) — arène,
grille, bloc, ambiante, direction de lumière, émissif. Avant, la couleur vivait
à trois endroits (`BIOMES[].tint/.grid`, `LUM`) et le bloc à aucun ; **mesure du
résultat : les quatre arènes tenaient dans 15 niveaux RGB sur 255.** `biomes.js`
décide de la **géométrie**, jamais du ton.

**Le mode règle la clarté, le lieu règle la teinte.** `solDeBiome()` relève le
facteur sur `DECOR` au lieu de l'écrire : trois modes × quatre lieux sans que
l'un mange l'autre. C'est ce que `teinter()` — qui normalisait la luminance sur
la base — rendait impossible, et c'est pourquoi il a été supprimé.

### La masse bâtie

`render/blocs.js`. **C'est l'obstacle qui occupe l'écran** : quatre sols
différents sous quatre mêmes blocs donnent quatre mêmes maps.

- **LA SILHOUETTE REMPLIT SON RECTANGLE.** La collision est une AABB repoussée
  **par axe** (`_obstacleBlock`) : une forme qui rentre ses coins fait buter le
  joueur sur du vide. Toute la différence se joue **dans** l'empreinte — matière,
  arête, lumière — jamais en la rognant. Chanfreins sous 16 px.
- **La forme vaut à tous les paliers**, l'habillage intérieur s'arrête en `low` —
  et c'est `decor.js` qui le décide : `gfx` garde ses **cinq** points de lecture.
- **Le liseré est une propriété de la MATIÈRE, pas du jeu** (`contourDe`). Tracé
  à la même force sur les quatre, il disait « panneau usiné » quelle que soit la
  couleur du sol dessous. Un four se lit à sa masse et à sa gueule, une ruine n'a
  pas d'arête nette. Les **couvertures destructibles gardent le leur, plein** :
  leur contour tireté dit des points de vie, il est du gameplay.
- **`ledDe()` porte teinte, rayon ET type.** Une gueule de four et un voyant ne
  sont pas la même lumière : la gueule éclaire deux fois plus loin. La Friche
  n'a presque plus rien d'allumé — elle a été abandonnée.
- Le seul détail qui **sorte** de l'empreinte est hors du clip, et il est unique :
  les fers à béton de la ruine. Un mur cassé dont rien ne dépasse est un mur
  coupé à la scie.

### Un danger n'est pas un cercle

`render/dangers.js`, table `(biome, kind) -> dessin`. **Ajouter un danger à un
lieu = une entrée.** Le gameplay ne bouge pas d'un chiffre : **le disque de
`biomes.js` reste le collider**, il cesse d'être dessiné.

1. **L'empreinte reste lisible au bord près.** Chaque dessin ferme sur une
   `limite()` franche à `h.r`, jamais un dégradé qui s'éteint — un danger dont
   on ne lit pas le bord est injuste, pas difficile.
2. **Il s'annonce par sa géométrie permanente**, jamais par un clignotement : le
   canal du télégraphe appartient au boss. Ce qui bouge ici est de la **matière**
   — un flux, une vapeur, une étincelle. Jamais de pointillés.
3. **Ce qui blesse est chaud, ce qui ralentit est froid.** Seule constante entre
   les quatre lieux, et c'est elle qui rend la table extensible sans
   réapprentissage.

Les dangers à phase gardent leur **double état** : au repos on voit
l'**installation** — la buse, le câble mort, la grille de fonte — et c'est elle
l'annonce ; à l'amorce le jet monte avec `st.k`.

### La composition

`OBSTACLES` dans `biomes.js`. Quatre semis de rectangles dans la même gamme de
taille donnaient un espace **uniformément encombré** : ni dense ni ouvert, donc
sans rythme. Une arène se traverse, elle ne se piétine pas.

- Chaque lieu a **sa loi d'implantation** (table ci-dessus). Le contraste se lit
  dans les chiffres : la Fonderie pose **5 objets par vue pour 6,8 % de surface**,
  la Friche **10 pour 4,4 %**.
- **Les dangers suivent l'architecture au lieu de la doubler** : la louche court
  dans le couloir *entre* les deux fours, les jets de vapeur tombent dans les
  allées.
- **Le carré central reste traversable dans les deux axes.** `verifierBiomes()`
  le rejoue à chaque graine — muet sur 200 — et c'est ce qui autorise des masses
  pareilles sans jamais enfermer une équipe.
- `BIOME=<clé> GRAINE=<n>` forcent le tirage d'une salle, **pour les tests
  uniquement**. Sans ça, comparer quatre lieux demande de relancer des salles
  jusqu'au bon tirage, et c'est le genre de protocole qu'on finit par ne plus
  faire.

### Une map ressemble à son nom

Le semis partage **six props communs** — honnêtement industriels, ils valent
partout — et donne à chaque biome **son propre jeu**, qui porte son verbe :
l'Usine *fabrique* (convoyeurs, caisses, allées), la Fonderie *coule* (rigoles,
lingots, scorie), la Friche *a été abandonnée*, la Nébuleuse *arrime* (rails,
ancrages, balises). Un catalogue entièrement partagé rendait les biomes
interchangeables.

- **Une allée n'est pas un avertissement** : deux lignes continues et pâles, pas
  des hachures. Un marquage hachuré se lit comme un télégraphe.
- **Un prop émissif déclare son rayon ET sa teinte.** Une rigole en fusion et un
  voyant de coffret ne sont pas la même lumière.
- **Le comportement dit la matière mieux que la couleur** : un tube mort
  *grésille*, un voyant *respire*, du métal en fusion *ondule*, une balise *bat*.
- **Ce qui appartient au lieu ne dépend pas de la difficulté.** La coulée de la
  Fonderie ne vivait que dans `usure` : en mode calme il n'en restait aucune et
  le sol était celui d'un couloir. Le plancher existe à tous les modes, l'usure
  ne fait qu'en ajouter.

### L'arrière-plan

**`drawFond()` est le seul arrière-plan du jeu**, et il n'existe que pour les
biomes qui déclarent `fond` dans `BIOMES`. Il se dessine **deux fois** : une
passe pleine vue entre la couleur d'arène et la matière du sol, puis une passe
**par baie**, après le sol, à pleine valeur.

- **Trois parallaxes, pas deux** — un fond à une seule vitesse est un
  autocollant, et à deux il manque ce qui se passe *entre* l'infini et le
  proche. Astres 0,05, **gaz 0,10**, étoiles 0,16. Le gaz est cuit en
  **demi-résolution** et étiré au blit : une nappe floue n'a pas besoin d'un
  pixel par pixel, et l'étirement *est* le flou qu'on aurait payé autrement.
  Sa bande **croise** celle de la couche lointaine — deux bandes parallèles se
  lisent comme une seule, deux bandes croisées comme un volume.
- **Une bande de nébuleuse traverse toute l'image** : elle donne l'échelle parce
  qu'elle ne tient pas dans l'écran, là où un amas de taches de même taille se
  lit comme du bruit. Les nuages **sombres** comptent autant que les clairs : une
  nébuleuse sans masque d'absorption est une brume.
- **Le fond dérive**, et seulement ce qui est **loin** : les étoiles proches
  restent fixes, sinon c'est le vaisseau qui semblerait tanguer.
- Les étoiles cuites sont groupées par **palier de clarté** : trois `fill`, pas
  un `arc` par étoile. **Le scintillement, lui, ne se cuit pas** — faire pulser
  une couche cuite fait pulser tout le ciel d'un coup, ce qui est un projecteur
  et non un scintillement. Chaque étoile a son horloge, le regroupement par
  palier garde le coût à trois `fill`, et rien ne s'alloue : la position est une
  fonction de l'indice.
- Un astre sans **terminateur** est un disque. Le croissant sombre coûte un
  second arc en `destination-out`.
- **Le blit se fait par sous-rectangle** : une baie de 300 px ne paie pas une
  image de 2 200. On calcule le morceau de source, on ne laisse pas un clip s'en
  charger.

#### La baie

**C'est elle qui dit qu'on est dans l'espace.** Avant : trois hexagones retirés
par tuile, 4 % de la surface, découpés *dans* le motif — donc répétés tous les
400 px et remplis par ce qui transparaissait sous un plancher à 0,93. Résultat à
l'écran : une salle hexagonale bleue, avec un cosmos invisible dessous.

- **Une baie occupe une travée du pont** : elle est tirée par **cellule de
  nervure**, donc au même pas de 400 px que ce qui la borde — c'est ce qui
  explique sa forme et sa place. Deux formats, la travée pleine et la bande,
  sinon un tirage par cellule redevient un damier de carrés identiques.
- **ELLE EST VITRÉE, ET CE N'EST PAS UN DÉTAIL.** Un trou franc dans le plancher
  ment : le joueur le traverse, les ennemis le traversent, un obstacle du biome
  peut tomber dessus et son ombre porterait sur du vide. Une verrière donne
  exactement la même image — le vide, en grand, sous les pieds — sans qu'aucune
  règle de déplacement ne bouge. Rien à exclure du semis, rien à exclure des
  obstacles. **On marche sur un plancher, jamais sur le vide.**
- Le voile de verre **plafonne** aussi la clarté de la baie, donc la lisibilité
  d'un ennemi qui passe dessus.
- **L'ombre du cadre est tracée DANS le clip** : la moitié intérieure d'un trait
  large. C'est elle qui donne au plancher son **épaisseur** — une baie sans
  tranche est un autocollant. Les **meneaux** donnent l'échelle : sans eux on ne
  sait pas si la baie fait deux mètres ou vingt.
- Le plancher reste presque opaque (0,93) et son nid d'abeille **recule** : la
  nervure porte le pas, la baie porte le vide, trois réseaux de même force sur un
  seul sol se lisent « salle ».

### Le palier de qualité

`gfx` (`core/state.js`, `survivor.gfx`) — `low / medium / high / ultra`, `high`
par défaut. **`low` est un contrat, mais sur la TECHNIQUE** : matière, semis,
lumière et grille d'avant le plan 13. C'est le bouton AVANT de la comparaison et
le repli d'une machine lente. Tout changement qui touche un chemin partagé
vérifie que `low` n'a pas bougé.

**La palette d'arène n'est pas dans le contrat** : `DECOR[]` et les teintes de
biome valent à **tous** les paliers. Un palier de qualité règle un coût de rendu,
il n'annule pas une décision de direction artistique — une machine lente doit
voir le même jeu, pas un autre.

**Cinq points de lecture, pas un de plus** : `material` (nombre d'échelles),
`props` (densité), `lumiere` (résolution du tampon), `decor` (grille fine),
`fx` (l'**ombre de contact**). La simulation, les collisions et les apparitions
ne changent **jamais** entre paliers.

**`PARTICLE_MAX` ne suit PAS `gfx`, il suit le RENDERER** — 300 en canvas 2D,
3 000 en WebGL, posé une fois par `ui/boot.js`. Ce n'est pas un oubli : un
plafond de particules mesure le coût **par particule**, et il est dix fois plus
élevé sur le chemin 2D, où chaque fragment est un `fill`. Le palier de qualité,
lui, règle une *technique*. Les deux axes sont indépendants et doivent le rester
— c'est pourquoi tout ce que le plan 15 a ajouté (bouche, impacts, morts, mort
de boss) se dose sur `glActive()` et **jamais** sur `gfx`.

### Caméra et arène

`CFG.ARENA_W/H` = 4800 × 2700, `CFG.VIEW_W/H` = 1600 × 900. **La caméra vit dans
les transforms, jamais dans les fonctions de dessin** : translation posée par
`applyCamera()` sur les deux contextes 2D, offset absorbé par la projection dans
`gl.begin`, souris mémorisée en coordonnées de **vue** et convertie à la lecture.

Tout ce qui est « plein écran » couvre le **rectangle de vue**
(`camera.x0/y0` + `VIEW_W/H`), jamais l'arène. Culling par `inView()`. Les
chiffres de dégâts convertissent monde → vue au point d'appel. Les flèches de
coéquipiers hors champ se dessinent après le vignettage.

**Un combat de boss resserre `state.bounds` à UNE VUE** ancrée sur
`_teamCentroid` ; `_killBoss()` rouvre. Toute la géométrie des mécaniques lit les
**bounds**. Les renforts naissent sur le bord de SES bounds. Les tests « arène
pleine » portent sur les **quatre** côtés.

### `drawSprite`

**Monstres, joueurs, silhouettes du salon, particules : tout passe par
`drawSprite`** (`public/sprites.js`). Un cas qui ne rentre pas dans la signature
(`angle`, `scaleX`, `scaleY`, `tint`, `alpha`, `flash`, `flashTint`, `additive`) étend la
**signature**, jamais une exception.

- **Le liseré permanent des joueurs** est la silhouette blanche cuite dans
  l'atlas (`flash: 1`), dessinée un cran plus grande **sous** le sprite. Il porte
  angle, étirement et écrasement du sprite. Pas de liseré pendant une esquive.
- **L'atlas est généré au chargement**, suit la densité de pixels. Budget : **ne
  pas stocker en image ce qu'une transformation peut faire** — respiration,
  écrasement, orientation, recul, rang d'élite sont des `scale`/`rotate`. On ne
  paie que les changements de **forme**. 78 images, `COLS = 9`, plafond 12 Mo.
- **Gouttière transparente de 2 px** par case (`PAD`/`PITCH`) : le filtrage
  linéaire WebGL ramène sinon les texels voisins. `cellRect()` est le point de
  passage unique de la lecture de l'atlas.
- **Trois cases sont des particules et disent une MATIÈRE** : `fx_white`
  (étirée = étincelle), `fx_shard` (éclat anguleux, `p.spin`), `fx_glow` (halo ;
  la fumée le réutilise avec `grow`). Pas de quatrième case : deux effets qui
  partagent une forme se distinguent par leur **comportement**. Le chemin 2D ne
  rejoue ni l'éclat ni la traînée, il reprend le halo.
- **Une silhouette est faite de plusieurs sous-tracés** : chaque membre commence
  par `moveTo` et se ferme par `closePath`, sinon il creuse une entaille.
- **`mirrored(g, s, pts)` est le point de passage d'un sous-tracé miroir.** Il
  mesure l'**aire signée** et retourne l'ordre des sommets si le signe n'est pas
  bon : deux contours en sens contraires annulent leur zone commune sous la règle
  non nulle, donc percent un trou. Hypothèse : les corps sont parcourus dans le
  sens positif.
- **Le boss n'est pas dans l'atlas** : unique à l'écran, animé au tracé.

### Boss : posture

`bossCue` (`net/interp.js`) et `bossPose` (`render/boss.js`) ont **leur propre
horloge**, distincte de celle du bandeau — le bandeau s'efface 250 ms **avant**
la résolution, le corps doit rester ramassé jusqu'au coup.

- **Anticipation** : `gather` monte de 0 à 1 **en carré**, jamais en linéaire.
- **Maintien** : implicite, jusqu'à l'impact.
- **Relâche** : `burst` vaut 1 **à l'instant du coup**, tient `BOSS_HOLD` (0,22
  de la fenêtre) puis retombe avec **dépassement négatif**. Écrasement
  asymétrique : −9 % ramassé, +12 % détente.

`bossPose` est **sans effet de bord** (`drawBoss` est appelé deux fois par image
pour les Jumeaux). `bossSheet()` **neutralise** `bossCue` le temps du tracé.

**Chaque boss rend le coup dans son propre verbe** : pointes du Ravageur qui
jaillissent, poches de la Matriarche qui se **vident**, à-coup des anneaux du
Métronome proportionnel à leur vitesse, glyphes de l'Oracle qui s'éteignent
pendant que l'œil se dilate, oscillation des Jumeaux qui **enfle**. Le final :
l'**absorption**, deux signes inversés dans `drawBoss`.

### WebGL

`public/gl.js` est un **batcher écrit à la main, WebGL2, sans bibliothèque** — le
jeu est en **mode immédiat**, les moteurs à graphe de scène sont en mode retenu.

- **Alpha prémultiplié partout** (`UNPACK_PREMULTIPLY_ALPHA_WEBGL`). La teinte
  multiplie les **quatre** canaux.
- **L'éclair est un attribut de sommet et un `mix`**, pas la teinte : un
  multiplicatif ne sait pas éclaircir. **Sa COULEUR aussi** (`aFx.yzw`, les trois
  octets qui restaient libres) : un uniforme global aurait imposé un lot de dessin
  par teinte, alors que quatre joueurs et le critique en demandent cinq. La
  couleur par défaut vient de `setFlashColor`, un quad qui n'en passe pas la
  reprend.
- **Le retournement de Y est absorbé par la projection.**
- **Le viewport est en pixels physiques.**
- **Un lot ne se vide qu'au changement d'état** (mélange, plafond, fin d'image).
- **`preventDefault()` dans `webglcontextlost` n'est pas facultatif** ; la
  restauration doit **retéléverser l'atlas**.

**Le chemin canvas 2D reste vivant** : repli automatique en perte de contexte
(`renderer.ok`), comparaison visuelle, mode dégradé.
`localStorage.setItem("survivor.renderer", "canvas2d")` y bascule. Plafond de
particules : **300 en 2D, 3 000 en WebGL**.


## Retour sensoriel

**LA FRÉQUENCE D'UN ÉVÉNEMENT DÉTERMINE INVERSEMENT SON BUDGET DE RETOUR.** La
satisfaction ne vient pas de l'impact individuel, elle vient de la forme de la
masse — à la minute 25 il meurt 20 à 60 ennemis par seconde, et si chaque mort
est un événement, plus rien n'en est un. Quatre paliers, et chaque retour déclare
le sien :

| palier | fréquence | budget |
|---|---|---|
| 0 · touche | centaines/s | l'éclair d'une image, rien de plus |
| 1 · mort d'un ennemi | 20-60/s | **jamais individuel** : le retour porte sur la CADENCE (échelle de tonalité), pas sur la mort |
| 2 · fait notable (critique, élite, récolte, touche de boss) | quelques/s | différencié par **couleur et hauteur**, jamais par taille et volume |
| 3 · moment de manche (niveau, barre de boss, relèvement) | ~30/manche | tout le budget : pouls, hitstop, tressaillement plein |

- **Tout se déclenche depuis la timeline interpolée, jamais depuis `latest`.**
  `EventPump` (`events.js`) ne diffuse un snapshot que lorsque l'horloge de rendu
  l'a franchi. Le canal `alert` est mis en file et sorti sur la même horloge.
- **Le tressaillement ne sort que sur les gros événements** (détonation, onde de
  choc, rupture de barre, bombe), jamais sur un impact ordinaire.
- **Le hitstop n'existe QUE pour les barres de boss et pour la MORT du boss**
  (`addHitstop`, 100 ms, 140 ms à la mort, au plus 30 par manche) : dans un
  survivor la fluidité du déplacement **est** le jeu. Il gèle l'horloge de
  **rendu** (`timeWarp.held`, retiré de `renderTime`), jamais la simulation, et
  se rattrape à **mi-vitesse** pour ne pas payer le gel en latence permanente.
  La mort est la **dernière barre** ; elle n'en avait pas parce que `_killBoss`
  n'émet pas `barre`, pas parce qu'elle n'y avait pas droit.
- **Un souffle se compose en COUCHES à constantes de temps distinctes** : noyau
  (2 images, né à sa taille maximale), boule de feu, onde de choc qui **dépasse**
  le remplissage, débris, fumée, marque au sol. Une montée progressive fait
  « animation », une naissance à pleine taille fait « détonation ». Tout est mis à
  l'échelle par la **magnitude** (`n`, le nombre de tués).
- **La matière qui bouge est ce qui dit la puissance** en vue de dessus
  (`_blastPush`) : l'impulsion est une **vitesse qui retombe**, jamais une
  téléportation, et le trou qu'elle ouvre suspend les apparitions 1,1 s.
- **Un arc est un tracé par déplacement de point milieu** (`drawArc`) : amplitude
  **décroissante** à chaque niveau, **double couche additive** (cœur clair fin +
  halo large — c'est ce doublage qui sépare « une ligne bleue » de « de
  l'électricité »), une à deux **branches mortes**, régénération à **17 Hz**, et un
  point brillant à chaque extrémité.
- **Le boss flashe par REJEU de sa silhouette** (`bossFlash`, 80 ms) : il est
  tracé à la main, hors de l'atlas, donc l'éclair du `flashAtlas` ne l'atteint
  pas. `bossSheet()` le neutralise comme il neutralise `bossCue`.
- **Le bandeau d'alerte disparaît AVANT la résolution** (durée d'annonce −250 ms).
- **Les chiffres de dégâts sont agrégés sur 200 ms et seuillés à 5 % des PV max**
  de la cible. **Ceux qui concernent un JOUEUR sont agrégés aussi**
  (`aggregateSelf`/`flushSelf`) — vol de vie et dégâts continus en produisent
  plusieurs par seconde ; seuil sur la valeur affichable, total sous le seuil
  **reporté** et jamais jeté.
- **Un dégât SUBI porte le glyphe de sa provenance, un dégât infligé non.** Le
  glyphe est dans la couleur du texte.
- Les chiffres ne s'affichent que sur le **boss** (`bd`) : chaque client ne lit
  **que** sa propre ligne.
- **Une silhouette de projectile par ARME, jamais une couleur seule** :
  `BOLT_CAPSULE` (tir standard ×1,0 · assaut ×0,85), `BOLT_DIAMOND` (tir
  hostile), `BOLT_RAIL` (railgun ×1,6), `BOLT_GRAIN` (dispersion ×0,7),
  `BOLT_BARIL` (grenade ×1,3), `BOLT_OBUS` (siège ×1,4), `BOLT_TRAIT`
  (précision ×0,8). Forme **et** taille se **déduisent** de l'arme du
  propriétaire (`silhouetteArme`, cuite une fois depuis `ARMES`) : le tuple
  d'une balle porte déjà son propriétaire, et le tuple du joueur son arme —
  **aucune clef d'instantané ne s'ouvre pour ça**. Le 5ᵉ champ de la balle reste
  la seule silhouette qui circule (`SIL_MISSILE`, `SIL_PORTEUR`), parce que ni
  l'un ni l'autre ne se déduit de l'arme. Laser, tesla et lame ne passent pas par
  `bullets` et ont chacun leur rendu. Le soin n'est plus un projectile : c'est un
  **arc**, et il se distingue par son **tracé** — calme et chaud pour le soin,
  agité et froid pour le siphon.
- **La portée d'une arme doit tomber DANS LE CHAMP DE VISION.** La vue fait
  1600 px et le joueur en voit 800 devant lui : une portée dont on ne voit jamais
  la fin *est* une portée illimitée, quel que soit le nombre dans la table. Le
  faisceau la rend visible par son **terminus**, dessiné même quand il ne touche
  rien — c'est lui qui l'apprend au joueur, pas un texte. Un faisceau continu n'a
  pas d'instant de départ : l'**allumage** (`faisceauAllume`, 90 ms plus large et
  plus clair) lui en donne un, et il revient à chaque sortie de saturation.
- **Les marqueurs posés sur un joueur sont des glyphes distincts en silhouette.**
- **UNE MÉCANIQUE DONT ON MONTRE LA CONSÉQUENCE AVANT QU'ELLE ARRIVE N'A PLUS
  BESOIN D'ÊTRE EXPLIQUÉE.** Le nœud du Tisseur porte l'**empreinte** de la zone
  qu'il va poser — un cercle de `NOEUD_R` en pointillés fins, sous lui, dès son
  apparition : le joueur voit la place qu'il va perdre, **à l'échelle réelle**,
  pendant les 9 s où il peut encore l'empêcher. Des **amarres** vers le boss
  disent qui tisse (même trait que `MECH_FEED`). À l'expiration le pointillé
  s'épaissit et se remplit, donc la zone au sol **naît** de l'empreinte au lieu
  d'apparaître sans cause ; à la destruction elle se **rétracte** vers le centre —
  le Tisseur est le seul boss où le joueur répare l'arène, ça doit se voir se
  refermer. **Le client sait pourquoi un nœud a disparu sans qu'on le lui envoie**
  (`noeudsVus`) : détruit, il s'en va avec du temps au compteur ; tenu jusqu'au
  bout, il s'en va à zéro.
- **Le sanctuaire se reconnaît à ses CROIX QUI MONTENT**, pas à sa couleur : sept
  croix, montée 2,6 s, **aucune allocation** (fonction de l'identifiant, du rang
  et du temps). Phase décalée par rang **et** par identifiant, dérive bornée par
  la **corde du cercle**, opacité en sinus.
- **Une zone se reconnaît à sa SIGNATURE avant sa couleur** : imminent =
  craquelures depuis le centre (`drawZoneCracks`) ; persistant = braises et fumée
  + pulsation **synchronisée sur `ZONE_TICK`** ; mobile = courant déduit du
  déplacement (`zoneMotion`, jamais transmis) ; accueillant = halo centripète +
  colonne (`drawMarkColumns`, seule chose au-dessus de la horde). Détonation →
  **décoloration du sol 2 s** (`scorches`). Trois plafonds : `zoneFx` (600), fumée
  **jamais** sur un télégraphe, télégraphe jamais plus voyant que la zone active.
- **Le rempart est interpolé** (`lerpList`), comme les marqueurs. Il **suit son
  tank sauf s'il est ancré** (`bw.anchor`, choix fait à la pose et gravé). Un
  propriétaire déconnecté ou à terre le laisse où il est.

### Le combat

**Quatre canaux disent quatre choses différentes, et aucun ne redit celle d'un
autre.** C'est la règle qui tient tout le reste : la **bouche** dit *quelle
arme*, le **projectile** dit *ce qu'elle envoie*, l'**impact** dit *combien ça a
coûté à la cible*, la **mort** dit *de quoi c'était fait*. Ajouter l'arme à
l'impact, ou la cible à la bouche, c'est payer deux fois pour une information.

**La fiche vit dans `shared/feedback.js`**, module pur au même titre que
`palette.js` : deux tables, une par sujet — ce qu'une **arme** dit en partant, ce
qu'une **créature** dit en mourant.

- **La famille se DÉDUIT d'un champ de mécanique**, jamais d'une déclaration :
  `chaleur → faisceau`, `lame`, `rebonds → électrique`, `charge → rail`,
  `plombs → dispersion`, `obus`, `souffle → explosif`, sinon balistique. Même
  idiome que `silhouetteArme()` et `canonEffet()` — une onzième arme hérite d'un
  retour cohérent sans une ligne de table.
- **Trois familles n'ont NI son de départ NI bouche**, et c'est une décision :
  faisceau, électrique et lame ont déjà un départ (l'allumage, l'origine de
  l'arc, le balayage). Le doubler serait la même faute deux fois. `son` et
  `bouche` sont donc nuls **ensemble** — `verifierFeedback()` le vérifie.
- **La famille donne la matière, `interval` donne l'échelle.** `poids(a)` est
  relevé sur la cadence, jamais déclaré : hauteur, gain et durée de queue en
  sortent. La saturation en haut est voulue — au-delà, « lourd » est lourd.
- **Un échantillon se coupe à la cadence qui l'appelle.** 260 ms rejoués neuf
  fois par seconde sont un mur, pas une arme rapide.
- **La clé du limiteur est la FAMILLE, pas le joueur** : quatre joueurs sur la
  même arme se partagent une place. C'est ce qui rend l'identité gratuite —
  quatre fois la même arme rapide rend exactement le compte de sons d'avant.

**La bouche** (`bouches`, `drawBouche`) :

- **Elle est attachée au CANON, pas au monde.** Le tir est enregistré par
  propriétaire et tracé à la position **rendue**, dans l'axe où le joueur pointe.
  Une position monde figée décroche du personnage dès qu'il bouge, et c'est le
  décrochage qui se voit — pas les 50 ms de retard de visée. **L'événement `tir`
  ne porte donc pas d'angle** : un champ dont le lecteur contredit la valeur ne
  vaut rien.
- **23 px**, mesuré sur les trois tracés de classe (tireur 24, rempart 23,
  soigneur 21). Un seul nombre, l'écart ne se voit pas.
- **La forme se lit sur la FAMILLE**, jamais sur un champ : « c'est une gerbe »
  écrit à deux endroits finit par diverger. Elle **naît à sa taille maximale**,
  même règle que le noyau d'un souffle.
- **LE PERSONNAGE NE RECULE PAS.** Un recul de tir a été essayé et retiré : dans
  un survivor le corps du joueur est ce qu'on lit en permanence pour esquiver, et
  le faire bouger pour une raison qui n'est pas un déplacement le rend illisible
  — d'autant qu'à six tirs par seconde il ne revient jamais au repos. Le départ
  se dit **devant** le personnage, jamais sur lui.

**L'impact** — quatre paliers, et **c'est la cible qui les décide** :

- La part de PV max retirée dit à la fois la puissance du coup **et** la masse de
  ce qui l'encaisse. Le même rail rend LOURD sur un fantassin et LÉGER sur un
  colosse : « un ennemi lourd réagit moins » sort du même nombre, **sans table de
  masse**.
- **UN TICK DE BRÛLURE N'EST PAS UNE TOUCHE**, et le serveur le dit déjà —
  `_damage(..., overTime)` n'incrémente pas `hitSeq`, donc `hits === 0`. Le
  forcer à un faisait passer **81 %** des événements d'impact pour des touches,
  avec éclair blanc, recul directionnel, étincelles et voix, pour un poison.
- **Cet éclair ne peut pas disparaître** : rien ne rend l'état « brûle » sur un
  ennemi, la brûlure n'est pas dans l'instantané. Il passe au **violet** —
  *persistant* dans la grammaire de couleur — et cesse de se lire comme un ennemi
  qu'on frappe.
- **L'axe vient du projectile, jamais du joueur le plus proche.** Une balle
  éteinte donne la **ligne de tir** (des centaines de pixels, stable même quand
  elle meurt sur le corps) ; une balle **perforante** donne sa vitesse exacte —
  sans elle, le railgun et la précision n'avaient aucun auteur. Faute de
  projectile (zone, brûlure, arc, balayage), le joueur le plus proche **est** la
  source, et là c'est exact.
- **La poussière est de la matière du LIEU**, et le lieu la déclare déjà :
  `skin().blocEdge`. Aucune table de plus. Elle part **à contre-sens** et
  lentement — les étincelles disent où va l'énergie, la poussière ce qui s'est
  détaché.

**La mort** — la matière se déduit du comportement :

- `splits` → un sac ; `heal` ou `auraRadius` → de l'énergie ; le reste → une
  carapace. **L'axe est la matière, pas le métal contre l'organique** : l'arène
  est une machine, les monstres sont ce qui s'y est introduit, il n'y a pas
  d'ennemi en tôle.
- **La hauteur dit la MASSE**, relevée sur `r`. Elle disait l'**index** de la
  table — donc l'ordre d'arrivée : le coureur sonnait plus grave que le
  fantassin, le colosse plus aigu que le couvain.
- **Les trois timbres partagent la clé `mort`** : le palier 1 porte sur la
  *cadence* des morts, pas sur la mort. Seuls le soigneur et le chœur **prennent
  la place** (`claim`) — les deux cibles prioritaires du bestiaire, et seulement
  en cauchemar après la minute 19.

**Le boss** :

- **Sa touche se mesure en PART DE BARRE**, jamais en PV : ce que le joueur lit à
  l'écran est une barre, et `bars` est déjà dans l'instantané. **En racine** — en
  linéaire, 82 % des touches tombaient sur le plancher et tout le milieu du
  barème était vide.
- **Son événement d'impact ne porte pas de `hits`** (il n'y a pas de `hitSeq` sur
  un boss) : il sort **en premier et par un chemin complet**, sinon le barème de
  la horde le classe « continu » et le rend muet.
- **Les éclats du critique appartiennent au critique.** Ils sortaient à chaque
  coup, vingt fois par seconde : un critique ressemblait donc exactement à un
  coup ordinaire.
- **Sa mort se déduit de son ABSENCE** — `_killBoss` n'émet aucun effet — et la
  garde est la **dernière barre**, sinon une remise à zéro de manche se lit comme
  une mort. **Cinq échéances** (0 / 90 / 200 / 360 / 620 ms) : c'est l'étalement
  qui fait l'événement, tout au même instant ne fait qu'un flash.

**`verifierFeedback(armes, types, recettes)`** croise les deux tables avec ce
qu'`audio.js` expose (`recettes()`). Un nom de recette faux ne lève rien :
`playSound` rend `false` et l'événement devient **muet**. Muet = tout va bien,
comme `verifierBiomes()`.

### Audio

- **DEUX SOURCES, UN SEUL RÉGLAGE** (`survivor.audio.source`, tenu par
  `audio.js`) : `pistes` (défaut) ou `synthe`. Il commande **musique et son de
  tir** ensemble.
- **Le repli est AUTOMATIQUE des deux côtés** : échantillon absent → recette
  synthétisée (test sur le **tampon chargé**, jamais sur le réglage) ; piste
  introuvable → `setTrackFallback` posé par `music.js`. Le repli ne réécrit pas le
  réglage.
- **`music.js` est l'aiguillage** : `startMusic`, `stopMusic`,
  `setMusicIntensity`, `setMusicScene`. La synthèse lit une **intensité
  continue**, les pistes une **scène discrète**. La boucle de rendu pousse les
  deux depuis la **même** source.
- **LES PISTES NE JOUENT QU'EN MANCHE** (`route()`, point unique). Hors manche la
  synthèse reprend (scène `menu`), y compris en source `pistes`.
- **Fondu croisé à PUISSANCE CONSTANTE, armé seulement à `canplay`.** Compteur de
  séquence contre l'enchaînement rapide ; le différé de coupure vérifie que la
  platine sortante n'a pas été **reprise**.
- **La musique s'étouffe quand un menu s'ouvre par-dessus la partie**
  (`AUDIO_CFG.MUSIC_DUCK` = 0,45), sur le **bus** (`setMusicDuck`), en **rampe**
  (descente 0,30 s, remontée 0,70 s), jamais mémorisé, composé avec le volume
  musique. Déclencheur : un **second `MutationObserver`**, à part de celui de la
  barre supérieure.
- **Les assets audio sont la SEULE chose du dépôt mise en cache HTTP.**
- **L'interface sonne au SURVOL, et la cible est celle du pointeur** : **ce qui
  montre le crochet `--cursor-go` sonne, ce qui ne le montre pas est muet**. Un
  bouton désarmé ne sonne pas. Délégation sur `document`. Trois gardes :
  `lastHovered` (`pointerover` se déclenche pour chaque descendant),
  `UI_SOUND_GAP` (70 ms), `pointerType !== "mouse"`.
- **Le survol est un TICK, jamais une note** (`survol`, 18 ms de bruit
  passe-bande, aucune composante tonale).
- **La sélection sonne à l'APPUI** (`pointerdown`), et porte plus loin que le
  survol (elle suit l'**action** : `#cards` et `#build` en sont). Aucune garde de
  délai. Pas de filtre tactile.
- **`selection` MONTE et ne contient aucun bruit** : trois sinus, montée d'un
  **ton** (740 → 880), octave au quart, quarte grave, attaque **12 ms**.
- **Trois degrés dans la même famille, qui disent l'ENGAGEMENT** : inflexion pour
  un choix (`selection`), deux notes pour un engagement (`pret`, tierce 587 → 740
  recouvertes de 30 ms), accord résolu à l'octave pour le départ (`lancer`,
  392 · 494 · 784). Les deux premiers ne résolvent pas.
- **Une bascule ne rend jamais le même son dans ses deux sens** (`pretAnnule` =
  la tierce descendante, plus courte). Classe lue **à l'appui**.
- **`uiSoundFor()`** est une table par identifiant consultée dans la délégation,
  pas un `onclick`. Un bouton absent rend `selection`.
- **Le décompte de lancement TICKE, une fois par seconde tombée** (`tick`, 14 ms
  de bruit passe-bande). Même matière que `survol` et plus grave (2200 → 1500
  contre 3400 → 2200) : les deux disent « il se passe quelque chose » et non « tu
  as fait quelque chose » — un tick de décompte qui sonnerait comme une note se
  lirait comme une réponse à un geste, or personne n'a rien fait, c'est le temps
  qui passe. Le grave le place aussi **sous** le souffle qui va suivre : l'un
  compte, l'autre conclut. Il part sur le chiffre **affiché** qui change et non à
  chaque passage — `renderLaunch` tourne cinq fois par seconde et `refreshPanel`
  la rappelle à chaque diffusion du salon — donc **aucun tick sur la première
  valeur** (le clic vient de rendre `lancer`, deux sons pour un événement) ni sur
  `1 → 0`. Mesuré : exactement deux ticks, `3 → 2` et `2 → 1`.
- **Le souffle de lancement part du message `round`**, pas du clic de l'hôte —
  donc par la file du monde. `lancement` **monte avant de descendre** (paramètre
  `attack` de `noise`).


## Charte visuelle

Direction : **signal et instrumentation**. L'arène est une machine, les monstres
sont ce qui s'y est introduit — décor froid, précis, saturation sous 18 % ;
créatures chaudes, asymétriques, saturation forte. **Contour systématique sur
toute créature, aucun sur le décor**, et **jamais de noir pur**.

- **Le test de la silhouette est un critère d'acceptation** : `?planche` sort tous
  les sprites en noir uni sur fond blanc (`silhouetteSheet()`). Un type
  reconnaissable seulement par sa couleur a raté le test. **Le regarder en
  résolution native** (à 64 px une fente de deux pixels ne se voit pas).
- **Une teinte par type, six valeurs dérivées** (`ramp()`) : ombre, base,
  lumière, accent, contour, **contre-jour**. Le **décalage de teinte** dans
  l'ombre et la lumière, jamais un simple assombrissement. Le **contre-jour**
  passe **avant** le contour.
- **Recette en sept couches, appliquée uniformément** : silhouette, ombrage
  décalé et écrêté, lumière en arc haut-gauche, contre-jour, contour, accents,
  asymétrie du même côté. Si un type demande un traitement particulier, c'est le
  **type** qu'il faut revoir.
- **Les trois grandeurs d'éclairage suivent la TAILLE de la forme**
  (`pathExtent()`, **mesurée** et non déclarée ; on retient la **plus petite** des
  deux dimensions). L'arc est centré sur la forme réelle, pas sur l'origine.
- **Trois principes d'animation, aucun ne coûte une image d'atlas** :
  anticipation, écrasement/étirement par `scale`, action secondaire par
  particules. **Respiration déphasée par identifiant.**
- **Une seule source de vérité pour les couleurs : `shared/palette.js`.**
  `render/stage.js` pose les variables CSS sur `:root` depuis `cssVars()` —
  **jamais l'inverse**. `tokens.css` ne contient aucune couleur. L'échelle
  typographique (`TYPE`) suit la même règle.
- **DEUX PALETTES, SÉPARÉES PAR LA PORTÉE.** L'interface **hors partie** est en
  graphite chaud et ambre ; l'**arène, le HUD et les entités** gardent l'indigo
  d'origine et leur grammaire — cyan « il faut y aller », ambre « danger,
  sortir ». Les mêmes valeurs partout auraient forcé un choix : repeindre le jeu,
  renoncer à la charte, ou — pire — laisser `--go` valoir l'ambre en combat et se
  confondre avec `--warn` à deux cents ennemis, exactement le défaut que ce
  fichier documente pour `bullet` / `shot`.
- **La séparation est une PORTÉE, jamais un second jeu de noms.** `UI_THEME`
  (`palette.js`) est exposé en `--ui-*` sur `:root`, et `menus.css` le remappe
  sur `--text`, `--go`… au niveau de `.overlay`, `#topbar` et `#pause`. Les
  descendants héritent, le reste de la page garde les valeurs de jeu, et aucune
  des deux cents références de la feuille n'a eu à changer de nom. `#cards`,
  `#build` et `#pause` sont du **menu** bien qu'ils s'ouvrent une manche en
  cours : ce sont des écrans posés par-dessus le jeu, pas le jeu.
- **Une couleur qui porte du TEXTE prend sa version foncée.** Une teinte réglée
  pour un aplat se dissout dès qu'elle devient un mot : `--go-ink` (`#c07a12`) et
  non `--go` sur fond clair, `--on-go` (`#241703`) pour le texte posé **sur** un
  aplat ambre. Même teinte, autre densité.
- **Une surface cliquable est plus claire que celle qui la porte**, liseré clair
  en haut et ombre en bas ; une surface passive est enfoncée, filet presque
  absent, aucune ombre. Sans cet écart, ce qu'on lit et ce qu'on presse retombent
  sur le même ton. Le liseré est une **arête de lumière** et non un contour : un
  pixel, en haut seulement — il dit d'où vient la lumière, donc que la surface
  dépasse. Sa règle est volontairement **faible** (`.overlay button`, 0-1-1), et
  c'est ce qui laisse les actions principales (1-0-0) garder leur aplat sans
  avoir à les nommer ; écrite en `#gate button` elle passait devant et « Se
  connecter » perdait son ambre. `.link` et `.ghost` en sont exclus — une arête
  sur un élément sans fond dessine un cadre autour de rien.
- **La couleur est fonctionnelle, jamais esthétique** : ambre `action, il faut y
  aller` · orange `avertissement` · rouge `danger létal` · blanc `ça concerne un
  allié` · violet `persistant` · vert `gain, soin, prêt`. **Jamais de rouge pour quelque chose
  où il faut aller.** Les couleurs d'**identité** (classes, types, bonus) sont une
  famille à part. Seule dérogation : la catégorie **offensif** est rouge sur
  l'écran de cartes, hors combat — ne pas l'étendre au monde.
- **Un seul vert pour le soin, `HEAL`** (alias de `SIGNAL.gain`) : bonus, balise,
  tir du soigneur, vague de soin, sanctuaire, mode soin, chiffres verts.
  `CLASS_COLOR.soigneur` reste l'identité du **joueur**.
- **La couleur dit la classe, et la forme aussi** : Rempart bleu, Soigneur vert,
  Tireur ambre ou violet. `PLAYER_COLORS` renvoie vers `CLASS_COLOR` ; l'ordre est
  celui de l'attribution (0 tank, 1 soigneur, 2 tireur A, 3 tireur B).
- **`assignColors()` (`room.js`) — trois règles indissociables** : les tireurs
  **empruntent** les couleurs de classe unique restées libres (`unique` = « au
  plus un ») ; tri **par identifiant** ; **jamais en pleine manche**
  (`startRound()` appelle avant de basculer la phase). Recalcul **à la
  diffusion**.
- **Le mode soin se signale par un anneau pulsant** (bande `RING_SKILL`), pas par
  la couleur.
- **Chaque rareté a un matériau** : bordure plate, bordure épaisse, lueur externe,
  dégradé balayé. La légendaire est la **seule** animée.
- **Échelle typographique fixe : 13 / 15 / 18 / 22 / 29 / 38 / 50.** Aucune valeur
  ad hoc. Quatre **planchers** en combat : PV, touches en gras, noms d'équipe,
  chronomètre.
- **Espacement sur une grille de 4 px** : 4 / 8 / 12 / 16 / 24 / 32 / 48.
- **Angles durs**, rayon 2 px maximum. **Le seul cercle du jeu est une entité
  vivante.** Exception bornée aux **menus** (`menus.css`) : `--radius-ui: 16px`,
  `--radius-ctl: 12px`, couvrant aussi `#cards` et `#merchant`. Gardent 2 px :
  `#hud`, `#build`, `#pause`, `admin.html`.
- **`--bevel` et `--glow-go` ne coexistent pas** : un `clip-path` clippe le
  `box-shadow`, qui est extérieur. Ce qui désigne l'action principale est la
  **lueur**.
- **Le pointeur est dessiné par la charte** (`cursorUri()` dans `palette.js` →
  `--cursor-ui`, `--cursor-go`) : angles durs, couleur fonctionnelle, contour
  systématique, la **forme** change en plus de la couleur. Deux états seulement,
  point actif sur la **pointe** (`2 2`). Hors liste : `#cards`, `#build`, l'arène
  (`crosshair`), `admin.html`.
- **Trois familles typographiques** : `--font-display` (Chakra Petch 600/700) pour
  titres, boutons, noms propres ; `--font-body` (Space Grotesk variable) pour les
  **paragraphes seuls** ; `--font` (chasse fixe) pour chiffres, effectifs,
  pourcentages, libellés techniques, pastilles. Versionnées dans `public/fonts/`,
  repli sur `var(--font)` et `system-ui`. `@font-face` déclare une **plage**
  (`font-weight: 300 700`), `--weight-body: 450`, interligne des paragraphes
  **1,6**.
- **Trois niveaux de lecture, un élément n'en porte qu'UN** : **kicker**
  (`.sectionTitle`, chasse fixe, capitales espacées, `--go`) = *où je suis* ;
  **titre d'écran** (Chakra Petch, `--text`, casse normale) = *quoi* ; **corps**
  (Space Grotesk, `--text-dim`, mesure ≤ 62 caractères) = *pourquoi*.
- **Les écrans d'avant-partie coulent depuis le HAUT**, dans une colonne bornée.
  `#loading` reste centré.
- **Trois coques et UNE gouttière** : `--shell-narrow` (1080px, paramètres),
  `--shell` (1440px, hub/bilan/progression), `--shell-wide` (1680px, salon),
  `--gutter: clamp(24px, 3.4vw, 48px)`. Les règles qui décident portent un
  **identifiant** (`#hubScreen > *`…) ; les `max-width` des conteneurs doivent
  rester d'accord, d'où le même token des deux côtés. Les paragraphes gardent
  `max-width: 62ch`.
- **L'action principale du salon est ANCRÉE en bas de fenêtre**, `#waitMsg` à sa
  gauche. Fond **opaque**, jamais un dégradé. `.panelBar` est un enfant **DIRECT**
  de `#panel` (elle est `position: fixed`). Le `padding-bottom` de `.panelWrap`
  doit rester ≥ la hauteur de la barre.
- **`menus.css` ne peut pas produire cette mise en page seul** : les conteneurs
  sont **ajoutés dans `index.html`**, de façon strictement **additive** — aucun
  `id` renommé, aucune classe posée par `ui/screens.js` touchée (`.mine`,
  `.winner`, `.taken`, `.running`, `.err`, `.equipped`, `.r0`–`.r3`, `.picked`,
  `.faded`).
- **La barre supérieure OBSERVE l'état des écrans, elle ne le pilote pas**
  (`syncTopbar()`, `MutationObserver` sur `hidden`). Enfant direct de `<body>`,
  **avant `#stage`**. `#topbar:not([hidden]) ~ .overlay` décale de 56 px.
- **`goHome()` promet UNE chose : d'où qu'on clique, on arrive au hub.** Ordre :
  confirmation **d'abord**, puis fermer ce qui se superpose **sans rien
  restaurer**. `roomClosed` ferme les mêmes écrans (c'est le point de passage de
  la **sortie**, `goHome()` celui du **geste**).
- **Un seul point d'entrée vers la progression** : `.classMetaBtn`, **sous** la
  carte de classe choisie (jamais dedans — `.classOpt` est un `<button>`).
  Pastille reposée **à chaque rendu** (drapeau `metaSpendable`). Losange, jamais
  un rond. `.fresh` n'est posé que si la classe a **vraiment** changé.
- **L'unité de la monnaie s'écrit en toutes lettres** : « 650 noyaux ».
- **`admin.html` ne charge NI le client NI `shared/palette.js`** (un module dont
  l'import échoue ne s'exécute pas du tout). `admin.css` recopie la palette :
  **seule duplication autorisée**, commentée des deux côtés. Angles **durs**,
  kicker **ambre**.
- **Rien ne se sélectionne, sauf ce qu'on écrit.** Règle posée sur `html` et non
  sur `*` (la propriété s'hérite ; une règle universelle écraserait l'exception).
- **Rien de décoratif ne se superpose au jeu.** La grille et le vignettage sont le
  **sol**, gradué en mètres (5 m fin, 20 m marqué) — les sections éteintes de
  cauchemar ne touchent que les traits fins. **Le vignettage de cauchemar pulse**
  (période 2,6 s, amplitude 6 %), seule animation d'ambiance.
- **La difficulté ne change pas les CRÉATURES, elle change LA MACHINE** (`DECOR`)
  : sol, grille, vignettage seulement, aucune réattribution des six rôles.
- **LE MODE PORTE LA CLARTÉ, LE BIOME PORTE LA TEINTE.** `teinter(base, teinte,
  k)` importe la **chroma** du biome en gardant la **clarté** du mode ; jamais un
  `melange()` (les teintes de biome sont presque noires). Normalisation sur la
  luminance **Rec. 709**.
- **La matière du sol est une TUILE CUITE** (`render/material.js`), période
  400 px = `GRID_MAJOR`, **transparente**, cuite une fois par
  `(biome, mode, graine, densité)`, donc **un `fillRect`** par image. `usure` ne
  change ni la teinte ni la géométrie.
- **Un OBSTACLE a une silhouette, et elle appartient à son biome.** Volume = face
  supérieure décalée vers le centre de la vue, décalage **plafonné** (7 px) ; la
  face du sol est tracée **à la place exacte de la boîte de collision**.
  Ébréchure déterministe par position.

### Écrans

- **Un changement d'écran est un CROISEMENT, jamais une coupure** : sortie 280 ms
  (`--ease-in`), entrée 380 ms (`--ease-out`), retrait `--screen-hold` **120 ms**
  avant l'entrée. Le contenu glisse **dans le même sens** aux deux bouts.
- **Ce sont les VOILES qui se croisent, jamais les contenus** (`--content-out`,
  160 ms) : deux contenus lisibles ensemble = double exposition.
- **Aucun appelant ne change** : `ui/screens.js` pose `.leaving` depuis le
  `MutationObserver` déjà en place, `menus.css` maintient l'écran affiché. Une
  classe, pas `transition-behavior: allow-discrete` (son repli est la coupure
  nette).
- **`.settled` ne se retire qu'à la FIN de la sortie**, sinon `riseIn` se rearme
  et la page qui part se rallume ligne par ligne. Retiré aussi sans condition à
  découvert, pour qu'une réouverture rejoue la cascade.
- **Un enregistrement de mutation ne veut PAS dire un changement** : comparer
  `oldValue` à l'état courant (plusieurs chemins reposent `hidden = true` sur un
  écran déjà caché).
- **Trois pièges de composition** : le voile ne fait qu'une **opacité** (`scale`,
  `translate`, `filter` créent un bloc conteneur et feraient sauter `.panelBar`) ;
  glissement et flou vivent sur le **wrapper** ; `pointer-events: none` sur le
  sortant.
- **Le voile du briefing n'attend PAS `--screen-hold`** (ce qu'il découvre est
  l'arène, pas un fond neutre) — fondu court `--brief-in` (180 ms). La **sortie**
  ne change pas. `.briefWrap` garde son `screenIn` retardé.
- **Les cinq dernières secondes du briefing passent à l'AMBRE** : classe posée sur
  le **conteneur**, seuil testé sur la valeur **affichée** (`Math.ceil`), et le
  chiffre **pulse** en plus de changer de couleur. `closeBrief()` retire
  l'urgence.
- **Choisir une carte MUTE la rangée, ça ne la reconstruit pas** (`riseIn` en
  `both` repartirait d'une opacité nulle). `renderCards()` reste le chemin des
  vrais changements d'offre. `#cardsRow .cardOpt.faded` doit reprendre
  `#cardsRow` (spécificité) et la carte choisie reprendre `opacity: 1` (elle est
  `disabled`).
- **Sur l'écran de cartes, l'effet est la ligne la plus grosse, pas le nom.** Une
  icône par **famille**. Chaque carte dit sa **catégorie** et son **rang** dans la
  build (`cardCategory()`, priorité `coop` → `off` → `def` → utilitaire).
- **Le bilan et le salon sont deux écrans.** Le bilan titre sur l'**étape** (son
  NOM) ou sur la **victoire**, jamais sur le numéro de manche. Il porte la
  **répartition des dégâts subis** agrégée sur l'**équipe**, en **barre empilée**
  + légende (`SRC_TINT`), rien si personne n'a rien pris. **Il ne se ferme plus
  tout seul** : deux boutons, aucun minuteur.
- **La fenêtre de build est UN écran pour trois entrées** (Tab, ligne du bilan,
  ligne du salon) ; on passe d'un joueur à l'autre **sans refermer**. Sa ligne la
  plus importante est celle des **multiplicateurs** (« ×1,84 », jamais « +84 % » ;
  la **cadence s'affiche inversée**). Trois sections nommées, cartes en **deux
  colonnes**. La **troisième compétence figure toujours**, même absente
  (description de la carte tirée, repérée par `excl: "skill3"`).
- **Un multiplicateur affiché sans échelle n'informe personne** : repères
  **mesurés** (`POWER_MARKS` dans `ui/build.js`) — à remesurer si le catalogue ou
  les raretés bougent.
- **L'ambre dit « c'est toi »** : nom en tête de la build, colonne score de sa
  propre ligne au bilan.
- **Le menu pause n'est pas un `.overlay`** (à plusieurs la partie continue
  derrière). Ouvrir le menu **arrête le personnage** (`readMove()` sort à vide).
- **Échap rend d'abord le menu, puis le ferme** : le gestionnaire de la build
  coupe la propagation avec **`stopImmediatePropagation`** (les autres
  gestionnaires sont sur le **même** nœud, `window`).
- **`enSaisie()` teste le TYPE de champ, jamais `tagName === "INPUT"`** : un
  `input[type="range"]` garde Espace et les flèches au **jeu**. On sort **avant
  `keys.add`**, pas seulement avant `preventDefault`.

### Enregistrer un nouvel écran

Neuf endroits, aucun facultatif — un oubli ne produit jamais d'erreur.

| Où | Quoi |
|---|---|
| `public/index.html` | le markup, plus le commentaire de la barre s'il la masque |
| `ui/dom.js` | les nœuds, en `const` exportées |
| `core/state.js` | le drapeau d'ouverture (`xOpen`) **et** son setter |
| `ui/screens.js`, tableau `screens` | l'observateur qui pose `.settled`/`.leaving` |
| `ui/screens.js`, `TOPBAR_SCREENS` **ou** `masque` | fil d'Ariane, ou masquage — jamais les deux |
| `ui/screens.js`, `UI_SOUND_SCREENS` | sans quoi ses boutons sont muets |
| `ui/screens.js`, `refreshPanel()` | la garde, si l'écran doit tenir le salon fermé |
| `menus.css` | `fadeIn`, `screenIn` sur le wrapper, `[hidden].leaving`, `contentOut`, `[hidden] { display: none }` |
| `menus.css` | les deux listes de curseur, et la liste `#… small` |

