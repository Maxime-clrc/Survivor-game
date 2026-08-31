import { t, tf } from "./i18n.js";

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

/* LA GRAMMAIRE D'ATTAQUE DE LA HORDE, et son SEUL point de passage.

   TELEGRAPHE -> ACTION -> IMPACT -> RECUPERATION. Trois attaques la suivent :
   la ruee, le tir, l'amorce d'explosion. Toutes trois passent par le meme
   preavis, le meme budget et la meme liste (`state.windup`).

   LE PREAVIS DE LA HORDE SE PORTE SUR LE CORPS, celui du boss sur le SOL. Ce
   n'est pas un detail de rendu : le canal du telegraphe au sol appartient au
   boss et ne se partage pas (`SIMULATION.md`), sans quoi une arene a 200 corps
   n'a plus de sol lisible. Un corps qui s'apprete se voit a sa POSTURE.

   UN SEUL CHIFFRE DE PREAVIS. Un joueur apprend « quand un corps se ramasse,
   quelque chose part une demi-seconde plus tard » — pas trois durees selon le
   type. Ce qui distingue les trois attaques est ce qu'elles FONT, pas leur
   compte a rebours.

   `VUE_MAX` est un budget de LISIBILITE, donc il se compte par VUE et non par
   population : ce qu'un ecran peut porter ne suit pas la densite. Il couvre
   maintenant les trois attaques — un tireur qui vise coute la meme place qu'un
   fonceur qui se ramasse. */
export const ATK_CFG = {
  WARN: 0.5,
  VUE_MAX: 8,

  // ce qui reste de vitesse pendant une visee : le tireur se PLANTE, il ne
  // tire pas en marchant. C'est ce qui rend le preavis lisible de loin.
  AIM_SLOW: 0.3,
  SHOOT_RANGE: 520,

  // ce que vaut la proximite d'un allie pour le harceleur : un joueur couvert
  // pese `ISOLE_COUVERT` fois sa distance, un joueur seul la sienne. C'est un
  // poids, pas un seuil — il n'y a pas de moment ou l'on « devient » isole.
  ISOLE_RAYON: 420,
  ISOLE_COUVERT: 2.2,
};

