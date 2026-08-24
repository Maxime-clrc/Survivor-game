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

/* UNE MAP DOIT RESSEMBLER A SON NOM. Un jeu de props PROPRE a chaque biome, qui
   porte son verbe : l'Usine fabrique (convoyeurs, caisses, allees), la Fonderie
   coule (rigoles, lingots, scorie), la Friche a ete abandonnee (gravats,
   ferraille, tubes morts), la Nebuleuse FLOTTE. Un catalogue partage rendait les
   quatre interchangeables.

   LA NEBULEUSE NE PARTAGE PLUS RIEN. Elle tirait cinq props sur douze dans le
   fonds commun — caillebotis, plaque, cable, tuyau, coffret : de la quincaillerie
   TERRESTRE, posee au sol d'une station orbitale parce qu'elle etait deja
   ecrite. C'est la seule justification qu'un prop n'a pas le droit d'avoir. Son
   catalogue est desormais entierement le sien ; le lien avec les trois autres
   lieux passe par la charte, les cadres et les effets de jeu, pas par un tuyau.

   Les trois autres gardent leur fonds commun : il est honnetement industriel, et
   eux SONT des installations industrielles. */
const P_CAILLEBOTIS = 1, P_CABLE = 2, P_TUYAU = 3,
      P_DEBRIS = 4, P_MARQUAGE = 5, P_TUBE = 7,
      P_CONVOYEUR = 8, P_CAISSES = 9, P_ALLEE = 10,
      P_RIGOLE = 11, P_LINGOTS = 12, P_SCORIE = 13,
      P_RAIL = 14, P_GIVRE = 15, P_ANCRAGE = 16, P_BALISE = 17,
      P_EPAVE = 18, P_VOILE = 19, P_MODULE = 20, P_CRISTAL = 21, P_ANTENNE = 22,
      P_BROUSSE = 23, P_JONCHEE = 24, P_GRILLAGE = 25, P_CARCASSE = 26,
      P_BIDON = 27, P_PANNEAU = 28,
      P_BRAS = 29, P_PRESSE = 30, P_VENTILATION = 31, P_PALETTIER = 32,
      P_POCHE = 33, P_MOULE = 34, P_TREMIE = 35, P_OUTILLAGE = 36;

/* UN PROP QUI BOUGE N'EST PAS UN SIGNAL, A UNE CONDITION QUI SE VERIFIE : SON
   MOUVEMENT EST CONTINU ET PERIODIQUE, donc il n'a ni debut ni fin, donc il
   n'annonce rien. Un telegraphe a un debut et une echeance — c'est exactement ce
   qui le rend lisible, et c'est ce canal-la qui appartient au boss.

   La regle « une matiere est desaturee et fixe » reste entiere sur la SATURATION.
   Sur le mouvement, le depot l'avait deja assouplie sans le dire : un tube mort
   gresille, un voyant respire, du metal en fusion ondule, une balise bat. Le
   comportement est un canal de MATIERE. L'Usine est le lieu qui l'exploite le
   plus, parce que c'est le seul dont le verbe soit au present. */
const CYCLE = (t, periode, phase) => ((t / periode) + phase) % 1;

// un prop emissif declare son RAYON et sa COULEUR : une poche en fusion et un
// tube mort ne sont pas la meme lumiere.
const EMISSIF = {
  [P_TUBE]:    { r: 78, col: PROP.led },
  [P_RIGOLE]:  { r: 96, col: PROP.fonte },
  [P_POCHE]:   { r: 120, col: PROP.fonte },
  [P_BALISE]:  { r: 70, col: PROP.balise },
  [P_CRISTAL]: { r: 86, col: PROP.balise },
};

