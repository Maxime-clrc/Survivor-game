
import { BIOME_CFG, CFG, HZ_EMBER, HZ_GEYSER, HZ_SLIP, HZ_SLOW, WX_BOURRASQUE, WX_BRUME, WX_CENDRES, biomeAt, hazardState, windAt } from "/shared/game_state.js";
import { BIOME, BOSS, SURFACE, WALL, WEATHER, ZONE, alpha } from "/shared/palette.js";
import { difficulty } from "../core/state.js";
import { drawGridPings } from "./fx.js";
import { floorPattern } from "./material.js";
import { GRID_FINE, GRID_MAJOR, biomeIndex, biomeSeed, camera, ctx, decor, hazardsActifs, obstaclesActifs, renderScale, setVignette, sol, vignette, weather } from "./stage.js";

export function drawFloor() {
  const p = floorPattern(ctx, biomeIndex, difficulty, biomeSeed, renderScale);
  if (!p) return;
  ctx.fillStyle = p;
  ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
}

export function drawGrid() {
  const vx0 = camera.x0, vx1 = camera.x0 + CFG.VIEW_W;
  const vy0 = camera.y0, vy1 = camera.y0 + CFG.VIEW_H;
  const lines = (step) => {
    ctx.beginPath();
    for (let x = Math.max(step, Math.ceil(vx0 / step) * step); x < Math.min(CFG.ARENA_W, vx1 + step); x += step) {
      ctx.moveTo(x + .5, vy0); ctx.lineTo(x + .5, vy1);
    }
    for (let y = Math.max(step, Math.ceil(vy0 / step) * step); y < Math.min(CFG.ARENA_H, vy1 + step); y += step) {
      ctx.moveTo(vx0, y + .5); ctx.lineTo(vx1, y + .5);
    }
    ctx.stroke();
  };
  ctx.lineWidth = 1;

  const skip = decor.skip;
  ctx.strokeStyle = sol.gridFine;
  ctx.beginPath();
  let n = 0;
  for (let x = GRID_FINE; x < CFG.ARENA_W; x += GRID_FINE, n++) {
    if (skip && n % skip === 1) continue;
    ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, CFG.ARENA_H);
  }
  n = 0;
  for (let y = GRID_FINE; y < CFG.ARENA_H; y += GRID_FINE, n++) {
    if (skip && n % skip === 2) continue;
    ctx.moveTo(0, y + .5); ctx.lineTo(CFG.ARENA_W, y + .5);
  }
  ctx.stroke();

  ctx.strokeStyle = sol.gridMajor;
  ctx.beginPath();
  for (let x = GRID_MAJOR; x < CFG.ARENA_W; x += GRID_MAJOR) {
    ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, CFG.ARENA_H);
  }
  for (let y = GRID_MAJOR; y < CFG.ARENA_H; y += GRID_MAJOR) {
    ctx.moveTo(0, y + .5); ctx.lineTo(CFG.ARENA_W, y + .5);
  }
  ctx.stroke();

  drawGridPings();
}
export function drawVignette() {
  const puls = decor.pulse > 0
    ? 1 + decor.pulse * Math.sin(performance.now() / 2600)
    : 1;
  const fog = weather?.id === WX_BRUME;
  if (!vignette || decor.pulse > 0 || fog) {
    const r = Math.hypot(CFG.VIEW_W, CFG.VIEW_H) / 2;
    const from = Math.max(0, decor.vignetteFrom + (fog ? BIOME_CFG.FOG_FROM : 0));
    const amt = decor.vignette * puls * (fog ? BIOME_CFG.FOG_VIGNETTE : 1);
    setVignette(ctx.createRadialGradient(
      CFG.VIEW_W / 2, CFG.VIEW_H / 2, r * Math.min(0.9, from),
      CFG.VIEW_W / 2, CFG.VIEW_H / 2, r));
    vignette.addColorStop(0, alpha(SURFACE.void, 0));
    vignette.addColorStop(1, alpha(SURFACE.void, Math.min(1, amt)));
  }
  ctx.save();
  ctx.translate(camera.x0, camera.y0);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.restore();
}
export function drawArenaBounds(b) {
  if (!b) return;
  const full = b.x0 <= 0 && b.y0 <= 0 && b.x1 >= CFG.ARENA_W && b.y1 >= CFG.ARENA_H;

  if (!full) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
    ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.fillStyle = alpha(SURFACE.void, 0.72);
    ctx.fill("evenodd");
    ctx.restore();

    ctx.strokeStyle = alpha(ZONE.edge, 0.75);
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x0 + 1.5, b.y0 + 1.5, b.x1 - b.x0 - 3, b.y1 - b.y0 - 3);
  }

  if (b.warn > 0) {
    ctx.strokeStyle = BOSS.barWarn;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(b.nx0, b.ny0, b.nx1 - b.nx0, b.ny1 - b.ny0);
    ctx.setLineDash([]);
  }
}
const OBST_RELIEF = 7;
const OBST_OMBRE = 9;

