/* ===========================================================================
   SERVEUR AUTORITAIRE
   Un seul port : le meme serveur HTTP sert les fichiers du jeu et accepte les
   connexions WebSocket. Aucune configuration cote joueur, aucun CORS.

   Le serveur est la seule source de verite. Les clients n'envoient que leur
   intention — direction de deplacement et direction de visee. Ils ne decident
   jamais de leur position, des degats, des morts ni du score.

   Deux phases : "salon" (tableau des scores, on attend l'hote) et "manche".
   Qui se connecte pendant une manche est spectateur jusqu'a la suivante.
   =========================================================================== */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { attachWebSocket } from "./ws_lite.js";
import { GameState, CFG, PLAYER_COLORS, DIFFICULTIES, DIFF_NORMAL } from "./shared/game_state.js";
import { CARD_CFG, cardBrief } from "./shared/cards.js";
import { CLASSES, CLASS_DEFAULT, SKILL_CFG, bombRange } from "./shared/classes.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const MAX_PLAYERS = PLAYER_COLORS.length;

/* --- serveur de fichiers statiques ----------------------------------------- */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico":  "image/x-icon",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
};

/* Le chemin d'une URL est toujours en barres obliques ; celui du systeme de
   fichiers ne l'est pas. On normalise donc entierement dans l'espace URL, puis
   join() produit le separateur de la plateforme. Utiliser path.normalize() sur
   une URL casse tout sous Windows : il renvoie des antislashs et les
   comparaisons de prefixe echouent silencieusement. */
function resolvePath(urlPath) {
  let p = urlPath.split("?")[0].split("#")[0];
  try { p = decodeURIComponent(p); } catch { return null; }
  p = p.replace(/\\/g, "/");

  const parts = [];
  for (const seg of p.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") return null;
    if (seg.includes(":") || seg.includes("\0")) return null;
    parts.push(seg);
  }

  if (parts.length === 0) return join(ROOT, "public", "index.html");
  if (parts[0] === "shared") return join(ROOT, ...parts);
  return join(ROOT, "public", ...parts);
}

const httpServer = createServer(async (req, res) => {
  const file = resolvePath(req.url || "/");
  if (!file) { res.writeHead(400).end("Bad request"); return; }

  try {
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404");
  }
});

/* --- etat du serveur --------------------------------------------------------- */

const PHASE_LOBBY = 0;
const PHASE_ROUND = 1;
const PHASE_CARDS = 2;

let phase = PHASE_LOBBY;
let state = new GameState();
let roundNumber = 0;

/* Pause de choix de cartes. Le serveur n'appelle plus step() pendant cette
   phase : l'arene se fige sur le dernier instantane recu par les clients, ce
   qui suffit — diffuser des instantanes identiques a 20 Hz pour une scene qui
   ne bouge pas n'apporte rien et compliquait la fermeture de l'ecran cote
   client, qui se contente maintenant du retour des instantanes. */
let cardDeadline = 0;
const cardPicked = new Set();

/* Pause demandee par le joueur. Elle N'A DE SENS QU'EN SOLO : le serveur est
   autoritaire et simule en continu, donc un joueur qui met en pause figerait la
   partie des trois autres. A plusieurs, le client ouvre le meme panneau mais la
   manche continue derriere — et c'est le SERVEUR qui le garantit, jamais le
   client : c'est exactement le type de message qu'un client modifie enverrait
   pour figer une partie a quatre.

   L'echeance n'est pas un detail. Sans elle, un solo en pause laisse le serveur
   bloque indefiniment et personne ne peut le rejoindre — c'est le meme piege
   que la manche qui ne se terminait jamais quand tout le monde quittait. */
const PAUSE_MAX_MS = 5 * 60 * 1000;
let paused = false;
let pausedAt = 0;

/* Levee de pause, quelle qu'en soit la raison. Point de passage unique : trois
   causes (demande du joueur, echeance, arrivee d'un second joueur) et un seul
   endroit ou l'etat retombe, sinon une des trois oublie de prevenir les
   clients. */
