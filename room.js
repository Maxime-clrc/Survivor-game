/* ===========================================================================
   UNE SALLE = UNE PARTIE.
   Tout ce qui, avant le refactor en salons, etait l'etat global de server.js
   vit ici en champ d'instance : GameState, phases, pause, choix de cartes,
   accumulateur de tick. Le hub instancie, attache et detache les clients,
   et appelle tick() a 120 Hz.

   LA regle qui structure tout (infra-salons.md § 2) :

     Une Room ne touche jamais a Supabase, ne lit jamais de variable globale,
     et ne connait pas les autres salles. Elle recoit ses entrees, emet des
     evenements, et c'est tout.

   Les evenements sont les `hooks` recus a la construction : awardRun,
   awardPartial, sendProgress (la progression appartient au hub, seul
   ecrivain) et occupancy (le point de passage unique du recomptage — un seul
   chemin de sortie oublie laisserait une salle affichee 4/4 avec une place
   libre, et la fin de manche est justement le cas le plus frequent).
   C'est aussi ce qui rend une salle testable sans serveur ni base.
   =========================================================================== */

import { GameState, CFG, PLAYER_COLORS, DIFFICULTIES, DIFF_NORMAL } from "./shared/game_state.js";
import { CARD_CFG, cardBrief } from "./shared/cards.js";
import { CLASSES, CLASS_DEFAULT, bombRange } from "./shared/classes.js";
import { lockedCards } from "./shared/progression.js";
import { prepareMessage } from "./ws_lite.js";

export const PHASE_LOBBY = 0;
export const PHASE_ROUND = 1;
export const PHASE_CARDS = 2;

export const ROOM_MAX_PLAYERS = PLAYER_COLORS.length;

/* Index dans `PLAYER_COLORS`, dont l'ordre EST celui des classes. Nommer les
   quatre plutot que d'ecrire 0..3 dans `assignColors` : c'est la seule chose
   qui relie ce fichier a l'ordre de la table, et un nombre nu s'y trompe en
   silence. */
const COLOR_TANK  = 0;
const COLOR_HEAL  = 1;
const COLOR_DPS_A = 2;
const COLOR_DPS_B = 3;

const PAUSE_MAX_MS = 5 * 60 * 1000;
const SNAPSHOT_INTERVAL = 1 / CFG.SNAPSHOT_HZ;

export class Room {
  /* `slot` sert au DECALAGE des accumulateurs (infra-salons.md § 6) : seize
     salles qui simulent et diffusent dans le meme tour de boucle depassent le
     budget de 8,3 ms. Les origines se repartissent donc explicitement sur le
     cycle a la creation — la desynchronisation naturelle existe mais n'est
     pas fiable. */
  constructor(code, name, pass, slot, hooks) {
    this.code = code;
    this.name = name;
    // Le mot de passe reste en memoire, en clair : il protege une partie de
    // vingt minutes entre gens qui se connaissent, pas un compte. Il ne sort
    // JAMAIS de la salle — la liste du hub ne transporte qu'un booleen.
    this.pass = pass;
    this.hooks = hooks;

    this.clients = new Map();        // id -> client (tous authentifies)
    this.knownMembers = new Set();   // pseudoKeys passes par ici — re-entree sans mot de passe
    this.emptySince = 0;             // 0 = occupee ; sinon Date.now() du dernier depart

    this.phase = PHASE_LOBBY;
    this.state = new GameState();
    this.roundNumber = 0;
    this.hostId = 0;

    this.paused = false;
    this.pausedAt = 0;

    this.cardDeadline = 0;
    this.cardPicked = new Set();

    this.inputs = new Map();
    this.staggerFrac = (slot % 16) / 16;
    this.acc = 0;
    this.sinceSnapshot = -this.staggerFrac * SNAPSHOT_INTERVAL;
  }

  /* --- diffusion ------------------------------------------------------------- */

  /* Serialisation ET compression une seule fois par message, pour toute la
     salle — c'est la mesure de la spec : 0,31 ms par compression, une par
     salle et non une par client. */
  broadcast(obj) {
    const prep = prepareMessage(JSON.stringify(obj));
    for (const c of this.clients.values()) c.conn.sendPrepared(prep);
  }