const TABLE = {
  usine: [P_CONVOYEUR, P_CONVOYEUR, P_CONVOYEUR, P_BRAS, P_PRESSE, P_VENTILATION,
          P_PALETTIER, P_CAISSES, P_ALLEE, P_ALLEE, P_MARQUAGE, P_CABLE],
  // la PLAQUE et le COFFRET sont SUPPRIMES du depot, pas deplaces : elle etait le
  // dernier lieu a les tirer, et un prop que plus aucune table ne tire ne
  // s'oublie pas au catalogue. Elle garde le caillebotis et le tuyau — une
  // fonderie a des grilles de sol et des conduites, ce n'est pas de l'emprunt.
  fonderie: [P_POCHE, P_RIGOLE, P_RIGOLE, P_MOULE, P_MOULE, P_TREMIE,
             P_OUTILLAGE, P_LINGOTS, P_SCORIE, P_SCORIE, P_CAILLEBOTIS, P_TUYAU],
  // le TUBE reste, et il n'est plus tire que par elle : un neon qui gresille est
  // le seul reste ALLUME que ce lieu s'autorise, et son comportement dit
  // l'abandon mieux qu'une rouille de plus. Le coffret, lui, part — un voyant
  // qui respire dit qu'un appareil FONCTIONNE, et plus rien ne fonctionne ici.
  friche: [P_BROUSSE, P_BROUSSE, P_BROUSSE, P_JONCHEE, P_JONCHEE, P_GRILLAGE,
           P_CARCASSE, P_BIDON, P_PANNEAU, P_TUBE, P_DEBRIS, P_CABLE],
  nebuleuse: [P_EPAVE, P_EPAVE, P_VOILE, P_VOILE, P_CRISTAL, P_CRISTAL,
              P_MODULE, P_ANTENNE, P_RAIL, P_ANCRAGE, P_GIVRE, P_BALISE],
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
  if (p.k === P_RIGOLE || p.k === P_POCHE) {
    return 0.70 + 0.30 * (0.5 + 0.5 * Math.sin(t * (0.42 + p.p * 0.3) + p.p * 7));
  }
  // une balise d'arrimage BAT : elle appelle, elle n'eclaire pas.
  if (p.k === P_BALISE) {
    const u = (t * (0.6 + p.p * 0.2) + p.p) % 1;
    return u < 0.12 ? 1 : u < 0.24 ? 0.5 : 0.10;
  }
  // un cristal RESPIRE PROFOND et lentement : rien ne le commande, rien ne
  // l'alimente. C'est la seule source du depot qui ne soit pas un appareil.
  if (p.k === P_CRISTAL) {
    return 0.30 + 0.70 * (0.5 + 0.5 * Math.sin(t * (0.24 + p.p * 0.16) + p.p * 11));
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
    case P_CAILLEBOTIS: return caillebotis(ox, oy);
    case P_CABLE:       return cable(p);
    case P_TUYAU:       return tuyau(ox, oy);
    case P_DEBRIS:      return debris(p, ox, oy);
    case P_MARQUAGE:    return marquage(p);
    case P_POCHE:       return poche(p, ox, oy);
    case P_MOULE:       return moule(p, ox, oy);
    case P_TREMIE:      return tremie(p, ox, oy);
    case P_OUTILLAGE:   return outillage(p, ox, oy);
    case P_CONVOYEUR:   return convoyeur(p, ox, oy);
    case P_CAISSES:     return caisses(p, ox, oy);
    case P_ALLEE:       return allee(p);
    case P_RIGOLE:      return rigole(p);
    case P_LINGOTS:     return lingots(p, ox, oy);
    case P_SCORIE:      return scorie(p);
    case P_BRAS:        return bras(p, ox, oy);
    case P_PRESSE:      return presse(p, ox, oy);
    case P_VENTILATION: return ventilation(p, ox, oy);
    case P_PALETTIER:   return palettier(p, ox, oy);
    case P_BROUSSE:     return brousse(p);
    case P_JONCHEE:     return jonchee(p, ox, oy);
    case P_GRILLAGE:    return grillage(p, ox, oy);
    case P_CARCASSE:    return carcasse(p, ox, oy);
    case P_BIDON:       return bidon(p, ox, oy);
    case P_PANNEAU:     return panneau(p, ox, oy);
    case P_EPAVE:       return epave(p, ox, oy);
    case P_VOILE:       return voile(p, ox, oy);
    case P_MODULE:      return module_(p, ox, oy);
    case P_CRISTAL:     return cristal(p);
    case P_ANTENNE:     return antenne(p, ox, oy);
    case P_RAIL:        return rail(p, ox, oy);
    case P_GIVRE:       return givre(p);
    case P_ANCRAGE:     return ancrage(ox, oy);
    case P_BALISE:      return balise(p, ox, oy);
    default:            return tube(p, ox, oy);
  }
}

/* --- FRICHE : ce qui a ETE LAISSE --------------------------------------- */

/* LA BROUSSE, ET C'EST ELLE QUI DIT « ABANDONNEE » MIEUX QUE TOUTE ROUILLE. Une
   friche n'est pas une usine sombre : c'est un endroit d'ou l'homme est parti, et
   ce qui le prouve est ce qui a POUSSE depuis. Aucune touffe n'est plantee, elles
   naissent d'un centre et s'ecartent — une couronne reguliere ferait un massif.

   Pas de contour, pas de masse pleine : le module ne dessine QUE du plaque au sol,
   et un buisson qui aurait du volume se lirait comme bloquant. */
