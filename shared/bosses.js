
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
    level: ALERT_ORDER, texte: "REGROUPEZ-VOUS sur le cercle",
    ordre: "REGROUPEZ-VOUS", forme: "cercle" },
  { id: MECH_SPREAD, key: "spread", nom: "Dispersion", minPlayers: 2, fallback: -1,
    level: ALERT_ORDER, texte: "ÉCARTEZ-VOUS les uns des autres",
    ordre: "ÉCARTEZ-VOUS", forme: "triangle" },
  { id: MECH_TOWER, key: "tower", nom: "Tours", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "OCCUPEZ toutes les tours",
    ordre: "OCCUPEZ LES TOURS", forme: "colonne" },
  { id: MECH_COUNT, key: "count", nom: "Dénombrement", minPlayers: 3, fallback: MECH_TOWER,
    level: ALERT_ORDER, texte: "le nombre inscrit doit être exact",
    ordre: "OCCUPEZ LE NOMBRE EXACT", forme: "colonne" },
  { id: MECH_LINK, key: "link", nom: "Lien", minPlayers: 2, fallback: -1,
    level: ALERT_ORDER, texte: "ÉLOIGNEZ-VOUS pour rompre le lien",
    ordre: "ÉLOIGNEZ-VOUS", forme: "chaine" },
  { id: MECH_JAIL, key: "jail", nom: "Prison", minPlayers: 2, fallback: MECH_CLUSTER,
    level: ALERT_ORDER, texte: "LIBÉREZ le prisonnier en tirant sur la cage",
    ordre: "TIREZ SUR LA CAGE", forme: "cage" },
  { id: MECH_GAZE, key: "gaze", nom: "Regard", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "NE VISEZ PLUS le boss",
    ordre: "NE VISEZ PLUS", forme: "oeil" },
  { id: MECH_PROX, key: "prox", nom: "Proximité", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "le centre est mortel, éloigne-toi",
    ordre: "FUIS LE CENTRE", forme: "disque" },
  { id: MECH_MIASMA, key: "miasma", nom: "Miasme", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "un cumul de Vulnérabilité pour toute l'équipe",
    ordre: "VULNÉRABILITÉ", forme: "disque" },
  { id: MECH_ULT, key: "ult", nom: "Jauge d'ultime", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "la jauge ne descend que si les tours sont tenues",
    ordre: "TENEZ LES TOURS", forme: "colonne" },
  { id: MECH_CLUSTER, key: "cluster", nom: "Grappe", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "DÉTRUIS la grappe avant l'éclosion",
    ordre: "DÉTRUIS LA GRAPPE", forme: "cage" },
  { id: MECH_FEED, key: "feed", nom: "Lien nourricier", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "TUE les rejetons, ils la soignent",
    ordre: "TUE LES REJETONS", forme: "chaine" },
  { id: MECH_EXAFLARE, key: "exaflare", nom: "Exaflare", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "la suite arrive dans le même axe",
    ordre: "QUITTE L'AXE", forme: "ligne" },
  { id: MECH_BAIT, key: "bait", nom: "Appâts", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "ton fantôme te suit — ne t'arrête pas",
    ordre: "NE T'ARRÊTE PAS", forme: "triangle" },
  { id: MECH_DRIFT, key: "drift", nom: "Dérive", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "les disques glissent",
    ordre: "LES DISQUES GLISSENT", forme: "disque" },
  { id: MECH_SANCTUARY, key: "sanctuary", nom: "Sanctuaires", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "RESTE sur les disques sûrs",
    ordre: "RESTE SUR LES DISQUES", forme: "disque" },
  { id: MECH_SLIP, key: "slip", nom: "Sol glissant", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "le sol ne répond plus tout de suite",
    ordre: "SOL GLISSANT", forme: "disque" },
  { id: MECH_QUADRANT, key: "quadrant", nom: "Verrouillage", minPlayers: 3, fallback: MECH_DODGE,
    level: ALERT_ORDER, texte: "les murs vous séparent — tenez votre quart",
    ordre: "TENEZ VOTRE QUART", forme: "damier" },
  { id: MECH_CROSS, key: "cross", nom: "Croix", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "l'intersection est mortelle",
    ordre: "QUITTE L'INTERSECTION", forme: "ligne" },
  { id: MECH_CONVERGE, key: "converge", nom: "Convergence", minPlayers: 2, fallback: -1,
    level: ALERT_INFO, texte: "ils se rejoignent — regroupez-vous",
    ordre: "REGROUPEZ-VOUS", forme: "cercle" },
  { id: MECH_DODGE, key: "dodge", nom: "Zone", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "sors de la zone",
    ordre: "SORS DE LA ZONE", forme: "disque" },
  { id: MECH_SHRINK, key: "shrink", nom: "Constriction", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "l'arène se referme — la couronne devient mortelle",
    ordre: "RENTRE DANS L'ARÈNE", forme: "anneau" },
  { id: MECH_PUDDLE, key: "puddle", nom: "Mares", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "chaque tir laisse une mare — le sol se réduit",
    ordre: "LE SOL SE RÉDUIT", forme: "disque" },
  { id: MECH_SAFE, key: "safe", nom: "Secteur sûr", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "PLACE-TOI dans le secteur épargné",
    ordre: "VA AU SECTEUR SÛR", forme: "cone" },

  { id: MECH_BREATH, key: "breath", nom: "Souffle", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "le souffle efface les projectiles",
    ordre: "TES TIRS S'EFFACENT", forme: "cone" },
  { id: MECH_BROOD, key: "brood", nom: "Nuée", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "une nuée de rejetons éclot",
    ordre: "UNE NUÉE ÉCLOT", forme: "disque" },
  { id: MECH_REVERSE, key: "reverse", nom: "Inversion", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "les motifs repartent en sens inverse",
    ordre: "LE MOTIF S'INVERSE", forme: "ligne" },
  { id: MECH_SWAP, key: "swap", nom: "Échange", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "ils viennent d'échanger leurs places",
    ordre: "ILS ONT ÉCHANGÉ", forme: "ligne" },
  { id: MECH_ENRAGE, key: "enrage", nom: "Emportement", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "le combat s'éternise — il frappe plus fort",
    ordre: "IL FRAPPE PLUS FORT", forme: "disque" },

  { id: MECH_SYNTH, key: "synth", nom: "Synthèse", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "deux motifs à la fois — lisez les deux",
    ordre: "DEUX MOTIFS", forme: "damier" },
  { id: MECH_SEAL, key: "seal", nom: "Sceau", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "TENEZ tous les foyers en même temps",
    ordre: "TENEZ TOUS LES FOYERS", forme: "colonne" },
];

