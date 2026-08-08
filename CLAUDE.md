# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Mini survivor multijoueur LAN. Serveur Node autoritaire, client navigateur, **zéro dépendance** (WebSocket réimplémenté dans `ws_lite.js`). Pas d'étape de build : les modules ES sont servis tels quels au navigateur.

`LISEZMOI.md` est la documentation de référence — elle explique le *pourquoi* de chaque choix d'équilibrage et contient les mesures relevées. À lire avant de toucher aux réglages, et à mettre à jour quand une mesure change.

## Commandes

```bash
npm start                 # lance le serveur sur le port 7777
PORT=8123 node server.js  # autre port
node --check server.js    # vérification syntaxique (pas de linter dans le projet)
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
shared/bosses.js       le roster des 5 boss, le registre des mécaniques, leurs seuils d'effectif
shared/progression.js  la méta : arbres par classe, noyaux, jalons, emplacements (module pur)
progress_store.js      persistance Supabase de la progression — serveur SEUL, mémoire + réplique
shared/units.js        pixels → mètres, le SEUL point de conversion d'affichage
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
public/fonts/          Chakra Petch + Barlow (sous-ensemble latin), versionnées avec le jeu
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
| `#cvUnder` | sol, grille, zones, télégraphes, remparts, tourelles, marqueurs, sillage d'esquive | canvas 2D |
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
de mort. 50 images, 448 × 512 à densité 1 (1,8 Mo), 896 × 1024 à densité 2
(7,0 Mo) — mesuré, pas extrapolé.

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

`shared/cards.js`, `shared/classes.js`, `shared/statuses.js` et
`shared/bosses.js` ne dépendent de **rien** : `game_state.js` les importe,
jamais l'inverse — un cycle d'import casserait le chargement dans le navigateur.
Les constantes de comportement des cartes vivent donc dans `CARD_CFG`, celles
des compétences dans `SKILL_CFG`, celles des états dans `STATUS_CFG`, celles des
boss et de leurs mécaniques dans `BOSS_CFG`, à côté de leur table, et non dans
`CFG`.

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

**Chaque effet dessiné autour d'un personnage occupe une bande de rayon exclusive** (`RING_SHIELD`, `RING_STATUS`, `RING_SKILL`, `RING_BUFF0` dans `client.js`, puis 3,7 m pour les lames orbitales, 8 m pour le givre, 8,5 m pour le rempart). Deux effets au même rayon reviennent à en perdre un : les lames orbitales disparaissaient dans l'anneau du champ de givre, et le joueur ignorait qu'il avait la carte. Les lames se dessinent en **passe séparée, par-dessus tout** (`drawOrbiters`), et le givre est un disque teinté **sans anneau**.

**Les snapshots sont des tableaux positionnels.** On ajoute des champs **à la fin, jamais au milieu**, et le client les lit avec une valeur de repli (`a[16] ?? 0`). Un onglet resté sur une version antérieure continue de fonctionner.

**Les tableaux exportés sont ordonnés et l'index circule sur le réseau** : `POWERUP_TYPES`, `ENEMY_TYPES`, `DIFFICULTIES`, `CLASSES`, `STATUSES`, `BOSS_ROSTER`, `MECHS`. Insérer une entrée au milieu réécrit silencieusement le sens de tous les snapshots.

**Les Jumeaux sont deux entités pour UNE réserve de vie.** `state.boss` reste la source de vérité (PV, barres, phase) ; `state.boss2` n'est qu'un second point d'application. La redirection se fait dans `_damage()`, au point de passage unique, et tout ce qui frappe « le boss » en zone doit passer par `_bossTargets()` — sinon la moitié du combat est invulnérable aux grenades, aux ondes et aux orbiteurs.

