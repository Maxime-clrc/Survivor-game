# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Mini survivor multijoueur LAN. Serveur Node autoritaire, client navigateur, **zéro dépendance** (WebSocket réimplémenté dans `ws_lite.js`). Pas d'étape de build : les modules ES sont servis tels quels au navigateur.

`LISEZMOI.md` est la documentation de référence — elle explique le *pourquoi* de chaque choix d'équilibrage et contient les mesures relevées. À lire avant de toucher aux réglages, et à mettre à jour quand une mesure change.

## Commandes

```bash
npm start                 # lance le serveur sur le port 7777
PORT=8123 node server.js  # autre port
node --check server.js    # vérification syntaxique (pas de linter dans le projet)
npm run version-check     # refuse un déploiement dont les sources ont bougé sans bump
```

Le port par défaut est **7777** et non 8080 : derrière le proxy inverse du VPS
le port interne n'a plus d'importance, autant en prendre un sans collision sur
une machine de développeur. `ROOM_GRACE_MS` et `ROOM_MAX` sont surchargeables
par l'environnement **pour les tests uniquement** (un délai de grâce de 60 s
rendrait le test de destruction interminable).

Pas de framework de test ni de suite de tests versionnée. La logique étant pure et sans DOM, on la teste en important le module directement dans un script jetable :

```js
import { GameState, CFG } from "file:///<chemin absolu>/shared/game_state.js";
const g = new GameState(1);              // 0 calme, 1 normal, 2 cauchemar
g.addPlayer(1, "bot", 0);
g.step(CFG.TICK, new Map([[1, { x: 1, y: 0, ax: 1, ay: 0, dash: false }]]));
```

Les méthodes préfixées `_` (`_spawnEnemy`, `_atkDamier`, `_zoneHits`, `_bossBars`…) sont volontairement appelables depuis un test : elles isolent une mécanique sans avoir à jouer une manche entière. 600 s de jeu se simulent en ~1 s de CPU, donc une mesure d'équilibrage complète est bon marché.

Pour un test bout en bout du protocole, lancer `server.js` avec un `PORT` dédié et parler WebSocket en direct (`net` + poignée de main RFC 6455) — Node 16 n'a pas de `WebSocket` global.

### Comment on incrémente la version

**`minor` = le plan, `patch` = le rang du lot dedans.** `plan5` occupe donc
`0.7.x` — lot O = 0.7.0, lot P = 0.7.1 — et `plan6` ouvrira 0.8.0. La
correspondance lettre → chiffre est **écrite** dans la table d'historique de
`shared/version.js` et non calculée : un correctif hors lot prend le patch
suivant comme un lot, donc la lettre ne se déduit plus du chiffre. Un quatrième
composant (`0.7.1.1`) sortirait de semver et une pré-version (`0.7.1-fix`)
donnerait deux formes de chaîne à comparer côté client, pour la seule
comparaison dont dépend la détection d'onglet périmé.

**Un lot livré = un bump**, dans `shared/version.js` (constante **et** ligne
d'historique) puis dans `package.json`. La table d'historique est le
`CHANGELOG` que le dépôt n'a pas, et elle vit là parce que c'est le seul fichier
qu'un lot est obligé de toucher : on ne peut pas bumper sans écrire ce qu'on
bumpe.

`npm run version-check` est ce qui rend la règle tenable — il échoue si des
sources (`.js`, `.css`, `.html`, hors `docs/` et `*.md`) ont bougé depuis le
dernier bump sans que la constante suive, et si `package.json` diverge. Sans lui
un lot déployé sans bump rend la mention ambre du client **silencieusement**
inutile : le client ne compare que deux numéros, et deux codes différents
portant le même numéro ne déclenchent rien. C'est exactement le défaut du
`package.json` figé à 0.6.0 depuis le premier commit. Le script ne bumpe pas à
la place — il ne saurait pas quel lot il livre, or c'est ce que la table doit
porter.

Le **hash court du commit** couvre ce que le numéro ne peut pas : deux
déploiements par `git pull` peuvent partager un numéro, et si quelqu'un a oublié
de bumper c'est la seule chose qui dise encore quel code tourne. Résolu une fois
au boot (`shortCommit()` dans `server.js`, `execFileSync`), passé à
`createHub`, transporté par le `welcome`. Absent hors dépôt git — c'est un
confort d'exploitation, il ne bloque jamais un démarrage.

## Architecture

```
server.js              amorce : HTTP, WebSocket, page admin, câblage — rien qui n'existe qu'une fois par processus
hub.js                 registre des salles, comptes, progression — SEUL à écrire dans le magasin
room.js                UNE partie : GameState, clients, phases, pause, tick — l'ancien état global de server.js
ws_lite.js             WebSocket minimal (RFC 6455 + permessage-deflate) — pas de TLS (travail du proxy inverse)
shared/game_state.js   LOGIQUE PURE — importée telle quelle par le serveur ET le navigateur
shared/cards.js        les cartes, les raretés, le tirage, le calcul des mods
shared/classes.js      les 3 classes, les constantes de compétence (module pur, comme cards.js)
shared/statuses.js     les 4 états, la priorité de purge, les états posés par les élites
shared/bosses.js       le roster des 5 boss PLUS LE FINAL, le registre des mécaniques, leurs seuils d'effectif
shared/enemies.js      LE BESTIAIRE — 9 types, 6 traits, la table d'attachement par difficulté, `adaptType` (module pur)
shared/progression.js  la méta : arbres par classe, noyaux, jalons, emplacements (module pur)
progress_store.js      persistance Supabase de la progression — serveur SEUL, mémoire + réplique
version_check.js       garde-fou : refuse un déploiement dont les sources ont bougé sans bump
shared/timeline.js     LE SCRIPT — six segments, trente beats, débit, géométrie, TROIS variantes, et les ÉVÉNEMENTS
shared/biomes.js       LE LIEU — trois biomes, cinq dangers, trois météos, générateur DÉTERMINISTE (module pur)
shared/units.js        pixels → mètres, le SEUL point de conversion d'affichage
shared/version.js      LA version — module pur d'une constante, lu par le serveur ET le navigateur
shared/palette.js      LA CHARTE — couleurs, rampes, échelle typo, lues par le canvas ET le DOM
public/client.js       saisie, interpolation, prédiction, rendu du MONDE
public/sprites.js      atlas généré au chargement + `drawSprite`, LE point de passage d'entité
public/gl.js           batcher de quads WebGL2 — ne connaît ni le jeu ni l'atlas
public/hud.js          le HUD, en DOM : la couche ÉCRAN
public/icons.js        glyphes de bonus, d'effets et d'états — dessinés dans l'arène ET dans le HUD
public/events.js       diffusion des snapshots en événements typés (module pur)
public/audio.js        synthèse WebAudio, palette sonore, limitation de voix, réglages
public/music.js        bande son séquencée en WebAudio — emprunte le contexte et le bus d'audio.js, trois humeurs (calme, vague, boss)
public/index.html      page, chargement, salon, bilan, cartes, ossature du HUD
public/admin.html      page d'administration autonome — servie SEULEMENT si ADMIN_KEY est posée
public/css/tokens.css  espacement, géométrie, mouvement (aucune couleur, cf. charte)
public/css/ui.css      les écrans hors combat
public/css/menus.css   refonte des MENUS — additive, chargée APRÈS ui.css, ne touche aucun écran de combat
public/css/admin.css   la SEULE feuille qui recopie la palette — admin.html ne charge pas le jeu
public/css/hud.css     la couche écran pendant la manche
public/fonts/          Chakra Petch + Space Grotesk (sous-ensemble latin), versionnées avec le jeu
```

`public/events.js` et `public/audio.js` ne dépendent de **rien** — ni DOM, ni
canvas, ni réseau : `client.js` les importe, jamais l'inverse. C'est ce qui
permet de les charger dans un script de mesure avec un faux `AudioContext`,
comme on charge `game_state.js` pour mesurer l'équilibrage.

### La ligne de partage du rendu : monde ou écran

La question n'est pas « canvas ou CSS » mais **où vit l'élément**.

| couche | contenu | technologie |
|---|---|---|
| **Monde** | entités, projectiles, zones, sol, particules | canvas (`client.js`, `sprites.js`, `gl.js`) |
| **Écran** | HUD, barres, recharges, consignes, chiffres de dégâts | DOM + CSS (`hud.js`) |
| **Menus** | chargement, salon, cartes, bilan, build, pause | DOM + CSS (`client.js`, `ui.css`) |

Le monde reste au canvas parce que 220 ennemis repositionnés à chaque image,
ce sont 220 couches composées en DOM. L'écran passe en DOM parce qu'une
recharge en `conic-gradient`, une barre avec `transition` et un voile en
`opacity` sont trois lignes de CSS contre trente au canvas — et que c'est le
compositeur qui travaille, pas la boucle de jeu.

**Le canvas a une mémoire qui suit la densité de pixels de l'écran**
(`resize()` dans `client.js`, plafonnée à 2). C'était la cause racine du HUD
illisible et du flou en 1440p, vue sous deux angles : une mémoire fixe de
1600 × 900 que le CSS étire agrandit tout ce qu'on y dessine. Les coordonnées
monde restent en pixels de simulation — la transformation absorbe tout, et pas
une ligne de logique de rendu ne change.

**L'arène fait TROIS vues dans chaque dimension** (lot I) : `CFG.ARENA_W/H` =
4800 × 2700, `CFG.VIEW_W/H` = 1600 × 900. La **caméra** suit la position
prédite du joueur (lissage exponentiel, recalage sec au-delà d'un écran,
clamp à la salle ; spectateur : premier vivant) et vit **dans les transforms,
jamais dans les fonctions de dessin** : une translation posée par
`applyCamera()` sur les deux contextes 2D, l'offset du coin de vue absorbé
par la projection WebGL (`gl.begin`), et la conversion souris — mémorisée en
coordonnées de **vue** et convertie en monde à la lecture, parce qu'entre
deux mouvements de souris c'est la caméra qui bouge. Les deux cents fonctions
de dessin écrivent en coordonnées monde et ignorent que la caméra existe,
exactement comme elles ignorent la densité de pixels. Corollaire : tout ce qui
est « plein écran » (fond, clears, voiles, vignette, grille, hachures) couvre
le **rectangle de vue** (`camera.x0/y0` + `VIEW_W/H`), jamais l'arène ; le
culling passe par `inView()` ; les chiffres de dégâts convertissent
monde → vue au point d'appel (`flushDamage`/`flushSelf`), le HUD ne connaît
pas la caméra. Les flèches de coéquipiers hors champ se dessinent après le
vignettage — indicateurs d'écran, pas éléments du monde.

**Un combat de boss resserre `state.bounds` à UNE VUE** ancrée sur le centre
de gravité de l'équipe (`_teamCentroid`) — le mécanisme de constriction du
lot 5, réutilisé tel quel ; `_bossDead` rouvre la salle. Toute la géométrie
des mécaniques (mur, exaflares, croix, damier, couronne, couloirs, balayage,
constriction) lit les **bounds**, plus jamais `CFG.ARENA_W/H` : un damier
découpé sur la salle entière n'aurait montré qu'un carreau. Les renforts du
boss naissent sur le bord de SES bounds — tirés autour des joueurs, ils
mouraient dans la couronne avant d'arriver. Les tests « arène pleine »
(`bn`, couronne des ennemis) portent sur les **quatre** côtés : une arène de
boss collée au bord gauche de la salle a `x0 = 0`.

**Le monde tient sur TROIS canvas empilés** (`#arena` dans `index.html`), et
c'est la bascule WebGL qui l'impose : deux éléments empilés se composent
strictement l'un sur l'autre, donc *tout* le canvas 2D passerait au-dessus de
*tout* le WebGL. Or l'ordre de dessin intercale du 2D avant **et** après les
entités.

| canvas | contenu | technologie |
|---|---|---|
| `#cvUnder` | sol, grille, **obstacles et dangers de biome**, zones, télégraphes, remparts, tourelles, marqueurs, sillage d'esquive | canvas 2D |
| `#cvGl` | **entités** : monstres, joueurs, dépouilles, particules | WebGL2 (`gl.js`), vide en repli |
| `#cv` | boss, drones, **projectiles**, anneaux de joueur, barres, noms, lames orbitales, murs, vignettage | canvas 2D |

**L'ordre d'affichage du monde est imposé** : sol → zones → bonus → ennemis →
**projectiles** → joueurs. Les projectiles étaient sous la horde, donc une balle
disparaissait derrière le premier corps rencontré. `drawEffects` (nova, pulsar,
ondes) reste volontairement **sous** les entités, contre la lettre de cette règle :
une onde de 250 px de rayon dessinée par-dessus masquerait exactement les joueurs
que le liseré vient de rendre identifiables. Une onde est un ornement de sol, un
projectile est une entité — la ligne de partage est là.

`ctx` dans `client.js` est une **variable** et non une constante : `drawWorld()`
la bascule de `underCtx` à `overCtx` une seule fois, juste après les monstres.
Les deux cents fonctions de dessin ignorent donc sur quel canvas elles écrivent,
exactement comme `drawSprite` ne dit pas à ses appelants s'il passe par WebGL.

Deux écarts d'empilement assumés, tous deux mesurés en pixels : les anneaux d'un
joueur passent au-dessus de son propre sprite (ils vivent à 18 px et plus du
centre pour un corps de 14 px de rayon), et les fragments passent sous le boss
et les barres au lieu d'être au-dessus de tout. Le second se corrigerait avec un
second contexte WebGL par-dessus la couche 2D supérieure — un canvas de plus à
composer à chaque image pour quatre cents millisecondes d'effet derrière un boss.

**Le tressaillement d'écran est un `transform` CSS**, porté par `#arena` et non
par un canvas : les trois couches doivent bouger **ensemble**, au sous-pixel
près. Le HUD est le **frère** de `#arena` et non son contenu : il ne peut plus
trembler avec lui, et la séparation du rendu en deux passes n'a plus lieu
d'être. `#arena` porte un `scale(1.015)` permanent pour qu'une secousse ne
découvre pas une bande de page derrière l'arène.

**L'arène ne se montre que pendant la manche**, et c'est la **boucle de rendu**
qui en décide — pas un des quinze chemins qui posent `hidden` sur un écran. Les
trois canvas vivent sous les menus depuis toujours, et les menus sont opaques :
tant qu'un seul est affiché, rien ne se voit. Mais une **transition** croise deux
voiles à opacité partielle, et deux couches à 0,67 et 0,69 ne composent que 0,90 —
la grille du sol transparaît donc pendant les trois cents millisecondes du
passage, ce qui se lit exactement comme « la map du jeu apparaît ». Vérifié en
retirant un voile au hub : le sol, sa grille en mètres et la boîte de l'arène
étaient là, en entier.

Le défaut avait **deux moitiés**, et la même correction les traite ensemble. La
grille dans le cas ordinaire ; mais `latest` **n'est pas vidé** à la fin d'une
manche — seul `round` le remet à zéro — donc la branche de dessin du monde était
prise au salon et au bilan, et c'est la dernière image de la manche qui se
redessinait en boucle dessous. `phase` entre donc aussi dans la condition de
dessin, pas seulement dans la visibilité.

`visibility` et non `hidden` : `resize()` lit `clientWidth` sur ces canvas, et un
`display: none` les rendrait larges de zéro le jour où la fenêtre change de
taille pendant qu'on est au menu. Mesuré après correction : `visibility: hidden`,
canvas toujours à 1504 × 846 en CSS et 1527 × 859 en mémoire.

**Seul `#cvUnder` peint un fond.** Les deux autres se vident (`clearRect`,
`gl.clear`) à chaque image — un canvas WebGL qu'on cesse de dessiner garde un
contenu indéfini, et la dernière image d'une manche pouvait réapparaître sous le
salon.

**Le HUD n'écrit dans le DOM que si la valeur a changé** (table `memo` dans
`hud.js`). Repeindre soixante fois par seconde une chaîne identique fait
recalculer la mise en page pour rien — c'est exactement le coût qu'on est venu
chercher en sortant du canvas.

### `drawSprite` est LE point de passage du dessin d'entité

Monstres, joueurs, silhouettes du salon, **particules** : tout passe par
`drawSprite` (`public/sprites.js`), et par aucune autre fonction. Si un cas ne
rentre pas dans la signature (`angle`, `scaleX`, `scaleY`, `tint`, `alpha`,
`flash`, `additive`), c'est la **signature** qu'on étend, jamais une exception
qu'on ouvre.

**Le liseré permanent des joueurs passe par là aussi**, et c'est ce qui le rend
gratuit : ce n'est pas un `stroke` — `drawSprite` ne rend pas de chemin — mais la
silhouette blanche déjà cuite dans l'atlas (`flash: 1`), dessinée un cran plus
grande **sous** le sprite. Un quad de plus dans le même lot, aucune image
nouvelle, et le même résultat par les deux chemins de rendu. Il porte l'angle,
l'étirement et l'écrasement du sprite qu'il double : un contour qui garderait ses
proportions se décollerait à chaque pas. Pas de liseré pendant une esquive — le
personnage est déjà blanc.

C'est ce qui a rendu la bascule vers WebGL abordable : **le module a été réécrit
et pas un appelant n'a bougé**. L'erreur inverse est documentée — cinq cents
appels vectoriels dispersés dans vingt-neuf fonctions, sans point de passage,
c'est ce qui rendait la situation d'avant coûteuse.

**`tint` a toujours existé, même approximatif**, et c'est ce qui a permis de le
rendre gratuit sans reprendre un seul appelant. Une seule indirection, pas une
couche d'abstraction de rendu : pas d'interface, pas de fabrique, pas de
gestionnaire de ressources.

**L'atlas est généré au chargement, jamais figé.** Il suit la densité de pixels
de l'écran, comme le canvas. Sa règle de budget : **ne pas stocker en image ce
qu'une transformation peut faire** — respiration, écrasement, orientation, recul
au tir et rang d'élite sont des `scale` et des `rotate`, donc gratuits. On ne
paie que les changements de **forme** : membres, mandibules, télégraphes, étapes
de mort. **78 images** depuis le lot S (les quatre nouveaux types en ajoutent
sept chacun), 576 × 576 à densité 1 (2,7 Mo), 1152 × 1152 à densité 2 (10,6 Mo)
— mesuré, pas extrapolé, planche de silhouettes comprise, et sous le plafond de
12 Mo. `COLS` est passé de 7 à 9 pour garder la planche à peu près carrée : à
sept colonnes elle faisait 896 × 1536, soit la même surface moins bien répartie.
Le lot S est le meilleur cas de la règle de budget : les quatre types n'ont payé
**aucune** image pour leur anticipation de ruée, leur pulsation d'imminence ni
leur rang d'élite, qui sont tous des `scale`.

**Chaque case est entourée d'une gouttière transparente de 2 px** (`PAD` /
`PITCH` dans `sprites.js`). Invisible en canvas 2D — un `drawImage` lit
exactement le rectangle demandé — mais **systématique** en WebGL : le filtrage
linéaire va chercher les texels voisins au bord du rectangle source et ramène
des franges de l'image d'à côté. `cellRect()` est le point de passage unique de
la lecture de l'atlas : le chemin 2D et le chemin WebGL lisent la même formule.

**Les trois dernières cases sont des particules, et elles disent une MATIÈRE**
(`fx_white`, `fx_shard`, `fx_glow`). Ce ne sont pas des sprites au sens de la
recette : c'est ce qui fait passer les **particules** par le même lot que les
entités. Sans elles il faudrait un second chemin de rendu — un tampon à part, un
shader à part — pour dessiner des carrés.

Le vocabulaire est fixe : `fx_white` **étiré** est une étincelle (ce qui file),
`fx_shard` un éclat anguleux (de la matière arrachée, et il **tourne** —
`p.spin`), `fx_glow` un halo dégradé (de la lumière ou de la fumée, ce qui n'a
pas d'arête). Un fragment de créature et un éclair de mort partaient du même
carré blanc : la mort d'un monstre était un tas de pixels identiques à la gerbe
d'un impact.

**La liste s'arrête à trois parce que la règle de budget la coupe là.** Une
étincelle allongée n'a **pas** de case : c'est le carré blanc avec `scaleX`
différent de `scaleY` et un `angle`, soit trois paramètres que `drawSprite`
porte déjà — la cuire aurait payé une image pour un `scale`. Seuls l'éclat et le
halo sont de vrais changements de forme, et la fumée **réutilise le halo** avec
un `grow` plutôt que d'ouvrir une quatrième case : deux effets qui partagent une
forme doivent se distinguer par leur **comportement**. `spin` et `grow` sont
testés et non appliqués par défaut — la boucle tourne sur trois mille particules
par image, un `if` sur un champ absent coûte moins que l'arithmétique qu'il
évite.

Le chemin canvas 2D ne rejoue **ni** l'éclat **ni** la traînée : un quadrilatère
tourné y coûte un `path` par fragment, là où le chemin WebGL n'ajoute rien au
lot. Il reprend le halo — un `arc` est du même ordre qu'un `fillRect`, et sans
lui l'éclair de mort reste le carré blanc qu'on est venu supprimer.

### La bascule WebGL

`public/gl.js` est un **batcher écrit à la main, en WebGL2**, sans bibliothèque.
La raison n'est pas idéologique : PixiJS et ses équivalents sont des moteurs à
**graphe de scène**, en mode retenu, là où le jeu est en **mode immédiat** — il
redessine tout à chaque image depuis un instantané interpolé, sans état de rendu
persistant. Les marier voudrait dire maintenir un objet d'affichage par entité
et synchroniser deux sources de vérité, soit plus de travail que le batcher
lui-même et toute une classe de bugs (objets fantômes, fuites) qui n'existe pas.

**Elle n'apporte pas de fluidité** — à ~800 sprites le canvas 2D tient
largement. Elle apporte des **capacités** : teinte par sprite gratuite, mélange
additif, milliers de particules, et plus tard passe de post-traitement,
distorsion, échange de palette.

Six points, dont cinq sont des pièges connus :

- **Alpha prémultiplié partout** (`UNPACK_PREMULTIPLY_ALPHA_WEBGL`). Sans lui,
  liseré sombre sur chaque bord transparent et additif faux. La teinte multiplie
  donc les **quatre** canaux, alpha compris.
- **L'éclair blanc ne peut pas venir de la teinte** : un multiplicatif ne sait
  pas éclaircir. C'est un attribut de sommet et un `mix`, donc dans le **même**
  appel de dessin — l'autre option (redessiner en additif) doublait les quads
  des entités touchées, c'est-à-dire des dizaines pendant une nova.
- **Le retournement de Y est absorbé par la projection.** Le code de jeu
  continue de travailler en 1600 × 900 avec Y vers le bas.
- **Le viewport est en pixels physiques**, déjà multipliés par la densité.
- **Un lot ne se vide qu'au changement d'état** : mode de mélange, plafond,
  fin d'image. Mesuré : **2 appels de dessin pour 3 220 quads**.
- **La perte de contexte n'est pas un cas d'école** (bascule de GPU, veille,
  redémarrage de pilote). `preventDefault()` dans `webglcontextlost` n'est pas
  facultatif — sans lui le contexte n'est **jamais** restauré. La restauration
  doit **retéléverser l'atlas**, sinon le jeu revient en sprites blancs.

**Le chemin canvas 2D reste vivant**, et ce n'est pas de la prudence gratuite :
c'est le repli automatique en perte de contexte (`drawSprite` retombe dessus dès
que `renderer.ok` est faux), la comparaison visuelle entre les deux rendus, et
le mode dégradé quand WebGL2 manque.
`localStorage.setItem("survivor.renderer", "canvas2d")` y bascule sans
rechargement du serveur. Le plafond de particules suit : **300 en 2D, 3 000 en
WebGL** — en 2D chaque fragment est un `fillRect`, en WebGL c'est un quad du
même lot que les entités.

**Une silhouette est faite de plusieurs sous-tracés.** Un appendice enchaîné en
`lineTo` à la suite du corps se raccorde au dernier sommet de celui-ci et creuse
une entaille dans toute la créature : le grunt et le tank ne passaient plus leur
propre test de silhouette. Chaque membre commence par un `moveTo` et se ferme
par un `closePath`.

**Deuxième piège de la même famille, et il est pire parce qu'il est invisible :
un sous-tracé MIROIR change de sens de parcours.** Écrire les mêmes sommets avec
`y * s` inverse le sens quand `s = -1`, et `fill()` applique la règle **non
nulle** — deux contours parcourus en sens contraires annulent leur zone commune.
Un appendice miroir qui chevauche le corps y perce donc un **trou transparent**,
que le contour tracé ensuite fait lire comme une fente volontaire. Trois
créatures en étaient percées sans que personne l'ait vu : mandibules du grunt,
épaules du tank, braces du Rempart. La planche le montrait depuis toujours — un
pixel blanc au milieu d'une forme noire — mais à 64 px par case la fente fait
deux pixels, d'où la nécessité de la regarder en **résolution native**.

`mirrored(g, s, pts)` est le point de passage unique. Il ne devine pas quel côté
est fautif : il **mesure l'aire signée** du polygone tel qu'il sera émis et
retourne l'ordre des sommets si le signe n'est pas le bon. Inverser « le côté
`s = -1` » a été essayé et perçait les **deux** côtés — c'est `s = +1` qui était
à l'envers sur le tank (corps +845,7 contre épaule −253,5, indice de tour nul au
point (0,10)). Un test de signe ne peut pas se tromper de côté, et il couvre le
prochain appendice qu'on écrira sans y penser. Seule hypothèse : les corps sont
parcourus dans le sens positif, ce qui est le cas des trois concernés.

**Le boss n'est pas dans l'atlas** : il est unique à l'écran, son coût est
négligeable, et il gagne à être animé en continu au tracé.

**La posture du boss est une TIMELINE en trois temps, et son horloge n'est pas
celle du bandeau** (`bossCue`, `bossPose` dans `client.js`). Les deux règles se
contredisent : le bandeau s'efface 250 ms **avant** la résolution, alors que le
corps doit rester ramassé jusqu'au coup et se détendre **dessus**. Déduire la
posture de la durée du bandeau, ce qu'on faisait, détendait donc le boss un quart
de seconde avant de frapper — l'anticipation retombait à plat et rien ne marquait
l'impact.

- **Anticipation** — `gather` monte de 0 à 1 **en carré**, jamais en linéaire :
  une rampe droite se lit comme un état, un resserrement qui accélère se lit
  comme un élan qui se charge.
- **Maintien** — implicite, la fenêtre va jusqu'à l'impact.
- **Relâche** — `burst` vaut 1 **à l'instant du coup**, tient `BOSS_HOLD`
  (0,22 de la fenêtre, soit cinq images), puis retombe avec un **dépassement
  négatif**. Le palier est mesuré et non choisi : sans lui la courbe amortie
  tombait de 1,0 à 0,09 en cent millisecondes et le sommet n'existait qu'un
  instant. L'écrasement est asymétrique — −9 % au ramassé, +12 % à la détente —
  parce qu'une détente qui ne dépasse pas le repos se lit comme un arrêt.

Deux corollaires. `bossPose` est **sans effet de bord** : `drawBoss` est appelé
deux fois par image pour les Jumeaux, et une posture qui se consommerait à la
lecture désynchroniserait les deux moitiés pile sur le coup. Et `bossSheet()`
**neutralise** `bossCue` le temps du tracé, par le même détournement que `ctx` —
le test de silhouette est un critère d'acceptation, il ne peut pas dépendre de
l'instant où on l'a pris.

**Chaque boss rend le coup dans son propre verbe**, jamais par le seul
écrasement commun : les pointes du Ravageur jaillissent au double de leur
retrait et sa couronne prend de l'avance sur le corps ; les poches de la
Matriarche se **vident** au lieu de gonfler — seule pièce du jeu à aller à
contresens de la détente, parce que ce qui sort d'elle *est* le danger ; les
anneaux du Métronome reçoivent un à-coup **proportionnel à leur vitesse**, ce qui
accentue l'écart entre les trois au lieu de le refermer ; les glyphes de l'Oracle
s'éteignent pendant que son œil se dilate, l'énergie va quelque part ; et
l'oscillation des Jumeaux **enfle**, les deux moitiés s'écartant visiblement —
leur verbe est la séparation, pas la poussée.

`shared/cards.js`, `shared/classes.js`, `shared/statuses.js`, `shared/bosses.js`
et `shared/enemies.js` ne dépendent de **rien** :
`game_state.js` les importe,
jamais l'inverse — un cycle d'import casserait le chargement dans le navigateur.
`shared/timeline.js` fait la **seule exception**, depuis le lot U : il importe
l'échelle d'alerte (`ALERT_*`) de `bosses.js`, un import feuille → feuille donc
sans cycle. L'alternative était de recopier trois entiers, et l'échelle d'alerte
doit avoir un seul propriétaire — la règle vise les cycles, pas les feuilles.
Les constantes de comportement des cartes vivent donc dans `CARD_CFG`, celles
des compétences dans `SKILL_CFG`, celles des états dans `STATUS_CFG`, celles des
boss et de leurs mécaniques dans `BOSS_CFG`, celles du script dans `TL_CFG`,
celles des traits dans `TRAIT_CFG`, à
côté de leur table, et non dans `CFG`. Ce qui appartient à **un seul type**
(portée du bouclier, rayon d'explosion, aura du choeur) reste sur la ligne du
type dans `ENEMY_TYPES`, comme `shootCd`, `standoff` et `splits` l'ont toujours
fait.

**`game_state.js` RÉEXPORTE `ENEMY_TYPES`.** La table en est sortie au lot S,
mais `client.js` et les scripts de mesure l'importaient de là depuis toujours :
un lot qui déplace une table n'a aucune raison de faire bouger ses appelants.

Un seul port sert les fichiers **et** les WebSocket. `resolvePath()` dans `server.js` route `/shared/*` depuis la racine du dépôt et tout le reste depuis `public/` — c'est ce qui permet au navigateur d'importer le même module que le serveur.

**`shared/game_state.js` ne doit jamais référencer le DOM, le canvas, le clavier ou le réseau.** C'est l'invariant qui tient tout le reste : le serveur en fait la source de vérité, le client s'en sert pour connaître les constantes et prédire ses propres mouvements.

### Hub et salles (plan infra)

**Un seul processus, salles en mémoire — jamais un processus par salon.** Ce
n'est pas un arbitrage de performance (~5 % d'un cœur par salle au pire cas) :
la progression vit en mémoire avec Supabase pour seule persistance, et deux
processus tiendraient chacun leur copie du même compte — la sauvegarde du
salon B écraserait celle du salon A.

