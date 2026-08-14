
import { ENEMY, COMBAT, ramp } from "/shared/palette.js";
import { parseColor, BLEND_NORMAL, BLEND_ADD } from "/gl.js";

const CELL = 60;
const HALF = CELL / 2;
const COLS = 9;

const PAD = 2;
const PITCH = CELL + PAD * 2;

const DPR = Math.min(globalThis.devicePixelRatio || 1, 2);
const PX = CELL * DPR;
const PITCH_PX = PITCH * DPR;

let atlas = null;
let flashAtlas = null;
const index = new Map();
let count = 0;

function cellRect(frame) {
  return {
    x: (frame % COLS) * PITCH_PX + PAD * DPR,
    y: Math.floor(frame / COLS) * PITCH_PX + PAD * DPR,
  };
}

function slot(name) {
  const id = count++;
  index.set(name, id);
  return id;
}

export function frameOf(name) {
  return index.get(name) ?? 0;
}

function mirrored(g, s, pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * (y2 * s) - x2 * (y1 * s);
  }
  const list = area < 0 ? [...pts].reverse() : pts;
  for (let i = 0; i < list.length; i++) {
    const [px, py] = list[i];
    i === 0 ? g.moveTo(px, py * s) : g.lineTo(px, py * s);
  }
  g.closePath();
}

function pathExtent(path) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const note = (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  path({
    moveTo: note,
    lineTo: note,
    closePath() {},
    arc(x, y, r) { note(x - r, y - r); note(x + r, y + r); },
    ellipse(x, y, rx, ry) { note(x - rx, y - ry); note(x + rx, y + ry); },
  });
  if (!Number.isFinite(minX)) return { cx: 0, cy: 0, span: CELL * 0.5 };
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    span: Math.min(maxX - minX, maxY - minY),
  };
}

function bake(g, R, path, accents, edge = 2) {
  const E = pathExtent(path);
  const off = Math.max(1.5, Math.min(3.5, E.span * 0.075));

  g.beginPath(); path(g); g.closePath();
  g.fillStyle = R.base;
  g.fill();

  g.save();
  g.clip();
  g.translate(off, off);
  g.beginPath(); path(g); g.closePath();
  g.fillStyle = R.ombre;
  g.globalAlpha = 0.85;
  g.fill();
  g.restore();

  g.save();
  g.beginPath(); path(g); g.closePath();
  g.clip();
  g.strokeStyle = R.lumiere;
  g.lineWidth = Math.max(2.5, E.span * 0.115);
  g.globalAlpha = 0.55;
  g.beginPath();
  g.arc(E.cx, E.cy, E.span * 0.28, Math.PI * 1.05, Math.PI * 1.72);
  g.stroke();
  g.restore();

  g.save();
  g.beginPath(); path(g); g.closePath();
  g.clip();
  g.translate(-off * 0.9, -off * 0.9);
  g.beginPath(); path(g); g.closePath();
  g.strokeStyle = R.rim;
  g.lineWidth = Math.max(1.5, E.span * 0.055);
  g.globalAlpha = 0.75;
  g.lineJoin = "round";
  g.stroke();
  g.restore();

  g.beginPath(); path(g); g.closePath();
  g.strokeStyle = R.contour;
  g.lineWidth = edge;
  g.lineJoin = "round";
  g.stroke();

  if (accents) accents(g, R);
}

function bakeDeath(g, R, path, step, edge = 2) {
  const chunks = 3;
  const spread = [0, 3.5, 8][step];
  const shrink = [1, 0.92, 0.7][step];
  const fade = [1, 0.9, 0.55][step];

  g.globalAlpha = fade;
  for (let i = 0; i < chunks; i++) {
    const a0 = (i / chunks) * Math.PI * 2 - 0.4;
    const a1 = a0 + (Math.PI * 2) / chunks - 0.12;
    const mid = (a0 + a1) / 2;

    g.save();
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, HALF, a0, a1);
    g.closePath();
    g.clip();

    g.translate(Math.cos(mid) * spread, Math.sin(mid) * spread);
    g.scale(shrink, shrink);
    g.beginPath(); path(g); g.closePath();
    g.fillStyle = step === 0 ? R.base : R.ombre;
    g.fill();
    g.strokeStyle = R.contour;
    g.lineWidth = edge;
    g.stroke();
    g.restore();
  }
  g.globalAlpha = 1;

  if (step === 0) {
    g.save();
    g.beginPath(); path(g); g.closePath();
    g.clip();
    g.strokeStyle = R.contour;
    g.lineWidth = 2;
    for (let i = 0; i < chunks; i++) {
      const a = (i / chunks) * Math.PI * 2 - 0.4;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * HALF, Math.sin(a) * HALF);
      g.stroke();
    }
    g.restore();
  }
}


