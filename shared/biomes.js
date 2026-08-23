
import { t } from "./i18n.js";

export const BIOME_CFG = {
  HAZARD_SURFACE_MAX: 0.08,
  TRAIL_BUDGET: 0.04,

  OBSTACLE_SURFACE_MAX: 0.10,

  CORE_RATIO: 0.45,
  CORE_CLEARANCE: 34,

  GEYSER_R: 70,
  GEYSER_PERIOD: 7,
  GEYSER_ACTIVE: 1.9,
  GEYSER_RAMP: 0.22,
  GEYSER_DOT: 26,

  POOL_R: 85,
  POOL_DOT: 11,

  EMBER_R: 55,
  EMBER_DOT: 16,
  EMBER_PERIOD: 11,
  EMBER_SPAN: 210,

  SLOW_R: 110,
  SLOW_MUL: 0.62,

  SLIP_R: 95,
  SLIP_ACCEL: 2.6,

  COVER_HP: 900,

  GUST_PUSH: 46,
  GUST_PERIOD: 26,
  GUST_CALM: 0.42,
  GUST_RAMP: 3.2,
  GUST_MIN: 0.45,
  GUST_TURN_HZ: 0.021,
  GUST_SWING: 1.15,
  GUST_AMP_HZ: 0.055,

  ASH_LIFE: 11,

  // LA BRUME RETIRE DE L'INFORMATION, elle ne teinte pas. Pleine visibilite
  // jusqu'a FOG_CLEAR, plus rien de la horde au-dela de FOG_BLIND. La demi-vue
  // fait 800 x 450 : a 480 le disque deborde a peine en haut et en bas, et
  // ampute franchement les cotes — c'est un champ de vision, plus un ecran.
  // Tout ce qui TIRE reste dedans par construction (le tireur se place a 170,
  // le soigneur ennemi a 240), donc on ne se fait jamais toucher par un corps
  // qu'on ne pouvait pas voir.
  FOG_CLEAR: 260,
  FOG_BLIND: 480,

  // le vignettage accompagne le masquage au lieu de le contredire : il partait
  // PLUS LOIN du centre (+0,12), ce qui eclaircissait les bords haut et bas.
  FOG_VIGNETTE: 1.35,
  FOG_FROM: -0.10,
};

export const HZ_GEYSER = 0;
export const HZ_POOL = 1;
export const HZ_EMBER = 2;
export const HZ_SLOW = 3;
export const HZ_SLIP = 4;

export const HAZARDS = [
  { key: "geyser", nom: "geyser", hurts: true,
    r: BIOME_CFG.GEYSER_R, dot: BIOME_CFG.GEYSER_DOT },
  { key: "flaque", nom: "flaque corrompue", hurts: true,
    r: BIOME_CFG.POOL_R, dot: BIOME_CFG.POOL_DOT },
  { key: "braise", nom: "braise", hurts: true,
    r: BIOME_CFG.EMBER_R, dot: BIOME_CFG.EMBER_DOT },
  { key: "ralenti", nom: "champ de ralentissement", hurts: false,
    r: BIOME_CFG.SLOW_R, dot: 0 },
  { key: "glissant", nom: "sol glissant", hurts: false,
    r: BIOME_CFG.SLIP_R, dot: 0 },
];

export function hazardAt(kind) { return HAZARDS[kind] ?? null; }
export const hazardNom = k => t(`hazard.${HAZARDS[k]?.key}`, HAZARDS[k]?.nom ?? "");

export const WX_BRUME = 0;
export const WX_BOURRASQUE = 1;
export const WX_CENDRES = 2;

export const WEATHERS = [
  { key: "brume", nom: "Brume",
    texte: "brume dense — on ne voit plus venir" },
  { key: "bourrasque", nom: "Bourrasque",
    texte: "rafales — le vent vous pousse, la horde l'ignore" },
  { key: "cendres", nom: "Cendres",
    texte: "pluie de cendres — les bonus au sol ne durent plus" },
];

export function weatherAt(id) { return WEATHERS[id] ?? null; }
export const weatherNom = i => t(`weather.${WEATHERS[i]?.key}.nom`, WEATHERS[i]?.nom ?? "");
export const weatherTexte = i => t(`weather.${WEATHERS[i]?.key}.texte`, WEATHERS[i]?.texte ?? "");

