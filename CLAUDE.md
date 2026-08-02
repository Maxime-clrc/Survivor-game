# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Mini survivor multijoueur LAN. Serveur Node autoritaire, client navigateur, **zéro dépendance** (WebSocket réimplémenté dans `ws_lite.js`). Pas d'étape de build : les modules ES sont servis tels quels au navigateur.

`LISEZMOI.md` est la documentation de référence — elle explique le *pourquoi* de chaque choix d'équilibrage et contient les mesures relevées. À lire avant de toucher aux réglages, et à mettre à jour quand une mesure change.

## Commandes

```bash
npm start                 # lance le serveur sur le port 8080
PORT=8123 node server.js  # autre port
node --check server.js    # vérification syntaxique (pas de linter dans le projet)
```

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
server.js              HTTP + WebSocket + boucle autoritaire 60 Hz, snapshots 20 Hz
ws_lite.js             WebSocket minimal (RFC 6455) — pas de TLS, pas de compression
shared/game_state.js   LOGIQUE PURE — importée telle quelle par le serveur ET le navigateur
shared/cards.js        les cartes, les raretés, le tirage, le calcul des mods
shared/classes.js      les 3 classes, les constantes de compétence (module pur, comme cards.js)
shared/statuses.js     les 4 états, la priorité de purge, les états posés par les élites
shared/bosses.js       le roster des 5 boss, le registre des mécaniques, leurs seuils d'effectif
shared/units.js        pixels → mètres, le SEUL point de conversion d'affichage
shared/palette.js      LA CHARTE — couleurs, rampes, échelle typo, lues par le canvas ET le DOM
public/client.js       saisie, interpolation, prédiction, rendu du MONDE
public/sprites.js      atlas généré au chargement + `drawSprite`, LE point de passage d'entité
public/gl.js           batcher de quads WebGL2 — ne connaît ni le jeu ni l'atlas
public/hud.js          le HUD, en DOM : la couche ÉCRAN
public/icons.js        glyphes de bonus, d'effets et d'états — dessinés dans l'arène ET dans le HUD
public/events.js       diffusion des snapshots en événements typés (module pur)
public/audio.js        synthèse WebAudio, palette sonore, limitation de voix, réglages
public/index.html      page, chargement, salon, bilan, cartes, ossature du HUD
public/css/tokens.css  espacement, géométrie, mouvement (aucune couleur, cf. charte)
public/css/ui.css      les écrans hors combat
public/css/hud.css     la couche écran pendant la manche
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
monde restent en 1600 × 900 — la transformation absorbe tout, et pas une ligne
de logique de rendu ne change. Corollaire : la souris se convertit vers les
**coordonnées monde** (`CFG.ARENA_W / rect.width`), jamais vers `cv.width`.

**Le monde tient sur TROIS canvas empilés** (`#arena` dans `index.html`), et
c'est la bascule WebGL qui l'impose : deux éléments empilés se composent
strictement l'un sur l'autre, donc *tout* le canvas 2D passerait au-dessus de
*tout* le WebGL. Or l'ordre de dessin intercale du 2D avant **et** après les
entités.

| canvas | contenu | technologie |
|---|---|---|
| `#cvUnder` | sol, grille, zones, télégraphes, remparts, tourelles, projectiles, marqueurs, sillage d'esquive | canvas 2D |
| `#cvGl` | **entités** : monstres, joueurs, dépouilles, particules | WebGL2 (`gl.js`), vide en repli |
| `#cv` | boss, drones, anneaux de joueur, barres, noms, lames orbitales, murs, vignettage | canvas 2D |

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
de mort. 48 images, 448 × 448 à densité 1 (1,5 Mo), 896 × 896 à densité 2
(6,1 Mo).

**Chaque case est entourée d'une gouttière transparente de 2 px** (`PAD` /
`PITCH` dans `sprites.js`). Invisible en canvas 2D — un `drawImage` lit
exactement le rectangle demandé — mais **systématique** en WebGL : le filtrage
linéaire va chercher les texels voisins au bord du rectangle source et ramène
des franges de l'image d'à côté. `cellRect()` est le point de passage unique de
la lecture de l'atlas : le chemin 2D et le chemin WebGL lisent la même formule.