export function mechAt(id) { return MECHS[id] ?? null; }

// LE METRONOME SE DEDUIT DE L HORLOGE DE MANCHE. Rien ne traverse le reseau :
// serveur et client lisent la meme grille, donc le metronome visuel ne ment pas.
export function beatPhase(tm) {
  const T = BOSS_CFG.METRO_BEAT;
  return { temps: Math.floor(tm / T) % BOSS_CFG.METRO_MEASURE, k: (tm % T) / T };
}

// LA FORME DIT L'ACTION. Onze formes pour trente et une mecaniques : une forme
// sert plusieurs mecaniques, une mecanique ne change JAMAIS de forme.
export const FORMES = {
  disque:   "sortir",
  anneau:   "rentrer",
  cone:     "contourner",
  ligne:    "traverser lateralement",
  damier:   "se placer dans un creux",
  cercle:   "se regrouper dessus",
  triangle: "s'eloigner de lui",
  colonne:  "occuper a N",
  oeil:     "cesser de viser",
  chaine:   "s'eloigner l'un de l'autre",
  cage:     "tirer dessus",
};

// LA COULEUR DIT L'INTENTION, et le collectif ne se declare pas : il se DEDUIT.
// Toute mecanique a `minPlayers >= 2` engage l'equipe, donc elle est violette —
// la regle s'applique seule sur les donnees existantes.
export function mechCollective(id) {
  const def = MECHS[id];
  return !!def && def.minPlayers >= 2;
}

