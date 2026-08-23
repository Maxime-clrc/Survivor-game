
import { playSound } from "/audio.js";
import { STATUS_ICON, paintIcon } from "/icons.js";
import { ALERT_INFO, ALERT_ORDER, ALERT_WARN, mechAt, mechCollective, mechNom, mechOrdre, mechTexte } from "/shared/bosses.js";
import { CFG, weatherAt } from "/shared/game_state.js";
import { weatherNom, weatherTexte } from "/shared/biomes.js";
import { ENEMY } from "/shared/palette.js";
import { STATUSES, statusBit } from "/shared/statuses.js";
import { eventAt, eventNom, eventTexte } from "/shared/timeline.js";
import { EMPTY_SET, INTERP_MS, PERF, PHASE_ROUND, bilanOpen, cardsState, difficulty, merchantState, pauseReal, phase, signalerErreur, snapshots } from "../core/state.js";
import { ctx } from "../render/stage.js";

export const netPerf = {
  esp: [], gapBig: 0, famine: 0, remplissage: 0, resnap: 0, frameMax: 0,
  lastRecv: 0, since: 0, txt: "",
  totGap: 0, totFamine: 0, totResnap: 0, maxGap: 0, maxFrame: 0,
  reveil: false,
};
function netPerfLive() {
  return phase === PHASE_ROUND
    && !cardsState && !merchantState && !pauseReal && !bilanOpen;
}
export function netPerfBoundary() {
  netPerf.lastRecv = 0;
}
export function netPerfArrival(t) {
  if (!netPerfLive()) { netPerf.lastRecv = 0; return; }
  if (netPerf.lastRecv > 0) {
    const d = t - netPerf.lastRecv;
    netPerf.esp.push(d);
    if (d > netPerf.maxGap) netPerf.maxGap = d;
    if (d > INTERP_MS) { netPerf.gapBig++; netPerf.totGap++; }
  }
  netPerf.lastRecv = t;
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) netPerf.reveil = true;
});
export function netPerfFrame(raw) {
  if (netPerf.reveil || document.hidden) {
    netPerf.reveil = false;
    netPerf.since += Math.min(raw, 1000);
  } else {
    if (raw > netPerf.frameMax) netPerf.frameMax = raw;
    if (raw > netPerf.maxFrame) netPerf.maxFrame = raw;
    netPerf.since += raw;
  }
  if (netPerf.since < 1000) return;
  netPerf.since = 0;

  const v = netPerf.esp;
  let min = 0, max = 0, moy = 0;
  if (v.length > 0) {
    min = Infinity; max = -Infinity;
    let sum = 0;
    for (const x of v) { if (x < min) min = x; if (x > max) max = x; sum += x; }
    moy = sum / v.length;
  }
  netPerf.txt = `arr n=${v.length} ${moy.toFixed(1)}/${min === Infinity ? 0 : min.toFixed(1)}`
    + `/${max === -Infinity ? 0 : max.toFixed(1)} ms`
    + ` · famine ${netPerf.famine} · >${INTERP_MS}ms ${netPerf.gapBig}`
    + ` · recal ${netPerf.resnap} · img max ${netPerf.frameMax.toFixed(0)} ms`
    + `\n· TOT famine ${netPerf.totFamine} · recal ${netPerf.totResnap}`
    + ` · >${INTERP_MS}ms ${netPerf.totGap} · max gap ${netPerf.maxGap.toFixed(0)}`
    + ` · img max ${netPerf.maxFrame.toFixed(0)} ms`;

  v.length = 0;
  netPerf.gapBig = 0;
  netPerf.famine = 0;
  netPerf.remplissage = 0;
  netPerf.resnap = 0;
  netPerf.frameMax = 0;
}