function setPaused(on, why = "") {
  if (paused === on) return;
  paused = on;
  pausedAt = on ? Date.now() : 0;
  broadcast({ t: "paused", on: on ? 1 : 0, why });
  log(on ? "manche en pause (solo)" : `pause levee${why ? ` — ${why}` : ""}`);
}

const clients = new Map();     // id -> client
let nextClientId = 1;
let hostId = 0;

function joined() {
  return [...clients.values()].filter(c => c.joined);
}

function freeColor() {
  const used = new Set(joined().map(c => c.colorIndex));
  for (let i = 0; i < PLAYER_COLORS.length; i++) if (!used.has(i)) return i;
  return 0;
}

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const c of clients.values()) c.conn.send(msg);
}

/* L'hote est le plus ancien client encore connecte. S'il part, le suivant
   herite du bouton sans que personne n'ait a rien faire. */
function refreshHost() {
  const list = joined();
  if (list.some(c => c.id === hostId)) return false;
  hostId = list.length ? Math.min(...list.map(c => c.id)) : 0;
  return true;
}

/* Depouillement du vote de difficulte. Majorite simple ; a egalite on retient
   le mode le plus doux. C'est volontaire : personne ne doit pouvoir imposer
   cauchemar a la table en etant seul de son avis. */
function votedDifficulty() {
  const tally = DIFFICULTIES.map(() => 0);
  for (const c of joined()) tally[c.vote]++;

  let best = DIFF_NORMAL, bestN = -1;
  for (let i = 0; i < tally.length; i++) {
    if (tally[i] > bestN) { bestN = tally[i]; best = i; }
  }
  return { index: bestN > 0 ? best : DIFF_NORMAL, tally };
}

/* Emplacements de classe deja pris. Calcule a la demande sur les clients
   CONNECTES et non memorise : la liberation a la deconnexion est ainsi
   automatique, alors qu'un ensemble tenu a part aurait garde l'emplacement du
   tank verrouille jusqu'a la fin de la session. */
function takenClasses() {
  const taken = new Set();
  for (const c of joined()) {
    if (c.cls === null) continue;
    if (CLASSES[c.cls]?.unique) taken.add(c.cls);
  }
  return taken;
}

/* Point de passage unique du DEVERROUILLAGE, appele par les deux sorties de
   manche. Le verrou etait pose pour la session entiere, et sa justification
   n'existe plus : `startRound()` construit un `new GameState()` a chaque
   manche, donc les cartes de classe ne survivent pas d'une manche a l'autre et
   il n'y a plus d'investissement a proteger. Il ne garde de sens que PENDANT
   une manche — on ne repasse pas tireur au premier boss apres avoir laisse le
   tank encaisser les vagues.
   Rien a defaire pour l'emplacement unique : `takenClasses()` se recalcule
   depuis `c.cls`, donc le tank redevient disponible des que son porteur en
   change. La seule contrainte est d'appeler ceci AVANT de diffuser le salon,
   sinon les clients recoivent un `clsLocked` perime et grisent le selecteur. */
function unlockClasses() {
  for (const c of clients.values()) c.clsLocked = false;
}

function lobbyPayload() {
  const vote = votedDifficulty();
  return {
    t: "lobby",
    phase,
    host: hostId,
    round: roundNumber,
    difficulty: vote.index,
    tally: vote.tally,
    modes: DIFFICULTIES.map(d => d.label),
    players: joined().map(c => ({
      id: c.id,
      name: c.name,
      colorIndex: c.colorIndex,
      spectator: c.spectator,
      vote: c.vote,
      total: c.total,
      // `null` tant que rien n'a ete choisi : le client affiche « au choix »
      // plutot que de pretendre que le joueur a decide d'etre tireur. La classe
      // par defaut ne s'applique qu'au lancement de la manche.
      cls: c.cls,
      clsLocked: c.clsLocked,
    })),
  };
}

