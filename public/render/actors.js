
import { ARME_CFG, ARMES } from "/shared/armes.js";
import { POWERUP_ICON, POWERUP_STYLE, paintIcon } from "/icons.js";
import { RARITY_COLOR } from "/shared/cards.js";
import { SKILL_CFG } from "/shared/classes.js";
import { TRAIT_AURA, TRAIT_CFG, hasTrait } from "/shared/enemies.js";
import { bonusFamille, bonusRang } from "/shared/feedback.js";
import { CARD_CFG, CFG, ENEMY_TYPES, POWERUP_TYPES, defDe, fullMods, traitsOf } from "/shared/game_state.js";
import { BOSS, CLASS_COLOR, COMBAT, ENEMY, FX, OWNED, SIGNAL, SURFACE, ZONE, alpha } from "/shared/palette.js";
import { drawSprite, frameOf } from "/sprites.js";
import { EMPTY_SET, bombReadyAt, difficulty, myId, ownedCounts } from "../core/state.js";
import { ENEMY_TINT, paintPowerupIcon } from "../net/interp.js";
import { BURST_MAX, CRIT_PUNCH, HIT_FLASH, HIT_KICK, PARTICLE_MAX, ZONE_FX_MAX, bursts, drawBrulure, drawEntrave, drawOmbre, drawVulnerable, finArcs, fxGlow, fxShard, hits, ombresActives, particles, setZoneFx, spawnBraise, zoneFx } from "./fx.js";
import { ELITE_GOLD, camera, ctx, inView, mouse, ownerColorOf, voileBrume } from "./stage.js";

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
/* LA TROISIEME SILHOUETTE, et elle reste une SILHOUETTE : cinq armes
   partageaient la meme capsule, dont le railgun, qui tire un rail a 53 degats
   toutes les 0,95 s la ou le tir standard en envoie 12 six fois par seconde.
   Une aiguille longue et fine, avec une trainee droite : ce qu'on voit dit ce
   que ca coute. Elle se DEDUIT de l'arme du proprietaire, donc elle n'ouvre
   aucune clef d'instantane. */
export const BOLT_RAIL = 2;
/* Quatre silhouettes de plus, une par mecanique de delivrance : six petits corps
   plutot que six balles, un objet balistique qui tourne, un obus qui porte son
   souffle, une aiguille qui traverse. */
export const BOLT_GRAIN = 3;
export const BOLT_BARIL = 4;
export const BOLT_OBUS = 5;
export const BOLT_TRAIT = 6;
/* Une AIGUILLE : longue dans l'axe, presque nulle en travers, et un coeur clair
   qui la traverse. La trainee est DROITE et non un point flou — un rail ne
   flotte pas. */
function boltRail(x, y, ux, uy, r, col) {
  const L = r * 9, W = r * 0.55;
  const px = -uy, py = ux;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = alpha(col, 0.22);
  ctx.lineWidth = r * 2.4;
  ctx.beginPath();
  ctx.moveTo(x - ux * L, y - uy * L);
  ctx.lineTo(x + ux * r, y + uy * r);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x + ux * r * 2.2, y + uy * r * 2.2);
  ctx.lineTo(x - ux * L + px * W, y - uy * L + py * W);
  ctx.lineTo(x - ux * L - px * W, y - uy * L - py * W);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = FX.flash;
  ctx.lineWidth = Math.max(1, r * 0.4);
  ctx.beginPath();
  ctx.moveTo(x + ux * r * 2, y + uy * r * 2);
  ctx.lineTo(x - ux * L * 0.7, y - uy * L * 0.7);
  ctx.stroke();
}

// SIX PETITS CORPS, PAS SIX BALLES : rond et sans elongation, c'est ce qui
// separe une gerbe de plombs d'une salve.
function boltGrain(x, y, ux, uy, r, col) {
  ctx.fillStyle = alpha(col, 0.3);
  ctx.beginPath(); ctx.arc(x - ux * r * 2.4, y - uy * r * 2.4, r * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
/* UN OBJET BALISTIQUE, PAS UN TIR : un cylindre qui TOURNE, donc dont l'axe ne
   suit pas la trajectoire. La phase est une fonction de l'identifiant et du
   temps — rien ne se garde d'une image a l'autre.

   LA TRAINEE SUIT LE VOL PENDANT QUE LE CORPS TOURNE, et c'est tout le sujet :
   deux axes differents sur le meme objet, c'est ce qui separe un objet LANCE
   d'un projectile tire. Elle est LOURDE ET DISCRETE — large, tres pale, courte —
   parce qu'une grenade doit s'anticiper sans attirer plus l'oeil que le corps
   qu'on vise. Trois troncons de trait, aucune particule : a une grenade par
   seconde et par joueur, le budget du palier 0 ne paie pas de gerbe.

   LA PULSATION DIT « ARMEE ». Elle ne dit PAS « ca va sauter » — la duree de vie
   ne circule pas, et une pulsation qui accelererait mentirait. Un anneau pale et
   court, periode fixe, fonction de l'identifiant : aucune allocation, et il
   reste sous le corps pour ne pas devenir la boule lumineuse que la charte
   interdit. */
function boltBaril(b, r, col, vx, vy) {
  const sec = performance.now() / 1000;
  if (vx !== undefined) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 3; i >= 1; i--) {
      ctx.strokeStyle = alpha(col, 0.05 * i);
      ctx.lineWidth = r * (0.5 + i * 0.55);
      ctx.beginPath();
      ctx.moveTo(b.x - vx * r * (i * 2.6), b.y - vy * r * (i * 2.6));
      ctx.lineTo(b.x - vx * r * ((i - 1) * 2.6), b.y - vy * r * ((i - 1) * 2.6));
      ctx.stroke();
    }
    const puls = 0.5 + 0.5 * Math.sin(sec * 7 + b.id);
    ctx.strokeStyle = alpha(FX.blastEdge, 0.10 + 0.22 * puls);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r * (1.7 + 0.25 * puls), 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.restore();
  }
  const a = b.id * 0.7 + sec * 6.5;
  const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
  const L = r * 1.5, W = r * 0.85;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(b.x + ux * L + px * W, b.y + uy * L + py * W);
  ctx.lineTo(b.x + ux * L - px * W, b.y + uy * L - py * W);
  ctx.lineTo(b.x - ux * L - px * W, b.y - uy * L - py * W);
  ctx.lineTo(b.x - ux * L + px * W, b.y - uy * L + py * W);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = alpha(FX.flash, 0.7);
  ctx.lineWidth = Math.max(1, r * 0.3);
  ctx.beginPath();
  ctx.moveTo(b.x + ux * L, b.y + uy * L);
  ctx.lineTo(b.x - ux * L, b.y - uy * L);
  ctx.stroke();
}
// COURT ET EPAIS, avec un nez : il vole droit et vite la ou la grenade est lobee,
// et il porte son souffle avec lui.
function boltObus(x, y, ux, uy, r, col) {
  const px = -uy, py = ux;
  const N = r * 2, Q = r, W = r * 0.95;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x + ux * N, y + uy * N);
  ctx.lineTo(x + ux * Q + px * W, y + uy * Q + py * W);
  ctx.lineTo(x - ux * Q + px * W, y - uy * Q + py * W);
  ctx.lineTo(x - ux * Q - px * W, y - uy * Q - py * W);
  ctx.lineTo(x + ux * Q - px * W, y + uy * Q - py * W);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = alpha(FX.flash, 0.5);
  ctx.lineWidth = Math.max(1, r * 0.5);
  ctx.beginPath();
  ctx.moveTo(x - ux * Q, y - uy * Q);
  ctx.lineTo(x - ux * r * 3.6, y - uy * r * 3.6);
  ctx.stroke();
}
// UN TRAIT, PAS UNE AIGUILLE : la ou le rail a une masse, la precision n'a qu'une
// trainee. C'est la longueur qui dit la portee, la finesse qui dit la cadence.
function boltTrait(x, y, ux, uy, r, col) {
  const L = r * 16;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.strokeStyle = alpha(col, 0.3);
  ctx.lineWidth = Math.max(1, r * 0.5);
  ctx.beginPath();
  ctx.moveTo(x - ux * L, y - uy * L);
  ctx.lineTo(x + ux * r, y + uy * r);
  ctx.stroke();
  ctx.strokeStyle = alpha(FX.flash, 0.9);
  ctx.lineWidth = Math.max(1, r * 0.28);
  ctx.beginPath();
  ctx.moveTo(x - ux * L * 0.45, y - uy * L * 0.45);
  ctx.lineTo(x + ux * r * 1.6, y + uy * r * 1.6);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x + ux * r * 1.2, y + uy * r * 1.2, r * 0.55, 0, Math.PI * 2); ctx.fill();
}
// `vole` dit qu'on connait la DIRECTION reelle : a la premiere image une balle
// n'a pas de position precedente, et une trainee posee sur un axe suppose
// pointerait vers l'est pendant une image.
function boltForme(shape, b, ux, uy, r, col, vole = true) {
  switch (shape) {
    case BOLT_RAIL:  boltRail(b.x, b.y, ux, uy, r, col); return true;
    case BOLT_GRAIN: boltGrain(b.x, b.y, ux, uy, r, col); return true;
    case BOLT_BARIL: boltBaril(b, r, col, vole ? ux : undefined, uy); return true;
    case BOLT_OBUS:  boltObus(b.x, b.y, ux, uy, r, col); return true;
    case BOLT_TRAIT: boltTrait(b.x, b.y, ux, uy, r, col); return true;
    default: return false;
  }
}
/* CE QUE L'ARME PROJETTE, pas ce qu'elle vaut sur sa fiche : cinq armes
   partageaient la meme capsule, donc un rail de 53 degats se lisait comme une
   balle de 12. La silhouette et la taille se DEDUISENT de la mecanique, donc
   rien ne circule — le proprietaire voyage deja dans le tuple de la balle, et
   son arme dans le sien. Cuit une fois : `ARMES` ne bouge pas. */
