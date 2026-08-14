# CLAUDE.md

Mini survivor multijoueur LAN. Serveur Node autoritaire, client navigateur,
**zéro dépendance** (WebSocket réimplémenté dans `ws_lite.js`). Pas d'étape de
build : les modules ES sont servis tels quels.

Ce fichier est chargé à chaque session : il ne contient que des **règles**.
Aucun récit, aucune justification longue, aucune mesure — les mesures vivent
dans `LISEZMOI.md`, qui n'est lu que quand on touche à l'équilibrage.

## Commandes

```bash
npm start                 # serveur sur le port 7777
PORT=8123 node server.js
node --check server.js    # pas de linter dans le projet
npm run version-check     # refuse un deploiement sans bump
```

`ROOM_GRACE_MS` et `ROOM_MAX` sont surchargeables par l'environnement, pour les
tests uniquement.

Pas de suite de tests. La logique est pure et sans DOM : on l'importe dans un
script jetable. 600 s de jeu ≈ 1 s de CPU.

```js
import { GameState, CFG } from "file:///<absolu>/shared/game_state.js";
const g = new GameState(1);              // 0 calme, 1 normal, 2 cauchemar
g.addPlayer(1, "bot", 0);
g.step(CFG.TICK, new Map([[1, { x: 1, y: 0, ax: 1, ay: 0, dash: false }]]));
```

Les méthodes `_` (`_spawnEnemy`, `_atkDamier`, `_zoneHits`, `_bossBars`…) sont
volontairement appelables depuis un test.

Bout en bout : lancer `server.js` sur un `PORT` dédié et parler WebSocket en
direct (`net` + poignée RFC 6455) — Node 16 n'a pas de `WebSocket` global.

## Version

**`minor` = le plan, `patch` = le rang du lot dedans.** Un lot livré = un bump,
dans `shared/version.js` (constante **et** ligne d'historique) puis dans
`package.json`. La correspondance lettre → chiffre est **écrite** dans la table
d'historique, jamais calculée. Pas de quatrième composant, pas de pré-version.

La table d'historique de `shared/version.js` est le **CHANGELOG** du dépôt.

`npm run version-check` échoue si des sources (`.js`, `.css`, `.html`, hors
`docs/` et `*.md`) ont bougé sans que la constante suive. Il ne bumpe pas à la
place.

Le **hash court du commit** (`shortCommit()` dans `server.js`, transporté par le
`welcome`) couvre ce que le numéro ne peut pas. Absent hors dépôt git, ne bloque
jamais un démarrage.

## Architecture

```
server.js              amorce : HTTP, WebSocket, page admin, cablage
hub.js                 registre des salles, comptes, progression — SEUL a ecrire dans le magasin
room.js                UNE partie : GameState, clients, phases, pause, tick
ws_lite.js             WebSocket minimal (RFC 6455 + permessage-deflate), pas de TLS
perf.js                echantillonnage CPU
version_check.js       refuse un deploiement sans bump
progress_store.js      persistance Supabase — serveur SEUL, memoire + replique
shared/game_state.js   LOGIQUE PURE — importee par le serveur ET le navigateur
shared/cards.js        cartes, raretes, tirage, calcul des mods
shared/classes.js      les 3 classes, constantes de competence
shared/statuses.js     les 4 etats, priorite de purge
shared/bosses.js       roster des 5 boss + le final, registre des mecaniques
shared/enemies.js      LE BESTIAIRE — 9 types, 6 traits, attachement, adaptType
shared/reliques.js     le catalogue des reliques
shared/progression.js  la meta : arbres, noyaux, jalons, emplacements
shared/timeline.js     LE SCRIPT — six segments, trente beats, TROIS variantes, les EVENEMENTS
shared/biomes.js       LE LIEU — trois biomes, cinq dangers, trois meteos, generateur DETERMINISTE
shared/units.js        pixels -> metres, SEUL point de conversion d'affichage
shared/version.js      LA version + le CHANGELOG en commentaire
shared/palette.js      LA CHARTE — couleurs, rampes, echelle typo
public/client.js       AMORCE : importe tout, cable, lance la boucle (44 lignes)
public/core/state.js   COUCHE 0 : etat de session et de partie, n'importe RIEN
public/ui/dom.js       TOUTE reference DOM du jeu + helpers de texte
public/render/stage.js canvas, ctx courant, camera, gl, decor de mode, biome, souris -> monde
public/net/interp.js   horloge de rendu, interpolation, worldQueue / alertQueue
public/render/fx.js    particules, impacts, morts, chiffres de degats, tressaillement
public/render/decor.js LE SOL : grille, vignettage, obstacles, dangers
public/render/material.js la MATIERE du sol : une tuile cuite par (biome, mode, graine)
public/render/actors.js zones, projectiles, structures, ennemis, bonus
public/render/boss.js  boss, marques de mecanique, joueurs
public/render/world.js ORCHESTRATION : ordre de dessin, boucle, prediction, resetFeedback
public/ui/build.js     fenetre de build
public/ui/screens.js   barre, hub, salon, cartes, marchand, bilan, progression
public/ui/pause.js     menu pause
public/input.js        clavier, souris, envoi des intentions a 30 Hz
public/ui/boot.js      ecran de chargement et d'entree
public/net/ingest.js   reception des instantanes
public/net/router.js   la socket et le routage des messages
public/sprites.js      atlas genere au chargement + drawSprite
public/gl.js           batcher de quads WebGL2 — ne connait ni le jeu ni l'atlas
public/hud.js          le HUD, en DOM : la couche ECRAN
public/icons.js        glyphes de bonus, d'effets et d'etats
public/events.js       diffusion des snapshots en evenements types (module pur)
public/music.js        bande son sequencee + AIGUILLAGE vers tracks.js
public/tracks.js       la bande son EN FICHIERS, deux platines + fondu croise
public/audio.js        synthese WebAudio, palette sonore, reglages, echantillons
public/index.html      page, chargement, salon, bilan, cartes, ossature du HUD
public/admin.html      page d'administration autonome, servie SI ADMIN_KEY
public/css/tokens.css  espacement, geometrie, mouvement (aucune couleur)
public/css/ui.css      les ecrans hors combat
public/css/menus.css   refonte des MENUS — additive, chargee APRES ui.css
public/css/admin.css   SEULE feuille qui recopie la palette
public/css/hud.css     la couche ecran pendant la manche
public/fonts/          Chakra Petch + Space Grotesk, versionnees avec le jeu
```

Un seul port sert les fichiers **et** les WebSocket. `resolvePath()` route
`/shared/*` depuis la racine du dépôt, le reste depuis `public/`.

**`shared/game_state.js` ne référence jamais le DOM, le canvas, le clavier ni le
réseau.** `cards.js`, `classes.js`, `statuses.js`, `bosses.js`, `enemies.js`,
`progression.js` et `biomes.js` ne dépendent de **rien**. Seule exception :
`timeline.js` importe `ALERT_*` de `bosses.js` (feuille → feuille, sans cycle).

Les constantes de comportement vivent à côté de leur table : `CARD_CFG`,
`SKILL_CFG`, `STATUS_CFG`, `BOSS_CFG`, `TL_CFG`, `TRAIT_CFG`, `BIOME_CFG`. Ce
qui appartient à **un seul type** reste sur sa ligne dans `ENEMY_TYPES`.

`game_state.js` **réexporte** `ENEMY_TYPES` : le client et les scripts de mesure
l'importent de là.

### La règle des couches, côté client

**Un module n'importe QUE des modules d'indice strictement inférieur**, dans
l'ordre de la liste ci-dessus. C'est plus fort que « pas de cycle » : ça se lit
au lieu de se vérifier.

**Écrire dans l'état d'un autre module passe par un setter, et par rien
d'autre.** Une liaison ES est vivante en lecture, en lecture seule à l'écriture :
62 identifiants ont un `setX()`.

Une seule arête ne se résout pas par un déplacement : `sendAuth` (couche 0)
rappelle `connect()` (couche 15), via `setReconnecter(connect)` posé par
l'amorce. Même modèle : `setTrackFallback` (music → tracks).

`events.js` et `audio.js` ne dépendent de **rien** — chargeables dans un script
de mesure avec un faux `AudioContext`.

## Rendu

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
  manche). `visibility: hidden`, jamais `display: none` (`resize()` lit
  `clientWidth`).
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
`_teamCentroid` ; `_bossDead` rouvre. Toute la géométrie des mécaniques lit les
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

## Serveur autoritaire

Les clients n'envoient que des **intentions** (deux directions, distance au
réticule, drapeau d'esquive) à 30 Hz. Ils ne décident jamais position, dégâts,
morts, score ni cible. Les vecteurs sont renormalisés côté serveur.