function gruntPath(k) {
  const legs = k.legs ?? 0;
  const open = k.open ? 5 : 0;
  return g => {
    const teeth = 10;
    g.moveTo(12, 0);
    for (let i = 1; i <= teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const bump = (i % 2 ? 1.6 : -1.1) + (i === 3 ? -2.6 : 0);
      g.lineTo(Math.cos(a) * (12 + bump), Math.sin(a) * (13.5 + bump));
    }
    g.closePath();

    for (const s of [-1, 1]) {
      mirrored(g, s, [[8, 5], [21, 2.5 + open], [22, 6 + open], [9, 10]]);
    }

    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const px = -9 + i * 6;
        const alt = (i + (s > 0 ? 0 : 1) + (legs < 0 ? 1 : 0)) & 1;
        const ext = 3.5 + (alt && legs !== 0 ? 3.5 : 0);
        mirrored(g, s, [[px - 2.5, 10], [px + 0.5, 12 + ext], [px + 3, 10]]);
      }
    }
  };
}

function gruntAccents(open) {
  return (g, R) => {
    g.fillStyle = R.accent;
    for (const s of [-1, 1]) {
      g.beginPath(); g.arc(4, s * 4.5, 2.4, 0, 7); g.fill();
    }
    if (open) {
      g.fillStyle = R.contour;
      g.beginPath(); g.ellipse(11, 0, 4, 5.5, 0, 0, 7); g.fill();
    }
  };
}

function runnerPath(k) {
  const fin = k.fin ?? 0;
  return g => {
    g.moveTo(17, 0);
    g.lineTo(2, -6.5);
    g.lineTo(-6, -4 - fin);
    g.lineTo(-13, -8 - fin * 2);
    g.lineTo(-9, -1.5);
    g.lineTo(-14, 0);
    g.lineTo(-9, 1.5);
    g.lineTo(-13, 8 + fin * 2);
    g.lineTo(-6, 3 + fin);
    g.lineTo(2, 6.5);
  };
}

function runnerAccents(g, R) {
  g.fillStyle = R.lumiere;
  g.beginPath();
  g.moveTo(13, 0); g.lineTo(0, -2.6); g.lineTo(-4, 0); g.lineTo(0, 2.6);
  g.closePath(); g.fill();
  g.fillStyle = R.accent;
  g.beginPath(); g.arc(6, 0, 1.9, 0, 7); g.fill();
}

function tankPath(k) {
  const plates = k.plates ?? 1;
  const step = k.step ?? 0;
  return g => {
    g.moveTo(21, 0);
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.lineTo(Math.cos(a) * 21, Math.sin(a) * 15.5);
    }
    g.closePath();

    g.moveTo(16, -5.5);
    g.lineTo(25, -3.5);
    g.lineTo(25, 3.5);
    g.lineTo(16, 5.5);
    g.closePath();

    for (const s of [-1, 1]) {
      const out = 14 + plates * 7;
      mirrored(g, s, [[-13, 8], [-9 + step * 2, out], [6 + step * 2, out], [11, 8]]);
    }

    g.moveTo(-19, -4);
    g.lineTo(-10, -13);
    g.lineTo(-5, -6);
    g.closePath();
  };
}