**Une `Room` ne touche jamais à Supabase, ne lit jamais de variable globale,
et ne connaît pas les autres salles.** Elle reçoit ses entrées, émet des
événements — les `hooks` passés à la construction : `awardRun`, `awardPartial`,
`sendProgress`, `occupancy` — et c'est tout. Le hub est le SEUL écrivain : les
écritures concurrentes disparaissent par construction, et une salle se teste
sans serveur ni base. Corollaire : **tout nouvel état serveur s'attache à la
partie en cours (`Room`), jamais au module** — c'est la règle qui rend les
plans de contenu et d'infrastructure exécutables dans n'importe quel ordre.

**Un client est en état HUB ou en état SALLE, et chaque message est routé selon
cet état.** `hub.js` traite `join` (authentification), `listRooms` (limité à
une demande par seconde), `createRoom`, `joinRoom`, `leaveRoom` et les achats
`meta*` (valides au hub ET au salon d'une salle, jamais en manche) ; tout le
reste est délégué à `room.handleMessage()` — et **rejeté** si le client n'est
dans aucune salle, c'est exactement le type de message qu'un client modifié
enverrait. `nextClientId` vit au hub : un identifiant est unique sur tout le
serveur, jamais par salle, sinon collision quand un joueur change de salon.

**Le recomptage de l'effectif a un point de passage unique** : le hook
`occupancy`, appelé par tout ce qui attache, détache ou change la phase d'une
salle, aboutit à `broadcastRooms()` — la liste est POUSSÉE aux clients en état
hub à chaque changement. Un seul chemin de sortie oublié laisse une salle
affichée 4/4 avec une place libre, et la fin de manche est le cas le plus
fréquent. Le bouton d'actualisation reste le recours (diffusion perdue,
reconnexion) : limité côté serveur, désarmé une seconde côté client en miroir.

**Une salle pleine se refuse, elle ne met pas en attente** : à 4/4, `joinRoom`
répond `joinRoomError{motif:"pleine"}` et le client RESTE au hub — la
connexion n'est plus jamais fermée pour cause d'effectif, c'est la salle qui
compte, pas la socket. `pleine` et `disparue` sont des motifs distincts parce
que la conduite à tenir diffère (réessayer, ou créer sa salle). Les entrées
4/4 restent listées, désactivées : la salle où sont les autres est précisément
celle qu'on attend.

**Une salle vide survit `ROOM_GRACE_MS` (60 s) puis est détruite.** Le délai
couvre la coupure réseau brève et le rechargement de page : `welcome` propose
la dernière salle du compte (`rejoin`), et un membre connu re-entre sans mot de
passe (`knownMembers`). Une salle vide TICKE quand même — une manche abandonnée
doit revenir au salon d'elle-même, sinon celui qui la retrouve pendant la grâce
arrive spectateur d'une partie figée.

**Un seul intervalle à 120 Hz pour toutes les salles, avec `try/catch` par
salle** : une exception ferme LA salle (`closeRoom`, clients renvoyés au hub)
au lieu de tomber le processus. Les accumulateurs de simulation et de diffusion
sont **décalés explicitement** à la création (`staggerFrac`) — seize salles qui
simulent ou diffusent dans le même tour crèveraient le budget de 8,3 ms ; la
remise à zéro du compteur de snapshot est RELATIVE pour conserver ce décalage.

**La compression se fait UNE fois par broadcast, pas une par client.**
`prepareMessage()` dans `ws_lite.js` produit la trame claire et la trame
deflate ; `sendPrepared()` choisit selon ce que chaque connexion a négocié.
C'est possible parce que permessage-deflate est négocié **sans reprise de
contexte des deux côtés** (`no_context_takeover`) : chaque message se comprime
seul, donc la même trame sert à toutes les sockets. Niveau 1 (61 % de gain
mesuré sur un snapshot pire cas, les 3 % du niveau 6 ne valent pas le CPU),
seuil de 256 octets sous lequel on n'essaie même pas. Un client qui n'offre
rien garde le protocole nu, trame pour trame — et RSV1 hors négociation reste
une erreur de protocole.

**Le TLS n'entre pas dans `ws_lite.js`** : proxy inverse (Caddy/nginx) devant,
Node parle HTTP en local, le client bascule déjà en `wss://` quand la page est
servie en HTTPS. S'y ajoute un plafond de connexions par adresse IP
(`IP_CONN_MAX`) : le port est public désormais.

### Serveur autoritaire

Les clients n'envoient que des intentions (deux directions, la distance au réticule, un drapeau d'esquive) à 30 Hz. Ils ne décident jamais de leur position, des dégâts, des morts, du score ni de la cible touchée. Les vecteurs reçus sont renormalisés côté serveur.

**`ar`, la distance au réticule, est un état CONTINU comme `ax`/`ay`** — il n'est pas remis à zéro après le tick, contrairement à `d`, `s1` et `s2`. Il décrit une position, pas une demande : le vider ferait perdre la visée entre deux paquets. `bombRange()` dans `classes.js` est son point de passage unique, appelé côté serveur **et** dans `game_state.js` (qui doit rester jouable seul dans un script de mesure). Une valeur absente, négative ou aberrante retombe sur la portée **maximale** et non sur zéro : un client antérieur, qui n'envoie pas `ar`, lance donc exactement comme avant.

Le drapeau d'esquive (`d:1`) est *ponctuel* : la boucle de simulation le remet à zéro après chaque tick (`room.js`). Sans ça, une demande resterait levée et l'esquive repartirait toute seule à chaque fin de recharge. **`s1`, `s2` et `s3` (les compétences de classe) suivent exactement le même modèle** — même remise à zéro, même raison. `s3` est la **troisième compétence** (lot C) : elle n'existe que si sa carte a été tirée (`mods.skill3` porte le palier, 0 = rien), ses tables vivent dans `CARD_CFG` (`SKILL3_*`) et non dans `SKILL_CFG` — la compétence n'existe que par sa carte. La Salve **ne consomme pas sa recharge sans cible**, et aucun palier ne verrouille le boss.

### Trois choses côté client

