
export const BOSS_RAVAGEUR = 0;
export const BOSS_MATRIARCHE = 1;
export const BOSS_METRONOME = 2;
export const BOSS_ORACLE = 3;
export const BOSS_JUMEAUX = 4;
export const BOSS_FINAL = 5;

export const BOSS_POOL_COUNT = 5;

export const MECH_STACK = 0;
export const MECH_SPREAD = 1;
export const MECH_TOWER = 2;
export const MECH_COUNT = 3;
export const MECH_LINK = 4;
export const MECH_JAIL = 5;
export const MECH_GAZE = 6;
export const MECH_PROX = 7;
export const MECH_MIASMA = 8;
export const MECH_ULT = 9;
export const MECH_CLUSTER = 10;
export const MECH_FEED = 11;
export const MECH_EXAFLARE = 12;
export const MECH_BAIT = 13;
export const MECH_DRIFT = 14;
export const MECH_SANCTUARY = 15;
export const MECH_SLIP = 16;
export const MECH_QUADRANT = 17;
export const MECH_CROSS = 18;
export const MECH_CONVERGE = 19;
export const MECH_DODGE = 20;
export const MECH_SHRINK = 21;
export const MECH_PUDDLE = 22;
export const MECH_SAFE = 23;
export const MECH_BREATH = 24;
export const MECH_BROOD = 25;
export const MECH_REVERSE = 26;
export const MECH_SWAP = 27;
export const MECH_ENRAGE = 28;
export const MECH_SYNTH = 29;
export const MECH_SEAL = 30;

export const ALERT_ORDER = 0;
export const ALERT_WARN = 1;
export const ALERT_INFO = 2;

export const MECHS = [
  { id: MECH_STACK, key: "stack", nom: "Regroupement", minPlayers: 2, fallback: MECH_DODGE,
    level: ALERT_ORDER, texte: "REGROUPEZ-VOUS sur le cercle" },
  { id: MECH_SPREAD, key: "spread", nom: "Dispersion", minPlayers: 2, fallback: -1,
    level: ALERT_ORDER, texte: "ÉCARTEZ-VOUS les uns des autres" },
  { id: MECH_TOWER, key: "tower", nom: "Tours", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "OCCUPEZ toutes les tours" },
  { id: MECH_COUNT, key: "count", nom: "Dénombrement", minPlayers: 3, fallback: MECH_TOWER,
    level: ALERT_ORDER, texte: "le nombre inscrit doit être exact" },
  { id: MECH_LINK, key: "link", nom: "Lien", minPlayers: 2, fallback: -1,
    level: ALERT_ORDER, texte: "ÉLOIGNEZ-VOUS pour rompre le lien" },
  { id: MECH_JAIL, key: "jail", nom: "Prison", minPlayers: 2, fallback: MECH_CLUSTER,
    level: ALERT_ORDER, texte: "LIBÉREZ le prisonnier en tirant sur la cage" },
  { id: MECH_GAZE, key: "gaze", nom: "Regard", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "NE VISEZ PLUS le boss" },
  { id: MECH_PROX, key: "prox", nom: "Proximité", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "le centre est mortel, éloigne-toi" },
  { id: MECH_MIASMA, key: "miasma", nom: "Miasme", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "un cumul de Vulnérabilité pour toute l'équipe" },
  { id: MECH_ULT, key: "ult", nom: "Jauge d'ultime", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "la jauge ne descend que si les tours sont tenues" },
  { id: MECH_CLUSTER, key: "cluster", nom: "Grappe", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "DÉTRUIS la grappe avant l'éclosion" },
  { id: MECH_FEED, key: "feed", nom: "Lien nourricier", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "TUE les rejetons, ils la soignent" },
  { id: MECH_EXAFLARE, key: "exaflare", nom: "Exaflare", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "la suite arrive dans le même axe" },
  { id: MECH_BAIT, key: "bait", nom: "Appâts", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "ton fantôme te suit — ne t'arrête pas" },
  { id: MECH_DRIFT, key: "drift", nom: "Dérive", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "les disques glissent" },
  { id: MECH_SANCTUARY, key: "sanctuary", nom: "Sanctuaires", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "RESTE sur les disques sûrs" },
  { id: MECH_SLIP, key: "slip", nom: "Sol glissant", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "le sol ne répond plus tout de suite" },
  { id: MECH_QUADRANT, key: "quadrant", nom: "Verrouillage", minPlayers: 3, fallback: MECH_DODGE,
    level: ALERT_ORDER, texte: "les murs vous séparent — tenez votre quart" },
  { id: MECH_CROSS, key: "cross", nom: "Croix", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "l'intersection est mortelle" },
  { id: MECH_CONVERGE, key: "converge", nom: "Convergence", minPlayers: 2, fallback: -1,
    level: ALERT_INFO, texte: "ils se rejoignent — regroupez-vous" },
  { id: MECH_DODGE, key: "dodge", nom: "Zone", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "sors de la zone" },
  { id: MECH_SHRINK, key: "shrink", nom: "Constriction", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "l'arène se referme — la couronne devient mortelle" },
  { id: MECH_PUDDLE, key: "puddle", nom: "Mares", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "chaque tir laisse une mare — le sol se réduit" },
  { id: MECH_SAFE, key: "safe", nom: "Secteur sûr", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "PLACE-TOI dans le secteur épargné" },

  { id: MECH_BREATH, key: "breath", nom: "Souffle", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "le souffle efface les projectiles" },
  { id: MECH_BROOD, key: "brood", nom: "Nuée", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "une nuée de rejetons éclot" },
  { id: MECH_REVERSE, key: "reverse", nom: "Inversion", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "les motifs repartent en sens inverse" },
  { id: MECH_SWAP, key: "swap", nom: "Échange", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "ils viennent d'échanger leurs places" },
  { id: MECH_ENRAGE, key: "enrage", nom: "Emportement", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "le combat s'éternise — il frappe plus fort" },

  { id: MECH_SYNTH, key: "synth", nom: "Synthèse", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "deux motifs à la fois — lisez les deux" },
  { id: MECH_SEAL, key: "seal", nom: "Sceau", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "TENEZ tous les foyers en même temps" },
];