**Corollaire : tout retour visuel doit viser l'entité RÉELLEMENT touchée, pas le porteur de la réserve.** `_damage()` relève la cible avant la redirection (`struck`) et `bossDmg` transporte son point d'impact — sans ça le chiffre de dégâts sortait toujours sur le premier Jumeau, y compris quand on tirait sur le second. C'est le piège de tout ce qu'on ajoutera derrière la redirection.

**Une mécanique ratée met à terre, elle ne tue jamais sèchement un joueur à pleine vie.** Le plafond vit dans `_hurt()` derrière le drapeau `mech`, pour la même raison que le multiplicateur de difficulté : une mécanique de plus est couverte sans qu'on y pense. La progression de la sanction est portée par le **cumul de Vulnérabilité** posé par `_mechHit()`, jamais par la valeur brute — c'est le second échec qui tue.

**Les mécaniques de groupe vivent dans une liste unique, `state.marks`.** Elles ont toutes le même cycle (annonce, résolution, disparition) et le client n'a alors qu'une liste à dessiner. Un marqueur dont le porteur se déconnecte ou tombe **se supprime lui-même** : lien orphelin, tour inoccupable, cage sans prisonnier — c'est ce qui empêche une déconnexion de bloquer un combat.

**L'adaptation à l'effectif passe par `adaptMech()`, et par rien d'autre.** Un seuil par mécanique, avec un repli éventuel (`minPlayers`, `fallback`), jamais une variante de combat par effectif : cinq variantes de cinq boss auraient dérivé au premier réglage.

**`POWERUP_ROTATION` dit ce qui tombe, `POWERUP_TYPES` dit ce qui circule.** Une liste d'index et non un préfixe compté : `fragment` (seule la carte Récolte en fait tomber), `purification` (tirée à part par `_randomPowerupType()`, avec un poids qui double quand l'équipe n'a pas de soigneur — le seul bonus du jeu dont le poids dépend de la table) et les quatre doublons de cartes permanentes (`damage`, `rate`, `double`, `pierce`) en sont dehors. **Sortir une entrée de la rotation ne la déplace jamais dans `POWERUP_TYPES`** : c'est l'index qui circule dans le snapshot, et réordonner ferait dessiner la mauvaise icône à un onglet resté sur une version antérieure.

**Le rang d'élite et le marquage de retardataire sont encodés dans le champ de type** (`+100` et `+200`), pour ne pas payer un nombre de plus sur chacun des 200 ennemis, vingt fois par seconde. Côté client : `type = a[5] % 100`, `elite = a[5] % 200 >= 100`, `straggler = a[5] >= 200`. L'ordre du décodage compte — retirer les 200 avant de tester les 100.

**Tout ce qui blesse un joueur passe par `_hurt()`**, et le multiplicateur de difficulté s'applique **là et nulle part ailleurs**. Ne pas le remultiplier aux points d'appel. Une nouvelle attaque est ainsi couverte sans qu'on y pense.

**`_hurt()` prend un SAC D'OPTIONS, pas des booléens positionnels** : `{ ignoreCooldown, fromZone, overTime, mech, src }`. `_hurt(p, d, true, false, false, true)` était illisible au point d'appel — on ne savait plus lequel des `false` était la zone — et le lot A y ajoutait une sixième information. C'est le seul endroit du dépôt où une allocation par appel se justifie : les dégâts **subis** se comptent par dizaines par seconde, là où les dégâts **infligés** passent par `_damage()` et restent en positionnel. Les options d'un échec de mécanique sont écrites **une seule fois** (`MECH_HURT`) : trois appels les passaient à l'identique, et un `mech: true` oublié supprime en silence le plafond « ne tue jamais un joueur à pleine vie ».