- **Interpolation** — 110 ms de retard sur le dernier snapshot, on interpole entre les deux états qui l'encadrent.
- **Prédiction locale** — le personnage bouge à la touche puis est ramené vers la position serveur ; au-delà de 90 px, recalage sec. **Pendant une esquive, ce recalage est désactivé** (l'écart dépasse volontairement le seuil) et le rappel est relâché.
- **Pas de temps fixe** — 1/60 s des deux côtés, indépendamment du taux de rafraîchissement.

### Retour sensoriel

**Tout se déclenche depuis la timeline interpolée, jamais depuis `latest`.** Le
client rend l'image avec 110 ms de retard sur le dernier snapshot : un son ou un
tressaillement déclenché à la *réception* arrive un dixième de seconde **avant**
l'image qu'il commente, ce qui est largement perceptible sur un impact.
`EventPump` (`events.js`) ne diffuse un snapshot que lorsque l'horloge de rendu
l'a franchi ; mesuré à **+6,7 ms**, soit moins d'une image, et jamais en avance.
Le canal `alert`, qui arrive hors du snapshot donc sans ce retard, est mis en
file et sorti sur la même horloge — même raison.

**On secoue le monde, pas l'interface.** `draw()` fait deux passes : `drawWorld()`
sous la translation du tressaillement, `drawScreen()` en dehors. Tout dans la même
passe, la secousse rendait illisibles la barre de vie, la barre de boss et le
bandeau d'alerte — c'est-à-dire exactement ce qu'il faut lire quand quelque
chose explose.

**Le tressaillement ne sort que sur les gros événements** : détonation de zone,
onde de choc, rupture de barre, bombe. Jamais sur un impact ordinaire — à trois
cents impacts par minute, l'écran ne se serait jamais immobilisé.

**Jamais de rouge pour quelque chose où il faut aller.** Une seule exception et
les joueurs cessent de faire confiance au code couleur, donc lisent tout au cas
par cas — précisément ce qu'on veut éviter avec 200 ennemis à l'écran. Rouge et
ambre : sortir. Cyan : il faut y être. Blanc : ça concerne un allié. Violet :
persistant, ça restera là après (liseré seulement — le remplissage garde la
couleur du danger, une couleur ne dit qu'une chose).

**Trois silhouettes de projectile, jamais trois couleurs seules** (`BOLT_CAPSULE`
· `BOLT_DIAMOND` · `BOLT_CROSS`, paramètre `shape` de `drawBolt`) : capsule pour
le tir allié de dégâts, losange pour le tir hostile, **croix** pour le tir de
soin.

`bullet` et `shot` étaient deux ambres voisins, le pire cas possible : on ne
distinguait plus ce qu'on tire de ce qu'on reçoit. Le rouge franc et non un autre
ambre parce que le **Tireur est ambre** — et c'est la classe qui tire le plus ;
la **forme** en
plus de la couleur parce que la couleur se perd dans le chaos et qu'un daltonien
doit s'en sortir — même règle que pour les marqueurs posés sur un joueur.

**La croix est née du même défaut, une seconde fois.** Le tir de soin ne se
distinguait que par sa couleur, ce qui tenait tant que le soigneur portait la
teinte de son joueur : tir de dégâts magenta, tir de soin vert. Depuis que la
couleur dit la classe, le soigneur est vert en permanence et ses deux tirs sont
devenus deux verts voisins — exactement le cas que `bullet` et `shot` avaient
créé. Même réponse, pour la même raison. La croix n'est pas un dessin inventé
pour l'occasion : c'est le signe du soin, déjà porté par le bonus au sol, les
croix du sanctuaire et le HUD.

Deux détails qui se paient si on les oublie. La croix est **orientée dans l'axe
de vol**, comme les deux autres : figée à l'horizontale, elle devient un X sur un
tir en diagonale, donc une forme différente selon la direction. Et elle est
tracée en **deux `fill()`** et non en un tracé à deux sous-tracés — deux contours
en sens contraires annulent leur zone commune sous la règle non nulle, et le
centre de la croix, qui est exactement leur intersection, deviendrait un trou.
C'est le bug documenté pour `mirrored()` dans `sprites.js`.

**Les marqueurs posés sur un joueur sont des glyphes distincts en silhouette**,
jamais différenciés par la seule couleur : un daltonien doit s'en sortir, et de
toute façon la couleur se noie dans le chaos. La couleur ne fait que confirmer
ce que la forme dit déjà.

**L'interface sonne au SURVOL, et la cible est celle du pointeur — exactement.**
C'est ce qui sépare un jeu d'un site : dans un jeu, l'interface est une machine
qu'on manipule, et une machine fait du bruit quand on pose la main dessus. La
liste de « ce qui répond au clic » existe déjà — c'est la règle qui pose
`--cursor-go`, le crochet de visée — et le son la reprend au lieu d'en tenir une
seconde : **ce qui montre le crochet sonne, ce qui ne le montre pas est muet**.
Un bouton **désarmé** ne sonne donc pas, pour la même raison qu'il retombe au
pointeur de repos : il n'est pas une cible, et un retour qui prétend le
contraire est pire que pas de retour. Délégation sur `document` et non un
écouteur par bouton — les listes du salon, du hub et de la progression sont
reconstruites à chaque diffusion, donc chaque rendu aurait eu à rebrancher ses
nœuds, avec les fuites qui vont avec.

Trois gardes, trois causes distinctes, toutes vérifiées : `lastHovered`
(`pointerover` se déclenche pour **chaque** descendant, un bouton à trois
`<span>` sonnerait quatre fois), `UI_SOUND_GAP` de 70 ms (traverser huit entrées
d'un geste tirerait huit ticks en trois cents millisecondes — une mitraillette,
pas un retour ; mesuré : cinq boutons balayés à 25 ms d'écart ne rendent qu'**un**
son), et `pointerType !== "mouse"` (le survol n'existe pas au doigt, chaque tap
sonnerait deux fois).

**Le survol est un TICK, jamais une note.** `survol` est 18 ms de bruit
passe-bande étroit, sans aucune composante tonale : une note, même courte, se lit
comme une réponse — or survoler n'est pas agir, et un carillon à chaque bouton
traversé fatigue en une soirée. Il est bas par construction (`SOUND_GAIN.menu`,
entre le tir et l'impact) : c'est le seul son du jeu qui part sans qu'on ait rien
fait.

**La sélection sonne à l'APPUI, et elle porte plus loin que le survol.** À
l'appui (`pointerdown`) et non au clic : un retour doit arriver pendant que le
doigt est encore sur le bouton — c'est déjà la règle écrite pour `popIn` — et
`click` n'arrive qu'au relâchement, cinquante à cent millisecondes plus tard. Le
prix est l'appui annulé qui sonne quand même, rarissime, et le geste a bien eu
lieu. Plus loin, parce que le survol suit le **pointeur** (donc exactement la
règle du curseur, qui exclut `#cards` et `#build` — ils s'ouvrent une manche en
cours et gardent le réticule) alors que la sélection suit l'**action** : choisir
une carte est le geste le plus important du jeu, c'est celui qu'il ne faut
surtout pas laisser muet. Aucune garde de délai en propre — un clic est
volontaire, il n'y a pas de balayage à borner, et la recharge du limiteur (40 ms)
passe sous tout geste humain : mesuré, deux appuis à 45 ms rendent deux sons,
seuls deux appuis dans la même image n'en rendent qu'un. Pas de filtre tactile
non plus, contrairement au survol : au doigt il n'y a pas de survol, donc un tap
rend un son et non deux.

**`selection` MONTE, et ne contient aucun bruit.** Un twang de blaster avait été
essayé — descente 1750 → 180 Hz, dent de scie plus carré plus bruit
passe-bande — et rejeté à l'écoute. Deux raisons, et elles valent règle pour tout
son d'interface qu'on ajoutera. Le **bruit** : filtré étroit et bref, il râpe, et
un son de menu se déclenche trente fois par minute là où un son de combat passe
une fois — ce qu'un impact peut se permettre, un clic ne le peut pas. La
**descente** : une hauteur qui tombe se lit comme une perte, c'est `aterre` mot
pour mot, or sélectionner est un gain.

Donc l'inverse terme à terme : trois **sinus** (seule forme d'onde sans
harmonique, donc la seule qui ne puisse pas râper), une hauteur qui monte d'un
**ton** (740 → 880) plutôt qu'un intervalle franc — un saut sonne comme une
alerte, une inflexion comme un acquiescement — l'octave supérieure au quart du
volume pour le brillant, la quarte grave pour le corps (sans elle il ne reste
qu'un bip de montre). Attaque de **12 ms** et non 4 : sur une sinusoïde, 4 ms
s'entend encore comme un coup d'ongle, et c'est le seul réglage qui sépare
« rond » de « sec ». C'est pour lui que `tone` a gagné un paramètre `attack`,
comme `noise` avant lui — défaut inchangé, donc aucun son de combat ne bouge.

**Trois degrés dans la même famille, et ils disent l'ENGAGEMENT.** Tout le salon
choisit — une classe, une difficulté, un onglet — et se défait d'un second clic ;
deux boutons seulement avancent la table vers la manche, et l'oreille doit les
distinguer sans qu'on regarde ce qu'on vient de presser. Même matière à chaque
fois (sinus, montée, attaque ronde), l'ampleur seule change : une **inflexion**
pour un choix (`selection`), **deux notes** pour un engagement (`pret`, tierce
majeure 587 → 740, recouvertes de 30 ms — jointes on entend un accord, espacées
un carillon), un **accord résolu à l'octave** pour le départ (`lancer`,
392 · 494 · 784). Les deux premiers ne résolvent pas : ils répondent à un geste
et la partie continue. Le troisième ferme le salon, donc il se termine.

**Une bascule ne rend jamais le même son dans ses deux sens.** `#readyBtn` porte
`.on` quand on est déjà prêt, donc quand le clic **retire** : `pretAnnule` est la
même tierce jouée en descendant, plus courte et sans renfort grave — un retrait
n'a pas à occuper la pièce. Deux états opposés qui sonneraient pareil
apprendraient au joueur à ne plus écouter. La classe est lue **à l'appui**, avant
que `refreshPanel` ne la retourne.

Le branchement passe par `uiSoundFor()`, une table par identifiant consultée dans
la délégation — pas un `onclick` sur chaque bouton : les deux en ont déjà un, qui
parle au serveur, et y greffer du son mélangerait le retour sensoriel au
protocole. Un bouton absent de la table rend `selection`, donc l'oubli est
impossible.

**Le souffle de lancement part du message `round`, pas du clic de l'hôte.** Le
clic n'appartient qu'à une personne ; le lancement est ce que toute la table vit
au même instant. Il passe donc par la file du monde comme le reste de la
transition, et sonne sur l'image qu'il commente. `lancement` est la seule recette
du dépôt à **monter avant de descendre** (paramètre `attack` de `noise`, ajouté à
la brique plutôt qu'en seconde fonction) : c'est ce qui le sépare d'`explosion`
— une détonation frappe, un lancement se met en route, et sans montée le souffle
commençait par un claquement, c'est-à-dire par le contraire de ce qu'il annonce.

**Le bandeau d'alerte disparaît AVANT la résolution de la mécanique** (durée
d'annonce moins 250 ms). Un texte encore affiché au moment de l'impact masque
exactement ce qu'il faut regarder.

## Invariants à ne pas casser

**Les distances s'affichent en mètres, la simulation reste en pixels.** `shared/units.js` (`PX_PER_M = 20`, `toM`, `fmtM`) est le seul point de conversion, et il ne sert **qu'à écrire un texte destiné à un joueur** : descriptions de `cards.js`, `classes.js` et `bosses.js`, libellés du salon, écran de cartes, écran de fin. Le pixel n'est pas une unité de jeu — il dépend de la résolution et ne se compare à rien. **Ne jamais convertir** une constante de `CFG`, `CARD_CFG`, `SKILL_CFG`, `STATUS_CFG` ou `BOSS_CFG`, ni les commentaires techniques, ni les mesures du `LISEZMOI` : ce sont des valeurs de simulation, et une conversion appliquée là casserait tout l'équilibrage d'un coup. Une description qui cite un rayon compose `fmtM(LA_CONSTANTE)` plutôt que de recopier un nombre — un texte qui recopie une constante ment dès le premier réglage.

**Chaque effet dessiné autour d'un personnage occupe une bande de rayon exclusive** (`RING_SHIELD`, `RING_STATUS`, `RING_SKILL`, `RING_BUFF0` dans `client.js`, puis 3,7 m pour les lames orbitales, 8 m pour le givre, 8,5 m pour le rempart). **La règle vaut aussi autour d'un ENNEMI** : le halo d'élite occupe `r + 6` à `r + 8`, le liseré d'aura `r + 10` — une élite couverte est précisément la cible dont on veut lire les deux informations. Deux effets au même rayon reviennent à en perdre un : les lames orbitales disparaissaient dans l'anneau du champ de givre, et le joueur ignorait qu'il avait la carte. Les lames se dessinent en **passe séparée, par-dessus tout** (`drawOrbiters`), et le givre est un disque teinté **sans anneau**.

**Les snapshots sont des tableaux positionnels.** On ajoute des champs **à la fin, jamais au milieu**, et le client les lit avec une valeur de repli (`a[16] ?? 0`). Un onglet resté sur une version antérieure continue de fonctionner.

**Les tableaux exportés sont ordonnés et l'index circule sur le réseau** : `POWERUP_TYPES`, `ENEMY_TYPES`, `DIFFICULTIES`, `CLASSES`, `STATUSES`, `BOSS_ROSTER`, `MECHS`. Insérer une entrée au milieu réécrit silencieusement le sens de tous les snapshots.

**Les Jumeaux sont deux entités pour UNE réserve de vie.** `state.boss` reste la source de vérité (PV, barres, phase) ; `state.boss2` n'est qu'un second point d'application. La redirection se fait dans `_damage()`, au point de passage unique, et tout ce qui frappe « le boss » en zone doit passer par `_bossTargets()` — sinon la moitié du combat est invulnérable aux grenades, aux ondes et aux orbiteurs.

**Corollaire : tout retour visuel doit viser l'entité RÉELLEMENT touchée, pas le porteur de la réserve.** `_damage()` relève la cible avant la redirection (`struck`) et `bossDmg` transporte son point d'impact — sans ça le chiffre de dégâts sortait toujours sur le premier Jumeau, y compris quand on tirait sur le second. C'est le piège de tout ce qu'on ajoutera derrière la redirection.

**Une mécanique ratée met à terre, elle ne tue jamais sèchement un joueur à pleine vie.** Le plafond vit dans `_hurt()` derrière le drapeau `mech`, pour la même raison que le multiplicateur de difficulté : une mécanique de plus est couverte sans qu'on y pense. La progression de la sanction est portée par le **cumul de Vulnérabilité** posé par `_mechHit()`, jamais par la valeur brute — c'est le second échec qui tue.

**Les mécaniques de groupe vivent dans une liste unique, `state.marks`.** Elles ont toutes le même cycle (annonce, résolution, disparition) et le client n'a alors qu'une liste à dessiner. Un marqueur dont le porteur se déconnecte ou tombe **se supprime lui-même** : lien orphelin, tour inoccupable, cage sans prisonnier — c'est ce qui empêche une déconnexion de bloquer un combat.

**L'adaptation à l'effectif passe par `adaptMech()`, et par rien d'autre.** Un seuil par mécanique, avec un repli éventuel (`minPlayers`, `fallback`), jamais une variante de combat par effectif : cinq variantes de cinq boss auraient dérivé au premier réglage.

**L'adaptation au NIVEAU passe par `adaptType()`, son jumeau exact** (`minLevel`, `fallback` sur `ENEMY_TYPES`) — même signature, même règle du **seul niveau de repli** : un repli qui replie serait illisible dans la table, qui est justement ce qui rend le système tenable. C'est la **seule boucle de rétroaction du design** qui survit à D2, et elle y survit parce qu'elle est *authored* (une table, pas une formule qui lit une performance), *asymétrique* (elle aide une équipe en retard, elle ne punit jamais celle qui avance) et *lisible* (un seuil par type). Deux appelants et deux rôles : `_pickType()` **filtre** (un type hors de portée est simplement absent du tirage), `_spawnEnemy()` **replie** (l'appelant a nommé un type — la nuée d'une pondeuse — et il faut bien le remplacer par quelque chose ; le grunt est le plancher, seul type sans seuil).

**UN ÉVÉNEMENT EST UNE ENTRÉE DU SCRIPT, jamais un second système** (lot U). La tentation était un tirage aléatoire tournant en parallèle du script ; deux autorités sur la même horloge produisent des collisions (événement pendant un crescendo, deux à la fois, un pendant un boss) et une partie **non reproductible**, donc non classable. Le calendrier est une **colonne de la table** et non une arithmétique à maintenir (`vague % 5 === 3`, la solution de `plan4`) : les garanties se **lisent** au lieu de se **prouver**, et on place un événement là où le rythme le demande plutôt que là où le modulo le permet. `verifierScript()` en fait un critère rejouable — quatre règles, zéro collision sur les trois variantes.

**`MECHS` reste réservé aux boss ; `EVENTS` est une table à part.** Un événement de horde et une mécanique de boss n'ont ni le même cycle, ni le même client, ni le même échec — les mélanger ferait qu'`adaptMech` réponde à deux questions. Deux tables, **un seul chemin d'annonce** en revanche : `applyAlert` consulte l'une ou l'autre selon que le message porte `event` ou `mech`, et tout le reste (file client, horloge de rendu, retrait de 250 ms avant résolution) est commun. Le lot V en ajoute une **troisième** (`meteo` → `WEATHERS`) par exactement le même chemin : trois tables, toujours un seul chemin, et aucun message réseau de plus.

**Un événement remplace la COMPOSITION du beat, pas le beat.** `types` dit quoi arrive, le beat dit combien et par où ; la géométrie, l'effectif et la difficulté continuent de s'appliquer. La composition passe par le **même argument** que la nuée d'une pondeuse — un type nommé — donc elle traverse `adaptType` et le roster de difficulté sans exception : une nuée au niveau 1 sort en grunts.

**Réussir un événement rend 100 % des PV et du bouclier et RELÈVE les joueurs à terre**, sans condition. Un cas « relevé mais pas soigné » serait illisible. Son poids a augmenté depuis que `WAVE_HEAL` a disparu au lot P : les événements et les boss sont les deux **seules** sources garanties de remise à plein, et la mesure du dépôt est formelle — ni plus de cartes ni moins de pression n'ont jamais rallongé la survie, une source de récupération si. « Terminer » = atteindre l'échéance du beat, **sauf `chasse`**, qui se termine à la mort du gibier et ne rend rien s'il survit : sinon il suffirait de fuir soixante secondes.

**Le gibier de `chasse` est exclu du seuil d'exécution** (`noExec`), comme le boss et les structures de mécanique — un seuil sur une grosse réserve en supprime le dernier quart d'un coup. Ses PV sont **une fraction de ceux d'un boss** du même segment et non un multiple d'un tank élite : les deux échelles n'ont pas la même pente en effectif, et un multiple d'élite aurait dérivé du boss au premier réglage. Ils ne suivent **pas** la puissance : c'est D2, et `chasse` est délibérément l'endroit où le grand écart se voit (21,7 s à build médiane, 2,7 s à ×8). Pas de plancher de durée — celui des boss protège une chorégraphie, `chasse` n'en a pas.

**UNE DIFFICULTÉ EST UN PROFIL, pas quatre multiplicateurs** (lot T). `script` (quelle table de beats, donc où sont les silences), `roster` (quels types peuvent sortir, en plus des `minLevel`), `traits` (l'attachement), `resume` (ce que le mode change, en trois lignes, pour le salon), puis le **résidu** `hp` / `spawn` / `dmg` / `boss`. Les multiplicateurs restent — leur argument d'origine tient toujours — mais ils cessent d'être l'*identité* du mode. Ni `events` (lot U) ni `biome` (lot V) n'y ont finalement ouvert de clé, et pour la même raison dans les deux cas : le calendrier des événements est une colonne du **script**, que le profil désigne déjà, et le jeu de dangers d'un biome dépend du **mode** et non l'inverse — c'est `buildBiome(biome, diffIndex, graine)` qui lit l'index de difficulté, pas le profil qui liste des dangers. Le profil aurait porté la même information à un second endroit. `DIFFICULTIES` reste un tableau ordonné dont l'index circule.

**L'ATTACHEMENT des traits vit dans le PROFIL, leurs VALEURS dans `enemies.js`, et jamais aux deux endroits.** `enemies.js` répond à « comment un dash fonctionne », le profil répond à « qui l'a ». C'est la règle du dépôt appliquée telle quelle — les constantes de comportement vivent à côté de leur table, la décision vit là où elle se prend. Le profil l'écrit **par clé de type** (`{ grunt: DASH | TRAIL }`) parce que c'est ce qu'on veut relire ; `TRAIT_BY_TYPE` la résout **une fois au chargement** en tableau indexé, parce que c'est ce que la boucle lit deux cents fois par image.

**Trois refus explicites, chacun contre une duplication déjà refusée ailleurs** : les **boss** n'ont pas de variante par difficulté (trois variantes de six boss = dix-huit combats à équilibrer) ; les **mécaniques** non plus (`adaptMech` adapte déjà à l'effectif, un second axe rendrait la table illisible) ; les **statistiques de type** non plus (le résidu `hp` / `dmg` porte tout l'ajustement chiffré).

**Les variantes de script changent la FORME de la pression, jamais sa QUANTITÉ.** C'est `adaptEntry` appliqué à un second axe, et pour la même raison : la quantité vit dans `diff.spawn` et nulle part ailleurs. Le plan demandait des débits abaissés en calme et relevés en cauchemar *en plus* du résidu — deux boutons sur la même grandeur, et un jour on règle l'un en croyant régler l'autre. Ce qui change : **où sont les silences** (calme un par segment, référence quatre, cauchemar **un seul** sur toute la manche) et **quelle géométrie** (calme retombe sur `bords`/`front`, cauchemar durcit vers `pince`/`quatre-fronts`).

**Les variantes sont DÉRIVÉES de la table de référence, jamais recopiées** (`derive()` dans `timeline.js`). Trois tables de trente beats écrites à la main auraient divergé au premier réglage de débit — exactement le défaut qu'on vient de décrire. On décrit ce qui change ; le reste suit. Deux corollaires non évidents : **un silence est toujours `bords`** quel que soit le beat qu'il remplace (une respiration qui arrive par quatre fronts n'en est pas une), et un beat **retiré** des silences reprend sa place sur la courbe par la moyenne de ses voisins (`comble()`) — garder son débit d'origine aurait donné le pire des deux mondes, un beat calme sans le drapeau, donc sans bonus forcé ni respiration lue.

**La difficulté ne change pas les CRÉATURES, elle change LA MACHINE** (`DECOR` dans `palette.js`). Teinter les monstres en cauchemar détruirait la seule chose qui les rend lisibles à deux cents à l'écran, et casserait l'identité par type. Les variantes ne touchent que le sol, la grille et le vignettage ; **aucune ne réattribue un des six rôles de la grammaire**. La grille reste **graduée en mètres** dans les trois modes — les sections éteintes de cauchemar sont visuelles et ne touchent que les traits fins, jamais les traits marqués tous les 20 m, sinon « rayon 6 m » cesse de vouloir dire quelque chose à l'écran.

**Un TRAIT est un module de comportement attaché à un couple `(type, difficulté)`, jamais une variante de type.** Trois bestiaires auraient répété l'erreur que le dépôt refuse depuis `adaptMech`. Le masque est résolu **une fois à l'apparition** (`e.traits`) : la difficulté ne change pas en cours de manche, donc le recalculer par image serait un appel de fonction par ennemi pour une valeur constante. **Le client le recalcule de son côté** à partir de `(diffIndex, type)` — deux informations qu'il a déjà — et c'est ce qui fait qu'un système de comportements entier ne coûte **pas un octet** de réseau. La seule exception est l'anticipation de la ruée : une position ne dit pas qu'un mouvement se prépare, exactement la limite déjà notée pour la cadence des tireurs. Elle passe par la clé nommée `wu`, jamais par un champ sur chacun des 200 ennemis.

**L'aura ne se cumule jamais** : deux porteurs sur la même cible appliquent la **meilleure** réduction, jamais le produit — même règle que le Vœu partagé et que les auras de givre, et sans elle trois porteurs groupés rendent un paquet strictement increvable. Elle est relevée **une fois par tick** (`_auraPass`, comme les auras de givre) et lue dans `_damage()` au point de passage unique : une nova, une lame orbitale et une balle sont donc toutes les trois absorbées sans qu'aucune ne le sache.

**Toute zone posée par la horde passe par `_groundZone()`, qui porte un PLAFOND GLOBAL** (`TRAIL_MAX`, traînées et spores confondues, la plus ancienne cède sa place). Le piège est déjà documenté pour les flaques de la Matriarche, et 200 ennemis à traînée sont un cas bien plus dense qu'un combat de boss. Un refus silencieux plutôt qu'une éviction aurait figé le sol autour du premier ennemi arrivé pour toute la manche. La traînée se pose à la **distance parcourue** et non au temps écoulé : sur une cadence, un ennemi arrêté paverait le sol sous lui et un runner en poserait deux fois moins qu'un grunt pour le double de terrain.

**Le bulwark est le seul ennemi dont `e.ang` n'est pas l'angle vers sa cible** : sa rotation est limitée en vitesse (`shieldTurnRate`), parce qu'un bouclier qui se retourne à l'image rend le flanc inatteignable, c'est-à-dire le type injouable. **L'absorption vit dans `_bulletHitEnemy()`** — la boucle de collision *et* le balayage à l'apparition l'appellent, sinon une balle née à bout portant traverse le bouclier qu'une balle tirée à dix mètres respecte. L'angle se mesure du **centre de l'ennemi vers le point d'impact**, jamais depuis le tireur : une balle perforante touche par où elle arrive.

**Le soin du medic est un chemin NEUF, jamais un `_damage()` négatif** : `_damage` porte le vol de vie, les critiques, l'exécution et le compteur de touches, dont aucun n'a de sens sur un soin — et un montant négatif les traverserait tous. La rupture se mesure en **temps passé sous le feu** et non en « touché récemment » : une balle perdue ne coupe pas un soin, s'acharner une seconde le coupe.

**L'explosion du kamikaze se branche au point UNIQUE de mort** (`_killEnemy`), ce qui garantit « quelle que soit la cause » — tir, zone, brûlure, exécution, onde de mort. Elle est posée comme une **zone** de 0,15 s d'annonce et non résolue sèche : c'est la seule façon dont le dépôt sache dire « ça va exploser là » au client, et un dégât instantané sur un ennemi qu'on vient de tuer se lit comme un bug.

**`POWERUP_ROTATION` dit ce qui tombe, `POWERUP_TYPES` dit ce qui circule.** Une liste d'index et non un préfixe compté : `fragment` (seule la carte Récolte en fait tomber), `purification` (tirée à part par `_randomPowerupType()`, avec un poids qui double quand l'équipe n'a pas de soigneur — le seul bonus du jeu dont le poids dépend de la table) et les quatre doublons de cartes permanentes (`damage`, `rate`, `double`, `pierce`) en sont dehors. **Sortir une entrée de la rotation ne la déplace jamais dans `POWERUP_TYPES`** : c'est l'index qui circule dans le snapshot, et réordonner ferait dessiner la mauvaise icône à un onglet resté sur une version antérieure.

**Le rang d'élite est encodé dans le champ de type** (`+100`), pour ne pas payer un nombre de plus sur chacun des 200 ennemis, vingt fois par seconde. Côté client : `type = a[5] % 100`, `elite = a[5] % 200 >= 100`. Le marquage de retardataire (`+200`) a disparu avec les vagues au lot P — il n'existait que pour rendre traquables les derniers fuyards d'un nettoyage — mais le modulo côté client le tolère encore, pour qu'un serveur resté sur une version antérieure ne fasse pas dessiner un type inexistant.

**Tout ce qui blesse un joueur passe par `_hurt()`**, et le multiplicateur de difficulté s'applique **là et nulle part ailleurs**. Ne pas le remultiplier aux points d'appel. Une nouvelle attaque est ainsi couverte sans qu'on y pense.

**`_hurt()` prend un SAC D'OPTIONS, pas des booléens positionnels** : `{ ignoreCooldown, fromZone, overTime, mech, src }`. `_hurt(p, d, true, false, false, true)` était illisible au point d'appel — on ne savait plus lequel des `false` était la zone — et le lot A y ajoutait une sixième information. C'est le seul endroit du dépôt où une allocation par appel se justifie : les dégâts **subis** se comptent par dizaines par seconde, là où les dégâts **infligés** passent par `_damage()` et restent en positionnel. Les options d'un échec de mécanique sont écrites **une seule fois** (`MECH_HURT`) : trois appels les passaient à l'identique, et un `mech: true` oublié supprime en silence le plafond « ne tue jamais un joueur à pleine vie ».

**Tout dégât subi porte une PROVENANCE** (`src`, index de `DAMAGE_SOURCES`). Elle est relevée dans `_hurt()` au point de passage unique, après tous les multiplicateurs et après le plafond de mécanique — donc sur le montant qui atteint réellement le joueur, bouclier compris. Deux destinations, deux coûts : `p.lastSrc` traverse le réseau (un nombre par joueur) pour que le chiffre rouge porte son icône, `p.hurtBy` reste dans la simulation et ne sort qu'au bilan. Un appel qui oublie `src` compte en **contact**, le cas majoritaire — jamais en source « inconnue », qui n'apprendrait rien et n'aurait jamais été corrigée. Registre à **sept** entrées : le « souffle » du plan n'existe toujours pas (la rupture de barre ne blesse plus), l'`explosion` du kamikaze occupe la sixième depuis le lot S — elle passe par une zone mais ne s'en compte pas une, parce que la conduite à tenir diffère : sortir d'une flaque, ou abattre un type avant qu'il n'arrive au contact — et l'`environnement` la septième depuis le lot V, pour exactement la même raison une troisième fois : un geyser et une flaque de Matriarche blessent tous deux par le sol, mais l'un fait partie de la carte et sera encore là dans dix minutes. « 18 % de nos dégâts viennent de l'environnement » est précisément ce qu'il faut savoir pour décider si le biome est décoratif ou s'il est le problème.

**La rupture de barre de boss ne blesse pas, et elle est déclinée par boss** (`_bossBreak`). Elle punissait une réussite, cinq fois par combat et pour les cinq boss. Une variante par **boss** et non par effectif — c'est le même principe qu'`adaptMech`, la duplication qu'on refuse est celle des combats. Chaque variante **s'annonce** par le canal d'alerte : une variante muette surprend au lieu d'informer, ce qui est exactement le reproche fait à une mécanique punitive. Le boss peut mourir dans sa propre rupture (deux barres traversées dans la même image) : tester `this.boss` après chaque tour de boucle.

**Le rempart suit son tank, sauf s'il est ancré** (`bw.anchor`, carte « Ancrage »). Le choix est fait à la pose et gravé sur l'entité, jamais relu à chaque image — sinon un rempart déjà posé bougerait le jour où la carte arrive en cours de manche. Un propriétaire déconnecté ou à terre laisse le rempart où il est : la zone posée par un tank qui vient de tomber est précisément ce qui permet de le relever. Corollaire côté client : **le rempart est interpolé** (`lerpList`), comme les marqueurs — un disque de 6,5 m qui saute vingt fois par seconde sous les pieds du joueur décroche visiblement du personnage, qui est prédit à l'image.

**Tout ce qui blesse un ennemi ou le boss passe par `_damage()`**, symétriquement : vol de vie, brûlure, comptage des dégâts et **compteur de touches** y sont branchés une seule fois.

**Le coup critique, le momentum et l'exécution vivent dans `_damage()`, et nulle part ailleurs.** Une nova, une lame orbitale et une balle critiquent donc toutes les trois sans qu'aucune ne le sache. Trois corollaires : un dégât `overTime` **ne critique jamais** (une brûlure qui tire soixante fois par seconde critiquerait à tous les coups en moyenne) ; l'exécution ne touche **ni le boss ni une structure de mécanique** (un seuil appliqué à une réserve de vie de boss supprimerait une barre entière) ; et `this.lastCrit` est relu **immédiatement après l'appel** par le seul `_bulletHitEnemy` (Sentence capitale : les critiques traversent) — un champ d'instance plutôt qu'un retour, parce que `_damage` a une trentaine d'appelants dont aucun ne veut savoir.

**Le critique figure dans `_playerPower()`, le momentum non.** Le premier est une source de dégâts **permanente** — l'oublier reproduirait l'erreur de `barrelDamageMul`, qui avait triplé la durée du troisième combat de boss. Le second (élan, meute, carnage, dernier souffle) est transitoire par construction : indexer la pression des vagues sur un pic de quatre secondes ferait monter la difficulté au moment précis où le joueur vient de gagner son bonus. Le multiplicateur de l'instant vit dans `p.power`, relevé **une fois par tick** par `_momentum()` — le comptage de la meute est une boucle sur les 220 ennemis, il ne se paie pas quatre cents fois par seconde.

**`areaMul` a deux points d'application, et c'est délibéré.** Les trois rayons qui sont **déjà des mods** (`bulwarkRadiusMul`, `healWaveRadiusMul`, `frostRadius`) l'absorbent à la fin de `computeMods()` : `frostRadius` traverse le réseau, et une aura dessinée d'une taille pour une aura qui ralentit d'une autre est le bug qu'on évite. Les rayons **constants** (bombe, grenade, pulsar, onde de mort, nova, riposte) sont multipliés chez leur appelant — `_wave()` le fait pour ses trois appelants d'un coup, puisqu'il est leur point de passage unique.

**Les conversions se calculent sur les valeurs de BASE, jamais l'une sur le résultat de l'autre** (`fullMods`). « Blindage offensif » lirait sinon des PV déjà gonflés par « Fureur défensive », qui lit des dégâts déjà gonflés par le premier, et le chargement dériverait un peu plus à chaque carte prise. C'est le seul endroit du dépôt où l'ordre d'écriture change le résultat, d'où les deux copies explicites.

**`_damage()` prend `overTime` exactement comme `_hurt()`**, et pour la même raison : un dégât **continu** (brûlure, couronne mortelle) n'est pas une touche. Sans ce drapeau il incrémenterait le compteur soixante fois par seconde et l'ennemi qui brûle clignoterait en permanence — c'est-à-dire que le retour d'impact, qu'on vient précisément de rendre exact, ne voudrait plus rien dire.

**Le compteur de touches (`hitSeq`) est un chiffre CYCLIQUE de 0 à 9, jamais une valeur absolue.** Le client ne lit qu'une **différence** entre deux instantanés consécutifs. Dix touches en cinquante millisecondes sur la même cible — deux cents par seconde — est une cadence qu'aucun chargement n'approche. Un chiffre et non trois octets : mesuré arène pleine, la version à 255 coûtait +11,8 % de poids d'instantané, au-dessus du budget de 10 % ; à un chiffre, +6,2 %. Il est **coupé quand il vaut zéro** (`trimTail`, `keep = 7`), et la majorité des ennemis présents n'ont jamais été touchés.

Il existe parce qu'aucun réglage client ne pouvait corriger le problème : à 20 Hz, un joueur à cadence élevée place deux à quatre balles entre deux instantanés, et une variation de PV n'en montre qu'une seule. Le **coup fatal** ne laissait, lui, aucune trace du tout.

**Une balle qui touche un ennemi passe par `_bulletHitEnemy()`.** La boucle de collision **et** le balayage à l'apparition l'appellent : sinon une balle qui touche à bout portant se comporterait différemment d'une balle qui touche à dix mètres — grenade, chaîne de foudre, ricochet, inertie, perforation — ce qui se paierait à la première carte ajoutée.

**Un ennemi ne chevauche jamais un joueur** (`_separateFromPlayers()`, `PLAYER_SEPARATION`). Cause racine d'un bug bien réel : les balles naissent à 16 px du centre, un runner a 9 px de rayon et une balle 4, donc la collision se fait à 13 px. Un runner à moins de 3 px du centre voyait la balle naître **déjà au-delà de lui**, puis s'éloigner — il y avait un disque de 16 px de rayon autour de chaque joueur dans lequel un ennemi était strictement invulnérable à son porteur. En équipe un allié le tuait de l'extérieur ; en solo, personne.

Trois règles indissociables : la constante est **dédiée** (la répulsion contre un joueur est une contrainte, pas l'évitement souple du troupeau) ; le joueur n'est **jamais** déplacé en retour (deux cents ennemis l'auraient charrié à travers l'arène, et la prédiction locale aurait combattu le serveur à chaque image) ; et le contact garde **une morsure d'un pixel** (`PLAYER_BITE`), parce qu'une séparation résolue pile à la somme des rayons fait échouer le test de dégât de contact une image sur deux au gré de l'arrondi flottant.

**`_spawnSweep()` teste le segment centre du joueur → point d'apparition**, dans l'ordre où la balle le parcourt. C'est le filet de sécurité du même bug, et la bonne correction pour toute apparition décalée qu'on ajouterait plus tard.

**`fullMods()` et `effectiveCards()` sont exportés par `game_state.js`, en fonctions pures.** La fenêtre de build affiche les multiplicateurs **réels** d'un joueur — « ×2,4 dégâts, ×1,8 cadence » explique le tableau des scores bien mieux que la liste des cartes. Recoder le repli côté client aurait donné deux implémentations qui divergent au premier réglage, sur précisément l'écran dont le seul but est de vérifier un chargement. Elles vivent dans `game_state.js` et non dans `cards.js` parce que le repli de classe a besoin de `classAt` — et `cards.js` ne doit dépendre de rien.

**Le lancement attend que TOUS les présents aient confirmé, et la garde vit des DEUX côtés** (`notReady()` dans `room.js`, point de passage unique du `case "start"` et du libellé d'attente). Désarmer `#start` côté client est de l'**affichage**, pas une règle : un client modifié enverrait `{ t: "start" }` directement. Le drapeau est porté par le **client** et non par la salle — il suit le joueur, comme `cls` et `vote` — et se remet à zéro à **trois** endroits : au lancement de la manche (`startRound()` ; le salon se réaffiche entre deux manches, un `ready` hérité ferait démarrer la suivante sans que personne n'ait rien reconfirmé), à l'entrée dans une salle (`attach()` ; sinon on arriverait « prêt » dans un salon où l'on vient de mettre le pied), et à l'initialisation du client. `notReady()` **ne filtre pas les spectateurs**, contrairement à ce que la spécification de conception demandait : au salon, `spectator` dit « je n'ai pas joué la manche qui vient de finir », c'est un résidu et non une prévision — `startRound()` remet tout le monde à `spectator = false`, donc tous les présents entrent. Le bouton désarmé **nomme qui manque** (« en attente de Kiwi »), même règle que `.classOpt.taken` : un bouton qui ne répond pas passe pour une panne tant qu'on n'a pas lu pourquoi.

**Le lancement est DIFFÉRÉ de trois secondes, et n'importe qui les interrompt.**
`case "start"` n'ouvre plus la manche : il arme `room.launchAt` et diffuse
`launch`, la boucle fait le reste. Trois secondes et pas cinq — le délai doit
couvrir le clic regretté (« attends, je n'ai pas pris ma classe ») sans devenir
une attente qu'on subit à chaque manche ; c'est l'échelle du retrait d'un envoi
dans une messagerie, et pour la même raison.

**La garde d'hôte reste sur le lancement, jamais sur l'annulation.** Décider
quand on part appartient à l'hôte ; trois secondes pour dire non à une manche
qu'on va jouer appartiennent à la table — l'erreur n'est pas toujours celle de
l'hôte. Le bouton est donc rendu à tous et réarmé pendant le décompte, alors
qu'il n'appartient qu'à l'hôte le reste du temps.

**Les conditions sont revalidées à chaque tick, pas seulement au clic**
(`tickLaunch`). Sans ça, les trois secondes ouvrent une fenêtre où la garde du
`case "start"` ne vaut plus rien : il suffirait de se dé-prêt juste après pour
entrer dans une manche qu'on n'a pas confirmée. Un **départ**, lui, n'annule
pas — celui qui part était prêt, ceux qui restent le sont toujours, et annuler
donnerait à n'importe qui le pouvoir d'interrompre la table en fermant son
onglet. Une salle **vidée** annule : il n'y a plus personne pour jouer.

**Le message porte une DURÉE, jamais une échéance.** Les deux horloges n'ont
aucune raison d'être d'accord, et un `Date.now()` serveur affiché tel quel donne
un compte à rebours faux de plusieurs secondes ; le client reconvertit en horloge
locale. `why` n'accompagne que les annulations **subies** — une annulation
volontaire n'a rien à expliquer, celui qui vient de cliquer sait pourquoi.
Corollaire : `cancelStart` ne rediffuse pas le salon, qui réécrirait par
`refreshPanel()` la ligne d'attente que le message d'annulation vient de poser.

**Un même bouton, deux actions opposées — donc deux couleurs et deux sons.**
`#start` passe en **ambre** (`.cancel`) : la grammaire réserve le rouge au létal
et le cyan dit « il faut y aller », c'est-à-dire l'inverse de ce que le bouton
fait alors. Sa **pulsation s'arrête** — `armed` respire pour attirer sur une
action qu'on attend, or ici c'est le compte à rebours qui court, et deux choses
qui battent au même endroit se lisent comme du bruit. Le son suit l'action et non
le bouton (`uiSoundFor` lit `.cancel`), exactement comme pour la bascule
`#readyBtn`.

**Un état de couleur ne vaut que s'il couvre AUSSI le survol et l'appui.** Le
bouton changeait « parfois oui, parfois non » : les règles génériques
`#start:hover:not(:disabled)` et `#start:active:not(:disabled)` reposent le cyan,
vivent **plus bas** dans la feuille que `#start.cancel` et ont la **même**
spécificité (0,3,0) — donc elles gagnaient. Or à l'instant où le décompte s'arme,
la souris est encore sur le bouton qu'on vient de cliquer : il restait cyan tant
qu'on ne bougeait pas et virait à l'ambre dès qu'on s'écartait. C'est toute la
loterie. Les deux états sont donc redéclarés en `.cancel` — même raison de fond
que `#gateContinue`, qui garde son ambre au survol : passer au cyan un bouton qui
**interrompt** reviendrait à lui faire dire « vas-y ». Vérifié au survol réel :
`color(srgb 0.966 0.696 0.261)`, l'ambre monté en lumière, et non le cyan.

**Le rendu du décompte ne repasse PAS par le salon.** `renderLaunch()` ne touche
que le libellé du bouton et la ligne d'attente ; il est appelé **en dernier** par
`refreshPanel()` — placé plus haut, tout ce qui suit le réécrirait. Un
`refreshPanel()` complet toutes les 200 ms aurait reconstruit les listes de
classes et d'équipe, c'est-à-dire rejoué la cascade d'entrée : le salon aurait
bougé pendant qu'on lit le compte à rebours. À l'**échéance locale**, le bouton
se désarme sur « Lancement… » au lieu de revenir à « Lancer la manche » — le
`round` du serveur arrive quelques dizaines de millisecondes plus tard, et un
bouton qui se réarme juste avant de disparaître est exactement ce qui fait
brouillon.

**Le briefing de classe retient la VAGUE, pas la simulation** (`state.warmup`, 20 s). Une phase serveur à part avait été essayée et c'était le mauvais découpage : elle figeait `step()`, donc personne ne pouvait bouger, et le bouton « Continuer » — qui ferme le voile pour aller se placer sur la carte — n'avait plus rien à découvrir. La manche démarre donc **tout de suite** ; `step()` tourne, les joueurs se déplacent, visent, testent leurs compétences, et seules **trois** choses sont retenues : `_waveTick()` (ce qui décide d'une vague), `_spawner()` (ce qui en fait sortir les ennemis) et le **tir automatique**. Ce dernier n'est pas un détail de confort : le tir part tout seul, c'est la règle du jeu, donc sans garde le briefing se lisait derrière une arène où quatre joueurs arrosaient le vide en continu. La **recharge**, elle, continue de descendre — on entre en vague l'arme prête, jamais avec un temps mort qu'on n'a pas choisi.

**`this.time` ne court pas non plus pendant l'échauffement.** C'est l'horloge de la manche, celle du bilan et du **classement au temps** du boss final : vingt secondes de promenade comptées comme de la survie rendraient deux parties incomparables, ce que le classement est précisément là pour mesurer. Vérifié : une manche de 15 s après échauffement affiche `00:15`, pas `00:35`.

**Aucun texte du briefing ne voyage sur le réseau.** Nom, teinte, deux compétences avec leurs touches et **mission** vivent dans `CLASSES` (`shared/classes.js`), que le client importe comme le serveur — le message `round` ne porte que `warmup`, la seule chose qu'un client ne peut pas déduire, et elle n'existe qu'à un endroit (`WARMUP_S`). La `mission` ne répète pas `desc` : celle-ci dit ce que la classe **est**, celle-là quoi faire des trente premières secondes. La **troisième compétence est annoncée avec sa touche** bien qu'elle n'existe pas encore : sans cette ligne, la touche 3 se découvre en tirant la carte, c'est-à-dire au milieu d'une vague — le pire moment pour apprendre une commande. Une ligne et non une troisième carte : le kicker dit « tes deux compétences », et une carte de plus ferait croire qu'on l'a déjà.

**Le voile du briefing n'attend PAS `--screen-hold`, et c'est le seul fondu
d'entrée du dépôt dans ce cas.** Le retrait existe pour qu'un écran entrant
laisse voir le sortant partir — il suppose que ce qui apparaît entre les deux est
un fond neutre. Ici le sortant est le salon, et ce qu'il découvre en s'effaçant
est l'**arène**, qui devient visible à l'instant même où la phase passe en
manche : pendant les 120 ms de retrait le voile était à zéro et le salon déjà
descendu, donc on voyait la carte avant le briefing. Aucun retard, donc, et un
fondu court (`--brief-in`, 180 ms) : le salon est encore proche de 1 quand le
voile est déjà loin. Mesuré sur la séquence réelle, en composant les deux
couches — fuite maximale **0,4 % à 83 ms**, nulle dès 164 ms, contre **11,7 % à
162 ms** avec le retrait. La **sortie** ne change pas : découvrir l'arène
progressivement en fermant le briefing est exactement ce qu'on veut. Le contenu
(`.briefWrap`) garde son `screenIn` retardé — il se pose sur un voile déjà
opaque, ce qui est le bon ordre.

**Les cinq dernières secondes du briefing passent à l'AMBRE.** Le cyan dit « il
faut y aller », ce qui est juste tant qu'il reste du temps pour lire ; sous cinq
secondes il ne s'agit plus d'aller quelque part mais de se préparer à encaisser,
et c'est ce que l'ambre dit partout ailleurs dans le jeu. Trois détails qui se
paient si on les oublie : la classe est posée sur le **conteneur** et non sur le
chiffre — la barre la lit aussi, et deux témoins du même compte à rebours ne
peuvent pas se contredire ; le seuil est testé sur la valeur **affichée**
(`Math.ceil`), sinon la couleur bascule une seconde avant que le chiffre ne
montre 5 et l'un dément l'autre ; et le chiffre **pulse** en plus de changer de
couleur, parce qu'une information portée par la seule couleur est perdue pour un
daltonien — même règle que les marqueurs posés sur un joueur. `closeBrief()`
retire l'urgence, sinon le briefing de la manche suivante rouvrirait en ambre
sur ses vingt secondes.

**Le voile n'est qu'un voile.** `openBrief()` s'ouvre **après** `refreshPanel()`, sur un HUD déjà en place ; « Continuer » retire le voile et rien d'autre à l'écran, le compte à rebours court avec ou sans lui, et il se referme tout seul à l'échéance — celui qui n'a pas cliqué ne doit pas découvrir la première vague à travers un panneau.

**L'échauffement se termine au PREMIER DES DEUX : tout le monde a fermé, ou
l'échéance tombe.** Vingt secondes imposées à une table qui a fini de lire sont
vingt secondes à regarder un compte à rebours dont personne n'a besoin ;
l'échéance reste malgré tout, et ce n'est pas un doublon — c'est le filet qui
empêche un joueur parti se faire un café de retenir la table, exactement comme
la pause qui se lève seule au bout de cinq minutes. Couper `state.warmup` est le
**seul** champ à toucher : `step()` relance les vagues, le tir automatique et
l'horloge de manche tout seul.

`briefWaiting()` est le point de passage unique, sur le modèle de `notReady()` et
pour la même raison — la décision de lancer la vague et le libellé affiché à ceux
qui ont déjà fermé doivent compter la même chose, sinon l'un attend quelqu'un que
l'autre ne nomme pas. Il filtre sur **`state.players` et rien d'autre** : c'est
la vérité de « qui joue », un spectateur n'y est pas, un arrivant en cours de
manche non plus, et un joueur **à terre** y est — il lit son briefing comme les
autres. Corollaire essentiel : un joueur qui se **déconnecte** en sort tout seul,
donc il ne peut pas retenir la vague vingt secondes pour rien, c'est la même
règle qu'un marqueur de mécanique dont le porteur disparaît.

`syncBrief()` a **quatre** appelants, et un seul n'est pas un événement : une
confirmation, un départ de manche, une déconnexion, et l'échéance vue par la
boucle — `warmup` descend dans `step()`, personne ne prévient quand il touche
zéro. Le drapeau `briefOpen` (sur la **salle** : c'est un état de la manche, là
où `client.briefDone` dit ce que chacun a fait) rend la méthode appelable de
partout sans rien diffuser en trop. La phase est testée **dans** `syncBrief()`
plutôt que remise à zéro dans `endRound` **et** `abortRound` : deux sorties de
manche à ne pas oublier, c'est le trou qui se paie une fois sur deux.

`client.briefDone` se remet à zéro aux **deux** mêmes endroits que `ready`, et
pour les mêmes raisons : à `startRound()` — sans quoi la deuxième manche
partirait sans que personne ait eu le temps de lire — et à `attach()`, sinon on
arriverait « briefing lu » dans une salle où l'on vient de mettre le pied.

**L'attente ne s'affiche qu'à celui qui a DÉJÀ fermé** (`#hudBrief`). Celui qui
lit voit son propre compte à rebours ; lui apprendre que d'autres lisent aussi ne
lui sert à rien et le presserait. Elle **nomme qui manque** — même règle que
`#waitMsg` au salon, et même seuil : les noms jusqu'à deux, le compte au-delà,
parce qu'à quatre joueurs trois noms font une phrase plus longue que le bandeau
de vague et qu'on ne lit pas une liste en se plaçant sur la carte. Elle **reprend
le compte à rebours**, et c'est ce qui l'empêche de se lire comme un blocage :
« en attente de Kiwi » seul ne dit pas si l'on est parti pour deux secondes ou
pour la soirée. En **blanc** — la grammaire dit « blanc = ça concerne un allié »,
et c'est littéralement le cas ; ni cyan (on ne va nulle part), ni ambre (un
avertissement pour un coéquipier qui prend son temps serait un reproche).

**`briefState` s'applique à la RÉCEPTION, pas par `worldQueue`.** Il ne commente
aucune image : il dit où en sont les autres dans un menu, comme le salon ou le
tableau des scores. Le retard d'interpolation n'aurait fait que retarder la
disparition de l'attente à l'instant où la vague part. Symétriquement, le
`briefDone` part du **bouton** et non de `closeBrief()`, qui a trois autres
appelants — l'échéance, `roundAbort`, `roundEnd` — dont aucun n'est une
confirmation.

Mesuré sur une `Room` sans serveur ni base : à deux joueurs, `warmup` reste à 20
après une confirmation (attente diffusée `["J2"]`) et tombe à 0 après la seconde ;
deux clics du même joueur ne diffusent qu'une fois et ne lancent rien ; le départ
de l'autre libère la vague ; personne ne cliquant, la boucle coupe seule à
l'échéance en une unique diffusion ; et l'horloge de manche affiche `0.00`
pendant le briefing puis `2.02` deux secondes après sa fermeture.

**L'historique appartient à la SALLE, pas au joueur** (`room.history`) : celui
qui se reconnecte doit le retrouver, et quatre clients qui tiendraient chacun le
leur en afficheraient quatre versions. Il est rempli par `recordRound()`, appelé
aux **deux** sorties de manche à côté d'`unlockClasses()` et pour la même raison
— un seul des deux chemins oublié laisserait un trou une fois sur deux. Plafonné
à huit : `lobbyPayload()` est diffusé à chaque vote et à chaque choix de classe,
et une soirée de trente manches ferait grossir chaque message pour une
information que personne ne lit au-delà des trois dernières lignes. Il porte la
**vague atteinte et rien d'autre — ni victoire ni défaite** : le jeu ne connaît
pas cette notion, `bilanTitle` dit « vague N atteinte », et l'introduire là en
ferait une règle de game design décidée par un écran d'interface. L'heure voyage
en **horodatage absolu** et se formate côté client : un « 21:04 » calculé sur le
serveur serait faux pour tout le monde sauf lui.

**La latence est une propriété de la CONNEXION, pas de la partie** : `rtt` vit sur `WsConnection` et le battement de cœur (`hub.pingAll()`, 1 Hz, dans `server.js` à côté du tick mais jamais dedans — c'est du réseau, pas du jeu) est émis par le **hub**, seul émetteur de `ping()` du processus. L'horodatage voyage dans la **charge du ping** parce que la RFC 6455 impose au pair de la renvoyer à l'identique : c'est gratuit côté navigateur, et c'est ce qui rend la mesure juste quand deux pings sont en vol. Un pong de huit octets est une réponse au nôtre, toute autre longueur est un pong non sollicité qu'on ignore. **Moyenne exponentielle** et non valeur brute — un aller-retour saute de 8 à 40 ms d'une trame à l'autre, et un chiffre qui danse ne se lit pas. Il voyage dans `lobbyPayload()`, diffusé **sur événement** : le chiffre a quelques secondes au salon, ce qui est sans importance puisqu'on n'y joue pas, là où un message à 1 Hz aurait rendu bavard un salon inactif. `-1` quand aucun aller-retour n'est revenu, affiché en tiret : « 0 ms » se lirait comme une connexion parfaite, exactement le contraire de « on ne sait pas ».

**Une pause n'a de sens qu'à UN SEUL joueur, et c'est le serveur qui l'accorde.** Il simule en continu : à plusieurs, un joueur figerait la partie des autres. Le client ouvre le même panneau dans les deux cas, mais `pauseReal` ne vaut vrai que sur la réponse du serveur — se fier au client ici, c'est accepter qu'un onglet modifié fige une partie à quatre. Trois refus côté serveur : hors manche, demandeur pas en jeu, et **dès qu'un second client est connecté** (les connectés, pas les vivants : un spectateur a le droit de ne pas voir l'image se figer).

**La pause se lève toute seule au bout de 5 minutes ou à l'arrivée d'un second joueur** (`setPaused()`, point de passage unique des trois causes). Sans ça, un solo en pause laisse le serveur bloqué indéfiniment et personne ne peut le rejoindre — le même piège que la manche qui ne se terminait jamais quand tout le monde quittait. **Les recharges et les états ne s'écoulent pas** pendant la pause : ils vivent dans `p.timers` et `p.statuses`, qui ne descendent que dans `step()`, et il suffit donc de ne pas l'appeler. Une pause qui rendrait les compétences gratuites serait une faille, pas un confort.

**Tout ce qui pose un état passe par `_applyStatus()`, tout ce qui en retire un par `_purgeStatus()`** — mêmes points de passage uniques que `_hurt()` et `_damage()`. Les effets se lisent là où ils s'appliquent et **nulle part ailleurs** : la Vulnérabilité dans `_hurt()`, l'Entrave dans `_players()`, la Brûlure dans `_statuses()`.

**Une purge ne retire jamais qu'un seul état**, dans l'ordre fixe `Sentence > Brûlure > Entrave > un cumul de Vulnérabilité` (`PURGE_ORDER`). Sans cette règle les cumuls ne veulent plus rien dire et le soigneur annule mécaniquement tout le travail du boss — ce qui le rend d'abord obligatoire, puis odieux à jouer. Seule la Purification au sol y échappe : un bonus se ramasse une fois, il ne se rejoue pas.

**La Sentence n'est jamais posée dans une équipe sans soigneur** (`hasHealer()` dans `_applyStatus`). C'est la seule question que le système d'états pose à la composition de l'équipe, et elle ne sert **qu'**à ça — jamais à ajuster une difficulté, ce que le dépôt refuse par principe. À l'échéance, elle **met à terre** et ne tue jamais sec.

**Un dégât continu passe `overTime = true` à `_hurt()`.** Sans ce drapeau, une brûlure de cinq secondes remet `hitCd` à 0,55 s soixante fois par seconde et rend sa victime immunisée à tout le reste — contact, tirs, zones. On brûlait en sécurité.

**Les états vivent à côté de `p.mods`, comme les minuteurs.** `_recomputeMods()` rejoue tout le chargement à chaque carte prise : un état rangé dans `mods` disparaîtrait au premier écran de choix, c'est-à-dire au pire moment.

**La classe passe par `p.mods`, comme les cartes.** `_recomputeMods()` applique les multiplicateurs de classe après `computeMods()` ; aucun système ne demande jamais la classe d'un joueur pour calculer des dégâts, des PV ou une vitesse. C'est ce qui fait que `_teamPower()` — donc les PV du boss et la pression des vagues — intègre la classe sans une ligne de plus. Seules les **compétences** (`_skill1`, `_skill2`) lisent `classAt(p.cls)`, parce qu'elles branchent sur trois comportements distincts.

**L'état de provocation est global** (`state.taunt = {id, until, x, y}`), consulté par `_nearestPlayer()`. Une cible stockée sur chacun des 200 ennemis aurait coûté un champ de plus dans la simulation *et* dans le snapshot pour une information qui ne dure que cinq secondes.

**Le mode soin est la seule chose du jeu où une balle teste les joueurs.** `_healBullet()` est appelé avant la boucle de dégâts et sort immédiatement : payer ce test sur les quatre cents balles en vol d'une fin de manche, pour une classe unique, ne se justifie pas. Ces projectiles ne blessent pas mais **s'arrêtent quand même sur les ennemis** — c'est la contrainte qui fait la classe.

**`_wave(x, y, r, dmg, owner)` est l'onde blanche des cartes ; l'horloge de la manche s'appelle `_segmentTick(dt)`.** Deux méthodes de même nom dans un corps de classe ne sont pas une erreur en JavaScript : la dernière écrase la précédente en silence. Le bug a existé du temps où l'horloge s'appelait `_wave` — pulsar, riposte et onde de mort l'appelaient avec une abscisse en guise de `dt`. Le préfixe est ce qui empêche de le refaire.

**Les systèmes lisent `p.mods`, jamais la liste de cartes du joueur.** `_recomputeMods()` rejoue le total depuis zéro à chaque prise — c'est le seul moyen qu'un modificateur ne dérive pas au fil de la manche. Les minuteurs (`p.timers`) vivent à part : un recalcul de mods ne doit pas remettre une recharge à zéro.

**Une famille de cartes occupe les quatre paliers de rareté, et le palier vaut la rareté** (`family` / `tier` dans `cards.js`). Trois règles de tirage indissociables : jamais deux paliers de la même famille dans un même tirage, un palier supérieur possédé retire les inférieurs du pool, et les paliers **se cumulent**. Enlever l'une des trois casse les deux autres — deux paliers offerts ensemble, c'est un choix où une option domine toujours.

**Les légendaires sont garanties à des jalons et plafonnées, jamais laissées au hasard** (`LEGENDARY_LEVELS`, `LEGENDARY_MAX`). Le jalon se déclenche au premier écran ouvert **à partir du** niveau seuil, jamais pendant ce niveau exactement : un niveau qui n'ouvre pas d'écran ferait sauter la garantie — et depuis que les écrans sont groupés après un boss, plusieurs niveaux passent sans écran, donc le correctif compte plus qu'avant. Le compte des jalons honorés vit dans `GameState` (`legendaryLevelDone`) et non dans `cards.js`, qui doit rester une fonction de ses arguments.

**L'EXPÉRIENCE VAUT LES PV MAX DE LA CIBLE**, versée dans `_killEnemy` avant tout test de propriétaire — un kill sans auteur (brûlure, joueur déconnecté) ne disparaît pas de la jauge commune. Appliquée avec l'ancienne valeur en points, la règle « de l'expérience uniquement en tuant » s'annulait : les PV montent sur l'horloge, donc un grunt tardif coûtait vingt fois plus de dégâts pour les mêmes 10 points. Aux PV, l'expérience par minute devient proportionnelle aux **dégâts par seconde de l'équipe**. `score` reste la valeur **tactique** (tableau des scores) ; les PV sont la valeur **économique** (progression) — ne pas confondre les deux. La boucle ne s'emballe pas : un palier coûte +18 % quand une carte rapporte +9 % de puissance, donc chaque niveau prend 8 % de temps de plus que le précédent. Le **boss crédite en continu** depuis `_damage()`, à `BOSS_XP_K` (0,35) et sans le surplus du coup fatal — au point de passage unique, comme `bossDmg`. Un ennemi **supprimé** sans mourir (balayage d'arrivée du boss) ne crédite rien : il ne passe pas par `_killEnemy`.

**Une carte est garantie par boss**, en plus des niveaux en attente — six boss, six choix indépendants de la jauge. C'est un `pendingLevels++` dans `_killBoss` et non un appel spécial : l'enchaînement des écrans (`resumeRound` rouvre tant qu'il en reste) marche alors sans rien changer, et le compteur reste la seule vérité sur le nombre d'écrans.

**`computeMods()` ne connaît qu'un chargement et qu'un instant.** Ce qui dépend du temps (« Cœur de forge », +5 % par vague) ou des autres joueurs (« Vœu partagé ») est résolu par `_recomputeMods()` côté `GameState`, jamais là-bas — sinon la fonction cesse d'être rejouable telle quelle dans un script de mesure. Corollaire : `_startWave()` rejoue les mods des porteurs de « Cœur de forge », et toute prise de carte rejoue **toute la table** quand un « Vœu partagé » est en jeu.

**`computeMods()` fait deux passes.** `apply(m, n)` d'abord, puis `applyAfter(m, n, ctx)` pour les cartes conditionnelles, dont la valeur dépend du reste du chargement. Une carte conditionnelle évaluée dans la première passe verrait un `mods` à moitié construit : sa valeur dépendrait de l'ordre d'insertion dans la Map, donc de l'ordre dans lequel le joueur a pris ses cartes.

**Le serveur valide aussi les choix de classe** : hors emplacement unique déjà pris, et refusé pendant la manche à laquelle on participe (le verrou est posé au lancement, pas au choix — un spectateur doit pouvoir préparer son entrée). Il est **levé aux deux sorties de manche**, par `unlockClasses()`, point de passage unique appelé avant la diffusion du salon : `startRound()` construit un `new GameState()` à chaque manche, donc les cartes de classe ne survivent pas d'une manche à l'autre et le verrouillage de session ne protégeait plus rien. Les emplacements pris se recalculent depuis les clients **connectés** — rien à défaire au déverrouillage, le tank redevient disponible dès que son porteur en change.

**Le serveur valide qu'une carte choisie figure bien dans les trois offertes à ce joueur pour ce tour de choix.** Sans ça, n'importe quel client s'octroie une légendaire. Les tours s'enchaînent : `resumeRound()` rouvre un écran tant que `state.pendingLevels > 0` au lieu de reprendre la manche.

**La progression permanente (lot D) est EXCLUE de la difficulté par construction.** `_recomputeMods()` garde dans `p.powerMods` le résultat de `fullMods` (cartes + classe) et applique la méta (`applyMeta`, `shared/progression.js`) sur une **copie** qui devient `p.mods` ; `_playerPower()` lit `p.powerMods` et rien d'autre. Les cartes restent absorbées par les vagues et les boss, la méta est un gain net borné par les emplacements. Corollaires : le serveur valide tout achat (`metaBuy`/`metaEquip`/`metaConfort`, traités par le hub — valides au hub et au salon d'une salle, jamais pendant une manche), les cartes verrouillées par jalons ne sortent jamais d'un tirage (`locked` dans `eligibleCards`), la monnaie se verse **à parts égales** en fin de manche (`awardRun`), et les écritures de PROGRESSION n'ont lieu qu'au salon, en fin de manche et au départ d'un joueur — jamais pendant une vague (les écritures d'AUTHENTIFICATION — login, jeton, changement de mot de passe — partent quand elles arrivent : un upsert par ligne est atomique et ne touche pas la progression d'un autre compte). **Supabase est la SEULE persistance — il n'y a plus de fichier local.** Une table `comptes`, **UNE LIGNE PAR COMPTE**, portant l'authentification en colonnes et la progression en jsonb (`data`) — jamais l'inverse : un hachage dans le jsonb finirait par voyager avec le profil. L'état chaud vit en mémoire (la Map `accounts` du magasin) ; la configuration passe par `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` et rien d'autre — sans elles le jeu reste jouable en LAN mais les comptes meurent avec le processus, et le journal le dit au boot. Les écritures sont **CIBLÉES et REGROUPÉES** : `save(pseudoLower)` marque un compte sale, la fenêtre de 2 s (dans le magasin, pas dans le hub) agrège, l'envoi est un seul upsert multi-lignes des seuls comptes sales, à la sérialisation défensive — un upsert multi-lignes échoue en bloc, une ligne malade s'écarte en journalisant. Le chargement est **PAGINÉ** (en-tête `Range`, PostgREST plafonne à 1000 lignes) — un chargement silencieusement tronqué est le bug qu'on ne débogue pas. Les protections nées de l'absence de copie disque sont conservées : **le chargement précède l'écoute** (`store.ready` avant `listen()`, résolue dès la première tentative) ; **l'écriture est suspendue tant qu'aucune lecture n'a réussi** ; une ligne de **version inconnue est GELÉE** (`frozen`) — ni adoptée, ni jamais réécrite, pseudo indisponible ; **les migrations s'ENCHAÎNENT** (`migrate` traverse 3 → 4 → 5 dans le même appel) plutôt que de se remplacer, sinon chaque nouvelle version gèlerait les comptes restés deux versions en arrière — le gel est fait pour les versions *inconnues*, pas pour les anciennes ; **un envoi raté se réessaie tout seul** (10 s) ; et **l'arrêt du processus vide la file** (`flush()` sur SIGTERM/SIGINT, court-circuite la fenêtre de regroupement). **La page admin (`/admin`) n'existe que si `ADMIN_KEY` est posée** — sinon 404, page comprise ; la clé voyage dans l'en-tête `x-admin-key` (jamais l'URL), comparée en `timingSafeEqual`. Elle liste les comptes (depuis la mémoire — jamais un hachage ni un jeton), réinitialise un mot de passe (`adminPassReset` : temporaire affiché UNE fois, jeton invalidé — le titulaire légitime est peut-être celui qui a perdu l'accès), supprime un compte (`deleteAccount` : le connecté est déconnecté D'ABORD, sinon son profil en mémoire repart au prochain save) et remet tout à zéro (`store.reset()`, refusée dès qu'une salle est en manche) : les DEUX moitiés ou rien, après attente de l'envoi en vol — dont le corps déjà sérialisé ressusciterait les lignes — puis les connectés sont **déconnectés** (`kickAccounts`) : un mot de passe ne se recrée pas d'office comme l'était une clé générée, chacun repasse par l'écran de création. La récupération tardive n'adopte une ligne distante que si le local est **vierge** (`pristine()`) — un profil qui a déjà progressé a raison, comme avant. Appels REST en `node:https` natif — pas de `fetch` en Node 16, pas de dépendance.
**Le marchand de reliques (lot K) emprunte le mécanisme des cartes, sauf l'exclusivité.** `_endWave` ouvre `openMerchant()` quand `relicBossDue` est vrai (posé par `_killBoss`, uniquement pour les cinq boss normaux — le boss final a son propre traitement au lot N), `relicPending` stoppe la boucle comme `cardsPending`, et la salle a sa `PHASE_MERCHANT` calquée sur `PHASE_CARDS`. Les différences tiennent au modèle d'achat : les achats sont **indépendants** (un joueur achète zéro, une ou trois reliques — c'est un budget à répartir, jamais un choix exclusif), l'échéance **ferme sans forcer** (on ne force pas d'achat, on garde les éclats), et la relique achetée **sort de l'offre courante** — sans cette retraite, un solde généreux permettait d'acheter la même relique trois fois et les PV bruts se cumulaient sur la jauge.

**Les reliques vivent dans `p.relics`, à côté de `p.mods` et des minuteurs** — jamais dedans : `_recomputeMods()` rejoue tout le chargement à chaque carte prise, et une relique rangée dans `mods` disparaîtrait au premier écran de choix. Leurs effets sont lus **par les points d'application** : le flat des dégâts dans `_shoot()` (avant les multiplicateurs — « +8 dégâts » vaut autant pour le Rempart à ×0,80 que pour le Tireur, c'est l'axe de puissance neuf des cartes), le flat contre les boss dans `_damage()` (sur la cible **avant** la redirection des Jumeaux), le flat des PV dans `_recomputeMods()` (le delta rend la jauge tout de suite), la cadence dans `_players()`, la vitesse fixée en remplaçant `speedMul` (jamais en le multipliant), l'essaim en ajoutant un drone au compte `mods.swarm` (le drone est déjà une entité du snapshot — rien à transmettre de plus).

**`powerIndex` a un second paramètre, `flat`, et les deux côtés le passent.** La fenêtre de build affiche le chiffre qui pilote réellement les PV du boss : sans le flat, la jauge et la simulation divergeraient au premier réglage. Le flat du « Cœur de Ravageur » (boss uniquement) compte à **un tiers** — la part du temps passé contre les boss — sur le précédent du catalyseur (moitié pour une cible affectée) : le compter plein sur-calibrerait les vagues, ne pas le compter sous-calibrerait les boss. Les reliques voyagent au client dans le **champ `relics` du message `loadout`**, séparé de `byPlayer` : un onglet ancien ignore la clé et continue de jouer.

**Une relique à contrepartie l'affiche en évidence** (`.cardWarn`), jamais en petit texte — elle se refuse pour ce qu'elle coûte, pas pour ce qu'elle donne.

**Le boss final (lot N) est la SIXIÈME entrée du roster, et il n'est jamais tiré.** `_pickBoss` le rend quand `_rosterCleared()` est vrai — les cinq boss normaux **vaincus** (`bossKindsKilled`, pas `bossSeen` : un boss croisé puis fui n'a rien appris à personne) — et la boucle du tirage ordinaire s'arrête à `BOSS_FINAL`, sinon il sortirait au hasard dès la première vague de boss. `finalDone` l'empêche de revenir si la manche continue.

**Ses patterns repris sont intensifiés par DEUX champs de roster, pas par vingt variantes** : `atkCdMul` dans le calcul de `attackCd` et `zoneMul` dans `_zoneDamage()`, les deux points de passage uniques. Un champ absent vaut 1 — les cinq boss normaux ne bougent pas d'un cheveu. C'est le même raisonnement qu'`adaptMech` : on refuse la duplication des combats.

**Le compte de `unlock` est de `bars - 1`, jamais `bars`.** `_bossBars` plafonne `phase` à `bars - 1`, et `bossPool` lit `unlock[0..phase-1]` : avec huit barres, une huitième entrée ne sortirait **jamais** — et c'est le sceau qui y serait tombé. Le Noyau a donc **sept** entrées. Il est aussi le seul boss à garder `floor: 0` : la montée en répertoire par barre est tout son combat, et le `bossCount` (5 à ce stade) aurait ouvert d'emblée les quatre premières couches.

**Le sceau se pose UNE fois** (`b.sealDone`) : sans ce drapeau, le tirage d'attaque le relancerait toutes les trois secondes et sa fenêtre de 22 s ne se refermerait jamais. Un échec le **repose** — la dernière barre ne se franchit pas en échouant. Son cumul est un **temps** (`m.cur` en secondes, pas un effectif) qui **redescend à mi-vitesse** quand on lâche : une mécanique de vingt secondes qui ne regarderait que la dernière image punirait l'esquive au lieu de la coordination.

**La victoire finale vit dans `state.finalVictory`, posée sur `state.time`** — l'horloge autoritaire de la simulation. Le serveur ne recalcule rien, il persiste ce chiffre : c'est ce qui rend le classement vérifiable. Elle est relevée par `endRound()` **avant** `awardRun`, qui la consomme, et le record est **par difficulté** (`bestFinal`, clé = index de `DIFFICULTIES`) : une case unique aurait poussé tout le monde à jouer en calme pour figurer au tableau. Le classement se consulte au **hub** et non au Terminal — il compare des comptes entre eux, sa place est là où l'on est justement hors salle.

**Le bannissement (lot J) emprunte le mécanisme des jalons.** `bannedCards` (profil, à plat) s'unit à `lockedCards()` dans le `meta.locked` que la salle construit : le filtre « n'apparaît jamais dans un tirage » existait déjà, en amont du tirage. Bannir **consomme la phase** (mêmes gardes que `pickCard` : offre courante, phase ouverte, idempotence), écrit **immédiatement** (hook `persist` — l'écran de cartes est une pause entre deux vagues, pas une vague), et la **clôture de dépendances** (`banClosure`, champ déclaratif `dependsOn` dans `cards.js` — aucune carte n'en porte aujourd'hui) s'écrit à plat : le tirage n'a jamais un graphe à résoudre. `p.locked` est mis à jour dans la foulée pour les écrans suivants de la même manche. Pas de débannissement ; l'onglet Bannies du Terminal est de la consultation seule. Un pool vidé par les bans retombe sur la carte de secours (`ravitaillement`) — testé jusqu'au ban total.

**La progression permanente (lot D) est EXCLUE de la difficulté par construction.** `_recomputeMods()` garde dans `p.powerMods` le résultat de `fullMods` (cartes + classe) et applique la méta (`applyMeta`, `shared/progression.js`) sur une **copie** qui devient `p.mods` ; `_playerPower()` lit `p.powerMods` et rien d'autre. Les cartes restent absorbées par les vagues et les boss, la méta est un gain net borné par les emplacements. Corollaires : le serveur valide tout achat (`metaBuy`/`metaEquip`/`metaConfort`, traités par le hub — valides au hub et au salon d'une salle, jamais pendant une manche), les cartes verrouillées par jalons ne sortent jamais d'un tirage (`locked` dans `eligibleCards`), la monnaie se verse **à parts égales** en fin de manche (`awardRun`), et les écritures de PROGRESSION n'ont lieu qu'au salon — voir plus bas. **L'économie du lot H** : le revenu est **linéaire et plafonné** (`coresForRun` = vague atteinte × `CORE_WAVE` + boss × `CORE_BOSS`, plafond `CORE_RUN_CAP` — l'ancienne somme des vagues croissait au carré et une bonne première partie payait un arbre entier), **les jalons ne créditent jamais de noyaux** (la monnaie vient du jeu répété, la capacité vient des jalons), et **les emplacements se gagnent aux jalons du compte** (`slotsFor(profile)` : 3 de départ, vague 10, trois `boss_N`, 25 parties — plus jamais aux paliers achetés, qui cumulaient les deux avantages sur la même tête). L'écran est le **Terminal** (`#menu`, point d'entrée unique `#terminalBtn` au salon, pastille quand des noyaux sont dépensables — `cheapestPurchase`) : onglets de classe, ligne d'emplacements toujours visible, onglets Arbre/Confort/Jalons, trois états visuels par ligne (équipée, achetée, non achetée). **Migration v4 SÈCHE** (`adoptRow`) : une ligne de version **antérieure** repart sur `newProfile` — l'authentification vit dans les colonnes, elle traverse intacte ; une version **future** reste gelée. Les écritures de PROGRESSION n'ont lieu qu'au salon, en fin de manche et au départ d'un joueur — jamais pendant une vague (les écritures d'AUTHENTIFICATION — login, jeton, changement de mot de passe — partent quand elles arrivent : un upsert par ligne est atomique et ne touche pas la progression d'un autre compte). **Supabase est la SEULE persistance — il n'y a plus de fichier local.** Une table `comptes`, **UNE LIGNE PAR COMPTE**, portant l'authentification en colonnes et la progression en jsonb (`data`) — jamais l'inverse : un hachage dans le jsonb finirait par voyager avec le profil. L'état chaud vit en mémoire (la Map `accounts` du magasin) ; la configuration passe par `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` et rien d'autre — sans elles le jeu reste jouable en LAN mais les comptes meurent avec le processus, et le journal le dit au boot. Les écritures sont **CIBLÉES et REGROUPÉES** : `save(pseudoLower)` marque un compte sale, la fenêtre de 2 s (dans le magasin, pas dans le hub) agrège, l'envoi est un seul upsert multi-lignes des seuls comptes sales, à la sérialisation défensive — un upsert multi-lignes échoue en bloc, une ligne malade s'écarte en journalisant. Le chargement est **PAGINÉ** (en-tête `Range`, PostgREST plafonne à 1000 lignes) — un chargement silencieusement tronqué est le bug qu'on ne débogue pas. Les protections nées de l'absence de copie disque sont conservées : **le chargement précède l'écoute** (`store.ready` avant `listen()`, résolue dès la première tentative) ; **l'écriture est suspendue tant qu'aucune lecture n'a réussi** ; une ligne de **version inconnue est GELÉE** (`frozen`) — ni adoptée, ni jamais réécrite, pseudo indisponible ; **un envoi raté se réessaie tout seul** (10 s) ; et **l'arrêt du processus vide la file** (`flush()` sur SIGTERM/SIGINT, court-circuite la fenêtre de regroupement). **La page admin (`/admin`) n'existe que si `ADMIN_KEY` est posée** — sinon 404, page comprise ; la clé voyage dans l'en-tête `x-admin-key` (jamais l'URL), comparée en `timingSafeEqual`. Elle liste les comptes (depuis la mémoire — jamais un hachage ni un jeton), réinitialise un mot de passe (`adminPassReset` : temporaire affiché UNE fois, jeton invalidé — le titulaire légitime est peut-être celui qui a perdu l'accès), supprime un compte (`deleteAccount` : le connecté est déconnecté D'ABORD, sinon son profil en mémoire repart au prochain save) et remet tout à zéro (`store.reset()`, refusée dès qu'une salle est en manche) : les DEUX moitiés ou rien, après attente de l'envoi en vol — dont le corps déjà sérialisé ressusciterait les lignes — puis les connectés sont **déconnectés** (`kickAccounts`) : un mot de passe ne se recrée pas d'office comme l'était une clé générée, chacun repasse par l'écran de création. La récupération tardive n'adopte une ligne distante que si le local est **vierge** (`pristine()`) — un profil qui a déjà progressé a raison, comme avant. Appels REST en `node:https` natif — pas de `fetch` en Node 16, pas de dépendance.

**Le compte est pseudo + MOT DE PASSE choisi, la session est un JETON.** Trois portes dans `hub.js` — `register` (page de création), `login`, `loginToken` (reprise silencieuse) — qui aboutissent toutes à `finishAuth`, seul endroit qui fabrique un client authentifié. Le mot de passe est haché scrypt avec sel par compte (`node:crypto`, dans `progress_store.js`, jamais dans `shared/` que le navigateur importe) et **n'est JAMAIS normalisé** — la normalisation (majuscules, tirets retirés) était faite pour une clé recopiée d'un papier ; appliquée à un mot de passe choisi, « MonPass » vaudrait « monpass ». Au login réussi le serveur émet 32 octets aléatoires, n'en garde que le **hachage sha256** (suffisant pour un secret à haute entropie, et gratuit là où scrypt bloque ~50 ms) avec une expiration **glissante** de 30 jours ; le client range le jeton en `localStorage` — **jamais le mot de passe** : un jeton volé ouvre ce jeu, un mot de passe volé ouvre tout ce que le joueur protège avec le même. Le jeton vit dans la ligne du compte, donc **il survit au redéploiement** ; chaque `login` le régénère — le dernier login gagne, la réponse au double onglet. **L'oracle de présence a disparu volontairement** : « ce pseudo est déjà pris » est la réponse normale d'une inscription, c'est le compromis de tout système à page de création ; en échange, `login` répond `ok:false` sans jamais dire lequel des deux cloche. Un échec de `loginToken` est un cas NORMAL (jeton expiré, login plus récent ailleurs) : ni compteur ni gel, un jeton de 256 bits ne se devine pas. Deux freins sur `login` : cinq essais par connexion (`fatal:1` au-delà — socket neuve obligatoire), et un **gel de 10 s par pseudo cible** après cinq échecs, testé AVANT scrypt — depuis que se reconnecter est gratuit, le frein par connexion seul se contournait en rouvrant une socket, et c'est aussi ce qui borne le coût CPU d'une rafale. Le contrôle « déjà connecté ailleurs » se fait après l'authentification ; la session dupliquée reçoit une copie détachée (`structuredClone`), jamais rangée dans le magasin — `store.save()` l'ignore tout seul, les noyaux ne se comptent jamais en double. **Un mot de passe perdu n'a qu'un filet : l'opérateur** (`adminPassReset`, page admin) — pas d'email, donc pas de réinitialisation autonome, assumé dans `LISEZMOI-BDD.md`. `changePass` exige l'ancien mot de passe et **le jeton actif survit** — c'est celui qui change le mot de passe qui tient la session, le déconnecter n'aurait puni que lui.

**`#gate` n'a qu'un chemin de connexion, et le Menu est un écran à part du Salon.** Deux onglets (`#gateForms` : connexion, création — fusionnés, le joueur ne sait jamais s'il crée un compte ou se trompe de mot de passe), pas de bouton de reprise à part : la session mémorisée s'absorbe dans « Se connecter » — pseudo prérempli, et un champ mot de passe laissé **VIDE** part en `loginToken` quand `survivor.token` existe pour ce pseudo, comme l'ancienne clé relue en silence à l'envoi. Le placeholder du champ le dit (`renderGateMode()`) — un champ obligatoire qu'on peut laisser vide passerait pour un bug. Jeton expiré → `authError{motif:"jeton"}` → « session expirée — tape ton mot de passe », sans compteur d'échec. Le clic reste obligatoire dans tous les cas : c'est lui qui débloque le contexte audio et lance `bootOnce()` (atlas + batcher, une seule fois quel que soit le bouton). Sur `"welcome"`, le client ne cache `#gate` que dans le cas normal (`gate.hidden = true; enterHub();`) ; le drapeau `dup` porté par le `welcome` lui-même (jamais l'ordre d'arrivée des messages) le fait au contraire **rester sur `#gate`, formulaire compris**, et révéler `#gateHold` en dessous : on vient de taper ses identifiants, masquer le formulaire donnerait l'impression que la connexion a échoué alors qu'elle a réussi. Le kicker de l'encart nomme le cas, sa phrase dit la **conséquence** (progression temporaire, non enregistrée) avant le clic, et `#gateContinue` la fait assumer — c'est la seule sortie de cet état, le renvoi vers la création restant affiché pour repartir sur un autre compte. Un `gate.hidden = true` inconditionnel avait été posé avant ce test, avec un `else` qui le refaisait : l'encart était rempli mais sur un écran déjà masqué, et `#gateContinue` n'avait plus de gestionnaire — l'avertissement n'a jamais été visible et l'écran n'avait aucune sortie dans ce cas. **Corollaire de la sortie d'écran** : depuis que `bootOnce()` ne réaffiche plus `#gate`, la branche `dup` doit le faire elle-même — c'est le seul chemin de SUCCÈS qui reste sur cet écran, et l'oublier donnait un écran entièrement noir (plus de gate, pas encore de hub). Un `authError` reçu CONNECTÉ ne peut venir que du changement de mot de passe : il s'affiche dans l'encart compte du hub (`passMsg`), jamais sur l'écran d'entrée. La déconnexion est un aller-retour (`logout` → `loggedOut` → purge du localStorage → fermeture) : purger d'abord laisserait un jeton valide de trente jours orphelin côté serveur. Le Menu, lui, ne s'ouvre plus depuis la connexion : chaque carte de classe du salon (`#classes`) porte son propre bouton (`.classMetaBtn`), qui appelle `openMenuFor(clsIndex)` — un joueur consulte les trois arbres avant de choisir sa classe, `#menuClose` referme vers le salon. `refreshPanel()` refuse de toucher `#panel`/le HUD tant que `#gate` ou `#menu` ne sont pas cachés (mêmes gardes, `!gate.hidden` puis `!menuEl.hidden`) : sans ça, un `"lobby"` broadcast — qui arrive presque tout de suite après n'importe quelle connexion — repeindrait le salon par-dessus, `#panel` étant plus loin dans le DOM que les deux autres, même z-index.

**PLUS RIEN N'INDEXE LA DIFFICULTÉ SUR LA PUISSANCE DE L'ÉQUIPE** (D2, lot R). `WAVE_HP_POWER_K` et `WAVE_RATE_POWER_K` valent **0** — le facteur `(1 + K × (power − 1))` s'évanouit sans qu'une ligne de logique change — et les PV de boss lisent `BOSS_POWER_REF` (2,36, la build médiane mesurée) au lieu de `_bossPower()`. Une **référence explicite** et non le genou à zéro : `bossPower(p)` avec `K = 0` rend le genou au-dessus du genou mais rend `p` **en dessous**, donc une build faible garderait un boss aux PV réduits — un scaling résiduel. La raison de fond n'est pas doctrinale : **un scaler dont l'entrée est sa propre sortie n'est pas mesurable**, et ce dépôt ne se pilote que par la mesure. Revenir en arrière est un changement de **trois constantes** ; `powerIndex()`, `bossPower()`, `_teamPower()` et `p.powerMods` restent, ils alimentent la fenêtre de build.

**Deux garde-fous, et ils sont indissociables de D2.** Sans scaling, la durée d'un combat devient inversement proportionnelle à la build. En bas : un combat court traverse les cinq barres sans laisser sortir la moitié du répertoire — on perdrait du contenu au moment où l'on récompense — d'où le **plancher de barre** (`BOSS_CFG.BAR_DWELL`, dans `_bossBars`), qui **diffère** la rupture sans jamais perdre les dégâts en excès (`broken` se déduit des PV à chaque image).

**La banque du plancher se vide BARRE PAR BARRE, jamais d'un coup** (lot W). Elle se vidait en entier à la première rupture : contre une build forte, l'excédent accumulé pendant le palier dépassait la réserve restante et le boss mourait **dans** sa propre rupture — mesuré sur le final à ×20 de dégâts, 11 s de combat et **une** couche de répertoire vue sur huit. Le plancher différait la rupture sans jamais différer la **mort**, c'est-à-dire qu'il ne protégeait rien. On n'applique donc que ce qui mène au plancher de la barre suivante ; le reste attend l'échéance. Aucun dégât n'est perdu, et la durée minimale devient réelle. En haut : le boss bloquerait l'horloge de horde indéfiniment, d'où l'**enrage** (`_bossEnrage`, paliers `ENRAGE_AT` / `ENRAGE_STEP`), qui monte les dégâts de zone et la cadence — et qui **s'annonce à chaque palier** par le canal d'alerte, comme les variantes de rupture de barre : une variante muette surprend au lieu d'informer. L'enrage passe par `_zoneDamage()` et par `attackCd`, donc par `_hurt()`, donc sous le plafond « une mécanique ratée ne tue jamais un joueur à pleine vie ».

**La pression compte les joueurs VIVANTS, l'expérience les joueurs CONNECTÉS.** `aliveCrowd()` est le point de passage unique du premier (débit du script, PV de boss), avec une **hystérésis** de 8 s — on descend après un délai, on remonte immédiatement, le sens sûr étant celui qui ne rend pas le jeu plus facile par accident. Ne jamais confondre : la normalisation de l'expérience (`joueurs^WAVE_CROWD_EXP` dans `_addXp`) compte les connectés, sinon une équipe qui perd deux joueurs voit ses paliers **baisser** au moment où elle tue moins — un cadeau au pire moment, et exactement la boucle de rétroaction que D2 refuse.

**LE BOSS FINAL CLÔT LE SEGMENT 6, et rien d'autre ne le fait sortir** (lot W). C'est la simplification que la structure en segments offre gratuitement : `plan4` devait prouver « après un cycle complet du roster » par arithmétique (« les boss occupent les vagues multiples de 5, le roster en compte cinq, donc le cycle se termine vague 25 »), le segment 6 **est** cet instant. La garantie reste, le calcul disparaît. `_pickBoss` borne son tirage à `BOSS_POOL_COUNT` — **écrit** dans `bosses.js` et non déduit de `BOSS_ROSTER.length`, sinon tout boss ajouté plus tard entrerait silencieusement dans le deck.

**Le deck se distribue EXACTEMENT : cinq boss pour cinq places, à tout effectif.** `minPlayers: 2` a disparu de l'Oracle et des Jumeaux — en solo le pool tombait à trois pour cinq places, donc deux combats se répétaient. Les trois options étaient répéter, écrire deux boss solo dédiés, ou **adapter** ; l'adaptation gagne parce que `adaptMech` existe, est testé et sert déjà onze mécaniques. Les deux mécaniques sans repli (`MECH_SPREAD`, `MECH_LINK`) sortent simplement du répertoire solo, leurs attaques retombant sur les marques. La réserve du dépôt reste écrite — « un Oracle solo, c'est le boss de la cohésion sans équipe » — avec un critère de révocation **chiffré** : si l'écart lit / ignore tombe sous 40 % en solo sur ces deux combats, on revient aux boss solo dédiés. C'est une mesure du lot X, pas une opinion.

**`bars` est une propriété du ROSTER, plus une constante globale** (`CFG.BOSS_BARS` en repli). Le final en a huit, les cinq autres cinq, et un boss qui suit la règle commune n'a rien à déclarer.

**HUIT BARRES FONT SEPT RUPTURES, donc SEPT entrées d'`unlock`.** C'est la même erreur d'arithmétique que celle déjà écrite pour `BAR_DWELL` — la première barre est ouverte dès le premier tir. `bossPool` empile `unlock[i]` pour `i < phase` et `phase` plafonne à `bars - 1` : une huitième entrée n'est **jamais** atteinte. Écrite comme le plan le demandait, elle mettait le sceau — la seule mécanique inédite du combat — dans du code mort, et la mesure le confirmait (sceau jamais posé, quel que soit le niveau de dégâts). Le damier du Ravageur vit donc dans `base`, ce qui n'est pas un pis-aller : il est le boss d'origine du dépôt.

**Chaque barre du boss final OUVRE sur le patron qu'elle vient de débloquer**, par la file d'attaques différées. Laissé au tirage, un patron n'est qu'une chance sur dix à chaque attaque d'une barre qui dure dix secondes : le sceau et la synthèse pouvaient ne jamais sortir. C'est le défaut que le plancher existe pour corriger — perdre du contenu au moment où l'on récompense — et le plancher seul n'y suffisait pas. Corollaire de lisibilité : la barre 2 s'ouvre sur les grappes de la Matriarche, la 8 sur le sceau, donc la citation s'entend au moment où elle est faite.

**La file d'attaques différées est une LISTE, pas un emplacement unique.** Le bug qui l'a imposé vaut d'être gardé : à un seul emplacement, la synthèse tirée par le pool de la huitième barre **écrasait** le sceau que la rupture venait d'y mettre, et la seule mécanique inédite du combat disparaissait sans trace au profit d'un patron déjà vu.

**La DERNIÈRE barre du final a un plancher elle aussi**, et c'est le seul boss dans ce cas. Sans lui, une build forte tue le boss dans la rupture de la septième barre — la banque s'y vide — et la huitième couche ne joue jamais. Le boss n'est pas invulnérable : les dégâts sont mis de côté comme sur les sept autres barres et tombent d'un bloc à l'échéance. Ce qu'on achète, ce sont les dix secondes pendant lesquelles le sceau se pose, s'annonce et se résout. Minimum mesuré : **80,1 s**, quelle que soit la build.

**Le seuil d'enrage du final est le sien** (`FINAL_ENRAGE_AT`). `ENRAGE_AT: 150` est calé sur une médiane de ~70 s ; le final a une médiane vers 155 s, et au seuil commun la moitié des combats médians enrageraient — un garde-fou deviendrait une mécanique de phase. C'est le **rapport** (environ deux fois la médiane) qu'on conserve, pas la valeur.

**Le sceau réutilise `towerCount(alive)`, jamais un second calcul d'effectif.** Trois choses le distinguent des tours de l'Oracle et les trois sont nécessaires : fenêtre longue (on traverse l'arène au lieu de se décaler), foyers posés plus loin du centre (on se répartit sur la surface, pas autour du boss), et sanction **pleine sur toute l'équipe** dès qu'un seul foyer est vide. Les tours sanctionnent au prorata ; le sceau est tout ou rien, c'est ce qui en fait la dernière marche.

**Le boss final a son propre verbe, et c'est l'ABSORPTION** : sa masse se contracte vers son centre au moment du coup au lieu de se détendre. Il rejoue les patrons des cinq — la tentation était de rejouer leurs verbes, il en aurait eu cinq donc aucun. L'absorption est le seul verbe cohérent avec « il est la synthèse des cinq » et il est distinct de la Matriarche, qui se vide vers l'**extérieur**. Deux signes inversés dans `drawBoss`, pas une seconde routine de posture.

**Le temps enregistré est celui du COMBAT FINAL SEUL** (`state.finalKill`, relevé dans `_killBoss`, seul instant où l'entité existe encore). Sous D1, le temps pour *atteindre* le boss final vaut 1800 s de horde plus les cinq combats précédents : il est dominé par une constante et deux équipes très différentes afficheraient des temps voisins. `bestFinalRun` porte en plus la **variante, le biome, la difficulté et l'effectif**, et ces quatre champs sont obligatoires — un temps n'est comparable qu'à contexte égal.

**Le répertoire du boss est indexé sur le SEGMENT, pas sur `bossCount`.** Les deux coïncident en pratique, mais le segment est le même pour toutes les équipes : la chorégraphie du segment 4 devient apprenable et racontable. L'écrire ainsi supprime la possibilité qu'ils divergent (un boss non tué, une reprise, un événement).

**Le boss passe par `_bossPower()`, les vagues par `_teamPower()` — jamais l'inverse.** Le boss suivait la puissance en linéaire **plein**, donc une durée de combat rigoureusement constante : ×1,00 de sensation de puissance, à chaque combat, pour un écart de build mesuré à **×4,54** (300 manches solo, `powerIndex` relevé à chaque carte ; ×2,93 par la chance seule). Les PV suivent désormais en plein sous `BOSS_POWER_KNEE` (2,5, soit au-dessus de la build médiane mesurée à 2,36, donc l'étalonnage existant est intact) puis n'en prennent plus que `BOSS_POWER_K` (0,50). Un **genou** et non un `Math.min` : un plafond dur crée une falaise où la carte qui fait franchir le seuil ne vaut plus rien. Les structures de mécanique (cage, grappe) passent par le **même** point de passage, sinon une build au-dessus du genou trouve les cages relativement plus dures que le boss. Les vagues gardent leur propre part (`WAVE_HP_POWER_K`, plus généreuse) : la sensation sur le boss doit rester **sous** celle des vagues — c'est le mur de la manche, il récompense moins que la piétaille. `BOSS_POWER_K = 1` rend exactement l'ancienne courbe.

**`powerIndex()` et `bossPower()` sont exportés en fonctions pures**, comme `fullMods` et `effectiveCards` et pour la même raison : la fenêtre de build affiche l'indice de puissance au joueur, et le recoder côté client donnerait deux implémentations qui divergent au premier réglage. `_playerPower()` n'est plus qu'un appel à `powerIndex(p.powerMods ?? p.mods)` — le choix de `powerMods` (méta exclue) reste dans la méthode, pas dans la fonction pure.

**Un multiplicateur affiché sans échelle n'informe personne.** « ×1,49 dégâts » sonne bien et vaut une build faible ; le défaut a été rapporté comme « les pourcentages ne fonctionnent pas ». La fenêtre de build et le bilan situent donc la puissance sur des repères **mesurés** (`POWER_MARKS` dans `client.js`) et affichent le genou. Ce sont des mesures, pas des constantes de réglage : les remesurer si le catalogue ou les raretés bougent.

**L'indexation elle-même reste la règle** : la difficulté suit la puissance réelle de l'équipe et non le temps écoulé. Toute nouvelle source de dégâts permanente doit être prise en compte dans `powerIndex`, sinon le boss redevient une formalité en fin de manche — et toute pénalité qui accompagne un gain doit y figurer aussi : oublier `barrelDamageMul` faisait surestimer la puissance de 44 % et triplait la durée du troisième combat.

**L'indexation porte sur la puissance mesurée, jamais sur la composition de l'équipe.** Ajuster la difficulté selon les rôles présents revient à facturer le soigneur à sa table : celui qui le choisit rend la partie plus dure pour tout le monde, et plus personne ne le choisit.

**La progression est commune à l'équipe** (`state.xp` / `state.level`), et les gains sont **normalisés sur l'effectif** (`joueurs^WAVE_CROWD_EXP`), comme le débit du script. Une jauge commune à paliers fixes donne quatre fois plus de cartes à quatre joueurs qu'à un seul pour une horde identique. Un niveau ne donne **rien** d'autre qu'un choix de carte.

**Une manche est SIX SEGMENTS de 300 s de horde, et le script vit dans `shared/timeline.js`** (module pur, comme `bosses.js`). Cinq beats de 60 s par segment, débit écrit beat par beat, boss en clôture. **L'horloge de horde (`hordeTime`) s'arrête pendant le boss et pendant l'écran de cartes** — sans quoi la durée d'un combat, qui dépend entièrement de la build, mangerait une part variable du segment suivant et deux manches cesseraient d'être comparables minute par minute. Rien ne se nettoie : `_segmentTick` avance l'horloge, `_startBeat` change de beat, `_killBoss` appelle `_nextSegment`. Une manche peut se **gagner** — six boss vaincus, `state.victory`.

**Le SILENCE est une pièce porteuse du script, pas un ornement.** Sans nettoyage de vague, dans un écran fixe et sans caméra, la population tend vers `MAX_ENEMIES` et y reste : le jeu devient « toujours 200 ennemis ». Un beat de silence (0,5 à 1,0/s) force un bonus au sol à son ouverture et doit faire descendre la population **sous 25** — sinon ce n'est pas un silence, c'est un ralentissement. Trois par manche au minimum, jamais deux segments de suite sans, **sauf le segment 3 qui n'en a aucun** : c'est la crise, et c'est le point bas de la partie.

**Le crescendo et le balayage vont ensemble.** L'arrivée du boss vide l'arène (sa silhouette se perdrait dans la masse), ce qui en modèle continu récompenserait le fait d'**arrêter de jouer** à 4 min 30 d'un segment. D'où le débit le plus haut sur la dernière minute, et un balayage qui ne crédite **ni score ni expérience**.

**La saturation ne traverse pas le réseau.** Passé `MAX_ENEMIES`, `_spawnEnemy` rend `null` et les apparitions sont jetées en silence — la difficulté plafonne au moment précis où l'équipe est en train de perdre. La réponse est de l'**information** (taux d'occupation au HUD), déduite de `enemies.length` que le client a déjà, comme la cadence des tireurs et la direction des projectiles.

**La géométrie d'apparition est un argument de `_spawnPoint(geom, r)`**, tirée du beat. `anneau` est la seule qui fasse naître un ennemi **à l'intérieur** des limites, donc la seule qui puisse le déposer dans le disque de 16 px où il serait invulnérable à son porteur : elle retire jusqu'à trouver un point dégagé et retombe sur un bord sinon. L'adaptation à l'effectif passe par `adaptEntry` (`minPlayers` / `fallback`, **la même signature que `MECHS`**) et ne change que la **forme** de la pression, jamais sa quantité — les exposants d'effectif (`WAVE_CROWD_EXP` en tête) portent la parité mesurée 1 / 4 joueurs et ne se touchent pas.

**Tout ce qui s'indexait sur la vague s'indexe sur le NIVEAU D'ÉQUIPE** (D3) : légendaires garanties, `minLevel` de la troisième compétence, « Cœur de forge », noyaux et jalons de progression du hub, records du profil. Le segment ne remplace pas la vague et ne le peut pas — toutes les équipes voient les six mêmes segments, donc un seuil de segment ne distinguerait personne ; le niveau, lui, se gagne. **`this.tier` a DISPARU au lot S.** Son dernier lecteur était les seuils d'apparition des types (`ENEMY_TYPES.from`), que le bestiaire porte désormais en `minLevel` — et un champ que plus personne ne lit est un champ qu'on finira par croire vrai. `beatIndex()` reste exporté par `timeline.js` pour qui en aurait besoin.

**« Cœur de forge » se rejoue à la MONTÉE DE NIVEAU**, dans `_addXp`, et non au changement de beat : c'est le seul mod dont la valeur ne vient pas du chargement, et son unité est désormais le niveau. `computeMods()` reste une fonction de la seule liste de cartes ; la part de niveau est ajoutée par `fullMods`, la relance par `_recomputeMods`.

**Ne jamais écrire dans `ENEMY_TYPES`.** La table est partagée, exportée et lue par le client. `standoff` est copié sur l'ennemi (`e.standoff`) plutôt que lu dans le type : le muter désarmerait les tireurs pour tout le processus. Le lot S a rouvert exactement ce piège et l'a refermé de la même façon : `traits`, `shieldArc` et tout l'état des traits (`dashCd`, `dashWarn`, `dashT`, `trailAt`, `healT`, `fireT`, `fleeT`, `hitAt`, `aura`) sont **copiés sur l'entité** à l'apparition, jamais relus dans le type au moment de s'en servir.

**Une vague spéciale remplace la COMPOSITION d'une vague, jamais son cycle** (lot L). Le modèle budget-puis-nettoyage est conservé tel quel : seuls le `pool`, le budget, les PV et le débit changent, et c'est ce qui permet de n'ajouter aucune condition de fin de vague. Cinq règles indissociables :

- **L'activation est DÉTERMINISTE** (`specialForWave()`, point de passage unique) : `vague % 5 === 3`. Ce n'est pas un choix esthétique — le classement au temps du boss final (lot N) compare des parties entre elles, et deux parties qui n'auraient pas tiré les mêmes vagues spéciales ne seraient plus comparables. Le module tient les trois garanties par **arithmétique** et non par une liste d'exceptions : jamais de collision avec un boss (`% 5 === 0`, boss final compris), jamais deux spéciales consécutives, et un motif identique dans chaque tranche de cinq. La proposition initiale (3, 6, 9, 12 puis cycle) retombait sur 15 et 20 dès le premier cycle.
- **L'ordre de `SPECIAL_WAVES` EST la séquence.** Pas de constante `SPECIAL_SEQUENCE` à côté : deux listes à garder d'accord divergent à la première retouche, et c'est l'index qui circule. On ajoute à la fin.
- **Les quotas de part (`share`) sont contournés**, délibérément. Une nuée de runners dépasse largement les 45 % qu'un runner s'autorise en vague normale — c'est exactement ce qui en fait une nuée. Le garde-fou existe pour qu'une vague *normale* ne s'appauvrisse pas ; une spéciale est définie par son appauvrissement.
- **La clôture rend 100 % des PV et du bouclier, et relève les joueurs à terre.** Sans condition : un cas « relevé mais pas soigné » serait illisible au moment précis où l'équipe cherche à comprendre ce qu'elle vient de gagner. C'est aussi ce qui paie l'asymétrie — un siège de tanks paraît plus dangereux qu'une vague normale, et sans récompense nette la bonne réponse serait de le fuir.
- **L'annonce se fait à la clôture de la vague PRÉCÉDENTE**, pas au démarrage : le répit est le seul moment où l'équipe a le temps de lire. Troisième variante du canal d'alerte (`{special}`), à côté de la mécanique et de l'identité du boss — aucune entrée de `MECHS` ne lui correspond, et en fabriquer une mélangerait le registre des mécaniques de boss avec celui des compositions de vague.

**Le gibier de « Chasse » porte deux drapeaux, et ils disent deux choses différentes.** `noExec` l'exclut du seuil d'exécution exactement comme le boss — un seuil de 10 % appliqué à une réserve de vie de vague entière fait disparaître le dernier quart de la **vague** en un tir. `hunt` le protège du marquage de retardataire : une chasse dure par construction plus que `WAVE_STRAGGLER_DELAY`, et le ×2 de vitesse ferait du gibier le chasseur. Ses PV dérivent du budget que la vague **aurait eu** (`CHASSE_HP_SHARE`) et jamais d'un nombre fixe, qui ne suivrait ni l'effectif, ni la difficulté, ni le numéro de vague.

**Une mort vaut `xpWorth` apparitions et `scoreWorth` fois son score**, tous deux à 1 sur un ennemi ordinaire. Deux champs et non un parce que ce sont deux monnaies : l'expérience se compte par apparition, le score en points. Sans eux, une vague de chasse verse **1** point d'expérience là où une vague 18 en verse 116 — le joueur perdait purement et simplement une carte à chaque chasse.

**Les trois types du lot M sont des COMPORTEMENTS, branchés aux points de passage** (indices 5 kamikaze, 6 bulwark, 7 medic — en fin de table). Le **kamikaze** explose à sa mort dans `_killEnemy()`, le point unique où toute mort passe — tir, zone, brûlure, couronne, la cause ne compte pas — via une **zone** à annonce courte (0,15 s) qui porte sa provenance (`z.src` = `SRC_BLAST`, sixième entrée de `DAMAGE_SOURCES`, ajoutée en fin comme promis) et mord aussi les ennemis (`z.foe`, résolu dans `_zoneApply` ; deux kamikazes voisins se déclenchent en chaîne à une image d'écart, sans récursion). Le **bulwark** absorbe les balles de face dans `_bulletHitEnemy()`, AVANT tout — grenade comprise — sinon le balayage d'apparition divergerait de la boucle de collision ; l'absorption incrémente `hitSeq` sans dégât, c'est l'éclair blanc qui rend la mécanique lisible ; sa rotation est plafonnée (`shieldTurnRate`), c'est toute la mécanique. Le **medic** lit la pression sur le compteur de touches existant (aucun branchement dans `_damage`) : plus d'une seconde de tirs soutenus rompt le lien et le fait fuir ; son soin est un **chemin dédié**, jamais un `_damage` négatif — vol de vie, critiques et compteur de touches n'ont aucun sens sur un soin. Sa cible voyage en **neuvième élément** du tuple ennemi (index 8, coupé quand nul — seuls les medics actifs le paient) et porte le filet lumineux dessiné PAR-DESSUS la horde.

**Le sanctuaire se reconnaît à ses CROIX QUI MONTENT**, pas à sa couleur. Un
disque vert clair et un disque bleu clair posés au sol se distinguent mal en
pleine mêlée — le rempart est l'autre grand disque — alors que du mouvement se
lit par-dessus n'importe quel encombrement. C'est le même raisonnement que pour
les signatures de zone ci-dessous. La croix n'est pas un glyphe inventé pour
l'occasion : c'est `POWERUP_ICON.heal`, déjà **le** signe du soin dans l'arène et
dans le HUD.

Sept croix, montée de 2,6 s, **aucune allocation et aucune liste** : la position
de chacune est une fonction de l'identifiant du sanctuaire, de son rang et du
temps. Les particules du jeu passent par `particles`, qui a un plafond et un coût
de gestion ; sept croix par dôme n'ont ni à naître, ni à mourir, ni à être
comptées. Trois détails qui trahissent la boucle si on les oublie : la phase est
décalée **par rang et par identifiant** (en phase, les sept montent comme une
barre et deux dômes battent à l'unisson), la dérive latérale est bornée par la
**corde du cercle** à cette hauteur (sinon une croix sort du dôme ou se pose sur
le liseré, qui porte l'information tactique), et l'opacité s'ouvre et se ferme en
sinus (une croix qui surgit ou se coupe net au bord se lit comme un défaut).

**Une zone se reconnaît à sa SIGNATURE avant sa couleur** (lot E) : imminent = craquelures qui s'ouvrent depuis le centre (`drawZoneCracks`, géométrie par identifiant de zone), persistant = braises et fumée qui montent + pulsation **synchronisée sur `ZONE_TICK`**, mobile = courant déduit du déplacement entre deux images (`zoneMotion`, jamais transmis) avec avant-garde lumineuse, accueillant = halo centripète + colonne lumineuse (`drawMarkColumns`, la seule chose dessinée au-dessus de la horde — le disque du marqueur reste sous les entités). Une détonation laisse une **décoloration du sol de 2 s** (`scorches`). Trois plafonds : particules de zone à part (`zoneFx`, 600), fumée **jamais** sur un télégraphe, et le télégraphe jamais plus voyant que la zone active.

**Les zones de dégâts sont pleines ; les retraits sont purement visuels.** Les cases du damier se touchent exactement — le jeu de quelques pixels qu'on met d'ordinaire pour la lisibilité créait une ligne parfaitement sûre sur toute la hauteur de l'arène. L'inset se fait dans `zonePath()` côté client.

**`ZONE_FORGIVE` : la zone *affichée* est plus grande que la zone qui blesse, de 10 %.** Écart affichage/logique **assumé**, pas un bug — le client affiche avec 110 ms de retard sur l'état serveur, donc un joueur qui sort à l'image exacte où la zone explose *sur son écran* était encore dedans côté serveur. Toutes les mesures de `_zoneHits()` sont rétrécies d'autant, et le sens s'inverse pour ce qui **épargne** (trou de l'anneau, secteur sûr du Pac-Man), qui s'élargit : la tolérance doit toujours pardonner dans le même sens. L'alternative exacte — résoudre contre la position d'il y a `INTERP_MS` — demanderait un historique de positions pour tous les joueurs en permanence, alors qu'on ne le paie aujourd'hui que pour les appâts du Métronome.

**Une zone persistante inflige `dot` dégâts par seconde par paliers de `ZONE_TICK`, jamais à chaque image**, et le tic passe `overTime = true` à `_hurt()` — même raison que la brûlure : sans ce drapeau, une mare de quinze secondes remet `hitCd` à 0,55 s quatre fois par seconde et rend sa victime immunisée au contact, aux tirs et aux autres zones. On mourait en sécurité dans une flaque.

**`state.bounds` est la surface jouable ; tout ce qui borne un déplacement la lit, jamais `CFG.ARENA_W/H` en dur.** C'est le principal risque de régression de la constriction : un seul oubli laisse un joueur, un boss, une tour ou un bonus dans la couronne mortelle sans moyen d'en sortir. `_clampToBounds()` et `_dropPoint()` sont les points de passage uniques. Depuis le lot I, la **géométrie des zones** et le **rebond des balles** lisent les bounds eux aussi (une arène de boss fait une vue dans une salle trois fois plus large — un damier découpé sur la salle n'aurait montré qu'un carreau, une balle en rebond partait vivre à deux écrans du combat). Deux choses seulement gardent l'arène entière : l'**apparition des ennemis** (tirée autour de la boîte englobante des joueurs, jamais bornée aux bounds — la horde traverse la couronne, c'est l'interaction recherchée) et le **culling** des projectiles (leur durée de vie fait le vrai travail).

**Les points de récolte (lot I) n'apparaissent jamais à moins de `HARVEST_PLAYER_DIST` d'un joueur vivant, ni pendant un boss.** C'est la définition de l'exploration — un point sous les yeux n'en est pas une — et une arène de boss réduite à une vue ferait d'un point extérieur une promesse inatteignable. Le cristal se détruit aux balles **hors de `_bulletHitEnemy()`**, délibérément : une structure n'a ni critique, ni vol de vie, ni compteur de touches — rien de ce que ce point de passage branche n'a de sens sur elle. Les **éclats** (`p.eclats`) sont versés à **chaque** joueur — même logique que l'expérience commune — et meurent avec le `GameState` : la monnaie de manche ne se persiste jamais.

**`state.walls` bloque, il ne blesse pas.** Le verrouillage par quadrant est la seule entité du jeu qui interdit un déplacement ; d'où une couleur franchement différente de tout ce qui explose côté client. On repousse du côté **d'où l'on venait** et non du côté le plus proche : à l'esquive, un joueur traverse 162 px en trois images et se retrouverait de l'autre côté du mur. Le client rejoue exactement la même règle dans sa prédiction. **Les obstacles de biome suivent la même règle** (`_obstacleBlock`), avec une différence qui n'en est pas une : le repoussage se fait **par axe**, celui qui pénètre le moins, ce qui donne le glissement le long d'un mur sans une ligne de plus — sans lui, deux cents ennemis restaient plaqués contre un pilier sans jamais le contourner et la population montait au plafond. Le **boss** n'y passe pas : il fait jusqu'à 90 px de rayon, ses mécaniques le déplacent d'autorité, et un boss coincé derrière une cuve rendrait le combat injouable.

**LE BIOME NE COÛTE RIEN AU RÉSEAU, et c'est le résultat du lot V.** Deux nombres — index et graine — voyagent **une fois**, dans le payload de salon. La géométrie se **régénère à l'identique des deux côtés** (`buildBiome`, module pur, générateur mulberry32 écrit à la main pour que Node et le navigateur rendent la même suite), et l'état d'un danger est une **fonction du temps de manche**, que le snapshot porte déjà : un geyser qui souffle deux secondes toutes les sept est `((tm / 7) + phase) % 1 < 2 / 7`. C'est le raisonnement des traits du lot S poussé un cran plus loin — là il restait l'anticipation de ruée, qui ne se déduit d'aucune position ; ici il ne reste rien.

**`hazardState()` est le point de passage unique de cette déduction**, partagé par la simulation et le rendu. Deux implémentations auraient divergé au premier réglage de période, et le désaccord serait resté invisible jusqu'à ce qu'un joueur prenne des dégâts d'un geyser qu'il voit éteint.

**Seule exception : les PV d'un mur destructible** (clé `ob`). Ils dépendent de ce que les joueurs ont fait et ne se déduisent d'aucune horloge. Liste **creuse** de paires (index, part de PV) — l'index dans la liste d'obstacles fait office d'identifiant, les deux côtés construisant la même liste dans le même ordre — et **absente** tant que rien n'a été touché, c'est-à-dire la plupart d'une manche et la totalité de deux biomes sur trois. Mesuré : **+1,2 %** de poids d'instantané, sous le budget de 3 %.

**Un danger d'environnement est du SOL, jamais un télégraphe.** Il s'annonce par sa **géométrie permanente** — la bouche du geyser est toujours visible, seul son jet est intermittent ; le rail de la braise est tracé en entier, la braise n'est que ce qui le parcourt. Le canal du télégraphe instantané appartient au **boss** et ne se partage pas : un geyser annoncé par un cercle ambre de 1,4 s est indistinguable d'une zone de Ravageur, et le joueur cesse de savoir lequel des deux il regarde. On apprend la carte, on ne lit pas un compte à rebours.

**Le plafond de surface est STRICT, pas indicatif** (`BIOME_CFG.HAZARD_SURFACE_MAX`). 12 % de l'arène pour l'ensemble des dangers actifs, **traînées et spores comprises** : celles-ci ont déjà leur propre plafond (18 zones de 26 px = 2,65 %), on leur en réserve 4 %, il reste 8 % pour le biome. `buildBiome` **jette** les dangers qui franchissent le budget plutôt que de les laisser passer — un plafond qu'on vérifie après coup est un plafond qu'on dépasse, et le dépôt a déjà payé ce prix avec `PUDDLE_MAX`.

**La géométrie est posée à la construction et ne bouge plus.** Trois raisons déjà écrites ailleurs : la prédiction locale rejoue la règle des murs, et un obstacle apparu sous un joueur en pleine esquive le téléporterait (162 px en trois images) ; la géométrie des zones de boss garde volontairement l'arène pleine, et un damier calculé sur une surface libre qui change n'est plus lisible ; `_dropPoint` doit pouvoir poser un bonus ailleurs que dans un pilier, ce qu'il ne peut pas faire contre une géométrie mouvante. Ce qui **peut** naître en cours de manche : les zones, traversables. `verifierBiomes()` est le critère d'acceptation rejouable — plafonds de surface, absence de danger en calme, absence de danger **qui blesse** en normal, et **passage traversable dans le carré central minimal** (`SHRINK_MIN`, 45 %), vérifié par remplissage sur les deux axes avec les obstacles dilatés du rayon du personnage. Un obstacle qui enferme un joueur dans un coin de l'arène réduite par le Ravageur est un piège mortel involontaire.

**Un mur destructible ne cède qu'au TIR DU JOUEUR, ne rend NI SCORE NI EXPÉRIENCE, et ne passe PAS par `_damage()`.** Les trois sont indissociables. Pas aux dégâts d'ennemis : deux cents monstres abattraient la couverture en dix secondes, et un mur qui disparaît sans qu'on sache pourquoi est un bug de retour. Le crédit vaut les PV max d'un **ennemi tué** ; une couverture n'en est pas un. Et `_damage()` porte le vol de vie, les critiques, l'exécution et le compteur de touches, dont aucun n'a de sens ici — l'exécution en supprimerait un d'un seul tir. Même raisonnement que « le soin du medic est un chemin neuf, pas un `_damage()` négatif ».

**Une météo est un MODIFICATEUR GLOBAL, jamais une entité** : elle n'a pas de position, donc elle ne s'ajoute à aucune liste. Cauchemar seulement, un segment sur trois sans. Elle se **déduit** de `(graine, segment)` des deux côtés — direction de bourrasque comprise, que la prédiction rejoue au pixel près — mais elle **s'annonce** par le canal d'alerte au niveau `ALERT_INFO` : un changement global muet surprend au lieu d'informer, c'est la règle déjà posée pour les variantes de rupture de barre et pour l'enrage. Deux contraintes non négociables : la **brume** n'assombrit que les **bords** et **recule** le départ du dégradé, le centre restant strictement aussi net qu'avant — aucun télégraphe de boss, aucun marqueur de joueur, aucun chiffre de dégâts n'est jamais masqué ; et la **bourrasque** pousse **joueurs et ennemis**, sinon c'est une taxe déguisée en mécanique, ce que le dépôt refuse depuis le retrait des dégâts de rupture de barre.

**Le champ de ralentissement porte sur les ennemis aussi**, pour la même raison, et **deux champs ne se cumulent jamais** — on prend le meilleur, comme les auras de givre, le Vœu partagé et l'aura du chœur. `_ground()` est son point de passage unique côté simulation, `groundAt()` son jumeau exact côté client ; ils répondent à la même question sur la même géométrie, et un désaccord se paierait en recalage permanent de la prédiction.

**La géométrie est la MÊME dans les trois modes, seuls les dangers changent.** Un joueur qui connaît `usine` en calme reconnaît `usine` en cauchemar : c'est ce qui rend la montée en difficulté **apprenable** au lieu d'être un autre jeu. Calme n'a **aucun** danger, normal **aucun qui blesse** (deux champs de ralentissement, identiques dans les trois biomes — le mode où le biome n'est qu'une forme, pour qu'on l'apprenne avant qu'il ne morde).

**Toute chaîne d'effets doit mémoriser ses cibles.** Le ricochet garde un `Set` des ennemis déjà touchés : sans lui, deux voisins se renvoient l'arc indéfiniment.

### Registres partagés serveur ↔ client

Ajouter une entrée impose de traiter les deux côtés :

| Registre | Serveur | Client |
|---|---|---|
| `kind` d'effet | 0 nova · 1 balayage d'arrivée · 2 montée de niveau · 3 ricochet · 4 balise / relèvement / purification / Sentence survécue · 5 élite abattue · 6 barre brisée · 7 explosion · 8 onde blanche · 9 rempart posé · 10 provocation · 11 vague de soin · 12 explosion de bombe · 13 salve verrouillée (transporte deux points de plus, comme le 3) · 14 absorption du bouclier | `drawEffects()` |
| type d'ennemi | `ENEMY_TYPES` dans `enemies.js` (tableau ordonné, l'index circule dans le champ de type, rang d'élite encodé à +100) | `ENEMY.TINT` dans `palette.js` + `plan()` dans `sprites.js` (`e{type}_*`) + `DEATH_BURST` + `enemyFrame()` |
| trait | `TRAITS` + `TRAIT_CFG` dans `enemies.js` (les valeurs) ; l'**attachement** dans `DIFFICULTIES[i].traits` — **l'index ne circule pas**, tout se déduit de `(diffIndex, type)` | `traitsOf()` (importé de `game_state.js`) dans `client.js` : anticipation par `scale`, liseré d'aura, lien de soin |
| profil de difficulté | `DIFFICULTIES` dans `game_state.js` (tableau ordonné, l'index circule dans le salon) : `script`, `roster`, `traits`, `resume`, résidu | `renderVoteDetail()` (les trois lignes du salon) + `applyPalette(diffIndex)` |
| décor de mode | `DECOR` dans `palette.js` (tableau ordonné, index = celui de `DIFFICULTIES`) — **ne circule pas**, déduit du `diffIndex` du salon | `decor` dans `client.js` : fond d'arène, `drawGrid()`, `drawVignette()` |
| classe | `CLASSES` dans `classes.js` (tableau ordonné, l'index circule) | sélecteur du salon + `buildPips()` / `updatePip()` dans `hud.js` |
| couleur d'un joueur | `assignColors()` dans `room.js`, point de passage unique ; l'index voyage dans `colorIndex` du salon | `PLAYER_COLORS` (ordre = tank, soigneur, tireur A, tireur B) via `colorOf` / `ownerColorOf` |
| bits de compétence | `SKILL_HEAL_MODE` · `SKILL_TAUNT` · `SKILL_OVERDRIVE` (masque) | teinte du joueur, halos, icônes |
| états | `STATUSES` dans `statuses.js` (tableau ordonné, l'index sert de bit dans le masque produit par `_statusMask()`, champ `statuses` du tuple joueur) | `STATUS_ICON` + halo joueur + cadre d'équipe |
| `shape` de zone | 0 disque · 1 rectangle orienté · 2 anneau · 3 cône · 4 Pac-Man · 5 croix | `zonePath()` / `zoneSubPath()` + `_zoneHits()` |
| bits de buff | `BUFF_DAMAGE` … `BUFF_RICOCHET` (masque) | anneaux joueur + bandeau HUD |
| bonus | `_applyPowerup()` | `POWERUP_ICON` + `POWERUP_STYLE` |
| clés de `mods` liées aux états | `statusTimeMul`, `catalyseur` dans `cards.js` | rien |
| clés de `mods` | `defaultMods()` dans `cards.js`, lues par la simulation | rien — les effets ne traversent pas le réseau |
| tags de carte | `tags` dans la table de `cards.js` (`off`, `def`, `coop`, `cadence`) | rien |
| script de la manche | `SCRIPT` (référence) et `SCRIPTS` (les trois variantes, dérivées) dans `timeline.js` ; la variante est choisie par `profil.script` et voyage en clair dans le salon (`script`, un NOM et non un index) ; clé `sg` du snapshot | `updateSegment()` dans `hud.js` + `gameIntensity()` |
| géométrie d'apparition | `GEOMETRIES` dans `timeline.js`, résolue dans `_spawnPoint()` — **l'index ne circule pas** | rien |
| boss | `BOSS_ROSTER` dans `bosses.js` (tableau ordonné, l'index circule dans `bo[9]`) ; `bars` y est une propriété du roster, `BOSS_POOL_COUNT` borne le tirage | `drawBoss*()` (une routine par boss) + `BOSS_SKIN` dans `palette.js` + barre du HUD (`#hudBoss.final`) + annonce d'entrée + `phaseUnlockText()` |
| mécanique | `MECHS` dans `bosses.js` (tableau ordonné, l'index circule dans le canal d'alerte et dans `mk`) | `drawMarks()` + `pushAlert()` |
| événement de horde | `EVENTS` dans `timeline.js` (tableau ordonné, l'index circule dans le canal d'alerte et dans `ev`) ; la colonne `event` des beats en est le CALENDRIER | `eventAt()` dans `applyAlert()` + bandeau de segment dans `hud.js` + `evenementDebut`/`evenementFin` dans `events.js` |
| biome | `BIOMES` dans `biomes.js` (tableau ordonné, l'index circule UNE fois, dans le payload de salon, avec la graine) ; `buildBiome()` pose la géométrie à la construction | `buildBiome()` **rejoué à l'identique** dans `client.js` + `drawObstacles()` / `drawHazards()` sur `#cvUnder` + ligne de segment du HUD + résumé de mode au salon |
| danger d'environnement | `HAZARDS` + `BIOME_CFG` dans `biomes.js` — **l'index ne circule pas**, la liste se régénère ; `hazardState(h, t)` en est le point de passage unique | `drawHazards()` (géométrie permanente + partie active) + `groundAt()` dans la prédiction + `danger` dans `events.js` → son `geyser` |
| couverture destructible | `maxHp` sur une entrée d'obstacle ; `_obstacleHit()` ; clé **creuse** `ob` du snapshot (index, part de PV), absente tant que rien n'est touché | liseré tireté de `drawObstacles()` + blocage rejoué dans la prédiction + `murDetruit` dans `events.js` → son `mur` |
| météo | `WEATHERS` dans `biomes.js` (tableau ordonné, l'index circule dans le canal d'alerte) ; `weatherFor(diff, graine, segment)` — **ne circule pas dans le snapshot**, déduit | `weatherAt()` dans `applyAlert()` + `drawVignette()` (brume) + `stepPrediction()` (bourrasque) + ligne de segment du HUD |
| clé d'attaque de boss | chaînes du `base`/`unlock` d'un boss, dispatchées par `_atk()` | `ATTACK_LABEL` (texte de barre brisée) — **ne circule pas** |
| niveau d'alerte | `ALERT_ORDER` · `ALERT_WARN` · `ALERT_INFO` dans `bosses.js` | `updateAlerts()` dans `hud.js` : consigne cyan avec compte à rebours · avertissement ambre · information blanche |
| type d'événement | rien — déduit des snapshots | `diffSnapshots()` dans `events.js`, consommé par `handleEvent()` |
| image de sprite | rien | `plan()` dans `sprites.js` : `e{type}_{idle,walkA,walkB,open,die0..2}` et `c_{classe}_{idle,move,shoot,down}`, adressées par NOM via `frameOf()` |
| son | rien | `PALETTE` dans `audio.js` + `SOUND_GAIN` (hiérarchie de volume) |
| cible d'un son d'interface | rien | `UI_SOUND_SCREENS` / `UI_SOUND_TARGETS` dans `client.js` — **miroir** de la règle `--cursor-go` de `menus.css`, commentée des deux côtés |
| `kind` d'effet → son | rien | `EFFECT_SOUND` dans `client.js` : son et amplitude de tressaillement par `kind` |
| son d'événement | rien — déduit du niveau d'alerte de la table | `evenement` dans `PALETTE` (`audio.js`), une quinte montante ; `haut` distingue consigne et avertissement sans ouvrir une entrée par événement |
| glyphe posé sur un joueur | `a` / `b` d'une entrée de `state.marks` | `PLAYER_MARK` + `paintMarkGlyph()` |
| effet possédé visible en jeu | rien — déduit de la liste de cartes | `EFFECT_BADGES` dans `client.js` : bande d'effets actifs du HUD |
| façon de mourir d'un type | rien — déduit du type déjà porté par le snapshot | `DEATH_BURST` dans `client.js` : compte, taille, vitesse, durée, halo et ouverture de gerbe |
| pause | message `pause` (client → serveur), `paused` (serveur → tous) ; `setPaused()` est le point de passage unique | `#pause`, `pauseReal`, `renderPauseState()` |
| hub des salles | messages `listRooms` · `createRoom` · `joinRoom` · `leaveRoom` (client → serveur) ; `rooms` · `roomJoined` · `joinRoomError` (motifs `pleine` · `disparue` · `motdepasse` · `plafond`) · `roomClosed` (serveur → client) — routés par `hub.js`, jamais par une salle | `#hubScreen`, `renderRooms()`, `enterHub()`, `inRoom` |
| identité (compte + session) | messages `register` · `login` · `loginToken` · `logout` · `changePass` (client → serveur) ; `register/login/loginToken/…` dans `progress_store.js` ; réponses `welcome{pseudo,token?,dup}` · `authError{motif,fatal?}` · `passChanged` · `loggedOut` ; ni hachage ni mot de passe ne voyagent jamais vers un client | `#gate` (trois modes : reprise / connexion / création), bloc compte du hub, `survivor.token` en localStorage |
| lancement différé | messages `start` · `cancelStart` (client → serveur) ; `room.launchAt`, `launchPayload()`, `cancelLaunch()`, `tickLaunch()` dans `room.js` ; message `launch{delay,why}` (serveur → tous) | `#start` (+ `.cancel`), `renderLaunch()`, `launchEndsAt` |
| état prêt | message `ready{on}` (client → serveur) ; champ `ready` dans `lobbyPayload().players[]` ; `notReady()` est le point de passage unique, lu par le `case "start"` | `#readyBtn` (+ `.on`), `.teamRow.ready`, `#teamReady`, `#waitMsg` qui nomme qui manque, `#start` désarmé |
| latence | `WsConnection.rtt` (`ws_lite.js`) ; horodatage dans la charge du ping, lu au pong ; `hub.pingAll()` à 1 Hz ; champ `ping` dans `lobbyPayload().players[]`, `-1` si inconnu | `.teamPing`, tiret quand inconnu |
| historique des manches | `room.history` (`{at, diffIndex, wave}`, plafonné à `ROUND_HISTORY_MAX`), rempli par `recordRound()` aux DEUX sorties de manche ; champ `history` dans `lobbyPayload()`, plus récent en tête | `renderHistory()` → `#historyList .histRow` (`.histWhen` · `.histLabel` · `.histWave`) |
| sortie de manche | message `leaveRound` : `removePlayer` + spectateur jusqu'à la manche suivante | bouton du menu pause, avec confirmation |
| victoire et course finale | `state.victory` et `state.finalKill` (relevé dans `_killBoss`) ; clés `victory` et `finalKill` du `roundEnd` ; `bestFinalRun` écrit par `awardRun` dans `hub.js`, avec variante, biome, difficulté et effectif | `#bilan.win` (titre à l'échelle supérieure, teinte de gain) + tuile `.bilanStat.final` |
| transition de manche | messages `round` · `roundAbort` · `roundEnd` · `cards` · `cardsWait` | `pushWorld()` / `worldQueue` — jamais appliqués à la réception |
| briefing de classe | `state.warmup` dans `game_state.js` (retient `_waveTick` et `_spawner`, gèle `time`), `WARMUP_S` dans `room.js`, champ `warmup` du message `round` | `#brief`, `openBrief()` / `closeBrief()` — textes lus dans `CLASSES`, rien ne voyage |
| briefing fermé | message `briefDone` (client → serveur) ; `client.briefDone`, `room.briefOpen`, `briefWaiting()` et `syncBrief()` dans `room.js` ; message `briefState{waiting:[noms]}` (serveur → tous) | `#hudBrief`, `renderBriefWait()`, `briefWaiting` / `briefEndsAt` |
| part critique des dégâts | troisième élément d'un tuple `bd`, ajouté **en fin** | `pushDamage()` → classe `.dmg.crit` (ambre, un cran plus gros) |
| point d'impact sur le boss | quatrième et cinquième éléments d'un tuple `bd`, ajoutés **en fin** — n'existe que pour les Jumeaux | `diffSnapshots()` : `mine[3] ?? b.boss.x` |
| provenance d'un dégât subi | `DAMAGE_SOURCES` dans `game_state.js` (tableau ordonné, l'index circule en fin du tuple joueur) — **six** entrées depuis le lot M (`explosion`) | `SRC_ICON` dans `icons.js` + `SRC_TINT` dans `palette.js` (mêmes six entrées, même ordre) + `hudDamage(…, icon)` + `renderHurtBy()` au bilan |
| soins rendus | `p.healDealt` dans `game_state.js`, champ `heal` de `scoreboardRows()` — hors instantané, une fois par manche | colonne « soins » de `renderBilanScores()` |
| lien de soin du medic | neuvième élément du tuple ennemi (index 8, coupé quand nul) | `drawHealLinks()` par-dessus la horde |
| propriétaire d'une balle | cinquième élément du tuple `b`, ajouté **en fin** | `ownerColorOf(b.owner) ?? COMBAT.bullet` dans `drawWorld` |
| catégorie de carte | `CATEGORIES` + `cardCategory()` dans `cards.js` — **ne circule pas**, déduit des `tags` avec `cat` explicite pour les zones | `CARD_CATEGORY_COLOR` dans `palette.js` + `.cardCat` |
| version | `VERSION` dans `shared/version.js` (source unique, module pur, table d'historique en commentaire) ; clés `version` et `commit` du `welcome`, une fois par connexion ; `shortCommit()` au boot passé à `createHub` ; `server.js` compare `package.json` au boot et **journalise** un désaccord ; `version_check.js` le refuse avant | `#version` + `updateVersion()` dans `client.js` : `v0.7.8 (a1b2c3d)` en `--text-faint`, ambre `.stale` **sans le hash** si le serveur annonce autre chose |

Six de ces registres sont **purement clients** — image de sprite, son, `kind`
d'effet → son, glyphe posé sur un joueur, effet possédé visible en jeu, façon de
mourir d'un type — auxquels s'ajoutent la **catégorie de carte** et, depuis le
lot S, les **traits** : un son, un
glyphe, une icône d'effet et une image de sprite ne traversent pas le réseau, ils
se déduisent de ce que le snapshot — ou la liste de cartes, déjà diffusée — dit
déjà. Une nouvelle mécanique ne demande donc pas d'ajouter un message : seulement
une entrée dans `MECHS` et, si elle marque un joueur, une entrée dans
`PLAYER_MARK`.

**Le biome dépasse le trait, et il est désormais le cas limite de cette
famille** : un système de lieux entier — trois géométries, cinq dangers, trois
météos, une couverture destructible — n'a coûté **aucune** clé de snapshot en
régime permanent. Deux nombres au salon (index, graine), et tout se régénère ou
se déduit du temps. Seuls les PV d'une couverture entamée circulent, dans une
liste creuse le plus souvent absente. La règle qu'il faut en retenir avant
d'ajouter quoi que ce soit : **avant d'ouvrir une clé de snapshot, chercher si la
valeur est une fonction de ce que le client a déjà** — la géométrie, d'une
graine ; l'état d'un danger, du temps ; la météo, du segment.

Le trait était le cas le plus fort avant lui, et il vaut la peine d'être
lu comme tel : **un système de comportements entier — six modules attachés à neuf
types sur trois difficultés — n'a coûté qu'une clé de snapshot**, et seulement
parce que l'anticipation d'une ruée ne se déduit d'aucune position. Tout le reste
est une fonction de `(diffIndex, type)`, deux valeurs déjà présentes. La
couverture d'aura et la cible du lien de soin sont même recalculées côté client
par les mêmes règles que le serveur (`_auraPass` / `auraPass`, `_medic` /
`drawMedicLinks`) : un désaccord ponctuel n'y coûte rien, ces deux dessins disent
« il y a un porteur là », pas « c'est exactement cette cible ».

**Les types ne mouraient pas différemment**, et c'est ce que `DEATH_BURST`
corrige : le seul branchement était le rang d'élite, donc un tank de 42 px de
large se désagrégeait en la même poussière qu'un runner de 21. C'est gaspiller la
seule information gratuite qu'on ait — le joueur **sait** déjà ce qu'il vient de
tuer, la mort doit le lui confirmer. Le rang d'élite reste **orthogonal** au
type : il multiplie le compte et la taille, il ne choisit pas une autre façon de
mourir. Un gros morceau tourne **lentement** (`spin` indexé sur l'inverse de la
taille), sans quoi un fragment de tank tourbillonne comme une escarbille. Et
l'**orientation** voyage avec la mort — elle est déjà dans le snapshot pour
dessiner l'ennemi — pour que le runner éclate le long de sa course : la vitesse
était son identité entière, elle doit lui survivre d'une demi-seconde.

**Le retour d'impact, lui, n'est PLUS déduit** : il l'était, et c'était le
défaut. Voir `hitSeq` dans les invariants — un différentiel de PV échantillonné
à 20 Hz est structurellement lacunaire, et le coup fatal n'y apparaissait pas du
tout.

**Trois informations d'affichage sont DÉDUITES et non transmises**, pour la même
raison à chaque fois : un champ de plus sur 200 ennemis ou 400 balles, vingt
fois par seconde, coûte plus que la déduction. Le **propriétaire d'une balle**,
lui, ne l'est plus — voir plus bas : le calcul de coût est le même, c'est l'usage
qui a changé.

- **La cadence des tireurs**, qui porte leur télégraphe de visée : on observe
  l'apparition d'un projectile près d'un tireur, la cadence est fixe, donc le
  tir suivant est connu **dès le second**. Avant le premier, le tireur reste au
  repos — un télégraphe qui devine serait pire que pas de télégraphe.
- **La direction des projectiles**, qui porte leur traînée : déduite de l'image
  précédente, exacte dès le second instantané.
- **Le fait qu'un joueur se déplace**, qui porte son image de marche et son
  étirement : comparaison de deux images, avec un seuil non nul — la correction
  de prédiction fait bouger un personnage à l'arrêt de quelques dixièmes de
  pixel, et il se serait mis à marcher sur place.

Le `kind: 3` (ricochet) est le seul effet à transporter deux points de plus dans le snapshot ; les autres ne paient pas ce supplément.

Le tag `cadence` n'est pas décoratif : « Résonance » compte les cartes qui le portent. Une carte qui *rallonge* l'intervalle de tir (Balles lourdes) ne le porte donc pas, même si elle touche la même statistique.

Les clés de segment et de progression (`sg`, `xl`, `xp`), les quatre listes de compétence (`bw` remparts, `bm` bombes, `an` ancres et `sa` sanctuaires du lot C), celles du lot 4 (`mk` marqueurs de mécanique, `bo2` second Jumeau, `sp` sol glissant), celles du lot 5 (`bn` limites d'arène et palier annoncé, `wl` murs de verrouillage) celle du lot 6 (`bd` dégâts portés au boss depuis le dernier instantané, par joueur) celle du lot S (`wu` ennemis en anticipation de ruée), celle du lot U (`ev` événement actif et son compte à rebours) et celle du lot V (`ob` couvertures destructibles entamées) sont des **clés nommées** du snapshot, pas des éléments de tableau : la règle positionnelle ne vaut qu'à l'intérieur des tableaux, et une clé inconnue est simplement ignorée par un client plus ancien. `bn` et `wl` sont **absentes** tant que l'arène ne bouge pas, c'est-à-dire quatre-vingt-dix pour cent d'une manche ; `wu` l'est aussi la plupart du temps — la recharge d'une ruée est de six secondes et son préavis d'une demi-seconde. Coût mesuré : **0,14 %** du poids d'instantané, sous le budget de 1 %. `ev` est absente hors événement — cinq minutes sur trente en portent un — et coûte **0,35 %** quand elle est là : deux nombres, parce que le nom, le texte et le niveau vivent dans la table que le client importe déjà. `ob` est absente tant qu'aucune couverture n'est entamée, donc toujours dans deux biomes sur trois, et coûte **+1,2 %** avec les trois murs de la friche à mi-vie — sous le budget de 3 %.

**Les zéros de queue des tuples de zone et d'ennemi sont coupés** (`trimTail` dans `snapshot()`). La règle positionnelle interdit de *déplacer* un champ, pas d'en *omettre* à la fin : le client lit déjà tout ce qui suit l'index 6 avec un repli (`a[7] ?? 0`), le mécanisme même qui empêche un onglet resté sur une version antérieure de planter. Un tuple de zone en compte quinze et la plupart des formes n'en remplissent que douze ; un tuple d'ennemi en compte huit et son huitième champ — le compteur de touches — vaut zéro tant que rien ne l'a touché. Le `keep` d'un ennemi vaut **7 et non 6** : le client lit `a[6]` (l'orientation) sans valeur de repli, et une orientation nulle est parfaitement ordinaire.

**Deux ajouts en fin de tuple sur ce lot** : `hitSeq` sur l'ennemi (index 7) et les **dégâts cumulés** sur le joueur (index 28). Le second est le seul chiffre de la fenêtre de build que le client ne peut pas déduire, pour la même raison que `bd` — les projectiles ne portent pas leur propriétaire. Quatre nombres par instantané là où la liste d'ennemis en compte seize cents, et sans lui la fenêtre affichait un tiret au moment précis où l'on veut comprendre qui porte l'équipe.

**Deux ajouts en fin de tuple au lot A** : la **provenance du dernier dégât subi** sur le joueur (index 29) et le **propriétaire** sur la balle (index 4). Le second casse une décision explicite du dépôt, et il faut savoir pourquoi : le propriétaire n'était refusé que parce qu'il ne servait qu'à *attribuer des dégâts*, ce que `bd` résout côté boss sans rien payer par balle. Il sert désormais à la **lisibilité du tir** — deux ambres voisins pour le tir allié et le tir hostile rendaient l'écran illisible à 220 ennemis — et aucune déduction locale ne peut retrouver un tireur. Coût mesuré : **+5,4 %** de poids d'instantané dans le pire cas (arène pleine, 400 balles, quatre joueurs), **+2,0 %** en moyenne à quatre, sous le budget de 10 % et du même ordre que `hitSeq`. `trimTail` ne s'y applique pas : un propriétaire nul est justement le cas qu'on veut distinguer.

**`bd` reste le seul chiffre AGRÉGÉ que le client ne peut pas déduire.** Les
projectiles portent maintenant leur propriétaire, mais pas leurs dégâts — et
c'est bien ces derniers qu'il faudrait pour savoir localement quels dégâts sont
les siens, en plus de la part critique et du surplus sur le coup fatal.
`_damage()` cumule dans
`state.bossDmg` au point de passage unique, `snapshot()` l'émet, le serveur vide
après diffusion comme il vide la file d'alertes. Chaque client n'y lit **que**
sa propre ligne : les chiffres des autres n'apprennent rien et rempliraient
l'écran au moment où il faut le lire. Les chiffres de dégâts ne s'affichent que
sur le **boss** — tout afficher à 200 ennemis rend l'écran inutilisable, et sur
la piétaille l'information n'a aucune valeur.

**Tout message ponctuel qui décrit un changement du MONDE se consomme depuis la
timeline interpolée, jamais à la réception.** `worldQueue` / `pushWorld()` dans
`client.js` est le point de passage unique, sur le modèle d'`alertQueue` :
`round`, `roundAbort`, `roundEnd`, `cards`, `cardsWait` et la fermeture de
l'écran de cartes y passent. Le serveur envoie `cards` à l'instant où il
constate l'arène vide ; le client dessine encore l'état d'il y a 110 ms, où deux
ou trois ennemis vivent toujours — l'écran de choix s'ouvrait donc **par-dessus
des ennemis visibles**, et de façon irrégulière, ce qui ne se voit que si les
derniers meurent groupés. Une file plutôt qu'un `setTimeout` par message :
l'ordre d'arrivée est préservé et il n'y a aucun minuteur dispersé à annuler
(elle se vide à `onclose`, et nulle part ailleurs — les transitions appellent
`resetFeedback`, qui ne doit surtout pas la vider). Les messages **hors-monde**
— salon, choix de classe, tableau des scores, pause — s'appliquent à la
réception : ils ne commentent aucune image.

**Sauf quand le salon ACCOMPAGNE une transition — alors il en fait partie.**
`endRound()` diffuse `roundEnd` puis le salon. Le premier passe par la file et
sort 110 ms plus tard ; le second s'appliquait à la réception, or il porte
`phase` : il posait donc `PHASE_LOBBY` alors que `bilanOpen` était encore faux,
et `refreshPanel()` ouvrait **le salon pendant 110 ms** avant que le bilan ne le
recouvre. C'est ce qu'on voyait en fin de manche, et c'est la même famille de
défaut que l'écran de cartes ouvert par-dessus des ennemis encore vivants.

Le remède est un **test sur la file**, pas un `pushWorld` systématique : un vote,
un « prêt », une arrivée ne commentent aucune image et doivent sortir tout de
suite — les différer aurait ajouté 110 ms à chaque clic du salon pour rien. Quand
la file n'est pas vide, le salon y entre à son tour, et l'ordre d'arrivée fait le
reste : poussé après `roundEnd`, il sort après lui.

**Le canal d'alerte est ponctuel, hors du snapshot.** `state.alerts` est une file que la simulation empile et que le serveur vide après chaque tick (`{t:"alert", mech, level, dur}`, ou `{t:"alert", boss}` pour l'identité à l'entrée). Une consigne répétée vingt fois par seconde ne serait plus une consigne. GameState ne connaît toujours pas le réseau : il empile, il ne diffuse pas.

## Charte visuelle

La direction est **signal et instrumentation** : l'interface est un poste de
contrôle, l'arène un écran de mesure, les monstres des signaux hostiles. Elle
assume l'héritage (fond ardoise, grille, chasse fixe) au lieu de le jeter.

**L'arène est une machine, les monstres sont ce qui s'y est introduit.** Le
décor est froid, précis, instrumenté — grille technique à deux niveaux, filets
fins, angles durs, saturation sous 18 % — là où les créatures sont chaudes,
organiques, irrégulières : contours épais, formes asymétriques, saturation
forte. Ce contraste **est** l'identité, et il n'est pas décoratif : les monstres
sont les seuls éléments organiques à l'écran, donc ils se détachent
instantanément. La direction artistique sert la lisibilité au lieu de la
combattre. Corollaire : **contour systématique sur toute créature, aucun sur le
décor**, et jamais de noir pur — un noir pur écrase la teinte et rend les cinq
types identiques à moyenne distance.

**Le test de la silhouette est un critère d'acceptation, pas une intention.**
`?planche` dans l'adresse sort tous les sprites en noir uni sur fond blanc
(`silhouetteSheet()`). Un lecteur qui ne connaît pas le jeu doit pouvoir les
regrouper par type sans hésiter ; un type qui n'est reconnaissable que par sa
couleur ou son détail interne a raté son test, et le style travaille alors
contre la mécanique. Deux silhouettes ont déjà échoué à cette planche et ont été
refaites.

**Une teinte par type, et six valeurs dérivées** (`ramp()` dans `palette.js`) :
ombre, base, lumière, accent, contour, **contre-jour**. Le **décalage de teinte**
dans l'ombre et la lumière, plutôt qu'un simple assombrissement, est ce qui
distingue une palette dessinée d'un dégradé mécanique. Les écrire à la main pour
cinq types, c'était trente valeurs à garder cohérentes ; à **neuf types** depuis
le lot S, cinquante-quatre — l'argument de `ramp()` se renforce à chaque type
ajouté, et les quatre nouvelles teintes n'ont demandé qu'une ligne.

**Les quatre teintes du lot S ont été choisies CONTRE les cinq existantes**, pas
dans l'absolu : la gamme chaude (cramoisi, orange, lie-de-vin, violet, rose)
était pleine, et une sixième créature chaude aurait été la sixième tache rouge
d'un écran qui en compte deux cents. Vert acide pour le kamikaze (instable, et
c'est celui qu'il ne faut pas laisser arriver), ocre brûlé pour le bulwark (même
famille que l'orange, deux crans plus sombre — la masse recule visuellement,
comme le lie-de-vin du tank), jade pour le medic, indigo profond pour le choeur.
Le medic est la **seule créature froide du bestiaire**, et c'est assumé : son
repérage instantané dans une mêlée chaude est toute sa mécanique. Délibérément
**pas** le vert `HEAL`, qui veut dire « ceci te soigne » — celui-là soigne
quelqu'un d'autre, et son lien de soin est tracé dans sa propre teinte pour la
même raison.

Le **contre-jour** (`rim`) est le liseré clair du côté opposé à la lumière
principale : c'est la valeur qui détache une créature d'un fond sombre, et
l'arène l'est. Sans lui une silhouette sombre sur un sol sombre ne tient que par
son contour, c'est-à-dire par la seule chose qui ne dit rien de sa forme. Il
reste dérivé de la **teinte du type** et non d'une couleur d'ambiance commune :
un liseré identique sur les cinq les aurait rapprochés à moyenne distance.

**La recette en sept couches est appliquée uniformément** : silhouette, ombrage
décalé et écrêté, lumière en arc haut-gauche, **contre-jour**, contour, accents,
asymétrie du même côté à chaque image. Si un type demande un traitement
particulier, c'est le **type** qu'il faut revoir, pas la recette — un style n'est
tenable que s'il se répète à l'identique sur tout le jeu. Le contre-jour passe
**avant** le contour, qui l'encadre ensuite : dessiné par-dessus, il mangerait la
ligne sombre qui détache la créature du sol.

**Les trois grandeurs d'éclairage suivent la TAILLE de la forme, elles ne sont
plus fixes** (`pathExtent()`). Le décalage d'ombre valait 2 px et l'arc de
lumière un rayon de 12,6 pour tout le monde : un runner de 21 px d'épaisseur et
un Rempart de 33 recevaient le même modelé. Sur le petit, l'arc débordait et
disparaissait à l'écrêtage ; sur le gros, l'ombre de 2 px était un cheveu. La
lumière était posée **à côté** de la forme au lieu de la suivre — et l'arc est
désormais centré sur la forme réelle, pas sur l'origine, sinon un tireur dont le
corps est décalé vers l'arrière reçoit sa lumière sur son canon.

L'étendue est **mesurée et non déclarée** : un `size` recopié à côté de chaque
type aurait menti dès le premier réglage de silhouette. Les huit tracés
n'appellent que `moveTo`, `lineTo` et `closePath`, donc un enregistreur suffit.
On retient la **plus petite** des deux dimensions, jamais la plus grande ni la
diagonale : c'est l'épaisseur qui dit combien de place il y a pour modeler.

**La couleur dit la classe, et la forme aussi.** C'est le **renversement** de la
règle d'origine (« la forme dit la classe, la couleur dit le joueur »), qui
tenait tant que les quatre teintes servaient à distinguer Paul de Marie. À
l'usage, la question posée vingt fois par manche est « où est le soigneur », pas
« lequel de ces deux points est Paul ». Les deux canaux disent donc la même chose
et se renforcent, au lieu de se partager le travail. Les sprites de classe
restent cuits dans une rampe neutre et teintés à la volée — rien ne change à ce
niveau.

**Rempart bleu, Soigneur vert, Tireur ambre ou violet.** Deux teintes de tireur
parce que c'est la seule classe non unique. `PLAYER_COLORS` (dans
`game_state.js`) n'est plus quatre littéraux mais quatre renvois vers
`CLASS_COLOR`, et son ordre **est** celui de l'attribution : 0 tank, 1 soigneur,
2 tireur A, 3 tireur B.

**`assignColors()` dans `room.js` est le point de passage unique**, et trois
choses y sont indissociables :

- **Deux teintes de tireur ne suffisent pas toujours.** `unique: true` veut dire
  « au plus un », pas « exactement un » : une table de quatre où personne ne
  prend le tank ni le soigneur aligne **quatre tireurs**. Les tireurs puisent
  donc dans leurs deux teintes puis **empruntent** les couleurs de classe unique
  restées libres. La règle du dessus n'en souffre jamais — si un tank est là, le
  bleu est à lui, donc il n'est pas empruntable.
- **Le tri est par identifiant**, pas par ordre d'itération de la `Map` : sans
  lui, un tireur change de teinte parce qu'un *autre* joueur a quitté le salon.
- **Jamais en pleine manche** (`phase !== PHASE_LOBBY` sort immédiatement). Le
  calcul dépend de la salle entière : une déconnexion recolorerait des joueurs
  vivants au milieu d'un combat, or la couleur est précisément ce qui sert à se
  repérer. `startRound()` appelle la méthode **avant** de basculer la phase ;
  un arrivant en cours de manche garde la teinte que `freeColor()` lui a donnée.

Le recalcul se fait **à la diffusion** (`lobbyPayload()`) plutôt qu'à chaque
mutation : le salon est rediffusé à toute arrivée, tout départ et tout choix de
classe, donc il n'y a aucun point de mutation à ne pas oublier de brancher.

**Corollaire : le mode soin a perdu son signal de couleur.** La bascule se lisait
au passage de la couleur de joueur au vert du soigneur ; le soigneur étant
désormais vert en permanence, il ne restait qu'un vert pâle virant au vert
saturé. Un **anneau pulsant** l'a remplacé, dans la même bande `RING_SKILL` que
la provocation et la surcharge — troisième classe, et les trois ne coexistent
jamais sur un personnage. Le mouvement se lit à travers la horde là où deux verts
voisins ne se lisent plus.

**Le Soigneur a été refait, pour la même raison que le Rempart au lot 6 et
constaté sur la même planche** : c'était un polygone à quatorze côtés de rayon
13, c'est-à-dire un **cercle**. Aucun appendice, aucune pointe, donc aucune
orientation lisible en silhouette — et il était la seule des trois classes dans
ce cas. Un soigneur qui ne tient que par sa teinte fait exactement porter la
classe par la couleur, ce que la règle ci-dessus interdit. Corps en **œuf**
pointé vers l'avant (il garde la masse ronde qui le sépare de l'hexagone du
Rempart et du dard du DPS, mais il a un avant et un arrière), **antenne dorsale**
d'un seul côté — l'asymétrie structurelle que les cinq monstres ont tous et
qu'aucune classe n'avait — et **embouchure courte et large** là où part déjà le
faisceau de mode soin. Pas de canon : il soigne, il ne perce pas.

**Trois principes d'animation, et aucun ne coûte une image d'atlas** :
anticipation (le brood gonfle avant d'éclater, le tireur recule son canon, le
tank rentre ses plaques), écrasement et étirement par `scale`, action secondaire
par particules. La respiration est **déphasée par identifiant** : en phase, deux
cents créatures pulsent ensemble et l'arène respire comme un seul organisme.

**Une seule source de vérité pour les couleurs : `shared/palette.js`.** Le canvas
et le DOM ont besoin des mêmes valeurs ; deux listes divergent au premier
réglage. `client.js` pose les variables CSS sur `:root` depuis `cssVars()` au
chargement — **jamais l'inverse**, et `public/css/tokens.css` ne contient donc
aucune couleur. Une couleur en dur dans `client.js` ou dans une feuille de style
est un bug. L'échelle typographique (`TYPE`) suit la même règle, pour la même
raison : le canvas écrit du texte lui aussi.

**La couleur est fonctionnelle, jamais esthétique.** La grammaire, désormais
obligatoire : cyan `il faut y aller` · ambre `danger, sortir` · rouge
`danger létal` · blanc `ça concerne un allié` · violet `persistant` · vert
`gain, soin`. **Jamais de rouge pour quelque chose où il faut aller** — une
seule exception et le joueur cesse de faire confiance au code couleur, donc lit
tout au cas par cas, ce qui est intenable à 200 ennemis à l'écran. Les couleurs
d'**identité** (classes, types de monstres, bonus au sol) sont une famille à
part : elles disent *qui*, pas *quoi*, et ne suivent pas cette grammaire.

**Un seul vert pour le soin, et c'est `HEAL`** (alias de `SIGNAL.gain` dans
`palette.js`). Il y en avait **quatre** : `SIGNAL.gain` sur les chiffres de soin
et `MARK.ok`, `POWERUP_COLOR.heal` (`#6fe3a0`) sur le bonus au sol, et
`CLASS_COLOR.soigneur` (`#8ef0c8`) sur le tir de soin, le sanctuaire, la vague de
soin et la balise. Quatre verts qu'aucun joueur ne peut distinguer volontairement
— donc la même information dite de quatre façons, c'est-à-dire aucune. Pire,
`POWERUP_COLOR.beacon` valait **exactement** `CLASS_COLOR.soigneur` : une balise
au sol avait la couleur d'un joueur.

Règle : **tout ce qui rend des PV ou relève un allié porte `HEAL`** — bonus de
soin, balise, tir du soigneur, vague de soin, sanctuaire, mode soin du
personnage, chiffres verts. Le relèvement en fait partie : il restaure un allié,
c'est la même promesse.

**Cette famille est une exception à la carve-out d'identité ci-dessus**, et c'est
délibéré : un bonus qui soigne est d'abord un soin, ensuite un objet.
`CLASS_COLOR.soigneur` reste l'identité du **joueur** et ne dit plus jamais
« ceci soigne » — c'est la distinction entre le *qui* et le *quoi* qui rendait la
table incohérente. Corollaire : le sanctuaire a quitté la couleur de classe que
partagent le rempart et l'ancre. C'était la bonne règle pour ces deux-là, qui
déplacent ou retiennent, et la mauvaise pour lui, qui **soigne**.

Un **alias** et non une valeur recopiée : deux littéraux identiques divergent au
premier réglage, ce que `palette.js` existe précisément pour empêcher.

**Chaque rareté a un matériau, pas seulement une couleur** : bordure plate,
bordure épaisse, lueur externe, dégradé balayé. C'est ce qui la rend
reconnaissable au coin de l'œil, avant d'être lue. La légendaire est la **seule**
à porter une animation — c'est ce qui en fait un événement.

**Échelle typographique fixe : 13 / 15 / 18 / 22 / 29 / 38 / 50.** Aucune valeur
ad hoc. Le HUD est en DOM et la respecte entièrement. Quatre **planchers** ne se
descendent pas, ce sont les quatre choses qu'on lit en combat sans avoir le
temps de les chercher : PV, touches en gras, noms d'équipe, chronomètre. Ce sont
des pixels CSS, donc la même taille quelle que soit la fenêtre — c'est tout
l'intérêt d'avoir sorti le HUD du canvas.

**Elle a été montée d'un cran** (11 / 13 / 15 / 19 / 26 / 34 / 46 avant).
L'échelle d'origine était calée sur un écran de 1280 et se lisait comme une
interface de bureau ; sur les 1440p et 1920 d'aujourd'hui, tout paraissait petit.
Le grief portait sur l'ensemble et pas sur un écran, ce qui se vérifie dans le
CSS : le premier cran est le plus employé du dépôt — **90 déclarations sur
240** — donc c'est lui qui donnait le ton. Les **rapports** sont conservés (≈ 1,2
en bas d'échelle, ≈ 1,3 en haut) parce que ce sont eux qui font la hiérarchie,
pas les valeurs absolues : monter les tailles à rapports constants, c'est la même
composition vue de plus près, alors que les changer aurait redessiné tous les
écrans. Les planchers du HUD suivent mécaniquement, et c'est voulu — ce sont des
minimums, pas des cibles. Vérifié après coup sur les dix écrans et le HUD, à
1536, 1280 et 375 px de large : **aucun débordement**, ni de page ni d'élément
hors de son parent.

**Espacement sur une grille de 4 px** : 4 / 8 / 12 / 16 / 24 / 32 / 48, sans
exception.

**Les angles sont durs** : rayon de bordure à 2 px maximum, coupes en biseau
plutôt qu'arrondis. **Le seul cercle du jeu est une entité vivante** — un bouton
arrondi lui volerait ce signe.

**Une exception, bornée aux MENUS** (`menus.css`) : `--radius-ui: 16px` pour les
panneaux et les cartes, `--radius-ctl: 12px` pour les champs et les boutons. La
règle des angles durs sert la lisibilité **à un dixième de seconde** — c'est
l'arène et le HUD, où une forme mal lue coûte une mort. Hors combat on a le
temps, et un rayon franc sépare visiblement le poste de contrôle du jeu
lui-même. Ne pas l'étendre : `#cards`, `#build`, `#pause`, `#hud` et
`admin.html` gardent 2 px, et si l'un d'eux change d'aspect c'est qu'une règle
de `menus.css` fuit.

**Le biseau a disparu des actions principales : `--bevel` et `--glow-go` ne
coexistent pas.** L'arbitrage avait été fait pour `#bilanGo` seul, il vaut pour
toute la famille — `#start`, `#go`, `#regGo`, `#gateContinue`, `#menuClose`.
Deux raisons, l'une et l'autre visibles à l'écran. Un `clip-path` clippe aussi le
`box-shadow`, or la lueur est **extérieure** : le bouton déclarait un halo qu'il
ne montrait nulle part, et `armed` animait une pulsation invisible. Et une coupe
de 10 px dans un rayon de 12 ne fait pas un biseau mais une **entaille** — le
polygone a des angles vifs là où le fond est arrondi, si bien que les coins se
lisent comme un contour clair mal fini. C'est ce qui a été rapporté : « le tour
du bouton, les arrondis ne sont pas nets ».

Ce qui **désigne** l'action principale est donc la lueur, et elle le fait mieux
puisqu'on la voit. `--bevel` n'a plus d'usage dans la feuille ; le jeton reste
dans `tokens.css` pour qui voudra un biseau sur un élément **sans** lueur — c'est
la seule condition.

**Le pointeur de souris est dessiné par la charte** (`cursorUri()` dans
`palette.js`, exposé en `--cursor-ui` et `--cursor-go`), pas hérité du système.
C'était la dernière pièce d'interface qui n'appartenait pas au jeu : une flèche
d'OS arrondie et ombrée posée sur un poste de contrôle qui refuse les arrondis
et les ombres. Il vit dans `palette.js` parce que c'est une **forme et une
couleur** — les deux choses que ce fichier tranche — et qu'un `.cur` binaire ou
un littéral dans une feuille aurait figé la couleur hors de la charte.

Les trois mêmes règles que le reste : **angles durs** (`miter`, aucune courbe —
le seul cercle du jeu est une entité vivante) ; **couleur fonctionnelle** (au
repos `--text`, il montre sans rien dire ; sur une cible `--go`, « il faut y
aller », la couleur des kickers et de l'action) ; **contour systématique** (le
tracé peint deux fois, élargi en `--bg-void` puis plein, exactement la recette
du contour des créatures — sans lui le pointeur disparaît sur un panneau clair
autant que sur le fond de l'arène). La forme change **en plus** de la couleur —
un crochet de visée apparaît sur ce qui répond au clic — parce qu'une
information portée par la seule couleur est perdue pour un daltonien.

Deux états et pas trois : « interdit » n'existe pas, un bouton désarmé porte
déjà son opacité et son libellé d'attente, et il retombe au pointeur de repos.
Le point actif reste sur la **pointe** (`2 2`) : un réticule centré collerait
mieux à l'arène, mais on vise ici des bords de boutons et déplacer le point
actif d'un pointeur de menu se paie en clics manqués.

La liste des écrans s'arrête à **ce qu'on parcourt à la souris**. `#pause` en
fait partie bien qu'il soit un écran de combat : ouvrir le menu **arrête le
personnage** (`readMove()` sort à vide), donc on n'y vise plus rien — et
`menus.css` l'habille déjà entièrement, du voile au panneau. `#cards` et
`#build` en sont dehors : ils s'ouvrent une manche en cours, la souris y garde
le réticule qu'elle avait une seconde avant. L'arène garde son `crosshair` —
c'est là qu'on vise — et `admin.html` le pointeur système, puisqu'elle ne
charge pas `palette.js`. Le repli est toujours le curseur système
correspondant : un navigateur qui refuse les curseurs SVG perd le dessin et
rien d'autre.

**Trois familles typographiques, chacune avec son rôle** — et la chasse fixe
reste le **registre du jeu**. `--font-display` (Chakra Petch 600/700) porte les
titres, les boutons et les noms propres ; `--font-body` (Space Grotesk, variable) porte les
paragraphes, et **eux seuls** ; `--font` (chasse fixe) garde tous les chiffres,
les effectifs, les pourcentages, les libellés techniques et les pastilles
d'état. Les deux nouvelles familles n'existent que parce que la chasse fixe
**aplatit les contrastes de forme** : en chasse fixe, un titre de 26 px et un
paragraphe de 15 px se ressemblent bien plus que dans deux familles
différentes, et l'écran n'avait donc aucun point d'entrée pour le regard.
Elles sont **versionnées avec le jeu** (`public/fonts/`) et non chargées depuis
un CDN — une dépendance à un tiers ajoute un point de panne et une latence au
premier rendu sur un chemin critique, l'écran de connexion. Sans les fichiers,
la page reste fonctionnelle : les deux variables retombent sur `var(--font)` et
`system-ui`.

**La police de corps doit DIRE quelque chose, elle aussi.** Barlow tenait ce
rôle et a été remplacée — pas par goût : c'était la seule des trois familles qui
ne signait rien. Une grotesque neutre, dessinée pour ne pas se faire remarquer,
coincée entre une chasse fixe qui dit « poste de contrôle » et une Chakra Petch
qui dit « technique » ; le corps de texte était donc le seul endroit de l'écran
où le jeu ressemblait à un site. Space Grotesk vient du même monde que les deux
autres — terminaisons coupées net, `g` à un seul étage, chiffres anguleux — sans
copier Chakra Petch, qui est étroite et titrée là où elle est large et lisible
en petit corps.

**Le fichier est VARIABLE, et c'est ce qui corrige la lisibilité.** Un texte
clair sur fond sombre s'amincit optiquement : à graisse égale, il paraît plus fin
que le même texte en sombre sur clair — c'est ce qui faisait lire les leads comme
« pas très lisibles » alors que leur contraste (`--text-dim`, mesuré à 6,36:1)
passe largement le seuil AA. Barlow n'avait que son Regular versionné, donc rien
à faire : demander 500 aurait produit un faux gras. L'axe de graisse rend un
poids **intermédiaire** possible — `--weight-body: 450`, un seul jeton parce que
six blocs de prose le portent et doivent bouger ensemble — pour un seul fichier.
Le `@font-face` déclare une **plage** (`font-weight: 300 700`) et non une valeur :
écrire `400` y rendrait tout poids intermédiaire en faux gras, c'est-à-dire
exactement le défaut qu'on vient de supprimer.

**L'interligne des paragraphes suit la hauteur d'x, pas une habitude.** Il passe
de 1,7 à **1,6** avec la famille, et les deux vont ensemble : 1,7 était juste
pour Barlow, dont la hauteur d'x est basse. Space Grotesk la porte nettement plus
haut — mesurée à 8 px pour un corps de 15 — donc le même 1,7 délite le paragraphe
au lieu de l'aérer. Un bloc de prose doit se lire comme un **bloc** ; à 1,7 il se
lisait comme une liste de lignes.

**Trois niveaux de lecture, et un élément n'en porte qu'UN.** Le **kicker**
(`.sectionTitle`, chasse fixe, capitales espacées, 11 px, `--go`) dit *où je
suis* ; le **titre d'écran** (Chakra Petch, 34 px, `--text`, casse normale) dit
*quoi* ; le **corps** (Space Grotesk, 15 px, graisse 450, interligne 1,6, `--text-dim`, mesure
≤ 62 caractères) dit *pourquoi*. `#hubTitle`, `#panelTitle` et `#bilanTitle`
étaient en `--text-dim` **et** en capitales espacées, c'est-à-dire au même
niveau visuel qu'un `.sectionTitle` : l'écran n'avait pas de titre, il avait
deux sous-titres.

**Les écrans d'avant-partie coulent depuis le HAUT, dans une colonne de largeur
bornée.** `.overlay` centre son contenu verticalement, et c'était la cause
directe de « les emplacements sont anarchiques » : tout bloc ajouté déplace
tous les autres, donc le bouton **Lancer la manche** remontait ou descendait
selon le nombre de joueurs connectés, la longueur de `#waitMsg` et la présence
du tableau. `#loading` **reste centré** : c'est le seul écran qui n'a qu'une
chose à dire.

**Trois coques et UNE gouttière, toutes en tokens** (`--shell-narrow: 1080px`
pour les paramètres, `--shell: 1440px` pour le hub, le bilan et la progression,
`--shell-wide: 1680px` pour le salon ; `--gutter: clamp(24px, 3.4vw, 48px)`).
La règle « trois largeurs et pas une de plus » était annoncée mais plus tenue —
960, 1200, 1120, 1000 et 820 px cohabitaient — et toutes étaient calées sur un
écran de 1280. Sur 1920 le hub laissait **480 px de vide de chaque côté**
pendant que la barre supérieure allait d'un bord à l'autre : l'écran se lisait
comme un document centré dans une fenêtre, pas comme l'interface d'un jeu. La
même mesure donne 240 px aujourd'hui.

Deux corollaires. Les coques restent **bornées** — au-delà, une ligne de tableau
devient un trajet d'œil de trois mille pixels entre le nom et le chiffre qui le
suit ; ce qui protège la lecture n'est pas la coque mais la **mesure**, et les
paragraphes gardent tous leur `max-width: 62ch`. Et les règles qui décident sont
celles portant un **identifiant** (`#hubScreen > *`, `#panel > *`…), pas le
`max-width` que chaque conteneur (`.hubWrap`, `.panelWrap`…) se donne par
ailleurs : les deux existent et doivent rester d'accord, d'où le même token des
deux côtés. `.panelBarInner` lit `--shell-wide` pour la même raison — un bouton
de lancement décalé par rapport au tableau qu'il conclut se remarque
immédiatement.

**L'action principale du salon est ANCRÉE en bas de fenêtre**, avec `#waitMsg`
à sa gauche — c'est lui qui explique pourquoi le bouton ne répond pas, il
appartient donc à la barre. La barre porte un **fond opaque et non un dégradé** :
le contenu défile dessous, et un dégradé laisse passer assez de texte pour
rendre le libellé du bouton illisible une ligne sur trois. Corollaire : le
`padding-bottom` de `.panelWrap` doit rester **≥ la hauteur réelle de la barre**,
sinon le pied des cartes de classe passe dessous.

**`menus.css` NE PEUT PAS produire cette mise en page seul, et c'est structurel.**
Deux colonnes, une barre fixe, un panneau latéral : il n'y a rien dans le markup
d'origine sur quoi les accrocher. Un premier essai a posé la feuille sur
`index.html` inchangé et la plupart des règles de disposition n'ont correspondu
à rien — seuls les rayons et quelques couleurs sont passés. Les conteneurs sont
donc **ajoutés dans `index.html`**, et de façon strictement **additive** :
on enveloppe, on n'échange pas. Aucun `id` renommé, aucune classe posée par
`client.js` (`.mine`, `.winner`, `.taken`, `.running`, `.err`, `.equipped`,
`.r0`–`.r3`, `.picked`, `.faded`) touchée.

| Écran | Conteneurs |
|---|---|
| `#gate` | `.gateLeft` · `.gateRight` · `.gateAudio` · `.gatePitch` (`.gateH1`, `.gateLead`) · `.gateKeys` |
| `#hubScreen` | `.hubWrap` · `.hubHead` · `.hubCreate` · `.hubLead` |
| `#panel` | `.panelWrap` · `.panelHead` · `.panelGrid` (`.panelChoices` / `.panelState`) · `.panelCard` · `.panelBar` (`.panelBarInner`, `.panelBarText`) · `.panelLead` · `.panelLeaveRow` |
| `#menu` | `.metaWrap` · `.metaHead` · `.metaCoresBox` · `.metaLead` · `.metaBack` |
| `#topbar` | hors des `.overlay`, avant `#stage` — `#topHome` · `#topCrumb` · `#topPing` · `#topUser` · `#topSettings` |
| `#settings` | `.setWrap` · `.setHead` · `.setCard` · `.setRow` · `.keyRow` (`.keyCombo`, `.keyCap`, `.keyDesc`) |

`#loading`, `#bilan`, `#cards`, `#build` et `#pause` marchent au **CSS seul** :
leur markup d'origine suffit.

Deux pièges de placement, tous deux vérifiés au rendu : **`.panelBar` est un
enfant DIRECT de `#panel`** et jamais de `.panelWrap` — elle est en
`position: fixed` et hériterait sinon de la largeur de la colonne ; et
`#metaCores` **sort de son `.sectionTitle`** pour devenir un chiffre à part
entière, parce que c'est l'information qu'on vient chercher et non le suffixe
d'un libellé.

**La barre supérieure OBSERVE l'état des écrans, elle ne le pilote pas**
(`syncTopbar()`, un `MutationObserver` sur le seul attribut `hidden`). Un
`showScreen(name)` unique aurait demandé de réécrire une quinzaine de chemins
d'affichage, dont plusieurs portent des règles d'ordonnancement documentées —
`worldQueue`, les gardes de `refreshPanel`. Un observateur ne **peut pas**
oublier un écran, puisqu'il constate au lieu de décider. Elle est un enfant
direct de `<body>`, **avant `#stage`** : le CSS la pose en `position: sticky`,
donc dans le flux, et derrière un `#stage` haut de 100 % elle tombait hors
écran. Corollaire dans `ui.css` : `#topbar:not([hidden]) ~ .overlay` décale les
écrans de 56 px, sans quoi leurs premiers pixels passent dessous — le kicker du
salon disparaissait.

**Le bouton d'accueil promet UNE chose : d'où qu'on clique, on arrive au hub**
(`goHome()`, point de passage unique). Le sien n'y arrivait que depuis le salon,
et les trois défauts se voyaient à l'usage. Il sortait immédiatement sur
`!inRoom`, donc **au hub** avec le Terminal ou les Paramètres ouverts par-dessus
il ne faisait rien — le « il ne marche pas tout le temps ». Depuis une salle avec
l'un de ces écrans ouvert, il envoyait `leaveRoom` sans les fermer : or `#menu`
(4ᵉ `.overlay`) et `#settings` (5ᵉ) viennent **après** `#hubScreen` (2ᵉ) dans le
document, à z-index égal — ils restaient donc peints par-dessus le hub, et l'on
regardait un écran mort. Et depuis les Paramètres, `settingsFrom` pointait sur le
salon qu'on venait de quitter : le refermer **ressuscitait** le salon d'une salle
où l'on n'était plus.

L'ordre compte : la **confirmation d'abord** — annuler ne doit rien avoir
refermé — puis on ferme ce qui se superpose **sans rien restaurer**, la
destination étant le hub et non ce que l'écran recouvrait.

**`roomClosed` ferme les mêmes écrans, et ce n'est pas une redite.** On sort
d'une salle par bien d'autres chemins que ce bouton — `#panelLeave`, la sortie du
bilan, une salle fermée sur erreur — et tous aboutissent à ce message. C'est le
point de passage de la **sortie**, là où `goHome()` est celui du **geste** : un
écran de salle laissé ouvert par l'un des autres chemins produirait exactement le
même écran mort.

**Le bouton « Terminal » de la barre d'action a été retiré, et la règle du seul
point d'entrée redevient vraie à la lettre.** Il ouvrait exactement le même écran
que celui de la carte de classe, sans dire sur quel arbre — un second chemin vers
la même destination, moins informatif que le premier. Sa **pastille** de noyaux
dépensables l'a suivi sur `.classMetaBtn` : c'était la seule chose qu'il
apportait, et la perdre aurait rendu la progression invisible à qui n'y pense
pas. Elle est reposée **à chaque rendu** — `renderClasses()` reconstruit ce
bouton à chaque diffusion du salon, elle ne peut pas survivre seule — d'où le
drapeau `metaSpendable` que `updateTerminalDot()` tient et que le rendu lit.

La pastille reste un **losange**, jamais un rond : `ui.css` l'avait écrit dès
l'origine (« le seul cercle du jeu est une entité vivante ») et une règle
`border-radius: 50%` de `menus.css` — chargée après — le contredisait en silence.
Corollaire : un joueur qui n'a **pas encore choisi** de classe n'a plus d'accès à
la progression, puisque le bouton naît sur la carte choisie. C'est assumé — on
choisit sa classe, puis on regarde ses talents.

**Un seul point d'entrée vers la progression, et il vit sur la carte CHOISIE**
(`.classMetaBtn`, sous `.classOpt`). Il y en a eu trois — un par carte de classe
— et c'était trois fois la même action, chacune concurrençant le choix de classe
sur sa propre carte, or une carte de classe a un seul but : se faire choisir.
Un seul bouton, sur la seule carte retenue, dit à la fois *où l'on va* et *sur
quoi ça porte*. Il vit **sous** la carte et non dedans (`.classCell`) : `.classOpt`
est un `<button>`, et un bouton imbriqué dans un bouton est sorti de son parent
par le navigateur, emportant la mise en page.

**Il ne rejoue son apparition (`popIn`) que si la classe a VRAIMENT changé**
(`.fresh`, posé par `renderClasses`). `renderClasses()` vide `#classRow` et le
reconstruit à **chaque** diffusion du salon — un vote, un « prêt », l'arrivée
d'un joueur, c'est-à-dire à chaque clic de la page — donc le bouton renaissait
identique et reprenait son animation : il clignotait. C'est le défaut que
`.settled` corrige pour les listes voisines, mais `.settled` ne peut pas le
couvrir : ce bouton **naît d'un clic**, bien après que l'écran s'est posé, et la
classe qui coupe l'entrée d'écran supprimerait la seule animation qu'on veut
garder. D'où un drapeau porté par le rendu plutôt qu'une règle de temps.

**L'unité de la monnaie s'écrit en toutes lettres, jamais en glyphe** :
« 650 noyaux », jamais « 650 ◈ ». Un signe inventé doit s'apprendre avant qu'on
puisse lire un prix, et il n'existe nulle part ailleurs dans le jeu.

**Un seul réglage, trois vues : `audioUi` est le point de passage unique.**
Les curseurs de volume vivent sur l'accueil, la pause **et** l'écran de
paramètres, et règlent la même valeur — trois nombres différents pour un seul
volume seraient pires qu'un seul curseur. Le jeu des paramètres n'a
volontairement pas de bouton de coupure : couper le son est un geste d'urgence,
il a sa place là où l'on est déjà, pas dans un écran qu'il faut d'abord ouvrir.
`mute` est donc optionnel dans la table. `#settings` retient l'écran d'où l'on
vient (`settingsFrom`, l'élément et non un nom) : sans lui on ressortirait
toujours au hub, donc on perdrait son salon pour avoir voulu baisser le son.

**`admin.html` ne charge NI `client.js` NI `shared/palette.js`, et c'est ce qui
la rend utilisable.** Elle importait `cssVars` dans un `<script type="module">`
— or un module dont l'import échoue ne s'exécute **pas du tout** : une
arborescence `shared/` cassée laissait une page inerte, sans bouton
« Actualiser », c'est-à-dire sans moyen de diagnostiquer la panne qu'on vient
constater. C'est exactement le scénario pour lequel la page existe.
`public/css/admin.css` recopie donc la palette à la main : **seule duplication
autorisée du dépôt**, commentée des deux côtés — une couleur changée dans
`palette.js` s'y reporte à la main. Deux écarts voulus avec les menus : les
angles y restent **durs** (le rayon franc dit « poste de contrôle du joueur »,
l'angle dur dit « machinerie ») et le kicker est **ambre** et non cyan — le
cyan dit « il faut y aller » partout ailleurs, ici il faut dire « tu es hors du
jeu, sur un outil qui touche aux données de tout le monde ».

**Un changement d'écran est un CROISEMENT, jamais une coupure.** L'entrée était
soignée (`screenIn` : l'écran arrive à 1,015, descend de 18 px et fait sa mise
au point, comme un viseur) mais la sortie n'existait pas — `hidden` retire
l'écran en **une image**, et l'œil voit le fond nu pendant que le suivant
commence son fondu. Trois durées, et elles se lisent ensemble : sortie
**280 ms** sur `--ease-in` (on ne lit pas ce qui part), entrée **380 ms** sur
`--ease-out`, et surtout un retrait `--screen-hold` de **120 ms** avant
l'entrée. Ce retrait est ce qui rend la transition VISIBLE : sans lui les deux
animations partaient ensemble, et la courbe `--ease-out` amène l'entrant à 90 %
d'opacité en 140 ms — tout était fini avant qu'on ait vu quoi que ce soit.
Le contenu **glisse dans le même sens** aux deux bouts — l'entrant descend de
18 px, le sortant est poussé de 12 px vers le haut — pour que l'œil suive un
mouvement continu au lieu de deux fondus sans rapport.

**Ce sont les VOILES qui se croisent, jamais les contenus** (`--content-out`,
160 ms contre 280 ms pour le voile). Le croisement des voiles est ce qui donne
la continuité ; celui des contenus est une **double exposition** — deux titres
et deux tableaux lisibles l'un sur l'autre, rapporté à l'usage comme « l'ancienne
page se superpose avec la nouvelle ». Cause mesurée : la courbe de sortie est
lente au départ, donc le sortant est encore à **0,88** d'opacité à l'instant où
`--screen-hold` lance l'entrant, et les deux restaient lisibles de 140 à 320 ms.
Le contenu sortant est donc rendu à zéro **avant** que l'entrant ne devienne
lisible, et le voile garde sa durée pleine : le fond ne se découvre jamais.
Remesuré sur `#gate` → hub, à la milliseconde : contenu sortant 0,61 à 126 ms,
0,22 à 160 ms, **0 à 201 ms** ; contenu entrant 0,38 à 160 ms, 0,69 à 201 ms ;
les voiles, eux, se croisent toujours (0,67 / 0,69 à 201 ms). La fenêtre où deux
contenus se lisent ensemble tombe de 180 ms à **40 ms**, et l'écran est posé à
450 ms comme avant. Raccourcir la sortie du **voile** aurait rendu le fond nu ;
allonger `--screen-hold` aurait supprimé le croisement qu'on est venu chercher.

**Aucun appelant ne change, et c'est la condition.** Les quinze chemins qui
posent `hidden` portent des règles d'ordonnancement documentées (`worldQueue`,
les gardes de `refreshPanel`, l'ordre bilan/salon) : c'est `client.js` qui pose
`.leaving` depuis le `MutationObserver` **déjà en place** (celui du fil d'Ariane
et de la cascade), et `menus.css` qui maintient l'écran affiché le temps de son
animation. Il constate, il ne décide pas — c'est ce qui le rend incapable
d'oublier un chemin. Une classe plutôt que `transition-behavior:
allow-discrete`, qui fait la même chose en CSS pur : le repli de ce mot-clé sur
un navigateur qui l'ignore est la coupure nette, c'est-à-dire aucune animation
et aucun moyen de s'en apercevoir à la lecture.

**`.settled` ne se retire qu'à la FIN de la sortie, jamais à la pose de
`hidden`.** La règle d'origine était juste tant qu'un écran caché disparaissait
dans la même image ; depuis `.leaving` il reste **affiché** `LEAVE_MS` de plus,
et `.settled` est précisément la classe qui pose `animation: none` sur les
listes du salon, du hub et de la progression. La retirer réarme `riseIn`
(`both`, opacité 0 → 1, décalages `nth-child` jusqu'à 300 ms) : mesuré sur une
liste de six entrées, la cinquième ligne de l'écran **sortant** repartait à
**0,00** d'opacité et n'était encore qu'à **0,14** à 300 ms — c'est-à-dire que
toute la page qui s'en va se rallume ligne par ligne pendant qu'elle s'efface.
C'est le clignotement que `.settled` existait pour supprimer, remis en scène par
la sortie d'écran. Après correction, `animation: none` et l'opacité 1 tiennent
sur toute la sortie (46 → 301 ms), et le retrait tombe à 360 ms sur un écran
déjà en `display: none`. Corollaire : une **réouverture** doit rejouer la
cascade, donc `.settled` est aussi retiré sans condition à découvert — un
aller-retour plus rapide que la sortie annule le retrait différé, et sans ce
second retrait l'écran rouvrirait sans cascade.

**Un enregistrement de mutation ne veut PAS dire un changement.** Le DOM en
produit un à chaque *écriture* d'attribut, même quand la valeur ne bouge pas, et
plusieurs chemins reposent `hidden = true` sur un écran déjà caché — le
`welcome` le fait sur `#gate` que `bootOnce` vient de retirer. Sans comparer
`oldValue` à l'état courant, la sortie repartait pour un tour : l'écran
**réapparaissait à pleine opacité** avant de refondre. Corollaire côté
`bootOnce` : il ne réaffiche plus `#gate` en fin de chargement (c'était quatre
animations d'affilée sur la toute première impression du jeu), et ce sont les
trois chemins d'échec — `authError`, `onerror`, `onclose` — qui le rappellent.

Trois pièges de composition, tous vérifiés : le voile ne fait qu'une
**opacité** (`scale`, `translate` et `filter` créent un bloc conteneur pour les
descendants en `position: fixed`, et `.panelBar` est un enfant direct de
`#panel` — elle sauterait à chaque changement ; l'opacité ne crée qu'un contexte
d'empilement, mesuré : la barre ne bouge pas d'un pixel) ; le glissement et le
flou vivent sur le **wrapper**, là où `screenIn` les met déjà ; et
`pointer-events: none` sur le sortant, qui reste affiché et avalerait les clics
destinés au suivant.

**Rien ne se sélectionne, sauf ce qu'on écrit.** Un jeu n'est pas un document :
le geste qui sert à viser, à traverser une liste de salles ou à insister sur un
bouton laissait derrière lui des pans de texte en surbrillance — un double-clic
sur « Continuer » sélectionne le mot, un glisser sur le tableau des scores en
bleuit trois lignes. C'est le seul résidu d'interface que personne n'a voulu, et
il survit à l'écran suivant. L'exception n'est pas négociable : dans un **champ**,
la sélection est le seul moyen de corriger ce qu'on a tapé. La règle est posée
sur `html` et non sur `*` — la propriété s'hérite, et une règle universelle
écraserait l'exception au lieu de la laisser gagner.

**Rien de décoratif ne se superpose au jeu.** Tout ornement — balayage des
légendaires, logotype — vit dans les écrans hors combat. Les transitions entre
écrans sont des **fondus**, jamais des glissements. La grille et le
vignettage de l'arène font exception et n'en sont pas une : ce ne sont pas des
ornements mais le **sol**, gradué en mètres (5 m fin, 20 m marqué) pour que les
distances des descriptions de cartes veuillent dire quelque chose à l'écran. Le
sol brille brièvement dans le rayon d'une explosion — un écran de mesure réagit
à ce qu'il mesure, et le seuil est celui du tressaillement, jamais l'impact
ordinaire.

**Le vignettage de cauchemar PULSE, et c'est la seule animation d'ambiance du
jeu** (lot T). Elle est volontairement sous le seuil de la conscience — période
de 2,6 s, amplitude 6 % : on la sent respirer, on ne la regarde pas. Une
pulsation lisible serait un ornement superposé au jeu, ce que la règle ci-dessus
interdit. Elle interdit aussi le cache du dégradé, et c'est le seul mode qui le
paie ; les deux autres gardent le leur.

**Les chiffres de dégâts sont agrégés sur 200 ms et seuillés à 5 % des PV max de
la cible.** Sans l'agrégation, une balle toutes les 90 ms sur la même cible
produit une colonne illisible ; sans le seuil, une nova qui touche quarante
ennemis pour trois points repeint l'écran de nombres. Les dégâts **subis** sont
rouges et plus gros, les **soins** verts — sans ce dernier chiffre, le soigneur
n'a aucun retour visible de son action.

**Les chiffres qui concernent un JOUEUR sont agrégés eux aussi** (`aggregateSelf`
/ `flushSelf`), même fenêtre de 200 ms. Ils y échappaient, et la justification —
« il n'y en a jamais qu'un à la fois par joueur » — est fausse depuis deux
mécaniques : le **vol de vie** rend une fraction des dégâts à *chaque touche*
(mesuré : 0,29 à 0,58 PV par touche à un exemplaire, six touches par seconde),
et un dégât **continu** descend les PV à chaque tic donc à chaque snapshot,
jusqu'à vingt nombres rouges par seconde pour un seul effet. Un joueur qui voit
un « +1 » vert trois fois par seconde en conclut que le vol de vie se déclenche
au *tir* — c'est un bug de retour, pas de simulation. Le seuil n'est pas en part
des PV max (on ne connaît pas ceux de la source) mais sur la valeur affichable,
et un total sous le seuil est **reporté** sur la fenêtre suivante, jamais jeté.

**Un dégât SUBI porte le glyphe de sa provenance, un dégât infligé non.** Sur un
chiffre infligé la provenance est évidente — c'est nous — et un glyphe de plus à
trois cents impacts par minute repeindrait l'écran. Le glyphe est dans la couleur
du texte : c'est la même information, elle ne peut pas être de deux couleurs.

**Choisir une carte MUTE la rangée, ça ne la reconstruit pas.** `pickCard`
appelait `renderCards()`, qui vide `#cardsRow` et recrée les trois boutons — or
`#cardsRow .cardOpt` porte `riseIn` en `both`, avec des délais de 0, 70 et
140 ms. Les trois cartes repartaient donc d'une **opacité nulle** au moment
précis où l'on venait d'en choisir une (mesuré : 0,44 / 0,44 / 0,00 à 60 ms).
C'est le clignotement, et c'est le défaut que `.settled` corrige ailleurs —
sauf que `.settled` ne pouvait pas servir ici, la carte épique portant `riseIn`
**et** `epicBreath` dans la même déclaration. La bonne correction est en amont :
on ne détruit pas ce qui n'a pas changé. `renderCards()` reste le chemin des
vrais changements d'offre — nouveau tirage, relance, tour suivant.

**Corollaire découvert en corrigeant : `.faded` n'avait jamais fonctionné.**
`riseIn` est en `fill-mode: both`, donc il **retient** sa valeur finale
(`opacity: 1`) une fois terminé — et une animation l'emporte sur une déclaration
auteur normale, quelle que soit la spécificité. Les deux cartes écartées
restaient donc pleines, alors que voir ce qu'on a **écarté** est la moitié de la
décision que cet écran sert à prendre. C'est le piège déjà documenté pour
`translate` / `transform`, vu par l'autre bout : là il fallait séparer deux
propriétés pour que le survol survive à l'entrée, ici il faut **arrêter**
l'entrée pour que l'état vive.

Deux pièges de cascade dans la foulée, tous deux vérifiés à l'écran. Le sélecteur
doit reprendre `#cardsRow` — `#cardsRow .cardOpt` pèse (1,1,0) et `.cardOpt.faded`
(0,2,0) ne peut pas gagner, c'est exactement ce qui est déjà écrit pour
`.cardOpt.r2` ; sans lui la règle est simplement inerte. Et la carte **choisie**
doit reprendre `opacity: 1` : elle est `disabled`, donc le `opacity: .45` des
boutons désarmés s'appliquait dès que l'animation cessait de le masquer, et la
carte qu'on vient de prendre devenait plus pâle que le reste de l'écran — même
arbitrage que `#start:disabled`. Résultat mesuré : écartées à **0,30**, choisie à
**1,00**, aucune animation relancée.

**Sur l'écran de cartes, l'effet est la ligne la plus grosse, pas le nom.** C'est
ce qu'on compare en trente secondes ; le nom ne sert qu'à reconnaître la carte
une fois prise. Une icône par **famille** et non par carte : cinq glyphes
s'apprennent, soixante ne se lisent jamais.

**Une carte dit sa CATÉGORIE et son RANG dans la build** (« zone · 3ᵉ carte de
zone »). Sans ça, chaque tirage se lit isolément et la build se construit par
accident — le joueur qui a six cartes offensives et zéro défensive ne s'en aperçoit
qu'au tableau de fin. Ne pas confondre avec les **familles** : une famille est un
axe sur quatre paliers de rareté et c'est une règle de *tirage* ; une catégorie
couvre les 116 cartes et ne sert qu'à l'*affichage*. Elle est **déduite des `tags`**
(`cardCategory()`, point de passage unique) plutôt que recopiée sur tout le
catalogue, avec un `cat` explicite pour les seules cartes de zone. L'ordre de
priorité compte : `coop` → soutien, puis `off`, puis `def`, sinon utilitaire — on
nomme la carte par ce qui la rend remarquable, pas par sa première lettre de tag.

**Les cinq couleurs de catégorie reprennent la grammaire fonctionnelle**, et
l'offensif y est **rouge**. C'est la seule dérogation à « jamais de rouge pour
quelque chose où il faut aller », et elle est bornée : la règle porte sur
l'**arène**, où une erreur de code couleur coûte une mort. Sur un panneau de choix
hors combat, le rouge ne désigne pas un endroit, il nomme la seule famille d'effet
que la grammaire appelle « dégâts ». Ne pas étendre cette dérogation au monde.

**Le bilan de fin de manche et le salon sont deux écrans.** Tant que le salon
suivant était affiché dessous, personne ne lisait son bilan.

**Le bilan titre sur le SEGMENT atteint, ou sur la VICTOIRE, pas sur le numéro de
manche.** `roundNumber` s'incrémentait correctement — ce n'était jamais un bug de
compteur — mais l'unité de jeu n'est pas la manche, et « Manche 1 terminée » après
une demi-heure de jeu se lit comme un compteur cassé. Le numéro de manche descend
avec les autres chiffres. La victoire (`state.victory`, six boss vaincus) voyage
dans le `roundEnd` : elle ne se déduit pas d'un segment 6 atteint.
Il porte aussi la **répartition des dégâts subis** par provenance, agrégée sur
l'**équipe** et non par joueur : cinq colonnes de plus dans le tableau des scores
l'auraient rendu illisible à quatre, alors que la question — « qu'est-ce qui nous a
tués » — se pose au collectif. Rien ne s'affiche si personne n'a rien pris : une
rangée de zéros n'est pas une information. Elle se lit en **une barre empilée**
et une légende, pas en une barre par provenance : ce sont les parts d'un même
total, et empilées la comparaison ne demande plus rien. C'est `SRC_TINT`
(`palette.js`, ordre de `DAMAGE_SOURCES`) qui rend la légende lisible sans
l'avoir apprise — chaque provenance porte la couleur qu'elle a dans l'arène, et
la pastille se relie à son segment sans effort. L'objection d'origine à la barre
empilée (« elle dit mal LAQUELLE ») tombait avec elle.

**Le bilan ne montre QUE ce que la maquette montre** : le kicker (salle ·
difficulté), le titre, quatre chiffres de table (survie, kills, joueurs,
manche), la ventilation, le tableau à sept colonnes, deux sorties. Trois blocs
en sont sortis, et pour la même raison à chaque fois — ils répondaient à une
question qu'un autre écran traite mieux. Les tuiles **dégâts / dégâts par
seconde / subis** : le tableau les ventile par joueur, où elles se comparent ;
au niveau collectif elles ne disent rien. Le bloc **« ta partie »**
(multiplicateurs, jauge de puissance, compteur de cartes) : la fenêtre de build
répond déjà à « pourquoi ces dégâts-là », et pour **n'importe quel** joueur du
tableau — d'où la phrase sous le titre, qui dit qu'un clic sur une ligne
l'ouvre. Les colonnes **niveau, cartes et cumul de session** : le niveau est
commun à l'équipe, le cumul appartient au salon, et les pastilles de cartes
étaient la version illisible de la fenêtre de build. La classe rejoint le nom
dans la colonne joueur : c'est une identité, pas une mesure.

**Le bilan ne se ferme plus tout seul, et les deux boutons sont sa seule
sortie.** L'échéance de douze secondes a existé, a été retirée, est revenue, et
repart pour de bon — l'aller-retour vaut d'être écrit. L'argument pour : le bilan
est court — quatre chiffres, une ventilation, un tableau — et une table de quatre
n'a pas à attendre celui qui a lâché sa souris. L'argument contre l'emporte : un
écran qui se retire pendant qu'on le lit est un défaut, et le remède — un compte
à rebours affiché, suspendu au premier clic — mettait la lecture **sous
minuterie** pour l'annoncer. On ne lit pas de la même façon quand un chiffre
descend à côté du texte : le défaut qu'on croyait corriger se déplaçait dans
l'œil du lecteur.

Il ne reste **rien** de l'ancien mécanisme : ni minuteur, ni barre qui se vide
(`#bilanBar`), ni ligne d'annonce (`#bilanHint`), ni gestionnaire de clic pour
l'interrompre — les quatre n'existaient que pour lui, et leurs règles CSS partent
avec eux plutôt que d'habiller un markup disparu.

**La fenêtre de build est UN écran pour trois entrées** : Tab en jeu, un clic
sur une ligne du bilan, un clic sur une ligne du salon. Deux fenêtres qui
montrent la même chose auraient divergé au premier réglage, et le panneau
d'inventaire en était déjà la moitié — il ne manquait que la sélection du
joueur, d'où les flèches gauche/droite plutôt qu'une seconde fenêtre. On passe
d'un joueur à l'autre **sans refermer** : refermer et rouvrir pour comparer deux
chargements, c'est perdre le point de comparaison, or comparer est tout ce que
cet écran sert à faire.

**Sa ligne la plus importante est celle des multiplicateurs, pas la liste de
cartes.** « ×2,4 dégâts, ×1,8 cadence » explique le tableau des scores ; la
liste de cartes demande de la reconstituer de tête. Un multiplicateur se lit
« ×1,84 » et non « +84 % » — c'est la forme du tableau qu'on est en train
d'expliquer — et la **cadence s'affiche inversée** parce que la simulation
raisonne en intervalle : sinon ce serait la seule ligne de l'écran où « plus
grand » voudrait dire « pire ».

**Trois sections NOMMÉES** — multiplicateurs, compétences, cartes. C'étaient
trois blocs qui se suivaient sans rien dire : on lisait des puces, des lignes
puis des cartes sans savoir où l'une finissait. Les cartes passent en **deux
colonnes** : une build de quinze cartes se lit alors d'un coup, là où une
colonne obligeait à défiler. Le glyphe de famille a sauté avec elles — à cette
taille il redisait la catégorie que la description donne en toutes lettres, et
il prenait la place qui manquait pour la seconde colonne.

**La TROISIÈME compétence figure toujours, même absente.** Elle n'existe que par
sa carte, et c'est précisément pour ça : la pastille grisée du HUD dit déjà
« il y a quelque chose à obtenir ici », et une fenêtre de build qui n'en
parlerait pas serait le seul endroit du jeu où l'on ne peut pas savoir ce qui
pourrait s'ajouter. Sa description est celle de la **carte tirée** (repérée par
`excl: "skill3"`, marqueur partagé par les trois paliers) : les trois ne disent
pas la même chose, et la recopier ici l'aurait figée au premier réglage.

**Le cyan dit « c'est toi », dans les deux écrans** : le nom en tête de la
fenêtre de build, la colonne score de sa propre ligne au bilan. Ailleurs le nom
porte la teinte de joueur — qui est celle de la classe, donc la même que le
libellé juste dessous : le bandeau était monochrome et le nom ne se détachait
pas.

**La jauge de puissance n'est plus rendue nulle part.** Les deux maquettes —
bilan et build — s'arrêtent aux multiplicateurs, et les deux appels ont disparu.
`powerBlockHtml` reste dans `client.js` avec ses repères : l'indice répond à un
défaut réellement rapporté (« ×1,49 dégâts » sonne bien et vaut une build
faible, d'où « les pourcentages ne fonctionnent pas »), et le remettre est une
ligne dans `renderBuild`. Le supprimer serait une décision de conception, pas un
nettoyage.

**La silhouette a quitté l'en-tête.** Elle répétait ce que le libellé de classe
dit déjà, et elle était la seule pièce de l'écran à demander un canvas et un
repaint à chaque changement de joueur. `paintClassSilhouette` reste : les cartes
de classe du salon s'en servent toujours.

**Le menu pause n'est pas un `.overlay`.** À plusieurs la partie continue
derrière et le voile doit rester translucide pour qu'on la voie ; un panneau
opaque aurait fait croire que tout est arrêté, ce qui est exactement le
malentendu que le libellé (« la partie continue — pause indisponible à
plusieurs », en **ambre**, c'est un avertissement) est là pour éviter.
Ouvrir le menu **arrête le personnage** (`readMove()` sort à vide) : en solo la
prédiction dérivait derrière le voile pour se faire recaler sèchement à la
reprise, et à plusieurs un personnage qui court pendant qu'on règle le volume
est pire encore.

**Ordre des touches : Échap rend d'abord le menu, puis le ferme.** La fenêtre de
build s'ouvre depuis le menu pause, donc son gestionnaire coupe la propagation —
et il la coupe avec **`stopImmediatePropagation`** : les autres gestionnaires de
touches sont posés sur le **même** nœud (`window`), et `stopPropagation` ne
bloque que les nœuds suivants. Le bug a existé : Échap fermait la build et
ouvrait la pause dans la même frappe, si bien que le menu paraissait ne
s'ouvrir qu'une fois sur deux.

**« Suis-je en train d'écrire » est un test, pas un nom de champ** (`enSaisie()`,
point de passage unique des quatre gestionnaires de touches). La garde s'écrivait
`document.activeElement !== nameInput` — **un** champ nommé, le seul qui existât
quand elle a été écrite. La page en porte une dizaine depuis : nom de salle, mot
de passe de salle, mot de passe de compte, ancien et nouveau mot de passe. Dans
tous ceux-là, Espace était mangé par `preventDefault` et déclenchait une esquive
au lieu d'écrire — on ne pouvait donc pas nommer une salle « Vendredi soir » — et
les flèches ne déplaçaient pas le curseur.

**On sort avant `keys.add`, pas seulement avant `preventDefault`.** Le jeu range
les touches enfoncées dans `keys`, d'où il lit le déplacement et les
compétences : taper « q » dans un nom de salle y laissait `KeyQ`, donc une lettre
du nom faisait marcher le personnage et lançait une compétence. L'espace mangé
n'était que la moitié visible du défaut.

**Le test porte sur le TYPE de champ, jamais sur `tagName === "INPUT"`.** Un
`input[type="range"]` est un INPUT, mais Espace et les flèches y sont des
commandes de **jeu** : le menu pause porte deux curseurs de volume, et si l'un
d'eux garde le focus après qu'on a refermé le menu, une garde trop large rendrait
l'esquive muette pour le reste de la manche. On ne s'efface que devant une saisie
de **texte** — et un `type` absent vaut « text », ce qui est le cas de
`#roomName`. Vérifié champ par champ : Espace, flèches, Tab, Échap et les lettres
reviennent aux champs de texte, Espace reste au jeu sur un curseur de volume et
hors de tout champ.

Côté serveur, `sanitizeRoomName()` acceptait les espaces depuis toujours : il
normalise les suites d'espaces en un seul et rogne les bords, il n'en retire
aucun. Le défaut était entièrement dans la saisie.

## Équilibrage

Toute la courbe de pression vit dans `CFG` en haut de `shared/game_state.js` — rien n'est en dur dans la simulation, ce qui permet de comparer des réglages en surchargeant `CFG` depuis un script de mesure sans toucher au code.

Les chiffres de `LISEZMOI.md` (« Mesures relevées », tables de progression, durées de boss) viennent de simulations réelles. **Les remesurer plutôt que les extrapoler** quand un réglage change : plusieurs ajustements de cette base de code se sont révélés contre-intuitifs à la mesure (un buff de dégâts qui divise par trois la durée d'un combat de boss, des élites en probabilité dont le nombre explose en fin de manche).

Pour juger une mécanique de boss, la bonne mesure n'est pas les dégâts infligés mais **l'écart entre un joueur qui lit les annonces et un joueur qui les ignore**. Si l'écart est faible, la mécanique est punitive et non difficile.

**Toute mesure doit préciser son profil de compte** (lot D). Deux références : *compte neuf* — aucune amélioration, aucune carte déverrouillée — et *compte maximal* — tous les emplacements remplis. Un `GameState` sans `meta` est le compte neuf ; l'écart entre les deux est une métrique en soi, attendu **sous 1,5 vague**. S'il dépasse, réduire le **nombre d'emplacements**, jamais les valeurs individuelles.

## Conventions

- **Commentaires et identifiants en français sans accents** (`degats`, `reanimation`, `telegraphiee`). **Chaînes affichées au joueur avec accents** (`"à terre — attends un coéquipier"`). Cette séparation est systématique dans tout le code.
- Les commentaires expliquent **pourquoi**, souvent en documentant ce qui a été essayé et pourquoi ça ne marchait pas. C'est le style dominant du dépôt : le conserver plutôt que de paraphraser le code.
- `LISEZMOI.md` est rédigé pour un lecteur humain qui découvre le projet, avec les mesures à l'appui des choix.