function tankAccents(g, R) {
  g.strokeStyle = R.contour;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-9, -11); g.lineTo(-9, 11);
  g.moveTo(3, -13);  g.lineTo(3, 13);
  g.stroke();

  g.strokeStyle = R.ombre;
  g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(11, -12); g.lineTo(11, 12); g.stroke();
  g.fillStyle = R.ombre;
  for (const s of [-1, 1]) {
    g.beginPath(); g.arc(-9, 9 * s, 1.4, 0, 7); g.fill();
  }

  g.fillStyle = R.accent;
  g.beginPath(); g.arc(19, 0, 2.8, 0, 7); g.fill();
}

function shooterPath(k) {
  const recoil = k.recoil ?? 0;
  return g => {
    g.moveTo(9, -9);
    g.lineTo(13 + recoil * 2.5, -3.5);
    g.lineTo(17 + recoil * 2.5, -3.2);
    g.lineTo(25 + recoil * 3, -1.5);
    g.lineTo(25 + recoil * 3, 1.5);
    g.lineTo(17 + recoil * 2.5, 3.2);
    g.lineTo(13 + recoil * 2.5, 3.5);
    g.lineTo(9, 9);
    g.lineTo(-2, 12);
    g.lineTo(-9, 7);
    g.lineTo(-12, 0);
    g.lineTo(-9, -9);
    g.lineTo(-2, -13.5);
  };
}

function shooterAccents(recoil) {
  return (g, R) => {
    g.fillStyle = R.contour;
    g.beginPath(); g.arc(1, 0, 6.4, 0, 7); g.fill();
    g.fillStyle = R.accent;
    g.beginPath(); g.arc(2, 0, 3.8, 0, 7); g.fill();

    g.strokeStyle = R.lumiere;
    g.lineWidth = 1;
    g.globalAlpha = 0.6;
    g.beginPath();
    g.moveTo(17 + recoil * 2.5, -0.8); g.lineTo(24 + recoil * 3, -0.8);
    g.stroke();
    g.globalAlpha = 1;
  };
}

function shooterShadow(g, R) {
  g.save();
  g.globalAlpha = 0.35;
  g.fillStyle = R.contour;
  g.beginPath(); g.ellipse(0, 15, 11, 3.4, 0, 0, 7); g.fill();
  g.restore();
}

function broodPath(k) {
  const swell = k.swell ?? 0;
  return g => {
    const pts = 11;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const belly = Math.sin(a - 2.2) * 3.4;
      const r = 15 + belly + swell * 3 + (i % 2 ? 1.2 : -0.8);
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.9;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();
    const legs = [[-0.6, 9], [0.4, 12], [2.2, 8], [3.4, 11]];
    for (const [a, len] of legs) {
      g.moveTo(Math.cos(a - 0.2) * 12, Math.sin(a - 0.2) * 12);
      g.lineTo(Math.cos(a + 0.05) * (13 + len), Math.sin(a + 0.05) * (13 + len));
      g.lineTo(Math.cos(a + 0.3) * 12, Math.sin(a + 0.3) * 12);
      g.closePath();
    }
  };
}

function broodAccents(swell) {
  return (g, R) => {
    g.save();
    g.globalAlpha = 0.55;
    g.fillStyle = R.lumiere;
    for (const [ex, ey] of [[-4, -5], [4, -3], [-2, 5], [7, 4], [0, 0]]) {
      g.beginPath(); g.arc(ex, ey, 3.2 + swell * 0.8, 0, 7); g.fill();
    }
    g.restore();
    g.fillStyle = R.accent;
    g.beginPath(); g.arc(11, -1, 2.6, 0, 7); g.fill();
  };
}

function kamikazePath(k) {
  const bristle = k.bristle ?? 0;
  return g => {
    const pts = 9;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const px = Math.cos(a) * 11, py = Math.sin(a) * 11.5;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();

    const spikes = 8;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + 0.22;
      const len = 15 + bristle * 5 + (i === 2 ? 3.5 : 0);
      const w = 0.16;
      g.moveTo(Math.cos(a - w) * 10, Math.sin(a - w) * 10);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.lineTo(Math.cos(a + w) * 10, Math.sin(a + w) * 10);
      g.closePath();
    }

    g.moveTo(-10, -4);
    g.lineTo(-19, -12 - bristle * 2);
    g.lineTo(-15, -14 - bristle * 2);
    g.lineTo(-7, -6);
    g.closePath();
  };
}

