# Rendu, charte visuelle, retour sensoriel, audio, écrans

**Quand lire ce fichier :** on touche à `public/render/*`, `sprites.js`, `gl.js`, `hud.js`, `audio.js`, `public/css/*`, ou à un écran de menu.

### Silhouettes de la horde

- **UN CORPS SE RECONNAÎT SANS SA COULEUR, et c'est VÉRIFIABLE.** À treize types
  la roue de teintes est saturée — harceleur (jaune) contre porte-bouclier
  (ocre), générateur (bleu ciel) contre soigneur (turquoise). La silhouette
  porte donc seule, et `verifierSilhouettes()` (`sprites.js`) refuse deux types
  qui se ressemblent sur les **cinq** axes à la fois : élancement, remplissage,
  sommets, avance, matière.
- **`SILHOUETTES` vit HORS de `plan()`** : une charte qu'on ne peut pas rejouer
  n'est pas une charte. `repos` est l'état neutre — un corps ne s'annonce pas
  par sa pose d'attaque.
- **L'aire signée n'a aucun sens sur ces formes** : un corps est fait de
  sous-tracés **disjoints** dont les enroulements s'annulent. `remplissage` se
  mesure sur l'**enveloppe convexe** ; `matiere` (somme des aires de chaque
  sous-tracé sur l'enveloppe) est le seul axe qui sépare un **anneau** d'un
  **disque**, et c'est lui qui distingue le générateur du kamikaze.
- **Ne pas sculpter une silhouette CONTRE la mesure.** Elle dit qu'une paire est
  confusable ; elle ne dit pas quoi dessiner. Un écart qui ne se voit pas à
  l'écran ne se corrige pas au chiffre.
- **Chaque type a son éclatement** (`DEATH_BURST`, `render/fx.js`) : la table
  s'arrêtait à neuf entrées et `?? DEATH_BURST[0]` faisait le reste **en
  silence** — quatre types mouraient en fantassin. `cone` porte l'intention :
  7 vaut « dans toutes les directions », une valeur étroite projette **dans le
  sens du déplacement**.
- **Ce qu'un corps fait se lit sur l'instantané, jamais sur une clé de plus** :
  la coque d'un voisin dit que le générateur travaille (`e.shield`),
  l'appariement dit que le relais tend son arc (`e.pair`), `wu` dit qui
  s'apprête. Une coque se dessine sur le corps **qui la porte**, pas sur sa
  source.

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
- **Un prop est de la matière, pas un signal** : un signal est **saturé**, une
  matière est désaturée. C'est la seule règle qui empêche le décor de mentir
  maintenant que l'ambre n'est plus réservé à l'avertissement.
- **UN PROP QUI BOUGE N'EST PAS UN SIGNAL, à une condition qui se vérifie : son
  mouvement est CONTINU et PÉRIODIQUE**, donc il n'a ni début ni fin, donc il
  n'annonce rien. Un télégraphe a un début et une **échéance** — c'est ce qui le
  rend lisible, et ce canal-là appartient au boss. Une bouffée d'évacuation a
  donc une enveloppe **douce des deux côtés** : un flanc franc ferait une
  échéance. Le dépôt avait déjà assoupli la règle sans le dire — un tube mort
  grésille, un voyant respire, du métal en fusion ondule, une balise bat : **le
  comportement est un canal de matière**. L'Usine est le lieu qui l'exploite le
  plus, parce que c'est le seul dont le verbe soit au présent.

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
- **Ce qui blesse exhale sa propre matière** : `SOUFFLE[biome][kind]`
  (`dangers.js`), une entrée par danger chaud posé, lue par `drawAtmosphere` —
  `dangers.js` **déclare**, `decor.js` **lit**, même contrat que la bouche
  d'évacuation d'un bloc et le regard de coulée. Un seul brin gris pour les douze
  rendait un danger lisible au sol et muet dans l'air, juste au-dessus d'une
  table qui avait déjà payé le travail de le distinguer.
  **Table parallèle à `DANGER`, jamais une déduction depuis le `kind`** : c'est
  le *lieu* qui décide si la flaque fume chaud ou dérive lourd. La teinte de
  chaque entrée est celle que son dessin au sol porte déjà — rien de neuf à
  apprendre. Et l'angle est un canal à lui seul : la seule entrée qui ne monte
  pas est la flaque toxique de la Friche, parce qu'un gaz plus lourd que l'air se
  sépare d'une vapeur à l'œil **avant** toute couleur.
  `verifierDangers()` croise les deux tables dans les deux sens et sur trois
  questions — blesse sans souffle, souffle jamais posé, souffle sur un danger
  **froid** : `souffleDe` replie en silence sur le brin gris d'avant, et un lieu
  oublié ne se signalerait que par un danger chaud qui exhale du vent.

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
- **DEUX BOSS DE POOL NE PRENNENT PAS L'ARÈNE DE LA MÊME FAÇON**
  (`verifierPrises(BOSS_SKIN)`, dans `bosses.js`, la table en **argument**).
  Miroir exact de `verifierArchetypes()` sur l'autre moitié de l'identité :
  l'archétype dit comment le boss déforme l'espace, la prise dit ce que le
  **monde** en fait. Cinq lignes recopiaient celle de l'Amalgame au caractère
  près — dont **trois boss de pool**, que le commentaire de la table appelait
  « les finals » parce qu'ils avaient été ajoutés en queue après son écriture.
  Rien ne levait : la table était bien indexée et les couleurs de corps
  différaient.