/* AUCUNE COULEUR ICI. Elle vivait a la fois dans `tint`/`grid` et dans la
   palette, et les deux moities se neutralisaient. La charte d'un lieu est
   entiere dans `BIOME_SKIN` — ce module decide de la GEOMETRIE, jamais du ton.

   `fond` declare que ce biome a un ARRIERE-PLAN : la matiere y laisse des baies
   transparentes au lieu de couvrir la tuile, et c'est le seul champ que le rendu
   lit pour le savoir. */
export const BIOMES = [
  {
    key: "usine", nom: "Usine",
    resume: "piliers en grille, couloirs francs",
  },
  {
    key: "fonderie", nom: "Fonderie",
    resume: "ouvertures larges, deux cuves centrales",
  },
  {
    key: "friche", nom: "Friche",
    resume: "obstacles épars, couverture destructible",
  },
  {
    key: "nebuleuse", nom: "Nébuleuse",
    resume: "longues travées, baies ouvertes sur le vide",
    fond: "espace",
  },
];

export function biomeAt(i) { return BIOMES[i] ?? BIOMES[0]; }
export const biomeNom = i => t(`biome.${biomeAt(i).key}.nom`, biomeAt(i).nom);
export const biomeResume = i => t(`biome.${biomeAt(i).key}.resume`, biomeAt(i).resume);

export function mulberry32(seed) { return rng(seed); }

function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OBSTACLES = {
  usine: [
    { x: 0.20, y: 0.30, w: 0.0575, h: 0.102 },
    { x: 0.20, y: 0.70, w: 0.0575, h: 0.102 },
    { x: 0.50, y: 0.30, w: 0.0575, h: 0.102 },
    { x: 0.50, y: 0.70, w: 0.0575, h: 0.102 },
    { x: 0.80, y: 0.30, w: 0.0575, h: 0.102 },
    { x: 0.80, y: 0.70, w: 0.0575, h: 0.102 },
  ],
  fonderie: [
    { x: 0.35, y: 0.50, w: 0.125, h: 0.167 },
    { x: 0.65, y: 0.50, w: 0.125, h: 0.167 },
  ],
  friche: [
    { x: 0.14, y: 0.22, w: 0.075, h: 0.089 },
    { x: 0.30, y: 0.74, w: 0.056, h: 0.144 },
    { x: 0.62, y: 0.18, w: 0.100, h: 0.078 },
    { x: 0.86, y: 0.58, w: 0.069, h: 0.122 },
    { x: 0.44, y: 0.42, w: 0.069, h: 0.078, hp: 1 },
    { x: 0.72, y: 0.62, w: 0.069, h: 0.078, hp: 1 },
    { x: 0.24, y: 0.50, w: 0.069, h: 0.078, hp: 1 },
  ],
  nebuleuse: [
    { x: 0.26, y: 0.22, w: 0.150, h: 0.052 },
    { x: 0.74, y: 0.78, w: 0.150, h: 0.052 },
    { x: 0.15, y: 0.66, w: 0.050, h: 0.124 },
    { x: 0.85, y: 0.34, w: 0.050, h: 0.124 },
    { x: 0.50, y: 0.50, w: 0.070, h: 0.070, hp: 1 },
    { x: 0.50, y: 0.14, w: 0.060, h: 0.060, hp: 1 },
  ],
};

const HZ_NORMAL = {
  usine: [
    { kind: HZ_SLOW, x: 0.35, y: 0.50 },
    { kind: HZ_SLOW, x: 0.65, y: 0.50 },
  ],
  fonderie: [
    { kind: HZ_SLOW, x: 0.35, y: 0.24 },
    { kind: HZ_SLOW, x: 0.65, y: 0.76 },
  ],
  friche: [
    { kind: HZ_SLOW, x: 0.10, y: 0.55 },
    { kind: HZ_SLOW, x: 0.56, y: 0.84 },
  ],
  // en apesanteur c'est le FREINAGE qui manque : le champ de ralentissement est
  // ici un puits de gravite, meme regle, meme chiffre.
  nebuleuse: [
    { kind: HZ_SLOW, x: 0.32, y: 0.60 },
    { kind: HZ_SLOW, x: 0.68, y: 0.40 },
  ],
};