export function verifierGrammaire() {
  const err = [];
  const parForme = new Map();
  for (const m of MECHS) {
    if (!m.ordre) err.push(`${m.key} : pas d'ordre court`);
    else if (m.ordre.split(/\s+/).length > 4) err.push(`${m.ordre} : plus de quatre mots`);
    if (!m.forme) err.push(`${m.key} : pas de forme`);
    else if (!FORMES[m.forme]) err.push(`${m.key} : forme inconnue « ${m.forme} »`);
    else {
      if (!parForme.has(m.forme)) parForme.set(m.forme, []);
      parForme.get(m.forme).push(m.key);
    }
    if (!m.texte) err.push(`${m.key} : pas d'explication`);
  }
  for (const [f, keys] of parForme) {
    if (FORMES[f]) continue;
    err.push(`forme ${f} sans sens : ${keys.join(", ")}`);
  }
  return { ok: err.length === 0, err, formes: [...parForme].map(([f, k]) => [f, k.length]) };
}

// CE QUI DIFFERENCIE DEUX BOSS N'EST NI LEUR SILHOUETTE NI LEUR LISTE
// D'ATTAQUES, C'EST LA FACON DONT ILS DEFORMENT L'ARENE. Six boss, six
// archetypes, et AU PLUS UN garde « mobile » : quand cinq boss occupent
// l'espace de la meme facon, le joueur les vit comme un seul boss a cinq jeux
// de telegraphes.
export const ARCHETYPES = {
  ancre:         "il occupe un bord, l'arene devient asymetrique",
  constricteur:  "l'espace disponible diminue et ne revient pas",
  diffus:        "la horde est son corps",
  multiple:      "l'equipe doit se diviser dans l'espace",
  mobile:        "l'espace se deplace avec lui",
  fixe:          "l'espace est neutre, tout est dans la lecture du sol",
};

export function verifierArchetypes() {
  const err = [];
  const vus = new Map();
  for (const b of BOSS_ROSTER) {
    const a = b.archetype;
    if (!a) { err.push(`${b.key} : pas d'archetype`); continue; }
    if (!ARCHETYPES[a]) { err.push(`${b.key} : archetype inconnu « ${a} »`); continue; }
    if (!vus.has(a)) vus.set(a, []);
    vus.get(a).push(b.key);
  }
  for (const [a, keys] of vus) {
    if (keys.length > 1) err.push(`archetype ${a} partage : ${keys.join(", ")}`);
  }
  return { ok: err.length === 0, err };
}

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
    minPlayers: 1, hpMul: 1.00, archetype: "constricteur",
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
    minPlayers: 1, hpMul: 0.85, archetype: "diffus",
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
    minPlayers: 1, hpMul: 0.90, archetype: "mobile",
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
    minPlayers: 1, hpMul: 0.95, archetype: "ancre",
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
    minPlayers: 1, hpMul: 1.00, archetype: "multiple",
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
    minPlayers: 1, hpMul: 1.00, archetype: "fixe", bars: 8,
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

// LE TEMPS DIT L'URGENCE, et il n'a que quatre valeurs — jamais entre les deux.
// Les `*_WARN` s'y rangent tous : une duree ad hoc ne s'apprend pas, quatre
// classes s'apprennent en trois manches.
export const WARN_REFLEXE = 0.8;
export const WARN_STANDARD = 1.6;
export const WARN_LECTURE = 2.4;
export const WARN_PREPARATION = 4.0;
export const WARN_CLASSES = [WARN_REFLEXE, WARN_STANDARD, WARN_LECTURE, WARN_PREPARATION];