export const TRAIT_CFG = {
  DASH_MUL: 2.5,
  DASH_TIME: 0.35,
  DASH_CD: 6,
  DASH_GATHER: 0.25,
  DASH_RANGE: 420,

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

/* CE QU'UN ROLE FAIT DE SON CORPS. Trois reglages, et deux des trois se
   DEDUISENT au lieu de se declarer — une colonne de plus dans le bestiaire est
   une colonne de plus a tenir d'accord avec le reste.

   LA MASSE EST LA SURFACE : `(r / MASSE_REF)^2`. Un colosse pese trois fois un
   fantassin, un coureur la moitie, et une elite paie son rayon sans qu'aucune
   ligne ne le dise. C'est ce qui fait qu'un tank TRAVERSE un paquet au lieu d'y
   rester pris, et qu'un coureur s'ecarte au lieu de le bloquer.

   L'ECART DE POSTE ne concerne que ce qui TIENT UNE DISTANCE (`shootCd` ou
   `heal`) : sans lui, tout ce qui vise le meme `standoff` autour de la meme
   cible finit sur le meme arc, et une salve de six part d'un seul point.
   Il DIMENSIONNE LA CELLULE de `_grille()` — la preuve de couverture du
   voisinage 3x3 porte sur la plus grande distance d'interaction, pas sur les
   rayons.

   LE FLANC est le seul champ qui reste declare : « arriver par le cote » est une
   intention, elle ne se lit dans aucune statistique. */
export const ROLE_CFG = {
  MASSE_REF: 12,
  MASSE_MIN: 0.4,
  MASSE_MAX: 5,

  POSTE_ECART: 64,

  FLANC_NEAR: 150,
  FLANC_SPAN: 350,
};

export function masseDe(r) {
  const m = (r / ROLE_CFG.MASSE_REF) ** 2;
  return Math.max(ROLE_CFG.MASSE_MIN, Math.min(ROLE_CFG.MASSE_MAX, m));
}

export const ecartDe = def => (def?.shootCd || def?.heal) ? ROLE_CFG.POSTE_ECART : 0;

export const ENEMY_TYPES = [
  { key: "grunt",   minMin: 0,   fallback: -1, weight: 1.00, share: 1.00, hpMul: 1.0,  speed: 95,  dmg: 18, r: 12, score: 10, xp: 10,
    elite: { blastRadius: 80, blastDamage: 34, blastDelay: ATK_CFG.WARN } },
  { key: "runner",  minMin: 1,   fallback: 0,  weight: 0.55, share: 0.45, hpMul: 0.40, speed: 156, dmg: 7,  r: 9,  score: 14, xp: 6,
    flanc: 0.55,
    elite: { flanc: 0.85, isole: 1 } },
  { key: "tank",    minMin: 4,   fallback: 0,  weight: 0.30, share: 0.22, hpMul: 4.5,  speed: 44,  dmg: 30, r: 21, score: 30, xp: 32,
    elite: { auraRadius: 105, auraReduction: 0.22 } },
  { key: "shooter", minMin: 7,   fallback: 1,  weight: 0.30, share: 0.16, hpMul: 1.3,  speed: 62,  dmg: 14, r: 14, score: 25, xp: 14,
    shootCd: 2.6, standoff: 170,
    elite: { shootCd: 1.5, standoff: 215 } },
  { key: "brood",   minMin: 9,   fallback: 1,  weight: 0.25, share: 0.12, hpMul: 1.8,  speed: 78,  dmg: 20, r: 16, score: 20, xp: 18,
    splits: 3,
    elite: { splits: 5 } },

  { key: "kamikaze", minMin: 12, fallback: 1, weight: 0.22, share: 0.18, hpMul: 0.5, speed: 118, dmg: 8, r: 10, score: 18, xp: 8,
    blastRadius: 90, blastDamage: 45, blastDelay: ATK_CFG.WARN,
    elite: { blastRadius: 135 } },

  { key: "bulwark",  minMin: 15, fallback: 2, weight: 0.30, share: 0.16, hpMul: 2.2, speed: 50, dmg: 22, r: 15, score: 32, xp: 22,
    shieldArc: 100, shieldTurnRate: 2.4,
    elite: { shieldArc: 165, shieldTurnRate: 3.4 } },

  { key: "medic",    minMin: 19, fallback: 3, weight: 0.28, share: 0.09, hpMul: 0.9, speed: 68, dmg: 10, r: 13, score: 28, xp: 14,
    standoff: 240, heal: 6, healInterval: 1.2, healRange: 190,
    fireWindow: 0.35, breakTime: 1.0, fleeTime: 3.0,
    elite: { heal: 9, healInterval: 0.7, healRange: 250 } },

  { key: "choeur",   minMin: 23, fallback: 4, weight: 0.20, share: 0.08, hpMul: 1.6, speed: 70, dmg: 12, r: 15, score: 30, xp: 20,
    auraRadius: 130, auraReduction: 0.35,
    elite: { auraRadius: 180 } },

  /* TROIS VERBES, PAS TROIS SILHOUETTES. Chacun repose la meme question au
     joueur sous une forme neuve, et aucun ne se contente d'un autre jeu de
     statistiques :

     HARCELEUR   « es-tu couvert ? »   il choisit l'ISOLE et arrive par le cote,
                 puis se retire apres avoir touche. Son verbe n'existe qu'a
                 plusieurs — en solo il se comporte comme un coureur, et c'est
                 assume : un harceleur seul n'a personne a separer du groupe.
     GENERATEUR  « qui d'abord ? »     il ne blesse presque pas, il rend la horde
                 autour de lui coriace. Le seul ennemi du roster qu'on tue pour
                 ce qu'il empeche, pas pour ce qu'il fait.
     SABOTEUR    « ou te tiens-tu ? »  il ne vient pas au contact, il retire du
                 sol. La ou le kamikaze punit une mise a mort et la trainee suit
                 un trajet, lui VISE la place que vous occupez. */
  { key: "harceleur", minMin: 14, fallback: 1, weight: 0.26, share: 0.14, hpMul: 0.6, speed: 132, dmg: 12, r: 10, score: 22, xp: 12,
    flanc: 0.95, isole: 1, recul: 1.6,
    elite: { recul: 2.4 } },

  /* L'EGIDE EST UNE PART DES PV, PAS UN NOMBRE. Un bouclier plat de 26 vaut
     38 % d'un fantassin a la cinquieme minute et 9 % a la trentieme : il serait
     ecrasant au debut et invisible a la fin, c'est-a-dire l'inverse de ce qu'on
     demande a un ennemi tardif. La part, elle, ne bouge pas avec la rampe de PV.
     `egideRegen` est la meme part PAR SECONDE : la coque revient en trois
     secondes si on lache le corps, et c'est ce qui punit le tir disperse. */
  { key: "generateur", minMin: 17, fallback: 4, weight: 0.18, share: 0.06, hpMul: 1.7, speed: 52, dmg: 8, r: 15, score: 34, xp: 24,
    egideRadius: 150, egideShield: 0.34, egideRegen: 0.11,
    elite: { egideRadius: 215, egideShield: 0.45 } },

  { key: "saboteur",  minMin: 20, fallback: 3, weight: 0.22, share: 0.10, hpMul: 1.1, speed: 66, dmg: 10, r: 13, score: 28, xp: 18,
    standoff: 300, poseCd: 4.2, poseRange: 380, poseR: 60, poseDot: 22, poseLife: 4,
    elite: { poseCd: 2.4, poseR: 75 } },

  /* RELAIS — « qui va avec qui ? » Le seul corps du roster dont la menace
     n'est pas LUI mais la PAIRE : deux relais tendent un arc, et l'arc est ce
     qui blesse. Un joueur ne compte plus des corps, il lit une geometrie.
     Tuer l'un des deux suffit — c'est la premiere fois que le roster propose
     une cible dont la valeur depend d'une AUTRE cible. */
  { key: "relais",   minMin: 22, fallback: 3, weight: 0.20, share: 0.08, hpMul: 1.3, speed: 74, dmg: 10, r: 13, score: 30, xp: 20,
    lienRange: 300, lienRupture: 430, lienLarge: 16, lienDot: 34, cohesion: 0.55,
    elite: { lienRange: 400, lienRupture: 560, lienDot: 44 } },
];

/* UNE ELITE EST UNE VARIANTE DE COMPORTEMENT, PAS UN MULTIPLICATEUR DE PV.

   Elle s'ecrit SUR LA LIGNE DE SON TYPE, et elle ne surcharge que des champs de
   COMPORTEMENT : les statistiques d'apparition et l'economie sont interdites
   (`ELITE_INTERDIT`), sans quoi une elite deviendrait un type de plus qui vole
   son quota et son score au sien. Les trois multiplicateurs existants
   (`ELITE_HP_MUL`, `ELITE_SPEED_MUL`, `ELITE_RADIUS_MUL`) restent le socle et ne
   se declarent pas ici — une ligne qui les redirait divergerait.

   `defDe(type, elite)` est le SEUL point de lecture du bestiaire par corps. Il
   est pur, donc le client le rejoue a partir de `e.elite` : le reseau ne porte
   pas une fiche de plus, il porte deja le bit. */
export const ELITE_INTERDIT = new Set([
  "key", "minMin", "fallback", "weight", "share", "score", "xp",
  "hpMul", "speed", "r", "elite",
]);

const ELITE_TYPES = ENEMY_TYPES.map(d => (d.elite ? { ...d, ...d.elite } : d));

export function defDe(index, elite) {
  return (elite ? ELITE_TYPES[index] : ENEMY_TYPES[index]) ?? ENEMY_TYPES[0];
}

/* CRITERE REJOUABLE. Muet = tout va bien. Il ne juge pas l'equilibre d'une
   elite : il juge qu'elle reste UNE VARIANTE DE SON TYPE. */
export function verifierElites() {
  const soucis = [];
  for (const d of ENEMY_TYPES) {
    if (!d.elite) { soucis.push(`${d.key} : aucune variante d'elite`); continue; }
    for (const champ of Object.keys(d.elite)) {
      if (ELITE_INTERDIT.has(champ)) {
        soucis.push(`${d.key} : l'elite surcharge « ${champ} », qui n'est pas du comportement`);
      } else if (!(champ in d)) {
        // une elite qui OUVRE un champ absent du type de base est permise —
        // c'est meme le cas du fantassin, qui n'explose que sous cette forme —
        // mais elle doit le faire pour un champ que la simulation LIT.
        if (!CHAMPS_LUS.has(champ)) {
          soucis.push(`${d.key} : l'elite ouvre « ${champ} », que rien ne lit`);
        }
      }
    }
  }
  return soucis;
}

/* CE QUE LA SIMULATION LIT SUR UNE FICHE, releve a la main parce qu'il n'y a
   pas d'autre facon de le savoir : un champ mal orthographie ne leve rien, il
   rend `undefined`, donc `NaN`, donc du silence. */
const CHAMPS_LUS = new Set([
  "dmg", "shootCd", "standoff", "splits", "heal", "healInterval", "healRange",
  "fireWindow", "breakTime", "fleeTime", "blastRadius", "blastDamage",
  "blastDelay", "shieldArc", "shieldTurnRate", "auraRadius", "auraReduction",
  "flanc", "isole", "recul", "egideRadius", "egideShield", "egideRegen",
  "poseCd", "poseRange", "poseR", "poseDot", "poseLife",
  "lienRange", "lienRupture", "lienLarge", "lienDot", "cohesion",
]);

export function trailMax(aireVue) {
  return Math.round(aireVue * TRAIT_CFG.TRAIL_SURFACE
    / (Math.PI * TRAIT_CFG.TRAIL_R * TRAIT_CFG.TRAIL_R));
}



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

/* --- LA FICHE D UNE CREATURE ----------------------------------------------

   CE QUI S ECRIT ET CE QUI SE DEDUIT, et la ligne entre les deux est la meme
   que celle de `feedback.js`. Le NOM et le LORE s ecrivent : aucun chiffre ne
   les porte. Le ROLE se DEDUIT de la fiche de combat — vitesse, masse, portee,
   ce qu elle pose — parce qu un role ecrit a la main mentirait au premier
   equilibrage, et personne ne penserait a le relire.

   Treize creatures n avaient PAS DE NOM. Elles n avaient que leur cle de code
   (`grunt`, `brood`, `bulwark`), jamais montree, et le jeu les a fait combattre
   pendant tout ce temps sans jamais les nommer. Un bestiaire commence par la.

   Le francais vit ICI, a cote de sa donnee, et sert de repli ; l anglais est une
   surcharge par cle dans `lang/en.js`. */
const FICHES = {
  grunt: {
    nom: "Fantassin",
    lore: "Le corps par défaut de la horde. Rien ne le distingue, et c'est précisément ce qui le rend dangereux en nombre.",
  },
  runner: {
    nom: "Coureur",
    lore: "Trop léger pour encaisser, assez rapide pour ne pas avoir à le faire. Il ne vient jamais par le chemin qu'on surveille.",
  },
  tank: {
    nom: "Colosse",
    lore: "Il n'a pas besoin d'être rapide : il suffit qu'il arrive. Ce qui le suit compte sur lui pour absorber ce qui lui était destiné.",
  },
  shooter: {
    nom: "Tireur",
    lore: "Le premier corps de la horde qui ait compris qu'on peut blesser sans toucher. Il garde ses distances et laisse les autres avancer.",
  },
  brood: {
    nom: "Couveuse",
    lore: "La tuer ne la fait pas disparaître, ça la divise. Elle est le seul corps qui gagne à mourir.",
  },
  kamikaze: {
    nom: "Détonateur",
    lore: "Il ne porte rien d'autre que sa charge. Sa fragilité n'est pas un défaut de conception : elle garantit qu'il arrive vite et qu'il ne sert qu'une fois.",
  },
  bulwark: {
    nom: "Pavois",
    lore: "Il tourne toujours sa plaque vers la menace. Sa faiblesse n'est pas dans son armure, elle est derrière.",
  },
  medic: {
    nom: "Soigneur",
    lore: "Il ne vous attaquera presque jamais. Il défait simplement, derrière vous, tout ce que vous venez de faire.",
  },
  choeur: {
    nom: "Chœur",
    lore: "Il ne frappe pas plus fort : il rend les autres plus durs. Tant qu'il chante, la horde autour de lui coûte le double.",
  },
  harceleur: {
    nom: "Harceleur",
    lore: "Il cherche celui qui s'est éloigné. Il ne s'engage jamais de face et recule dès qu'on se retourne.",
  },
  generateur: {
    nom: "Générateur",
    lore: "Il ne se bat pas, il équipe. Les coques qu'il distribue se refont tant qu'il est debout — le tuer d'abord est une consigne que personne n'a écrite.",
  },
  saboteur: {
    nom: "Saboteur",
    lore: "Il ne vise pas les corps, il vise le sol. Ce qu'il pose reste après lui et décide où vous n'irez pas.",
  },
  relais: {
    nom: "Relais",
    lore: "Seul, il n'est presque rien. Apparié, le vide entre les deux devient l'arme — et ils tiennent le lien plus longtemps qu'on ne le croit.",
  },
};

export const enemyNom = key => t(`bestiaire.${key}.nom`, FICHES[key]?.nom ?? key);
export const enemyLore = key => t(`bestiaire.${key}.lore`, FICHES[key]?.lore ?? "");

/* CE QU UNE CREATURE FAIT, RELEVE SUR SA FICHE DE COMBAT. Aucune de ces lignes
   n est ecrite deux fois : elles sortent des memes champs que la simulation lit,
   donc un reglage d equilibrage les met a jour tout seul. C est la raison d etre
   de cette fonction — un role redige a la main aurait menti des le lot suivant.

   L ordre compte : ce qui SEPARE une creature des autres passe devant ce qu elle
   partage. Un pavois est d abord une plaque orientable, un colosse d abord une
   masse. */
const VITESSE_REF = 95, MASSE_REF = 1;
export function roleDe(def) {
  const out = [];
  if (def.splits) out.push(tf("bestiaire.role.divise", "se divise en {n} à sa mort", { n: def.splits }));
  if (def.blastRadius) out.push(t("bestiaire.role.explose", "explose en mourant"));
  if (def.shieldArc) out.push(t("bestiaire.role.plaque", "plaque orientable, vulnérable de dos"));
  if (def.heal) out.push(t("bestiaire.role.soigne", "soigne la horde autour de lui"));
  if (def.egideRadius) out.push(t("bestiaire.role.equipe", "donne une coque à ses voisins"));
  if (def.auraRadius) out.push(t("bestiaire.role.aura", "réduit les dégâts subis autour de lui"));
  if (def.poseCd) out.push(t("bestiaire.role.pose", "pose du sol dangereux à distance"));
  if (def.lienRange) out.push(t("bestiaire.role.lien", "tend un lien mortel avec son pair"));
  if (def.shootCd) out.push(t("bestiaire.role.tire", "tire de loin et garde ses distances"));
  if (def.flanc >= 0.8) out.push(t("bestiaire.role.contourne", "contourne au lieu d'avancer"));
  if (def.recul) out.push(t("bestiaire.role.recule", "recule dès qu'on lui fait face"));

  if (def.speed >= VITESSE_REF * 1.3) out.push(t("bestiaire.role.rapide", "rapide"));
  else if (def.speed <= VITESSE_REF * 0.6) out.push(t("bestiaire.role.lent", "lent"));
  if (def.hpMul >= MASSE_REF * 2) out.push(t("bestiaire.role.robuste", "très résistant"));
  else if (def.hpMul <= MASSE_REF * 0.6) out.push(t("bestiaire.role.fragile", "fragile"));

  /* RIEN A DIRE EST UNE CHOSE A DIRE. Le fantassin ne declenche aucune ligne, et
     ce n est pas un trou : les deux references SONT ses propres chiffres, donc
     il est litteralement l etalon auquel les douze autres se comparent. Une
     fiche vide aurait eu l air d un texte manquant sans en etre un.
     `verifierFiches()` refuse toute creature sans role — ce repli est ce qui
     rend cette exigence tenable. */
  if (out.length === 0) {
    out.push(t("bestiaire.role.etalon", "sans spécialité — la mesure des autres"));
  }
  return out;
}

/* UNE FICHE SANS NOM EST UNE ENTREE VIDE, et rien ne le dirait : l ecran
   afficherait la cle de code a la place, ce qui a l air d un texte manquant sans
   en etre un. Le croisement va dans les DEUX sens — une fiche qu aucun type ne
   tire est du texte a traduire pour rien. */
export function verifierFiches() {
  const soucis = [];
  const cles = new Set(ENEMY_TYPES.map(t => t.key));
  for (const t of ENEMY_TYPES) {
    const f = FICHES[t.key];
    if (!f) { soucis.push(`${t.key} : aucune fiche`); continue; }
    if (!f.nom) soucis.push(`${t.key} : fiche sans nom`);
    if (!f.lore) soucis.push(`${t.key} : fiche sans lore`);
    if (roleDe(t).length === 0) soucis.push(`${t.key} : aucun role deduit de sa fiche de combat`);
  }
  for (const k of Object.keys(FICHES)) {
    if (!cles.has(k)) soucis.push(`${k} : fiche sans creature`);
  }
  const noms = new Map();
  for (const [k, f] of Object.entries(FICHES)) {
    if (noms.has(f.nom)) soucis.push(`${k} et ${noms.get(f.nom)} portent le meme nom`);
    else noms.set(f.nom, k);
  }
  return soucis;
}
