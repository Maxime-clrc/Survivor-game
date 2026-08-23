import { BIOMES, mulberry32 } from "/shared/biomes.js";
import { PROP, alpha } from "/shared/palette.js";
import { PX_PER_M } from "/shared/units.js";
import { GFX_LOW, gfx } from "../core/state.js";

// TILE vaut exactement GRID_MAJOR et MAILLE exactement GRID_FINE : la tuile
// porte donc les deux grilles en JOINTS au lieu de les laisser se tracer par
// dessus. Le motif est ancre a l'origine du MONDE (la camera vit dans le
// transform), donc les joints tombent sur la maille reelle, pas a cote.
export const TILE = 20 * PX_PER_M;
const MAILLE = 5 * PX_PER_M;

// une seconde periode, sans aucune arete : des nappes d'usure tres faibles.
// C'est ce qui casse la lecture de la tuile fine — a 400 px l'oeil trouve la
// periode en deux secondes, et aucune quantite de detail DANS la tuile ne
// rattrape ca.
const MACRO = 1200;

const USURE = [0.0, 0.45, 1.0];

const cache = new Map();

function motif(ctx, cle, dpr, cuisson) {
  let p = cache.get(cle);
  if (p) return p;
  const cv = cuisson();
  p = ctx.createPattern(cv, "repeat");
  if (!p) return null;
  if (p.setTransform && typeof DOMMatrix === "function") {
    p.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
  }
  cache.set(cle, p);
  return p;
}

export function floorPattern(ctx, biomeIndex, diffIndex, seed, dpr) {
  return motif(ctx, `f|${biomeIndex}|${diffIndex}|${seed}|${dpr}|${gfx > GFX_LOW ? 1 : 0}`,
    dpr, () => cuire(biomeIndex, diffIndex, seed, dpr));
}

// null en `low` : le sol reste celui d'avant le plan 13, au pixel.
export function macroPattern(ctx, biomeIndex, diffIndex, seed, dpr) {
  if (gfx <= GFX_LOW) return null;
  return motif(ctx, `m|${biomeIndex}|${diffIndex}|${seed}|${dpr}`,
    dpr, () => cuireMacro(biomeIndex, diffIndex, seed, dpr));
}

function toile(taille, dpr) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = Math.round(taille * dpr);
  const g = cv.getContext("2d");
  g.scale(dpr, dpr);
  return { cv, g };
}

function cuire(biomeIndex, diffIndex, seed, dpr) {
  const { cv, g } = toile(TILE, dpr);
  const rand = mulberry32((seed >>> 0) * 6151 + biomeIndex * 97 + 1);
  const usure = USURE[diffIndex] ?? USURE[1];
  const cle = (BIOMES[biomeIndex] ?? BIOMES[0]).key;

  if (cle === "fonderie") fonderie(g, rand, usure);
  else if (cle === "friche") friche(g, rand, usure);
  else if (cle === "nebuleuse") nebuleuse(g, rand, usure);
  else usine(g, rand, usure);

  // LA FRICHE N A PAS DE MAILLE DE 5 M. Un joint technique regulier decrit une
  // installation entretenue ; une dalle de beton lave a des JOINTS DE COULAGE,
  // irreguliers, et c est `dalles()` qui les pose. La regularite du terrain est
  // exactement ce qu il faut casser ici.
  if (gfx > GFX_LOW && cle !== "friche" && cle !== "nebuleuse") maille(g, usure, cle);
  return cv;
}

function cuireMacro(biomeIndex, diffIndex, seed, dpr) {
  const { cv, g } = toile(MACRO, dpr);
  const rand = mulberry32((seed >>> 0) * 7919 + biomeIndex * 131 + 3);
  const usure = USURE[diffIndex] ?? USURE[1];
  const chaud = (BIOMES[biomeIndex] ?? BIOMES[0]).key === "fonderie";

  for (let i = 0; i < 5; i++) {
    const r = 260 + rand() * 300;
    nappe(g, rand() * MACRO, rand() * MACRO, r, "#ffffff", 0.016 + rand() * 0.014);
  }
  for (let i = 0; i < 7; i++) {
    const r = 200 + rand() * 340;
    nappe(g, rand() * MACRO, rand() * MACRO, r, "#000000", 0.05 + rand() * 0.07);
  }
  const n = 2 + Math.round(4 * usure);
  for (let i = 0; i < n; i++) {
    const r = 150 + rand() * 220;
    nappe(g, rand() * MACRO, rand() * MACRO, r,
          chaud ? PROP.led : PROP.rouille, 0.020 + 0.028 * usure);
  }
  return cv;
}

