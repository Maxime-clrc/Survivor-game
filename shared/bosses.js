
import { t } from "./i18n.js";

export const BOSS_RAVAGEUR = 0;
export const BOSS_MATRIARCHE = 1;
export const BOSS_METRONOME = 2;
export const BOSS_ORACLE = 3;
export const BOSS_JUMEAUX = 4;
export const BOSS_FINAL = 5;
export const BOSS_VEILLEUR = 6;
export const BOSS_TISSEUR = 7;
export const BOSS_PRISME = 8;
export const BOSS_RECITANT = 9;
export const BOSS_SILENCE = 10;

// combien de boss une MANCHE montre, pas combien le depot en compte
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
export const MECH_RELOC = 31;

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
  { id: MECH_RELOC, key: "reloc", nom: "Réinstallation", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "il se réinstalle ailleurs — l'arène change de côté",
    ordre: "IL CHANGE DE CÔTÉ", forme: "ligne" },
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

// CE QU'UN ORDRE PREND AU JOUEUR, ET DANS QUEL SENS. Il n'a qu'une position et
// qu'une ligne de visee : deux ordres du meme axe et de sens contraire ne sont
// pas deux choses a lire, c'est une consigne impossible. Deux ordres qui
// DESIGNENT un point ne se tiennent pas non plus — il n'y a qu'un endroit ou
// aller. Une forme absente de la table est un evitement (`disque`, `anneau`,
// `cone`, `ligne`, `damier`) : le joueur choisit ou aller, donc elle ne prend
// rien et se superpose a tout.
export const AXES = {
  colonne:  ["place", 1],
  cercle:   ["place", 1],
  triangle: ["place", -1],
  chaine:   ["place", -1],
  cage:     ["visee", 1],
  oeil:     ["visee", -1],
};

export function mechsCompatibles(a, b) {
  const ca = AXES[MECHS[a]?.forme], cb = AXES[MECHS[b]?.forme];
  if (!ca || !cb || ca[0] !== cb[0]) return true;
  if (ca[1] !== cb[1]) return false;
  // deux visees de meme sens sont une seule consigne (« tire sur ces deux
  // cibles ») ; deux ecarts aussi. Deux points designes, jamais.
  return ca[0] !== "place" || ca[1] < 0;
}

// CRITERE REJOUABLE : quelles paires incompatibles un pool peut-il seulement
// tirer ? La reponse doit rester « aucune qui ne soit gardee » — le verrou vit
// dans `_mechLibre`, ceci en est la lecture.
export function verifierCoexistence() {
  const paires = [];
  for (let a = 0; a < MECHS.length; a++) {
    for (let b = a + 1; b < MECHS.length; b++) {
      if (!mechsCompatibles(a, b)) paires.push(`${MECHS[a].key} x ${MECHS[b].key}`);
    }
  }
  return { ok: true, paires };
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
  for (const f of Object.keys(AXES)) {
    if (!FORMES[f]) err.push(`axe ${f} : forme inconnue`);
  }
  return { ok: err.length === 0, err, formes: [...parForme].map(([f, k]) => [f, k.length]) };
}

// CE QUI DIFFERENCIE DEUX BOSS N'EST NI LEUR SILHOUETTE NI LEUR LISTE
// D'ATTAQUES, C'EST LA FACON DONT ILS DEFORMENT L'ARENE. Six boss, six
// archetypes, et AU PLUS UN garde « mobile » : quand cinq boss occupent
// l'espace de la meme facon, le joueur les vit comme un seul boss a cinq jeux
// de telegraphes.
export const ARCHETYPES = {
  guetteur:      "il ne bouge pas et il REGARDE : c'est le tir qui devient cher",
  batisseur:     "il CONSTRUIT a l'interieur, la place se perd la ou il passe",
  reflet:        "plusieurs corps, un seul vrai",
  ancre:         "il occupe un bord, l'arene devient asymetrique",
  constricteur:  "l'espace disponible diminue et ne revient pas",
  diffus:        "la horde est son corps",
  multiple:      "l'equipe doit se diviser dans l'espace",
  mobile:        "l'espace se deplace avec lui",
  fixe:          "l'espace est neutre, tout est dans la lecture du sol",
};