**La 48ᵉ case est un carré blanc uni** (`fx_white`). Ce n'est pas un sprite au
sens de la recette : c'est ce qui fait passer les **particules** par le même lot
que les entités. Sans elle il faudrait un second chemin de rendu — un tampon à
part, un shader à part — pour dessiner des carrés.

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

**Le boss n'est pas dans l'atlas** : il est unique à l'écran, son coût est
négligeable, et il gagne à être animé en continu au tracé.

`shared/cards.js`, `shared/classes.js`, `shared/statuses.js` et
`shared/bosses.js` ne dépendent de **rien** : `game_state.js` les importe,
jamais l'inverse — un cycle d'import casserait le chargement dans le navigateur.
Les constantes de comportement des cartes vivent donc dans `CARD_CFG`, celles
des compétences dans `SKILL_CFG`, celles des états dans `STATUS_CFG`, celles des
boss et de leurs mécaniques dans `BOSS_CFG`, à côté de leur table, et non dans
`CFG`.

Un seul port sert les fichiers **et** les WebSocket. `resolvePath()` dans `server.js` route `/shared/*` depuis la racine du dépôt et tout le reste depuis `public/` — c'est ce qui permet au navigateur d'importer le même module que le serveur.

**`shared/game_state.js` ne doit jamais référencer le DOM, le canvas, le clavier ou le réseau.** C'est l'invariant qui tient tout le reste : le serveur en fait la source de vérité, le client s'en sert pour connaître les constantes et prédire ses propres mouvements.

### Serveur autoritaire

Les clients n'envoient que des intentions (deux directions, la distance au réticule, un drapeau d'esquive) à 30 Hz. Ils ne décident jamais de leur position, des dégâts, des morts, du score ni de la cible touchée. Les vecteurs reçus sont renormalisés côté serveur.

**`ar`, la distance au réticule, est un état CONTINU comme `ax`/`ay`** — il n'est pas remis à zéro après le tick, contrairement à `d`, `s1` et `s2`. Il décrit une position, pas une demande : le vider ferait perdre la visée entre deux paquets. `bombRange()` dans `classes.js` est son point de passage unique, appelé côté serveur **et** dans `game_state.js` (qui doit rester jouable seul dans un script de mesure). Une valeur absente, négative ou aberrante retombe sur la portée **maximale** et non sur zéro : un client antérieur, qui n'envoie pas `ar`, lance donc exactement comme avant.

Le drapeau d'esquive (`d:1`) est *ponctuel* : la boucle de simulation le remet à zéro après chaque tick (`server.js`). Sans ça, une demande resterait levée et l'esquive repartirait toute seule à chaque fin de recharge. **`s1` et `s2` (les deux compétences de classe) suivent exactement le même modèle** — même remise à zéro, même raison.

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
sous la translation du tressaillement, `drawHud()` en dehors. Tout dans la même
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

**Les marqueurs posés sur un joueur sont des glyphes distincts en silhouette**,
jamais différenciés par la seule couleur : un daltonien doit s'en sortir, et de
toute façon la couleur se noie dans le chaos. La couleur ne fait que confirmer
ce que la forme dit déjà.

**Le bandeau d'alerte disparaît AVANT la résolution de la mécanique** (durée
d'annonce moins 250 ms). Un texte encore affiché au moment de l'impact masque
exactement ce qu'il faut regarder.

## Invariants à ne pas casser

**Les distances s'affichent en mètres, la simulation reste en pixels.** `shared/units.js` (`PX_PER_M = 20`, `toM`, `fmtM`) est le seul point de conversion, et il ne sert **qu'à écrire un texte destiné à un joueur** : descriptions de `cards.js`, `classes.js` et `bosses.js`, libellés du salon, écran de cartes, écran de fin. Le pixel n'est pas une unité de jeu — il dépend de la résolution et ne se compare à rien. **Ne jamais convertir** une constante de `CFG`, `CARD_CFG`, `SKILL_CFG`, `STATUS_CFG` ou `BOSS_CFG`, ni les commentaires techniques, ni les mesures du `LISEZMOI` : ce sont des valeurs de simulation, et une conversion appliquée là casserait tout l'équilibrage d'un coup. Une description qui cite un rayon compose `fmtM(LA_CONSTANTE)` plutôt que de recopier un nombre — un texte qui recopie une constante ment dès le premier réglage.