export function mechAt(id) { return MECHS[id] ?? null; }

export function adaptMech(id, alive) {
  const def = MECHS[id];
  if (!def) return -1;
  if (alive >= def.minPlayers) return id;
  const back = def.fallback ?? -1;
  if (back < 0) return -1;
  const bd = MECHS[back];
  return bd && alive >= bd.minPlayers ? back : -1;
}

export function towerCount(alive) {
  if (alive <= 1) return 1;
  if (alive === 2) return 2;
  return alive;
}

export const BOSS_ROSTER = [
  {
    id: BOSS_RAVAGEUR, key: "ravageur", nom: "Ravageur", verbe: "positionnement",
    minPlayers: 1, hpMul: 1.00,
    sous: "lis le sol",
    base: ["salve", "marques", "charge"],
    unlock: [
      ["damier"],
      ["couronne"],
      ["couloirs", "spirale", "constriction"],
      ["balayage", "mur", "quadrant"],
    ],
  },
  {
    id: BOSS_MATRIARCHE, key: "matriarche", nom: "Matriarche", verbe: "gestion de cibles",
    minPlayers: 1, hpMul: 0.85,
    sous: "choisis ta cible",
    base: ["salve", "grappes", "marques"],
    unlock: [
      ["nourriciers"],
      ["prison"],
      ["proximite"],
      ["traque"],
    ],
  },
  {
    id: BOSS_METRONOME, key: "metronome", nom: "Métronome", verbe: "mouvement",
    minPlayers: 1, hpMul: 0.90,
    sous: "ne t'arrête jamais",
    base: ["exaflare", "appat", "derive"],
    unlock: [
      ["charge"],
      ["sanctuaire"],
      ["verglas"],
      ["balayage"],
    ],
  },
  {
    id: BOSS_ORACLE, key: "oracle", nom: "Oracle", verbe: "cohésion",
    minPlayers: 1, hpMul: 0.95,
    sous: "jouez ensemble",
    base: ["rassemblement", "dispersion", "regard", "cone"],
    unlock: [
      ["tours"],
      ["couronne", "pacman"],
      ["denombrement"],
      ["proximite"],
    ],
  },
  {
    id: BOSS_JUMEAUX, key: "jumeaux", nom: "Jumeaux", verbe: "séparation",
    minPlayers: 1, hpMul: 1.00,
    sous: "séparez-vous",
    base: ["salve", "croix", "marques"],
    unlock: [
      ["lien"],
      ["damier"],
      ["prison"],
      ["croixdurable"],
    ],
  },
  {
    id: BOSS_FINAL, key: "final", nom: "Amalgame", verbe: "synthèse",
    minPlayers: 1, hpMul: 1.00, bars: 8,
    sous: "tout ce qu'ils t'ont appris",
    base: ["salve", "marques", "charge", "damier"],
    unlock: [
      ["grappes"],
      ["exaflare"],
      ["rassemblement", "regard"],
      ["croix"],
      ["synthese"],
      ["entrelacs"],
      ["sceau"],
    ],
  },
];

