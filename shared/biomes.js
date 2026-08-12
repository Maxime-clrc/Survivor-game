
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
  ASH_LIFE: 11,
  FOG_VIGNETTE: 1.35,
  FOG_FROM: 0.12,
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

export const WX_BRUME = 0;
export const WX_BOURRASQUE = 1;
export const WX_CENDRES = 2;

export const WEATHERS = [
  { key: "brume", nom: "Brume",
    texte: "brume dense — les bords de l'arène se ferment" },
  { key: "bourrasque", nom: "Bourrasque",
    texte: "bourrasque — tout est poussé, vous comme eux" },
  { key: "cendres", nom: "Cendres",
    texte: "pluie de cendres — les bonus au sol ne durent plus" },
];

export function weatherAt(id) { return WEATHERS[id] ?? null; }

export const BIOMES = [
  {
    key: "usine", nom: "Usine",
    resume: "piliers en grille, couloirs francs",
    tint: "#0b1626", grid: "#1a2740", skip: 0,
  },
  {
    key: "fonderie", nom: "Fonderie",
    resume: "ouvertures larges, deux cuves centrales",
    tint: "#1e1010", grid: "#33201c", skip: 4,
  },
  {
    key: "friche", nom: "Friche",
    resume: "obstacles épars, couverture destructible",
    tint: "#0d1a0d", grid: "#18291a", skip: 3,
  },
];

export function biomeAt(i) { return BIOMES[i] ?? BIOMES[0]; }

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
  const ang = rand() * Math.PI * 2;
  return { id, dx: Math.cos(ang), dy: Math.sin(ang) };
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