**Chaque effet dessiné autour d'un personnage occupe une bande de rayon exclusive** (`RING_SHIELD`, `RING_STATUS`, `RING_SKILL`, `RING_BUFF0` dans `client.js`, puis 3,7 m pour les lames orbitales, 8 m pour le givre, 8,5 m pour le rempart). Deux effets au même rayon reviennent à en perdre un : les lames orbitales disparaissaient dans l'anneau du champ de givre, et le joueur ignorait qu'il avait la carte. Les lames se dessinent en **passe séparée, par-dessus tout** (`drawOrbiters`), et le givre est un disque teinté **sans anneau**.

**Les snapshots sont des tableaux positionnels.** On ajoute des champs **à la fin, jamais au milieu**, et le client les lit avec une valeur de repli (`a[16] ?? 0`). Un onglet resté sur une version antérieure continue de fonctionner.

**Les tableaux exportés sont ordonnés et l'index circule sur le réseau** : `POWERUP_TYPES`, `ENEMY_TYPES`, `DIFFICULTIES`, `CLASSES`, `STATUSES`, `BOSS_ROSTER`, `MECHS`. Insérer une entrée au milieu réécrit silencieusement le sens de tous les snapshots.

**Les Jumeaux sont deux entités pour UNE réserve de vie.** `state.boss` reste la source de vérité (PV, barres, phase) ; `state.boss2` n'est qu'un second point d'application. La redirection se fait dans `_damage()`, au point de passage unique, et tout ce qui frappe « le boss » en zone doit passer par `_bossTargets()` — sinon la moitié du combat est invulnérable aux grenades, aux ondes et aux orbiteurs.

**Une mécanique ratée met à terre, elle ne tue jamais sèchement un joueur à pleine vie.** Le plafond vit dans `_hurt()` derrière le drapeau `mech`, pour la même raison que le multiplicateur de difficulté : une mécanique de plus est couverte sans qu'on y pense. La progression de la sanction est portée par le **cumul de Vulnérabilité** posé par `_mechHit()`, jamais par la valeur brute — c'est le second échec qui tue.

**Les mécaniques de groupe vivent dans une liste unique, `state.marks`.** Elles ont toutes le même cycle (annonce, résolution, disparition) et le client n'a alors qu'une liste à dessiner. Un marqueur dont le porteur se déconnecte ou tombe **se supprime lui-même** : lien orphelin, tour inoccupable, cage sans prisonnier — c'est ce qui empêche une déconnexion de bloquer un combat.

**L'adaptation à l'effectif passe par `adaptMech()`, et par rien d'autre.** Un seuil par mécanique, avec un repli éventuel (`minPlayers`, `fallback`), jamais une variante de combat par effectif : cinq variantes de cinq boss auraient dérivé au premier réglage.

**`POWERUP_ROTATION` dit ce qui tombe, `POWERUP_TYPES` dit ce qui circule.** Une liste d'index et non un préfixe compté : `fragment` (seule la carte Récolte en fait tomber), `purification` (tirée à part par `_randomPowerupType()`, avec un poids qui double quand l'équipe n'a pas de soigneur — le seul bonus du jeu dont le poids dépend de la table) et les quatre doublons de cartes permanentes (`damage`, `rate`, `double`, `pierce`) en sont dehors. **Sortir une entrée de la rotation ne la déplace jamais dans `POWERUP_TYPES`** : c'est l'index qui circule dans le snapshot, et réordonner ferait dessiner la mauvaise icône à un onglet resté sur une version antérieure.

**Le rang d'élite et le marquage de retardataire sont encodés dans le champ de type** (`+100` et `+200`), pour ne pas payer un nombre de plus sur chacun des 200 ennemis, vingt fois par seconde. Côté client : `type = a[5] % 100`, `elite = a[5] % 200 >= 100`, `straggler = a[5] >= 200`. L'ordre du décodage compte — retirer les 200 avant de tester les 100.