**Tout dégât subi porte une PROVENANCE** (`src`, index de `DAMAGE_SOURCES`). Elle est relevée dans `_hurt()` au point de passage unique, après tous les multiplicateurs et après le plafond de mécanique — donc sur le montant qui atteint réellement le joueur, bouclier compris. Deux destinations, deux coûts : `p.lastSrc` traverse le réseau (un nombre par joueur) pour que le chiffre rouge porte son icône, `p.hurtBy` reste dans la simulation et ne sort qu'au bilan. Un appel qui oublie `src` compte en **contact**, le cas majoritaire — jamais en source « inconnue », qui n'apprendrait rien et n'aurait jamais été corrigée. Registre à **cinq** entrées : le « souffle » du plan n'existe pas, la rupture de barre ne blesse plus.

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

**Le briefing de classe retient la VAGUE, pas la simulation** (`state.warmup`, 20 s). Une phase serveur à part avait été essayée et c'était le mauvais découpage : elle figeait `step()`, donc personne ne pouvait bouger, et le bouton « Continuer » — qui ferme le voile pour aller se placer sur la carte — n'avait plus rien à découvrir. La manche démarre donc **tout de suite** ; `step()` tourne, les joueurs se déplacent, visent, testent leurs compétences, et seules **trois** choses sont retenues : `_waveTick()` (ce qui décide d'une vague), `_spawner()` (ce qui en fait sortir les ennemis) et le **tir automatique**. Ce dernier n'est pas un détail de confort : le tir part tout seul, c'est la règle du jeu, donc sans garde le briefing se lisait derrière une arène où quatre joueurs arrosaient le vide en continu. La **recharge**, elle, continue de descendre — on entre en vague l'arme prête, jamais avec un temps mort qu'on n'a pas choisi.

**`this.time` ne court pas non plus pendant l'échauffement.** C'est l'horloge de la manche, celle du bilan et du **classement au temps** du boss final : vingt secondes de promenade comptées comme de la survie rendraient deux parties incomparables, ce que le classement est précisément là pour mesurer. Vérifié : une manche de 15 s après échauffement affiche `00:15`, pas `00:35`.

**Aucun texte du briefing ne voyage sur le réseau.** Nom, teinte, deux compétences avec leurs touches et **mission** vivent dans `CLASSES` (`shared/classes.js`), que le client importe comme le serveur — le message `round` ne porte que `warmup`, la seule chose qu'un client ne peut pas déduire, et elle n'existe qu'à un endroit (`WARMUP_S`). La `mission` ne répète pas `desc` : celle-ci dit ce que la classe **est**, celle-là quoi faire des trente premières secondes. La **troisième compétence est annoncée avec sa touche** bien qu'elle n'existe pas encore : sans cette ligne, la touche 3 se découvre en tirant la carte, c'est-à-dire au milieu d'une vague — le pire moment pour apprendre une commande. Une ligne et non une troisième carte : le kicker dit « tes deux compétences », et une carte de plus ferait croire qu'on l'a déjà.

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

**`_wave(x, y, r, dmg, owner)` est l'onde blanche des cartes ; la gestion de vague s'appelle `_waveTick(dt)`.** Deux méthodes de même nom dans un corps de classe ne sont pas une erreur en JavaScript : la dernière écrase la précédente en silence. Le bug a existé — pulsar, riposte et onde de mort appelaient la gestion de vague avec une abscisse en guise de `dt`.

**Les systèmes lisent `p.mods`, jamais la liste de cartes du joueur.** `_recomputeMods()` rejoue le total depuis zéro à chaque prise — c'est le seul moyen qu'un modificateur ne dérive pas au fil de la manche. Les minuteurs (`p.timers`) vivent à part : un recalcul de mods ne doit pas remettre une recharge à zéro.

**Une famille de cartes occupe les quatre paliers de rareté, et le palier vaut la rareté** (`family` / `tier` dans `cards.js`). Trois règles de tirage indissociables : jamais deux paliers de la même famille dans un même tirage, un palier supérieur possédé retire les inférieurs du pool, et les paliers **se cumulent**. Enlever l'une des trois casse les deux autres — deux paliers offerts ensemble, c'est un choix où une option domine toujours.

**Les légendaires sont garanties à des jalons et plafonnées, jamais laissées au hasard** (`LEGENDARY_WAVES`, `LEGENDARY_MAX`). Le jalon se déclenche au premier écran ouvert **à partir de** la vague seuil, jamais pendant cette vague exactement : une vague sans montée de niveau n'ouvre aucun écran et la garantie sautait. Le compte des jalons honorés vit dans `GameState` (`legendaryWaveDone`) et non dans `cards.js`, qui doit rester une fonction de ses arguments.

**`computeMods()` ne connaît qu'un chargement et qu'un instant.** Ce qui dépend du temps (« Cœur de forge », +5 % par vague) ou des autres joueurs (« Vœu partagé ») est résolu par `_recomputeMods()` côté `GameState`, jamais là-bas — sinon la fonction cesse d'être rejouable telle quelle dans un script de mesure. Corollaire : `_startWave()` rejoue les mods des porteurs de « Cœur de forge », et toute prise de carte rejoue **toute la table** quand un « Vœu partagé » est en jeu.

**`computeMods()` fait deux passes.** `apply(m, n)` d'abord, puis `applyAfter(m, n, ctx)` pour les cartes conditionnelles, dont la valeur dépend du reste du chargement. Une carte conditionnelle évaluée dans la première passe verrait un `mods` à moitié construit : sa valeur dépendrait de l'ordre d'insertion dans la Map, donc de l'ordre dans lequel le joueur a pris ses cartes.

**Le serveur valide aussi les choix de classe** : hors emplacement unique déjà pris, et refusé pendant la manche à laquelle on participe (le verrou est posé au lancement, pas au choix — un spectateur doit pouvoir préparer son entrée). Il est **levé aux deux sorties de manche**, par `unlockClasses()`, point de passage unique appelé avant la diffusion du salon : `startRound()` construit un `new GameState()` à chaque manche, donc les cartes de classe ne survivent pas d'une manche à l'autre et le verrouillage de session ne protégeait plus rien. Les emplacements pris se recalculent depuis les clients **connectés** — rien à défaire au déverrouillage, le tank redevient disponible dès que son porteur en change.

**Le serveur valide qu'une carte choisie figure bien dans les trois offertes à ce joueur pour ce tour de choix.** Sans ça, n'importe quel client s'octroie une légendaire. Les tours s'enchaînent : `resumeRound()` rouvre un écran tant que `state.pendingLevels > 0` au lieu de reprendre la manche.

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

**Le boss passe par `_bossPower()`, les vagues par `_teamPower()` — jamais l'inverse.** Le boss suivait la puissance en linéaire **plein**, donc une durée de combat rigoureusement constante : ×1,00 de sensation de puissance, à chaque combat, pour un écart de build mesuré à **×4,54** (300 manches solo, `powerIndex` relevé à chaque carte ; ×2,93 par la chance seule). Les PV suivent désormais en plein sous `BOSS_POWER_KNEE` (2,5, soit au-dessus de la build médiane mesurée à 2,36, donc l'étalonnage existant est intact) puis n'en prennent plus que `BOSS_POWER_K` (0,50). Un **genou** et non un `Math.min` : un plafond dur crée une falaise où la carte qui fait franchir le seuil ne vaut plus rien. Les structures de mécanique (cage, grappe) passent par le **même** point de passage, sinon une build au-dessus du genou trouve les cages relativement plus dures que le boss. Les vagues gardent leur propre part (`WAVE_HP_POWER_K`, plus généreuse) : la sensation sur le boss doit rester **sous** celle des vagues — c'est le mur de la manche, il récompense moins que la piétaille. `BOSS_POWER_K = 1` rend exactement l'ancienne courbe.

