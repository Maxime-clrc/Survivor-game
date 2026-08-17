
import { playSound } from "/audio.js";
import { beatPhase, BOSS_CFG, BOSS_FINAL, BOSS_JUMEAUX, BOSS_MATRIARCHE, BOSS_METRONOME, BOSS_ORACLE, BOSS_PRISME, BOSS_RECITANT, BOSS_SILENCE, BOSS_TISSEUR, BOSS_VEILLEUR, MECH_BAIT, MECH_CLUSTER, MECH_COUNT, MECH_FEED, MECH_JAIL, MECH_LINK, MECH_PROX, MECH_SANCTUARY, MECH_SEAL, MECH_SPREAD, MECH_STACK, MECH_TOWER } from "/shared/bosses.js";
import { CARD_CFG } from "/shared/cards.js";
import { t } from "/shared/i18n.js";
import { CLASS_DEFAULT, SKILL_CFG, SKILL_HEAL_MODE, SKILL_OVERDRIVE, SKILL_TAUNT, SKILL_ULT_WIND, classAt } from "/shared/classes.js";
import { BUFF_DAMAGE, BUFF_DOUBLE, BUFF_PIERCE, BUFF_RATE, BUFF_RICOCHET, CFG } from "/shared/game_state.js";
import { BOSS, BOSS_SKIN, CLASS_COLOR, COMBAT, EFFECT_COLOR, FX, HUD, MARK, POWERUP_COLOR, SIGNAL, SURFACE, TEXT, alpha } from "/shared/palette.js";
import { STATUSES, STATUS_DOOM, STATUS_VULN } from "/shared/statuses.js";
import { drawSprite, frameOf } from "/sprites.js";
import { amSpectator, dash, myId, phase, predicted } from "../core/state.js";
import { activeStatuses, bossCue, paintStatusIcon, setBossCue } from "../net/interp.js";
import { drawBombRange } from "./actors.js";
import { RING_BUFF0, RING_SHIELD, RING_SKILL, RING_STATUS, bossFlash, bossHit, lastBossPos, shieldHit } from "./fx.js";
import { aimVector, camera, colorOf, ctx, mouse, nameOf, setCtx, underCtx } from "./stage.js";


