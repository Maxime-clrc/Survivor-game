
import { readFileSync } from "node:fs";

import { CFG, PLAYER_COLORS, DIFF_NORMAL, DIFFICULTIES } from "./shared/game_state.js";
import { CLASSES, SKILL_CFG } from "./shared/classes.js";
import { PROG_CFG, TREES, COMMUN, slotsFor, tierCost, coresForRun, coresPartial, recordFinal } from "./shared/progression.js";
import { PASS_MIN, PASS_MAX } from "./progress_store.js";
import { VERSION } from "./shared/version.js";
import { Trace, nomTrace } from "./telemetry.js";
import { Room, ROOM_MAX_PLAYERS, PHASE_LOBBY, PHASE_ROUND } from "./room.js";
import { PERF_ON, PERF_REPORT_S, Sampler, nowMs as perfNow, f1 } from "./perf.js";

const ROOM_GRACE_MS = Number(process.env.ROOM_GRACE_MS) || 60000;
const ROOM_MAX = Number(process.env.ROOM_MAX) || 16;

const IP_CONN_MAX = 8;
const LIST_MIN_MS = 1000;

const BUILD = (() => {
  try {
    return JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version || "";
  } catch {
    return "";
  }
})();

const PSEUDO_FAILS_MAX = 5;
const PSEUDO_FREEZE_MS = 10000;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function createHub(store, log, commit = "") {
  const clients = new Map();
  const rooms = new Map();
  const ipCounts = new Map();
  const lastRoomOf = new Map();
  const authFails = new Map();
  let nextClientId = 1;
  let nextSlot = 0;


  function persist(c) {
    if (c.pseudoKey) store.save(c.pseudoKey);
  }

  function progressPayload(c) {
    const pr = c.profile;
    return {
      t: "progress",
      cores: pr.cores,
      runs: pr.runs,
      best: pr.best,
      milestones: pr.milestones,
      kills: pr.kills,
      classes: pr.classes,
      commun: pr.commun ?? {},
      confort: pr.confort,
      bannedCards: pr.bannedCards ?? [],
      pseudo: pr.pseudo ?? "",
      gained: c.lastGain ?? 0,
    };
  }
  function sendProgress(c) {
    c.conn.send(JSON.stringify(progressPayload(c)));
    c.lastGain = 0;
  }

  function awardRun(room) {
    const state = room.state;
    const shared = coresForRun(state.level, state.bossKills, state.diffIndex);
    for (const c of room.joined()) {
      const p = state.players.get(c.id);
      if (!p || !c.profile) continue;
      const pr = c.profile;
      const gain = shared;

      for (const kind of state.bossKindsKilled) {
        const id = `boss_${kind}`;
        if (!pr.milestones.includes(id)) pr.milestones.push(id);
      }
      if (state.level >= 10 && !pr.milestones.includes("niveau10")) {
        pr.milestones.push("niveau10");
      }
      if (state.level >= PROG_CFG.SLOTS_LEVEL
          && !pr.milestones.includes(`niveau${PROG_CFG.SLOTS_LEVEL}`)) {
        pr.milestones.push(`niveau${PROG_CFG.SLOTS_LEVEL}`);
      }
      if (p.deaths === 0 && state.level >= PROG_CFG.NO_DOWN_MIN_LEVEL
          && !pr.milestones.includes("sans_chute")) {
        pr.milestones.push("sans_chute");
      }
      const clsId = CLASSES[p.cls]?.id ?? "dps";
      pr.kills[clsId] = (pr.kills[clsId] ?? 0) + p.kills;
      if (!pr.milestones.includes("kills500")
          && Object.values(pr.kills).some(k => k >= PROG_CFG.KILLS_MILESTONE)) {
        pr.milestones.push("kills500");
      }

      pr.cores += gain;
      pr.runs += 1;
      if (state.level > (pr.best.level | 0)) pr.best.level = state.level;
      if (state.segment > (pr.best.segment | 0)) pr.best.segment = state.segment;
      if (p.score > pr.best.score) pr.best.score = p.score;

      if (state.victory && state.finalKill > 0) {
        c.lastFinal = recordFinal(pr, {
          time: state.finalKill,
          total: Math.round(state.time),
          level: state.level,
          difficulty: state.diffIndex,
          variant: DIFFICULTIES[state.diffIndex]?.script ?? "normal",
          biome: state.biomeIndex,
          players: room.joined().length,
        }, new Date().toISOString()) ? "record" : "victoire";
      }

      c.lastGain = gain;
      persist(c);
    }
  }

  function leaderboard(limit = 10) {
    const par = DIFFICULTIES.map(() => []);
    for (const pr of store.profiles()) {
      const bf = pr.bestFinal;
      if (!bf) continue;
      for (const k of Object.keys(bf)) {
        const d = Number(k);
        if (!par[d]) continue;
        par[d].push({ pseudo: pr.pseudo, time: bf[k].time | 0 });
      }
    }
    for (const l of par) l.sort((a, b) => a.time - b.time);
    return par.map(l => l.slice(0, limit));
  }

  function awardPartial(c, room) {
    if (room.phase === PHASE_LOBBY || !c.profile || !room.state.players.has(c.id)) return;
    c.profile.cores += coresPartial(room.state.level, room.state.diffIndex);
    persist(c);
  }


  // LE HUB RESTE LE SEUL ECRIVAIN, ici comme pour la progression : la salle
  // produit des objets et ne connait ni chemin, ni disque, ni format de nom.
  const traces = new Map();

  function trace(room, obj) {
    if (!obj) return;
    if (obj.k === "debut") {
      traces.get(room.code)?.fermer();
      const t = new Trace(nomTrace(room.code, obj.manche), log);
      traces.set(room.code, t);
      t.ligne(obj);
      log(`[${room.code}] mesure ouverte — ${t.chemin}`);
      return;
    }
    const t = traces.get(room.code);
    if (!t) return;
    t.ligne(obj);
    if (obj.k === "fin") {
      traces.delete(room.code);
      t.fermer().then(chemin => log(`[${room.code}] mesure fermée — ${chemin}`));
    }
  }

  const hooks = {
    log,
    occupancy: () => broadcastRooms(),
    awardRun,
    awardPartial,
    sendProgress,
    persist,
    trace,
  };

  function roomsPayload() {
    return { t: "rooms", rooms: [...rooms.values()].map(r => r.info()) };
  }

  function broadcastRooms() {
    const msg = JSON.stringify(roomsPayload());
    for (const c of clients.values()) {
      if (c.joined && !c.room) c.conn.send(msg);
    }
  }

  function makeCode() {
    for (;;) {
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
      if (!rooms.has(code)) return code;
    }
  }

  function sanitizeRoomName(v, fallback) {
    if (typeof v !== "string") return fallback;
    const name = v.replace(/[\p{C}]/gu, "").replace(/\s+/g, " ").trim().slice(0, 20);
    return name.length >= 1 ? name : fallback;
  }

  function joinError(c, motif) {
    c.conn.send(JSON.stringify({ t: "joinRoomError", motif }));
  }

  function returnToHub(c, why) {
    c.conn.send(JSON.stringify({ t: "roomClosed", why }));
    c.conn.send(JSON.stringify(roomsPayload()));
  }

  function closeRoom(room, why) {
    for (const c of [...room.clients.values()]) {
      try {
        room.detach(c);
      } catch {
        c.room = null;
        room.clients.delete(c.id);
      }
      returnToHub(c, why);
    }
    rooms.delete(room.code);
    const t = traces.get(room.code);
    if (t) {
      traces.delete(room.code);
      t.fermer().then(chemin => log(`[${room.code}] mesure fermée — ${chemin}`));
    }
    broadcastRooms();
    log(`salle ${room.code} fermée — ${why}`);
  }


  function handleCreateRoom(client, msg) {
    if (client.room) return;
    if (rooms.size >= ROOM_MAX) return joinError(client, "plafond");
    const name = sanitizeRoomName(msg.name, `salle de ${client.name}`);
    const pass = typeof msg.pass === "string" ? msg.pass.trim().slice(0, 20) : "";
    const room = new Room(makeCode(), name, pass, nextSlot++, hooks);
    rooms.set(room.code, room);
    log(`salle ${room.code} créée par ${client.name} — « ${name} »${pass ? " (protégée)" : ""}`);
    lastRoomOf.set(client.pseudoKey, room.code);
    room.attach(client);
  }

  function handleJoinRoom(client, msg) {
    if (client.room) return;
    const room = rooms.get(typeof msg.code === "string" ? msg.code.toUpperCase() : "");
    if (!room) return joinError(client, "disparue");
    if (room.clients.size >= ROOM_MAX_PLAYERS) return joinError(client, "pleine");
    if (room.pass && !room.knownMembers.has(client.pseudoKey)) {
      const pass = typeof msg.pass === "string" ? msg.pass.trim() : "";
      if (pass !== room.pass) return joinError(client, "motdepasse");
    }
    lastRoomOf.set(client.pseudoKey, room.code);
    room.attach(client);
  }

  const ERR_MAX = 12;

  function propre(v, max) {
    return String(v ?? "").slice(0, max).replace(/[\r\n\t]+/g, " ⏎ ");
  }

  function logClientError(client, msg) {
    client.errSeen ??= new Set();
    if (client.errSeen.size >= ERR_MAX) return;
    const ou = propre(msg.ou, 60);
    const quoi = propre(msg.message, 200);
    const signature = ou + "|" + quoi;
    if (client.errSeen.has(signature)) return;
    client.errSeen.add(signature);

    const qui = client.name || "anonyme";
    const pile = propre(msg.pile, 400);
    log(`[client] ${qui} — ${ou} : ${quoi}${pile ? ` — ${pile}` : ""}`);
  }

  function metaAllowed(client) {
    return client.joined && !!client.profile
      && (!client.room || client.room.phase === PHASE_LOBBY);
  }

  function handleMeta(client, msg) {
    switch (msg.t) {
      case "metaBuy": {
        const tree = TREES[msg.cls];
        if (!tree) break;
        const line = tree.find(l => l.id === msg.line);
        if (!line) break;
        const pr = client.profile;
        const cp = pr.classes[msg.cls] ??= { tiers: {}, equipped: [] };
        const cur = cp.tiers[line.id] | 0;
        if (cur >= PROG_CFG.TIERS_MAX) break;
        const cost = tierCost(cur);
        if (pr.cores < cost) break;
        pr.cores -= cost;
        cp.tiers[line.id] = cur + 1;
        if (cur === 0 && !cp.equipped.includes(line.id)
            && cp.equipped.length < slotsFor(pr)) {
          cp.equipped.push(line.id);
        }
        persist(client);
        sendProgress(client);
        break;
      }

      // les lignes communes ne consomment aucun emplacement : elles valent pour
      // les trois classes, sans equipement a choisir
      case "metaCommun": {
        const line = COMMUN.find(l => l.id === msg.line);
        if (!line) break;
        const pr = client.profile;
        pr.commun ??= {};
        const cur = pr.commun[line.id] | 0;
        if (cur >= PROG_CFG.TIERS_MAX) break;
        const cost = tierCost(cur, line.id);
        if (pr.cores < cost) break;
        pr.cores -= cost;
        pr.commun[line.id] = cur + 1;
        persist(client);
        sendProgress(client);
        break;
      }

      case "metaEquip": {
        const cp = client.profile.classes[msg.cls];
        if (!cp || !Array.isArray(msg.lines) || msg.lines.length > 16) break;
        const lines = [...new Set(msg.lines.filter(l => typeof l === "string"))];
        if (lines.some(l => !(cp.tiers[l] > 0))) break;
        if (lines.length > slotsFor(client.profile)) break;
        cp.equipped = lines;
        persist(client);
        sendProgress(client);
        break;
      }

      case "metaConfort": {
        const cost = PROG_CFG.CONFORT_COSTS[msg.id];
        if (cost === undefined) break;
        const pr = client.profile;
        if (pr.confort.includes(msg.id) || pr.cores < cost) break;
        pr.cores -= cost;
        pr.confort.push(msg.id);
        persist(client);
        sendProgress(client);
        break;
      }
    }
  }


  function handleConnection(conn, req) {
    const ip = req.socket?.remoteAddress ?? "?";
    const ipCount = (ipCounts.get(ip) ?? 0) + 1;
    if (ipCount > IP_CONN_MAX) {
      conn.send(JSON.stringify({ t: "authError",
        msg: "trop de connexions depuis cette adresse", fatal: 1 }));
      setTimeout(() => conn.close(), 200);
      return;
    }
    ipCounts.set(ip, ipCount);

    const id = nextClientId++;
    const client = {
      id, conn,
      name: "joueur " + id,
      colorIndex: 0,
      joined: false,
      room: null,
      spectator: false,
      vote: DIFF_NORMAL,
      cls: null,
      clsLocked: false,
      ready: false,
      lastListAt: 0,
      input: { x: 0, y: 0, ax: 1, ay: 0, ar: SKILL_CFG.DPS_BOMB_RANGE_MAX,
               dash: false, s1: false, s2: false, s3: false },
      total: { score: 0, kills: 0, deaths: 0, rounds: 0 },
    };
    clients.set(id, client);

    conn.send(JSON.stringify(serverInfoPayload(client)));

    conn.onmessage = raw => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (!msg || typeof msg !== "object") return;

      if (msg.t === "register")   { handleRegister(client, msg); return; }
      if (msg.t === "login")      { handleLogin(client, msg); return; }
      if (msg.t === "loginToken") { handleLoginToken(client, msg); return; }
      if (!client.joined) return;

      switch (msg.t) {
        case "logout": {
          const room = client.room;
          if (room) {
            try { room.detach(client); } catch { client.room = null; }
          }
          store.logout(client.pseudoKey);
          client.joined = false;
          client.profile = null;
          client.pseudoKey = null;
          client.conn.send(JSON.stringify({ t: "loggedOut" }));
          return;
        }
        case "changePass": {
          const neuf = typeof msg.neuf === "string" ? msg.neuf : "";
          if (neuf.length < PASS_MIN || neuf.length > PASS_MAX) {
            client.conn.send(JSON.stringify({ t: "authError", motif: "passfaible",
              msg: `mot de passe : ${PASS_MIN} caractères minimum` }));
            return;
          }
          const r = store.changePass(client.pseudoKey,
            typeof msg.ancien === "string" ? msg.ancien : "", neuf);
          client.conn.send(JSON.stringify(r.ok
            ? { t: "passChanged" }
            : { t: "authError", motif: "identifiants", msg: "ancien mot de passe incorrect" }));
          return;
        }
        case "listRooms": {
          const now = Date.now();
          if (now - client.lastListAt < LIST_MIN_MS) return;
          client.lastListAt = now;
          client.conn.send(JSON.stringify(roomsPayload()));
          return;
        }
        case "leaderboard": {
          const now = Date.now();
          if (now - client.lastListAt < LIST_MIN_MS) return;
          client.lastListAt = now;
          client.conn.send(JSON.stringify({ t: "leaderboard", board: leaderboard() }));
          return;
        }
        case "createRoom": handleCreateRoom(client, msg); return;
        case "joinRoom":   handleJoinRoom(client, msg); return;
        case "leaveRoom": {
          const room = client.room;
          if (!room) return;
          try { room.detach(client); } catch { client.room = null; }
          lastRoomOf.delete(client.pseudoKey);
          returnToHub(client, "quitté");
          return;
        }
        case "metaBuy":
        case "metaCommun":
        case "metaEquip":
        case "metaConfort":
          if (metaAllowed(client)) handleMeta(client, msg);
          return;

        case "clientError":
          logClientError(client, msg);
          return;
      }

      const room = client.room;
      if (!room) return;
      try {
        room.handleMessage(client, msg);
      } catch (err) {
        log(`salle ${room.code} en erreur sur « ${msg.t} » : ${err.message}`);
        closeRoom(room, "erreur");
      }
    };

    conn.onclose = () => {
      if (client.room) {
        try { client.room.detach(client); } catch { client.room = null; }
      }
      clients.delete(id);
      const left = (ipCounts.get(ip) ?? 1) - 1;
      if (left <= 0) ipCounts.delete(ip); else ipCounts.set(ip, left);
      if (client.joined) {
        log(`${client.name} déconnecté — ${[...clients.values()].filter(c => c.joined).length} connecté(s)`);
      }
    };
  }


  function authError(client, motif, msg, fatal = 0) {
    client.conn.send(JSON.stringify(fatal
      ? { t: "authError", motif, msg, fatal: 1 }
      : { t: "authError", motif, msg }));
  }

  function connFailsExceeded(client) {
    if ((client.joinFails | 0) < 5) return false;
    authError(client, "essais", "trop d'essais — reconnecte-toi pour réessayer", 1);
    return true;
  }

  function validPass(client, v) {
    const pass = typeof v === "string" ? v : "";
    if (pass.length >= PASS_MIN && pass.length <= PASS_MAX) return pass;
    authError(client, "passfaible",
      `mot de passe : ${PASS_MIN} caractères minimum (${PASS_MAX} maximum)`);
    return null;
  }

  function handleRegister(client, msg) {
    if (client.joined || connFailsExceeded(client)) return;
    const pseudo = sanitizePseudo(msg.pseudo);
    if (!pseudo) {
      return authError(client, "pseudo",
        "pseudo invalide (3 à 14 caractères : lettres, chiffres, _ . -)");
    }
    const pass = validPass(client, msg.pass);
    if (pass === null) return;
    const r = store.register(pseudo, pass);
    if (!r.ok) return authError(client, "pris", "ce pseudo est déjà pris — choisis-en un autre, ou connecte-toi avec");
    finishAuth(client, r.profile, r.token, "nouveau compte");
  }

  function handleLogin(client, msg) {
    if (client.joined || connFailsExceeded(client)) return;
    const pseudo = sanitizePseudo(msg.pseudo);
    const pass = typeof msg.pass === "string" ? msg.pass : "";
    if (!pseudo || !pass) return authError(client, "identifiants", "pseudo ou mot de passe incorrect");

    const lower = pseudo.toLowerCase();
    const freeze = authFails.get(lower);
    if (freeze && Date.now() < freeze.until) {
      return authError(client, "attente", "trop d'essais sur ce pseudo — attends quelques secondes");
    }

    const r = store.login(pseudo, pass);
    if (!r.ok) {
      client.joinFails = (client.joinFails | 0) + 1;
      const rec = authFails.get(lower) ?? { n: 0, until: 0 };
      rec.n += 1;
      if (rec.n >= PSEUDO_FAILS_MAX) rec.until = Date.now() + PSEUDO_FREEZE_MS;
      authFails.set(lower, rec);
      return authError(client, "identifiants", "pseudo ou mot de passe incorrect");
    }
    authFails.delete(lower);
    finishAuth(client, r.profile, r.token, "");
  }

  function handleLoginToken(client, msg) {
    if (client.joined) return;
    const pseudo = typeof msg.pseudo === "string" ? msg.pseudo : "";
    const token = typeof msg.token === "string" ? msg.token : "";
    const r = pseudo && token ? store.loginToken(pseudo, token) : { ok: false };
    if (!r.ok) return authError(client, "jeton", "session expirée — reconnecte-toi");
    finishAuth(client, r.profile, null, "reprise par jeton");
  }

  function finishAuth(client, profile, token, note) {
    const conn = client.conn;
    client.joined = true;
    client.name = profile.pseudo;
    client.pseudoKey = profile.pseudo.toLowerCase();
    client.tempAccount = [...clients.values()]
      .some(c => c !== client && c.pseudoKey === client.pseudoKey);
    client.profile = client.tempAccount ? structuredClone(profile) : profile;

    const lastCode = lastRoomOf.get(client.pseudoKey);
    const lastRoom = lastCode ? rooms.get(lastCode) : null;
    const rejoin = lastRoom && lastRoom.clients.size < ROOM_MAX_PLAYERS
      ? { code: lastRoom.code, name: lastRoom.name } : null;

    conn.send(JSON.stringify({
      t: "welcome",
      id: client.id,
      pseudo: client.name,
      token: token ?? undefined,
      colors: PLAYER_COLORS,
      version: VERSION,
      commit: commit || undefined,
      dup: client.tempAccount ? 1 : 0,
      rejoin,
      cfg: {
        ARENA_W: CFG.ARENA_W, ARENA_H: CFG.ARENA_H,
        SNAPSHOT_HZ: CFG.SNAPSHOT_HZ,
      },
    }));
    sendProgress(client);
    conn.send(JSON.stringify(roomsPayload()));
    log(`${client.name} connecté au hub`
      + `${note ? ` (${note})` : ""}`
      + `${client.tempAccount ? " (déjà connecté ailleurs : session temporaire)" : ""}`
      + ` — ${[...clients.values()].filter(c => c.joined).length} connecté(s)`);
  }


  let lastTick = process.hrtime.bigint();

  const perfPeriode = new Sampler();
  const perfTour = new Sampler();
  let perfSince = 0;
  let perfEtait = false;

  function tick() {
    const now = process.hrtime.bigint();
    let elapsed = Number(now - lastTick) / 1e9;
    lastTick = now;
    if (elapsed > 0.25) elapsed = 0.25;

    if (PERF_ON !== perfEtait) {
      perfEtait = PERF_ON;
      perfPeriode.reset();
      perfTour.reset();
      perfSince = 0;
      for (const room of rooms.values()) room.perfArm();
    }

    const t0 = PERF_ON ? perfNow() : 0;
    if (PERF_ON) perfPeriode.add(elapsed * 1000);

    const nowMs = Date.now();
    for (const room of [...rooms.values()]) {
      try {
        room.tick(elapsed);
      } catch (err) {
        log(`salle ${room.code} en erreur : ${err.message}`);
        closeRoom(room, "erreur");
        continue;
      }
      if (room.clients.size === 0 && room.emptySince
          && nowMs - room.emptySince >= ROOM_GRACE_MS) {
        rooms.delete(room.code);
        broadcastRooms();
        log(`salle ${room.code} détruite — vide depuis ${Math.round(ROOM_GRACE_MS / 1000)} s`);
      }
    }

    if (PERF_ON) {
      perfTour.add(perfNow() - t0);
      perfSince += elapsed;
      if (perfSince >= PERF_REPORT_S) {
        perfSince = 0;
        const pe = perfPeriode.stats(), to = perfTour.stats();
        console.log(`[perf] boucle n=${pe.n}`
          + ` periode moy=${f1(pe.moy)} min=${f1(pe.min)} max=${f1(pe.max)}`
          + ` | tour moy=${f1(to.moy)} p99=${f1(to.p99)} max=${f1(to.max)} ms`);
        perfPeriode.reset();
        perfTour.reset();
        for (const room of rooms.values()) room.perfReport();
      }
    }
  }


  function adminView() {
    return {
      salles: [...rooms.values()].map(r => ({
        code: r.code,
        nom: r.name,
        joueurs: r.clients.size,
        max: ROOM_MAX_PLAYERS,
        phase: r.phase,
        manche: r.roundNumber,
        vague: r.phase === PHASE_ROUND ? r.state.segment : 0,
      })),
      connectes: [...clients.values()].filter(c => c.joined).length,
    };
  }

  function anyRoundRunning() {
    return [...rooms.values()].some(r => r.phase !== PHASE_LOBBY);
  }

  function kickAccounts(msg) {
    for (const c of [...clients.values()]) {
      if (!c.joined) continue;
      if (c.room) {
        try { c.room.detach(c); } catch { c.room = null; }
      }
      c.joined = false;
      c.profile = null;
      c.pseudoKey = null;
      authError(c, "reset", msg, 1);
    }
  }

  function kickAccount(lower, msg) {
    for (const c of [...clients.values()]) {
      if (!c.joined || c.pseudoKey !== lower) continue;
      if (c.room) {
        try { c.room.detach(c); } catch { c.room = null; }
      }
      c.joined = false;
      c.profile = null;
      c.pseudoKey = null;
      authError(c, "reset", msg, 1);
    }
  }

  function connectedKeys() {
    const out = new Set();
    for (const c of clients.values()) if (c.joined && c.pseudoKey) out.add(c.pseudoKey);
    return out;
  }

  function pingAll() {
    for (const c of clients.values()) c.conn.ping();
    broadcastServerInfo();
  }

  function serverInfoPayload(c) {
    return {
      t: "serverInfo",
      rtt: c.conn.rtt != null ? Math.round(c.conn.rtt) : -1,
      rooms: rooms.size,
      build: BUILD,
    };
  }

  function broadcastServerInfo() {
    for (const c of clients.values()) {
      if (c.room && c.room.phase !== PHASE_LOBBY) continue;
      c.conn.send(JSON.stringify(serverInfoPayload(c)));
    }
  }

  function publicInfo() {
    return { rooms: rooms.size, build: BUILD };
  }

  return {
    handleConnection, tick, pingAll, publicInfo, adminView, anyRoundRunning,
    kickAccounts, kickAccount, connectedKeys, rooms, clients,
  };
}

function sanitizePseudo(v) {
  if (typeof v !== "string") return null;
  const p = v.replace(/[^\p{L}\p{N}_.-]/gu, "").slice(0, 14);
  return p.length >= 3 ? p : null;
}
