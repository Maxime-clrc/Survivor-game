
import { BIOMES, mulberry32 } from "/shared/biomes.js";
import { alpha } from "/shared/palette.js";

export const TILE = 400;

const USURE = [0.0, 0.45, 1.0];

const cache = new Map();

export function floorPattern(ctx, biomeIndex, diffIndex, seed, dpr) {
  const cle = `${biomeIndex}|${diffIndex}|${seed}|${dpr}`;
  let p = cache.get(cle);
  if (p) return p;
  const cv = cuire(biomeIndex, diffIndex, seed, dpr);
  p = ctx.createPattern(cv, "repeat");
  if (!p) return null;
  if (p.setTransform && typeof DOMMatrix === "function") {
    p.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
  }
  cache.set(cle, p);
  return p;
}

function cuire(biomeIndex, diffIndex, seed, dpr) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = Math.round(TILE * dpr);
  const g = cv.getContext("2d");
  g.scale(dpr, dpr);
  const rand = mulberry32((seed >>> 0) * 6151 + biomeIndex * 97 + 1);
  const usure = USURE[diffIndex] ?? USURE[1];
  const cle = (BIOMES[biomeIndex] ?? BIOMES[0]).key;

  if (cle === "fonderie") fonderie(g, rand, usure);
  else if (cle === "friche") friche(g, rand, usure);
  else usine(g, rand, usure);

  return cv;
}

function poser(g, x, y, r, dessin) {
  for (const dx of x < r ? [0, TILE] : x > TILE - r ? [0, -TILE] : [0]) {
    for (const dy of y < r ? [0, TILE] : y > TILE - r ? [0, -TILE] : [0]) {
      g.save(); g.translate(x + dx, y + dy); dessin(g); g.restore();
    }
  }
}

function joint(g, x0, y0, x1, y1, sombre, clair, w = 2) {
  g.lineWidth = w;
  g.strokeStyle = sombre;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = clair;
  const n = x0 === x1 ? [-1, 0] : [0, -1];
  g.beginPath();
  g.moveTo(x0 + n[0] * w, y0 + n[1] * w); g.lineTo(x1 + n[0] * w, y1 + n[1] * w);
  g.stroke();
}

function tache(g, x, y, r, couleur, a) {
  poser(g, x, y, r, (c) => {
    const grad = c.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, alpha(couleur, a));
    grad.addColorStop(1, alpha(couleur, 0));
    c.fillStyle = grad;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  });
}

function usine(g, rand, usure) {
  const sombre = alpha("#000000", 0.20 + 0.10 * usure);
  const clair = alpha("#ffffff", 0.045 - 0.015 * usure);

  for (const v of [0, TILE / 2]) {
    joint(g, v, 0, v, TILE, sombre, clair);
    joint(g, 0, v, TILE, v, sombre, clair);
  }

  for (let px = 0; px < 2; px++) {
    for (let py = 0; py < 2; py++) {
      const ox = px * TILE / 2, oy = py * TILE / 2;
      for (const [rx, ry] of [[14, 14], [TILE / 2 - 14, 14], [14, TILE / 2 - 14], [TILE / 2 - 14, TILE / 2 - 14]]) {
        poser(g, ox + rx, oy + ry, 3, (c) => {
          c.fillStyle = alpha("#000000", 0.28);
          c.beginPath(); c.arc(0.6, 0.8, 1.9, 0, Math.PI * 2); c.fill();
          c.fillStyle = alpha("#c8d2e2", 0.14 - 0.06 * usure);
          c.beginPath(); c.arc(0, 0, 1.7, 0, Math.PI * 2); c.fill();
        });
      }
    }
  }

  g.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const y = rand() * TILE, x = rand() * TILE, l = 30 + rand() * 90;
    g.strokeStyle = alpha(rand() < 0.5 ? "#ffffff" : "#000000", 0.012 + rand() * 0.014);
    g.beginPath(); g.moveTo(x, y); g.lineTo(Math.min(TILE, x + l), y); g.stroke();
  }

  const n = Math.round(6 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 24 + rand() * 40, "#7a4a2a", 0.10 + rand() * 0.08);
}

function fonderie(g, rand, usure) {
  const sombre = alpha("#000000", 0.26 + 0.10 * usure);
  const clair = alpha("#ffd9a8", 0.035);
  const H = TILE / 2;

  for (let r = 0; r < 2; r++) {
    const y = r * H;
    joint(g, 0, y, TILE, y, sombre, clair, 3);
    const dec = r % 2 ? TILE / 4 : 0;
    for (const x of [dec, dec + TILE / 2]) {
      const xx = ((x % TILE) + TILE) % TILE;
      g.lineWidth = 3; g.strokeStyle = sombre;
      g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + H); g.stroke();
    }
  }

  for (let i = 0; i < 7; i++) tache(g, rand() * TILE, rand() * TILE, 40 + rand() * 70, "#000000", 0.10 + rand() * 0.10);

  const n = Math.round(5 * usure);
  for (let i = 0; i < n; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const ang = rand() * Math.PI * 2, l = 30 + rand() * 60;
    poser(g, x, y, l, (c) => {
      c.lineCap = "round";
      c.strokeStyle = alpha("#ff7a2a", 0.10 + 0.10 * usure);
      c.lineWidth = 2.4;
      c.beginPath();
      let px = 0, py = 0, a = ang;
      c.moveTo(0, 0);
      for (let k = 0; k < 4; k++) {
        a += (rand() - 0.5) * 0.9;
        px += Math.cos(a) * (l / 4); py += Math.sin(a) * (l / 4);
        c.lineTo(px, py);
      }
      c.stroke();
      c.strokeStyle = alpha("#ffd9a8", 0.07 * usure);
      c.lineWidth = 0.9;
      c.stroke();
    });
  }
}

function friche(g, rand, usure) {
  const brins = 9;
  for (let i = 0; i < brins; i++) {
    const x0 = rand() * TILE, y0 = rand() * TILE;
    const seg = 5 + Math.floor(rand() * 4);
    const l = 26 + rand() * 26;
    poser(g, x0, y0, seg * l, (c) => {
      c.lineCap = "round";
      let a = rand() * Math.PI * 2, px = 0, py = 0;
      c.strokeStyle = alpha("#000000", 0.22 + 0.10 * usure);
      c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(0, 0);
      for (let k = 0; k < seg; k++) {
        a += (rand() - 0.5) * 1.3;
        px += Math.cos(a) * l; py += Math.sin(a) * l;
        c.lineTo(px, py);
      }
      c.stroke();
      c.strokeStyle = alpha("#ffffff", 0.030);
      c.lineWidth = 0.8;
      c.translate(-0.9, -0.9);
      c.stroke();
    });
  }

  for (let i = 0; i < 260; i++) {
    const x = rand() * TILE, y = rand() * TILE, r = 0.6 + rand() * 1.5;
    g.fillStyle = alpha(rand() < 0.6 ? "#000000" : "#c9d2c4", 0.03 + rand() * 0.05);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  const n = 4 + Math.round(4 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 30 + rand() * 55, "#5c6b4a", 0.07 + 0.06 * usure);
  const m = Math.round(4 * usure);
  for (let i = 0; i < m; i++) tache(g, rand() * TILE, rand() * TILE, 45 + rand() * 60, "#000000", 0.10);
}