**`powerIndex()` et `bossPower()` sont exportés en fonctions pures**, comme `fullMods` et `effectiveCards` et pour la même raison : la fenêtre de build affiche l'indice de puissance au joueur, et le recoder côté client donnerait deux implémentations qui divergent au premier réglage. `_playerPower()` n'est plus qu'un appel à `powerIndex(p.powerMods ?? p.mods)` — le choix de `powerMods` (méta exclue) reste dans la méthode, pas dans la fonction pure.

**Un multiplicateur affiché sans échelle n'informe personne.** « ×1,49 dégâts » sonne bien et vaut une build faible ; le défaut a été rapporté comme « les pourcentages ne fonctionnent pas ». La fenêtre de build et le bilan situent donc la puissance sur des repères **mesurés** (`POWER_MARKS` dans `client.js`) et affichent le genou. Ce sont des mesures, pas des constantes de réglage : les remesurer si le catalogue ou les raretés bougent.

**L'indexation elle-même reste la règle** : la difficulté suit la puissance réelle de l'équipe et non le temps écoulé. Toute nouvelle source de dégâts permanente doit être prise en compte dans `powerIndex`, sinon le boss redevient une formalité en fin de manche — et toute pénalité qui accompagne un gain doit y figurer aussi : oublier `barrelDamageMul` faisait surestimer la puissance de 44 % et triplait la durée du troisième combat.