const HZ_CAUCHEMAR = {
  usine: [
    { kind: HZ_GEYSER, x: 0.35, y: 0.50, period: 7.0, phase: 0.00 },
    { kind: HZ_GEYSER, x: 0.65, y: 0.50, period: 5.4, phase: 0.37 },
    { kind: HZ_GEYSER, x: 0.50, y: 0.14, period: 6.2, phase: 0.64 },
    { kind: HZ_SLIP, x: 0.16, y: 0.50 },
    { kind: HZ_SLIP, x: 0.84, y: 0.50 },
  ],
  fonderie: [
    { kind: HZ_POOL, x: 0.35, y: 0.24 },
    { kind: HZ_POOL, x: 0.65, y: 0.76 },
    { kind: HZ_EMBER, x: 0.50, y: 0.30, dx: 1, dy: 0, phase: 0.00 },
    { kind: HZ_EMBER, x: 0.50, y: 0.70, dx: 1, dy: 0, phase: 0.50 },
  ],
  friche: [
    { kind: HZ_POOL, x: 0.18, y: 0.68 },
    { kind: HZ_POOL, x: 0.50, y: 0.86 },
    { kind: HZ_POOL, x: 0.82, y: 0.80 },
  ],
  // le sol glissant EST l'apesanteur, et la braise un debris incandescent qui
  // traverse la travee. Aucun danger neuf : le biome recompose les cinq.
  nebuleuse: [
    { kind: HZ_SLIP, x: 0.22, y: 0.42 },
    { kind: HZ_SLIP, x: 0.78, y: 0.58 },
    { kind: HZ_EMBER, x: 0.50, y: 0.32, dx: 1, dy: 0, phase: 0.20 },
    { kind: HZ_EMBER, x: 0.50, y: 0.70, dx: 1, dy: 0, phase: 0.70 },
  ],
};

export function buildBiome(biomeIndex, diffIndex, seed = 1,
                           arenaW = 1600, arenaH = 900,
                           viewW = 1600, viewH = 900) {
  const def = biomeAt(biomeIndex);
  const rand = rng(seed);
  const surface = arenaW * arenaH;

  const cols = Math.max(1, Math.round(arenaW / viewW));
  const rows = Math.max(1, Math.round(arenaH / viewH));
  const cw = arenaW / cols, ch = arenaH / rows;

  const obstacles = [];
  let obsArea = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const mx = (cx + cy) & 1, my = (cx * 2 + cy) & 1;
      for (const o of OBSTACLES[def.key] ?? []) {
        const j = def.key === "friche" ? 40 : 0;
        const w = o.w * cw, h = o.h * ch;
        const area = w * h;
        if ((obsArea + area) / surface > BIOME_CFG.OBSTACLE_SURFACE_MAX) continue;
        obsArea += area;
        const fx = mx ? 1 - o.x : o.x, fy = my ? 1 - o.y : o.y;
        obstacles.push({
          x: cx * cw + fx * cw + (rand() - 0.5) * 2 * j,
          y: cy * ch + fy * ch + (rand() - 0.5) * 2 * j,
          w, h,
          maxHp: o.hp ? BIOME_CFG.COVER_HP : 0,
          hp: o.hp ? BIOME_CFG.COVER_HP : 0,
        });
      }
    }
  }

  let table = [];
  if (diffIndex === 1) table = HZ_NORMAL[def.key] ?? [];
  else if (diffIndex >= 2) table = HZ_CAUCHEMAR[def.key] ?? [];

  const hazards = [];
  let hzArea = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const mx = (cx + cy) & 1, my = (cx * 2 + cy) & 1;
      for (const h of table) {
        const d = hazardAt(h.kind);
        if (!d) continue;
        const r = h.r ?? d.r;
        const area = Math.PI * r * r;
        if ((hzArea + area) / surface > BIOME_CFG.HAZARD_SURFACE_MAX) continue;
        hzArea += area;
        const fx = mx ? 1 - h.x : h.x, fy = my ? 1 - h.y : h.y;
        hazards.push({
          kind: h.kind, r,
          x: cx * cw + fx * cw, y: cy * ch + fy * ch,
          dot: h.dot ?? d.dot,
          period: h.period ?? (h.kind === HZ_EMBER ? BIOME_CFG.EMBER_PERIOD : BIOME_CFG.GEYSER_PERIOD),
          active: h.active ?? BIOME_CFG.GEYSER_ACTIVE,
          phase: ((h.phase ?? 0) + (cy * cols + cx) * 0.37) % 1,
          dx: (h.dx ?? 0) * (mx ? -1 : 1), dy: (h.dy ?? 0) * (my ? -1 : 1),
          span: h.span ?? BIOME_CFG.EMBER_SPAN,
        });
      }
    }
  }

  return {
    index: biomeIndex, key: def.key, nom: def.nom,
    obstacles, hazards,
    obstacleSurface: obsArea / surface,
    hazardSurface: hzArea / surface,
  };
}

