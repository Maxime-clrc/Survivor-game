import { CFG } from "/shared/game_state.js";
import { PROP, alpha } from "/shared/palette.js";
import { GFX_HIGH, GFX_LOW, gfx } from "../core/state.js";
import { biomeIndex, biomeSeed, camera, ctx, hazardsActifs, obstaclesActifs, skin } from "./stage.js";
import { biomeAt } from "/shared/biomes.js";

/* LE DECOR N'EXISTE AUJOURD'HUI QUE S'IL BLOQUE. Ce module ajoute ce qui ne
   bloque pas — et il le fait sans rien garder : la presence, le type, l'angle
   et l'echelle d'un prop sont des FONCTIONS de sa cellule monde et de la graine.
   Meme motif que `champ()` dans decor.js, ancre a une cellule au lieu d'un
   indice, donc le semis est infini, non repetitif et identique chez tous.

   REGLE ABSOLUE : rien ici ne doit se lire comme bloquant. Tout est plaque au
   sol. Un prop qui ferait hesiter un joueur sur une trajectoire est un bug. */
const CELL = 200;
const MARGE = 1;

/* UNE MAP DOIT RESSEMBLER A SON NOM. Six props communs — ils sont honnetement
   industriels et valent partout — et un jeu PROPRE a chaque biome, qui porte
   son verbe : l'Usine fabrique (convoyeurs, caisses, allees), la Fonderie coule
   (rigoles, lingots, scorie), la Friche a ete abandonnee (gravats, ferraille,
   tubes morts). Un catalogue partage rendait les trois interchangeables. */
const P_PLAQUE = 0, P_CAILLEBOTIS = 1, P_CABLE = 2, P_TUYAU = 3,
      P_DEBRIS = 4, P_MARQUAGE = 5, P_COFFRET = 6, P_TUBE = 7,
      P_CONVOYEUR = 8, P_CAISSES = 9, P_ALLEE = 10,
      P_RIGOLE = 11, P_LINGOTS = 12, P_SCORIE = 13,
      P_RAIL = 14, P_GIVRE = 15, P_ANCRAGE = 16, P_BALISE = 17;

// un prop emissif declare son RAYON et sa COULEUR : une rigole en fusion et un
// voyant de coffret ne sont pas la meme lumiere.
const EMISSIF = {
  [P_COFFRET]: { r: 54, col: PROP.led },
  [P_TUBE]:    { r: 78, col: PROP.led },
  [P_RIGOLE]:  { r: 96, col: PROP.fonte },
  [P_BALISE]:  { r: 70, col: PROP.balise },
};

const TABLE = {
  usine: [P_CONVOYEUR, P_CONVOYEUR, P_CAISSES, P_ALLEE, P_ALLEE, P_PLAQUE,
          P_CAILLEBOTIS, P_COFFRET, P_TUYAU, P_CABLE, P_MARQUAGE, P_DEBRIS],
  fonderie: [P_RIGOLE, P_RIGOLE, P_LINGOTS, P_LINGOTS, P_SCORIE, P_SCORIE,
             P_TUYAU, P_PLAQUE, P_DEBRIS, P_COFFRET, P_CAILLEBOTIS, P_MARQUAGE],
  friche: [P_DEBRIS, P_DEBRIS, P_CABLE, P_CABLE, P_PLAQUE, P_TUBE,
           P_COFFRET, P_MARQUAGE, P_TUYAU, P_DEBRIS, P_CAILLEBOTIS, P_CABLE],
  nebuleuse: [P_RAIL, P_RAIL, P_ANCRAGE, P_ANCRAGE, P_GIVRE, P_GIVRE,
              P_BALISE, P_CAILLEBOTIS, P_PLAQUE, P_CABLE, P_TUYAU, P_COFFRET],
};

// densite : 0 en `low` — le sol reste celui d'avant le plan 13.
const DENSITE = [0, 0.34, 0.58, 0.74];

function h2(x, y, s) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x85ebca6b) ^ Math.imul(s | 0, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2545f491); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const props = [];
let cle = "";

function occupe(x, y) {
  for (const o of obstaclesActifs()) {
    if (Math.abs(x - o.x) < o.w / 2 + 26 && Math.abs(y - o.y) < o.h / 2 + 26) return true;
  }
  for (const h of hazardsActifs()) {
    if ((x - h.x) ** 2 + (y - h.y) ** 2 < (h.r + 14) ** 2) return true;
  }
  return false;
}