function kamikazeAccents(bristle) {
  return (g, R) => {
    g.fillStyle = R.lumiere;
    g.beginPath(); g.arc(0, 0, 4.2 + bristle * 1.8, 0, 7); g.fill();
    g.fillStyle = R.accent;
    g.beginPath(); g.arc(0, 0, 2.2 + bristle, 0, 7); g.fill();
  };
}

function bulwarkPath(k) {
  const brace = k.brace ?? 0;
  const step = k.step ?? 0;
  return g => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const px = Math.cos(a) * 13 - 4, py = Math.sin(a) * 12;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();

    g.moveTo(12, -18);
    g.lineTo(20, -15.5);
    g.lineTo(20, 14.5);
    g.lineTo(12, 17);
    g.closePath();

    for (const s of [-1, 1]) {
      mirrored(g, s, [[11, 13], [16 + brace, 16], [16 + brace, 21 + brace * 2], [7, 15]]);
    }

    for (const s of [-1, 1]) {
      const alt = (s > 0 ? 0 : 1) + (step < 0 ? 1 : 0);
      const ext = 3 + ((alt & 1) && step !== 0 ? 3.5 : 0);
      mirrored(g, s, [[-11, 9], [-8, 11 + ext], [-5, 9]]);
    }
  };
}

function bulwarkAccents(g, R) {
  g.fillStyle = R.contour;
  g.fillRect(14, -8, 4.5, 16);
  g.fillStyle = R.ombre;
  for (const ry of [-14, -2, 11]) {
    g.beginPath(); g.arc(16, ry, 1.7, 0, 7); g.fill();
  }
  g.fillStyle = R.accent;
  g.beginPath(); g.arc(-6, 0, 2.6, 0, 7); g.fill();
}

function medicPath(k) {
  const lean = k.lean ?? 0;
  return g => {
    const pts = 12;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 9.5 + Math.cos(a) * 2.2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.92;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();

    g.moveTo(-1, -7);
    g.lineTo(-3.5 - lean * 3, -24);
    g.lineTo(1.5 - lean * 3, -25);
    g.lineTo(3.5, -7);
    g.closePath();

    g.moveTo(1.5 - lean * 3, -25);
    g.lineTo(10 - lean * 3, -22.5);
    g.lineTo(9 - lean * 3, -18.5);
    g.lineTo(0.5 - lean * 3, -21);
    g.closePath();

    for (const s of [-1, 1]) {
      mirrored(g, s, [[-4, 7], [-6, 13], [-3, 8]]);
      mirrored(g, s, [[4, 7], [6, 13], [7, 8]]);
    }
  };
}

function medicAccents(lean) {
  return (g, R) => {
    g.fillStyle = R.accent;
    g.beginPath(); g.arc(8.5 - lean * 3, -21, 2.6, 0, 7); g.fill();
    g.fillStyle = R.lumiere;
    g.beginPath(); g.arc(3, 0, 3.2, 0, 7); g.fill();
  };
}

function choeurPath(k) {
  const call = k.call ?? 0;
  return g => {
    const pts = 10;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const px = Math.cos(a) * 12.5, py = Math.sin(a) * 14;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();

    const crown = [[-7, 9 + call * 4], [1, 13 + call * 5], [8, 10.5 + call * 4]];
    for (const [cx, h] of crown) {
      g.moveTo(cx - 3, -10);
      g.lineTo(cx + 0.6, -10 - h);
      g.lineTo(cx + 3, -10);
      g.closePath();
    }

    for (const s of [-1, 1]) {
      mirrored(g, s, [[-9, 3], [-20, 7 + call * 2], [-18, 11 + call * 2], [-7, 8]]);
    }
  };
}

function choeurAccents(call) {
  return (g, R) => {
    g.fillStyle = R.accent;
    for (const [cx, h] of [[-7, 9 + call * 4], [1, 13 + call * 5], [8, 10.5 + call * 4]]) {
      g.beginPath(); g.arc(cx + 0.6, -10 - h, 2, 0, 7); g.fill();
    }
    g.fillStyle = R.lumiere;
    g.beginPath(); g.ellipse(3, 1, 4.5, 6, 0, 0, 7); g.fill();
  };
}