**Tout ce qui blesse un joueur passe par `_hurt()`**, et le multiplicateur de difficulté s'applique **là et nulle part ailleurs**. Ne pas le remultiplier aux points d'appel. Une nouvelle attaque est ainsi couverte sans qu'on y pense.

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

**Les PV du boss ET la pression des vagues sont indexés sur `_teamPower()`**, pour que la difficulté suive la puissance réelle de l'équipe et non le temps écoulé. Toute nouvelle source de dégâts permanente doit être prise en compte dans `_playerPower`, sinon le boss redevient une formalité en fin de manche — et toute pénalité qui accompagne un gain doit y figurer aussi : oublier `barrelDamageMul` faisait surestimer la puissance de 44 % et triplait la durée du troisième combat.

**L'indexation porte sur la puissance mesurée, jamais sur la composition de l'équipe.** Ajuster la difficulté selon les rôles présents revient à facturer le soigneur à sa table : celui qui le choisit rend la partie plus dure pour tout le monde, et plus personne ne le choisit.

**La progression est commune à l'équipe** (`state.xp` / `state.level`), et les gains sont **normalisés sur l'effectif** (`joueurs^WAVE_CROWD_EXP`), comme le budget de vague. Une jauge commune à paliers fixes donne quatre fois plus de cartes à quatre joueurs qu'à un seul pour des vagues identiques. Un niveau ne donne **rien** d'autre qu'un choix de carte.

**Une vague se termine quand le budget est épuisé ET l'arène vide.** Le budget se décrémente à l'apparition *réelle* d'un ennemi, jamais à l'échéance du débit : sinon une vague lancée arène pleine (`MAX_ENEMIES`) brûle son budget sans rien faire sortir. Les ennemis hors budget — renforts du boss, nuées des pondeuses — ne décomptent pas mais comptent bien pour « arène vide ».

**Ne jamais écrire dans `ENEMY_TYPES`.** La table est partagée, exportée et lue par le client. Les retardataires copient `standoff` sur l'ennemi (`e.standoff`) au lieu de modifier son type, qui désarmerait les tireurs pour tout le processus.

**Les zones de dégâts sont pleines ; les retraits sont purement visuels.** Les cases du damier se touchent exactement — le jeu de quelques pixels qu'on met d'ordinaire pour la lisibilité créait une ligne parfaitement sûre sur toute la hauteur de l'arène. L'inset se fait dans `zonePath()` côté client.