function refresh() {
  const dens = DENSITE[gfx] ?? 0;
  const c0x = Math.floor(camera.x0 / CELL) - MARGE;
  const c0y = Math.floor(camera.y0 / CELL) - MARGE;
  const c1x = Math.ceil((camera.x0 + CFG.VIEW_W) / CELL) + MARGE;
  const c1y = Math.ceil((camera.y0 + CFG.VIEW_H) / CELL) + MARGE;
  const k = `${c0x},${c0y},${c1x},${c1y},${biomeIndex},${biomeSeed},${gfx}`;
  if (k === cle) return;
  cle = k;
  props.length = 0;
  if (dens <= 0) return;

  const table = TABLE[biomeAt(biomeIndex).key] ?? TABLE.usine;
  const s = biomeSeed >>> 0;

  for (let cy = c0y; cy <= c1y; cy++) {
    for (let cx = c0x; cx <= c1x; cx++) {
      if (cx < 0 || cy < 0 || cx * CELL > CFG.ARENA_W || cy * CELL > CFG.ARENA_H) continue;
      const n = h2(cx, cy, s) < dens ? (h2(cx, cy, s + 31) < 0.28 ? 2 : 1) : 0;
      for (let i = 0; i < n; i++) {
        const g = s + 101 * (i + 1);
        const x = (cx + 0.12 + h2(cx, cy, g + 1) * 0.76) * CELL;
        const y = (cy + 0.12 + h2(cx, cy, g + 2) * 0.76) * CELL;
        if (occupe(x, y)) continue;
        props.push({
          k: table[(h2(cx, cy, g + 3) * table.length) | 0],
          x, y,
          a: h2(cx, cy, g + 4) * Math.PI * 2,
          s: 0.72 + h2(cx, cy, g + 5) * 0.66,
          o: 0.55 + h2(cx, cy, g + 6) * 0.45,
          p: h2(cx, cy, g + 7),
        });
      }
    }
  }
}

/* Un prop emissif porte la meme description qu'un danger : `lumiere.js` la
   consomme sans rien savoir du catalogue. */
export function forEachPropLight(fn) {
  if (gfx < GFX_HIGH) return;
  refresh();
  for (const p of props) {
    const e = EMISSIF[p.k];
    if (!e) continue;
    fn(p.x, p.y, e.r * p.s, e.col, gresil(p));
  }
}

/* TROIS LUMIERES, TROIS COMPORTEMENTS. Un tube mort GRESILLE — il tient,
   faiblit, revient d'un coup ; un voyant de coffret RESPIRE ; du metal en
   fusion ONDULE, lentement et sans jamais s'eteindre. Le comportement dit la
   matiere mieux que la couleur. */
function gresil(p) {
  const t = performance.now() / 1000;
  if (p.k === P_TUBE) {
    const u = Math.sin(t * (7 + p.p * 5) + p.p * 12) * Math.sin(t * 1.7 + p.p * 3);
    return u > 0.15 ? 1 : u > -0.2 ? 0.35 : 0.06;
  }
  if (p.k === P_RIGOLE) {
    return 0.70 + 0.30 * (0.5 + 0.5 * Math.sin(t * (0.42 + p.p * 0.3) + p.p * 7));
  }
  // une balise d'arrimage BAT : elle appelle, elle n'eclaire pas.
  if (p.k === P_BALISE) {
    const u = (t * (0.6 + p.p * 0.2) + p.p) % 1;
    return u < 0.12 ? 1 : u < 0.24 ? 0.5 : 0.10;
  }
  return 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * (1.1 + p.p) + p.p * 9));
}

