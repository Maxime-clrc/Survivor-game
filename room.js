
import {
  GameState, CFG, PLAYER_COLORS, DIFFICULTIES, DIFF_NORMAL, BIOMES,
} from "./shared/game_state.js";
import { CARD_CFG, cardBrief, banClosure } from "./shared/cards.js";
import { segmentName } from "./shared/timeline.js";
import { RELIC_CFG, relicRerollCost } from "./shared/reliques.js";
import { CLASSES, CLASS_DEFAULT, bombRange } from "./shared/classes.js";
import { lockedCards } from "./shared/progression.js";
import { prepareMessage } from "./ws_lite.js";
import { PERF_ON, Sampler, nowMs, f1 } from "./perf.js";

export const PHASE_LOBBY = 0;
export const PHASE_ROUND = 1;
export const PHASE_CARDS = 2;
export const PHASE_MERCHANT = 3;

export const ROOM_MAX_PLAYERS = PLAYER_COLORS.length;

const COLOR_TANK  = 0;
const COLOR_HEAL  = 1;
const COLOR_DPS_A = 2;
const COLOR_DPS_B = 3;

const PAUSE_MAX_MS = 5 * 60 * 1000;
const SNAPSHOT_INTERVAL = 1 / CFG.SNAPSHOT_HZ;

const WARMUP_S = 20;

const LAUNCH_DELAY_MS = 3000;

const ROUND_HISTORY_MAX = 8;

export class Room {
  constructor(code, name, pass, slot, hooks) {
    this.code = code;
    this.name = name;
    this.pass = pass;
    this.hooks = hooks;

    this.clients = new Map();
    this.knownMembers = new Set();
    this.emptySince = 0;

    this.phase = PHASE_LOBBY;
    this.drawBiome();
    this.state = new GameState(DIFF_NORMAL, this.biomeIndex, this.seed);
    this.roundNumber = 0;
    this.hostId = 0;

    this.history = [];

    this.paused = false;
    this.pausedAt = 0;

    this.briefOpen = false;

    this.launchAt = 0;

    this.cardDeadline = 0;
    this.cardPicked = new Set();

    this.inputs = new Map();
    this.staggerFrac = (slot % 16) / 16;
    this.acc = 0;
    this.sinceSnapshot = -this.staggerFrac * SNAPSHOT_INTERVAL;

    this.perf = { esp: new Sampler(), lastSend: 0, clair: 0, defl: 0 };
  }

  perfArm() {
    this.perf.esp.reset();
    this.perf.lastSend = 0;
    this.perf.clair = 0;
    this.perf.defl = 0;
  }


  broadcast(obj) {
    const prep = prepareMessage(JSON.stringify(obj));
    if (PERF_ON) {
      if (prep.plain.length > this.perf.clair) this.perf.clair = prep.plain.length;
      const dl = prep.deflated ? prep.deflated.length : 0;
      if (dl > this.perf.defl) this.perf.defl = dl;
    }
    for (const c of this.clients.values()) c.conn.sendPrepared(prep);
  }

  perfReport() {
    if (!PERF_ON || this.phase !== PHASE_ROUND) return;
    const p = this.perf;
    const e = p.esp.stats();
    let deflate = 0, bloq = 0, fileMax = 0;
    for (const c of this.clients.values()) {
      if (c.conn.deflate) deflate++;
      bloq += c.conn.perfBlocked;
      if (c.conn.perfQueueMax > fileMax) fileMax = c.conn.perfQueueMax;
      c.conn.perfBlocked = 0;
      c.conn.perfQueueMax = 0;
    }
    console.log(`[perf] salle=${this.code} s${this.state.segment}`
      + ` | diff n=${e.n} esp moy=${f1(e.moy)} min=${f1(e.min)} max=${f1(e.max)} ms`
      + ` | snap clair=${p.clair} defl=${p.defl}`
      + ` | conn=${this.clients.size} defl=${deflate}/${this.clients.size}`
      + ` bloq=${bloq} fileMax=${fileMax}`);
    p.esp.reset();
    p.clair = 0;
    p.defl = 0;
  }