function nappe(g, x, y, r, couleur, a) {
  for (const dx of x < r ? [0, MACRO] : x > MACRO - r ? [0, -MACRO] : [0]) {
    for (const dy of y < r ? [0, MACRO] : y > MACRO - r ? [0, -MACRO] : [0]) {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      grad.addColorStop(0, alpha(couleur, a));
      grad.addColorStop(1, alpha(couleur, 0));
      g.fillStyle = grad;
      g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    }
  }
}

// LA GRILLE DESCEND DANS LA MATIERE. Une ligne tracee decrit un plan technique ;
// un joint a une epaisseur, un cote sombre et un cote clair, donc il decrit une
// SURFACE. Le bord de tuile porte le joint de 20 m, plus large.
function maille(g, usure, cle) {
  const sombre = alpha("#000000", cle === "fonderie" ? 0.30 : 0.24 + 0.08 * usure);
  const clair = alpha(cle === "fonderie" ? "#ffd9a8" : "#c8d2e2", 0.040 - 0.014 * usure);
  for (let v = MAILLE; v < TILE; v += MAILLE) {
    joint(g, v, 0, v, TILE, sombre, clair, 2);
    joint(g, 0, v, TILE, v, sombre, clair, 2);
  }
  joint(g, 0, 0, 0, TILE, sombre, clair, 3.5);
  joint(g, 0, 0, TILE, 0, sombre, clair, 3.5);
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

  // L'USINE FABRIQUE, DONC ELLE TRANSPORTE : deux paires de traces de roulage
  // qui traversent la tuile de bout en bout. C'est ce qui distingue un sol
  // d'atelier d'un sol de couloir — une usure DIRECTIONNELLE, pas dispersee.
  if (gfx > GFX_LOW) {
    for (const [v, vert] of [[TILE * 0.32, false], [TILE * 0.78, true]]) {
      for (const d of [-7, 7]) {
        g.strokeStyle = alpha("#000000", 0.09 + 0.05 * usure);
        g.lineWidth = 5;
        g.beginPath();
        if (vert) { g.moveTo(v + d, 0); g.lineTo(v + d, TILE); }
        else { g.moveTo(0, v + d); g.lineTo(TILE, v + d); }
        g.stroke();
        g.strokeStyle = alpha("#c8d2e2", 0.035);
        g.lineWidth = 1.4;
        g.stroke();
      }
    }
  }

  const n = Math.round(6 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 24 + rand() * 40, "#7a4a2a", 0.10 + rand() * 0.08);
  const h = 2 + Math.round(3 * usure);
  for (let i = 0; i < h; i++) tache(g, rand() * TILE, rand() * TILE, 18 + rand() * 26, "#000000", 0.12 + rand() * 0.10);
}

/* LA VOIE. Une fonderie TRANSPORTE des masses, donc elle a des rails coules
   dans le sol, avec leurs traverses. C est la seule usure directionnelle de ce
   lieu, et elle traverse la tuile de bout en bout. */
