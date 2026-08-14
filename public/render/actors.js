
import { POWERUP_ICON, POWERUP_STYLE, paintIcon } from "/icons.js";
import { RARITY_COLOR } from "/shared/cards.js";
import { SKILL_CFG } from "/shared/classes.js";
import { TRAIT_AURA, TRAIT_CFG, hasTrait } from "/shared/enemies.js";
import { CFG, ENEMY_TYPES, POWERUP_TYPES, traitsOf } from "/shared/game_state.js";
import { BOSS, CLASS_COLOR, ENEMY, FX, OWNED, SIGNAL, SURFACE, ZONE, alpha } from "/shared/palette.js";
import { drawSprite, frameOf } from "/sprites.js";
import { EMPTY_SET, bombReadyAt, difficulty, myId } from "../core/state.js";
import { ENEMY_TINT, paintPowerupIcon } from "../net/interp.js";
import { BURST_MAX, CRIT_PUNCH, HIT_FLASH, HIT_KICK, PARTICLE_MAX, ZONE_FX_MAX, bursts, fxGlow, fxShard, hits, particles, setZoneFx, zoneFx } from "./fx.js";
import { ELITE_GOLD, camera, ctx, inView, ownerColorOf } from "./stage.js";

export const ARROW_MARGIN = 34;
export const bulletTrail = new Map();
export const shotTrail = new Map();
function boltGlow(b, r, col) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = alpha(col, 0.16);
  ctx.beginPath(); ctx.arc(b.x, b.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function boltDiamond(x, y, ux, uy, r) {
  const px = -uy, py = ux;
  const long = r * 2.4, wide = r * 0.9;
  ctx.beginPath();
  ctx.moveTo(x + ux * long, y + uy * long);
  ctx.lineTo(x + px * wide, y + py * wide);
  ctx.lineTo(x - ux * long, y - uy * long);
  ctx.lineTo(x - px * wide, y - py * wide);
  ctx.closePath();
  ctx.fill();
}
export const BOLT_CAPSULE = 0;
export const BOLT_DIAMOND = 1;
export function drawBolt(b, r, col, trail, shape = BOLT_CAPSULE) {
  const prev = trail.get(b.id);
  trail.set(b.id, { x: b.x, y: b.y });

  boltGlow(b, r, col);
  ctx.fillStyle = col;
  if (prev) {
    const dx = b.x - prev.x, dy = b.y - prev.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const ux = dx / d, uy = dy / d;
      if (shape === BOLT_DIAMOND) {
        ctx.globalAlpha = 0.3;
        boltDiamond(b.x - ux * r * 3, b.y - uy * r * 3, ux, uy, r * 0.7);
        ctx.globalAlpha = 1;
        boltDiamond(b.x, b.y, ux, uy, r);
        return;
      }
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(b.x - ux * r * 3, b.y - uy * r * 3, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x - ux * r * 2.2, b.y - uy * r * 2.2);
      ctx.lineTo(b.x + ux * r * 0.5, b.y + uy * r * 0.5);
      ctx.stroke();
      ctx.lineCap = "butt";
      return;
    }
  }
  if (shape === BOLT_DIAMOND) { boltDiamond(b.x, b.y, 1, 0, r); return; }
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.fill();
}
export function pruneTrails(v) {
  if (bulletTrail.size > 900) {
    bulletTrail.clear();
    for (const b of v.bulletList) bulletTrail.set(b.id, { x: b.x, y: b.y });
  }
  if (shotTrail.size > 400) {
    shotTrail.clear();
    for (const s of v.shotList) shotTrail.set(s.id, { x: s.x, y: s.y });
  }
}
const ZONE_INSET = 3;
function zonePath(z, grow = 1) {
  ctx.beginPath();
  zoneSubPath(z, grow);
}
function zoneSubPath(z, grow = 1) {
  if (z.shape === 1) {
    const w = Math.max(4, z.w * grow - ZONE_INSET * 2);
    const h = Math.max(4, z.h * grow - ZONE_INSET * 2);
    rectSub(z.x, z.y, w, h, z.ang || 0);
  } else if (z.shape === 2) {
    ctx.moveTo(z.x + z.r * grow, z.y);
    ctx.arc(z.x, z.y, z.r * grow, 0, Math.PI * 2);
    ctx.moveTo(z.x + z.hole, z.y);
    ctx.arc(z.x, z.y, z.hole, 0, Math.PI * 2, true);
  } else if (z.shape === 3) {
    ctx.moveTo(z.x, z.y);
    ctx.arc(z.x, z.y, z.r * grow, z.ang - z.spread, z.ang + z.spread);
    ctx.closePath();
  } else if (z.shape === 4) {
    ctx.moveTo(z.x, z.y);
    ctx.arc(z.x, z.y, z.r * grow, z.ang + z.spread, z.ang - z.spread + Math.PI * 2);
    ctx.closePath();
  } else if (z.shape === 5) {
    const len = z.r * grow * 2, th = z.h * grow;
    rectSub(z.x, z.y, len, th, z.ang || 0);
    rectSub(z.x, z.y, th, len, z.ang || 0);
  } else {
    ctx.moveTo(z.x + z.r * grow, z.y);
    ctx.arc(z.x, z.y, z.r * grow, 0, Math.PI * 2);
  }
}
function rectSub(cx, cy, w, h, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const hw = w / 2, hh = h / 2;
  const pt = (dx, dy) => [cx + dx * c - dy * s, cy + dx * s + dy * c];
  const a = pt(-hw, -hh), b = pt(hw, -hh), d = pt(hw, hh), e = pt(-hw, hh);
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(d[0], d[1]);
  ctx.lineTo(e[0], e[1]);
  ctx.closePath();
}
function zoneRule(z) { return z.shape === 2 ? "evenodd" : "nonzero"; }
const ZONE_DRAW_MAX = 40;
export const zoneCracks = new Map();
export const zoneMotion = new Map();
export const scorches = [];
export const blastSeen = new Map();
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function zoneSpan(z) {
  if (z.shape === 1) return Math.max(z.w, z.h) / 2;
  return z.r || 40;
}
function crackSetFor(id) {
  let branches = zoneCracks.get(id);
  if (branches) return branches;
  if (zoneCracks.size > 160) zoneCracks.clear();
  const rnd = mulberry32(id);
  branches = [];
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    let a = (i / n) * Math.PI * 2 + rnd() * 0.9;
    const pts = [];
    let d = 0.10 + rnd() * 0.08;
    while (d < 1) {
      pts.push({ d, a });
      d += 0.14 + rnd() * 0.20;
      a += (rnd() - 0.5) * 0.8;
    }
    pts.push({ d: 1, a });
    branches.push(pts);
  }
  zoneCracks.set(id, branches);
  return branches;
}
function drawZoneCracks(z, k, punch) {
  const span = zoneSpan(z);
  const R = span * Math.min(1, k * 1.15);
  if (R < 12) return;
  const branches = crackSetFor(z.id);
  ctx.save();
  zonePath(z);
  ctx.clip(zoneRule(z));
  ctx.strokeStyle = alpha(ZONE.blast, 0.20 + punch * 0.70);
  ctx.lineWidth = 1 + punch * 1.6;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const pts of branches) {
    ctx.moveTo(z.x, z.y);
    for (const pt of pts) {
      if (pt.d * span > R) break;
      ctx.lineTo(z.x + Math.cos(pt.a) * pt.d * span,
                 z.y + Math.sin(pt.a) * pt.d * span);
    }
  }
  ctx.stroke();
  ctx.restore();
}
function trackZoneMotion(list) {
  for (const z of list) {
    const m = zoneMotion.get(z.id);
    if (!m) { zoneMotion.set(z.id, { x: z.x, y: z.y, dx: 0, dy: 0 }); continue; }
    m.dx = m.dx * 0.85 + (z.x - m.x) * 0.15;
    m.dy = m.dy * 0.85 + (z.y - m.y) * 0.15;
    m.x = z.x; m.y = z.y;
  }
  if (zoneMotion.size > 220) zoneMotion.clear();
}
function drawZoneFlow(z, tm) {
  const m = zoneMotion.get(z.id);
  if (!m) return;
  const d = Math.hypot(m.dx, m.dy);
  if (d < 0.45) return;
  const ux = m.dx / d, uy = m.dy / d;
  const R = zoneSpan(z);

  for (let i = 1; i <= 2; i++) {
    ctx.save();
    ctx.translate(-ux * R * 0.55 * i, -uy * R * 0.55 * i);
    ctx.globalAlpha = 0.14 / i;
    ctx.strokeStyle = ZONE.edge;
    ctx.lineWidth = 2;
    zonePath(z);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  zonePath(z);
  ctx.clip(zoneRule(z));
  ctx.strokeStyle = alpha(ZONE.edge, 0.30);
  ctx.lineWidth = 2.5;
  const pas = 22;
  const off = (tm * 90) % pas;
  ctx.beginPath();
  for (let s = -R + off - pas; s < R + pas; s += pas) {
    const cx = z.x + ux * s, cy = z.y + uy * s;
    ctx.moveTo(cx - uy * R, cy + ux * R);
    ctx.lineTo(cx + uy * R, cy - ux * R);
  }
  ctx.stroke();
  ctx.restore();

  if (!z.shape || z.shape === 2) {
    const ang = Math.atan2(uy, ux);
    ctx.strokeStyle = alpha(ZONE.blast, 0.65);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, ang - 0.9, ang + 0.9);
    ctx.stroke();
  }
}
function zoneResolved(z, tm) {
  const last = blastSeen.get(z.id) ?? -9;
  if (tm - last < 0.4) return;
  blastSeen.set(z.id, tm);
  if (blastSeen.size > 220) { const keep = blastSeen.get(z.id); blastSeen.clear(); blastSeen.set(z.id, keep); }

  scorches.push({ z: { ...z }, until: tm + 2 });
  if (scorches.length > 24) scorches.shift();

  const span = zoneSpan(z);
  if (bursts.length < BURST_MAX) {
    bursts.push({ x: z.x, y: z.y, r: span * 0.5, max: span * 1.6, life: 0.35, t: 0.35, col: ZONE.blast });
  }
  for (let i = 0; i < 8 && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 70 + Math.random() * 120;
    particles.push({
      x: z.x + Math.cos(a) * span * 0.4, y: z.y + Math.sin(a) * span * 0.4,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      life: 0.5, max: 0.5, col: ZONE.blast, size: 2.6,
      frame: fxShard, ang: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 10,
    });
  }
}
function drawScorches(tm) {
  for (let i = scorches.length - 1; i >= 0; i--) {
    const s = scorches[i];
    if (s.until <= tm || s.until > tm + 2.5) {
      scorches[i] = scorches[scorches.length - 1];
      scorches.pop();
      continue;
    }
    ctx.fillStyle = alpha(SURFACE.void, 0.30 * ((s.until - tm) / 2));
    zonePath(s.z);
    ctx.fill(zoneRule(s.z));
  }
}
function zoneRandomPoint(z) {
  if (z.shape === 1) {
    const c = Math.cos(z.ang || 0), s = Math.sin(z.ang || 0);
    const dx = (Math.random() - 0.5) * z.w, dy = (Math.random() - 0.5) * z.h;
    return { x: z.x + dx * c - dy * s, y: z.y + dx * s + dy * c };
  }
  const rMin = z.shape === 2 ? (z.hole || 0) : 0;
  const rr = rMin + Math.sqrt(Math.random()) * Math.max(1, (z.r || 40) - rMin);
  const a = Math.random() * Math.PI * 2;
  return { x: z.x + Math.cos(a) * rr, y: z.y + Math.sin(a) * rr };
}
export function drawZones(zones, tm = 0) {
  let list = zones;
  if (list.length > ZONE_DRAW_MAX) {
    const rank = z => (z.warn > 0 ? z.warn : z.life > 0 ? 0 : 99);
    list = [...list].sort((a, b) => rank(a) - rank(b)).slice(0, ZONE_DRAW_MAX);
  }

  drawScorches(tm);
  trackZoneMotion(list);

  const ring = list.reduce((n, z) => n + (z.warn > 0 ? 1 : 0), 0) <= 8;

  const persistent = [];
  for (const z of list) {
    if (z.blast > 0.15) zoneResolved(z, tm);
    if (z.warn <= 0 && z.life > 0) { persistent.push(z); continue; }
    if (z.warn > 0) drawZoneWarn(z, tm, ring);
    else {
      const k = Math.max(0, z.blast / 0.25);
      ctx.fillStyle = alpha(ZONE.blast, k * 0.65);
      zonePath(z, z.shape === 1 || z.shape === 5 ? 1 : 1 + (1 - k) * 0.12);
      ctx.fill(zoneRule(z));
    }
  }

  if (persistent.length) drawZonesActive(persistent, tm);

  for (const z of list) drawZoneFlow(z, tm);
}
const ZONE_PUNCH = 0.3;
function warnRamp(k, warn) {
  const doux = k * k * 0.55;
  if (warn > ZONE_PUNCH) return doux;
  return doux + (1 - warn / ZONE_PUNCH) * 0.45;
}
function drawZoneWarn(z, tm, ring) {
  const k = 1 - z.warn / (z.warn0 || CFG.ZONE_WARN);
  const imminent = z.warn < 0.35;
  const punch = warnRamp(k, z.warn);

  if (z.warn <= ZONE_PUNCH && particles.length < PARTICLE_MAX && Math.random() < 0.35) {
    const rad = Math.max(8, z.r || 40);
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * rad;
    particles.push({
      x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d,
      vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 40,
      lift: 90, life: 0.45, max: 0.45, col: ZONE.imminent, size: 4.5,
      frame: fxGlow,
    });
  }

  if (z.prox) {
    const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, Math.max(1, z.r));
    g.addColorStop(0, alpha(ZONE.imminent, 0.10 + punch * 0.30));
    g.addColorStop(1, alpha(ZONE.imminent, 0.02 + punch * 0.05));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = alpha(BOSS.skin, 0.03 + punch * 0.13);
  }
  zonePath(z);
  ctx.fill(zoneRule(z));

  drawZoneCracks(z, k, punch);

  ctx.strokeStyle = imminent ? BOSS.barWarn : BOSS.skin;
  ctx.globalAlpha = 0.5 + k * 0.5;
  ctx.lineWidth = imminent ? 3 : 2;
  ctx.setLineDash(imminent ? [] : [7, 6]);
  ctx.lineDashOffset = imminent ? 0 : -tm * 26;
  zonePath(z);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.globalAlpha = 1;

  if (ring) {
    ctx.strokeStyle = imminent ? BOSS.barWarn : BOSS.barRing;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(z.x, z.y, 15, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    ctx.stroke();
  }

  if (z.blast > 0) {
    ctx.fillStyle = alpha(ZONE.blast, Math.max(0, z.blast / 0.25) * 0.5);
    zonePath(z);
    ctx.fill(zoneRule(z));
  }
}
function drawZonesActive(list, tm) {
  const tick = CFG.ZONE_TICK || 0.25;
  const ph = (tm % tick) / tick;
  const pulse = 0.88 + 0.12 * Math.max(0, 1 - ph * 2.5);

  for (const z of list) {
    if (zoneFx >= ZONE_FX_MAX || particles.length >= PARTICLE_MAX) break;
    if (Math.random() < 0.55) {
      const pt = zoneRandomPoint(z);
      particles.push({
        x: pt.x, y: pt.y,
        vx: (Math.random() - 0.5) * 12, vy: -14 - Math.random() * 18,
        lift: 26, life: 0.9 + Math.random() * 0.5, max: 1.4,
        col: ZONE.blast, size: 4, zfx: 1, frame: fxGlow,
      });
      setZoneFx(zoneFx + 1);
    }
    if (Math.random() < 0.16 && zoneFx < ZONE_FX_MAX && particles.length < PARTICLE_MAX) {
      const pt = zoneRandomPoint(z);
      particles.push({
        x: pt.x, y: pt.y,
        vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 10,
        lift: 14, life: 1.6 + Math.random() * 0.6, max: 2.2,
        col: SURFACE.line, size: 10 + Math.random() * 5, zfx: 1,
        frame: fxGlow, grow: 9,
      });
      setZoneFx(zoneFx + 1);
    }
  }

  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1.05);
  ctx.fillStyle = alpha(ZONE.edge, 0.34 * pulse);
  ctx.fill("nonzero");

  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1);
  ctx.fillStyle = alpha(ZONE.fill, 0.45 * pulse);
  ctx.fill("nonzero");

  ctx.save();
  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1);
  ctx.clip("nonzero");
  ctx.strokeStyle = alpha(ZONE.persist, 0.22);
  ctx.lineWidth = 3;
  const pas = 14;
  const off = (tm * 22) % pas;
  const hx0 = camera.x0, hy0 = camera.y0;
  const hx1 = hx0 + CFG.VIEW_W, hy1 = hy0 + CFG.VIEW_H;
  const dia = CFG.VIEW_H;
  ctx.beginPath();
  const base = Math.floor((hx0 - dia - hy0) / pas) * pas;
  for (let t = base; t + hy0 < hx1; t += pas) {
    ctx.moveTo(t + off + hy0, hy0);
    ctx.lineTo(t + off + hy0 + dia, hy1);
  }
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1.05);
  ctx.strokeStyle = alpha(ZONE.persist, 0.55 * pulse);
  ctx.lineWidth = 2;
  ctx.stroke();

  const dying = list.filter(z => z.life > 0 && z.life < 3);
  if (dying.length && Math.sin(tm * 12) > 0) {
    ctx.beginPath();
    for (const z of dying) zoneSubPath(z, 1.05);
    ctx.fillStyle = alpha(ZONE.dying, 0.16);
    ctx.fill("nonzero");
  }
}
export function drawTurrets(list) {
  const col = POWERUP_STYLE.turret.color;
  for (const t of list) {
    const fading = t.k < 0.25;
    const blink = fading ? 0.35 + 0.65 * Math.abs(Math.sin(performance.now() / 110)) : 1;

    ctx.globalAlpha = 0.13 * blink;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.arc(t.x, t.y, CFG.TURRET_RANGE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.globalAlpha = blink;

    ctx.fillStyle = alpha(SURFACE.void, 0.85);
    ctx.beginPath(); ctx.arc(0, 0, CFG.TURRET_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.rotate(t.ang ?? 0);
    ctx.fillStyle = col;
    ctx.fillRect(2, -2.5, CFG.TURRET_RADIUS + 5, 5);
    ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.75 * blink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, CFG.TURRET_RADIUS + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t.k);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
const DRONE_COLOR = { 0: OWNED.droneAtk, 1: OWNED.droneSwarm };
export function drawDrones(list) {
  for (const d of list) {
    const col = ownerColorOf(d.owner) ?? DRONE_COLOR[d.kind] ?? OWNED.orphan;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.ang ?? 0);

    if (d.kind === 1) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(7, 0); ctx.lineTo(-4, -3.4); ctx.lineTo(-1.2, 0); ctx.lineTo(-4, 3.4);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = alpha(SURFACE.void, 0.85);
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(0, -6); ctx.lineTo(-8, 0); ctx.lineTo(0, 6);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
const BLAST_TINT = {
  0:  [FX.nova, FX.novaSoft],
  7:  [FX.blastFill, FX.blastEdge],
  8:  [FX.waveSoft, FX.wave],
  12: [FX.bombFill, FX.bombEdge],
};
export function drawEffects(effects) {
  for (const f of effects) {
    const grow = 1 - f.k;

    if (f.kind === 1) {
      ctx.fillStyle = alpha(FX.veil, f.k * 0.16);
      ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);

      ctx.strokeStyle = alpha(FX.flash, f.k * 0.85);
      ctx.lineWidth = 14 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(BOSS.skin, f.k * 0.8);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.86, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 3) {
      ctx.globalAlpha = f.k;
      drawArc(`r${f.id}`, f.x, f.y, f.x2, f.y2, {
        col: FX.ricochet, coeur: FX.ricochetCore, amp: 0.09, width: 2.2,
        branches: 2, cut: 0.45,
      });
      ctx.globalAlpha = 1;
      continue;
    }

    if (f.kind === 13) {
      ctx.globalAlpha = f.k;
      drawArc(`s${f.id}`, f.x2, f.y2, f.x, f.y, {
        col: CLASS_COLOR.dps, coeur: FX.levelSoft, amp: 0.04, width: 1.9,
        branches: 1, cut: 0.2,
      });
      ctx.globalAlpha = 1;

      const s = 6 + 6 * f.k;
      ctx.strokeStyle = alpha(CLASS_COLOR.dps, f.k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - s);
      ctx.lineTo(f.x + s, f.y);
      ctx.lineTo(f.x, f.y + s);
      ctx.lineTo(f.x - s, f.y);
      ctx.closePath();
      ctx.stroke();
      continue;
    }

    if (f.kind === 14) {
      ctx.strokeStyle = alpha(ENEMY_TINT[6], f.k);
      ctx.lineWidth = 3 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.35 + grow * 0.65), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 4) {
      ctx.strokeStyle = alpha(FX.heal, f.k * 0.95);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.2 + grow * 0.8), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(FX.healSoft, f.k * 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1 - grow * 0.75), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 5) {
      ctx.strokeStyle = alpha(FX.elite, f.k * 0.9);
      ctx.lineWidth = 3 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.2 + grow * 0.8), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 6) {
      ctx.fillStyle = alpha(FX.veil, f.k * 0.12);
      ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);

      ctx.strokeStyle = alpha(FX.elite, f.k * 0.95);
      ctx.lineWidth = 12 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(BOSS.skin, f.k * 0.8);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    // [10] LES QUATRE SOUFFLES NAISSENT A LEUR TAILLE MAXIMALE. Un disque qui
    // grandit fait « animation » ; une detonation fait « matiere ». La croissance
    // appartient a la seule onde de choc, qui DEPASSE le remplissage
    // (`bursts`, dans fx.js), et les couches chaudes aux particules.
    const B = BLAST_TINT[f.kind];
    if (B) {
      ctx.fillStyle = alpha(B[0], f.k * f.k * 0.34);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = alpha(B[1], f.k * 0.8);
      ctx.lineWidth = 5 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1 - 0.06 * (1 - f.k)), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 9) {
      ctx.strokeStyle = alpha(CLASS_COLOR.tank, f.k * 0.9);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1.35 - grow * 0.35), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 10) {
      ctx.strokeStyle = alpha(CLASS_COLOR.tank, f.k * 0.75);
      ctx.lineWidth = 8 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(FX.flash, f.k * 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 11) {
      ctx.fillStyle = alpha(FX.heal, f.k * 0.10);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = alpha(FX.heal, f.k * 0.9);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 14) {
      ctx.strokeStyle = alpha(HARVEST_GOLD, f.k * 0.9);
      ctx.lineWidth = 4 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.2 + grow * 0.8), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 2) {
      ctx.strokeStyle = alpha(FX.level, f.k * 0.9);
      ctx.lineWidth = 4 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.15 + grow * 0.85), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(FX.levelSoft, f.k * 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.15 + grow * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    ctx.strokeStyle = alpha(FX.nova, f.k * 0.9);
    ctx.lineWidth = 6 * f.k + 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * (0.25 + grow * 0.75), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = alpha(FX.novaSoft, f.k * 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * (0.25 + grow * 0.62), 0, Math.PI * 2);
    ctx.stroke();
  }
}
export function drawBulwarks(list) {
  for (const b of list) {
    const opacite = 0.35 + b.k * 0.45;
    ctx.fillStyle = alpha(CLASS_COLOR.tank, 0.05 + b.k * 0.04);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = alpha(CLASS_COLOR.tank, opacite);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = alpha(OWNED.bulwarkArc, 0.85);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.k);
    ctx.stroke();
  }
}
export function drawAnchors(list) {
  for (const an of list) {
    ctx.fillStyle = alpha(CLASS_COLOR.tank, 0.04 + an.k * 0.04);
    ctx.beginPath(); ctx.arc(an.x, an.y, an.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.30 + an.k * 0.45);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(an.x, an.y, an.r, 0, Math.PI * 2); ctx.stroke();

    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(an.x, an.y, an.r * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.7);
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(an.x + Math.cos(a) * an.r, an.y + Math.sin(a) * an.r);
      ctx.lineTo(an.x + Math.cos(a) * (an.r - 10), an.y + Math.sin(a) * (an.r - 10));
      ctx.stroke();
    }

    ctx.strokeStyle = alpha(OWNED.bulwarkArc, 0.85);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(an.x, an.y, an.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * an.k);
    ctx.stroke();
  }
}
const SANCT_MOTES = 7;
const SANCT_RISE = 2.6;
export function drawSancts(list) {
  const t = performance.now() / 1000;
  for (const sa of list) {
    ctx.fillStyle = alpha(FX.heal, 0.05 + sa.k * 0.04);
    ctx.beginPath(); ctx.arc(sa.x, sa.y, sa.r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = alpha(FX.heal, 0.35 + sa.k * 0.45);
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sa.x, sa.y, sa.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = alpha(FX.heal, 0.18);
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(sa.x, sa.y, sa.r - 5, 0, Math.PI * 2); ctx.stroke();

    for (let i = 0; i < SANCT_MOTES; i++) {
      const ph = ((t / SANCT_RISE) + i / SANCT_MOTES + sa.id * 0.137) % 1;
      const dy = sa.r * (0.7 - ph * 1.4);
      const lim = Math.sqrt(Math.max(0, sa.r * sa.r - dy * dy)) * 0.78;
      const dx = Math.cos(sa.id * 1.7 + i * 2.399963 + Math.sin(t * 0.6 + i) * 0.35) * lim;
      const a = Math.sin(ph * Math.PI);
      paintIcon(ctx, POWERUP_ICON.heal, FX.heal,
        sa.x + dx, sa.y + dy, 0.42, a * 0.55 * (0.4 + sa.k * 0.6));
    }

    ctx.strokeStyle = alpha(OWNED.bulwarkArc, 0.85);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(sa.x, sa.y, sa.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sa.k);
    ctx.stroke();
  }
}
export function drawBombs(list) {
  for (const b of list) {
    const k = 1 - b.k;
    const r = SKILL_CFG.DPS_BOMB_RADIUS;

    ctx.fillStyle = alpha(OWNED.bomb, 0.05 + k * 0.10);
    ctx.beginPath(); ctx.arc(b.tx, b.ty, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(OWNED.bomb, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(b.tx, b.ty, r, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = OWNED.bomb;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.tx, b.ty, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.stroke();

    ctx.fillStyle = OWNED.bomb;
    ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
  }
}
const BOMB_RANGE_SHOW_MS = 2000;
export function drawBombRange(x, y) {
  const age = performance.now() - bombReadyAt;
  if (age > BOMB_RANGE_SHOW_MS) return;
  const fade = 1 - age / BOMB_RANGE_SHOW_MS;

  ctx.strokeStyle = alpha(OWNED.bomb, 0.30 * fade);
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(x, y, SKILL_CFG.DPS_BOMB_RANGE_MAX, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}
export function drawPowerups(list) {
  const now = performance.now();
  for (const w of list) {
    if (!inView(w.x, w.y, 60)) continue;
    const st = POWERUP_STYLE[POWERUP_TYPES[w.type]] ?? POWERUP_STYLE.heal;
    const r = CFG.POWERUP_RADIUS;
    const pulse = 1 + Math.sin(now / 260 + w.id) * 0.1;
    const bob = Math.sin(now / 520 + w.id * 1.7) * 1.6;
    const y = w.y + bob;

    ctx.strokeStyle = st.color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(w.x, y, r * 1.9 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = alpha(SURFACE.shadow, 0.28);
    ctx.beginPath();
    ctx.ellipse(w.x, w.y + r * 0.95, r * 0.62, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = alpha(SURFACE.void, 0.82);
    ctx.beginPath(); ctx.arc(w.x, y, r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    paintPowerupIcon(st, w.x, y, (r / 8.6) * pulse);
  }
}
const HARVEST_GOLD = RARITY_COLOR[3];
export function drawHarvests(list) {
  if (list.length === 0) return;
  const now = performance.now();
  for (const h of list) {
    if (!inView(h.x, h.y, 120)) continue;
    const pulse = 0.5 + 0.5 * Math.sin(now / 300 + h.id);

    ctx.strokeStyle = HARVEST_GOLD;
    ctx.globalAlpha = 0.14 + pulse * 0.18;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const hr = 30 + pulse * 6;
    ctx.moveTo(h.x, h.y - hr); ctx.lineTo(h.x + hr, h.y);
    ctx.lineTo(h.x, h.y + hr); ctx.lineTo(h.x - hr, h.y);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (h.kind === 0) {
      const r = 14;
      ctx.fillStyle = alpha(HARVEST_GOLD, 0.25 + 0.55 * h.k);
      ctx.strokeStyle = HARVEST_GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - r); ctx.lineTo(h.x + r * 0.7, h.y);
      ctx.lineTo(h.x, h.y + r); ctx.lineTo(h.x - r * 0.7, h.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (h.k < 1) {
        ctx.fillStyle = alpha(SURFACE.shadow, 0.45);
        ctx.fillRect(h.x - r, h.y - r - 9, r * 2, 3);
        ctx.fillStyle = HARVEST_GOLD;
        ctx.fillRect(h.x - r, h.y - r - 9, r * 2 * h.k, 3);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const a = i * (Math.PI * 2 / 3) + 0.6;
        const cx2 = h.x + Math.cos(a) * 9, cy2 = h.y + Math.sin(a) * 9;
        const r = 6;
        ctx.fillStyle = alpha(HARVEST_GOLD, 0.6);
        ctx.beginPath();
        ctx.moveTo(cx2, cy2 - r); ctx.lineTo(cx2 + r * 0.7, cy2);
        ctx.lineTo(cx2, cy2 + r); ctx.lineTo(cx2 - r * 0.7, cy2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = alpha(HARVEST_GOLD, 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, h.y, CFG.HARVEST_CHANNEL_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      if (h.k > 0) {
        ctx.strokeStyle = HARVEST_GOLD;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(h.x, h.y, CFG.HARVEST_CHANNEL_RADIUS, -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * Math.min(1, h.k));
        ctx.stroke();
      }
    }
  }
}
// ============================ L'ARC ============================
// Une seule fonction pour tout ce qui RELIE deux points : ricochet, salve, lien
// du soigneur, lien du medic ennemi. Quatre regles, et aucune n'est facultative.
//
//  - deplacement de POINT MILIEU, amplitude divisee a chaque niveau : une
//    amplitude constante donne du bruit, pas un arc ;
//  - DOUBLE COUCHE additive, coeur clair fin + halo large a faible alpha. C'est
//    ce doublage, et rien d'autre, qui separe « une ligne bleue » de « de
//    l'electricite » — la surexposition au centre est la signature de tout ce
//    qui est tres lumineux ;
//  - une ou deux BRANCHES MORTES qui ne menent nulle part. Un arc sans branche
//    ressemble a un laser ;
//  - regeneration entre 15 et 20 Hz. A 60 Hz c'est un scintillement illisible,
//    et un trace fige parait mort.
const ARC_HZ = 17;
const ARC_CACHE_MAX = 320;
const arcCache = new Map();
let arcSeed = 1;

function arcBuild(x0, y0, x1, y1, o) {
  const rnd = mulberry32((arcSeed = (arcSeed * 1664525 + 1013904223) >>> 0));
  const dx = x1 - x0, dy = y1 - y0;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d, ny = dx / d;

  let pts = [[0, 0], [1, 0]];
  let amp = o.amp;
  for (let lvl = 0; lvl < 3; lvl++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (rnd() - 0.5) * amp]);
      out.push(b);
    }
    pts = out;
    amp *= 0.5;
  }

  const abs = pts.map(([k, w]) => {
    const att = o.pinch ? Math.sin(k * Math.PI) : 1;
    return [x0 + dx * k + nx * w * d * att, y0 + dy * k + ny * w * d * att];
  });

  const branches = [];
  const nb = o.branches;
  for (let i = 0; i < nb; i++) {
    const at = 1 + Math.floor(rnd() * (abs.length - 2));
    const a0 = Math.atan2(dy, dx) + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.8);
    const seg = [abs[at]];
    let px = abs[at][0], py = abs[at][1], ang = a0;
    for (let s = 0; s < 3; s++) {
      const len = d * (0.05 + rnd() * 0.09);
      ang += (rnd() - 0.5) * 0.9;
      px += Math.cos(ang) * len; py += Math.sin(ang) * len;
      seg.push([px, py]);
    }
    branches.push(seg);
  }

  const cut = o.cut > 0 && rnd() < o.cut
    ? 1 + Math.floor(rnd() * (abs.length - 3))
    : -1;

  return { abs, branches, cut, at: performance.now() };
}

function arcTrace(pts, saut) {
  ctx.beginPath();
  let pose = false;
  for (let i = 0; i < pts.length; i++) {
    if (i === saut) { pose = false; continue; }
    if (!pose) { ctx.moveTo(pts[i][0], pts[i][1]); pose = true; }
    else ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.stroke();
}

export function drawArc(key, x0, y0, x1, y1, {
  col, coeur, amp = 0.06, width = 1.8, branches = 1, cut = 0, pinch = true,
} = {}) {
  const now = performance.now();
  let a = arcCache.get(key);
  if (!a || now - a.at > 1000 / ARC_HZ) {
    if (arcCache.size > ARC_CACHE_MAX) arcCache.clear();
    a = arcBuild(x0, y0, x1, y1, { amp, branches, cut, pinch });
    arcCache.set(key, a);
  } else {
    // la geometrie tient 55 ms, mais ses extremites suivent leurs porteurs
    const p = a.abs, n = p.length - 1;
    const ox = p[0][0], oy = p[0][1], ex = p[n][0], ey = p[n][1];
    if (ox !== x0 || oy !== y0 || ex !== x1 || ey !== y1) {
      a = arcBuild(x0, y0, x1, y1, { amp, branches, cut, pinch });
      arcCache.set(key, a);
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.strokeStyle = alpha(col, 0.20);
  ctx.lineWidth = width * 3.6;
  arcTrace(a.abs, a.cut);

  for (const b of a.branches) {
    ctx.strokeStyle = alpha(col, 0.14);
    ctx.lineWidth = width * 1.6;
    arcTrace(b, -1);
    ctx.strokeStyle = alpha(coeur, 0.35);
    ctx.lineWidth = width * 0.6;
    arcTrace(b, -1);
  }

  ctx.strokeStyle = alpha(coeur, 0.92);
  ctx.lineWidth = width;
  arcTrace(a.abs, a.cut);

  // les deux points brillants ANCRENT l'arc sur ce qu'il relie
  ctx.fillStyle = alpha(coeur, 0.9);
  for (const [px, py] of [[x0, y0], [x1, y1]]) {
    ctx.beginPath();
    ctx.arc(px, py, width * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const BREATH_HZ = 1.2;
export const shooterFire = new Map();
export const seenShots = new Set();
export function trackShooters(v) {
  for (const s of v.shotList) {
    if (seenShots.has(s.id)) continue;
    seenShots.add(s.id);
    let best = 40 * 40, who = 0;
    for (const e of v.enemyList) {
      if (e.type !== 3) continue;
      const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2;
      if (d < best) { best = d; who = e.id; }
    }
    if (who) shooterFire.set(who, performance.now());
  }
  if (seenShots.size > 600) {
    seenShots.clear();
    for (const s of v.shotList) seenShots.add(s.id);
  }
}
const SHOOTER_AIM = 400;
const SHOOTER_RECOIL = 160;
function enemyFrame(e, t, def, ctxInfo) {
  const base = `e${e.type}_`;

  if (e.type === 4 && e.hp / e.maxHp < 0.12) return frameOf(base + "open");

  if (e.type === 5 && e.hp / e.maxHp < 0.4) return frameOf(base + "open");

  if (e.type === 6 && ctxInfo?.blocked) return frameOf(base + "open");

  if (e.type === 8 && ctxInfo?.covering) return frameOf(base + "open");

  if (e.type === 3) {
    const last = shooterFire.get(e.id);
    if (last !== undefined) {
      const since = performance.now() - last;
      if (since < SHOOTER_RECOIL) return frameOf(base + "open");
      const untilNext = def.shootCd * 1000 - since;
      if (untilNext > 0 && untilNext < SHOOTER_AIM) {
        return frameOf(base + "walkB");
      }
    }
    return frameOf(base + "idle");
  }

  const step = Math.floor(t * def.speed / 90) & 1;
  return frameOf(base + (step ? "walkA" : "walkB"));
}
const auraCovered = new Set();
const auraActive = new Set();
function auraPass(list, diff) {
  auraCovered.clear();
  auraActive.clear();
  const src = [];
  for (const e of list) {
    const def = ENEMY_TYPES[e.type];
    if (!def) continue;
    if (def.auraRadius) src.push({ e, r: def.auraRadius });
    else if (hasTrait(traitsOf(diff, e.type), TRAIT_AURA)) {
      src.push({ e, r: TRAIT_CFG.AURA_RADIUS });
    }
  }
  if (src.length === 0) return;
  for (const s of src) {
    const r2 = s.r * s.r;
    for (const e of list) {
      if (e === s.e) continue;
      if ((e.x - s.e.x) ** 2 + (e.y - s.e.y) ** 2 > r2) continue;
      auraCovered.add(e.id);
      auraActive.add(s.e.id);
    }
  }
}
// Deux jeux de parametres pour LA MEME fonction de trace, et c'est ce qui rend
// les deux modes distinguables d'un coup d'oeil par un allie a l'autre bout de
// l'ecran : le soin est chaud et CALME (peu de gigue, aucune coupure), le
// siphon est froid et AGITE (forte gigue, branches mortes, coupures).
export function drawSoinLinks(links, players, enemies) {
  if (!links || links.length === 0) return;
  let par = null;
  for (const [src, cible, ennemi] of links) {
    if (par === null) {
      par = new Map();
      for (const p of players) par.set(p.id, p);
    }
    const a = par.get(src);
    if (!a) continue;
    const b = ennemi ? enemies.find(e => e.id === cible) : par.get(cible);
    if (!b) continue;
    if (!inView(a.x, a.y, 200) && !inView(b.x, b.y, 200)) continue;
    drawArc(`h${src}:${cible}`, a.x, a.y, b.x, b.y, ennemi
      ? { col: SIGNAL.persist, coeur: FX.ricochetCore, amp: 0.14, width: 2,
          branches: 2, cut: 0.55 }
      : { col: FX.heal, coeur: FX.healSoft, amp: 0.035, width: 2.4,
          branches: 0, cut: 0 });
  }
}

function drawMedicLinks(list) {
  for (const m of list) {
    if (m.type !== 7) continue;
    if (hits.has(m.id)) continue;
    const def = ENEMY_TYPES[7];
    let best = null, bd = def.healRange * def.healRange;
    for (const o of list) {
      if (o === m || o.hp >= o.maxHp) continue;
      const d2 = (o.x - m.x) ** 2 + (o.y - m.y) ** 2;
      if (d2 < bd) { bd = d2; best = o; }
    }
    if (!best) continue;
    if (!inView(m.x, m.y, 200) && !inView(best.x, best.y, 200)) continue;
    const ca = Math.cos(m.ang ?? 0), sa = Math.sin(m.ang ?? 0);
    const ox = m.x + 8.5 * ca - (-21) * sa;
    const oy = m.y + 8.5 * sa + (-21) * ca;
    drawArc(`m${m.id}`, ox, oy, best.x, best.y, {
      col: ENEMY_TINT[7], coeur: FX.healSoft, amp: 0.05, width: 1.6,
      branches: 1, cut: 0.3,
    });
  }
}
export function drawEnemies(list, view) {
  const t = performance.now();
  const ts = t / 1000;
  const diff = view?.diff ?? difficulty;
  const windup = view?.windup ?? EMPTY_SET;
  auraPass(list, diff);
  drawMedicLinks(list);
  const me = view?.playerList?.find(p => p.id === myId);

  for (const e of list) {
    if (!inView(e.x, e.y)) continue;
    const def = ENEMY_TYPES[e.type] ?? ENEMY_TYPES[0];
    const r = e.elite ? def.r * CFG.ELITE_RADIUS_MUL : def.r;

    const hit = hits.get(e.id);
    const flash = hit ? Math.max(0, (hit.until - t) / (HIT_FLASH * 1000)) : 0;
    const kx = flash > 0 ? hit.dx * HIT_KICK * flash : 0;
    const ky = flash > 0 ? hit.dy * HIT_KICK * flash : 0;
    // [26c] ×1,15 sur deux ou trois images, retour elastique : la reponse est
    // portee par la CIBLE et non par la camera.
    const punch = hit && hit.punch > t
      ? 1 + 0.15 * Math.min(1, (hit.punch - t) / (CRIT_PUNCH * 1000))
      : 1;

    if (e.elite) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 240 + e.id);
      ctx.strokeStyle = ELITE_GOLD;
      ctx.globalAlpha = 0.3 + pulse * 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r + 6 + pulse * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    let breath = 1 + 0.03 * Math.sin(ts * BREATH_HZ * Math.PI * 2 + e.id * 1.7);
    let squash = flash > 0 ? 0.12 * flash : 0;

    if (auraCovered.has(e.id)) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 380 + e.id);
      ctx.strokeStyle = ENEMY_TINT[8];
      ctx.globalAlpha = 0.3 + pulse * 0.25;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r + 10, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (windup.has(e.id)) {
      const gather = 0.55 + 0.45 * Math.sin(t / 60);
      squash = 0;
      breath *= 1 + 0.06 * gather;
    }

    if (e.type === 5) {
      const ready = 1 - Math.min(1, e.hp / Math.max(1, e.maxHp));
      breath *= 1 + 0.09 * ready * (0.5 + 0.5 * Math.sin(t / (140 - ready * 95)));
    }

    let gain = (e.elite ? CFG.ELITE_RADIUS_MUL : 1) * breath;
    if (def.blastRadius) {
      const worn = 1 - Math.max(0, e.hp / e.maxHp);
      gain *= 1 + worn * 0.14 * (0.5 + 0.5 * Math.sin(t / (90 - worn * 50) + e.id));
    }

    let blocked = false;
    if (e.type === 6 && me) {
      let off = Math.atan2(me.y - e.y, me.x - e.x) - (e.ang ?? 0);
      while (off > Math.PI) off -= Math.PI * 2;
      while (off < -Math.PI) off += Math.PI * 2;
      blocked = Math.abs(off) <= (def.shieldArc * Math.PI) / 360;
    }

    drawSprite(ctx, enemyFrame(e, ts, def, { blocked, covering: auraActive.has(e.id) }),
      e.x + kx, e.y + ky, {
      angle: e.ang ?? 0,
      scaleX: gain * punch * (1 + squash * 0.5) * (windup.has(e.id) ? 0.86 : 1),
      scaleY: gain * punch * (1 - squash) * (windup.has(e.id) ? 1.14 : 1),
      flash,
      flashTint: hit?.col ?? null,
    });

    if (e.hp < e.maxHp) {
      const w = r * 2;
      const tx = e.x - r, ty = e.y - r - 9;
      ctx.fillStyle = alpha(SURFACE.shadow, 0.45);
      ctx.fillRect(tx, ty, w, 3);
      ctx.fillStyle = e.elite ? ELITE_GOLD : (ENEMY_TINT[e.type] ?? ENEMY_TINT[0]);
      ctx.fillRect(tx, ty, w * (e.hp / e.maxHp), 3);
    }
  }
}