export function drawProps() {
  if (gfx <= GFX_LOW) return;
  refresh();
  if (props.length === 0) return;
  const dir = skin().dir;
  const ox = dir[0] * 2.4, oy = dir[1] * 2.4;

  for (const p of props) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.scale(p.s, p.s);
    ctx.globalAlpha = p.o;
    dessin(p, ox, oy);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function dessin(p, ox, oy) {
  switch (p.k) {
    case P_PLAQUE:      return plaque(ox, oy);
    case P_CAILLEBOTIS: return caillebotis(ox, oy);
    case P_CABLE:       return cable(p);
    case P_TUYAU:       return tuyau(ox, oy);
    case P_DEBRIS:      return debris(p, ox, oy);
    case P_MARQUAGE:    return marquage(p);
    case P_COFFRET:     return coffret(p, ox, oy);
    case P_CONVOYEUR:   return convoyeur(p, ox, oy);
    case P_CAISSES:     return caisses(p, ox, oy);
    case P_ALLEE:       return allee(p);
    case P_RIGOLE:      return rigole(p);
    case P_LINGOTS:     return lingots(p, ox, oy);
    case P_SCORIE:      return scorie(p);
    case P_RAIL:        return rail(p, ox, oy);
    case P_GIVRE:       return givre(p);
    case P_ANCRAGE:     return ancrage(ox, oy);
    case P_BALISE:      return balise(p, ox, oy);
    default:            return tube(p, ox, oy);
  }
}

/* --- NEBULEUSE : ce qui ARRIME ----------------------------------------- */

function rail(p, ox, oy) {
  const l = 88 + p.p * 54;
  for (const dy of [-6, 6]) {
    ctx.fillStyle = alpha(PROP.ombre, 0.32);
    ctx.fillRect(-l / 2 + ox, dy - 2 + oy, l, 4);
    ctx.fillStyle = alpha(PROP.metalDark, 0.88);
    ctx.fillRect(-l / 2, dy - 2, l, 4);
    ctx.fillStyle = alpha(PROP.givre, 0.14);
    ctx.fillRect(-l / 2, dy - 2, l, 1.2);
  }
  ctx.fillStyle = alpha(PROP.metal, 0.16);
  for (let x = -l / 2 + 10; x < l / 2; x += 26) ctx.fillRect(x, -7, 3, 14);
}

// LE GIVRE N'A PAS DE CONTOUR : c'est un depot, pas un objet. Des taches molles
// et claires, jamais un trace ferme — un contour en ferait une zone.
function givre(p) {
  const n = 6 + ((p.p * 5) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 4;
    const d = ((i * 47 + p.p * 97) % 18);
    const r = 5 + ((i * 23 + p.p * 41) % 9);
    const grad = ctx.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0,
                                          Math.cos(a) * d, Math.sin(a) * d, r);
    grad.addColorStop(0, alpha(PROP.givre, 0.16));
    grad.addColorStop(1, alpha(PROP.givre, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ancrage(ox, oy) {
  const r = 11;
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.beginPath(); ctx.arc(ox, oy, r + 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.82);
  ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.44);
  ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = alpha(PROP.metal, 0.26);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.fillRect(Math.cos(a) * (r + 1) - 2, Math.sin(a) * (r + 1) - 2, 4, 4);
  }
}

function balise(p, ox, oy) {
  const k = gresil(p);
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.90);
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.30);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = alpha(PROP.balise, 0.28 + 0.62 * k);
  ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
}

/* --- USINE : ce qui FABRIQUE ------------------------------------------- */

function convoyeur(p, ox, oy) {
  const l = 68 + p.p * 40, w = 17;
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.fillRect(-l / 2 + ox, -w / 2 + oy, l, w);
  ctx.fillStyle = alpha(PROP.metalDark, 0.86);
  ctx.fillRect(-l / 2, -w / 2, l, w);
  ctx.strokeStyle = alpha(PROP.ombre, 0.46);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let x = -l / 2 + 5; x < l / 2; x += 9) {
    ctx.moveTo(x, -w / 2 + 1.5); ctx.lineTo(x, w / 2 - 1.5);
  }
  ctx.stroke();
  ctx.fillStyle = alpha(PROP.metal, 0.22);
  ctx.fillRect(-l / 2, -w / 2, l, 2);
  ctx.fillRect(-l / 2, w / 2 - 2, l, 2);
}

function caisses(p, ox, oy) {
  const n = 2 + ((p.p * 3) | 0);
  for (let i = 0; i < n; i++) {
    const c = 13 + ((i * 29 + p.p * 61) % 8);
    const dx = ((i * 41 + p.p * 83) % 17) - 8, dy = ((i * 23 + p.p * 47) % 17) - 8;
    ctx.fillStyle = alpha(PROP.ombre, 0.34);
    ctx.fillRect(dx - c / 2 + ox * 1.5, dy - c / 2 + oy * 1.5, c, c);
    ctx.fillStyle = alpha(PROP.rouille, 0.52);
    ctx.fillRect(dx - c / 2, dy - c / 2, c, c);
    ctx.strokeStyle = alpha(PROP.peint, 0.22);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(dx - c / 2, dy - c / 2, c, c);
    ctx.beginPath();
    ctx.moveTo(dx - c / 2, dy); ctx.lineTo(dx + c / 2, dy);
    ctx.stroke();
  }
}