**L'indexation porte sur la puissance mesurée, jamais sur la composition de l'équipe.** Ajuster la difficulté selon les rôles présents revient à facturer le soigneur à sa table : celui qui le choisit rend la partie plus dure pour tout le monde, et plus personne ne le choisit.

**La progression est commune à l'équipe** (`state.xp` / `state.level`), et les gains sont **normalisés sur l'effectif** (`joueurs^WAVE_CROWD_EXP`), comme le budget de vague. Une jauge commune à paliers fixes donne quatre fois plus de cartes à quatre joueurs qu'à un seul pour des vagues identiques. Un niveau ne donne **rien** d'autre qu'un choix de carte.

**Une vague se termine quand le budget est épuisé ET l'arène vide.** Le budget se décrémente à l'apparition *réelle* d'un ennemi, jamais à l'échéance du débit : sinon une vague lancée arène pleine (`MAX_ENEMIES`) brûle son budget sans rien faire sortir. Les ennemis hors budget — renforts du boss, nuées des pondeuses — ne décomptent pas mais comptent bien pour « arène vide ».

**Ne jamais écrire dans `ENEMY_TYPES`.** La table est partagée, exportée et lue par le client. Les retardataires copient `standoff` sur l'ennemi (`e.standoff`) au lieu de modifier son type, qui désarmerait les tireurs pour tout le processus.

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

**`state.walls` bloque, il ne blesse pas.** Le verrouillage par quadrant est la seule entité du jeu qui interdit un déplacement ; d'où une couleur franchement différente de tout ce qui explose côté client. On repousse du côté **d'où l'on venait** et non du côté le plus proche : à l'esquive, un joueur traverse 162 px en trois images et se retrouverait de l'autre côté du mur. Le client rejoue exactement la même règle dans sa prédiction.

**Toute chaîne d'effets doit mémoriser ses cibles.** Le ricochet garde un `Set` des ennemis déjà touchés : sans lui, deux voisins se renvoient l'arc indéfiniment.

### Registres partagés serveur ↔ client

Ajouter une entrée impose de traiter les deux côtés :