const NEUTRAL = ramp("#dfe5f0");

function tankClassPath(k) {
  const move = k.move ?? 0;
  return g => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * 17, py = Math.sin(a) * 15;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();
    for (const s of [-1, 1]) {
      mirrored(g, s, [[2, 14], [16 + move, 16.5], [21 + move, 8.5], [9, 8.5]]);
    }
    g.moveTo(10, -6);
    g.lineTo(23, -6);
    g.lineTo(23, 6);
    g.lineTo(10, 6);
    g.closePath();
  };
}

function tankClassShadow(g, R) {
  g.save();
  g.globalAlpha = 0.5;
  g.fillStyle = R.contour;
  g.beginPath(); g.ellipse(0, 15, 16, 5, 0, 0, 7); g.fill();
  g.restore();
}

function healClassPath(k) {
  const move = k.move ?? 0;
  return g => {
    const pts = 16;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 13 + Math.cos(a) * 3;
      const px = Math.cos(a) * (r + move * 0.6), py = Math.sin(a) * r * 0.96;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();

    g.moveTo(3, -10.5);
    g.lineTo(7 - move * 3, -22);
    g.lineTo(12 - move * 3, -20.5);
    g.lineTo(9.5, -8.5);
    g.closePath();

    g.moveTo(13, -4.5);
    g.lineTo(21, -6.5);
    g.lineTo(21, 6.5);
    g.lineTo(13, 4.5);
    g.closePath();
  };
}

function dpsClassPath(k) {
  const move = k.move ?? 0;
  return g => {
    g.moveTo(16, 0);
    g.lineTo(-4, -12 - move);
    g.lineTo(-9, 0);
    g.lineTo(-4, 12 + move);
    g.lineTo(6, 3);
    g.lineTo(24, 2);
    g.lineTo(24, -2);
    g.lineTo(6, -3);
    g.closePath();

    g.moveTo(-9, 0);
    g.lineTo(-15, 9);
    g.lineTo(-9, 6);
    g.closePath();
  };
}


const ENEMY_SHAPES = ["idle", "walkA", "walkB", "open"];
const DEATH_STEPS = ["die0", "die1", "die2"];
const CLASS_SHAPES = ["idle", "move", "shoot", "down"];

function rasterTestPaint(img, k) {
  return g => {
    if (k.down) g.globalAlpha = 0.55;
    const scale = Math.min((CELL * 0.78) / img.width, (CELL * 0.78) / img.height);
    const w = img.width * scale, h = img.height * scale;
    g.drawImage(img, -w / 2, -h / 2, w, h);
    g.globalAlpha = 1;
  };
}