export function hazardState(h, t) {
  if (h.kind === HZ_EMBER) {
    const u = ((t / h.period) + h.phase) % 1;
    const tri = u < 0.5 ? u * 4 - 1 : 3 - u * 4;
    return { on: true, k: 1, x: h.x + h.dx * h.span * tri, y: h.y + h.dy * h.span * tri };
  }
  if (h.kind !== HZ_GEYSER) return { on: true, k: 1, x: h.x, y: h.y };

  const u = (((t / h.period) + h.phase) % 1) * h.period;
  if (u >= h.active) return { on: false, k: 0, x: h.x, y: h.y };
  const ramp = h.active * BIOME_CFG.GEYSER_RAMP;
  const k = Math.min(1, Math.min(u, h.active - u) / Math.max(0.001, ramp));
  return { on: true, k: Math.max(0.12, k), x: h.x, y: h.y };
}

export function weatherFor(diffIndex, seed, segment) {
  if (diffIndex < 2 || segment < 1) return null;
  const rand = rng((seed >>> 0) * 733 + segment * 9176);
  if (rand() < 0.34) return null;
  const id = Math.min(WEATHERS.length - 1, Math.floor(rand() * WEATHERS.length));
  const TAU = Math.PI * 2;
  return {
    id,
    ang: rand() * TAU,
    ph: rand(),
    p1: rand() * TAU,
    p2: rand() * TAU,
    pa: rand() * TAU,
  };
}

// LA BOURRASQUE N'EST PAS UN VECTEUR CONSTANT : angle et force sont des
// FONCTIONS DU TEMPS DE MANCHE, donc rejouables a l'identique des deux cotes
// sans un octet de reseau, comme l'etat d'un danger. L'enveloppe reprend
// d'ailleurs la forme de `hazardState` — periode, fenetre active, rampe : le
// vent RETOMBE A ZERO entre deux rafales, sinon il cesse d'etre un evenement et
// devient une taxe permanente sur le deplacement.
// Les deux sinus d'angle sont incommensurables et leur somme depasse le
// demi-tour, donc la rafale peut s'inverser en cours de segment.
export function windAt(w, t) {
  if (!w || w.id !== WX_BOURRASQUE) return null;
  const C = BIOME_CFG;
  const TAU = Math.PI * 2;
  const u = (((t / C.GUST_PERIOD) + w.ph) % 1) * C.GUST_PERIOD;
  const active = C.GUST_PERIOD * (1 - C.GUST_CALM);
  if (u >= active) return null;
  const rampe = Math.min(1, Math.min(u, active - u) / C.GUST_RAMP);
  if (rampe <= 0) return null;
  const ampleur = C.GUST_MIN + (1 - C.GUST_MIN)
    * (0.5 + 0.5 * Math.sin(t * C.GUST_AMP_HZ * TAU + w.pa));
  const ang = w.ang
    + Math.sin(t * C.GUST_TURN_HZ * TAU + w.p1) * C.GUST_SWING
    + Math.sin(t * C.GUST_TURN_HZ * 2.7 * TAU + w.p2) * C.GUST_SWING * 0.5;
  return { ang, dx: Math.cos(ang), dy: Math.sin(ang), force: rampe * ampleur };
}

