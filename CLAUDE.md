# CLAUDE.md

Mini survivor multijoueur LAN. Serveur Node autoritaire, client navigateur,
**zéro dépendance** (WebSocket réimplémenté dans `ws_lite.js`). Pas d'étape de
build : les modules ES sont servis tels quels.

Ce fichier est chargé à **chaque** session : il ne porte que ce qui vaut pour
*toute* tâche. Le détail d'un domaine vit dans `docs/regles/`, qui n'est **pas**
chargé — on l'ouvre quand la carte ci-dessous le dit. Les mesures vivent dans
`LISEZMOI.md`, lu seulement quand on règle un chiffre.

Aucun récit, aucune justification longue, aucune mesure.

## La carte

**Ouvrir le fichier de règles AVANT d'écrire**, pas après. Chacun porte ses
invariants, ses points de passage et ses pièges déjà payés.

| tâche | fichier à lire |
|---|---|
| logique de jeu, ennemis, boss, zones, états, script, biome | `docs/regles/SIMULATION.md` |
| snapshot, socket, salles, comptes, salon, persistance | `docs/regles/RESEAU.md` |
| canvas, WebGL, sprites, HUD, CSS, écrans, audio | `docs/regles/RENDU.md` |
| cartes, armes, hauts faits, reliques, progression, équilibrage | `docs/regles/CONTENU.md` |
| texte affiché au joueur, traduction | `docs/regles/LANGUES.md` |
| chiffres relevés, protocoles de mesure | `LISEZMOI.md` |

Une tâche qui touche deux domaines lit les deux. Une tâche qui n'en touche
aucun — renommage, commentaire, outillage — n'en lit aucun.

## Les pièges silencieux

Ils ne lèvent aucune erreur, ils produisent du **silence**. Ils valent partout,
donc ils restent ici ; le pourquoi est dans le fichier de domaine.

- **UN CHAMP DONT LA SEULE LECTURE EST MORTE SE SUPPRIME, il ne se répare pas.**
  En JS un champ absent rend `undefined`, donc `NaN`, donc rien. Un `grep` du
  champ retiré fait partie de la suppression d'un système.
- **Les tableaux exportés sont ORDONNÉS et leur index circule sur le réseau** :
  `POWERUP_TYPES`, `ENEMY_TYPES`, `DIFFICULTIES`, `CLASSES`, `STATUSES`,
  `BOSS_ROSTER`, `MECHS`, `EVENTS`, `BIOMES`, `WEATHERS`, `DAMAGE_SOURCES`,
  `ARMES`, `CARDS`. **Append-only** : insérer au milieu réécrit le sens de tous
  les instantanés et reverrouille des déblocages chez les comptes existants.
- **Les instantanés sont des tableaux positionnels** : on ajoute un champ à la
  **fin**, jamais au milieu, et le client lit avec un repli. Avant d'ouvrir une
  clé, chercher si la valeur est une **fonction de ce que le client a déjà**.
- **Un module client n'importe QUE des modules d'indice strictement inférieur**
  dans la liste d'architecture, et **écrire dans l'état d'un autre module passe
  par un setter**. Une liaison ES est vivante en lecture, morte à l'écriture.
- **Les distances s'affichent en mètres, la simulation reste en pixels.**
  `shared/units.js` (`PX_PER_M = 20`, `toM`, `fmtM`) ne sert **qu'**à écrire un
  texte destiné à un joueur. **Ne jamais convertir** une constante de `CFG`,
  `CARD_CFG`, `SKILL_CFG`, `STATUS_CFG`, `BOSS_CFG` : une description compose
  `fmtM(LA_CONSTANTE)`, elle ne recopie pas un nombre.
- **Le français reste écrit à côté de sa donnée et sert de repli** ; une langue
  étrangère est une surcharge par clé. Tout texte passe par `t()`/`tf()`/`tn()`.

## Commandes

```bash
npm start                 # serveur sur le port 7777
PORT=8123 node server.js
node --check server.js    # pas de linter dans le projet
npm run version-check     # refuse un deploiement sans bump
```