| Registre | Serveur | Client |
|---|---|---|
| `kind` d'effet | 0 nova · 1 balayage d'arrivée · 2 montée de niveau · 3 ricochet · 4 balise / relèvement / purification / Sentence survécue · 5 élite abattue · 6 barre brisée · 7 explosion · 8 onde blanche · 9 rempart posé · 10 provocation · 11 vague de soin · 12 explosion de bombe · 13 salve verrouillée (transporte deux points de plus, comme le 3) · 14 récolte aboutie | `drawEffects()` |
| point de récolte | clé `hv` du snapshot (jauge en ratio) ; `p.eclats` en fin de tuple joueur | `drawHarvests()` + ligne éclats du bloc méta du HUD |
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
| phase de vague | `wavePhase` : 0 apparition · 1 nettoyage · 2 répit | `updateWave()` dans `hud.js` |
| vague spéciale | `SPECIAL_WAVES` dans `game_state.js` (tableau ordonné, **l'ordre EST la séquence**, l'index circule dans `wsp` et dans le canal d'alerte) | `specialAt()` dans `updateWave()` (`hud.js`) + `applyAlert()` (`client.js`) + `#waveName.special` |
| boss | `BOSS_ROSTER` dans `bosses.js` (tableau ordonné, l'index circule dans `bo[9]`) | `drawBoss*()` (une routine par boss) + `BOSS_SKIN` dans `palette.js` + barre du HUD + annonce d'entrée + `phaseUnlockText()` |
| mécanique | `MECHS` dans `bosses.js` (tableau ordonné, l'index circule dans le canal d'alerte et dans `mk`) | `drawMarks()` + `pushAlert()` |
| classement au temps | `bestFinal` du profil (clé = index de `DIFFICULTIES`), `recordFinal()` dans `progression.js`, message `leaderboard` du hub | `#hubBoard`, `renderBoard()` |
| clé d'attaque de boss | chaînes du `base`/`unlock` d'un boss, dispatchées par `_atk()` | `ATTACK_LABEL` (texte de barre brisée) — **ne circule pas** |
| niveau d'alerte | `ALERT_ORDER` · `ALERT_WARN` · `ALERT_INFO` dans `bosses.js` | `updateAlerts()` dans `hud.js` : consigne cyan avec compte à rebours · avertissement ambre · information blanche |
| type d'événement | rien — déduit des snapshots | `diffSnapshots()` dans `events.js`, consommé par `handleEvent()` |
| image de sprite | rien | `plan()` dans `sprites.js` : `e{type}_{idle,walkA,walkB,open,die0..2}` et `c_{classe}_{idle,move,shoot,down}`, adressées par NOM via `frameOf()` |
| son | rien | `PALETTE` dans `audio.js` + `SOUND_GAIN` (hiérarchie de volume) |
| cible d'un son d'interface | rien | `UI_SOUND_SCREENS` / `UI_SOUND_TARGETS` dans `client.js` — **miroir** de la règle `--cursor-go` de `menus.css`, commentée des deux côtés |
| `kind` d'effet → son | rien | `EFFECT_SOUND` dans `client.js` : son et amplitude de tressaillement par `kind` |
| glyphe posé sur un joueur | `a` / `b` d'une entrée de `state.marks` | `PLAYER_MARK` + `paintMarkGlyph()` |
| effet possédé visible en jeu | rien — déduit de la liste de cartes | `EFFECT_BADGES` dans `client.js` : bande d'effets actifs du HUD |
| façon de mourir d'un type | rien — déduit du type déjà porté par le snapshot | `DEATH_BURST` dans `client.js` : compte, taille, vitesse, durée, halo et ouverture de gerbe |
| pause | message `pause` (client → serveur), `paused` (serveur → tous) ; `setPaused()` est le point de passage unique | `#pause`, `pauseReal`, `renderPauseState()` |
| hub des salles | messages `listRooms` · `createRoom` · `joinRoom` · `leaveRoom` (client → serveur) ; `rooms` · `roomJoined` · `joinRoomError` (motifs `pleine` · `disparue` · `motdepasse` · `plafond`) · `roomClosed` (serveur → client) — routés par `hub.js`, jamais par une salle | `#hubScreen`, `renderRooms()`, `enterHub()`, `inRoom` |
| identité (compte + session) | messages `register` · `login` · `loginToken` · `logout` · `changePass` (client → serveur) ; `register/login/loginToken/…` dans `progress_store.js` ; réponses `welcome{pseudo,token?,dup}` · `authError{motif,fatal?}` · `passChanged` · `loggedOut` ; ni hachage ni mot de passe ne voyagent jamais vers un client | `#gate` (trois modes : reprise / connexion / création), bloc compte du hub, `survivor.token` en localStorage |
| état prêt | message `ready{on}` (client → serveur) ; champ `ready` dans `lobbyPayload().players[]` ; `notReady()` est le point de passage unique, lu par le `case "start"` | `#readyBtn` (+ `.on`), `.teamRow.ready`, `#teamReady`, `#waitMsg` qui nomme qui manque, `#start` désarmé |
| latence | `WsConnection.rtt` (`ws_lite.js`) ; horodatage dans la charge du ping, lu au pong ; `hub.pingAll()` à 1 Hz ; champ `ping` dans `lobbyPayload().players[]`, `-1` si inconnu | `.teamPing`, tiret quand inconnu |
| historique des manches | `room.history` (`{at, diffIndex, wave}`, plafonné à `ROUND_HISTORY_MAX`), rempli par `recordRound()` aux DEUX sorties de manche ; champ `history` dans `lobbyPayload()`, plus récent en tête | `renderHistory()` → `#historyList .histRow` (`.histWhen` · `.histLabel` · `.histWave`) |
| sortie de manche | message `leaveRound` : `removePlayer` + spectateur jusqu'à la manche suivante | bouton du menu pause, avec confirmation |
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

Six de ces registres sont **purement clients** — image de sprite, son, `kind`
d'effet → son, glyphe posé sur un joueur, effet possédé visible en jeu, façon de
mourir d'un type — auxquels s'ajoute la **catégorie de carte** : un son, un
glyphe, une icône d'effet et une image de sprite ne traversent pas le réseau, ils
se déduisent de ce que le snapshot — ou la liste de cartes, déjà diffusée — dit
déjà. Une nouvelle mécanique ne demande donc pas d'ajouter un message : seulement
une entrée dans `MECHS` et, si elle marque un joueur, une entrée dans
`PLAYER_MARK`.

**Les cinq types ne mouraient pas différemment**, et c'est ce que `DEATH_BURST`
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

Les clés de vague et de progression (`wv`, `wp`, `wbs`, `wb`, `xl`, `xp`), les quatre listes de compétence (`bw` remparts, `bm` bombes, `an` ancres et `sa` sanctuaires du lot C), celles du lot 4 (`mk` marqueurs de mécanique, `bo2` second Jumeau, `sp` sol glissant), celles du lot 5 (`bn` limites d'arène et palier annoncé, `wl` murs de verrouillage) celle du lot 6 (`bd` dégâts portés au boss depuis le dernier instantané, par joueur) celle du lot I (`hv` points de récolte, jauge en ratio) et celle du lot L (`wsp` index de la vague spéciale en cours, **absente** les seize vagues sur vingt où il n'y a rien à dire — même raison que `bn` et `wl`) sont des **clés nommées** du snapshot, pas des éléments de tableau : la règle positionnelle ne vaut qu'à l'intérieur des tableaux, et une clé inconnue est simplement ignorée par un client plus ancien. `bn` et `wl` sont **absentes** tant que l'arène ne bouge pas — depuis le lot I, `bn` est en revanche **toujours présente pendant un combat de boss**, dont l'arène est une vue resserrée. Le lot I ajoute aussi les **éclats** en fin de tuple joueur (index 32).

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
cinq types, c'était trente valeurs à garder cohérentes.

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

**Échelle typographique fixe : 11 / 13 / 15 / 19 / 26 / 34 / 46.** Aucune valeur
ad hoc. Le HUD est en DOM et la respecte entièrement. Quatre **planchers** ne se
descendent pas, ce sont les quatre choses qu'on lit en combat sans avoir le
temps de les chercher : PV 15 px, touches 13 px gras, noms d'équipe 13 px,
chronomètre 26 px. Ce sont des pixels CSS, donc la même taille quelle que soit
la fenêtre — c'est tout l'intérêt d'avoir sorti le HUD du canvas.

**Espacement sur une grille de 4 px** : 4 / 8 / 12 / 16 / 24 / 32 / 48, sans
exception.

**Les angles sont durs** : rayon de bordure à 2 px maximum, coupes en biseau
plutôt qu'arrondis. **Le seul cercle du jeu est une entité vivante** — un bouton
arrondi lui volerait ce signe.

**Une exception, bornée aux MENUS** (`menus.css`) : `--radius-ui: 14px` pour les
panneaux et les cartes, `--radius-ctl: 10px` pour les champs et les boutons. La
règle des angles durs sert la lisibilité **à un dixième de seconde** — c'est
l'arène et le HUD, où une forme mal lue coûte une mort. Hors combat on a le
temps, et un rayon franc sépare visiblement le poste de contrôle du jeu
lui-même. Ne pas l'étendre : `#cards`, `#build`, `#pause`, `#hud` et
`admin.html` gardent 2 px, et si l'un d'eux change d'aspect c'est qu'une règle
de `menus.css` fuit. Le **biseau** (`--bevel`) reste sur la SEULE action
principale de chaque écran — c'est ce qui la désigne, et il perd ce rôle s'il
est partout.

**Une exception à l'exception : `#bilanGo` n'a pas de biseau**, et c'est le
`clip-path` qui l'impose. Il clippe aussi la **lueur** — le bouton déclarait un
halo qu'il ne montrait nulle part — et une coupe de 10 px dans un rayon de 12 ne
fait pas un biseau mais une **entaille**. Sur cet écran c'est donc la lueur qui
désigne l'action, et elle le fait mieux puisqu'on la voit. Toute action
principale qui porte à la fois `--bevel` et `--glow-go` a le même arbitrage à
faire : les deux ne coexistent pas.

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
titres, les boutons et les noms propres ; `--font-body` (Barlow 400) porte les
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

**Trois niveaux de lecture, et un élément n'en porte qu'UN.** Le **kicker**
(`.sectionTitle`, chasse fixe, capitales espacées, 11 px, `--go`) dit *où je
suis* ; le **titre d'écran** (Chakra Petch, 34 px, `--text`, casse normale) dit
*quoi* ; le **corps** (Barlow, 15 px, interligne 1,7, `--text-dim`, mesure
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

**Rien de décoratif ne se superpose au jeu.** Tout ornement — balayage des
légendaires, logotype — vit dans les écrans hors combat. Les transitions entre
écrans sont des **fondus**, jamais des glissements. La grille et le
vignettage de l'arène font exception et n'en sont pas une : ce ne sont pas des
ornements mais le **sol**, gradué en mètres (5 m fin, 20 m marqué) pour que les
distances des descriptions de cartes veuillent dire quelque chose à l'écran. Le
sol brille brièvement dans le rayon d'une explosion — un écran de mesure réagit
à ce qu'il mesure, et le seuil est celui du tressaillement, jamais l'impact
ordinaire.

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

**Le bilan titre sur la VAGUE atteinte, pas sur le numéro de manche.** `roundNumber`
s'incrémentait correctement — ce n'était jamais un bug de compteur — mais l'unité
de jeu est devenue la vague, et « Manche 1 terminée » après douze vagues se lit
comme un compteur cassé. Le numéro de manche descend avec les autres chiffres.
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

**Le salon s'ouvre tout seul au bout de 12 s, et c'est un retour en arrière
assumé.** L'échéance avait été retirée parce que le bilan portait alors la
build et la jauge de puissance — « de quoi passer une minute dessus », et un
écran qui se retire pendant qu'on le lit est un défaut. Le bilan étant revenu à
quelques secondes de lecture, l'échéance redevient juste. Un **clic n'importe
où dans le bilan la suspend** : celui qui lit encore n'a rien à faire pour qu'on
l'attende, celui qui ne fait rien passe au salon — les deux comportements sans
bouton de plus.

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