  joined() {
    return [...this.clients.values()];
  }

  info() {
    return {
      code: this.code,
      name: this.name,
      count: this.clients.size,
      max: ROOM_MAX_PLAYERS,
      state: this.phase === PHASE_LOBBY ? 0 : 1,
      locked: this.pass ? 1 : 0,
      diff: this.phase === PHASE_LOBBY ? this.votedDifficulty().index : this.state.diffIndex,
      segment: this.phase === PHASE_LOBBY ? 0 : this.state.segment,
    };
  }


  freeColor() {
    const used = new Set(this.joined().map(c => c.colorIndex));
    for (let i = 0; i < PLAYER_COLORS.length; i++) if (!used.has(i)) return i;
    return 0;
  }

  assignColors() {
    if (this.phase !== PHASE_LOBBY) return;
    const list = [...this.joined()].sort((a, b) => a.id - b.id);
    const pris = new Set();

    for (const c of list) {
      const id = c.cls === null || c.cls === undefined ? null : CLASSES[c.cls]?.id;
      if (id === "tank" && !pris.has(COLOR_TANK)) {
        c.colorIndex = COLOR_TANK; pris.add(COLOR_TANK);
      } else if (id === "soigneur" && !pris.has(COLOR_HEAL)) {
        c.colorIndex = COLOR_HEAL; pris.add(COLOR_HEAL);
      } else {
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

  refreshHost() {
    const list = this.joined();
    if (list.some(c => c.id === this.hostId)) return false;
    this.hostId = list.length ? Math.min(...list.map(c => c.id)) : 0;
    return true;
  }

  attach(client) {
    client.room = this;
    client.colorIndex = this.freeColor();
    client.spectator = this.phase !== PHASE_LOBBY;
    client.ready = false;
    client.briefDone = false;
    this.clients.set(client.id, client);
    this.assignColors();
    this.knownMembers.add(client.pseudoKey);
    this.emptySince = 0;

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

  detach(client) {
    if (!this.clients.has(client.id)) return;
    this.hooks.awardPartial(client, this);
    this.state.removePlayer(client.id);
    this.clients.delete(client.id);
    client.room = null;
    client.spectator = false;

    if (this.clients.size === 0) {
      this.emptySince = Date.now();
    } else {
      this.syncBrief();
      const changed = this.refreshHost();
      this.broadcast(this.lobbyPayload());
      if (changed && this.hostId) {
        this.hooks.log(`[${this.code}] hôte : ${this.clients.get(this.hostId)?.name}`);
      }
    }
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] ${client.name} quitte — ${this.clients.size} présent(s)`);
  }


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

  unlockClasses() {
    for (const c of this.clients.values()) c.clsLocked = false;
  }

  drawBiome() {
    this.biomeIndex = Math.floor(Math.random() * BIOMES.length);
    this.seed = Math.floor(Math.random() * 0x7fffffff);
  }

  recordRound() {
    this.history.push({
      at: Date.now(),
      diffIndex: this.state.diffIndex,
      segment: this.state.segment,
      level: this.state.level,
      victory: this.state.victory ? 1 : 0,
    });
    if (this.history.length > ROUND_HISTORY_MAX) this.history.shift();
  }

  notReady() {
    if (this.joined().length <= 1) return [];
    return this.joined().filter(c => !c.ready);
  }

  launchPayload(why = "") {
    const reste = this.launchAt ? Math.max(0, this.launchAt - Date.now()) : 0;
    return { t: "launch", delay: +(reste / 1000).toFixed(2), why };
  }

  cancelLaunch(why = "") {
    if (!this.launchAt) return;
    this.launchAt = 0;
    this.broadcast(this.launchPayload(why));
    this.hooks.log(`[${this.code}] lancement annulé${why ? ` — ${why}` : ""}`);
  }

  tickLaunch() {
    if (!this.launchAt) return;
    if (this.phase !== PHASE_LOBBY || this.joined().length === 0) {
      this.cancelLaunch("la salle a changé d'état");
      return;
    }
    const manquants = this.notReady();
    if (manquants.length > 0) {
      const arrivee = this.joined().length === 2 && !this.joined().some(c => c.ready);
      this.cancelLaunch(arrivee
        ? "un joueur vient d'arriver — confirmez pour lancer"
        : `${manquants[0].name} n'est plus prêt`);
      return;
    }
    if (Date.now() >= this.launchAt) {
      this.launchAt = 0;
      this.startRound();
    }
  }

  briefWaiting() {
    return this.joined().filter(c => this.state.players.has(c.id) && !c.briefDone);
  }

  syncBrief() {
    if (!this.briefOpen || this.phase !== PHASE_ROUND) return;
    const attente = this.briefWaiting();
    if (attente.length > 0 && this.state.warmup > 0) {
      this.broadcast({ t: "briefState", waiting: attente.map(c => c.name) });
      return;
    }
    this.briefOpen = false;
    if (this.state.warmup > 0) {
      this.state.warmup = 0;
      this.hooks.log(`[${this.code}] briefing fermé par tous — la vague part`);
    }
    this.broadcast({ t: "briefState", waiting: [] });
  }

  lobbyPayload() {
    this.assignColors();
    const vote = this.votedDifficulty();
    return {
      t: "lobby",
      phase: this.phase,
      host: this.hostId,
      round: this.roundNumber,
      roomName: this.name,
      difficulty: vote.index,
      tally: vote.tally,
      modes: DIFFICULTIES.map(d => d.label),
      script: DIFFICULTIES[vote.index]?.script ?? "normal",
      biome: this.biomeIndex,
      seed: this.seed,
      history: this.history.slice().reverse(),
      players: this.joined().map(c => ({
        id: c.id,
        name: c.name,
        colorIndex: c.colorIndex,
        spectator: c.spectator,
        vote: c.vote,
        total: c.total,
        cls: c.cls,
        clsLocked: c.clsLocked,
        ready: c.ready ? 1 : 0,
        ping: c.conn.rtt != null ? Math.round(c.conn.rtt) : -1,
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
    const relics = {};
    for (const p of this.state.players.values()) {
      byPlayer[p.id] = this.expandCards(p);
      relics[p.id] = [...p.relics.keys()];
    }
    return { t: "loadout", byPlayer, relics };
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
        heal: p ? Math.round(p.healDealt) : 0,
        hurtBy: p ? p.hurtBy.map(v => Math.round(v)) : [],
        cards: p ? this.expandCards(p) : [],
        total: c.total,
        cores: c.lastGain ?? 0,
        final: c.lastFinal ?? null,
      };
    }).sort((a, b) => b.score - a.score);
  }


  setPaused(on, why = "") {
    if (this.paused === on) return;
    this.paused = on;
    this.pausedAt = on ? Date.now() : 0;
    this.broadcast({ t: "paused", on: on ? 1 : 0, why });
    this.hooks.log(`[${this.code}] ` + (on ? "manche en pause (solo)"
      : `pause levée${why ? ` — ${why}` : ""}`));
  }


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
        segment: this.state.segment,
        bossWave: this.state.relicBossDue ? 1 : 0,
        boss: this.state.bossCount,
        bossKind: this.state.lastBossKind,
        more: this.state.pendingLevels,
        level: this.state.level,
        deadline: this.cardDeadline,
        offers: offers.map(cardBrief),
      }));
    }
    this.broadcast({ t: "cardsWait", pending: this.cardsPendingIds() });
    this.hooks.log(`[${this.code}] ${segmentName(this.state.segment)} — choix de cartes`
      + ` (niveau ${this.state.level}`
      + `${this.state.pendingLevels > 0 ? `, ${this.state.pendingLevels} autre(s) à suivre` : ""})`);
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


  merchantPendingIds() {
    return [...this.state.players.keys()]
      .filter(id => this.state.relicOffers.has(id) && this.clients.has(id));
  }

  enterMerchantPhase() {
    this.phase = PHASE_MERCHANT;
    this.state.relicPending = false;
    this.merchantDeadline = Date.now() + RELIC_CFG.PICK_TIME * 1000;

    for (const [id, offers] of this.state.relicOffers) {
      const c = this.clients.get(id);
      if (!c) continue;
      const p = this.state.players.get(id);
      c.conn.send(JSON.stringify({
        t: "merchant",
        segment: this.state.segment,
        deadline: this.merchantDeadline,
        eclats: p ? p.eclats : 0,
        rerollCost: relicRerollCost(this.state.level),
        offers,
      }));
    }
    this.broadcast({ t: "merchantWait", pending: this.merchantPendingIds() });
    this.hooks.log(`[${this.code}] boss vaincu — marchand ouvert`);
  }

  merchantDone(id) {
    this.state.relicOffers.delete(id);
  }

  merchantSend(id) {
    const c = this.clients.get(id);
    const p = this.state.players.get(id);
    if (!c || !p) return;
    const offers = this.state.relicOffers.get(id);
    if (!offers) return;
    c.conn.send(JSON.stringify({
      t: "merchant",
      segment: this.state.segment,
      deadline: this.merchantDeadline,
      eclats: p.eclats,
      rerollCost: relicRerollCost(this.state.level),
      offers,
    }));
  }

  forceMerchantClose() {
    this.state.closeMerchant();
  }

  resumeRound() {
    const ecran = this.state.openNextScreen();
    if (ecran === "cards") { this.enterCardPhase(); return; }
    if (ecran === "merchant") { this.enterMerchantPhase(); return; }
    this.phase = PHASE_ROUND;
    this.state.cardOffers = new Map();
    this.broadcast(this.loadoutPayload());
  }


  startRound() {
    this.roundNumber++;
    this.setPaused(false);
    const diff = this.votedDifficulty().index;
    this.state = new GameState(diff, this.biomeIndex, this.seed);
    this.cardPicked.clear();
    for (const c of this.joined()) if (c.cls === null) c.cls = CLASS_DEFAULT;
    this.assignColors();
    for (const c of this.joined()) {
      c.spectator = false;
      c.clsLocked = true;
      c.ready = false;
      c.briefDone = false;
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
          locked: (() => {
            const locked = lockedCards(c.profile.milestones);
            for (const bid of c.profile.bannedCards ?? []) locked.add(bid);
            return locked;
          })(),
        };
      }
      c.rerollUsed = false;
      c.lastFinal = null;
      this.state.addPlayer(c.id, c.name, c.colorIndex, c.cls, meta);
      c.input.x = 0; c.input.y = 0; c.input.dash = false;
      c.input.s1 = false; c.input.s2 = false; c.input.s3 = false;
    }
    this.state.warmup = WARMUP_S;
    this.briefOpen = true;
    this.phase = PHASE_ROUND;
    this.acc = -this.staggerFrac * CFG.TICK;
    this.broadcast({
      t: "round",
      round: this.roundNumber,
      difficulty: diff,
      warmup: WARMUP_S,
    });
    this.broadcast(this.lobbyPayload());
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] manche ${this.roundNumber} lancée — `
      + `${this.state.players.size} joueur(s), difficulté ${DIFFICULTIES[diff].label}`
      + `, ${WARMUP_S} s d'échauffement`);
  }

  abortRound() {
    this.phase = PHASE_LOBBY;
    this.setPaused(false);
    this.unlockClasses();
    this.recordRound();
    this.drawBiome();
    this.hooks.log(`[${this.code}] manche ${this.roundNumber} interrompue — plus aucun joueur en jeu`);
    this.broadcast({ t: "roundAbort", round: this.roundNumber });
    this.broadcast(this.lobbyPayload());
    this.hooks.occupancy(this);
  }

  endRound() {
    this.phase = PHASE_LOBBY;
    this.setPaused(false);
    this.unlockClasses();
    this.recordRound();
    this.drawBiome();
    const final = this.state.victory;
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
      segment: this.state.segment,
      level: this.state.level,
      victory: this.state.victory ? 1 : 0,
      biome: this.state.biomeIndex,
      finalKill: this.state.finalKill,
      time: Math.round(this.state.time),
      kills: this.state.totalKills,
      host: this.hostId,
      rows,
      ...(final ? {
        final: {
          time: this.state.finalKill,
          level: this.state.level,
          difficulty: this.state.diffIndex,
          variant: DIFFICULTIES[this.state.diffIndex]?.script ?? "normal",
          biome: this.state.biomeIndex,
          players: this.joined().length,
        },
      } : {}),
    });
    this.broadcast(this.lobbyPayload());
    for (const c of this.joined()) if (c.profile) this.hooks.sendProgress(c);
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] manche ${this.roundNumber} terminée — `
      + `${Math.round(this.state.time)} s, ${this.state.totalKills} kills`);
  }


  handleMessage(client, msg) {
    const id = client.id;
    switch (msg.t) {
      case "input": {
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

      case "ready": {
        if (this.phase !== PHASE_LOBBY) break;
        client.ready = !!msg.on;
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

      case "buyRelic": {
        if (this.phase !== PHASE_MERCHANT) break;
        const p = this.state.players.get(id);
        if (!p || !this.state.relicOffers.has(id)) break;
        if (!this.state.buyRelic(p, msg.id)) break;
        this.merchantSend(id);
        this.broadcast({ t: "merchantWait", pending: this.merchantPendingIds() });
        break;
      }

      case "rerollRelic": {
        if (this.phase !== PHASE_MERCHANT) break;
        const p = this.state.players.get(id);
        if (!p || !this.state.relicOffers.has(id)) break;
        if (!this.state.rerollRelic(p)) break;
        this.merchantSend(id);
        this.broadcast({ t: "merchantWait", pending: this.merchantPendingIds() });
        break;
      }

      case "skipMerchant": {
        if (this.phase !== PHASE_MERCHANT) break;
        if (!this.state.relicOffers.has(id)) break;
        this.merchantDone(id);
        this.broadcast({ t: "merchantWait", pending: this.merchantPendingIds() });
        break;
      }

      case "banCard": {
        if (this.phase !== PHASE_CARDS || this.cardPicked.has(id)) break;
        const offers = this.state.cardOffers.get(id);
        const p = this.state.players.get(id);
        if (!offers || !p || !offers.includes(msg.id)) break;
        if (!client.profile) break;
        const pr = client.profile;
        pr.bannedCards ??= [];
        if (pr.bannedCards.includes(msg.id)) break;

        const closure = banClosure(msg.id).filter(bid => !pr.bannedCards.includes(bid));
        pr.bannedCards.push(...closure);
        p.locked ??= new Set();
        for (const bid of closure) p.locked.add(bid);
        this.hooks.persist(client);
        this.hooks.sendProgress(client);

        this.cardPicked.add(id);
        this.broadcast({ t: "cardsWait", pending: this.cardsPendingIds() });
        this.hooks.log(`[${this.code}] ${client.name} bannit ${msg.id}`
          + (closure.length > 1 ? ` (+${closure.length - 1} dépendante(s))` : ""));
        break;
      }

      case "pause": {
        if (this.phase !== PHASE_ROUND) break;
        const on = !!msg.on;
        if (on && (this.joined().length > 1 || !this.state.players.has(id))) break;
        this.setPaused(on, on ? "" : "reprise");
        break;
      }

      case "briefDone": {
        if (this.phase !== PHASE_ROUND || !this.state.players.has(id)) break;
        if (client.briefDone) break;
        client.briefDone = true;
        this.syncBrief();
        break;
      }

      case "leaveRound": {
        if (this.phase === PHASE_LOBBY || !this.state.players.has(id)) break;
        this.hooks.awardPartial(client, this);
        this.state.removePlayer(id);
        this.hooks.sendProgress(client);
        client.spectator = true;
        this.setPaused(false, "le joueur a quitté la manche");
        this.syncBrief();
        this.broadcast(this.lobbyPayload());
        this.hooks.log(`[${this.code}] ${client.name} quitte la manche ${this.roundNumber}`);
        break;
      }

      case "start": {
        if (id !== this.hostId || this.phase !== PHASE_LOBBY) break;
        if (this.joined().length === 0) break;
        if (this.notReady().length > 0) break;
        if (this.launchAt) break;
        this.launchAt = Date.now() + LAUNCH_DELAY_MS;
        this.broadcast(this.launchPayload());
        this.hooks.log(`[${this.code}] lancement dans ${LAUNCH_DELAY_MS / 1000} s`);
        break;
      }

      case "cancelStart": {
        if (this.phase !== PHASE_LOBBY || !this.launchAt) break;
        this.cancelLaunch(`annulé par ${client.name}`);
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
          segment: this.state.segment,
          bossWave: 1,
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


  tick(dt) {
    this.tickLaunch();
    if (this.phase !== PHASE_LOBBY && this.state.players.size === 0) {
      this.abortRound();
    } else if (this.phase === PHASE_ROUND && this.paused) {
      this.acc = 0;
      if (Date.now() - this.pausedAt > PAUSE_MAX_MS) {
        this.setPaused(false, "délai de 5 minutes écoulé");
      }
    } else if (this.phase === PHASE_ROUND) {
      this.acc += dt;
      while (this.acc >= CFG.TICK && !this.state.cardsPending && !this.state.relicPending) {
        this.inputs.clear();
        for (const c of this.clients.values()) if (!c.spectator) this.inputs.set(c.id, c.input);
        this.state.step(CFG.TICK, this.inputs);
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
      if (this.briefOpen && this.state.warmup <= 0) this.syncBrief();
      if (this.state.victory) this.endRound();
      else if (this.state.gameOver) this.endRound();
      else if (this.state.cardsPending) { this.acc = 0; this.enterCardPhase(); }
      else if (this.state.relicPending) { this.acc = 0; this.enterMerchantPhase(); }
    } else if (this.phase === PHASE_CARDS) {
      this.acc = 0;
      if (this.cardsPendingIds().length === 0 || Date.now() >= this.cardDeadline) {
        this.forceRemainingPicks();
        this.resumeRound();
      }
    } else if (this.phase === PHASE_MERCHANT) {
      this.acc = 0;
      if (this.merchantPendingIds().length === 0 || Date.now() >= this.merchantDeadline) {
        this.forceMerchantClose();
        this.resumeRound();
      }
    } else {
      this.acc = 0;
    }

    this.sinceSnapshot += dt;
    if (this.sinceSnapshot >= SNAPSHOT_INTERVAL) {
      this.sinceSnapshot -= SNAPSHOT_INTERVAL;
      if (this.sinceSnapshot >= SNAPSHOT_INTERVAL) this.sinceSnapshot = 0;
      if (PERF_ON) {
        const t = nowMs();
        if (this.perf.lastSend > 0) this.perf.esp.add(t - this.perf.lastSend);
        this.perf.lastSend = t;
      }
      if (this.clients.size > 0 && this.phase === PHASE_ROUND) {
        const snap = this.state.snapshot();
        snap.ph = this.phase;
        this.broadcast(snap);
      }
      if (this.phase === PHASE_ROUND && this.state.bossDmg.size > 0) this.state.bossDmg.clear();
    }
  }
}
