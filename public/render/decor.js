
import { BIOME_CFG, CFG, HZ_EMBER, HZ_GEYSER, HZ_SLIP, HZ_SLOW, WX_BOURRASQUE, WX_BRUME, WX_CENDRES, biomeAt, hazardState, windAt } from "/shared/game_state.js";
import { BIOME, BOSS, PROP, SURFACE, WALL, WEATHER, ZONE, alpha } from "/shared/palette.js";
import { GFX_HIGH, GFX_LOW, difficulty, gfx } from "../core/state.js";
import { drawGridPings } from "./fx.js";
import { floorPattern, fondEspace, macroPattern } from "./material.js";
import { bossAtmo, bossVignette, ledDe } from "./lumiere.js";
import { forEachPropLight } from "./props.js";
import { GRID_FINE, GRID_MAJOR, biomeIndex, biomeSeed, camera, ctx, decor, hazardsActifs, inView, lumDir, obstaclesActifs, renderScale, setVignette, skin, sol, vignette, weather } from "./stage.js";

/* L'ARRIERE-PLAN, ET C'EST LE SEUL DU JEU. Il se dessine entre la couleur
   d'arene et la matiere du sol : la tuile de la Nebuleuse RETIRE ses baies, donc
   ce qui est peint ici se voit a travers le pont.

   Deux parallaxes, parce qu'un fond a une seule vitesse est un autocollant : les
   astres a 0,05, les etoiles a 0,16. La derive maximale sur cette arene est de
   256 px et la marge cuite en fait 300 — rien a boucler. */
const FOND_LOIN = 0.05;
const FOND_PRES = 0.16;
export function drawFond() {
  if (gfx <= GFX_LOW || biomeAt(biomeIndex).fond !== "espace") return;
  const f = fondEspace(biomeSeed, CFG.VIEW_W, CFG.VIEW_H);
  const dx = camera.x - CFG.ARENA_W / 2, dy = camera.y - CFG.ARENA_H / 2;
  ctx.save();
  ctx.translate(camera.x0, camera.y0);
  ctx.drawImage(f.loin, -f.marge - dx * FOND_LOIN, -f.marge - dy * FOND_LOIN);
  ctx.drawImage(f.pres, -f.marge - dx * FOND_PRES, -f.marge - dy * FOND_PRES);
  ctx.restore();
}