function plan(raster) {
  const jobs = [];

  const enemies = [
    { path: gruntPath,   accents: gruntAccents, edge: 2, floats: false,
      shapes: [{ legs: 0 }, { legs: 1 }, { legs: -1 }, { legs: 0, open: true }] },
    { path: runnerPath,  accents: () => runnerAccents, edge: 2, floats: false,
      shapes: [{ fin: 0 }, { fin: 0.6 }, { fin: -0.4 }, { fin: 1.4 }] },
    { path: tankPath,    accents: () => tankAccents, edge: 3, floats: false,
      shapes: [{ plates: 1, step: 0 }, { plates: 1, step: 1 }, { plates: 1, step: -1 },
               { plates: 0, step: 0 }] },
    { path: shooterPath, accents: k => shooterAccents(k.recoil ?? 0), edge: 2, floats: true,
      shapes: [{ recoil: 0 }, { recoil: 0.3 }, { recoil: -1 }, { recoil: 1 }] },
    { path: broodPath,   accents: null, edge: 2, floats: false,
      shapes: [{ swell: 0 }, { swell: 0.35 }, { swell: -0.25 }, { swell: 1.3 }] },
    { path: kamikazePath, accents: k => kamikazeAccents(k.bristle ?? 0), edge: 2, floats: false,
      shapes: [{ bristle: 0 }, { bristle: 0.3 }, { bristle: -0.2 }, { bristle: 1 }] },
    { path: bulwarkPath, accents: () => bulwarkAccents, edge: 3, floats: false,
      shapes: [{ brace: 0, step: 0 }, { brace: 0, step: 1 }, { brace: 0, step: -1 },
               { brace: 1.2, step: 0 }] },
    { path: medicPath,   accents: k => medicAccents(k.lean ?? 0), edge: 1.8, floats: false,
      shapes: [{ lean: 0 }, { lean: 0.5 }, { lean: -0.3 }, { lean: 1.2 }] },
    { path: choeurPath,  accents: k => choeurAccents(k.call ?? 0), edge: 2, floats: false,
      shapes: [{ call: 0 }, { call: 0.25 }, { call: -0.2 }, { call: 1 }] },
  ];

  enemies.forEach((def, t) => {
    const R = ramp(ENEMY.TINT[t] ?? ENEMY.base);
    def.shapes.forEach((k, i) => {
      const path = def.path(k);
      const accents = t === 0 ? gruntAccents(!!k.open)
        : t === 4 ? broodAccents(k.swell)
        : def.accents(k);
      jobs.push({
        name: `e${t}_${ENEMY_SHAPES[i]}`,
        paint: g => {
          if (def.floats) { shooterShadow(g, R); g.translate(0, -3); }
          bake(g, R, path, accents, def.edge);
        },
      });
    });
    const dead = def.path(def.shapes[0]);
    DEATH_STEPS.forEach((nom, s) => {
      jobs.push({
        name: `e${t}_${nom}`,
        paint: g => bakeDeath(g, R, dead, s, def.edge),
      });
    });
  });

  const classes = [
    { id: "tank",     path: tankClassPath, edge: 3.5, accents: tankClassAccents,
      shadow: tankClassShadow },
    { id: "soigneur", path: healClassPath, edge: 1.6, accents: healClassAccents },
    { id: "dps",      path: dpsClassPath,  edge: 2, accents: dpsClassAccents },
  ];

  classes.forEach(def => {
    const rImg = raster?.[def.id];
    CLASS_SHAPES.forEach((nom, i) => {
      const k = { move: i === 1 ? 1.5 : 0, shoot: i === 2, down: i === 3 };
      const path = def.path(k);
      jobs.push({
        name: `c_${def.id}_${nom}`,
        paint: rImg ? rasterTestPaint(rImg, k) : g => {
          if (k.down) g.globalAlpha = 0.55;
          if (def.shadow) def.shadow(g, NEUTRAL);
          bake(g, NEUTRAL, path, def.accents(k), def.edge);
          g.globalAlpha = 1;
        },
      });
    });
  });

  jobs.push({
    name: "fx_white",
    paint: g => { g.fillStyle = "#ffffff"; g.fillRect(-HALF, -HALF, CELL, CELL); },
  });

  jobs.push({
    name: "fx_shard",
    paint: g => {
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.moveTo(0, -HALF);
      g.lineTo(HALF * 0.62, -HALF * 0.12);
      g.lineTo(HALF * 0.18, HALF);
      g.lineTo(-HALF * 0.72, HALF * 0.3);
      g.closePath();
      g.fill();
    },
  });

  jobs.push({
    name: "fx_glow",
    paint: g => {
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, HALF * 0.9);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.45, "rgba(255,255,255,0.38)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, HALF * 0.9, 0, Math.PI * 2);
      g.fill();
    },
  });

  return jobs;
}

function tankClassAccents(k) {
  return (g, R) => {
    g.strokeStyle = R.contour;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-8, -11); g.lineTo(-8, 11);
    g.moveTo(-1, -13); g.lineTo(-1, 13);
    g.stroke();

    g.strokeStyle = R.ombre;
    g.lineWidth = 1.6;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * 10, py = Math.sin(a) * 8.8;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();
    g.stroke();

    g.fillStyle = R.contour;
    for (const s of [-1, 1]) {
      g.beginPath(); g.arc(8.5, 13 * s, 1.6, 0, 7); g.fill();
    }

    g.strokeStyle = R.ombre;
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(17, -6); g.lineTo(17, 6); g.stroke();

    g.fillStyle = R.accent;
    g.beginPath(); g.arc(-8.5, -13, 1.8, 0, 7); g.fill();

    if (k.shoot) {
      g.fillStyle = R.accent;
      g.beginPath(); g.arc(24, 0, 4.5, 0, 7); g.fill();
    }
  };
}