- **`ar` (distance au réticule) est CONTINU** comme `ax`/`ay` : pas remis à zéro
  après le tick. `bombRange()` (`classes.js`) est son point de passage unique.
  Valeur absente/négative/aberrante → portée **maximale**.
- **`d`, `s1`, `s2`, `s3` sont PONCTUELS** : remis à zéro après chaque tick
  (`room.js`). `s3` n'existe que si sa carte a été tirée (`mods.skill3`), tables
  dans `CARD_CFG` (`SKILL3_*`). La Salve ne consomme pas sa recharge sans cible.

### Côté client

- **Interpolation** : 110 ms de retard, entre les deux états qui encadrent.
- **Prédiction locale** : recalage sec au-delà de 90 px, **désactivé pendant une
  esquive** (l'écart dépasse volontairement le seuil), rappel relâché.
- **Pas de temps fixe** : 1/60 s des deux côtés.

### Hub et salles

**Un seul processus, salles en mémoire.** La progression vit en mémoire avec
Supabase pour seule persistance ; deux processus tiendraient deux copies du même
compte.

- **Une `Room` ne touche jamais à Supabase, ne lit aucune globale, et ne connaît
  pas les autres salles.** Elle reçoit ses entrées et émet des événements — les
  `hooks` : `awardRun`, `awardPartial`, `sendProgress`, `occupancy`, `persist`.
  Le hub est le SEUL écrivain. **Tout nouvel état serveur s'attache à la `Room`,
  jamais au module.**
- **Un client est en état HUB ou en état SALLE.** `hub.js` traite `join`,
  `listRooms` (1/s), `createRoom`, `joinRoom`, `leaveRoom` et les `meta*` (hub ET
  salon, jamais en manche) ; le reste va à `room.handleMessage()` et est
  **rejeté** si le client n'est dans aucune salle. `nextClientId` vit au hub.
- **Le recomptage d'effectif a un point de passage unique** : le hook
  `occupancy` → `broadcastRooms()`. La liste est POUSSÉE aux clients en état hub.
- **Une salle pleine se refuse** (`joinRoomError{motif:"pleine"}`), elle ne met
  pas en attente ; le client RESTE au hub. Motifs distincts : `pleine`,
  `disparue`, `motdepasse`, `plafond`.
- **Une salle vide survit `ROOM_GRACE_MS` (60 s) puis est détruite**, et **ticke
  quand même** pendant ce délai. `welcome` propose la dernière salle (`rejoin`),
  un membre connu re-entre sans mot de passe (`knownMembers`).
- **Un seul intervalle à 120 Hz pour toutes les salles, `try/catch` par salle**
  (une exception ferme LA salle via `closeRoom`). Accumulateurs **décalés** à la
  création (`staggerFrac`) ; la remise à zéro du compteur de snapshot est
  RELATIVE.
- **La compression se fait UNE fois par broadcast** : `prepareMessage()` produit
  trame claire et trame deflate, `sendPrepared()` choisit. Possible parce que
  permessage-deflate est négocié `no_context_takeover`. Niveau 1, seuil 256
  octets. RSV1 hors négociation = erreur de protocole.
- **Pas de TLS dans `ws_lite.js`** : proxy inverse devant. Plafond de connexions
  par IP (`IP_CONN_MAX`).

## Points de passage uniques

Y brancher toute mécanique nouvelle plutôt que d'ouvrir un second chemin.

| point | ce qui y est branché |
|---|---|
| `_hurt(p, d, opts)` | **tout** ce qui blesse un joueur ; multiplicateur de difficulté **ici et nulle part ailleurs** ; plafond de mécanique ; provenance |
| `_damage()` | **tout** ce qui blesse un ennemi ou le boss ; vol de vie, critique, momentum, exécution, brûlure, `hitSeq`, `critSeq`, point d'impact du boss, redirection Jumeaux, crédit XP du boss |
| `_blastPush(x, y, r, force)` | **toute** impulsion radiale d'un souffle, et le trou d'apparition qui va avec (`_dansUnTrou`) |
| `_healLinks(dt)` | accrochage, rupture, soin, réanimation et siphon du Soigneur |
| `drawArc(clef, x0, y0, x1, y1, opts)` | **tout** ce qui relie deux points par un arc : ricochet, salve, lien de soin |
| `spawnBlast(x, y, r, ampleur, style)` | les couches chaudes d'un souffle, mises à l'échelle par la magnitude |
| `_applyStatus()` / `_purgeStatus()` | pose et retrait d'état |
| `_killEnemy()` | **toute** mort d'ennemi : XP, explosion du kamikaze, cumuls |
| `_bulletHitEnemy()` | une balle qui touche — appelé par la boucle de collision **et** le balayage à l'apparition |
| `_groundZone()` | toute zone posée par la horde, plafond global `trailMax()` |
| `_windupSature()` / `_windupCompte()` | budget de préavis de ruée, par vue |
| `_wave(x, y, r, dmg, owner)` | l'onde blanche des cartes (l'horloge de manche s'appelle `_segmentTick(dt)` — deux méthodes de même nom s'écrasent en silence) |
| `_spawnPoint(geom, r)` / `_pushOffScreen` / `_edgePoint` | apparition et repoussage hors vue |
| `_grille()` | voisinage spatial : séparation entre ennemis **et** ennemi/joueur |
| `enemyCap(diffIndex, joueurs)` / `_enemyCap()` | plafond de population, serveur **et** HUD |
| `enemySpeed(type, minute, diff, tirage, elite)` | vitesse d'un ennemi — apparition **et** vérificateur |
| `_clampToBounds()` / `_dropPoint()` | tout ce qui borne un déplacement ou pose un objet |
| `_bossTargets()` | tout ce qui frappe « le boss » en zone |
| `_ground()` / `groundAt()` | champs de ralentissement, serveur et client |
| `_obstacleBlock()` | blocage par obstacle de biome (repoussage **par axe**) |
| `hazardState(h, t)` | état d'un danger, partagé simulation ↔ rendu |
| `adaptMech()` | adaptation à l'effectif (`minPlayers`, `fallback`) |
| `adaptType()` | adaptation au niveau (`minLevel`, `fallback`) ; `_pickType` **filtre**, `_spawnEnemy` **replie** |
| `adaptEntry()` | adaptation d'un beat à l'effectif |
| `openNextScreen()` | enchaînement cartes → marchand |
| `_recomputeMods()` | rejoue tout le chargement (cartes + classe + méta) |
| `assignColors()` | couleur de joueur, à la diffusion du salon |
| `notReady()` | qui manque pour lancer |
| `briefWaiting()` / `syncBrief()` | qui n'a pas fermé son briefing |
| `setPaused()` | les trois causes de pause |
| `unlockClasses()` | déverrouillage aux DEUX sorties de manche |
| `recordRound()` | historique, aux DEUX sorties de manche |
| `pushWorld()` / `worldQueue` | tout message ponctuel décrivant le MONDE |
| `applyAlert()` | annonce, que le message porte `event`, `mech` ou `meteo` |
| `drawSprite()` / `cellRect()` / `mirrored()` | dessin d'entité, lecture d'atlas, sous-tracé miroir |
| `teinter(base, teinte, k)` | clarté du mode + chroma du biome |
| `audioUi` | volume, depuis les trois vues |
| `uiSoundFor()` | son d'un bouton d'interface |
| `goHome()` | retour au hub, d'où qu'on clique |
| `enSaisie()` | « suis-je en train d'écrire » |
| `prepareMessage()` | compression, une fois par broadcast |
| `store.save(pseudoLower)` | marquage sale, fenêtre de 2 s |

## Invariants

### Généraux

- **UN CHAMP DONT LA SEULE LECTURE EST MORTE SE SUPPRIME, il ne se répare pas.**
  En JS un champ absent rend `undefined`, donc `NaN`, donc du **silence**. Un
  `grep` du champ retiré fait partie de la suppression d'un système.
- **Les distances s'affichent en mètres, la simulation reste en pixels.**
  `shared/units.js` (`PX_PER_M = 20`, `toM`, `fmtM`) ne sert **qu'**à écrire un
  texte destiné à un joueur. **Ne jamais convertir** une constante de `CFG`,
  `CARD_CFG`, `SKILL_CFG`, `STATUS_CFG`, `BOSS_CFG`. Une description compose
  `fmtM(LA_CONSTANTE)`, elle ne recopie pas un nombre.
- **Chaque effet dessiné autour d'un personnage occupe une bande de rayon
  exclusive** : `RING_SHIELD`, `RING_STATUS`, `RING_SKILL`, `RING_BUFF0`, puis
  3,7 m lames orbitales, 8 m givre, 8,5 m rempart. **Vaut aussi autour d'un
  ENNEMI** : halo d'élite `r+6`→`r+8`, liseré d'aura `r+10`. Les lames se
  dessinent en passe séparée (`drawOrbiters`), le givre est un disque **sans
  anneau**.