// l'unicite porte sur le POOL : c'est lui qu'une manche montre, et deux boss
// tires ne doivent pas occuper l'espace de la meme facon. Les finaux sont hors
// pool, un seul sort par manche, ils peuvent partager « fixe ».
export function verifierArchetypes() {
  const err = [];
  const vus = new Map();
  for (const b of BOSS_ROSTER) {
    if (b.finalPour !== undefined || b.id === BOSS_FINAL) continue;
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

  // TROIS BOSS DE PLUS, APPEND-ONLY : l'index circule dans `bo[9]`, inserer au
  // milieu reecrirait le sens de tous les instantanes. Le pool passe a huit
  // (`BOSS_POOL`), le tirage reste a cinq — une manche n'en montre plus que 5/8,
  // donc deux parties consecutives cessent de se ressembler.
  {
    id: BOSS_VEILLEUR, key: "veilleur", nom: "Veilleur", verbe: "renoncement",
    minPlayers: 1, hpMul: 0.92, archetype: "guetteur",
    sous: "accepte de ne pas tirer",
    base: ["regard", "cone", "salve"],
    unlock: [
      ["regarddouble"],
      ["damier"],
      ["regardmobile"],
      ["regardpermanent"],
    ],
  },
  {
    id: BOSS_TISSEUR, key: "tisseur", nom: "Tisseur", verbe: "espace",
    minPlayers: 1, hpMul: 1.05, archetype: "batisseur",
    sous: "il te reste de moins en moins de place",
    base: ["mur", "marques", "salve"],
    unlock: [
      ["noeuds"],
      ["prison"],
      ["quadrant"],
      ["entrelacs"],
    ],
  },
  {
    id: BOSS_PRISME, key: "prisme", nom: "Prisme", verbe: "identification",
    minPlayers: 2, hpMul: 0.95, archetype: "reflet",
    sous: "lequel est le vrai",
    base: ["copies", "croix", "marques"],
    unlock: [
      ["copiesrenvoi"],
      ["echange"],
      ["copiesliees"],
      ["copiesvraie"],
    ],
  },

  // UN FINAL PAR DIFFICULTE. `finalPour` est la seule variante de boss par
  // difficulte du depot, et elle est bornee au final : le pool de tirage reste
  // commun aux trois modes.
  {
    id: BOSS_RECITANT, key: "recitant", nom: "Récitant", verbe: "récapitulation",
    minPlayers: 1, hpMul: 0.90, archetype: "fixe", bars: 5, finalPour: 0,
    sous: "tout ce qu'ils t'ont appris",
    base: ["salve", "marques"],
    unlock: [
      ["damier"],
      ["grappes"],
      ["sanctuaire"],
      ["rassemblement"],
    ],
  },
  {
    id: BOSS_SILENCE, key: "silence", nom: "Silence", verbe: "mémoire",
    minPlayers: 1, hpMul: 1.10, archetype: "fixe", bars: 6, finalPour: 2,
    sous: "il n'y aura pas d'avertissement",
    base: ["salve", "marques", "croix", "regard"],
    unlock: [
      ["sceau"],
      ["synthese"],
      ["entrelacs"],
      ["synthesedouble"],
      ["sansannonce"],
    ],
  },
];

// LE POOL EST UNE LISTE, PAS UN PREFIXE : les finaux vivent apres les boss de
// pool dans le tableau, et l'ordre du tableau est fige (l'index circule).
export const BOSS_POOL = [
  BOSS_RAVAGEUR, BOSS_MATRIARCHE, BOSS_METRONOME, BOSS_ORACLE, BOSS_JUMEAUX,
  BOSS_VEILLEUR, BOSS_TISSEUR, BOSS_PRISME,
];

export function estFinal(kind) { return bossAt(kind).finalPour !== undefined || kind === BOSS_FINAL; }

export function finalPour(diffIndex) {
  const f = BOSS_ROSTER.find(b => b.finalPour === diffIndex);
  return f ? f.id : BOSS_FINAL;
}

export function bossAt(i) { return BOSS_ROSTER[i] ?? BOSS_ROSTER[0]; }

/* Points de passage du texte d'un boss et d'une mecanique. */
export const bossNom = i => t(`boss.${bossAt(i).key}.nom`, bossAt(i).nom);
export const bossVerbe = i => t(`boss.${bossAt(i).key}.verbe`, bossAt(i).verbe);
export const bossSous = i => t(`boss.${bossAt(i).key}.sous`, bossAt(i).sous ?? "");
export const mechNom = i => t(`mech.${MECHS[i]?.key}.nom`, MECHS[i]?.nom ?? "");
export const mechTexte = i => t(`mech.${MECHS[i]?.key}.texte`, MECHS[i]?.texte ?? "");
export const mechOrdre = i => (MECHS[i]?.ordre
  ? t(`mech.${MECHS[i].key}.ordre`, MECHS[i].ordre)
  : "");

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

  GAZE_PERMANENT: 4,
  GAZE_PERM_OPEN: 1.4,
  GAZE_PERM_GAP: 1.2,
  RELOC_DIST: 520,
  RECITANT_HEAL: 0.35,

  NOEUD_HP: 260,
  NOEUD_COUNT: 4,
  NOEUD_TIME: 9,
  NOEUD_R: 120,
  NOEUD_DOT: 26,
  NOEUD_LIFE: 14,

  SUITE_GAP: 2.2,
  SUPERPOSE_GAP: 0.7,

  // IL Y A TOUJOURS UN ABRI. Une zone qui recouvre un endroit ou il FAUT etre
  // s'ecarte, SAUF si elle se resout assez tot pour qu'on en sorte et qu'on y
  // revienne : la superposition devient alors du timing, ce qui est le but, au
  // lieu d'un ordre impossible. `ABRI_RETOUR` est ce delai de retour.
  ABRI_RETOUR: 1.2,
  ABRI_MARGE: 46,
  // en dessous de ce reste, un abri ne laisse plus le temps de sortir d'un motif
  // qui sature le sol et d'y revenir : le motif se replie au lieu de se poser.
  ABRI_SATURE: 3.0,
  // UNE MEMOIRE DE TROIS, PAS DE UN : avec un pool de trois ou quatre entrees,
  // ne regarder que la derniere produit A B A B A B.
  ATK_MEMO: 3,

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
  // LE REGARD EST UN INSTANT DE RESOLUTION, PAS UN ETAT SOUTENU. Un etat n'a
  // pas de fin lisible : le joueur ne sait pas quand reviser, donc il attend
  // trop, perd son DPS, puis reprend au hasard. Un decompte, une resolution,
  // termine — et le pire cas passe de quatre tics a 22 % (88 % des PV max) a UN
  // coup. La classe de preavis monte d'autant : celle-ci demande de CHANGER DE
  // POSTURE, pas de lire le sol.
  GAZE_WARN: WARN_PREPARATION,
  GAZE_TIME: 0,
  GAZE_RATIO: 0.30,
  // le seuil du test, ECRIT : la couche 4 dessine exactement `acos(GAZE_COS)`
  // autour du joueur, donc le secteur montre est celui que le code mesure.
  GAZE_COS: 0.6,
  // detourner UNE FOIS dans cette fenetre suffit : sans elle la mecanique se
  // joue a l'image pres, ce qui n'est pas lisible.
  GAZE_GRACE: 0.2,
  // le regard PERMANENT reste la seule occurrence d'etat soutenu du jeu
  // (derniere phase du Veilleur). Son tic garde donc son propre ratio : 0,30
  // par demi-seconde y serait une execution.
  GAZE_TICK: 0.5,
  GAZE_PERM_RATIO: 0.16,
  // l'oeil ferme est une fenetre de TIR, et elle ne se tire pas au sort : sans
  // plancher, deux regards s'enchainent en moins que leur propre duree et la
  // mecanique cesse d'etre un arbitrage pour devenir une interdiction.
  GAZE_REST: 2.6,
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
  TWIN_FOCUS_TIME: 6,
  TWIN_STANDOFF: 560,
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