function voie(g, v, vertical) {
  for (const d of [-9, 9]) {
    g.strokeStyle = alpha("#000000", 0.30);
    g.lineWidth = 6;
    g.beginPath();
    if (vertical) { g.moveTo(v + d, 0); g.lineTo(v + d, TILE); }
    else { g.moveTo(0, v + d); g.lineTo(TILE, v + d); }
    g.stroke();
    g.strokeStyle = alpha(PROP.metal, 0.16);
    g.lineWidth = 2;
    g.stroke();
  }
  g.strokeStyle = alpha("#000000", 0.20);
  g.lineWidth = 3;
  g.beginPath();
  for (let t = 0; t < TILE; t += 27) {
    if (vertical) { g.moveTo(v - 15, t); g.lineTo(v + 15, t); }
    else { g.moveTo(t, v - 15); g.lineTo(t, v + 15); }
  }
  g.stroke();
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

  /* LA FONDERIE COULE, ET CA SE CUIT DANS LA MATIERE. La coulee ne dependait
     que de l'usure : en mode calme il n'en restait AUCUNE, et le sol de la
     Fonderie etait celui d'un couloir. Un plancher de base existe donc a tous
     les modes — c'est le lieu, pas la difficulte, qui le decide. */
  if (gfx > GFX_LOW) {
    for (let i = 0; i < 5; i++) {
      const x = rand() * TILE, y = rand() * TILE, r = 26 + rand() * 42;
      tache(g, x, y, r, PROP.scorie, 0.16 + rand() * 0.10);
      poser(g, x, y, r, (c) => {
        for (let k = 0; k < 7; k++) {
          const a = rand() * Math.PI * 2, d = rand() * r * 0.8;
          c.fillStyle = alpha("#000000", 0.14 + rand() * 0.12);
          c.beginPath();
          c.arc(Math.cos(a) * d, Math.sin(a) * d, 2 + rand() * 5, 0, Math.PI * 2);
          c.fill();
        }
      });
    }
    const brique = TILE / 2;
    g.fillStyle = alpha(PROP.brique, 0.10);
    g.fillRect(0, brique - 7, TILE, 14);
    g.strokeStyle = alpha("#000000", 0.16);
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x < TILE; x += 22) { g.moveTo(x, brique - 7); g.lineTo(x, brique + 7); }
    g.moveTo(0, brique); g.lineTo(TILE, brique);
    g.stroke();

    voie(g, TILE * 0.22, false);
    voie(g, TILE * 0.74, true);

    // LES ZONES VITRIFIEES : la ou le metal est tombe, le sol a FONDU puis
    // refroidi en verre. Presque noir, presque lisse, un cerne encore chaud —
    // c est la seule surface du depot qui soit plus sombre que le fond.
    for (let i = 0; i < 3; i++) {
      const x = rand() * TILE, y = rand() * TILE, r = 30 + rand() * 46;
      poser(g, x, y, r + 6, (c) => {
        c.fillStyle = alpha("#070507", 0.44);
        c.beginPath(); c.ellipse(0, 0, r, r * 0.72, rand() * 3, 0, Math.PI * 2); c.fill();
        c.strokeStyle = alpha(PROP.fonte, 0.14);
        c.lineWidth = 2.6;
        c.beginPath(); c.ellipse(0, 0, r + 2, r * 0.72 + 2, 0, 0, Math.PI * 2); c.stroke();
        c.fillStyle = alpha("#c8b4a8", 0.05);
        c.beginPath(); c.ellipse(-r * 0.3, -r * 0.22, r * 0.42, r * 0.16, -0.4, 0, Math.PI * 2); c.fill();
      });
    }
  }

  const n = 3 + Math.round(5 * usure);
  for (let i = 0; i < n; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const ang = rand() * Math.PI * 2, l = 40 + rand() * 70;
    poser(g, x, y, l, (c) => {
      c.lineCap = "round";
      const pts = [[0, 0]];
      let px = 0, py = 0, a = ang;
      for (let k = 0; k < 4; k++) {
        a += (rand() - 0.5) * 0.9;
        px += Math.cos(a) * (l / 4); py += Math.sin(a) * (l / 4);
        pts.push([px, py]);
      }
      const trait = (col, w) => {
        c.strokeStyle = col; c.lineWidth = w;
        c.beginPath(); c.moveTo(0, 0);
        for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]);
        c.stroke();
      };
      trait(alpha("#000000", 0.22), 5.4);
      trait(alpha(PROP.fonte, 0.16 + 0.14 * usure), 3.0);
      trait(alpha("#ffd9a8", 0.08 + 0.08 * usure), 1.0);
    });
  }
}