function scoreboardRows() {
  return joined().map(c => {
    const p = state.players.get(c.id);
    return {
      id: c.id,
      name: c.name,
      colorIndex: c.colorIndex,
      played: !!p,
      cls: p ? p.cls : c.cls,
      // Le niveau est celui de l'EQUIPE : la jauge est commune, la colonne est
      // donc la meme pour tout le monde. Elle reste au tableau parce qu'elle
      // situe la manche, pas le joueur.
      level: p ? state.level : 1,
      score: p ? p.score : 0,
      kills: p ? p.kills : 0,
      deaths: p ? p.deaths : 0,
      // Les degats infliges figurent au tableau de fin pour que la
      // contribution d'un joueur qui a pris des cartes defensives apparaisse
      // ailleurs que dans un score qu'il a mecaniquement plus bas.
      damage: p ? Math.round(p.damageDealt) : 0,
      cards: p ? expandCards(p) : [],
      total: c.total,
    };
  }).sort((a, b) => b.score - a.score);
}

/* Les cartes circulent sous forme de liste d'identifiants repetes plutot que
   de paires (id, nombre) : le client les regroupe deja pour l'affichage, et
   une seule forme sur le reseau evite d'avoir a se rappeler laquelle est
   laquelle. Ces messages ne partent qu'a chaque changement, jamais dans
   l'instantane a 20 Hz. */
function expandCards(p) {
  const out = [];
  for (const [id, n] of p.cards) for (let i = 0; i < n; i++) out.push(id);
  return out;
}

function loadoutPayload() {
  const byPlayer = {};
  for (const p of state.players.values()) byPlayer[p.id] = expandCards(p);
  return { t: "loadout", byPlayer };
}

/* Qui n'a pas encore choisi. Les deconnectes sortent de la liste tout seuls :
   sans ca, quelqu'un qui ferme son onglet pendant la pause bloquait la table
   jusqu'au bout des trente secondes. */
function cardsPendingIds() {
  return [...state.players.keys()].filter(id => !cardPicked.has(id) && clients.has(id));
}

/* Ouvre UN ecran de choix. Appele autant de fois qu'il y a de niveaux en
   attente : deux niveaux gagnes pendant la meme vague donnent deux choix
   d'affilee, sans repasser par la simulation entre les deux. Le minuteur et la
   liste des joueurs qui n'ont pas encore choisi sont remis a zero a chaque
   tour — sans ca, le second ecran heritait du delai deja ecoule du premier et
   se fermait aussitot ouvert. */
function enterCardPhase() {
  phase = PHASE_CARDS;
  state.cardsPending = false;
  cardPicked.clear();
  cardDeadline = Date.now() + CARD_CFG.PICK_TIME * 1000;

  for (const [id, offers] of state.cardOffers) {
    const c = clients.get(id);
    if (!c) continue;
    c.conn.send(JSON.stringify({
      t: "cards",
      // La vague a remplace le boss : les cartes ne tombent plus a la mort d'un
      // boss mais a la fin de n'importe quelle vague ou un niveau est monte.
      wave: state.wave,
      bossWave: state.waveBoss ? 1 : 0,
      // Toujours transmis : le client en tire le chiffre romain quand le choix
      // vient d'une vague de boss. `bossKind` dit LEQUEL des cinq vient d'etre
      // vaincu — il n'y a plus qu'un seul nom possible depuis le lot 4.
      boss: state.bossCount,
      bossKind: state.lastBossKind,
      // Nombre de choix restants APRES celui-ci, pour que le joueur sache qu'il
      // en vient un autre au lieu de croire l'ecran bloque.
      more: state.pendingLevels,
      level: state.level,
      deadline: cardDeadline,
      offers: offers.map(cardBrief),
    }));
  }
  broadcast({ t: "cardsWait", pending: cardsPendingIds() });
  log(`vague ${state.wave} terminee — choix de cartes (niveau ${state.level}`
    + `${state.pendingLevels > 0 ? `, ${state.pendingLevels} autre(s) a suivre` : ""})`);
}

/* Fin d'un tour de choix. S'il reste des niveaux en file, on rouvre un ecran au
   lieu de reprendre la manche : la simulation ne redemarre qu'une fois toute la
   file consommee. */
function resumeRound() {
  if (state.pendingLevels > 0) {
    state.openCards();
    enterCardPhase();
    return;
  }
  phase = PHASE_ROUND;
  state.cardOffers = new Map();
  broadcast(loadoutPayload());
}