const SIL_DEFAUT = [BOLT_CAPSULE, 1];
const SILHOUETTES = new Map(ARMES.map(a => [a.id,
  a.charge ? [BOLT_RAIL, 1.6]
  : a.tir === "grenade" ? [BOLT_BARIL, 1.3]
  : a.obus ? [BOLT_OBUS, 1.4]
  : a.plombs ? [BOLT_GRAIN, 0.7]
  : a.perce ? [BOLT_TRAIT, 0.8]
  : a.rampe ? [BOLT_CAPSULE, 0.85]
  : SIL_DEFAUT]));
export const silhouetteArme = a => SILHOUETTES.get(a?.id) ?? SIL_DEFAUT;

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
      if (boltForme(shape, b, ux, uy, r, col)) return;
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
  if (boltForme(shape, b, 1, 0, r, col, false)) return;
  if (shape === BOLT_DIAMOND) { boltDiamond(b.x, b.y, 1, 0, r); return; }
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.fill();
}
// UN MISSILE N'EST PAS UNE BALLE PLUS GROSSE : c'est une trainee. La direction
// se deduit de l'image precedente, comme pour tout projectile.
export function drawMissile(b, col) {
  const prev = bulletTrail.get(b.id);
  bulletTrail.set(b.id, { x: b.x, y: b.y });
  let ux = 1, uy = 0;
  if (prev) {
    const dx = b.x - prev.x, dy = b.y - prev.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) { ux = dx / d; uy = dy / d; }
  }
  const r = CFG.BULLET_RADIUS * 1.5;

  ctx.lineCap = "round";
  for (let i = 3; i >= 1; i--) {
    ctx.globalAlpha = 0.10 * i;
    ctx.strokeStyle = i > 2 ? col : FX.blastEdge;
    ctx.lineWidth = r * (0.5 + i * 0.35);
    ctx.beginPath();
    ctx.moveTo(b.x - ux * r * (2 + i * 3.4), b.y - uy * r * (2 + i * 3.4));
    ctx.lineTo(b.x - ux * r * (i * 2.2), b.y - uy * r * (i * 2.2));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = COMBAT.blastCore;
  ctx.beginPath();
  ctx.moveTo(b.x + ux * r * 2.2, b.y + uy * r * 2.2);
  ctx.lineTo(b.x - uy * r, b.y + ux * r);
  ctx.lineTo(b.x - ux * r * 1.6, b.y - uy * r * 1.6);
  ctx.lineTo(b.x + uy * r, b.y - ux * r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.lineCap = "butt";
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
/* LE SOL BRULE RESTE, ET C EST LA DERNIERE DES TROIS ETAPES. `scorches` ne se
   posait que sur une DETONATION (`zoneResolved`, `blast > 0.15`) : un sol
   brulant de carte a `blast: 0` — il nait sous une explosion qui a deja son
   propre dessin — donc il s eteignait sans rien laisser. « Les flammes
   disparaissent, les braises restent un moment, le sol brule reste » : les deux
   premiers existaient, le troisieme non.

   ON DETECTE LA DISPARITION, on ne la fait pas dire par le reseau. Le serveur
   n a pas a annoncer qu une zone s eteint : le client la voyait a l image
   precedente et ne la voit plus. Meme idiome que `zoneMotion` et `blastSeen` —
   une carte cote client, bornee, videe quand elle grossit.

   SEULEMENT LE FEU D UN JOUEUR : une zone de horde qui expire a deja son
   clignotement d avertissement, et laisser une trace la ou le danger a CESSE
   dirait le contraire de ce qu on veut. */
const feuVu = new Map();
function traceDuFeu(list, tm) {
  const vivantes = new Set();
  for (const z of list) {
    if (!(z.pj > 0) || !(z.life > 0)) continue;
    vivantes.add(z.id);
    feuVu.set(z.id, z);
  }
  for (const [id, z] of feuVu) {
    if (vivantes.has(id)) continue;
    feuVu.delete(id);
    scorches.push({ z: { ...z }, until: tm + 2 });
    if (scorches.length > 24) scorches.shift();
  }
  if (feuVu.size > 220) feuVu.clear();
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
  traceDuFeu(list, tm);
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

  if (persistent.length) {
    const groupes = new Map();
    for (const z of persistent) {
      const k = z.pj || 0;
      let g = groupes.get(k);
      if (!g) groupes.set(k, g = []);
      g.push(z);
    }
    for (const [pj, g] of groupes) drawZonesActive(g, tm, pj);
  }

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
/* UNE ZONE DE JOUEUR EST DU FEU, ET SON PROPRIETAIRE EST SON CONTOUR. La teinte
   d equipe couvrait les QUATRE canaux : le sol brulant d un joueur bleu crachait
   des braises BLEUES, donc la seule carte qui pose du feu (`terrain_conquis`) ne
   montrait pas de feu. La couleur dit maintenant A QUI, la matiere dit QUOI — et
   le contour etait deja une passe separee, il ne coute rien.

   `pj` et non la couleur : `ownerColorOf` rend `null` des qu un joueur quitte le
   salon, et la matiere du sol se serait alors mise a changer sous les pieds. */
function drawZonesActive(list, tm, pj = 0) {
  const tick = CFG.ZONE_TICK || 0.25;
  const ph = (tm % tick) / tick;
  const pulse = 0.88 + 0.12 * Math.max(0, 1 - ph * 2.5);
  const feu = pj !== 0;
  const cBraise  = feu ? ZONE.braise     : ZONE.blast;
  const cBord    = feu ? ZONE.braiseBord : ZONE.edge;
  const cFond    = feu ? ZONE.braiseFond : ZONE.fill;
  const cHachure = feu ? ZONE.braise     : ZONE.persist;
  const cContour = (feu ? ownerColorOf(pj) : null) ?? ZONE.persist;

  for (const z of list) {
    if (zoneFx >= ZONE_FX_MAX || particles.length >= PARTICLE_MAX) break;
    if (Math.random() < 0.55) {
      const pt = zoneRandomPoint(z);
      particles.push({
        x: pt.x, y: pt.y,
        vx: (Math.random() - 0.5) * 12, vy: -14 - Math.random() * 18,
        lift: 26, life: 0.9 + Math.random() * 0.5, max: 1.4,
        col: cBraise, size: 4, zfx: 1, frame: fxGlow,
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
  ctx.fillStyle = alpha(cBord, 0.34 * pulse);
  ctx.fill("nonzero");

  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1);
  ctx.fillStyle = alpha(cFond, 0.45 * pulse);
  ctx.fill("nonzero");

  ctx.save();
  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1);
  ctx.clip("nonzero");
  ctx.strokeStyle = alpha(cHachure, 0.22);
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
  ctx.strokeStyle = alpha(cContour, 0.55 * pulse);
  ctx.lineWidth = 2;
  ctx.stroke();

  /* UNE ZONE DE HORDE CLIGNOTE, UN FEU S ETEINT — et c est la meme difference
     qu entre un avertissement et une matiere. Le clignotement est un carre
     (`sin > 0`), donc a flanc FRANC : il annonce une echeance, et c est juste
     pour un sol qui va cesser de blesser le JOUEUR. Le sol brulant d une carte
     ne blesse que la horde — il n a personne a avertir, et un flanc franc y
     fabriquerait un telegraphe qui ne dit rien.
     Il retombe donc en continu sur ses trois dernieres secondes, vers une
     cendre tiede : « les flammes disparaissent, les braises restent un moment,
     le sol brule reste ». Meme oubli que les quatre autres canaux avant
     0.29.1 — la teinte d equipe couvrait tout, et celle-ci avait survecu. */
  const dying = list.filter(z => z.life > 0 && z.life < 3);
  if (dying.length) {
    if (feu) {
      for (const z of dying) {
        const k = 1 - z.life / 3;
        ctx.beginPath();
        zoneSubPath(z, 1.05);
        ctx.fillStyle = alpha(ZONE.braiseMorte, 0.26 * k);
        ctx.fill("nonzero");
      }
    } else if (Math.sin(tm * 12) > 0) {
      ctx.beginPath();
      for (const z of dying) zoneSubPath(z, 1.05);
      ctx.fillStyle = alpha(ZONE.dying, 0.16);
      ctx.fill("nonzero");
    }
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
const HEAL_WAVE_MOTES = 8;

/* CE QUE LA LAME DESSINE VIENT DES CARTES DU PORTEUR. Le second tranchant et
   l'ouverture de l'arc sont des `mods`, donc `fullMods` les rend exactement —
   meme idiome que `porteeArme()` et que la nappe du laser. Recalcule quand la
   main change, jamais a l'image, et borne par le nombre de joueurs. */
const LAME_TRAINE = 4;
const modsSig = new Map();
const modsVal = new Map();
function modsDe(id, armeId) {
  const counts = ownedCounts(id);
  let n = 0;
  for (const v of counts.values()) n += v;
  const cle = `${armeId}|${counts.size}|${n}`;
  if (modsSig.get(id) !== cle) {
    modsSig.set(id, cle);
    modsVal.set(id, fullMods(counts, [], 0, 1, armeId).mods);
  }
  return modsVal.get(id);
}
function lameForme(id) {
  const m = modsDe(id, "lame");
  return { arc: ARME_CFG.LAME_ARC * (m.lameArc ?? 1), sens: m.lameDouble > 0 ? 2 : 1 };
}

export function drawEffects(effects) {
  for (const f of effects) {
    const grow = 1 - f.k;

    /* LE BALAYAGE DE LA LAME : un arc qui PASSE, pas un cercle qui apparait. La
       forme du TRAJET est ce qui identifie l'arme d'un bout a l'autre de
       l'ecran — et elle balayait TOUJOURS VERS L'EST, parce que l'angle pose par
       `_lameTir` n'etait pas transporte et que `?? 0` le taisait.

       Trois choses la rendent lisible a 200 corps : la traine s'ETEINT vers la
       queue — c'est le gradient qui dit le sens, pas une fleche —, la POINTE est
       fine et claire parce que c'est elle qu'on suit, et le contact EPAISSIT le
       trait au lieu d'ajouter une gerbe : a 2,5 balayages par seconde, le palier
       2 ne paie pas de particules. */
    if (f.kind === 17) {
      const col = ownerColorOf(f.owner) ?? FX.flash;
      const L = lameForme(f.owner);
      const demi = L.arc / 2;
      const mordu = Math.min(1, (f.n ?? 0) / 4);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let s = 0; s < L.sens; s++) {
        const a0 = (f.ang ?? 0) + (s === 0 ? 0 : Math.PI) - demi;
        const bal = a0 + grow * L.arc;
        for (let i = 0; i < LAME_TRAINE; i++) {
          const k = (i + 1) / LAME_TRAINE;
          ctx.strokeStyle = alpha(col, f.k * 0.85 * k * k);
          ctx.lineWidth = (2.5 + 4 * k) * (1 + 0.5 * mordu);
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, a0 + (bal - a0) * (i / LAME_TRAINE),
                  a0 + (bal - a0) * k);
          ctx.stroke();
        }
        ctx.strokeStyle = alpha(FX.flash, Math.min(1, f.k * 0.9 + mordu * 0.3));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, Math.max(a0, bal - 0.28), bal);
        ctx.stroke();
        // le BORD qui coupe : un trait radial a la pointe, en travers de l'arc.
        // Sans lui la lame se lit comme une onde, pas comme une lame.
        ctx.strokeStyle = alpha(FX.flash, f.k * 0.5);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(f.x + Math.cos(bal) * (f.r - 7), f.y + Math.sin(bal) * (f.r - 7));
        ctx.lineTo(f.x + Math.cos(bal) * (f.r + 7), f.y + Math.sin(bal) * (f.r + 7));
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.restore();
      continue;
    }

    // UN ULTIME S'ANNONCE A TOUTE L'EQUIPE. L'onde qui traverse la vue n'est
    // tiree que pour SON lanceur — un voile plein ecran a chaque ultime allie
    // serait une gene, pas une information. Le PALIER se lit sans chiffre : le
    // 3 vire au legendaire et double sa couronne.
    if (f.kind === 16) {
      const col = f.n >= 3 ? RARITY_COLOR[3] : (ownerColorOf(f.owner) ?? FX.flash);
      if (f.owner === myId) {
        ctx.fillStyle = alpha(col, f.k * 0.10);
        ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
      }
      for (let i = 0; i < (f.n >= 3 ? 2 : 1); i++) {
        ctx.strokeStyle = alpha(col, f.k * (0.8 - i * 0.3));
        ctx.lineWidth = 5 - i * 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (0.3 + grow * (2.4 + i * 0.9)), 0, Math.PI * 2);
        ctx.stroke();
      }
      // le marqueur au-dessus du lanceur : trois chevrons qui montent.
      ctx.strokeStyle = alpha(col, f.k);
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const y = f.y - 34 - i * 9 - grow * 14;
        const w = 9 - i * 2;
        ctx.beginPath();
        ctx.moveTo(f.x - w, y + 5);
        ctx.lineTo(f.x, y);
        ctx.lineTo(f.x + w, y + 5);
        ctx.stroke();
      }
      continue;
    }

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

    /* L'AMORCE EST LE TRAIT QU'ON A VISE, la dispersion est ce qu'il a
       declenche : presque droite et epaisse contre agitee et fine. Cette
       difference n'a JAMAIS ete tracee — le tuple d'arc s'arretait a `y2`, donc
       `f.n` valait toujours zero et tout passait par la branche du bas.

       LE RANG PORTE LA PERTE. Chaque saut coute 30 % de la decharge, et c'etait
       la seule chose que l'image ne disait pas : plus loin dans la chaine, le
       trait est plus FIN, plus AGITE et plus PALE. Le nombre se lit donc sans
       compter les traits. */
    if (f.kind === 3) {
      const rang = Math.max(0, (f.n ?? 0) - 1);
      ctx.globalAlpha = f.k * Math.pow(0.78, rang);
      drawArc(`r${f.id}`, f.x, f.y, f.x2, f.y2, f.n === 1
        ? { col: FX.ricochetCore, coeur: FX.flash, amp: 0.03, width: 3.4,
            branches: 0, cut: 0.15 }
        : { col: FX.ricochet, coeur: FX.ricochetCore,
            amp: 0.09 + rang * 0.025,
            width: Math.max(1.2, 2.2 - rang * 0.3),
            branches: 2, cut: 0.45 });
      /* LE REBOND A UN DEPART, et c'est ce qui lui manquait. L'arc dit « ces
         deux corps sont relies » ; il ne dit pas « l'energie est PARTIE d'ici
         vers la ». Un chevron a l'origine, ouvert dans l'axe du saut, le dit en
         trois traits — et il n'existe QUE sur un rebond (rang 1 et au-dela) :
         sur l'amorce il redirait le tir, qui a deja sa bouche.
         Il vit dans le meme `globalAlpha` que l'arc, donc il s'efface avec lui
         et paie la meme perte par rang. */
      if (rang > 0) {
        const dx = f.x2 - f.x, dy = f.y2 - f.y;
        const d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d, px = -uy, py = ux;
        const s = 5 + 3 * f.k;
        ctx.strokeStyle = alpha(FX.ricochetCore, 0.85);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(f.x - ux * s + px * s, f.y - uy * s + py * s);
        ctx.lineTo(f.x + ux * s * 0.6, f.y + uy * s * 0.6);
        ctx.lineTo(f.x - ux * s - px * s, f.y - uy * s - py * s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      continue;
    }

    /* LE TIR ARRETE. Le porte-bouclier absorbait en SILENCE et le client lisait
       une touche legere : l'arme paraissait ne rien faire contre ce corps sans
       qu'aucun pixel ne dise pourquoi. La plaque s'allume EN TRAVERS de l'axe du
       coup — un segment, jamais un anneau : l'anneau appartient a l'egide et a
       l'elite — et le coup repart en s'ouvrant vers l'arriere.
       `ang` porte l'incidence, comme le sens d'un souffle d'obus : meme
       emplacement, deux lectures, exactement comme l'index 6. */
    if (f.kind === 18) {
      const a = f.ang ?? 0;
      const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
      const L = f.r * (0.9 + 0.7 * f.k);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.strokeStyle = alpha(ENEMY_TINT[BOUCLIER] ?? FX.flash, f.k * 0.9);
      ctx.lineWidth = 3 * f.k + 1.2;
      ctx.beginPath();
      ctx.moveTo(f.x + px * L, f.y + py * L);
      ctx.lineTo(f.x - px * L, f.y - py * L);
      ctx.stroke();
      ctx.strokeStyle = alpha(FX.flash, f.k * 0.7);
      ctx.lineWidth = 1.6;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x + (ux * 0.45 + px * s) * L * 1.5,
                   f.y + (uy * 0.45 + py * s) * L * 1.5);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.restore();
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

    /* LE MOMENT OU LE PORTEUR S'OUVRE. Une balle unique se scinde a distance
       fixe : c'est la seule chose que le fusil a dispersion demande d'apprendre,
       et elle rendait le meme petit anneau que trois autres mecaniques. Ce
       qu'elle doit dire est UN CORPS QUI SE DIVISE — donc des rais qui divergent
       depuis un point, dans le sens du vol, et jamais un cercle.
       La FORME de la gerbe vient des cartes du porteur : `scissionDroite` la
       rend parallele, et deux endroits ou ecrire « la gerbe s'ouvre de 0,8 rad »
       finiraient par diverger. */
    if (f.kind === 19) {
      const col = ownerColorOf(f.owner) ?? COMBAT.bullet;
      const n = Math.max(2, f.n ?? 6);
      const droit = (modsDe(f.owner, "dispersion").scissionDroite ?? 0) > 0;
      const arc = droit ? 0 : ARME_CFG.DISP_ARC;
      const ux = Math.cos(f.ang ?? 0), uy = Math.sin(f.ang ?? 0);
      const L = f.r * (0.5 + grow * 2.6);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.strokeStyle = alpha(col, f.k * 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const k = n === 1 ? 0 : (i / (n - 1) - 0.5);
        const a = (f.ang ?? 0) + k * arc;
        const ox = droit ? -uy * k * ARME_CFG.DISP_DROITE : 0;
        const oy = droit ? ux * k * ARME_CFG.DISP_DROITE : 0;
        ctx.moveTo(f.x + ox, f.y + oy);
        ctx.lineTo(f.x + ox + Math.cos(a) * L, f.y + oy + Math.sin(a) * L);
      }
      ctx.stroke();
      // le point ou le porteur a cesse d'exister RESTE en place et s'eteint :
      // c'est lui qui marque la distance, les rais ne font que la quitter.
      ctx.fillStyle = alpha(FX.flash, f.k * f.k * 0.9);
      ctx.beginPath(); ctx.arc(f.x, f.y, 3 + f.k * 4, 0, Math.PI * 2); ctx.fill();
      ctx.lineCap = "butt";
      ctx.restore();
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

    // 15 : l'ENTREE du palier. `kind: 6` marque sa fin ; il en fallait un a
    // l'ouverture, et il est blanc comme l'enveloppe qu'il annonce.
    if (f.kind === 15) {
      ctx.strokeStyle = alpha(COMBAT.flash, f.k * 0.85);
      ctx.lineWidth = 6 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1 - f.k * 0.55), 0, Math.PI * 2);
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

    // LA VAGUE DE SOIN, en couches a constantes de temps distinctes, comme un
    // souffle — mais le gradient est INVERSE : creux au centre, dense au front.
    // Le soin est donne vers l'exterieur, il ne remplit pas un disque.
    if (f.kind === 11) {
      const R = f.r * (0.16 + grow * 0.84);
      const g = ctx.createRadialGradient(f.x, f.y, R * 0.42, f.x, f.y, R);
      g.addColorStop(0, alpha(FX.heal, 0));
      g.addColorStop(0.78, alpha(FX.heal, f.k * 0.09));
      g.addColorStop(1, alpha(FX.heal, f.k * 0.22));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = alpha(FX.heal, f.k * 0.9);
      ctx.lineWidth = 4 * f.k + 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, Math.PI * 2); ctx.stroke();

      // la trainee reste EN ARRIERE du front : un seul anneau se lit comme de
      // l'interface, deux rayons a deux vitesses se lisent comme une onde.
      ctx.strokeStyle = alpha(FX.healSoft, f.k * f.k * 0.45);
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(f.x, f.y, R * 0.84, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      // ELLE SE RECONNAIT A SES CROIX, comme le sanctuaire — mais PORTEES par
      // le front au lieu de monter sur place. Aucune allocation.
      for (let i = 0; i < HEAL_WAVE_MOTES; i++) {
        const a = (i / HEAL_WAVE_MOTES) * Math.PI * 2 + f.id * 0.63;
        paintIcon(ctx, POWERUP_ICON.heal, FX.heal,
                  f.x + Math.cos(a) * R, f.y + Math.sin(a) * R,
                  0.28 + f.k * 0.18, f.k * f.k * 0.9);
      }
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
// LE REMPART EST BATI, PAS SOUFFLE. Il bloque vraiment (`state.walls`), donc il
// se dessine comme un mur : une couronne de PLAQUES a joints ouverts, d'epaisseur
// visible, la ou le dome du soigneur est lisse. La phase vient de l'identifiant,
// pas du temps — un mur qui tourne n'est plus un mur.
const BULWARK_PLATES = 14;
const BULWARK_EP = 9;
export function drawBulwarks(list) {
  const tm = performance.now() / 1000;
  for (const b of list) {
    const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.55, b.x, b.y, b.r);
    g.addColorStop(0, alpha(CLASS_COLOR.tank, 0.02));
    g.addColorStop(0.82, alpha(CLASS_COLOR.tank, 0.05 + b.k * 0.04));
    g.addColorStop(1, alpha(CLASS_COLOR.tank, 0.12 + b.k * 0.12));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const pas = (Math.PI * 2) / BULWARK_PLATES;
    const phase = b.id * 0.37;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < BULWARK_PLATES; i++) {
      const a0 = phase + i * pas, a1 = a0 + pas * 0.72;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, a0, a1);
      ctx.arc(b.x, b.y, b.r - BULWARK_EP, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = alpha(CLASS_COLOR.tank, 0.07 + b.k * 0.09);
      ctx.fill();
      ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.22 + b.k * 0.34);
      ctx.stroke();
    }

    // le champ qui tient les plaques : la SEULE chose vivante du rempart.
    ctx.strokeStyle = alpha(CLASS_COLOR.tank,
                            (0.30 + b.k * 0.40) * (0.85 + 0.15 * Math.sin(tm * 2.2 + b.id)));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();

    // le SPECULAIRE haut-gauche, comme toute la charte : c'est lui qui dit
    // « surface courbe » plutot que « cercle trace ».
    ctx.strokeStyle = alpha(COMBAT.flash, 0.10 + b.k * 0.14);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r - BULWARK_EP * 0.5, Math.PI * 1.08, Math.PI * 1.46);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = alpha(OWNED.bulwarkArc, 0.85);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.k);
    ctx.stroke();
  }
}
// L'ANCRE MONTRE ENFIN CE QU'ELLE TIENT. Le role du tank est entierement fait
// de choses qui n'arrivent pas ; c'est la seule competence du jeu qui puisse
// montrer son travail a l'equipe. Les retenus se DEDUISENT de la geometrie —
// l'entree dans le rayon se rejoue ici comme `drawMedicLinks` rejoue le choix du
// serveur, donc aucune cle de reseau ne s'ouvre.
const anchorHeld = new Map();

export function drawAnchorChains(list, enemies) {
  for (const [id, s] of anchorHeld) {
    if (!list.some(a => a.id === id)) anchorHeld.delete(id);
    else if (s.size > 400) s.clear();
  }
  for (const an of list) {
    let tenus = anchorHeld.get(an.id);
    if (!tenus) { tenus = new Set(); anchorHeld.set(an.id, tenus); }
    const leash = an.r * 2;
    for (const e of enemies) {
      const d2 = (e.x - an.x) ** 2 + (e.y - an.y) ** 2;
      if (d2 <= an.r * an.r) tenus.add(e.id);
      else if (d2 > leash * leash) { tenus.delete(e.id); continue; }
      if (!tenus.has(e.id)) continue;
      if (!inView(e.x, e.y, 120) && !inView(an.x, an.y, 120)) continue;
      drawArc(`an${an.id}:${e.id}`, an.x, an.y, e.x, e.y,
        { col: CLASS_COLOR.tank, coeur: OWNED.bulwarkArc, amp: 0.10,
          width: 1.8, branches: 1, cut: 0.5,
          flow: { col: OWNED.bulwarkArc, hz: 0.9, n: 2, size: 2.2, sens: -1 } });
    }
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
/* TREIZE DISQUES IDENTIQUES ne se separaient que par leur icone, or on ramasse
   un bonus EN COURANT : l'icone est ce qu'on lit en dernier. Le socle prend donc
   la forme de sa FAMILLE — disque pour ce qui rend au corps, hexagone pour ce
   qui arme le tir, losange pour ce qui se pose dans l'arene — et la teinte reste
   celle du type, qui separe deux bonus d'une meme famille.

   Trois horloges, trois choses differentes, aucune ne redit l'autre :
   l'APPARITION est une echelle qui depasse puis retombe, la PRESENCE est le
   flottement d'avant, la FIN est un cadran qui se vide. */
const BONUS_NAISSANCE = 340;
const BONUS_PREAVIS = 0.30;
const BONUS_CLIGNE = 0.12;
const bonusNe = new Map();
const bonusVus = new Set();

function socleBonus(x, y, r, cotes) {
  ctx.beginPath();
  if (!cotes) { ctx.arc(x, y, r, 0, Math.PI * 2); return; }
  for (let i = 0; i < cotes; i++) {
    const a = -Math.PI / 2 + (i / cotes) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/* LES DEUX PASSES LISENT LE MEME ETAT, sinon le socle et son anneau derivent
   d'une image a l'autre. L'apparition ne se joue QUE pour un bonus NEUF : le
   serveur filtre par vue, donc un bonus qui entre dans le champ a deja vecu et
   le faire naitre une seconde fois serait un mensonge. La part de vie est le
   seul canal qui sache les distinguer — et seule `drawPowerups` l'inscrit, pour
   que l'ordre des deux passes ne puisse pas decider d'une naissance. */
function bonusEtat(w, now, inscrire) {
  const cle = POWERUP_TYPES[w.type];
  const k = w.k ?? 1;
  let ne = bonusNe.get(w.id);
  if (ne === undefined) {
    ne = k >= 0.95 ? now : 0;
    if (inscrire) bonusNe.set(w.id, ne);
  }
  const naissance = ne === 0 ? 1 : Math.min(1, (now - ne) / BONUS_NAISSANCE);
  // depassement puis retour : une montee lineaire fait « animation », un
  // depassement fait « ca vient de tomber »
  const ech = naissance >= 1 ? 1
    : 0.25 + 0.75 * naissance + Math.sin(naissance * Math.PI) * 0.30;
  const r = CFG.POWERUP_RADIUS;
  const pulse = 1 + Math.sin(now / 260 + w.id) * 0.1;
  const bob = Math.sin(now / 520 + w.id * 1.7) * 1.6;
  return {
    st: POWERUP_STYLE[cle] ?? POWERUP_STYLE.heal,
    fam: bonusFamille(cle), rang: bonusRang(cle),
    k, naissance, ech, r, pulse, y: w.y + bob, rr: r * pulse * ech,
    // LE CADRAN DIT COMBIEN IL RESTE, et il n'apparait qu'a l'approche : un
    // compte a rebours permanent sur chaque bonus ferait treize horloges.
    fin: k < BONUS_PREAVIS,
    cligne: k < BONUS_CLIGNE ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now / 90)) : 1,
  };
}

export function drawPowerups(list) {
  const now = performance.now();
  bonusVus.clear();
  for (const w of list) {
    bonusVus.add(w.id);
    if (!inView(w.x, w.y, 60)) continue;
    const e = bonusEtat(w, now, true);

    ctx.globalAlpha = e.naissance;
    ctx.fillStyle = alpha(SURFACE.shadow, 0.28);
    ctx.beginPath();
    ctx.ellipse(w.x, w.y + e.r * 0.95, e.r * 0.62 * e.ech, e.r * 0.22 * e.ech,
                0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = e.cligne;
    ctx.fillStyle = alpha(SURFACE.void, 0.82);
    socleBonus(w.x, e.y, e.rr, e.fam.cotes);
    ctx.fill();
    ctx.strokeStyle = e.st.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    paintPowerupIcon(e.st, w.x, e.y, e.rr / 8.6, e.naissance * e.cligne);
    ctx.globalAlpha = 1;
  }

  if (bonusNe.size > bonusVus.size) {
    for (const id of bonusNe.keys()) if (!bonusVus.has(id)) bonusNe.delete(id);
  }
}

/* CE QUI MONTE EST LE SIGNAL, PAS L OBJET. Un bonus etait le seul objet de
   gameplay dessine SOUS la horde, et il n'a ni anneau d'equipe ni telegraphe
   pour se rattraper. Mesure, cauchemar a quatre joueurs, 300 s par densite : la
   part de bonus recouverts par un corps passe de 2,6 % a 50 corps a 36,9 % a
   200. Ce n'est pas une affaire de densite — les corps ne couvrent que 3,3 % de
   la vue —, c'est une affaire d'ORDRE.

   Faire passer le bonus ENTIER au-dessus mettrait treize disques opaques devant
   la horde, soit du decor devant du gameplay. On ne monte donc que ce qui
   DESIGNE : le socle de famille, le cadran de fin, l'anneau de rarete — des
   traits fins, jamais un aplat. L'icone, celle qu'on lit en dernier et de pres,
   reste ou elle est.

   La hierarchie est STRUCTURELLE et non reglee, comme la passe de lumiere :
   appelee apres `setCtx(overCtx)`, elle vit sur `#cv`, donc au-dessus de
   `#cvGl` ou vivent les corps. La deplacer d'une ligne avant la bascule la
   casse en silence. Meme geste que `drawMarkColumns`, l'autre chose qui a le
   droit de passer devant la horde. */
export function drawBonusSignal(list) {
  const now = performance.now();
  for (const w of list) {
    if (!inView(w.x, w.y, 60)) continue;
    const e = bonusEtat(w, now, false);

    ctx.globalAlpha = 0.25 * e.naissance * e.cligne;
    ctx.strokeStyle = e.st.color;
    ctx.lineWidth = 1;
    socleBonus(w.x, e.y, e.r * 1.9 * e.pulse * e.ech, e.fam.cotes);
    ctx.stroke();

    if (e.fin) {
      ctx.globalAlpha = 0.85 * e.cligne;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w.x, e.y, e.r * 1.9 * e.pulse, -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * (e.k / BONUS_PREAVIS));
      ctx.stroke();
    }

    // LE RANG DIT LA RARETE : un second anneau, plus loin, tirete et lent. Ni
    // plus gros ni plus clair — la charte reserve la taille a autre chose.
    if (e.rang > 0) {
      ctx.globalAlpha = 0.30 * e.naissance * e.cligne;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 7]);
      ctx.lineDashOffset = -now / 90;
      ctx.beginPath();
      ctx.arc(w.x, e.y, e.r * 2.7 * e.ech, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
    ctx.globalAlpha = 1;
  }
}
/* UNE ARME QUI VISE AU SOL DOIT MONTRER OU. Sans ce marqueur, le point
   d'impact du lance-grenades se decouvre APRES le tir, et « il faut anticiper
   la trajectoire » ne devient jouable pour personne.
   La portee est une FONCTION de ce que le client a deja — ses propres cartes —
   donc elle n'ouvre aucune cle d'instantane ; elle se recalcule quand la main
   change, pas a l'image. */
let porteeSig = "";
let porteeMax = 0;
function porteeArme(me, arme) {
  const counts = ownedCounts(myId);
  let n = 0;
  for (const v of counts.values()) n += v;
  const sig = `${arme.id}|${me.cls}|${counts.size}|${n}`;
  if (sig !== porteeSig) {
    porteeSig = sig;
    const m = fullMods(counts, [], me.cls ?? 0, 1, arme.id).mods;
    porteeMax = CFG.BULLET_SPEED * CFG.BULLET_LIFE * arme.portee * m.bulletLifeMul;
  }
  return porteeMax;
}

/* LA SCISSION DOIT SE VOIR : c'est le seul chiffre que l'arme demande
   d'apprendre, et une distance qu'on ne voit pas ne s'apprend pas. Un chevron
   pose sur la ligne de tir, exactement la ou la balle s'ouvre. */
function drawScission(me, arme) {
  // le RETICULE LOCAL et non l'angle du serveur : le marqueur doit suivre la
  // souris a l'image, comme celui du lance-grenades
  const a = Math.atan2(mouse.y - me.y, mouse.x - me.x);
  // la balle nait devant le joueur : la scission tombe donc plus loin que le
  // chiffre de la table, et c'est ce point-la qu'il faut montrer
  const d = arme.scission + CFG.PLAYER_RADIUS + 2;
  const x = me.x + Math.cos(a) * d;
  const y = me.y + Math.sin(a) * d;
  const col = ownerColorOf(myId) ?? COMBAT.bullet;
  const px = -Math.sin(a), py = Math.cos(a);
  ctx.save();
  ctx.strokeStyle = alpha(col, 0.22);
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 7]);
  ctx.beginPath();
  ctx.arc(me.x, me.y, d, a - 0.42, a + 0.42);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = alpha(col, 0.55);
  ctx.beginPath();
  ctx.moveTo(x + px * 6, y + py * 6);
  ctx.lineTo(x + px * 17, y + py * 17);
  ctx.moveTo(x - px * 6, y - py * 6);
  ctx.lineTo(x - px * 17, y - py * 17);
  ctx.stroke();
  ctx.restore();
}

export function drawVisee(playerList) {
  const me = playerList?.find(p => p.id === myId);
  if (!me || me.downed) return;
  const arme = ARMES[me.arme];
  if (arme?.scission) { drawScission(me, arme); return; }
  if (arme?.tir !== "grenade") return;

  const max = porteeArme(me, arme);
  const dx = mouse.x - me.x, dy = mouse.y - me.y;
  const d = Math.hypot(dx, dy) || 1;
  const trop = d > max;
  const k = trop ? max / d : 1;
  const x = me.x + dx * k, y = me.y + dy * k;
  const r = arme.souffle ?? CARD_CFG.GRENADE_RADIUS;
  // sature quand le reticule depasse ce que l'arme porte : la grenade tombera
  // ici et pas sous le curseur
  const col = trop ? SIGNAL.warn : (ownerColorOf(myId) ?? COMBAT.bullet);

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = alpha(col, trop ? 0.75 : 0.4);
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = alpha(col, trop ? 0.9 : 0.55);
  ctx.beginPath();
  ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y);
  ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9);
  ctx.stroke();
  ctx.restore();
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

// LE SENS D'UN LIEN EST UNE INFORMATION DE JEU, et un trait ne le porte pas.
// Les perles courent le long du trace : du soigneur vers l'allie pour le soin,
// de la proie vers le soigneur pour le siphon, vers l'ancre pour une chaine.
// Elles se calculent SANS ALLOCATION — position = fonction de l'indice, du temps
// et de la longueur cumulee, comme les croix du sanctuaire.
function arcFlow(pts, cut, { col, hz, n, size, sens }) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    if (i === cut) continue;
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  if (total < 1) return;

  const t = performance.now() / 1000;
  ctx.fillStyle = col;
  for (let b = 0; b < n; b++) {
    let u = ((t * hz + b / n) % 1);
    if (sens < 0) u = 1 - u;
    // les perles s'estompent aux deux bouts : elles NAISSENT du porteur au lieu
    // d'apparaitre en l'air.
    const fondu = Math.sin(u * Math.PI);
    if (fondu <= 0.02) continue;
    let reste = u * total;
    for (let i = 1; i < pts.length; i++) {
      if (i === cut) continue;
      const ax = pts[i - 1][0], ay = pts[i - 1][1];
      const seg = Math.hypot(pts[i][0] - ax, pts[i][1] - ay);
      if (reste > seg) { reste -= seg; continue; }
      const k = seg > 0 ? reste / seg : 0;
      ctx.globalAlpha = fondu;
      ctx.beginPath();
      ctx.arc(ax + (pts[i][0] - ax) * k, ay + (pts[i][1] - ay) * k,
              size * (0.5 + fondu * 0.5), 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.globalAlpha = 1;
}

export function drawArc(key, x0, y0, x1, y1, {
  col, coeur, amp = 0.06, width = 1.8, branches = 1, cut = 0, pinch = true,
  flow = null,
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

  if (flow) {
    arcFlow(a.abs, a.cut, {
      col: alpha(flow.col ?? coeur, 0.95), hz: flow.hz ?? 0.8,
      n: flow.n ?? 3, size: flow.size ?? width * 1.3, sens: flow.sens ?? 1,
    });
  }

  // les deux points brillants ANCRENT l'arc sur ce qu'il relie
  ctx.fillStyle = alpha(coeur, 0.9);
  for (const [px, py] of [[x0, y0], [x1, y1]]) {
    ctx.beginPath();
    ctx.arc(px, py, width * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* L'ARC FINAL D'UN RELAIS. La donnee vit dans `fx.js` avec le reste de la mort ;
   le TRACE vit ici, parce que `drawArc` est d'une couche plus haute et qu'un
   module n'importe que vers le bas. Meme partage que `bursts` : `fx.js` decide
   qu'il y a quelque chose a dire, `actors.js` sait le dire.
   L'arc s'efface en RACINE : la rupture est franche, l'extinction ne l'est pas. */
export function drawFinArcs() {
  if (finArcs.length === 0) return;
  const now = performance.now();
  for (let i = finArcs.length - 1; i >= 0; i--) {
    const a = finArcs[i];
    const k = (now - a.at) / a.dur;
    if (k >= 1) { finArcs[i] = finArcs[finArcs.length - 1]; finArcs.pop(); continue; }
    if (!inView(a.x, a.y, 60) && !inView(a.x2, a.y2, 60)) continue;
    ctx.globalAlpha = Math.sqrt(1 - k);
    drawArc(`f${a.at}${i}`, a.x, a.y, a.x2, a.y2, {
      col: FX.ricochet, coeur: FX.ricochetCore, amp: 0.11, width: 1.6,
      branches: 2, cut: 0.6,
    });
    ctx.globalAlpha = 1;
  }
}

const BRAISES_PAR_IMAGE = 8;
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
const SHOOTER_RECOIL = 160;
function enemyFrame(e, t, def, ctxInfo) {
  const base = `e${e.type}_`;

  if (e.type === 4 && e.hp / e.maxHp < 0.12) return frameOf(base + "open");

  if (e.type === 5 && e.hp / e.maxHp < 0.4) return frameOf(base + "open");

  if (e.type === 6 && ctxInfo?.blocked) return frameOf(base + "open");

  if (e.type === 8 && ctxInfo?.covering) return frameOf(base + "open");

  // CE QUI S'APPRETE SE VOIT, quel que soit le type. La visee n'etait lue que
  // pour le tireur ; le saboteur passe par le meme preavis et restait inerte.
  // Un corps annonce par `wu` et qui ne bouge pas de pose est un preavis qu'on
  // ne peut pas lire, c'est-a-dire pas un preavis.
  if (ctxInfo?.vise && (def.shootCd || def.poseCd)) return frameOf(base + "walkB");

  if (e.type === 3) {
    // LE RECUL RESTE DEDUIT du depart d'une balle : il n'a pas besoin d'une
    // clef, et le serveur ne dit pas « je viens de tirer ».
    const last = shooterFire.get(e.id);
    if (last !== undefined && performance.now() - last < SHOOTER_RECOIL) {
      return frameOf(base + "open");
    }
    return frameOf(base + "idle");
  }

  // TROIS ETATS QUI SE LISENT SUR L'INSTANTANE, SANS UNE CLEF DE PLUS : la
  // coque d'un voisin dit que le generateur travaille, l'appariement dit que le
  // relais tend son arc, et la reserve d'un corps dit qu'il la porte.
  if (def.egideRadius && ctxInfo?.couvre) return frameOf(base + "open");
  if (def.lienRange && e.pair) return frameOf(base + "open");

  const step = Math.floor(t * def.speed / 90) & 1;
  return frameOf(base + (step ? "walkA" : "walkB"));
}
const auraCovered = new Set();
const auraActive = new Set();
// UN GENERATEUR AU TRAVAIL SE VOIT A CE QU'IL PRODUIT, pas a ce qu'il est : on
// ne cherche pas ses voisins, on regarde qui PORTE une coque — `e.shield` est
// deja dans l'instantane depuis le lot 4, et la source est celle qui en couvre
// au moins un.
const egideActive = new Set();
function auraPass(list, diff) {
  auraCovered.clear();
  auraActive.clear();
  egideActive.clear();
  for (const s of list) {
    const d = defDe(s.type, s.elite);
    if (!d.egideRadius) continue;
    const r2 = d.egideRadius * d.egideRadius;
    for (const e of list) {
      if (e === s || !(e.shield > 0)) continue;
      if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 <= r2) { egideActive.add(s.id); break; }
    }
  }
  const src = [];
  for (const e of list) {
    const def = defDe(e.type, e.elite);
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
export function drawSoinLinks(links, players, enemies, sancts = []) {
  if (!links || links.length === 0) return;
  let par = null;
  for (const [src, cible, ennemi, sanct] of links) {
    if (par === null) {
      par = new Map();
      for (const p of players) par.set(p.id, p);
    }
    // dans le dome, le lien part du DOME et non du soigneur : c'est ce qui le
    // libere de rester au centre.
    const a = sanct ? sancts.find(s => s.id === sanct) : par.get(src);
    if (!a) continue;
    const b = ennemi ? enemies.find(e => e.id === cible) : par.get(cible);
    if (!b) continue;
    if (!inView(a.x, a.y, 200) && !inView(b.x, b.y, 200)) continue;
    // le soin coule VERS l'allie, le siphon VERS le soigneur : le meme trace
    // dit deux choses opposees par le seul sens de son flux.
    drawArc(`h${src}:${cible}`, a.x, a.y, b.x, b.y, ennemi
      ? { col: SIGNAL.persist, coeur: FX.ricochetCore, amp: 0.14, width: 2,
          branches: 2, cut: 0.55,
          flow: { col: SIGNAL.persist, hz: 1.5, n: 4, size: 2.6, sens: -1 } }
      : { col: FX.heal, coeur: FX.healSoft, amp: 0.045, width: 2.4,
          branches: 0, cut: 0,
          flow: { col: FX.healSoft, hz: 0.7, n: 3, size: 3.2, sens: 1 } });
  }
}

function drawMedicLinks(list) {
  for (const m of list) {
    if (m.type !== 7) continue;
    if (hits.has(m.id)) continue;
    const def = defDe(7, m.elite);
    let best = null, bd = def.healRange * def.healRange;
    for (const o of list) {
      if (o === m || o.hp >= o.maxHp) continue;
      const d2 = (o.x - m.x) ** 2 + (o.y - m.y) ** 2;
      if (d2 < bd) { bd = d2; best = o; }
    }
    if (!best) continue;
    if (!inView(m.x, m.y, 200) && !inView(best.x, best.y, 200)) continue;
    // un lien qui pend entre deux corps invisibles trahirait la brume
    if (voileBrume(m.x, m.y) <= 0.02 && voileBrume(best.x, best.y) <= 0.02) continue;
    const ca = Math.cos(m.ang ?? 0), sa = Math.sin(m.ang ?? 0);
    const ox = m.x + 8.5 * ca - (-21) * sa;
    const oy = m.y + 8.5 * sa + (-21) * ca;
    drawArc(`m${m.id}`, ox, oy, best.x, best.y, {
      col: ENEMY_TINT[7], coeur: FX.healSoft, amp: 0.05, width: 1.6,
      branches: 1, cut: 0.3,
      flow: { col: ENEMY_TINT[7], hz: 0.8, n: 2, size: 2, sens: 1 },
    });
  }
}
/* L'ARC DU RELAIS EST LA MENACE, donc il se dessine comme une menace et non
   comme un lien de soutien : epais, tendu, sans flux — un flux dit « ceci
   circule dans un sens », et ici rien ne circule, la ligne BLESSE.
   Le serveur donne l'appariement (`pair`) et le remet a zero pendant la charge :
   pas d'arc tant qu'il n'est pas vif, c'est le preavis qui porte cet instant. */
const RELAIS = ENEMY_TYPES.findIndex(t => t.lienRange);
const EGIDE = ENEMY_TYPES.findIndex(t => t.egideRadius);
const BOUCLIER = ENEMY_TYPES.findIndex(t => t.shieldArc);
function drawRelaisArcs(list) {
  if (RELAIS < 0) return;
  const par = new Map();
  for (const e of list) if (e.pair) par.set(e.id, e);
  for (const a of par.values()) {
    const b = par.get(a.pair);
    if (!b || b.pair !== a.id || b.id < a.id) continue;
    const def = defDe(RELAIS, a.elite);
    if (!inView(a.x, a.y, 260) && !inView(b.x, b.y, 260)) continue;
    if (voileBrume(a.x, a.y) <= 0.02 && voileBrume(b.x, b.y) <= 0.02) continue;
    drawArc(`r${a.id}`, a.x, a.y - 16, b.x, b.y - 16, {
      col: ENEMY_TINT[RELAIS], coeur: FX.flash, amp: 0.04,
      width: def.lienLarge * 0.4, branches: 2, cut: 0, pinch: false,
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
  drawRelaisArcs(list);
  const me = view?.playerList?.find(p => p.id === myId);

  // PASSE SEPAREE, et c'est la seule facon correcte : une ombre posee juste
  // avant SON corps tomberait sur le corps deja dessine du voisin. Meme mode de
  // melange que les corps, donc meme lot GL — aucun appel de dessin en plus.
  if (ombresActives()) {
    for (const e of list) {
      if (!inView(e.x, e.y)) continue;
      const v = windup.has(e.id) ? 1 : voileBrume(e.x, e.y);
      if (v <= 0.02) continue;
      const d = defDe(e.type, e.elite);
      drawOmbre(e.x, e.y, e.elite ? d.r * CFG.ELITE_RADIUS_MUL : d.r, v);
    }
  }

  /* CE QUI BRULE, EN PASSE SEPAREE ET POUR LA MEME RAISON QUE LES OMBRES : une
     lueur posee juste avant SON corps tomberait sur le corps deja dessine du
     voisin. Elle passe SOUS les corps — un halo au pourtour, pas un lavis qui
     mange la silhouette.
     LE BUDGET DE BRAISES EST PAR IMAGE, JAMAIS PAR ENNEMI : la brulure se
     PROPAGE (`burnSpread`), donc leur nombre suivrait la horde au lieu de suivre
     l effet. */
  let braises = BRAISES_PAR_IMAGE;
  for (const e of list) {
    if (!(e.burn > 0) && !(e.root > 0)) continue;
    if (!inView(e.x, e.y)) continue;
    const v = windup.has(e.id) ? 1 : voileBrume(e.x, e.y);
    if (v <= 0.02) continue;
    const d = defDe(e.type, e.elite);
    const r = e.elite ? d.r * CFG.ELITE_RADIUS_MUL : d.r;
    // l anneau AVANT la lueur : le sol est sous le corps, la lueur le borde.
    if (e.root > 0) drawEntrave(e.x, e.y, r, Math.min(1, e.root / 0.4), ts, e.id, v);
    if (e.burn > 0) {
      // la part de duree porte l EXTINCTION : la lueur s eteint avec la brulure
      // au lieu de disparaitre d un coup, ce qui aurait dit « purge » — or la
      // brulure va au bout.
      const k = Math.min(1, e.burn * 1.6);
      drawBrulure(e.x, e.y, r, k, ts, e.id, v);
      if (braises > 0 && Math.random() < 0.22 * k && spawnBraise(e.x, e.y, r)) braises--;
    }
  }

  for (const e of list) {
    if (!inView(e.x, e.y)) continue;
    // CE QUI S'ANNONCE PERCE LA BRUME. Un fonceur declenche a 420 px
    // (`DASH_RANGE`), donc dans le voile : son preavis y serait illisible, et
    // un preavis qu'on ne voit pas n'est pas difficile, il est injuste. Le
    // corps qui prend son elan redevient net — c'est aussi la plus belle image
    // que l'effet produise.
    // La brume sort du dessin AVANT tout le reste : a forte densite elle rend
    // aussi des lots de dessin, ce qui n'est pas plus mal.
    const voile = windup.has(e.id) ? 1 : voileBrume(e.x, e.y);
    if (voile <= 0.02) continue;
    const def = defDe(e.type, e.elite);
    const r = e.elite ? def.r * CFG.ELITE_RADIUS_MUL : def.r;

    const hit = hits.get(e.id);
    const flash = hit ? Math.max(0, (hit.until - t) / (HIT_FLASH * 1000)) : 0;
    // le palier module le tressaillement, jamais le rayon : c'est la part de PV
    // retiree qui le porte, donc un colosse encaisse moins qu'un fantassin sous
    // le meme coup sans qu'une table de masse existe.
    const kick = flash > 0 ? HIT_KICK * (hit.kick ?? 1) * Math.min(1, flash) : 0;
    const kx = kick > 0 ? hit.dx * kick : 0;
    const ky = kick > 0 ? hit.dy * kick : 0;
    // [26c] ×1,15 sur deux ou trois images, retour elastique : la reponse est
    // portee par la CIBLE et non par la camera.
    const punch = hit && hit.punch > t
      ? 1 + 0.15 * Math.min(1, (hit.punch - t) / (CRIT_PUNCH * 1000))
      : 1;

    if (e.elite) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 240 + e.id);
      ctx.strokeStyle = ELITE_GOLD;
      ctx.globalAlpha = (0.3 + pulse * 0.35) * voile;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r + 6 + pulse * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // SOUS le corps : les pointes sortent du bord au lieu de barrer la
    // silhouette. Le trace vit dans `fx.js` — le boss porte le meme.
    if (e.vuln > 0) drawVulnerable(e.x, e.y, r, Math.min(1, e.vuln / 0.5), ts, e.id, voile);

    let breath = 1 + 0.03 * Math.sin(ts * BREATH_HZ * Math.PI * 2 + e.id * 1.7);
    let squash = flash > 0 ? 0.12 * flash : 0;

    if (auraCovered.has(e.id)) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 380 + e.id);
      ctx.strokeStyle = ENEMY_TINT[8];
      ctx.globalAlpha = (0.3 + pulse * 0.25) * voile;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r + 10, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // DEUX PREAVIS, DEUX LANGAGES. `wu` porte desormais la ruee ET la visee, et
    // les rendre pareil dirait deux choses differentes avec le meme signe : le
    // ramassement annonce un corps qui VIENT SUR VOUS, la visee un corps qui
    // reste ou il est. Le ramassement garde donc l'ecrasement, la visee n'a que
    // sa pose (`enemyFrame`). Les deux percent la brume — un preavis qu'on ne
    // voit pas n'est pas difficile, il est injuste.
    const ramasse = windup.has(e.id) && !def.shootCd;
    if (ramasse) {
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

    drawSprite(ctx, enemyFrame(e, ts, def, {
      blocked, covering: auraActive.has(e.id), couvre: egideActive.has(e.id),
      vise: windup.has(e.id) }),
      e.x + kx, e.y + ky, {
      angle: e.ang ?? 0,
      scaleX: gain * punch * (1 + squash * 0.5) * (ramasse ? 0.86 : 1),
      scaleY: gain * punch * (1 - squash) * (ramasse ? 1.14 : 1),
      flash,
      flashTint: hit?.col ?? null,
      alpha: voile,
    });

    if (e.hp < e.maxHp) {
      const w = r * 2;
      const tx = e.x - r, ty = e.y - r - 9;
      ctx.globalAlpha = voile;
      ctx.fillStyle = alpha(SURFACE.shadow, 0.45);
      ctx.fillRect(tx, ty, w, 3);
      ctx.fillStyle = e.elite ? ELITE_GOLD : (ENEMY_TINT[e.type] ?? ENEMY_TINT[0]);
      ctx.fillRect(tx, ty, w * (e.hp / e.maxHp), 3);
      ctx.globalAlpha = 1;
    }

    // UNE COQUE SE VOIT SUR LE CORPS QUI LA PORTE, pas sur sa source. Sans ce
    // trait, tuer le generateur d'abord etait une consigne ecrite nulle part :
    // la horde se contentait d'encaisser 52 % de degats en plus sans qu'aucun
    // pixel ne le dise. Un arc OUVERT et non un anneau plein — l'anneau est
    // pris par l'elite et par l'aura du choeur.
    if (e.shield > 0 && egideActive.size > 0) {
      const puls = 0.6 + 0.4 * Math.sin(t / 300 + e.id);
      ctx.strokeStyle = ENEMY_TINT[EGIDE] ?? ENEMY_TINT[0];
      ctx.globalAlpha = (0.35 + puls * 0.3) * voile;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r + 4, -2.2, 2.2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