  joined() {
    return [...this.clients.values()];
  }

  /* Effectif et etat pour la liste du hub. Le plafond voyage avec l'effectif :
     le client compose « 3/4 » lui-meme et sait si l'entree est cliquable sans
     reanalyser un texte. */
  info() {
    return {
      code: this.code,
      name: this.name,
      count: this.clients.size,
      max: ROOM_MAX_PLAYERS,
      state: this.phase === PHASE_LOBBY ? 0 : 1,
      locked: this.pass ? 1 : 0,
    };
  }

  /* --- entrees / sorties ------------------------------------------------------ */

  /* Premiere couleur libre. Ce n'est plus la regle generale — voir
     `assignColors` juste en dessous — mais c'est le filet de l'arrivee EN COURS
     DE MANCHE, ou l'attribution par classe refuse de toucher a quoi que ce
     soit. Sans lui, un spectateur arriverait sans couleur du tout. */
  freeColor() {
    const used = new Set(this.joined().map(c => c.colorIndex));
    for (let i = 0; i < PLAYER_COLORS.length; i++) if (!used.has(i)) return i;
    return 0;
  }

  /* LA COULEUR SUIT LA CLASSE, et c'est ici qu'elle est attribuee — nulle part
     ailleurs. Le Rempart est toujours bleu, le Soigneur toujours vert : a la
     table, la question posee vingt fois par manche est « ou est le soigneur »,
     et une teinte tiree au sort a l'arrivee n'y repondait jamais.

     Ce n'etait pas gratuit a obtenir. `freeColor()` attribuait la premiere
     couleur libre A L'ARRIVEE dans la salle, donc AVANT tout choix de classe, et
     ne la revoyait plus jamais. La couleur devant maintenant suivre un choix qui
     change au salon, elle se RECALCULE a chaque diffusion plutot que de se poser
     une fois : c'est idempotent, ca coute une boucle sur quatre clients, et il
     n'y a aucun point de mutation a ne pas oublier de brancher.

     LE TIREUR A DEUX TEINTES ET ELLES NE SUFFISENT PAS TOUJOURS. `unique: true`
     sur le tank et le soigneur veut dire « au plus un », pas « exactement un » :
     une table de quatre ou personne ne prend ces deux roles aligne QUATRE
     tireurs, et deux d'entre eux seraient identiques. Les tireurs puisent donc
     d'abord dans leurs deux teintes, puis EMPRUNTENT les couleurs de classe
     unique restees libres. La regle du dessus n'en souffre jamais : si un tank
     est la, le bleu est a lui, donc il n'est pas empruntable. */
  assignColors() {
    /* JAMAIS EN PLEINE MANCHE. Le recalcul depend de la salle entiere : si un
       tireur se deconnecte, les tireurs suivants remontent d'un cran dans le
       pool et changeraient de couleur SOUS LES YEUX des autres, au milieu d'un
       combat, alors que la couleur est precisement ce qui sert a se reperer.
       `startRound()` appelle cette methode avant de basculer la phase, donc
       l'attribution de depart passe ; tout ce qui arrive apres attend le salon
       suivant. Un arrivant en cours de manche garde la teinte que `freeColor()`
       lui a donnee a l'entree. */
    if (this.phase !== PHASE_LOBBY) return;
    // Tri par identifiant : l'ordre d'iteration d'une Map suffirait aujourd'hui,
    // mais l'attribution doit etre STABLE — un tireur qui change de teinte parce
    // qu'un autre joueur a quitte le salon est exactement le genre de scintillement
    // qu'on ne remarque qu'en partie.
    const list = [...this.joined()].sort((a, b) => a.id - b.id);
    const pris = new Set();

    for (const c of list) {
      const id = c.cls === null || c.cls === undefined ? null : CLASSES[c.cls]?.id;
      if (id === "tank" && !pris.has(COLOR_TANK)) {
        c.colorIndex = COLOR_TANK; pris.add(COLOR_TANK);
      } else if (id === "soigneur" && !pris.has(COLOR_HEAL)) {
        c.colorIndex = COLOR_HEAL; pris.add(COLOR_HEAL);
      } else {
        // Tireur, sans classe, ou doublon d'une classe unique que le serveur
        // aurait laisse passer : traite au second tour.
        c.colorIndex = -1;
      }
    }

    const pool = [COLOR_DPS_A, COLOR_DPS_B, COLOR_TANK, COLOR_HEAL]
      .filter(i => !pris.has(i));
    let k = 0;
    for (const c of list) {
      if (c.colorIndex === -1) c.colorIndex = pool[k++] ?? COLOR_DPS_A;
    }
  }