function healClassAccents(k) {
  const move = k.move ?? 0;
  return (g, R) => {
    g.fillStyle = R.contour;
    g.fillRect(-2.4, -8, 4.8, 16);
    g.fillRect(-8, -2.4, 16, 4.8);

    g.strokeStyle = R.ombre;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-3, -12.5); g.quadraticCurveTo(-4, 0, -3, 12.5);
    g.moveTo(4, -12.8); g.quadraticCurveTo(5, 0, 4, 12.8);
    g.stroke();

    g.fillStyle = R.contour;
    g.beginPath(); g.arc(9.5 - move * 3, -21, 2, 0, 7); g.fill();

    g.strokeStyle = R.ombre;
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(17, -5.6); g.lineTo(17, 5.6); g.stroke();

    if (k.shoot) {
      g.save();
      g.globalAlpha = 0.5;
      g.fillStyle = R.lumiere;
      g.beginPath(); g.moveTo(12, -5); g.lineTo(26, -2); g.lineTo(26, 2); g.lineTo(12, 5);
      g.closePath(); g.fill();
      g.restore();
    }
  };
}

function dpsClassAccents(k) {
  return (g, R) => {
    g.fillStyle = R.lumiere;
    g.beginPath();
    g.moveTo(12, 0); g.lineTo(-2, -4.5); g.lineTo(-5, 0); g.lineTo(-2, 4.5);
    g.closePath(); g.fill();

    g.strokeStyle = R.ombre;
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(9, -3); g.lineTo(-3, -7);
    g.moveTo(9, 3); g.lineTo(-3, 7);
    g.stroke();

    g.strokeStyle = R.ombre;
    g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(15, -2.6); g.lineTo(15, 2.6); g.stroke();

    if (k.shoot) {
      g.fillStyle = R.accent;
      g.beginPath(); g.arc(25, 0, 3.4, 0, 7); g.fill();
    }
  };
}