**`ZONE_FORGIVE` : la zone *affichée* est plus grande que la zone qui blesse, de 10 %.** Écart affichage/logique **assumé**, pas un bug — le client affiche avec 110 ms de retard sur l'état serveur, donc un joueur qui sort à l'image exacte où la zone explose *sur son écran* était encore dedans côté serveur. Toutes les mesures de `_zoneHits()` sont rétrécies d'autant, et le sens s'inverse pour ce qui **épargne** (trou de l'anneau, secteur sûr du Pac-Man), qui s'élargit : la tolérance doit toujours pardonner dans le même sens. L'alternative exacte — résoudre contre la position d'il y a `INTERP_MS` — demanderait un historique de positions pour tous les joueurs en permanence, alors qu'on ne le paie aujourd'hui que pour les appâts du Métronome.

**Une zone persistante inflige `dot` dégâts par seconde par paliers de `ZONE_TICK`, jamais à chaque image**, et le tic passe `overTime = true` à `_hurt()` — même raison que la brûlure : sans ce drapeau, une mare de quinze secondes remet `hitCd` à 0,55 s quatre fois par seconde et rend sa victime immunisée au contact, aux tirs et aux autres zones. On mourait en sécurité dans une flaque.

**`state.bounds` est la surface jouable ; tout ce qui borne un déplacement la lit, jamais `CFG.ARENA_W/H` en dur.** C'est le principal risque de régression de la constriction : un seul oubli laisse un joueur, un boss, une tour ou un bonus dans la couronne mortelle sans moyen d'en sortir. `_clampToBounds()` et `_dropPoint()` sont les points de passage uniques. Gardent volontairement l'arène pleine : l'apparition des ennemis (la horde traverse la couronne, c'est l'interaction recherchée), le vol des projectiles (une balle qui rebondit sur une limite invisible ne se lit pas) et la **géométrie** des zones (damier, couloirs, balayage — redécouper la grille à chaque palier changerait la taille des cases en plein combat).

**`state.walls` bloque, il ne blesse pas.** Le verrouillage par quadrant est la seule entité du jeu qui interdit un déplacement ; d'où une couleur franchement différente de tout ce qui explose côté client. On repousse du côté **d'où l'on venait** et non du côté le plus proche : à l'esquive, un joueur traverse 162 px en trois images et se retrouverait de l'autre côté du mur. Le client rejoue exactement la même règle dans sa prédiction.

**Toute chaîne d'effets doit mémoriser ses cibles.** Le ricochet garde un `Set` des ennemis déjà touchés : sans lui, deux voisins se renvoient l'arc indéfiniment.

### Registres partagés serveur ↔ client

Ajouter une entrée impose de traiter les deux côtés :

| Registre | Serveur | Client |
|---|---|---|
| `kind` d'effet | 0 nova · 1 balayage d'arrivée · 2 montée de niveau · 3 ricochet · 4 balise / relèvement / purification / Sentence survécue · 5 élite abattue · 6 barre brisée · 7 explosion · 8 onde blanche · 9 rempart posé · 10 provocation · 11 vague de soin · 12 explosion de bombe | `drawEffects()` |
| classe | `CLASSES` dans `classes.js` (tableau ordonné, l'index circule) | sélecteur du salon + `drawSkillPip()` |
| bits de compétence | `SKILL_HEAL_MODE` · `SKILL_TAUNT` · `SKILL_OVERDRIVE` (masque) | teinte du joueur, halos, icônes |
| états | `STATUSES` dans `statuses.js` (tableau ordonné, l'index sert de bit dans `stMask`) | `STATUS_ICON` + halo joueur + cadre d'équipe |
| `shape` de zone | 0 disque · 1 rectangle orienté · 2 anneau · 3 cône · 4 Pac-Man · 5 croix | `zonePath()` / `zoneSubPath()` + `_zoneHits()` |
| bits de buff | `BUFF_DAMAGE` … `BUFF_RICOCHET` (masque) | anneaux joueur + bandeau HUD |
| bonus | `_applyPowerup()` | `POWERUP_ICON` + `POWERUP_STYLE` |
| clés de `mods` liées aux états | `statusTimeMul`, `catalyseur` dans `cards.js` | rien |
| clés de `mods` | `defaultMods()` dans `cards.js`, lues par la simulation | rien — les effets ne traversent pas le réseau |
| tags de carte | `tags` dans la table de `cards.js` (`off`, `def`, `coop`, `cadence`) | rien |
| phase de vague | `wavePhase` : 0 apparition · 1 nettoyage · 2 répit | `drawWaveBanner()` |
| boss | `BOSS_ROSTER` dans `bosses.js` (tableau ordonné, l'index circule dans `bo[9]`) | `drawBoss*()` (une routine par boss) + `BOSS_SKIN` dans `palette.js` + barre du HUD + annonce d'entrée + `phaseUnlockText()` |
| mécanique | `MECHS` dans `bosses.js` (tableau ordonné, l'index circule dans le canal d'alerte et dans `mk`) | `drawMarks()` + `pushAlert()` |
| clé d'attaque de boss | chaînes du `base`/`unlock` d'un boss, dispatchées par `_atk()` | `ATTACK_LABEL` (texte de barre brisée) — **ne circule pas** |
| niveau d'alerte | `ALERT_ORDER` · `ALERT_WARN` · `ALERT_INFO` dans `bosses.js` | `drawAlerts()` : consigne cyan avec compte à rebours · avertissement ambre · information blanche |
| type d'événement | rien — déduit des snapshots | `diffSnapshots()` dans `events.js`, consommé par `handleEvent()` |
| image de sprite | rien | `plan()` dans `sprites.js` : `e{type}_{idle,walkA,walkB,open,die0..2}` et `c_{classe}_{idle,move,shoot,down}`, adressées par NOM via `frameOf()` |
| son | rien | `PALETTE` dans `audio.js` + `SOUND_GAIN` (hiérarchie de volume) |
| `kind` d'effet → son | rien | `EFFECT_SOUND` dans `client.js` : son et amplitude de tressaillement par `kind` |
| glyphe posé sur un joueur | `a` / `b` d'une entrée de `state.marks` | `PLAYER_MARK` + `paintMarkGlyph()` |
| effet possédé visible en jeu | rien — déduit de la liste de cartes | `EFFECT_BADGES` dans `client.js` : bande d'effets actifs du HUD |
| pause | message `pause` (client → serveur), `paused` (serveur → tous) ; `setPaused()` est le point de passage unique | `#pause`, `pauseReal`, `renderPauseState()` |
| sortie de manche | message `leaveRound` : `removePlayer` + spectateur jusqu'à la manche suivante | bouton du menu pause, avec confirmation |
| transition de manche | messages `round` · `roundAbort` · `roundEnd` · `cards` · `cardsWait` | `pushWorld()` / `worldQueue` — jamais appliqués à la réception |
| part critique des dégâts | troisième élément d'un tuple `bd`, ajouté **en fin** | `pushDamage()` → classe `.dmg.crit` (ambre, un cran plus gros) |

Les cinq derniers registres sont **purement clients** : un son, un glyphe, une
icône d'effet et une image de sprite ne traversent pas le réseau, ils se
déduisent de ce que le snapshot — ou la liste de cartes, déjà diffusée — dit
déjà. Une nouvelle mécanique ne demande donc pas d'ajouter un message :
seulement une entrée dans `MECHS` et, si elle marque un joueur, une entrée dans
`PLAYER_MARK`.

**Le retour d'impact, lui, n'est PLUS déduit** : il l'était, et c'était le
défaut. Voir `hitSeq` dans les invariants — un différentiel de PV échantillonné
à 20 Hz est structurellement lacunaire, et le coup fatal n'y apparaissait pas du
tout.

**Trois informations d'affichage sont DÉDUITES et non transmises**, pour la même
raison à chaque fois : un champ de plus sur 200 ennemis ou 400 balles, vingt
fois par seconde, coûte plus que la déduction.

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

Les clés de vague et de progression (`wv`, `wp`, `wbs`, `wb`, `xl`, `xp`), les deux listes de compétence (`bw` remparts, `bm` bombes), celles du lot 4 (`mk` marqueurs de mécanique, `bo2` second Jumeau, `sp` sol glissant), celles du lot 5 (`bn` limites d'arène et palier annoncé, `wl` murs de verrouillage) et celle du lot 6 (`bd` dégâts portés au boss depuis le dernier instantané, par joueur) sont des **clés nommées** du snapshot, pas des éléments de tableau : la règle positionnelle ne vaut qu'à l'intérieur des tableaux, et une clé inconnue est simplement ignorée par un client plus ancien. `bn` et `wl` sont **absentes** tant que l'arène ne bouge pas, c'est-à-dire quatre-vingt-dix pour cent d'une manche.

**Les zéros de queue des tuples de zone et d'ennemi sont coupés** (`trimTail` dans `snapshot()`). La règle positionnelle interdit de *déplacer* un champ, pas d'en *omettre* à la fin : le client lit déjà tout ce qui suit l'index 6 avec un repli (`a[7] ?? 0`), le mécanisme même qui empêche un onglet resté sur une version antérieure de planter. Un tuple de zone en compte quinze et la plupart des formes n'en remplissent que douze ; un tuple d'ennemi en compte huit et son huitième champ — le compteur de touches — vaut zéro tant que rien ne l'a touché. Le `keep` d'un ennemi vaut **7 et non 6** : le client lit `a[6]` (l'orientation) sans valeur de repli, et une orientation nulle est parfaitement ordinaire.

**Deux ajouts en fin de tuple sur ce lot** : `hitSeq` sur l'ennemi (index 7) et les **dégâts cumulés** sur le joueur (index 28). Le second est le seul chiffre de la fenêtre de build que le client ne peut pas déduire, pour la même raison que `bd` — les projectiles ne portent pas leur propriétaire. Quatre nombres par instantané là où la liste d'ennemis en compte seize cents, et sans lui la fenêtre affichait un tiret au moment précis où l'on veut comprendre qui porte l'équipe.

**`bd` est le seul chiffre que le client ne peut pas déduire.** Les projectiles
ne transportent pas leur propriétaire — un identifiant de plus sur chacune des
quatre cents balles en vol, vingt fois par seconde — donc personne ne peut
savoir localement quels dégâts sont les siens. `_damage()` cumule dans
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

**Une teinte par type, et cinq valeurs dérivées** (`ramp()` dans `palette.js`) :
ombre, base, lumière, accent, contour. Le **décalage de teinte** dans l'ombre et
la lumière, plutôt qu'un simple assombrissement, est ce qui distingue une
palette dessinée d'un dégradé mécanique. Écrire les cinq à la main pour cinq
types, c'était vingt-cinq valeurs à garder cohérentes.

**La recette en six couches est appliquée uniformément** : silhouette, ombrage
décalé et écrêté, lumière en arc haut-gauche, contour, accents, asymétrie du
même côté à chaque image. Si un type demande un traitement particulier, c'est le
**type** qu'il faut revoir, pas la recette — un style n'est tenable que s'il se
répète à l'identique sur tout le jeu.

**La forme dit la classe, la couleur dit le joueur.** Les quatre couleurs de
joueur sont déjà prises par l'identité individuelle : faire porter la classe par
la couleur rendrait soit deux tanks identiques, soit deux joueurs confondus. Les
sprites de classe sont donc cuits dans une rampe neutre et teintés à la volée.
Le mode soin est la seule exception, et c'est voulu — c'est une information
tactique pour toute l'équipe.

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

**Rien de décoratif ne se superpose au jeu.** Tout ornement — balayage des
légendaires, logotype — vit dans les écrans hors combat. Les transitions entre
écrans sont des **fondus de 120 ms**, jamais des glissements. La grille et le
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

**Sur l'écran de cartes, l'effet est la ligne la plus grosse, pas le nom.** C'est
ce qu'on compare en trente secondes ; le nom ne sert qu'à reconnaître la carte
une fois prise. Une icône par **famille** et non par carte : cinq glyphes
s'apprennent, soixante ne se lisent jamais.

**Le bilan de fin de manche et le salon sont deux écrans.** Tant que le salon
suivant était affiché dessous, personne ne lisait son bilan.

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

## Équilibrage

Toute la courbe de pression vit dans `CFG` en haut de `shared/game_state.js` — rien n'est en dur dans la simulation, ce qui permet de comparer des réglages en surchargeant `CFG` depuis un script de mesure sans toucher au code.

Les chiffres de `LISEZMOI.md` (« Mesures relevées », tables de progression, durées de boss) viennent de simulations réelles. **Les remesurer plutôt que les extrapoler** quand un réglage change : plusieurs ajustements de cette base de code se sont révélés contre-intuitifs à la mesure (un buff de dégâts qui divise par trois la durée d'un combat de boss, des élites en probabilité dont le nombre explose en fin de manche).

Pour juger une mécanique de boss, la bonne mesure n'est pas les dégâts infligés mais **l'écart entre un joueur qui lit les annonces et un joueur qui les ignore**. Si l'écart est faible, la mécanique est punitive et non difficile.

## Conventions

- **Commentaires et identifiants en français sans accents** (`degats`, `reanimation`, `telegraphiee`). **Chaînes affichées au joueur avec accents** (`"à terre — attends un coéquipier"`). Cette séparation est systématique dans tout le code.
- Les commentaires expliquent **pourquoi**, souvent en documentant ce qui a été essayé et pourquoi ça ne marchait pas. C'est le style dominant du dépôt : le conserver plutôt que de paraphraser le code.
- `LISEZMOI.md` est rédigé pour un lecteur humain qui découvre le projet, avec les mesures à l'appui des choix.