/* Choix d'office a l'expiration du delai. Ce n'est pas une securite : trois
   minutes de jeu puis un ecran de choix, il suffit d'un joueur parti chercher
   un cafe pour que les trois autres attendent sans rien pouvoir faire. */
function forceRemainingPicks() {
  let forced = 0;
  for (const [id, offers] of state.cardOffers) {
    if (cardPicked.has(id)) continue;
    const p = state.players.get(id);
    if (p && offers.length) { state.takeCard(p, offers[0]); forced++; }
    cardPicked.add(id);
  }
  // Le journal ne parle du delai que s'il a vraiment servi : la reprise passe
  // aussi par ici quand tout le monde a choisi a temps, et le message
  // apparaissait alors a chaque boss sans que personne n'ait rien manque.
  if (forced > 0) log(`delai de choix ecoule — ${forced} carte(s) attribuee(s) d'office`);
}

function startRound() {
  roundNumber++;
  // Une pause ne survit jamais a un changement de phase : les trois transitions
  // la lèvent, sinon la manche suivante demarrait figee.
  setPaused(false);
  const diff = votedDifficulty().index;
  state = new GameState(diff);
  cardPicked.clear();
  for (const c of joined()) {
    c.spectator = false;
    /* La classe se VERROUILLE ici, pas au choix : un joueur peut changer d'avis
       tant qu'il n'a pas joue — y compris un spectateur qui prepare son entree
       pendant qu'il regarde — mais plus une fois qu'il est entre en jeu. Sans
       ce verrou, il suffisait d'attendre le premier boss pour repasser tireur
       apres avoir laisse le tank encaisser les vagues. */
    if (c.cls === null) c.cls = CLASS_DEFAULT;
    c.clsLocked = true;
    state.addPlayer(c.id, c.name, c.colorIndex, c.cls);
    c.input.x = 0; c.input.y = 0; c.input.dash = false;
    c.input.s1 = false; c.input.s2 = false;
  }
  phase = PHASE_ROUND;
  broadcast({ t: "round", round: roundNumber, difficulty: diff });
  broadcast(lobbyPayload());
  log(`manche ${roundNumber} lancee — ${state.players.size} joueur(s), `
    + `difficulte ${DIFFICULTIES[diff].label}`);
}

/* Si tout le monde s'est deconnecte en cours de manche, il n'y a plus personne
   pour mourir : la condition de fin ne se declenche jamais et le serveur reste
   bloque en manche. Les arrivants suivants deviennent alors spectateurs d'une
   partie vide, sans moyen de relancer. On revient donc au salon. */
function abortRound() {
  phase = PHASE_LOBBY;
  setPaused(false);
  unlockClasses();
  log(`manche ${roundNumber} interrompue — plus aucun joueur en jeu`);
  broadcast({ t: "roundAbort", round: roundNumber });
  broadcast(lobbyPayload());
}

function endRound() {
  phase = PHASE_LOBBY;
  setPaused(false);
  unlockClasses();
  for (const c of joined()) {
    const p = state.players.get(c.id);
    if (!p) continue;
    c.total.score += p.score;
    c.total.kills += p.kills;
    c.total.deaths += p.deaths;
    c.total.rounds += 1;
  }
  const rows = scoreboardRows();
  broadcast({
    t: "roundEnd",
    round: roundNumber,
    time: Math.round(state.time),
    kills: state.totalKills,
    host: hostId,
    rows,
  });
  broadcast(lobbyPayload());
  log(`manche ${roundNumber} terminee — ${Math.round(state.time)} s, ${state.totalKills} kills`);
}

/* --- connexions ---------------------------------------------------------------- */

