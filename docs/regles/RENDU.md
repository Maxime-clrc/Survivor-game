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
- **Le hitstop n'existe QUE pour les barres de boss** (`addHitstop`, 100 ms, au
  plus 30 par manche) : dans un survivor la fluidité du déplacement **est** le
  jeu. Il gèle l'horloge de **rendu** (`timeWarp.held`, retiré de `renderTime`),
  jamais la simulation, et se rattrape à **mi-vitesse** pour ne pas payer le gel
  en latence permanente.
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
- **Deux silhouettes de projectile, jamais deux couleurs seules** :
  `BOLT_CAPSULE` (tir allié), `BOLT_DIAMOND` (tir hostile). Le soin n'est plus un
  projectile : c'est un **arc**, et il se distingue par son **tracé** — calme et
  chaud pour le soin, agité et froid pour le siphon.
- **Les marqueurs posés sur un joueur sont des glyphes distincts en silhouette.**
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