- **L'atmosphère a sa propre règle**, et ce n'est pas une redite du tuple : c'est
  le seul champ qui traverse le centre. Deux boss aux profils différents mais au
  même souffle se ressemblaient là où ça se voit — le Prisme portait celui des
  Jumeaux.
- **Les deux finals par difficulté gardent le droit de ressembler au final** (un
  seul sort par manche) mais ne s'y confondent plus : le Récitant est le même
  combat en plus clair, le **Silence n'a aucun battement**, ce qui est exactement
  son verbe.

### Quatre lieux, pas quatre couleurs

**Même univers ≠ même environnement.** Le socle est commun — sci-fi industriel
sombre, ambre de signal réservé au gameplay, télégraphes jamais concurrencés —
et **la différence est structurelle** : forme, matière, source de lumière,
danger, implantation.

| | FRICHE | USINE | FONDERIE | NÉBULEUSE |
|---|---|---|---|---|
| **verbe** | a été laissée | fabrique | coule | flotte |
| **bloc** | **pan fissuré, mur banché, carcasse** | **chaîne, cellule, poste** | **four, conduite, cuve** | **travée, fragment, débris** |
| **sol** | dalles et joints de coulage | tôle et maille de 5 m | plaques, voies, vitrifié | nid d'abeille |
| **pas de 20 m** | marquage peint effacé | trait franc | nœuds seuls | nervures du pont |
| **contour de bloc** | presque aucun | franc | sourd | franc |
| **source** | presque rien | bandes LED ambrées | la gueule des fours | feux de position froids |
| **implantation** | deux champs de ruines | bandes : chaîne, allée, chaîne | deux masses, un couloir | contraste de taille, centre vide |
| **bord** | grillage affaissé | passerelle et conduites | cheminées et fumée | voilures et râtelier d'antennes |
| **props** | brousse, jonchée, grillage tombé, carcasse, bidon, panneau | convoyeurs, bras, presses, ventilations, palettiers | poches, lingotières, trémies, outillage, rigoles | **rien de commun** : épaves, voiles, modules, cristaux, antennes |
| **ce qui traverse** | rien, et c'est le sujet | les bandes de chaîne | **le canal de coulée** | les nervures du pont |
| **air** | ce que la brousse relâche : vert, lent, rare | **extraction : droite, rapide, tenue** | **la chaleur qui monte : lente, épaisse** | débris croisés, froids |
| **couche de 1 200 px** | lessivage parallèle, colonisation | nappes rondes | **trois foyers larges, aucun clair** | **l’ombre de la charpente au-dessus** |
| **mouvement** | un néon qui grésille | **la chaîne bâtie qui défile**, bandes, bras, presses, chenille, bouffées | **le joint qui fuit, la peau de la cuve**, la fonte | la balise qui bat, le cristal qui respire, **les feux du plan intermédiaire** |

**Le critère de non-régression** : si on échange les quatre noms et que les
captures restent difficiles à attribuer, le travail n'est pas fini. Il a **deux
moitiés, et l'une s'exécute** :

- `signatureBiome()` décrit une loi d'implantation en quatre nombres — densité,
  encombrement, contraste de taille, élongation — et **`verifierBiomes()` refuse
  que deux lieux se ressemblent sur les quatre à la fois** : un axe doit les
  séparer d'au moins 40 %. Ce n'est pas théorique, c'est arrivé — la Nébuleuse a
  porté la loi de l'Usine jusqu'au plan 16, et rien ne le disait. Rejoué contre
  l'ancienne table, le contrôle la signale (chiffres dans `LISEZMOI.md`).
- L'autre moitié demande des yeux : quatre captures **recadrées sous le bandeau**,
  à la même graine, montrées dans le désordre. Protocole dans `LISEZMOI.md`.

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

**Le lieu ne donne plus la forme, il donne le rayon du catalogue.** `BLOC[biome]
[kind] -> { forme, habit, hors? }`, même patron que `DANGER[biome][kind]` :
**ajouter un objet à un lieu = une entrée**. Le `kind` vient de `BLOCS`
(`biomes.js`), table ordonnée append-only dont `lieu` déclare le propriétaire —
une famille appartient à **un** lieu, c'est la règle de non-réutilisation rendue
exécutable. Il ne circule pas sur le réseau et le serveur ne le lit jamais.