attachWebSocket(httpServer, conn => {
  if (clients.size >= MAX_PLAYERS) {
    conn.send(JSON.stringify({ t: "full", max: MAX_PLAYERS }));
    setTimeout(() => conn.close(), 200);
    return;
  }

  const id = nextClientId++;
  const client = {
    id, conn,
    name: "joueur " + id,
    colorIndex: 0,
    joined: false,
    spectator: false,
    vote: DIFF_NORMAL,
    cls: null,           // null tant que le joueur n'a rien choisi
    clsLocked: false,    // vrai des qu'il est entre en jeu une fois
    input: { x: 0, y: 0, ax: 1, ay: 0, ar: SKILL_CFG.DPS_BOMB_RANGE_MAX,
             dash: false, s1: false, s2: false },
    total: { score: 0, kills: 0, deaths: 0, rounds: 0 },
  };
  clients.set(id, client);

  conn.onmessage = raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== "object") return;

    switch (msg.t) {
      case "join": {
        if (client.joined) break;
        client.joined = true;
        client.name = sanitizeName(msg.name) || client.name;
        client.colorIndex = freeColor();

        // Arriver en cours de manche ne coupe pas la partie des autres :
        // on regarde, on entre a la manche suivante.
        client.spectator = phase === PHASE_ROUND;
        /* Un second joueur arrive : la pause tombe. Sinon un solo en pause
           bloque le serveur et l'arrivant regarde une image figee sans aucun
           moyen d'y changer quoi que ce soit. */
        if (paused) setPaused(false, "un second joueur est arrivé");

        refreshHost();
        conn.send(JSON.stringify({
          t: "welcome",
          id,
          host: hostId,
          phase,
          spectator: client.spectator,
          colors: PLAYER_COLORS,
          cfg: {
            ARENA_W: CFG.ARENA_W, ARENA_H: CFG.ARENA_H,
            SNAPSHOT_HZ: CFG.SNAPSHOT_HZ,
          },
        }));
        broadcast(lobbyPayload());
        log(`${client.name} rejoint${client.spectator ? " (spectateur)" : ""} — ${joined().length} connecte(s)`);
        break;
      }

      case "input": {
        // Le serveur ne fait jamais confiance au client : on borne le vecteur.
        let x = Number(msg.x) || 0;
        let y = Number(msg.y) || 0;
        const d = Math.hypot(x, y);
        if (d > 1) { x /= d; y /= d; }
        client.input.x = x;
        client.input.y = y;

        const ax = Number(msg.ax);
        const ay = Number(msg.ay);
        if (Number.isFinite(ax) && Number.isFinite(ay) && (ax !== 0 || ay !== 0)) {
          const ad = Math.hypot(ax, ay);
          client.input.ax = ax / ad;
          client.input.ay = ay / ad;
        }

        /* Distance au reticule, pour la bombe du tireur. CONTINUE comme les
           deux directions, et non ponctuelle comme l'esquive : elle decrit une
           position, pas une demande — la remettre a zero apres le tick ferait
           retomber le lancer suivant sur la portee maximale une image sur deux.
           `bombRange()` refuse tout ce qui n'est pas un nombre exploitable et
           borne le reste : le serveur ne fait jamais confiance au client, sinon
           n'importe qui pose une explosion a l'autre bout de l'arene. */
        client.input.ar = bombRange(msg.ar);

        // L'esquive est une demande ponctuelle : on la garde levee jusqu'au
        // prochain tick de simulation, qui la consomme. Sans ce drapeau, une
        // demande arrivee entre deux ticks se perdait.
        if (msg.d) client.input.dash = true;
        // Meme modele exactement pour les deux competences : demande ponctuelle,
        // consommee par le prochain tick. Une demande qui resterait levee
        // relancerait la competence toute seule a chaque fin de recharge — le
        // bug est documente pour l'esquive dans CLAUDE.md, ne pas le refaire.
        if (msg.s1) client.input.s1 = true;
        if (msg.s2) client.input.s2 = true;
        break;
      }

      case "pickClass": {
        /* Deux refus, tous deux cote serveur : pendant la manche a laquelle on
           participe (`clsLocked`, leve aux deux sorties de manche par
           `unlockClasses()`), et sur un emplacement unique deja pris. Le second
           regle aussi le choix simultane — deux clients qui envoient « tank »
           dans le meme tick sont traites l'un apres l'autre, le second voit le
           premier dans `takenClasses()`.
           Pas de refus sur la phase : un spectateur prepare son entree pendant
           qu'une manche tourne, c'est voulu. */
        if (client.clsLocked) break;
        const v = Number(msg.cls);
        if (!Number.isInteger(v) || v < 0 || v >= CLASSES.length) break;
        if (CLASSES[v].unique && client.cls !== v && takenClasses().has(v)) break;
        client.cls = v;
        broadcast(lobbyPayload());
        break;
      }

      case "vote": {
        if (phase !== PHASE_LOBBY) break;
        const v = Number(msg.v);
        if (!Number.isInteger(v) || v < 0 || v >= DIFFICULTIES.length) break;
        client.vote = v;
        broadcast(lobbyPayload());
        break;
      }

      case "pickCard": {
        /* Le serveur valide que la carte fait bien partie des trois offertes a
           CE joueur pour CE tour de choix. Sans cette verification, n'importe
           quel client s'octroie une legendaire en envoyant son identifiant. */
        if (phase !== PHASE_CARDS || cardPicked.has(id)) break;
        const offers = state.cardOffers.get(id);
        const p = state.players.get(id);
        if (!offers || !p || !offers.includes(msg.id)) break;
        if (!state.takeCard(p, msg.id)) break;

        cardPicked.add(id);
        broadcast(loadoutPayload());
        broadcast({ t: "cardsWait", pending: cardsPendingIds() });
        break;
      }

      /* Demande de pause. Trois refus, tous cote serveur : hors manche, quand
         le demandeur n'est pas en jeu, et — le seul qui compte — des qu'un
         second client est CONNECTE. On compte les connectes et non les joueurs
         en vie : un spectateur qui regarde a le droit de ne pas voir l'image se
         figer, et un mort en attente de relevement encore plus. */
      case "pause": {
        if (phase !== PHASE_ROUND) break;
        const on = !!msg.on;
        if (on && (joined().length > 1 || !state.players.has(id))) break;
        setPaused(on, on ? "" : "reprise");
        break;
      }

      /* Quitter la manche en cours sans fermer l'onglet. Le joueur redevient
         spectateur et entre a la manche suivante, exactement comme quelqu'un
         qui arrive en cours de partie — plutot qu'un etat « parti » de plus a
         tenir. Si c'etait le dernier, la boucle de simulation ramene la table
         au salon d'elle-meme. */
      case "leaveRound": {
        if (phase === PHASE_LOBBY || !state.players.has(id)) break;
        state.removePlayer(id);
        client.spectator = true;
        // Une pause en cours n'a plus de porteur : la lever ici evite qu'un
        // solo qui abandonne laisse le serveur fige jusqu'a l'echeance.
        setPaused(false, "le joueur a quitte la manche");
        broadcast(lobbyPayload());
        log(`${client.name} quitte la manche ${roundNumber}`);
        break;
      }

      case "start": {
        // Seul l'hote lance la manche, et seulement depuis le salon.
        if (id !== hostId || phase !== PHASE_LOBBY) break;
        if (joined().length === 0) break;
        startRound();
        break;
      }
    }
  };

  conn.onclose = () => {
    clients.delete(id);
    state.removePlayer(id);
    if (client.joined) {
      const changed = refreshHost();
      broadcast(lobbyPayload());
      log(`${client.name} quitte — ${joined().length} connecte(s)`
          + (changed && hostId ? ` (hote : ${clients.get(hostId)?.name})` : ""));
    }
  };
});

