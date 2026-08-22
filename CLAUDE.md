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
telemetry.js           trace JSONL d'une VRAIE partie — serveur SEUL, hub ecrivain
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
shared/armes.js        LES ARMES : 10 fiches, coefficients d echelle, conversions boss
shared/hauts_faits.js  LES HAUTS FAITS : 36 exigences, 13 cadres, recompenses NOMMEES
shared/timeline.js     LE SCRIPT — six segments, trente beats, TROIS variantes, les EVENEMENTS
shared/biomes.js       LE LIEU — trois biomes, cinq dangers, trois meteos, generateur DETERMINISTE
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
public/render/decor.js LE SOL : grille, vignettage, obstacles, dangers
public/render/material.js la MATIERE du sol : une tuile cuite par (biome, mode, graine)
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
`progression.js` et `biomes.js` ne dépendent de **rien**. Deux exceptions, toutes
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
| `_killEnemy()` | **toute** mort d'ennemi : XP, explosion du kamikaze, cumuls |
| `_bulletHitEnemy()` | une balle qui touche — appelé par la boucle de collision **et** le balayage à l'apparition |
| `_groundZone()` | toute zone posée par la horde, plafond global `trailMax()` |
| `plafonnerHp(maxHp, mods)` | LE plafond de PV, et il est le **dernier** : cartes, classe, méta puis reliques passent devant lui |
| `_harvestDamage(h, dmg)` | tout ce qui entame un cristal — balle, faisceau, arc, balayage, souffle de joueur ; la **géométrie** appartient à l'arme |
| `porteeReticule(ar)` | la distance au réticule, assainie ; chaque usage pose sa propre borne |
| `_summonMul(p)` | **toute** source de dégâts qui n'est pas le tir : lame orbitale, essaim, drone, tourelle, pulsar, onde de mort |
| `appliquerEchelle(mods, arme)` | ce qu’une arme tire de chaque statistique de carte |
| `axesDeCarte(c)` | les axes du tableau d’échelle qu’une carte touche — **relevés** sur `apply`/`applyAfter`, jamais déclarés |
| `litCanons(a)` | quelles armes lisent `extraBarrels`, donc lesquelles paient `barrelDamageMul` |
| `conversionBoss(a)` | ce qu’une arme rend contre une CIBLE UNIQUE |
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
| `enemyCap(diffIndex, joueurs)` / `_enemyCap()` | plafond de population, serveur **et** HUD |
| `enemySpeed(type, minute, diff, tirage, elite)` | vitesse d'un ennemi — apparition **et** vérificateur |
| `_clampToBounds()` / `_dropPoint()` | tout ce qui borne un déplacement ou pose un objet |
| `_bossTargets()` | tout ce qui frappe « le boss » en zone |
| `_mechLibre(mech)` | la coexistence de deux ordres ; lu par `_pickAtk` **avant** le tirage |
| `_zoneEcarteAbris(z)` (dans `_zone()`) | tout ce qui empêche une zone de couvrir un abri |
| `_solPret(b)` / `_solPose(b, n0)` | l'exclusivité d'un motif qui sature le sol |
| `_foyerPoint()` / `_foyerLibre()` | où un foyer d'occupation ou un refuge peut naître |
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
| `teinter(base, teinte, k)` | clarté du mode + chroma du biome |
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