`ROOM_GRACE_MS`, `ROOM_MAX`, `BIOME`, `GRAINE` et `BANC` sont surchargeables par
l'environnement, **pour les tests uniquement**.

```bash
BANC=1 BIOME=fonderie GRAINE=7 npm start   # puis http://localhost:7777/?banc&perf
```

**Le banc** demande ses DEUX moitiés : `BANC=1` côté serveur, `?banc` côté
client. Touches : **1-0** les dix armes, **[** et **]** la densité par pas de 50,
**H** coupe le HUD — le test du nom masqué exige que *tout* ce qui nomme l'arme
se taise, l'étiquette du banc comprise —, **R** lance un relevé de 10 s qui
imprime une ligne prête à coller dans `LISEZMOI.md`.

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
telemetry.js           trace JSONL d'une VRAIE partie — serveur SEUL, hub ecrivain
version_check.js       refuse un deploiement sans bump
progress_store.js      persistance Supabase — serveur SEUL, memoire + replique
shared/game_state.js   LOGIQUE PURE — importee par le serveur ET le navigateur
shared/cards.js        cartes, raretes, tirage, calcul des mods
shared/classes.js      les 3 classes, constantes de competence
shared/statuses.js     les 4 etats, priorite de purge
shared/bosses.js       roster des 5 boss + le final, registre des mecaniques
shared/enemies.js      LE BESTIAIRE — 9 types, 6 traits, attachement, adaptType
shared/navigation.js   OU VA LA HORDE — grille de 40 px, UN champ par JOUEUR
shared/reliques.js     le catalogue des reliques
shared/progression.js  la meta : arbres, noyaux, jalons, emplacements
shared/armes.js        LES ARMES : 10 fiches, coefficients d echelle, conversions boss
shared/hauts_faits.js  LES HAUTS FAITS : 36 exigences, 13 cadres, recompenses NOMMEES
shared/timeline.js     LE SCRIPT — six segments, trente beats, TROIS variantes, les EVENEMENTS
shared/biomes.js       LE LIEU — cinq biomes, cinq dangers, trois meteos, generateur DETERMINISTE
shared/feedback.js     CE QUE LE COMBAT DIT : famille d arme et matiere de creature, DEDUITES
shared/units.js        pixels -> metres, SEUL point de conversion d'affichage
shared/i18n.js         LA langue : cle -> texte, le FR restant le REPLI
shared/lang/en.js      le dictionnaire anglais, SURCHARGE par cle
shared/version.js      LA version + le CHANGELOG en commentaire
shared/palette.js      LA CHARTE — couleurs, rampes, echelle typo
public/client.js       AMORCE : importe tout, cable, lance la boucle (44 lignes)
public/core/state.js   COUCHE 0 : etat de session et de partie, n'importe RIEN
public/ui/dom.js       TOUTE reference DOM du jeu + helpers de texte
public/render/stage.js canvas, ctx courant, camera, gl, decor de mode, biome, souris -> monde
public/net/interp.js   horloge de rendu, interpolation, worldQueue / alertQueue
public/render/fx.js    particules, impacts, morts, chiffres de degats, tressaillement
public/render/material.js la MATIERE du sol : deux tuiles + l ARRIERE-PLAN, cuits par (biome, mode, graine)
public/render/props.js LE SEMIS : props deterministes par cellule monde, rien ne bloque
public/render/blocs.js LA MASSE BATIE : 4 silhouettes, 4 habillages, ledDe()
public/render/dangers.js LES DANGERS : table (biome, kind) -> dessin, le collider reste invisible
public/render/lumiere.js LA LUMIERE : tampon quart de vue, multiply + lighter sur le SOL
public/render/decor.js LE SOL : grille, vignettage, obstacles, dangers
public/render/actors.js zones, projectiles, structures, ennemis, bonus
public/render/boss.js  boss, marques de mecanique, joueurs
public/render/world.js ORCHESTRATION : ordre de dessin, boucle, prediction, resetFeedback
public/ui/cadres.js    LES CADRES a l ecran : 12 insignes, appliquerCadre()
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
docs/regles/*.md       LES REGLES par domaine — pas chargees, voir la carte
LISEZMOI.md            les chiffres releves et les protocoles de mesure
```

Un seul port sert les fichiers **et** les WebSocket. `resolvePath()` route
`/shared/*` depuis la racine du dépôt, le reste depuis `public/`.

**`shared/game_state.js` ne référence jamais le DOM, le canvas, le clavier ni le
réseau.** `classes.js`, `statuses.js`, `bosses.js`, `enemies.js`,
`progression.js`, `navigation.js` et `biomes.js` ne dépendent de **rien**. Deux exceptions, toutes
deux feuille → feuille et sans cycle : `timeline.js` importe `ALERT_*` de
`bosses.js`, et tout ce qui porte du **texte de joueur** importe `i18n.js`
(`cards.js`, `reliques.js`, `units.js`).

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

## Points de passage uniques

Y brancher toute mécanique nouvelle plutôt que d'ouvrir un second chemin.

| point | ce qui y est branché |
|---|---|
| `_hurt(p, d, opts)` | **tout** ce qui blesse un joueur ; multiplicateur de difficulté **ici et nulle part ailleurs** ; plafond de mécanique ; provenance |
| `_damage()` | **tout** ce qui blesse un ennemi ou le boss ; vol de vie, critique, momentum, exécution, brûlure, `hitSeq`, `critSeq`, point d'impact du boss, redirection Jumeaux, crédit XP du boss |
| `_blastPush(x, y, r, force)` | **toute** impulsion radiale d'un souffle, et le trou d'apparition qui va avec (`_dansUnTrou`) |
| `_healLinks(dt)` | accrochage, rupture, soin, réanimation et siphon du Soigneur ; `_postureLinks` = la posture, `_sanctLinks` = le dôme (ni plafond ni rupture) |
| `_ultFire(p)` | **tout** ce que déclenche une 3ᵉ compétence, à l'échéance de l'amorce ; effet d'écran et marqueur d'équipe posés une fois pour les trois |
| `drawArc(clef, x0, y0, x1, y1, opts)` | **tout** ce qui relie deux points par un arc : ricochet, salve, lien de soin, chaîne d'Ancre, lien des Jumeaux. `flow` porte le SENS |
| `RING_*` (`render/fx.js`) | les bandes de rayon autour d'un personnage — lues par `boss.js` **et** par les éclats de coque |
| `drawShieldShell()` | l'état du bouclier à l'écran ; `spawnShieldOn` / `spawnShieldBreak` ses deux fronts |
| `spawnBlast(x, y, r, ampleur, style)` | les couches chaudes d'un souffle, mises à l'échelle par la magnitude |
| `_applyStatus()` / `_purgeStatus()` | pose et retrait d'état |
| `_poserBonus(type, x, y)` | LA pose d'un bonus au sol — les cinq sources y passent, et `max` (la durée de vie, raccourcie par la cendre) est ce qui permet au compte à rebours d'exister |
| `POWERUP_POIDS` / `_contexteBonus()` | QUAND un bonus tombe : PV manquants, densité, boss, joueurs à terre, et ce que les **armes de l'équipe** savent lire. Jamais un interdit — `CFG.POWERUP_PART_MIN` garde tout type tirable. Aucun levier de difficulté ici |
| `_soinBonus(p, montant)` / `_capBonus(p)` | ce qu'un bonus rend au CORPS : le surplus de soin part en bouclier, `noHeal` coupe la part PV et laisse passer le tampon, et le plafond s'ajoute à la jauge de la build au lieu de la remplacer |
| `bonusFamille(cle)` (`shared/feedback.js`) | ce qu'un bonus DIT : la famille donne la forme du socle, la matière de la gerbe et la CLEF du limiteur — la même pour les trois. La teinte reste celle du type |
| `ARME_EXIGENCE` (`shared/reliques.js`) | ce qu'une relique exige de l'ARME portée. Lu par `_offerRelics()` **et** par `visePalier()` : un seul des deux et l'acheteur vise un palier que le tirage ne peut pas montrer |
| `_killEnemy()` | **toute** mort d'ennemi : XP, explosion du kamikaze, cumuls |
| `_bulletHitEnemy()` | une balle qui touche — appelé par la boucle de collision **et** le balayage à l'apparition |
| `_groundZone()` | toute zone posée par la horde, plafond global `trailMax()`. **Un `pj` non nul n'y arrive que par `terrain_conquis`** — c'est ce qui rend le sol brûlant reconnaissable côté client sans champ de réseau en plus |
| `drawZonesActive(list, tm, pj)` (`render/actors.js`) | LA zone persistante. Sur une zone de joueur, la COULEUR dit à qui (le contour, seul) et la MATIÈRE dit quoi (`ZONE.braise*`) — la teinte d'équipe sur les quatre canaux faisait cracher des braises bleues au sol brûlant. Tenu à l'écart de `BIOME.hazard`, qui dit « évite » alors que ce sol ne blesse que la horde. Lit `pj` et JAMAIS la couleur : `ownerColorOf` rend `null` dès qu'un joueur quitte le salon |
| `plafonnerHp(maxHp, mods)` | LE plafond de PV, et il est le **dernier** : cartes, classe, méta puis reliques passent devant lui |
| `_harvestDamage(h, dmg)` | tout ce qui entame un cristal — balle, faisceau, arc, balayage, souffle de joueur ; la **géométrie** appartient à l'arme |
| `porteeReticule(ar)` | la distance au réticule, assainie ; chaque usage pose sa propre borne |
| `_summonMul(p)` | **toute** source de dégâts qui n'est pas le tir : lame orbitale, essaim, drone, tourelle, pulsar, onde de mort |
| `appliquerEchelle(mods, arme)` | ce qu’une arme tire de chaque statistique de carte |
| `axesDeCarte(c)` | les axes du tableau d’échelle qu’une carte touche — **relevés** sur `apply`/`applyAfter`, jamais déclarés |
| `litCanons(a)` | quelles armes lisent `extraBarrels`, donc lesquelles paient `barrelDamageMul` |
| `conversionBoss(a)` | ce qu’une arme rend contre une CIBLE UNIQUE |
| `ficheDe(a)` / `poids(a)` (`shared/feedback.js`) | ce qu’une arme DIT : la famille donne la matière (et la CLEF du limiteur de voix), `interval` donne l’échelle. Trois familles rendent `son: null` — leur délivrance sonne déjà, un son de départ la doublerait |
| `voixDe(def)` / `echelleBoss(def)` (`shared/feedback.js`) | ce qu'un BOSS dit en arrivant et en se brisant. L'ARCHÉTYPE donne la matière — c'est déjà ce qui sépare les boss, et `verifierArchetypes()` en garantit l'unicité sur le pool ; les BARRES donnent l'échelle, seul axe qui sépare les trois finaux, tous « fixe ». UNE recette (`bossVoix`), neuf jeux de paramètres |
| `matiereDe(def)` (`shared/feedback.js`) | ce qu’une créature DIT en mourant, déduit de ce qu’elle fait (`splits`, `heal`, `auraRadius`). La case d’atlas se lit à l’appel, jamais dans la table |
| `MATIERE[i].touche` (`shared/feedback.js`) | ce qu’une créature dit quand on la TOUCHE. Le PALIER dit combien, la MATIERE dit à quoi — et elle n’ajoute AUCUNE particule : `PALIER` garde le compte, le cône et la vitesse, `touche` ne fait que les plier |
| `finalDe(def)` / `finalRayon(def)` (`shared/feedback.js`) | l’ACTE FINAL d’une mort, déduit de ce que la créature TENAIT — lien, champ, ou masse. Quatre lignes du bestiaire sur treize, et c’est la condition pour que ce soit un fait notable |
| `PALIER` (`render/fx.js`) | LE budget d’une touche, une colonne par canal : éclair, recul, éclats, vitesse, cône, poussière, tressaillement. Une règle de plus qui ne serait pas une colonne ici est une règle qui divergera |
| `verifierEffets(g)` (`shared/game_state.js`) | un champ posé sur un effet et jamais transporté. Trois défauts du dépôt étaient de cette forme, et `??` les taisait tous. Les emplacements du tuple se MESURENT, ils ne se déclarent pas |
| `_sensBoom(b)` | le SENS d’un souffle de projectile, relevé sur le vol et jamais sur la visée ; `undefined` dit radial. C’est ce qui sépare l’obus du siège de la grenade lobée |
| `routerArme()` (`public/render/world.js`) | ce qu’une ressource d’arme DIT, et elle ne le dit qu’à SON porteur : chaleur, charge, chargeur, rampe. Aucune de ces voix ne dispute sa place à celles de la horde |
| `arcLot` / `flushArcs()` (`render/fx.js`) | une CHAÎNE est un événement, pas trois : les segments d’un même tir arrivent dans le même lot, on les cumule et on sonne une fois avec la longueur |
| `verifierFeedback(armes, types, recettes)` | croise les deux tables avec `recettes()` d’`audio.js`. **Un nom de recette faux ne lève rien** : `playSound` rend `false` et l’événement devient muet |
| `palierDe(e)` (`render/fx.js`) | LE palier d’une touche, de la part de PV retirée. `hits === 0` = dégât CONTINU, pas une touche — le serveur le dit déjà en n’incrémentant pas `hitSeq` |
| `bossTouche(e)` | la touche d’un boss, en part de BARRE et en racine. Chemin séparé : son événement n’a pas de `hits`, le barème de la horde le rendrait muet |
| `_armeTick(p, arme, dt, tir)` | la ressource d’une arme : rampe, chaleur, charge, chargeur |
| `_surSegment(px, py, dx, dy, portee, large)` | la projection sur un segment : accrochage du tesla **et** balayage du faisceau |
| `_sousArme(id, fn)` | l’attribution des dégâts à l’ARME plutôt qu’à la build ; le drapeau voyage sur la balle jusqu’à l’impact |
| `difficulte(a)` / `cibleArme(a)` | ce que l’arme exige du joueur, et ce qu’elle a donc le droit de rendre |
| `hfStatsDeManche(p)` | ce qu'une manche produit pour un joueur, dans la forme qu'attend l'évaluation |
| `vueStats` / `cumulerStats` | la FUSION (lecture) et le REPLI (écriture) des cumuls de profil — les inverser compte la manche deux fois |
| `evaluerHautsFaits()` | l'obtention d'un haut fait, en cours de manche comme à la fin |
| `_causeBlast` | ce qui compte comme « tué par explosion » : `_explode` **et** `_bombBlast`, qui résout son souffle lui-même |
| `_windupSature()` / `_windupCompte()` | budget de préavis de ruée, par vue |
| `_wave(x, y, r, dmg, owner)` | l'onde blanche des cartes (l'horloge de manche s'appelle `_segmentTick(dt)` — deux méthodes de même nom s'écrasent en silence) |
| `_spawnPoint(geom, r)` / `_pushOffScreen` / `_edgePoint` | apparition et repoussage hors vue |
| `_grille()` | voisinage spatial : séparation entre ennemis **et** ennemi/joueur |
| `_nav()` / `_navChamp(cible)` (`shared/navigation.js`) | OÙ VA UN CORPS. Trois couches, une seule ici : le champ dit **où aller**, la tangente de `_enemies()` **comment éviter**, `_separate*` **comment se tasser**. Un champ par **JOUEUR**, jamais par ennemi — le coût ne suit pas la population. Le champ ne sert QUE si `droitPossible()` refuse la ligne droite : en terrain libre, le comportement est celui d'avant, au pixel près. Un corps plaqué contre une boîte est DANS une case fermée : son côté ne se déduit pas, il se **souvient** (`navAncre`). Et le point visé se rejoint **en ligne droite**, sinon la tangente locale annule la composante qui ferait tourner le coin |
| `enemyCap(diffIndex, joueurs)` / `_enemyCap()` | plafond de population, serveur **et** HUD |
| `enemySpeed(type, minute, diff, tirage, elite)` | vitesse d'un ennemi — apparition **et** vérificateur |
| `_clampToBounds()` / `_dropPoint()` | tout ce qui borne un déplacement ou pose un objet |
| `_bossTargets()` | tout ce qui frappe « le boss » en zone |
| `_bossBars(b, dt)` | LE palier et LA rupture. Le palier s'ouvre **au plancher**, dure `PALIER_TIME` et se ferme en cassant la barre — sauf sur la dernière du final, où il pose `b.finalLibre`, son seul terminus. Compter depuis la rupture **précédente** rendait le temps mort maximal quand l'équipe jouait le mieux |
| `_mechLibre(mech)` | la coexistence de deux ordres ; lu par `_pickAtk` **avant** le tirage |
| `_zoneEcarteAbris(z)` (dans `_zone()`) | tout ce qui empêche une zone de couvrir un abri |
| `_solPret(b)` / `_solPose(b, n0)` | l'exclusivité d'un motif qui sature le sol |
| `_foyerPoint()` / `_foyerLibre()` | où un foyer d'occupation ou un refuge peut naître |
| `pasBoss(v)` (`render/lumiere.js`) | LA prise du boss sur le monde : deux canaux, `kL` (lumiere, 1,2 s) puis `kS` (matiere, 0,8 s, demarre a `kL > 0.85`). LA LUMIERE CHANGE AVANT LA MATIERE. Profil dans `BOSS_SKIN`, garde pendant la sortie. Lu par `bossVignette()` et `bossAtmo()` |
| `drawAmer()` (`render/decor.js`) | LE point unique d'une arene, un par lieu, ancre au MONDE et tire par graine. **Plaque au sol et sans collider** : un grand objet qui aurait du volume ferait voir une masse la ou le pathfinding voit du vide. Ce qui bloque est un obstacle, dans `biomes.js`. Il passe SOUS la grille de 20 m, il n'emet PAS de lumiere, et `verifierAmers()` refuse qu'il tombe sur un danger |
| `ZONES[biome]` / `verifierZones()` (`render/props.js`) | LES QUARTIERS D'UN LIEU. `TABLE` dit ce que le lieu POSSEDE, `ZONES` comment il l'ARRANGE — le semis tirait uniformement dans toute la liste, donc deterministe dans son calcul et aleatoire dans sa DISTRIBUTION. La zone est un hachage de la cellule DIVISEE, donc encore une fonction pure de (cellule, graine) ; elle prend `g + 8`, le premier decalage libre — reutiliser l'un des sept autres correlerait le quartier avec l'angle ou l'echelle. `FUITE` empeche la frontiere d'etre une droite franche. `verifierZones()` croise les deux tables DANS LES DEUX SENS : un prop qu'aucune zone ne tire est supprime du lieu en SILENCE |
| `champ(...)` (`render/decor.js`) | TOUT champ de brins : meteo, poussiere, vapeur, etincelles. La position d'un brin est une fonction de son indice et du temps — rien ne s'alloue, un seul `stroke` par champ. `cx0/cy0/rayon` l'ancrent sur une SOURCE au lieu de la vue. Un effet qui aurait besoin d'un tableau persistant n'est pas ici : il est dans `fx.js`, sous `PARTICLE_MAX` |
| `drawPremierPlan(v)` | LE premier plan. Trois regles : rien au centre, jamais opaque, COUPE pendant un boss |
| `lumDir()` (`render/stage.js`) | LA direction de lumiere du biome. Lue par l'ombre portee des obstacles, celle des props et l'ombre de contact des entites. Deux ombres qui pointent differemment sur le meme ecran est LE defaut visible d'un rendu 2D — il n'existe pas de second endroit ou l'ecrire. Le relief RADIAL de `drawObstacles` reste : c'est la CAMERA, pas la lumiere |
| `drawOmbre(x, y, r, k)` (`render/fx.js`) | TOUTE ombre de contact. Un quad `fx_glow` teinte noir, dans le lot NORMAL qui existe deja — aucun appel de dessin en plus. **Passe SEPAREE** avant les corps : une ombre posee juste avant SON corps tombe sur le corps du voisin. Elle ne s'additionne pas, et un projectile n'en a pas |
| `drawBrulure` / `drawVulnerable` / `drawEntrave` (`render/fx.js`) | CE QU UN CORPS BLESSE, OUVERT OU CLOUE DIT. **TROIS ETATS, TROIS PLANS** — lueur AUTOUR, pointes qui SORTENT, anneau AU SOL : superposes sur le meme corps aucun ne peut etre pris pour un autre, et c est le PLAN qui les separe, pas la couleur — **horde ET boss, par la meme main** : un second vocabulaire pour le boss ferait apprendre l'etat deux fois. Brulure = lueur, meme primitive que l'ombre (quad `fx_glow` teinte, lot NORMAL) et meme **passe separee** ; vulnerabilite = **pointes**, jamais un anneau, les trois anneaux lisses etant pris (elite, aura, egide). Couleurs prises a `STATUSES`, donc le HUD dit la meme chose. Les braises ont un budget **par IMAGE**, jamais par corps : la brulure se PROPAGE. **Aucune garde `gfx`** — c'est de l'INFORMATION, et `gfx` regle la matiere sans decider de ce qui se lit |
| `ledDe(o)` / `evacDe(o)` (`render/blocs.js`) | CE QU'UN BLOC EMET — la source fixe (teinte, rayon, TYPE : bande, gueule, feux, tube) et la bouche d'evacuation. `decor.js` DESSINE, `drawLumiere` ALLUME, `drawAtmosphere` SOUFFLE : tous LISENT, aucun ne pousse. Jamais sur une couverture destructible — le contour tirete est du gameplay |
| le MOUVEMENT d'un prop ou d'un bloc | il est **continu et periodique**, donc sans debut ni echeance, donc ce n'est pas un telegraphe — ce canal appartient au boss. Une enveloppe a flanc franc en refabrique un |
| `DANGER[biome][kind]` (`render/dangers.js`) | LA representation d'un danger. Ajouter un danger a un lieu = une entree. Le disque de `biomes.js` reste le COLLIDER et ne se dessine plus ; chaque entree porte sa `limite()` franche a `h.r` — un danger dont on ne lit pas le bord est injuste. Ce qui blesse est chaud, ce qui ralentit est froid |
| `SOUFFLE[biome][kind]` / `souffleDe(kind)` (`render/dangers.js`) | CE QU'UN DANGER EXHALE. `dangers.js` declare, `drawAtmosphere` lit — jamais l'inverse. Parallele a `DANGER` et JAMAIS deduite du `kind` : c'est le LIEU qui decide si la flaque fume chaud ou DERIVE lourd, et l'angle porte ca avant la couleur. Chaque entree reprend la teinte de son dessin au sol. Un souffle est un `champ()`, donc un `stroke` et zero allocation ; s'il lui fallait un tableau persistant il serait dans `fx.js` |
| `BLOC[biome][kind]` (`render/blocs.js`) | LA representation d'un obstacle. Ajouter un objet a un lieu = une entree. Le `kind` vient de `BLOCS` (`biomes.js`), append-only, `lieu` en declare le proprietaire ; il ne circule PAS sur le reseau et la simulation ne le lit jamais. `verifierBlocs()` refuse un `kind` sans fiche — `fiche()` replie en SILENCE |
| `silhouetteBloc(g, o, cle)` (`render/blocs.js`) | LA forme d'un obstacle, une par FAMILLE. **Elle remplit son rectangle** : la collision est une AABB, une forme qui rentre ses coins fait buter sur du vide |
| `couleeDe(...)` (`render/material.js`) | LA geometrie du canal de la Fonderie, ancree au MONDE : `decor.js` la DESSINE, `lumiere.js` l'ALLUME. Il est COUVERT — la nappe libre de fusion est deja un DANGER avec son collider. Seuls les REGARDS sont des sources, et ils se filtrent A LA GENERATION (une fois, pour les deux lecteurs) |
| `GRILLE` (`render/decor.js`) / `contourDe(cle)` (`render/blocs.js`) | LA forme du pas de 20 m et LA force du liseré de bloc, par lieu. La graduation ne se négocie pas, ce qui la **porte** appartient au biome — et les deux valent à **tous** les paliers, `low` compris : c'est de la DA, pas de la qualité. Une couverture destructible garde son contour plein, il est du gameplay |
| `drawLumiere(v)` | TOUTE lumiere de l'arene. Appelee sur `#cvUnder` **avant** le premier element de gameplay : rien de ce qui suit n'est assombri, et c'est l'ORDRE DE DESSIN qui le garantit, pas un reglage. Les sources sont **lues** (dangers, props, `bursts`, joueurs), jamais poussees |
| `gfx` (`core/state.js`) | LE palier de qualite. `low` rend la TECHNIQUE d'avant le plan 13 — matiere, semis, lumiere, grille ; la **palette** d'arene vaut a tous les paliers, c'est de la DA, pas de la qualite. Cinq points de lecture, pas un de plus : `material`, `props`, `lumiere`, `decor`, `fx` |
| `_ground()` / `groundAt()` | champs de ralentissement, serveur et client |
| `_obstacleBlock()` | blocage par obstacle de biome (repoussage **par axe**) |
| `hazardState(h, t)` | état d'un danger, partagé simulation ↔ rendu |
| `adaptMech()` | adaptation à l'effectif (`minPlayers`, `fallback`) |
| `adaptType()` | adaptation au niveau (`minLevel`, `fallback`) ; `_pickType` **filtre**, `_spawnEnemy` **replie** |
| `adaptEntry()` | adaptation d'un beat à l'effectif |
| `openNextScreen()` | enchaînement cartes → marchand |
| `state.repriseGrace` | **un écran ne tue pas** : toute reprise de simulation figée (cartes, marchand, pause) rend `_hurt()` inerte pendant `CFG.RESUME_GRACE` |
| `_recomputeMods()` | rejoue tout le chargement (cartes + classe + méta) |
| `assignColors()` | couleur de joueur, à la diffusion du salon |
| `appliquerCadre(el, id)` | le cadre à l'écran : les six emplacements, et la couche `.cadreCouche` posée en premier enfant |
| `notReady()` | qui manque pour lancer |
| `briefWaiting()` / `syncBrief()` | qui n'a pas fermé son briefing |
| `setPaused()` | les causes de pause, et la grâce de reprise |
| `unlockClasses()` | déverrouillage aux DEUX sorties de manche |
| `recordRound()` | historique, aux DEUX sorties de manche |
| `pushWorld()` / `worldQueue` | tout message ponctuel décrivant le MONDE |
| `applyAlert()` | annonce, que le message porte `event`, `mech` ou `meteo` |
| `drawSprite()` / `cellRect()` / `mirrored()` | dessin d'entité, lecture d'atlas, sous-tracé miroir |
| `solDeBiome(diffIndex, key)` | LA couleur du sol : le lieu donne la teinte, le mode la clarté |
| `audioUi` | volume, depuis les trois vues |
| `uiSoundFor()` | son d'un bouton d'interface |
| `t(cle, repli)` | toute traduction ; `traduireStatique()` la variante markup |
| `goHome()` | retour au hub, d'où qu'on clique |
| `enSaisie()` | « suis-je en train d'écrire » |
| `prepareMessage()` | compression, une fois par broadcast |
| `store.save(pseudoLower)` | marquage sale, fenêtre de 2 s |

## Conventions

- **Commentaires et identifiants en français sans accents** (`degats`,
  `reanimation`, `telegraphiee`). **Chaînes affichées au joueur avec accents.**
- **LE MINIMUM DE COMMENTAIRES POSSIBLE.** Par défaut : **aucun**. Un commentaire
  coûte des tokens à chaque lecture, et le dépôt est lu bien plus souvent qu'il
  n'est écrit. On n'en écrit un que si le code ne peut pas porter l'information —
  valeur mesurée, piège déjà payé, alternative rejetée — et il est **court**.
  Jamais de paraphrase, jamais de bannière de section. Ce qui explique un **choix
  de conception** appartient à `docs/regles/`, pas au code.
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