// L'ALLEE N'EST PAS UN AVERTISSEMENT : deux lignes continues et pales, pas des
// hachures. Un marquage hachure se lit comme un telegraphe.
function allee(p) {
  const l = 96 + p.p * 60;
  ctx.strokeStyle = alpha(PROP.peint, 0.13 + p.p * 0.06);
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-l / 2, -9); ctx.lineTo(l / 2, -9);
  ctx.moveTo(-l / 2, 9); ctx.lineTo(l / 2, 9);
  ctx.stroke();
}

/* --- FONDERIE : ce qui COULE ------------------------------------------- */

function rigole(p) {
  const l = 74 + p.p * 46, w = 13;
  const k = gresil(p);
  ctx.fillStyle = alpha(PROP.ombre, 0.55);
  ctx.fillRect(-l / 2, -w / 2, l, w);
  ctx.fillStyle = alpha(PROP.brique, 0.44);
  ctx.fillRect(-l / 2, -w / 2, l, 2.6);
  ctx.fillRect(-l / 2, w / 2 - 2.6, l, 2.6);
  ctx.fillStyle = alpha(PROP.fonte, 0.30 + 0.34 * k);
  ctx.fillRect(-l / 2 + 2, -w / 2 + 3.4, l - 4, w - 6.8);
  ctx.fillStyle = alpha("#ffd9a8", 0.22 + 0.30 * k);
  ctx.fillRect(-l / 2 + 6, -1.1, l - 12, 2.2);
  ctx.fillStyle = alpha(PROP.scorie, 0.60);
  for (let i = 0; i < 3; i++) {
    const x = -l / 2 + 12 + ((i * 37 + p.p * 71) % Math.max(1, l - 24));
    ctx.fillRect(x, -w / 2 + 3.4, 5 + (i % 3) * 3, w - 6.8);
  }
}

function lingots(p, ox, oy) {
  const n = 3 + ((p.p * 3) | 0);
  for (let i = 0; i < n; i++) {
    const w = 22, h = 7;
    const dy = (i - (n - 1) / 2) * (h + 1.6);
    const dx = ((i * 31 + p.p * 53) % 9) - 4;
    ctx.fillStyle = alpha(PROP.ombre, 0.34);
    ctx.fillRect(dx - w / 2 + ox, dy - h / 2 + oy, w, h);
    ctx.fillStyle = alpha(PROP.metalDark, 0.90);
    ctx.beginPath();
    ctx.moveTo(dx - w / 2, dy + h / 2);
    ctx.lineTo(dx - w / 2 + 2.6, dy - h / 2);
    ctx.lineTo(dx + w / 2 - 2.6, dy - h / 2);
    ctx.lineTo(dx + w / 2, dy + h / 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = alpha(PROP.metal, 0.16);
    ctx.fillRect(dx - w / 2 + 3, dy - h / 2, w - 6, 1.4);
  }
}

function scorie(p) {
  const n = 5 + ((p.p * 5) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 5;
    const d = 5 + ((i * 43 + p.p * 89) % 16);
    const r = 3.5 + ((i * 19 + p.p * 37) % 6);
    ctx.fillStyle = alpha(PROP.scorie, 0.50 + (i % 3) * 0.12);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = alpha(PROP.ombre, 0.24);
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
}

function plaque(ox, oy) {
  const r = 15;
  ctx.fillStyle = alpha(PROP.ombre, 0.32);
  ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.72);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.30);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, r - 2.5, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = alpha(PROP.ombre, 0.45);
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
    ctx.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.stroke();
  }
}

function caillebotis(ox, oy) {
  const w = 34, h = 22;
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha(PROP.ombre, 0.55);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1.4;
  for (let x = -w / 2 + 3; x < w / 2; x += 4.5) {
    ctx.beginPath(); ctx.moveTo(x, -h / 2 + 1.5); ctx.lineTo(x, h / 2 - 1.5); ctx.stroke();
  }
  ctx.strokeStyle = alpha(PROP.metal, 0.34);
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
}