function sanitizeName(v) {
  if (typeof v !== "string") return "";
  return v.replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 14);
}

/* --- boucle de simulation --------------------------------------------------------- */

const inputs = new Map();
let acc = 0;
let lastTick = process.hrtime.bigint();
let sinceSnapshot = 0;
const SNAPSHOT_INTERVAL = 1 / CFG.SNAPSHOT_HZ;

setInterval(() => {
  const now = process.hrtime.bigint();
  let elapsed = Number(now - lastTick) / 1e9;
  lastTick = now;
  if (elapsed > 0.25) elapsed = 0.25;

  if (phase !== PHASE_LOBBY && state.players.size === 0) {
    abortRound();
  } else if (phase === PHASE_ROUND && paused) {
    /* En pause : on n'appelle PAS `step()`, et c'est tout. Les recharges et les
       etats vivent dans `p.timers` et `p.statuses`, qui ne descendent que la —
       une pause qui les ferait s'ecouler rendrait les competences gratuites,
       c'est-a-dire une faille et non un confort. L'accumulateur est vide a
       chaque tour, sinon la reprise rattraperait d'un coup toute la duree de la
       pause. Les instantanes, eux, continuent de partir : l'affichage reste
       vivant et le joueur voit ce qu'il a mis en pause. */
    acc = 0;
    if (Date.now() - pausedAt > PAUSE_MAX_MS) setPaused(false, "délai de 5 minutes écoulé");
  } else if (phase === PHASE_ROUND) {
    acc += elapsed;
    while (acc >= CFG.TICK && !state.cardsPending) {
      inputs.clear();
      for (const c of clients.values()) if (!c.spectator) inputs.set(c.id, c.input);
      state.step(CFG.TICK, inputs);
      /* Les demandes ponctuelles ne valent que pour un tick : sans cette remise
         a zero, elles repartiraient toutes seules a chaque fin de recharge.
         `ax`, `ay` et `ar` n'en font PAS partie — ce sont des etats continus,
         les vider ferait perdre la visee entre deux paquets d'entree. */
      for (const c of clients.values()) {
        c.input.dash = false;
        c.input.s1 = false;
        c.input.s2 = false;
      }
      acc -= CFG.TICK;
    }

    /* Canal d'evenements de mecanique. La simulation empile, le serveur vide et
       diffuse : message PONCTUEL, hors du snapshot a 20 Hz. Sans lui personne ne
       comprendra jamais l'Oracle — un cercle cyan ne dit pas « regroupez-vous »
       a la premiere rencontre. La file se vide meme sans client connecte, sinon
       elle accumulerait toute une manche jouee en solo hors ligne. */
    if (state.alerts.length > 0) {
      for (const a of state.alerts) broadcast({ t: "alert", ...a });
      state.alerts.length = 0;
    }
    if (state.gameOver) endRound();
    // La fin de vague leve le drapeau au milieu du rattrapage : on sort de la
    // boucle de ticks avant d'en simuler d'autres, sinon la pause commencait
    // une fraction de seconde apres la vague et les derniers projectiles
    // continuaient de voler pendant l'ecran de choix.
    else if (state.cardsPending) { acc = 0; enterCardPhase(); }
  } else if (phase === PHASE_CARDS) {
    acc = 0;
    if (cardsPendingIds().length === 0 || Date.now() >= cardDeadline) {
      forceRemainingPicks();
      resumeRound();
    }
  } else {
    acc = 0;
  }

  sinceSnapshot += elapsed;
  if (sinceSnapshot >= SNAPSHOT_INTERVAL) {
    sinceSnapshot = 0;
    if (clients.size > 0 && phase === PHASE_ROUND) {
      const snap = state.snapshot();
      snap.ph = phase;
      broadcast(snap);
    }
    /* Les degats portes au boss se vident APRES l'instantane, exactement comme
       la file d'alertes se vide apres diffusion : ce sont des cumuls d'un
       intervalle, pas un etat. Le vidage a lieu meme sans client connecte,
       sinon une manche jouee hors ligne accumulerait toute sa duree — la carte
       est bornee par le nombre de joueurs, mais le chiffre, lui, deviendrait
       faux a la reconnexion. */
    if (phase === PHASE_ROUND && state.bossDmg.size > 0) {
      state.bossDmg.clear();
      state.bossCrit.clear();
    }
  }
}, 1000 / 120);

/* --- demarrage ----------------------------------------------------------------------- */

function log(msg) {
  const t = new Date().toTimeString().slice(0, 8);
  console.log(`[${t}] ${msg}`);
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) out.push(net.address);
    }
  }
  return out;
}

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("\n  Survivor LAN — serveur demarre\n");
  console.log(`  Sur cette machine   http://localhost:${PORT}`);
  for (const ip of lanAddresses()) {
    console.log(`  Pour les autres     http://${ip}:${PORT}`);
  }
  console.log(`\n  ${MAX_PLAYERS} joueurs max — Ctrl+C pour arreter\n`);
});