const BOSS_RELEASE_MS = 320;
const BOSS_HOLD = 0.22;
function bossPose(now) {
  if (!bossCue) return { gather: 0, burst: 0 };
  const { from, impact } = bossCue;
  if (now < impact) {
    const p = Math.min(1, Math.max(0, (now - from) / Math.max(1, impact - from)));
    return { gather: p * p, burst: 0 };
  }
  const u = (now - impact) / BOSS_RELEASE_MS;
  if (u >= 1) return { gather: 0, burst: 0 };
  if (u < BOSS_HOLD) return { gather: 0, burst: 1 };
  const v = (u - BOSS_HOLD) / (1 - BOSS_HOLD);
  const k = 1 - v;
  return { gather: 0, burst: k * k * Math.cos(v * Math.PI * 1.3) };
}
export function drawBoss(b, bossTm = 0) {
  const r = CFG.BOSS_RADIUS * ((b.kind ?? 0) === BOSS_FINAL ? 1.4 : 1);
  const now = performance.now();
  const t = now / 1000;
  const wounded = 1 - b.hp / b.maxHp;
  lastBossPos.x = b.x; lastBossPos.y = b.y;

  const kind = b.kind ?? 0;
  const K = BOSS_SKIN[kind] ?? BOSS_SKIN[0];
  const twin = b.twin ? 1 : 0;
  const skin = twin ? BOSS.twin : K.skin;
  const dark = twin ? BOSS.twinDark : K.dark;
  const edge = twin ? BOSS.twinEdge : K.edge;

  const { gather, burst } = bossPose(now);

  const dedans = kind === BOSS_FINAL;
  ctx.fillStyle = alpha(skin, 0.10 + burst * (dedans ? -0.04 : 0.10));
  ctx.beginPath();
  ctx.arc(b.x, b.y, r + 22 - gather * 10 + burst * (dedans ? -18 : 26), 0, Math.PI * 2);
  ctx.fill();

  const squash = 1 - gather * 0.09 + burst * (dedans ? -0.10 : 0.12);

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(squash, squash);
  const S = { r, t, skin, dark, edge, wounded, ang: b.ang ?? 0,
              phase: b.phase ?? 0, bars: b.bars ?? 4, tense: gather, burst, twin };
  peindreBoss(kind, S);

  // [27] la meme silhouette, rejouee en clair par-dessus : c'est l'equivalent
  // exact du `flashAtlas` de la horde, pour un corps qui n'est pas dans l'atlas.
  const eclair = bossFlash(now);
  if (eclair > 0) {
    ctx.save();
    ctx.globalAlpha = eclair * 0.8;
    ctx.globalCompositeOperation = "lighter";
    peindreBoss(kind, { ...S, skin: COMBAT.flash, dark: COMBAT.flash,
                        edge: COMBAT.flash });
    ctx.restore();
  }

  ctx.restore();

  // le METRONOME, deuxieme couche : l'anneau se contracte sur le temps et
  // CLAQUE au quatrieme. Meme horloge que les temoins du HUD, celle de `tm`.
  if (kind === BOSS_METRONOME && !twin) {
    const { temps, k } = beatPhase(bossTm);
    const fort = temps === 3;
    const col = fort ? SIGNAL.lethal : SIGNAL.go;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = alpha(col, fort ? 0.30 + 0.5 * k : 0.22);
    ctx.lineWidth = fort ? 2 + 4 * k : 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 30 + (1 - k) * 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // le PALIER : aucune invulnerabilite invisible. L'enveloppe blanche pulse sur
  // toute sa duree — le blanc ne dit que ca.
  const pal = b.palier ?? 0;
  if (pal > 0) {
    const puls = 0.55 + 0.45 * Math.sin(t * 7.5);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = alpha(COMBAT.flash, 0.30 + 0.35 * puls);
    ctx.lineWidth = 3 + puls * 2.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 14 + puls * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = alpha(COMBAT.flash, 0.12 + 0.10 * puls);
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 22 + puls * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(squash, squash);
  if (wounded > 0.2) {
    ctx.strokeStyle = alpha(BOSS.crack, Math.min(1, wounded));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.2); ctx.lineTo(-r * 0.1, r * 0.15); ctx.lineTo(r * 0.5, -r * 0.35);
    ctx.stroke();
  }
  ctx.restore();
}
function peindreBoss(kind, S) {
  switch (kind) {
    case BOSS_MATRIARCHE: drawBossMatriarche(S); break;
    case BOSS_METRONOME:  drawBossMetronome(S); break;
    case BOSS_ORACLE:     drawBossOracle(S); break;
    case BOSS_JUMEAUX:    drawBossJumeaux(S); break;
    case BOSS_FINAL:      drawBossFinal(S); break;
    case BOSS_VEILLEUR:   drawBossVeilleur(S); break;
    case BOSS_TISSEUR:    drawBossTisseur(S); break;
    case BOSS_PRISME:     drawBossPrisme(S); break;
    case BOSS_RECITANT:   drawBossRecitant(S); break;
    case BOSS_SILENCE:    drawBossSilence(S); break;
    default:              drawBossRavageur(S);
  }
}
export function bossSheet() {
  const r = CFG.BOSS_RADIUS;
  const pas = (r + 26) * 2;
  const poses = [0, 1, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10];
  const c = document.createElement("canvas");
  c.width = pas * poses.length;
  c.height = pas;
  const g = c.getContext("2d");

  const garde = ctx;
  setCtx(g);
  const gardeCue = bossCue;
  setBossCue(null);
  const gardeHit = bossHit.at;
  bossHit.at = 0;
  poses.forEach((kind, i) => {
    drawBoss({
      kind, x: pas * i + pas / 2, y: pas / 2, ang: 0,
      hp: 100, maxHp: 100, bars: 4,
      phase: kind === BOSS_FINAL ? 4 : 0,
      twin: kind === BOSS_JUMEAUX && i === 5 ? 1 : 0,
    });
  });
  setCtx(garde);
  setBossCue(gardeCue);
  bossHit.at = gardeHit;

  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "#000000";
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-over";
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
function drawBossRavageur(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  ctx.save();
  ctx.rotate(t * 0.6 + burst * 0.24);
  ctx.fillStyle = dark;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const out = r + 14 - tense * 10 + burst * 20;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * out, Math.sin(a) * out);
    ctx.lineTo(Math.cos(a + 0.16) * r, Math.sin(a + 0.16) * r);
    ctx.lineTo(Math.cos(a - 0.16) * r, Math.sin(a - 0.16) * r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.rotate(S.ang);
  const breath = 1 + Math.sin(t * 1.8) * 0.03;
  ctx.scale(breath, 1 / breath);

  ctx.fillStyle = skin;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(r * 0.35, 0, r * 0.34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(r * 0.42, 0, r * 0.17, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawBossMatriarche(S) {
  const { r, t, skin, dark, edge, phase, bars, tense, burst } = S;
  ctx.save();
  ctx.rotate(S.ang);

  ctx.fillStyle = dark;
  const legs = [[-0.75, 0.55], [0.55, 0.75], [2.35, 0.6], [3.6, 0.8]];
  for (const [a0, len] of legs) {
    const a = a0 + Math.sin(t * 1.4 + a0) * 0.07;
    const out = r * (1 + len) * (1 - tense * 0.12 + burst * 0.22);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.22) * r * 0.9, Math.sin(a - 0.22) * r * 0.9);
    ctx.lineTo(Math.cos(a) * out, Math.sin(a) * out);
    ctx.lineTo(Math.cos(a + 0.22) * r * 0.9, Math.sin(a + 0.22) * r * 0.9);
    ctx.closePath();
    ctx.fill();
  }

  const pulse = 1 + Math.sin(t * 2.2) * 0.04;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, 0, r * 1.05 * pulse, r * 0.78 / pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = alpha(edge, 0.7);
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    const x = -r * 0.85 + i * r * 0.42;
    ctx.beginPath();
    ctx.ellipse(x, 0, r * 0.1, r * 0.7 * Math.sqrt(1 - (i - 2) * (i - 2) * 0.1), 0,
      -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }

  const pockets = Math.max(1, bars - phase);
  for (let i = 0; i < pockets; i++) {
    const a = -1.1 + (i / Math.max(1, pockets - 1 || 1)) * 2.2;
    const px = Math.cos(a) * r * 0.55 - r * 0.15;
    const py = Math.sin(a) * r * 0.42;
    const k = (1 + Math.sin(t * 2.2 + i * 1.3 + Math.PI) * 0.18) * (1 - burst * 0.38);
    ctx.fillStyle = alpha(BOSS.eye, 0.85);
    ctx.beginPath(); ctx.arc(px, py, r * 0.15 * k, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(edge, 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(r * 0.95, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(r * 0.98, 0, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawBossMetronome(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  const rings = [
    { rad: r * 1.05, w: 5, spin: 1.0, tilt: 0.0, col: dark },
    { rad: r * 0.78, w: 4, spin: -1.6, tilt: 0.7, col: skin },
    { rad: r * 0.5, w: 3, spin: 2.7, tilt: 1.4, col: skin },
  ];
  const kick = 1 - tense * 0.1 + burst * 0.16;
  for (const ring of rings) {
    ctx.save();
    ctx.rotate(t * ring.spin + burst * 0.30 * ring.spin);
    ctx.scale(1, 0.42 + 0.58 * Math.abs(Math.cos(t * ring.spin * 0.5 + ring.tilt)));
    ctx.strokeStyle = ring.col;
    ctx.lineWidth = ring.w;
    ctx.beginPath(); ctx.arc(0, 0, ring.rad * kick, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = edge;
    ctx.beginPath(); ctx.arc(ring.rad * kick, 0, ring.w * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = alpha(BOSS.eye, Math.min(1, 0.5 + tense * 0.5 + burst * 0.5));
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.14 * (1 + burst * 0.45), 0, Math.PI * 2); ctx.stroke();
}
function drawBossOracle(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  for (let i = 0; i < 2; i++) {
    const spin = t * (0.5 + i * 0.35) + i * 2.1;
    const off = r * (0.18 + i * 0.1) * (1 - tense);
    ctx.save();
    ctx.rotate(S.ang + Math.sin(t * 0.6 + i) * 0.3);
    ctx.translate(Math.cos(spin) * off, Math.sin(spin) * off);
    ctx.strokeStyle = alpha(i === 0 ? skin : dark, 0.9);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.15 - i * 0.22) * (1 - tense * 0.12 + burst * 0.20),
      0.5, Math.PI * 2 - 0.5);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.rotate(S.ang);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lit = tense > 0 ? 1 : (Math.sin(t * 2 - i * 1.05) > 0.7 ? 1 : 0);
    ctx.strokeStyle = alpha(BOSS.eye,
      (0.25 + lit * 0.75) * (1 - Math.max(0, burst) * 0.85));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.44);
    ctx.lineTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
    ctx.stroke();
  }
  ctx.restore();

  const eyeR = r * 0.34 * (1 - tense * 0.25 + burst * 0.40);
  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, 0, eyeR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath();
  ctx.arc(Math.cos(S.ang) * eyeR * 0.45, Math.sin(S.ang) * eyeR * 0.45,
    eyeR * 0.42, 0, Math.PI * 2);
  ctx.fill();
}
function drawBossJumeaux(S) {
  const { r, t, skin, dark, edge, twin, tense, burst } = S;
  const side = twin ? 1 : -1;

  ctx.save();
  ctx.rotate(S.ang);
  ctx.rotate(Math.sin(t * 1.3 + (twin ? Math.PI : 0)) * (0.09 + Math.max(0, burst) * 0.11));

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, 0, r, side > 0 ? -Math.PI / 2 : Math.PI / 2,
    side > 0 ? Math.PI / 2 : -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = twin ? skin : dark;
  for (let i = -1; i <= 1; i++) {
    const y = i * r * 0.45;
    ctx.beginPath();
    ctx.arc(0, y, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.lineTo(0, r);
  ctx.stroke();

  const ex = side * r * (0.42 + Math.max(0, burst) * 0.10);
  ctx.fillStyle = BOSS.maw;
  ctx.beginPath();
  ctx.arc(ex, 0, r * 0.3 * (1 - tense * 0.2 + burst * 0.35), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(ex, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawBossFinal(S) {
  const { r, t, skin, dark, edge, tense, burst, phase } = S;

  const orbite = r * (1.02 + tense * 0.10 - Math.max(0, burst) * 0.34);
  const eveilles = Math.max(1, Math.min(5, phase + 1));

  ctx.save();
  ctx.rotate(S.ang * 0.35 + t * 0.22);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const on = i < eveilles;
    ctx.save();
    ctx.translate(Math.cos(a) * orbite, Math.sin(a) * orbite);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = on ? skin : dark;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2.5;
    const f = r * 0.34;

    ctx.beginPath();
    switch (i) {
      case 0:
        ctx.moveTo(0, -f * 1.25); ctx.lineTo(f * 0.62, f * 0.7); ctx.lineTo(-f * 0.62, f * 0.7);
        ctx.closePath();
        break;
      case 1:
        ctx.ellipse(0, 0, f * 0.72, f * 1.05, 0, 0, Math.PI * 2);
        break;
      case 2:
        ctx.arc(0, 0, f * 0.9, 0.6, Math.PI * 2 - 0.6);
        break;
      case 3:
        ctx.moveTo(0, -f); ctx.lineTo(f * 0.7, 0); ctx.lineTo(0, f); ctx.lineTo(-f * 0.7, 0);
        ctx.closePath();
        break;
      default:
        ctx.arc(0, 0, f * 0.95, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();
    }
    if (i !== 2 && on) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  const eclat = Math.max(0, burst);
  ctx.fillStyle = alpha(skin, 0.18 + eclat * 0.72);
  ctx.beginPath();
  ctx.arc(0, 0, r * (0.16 + tense * 0.10 + eclat * 0.28), 0, Math.PI * 2);
  ctx.fill();
}
function drawBossVeilleur(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  ctx.save();
  ctx.rotate(S.ang * 0.2);
  const breath = 1 + Math.sin(t * 1.6) * 0.02;
  ctx.scale(0.5 * breath, 1.15 / breath);
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.3); ctx.lineTo(r * 0.7, -r * 0.4); ctx.lineTo(r * 0.7, r * 0.4);
  ctx.lineTo(0, r * 1.3); ctx.lineTo(-r * 0.7, r * 0.4); ctx.lineTo(-r * 0.7, -r * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const lidClose = tense;
  const pupil = r * (0.30 + Math.max(0, burst) * 0.22);

  ctx.save();
  ctx.rotate(S.ang);
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.60, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(0, 0, pupil, 0, Math.PI * 2); ctx.fill();

  if (lidClose > 0.01) {
    const h = r * 1.8 * lidClose;
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -r * 0.9); ctx.lineTo(r * 0.9, -r * 0.9);
    ctx.lineTo(r * 0.9, -r * 0.9 + h); ctx.lineTo(-r * 0.9, -r * 0.9 + h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.9); ctx.lineTo(r * 0.9, r * 0.9);
    ctx.lineTo(r * 0.9, r * 0.9 - h); ctx.lineTo(-r * 0.9, r * 0.9 - h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function drawBossTisseur(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  const spread = r * (1.15 + tense * 0.06 + Math.max(0, burst) * 0.34);
  const tips = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.35;
    tips.push({ x: Math.cos(a) * spread, y: Math.sin(a) * spread, a });
  }

  ctx.save();
  ctx.strokeStyle = alpha(dark, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const p0 = tips[i], p1 = tips[(i + 1) % 6];
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
  }
  ctx.stroke();

  ctx.fillStyle = dark;
  for (const p of tips) {
    const w = r * 0.10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(p.x + Math.cos(p.a + Math.PI / 2) * w, p.y + Math.sin(p.a + Math.PI / 2) * w);
    ctx.lineTo(p.x * 1.06, p.y * 1.06);
    ctx.lineTo(p.x + Math.cos(p.a - Math.PI / 2) * w, p.y + Math.sin(p.a - Math.PI / 2) * w);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.rotate(S.ang);
  ctx.fillStyle = skin;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.cos(a) * r * 0.55, py = Math.sin(a) * r * 0.55;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.12 * (1 + Math.max(0, burst) * 0.4), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawBossPrisme(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  for (let i = 0; i < 2; i++) {
    const spin = t * (0.7 + i * 0.4) + i * Math.PI;
    const off = r * (0.9 - tense * 0.55) * (1 - i * 0.15);
    const rad = r * (0.85 - i * 0.12);
    ctx.save();
    ctx.translate(Math.cos(spin) * off, Math.sin(spin) * off);
    ctx.rotate(spin * 1.4);
    ctx.strokeStyle = alpha(i === 0 ? skin : dark, 0.55 + tense * 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k / 3) * Math.PI * 2;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(S.ang);
  const rad = r * (1 + Math.max(0, burst) * 0.10);
  ctx.fillStyle = skin;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k / 3) * Math.PI * 2;
    const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
    k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawBossRecitant(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  const spin = t * 0.18;
  const active = Math.floor((spin / (Math.PI * 2)) * 5) % 5;

  ctx.save();
  ctx.rotate(S.ang * 0.15 + spin);
  for (let i = 0; i < 5; i++) {
    const a0 = (i / 5) * Math.PI * 2;
    const a1 = ((i + 1) / 5) * Math.PI * 2;
    const on = i === active;
    const rad = r * (0.96 + (on ? Math.max(0, burst) * 0.08 : 0) - tense * 0.05);
    ctx.fillStyle = on ? alpha(skin, 0.9 + burst * 0.1) : dark;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, rad, a0, a1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2); ctx.stroke();

  ctx.save();
  ctx.rotate(S.ang);
  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.14 * (1 + Math.max(0, burst) * 0.4), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawBossSilence(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  ctx.save();
  ctx.rotate(S.ang * 0.1);
  const breath = 1 + Math.sin(t * 0.9) * 0.015;
  ctx.scale(breath, 1 / breath);
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, -r * 0.55); ctx.lineTo(r * 0.86, 0);
  ctx.lineTo(r * 0.7, r * 0.55); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, r * 0.55);
  ctx.lineTo(-r * 0.86, 0); ctx.lineTo(-r * 0.7, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = alpha(skin, 0.10 + Math.max(0, burst) * 0.20);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.35); ctx.lineTo(r * 0.35, 0); ctx.lineTo(0, r * 0.35); ctx.lineTo(-r * 0.35, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const h = r * 0.06 * (1 - tense) + 0.4;
  ctx.save();
  ctx.rotate(S.ang);
  ctx.fillStyle = BOSS.maw;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -h); ctx.lineTo(r * 0.62, -h); ctx.lineTo(r * 0.62, h); ctx.lineTo(-r * 0.62, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = alpha(BOSS.eye, (1 - tense) * (0.6 + Math.max(0, burst) * 0.4));
  ctx.beginPath();
  ctx.moveTo(-r * 0.14, -h * 0.6); ctx.lineTo(r * 0.14, -h * 0.6);
  ctx.lineTo(r * 0.14, h * 0.6); ctx.lineTo(-r * 0.14, h * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
const MARK_GO = SIGNAL.go;
const MARK_AWAY = SIGNAL.lethal;
const MARK_BREAK = SIGNAL.warn;
function markHalo(x, y, r, col, t) {
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.6 + i * 0.5) % 1;
    ctx.strokeStyle = alpha(col, 0.30 * ph);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(8, r * (1.05 - ph * 0.4)), 0, Math.PI * 2);
    ctx.stroke();
  }
}
export function drawMarkColumns(marks, sec) {
  for (const m of marks) {
    if (m.mech !== MECH_TOWER && m.mech !== MECH_COUNT
        && m.mech !== MECH_STACK && m.mech !== MECH_SANCTUARY
        && m.mech !== MECH_SEAL) continue;
    const ok = m.mech === MECH_SANCTUARY
      || (m.mech === MECH_COUNT ? m.cur === m.need : m.cur >= 1);
    const col = ok ? MARK.ok : MARK_GO;
    const h = 110 + Math.sin(sec * 2.2) * 8;
    const g = ctx.createLinearGradient(m.x, m.y, m.x, m.y - h);
    g.addColorStop(0, alpha(col, 0.50));
    g.addColorStop(1, alpha(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(m.x - 3, m.y - h, 6, h);
  }
}
export function drawMarks(marks, players) {
  if (!marks.length) return;
  const byId = new Map(players.map(p => [p.id, p]));
  // JAMAIS `t` ICI : c'est le nom du point de passage de la traduction, importe
  // en tete de module. Une horloge locale qui le masque transforme chaque
  // `t("mark.…")` en TypeError, donc en image entiere perdue.
  const sec = performance.now() / 1000;

  for (const m of marks) {
    const pulse = 0.55 + 0.45 * Math.sin(sec * 5);
    switch (m.mech) {
      case MECH_STACK: {
        const k = 1 - m.k;
        ctx.fillStyle = alpha(SIGNAL.go, 0.05 + k * k * 0.22);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        markHalo(m.x, m.y, m.r, MARK_GO, sec);
        ctx.strokeStyle = MARK_GO;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        markLabel(m.x, m.y - m.r - 10, t("mark.stack", "REGROUPEMENT"), MARK_GO);
        break;
      }
      case MECH_SPREAD: {
        ctx.strokeStyle = alpha(FX.nova, 0.35 + 0.35 * (1 - m.k));
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        for (const p of players) {
          if (p.downed) continue;
          ctx.beginPath(); ctx.arc(p.x, p.y, m.r / 2, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.setLineDash([]);
        break;
      }
      case MECH_SEAL:
      case MECH_TOWER:
      case MECH_COUNT: {
        const ok = m.mech === MECH_COUNT ? m.cur === m.need : m.cur >= 1;
        const col = ok ? MARK.ok : MARK_GO;
        ctx.fillStyle = ok ? alpha(FX.heal, 0.14) : alpha(SIGNAL.go, 0.10);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        markHalo(m.x, m.y, m.r, col, sec);
        ctx.strokeStyle = col;
        ctx.lineWidth = ok ? 4 : 2;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        ctx.textAlign = "center";
        ctx.font = "700 26px ui-monospace, Menlo, Consolas, monospace";
        ctx.lineWidth = 4;
        ctx.strokeStyle = alpha(SURFACE.void, 0.8);
        const compte = m.mech === MECH_COUNT ? `${m.cur}/${m.need}` : `${m.cur}`;
        ctx.strokeText(compte, m.x, m.y + 9);
        ctx.fillStyle = col;
        ctx.fillText(compte, m.x, m.y + 9);
        if (m.mech === MECH_SEAL) {
          ctx.strokeStyle = alpha(col, 0.5 + 0.5 * pulse);
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 9, 0, Math.PI * 2); ctx.stroke();
          markLabel(m.x, m.y - m.r - 18, t("mark.seal", "SCEAU"), col);
        }
        break;
      }
      case MECH_LINK: {
        const a = byId.get(m.a), b = byId.get(m.b);
        if (!a || !b) break;
        ctx.strokeStyle = MARK_AWAY;
        ctx.lineWidth = 3 + pulse * 2;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.globalAlpha = 1;
        markLabel((a.x + b.x) / 2, (a.y + b.y) / 2 - 16,
          t("mark.spread", "ÉCARTEZ-VOUS"), MARK_AWAY);
        break;
      }
      case MECH_JAIL: {
        ctx.strokeStyle = MARK_BREAK;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI;
          ctx.moveTo(m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r);
          ctx.lineTo(m.x - Math.cos(a) * m.r, m.y - Math.sin(a) * m.r);
        }
        ctx.stroke();
        markGauge(m.x, m.y + m.r + 8, m.hp, MARK_BREAK);
        markLabel(m.x, m.y - m.r - 10, t("mark.free", "LIBÈRE-LE"), MARK_BREAK);
        break;
      }
      case MECH_CLUSTER: {
        ctx.fillStyle = alpha(FX.elite, 0.25 + pulse * 0.25);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = MARK_BREAK;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = MARK.bait;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r + 7, -Math.PI / 2, -Math.PI / 2 + m.k * Math.PI * 2);
        ctx.stroke();
        markGauge(m.x, m.y + m.r + 12, m.hp, MARK_BREAK);
        break;
      }
      case MECH_FEED: {
        ctx.strokeStyle = alpha(FX.heal, 0.5 + pulse * 0.4);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(lastBossPos.x, lastBossPos.y);
        ctx.stroke();
        ctx.strokeStyle = MARK.ok;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case MECH_BAIT: {
        ctx.strokeStyle = alpha(MARK.bait, 0.4 + pulse * 0.4);
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(m.x, m.y, CFG.PLAYER_RADIUS + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case MECH_SANCTUARY: {
        ctx.fillStyle = alpha(FX.heal, 0.16);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        markHalo(m.x, m.y, m.r, MARK.ok, sec);
        ctx.strokeStyle = MARK.ok;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case MECH_PROX: {
        const g = ctx.createRadialGradient(m.x, m.y, 10, m.x, m.y, m.r);
        g.addColorStop(0, alpha(BOSS.skin, 0.45));
        g.addColorStop(1, alpha(BOSS.skin, 0.02));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        break;
      }
      default: break;
    }
  }
}
// ── LE REGARD ───────────────────────────────────────────────────────────────
// LA SEULE MECANIQUE DONT LA REPONSE N'EST PAS SPATIALE. Toutes les autres
// disent « va la », et un telegraphe au sol suffit ; celle-ci dit « oriente ta
// visee autrement » — aucun marquage au sol ne peut l'exprimer. Elle a donc son
// propre canal : quatre couches portant le MEME signe, l'oeil barre, pour qu'il
// s'apprenne en une fois. La barre dit l'interdiction, jamais la couleur seule.
const GAZE_DEMI = Math.acos(BOSS_CFG.GAZE_COS);
const GAZE_PULSES = 4;
const GAZE_FLASH_MS = 420;
const GAZE_CONE = 300;
const GAZE_EYE = 118;
// l'oeil ne se pose PAS sur le personnage : la camera le tient au centre de la
// vue, un signe centre l'effacerait au moment ou il faut le lire.
const GAZE_EYE_Y = -0.26;
const gz = { actif: false, ouvert: false, k: 0, batt: 0, vise: false,
             cur: 0, max: 0, until: 0, flash: 0 };

function gazeFlashK() {
  if (!gz.flash) return 0;
  const e = (performance.now() - gz.flash) / GAZE_FLASH_MS;
  if (e >= 1) { gz.flash = 0; return 0; }
  return 1 - e;
}

// le decompte serveur arrive par paliers de tick : on le suit par une ECHEANCE
// lissee, sinon le tempo de la pulsation escalierait a la cadence reseau.
function gazeEtat(b) {
  const cur = b?.gazeWarn ?? 0;
  const ouvert = (b?.gaze ?? 0) > 0;
  const now = performance.now();
  if (cur <= 0) {
    // le son ACCELERE la lecture, il ne porte aucune information exclusive :
    // les quatre couches sont visuelles.
    if (gz.cur > 0 && !ouvert) { gz.flash = now; playSound("balayage", { force: 0.55 }); }
    gz.cur = 0; gz.max = 0; gz.until = 0;
    gz.actif = ouvert;
    gz.ouvert = ouvert;
    gz.k = ouvert ? 1 : 0;
    if (!ouvert) gz.vise = false;
    return;
  }
  if (gz.cur <= 0 || cur > gz.max) { gz.max = cur; gz.until = now + cur * 1000; }
  else gz.until += (now + cur * 1000 - gz.until) * 0.15;
  gz.cur = cur;
  gz.actif = true;
  gz.ouvert = false;
  gz.k = Math.max(0, Math.min(1, 1 - (gz.until - now) / (gz.max * 1000)));
}

// le tempo REMPLACE le chiffre : on sent l'echeance sans la lire. Il accelere
// en carre, et la derniere pulsation nait a l'instant de la resolution.
function gazeBatt() {
  return gz.ouvert
    ? (performance.now() / 700) % 1
    : ((1 - (1 - gz.k) ** 2) * GAZE_PULSES) % 1;
}

function oeilPath(s) {
  const h = s * 0.62;
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.quadraticCurveTo(0, -h * 2, s, 0);
  ctx.quadraticCurveTo(0, h * 2, -s, 0);
  ctx.closePath();
}
function oeilBarre(s) {
  const h = s * 0.62;
  oeilPath(s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.98, h * 0.98);
  ctx.lineTo(s * 0.98, -h * 0.98);
  ctx.stroke();
}

// COUCHE 1 · la pulsation d'arene. Elle dit « quelque chose se passe » a
// quelqu'un qui regarde ailleurs. FAIBLE OPACITE OBLIGATOIRE, et dessinee AVANT
// tout telegraphe au sol : en cauchemar `parPhase` en superpose deux, et une
// onde qui masque un telegraphe transforme une mecanique lisible en piege.
export function drawGazeArene(v) {
  gazeEtat(v.boss);
  gz.batt = gazeBatt();
  const fl = gazeFlashK();
  const b = v.boss;
  if (!b || (!gz.actif && fl <= 0)) return;

  const rMax = Math.hypot(CFG.VIEW_W, CFG.VIEW_H) * 0.8;
  const monte = 0.45 + 0.55 * gz.k;
  for (let i = 0; i < 2; i++) {
    // a la resolution les ondes rentrent au lieu de sortir : l'effondrement est
    // ce qui dit « c'est passe », meme a ceux qui ont reussi.
    const w = fl > 0 ? fl * (1 - i * 0.35) : (gz.batt + i * 0.5) % 1;
    const r = w * rMax;
    if (r < 40) continue;
    const a = (fl > 0 ? 0.20 * fl : 0.10 * (1 - w) * monte);
    ctx.strokeStyle = alpha(SIGNAL.lethal, a);
    ctx.lineWidth = 2 + 4 * (1 - w);
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.stroke();

    ctx.lineWidth = 1.6;
    for (let j = 0; j < 8; j++) {
      const ang = (j / 8) * Math.PI * 2 + w * 0.5;
      ctx.save();
      ctx.translate(b.x + Math.cos(ang) * r, b.y + Math.sin(ang) * r);
      ctx.rotate(ang + Math.PI / 2);
      ctx.strokeStyle = alpha(SIGNAL.lethal, a * 1.6);
      oeilBarre(13);
      ctx.restore();
    }
  }
}

// COUCHE 4 · le secteur interdit, ancre sur le joueur. Demi-angle
// `acos(GAZE_COS)`, exactement le seuil que le serveur teste : le joueur n'a
// plus a deviner s'il « regarde », il le VOIT, et il sait de combien il doit
// encore tourner. C'est l'avantage qu'un MMO n'a pas — la visee y est implicite.
export function drawGazeCone(v) {
  if (!gz.actif) return;
  const b = v.boss;
  const me = predicted ?? v.playerList.find(p => p.id === myId);
  const moi = v.playerList.find(p => p.id === myId);
  if (!b || !me || !moi || moi.downed || amSpectator) { gz.vise = false; return; }

  const dx = b.x - me.x, dy = b.y - me.y;
  const d = Math.hypot(dx, dy) || 1;
  const aim = aimVector();
  const vise = (aim.ax * dx + aim.ay * dy) / d >= BOSS_CFG.GAZE_COS;
  gz.vise = vise;

  const ang = Math.atan2(dy, dx);
  const col = vise ? SIGNAL.lethal : SURFACE.lineSoft;
  const g = ctx.createRadialGradient(me.x, me.y, CFG.PLAYER_RADIUS,
                                     me.x, me.y, GAZE_CONE);
  g.addColorStop(0, alpha(col, vise ? 0.24 : 0.09));
  g.addColorStop(1, alpha(col, 0));
  ctx.beginPath();
  ctx.moveTo(me.x, me.y);
  ctx.arc(me.x, me.y, GAZE_CONE, ang - GAZE_DEMI, ang + GAZE_DEMI);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = alpha(col, vise ? 0.85 : 0.32);
  ctx.lineWidth = vise ? 2.5 : 1.5;
  ctx.stroke();

  // le reticule porte le meme verdict, en continu : c'est lui qu'on regarde.
  ctx.lineWidth = vise ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 12, 0, Math.PI * 2);
  ctx.stroke();
  if (vise) {
    ctx.beginPath();
    ctx.moveTo(mouse.x - 9, mouse.y + 9);
    ctx.lineTo(mouse.x + 9, mouse.y - 9);
    ctx.stroke();
  }
}

// COUCHES 2 et 3 · la vignette d'ecran et l'oeil barre. De l'espace ECRAN, donc
// impossible a manquer quelle que soit la position de la camera, et ca n'occupe
// aucun pixel de jeu. Le remplissage de l'oeil EST le compte a rebours ; son
// etat dit ce que fait le joueur : eteint et sourd quand la visee est detournee,
// vif et rouge quand elle ne l'est pas.
export function drawGazeEcran() {
  const fl = gazeFlashK();
  if (!gz.actif && fl <= 0) return;

  const cx = camera.x0 + CFG.VIEW_W / 2, cy = camera.y0 + CFG.VIEW_H / 2;
  const rv = Math.hypot(CFG.VIEW_W, CFG.VIEW_H) / 2;
  const batt = 0.55 + 0.45 * Math.sin(gz.batt * Math.PI * 2);

  const amt = gz.actif ? (0.16 + 0.26 * gz.k) * batt : 0;
  const g = ctx.createRadialGradient(cx, cy, rv * 0.40, cx, cy, rv);
  g.addColorStop(0, alpha(SIGNAL.lethal, 0));
  g.addColorStop(1, alpha(SIGNAL.lethal, Math.min(0.55, amt + fl * 0.35)));
  ctx.fillStyle = g;
  ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);

  if (fl > 0) {
    ctx.fillStyle = alpha(COMBAT.flash, 0.14 * fl);
    ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  }

  const s = GAZE_EYE * (1 - fl * 0.6);
  const col = gz.vise ? SIGNAL.lethal : SURFACE.lineSoft;
  ctx.save();
  ctx.translate(cx, cy + CFG.VIEW_H * GAZE_EYE_Y);
  ctx.globalAlpha = gz.actif ? 0.85 + 0.15 * batt : fl;

  ctx.save();
  oeilPath(s);
  ctx.clip();
  // la DEMI-HAUTEUR REELLE de la lentille, pas le point de controle : une
  // quadratique culmine a la moitie de sa fleche, et un remplissage cale sur le
  // controle resterait vide jusqu'au quart puis plein au trois-quarts.
  const h = s * 0.62;
  ctx.fillStyle = alpha(col, gz.vise ? 0.32 : 0.10);
  ctx.fillRect(-s, h - 2 * h * gz.k, 2 * s, 2 * h * gz.k);
  ctx.restore();

  ctx.strokeStyle = alpha(col, gz.vise ? 0.95 : 0.42);
  ctx.lineWidth = gz.vise ? 4 : 2.2;
  oeilBarre(s);
  ctx.restore();
}
export function resetGaze() {
  gz.actif = false; gz.ouvert = false; gz.k = 0; gz.batt = 0; gz.vise = false;
  gz.cur = 0; gz.max = 0; gz.until = 0; gz.flash = 0;
}
function markLabel(x, y, text, col) {
  ctx.textAlign = "center";
  ctx.fillStyle = col;
  ctx.font = "700 13px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText(text, x, y);
}
function markGauge(x, y, k, col) {
  const w = 54, h = 5;
  ctx.fillStyle = alpha(SURFACE.void, 0.8);
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = col;
  ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, k)), h);
}
// UNE BULLE, PAS UNE JAUGE. La charge chiffree vit deja au HUD : la repeter
// autour du personnage en arc qui se vide, c'est mettre de l'ECRAN dans le
// MONDE. Ici la charge ne se lit pas, elle se SENT — densite, epaisseur de bord
// et amplitude d'ondulation, jamais un remplissage.
const SHIELD_HIT_MS = 260;
const SHIELD_LOBES = 7;

// le rayon ondule par somme de deux sinus INCOMMENSURABLES : un cercle parfait
// se lit comme de l'interface, une membrane qui respire se lit comme de la
// matiere. Aucune allocation — fonction de l'angle, du temps et de l'identifiant.
function shieldR(base, a, tm, id, amp) {
  return base
    + Math.sin(a * SHIELD_LOBES + tm * 1.7 + id) * amp
    + Math.sin(a * 3 - tm * 1.1 + id * 2.3) * amp * 0.6;
}

function shieldPath(x, y, base, tm, id, amp) {
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r = shieldR(base, a, tm, id, amp);
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawShieldShell(x, y, p, tm) {
  const k = Math.max(0, Math.min(1, p.shield / CFG.SHIELD_POOL));
  const col = POWERUP_COLOR.shield;
  const frappe = Math.max(0, 1 - (performance.now() - (shieldHit.get(p.id) ?? -1e9)) / SHIELD_HIT_MS);
  const base = RING_SHIELD + 1 + frappe * 3;
  const amp = 1 + k * 1.1 + frappe * 2.8;

  ctx.save();

  // le VOLUME : un degrade radial creux au centre et dense au bord. C'est le
  // seul moyen qu'un disque plat vu de dessus se lise comme une sphere.
  const g = ctx.createRadialGradient(x, y, base * 0.35, x, y, base);
  g.addColorStop(0, alpha(col, 0.03 + k * 0.05));
  g.addColorStop(0.72, alpha(col, 0.07 + k * 0.10 + frappe * 0.10));
  g.addColorStop(1, alpha(col, 0.22 + k * 0.26 + frappe * 0.35));
  ctx.fillStyle = g;
  shieldPath(x, y, base, tm, p.id, amp);
  ctx.fill();

  ctx.globalCompositeOperation = "lighter";

  // la MEMBRANE : le bord porte la charge par son epaisseur, pas par sa longueur
  ctx.strokeStyle = alpha(col, 0.40 + k * 0.30 + frappe * 0.45);
  ctx.lineWidth = 1.2 + k * 1.6 + frappe * 2;
  shieldPath(x, y, base, tm, p.id, amp);
  ctx.stroke();

  // le SPECULAIRE, en arc haut-gauche comme toute la charte : c'est lui qui
  // dit « surface courbe » plutot que « anneau ».
  ctx.strokeStyle = alpha(COMBAT.flash, 0.20 + k * 0.18 + frappe * 0.55);
  ctx.lineWidth = 1.6 + k;
  ctx.beginPath();
  ctx.arc(x, y, base - 2, Math.PI * 1.08, Math.PI * 1.52);
  ctx.stroke();
  // un second reflet court, en bas a droite : deux points de lumiere fabriquent
  // le relief qu'un seul ne donne pas.
  ctx.strokeStyle = alpha(COMBAT.flash, 0.10 + k * 0.10);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, base - 2, Math.PI * 0.18, Math.PI * 0.36);
  ctx.stroke();

  ctx.restore();
}

export const lastPlayerPos = new Map();
function playerMoving(id, x, y) {
  const prev = lastPlayerPos.get(id);
  lastPlayerPos.set(id, { x, y });
  if (!prev) return false;
  return Math.hypot(x - prev.x, y - prev.y) > 0.6;
}
function classFrame(p, pose) {
  const id = classAt(p.cls ?? CLASS_DEFAULT).id;
  if (id === "soigneur" && (p.skillFlags & SKILL_HEAL_MODE) && pose !== "down") {
    pose = "shoot";
  }
  return frameOf(`c_${id}_${pose}`);
}
const OUTLINE_SCALE = 1.16;
function paintOutline(frame, x, y, angle, scaleX, scaleY, a) {
  drawSprite(ctx, frame, x, y, {
    angle,
    scaleX: scaleX * OUTLINE_SCALE,
    scaleY: scaleY * OUTLINE_SCALE,
    flash: 1,
    alpha: a,
  });
}
export function drawPlayers(list, tm, marks = []) {
  for (const p of list) {
    const isMe = p.id === myId;
    const x = isMe && predicted ? predicted.x : p.x;
    const y = isMe && predicted ? predicted.y : p.y;
    const col = colorOf(p.id);

    if (p.downed) {
      const aimDir = isMe ? aimVector() : { ax: p.aimX, ay: p.aimY };
      const ang = Math.atan2(aimDir.ay, aimDir.ax);
      paintOutline(classFrame(p, "down"), x, y, ang, 1, 1, 0.45);
      drawSprite(ctx, classFrame(p, "down"), x, y,
        { angle: ang, tint: COMBAT.downed });

      ctx.strokeStyle = COMBAT.downed;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(x, y, CFG.REVIVE_RADIUS, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      if (p.revive > 0) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, CFG.PLAYER_RADIUS + 8, -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * (p.revive / CFG.REVIVE_TIME));
        ctx.stroke();
      }
    } else {
      const dashing = isMe ? dash.t > 0 : p.dashing;
      if (dashing) {
        const dir = isMe ? dash : { x: -p.aimX, y: -p.aimY };
        const g = underCtx;
        g.strokeStyle = FX.flash;
        g.globalAlpha = 0.45;
        g.lineWidth = CFG.PLAYER_RADIUS * 1.6;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - dir.x * 34, y - dir.y * 34);
        g.stroke();
        g.globalAlpha = 1;
        g.lineCap = "butt";
      }

      if (p.skillFlags & SKILL_TAUNT) {
        const puls = 0.55 + 0.25 * Math.sin(tm * 9);
        ctx.strokeStyle = alpha(CLASS_COLOR.tank, puls);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, RING_SKILL, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.16);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, SKILL_CFG.TANK_TAUNT_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (p.skillFlags & SKILL_OVERDRIVE) {
        ctx.strokeStyle = alpha(FX.level, 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, RING_SKILL, 0, Math.PI * 2); ctx.stroke();
      }
      if (p.skillFlags & SKILL_HEAL_MODE) {
        const puls = 0.55 + 0.25 * Math.sin(tm * 7);
        ctx.strokeStyle = alpha(FX.heal, puls);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, RING_SKILL, 0, Math.PI * 2); ctx.stroke();
      }

      // L'AMORCE — le personnage marque le coup avant que l'effet parte. C'est
      // ce qui distingue un ultime d'un sort : il s'annonce, et le joueur est
      // engage. Elle se ramasse comme un boss, en carre, pas en lineaire.
      const amorce = (p.skillFlags & SKILL_ULT_WIND) !== 0;
      if (amorce) {
        const puls = 0.4 + 0.6 * Math.abs(Math.sin(tm * 14));
        ctx.strokeStyle = alpha(FX.flash, puls);
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, RING_SKILL + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = alpha(col, 0.5);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(x, y, RING_SKILL + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * puls);
        ctx.stroke();
      }

      const moving = playerMoving(p.id, x, y);
      const teinte = dashing ? FX.flash
        : ((p.skillFlags & SKILL_HEAL_MODE) ? FX.heal : col);
      const frame = classFrame(p, moving ? "move" : "idle");
      const aimDir = isMe ? aimVector() : { ax: p.aimX, ay: p.aimY };
      const ang = Math.atan2(aimDir.ay, aimDir.ax);
      const sx = moving ? 1.06 : 1;
      const sy = moving ? 0.96 : 1;
      if (!dashing) paintOutline(frame, x, y, ang, sx, sy, 0.9);
      drawSprite(ctx, frame, x, y, {
        angle: ang, scaleX: sx, scaleY: sy, tint: teinte,
      });

      if (p.shield > 0) drawShieldShell(x, y, p, tm);

      let ring = RING_BUFF0;
      for (const [bit, colour] of [
        [BUFF_DAMAGE, POWERUP_COLOR.damage], [BUFF_RATE, POWERUP_COLOR.rate],
        [BUFF_DOUBLE, POWERUP_COLOR.double], [BUFF_PIERCE, POWERUP_COLOR.pierce],
        [BUFF_RICOCHET, POWERUP_COLOR.ricochet],
      ]) {
        if (p.buffs & bit) {
          ctx.strokeStyle = colour;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, ring, 0, Math.PI * 2); ctx.stroke();
          ring += 4;
        }
      }

      if (p.frostRadius > 0) {
        ctx.fillStyle = alpha(EFFECT_COLOR.givre, 0.06);
        ctx.beginPath(); ctx.arc(x, y, p.frostRadius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = alpha(EFFECT_COLOR.givre, 0.22);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, p.frostRadius, 0, Math.PI * 2); ctx.stroke();
      }
    }

    if (isMe && !p.downed && !amSpectator) {
      if (classAt(p.cls ?? CLASS_DEFAULT).id === "dps" && (p.bombStock ?? 0) > 0) {
        drawBombRange(x, y);
      }

      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 7, 0, Math.PI * 2);
      ctx.moveTo(mouse.x - 12, mouse.y); ctx.lineTo(mouse.x - 3, mouse.y);
      ctx.moveTo(mouse.x + 3, mouse.y);  ctx.lineTo(mouse.x + 12, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - 12); ctx.lineTo(mouse.x, mouse.y - 3);
      ctx.moveTo(mouse.x, mouse.y + 3);  ctx.lineTo(mouse.x, mouse.y + 12);
      ctx.stroke();
    }

    const actifs = activeStatuses(p);
    if (actifs.length > 0 && !p.downed) {
      const top = actifs[actifs.length - 1];
      const def = STATUSES[top];
      const puls = top === STATUS_DOOM ? 0.35 + 0.45 * Math.abs(Math.sin(tm * 7)) : 0.5;
      ctx.strokeStyle = def.couleur;
      ctx.globalAlpha = puls;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, RING_STATUS, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    drawPlayerBar(p, x, y, col);
    drawPlayerMarks(p, x, y, marks, tm);

    if (!isMe) {
      ctx.fillStyle = TEXT.dim;
      ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(nameOf(p.id), x, y - CFG.PLAYER_RADIUS - 28);
    }
  }
}
export function drawOrbiters(list, tm) {
  for (const p of list) {
    if (p.downed || !(p.orbiters > 0)) continue;
    const isMe = p.id === myId;
    const x = isMe && predicted ? predicted.x : p.x;
    const y = isMe && predicted ? predicted.y : p.y;
    const col = colorOf(p.id);
    const n = p.orbiters;
    const r = CARD_CFG.ORBIT_RADIUS;

    for (let i = 0; i < n; i++) {
      const oa = tm * CARD_CFG.ORBIT_SPEED + (i / n) * Math.PI * 2;

      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x, y, r, oa - 0.45, oa);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(x + Math.cos(oa) * r, y + Math.sin(oa) * r);
      ctx.rotate(oa);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(-4, -3); ctx.lineTo(-4, 3);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = alpha(SURFACE.void, 0.85);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
}
const BAR_W = 40, BAR_H = 4;
function drawPlayerBar(p, x, y, col) {
  const by = y - CFG.PLAYER_RADIUS - 14;
  const bx = x - BAR_W / 2;
  const maxHp = p.maxHp || CFG.PLAYER_MAX_HP;
  const k = p.downed ? 0 : Math.max(0, Math.min(1, p.hp / maxHp));

  ctx.fillStyle = alpha(SURFACE.shadow, 0.45);
  ctx.fillRect(bx - 1, by - 1, BAR_W + 2, BAR_H + 2);
  ctx.fillStyle = SURFACE.lineSoft;
  ctx.fillRect(bx, by, BAR_W, BAR_H);

  ctx.fillStyle = k < 0.25 ? HUD.low : (k < 0.5 ? HUD.mid : col);
  ctx.fillRect(bx, by, BAR_W * k, BAR_H);

  if (p.shield > 0) {
    const sk = Math.max(0, Math.min(1, p.shield / CFG.SHIELD_POOL));
    ctx.fillStyle = alpha(CLASS_COLOR.tank, 0.85);
    ctx.fillRect(bx, by, BAR_W * sk, 2);
  }

  const actifs = activeStatuses(p);
  if (actifs.length > 0) {
    let ix = x - (actifs.length * 11 - 3) / 2 + 4;
    for (const id of actifs) {
      paintStatusIcon(id, ix, by + BAR_H + 7, 0.62);
      if (id === STATUS_VULN && p.vuln > 1) {
        ctx.fillStyle = STATUSES[STATUS_VULN].couleur;
        ctx.font = "700 8px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "left";
        ctx.fillText(String(p.vuln), ix + 4, by + BAR_H + 11);
      }
      ix += 11;
    }
  }

  if (p.doom > 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = p.doom < 3 && Math.floor(p.doom * 4) % 2 === 0
      ? SIGNAL.ally : STATUSES[STATUS_DOOM].couleur;
    ctx.font = "700 20px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(p.doom.toFixed(1), x, by - 8);
  }
  ctx.textAlign = "left";
}
const PLAYER_MARK = {
  [MECH_STACK]:  { col: MARK_GO, glyph: "converge" },
  [MECH_LINK]:   { col: MARK_AWAY, glyph: "lien" },
  [MECH_JAIL]:   { col: MARK_BREAK, glyph: "cage" },
  [MECH_BAIT]:   { col: MARK.bait, glyph: "cible" },
};
function drawPlayerMarks(p, x, y, marks, tm) {
  if (marks.length === 0) return;
  const my = [];
  for (const m of marks) {
    if (m.mech === MECH_FEED) continue;
    const def = PLAYER_MARK[m.mech];
    if (!def) continue;
    if (m.a === p.id || m.b === p.id) my.push(def);
  }
  if (my.length === 0) return;

  const gy = y - CFG.PLAYER_RADIUS - 26;
  const puls = 0.7 + 0.3 * Math.sin(tm * 7);
  let gx = x - (my.length * 15 - 15) / 2;
  for (const def of my) {
    ctx.save();
    ctx.translate(gx, gy);
    ctx.globalAlpha = puls;
    ctx.fillStyle = def.col;
    ctx.strokeStyle = def.col;
    ctx.lineWidth = 2;
    paintMarkGlyph(def.glyph);
    ctx.restore();
    gx += 15;
  }
  ctx.globalAlpha = 1;
}
function paintMarkGlyph(glyph) {
  switch (glyph) {
    case "converge":
      ctx.beginPath();
      ctx.moveTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(0, 4);
      ctx.closePath(); ctx.fill();
      break;
    case "lien":
      ctx.beginPath(); ctx.arc(-4, 0, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(4, 0, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(1, 0); ctx.stroke();
      break;
    case "cage":
      ctx.strokeRect(-5, -5, 10, 10);
      ctx.beginPath();
      ctx.moveTo(-1.5, -5); ctx.lineTo(-1.5, 5);
      ctx.moveTo(1.5, -5); ctx.lineTo(1.5, 5);
      ctx.stroke();
      break;
    case "cible":
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
      ctx.moveTo(0, -7); ctx.lineTo(0, 7);
      ctx.stroke();
      break;
  }
}
export function fmtTime(t) {
  const m = String(Math.floor(t / 60)).padStart(2, "0");
  const s = String(Math.floor(t % 60)).padStart(2, "0");
  return m + ":" + s;
}
window.__clientReady = true;