/* LA FRICHE EST UNE INSTALLATION ABANDONNEE, PAS UN PRE, ET SON SOL EST DU
   BETON — coule en dalles, lave par vingt ans de pluie, repris par ce qui
   pousse. Il n a donc PAS de maille de 5 m : `cuire()` la saute pour ce lieu.
   Ce qui la remplace est un reseau de joints de coulage irreguliers, et c est
   lui qui casse la regularite du terrain.

   Les joints ondulent avec des sinus de periode entiere sur la tuile : ils se
   raccordent donc d une tuile a l autre sans qu on ait rien a gerer.

   En `low` on garde la recette d avant : c est le contrat du palier. */
function friche(g, rand, usure) {
  if (gfx <= GFX_LOW) return fricheLegacy(g, rand, usure);

  dalles(g, rand, usure);

  for (let i = 0; i < 6; i++) {
    const x0 = rand() * TILE, y0 = rand() * TILE;
    const seg = 4 + Math.floor(rand() * 4);
    const l = 22 + rand() * 26;
    poser(g, x0, y0, seg * l, (c) => {
      c.lineCap = "round";
      let a = (rand() < 0.5 ? 0 : Math.PI / 2) + (rand() - 0.5) * 0.5;
      const pts = [[0, 0]];
      let px = 0, py = 0;
      for (let k = 0; k < seg; k++) {
        a += (rand() - 0.5) * 0.55;
        px += Math.cos(a) * l; py += Math.sin(a) * l;
        pts.push([px, py]);
      }
      const trait = (col, w, dx, dy) => {
        c.strokeStyle = col; c.lineWidth = w;
        c.beginPath(); c.moveTo(dx, dy);
        for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0] + dx, pts[k][1] + dy);
        c.stroke();
      };
      trait(alpha("#000000", 0.30 + 0.10 * usure), 3.2, 1, 1.4);
      trait(alpha(PROP.metalDark, 0.42), 2.4, 0, 0);
      trait(alpha(PROP.metal, 0.10), 0.9, -0.7, -0.9);
    });
  }

  for (let i = 0; i < 34; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const w = 2 + rand() * 6, h = 1.5 + rand() * 4;
    const a = rand() * Math.PI;
    poser(g, x, y, 10, (c) => {
      c.rotate(a);
      c.fillStyle = alpha("#000000", 0.26);
      c.fillRect(-w / 2 + 1, -h / 2 + 1.2, w, h);
      c.fillStyle = alpha(PROP.metal, 0.10 + rand() * 0.08);
      c.fillRect(-w / 2, -h / 2, w, h);
    });
  }

  for (let i = 0; i < 200; i++) {
    const x = rand() * TILE, y = rand() * TILE, r = 0.6 + rand() * 1.4;
    g.fillStyle = alpha(rand() < 0.65 ? "#000000" : PROP.metal, 0.03 + rand() * 0.05);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  // LES FLAQUES. Une friche retient l eau : un miroir mat, plus sombre que le
  // beton, avec un cerne clair de depot au bord. Aucun reflet — un reflet
  // demanderait de savoir ce qu il y a au-dessus, et il n y a rien.
  const f = 3 + Math.round(2 * usure);
  for (let i = 0; i < f; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const rx = 16 + rand() * 26, ry = rx * (0.45 + rand() * 0.3);
    const a = rand() * Math.PI;
    poser(g, x, y, rx + 4, (c) => {
      c.rotate(a);
      c.fillStyle = alpha("#0d1013", 0.34);
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = alpha("#8a8f7a", 0.10);
      c.lineWidth = 2.2;
      c.beginPath(); c.ellipse(0, 0, rx + 1.5, ry + 1.5, 0, 0, Math.PI * 2); c.stroke();
    });
  }

  const n = 3 + Math.round(4 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 30 + rand() * 55, PROP.rouille, 0.06 + 0.07 * usure);
  const m = Math.round(4 * usure);
  for (let i = 0; i < m; i++) tache(g, rand() * TILE, rand() * TILE, 45 + rand() * 60, "#000000", 0.10);
}

/* LES DALLES ET CE QUI POUSSE ENTRE. Trois seams verticaux, deux horizontaux,
   chacun ondule ; chaque dalle prend sa propre valeur, donc le sol cesse d etre
   une seule surface. La vegetation ne pousse QUE sur les joints — c est ce qui
   la rend credible : elle suit la fissure, elle ne colonise pas la dalle. */