function brousse(p) {
  const n = 5 + ((p.p * 4) | 0);
  ctx.fillStyle = alpha(PROP.ombre, 0.16);
  ctx.beginPath(); ctx.ellipse(1.5, 2, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 6;
    const d = 2 + ((i * 31 + p.p * 67) % 9);
    const cx = Math.cos(a) * d, cy = Math.sin(a) * d * 0.8;
    const brins = 5 + (i % 3);
    ctx.strokeStyle = alpha(PROP.vert, 0.26 + ((i * 13 + p.p * 41) % 7) / 24);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let b = 0; b < brins; b++) {
      const ba = -Math.PI / 2 + (((b * 29 + i * 17 + p.p * 53) % 20) / 10 - 1) * 1.5;
      const l = 4 + ((b * 23 + i * 11 + p.p * 37) % 8);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ba) * l, cy + Math.sin(ba) * l);
    }
    ctx.stroke();
  }
}

/* LA JONCHEE. Du beton casse, pas de la ferraille : des blocs anguleux, clairs
   sur le dessus et sombres sur la tranche, et QUELQUES fers qui en sortent. Le
   fer est ce qui distingue un moellon d'un caillou. */
function jonchee(p, ox, oy) {
  const n = 4 + ((p.p * 4) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 7;
    const d = 3 + ((i * 41 + p.p * 79) % 15);
    const w = 5 + ((i * 19 + p.p * 47) % 8), h = w * 0.62;
    const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.82;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a * 1.3);
    ctx.fillStyle = alpha(PROP.ombre, 0.34);
    ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
    ctx.fillStyle = alpha("#7e7a6e", 0.60 + (i % 3) * 0.10);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = alpha(PROP.ombre, 0.30);
    ctx.fillRect(-w / 2, h / 2 - 1.4, w, 1.4);
    ctx.restore();
  }
  ctx.strokeStyle = alpha(PROP.rouille, 0.52);
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = p.p * 9 + i * 2.1;
    const d = 4 + ((i * 37 + p.p * 61) % 10);
    const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.8;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 1) * 6, y + Math.sin(a + 1) * 5,
                         x + Math.cos(a + 0.4) * 11, y + Math.sin(a + 0.4) * 9);
  }
  ctx.stroke();
  ctx.lineCap = "butt";
}

/* LE GRILLAGE TOMBE. Un panneau de cloture couche au sol : une maille losangee,
   AFFAISSEE en son milieu — une maille reguliere decrirait une cloture encore
   debout, et celle-ci ne l'est plus depuis longtemps. Le cadre est tordu, donc
   ses deux montants ne sont pas paralleles. */
function grillage(p, ox, oy) {
  const w = 44 + p.p * 22, h = 26 + p.p * 10;
  const gauche = h * (0.86 + p.p * 0.2), droite = h * (1.1 - p.p * 0.18);
  const bordY = (u) => (-gauche + (droite - gauche) * u) / 2;

  ctx.strokeStyle = alpha(PROP.ombre, 0.30);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const u = i / 6, x = -w / 2 + w * u;
    ctx.moveTo(x + ox, bordY(u) + oy); ctx.lineTo(x + ox, -bordY(u) + oy);
  }
  ctx.stroke();

  ctx.strokeStyle = alpha(PROP.metal, 0.24);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const u = i / 6, x = -w / 2 + w * u;
    ctx.moveTo(x, bordY(u)); ctx.lineTo(x + w / 6, -bordY(u + 1 / 6));
    ctx.moveTo(x, -bordY(u)); ctx.lineTo(x + w / 6, bordY(u + 1 / 6));
  }
  ctx.stroke();

  ctx.strokeStyle = alpha(PROP.rouille, 0.46);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-w / 2, bordY(0)); ctx.lineTo(w / 2, bordY(1));
  ctx.moveTo(-w / 2, -bordY(0)); ctx.lineTo(w / 2, -bordY(1));
  ctx.stroke();
}

/* LA CARCASSE. Une machine qu'on a videe : un chassis rouille, un tambour reste
   dedans, et une trappe OUVERTE — c'est la trappe qui dit qu'on est venu prendre
   ce qu'il y avait a prendre. */
function carcasse(p, ox, oy) {
  const w = 40 + p.p * 16, h = 26 + p.p * 9;
  ctx.fillStyle = alpha(PROP.ombre, 0.38);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha(PROP.rouille, 0.62);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#0d0c0a", 0.72);
  ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);

  ctx.strokeStyle = alpha(PROP.metalDark, 0.70);
  ctx.lineWidth = 2.2;
  ctx.strokeRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3);

  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(-w * 0.12, 0, h * 0.28, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(-w * 0.12, 0, h * 0.14, 0, Math.PI * 2); ctx.stroke();

  // la trappe, rabattue sur le cote et plus claire que le trou.
  ctx.fillStyle = alpha(PROP.rouille, 0.50);
  ctx.fillRect(w / 2 - 1, -h * 0.34, 13, h * 0.66);
  ctx.strokeStyle = alpha(PROP.metalDark, 0.60);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(w / 2 - 1, -h * 0.34, 13, h * 0.66);
}