export function interpolated(renderTime) {
  if (snapshots.length === 0) return null;
  if (snapshots.length === 1) return flatten(snapshots[0]);

  let a = null, b = null;
  for (let i = snapshots.length - 1; i > 0; i--) {
    if (snapshots[i - 1].recvAt <= renderTime && snapshots[i].recvAt >= renderTime) {
      a = snapshots[i - 1];
      b = snapshots[i];
      break;
    }
  }
  if (!a) {
    if (PERF && netPerfLive()) {
      if (renderTime > snapshots[snapshots.length - 1].recvAt) {
        netPerf.famine++;
        netPerf.totFamine++;
      } else netPerf.remplissage++;
    }
    return flatten(snapshots[snapshots.length - 1]);
  }

  const span = b.recvAt - a.recvAt;
  const k = span > 0 ? (renderTime - a.recvAt) / span : 0;

  const lerpMap = (ma, mb) => {
    const out = [];
    for (const [id, ea] of ma) {
      const eb = mb.get(id);
      out.push(eb
        ? { ...ea, x: ea.x + (eb.x - ea.x) * k, y: ea.y + (eb.y - ea.y) * k,
            aimX: ea.aimX + (eb.aimX - ea.aimX) * k, aimY: ea.aimY + (eb.aimY - ea.aimY) * k }
        : ea);
    }
    return out;
  };

  const lerpBoss = (ea, eb) => {
    if (!ea || !eb || ea.id !== eb.id) return eb;
    return { ...eb, x: ea.x + (eb.x - ea.x) * k, y: ea.y + (eb.y - ea.y) * k };
  };
  const boss = lerpBoss(a.boss, b.boss);
  const boss2 = lerpBoss(a.boss2, b.boss2);

  const lerpList = (la, lb) => {
    const prev = new Map((la ?? []).map(o => [o.id, o]));
    return (lb ?? []).map(o => {
      const p0 = prev.get(o.id);
      return p0 ? { ...o, x: p0.x + (o.x - p0.x) * k, y: p0.y + (o.y - p0.y) * k } : o;
    });
  };
  const marks = lerpList(a.marks, b.marks);

  return {
    tm: a.tm + (b.tm - a.tm) * k,
    over: b.over,
    kills: b.kills,
    slow: b.slow,
    playerList: lerpMap(a.players, b.players),
    enemyList: lerpMap(a.enemies, b.enemies),
    bulletList: lerpMap(a.bullets, b.bullets),
    shotList: lerpMap(a.shots, b.shots),
    droneList: lerpMap(a.drones, b.drones),
    bombList: lerpMap(a.bombs ?? new Map(), b.bombs ?? new Map()),
    zones: b.zones,
    links: b.links,
    powerups: b.powerups,
    turrets: b.turrets,
    bulwarks: lerpList(a.bulwarks, b.bulwarks),
    anchors: b.anchors,
    sancts: b.sancts,
    harvests: b.harvests ?? [],
    effects: b.effects,
    boss, boss2, marks, slip: b.slip,
    bounds: b.bounds, walls: b.walls,
    cover: b.cover,
    segment: b.segment, hordeLeft: b.hordeLeft, beat: b.beat,
    teamLevel: b.teamLevel, teamProgress: b.teamProgress,
    diff: b.diff, windup: b.windup,
    event: b.event,
  };
}
export function flatten(s) {
  return {
    tm: s.tm, over: s.over, kills: s.kills, slow: s.slow,
    playerList: [...s.players.values()],
    enemyList: [...s.enemies.values()],
    bulletList: [...s.bullets.values()],
    shotList: [...s.shots.values()],
    droneList: [...s.drones.values()],
    bombList: [...(s.bombs?.values() ?? [])],
    zones: s.zones,
    links: s.links ?? null,
    powerups: s.powerups,
    turrets: s.turrets,
    bulwarks: s.bulwarks ?? [],
    anchors: s.anchors ?? [],
    sancts: s.sancts ?? [],
    harvests: s.harvests ?? [],
    effects: s.effects,
    boss: s.boss,
    boss2: s.boss2 ?? null,
    marks: s.marks ?? [],
    slip: s.slip ?? false,
    bounds: s.bounds ?? { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H, warn: 0 },
    walls: s.walls ?? null,
    cover: s.cover ?? null,
    segment: s.segment, hordeLeft: s.hordeLeft, beat: s.beat,
    teamLevel: s.teamLevel, teamProgress: s.teamProgress,
    diff: s.diff ?? difficulty, windup: s.windup ?? EMPTY_SET,
    event: s.event ?? null,
  };
}