function silhouette(g, o, biome) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const c = Math.min(9, w * 0.22, h * 0.22);
  g.beginPath();
  if (biome === "fonderie") {
    g.moveTo(x + c, y); g.lineTo(x + w - c, y);
    g.lineTo(x + w, y + c); g.lineTo(x + w, y + h - c);
    g.lineTo(x + w - c, y + h); g.lineTo(x + c, y + h);
    g.lineTo(x, y + h - c); g.lineTo(x, y + c);
  } else if (biome === "friche") {
    const e = Math.min(11, w * 0.26, h * 0.26);
    const pair = ((o.x + o.y) | 0) % 2 === 0;
    g.moveTo(x + (pair ? e : 0), y);
    g.lineTo(x + w, y);
    g.lineTo(x + w, y + h - (pair ? 0 : e));
    g.lineTo(x + w - (pair ? 0 : e), y + h);
    g.lineTo(x, y + h);
    g.lineTo(x, y + (pair ? e : 0));
  } else {
    g.moveTo(x + c, y); g.lineTo(x + w, y);
    g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.lineTo(x, y + c);
  }
  g.closePath();
}

export function drawObstacles(cover) {
  const list = obstaclesActifs();
  if (!list.length) return;
  const biome = biomeAt(biomeIndex).key;
  const ox = camera.x0 + CFG.VIEW_W / 2, oy = camera.y0 + CFG.VIEW_H / 2;

  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    const k = o.maxHp > 0 ? (cover?.find(c => c[0] === i)?.[1] ?? 1) : 1;
    if (o.maxHp > 0 && k <= 0) continue;

    const dx = o.x - ox, dy = o.y - oy;
    const d = Math.hypot(dx, dy) || 1;
    const rx = (dx / d) * OBST_RELIEF, ry = (dy / d) * OBST_RELIEF;

    ctx.save();
    ctx.translate(o.x + OBST_OMBRE * 0.6, o.y + OBST_OMBRE * 0.7);
    silhouette(ctx, o, biome);
    ctx.fillStyle = alpha("#000000", 0.34);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(o.x + rx, o.y + ry);
    silhouette(ctx, o, biome);
    ctx.fillStyle = o.maxHp > 0 ? BIOME.cover : BIOME.block;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(o.x, o.y);
    silhouette(ctx, o, biome);
    ctx.fillStyle = alpha(o.maxHp > 0 ? BIOME.cover : BIOME.block, 0.55);
    ctx.fill();
    ctx.strokeStyle = alpha(o.maxHp > 0 ? BIOME.coverEdge : BIOME.blockEdge, 0.45);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(o.x + rx, o.y + ry);
    silhouette(ctx, o, biome);
    ctx.strokeStyle = alpha(o.maxHp > 0 ? BIOME.coverEdge : BIOME.blockEdge, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (o.maxHp > 0) {
      ctx.save();
      ctx.translate(o.x + rx, o.y + ry);
      silhouette(ctx, o, biome);
      ctx.strokeStyle = alpha(BIOME.coverEdge, 0.85);
      ctx.lineWidth = 2;
      ctx.setLineDash([Math.max(3, 14 * k), 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}
// UN CHAMP DE PARTICULES SANS PARTICULES : la position d'un brin est une
// fonction de son indice et du temps, donc rien ne s'alloue, rien ne se garde
// entre deux images, et deux clients voient la meme chose. Un seul `stroke`
// pour tout le champ.
// le champ couvre un DISQUE (il tourne avec le vent) et la vue en prend un peu
// moins de la moitie : mesure, 220 brins en laissent une bonne quatre-vingtaine
// a l'ecran.
const CHAMP_MAX = 220;
function h01(i) {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
function enroule(v, centre, demi) {
  const p = 2 * demi;
  let d = (v - centre + demi) % p;
  if (d < 0) d += p;
  return centre + d - demi;
}
// le champ est ancre au MONDE et non a la camera : sinon il glisse avec le
// joueur, et le vent parait accroche a lui au lieu de traverser l'arene.
function champ(tm, ang, vitesse, longueur, nombre, couleur, opacite, epaisseur) {
  const demi = Math.hypot(CFG.VIEW_W, CFG.VIEW_H) / 2 + longueur;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const cx = camera.x0 + CFG.VIEW_W / 2, cy = camera.y0 + CFG.VIEW_H / 2;
  const cu = cx * ca + cy * sa, cw = cy * ca - cx * sa;
  const portee = demi * 2;

  ctx.beginPath();
  for (let i = 0; i < nombre; i++) {
    const u = enroule(h01(i) * portee + tm * vitesse, cu, demi);
    const w = enroule(h01(i + 7919) * portee, cw, demi);
    const l = longueur * (0.55 + 0.45 * h01(i + 104729));
    const x = u * ca - w * sa, y = u * sa + w * ca;
    ctx.moveTo(x, y);
    ctx.lineTo(x - ca * l, y - sa * l);
  }
  ctx.strokeStyle = alpha(couleur, opacite);
  ctx.lineWidth = epaisseur;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";
}

// LE VENT SE VOIT, SINON IL N'EST QU'UNE DERIVE INEXPLIQUEE. La densite, la
// longueur et la vitesse des brins lisent toutes la meme `force`, donc une
// accalmie se voit avant de se sentir.
export function drawWeather(tm) {
  if (!weather) return;
  if (weather.id === WX_BOURRASQUE) {
    const v = windAt(weather, tm);
    if (!v) return;
    champ(tm, v.ang, 520 + 1150 * v.force, 30 + 82 * v.force,
          Math.round(CHAMP_MAX * (0.35 + 0.65 * v.force)),
          WEATHER.wind, 0.05 + 0.15 * v.force, 1.2);
    return;
  }
  if (weather.id === WX_CENDRES) {
    const ang = Math.PI / 2 + Math.sin(tm * 0.11 + weather.p1) * 0.22;
    champ(tm, ang, 108, 9, CHAMP_MAX, WEATHER.ash, 0.20, 2.1);
  }
}

export function drawHazards(tm) {
  const list = hazardsActifs();
  if (!list.length) return;

  for (const h of list) {
    const st = hazardState(h, tm);

    if (h.kind === HZ_SLOW || h.kind === HZ_SLIP) {
      const col = h.kind === HZ_SLOW ? BIOME.slow : BIOME.slip;
      ctx.fillStyle = alpha(col, 0.10);
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = alpha(col, 0.22);
      ctx.lineWidth = 1;
      ctx.save();
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.clip();
      if (h.kind === HZ_SLIP) {
        for (let d = -h.r; d <= h.r; d += 13) {
          ctx.beginPath();
          ctx.moveTo(h.x + d, h.y - h.r); ctx.lineTo(h.x + d + h.r, h.y + h.r);
          ctx.stroke();
        }
      } else {
        for (let d = -h.r; d <= h.r; d += 16) {
          ctx.beginPath();
          ctx.moveTo(h.x - h.r, h.y + d); ctx.lineTo(h.x + h.r, h.y + d);
          ctx.stroke();
        }
      }
      ctx.restore();
      continue;
    }

    if (h.kind === HZ_EMBER) {
      ctx.strokeStyle = alpha(BIOME.hazardIdle, 0.75);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(h.x - h.dx * h.span, h.y - h.dy * h.span);
      ctx.lineTo(h.x + h.dx * h.span, h.y + h.dy * h.span);
      ctx.stroke();
    } else {
      ctx.strokeStyle = alpha(BIOME.hazardIdle, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.stroke();
    }

    if (!st.on) continue;

    const k = st.k;
    ctx.fillStyle = alpha(BIOME.hazard, 0.20 * k);
    ctx.beginPath(); ctx.arc(st.x, st.y, h.r * k, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(BIOME.hazard, 0.75 * k);
    ctx.lineWidth = 2;
    ctx.stroke();

    if (h.kind === HZ_GEYSER) {
      const puls = 0.5 + 0.5 * Math.sin(tm * 9);
      ctx.fillStyle = alpha(BIOME.hazard, 0.28 * k * puls);
      ctx.beginPath(); ctx.arc(st.x, st.y, h.r * 0.55 * k, 0, Math.PI * 2); ctx.fill();
    }
  }
}
export function drawWalls(w) {
  if (!w) return;
  const t = w.t;
  ctx.fillStyle = alpha(WALL.fill, 0.30);
  ctx.fillRect(w.x - t / 2, 0, t, CFG.ARENA_H);
  ctx.fillRect(0, w.y - t / 2, CFG.ARENA_W, t);
  ctx.strokeStyle = alpha(WALL.edge, 0.85);
  ctx.lineWidth = 2;
  ctx.strokeRect(w.x - t / 2, 0, t, CFG.ARENA_H);
  ctx.strokeRect(0, w.y - t / 2, CFG.ARENA_W, t);
}