/* LE BIDON RENVERSE. Couche, jamais debout : un fut debout est un obstacle, et
   rien ici n'a le droit de se lire comme bloquant. Deux cerclages, un fond
   ELLIPTIQUE — c'est l'ellipse qui dit qu'il est sur le flanc. */
function bidon(p, ox, oy) {
  const l = 26 + p.p * 10, r = 8 + p.p * 2.5;
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-l / 2 + ox, -r + oy, l, r * 2);
  ctx.fillStyle = alpha(PROP.rouille, 0.66);
  ctx.fillRect(-l / 2, -r, l, r * 2);
  ctx.fillStyle = alpha("#c8c4b4", 0.07);
  ctx.fillRect(-l / 2, -r, l, r * 0.7);
  ctx.strokeStyle = alpha(PROP.ombre, 0.40);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const u of [-0.22, 0.22]) {
    ctx.moveTo(l * u, -r); ctx.lineTo(l * u, r);
  }
  ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.74);
  ctx.beginPath(); ctx.ellipse(-l / 2, 0, 2.6, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.rouille, 0.40);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(l / 2, 0, 2.6, r, 0, 0, Math.PI * 2); ctx.stroke();
}

/* LE PANNEAU CASSE. Il est TOMBE, avec son pied et son massif de beton : un
   panneau encore droit dirait qu'on entretient les lieux. Sa tole est percee, et
   ce qui restait de peinture est efface — jamais sature, sinon il redevient un
   avertissement, et le canal de l'avertissement appartient au jeu. */
function panneau(p, ox, oy) {
  const w = 24 + p.p * 9, h = 17 + p.p * 6;
  ctx.strokeStyle = alpha(PROP.metalDark, 0.68);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.lineTo(w * 0.5 + 22, 4 + p.p * 5);
  ctx.stroke();
  ctx.fillStyle = alpha("#6b6a60", 0.50);
  ctx.fillRect(w * 0.5 + 20, -3 + p.p * 5, 9, 12);

  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha("#5a5a52", 0.72);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = alpha(PROP.peint, 0.16);
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  // les percements : ils traversent, donc ils sont NOIRS et non gris.
  ctx.fillStyle = alpha("#0a0a08", 0.80);
  for (let i = 0; i < 3; i++) {
    const x = -w / 2 + 4 + ((i * 37 + p.p * 71) % Math.max(1, w - 8));
    const y = -h / 2 + 3 + ((i * 23 + p.p * 53) % Math.max(1, h - 6));
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + (i % 2) * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* --- NEBULEUSE : ce qui FLOTTE ET CE QUI ARRIME ------------------------- */

/* L'EPAVE. Un fragment de coque tombe sur le pont : un polygone ANGULEUX, jamais
   un rectangle — ce qui casse ne casse pas droit. Le contour reste ferme et la
   piece plaquee au sol, comme tout ce module ; c'est sa forme qui dit qu'elle a
   ete arrachee, pas un volume. */
function epave(p, ox, oy) {
  const n = 5 + ((p.p * 3) | 0);
  const r0 = 13 + p.p * 9;
  const trace = (dx, dy, k) => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = r0 * k * (0.62 + ((i * 37 + p.p * 83) % 11) / 14);
      const x = Math.cos(a) * r + dx, y = Math.sin(a) * r * 0.78 + dy;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  trace(ox, oy, 1); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.86);
  trace(0, 0, 1); ctx.fill();
  ctx.strokeStyle = alpha(PROP.givre, 0.18);
  ctx.lineWidth = 1.2;
  trace(0, 0, 1); ctx.stroke();
  // la NERVURE interne : c'est elle qui dit « coque » plutot que « caillou ».
  ctx.strokeStyle = alpha(PROP.metal, 0.22);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r0 * 0.5, -r0 * 0.12); ctx.lineTo(r0 * 0.55, r0 * 0.10);
  ctx.moveTo(-r0 * 0.1, -r0 * 0.5); ctx.lineTo(r0 * 0.05, r0 * 0.5);
  ctx.stroke();
}

/* LA VOILE. Un panneau solaire detache : une trame de cellules, un cadre, et un
   REFLET qui ne couvre qu'une moitie. Il est bleu-noir et non gris — une voile
   ne renvoie pas la lumiere d'une station, elle boit celle d'une etoile. */