export const ENEMY_TINT = ENEMY.TINT;
export function paintStatusIcon(id, x, y, scale, opacite = 1) {
  const def = STATUSES[id];
  if (!def) return;
  paintIcon(ctx, STATUS_ICON[id], def.couleur, x, y, scale, opacite);
}
export function activeStatuses(p) {
  const out = [];
  for (const s of STATUSES) if (p.statuses & statusBit(s.id)) out.push(s.id);
  return out;
}
export function paintPowerupIcon(st, x, y, scale, opacite = 1) {
  paintIcon(ctx, st.icon, st.color, x, y, scale, opacite);
}
export let bossAnnounce = 0;
export let lastBossId = 0;
export let phaseAnnounce = 0;
export let lastBossPhase = 0;
export let alertOrder = null;
export let alertWarn = null;
export let alertInfo = null;
export let bossCue = null;
export const alertQueue = [];
export const worldQueue = [];
export let screenCloseQueued = false;
export function pushWorld(fn) {
  worldQueue.push({ fn, at: performance.now() + INTERP_MS });
}
export function flushWorld(now) {
  while (worldQueue.length > 0 && worldQueue[0].at <= now) {
    const item = worldQueue.shift();
    try {
      item.fn();
    } catch (err) {
      signalerErreur("transition", err?.message ?? String(err), err?.stack);
    }
  }
}
// une mecanique ne s'explique qu'UNE fois par navigateur : ensuite, l'ordre
// court suffit, et c'est le telegraphe qui porte l'information.
const MECHS_VUS = "survivor.mechsVus";
let mechsVus = null;
// PAR VARIANTE : avoir vu une grappe n'apprend rien sur un noeud, et l'ordre
// court ne suffit que quand on a deja lu l'explication de CETTE regle.
function premiereFois(id) {
  if (!mechsVus) {
    try { mechsVus = new Set(JSON.parse(localStorage.getItem(MECHS_VUS) ?? "[]")); }
    catch { mechsVus = new Set(); }
  }
  if (mechsVus.has(id)) return false;
  mechsVus.add(id);
  try { localStorage.setItem(MECHS_VUS, JSON.stringify([...mechsVus])); } catch { /* prive */ }
  return true;
}
export function pushAlert(msg) {
  alertQueue.push({ msg, at: performance.now() + INTERP_MS });
}
export function flushAlerts(now) {
  while (alertQueue.length > 0 && alertQueue[0].at <= now) {
    applyAlert(alertQueue.shift().msg, now);
  }
}
function applyAlert(msg, now) {
  if (msg.boss !== undefined) {
    bossAnnounce = now;
    lastBossPhase = 0;
    alertOrder = null;
    alertWarn = null;
    alertInfo = null;
    bossCue = null;
    return;
  }
  const def = msg.meteo !== undefined ? weatherAt(msg.meteo)
    : msg.event !== undefined ? eventAt(msg.event) : mechAt(msg.mech);
  if (!def) return;
  const level = msg.meteo !== undefined ? ALERT_INFO : def.level;
  const dur = msg.dur > 0 ? Math.max(800, msg.dur * 1000 - 250) : 1500;
  // DEUX TEXTES : l'imperatif court est l'ordre de combat, l'explication est
  // reservee a la premiere rencontre. Personne ne lit une phrase en combat.
  const neuf = msg.mech !== undefined
    && premiereFois(msg.v ? `${msg.mech}:${msg.v}` : msg.mech);
  const nom = msg.meteo !== undefined ? weatherNom(msg.meteo)
    : msg.event !== undefined ? eventNom(msg.event) : mechNom(msg.mech, msg.v);
  const dit = msg.meteo !== undefined ? weatherTexte(msg.meteo)
    : msg.event !== undefined ? eventTexte(msg.event)
    : (neuf || !def.ordre ? mechTexte(msg.mech, msg.v) : mechOrdre(msg.mech, msg.v));
  const entry = { nom, from: now, until: now + dur,
                  texte: dit,
                  forme: def.forme ?? "",
                  collective: msg.mech !== undefined && mechCollective(msg.mech) };
  if (level === ALERT_ORDER) alertOrder = entry;
  else if (level === ALERT_WARN) alertWarn = entry;
  else alertInfo = entry;
  if (msg.meteo !== undefined) { playSound("evenement", { haut: false }); return; }
  if (msg.event !== undefined) {
    playSound("evenement", { haut: def.level === ALERT_ORDER });
    return;
  }
  if (def.level === ALERT_ORDER || def.level === ALERT_WARN) {
    bossCue = { from: now, impact: now + (msg.dur > 0 ? msg.dur * 1000 : 1500) };
  }
}

export function setAlertInfo(v) { alertInfo = v; }
export function setAlertOrder(v) { alertOrder = v; }
export function setAlertWarn(v) { alertWarn = v; }
export function setBossAnnounce(v) { bossAnnounce = v; }
export function setBossCue(v) { bossCue = v; }
export function setLastBossId(v) { lastBossId = v; }
export function setLastBossPhase(v) { lastBossPhase = v; }
export function setPhaseAnnounce(v) { phaseAnnounce = v; }
export function setScreenCloseQueued(v) { screenCloseQueued = v; }