export const BOSS_CFG = {
  BAR_DWELL: 10,

  ENRAGE_AT: 150,
  ENRAGE_STEP: 30,
  FINAL_ENRAGE_AT: 300,
  ENRAGE_DAMAGE: 0.25,
  ENRAGE_CD: 0.12,
  ENRAGE_CD_FLOOR: 0.45,

  // a quatre joueurs un rassemblement dans 135 px est serre, a deux une
  // dispersion de 230 px est triviale : les deux rayons suivent l'effectif.
  STACK_PER_PLAYER: 26,
  SPREAD_PER_PLAYER: -22,

  RENFORT_RANGE: 200,
  RENFORT_STEP: 0.06,
  RENFORT_MAX: 0.30,

  SUITE_GAP: 2.2,
  SUPERPOSE_GAP: 0.7,

  DIFFUS_RANGE: 420,
  DIFFUS_HEAL: 0.0012,
  DIFFUS_CAP: 12,

  BLINK_EVERY: 3.6,
  BLINK_DIST: 300,

  METRO_BEAT: 0.8,
  METRO_MEASURE: 4,

  BROOD_COUNT: 5,
  MECH_DAMAGE_RATIO: 0.90,
  MECH_VULN: 1,

  STACK_RADIUS: 135,
  STACK_WARN: WARN_PREPARATION,
  SPREAD_MIN: 230,
  SPREAD_WARN: WARN_PREPARATION,
  SPREAD_RATIO: 0.55,
  TOWER_RADIUS: 95,
  TOWER_WARN: WARN_PREPARATION,
  TOWER_RATIO: 0.45,
  COUNT_WARN: WARN_PREPARATION,
  LINK_BREAK: 300,
  LINK_TIME: 8,
  LINK_DPS: 11,
  JAIL_TIME: 7,
  JAIL_HP: 240,
  GAZE_WARN: WARN_STANDARD,
  GAZE_TIME: 2.0,
  GAZE_TICK: 0.5,
  GAZE_RATIO: 0.22,
  PROX_RADIUS: 280,
  PROX_WARN: WARN_LECTURE,

  CLUSTER_HP: 230,
  CLUSTER_TIME: 12,
  CLUSTER_HATCH: 3,
  CLUSTER_COUNT: 2,
  FEED_COUNT: 2,
  FEED_HEAL: 0.005,

  EXAFLARE_STEPS: 7,
  EXAFLARE_R: 105,
  EXAFLARE_WARN: WARN_STANDARD,
  EXAFLARE_STEP: 0.32,
  BAIT_COUNT: 4,
  BAIT_STEP: 0.55,
  BAIT_WARN: WARN_STANDARD,
  BAIT_R: 90,
  BAIT_LAG: 1.0,
  DRIFT_COUNT: 3,
  DRIFT_R: 115,
  DRIFT_SPEED: 95,
  DRIFT_TICKS: 10,
  DRIFT_PERIOD: 0.5,
  SANCT_R: 125,
  SANCT_WARN: WARN_LECTURE,
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

  QUADRANT_WARN: WARN_PREPARATION,
  QUADRANT_TICKS: 5,
  QUADRANT_PERIOD: 0.7,
  QUAD_TIME: 20,
  QUAD_THICK: 26,

  SHRINK_STEP: 0.13,
  SHRINK_MIN: 0.45,
  SHRINK_WARN: WARN_LECTURE,
  SHRINK_RATIO: 0.5,
  CROWN_PUSH: 260,

  CONE_R: 640,
  CONE_SPREAD: 0.40,
  CONE_WARN: WARN_STANDARD,
  PACMAN_R: 700,
  PACMAN_SAFE: 0.58,
  PACMAN_WARN: WARN_LECTURE,

  ULT_FILL: 1 / 42,
  ULT_DRAIN: 1 / 9,
  ULT_RATIO: 1.0,

  TWIN_HEAL_RANGE: 400,
  TWIN_HEAL: 0.022,
  TWIN_GAP: 520,
  TWIN_BLAST_RATIO: 0.75,
  TWIN_STATUS_CD: 5,
  CROSS_THICKNESS: 150,
  CROSS_WARN: WARN_STANDARD,
  CROSS_GAP: 0.18,
  CROSSD_THICKNESS: 130,
  CROSSD_WARN: WARN_LECTURE,
  CROSSD_LIFE: 8,
  CROSSD_DOT: 26,

  FINAL_HP_MUL: 1.3,
  FINAL_BAR_DWELL: 10,

  SEAL_RADIUS: 88,
  SEAL_WARN: WARN_PREPARATION,
  SEAL_RATIO: 1.0,
  SEAL_SPREAD: 0.40,

  SYNTH_GAP: 0.9,
};
