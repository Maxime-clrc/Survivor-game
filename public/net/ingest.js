
import { CLASS_DEFAULT } from "/shared/classes.js";
import { CFG } from "/shared/game_state.js";
import { EMPTY_SET, PERF, SNAP_THRESHOLD, bombReadyAt, bombStockSeen, dash, difficulty, lastSnapAt, latest, myId, phase, ping, predicted, setBombReadyAt, setBombStockSeen, setLastSnapAt, setLatest, setPing, setPredicted, snapshots } from "../core/state.js";
import { netPerf, netPerfArrival } from "./interp.js";
import { deaths } from "../render/fx.js";
import { buildPaintedAt, renderBuild, setBuildPaintedAt } from "../ui/build.js";
import { buildEl } from "../ui/dom.js";


export function ingest(msg) {
  const now = performance.now();
  if (lastSnapAt) setPing(Math.round(now - lastSnapAt));
  setLastSnapAt(now);

  const snap = {
    recvAt: now,
    tm: msg.tm,
    over: msg.ov === 1,
    kills: msg.k,
    slow: msg.sl === 1,
    players: new Map(msg.p.map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], hp: a[3], downed: a[4] === 1,
      revive: a[5], aimX: a[6], aimY: a[7], kills: a[8],
      buffs: a[9], score: a[10], deaths: a[11], shield: a[12],
      level: a[13] ?? 1, maxHp: a[14] ?? CFG.PLAYER_MAX_HP, prog: a[15] ?? 0,
      dashCd: a[16] ?? 0, dashing: a[17] === 1,
      orbiters: a[18] ?? 0, frostRadius: a[19] ?? 0,
      cls: a[20] ?? CLASS_DEFAULT, cd1: a[21] ?? 0, cd2: a[22] ?? 0,
      skillFlags: a[23] ?? 0, bombStock: a[24] ?? 0,
      statuses: a[25] ?? 0, vuln: a[26] ?? 0, doom: a[27] ?? 0,
      damage: a[28] ?? 0,
      src: a[29] ?? 0,
      cd3: a[30] ?? 0, skill3: a[31] ?? 0,
      eclats: a[32] ?? 0,
      fireInterval: a[33] ?? 0,
      critKills: a[34] ?? 0,
      arme: a[35] ?? 0,
      armeRes: a[36] ?? 0,
      armeAng: a[37] ?? 0,
    }])),
    enemies: new Map(msg.e.map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], hp: a[3], maxHp: a[4],
      type: a[5] % 100, elite: a[5] % 200 >= 100, ang: a[6],
      hitSeq: a[7] ?? 0,
      critSeq: a[8] ?? 0,
      shield: a[9] ?? 0,
      pair: a[10] ?? 0,
    }])),
    bullets: new Map(msg.b.map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], owner: a[3] ?? 0, sil: a[4] ?? 0,
    }])),
    links: msg.hl ?? null,
    shots: new Map(msg.s.map(a => [a[0], { id: a[0], x: a[1], y: a[2] }])),
    zones: msg.z.map(a => ({
      id: a[0], x: a[1], y: a[2], r: a[3], warn: a[4], blast: a[5],
      shape: a[6] ?? 0, w: a[7] ?? 0, h: a[8] ?? 0, ang: a[9] ?? 0,
      hole: a[10] ?? 0, warn0: a[11] || CFG.ZONE_WARN,
      spread: a[12] ?? 0, life: a[13] ?? 0, prox: a[14] ?? 0, pj: a[15] ?? 0,
    })),
    bounds: msg.bn
      ? { x0: msg.bn[0], y0: msg.bn[1], x1: msg.bn[2], y1: msg.bn[3],
          nx0: msg.bn[4], ny0: msg.bn[5], nx1: msg.bn[6], ny1: msg.bn[7],
          warn: msg.bn[8] }
      : { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H, warn: 0 },
    walls: msg.wl
      ? { x: msg.wl[0], y: msg.wl[1], t: msg.wl[2], k: msg.wl[3] }
      : null,
    cover: msg.ob ?? null,
    powerups: msg.w.map(a => ({ id: a[0], x: a[1], y: a[2], type: a[3] })),
    harvests: (msg.hv ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], kind: a[3], k: a[4] ?? 1 })),
    turrets: (msg.tu ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], k: a[3], ang: a[4] })),
    bulwarks: (msg.bw ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], r: a[3], k: a[4] })),
    anchors: (msg.an ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], r: a[3], k: a[4], vuln: a[5] ?? 0 })),
    sancts: (msg.sa ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], r: a[3], k: a[4] })),
    bombs: new Map((msg.bm ?? []).map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], k: a[3], tx: a[4] ?? a[1], ty: a[5] ?? a[2],
    }])),
    drones: new Map((msg.dr ?? []).map(a => [a[0], { id: a[0], x: a[1], y: a[2], ang: a[3], kind: a[4], owner: a[5] ?? 0 }])),
    effects: (msg.f ?? []).map(a => ({
      id: a[0], x: a[1], y: a[2], r: a[3], k: a[4], kind: a[5] ?? 0,
      // l'index 6 porte x2 pour un arc (3, 13) et le PROPRIETAIRE pour un
      // ultime (16) : deux lectures du meme emplacement, jamais deux cles.
      // meme regle a l'index 7 : `y2` pour un arc, l'ANGLE pour tout le reste.
      x2: a[6], y2: a[7], owner: a[6] ?? 0, ang: a[7] ?? 0, n: a[8] ?? 0,
    })),
    boss: msg.bo
      ? { id: msg.bo[0], x: msg.bo[1], y: msg.bo[2], hp: msg.bo[3],
          maxHp: msg.bo[4], ang: msg.bo[5], index: msg.bo[6],
          bars: msg.bo[7] ?? 1, phase: msg.bo[8] ?? 0,
          kind: msg.bo[9] ?? 0, ult: msg.bo[10] ?? 0,
          enrage: msg.bo[11] ?? 0,
          palier: msg.bo[12] ?? 0,
          gazeWarn: msg.bo[13] ?? 0, gaze: msg.bo[14] ?? 0 }
      : null,
    boss2: msg.bo2
      ? { id: msg.bo2[0], x: msg.bo2[1], y: msg.bo2[2], ang: msg.bo2[3],
          focus1: msg.bo2[4] ?? 0, focus2: msg.bo2[5] ?? 0 }
      : null,
    bossDmg: msg.bd ?? null,
    marks: (msg.mk ?? []).map(a => ({
      id: a[0], x: a[1], y: a[2], r: a[3], k: a[4], mech: a[5],
      a: a[6], b: a[7], need: a[8], cur: a[9], hp: a[10], noeud: a[11] ?? 0,
    })),
    slip: msg.sp === 1,
    segment: msg.sg ? msg.sg[0] : 0,
    hordeLeft: msg.sg ? msg.sg[1] : 0,
    beat: msg.sg ? msg.sg[2] : 0,
    teamLevel: msg.xl ?? 1,
    teamProgress: msg.xp ?? 0,
    diff: msg.df ?? difficulty,
    windup: msg.wu ? new Set(msg.wu) : EMPTY_SET,
    event: msg.ev ? { id: msg.ev[0], t: msg.ev[1] } : null,
  };

  setLatest(snap);
  snapshots.push(snap);
  while (snapshots.length > 40) snapshots.shift();
  if (PERF) netPerfArrival(now);

  if (!buildEl.hidden && now - buildPaintedAt > 500) {
    setBuildPaintedAt(now);
    renderBuild();
  }

  const me = snap.players.get(myId);
  if (me) {
    const stock = me.bombStock ?? 0;
    if (stock > bombStockSeen) setBombReadyAt(performance.now());
    setBombStockSeen(stock);
  } else {
    setBombStockSeen(0);
  }

  if (me) {
    const dashing = dash.t > 0 || me.dashing;
    const loin = !!predicted && !dashing
      && Math.hypot(me.x - predicted.x, me.y - predicted.y) > SNAP_THRESHOLD;
    if (!predicted || me.downed || loin) {
      if (PERF && loin) { netPerf.resnap++; netPerf.totResnap++; }
      setPredicted({ x: me.x, y: me.y });
    }
  } else {
    setPredicted(null);
  }
}
