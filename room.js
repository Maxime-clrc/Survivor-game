
import {
  GameState, CFG, PLAYER_COLORS, DIFFICULTIES, DIFF_NORMAL, BIOMES, enemyCap,
} from "./shared/game_state.js";
import { CARD_CFG, cardBrief, banClosure } from "./shared/cards.js";
import { VERSION } from "./shared/version.js";
import { segmentName } from "./shared/timeline.js";
import { RELIC_CFG } from "./shared/reliques.js";
import { CLASSES, CLASS_DEFAULT, bombRange } from "./shared/classes.js";
import { armesOuvertes, cadreActifDe, lockedCards, lockedRelics, metaActives, metaLinesFor } from "./shared/progression.js";
import { ARMES, ARME_CFG, ARME_DEFAUT } from "./shared/armes.js";
import { prepareMessage } from "./ws_lite.js";
import { PERF_ON, Sampler, nowMs, f1 } from "./perf.js";
import { Rapport } from "./rapport.js";
import { CUSTOM_INDEX, conditionAt, severite } from "./shared/custom.js";

/* LE BANC. Meme statut que `BIOME` et `GRAINE` : une surcharge d'environnement
   POUR LES TESTS, absente en jeu. Quatre protocoles de `LISEZMOI.md` sont restes
   ouverts parce qu'ils se jugent A L'OEIL — comparer dix armes, lire le retour a
   200 corps, tenir le test du nom masque, verifier le contraste sur chaque sol —
   et tous demandent la meme chose : choisir l'arme et la densite sans relancer
   dix manches. Hors `BANC=1`, les deux messages sont ignores et pas un octet du
   jeu ne change. */
const BANC = process.env.BANC === "1";
const BANC_POP_MAX = 300;

// LE CONFORT ACTIF, PAS LE CONFORT ACHETE : depuis le budget de doctrine les deux
// ne sont plus la meme liste, et `metaLinesFor` est le seul a le savoir.
const rerollsFor = confort =>
  (confort?.relance ? 1 : 0) + (confort?.relance2 ? 1 : 0);

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