export function bossAt(i) { return BOSS_ROSTER[i] ?? BOSS_ROSTER[0]; }

export function bossPool(kind, phase) {
  const def = bossAt(kind);
  const pool = def.base.slice();
  for (let i = 0; i < phase && i < def.unlock.length; i++) pool.push(...def.unlock[i]);
  return pool;
}

export const BOSS_CFG = {
  BAR_DWELL: 10,

  ENRAGE_AT: 150,
  ENRAGE_STEP: 30,
  FINAL_ENRAGE_AT: 300,
  ENRAGE_DAMAGE: 0.25,
  ENRAGE_CD: 0.12,
  ENRAGE_CD_FLOOR: 0.45,

  BROOD_COUNT: 5,
  MECH_DAMAGE_RATIO: 0.90,
  MECH_VULN: 1,

  STACK_RADIUS: 135,
  STACK_WARN: 3.4,
  SPREAD_MIN: 230,
  SPREAD_WARN: 3.0,
  SPREAD_RATIO: 0.55,
  TOWER_RADIUS: 95,
  TOWER_WARN: 4.2,
  TOWER_RATIO: 0.45,
  COUNT_WARN: 4.8,
  LINK_BREAK: 300,
  LINK_TIME: 8,
  LINK_DPS: 11,
  JAIL_TIME: 7,
  JAIL_HP: 240,
  GAZE_WARN: 1.6,
  GAZE_TIME: 2.0,
  GAZE_TICK: 0.5,
  GAZE_RATIO: 0.22,
  PROX_RADIUS: 280,
  PROX_WARN: 2.2,

  CLUSTER_HP: 230,
  CLUSTER_TIME: 12,
  CLUSTER_HATCH: 3,
  CLUSTER_COUNT: 2,
  FEED_COUNT: 2,
  FEED_HEAL: 0.005,

  EXAFLARE_STEPS: 7,
  EXAFLARE_R: 105,
  EXAFLARE_WARN: 1.5,
  EXAFLARE_STEP: 0.32,
  BAIT_COUNT: 4,
  BAIT_STEP: 0.55,
  BAIT_WARN: 1.5,
  BAIT_R: 90,
  BAIT_LAG: 1.0,
  DRIFT_COUNT: 3,
  DRIFT_R: 115,
  DRIFT_SPEED: 95,
  DRIFT_TICKS: 10,
  DRIFT_PERIOD: 0.5,
  SANCT_R: 125,
  SANCT_WARN: 3.2,
  SANCT_SPEED: 55,
  SANCT_TICKS: 5,
  SANCT_PERIOD: 1.1,
  SLIP_TIME: 12,
  SLIP_ACCEL: 3.4,

  PUDDLE_MAX: 25,
  PUDDLE_LIFE: 15,
  PUDDLE_R: 44,
  PUDDLE_DOT: 20,
  PUDDLE_WARN: 0.4,

  QUADRANT_WARN: 1.9,
  QUADRANT_TICKS: 5,
  QUADRANT_PERIOD: 0.7,
  QUAD_TIME: 20,
  QUAD_THICK: 26,

  SHRINK_STEP: 0.13,
  SHRINK_MIN: 0.45,
  SHRINK_WARN: 2.6,
  SHRINK_RATIO: 0.5,
  CROWN_DPS: 60,

  CONE_R: 640,
  CONE_SPREAD: 0.40,
  CONE_WARN: 1.8,
  PACMAN_R: 700,
  PACMAN_SAFE: 0.58,
  PACMAN_WARN: 2.6,

  ULT_FILL: 1 / 42,
  ULT_DRAIN: 1 / 9,
  ULT_RATIO: 1.0,

  TWIN_HEAL_RANGE: 400,
  TWIN_HEAL: 0.008,
  TWIN_GAP: 520,
  TWIN_BLAST_RATIO: 0.75,
  TWIN_STATUS_CD: 5,
  CROSS_THICKNESS: 150,
  CROSS_WARN: 1.7,
  CROSS_GAP: 0.18,
  CROSSD_THICKNESS: 130,
  CROSSD_WARN: 2.2,
  CROSSD_LIFE: 8,
  CROSSD_DOT: 26,

  FINAL_HP_MUL: 1.3,
  FINAL_BAR_DWELL: 10,

  SEAL_RADIUS: 88,
  SEAL_WARN: 6.0,
  SEAL_RATIO: 1.0,
  SEAL_SPREAD: 0.40,

  SYNTH_GAP: 0.9,
};