function voile(p, ox, oy) {
  const w = 46 + p.p * 26, h = 24 + p.p * 8;
  const cols = 4 + ((p.p * 3) | 0);
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha("#111a2e", 0.88);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = alpha(PROP.ombre, 0.50);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 1; i < cols; i++) {
    const x = -w / 2 + (w / cols) * i;
    ctx.moveTo(x, -h / 2 + 1.5); ctx.lineTo(x, h / 2 - 1.5);
  }
  ctx.moveTo(-w / 2 + 1.5, 0); ctx.lineTo(w / 2 - 1.5, 0);
  ctx.stroke();
  ctx.fillStyle = alpha(PROP.givre, 0.07);
  ctx.fillRect(-w / 2, -h / 2, w * 0.44, h);
  ctx.strokeStyle = alpha(PROP.metal, 0.30);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  // le BRAS d'attache : une voile sans point de fixation flotte sans raison.
  ctx.fillStyle = alpha(PROP.metalDark, 0.90);
  ctx.fillRect(w / 2 - 1, -2, 11, 4);
}

/* LE MODULE. Une capsule : deux anneaux de jonction, un hublot, une coque plus
   claire que tout le reste du semis. C'est le seul prop du lieu qui ait ete
   HABITE, et c'est ce qui lui donne son hublot. */
function module_(p, ox, oy) {
  const l = 40 + p.p * 22, r = 11 + p.p * 4;
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.beginPath();
  ctx.ellipse(ox, oy, l / 2, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = alpha("#4a5468", 0.88);
  ctx.beginPath();
  ctx.ellipse(0, 0, l / 2, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = alpha(PROP.givre, 0.10);
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.32, l / 2 - 3, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alpha(PROP.ombre, 0.46);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (const u of [-0.28, 0.30]) {
    ctx.moveTo(l * u, -r * 0.92); ctx.lineTo(l * u, r * 0.92);
  }
  ctx.stroke();
  ctx.fillStyle = alpha("#0a0f1c", 0.90);
  ctx.beginPath(); ctx.arc(l * 0.04, 0, r * 0.34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.34);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(l * 0.04, 0, r * 0.34, 0, Math.PI * 2); ctx.stroke();
}

/* LE CRISTAL. Des prismes, et il ECLAIRE — la seule source du lieu qui ne soit
   pas un appareil. Pas de contour ferme sur le halo : un contour en ferait une
   zone de jeu, et le canal du telegraphe ne se prete pas. */
function cristal(p) {
  const k = gresil(p);
  const n = 3 + ((p.p * 3) | 0);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
  grad.addColorStop(0, alpha(PROP.balise, 0.16 + 0.16 * k));
  grad.addColorStop(1, alpha(PROP.balise, 0));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 5;
    const d = 3 + ((i * 29 + p.p * 61) % 7);
    const h = 9 + ((i * 17 + p.p * 43) % 9);
    const w = 3.4 + ((i * 11 + p.p * 29) % 3);
    const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
    const ca = Math.cos(a - 0.5), sa = Math.sin(a - 0.5);
    ctx.beginPath();
    ctx.moveTo(cx + ca * h, cy + sa * h);
    ctx.lineTo(cx - sa * w, cy + ca * w);
    ctx.lineTo(cx - ca * h * 0.45, cy - sa * h * 0.45);
    ctx.lineTo(cx + sa * w, cy - ca * w);
    ctx.closePath();
    ctx.fillStyle = alpha(PROP.balise, 0.30 + 0.42 * k);
    ctx.fill();
    ctx.strokeStyle = alpha("#ffffff", 0.10 + 0.22 * k);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
}

/* L'ANTENNE. Une parabole vue de dessus, son bras et son contrepoids. Elle est
   MORTE — aucun voyant, aucune pulsation : ce qui appelle encore dans ce lieu
   est la balise, et il ne doit y avoir qu'une chose qui appelle. */
function antenne(p, ox, oy) {
  const r = 13 + p.p * 6;
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.beginPath(); ctx.ellipse(ox, oy, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.84);
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i <= 2; i++) {
    ctx.ellipse(0, 0, r * (i / 3), r * 0.62 * (i / 3), 0, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metal, 0.38);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(r * 1.5, -r * 0.30);
  ctx.moveTo(-r * 1.15, r * 0.22); ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.88);
  ctx.fillRect(-r * 1.45, r * 0.10, 6, 5);
}

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

/* LA BANDE DEFILE, ET C'EST LE GESTE DE CE LIEU. Un convoyeur a l'arret est un
   caisson. Le decalage est une fonction du temps modulo le PAS des taquets, donc
   il ne derive jamais et ne garde rien ; le sens depend de la cellule, sinon
   toute l'usine transporte vers la meme chose.

   Vitesse basse volontairement : a l'arret quelque chose bouge et on ne sait pas
   dire quoi, en mouvement on ne le remarque pas. C'est le budget de l'ambiance. */
const TAQUET = 9;
function convoyeur(p, ox, oy) {
  const l = 68 + p.p * 40, w = 17;
  const sens = p.p < 0.5 ? 1 : -1;
  const d = (performance.now() / 1000 * 11 * sens) % TAQUET;
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.fillRect(-l / 2 + ox, -w / 2 + oy, l, w);
  ctx.fillStyle = alpha(PROP.metalDark, 0.86);
  ctx.fillRect(-l / 2, -w / 2, l, w);

  ctx.save();
  ctx.beginPath(); ctx.rect(-l / 2, -w / 2, l, w); ctx.clip();
  ctx.strokeStyle = alpha(PROP.ombre, 0.46);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let x = -l / 2 - TAQUET + d; x < l / 2 + TAQUET; x += TAQUET) {
    ctx.moveTo(x, -w / 2 + 1.5); ctx.lineTo(x, w / 2 - 1.5);
  }
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = alpha(PROP.metal, 0.22);
  ctx.fillRect(-l / 2, -w / 2, l, 2);
  ctx.fillRect(-l / 2, w / 2 - 2, l, 2);
  // les TAMBOURS de bout : ils disent que la bande est fermee sur elle-meme.
  ctx.fillStyle = alpha(PROP.metalDark, 0.94);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * l / 2, 0, 3.4, w / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* LE BRAS. Il PIVOTE entre deux positions et s'arrete a chaque bout : un
   mouvement qui ne s'arrete jamais se lit comme une rotation libre, pas comme un
   geste commande. L'arret est ce qui dit qu'il y a un ordre derriere. */
function bras(p, ox, oy) {
  const u = CYCLE(performance.now() / 1000, 4.2 + p.p * 2.6, p.p);
  // deux tiers de course, un tiers d'arret a chaque bout
  const v = u < 0.5 ? Math.min(1, u * 3) : Math.min(1, (1 - u) * 3);
  const a0 = -0.9 + p.p * 0.5, a1 = a0 + 1.5;
  const a = a0 + (a1 - a0) * (v * v * (3 - 2 * v));
  const l1 = 16 + p.p * 5, l2 = 13 + p.p * 4;

  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.beginPath(); ctx.arc(ox, oy, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.90);
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.30);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();

  const x1 = Math.cos(a) * l1, y1 = Math.sin(a) * l1;
  const b = a + 0.85;
  const x2 = x1 + Math.cos(b) * l2, y2 = y1 + Math.sin(b) * l2;
  ctx.strokeStyle = alpha(PROP.ombre, 0.40);
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = alpha("#6a7284", 0.86);
  ctx.lineWidth = 4.6;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.92);
  ctx.beginPath(); ctx.arc(x1, y1, 3.4, 0, Math.PI * 2); ctx.fill();
  // la PINCE : deux doigts, et ils s'ecartent en bout de course.
  const e = 2.2 + v * 2.4;
  ctx.strokeStyle = alpha(PROP.metal, 0.60);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + Math.cos(b + s * 0.5) * e * 1.8, y2 + Math.sin(b + s * 0.5) * e * 1.8);
  }
  ctx.stroke();
}

