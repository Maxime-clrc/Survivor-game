# Survivor LAN

Mini *survivor* coopératif jouable jusqu'à 4 en réseau local. Un joueur lance
le serveur, les autres ouvrent une URL dans leur navigateur — **aucune
installation côté joueurs, aucun `npm install`, zéro dépendance**.

```bash
node server.js
```

Node 18+ suffit. Le serveur affiche l'adresse à communiquer aux autres
machines du réseau. Port par défaut : **7777** (dans un environnement avec
proxy inverse, le port interne n'a plus d'importance).

```bash
PORT=3000 node server.js   # changer de port
npm start                  # équivalent à node server.js
```

## Le jeu

- **3 classes** — Rempart, Soigneur, Tireur (deux teintes) — un tank et un
  soigneur au maximum par partie.
- **5 boss**, chacun avec son propre jeu de mécaniques qui s'ajoutent en cours
  de combat selon les seuils d'effectif.
- **116 cartes** réparties en familles à 4 paliers de rareté, plus des
  légendaires garanties à des jalons.
- **Progression de compte persistante** (arbres par classe, jalons, achats)
  en plus de la partie elle-même — comptes avec mot de passe, sessions par
  jeton.
- **Hub de salles** : jusqu'à 16 parties de 4 joueurs simultanées sur un même
  serveur, salons privés au mot de passe, reprise après déconnexion.

Le détail complet (déroulement d'une partie, commandes, mesures
d'équilibrage) est dans [`LISEZMOI.md`](LISEZMOI.md). La persistance des
comptes est documentée dans [`LISEZMOI-BDD.md`](LISEZMOI-BDD.md).

## Architecture

Serveur Node autoritaire (aucune décision cliente n'est fiable : positions,
dégâts, morts, score sont recalculés côté serveur), client navigateur en
modules ES natifs — **pas d'étape de build**. WebSocket réimplémenté à la
main (`ws_lite.js`, RFC 6455 + permessage-deflate), sans librairie.

```
server.js              amorce : HTTP, WebSocket, page admin, cablage
hub.js                 registre des salles, comptes, progression (seul ecrivain du magasin)
room.js                UNE partie : GameState, clients, phases, pause, tick
ws_lite.js             WebSocket minimal, sans TLS (proxy inverse en amont)
shared/game_state.js   logique de simulation PURE — serveur et navigateur l'importent tel quel
shared/cards.js        cartes, raretes, tirage
shared/classes.js      les 3 classes, constantes de competence
shared/statuses.js     les 4 etats (brulure, entrave, vulnerabilite, sentence)
shared/bosses.js       roster des 5 boss et registre de leurs mecaniques
shared/progression.js  meta-progression persistante (arbres, noyaux, jalons)
progress_store.js      persistance Supabase de la progression (serveur seul)
public/client.js       saisie, interpolation, prediction, rendu du monde
public/gl.js           batcher de quads WebGL2 (repli canvas 2D automatique)
public/hud.js          HUD en DOM
public/index.html      page, salon, bilan, cartes, ossature du HUD
```

Le rendu du monde (entités, projectiles, zones) passe par trois canvas
empilés — 2D pour le sol et les projectiles, WebGL2 pour les entités — le
HUD, lui, est entièrement en DOM/CSS. Le détail des choix de rendu, du
protocole réseau et des invariants de simulation est dans
[`CLAUDE.md`](CLAUDE.md).

## Développement

Pas de framework de test, pas de linter, pas d'étape de build. La logique
étant pure et sans DOM, elle se teste en important le module directement
dans un script jetable :

```js
import { GameState, CFG } from "file:///<chemin absolu>/shared/game_state.js";
const g = new GameState(1);              // 0 calme, 1 normal, 2 cauchemar
g.addPlayer(1, "bot", 0);
g.step(CFG.TICK, new Map([[1, { x: 1, y: 0, ax: 1, ay: 0, dash: false }]]));
```

600 s de jeu simulé ≈ 1 s de CPU : une mesure d'équilibrage complète est bon
marché. Les méthodes préfixées `_` (`_spawnEnemy`, `_atkDamier`, `_zoneHits`…)
sont volontairement appelables depuis un test.

```bash
node --check server.js    # verification syntaxique
```

Pour un test bout en bout du protocole réseau : lancer `server.js` avec un
`PORT` dédié et parler WebSocket en direct (Node 16 n'a pas de `WebSocket`
global).

## Administration

Une page `/admin` (comptes, réinitialisation de mot de passe, remise à zéro)
n'existe que si la variable d'environnement `ADMIN_KEY` est définie — sinon
404. La persistance des comptes repose sur Supabase (`SUPABASE_URL` /
`SUPABASE_SERVICE_KEY`) ; sans ces variables le jeu reste jouable en LAN mais
les comptes ne survivent pas au processus.

## Licence

Projet privé, non destiné à la publication.