export function drawFloor() {
  const p = floorPattern(ctx, biomeIndex, difficulty, biomeSeed, renderScale);
  if (!p) return;
  ctx.fillStyle = p;
  ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  const m = macroPattern(ctx, biomeIndex, difficulty, biomeSeed, renderScale);
  if (!m) return;
  ctx.fillStyle = m;
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

  // LA 5 M EST CUITE DANS LA MATIERE des `medium` : un joint a une epaisseur et
  // deux cotes, donc il decrit une SURFACE la ou une ligne decrit un plan
  // technique. La 20 m reste tracee — c'est la seule qui serve a lire une
  // portee. `GRID_FINE` ne bouge pas : `drawGridPings` s'en sert toujours.
  const skip = decor.skip;
  if (gfx <= GFX_LOW) {
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
  }

  ctx.globalAlpha = gfx <= GFX_LOW ? 1 : 0.5;
  ctx.strokeStyle = sol.gridMajor;
  ctx.beginPath();
  for (let x = GRID_MAJOR; x < CFG.ARENA_W; x += GRID_MAJOR) {
    ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, CFG.ARENA_H);
  }
  for (let y = GRID_MAJOR; y < CFG.ARENA_H; y += GRID_MAJOR) {
    ctx.moveTo(0, y + .5); ctx.lineTo(CFG.ARENA_W, y + .5);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  drawGridPings();
}
export function drawVignette() {
  const puls = decor.pulse > 0
    ? 1 + decor.pulse * Math.sin(performance.now() / 2600)
    : 1;
  const fog = weather?.id === WX_BRUME;
  const bv = bossVignette();
  if (!vignette || decor.pulse > 0 || fog || bv !== 1) {
    const r = Math.hypot(CFG.VIEW_W, CFG.VIEW_H) / 2;
    const from = Math.max(0, decor.vignetteFrom + (fog ? BIOME_CFG.FOG_FROM : 0));
    const amt = decor.vignette * puls * (fog ? BIOME_CFG.FOG_VIGNETTE : 1) * bv;
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
  } else if (biome === "nebuleuse") {
    const c2 = Math.min(16, w * 0.30, h * 0.30);
    g.moveTo(x + c2, y); g.lineTo(x + w - c2, y);
    g.lineTo(x + w, y + c2); g.lineTo(x + w, y + h - c2);
    g.lineTo(x + w - c2, y + h); g.lineTo(x + c2, y + h);
    g.lineTo(x, y + h - c2); g.lineTo(x, y + c2);
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

/* LA FACE DU DESSUS DEVIENT UNE MATIERE, pas une surface pleine : tole striee,
   coin use, et une bande LED qui ECLAIRE reellement le sol — `ledDe()` vit dans
   `lumiere.js` et les deux la lisent, sinon la lueur et le trait finissent sur
   deux aretes differentes. Tout est clippe a la silhouette : rien ne deborde sur
   le sol, ou vivent les telegraphes. */
function habillage(o, rx, ry, biome) {
  ctx.save();
  ctx.translate(o.x + rx, o.y + ry);
  silhouette(ctx, o, biome);
  ctx.clip();

  const w = o.w, h = o.h;
  ctx.strokeStyle = alpha("#000000", 0.20);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -w / 2 + 5; x < w / 2; x += 7) {
    ctx.moveTo(x, -h / 2); ctx.lineTo(x, h / 2);
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metal, 0.09);
  ctx.beginPath();
  for (let x = -w / 2 + 6; x < w / 2; x += 7) {
    ctx.moveTo(x, -h / 2); ctx.lineTo(x, h / 2);
  }
  ctx.stroke();

  const use = ((o.x * 2654435761) ^ (o.y * 40503)) >>> 0;
  const cw = 7 + (use % 9);
  const sx = use & 1 ? 1 : -1, sy = use & 2 ? 1 : -1;
  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.beginPath();
  ctx.moveTo(sx * w / 2, sy * h / 2);
  ctx.lineTo(sx * (w / 2 - cw), sy * h / 2);
  ctx.lineTo(sx * w / 2, sy * (h / 2 - cw));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const l = ledDe(o);
  if (!l) return;
  const puls = 0.72 + 0.28 * Math.sin(performance.now() / 620 + o.x * 0.01);
  ctx.save();
  ctx.translate(rx, ry);
  ctx.lineCap = "round";
  ctx.strokeStyle = alpha(l.col, 0.20 * puls);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(l.x - l.dx * l.len / 2, l.y - l.dy * l.len / 2);
  ctx.lineTo(l.x + l.dx * l.len / 2, l.y + l.dy * l.len / 2);
  ctx.stroke();
  ctx.strokeStyle = alpha(l.col, 0.85 * puls);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
}

export function drawObstacles(cover) {
  const list = obstaclesActifs();
  if (!list.length) return;
  const biome = biomeAt(biomeIndex).key;
  const S = skin();
  const ox = camera.x0 + CFG.VIEW_W / 2, oy = camera.y0 + CFG.VIEW_H / 2;
  // L'OMBRE PORTEE LIT `lumDir()`, le relief reste RADIAL : l'un dit d'ou vient
  // la lumiere, l'autre ou est la camera. Deux gestes distincts, pas deux
  // reglages du meme.
  const dir = lumDir();

  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    const k = o.maxHp > 0 ? (cover?.find(c => c[0] === i)?.[1] ?? 1) : 1;
    if (o.maxHp > 0 && k <= 0) continue;

    const dx = o.x - ox, dy = o.y - oy;
    const d = Math.hypot(dx, dy) || 1;
    const rx = (dx / d) * OBST_RELIEF, ry = (dy / d) * OBST_RELIEF;

    ctx.save();
    ctx.translate(o.x + dir[0] * OBST_OMBRE, o.y + dir[1] * OBST_OMBRE);
    silhouette(ctx, o, biome);
    ctx.fillStyle = alpha("#000000", 0.34);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(o.x + rx, o.y + ry);
    silhouette(ctx, o, biome);
    ctx.fillStyle = o.maxHp > 0 ? BIOME.cover : S.bloc;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(o.x, o.y);
    silhouette(ctx, o, biome);
    ctx.fillStyle = alpha(o.maxHp > 0 ? BIOME.cover : S.bloc, 0.55);
    ctx.fill();
    ctx.strokeStyle = alpha(o.maxHp > 0 ? BIOME.coverEdge : S.blocEdge, 0.45);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(o.x + rx, o.y + ry);
    silhouette(ctx, o, biome);
    ctx.strokeStyle = alpha(o.maxHp > 0 ? BIOME.coverEdge : S.blocEdge, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (gfx > GFX_LOW) habillage(o, rx, ry, biome);

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
// `cx0/cy0/rayon` ancrent le champ sur une SOURCE au lieu de la vue : c'est le
// seul ecart entre la meteo et la vapeur d'un geyser. Parametres positionnels et
// non un objet d'options — le module ne doit rien allouer par image.
function champ(tm, ang, vitesse, longueur, nombre, couleur, opacite, epaisseur,
               cx0, cy0, rayon) {
  const demi = (rayon ?? Math.hypot(CFG.VIEW_W, CFG.VIEW_H) / 2) + longueur;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const cx = cx0 ?? camera.x0 + CFG.VIEW_W / 2;
  const cy = cy0 ?? camera.y0 + CFG.VIEW_H / 2;
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

/* LE MONDE NE DOIT PAS SEMBLER MORT QUAND LE JOUEUR S'ARRETE. Tout reutilise
   `champ()` : la position d'un brin reste une fonction de son indice et du
   temps, donc ce lot n'alloue rien et ne peut pas deriver — si un effet avait
   besoin d'un tableau qui persiste, il ne serait pas ici, il serait dans `fx.js`
   sous `PARTICLE_MAX`.

   TOUT RESTE DISCRET : a l'arret quelque chose bouge et on ne sait pas dire
   quoi ; en mouvement on ne le remarque pas. */
const POUSSIERE = 150;
export function drawAtmosphere(tm) {
  if (gfx < GFX_HIGH) return;

  champ(tm, Math.PI * 0.62 + Math.sin(tm * 0.07) * 0.30, 24, 5,
        POUSSIERE, WEATHER.wind, 0.055, 1.6);

  for (const h of hazardsActifs()) {
    if (h.kind === HZ_SLOW || h.kind === HZ_SLIP) continue;
    const st = hazardState(h, tm);
    if (!st.on || !inView(st.x, st.y, h.r)) continue;
    champ(tm, -Math.PI / 2, 30, 15, 14, WEATHER.wind, 0.10 * st.k, 3.2,
          st.x, st.y, h.r * 0.75);
  }

  // UN COFFRET QUI GRESILLE EST DU DECOR ; un coffret qui gresille, crache trois
  // etincelles et eclaire son pourtour est un OBJET. Les deux autres canaux sont
  // deja ecrits, celui-ci ferme le troisieme — et il lit la meme declaration.
  forEachPropLight((x, y, r, col, i) => {
    if (i < 0.55 || !inView(x, y, 40)) return;
    champ(tm, Math.PI * 0.52, 110, 7, 4, col, 0.34 * i, 1.4, x, y, 20);
  });

  // LE BOSS RESPIRE DANS L'ARENE. Il arrive en dernier et sur toute la vue :
  // c'est le seul champ qui ait le droit de traverser le centre, parce qu'il
  // annonce ce qui s'y trouve.
  const ba = bossAtmo();
  if (ba) {
    champ(tm, -Math.PI / 2 + Math.sin(tm * 0.13) * 0.4, 46, 11,
          Math.round(90 * ba.k), ba.col, 0.075 * ba.k, 2.2);
  }
}

/* LE PREMIER PLAN. Trois regles sans exception : rien au centre (il appartient
   au joueur), jamais opaque, et coupe pendant un boss — l'arene se resserre deja
   a une vue, y ajouter du bord serait le contraire de ce que le resserrement
   cherche.
   La parallaxe est une DERIVE globale proportionnelle a la position de camera :
   assez pour donner la profondeur, trop peu pour attirer l'oeil. */
const PP_PARALLAXE = 0.055;
const PP_BANDE = 0.155;
export function drawPremierPlan(v) {
  if (gfx < GFX_HIGH || v.boss) return;
  const h = CFG.VIEW_H * PP_BANDE;
  const dx = (camera.x - CFG.ARENA_W / 2) * PP_PARALLAXE;
  const dy = (camera.y - CFG.ARENA_H / 2) * PP_PARALLAXE;

  ctx.save();
  ctx.translate(camera.x0, camera.y0);

  for (const haut of [true, false]) {
    const y0 = haut ? 0 : CFG.VIEW_H;
    const g = ctx.createLinearGradient(0, y0, 0, haut ? h : CFG.VIEW_H - h);
    g.addColorStop(0, alpha(SURFACE.void, 0.34));
    g.addColorStop(1, alpha(SURFACE.void, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, haut ? 0 : CFG.VIEW_H - h, CFG.VIEW_W, h);
  }

  ctx.fillStyle = alpha(SURFACE.void, 0.30);
  for (let i = 0; i < 5; i++) {
    const x = ((i * 431 + dx) % (CFG.VIEW_W + 260)) - 130;
    const haut = (i & 1) === 0;
    const ep = 16 + (i % 3) * 7;
    ctx.fillRect(x, haut ? -20 - dy * 0.4 : CFG.VIEW_H - h * 0.62 - dy * 0.4,
                 ep, h * 0.8);
  }
  ctx.restore();
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