- **Toute chaîne d'effets mémorise ses cibles** (`Set` du ricochet).

### Réseau et snapshot

- **Les snapshots sont des tableaux positionnels.** On ajoute des champs **à la
  fin, jamais au milieu** ; le client lit avec un repli (`a[16] ?? 0`).
- **Les tableaux exportés sont ordonnés et l'index circule** : `POWERUP_TYPES`,
  `ENEMY_TYPES`, `DIFFICULTIES`, `CLASSES`, `STATUSES`, `BOSS_ROSTER`, `MECHS`,
  `EVENTS`, `BIOMES`, `WEATHERS`, `DAMAGE_SOURCES`. Insérer au milieu réécrit le
  sens de tous les snapshots.
- **Les zéros de queue sont coupés** (`trimTail`). `keep = 7` pour un ennemi (le
  client lit `a[6]`, l'orientation, sans repli).
- **Le rang d'élite est encodé dans le champ de type** (`+100`) :
  `type = a[5] % 100`, `elite = a[5] % 200 >= 100`. Le `% 200` tolère encore le
  `+200` disparu (retardataire).
- **Les compteurs de touches sont CYCLIQUES de 0 à 9** : le client ne lit qu'une
  différence entre deux instantanés. `hitSeq` compte les touches, `critSeq` les
  critiques. Un critique qui **tue** ne laisse rien sur la victime — il compte sur
  le TUEUR (`p.critKills`, même forme cyclique).
- **Clés NOMMÉES du snapshot** (ignorées par un client ancien) : `sg`, `xl`,
  `xp`, `bw`, `bm`, `an`, `sa`, `mk`, `bo2`, `sp`, `bn`, `wl`, `bd`, `wu`, `ev`,
  `ob`, `hl`. `bn`, `wl`, `wu`, `ev`, `ob`, `hl` sont **absentes** la plupart du
  temps.
- **Avant d'ouvrir une clé de snapshot, chercher si la valeur est une fonction de
  ce que le client a déjà** : la géométrie d'une graine, l'état d'un danger du
  temps, la météo du segment, un trait de `(diffIndex, type)`.
- **Cinq informations sont DÉDUITES** côté client : cadence des tireurs (observée
  au second tir, repos avant), direction des projectiles (image précédente),
  déplacement d'un joueur (deux images, **seuil non nul**), cible du soigneur
  ennemi (`drawMedicLinks` rejoue le choix du serveur), et **auteur d'une touche**
  (la balle éteinte la plus proche du point d'impact, `BULLET_CLAIM`).
- **Le canal d'alerte est ponctuel, hors snapshot** : `state.alerts` est une file
  que la simulation empile et que le serveur vide après chaque tick. GameState ne
  diffuse pas.
- **Tout message ponctuel qui décrit un changement du MONDE passe par
  `pushWorld()`** : `round`, `roundAbort`, `roundEnd`, `cards`, `cardsWait`, la
  fermeture de l'écran de cartes. Une file, pas un `setTimeout`. Elle se vide à
  `onclose` et nulle part ailleurs (`resetFeedback` ne doit pas la vider).
- **Le salon s'applique à la réception SAUF si la file n'est pas vide** — il
  porte `phase`, et posé avant `roundEnd` il ouvrirait le salon 110 ms avant le
  bilan. Un vote, un « prêt », une arrivée ne commentent aucune image.
- **`briefState` s'applique à la RÉCEPTION** : il ne commente aucune image.

### Simulation

- **Les Jumeaux sont deux entités pour UNE réserve de vie.** `state.boss` est la
  source de vérité, `state.boss2` un second point d'application ; redirection
  dans `_damage()`. **Tout retour visuel vise l'entité RÉELLEMENT touchée**
  (`struck`, point d'impact dans `bossDmg`).
- **Une mécanique ratée met à terre, elle ne tue jamais un joueur à pleine vie**
  (drapeau `mech` dans `_hurt`). La progression de la sanction passe par le
  **cumul de Vulnérabilité** posé par `_mechHit()`. Options écrites une seule
  fois : `MECH_HURT`.
- **`_hurt()` prend un SAC D'OPTIONS** : `{ ignoreCooldown, fromZone, overTime,
  mech, src }`.
- **Tout dégât subi porte une PROVENANCE** (`src`, index de `DAMAGE_SOURCES`,
  **sept** entrées), relevée après tous les multiplicateurs. `p.lastSrc` traverse
  le réseau, `p.hurtBy` sort au bilan. Un appel qui oublie `src` compte en
  **contact**.
- **Un dégât continu passe `overTime = true`** à `_hurt()` **et** à `_damage()`.
  Sans lui : victime immunisée au reste (`hitCd` remis à zéro 60×/s), et ennemi
  qui clignote en permanence. Un `overTime` **ne critique jamais**.
- **Critique, momentum et exécution vivent dans `_damage()`.** L'exécution ne
  touche **ni le boss ni une structure de mécanique**. `this.lastCrit` est relu
  immédiatement par `_bulletHitEnemy` (Sentence capitale).
- **Le critique figure dans `_playerPower()`, le momentum non** — le second est
  transitoire, il vit dans `p.power`, relevé une fois par tick par `_momentum()`.
- **`areaMul` a deux points d'application** : les rayons **déjà mods**
  (`bulwarkRadiusMul`, `healWaveRadiusMul`, `frostRadius`) l'absorbent à la fin de
  `computeMods()` ; les rayons **constants** chez leur appelant.
- **Les conversions se calculent sur les valeurs de BASE** (`fullMods`), jamais
  l'une sur le résultat de l'autre.
- **Un ennemi ne chevauche jamais un joueur** (`_separateFromPlayers()`,
  `PLAYER_SEPARATION`). Trois règles indissociables : constante **dédiée**, le
  joueur n'est **jamais** déplacé en retour, le contact garde une **morsure d'un
  pixel** (`PLAYER_BITE`). `_spawnSweep()` teste le segment centre du joueur →
  point d'apparition, dans l'ordre où la balle le parcourt.
- **AUCUN TYPE DE HORDE NE DÉPASSE 90 % DE LA VITESSE DE LA CLASSE MÉDIANE**
  (`SPEED_DOCTRINE` × `vitesseClasseMediane()`, **déduite de `CLASSES`** et jamais
  écrite en dur), à aucune minute, dans aucune difficulté, **tirage de vitesse
  compris**. C'est ce qui garantit qu'il reste toujours quelque chose à semer. Le
  Rempart (`speedMul 0,92`) n'est **pas couvert**, et cette exception se vérifie
  (`verifierClasses`) au lieu de se supposer : un tank ne répond pas à la horde en
  fuyant, il pose son Rempart. Ne s'applique **ni aux boss ni aux invocations de
  mécanique**, qui doivent pouvoir rattraper.
- **La rampe de vitesse est MULTIPLICATIVE** (`ENEMY_SPEED_RAMP_PCT`) : une rampe
  additive uniforme est mathématiquement une compression du bestiaire — elle
  rapproche tout le monde de la moyenne. Le rapport lent/rapide est donc
  **invariant par minute** ; il a un plancher, `SPEED_SPREAD_MIN`.
- **Les deux séparations passent par la GRILLE** (`_grille()`) : tri par comptage
  dans des `Int32Array` réutilisés, cellule = `2 × max(rayon, PLAYER_RADIUS)`,
  voisinage 3×3, coordonnées de cellule **écrêtées** (un corps repoussé hors salle
  retombe dans une cellule de bord — l'écrêtage est 1-lipschitzien, donc il ne
  sépare jamais deux corps qui se touchent). La taille de cellule est ce qui
  **prouve** la couverture : deux corps qui se chevauchent sont à moins d'une
  cellule, donc dans le voisinage. La toucher casse la preuve.
- **L'état de provocation est global** (`state.taunt = {id, until, x, y}`), lu par
  `_nearestPlayer()`.
- **Le mode soin est une POSTURE, pas une recharge, et en posture le soigneur ne
  tire plus du tout.** Les liens s'accrochent seuls (`_healLinks`) : alliés
  d'abord, jusqu'à `HEAL_LINK_MAX`, rupture après `HEAL_LINK_GRACE` hors rayon
  — sans ce délai, un allié qui oscille à la limite fait clignoter le lien. La
  question posée au joueur n'est plus « ai-je une ligne de tir ? » mais « puis-je
  **rester** près de lui ? ».
- **Le lien ne rend AUCUN PV au soigneur** : l'auto-subsistance appartient à la
  vague, qui l'inclut déjà. **Sa posture est donc inerte en solo**, et c'est
  assumé — un soutien seul n'a pas de sens stratégique. C'est un problème
  d'affichage (`solo` dans `CLASSES`, montré à un joueur), pas de puissance. La
  carte `siphon` est ce qui rend l'autonomie : elle **réécrit une règle** du mode,
  et les ennemis ne comblent que les liens **restés libres**.
- **Le soin du medic est un chemin NEUF**, jamais un `_damage()` négatif. Rupture
  mesurée en **temps passé sous le feu**.
- **La purge par le soin se compte en TEMPS** (`STATUS_CFG.PURGE_WINDOW` de lien
  continu), là où elle se comptait en touches.
- **Le relèvement n'a qu'UN point d'achèvement, `_revive()`** : il compte la
  proximité **et** le lien, au lieu d'ouvrir un second chemin.
- **Ne jamais écrire dans `ENEMY_TYPES`** : `standoff`, `traits`, `shieldArc`,
  `dashCd`, `dashWarn`, `dashT`, `trailAt`, `healT`, `fireT`, `fleeT`, `hitAt`,
  `aura` sont **copiés sur l'entité** à l'apparition.
- **Le bulwark est le seul ennemi dont `e.ang` n'est pas l'angle vers sa cible**
  (`shieldTurnRate`). L'angle d'absorption se mesure du **centre de l'ennemi vers
  le point d'impact**.
- **L'aura ne se cumule jamais** : meilleure réduction, jamais le produit.
  Relevée une fois par tick (`_auraPass`), lue dans `_damage()`. Même règle pour
  le Vœu partagé, les auras de givre et les champs de ralentissement.
- **`_groundZone()` porte un plafond global** (`trailMax()`, traînées et spores
  confondues, la plus ancienne cède). La traînée se pose à la **distance
  parcourue**, pas au temps.
- **Les deux plafonds de traits se dérivent de l'ÉCRAN, jamais de la
  population.** `trailMax()` = ce qui remplit `TRAIL_SURFACE` (12 %, le budget de
  `HAZARD_SURFACE_MAX`) d'**une vue** ; `DASH_WARN_MAX` = les préavis de ruée
  simultanés qu'**une vue** peut porter. Un plafond indexé sur `enemyCap()`
  suivrait la densité que la lisibilité, elle, ne suit pas.
- **Le budget de préavis se compte à la POSITION DE L'ENNEMI**, pas à celle de sa
  cible (un ennemi lancé sur A s'affiche sur l'écran de B), et **un préavis
  accordé s'inscrit dans les DEUX tables** (`_windupCompte`) — la table de
  l'image, et celle qui la reporte à la suivante. Sans le second appel, le
  plafond effectif double exactement.
- **Un préavis refusé ne consomme pas la recharge** : `dashCd` reste à zéro et
  l'ennemi réessaie à l'image suivante.
- **Les systèmes lisent `p.mods`, jamais la liste de cartes.** Les minuteurs
  (`p.timers`), les états (`p.statuses`) et les reliques (`p.relics`) vivent **à
  côté** : un recalcul de mods ne doit pas les effacer.
- **La classe passe par `p.mods`**, comme les cartes. Seules `_skill1`/`_skill2`
  lisent `classAt(p.cls)`.
- **`state.bounds` est la surface jouable** ; tout ce qui borne un déplacement la
  lit, jamais `CFG.ARENA_W/H`. Depuis le lot I, la **géométrie des zones** et le
  **rebond des balles** aussi. Gardent l'arène entière : l'**apparition** des
  ennemis et le **culling** des projectiles.
- **`state.walls` bloque, il ne blesse pas.** On repousse du côté **d'où l'on
  venait** (une esquive traverse 162 px en trois images). Le client rejoue la
  règle. Les obstacles de biome repoussent **par axe** (glissement). Le **boss**
  n'y passe pas.
- **Le plafond de population est une FONCTION, pas une constante** :
  `enemyCap(diffIndex, joueurs)` = `MAX_ENEMIES_BASE × MAX_ENEMIES_DIFF[i] ×
  joueurs^WAVE_CROWD_EXP`, borné par `MAX_ENEMIES_HARD_CAP`. Le **même exposant**
  que la division d'XP de `_addXp` : la horde grossit exactement de ce que la
  normalisation retire. `MAX_ENEMIES_HARD_CAP` est une limite de **moteur** — la
  seule valeur du dépôt qu'on règle au profileur et non en jouant.
- **La saturation ne traverse pas le réseau** : passé `_enemyCap()`,
  `_spawnEnemy` rend `null` en silence. La réponse est de l'**information** (taux
  d'occupation au HUD, déduit de `enemies.length` — le client rejoue `enemyCap()`
  à partir de la difficulté et de la longueur de `playerList`).
- **UN ENNEMI NE SE MATÉRIALISE JAMAIS SOUS LES YEUX** (`_pushOffScreen`). Le
  **côté appartient au script, la distance à la lisibilité** : on ne change jamais
  de bord, on repousse le long de l'axe du bord, quitte à sortir de la salle. Le
  rectangle de vue est **reconstruit** (centré puis clampé). Exempts : `anneau`
  et les nuées de pondeuse.

### États

- **Une purge ne retire jamais qu'un seul état**, dans l'ordre `PURGE_ORDER` :
  Sentence > Brûlure > Entrave > un cumul de Vulnérabilité. Seule la Purification
  au sol y échappe.
- **La Sentence n'est jamais posée dans une équipe sans soigneur**
  (`hasHealer()`). À l'échéance elle **met à terre**.
- Les effets se lisent **là où ils s'appliquent** : Vulnérabilité dans `_hurt()`,
  Entrave dans `_players()`, Brûlure dans `_statuses()`.

### Zones

- **Les zones de dégâts sont pleines** ; les retraits sont purement visuels
  (`zonePath()` côté client).
- **`ZONE_FORGIVE` : la zone affichée est plus grande que celle qui blesse, de
  10 %.** Écart assumé (110 ms d'interpolation). Le sens s'**inverse** pour ce
  qui épargne (trou d'anneau, secteur sûr) : la tolérance pardonne toujours dans
  le même sens.
- **Une zone persistante inflige `dot` par paliers de `ZONE_TICK`**, jamais à
  chaque image, et passe `overTime = true`.
- **Les mécaniques de groupe vivent dans une liste unique, `state.marks`.** Un
  marqueur dont le porteur se déconnecte ou tombe **se supprime lui-même**.
- **`shape`** : 0 disque · 1 rectangle orienté · 2 anneau · 3 cône · 4 Pac-Man ·
  5 croix.

### Script, événements, difficulté

- **Une manche est SIX SEGMENTS de 300 s de horde** (`shared/timeline.js`), cinq
  beats de 60 s, débit écrit beat par beat, boss en clôture. **L'horloge de horde
  (`hordeTime`) s'arrête pendant le boss et pendant l'écran de cartes.**
- **Les six étapes portent un NOM** (`SEGMENT_NAMES` / `segmentName()`) :
  Installation, Emprise, Crise, Ressac, Étau, Apothéose. Le numéro reste affiché
  à côté. Les identifiants du code gardent `segment`.
- **Le crescendo et le balayage vont ensemble** : le balayage d'arrivée du boss
  ne crédite **ni score ni expérience** (il ne passe pas par `_killEnemy`) ; il a
  un point de passage unique, `_sweepEnemies`.
- **UN ÉVÉNEMENT EST UNE ENTRÉE DU SCRIPT**, jamais un second système. Le
  calendrier est une **colonne de la table**, pas une arithmétique.
  `verifierScript()` en est le critère rejouable.
- **`MECHS` reste réservé aux boss ; `EVENTS` et `WEATHERS` sont des tables à
  part.** Trois tables, **un seul chemin d'annonce** (`applyAlert`).
- **Un événement remplace la COMPOSITION du beat, pas le beat** : `types` dit
  quoi, le beat dit combien et par où. La composition traverse `adaptType` et le
  roster de difficulté.
- **Réussir un événement rend 100 % des PV et du bouclier et RELÈVE les joueurs à
  terre**, sans condition. « Terminer » = atteindre l'échéance du beat, **sauf
  `chasse`**, qui se termine à la mort du gibier et ne rend rien s'il survit.
- **Le gibier de `chasse` porte `noExec`** (exclu du seuil d'exécution) ; ses PV
  sont une **fraction de ceux d'un boss** du même segment, et ne suivent pas la
  puissance.
- **UNE DIFFICULTÉ EST UN PROFIL** : `script`, `roster`, `traits`, `resume`, puis
  le **résidu** `hp`/`spawn`/`dmg`/`boss`/`speed`. Ni `events` ni `biome` n'y
  ouvrent de clé.
- **Trois refus explicites** : pas de variante de boss par difficulté, pas de
  variante de mécanique par difficulté, pas de statistique de type par difficulté
  (le résidu porte tout l'ajustement chiffré).
- **Les variantes de script changent la FORME de la pression, jamais sa
  QUANTITÉ** (qui vit dans `diff.spawn`). Il ne reste qu'un axe : **quelle
  géométrie**.
- **Les variantes sont DÉRIVÉES de la table de référence** (`derive()`), jamais
  recopiées.
- **Un TRAIT est un module de comportement attaché à `(type, difficulté)`**,
  jamais une variante de type. Masque résolu **une fois à l'apparition**
  (`e.traits`). **L'ATTACHEMENT vit dans le PROFIL, les VALEURS dans
  `enemies.js`.** `TRAIT_BY_TYPE` résout au chargement. **Le client recalcule à
  partir de `(diffIndex, type)`** — coût réseau nul, sauf `wu` (anticipation de
  ruée).
- **Tout ce qui s'indexait sur la vague s'indexe sur le NIVEAU D'ÉQUIPE** (D3).
  `this.tier` n'existe plus. `beatIndex()` reste exporté.

### Boss

- **`bars` est une propriété du ROSTER** (`CFG.BOSS_BARS` en repli). Le final en
  a huit.
- **N barres font N−1 ruptures, donc N−1 entrées d'`unlock`** : `phase` plafonne
  à `bars - 1`, `bossPool` lit `unlock[0..phase-1]`. Le final a **sept** entrées.
- **La file d'attaques différées est une LISTE**, pas un emplacement unique.
- **Chaque barre du boss final OUVRE sur le patron qu'elle vient de débloquer**,
  par cette file.
- **La rupture de barre ne blesse pas**, et elle est déclinée par **boss**
  (`_bossBreak`). Chaque variante **s'annonce**. Le boss peut mourir dans sa
  propre rupture : tester `this.boss` après chaque tour de boucle.
- **Le plancher de barre** (`BOSS_CFG.BAR_DWELL`, dans `_bossBars`) **diffère** la
  rupture sans perdre les dégâts en excès (`broken` se déduit des PV). **La banque
  se vide BARRE PAR BARRE**, jamais d'un coup — on n'applique que ce qui mène au
  plancher de la barre suivante. **La dernière barre du final a un plancher elle
  aussi.**
- **L'enrage** (`_bossEnrage`, `ENRAGE_AT`/`ENRAGE_STEP`, `FINAL_ENRAGE_AT` pour
  le final ≈ deux fois la médiane) monte dégâts de zone et cadence, et
  **s'annonce à chaque palier**. Il passe par `_zoneDamage()` et `attackCd`, donc
  sous le plafond des mécaniques.
- **Le boss final est la SIXIÈME entrée du roster et n'est jamais tiré** :
  `_pickBoss` le rend quand `_rosterCleared()` (les cinq **vaincus**,
  `bossKindsKilled`) ; le tirage ordinaire s'arrête à `BOSS_POOL_COUNT`, **écrit**
  dans `bosses.js`. `finalDone` l'empêche de revenir.
- **Le boss final clôt le segment 6**, et rien d'autre ne le fait sortir.
- **Ses patterns repris sont intensifiés par DEUX champs de roster** : `atkCdMul`
  (dans `attackCd`) et `zoneMul` (dans `_zoneDamage()`). Champ absent = 1.
- **Le sceau se pose UNE fois** (`b.sealDone`) ; un échec le **repose**. Son
  cumul est un **temps** (`m.cur` en secondes) qui **redescend à mi-vitesse**. Il
  réutilise `towerCount(alive)` ; sanction **pleine sur toute l'équipe** dès qu'un
  foyer est vide.
- **Le deck se distribue exactement : cinq boss pour cinq places, à tout
  effectif.** Pas de `minPlayers` sur un boss ; `MECH_SPREAD` et `MECH_LINK`
  sortent du répertoire solo.
- **Le répertoire du boss est indexé sur le SEGMENT**, pas sur `bossCount`.
- **`state.victory` et `state.finalKill`** sont posés sur `state.time`. La
  victoire est relevée par `endRound()` **avant** `awardRun`. Record **par
  difficulté** (`bestFinal`) ; `bestFinalRun` porte variante, biome, difficulté et
  effectif, tous obligatoires.
- **Les structures de mécanique passent par `_bossPower()`**, comme le boss.

### Difficulté et puissance

- **PLUS RIEN N'INDEXE LA DIFFICULTÉ SUR LA PUISSANCE DE L'ÉQUIPE** (D2).
  `WAVE_HP_POWER_K` et `WAVE_RATE_POWER_K` valent **0** ; les PV de boss lisent
  `BOSS_POWER_REF` (2,36) au lieu de `_bossPower()`. Revenir en arrière = trois
  constantes. `powerIndex()`, `bossPower()`, `_teamPower()` et `p.powerMods`
  restent (fenêtre de build).
- **`powerIndex(mods, flat)` et `bossPower()` sont exportés en fonctions pures**,
  comme `fullMods` et `effectiveCards`. Les deux côtés passent `flat`. Le flat
  « boss uniquement » compte à **un tiers**.
- **Toute nouvelle source de dégâts permanente doit entrer dans `powerIndex`**, et
  toute pénalité qui accompagne un gain aussi.
- **L'indexation porte sur la puissance mesurée, jamais sur la composition de
  l'équipe.**
- **La pression compte les joueurs VIVANTS** (`aliveCrowd()`, hystérésis 8 s : on
  descend après délai, on remonte immédiatement), **l'expérience les joueurs
  CONNECTÉS** (`joueurs^WAVE_CROWD_EXP` dans `_addXp`).
- **La progression permanente est EXCLUE de la difficulté par construction** :
  `p.powerMods` = cartes + classe (lu par `_playerPower()`), `p.mods` = copie +
  méta.

### Progression et cartes

- **Une famille de cartes occupe les quatre paliers de rareté, et le palier vaut
  la rareté** (`family`/`tier`). Trois règles indissociables : jamais deux paliers
  de la même famille dans un tirage, un palier supérieur possédé retire les
  inférieurs, les paliers **se cumulent**.
- **Les légendaires sont garanties à des jalons et plafonnées**
  (`LEGENDARY_LEVELS`, `LEGENDARY_MAX`) ; le jalon se déclenche au premier écran
  ouvert **à partir du** niveau seuil. `legendaryLevelDone` vit dans `GameState`.
- **L'EXPÉRIENCE EST UNE VALEUR ÉCRITE PAR TYPE** (`ENEMY_TYPES[i].xp`), versée
  dans `_killEnemy` **avant** tout test de propriétaire. Le **boss crédite en
  continu** depuis `_damage()` (`BOSS_XP_BASE`), sans le surplus du coup fatal. Un
  ennemi **supprimé** ne crédite rien. `score` = valeur tactique.
- **LA VALEUR D'UN KILL S'INDEXE SUR LA MINUTE DE HORDE, jamais sur le niveau
  d'équipe** (`_xpTimeMul()`, `XP_MINUTE_GROWTH`) : indexer l'entrée d'une jauge
  sur sa propre sortie donne une boucle amortie mais **non mesurable**.
  `XP_LEVEL_GROWTH` reste à 1 — la clé documente le refus.
- **UN NIVEAU OUVRE SON ÉCRAN DE CARTES.** Seule exception : le **combat de
  boss**, où les niveaux restent en file. Pas de carte gratuite par boss ; le boss
  reste un point d'étape par la **qualité** de tirage (`BOSS_QUALITY`) et le
  marchand.
- **`computeMods()` ne connaît qu'un chargement et qu'un instant.** Ce qui dépend
  du temps ou des autres joueurs est résolu par `_recomputeMods()`. Elle fait
  **deux passes** : `apply(m, n)` puis `applyAfter(m, n, ctx)` pour les cartes
  conditionnelles.
- **« Cœur de forge » se rejoue à la MONTÉE DE NIVEAU** (`_addXp`). Toute prise de
  carte rejoue **toute la table** quand un « Vœu partagé » est en jeu.
- **Le serveur valide** : la classe choisie (hors emplacement unique pris, refusé
  pendant la manche à laquelle on participe — verrou posé au lancement, levé par
  `unlockClasses()`), et que la carte choisie figure bien dans les trois offertes.
- **La progression est commune à l'équipe** (`state.xp`/`state.level`), gains
  **normalisés sur l'effectif**. Un niveau ne donne rien d'autre qu'un choix de
  carte.
- **Le marchand est un CHOIX, comme l'écran de cartes** : `BUY_PER_VISIT` achat
  par visite (compteur `p.relicBought`, remis à zéro par `openMerchant()`),
  quatre offres tirées aux poids `RELIC_CFG.WEIGHT`, échéance qui **ferme sans
  forcer**, relique achetée **sort de l'offre courante**. Ce qui reste finance les
  **relances**, dont le prix croît **dans la visite** (`p.relicRerolls`,
  `relicRerollCost(niveau, dansLaVisite)`, point de passage `relicRerollPrice()`).
  Le tirage **filtre** sur `minPlayers` et `requiresSystem`. Le boss final clôt la
  manche : cinq visites au plus, pas six.
- **Les reliques vivent dans `p.relics`**, lues par les points d'application :
  dégâts bruts permanents dans `_flatDamage()` (lu par `_shoot()` **et**
  `_playerPower()` — toute source permanente entre dans `powerIndex`), flat boss dans
  `_damage()` (**avant** la redirection Jumeaux), flat PV dans `_recomputeMods()`,
  cadence dans `_players()`, vitesse en **remplaçant** `speedMul`, essaim en
  ajoutant à `mods.swarm`. Elles voyagent dans le champ `relics` du `loadout`.
- **Le bannissement** : `bannedCards` s'unit à `lockedCards()` dans `meta.locked`.
  Bannir **consomme la phase**, écrit **immédiatement** (hook `persist`), et la
  clôture de dépendances (`banClosure`, champ `dependsOn`) s'écrit à plat. Pas de
  débannissement. Pool vidé → carte de secours (`ravitaillement`).
- **L'économie** : `coresForRun` **linéaire et plafonnée** (vague × `CORE_WAVE` +
  boss × `CORE_BOSS`, plafond `CORE_RUN_CAP`), **les jalons ne créditent jamais de
  noyaux**, les **emplacements se gagnent aux jalons** (`slotsFor(profile)`).
  Monnaie versée **à parts égales** (`awardRun`).

### Persistance et comptes

- **Supabase est la SEULE persistance.** Une table `comptes`, **UNE LIGNE PAR
  COMPTE** : authentification en **colonnes**, progression en **jsonb** (`data`) —
  jamais l'inverse. État chaud en mémoire (Map `accounts`). Configuration :
  `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` et rien d'autre. Appels REST en
  `node:https` natif.
- **Les écritures de PROGRESSION n'ont lieu qu'au salon, en fin de manche et au
  départ d'un joueur** — jamais pendant une vague. Les écritures
  d'**AUTHENTIFICATION** partent quand elles arrivent (un upsert par ligne est
  atomique).
- **Écritures CIBLÉES et REGROUPÉES** : `save(pseudoLower)` marque sale, fenêtre
  de 2 s, un seul upsert multi-lignes, sérialisation défensive (une ligne malade
  s'écarte en journalisant).
- **Chargement PAGINÉ** (en-tête `Range`, PostgREST plafonne à 1000).
- Protections : **chargement avant écoute** (`store.ready` avant `listen()`) ;
  **écriture suspendue tant qu'aucune lecture n'a réussi** ; ligne de version
  inconnue **GELÉE** (`frozen`) ; **migrations enchaînées** (`migrate` traverse
  3 → 4 → 5) ; **envoi raté réessayé** (10 s) ; **`flush()` sur SIGTERM/SIGINT**.
  Récupération tardive : n'adopte une ligne distante que si le local est
  **vierge** (`pristine()`).
- **Le compte est pseudo + MOT DE PASSE, la session est un JETON.** Trois portes
  (`register`, `login`, `loginToken`) aboutissent toutes à `finishAuth`. Mot de
  passe haché **scrypt** avec sel par compte (dans `progress_store.js`, jamais
  dans `shared/`), **jamais normalisé**. Jeton : 32 octets aléatoires, seul le
  **sha256** est gardé, expiration **glissante** 30 jours, rangé en
  `localStorage` — **jamais le mot de passe**. Chaque `login` le régénère.
- **Deux freins sur `login`** : cinq essais par connexion (`fatal:1` au-delà) et
  un **gel de 10 s par pseudo cible** après cinq échecs, testé **AVANT** scrypt.
  Un échec de `loginToken` est NORMAL : ni compteur ni gel.
- **La session dupliquée reçoit une copie détachée** (`structuredClone`), jamais
  rangée dans le magasin.
- **Un mot de passe perdu n'a qu'un filet : l'opérateur** (`adminPassReset`).
  `changePass` exige l'ancien et **le jeton actif survit**.
- **La page admin (`/admin`) n'existe que si `ADMIN_KEY` est posée** (sinon 404,
  page comprise) ; clé dans l'en-tête `x-admin-key`, comparée en
  `timingSafeEqual`. Elle liste les comptes depuis la **mémoire** (jamais un
  hachage ni un jeton), réinitialise un mot de passe, supprime un compte (le
  connecté est déconnecté **D'ABORD**) et remet tout à zéro (`store.reset()`,
  refusée si une salle est en manche, après attente de l'envoi en vol, puis
  `kickAccounts`).

### Salon, manche, briefing

- **Le lancement attend que TOUS les présents aient confirmé**, garde des DEUX
  côtés (`notReady()`). Le drapeau `ready` est porté par le **client** et se remet
  à zéro à **trois** endroits : `startRound()`, `attach()`, initialisation client.
  `notReady()` **ne filtre pas les spectateurs**. **À UN SEUL JOUEUR, il rend une
  liste vide** (le client recopie `lobby.length <= 1`). Le bouton désarmé **nomme
  qui manque**.
- **Le lancement est DIFFÉRÉ de trois secondes et n'importe qui l'interrompt.**
  `case "start"` arme `room.launchAt` et diffuse `launch` ; la garde d'hôte reste
  sur le lancement, jamais sur l'annulation. **Conditions revalidées à chaque
  tick** (`tickLaunch`). Un **départ** n'annule pas ; une salle **vidée** si.
- **Le message porte une DURÉE, jamais une échéance.** `why` n'accompagne que les
  annulations subies. `cancelStart` ne rediffuse pas le salon.
- **`renderLaunch()` ne repasse pas par le salon** et est appelé **en dernier**
  par `refreshPanel()`. À l'échéance locale, le bouton se désarme sur
  « Lancement… ».
- **Le briefing de classe retient la VAGUE, pas la simulation** (`state.warmup`,
  `WARMUP_S` = 20 s) : seuls `_waveTick()`, `_spawner()` et le **tir automatique**
  sont retenus ; la recharge continue de descendre. **`this.time` ne court pas
  non plus.**
- **Aucun texte du briefing ne voyage** : tout vit dans `CLASSES`. Le message
  `round` ne porte que `warmup`.
- **L'échauffement se termine au PREMIER DES DEUX** : tout le monde a fermé, ou
  l'échéance tombe. Couper `state.warmup` est le **seul** champ à toucher.
  `briefWaiting()` filtre sur **`state.players` et rien d'autre** (un joueur à
  terre y est, un déconnecté en sort seul). `syncBrief()` a **quatre** appelants ;
  `room.briefOpen` évite les diffusions inutiles ; la phase est testée **dans**
  `syncBrief()`. `client.briefDone` se remet à zéro aux deux mêmes endroits que
  `ready` ; le `briefDone` part du **bouton**, pas de `closeBrief()`.
- **L'attente ne s'affiche qu'à celui qui a DÉJÀ fermé** (`#hudBrief`), nomme qui
  manque (noms jusqu'à deux, compte au-delà), reprend le compte à rebours, en
  **blanc**.
- **Une pause n'a de sens qu'à UN SEUL joueur**, accordée par le serveur
  (`pauseReal` ne vaut vrai que sur sa réponse). Trois refus : hors manche,
  demandeur pas en jeu, **dès qu'un second client est connecté**. Elle se lève
  seule au bout de **5 minutes** ou à l'arrivée d'un second joueur. **Les
  recharges et les états ne s'écoulent pas** (il suffit de ne pas appeler
  `step()`).
- **L'historique appartient à la SALLE** (`room.history`), rempli par
  `recordRound()` aux DEUX sorties, plafonné à `ROUND_HISTORY_MAX` (8), porte la
  **vague atteinte et rien d'autre** (ni victoire ni défaite), heure en
  **horodatage absolu**.
- **La latence est une propriété de la CONNEXION** : `rtt` sur `WsConnection`,
  `hub.pingAll()` à 1 Hz (dans `server.js`, jamais dans le tick). Horodatage dans
  la **charge du ping** (la RFC impose au pair de la renvoyer). Un pong de huit
  octets est une réponse ; toute autre longueur est ignorée. **Moyenne
  exponentielle**, diffusée **sur événement**. `-1` = inconnu, affiché en tiret.

### Biome et environnement

- **LE BIOME NE COÛTE RIEN AU RÉSEAU** : deux nombres (index, graine) dans le
  payload de salon. La géométrie se **régénère à l'identique des deux côtés**
  (`buildBiome`, mulberry32 écrit à la main), l'état d'un danger est une
  **fonction du temps de manche**.
- **Seule exception : les PV d'un mur destructible** (clé `ob`), liste **creuse**
  de paires (index, part de PV), **absente** tant que rien n'a été touché.
- **Un danger d'environnement est du SOL, jamais un télégraphe** : il s'annonce
  par sa **géométrie permanente**. Le canal du télégraphe instantané appartient au
  **boss** et ne se partage pas.
- **Le plafond de surface est STRICT** (`BIOME_CFG.HAZARD_SURFACE_MAX`, 12 % pour
  l'ensemble, traînées et spores comprises). `buildBiome` **jette** les dangers
  qui franchissent le budget.
- **La géométrie est posée à la construction et ne bouge plus.** Ce qui peut
  naître en cours de manche : les zones, traversables. `verifierBiomes()` est le
  critère rejouable (plafonds, aucun danger en calme, aucun danger **qui blesse**
  en normal, **passage traversable dans le carré central minimal** `SHRINK_MIN`).
- **La géométrie est la MÊME dans les trois modes, seuls les dangers changent.**
- **Un mur destructible ne cède qu'au TIR DU JOUEUR, ne rend NI SCORE NI
  EXPÉRIENCE, et ne passe PAS par `_damage()`.**
- **Une météo est un MODIFICATEUR GLOBAL, jamais une entité** (cauchemar
  seulement, un segment sur trois sans). Déduite de `(graine, segment)`, mais
  **annoncée** par le canal d'alerte en `ALERT_INFO`. La **brume** n'assombrit que
  les **bords** ; la **bourrasque** pousse **joueurs et ennemis**.
- **Les points de récolte** n'apparaissent jamais à moins de
  `HARVEST_PLAYER_DIST` d'un joueur vivant, ni pendant un boss. Le cristal se
  détruit **hors de `_bulletHitEnemy()`**. Les **éclats** sont versés à **chaque**
  joueur et meurent avec le `GameState`.

## Registres partagés serveur ↔ client

Ajouter une entrée impose de traiter les deux côtés.

| Registre | Serveur | Client |
|---|---|---|
| `kind` d'effet | 0 nova · 1 balayage · 2 niveau · 3 ricochet (2 points de plus) · 4 balise/relèvement/purification/Sentence · 5 élite · 6 barre brisée · 7 explosion · 8 onde blanche · 9 rempart · 10 provocation · 11 vague de soin · 12 bombe · 13 salve (2 points de plus) · 14 absorption | `drawEffects()` |
| type d'ennemi | `ENEMY_TYPES` (`enemies.js`), élite à +100 | `ENEMY.TINT` (`palette.js`) + `plan()` (`e{type}_*`) + `DEATH_BURST` + `enemyFrame()` |
| trait | `TRAITS` + `TRAIT_CFG` (`enemies.js`) ; attachement dans `DIFFICULTIES[i].traits` — **l'index ne circule pas** | `traitsOf()` dans `render/actors.js` |
| profil de difficulté | `DIFFICULTIES` (`game_state.js`) | `renderVoteDetail()` + `applyPalette(diffIndex)` |
| décor de mode | `DECOR` (`palette.js`) — **ne circule pas** | `decor` dans `render/stage.js`, lu par `render/decor.js` |
| classe | `CLASSES` (`classes.js`) | sélecteur du salon + `buildPips()`/`updatePip()` |
| couleur d'un joueur | `assignColors()` (`room.js`), index dans `colorIndex` | `PLAYER_COLORS` via `colorOf`/`ownerColorOf` |
| bits de compétence | `SKILL_HEAL_MODE` · `SKILL_TAUNT` · `SKILL_OVERDRIVE` | teinte, halos, icônes |
| états | `STATUSES` (`statuses.js`), bit dans `_statusMask()` | `STATUS_ICON` + halo + cadre d'équipe |
| `shape` de zone | 0 disque · 1 rect · 2 anneau · 3 cône · 4 Pac-Man · 5 croix | `zonePath()`/`zoneSubPath()` + `_zoneHits()` |
| bits de buff | `BUFF_DAMAGE` … `BUFF_RICOCHET` | anneaux + bandeau HUD |
| bonus | `_applyPowerup()` ; `POWERUP_ROTATION` dit ce qui **tombe**, `POWERUP_TYPES` ce qui **circule** | `POWERUP_ICON` + `POWERUP_STYLE` |
| clés de `mods` | `defaultMods()` (`cards.js`) | rien |
| tags de carte | `tags` (`off`, `def`, `coop`, `cadence`) | rien |
| script | `SCRIPT`/`SCRIPTS` (`timeline.js`), variante en clair (un NOM) ; clé `sg` | `updateSegment()` + `gameIntensity()` |
| géométrie d'apparition | `GEOMETRIES` (`timeline.js`) — **ne circule pas** | rien |
| boss | `BOSS_ROSTER` (`bosses.js`), index dans `bo[9]` ; `bars` au roster ; `BOSS_POOL_COUNT` | `drawBoss*()` + `BOSS_SKIN` + `#hudBoss.final` + `phaseUnlockText()` |
| mécanique | `MECHS` (`bosses.js`), index dans l'alerte et `mk` | `drawMarks()` + `pushAlert()` |
| événement | `EVENTS` (`timeline.js`), index dans l'alerte et `ev` ; colonne `event` des beats | `eventAt()` + bandeau de segment + `evenementDebut`/`evenementFin` |
| biome | `BIOMES` (`biomes.js`), index + graine **une fois** au salon | `buildBiome()` rejoué + `drawObstacles()`/`drawHazards()` |
| danger | `HAZARDS` + `BIOME_CFG` — **ne circule pas** ; `hazardState(h, t)` | `drawHazards()` + `groundAt()` + `danger` dans `events.js` |
| couverture destructible | `maxHp` sur un obstacle ; `_obstacleHit()` ; clé creuse `ob` | liseré tireté + blocage rejoué + `murDetruit` |
| météo | `WEATHERS` (`biomes.js`), index dans l'alerte ; `weatherFor(diff, graine, segment)` | `weatherAt()` + `drawVignette()` + `stepPrediction()` |
| attaque de boss | chaînes du `base`/`unlock`, dispatchées par `_atk()` | `ATTACK_LABEL` — **ne circule pas** |
| niveau d'alerte | `ALERT_ORDER` · `ALERT_WARN` · `ALERT_INFO` | `updateAlerts()` : consigne cyan à rebours · avertissement ambre · info blanche |
| provenance d'un dégât | `DAMAGE_SOURCES` (`game_state.js`), **sept** entrées, index en fin du tuple joueur | `SRC_ICON` (`icons.js`) + `SRC_TINT` (`palette.js`) + `hudDamage()` + `renderHurtBy()` |
| soins rendus | `p.healDealt`, champ `heal` de `scoreboardRows()` | colonne « soins » du bilan |
| magnitude d'un souffle | `n` sur l'effet, 9ᵉ élément (index 8, coupé si nul) — nova, grenade, onde, bombe | `BLAST_STYLE` + `spawnBlast()` + force du son |
| critique | `critSeq` sur l'ennemi (index 8) ; `p.critKills` (index 34) | `crits` de l'impact, `crit` de la mort — teinte ambre, coup de zoom, éclats |
| propriétaire d'une balle | 4ᵉ élément du tuple `b` | `ownerColorOf(b.owner) ?? COMBAT.bullet` |
| lien de soin | `_healLinks()` ; clé `hl`, triplets `[soigneur, cible, ennemi]`, **absente** hors posture | `drawSoinLinks()` : soin chaud et **calme**, siphon froid et **agité** |
| intervalle de tir | `p.fireInterval`, 34ᵉ élément du tuple joueur | `fireInterval` (`ingest.js`) + ligne « cadence » de `ui/build.js` |
| catégorie de carte | `CATEGORIES` + `cardCategory()` — **ne circule pas** | `CARD_CATEGORY_COLOR` + `.cardCat` |
| hub des salles | `listRooms`/`createRoom`/`joinRoom`/`leaveRoom` → `rooms`/`roomJoined`/`joinRoomError`/`roomClosed` | `#hubScreen`, `renderRooms()`, `enterHub()`, `inRoom` |
| identité | `register`/`login`/`loginToken`/`logout`/`changePass` → `welcome{pseudo,token?,dup}`/`authError{motif,fatal?}`/`passChanged`/`loggedOut` | `#gate`, bloc compte du hub, `survivor.token` |
| lancement différé | `start`/`cancelStart` ; `room.launchAt`, `launchPayload()`, `tickLaunch()` → `launch{delay,why}` | `#start` (+ `.cancel`), `renderLaunch()`, `launchEndsAt` |
| état prêt | `ready{on}` ; champ `ready` de `lobbyPayload()` ; `notReady()` | `#readyBtn` (+ `.on`), `.teamRow.ready`, `#teamReady`, `#waitMsg` |
| latence | `WsConnection.rtt` ; champ `ping`, `-1` si inconnu | `.teamPing` |
| historique | `room.history` (`{at, diffIndex, wave}`) | `renderHistory()` → `#historyList .histRow` |
| pause | `pause` → `paused` ; `setPaused()` | `#pause`, `pauseReal`, `renderPauseState()` |
| briefing | `state.warmup`, `WARMUP_S`, champ `warmup` du `round` | `#brief`, `openBrief()`/`closeBrief()` |
| briefing fermé | `briefDone` → `briefState{waiting:[noms]}` | `#hudBrief`, `renderBriefWait()` |
| victoire | `state.victory`, `state.finalKill`, clés du `roundEnd` ; `bestFinalRun` | `#bilan.win` + `.bilanStat.final` |
| transition | `round`/`roundAbort`/`roundEnd`/`cards`/`cardsWait` | `pushWorld()` — jamais à la réception |
| sortie de manche | `leaveRound` : `removePlayer` + spectateur | bouton du menu pause, avec confirmation |
| version | `VERSION` (`shared/version.js`), clés `version` et `commit` du `welcome` | `#version` + `updateVersion()` : ambre `.stale` **sans le hash** |

**Registres purement CLIENTS** (ils se déduisent du snapshot ou de la liste de
cartes, déjà diffusée) : image de sprite (`plan()` dans `sprites.js`, adressée par
NOM via `frameOf()`), son (`PALETTE` + `SOUND_GAIN` dans `audio.js`), échantillon
(`SAMPLES`), piste audio (`TRACKS` dans `tracks.js` — manifeste **écrit**, un
navigateur ne liste pas un dossier), `kind` → son (`EFFECT_SOUND` dans
`render/fx.js`), glyphe posé sur un joueur (`PLAYER_MARK` + `paintMarkGlyph()`),
effet possédé (`EFFECT_BADGES` dans `icons.js`), façon de mourir (`DEATH_BURST` —
le rang d'élite reste **orthogonal** au type ; un gros morceau tourne lentement ;
l'orientation voyage avec la mort), cible d'un son d'interface
(`UI_SOUND_SCREENS`/`UI_SOUND_TARGETS`, **miroir** de `--cursor-go` dans
`menus.css`), type d'événement client (`diffSnapshots()` dans `events.js`).

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
- **La couleur est fonctionnelle, jamais esthétique** : cyan `il faut y aller` ·
  ambre `danger, sortir` · rouge `danger létal` · blanc `ça concerne un allié` ·
  violet `persistant` · vert `gain, soin`. **Jamais de rouge pour quelque chose
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
- **Le cyan dit « c'est toi »** : nom en tête de la build, colonne score de sa
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

## Équilibrage

Toute la courbe de pression vit dans `CFG` en haut de `shared/game_state.js` :
on compare des réglages en surchargeant `CFG` depuis un script de mesure.

- **Remesurer plutôt qu'extrapoler.** Plusieurs ajustements de cette base se sont
  révélés contre-intuitifs à la mesure.
- **Pour juger une mécanique de boss, la bonne mesure est l'écart entre un joueur
  qui lit les annonces et un joueur qui les ignore.** Écart faible = mécanique
  punitive, pas difficile.
- **Toute mesure précise son profil de compte** : `metaProfil(profil, cls)` rend
  les trois profils de `PROFILS.md` (P0 neuf, P1 engagé, P2 complet) dans la forme
  exacte que `room.js` construit au lancement — **emplacements compris** : une
  ligne achetée mais non équipée ne s'applique pas, et les **cartes verrouillées**
  d'un compte neuf en font partie. Écart attendu **sous 1,5 vague** ; s'il dépasse,
  réduire le **nombre d'emplacements**, jamais les valeurs.
- **DEUX BOTS, ET ILS NE SE REMPLACENT PAS.** `botInput` est celui des lots A à H
  (il avance sur le corps le plus proche) : le toucher déplacerait toutes leurs
  mesures. `pilotage()` est le **pilote** du lot I — il recule, esquive les zones
  par `_zoneHits`, relève, ramasse et **consomme ses recharges**. Un critère de
  **survie** se mesure avec le pilote, un critère de **population** avec le bot.
  Un taux d'utilisation de compétence est la mesure du pilote, pas de la classe.
- **UNE POSTURE QUI COÛTE LE TIR NE SE TIENT PAS EN PERMANENCE.** Lier « dès qu'un
  allié n'est pas plein » fait perdre un tiers de la manche à la table 1/1/2
  (1 401 s contre 2 106). Et le seuil se lit sur les **PV seuls** : lire PV +
  bouclier paraît plus fin, mais le bouclier tient les alliés à plein, donc le
  déclencheur ne part jamais. Les deux variantes ont été mesurées, pas devinées.
- **Une matrice « classe × effectif » n'existe qu'en SOLO** : Rempart et Soigneur
  sont `unique`, donc au-dessus d'un joueur la comparaison est une **composition**
  (`COMPOSITIONS`), et « deux tanks deux soigneurs » n'est pas jouable.
- **Un taux de réussite absolu n'est pas mesurable sans pilote humain** : la
  matrice de `PROFILS.md` est le critère de clôture du plan, pas un critère de lot.
  Ce qui se mesure en simulation est le **relatif** — classe contre classe, profil
  contre profil, composition contre composition, à graines appariées.
- **Le plafond n'est plus le régulateur de fin de manche** (lot A) : il ne mord
  plus que dans trois cas sur neuf, tous après la minute 9. Ce qui règle le
  plateau est le **débit face à ce que l'équipe nettoie**. Contrainte =
  lisibilité, pas CPU — le moteur tient 1600 corps sous les 16 ms.
- Les chiffres relevés vivent dans `LISEZMOI.md` ; le chantier d'équilibrage en
  cours dans `docs/superpowers/specs/plan6/`.

## Conventions

- **Commentaires et identifiants en français sans accents** (`degats`,
  `reanimation`, `telegraphiee`). **Chaînes affichées au joueur avec accents.**
- **LE MINIMUM DE COMMENTAIRES POSSIBLE.** Par défaut : **aucun**. Un commentaire
  coûte des tokens à chaque lecture, et le dépôt est lu bien plus souvent qu'il
  n'est écrit. On n'en écrit un que si le code ne peut pas porter l'information —
  valeur mesurée, piège déjà payé, alternative rejetée — et il est **court**.
  Jamais de paraphrase, jamais de bannière de section. Ce qui explique un **choix
  de conception** appartient à ce fichier, pas au code.
- **La documentation suit la même règle** : on n'écrit que ce qu'on ne peut pas
  relire dans le code. Pas de fichier de doc entretenu « pour la forme ».

## Workflow d'exécution

**LE MODÈLE SUIT LA TÂCHE, PAS LE LOT.** Un lot mélange presque toujours les
trois natures ci-dessous ; on découpe par nature avant de déléguer.

| nature de la tâche | qui | pourquoi |
|---|---|---|
| **inventaire, relevé, vérification** (lister les `kind` émis, croiser deux tables, confirmer qu'un champ est mort, `node --check`) | `caveman:cavecrew-investigator`, modèle **haiku** | lecture seule, réponse factuelle, sortie compressée |
| **édition bornée à 1-2 fichiers, spec déjà écrite** (table de sons, entrée de palette, texte d'annonce, constante) | `caveman:cavecrew-builder`, modèle **sonnet** | la décision est prise, il ne reste que la frappe |
| **logique de simulation, invariants croisés, conception** (points de passage uniques, boss, équilibrage, couches client) | **le fil principal**, opus | un invariant de ce dépôt se tient en tête, pas en prompt |

Trois règles qui font l'économie :

- **On ne délègue jamais une décision**, seulement une exécution ou un relevé. Un
  agent qui doit choisir entre deux conceptions coûte plus cher que de l'écrire.
- **Un agent part froid** : tout ce que le fil principal sait déjà et qu'il
  faudrait réexpliquer annule le gain. En dessous de trois fichiers à ouvrir,
  faire soi-même.
- **Le relevé se délègue, l'écriture qui touche `game_state.js` non.**

**Un lot livré = un commit = un bump** (voir *Version*). L'ordre des lots d'un
plan est celui des numéros de `docs/superpowers/specs/planN/`.