const SEAM_X = [0.22, 0.55, 0.81];
const SEAM_Y = [0.31, 0.69];
function dalles(g, rand, usure) {
  const xs = [0, ...SEAM_X.map(v => v * TILE), TILE];
  const ys = [0, ...SEAM_Y.map(v => v * TILE), TILE];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const v = rand();
      g.fillStyle = alpha(v < 0.5 ? "#000000" : "#c8c4b4", 0.016 + v * 0.030);
      g.fillRect(xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j]);
    }
  }

  const onde = (t, k, ph) => Math.sin((t / TILE) * Math.PI * 2 * k + ph) * 3.2;
  const joint = (vertical, v, k, ph) => {
    for (const [col, w, d] of [["#000000", 3.4, 0], ["#9aa08d", 1.1, -1.6]]) {
      g.strokeStyle = alpha(col, col === "#000000" ? 0.34 + 0.10 * usure : 0.07);
      g.lineWidth = w;
      g.beginPath();
      for (let t = 0; t <= TILE; t += 8) {
        const o = onde(t, k, ph) + d;
        if (vertical) { const x = v + o, y = t; t === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
        else { const x = t, y = v + o; t === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      }
      g.stroke();
    }
    // ce qui pousse dans le joint : des touffes courtes, jamais un aplat vert.
    const touffes = 5 + Math.round(6 * (1 - usure * 0.4));
    for (let i = 0; i < touffes; i++) {
      const t = rand() * TILE;
      const o = onde(t, k, ph);
      const x = vertical ? v + o : t, y = vertical ? t : v + o;
      g.strokeStyle = alpha(PROP.vert, 0.20 + rand() * 0.18);
      g.lineWidth = 1;
      g.beginPath();
      for (let b = 0; b < 4; b++) {
        const a = -Math.PI / 2 + (rand() - 0.5) * 1.9;
        const l = 3 + rand() * 5;
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      g.stroke();
    }
  };

  SEAM_X.forEach((v, i) => joint(true, v * TILE, i + 1, i * 2.1));
  SEAM_Y.forEach((v, i) => joint(false, v * TILE, i + 2, i * 1.7));

  // LES FISSURES PARTENT DES JOINTS, jamais du milieu d une dalle : c est la
  // que le beton cede.
  const nf = 5 + Math.round(6 * usure);
  g.lineCap = "round";
  for (let i = 0; i < nf; i++) {
    const surX = rand() < 0.5;
    const v = (surX ? SEAM_X : SEAM_Y)[(rand() * (surX ? 3 : 2)) | 0] * TILE;
    const t = rand() * TILE;
    let x = surX ? v : t, y = surX ? t : v;
    let a = (surX ? 0 : Math.PI / 2) + (rand() - 0.5) * 1.4;
    g.strokeStyle = alpha("#000000", 0.26 + 0.14 * usure);
    g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      a += (rand() - 0.5) * 0.9;
      x += Math.cos(a) * (7 + rand() * 11); y += Math.sin(a) * (7 + rand() * 11);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.lineCap = "butt";
}

/* LA NEBULEUSE EST LE SEUL SOL QUI SOUSTRAIT. Les trois autres tuiles POSENT
   des couches translucides par-dessus la couleur d arene ; celle-ci peint un
   pont presque opaque puis en RETIRE les baies, et c est par ces trous que
   l arriere-plan se voit. On marche sur un plancher, jamais sur le vide.

   ET SON PLANCHER N EST PAS UNE TOLE : c est un NID D ABEILLE. Un panneau
   hexagonal ne se confond avec aucun des trois autres lieux — ni avec la maille
   de 5 m, qui est justement sautee ici. Une baie est donc une CELLULE retiree,
   pas un rectangle decoupe, et le reseau de joints devient son meneau.

   Presque opaque et non opaque (0,93) : la teinte de mode continue de traverser,
   sinon le pont serait identique en calme et en cauchemar. */
const HEX = 50;
const HEX_U = HEX / 3;
function cellule(g, cx, cy) {
  g.beginPath();
  g.moveTo(cx, cy - HEX_U * 2);
  g.lineTo(cx + HEX / 2, cy - HEX_U);
  g.lineTo(cx + HEX / 2, cy + HEX_U);
  g.lineTo(cx, cy + HEX_U * 2);
  g.lineTo(cx - HEX / 2, cy + HEX_U);
  g.lineTo(cx - HEX / 2, cy - HEX_U);
  g.closePath();
}
function centreHex(i, j) {
  return [i * HEX + ((j & 1) ? HEX / 2 : 0), j * HEX];
}

function nebuleuse(g, rand, usure) {
  if (gfx <= GFX_LOW) return usine(g, rand, usure);
  const N = TILE / HEX;

  g.fillStyle = alpha("#232b40", 0.93);
  g.fillRect(0, 0, TILE, TILE);

  for (let j = -1; j <= N; j++) {
    for (let i = -1; i <= N; i++) {
      const [cx, cy] = centreHex(i, j);
      const v = ((i * 7 + j * 13 + N) % 5) / 5;
      cellule(g, cx, cy);
      g.fillStyle = alpha(v < 0.4 ? "#000000" : PROP.givre, 0.014 + v * 0.026);
      g.fill();
    }
  }

  g.lineWidth = 2.4;
  g.strokeStyle = alpha("#000000", 0.40);
  g.beginPath();
  for (let j = -1; j <= N; j++) {
    for (let i = -1; i <= N; i++) {
      const [cx, cy] = centreHex(i, j);
      g.moveTo(cx, cy - HEX_U * 2);
      g.lineTo(cx + HEX / 2, cy - HEX_U);
      g.lineTo(cx + HEX / 2, cy + HEX_U);
      g.lineTo(cx, cy + HEX_U * 2);
    }
  }
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = alpha(PROP.givre, 0.055);
  g.stroke();

  // LES BAIES : des cellules RETIREES. `destination-out` parce qu un hexagone ne
  // se `clearRect` pas — et c est justement ce qui empeche la baie de redevenir
  // un rectangle.
  const baies = [];
  for (let k = 0; k < 3; k++) {
    baies.push([1 + Math.floor(rand() * (N - 2)), 1 + Math.floor(rand() * (N - 2))]);
  }
  g.save();
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "#000";
  for (const [i, j] of baies) {
    const [cx, cy] = centreHex(i, j);
    g.save(); g.translate(cx, cy); g.scale(0.82, 0.82); g.translate(-cx, -cy);
    cellule(g, cx, cy); g.fill();
    g.restore();
  }
  g.restore();
  for (const [i, j] of baies) {
    const [cx, cy] = centreHex(i, j);
    g.save(); g.translate(cx, cy); g.scale(0.82, 0.82); g.translate(-cx, -cy);
    cellule(g, cx, cy);
    g.strokeStyle = alpha("#000000", 0.50); g.lineWidth = 6; g.stroke();
    g.strokeStyle = alpha(PROP.givre, 0.20); g.lineWidth = 1.6; g.stroke();
    g.restore();
  }

  g.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const x = rand() * TILE, y = rand() * TILE, l = 12 + rand() * 30;
    g.strokeStyle = alpha(rand() < 0.5 ? PROP.metal : "#000000", 0.018 + rand() * 0.018);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke();
  }

  for (let i = 0; i < 10; i++) {
    poser(g, rand() * TILE, rand() * TILE, 4, (c) => {
      c.fillStyle = alpha("#000000", 0.30);
      c.beginPath(); c.arc(0.6, 0.8, 2.1, 0, Math.PI * 2); c.fill();
      c.fillStyle = alpha(PROP.givre, 0.13);
      c.beginPath(); c.arc(0, 0, 1.9, 0, Math.PI * 2); c.fill();
    });
  }

  const n = 2 + Math.round(4 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 24 + rand() * 40, PROP.givre, 0.045 + 0.03 * usure);
}

/* L'ARRIERE-PLAN, CUIT UNE FOIS. Deux couches parce qu'un fond a UNE seule
   parallaxe est un autocollant : les astres sont a l'infini (0,05), les etoiles
   proches derivent trois fois plus (0,16), et c'est cet ecart qui donne la
   profondeur. Deux `drawImage` par image, rien de plus.

   La derive de camera reste sous 250 px sur cette arene — la marge suffit, il
   n'y a pas de bouclage a gerer. */
const FOND_MARGE = 300;
let fondCache = null;

export function fondEspace(seed, viewW, viewH) {
  const cle = `${seed}|${viewW}|${viewH}`;
  if (fondCache && fondCache.cle === cle) return fondCache;
  const w = viewW + FOND_MARGE * 2, h = viewH + FOND_MARGE * 2;
  fondCache = { cle, w, h, marge: FOND_MARGE,
                loin: cuireLoin(seed, w, h), pres: cuireEtoiles(seed, w, h) };
  return fondCache;
}

function cuireLoin(seed, w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const rand = mulberry32((seed >>> 0) * 2749 + 17);

  // PAS DE RAINBOW NEON : deux froids et UN chaud, tous sous 22 % d'opacite.
  const teintes = ["#2a3a6e", "#3d2a5e", "#1c3a4a", "#5a3a22"];

  /* LA NEBULEUSE DOIT ETRE LE SUJET DU FOND, pas une tache dedans. Une BANDE
     traverse toute l image en diagonale — c est elle qui donne l echelle, parce
     qu elle ne tient pas dans l ecran — et les nuages se posent dessus. Un amas
     de taches rondes de meme taille se lit comme du bruit ; une bande plus des
     taches se lit comme une structure. */
  const ang = -0.42;
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(ang);
  const bande = g.createLinearGradient(0, -h * 0.42, 0, h * 0.42);
  bande.addColorStop(0, alpha("#2a3a6e", 0));
  bande.addColorStop(0.42, alpha("#3d2a5e", 0.13));
  bande.addColorStop(0.55, alpha("#2a3a6e", 0.16));
  bande.addColorStop(1, alpha("#1c3a4a", 0));
  g.fillStyle = bande;
  g.fillRect(-w, -h * 0.42, w * 2, h * 0.84);
  g.restore();

  for (let i = 0; i < 9; i++) {
    const x = rand() * w, y = rand() * h, r = 260 + rand() * 420;
    const col = teintes[(rand() * (i >= 7 ? 4 : 3)) | 0];
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, alpha(col, 0.13 + rand() * 0.07));
    grad.addColorStop(0.55, alpha(col, 0.05));
    grad.addColorStop(1, alpha(col, 0));
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (let i = 0; i < 3; i++) {
    astre(g, 120 + rand() * (w - 240), 90 + rand() * (h - 180),
          40 + rand() * 110, rand() * Math.PI * 2, rand());
  }
  return cv;
}

// UN ASTRE SANS TERMINATEUR EST UN DISQUE. Le croissant sombre est ce qui le
// rend spherique, et il coute un second arc en `destination-out` decale.
function astre(g, x, y, r, ang, t) {
  const froid = t < 0.62;
  const base = froid ? "#4a5570" : "#6b4a3a";
  const bord = froid ? PROP.astre : "#ffb060";

  const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, alpha(base, 0.46));
  grad.addColorStop(1, alpha(base, 0.14));
  g.fillStyle = grad;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();

  g.save();
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "#000";
  g.beginPath();
  g.arc(x + Math.cos(ang) * r * 0.62, y + Math.sin(ang) * r * 0.62, r * 0.98, 0, Math.PI * 2);
  g.fill();
  g.restore();

  g.strokeStyle = alpha(bord, 0.16);
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(x, y, r - 0.8, ang + Math.PI * 0.45, ang + Math.PI * 1.55);
  g.stroke();
}

/* Les etoiles sont groupees par PALIER de clarte : trois `fill`, pas un par
   etoile. Un `arc` par point aurait coute six cents chemins pour six cents
   pixels. */
function cuireEtoiles(seed, w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const rand = mulberry32((seed >>> 0) * 6779 + 31);
  const paliers = [[0.30, 1.0, 520], [0.55, 1.6, 190], [0.85, 2.4, 55]];

  for (const [a, taille, nombre] of paliers) {
    g.fillStyle = alpha(PROP.astre, a);
    g.beginPath();
    for (let i = 0; i < nombre; i++) {
      const x = rand() * w, y = rand() * h;
      g.rect(x, y, taille, taille);
    }
    g.fill();
  }
  return cv;
}

function fricheLegacy(g, rand, usure) {
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