/* LA PRESSE. Une masse qui descend VITE et remonte lentement, avec un temps mort
   en haut : c'est le rythme qui dit la force. L'inverse — descente lente,
   remontee vive — se lirait comme un ressort. */
function presse(p, ox, oy) {
  const u = CYCLE(performance.now() / 1000, 2.6 + p.p * 1.4, p.p * 7);
  const c = u < 0.62 ? 0 : u < 0.70 ? (u - 0.62) / 0.08 : 1 - (u - 0.70) / 0.30;
  const w = 30 + p.p * 10, h = 22 + p.p * 7;

  ctx.fillStyle = alpha(PROP.ombre, 0.38);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha("#3f4552", 0.90);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#0b0d12", 0.72);
  ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);

  // les COLONNES de guidage, fixes — c'est par rapport a elles qu'on voit que
  // la masse bouge.
  ctx.fillStyle = alpha(PROP.metalDark, 0.88);
  for (const s of [-1, 1]) ctx.fillRect(s * (w / 2 - 5) - 2, -h / 2 + 3, 4, h - 6);

  const mh = h * 0.34;
  const my = -h / 2 + 5 + (h - mh - 10) * c;
  ctx.fillStyle = alpha(PROP.ombre, 0.50);
  ctx.fillRect(-w / 2 + 7, my + 2, w - 14, mh);
  ctx.fillStyle = alpha("#79808f", 0.92);
  ctx.fillRect(-w / 2 + 7, my, w - 14, mh);
  ctx.fillStyle = alpha(PROP.metal, 0.24);
  ctx.fillRect(-w / 2 + 7, my, w - 14, 2);
}

/* LA VENTILATION. Le seul mouvement CONTINU du lot — une soufflerie ne s'arrete
   pas —, et le seul qui tourne. Les pales restent sous la grille : une pale plus
   claire que son capot se lirait comme une piece detachee. */