// Ce que la marge doit couvrir, additionne : les 110 ms d'interpolation sur le
// mobile le plus rapide, le retard de la camera lissee, et l'ecart tolere de la
// prediction locale (recalage a 90 px). Environ 200 px de pire cas ; 300 laisse
// de quoi. La grille est ce qui fait qu'une equipe groupee ne paie qu'UNE
// compression.
const CULL_MARGE = 300;
const CULL_GRID = 256;
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
    this.bossVus = 0;

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
    this.pausedBy = 0;

    this.briefOpen = false;

    this.launchAt = 0;

    this.cardDeadline = 0;
    this.cardPicked = new Set();

    this.inputs = new Map();
    this.staggerFrac = (slot % 16) / 16;
    this.acc = 0;
    this.sinceSnapshot = -this.staggerFrac * SNAPSHOT_INTERVAL;

    this.perf = { esp: new Sampler(), lastSend: 0, clair: 0, defl: 0 };

    // LA MESURE EST UN ETAT DE LA SALLE, jamais du module : deux salles peuvent
    // etre tracees independamment, et rien ne survit a leur destruction.
    this.traceArme = false;
    this.tracePar = "";
    this.traceT = 0;
    this.traceVu = null;
    // LE COMPTE RENDU EST UNE REDUCTION DE LA TRACE : il recoit les MEMES lignes,
    // au meme instant, et ne peut donc pas en diverger.
    this.rapport = null;
    this.rapportTexte = "";
    this.releveVus = new Map();
    /* LE SUR MESURE APPARTIENT A LA SALLE, comme la mesure et comme la graine.
       `null` veut dire « aucun sur mesure » — un objet vide veut dire « sur
       mesure sans aucune condition », ce qui n'est pas la meme chose et doit
       rester distinguable. */
    this.custom = null;
  }

  /* ON FERME LA TRACE AVANT DE LA DESARMER, et l'ordre est tout : `traceLigne`
     est gardee par `traceArme`, donc baisser le drapeau d'abord jetait la ligne
     `fin` — du JSONL comme du compte rendu, qui annoncait alors « en cours » sur
     une manche terminee. */
  armerTrace(client, on) {
    const veut = !!on;
    if (this.traceArme === veut) return;
    if (!veut) this.traceFin("desarmee");
    this.traceArme = veut;
    this.tracePar = veut ? client.name : "";
    this.broadcast({ t: "traceState", on: veut ? 1 : 0, par: this.tracePar });
    this.hooks.log(`[${this.code}] mesure ${veut ? `armée par ${client.name}` : "désarmée"}`);
    if (veut && this.phase === PHASE_ROUND) this.traceDebut();
  }

  traceLigne(obj) {
    if (!this.traceArme) return;
    this.hooks.trace(this, obj);
    this.rapport?.ligne(obj);
  }

  // L'EN-TETE PORTE TOUT CE QU'UNE SIMULATION DOIT REJOUER : difficulte,
  // variante de script, biome ET graine (la geometrie se regenere), effectif,
  // classes, et le profil meta de chaque compte — une ligne achetee mais non
  // equipee ne s'applique pas, donc le lire du profil ne suffirait pas.
  traceDebut() {
    const s = this.state;
    this.rapport = new Rapport();
    this.rapportTexte = "";
    this.releveVus.clear();
    this.traceVu = {
      niveau: s.level, segment: s.segment, bossKind: -1, bossPhase: 0, bossT: 0,
      event: -1, meteo: s.weather ? s.weather.id : -1,
      aterre: new Set(), morts: new Map(), mech: new Map(), cartes: new Map(),
    };
    this.traceT = 0;
    this.traceLigne({
      k: "debut",
      version: VERSION,
      salle: this.code,
      manche: this.roundNumber,
      quand: new Date().toISOString(),
      difficulte: s.diffIndex,
      // QUI A ARME LA MESURE reste dans l'en-tete : une trace anonyme laisse le
      // compte rendu incapable de dire de quelle table elle vient.
      tracePar: this.tracePar,
      variante: DIFFICULTIES[s.diffIndex]?.script ?? "normal",
      biome: s.biomeIndex,
      graine: s.seed,
      effectif: s.players.size,
      joueurs: [...s.players.values()].map(p => ({
        id: p.id,
        nom: this.clients.get(p.id)?.name ?? "",
        cls: p.cls,
        meta: this.clients.get(p.id)?.profile
          ? { noyaux: this.clients.get(p.id).profile.cores ?? 0,
              jalons: (this.clients.get(p.id).profile.milestones ?? []).length,
              // CE QUI ETAIT ACTIF, pas ce qui etait paye : depuis le budget de
              // doctrine, la liste des achats ne decrit plus la manche.
              doctrine: [...metaActives(this.clients.get(p.id).profile)] }
          : null,
      })),
    });
  }

  traceFin(cause) {
    if (!this.traceVu) return;
    const s = this.state;
    this.traceVu = null;
    this.traceLigne({
      k: "fin",
      cause,
      t: Math.round(s.time),
      segment: s.segment,
      niveau: s.level,
      victoire: s.victory ? 1 : 0,
      kills: s.totalKills,
      boss: s.bossKills,
      mecaniques: [...s.mechStats].map(([id, c]) => [id, c.pose, c.echec]),
      lignes: this.scoreboardRows().map(r => ({
        id: r.id, cls: r.cls, score: r.score, kills: r.kills, morts: r.deaths,
        degats: r.damage, soins: r.heal, subisPar: r.hurtBy, cartes: r.cards,
        degatsPar: r.degatsPar, contrib: r.contrib,
      })),
    });
    /* LA PAGE PART A TOUTE LA SALLE, pas au seul armeur : la mesure est visible
       de tous pendant la manche, son resultat l'est aussi. Le JSONL reste la
       sortie secondaire — il ne coute rien et il sert quand le resume ne suffit
       pas, mais il demande un acces au disque de la machine. */
    const texte = this.rapport?.rendu() ?? "";
    this.rapport = null;
    if (texte) {
      this.rapportTexte = texte;
      this.broadcast({ t: "rapport", texte, manche: this.roundNumber });
    }
  }

  traceEchantillon() {
    const s = this.state;
    return {
      k: "e",
      t: Math.round(s.time * 10) / 10,
      seg: s.segment,
      beat: s.beat,
      horde: Math.round(s.hordeTime),
      niveau: s.level,
      xp: Math.round(s.xp),
      pop: s.enemies.length,
      plafond: enemyCap(s.diffIndex, Math.max(1, s.players.size)),
      vivants: s.aliveCount(),
      kills: s.totalKills,
      meteo: s.weather ? s.weather.id : -1,
      ev: s.event ? s.event.id : -1,
      // LES DEUX AGREGATS ET LA MEMOIRE COURTE. Ils ne pilotent rien : ils
      // s accumulent pour que le Director, deux plans plus loin, lise des
      // distributions OBSERVEES au lieu de six reglages devines.
      tensionMax: Math.round(s.tensionMax * 1000) / 1000,
      tensionMoy: Math.round(s.tensionMoy * 1000) / 1000,
      depuisElite: Math.round(s.depuisElite),
      depuisEvent: Math.round(s.depuisEvent),
      tensionBas: Math.round(s.tensionBasT),
      boss: s.boss
        ? { kind: s.boss.kind, hp: Math.round(s.boss.hp), max: Math.round(s.boss.maxHp),
            phase: s.boss.phase, barres: s.boss.bars, t: Math.round(s.boss.fightT) }
        : null,
      joueurs: [...s.players.values()].map(p => ({
        id: p.id,
        hp: Math.round(p.hp),
        max: Math.round(p.maxHp),
        bouclier: Math.round(p.shield),
        aterre: p.downed ? 1 : 0,
        degats: Math.round(p.damageDealt),
        soins: Math.round(p.healDealt),
        kills: p.kills,
        morts: p.deaths,
        puissance: Math.round(s._playerPower(p) * 1000) / 1000,
        tension: Math.round(p.tension * 1000) / 1000,
        survie: Math.round(p.survie * 1000) / 1000,
      })),
    };
  }

  // TOUT SE DEDUIT D'UNE COMPARAISON AVEC L'IMAGE PRECEDENTE : la simulation ne
  // sait pas qu'on l'observe, et n'a donc rien a emettre. Seuls poses et echecs
  // de mecanique demandaient deux compteurs, faute d'etre observables du dehors.
  traceTick(dt) {
    if (!this.traceArme || this.phase !== PHASE_ROUND || !this.traceVu) return;
    const s = this.state, vu = this.traceVu;
    const t = Math.round(s.time * 10) / 10;

    if (s.level !== vu.niveau) {
      this.traceLigne({ k: "niveau", t, de: vu.niveau, a: s.level });
      vu.niveau = s.level;
    }
    if (s.segment !== vu.segment) {
      this.traceLigne({ k: "segment", t, de: vu.segment, a: s.segment });
      vu.segment = s.segment;
    }

    const kind = s.boss ? s.boss.kind : -1;
    if (kind !== vu.bossKind) {
      if (kind >= 0) {
        vu.bossT = s.time;
        this.traceLigne({ k: "bossDebut", t, kind, barres: s.boss.bars,
                          hp: Math.round(s.boss.maxHp), segment: s.segment });
      } else {
        this.traceLigne({ k: "bossFin", t, kind: vu.bossKind,
                          duree: Math.round((s.time - vu.bossT) * 10) / 10,
                          barresCassees: vu.bossPhase });
      }
      vu.bossKind = kind;
      vu.bossPhase = 0;
    } else if (s.boss && s.boss.phase !== vu.bossPhase) {
      this.traceLigne({ k: "barre", t, kind, phase: s.boss.phase,
                        hp: Math.round(s.boss.hp) });
      vu.bossPhase = s.boss.phase;
    }

    const ev = s.event ? s.event.id : -1;
    if (ev !== vu.event) {
      this.traceLigne({ k: ev >= 0 ? "eventDebut" : "eventFin", t,
                        id: ev >= 0 ? ev : vu.event, seg: s.segment, beat: s.beat });
      vu.event = ev;
    }
    const meteo = s.weather ? s.weather.id : -1;
    if (meteo !== vu.meteo) {
      this.traceLigne({ k: "meteo", t, id: meteo, seg: s.segment });
      vu.meteo = meteo;
    }

    /* UNE CARTE PRISE EST UN INSTANT, et la build n etait datee que de la FIN :
       on ne pouvait pas rattacher un saut de DPS a une prise. Deduite comme le
       reste, par comparaison — la simulation ne sait toujours pas qu on
       l observe. */
    for (const p of s.players.values()) {
      const avant = vu.cartes.get(p.id);
      if (!avant) {
        vu.cartes.set(p.id, new Map(p.cards));
      } else {
        for (const [id, n] of p.cards) {
          const n0 = avant.get(id) ?? 0;
          if (n > n0) {
            avant.set(id, n);
            this.traceLigne({ k: "carte", t, id: p.id, carte: id, n,
                              niveau: s.level });
          }
        }
      }
    }

    for (const p of s.players.values()) {
      const morts = vu.morts.get(p.id) ?? 0;
      if (p.deaths > morts) {
        vu.morts.set(p.id, p.deaths);
        this.traceLigne({ k: "mort", t, id: p.id, n: p.deaths, src: p.lastSrc });
      }
      if (p.downed && !vu.aterre.has(p.id)) {
        vu.aterre.add(p.id);
        this.traceLigne({ k: "aterre", t, id: p.id, src: p.lastSrc });
      } else if (!p.downed && vu.aterre.has(p.id)) {
        vu.aterre.delete(p.id);
        this.traceLigne({ k: "releve", t, id: p.id });
      }
    }

    for (const [id, c] of s.mechStats) {
      const av = vu.mech.get(id);
      if (av && av.pose === c.pose && av.echec === c.echec) continue;
      vu.mech.set(id, { pose: c.pose, echec: c.echec });
      this.traceLigne({ k: "mech", t, id, pose: c.pose, echec: c.echec });
    }

    this.traceT += dt;
    if (this.traceT >= 1) {
      this.traceT = 0;
      this.traceLigne(this.traceEchantillon());
    }
  }

  perfArm() {
    this.perf.esp.reset();
    this.perf.lastSend = 0;
    this.perf.clair = 0;
    this.perf.defl = 0;
  }


  // LE RECTANGLE EST CELUI QUE LE CLIENT VA VRAIMENT AFFICHER : centre sur le
  // joueur puis ECRETE a l'arene, comme `updateCamera` et comme
  // `_pushOffScreen`. Centrer sans ecreter laisserait, dans un coin de l'arene,
  // une bande visible a l'ecran que le serveur aurait filtree.
  //
  // La cle est ARRONDIE VERS L'EXTERIEUR sur une grille : deux joueurs proches
  // partagent alors un rectangle, donc un seul `prepareMessage`. Arrondir vers
  // l'exterieur n'enleve jamais rien, ca ajoute au pire une bande.
  vueDe(client) {
    const p = this.state.players.get(client.id);
    if (!p) return null;
    const vx = Math.max(0, Math.min(CFG.ARENA_W - CFG.VIEW_W, p.x - CFG.VIEW_W / 2));
    const vy = Math.max(0, Math.min(CFG.ARENA_H - CFG.VIEW_H, p.y - CFG.VIEW_H / 2));
    const g = CULL_GRID;
    const x0 = Math.floor((vx - CULL_MARGE) / g) * g;
    const y0 = Math.floor((vy - CULL_MARGE) / g) * g;
    const x1 = Math.ceil((vx + CFG.VIEW_W + CULL_MARGE) / g) * g;
    const y1 = Math.ceil((vy + CFG.VIEW_H + CULL_MARGE) / g) * g;
    return { x0, y0, x1, y1 };
  }

  broadcastSnapshot() {
    const parVue = new Map();
    for (const c of this.clients.values()) {
      const vue = this.vueDe(c);
      const cle = vue ? `${vue.x0},${vue.y0},${vue.x1},${vue.y1}` : "*";
      let prep = parVue.get(cle);
      if (!prep) {
        const snap = this.state.snapshot(vue);
        snap.ph = this.phase;
        prep = prepareMessage(JSON.stringify(snap));
        parVue.set(cle, prep);
        if (PERF_ON) {
          if (prep.plain.length > this.perf.clair) this.perf.clair = prep.plain.length;
          const dl = prep.deflated ? prep.deflated.length : 0;
          if (dl > this.perf.defl) this.perf.defl = dl;
        }
      }
      c.conn.sendPrepared(prep);
    }
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

  /* En cooperatif, seuls TES hauts faits produisent un bandeau : ceux des allies
     passent en une ligne dans le fil. D'ou la diffusion a tout le monde SAUF au
     porteur, qui recoit deja le sien. */
  offreArmes(c) {
    const ouvertes = armesOuvertes(c.profile);
    const autres = ARMES.filter(a => a.id !== ARME_DEFAUT && ouvertes.has(a.id));
    for (let i = autres.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [autres[i], autres[j]] = [autres[j], autres[i]];
    }
    return [ARME_DEFAUT, ...autres.slice(0, ARME_CFG.OFFRES - 1).map(a => a.id)];
  }

  armePayload(c) {
    return {
      t: "armes",
      offres: c.armeOffres ?? [ARME_DEFAUT],
      choisie: c.arme ?? ARME_DEFAUT,
      relances: Math.max(0, ARME_CFG.RELANCES - (c.armeRelances ?? 0)),
    };
  }

  broadcastSauf(id, obj) {
    const prep = prepareMessage(JSON.stringify(obj));
    for (const c of this.clients.values()) {
      if (c.id !== id) c.conn.sendPrepared(prep);
    }
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
    // celui qui a fige la partie est le seul a pouvoir la reprendre : s'il s'en
    // va, personne ne tient plus la pause.
    if (this.paused && this.pausedBy === client.id) {
      this.setPaused(false, "le joueur qui avait mis en pause a quitté");
    }
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

  /* `BIOME` et `GRAINE` forcent le tirage, POUR LES TESTS UNIQUEMENT — meme
     statut que `ROOM_GRACE_MS` et `ROOM_MAX`. Comparer quatre lieux demande de
     pouvoir en demander un, et relancer des salles jusqu au bon tirage est le
     genre de protocole qu on finit par ne plus faire. */
  /* Le banc TIENT la population, il ne la pose pas une fois : les corps meurent,
     et une densite qui retombe ne mesure rien. Le remplissage passe par le meme
     `_spawnEnemy` que la horde — un second chemin d'apparition ne verrait ni les
     obstacles, ni les quotas de type, ni l'adaptation au niveau. */
  bancTenir() {
    const n = this.bancPop;
    let garde = BANC_POP_MAX;
    while (this.state.enemies.length < n && garde-- > 0) {
      if (!this.state._spawnEnemy(-1)) break;
    }
    if (this.state.enemies.length > n) this.state.enemies.length = n;
  }

  drawBiome() {
    const force = process.env.BIOME;
    const i = force === undefined ? -1 : BIOMES.findIndex(b => b.key === force);
    this.biomeIndex = i >= 0 ? i : Math.floor(Math.random() * BIOMES.length);
    this.seed = Number(process.env.GRAINE) || Math.floor(Math.random() * 0x7fffffff);
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

  launchPayload(why = "", qui = "") {
    const reste = this.launchAt ? Math.max(0, this.launchAt - Date.now()) : 0;
    return { t: "launch", delay: +(reste / 1000).toFixed(2), why, qui };
  }

  cancelLaunch(why = "", qui = "") {
    if (!this.launchAt) return;
    this.launchAt = 0;
    this.broadcast(this.launchPayload(why, qui));
    this.hooks.log(`[${this.code}] lancement annulé${why ? ` — ${why}${qui ? ` (${qui})` : ""}` : ""}`);
  }

  tickLaunch() {
    if (!this.launchAt) return;
    if (this.phase !== PHASE_LOBBY || this.joined().length === 0) {
      this.cancelLaunch("etat");
      return;
    }
    const manquants = this.notReady();
    if (manquants.length > 0) {
      const arrivee = this.joined().length === 2 && !this.joined().some(c => c.ready);
      this.cancelLaunch(arrivee ? "arrivee" : "pasPret", arrivee ? "" : manquants[0].name);
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
      trace: this.traceArme ? 1 : 0,
      tracePar: this.tracePar,
      // TOUT LE MONDE VOIT LES REGLES AVANT DE SE DIRE PRET : un joueur qui
      // rejoint doit savoir dans quoi il entre.
      custom: this.custom,
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
        cadre: cadreActifDe(c.profile),
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
    const loots = {};
    for (const p of this.state.players.values()) {
      byPlayer[p.id] = this.expandCards(p);
      relics[p.id] = [...p.relics.keys()];
      loots[p.id] = [...p.loot];
    }
    return { t: "loadout", byPlayer, relics, loots };
  }

  scoreboardRows() {
    return this.joined().map(c => {
      const p = this.state.players.get(c.id);
      return {
        id: c.id,
        name: c.name,
        colorIndex: c.colorIndex,
        cadre: cadreActifDe(c.profile),
        played: !!p,
        cls: p ? p.cls : c.cls,
        level: p ? this.state.level : 1,
        score: p ? p.score : 0,
        kills: p ? p.kills : 0,
        deaths: p ? p.deaths : 0,
        damage: p ? Math.round(p.damageDealt) : 0,
        heal: p ? Math.round(p.healDealt) : 0,
        hurtBy: p ? p.hurtBy.map(v => Math.round(v)) : [],
        // CE QUI ETAIT CALCULE ET NE SORTAIT NULLE PART : un Rempart qui joue
        // parfaitement avait un tableau de fin VIDE, et les quatre nombres qui
        // le disent existaient deja.
        degatsPar: p ? p.degatsPar.map(v => Math.round(v)) : [],
        contrib: p ? {
          evites: Math.round(p.contrib.evites),
          proteges: Math.round(p.contrib.proteges),
          detournes: Math.round(p.contrib.detournes),
          permis: Math.round(p.contrib.permis),
        } : null,
        cards: p ? this.expandCards(p) : [],
        total: c.total,
        cores: c.lastGain ?? 0,
        final: c.lastFinal ?? null,
        hf: c.hfRun ?? [],
      };
    }).sort((a, b) => b.score - a.score);
  }


  setPaused(on, why = "", par = 0) {
    if (this.paused === on) return;
    // meme dette qu'un ecran de choix : l'ennemi au contact a garde sa position
    // et sa recharge pendant que la simulation etait figee.
    if (!on && this.phase === PHASE_ROUND) this.state.repriseGrace = CFG.RESUME_GRACE;
    this.paused = on;
    this.pausedAt = on ? Date.now() : 0;
    this.pausedBy = on ? par : 0;
    const nom = on ? (this.clients.get(par)?.name ?? "") : "";
    this.broadcast({ t: "paused", on: on ? 1 : 0, why, par: nom });
    this.hooks.log(`[${this.code}] ` + (on ? `manche en pause${nom ? ` — ${nom}` : ""}`
      : `pause levée${why ? ` — ${why}` : ""}`));
  }


  /* LE MESSAGE PORTE UNE DUREE, JAMAIS UNE ECHEANCE. Une echeance absolue
     obligeait le client a comparer l'horloge du SERVEUR a la sienne : sur une
     machine en retard, la jauge de l'ecran de cartes restait pleine alors que
     la manche avait deja repris, et le joueur mourait sans voir l'arene. */
  cardLeft() {
    return Math.max(0, this.cardDeadline - Date.now());
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
        reroll: c.rerollLeft | 0,
        segment: this.state.segment,
        bossWave: this.state.relicBossDue ? 1 : 0,
        boss: this.state.bossCount,
        bossKind: this.state.lastBossKind,
        more: this.state.pendingLevels,
        level: this.state.level,
        duree: this.cardLeft(),
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

    for (const id of this.state.relicOffers.keys()) this.merchantSend(id);
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
      duree: Math.max(0, this.merchantDeadline - Date.now()),
      eclats: p.eclats,
      rerollCost: this.state.relicRerollPrice(p),
      achats: Math.max(0, RELIC_CFG.BUY_PER_VISIT - (p.relicBought ?? 0)),
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
    this.state.repriseGrace = CFG.RESUME_GRACE;
    this.state.cardOffers = new Map();
    this.broadcast(this.loadoutPayload());
  }


  startRound() {
    this.roundNumber++;
    this.setPaused(false);
    const diff = this.custom ? CUSTOM_INDEX : this.votedDifficulty().index;
    const vus = this.state ? this.state.bossSeen.slice() : [];
    this.state = new GameState(diff, this.biomeIndex, this.seed, this.custom);
    // la memoire du tirage appartient a la SALLE : deux manches de suite ne
    // montrent pas le meme quintette.
    this.state.bossPrecedents = vus;
    this.cardPicked.clear();
    for (const c of this.joined()) if (c.cls === null) c.cls = CLASS_DEFAULT;
    this.assignColors();
    for (const c of this.joined()) {
      c.spectator = false;
      c.clsLocked = true;
      c.ready = false;
      c.briefDone = false;
      let meta = null;
      let confortActif = null;
      if (c.profile) {
        const clsId = CLASSES[c.cls].id;
        const { lines, commun, confort } = metaLinesFor(c.profile, clsId);
        confortActif = confort;
        meta = {
          lines,
          commun,
          confort,
          /* Les bans sont PAR MANCHE : ils vivent dans `p.locked` du GameState
             et meurent avec lui, le profil n'entre plus dans le filtre. Ce que
             le profil apporte ici, ce sont les VERROUS DE HAUT FAIT — cartes
             et reliques qu'aucun haut fait n'a encore ouvertes. */
          locked: lockedCards(c.profile),
          lockedRelics: lockedRelics(c.profile),
        };
      }
      c.rerollLeft = rerollsFor(confortActif);
      c.lastFinal = null;
      c.hfRun = [];
      c.armeOffres = this.offreArmes(c);
      c.armeRelances = 0;
      c.arme = ARME_DEFAUT;
      this.state.addPlayer(c.id, c.name, c.colorIndex, c.cls, meta);
      const pj = this.state.players.get(c.id);
      if (pj) { pj.arme = c.arme; this.state._recomputeMods(pj); }
      c.conn.send(JSON.stringify(this.armePayload(c)));
      c.input.x = 0; c.input.y = 0; c.input.dash = false;
      c.input.s1 = false; c.input.s2 = false; c.input.s3 = false;
      c.input.f = false;
    }
    this.state.warmup = WARMUP_S;
    this.bossVus = 0;
    this.briefOpen = true;
    this.phase = PHASE_ROUND;
    this.acc = -this.staggerFrac * CFG.TICK;
    this.broadcast({
      t: "round",
      round: this.roundNumber,
      difficulty: diff,
      warmup: WARMUP_S,
    });
    if (this.traceArme) this.traceDebut();
    this.broadcast(this.lobbyPayload());
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] manche ${this.roundNumber} lancée — `
      + `${this.state.players.size} joueur(s), difficulté ${DIFFICULTIES[diff].label}`
      + `, ${WARMUP_S} s d'échauffement`);
  }

  abortRound() {
    this.traceFin("interrompue");
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
    this.traceFin(this.state.victory ? "victoire" : "defaite");
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
        // CONTINU comme `ar` : on ne le remet pas a zero apres le tick.
        client.input.tir = !!msg.tir;

        if (msg.d) client.input.dash = true;
        if (msg.s1) client.input.s1 = true;
        if (msg.s2) client.input.s2 = true;
        if (msg.s3) client.input.s3 = true;
        if (msg.f) client.input.f = true;
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
        // LE SUR MESURE NE SE VOTE PAS, IL SE CONFIGURE : un vote le
        // choisirait avec les reglages par defaut, donc une manche normale privee
        // de noyaux, de records et de hauts faits — sans que personne l'ait voulu.
        if (!Number.isInteger(v) || v < 0 || v >= DIFFICULTIES.length) break;
        if (v === CUSTOM_INDEX) break;
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

        // les deux REFUSEES comptent autant que la prise : c'est le couple qui
        // dit ce qu'une carte vaut aux yeux d'un joueur.
        this.traceLigne({ k: "carte", t: Math.round(this.state.time * 10) / 10,
                          id, prise: msg.id, offertes: offers.slice(),
                          niveau: this.state.level });
        this.cardPicked.add(id);
        this.broadcast(this.loadoutPayload());
        this.broadcast({ t: "cardsWait", pending: this.cardsPendingIds() });
        break;
      }

      // n'importe qui dans la salle arme la mesure, et TOUT LE MONDE le voit :
      // enregistrer la partie des autres sans le dire ne se fait pas.
      case "trace":
        this.armerTrace(client, msg.on);
        break;

      /* LE SERVEUR TRACAIT UNE MANCHE DONT IL IGNORAIT LE RENDU. Le releve
         client remonte par SEGMENT — quatre joueurs sont quatre machines, et la
         plus faible decide de l'experience, donc on garde les fenetres de chacun
         et jamais une moyenne. Borne a douze fenetres par message et vingt-quatre
         par manche : un client bavard ne remplit pas la trace. */
      /* LE SUR MESURE SE CONFIGURE, ET C'EST L'HOTE QUI CONFIGURE. Le mode
         decide de ce que la salle entiere va jouer et de ce qu'elle ne gagnera
         pas — noyaux, records, hauts faits : ce n'est pas un reglage personnel.
         Tout le monde le VOIT, une seule personne le POSE. */
      /* ACCEPTER OU REFUSER — ET C EST UNE REPONSE, PAS UNE ACTIVATION : la
         borne se met en « proposee » par la touche d interaction, dans la
         simulation. Le message ne porte que la reponse, donc un client ne peut
         pas s accorder un contrat a distance. */
      case "contrat": {
        if (this.phase !== PHASE_ROUND) break;
        const id = Number(msg.borne) | 0;
        if (msg.ok) this.state.accepterBorne(id);
        else this.state.refuserBorne(id);
        break;
      }

      case "custom": {
        if (this.phase !== PHASE_LOBBY || id !== this.hostId) break;
        if (!msg.on) { this.custom = null; }
        else {
          const choix = {};
          for (const [key, rang] of Object.entries(msg.choix ?? {})) {
            const c = conditionAt(key);
            if (c && Number.isInteger(rang) && c.rangs[rang]) choix[key] = rang;
          }
          this.custom = choix;
        }
        this.broadcast(this.lobbyPayload());
        this.hooks.log("[" + this.code + "] sur mesure "
          + (this.custom ? "severite " + severite(this.custom) : "desarme"));
        break;
      }

      case "releve": {
        if (!this.traceArme || !Array.isArray(msg.fenetres)) break;
        const compte = this.releveVus.get(id) ?? 0;
        if (compte >= 24) break;
        for (const f of msg.fenetres.slice(0, 12)) {
          if (!f || typeof f !== "object") continue;
          this.traceLigne({
            k: "releve", id, seg: f.seg | 0, s: Number(f.s) || 0, n: f.n | 0,
            gfx: f.gfx | 0, gl: f.gl ? 1 : 0,
            fps50: f.fps50 | 0, fps99: f.fps99 | 0,
            ms99: Number(f.ms99) || 0, msMax: Number(f.msMax) || 0,
            draws: f.draws | 0, quads: f.quads | 0, fragMax: f.fragMax | 0,
            // LE RESEAU, TANT QU ON Y EST : la salle echantillonne deja la
            // taille des messages et c'etait jete. La ligne de segment est sa
            // place.
            clair: Math.round(this.perf.clair), defl: Math.round(this.perf.defl),
          });
        }
        this.releveVus.set(id, compte + Math.min(12, msg.fenetres.length));
        break;
      }

      case "buyRelic": {
        if (this.phase !== PHASE_MERCHANT) break;
        const p = this.state.players.get(id);
        if (!p || !this.state.relicOffers.has(id)) break;
        if (!this.state.buyRelic(p, msg.id)) break;
        this.traceLigne({ k: "relique", t: Math.round(this.state.time * 10) / 10,
                          id, achat: msg.id, boss: this.state.bossKills });
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

      /* Bannissement PAR MANCHE (decision du porteur, 2026-08-19 — il etait
         permanent par compte depuis le lot J) : la carte rejoint `p.locked`,
         le filtre de tirage du GameState, et meurt avec lui a la fin de la
         manche. Rien ne s'ecrit dans le profil — pas de persist, pas de
         sendProgress. L'idempotence est structurelle : une carte deja dans
         `p.locked` ne peut plus figurer dans une offre. */
      case "banCard": {
        if (this.phase !== PHASE_CARDS || this.cardPicked.has(id)) break;
        const offers = this.state.cardOffers.get(id);
        const p = this.state.players.get(id);
        if (!offers || !p || !offers.includes(msg.id)) break;

        const closure = banClosure(msg.id);
        p.locked ??= new Set();
        for (const bid of closure) p.locked.add(bid);

        this.cardPicked.add(id);
        this.broadcast({ t: "cardsWait", pending: this.cardsPendingIds() });
        this.hooks.log(`[${this.code}] ${client.name} bannit ${msg.id} pour la manche`
          + (closure.length > 1 ? ` (+${closure.length - 1} dépendante(s))` : ""));
        break;
      }

      /* LA PAUSE EST CELLE DE L'HOTE, ET ELLE VAUT POUR TOUT LE MONDE. Elle
         etait refusee des qu'un second client etait connecte — un spectateur
         suffisait a la retirer au joueur seul. Deux portes seulement : l'hote,
         quel que soit l'effectif et meme en spectateur, et le joueur SEUL dans
         sa salle. Reprendre appartient a celui qui a fige, et a l'hote. */
      case "pause": {
        if (this.phase !== PHASE_ROUND) break;
        if (!msg.on) {
          if (this.paused && this.pausedBy !== id && id !== this.hostId) break;
          this.setPaused(false, "reprise");
          break;
        }
        const seul = this.joined().length === 1 && this.state.players.has(id);
        if (!seul && id !== this.hostId) break;
        this.setPaused(true, "", id);
        break;
      }

      /* Le choix vit dans le BRIEFING : l'ecran existe deja, il retient deja la
         vague et il attend deja tout le monde. Un ecran de plus pour trois
         boutons serait neuf points d'enregistrement pour rien. */
      case "chooseArme": {
        // AU BANC, N IMPORTE QUAND ET N IMPORTE LAQUELLE : comparer dix armes
        // demande de pouvoir en changer sans relancer dix manches. Hors banc, la
        // garde d origine ne bouge pas d un caractere.
        if (!BANC && (this.phase !== PHASE_ROUND || !this.state.warmup)) break;
        const pj = this.state.players.get(id);
        if (!pj) break;
        if (BANC ? !ARMES.some(a => a.id === msg.id)
                 : !client.armeOffres?.includes(msg.id)) break;
        client.arme = msg.id;
        pj.arme = msg.id;
        this.state._recomputeMods(pj);
        pj.hp = Math.min(pj.hp, pj.maxHp);
        client.conn.send(JSON.stringify(this.armePayload(client)));
        break;
      }

      /* LA POPULATION A LA DEMANDE. Les quatre protocoles restes ouverts dans
         `LISEZMOI.md` se jugent A L OEIL et demandent tous la meme chose : une
         densite qu on choisit. Le plafond est SHADOWE sur l instance — une
         propriete propre masque la methode du prototype, et la supprimer la
         rend — donc `_enemyCap()` reste le point de passage unique et le jeu
         hors banc ne connait meme pas ce chemin. */
      case "bancPop": {
        if (!BANC || this.phase !== PHASE_ROUND) break;
        const n = Math.max(0, Math.min(BANC_POP_MAX, msg.n | 0));
        this.bancPop = n;
        if (n > 0) this.state._enemyCap = () => n;
        else delete this.state._enemyCap;
        break;
      }

      case "rerollArme": {
        if (this.phase !== PHASE_ROUND || !this.state.warmup) break;
        if ((client.armeRelances ?? 0) >= ARME_CFG.RELANCES) break;
        client.armeRelances = (client.armeRelances ?? 0) + 1;
        client.armeOffres = this.offreArmes(client);
        if (!client.armeOffres.includes(client.arme)) {
          client.arme = ARME_DEFAUT;
          const pj = this.state.players.get(id);
          if (pj) { pj.arme = ARME_DEFAUT; this.state._recomputeMods(pj); }
        }
        client.conn.send(JSON.stringify(this.armePayload(client)));
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
        this.cancelLaunch("clic", client.name);
        break;
      }

      case "reroll": {
        if (this.phase !== PHASE_CARDS || this.cardPicked.has(id)) break;
        if (!((client.rerollLeft | 0) > 0)) break;
        const p = this.state.players.get(id);
        if (!p || !this.state.cardOffers.has(id)) break;
        client.rerollLeft = (client.rerollLeft | 0) - 1;
        const offers = this.state.offerCards(p);
        this.state.cardOffers.set(id, offers);
        client.conn.send(JSON.stringify({
          t: "cards",
          reroll: client.rerollLeft,
          segment: this.state.segment,
          bossWave: 1,
          boss: this.state.bossCount,
          bossKind: this.state.lastBossKind,
          more: this.state.pendingLevels,
          level: this.state.level,
          duree: this.cardLeft(),
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
        if (this.bancPop > 0) this.bancTenir();
        for (const c of this.clients.values()) {
          c.input.dash = false;
          c.input.s1 = false;
          c.input.s2 = false;
          c.input.s3 = false;
          // MEME VIE QU UNE COMPETENCE : une intention se consomme au tick, sinon
          // une touche relachée pendant une pause reste enfoncee a la reprise.
          c.input.f = false;
        }
        this.acc -= CFG.TICK;
      }

      if (this.state.alerts.length > 0) {
        for (const a of this.state.alerts) this.broadcast({ t: "alert", ...a });
        this.state.alerts.length = 0;
      }
      /* LE CHARGEMENT PEUT CHANGER EN PLEINE MANCHE DEPUIS LE LOOT. `loadout`
         n etait diffuse qu a la prise d une carte et a la reprise : un loot
         ramasse sous la horde ne changeait rien a la fenetre de build, et le
         joueur n avait aucun moyen de voir ce qu il venait de gagner. Meme
         forme que les alertes — un drapeau, vide au tick. */
      if (this.state.loadoutDirty) {
        this.state.loadoutDirty = false;
        this.broadcast(this.loadoutPayload());
      }
      this.traceTick(dt);
      if (this.state.bossKills !== this.bossVus) {
        this.bossVus = this.state.bossKills;
        this.hooks.hautsFaits(this);
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
      if (this.clients.size > 0 && this.phase === PHASE_ROUND) this.broadcastSnapshot();
      if (this.phase === PHASE_ROUND && this.state.bossDmg.size > 0) this.state.bossDmg.clear();
    }
  }
}
