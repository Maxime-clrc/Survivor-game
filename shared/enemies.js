
export const TRAIT_DASH = 0;
export const TRAIT_TRAIL = 1;
export const TRAIT_VOLLEY = 2;
export const TRAIT_FRENZY = 3;
export const TRAIT_SPORE = 4;
export const TRAIT_AURA = 5;

export const TRAITS = [
  { key: "dash",   nom: "Ruée" },
  { key: "trail",  nom: "Traînée" },
  { key: "volley", nom: "Salve" },
  { key: "frenzy", nom: "Frénésie" },
  { key: "spore",  nom: "Spores" },
  { key: "aura",   nom: "Aura" },
];

export function traitBit(id) { return 1 << id; }

export const TRAIT_CFG = {
  DASH_WARN: 0.5,
  DASH_MUL: 2.5,
  DASH_TIME: 0.35,
  DASH_CD: 6,
  DASH_GATHER: 0.25,
  DASH_RANGE: 420,
  DASH_WARN_MAX: 8,

  TRAIL_LIFE: 1,
  TRAIL_DOT: 26,
  TRAIL_R: 26,
  TRAIL_SURFACE: 0.12,
  TRAIL_STEP: 46,

  VOLLEY_COUNT: 3,
  VOLLEY_SPREAD: 0.22,

  FRENZY_MAX: 1.6,
  FRENZY_AT: 0.1,

  SPORE_LIFE: 3,
  SPORE_DOT: 10,
  SPORE_R: 22,

  AURA_RADIUS: 90,
  AURA_REDUCTION: 0.35,
};

export const ENEMY_TYPES = [
  { key: "grunt",   minMin: 0,   fallback: -1, weight: 1.00, share: 1.00, hpMul: 1.0,  speed: 95,  dmg: 18, r: 12, score: 10, xp: 10 },
  { key: "runner",  minMin: 1,   fallback: 0,  weight: 0.55, share: 0.45, hpMul: 0.40, speed: 156, dmg: 7,  r: 9,  score: 14, xp: 6 },
  { key: "tank",    minMin: 4,   fallback: 0,  weight: 0.30, share: 0.22, hpMul: 4.5,  speed: 44,  dmg: 30, r: 21, score: 30, xp: 32 },
  { key: "shooter", minMin: 7,   fallback: 1,  weight: 0.30, share: 0.16, hpMul: 1.3,  speed: 62,  dmg: 14, r: 14, score: 25, xp: 14,
    shootCd: 2.6, standoff: 170 },
  { key: "brood",   minMin: 9,   fallback: 1,  weight: 0.25, share: 0.12, hpMul: 1.8,  speed: 78,  dmg: 20, r: 16, score: 20, xp: 18,
    splits: 3 },

  { key: "kamikaze", minMin: 12, fallback: 1, weight: 0.22, share: 0.18, hpMul: 0.5, speed: 118, dmg: 8, r: 10, score: 18, xp: 8,
    blastRadius: 90, blastDamage: 45, blastDelay: 0.15 },

  { key: "bulwark",  minMin: 15, fallback: 2, weight: 0.30, share: 0.16, hpMul: 2.2, speed: 50, dmg: 22, r: 15, score: 32, xp: 22,
    shieldArc: 100, shieldTurnRate: 2.4 },

  { key: "medic",    minMin: 19, fallback: 3, weight: 0.28, share: 0.09, hpMul: 0.9, speed: 68, dmg: 10, r: 13, score: 28, xp: 14,
    standoff: 240, heal: 6, healInterval: 1.2, healRange: 190,
    fireWindow: 0.35, breakTime: 1.0, fleeTime: 3.0 },

  { key: "choeur",   minMin: 23, fallback: 4, weight: 0.20, share: 0.08, hpMul: 1.6, speed: 70, dmg: 12, r: 15, score: 30, xp: 20,
    auraRadius: 130, auraReduction: 0.35 },
];

export function trailMax(aireVue) {
  return Math.round(aireVue * TRAIT_CFG.TRAIL_SURFACE
    / (Math.PI * TRAIT_CFG.TRAIL_R * TRAIT_CFG.TRAIL_R));
}

export function typeAt(index) { return ENEMY_TYPES[index] ?? ENEMY_TYPES[0]; }


export function hasTrait(mask, id) { return (mask & traitBit(id)) !== 0; }

export function adaptType(index, minute) {
  const def = ENEMY_TYPES[index];
  if (!def) return -1;
  if (minute >= def.minMin) return index;
  const back = def.fallback ?? -1;
  if (back < 0) return -1;
  const bd = ENEMY_TYPES[back];
  return bd && minute >= bd.minMin ? back : -1;
}