function ventilation(p, ox, oy) {
  const r = 13 + p.p * 5;
  const a = performance.now() / 1000 * (1.5 + p.p * 1.1);
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.beginPath(); ctx.arc(ox, oy, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha("#0d1017", 0.88);
  ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = alpha("#4b5364", 0.60);
  for (let i = 0; i < 5; i++) {
    const b = a + (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, b, b + 0.62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = alpha(PROP.metalDark, 0.80);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const b = (i / 4) * Math.PI;
    ctx.moveTo(-Math.cos(b) * r, -Math.sin(b) * r);
    ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r);
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metal, 0.34);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r + 1, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.94);
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
}

/* LE PALETTIER. Le seul prop FIXE que l'Usine ajoute, et il lui faut l'etre :
   quatre machines animees sans rien d'immobile autour font une vitrine, pas un
   atelier. Ses alveoles ne sont pas toutes pleines — un rack plein se lit comme
   un damier. */
function palettier(p, ox, oy) {
  const w = 54 + p.p * 24, h = 20 + p.p * 7;
  const n = 3 + ((p.p * 3) | 0);
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha("#2c3038", 0.76);
  ctx.fillRect(-w / 2, -h / 2, w, h);

  for (let i = 0; i < n; i++) {
    if (((i * 37 + p.p * 71) % 10) < 3) continue;
    const aw = w / n - 4;
    const x = -w / 2 + 2 + i * (w / n);
    ctx.fillStyle = alpha(PROP.rouille, 0.44);
    ctx.fillRect(x, -h / 2 + 3, aw, h - 6);
    ctx.strokeStyle = alpha(PROP.peint, 0.16);
    ctx.lineWidth = 1;
    ctx.strokeRect(x, -h / 2 + 3, aw, h - 6);
  }

  ctx.strokeStyle = alpha(PROP.metal, 0.40);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2);
  ctx.moveTo(-w / 2, h / 2); ctx.lineTo(w / 2, h / 2);
  ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.90);
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + i * (w / n);
    ctx.fillRect(x - 1.6, -h / 2 - 1, 3.2, h + 2);
  }
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

/* LA POCHE DE COULEE. Le plus gros prop du depot, et la plus forte source du
   sol : c'est elle qui donne a la Fonderie sa masse au niveau du semis, la ou
   les trois autres lieux n'ont que des pieces. Son bain est plus clair que son
   bord, sinon la cuve se lit comme un disque plein.

   Elle est POSEE SUR SON SOCLE, jamais suspendue : une poche en l'air demanderait
   une grue, donc un volume, et rien dans ce module n'a le droit d'en avoir un. */
function poche(p, ox, oy) {
  const r = 17 + p.p * 6;
  const k = gresil(p);
  ctx.fillStyle = alpha(PROP.ombre, 0.40);
  ctx.beginPath(); ctx.ellipse(ox, oy, r + 4, r + 3, 0, 0, Math.PI * 2); ctx.fill();

  // le socle, plus large que la cuve : c'est ce qui la pose au sol.
  ctx.fillStyle = alpha(PROP.metalDark, 0.80);
  ctx.beginPath(); ctx.ellipse(0, 0, r + 4, r + 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.brique, 0.52);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metalDark, 0.86);
  ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.stroke();

  const bain = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.72);
  bain.addColorStop(0, alpha("#ffe6b0", 0.55 + 0.35 * k));
  bain.addColorStop(0.6, alpha(PROP.fonte, 0.60 + 0.30 * k));
  bain.addColorStop(1, alpha("#7a2a08", 0.72));
  ctx.fillStyle = bain;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill();

  // la CROUTE : du metal qui refroidit en surface, et elle derive avec le bain.
  ctx.fillStyle = alpha(PROP.scorie, 0.60);
  for (let i = 0; i < 3; i++) {
    const a = p.p * 8 + i * 2.3 + performance.now() / 1000 * 0.09;
    const d = r * (0.24 + ((i * 29 + p.p * 53) % 7) / 22);
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, 4 + (i % 3), 2.6 + (i % 2), a, 0, Math.PI * 2);
    ctx.fill();
  }

  // les TOURILLONS et le BEC : sans eux c'est un chaudron, pas une poche.
  ctx.fillStyle = alpha(PROP.metalDark, 0.92);
  for (const s of [-1, 1]) ctx.fillRect(s * (r + 1) - 3, -3.4, 6, 6.8);
  ctx.beginPath();
  ctx.moveTo(r * 0.72, -5); ctx.lineTo(r + 7, 0); ctx.lineTo(r * 0.72, 5);
  ctx.closePath(); ctx.fill();
}

/* LA LINGOTIERE. Une rangee d'empreintes, et elles ne sont pas toutes au meme
   stade : une pleine et rouge, une qui a tourne au brun, une vide. Un rang
   uniforme dirait qu'on a coule d'un coup — une fonderie coule EN CONTINU, et
   c'est le degrade du rang qui le raconte. */
