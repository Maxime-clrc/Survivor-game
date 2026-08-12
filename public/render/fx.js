
import { playSound } from "/audio.js";
import { EventPump } from "/events.js";
import { hudDamage } from "/hud.js";
import { SRC_ICON } from "/icons.js";
import { CFG, hazardState } from "/shared/game_state.js";
import { COMBAT, SIGNAL, alpha } from "/shared/palette.js";
import { eventAt, segmentName } from "/shared/timeline.js";
import { SPRITE_CELL, drawSprite, frameOf, glActive } from "/sprites.js";
import { latest, myId } from "../core/state.js";
import { ENEMY_TINT, alertInfo, setAlertInfo } from "../net/interp.js";
import { ELITE_GOLD, GRID_FINE, camera, ctx, hazardsActifs, inView } from "./stage.js";


const PARTICLE_2D = 300;
export const PARTICLE_GL = 3000;
export let PARTICLE_MAX = PARTICLE_2D;
export const HIT_FLASH = 0.06;
export const HIT_KICK = 5;
const SHAKE_MAX = 10;
export const particles = [];
export const hits = new Map();
export const shake = { x: 0, y: 0, mag: 0 };
export const pump = new EventPump(handleEvent, {
  get myId() { return myId; },
  get hazards() { return hazardsActifs(); },
  hazardState,
});
function addShake(mag) {
  shake.mag = Math.min(SHAKE_MAX, Math.max(shake.mag, mag));
}
const EFFECT_SOUND = {
  0:  { son: "explosion", force: 0.7, shake: 4 },
  5:  { son: "mort", pitch: 0.55, shake: 0 },
  7:  { son: "explosion", force: 1.0, shake: 6 },
  8:  { son: "explosion", force: 0.6, shake: 4 },
  12: { son: "explosion", force: 1.35, shake: 9 },
  13: { son: "impact", pitch: 1.4, force: 0.5, shake: 0 },
  14: { son: "impact", pitch: 0.55, force: 0.45, shake: 0 },
};
function handleEvent(e) {
  switch (e.t) {
    case "tir":
      playSound("tir");
      break;

    case "impact":
      playSound("impact");
      if (!e.boss) { registerHit(e); aggregateDamage(e); }
      break;

    case "blesse":
      aggregateSelf("hurt", e);
      break;

    case "soigne":
      aggregateSelf("heal", e);
      break;

    case "danger":
      break;

    case "murDetruit":
      playSound("mur");
      break;

    case "mort":
      playSound("mort", { pitch: e.elite ? 0.6 : 1.3 - Math.min(0.6, e.type * 0.12) });
      spawnDeath(e.x, e.y, e.type, e.elite, e.ang ?? 0);
      if (e.dmg > 0) aggregateDamage(e);
      break;

    case "bonus": playSound("bonus"); break;
    case "niveau": playSound("niveau"); break;

    case "segment": {
      const now = performance.now();
      setAlertInfo({ nom: segmentName(e.segment).toUpperCase(),
                    texte: "la horde reprend",
                    from: now, until: now + 2500 });
      break;
    }

    case "evenementFin": {
      const now = performance.now();
      const def = eventAt(e.event);
      setAlertInfo({ nom: (def?.nom ?? "ÉVÉNEMENT").toUpperCase(),
                    texte: "terminé — équipe remise à plein",
                    from: now, until: now + 2500 });
      playSound("releve");
      break;
    }
    case "aterre": playSound("aterre"); break;
    case "releve": playSound("releve"); break;

    case "explosion": {
      const k = Math.max(0.35, Math.min(1.4, e.r / 150));
      playSound("explosion", { force: k });
      addShake(3 + k * 5);
      addGridPing(e.x, e.y, e.r);
      break;
    }

    case "barre":
      playSound("barre");
      addShake(SHAKE_MAX);
      addGridPing(lastBossPos.x, lastBossPos.y, 260);
      break;

    case "boss":
      playSound("boss");
      break;

    case "degats":
      pushDamage(e.x, e.y, e.dmg, e.crit);
      break;

    case "effet": {
      const d = EFFECT_SOUND[e.kind];
      if (!d) break;
      playSound(d.son, d);
      if (d.shake) {
        addShake(d.shake);
        addGridPing(e.x, e.y, Math.max(70, e.r || 0));
      }
      break;
    }
  }
}
function registerHit(e) {
  let dx = 0, dy = 0;
  if (latest) {
    let best = Infinity;
    for (const p of latest.players.values()) {
      const d = (p.x - e.x) ** 2 + (p.y - e.y) ** 2;
      if (d < best) { best = d; dx = e.x - p.x; dy = e.y - p.y; }
    }
    const n = Math.hypot(dx, dy) || 1;
    dx /= n; dy /= n;
  }

  const now = performance.now();
  const n = Math.max(1, Math.min(HIT_BURST_MAX, e.hits ?? 1));
  const span = 1000 / CFG.SNAPSHOT_HZ;
  const step = Math.max(HIT_FLASH * 1000, span / n);
  for (let i = 0; i < n; i++) {
    if (i === 0) applyHit(e.id, e.x, e.y, dx, dy);
    else hitQueue.push({ at: now + i * step, id: e.id, x: e.x, y: e.y, dx, dy });
  }
}
const HIT_BURST_MAX = 4;
export const hitQueue = [];
function applyHit(id, x, y, dx, dy) {
  hits.set(id, { until: performance.now() + HIT_FLASH * 1000, dx, dy });

  for (let i = 0; i < 2 && particles.length < PARTICLE_MAX; i++) {
    const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.6;
    const sp = 90 + Math.random() * 70;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.14, max: 0.14, col: COMBAT.flash, size: 2,
      ang: a, long: 3.4,
    });
  }
}
function flushHitQueue(now) {
  for (let i = hitQueue.length - 1; i >= 0; i--) {
    if (hitQueue[i].at > now) continue;
    const h = hitQueue[i];
    hitQueue.splice(i, 1);
    applyHit(h.id, h.x, h.y, h.dx, h.dy);
  }
}
export const deaths = [];
const DEATH_MAX = 30;
const DEATH_MS = 260;
export function drawDeaths() {
  if (deaths.length === 0) return;
  const now = performance.now();
  for (let i = deaths.length - 1; i >= 0; i--) {
    const d = deaths[i];
    const k = (now - d.at) / DEATH_MS;
    if (k >= 1) { deaths[i] = deaths[deaths.length - 1]; deaths.pop(); continue; }
    if (!inView(d.x, d.y)) continue;
    const step = k < 0.33 ? 0 : (k < 0.66 ? 1 : 2);
    drawSprite(ctx, frameOf(`e${d.type}_die${step}`), d.x, d.y, {
      angle: d.ang,
      scaleX: d.gain * (1 + k * 0.18),
      scaleY: d.gain * (1 - k * 0.25),
      alpha: 1 - k * 0.5,
    });
  }
}
const DEATH_BURST = [
  { n: 1.00, size: 2.5, sp: 60, spread: 130, life: 0.40, flash: 1.0, cone: 7 },
  { n: 0.75, size: 2.0, sp: 150, spread: 190, life: 0.30, flash: 0.8, cone: 1.1 },
  { n: 0.50, size: 5.2, sp: 35, spread: 70, life: 0.65, flash: 1.35, cone: 7 },
  { n: 0.85, size: 2.6, sp: 45, spread: 95, life: 0.45, flash: 0.9, cone: 7 },
  { n: 1.70, size: 1.8, sp: 95, spread: 175, life: 0.35, flash: 0.85, cone: 7 },
  { n: 1.60, size: 2.2, sp: 190, spread: 240, life: 0.26, flash: 1.8, cone: 7 },
  { n: 0.55, size: 4.6, sp: 50, spread: 85, life: 0.60, flash: 1.25, cone: 7 },
  { n: 0.85, size: 2.0, sp: 80, spread: 130, life: 0.42, flash: 0.8, cone: 7 },
  { n: 1.35, size: 2.4, sp: 45, spread: 95, life: 0.60, flash: 1.15, cone: 7 },
];
function spawnDeath(x, y, type, elite, ang = 0) {
  if (deaths.length < DEATH_MAX) {
    deaths.push({
      x, y, type, at: performance.now(),
      ang: Math.random() * Math.PI * 2,
      gain: elite ? CFG.ELITE_RADIUS_MUL : 1,
    });
  }
  if (particles.length >= PARTICLE_MAX) return;
  const col = ENEMY_TINT[type] ?? ENEMY_TINT[0];
  const dense = glActive();
  const D = DEATH_BURST[type] ?? DEATH_BURST[0];
  const n = Math.round((elite ? (dense ? 22 : 10) : (dense ? 14 : 7)) * D.n);
  const grow = elite ? 1.4 : 1;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = D.cone >= 7 ? Math.random() * Math.PI * 2
                          : ang + (Math.random() - 0.5) * D.cone;
    const sp = D.sp + Math.random() * D.spread;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: D.life, max: D.life, col, size: D.size * grow,
      frame: fxShard, ang: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 14 * (2.5 / D.size),
    });
  }
  if (particles.length < PARTICLE_MAX) {
    particles.push({
      x, y, vx: 0, vy: 0, life: 0.12, max: 0.12,
      col: COMBAT.flash, size: (elite ? 20 : 13) * D.flash, frame: fxGlow,
    });
  }
  if (elite && bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 20, max: 74, life: 0.35, t: 0.35, col: ELITE_GOLD });
  }
}
export const bursts = [];
export const BURST_MAX = 24;
function stepBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    bursts[i].t -= dt;
    if (bursts[i].t <= 0) { bursts[i] = bursts[bursts.length - 1]; bursts.pop(); }
  }
}
export function drawBursts() {
  for (const b of bursts) {
    const k = 1 - b.t / b.life;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = alpha(b.col, (1 - k) * 0.75);
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + (b.max - b.r) * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
function pushDamage(x, y, dmg, crit = false) {
  hudDamage(x + (Math.random() - 0.5) * 40, y - 30, dmg, crit ? "crit" : "deal");
}
const DMG_AGG_MS = 200;
const DMG_THRESHOLD = 0.05;
export const dmgAgg = new Map();
function aggregateDamage(e) {
  const a = dmgAgg.get(e.id);
  if (a) { a.sum += e.dmg; a.x = e.x; a.y = e.y; return; }
  dmgAgg.set(e.id, {
    x: e.x, y: e.y, sum: e.dmg, at: performance.now(),
    maxHp: e.maxHp || 1,
  });
}
const SELF_AGG_MS = 200;
export const selfAgg = new Map();
function aggregateSelf(kind, e) {
  const cle = e.id + ":" + kind;
  const a = selfAgg.get(cle);
  if (a) {
    a.sum += e.dmg;
    a.x = e.x; a.y = e.y;
    if (kind === "hurt") a.src = e.src ?? 0;
    return;
  }
  selfAgg.set(cle, {
    kind, x: e.x, y: e.y, sum: e.dmg, at: performance.now(), src: e.src ?? 0,
  });
}
export function flushSelf(now) {
  if (selfAgg.size === 0) return;
  for (const [cle, a] of selfAgg) {
    if (now - a.at < SELF_AGG_MS) continue;
    if (Math.round(a.sum) < 1) { a.at = now; continue; }
    selfAgg.delete(cle);
    hudDamage(a.x - camera.x0, a.y - camera.y0 - 26, a.sum, a.kind,
              a.kind === "hurt" ? (SRC_ICON[a.src] ?? null) : null);
  }
}
export function flushDamage(now) {
  if (dmgAgg.size === 0) return;
  for (const [id, a] of dmgAgg) {
    if (now - a.at < DMG_AGG_MS) continue;
    dmgAgg.delete(id);
    if (a.sum >= a.maxHp * DMG_THRESHOLD) {
      hudDamage(a.x - camera.x0 + (Math.random() - 0.5) * 18,
                a.y - camera.y0 - 22, a.sum, "deal");
    }
  }
}
export function stepFeedback(dt) {
  if (shake.mag > 0.05) {
    shake.mag *= Math.pow(0.004, dt / 0.2);
    shake.x = (Math.random() - 0.5) * 2 * shake.mag;
    shake.y = (Math.random() - 0.5) * 2 * shake.mag;
  } else {
    shake.mag = 0; shake.x = 0; shake.y = 0;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      if (p.zfx) zoneFx--;
      particles[i] = particles[particles.length - 1];
      particles.pop();
      continue;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.90; p.vy *= 0.90;
    if (p.lift) p.vy -= p.lift * dt;
    if (p.spin) p.ang += p.spin * dt;
    if (p.grow) p.size += p.grow * dt;
  }
  stepBursts(dt);

  const now = performance.now();
  if (hitQueue.length > 0) flushHitQueue(now);
  if (hits.size > 0) {
    for (const [id, h] of hits) if (h.until < now) hits.delete(id);
  }
}
export let fxWhite = 0, fxShard = 0, fxGlow = 0;
export function drawParticles() {
  if (glActive()) {
    for (const p of particles) {
      if (!inView(p.x, p.y, 40)) continue;
      const s = p.size / SPRITE_CELL;
      drawSprite(ctx, p.frame ?? fxWhite, p.x, p.y, {
        scaleX: s * (p.long ?? 1),
        scaleY: s,
        angle: p.ang ?? 0,
        tint: p.col,
        alpha: Math.max(0, p.life / p.max),
        additive: true,
      });
    }
    return;
  }

  for (const p of particles) {
    if (!inView(p.x, p.y, 40)) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.col;
    if (p.frame === fxGlow && fxGlow) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}
export const gridPings = [];
const GRID_PING_MS = 420;
function addGridPing(x, y, r) {
  if (gridPings.length > 8) gridPings.shift();
  gridPings.push({ x, y, r, at: performance.now() });
}
export function drawGridPings() {
  if (gridPings.length === 0) return;
  const now = performance.now();

  for (let i = gridPings.length - 1; i >= 0; i--) {
    const p = gridPings[i];
    const k = (now - p.at) / GRID_PING_MS;
    if (k >= 1) { gridPings.splice(i, 1); continue; }

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = SIGNAL.go;
    ctx.globalAlpha = 0.30 * (1 - k);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = Math.floor((p.x - p.r) / GRID_FINE) * GRID_FINE;
    const y0 = Math.floor((p.y - p.r) / GRID_FINE) * GRID_FINE;
    for (let x = x0; x <= p.x + p.r; x += GRID_FINE) {
      ctx.moveTo(x + .5, p.y - p.r); ctx.lineTo(x + .5, p.y + p.r);
    }
    for (let y = y0; y <= p.y + p.r; y += GRID_FINE) {
      ctx.moveTo(p.x - p.r, y + .5); ctx.lineTo(p.x + p.r, y + .5);
    }
    ctx.stroke();
    ctx.restore();
  }
}

export const ZONE_FX_MAX = 600;
export let zoneFx = 0;
export const lastBossPos = { x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2 };

export function setPARTICLE_MAX(v) { PARTICLE_MAX = v; }
export function setFxWhite(v) { fxWhite = v; }
export function setFxShard(v) { fxShard = v; }
export function setFxGlow(v) { fxGlow = v; }
export function setZoneFx(v) { zoneFx = v; }