  /* L'hote est le plus ancien client encore present. S'il part, le suivant
     herite du bouton sans que personne n'ait a rien faire. Le calcul se fait
     AU SEIN de la salle — plus jamais globalement (point de vigilance § 10). */
  refreshHost() {
    const list = this.joined();
    if (list.some(c => c.id === this.hostId)) return false;
    this.hostId = list.length ? Math.min(...list.map(c => c.id)) : 0;
    return true;
  }

  attach(client) {
    client.room = this;
    /* Teinte provisoire : la premiere libre, comme avant. Elle ne sert qu'a
       couvrir l'arrivee EN COURS DE MANCHE, ou `assignColors()` refuse de
       toucher a quoi que ce soit — sans elle, un spectateur arriverait sans
       couleur du tout. Au salon, elle est ecrasee deux lignes plus bas. */
    client.colorIndex = this.freeColor();
    // Arriver en cours de manche ne coupe pas la partie des autres : on
    // regarde, on entre a la manche suivante — comportement inchange, par
    // salle desormais.
    client.spectator = this.phase !== PHASE_LOBBY;
    this.clients.set(client.id, client);
    // APRES l'insertion : l'attribution regarde la salle entiere, l'arrivant
    // compris. Il n'a pas encore de classe, il prendra donc une teinte de
    // tireur — et changera des qu'il choisira, comme tout le monde.
    this.assignColors();
    this.knownMembers.add(client.pseudoKey);
    this.emptySince = 0;

    // Un second joueur arrive : la pause tombe. Sinon un solo en pause bloque
    // la salle et l'arrivant regarde une image figee.
    if (this.paused) this.setPaused(false, "un second joueur est arrivé");

    this.refreshHost();
    client.conn.send(JSON.stringify({
      t: "roomJoined",
      code: this.code,
      name: this.name,
      host: this.hostId,
      phase: this.phase,
      round: this.roundNumber,
      spectator: client.spectator,
    }));
    this.broadcast(this.lobbyPayload());
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] ${client.name} rejoint`
      + `${client.spectator ? " (spectateur)" : ""} — ${this.clients.size} présent(s)`);
  }

  /* TOUTES les sorties passent ici : leaveRoom, fermeture de socket, fermeture
     de salle sur erreur. La part du deserteur se verse avant que le joueur ne
     sorte de la simulation, comme avant. */
  detach(client) {
    if (!this.clients.has(client.id)) return;
    this.hooks.awardPartial(client, this);
    this.state.removePlayer(client.id);
    this.clients.delete(client.id);
    client.room = null;
    client.spectator = false;

    if (this.clients.size === 0) {
      // Le delai de grace demarre ICI. La salle survit ROOM_GRACE_MS pour
      // qu'une coupure reseau breve ou un rechargement de page ne detruise
      // pas la partie — le hub fait le menage a l'echeance.
      this.emptySince = Date.now();
    } else {
      const changed = this.refreshHost();
      this.broadcast(this.lobbyPayload());
      if (changed && this.hostId) {
        this.hooks.log(`[${this.code}] hôte : ${this.clients.get(this.hostId)?.name}`);
      }
    }
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] ${client.name} quitte — ${this.clients.size} présent(s)`);
  }

  /* --- salon ------------------------------------------------------------------ */

  votedDifficulty() {
    const tally = DIFFICULTIES.map(() => 0);
    for (const c of this.joined()) tally[c.vote]++;

    let best = DIFF_NORMAL, bestN = -1;
    for (let i = 0; i < tally.length; i++) {
      if (tally[i] > bestN) { bestN = tally[i]; best = i; }
    }
    return { index: bestN > 0 ? best : DIFF_NORMAL, tally };
  }

  takenClasses() {
    const taken = new Set();
    for (const c of this.joined()) {
      if (c.cls === null) continue;
      if (CLASSES[c.cls]?.unique) taken.add(c.cls);
    }
    return taken;
  }

  /* Point de passage unique du deverrouillage de classe, appele par les deux
     sorties de manche AVANT de diffuser le salon — sinon les clients recoivent
     un `clsLocked` perime et grisent le selecteur. */
  unlockClasses() {
    for (const c of this.clients.values()) c.clsLocked = false;
  }

  lobbyPayload() {
    /* Recalcul AVANT la diffusion, et c'est le point de passage qui rend le
       reste inutile : le salon est rediffuse a chaque changement — arrivee,
       depart, choix de classe — donc la couleur suit la classe sans qu'aucun
       de ces trois endroits ait a y penser. Idempotent, quatre clients au plus. */
    this.assignColors();
    const vote = this.votedDifficulty();
    return {
      t: "lobby",
      phase: this.phase,
      host: this.hostId,
      round: this.roundNumber,
      // Le nom de la salle accompagne le salon : le titre dit OU l'on est,
      // maintenant qu'il existe plusieurs endroits ou etre.
      roomName: this.name,
      difficulty: vote.index,
      tally: vote.tally,
      modes: DIFFICULTIES.map(d => d.label),
      players: this.joined().map(c => ({
        id: c.id,
        name: c.name,
        colorIndex: c.colorIndex,
        spectator: c.spectator,
        vote: c.vote,
        total: c.total,
        cls: c.cls,
        clsLocked: c.clsLocked,
      })),
    };
  }

  expandCards(p) {
    const out = [];
    for (const [id, n] of p.cards) for (let i = 0; i < n; i++) out.push(id);
    return out;
  }

  loadoutPayload() {
    const byPlayer = {};
    for (const p of this.state.players.values()) byPlayer[p.id] = this.expandCards(p);
    return { t: "loadout", byPlayer };
  }

  scoreboardRows() {
    return this.joined().map(c => {
      const p = this.state.players.get(c.id);
      return {
        id: c.id,
        name: c.name,
        colorIndex: c.colorIndex,
        played: !!p,
        cls: p ? p.cls : c.cls,
        level: p ? this.state.level : 1,
        score: p ? p.score : 0,
        kills: p ? p.kills : 0,
        deaths: p ? p.deaths : 0,
        damage: p ? Math.round(p.damageDealt) : 0,
        hurtBy: p ? p.hurtBy.map(v => Math.round(v)) : [],
        cards: p ? this.expandCards(p) : [],
        total: c.total,
        cores: c.lastGain ?? 0,
      };
    }).sort((a, b) => b.score - a.score);
  }

  /* --- pause ------------------------------------------------------------------ */

  /* Levee de pause, quelle qu'en soit la raison. Point de passage unique :
     trois causes (demande du joueur, echeance, arrivee d'un second joueur) et
     un seul endroit ou l'etat retombe. */
  setPaused(on, why = "") {
    if (this.paused === on) return;
    this.paused = on;
    this.pausedAt = on ? Date.now() : 0;
    this.broadcast({ t: "paused", on: on ? 1 : 0, why });
    this.hooks.log(`[${this.code}] ` + (on ? "manche en pause (solo)"
      : `pause levée${why ? ` — ${why}` : ""}`));
  }

  /* --- cartes ----------------------------------------------------------------- */

  cardsPendingIds() {
    return [...this.state.players.keys()]
      .filter(id => !this.cardPicked.has(id) && this.clients.has(id));
  }

  enterCardPhase() {
    this.phase = PHASE_CARDS;
    this.state.cardsPending = false;
    this.cardPicked.clear();
    this.cardDeadline = Date.now() + CARD_CFG.PICK_TIME * 1000;

    for (const [id, offers] of this.state.cardOffers) {
      const c = this.clients.get(id);
      if (!c) continue;
      c.conn.send(JSON.stringify({
        t: "cards",
        reroll: c.profile?.confort.includes("relance") && !c.rerollUsed ? 1 : 0,
        wave: this.state.wave,
        bossWave: this.state.waveBoss ? 1 : 0,
        boss: this.state.bossCount,
        bossKind: this.state.lastBossKind,
        more: this.state.pendingLevels,
        level: this.state.level,
        deadline: this.cardDeadline,
        offers: offers.map(cardBrief),
      }));
    }
    this.broadcast({ t: "cardsWait", pending: this.cardsPendingIds() });
    this.hooks.log(`[${this.code}] vague ${this.state.wave} terminée — choix de cartes`
      + ` (niveau ${this.state.level}`
      + `${this.state.pendingLevels > 0 ? `, ${this.state.pendingLevels} autre(s) à suivre` : ""})`);
  }

  resumeRound() {
    if (this.state.pendingLevels > 0) {
      this.state.openCards();
      this.enterCardPhase();
      return;
    }
    this.phase = PHASE_ROUND;
    this.state.cardOffers = new Map();
    this.broadcast(this.loadoutPayload());
  }

  forceRemainingPicks() {
    let forced = 0;
    for (const [id, offers] of this.state.cardOffers) {
      if (this.cardPicked.has(id)) continue;
      const p = this.state.players.get(id);
      if (p && offers.length) { this.state.takeCard(p, offers[0]); forced++; }
      this.cardPicked.add(id);
    }
    if (forced > 0) {
      this.hooks.log(`[${this.code}] délai de choix écoulé — ${forced} carte(s) d'office`);
    }
  }

  /* --- manche ----------------------------------------------------------------- */

  startRound() {
    this.roundNumber++;
    this.setPaused(false);
    const diff = this.votedDifficulty().index;
    this.state = new GameState(diff);
    this.cardPicked.clear();
    /* Les classes non choisies retombent sur le tireur AVANT l'attribution des
       couleurs, et l'attribution avant `addPlayer` : elle depend de la classe,
       et un `null` ne dirait pas quelle teinte prendre. Deux passes plutot
       qu'une, pour cette seule raison. */
    for (const c of this.joined()) if (c.cls === null) c.cls = CLASS_DEFAULT;
    this.assignColors();
    for (const c of this.joined()) {
      c.spectator = false;
      c.clsLocked = true;
      /* Progression permanente (lot D) : la simulation recoit les lignes
         EQUIPEES de la classe jouee, les achats de confort et les cartes
         encore verrouillees. La salle LIT le profil — elle n'y ecrit jamais,
         c'est l'affaire du hub. */
      let meta = null;
      if (c.profile) {
        const clsId = CLASSES[c.cls].id;
        const cp = c.profile.classes[clsId];
        const lines = {};
        if (cp) {
          for (const lid of cp.equipped ?? []) {
            const t = cp.tiers?.[lid] | 0;
            if (t > 0) lines[lid] = t;
          }
        }
        meta = {
          lines,
          confort: {
            ravitaillement: c.profile.confort.includes("ravitaillement") ? 1 : 0,
            quatrieme: c.profile.confort.includes("quatrieme") ? 1 : 0,
          },
          locked: lockedCards(c.profile.milestones),
        };
      }
      c.rerollUsed = false;
      this.state.addPlayer(c.id, c.name, c.colorIndex, c.cls, meta);
      c.input.x = 0; c.input.y = 0; c.input.dash = false;
      c.input.s1 = false; c.input.s2 = false; c.input.s3 = false;
    }
    this.phase = PHASE_ROUND;
    // Repartir la simulation sur le cycle de la boucle : la manche demarre au
    // clic de l'hote, mais deux salles lancees dans la meme seconde ne doivent
    // pas simuler dans le meme tour (infra-salons.md § 6).
    this.acc = -this.staggerFrac * CFG.TICK;
    this.broadcast({ t: "round", round: this.roundNumber, difficulty: diff });
    this.broadcast(this.lobbyPayload());
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] manche ${this.roundNumber} lancée — `
      + `${this.state.players.size} joueur(s), difficulté ${DIFFICULTIES[diff].label}`);
  }

  abortRound() {
    this.phase = PHASE_LOBBY;
    this.setPaused(false);
    this.unlockClasses();
    this.hooks.log(`[${this.code}] manche ${this.roundNumber} interrompue — plus aucun joueur en jeu`);
    this.broadcast({ t: "roundAbort", round: this.roundNumber });
    this.broadcast(this.lobbyPayload());
    this.hooks.occupancy(this);
  }

  endRound() {
    this.phase = PHASE_LOBBY;
    this.setPaused(false);
    this.unlockClasses();
    /* Les noyaux se versent AVANT le tableau : `scoreboardRows` lit `lastGain`
       pour afficher le gain de chacun. C'est le hub qui ecrit — la salle emet
       l'evenement, la persistance ne la concerne pas. */
    this.hooks.awardRun(this);
    for (const c of this.joined()) {
      const p = this.state.players.get(c.id);
      if (!p) continue;
      c.total.score += p.score;
      c.total.kills += p.kills;
      c.total.deaths += p.deaths;
      c.total.rounds += 1;
    }
    const rows = this.scoreboardRows();
    this.broadcast({
      t: "roundEnd",
      round: this.roundNumber,
      wave: this.state.wave,
      time: Math.round(this.state.time),
      kills: this.state.totalKills,
      host: this.hostId,
      rows,
    });
    this.broadcast(this.lobbyPayload());
    // Le solde de compte part APRES le bilan : voir awardRun cote hub.
    for (const c of this.joined()) if (c.profile) this.hooks.sendProgress(c);
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] manche ${this.roundNumber} terminée — `
      + `${Math.round(this.state.time)} s, ${this.state.totalKills} kills`);
  }

  /* --- messages de jeu --------------------------------------------------------- */

  /* Tout ce qui n'a de sens QUE dans une partie. Le hub route ici apres avoir
     traite les messages d'etat hub — un message de jeu recu hors salle est
     rejete la-bas, c'est exactement le type de message qu'un client modifie
     enverrait. */
  handleMessage(client, msg) {
    const id = client.id;
    switch (msg.t) {
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

        client.input.ar = bombRange(msg.ar);

        if (msg.d) client.input.dash = true;
        if (msg.s1) client.input.s1 = true;
        if (msg.s2) client.input.s2 = true;
        if (msg.s3) client.input.s3 = true;
        break;
      }

      case "pickClass": {
        if (client.clsLocked) break;
        const v = Number(msg.cls);
        if (!Number.isInteger(v) || v < 0 || v >= CLASSES.length) break;
        if (CLASSES[v].unique && client.cls !== v && this.takenClasses().has(v)) break;
        client.cls = v;
        this.broadcast(this.lobbyPayload());
        break;
      }

      case "vote": {
        if (this.phase !== PHASE_LOBBY) break;
        const v = Number(msg.v);
        if (!Number.isInteger(v) || v < 0 || v >= DIFFICULTIES.length) break;
        client.vote = v;
        this.broadcast(this.lobbyPayload());
        break;
      }

      case "pickCard": {
        if (this.phase !== PHASE_CARDS || this.cardPicked.has(id)) break;
        const offers = this.state.cardOffers.get(id);
        const p = this.state.players.get(id);
        if (!offers || !p || !offers.includes(msg.id)) break;
        if (!this.state.takeCard(p, msg.id)) break;

        this.cardPicked.add(id);
        this.broadcast(this.loadoutPayload());
        this.broadcast({ t: "cardsWait", pending: this.cardsPendingIds() });
        break;
      }

      case "pause": {
        if (this.phase !== PHASE_ROUND) break;
        const on = !!msg.on;
        if (on && (this.joined().length > 1 || !this.state.players.has(id))) break;
        this.setPaused(on, on ? "" : "reprise");
        break;
      }

      case "leaveRound": {
        if (this.phase === PHASE_LOBBY || !this.state.players.has(id)) break;
        this.hooks.awardPartial(client, this);
        this.state.removePlayer(id);
        this.hooks.sendProgress(client);
        client.spectator = true;
        this.setPaused(false, "le joueur a quitté la manche");
        this.broadcast(this.lobbyPayload());
        this.hooks.log(`[${this.code}] ${client.name} quitte la manche ${this.roundNumber}`);
        break;
      }

      case "start": {
        if (id !== this.hostId || this.phase !== PHASE_LOBBY) break;
        if (this.joined().length === 0) break;
        this.startRound();
        break;
      }

      case "reroll": {
        if (this.phase !== PHASE_CARDS || this.cardPicked.has(id)) break;
        if (!client.profile?.confort.includes("relance") || client.rerollUsed) break;
        const p = this.state.players.get(id);
        if (!p || !this.state.cardOffers.has(id)) break;
        client.rerollUsed = true;
        const offers = this.state.offerCards(p);
        this.state.cardOffers.set(id, offers);
        client.conn.send(JSON.stringify({
          t: "cards",
          reroll: 0,
          wave: this.state.wave,
          bossWave: this.state.waveBoss ? 1 : 0,
          boss: this.state.bossCount,
          bossKind: this.state.lastBossKind,
          more: this.state.pendingLevels,
          level: this.state.level,
          deadline: this.cardDeadline,
          offers: offers.map(cardBrief),
        }));
        break;
      }
    }
  }

  /* --- boucle ------------------------------------------------------------------ */

  /* Un pas de la boucle partagee. `dt` est deja borne par le hub (0,25 s max) :
     chaque salle garde son propre accumulateur, mais l'horloge est commune. */
  tick(dt) {
    if (this.phase !== PHASE_LOBBY && this.state.players.size === 0) {
      this.abortRound();
    } else if (this.phase === PHASE_ROUND && this.paused) {
      /* En pause : on n'appelle PAS step(). Les recharges et les etats vivent
         dans p.timers et p.statuses, qui ne descendent que la. L'accumulateur
         est vide a chaque tour, sinon la reprise rattraperait d'un coup toute
         la duree de la pause. Les instantanes continuent de partir. */
      this.acc = 0;
      if (Date.now() - this.pausedAt > PAUSE_MAX_MS) {
        this.setPaused(false, "délai de 5 minutes écoulé");
      }
    } else if (this.phase === PHASE_ROUND) {
      this.acc += dt;
      while (this.acc >= CFG.TICK && !this.state.cardsPending) {
        this.inputs.clear();
        for (const c of this.clients.values()) if (!c.spectator) this.inputs.set(c.id, c.input);
        this.state.step(CFG.TICK, this.inputs);
        // Les demandes ponctuelles ne valent que pour un tick ; `ax`, `ay` et
        // `ar` sont des etats continus, on ne les vide pas.
        for (const c of this.clients.values()) {
          c.input.dash = false;
          c.input.s1 = false;
          c.input.s2 = false;
          c.input.s3 = false;
        }
        this.acc -= CFG.TICK;
      }

      if (this.state.alerts.length > 0) {
        for (const a of this.state.alerts) this.broadcast({ t: "alert", ...a });
        this.state.alerts.length = 0;
      }
      if (this.state.gameOver) this.endRound();
      else if (this.state.cardsPending) { this.acc = 0; this.enterCardPhase(); }
    } else if (this.phase === PHASE_CARDS) {
      this.acc = 0;
      if (this.cardsPendingIds().length === 0 || Date.now() >= this.cardDeadline) {
        this.forceRemainingPicks();
        this.resumeRound();
      }
    } else {
      this.acc = 0;
    }

    this.sinceSnapshot += dt;
    if (this.sinceSnapshot >= SNAPSHOT_INTERVAL) {
      // Remise a zero RELATIVE et non absolue : conserver le decalage de
      // diffusion pose a la creation, sinon toutes les salles reconvergent
      // vers le meme instant d'envoi au premier ralentissement.
      this.sinceSnapshot = 0;
      if (this.clients.size > 0 && this.phase === PHASE_ROUND) {
        const snap = this.state.snapshot();
        snap.ph = this.phase;
        this.broadcast(snap);
      }
      if (this.phase === PHASE_ROUND && this.state.bossDmg.size > 0) this.state.bossDmg.clear();
    }
  }
}