export function verifierBiomes(seeds = [1, 7, 99], arenaW = 1600, arenaH = 900,
                               viewW = 1600, viewH = 900) {
  const soucis = [];
  const budget = BIOME_CFG.HAZARD_SURFACE_MAX;

  for (let bi = 0; bi < BIOMES.length; bi++) {
    for (let di = 0; di < 3; di++) {
      for (const seed of seeds) {
        const b = buildBiome(bi, di, seed, arenaW, arenaH, viewW, viewH);
        const ou = `${b.key}/${["calme", "normal", "cauchemar"][di]}/${seed}`;

        if (b.hazardSurface > budget + 1e-9) {
          soucis.push(`${ou} : dangers a ${(b.hazardSurface * 100).toFixed(1)} %`);
        }
        if (b.obstacleSurface > BIOME_CFG.OBSTACLE_SURFACE_MAX + 1e-9) {
          soucis.push(`${ou} : obstacles a ${(b.obstacleSurface * 100).toFixed(1)} %`);
        }
        if (di === 0 && b.hazards.length > 0) {
          soucis.push(`${ou} : calme ne doit avoir aucun danger`);
        }
        if (di === 1 && b.hazards.some(h => hazardAt(h.kind).hurts)) {
          soucis.push(`${ou} : normal ne doit avoir aucun danger qui blesse`);
        }
        if (!coeurTraversable(b, arenaW, arenaH, viewW, viewH)) {
          soucis.push(`${ou} : le carre central minimal n'est pas traversable`);
        }
        const chevauche = comptePosesSurObstacle(b);
        if (chevauche > 0) {
          soucis.push(`${ou} : ${chevauche} danger(s) poses sur un obstacle`);
        }
      }
    }
  }
  return soucis;
}

function comptePosesSurObstacle(b) {
  let n = 0;
  for (const h of b.hazards) {
    for (const o of b.obstacles) {
      const cx = Math.max(o.x - o.w / 2, Math.min(h.x, o.x + o.w / 2));
      const cy = Math.max(o.y - o.h / 2, Math.min(h.y, o.y + o.h / 2));
      if (Math.hypot(h.x - cx, h.y - cy) < h.r) { n++; break; }
    }
  }
  return n;
}

function coeurTraversable(b, arenaW, arenaH, viewW, viewH) {
  const cols = Math.max(1, Math.round(arenaW / viewW));
  const rows = Math.max(1, Math.round(arenaH / viewH));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!celluleTraversable(b, arenaW / cols, arenaH / rows,
                              (i * arenaW) / cols, (j * arenaH) / rows)) return false;
    }
  }
  return true;
}

function celluleTraversable(b, vw, vh, ox, oy) {
  const cw = vw * BIOME_CFG.CORE_RATIO, ch = vh * BIOME_CFG.CORE_RATIO;
  const x0 = ox + (vw - cw) / 2, y0 = oy + (vh - ch) / 2;
  const step = 10;
  const cols = Math.floor(cw / step), rows = Math.floor(ch / step);
  const c = BIOME_CFG.CORE_CLEARANCE;

  const libre = (ix, iy) => {
    const x = x0 + ix * step, y = y0 + iy * step;
    for (const o of b.obstacles) {
      if (o.maxHp > 0) continue;
      if (Math.abs(x - o.x) < o.w / 2 + c && Math.abs(y - o.y) < o.h / 2 + c) return false;
    }
    return true;
  };

  return remplissage(cols, rows, libre, "h") && remplissage(cols, rows, libre, "v");
}

function remplissage(cols, rows, libre, axe) {
  const vus = new Set();
  const pile = [];
  const cle = (x, y) => y * cols + x;
  if (axe === "h") {
    for (let y = 0; y < rows; y++) if (libre(0, y)) { pile.push([0, y]); vus.add(cle(0, y)); }
  } else {
    for (let x = 0; x < cols; x++) if (libre(x, 0)) { pile.push([x, 0]); vus.add(cle(x, 0)); }
  }
  while (pile.length) {
    const [x, y] = pile.pop();
    if (axe === "h" ? x >= cols - 1 : y >= rows - 1) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (vus.has(cle(nx, ny)) || !libre(nx, ny)) continue;
      vus.add(cle(nx, ny));
      pile.push([nx, ny]);
    }
  }
  return false;
}