function moule(p, ox, oy) {
  const n = 3 + ((p.p * 3) | 0);
  const w = 15, h = 26;
  const W = n * (w + 3);
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.fillRect(-W / 2 + ox, -h / 2 + oy, W, h);
  ctx.fillStyle = alpha("#2a221e", 0.88);
  ctx.fillRect(-W / 2, -h / 2, W, h);
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 1.5 + i * (w + 3);
    const etat = ((i * 41 + p.p * 79) % 10) / 10;
    ctx.fillStyle = alpha("#050405", 0.80);
    ctx.fillRect(x, -h / 2 + 3, w, h - 6);
    if (etat < 0.28) continue;
    const c = etat < 0.55 ? PROP.scorie : etat < 0.8 ? "#8c3a12" : PROP.fonte;
    ctx.fillStyle = alpha(c, 0.55 + etat * 0.35);
    ctx.fillRect(x + 1.5, -h / 2 + 4.5, w - 3, h - 9);
    if (etat > 0.8) {
      ctx.fillStyle = alpha("#ffd9a8", 0.34);
      ctx.fillRect(x + 3.5, -h / 2 + 7, w - 7, h - 14);
    }
  }
  ctx.strokeStyle = alpha(PROP.metal, 0.24);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-W / 2, -h / 2, W, h);
}

/* LA TREMIE. Ce qui ENTRE dans une fonderie : de la charge, versee par une
   goulotte. Elle est vue de dessus, donc c'est son ouverture qu'on lit — un
   trapeze sombre — et le tas qui a debordé au pied. */
function tremie(p, ox, oy) {
  const w = 30 + p.p * 12, h = 22 + p.p * 8;
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.beginPath();
  ctx.moveTo(-w / 2 + ox, -h / 2 + oy); ctx.lineTo(w / 2 + ox, -h / 2 + oy);
  ctx.lineTo(w * 0.28 + ox, h / 2 + oy); ctx.lineTo(-w * 0.28 + ox, h / 2 + oy);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = alpha("#3c3630", 0.90);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w * 0.28, h / 2); ctx.lineTo(-w * 0.28, h / 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = alpha("#070605", 0.86);
  ctx.beginPath();
  ctx.moveTo(-w * 0.36, -h * 0.28); ctx.lineTo(w * 0.36, -h * 0.28);
  ctx.lineTo(w * 0.17, h * 0.34); ctx.lineTo(-w * 0.17, h * 0.34);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2);
  ctx.stroke();

  ctx.fillStyle = alpha(PROP.scorie, 0.62);
  for (let i = 0; i < 5; i++) {
    const x = (((i * 37 + p.p * 71) % 20) / 20 - 0.5) * w * 0.8;
    const y = h / 2 + ((i * 23 + p.p * 47) % 7) * 0.8;
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
}

/* L'OUTILLAGE. Des ringards et des pinces, poses EN FAISCEAU contre rien : c'est
   le seul prop du lieu qui parle de la MAIN qui travaille ici. Les manches
   partent d'un point commun, jamais paralleles — un rateau range est un rateau
   qu'on n'utilise pas. */
function outillage(p, ox, oy) {
  const n = 3 + ((p.p * 3) | 0);
  const bx = -14, by = 6;
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const a = -0.9 + (i / Math.max(1, n - 1)) * 0.8 + p.p * 0.3;
    const l = 30 + ((i * 31 + p.p * 61) % 12);
    const ex = bx + Math.cos(a) * l, ey = by + Math.sin(a) * l;
    ctx.strokeStyle = alpha(PROP.ombre, 0.34);
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(bx + ox, by + oy); ctx.lineTo(ex + ox, ey + oy); ctx.stroke();
    ctx.strokeStyle = alpha(PROP.metalDark, 0.86);
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
    // le bout de l'outil : crochet, palette ou fourche selon le tirage.
    ctx.strokeStyle = alpha(PROP.metal, 0.46);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const t = (i + ((p.p * 3) | 0)) % 3;
    if (t === 0) ctx.arc(ex, ey, 3.6, a - 2.2, a + 0.8);
    else if (t === 1) {
      ctx.moveTo(ex - Math.sin(a) * 4, ey + Math.cos(a) * 4);
      ctx.lineTo(ex + Math.sin(a) * 4, ey - Math.cos(a) * 4);
    } else {
      for (const s of [-1, 0, 1]) {
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(a + s * 0.4) * 5, ey + Math.sin(a + s * 0.4) * 5);
      }
    }
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.fillStyle = alpha(PROP.rouille, 0.50);
  ctx.beginPath(); ctx.ellipse(bx, by, 5, 3.4, 0.3, 0, Math.PI * 2); ctx.fill();
}

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