export async function buildAtlas(onProgress) {
  if (atlas) return atlasStats();

  const raster = {};
  await Promise.all([["tank", "rempart"], ["soigneur", "soigneur"], ["dps", "tireur"]]
    .map(([id, file]) => new Promise(res => {
      const img = new Image();
      img.onload = () => { raster[id] = img; res(); };
      img.onerror = () => res();
      img.src = `/assets/raster_test/${file}.png`;
    })));

  const jobs = plan(raster);
  const rows = Math.ceil(jobs.length / COLS);

  atlas = document.createElement("canvas");
  atlas.width = COLS * PITCH_PX;
  atlas.height = rows * PITCH_PX;
  const g = atlas.getContext("2d");
  g.scale(DPR, DPR);

  for (let i = 0; i < jobs.length; i++) {
    const id = slot(jobs[i].name);
    const cx = (id % COLS) * PITCH + PITCH / 2;
    const cy = Math.floor(id / COLS) * PITCH + PITCH / 2;
    g.save();
    g.translate(cx, cy);
    jobs[i].paint(g);
    g.restore();

    if ((i & 7) === 7) {
      onProgress?.((i + 1) / jobs.length);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  onProgress?.(1);

  flashAtlas = document.createElement("canvas");
  flashAtlas.width = atlas.width;
  flashAtlas.height = atlas.height;
  const fg = flashAtlas.getContext("2d");
  fg.drawImage(atlas, 0, 0);
  fg.globalCompositeOperation = "source-atop";
  fg.fillStyle = COMBAT.flash;
  fg.fillRect(0, 0, flashAtlas.width, flashAtlas.height);

  return { frames: jobs.length, w: atlas.width, h: atlas.height };
}

let renderer = null;
let targets = new Set();
const WHITE = [255, 255, 255];

export function bindGL(r, ctxList) {
  renderer = r;
  targets = new Set(ctxList ?? []);
  if (r) {
    r.setFlashColor(...parseColor(COMBAT.flash).map(v => v / 255));
    r.setAtlas(atlas);
  }
}

export function reuploadAtlas() {
  renderer?.setAtlas(atlas);
}

export function atlasCanvas() { return atlas; }

export const SPRITE_CELL = CELL;

export function glActive() { return !!(renderer && renderer.ok); }

let scratch = null;

function scratchCtx() {
  if (!scratch) {
    scratch = document.createElement("canvas");
    scratch.width = scratch.height = PX;
  }
  return scratch.getContext("2d");
}

export function drawSprite(g, frame, x, y, {
  angle = 0,
  scaleX = 1,
  scaleY = 1,
  tint = null,
  alpha = 1,
  flash = 0,
  flashTint = null,
  additive = false,
} = {}) {
  if (!atlas) return;
  const rect = cellRect(frame);
  const sx = rect.x, sy = rect.y;

  if (renderer && renderer.ok && targets.has(g)) {
    renderer.setBlend(additive ? BLEND_ADD : BLEND_NORMAL);
    const [tr, tg, tb] = tint ? parseColor(tint) : WHITE;
    const F = flashTint ? parseColor(flashTint) : null;
    const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
    renderer.quad(
      sx / atlas.width, sy / atlas.height,
      (sx + PX) / atlas.width, (sy + PX) / atlas.height,
      x, y, HALF * scaleX, HALF * scaleY, angle,
      (tr * a) | 0, (tg * a) | 0, (tb * a) | 0, (a * 255) | 0,
      flash > 0 ? Math.min(255, (flash * 255) | 0) : 0,
      F?.[0], F?.[1], F?.[2]);
    return;
  }

  g.save();
  g.translate(x, y);
  if (angle) g.rotate(angle);
  if (scaleX !== 1 || scaleY !== 1) g.scale(scaleX, scaleY);
  if (alpha !== 1) g.globalAlpha *= alpha;

  if (tint) {
    const s = scratchCtx();
    s.clearRect(0, 0, PX, PX);
    s.drawImage(atlas, sx, sy, PX, PX, 0, 0, PX, PX);
    s.globalCompositeOperation = "multiply";
    s.fillStyle = tint;
    s.fillRect(0, 0, PX, PX);
    s.globalCompositeOperation = "destination-in";
    s.drawImage(atlas, sx, sy, PX, PX, 0, 0, PX, PX);
    s.globalCompositeOperation = "source-over";
    g.drawImage(scratch, 0, 0, PX, PX, -HALF, -HALF, CELL, CELL);
  } else {
    g.drawImage(atlas, sx, sy, PX, PX, -HALF, -HALF, CELL, CELL);
  }

  if (flash > 0) {
    g.globalAlpha *= Math.min(1, flash);
    if (flashTint) {
      const s = scratchCtx();
      s.clearRect(0, 0, PX, PX);
      s.drawImage(flashAtlas, sx, sy, PX, PX, 0, 0, PX, PX);
      s.globalCompositeOperation = "multiply";
      s.fillStyle = flashTint;
      s.fillRect(0, 0, PX, PX);
      s.globalCompositeOperation = "destination-in";
      s.drawImage(flashAtlas, sx, sy, PX, PX, 0, 0, PX, PX);
      s.globalCompositeOperation = "source-over";
      g.drawImage(scratch, 0, 0, PX, PX, -HALF, -HALF, CELL, CELL);
    } else {
      g.drawImage(flashAtlas, sx, sy, PX, PX, -HALF, -HALF, CELL, CELL);
    }
  }

  g.restore();
}

export function atlasStats() {
  if (!atlas) return { mo: 0, w: 0, h: 0, frames: 0 };
  return {
    mo: (atlas.width * atlas.height * 4 * 2) / 1048576,
    w: atlas.width, h: atlas.height, frames: count,
  };
}

export function silhouetteSheet() {
  const c = document.createElement("canvas");
  c.width = atlas.width;
  c.height = atlas.height;
  const g = c.getContext("2d");
  g.drawImage(atlas, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "#000000";
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-over";
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