function cable(p) {
  const l = 46 + p.p * 34;
  const n = 2 + ((p.p * 3) | 0);
  for (let i = 0; i < n; i++) {
    const dy = (i - (n - 1) / 2) * 2.8;
    const bosse = 5 + p.p * 6;
    ctx.strokeStyle = alpha(PROP.ombre, 0.34);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-l / 2 + 1, dy + 1.4);
    ctx.quadraticCurveTo(0, dy + bosse + 1.4, l / 2 + 1, dy + 1.4);
    ctx.stroke();
    ctx.strokeStyle = alpha(PROP.metalDark, 0.62);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-l / 2, dy);
    ctx.quadraticCurveTo(0, dy + bosse, l / 2, dy);
    ctx.stroke();
  }
}

function tuyau(ox, oy) {
  const l = 58, r = 5;
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-l / 2 + ox, -r + oy, l, r * 2);
  ctx.fillStyle = alpha(PROP.metalDark, 0.80);
  ctx.fillRect(-l / 2, -r, l, r * 2);
  ctx.fillStyle = alpha(PROP.metal, 0.20);
  ctx.fillRect(-l / 2, -r, l, 1.8);
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-l / 2, r - 1.4, l, 1.4);
  ctx.fillStyle = alpha(PROP.metal, 0.16);
  for (const x of [-l / 2 + 8, 0, l / 2 - 8]) ctx.fillRect(x - 1.6, -r - 1.4, 3.2, r * 2 + 2.8);
}

function debris(p, ox, oy) {
  const n = 3 + ((p.p * 4) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 6;
    const d = 4 + ((i * 37 + p.p * 91) % 13);
    const w = 2.4 + ((i * 17 + p.p * 53) % 5);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a * 1.7);
    ctx.fillStyle = alpha(PROP.ombre, 0.36);
    ctx.fillRect(-w / 2 + ox, -w / 3 + oy, w, w * 0.66);
    ctx.fillStyle = alpha(i % 3 === 0 ? PROP.rouille : PROP.metalDark, 0.72);
    ctx.fillRect(-w / 2, -w / 3, w, w * 0.66);
    ctx.restore();
  }
}

// LE MARQUAGE PEINT EST EFFACE, PAS NEUF : c'est ce qui l'empeche de se lire
// comme un telegraphe. Il n'est jamais sature, jamais anime.
function marquage(p) {
  const w = 52, h = 15;
  ctx.save();
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
  ctx.strokeStyle = alpha(PROP.peint, 0.16 + p.p * 0.10);
  ctx.lineWidth = 5;
  for (let x = -w; x < w; x += 11) {
    ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h * 1.2, -h); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = alpha(PROP.peint, 0.13);
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
}

function coffret(p, ox, oy) {
  const w = 20, h = 13;
  ctx.fillStyle = alpha(PROP.ombre, 0.40);
  ctx.fillRect(-w / 2 + ox * 1.6, -h / 2 + oy * 1.6, w, h);
  ctx.fillStyle = alpha(PROP.metalDark, 0.90);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = alpha(PROP.metal, 0.34);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.ombre, 0.50);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 3.4);
  const k = gresil(p);
  ctx.fillStyle = alpha(PROP.led, 0.30 + 0.70 * k);
  ctx.fillRect(w / 2 - 5, h / 2 - 4.4, 2.6, 2.6);
}

function tube(p, ox, oy) {
  const l = 40, r = 2.6;
  const k = gresil(p);
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-l / 2 + ox, -r + oy, l, r * 2);
  ctx.fillStyle = alpha(PROP.verre, 0.22);
  ctx.fillRect(-l / 2, -r, l, r * 2);
  ctx.fillStyle = alpha(PROP.led, 0.18 + 0.62 * k);
  ctx.fillRect(-l / 2 + 2, -r + 0.8, l - 4, r * 2 - 1.6);
  ctx.fillStyle = alpha(PROP.metalDark, 0.85);
  ctx.fillRect(-l / 2 - 2, -r - 1, 4, r * 2 + 2);
  ctx.fillRect(l / 2 - 2, -r - 1, 4, r * 2 + 2);
}