- **Deux silences à refuser, pas un.** `verifierBiomes()` rejette un obstacle
  qui porte la famille d'un autre lieu **et** une famille que plus aucune table
  ne tire ; `verifierBlocs()` rejette un `kind` privé de fiche de dessin — sans
  lui, `fiche()` replie sur la première famille du lieu **sans rien lever**,
  exactement ce que `verifierFeedback()` traque pour les recettes de son. Les
  deux vivent côté client et se jouent quand même **en script jetable** : un hook
  de résolution qui rejoue `resolvePath()` et un DOM-proxy suffisent, protocole
  dans `LISEZMOI.md`.
- **« La silhouette remplit son rectangle » est désormais REJOUÉ**, pas seulement
  écrit : `verifierEmpreinte()` fait dessiner chaque famille dans un
  **enregistreur de chemin** (les formes n'émettent que `moveTo`/`lineTo`, donc
  c'est de la géométrie pure) et mesure la part de rectangle laissée vide, sur
  les **gabarits réels** (`gabaritsDe()`) et sur **cinq positions**. Seuil 12 % —
  les formes d'origine y tiennent, la plus creuse étant le débris de la Nébuleuse
  à 9,6 %. **Piège payé : `graine(o)` vaut zéro en (0, 0)**, donc un obstacle
  mesuré à l'origine tire la variante *nulle* de toute forme aléatoire — le banc
  annonçait 0,0 % sur le mur bas, ce qui était vrai et ne voulait rien dire.
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
  n'a presque plus rien d'allumé — elle a été abandonnée. La bande de l'Usine
  porte une **chenille** : une bande qui pulse dit qu'un appareil est sous
  tension, un point qui **court** dit qu'une ligne tourne, et c'est la
  différence entre allumé et en marche.
- **`evacDe()` déclare une bouche d'évacuation**, même forme que `ledDe` :
  `decor.js` la lit, personne ne la pousse. Un bloc d'Usine sur trois, sur le
  côté **opposé** à la bande — deux choses sur la même arête se disputent la
  lecture, et la bande était là avant. La bouffée sort **dans la direction de la
  bouche** : un jet vertical partout dirait qu'il y a un plafond.
- **Ce qui sort de l'empreinte est hors du clip, et rien n'y a de volume** : les
  fers à béton de la ruine, et l'**éboulis** de sa brèche, plaqué au sol contre
  le pied du mur. Un mur cassé dont rien ne dépasse est un mur coupé à la scie ;
  un mur percé dont rien n'est tombé est un mur percé proprement.
- **La brèche vit DANS l'empreinte** — la collision ne bouge pas d'un pixel — et
  se lit comme un trou parce que ce qui la remplit est un éboulis et non une
  matière. Elle part du **pied** (un mur cède par le bas) et ne touche jamais un
  coin (un mur ne se déchausse pas par l'angle).

### L'amer

Un par arène, `drawAmer()` (`decor.js`), tiré par graine et **ancré au monde**.
Le semis est homogène du premier au dernier pixel : rien ne dit où l'on est,
donc 4 800 × 2 700 se traversent sans jamais se situer. Ce qui manque n'est pas
du détail, c'est un **point unique** — la chose qu'on montre du doigt.

- **IL EST PLAQUÉ AU SOL, et ce n'est pas une économie.** Un grand objet qui
  aurait du volume mentirait : le pathfinding verrait du vide là où l'œil voit
  une masse. Ce qui se lit comme bloquant est un **obstacle**, dans `biomes.js`,
  avec son AABB. Un amer est une **empreinte** — socle, fosse, creuset, collier —
  donc le plus grand élément du lieu est aussi celui qui ne coûte **pas un pixel
  de collision**.
- **Sous la grille de 20 m.** La graduation reste la seule chose de l'écran qui
  serve à lire une portée ; rien ne passe devant elle.
- **Il n'émet pas de lumière.** Le tampon a déjà les gueules de four, les regards
  de la coulée, les props émissifs et les joueurs : une source de 900 px le
  rendrait uniformément clair, le contraire de ce que la Fonderie cherche.
- **Il ne se pose jamais sur un danger** (`verifierAmers()`). Deux marquages au
  sol au même endroit dont un seul blesse est le seul défaut que ce système
  puisse produire, et il ne lève rien. La garde porte sur le **cœur** et non sur
  le rayon plein : un danger qui effleure un anneau extérieur ne trompe personne.
- **On prend le moins mauvais, pas le premier qui passe.** En cauchemar l'arène
  porte jusqu'à 45 dangers : un « premier emplacement libre » n'aurait aucune
  garantie d'exister, et un repli silencieux poserait l'amer sur une flaque.

| | FRICHE | USINE | FONDERIE | NÉBULEUSE |
|---|---|---|---|---|
| **amer** | l'embase de la tour, son pan qui a cédé, le bassin repris par la brousse | le cœur de ligne : plateau tournant, allées qui convergent, ancrages d'une machine démontée | le creuset : puits réfractaire, ceintures, trou de coulée | le collier d'amarrage : griffes de verrouillage, secteurs de guidage |

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

4. **L'ÉCHELLE APPARTIENT AU LIEU, LES DÉGÂTS NON.** `h.r` était lu par
   `buildBiome` depuis toujours et **aucune table ne s'en servait** : tout geyser
   faisait 70 px dans les quatre lieux, le dessin changeait, la géométrie non — et
   c'est la géométrie qu'on joue. `ECHELLE` (`biomes.js`) donne son gabarit à
   chaque lieu, l'**Usine n'y figure pas parce qu'elle EST la référence**.
   `dot` ne bouge jamais : ce qui blesse doit blesser pareil partout, sinon le
   joueur réapprend un barème à chaque lieu.
5. **Les quatre restent comparables, et c'est vérifié.** `verifierBiomes()`
   refuse qu'une surface de danger s'écarte de plus de **25 %** de la moyenne
   des quatre à mode égal. Une identité qui rendrait un lieu franchement plus
   dur est un déséquilibre, pas une identité.
6. **Les deux tables doivent se recouvrir exactement** (`verifierDangers()`) :
   un dessin que plus aucune difficulté ne tire est une entrée morte, un `kind`
   posé sans dessin replie sur `defaut()` — un disque ambre qui a l'air d'un
   placeholder mais qui joue normalement. **Et deux mécaniques opposées ne
   peuvent pas partager une image** : le joueur ne saurait pas si le sol va le
   freiner ou l'emporter.

Les dangers à phase gardent leur **double état** : au repos on voit
l'**installation** — la buse, le câble mort, la grille de fonte — et c'est elle
l'annonce ; à l'amorce le jet monte avec `st.k`.

### La composition

`OBSTACLES` dans `biomes.js`. Quatre semis de rectangles dans la même gamme de
taille donnaient un espace **uniformément encombré** : ni dense ni ouvert, donc
sans rythme. Une arène se traverse, elle ne se piétine pas.

- Chaque lieu a **sa loi d'implantation** (table ci-dessus). Le contraste se lit
  dans les chiffres : la Fonderie pose **7 objets par vue pour 8,5 % de surface**,
  la Friche **12 pour 5,3 %** (relevé en cauchemar).
- **Deux lieux ne peuvent pas partager une loi.** La Nébuleuse avait celle de
  l'Usine à un centième près — barre 0,230 × 0,036 contre 0,300 × 0,034 : deux
  lieux à la même implantation sont le même lieu, quelle que soit la couleur du
  sol. La sienne est maintenant le **contraste de taille**, et il se mesure sur
  le rapport de la plus grosse pièce à la plus petite : **×18,9**, contre ×4,7 à
  la Fonderie, ×2,5 à l'Usine, ×2,1 à la Friche.
- **Les dangers suivent l'architecture au lieu de la doubler** : la louche court
  dans le couloir *entre* les deux fours, les jets de vapeur tombent dans les
  allées.
- **Le carré central reste traversable dans les deux axes.** `verifierBiomes()`
  le rejoue à chaque graine **et à chaque mode** — muet sur 200 — et c'est ce qui
  autorise des masses pareilles sans jamais enfermer une équipe.
- **La loi d'implantation est celle du CAUCHEMAR ; le calme et le normal en sont
  des retraits** (`min` sur une entrée). Les chiffres ci-dessus, comme
  `signatureBiome()`, se relèvent donc en cauchemar : c'est le seul mode où la
  table est entière. Ce qui change d'un mode à l'autre est **ce qu'il y a**,
  jamais la taille de ce qu'il y a — détail dans `SIMULATION.md`.
- `BIOME=<clé> GRAINE=<n>` forcent le tirage d'une salle, **pour les tests
  uniquement**. Sans ça, comparer quatre lieux demande de relancer des salles
  jusqu'au bon tirage, et c'est le genre de protocole qu'on finit par ne plus
  faire.

### Une map ressemble à son nom

Le semis donne à chaque biome **son propre jeu**, qui porte son verbe : l'Usine
*fabrique* (convoyeurs, caisses, allées), la Fonderie *coule* (rigoles, lingots,
scorie), la Friche *a été abandonnée*, la Nébuleuse *flotte* (épaves, voiles,
modules, cristaux, antennes). Un catalogue entièrement partagé rendait les
biomes interchangeables.

**Un prop est PROPRE quand un seul lieu le tire, et la part se mesure** (chiffres
dans `LISEZMOI.md`, cible ≥ 70 %). Le fonds commun — plaque, caillebotis, câble,
tuyau, débris, marquage, coffret — reste **honnêtement industriel**, et les lieux
qui y ont droit sont ceux qui *sont* des installations industrielles.

- **La Nébuleuse ne partage plus rien** (100 %). Elle en tirait cinq sur douze,
  posés au sol d'une station orbitale parce qu'ils étaient déjà écrits — la seule
  justification qu'un prop n'a pas le droit d'avoir. Son lien avec les trois
  autres passe par la charte, les cadres et les effets de jeu, pas par un tuyau.
- **La Friche était à zéro** (83 %) : douze tirages, aucun à elle, dont un
  coffret à voyant et un caillebotis dans un lieu abandonné depuis vingt ans.
  **Ce qui a poussé prouve l'abandon mieux que toute rouille** — la brousse est
  son prop le plus tiré. Elle garde le **tube**, seul reste allumé qu'elle
  s'autorise et que plus personne d'autre ne tire : un néon qui grésille dit
  l'abandon, un voyant qui respire dit qu'un appareil fonctionne.
- **Aucune entrée morte** : un prop que plus aucune table ne tire se supprime, il
  ne s'oublie pas dans le catalogue.

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

- **Quatre plans, dont un seul n'est pas cuit** — un fond à une seule vitesse est
  un autocollant, et à deux il manque ce qui se passe *entre* l'infini et le
  proche. Astres 0,05, **gaz 0,10**, étoiles 0,16, **structures orbitales 0,22**.
  Les trois premières couches étaient toutes à l'infini ou presque : rien entre
  le ciel et le plancher, alors que c'est là que se joue la sensation d'espace —
  une structure qu'on dépasse dit la distance, une étoile ne le peut pas.
  Ces structures sont des **silhouettes**, donc des chemins tirés par cellule
  d'un espace intermédiaire (`orbite()`, `decor.js`) : une quatrième image cuite
  aurait coûté 13 Mo pour quelques pour cent d'occupation utile. Plus rapides que
  les étoiles donc **plus proches**, donc dessinées **après** elles — une station
  passant derrière une étoile serait le seul endroit du jeu où la profondeur
  mentirait. Elles vivent **sous le voile de verre** (le décor perd du contraste
  avant le gameplay, jamais l'inverse) et **ne se dessinent que dans les baies**,
  par l'argument qui a déjà sorti les étoiles de `drawFond()`. **Une seule
  direction de lumière** pour toute la couche : dans le vide il y a un astre,
  pas douze. Le gaz est cuit en
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

#### Le canal de coulée

Tout ce que la Fonderie disait d'elle-même vivait dans une **tuile de 400 px** —
rigoles, voies, vitrifié : des *pièces*, répétées, jamais une installation. Il lui
manquait ce qu'une fonderie a et qu'un atelier n'a pas : **quelque chose de long
qui traverse**, et par rapport à quoi tout le reste se situe. `couleeDe()`
(`material.js`) est cette géométrie, ancrée au **monde** et tirée par graine.

- **IL EST COUVERT, ET CE N'EST PAS UN DÉTAIL.** La nappe libre de métal en
  fusion est déjà prise : c'est `couleeEnFusion`, un **danger**, avec son
  collider. Peindre la même matière sans collider apprendrait au joueur soit à
  fuir ce qui ne blesse pas, soit à ignorer ce qui blesse. Un canal couvert n'a
  pas ce problème : on lit une **conduite**, pas une mare, et la lumière sort par
  ses joints et ses regards.
- La polyligne est **orthogonale**, coudes francs : une conduite industrielle
  tourne à angle droit, une rivière serpente.
- **Seuls les REGARDS sont des sources.** Un joint tous les 46 px en ferait des
  centaines : une source tous les 46 px n'est plus une source, c'est une nappe, et
  le tampon deviendrait uniformément chaud. Le regard est rare et éclaire loin.
- **Ils se filtrent à la génération, jamais à l'usage** — chiffres dans
  `LISEZMOI.md`. Un regard sous un bloc pose un halo sans rien qui l'émette ; un
  regard dans un danger superpose deux fois la même matière dont une seule
  blesse. Filtrer une fois sert les **deux** lecteurs : `decor.js` dessine,
  `lumiere.js` allume, et deux listes divergentes mettraient la lueur à côté de
  la conduite. Le canal, lui, passe sous un bloc sans être filtré : une conduite
  passe sous une machine, c'est la **source** qui n'a pas le droit d'être
  invisible.
- **La chaleur qui monte est ancrée sur le regard**, pas sur la vue : elle dit où
  est la source au lieu de teindre l'image. Une distorsion thermique aurait
  demandé un second tampon et un blit par image pour le même mot ; un brin qui
  monte le dit avec un `stroke`.
- L'**embase de cheminée** est le pied des cheminées du premier plan, posée sur
  les fours qui n'ont pas de gueule. Sans elle les silhouettes du bord ne tiennent
  à rien.

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

**Ça se vérifie au `grep`, et il faut le faire** : ils étaient six depuis le plan
13 sans que rien ne le signale — `actors.js` gardait sa passe d'ombres par un
`gfx >= GFX_MEDIUM`. Quand un appelant a besoin de savoir, il le demande au
module qui possède le réglage : `ombresActives()`, `lumiereActive()`. Sauter une
passe qui balaye la horde entière vaut la peine ; devenir un sixième point de
lecture pour y arriver, non.

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
  choc, rupture de barre, bombe), jamais sur un impact ordinaire. Une seule
  exception, et elle est doublement bornée : **son propre** coup LOURD, à
  **0,7 px**. « Lourd » vaut 2 % des touches — 0,53/s pour toute l'équipe,
  relevé — et le réserver à son tireur le ramène sous 0,15/s : c'est ce qui
  sépare un accent d'un tremblement permanent. Le coup lourd d'un allié ne
  secoue pas mon écran ; il a déjà son onde, son noyau et sa voix.
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
- **Le cœur d'un souffle est teinté par SA matière**, tiré vers le feu de son
  style : quatre souffles différents finissant par le même point crème perdent
  justement ce qu'on regarde. `COMBAT.flash` reste blanc pur et reste **où il est
  correct** : sur l'éclair d'une touche.
- **Une seconde onde dit l'échelle, pas un rayon plus grand.** Elle n'existe
  qu'au-delà d'une magnitude — sur un petit souffle, deux anneaux disent « deux
  souffles » — et elle est **fine, plus lente, plus loin** : c'est l'écart des
  deux vitesses qui donne la taille.
- **Un souffle a un SENS, ou n'en a pas** (`_sensBoom(b)`) : l'obus du siège
  percute et sa matière continue devant lui, la grenade est **lobée** donc elle
  retombe et n'arrive plus de nulle part. Le sens se relève sur le **vol**,
  jamais sur la visée — un projectile qui a rebondi n'arrive plus d'où il est
  parti — et `undefined` dit **radial**. Le cône des débris est la seule
  différence, et c'est celle qui sépare les deux armes explosives à l'œil.
- **La matière qui bouge est ce qui dit la puissance** en vue de dessus
  (`_blastPush`) : l'impulsion est une **vitesse qui retombe**, jamais une
  téléportation, et le trou qu'elle ouvre suspend les apparitions 1,1 s.
- **Un arc est un tracé par déplacement de point milieu** (`drawArc`) : amplitude
  **décroissante** à chaque niveau, **double couche additive** (cœur clair fin +
  halo large — c'est ce doublage qui sépare « une ligne bleue » de « de
  l'électricité »), une à deux **branches mortes**, régénération à **17 Hz**, et un
  point brillant à chaque extrémité.
- **Le RANG d'un arc porte la perte.** `n` vaut 1 pour l'**amorce** — le trait
  qu'on a visé, épais et droit — puis 2, 3, 4 : plus loin dans la chaîne, le
  trait est plus **fin**, plus **agité** et plus **pâle**, donc le nombre de
  sauts se lit sans compter les traits. **Une chaîne est UN événement** : les
  segments d'un même tir arrivent dans le même lot de différences, `arcLot` les
  cumule et `flushArcs()` sonne une seule fois avec la **longueur** — trois
  sauts ne coûtent pas trois places.
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
- **Trois états sur un ennemi, trois PLANS — et c'est le plan qui les sépare,
  pas la couleur.** Brûlure = lueur **autour** du corps ; vulnérabilité =
  pointes qui en **sortent** ; entrave = anneau **au sol**. Superposés sur le
  même corps, aucun ne peut être pris pour un autre. Les trois teintes viennent
  de `STATUSES`, donc le glyphe du HUD dit déjà la même chose.
  L'entrave est **froide**, par la règle qui vaut déjà pour les dangers : ce qui
  blesse est chaud, ce qui ralentit est froid — et une entrave est le
  ralentissement total (`mul = 0`, mesuré à 0,00 px). Deux épaisseurs, la fine
  seule saturée, jamais de pointillés : le trait franc de `limite()`, et le
  pointillé appartient au télégraphe.
  **Un signe reste nécessaire même quand le corps s'arrête déjà** : `nasse`
  oblige à *désigner* les entravés pour concentrer le feu, et un corps immobile
  est sinon indistinguable d'un corps qui vise, qui prend son élan, ou qui bute.
- **Un ennemi vulnérable porte des POINTES, jamais un anneau.** Les trois
  anneaux lisses sont déjà pris — élite, aura, égide — et l'ambre de `vuln`
  (`#f4b04a`) frôle l'or d'élite (`#ffd76e`) : c'est la **signature** qui sépare,
  pas la teinte, exactement comme pour les zones. Elles passent **sous** le
  corps, donc elles sortent du bord au lieu de barrer la silhouette, et leur
  rotation est **continue** — sans début ni échéance, donc le canal du télégraphe
  reste au boss.
- **Un ennemi qui brûle le montre sur son corps**, en passe séparée avant les
  corps — même primitive et même raison que l'ombre. La couleur est celle de
  `STATUSES[STATUS_BURN]`, donc le glyphe du HUD et la horde disent l'état d'une
  seule voix. Le tuple porte une **part de durée** et non un drapeau : la lueur
  s'éteint *avec* la brûlure, là où un booléen aurait dit « purge ».
  Les braises ont un budget **par image**, jamais par ennemi — la brûlure se
  propage, leur nombre suivrait sinon la horde. Et **aucune garde `gfx`** : une
  brûlure est de l'information, `gfx` règle la matière sans jamais décider de ce
  qui se lit.
- **Sur une zone de joueur, la couleur dit À QUI et la matière dit QUOI.**
  `terrain_conquis` est la seule carte qui pose du sol brûlant, et le seul des
  cinq appelants de `_groundZone` à passer un `pj` non nul — donc `z.pj !== 0`
  identifie ce sol **sans rien ajouter au réseau** (`pj` voyage déjà, indice 15).
  La teinte d'équipe couvrait les quatre canaux et le feu sortait aux couleurs du
  joueur : elle est maintenant sur le **contour** seul, une passe qui existait
  déjà, et le lit/les braises/la hachure prennent `ZONE.braise*`.
  **Tenu à l'écart de `BIOME.hazard`** : l'ambre des biomes dit « évite », or ce
  sol ne blesse que la horde. Et le branchement lit `pj`, jamais la couleur —
  `ownerColorOf` rend `null` dès qu'un joueur quitte le salon, et la matière du
  sol se mettrait à changer sous les pieds.
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
- **Les ressources d'arme parlent, et seulement à LEUR porteur** (`routerArme`,
  point de passage unique). `armeRes` circule déjà et le client le dessine quatre
  fois — chaleur, charge, rampe, chargeur ; trois de ces quatre lectures étaient
  muettes. La charge du rail est **la même horloge** que la ligne de tir qui se
  remplit, coupée à 0,98 parce que la fin de la montée appartient au claquement ;
  le chargeur se lit au **sens du pas** d'`armeRes` (il descend par crans, il
  monte pendant la recharge), donc aucun champ ne s'ouvre ; la rampe monte la
  **même** voix de départ, jamais une voix de plus. Local, donc quatre joueurs
  sur quatre railguns ne font pas quatre bourdonnements.
- **La chaleur est CONTINUE, elle ne bascule pas.** Teinte, épaisseur du halo,
  tremblement du tracé et matière au canon montent ensemble ; **le cœur reste
  fin** — c'est lui qu'on suit, et un cœur qui grossit efface ce qu'il traverse
  au moment où il faut le plus le voir. Au son, la hauteur dit « ça monte », c'est
  l'**instabilité du filtre** qui dit « ça va lâcher ».
- **LE PERSONNAGE NE RECULE PAS.** Un recul de tir a été essayé et retiré : dans
  un survivor le corps du joueur est ce qu'on lit en permanence pour esquiver, et
  le faire bouger pour une raison qui n'est pas un déplacement le rend illisible
  — d'autant qu'à six tirs par seconde il ne revient jamais au repos. Le départ
  se dit **devant** le personnage, jamais sur lui.

**Le bonus au sol** — palier 2, et il se lit **en courant** :

- **La famille porte la matière, le type porte la teinte** (`BONUS`,
  `BONUS_FAM` dans `feedback.js`) : disque pour ce qui rend au **corps**,
  hexagone pour ce qui arme le **tir**, losange pour ce qui se pose dans
  l'**arène**. Treize disques identiques ne se séparaient que par leur icône, or
  l'icône est ce qu'on lit **en dernier**. Elle se **déclare** ici et ne se déduit
  pas : `POWERUP_TYPES` est une liste de clés, sans champ de mécanique.
- **La clé du limiteur est la même pour les trois familles.** Un ramassage est un
  ramassage : l'identité ne se paie pas en places de voix, même règle qu'aux
  morts.
- **Trois horloges, trois choses, aucune ne redit l'autre** : l'**apparition** est
  une échelle qui dépasse puis retombe, la **présence** est le flottement, la
  **fin** est un cadran qui se vide — et il ne s'allume qu'au dernier tiers, sinon
  treize horloges tournent en permanence.
- **Un bonus qui entre dans la vue ne naît pas**, et un bonus qui s'éteint n'est
  pas un bonus qu'on prend. L'instantané **filtre par vue**, donc aucune horloge
  locale ne peut le savoir : c'est la part de vie transportée qui tranche, aux
  deux bouts.
- **Une occasion perdue n'a pas de voix.** L'expiration rend trois grains qui
  retombent et rien d'autre : ce qu'il faut lire est que la place s'est libérée.
- **Le rang dit la rareté par un second anneau**, plus loin, tireté et lent — ni
  plus gros ni plus clair. Trois types sur treize le portent ; un rang donné à la
  moitié du catalogue ne dit plus rien.
- **Le mot EST l'explication** (`hudLabel`, `bonusNom`). On ramasse un bonus en
  courant : un panneau à ouvrir n'existerait pour personne. Il ne **fusionne**
  pas, contrairement aux chiffres de dégâts — deux ramassages sont deux faits.

**L'impact** — quatre paliers, et **c'est la cible qui les décide** :

- La part de PV max retirée dit à la fois la puissance du coup **et** la masse de
  ce qui l'encaisse. Le même rail rend LOURD sur un fantassin et LÉGER sur un
  colosse : « un ennemi lourd réagit moins » sort du même nombre, **sans table de
  masse**.
- **Le palier dit COMBIEN, la matière dit À QUOI.** `MATIERE[i].touche` est
  l'autre moitié de la table de mort : carapace = éclats blancs tendus + la
  poussière du lieu, sac = gouttes lourdes qui gonflent, champ = motes teintées
  qui montent et s'attardent. **Aucune particule de plus** — `PALIER` garde le
  compte, le cône et la vitesse, la matière ne fait que les plier. `debris` dit
  si quelque chose se **détache** : un champ d'énergie ne laisse pas de béton.
- **Un tir bloqué n'est pas une touche.** Le porte-bouclier absorbe par son
  propre effet (`kind: 18`, incidence dans `ang`) et n'incrémente **pas**
  `hitSeq` : la plaque s'allume **en travers** de l'axe et les étincelles
  **glissent**. Un anneau serait faux — il appartient à l'égide et à l'élite.
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

- **L'ACTE FINAL se déduit de ce que la créature TENAIT** (`finalDe`) :
  `lienRange` → un dernier arc vers le corps qu'elle aurait pu relier ;
  `auraRadius`/`egideRadius` → le champ se **rétracte** (un `burst` dont le rayon
  maximal est plus petit que celui de départ — il rentre au lieu de s'ouvrir) ;
  un rayon de type ≥ 20 → un anneau court et épais plus trois morceaux lents.
  **Quatre lignes du bestiaire sur treize**, et c'est la condition : un acte de
  fermeture sur les treize sortirait 20 à 60 fois par seconde et cesserait d'être
  une information. Aucun champ neuf — même idiome que `matiereDe()`. La donnée
  vit dans `fx.js` (`finArcs`), le **tracé** dans `actors.js`, parce que
  `drawArc` est d'une couche plus haute.

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

**`verifierEffets(g)`** (`game_state.js`) refuse un champ posé sur un effet et
jamais transporté. **Trois défauts de ce dépôt étaient de cette forme** — l'angle
du balayage, le rang d'un arc, le nombre de tranchants — et aucun n'a rien levé :
`??` rend un repli qui a l'air normal. La liste des emplacements du tuple ne se
**déclare** pas (une seconde liste diverge), elle se **mesure** : on sérialise
l'état courant et toute valeur numérique non nulle qui ne ressort nulle part est
perdue. Un effet filtré par la vue n'est pas une perte, il est absent. **S'appelle
dans une boucle de mesure** : il ne voit que les `kind` qui se produisent pendant
qu'il regarde.

### Audio

- **UN BOSS A UNE VOIX, ET ELLE SE DÉDUIT** (`voixDe(def)`, `echelleBoss(def)`
  dans `shared/feedback.js`). Onze boss partageaient **un** son d'arrivée et
  **un** son de rupture : c'était le seul canal d'identité sans rien à lui.
  - **L'archétype porte la matière.** C'est déjà ce qui sépare les boss dans le
    dépôt, et `verifierArchetypes()` en garantit l'unicité sur le pool : déduire
    la voix de là se paie une seule fois, et un dixième boss de pool arrive avec
    la sienne.
  - **Les barres portent l'échelle.** Trois finaux partagent « fixe » — le roster
    l'autorise, un seul sort par manche — mais pas leur nombre de barres : 5, 6,
    8. La hauteur descend et la durée monte avec, donc les onze arrivées se
    séparent quand même. `pitch` va aussi à `barre`, `bossBrise` et `bossQueue`.
  - **UNE recette, neuf jeux de paramètres.** `bossVoix` porte la forme, la table
    porte les nombres — exactement `BOUCHE` pour les armes. Neuf recettes écrites
    à la main auraient neuf enveloppes à tenir d'accord.
  - `verifierFeedback` refuse un archétype sans voix (il retomberait sur le repli,
    donc deux boss identiques à l'oreille sans que rien ne le dise) et deux boss
    de même archétype **et** même nombre de barres.
- **DEUX SOURCES, UN SEUL RÉGLAGE** (`survivor.audio.source`, tenu par
  `audio.js`) : `pistes` (défaut) ou `synthe`. Il commande **musique et son de
  tir** ensemble.
- **Le repli est AUTOMATIQUE des deux côtés** : échantillon absent → recette
  synthétisée (test sur le **tampon chargé**, jamais sur le réglage) ; piste
  introuvable → `setTrackFallback` posé par `music.js`. Le repli ne réécrit pas le
  réglage.
- **`music.js` est l'aiguillage, et il a TROIS points** : `startMusic`,
  `setMusicIntensity`, `setMusicScene`. La synthèse lit une **intensité
  continue**, les pistes une **scène discrète**. La boucle de rendu pousse les
  deux depuis la **même** source. Il n'y a pas de quatrième : `startMusic()`
  part une fois à l'amorce et **rien n'arrête la musique** — hors manche c'est
  la scène `menu` qui prend le relais. `stopMusic` a été écrit, n'a jamais eu
  d'appelant, et a été supprimé ; `refreshMusicSource()` appelle déjà
  `stopSynth`/`stopTracks` en direct, qui sont internes.
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

