
import {
  CARD_BY_ID, CARD_CFG, CARDS, computeMods, defaultMods, drawCards,
  axesDeCarte, eligibleCards, poolThin, verifierCatalogue, FAMILY_TIERS, POOL_MIN,
} from "./cards.js";
import {
  CLASSES, CLASS_DEFAULT, SKILL_CFG, classAt, bombRange, bombFlight, porteeReticule,
  SKILL_HEAL_MODE, SKILL_TAUNT, SKILL_OVERDRIVE, SKILL_ULT_WIND,
} from "./classes.js";
import {
  STATUSES, STATUS_CFG, STATUS_VULN, STATUS_BURN, STATUS_ROOT, STATUS_DOOM,
  PURGE_ORDER, ELITE_STATUS, statusAt, statusBit, enemyStatusMask,
} from "./statuses.js";
import {
  PROG_CFG, TREES, COMMUN, applyMeta, coresForRun, lockedCards, lockedRelics, slotsFor,
} from "./progression.js";
import { ARME_EXIGENCE, RELICS, RELIC_CFG, RELIC_RARITY, relicById, relicPrice, relicRerollCost } from "./reliques.js";
import { HAUTS_FAITS, HF_CFG } from "./hauts_faits.js";
import {
  ARMES, ARME_BY_ID, ARME_CFG, ARME_DEFAUT, appliquerEchelle, armeAt, cibleArme,
  canonEffet, canonGain, conversionBoss, difficulte, dpsBase, lameRayon, litCadence,
  litCanons, litPerce, litRebond, survieArme, verifierArmes,
} from "./armes.js";

/* L index circule dans l instantane : ARMES est donc APPEND-ONLY, comme
   ENEMY_TYPES ou BOSS_ROSTER. Inserer au milieu reecrirait le sens de tous les
   instantanes en vol. */
const ARME_INDEX = new Map(ARMES.map((a, i) => [a.id, i]));
import { t } from "./i18n.js";
import { CLASS_COLOR } from "./palette.js";
import {
  BOSS_ROSTER, BOSS_CFG, MECHS, bossAt, bossPool, mechAt, adaptMech, towerCount,
  mechsCompatibles,
  WARN_CLASSES, WARN_REFLEXE,
  ALERT_ORDER, ALERT_WARN, ALERT_INFO,
  MECH_STACK, MECH_SPREAD, MECH_TOWER, MECH_COUNT, MECH_LINK, MECH_JAIL,
  MECH_GAZE, MECH_PROX, MECH_MIASMA, MECH_ULT, MECH_CLUSTER, MECH_FEED,
  MECH_EXAFLARE, MECH_BAIT, MECH_DRIFT, MECH_SANCTUARY, MECH_SLIP,
  MECH_QUADRANT, MECH_CROSS, MECH_CONVERGE, MECH_DODGE,
  MECH_SHRINK, MECH_PUDDLE, MECH_SAFE,
  MECH_BREATH, MECH_BROOD, MECH_REVERSE, MECH_SWAP, MECH_ENRAGE,
  MECH_SYNTH, MECH_SEAL, MECH_RELOC,
  BOSS_JUMEAUX, BOSS_ORACLE, BOSS_MATRIARCHE, BOSS_METRONOME, BOSS_RAVAGEUR,
  BOSS_VEILLEUR, BOSS_TISSEUR, BOSS_PRISME, BOSS_RECITANT, BOSS_SILENCE,
  BOSS_FINAL, BOSS_POOL_COUNT, BOSS_POOL, estFinal, finalPour,
} from "./bosses.js";
import {
  TL_CFG, SCRIPTS, EVENTS, beatAt, adaptEntry, adaptEvent, eventAt, verifierScript,
  EV_NUEE, EV_SIEGE, EV_CROISE, EV_CHASSE,
} from "./timeline.js";
import {
  ENEMY_TYPES, TRAITS, TRAIT_CFG, ROLE_CFG, ATK_CFG, adaptType, hasTrait, traitBit,
  trailMax, masseDe, ecartDe, defDe, verifierElites,
  TRAIT_DASH, TRAIT_TRAIL, TRAIT_VOLLEY, TRAIT_FRENZY, TRAIT_SPORE, TRAIT_AURA,
} from "./enemies.js";
import {
  BIOMES, BIOME_CFG, HAZARDS, WEATHERS, buildBiome, hazardState, weatherFor, windAt,
  biomeAt, hazardAt, weatherAt, verifierBiomes,
  HZ_GEYSER, HZ_POOL, HZ_EMBER, HZ_SLOW, HZ_SLIP,
  WX_BRUME, WX_BOURRASQUE, WX_CENDRES,
} from "./biomes.js";
import {
  NAV_CFG, construireNav, diffuser, viser, droitPossible, celluleDe,
  verifierNavigation,
} from "./navigation.js";

export { CARD_CFG };
export { NAV_CFG, construireNav, diffuser, verifierNavigation };
export {
  ENEMY_TYPES, TRAITS, TRAIT_CFG, ROLE_CFG, ATK_CFG, masseDe, defDe, verifierElites,
  adaptType, hasTrait, trailMax,
  TRAIT_DASH, TRAIT_TRAIL, TRAIT_VOLLEY, TRAIT_FRENZY, TRAIT_SPORE, TRAIT_AURA,
};
export { TL_CFG, SCRIPTS, EVENTS, eventAt, verifierScript };
export { EV_NUEE, EV_SIEGE, EV_CROISE, EV_CHASSE };
export {
  BIOMES, BIOME_CFG, HAZARDS, WEATHERS, buildBiome, hazardState, weatherFor, windAt,
  biomeAt, hazardAt, weatherAt, verifierBiomes,
  HZ_GEYSER, HZ_POOL, HZ_EMBER, HZ_SLOW, HZ_SLIP,
  WX_BRUME, WX_BOURRASQUE, WX_CENDRES,
};

const DASH = traitBit(TRAIT_DASH);
const TRAIL = traitBit(TRAIT_TRAIL);
const VOLLEY = traitBit(TRAIT_VOLLEY);
const FRENZY = traitBit(TRAIT_FRENZY);
const SPORE = traitBit(TRAIT_SPORE);
const AURA = traitBit(TRAIT_AURA);
export { CLASSES, CLASS_DEFAULT, SKILL_CFG, classAt };
export { STATUSES, STATUS_CFG, STATUS_VULN, STATUS_BURN, STATUS_ROOT, STATUS_DOOM };
export { BOSS_ROSTER, BOSS_CFG, MECHS, bossAt, mechAt };
export { RELICS, RELIC_CFG, RELIC_RARITY, relicById, relicPrice, relicRerollCost };

const EMPTY_LIST = Object.freeze([]);

// La plus large requete faite a l'index statique. Le plus gros corps du depot
// est le gibier de `chasse` (rayon de type 21, x2,5 de taille, x1,18 s'il est
// elite), soit 62 : la marge tient, et une requete plus large replie sur le
// balayage complet si un jour elle ne tient plus.
const STAT_MARGE = 80;

// LE VOISINAGE 3x3 D'UNE CELLULE NE CHANGE JAMAIS : la geometrie est posee a la
// construction. On ne le parcourt donc pas a la requete, on le CUIT — une liste
// deja dedupliquee et deja triee par cellule, et la requete se reduit a lire une
// plage. Sans ca, neuf cellules etaient balayees et triees pour chaque corps et
// chaque tick, soit 65 % du pas de simulation au profileur.
function indexerStatique(list, cell, cols, rows) {
  const cells = cols * rows;
  const n = list.length;
  const at = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const o = list[i];
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(o.x / cell)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(o.y / cell)));
    at[i] = cy * cols + cx;
  }

  const vstart = new Int32Array(cells + 1);
  const groupes = [];
  for (let c = 0; c < cells; c++) {
    const cx = c % cols, cy = (c - cx) / cols;
    const g = [];
    for (let gy = Math.max(0, cy - 1); gy <= Math.min(rows - 1, cy + 1); gy++) {
      for (let gx = Math.max(0, cx - 1); gx <= Math.min(cols - 1, cx + 1); gx++) {
        const v = gy * cols + gx;
        for (let i = 0; i < n; i++) if (at[i] === v) g.push(i);
      }
    }
    g.sort((a, b) => a - b);
    groupes.push(g);
    vstart[c + 1] = vstart[c] + g.length;
  }
  const vitems = new Int32Array(vstart[cells]);
  let k = 0;
  for (const g of groupes) for (const i of g) vitems[k++] = i;
  return { vstart, vitems };
}

export const CFG = {
  ARENA_W: 4800,
  ARENA_H: 2700,
  VIEW_W: 1600,
  VIEW_H: 900,

  PLAYER_SPEED: 260,
  PLAYER_RADIUS: 14,
  PLAYER_MAX_HP: 100,
  PLAYER_HIT_CD: 0.55,
  // UN ECRAN NE TUE PAS. La simulation est figee pendant les cartes et le
  // marchand, mais l'ennemi au contact garde sa position ET sa recharge : a la
  // reprise il frappe avant que le client n'ait meme redessine l'arene (un
  // instantane, plus 110 ms d'interpolation). Le delai couvre les deux.
  RESUME_GRACE: 0.6,

  DASH_SPEED: 900,
  DASH_TIME: 0.18,
  DASH_CD: 3,
  DASH_CD_MIN: 0.3,

  FIRE_INTERVAL: 0.16,
  FIRE_INTERVAL_MIN: 0.05,
  BULLET_SPEED: 640,
  BULLET_RADIUS: 4,
  BULLET_LIFE: 1.5,
  BULLET_DAMAGE: 12,

  ENEMY_SEPARATION: 0.35,
  PLAYER_SEPARATION: 1,
  PLAYER_BITE: 1,
  ENEMY_AVOID_LOOK: 46,
  ENEMY_AVOID_TURN: 1.4,
  MAX_ENEMIES_BASE: 220,
  MAX_ENEMIES_DIFF: [0.80, 1.00, 1.45],
  MAX_ENEMIES_HARD_CAP: 900,

  ELITE_FROM: 40,
  ELITE_MIN: 22,
  ELITE_MAX: 34,
  ELITE_HP_MUL: 3,
  ELITE_SPEED_MUL: 0.88,
  ELITE_SCORE_MUL: 2.5,
  ELITE_RADIUS_MUL: 1.18,

  ENEMY_HP_BASE: 16,
  ENEMY_HP_MIN_RAMP: 7,
  ENEMY_SPEED_RAMP_PCT: 0.007,

  REVIVE_RADIUS: 96,
  REVIVE_TIME: 1.0,
  REVIVE_HP_RATIO: 0.45,
  REVIVE_DECAY: 0.3,

  LEVEL_MAX: 30,

  LEVEL_XP_BASE: 330,
  LEVEL_XP_GROWTH: 1.10,

  XP_LEVEL_GROWTH: 1.0,
  XP_MINUTE_GROWTH: 1.055,

  BOSS_XP_BASE: 300,

  WAVE_CROWD_EXP: 0.75,
  WAVE_ELITE_CROWD_EXP: 0.75,

  WAVE_HP_POWER_K: 0,
  WAVE_RATE_POWER_K: 0,
  BOSS_POWER_REF: 2.89,
  CROWD_HYSTERESIS: 8,

  SHOT_SPEED: 235,
  SHOT_RADIUS: 6,
  SHOT_DAMAGE: 14,
  SHOT_LIFE: 4,

  HARVEST_MIN: 25,
  HARVEST_MAX: 45,
  HARVEST_MAX_GROUND: 4,
  HARVEST_YIELD_MIN: 8,
  HARVEST_YIELD_MAX: 17,
  HARVEST_CRYSTAL_HP: 60,
  HARVEST_CHANNEL: 1.5,
  HARVEST_RADIUS: 16,
  HARVEST_CHANNEL_RADIUS: 60,
  HARVEST_PLAYER_DIST: 1100,

  POWERUP_MIN: 18,
  POWERUP_MAX: 26,
  POWERUP_LIFE: 22,
  POWERUP_MAX_GROUND: 2,
  POWERUP_RADIUS: 13,
  // le plancher est une PART, pas un poids : un poids fixe garde son sens tant
  // que le total ne bouge pas, or le total monte avec les PV manquants — le
  // ricochet d'une equipe qui ne sait pas le lire tombait alors sous le
  // cinquieme d'une part plate en cauchemar, et nulle part ailleurs
  POWERUP_PART_MIN: 0.040,
  // MESURE : 29 corps medians a deux joueurs, pour un plafond de 370. Normaliser
  // sur le PLAFOND rendait la densite quasi nulle en permanence et la nova
  // tombait trois fois moins qu'une part plate. La reference est la FOULE par
  // joueur vivant, reglee pour que la mediane tombe a mi-echelle.
  POWERUP_FOULE: 28,
  FRAGMENT_MAX_GROUND: 6,
  BUFF_TIME: 14,
  BUFF_DAMAGE_MUL: 1.8,
  BUFF_RATE_MUL: 0.55,
  HEAL_AMOUNT: 45,

  BEACON_HP_RATIO: 0.45,
  BEACON_SHIELD: 45,

  TURRET_LIFE: 20,
  TURRET_RANGE: 350,
  TURRET_CD: 0.35,
  TURRET_RADIUS: 12,

  RICOCHET_RADIUS: 250,
  RICOCHET_MUL: 0.6,
  RICOCHET_MAX: 2,

  SHIELD_POOL: 80,
  SLOW_TIME: 7,
  SLOW_MUL: 0.45,
  PIERCE_HITS: 2,
  NOVA_RADIUS: 430,
  NOVA_DAMAGE: 140,
  NOVA_BOSS_DAMAGE: 220,
  NOVA_PUSH: 95,

  BLAST_KNOCK: 620,
  BLAST_KNOCK_DECAY: 0.0012,
  BLAST_KNOCK_MIN: 8,
  BLAST_HOLE_TIME: 1.1,
  BLAST_HOLE_MUL: 0.8,
  BLAST_HOLE_MAX: 6,

  BOSS_HP_BASE: 520,
  BOSS_RADIUS: 34,
  BOSS_SPEED: 44,
  BOSS_CONTACT_DAMAGE: 30,
  // LE COMBAT MONTE, IL NE COMMENCE PAS A SON REGIME DE CROISIERE. A 3,2 s de
  // depart, `parPhase: 2` posait deja deux mecaniques en 2,2 s des la barre 1.
  // Le rapport barre 1 / barre 5 passe de 1,6 a 1,8.
  BOSS_ATTACK_CD: 4.6,
  BOSS_SUMMON_EVERY: 15,
  SWEEP_STACK_GRACE: 18,
  BOSS_SUMMON_BASE: 4,
  BOSS_ADD_CAP_BASE: 42,
  BOSS_SWEEP_R: 1000,

  BOSS_BARS: 5,
  BOSS_HP_MUL: 2.6,

  SEAL_RADIUS: 120,
  SEAL_HOLD: 4.5,
  SEAL_WARN: 22,
  SEAL_DECAY: 0.5,
  BOSS_GROWTH: 0,
  BOSS_HP_MINUTE_RAMP: 0.055,
  BOSS_POWER_KNEE: 2.5,
  BOSS_POWER_K: 0.50,
  BOSS_PHASE_CD_STEP: 0.11,
  BOSS_PHASE_DAMAGE_STEP: 0.14,
  BOSS_BREAK_RADIUS: 572,

  ZONE_WARN: 1.4,
  ZONE_RADIUS: 74,
  ZONE_DAMAGE: 34,

  ZONE_TICK: 0.25,

  ZONE_FORGIVE: 0.9,

  GRID_COLS: 4,
  GRID_ROWS: 3,
  GRID_WARN: 1.7,
  GRID_GAP: 1.15,
  DONUT_WARN: 1.8,
  DONUT_HOLE: 190,
  DONUT_GAP: 1.5,
  LANE_WARN: 1.6,
  LANE_GAP: 1.25,
  LANE_THICKNESS: 132,
  SWEEP_WARN: 1.5,
  SWEEP_BLADES: 12,
  SWEEP_THICKNESS: 110,
  SWEEP_STAGGER: 0.12,

  SPIRAL_ARMS: 3,
  SPIRAL_SHOTS: 14,
  SPIRAL_STEP: 0.055,
  SPIRAL_TURN: 0.9,

  HUNT_WAVES: 3,
  HUNT_WARN: 1.3,
  HUNT_RADIUS: 96,
  HUNT_STEP: 0.75,
  HUNT_CHASE: 165,

  WALL_WARN: 2.0,
  WALL_THICKNESS: 150,
  WALL_STEPS: 5,
  WALL_STAGGER: 0.5,
  WALL_HOLE: 210,

  TICK: 1 / 60,
  SNAPSHOT_HZ: 20,
};

export const PLAYER_COLORS = [
  CLASS_COLOR.tank,
  CLASS_COLOR.soigneur,
  CLASS_COLOR.dps,
  CLASS_COLOR.dps2,
];

/* D'OU VIENT UN SOL PERSISTANT. Trois emetteurs passent par `_groundZone`, et
   ils ne partagent ni budget ni lecture — mais ils partagent le fait de n'etre
   PAS un telegraphe de boss, et c'est cela que la logique d'abri lit. */
export const SOL_HORDE = 1, SOL_JOUEUR = 2, SOL_BOSS = 3;

export const SRC_CONTACT = 0;
export const SRC_SHOT = 1;
export const SRC_ZONE = 2;
export const SRC_MECH = 3;
export const SRC_BURN = 4;
export const SRC_BLAST = 5;
export const SRC_ENV = 6;

const PARTAGEABLES = new Set([
  "heal", "damage", "rate", "double", "pierce", "ricochet", "shield", "fragment",
]);

export const DAMAGE_SOURCES = [
  { key: "contact",    label: "contact" },
  { key: "projectile", label: "projectile" },
  { key: "zone",       label: "zone au sol" },
  { key: "mech",       label: "mécanique" },
  { key: "burn",       label: "brûlure" },
  { key: "blast",      label: "explosion" },
  { key: "env",        label: "environnement" },
];

/* Points de passage du texte de difficulte et de provenance d'un degat. */
export const srcLabel = i => t(`src.${DAMAGE_SOURCES[i]?.key}`, DAMAGE_SOURCES[i]?.label ?? "");
export const diffLabel = i => t(`diff.${DIFFICULTIES[i]?.key}.label`, DIFFICULTIES[i]?.label ?? "");
export const diffResume = i => (DIFFICULTIES[i]?.resume ?? [])
  .map((r, k) => t(`diff.${DIFFICULTIES[i].key}.resume.${k}`, r));

const MECH_HURT = { ignoreCooldown: true, mech: true, src: SRC_MECH };

// CE QU'UNE ENTREE DE REPERTOIRE POSE — miroir du repartiteur `_atk()`. `ATK_POSE`
// donne la mecanique annoncee, `ATK_SOL` dit si l'entree SATURE le sol. Les deux
// ne servent qu'a `_pickAtk` : ne pas tirer ce que le verrou refusera. Une entree
// absente de `ATK_POSE` n'annonce aucun ordre positionnel.
const ATK_POSE = {
  rassemblement: MECH_STACK, synthese: MECH_STACK, dispersion: MECH_SPREAD,
  tours: MECH_TOWER, denombrement: MECH_COUNT, sceau: MECH_SEAL,
  lien: MECH_LINK, prison: MECH_JAIL,
  grappes: MECH_CLUSTER, noeuds: MECH_CLUSTER,
  regard: MECH_GAZE, regarddouble: MECH_GAZE, regardmobile: MECH_GAZE,
  regardpermanent: MECH_GAZE,
  copies: MECH_BAIT, copiesrenvoi: MECH_BAIT, copiesliees: MECH_BAIT,
  copiesvraie: MECH_BAIT, appat: MECH_BAIT,
  sanctuaire: MECH_SANCTUARY,
};
// LA CONSTRICTION RESTE SOUS LE VERROU, ET CE N'EST PAS UN OUBLI. Elle ne pose
// aucune zone, donc l'en sortir semblait gratuit (elle bloquait un tirage de sol
// sur cinq en cauchemar solo) — mais elle RESSERRE `state.bounds`, et un motif
// deja pose garde alors une geometrie calculee sur les anciennes bornes : un abri
// se retrouve sous le feu. `verifierMecaniques` le voit (0 -> 6 images en
// cauchemar), et un abri sous le feu a l'echeance est exactement ce que le lot
// 0.13.13 interdit.
const ATK_SOL = new Set(["damier", "couronne", "couloirs", "balayage", "mur",
  "pacman", "quadrant", "constriction", "entrelacs", "synthesedouble"]);

const SKILL3_TABLE = {
  tank: "SKILL3_ANCRE", soigneur: "SKILL3_SANCTUAIRE", dps: "SKILL3_SALVE",
};

export const DIFFICULTIES = [
  {
    key: "calme", label: "calme",
    script: "calme",
    roster: [0, 1, 2, 3, 4],
    traits: {},
    resume: [
      "les cinq types d'origine, rien de plus",
      "aucun comportement particulier : ils avancent et ils frappent",
      "la horde arrive d'un seul côté — le sol ne fait jamais rien",
    ],
    hp: 0.78, spawn: 0.80, dmg: 0.80, boss: 0.75, speed: 0.85,
    bossProfil: {
      parPhase: 1, warn: 1, mechRatio: 0.60, echec: "individuel",
      couches: 3, palier: 1.0, renforts: 0, reflexe: -1,
    },
  },
  {
    key: "normal", label: "normal",
    script: "normal",
    roster: [0, 1, 2, 3, 4, 5, 6, 9],
    traits: {
      grunt: DASH,
      runner: FRENZY,
      tank: AURA,
      shooter: VOLLEY,
      brood: SPORE,
      kamikaze: FRENZY,
      harceleur: FRENZY,
    },
    resume: [
      "kamikaze, porte-bouclier et harceleur : il faut choisir sa cible et son angle",
      "les grunts chargent, les tireurs envoient des salves de trois",
      "pinces et quatre fronts sur les crescendos — le sol ne blesse pas",
    ],
    hp: 1.00, spawn: 1.00, dmg: 1.00, boss: 1.00, speed: 1.00,
    bossProfil: {
      parPhase: 2, warn: 0, mechRatio: 0.90, echec: "mixte",
      couches: 99, palier: 1.4, renforts: 0, reflexe: -1,
    },
  },
  {
    key: "cauchemar", label: "cauchemar",
    script: "cauchemar",
    roster: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    traits: {
      grunt: DASH | TRAIL,
      runner: DASH | FRENZY,
      tank: AURA | TRAIL,
      shooter: VOLLEY,
      brood: SPORE | FRENZY,
      kamikaze: FRENZY | TRAIL,
      bulwark: AURA,
      medic: FRENZY,
      // LES QUATRE ARCHETYPES N'AVAIENT AUCUN TRAIT, DANS AUCUN MODE : ils
      // etaient entres au lot 4 et au lot 5 en portant leur seul verbe, donc
      // cauchemar ne les durcissait pas du tout. C'est la place que le residu
      // chiffre occupait a leur place.
      harceleur: DASH | FRENZY,
      generateur: AURA,
      saboteur: TRAIL,
      relais: FRENZY,
    },
    resume: [
      "les treize types : soigneurs, chœurs, générateurs et relais compris",
      "un paquet couvert est un mur, et deux relais tendent un arc entre eux",
      "plusieurs directions en permanence : le sol se referme derrière eux",
    ],
    /* `hp` A ETE COUPE DE 1,35 A 1,10, ET LA MESURE A DIT POURQUOI : a la
       population plafond, des PV en plus ne retiennent PERSONNE — ils
       n'epaississent que les corps. Passer de 1,35 a 1,10 laisse la pression a
       quatre joueurs a 1 447 degats/min contre 1 477 (moins de 2 % d'ecart),
       tout en rendant 22 % de debit de mise a mort et 17 % de PV moyen. Ce
       residu-la ne portait pas la difficulte, il portait l'eponge que la
       consigne du plan refuse.
       CE QUI PORTE VRAIMENT CAUCHEMAR : treize types contre huit et cinq, et
       douze attachements de trait contre six et zero. `spawn` est INERTE au
       plafond (1,28 -> 1,45 : aucun effet mesurable) et ne compte qu'avant la
       saturation ; `dmg` reste le seul levier chiffre qui deplace la pression,
       et on n'y touche pas. */
    hp: 1.10, spawn: 1.28, dmg: 1.25, boss: 1.25, speed: 1.12,
    /* CAUCHEMAR SE DURCIT PAR CE QUE COUTE UNE CONSIGNE RATEE : `mechRatio` EST
       l'ecart entre lire les annonces et les ignorer, la seule mesure qui juge
       une mecanique de boss (mesure : +7 % de PV perdus par un bot qui ignore
       tout, en solo, a graines et durees appariees).
       TROIS LEVIERS ESSAYES ET REFUSES PAR LA MESURE. `parPhase` 3 + `reflexe` 3
       fait BAISSER ce que perd ce meme bot (31,7 -> 17,1 PV/min) : plus de
       mecaniques simultanees, c'est plus de refus de coexistence, donc moins de
       sol. Une cadence a 0,80 donne +13 % a deux mais -26 % en solo. Et
       `warn: -1` — le vrai levier du mode, qui est encore a ZERO, donc a la meme
       classe de telegraphe qu'en normal — casse l'invariant du safe spot :
       `ABRI_RETOUR` vaut 1,2 s en dur alors que le telegraphe descendrait a
       0,8 s, donc une zone ne peut plus « se resoudre avant l'echeance » et
       `verifierMecaniques` compte des abris sous le feu. Le rendre PROPORTIONNEL
       a la classe de telegraphe est le prealable, et c'est un lot a part. */
    bossProfil: {
      parPhase: 2, warn: 0, mechRatio: 1.40, echec: "collectif",
      couches: 99, palier: 1.8, renforts: 1, reflexe: 4, superpose: 1,
    },
  },
];
export const DIFF_NORMAL = 1;

const TRAIT_BY_TYPE = DIFFICULTIES.map(d => {
  const row = new Array(ENEMY_TYPES.length).fill(0);
  for (const [key, mask] of Object.entries(d.traits)) {
    const i = ENEMY_TYPES.findIndex(t => t.key === key);
    if (i >= 0) row[i] = mask;
  }
  return row;
});

export function typesFor(diffIndex) {
  return (DIFFICULTIES[diffIndex] ?? DIFFICULTIES[DIFF_NORMAL]).roster;
}

export function traitsOf(diffIndex, type) {
  return TRAIT_BY_TYPE[diffIndex]?.[type] ?? 0;
}

export function enemySpeed(typeIndex, minute, diffIndex, roll = 1, elite = false) {
  const t = ENEMY_TYPES[typeIndex];
  if (!t) return 0;
  return t.speed * roll
    * (1 + minute * CFG.ENEMY_SPEED_RAMP_PCT)
    * (DIFFICULTIES[diffIndex]?.speed ?? 1)
    * (elite ? CFG.ELITE_SPEED_MUL : 1);
}

export function enemyCap(diffIndex, joueurs) {
  const d = CFG.MAX_ENEMIES_DIFF[diffIndex] ?? 1;
  const crowd = Math.pow(Math.max(1, joueurs), CFG.WAVE_CROWD_EXP);
  return Math.min(CFG.MAX_ENEMIES_HARD_CAP,
    Math.round(CFG.MAX_ENEMIES_BASE * d * crowd));
}

export const POWERUP_TYPES = [
  "heal", "damage", "rate", "double", "shield", "slow", "pierce", "nova",
  "beacon", "turret", "ricochet",
  "fragment",
  "purification",
];

/* CE QUI TOMBE. Quatre types de `POWERUP_TYPES` n'y figuraient pas depuis le
   premier commit — `damage`, `rate`, `double`, `pierce` — et les trois autres
   points d'apparition passent tous par `_randomPowerupType()` : leur effet, leur
   pastille de HUD et leur insigne sur le joueur etaient du code mort que rien ne
   signalait. `fragment` et `purification` restent hors rotation : chacun a sa
   propre source. `verifierBonus()` refuse un type sans source. */
export const POWERUP_ROTATION = [
  "heal", "damage", "rate", "double", "shield", "slow", "pierce", "nova",
  "beacon", "turret", "ricochet",
].map(k => POWERUP_TYPES.indexOf(k));

/* QUAND CHAQUE BONUS VAUT QUELQUE CHOSE. Un tirage plat fait tomber un soin sur
   une equipe a PV pleins, une nova sur un ecran vide et une perforation sur un
   faisceau qui traverse deja tout : la pastille est ramassee, elle ne rend rien,
   et le joueur apprend a ne plus se detourner. Le poids est donc une FONCTION de
   l'etat, jamais un interdit — le plancher `CFG.POWERUP_PART_MIN` garde tous
   les types tirables, y compris celui qui ne sert pas maintenant.

   Les termes se lisent : une constante = ce que le type vaut toujours, un terme
   en `c.x` = ce qu'il vaut EN PLUS quand la situation le demande. Rien ici ne
   depend de la difficulte : compenser un mode par des recompenses est le defaut
   que ce plan refuse. */
/* LES TROIS BONUS DE SURVIE GARDENT LEUR CADENCE ABSOLUE. La rotation d'avant
   n'avait que sept types dont TROIS de survie — `heal`, `shield`, `beacon` —
   soit 43 % des chutes ; a onze types et poids egaux ils tombaient a 29 %, et la
   MESURE l'a dit sans ambiguite : 708 s de survie mediane contre 1 044 s. Rendre
   quatre bonus a la rotation ne doit RIEN retirer de soin a l'equipe : leurs
   poids montent d'autant. C'est le MIX qui change, pas la cadence. */
const POWERUP_POIDS = {
  heal:     c => 1.70 + 2.00 * c.manque,
  damage:   c => 0.80 + 0.55 * c.densite + 0.55 * c.boss,
  rate:     c => 0.35 + 0.95 * c.cadence,
  double:   c => 0.35 + 0.95 * c.canons,
  // le SOIN porte la survie, le bouclier l'accompagne : a base egale le
  // bouclier passait devant des que l'equipe etait intacte, et il sortait de la
  // bande a un et deux joueurs. La SOMME des trois ne bouge pas.
  shield:   c => 1.35 + 1.40 * c.manque + 0.60 * c.boss,
  slow:     c => 0.35 + 1.10 * c.densite,
  // 0,25 tombait SOUS le plancher du critere pour une equipe solo dont l'arme
  // ne lit ni l'un ni l'autre : rare est voulu, invisible ne l'est pas
  pierce:   c => 0.35 + c.perce * (0.55 + 0.85 * c.densite),
  nova:     c => 0.30 + 1.20 * c.densite,
  // relever demande quelqu'un pour relever : seul, un joueur a terre est la fin
  // de la manche, pas une situation
  beacon:   c => (c.aTerre > 0 && c.vivants > 0) ? 3.60 : 1.55,
  turret:   c => 0.60 + 0.85 * c.boss + 0.55 * c.densite,
  ricochet: c => 0.35 + c.rebond * (0.55 + 0.85 * c.densite),
};

// un tirage se fait une fois toutes les vingt secondes : le tableau de poids est
// tenu au module plutot que rebati, par principe et non par mesure
const POIDS = [];

export const TYPE_FRAGMENT = POWERUP_TYPES.indexOf("fragment");

export const BUFF_DAMAGE = 1;
export const BUFF_RATE = 2;
export const BUFF_DOUBLE = 4;
/* La SILHOUETTE d'une balle voyage dans le champ que le missile ouvrait deja :
   1 le missile, 2 le porteur qui va se scinder. Aucune clef en plus. */
export const SIL_MISSILE = 1;
export const SIL_PORTEUR = 2;
export const BUFF_PIERCE = 8;
export const BUFF_RICOCHET = 16;


export function effectiveCards(cards, others = []) {
  let fusion = null;
  for (const o of others) {
    if (o === cards || !((o.get("voeu_partage") ?? 0) > 0)) continue;
    for (const [id, n] of o) {
      if (id === "voeu_partage" || n <= 0) continue;
      const c = CARD_BY_ID.get(id);
      if (!c || !c.tags.includes("coop")) continue;
      fusion ??= new Map(cards);
      fusion.set(id, Math.max(fusion.get(id) ?? 0, n));
    }
  }
  return fusion ?? cards;
}

export function fullMods(cards, others, cls, level = 1, arme = ARME_DEFAUT) {
  const mods = computeMods(effectiveCards(cards, others));
  /* L'echelle d'arme s'applique AVANT la classe et la meta : une arme change ce
     qu'une CARTE lui rapporte, pas ce que la classe vaut. */
  appliquerEchelle(mods, arme);
  mods.critChance = Math.min(CARD_CFG.CRIT_CHANCE_CAP, mods.critChance);
  mods.fireIntervalMul = Math.max(
    mods.noOverheat ? CARD_CFG.FIRE_INTERVAL_HARD_FLOOR : CARD_CFG.FIRE_INTERVAL_FLOOR,
    mods.fireIntervalMul);
  mods.weapon = arme === ARME_DEFAUT ? null : arme;

  if (mods.damagePerLevel > 0) {
    mods.damageMul += mods.damagePerLevel * Math.max(0, level - 1);
  }

  const def = classAt(cls);
  mods.damageMul *= def.damageMul;
  mods.speedMul *= def.speedMul;

  let maxHp = (def.hp + mods.maxHpBonus) * (1 + mods.maxHpRatio);

  const baseDamageMul = mods.damageMul;
  const baseHp = maxHp;
  if (mods.hpToDamage > 0) {
    mods.damageMul += mods.hpToDamage * (baseHp / CARD_CFG.CONVERT_HP_REF);
  }
  if (mods.damageToHp > 0) {
    maxHp += mods.damageToHp * baseDamageMul * CARD_CFG.CONVERT_DMG_REF;
  }
  if (mods.shieldToDamage > 0 && mods.shieldPool > 0) {
    mods.damageMul += CARD_CFG.PACTE_STEP * (mods.shieldPool / CARD_CFG.PACTE_PER);
  }

  // le plafond ne se pose PAS ici : trois sources ajoutent des PV apres
  // (`applyMeta`, les reliques), et un plafond au milieu de la chaine se
  // contourne par tout ce qu'on branche derriere. Voir `plafonnerHp`.
  return { mods, maxHp: Math.round(maxHp) };
}

/* LE plafond de PV, et il est le DERNIER. Point de passage unique : toute
   source de PV ajoutee plus tard passe devant lui au lieu de le contourner. */
export function plafonnerHp(maxHp, mods) {
  return mods.hpCap > 0 ? Math.min(maxHp, mods.hpCap) : maxHp;
}

/* TOUS LES COMPTEURS DE HAUT FAIT SONT PERSONNELS. Un compteur d'equipe serait
   atteint quatre fois plus vite a quatre joueurs : trivial en groupe, penible en
   solo. Ils vivent donc sur le JOUEUR, dans un bloc a part pour que la remise a
   zero d'une manche soit une seule affectation.
   Les deux fenetres glissantes sont des anneaux d'une case par seconde, avec
   leur somme tenue a jour : un rythme ne depend ni de la duree de la manche, ni
   de l'effectif, ni de la difficulte, la ou un total brut depend des trois. */
export function hfCompteurs() {
  return {
    sec: 0,
    still: 0, basPv: 0, sain: 0, sainMax: 0,
    near: 0, far: 0, blast: 0, tirs: 0, percee: 0,
    critFen: new Array(HF_CFG.FENETRE_CRIT).fill(0), critSom: 0, critBest: 0,
    killFen: new Array(HF_CFG.FENETRE_KILL).fill(0), killSom: 0, killBest: 0,
    killTot: 0, tirsAuKill: new Array(HF_CFG.ECONOMIE_KILLS).fill(0), tirsPourCent: 0,
    harvests: 0, revives: 0, relics: 0,
    cartes: 0, rarete: -1, familleMax: 0,
    armes: new Set(),
    segSain: 1, segmentsSains: 0,
    bossUlt0: 0, bossDegat: 0,
    bossSansUlt: 0, bossSansDegat: 0, bossVite: 0,

    /* CE QUE L'ARME DELIVRE, et non ce que la build delivre. Un DPS nominal ne
       voit ni les cibles reellement touchees, ni le temps ou l'arme peut tirer,
       ni la part des tirs qui portent — c'est pour ca qu'il ne remontait aucune
       anomalie pendant que le tesla dominait. `armeMuet` ne compte QUE le refus
       pour cause de ressource : un temps mort volontaire mesurerait le style du
       pilote, pas l'arme. */
    armeTemps: 0, armeMuet: 0, armeCibles: 0, armeDegats: 0,
  };
}

export function powerIndex(m, flat = 0, arme = ARME_DEFAUT) {
  const a = armeAt(arme);
  // meme decoupe que `_volley` : ce que le canon en plus ajoute depend de l'arme,
  // sa penalite se paie la ou il compte, la salve arriere ne paie rien
  const canons = canonEffet(a)
    ? canonGain(a, m.extraBarrels) * m.barrelDamageMul : 1;
  let barrels = canons + (m.backShot ? 0.7 : 0);
  if (m.inertia && a.ech.perforation > 0) barrels *= 1.9;
  const catalyseur = 1 + m.catalyseur * 0.5;
  const crit = 1 + m.critChance * (m.critMul - 1);
  const flatMul = 1 + flat / a.degats;
  // ce que l'arme rend contre une CIBLE UNIQUE, conversion comprise : c'est le
  // contexte sur lequel les boss sont calibres
  const armeMul = dpsBase(a) * conversionBoss(a) / (CFG.BULLET_DAMAGE / CFG.FIRE_INTERVAL);
  return m.damageMul * barrels * armeMul * catalyseur * crit
    * (1 + m.echoChance) / m.fireIntervalMul * flatMul;
}

/* Indice d'un chargement NU : le denominateur de `_summonMul`, releve une fois
   au chargement du module au lieu d'etre recopie. */
const SUMMON_REF = powerIndex(defaultMods());

export function bossPower(power) {
  if (power <= CFG.BOSS_POWER_KNEE) return power;
  return CFG.BOSS_POWER_KNEE + CFG.BOSS_POWER_K * (power - CFG.BOSS_POWER_KNEE);
}

export class GameState {
  constructor(difficulty = DIFF_NORMAL, biomeIndex = null, seed = null) {
    this.diffIndex = Math.min(Math.max(difficulty | 0, 0), DIFFICULTIES.length - 1);
    this.diff = DIFFICULTIES[this.diffIndex];

    this.biomeIndex = biomeIndex === null
      ? Math.floor(Math.random() * BIOMES.length)
      : Math.min(Math.max(biomeIndex | 0, 0), BIOMES.length - 1);
    this.seed = (seed === null ? Math.floor(Math.random() * 0x7fffffff) : seed | 0) >>> 0;
    this.biome = buildBiome(this.biomeIndex, this.diffIndex, this.seed,
      CFG.ARENA_W, CFG.ARENA_H, CFG.VIEW_W, CFG.VIEW_H);
    this._biomeObstacles = this.biome.obstacles;
    this._biomeHazards = this.biome.hazards;
    this._statG = null;
    this._navG = null;
    this._navChamps = new Map();
    this._navVise = { x: 0, y: 0 };
    this._isoK = new Map();
    this._egide = false;
    this._liens = [];
    this._groundOut = { slow: 1, slip: false };
    this.mechStats = new Map();
    this.hazardTick = 0;
    this.weather = null;

    this.players = new Map();
    this.enemies = [];
    this.bullets = [];
    this.shots = [];
    this.zones = [];
    this.powerups = [];
    this.turrets = [];
    this.drones = [];
    this.bulwarks = [];
    this.bombs = [];
    this.anchors = [];
    this.sancts = [];
    this.effects = [];
    this.blastHoles = [];
    this.windup = [];
    this.windupBudget = new Map();
    this.event = null;
    this.quarry = 0;

    this.taunt = null;
    this.slow = 0;
    this.slipT = 0;
    this.repriseGrace = 0;
    this.boss = null;

    this.bounds = { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H };
    this.shrink = null;
    this.walls = null;
    this.puddleSeen = false;

    this.harvests = [];
    this._chaineProf = 0;
    // le joueur dont l'ARME est en train de frapper ; 0 sinon
    this._armeDe = 0;
    this.harvestCd = CFG.HARVEST_MIN
      + Math.random() * (CFG.HARVEST_MAX - CFG.HARVEST_MIN);

    this.bossSeen = [];
    this.bossPrecedents = [];
    this.boss2 = null;
    this.lastBossKind = 0;
    this.bossKills = 0;
    this.barsBroken = 0;
    this.bossKindsKilled = new Set();
    this.finalKill = 0;

    this.marks = [];

    this.alerts = [];

    this.bossDmg = new Map();
    this.lastCrit = false;

    this.cardsPending = false;
    this.cardOffers = new Map();
    this.cardsQuality = 1;
    this.legendaryLevelDone = new Set();
    this._poolSeen = new Set();

    this.relicPending = false;
    this.relicOffers = new Map();
    this.relicLegendaryTaken = false;
    this.relicBossDue = false;

    this.finalDone = false;

    this.time = 0;
    this.spawnAcc = 0;
    this.powerupCd = 8;
    this.eliteCd = CFG.ELITE_FROM;
    this.bossCount = 0;
    this.totalKills = 0;
    this.gameOver = false;
    this._nextId = 1;

    this.warmup = 0;

    this.segment = 1;
    this.hordeTime = 0;
    this.beat = 0;
    this.weather = weatherFor(this.diffIndex, this.seed, 1);
    this.beatSide = 0;
    this.packLeft = 0;
    this.packSide = 0;
    this.bossPending = false;
    this._beatCache = null;
    this._crowdHeld = 1;
    this._crowdAt = 0;
    this.victory = false;

    this.xp = 0;
    this.level = 1;
    this.levelFrom = 0;
    this.levelStep = CFG.LEVEL_XP_BASE;
    this.levelAt = CFG.LEVEL_XP_BASE;
    this.pendingLevels = 0;

    this._startBeat();
  }

  addPlayer(id, name = "joueur", colorIndex = 0, cls = CLASS_DEFAULT, meta = null) {
    const def = classAt(cls);
    const at = this._teamCentroid();
    const p = {
      id, name, colorIndex,
      cls: CLASSES[cls] ? cls : CLASS_DEFAULT,
      x: at.x + (Math.random() - 0.5) * 140,
      y: at.y + (Math.random() - 0.5) * 140,
      hp: def.hp,
      maxHp: def.hp,
      downed: false,
      revive: 0,
      fireCd: 0,
      fireInterval: CFG.FIRE_INTERVAL,
      hitCd: 0,
      dashCd: 0,
      dashT: 0,
      dashX: 0,
      dashY: 0,
      dashHits: new Set(),
      kills: 0,
      deaths: 0,
      score: 0,
      hf: hfCompteurs(),
      arme: ARME_DEFAUT,
      armeRes: 0,
      armeMun: 0,
      armeRech: 0,
      precVus: new Map(),
      armeAng: 0,
      armeMuet: 0,
      armeT: 0,
      armeTouche: 0,
      frostR: 0,
      lameMarques: new Map(),
      aimX: 1,
      aimY: 0,
      aimR: Infinity,
      buffDamage: 0,
      buffRate: 0,
      buffDouble: 0,
      buffPierce: 0,
      buffRicochet: 0,
      shield: 0,

      cards: new Map(),
      mods: defaultMods(),
      timers: {
        shieldRegen: 0,
        counter: 0,
        pulsar: 0,
        turret: 0,
        guardian: 0,
        instinct: 0,
        zoneImmune: 0,
        frenzy: 0,
        lifesteal: 0,
        lifestealSec: 0,
        relicPurge: 0,
      },
      statuses: new Map(),
      // les liens vivent A COTE de `mods`, comme les minuteurs et les etats :
      // un recalcul de chargement ne doit pas les effacer.
      links: [],
      purges: 0,

      frenzyStacks: 0,

      power: 1,
      elanT: 0,
      rageStacks: 0,
      rageT: 0,
      pacteUsed: 0,
      relicBatteryUsed: 0,
      relicBought: 0,
      relicRerolls: 0,
      relicMemoireUsed: 0,

      selfReviveUsed: 0,
      commonStreak: 0,
      damageDealt: 0,
      healDealt: 0,
      critKills: 0,
      eclats: 0,
      relics: new Map(),

      rally: 1,
      dashCrits: 0,
      dashShot: 0,
      dashSeen: 0,
      oathT: 0,
      oathMul: 0,
      cd1: 0,
      cd2: 0,
      cd3: 0,
      bombStock: 1,
      healMode: 0,
      healSwapCd: 0,
      healSwapBoost: 0,
      tauntT: 0,
      tauntInvuln: 0,
      odT: 0,
      odBonus: 0,
      skillUses: [0, 0, 0],
      ultT: 0,

      jailed: 0,
      vx: 0, vy: 0,
      gazeCd: 0,
      gazeSafe: 0,
      twinCd: 0,
      trail: [],
      mechFails: 0,

      lastSrc: SRC_CONTACT,
      hurtBy: DAMAGE_SOURCES.map(() => 0),

      meta,
      locked: meta && meta.locked
        ? (meta.locked instanceof Set ? meta.locked : new Set(meta.locked))
        : null,
      lockedRelics: meta && meta.lockedRelics
        ? (meta.lockedRelics instanceof Set ? meta.lockedRelics : new Set(meta.lockedRelics))
        : null,
      catalyseT: 0,
      catalyseMul: 1,
    };

    this.players.set(id, p);
    this._recomputeMods(p);
    p.hp = p.maxHp;

    if (meta && meta.confort && meta.confort.ravitaillement) {
      const a = Math.random() * Math.PI * 2;
      const at2 = this._dropPoint(p.x + Math.cos(a) * 120, p.y + Math.sin(a) * 120, 60);
      this._poserBonus(this._randomPowerupType(), at2.x, at2.y);
    }
  }


  drawQuality(onBossWave = false) {
    return Math.floor(this.level / CARD_CFG.QUALITY_PER_LEVEL)
      + (onBossWave ? CARD_CFG.BOSS_QUALITY : 0) + 1;
  }

  _cardCtx() {
    const teamOwned = new Set();
    for (const o of this.players.values()) {
      for (const [id, n] of o.cards) if (n > 0) teamOwned.add(id);
    }
    const systems = new Set();
    if (this.hazards.length > 0) systems.add("hasards_actifs");
    return { players: this.players.size, teamOwned, systems };
  }

  offerCards(p, quality = this.cardsQuality, forceRare = false, jalon = 0) {
    /* LE CONTEXTE D'EQUIPE NE CONNAIT PAS LE PORTEUR, et l'arme est PAR JOUEUR.
       Sans elle, `eligibleCards` lisait le tir standard pour tout le monde : la
       famille de l'arme portee etait retiree du pool au lieu d'y etre garantie,
       le filtre a coefficient nul ne s'appliquait a personne, et « Second canon »
       etait offert a des armes qui ne le lisaient pas. */
    const ctx = { ...this._cardCtx(), arme: p.arme };
    const picks = drawCards(p.cards, quality, forceRare || p.commonStreak >= 2,
      classAt(p.cls).id, Math.random, jalon, this.level,
      { locked: p.locked, count: p.meta?.confort?.quatrieme ? 4 : 3, ctx });
    this._poolWarn(p, ctx);
    return picks.map(c => c.id);
  }

  // quatre filtres qui se cumulent peuvent vider une rarete : on le journalise une
  // fois par rarete et par manche, sinon c'est a chaque niveau
  _poolWarn(p, ctx) {
    const maigres = poolThin(
      eligibleCards(p.cards, classAt(p.cls).id, this.level, p.locked, ctx));
    for (const { rarity, n } of maigres) {
      if (this._poolSeen.has(rarity)) continue;
      this._poolSeen.add(rarity);
      console.warn(`[cartes] rarete ${rarity} : ${n} cartes eligibles`
        + ` sous le seuil de ${POOL_MIN}`);
    }
  }

  takeCard(p, id) {
    const card = CARD_BY_ID.get(id);
    if (!card) return false;
    const had = p.cards.get(id) || 0;
    if (had >= card.max) return false;

    p.cards.set(id, had + 1);
    if (!card.fallback) {
      p.commonStreak = card.rarity === 0 ? p.commonStreak + 1 : 0;
      p.hf.cartes++;
      if (card.rarity > p.hf.rarete) p.hf.rarete = card.rarity;
      if (card.family && card.tier === FAMILY_TIERS - 1) p.hf.familleMax = 1;
    }
    if (this._hasSharedSupport()) this._recomputeAll();
    else this._recomputeMods(p);

    if (card.id === "ravitaillement") {
      if (!p.downed) p.hp = p.maxHp;
      p.score += Math.round(CARD_CFG.RAVITAILLEMENT_SCORE * p.mods.scoreMul);
    }
    return true;
  }

  _otherCards(p) {
    const out = [];
    for (const o of this.players.values()) if (o !== p) out.push(o.cards);
    return out;
  }

  _hasSharedSupport() {
    for (const o of this.players.values()) {
      if ((o.cards.get("voeu_partage") ?? 0) > 0) return true;
    }
    return false;
  }

  _recomputeAll() {
    for (const o of this.players.values()) this._recomputeMods(o);
  }

  _recomputeMods(p) {
    const before = p.maxHp;
    const r = fullMods(p.cards, this._otherCards(p), p.cls, this.level, p.arme);
    p.powerMods = r.mods;
    if (p.meta && (p.meta.lines || p.meta.commun)) {
      const rr = applyMeta(r.mods, r.maxHp, classAt(p.cls).id,
        p.meta.lines, p.meta.commun);
      p.mods = rr.mods;
      p.maxHp = rr.maxHp;
    } else {
      p.mods = r.mods;
      p.maxHp = r.maxHp;
    }

    // le bouclier passe par `mods` et non par un point d'application : la
    // regeneration teste `mods.shieldPool > 0` et le plafond de bonus s'y indexe
    p.mods.shieldPool += this._relicSum(p, "shieldFlat");

    const flat = this._relicSum(p, "flatHp") + this._relicAllySum(p, "allyFlatHp");
    if (flat !== 0) p.maxHp = Math.max(1, p.maxHp + flat);
    p.maxHp = plafonnerHp(p.maxHp, p.mods);

    const gained = p.maxHp - before;
    if (gained > 0 && !p.downed) p.hp = Math.min(p.maxHp, p.hp + gained);
    p.hp = Math.min(p.hp, p.maxHp);
    p.hf?.armes.add(p.mods.weapon ?? "base");
  }

  /* Ce que la manche a produit pour UN joueur, dans la forme que
     `evaluerHautsFaits` attend. Point de passage unique : le hub y ajoute les
     cumuls du profil et n'a rien a savoir de la simulation. */
  hfStatsDeManche(p, opts = {}) {
    const hf = p.hf;
    return {
      diff: this.diffIndex,
      joueurs: this.players.size,
      clsId: classAt(p.cls).id,
      finie: !!opts.finie,
      complete: !!this.victory,
      chutes: p.deaths,
      niveau: this.level,
      kills: p.kills,
      stillMax: hf.still,
      basPvMax: hf.basPv,
      sainMax: hf.sainMax,
      killsNearRun: hf.near,
      killsFarRun: hf.far,
      killsBlastRun: hf.blast,
      percee: hf.percee,
      critBest: hf.critBest,
      killBest: hf.killBest,
      tirsPourCent: hf.tirsPourCent,
      harvestsRun: hf.harvests,
      revivesRun: hf.revives,
      relicsRun: hf.relics,
      skillUsesRun: hf.skillUsesRun ?? (p.skillUses[0] + p.skillUses[1] + p.skillUses[2]),
      cartesMax: hf.cartes,
      rareteMax: hf.rarete,
      familleMax: !!hf.familleMax,
      armes: hf.armes.size,
      segmentsSains: hf.segmentsSains,
      bossSansUlt: !!hf.bossSansUlt,
      bossSansDegat: !!hf.bossSansDegat,
      bossVite: hf.bossVite,
      bossKindsRun: [...this.bossKindsKilled],
    };
  }

  removePlayer(id) {
    const partage = this._hasSharedSupport();
    this.players.delete(id);
    this._navChamps.delete(id);
    if (partage) this._recomputeAll();
  }

  aliveCount() {
    let n = 0;
    for (const p of this.players.values()) if (!p.downed) n++;
    return n;
  }

  aliveCrowd() {
    const n = Math.max(1, this.aliveCount());
    if (n >= this._crowdHeld) {
      this._crowdHeld = n;
      this._crowdAt = this.time;
    } else if (this.time - this._crowdAt >= CFG.CROWD_HYSTERESIS) {
      this._crowdHeld = n;
      this._crowdAt = this.time;
    }
    return this._crowdHeld;
  }

  step(dt, inputs) {
    if (this.gameOver) return;

    const echauffement = this.warmup > 0;
    if (echauffement) this.warmup = Math.max(0, this.warmup - dt);
    else this.time += dt;

    this.slow = Math.max(0, this.slow - dt);
    this.slipT = Math.max(0, this.slipT - dt);
    this.repriseGrace = Math.max(0, this.repriseGrace - dt);
    this._arena(dt);
    this._players(dt, inputs);
    this._statuses(dt);
    if (!echauffement) {
      this._segmentTick(dt);
      this._spawner(dt);
    }
    this._skills(dt);
    this._effects(dt);
    this._powerups(dt);
    this._harvests(dt);
    this._turrets(dt);
    this._drones(dt);
    this._enemies(dt);
    this._hazards(dt);
    this._boss(dt);
    this._orbiters(dt);
    this._bullets(dt);
    this._shots(dt);
    this._zones(dt);
    this._collisions();
    this._ultimes(dt);
    this._healLinks(dt);
    this._revive(dt);

    if (this.players.size > 0 && this.aliveCount() === 0) this.gameOver = true;
  }


  _players(dt, inputs) {
    const gust = this._gust(dt);
    for (const p of this.players.values()) {
      p.hitCd = Math.max(0, p.hitCd - dt);
      p.buffDamage = Math.max(0, p.buffDamage - dt);
      p.buffRate = Math.max(0, p.buffRate - dt);
      p.buffDouble = Math.max(0, p.buffDouble - dt);
      p.buffPierce = Math.max(0, p.buffPierce - dt);
      p.buffRicochet = Math.max(0, p.buffRicochet - dt);
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashT = Math.max(0, p.dashT - dt);

      p.cd2 = Math.max(0, p.cd2 - dt);
      p.cd3 = Math.max(0, p.cd3 - dt);
      if (p.dashSeen && p.dashT <= 0) {
        p.dashSeen = 0;
        if (p.mods.dashCrit > 0) p.dashCrits = p.mods.dashCrit;
        p.dashShot = this._relicSum(p, "dashShotFlat");
      }
      if (p.oathT > 0) {
        p.oathT = Math.max(0, p.oathT - dt);
        if (p.oathT === 0) p.oathMul = 0;
      }
      p.catalyseT = Math.max(0, p.catalyseT - dt);
      if (p.catalyseT <= 0) p.catalyseMul = 1;
      p.healSwapCd = Math.max(0, p.healSwapCd - dt);
      p.healSwapBoost = Math.max(0, p.healSwapBoost - dt);
      p.tauntInvuln = Math.max(0, p.tauntInvuln - dt);
      p.tauntT = Math.max(0, p.tauntT - dt);

      if (classAt(p.cls).id === "dps") {
        const stockMax = 1 + p.mods.bombCharges;
        if (p.bombStock < stockMax) {
          p.cd1 = Math.max(0, p.cd1 - dt);
          if (p.cd1 <= 0) {
            p.bombStock++;
            if (p.bombStock < stockMax) {
              p.cd1 = Math.max(2, SKILL_CFG.DPS_BOMB_CD - p.mods.bombCdCut)
                * p.mods.skillCdMul;
            }
          }
        }
      } else {
        p.cd1 = Math.max(0, p.cd1 - dt);
      }

      if (p.odT > 0) {
        p.odT = Math.max(0, p.odT - dt);
        if (p.odT <= 0) {
          if (p.mods.overdriveFade) p.odFade = SKILL_CFG.DPS_OVERDRIVE_FADE;
          else p.odBonus = 0;
        }
      } else if (p.odBonus > 0) {
        const fade = p.odFade || SKILL_CFG.DPS_OVERDRIVE_FADE;
        p.odBonus = Math.max(0, p.odBonus - dt * (SKILL_CFG.DPS_OVERDRIVE_MAX / fade));
      }

      const T = p.timers;
      T.shieldRegen = Math.max(0, T.shieldRegen - dt);
      T.counter = Math.max(0, T.counter - dt);
      T.zoneImmune = Math.max(0, T.zoneImmune - dt);
      T.guardian = Math.max(0, T.guardian - dt);
      T.instinct = Math.max(0, T.instinct - dt);
      T.lifestealSec -= dt;
      if (T.lifestealSec <= 0) {
        T.lifestealSec = 1;
        T.lifesteal = CARD_CFG.LIFESTEAL_CAP;
      }
      if (p.frenzyStacks > 0) {
        T.frenzy -= dt;
        if (T.frenzy <= 0) p.frenzyStacks = 0;
      }
      if (p.rageStacks > 0) {
        p.rageT -= dt;
        if (p.rageT <= 0) p.rageStacks = 0;
      }
      p.elanT += dt;
      this._momentum(p);

      const hf = p.hf;
      this._hfFenetre(hf, Math.floor(this.time));
      if (!p.downed) {
        const inp = inputs.get(p.id);
        if (!inp || (Math.abs(inp.x) < 0.01 && Math.abs(inp.y) < 0.01)) hf.still += dt;
        if (p.maxHp > 0 && p.hp / p.maxHp < HF_CFG.BAS_PV) hf.basPv += dt;
        hf.sain += dt;
        if (this.segment > HF_CFG.SANS_FAILLE_SEGMENT && hf.sain > hf.sainMax) {
          hf.sainMax = hf.sain;
        }
      }

      if (p.mods.shieldPool > 0 && !p.downed
          && T.shieldRegen <= 0 && p.shield < p.mods.shieldPool
          && !(p.mods.noShieldRegen && p.pacteUsed)) {
        // rampe et non interrupteur : sans elle, un coup toutes les sept
        // secondes rend un pool PLEIN, ce qui est une quasi-invincibilite.
        const taux = p.mods.shieldPool / CARD_CFG.SHIELD_REGEN_RAMP * p.mods.shieldRegenMul;
        this._grantShield(p, Math.min(taux * dt, p.mods.shieldPool - p.shield),
                          p.mods.shieldPool);
        if (p.mods.noShieldRegen && p.shield >= p.mods.shieldPool - 1e-6) p.pacteUsed = 1;
      }

      if (p.mods.hpRegen > 0 && !p.downed && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + p.mods.hpRegen * dt);
      }

      if (p.downed) { p.dashT = 0; continue; }

      if (p.mods.pulsarCd > 0) {
        T.pulsar -= dt;
        if (T.pulsar <= 0) { T.pulsar = p.mods.pulsarCd; this._pulse(p); }
      }
      if (p.mods.autoTurretCd > 0) {
        T.turret -= dt;
        if (T.turret <= 0) { T.turret = p.mods.autoTurretCd; this._turret(p); }
      }

      const inp = inputs.get(p.id);

      if (inp && (inp.ax || inp.ay)) {
        const ad = Math.hypot(inp.ax, inp.ay);
        if (ad > 0.001) { p.aimX = inp.ax / ad; p.aimY = inp.ay / ad; }
      }
      if (inp) p.aimR = porteeReticule(inp.ar);

      if (inp && inp.dash && p.dashCd <= 0 && p.dashT <= 0) {
        let dx = inp.x, dy = inp.y;
        if (Math.hypot(dx, dy) < 0.01) { dx = p.aimX; dy = p.aimY; }
        const d = Math.hypot(dx, dy) || 1;
        p.dashX = dx / d;
        p.dashY = dy / d;
        p.dashT = CFG.DASH_TIME + this._relicSum(p, "dashTimeFlat");
        p.dashCd = Math.max(CFG.DASH_CD_MIN, CFG.DASH_CD * p.mods.dashCdMul
          + this._relicSum(p, "dashCdFlat"));
        if (p.mods.dashTrail > 0) p.dashHits = new Set();
      }

      if (inp && inp.s1) this._skill1(p);
      if (inp && inp.s2) this._skill2(p);
      if (inp && inp.s3) this._skill3(p);

      const wasX = p.x, wasY = p.y;

      p.jailed = Math.max(0, p.jailed - dt);
      if (p.jailed > 0) { p.dashT = 0; p.vx = 0; p.vy = 0; }
      else if (p.dashT > 0) {
        p.x += p.dashX * CFG.DASH_SPEED * dt;
        p.y += p.dashY * CFG.DASH_SPEED * dt;
        if (p.mods.dashTrail > 0) this._dashTrail(p);
        if (p.mods.dashVuln > 0) this._dashVuln(p);
        p.dashSeen = 1;
      } else if (inp) {
        const g = this.hazards.length ? this._ground(p.x, p.y) : null;
        const speedMul = (this._relicFlag(p, "speedFixed") ? 1 : p.mods.speedMul)
          * (p.rally ?? 1);
        const resist = p.mods.groundResist;
        const slow = g ? 1 - (1 - g.slow) * (1 - resist) : 1;
        const sp = CFG.PLAYER_SPEED * speedMul
          * (p.statuses.has(STATUS_ROOT) ? 1 - STATUS_CFG.ROOT_SLOW : 1)
          * slow;
        const semelle = this._relicFlag(p, "slipImmune");
        if (this.slipT > 0 || (g && g.slip && resist < 1 && !semelle)) {
          const k = Math.min(1, (this.slipT > 0 ? BOSS_CFG.SLIP_ACCEL : BIOME_CFG.SLIP_ACCEL) * dt);
          p.vx += (inp.x * sp - p.vx) * k;
          p.vy += (inp.y * sp - p.vy) * k;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        } else {
          p.vx = inp.x * sp; p.vy = inp.y * sp;
          p.x += inp.x * sp * dt;
          p.y += inp.y * sp * dt;
        }
      }
      if (gust && !p.downed) { p.x += gust.x; p.y += gust.y; }
      this._clampToBounds(p, CFG.PLAYER_RADIUS);
      this._wallBlock(p, wasX, wasY, CFG.PLAYER_RADIUS);
      if (this.obstacles.length) this._obstacleBlock(p, wasX, wasY, CFG.PLAYER_RADIUS);

      if (this.boss && this.boss.kind === BOSS_METRONOME) {
        p.trail.push({ t: this.time, x: p.x, y: p.y });
        while (p.trail.length && p.trail[0].t < this.time - BOSS_CFG.BAIT_LAG) p.trail.shift();
      } else if (p.trail.length) {
        p.trail.length = 0;
      }

      p.fireCd = Math.max(0, p.fireCd - dt);

      const arme = armeAt(p.arme);
      let interval = arme.interval * p.mods.fireIntervalMul;
      if (p.frenzyStacks > 0) interval /= 1 + p.frenzyStacks * CARD_CFG.FRENZY_STEP;
      if (p.mods.lowHpRate > 0 && p.hp <= p.maxHp * CARD_CFG.ADRENALINE_HP) {
        interval /= 1 + p.mods.lowHpRate;
      }
      if (p.buffRate > 0) interval *= CFG.BUFF_RATE_MUL;
      if (p.odBonus > 0) interval /= 1 + p.odBonus;
      if (p.healSwapBoost > 0) interval /= 1 + CARD_CFG.BASCULE_VIVE_RATE;
      if (arme.charge) interval *= Math.max(0.2, p.mods.railVite + this._relicSum(p, "railViteFlat"));
      interval = Math.max(CFG.FIRE_INTERVAL_MIN, interval + this._relicSum(p, "rateFlat"));

      p.fireInterval = interval;

      const tirAutorise = this.warmup <= 0 && !p.healMode && !p.downed;
      if (tirAutorise) {
        p.hf.armeTemps += dt;
        // muet = REFUSE pour cause de ressource. La charge du railgun n'en est
        // pas : elle EST sa cadence, et compter une cadence comme du mutisme
        // rendrait toutes les armes lentes muettes.
        if (p.armeMuet > 0) p.hf.armeMuet += dt;
      }
      this._armeTick(p, arme, dt, tirAutorise);

      // posture engagee : il ne tire plus du tout. Les liens s'accrochent seuls.
      if (arme.interval > 0 && p.fireCd <= 0 && tirAutorise && p.armeMuet <= 0) {
        p.fireCd = interval;
        this._shoot(p);
        if (arme.chargeur) {
          p.armeMun = Math.max(0, p.armeMun - 1);
          // la recharge n'a pas besoin de son propre signal : le bouclier qui
          // se ferme est deja dessine, et la jauge se remplit sous le reticule
          if (p.armeMun <= 0) p.armeMuet = arme.recharge * p.mods.rechargeMul;
        }
      }
    }
  }

  // ce qu'un ALLIE porte et qui profite aux autres. Sans rayon : un PV max qui
  // clignote au pas d'un coequipier est une fabrique de defauts.
  _relicAllySum(p, key) {
    let s = 0;
    for (const o of this.players.values()) {
      if (o === p) continue;
      s += this._relicSum(o, key);
    }
    return s;
  }

  // les degats bruts PERMANENTS d'un joueur : le tir les ajoute, la puissance les
  // compte. Le bonus d'esquive n'en fait pas partie, il est ponctuel.
  _flatDamage(p) {
    const plafond = this._relicSum(p, "barDamageMax") || Infinity;
    return this._relicSum(p, "flatDamage")
      + this._relicAllySum(p, "allyFlatDamage")
      + Math.min(plafond, this._relicSum(p, "barDamage") * this.barsBroken);
  }

  /* Point de passage unique de TOUTE source de degats qui n'est pas le tir :
     lame orbitale, essaim, drone, tourelle, pulsar, onde de mort. Indexee sur le
     seul `damageMul` elle decrochait — le tir gagne aussi la cadence, les degats
     bruts et le critique, elle non. Elle lit donc l'indice de puissance ENTIER,
     a exposant reduit : elle progresse sans dominer, et « Surcharge orbitale »
     redevient un bonus au lieu d'un correctif obligatoire. */
  _summonMul(p) {
    return Math.pow(powerIndex(p.mods, this._flatDamage(p)) / SUMMON_REF,
                    CARD_CFG.SUMMON_SCALE);
  }

  /* Une seule case par seconde ecoulee, jamais l'anneau entier : a 120 Hz et
     quatre joueurs, balayer 60 cases par image coute plus que la mesure. */
  _hfFenetre(hf, sec) {
    if (sec === hf.sec) return;
    const n = sec - hf.sec;
    for (let k = 1; k <= Math.min(HF_CFG.FENETRE_CRIT, n); k++) {
      const i = (hf.sec + k) % HF_CFG.FENETRE_CRIT;
      hf.critSom -= hf.critFen[i];
      hf.critFen[i] = 0;
    }
    for (let k = 1; k <= Math.min(HF_CFG.FENETRE_KILL, n); k++) {
      const i = (hf.sec + k) % HF_CFG.FENETRE_KILL;
      hf.killSom -= hf.killFen[i];
      hf.killFen[i] = 0;
    }
    hf.sec = sec;
  }

  /* La PORTEE se mesure du tueur au corps, la CAUSE se lit sur le drapeau que
     `_explode` pose : ni l'une ni l'autre ne se deduit apres coup. */
  _hfKill(owner, e) {
    const hf = owner.hf;
    const d2 = (e.x - owner.x) ** 2 + (e.y - owner.y) ** 2;
    if (d2 <= HF_CFG.PRES * HF_CFG.PRES) hf.near++;
    else if (d2 >= HF_CFG.LOIN * HF_CFG.LOIN) hf.far++;
    if (this._causeBlast) hf.blast++;
    if (this._balle) {
      const n = (this._balle.tues | 0) + 1;
      this._balle.tues = n;
      if (n > hf.percee) hf.percee = n;
    }

    const sec = Math.floor(this.time);
    this._hfFenetre(hf, sec);
    hf.killFen[sec % HF_CFG.FENETRE_KILL]++;
    hf.killSom++;
    if (hf.killSom > hf.killBest) hf.killBest = hf.killSom;

    const i = hf.killTot % HF_CFG.ECONOMIE_KILLS;
    if (hf.killTot >= HF_CFG.ECONOMIE_KILLS) {
      const cout = hf.tirs - hf.tirsAuKill[i];
      if (hf.tirsPourCent === 0 || cout < hf.tirsPourCent) hf.tirsPourCent = cout;
    }
    hf.tirsAuKill[i] = hf.tirs;
    hf.killTot++;
  }

  /* LA RESSOURCE D'UNE ARME EST UN ETAT DE MANCHE, pas une recharge : elle monte
     et descend toute seule, et le joueur la lit au lieu de la declencher. Point
     de passage unique — `armeRes` porte la rampe du canon d'assaut comme la
     chaleur du laser, parce qu'une seule jauge voyage et qu'un joueur n'a jamais
     deux ressources a la fois. */
  _armeTick(p, arme, dt, tirAutorise) {
    p.armeMuet = Math.max(0, p.armeMuet - dt);
    // bornee, pas entretenue : un identifiant d'ennemi ne revient jamais, donc
    // la table ne sert que de memoire courte
    if (p.precVus.size > 2000) p.precVus.clear();
    p.armeAng = Math.atan2(p.aimY, p.aimX);
    const givre = p.mods.frostRadius + this._relicSum(p, "frostFlat");
    p.frostR = givre;

    if (arme.rampe) {
      // la RETOMBEE est progressive : sans elle, esquiver une mecanique de boss
      // couterait toute la puissance accumulee, et l'arme serait injouable.
      const bouge = (p.vx * p.vx + p.vy * p.vy) > ARME_CFG.RAMPE_SEUIL ** 2;
      const garde = Math.max(0, p.mods.rampeGarde + this._relicSum(p, "rampeGardeFlat"));
      p.armeRes = bouge
        ? Math.max(0, p.armeRes - dt * garde / ARME_CFG.RAMPE_CHUTE)
        : Math.min(1, p.armeRes + dt * (1 + p.mods.rampeVite) / ARME_CFG.RAMPE_MONTEE);
      // le champ du 4/4 REUTILISE l'aura de givre : une seconde machinerie de
      // ralentissement serait un second chemin pour la meme regle
      p.frostR = Math.max(givre,
        p.mods.rampeZone > 0 && p.armeRes >= 1 && !bouge ? p.mods.rampeZone : 0);
      return;
    }

    /* LA CHARGE EST UNE HORLOGE, PAS UNE MANIPULATION. Le tir etant automatique,
       il n'y a rien a declencher : ce que le joueur pilote, c'est ou il se trouve
       quand le rail part. La jauge ne fait que rendre le cycle LISIBLE — une
       ressource invisible est une ressource subie. */
    if (arme.charge) {
      const cycle = arme.interval * p.mods.fireIntervalMul;
      p.armeRes = cycle > 0 ? Math.max(0, Math.min(1, 1 - p.fireCd / cycle)) : 1;
      return;
    }

    /* LE CHARGEUR : six obus, puis une fenetre ou l'arme ne rend rien. `armeMuet`
       est ce qui la ferme, donc le meme champ que la saturation du laser — un
       second chemin pour « je ne peux pas tirer » se serait desynchronise. */
    if (arme.chargeur) {
      const taille = this._chargeur(p, arme);
      if (p.armeMuet > 0) {
        // le bouclier ne supprime pas la vulnerabilite, il l'empeche d'etre
        // letale : on encaisse pendant la recharge, on ne repond pas
        p.armeRech = 1;
        const cap = p.mods.shieldPool * (arme.rechargeGarde ?? 1);
        if (p.shield < cap) this._grantShield(p, cap - p.shield, cap);
        const duree = arme.recharge * p.mods.rechargeMul;
        p.armeRes = duree > 0 ? Math.max(0, Math.min(1, 1 - p.armeMuet / duree)) : 1;
      } else {
        // la garde s'en va avec la fenetre : sinon un siege garderait trois fois
        // sa reserve en permanence, et la contrepartie deviendrait un cadeau
        if (p.armeRech) { p.armeRech = 0; p.shield = Math.min(p.shield, p.mods.shieldPool); }
        if (!(p.armeMun > 0)) p.armeMun = taille;
        p.armeRes = Math.min(1, p.armeMun / taille);
      }
      return;
    }

    if (arme.chaleur) {
      const tire = tirAutorise && p.armeMuet <= 0;
      if (tire) {
        p.armeT += dt;
        while (p.armeT >= ARME_CFG.LASER_TICK) {
          p.armeT -= ARME_CFG.LASER_TICK;
          p.armeTouche = this._faisceau(p, arme, ARME_CFG.LASER_TICK) > 0 ? 1 : 0;
        }
      } else {
        p.armeT = 0;
        p.armeTouche = 0;
      }
      /* LA CHALEUR SUIT LE FAISCEAU, PAS LA TOUCHE. Elle ne montait qu'en
         contact, donc elle ne se remplissait que dans les moments ou le joueur
         gagnait deja — et comme le bonus croit avec elle, la ressource
         recompensait sans jamais mordre. Deux regimes pour ne pas punir la
         couverture de zone : le contact sature en 4,2 s, le vide en 7 s. */
      if (tire) {
        const monte = p.armeTouche ? ARME_CFG.CHALEUR_MONTEE : ARME_CFG.CHALEUR_MONTEE_VIDE;
        p.armeRes = Math.min(1, p.armeRes + dt * monte * p.mods.chaleurSeuil);
        if (p.armeRes >= 1) {
          p.armeMuet = ARME_CFG.CHALEUR_MUET;
          this._surchauffe(p);
        }
      } else {
        p.armeRes = Math.max(0, p.armeRes - dt * ARME_CFG.CHALEUR_CHUTE * p.mods.chaleurChute
          * (1 + this._relicSum(p, "chaleurChuteFlat")));
      }
    }
  }

  _chargeur(p, arme) {
    return arme.chargeur + p.mods.chargeurPlus + this._relicSum(p, "chargeurPlus");
  }

  // une mise a mort remplit le chargeur ET coupe la recharge en cours : c'est ce
  // qui transforme la fenetre morte en recompense au lieu d'une attente
  _siegeKill(p) {
    const arme = armeAt(p.arme);
    if (!arme.chargeur || !(p.mods.siegeKill > 0)) return;
    p.armeMuet = 0;
    p.armeMun = this._chargeur(p, arme);
  }

  /* LE FAISCEAU NE RATE JAMAIS : il ne lance pas de projectile, il balaie un
     segment. C'est sa vraie signature, pas ses degats. */
  _faisceau(p, arme, dt) {
    return this._sousArme(p.id, () => this._faisceauInterne(p, arme, dt));
  }

  _faisceauInterne(p, arme, dt) {
    const base = (arme.degats + this._flatDamage(p)) * p.mods.damageMul
      * (p.buffDamage > 0 ? CFG.BUFF_DAMAGE_MUL : 1)
      * (1 + p.armeRes * (ARME_CFG.CHALEUR_BONUS + (p.mods.chaleurDegats ?? 0)));
    const n = 1 + p.mods.extraBarrels + (p.buffDouble > 0 ? 1 : 0);
    const dmg = base * dt * p.mods.barrelDamageMul;
    const portee = CFG.BULLET_SPEED * CFG.BULLET_LIFE * arme.portee * p.mods.bulletLifeMul;
    const large = ARME_CFG.LASER_LARGEUR * p.mods.faisceauLarge;
    let touches = 0;
    for (let i = 0; i < n; i++) {
      const a = p.armeAng + (n === 1 ? 0 : (i - (n - 1) / 2) * 0.13);
      touches += this._segmentHits(p, p.x, p.y, Math.cos(a), Math.sin(a),
                                   portee, large, dmg, true);
    }
    return touches;
  }

  /* La projection sur le segment, extraite de `_segmentHits` plutot que
     reecrite : rend la distance le long de l'axe, ou `null` si le corps est
     derriere, au-dela, ou trop lateral. */
  _surSegment(px, py, dx, dy, portee, large) {
    const le = px * dx + py * dy;
    if (le < 0 || le > portee) return null;
    const ex = px - le * dx, ey = py - le * dy;
    return ex * ex + ey * ey > large * large ? null : le;
  }

  /* Point de passage unique de tout ce qui frappe LE LONG D'UN SEGMENT : le
     faisceau du laser, et le rail du railgun s'il en vient un jour. */
  _segmentHits(p, ox, oy, dx, dy, portee, large, dmg, overTime) {
    let touches = 0;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const px = e.x - ox, py = e.y - oy;
      const le = px * dx + py * dy;
      if (le < 0 || le > portee) continue;
      const ex = px - le * dx, ey = py - le * dy;
      const rr = large + e.r;
      if (ex * ex + ey * ey > rr * rr) continue;
      this._damage(e, dmg, p.id, p.mods.burnDmg > 0 ? p.mods.burnDmg : 0, overTime);
      touches++;
    }
    for (const boss of this._bossTargets()) {
      const px = boss.x - ox, py = boss.y - oy;
      const le = px * dx + py * dy;
      if (le < 0 || le > portee) continue;
      const ex = px - le * dx, ey = py - le * dy;
      const rr = large + CFG.BOSS_RADIUS;
      if (ex * ex + ey * ey > rr * rr) continue;
      this._damage(boss, dmg, p.id, 0, overTime, ox + dx * le, oy + dy * le);
      touches++;
    }
    // un faisceau qui traverse une file ET un cristal casse les deux : c'est
    // sa signature, pas une exception
    for (const h of this.harvests) {
      const px = h.x - ox, py = h.y - oy;
      const le = px * dx + py * dy;
      if (le < 0 || le > portee) continue;
      const ex = px - le * dx, ey = py - le * dy;
      const rr = large + CFG.HARVEST_RADIUS;
      if (ex * ex + ey * ey > rr * rr) continue;
      if (this._harvestDamage(h, dmg)) touches++;
    }
    return touches;
  }

  _surchauffe(p) {
    this.effects.push({
      id: this._nextId++, x: p.x, y: p.y,
      r: 90, life: 0.4, max: 0.4, kind: 0, n: 0, owner: p.id,
    });
    if (p.mods.surchauffeNova > 0) {
      this._wave(p.x, p.y, p.mods.surchauffeNova, p.mods.damageMul * 60, p.id);
    }
  }

  _relicFlag(p, key) {
    for (const id of p.relics.keys()) if (relicById(id)?.[key]) return true;
    return false;
  }

  /* La contagion ne BLESSE pas : elle ne fait que poser l'etat, donc elle ne
     peut pas se rappeler elle-meme. La chaine se propage d'un tick a l'autre,
     par les morts que la brulure finit par causer. */
  _burnSpread(source, r, dmg, ownerId) {
    const r2 = r * r;
    for (const e of this.enemies) {
      if (e === source || e.hp <= 0) continue;
      const dx = e.x - source.x, dy = e.y - source.y;
      if (dx * dx + dy * dy > r2) continue;
      if (!e.burn || dmg >= e.burn.dmg) e.burn = { dmg, t: CARD_CFG.BURN_TIME, owner: ownerId };
      else e.burn.t = CARD_CFG.BURN_TIME;
    }
  }

  _relicSum(p, key) {
    let s = 0;
    for (const id of p.relics.keys()) {
      const r = relicById(id);
      if (r && r[key]) s += r[key];
    }
    return s;
  }

  _shoot(p) {
    const arme = armeAt(p.arme);
    const brut = this._flatDamage(p) + (p.dashShot ?? 0);
    p.dashShot = 0;
    const base = (arme.degats + brut) * p.mods.damageMul
      * (p.buffDamage > 0 ? CFG.BUFF_DAMAGE_MUL : 1)
      // la rampe monte les degats, elle ne touche a rien d'autre : c'est le
      // dialogue entre le danger qui approche et le compteur qui monte
      * (arme.rampe ? 1 + p.armeRes * ((p.mods.rampeMax ?? ARME_CFG.RAMPE_MAX) - 1) : 1);
    this._volley(p, base);
    if (p.mods.echoChance > 0 && Math.random() < p.mods.echoChance) this._volley(p, base);
  }

  /* LA PENALITE VIT AU MEME ENDROIT QUE LE BENEFICE. `barrelDamageMul` se payait
     ICI, avant l'aiguillage, alors qu'`extraBarrels` n'est lu que par la branche a
     balles unitaires : quatre armes sur huit payaient -18 % cumulable deux fois
     pour rien. Descendre la penalite rend l'incoherence impossible au lieu de la
     rattraper par une liste. */
  _volley(p, base) {
    return this._sousArme(p.id, () => this._volleyInterne(p, base));
  }

  _volleyInterne(p, base) {
    const arme = armeAt(p.arme);
    /* UN CANON EN PLUS N'AJOUTE PAS LA MEME CHOSE PARTOUT : une balle en
       eventail, deux plombs, une grenade, un arc, un faisceau. Ce qu'il vaut se
       lit dans `canonEffet`, et la penalite reste dans la branche qui l'encaisse. */
    const extra = canonEffet(arme)
      ? p.mods.extraBarrels + (p.buffDouble > 0 ? 1 : 0) : 0;
    const penal = canonEffet(arme) ? p.mods.barrelDamageMul : 1;

    switch (arme.tir) {
      case "arc": {
        const n = 1 + extra;
        for (let i = 0; i < n; i++) {
          this._teslaTir(p, arme, base * penal,
                         p.armeAng + (n === 1 ? 0 : (i - (n - 1) / 2) * 0.13));
        }
        return;
      }
      case "arc_sol":
        this._lameTir(p, arme, base);
        return;
      case "grenade": {
        // le direct est nul : toute la puissance est dans le souffle, c'est ce
        // que « 40 + zone » veut dire.
        // LE RETICULE FIXE LE POINT DE DETONATION, borne par ce que l'arme
        // porte : `court` multipliait la duree de vie, donc la grenade sautait
        // toujours a la meme distance et « anticiper la trajectoire » ne voulait
        // rien dire. Un corps rencontre avant la fait sauter plus tot.
        const max = CFG.BULLET_SPEED * CFG.BULLET_LIFE * arme.portee * p.mods.bulletLifeMul;
        const v = CFG.BULLET_SPEED * p.mods.bulletSpeedMul * CARD_CFG.GRENADE_SPEED_MUL;
        const nb = 1 + p.mods.grenadesPlus + extra;
        const direct = p.mods.grenadeDirect * penal;
        for (let i = 0; i < nb; i++) {
          const off = nb === 1 ? 0 : (i - (nb - 1) / 2) * 0.10;
          this._fire(p, direct, off, {
            boom: true, boomDmg: base * penal, direct: direct > 0, lob: true,
            // la balle nait deja devant le joueur : la duree ne couvre que le reste
            vie: Math.max(0, Math.min(p.aimR, max) - (CFG.PLAYER_RADIUS + 2)) / v,
            boomR: (arme.souffle ?? CARD_CFG.GRENADE_RADIUS)
              * p.mods.areaMul * (p.mods.souffleMul + this._relicSum(p, "souffleFlat")),
          });
        }
        break;
      }
      default: {
        if (arme.plombs) {
          /* UNE SEULE BALLE PART, ELLE SE SCINDE A DISTANCE FIXE. Ce que l'arme
             demande n'est plus « approche » mais « place-toi a la scission » :
             de pres le porteur seul touche et il ne vaut que deux plombs, de
             loin la gerbe s'est deja ecartee. */
          const n = arme.plombs + p.mods.plombsPlus + ARME_CFG.CANON_PLOMBS * extra;
          const portee = CFG.BULLET_SPEED * CFG.BULLET_LIFE * arme.portee
            * p.mods.bulletLifeMul;
          const dist = Math.min(arme.scission, portee * 0.75);
          const vitesse = CFG.BULLET_SPEED * p.mods.bulletSpeedMul;
          const droit = p.mods.scissionDroite > 0;
          this._fire(p, base * arme.porteur * penal, 0, {
            // la vie du porteur ne borne pas la scission, elle la couvre : c'est
            // la distance parcourue qui declenche, pas l'echeance
            vie: dist / vitesse * 1.5,
            scinde: {
              n, reste: dist, dmg: base * penal,
              arc: droit ? 0 : ARME_CFG.DISP_ARC * p.mods.gerbeMul,
              lat: droit ? ARME_CFG.DISP_DROITE : 0,
              vie: Math.max(0.05, (portee - dist) / vitesse),
              chaine: p.mods.plombsChain,
            },
          });
          break;
        }
        const barrels = 1 + extra;
        /* LA RAMPE S'OUVRE DANS LA GERBE. Elle n'existait que comme un anneau
           autour du personnage — une jauge d'interface pour une mecanique qui
           doit se lire dans les balles. Aucun etat neuf : `armeRes` porte deja
           exactement la bonne valeur, immobile depuis assez longtemps donne un
           tir chirurgical, un deplacement rouvre la gerbe. */
        const disp = arme.rampe ? ARME_CFG.ASSAUT_DISPERSION * (1 - p.armeRes) : 0;
        const dmg = base * penal;
        const dernier = arme.chargeur && (p.armeMun ?? arme.chargeur) === 1
          ? (p.mods.siegeDernier ?? 1) : 1;
        const rail = arme.charge ? 1 + p.mods.railDegats : 1;
        for (let i = 0; i < barrels; i++) {
          const off = (barrels === 1 ? 0 : (i - (barrels - 1) / 2) * 0.13)
            + (disp > 0 ? (Math.random() * 2 - 1) * disp : 0);
          this._fire(p, dmg * dernier * rail, off, {
            pierceAll: !!arme.perforeTout,
            court: arme.portee,
            perce: arme.perce ?? 0,
            // un OBUS fait le direct PUIS le souffle ; la grenade, elle, n'a
            // jamais eu que le souffle
            boom: !!arme.souffle,
            direct: !!arme.obus,
            boomDmg: arme.souffle ? dmg * dernier * (arme.souffleDmg ?? 1) : undefined,
            boomR: arme.souffle
              ? arme.souffle * p.mods.areaMul
                * (p.mods.souffleMul + this._relicSum(p, "souffleFlat")) : undefined,
            brule: arme.charge && p.mods.railSillon > 0 ? p.mods.railSillon : 0,
            reso: arme.charge ? p.mods.railResonance : 0,
          });
        }
      }
    }

    if (p.mods.backShot) this._fire(p, base * 0.7, Math.PI);
  }

  /* LE TESLA SE VISE. Il partait sur le corps le plus proche, donc il ne pouvait
     pas rater : une arme qui atteint la reference sans exiger de visee n'est pas
     une arme alternative, c'est l'arme optimale — et elle retirait le seul geste
     que le jeu demande. Le trait part maintenant DROIT DEVANT et s'accroche au
     premier corps du segment, avec une tolerance laterale genereuse ; c'est a
     l'impact que l'arc se disperse. Un tir a cote est un tir perdu.
     Sur un boss, les rebonds REVIENNENT sur la meme cible avec leur perte : une
     arme qui saute entre les cibles n'a rien a sauter face a une cible unique. */
  _teslaTir(p, arme, dmg, ang = p.armeAng) {
    const portee = CFG.BULLET_SPEED * CFG.BULLET_LIFE * arme.portee * p.mods.bulletLifeMul;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const large = ARME_CFG.TESLA_ACCROCHE;
    // le PREMIER corps du segment, pas le plus proche du joueur : c'est la
    // difference entre viser et se laisser porter
    let cible = null, best = portee;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const le = this._surSegment(e.x - p.x, e.y - p.y, dx, dy, portee, large + e.r);
      if (le !== null && le < best) { best = le; cible = e; }
    }
    let boss = null;
    for (const b of this._bossTargets()) {
      const le = this._surSegment(b.x - p.x, b.y - p.y, dx, dy, portee,
                                  large + CFG.BOSS_RADIUS);
      if (le !== null && le < best) { best = le; boss = b; cible = null; }
    }
    const rebonds = ARME_CFG.TESLA_REBONDS + (p.mods.teslaRebonds ?? 0);
    const garde = 1 - (p.mods.teslaPerte ?? ARME_CFG.TESLA_PERTE);

    // LE CRISTAL NE VOLE PAS LA CIBLE : un cristal qui aspire les arcs pendant
    // une vague est une punition, pas une arme. Il n'est acquis que quand il
    // n'y a plus rien de vivant a portee.
    if (!cible && !boss) { this._teslaCristaux(p, dmg, portee, rebonds, garde, ang); return; }

    if (boss) {
      // conversion boss : le meme nombre d'arcs, tous sur le meme corps
      let k = 1, total = 0;
      for (let i = 0; i <= rebonds; i++) { total += k; k *= garde; }
      this._effetArc(p.x, p.y, boss.x, boss.y, 1);
      this._damage(boss, dmg * total, p.id, 0, false, boss.x, boss.y);
      return;
    }

    const vus = new Set();
    let src = p, cur = cible, force = dmg;
    for (let i = 0; i <= rebonds; i++) {
      vus.add(cur.id);
      // le premier trait est l'AMORCE : sans lui a l'ecran, le joueur ne voit pas
      // qu'il a vise, et l'arme continue de se lire comme automatique. Le RANG
      // suit — c'est lui qui rend visible et audible la perte par rebond.
      this._effetArc(src.x, src.y, cur.x, cur.y, i + 1);
      if (p.mods.teslaEntrave > 0) cur.rootUntil = this.time + p.mods.teslaEntrave;
      this._damage(cur, force, p.id);
      force *= garde;
      src = cur;
      let next = null, nd = ARME_CFG.TESLA_SAUT ** 2;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if (vus.has(e.id) && !(p.mods.teslaRetour > 0 && vus.size > 1)) continue;
        if (e === src) continue;
        // le retour sur une cible deja touchee est un palier de famille, pas la
        // regle de base : sans lui, un arc sur un boss isole n'a nulle part ou aller
        const d = (e.x - src.x) ** 2 + (e.y - src.y) ** 2;
        if (d < nd) { nd = d; next = e; }
      }
      if (!next) break;
      cur = next;
    }
  }

  _teslaCristaux(p, dmg, portee, rebonds, garde, ang = p.armeAng) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const large = ARME_CFG.TESLA_ACCROCHE + CFG.HARVEST_RADIUS;
    let cur = null, best = portee;
    for (const h of this.harvests) {
      if (h.kind !== 0 || h.hp <= 0) continue;
      const le = this._surSegment(h.x - p.x, h.y - p.y, dx, dy, portee, large);
      if (le !== null && le < best) { best = le; cur = h; }
    }
    if (!cur) return;
    const vus = new Set();
    let src = p, force = dmg;
    for (let i = 0; i <= rebonds; i++) {
      vus.add(cur);
      this._effetArc(src.x, src.y, cur.x, cur.y, i + 1);
      this._harvestDamage(cur, force);
      force *= garde;
      src = cur;
      let next = null, nd = ARME_CFG.TESLA_SAUT ** 2;
      for (const h of this.harvests) {
        if (h.kind !== 0 || h.hp <= 0 || vus.has(h)) continue;
        const d = (h.x - src.x) ** 2 + (h.y - src.y) ** 2;
        if (d < nd) { nd = d; next = h; }
      }
      if (!next) break;
      cur = next;
    }
  }

  _effetArc(x, y, x2, y2, amorce = 0) {
    this.effects.push({
      id: this._nextId++, x, y, x2, y2,
      r: 0, life: 0.18, max: 0.18, kind: 3, n: amorce,
    });
  }

  /* LAME : portee nulle, aucune visee a gerer, et elle touche TOUT L'ARC. Sur un
     boss, les coups repetes empilent une marque — c'est ce qui l'empeche de
     tomber sous le plancher en cible unique. */
  _lameTir(p, arme, dmg) {
    const r = (lameRayon(arme) + p.mods.lameRayon) * p.mods.areaMul;
    const arc = ARME_CFG.LAME_ARC * (p.mods.lameArc ?? 1);
    const sens = p.mods.lameDouble > 0 ? [1, -1] : [1];
    const r2 = r * r;
    let touches = 0;

    for (const s of sens) {
      const a0 = p.armeAng + (s > 0 ? 0 : Math.PI);
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - p.x, dy = e.y - p.y;
        if (dx * dx + dy * dy > (r + e.r) ** 2) continue;
        if (Math.abs(this._angleDiff(Math.atan2(dy, dx), a0)) > arc / 2) continue;
        this._damage(e, dmg, p.id, p.mods.burnDmg);
        if (p.mods.lamePousse > 0) {
          const d = Math.hypot(dx, dy) || 1;
          e.x += (dx / d) * p.mods.lamePousse;
          e.y += (dy / d) * p.mods.lamePousse;
        }
        touches++;
      }
      for (const boss of this._bossTargets()) {
        const dx = boss.x - p.x, dy = boss.y - p.y;
        if (dx * dx + dy * dy > (r + CFG.BOSS_RADIUS) ** 2) continue;
        if (Math.abs(this._angleDiff(Math.atan2(dy, dx), a0)) > arc / 2) continue;
        const m = this._lameMarque(p, boss.id);
        this._damage(boss, dmg * (1 + m * ARME_CFG.LAME_MARQUE), p.id, 0, false, boss.x, boss.y);
        touches++;
      }
      // sans reserve : la lame frappe tout ce qui est dans l'arc, c'est sa
      // definition
      for (const h of this.harvests) {
        const dx = h.x - p.x, dy = h.y - p.y;
        if (dx * dx + dy * dy > (r + CFG.HARVEST_RADIUS) ** 2) continue;
        if (Math.abs(this._angleDiff(Math.atan2(dy, dx), a0)) > arc / 2) continue;
        if (this._harvestDamage(h, dmg)) touches++;
      }
    }

    /* `n2` PORTAIT LE NOMBRE DE TRANCHANTS ET N'ETAIT LU NULLE PART : le tuple
       d'effet n'a pas de place pour lui, et le client le DEDUIT — le second arc
       vient d'une carte, donc de `fullMods` du porteur, comme la portee du
       reticule et la nappe du laser. Un champ dont la seule lecture est morte se
       supprime. */
    this.effects.push({
      id: this._nextId++, x: p.x, y: p.y, r,
      life: 0.2, max: 0.2, kind: 17, n: touches, owner: p.id,
      ang: p.armeAng,
    });
    void r2;
    if (touches > 0 && p.mods.lameKill > 0) p.fireCd = Math.max(0, p.fireCd - p.mods.lameKill);
  }

  _lameMarque(p, id) {
    const m = p.lameMarques.get(id);
    const n = (m && this.time - m.at < ARME_CFG.LAME_MARQUE_TEMPS) ? m.n : 0;
    const next = Math.min(ARME_CFG.LAME_MARQUE_MAX, n + 1);
    p.lameMarques.set(id, { n: next, at: this.time });
    return n;
  }

  _fire(p, dmg, angleOffset, opt = {}) {
    p.hf.tirs++;
    const a = Math.atan2(p.aimY, p.aimX) + angleOffset;
    const dx = Math.cos(a), dy = Math.sin(a);
    // LOBEE se DECLARE : le deduire de `boom` faisait ralentir l'obus du siege,
    // et le deduire de `direct` faisait accelerer la grenade des qu'une carte lui
    // donnait un percuteur — or `vie` est calculee sur la vitesse attendue, donc
    // la grenade passait au-dela du reticule.
    const speed = CFG.BULLET_SPEED * p.mods.bulletSpeedMul
      * (opt.lob ? CARD_CFG.GRENADE_SPEED_MUL : 1);
    const pierce = (opt.pierceAll || p.mods.inertia)
      ? Infinity
      : (p.buffPierce > 0 ? CFG.PIERCE_HITS : 0) + p.mods.pierce + (opt.perce ?? 0);

    const b = {
      id: this._nextId++,
      x: p.x + dx * (CFG.PLAYER_RADIUS + 2),
      y: p.y + dy * (CFG.PLAYER_RADIUS + 2),
      vx: dx * speed,
      vy: dy * speed,
      life: opt.vie ?? (CFG.BULLET_LIFE * p.mods.bulletLifeMul * (opt.court ?? 1)),
      dmg,
      owner: p.id,
      pierce,
      chain: (p.buffRicochet > 0 ? CFG.RICOCHET_MAX : 0) + p.mods.chain
        + (opt.chaine ?? 0),
      burn: Math.max(opt.brule ?? 0,
        p.mods.burnDmg > 0 ? p.mods.burnDmg + this._relicSum(p, "burnFlat") : 0),
      arc: p.mods.chainChance,
      boom: opt.boom ? (opt.boomDmg ?? CARD_CFG.GRENADE_DAMAGE * (dmg / CFG.BULLET_DAMAGE)) : 0,
      boomR: opt.boomR ?? 0,
      hits: pierce > 0 ? new Set() : null,
      hit: null,
      inertia: p.mods.inertia ? 1 : 0,
      direct: opt.direct ? 1 : 0,
      arme: this._armeDe === p.id ? 1 : 0,
      reso: opt.reso ?? 0,
      bounce: p.mods.bounce ? CARD_CFG.BOUNCE_MAX : 0,
      dmg0: dmg,
      scinde: opt.scinde ?? null,
    };

    if (this._spawnSweep(b, p.x, p.y)) return;
    this.bullets.push(b);
  }


  _relicMemoire(p) {
    if (p.relicMemoireUsed || !p.relics.has("memoire_gravee")) return;
    p.relicMemoireUsed = 1;
    switch (classAt(p.cls).id) {
      case "tank": p.cd1 = 0; break;
      case "soigneur": p.healSwapCd = 0; break;
      default:
        p.bombStock = Math.min(1 + p.mods.bombCharges, p.bombStock + 1);
        p.cd1 = 0;
    }
  }

  _skill1(p) {
    if (p.downed) return;
    switch (classAt(p.cls).id) {
      case "tank": {
        if (p.cd1 > 0) return;
        p.cd1 = SKILL_CFG.TANK_BULWARK_CD * p.mods.skillCdMul;
        p.skillUses[0]++;
        const anchor = p.mods.bulwarkAnchor > 0;
        const r = (anchor ? CARD_CFG.ANCRAGE_RADIUS : SKILL_CFG.TANK_BULWARK_RADIUS)
          * p.mods.bulwarkRadiusMul;
        const life = (anchor ? CARD_CFG.ANCRAGE_TIME : SKILL_CFG.TANK_BULWARK_TIME)
          + p.mods.bulwarkTime;
        this.bulwarks.push({
          id: this._nextId++, x: p.x, y: p.y, r, life, max: life, owner: p.id,
          anchor: anchor ? 1 : 0,
          rate: anchor ? CARD_CFG.ANCRAGE_SHIELD_MUL : 1,
          purged: new Set(),
        });
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r, life: 0.5, max: 0.5, kind: 9,
        });
        this._relicMemoire(p);
        return;
      }

      case "soigneur": {
        if (p.healSwapCd > 0) return;
        p.healMode = p.healMode ? 0 : 1;
        p.skillUses[0]++;
        if (p.mods.swapInstant) {
          p.healSwapCd = 0;
          p.healSwapBoost = CARD_CFG.BASCULE_VIVE_TIME;
          p.fireCd = 0;
        } else {
          p.healSwapCd = SKILL_CFG.HEAL_MODE_SWAP_CD * p.mods.skillCdMul;
        }
        this._relicMemoire(p);
        return;
      }

      default: {
        if (p.bombStock <= 0) return;
        p.bombStock--;
        if (p.cd1 <= 0) {
          p.cd1 = Math.max(2, SKILL_CFG.DPS_BOMB_CD - p.mods.bombCdCut)
            * p.mods.skillCdMul;
        }
        p.skillUses[0]++;
        const range = bombRange(p.aimR);
        const flight = bombFlight(range);
        this.bombs.push({
          id: this._nextId++,
          x: p.x, y: p.y,
          vx: p.aimX * range / flight,
          vy: p.aimY * range / flight,
          t: flight,
          max: flight,
          tx: Math.min(Math.max(p.x + p.aimX * range, this.bounds.x0), this.bounds.x1),
          ty: Math.min(Math.max(p.y + p.aimY * range, this.bounds.y0), this.bounds.y1),
          owner: p.id,
        });
        this._relicMemoire(p);
      }
    }
  }

  _skill2(p) {
    if (p.downed || p.cd2 > 0) return;
    switch (classAt(p.cls).id) {
      case "tank": {
        const dur = SKILL_CFG.TANK_TAUNT_TIME + p.mods.tauntTime;
        p.cd2 = Math.max(5, (SKILL_CFG.TANK_TAUNT_CD + p.mods.tauntCd) * p.mods.skillCdMul);
        p.skillUses[1]++;
        p.tauntT = dur;
        p.tauntInvuln = SKILL_CFG.TANK_TAUNT_INVULN;
        this.taunt = { id: p.id, until: this.time + dur, x: p.x, y: p.y };
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y,
          r: SKILL_CFG.TANK_TAUNT_RADIUS, life: 0.55, max: 0.55, kind: 10,
        });
        this._relicMemoire(p);
        return;
      }

      case "soigneur": {
        const r = SKILL_CFG.HEAL_WAVE_RADIUS * p.mods.healWaveRadiusMul;
        p.cd2 = SKILL_CFG.HEAL_WAVE_CD * p.mods.skillCdMul;
        p.skillUses[1]++;
        for (const o of this.players.values()) {
          if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 > r * r) continue;
          this._heal(p, o, SKILL_CFG.HEAL_WAVE_AMOUNT);
          this._purgeStatus(o);
        }
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r, life: 0.45, max: 0.45, kind: 11,
        });
        this._relicMemoire(p);
        return;
      }

      default: {
        p.cd2 = SKILL_CFG.DPS_OVERDRIVE_CD * p.mods.skillCdMul;
        p.skillUses[1]++;
        p.odT = SKILL_CFG.DPS_OVERDRIVE_TIME + p.mods.overdriveTime;
        p.odBonus = Math.max(p.odBonus, SKILL_CFG.DPS_OVERDRIVE_BASE);
        this._relicMemoire(p);
      }
    }
  }

  // UN ULTIME S'ANNONCE. L'appui arme une amorce ; l'effet part a son echeance,
  // et le joueur est engage — il n'y a pas d'annulation. La Salve verifie sa
  // cible A L'APPUI : sans ca elle brulerait son amorce pour rien, et
  // l'invariant « pas de recharge consommee sans cible » tomberait.
  _skill3(p) {
    if (p.downed || p.cd3 > 0 || p.ultT > 0) return;
    const tier = p.mods.skill3;
    if (tier <= 0) return;
    if (classAt(p.cls).id === "dps" && !this._salveCible(p)) return;

    p.cd3 = CARD_CFG[SKILL3_TABLE[classAt(p.cls).id]][tier - 1].cd * p.mods.skillCdMul;
    p.skillUses[2]++;
    p.ultT = CARD_CFG.SKILL3_WINDUP;
  }

  // LE BOSS EST UNE CIBLE DE SALVE. L'arene est balayee a son arrivee : une
  // acquisition qui ne regarde que la horde rend l'ultime du tireur
  // inutilisable pendant tout le combat.
  _salveCible(p) {
    const r2 = CARD_CFG.SALVE_RANGE * CARD_CFG.SALVE_RANGE;
    for (const e of this.enemies) {
      if (e.hp > 0 && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2) return true;
    }
    for (const boss of this._bossTargets()) {
      if ((boss.x - p.x) ** 2 + (boss.y - p.y) ** 2 <= r2) return true;
    }
    return false;
  }

  _ultimes(dt) {
    for (const p of this.players.values()) {
      if (p.ultT <= 0) continue;
      p.ultT -= dt;
      if (p.ultT > 0) continue;
      p.ultT = 0;
      if (p.downed) continue;
      this._ultFire(p);
    }
  }

  _ultFire(p) {
    const tier = p.mods.skill3;
    if (tier <= 0) return;
    // l'effet d'ECRAN et le marqueur pour les allies partent d'ici, une fois pour
    // les trois : dans un jeu a quatre, savoir qu'un coequipier vient de lacher
    // son ultime change tes propres decisions.
    this.effects.push({
      id: this._nextId++, x: p.x, y: p.y, r: 40,
      life: 0.5, max: 0.5, kind: 16, owner: p.id, n: tier,
    });

    switch (classAt(p.cls).id) {
      case "tank": {
        const c = CARD_CFG.SKILL3_ANCRE[tier - 1];
        const r = c.r * p.mods.areaMul;
        this.anchors.push({
          id: this._nextId++, x: p.x, y: p.y, r,
          life: c.time, max: c.time, owner: p.id, vuln: c.vuln,
          held: new Set(),
        });
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r, life: 0.5, max: 0.5, kind: 9,
        });
        return;
      }

      case "soigneur": {
        const c = CARD_CFG.SKILL3_SANCTUAIRE[tier - 1];
        const r = c.r * p.mods.areaMul;
        this.sancts.push({
          id: this._nextId++, x: p.x, y: p.y, r,
          life: c.time, max: c.time, owner: p.id,
          heal: c.heal, purge: c.purge,
          purged: new Set(),
        });
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r, life: 0.45, max: 0.45, kind: 11,
        });
        return;
      }

      default:
        this._salve(p, tier);
    }
  }

  // L'ATTRIBUTION EN TROIS PASSES est le coeur du lot : c'est la troisieme qui
  // fait la difference entre « six missiles » et « une salve ».
  _salve(p, tier) {
    const c = CARD_CFG.SKILL3_SALVE[tier - 1];
    const direct = CFG.BULLET_DAMAGE * p.mods.damageMul * p.mods.barrelDamageMul * c.mul;
    const tries = this._salveTries(p);
    if (tries.length === 0) return;

    const reserve = new Map();
    const cibles = [];
    const a0 = Math.atan2(p.aimY, p.aimX);
    // passe 2 · REPARTITION — une cible par missile tant qu'il reste des cibles,
    // par un curseur qui tourne. Sans lui, la garde de la passe 3 ne mord pas
    // avant longtemps et toute la salve retombe sur la cible la plus proche.
    let curseur = 0;
    for (let i = 0; i < c.missiles; i++) {
      let choisi = null;
      // passe 3 · GARDE ANTI-SURTUAGE — chaque missile RESERVE ses degats ; on
      // n'en attribue un de plus que si le deja-reserve ne suffit pas a tuer.
      for (let k = 0; k < tries.length; k++) {
        const t = tries[(curseur + k) % tries.length];
        if ((reserve.get(t.id) ?? 0) >= t.hp) continue;
        choisi = t;
        curseur = (curseur + k + 1) % tries.length;
        break;
      }
      // tout est sature : on DOUBLE au lieu de perdre le missile. Un ultime ne
      // doit jamais donner l'impression de gacher.
      if (!choisi) choisi = tries[i % tries.length];
      reserve.set(choisi.id, (reserve.get(choisi.id) ?? 0) + direct);
      cibles.push(choisi);
    }

    // LA GERBE S'ORDONNE PAR RELEVEMENT DE CIBLE. Distribuer les ecarts dans
    // l'ordre d'attribution lance des missiles a l'oppose de leur cible : la
    // poursuite pure ne rattrape pas, elle se met en orbite. Mesure : 4,4 cibles
    // distinctes sur 6, et monter le taux de virage n'y changeait rien.
    const ordre = cibles.map((t, i) => ({ t, i,
      rel: this._angleDiff(Math.atan2(t.e.y - p.y, t.e.x - p.x), a0) }));
    ordre.sort((u, v) => u.rel - v.rel);

    for (let i = 0; i < ordre.length; i++) {
      const choisi = ordre[i].t;
      const off = ordre.length === 1
        ? 0
        : (i / (ordre.length - 1) - 0.5) * CARD_CFG.SALVE_SPREAD * 2;
      const a = a0 + off;
      this.bullets.push({
        id: this._nextId++,
        x: p.x + Math.cos(a) * (CFG.PLAYER_RADIUS + 2),
        y: p.y + Math.sin(a) * (CFG.PLAYER_RADIUS + 2),
        vx: Math.cos(a) * CARD_CFG.SALVE_SPEED,
        vy: Math.sin(a) * CARD_CFG.SALVE_SPEED,
        life: CARD_CFG.SALVE_LIFE,
        dmg: direct,
        owner: p.id,
        pierce: 0, chain: 0, arc: 0, burn: 0,
        boom: direct * (c.blastMul / c.mul),
        boomR: c.blastR * p.mods.areaMul,
        hits: null, hit: null, inertia: 0, bounce: 0, dmg0: direct,
        missile: 1, cible: choisi.id, dumb: CARD_CFG.SALVE_DUMB_TIME,
        vuln: c.vuln ? 1 : 0,
      });
    }
  }

  // L'acquisition est a 360°, la VISEE departage : les cibles dans le cone du
  // reticule passent devant les autres a distance comparable.
  _salveTries(p) {
    const a0 = Math.atan2(p.aimY, p.aimX);
    const range = CARD_CFG.SALVE_RANGE;
    const out = [];
    const pousser = (e, hp) => {
      const dx = e.x - p.x, dy = e.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > range * range) return;
      const dansLeCone =
        Math.abs(this._angleDiff(Math.atan2(dy, dx), a0)) <= CARD_CFG.SALVE_CONE;
      out.push({ e, id: e.id, hp,
                 score: d2 * (dansLeCone ? 1 : CARD_CFG.SALVE_OFFCONE) });
    };
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      pousser(e, e.hp);
    }
    // les Jumeaux sont deux points d'application pour UNE reserve : la garde
    // anti-surtuage lit `this.boss.hp` des deux cotes.
    for (const boss of this._bossTargets()) pousser(boss, this.boss.hp);
    out.sort((a, b) => a.score - b.score);
    return out;
  }

  // AVEC SIX CENTS ENNEMIS QUI MEURENT VITE, la cible d'un missile sera souvent
  // morte avant l'impact : sans reacquisition les missiles finissent sur des
  // cadavres. Un missile ne poursuit jamais une cible morte.
  _guide(b, dt) {
    if (b.dumb > 0) { b.dumb -= dt; return; }

    let c = b.cibleRef;
    if (!c || c.hp <= 0 || c.id !== b.cible) {
      c = null;
      for (const e of this.enemies) if (e.id === b.cible) { c = e; break; }
      if (!c) for (const boss of this._bossTargets()) if (boss.id === b.cible) { c = boss; break; }
      b.cibleRef = c;
    }
    if (!c || c.hp <= 0) {
      c = this._salveReseek(b);
      if (!c) { b.life = 0; return; }
      b.cible = c.id;
      b.cibleRef = c;
    }

    const vers = Math.atan2(c.y - b.y, c.x - b.x);
    const cur = Math.atan2(b.vy, b.vx);
    const max = CARD_CFG.SALVE_TURN_RATE * dt;
    const d = this._angleDiff(vers, cur);
    const a = cur + Math.max(-max, Math.min(max, d));
    b.vx = Math.cos(a) * CARD_CFG.SALVE_SPEED;
    b.vy = Math.sin(a) * CARD_CFG.SALVE_SPEED;
  }

  _salveReseek(b) {
    const r2 = CARD_CFG.SALVE_RESEEK * CARD_CFG.SALVE_RESEEK;
    let best = null, bd = r2;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d2 = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
      if (d2 < bd) { bd = d2; best = e; }
    }
    for (const boss of this._bossTargets()) {
      const d2 = (boss.x - b.x) ** 2 + (boss.y - b.y) ** 2;
      if (d2 < bd) { bd = d2; best = boss; }
    }
    return best;
  }

  _heal(healer, target, amount) {
    if (amount <= 0 || target.downed) return 0;
    if (this._relicFlag(target, "noHeal")) return 0;
    amount *= healer.mods.healGivenMul ?? 1;

    if ((healer.mods.catalyse ?? 0) > 0 && healer !== target) {
      target.catalyseT = PROG_CFG.CATALYSE_TIME;
      target.catalyseMul = Math.max(target.catalyseMul, 1 + healer.mods.catalyse);
    }

    const missing = Math.max(0, target.maxHp - target.hp);
    const healed = Math.min(missing, amount);
    target.hp += healed;

    const over = amount - healed;
    if (over > 0) {
      const cap = target.mods.shieldPool + SKILL_CFG.HEAL_MODE_SHIELD_CAP;
      this._grantShield(target, over, cap);
    }

    healer.healDealt += amount;
    if (healer.mods.transfusion > 0 && healer !== target && !healer.downed) {
      healer.hp = Math.min(healer.maxHp, healer.hp + amount * healer.mods.transfusion);
    }
    return healed;
  }

  // ===================== LE LIEN DE SOIN =====================
  // Accrochage automatique, rupture apres un delai de grace, ALLIES D'ABORD.
  // Le lien ne rend AUCUN PV au soigneur : le soin de soi appartient a la vague,
  // qui l'inclut deja (`for (const o of this.players.values())`). Mettre la meme
  // fonction a deux endroits diluerait les deux. Consequence assumee : sans
  // allie, la posture est inerte — c'est un role de groupe.
  _healLinks(dt) {
    let siphonne = false;
    for (const p of this.players.values()) {
      // le SANCTUAIRE est un ULTIME, pas une posture : ses liens ne connaissent
      // ni plafond ni rupture, et ils survivent a la sortie du mode soin.
      if (p.downed) { p.links.length = 0; continue; }
      if (!p.healMode) {
        if (p.links.length) p.links = p.links.filter(l => l.sanct);
      } else {
        this._postureLinks(p, dt);
      }

      for (const l of p.links) {
        const c = l.cible;
        if (!c) continue;
        if (l.ennemi) {
          this._damage(c, CARD_CFG.SIPHON_DAMAGE * dt, p.id, 0, true);
          if (c.hp <= 0) siphonne = true;
          if (!p.downed) {
            p.hp = Math.min(p.maxHp, p.hp + CARD_CFG.SIPHON_RATE * dt);
          }
          continue;
        }
        if (c.downed) continue;
        this._heal(p, c, SKILL_CFG.HEAL_LINK_RATE * dt);
        // la purge se comptait en TOUCHES ; un lien continu la compte en TEMPS
        l.purge += dt;
        if (l.purge >= STATUS_CFG.PURGE_WINDOW) {
          l.purge = 0;
          this._purgeStatus(c);
        }
      }
    }
    if (this.sancts.length) this._sanctLinks();
    if (siphonne) this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  _postureLinks(p, dt) {
    const rMax = SKILL_CFG.HEAL_LINK_RADIUS * (p.mods.healBeamMul ?? 1);
    const r2 = rMax * rMax;
    const plafond = SKILL_CFG.HEAL_LINK_MAX + (p.mods.healLinks ?? 0);
    let poses = 0;

    for (let i = p.links.length - 1; i >= 0; i--) {
      const l = p.links[i];
      if (l.sanct) continue;
      poses++;
      // un ennemi mort sort du tableau mais l'objet survit : `hp` suffit a le
      // dire, et evite de balayer six cents corps par lien et par image.
      const c = l.ennemi ? l.cible : this.players.get(l.id);
      const vivant = !!c && (l.ennemi ? c.hp > 0 : true);
      if (!vivant) { p.links.splice(i, 1); poses--; continue; }
      l.cible = c;
      if ((c.x - p.x) ** 2 + (c.y - p.y) ** 2 <= r2) { l.grace = 0; continue; }
      l.grace += dt;
      if (l.grace >= SKILL_CFG.HEAL_LINK_GRACE) { p.links.splice(i, 1); poses--; }
    }

    // les allies ne se font JAMAIS supplanter : les ennemis ne comblent que
    // les liens restes libres.
    if (poses < plafond) {
      const pris = new Set(p.links.map(l => l.id));
      const libres = [];
      for (const o of this.players.values()) {
        if (o.id === p.id || pris.has(o.id)) continue;
        const d2 = (o.x - p.x) ** 2 + (o.y - p.y) ** 2;
        if (d2 <= r2) libres.push({ c: o, d2, ennemi: 0 });
      }
      libres.sort((a, b) => a.d2 - b.d2);
      for (const f of libres) {
        if (poses >= plafond) break;
        p.links.push({ id: f.c.id, ennemi: 0, grace: 0, purge: 0, cible: f.c });
        poses++;
      }
    }

    if (p.mods.siphon > 0 && poses < plafond) {
      const pris = new Set(p.links.map(l => l.id));
      const proies = [];
      for (const e of this.enemies) {
        if (e.hp <= 0 || pris.has(e.id)) continue;
        const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
        if (d2 <= r2) proies.push({ c: e, d2 });
      }
      proies.sort((a, b) => a.d2 - b.d2);
      for (const f of proies) {
        if (poses >= plafond) break;
        p.links.push({ id: f.c.id, ennemi: 1, grace: 0, purge: 0, cible: f.c });
        poses++;
      }
    }
  }

  // « la zone ou je peux tous vous tenir » : le Soigneur depasse enfin sa limite
  // de deux cibles, et les liens partent du DOME, ce qui le libere du centre.
  _sanctLinks() {
    for (const p of this.players.values()) {
      for (let i = p.links.length - 1; i >= 0; i--) {
        const l = p.links[i];
        if (!l.sanct) continue;
        const sa = this.sancts.find(s => s.id === l.sanct);
        const c = this.players.get(l.id);
        if (!sa || !c || c.downed
            || (c.x - sa.x) ** 2 + (c.y - sa.y) ** 2 > sa.r * sa.r) {
          p.links.splice(i, 1);
        } else {
          l.cible = c;
        }
      }
    }
    for (const sa of this.sancts) {
      const owner = this.players.get(sa.owner);
      if (!owner || owner.downed) continue;
      const pris = new Set(owner.links.filter(l => l.sanct === sa.id).map(l => l.id));
      for (const o of this.players.values()) {
        if (o.id === owner.id || o.downed || pris.has(o.id)) continue;
        if ((o.x - sa.x) ** 2 + (o.y - sa.y) ** 2 > sa.r * sa.r) continue;
        owner.links.push({ id: o.id, ennemi: 0, grace: 0, purge: 0, cible: o, sanct: sa.id });
      }
    }
  }

  _linkPayload() {
    let out = null;
    for (const p of this.players.values()) {
      if (p.links.length === 0) continue;
      for (const l of p.links) {
        if (!p.healMode && !l.sanct) continue;
        (out ??= []).push(l.sanct ? [p.id, l.id, l.ennemi, l.sanct] : [p.id, l.id, l.ennemi]);
      }
    }
    return out;
  }

  _skills(dt) {
    const kept = [];
    for (const bw of this.bulwarks) {
      bw.life -= dt;
      const owner = this.players.get(bw.owner);
      if (!bw.anchor && owner && !owner.downed) { bw.x = owner.x; bw.y = owner.y; }
      const gain = SKILL_CFG.TANK_BULWARK_SHIELD_RATE * (bw.rate ?? 1) * dt;

      for (const p of this.players.values()) {
        if (p.downed) continue;
        const inside = (p.x - bw.x) ** 2 + (p.y - bw.y) ** 2 <= bw.r * bw.r;
        const carapace = owner && p.id === owner.id && owner.mods.carapace > 0;
        if (inside && !bw.purged.has(p.id)) {
          bw.purged.add(p.id);
          this._purgeStatus(p);
        }
        if (!inside && !carapace) continue;
        const cap = p.mods.shieldPool + SKILL_CFG.TANK_BULWARK_SHIELD_CAP;
        this._grantShield(p, gain, cap);
      }

      if (bw.life > 0) kept.push(bw);
    }
    this.bulwarks = kept;

    if (this.anchors.length) {
      const keptAnchors = [];
      for (const an of this.anchors) {
        an.life -= dt;
        const leash = an.r * CARD_CFG.SKILL3_ANCRE_LEASH;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const d2 = (e.x - an.x) ** 2 + (e.y - an.y) ** 2;
          if (d2 <= an.r * an.r) an.held.add(e.id);
          else if (an.held.has(e.id) && d2 > leash * leash) {
            const d = Math.sqrt(d2) || 1;
            e.x = an.x + (e.x - an.x) / d * leash;
            e.y = an.y + (e.y - an.y) / d * leash;
          }
          if (an.vuln && an.held.has(e.id)) {
            e.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
          }
        }
        if (an.life > 0) keptAnchors.push(an);
      }
      this.anchors = keptAnchors;
    }

    if (this.sancts.length) {
      const keptSancts = [];
      for (const sa of this.sancts) {
        sa.life -= dt;
        const owner = this.players.get(sa.owner);
        for (const p of this.players.values()) {
          if (p.downed) continue;
          if ((p.x - sa.x) ** 2 + (p.y - sa.y) ** 2 > sa.r * sa.r) continue;
          if (sa.purge && !sa.purged.has(p.id)) {
            sa.purged.add(p.id);
            this._purgeStatus(p);
          }
          this._heal(owner ?? p, p, sa.heal * dt);
        }
        if (sa.life > 0) keptSancts.push(sa);
      }
      this.sancts = keptSancts;
    }

    const flying = [];
    for (const bo of this.bombs) {
      bo.t -= dt;
      bo.x += bo.vx * dt;
      bo.y += bo.vy * dt;
      this._clampToBounds(bo);
      if (bo.t <= 0) { bo.x = bo.tx ?? bo.x; bo.y = bo.ty ?? bo.y; this._bombBlast(bo); }
      else flying.push(bo);
    }
    this.bombs = flying;

    if (this.taunt) {
      const tank = this.players.get(this.taunt.id);
      if (this.time >= this.taunt.until || !tank || tank.downed) this.taunt = null;
    }
  }

  _bombBlast(bo) {
    const avant = this._causeBlast;
    this._causeBlast = true;
    try { this._bombBlastInterne(bo); } finally { this._causeBlast = avant; }
  }

  _bombBlastInterne(bo) {
    const owner = this.players.get(bo.owner);
    const mul = owner ? owner.mods.damageMul : 1;
    const dmg = SKILL_CFG.DPS_BOMB_DAMAGE * mul;
    const r = SKILL_CFG.DPS_BOMB_RADIUS
      * (owner ? owner.mods.areaMul * (owner.mods.bombRadiusMul ?? 1) : 1);

    const souffle = { id: this._nextId++, x: bo.x, y: bo.y, r,
                      life: 0.4, max: 0.4, kind: 12, n: 0 };
    this.effects.push(souffle);
    this._areaPull(bo.x, bo.y, r, bo.owner);

    const near = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d2 = (e.x - bo.x) ** 2 + (e.y - bo.y) ** 2;
      if (d2 <= r * r) near.push({ e, d2 });
    }
    near.sort((a, b) => a.d2 - b.d2);

    const vulnerable = owner && owner.mods.bombVulnerable > 0;
    let fauches = 0;
    for (let i = 0; i < near.length && i < SKILL_CFG.DPS_BOMB_MAX_TARGETS; i++) {
      if (vulnerable) near[i].e.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
      this._damage(near[i].e, dmg, bo.owner);
      if (near[i].e.hp <= 0) fauches++;
      this._blastAfter(owner, near[i].e);
    }

    for (const boss of this._bossTargets()) {
      if ((boss.x - bo.x) ** 2 + (boss.y - bo.y) ** 2 > r * r) continue;
      if (vulnerable) boss.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
      this._damage(boss, dmg * SKILL_CFG.DPS_BOMB_BOSS_MUL, bo.owner, 0, false, bo.x, bo.y);
    }
    souffle.n = fauches;
    this._blastPush(bo.x, bo.y, r, 1);
    this._hitMarks(bo.x, bo.y, r, dmg);
    this._blastGround(owner, bo.x, bo.y, r);

    if (owner && owner.mods.bombShards > 0) {
      const n = SKILL_CFG.DPS_BOMB_SHARDS;
      const speed = CFG.BULLET_SPEED;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        this.bullets.push({
          id: this._nextId++,
          x: bo.x, y: bo.y,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          life: SKILL_CFG.DPS_BOMB_SHARD_LIFE,
          dmg: dmg * SKILL_CFG.DPS_BOMB_SHARD_MUL,
          owner: bo.owner,
          pierce: 0, chain: 0, burn: 0, arc: 0, boom: 0,
          hits: null, hit: null, inertia: 0, bounce: 0,
          dmg0: dmg * SKILL_CFG.DPS_BOMB_SHARD_MUL,
        });
      }
    }

    this.enemies = this.enemies.filter(e => e.hp > 0);
  }


  _turrets(dt) {
    const kept = [];
    for (const tu of this.turrets) {
      tu.life -= dt;
      tu.fireCd -= dt;

      let best = null, bestD = CFG.TURRET_RANGE * CFG.TURRET_RANGE;
      for (const e of this.enemies) {
        const d = (e.x - tu.x) ** 2 + (e.y - tu.y) ** 2;
        if (d < bestD) { bestD = d; best = e; }
      }
      for (const boss of this._bossTargets()) {
        const d = (boss.x - tu.x) ** 2 + (boss.y - tu.y) ** 2;
        if (d < bestD) { bestD = d; best = boss; }
      }

      if (best) {
        const dx = best.x - tu.x, dy = best.y - tu.y;
        tu.ang = Math.atan2(dy, dx);
        if (tu.fireCd <= 0) {
          tu.fireCd = CFG.TURRET_CD;
          const d = Math.hypot(dx, dy) || 1;
          this.bullets.push({
            id: this._nextId++,
            x: tu.x + (dx / d) * (CFG.TURRET_RADIUS + 2),
            y: tu.y + (dy / d) * (CFG.TURRET_RADIUS + 2),
            vx: (dx / d) * CFG.BULLET_SPEED,
            vy: (dy / d) * CFG.BULLET_SPEED,
            life: CFG.BULLET_LIFE,
            dmg: tu.dmg,
            owner: tu.owner,
            pierce: 0,
            chain: 0,
            hit: null,
          });
        }
      }

      if (tu.life > 0) kept.push(tu);
    }
    this.turrets = kept;
  }

  // `hx`/`hy` : le POINT TOUCHE. Sur un boss il est ramene sur la silhouette,
  // sinon chiffres et etincelles naissent au centre d'un corps de 34 px de rayon
  // et le retour cesse de designer ce que la balle a fait.
  _damage(target, amount, ownerId, burn = 0, overTime = false, hx, hy) {
    if (!target || amount <= 0) return;
    const struck = target;
    if ((struck === this.boss || struck === this.boss2) && ownerId) {
      const owner = this.players.get(ownerId);
      if (owner) amount += this._relicSum(owner, "bossDamage");
    }
    if ((struck === this.boss || struck === this.boss2) && ownerId) {
      const owner = this.players.get(ownerId);
      if (owner) {
        amount *= Math.min(CARD_CFG.BOSS_DAMAGE_CAP,
          owner.mods.bossDamageMul
          + owner.mods.bossDamagePerBar * (this.boss?.phase ?? 0));
      }
    }
    if (this.boss2 && ownerId && (struck === this.boss || struck === this.boss2)) {
      struck.focus = ownerId;
      struck.focusAt = this.time;
    }
    if (this.boss2 && target === this.boss2) target = this.boss;
    /* UNE BALLE EN VOL SURVIT A SA CIBLE. Un jumeau qui disparait laisse des
       references derriere lui : sans cette garde on ecrit `hp -= x` dans un
       cadavre, ce qui rend `undefined - x`, donc NaN, donc du silence — le defaut
       exact que ce depot documente. La redirection doit avoir eu lieu AVANT. */
    if (!target || !Number.isFinite(target.hp)) return;
    if (target.vulnUntil > this.time) amount *= CARD_CFG.VULNERABLE_MUL;
    if (ownerId && this.hazards.length) {
      const o = this.players.get(ownerId);
      const brut = o ? this._relicSum(o, "hazardDamage") : 0;
      if (brut > 0 && this._inHazard(target)) amount += brut;
    }
    if ((target.rootUntil ?? 0) > this.time && ownerId) {
      const o = this.players.get(ownerId);
      if (o && o.mods.rootDamage > 0) amount *= 1 + o.mods.rootDamage;
    }
    if (target.aura > 0) amount *= 1 - target.aura;
    if (target.hitAt !== undefined && !overTime) target.hitAt = this.time;
    const owner = this.players.get(ownerId);
    this.lastCrit = false;
    if (owner) {
      amount *= owner.power;
      if (!overTime && owner.dashCrits > 0) {
        owner.dashCrits--;
        this.lastCrit = true;
        amount *= owner.mods.critMul;
      } else if (!overTime && Math.random() < Math.min(CARD_CFG.CRIT_CHANCE_CAP,
          owner.mods.critChance + this._relicSum(owner, "critFlat"))) {
        this.lastCrit = true;
        amount *= owner.mods.critMul + this._relicSum(owner, "critMulFlat");
        if (owner.mods.critVuln) target.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
      }

      if (owner.mods.catalyseur > 0 && enemyStatusMask(target, this.time) !== 0) {
        amount *= 1 + owner.mods.catalyseur;
      }
    }

    // LE DPS EXCEDENTAIRE EST PERDU. Il etait mis en banque, donc rendu a la
    // rupture : le palier cadencait la mort du boss sans jamais la retarder, et
    // les couches tardives ne se jouaient pas. Ce qui depasse le plancher ne
    // compte nulle part — ni en PV, ni en credit, ni en experience.
    if (target === this.boss) {
      const plancher = this._bossFloor(target);
      if (plancher !== null) amount = Math.max(0, Math.min(amount, target.hp - plancher));
    }

    if (owner) {
      owner.damageDealt += amount;
      /* CE QUE L'ARME DELIVRE : ni les invocations, ni les competences, ni les
         zones — elles ont leur propre echelle et ne se comparent pas entre armes.
         Et ce qui est ABSORBE, pas ce qui est envoye : un souffle sur dix corps
         mourants comptait dix fois sa valeur pleine, donc toute arme de zone se
         mesurait a la hauteur de son surtuage. */
      if (this._armeDe === ownerId) {
        owner.hf.armeDegats += Math.min(amount, Math.max(0, target.hp));
        owner.hf.armeCibles++;
      }
      if (target === this.boss) {
        let cumul = this.bossDmg.get(ownerId);
        if (!cumul) this.bossDmg.set(ownerId, cumul = { d: 0, crit: 0, x: 0, y: 0 });
        cumul.d += amount;
        if (this.lastCrit) cumul.crit += amount;
        const pt = this._surfacePoint(struck, hx, hy);
        cumul.x = pt.x;
        cumul.y = pt.y;
      }
      if (owner.mods.lifesteal > 0) this._lifesteal(owner, amount * owner.mods.lifesteal);
    }

    if (target === this.boss && target.maxHp > 0) {
      const part = Math.min(amount, Math.max(0, target.hp)) / target.maxHp;
      this._addXp(part * CFG.BOSS_XP_BASE * this._xpTimeMul());
    }

    // L'EGIDE ABSORBE EN DERNIER, apres critique, vol de vie et credit d'XP :
    // ce que le joueur a produit reste ce qu'il a produit, seule la CHAIR est
    // epargnee. L'absorber en amont ferait mentir les chiffres de degats et
    // le vol de vie a la fois.
    if (target.shield > 0) {
      const pris = Math.min(target.shield, amount);
      target.shield -= pris;
      amount -= pris;
    }

    target.hp -= amount;

    if (target === this.boss) target.lastHitBy = ownerId;

    if (!overTime && target.hitSeq !== undefined) {
      target.hitSeq = (target.hitSeq + 1) % 10;
      if (this.lastCrit && target.critSeq !== undefined) {
        target.critSeq = (target.critSeq + 1) % 10;
      }
    }
    if (this.lastCrit && owner) {
      const hf = owner.hf;
      const sec = Math.floor(this.time);
      this._hfFenetre(hf, sec);
      hf.critFen[sec % HF_CFG.FENETRE_CRIT]++;
      hf.critSom++;
      if (hf.critSom > hf.critBest) hf.critBest = hf.critSom;
    }

    if (burn > 0) {
      if (!target.burn || burn >= target.burn.dmg) {
        target.burn = { dmg: burn, t: CARD_CFG.BURN_TIME, owner: ownerId };
      } else {
        target.burn.t = CARD_CFG.BURN_TIME;
      }
    }

    if (target === this.boss) {
      if (target.hp <= 0) this._killBoss(ownerId);
      return;
    }
    const seuilExec = owner
      ? owner.mods.execThreshold + owner.mods.execPerBar * this.barsBroken
      : 0;
    if (target.hp > 0 && seuilExec > 0 && !target.noExec
        && target.maxHp > 0 && target.hp <= target.maxHp * seuilExec) {
      target.hp = 0;
      if (owner.mods.execHeal > 0 && !owner.downed) {
        owner.hp = Math.min(owner.maxHp, owner.hp + owner.mods.execHeal);
      }
    }
    if (target.hp <= 0) {
      const crit = this.lastCrit;
      this._killEnemy(target, ownerId);
      this.lastCrit = crit;
    }
  }

  _surfacePoint(cible, hx, hy) {
    if (hx === undefined || hy === undefined) return { x: cible.x, y: cible.y };
    const dx = hx - cible.x, dy = hy - cible.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return { x: cible.x, y: cible.y };
    const k = Math.min(1, (CFG.BOSS_RADIUS * 0.86) / d);
    return { x: cible.x + dx * k, y: cible.y + dy * k };
  }

  // [13] LA MATIERE BOUGE. En vue de dessus rien d'autre ne dit la puissance :
  // quinze ennemis chasses vers l'exterieur se voient, quinze qui disparaissent
  // non. L'impulsion est une VITESSE qui retombe, pas une teleportation — c'est
  // elle qui tient le trou ouvert le temps qu'on le voie.
  _blastPush(x, y, r, force = 1) {
    const r2 = r * r;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - x, dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const d = Math.sqrt(d2) || 1;
      const k = 1 - d / r;
      const v = CFG.BLAST_KNOCK * force * k * k;
      e.kx += (dx / d) * v;
      e.ky += (dy / d) * v;
    }
    if (this.blastHoles.length >= CFG.BLAST_HOLE_MAX) this.blastHoles.shift();
    this.blastHoles.push({
      x, y, r: r * CFG.BLAST_HOLE_MUL, until: this.time + CFG.BLAST_HOLE_TIME,
    });
  }

  // [14] le trou dans la foule EST la recompense : aux debits du lot A il se
  // comble avant d'avoir ete vu. Ne concerne que ce qui NAIT dedans, jamais ce
  // qui y revient a pied.
  _dansUnTrou(x, y) {
    for (let i = this.blastHoles.length - 1; i >= 0; i--) {
      const h = this.blastHoles[i];
      if (h.until <= this.time) { this.blastHoles.splice(i, 1); continue; }
      if ((x - h.x) ** 2 + (y - h.y) ** 2 <= h.r * h.r) return true;
    }
    return false;
  }

  _momentum(p) {
    const m = p.mods;
    const cata = p.catalyseT > 0 ? p.catalyseMul : 1;
    p.rally = 1;
    if (m.elanStep === 0 && m.packStep === 0 && m.ragePerKill === 0
        && m.lowHpDamage === 0 && m.allyDamageStep === 0 && m.downedRally === 0
        && m.eventDamage === 0 && p.oathT <= 0) {
      p.power = cata;
      return;
    }
    let bonus = 0;
    if (m.elanStep > 0) bonus += Math.min(m.elanMax, m.elanStep * p.elanT);
    if (m.packStep > 0) {
      let near = 0;
      const r2 = CARD_CFG.PACK_RADIUS ** 2;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2) near++;
      }
      for (const b of this._bossTargets()) {
        if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 <= r2) near++;
      }
      bonus += Math.min(m.packMax, m.packStep * near);
    }
    if (p.rageStacks > 0) bonus += m.ragePerKill * p.rageStacks;
    if (m.lowHpDamage > 0 && p.hp <= p.maxHp * CARD_CFG.SOUFFLE_HP) {
      bonus += m.lowHpDamage;
    }
    if (m.allyDamageStep > 0) {
      bonus += m.allyDamageStep * this._alliesNear(p);
    }
    // le ralliement porte la VITESSE aussi : `p.rally` est relu par `_players`
    if (m.downedRally > 0 && this._someoneDowned(p)) {
      bonus += m.downedRally;
      p.rally = 1 + m.downedRally;
    }
    if (p.oathT > 0) bonus += p.oathMul;
    if (m.eventDamage > 0 && this.event) bonus += m.eventDamage;
    p.power = (1 + bonus) * cata;
  }

  // point de passage unique du BOUCLIER GAGNE : « Bouclier partage » s'y branche,
  // et le partage ne se repartage pas (`relais` a false)
  _grantShield(p, amount, cap, relais = true) {
    if (amount <= 0) return 0;
    const gain = Math.max(0, Math.min(cap - p.shield, amount));
    if (gain <= 0) return 0;
    p.shield += gain;
    if (relais && p.mods.shieldShare > 0) {
      let cible = null, best = Infinity;
      for (const o of this.players.values()) {
        if (o === p || o.downed) continue;
        const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2;
        if (d < best) { best = d; cible = o; }
      }
      if (cible) {
        const capAllie = cible.mods.shieldPool + SKILL_CFG.HEAL_MODE_SHIELD_CAP;
        this._grantShield(cible, gain * p.mods.shieldShare, capAllie, false);
      }
    }
    return gain;
  }

  _alliesNear(p) {
    const r2 = CARD_CFG.ALLY_RADIUS ** 2;
    let near = 0;
    for (const o of this.players.values()) {
      if (o === p || o.downed) continue;
      if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 <= r2) near++;
    }
    return near;
  }

  _someoneDowned(p) {
    for (const o of this.players.values()) if (o !== p && o.downed) return true;
    return false;
  }

  _lifesteal(p, amount) {
    if (p.downed) return;
    const heal = Math.min(amount, p.timers.lifesteal);
    if (heal <= 0) return;
    p.timers.lifesteal -= heal;
    p.hp = Math.min(p.maxHp, p.hp + heal);
  }

  _areaPull(x, y, r, ownerId) {
    const owner = this.players.get(ownerId);
    if (!owner || !owner.mods.areaPull) return;
    const r2 = r * r;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = x - e.x, dy = y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const d = Math.sqrt(d2);
      if (d < 1) continue;
      const k = Math.min(CARD_CFG.SINGULARITE_PULL, d) / d;
      e.x += dx * k;
      e.y += dy * k;
    }
    this._separateFromPlayers();
  }

  /* `ang` EST LE SENS D'UN SOUFFLE, ET TOUS N'EN ONT PAS. Un obus percute un
     corps et sa matiere continue devant lui ; une grenade retombe et n'a plus de
     sens du tout. `undefined` dit « radial », et c'est la difference entre les
     deux armes explosives — celle qu'on lit sans compter les degats.
     Le sens se releve sur le VOL et jamais sur la visee : un projectile qui a
     rebondi n'arrive plus d'ou il est parti. */
  _sensBoom(b) { return b.lob ? undefined : Math.atan2(b.vy, b.vx); }

  _explode(x, y, dmg, ownerId, rayon, bossMul = 1, ang = undefined) {
    const boomAvant = this._causeBlast;
    this._causeBlast = true;
    try { return this._explodeInterne(x, y, dmg, ownerId, rayon, bossMul, ang); }
    finally { this._causeBlast = boomAvant; }
  }

  _explodeInterne(x, y, dmg, ownerId, rayon, bossMul = 1, ang = undefined) {
    const owner = this.players.get(ownerId);
    const r = rayon || CARD_CFG.GRENADE_RADIUS * (owner ? owner.mods.areaMul : 1);
    const souffle = { id: this._nextId++, x, y, r, life: 0.35, max: 0.35, kind: 7, n: 0,
                      ang };
    this.effects.push(souffle);

    this._areaPull(x, y, r, ownerId);
    const r2 = r * r;
    let fauches = 0;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 <= r2) {
        this._damage(e, dmg, ownerId);
        if (e.hp <= 0) fauches++;
        this._blastAfter(owner, e);
      }
    }
    for (const boss of this._bossTargets()) {
      if ((boss.x - x) ** 2 + (boss.y - y) ** 2 <= r2) {
        this._damage(boss, dmg * bossMul, ownerId, 0, false, x, y);
      }
    }
    // le souffle d'un JOUEUR casse le cristal — sans quoi le lance-grenades,
    // dont le direct est nul, ne peut pas en casser un du tout. Celui d'un
    // kamikaze non : la horde ne ramasse pas la monnaie a la place de l'equipe.
    if (owner) {
      for (const h of this.harvests) {
        if ((h.x - x) ** 2 + (h.y - y) ** 2 <= r2) this._harvestDamage(h, dmg);
      }
    }
    souffle.n = fauches;
    this._hitMarks(x, y, r, dmg, ownerId);
    this._blastGround(owner, x, y, r);
    this._blastPush(x, y, r, 0.7);
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  // « Etau » et « Terrain conquis » se branchent sur les TROIS souffles du
  // joueur : l'explosion, l'onde et la bombe. Le plan demandait un `requires` de
  // zone : aucune carte n'en cree, elles viennent des competences et de l'arme.
  _blastAfter(owner, e) {
    if (owner && owner.mods.blastRoot > 0) this._rootEnemy(e, owner.mods.blastRoot);
    /* REACTION EN CHAINE : un corps tue par le souffle explose a son tour. La
       profondeur est BORNEE et non laissee a la geometrie — sans plafond, une
       nuee serree fait exploser toute la vue en une image. */
    if (owner && owner.mods.grenadeChaine > 0 && e.hp <= 0
        && this._chaineProf < CARD_CFG.CHAINE_PROF_MAX) {
      this._chaineProf++;
      try {
        this._explode(e.x, e.y, owner.mods.damageMul * CARD_CFG.CHAINE_DMG,
                      owner.id, CARD_CFG.CHAINE_RAYON * owner.mods.areaMul);
      } finally { this._chaineProf--; }
    }
  }

  _blastGround(owner, x, y, r) {
    if (!owner || !(owner.mods.blastGround > 0)) return;
    this._groundZone(x, y, r * 0.7, CARD_CFG.TERRAIN_DOT, owner.mods.blastGround,
                     owner.id, SOL_JOUEUR);
  }

  _dashVuln(p) {
    const r = (CFG.PLAYER_RADIUS + 6) * p.mods.dashVuln;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = e.r + r;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > d * d) continue;
      e.vulnUntil = Math.max(e.vulnUntil ?? 0, this.time + CARD_CFG.CONTRE_PIED_TIME);
    }
  }

  _rootEnemy(e, time) {
    e.rootUntil = Math.max(e.rootUntil ?? 0, this.time + time);
  }

  _wave(x, y, radius, dmg, ownerId) {
    const owner = this.players.get(ownerId);
    if (owner) radius *= owner.mods.areaMul;
    const onde = { id: this._nextId++, x, y, r: radius, life: 0.35, max: 0.35, kind: 8, n: 0 };
    this.effects.push(onde);

    const r2 = radius * radius;
    let fauches = 0;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 <= r2) {
        this._damage(e, dmg, ownerId);
        if (e.hp <= 0) fauches++;
        this._blastAfter(owner, e);
      }
    }
    for (const boss of this._bossTargets()) {
      if ((boss.x - x) ** 2 + (boss.y - y) ** 2 <= r2) {
        this._damage(boss, dmg, ownerId, 0, false, x, y);
      }
    }
    onde.n = fauches;
    this._hitMarks(x, y, radius, dmg, ownerId);
    this._blastGround(owner, x, y, radius);
    this._blastPush(x, y, radius, 0.55);
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  _pulse(p) {
    this._wave(p.x, p.y, CARD_CFG.PULSAR_RADIUS,
      CARD_CFG.PULSAR_DAMAGE * this._summonMul(p), p.id);
  }

  _dashTrail(p) {
    const r = CARD_CFG.VIF_ARGENT_RADIUS;
    const dmg = p.mods.dashTrail * p.mods.damageMul;
    for (const e of this.enemies) {
      if (e.hp <= 0 || p.dashHits.has(e.id)) continue;
      const rr = r + e.r;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > rr * rr) continue;
      p.dashHits.add(e.id);
      this._damage(e, dmg, p.id);
    }
    const rb = r + CFG.BOSS_RADIUS;
    for (const boss of this._bossTargets()) {
      if (p.dashHits.has(boss.id)) continue;
      if ((boss.x - p.x) ** 2 + (boss.y - p.y) ** 2 > rb * rb) continue;
      p.dashHits.add(boss.id);
      this._damage(boss, dmg, p.id, 0, false, p.x, p.y);
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  _arc(origin, dmg, ownerId) {
    const seen = new Set([origin.id]);
    let src = origin;

    for (let i = 0; i < CARD_CFG.CHAIN_TARGETS; i++) {
      let best = null, bestD = CFG.RICOCHET_RADIUS * CFG.RICOCHET_RADIUS;
      for (const e of this.enemies) {
        if (e.hp <= 0 || seen.has(e.id)) continue;
        const d = (e.x - src.x) ** 2 + (e.y - src.y) ** 2;
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) break;

      seen.add(best.id);
      this.effects.push({
        id: this._nextId++,
        x: src.x, y: src.y, x2: best.x, y2: best.y,
        r: 0, life: 0.22, max: 0.22, kind: 3, n: i + 2,
      });
      this._damage(best, dmg * CARD_CFG.CHAIN_MUL, ownerId);
      src = best;
    }
  }

  _orbiters(dt) {
    for (const p of this.players.values()) {
      if (!p.mods.orbiters || p.downed) continue;
      if (!p.orbitHits) p.orbitHits = new Map();

      for (const [id, t] of p.orbitHits) {
        const left = t - dt;
        if (left <= 0) p.orbitHits.delete(id); else p.orbitHits.set(id, left);
      }

      const n = p.mods.orbiters;
      const dmg = CARD_CFG.ORBIT_DAMAGE * this._summonMul(p) * p.mods.orbiterDamageMul;

      for (let i = 0; i < n; i++) {
        const a = this.time * CARD_CFG.ORBIT_SPEED + (i / n) * Math.PI * 2;
        const bx = p.x + Math.cos(a) * CARD_CFG.ORBIT_RADIUS;
        const by = p.y + Math.sin(a) * CARD_CFG.ORBIT_RADIUS;

        for (const e of this.enemies) {
          if (e.hp <= 0 || p.orbitHits.has(e.id)) continue;
          const rr = e.r + 10;
          if ((e.x - bx) ** 2 + (e.y - by) ** 2 <= rr * rr) {
            p.orbitHits.set(e.id, CARD_CFG.ORBIT_HIT_CD);
            this._damage(e, dmg, p.id);
          }
        }
        for (const boss of this._bossTargets()) {
          if (p.orbitHits.has(boss.id)) continue;
          const rr = CFG.BOSS_RADIUS + 10;
          if ((boss.x - bx) ** 2 + (boss.y - by) ** 2 <= rr * rr) {
            p.orbitHits.set(boss.id, CARD_CFG.ORBIT_HIT_CD);
            this._damage(boss, dmg, p.id, 0, false, bx, by);
          }
        }
      }
      this.enemies = this.enemies.filter(e => e.hp > 0);
    }
  }

  _drones(dt) {
    const want = new Map();
    for (const p of this.players.values()) {
      const swarm = p.mods.swarm + (p.relics.has("essaim_captif") ? 1 : 0);
      if (p.mods.drones || swarm > 0) {
        want.set(p.id, { sup: p.mods.drones, swarm });
      }
    }

    const have = new Map();
    for (const d of this.drones) {
      const h = have.get(d.owner) || { sup: 0, swarm: 0 };
      if (d.kind === 0) h.sup++; else h.swarm++;
      have.set(d.owner, h);
    }
    for (const [id, w] of want) {
      const h = have.get(id) || { sup: 0, swarm: 0 };
      for (let i = h.sup; i < w.sup; i++) this.drones.push(this._makeDrone(id, 0, i));
      for (let i = h.swarm; i < w.swarm; i++) this.drones.push(this._makeDrone(id, 1, i));
    }

    const kept = [];
    for (const d of this.drones) {
      const p = this.players.get(d.owner);
      const w = want.get(d.owner);
      if (!p || !w) continue;
      if (d.kind === 0 ? d.slot >= w.sup : d.slot >= w.swarm) continue;

      if (d.dead > 0) {
        d.dead -= dt;
        kept.push(d);
        continue;
      }

      if (d.kind === 0) this._droneSupport(d, p, dt);
      else this._droneSwarm(d, p, dt);
      kept.push(d);
    }
    this.drones = kept;
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  _makeDrone(owner, kind, slot) {
    return {
      id: this._nextId++,
      owner, kind, slot,
      x: 0, y: 0, ang: 0,
      fireCd: 0,
      dead: 0,
      target: 0,
    };
  }

  _droneSupport(d, p, dt) {
    const a = this.time * CARD_CFG.DRONE_SPEED + (d.slot / 2) * Math.PI * 2;
    d.x = p.x + Math.cos(a) * CARD_CFG.DRONE_ORBIT;
    d.y = p.y + Math.sin(a) * CARD_CFG.DRONE_ORBIT;
    d.fireCd -= dt;
    if (p.downed) return;

    const best = this._nearestTarget(d.x, d.y, CARD_CFG.DRONE_RANGE);
    if (!best) return;
    d.ang = Math.atan2(best.y - d.y, best.x - d.x);
    if (d.fireCd > 0) return;

    d.fireCd = CARD_CFG.DRONE_CD;
    this.bullets.push({
      id: this._nextId++,
      x: d.x, y: d.y,
      vx: Math.cos(d.ang) * CFG.BULLET_SPEED,
      vy: Math.sin(d.ang) * CFG.BULLET_SPEED,
      life: CFG.BULLET_LIFE,
      dmg: CFG.BULLET_DAMAGE * this._summonMul(p) * CARD_CFG.DRONE_DAMAGE_MUL,
      owner: p.id,
      pierce: 0, chain: 0, burn: 0, arc: 0, boom: 0,
      hits: null, hit: null,
    });
  }

  _droneSwarm(d, p, dt) {
    const target = d.target ? this._enemyById(d.target) : null;

    if (!target) {
      d.target = 0;
      const a = this.time * CARD_CFG.SWARM_SPEED + (d.slot / Math.max(1, p.mods.swarm)) * Math.PI * 2;
      d.x = p.x + Math.cos(a) * CARD_CFG.SWARM_ORBIT;
      d.y = p.y + Math.sin(a) * CARD_CFG.SWARM_ORBIT;
      d.ang = a + Math.PI / 2;
      if (p.downed) return;
      const found = this._nearestTarget(d.x, d.y, 300);
      if (found && found !== this.boss && found !== this.boss2) d.target = found.id;
      return;
    }

    const dx = target.x - d.x, dy = target.y - d.y;
    const dist = Math.hypot(dx, dy) || 1;
    d.ang = Math.atan2(dy, dx);
    const step = 620 * dt;
    d.x += (dx / dist) * step;
    d.y += (dy / dist) * step;

    if (dist <= target.r + 12) {
      this._damage(target, CARD_CFG.SWARM_DAMAGE * this._summonMul(p), p.id);
      d.dead = CARD_CFG.SWARM_RESPAWN;
      d.target = 0;
    }
  }

  _enemyById(id) {
    for (const e of this.enemies) if (e.id === id && e.hp > 0) return e;
    return null;
  }

  _nearestTarget(x, y, range) {
    let best = null, bestD = range * range;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) { bestD = d; best = e; }
    }
    for (const boss of this._bossTargets()) {
      const d = (boss.x - x) ** 2 + (boss.y - y) ** 2;
      if (d < bestD) { bestD = d; best = boss; }
    }
    return best;
  }


  _enemyCap() {
    return enemyCap(this.diffIndex, this.players.size);
  }

  _pickType() {
    const counts = new Array(ENEMY_TYPES.length).fill(0);
    for (const e of this.enemies) counts[e.type]++;

    const minute = this.hordeMinutes();
    const pool = typesFor(this.diffIndex);
    const cap = this._enemyCap();
    let avail = pool.filter(i =>
      minute >= ENEMY_TYPES[i].minMin
      && counts[i] < ENEMY_TYPES[i].share * cap);
    if (avail.length === 0) avail = [0];
    let total = 0;
    for (const i of avail) total += ENEMY_TYPES[i].weight;
    let roll = Math.random() * total;
    for (const i of avail) {
      roll -= ENEMY_TYPES[i].weight;
      if (roll <= 0) return ENEMY_TYPES[i];
    }
    return ENEMY_TYPES[0];
  }

  _spawnEnemy(typeIndex = -1, x = null, y = null, elite = false, geom = "bords") {
    if (this.enemies.length >= this._enemyCap()) return null;
    let ti = typeIndex;
    if (ti >= 0) {
      ti = adaptType(ti, this.hordeMinutes());
      if (ti < 0 || !typesFor(this.diffIndex).includes(ti)) ti = 0;
    }
    const base = ti >= 0 ? ENEMY_TYPES[ti] : this._pickType();
    if (ti < 0) ti = ENEMY_TYPES.indexOf(base);
    // LES STATISTIQUES D'APPARITION VIENNENT DE LA LIGNE DE BASE, LE
    // COMPORTEMENT DE LA VARIANTE : une elite ne vole ni le quota ni le score de
    // son type, mais elle demarre avec SES cadences et SON arc.
    const t = defDe(ti, elite);

    const past = this.hordeMinutes();
    const baseHp = (CFG.ENEMY_HP_BASE + past * CFG.ENEMY_HP_MIN_RAMP)
      * (1 + CFG.WAVE_HP_POWER_K * (this._teamPower() - 1))
      * this.diff.hp;
    const pos = x === null ? this._spawnPoint(geom, base.r) : { x, y };
    const hp = baseHp * base.hpMul * (elite ? CFG.ELITE_HP_MUL : 1);
    const e = {
      id: this._nextId++,
      type: ti,
      elite: elite ? 1 : 0,
      x: pos.x,
      y: pos.y,
      hp,
      maxHp: hp,
      speed: enemySpeed(ti, past, this.diffIndex, 0.9 + Math.random() * 0.2, elite),
      r: elite ? base.r * CFG.ELITE_RADIUS_MUL : base.r,
      ang: Math.atan2(CFG.ARENA_H / 2 - pos.y, CFG.ARENA_W / 2 - pos.x),
      shootCd: t.shootCd ? t.shootCd * (0.5 + Math.random()) : 0,
      aimT: 0,
      shield: 0, shieldMax: 0, regen: 0, egide: 0,
      pair: 0, lienT: 0,
      poseX: 0, poseY: 0,
      aimAng: 0,
      standoff: t.standoff ?? 200,
      traits: traitsOf(this.diffIndex, ti),
      dashCd: TRAIT_CFG.DASH_CD * (0.4 + Math.random()),
      dashWarn: 0,
      dashT: 0,
      trailAt: 0,
      aura: 0,
      shieldArc: t.shieldArc ? (t.shieldArc * Math.PI) / 180 : 0,
      healT: t.healInterval ?? 0,
      fireT: 0,
      fleeT: 0,
      hitAt: -99,
      hitSeq: 0,
      critSeq: 0,
      kx: 0,
      ky: 0,
      statusAt: 0,
      noExec: 0,
      hunt: 0,
      xpWorth: 1,
      scoreWorth: 1,
      navT: 0,
      navCible: 0,
      navAncre: -1,
      navX: 0, navY: 0,
      masse: masseDe(elite ? base.r * CFG.ELITE_RADIUS_MUL : base.r),
      ecart: ecartDe(t),
      flanc: t.flanc ?? 0,
    };
    // le test de visibilite est ECHELONNE sur `LOS_PERIOD` images : une vague
    // qui apparait d'un bloc les ferait sinon tomber tous sur la meme.
    e.navT = e.id % NAV_CFG.LOS_PERIOD;
    this.enemies.push(e);
    return e;
  }

  _segmentTick(dt) {
    if (this.boss || this.bossPending) return;

    this.hordeTime += dt;

    if (this.event) {
      this.event.t -= dt;
      if (this.event.id === EV_CHASSE && this.quarry === 0) this._closeEvent(true);
    }

    const b = Math.min(TL_CFG.BEATS - 1, Math.floor(this.hordeTime / TL_CFG.BEAT_TIME));
    if (b !== this.beat) { this.beat = b; this._startBeat(); }

    if (this.hordeTime >= TL_CFG.SEGMENT_TIME) this._endSegment();
  }

  get biomeNu() { return !!this.boss || this.bossPending; }
  get obstacles() { return this.biomeNu ? EMPTY_LIST : this._biomeObstacles; }
  get hazards() { return this.biomeNu ? EMPTY_LIST : this._biomeHazards; }

  hordeMinutes() {
    return ((this.segment - 1) * TL_CFG.SEGMENT_TIME + this.hordeTime) / 60;
  }

  _beat() {
    const alive = Math.max(1, this.aliveCount());
    const c = this._beatCache;
    if (c && c.alive === alive && c.seg === this.segment && c.beat === this.beat) {
      return c.entry;
    }
    const entry = adaptEntry(beatAt(this.diff.script, this.segment, this.beat), alive);
    this._beatCache = { alive, seg: this.segment, beat: this.beat, entry };
    return entry;
  }

  _startBeat() {
    this.spawnAcc = 0;
    this.packLeft = 0;
    this.beatSide = Math.floor(Math.random() * 4);


    for (const p of this.players.values()) p.relicMemoireUsed = 0;

    this._closeEvent(true);
    this._openEvent();
  }

  _openEvent() {
    const entry = this._beat();
    if (entry.event === undefined) return;
    const id = adaptEvent(entry.event, Math.max(1, this.aliveCount()));
    if (id < 0) return;
    const def = eventAt(id);
    if (!def) return;

    this.event = { id, t: TL_CFG.BEAT_TIME, max: TL_CFG.BEAT_TIME };
    this.alerts.push({ event: id, level: def.level, dur: TL_CFG.EVENT_ANNOUNCE });
    if (this.alerts.length > 16) this.alerts.shift();

    if (id === EV_CHASSE) {
      this._sweepEnemies();
      this.effects.push({
        id: this._nextId++,
        x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2,
        r: Math.hypot(CFG.ARENA_W, CFG.ARENA_H) / 2, life: 0.6, max: 0.6, kind: 1,
      });
      this._spawnQuarry();
    }
  }

  _spawnQuarry() {
    const e = this._spawnEnemy(2, CFG.ARENA_W / 2, 120, true, "bords");
    if (!e) return;
    const crowd = this.aliveCrowd();
    const hp = CFG.BOSS_HP_BASE * Math.pow(crowd, 1.15)
      * this._bossHpRamp()
      * CFG.BOSS_HP_MUL * this.diff.boss * TL_CFG.QUARRY_HP_MUL;
    e.hp = e.maxHp = hp;
    e.r *= TL_CFG.QUARRY_SIZE_MUL;
    e.speed *= TL_CFG.QUARRY_SPEED_MUL;
    e.noExec = 1;
    e.xpWorth = TL_CFG.QUARRY_XP_WORTH;
    this.quarry = e.id;
  }

  _closeEvent(parBeat) {
    if (!this.event) return;
    const id = this.event.id;
    const gagne = parBeat && (id !== EV_CHASSE || this.quarry === 0);
    this.event = null;
    this.quarry = 0;
    if (gagne) this._eventReward();
  }

  _eventReward() {
    for (const p of this.players.values()) {
      p.hp = p.maxHp;
      if (p.mods.shieldPool > p.shield) p.shield = p.mods.shieldPool;
      if (p.downed) { p.downed = false; p.revive = 0; }
      this.effects.push({
        id: this._nextId++,
        x: p.x, y: p.y, r: 70, life: 0.5, max: 0.5, kind: 4,
      });
    }
  }

  _endSegment() {
    this.hordeTime = TL_CFG.SEGMENT_TIME;
    this.bossPending = true;
    this._closeEvent(false);
  }

  _nextSegment() {
    if (this.segment >= TL_CFG.SEGMENTS) {
      this.victory = true;
      this.gameOver = true;
      return;
    }
    for (const p of this.players.values()) {
      if (p.hf.segSain) p.hf.segmentsSains++;
      p.hf.segSain = 1;
    }
    this.segment++;
    this.hordeTime = 0;
    this.beat = 0;
    const avant = this.weather?.id ?? -1;
    this.weather = weatherFor(this.diffIndex, this.seed, this.segment);
    if (this.weather && this.weather.id !== avant) this._alertWeather(this.weather.id);
    this._startBeat();
  }

  openCards(apresBoss = false) {
    this.pendingLevels--;
    this.cardsQuality = this.drawQuality(apresBoss);

    const jalon = CARD_CFG.LEGENDARY_LEVELS
      .find(n => this.level >= n && !this.legendaryLevelDone.has(n));
    if (jalon !== undefined) this.legendaryLevelDone.add(jalon);

    this.cardOffers = new Map();
    for (const p of this.players.values()) {
      this.cardOffers.set(p.id,
        this.offerCards(p, this.cardsQuality, true, jalon ?? 0));
    }
    this.cardsPending = true;
  }

  openNextScreen() {
    if (this.pendingLevels > 0) {
      this.openCards(this.relicBossDue);
      return "cards";
    }
    if (this.relicBossDue) {
      this.openMerchant();
      return "merchant";
    }
    return null;
  }


  _merchantDue() {
    this.relicBossDue = true;
  }

  _offerRelics(p) {
    const poss = p.relics;
    const pool = RELICS.filter(r =>
      !poss.has(r.id)
      && (r.tier < 3 || !this.relicLegendaryTaken)
      && !(r.minPlayers && this.players.size < r.minPlayers)
      && !(r.requiresSystem === "hasards_actifs" && this.hazards.length === 0)
      // une relique de chaleur sur un railgun est un emplacement d'offre perdu,
      // et rien ne le disait : le filtre est au meme endroit que `minPlayers`
      && !(r.requiresArme && !ARME_EXIGENCE[r.requiresArme](armeAt(p.arme)))
      && !(p.lockedRelics && p.lockedRelics.has(r.id)));
    const picks = [];
    const from = [...pool];
    while (picks.length < RELIC_CFG.OFFER_COUNT && from.length > 0) {
      const weights = RELIC_CFG.WEIGHT;
      let total = 0;
      for (const r of from) total += weights[r.tier];
      let roll = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < from.length; i++) {
        roll -= weights[from[i].tier];
        if (roll <= 0) { idx = i; break; }
      }
      picks.push(from[idx].id);
      from.splice(idx, 1);
    }
    return picks;
  }

  openMerchant() {
    this.relicBossDue = false;
    this.relicOffers = new Map();
    for (const p of this.players.values()) {
      p.relicBought = 0;
      p.relicRerolls = 0;
      this.relicOffers.set(p.id, this._offerRelics(p));
    }
    this.relicPending = true;
  }

  // UN SEUL ACHAT PAR VISITE : le marchand cesse d'etre un budget a repartir pour
  // devenir un choix, comme l'ecran de cartes. Ce qui reste finance les relances.
  buyRelic(p, id) {
    const offers = this.relicOffers.get(p.id);
    if (!offers || !offers.includes(id)) return false;
    if ((p.relicBought ?? 0) >= RELIC_CFG.BUY_PER_VISIT) return false;
    const r = relicById(id);
    if (!r) return false;
    if (r.tier === 3 && this.relicLegendaryTaken) return false;
    const price = relicPrice(r);
    if (p.eclats < price) return false;
    p.eclats -= price;
    p.relics.set(id, 1);
    p.relicBought = (p.relicBought ?? 0) + 1;
    p.hf.relics++;
    if (r.tier === 3) this.relicLegendaryTaken = true;
    const off = this.relicOffers.get(p.id);
    if (off) this.relicOffers.set(p.id, off.filter(o => o !== id));
    // la liste des champs qui exigeaient un recalcul etait a tenir a jour a la
    // main, et c'est la forme exacte d'un defaut silencieux. Un achat par visite,
    // sur un ecran : le recalcul complet ne coute rien.
    this._recomputeAll();
    return true;
  }

  rerollRelic(p) {
    const cost = relicRerollCost(this.level, p.relicRerolls ?? 0);
    if (p.eclats < cost) return false;
    p.eclats -= cost;
    p.relicRerolls = (p.relicRerolls ?? 0) + 1;
    this.relicOffers.set(p.id, this._offerRelics(p));
    return true;
  }

  relicRerollPrice(p) {
    return relicRerollCost(this.level, p.relicRerolls ?? 0);
  }

  relicDone(p) {
    this.relicOffers.delete(p.id);
  }

  closeMerchant() {
    this.relicPending = false;
    this.relicOffers.clear();
  }

  _spawner(dt) {
    if (this.boss || this.bossPending) return;

    const entry = this._beat();
    const ev = this.event ? eventAt(this.event.id) : null;
    if (ev && ev.rateMul <= 0) return;

    const crowd = this.aliveCrowd();
    const rate = entry.rate
      * (ev ? ev.rateMul : 1)
      * Math.pow(crowd, CFG.WAVE_CROWD_EXP)
      * (1 + CFG.WAVE_RATE_POWER_K * (this._teamPower() - 1))
      * this.diff.spawn;

    this.eliteCd -= dt;
    let eliteDue = this.eliteCd <= 0;

    const cap = this._enemyCap();
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length >= cap) { this.spawnAcc = 0; break; }
      const type = ev && ev.types.length > 0
        ? ev.types[Math.floor(Math.random() * ev.types.length)]
        : -1;
      const e = this._spawnEnemy(type, null, null, eliteDue, entry.geom);
      if (!e) break;
      if (eliteDue) {
        eliteDue = false;
        const k = Math.pow(crowd, CFG.WAVE_ELITE_CROWD_EXP);
        this.eliteCd = (CFG.ELITE_MIN + Math.random() * (CFG.ELITE_MAX - CFG.ELITE_MIN)) / k;
      }
    }
  }

  _spawnBox() {
    const m = TL_CFG.SPAWN_MARGIN;
    const hw = CFG.VIEW_W / 2 + m, hh = CFG.VIEW_H / 2 + m;
    const ps = this._alivePlayers();
    let x0, y0, x1, y1;
    if (ps.length === 0) {
      const c = this._teamCentroid();
      x0 = c.x - hw; x1 = c.x + hw; y0 = c.y - hh; y1 = c.y + hh;
    } else {
      x0 = y0 = Infinity; x1 = y1 = -Infinity;
      for (const p of ps) {
        if (p.x < x0) x0 = p.x;
        if (p.x > x1) x1 = p.x;
        if (p.y < y0) y0 = p.y;
        if (p.y > y1) y1 = p.y;
      }
      x0 -= hw; x1 += hw; y0 -= hh; y1 += hh;
    }
    return {
      x0: Math.max(-m, x0), y0: Math.max(-m, y0),
      x1: Math.min(CFG.ARENA_W + m, x1), y1: Math.min(CFG.ARENA_H + m, y1),
    };
  }

  _edgePoint(side) {
    const B = this._spawnBox();
    const s = side & 3;
    let pt;
    switch (s) {
      case 0:  pt = { x: B.x0 + Math.random() * (B.x1 - B.x0), y: B.y0 }; break;
      case 1:  pt = { x: B.x0 + Math.random() * (B.x1 - B.x0), y: B.y1 }; break;
      case 2:  pt = { x: B.x0, y: B.y0 + Math.random() * (B.y1 - B.y0) }; break;
      default: pt = { x: B.x1, y: B.y0 + Math.random() * (B.y1 - B.y0) };
    }
    return this._pushOffScreen(pt, s);
  }

  _pushOffScreen(pt, side) {
    const m = TL_CFG.SPAWN_MARGIN;
    for (const p of this.players.values()) {
      if (p.downed) continue;
      const vx = Math.max(0, Math.min(CFG.ARENA_W - CFG.VIEW_W, p.x - CFG.VIEW_W / 2));
      const vy = Math.max(0, Math.min(CFG.ARENA_H - CFG.VIEW_H, p.y - CFG.VIEW_H / 2));
      if (pt.x < vx || pt.x > vx + CFG.VIEW_W || pt.y < vy || pt.y > vy + CFG.VIEW_H) continue;
      switch (side) {
        case 0:  pt.y = Math.min(pt.y, vy - m); break;
        case 1:  pt.y = Math.max(pt.y, vy + CFG.VIEW_H + m); break;
        case 2:  pt.x = Math.min(pt.x, vx - m); break;
        default: pt.x = Math.max(pt.x, vx + CFG.VIEW_W + m);
      }
    }
    return pt;
  }

  _spawnPoint(geom = "bords", r = 12) {
    if (this.blastHoles.length === 0) return this._spawnGeom(geom, r);
    for (let i = 0; i < 4; i++) {
      const pt = this._spawnGeom(geom, r);
      if (!this._dansUnTrou(pt.x, pt.y)) return pt;
    }
    return this._spawnGeom(geom, r);
  }

  _spawnGeom(geom, r) {
    switch (geom) {
      case "front":
        return this._edgePoint(this.beatSide);
      case "pince":
        return this._edgePoint(Math.random() < 0.5 ? this.beatSide : this.beatSide ^ 1);
      case "quatre-fronts": {
        if (this.packLeft <= 0) {
          this.packLeft = TL_CFG.PACK;
          this.packSide = (this.packSide + 1) & 3;
        }
        this.packLeft--;
        return this._edgePoint(this.packSide);
      }
      case "anneau":
        return this._ringPoint(r);
      default:
        return this._edgePoint(Math.floor(Math.random() * 4));
    }
  }

  _ringPoint(r) {
    const c = this._teamCentroid();
    const cx = c.x, cy = c.y;
    const rad = (CFG.VIEW_H / 2) * TL_CFG.RING_RATIO;
    for (let i = 0; i < TL_CFG.RING_TRIES; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      const clear = TL_CFG.RING_CLEAR + r;
      if (this._inObstacle(x, y, r)) continue;
      let ok = true;
      for (const p of this.players.values()) {
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < clear * clear) { ok = false; break; }
      }
      if (ok) return { x, y };
    }
    return this._edgePoint(Math.floor(Math.random() * 4));
  }


  /* CE QUE LA SITUATION VAUT, en une passe sur l'equipe. La densite se lit sur le
     PLAFOND de population et non sur une distance : un balayage par bonus tire
     serait le seul endroit du fichier ou une recompense couterait de la boucle. */
  _contexteBonus() {
    let hp = 0, hpMax = 0, aTerre = 0, vivants = 0;
    let cadence = 0, canons = 0, perce = 0, rebond = 0;
    for (const p of this.players.values()) {
      if (p.downed) { aTerre++; continue; }
      vivants++;
      hp += p.hp; hpMax += p.maxHp;
      const a = armeAt(p.arme);
      if (litCadence(a)) cadence++;
      if (litCanons(a)) canons++;
      if (litPerce(a)) perce++;
      if (litRebond(a)) rebond++;
    }
    const n = Math.max(1, vivants);
    return {
      vivants,
      manque: hpMax > 0 ? 1 - hp / hpMax : 0,
      densite: Math.min(1, this.enemies.length / (CFG.POWERUP_FOULE * n)),
      boss: this.boss ? 1 : 0,
      aTerre,
      cadence: cadence / n, canons: canons / n,
      perce: perce / n, rebond: rebond / n,
    };
  }

  // la chance de purification EXISTAIT deja, elle etait seulement aveugle aux
  // etats poses. Elle garde ses deux constantes et gagne son facteur.
  _pressionEtats() {
    let etats = 0, vivants = 0;
    for (const p of this.players.values()) {
      if (p.downed) continue;
      vivants++;
      etats += p.statuses.size;
    }
    if (vivants === 0) return STATUS_CFG.PURIFY_FLOOR;
    return STATUS_CFG.PURIFY_FLOOR
      + STATUS_CFG.PURIFY_SPAN * Math.min(1, etats / vivants);
  }

  _randomPowerupType() {
    const chance = this.hasHealer()
      ? STATUS_CFG.PURIFY_CHANCE
      : STATUS_CFG.PURIFY_CHANCE_NO_HEALER;
    if (Math.random() < chance * this._pressionEtats()) {
      return POWERUP_TYPES.indexOf("purification");
    }
    const c = this._contexteBonus();
    let total = 0;
    POIDS.length = 0;
    for (const k of POWERUP_ROTATION) {
      const w = POWERUP_POIDS[POWERUP_TYPES[k]](c);
      total += w;
      POIDS.push(w);
    }
    const plancher = total * CFG.POWERUP_PART_MIN;
    for (let i = 0; i < POIDS.length; i++) {
      if (POIDS[i] < plancher) { total += plancher - POIDS[i]; POIDS[i] = plancher; }
    }
    let r = Math.random() * total;
    for (let i = 0; i < POIDS.length; i++) {
      r -= POIDS[i];
      if (r <= 0) return POWERUP_ROTATION[i];
    }
    return POWERUP_ROTATION[POWERUP_ROTATION.length - 1];
  }

  /* LE FRAGMENT NE PREND PAS LA PLACE D'UN BONUS. Il tombe d'une carte, sur un
     kill, donc par dizaines ; compte dans `POWERUP_MAX_GROUND`, il BLOQUAIT le
     generateur — 55 % des apparitions d'une manche cauchemar a quatre joueurs
     etaient des fragments, et le releve de 0.8.12 disait deja que le sol restait
     plein de bonus que personne ne ramasse. Les deux populations ont donc chacune
     leur plafond, et elles ne se les disputent plus. */
  _solBonus() {
    let n = 0;
    for (const w of this.powerups) if (w.type !== TYPE_FRAGMENT) n++;
    return n;
  }

  /* LE POINT DE POSE D'UN BONUS AU SOL. Cinq endroits l'ecrivaient a la main, et
     quatre d'entre eux ignoraient la cendre : le raccourcissement de la meteo ne
     valait que pour le generateur, jamais pour une depouille d'elite. `max` est
     ce qui permet au compte a rebours d'exister — la duree de vie ne se deduit
     pas d'un compteur local, l'instantane CULE par la vue et un bonus qui entre
     dans le champ a deja vecu. */
  _poserBonus(type, x, y) {
    const max = this.weather?.id === WX_CENDRES ? BIOME_CFG.ASH_LIFE : CFG.POWERUP_LIFE;
    const w = { id: this._nextId++, type, x, y, life: max, max };
    this.powerups.push(w);
    return w;
  }

  _powerups(dt) {
    this.powerupCd -= dt;
    if (this.powerupCd <= 0 && this._solBonus() < CFG.POWERUP_MAX_GROUND) {
      this.powerupCd = CFG.POWERUP_MIN + Math.random() * (CFG.POWERUP_MAX - CFG.POWERUP_MIN);
      const margin = 90;
      const B = this.bounds;
      const pt = this._dropPoint(
        B.x0 + margin + Math.random() * Math.max(1, B.x1 - B.x0 - margin * 2),
        B.y0 + margin + Math.random() * Math.max(1, B.y1 - B.y0 - margin * 2),
        margin);
      this._poserBonus(this._randomPowerupType(), pt.x, pt.y);
    }

    const kept = [];
    for (const w of this.powerups) {
      w.life -= dt;
      let taken = false;
      for (const p of this.players.values()) {
        if (p.downed) continue;
        const reach = (CFG.PLAYER_RADIUS + CFG.POWERUP_RADIUS + p.mods.pickupRadius)
          * p.mods.pickupRadiusMul;
        if ((p.x - w.x) ** 2 + (p.y - w.y) ** 2 <= reach * reach) {
          this._applyPowerup(p, w.type);
          taken = true;
          break;
        }
      }
      if (!taken && w.life > 0) kept.push(w);
    }
    this.powerups = kept;
  }

  _harvests(dt) {
    this.harvestCd -= dt;
    if (this.harvestCd <= 0) {
      this.harvestCd = CFG.HARVEST_MIN
        + Math.random() * (CFG.HARVEST_MAX - CFG.HARVEST_MIN);
      if (!this.biomeNu && this.harvests.length < this._harvestGroundCap()) {
        const at = this._harvestPoint();
        if (at) {
          this.harvests.push({
            id: this._nextId++,
            x: at.x, y: at.y,
            kind: Math.random() < 0.5 ? 0 : 1,
            hp: CFG.HARVEST_CRYSTAL_HP, maxHp: CFG.HARVEST_CRYSTAL_HP,
            prog: 0,
          });
        }
      }
    }

    if (this.harvests.length === 0) return;
    const kept = [];
    for (const h of this.harvests) {
      if (h.kind === 0) {
        if (h.hp <= 0) { this._harvestYield(h); continue; }
      } else {
        let on = false;
        let vitesse = 0;
        for (const p of this._alivePlayers()) {
          const r = CFG.HARVEST_CHANNEL_RADIUS;
          if ((p.x - h.x) ** 2 + (p.y - h.y) ** 2 <= r * r) {
            on = true;
            vitesse = Math.max(vitesse, this._relicSum(p, "harvestSpeed"));
          }
        }
        h.prog = on
          ? h.prog + dt * (1 + vitesse) / CFG.HARVEST_CHANNEL
          : Math.max(0, h.prog - dt * 0.5 / CFG.HARVEST_CHANNEL);
        if (h.prog >= 1) { this._harvestYield(h); continue; }
      }
      kept.push(h);
    }
    if (kept.length !== this.harvests.length) this.harvests = kept;
  }

  _harvestGroundCap() {
    let sol = CFG.HARVEST_MAX_GROUND;
    for (const p of this.players.values()) sol += this._relicSum(p, "harvestGround");
    return sol;
  }

  _harvestPoint() {
    const B = this.bounds;
    const margin = 150;
    for (let i = 0; i < 20; i++) {
      const x = B.x0 + margin + Math.random() * Math.max(1, B.x1 - B.x0 - margin * 2);
      const y = B.y0 + margin + Math.random() * Math.max(1, B.y1 - B.y0 - margin * 2);
      let ok = true;
      for (const p of this._alivePlayers()) {
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < CFG.HARVEST_PLAYER_DIST ** 2) {
          ok = false; break;
        }
      }
      if (ok && this.obstacles.length) {
        const m = CFG.HARVEST_RADIUS + CFG.PLAYER_RADIUS;
        for (const b of this.obstacles) {
          if (b.maxHp > 0 && b.hp <= 0) continue;
          if (Math.abs(x - b.x) < b.w / 2 + m && Math.abs(y - b.y) < b.h / 2 + m) {
            ok = false; break;
          }
        }
      }
      if (ok) return { x, y };
    }
    return null;
  }

  _harvestYield(h) {
    const gain = CFG.HARVEST_YIELD_MIN
      + Math.floor(Math.random() * (CFG.HARVEST_YIELD_MAX - CFG.HARVEST_YIELD_MIN + 1));
    let soin = 0, encore = 0;
    for (const p of this.players.values()) {
      const bonus = this.event ? p.mods.eventShard : 0;
      p.eclats += Math.round(gain * (p.mods.shardMul + bonus))
        + this._relicSum(p, "shardFlat");
      p.hf.harvests++;
      if (p.mods.harvestHeal > soin) soin = p.mods.harvestHeal;
      if (p.mods.harvestAgain > encore) encore = p.mods.harvestAgain;
    }
    if (soin > 0) {
      for (const p of this.players.values()) {
        if (!p.downed) p.hp = Math.min(p.maxHp, p.hp + soin);
      }
    }
    if (encore > 0 && Math.random() < encore
        && this.harvests.length < this._harvestGroundCap()) {
      this.harvests.push({
        id: this._nextId++,
        x: h.x, y: h.y,
        kind: Math.random() < 0.5 ? 0 : 1,
        hp: CFG.HARVEST_CRYSTAL_HP, maxHp: CFG.HARVEST_CRYSTAL_HP,
        prog: 0,
      });
    }
    this.effects.push({
      id: this._nextId++,
      x: h.x, y: h.y, r: 90,
      life: 0.6, max: 0.6,
      kind: 14,
    });
  }

  /* LE PLAFOND DE CE QU'UN BONUS AU SOL PEUT DONNER EN BOUCLIER, et il est le
     seul : `CFG.SHIELD_POOL` etait ecrit comme plafond ABSOLU, donc une build
     bouclier au-dela de 80 ramassait la pastille pour rien. Il s'ajoute a la
     jauge de la build au lieu de la remplacer — le surplus ne se regenere pas,
     `_shieldRegen` bornant deja sur `mods.shieldPool`. */
  _capBonus(p) {
    return p.mods.shieldPool + CFG.SHIELD_POOL;
  }

  /* UN SOIN DE BONUS NE REND JAMAIS RIEN A PV PLEINS : le surplus devient du
     bouclier, exactement comme celui du Soigneur dans `_heal`. `noHeal`
     (Serment de fer) coupe la part PV et laisse passer la part bouclier — la
     contrepartie dit « aucun soin recu », pas « aucun tampon ». Elle etait de
     toute facon contournee ici : le soin s'ecrivait sans passer par `_heal`. */
  _soinBonus(p, montant) {
    if (montant <= 0) return;
    const rendu = this._relicFlag(p, "noHeal")
      ? 0
      : Math.min(Math.max(0, p.maxHp - p.hp), montant);
    p.hp += rendu;
    this._grantShield(p, montant - rendu, this._capBonus(p));
  }

  _applyPowerup(p, type, part = 1) {
    const T = CFG.BUFF_TIME * part;
    switch (POWERUP_TYPES[type]) {
      case "heal":   this._soinBonus(p, CFG.HEAL_AMOUNT * part); break;
      case "damage": p.buffDamage = Math.max(p.buffDamage, T); break;
      case "rate":   p.buffRate = Math.max(p.buffRate, T); break;
      case "double": p.buffDouble = Math.max(p.buffDouble, T); break;
      case "pierce": p.buffPierce = Math.max(p.buffPierce, T); break;
      case "ricochet": p.buffRicochet = Math.max(p.buffRicochet, T); break;
      case "beacon": this._beacon(p); break;
      case "turret": this._turret(p); break;
      case "shield":
        this._grantShield(p, CFG.SHIELD_POOL * part, this._capBonus(p));
        break;
      // ECRASER RACCOURCISSAIT : la carte Instinct pose deja un ralentissement
      // plus long, et le ramasser le coupait net.
      case "slow":   this.slow = Math.max(this.slow, CFG.SLOW_TIME); break;
      case "nova":   this._nova(p); break;
      case "fragment":
        // `return` ici rendait morte l'entree `fragment` de PARTAGEABLES
        this._soinBonus(p, CARD_CFG.HARVEST_HEAL * part);
        break;
      case "purification":
        // sans etat a retirer la pastille ne faisait rien : elle rend alors la
        // moitie d'un soin, et le joueur voit toujours quelque chose se passer
        if (this._purgeAll(p) === 0) this._soinBonus(p, CFG.HEAL_AMOUNT * 0.5 * part);
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r: 90, life: 0.5, max: 0.5, kind: 4,
        });
        break;
    }
    // ne se partage que ce qui est PERSONNEL : ni le ralentissement global, ni ce
    // qui fait naitre une entite (balise, tourelle, nova, purification)
    if (part === 1 && p.mods.powerupShare > 0 && PARTAGEABLES.has(POWERUP_TYPES[type])) {
      for (const o of this.players.values()) {
        if (o !== p && !o.downed) this._applyPowerup(o, type, p.mods.powerupShare);
      }
    }
    if (part === 1) p.score += Math.round(15 * p.mods.scoreMul);
  }

  _beacon(p) {
    const downed = [...this.players.values()].filter(o => o.downed);

    if (downed.length === 0) {
      for (const o of this.players.values()) {
        // hors de `_grantShield` la balise ignorait le plafond et le relais
        // `shieldShare` ; le montant, lui, ne bouge pas : on remonte A 45
        this._grantShield(o, CFG.BEACON_SHIELD - o.shield, this._capBonus(o));
        this.effects.push({
          id: this._nextId++,
          x: o.x, y: o.y, r: 70, life: 0.5, max: 0.5, kind: 4,
        });
      }
      return;
    }

    for (const o of downed) {
      if (p && o.id !== p.id) p.hf.revives++;
      o.downed = false;
      o.hp = Math.round(o.maxHp * CFG.BEACON_HP_RATIO);
      o.revive = 0;
      o.hitCd = CFG.PLAYER_HIT_CD;
      this.effects.push({
        id: this._nextId++,
        x: o.x, y: o.y, r: 120, life: 0.7, max: 0.7, kind: 4,
      });
    }
  }

  _turret(p) {
    this.turrets.push({
      id: this._nextId++,
      x: p.x, y: p.y,
      owner: p.id,
      dmg: CFG.BULLET_DAMAGE * this._summonMul(p),
      life: CFG.TURRET_LIFE,
      fireCd: 0,
      ang: Math.atan2(p.aimY, p.aimX),
    });
  }

  _nova(p) {
    const R = CFG.NOVA_RADIUS * p.mods.areaMul;
    const onde = { id: this._nextId++, x: p.x, y: p.y, r: R,
                   life: 0.45, max: 0.45, kind: 0, n: 0 };
    this.effects.push(onde);

    let fauches = 0;
    for (const e of this.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const ux = d > 0.01 ? dx / d : 1, uy = d > 0.01 ? dy / d : 0;
      e.x += ux * CFG.NOVA_PUSH;
      e.y += uy * CFG.NOVA_PUSH;
      this._damage(e, CFG.NOVA_DAMAGE, p.id);
      if (e.hp <= 0) fauches++;
    }
    onde.n = fauches;
    this.enemies = this.enemies.filter(e => e.hp > 0);

    for (const boss of this._bossTargets()) {
      const d = Math.hypot(boss.x - p.x, boss.y - p.y);
      if (d <= R) this._damage(boss, CFG.NOVA_BOSS_DAMAGE, p.id, 0, false, p.x, p.y);
    }

    this.shots = this.shots.filter(sh =>
      (sh.x - p.x) ** 2 + (sh.y - p.y) ** 2 > R * R);
  }

  _effects(dt) {
    const kept = [];
    for (const f of this.effects) {
      f.life -= dt;
      if (f.life > 0) kept.push(f);
    }
    this.effects = kept;
  }


  /* LA GRILLE DE NAVIGATION EST CELLE DU LIEU, donc elle se construit UNE fois
     par manche. Pendant un boss `this.obstacles` est vide : il n'y a rien a
     contourner, on rend `null` et toute la couche disparait du pas. */
  _nav() {
    const list = this.obstacles;
    if (list.length === 0) return null;
    if (!this._navG) this._navG = construireNav(list, CFG.ARENA_W, CFG.ARENA_H);
    return this._navG;
  }

  /* UN CHAMP PAR JOUEUR, PAS PAR ENNEMI — c'est tout le rapport de ce systeme :
     200 corps lisent quatre diffusions. Une seule est recalculee par image
     (`_navBudget`), et seulement si la cible a change de case depuis
     `REBUILD_MIN` : un joueur a 150 px/s traverse une case en 0,27 s. */
  _navChamp(cible) {
    const nav = this._nav();
    if (!nav) return null;
    let f = this._navChamps.get(cible.id);
    if (!f) {
      f = { dist: new Uint16Array(nav.cells), cell: -1, at: -99, pret: false };
      this._navChamps.set(cible.id, f);
    }
    const c = celluleDe(nav, cible.x, cible.y);
    if (c >= 0 && c !== f.cell && this._navBudget > 0
        && this.time - f.at >= NAV_CFG.REBUILD_MIN) {
      this._navBudget--;
      f.cell = c;
      f.at = this.time;
      f.pret = diffuser(nav, c, f.dist);
    }
    return f.pret ? f : null;
  }

  _enemies(dt) {
    const nav = this._nav();
    this._navBudget = 1;
    const frost = [];
    for (const p of this.players.values()) {
      if (p.frostR > 0 && !p.downed) frost.push(p);
    }
    this._isolementPass();
    this._auraPass(dt);
    this.windup.length = 0;
    // LE BUDGET SE COMPTE AVANT D'ETRE DEPENSE. Il etait reporte de l'image
    // precedente, donc un corps qui ENTRAIT dans une vue en cours de preavis
    // n'y figurait pas encore : la mesure comptait 10 preavis pour un budget de
    // 8. Une passe dediee sur ce qui s'apprete deja rend le compte EXACT, et
    // elle ne coute qu'un balayage de la liste.
    const budget = this.windupBudget;
    budget.clear();
    for (const e of this.enemies) {
      if (e.hp > 0 && (e.dashWarn > 0 || e.aimT > 0)) this._windupCompte(e, budget);
    }
    // APRES le vidage de `windup`, avant la boucle : la charge d'un arc y pousse
    // ses deux porteurs, et l'arc blesse au meme instant que le reste.
    this._relaisPass(dt);

    for (const e of this.enemies) {
      if (e.hp <= 0) continue;

      if (e.burn) {
        e.burn.t -= dt;
        this._damage(e, e.burn.dmg * dt / CARD_CFG.BURN_TIME, e.burn.owner, 0, true);
        if (e.burn.t <= 0) e.burn = null;
        if (e.hp <= 0) continue;
      }

      const def = defDe(e.type, e.elite);
      const t = this._nearestPlayer(e.x, e.y, def.isole);
      if (!t) continue;
      const wasX = e.x, wasY = e.y;
      const dx = t.x - e.x, dy = t.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      let mul = this.slow > 0 ? CFG.SLOW_MUL : 1;
      for (const p of frost) {
        const fr = p.frostR;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= fr * fr) {
          mul *= CARD_CFG.FROST_MUL;
          break;
        }
      }
      if (this.hazards.length) mul *= this._ground(e.x, e.y).slow;
      if ((e.rootUntil ?? 0) > this.time) mul = 0;
      for (const an of this.anchors) {
        if ((e.x - an.x) ** 2 + (e.y - an.y) ** 2 <= an.r * an.r) {
          mul *= CARD_CFG.SKILL3_ANCRE_SLOW;
          break;
        }
      }
      const want = Math.atan2(dy, dx);
      if (e.shieldArc > 0) {
        let turn = want - e.ang;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        const max = def.shieldTurnRate * dt;
        e.ang += turn > max ? max : turn < -max ? -max : turn;
      } else {
        e.ang = want;
      }

      if (hasTrait(e.traits, TRAIT_FRENZY) && e.maxHp > 0) {
        const missing = 1 - e.hp / e.maxHp;
        const k = Math.min(1, missing / (1 - TRAIT_CFG.FRENZY_AT));
        mul *= 1 + (TRAIT_CFG.FRENZY_MAX - 1) * k;
      }

      if (hasTrait(e.traits, TRAIT_DASH)) {
        if (e.dashT > 0) {
          e.dashT -= dt;
          mul *= TRAIT_CFG.DASH_MUL;
        } else if (e.dashWarn > 0) {
          e.dashWarn -= dt;
          mul *= TRAIT_CFG.DASH_GATHER;
          this.windup.push(e);
          if (e.dashWarn <= 0) e.dashT = TRAIT_CFG.DASH_TIME;
        } else {
          e.dashCd -= dt;
          if (e.dashCd <= 0 && d < TRAIT_CFG.DASH_RANGE && !this._windupSature(e, budget)) {
            this._windupCompte(e, budget);
            e.dashCd = TRAIT_CFG.DASH_CD;
            e.dashWarn = ATK_CFG.WARN;
          }
        }
      }

      let sx = dx / d, sy = dy / d;

      // 1 · OU ALLER. Tant que la cible se rejoint en droite ligne, rien ne
      // change : le champ ne sert qu'a ce que l'evitement local ne sait pas
      // faire — un mur plus large que sa portee, une poche, un angle rentrant.
      if (nav) {
        if (e.navT > 0) e.navT--;
        if (e.navT <= 0 || e.navCible !== t.id) {
          e.navT = NAV_CFG.LOS_PERIOD;
          e.navCible = t.id;
          e.navX = 0; e.navY = 0;
          // L'ANCRE SE POSE TANT QU'ON EST LIBRE, pas au moment ou l'on est
          // coince : elle ne sert qu'apres, et elle n'existerait pas si on
          // attendait d'en avoir besoin.
          const ici = celluleDe(nav, e.x, e.y);
          if (ici >= 0 && !nav.bloque[ici]) e.navAncre = ici;
          if (d > NAV_CFG.NEAR && !droitPossible(nav, e.x, e.y, t.x, t.y)) {
            const f = this._navChamp(t);
            const ancre = f ? viser(nav, f.dist, e.x, e.y, e.navAncre, this._navVise) : -1;
            if (ancre >= 0) {
              e.navAncre = ancre;
              e.navX = this._navVise.x; e.navY = this._navVise.y;
            }
          }
        }
        if (e.navX !== 0 || e.navY !== 0) {
          const vx = e.navX - e.x, vy = e.navY - e.y;
          const vd = Math.hypot(vx, vy);
          if (vd > 1) { sx = vx / vd; sy = vy / vd; }
        }
      }

      // 1 bis · L'INTENTION DU ROLE. Le flanc arque l'approche de loin et se
      // resorbe de pres : le corps arrive par le cote puis COMMET, au lieu de
      // tourner indefiniment autour. Le cote vient de l'identifiant, donc il ne
      // change jamais — un cote retire a chaque image est une oscillation.
      // Il ne s'applique QUE quand la ligne droite passe : sur un cap rendu par
      // le champ, un biais lateral pousse dans la boite que le champ contourne.
      // LA COHESION EST CE QUI FAIT TENIR UN ARC. Sans elle deux relais se
      // separent en poursuivant la meme cible par deux cotes, l'arc casse, se
      // recharge, casse encore — le joueur voit clignoter au lieu de lire. Elle
      // ne s'applique QUE au-dela de la moitie de la portee : de pres les deux
      // corps sont libres, et c'est ce qui garde l'arc mobile.
      if (def.cohesion && e.pair) {
        const o = this._enemyById(e.pair);
        if (o) {
          const px = o.x - e.x, py = o.y - e.y;
          const pd = Math.hypot(px, py) || 1;
          if (pd > def.lienRange * 0.5) {
            const k = def.cohesion * Math.min(1, (pd - def.lienRange * 0.5) / (def.lienRange * 0.5));
            const cx = sx + (px / pd) * k, cy = sy + (py / pd) * k;
            const cn = Math.hypot(cx, cy) || 1;
            sx = cx / cn; sy = cy / cn;
          }
        }
      }

      if (e.flanc > 0 && e.navX === 0 && e.navY === 0 && d > ROLE_CFG.FLANC_NEAR) {
        const k = e.flanc
          * Math.min(1, (d - ROLE_CFG.FLANC_NEAR) / ROLE_CFG.FLANC_SPAN)
          * ((e.id & 1) ? 1 : -1);
        const fx = sx - sy * k, fy = sy + sx * k;
        const fn = Math.hypot(fx, fy) || 1;
        sx = fx / fn; sy = fy / fn;
      }

      // 2 · COMMENT EVITER. TROIS ECHANTILLONS, PAS UN : le point unique a
      // `look` px sautait par-dessus toute cloison plus mince que lui, et la
      // plus mince du depot fait 32 px pour une portee de 58. Le corps ne
      // voyait alors RIEN, se collait a la face, et le centre de la face est un
      // attracteur (composante tangentielle nulle par symetrie) — il y restait
      // jusqu'a la fin de la manche.
      if (this.obstacles.length) {
        const look = e.r + CFG.ENEMY_AVOID_LOOK;
        let b = null, px = 0, py = 0;
        for (let s = 1; s <= 3; s++) {
          const l = look * s / 3;
          px = e.x + sx * l; py = e.y + sy * l;
          b = this._obstacleAt(px, py, e.r);
          if (b) break;
        }
        if (b) {
          const hw = b.w / 2 + e.r, hh = b.h / 2 + e.r;
          const pen = Math.min(hw - Math.abs(px - b.x), hh - Math.abs(py - b.y));
          const rx = e.x - b.x, ry = e.y - b.y;
          const cross = sx * ry - sy * rx;
          const gauche = Math.abs(cross) > 1e-6 ? cross > 0 : (e.id & 1) === 0;
          const tx = gauche ? -sy : sy;
          const ty = gauche ? sx : -sx;
          const k = CFG.ENEMY_AVOID_TURN * Math.min(1, pen / look);
          sx += tx * k; sy += ty * k;
          const n = Math.hypot(sx, sy) || 1;
          sx /= n; sy /= n;
        }
      }

      // UNE DISTANCE DE TIR NE SE TIENT QUE SI LA LIGNE EXISTE. Sans ce test,
      // un tireur dont la cible passe derriere une cloison se fige a son
      // `standoff` et vide son chargeur dans la boite (`_shots` absorbe sur
      // l'obstacle) : il ne menace plus rien et ne bouge plus jamais.
      const relance = e.navX !== 0 || e.navY !== 0;
      if (def.shootCd) {
        e.shootCd -= dt;
        // TELEGRAPHE -> ACTION. Le tir partait sans aucune anticipation : rien
        // ne disait quand, et rien ne disait ou. L'angle se VERROUILLE au debut
        // de la visee, donc l'esquive existe — un tir qui suit sa cible jusqu'a
        // la detente n'est pas une attaque, c'est une taxe.
        let vise = 0;
        if (e.aimT > 0) {
          e.aimT -= dt;
          vise = 1;
          this.windup.push(e);
          if (e.aimT <= 0) {
            // LE PREAVIS SE PAIE SUR LA RECHARGE, PAS SUR LA CADENCE.
            // `shootCd` a toujours voulu dire « temps entre deux balles » : y
            // ajouter la visee aurait retire 16 % du volume de tir sans qu'une
            // seule valeur d'equilibrage soit touchee a l'ecran.
            e.shootCd = Math.max(0, def.shootCd - ATK_CFG.WARN);
            const fan = hasTrait(e.traits, TRAIT_VOLLEY) ? TRAIT_CFG.VOLLEY_COUNT : 1;
            const base = e.aimAng - ((fan - 1) / 2) * TRAIT_CFG.VOLLEY_SPREAD;
            for (let i = 0; i < fan; i++) {
              const a = base + i * TRAIT_CFG.VOLLEY_SPREAD;
              this.shots.push({
                id: this._nextId++,
                x: e.x, y: e.y,
                vx: Math.cos(a) * CFG.SHOT_SPEED,
                vy: Math.sin(a) * CFG.SHOT_SPEED,
                life: CFG.SHOT_LIFE,
              });
            }
          }
        } else if (e.shootCd <= 0 && d < ATK_CFG.SHOOT_RANGE) {
          // LA VISEE N'EST PAS RATIONNEE, ET LA RUEE SI. Un creneau de ruee
          // refuse REPORTE une ruee ; un creneau de tir refuse ANNULE le tir,
          // parce que le tireur ne fait que ca. Les avoir mis sous le meme
          // budget coutait 84 % du volume de tir en cauchemar a quatre
          // (46 613 -> 7 554 balles sur huit minutes) : ce n'est pas une regle
          // de lisibilite, c'est un affaiblissement. Ce qui borne les visees a
          // l'ecran est le plafond de PART du tireur (`share`), pas un budget.
          e.aimT = ATK_CFG.WARN;
          e.aimAng = Math.atan2(dy, dx);
          vise = 1;
        }
        const approach = (!relance && d <= e.standoff) ? -0.35 : 1;
        const pas = e.speed * mul * (vise ? ATK_CFG.AIM_SLOW : 1) * approach * dt;
        const ux = approach > 0 ? sx : dx / d;
        const uy = approach > 0 ? sy : dy / d;
        e.x += ux * pas;
        e.y += uy * pas;
      } else if (def.heal) {
        const want2 = e.fleeT > 0 ? e.standoff * 1.6 : e.standoff;
        const approach = (!relance && d <= want2) ? -0.6 : 1;
        const ux = approach > 0 ? sx : dx / d;
        const uy = approach > 0 ? sy : dy / d;
        e.x += ux * e.speed * mul * approach * dt;
        e.y += uy * e.speed * mul * approach * dt;
        this._medic(e, def, dt);
      } else if (def.poseCd) {
        // MEME GRAMMAIRE QUE LE TIR, AUTRE VERBE. Le saboteur verrouille la
        // PLACE au lieu de l'angle : ce qu'il annonce est « la ou tu es dans une
        // demi-seconde ne sera plus a toi ». Un joueur qui bouge ne perd rien,
        // un joueur qui campe perd sa position — c'est exactement la decision
        // qu'aucun autre corps de la horde ne demande.
        e.shootCd -= dt;
        let vise = 0;
        if (e.aimT > 0) {
          e.aimT -= dt;
          vise = 1;
          this.windup.push(e);
          if (e.aimT <= 0) {
            e.shootCd = Math.max(0, def.poseCd - ATK_CFG.WARN);
            this._groundZone(e.poseX, e.poseY, def.poseR, def.poseDot, def.poseLife);
          }
        } else if (e.shootCd <= 0 && d < def.poseRange) {
          e.aimT = ATK_CFG.WARN;
          e.poseX = t.x; e.poseY = t.y;
          vise = 1;
        }
        const approach = (!relance && d <= e.standoff) ? -0.35 : 1;
        const pas = e.speed * mul * (vise ? ATK_CFG.AIM_SLOW : 1) * approach * dt;
        e.x += (approach > 0 ? sx : dx / d) * pas;
        e.y += (approach > 0 ? sy : dy / d) * pas;
      } else {
        // LE RETRAIT EST GENERAL, il n'appartient a aucun type. Le soigneur le
        // posait deja sous le feu ; le harceleur le pose apres avoir touche.
        // Un corps qui frappe et reste au contact n'a pas harcele, il a mordu.
        if (e.fleeT > 0) {
          e.fleeT -= dt;
          e.x -= (dx / d) * e.speed * mul * dt;
          e.y -= (dy / d) * e.speed * mul * dt;
        } else {
          e.x += sx * e.speed * mul * dt;
          e.y += sy * e.speed * mul * dt;
        }
      }

      if (hasTrait(e.traits, TRAIT_TRAIL)) {
        e.trailAt -= Math.hypot(e.x - wasX, e.y - wasY);
        if (e.trailAt <= 0) {
          e.trailAt = TRAIT_CFG.TRAIL_STEP;
          this._groundZone(e.x, e.y, TRAIT_CFG.TRAIL_R, TRAIT_CFG.TRAIL_DOT,
            TRAIT_CFG.TRAIL_LIFE);
        }
      }

      if (e.kx || e.ky) {
        e.x += e.kx * dt;
        e.y += e.ky * dt;
        const k = Math.pow(CFG.BLAST_KNOCK_DECAY, dt);
        e.kx *= k; e.ky *= k;
        if (Math.abs(e.kx) + Math.abs(e.ky) < CFG.BLAST_KNOCK_MIN) { e.kx = 0; e.ky = 0; }
      }

      if (this.walls) this._wallBlock(e, wasX, wasY, e.r);
      if (this.obstacles.length) this._obstacleBlock(e, wasX, wasY, e.r);
    }

    this.enemies = this.enemies.filter(e => e.hp > 0);

    this._separateEnemies();
    this._separateFromPlayers();
  }

  _grille() {
    const list = this.enemies, n = list.length;
    let maxR = CFG.PLAYER_RADIUS;
    for (let i = 0; i < n; i++) if (list[i].r > maxR) maxR = list[i].r;
    // LA CELLULE PROUVE LA COUVERTURE, et elle porte donc la plus grande
    // DISTANCE D'INTERACTION, pas le plus grand rayon : l'ecart de poste
    // s'applique au-dela de la somme des rayons, et une cellule dimensionnee
    // sur les seuls rayons ne le verrait pas d'un bout a l'autre.
    const cell = Math.max(maxR * 2, ROLE_CFG.POSTE_ECART);
    const cols = Math.max(1, Math.ceil(CFG.ARENA_W / cell));
    const rows = Math.max(1, Math.ceil(CFG.ARENA_H / cell));
    const cells = cols * rows;

    if (!this._gStart || this._gStart.length < cells + 1) {
      this._gStart = new Int32Array(cells + 1);
      this._gCur = new Int32Array(cells);
    } else {
      this._gStart.fill(0, 0, cells + 1);
    }
    if (!this._gItems || this._gItems.length < n) {
      this._gItems = new Int32Array(n);
      this._gAt = new Int32Array(n);
    }
    const start = this._gStart, cur = this._gCur;
    const items = this._gItems, at = this._gAt;

    for (let i = 0; i < n; i++) {
      const e = list[i];
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(e.x / cell)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(e.y / cell)));
      at[i] = cy * cols + cx;
      start[at[i] + 1]++;
    }
    for (let c = 0; c < cells; c++) start[c + 1] += start[c];
    cur.set(start.subarray(0, cells));
    for (let i = 0; i < n; i++) items[cur[at[i]]++] = i;

    return { cell, cols, rows, start, items, at };
  }

  _separateEnemies() {
    const list = this.enemies, n = list.length;
    if (n < 2) return;
    const { cols, rows, start, items, at } = this._grille();

    for (let i = 0; i < n; i++) {
      const a = list[i];
      const cx = at[i] % cols, cy = (at[i] - cx) / cols;
      const y0 = cy > 0 ? cy - 1 : 0, y1 = cy + 1 < rows ? cy + 1 : rows - 1;
      const x0 = cx > 0 ? cx - 1 : 0, x1 = cx + 1 < cols ? cx + 1 : cols - 1;
      for (let gy = y0; gy <= y1; gy++) {
        const base = gy * cols;
        for (let gx = x0; gx <= x1; gx++) {
          const c = base + gx;
          for (let k = start[c]; k < start[c + 1]; k++) {
            const j = items[k];
            if (j <= i) continue;
            const b = list[j];
            // DEUX POSTES DU MEME ROLE SE TIENNENT A DISTANCE : sans cela, tout
            // ce qui vise le meme `standoff` autour de la meme cible finit sur
            // le meme arc, et six tireurs partent d'un seul point.
            const min = a.ecart > 0 && a.type === b.type
              ? Math.max(a.r + b.r, a.ecart)
              : a.r + b.r;
            const dx = b.x - a.x, dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > 0.01 && d2 < min * min) {
              const d = Math.sqrt(d2);
              const push = (min - d) * CFG.ENEMY_SEPARATION;
              const ux = (dx / d) * push, uy = (dy / d) * push;
              // LA POUSSEE SE REPARTIT A L'INVERSE DES MASSES, et la masse est
              // la SURFACE du corps. A masses egales on retombe exactement sur
              // le demi-demi d'avant : `2 x 0,5 = 1`.
              const tot = a.masse + b.masse;
              const ka = 2 * b.masse / tot, kb = 2 * a.masse / tot;
              a.x -= ux * ka; a.y -= uy * ka;
              b.x += ux * kb; b.y += uy * kb;
            }
          }
        }
      }
    }
  }

  /* DEUX AURAS, UNE SEULE PASSE. La reduction du choeur et l'egide du
     generateur ne se cumulent ni entre elles ni avec elles-memes : on garde la
     MEILLEURE, jamais le produit — meme regle que partout ailleurs dans ce
     depot.

     L'EGIDE EST UNE RESERVE, PAS UN POURCENTAGE, et c'est ce qui la separe du
     choeur a l'oeil comme a la decision : une reduction se subit, une reserve
     se CASSE. Elle ne se recharge que sous le rayon, elle tombe a zero des
     qu'on en sort — le joueur qui ecarte la horde de sa source la voit fondre
     sans avoir tire dessus. */
  _auraPass(dt) {
    const src = [];
    const gard = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.aura = 0;
      e.shieldMax = 0;
      const def = defDe(e.type, e.elite);
      if (def.auraRadius) src.push({ e, r: def.auraRadius, k: def.auraReduction });
      else if (hasTrait(e.traits, TRAIT_AURA)) {
        src.push({ e, r: TRAIT_CFG.AURA_RADIUS, k: TRAIT_CFG.AURA_REDUCTION });
      }
      if (def.egideRadius) gard.push({ e, r: def.egideRadius, s: def.egideShield, g: def.egideRegen });
    }
    for (const s of src) {
      const r2 = s.r * s.r;
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.aura >= s.k) continue;
        if ((e.x - s.e.x) ** 2 + (e.y - s.e.y) ** 2 <= r2) e.aura = s.k;
      }
    }
    if (gard.length === 0) {
      if (this._egide) {
        for (const e of this.enemies) { e.shield = 0; e.egide = 0; }
        this._egide = false;
      }
      return;
    }
    this._egide = true;
    for (const s of gard) {
      const r2 = s.r * s.r;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const pool = s.s * e.maxHp;
        if (e.shieldMax >= pool) continue;
        if ((e.x - s.e.x) ** 2 + (e.y - s.e.y) ** 2 <= r2) {
          e.shieldMax = pool;
          e.regen = s.g * e.maxHp;
        }
      }
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (e.shieldMax <= 0) { e.shield = 0; e.egide = 0; continue; }
      // LA COQUE EST DONNEE, PAS CHARGEE. Un corps qui entre sous le rayon la
      // recoit entiere : sinon la source ne protege que ce qui traine avec elle
      // depuis trois secondes, et le renfort qui arrive au contact n'a rien.
      // Une fois BRISEE, elle se recharge — c'est la que la regeneration joue.
      if (!e.egide) { e.shield = e.shieldMax; e.egide = 1; }
      else e.shield = Math.min(e.shieldMax, e.shield + e.regen * dt);
    }
  }

  /* L'ARC EST LA MENACE, PAS LE CORPS. Une passe unique : on defait les paires
     rompues, on en forme de neuves, on charge, puis on applique.

     L'APPARIEMENT EST DETERMINISTE et se lit dans l'ordre de la liste — le plus
     petit identifiant libre prend le plus proche libre. Sans cela deux corps se
     choisiraient l'un l'autre a des images differentes et l'arc clignoterait.

     LA RUPTURE EST PLUS LARGE QUE LA FORMATION (`lienRupture` > `lienRange`) :
     sans cette hysterese, une paire qui oscille autour de sa portee passe son
     temps a se recharger, et le joueur voit un arc qui bat au lieu d'un arc. */
  _relaisPass(dt) {
    const relais = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (defDe(e.type, e.elite).lienRange) relais.push(e);
    }
    if (relais.length === 0) {
      if (this._liens.length) this._liens.length = 0;
      return;
    }
    const parId = new Map();
    for (const e of relais) parId.set(e.id, e);

    for (const e of relais) {
      if (!e.pair) continue;
      const o = parId.get(e.pair);
      const def = defDe(e.type, e.elite);
      if (!o || o.pair !== e.id
          || (e.x - o.x) ** 2 + (e.y - o.y) ** 2 > def.lienRupture ** 2) {
        if (o && o.pair === e.id) { o.pair = 0; o.lienT = 0; }
        e.pair = 0; e.lienT = 0;
      }
    }

    for (const e of relais) {
      if (e.pair) continue;
      const def = defDe(e.type, e.elite);
      let best = null, bd = def.lienRange ** 2;
      for (const o of relais) {
        if (o === e || o.pair || o.id < e.id) continue;
        const d2 = (e.x - o.x) ** 2 + (e.y - o.y) ** 2;
        if (d2 < bd) { bd = d2; best = o; }
      }
      if (!best) continue;
      e.pair = best.id; best.pair = e.id;
      e.lienT = best.lienT = ATK_CFG.WARN;
    }

    this._liens.length = 0;
    for (const e of relais) {
      if (!e.pair || e.pair < e.id) continue;
      const o = parId.get(e.pair);
      if (!o) continue;
      if (e.lienT > 0) {
        e.lienT -= dt; o.lienT = e.lienT;
        this.windup.push(e);
        this.windup.push(o);
        continue;
      }
      this._liens.push(e, o);
    }
    if (this._liens.length === 0) return;

    // LA FICHE SE LIT PAR PAIRE, PAS UNE FOIS POUR TOUTES. Une elite tend un
    // arc plus long et plus mordant que le sien : prendre la fiche du premier
    // arc pour tous les autres aurait fait porter sa morsure a des paires
    // ordinaires, et l'inverse. C'est celle du porteur de PLUS PETIT
    // identifiant qui fait foi — le meme que celui qui a forme la paire.
    for (let i = 0; i < this._liens.length; i += 2) {
      const a = this._liens[i], b = this._liens[i + 1];
      const def = defDe(a.type, a.elite);
      const vx = b.x - a.x, vy = b.y - a.y;
      const portee = Math.hypot(vx, vy);
      if (portee < 1) continue;
      const dx = vx / portee, dy = vy / portee;
      for (const p of this.players.values()) {
        if (p.downed) continue;
        const t = this._surSegment(p.x - a.x, p.y - a.y, dx, dy,
          portee, def.lienLarge + CFG.PLAYER_RADIUS);
        if (t === null) continue;
        this._hurt(p, def.lienDot * dt, { overTime: true, src: SRC_ZONE });
      }
    }
  }

  _medic(e, def, dt) {
    if (this.time - e.hitAt < def.fireWindow) e.fireT += dt;
    else e.fireT = Math.max(0, e.fireT - dt * 0.5);

    if (e.fireT >= def.breakTime) { e.fireT = 0; e.fleeT = def.fleeTime; }
    if (e.fleeT > 0) { e.fleeT -= dt; return; }

    e.healT -= dt;
    if (e.healT > 0) return;
    e.healT = def.healInterval;

    let best = null, bd = def.healRange * def.healRange;
    for (const o of this.enemies) {
      if (o === e || o.hp <= 0 || o.hp >= o.maxHp) continue;
      const d2 = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
      if (d2 < bd) { bd = d2; best = o; }
    }
    if (best) best.hp = Math.min(best.maxHp, best.hp + def.heal);
  }

  _windupSature(e, budget) {
    for (const q of this.players.values()) {
      if (Math.abs(q.x - e.x) > CFG.VIEW_W / 2 || Math.abs(q.y - e.y) > CFG.VIEW_H / 2) continue;
      if ((budget.get(q.id) ?? 0) >= ATK_CFG.VUE_MAX) return true;
    }
    return false;
  }

  _windupCompte(e, table) {
    for (const q of this.players.values()) {
      if (Math.abs(q.x - e.x) > CFG.VIEW_W / 2 || Math.abs(q.y - e.y) > CFG.VIEW_H / 2) continue;
      table.set(q.id, (table.get(q.id) ?? 0) + 1);
    }
  }

  /* `sol` PORTAIT DEUX SENS, ET L'UN DES DEUX ETAIT FAUX. Sous son ancien nom
     (`horde`) il disait a la fois « ce sol est PERSISTANT, ce n'est pas un
     telegraphe de boss » — vrai pour les cinq appelants, et lu comme tel par
     `_zoneEcarteAbris`, `_solPose` et `_foyerPoint` — et « ce sol compte dans
     le budget de la horde », ce qui etait faux pour trois d'entre eux : la
     carte de terrain d'un joueur et les noeuds du boss passent par ici.

     La consequence se mesurait : le calme, qui n'attache AUCUN trait, affichait
     quand meme 21 % de « sol de horde » a l'ecran. Et le plafond evinçait « la
     plus ancienne zone de horde » sans regarder qui l'avait posee — donc le
     terrain d'un joueur pouvait effacer une trainee, et l'inverse.

     La provenance est desormais nommee. Elle reste TOUJOURS VRAIE, donc la
     logique d'abri du boss ne change pas d'un pixel ; seuls le plafond et la
     mesure savent maintenant de quoi ils parlent. */
  _groundZone(x, y, r, dot, life, pj = 0, sol = SOL_HORDE) {
    let oldest = -1;
    let count = 0;
    for (let i = 0; i < this.zones.length; i++) {
      if (this.zones[i].sol !== sol) continue;
      count++;
      if (oldest < 0) oldest = i;
    }
    if (count >= trailMax(CFG.VIEW_W * CFG.VIEW_H) && oldest >= 0) this.zones.splice(oldest, 1);
    this._zone({
      x, y, r, dot, life, pj,
      warn: 0, tick: CFG.ZONE_TICK, sol,
    });
  }

  _separateFromPlayers() {
    const list = this.enemies;
    if (list.length === 0) return;
    const { cell, cols, rows, start, items } = this._grille();

    for (const p of this.players.values()) {
      if (p.downed) continue;
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell)));
      const y0 = cy > 0 ? cy - 1 : 0, y1 = cy + 1 < rows ? cy + 1 : rows - 1;
      const x0 = cx > 0 ? cx - 1 : 0, x1 = cx + 1 < cols ? cx + 1 : cols - 1;
      for (let gy = y0; gy <= y1; gy++) {
        const base = gy * cols;
        for (let gx = x0; gx <= x1; gx++) {
          const c = base + gx;
          for (let k = start[c]; k < start[c + 1]; k++) {
            const e = list[items[k]];
            const min = e.r + CFG.PLAYER_RADIUS - CFG.PLAYER_BITE;
            const dx = e.x - p.x, dy = e.y - p.y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min) continue;
            const d = Math.sqrt(d2) || 0.0001;
            const push = (min - d) * CFG.PLAYER_SEPARATION;
            const ux = d2 > 0.000001 ? dx / d : 1;
            const uy = d2 > 0.000001 ? dy / d : 0;
            e.x += ux * push;
            e.y += uy * push;
          }
        }
      }
    }
  }


  _pickBoss(alive) {
    if (!this.finalDone && this._rosterCleared()) return this._finalKind();

    const eligible = [];
    for (const i of BOSS_POOL) {
      if (BOSS_ROSTER[i].minPlayers <= alive) eligible.push(i);
    }
    if (eligible.length === 0) return 0;
    let pool = eligible.filter(i => !this.bossSeen.includes(i));
    if (pool.length === 0) { this.bossSeen = []; pool = eligible; }
    // deux manches de suite ne se ressemblent pas : ce que la PRECEDENTE a
    // montre passe en dernier. C'est le seul interet d'un pool plus grand que
    // le tirage, et la memoire appartient a la salle, pas au module.
    const neufs = pool.filter(i => !this.bossPrecedents.includes(i));
    if (neufs.length > 0) pool = neufs;
    const kind = pool[Math.floor(Math.random() * pool.length)];
    this.bossSeen.push(kind);
    return kind;
  }

  // le final se choisit par DIFFICULTE. C'est la seule variante de boss par
  // mode du depot, et elle est bornee au final : le pool reste commun.
  _finalKind() { return finalPour(this.diffIndex); }

  // « les cinq vaincus » se compte sur ce que la MANCHE a montre, pas sur la
  // taille du pool : il en compte huit et une manche en tire cinq.
  _rosterCleared() {
    return this.bossKindsKilled.size >= BOSS_POOL_COUNT;
  }

  _bossTargets() {
    if (!this.boss) return [];
    return this.boss2 ? [this.boss, this.boss2] : [this.boss];
  }

  _boss(dt) {
    if (!this.boss) {
      if (this.bossPending) {
        this.bossPending = false;
        this.bossCount++;
        for (const p of this.players.values()) {
          p.hf.bossUlt0 = p.skillUses[2];
          p.hf.bossDegat = 0;
        }
        const crowd = this.aliveCrowd();

        this._sweepEnemies();

        const c = this._teamCentroid();
        const bw = CFG.VIEW_W, bh = CFG.VIEW_H;
        const bcx = Math.min(Math.max(c.x, bw / 2), CFG.ARENA_W - bw / 2);
        const bcy = Math.min(Math.max(c.y, bh / 2), CFG.ARENA_H - bh / 2);
        this.bounds = {
          x0: bcx - bw / 2, y0: bcy - bh / 2,
          x1: bcx + bw / 2, y1: bcy + bh / 2,
        };
        for (const p of this.players.values()) this._clampToBounds(p, CFG.PLAYER_RADIUS);

        this.effects.push({
          id: this._nextId++,
          x: bcx, y: bcy,
          r: CFG.BOSS_SWEEP_R,
          life: 0.9, max: 0.9,
          kind: 1,
        });

        const power = CFG.BOSS_POWER_REF;
        const kind = this.segment >= TL_CFG.SEGMENTS
          ? this._finalKind()
          : this._pickBoss(this.players.size);
        this.lastBossKind = kind;
        const def = bossAt(kind);
        const hp = CFG.BOSS_HP_BASE * Math.pow(crowd, 1.15)
          * this._bossHpRamp()
          * power * CFG.BOSS_HP_MUL * this.diff.boss * def.hpMul
          * (estFinal(kind) ? BOSS_CFG.FINAL_HP_MUL : 1);
        const bars = def.bars ?? CFG.BOSS_BARS;
        const pos = this._spawnPoint();
        this.boss = {
          id: this._nextId++,
          kind,
          x: pos.x, y: pos.y,
          hp, maxHp: hp,
          bars,
          barHp: hp / bars,
          phase: 0,
          ang: 0,
          attackCd: 4,
          summonCd: CFG.BOSS_SUMMON_EVERY,
          lastAttacks: [],
          dash: 0,
          dashX: 0,
          dashY: 0,
          floor: estFinal(kind)
            ? 0
            : Math.min(this.segment - 1, bars - 1),
          spiral: null,
          hunt: null,
          gaze: 0,
          gazeWarn: 0,
          gazeRest: 0,
          gazeLeft: 0,
          ult: 0,
          miasmaCd: STATUS_CFG.BOSS_MIASMA_EVERY,
          converge: 0,
          fightT: 0,
          lastBreak: 0,
          enrage: 0,
          palier: 0,
          palierOuvert: 0,
          palierT: 0,
          finalLibre: 0,
          solT: 0,
          defer: [],
        };

        // ANCRE : il s'encastre dans un bord tire au sort, et il n'en change
        // qu'a la rupture de barre.
        if (def.archetype === "ancre") this._encastre(this.boss, Math.floor(Math.random() * 4));
        else if (def.archetype === "guetteur") this._poste(this.boss);

        if (kind === BOSS_JUMEAUX) {
          const g = BOSS_CFG.TWIN_GAP / 2;
          const B = this.bounds;
          // on ecrete le CENTRE puis on ecarte : ecreter chaque jumeau ramenait
          // les deux sur le meme bord, donc dans la portee de soin des la naissance.
          const cx = Math.min(Math.max(pos.x, B.x0 + 60 + g), B.x1 - 60 - g);
          this.boss.x = cx - g;
          this.boss.status = STATUS_BURN;
          this.boss.focus = 0;
          this.boss.focusAt = -1e9;
          this.boss2 = {
            id: this._nextId++,
            kind, twin: 1,
            x: cx + g, y: pos.y,
            ang: 0, dash: 0, dashX: 0, dashY: 0,
            status: STATUS_ROOT,
            focus: 0, focusAt: -1e9,
          };
        }
        this._alertBoss(kind);
      }
      return;
    }

    const b = this.boss;
    const t = this._nearestPlayer(b.x, b.y);
    if (!t) return;
    const dx = t.x - b.x, dy = t.y - b.y;
    const d = Math.hypot(dx, dy) || 1;

    this._bossMove(b, dt);
    if (this.boss2) this._bossMove(this.boss2, dt);

    if (b.burn) {
      b.burn.t -= dt;
      this._damage(b, b.burn.dmg * dt / CARD_CFG.BURN_TIME, b.burn.owner, 0, true);
      if (b.burn.t <= 0) b.burn = null;
      if (!this.boss) return;
    }

    b.fightT += dt;
    this._bossEnrage(b);
    this._bossDefer(b, dt);

    this._spiral(b, dt);
    this._hunt(b, dt);
    this._marks(dt);
    this._bossPassives(b, dt);
    if (!this.boss) return;
    this._bossBars(b, dt);

    b.summonCd -= dt;
    if (b.summonCd <= 0) {
      b.summonCd = CFG.BOSS_SUMMON_EVERY;
      if (this.enemies.length < this._bossAddCap()) {
        const count = this._bossSummonCount();
        const B = this.bounds;
        for (let i = 0; i < count; i++) {
          const side = Math.floor(Math.random() * 4);
          const sx = side === 2 ? B.x0 + 20 : side === 3 ? B.x1 - 20
            : B.x0 + Math.random() * (B.x1 - B.x0);
          const sy = side === 0 ? B.y0 + 20 : side === 1 ? B.y1 - 20
            : B.y0 + Math.random() * (B.y1 - B.y0);
          const r = this._spawnEnemy(-1, sx, sy);
          if (r) r.renfort = 1;
        }
      }
    }

    b.attackCd -= dt;
    if (b.attackCd <= 0 && this._surLeTemps(b, dt)) {
      const phase = Math.max(0.55, 1 - CFG.BOSS_PHASE_CD_STEP * b.phase);
      const rage = Math.max(BOSS_CFG.ENRAGE_CD_FLOOR, 1 - BOSS_CFG.ENRAGE_CD * b.enrage);
      b.attackCd = CFG.BOSS_ATTACK_CD * phase * rage;
      this._bossAttack(b, dx / d, dy / d);
    }
  }

  // LE METRONOME FRAPPE SUR LE TEMPS, et le temps se DEDUIT : la grille est
  // `this.time`, que le client a deja (`tm`). Rien ne traverse le reseau, et le
  // metronome visuel ne peut donc pas mentir.
  _surLeTemps(b, dt) {
    if (b.kind !== BOSS_METRONOME) return true;
    const T = BOSS_CFG.METRO_BEAT * BOSS_CFG.METRO_MEASURE;
    const av = (this.time - dt) % T;
    const ap = this.time % T;
    return ap < av;
  }

  _bossEnrage(b) {
    const seuil = BOSS_CFG.ENRAGE_PAR_BARRE * b.bars;
    if (b.fightT < seuil) return;
    const palier = 1 + Math.floor((b.fightT - seuil) / BOSS_CFG.ENRAGE_STEP);
    if (palier <= b.enrage) return;
    b.enrage = palier;
    this._alert(MECH_ENRAGE, 2);
  }

  _encastre(b, bord) {
    const B = this.bounds;
    const marge = CFG.BOSS_RADIUS * 0.6;
    b.bord = bord;
    if (bord === 0) { b.x = (B.x0 + B.x1) / 2; b.y = B.y0 + marge; }
    else if (bord === 1) { b.x = (B.x0 + B.x1) / 2; b.y = B.y1 - marge; }
    else if (bord === 2) { b.x = B.x0 + marge; b.y = (B.y0 + B.y1) / 2; }
    else { b.x = B.x1 - marge; b.y = (B.y0 + B.y1) / 2; }
  }

  // le guetteur n'est pas encastre : il se POSTE, a distance de l'equipe et
  // jamais sur le bord — un boss immobile colle au bord rend la moitie de la
  // vue inutile.
  _poste(b) {
    const c = this._teamCentroid();
    const a = Math.random() * Math.PI * 2;
    const pt = this._dropPoint(c.x + Math.cos(a) * BOSS_CFG.RELOC_DIST,
                               c.y + Math.sin(a) * BOSS_CFG.RELOC_DIST, 90);
    b.x = pt.x; b.y = pt.y;
  }

  // UN BOSS QUI NE MARCHE PAS DOIT QUAND MEME CHANGER DE PLACE : sinon la
  // moitie de l'arene ne sert a rien de tout le combat et la lecture du sol se
  // fait une seule fois. La rupture de barre le reinstalle — l'ancre change de
  // bord, le guetteur se poste ailleurs.
  _bossReplace(b) {
    this.effects.push({ id: this._nextId++, x: b.x, y: b.y,
                        r: 130, life: 0.35, max: 0.35, kind: 14 });
    if (bossAt(b.kind).archetype === "ancre") {
      this._encastre(b, ((b.bord ?? 0) + 1 + Math.floor(Math.random() * 3)) % 4);
    } else {
      this._poste(b);
    }
    this.effects.push({ id: this._nextId++, x: b.x, y: b.y,
                        r: 130, life: 0.35, max: 0.35, kind: 14 });
    this._alert(MECH_RELOC, 2);
  }

  _twinFocus(b) {
    if (!b.focus || this.time - b.focusAt > BOSS_CFG.TWIN_FOCUS_TIME) return null;
    const p = this.players.get(b.focus);
    return p && !p.downed ? p : null;
  }

  _twinLead() {
    if (!this.boss2 || this.boss.converge > 0) return null;
    const a = this._twinFocus(this.boss) ? this.boss : null;
    const c = this._twinFocus(this.boss2) ? this.boss2 : null;
    if (!a) return c;
    if (!c) return a;
    return a.focusAt >= c.focusAt ? a : c;
  }

  _bossMove(b, dt) {
    const arche = bossAt(b.kind).archetype;
    // ANCRE : il ne se deplace plus du tout. Un cote de l'arene devient
    // dangereux en permanence, l'autre est un refuge, et la distance devient un
    // arbitrage constant au lieu d'etre imposee par un boss qui suit.
    // GUETTEUR : il ne bouge pas non plus, mais il n'est pas encastre — c'est
    // son regard qui occupe l'espace, pas son corps.
    if (arche === "ancre" || arche === "guetteur") {
      const t = this._nearestPlayer(b.x, b.y);
      if (t) b.ang = Math.atan2(t.y - b.y, t.x - b.x);
      return;
    }
    // FIXE : il ne marche pas, il se TELEPORTE. L'espace est neutre, tout est
    // dans la lecture du sol.
    if (arche === "fixe") {
      const t = this._nearestPlayer(b.x, b.y);
      if (t) b.ang = Math.atan2(t.y - b.y, t.x - b.x);
      b.blinkCd = (b.blinkCd ?? BOSS_CFG.BLINK_EVERY) - dt;
      if (b.blinkCd > 0) return;
      b.blinkCd = BOSS_CFG.BLINK_EVERY;
      if (!t) return;
      const a = Math.random() * Math.PI * 2;
      const pt = this._dropPoint(t.x + Math.cos(a) * BOSS_CFG.BLINK_DIST,
                                 t.y + Math.sin(a) * BOSS_CFG.BLINK_DIST, 90);
      this.effects.push({ id: this._nextId++, x: b.x, y: b.y,
                          r: 120, life: 0.35, max: 0.35, kind: 14 });
      b.x = pt.x; b.y = pt.y;
      this.effects.push({ id: this._nextId++, x: b.x, y: b.y,
                          r: 120, life: 0.35, max: 0.35, kind: 14 });
      return;
    }

    let tx, ty;
    if (this.boss.converge > 0 && this.boss2) {
      tx = (this.bounds.x0 + this.bounds.x1) / 2;
      ty = (this.bounds.y0 + this.bounds.y1) / 2;
    } else {
      const t = this._twinFocus(b) ?? this._nearestPlayer(b.x, b.y);
      if (!t) return;
      tx = t.x; ty = t.y;
      const lead = this._twinLead();
      if (lead && lead !== b
          && (b.x - lead.x) ** 2 + (b.y - lead.y) ** 2
             < BOSS_CFG.TWIN_STANDOFF ** 2) {
        let ex = b.x - lead.x, ey = b.y - lead.y;
        const e = Math.hypot(ex, ey);
        if (e < 1) { ex = Math.cos(b.ang + Math.PI / 2); ey = Math.sin(b.ang + Math.PI / 2); }
        else { ex /= e; ey /= e; }
        tx = b.x + ex * BOSS_CFG.TWIN_STANDOFF;
        ty = b.y + ey * BOSS_CFG.TWIN_STANDOFF;
      }
    }
    const dx = tx - b.x, dy = ty - b.y;
    const d = Math.hypot(dx, dy) || 1;
    b.ang = Math.atan2(dy, dx);
    if (b.dash > 0) {
      b.dash -= dt;
      b.x += b.dashX * 430 * dt;
      b.y += b.dashY * 430 * dt;
    } else {
      b.x += (dx / d) * CFG.BOSS_SPEED * dt;
      b.y += (dy / d) * CFG.BOSS_SPEED * dt;
    }
    const B = this.bounds;
    b.x = Math.min(Math.max(b.x, B.x0 - 80), B.x1 + 80);
    b.y = Math.min(Math.max(b.y, B.y0 - 80), B.y1 + 80);
  }

  // le plancher de la barre courante. Y toucher, c'est rendre au DPS le pouvoir
  // de sauter des phases : `_damage` s'y arrete, `_bossBars` l'attend.
  _bossFloor(b) {
    if (b.phase < b.bars - 1) return b.maxHp - (b.phase + 1) * b.barHp;
    // LA DERNIERE BARRE DU FINAL A SON PALIER ELLE AUSSI, et il se compte comme
    // les autres — au plancher, pas depuis la rupture precedente. `finalLibre`
    // est le terminus : sans lui le plancher se rouvre a l'image suivante, parce
    // que `palierOuvert` retombe a zero des que le plancher disparait.
    if (estFinal(b.kind) && !b.finalLibre) return 1;
    return null;
  }

  // le palier MONTE avec la difficulte, ce qui est contre-intuitif : c'est le
  // moment ou se joue la mecanique de la phase suivante, donc en cauchemar on
  // en subit PLUS, pas moins.
  // LE FINAL RESPIRE DE PLUS EN PLUS. Sept ruptures qui ouvrent chacune une
  // couche, toutes cadencees pareil, c'est une escalade sans palier de lecture :
  // la fenetre s'allonge avec la phase, donc la derniere vaut 3,5 fois la
  // premiere et le moment ou il devient tuable est le plus long du combat.
  // Elle est PAYEE EN PV (`FINAL_HP_MUL`), jamais ajoutee a l'horloge.
  _palierTime(b) {
    const base = this._bossProfil().palier ?? BOSS_CFG.PALIER_TIME;
    if (!b || !estFinal(b.kind)) return base;
    return base * (1 + BOSS_CFG.FINAL_PALIER_RAMP * b.phase);
  }

  // TOUT SOIN DE BOSS PASSE ICI. Sans ce point de passage, un boss qui se
  // soigne ne casse JAMAIS de barre : le soin le decolle du plancher entre le
  // clamp de `_damage` et le test de `_bossBars`, et la rupture n'arrive pas.
  // Deux regles : on ne remonte pas au-dessus du plafond de la barre courante,
  // et on ne soigne pas du tout quand une rupture est en attente.
  _bossHeal(b, amount) {
    if (!(amount > 0)) return;
    const plancher = this._bossFloor(b);
    if (plancher !== null && b.hp <= plancher + 1e-6) return;
    const plafond = b.maxHp - b.phase * b.barHp;
    b.hp = Math.min(plafond, b.hp + amount);
  }

  // LE PALIER S'OUVRE AU PLANCHER, PAS A LA RUPTURE PRECEDENTE. Le compte partait
  // de `lastBreak` : une barre fondue en 2 s laissait 8 s ou le boss ne prenait
  // plus rien, une barre lente n'en laissait aucune. Le temps mort etait donc
  // maximal exactement quand l'equipe jouait le mieux, et `hpMul` n'achetait plus
  // une duree mais du vide. Il dure maintenant ce qu'il faut pour lire
  // l'ouverture de la couche suivante, et la duree du combat redevient la somme
  // des fontes.
  _bossBars(b, dt) {
    const max = this._palierTime(b);
    const plancher = this._bossFloor(b);
    const auPlancher = plancher !== null && b.hp <= plancher + 1e-6;

    if (!auPlancher) {
      b.palier = 0;
      b.palierOuvert = 0;
      return;
    }

    // le palier est la fenetre ou le boss est DE FAIT invulnerable. Il se voit
    // (enveloppe, barre blanche, ricochets) et il est OCCUPE : la mecanique de
    // la phase suivante s'y joue, ce qui en fait le sommet de la phase.
    if (!b.palierOuvert) {
      b.palierOuvert = 1;
      b.palierT = max;
      this.effects.push({
        id: this._nextId++, x: b.x, y: b.y,
        r: CFG.BOSS_BREAK_RADIUS * 0.55, life: 0.55, max: 0.55, kind: 15,
      });
      if (b.phase < b.bars - 1 && b.phase < this._bossProfil().couches) {
        const couche = bossAt(b.kind).unlock[b.phase];
        if (couche && couche.length) {
          this._deferAtk(b, couche[Math.floor(Math.random() * couche.length)],
                         BOSS_CFG.PALIER_AMORCE);
        }
      }
    }

    b.palierT -= dt;
    b.palier = Math.max(0, Math.min(1, b.palierT / max));
    if (b.palierT > 0) return;

    // derniere barre : le palier s'acheve en LIBERANT le boss, pas en rompant
    // une barre qui n'existe pas. Seul un final y passe — un boss ordinaire n'a
    // pas de plancher sur sa derniere barre.
    if (b.phase >= b.bars - 1) { b.finalLibre = 1; b.palier = 0; return; }

    b.lastBreak = b.fightT;
    b.palier = 0;
    b.palierOuvert = 0;
    b.phase++;
    b.attackCd = Math.max(b.attackCd, 1.6);
    this.shots = [];

    this.effects.push({
      id: this._nextId++,
      x: b.x, y: b.y,
      r: CFG.BOSS_BREAK_RADIUS,
      life: 0.8, max: 0.8,
      kind: 6,
    });

    this.barsBroken++;
    this._breakRefresh();
    this._bossBreak(b);
  }

  // « Briseur » : la rupture de barre est le seul moment ou une recharge se remet a
  // zero sans qu'un joueur ait agi. Deuxieme palier : un cinquieme de bouclier.
  _breakRefresh() {
    for (const p of this.players.values()) {
      const n = p.mods.breakRefresh;
      if (!(n > 0) || p.downed) continue;
      p.cd1 = 0; p.cd2 = 0; p.cd3 = 0;
      if (n >= 2 && p.mods.shieldPool > 0) {
        this._grantShield(p, p.mods.shieldPool * 0.2, p.mods.shieldPool);
      }
      this.effects.push({
        id: this._nextId++, x: p.x, y: p.y, r: 70, life: 0.4, max: 0.4, kind: 4,
      });
    }
  }

  _bossBreak(b) {
    // CONSTRICTEUR : la constriction cesse d'etre une attaque pour devenir
    // l'ETAT du combat. A chaque rupture l'arene perd un cran et ne le reprend
    // pas — un soft-enrage entierement spatial, sans compte a rebours, et bien
    // plus lisible qu'un multiplicateur de degats.
    const arche = bossAt(b.kind).archetype;
    if (arche === "constricteur") this._atkConstriction(b);
    if (arche === "ancre" || arche === "guetteur") this._bossReplace(b);

    switch (b.kind) {
      case BOSS_MATRIARCHE:
        this._finalBrood(b);
        return;

      case BOSS_METRONOME:
        this._finalReverse();
        return;

      case BOSS_ORACLE:
        this._finalVuln();
        return;

      case BOSS_JUMEAUX: {
        if (!this.boss2) return;
        const x = b.x, y = b.y;
        b.x = this.boss2.x; b.y = this.boss2.y;
        this.boss2.x = x; this.boss2.y = y;
        this._alert(MECH_SWAP, 2);
        return;
      }

      // le Veilleur n'a pas de cas : sa rupture EST la reinstallation, posee
      // plus haut. Un regard de plus ici tombait sur la phase la plus chargee
      // et refermait la fenetre de tir au moment ou elle venait d'etre gagnee.

      case BOSS_TISSEUR:
        this._atkNoeuds(b);
        return;

      case BOSS_PRISME:
        this._atkEchange(b);
        return;

      // le Recitant REJOUE, il n'invente rien : une rupture rend l'equipe a
      // plein comme un examen blanc, et la barre suivante ouvre sur la mecanique
      // du boss suivant. C'est le seul boss dont la rupture soigne.
      case BOSS_RECITANT: {
        for (const p of this._alivePlayers()) {
          p.hp = Math.min(p.maxHp, p.hp + p.maxHp * BOSS_CFG.RECITANT_HEAL);
        }
        this._alert(MECH_BREATH, 2);
        return;
      }

      case BOSS_SILENCE:
        if (b.phase >= b.bars - 2) b.silence = 1;
        this._finalVuln();
        return;

      case BOSS_FINAL: {
        if (b.phase <= 1) { this._alert(MECH_BREATH, 2); return; }
        if (b.phase === 2) { this._finalBrood(b); return; }
        if (b.phase === 3) { this._finalReverse(); return; }
        if (b.phase === 4) { this._finalVuln(); return; }
        this._finalBrood(b);
        this._finalVuln();
        return;
      }

      default:
        this._alert(MECH_BREATH, 2);
    }
  }

  _finalBrood(b) {
    for (let i = 0; i < BOSS_CFG.BROOD_COUNT; i++) {
      if (this.enemies.length >= this._enemyCap()) break;
      const a = Math.random() * Math.PI * 2;
      this._spawnEnemy(1, b.x + Math.cos(a) * 130, b.y + Math.sin(a) * 130);
    }
    this._alert(MECH_BROOD, 2);
  }

  _finalVuln() {
    for (const p of this._alivePlayers()) {
      this._applyStatus(p, STATUS_VULN, BOSS_CFG.MECH_VULN);
    }
    this._alert(MECH_MIASMA, 0);
  }

  _finalReverse() {
    let n = 0;
    for (const z of this.zones) {
      if (z.follow) continue;
      if (!z.vx && !z.vy) continue;
      z.vx = -z.vx; z.vy = -z.vy;
      n++;
    }
    if (n > 0) this._alert(MECH_REVERSE, 2);
    else this._alert(MECH_BREATH, 2);
  }

  _bossAttack(b, ux, uy) {
    const P = this._bossProfil();
    // CALME NE DEBLOQUE PAS `unlock[3]` : la couche la plus dure de chaque boss
    // est ce que `normal` a de plus, au lieu du meme contenu en plus mou.
    const pool = bossPool(b.kind, Math.min(P.couches, Math.max(b.phase, b.floor)));
    const choice = this._pickAtk(b, pool);
    if (!choice) return;
    this._atk(choice, b, ux, uy);
    // DEUX MECANIQUES PAR PHASE, ET EN CAUCHEMAR L'UNE SUR L'AUTRE : la
    // difficulte d'un raid n'a jamais ete la fenetre de reaction, c'est la
    // SUPERPOSITION. Mais le NOMBRE suit la phase et pas seulement la
    // difficulte : `parPhase` reste le plafond, la barre en donne le rythme —
    // une mecanique a la barre 1, deux a partir de la barre 3. C'est ce que la
    // structure `base` + `unlock[0..3]` prepare deja, il ne manquait que la
    // cadence pour l'accompagner.
    const par = Math.min(P.parPhase, 1 + Math.floor(b.phase / 2));
    for (let i = 1; i < par && pool.length > 1; i++) {
      const autre = this._pickAtk(b, pool);
      if (!autre || autre === choice) continue;
      this._deferAtk(b, autre, P.superpose ? BOSS_CFG.SUPERPOSE_GAP : BOSS_CFG.SUITE_GAP);
    }
  }

  // POINT DE PASSAGE UNIQUE DU TIRAGE D'ATTAQUE. La memoire porte sur les
  // `ATK_MEMO` dernieres et non sur la seule precedente : tant que le pool a au
  // moins ATK_MEMO + 1 entrees, rien ne revient avant que trois autres soient
  // passees. Le tirage differe d'une salve consomme un cran lui aussi.
  //
  // UN REFUS EST UN RETIRAGE, PAS UN REPLI. Le verrou de coexistence se lit ICI,
  // avant le tirage : sinon une entree refusee retombait sur `_atkMarques`, le
  // boss perdait sa pression et les combats s'allongeaient de moitie.
  _pickAtk(b, pool) {
    if (!pool.length) return null;
    const jouable = pool.filter(k => this._atkJouable(b, k));
    const base = jouable.length ? jouable : pool;
    const memo = (b.lastAttacks ??= []);
    const libres = base.filter(k => !memo.includes(k));
    const source = libres.length ? libres : base;
    const choice = source[Math.floor(Math.random() * source.length)];
    memo.push(choice);
    while (memo.length > BOSS_CFG.ATK_MEMO) memo.shift();
    return choice;
  }

  _atkJouable(b, key) {
    if (ATK_SOL.has(key) && !this._solPret(b)) return false;
    const mech = ATK_POSE[key];
    return mech === undefined || this._mechLibre(mech);
  }

  _atk(key, b, ux, uy) {
    switch (key) {
      case "salve":        this._atkSalve(b); break;
      case "marques":      this._atkMarques(b); break;
      case "charge":       b.dash = 0.55; b.dashX = ux; b.dashY = uy; break;
      case "damier":       this._atkDamier(b); break;
      case "couronne":     this._atkCouronne(b); break;
      case "couloirs":     this._atkCouloirs(b); break;
      case "balayage":     this._atkBalayage(b); break;
      case "spirale":      this._atkSpirale(b); break;
      case "traque":       this._atkTraque(b); break;
      case "mur":          this._atkMur(b); break;
      case "quadrant":     this._atkQuadrant(b); break;
      case "grappes":      this._atkGrappes(b); break;
      case "nourriciers":  this._atkNourriciers(b); break;
      case "prison":       this._atkPrison(b); break;
      case "proximite":    this._atkProximite(b); break;
      case "exaflare":     this._atkExaflare(b); break;
      case "appat":        this._atkAppats(b); break;
      case "derive":       this._atkDerive(b); break;
      case "sanctuaire":   this._atkSanctuaires(b); break;
      case "verglas":      this._atkVerglas(b); break;
      case "rassemblement":this._atkRassemblement(b); break;
      case "dispersion":   this._atkDispersion(b); break;
      case "tours":        this._atkTours(b, false); break;
      case "denombrement": this._atkTours(b, true); break;
      case "regard":       this._atkRegard(b); break;
      case "lien":         this._atkLien(b); break;
      case "croix":        this._atkCroix(b); break;
      case "croixdurable": this._atkCroixDurable(b); break;
      case "cone":         this._atkCone(b); break;
      case "pacman":       this._atkPacman(b); break;
      case "constriction": this._atkConstriction(b); break;
      case "synthese":     this._atkSynthese(b, 0); break;
      case "entrelacs":    this._atkSynthese(b, 1); break;
      case "sceau":        this._atkSceau(b); break;
      case "regarddouble":    this._atkRegardDouble(b); break;
      case "regardmobile":    this._atkRegardMobile(b); break;
      case "regardpermanent": this._atkRegardPermanent(b); break;
      case "noeuds":          this._atkNoeuds(b); break;
      case "copies":          this._atkCopies(b); break;
      case "copiesrenvoi":    this._atkCopiesRenvoi(b); break;
      case "copiesliees":     this._atkCopiesLiees(b); break;
      case "copiesvraie":     this._atkCopiesVraie(b); break;
      case "echange":         this._atkEchange(b); break;
      case "synthesedouble":  this._atkSyntheseDouble(b); break;
      case "sansannonce":     this._atkSansAnnonce(b); break;
      default:             this._atkMarques(b); break;
    }
  }

  // VEILLEUR — le seul verbe qui INTERDIT l'action principale : dans un jeu de
  // tir a double stick, « detourner le regard » se traduit par cesser de viser,
  // donc renoncer a son DPS. Deux fenetres d'affilee, mais separees par le
  // repos : sans lui la seconde s'ouvrait a l'instant ou la premiere se
  // fermait, donc une seule fenetre de cinq secondes portant deux annonces.
  // La marge n'est pas cosmetique : le differe tombe a l'instant exact ou le
  // repos s'acheve, et sans elle l'ordre des deux dans le tick decide si la
  // seconde fenetre s'ouvre ou se replie en cone.
  _atkRegardDouble(b) {
    this._atkRegard(b);
    // LE DIFFERE LIT LA MEME FENETRE QUE L'OUVERTURE. Il comptait sur
    // `GAZE_WARN` BRUT alors que `_atkRegard` ouvre sur `_warn(GAZE_WARN)` : en
    // cauchemar derniere phase (`reflexe`) la fenetre tombe a 0,8 s et le second
    // regard arrivait quand meme 4,0 s plus tard — 3,2 s de trou, et le double
    // regard cessait d'etre un double pour devenir deux regards.
    this._deferAtk(b, "regard",
      BOSS_CFG.GAZE_TIME + this._warn(BOSS_CFG.GAZE_WARN) + BOSS_CFG.GAZE_REST + 0.1);
  }

  _atkRegardMobile(b) {
    this._atkRegard(b);
    this._deferAtk(b, "derive", 0.6);
  }

  // en derniere phase l'oeil CLIGNOTE au lieu de rester ouvert : « le tuer en
  // ne le visant que par intermittence » demande que l'intermittence existe.
  _atkRegardPermanent(b) {
    if (!this._gazeOuvre(b, BOSS_CFG.GAZE_PERM_OPEN, BOSS_CFG.GAZE_PERMANENT)) {
      this._atkCone(b);
    }
  }

  // TISSEUR — le Ravageur RETIRE de l'arene par la peripherie, le Tisseur
  // CONSTRUIT a l'interieur. Les noeuds sont la contrepartie : les detruire rend
  // de l'espace, et c'est le seul boss ou le joueur repare l'arene.
  _atkNoeuds(b) {
    if (!this._mechLibre(MECH_CLUSTER)) { this._atkMarques(b); return; }
    const hp = BOSS_CFG.NOEUD_HP * this._bossPower();
    const n = Math.max(2, Math.min(BOSS_CFG.NOEUD_COUNT, this._alivePlayers().length + 1));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const d = 140 + Math.random() * 220;
      const pt = this._dropPoint(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d);
      this._mark({
        mech: MECH_CLUSTER, noeud: 1,
        x: pt.x, y: pt.y, r: 34, t: BOSS_CFG.NOEUD_TIME,
        hp, maxHp: hp,
      });
    }
    this._alert(MECH_CLUSTER, BOSS_CFG.NOEUD_TIME, "noeud");
  }

  // PRISME — la ou les Jumeaux demandent de SEPARER, le Prisme demande de
  // DISTINGUER. Les copies rejouent le deplacement des joueurs avec un decalage :
  // c'est le mecanisme des appats, pousse au rang d'identite.
  _atkCopies(b, mult = 1) {
    for (const p of this._alivePlayers()) {
      this._mark({
        mech: MECH_BAIT, a: p.id, x: p.x, y: p.y, r: BOSS_CFG.BAIT_R,
        t: BOSS_CFG.BAIT_COUNT * BOSS_CFG.BAIT_STEP * mult,
        left: Math.round(BOSS_CFG.BAIT_COUNT * mult), step: 0,
      });
    }
    this._alert(MECH_BAIT, BOSS_CFG.BAIT_COUNT * BOSS_CFG.BAIT_STEP * mult);
  }

  _atkCopiesRenvoi(b) {
    this._atkCopies(b);
    this._deferAtk(b, "salve", BOSS_CFG.BAIT_STEP * 2);
  }

  _atkCopiesLiees(b) {
    this._atkCopies(b);
    this._deferAtk(b, "lien", BOSS_CFG.BAIT_STEP);
  }

  // « lequel est le vrai » : il prend la place de sa cible la plus lointaine.
  _atkEchange(b) {
    const alive = this._alivePlayers();
    if (alive.length === 0) { this._atkMarques(b); return; }
    let loin = alive[0], bd = -1;
    for (const p of alive) {
      const d = (p.x - b.x) ** 2 + (p.y - b.y) ** 2;
      if (d > bd) { bd = d; loin = p; }
    }
    this.effects.push({ id: this._nextId++, x: b.x, y: b.y,
                        r: 130, life: 0.35, max: 0.35, kind: 14 });
    const pt = this._dropPoint(loin.x, loin.y, 90);
    b.x = pt.x; b.y = pt.y;
    this.effects.push({ id: this._nextId++, x: b.x, y: b.y,
                        r: 130, life: 0.35, max: 0.35, kind: 14 });
    this._alert(MECH_SWAP, 1.2);
    this._deferAtk(b, "salve", 0.5);
  }

  // « la vraie change » : il prend une autre place ET noie l'ecran de copies.
  _atkCopiesVraie(b) {
    this._atkEchange(b);
    this._atkCopies(b, 1.5);
  }

  _atkSyntheseDouble(b) {
    this._atkSynthese(b, 0);
    this._deferAtk(b, "entrelacs", BOSS_CFG.SYNTH_GAP * 2);
  }

  // SILENCE — le seul boss autorise a casser une regle, et une seule : passe ce
  // point, une mecanique deja vue REVIENT SANS ANNONCE. Ca ne tient que parce
  // que la grammaire du lot 05 est acquise partout ailleurs. Le telegraphe AU
  // SOL reste : c'est l'annonce qui disparait, pas la geometrie.
  _atkSansAnnonce(b) {
    b.silence = 1;
    this._alert(MECH_SYNTH, 2);
  }

  _atkSynthese(b, variante) {
    if (variante === 0) {
      this._atkRassemblement(b);
      this._deferAtk(b, "exaflare", BOSS_CFG.SYNTH_GAP);
    } else {
      this._atkCouronne(b);
      this._deferAtk(b, "derive", BOSS_CFG.SYNTH_GAP);
    }
    this._alert(MECH_SYNTH, BOSS_CFG.SYNTH_GAP);
  }

  _deferAtk(b, key, delay) {
    (b.defer ??= []).push({ key, t: delay });
  }

  _bossDefer(b, dt) {
    if (!b.defer || b.defer.length === 0) return;
    const restants = [];
    for (const d of b.defer) {
      d.t -= dt;
      if (d.t > 0) { restants.push(d); continue; }
      this._atk(d.key, b, Math.cos(b.ang), Math.sin(b.ang));
    }
    b.defer = restants;
  }

  _atkSceau(b) {
    const alive = this._alivePlayers();
    if (alive.length === 0) return;
    if (!this._mechLibre(MECH_SEAL)) { this._atkMarques(b); return; }
    const grp = this._nextId++;
    const B = this.bounds;
    const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
    const rad = Math.min(B.x1 - B.x0, B.y1 - B.y0) * BOSS_CFG.SEAL_SPREAD;
    const base = Math.random() * Math.PI * 2;
    const n = towerCount(alive.length);

    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      const pt = this._foyerPoint(cx, cy, rad, a, BOSS_CFG.SEAL_RADIUS,
                                  this._warn(BOSS_CFG.SEAL_WARN));
      this._mark({
        mech: MECH_SEAL, grp, lead: i === 0 ? 1 : 0,
        x: pt.x, y: pt.y,
        r: BOSS_CFG.SEAL_RADIUS, t: this._warn(BOSS_CFG.SEAL_WARN), need: 1,
      });
    }
    this._alert(MECH_SEAL, this._warn(BOSS_CFG.SEAL_WARN));
  }

  _resolveSceau(lead) {
    const group = this.marks.filter(m => m.grp === lead.grp);
    const alive = this._alivePlayers();
    if (alive.length === 0) return;
    const foyers = Math.min(group.length, alive.length);
    let tenus = 0;
    for (const m of group) {
      if (this._countIn(m) >= 1) tenus++;
    }
    if (tenus >= foyers) return;
    const fautifs = alive.filter(p =>
      !group.some(m => (p.x - m.x) ** 2 + (p.y - m.y) ** 2 <= m.r * m.r));
    this._mechFail(fautifs.length ? fautifs : alive, BOSS_CFG.SEAL_RATIO, MECH_SEAL);
  }

  _atkSpirale(b) {
    b.spiral = {
      left: CFG.SPIRAL_SHOTS,
      t: 0,
      ang: Math.random() * Math.PI * 2,
      dir: Math.random() < 0.5 ? 1 : -1,
    };
  }

  _spiral(b, dt) {
    const s = b.spiral;
    if (!s || s.left <= 0) return;
    s.t -= dt;
    while (s.t <= 0 && s.left > 0) {
      for (let i = 0; i < CFG.SPIRAL_ARMS; i++) {
        const a = s.ang + (i / CFG.SPIRAL_ARMS) * Math.PI * 2;
        this.shots.push({
          id: this._nextId++,
          x: b.x, y: b.y,
          vx: Math.cos(a) * CFG.SHOT_SPEED,
          vy: Math.sin(a) * CFG.SHOT_SPEED,
          life: CFG.SHOT_LIFE,
        });
      }
      s.ang += s.dir * CFG.SPIRAL_TURN * CFG.SPIRAL_STEP;
      s.left--;
      s.t += CFG.SPIRAL_STEP;
    }
    if (s.left <= 0) b.spiral = null;
  }

  _atkTraque(b) {
    b.hunt = { left: CFG.HUNT_WAVES, t: 0 };
  }

  _hunt(b, dt) {
    const h = b.hunt;
    if (!h || h.left <= 0) return;
    h.t -= dt;
    if (h.t > 0) return;

    h.t = CFG.HUNT_STEP;
    h.left--;
    for (const p of this.players.values()) {
      if (p.downed) continue;
      this._zone({
        x: p.x, y: p.y,
        r: CFG.HUNT_RADIUS,
        warn: CFG.HUNT_WARN,
        follow: p.id, chase: CFG.HUNT_CHASE,
        dmg: this._zoneDamage(b),
      });
    }
    if (h.left <= 0) b.hunt = null;
  }

  _atkMur(b) {
    if (!this._solPret(b)) { this._atkMarques(b); return; }
    const n0 = this.zones.length;
    const B = this.bounds;
    const bw = B.x1 - B.x0, bh = B.y1 - B.y0;
    const vertical = Math.random() < 0.5;
    const span = vertical ? bw : bh;
    const across = vertical ? bh : bw;
    let hole = CFG.WALL_HOLE / 2 + Math.random() * (across - CFG.WALL_HOLE);
    const drift = (Math.random() < 0.5 ? 1 : -1) * (across / (CFG.WALL_STEPS + 1));

    for (let i = 0; i < CFG.WALL_STEPS; i++) {
      const k = (i + 0.5) / CFG.WALL_STEPS;
      const pos = span * k;
      hole += drift;
      if (hole < CFG.WALL_HOLE / 2 || hole > across - CFG.WALL_HOLE / 2) {
        hole = Math.min(Math.max(hole, CFG.WALL_HOLE / 2), across - CFG.WALL_HOLE / 2);
      }
      const warn = CFG.WALL_WARN + i * CFG.WALL_STAGGER;

      const before = hole - CFG.WALL_HOLE / 2;
      const after = across - (hole + CFG.WALL_HOLE / 2);
      if (before > 4) {
        this._zone({
          shape: 1,
          x: B.x0 + (vertical ? pos : before / 2),
          y: B.y0 + (vertical ? before / 2 : pos),
          w: vertical ? CFG.WALL_THICKNESS : before,
          h: vertical ? before : CFG.WALL_THICKNESS,
          warn, dmg: this._zoneDamage(b),
        });
      }
      if (after > 4) {
        this._zone({
          shape: 1,
          x: B.x0 + (vertical ? pos : across - after / 2),
          y: B.y0 + (vertical ? across - after / 2 : pos),
          w: vertical ? CFG.WALL_THICKNESS : after,
          h: vertical ? after : CFG.WALL_THICKNESS,
          warn, dmg: this._zoneDamage(b),
        });
      }
    }
    this._solPose(b, n0);
  }


  _alivePlayers() {
    const out = [];
    for (const p of this.players.values()) if (!p.downed) out.push(p);
    return out;
  }

  _teamCentroid() {
    const ps = this._alivePlayers();
    if (ps.length === 0) {
      const B = this.bounds;
      return { x: (B.x0 + B.x1) / 2, y: (B.y0 + B.y1) / 2 };
    }
    let sx = 0, sy = 0;
    for (const p of ps) { sx += p.x; sy += p.y; }
    return { x: sx / ps.length, y: sy / ps.length };
  }

  /* LA VARIANTE NE CHANGE QUE LE LIBELLE. Le creneau, le niveau et le compte
     restent ceux de la mecanique ; le Silence, lui, se souvient PAR variante —
     avoir vu une grappe n'a jamais rien appris sur un noeud. */
  _alert(mech, dur = 0, variante = null) {
    const def = mechAt(mech);
    if (!def) return;
    // compte AVANT le Silence : la mecanique est posee meme quand elle ne
    // s'annonce pas, et c'est la pose qui sert de denominateur au taux d'echec.
    this._mechCompte(mech, "pose");
    // le Silence : une mecanique deja vue dans ce combat ne s'annonce plus. Le
    // telegraphe au sol reste, seule l'annonce disparait.
    if (this.boss && this.boss.silence) {
      const vus = (this.boss.vus ??= new Set());
      const cle = variante ? `${mech}:${variante}` : mech;
      if (vus.has(cle)) return;
      vus.add(cle);
    }
    const a = { mech, level: def.level, dur: Math.round(dur * 100) / 100 };
    if (variante) a.v = variante;
    this.alerts.push(a);
    if (this.alerts.length > 16) this.alerts.shift();
  }

  _alertWeather(id) {
    const def = weatherAt(id);
    if (!def) return;
    this.alerts.push({ meteo: id, level: ALERT_INFO, dur: 0 });
    if (this.alerts.length > 16) this.alerts.shift();
  }

  _alertBoss(kind) {
    this.alerts.push({ mech: -1, level: ALERT_INFO, dur: 3, boss: kind });
  }

  _alertSpecial(index) {
    this.alerts.push({ mech: -1, level: ALERT_WARN, dur: CFG.WAVE_BREATHER, special: index });
    if (this.alerts.length > 16) this.alerts.shift();
  }

  // UNE DIFFICULTE DE BOSS SE REGLE PAR LE NOMBRE DE CHOSES A LIRE EN MEME
  // TEMPS, ni par les PV ni par les degats. Le profil porte les six leviers, et
  // il n'y a qu'un point de lecture.
  _bossProfil() {
    return this.diff.bossProfil ?? DIFFICULTIES[DIFF_NORMAL].bossProfil;
  }

  // le temps dit l'urgence, et il n'a que quatre valeurs : le profil DEPLACE
  // une duree ecrite d'un cran, il n'en invente pas.
  _warn(d) {
    const P = this._bossProfil();
    const i = WARN_CLASSES.indexOf(d);
    const phase = this.boss ? this.boss.phase : 0;
    if (P.reflexe >= 0 && phase >= P.reflexe) return WARN_REFLEXE;
    if (i < 0 || !P.warn) return d;
    // le decalage va DANS LES DEUX SENS : calme donne un cran de plus a lire,
    // cauchemar un cran de moins. Sans le plancher, un `warn` negatif sur une
    // duree deja au reflexe sortait de la table et rendait `undefined`.
    return WARN_CLASSES[Math.max(0,
      Math.min(WARN_CLASSES.length - 1, i + P.warn))];
  }

  _mechDamage(p) {
    return p.maxHp * BOSS_CFG.MECH_DAMAGE_RATIO * this._bossProfil().mechRatio;
  }

  // les deux rayons de groupe suivent l'EFFECTIF : ce qui est serre a quatre est
  // trivial a deux, et l'inverse pour la dispersion.
  _stackRadius(alive) {
    return BOSS_CFG.STACK_RADIUS + BOSS_CFG.STACK_PER_PLAYER * Math.max(0, alive - 2);
  }

  _spreadMin(alive) {
    return Math.max(120,
      BOSS_CFG.SPREAD_MIN + BOSS_CFG.SPREAD_PER_PLAYER * Math.max(0, alive - 2));
  }

  _mechHit(p, ratio = 1) {
    if (!p || p.downed) return;
    p.mechFails++;
    this._hurt(p, this._mechDamage(p) * ratio, MECH_HURT);
    this._applyStatus(p, STATUS_VULN, BOSS_CFG.MECH_VULN);
  }

  // P4 · L'ECHEC EST D'ABORD INDIVIDUEL. Un debutant qui rate doit mourir LUI,
  // pas faire perdre la soiree a trois autres. En « mixte », seules les
  // mecaniques d'OCCUPATION restent collectives — la grammaire les nomme deja,
  // ce sont les `colonne`, et rien d'autre n'a besoin d'etre declare.
  _mechFail(fautifs, ratio, mech = -1) {
    this._mechCompte(mech, "echec");
    const P = this._bossProfil();
    const forme = mech >= 0 ? mechAt(mech)?.forme : null;
    const collectif = P.echec === "collectif"
      || (P.echec === "mixte" && forme === "colonne");
    const cibles = collectif ? this._alivePlayers() : fautifs;
    for (const p of cibles) this._mechHit(p, ratio);
  }

  // LA BONNE MESURE D'UNE MECANIQUE DE BOSS EST L'ECART entre un joueur qui lit
  // les annonces et un joueur qui les ignore ; faute de pouvoir mesurer ca sur
  // un bot, on compte au moins poses et echecs. Deux compteurs, aucun systeme.
  _mechCompte(mech, quoi) {
    if (mech < 0) return;
    let c = this.mechStats.get(mech);
    if (!c) this.mechStats.set(mech, c = { pose: 0, echec: 0 });
    c[quoi]++;
  }

  // POINT DE PASSAGE UNIQUE DE LA COEXISTENCE DE DEUX ORDRES. La grammaire dit
  // deja ce qu'un ordre prend au joueur (`AXES`) : il ne reste qu'a refuser de
  // poser par-dessus un ordre du meme axe et de sens contraire. Deux consignes
  // opposees ne sont pas deux choses a lire, c'est une consigne impossible.
  _mechLibre(mech) {
    for (const m of this.marks) {
      if (m.dead) continue;
      // `feed` est un TEMOIN de lien, pas un ordre : sa marque vit tout le
      // combat, et un temoin qui verrouille bloquerait le repertoire entier.
      if (m.mech === MECH_FEED) continue;
      if (!mechsCompatibles(mech, m.mech)) return false;
    }
    const b = this.boss;
    if (b && (b.gaze > 0 || b.gazeWarn > 0) && !mechsCompatibles(mech, MECH_GAZE)) return false;
    return true;
  }

  // UN ABRI EST UN ENDROIT OU IL FAUT ETRE, et son echeance est le moment ou on
  // l'y verifie. Un foyer d'occupation la porte dans son `t` ; un sanctuaire n'en
  // a pas — son battement peut tomber a tout moment et seul le `lead` du groupe
  // le compte, donc son echeance est MAINTENANT. Le sanctuaire est un `disque`
  // dont le sens est INVERSE : ca ne se deduit pas de la forme, ca se nomme.
  _abris() {
    const out = [];
    for (const m of this.marks) {
      if (m.dead) continue;
      if (m.mech === MECH_SANCTUARY) out.push({ x: m.x, y: m.y, r: m.r, t: 0 });
      else if (mechAt(m.mech)?.forme === "colonne") {
        out.push({ x: m.x, y: m.y, r: m.r, t: Math.max(0, m.t) });
      }
    }
    return out;
  }

  // TOUJOURS UN SAFE SPOT AU SOL. Chaque motif de saturation laisse un creux —
  // l'autre parite du damier, le trou de la couronne, l'entre-deux des lames.
  // Deux motifs EN MEME TEMPS ne le garantissent plus : le creux de l'un tombe
  // sous le plein de l'autre. Ils se suivent donc, ils ne se croisent pas.
  // Seul un foyer FIXE interdit de saturer : un refuge mobile fuit le feu tout
  // seul (`_zoneFeu`) et les zones s'ecartent de lui a la pose.
  _solPret(b) {
    if ((b.solT ?? 0) > 0) return false;
    for (const m of this.marks) {
      if (m.dead || mechAt(m.mech)?.forme !== "colonne") continue;
      if (m.t <= BOSS_CFG.ABRI_SATURE) return false;
    }
    return true;
  }

  // la duree d'un motif se MESURE sur les zones qu'il vient de poser, plutot que
  // d'ecrire une seconde fois `GRID_GAP` et `SWEEP_STAGGER`. On ne retient que
  // les DETONATIONS : un sol qui brule ensuite se lit et se contourne, et
  // compter sa vie bloquait tout le repertoire onze secondes.
  _solPose(b, n0) {
    let fin = 0;
    for (let i = n0; i < this.zones.length; i++) {
      const z = this.zones[i];
      const f = z.warn + (z.left > 0 ? z.left * z.period : 0);
      if (f > fin) fin = f;
    }
    // LA MARGE DE RETOUR RESTE, ET ELLE A ETE MESUREE. La retirer paraissait
    // gratuit — le motif suivant porte son propre preavis — mais les zones
    // REMANENTES d'un motif survivent a sa derniere detonation : les motifs se
    // chainaient, le sol ne se vidait plus (cauchemar solo, 2,85 -> 13,99 zones
    // hostiles en moyenne) et un combat a deux passait de 86 a 181 s.
    b.solT = fin + BOSS_CFG.ABRI_RETOUR;
  }

  _zoneCouvre(z, a) {
    if (this._zoneHits(z, a)) return true;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      if (this._zoneHits(z, { x: a.x + Math.cos(ang) * a.r, y: a.y + Math.sin(ang) * a.r })) {
        return true;
      }
    }
    return false;
  }

  // une zone locale qui recouvrirait un abri s'ecarte le long de l'axe qui les
  // separe. Si huit pas n'y suffisent pas, elle ne se pose pas : une marque
  // manquante ne se voit pas, un ordre impossible si.
  _zoneEcarteAbris(z) {
    if (z.pj || z.sol || z.dmg <= 0 || this.marks.length === 0) return true;
    const abris = this._abris();
    if (abris.length === 0) return true;
    const fin = z.warn
      + (z.life > 0 ? z.life : 0)
      + (z.left > 0 ? z.left * z.period : 0);
    for (const a of abris) {
      // le timing suffit : elle explose et s'efface avant qu'on ait a etre la.
      if (fin + BOSS_CFG.ABRI_RETOUR <= a.t) continue;
      for (let n = 0; n < 8 && this._zoneCouvre(z, a); n++) {
        const dx = z.x - a.x, dy = z.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const pas = a.r + BOSS_CFG.ABRI_MARGE;
        z.x = a.x + (dx / d) * (d + pas);
        z.y = a.y + (dy / d) * (d + pas);
        this._clampToBounds(z, 0);
      }
      if (this._zoneCouvre(z, a)) return false;
    }
    return true;
  }

  // un foyer d'occupation se pose la ou l'on peut REELLEMENT aller : ni dans un
  // obstacle de biome, ni sur un danger qui blesse, ni sous une zone deja en vol
  // qui brulera encore a l'echeance. Il tourne autour du centre jusqu'a trouver,
  // puis se rabat sur `_dropPoint`.
  _foyerPoint(cx, cy, rad, ang, r, echeance) {
    for (let i = 0; i < 6; i++) {
      const a = ang + i * 0.22;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      if (this._foyerLibre(x, y, r, echeance)) return this._dropPoint(x, y, r);
    }
    return this._dropPoint(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, r);
  }

  // « le feu » inclut ce qui va tomber : un refuge qui n'evite que les zones
  // DEJA actives derive sur un telegraphe et s'y trouve a la detonation.
  _zoneFeu(x, y, r) {
    const a = { x, y, r };
    for (const z of this.zones) {
      if (z.pj || z.sol || z.dmg <= 0 || z.warn > BOSS_CFG.ABRI_RETOUR) continue;
      if (this._zoneCouvre(z, a)) return z;
    }
    return null;
  }

  _solSain(x, y, r) {
    for (const o of this.obstacles) {
      if (o.maxHp > 0 && o.hp <= 0) continue;
      if (Math.abs(x - o.x) < o.w / 2 + r && Math.abs(y - o.y) < o.h / 2 + r) return false;
    }
    for (const h of this.hazards) {
      if (!HAZARDS[h.kind]?.hurts) continue;
      const st = hazardState(h, this.time);
      if ((x - st.x) ** 2 + (y - st.y) ** 2 < (h.r + r) ** 2) return false;
    }
    return true;
  }

  // LA QUESTION SE POSE AU SOL, PAS DANS LA TABLE : reste-t-il un point de
  // l'arene ou l'on ne prend rien ? Echantillonnage — la seule reponse honnete
  // quand deux motifs se croisent. Lu par `verifierMecaniques`.
  _solLibrePart(actives, pas = 15) {
    const B = this.bounds;
    for (let i = 0; i < pas; i++) {
      for (let j = 0; j < pas; j++) {
        const pt = {
          x: B.x0 + (B.x1 - B.x0) * (i + 0.5) / pas,
          y: B.y0 + (B.y1 - B.y0) * (j + 0.5) / pas,
        };
        if (actives.some(z => this._zoneHits(z, pt))) continue;
        if (this._solSain(pt.x, pt.y, CFG.PLAYER_RADIUS)) return true;
      }
    }
    return false;
  }

  _foyerLibre(x, y, r, echeance) {
    if (!this._solSain(x, y, r)) return false;
    // meme regle que `_zoneEcarteAbris`, dans l'autre sens : une zone qui aura
    // fini assez tot pour qu'on revienne ne gene pas, c'est du timing.
    for (const z of this.zones) {
      if (z.pj || z.sol || z.dmg <= 0) continue;
      const fin = z.warn + (z.life > 0 ? z.life : 0) + (z.left > 0 ? z.left * z.period : 0);
      if (fin + BOSS_CFG.ABRI_RETOUR <= echeance) continue;
      if (this._zoneCouvre(z, { x, y, r })) return false;
    }
    return true;
  }

  _mark(o) {
    const m = {
      id: this._nextId++,
      mech: 0, x: 0, y: 0, r: 0, t: 0, max: 0,
      a: 0, b: 0,
      need: 0, cur: 0,
      hp: 0, maxHp: 0,
      vx: 0, vy: 0, grp: 0, lead: 0, left: 0, step: 0,
      dead: false,
      ...o,
    };
    if (!m.max) m.max = m.t;
    this.marks.push(m);
    return m;
  }

  _countIn(m) {
    let n = 0;
    for (const p of this.players.values()) {
      if (p.downed) continue;
      if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 <= m.r * m.r) n++;
    }
    return n;
  }

  _atkRassemblement(b) {
    const alive = this._alivePlayers();
    const mech = adaptMech(MECH_STACK, alive.length);
    if (mech < 0 || alive.length === 0) { this._atkMarques(b); return; }

    if (mech === MECH_DODGE) {
      const p = alive[0];
      this._alert(MECH_DODGE, this._warn(BOSS_CFG.STACK_WARN));
      this._zone({
        x: p.x, y: p.y, r: this._stackRadius(alive.length),
        warn: this._warn(BOSS_CFG.STACK_WARN), dmg: this._zoneDamage(b),
      });
      return;
    }

    if (!this._mechLibre(MECH_STACK)) { this._atkMarques(b); return; }
    const p = alive[Math.floor(Math.random() * alive.length)];
    this._mark({
      mech: MECH_STACK, a: p.id, x: p.x, y: p.y,
      r: this._stackRadius(alive.length), t: this._warn(BOSS_CFG.STACK_WARN),
    });
    this._alert(MECH_STACK, this._warn(BOSS_CFG.STACK_WARN));
  }

  _resolveStack(m) {
    const carrier = this.players.get(m.a);
    if (!carrier || carrier.downed) return;
    const inside = [];
    for (const p of this.players.values()) {
      if (p.downed) continue;
      if (p === carrier || (p.x - m.x) ** 2 + (p.y - m.y) ** 2 <= m.r * m.r) inside.push(p);
    }
    if (inside.length <= 1) { this._mechHit(carrier); return; }
    const share = 1 / inside.length;
    for (const p of inside) {
      this._hurt(p, this._mechDamage(p) * share, MECH_HURT);
    }
  }

  _atkDispersion(b) {
    const alive = this._alivePlayers();
    if (adaptMech(MECH_SPREAD, alive.length) !== MECH_SPREAD
        || !this._mechLibre(MECH_SPREAD)) { this._atkMarques(b); return; }
    this._mark({
      mech: MECH_SPREAD,
      x: (this.bounds.x0 + this.bounds.x1) / 2,
      y: (this.bounds.y0 + this.bounds.y1) / 2,
      r: this._spreadMin(alive.length), t: this._warn(BOSS_CFG.SPREAD_WARN),
    });
    this._alert(MECH_SPREAD, this._warn(BOSS_CFG.SPREAD_WARN));
  }

  _resolveSpread() {
    const alive = this._alivePlayers();
    const hit = new Set();
    const min2 = this._spreadMin(alive.length) ** 2;
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], c = alive[j];
        if ((a.x - c.x) ** 2 + (a.y - c.y) ** 2 > min2) continue;
        hit.add(a); hit.add(c);
      }
    }
    for (const p of hit) this._mechHit(p, BOSS_CFG.SPREAD_RATIO);
  }

  _atkTours(b, exact) {
    const alive = this._alivePlayers();
    const mech = adaptMech(exact ? MECH_COUNT : MECH_TOWER, alive.length);
    if (mech < 0 || !this._mechLibre(mech)) { this._atkMarques(b); return; }

    const grp = this._nextId++;
    const B = this.bounds;
    const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
    const rad = Math.min(B.x1 - B.x0, B.y1 - B.y0) * 0.32;
    const base = Math.random() * Math.PI * 2;
    const warn = mech === MECH_COUNT ? this._warn(BOSS_CFG.COUNT_WARN) : this._warn(BOSS_CFG.TOWER_WARN);

    const n = mech === MECH_COUNT ? 2 : towerCount(alive.length);
    const needs = [];
    if (mech === MECH_COUNT) {
      const first = 1 + Math.floor(Math.random() * (alive.length - 1));
      needs.push(first, alive.length - first);
    } else {
      for (let i = 0; i < n; i++) needs.push(1);
    }

    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      const pt = this._foyerPoint(cx, cy, rad, a, BOSS_CFG.TOWER_RADIUS, warn);
      this._mark({
        mech, grp, lead: i === 0 ? 1 : 0,
        x: pt.x, y: pt.y,
        r: BOSS_CFG.TOWER_RADIUS, t: warn, need: needs[i],
      });
    }
    this._alert(mech, warn);
  }

  _resolveTowers(lead) {
    const group = this.marks.filter(m => m.grp === lead.grp);
    const alive = this._alivePlayers().length;
    // LE NOMBRE DE PLACES SUIT L'EFFECTIF A LA RESOLUTION, pas a la pose : une
    // equipe qui perd un joueur pendant l'annonce ne peut pas tenir la place qui
    // etait la sienne. Meme regle que `_resolveSceau`, qui la tenait deja.
    const foyers = Math.min(group.length, Math.max(1, alive));
    let tenus = 0;
    for (const m of group) {
      const n = this._countIn(m);
      const need = Math.min(m.need, Math.max(1, alive));
      if (m.mech === MECH_COUNT ? n === need : n >= 1) tenus++;
    }
    const missed = Math.max(0, foyers - tenus);
    if (missed > 0) {
      // fautif = celui qui ne tenait aucun foyer. En calme il est seul a payer.
      const fautifs = this._alivePlayers()
        .filter(p => !group.some(m => (p.x - m.x) ** 2 + (p.y - m.y) ** 2 <= m.r * m.r));
      this._mechFail(fautifs.length ? fautifs : this._alivePlayers(),
                     BOSS_CFG.TOWER_RATIO * missed, lead.mech);
    }
    for (const m of group) m.dead = true;
  }

  _atkLien(b) {
    const alive = this._alivePlayers();
    if (adaptMech(MECH_LINK, alive.length) !== MECH_LINK
        || !this._mechLibre(MECH_LINK)) { this._atkMarques(b); return; }
    const i = Math.floor(Math.random() * alive.length);
    let j = Math.floor(Math.random() * (alive.length - 1));
    if (j >= i) j++;
    this._mark({
      mech: MECH_LINK, a: alive[i].id, b: alive[j].id,
      x: (alive[i].x + alive[j].x) / 2, y: (alive[i].y + alive[j].y) / 2,
      r: BOSS_CFG.LINK_BREAK, t: BOSS_CFG.LINK_TIME,
    });
    this._alert(MECH_LINK, BOSS_CFG.LINK_TIME);
  }

  _atkPrison(b) {
    const alive = this._alivePlayers();
    const mech = adaptMech(MECH_JAIL, alive.length);
    if (mech === MECH_CLUSTER) { this._atkGrappes(b, 1, true); return; }
    if (mech !== MECH_JAIL || !this._mechLibre(MECH_JAIL)) { this._atkMarques(b); return; }

    const p = alive[Math.floor(Math.random() * alive.length)];
    const hp = BOSS_CFG.JAIL_HP * this._bossPower();
    this._mark({
      mech: MECH_JAIL, a: p.id, x: p.x, y: p.y, r: 46,
      t: BOSS_CFG.JAIL_TIME, hp, maxHp: hp,
    });
    this._alert(MECH_JAIL, BOSS_CFG.JAIL_TIME);
  }

  _atkGrappes(b, count = 0, urgent = false) {
    if (!this._mechLibre(MECH_CLUSTER)) { this._atkMarques(b); return; }
    if (!count) count = this.players.size >= 2 ? BOSS_CFG.CLUSTER_COUNT : 1;
    const hp = BOSS_CFG.CLUSTER_HP * this._bossPower();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 90 + Math.random() * 190;
      const pt = this._dropPoint(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d);
      this._mark({
        mech: MECH_CLUSTER,
        x: pt.x, y: pt.y,
        r: 30, t: urgent ? BOSS_CFG.CLUSTER_TIME * 0.5 : BOSS_CFG.CLUSTER_TIME,
        hp, maxHp: hp,
      });
    }
    this._alert(MECH_CLUSTER, urgent ? BOSS_CFG.CLUSTER_TIME * 0.5 : BOSS_CFG.CLUSTER_TIME,
                urgent ? "hative" : null);
  }

  _atkNourriciers(b) {
    const n = this.players.size >= 2 ? BOSS_CFG.FEED_COUNT : 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = this._spawnEnemy(0, b.x + Math.cos(a) * 120, b.y + Math.sin(a) * 120);
      if (!e) continue;
      this._mark({ mech: MECH_FEED, a: e.id, x: e.x, y: e.y, r: 24, t: 600 });
    }
    this._alert(MECH_FEED, 0);
  }

  _atkProximite(b) {
    this._mark({
      mech: MECH_PROX, x: b.x, y: b.y,
      r: BOSS_CFG.PROX_RADIUS, t: this._warn(BOSS_CFG.PROX_WARN),
    });
    this._alert(MECH_PROX, this._warn(BOSS_CFG.PROX_WARN));
  }

  _resolveProx(m) {
    for (const p of this._alivePlayers()) {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d >= m.r) continue;
      const k = 1 - d / m.r;
      const ratio = 0.2 + 0.8 * k * k;
      if (ratio >= 0.85) this._mechHit(p, ratio);
      else this._hurt(p, this._mechDamage(p) * ratio, MECH_HURT);
    }
  }

  // POINT DE PASSAGE UNIQUE DU REGARD. Il REFUSE tant que l'oeil se repose :
  // c'est ce refus qui garantit une fenetre de tir, au lieu de la laisser au
  // tirage du repertoire (a la derniere phase, cinq entrees sur huit etaient
  // un regard et le cycle d'attaque etait plus court que le regard lui-meme).
  _gazeOuvre(b, duree = BOSS_CFG.GAZE_TIME, cycles = 1) {
    if (b.gazeRest > 0 || b.gazeWarn > 0 || b.gaze > 0) return false;
    // « ne vise plus » et « tire sur ca » sont le meme axe en sens contraire.
    if (!this._mechLibre(MECH_GAZE)) return false;
    b.gazeWarn = this._warn(BOSS_CFG.GAZE_WARN);
    b.gaze = duree;
    b.gazeLeft = cycles - 1;
    for (const p of this.players.values()) p.gazeSafe = 0;
    this._alert(MECH_GAZE, b.gazeWarn + duree);
    return true;
  }

  _gazeVise(b, p) {
    const dx = b.x - p.x, dy = b.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    return (p.aimX * dx + p.aimY * dy) / d >= BOSS_CFG.GAZE_COS;
  }

  // L'INSTANT DE RESOLUTION, et il est le meme pour tout le monde : ceux qui ont
  // reussi le voient passer aussi. C'est ce qui dit « c'est fini, revise » — la
  // moitie de ce qui manquait a un etat qui s'eteignait sans rien annoncer.
  _gazeResoud(b) {
    let rate = false;
    for (const p of this._alivePlayers()) {
      if (!p.gazeSafe && this._gazeVise(b, p)) {
        this._mechHit(p, BOSS_CFG.GAZE_RATIO);
        rate = true;
      }
      p.gazeSafe = 0;
    }
    if (rate) this._mechCompte(MECH_GAZE, "echec");
    b.gazeRest = b.gazeLeft > 0 ? BOSS_CFG.GAZE_PERM_GAP : BOSS_CFG.GAZE_REST;
  }

  _atkRegard(b) {
    if (!this._gazeOuvre(b)) this._atkCone(b);
  }

  _atkExaflare(b) {
    const B = this.bounds;
    const bw = B.x1 - B.x0, bh = B.y1 - B.y0;
    const a = Math.random() * Math.PI * 2;
    const start = {
      x: (B.x0 + B.x1) / 2 - Math.cos(a) * bw * 0.45,
      y: (B.y0 + B.y1) / 2 - Math.sin(a) * bh * 0.45,
    };
    b.flare = {
      x: start.x, y: start.y,
      dx: Math.cos(a) * BOSS_CFG.EXAFLARE_R * 1.55,
      dy: Math.sin(a) * BOSS_CFG.EXAFLARE_R * 1.55,
      left: BOSS_CFG.EXAFLARE_STEPS, t: 0, first: 1,
    };
    this._alert(MECH_EXAFLARE, this._warn(BOSS_CFG.EXAFLARE_WARN));
  }
  _flare(b, dt) {
    const f = b.flare;
    if (!f) return;
    f.t -= dt;
    if (f.t > 0) return;
    f.t = BOSS_CFG.EXAFLARE_STEP;
    this._zone({
      x: f.x, y: f.y, r: BOSS_CFG.EXAFLARE_R,
      warn: f.first ? this._warn(BOSS_CFG.EXAFLARE_WARN) : 0.4,
      dmg: this._zoneDamage(b),
    });
    f.first = 0;
    f.x += f.dx; f.y += f.dy;
    f.left--;
    const B = this.bounds;
    if (f.left <= 0 || f.x < B.x0 - 200 || f.x > B.x1 + 200
        || f.y < B.y0 - 200 || f.y > B.y1 + 200) b.flare = null;
  }

  _atkAppats(b) {
    for (const p of this._alivePlayers()) {
      this._mark({
        mech: MECH_BAIT, a: p.id, x: p.x, y: p.y, r: BOSS_CFG.BAIT_R,
        t: BOSS_CFG.BAIT_COUNT * BOSS_CFG.BAIT_STEP,
        left: BOSS_CFG.BAIT_COUNT, step: 0,
      });
    }
    this._alert(MECH_BAIT, BOSS_CFG.BAIT_COUNT * BOSS_CFG.BAIT_STEP);
  }

  _atkDerive(b) {
    for (let i = 0; i < BOSS_CFG.DRIFT_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      this._zone({
        x: this.bounds.x0 + Math.random() * (this.bounds.x1 - this.bounds.x0),
        y: this.bounds.y0 + Math.random() * (this.bounds.y1 - this.bounds.y0),
        r: BOSS_CFG.DRIFT_R,
        vx: Math.cos(a) * BOSS_CFG.DRIFT_SPEED,
        vy: Math.sin(a) * BOSS_CFG.DRIFT_SPEED,
        warn: 1.2, period: BOSS_CFG.DRIFT_PERIOD, left: BOSS_CFG.DRIFT_TICKS,
        dmg: this._zoneDamage(b) * 0.55,
      });
    }
    this._alert(MECH_DRIFT, 1.2);
  }

  _atkSanctuaires(b) {
    const alive = Math.max(1, this._alivePlayers().length);
    const n = alive <= 2 ? 2 : 3;
    const grp = this._nextId++;
    const total = this._warn(BOSS_CFG.SANCT_WARN) + BOSS_CFG.SANCT_TICKS * BOSS_CFG.SANCT_PERIOD;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      let px = 0, py = 0;
      // echeance nulle : un refuge est un abri sans echeance (`_abris`), donc il
      // ne nait sous rien de mortel, pas meme sous un telegraphe qui partirait.
      for (let k = 0; k < 8; k++) {
        px = this.bounds.x0 + 200 + Math.random() * Math.max(1, this.bounds.x1 - this.bounds.x0 - 400);
        py = this.bounds.y0 + 150 + Math.random() * Math.max(1, this.bounds.y1 - this.bounds.y0 - 300);
        if (this._foyerLibre(px, py, BOSS_CFG.SANCT_R, 0)) break;
      }
      this._mark({
        mech: MECH_SANCTUARY, grp, lead: i === 0 ? 1 : 0,
        x: px, y: py,
        vx: Math.cos(a) * BOSS_CFG.SANCT_SPEED,
        vy: Math.sin(a) * BOSS_CFG.SANCT_SPEED,
        r: BOSS_CFG.SANCT_R, t: total,
        left: BOSS_CFG.SANCT_TICKS, step: this._warn(BOSS_CFG.SANCT_WARN),
      });
    }
    this._alert(MECH_SANCTUARY, this._warn(BOSS_CFG.SANCT_WARN));
  }

  _atkVerglas(b) {
    this.slipT = BOSS_CFG.SLIP_TIME;
    this._alert(MECH_SLIP, BOSS_CFG.SLIP_TIME);
  }

  // une croix n'est PAS un motif de saturation : elle est locale a chaque cible
  // et laisse les quadrants. Sa cohabitation avec un abri se regle a la zone
  // (`_zoneEcarteAbris`), pas par l'exclusivite du sol.
  _atkCroix(b) {
    for (const e of this._bossTargets()) {
      const a = Math.random() * Math.PI * 2;
      const len = Math.hypot(this.bounds.x1 - this.bounds.x0, this.bounds.y1 - this.bounds.y0);
      for (let i = 0; i < 2; i++) {
        this._zone({
          shape: 1, x: e.x, y: e.y,
          w: len, h: BOSS_CFG.CROSS_THICKNESS,
          ang: a + i * Math.PI / 2,
          warn: this._warn(BOSS_CFG.CROSS_WARN) + i * BOSS_CFG.CROSS_GAP,
          dmg: this._zoneDamage(b) * 0.8,
        });
      }
    }
    this._alert(MECH_CROSS, this._warn(BOSS_CFG.CROSS_WARN));
  }

  _atkCroixDurable(b) {
    const len = Math.hypot(this.bounds.x1 - this.bounds.x0, this.bounds.y1 - this.bounds.y0) / 2;
    for (const e of this._bossTargets()) {
      this._zone({
        shape: 5, x: e.x, y: e.y,
        r: len, h: BOSS_CFG.CROSSD_THICKNESS,
        ang: Math.random() * Math.PI / 2,
        warn: this._warn(BOSS_CFG.CROSSD_WARN),
        life: BOSS_CFG.CROSSD_LIFE,
        dot: BOSS_CFG.CROSSD_DOT,
        dmg: this._zoneDamage(b) * 0.55,
      });
    }
    this._alert(MECH_CROSS, this._warn(BOSS_CFG.CROSSD_WARN));
  }

  _atkCone(b) {
    const alive = this._alivePlayers();
    if (alive.length === 0) { this._atkMarques(b); return; }
    for (const p of alive) {
      this._zone({
        shape: 3, x: b.x, y: b.y,
        r: BOSS_CFG.CONE_R, spread: BOSS_CFG.CONE_SPREAD,
        ang: Math.atan2(p.y - b.y, p.x - b.x),
        warn: this._warn(BOSS_CFG.CONE_WARN),
        dmg: this._zoneDamage(b),
      });
    }
    this._alert(MECH_DODGE, this._warn(BOSS_CFG.CONE_WARN));
  }

  // le secteur epargne EST l'abri : deux motifs a la fois et il n'en reste rien.
  _atkPacman(b) {
    if (!this._solPret(b)) { this._atkMarques(b); return; }
    const n0 = this.zones.length;
    this._zone({
      shape: 4, x: b.x, y: b.y,
      r: BOSS_CFG.PACMAN_R, spread: BOSS_CFG.PACMAN_SAFE,
      ang: Math.random() * Math.PI * 2,
      warn: this._warn(BOSS_CFG.PACMAN_WARN),
      prox: 1,
      dmg: this._zoneDamage(b) * 1.25,
    });
    this._solPose(b, n0);
    this._alert(MECH_SAFE, this._warn(BOSS_CFG.PACMAN_WARN));
  }


  _marks(dt) {
    if (this.marks.length === 0) return;
    for (const m of this.marks) if (!m.dead) this._markTick(m, dt);
    for (const m of this.marks) {
      if (m.dead || m.t > 0) continue;
      this._markResolve(m);
    }
    this.marks = this.marks.filter(m => !m.dead);
  }

  _markTick(m, dt) {
    switch (m.mech) {
      case MECH_STACK: {
        const p = this.players.get(m.a);
        if (!p || p.downed) { m.dead = true; return; }
        m.x = p.x; m.y = p.y;
        break;
      }
      case MECH_TOWER:
      case MECH_COUNT:
      case MECH_SEAL:
        m.cur = this._countIn(m);
        break;
      case MECH_LINK: {
        const a = this.players.get(m.a), c = this.players.get(m.b);
        if (!a || !c || a.downed || c.downed) { m.dead = true; return; }
        m.x = (a.x + c.x) / 2; m.y = (a.y + c.y) / 2;
        if ((a.x - c.x) ** 2 + (a.y - c.y) ** 2 >= m.r * m.r) { m.dead = true; return; }
        const lien = { ignoreCooldown: true, overTime: true, src: SRC_MECH };
        this._hurt(a, BOSS_CFG.LINK_DPS * dt, lien);
        this._hurt(c, BOSS_CFG.LINK_DPS * dt, lien);
        break;
      }
      case MECH_JAIL: {
        const p = this.players.get(m.a);
        if (!p || p.downed) { m.dead = true; return; }
        p.jailed = 0.15;
        p.x = m.x; p.y = m.y;
        break;
      }
      case MECH_FEED: {
        const e = this._enemyById(m.a);
        if (!e) { m.dead = true; return; }
        m.x = e.x; m.y = e.y;
        const bo = this.boss;
        if (bo) this._bossHeal(bo, bo.maxHp * BOSS_CFG.FEED_HEAL * dt);
        break;
      }
      case MECH_BAIT: {
        const p = this.players.get(m.a);
        if (!p) { m.dead = true; return; }
        const ghost = this._trailAt(p, this.time - BOSS_CFG.BAIT_LAG);
        m.x = ghost.x; m.y = ghost.y;
        m.step -= dt;
        if (m.step <= 0 && m.left > 0) {
          m.step = BOSS_CFG.BAIT_STEP;
          m.left--;
          this._zone({
            x: ghost.x, y: ghost.y, r: m.r,
            warn: this._warn(BOSS_CFG.BAIT_WARN),
            dmg: this.boss ? this._zoneDamage(this.boss) : CFG.ZONE_DAMAGE,
          });
        }
        break;
      }
      case MECH_SANCTUARY: {
        // UN REFUGE FUIT LE FEU : il derive, donc il peut entrer dans une zone
        // apres sa pose — et « reste sur le disque » tomberait alors au meme
        // endroit que « sors de la zone ». Il rebondit comme sur un bord ; s'il
        // est DEJA dedans il s'en ecarte au lieu d'osciller sur place.
        {
          const dedans = this._zoneFeu(m.x, m.y, m.r);
          if (dedans) {
            const dx = m.x - dedans.x, dy = m.y - dedans.y;
            const d = Math.hypot(dx, dy) || 1;
            const sp = Math.hypot(m.vx, m.vy) || BOSS_CFG.SANCT_SPEED;
            m.vx = (dx / d) * sp; m.vy = (dy / d) * sp;
          } else if (this._zoneFeu(m.x + m.vx * dt, m.y + m.vy * dt, m.r)) {
            m.vx = -m.vx; m.vy = -m.vy;
          }
          m.x += m.vx * dt; m.y += m.vy * dt;
        }
        {
          const B = this.bounds;
          if (m.x < B.x0 + m.r || m.x > B.x1 - m.r) { m.vx = -m.vx; }
          if (m.y < B.y0 + m.r || m.y > B.y1 - m.r) { m.vy = -m.vy; }
          this._clampToBounds(m, m.r);
        }
        if (m.lead) {
          m.step -= dt;
          if (m.step <= 0 && m.left > 0) {
            m.step = BOSS_CFG.SANCT_PERIOD;
            m.left--;
            this._pulseSanctuaires(m.grp);
          }
        }
        break;
      }
      default: break;
    }
    m.t -= dt;
  }

  _markResolve(m) {
    m.dead = true;
    switch (m.mech) {
      case MECH_STACK: this._resolveStack(m); break;
      case MECH_SPREAD: this._resolveSpread(); break;
      case MECH_TOWER:
      case MECH_COUNT:
        if (m.lead) this._resolveTowers(m);
        break;
      case MECH_SEAL:
        if (m.lead) this._resolveSceau(m);
        break;
      case MECH_PROX: this._resolveProx(m); break;
      case MECH_LINK: {
        const a = this.players.get(m.a), c = this.players.get(m.b);
        this._mechHit(a, 0.5);
        this._mechHit(c, 0.5);
        break;
      }
      case MECH_JAIL: {
        const p = this.players.get(m.a);
        if (p) p.jailed = 0;
        this._mechHit(p);
        break;
      }
      case MECH_CLUSTER:
        // un noeud tenu jusqu'au bout ne fait pas eclore : il PREND l'espace.
        if (m.noeud) { this._groundZone(m.x, m.y, BOSS_CFG.NOEUD_R, BOSS_CFG.NOEUD_DOT,
                                        BOSS_CFG.NOEUD_LIFE, 0, SOL_BOSS); break; }
        for (let i = 0; i < BOSS_CFG.CLUSTER_HATCH; i++) {
          const a = Math.random() * Math.PI * 2;
          this._spawnEnemy(1, m.x + Math.cos(a) * 24, m.y + Math.sin(a) * 24);
        }
        break;
      default: break;
    }
  }

  _breakMark(m) {
    m.dead = true;
    const p = this.players.get(m.a);
    if (m.mech === MECH_JAIL && p) p.jailed = 0;
    this.effects.push({
      id: this._nextId++,
      x: m.x, y: m.y, r: 90, life: 0.45, max: 0.45, kind: 4,
    });
  }

  _hitMarks(x, y, radius, dmg, ownerId = 0) {
    if (!this.marks.length) return;
    const owner = this.players.get(ownerId);
    const brut = owner ? this._relicSum(owner, "mechDamage") : 0;
    for (const m of this.marks) {
      if (m.dead || m.maxHp <= 0) continue;
      const rr = radius + m.r;
      if ((m.x - x) ** 2 + (m.y - y) ** 2 > rr * rr) continue;
      m.hp -= dmg + brut;
      if (m.hp <= 0) this._breakMark(m);
    }
  }

  _pulseSanctuaires(grp) {
    const safe = this.marks.filter(m => m.grp === grp && !m.dead);
    for (const p of this._alivePlayers()) {
      let ok = false;
      for (const s of safe) {
        if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 <= s.r * s.r) { ok = true; break; }
      }
      if (!ok) this._mechHit(p, 0.3);
    }
  }

  _trailAt(p, when) {
    if (!p.trail.length) return { x: p.x, y: p.y };
    for (let i = 0; i < p.trail.length; i++) {
      if (p.trail[i].t >= when) return p.trail[i];
    }
    return p.trail[p.trail.length - 1];
  }

  // DIFFUS : la horde est son corps. Elle se soigne de TOUTE la foule proche,
  // pas seulement de ses rejetons ; tant qu'elle est entouree, la blesser ne
  // sert presque a rien. Le combat devient « nettoyer autour d'elle pour ouvrir
  // une fenetre » — le seul boss qui UTILISE la horde au lieu de la subir.
  _diffus(b, dt) {
    if (bossAt(b.kind).archetype !== "diffus") return;
    const R = BOSS_CFG.DIFFUS_RANGE;
    let n = 0;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > R * R) continue;
      if (++n >= BOSS_CFG.DIFFUS_CAP) break;
    }
    b.essaim = n;
    if (n <= 0) return;
    this._bossHeal(b, b.maxHp * BOSS_CFG.DIFFUS_HEAL * n * dt);
  }

  // CAUCHEMAR : les renforts DURCISSENT en se regroupant. Ca force l'ecartement
  // de l'equipe sans aucun telegraphe, juste par une regle — un modificateur qui
  // ne s'annonce pas, il se decouvre. Voisinage lu par la grille, jamais en n².
  _renforts() {
    if (!this._bossProfil().renforts) return;
    const list = this.enemies;
    if (list.length === 0) return;
    const { cell, cols, rows, start, items } = this._grille();
    const R2 = BOSS_CFG.RENFORT_RANGE * BOSS_CFG.RENFORT_RANGE;
    for (const e of list) {
      if (e.hp <= 0 || !e.renfort) continue;
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(e.x / cell)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(e.y / cell)));
      let n = 0;
      for (let gy = Math.max(0, cy - 1); gy <= Math.min(rows - 1, cy + 1); gy++) {
        for (let gx = Math.max(0, cx - 1); gx <= Math.min(cols - 1, cx + 1); gx++) {
          const c = gy * cols + gx;
          for (let i = start[c]; i < start[c + 1]; i++) {
            const o = list[items[i]];
            if (o === e || o.hp <= 0 || !o.renfort) continue;
            if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= R2) n++;
          }
        }
      }
      // meme regle que toute aura : la MEILLEURE reduction, jamais le produit.
      const bonus = Math.min(BOSS_CFG.RENFORT_MAX, n * BOSS_CFG.RENFORT_STEP);
      if (bonus > e.aura) e.aura = bonus;
    }
  }

  _bossPassives(b, dt) {
    this._flare(b, dt);
    this._diffus(b, dt);
    this._renforts();
    if (b.solT > 0) b.solT -= dt;

    if (b.gazeWarn > 0) {
      b.gazeWarn -= dt;
      // la tolerance se releve EN CONTINU sur la derniere fraction de seconde :
      // avoir detourne une fois dedans suffit, au lieu d'un test a l'image pres.
      if (b.gazeWarn <= BOSS_CFG.GAZE_GRACE) {
        for (const p of this._alivePlayers()) {
          if (!this._gazeVise(b, p)) p.gazeSafe = 1;
        }
      }
      if (b.gazeWarn <= 0) {
        b.gazeWarn = 0;
        if (b.gaze <= 0) this._gazeResoud(b);
      }
    } else if (b.gaze > 0) {
      b.gaze -= dt;
      for (const p of this._alivePlayers()) {
        p.gazeCd -= dt;
        if (p.gazeCd > 0) continue;
        if (!this._gazeVise(b, p)) continue;
        p.gazeCd = BOSS_CFG.GAZE_TICK;
        this._mechHit(p, BOSS_CFG.GAZE_PERM_RATIO);
      }
      if (b.gaze <= 0) {
        b.gazeRest = b.gazeLeft > 0 ? BOSS_CFG.GAZE_PERM_GAP : BOSS_CFG.GAZE_REST;
      }
    } else if (b.gazeRest > 0) {
      b.gazeRest -= dt;
      // le clignotement se rouvre SANS preavis : l'oeil est deja ouvert dans la
      // tete du joueur, un telegraphe de plus n'apprend rien et allonge la
      // fenetre ou l'on ne tire pas.
      if (b.gazeRest <= 0 && b.gazeLeft > 0) {
        b.gazeLeft--;
        b.gaze = BOSS_CFG.GAZE_PERM_OPEN;
        this._alert(MECH_GAZE, b.gaze);
      }
    }

    if (b.kind === BOSS_ORACLE) {
      // la jauge se lit sur UN groupe de tours — le dernier pose. Sur tous, deux
      // groupes suffisaient a la rendre intenable, donc a la faire deborder.
      const vivantes = this.marks.filter(m => (m.mech === MECH_TOWER || m.mech === MECH_COUNT) && !m.dead);
      const grp = vivantes.length ? vivantes[vivantes.length - 1].grp : 0;
      const towers = vivantes.filter(m => m.grp === grp);
      const held = towers.length > 0 && towers.every(m => m.cur >= Math.max(1, m.need));
      b.ult += (held ? -BOSS_CFG.ULT_DRAIN : BOSS_CFG.ULT_FILL) * dt;
      if (b.ult <= 0) b.ult = 0;
      if (b.ult >= 1) {
        b.ult = 0;
        this._alert(MECH_ULT, 0);
        const dehors = this._alivePlayers().filter(p => !towers.some(
          m => (p.x - m.x) ** 2 + (p.y - m.y) ** 2 <= m.r * m.r));
        this._mechFail(dehors.length ? dehors : this._alivePlayers(),
                       BOSS_CFG.ULT_RATIO, MECH_ULT);
        this.effects.push({
          id: this._nextId++,
          x: b.x, y: b.y, r: CFG.BOSS_SWEEP_R, life: 0.8, max: 0.8, kind: 6,
        });
      }

      b.miasmaCd -= dt;
      if (b.miasmaCd <= 0) {
        b.miasmaCd = STATUS_CFG.BOSS_MIASMA_EVERY;
        this._alert(MECH_MIASMA, 0);
        for (const p of this._alivePlayers()) this._applyStatus(p, STATUS_VULN, 1);
      }
    }

    if (this.boss2) this._twins(b, dt);
  }

  _twins(b, dt) {
    const o = this.boss2;
    if (b.phase >= b.bars - 1 && !b.converge) {
      b.converge = 1;
      this._alert(MECH_CONVERGE, 0);
    }
    if (!b.converge && (b.x - o.x) ** 2 + (b.y - o.y) ** 2 < BOSS_CFG.TWIN_HEAL_RANGE ** 2) {
      this._bossHeal(b, b.maxHp * BOSS_CFG.TWIN_HEAL * dt);
    }

    for (const p of this._alivePlayers()) {
      if (!p.statuses.has(STATUS_BURN) || !p.statuses.has(STATUS_ROOT)) continue;
      p.statuses.delete(STATUS_BURN);
      p.statuses.delete(STATUS_ROOT);
      this._mechHit(p, BOSS_CFG.TWIN_BLAST_RATIO);
      this.effects.push({
        id: this._nextId++,
        x: p.x, y: p.y, r: 150, life: 0.5, max: 0.5, kind: 7,
      });
    }
  }

  _playerPower(p) {
    const flat = this._flatDamage(p) + this._relicSum(p, "bossDamage") * 0.3;
    return powerIndex(p.powerMods ?? p.mods, flat);
  }

  _teamPower() {
    if (this._powerAt === this.time) return this._powerCache;
    let power = 0;
    for (const p of this.players.values()) power += this._playerPower(p);
    this._powerCache = this.players.size ? power / this.players.size : 1;
    this._powerAt = this.time;
    return this._powerCache;
  }

  _bossPower() {
    return bossPower(this._teamPower());
  }

  // COMPOSE, et le taux se lit sur la croissance de puissance mesuree (x2,6 du
  // premier au dernier boss) : lineaire, la duree des combats redecroit de 40 %.
  _bossHpRamp() {
    return Math.pow(1 + CFG.BOSS_HP_MINUTE_RAMP, this.hordeMinutes())
      * (1 + (this.bossCount - 1) * CFG.BOSS_GROWTH);
  }

  // borne par le plafond de horde : deux plafonds ne reglent pas la meme grandeur
  _bossAddCap() {
    const n = Math.max(1, this.players.size);
    return Math.min(this._enemyCap(),
      Math.round(CFG.BOSS_ADD_CAP_BASE * Math.pow(n, CFG.WAVE_CROWD_EXP)));
  }

  // mesure : le plafond ne mord jamais, c'est CE compte qui fait la densite.
  // `BOSS_SUMMON_BASE + joueurs` donnait 4 renforts par joueur en solo contre 1,75
  // a quatre ; meme exposant que la horde, meme raison.
  _bossSummonCount() {
    const n = Math.max(1, this.players.size);
    return Math.max(1, Math.round(CFG.BOSS_SUMMON_BASE * Math.pow(n, CFG.WAVE_CROWD_EXP)));
  }

  _zone(z) {
    const zone = {
      id: this._nextId++,
      shape: 0, x: 0, y: 0, r: CFG.ZONE_RADIUS,
      w: 0, h: 0, ang: 0, hole: 0, spread: 0,
      warn: CFG.ZONE_WARN, blast: 0,
      dmg: CFG.ZONE_DAMAGE,
      vx: 0, vy: 0, left: 0, period: 0.5,
      life: 0, dot: 0, tick: 0, prox: 0, follow: 0, chase: 0, puddle: 0,
      src: SRC_ZONE, horde: 0,
      ...z,
    };
    if (!this._zoneEcarteAbris(zone)) return;
    zone.warn0 = zone.warn;
    this.zones.push(zone);
  }

  _atkSalve(b) {
    const count = 16 + b.phase * 2;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = base + (i / count) * Math.PI * 2;
      this.shots.push({
        id: this._nextId++,
        x: b.x, y: b.y,
        vx: Math.cos(a) * CFG.SHOT_SPEED,
        vy: Math.sin(a) * CFG.SHOT_SPEED,
        life: CFG.SHOT_LIFE,
      });
    }
  }

  _atkMarques(b) {
    for (const p of this.players.values()) {
      if (p.downed) continue;
      this._zone({
        x: p.x + (Math.random() - 0.5) * 90,
        y: p.y + (Math.random() - 0.5) * 90,
        r: CFG.ZONE_RADIUS,
        dmg: this._zoneDamage(b),
      });
    }
    this._zone({ x: b.x, y: b.y, r: CFG.ZONE_RADIUS * 1.3, dmg: this._zoneDamage(b) });
  }

  _atkDamier(b) {
    if (!this._solPret(b)) { this._atkMarques(b); return; }
    const n0 = this.zones.length;
    const B = this.bounds;
    const cw = (B.x1 - B.x0) / CFG.GRID_COLS;
    const ch = (B.y1 - B.y0) / CFG.GRID_ROWS;
    const parity = Math.random() < 0.5 ? 0 : 1;

    for (let cx = 0; cx < CFG.GRID_COLS; cx++) {
      for (let cy = 0; cy < CFG.GRID_ROWS; cy++) {
        const first = (cx + cy) % 2 === parity;
        this._zone({
          shape: 1,
          x: B.x0 + cw * (cx + 0.5), y: B.y0 + ch * (cy + 0.5),
          w: cw, h: ch,
          warn: CFG.GRID_WARN + (first ? 0 : CFG.GRID_GAP),
          dmg: this._zoneDamage(b),
        });
      }
    }
    this._solPose(b, n0);
  }

  _atkCouronne(b) {
    if (!this._solPret(b)) { this._atkMarques(b); return; }
    const n0 = this.zones.length;
    const B = this.bounds;
    const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
    const ringFirst = Math.random() < 0.5;
    const outer = Math.hypot(B.x1 - B.x0, B.y1 - B.y0);

    this._zone({
      shape: 2, x: cx, y: cy, r: outer, hole: CFG.DONUT_HOLE,
      warn: CFG.DONUT_WARN + (ringFirst ? 0 : CFG.DONUT_GAP),
      dmg: this._zoneDamage(b),
    });
    this._zone({
      shape: 0, x: cx, y: cy, r: CFG.DONUT_HOLE - 10,
      warn: CFG.DONUT_WARN + (ringFirst ? CFG.DONUT_GAP : 0),
      dmg: this._zoneDamage(b),
    });
    this._solPose(b, n0);
  }

  _atkCouloirs(b) {
    if (!this._solPret(b)) { this._atkMarques(b); return; }
    const n0 = this.zones.length;
    const B = this.bounds;
    const bw = B.x1 - B.x0, bh = B.y1 - B.y0;
    const mx = (B.x0 + B.x1) / 2, my = (B.y0 + B.y1) / 2;
    const vertical = Math.random() < 0.5;
    const lanes = 3;

    for (let i = 0; i < lanes; i++) {
      const k = (i + 0.5) / lanes;
      this._zone({
        shape: 1,
        x: vertical ? B.x0 + bw * k : mx,
        y: vertical ? my : B.y0 + bh * k,
        w: vertical ? CFG.LANE_THICKNESS : bw,
        h: vertical ? bh : CFG.LANE_THICKNESS,
        warn: CFG.LANE_WARN,
        dmg: this._zoneDamage(b),
      });
      this._zone({
        shape: 1,
        x: vertical ? mx : B.x0 + bw * k,
        y: vertical ? B.y0 + bh * k : my,
        w: vertical ? bw : CFG.LANE_THICKNESS,
        h: vertical ? CFG.LANE_THICKNESS : bh,
        warn: CFG.LANE_WARN + CFG.LANE_GAP,
        dmg: this._zoneDamage(b),
      });
    }
    this._solPose(b, n0);
  }

  _atkBalayage(b) {
    if (!this._solPret(b)) { this._atkMarques(b); return; }
    const n0 = this.zones.length;
    const blades = CFG.SWEEP_BLADES;
    const len = Math.hypot(this.bounds.x1 - this.bounds.x0, this.bounds.y1 - this.bounds.y0);
    const base = Math.random() * Math.PI * 2;
    const dir = Math.random() < 0.5 ? 1 : -1;

    for (let i = 0; i < blades; i++) {
      const a = base + dir * (i / blades) * Math.PI * 2;
      this._zone({
        shape: 1,
        x: b.x + Math.cos(a) * len / 2,
        y: b.y + Math.sin(a) * len / 2,
        w: len, h: CFG.SWEEP_THICKNESS, ang: a,
        warn: CFG.SWEEP_WARN + i * CFG.SWEEP_STAGGER,
        dmg: this._zoneDamage(b),
      });
    }
    this._solPose(b, n0);
  }

  _zoneDamage(b) {
    return CFG.ZONE_DAMAGE
      * (1 + CFG.BOSS_PHASE_DAMAGE_STEP * b.phase)
      * (1 + BOSS_CFG.ENRAGE_DAMAGE * (b.enrage ?? 0));
  }



  _clampToBounds(o, margin = 0) {
    const B = this.bounds;
    o.x = Math.min(Math.max(o.x, B.x0 + margin), B.x1 - margin);
    o.y = Math.min(Math.max(o.y, B.y0 + margin), B.y1 - margin);
    return o;
  }

  _dropPoint(x, y, margin = 40) {
    const B = this.bounds;
    const pt = {
      x: Math.min(Math.max(x, B.x0 + margin), B.x1 - margin),
      y: Math.min(Math.max(y, B.y0 + margin), B.y1 - margin),
    };
    if (!this.obstacles.length) return pt;
    for (const b of this.obstacles) {
      if (b.maxHp > 0 && b.hp <= 0) continue;
      const hw = b.w / 2 + CFG.POWERUP_RADIUS, hh = b.h / 2 + CFG.POWERUP_RADIUS;
      const dx = pt.x - b.x, dy = pt.y - b.y;
      if (Math.abs(dx) >= hw || Math.abs(dy) >= hh) continue;
      if (hw - Math.abs(dx) <= hh - Math.abs(dy)) pt.x = b.x + (dx < 0 ? -hw : hw);
      else pt.y = b.y + (dy < 0 ? -hh : hh);
    }
    return this._clampToBounds(pt, margin);
  }

  _wallBlock(o, wasX, wasY, radius = 0) {
    const W = this.walls;
    if (!W) return;
    const t = BOSS_CFG.QUAD_THICK / 2 + radius;
    if (Math.abs(o.x - W.x) < t) o.x = wasX <= W.x ? W.x - t : W.x + t;
    if (Math.abs(o.y - W.y) < t) o.y = wasY <= W.y ? W.y - t : W.y + t;
  }

  // LA GEOMETRIE DE BIOME EST POSEE A LA CONSTRUCTION ET NE BOUGE PLUS, donc
  // elle s'indexe UNE fois pour la manche. Sans index, `_obstacleBlock` et
  // `_ground` balayaient toute la table pour chaque corps et chaque tick : 8,7
  // millions d'appels sur 420 s de mesure, la part la plus chere du pas.
  //
  // Meme forme que `_grille()`, et la taille de cellule PROUVE la couverture de
  // la meme facon : `cell = plus grande demi-boite + STAT_MARGE`, donc une boite
  // qui recouvre la requete a son centre a moins d'une cellule, donc dans le
  // voisinage 3x3. Les coordonnees de cellule sont ecretees, ce qui est
  // 1-lipschitzien et ne separe donc jamais deux corps qui se touchent.
  // Une requete plus large que `STAT_MARGE` casserait la preuve : elle repasse
  // par le balayage complet au lieu de mentir.
  _statIndex() {
    if (this._statG) return this._statG;
    const obs = this._biomeObstacles, haz = this._biomeHazards;
    let demi = 1;
    for (const o of obs) demi = Math.max(demi, o.w / 2, o.h / 2);
    for (const h of haz) demi = Math.max(demi, h.r);
    const cell = demi + STAT_MARGE;
    const cols = Math.max(1, Math.ceil(CFG.ARENA_W / cell));
    const rows = Math.max(1, Math.ceil(CFG.ARENA_H / cell));
    this._statG = {
      cell, cols, rows,
      obs: indexerStatique(obs, cell, cols, rows),
      haz: indexerStatique(haz, cell, cols, rows),
    };
    return this._statG;
  }

  // La cellule de la requete, et rien d'autre : la liste du voisinage est deja
  // cuite, dedupliquee et TRIEE PAR INDICE — l'ordre de visite fait partie du
  // resultat des qu'un corps touche deux boites a la fois (`_obstacleBlock`
  // applique ses poussees en sequence, `_obstacleAt` rend la premiere trouvee).
  // -1 = requete plus large que la marge, balayer toute la liste.
  _statCell(x, y, r) {
    if (r > STAT_MARGE) return -1;
    const G = this._statIndex();
    const cx = Math.min(G.cols - 1, Math.max(0, Math.floor(x / G.cell)));
    const cy = Math.min(G.rows - 1, Math.max(0, Math.floor(y / G.cell)));
    return cy * G.cols + cx;
  }

  _obstacleBlock(o, wasX, wasY, radius = 0) {
    const list = this.obstacles;
    if (list.length === 0) return;
    const idx = this._statIndex().obs;
    const c = this._statCell(o.x, o.y, radius);
    const k0 = c < 0 ? 0 : idx.vstart[c];
    const k1 = c < 0 ? list.length : idx.vstart[c + 1];
    for (let k = k0; k < k1; k++) {
      const b = list[c < 0 ? k : idx.vitems[k]];
      if (b.maxHp > 0 && b.hp <= 0) continue;
      const hw = b.w / 2 + radius, hh = b.h / 2 + radius;
      const dx = o.x - b.x, dy = o.y - b.y;
      if (Math.abs(dx) >= hw || Math.abs(dy) >= hh) continue;
      const px = hw - Math.abs(dx), py = hh - Math.abs(dy);
      if (px <= py) o.x = wasX <= b.x ? b.x - hw : b.x + hw;
      else o.y = wasY <= b.y ? b.y - hh : b.y + hh;
    }
  }

  _obstacleAt(x, y, margin = 0) {
    const list = this.obstacles;
    if (list.length === 0) return null;
    const idx = this._statIndex().obs;
    const c = this._statCell(x, y, margin);
    const k0 = c < 0 ? 0 : idx.vstart[c];
    const k1 = c < 0 ? list.length : idx.vstart[c + 1];
    for (let k = k0; k < k1; k++) {
      const b = list[c < 0 ? k : idx.vitems[k]];
      if (b.maxHp > 0 && b.hp <= 0) continue;
      if (Math.abs(x - b.x) < b.w / 2 + margin && Math.abs(y - b.y) < b.h / 2 + margin) {
        return b;
      }
    }
    return null;
  }
  _inObstacle(x, y, margin = 0) {
    return !!this._obstacleAt(x, y, margin);
  }

  /* UN CRISTAL EST UNE CIBLE, pas un cas particulier des balles : le faisceau,
     l'arc et le balayage ne poussent rien dans `bullets`, donc trois armes sur
     huit ne pouvaient pas ramasser la monnaie qui achete les reliques — un axe
     de progression entier ferme. La GEOMETRIE appartient a l'arme, qui l'a deja
     pour les corps ; l'APPLICATION est ici, et nulle part ailleurs. */
  _harvestDamage(h, dmg) {
    if (h.kind !== 0 || h.hp <= 0) return false;
    if (dmg > 0) h.hp = Math.max(0, h.hp - dmg);
    return true;
  }

  _harvestHit(x, y, dmg = 0, rayon = CFG.BULLET_RADIUS) {
    for (const h of this.harvests) {
      if (h.kind !== 0 || h.hp <= 0) continue;
      const r = CFG.HARVEST_RADIUS + rayon;
      if ((x - h.x) ** 2 + (y - h.y) ** 2 > r * r) continue;
      return this._harvestDamage(h, dmg);
    }
    return false;
  }

  _obstacleHit(x, y, dmg = 0) {
    const list = this.obstacles;
    if (list.length === 0) return null;
    const idx = this._statIndex().obs;
    const c = this._statCell(x, y, 0);
    const k1 = idx.vstart[c + 1];
    for (let k = idx.vstart[c]; k < k1; k++) {
      const b = list[idx.vitems[k]];
      if (b.maxHp > 0 && b.hp <= 0) continue;
      if (Math.abs(x - b.x) >= b.w / 2 || Math.abs(y - b.y) >= b.h / 2) continue;
      if (dmg > 0 && b.maxHp > 0) {
        b.hp = Math.max(0, b.hp - dmg);
        // UNE COUVERTURE QUI CEDE OUVRE UN PASSAGE : la grille de navigation
        // est cuite sur la geometrie, donc elle se refait. Quelques fois par
        // manche, jamais dans une boucle.
        if (b.hp <= 0) { this._navG = null; this._navChamps.clear(); }
      }
      return b;
    }
    return null;
  }

  // meme resolution par AXE que `_obstacleBlock` : on ressort par la face d'ou
  // l'on venait, sinon une balle rapide traverse et repart du mauvais cote.
  _obstacleReflect(b, o, wasX, wasY) {
    const hw = o.w / 2, hh = o.h / 2;
    const px = hw - Math.abs(b.x - o.x), py = hh - Math.abs(b.y - o.y);
    if (px <= py) {
      b.x = wasX <= o.x ? o.x - hw : o.x + hw;
      b.vx = -b.vx;
    } else {
      b.y = wasY <= o.y ? o.y - hh : o.y + hh;
      b.vy = -b.vy;
    }
  }

  _inHazard(e) {
    const list = this.hazards;
    if (list.length === 0) return false;
    const idx = this._statIndex().haz;
    const c = this._statCell(e.x, e.y, 0);
    const k1 = idx.vstart[c + 1];
    for (let k = idx.vstart[c]; k < k1; k++) {
      const h = list[idx.vitems[k]];
      if (!hazardState(h, this.time).on) continue;
      if ((e.x - h.x) ** 2 + (e.y - h.y) ** 2 <= h.r * h.r) return true;
    }
    return false;
  }

  // L'OBJET RENDU EST REUTILISE : `_ground` est appele pour chaque corps et
  // chaque tick, soit des millions d'allocations d'un couple de scalaires. Les
  // deux appelants le lisent immediatement — ne pas le garder d'un tick a
  // l'autre.
  _ground(x, y) {
    const out = this._groundOut;
    out.slow = 1; out.slip = false;
    const list = this.hazards;
    if (list.length === 0) return out;
    const idx = this._statIndex().haz;
    const c = this._statCell(x, y, 0);
    const k1 = idx.vstart[c + 1];
    for (let k = idx.vstart[c]; k < k1; k++) {
      const h = list[idx.vitems[k]];
      if (h.kind !== HZ_SLOW && h.kind !== HZ_SLIP) continue;
      if ((x - h.x) ** 2 + (y - h.y) ** 2 > h.r * h.r) continue;
      if (h.kind === HZ_SLOW) out.slow = Math.min(out.slow, BIOME_CFG.SLOW_MUL);
      else out.slip = true;
    }
    return out;
  }

  _hazards(dt) {
    if (this.hazards.length === 0) return;
    this.hazardTick -= dt;
    if (this.hazardTick > 0) return;
    this.hazardTick = CFG.ZONE_TICK;

    let conducteur = null;
    for (const p of this.players.values()) {
      if (p.mods.hazardDps > (conducteur?.mods.hazardDps ?? 0)) conducteur = p;
    }

    for (const h of this.hazards) {
      const def = hazardAt(h.kind);
      const st = hazardState(h, this.time);
      if (!st.on) continue;
      const r = h.r * CFG.ZONE_FORGIVE;

      // « Conducteur » : tout danger du sol, meme celui qui ne blesse pas un joueur
      if (conducteur) {
        const dmg = conducteur.mods.hazardDps * CFG.ZONE_TICK;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if ((e.x - st.x) ** 2 + (e.y - st.y) ** 2 > r * r) continue;
          this._damage(e, dmg, conducteur.id, 0, true);
        }
      }

      if (!def || !def.hurts) continue;
      for (const p of this._alivePlayers()) {
        if ((p.x - st.x) ** 2 + (p.y - st.y) ** 2 > r * r) continue;
        this._hurt(p, h.dot * CFG.ZONE_TICK, { overTime: true, src: SRC_ENV });
      }
    }
  }

  // LA METEO NE TOUCHE QUE LE JOUEUR. Une bourrasque qui pousse aussi la horde
  // ne change rien a la distance entre les deux : elle translate la scene. Le
  // seul appelant est donc `_players`.
  _gust(dt) {
    const v = windAt(this.weather, this.time);
    if (!v) return null;
    const k = BIOME_CFG.GUST_PUSH * v.force * dt;
    return { x: v.dx * k, y: v.dy * k };
  }

  _arena(dt) {
    if (this.shrink) {
      this.shrink.t -= dt;
      if (this.shrink.t <= 0) {
        const next = this.shrink;
        this.shrink = null;
        this.bounds = { x0: next.x0, y0: next.y0, x1: next.x1, y1: next.y1 };
        for (const p of this._alivePlayers()) {
          if (p.x < next.x0 || p.x > next.x1 || p.y < next.y0 || p.y > next.y1) {
            this._mechHit(p, BOSS_CFG.SHRINK_RATIO);
          }
        }
      }
    }

    const B = this.bounds;
    if (B.x0 > 0 || B.y0 > 0 || B.x1 < CFG.ARENA_W || B.y1 < CFG.ARENA_H) {
      // la couronne REPOUSSE la horde, elle ne la tue pas : une arene qui se
      // referme en permanence (archetype constricteur) deviendrait sinon un
      // outil de nettoyage gratuit, credite en experience par-dessus le marche.
      const pas = BOSS_CFG.CROWN_PUSH * dt;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if (e.x >= B.x0 && e.x <= B.x1 && e.y >= B.y0 && e.y <= B.y1) continue;
        if (e.x < B.x0) e.x = Math.min(B.x0, e.x + pas);
        else if (e.x > B.x1) e.x = Math.max(B.x1, e.x - pas);
        if (e.y < B.y0) e.y = Math.min(B.y0, e.y + pas);
        else if (e.y > B.y1) e.y = Math.max(B.y1, e.y - pas);
      }
    }

    if (this.walls) {
      this.walls.t -= dt;
      if (this.walls.t <= 0) this.walls = null;
    }
  }

  _atkConstriction(b) {
    if (this.shrink) return;
    if (!this._solPret(b)) { this._atkMarques(b); return; }
    const B = this.bounds;
    const w = B.x1 - B.x0, h = B.y1 - B.y0;
    const minW = CFG.VIEW_W * BOSS_CFG.SHRINK_MIN;
    const minH = CFG.VIEW_H * BOSS_CFG.SHRINK_MIN;
    if (w <= minW + 1 && h <= minH + 1) { this._atkMarques(b); return; }

    const nw = Math.max(minW, w - CFG.VIEW_W * BOSS_CFG.SHRINK_STEP);
    const nh = Math.max(minH, h - CFG.VIEW_H * BOSS_CFG.SHRINK_STEP);
    const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
    this.shrink = {
      x0: cx - nw / 2, y0: cy - nh / 2,
      x1: cx + nw / 2, y1: cy + nh / 2,
      t: this._warn(BOSS_CFG.SHRINK_WARN),
    };
    b.solT = this.shrink.t + BOSS_CFG.ABRI_RETOUR;
    this._alert(MECH_SHRINK, this._warn(BOSS_CFG.SHRINK_WARN));
  }

  _atkQuadrant(b) {
    // les murs coupent l'arene en quatre : un foyer vivant devient inatteignable.
    // ils ne rendent pas le sol mortel, donc ils n'occupent pas `solT`.
    if (!this._solPret(b) || this._abris().length) { this._atkMarques(b); return; }
    const mech = adaptMech(MECH_QUADRANT, this._alivePlayers().length);
    if (mech !== MECH_QUADRANT) { this._atkQuadrantZone(b); return; }
    const B = this.bounds;
    this.walls = {
      x: (B.x0 + B.x1) / 2, y: (B.y0 + B.y1) / 2,
      t: BOSS_CFG.QUAD_TIME, max: BOSS_CFG.QUAD_TIME,
    };
    this._alert(MECH_QUADRANT, BOSS_CFG.QUAD_TIME);
  }

  _atkQuadrantZone(b) {
    const n0 = this.zones.length;
    const B = this.bounds;
    const qx = Math.random() < 0.5 ? 0 : 1;
    const qy = Math.random() < 0.5 ? 0 : 1;
    const w = (B.x1 - B.x0) / 2, h = (B.y1 - B.y0) / 2;
    this._zone({
      shape: 1,
      x: B.x0 + w * (qx ? 1.5 : 0.5),
      y: B.y0 + h * (qy ? 1.5 : 0.5),
      w, h,
      warn: this._warn(BOSS_CFG.QUADRANT_WARN),
      period: BOSS_CFG.QUADRANT_PERIOD, left: BOSS_CFG.QUADRANT_TICKS,
      dmg: this._zoneDamage(b) * 0.6,
    });
    this._solPose(b, n0);
    this._alert(MECH_DODGE, this._warn(BOSS_CFG.QUADRANT_WARN));
  }

  _puddle(x, y) {
    let count = 0, oldest = -1;
    for (let i = 0; i < this.zones.length; i++) {
      if (!this.zones[i].puddle) continue;
      count++;
      if (oldest < 0) oldest = i;
    }
    if (count >= BOSS_CFG.PUDDLE_MAX && oldest >= 0) this.zones.splice(oldest, 1);

    const pt = this._dropPoint(x, y, 0);
    this._zone({
      x: pt.x, y: pt.y, r: BOSS_CFG.PUDDLE_R,
      warn: BOSS_CFG.PUDDLE_WARN,
      life: BOSS_CFG.PUDDLE_LIFE,
      dot: BOSS_CFG.PUDDLE_DOT,
      dmg: BOSS_CFG.PUDDLE_DOT * CFG.ZONE_TICK,
      puddle: 1,
    });
    if (!this.puddleSeen) {
      this.puddleSeen = true;
      this._alert(MECH_PUDDLE, 0);
    }
  }

  // le Tisseur CONSTRUIT la ou il passe : la mare est sa passive, pas une
  // attaque — c'est ce qui fait que la place se perd sans qu'il l'annonce.
  _puddlesActive() {
    return this.boss !== null
      && (this.boss.kind === BOSS_MATRIARCHE || this.boss.kind === BOSS_TISSEUR);
  }


  _bullets(dt) {
    const kept = [];
    for (const b of this.bullets) {
      b.life -= dt;
      this._armeDe = b.arme ? b.owner : 0;
      // vol bete, puis guidage a taux de virage limite : la limite cree l'arc,
      // sans courbe scriptee.
      if (b.missile) this._guide(b, dt);
      const wasX = b.x, wasY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      let bounced = false;
      if (b.bounce > 0) {
        const BB = this.bounds;
        if (b.x < BB.x0)           { b.x = 2 * BB.x0 - b.x; b.vx = -b.vx; bounced = true; }
        else if (b.x > BB.x1)      { b.x = 2 * BB.x1 - b.x; b.vx = -b.vx; bounced = true; }
        if (b.y < BB.y0)           { b.y = 2 * BB.y0 - b.y; b.vy = -b.vy; bounced = true; }
        else if (b.y > BB.y1)      { b.y = 2 * BB.y1 - b.y; b.vy = -b.vy; bounced = true; }
      }

      if (this.harvests.length && this._harvestHit(b.x, b.y, b.dmg)) {
        if (b.boom > 0) this._explode(b.x, b.y, b.boom, b.owner, b.boomR, 1, this._sensBoom(b));
        continue;
      }

      // le mur destructible encaisse AVANT le rebond : `_obstacleHit` reste le
      // point de passage unique des degats de couverture, il rend maintenant
      // l'obstacle au lieu d'un booleen.
      if (this.obstacles.length) {
        const o = this._obstacleHit(b.x, b.y, b.dmg);
        if (o && b.bounce > 0) {
          this._obstacleReflect(b, o, wasX, wasY);
          bounced = true;
        } else if (o) {
          if (b.boom > 0) this._explode(b.x, b.y, b.boom, b.owner, b.boomR, 1, this._sensBoom(b));
          continue;
        }
      }

      if (bounced) {
        b.bounce--;
        b.dmg *= CARD_CFG.BOUNCE_DAMAGE_MUL;
        if (b.hits) b.hits.clear(); else b.hit = null;
      }

      if (b.scinde) {
        b.scinde.reste -= Math.hypot(b.x - wasX, b.y - wasY);
        if (b.scinde.reste <= 0) { this._scinder(b, kept); continue; }
      }

      if (b.life > 0 && b.x > -50 && b.x < CFG.ARENA_W + 50
                     && b.y > -50 && b.y < CFG.ARENA_H + 50) {
        kept.push(b);
      } else if (b.boom > 0 && b.life <= 0) {
        this._explode(b.x, b.y, b.boom, b.owner, b.boomR, 1, this._sensBoom(b));
      }
    }
    this._armeDe = 0;
    this.bullets = kept;
  }

  /* LA SCISSION : le porteur meurt, les plombs naissent TOUS AU MEME POINT. Un
     corps pose la se prend la gerbe entiere ; a un metre pres il n'en recoit
     qu'une part. Ils entrent dans `kept` et non dans `this.bullets` — pousser
     dans le tableau qu'on parcourt les ferait avancer d'un tick de trop. */
  _scinder(b, kept) {
    const s = b.scinde;
    const a0 = Math.atan2(b.vy, b.vx);
    const v = Math.hypot(b.vx, b.vy);
    const px = -Math.sin(a0), py = Math.cos(a0);
    for (let i = 0; i < s.n; i++) {
      const k = s.n === 1 ? 0 : (i / (s.n - 1) - 0.5);
      const a = a0 + k * s.arc;
      kept.push({
        ...b,
        id: this._nextId++,
        x: b.x + px * k * s.lat, y: b.y + py * k * s.lat,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: s.vie, dmg: s.dmg, dmg0: s.dmg,
        chain: b.chain + s.chaine,
        hits: b.hits ? new Set() : null, hit: null,
        scinde: null,
      });
    }
    /* LA SCISSION EST LE SEUL CHIFFRE QUE CETTE ARME DEMANDE D'APPRENDRE, et
       elle partageait son `kind` avec le blocage, le teleport de boss et la
       recolte : un petit anneau, la meme chose que tout le reste. Elle a son
       `kind` a elle, son sens de vol et son nombre de plombs — la FORME de la
       gerbe, elle, se deduit des cartes du porteur cote client. */
    this.effects.push({ id: this._nextId++, x: b.x, y: b.y, r: 18,
                        life: 0.18, max: 0.18, kind: 19,
                        owner: b.owner, ang: a0, n: s.n });
  }

  _shots(dt) {
    const kept = [];
    const puddles = this._puddlesActive();
    const B = this.bounds;
    for (const s of this.shots) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (this.sancts.length) {
        let absorbed = false;
        for (const sa of this.sancts) {
          if ((s.x - sa.x) ** 2 + (s.y - sa.y) ** 2 <= sa.r * sa.r) { absorbed = true; break; }
        }
        if (absorbed) continue;
      }
      if (this.obstacles.length && this._obstacleHit(s.x, s.y, 0)) continue;
      if (s.life > 0 && s.x > -60 && s.x < CFG.ARENA_W + 60
                     && s.y > -60 && s.y < CFG.ARENA_H + 60) { kept.push(s); continue; }
      if (puddles && s.life <= 0
          && s.x > B.x0 && s.x < B.x1 && s.y > B.y0 && s.y < B.y1) {
        this._puddle(s.x, s.y);
      }
    }
    this.shots = kept;
  }

  _zoneHits(z, p) {
    const dx = p.x - z.x, dy = p.y - z.y;
    const F = CFG.ZONE_FORGIVE;

    if (z.shape === 1) {
      const c = Math.cos(-z.ang), s = Math.sin(-z.ang);
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      return Math.abs(lx) <= z.w * F / 2 && Math.abs(ly) <= z.h * F / 2;
    }
    if (z.shape === 2) {
      const d2 = dx * dx + dy * dy;
      const out = z.r * F, inn = z.hole / F;
      return d2 <= out * out && d2 >= inn * inn;
    }
    if (z.shape === 3) {
      const rr = z.r * F;
      if (dx * dx + dy * dy > rr * rr) return false;
      return Math.abs(this._angleDiff(Math.atan2(dy, dx), z.ang)) <= z.spread * F;
    }
    if (z.shape === 4) {
      const rr = z.r * F;
      if (dx * dx + dy * dy > rr * rr) return false;
      return Math.abs(this._angleDiff(Math.atan2(dy, dx), z.ang)) > z.spread / F;
    }
    if (z.shape === 5) {
      const c = Math.cos(-z.ang), s = Math.sin(-z.ang);
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      const half = z.h * F / 2, len = z.r * F;
      return (Math.abs(ly) <= half && Math.abs(lx) <= len)
          || (Math.abs(lx) <= half && Math.abs(ly) <= len);
    }
    const rr = z.r * F;
    return dx * dx + dy * dy <= rr * rr;
  }

  _angleDiff(a, b) {
    let d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  _zoneApply(z, amount, overTime) {
    if (z.pj) {
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if (!this._zoneHits(z, e)) continue;
        this._damage(e, amount, z.pj, 0, true);
      }
      return;
    }
    for (const p of this.players.values()) {
      if (p.downed) continue;
      // LA PARADE D'UNE PRISON EST LA CAGE, PAS L'ESQUIVE. Un joueur cloue par
      // `_markTick` ne peut pas sortir d'une zone : le sol ne le touche donc pas
      // tant qu'il y est, sinon la mecanique n'a plus de reponse.
      if (p.jailed > 0) continue;
      if (!this._zoneHits(z, p)) continue;
      let dmg = amount;
      if (z.prox) {
        const d = Math.hypot(p.x - z.x, p.y - z.y);
        const k = 1 - Math.min(1, d / (z.r || 1));
        dmg *= 0.2 + 0.8 * k * k;
      }
      this._hurt(p, dmg, { ignoreCooldown: true, fromZone: true, overTime, src: z.src });
    }
  }

  _zones(dt) {
    const kept = [];
    const B = this.bounds;
    for (const z of this.zones) {
      if (z.follow) {
        const t = this.players.get(z.follow);
        if (t && !t.downed) {
          const dx = t.x - z.x, dy = t.y - z.y;
          const d = Math.hypot(dx, dy);
          if (d > 1) {
            const step = Math.min(d, z.chase * dt);
            z.x += (dx / d) * step;
            z.y += (dy / d) * step;
          }
        }
      } else if (z.vx || z.vy) {
        z.x += z.vx * dt;
        z.y += z.vy * dt;
        if (z.x < B.x0 - z.r || z.x > B.x1 + z.r
            || z.y < B.y0 - z.r || z.y > B.y1 + z.r) { z.left = 0; z.life = 0; }
      }
      // une zone qui BOUGE peut entrer dans un abri apres sa pose : la regle se
      // rejoue a chaque image, sinon elle ne tient que pour les zones fixes.
      if ((z.follow || z.vx || z.vy) && this.marks.length) this._zoneEcarteAbris(z);

      if (z.warn > 0) {
        z.warn -= dt;
        if (z.warn <= 0) {
          z.blast = 0.25;
          this._zoneApply(z, z.dmg, false);
          if (z.left > 0) { z.left--; z.warn = z.period; z.warn0 = z.period; }
          else if (z.life > 0) z.tick = CFG.ZONE_TICK;
        }
        kept.push(z);
      } else if (z.life > 0) {
        z.life -= dt;
        z.blast = Math.max(0, z.blast - dt);
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = CFG.ZONE_TICK;
          this._zoneApply(z, z.dot * CFG.ZONE_TICK, true);
        }
        if (z.life > 0) kept.push(z);
      } else {
        z.blast -= dt;
        if (z.blast > 0) kept.push(z);
      }
    }
    this.zones = kept;
  }


  hasHealer() {
    for (const p of this.players.values()) {
      if (classAt(p.cls).id === "soigneur") return true;
    }
    return false;
  }

  _applyStatus(p, id, stacks = 1, duration = null) {
    const def = statusAt(id);
    if (!def || !p || p.downed) return false;

    if (def.lethal && !this.hasHealer()) return false;

    const time = (duration ?? def.time) * p.mods.statusTimeMul;
    const cur = p.statuses.get(id);
    if (cur) {
      cur.stacks = Math.min(def.stacks, cur.stacks + stacks);
      cur.until = Math.max(cur.until, this.time + time);
    } else {
      p.statuses.set(id, {
        stacks: Math.min(def.stacks, Math.max(1, stacks)),
        until: this.time + time,
      });
    }
    return true;
  }

  _purgeStatus(p) {
    for (const id of PURGE_ORDER) {
      const st = p.statuses.get(id);
      if (!st) continue;
      if (st.stacks > 1) st.stacks--;
      else p.statuses.delete(id);
      p.purges++;
      return id;
    }
    return -1;
  }

  _purgeAll(p) {
    if (p.statuses.size === 0) return 0;
    const n = p.statuses.size;
    p.purges += n;
    p.statuses.clear();
    return n;
  }

  _statuses(dt) {
    for (const p of this.players.values()) {
      if (p.relics.has("filtre_purifiant")) {
        p.timers.relicPurge -= dt;
        if (p.timers.relicPurge <= 0) {
          p.timers.relicPurge = 10;
          if (p.statuses.size > 0) this._purgeStatus(p);
        }
      }

      if (p.statuses.size === 0) continue;

      for (const [id, st] of p.statuses) {
        if (id === STATUS_BURN) {
          this._hurt(p, STATUS_CFG.BURN_DPS * dt,
            { ignoreCooldown: true, overTime: true, src: SRC_BURN });
        }

        if (this.time < st.until) continue;
        p.statuses.delete(id);

        if (id === STATUS_DOOM && !p.downed) {
          if (p.hp >= p.maxHp * STATUS_CFG.DOOM_HEAL_RATIO) {
            this.effects.push({
              id: this._nextId++,
              x: p.x, y: p.y, r: 120, life: 0.6, max: 0.6, kind: 4,
            });
          } else {
            p.hp = 0;
            p.downed = true;
            p.revive = 0;
            p.deaths++;
            p.statuses.clear();
          }
        }
      }
    }
  }



  _hurt(p, amount, {
    ignoreCooldown = false, fromZone = false, overTime = false, mech = false,
    src = SRC_CONTACT,
  } = {}) {
    if (!p || p.downed) return;
    if (this.repriseGrace > 0) return;
    if (p.dashT > 0) return;
    if (p.tauntInvuln > 0) return;
    p.hf.sain = 0;
    p.hf.segSain = 0;
    if (this.boss) p.hf.bossDegat++;
    if (fromZone && p.timers.zoneImmune > 0) return;
    if (!ignoreCooldown && p.hitCd > 0) return;

    amount *= this.diff.dmg * p.mods.damageTakenMul;
    for (const o of this.players.values()) {
      if (o === p || o.downed || !(o.mods.guardAura > 0)) continue;
      if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 <= PROG_CFG.GUARD_RADIUS ** 2) {
        amount *= 1 - o.mods.guardAura;
        break;
      }
    }
    // phalange : la reduction vaut pour TOUTE l'equipe, et comme toute aura elle ne
    // se cumule pas — meilleure valeur, jamais le produit
    let phalange = 0;
    for (const o of this.players.values()) {
      if (o.downed || !(o.mods.phalanxStep > 0)) continue;
      const r = o.mods.phalanxStep * this._alliesNear(o);
      if (r > phalange) phalange = r;
    }
    if (phalange > 0) amount *= 1 - phalange;
    const vuln = p.statuses.get(STATUS_VULN);
    if (vuln) amount *= 1 + STATUS_CFG.VULN_PER_STACK * vuln.stacks;
    if (p.tauntT > 0) amount *= SKILL_CFG.TANK_TAUNT_REDUCTION;
    p.elanT = 0;
    if (!overTime) p.hitCd = CFG.PLAYER_HIT_CD;

    if (p.tauntT > 0 && p.mods.represailles > 0) {
      this._wave(p.x, p.y, CARD_CFG.REPRESAILLES_RADIUS,
        p.mods.represailles * p.mods.damageMul, p.id);
    }
    p.timers.shieldRegen = CARD_CFG.SHIELD_REGEN_DELAY / p.mods.shieldRegenMul;
    if (fromZone && p.mods.zoneImmunity > 0) p.timers.zoneImmune = p.mods.zoneImmunity;

    if (p.mods.counterNova > 0 && p.timers.counter <= 0) {
      p.timers.counter = CARD_CFG.COUNTER_CD;
      this._wave(p.x, p.y, CARD_CFG.COUNTER_RADIUS,
        p.mods.counterNova * p.mods.damageMul, p.id);
    }

    if (mech && p.hp >= p.maxHp - 0.5 && p.shield <= 0) {
      amount = Math.min(amount, p.hp - 1);
    }

    p.lastSrc = src;
    p.hurtBy[src] += amount;

    if (p.mods.thorns > 0 && amount > 0 && !overTime) {
      const rr = PROG_CFG.THORNS_RADIUS ** 2;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= rr) {
          this._damage(e, amount * p.mods.thorns, p.id);
        }
      }
    }

    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, amount);
      p.shield -= absorbed;
      amount -= absorbed;
      if (p.shield === 0 && !p.relicBatteryUsed && p.relics.has("battery_secours")) {
        p.relicBatteryUsed = 1;
        this._grantShield(p, p.mods.shieldPool * 0.5, p.mods.shieldPool);
      }
    }

    p.hp -= amount;

    if (p.hp > 0 && p.mods.instinctCd > 0 && p.timers.instinct <= 0
        && p.hp <= p.maxHp * CARD_CFG.INSTINCT_HP) {
      p.timers.instinct = p.mods.instinctCd;
      this.slow = Math.max(this.slow, CARD_CFG.INSTINCT_TIME);
    }

    if (p.hp <= 0) {
      p.hp = 0;

      if (p.mods.selfRevive && !p.selfReviveUsed) {
        p.selfReviveUsed = 1;
        p.hp = 30;
        p.hitCd = CFG.PLAYER_HIT_CD;
        this.effects.push({
          id: this._nextId++,
          x: p.x, y: p.y, r: 110, life: 0.6, max: 0.6, kind: 4,
        });
        return;
      }

      if (this._guardian(p)) return;

      p.downed = true;
      p.revive = 0;
      p.deaths++;
    }
  }

  _guardian(p) {
    for (const o of this.players.values()) {
      if (o.id === p.id || o.downed) continue;
      if (o.mods.guardianCd <= 0 || o.timers.guardian > 0) continue;
      const r = CARD_CFG.GUARDIAN_RADIUS;
      if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 > r * r) continue;

      o.timers.guardian = o.mods.guardianCd;
      p.hp = Math.min(p.maxHp,
        Math.round(p.maxHp * Math.max(CFG.REVIVE_HP_RATIO, o.mods.reviveHpRatio))
        + (o.mods.reviveHpBonus ?? 0));
      p.hitCd = CFG.PLAYER_HIT_CD;
      this.effects.push({
        id: this._nextId++,
        x: p.x, y: p.y, r: 130, life: 0.7, max: 0.7, kind: 4,
      });
      return true;
    }
    return false;
  }

  _bulletHitEnemy(b, e, ix, iy) {
    const avant = this._balle;
    this._balle = b;
    try { return this._bulletHitInterne(b, e, ix, iy); }
    finally { this._balle = avant; }
  }

  /* Point de passage unique de l'ATTRIBUTION A L'ARME. Une balle de competence
     et une balle de tir sortent toutes deux de `_fire` : c'est `_volley` qui les
     distingue, et le drapeau voyage sur la balle jusqu'a l'impact. */
  _sousArme(id, fn) {
    const avant = this._armeDe;
    this._armeDe = id;
    try { return fn(); } finally { this._armeDe = avant; }
  }

  _bulletHitInterne(b, e, ix, iy) {
    // LE DEPOT COMPARAIT DES DEGRES A DES RADIANS. `def.shieldArc` vaut 100
    // (degres) et `_angleDiff` rend au plus 3,15 : le test `|d| <= 50` etait
    // TOUJOURS vrai, donc le porte-bouclier absorbait de TOUTES les directions
    // depuis qu'il existe — pendant que le client, lui, ne dessinait le blocage
    // que de face. L'arc en radians vit deja sur le corps, pose a l'apparition.
    /* UN TIR BLOQUE N'EST PAS UNE TOUCHE. `hitSeq++` sans degat rendait un
       HIT_LEGER cote client — eclair blanc, etincelles, voix — donc le
       porte-bouclier absorbait pendant que le joueur voyait un coup qui porte.
       Le blocage pose son PROPRE effet et ne touche plus le compteur.
       Celui qui portait cet effet vivait plus bas, derriere une garde
       `e.shieldArc > 0` INATTEIGNABLE : celle-ci teste deja la meme chose et
       rend `true`. Il n'a donc jamais ete pousse une seule fois. */
    if (e.shieldArc > 0) {
      const from = Math.atan2(iy - e.y, ix - e.x);
      if (Math.abs(this._angleDiff(from, e.ang)) <= e.shieldArc / 2) {
        this.effects.push({
          id: this._nextId++, x: ix, y: iy, r: 12, life: 0.16, max: 0.16,
          kind: 18, ang: from,
        });
        return true;
      }
    }

    if (b.boom > 0) {
      // un missile fait les DEUX : le direct puis le souffle. La grenade, elle,
      // n'a jamais eu que le souffle.
      if (b.missile || b.direct) {
        if (b.vuln) e.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
        this._damage(e, b.dmg, b.owner, b.burn);
      }
      // un obus VOLE DROIT : ce qu'il projette part devant lui. Une grenade est
      // LOBEE, donc elle n'a plus de sens en arrivant — et c'est declare, pas
      // deduit, exactement comme dans `_volley`.
      this._explode(ix, iy, b.boom, b.owner, b.boomR, 1,
                    b.lob ? undefined : Math.atan2(b.vy, b.vx));
      return true;
    }


    const tireur = this.players.get(b.owner);
    // CIBLE FROIDE : la prime va au corps qu'on n'a pas touche depuis un moment,
    // donc a la horde et jamais a la file qu'on arrose
    let froid = 1;
    if (tireur && tireur.mods.precFroide > 0) {
      const vu = tireur.precVus.get(e.id);
      if (vu === undefined || this.time - vu >= ARME_CFG.PREC_FROID) {
        froid = tireur.mods.precFroide;
      }
      tireur.precVus.set(e.id, this.time);
    }
    this._damage(e, b.dmg * froid, b.owner, b.burn);
    if (tireur && tireur.mods.precMarque > 0) {
      e.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
    }
    // RESONANCE : le rail grossit a chaque corps traverse, la ou l'inertie decroit
    if (b.reso > 0) b.dmg *= 1 + b.reso;
    if (tireur) {
      const chance = tireur.mods.rootChance + this._relicSum(tireur, "rootChance");
      if (chance > 0 && Math.random() < chance) {
        this._rootEnemy(e, CARD_CFG.FILINS_TIME);
      }
    }
    const critPierce = this.lastCrit && tireur?.mods.critVuln;
    if (b.arc > 0 && Math.random() < b.arc) this._arc(e, b.dmg, b.owner);
    if (e.hp <= 0 && b.chain > 0) this._ricochet(e, b);

    if (b.inertia) {
      b.dmg *= CARD_CFG.INERTIA_DECAY;
      if (b.dmg < b.dmg0 * CARD_CFG.INERTIA_MIN_MUL) return true;
    }

    if (b.pierce > 0) {
      b.pierce--;
      if (b.hits) b.hits.add(e.id); else b.hit = e.id;
      return false;
    }
    if (critPierce) {
      b.hits ??= new Set();
      b.hits.add(e.id);
      return false;
    }
    return true;
  }

  _spawnSweep(b, px, py) {
    const sx = b.x - px, sy = b.y - py;
    const len2 = sx * sx + sy * sy;
    if (len2 <= 0) return false;

    const near = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const rr = e.r + CFG.BULLET_RADIUS;
      const t = Math.max(0, Math.min(1, ((e.x - px) * sx + (e.y - py) * sy) / len2));
      const cx = px + sx * t - e.x, cy = py + sy * t - e.y;
      if (cx * cx + cy * cy <= rr * rr) near.push({ e, t });
    }
    if (near.length === 0) return false;
    near.sort((a, c) => a.t - c.t);

    for (const { e, t } of near) {
      if (e.hp <= 0) continue;
      if (b.hits ? b.hits.has(e.id) : b.hit === e.id) continue;
      if (this._bulletHitEnemy(b, e, px + sx * t, py + sy * t)) return true;
    }
    return false;
  }

  _collisions() {
    const live = [];
    for (const b of this.bullets) {
      let hit = false;
      // le drapeau voyage sur la balle JUSQU'A L'IMPACT : `_bullets` le posait
      // pendant le vol, mais l'impact se resout ici, donc toute une image de
      // touches etait attribuee a la derniere balle parcourue
      this._armeDe = b.arme ? b.owner : 0;

      for (const boss of this._bossTargets()) {
        if (hit) break;
        if (b.hits ? b.hits.has(boss.id) : b.hit === boss.id) continue;
        const rr = CFG.BOSS_RADIUS + CFG.BULLET_RADIUS;
        if ((b.x - boss.x) ** 2 + (b.y - boss.y) ** 2 <= rr * rr) {
          if (b.boom > 0) {
            // sans plafond, huit missiles sur une cible UNIQUE — donc toutes les
            // cibles saturees, donc tout double dessus — seraient la meilleure
            // source de degats du jeu contre un boss.
            if (b.missile) {
              this._damage(boss, b.dmg * CARD_CFG.SALVE_BOSS_MUL, b.owner, 0, false, b.x, b.y);
            } else if (b.direct) {
              // UN OBUS FAIT LES DEUX SUR UN BOSS AUSSI. Sans cette branche, tout
              // ce que le siege rendait a une cible unique venait de son souffle,
              // et reduire le rayon le faisait tomber a ZERO — mesure a l'appui.
              this._damage(boss, b.dmg, b.owner, b.burn, false, b.x, b.y);
            }
            this._explode(b.x, b.y, b.boom, b.owner, b.boomR, b.missile ? CARD_CFG.SALVE_BOSS_MUL : 1, this._sensBoom(b));
            hit = true;
          } else {
            this._damage(boss, b.dmg, b.owner, b.burn, false, b.x, b.y);
            if (b.pierce > 0) {
              b.pierce--;
              if (b.hits) b.hits.add(boss.id); else b.hit = boss.id;
            } else {
              hit = true;
            }
          }
        }
      }

      if (!hit && this.marks.length) {
        for (const m of this.marks) {
          if (m.dead || m.maxHp <= 0) continue;
          const rr = m.r + CFG.BULLET_RADIUS;
          if ((b.x - m.x) ** 2 + (b.y - m.y) ** 2 > rr * rr) continue;
          if (b.boom > 0) { this._explode(b.x, b.y, b.boom, b.owner, b.boomR, 1, this._sensBoom(b)); hit = true; break; }
          m.hp -= b.dmg;
          if (m.hp <= 0) this._breakMark(m);
          if (b.pierce > 0) b.pierce--; else hit = true;
          break;
        }
      }

      if (!hit) {
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          // UN MISSILE NE S'ARME QUE SUR SA CIBLE. Sans cette regle la gerbe
          // initiale detone sur le premier corps croise et l'attribution en
          // trois passes ne veut plus rien dire : six missiles finissent sur les
          // deux ennemis places dans l'axe du reticule.
          if (b.missile && e.id !== b.cible) continue;
          if (b.hits ? b.hits.has(e.id) : b.hit === e.id) continue;
          const rr = e.r + CFG.BULLET_RADIUS;
          if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 > rr * rr) continue;
          hit = this._bulletHitEnemy(b, e, b.x, b.y);
          break;
        }
      }
      if (!hit) live.push(b);
    }
    this._armeDe = 0;
    this.bullets = live;
    this.enemies = this.enemies.filter(e => e.hp > 0);

    for (const p of this.players.values()) {
      if (p.downed) continue;
      for (const e of this.enemies) {
        const rr = e.r + CFG.PLAYER_RADIUS;
        if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 <= rr * rr) {
          const bdef = defDe(e.type, e.elite);
          this._hurt(p, bdef.dmg, { src: SRC_CONTACT });
          // le harceleur se retire APRES avoir touche : c'est la seule chose
          // qui separe un harcelement d'une morsure.
          if (bdef.recul) e.fleeT = bdef.recul;
          if (e.elite && e.statusAt <= this.time && p.dashT <= 0 && p.tauntInvuln <= 0) {
            const id = ELITE_STATUS[ENEMY_TYPES[e.type].key];
            if (id !== undefined) {
              e.statusAt = this.time + STATUS_CFG.ELITE_STATUS_CD;
              this._applyStatus(p, id);
            }
          }
          break;
        }
      }
      for (const boss of this._bossTargets()) {
        const rr = CFG.BOSS_RADIUS + CFG.PLAYER_RADIUS;
        if ((p.x - boss.x) ** 2 + (p.y - boss.y) ** 2 > rr * rr) continue;
        this._hurt(p, CFG.BOSS_CONTACT_DAMAGE, { src: SRC_CONTACT });
        if (boss.status !== undefined && p.twinCd <= this.time
            && p.dashT <= 0 && p.tauntInvuln <= 0) {
          p.twinCd = this.time + BOSS_CFG.TWIN_STATUS_CD;
          this._applyStatus(p, boss.status);
        }
        break;
      }
    }

    const keptShots = [];
    const puddles = this._puddlesActive();
    for (const s of this.shots) {
      let hit = false;
      for (const p of this.players.values()) {
        if (p.downed) continue;
        const rr = CFG.PLAYER_RADIUS + CFG.SHOT_RADIUS;
        if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 <= rr * rr) {
          this._hurt(p, CFG.SHOT_DAMAGE, { src: SRC_SHOT });
          hit = true;
          break;
        }
      }
      if (!hit) keptShots.push(s);
      else if (puddles) this._puddle(s.x, s.y);
    }
    this.shots = keptShots;
  }

  _ricochet(origin, b) {
    const seen = new Set([origin.id]);
    let src = origin;
    let dmg = b.dmg * CFG.RICOCHET_MUL;

    for (let i = 0; i < b.chain; i++) {
      let best = null, bestD = CFG.RICOCHET_RADIUS * CFG.RICOCHET_RADIUS;
      for (const e of this.enemies) {
        if (e.hp <= 0 || seen.has(e.id)) continue;
        const d = (e.x - src.x) ** 2 + (e.y - src.y) ** 2;
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) break;

      seen.add(best.id);
      this.effects.push({
        id: this._nextId++,
        x: src.x, y: src.y, x2: best.x, y2: best.y,
        // rang 2 et au-dela : un ricochet de carte n'a pas d'amorce — il n'a pas
        // ete vise — mais il perd de la meme facon, donc il se lit de la meme.
        r: 0, life: 0.22, max: 0.22, kind: 3, n: i + 2,
      });

      this._damage(best, dmg, b.owner);
      src = best;
      dmg *= CFG.RICOCHET_MUL;
    }
  }


  _credit(owner, score) {
    if (!owner) return;
    owner.kills++;
    owner.score += Math.round(score * owner.mods.scoreMul);

    if (owner.odT > 0) {
      owner.odBonus = Math.min(SKILL_CFG.DPS_OVERDRIVE_MAX,
        owner.odBonus + SKILL_CFG.DPS_OVERDRIVE_PER_KILL);
    }
  }

  _addXp(amount) {
    this.xp += amount / Math.pow(Math.max(1, this.players.size), CFG.WAVE_CROWD_EXP);

    while (this.level < CFG.LEVEL_MAX && this.xp >= this.levelAt) {
      this.level++;
      this.pendingLevels++;
      this.levelFrom = this.levelAt;
      this.levelStep = Math.round(this.levelStep * CFG.LEVEL_XP_GROWTH * this._xpCostMul());
      this.levelAt = this.levelFrom + this.levelStep;

      for (const p of this.players.values()) {
        if (p.mods.damagePerLevel > 0) this._recomputeMods(p);
      }

      const lvlAt = this._teamCentroid();
      this.effects.push({
        id: this._nextId++,
        x: lvlAt.x, y: lvlAt.y,
        r: 78,
        life: 0.55, max: 0.55,
        kind: 2,
      });
    }

    if (this.pendingLevels > 0 && !this.boss && !this.bossPending
      && !this.cardsPending && !this.relicPending) {
      this.openCards(false);
    }
  }

  _xpValue(e) {
    const def = ENEMY_TYPES[e.type];
    const base = (def?.xp ?? 10) * (e.elite ? CFG.ELITE_SCORE_MUL : 1);
    return base * (e.xpWorth ?? 1) * this._xpTimeMul();
  }

  _xpTimeMul() {
    return Math.pow(CFG.XP_MINUTE_GROWTH, this.hordeMinutes())
      * Math.pow(CFG.XP_LEVEL_GROWTH, Math.max(0, this.level - 1));
  }

  _xpCostMul() {
    let worst = 1;
    for (const p of this.players.values()) {
      if (p.mods.xpCostMul > worst) worst = p.mods.xpCostMul;
    }
    return worst;
  }

  _sweepEnemies() {
    this.enemies = [];
    this.shots = [];
    this.zones = [];
    this.harvests = [];

    for (const p of this.players.values()) {
      if (p.frenzyStacks > 0) {
        p.timers.frenzy = Math.max(p.timers.frenzy, CFG.SWEEP_STACK_GRACE);
      }
      if (p.rageStacks > 0) {
        p.rageT = Math.max(p.rageT, CFG.SWEEP_STACK_GRACE);
      }
    }
  }

  _killEnemy(e, ownerId) {
    this.totalKills++;
    if (this.quarry === e.id) this.quarry = 0;
    const def = defDe(e.type, e.elite);
    const owner = this.players.get(ownerId);
    this._addXp(this._xpValue(e));
    this._credit(owner, e.elite ? Math.round(def.score * CFG.ELITE_SCORE_MUL) : def.score);

    if (owner) {
      // [26f] un critique QUI TUE ne laisse aucune trace dans l'instantane : le
      // corps a disparu avec son compteur. Le compteur vit donc sur le TUEUR.
      if (this.lastCrit) owner.critKills = (owner.critKills + 1) % 10;

      this._hfKill(owner, e);

      this._siegeKill(owner);

      if (owner.mods.frenzy) {
        const cap = Math.round(CARD_CFG.FRENZY_MAX / CARD_CFG.FRENZY_STEP);
        owner.frenzyStacks = Math.min(cap, owner.frenzyStacks + 1);
        owner.timers.frenzy = CARD_CFG.FRENZY_DECAY;
      }

      if (owner.mods.ragePerKill > 0) {
        owner.rageStacks = Math.min(CARD_CFG.RAGE_MAX, owner.rageStacks + 1);
        owner.rageT = CARD_CFG.RAGE_TIME;
      }
      if (owner.mods.hpPerKill > 0 && !owner.downed) {
        owner.hp = Math.min(owner.maxHp, owner.hp + owner.mods.hpPerKill);
      }
      if (owner.mods.cdPerKill > 0) {
        owner.cd1 = Math.max(0, owner.cd1 - owner.mods.cdPerKill);
        owner.cd2 = Math.max(0, owner.cd2 - owner.mods.cdPerKill);
      }

      if (owner.mods.harvest > 0 && Math.random() < owner.mods.harvest
          && this.powerups.length - this._solBonus() < CFG.FRAGMENT_MAX_GROUND) {
        const pt = this._dropPoint(e.x, e.y);
        this._poserBonus(TYPE_FRAGMENT, pt.x, pt.y);
      }

      // un ennemi qui meurt sous le tesla relance un arc depuis son corps
      if (owner.mods.teslaMort > 0 && armeAt(owner.arme).rebonds && !this._inArc) {
        this._inArc = true;
        this._arc(e, armeAt(owner.arme).degats * owner.mods.damageMul, ownerId);
        this._inArc = false;
      }

      if (owner.mods.burnSpread > 0 && e.burn) {
        this._burnSpread(e, owner.mods.burnSpread, e.burn.dmg, ownerId);
      }

      if (owner.mods.deathWave > 0 && !this._inWave) {
        this._inWave = true;
        this._wave(e.x, e.y, CARD_CFG.DEATHWAVE_RADIUS,
          owner.mods.deathWave * this._summonMul(owner), ownerId);
        this._inWave = false;
      }
    }

    if (e.elite) {
      const pt = this._dropPoint(e.x, e.y);
      this._poserBonus(this._randomPowerupType(), pt.x, pt.y);
      // une elite en larguait DEJA un : la carte en donne un second
      if (owner && owner.mods.eliteDrop > 0) {
        const pt2 = this._dropPoint(e.x, e.y);
        this._poserBonus(this._randomPowerupType(), pt2.x, pt2.y);
      }
      this.effects.push({
        id: this._nextId++,
        x: e.x, y: e.y, r: 90, life: 0.5, max: 0.5, kind: 5,
      });
    }

    if (def.splits) {
      for (let i = 0; i < def.splits; i++) {
        const a = Math.random() * Math.PI * 2;
        this._spawnEnemy(1, e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22);
      }
    }

    if (def.blastRadius) {
      this._zone({
        x: e.x, y: e.y,
        r: def.blastRadius,
        warn: def.blastDelay,
        dmg: def.blastDamage,
        src: SRC_BLAST,
      });
    }

    if (hasTrait(e.traits, TRAIT_SPORE)) {
      this._groundZone(e.x, e.y, TRAIT_CFG.SPORE_R, TRAIT_CFG.SPORE_DOT,
        TRAIT_CFG.SPORE_LIFE);
    }
  }

  _killBoss(ownerId) {
    this._credit(this.players.get(ownerId), 500);
    this.totalKills++;
    if (this.boss) this.bossKindsKilled.add(this.boss.kind);
    if (this.boss && estFinal(this.boss.kind)) {
      this.finalKill = Math.round(this.boss.fightT * 10) / 10;
    }
    this.bossKills++;
    const duree = this.boss ? this.boss.fightT : 0;
    for (const p of this.players.values()) {
      const hf = p.hf;
      if (p.skillUses[2] === hf.bossUlt0) hf.bossSansUlt = 1;
      if (hf.bossDegat === 0) hf.bossSansDegat = 1;
      if (duree > 0 && (hf.bossVite === 0 || duree < hf.bossVite)) hf.bossVite = duree;
    }
    const final = this.boss && estFinal(this.boss.kind);
    if (this.boss && !final) this._merchantDue();

    if (final) this.finalDone = true;
    this.boss = null;
    this.boss2 = null;
    this.shots = [];
    this.zones = [];
    this.marks = [];
    this.slipT = 0;
    this.bounds = { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H };
    this.shrink = null;
    this.walls = null;
    this.puddleSeen = false;
    for (const p of this.players.values()) { p.jailed = 0; p.trail.length = 0; }
    for (const p of this.players.values()) {
      if (!p.downed) p.hp = Math.min(p.maxHp, p.hp + 40 + p.mods.healPerBoss);
    }

    this._nextSegment();
    if (this.gameOver) return;
    this.openNextScreen();
  }


  _revive(dt) {
    for (const p of this.players.values()) {
      if (!p.downed) continue;

      let rate = 0;
      let ratio = CFG.REVIVE_HP_RATIO;
      let bonus = 0;
      let jureur = null;
      for (const o of this.players.values()) {
        if (o.id === p.id || o.downed) continue;
        const r = CFG.REVIVE_RADIUS * o.mods.reviveRadiusMul;
        const proche = (o.x - p.x) ** 2 + (o.y - p.y) ** 2 <= r * r;
        // le lien releve DE LOIN : c'est le seul point d'achevement, il compte
        // les deux sources au lieu d'en ouvrir un second.
        const lie = o.links.some(l => !l.ennemi && l.id === p.id);
        if (!proche && !lie) continue;
        rate += lie ? SKILL_CFG.HEAL_LINK_REVIVE * o.mods.reviveSpeedMul
                    : o.mods.reviveSpeedMul;
        if (o.mods.reviveHpRatio > ratio) ratio = o.mods.reviveHpRatio;
        if ((o.mods.reviveHpBonus ?? 0) > bonus) bonus = o.mods.reviveHpBonus;
        if (o.mods.oathDamage > (jureur?.mods.oathDamage ?? 0)) jureur = o;
      }

      if (rate > 0) {
        p.revive += dt * rate;
        if (p.revive >= CFG.REVIVE_TIME) {
          for (const o of this.players.values()) {
            if (o.id === p.id || o.downed) continue;
            const r = CFG.REVIVE_RADIUS * o.mods.reviveRadiusMul;
            const proche = (o.x - p.x) ** 2 + (o.y - p.y) ** 2 <= r * r;
            if (proche || o.links.some(l => !l.ennemi && l.id === p.id)) o.hf.revives++;
          }
          p.downed = false;
          p.hp = Math.min(p.maxHp, Math.round(p.maxHp * ratio) + bonus);
          p.revive = 0;
          p.hitCd = CFG.PLAYER_HIT_CD;
          for (const o of this.players.values()) {
            if (o.downed) continue;
            const soin = this._relicSum(o, "reviveHeal");
            if (soin <= 0) continue;
            const r = CFG.REVIVE_RADIUS * o.mods.reviveRadiusMul;
            if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 > r * r) continue;
            p.hp = Math.min(p.maxHp, p.hp + soin);
            o.hp = Math.min(o.maxHp, o.hp + soin);
          }
          if (jureur) {
            for (const q of [p, jureur]) {
              q.oathT = CARD_CFG.SERMENT_TIME;
              q.oathMul = Math.max(q.oathMul, jureur.mods.oathDamage);
            }
            this.effects.push({
              id: this._nextId++, x: p.x, y: p.y, r: 90,
              life: 0.5, max: 0.5, kind: 4,
            });
          }
        }
      } else {
        p.revive = Math.max(0, p.revive - dt * CFG.REVIVE_DECAY);
      }
    }
  }

  /* CE QUE VAUT UN JOUEUR COUVERT, releve UNE FOIS par image et non par corps.
     Un joueur avec un allie a portee pese jusqu'a `ISOLE_COUVERT` fois sa
     distance ; un joueur seul pese la sienne. Le harceleur choisit donc le plus
     isole sans qu'aucun seuil n'existe — il n'y a pas d'instant ou l'on
     « devient » isole, il y a un degre de couverture. */
  _isolementPass() {
    const table = this._isoK;
    table.clear();
    const vivants = this._alivePlayers();
    if (vivants.length < 2) return;
    const r2 = ATK_CFG.ISOLE_RAYON ** 2;
    for (const p of vivants) {
      let proche = Infinity;
      for (const q of vivants) {
        if (q === p) continue;
        const d2 = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
        if (d2 < proche) proche = d2;
      }
      const k = proche >= r2 ? 0 : 1 - Math.sqrt(proche) / ATK_CFG.ISOLE_RAYON;
      table.set(p.id, 1 + (ATK_CFG.ISOLE_COUVERT - 1) * k);
    }
  }

  _nearestPlayer(x, y, isole = 0) {
    if (this.taunt) {
      const r = SKILL_CFG.TANK_TAUNT_RADIUS;
      if ((x - this.taunt.x) ** 2 + (y - this.taunt.y) ** 2 <= r * r) {
        const tank = this.players.get(this.taunt.id);
        if (tank && !tank.downed) return tank;
      }
    }

    let best = null, bestD = Infinity;
    for (const p of this.players.values()) {
      if (p.downed) continue;
      let d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (isole) d *= this._isoK.get(p.id) ?? 1;
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best) for (const p of this.players.values()) return p;
    return best;
  }


  _statusMask(p) {
    let mask = 0;
    for (const id of p.statuses.keys()) mask |= statusBit(id);
    return mask;
  }

  _coverState() {
    let out = null;
    for (let i = 0; i < this.obstacles.length; i++) {
      const b = this.obstacles[i];
      if (b.maxHp <= 0 || b.hp >= b.maxHp) continue;
      (out ??= []).push([i, Math.round(b.hp / b.maxHp * 100) / 100]);
    }
    return out;
  }

  // `vue` FILTRE CE QUI EST LOIN, et rien d'autre. Ce qui reste entier :
  // les JOUEURS (les fleches de coequipiers hors champ les lisent), le boss,
  // les ZONES et les MARQUEURS (un telegraphe rate est une perte de jeu, ils ne
  // pesent qu'un dixieme du paquet), et tout ce qui tient en quelques entrees.
  // `vue` absent = instantane complet, exactement comme avant.
  snapshot(vue = null) {
    const r1 = v => Math.round(v * 10) / 10;
    const r2 = v => Math.round(v * 100) / 100;

    const trimTail = (a, keep) => {
      let n = a.length;
      while (n > keep && !a[n - 1]) n--;
      return n === a.length ? a : a.slice(0, n);
    };

    const filtrer = (list, rayon, forme) => {
      if (!vue) return list.map(forme);
      const out = [];
      for (const o of list) {
        const r = rayon(o);
        if (o.x + r < vue.x0 || o.x - r > vue.x1
            || o.y + r < vue.y0 || o.y - r > vue.y1) continue;
        out.push(forme(o));
      }
      return out;
    };

    const wuVus = filtrer(this.windup, () => 0, e => e.id);

    return {
      t: "state",
      tm: r2(this.time),
      ov: this.gameOver ? 1 : 0,
      k: this.totalKills,
      p: [...this.players.values()].map(p => [
        p.id, r1(p.x), r1(p.y), Math.round(p.hp), p.downed ? 1 : 0,
        r2(p.revive), r2(p.aimX), r2(p.aimY), p.kills,
        (p.buffDamage > 0 ? BUFF_DAMAGE : 0)
          | (p.buffRate > 0 ? BUFF_RATE : 0)
          | (p.buffDouble > 0 ? BUFF_DOUBLE : 0)
          | (p.buffPierce > 0 ? BUFF_PIERCE : 0)
          | (p.buffRicochet > 0 ? BUFF_RICOCHET : 0),
        p.score, p.deaths, Math.round(p.shield),
        this.level, Math.round(p.maxHp),
        this.level >= CFG.LEVEL_MAX
          ? 1
          : r2(Math.min(1, (this.xp - this.levelFrom) / Math.max(1, this.levelAt - this.levelFrom))),
        r2(p.dashCd), p.dashT > 0 ? 1 : 0,
        p.mods.orbiters, Math.round(p.frostR),
        p.cls,
        // LA RECHARGE DE LA PREMIERE COMPETENCE, quelle que soit la classe. Le
        // Soigneur n'utilise pas `cd1` : sa bascule tient dans `healSwapCd`, et
        // la case restait donc PRETE en permanence a l'ecran. Aucune clef ne
        // s'ouvre, c'est l'emplacement qui cessait d'etre rempli pour une classe
        // sur trois — et la variable reste seule source, on ne la duplique pas.
        r1(classAt(p.cls).id === "soigneur" ? p.healSwapCd : p.cd1), r1(p.cd2),
        (p.healMode ? SKILL_HEAL_MODE : 0)
          | (p.tauntT > 0 ? SKILL_TAUNT : 0)
          | (p.odT > 0 || p.odBonus > 0 ? SKILL_OVERDRIVE : 0)
          | (p.ultT > 0 ? SKILL_ULT_WIND : 0),
        p.bombStock,
        this._statusMask(p),
        p.statuses.get(STATUS_VULN)?.stacks ?? 0,
        r1(Math.max(0, (p.statuses.get(STATUS_DOOM)?.until ?? 0) - this.time)),
        Math.round(p.damageDealt),
        p.lastSrc,
        r1(p.cd3), p.mods.skill3,
        p.eclats,
        r2(p.fireInterval),
        p.critKills,
        ARME_INDEX.get(p.arme) ?? 0,
        r2(p.armeRes),
        r2(p.armeAng),
      ]),
      e: filtrer(this.enemies, e => e.r,
        e => trimTail([e.id, r1(e.x), r1(e.y), Math.round(e.hp), Math.round(e.maxHp),
                       e.type + (e.elite ? 100 : 0),
                       r2(e.ang), e.hitSeq, e.critSeq, Math.round(e.shield),
                       e.lienT > 0 ? 0 : e.pair,
                       /* LA BRULURE, EN PART DE DUREE ET NON EN DRAPEAU. Quatre
                          cartes la posent et rien ne la montrait. Une part laisse
                          la lueur s eteindre avec elle ; un booleen l aurait fait
                          disparaitre d un coup, ce qui aurait ressemble a une
                          purge alors que la brulure va au bout. `trimTail` la
                          retire quand elle vaut 0, donc elle ne coute rien a la
                          horde qui ne brule pas. */
                       r2(e.burn ? e.burn.t / CARD_CFG.BURN_TIME : 0),
                       /* LA VULNERABILITE, EN SECONDES RESTANTES. Sept sources la
                          posent — crit, ruee, souffle, balle — pour +25 % de
                          degats, et rien ne la montrait non plus. En secondes et
                          non en part : `VULNERABLE_TIME` (4 s) et
                          `CONTRE_PIED_TIME` (3 s) different, donc une part
                          obligerait le client a savoir QUI l a posee. */
                       r1(Math.max(0, (e.vulnUntil ?? 0) - this.time))], 7)),
      b: filtrer(this.bullets, () => CFG.BULLET_RADIUS,
        b => b.missile ? [b.id, r1(b.x), r1(b.y), b.owner, SIL_MISSILE]
          : b.scinde ? [b.id, r1(b.x), r1(b.y), b.owner, SIL_PORTEUR]
          : [b.id, r1(b.x), r1(b.y), b.owner]),
      s: filtrer(this.shots, () => CFG.BULLET_RADIUS,
        s => [s.id, r1(s.x), r1(s.y)]),
      z: this.zones.map(z => trimTail([
        z.id, r1(z.x), r1(z.y), Math.round(z.r), r2(z.warn), r2(z.blast),
        z.shape ?? 0, Math.round(z.w ?? 0), Math.round(z.h ?? 0),
        r2(z.ang ?? 0), Math.round(z.hole ?? 0), r2(z.warn0 ?? CFG.ZONE_WARN),
        r2(z.spread ?? 0), r2(z.life ?? 0), z.prox ? 1 : 0, z.pj ?? 0], 6)),
      mk: this.marks.map(m => [m.id, r1(m.x), r1(m.y), Math.round(m.r),
                               r2(m.max > 0 ? Math.max(0, m.t) / m.max : 0), m.mech,
                               m.a, m.b, m.need, m.cur,
                               r2(m.maxHp > 0 ? Math.max(0, m.hp) / m.maxHp : 0),
                               m.noeud ? 1 : 0]),
      // le dernier emplacement est la part de vie qui reste : sans elle un bonus
      // disparait sans preavis, et le client ne peut pas la deduire — la vue
      // filtre, donc une horloge locale demarrerait a l'entree dans le champ
      w: filtrer(this.powerups, () => CFG.POWERUP_RADIUS,
        w => [w.id, r1(w.x), r1(w.y), w.type, r2(w.life / w.max)]),
      hv: this.harvests.map(h => [h.id, r1(h.x), r1(h.y), h.kind,
        r2(h.kind === 0 ? h.hp / h.maxHp : h.prog)]),
      tu: this.turrets.map(t => [t.id, r1(t.x), r1(t.y), r2(t.life / CFG.TURRET_LIFE), r2(t.ang)]),
      bw: this.bulwarks.map(b => [b.id, r1(b.x), r1(b.y), Math.round(b.r), r2(b.life / b.max)]),
      an: this.anchors.map(a => [a.id, r1(a.x), r1(a.y), Math.round(a.r),
                                 r2(a.life / a.max), a.vuln ? 1 : 0]),
      sa: this.sancts.map(s => [s.id, r1(s.x), r1(s.y), Math.round(s.r),
                                r2(s.life / s.max)]),
      bm: this.bombs.map(b => [b.id, r1(b.x), r1(b.y), r2(b.t / b.max), r1(b.tx), r1(b.ty)]),
      dr: this.drones.filter(d => d.dead <= 0)
        .map(d => [d.id, r1(d.x), r1(d.y), r2(d.ang), d.kind, d.owner]),
      // un arc (ricochet, salve) porte un SECOND point : son rayon utile couvre
      // les deux bouts, sinon on jette un trait dont l'autre extremite se voit.
      f: filtrer(this.effects,
        f => f.x2 === undefined ? (f.r ?? 0)
          : Math.max(f.r ?? 0, Math.hypot(f.x2 - f.x, f.y2 - f.y)),
        /* LE RANG D UN ARC N ETAIT PAS ENVOYE. Le tuple d arc s arretait a `y2`,
           donc `f.n` valait TOUJOURS zero cote client et la branche « amorce »
           de `drawEffects` — le trait epais et droit qu on a vise, contre les
           arcs agites qu il declenche — n a jamais ete tracee une seule fois.
           Il porte maintenant le rang du saut : 1 pour l amorce, puis 2, 3, 4 a
           mesure que la decharge perd 30 % par rebond. */
        f => f.kind === 3 || f.kind === 13
        ? [f.id, r1(f.x), r1(f.y), Math.round(f.r ?? 0), r2(f.life / f.max), f.kind,
           r1(f.x2), r1(f.y2), f.n ?? 0]
        /* L'INDEX 7 PORTAIT UN ZERO LITTERAL, et le balayage de la lame posait
           un `ang` que personne n'envoyait : le client lisait `f.ang ?? 0` et
           dessinait donc TOUJOURS vers l'est, quelle que soit la visee. L'arme
           la plus courte du jeu n'avait aucun canal disant OU elle frappe, et
           rien ne le signalait — c'est exactement ce que `??` fait taire.
           Meme emplacement, deux lectures, comme l'index 6 : `y2` pour un arc,
           l'angle pour tout le reste. Aucun octet de plus. */
        : trimTail([f.id, r1(f.x), r1(f.y), Math.round(f.r), r2(f.life / f.max), f.kind ?? 0,
                    f.owner ?? 0, r2(f.ang ?? 0), f.n ?? 0], 6)),
      sl: this.slow > 0 ? 1 : 0,
      df: this.diffIndex,
      // LE PREAVIS SE FILTRE PAR VUE comme tout le reste, et il ne l'etait pas.
      // Tant que seule la ruee y figurait, la liste globale tenait dans une
      // trentaine d'identifiants ; avec la visee elle en porte le double, et
      // les envoyer tous a chaque client lui decrit surtout ce qu'il ne voit
      // pas. La liste porte donc les CORPS et non leurs identifiants — un
      // identifiant ne sait pas ou il est.
      wu: wuVus.length > 0 ? wuVus : null,
      ev: this.event ? [this.event.id, r1(Math.max(0, this.event.t))] : null,
      sg: [this.segment, r1(Math.max(0, TL_CFG.SEGMENT_TIME - this.hordeTime)),
           this.beat],
      xl: this.level,
      xp: this.level >= CFG.LEVEL_MAX
        ? 1
        : r2(Math.min(1, (this.xp - this.levelFrom) / Math.max(1, this.levelAt - this.levelFrom))),
      bo: this.boss
        ? [this.boss.id, r1(this.boss.x), r1(this.boss.y),
           Math.round(this.boss.hp), Math.round(this.boss.maxHp),
           r2(this.boss.ang), this.bossCount,
           this.boss.bars, this.boss.phase,
           this.boss.kind, r2(this.boss.ult),
           this.boss.enrage ?? 0,
           r2(this.boss.palier ?? 0),
           // le regard est la seule mecanique dont la reponse n'est pas
           // spatiale : aucun telegraphe au sol ne peut l'exprimer, donc son
           // decompte doit traverser. Deux nombres, en fin de tuple.
           r2(Math.max(0, this.boss.gazeWarn ?? 0)),
           r2(Math.max(0, this.boss.gaze ?? 0)),
           /* LES DEUX MEMES ETATS QUE LA HORDE, ET DANS LES MEMES UNITES. Le
              boss brulait et devenait vulnerable depuis toujours sans que rien
              ne le dise — un boss qui encaisse +25 % pendant quatre secondes est
              precisement le moment ou l equipe doit tout donner.
              Sur `bo` et non sur `bo2` : `_damage` redirige le jumeau vers le
              boss avant de lire l etat, donc les deux corps partagent celui-ci
              comme ils partagent la barre. */
           r2(this.boss.burn ? this.boss.burn.t / CARD_CFG.BURN_TIME : 0),
           r1(Math.max(0, (this.boss.vulnUntil ?? 0) - this.time))]
        : null,
      bo2: this.boss2
        ? trimTail([this.boss2.id, r1(this.boss2.x), r1(this.boss2.y), r2(this.boss2.ang),
                    this._twinFocus(this.boss) ? this.boss.focus : 0,
                    this._twinFocus(this.boss2) ? this.boss2.focus : 0], 4)
        : null,
      bd: this.boss && this.bossDmg.size > 0
        ? [...this.bossDmg].map(([id, c]) =>
            [id, Math.round(c.d), Math.round(c.crit), r1(c.x), r1(c.y)])
        : null,
      hl: this._linkPayload(),
      sp: this.slipT > 0 ? 1 : 0,
      bn: this.bounds.x0 > 0 || this.bounds.y0 > 0
          || this.bounds.x1 < CFG.ARENA_W || this.bounds.y1 < CFG.ARENA_H || this.shrink
        ? [r1(this.bounds.x0), r1(this.bounds.y0), r1(this.bounds.x1), r1(this.bounds.y1),
           this.shrink ? r1(this.shrink.x0) : 0, this.shrink ? r1(this.shrink.y0) : 0,
           this.shrink ? r1(this.shrink.x1) : 0, this.shrink ? r1(this.shrink.y1) : 0,
           this.shrink ? r2(this.shrink.t) : 0]
        : null,
      wl: this.walls
        ? [r1(this.walls.x), r1(this.walls.y), BOSS_CFG.QUAD_THICK,
           r2(this.walls.t / this.walls.max)]
        : null,
      ob: this._coverState(),
    };
  }
}

const chrono = () => globalThis.performance?.now?.() ?? Date.now();

function botInput(g, p) {
  let cible = null, bd = Infinity;
  for (const e of g.enemies) {
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d < bd) { bd = d; cible = e; }
  }
  if (!cible && g.boss) { cible = g.boss; bd = (g.boss.x - p.x) ** 2 + (g.boss.y - p.y) ** 2; }

  let ax = 1, ay = 0;
  if (cible) {
    const d = Math.hypot(cible.x - p.x, cible.y - p.y) || 1;
    ax = (cible.x - p.x) / d; ay = (cible.y - p.y) / d;
  }

  const b = g.bounds;
  let x = 0, y = 0;
  if (cible && bd < 260 * 260) { x = -ax; y = -ay; }
  else {
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const d = Math.hypot(cx - p.x, cy - p.y);
    if (d > 60) { x = (cx - p.x) / d; y = (cy - p.y) / d; }
  }
  // `ar` est la DISTANCE au reticule : `1` etait sans effet tant que
  // `bombRange` le remontait a 80, il est faux depuis que `porteeReticule` le
  // prend au mot — une grenade detonait au pied du bot
  const ar = cible ? Math.sqrt(bd) : SKILL_CFG.DPS_BOMB_RANGE_MAX;
  return { x, y, ax, ay, ar, dash: false, s1: false, s2: false, s3: false };
}

export function mesurePopulation(diffIndex, joueurs, minutes = 30, invulnerable = true) {
  const g = new GameState(diffIndex);
  for (let i = 1; i <= joueurs; i++) g.addPlayer(i, `bot${i}`, i - 1, i % CLASSES.length);
  g.warmup = 0;

  const cap = enemyCap(diffIndex, joueurs);
  const inputs = new Map();
  const images = Math.round(minutes * 60 / CFG.TICK);
  const somme = new Array(TL_CFG.SEGMENTS).fill(0);
  const compte = new Array(TL_CFG.SEGMENTS).fill(0);
  const ms = [];
  let saturation = null, pointe = 0, tempsPlein = 0;

  for (let k = 0; k < images && !g.gameOver && !g.victory; k++) {
    if (g.cardsPending) {
      for (const [id, offres] of g.cardOffers) {
        const p = g.players.get(id);
        if (p && offres.length) g.takeCard(p, offres[0]);
      }
      g.cardsPending = false;
      g.openNextScreen();
      k--;
      continue;
    }
    if (g.relicPending) {
      g.closeMerchant();
      g.openNextScreen();
      k--;
      continue;
    }

    inputs.clear();
    for (const p of g.players.values()) inputs.set(p.id, botInput(g, p));

    const t0 = chrono();
    g.step(CFG.TICK, inputs);
    ms.push(chrono() - t0);

    if (invulnerable) {
      for (const p of g.players.values()) {
        p.hp = p.maxHp;
        p.downed = false;
        p.revive = 0;
      }
      if (!g.victory) g.gameOver = false;
    }

    const n = g.enemies.length;
    if (n > pointe) pointe = n;
    if (n >= cap) {
      tempsPlein += CFG.TICK;
      if (saturation === null) saturation = g.time;
    }
    const s = Math.min(TL_CFG.SEGMENTS, g.segment) - 1;
    somme[s] += n; compte[s]++;
  }

  ms.sort((a, b) => a - b);
  let tues = 0;
  for (const p of g.players.values()) tues += p.kills;
  return {
    diffIndex, joueurs, cap,
    saturation, pointe, tempsPlein,
    parSegment: somme.map((v, i) => (compte[i] ? v / compte[i] : 0)),
    niveau: g.level, segment: g.segment, tues, duree: g.time,
    msMedian: ms.length ? ms[Math.floor(ms.length / 2)] : 0,
    msP99: ms.length ? ms[Math.floor(ms.length * 0.99)] : 0,
    msMax: ms.length ? ms[ms.length - 1] : 0,
  };
}

export const SPEED_DOCTRINE = 0.90;
export const SPEED_SPREAD_MIN = 3.5;

// D14 (b) : la doctrine se mesure contre la classe MEDIANE, pas la plus lente. Le
// Rempart n'est donc pas couvert, et cette exception s'ecrit — une garantie qui a
// une exception non ecrite est une garantie fausse. Deduite de `CLASSES` et non
// egale a `CFG.PLAYER_SPEED` : un `speedMul` qui bouge doit deplacer le plafond.
export function vitesseClasseMediane() {
  return mediane(CLASSES.map(c => CFG.PLAYER_SPEED * c.speedMul));
}

export function verifierVitesses(minutes = 30, roll = 1.1) {
  const soucis = [];
  const plafond = vitesseClasseMediane() * SPEED_DOCTRINE;

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    let pire = 0, pireOu = "";
    for (const ti of typesFor(di)) {
      const v = enemySpeed(ti, minutes, di, roll);
      if (v > pire) { pire = v; pireOu = ENEMY_TYPES[ti].key; }
    }
    if (pire > plafond) {
      soucis.push(`${DIFFICULTIES[di].key} : ${pireOu} a ${pire.toFixed(0)} px/s`
        + ` a la minute ${minutes}, plafond ${plafond.toFixed(0)}`);
    }

    const vues = typesFor(di).map(ti => enemySpeed(ti, minutes, di, 1));
    const spread = Math.max(...vues) / Math.min(...vues);
    if (spread < SPEED_SPREAD_MIN) {
      soucis.push(`${DIFFICULTIES[di].key} : rapport lent/rapide a ${spread.toFixed(2)}x`
        + ` a la minute ${minutes}, plancher ${SPEED_SPREAD_MIN}x`);
    }
  }
  return soucis;
}

export function mesureEncerclement(diffIndex, joueurs, distance = 600, limite = 40) {
  const g = new GameState(diffIndex);
  for (let i = 1; i <= joueurs; i++) g.addPlayer(i, `bot${i}`, i - 1, i % CLASSES.length);
  g.warmup = 0;
  g.segment = TL_CFG.SEGMENTS;
  g.hordeTime = 3 * TL_CFG.BEAT_TIME;
  g._biomeObstacles = [];
  g._biomeHazards = [];

  const meneur = [...g.players.values()][0];
  const rayon = distance * 0.75;
  const cap = enemyCap(diffIndex, joueurs);
  while (g.enemies.length < cap) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * rayon;
    if (!g._spawnEnemy(-1, meneur.x + Math.cos(a) * d, meneur.y + Math.sin(a) * d)) break;
  }

  const inputs = new Map();
  const x0 = meneur.x, y0 = meneur.y;
  const vers = { x: x0 < CFG.ARENA_W / 2 ? 1 : -1, y: 0 };
  for (const p of g.players.values()) {
    inputs.set(p.id, { x: vers.x, y: vers.y, ax: vers.x, ay: vers.y, ar: 1, dash: false });
  }

  for (let k = 0; k < limite / CFG.TICK; k++) {
    g.step(CFG.TICK, inputs);
    for (const p of g.players.values()) {
      p.hp = p.maxHp; p.downed = false; p.fireCd = 999;
    }
    g.gameOver = false;
    if (Math.hypot(meneur.x - x0, meneur.y - y0) >= distance) {
      return { cap, corps: g.enemies.length, t: (k + 1) * CFG.TICK };
    }
  }
  return { cap, corps: g.enemies.length, t: null };
}

/* LES DIX SITUATIONS DE NAVIGATION, en dur. Ce ne sont pas des lieux du jeu :
   ce sont les FORMES qui cassent un evitement local — la cloison mince, la
   poche, le goulet, l'interstice trop etroit pour un corps. Un lieu du depot
   qui en contiendrait une nouvelle se retrouverait ici, pas dans un reglage.

   `t` est le point de depart de la cible, `e` celui du corps, `mur` la liste
   des boites. `libre` est la longueur du chemin qu'un humain prendrait : c'est
   elle qui borne le temps, pas une constante. */
const NAV_CAS = [
  { key: "direct", mur: [], t: [2400, 1150], e: [2400, 1650], libre: 500 },
  { key: "cloison mince", t: [2400, 1150], e: [2400, 1650], libre: 900,
    mur: [{ x: 2400, y: 1400, w: 600, h: 32 }] },
  { key: "mur long", t: [2400, 1150], e: [2400, 1650], libre: 1600,
    mur: [{ x: 2400, y: 1400, w: 1400, h: 40 }] },
  { key: "poche en U", t: [2400, 1780], e: [2400, 1300], libre: 1200,
    mur: [{ x: 2200, y: 1400, w: 40, h: 400 },
          { x: 2600, y: 1400, w: 40, h: 400 },
          { x: 2400, y: 1620, w: 440, h: 40 }] },
  { key: "couloir etroit", t: [2000, 1350], e: [3200, 1350], libre: 2300,
    mur: [{ x: 2400, y: 1000, w: 1200, h: 60 },
          { x: 2400, y: 1700, w: 1200, h: 60 },
          { x: 2900, y: 1350, w: 60, h: 640 }] },
  { key: "deux boites proches", t: [2400, 1150], e: [2400, 1650], libre: 900,
    mur: [{ x: 2300, y: 1400, w: 300, h: 60 },
          { x: 2660, y: 1400, w: 300, h: 60 }] },
  // UN PASSAGE DE 200 px, ET IL EN FAUT UN VRAI : deux boites qui se touchent
  // au milieu ne sont pas un goulet, c'est un mur de 1 400, et la mesure disait
  // « bloque » ce qui etait seulement LENT.
  { key: "goulet", t: [2400, 1100], e: [2400, 1700], libre: 800,
    mur: [{ x: 1900, y: 1400, w: 800, h: 60 },
          { x: 2900, y: 1400, w: 800, h: 60 }] },
];

// LA FENETRE SE DERIVE DU PLUS LENT DU ROSTER, jamais d'une constante : un
// colosse a 44 px/s met deux fois plus de temps qu'un fantassin sur le meme
// detour, et une fenetre taillee pour le fantassin compte le colosse comme
// bloque alors qu'il marche encore.
function vitesseLente() {
  let v = Infinity;
  for (const t of ENEMY_TYPES) if (t.speed < v) v = t.speed;
  return v;
}
const fenetreDe = libre => Math.min(90, Math.max(30, (libre / vitesseLente()) * 2.2 + 8));

/* Une passe : on plante `n` corps face a la cible et on regarde s'ils
   PROGRESSENT. Le spawner est mis en sommeil sur l'instance — on mesure une
   geometrie, pas un script. */
export function mesureDeplacement(cas, { n = 1, joueurs = 1, secondes = 0,
                                         diffIndex = DIFF_NORMAL,
                                         mobile = false, tue = false } = {}) {
  if (secondes <= 0) secondes = fenetreDe(cas.libre);
  const g = new GameState(diffIndex, 0, 7);
  g._spawner = () => {};
  g.warmup = 0;
  // L'HORLOGE EST AVANCEE POUR QUE LE ROSTER SOIT OUVERT : sans elle, `adaptType`
  // replie tout sur le fantassin et les sept situations ne testent qu'un seul
  // corps. On veut le colosse dans le goulet, c'est tout l'interet.
  g.segment = 5;
  g.hordeTime = 200;
  g._biomeObstacles = cas.mur.map(o => ({ ...o, maxHp: 0, hp: 0 }));
  g._biomeHazards = [];
  g._statG = null;
  g._navG = null;

  for (let i = 1; i <= joueurs; i++) g.addPlayer(i, `bot${i}`, i - 1, (i - 1) % CLASSES.length);
  const ps = [...g.players.values()];
  ps.forEach((p, i) => {
    p.x = cas.t[0] + (i % 2 ? 70 : -70) * (i > 1 ? 1 : 0);
    p.y = cas.t[1] + (i > 1 ? 70 : 0);
  });

  const corps = [];
  for (let i = 0; i < n; i++) {
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    const ray = n === 1 ? 0 : 40 + (i % 7) * 26;
    const e = g._spawnEnemy(i % 5, cas.e[0] + Math.cos(a) * ray,
      cas.e[1] + Math.sin(a) * ray, false);
    if (e) corps.push(e);
  }

  const suivi = new Map();
  for (const e of corps) {
    suivi.set(e.id, { d0: Math.hypot(e.x - ps[0].x, e.y - ps[0].y), dmin: Infinity });
  }

  const inputs = new Map();
  const images = Math.round(secondes / CFG.TICK);
  let msTotal = 0, tArrivee = null;
  for (let k = 0; k < images; k++) {
    const vx = mobile ? Math.cos(k * CFG.TICK * 0.7) : 0;
    const vy = mobile ? Math.sin(k * CFG.TICK * 0.7) : 0;
    for (const p of ps) inputs.set(p.id, { x: vx, y: vy, ax: 1, ay: 0, ar: 1, dash: false });
    const t0 = chrono();
    g.step(CFG.TICK, inputs);
    msTotal += chrono() - t0;
    for (const p of g.players.values()) { p.hp = p.maxHp; p.downed = false; p.fireCd = 999; }
    g.gameOver = false;
    // LA CIBLE QUI DISPARAIT est le neuvieme cas : les corps doivent se
    // reporter sur le joueur restant sans rester plantes sur un fantome.
    if (tue && ps.length > 1 && k === Math.round(images * 0.4)) g.removePlayer(ps[0].id);
    for (const e of g.enemies) {
      const s = suivi.get(e.id);
      if (!s) continue;
      const t = g._nearestPlayer(e.x, e.y);
      if (!t) continue;
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d < s.dmin) s.dmin = d;
      if (tArrivee === null && d < 40) tArrivee = (k + 1) * CFG.TICK;
    }
  }

  let bloques = 0;
  for (const [, s] of suivi) if (s.dmin > Math.max(120, s.d0 * 0.5)) bloques++;
  return {
    corps: suivi.size, bloques, tArrivee, secondes: Math.round(secondes),
    ms: msTotal / images,
    vivants: g.enemies.length,
  };
}

export function verifierDeplacement(effectifs = [1, 4], budgetMs = 16) {
  const soucis = [];
  const vitesse = ENEMY_TYPES[0].speed;

  for (const cas of NAV_CAS) {
    for (const n of effectifs) {
      const r = mesureDeplacement(cas, { n, joueurs: 1 });
      const ou = `${cas.key}/${n} corps`;
      if (r.bloques > 0) soucis.push(`${ou} : ${r.bloques}/${r.corps} n'ont jamais approche`);
      // LE TEMPS SE BORNE SUR LA LONGUEUR DU CHEMIN, jamais sur une constante :
      // un mur de 1 400 px se contourne en 1 600 px de marche, pas en 500. Le
      // premier contact est celui du plus RAPIDE, donc il se juge sur sa vitesse.
      const plafond = (cas.libre / vitesse) * 2.5 + 3;
      if (r.tArrivee === null) soucis.push(`${ou} : aucun contact en ${r.secondes} s`);
      else if (r.tArrivee > plafond) {
        soucis.push(`${ou} : premier contact a ${r.tArrivee.toFixed(1)} s`
          + ` pour un plafond de ${plafond.toFixed(1)} s`);
      }
    }
  }

  const foule = NAV_CAS.find(c => c.key === "goulet");
  for (const n of [50, 100, 150, 200]) {
    const r = mesureDeplacement(foule, { n, joueurs: 1 });
    if (r.bloques > r.corps * 0.05) {
      soucis.push(`goulet/${n} corps : ${r.bloques} bloques (plafond 5 %)`);
    }
    if (r.ms > budgetMs) soucis.push(`goulet/${n} corps : ${r.ms.toFixed(1)} ms par pas`);
  }

  for (const [key, opts] of [
    ["cible mobile", { n: 60, joueurs: 1, mobile: true }],
    ["quatre cibles", { n: 60, joueurs: 4 }],
    ["cible qui meurt", { n: 60, joueurs: 2, tue: true }],
  ]) {
    const r = mesureDeplacement(NAV_CAS[3], opts);
    if (r.bloques > r.corps * 0.05) {
      soucis.push(`poche en U / ${key} : ${r.bloques}/${r.corps} bloques`);
    }
  }

  // La couverture qui cede OUVRE un passage : la grille doit le voir.
  {
    const g = new GameState(DIFF_NORMAL, 0, 7);
    g._spawner = () => {};
    g.warmup = 0;
    g._biomeObstacles = [
      { x: 2050, y: 1400, w: 700, h: 60, maxHp: 0, hp: 0 },
      { x: 2750, y: 1400, w: 700, h: 60, maxHp: 0, hp: 0 },
      { x: 2400, y: 1400, w: 100, h: 60, maxHp: 100, hp: 100 },
    ];
    g._statG = null; g._navG = null;
    g.addPlayer(1, "bot", 0, 0);
    const p = g.players.get(1);
    p.x = 2400; p.y = 1150;
    const e = g._spawnEnemy(0, 2400, 1650, false);
    const inputs = new Map([[1, { x: 0, y: 0, ax: 1, ay: 0, ar: 1, dash: false }]]);
    for (let k = 0; k < 6 / CFG.TICK; k++) {
      g.step(CFG.TICK, inputs);
      p.hp = p.maxHp; p.fireCd = 999; g.gameOver = false;
    }
    const avant = Math.hypot(e.x - p.x, e.y - p.y);
    g._obstacleHit(2400, 1400, 200);
    // LA FENETRE SE DERIVE, ELLE AUSSI. A douze secondes en dur, le verdict
    // dependait du tirage de vitesse de `_spawnEnemy` (±10 %) : le meme test
    // etait muet seul et bavard apres d'autres verificateurs, selon l'etat du
    // generateur global. Un critere qui change de reponse sans que le jeu
    // change n'est pas un critere.
    for (let k = 0; k < fenetreDe(avant + 200) / CFG.TICK; k++) {
      g.step(CFG.TICK, inputs);
      p.hp = p.maxHp; p.fireCd = 999; g.gameOver = false;
    }
    const apres = Math.hypot(e.x - p.x, e.y - p.y);
    if (apres > 60) {
      soucis.push(`couverture detruite : le corps reste a ${apres.toFixed(0)} px`
        + ` (${avant.toFixed(0)} px avant la breche)`);
    }
  }

  for (let b = 0; b < BIOMES.length; b++) {
    const g = new GameState(DIFF_NORMAL, b, 7);
    for (const s of verifierNavigation(g.obstacles, CFG.ARENA_W, CFG.ARENA_H)) {
      soucis.push(`${BIOMES[b].key} : ${s}`);
    }
  }

  return soucis;
}

export function verifierEncerclement(effectifs = [1, 2, 4], marge = 3) {
  const soucis = [];
  const libre = 600 / CFG.PLAYER_SPEED;
  for (let di = 0; di < DIFFICULTIES.length; di++) {
    for (const n of effectifs) {
      const r = mesureEncerclement(di, n);
      const ou = `${DIFFICULTIES[di].key}/${n}j`;
      if (r.t === null) soucis.push(`${ou} : pas de sortie en 40 s, ${r.corps} corps`);
      else if (r.t > libre * marge) {
        soucis.push(`${ou} : sortie en ${r.t.toFixed(1)} s contre ${libre.toFixed(1)} s a vide`
          + ` (${(r.t / libre).toFixed(1)}x, plafond ${marge}x)`);
      }
    }
  }
  return soucis;
}

export function verifierPopulation(minutes = 45, effectifs = [1, 2, 4], budgetMs = 16) {
  const soucis = [];
  const niveaux = new Map();

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    for (const n of effectifs) {
      const r = mesurePopulation(di, n, minutes);
      const ou = `${DIFFICULTIES[di].key}/${n}j`;
      niveaux.set(ou, r);

      if (r.saturation !== null && r.saturation < 12 * 60) {
        soucis.push(`${ou} : plafond atteint a ${(r.saturation / 60).toFixed(1)} min`);
      }
      for (let s = 1; s < r.parSegment.length; s++) {
        if (r.parSegment[s] > 0 && r.parSegment[s] < r.parSegment[s - 1]) {
          soucis.push(`${ou} : population en baisse au segment ${s + 1}`
            + ` (${r.parSegment[s - 1].toFixed(0)} -> ${r.parSegment[s].toFixed(0)})`);
        }
      }
      if (r.msP99 > budgetMs) {
        soucis.push(`${ou} : ${r.msP99.toFixed(1)} ms au p99 pour un budget de ${budgetMs}`);
      }
    }
  }

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    const vus = effectifs
      .map(n => niveaux.get(`${DIFFICULTIES[di].key}/${n}j`))
      .filter(Boolean)
      .map(r => r.niveau);
    if (vus.length > 1 && Math.max(...vus) - Math.min(...vus) > 2) {
      soucis.push(`${DIFFICULTIES[di].key} : ${Math.min(...vus)} a ${Math.max(...vus)}`
        + ` cartes selon l'effectif`);
    }
  }

  return soucis;
}

const SOL_COLS = 80, SOL_ROWS = 45;
const SOL_MASQUE = new Uint8Array(SOL_COLS * SOL_ROWS);

export function mesureTraits(diffIndex, joueurs, minutes = 37, pas = 10) {
  const g = new GameState(diffIndex);
  for (let i = 1; i <= joueurs; i++) g.addPlayer(i, `bot${i}`, i - 1, i % CLASSES.length);
  g.warmup = 0;

  const inputs = new Map();
  const images = Math.round(minutes * 60 / CFG.TICK);
  const porteurs = new Array(minutes).fill(0);
  const corps = new Array(minutes).fill(0);
  const vies = new Map();
  const demiW = CFG.VIEW_W / 2, demiH = CFG.VIEW_H / 2;
  const plafond = trailMax(CFG.VIEW_W * CFG.VIEW_H);
  let elites = 0, somme = 0, pleins = 0, mesures = 0, bits = 0;
  let wuMax = 0, wuVueMax = 0, porteeMax = 0, poses = 0, perimes = 0, ramasses = 0;
  let couverture = 0, couvertureMax = 0, vues = 0, sol = 0;
  const elitesVus = new Set();

  for (let k = 0; k < images && !g.gameOver && !g.victory; k++) {
    if (g.cardsPending) {
      for (const [id, offres] of g.cardOffers) {
        const p = g.players.get(id);
        if (p && offres.length) g.takeCard(p, offres[0]);
      }
      g.cardsPending = false;
      g.openNextScreen();
      k--;
      continue;
    }
    if (g.relicPending) {
      g.closeMerchant();
      g.openNextScreen();
      k--;
      continue;
    }

    inputs.clear();
    for (const p of g.players.values()) inputs.set(p.id, botInput(g, p));
    g.step(CFG.TICK, inputs);
    for (const p of g.players.values()) {
      p.hp = p.maxHp; p.downed = false; p.revive = 0;
    }
    if (!g.victory) g.gameOver = false;

    const vus = new Set();
    for (const w of g.powerups) {
      vus.add(w.id);
      if (!vies.has(w.id)) poses++;
      vies.set(w.id, w.life);
    }
    for (const [id, vie] of vies) {
      if (vus.has(id)) continue;
      if (vie <= CFG.TICK) perimes++; else ramasses++;
      vies.delete(id);
    }

    if (k % pas) continue;
    mesures++;
    const min = Math.min(minutes - 1, Math.floor(g.time / 60));
    let wu = 0;
    for (const e of g.enemies) {
      corps[min]++;
      if (e.traits) { porteurs[min]++; bits += popcount(e.traits); }
      if (e.elite) { elites++; elitesVus.add(e.id); }
      if (e.dashWarn > 0) wu++;
    }
    if (wu > wuMax) wuMax = wu;
    for (const p of g.players.values()) {
      let vue = 0, portee = 0;
      for (const e of g.enemies) {
        if (e.dashWarn > 0 && Math.abs(e.x - p.x) <= demiW && Math.abs(e.y - p.y) <= demiH) vue++;
        if (hasTrait(e.traits, TRAIT_DASH)
          && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < TRAIT_CFG.DASH_RANGE ** 2) portee++;
      }
      if (vue > wuVueMax) wuVueMax = vue;
      if (portee > porteeMax) porteeMax = portee;
    }
    let zh = 0;
    for (const z of g.zones) if (z.sol === SOL_HORDE) zh++;
    if (zh >= plafond) pleins++;
    somme += zh;

    // LA COUVERTURE SE RASTERISE, elle ne s'additionne pas. La somme des aires
    // comptait le disque ENTIER d'une zone a moitie hors champ, et comptait DEUX
    // FOIS ce que deux zones recouvrent ensemble : elle rendait « 120 % d'une
    // vue », un chiffre impossible qui accusait le jeu d'un defaut de la mesure.
    // Une grille grossiere clippe et deduplique d'un coup.
    for (const p of g.players.values()) {
      SOL_MASQUE.fill(0);
      const cw = CFG.VIEW_W / SOL_COLS, ch = CFG.VIEW_H / SOL_ROWS;
      const vx = p.x - demiW, vy = p.y - demiH;
      for (const z of g.zones) {
        if (z.sol !== SOL_HORDE) continue;
        const c0 = Math.max(0, Math.floor((z.x - z.r - vx) / cw));
        const c1 = Math.min(SOL_COLS - 1, Math.floor((z.x + z.r - vx) / cw));
        const r0 = Math.max(0, Math.floor((z.y - z.r - vy) / ch));
        const r1 = Math.min(SOL_ROWS - 1, Math.floor((z.y + z.r - vy) / ch));
        for (let ry = r0; ry <= r1; ry++) {
          const py = vy + (ry + 0.5) * ch;
          for (let rx = c0; rx <= c1; rx++) {
            const px = vx + (rx + 0.5) * cw;
            if ((px - z.x) ** 2 + (py - z.y) ** 2 <= z.r * z.r) SOL_MASQUE[ry * SOL_COLS + rx] = 1;
          }
        }
      }
      let pris = 0;
      for (let i = 0; i < SOL_MASQUE.length; i++) pris += SOL_MASQUE[i];
      const part = pris / SOL_MASQUE.length;
      couverture += part;
      if (part > couvertureMax) couvertureMax = part;
    }
    vues += g.players.size;
    sol += g.powerups.length;
  }

  const total = corps.reduce((a, b) => a + b, 0);
  return {
    diffIndex, joueurs, plafond,
    part: total ? porteurs.reduce((a, b) => a + b, 0) / total : 0,
    traitsMoyens: total ? bits / total : 0,
    parMinute: corps.map((n, i) => (n ? porteurs[i] / n : 0)),
    partElite: total ? elites / total : 0,
    elitesVus: elitesVus.size,
    bonusSol: mesures ? sol / mesures : 0,
    trailMoyen: mesures ? somme / mesures : 0,
    trailPlein: mesures ? pleins / mesures : 0,
    couverture: vues ? couverture / vues : 0,
    couvertureMax,
    wuMax, wuVueMax, porteeMax,
    poses, ramasses, perimes,
    niveau: g.level, segment: g.segment, duree: g.time,
  };
}

function popcount(n) {
  let c = 0;
  for (let m = n; m; m &= m - 1) c++;
  return c;
}

export const TRAIT_SAT_MAX = 0.5;

export function verifierTraits(effectifs = [1, 2, 4], minutes = 37) {
  const soucis = [];
  const portage = [];

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    let pire = 0;
    for (const n of effectifs) {
      const r = mesureTraits(di, n, minutes);
      const ou = `${DIFFICULTIES[di].key}/${n}j`;
      if (r.traitsMoyens > pire) pire = r.traitsMoyens;

      if (r.trailPlein > TRAIT_SAT_MAX) {
        soucis.push(`${ou} : plafond de trainee sature ${(r.trailPlein * 100).toFixed(0)} %`
          + ` du temps — ce n'est plus un plafond, c'est une constante`);
      }
      // le budget se pose a l'octroi : un joueur qui avance peut decouvrir un preavis de plus
      if (r.wuVueMax > ATK_CFG.VUE_MAX) {
        soucis.push(`${ou} : ${r.wuVueMax} preavis simultanes a l'ecran`
          + ` pour un budget de ${ATK_CFG.VUE_MAX}`);
      }
      if (r.couvertureMax > TRAIT_CFG.TRAIL_SURFACE * 1.1) {
        soucis.push(`${ou} : le sol de horde couvre ${(r.couvertureMax * 100).toFixed(0)} %`
          + ` d'une vue pour un budget de ${(TRAIT_CFG.TRAIL_SURFACE * 100).toFixed(0)} %`);
      }
    }
    portage.push(pire);
  }

  for (let di = 1; di < portage.length; di++) {
    if (portage[di] <= portage[di - 1]) {
      soucis.push(`${DIFFICULTIES[di].key} : ${portage[di].toFixed(2)} trait par corps`
        + ` contre ${portage[di - 1].toFixed(2)} en ${DIFFICULTIES[di - 1].key}`
        + ` — le levier du comportement ne monte pas avec le mode`);
    }
  }
  return soucis;
}

export function mesureComposition(diffIndex, classes, minutes = 12) {
  const g = new GameState(diffIndex);
  classes.forEach((cls, i) => g.addPlayer(i + 1, `bot${i + 1}`, i, cls));
  g.warmup = 0;

  const inputs = new Map();
  const images = Math.round(minutes * 60 / CFG.TICK);

  for (let k = 0; k < images && !g.victory; k++) {
    if (g.cardsPending) {
      for (const [id, offres] of g.cardOffers) {
        const p = g.players.get(id);
        if (p && offres.length) g.takeCard(p, offres[0]);
      }
      g.cardsPending = false;
      g.openNextScreen();
      k--;
      continue;
    }
    if (g.relicPending) {
      g.closeMerchant();
      g.openNextScreen();
      k--;
      continue;
    }

    inputs.clear();
    for (const p of g.players.values()) inputs.set(p.id, botInput(g, p));
    g.step(CFG.TICK, inputs);
    for (const p of g.players.values()) {
      p.hp = p.maxHp; p.downed = false; p.revive = 0;
    }
    g.gameOver = false;
  }

  let subis = 0;
  for (const p of g.players.values()) {
    for (const v of p.hurtBy) subis += v;
  }
  return {
    subis: subis / (classes.length * Math.max(1, g.time / 60)),
    niveau: g.level, duree: g.time,
  };
}

function mediane(xs) {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const i = t.length >> 1;
  return t.length % 2 ? t[i] : (t[i - 1] + t[i]) / 2;
}

export const TTK_MIN = 0.15;
export const TTK_MAX = 0.60;
export const BOSS_FIGHT_MIN = 50;
export const BOSS_FIGHT_MAX = 90;

export const LEVEL_MARKS = [[8, 10], [20, 20], [32, 27]];
export const LEVEL_MARK_TOL = 1;
export const CARD_SD_MAX = 3;
export const CADENCE_TOL = 0.9;

export function gruntHp(diffIndex, minute) {
  return (CFG.ENEMY_HP_BASE + minute * CFG.ENEMY_HP_MIN_RAMP)
    * DIFFICULTIES[diffIndex].hp * ENEMY_TYPES[0].hpMul;
}

// `powerIndex` EST le multiplicateur de dps : le dps nu est une cadence de base.
export function ttk(diffIndex, minute, puissance) {
  const dps = (CFG.BULLET_DAMAGE / CFG.FIRE_INTERVAL) * puissance;
  return gruntHp(diffIndex, minute) / dps;
}

// `botInput` visait le corps le plus proche, donc les renforts et jamais le boss :
// un combat de boss ne se terminait pas. Fonction locale pour ne pas deplacer les
// mesures des lots precedents.
function botVersBoss(g, p) {
  const i = botInput(g, p);
  const b = g.boss;
  if (!b) return i;
  const d = Math.hypot(b.x - p.x, b.y - p.y) || 1;
  i.ax = (b.x - p.x) / d;
  i.ay = (b.y - p.y) / d;
  return i;
}

export function mesureTTK(diffIndex, joueurs, jalons = [1, 10, 20, 30], minutes = 42,
  acheteur = null) {
  const g = new GameState(diffIndex);
  for (let i = 1; i <= joueurs; i++) g.addPlayer(i, `bot${i}`, i - 1, i % CLASSES.length);
  g.warmup = 0;

  const puissance = () => mediane([...g.players.values()].map(p => g._playerPower(p)));
  const inputs = new Map();
  const images = Math.round(minutes * 60 / CFG.TICK);
  const releves = new Map();
  const combats = [];
  const niveaux = new Map();
  const attente = jalons.slice();
  const attenteN = LEVEL_MARKS.map(m => m[0]);
  let vu = null;

  for (let k = 0; k < images && !g.victory; k++) {
    if (g.cardsPending) {
      for (const [id, offres] of g.cardOffers) {
        const p = g.players.get(id);
        if (p && offres.length) {
          g.takeCard(p, offres[Math.floor(Math.random() * offres.length)]);
        }
      }
      g.cardsPending = false;
      g.openNextScreen();
      k--;
      continue;
    }
    if (g.relicPending) {
      acheteur?.(g);
      g.closeMerchant();
      g.openNextScreen();
      k--;
      continue;
    }

    inputs.clear();
    for (const p of g.players.values()) inputs.set(p.id, botVersBoss(g, p));
    g.step(CFG.TICK, inputs);
    for (const p of g.players.values()) {
      p.hp = p.maxHp; p.downed = false; p.revive = 0;
    }
    if (!g.victory) g.gameOver = false;

    if (g.boss) {
      // la horde est suspendue pendant un boss : toute hausse d'effectif est un renfort
      const venus = vu ? Math.max(0, g.enemies.length - vu.dernier) : 0;
      vu = {
        segment: g.segment, kind: g.boss.kind,
        duree: g.boss.fightT, puissance: puissance(),
        enrage: g.boss.enrage ?? 0,
        renforts: (vu?.renforts ?? 0) + venus,
        // la part du combat ou le boss ne prend RIEN : c'est elle que le palier
        // achete, et elle ne se deduit d'aucune duree.
        auPalier: (vu?.auPalier ?? 0) + (g.boss.palier > 0 ? 1 : 0),
        dernier: g.enemies.length,
        corps: (vu?.corps ?? 0) + g.enemies.length,
        images: (vu?.images ?? 0) + 1,
        pointe: Math.max(vu?.pointe ?? 0, g.enemies.length),
        plafond: g._bossAddCap(), capHorde: g._enemyCap(),
      };
    } else if (vu) {
      combats.push({
        ...vu,
        debit: vu.duree > 0 ? vu.renforts / vu.duree / joueurs : null,
        vivants: vu.corps / vu.images / joueurs,
        partPalier: vu.images > 0 ? vu.auPalier / vu.images : 0,
      });
      vu = null;
    }

    const m = g.hordeMinutes();
    while (attente.length && m >= attente[0]) {
      const jalon = attente.shift();
      const pw = puissance();
      releves.set(jalon, { puissance: pw, ttk: ttk(diffIndex, jalon, pw) });
    }
    // les tranches du lot D se lisent sur l'horloge de la MANCHE, pas de la horde :
    // leur derniere borne (32 min) depasse les 30 min de horde d'une manche entiere.
    while (attenteN.length && g.time / 60 >= attenteN[0]) {
      niveaux.set(attenteN.shift(), g.level);
    }
  }

  return {
    diffIndex, joueurs, releves, combats, niveaux,
    niveau: g.level, cartes: g.level - 1, segment: g.segment, duree: g.time,
    victoire: !!g.victory,
  };
}

export function verifierTTK(effectifs = [1, 4], manches = 3, jalons = [1, 10, 20, 30]) {
  const soucis = [];

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    for (const n of effectifs) {
      const ou = `${DIFFICULTIES[di].key}/${n}j`;
      const parJalon = new Map(jalons.map(j => [j, []]));
      const durees = [];

      for (let r = 0; r < manches; r++) {
        const m = mesureTTK(di, n, jalons);
        for (const [j, v] of m.releves) parJalon.get(j).push(v.ttk);
        for (const c of m.combats) durees.push(c.duree);
      }

      for (const j of jalons) {
        const v = mediane(parJalon.get(j));
        if (v === null) {
          soucis.push(`${ou} : la minute ${j} n'est jamais atteinte`);
        } else if (v < TTK_MIN || v > TTK_MAX) {
          soucis.push(`${ou} : ttk de ${v.toFixed(2)} s a la minute ${j}`
            + ` hors de [${TTK_MIN}, ${TTK_MAX}]`);
        }
      }

      const d = mediane(durees);
      if (d === null) soucis.push(`${ou} : aucun boss abattu`);
      else if (d < BOSS_FIGHT_MIN || d > BOSS_FIGHT_MAX) {
        soucis.push(`${ou} : combat de boss median de ${d.toFixed(0)} s`
          + ` hors de [${BOSS_FIGHT_MIN}, ${BOSS_FIGHT_MAX}]`);
      }
    }
  }
  return soucis;
}

export function mesurePuissanceBoss(joueurs = 1, manches = 6, diffIndex = DIFF_NORMAL) {
  const releves = [];
  for (let r = 0; r < manches; r++) {
    const m = mesureTTK(diffIndex, joueurs, []);
    for (const c of m.combats) releves.push(c.puissance);
  }
  return { n: releves.length, mediane: mediane(releves), releves };
}

// LA GRAINE EST ECRITE, sinon rien n'est decidable : deux reglages doivent se
// comparer sur les MEMES manches. Non appariee, la meme courbe rendait 18 puis 23
// au niveau de la minute 20. Meme generateur que `buildBiome`.
function grainer(g) {
  let a = g | 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// fenetre plus large que celle du ttk : un compte de cartes ne veut rien dire sur
// une manche tronquee, et un combat de boss long repousse la fin bien apres 42 min.
export function mesureProgression(diffIndex, joueurs, manches = 6, minutes = 60) {
  const cartes = [], parMarque = new Map(LEVEL_MARKS.map(m => [m[0], []]));
  const alea = Math.random;
  let finies = 0;
  try {
    for (let r = 1; r <= manches; r++) {
      Math.random = grainer(r * 7919);
      const m = mesureTTK(diffIndex, joueurs, [], minutes);
      cartes.push(m.cartes);
      if (m.victoire) finies++;
      for (const [min, niv] of m.niveaux) parMarque.get(min)?.push(niv);
    }
  } finally {
    Math.random = alea;
  }
  const moy = cartes.reduce((a, b) => a + b, 0) / cartes.length;
  const ecart = Math.sqrt(cartes.reduce((a, b) => a + (b - moy) ** 2, 0) / cartes.length);
  const sd = xs => {
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
  };
  return {
    diffIndex, joueurs, cartes, moyenne: moy, ecart, finies,
    niveaux: new Map([...parMarque].map(([min, v]) => [min, mediane(v)])),
    // a minute fixe : la dispersion de la COURBE, sans celle de la duree de manche
    ecartNiveau: new Map([...parMarque].map(([min, v]) =>
      [min, v.length ? sd(v) : null])),
    cadence: LEVEL_MARKS.map(([min, _], i) => {
      const av = i ? mediane(parMarque.get(LEVEL_MARKS[i - 1][0])) : 1;
      const ap = mediane(parMarque.get(min));
      const t = min - (i ? LEVEL_MARKS[i - 1][0] : 0);
      return ap !== null && av !== null && ap > av ? t / (ap - av) : null;
    }),
  };
}

export function verifierCartes() {
  const soucis = verifierCatalogue();
  // le catalogue est PASSE a `verifierArmes` : c'est ici que les deux tables se
  // rencontrent, `armes.js` etant une feuille
  soucis.push(...verifierArmes(CARDS, axesDeCarte));
  const byId = new Map(CARDS.map(c => [c.id, c]));

  for (const c of CARDS) {
    for (const other of c.incompatible ?? []) {
      const o = byId.get(other);
      if (!o) { soucis.push(`${c.id} : incompatible avec ${other}, inconnue`); continue; }
      if (!(o.incompatible ?? []).includes(c.id)) {
        soucis.push(`${c.id} <-> ${other} : incompatibilite declaree d'un seul cote`);
      }
    }
    for (const req of c.requires ?? []) {
      if (!byId.has(req)) soucis.push(`${c.id} : requires ${req}, inconnue`);
    }
    if (c.requires && c.requires.every(id => byId.get(id)?.rarity === 0)) {
      soucis.push(`${c.id} : ne conditionne que sur des communes — c'est un cas`
        + ` d'affichage (\`effective\`), pas de filtre`);
    }
  }

  // une carte qui bonifie un systeme sans le creer est morte sans son prerequis
  const SOURCES = {
    orbiterDamageMul: ["orbiteurs"],
    droneDamageMul: ["drone"],
  };
  for (const c of CARDS) {
    const src = String(c.apply ?? "");
    for (const [mod, sources] of Object.entries(SOURCES)) {
      if (!src.includes(mod)) continue;
      if (sources.includes(c.id)) continue;
      const ok = (c.requires ?? []).some(id => sources.includes(id));
      if (!ok) soucis.push(`${c.id} : touche ${mod} sans requires ${sources.join("/")}`);
    }
  }

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    for (const cls of CLASSES) {
      for (const niveau of [1, 10, 20, 30]) {
        for (const joueurs of [1, 4]) {
          const ctx = { players: joueurs, teamOwned: new Set(), systems: new Set() };
          if (di > 0) ctx.systems.add("hasards_actifs");
          const maigres = poolThin(eligibleCards(new Map(), cls.id, niveau, null, ctx));
          for (const { rarity, n } of maigres) {
            soucis.push(`${DIFFICULTIES[di].key}/${cls.id}/niveau ${niveau}/${joueurs}j :`
              + ` rarete ${rarity} a ${n} cartes pour un seuil de ${POOL_MIN}`);
          }
        }
      }
    }
  }

  /* LE FILTRE PAR AXE RETIRE DES CARTES : `poolThin` doit donc se rejouer ARME
     PAR ARME. Si retirer la perforation fait tomber un pool sous le seuil, le
     probleme n'est pas le filtre, c'est que le catalogue est trop mince pour ce
     qu'on lui demande. */
  for (const arme of ARMES) {
    for (const cls of CLASSES) {
      const ctx = { players: 1, teamOwned: new Set(), systems: new Set(), arme: arme.id };
      const maigres = poolThin(eligibleCards(new Map(), cls.id, 30, null, ctx));
      for (const { rarity, n } of maigres) {
        soucis.push(`${arme.id}/${cls.id} : rarete ${rarity} a ${n} cartes eligibles`
          + ` pour un seuil de ${POOL_MIN}`);
      }
    }
  }
  return soucis;
}

/* ===========================================================================
   LA CAMPAGNE D'ARMES.

   UNE ARME VAUT CE QU'ELLE DELIVRE, PAS CE QU'ELLE AFFICHE. Le critere d'avant
   ne connaissait qu'un nombre — le dps nominal en cible unique — et ne remontait
   aucune anomalie pendant que le tesla dominait et que la grenade faisait x1,88
   de survie. Il ne mentait pas, il regardait le mauvais nombre.

     V = 0,8 x Dh  +  0,2 x Db  +  S

   Dh  degats par seconde MESURES en manche, mutisme et ratages compris
   Db  degats par seconde MESURES contre un boss seul, meme convention
   S   la survie que l'arme donne, au taux de change des cartes de conversion

   ATTENTION AU DOUBLE COMPTE. Le plan ecrivait `V = (0,8 Vhorde + 0,2 Vboss) x U
   x R`, ou `Vhorde` porte deja les cibles touchees et `R` porte deja le rapport
   des degats reels au nominal : les multiplier compte deux fois la meme chose.
   Une mesure directe des degats delivres contient U et R par construction. Les
   deux restent RELEVES, parce que ce sont eux qui disent QUEL terme deborde —
   c'est un diagnostic, pas un facteur.

   A GRAINES APPARIEES : ce qui se mesure est le RELATIF, arme contre arme. Deux
   graines differentes mesureraient le script et pas l'arme.
   =========================================================================== */
export function mesureArmes(manches = 3, minutes = 10, diffIndex = DIFF_NORMAL) {
  const alea = Math.random;
  const out = [];
  try {
    for (const a of ARMES) {
      let temps = 0, muet = 0, cibles = 0, degats = 0, tirs = 0, survie = 0;
      for (let r = 1; r <= manches; r++) {
        Math.random = grainer(r * 7919);
        const g = new GameState(diffIndex);
        g.addPlayer(1, "banc", 2);
        const p = g.players.get(1);
        p.arme = a.id;
        g._recomputeMods(p);
        const pil = pilotage();
        const fin = minutes * 60;
        let t = 0, chute = fin;
        while (t < fin) {
          g.step(CFG.TICK, new Map([[1, pil(g, p)]]));
          t += CFG.TICK;
          if (p.downed && chute === fin) chute = t;
          /* IMMORTEL, PAS INVULNERABLE. Sans ca `Dh` est confondu avec la survie :
             une arme qui tient plus longtemps atteint des minutes plus denses,
             donc mesure un debit plus eleve — et la survie serait comptee deux
             fois, une fois dans `Dh` et une fois dans `S`. Toutes les armes
             voient exactement la meme horde pendant exactement le meme temps. */
          p.hp = p.maxHp; p.downed = false; p.downT = 0;
        }
        temps += p.hf.armeTemps; muet += p.hf.armeMuet;
        cibles += p.hf.armeCibles; degats += p.hf.armeDegats;
        tirs += p.hf.tirs; survie += chute;
      }
      out.push({
        id: a.id,
        dh: temps > 0 ? degats / temps : 0,
        db: mesureArmeBoss(a, diffIndex),
        u: temps > 0 ? 1 - muet / temps : 1,
        // par SECONDE et non par tir : le faisceau, l'arc et le balayage ne
        // passent pas par `_fire`, donc ils n'ont pas de « tir » a diviser
        ciblesParSec: temps > 0 ? cibles / temps : 0,
        tirs,
        survie: survie / manches,
        s: survieArme(a, CLASSES[2].hp),
      });
    }
  } finally { Math.random = alea; }

  const ref = out.find(x => x.id === ARME_DEFAUT);
  const brut = x => (1 - ARME_CFG.PART_BOSS) * x.dh + ARME_CFG.PART_BOSS * x.db;
  const base = brut(ref);
  for (const x of out) {
    x.v = base > 0 ? brut(x) / base + x.s : 0;
    x.cible = cibleArme(ARME_BY_ID.get(x.id));
  }
  return out;
}

/* CIBLE UNIQUE, ET LE PILOTE LA JOUE. Un banc qui FIGE le tireur offre la rampe
   pleine au canon d'assaut et mesure 2,6 fois son nominal — un combat de boss est
   exactement l'endroit ou l'on bouge. Le boss attaque donc normalement et le
   pilote repond ; seule sa MORT est retiree, parce qu'on mesure ce que l'arme
   delivre et non combien de temps elle tient. La horde est videe : c'est la cible
   unique qu'on veut, et elle seule. */
export function mesureArmeBoss(a, diffIndex = DIFF_NORMAL, secondes = 90, graines = 2) {
  const alea = Math.random;
  let total = 0, n = 0;
  try {
    for (let r = 1; r <= graines; r++) {
      Math.random = grainer(r * 4507);
      const g = new GameState(diffIndex);
      g.addPlayer(1, "banc", 2);
      const p = g.players.get(1);
      p.arme = a.id;
      g._recomputeMods(p);
      g.bossPending = true;
      g.step(CFG.TICK, new Map());
      if (!g.boss) continue;
      const pil = pilotage();
      const avant = p.hf.armeDegats;
      let t = 0;
      while (t < secondes) {
        g.enemies.length = 0;
        const B = g.boss;
        if (!B) break;
        B.hp = 1e12; B.maxHp = 1e12;
        if (g.boss2) { g.boss2.hp = 1e12; g.boss2.maxHp = 1e12; }
        g.step(CFG.TICK, new Map([[1, pil(g, p)]]));
        // immortel, pas invulnerable : il subit tout, il ne tombe pas
        p.hp = p.maxHp; p.downed = false; p.downT = 0;
        t += CFG.TICK;
      }
      total += (p.hf.armeDegats - avant) / secondes;
      n++;
    }
  } finally { Math.random = alea; }
  return n > 0 ? total / n : 0;
}

/* CE QU'UN EFFET PERD EN SILENCE. Trois champs de ce depot ont ete poses d'un
   cote et jamais envoyes de l'autre — l'angle du balayage de la lame, le rang
   d'un arc, le nombre de tranchants — et aucun des trois n'a leve quoi que ce
   soit : `??` rend un repli qui a l'air normal, et le rendu dessine tranquillement
   la mauvaise chose pendant des mois.

   La liste des champs transportes ne se DECLARE pas ici — une seconde liste
   diverge — elle se MESURE : on serialise l'etat courant et on verifie que toute
   valeur numerique non nulle posee sur un effet vivant ressort quelque part dans
   son tuple. Un effet filtre par la vue n'est pas une perte, il est absent.

   S'appelle DANS une boucle de mesure, pas une fois : il ne voit que les kinds
   qui se produisent pendant qu'il regarde. Muet = tout va bien. */
const EFFET_IGNORE = new Set(["id", "kind", "life", "max"]);
export function verifierEffets(g) {
  const soucis = [];
  const envoyes = new Map((g.snapshot().f ?? []).map(t => [t[0], t]));
  for (const f of g.effects) {
    const t = envoyes.get(f.id);
    if (!t) continue;
    for (const [cle, v] of Object.entries(f)) {
      if (EFFET_IGNORE.has(cle) || typeof v !== "number") continue;
      // une valeur qui ARRONDIT a zero est legitimement rognee par `trimTail` :
      // ce n'est pas une perte, c'est la resolution du tuple.
      if (Math.abs(Math.round(v * 100) / 100) < 0.005) continue;
      // r1, r2 et `Math.round` : la tolerance couvre les trois arrondis du tuple
      if (!t.some(x => typeof x === "number" && Math.abs(x - v) < 0.51)) {
        soucis.push(`effet kind ${f.kind} : « ${cle} » = ${v} n'est dans aucun`
          + ` emplacement du tuple`);
      }
    }
  }
  return soucis;
}

/* LE BANC DES BONUS AU SOL. Trois questions qu'aucune erreur ne pose, et les
   trois se MESURENT au lieu de se declarer — une seconde liste diverge.

   [1] UN TYPE QUI NE TOMBE JAMAIS. Quatre l'etaient depuis le premier commit,
       avec leur effet, leur pastille de HUD et leur insigne deja ecrits.
   [2] UN RAMASSAGE QUI N'ECRIT RIEN. On applique chaque type sur un etat
       DEFAVORABLE mais plausible — PV pleins, aucun bouclier, aucun etat,
       personne a terre, aucun corps — et on refuse une empreinte inchangee.
   [3] UN BIT POSE QUI NE CHANGE PAS LA BALLE. Le bit de bonus d'arme peut etre
       pose et lu nulle part : on relit la balle, ou le nombre de tirs.

   Muet = tout va bien. */
/* L'EFFET POSE NE COMPTE PAS COMME UN ECRIT : la purification poussait le sien
   sans rien purger, et une empreinte qui l'aurait compte aurait declare l'etui
   plein. Ce qui compte est ce qui change le COMBAT. */
function empreinteBonus(g) {
  const p = g.players.get(1);
  return [p.hp, p.shield, p.buffDamage, p.buffRate, p.buffDouble, p.buffPierce,
          p.buffRicochet, p.statuses.size, p.purges, g.slow, g.turrets.length,
          g.enemies.length,
          g.enemies.reduce((s, e) => s + e.hp, 0)].join("|");
}

/* L'etat DEFAVORABLE mais plausible : rien a soigner, rien a purger, personne a
   relever — et une poignee de corps au contact, sans quoi ce qui frappe la horde
   n'aurait rien a frapper et passerait pour muet. */
function bancBonus(corps = 6) {
  const g = new GameState(DIFF_NORMAL);
  g.addPlayer(1, "banc", 0);
  const p = g.players.get(1);
  p.hp = p.maxHp;
  p.shield = 0;
  p.statuses.clear();
  g.enemies.length = 0;
  for (let i = 0; i < corps; i++) {
    const e = g._spawnEnemy(0);
    if (!e) break;
    e.x = p.x + 60 + i * 30;
    e.y = p.y;
  }
  return { g, p };
}

export function verifierBonus(tirages = 20000) {
  const soucis = [];

  const { g: gt } = bancBonus(0);
  const vus = new Set();
  for (let i = 0; i < tirages; i++) vus.add(gt._randomPowerupType());

  const { g: gf, p: pf } = bancBonus(0);
  pf.mods.harvest = 1;
  const e = gf._spawnEnemy(0);
  if (e) { gf._killEnemy(e, 1); for (const w of gf.powerups) vus.add(w.type); }

  for (let i = 0; i < POWERUP_TYPES.length; i++) {
    if (!vus.has(i)) soucis.push(`${POWERUP_TYPES[i]} : aucune source ne le fait tomber`);
  }

  for (let i = 0; i < POWERUP_TYPES.length; i++) {
    const { g, p } = bancBonus();
    const avant = empreinteBonus(g);
    g._applyPowerup(p, i);
    if (empreinteBonus(g) === avant) {
      soucis.push(`${POWERUP_TYPES[i]} : ramasse, il n'ecrit rien`);
    }
  }

  const balle = (buff) => {
    const { g, p } = bancBonus(0);
    if (buff) p[buff] = CFG.BUFF_TIME;
    g.bullets.length = 0;
    g._shoot(p);
    const b = g.bullets;
    return { n: b.length, dmg: b[0] ? b[0].dmg : 0,
             pierce: b[0] ? b[0].pierce : 0, chain: b[0] ? b[0].chain : 0 };
  };
  const nu = balle(null);
  const cas = [
    ["damage", "buffDamage", x => x.dmg > nu.dmg, "les degats de la balle"],
    ["double", "buffDouble", x => x.n > nu.n, "le nombre de balles"],
    ["pierce", "buffPierce", x => x.pierce > nu.pierce, "la perforation"],
    ["ricochet", "buffRicochet", x => x.chain > nu.chain, "les rebonds"],
  ];
  for (const [nom, champ, ok, quoi] of cas) {
    if (!ok(balle(champ))) soucis.push(`${nom} : le bit est pose, ${quoi} ne bouge pas`);
  }

  const tirs = (buff) => {
    const { g, p } = bancBonus(0);
    const ordres = new Map([[1, { x: 0, y: 0, ax: 1, ay: 0, dash: false }]]);
    const avant = p.hf.tirs;
    for (let t = 0; t < 2; t += CFG.TICK) {
      if (buff) p[buff] = CFG.BUFF_TIME;
      g.step(CFG.TICK, ordres);
    }
    return p.hf.tirs - avant;
  };
  if (tirs("buffRate") <= tirs(null)) {
    soucis.push("rate : le bit est pose, la cadence ne bouge pas");
  }

  return soucis;
}

/* LE BANC DES RELIQUES. Une relique se lit a un POINT D'APPLICATION, jamais par
   une boucle generique : un champ mal orthographie, ou dont la seule lecture a
   ete supprimee, ne leve donc rien du tout — `relicById(id)?.[key]` rend
   `undefined`, la somme reste a zero, et la relique est achetee pour rien.

   Le controle se MESURE au lieu de se declarer : on relit la SOURCE des methodes
   de `GameState` et on exige que chaque champ y apparaisse comme litteral. Une
   seconde liste de champs a tenir a jour aurait exactement le defaut qu'elle
   cherche. Les reliques a `mode` se lisent par leur identifiant, pas par un
   champ : c'est l'identifiant qu'on cherche alors.

   Deuxieme question, de conception celle-la : une relique qui porte un MALUS
   doit porter sa `contrepartie` ecrite. Un cout qu'on decouvre en jouant est un
   piege, et il n'y a que le texte pour l'annoncer. */
const RELIC_META = new Set(["id", "nom", "tier", "desc", "contrepartie", "mode",
  "equipe", "minPlayers", "requiresSystem", "requiresArme"]);
// un nombre negatif n'est pas un malus : `rateFlat` descend quand la cadence monte
const RELIC_MALUS = new Set(["noHeal", "speedFixed"]);
const RELIC_MALUS_NEG = new Set(["flatHp", "flatDamage"]);

export function verifierReliques() {
  const soucis = [];
  const src = Object.getOwnPropertyNames(GameState.prototype)
    .map(k => {
      const d = Object.getOwnPropertyDescriptor(GameState.prototype, k);
      return d && typeof d.value === "function" ? String(d.value) : "";
    }).join(" ");
  const vus = new Set();

  for (const r of RELICS) {
    if (vus.has(r.id)) soucis.push(`${r.id} : identifiant en double`);
    vus.add(r.id);
    if (!(r.tier >= 0 && r.tier < RELIC_RARITY.length)) {
      soucis.push(`${r.id} : palier ${r.tier}`);
    }
    if (!r.desc) soucis.push(`${r.id} : sans description`);
    if (r.requiresArme && !ARME_EXIGENCE[r.requiresArme]) {
      soucis.push(`${r.id} : exigence d'arme « ${r.requiresArme} » inconnue`);
    }

    let effets = 0, malus = false;
    for (const [cle, v] of Object.entries(r)) {
      if (RELIC_META.has(cle)) continue;
      effets++;
      if (RELIC_MALUS.has(cle) || (RELIC_MALUS_NEG.has(cle) && v < 0)) malus = true;
      if (!src.includes(`"${cle}"`)) {
        soucis.push(`${r.id} : le champ « ${cle} » n'est lu nulle part`);
      }
    }
    if (r.mode) {
      effets++;
      if (!src.includes(`"${r.id}"`)) {
        soucis.push(`${r.id} : mode « ${r.mode} » sans lecteur`);
      }
    }
    if (effets === 0) soucis.push(`${r.id} : aucun effet`);
    if (malus && !r.contrepartie) soucis.push(`${r.id} : un malus sans contrepartie ecrite`);
  }
  return soucis;
}

/* CE QUI TOMBE VRAIMENT, sur une manche entiere. Le poids situationnel ne se
   juge pas sur sa table : il se juge sur la DISTRIBUTION qu'il produit, et un
   terme trop gourmand ne se voit qu'a la fin. On compte les APPARITIONS et non
   les ramassages — le bot ne se detourne pas pour un bonus, c'est un fait releve
   en 0.8.12 et le lot 5 s'en occupe. Les joueurs a terre sont releves au bout de
   quelques secondes : sans quoi la manche s'arrete, et le poids de la balise ne
   verrait jamais sa situation. */
export function mesureBonus(diffIndex = DIFF_NORMAL, joueurs = 2, minutes = 30,
  manches = 3) {
  const parts = new Array(POWERUP_TYPES.length).fill(0);
  let total = 0, temps = 0;
  const alea = Math.random;
  try {
    for (let r = 1; r <= manches; r++) {
      Math.random = grainer(r * 6151);
      const g = new GameState(diffIndex);
      for (let i = 1; i <= joueurs; i++) g.addPlayer(i, `bot${i}`, i - 1, i % CLASSES.length);
      g.warmup = 0;
      const inputs = new Map();
      const vus = new Set();
      const images = Math.round(minutes * 60 / CFG.TICK);
      for (let k = 0; k < images && !g.victory; k++) {
        if (g.cardsPending) {
          for (const [id, offres] of g.cardOffers) {
            const p = g.players.get(id);
            if (p && offres.length) {
              g.takeCard(p, offres[Math.floor(Math.random() * offres.length)]);
            }
          }
          g.cardsPending = false;
          g.openNextScreen();
          k--;
          continue;
        }
        if (g.relicPending) { g.closeMerchant(); g.openNextScreen(); k--; continue; }
        inputs.clear();
        for (const p of g.players.values()) inputs.set(p.id, botInput(g, p));
        g.step(CFG.TICK, inputs);
        for (const w of g.powerups) {
          if (vus.has(w.id)) continue;
          vus.add(w.id);
          parts[w.type]++;
          total++;
        }
        for (const p of g.players.values()) {
          if (p.downed && Math.random() < CFG.TICK / 6) {
            p.downed = false; p.revive = 0; p.hp = p.maxHp * 0.5;
          }
        }
        g.gameOver = false;
      }
      temps += g.time;
    }
  } finally { Math.random = alea; }
  return { parts, total, parMinute: total / Math.max(1, temps / 60) };
}

/* Le plancher est BAS, et c'est voulu : un type que l'equipe ne peut pas lire —
   la perforation sur un faisceau, la cadence sur une arme continue — DOIT se
   rarefier, c'est le sujet du lot. Ce que le critere refuse est qu'il disparaisse
   (`CFG.POWERUP_PART_MIN` le garantit) ou qu'un terme trop gourmand mange la
   rotation. */
/* LE GENERATEUR NE DOIT PAS PASSER SA MANCHE BLOQUE par un sol plein de bonus
   que personne ne ramasse — c'est le releve de 0.8.12, et il n'avait jamais eu
   de critere. Ce qui se mesure est la part du temps ou son echeance est passee
   ET le sol plein, pas l'occupation moyenne : a quatre joueurs celle-ci depasse
   le plafond, les depouilles d'elite ne le consultant pas.
   La part de survie, elle, garde l'equilibrage d'avant le plan : quatre bonus
   rendus a la rotation ne doivent RIEN retirer de soin a l'equipe. */
export const SOL_OCCUPE_MAX = 0.50;
export const PART_SURVIE = [0.36, 0.50];
const SURVIE_CLES = ["heal", "shield", "beacon"];

export function verifierRythmeBonus(diffIndex = DIFF_NORMAL, joueurs = 2,
  manches = 4, minutes = 40) {
  const soucis = [];
  const r = mesureSurvie(diffIndex, joueurs, [0, 2], PROFIL_ENGAGE, manches, minutes);
  const ou = `${DIFFICULTIES[diffIndex].key}/${joueurs}j`;
  if (r.partBloquee > SOL_OCCUPE_MAX) {
    soucis.push(`${ou} : le generateur est bloque ${Math.round(r.partBloquee * 100)} %`
      + ` du temps par un sol plein (${r.solMoyen.toFixed(2)} bonus en moyenne)`);
  }
  if (!(r.poses > 0)) { soucis.push(`${ou} : aucun bonus pose`); return soucis; }

  const b = mesureBonus(diffIndex, joueurs, minutes, manches);
  let rot = 0, survie = 0;
  for (const k of POWERUP_ROTATION) {
    rot += b.parts[k];
    if (SURVIE_CLES.includes(POWERUP_TYPES[k])) survie += b.parts[k];
  }
  const part = rot ? survie / rot : 0;
  if (part < PART_SURVIE[0] || part > PART_SURVIE[1]) {
    soucis.push(`${ou} : ${Math.round(part * 100)} % de bonus de survie, bande`
      + ` ${PART_SURVIE.map(x => Math.round(x * 100)).join("-")} %`);
  }
  return soucis;
}

export const BONUS_PART_MIN = 0.20;
export const BONUS_PART_MAX = 2.00;

/* Critere du tirage situationnel : tout type de la rotation reste tirable, et
   aucun ne prend plus du double de sa part plate sur une manche entiere. Un
   verificateur de campagne, comme `verifierEquilibreArmes`. */
export function verifierTirageBonus(diffIndex = DIFF_NORMAL, joueurs = 2,
  minutes = 30, manches = 3) {
  const soucis = [];
  for (const k of POWERUP_ROTATION) {
    if (typeof POWERUP_POIDS[POWERUP_TYPES[k]] !== "function") {
      soucis.push(`${POWERUP_TYPES[k]} : dans la rotation, sans poids`);
    }
  }
  if (soucis.length) return soucis;

  // le denominateur est la ROTATION seule : le fragment et la purification ont
  // chacun leur propre source, leur frequence est une autre question
  const { parts } = mesureBonus(diffIndex, joueurs, minutes, manches);
  let total = 0;
  for (const k of POWERUP_ROTATION) total += parts[k];
  // L'ECHANTILLON DOIT POUVOIR SEPARER LE PLANCHER DE SA MOITIE. A 66
  // apparitions, un type au plancher en vaut 1,2 : une manche cauchemar solo
  // sortait « ricochet 1,8 % » sur UN tirage de plus ou de moins. Vingt par
  // type met le plancher a quatre apparitions, ou le bruit ne decide plus.
  if (total < POWERUP_ROTATION.length * 20) {
    soucis.push(`${total} apparitions seulement : l'echantillon ne dit rien`);
    return soucis;
  }
  const plat = 1 / POWERUP_ROTATION.length;
  for (const k of POWERUP_ROTATION) {
    const part = parts[k] / total;
    if (part < plat * BONUS_PART_MIN || part > plat * BONUS_PART_MAX) {
      soucis.push(`${POWERUP_TYPES[k]} : ${(part * 100).toFixed(1)} % des`
        + ` apparitions pour une part plate de ${(plat * 100).toFixed(1)} %`);
    }
  }
  return soucis;
}

/* Critere rejouable de l'equilibrage des armes. Il ne peut PAS tourner sans
   mesures : c'est un verificateur de campagne, comme `verifierMeta`. */
export function verifierEquilibreArmes(manches = 3, minutes = 10) {
  const soucis = [];
  for (const x of mesureArmes(manches, minutes)) {
    if (Math.abs(x.v - x.cible) > ARME_CFG.TOLERANCE_V) {
      soucis.push(`${x.id} : ${Math.round(x.v * 100)} % délivré pour une cible de`
        + ` ${Math.round(x.cible * 100)} % (difficulté ${difficulte(ARME_BY_ID.get(x.id))})`);
    }
  }
  return soucis;
}

export function mesureRevenu(diffIndex, joueurs, manches = 8, minutes = 60) {
  const runs = [];
  const alea = Math.random;
  try {
    for (let r = 1; r <= manches; r++) {
      Math.random = grainer(r * 7919);
      const m = mesureTTK(diffIndex, joueurs, [], minutes);
      const boss = m.combats.length;
      runs.push({
        niveau: m.niveau, boss, victoire: m.victoire,
        noyaux: coresForRun(m.niveau, boss, diffIndex),
        brut: Math.round((PROG_CFG.CORE_LEVEL * m.niveau + PROG_CFG.CORE_BOSS * boss)
          * (PROG_CFG.DIFF_MUL[diffIndex] ?? 1)),
      });
    }
  } finally {
    Math.random = alea;
  }
  const plafonnees = runs.filter(r => r.brut > PROG_CFG.CORE_RUN_CAP);
  return {
    diffIndex, joueurs, runs,
    noyaux: mediane(runs.map(r => r.noyaux)),
    finies: runs.filter(r => r.victoire).length,
    plafonnees: plafonnees.length,
    plafonneesFinies: plafonnees.filter(r => r.victoire).length,
  };
}

// le budget du lot G est derive a rebours de la matrice de PROFILS.md, en supposant
// ce revenu par manche : c'est LUI qu'il faut verifier, pas le cout d'une ligne
// (l'ancien critere datait du cadrage a une seule ligne).
export const META_RUN_CORES = 420;
export const META_RUN_TOL = 0.25;
export const META_POWER_MAX = 1.8;

const somme = xs => xs.reduce((a, b) => a + b, 0);

export function coutMeta() {
  const classe = somme(PROG_CFG.TIER_COSTS);
  const tronc = somme(PROG_CFG.TRONC_COSTS);
  const secours = somme(PROG_CFG.SECOURS_COSTS);
  const confort = somme(Object.values(PROG_CFG.CONFORT_COSTS));
  const jusqua3 = t => somme(t.slice(0, 3));
  return {
    p1: confort + secours + jusqua3(PROG_CFG.TIER_COSTS) * 6
      + jusqua3(PROG_CFG.TRONC_COSTS) * 3,
    p2: confort + secours + classe * 6 + tronc * 3,
  };
}

export function gainMeta(clsId) {
  const plein = Object.fromEntries(
    [...(TREES[clsId] ?? []), ...COMMUN].map(l => [l.id, PROG_CFG.TIERS_MAX]));
  const cls = CLASSES.findIndex(c => c.id === clsId);
  const nu = fullMods(new Map(), [], cls);
  const avec = applyMeta(nu.mods, nu.maxHp, clsId, plein, plein);
  return {
    puissance: powerIndex(avec.mods) / powerIndex(nu.mods),
    pv: avec.maxHp / nu.maxHp,
  };
}

export function verifierMeta(effectifs = [1, 4], manches = 4) {
  const soucis = [];

  for (let di = 0; di < DIFFICULTIES.length; di++) {
    for (const n of effectifs) {
      const r = mesureRevenu(di, n, manches);
      const ou = `${DIFFICULTIES[di].key}/${n}j`;
      // le plafond borne la soiree exceptionnelle, pas le cas nominal
      const nominal = r.plafonnees - r.plafonneesFinies;
      if (nominal > 0) {
        soucis.push(`${ou} : ${nominal} manches NON terminees touchent le plafond`
          + ` de ${PROG_CFG.CORE_RUN_CAP} noyaux`);
      }
      if (di < DIFFICULTIES.length - 1 && r.plafonnees > 0) {
        soucis.push(`${ou} : le plafond mord hors cauchemar`
          + ` (${r.plafonnees}/${manches} manches)`);
      }

      if (di === DIFF_NORMAL
        && Math.abs(r.noyaux - META_RUN_CORES) / META_RUN_CORES > META_RUN_TOL) {
        soucis.push(`${ou} : ${r.noyaux} noyaux par manche contre ${META_RUN_CORES}`
          + ` supposes par le budget (${(META_RUN_TOL * 100).toFixed(0)} % de marge)`);
      }
    }
  }

  for (const cls of CLASSES) {
    const g = gainMeta(cls.id);
    const pire = Math.max(g.puissance, g.pv);
    if (pire > META_POWER_MAX) {
      soucis.push(`${cls.id} : compte complet a x${pire.toFixed(2)}`
        + ` (puissance x${g.puissance.toFixed(2)}, PV x${g.pv.toFixed(2)})`
        + ` pour un plafond de x${META_POWER_MAX}`);
    }
  }
  return soucis;
}

export const BOSS_DRIFT_MAX = 0.20;
export const BOSS_DENSITY_TOL = 0.15;
export const BOSS_ENRAGE_MAX = 0.25;
export const BOSS_ENRAGE_MIN = 0.10;
// un boss ordinaire a quatre paliers ; au-dela de ce plafond ils cessent d'etre
// un sommet de phase pour devenir la moitie du combat.
export const BOSS_PALIER_MAX = 0.15;

/* LA BANDE DE DUREE SUIT LES PV, ET SEULEMENT CE QUI N EST PAS SOUS TEST.
   `BOSS_FIGHT_MIN/MAX` est une bande de NORMAL pour un boss a cinq barres :
   l appliquer telle quelle aux trois modes sortait neuf lignes en calme, ou
   `diff.boss` vaut 0,75 et ou `LISEZMOI` ecrit depuis le lot H que les combats
   tombent a 40-47 s. Mesure : p50 de 47 s en calme contre 65 s en normal, soit
   0,72 — la bande scalee par `diff.boss` (0,75) tombe dessus.

   Elle suit aussi les BARRES. Ecrite `[2 x MIN, 2 x MAX]` au lot 1 en pensant a
   l Amalgame et ses huit barres, elle declarait le RECITANT hors bande : il en a
   CINQ, donc il dure ce que dure un boss ordinaire. Le seuil d emportement du
   lot 2 se met a l echelle des barres ; la bande de duree aurait du faire pareil
   des le depart.

   CE QU ELLE NE SUIT PAS : `hpMul`. C est le reglage SOUS TEST — l y faire
   entrer rendrait le critere vrai par construction, exactement le piege que le
   lot 2 a evite en refusant d indexer l emportement sur `BOSS_FIGHT_MAX`. */
export function bandeDuree(kind, diffIndex) {
  const def = bossAt(kind);
  const d = DIFFICULTIES[diffIndex] ?? DIFFICULTIES[DIFF_NORMAL];
  const k = ((def.bars ?? CFG.BOSS_BARS) / CFG.BOSS_BARS)
    * (estFinal(kind) ? BOSS_CFG.FINAL_HP_MUL : 1)
    * d.boss;
  return [BOSS_FIGHT_MIN * k, BOSS_FIGHT_MAX * k];
}
// EN DESSOUS, UNE MEDIANE PAR BOSS NE DIT RIEN. Une manche montre 5 boss sur 8,
// donc six manches n'en donnent que trois ou quatre chacun — et la duree d'un
// meme boss va de 49 a 126 s selon le tirage de cartes. Le seuil est le nombre a
// partir duquel la mediane cesse de suivre l'echantillon ; a 6 manches le critere
// se declare NON MESURE au lieu de passer au vert.
export const BOSS_ECHANTILLON_MIN = 8;

export function mesureBoss(diffIndex, joueurs, manches = 6, minutes = 60) {
  const combats = [];
  const alea = Math.random;
  try {
    for (let r = 1; r <= manches; r++) {
      Math.random = grainer(r * 7919);
      combats.push(...mesureTTK(diffIndex, joueurs, [], minutes).combats);
    }
  } finally {
    Math.random = alea;
  }
  const parSegment = new Map();
  const parKind = new Map();
  for (const c of combats) {
    if (!parSegment.has(c.segment)) parSegment.set(c.segment, []);
    parSegment.get(c.segment).push(c);
    if (!parKind.has(c.kind)) parKind.set(c.kind, []);
    parKind.get(c.kind).push(c);
  }
  return {
    diffIndex, joueurs, combats,
    duree: new Map([...parSegment].map(([s, cs]) => [s, mediane(cs.map(c => c.duree))])),
    // PAR BOSS, et pas seulement par segment : la mediane d'un segment melange
    // cinq boss tires au sort, donc un boss aberrant s'y noie. Mesure : 59 s au
    // Metronome contre 156 s aux Jumeaux au meme effectif, tous deux invisibles
    // au critere de segment.
    parBoss: new Map([...parKind].map(([k, cs]) => [k, {
      n: cs.length,
      duree: mediane(cs.map(c => c.duree)),
      palier: mediane(cs.map(c => c.partPalier)),
    }])),
    debit: mediane(combats.map(c => c.debit).filter(v => v !== null)),
    vivants: mediane(combats.map(c => c.vivants)),
    enrages: combats.length
      ? combats.filter(c => c.enrage > 0).length / combats.length : null,
    debordements: combats.filter(c => c.pointe > c.capHorde).length,
  };
}

// CRITERE REJOUABLE DE LA COEXISTENCE. Quatre choses qu'un combat ne doit jamais
// produire, et une seule question a chaque fois : la consigne affichee est-elle
// EXECUTABLE ? Un chevauchement n'est un defaut que s'il ne laisse pas le temps
// de faire les deux — sinon c'est du timing, et le timing est le but.
export function verifierMecaniques(effectifs = [1, 2, 3, 4], manches = 3,
  diffIndex = DIFF_NORMAL, minutes = 42) {
  const soucis = [];
  const alea = Math.random;

  for (const n of effectifs) {
    const cas = new Map();
    const note = (quoi, detail) => {
      if (!cas.has(quoi)) cas.set(quoi, { n: 0, ex: detail });
      cas.get(quoi).n++;
    };

    try {
      for (let r = 1; r <= manches; r++) {
        Math.random = grainer(r * 7919 + n * 31 + diffIndex * 101);
        const g = new GameState(diffIndex);
        for (let i = 1; i <= n; i++) g.addPlayer(i, `bot${i}`, i - 1, i % CLASSES.length);
        g.warmup = 0;
        const inputs = new Map();
        const images = Math.round(minutes * 60 / CFG.TICK);

        for (let k = 0; k < images && !g.victory; k++) {
          if (g.cardsPending) {
            for (const [id, offres] of g.cardOffers) {
              const p = g.players.get(id);
              if (p && offres.length) g.takeCard(p, offres[Math.floor(Math.random() * offres.length)]);
            }
            g.cardsPending = false; g.openNextScreen(); k--; continue;
          }
          if (g.relicPending) { g.closeMerchant(); g.openNextScreen(); k--; continue; }
          inputs.clear();
          for (const p of g.players.values()) inputs.set(p.id, botVersBoss(g, p));
          g.step(CFG.TICK, inputs);
          for (const p of g.players.values()) { p.hp = p.maxHp; p.downed = false; p.revive = 0; }
          if (!g.victory) g.gameOver = false;
          if (!g.boss) continue;

          const vivantes = g.marks.filter(m => !m.dead);
          const vivants = g._alivePlayers().length;

          // 1. deux ordres que le joueur ne peut pas suivre ensemble
          for (let i = 0; i < vivantes.length; i++) {
            for (let j = i + 1; j < vivantes.length; j++) {
              const a = vivantes[i], c = vivantes[j];
              // deux foyers d'un MEME groupe sont un seul ordre, pas deux.
              if (a.grp && a.grp === c.grp) continue;
              if (a.mech === MECH_FEED || c.mech === MECH_FEED) continue;
              if (mechsCompatibles(a.mech, c.mech)) continue;
              note("ordres incompatibles", `${mechAt(a.mech).key} + ${mechAt(c.mech).key}`);
            }
          }

          // 2. plus de places a tenir que de joueurs pour les tenir
          const occ = vivantes.filter(m => mechAt(m.mech)?.forme === "colonne");
          const besoin = occ.reduce((s, m) => s + Math.max(1, m.need), 0);
          if (occ.length && besoin > vivants) {
            note("places > joueurs", `${besoin} places pour ${vivants} joueurs`);
          }

          // 3. un abri sous le feu a l'instant meme ou il faut y etre. « Brule »
          // = applique des degats maintenant : une zone instantanee ne blesse
          // qu'a la detonation (`blast` neuf), le reste de sa vie est un
          // remanent visuel que `_zones` ne fait plus passer par `_zoneApply`.
          const actives = g.zones.filter(z => !z.pj && !z.sol && z.dmg > 0
            && z.warn <= 0 && (z.life > 0 || z.blast > 0.2));
          for (const a of g._abris()) {
            if (a.t > BOSS_CFG.ABRI_RETOUR) continue;
            if (!actives.some(z => g._zoneCouvre(z, a))) continue;
            note("abri sous le feu a l'echeance", `${vivants} joueurs`);
          }

          // 4. plus rien de sur au sol
          if (!g._solLibrePart(actives)) note("aucun safe spot", `${vivants} joueurs`);
        }
      }
    } finally { Math.random = alea; }

    for (const [quoi, v] of cas) {
      soucis.push(`${DIFFICULTIES[diffIndex].key}/${n}j : ${quoi}, ${v.n} images (${v.ex})`);
    }
  }
  return soucis;
}

export function verifierBoss(effectifs = [1, 4], manches = 6, diffIndex = DIFF_NORMAL) {
  const soucis = [];
  const densites = [];

  for (const n of effectifs) {
    const r = mesureBoss(diffIndex, n, manches);
    const ou = `${DIFFICULTIES[diffIndex].key}/${n}j`;
    densites.push(r.debit);

    // la derive se lit sur les boss ORDINAIRES : le final a huit barres, donc un
    // plancher de sejour de 70 s, et la fourchette 50-90 lui est inaccessible sans
    // toucher a son nombre de barres — ce que ce lot ne fait pas.
    const ordinaire = TL_CFG.SEGMENTS - 1;
    const premier = r.duree.get(1), dernier = r.duree.get(ordinaire);
    if (premier === undefined || dernier === undefined) {
      soucis.push(`${ou} : le segment 1 ou ${ordinaire} ne porte aucun boss abattu`
        + ` — la derive ne se mesure pas`);
    } else {
      if (Math.abs(dernier - premier) / premier > BOSS_DRIFT_MAX) {
        soucis.push(`${ou} : ${premier.toFixed(0)} s au premier boss contre`
          + ` ${dernier.toFixed(0)} s au dernier ordinaire, pour une derive de`
          + ` ${(BOSS_DRIFT_MAX * 100).toFixed(0)} % au plus`);
      }
      // un SEGMENT melange les boss du pool, donc sa bande est celle d'un boss a
      // cinq barres dans ce mode — pas la bande brute, qui vaut pour le normal.
      const [smin, smax] = bandeDuree(BOSS_RAVAGEUR, diffIndex);
      for (const [s, v] of [[1, premier], [ordinaire, dernier]]) {
        if (v < smin || v > smax) {
          soucis.push(`${ou} : boss du segment ${s} en ${v.toFixed(0)} s,`
            + ` hors de [${smin.toFixed(0)}, ${smax.toFixed(0)}]`);
        }
      }
    }

    // le final se juge sur SA bande, celle de ses barres et de son mode — pas
    // sur « deux boss ordinaires », qui declarait le Recitant et ses CINQ barres
    // hors bande a 76-87 s alors qu'il y etait exactement.
    const final = r.duree.get(TL_CFG.SEGMENTS);
    const [fmin, fmax] = bandeDuree(finalPour(diffIndex), diffIndex);
    if (final !== undefined && (final < fmin || final > fmax)) {
      soucis.push(`${ou} : boss final en ${final.toFixed(0)} s, hors de`
        + ` [${fmin.toFixed(0)}, ${fmax.toFixed(0)}]`);
    }

    // PAR BOSS. La duree d'un boss donne varie du simple au triple d'un combat a
    // l'autre (releve : Ravageur 1 j, 49 s au minimum, 126 s au maximum), donc
    // une mediane sur trois combats ne decide rien. Un boss sous l'echantillon
    // n'est pas ignore en silence : il est NOMME comme non mesure, sinon le
    // critere passerait au vert sans avoir rien regarde.
    const maigres = [];
    for (const [kind, v] of r.parBoss) {
      if (estFinal(kind)) continue;
      if (v.n < BOSS_ECHANTILLON_MIN) { maigres.push(`${bossAt(kind).key}=${v.n}`); continue; }
      const [bmin, bmax] = bandeDuree(kind, diffIndex);
      if (v.duree < bmin || v.duree > bmax) {
        soucis.push(`${ou} : ${bossAt(kind).key} en ${v.duree.toFixed(0)} s`
          + ` (n=${v.n}), hors de [${bmin.toFixed(0)}, ${bmax.toFixed(0)}]`);
      }
      if (v.palier > BOSS_PALIER_MAX) {
        soucis.push(`${ou} : ${bossAt(kind).key} passe`
          + ` ${(v.palier * 100).toFixed(0)} % du combat au palier, pour un`
          + ` plafond de ${(BOSS_PALIER_MAX * 100).toFixed(0)} %`);
      }
    }
    if (maigres.length) {
      soucis.push(`${ou} : critere par boss NON MESURE, moins de`
        + ` ${BOSS_ECHANTILLON_MIN} combats pour ${maigres.join(", ")}`
        + ` — relancer avec plus de manches`);
    }

    // UNE BANDE, PAS UN PLAFOND. Le critere n'avait qu'une borne haute, donc
    // « jamais » le passait : l'emportement est reste mort pendant tout un plan
    // sans qu'aucune mesure ne le dise. Un anti-enlisement se juge sur les deux
    // bords — trop souvent il devient la regle, jamais il n'existe pas.
    if (r.enrages !== null && r.enrages > BOSS_ENRAGE_MAX) {
      soucis.push(`${ou} : ${(r.enrages * 100).toFixed(1)} % des combats partent`
        + ` en emportement pour un plafond de ${(BOSS_ENRAGE_MAX * 100).toFixed(0)} %`);
    }
    if (r.enrages !== null && r.enrages < BOSS_ENRAGE_MIN) {
      soucis.push(`${ou} : ${(r.enrages * 100).toFixed(1)} % des combats partent`
        + ` en emportement, sous le plancher de`
        + ` ${(BOSS_ENRAGE_MIN * 100).toFixed(0)} % — l'anti-enlisement ne sert`
        + ` a rien s'il ne part jamais`);
    }
    if (r.debordements > 0) {
      soucis.push(`${ou} : ${r.debordements} combats depassent le plafond de horde`);
    }
  }

  // la densite par joueur ne PEUT pas etre egale : la doctrine du lot A la fait
  // suivre `joueurs^WAVE_CROWD_EXP`, donc decroitre en `joueurs^-0,25`. On compare
  // ce que l'exposant laisse, pas la densite brute.
  if (densites.length > 1 && densites.every(d => d !== null)) {
    const norm = densites.map((d, i) =>
      d * Math.pow(effectifs[i], 1 - CFG.WAVE_CROWD_EXP));
    const ecart = Math.max(...norm) / Math.min(...norm) - 1;
    if (ecart > BOSS_DENSITY_TOL) {
      soucis.push(`${DIFFICULTIES[diffIndex].key} : debit de renforts par joueur de`
        + ` ${Math.min(...densites).toFixed(2)} a ${Math.max(...densites).toFixed(2)}`
        + ` par seconde selon l'effectif, soit ${(ecart * 100).toFixed(0)} % d'ecart`
        + ` une fois l'exposant retire`);
    }
  }
  return soucis;
}

export function verifierProgression(effectifs = [1, 4], manches = 6, diffIndex = DIFF_NORMAL) {
  const soucis = [];
  const vus = [];

  for (const n of effectifs) {
    const r = mesureProgression(diffIndex, n, manches);
    const ou = `${DIFFICULTIES[diffIndex].key}/${n}j`;
    vus.push(r.moyenne);

    if (r.ecart > CARD_SD_MAX) {
      soucis.push(`${ou} : ecart-type de ${r.ecart.toFixed(1)} carte`
        + ` pour un plafond de ${CARD_SD_MAX}`);
    }
    // le garde-fou qui remplace « ne pas monter au-dessus de LEVEL_XP_GROWTH » :
    // une cadence qui se resserre en fin de manche est une progression sans fin.
    for (let i = 1; i < r.cadence.length; i++) {
      const av = r.cadence[i - 1], ap = r.cadence[i];
      if (av !== null && ap !== null && ap < av * CADENCE_TOL) {
        soucis.push(`${ou} : cadence de ${av.toFixed(2)} puis ${ap.toFixed(2)} min`
          + ` par niveau — les paliers tardifs vont plus vite que les premiers`);
      }
    }
    for (const [min, cible] of LEVEL_MARKS) {
      const v = r.niveaux.get(min);
      if (v === null || v === undefined) {
        soucis.push(`${ou} : la minute ${min} n'est jamais atteinte`);
      } else if (Math.abs(v - cible) > LEVEL_MARK_TOL) {
        soucis.push(`${ou} : niveau ${v} a la minute ${min} pour une cible de ${cible}`);
      }
    }
  }

  if (vus.length > 1 && Math.max(...vus) - Math.min(...vus) > 2) {
    soucis.push(`${DIFFICULTIES[diffIndex].key} : ${Math.min(...vus).toFixed(1)} a`
      + ` ${Math.max(...vus).toFixed(1)} cartes selon l'effectif`);
  }
  return soucis;
}

// LE BOT NE RECOLTE PAS : il tire sur le corps le plus proche, un cristal n'est
// casse qu'au passage. Le revenu est donc INJECTE depuis le modele, sans quoi la
// mesure teste le pilotage au lieu du marchand. `part` = taux de points recoltes.
export function revenuRecolte(minutes, part = 0.7) {
  const inter = (CFG.HARVEST_MIN + CFG.HARVEST_MAX) / 2;
  const gain = (CFG.HARVEST_YIELD_MIN + CFG.HARVEST_YIELD_MAX) / 2;
  return Math.round(minutes * 60 / inter * part * gain);
}

// Le palier VISE est le plus haut qui soit a la fois payable et encore tirable :
// viser un palier epuise (la legendaire deja prise) ferait relancer a vide.
function visePalier(g, p) {
  let vise = 0;
  for (const r of RELICS) {
    if (p.relics.has(r.id)) continue;
    if (r.tier === 3 && g.relicLegendaryTaken) continue;
    if (r.minPlayers && g.players.size < r.minPlayers) continue;
    if (r.requiresSystem === "hasards_actifs" && g.hazards.length === 0) continue;
    // le meme filtre que l'offre, sinon l'acheteur vise un palier que le tirage
    // ne peut PAS lui montrer et relance jusqu'a epuiser sa bourse
    if (r.requiresArme && !ARME_EXIGENCE[r.requiresArme](armeAt(p.arme))) continue;
    if (relicPrice(r) <= p.eclats && r.tier > vise) vise = r.tier;
  }
  return vise;
}

// Deux politiques, parce que la distribution des achats est une propriete de la
// POLITIQUE autant que du catalogue : `gourmand` prend le plus haut palier payable
// et relance tant qu'il ne le voit pas — il borne le taux de relance par le haut ;
// `neutre` prend au hasard parmi ce qu'il peut payer, et c'est LUI qui dit si les
// prix departagent les paliers.
function acheteurGourmand(visites, patience = 0, part = 0.7, neutre = false,
  relancesMax = 2) {
  const verse = new Map();
  return g => {
    for (const p of g.players.values()) {
      const du = revenuRecolte(g.hordeMinutes(), part);
      p.eclats += du - (verse.get(p.id) ?? 0);
      verse.set(p.id, du);
      const avant = p.eclats;
      let relances = 0;
      const saute = g.segment <= patience;
      let achat = null;
      while (!saute) {
        const offres = (g.relicOffers.get(p.id) ?? []).map(relicById).filter(Boolean);
        const abordables = offres.filter(r => relicPrice(r) <= p.eclats);
        if (neutre) {
          achat = abordables.length
            ? abordables[Math.floor(Math.random() * abordables.length)]
            : null;
          break;
        }
        const vise = visePalier(g, p);
        const best = abordables.reduce((a, b) => (a && a.tier >= b.tier ? a : b), null);
        if (best && best.tier >= vise) { achat = best; break; }
        const prix = g.relicRerollPrice(p);
        if (relances >= relancesMax || p.eclats - prix < (best ? relicPrice(best) : 0)
          || !g.rerollRelic(p)) { achat = best; break; }
        relances++;
      }
      if (achat && !g.buyRelic(p, achat.id)) achat = null;
      visites.push({
        joueur: p.id, segment: g.segment, niveau: g.level,
        offres: [...(g.relicOffers.get(p.id) ?? []), ...(achat ? [achat.id] : [])],
        achat: achat?.id ?? null, tier: achat?.tier ?? null,
        relances, eclats: avant, verse: du, depense: avant - p.eclats, saute,
      });
      g.relicDone(p);
    }
  };
}

export function mesureMarchand(diffIndex, joueurs, manches = 6, patience = 0,
  neutre = false, part = 0.7, minutes = 60) {
  const runs = [];
  const alea = Math.random;
  try {
    for (let r = 1; r <= manches; r++) {
      Math.random = grainer(r * 7919);
      const visites = [];
      const m = mesureTTK(diffIndex, joueurs, [], minutes,
        acheteurGourmand(visites, patience, part, neutre));
      const mien = visites.filter(v => v.joueur === 1);
      const vus = new Set(mien.flatMap(v => v.offres));
      const achats = mien.filter(v => v.achat);
      runs.push({
        graine: r, visites: mien, victoire: m.victoire, boss: m.combats.length,
        niveau: m.niveau,
        achats: achats.length,
        valeur: somme(achats.map(v => relicPrice(relicById(v.achat)))),
        paliers: achats.map(v => v.tier),
        vus: vus.size,
        relances: somme(mien.map(v => v.relances)),
        avecRelance: mien.filter(v => v.relances > 0).length,
        revenu: somme(mien.map(v => v.eclats))
          ? mien[mien.length - 1].eclats + somme(achats.map(v => relicPrice(relicById(v.achat))))
          : 0,
      });
    }
  } finally {
    Math.random = alea;
  }
  const visites = somme(runs.map(r => r.visites.length));
  const paliers = runs.flatMap(r => r.paliers);
  return {
    diffIndex, joueurs, patience, neutre, part, runs, visites,
    achats: mediane(runs.map(r => r.achats)),
    revenu: mediane(runs.map(r => r.revenu)),
    depense: mediane(runs.map(r => somme(r.visites.map(v => v.depense)))),
    valeur: mediane(runs.map(r => r.valeur)),
    vus: mediane(runs.map(r => r.vus)),
    partVue: mediane(runs.map(r => r.vus)) / RELICS.length,
    tauxRelance: visites ? somme(runs.map(r => r.avecRelance)) / visites : 0,
    parPalier: RELIC_RARITY.map((_, t) =>
      paliers.length ? paliers.filter(x => x === t).length / paliers.length : 0),
  };
}

export const REVENU_BAND = [400, 500];
export const RELIC_SEEN_MAX = 0.7;
export const RELIC_REROLL_BAND = [0.15, 0.4];
export const RELIC_TIER_SPAN = 3;

export function verifierMarchand(effectifs = [1, 4], manches = 6,
  diffIndex = DIFF_NORMAL) {
  const soucis = [];

  const parPalier = RELIC_RARITY.map((_, t) => RELICS.filter(r => r.tier === t).length);
  if (RELIC_CFG.WEIGHT.length !== RELIC_RARITY.length
    || RELIC_CFG.PRICE.length !== RELIC_RARITY.length) {
    soucis.push(`catalogue : WEIGHT/PRICE ne couvrent pas les ${RELIC_RARITY.length} paliers`);
  }
  for (let t = 1; t < RELIC_CFG.PRICE.length; t++) {
    if (RELIC_CFG.PRICE[t] <= RELIC_CFG.PRICE[t - 1]) {
      soucis.push(`catalogue : le palier ${t} ne coute pas plus que le ${t - 1}`);
    }
    if (RELIC_CFG.WEIGHT[t] >= RELIC_CFG.WEIGHT[t - 1]) {
      soucis.push(`catalogue : le palier ${t} n'est pas plus rare que le ${t - 1}`);
    }
    if (parPalier[t] > parPalier[t - 1]) {
      soucis.push(`catalogue : ${parPalier[t]} reliques au palier ${t} pour`
        + ` ${parPalier[t - 1]} au ${t - 1}`);
    }
  }
  // le revenu se verifie sur le MODELE et non sur une manche : le bot ne recolte
  // pas, et le dernier marchand tombe avant la trentieme minute.
  const revenu = revenuRecolte(TL_CFG.SEGMENTS * TL_CFG.SEGMENT_TIME / 60);
  if (revenu < REVENU_BAND[0] || revenu > REVENU_BAND[1]) {
    soucis.push(`recolte : ${revenu} eclats sur une manche pleine, bande`
      + ` ${REVENU_BAND.join("-")}`);
  }

  // le catalogue doit tenir la demande d'une manche : `RELIC_CFG.OFFER_COUNT` par
  // visite et une visite par segment, sans quoi le critere « moins de 70 % vu » est
  // arithmetiquement hors d'atteinte.
  const offresMax = RELIC_CFG.OFFER_COUNT * (TL_CFG.SEGMENTS - 1);
  if (RELICS.length < offresMax * RELIC_SEEN_MAX) {
    soucis.push(`catalogue : ${RELICS.length} reliques pour ${offresMax} offres possibles`);
  }

  for (const n of effectifs) {
    const ou = `${DIFFICULTIES[diffIndex].key}/${n}j`;
    const m = mesureMarchand(diffIndex, n, manches);

    const finies = m.runs.filter(r => r.victoire).length;
    // le boss final CLOT la manche : il n'ouvre pas de marchand derriere lui, donc
    // une manche gagnee compte cinq visites, pas six.
    const cap = (TL_CFG.SEGMENTS - 1) * RELIC_CFG.BUY_PER_VISIT;
    if (m.achats > cap) {
      soucis.push(`${ou} : ${m.achats} achats la ou le plafond structurel est de ${cap}`);
    }
    if (finies && m.achats < cap) {
      soucis.push(`${ou} : ${m.achats} achats sur ${finies} manches completes —`
        + ` le revenu ne couvre pas une relique par visite`);
    }
    if (m.partVue > RELIC_SEEN_MAX) {
      soucis.push(`${ou} : ${Math.round(m.partVue * 100)} % du catalogue vu en une`
        + ` manche, plafond ${Math.round(RELIC_SEEN_MAX * 100)} %`);
    }
    if (m.tauxRelance < RELIC_REROLL_BAND[0] || m.tauxRelance > RELIC_REROLL_BAND[1]) {
      soucis.push(`${ou} : ${Math.round(m.tauxRelance * 100)} % de visites relancees,`
        + ` bande ${RELIC_REROLL_BAND.map(x => Math.round(x * 100)).join("-")} %`);
    }
    // « aucun palier dans plus de 50 % des achats » n'est PAS testable : un
    // maximisateur concentre sur le palier du haut par construction, un acheteur
    // au hasard reproduit `WEIGHT`, ou la commune vaut deja 50 %. Ce qui se teste
    // est la COUVERTURE : des prix qui departagent laissent passer trois paliers.
    const couverts = m.parPalier.filter(x => x > 0).length;
    if (couverts < RELIC_TIER_SPAN) {
      soucis.push(`${ou} : les achats ne couvrent que ${couverts} palier(s)`
        + ` (${m.parPalier.map(x => Math.round(x * 100) + " %").join(" / ")})`);
    }

    // « sauter les deux premiers marchands » : dominante si elle rend PLUS de valeur
    const patient = mesureMarchand(diffIndex, n, manches, 2);

    if (patient.valeur > m.valeur) {
      soucis.push(`${ou} : sauter les deux premiers marchands rend ${patient.valeur}`
        + ` eclats de reliques contre ${m.valeur} — la patience domine`);
    }
  }
  return soucis;
}

// LE PILOTE. `botInput` reste intact : les lots A a H se rejouent contre lui, et un
// bot qui se met a esquiver deplacerait toutes leurs mesures. Celui-ci est un
// SECOND bot, reserve au lot I — il recule, il esquive les zones, il ramasse, il
// releve, et il utilise les deux competences de sa classe. Sans lui, une matrice de
// survie mesure le pilotage et non les classes : quatre lots de suite ont sorti un
// critere rouge pour cette raison.
export const PILOT_CFG = {
  LECTURE: 460,
  ESQUIVE: 110,
  PAS: 6,
  SAUT: 96,
  GROUPE: 2,
  // MESURE : la posture a un cout d'opportunite reel — en posture le soigneur ne
  // tire plus du tout. A 0,99 (« lier des qu'un allie n'est pas plein ») la table
  // 1/1/2 tombe a 1 401 s en normal contre 2 106 ici. Le seuil reste donc bas :
  // on lie quand un allie est REELLEMENT entame, pas en permanence.
  SOIN_ENTREE: 0.62,
  SECOURS: 0.45,
  // le rayon d'accrochage, plus la marge dont le pilote a besoin pour venir s'y
  // mettre : au-dela il n'y a pas de lien a entretenir
  PORTEE_SOIN: SKILL_CFG.HEAL_LINK_RADIUS * 2.2,
  BONUS: 520,
  REMPART: 620,
  ZONE: 520,

  /* LE PILOTE DU LOT I RECULE, TOUJOURS. C'est sa doctrine et elle ne bouge pas :
     avec le tir standard il se comporte exactement comme avant, sinon toutes les
     mesures des lots I a K changeraient de sens.
     Mais une arme de CONTACT lui demande l'inverse, et une arme a RAMPE lui
     demande de ne pas bouger du tout — sans ces deux termes, la mesure ne juge
     pas l'arme, elle juge l'incapacite du pilote a la jouer. Les deux ne
     s'activent que si l'arme les declare. */
  TENUE_POIDS: 4.5,
  TENUE_MARGE: 0.35,
  RAMPE_TENIR: 240,
};

/* La distance a laquelle le pilote CHERCHE a se tenir, deduite de la portee de
   l'arme : elle ne se declare pas une seconde fois dans la table. `null` = la
   doctrine d'origine, reculer autant que possible. */
export function tenueDe(arme) {
  if (arme.lame) return lameRayon(arme) * 0.7;
  /* LA SCISSION EST LA LIGNE MORTE, PAS LA DISTANCE UTILE : sur la ligne le
     porteur touche AVANT de s'ouvrir, donc un pilote qui s'y tient mesure
     l'arme la ou elle ne rend rien. La bande utile commence juste apres. */
  if (arme.scission) return arme.scission * 1.25;
  return null;
}

const PILOT_DIRS = (() => {
  const out = [[0, 0]];
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    out.push([Math.cos(a), Math.sin(a)]);
  }
  return out;
})();

function menacesAutour(g, p) {
  const out = [];
  const R = PILOT_CFG.LECTURE;
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - p.x, dy = e.y - p.y;
    if (dx * dx + dy * dy > R * R) continue;
    out.push({ x: e.x, y: e.y, poids: 1 });
  }
  for (const b of [g.boss, g.boss2]) {
    if (!b) continue;
    const dx = b.x - p.x, dy = b.y - p.y;
    if (dx * dx + dy * dy > (R * 1.6) ** 2) continue;
    out.push({ x: b.x, y: b.y, poids: 5 });
  }
  return out;
}

// la geometrie d'une zone ne se recopie pas : `_zoneHits` est le point de passage,
// on ne lui donne qu'un point candidat.
function zonesDangereuses(g, p) {
  const out = [];
  for (const z of g.zones) {
    if (!(z.dmg > 0 || z.dot > 0)) continue;
    const porte = PILOT_CFG.ZONE + (z.r ?? 0) + Math.max(z.w ?? 0, z.h ?? 0);
    const dx = z.x - p.x, dy = z.y - p.y;
    if (dx * dx + dy * dy > porte * porte) continue;
    out.push(z);
  }
  return out;
}

function coutPosition(g, x, y, menaces, zones, but, tenue = null) {
  let c = 0;
  const R = tenue !== null ? tenue : PILOT_CFG.LECTURE;
  let plusProche = Infinity;
  for (const m of menaces) {
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < plusProche) plusProche = d;
    if (d >= R) continue;
    const k = 1 - d / R;
    c += m.poids * k * k * 120;
  }
  // une arme de contact veut une BANDE, pas un maximum : trop loin coute autant
  // que trop pres, et c'est ce qui fait avancer le pilote au lieu de fuir
  if (tenue !== null && plusProche < Infinity) {
    const marge = tenue * PILOT_CFG.TENUE_MARGE;
    c += Math.max(0, Math.abs(plusProche - tenue) - marge) * PILOT_CFG.TENUE_POIDS;
  }
  const point = { x, y };
  for (const z of zones) if (g._zoneHits(z, point)) c += z.dmg > 0 ? 900 : 260;
  const b = g.bounds;
  const bord = Math.min(x - b.x0, b.x1 - x, y - b.y0, b.y1 - y);
  if (bord < 160) c += (160 - bord) * 2.5;
  if (but) c += Math.hypot(but.x - x, but.y - y) * but.poids;
  return c;
}

function corpsDans(g, p, r) {
  let n = 0;
  const rr = r * r;
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= rr) n++;
  }
  return n;
}

// la bombe se lance sur une GRAPPE, pas sur le corps le plus proche : c'est ce que
// la fiche de classe demande au joueur, donc c'est ce que le pilote doit faire.
function grappeEnnemis(g, p, portee, rayon) {
  let best = null;
  const pp = portee * portee, rr = rayon * rayon;
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - p.x, dy = e.y - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > pp) continue;
    let n = 0;
    for (const o of g.enemies) {
      if (o.hp <= 0) continue;
      if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= rr) n++;
    }
    if (!best || n > best.n) best = { x: e.x, y: e.y, n, d: Math.sqrt(d2) };
  }
  return best;
}

// Le seuil se lit sur les PV SEULS, et c'est mesure : lire PV + bouclier semble
// plus fin (sous un rempart les PV ne bougent pas), mais le bouclier tient les
// allies a plein en permanence, donc le declencheur ne part jamais — 0,6 % du
// temps en posture. Un joueur qui PERD des PV est deja celui que le bouclier n'a
// pas suffi a couvrir : c'est le bon signal.
function allieLePlusAtteint(g, p, portee) {
  let cible = null, pire = 1;
  for (const o of g.players.values()) {
    if (o.id === p.id) continue;
    if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 > portee * portee) continue;
    const r = o.downed ? -1 : o.hp / o.maxHp;
    if (r < pire) { pire = r; cible = o; }
  }
  return pire < PILOT_CFG.SOIN_ENTREE ? cible : null;
}

export function pilotage() {
  const memo = new Map();

  return (g, p) => {
    let mem = memo.get(p.id);
    if (!mem) { mem = { x: 0, y: 0, k: 0 }; memo.set(p.id, mem); }

    const cls = classAt(p.cls).id;
    const arme = armeAt(p.arme);
    const tenue = tenueDe(arme);
    const ratio = p.hp / Math.max(1, p.maxHp);

    let proche = null, dp = Infinity;
    for (const e of g.enemies) {
      if (e.hp <= 0) continue;
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < dp) { dp = d; proche = e; }
    }
    if (g.boss && (!proche || dp > 340 * 340)) {
      const d = (g.boss.x - p.x) ** 2 + (g.boss.y - p.y) ** 2;
      if (d < dp || !proche) { proche = g.boss; dp = d; }
    }
    dp = Math.sqrt(dp);

    if (--mem.k <= 0) {
      mem.k = PILOT_CFG.PAS;
      const menaces = menacesAutour(g, p);
      const zones = zonesDangereuses(g, p);

      let but = null;
      let tombe = null, dt = Infinity;
      for (const o of g.players.values()) {
        if (o.id === p.id || !o.downed) continue;
        const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2;
        if (d < dt) { dt = d; tombe = o; }
      }
      if (tombe && ratio > PILOT_CFG.SECOURS) but = { x: tombe.x, y: tombe.y, poids: 0.7 };
      // TENIR SA POSITION PRES DE CELUI QU'ON SOIGNE : le lien remplace la ligne
      // de vue par une contrainte de distance, et sans ce terme la mesure juge un
      // soigneur qui laisse casser tous ses liens.
      if (!but && p.healMode) {
        const cible = allieLePlusAtteint(g, p, PILOT_CFG.PORTEE_SOIN);
        if (cible) but = { x: cible.x, y: cible.y, poids: 0.45 };
      }
      // se tenir DANS le rempart d'un allie : sans ce terme, le tank n'apporte a
      // l'equipe que sa provocation, et la mesure de composition juge un tank que
      // personne ne suit.
      if (!but) {
        for (const bw of g.bulwarks) {
          if (bw.owner === p.id) continue;
          const d2 = (bw.x - p.x) ** 2 + (bw.y - p.y) ** 2;
          if (d2 > PILOT_CFG.REMPART ** 2) continue;
          but = { x: bw.x, y: bw.y, poids: 0.3 };
          break;
        }
      }
      if (!but) {
        let bonus = null, db = PILOT_CFG.BONUS ** 2;
        for (const w of g.powerups) {
          const d = (w.x - p.x) ** 2 + (w.y - p.y) ** 2;
          if (d < db) { db = d; bonus = w; }
        }
        if (bonus) but = { x: bonus.x, y: bonus.y, poids: 0.12 };
      }
      if (!but) {
        let cx = 0, cy = 0, n = 0;
        for (const o of g.players.values()) {
          if (o.id === p.id) continue;
          cx += o.x; cy += o.y; n++;
        }
        but = n
          ? { x: cx / n, y: cy / n, poids: 0.06 }
          : { x: (g.bounds.x0 + g.bounds.x1) / 2, y: (g.bounds.y0 + g.bounds.y1) / 2,
              poids: 0.02 };
      }

      let bx = 0, by = 0, bc = Infinity;
      for (const [dx, dy] of PILOT_DIRS) {
        const x = p.x + dx * PILOT_CFG.SAUT, y = p.y + dy * PILOT_CFG.SAUT;
        let c = coutPosition(g, x, y, menaces, zones, but, tenue);
        // une rampe ne se garde qu'immobile : tant que rien n'est au contact,
        // rester vaut mieux que gagner quelques pixels
        if (arme.rampe && (dx !== 0 || dy !== 0) && dp > PILOT_CFG.RAMPE_TENIR ** 2) {
          c += 90 * p.armeRes + 40;
        }
        if (c < bc) { bc = c; bx = dx; by = dy; }
      }
      mem.x = bx; mem.y = by;
    }

    let ax = 1, ay = 0, ar = SKILL_CFG.DPS_BOMB_RANGE_MAX;
    if (proche) {
      const d = Math.hypot(proche.x - p.x, proche.y - p.y) || 1;
      ax = (proche.x - p.x) / d; ay = (proche.y - p.y) / d; ar = d;
    }

    let s1 = false, s2 = false, s3 = false;
    const tier3 = p.mods.skill3 > 0 && p.cd3 <= 0;

    if (cls === "tank") {
      // le rempart est une BATTERIE DE BOUCLIER qui suit son porteur : un joueur
      // competent le pose des qu'il est pret et qu'il y a de quoi le menacer, il
      // n'attend pas d'etre entoure. Un declencheur plus fin sous-estime la classe.
      s1 = p.cd1 <= 0 && ((proche !== null && dp < 600) || ratio < 0.9);
      const large = corpsDans(g, p, SKILL_CFG.TANK_TAUNT_RADIUS);
      s2 = p.cd2 <= 0 && (large >= 4 || ratio < 0.5
        || [...g.players.values()].some(o => o.downed && o.id !== p.id
          && (o.x - p.x) ** 2 + (o.y - p.y) ** 2 < 400 * 400));
      s3 = tier3 && corpsDans(g, p, 220) >= 3;
    } else if (cls === "soigneur") {
      // la question posee au soigneur n'est plus « ai-je une ligne de tir ? »
      // mais « puis-je RESTER pres de lui ? » : la posture ne vise rien, elle
      // s'entretient par la position, et sans allie elle est inerte.
      // la sortie ne depend plus de SES PV : la posture ne le soigne plus, donc
      // y rester sans allie a lier ne fait que le priver de son tir.
      const besoin = allieLePlusAtteint(g, p, PILOT_CFG.PORTEE_SOIN);
      if (p.healSwapCd <= 0 && !!besoin !== !!p.healMode) s1 = true;
      let blesses = 0;
      for (const o of g.players.values()) {
        if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 > SKILL_CFG.HEAL_WAVE_RADIUS ** 2) continue;
        if (o.downed || o.hp / o.maxHp < 0.7) blesses++;
      }
      s2 = p.cd2 <= 0 && blesses >= 1;
      s3 = tier3 && blesses >= 1;
    } else {
      const grappe = p.bombStock > 0
        ? grappeEnnemis(g, p, SKILL_CFG.DPS_BOMB_RANGE_MAX,
            SKILL_CFG.DPS_BOMB_RADIUS * p.mods.bombRadiusMul)
        : null;
      if (grappe && (grappe.n >= PILOT_CFG.GROUPE || (g.boss && grappe.n >= 1))) {
        s1 = true;
        const d = grappe.d || 1;
        ax = (grappe.x - p.x) / d; ay = (grappe.y - p.y) / d; ar = d;
      }
      s2 = p.cd2 <= 0 && (corpsDans(g, p, 500) >= 3 || (g.boss !== null && dp < 600));
      s3 = tier3 && corpsDans(g, p, CARD_CFG.SALVE_RANGE) >= 3;
    }

    return {
      x: mem.x, y: mem.y, ax, ay, ar,
      dash: p.dashCd <= 0 && dp < PILOT_CFG.ESQUIVE && (mem.x !== 0 || mem.y !== 0),
      s1, s2, s3,
    };
  };
}

// LES TROIS PROFILS DE COMPTE de `PROFILS.md`, en objet `meta` de manche : meme
// forme que celui que `room.js` construit au lancement, emplacements compris —
// une ligne achetee mais non EQUIPEE ne s'applique pas.
export const PROFIL_NEUF = 0, PROFIL_ENGAGE = 1, PROFIL_COMPLET = 2;
export const PROFILS = ["neuf", "engage", "complet"];
export const PROFIL_TIER = [0, 3, PROG_CFG.TIERS_MAX];

export function metaProfil(profil, clsId) {
  if (profil <= PROFIL_NEUF) {
    return { lines: {}, commun: {}, confort: {}, locked: lockedCards(null),
             lockedRelics: lockedRelics(null) };
  }
  const plein = profil >= PROFIL_COMPLET;
  const tier = PROFIL_TIER[Math.min(profil, PROFIL_COMPLET)];
  // les emplacements restent gagnes par NIVEAU et par NOMBRE DE MANCHES, hors
  // systeme de hauts faits : `milestones` reste le journal des evenements de
  // progression, `hf` la liste des hauts faits obtenus.
  const jalons = plein
    ? [...BOSS_ROSTER.map((_, i) => `boss_${i}`), "niveau10", `niveau${PROG_CFG.SLOTS_LEVEL}`]
    : ["niveau10", `niveau${PROG_CFG.SLOTS_LEVEL}`, "boss_0", "boss_1", "boss_2"];
  const hf = plein ? HAUTS_FAITS.map(h => h.id) : ["premier_sang", "recrue", "bestiaire1"];
  const profil2 = { hf, milestones: jalons, runs: plein ? PROG_CFG.SLOTS_RUNS : 0 };
  const emplacements = slotsFor(profil2);
  const lignes = (TREES[clsId] ?? []).slice(0, emplacements);
  return {
    lines: Object.fromEntries(lignes.map(l => [l.id, tier])),
    // `secours` est pleine des P1 : c'est ce que suppose le budget de `coutMeta()`,
    // et c'est son cinquieme palier qui porte le saut P0 -> P1.
    commun: Object.fromEntries(COMMUN.map(l =>
      [l.id, l.famille === "secours" ? PROG_CFG.TIERS_MAX : tier])),
    confort: { quatrieme: 1, ravitaillement: plein ? 1 : 0 },
    locked: lockedCards(profil2),
    lockedRelics: lockedRelics(profil2),
    emplacements,
  };
}

function manchePilotee(diffIndex, joueurs, classes, profil, minutes, options = {}) {
  const g = new GameState(diffIndex);
  for (let i = 1; i <= joueurs; i++) {
    const cls = classes[(i - 1) % classes.length];
    g.addPlayer(i, `bot${i}`, i - 1, cls, metaProfil(profil, classAt(cls).id));
  }
  g.warmup = 0;

  const pilote = pilotage();
  const acheteur = options.acheteur ?? acheteurGourmand([], 0, 0.7, true);
  const inputs = new Map();
  const images = Math.round(minutes * 60 / CFG.TICK);
  const vies = new Map();
  let poses = 0, ramasses = 0, perimes = 0;
  // OCCUPATION DU SOL et UPTIME des bonus d'arme : le premier dit si le
  // generateur est bloque par ce que personne ne ramasse, le second combien de
  // temps le combat est effectivement « arme ». Deux compteurs, pas un second
  // pilote — `pilotage()` va deja chercher les bonus.
  let solSomme = 0, solN = 0, armeT = 0, joueurT = 0, bloque = 0;

  for (let k = 0; k < images && !g.gameOver && !g.victory; k++) {
    if (g.cardsPending) {
      for (const [id, offres] of g.cardOffers) {
        const p = g.players.get(id);
        if (p && offres.length) {
          g.takeCard(p, offres[Math.floor(Math.random() * offres.length)]);
        }
      }
      g.cardsPending = false;
      g.openNextScreen();
      k--;
      continue;
    }
    if (g.relicPending) {
      acheteur(g);
      g.closeMerchant();
      g.openNextScreen();
      k--;
      continue;
    }

    inputs.clear();
    for (const p of g.players.values()) inputs.set(p.id, pilote(g, p));
    g.step(CFG.TICK, inputs);
    if (options.invulnerable) {
      for (const p of g.players.values()) {
        p.hp = p.maxHp; p.downed = false; p.revive = 0;
      }
      if (!g.victory) g.gameOver = false;
    }

    // `_solBonus()` et non `powerups.length` : c'est CE compte que le generateur
    // regarde, les fragments ont leur propre plafond depuis 0.26.1
    const sol = g._solBonus();
    solSomme += sol;
    solN++;
    // LE GENERATEUR EST BLOQUE quand son echeance est passee et que le sol est
    // plein : c'est la mesure exacte du releve de 0.8.12, qui ne regardait que
    // l'occupation moyenne — laquelle depasse le plafond a quatre joueurs parce
    // que les depouilles d'elite, elles, ne le consultent pas.
    if (g.powerupCd <= 0 && sol >= CFG.POWERUP_MAX_GROUND) bloque++;
    for (const p of g.players.values()) {
      joueurT += CFG.TICK;
      if (p.buffDamage > 0 || p.buffRate > 0 || p.buffDouble > 0
          || p.buffPierce > 0 || p.buffRicochet > 0) armeT += CFG.TICK;
    }

    const vus = new Set();
    for (const w of g.powerups) {
      vus.add(w.id);
      if (!vies.has(w.id)) poses++;
      vies.set(w.id, w.life);
    }
    for (const [id, vie] of vies) {
      if (vus.has(id)) continue;
      if (vie <= CFG.TICK) perimes++; else ramasses++;
      vies.delete(id);
    }
  }

  const minutesJouees = Math.max(1 / 60, g.time / 60);
  let degats = 0, soins = 0, s1 = 0, s2 = 0;
  for (const p of g.players.values()) {
    degats += p.damageDealt;
    soins += p.healDealt;
    s1 += p.skillUses[0];
    s2 += p.skillUses[1];
  }
  return {
    segment: g.segment, niveau: g.level, duree: g.time,
    victoire: !!g.victory, boss: g.bossCount,
    degats: degats / joueurs / minutesJouees,
    soins: soins / joueurs / minutesJouees,
    skill1: s1 / joueurs / minutesJouees,
    skill2: s2 / joueurs / minutesJouees,
    poses, ramasses, perimes,
    bonusMinute: poses / minutesJouees,
    solMoyen: solN ? solSomme / solN : 0,
    partBloquee: solN ? bloque / solN : 0,
    uptimeArme: joueurT ? armeT / joueurT : 0,
  };
}

// ce qu'un joueur qui appuierait des que c'est pret obtiendrait : le taux de
// consommation du pilote se lit contre CA, pas dans l'absolu.
export function rechargesParMinute(cls) {
  const id = classAt(cls).id;
  if (id === "tank") {
    return [60 / SKILL_CFG.TANK_BULWARK_CD, 60 / SKILL_CFG.TANK_TAUNT_CD];
  }
  if (id === "soigneur") {
    return [60 / SKILL_CFG.HEAL_MODE_SWAP_CD, 60 / SKILL_CFG.HEAL_WAVE_CD];
  }
  return [60 / SKILL_CFG.DPS_BOMB_CD, 60 / SKILL_CFG.DPS_OVERDRIVE_CD];
}

export function mesureSurvie(diffIndex, joueurs, classes, profil, manches = 6,
  minutes = 60) {
  const runs = [];
  const alea = Math.random;
  try {
    for (let r = 1; r <= manches; r++) {
      Math.random = grainer(r * 7919);
      runs.push(manchePilotee(diffIndex, joueurs, classes, profil, minutes));
    }
  } finally {
    Math.random = alea;
  }
  const gagnees = runs.filter(r => r.victoire).length;
  return {
    diffIndex, joueurs, profil, classes, runs,
    segment: mediane(runs.map(r => r.segment)),
    survie: mediane(runs.map(r => r.duree)),
    niveau: mediane(runs.map(r => r.niveau)),
    degats: mediane(runs.map(r => r.degats)),
    soins: mediane(runs.map(r => r.soins)),
    taux: gagnees / runs.length,
    ramasses: somme(runs.map(r => r.ramasses)),
    poses: somme(runs.map(r => r.poses)),
    perimes: somme(runs.map(r => r.perimes)),
    partPrise: somme(runs.map(r => r.poses))
      ? somme(runs.map(r => r.ramasses)) / somme(runs.map(r => r.poses)) : 0,
    bonusMinute: mediane(runs.map(r => r.bonusMinute)),
    solMoyen: mediane(runs.map(r => r.solMoyen)),
    partBloquee: mediane(runs.map(r => r.partBloquee)),
    uptimeArme: mediane(runs.map(r => r.uptimeArme)),
  };
}

// le debit se mesure INVULNERABLE et en solo : ce qu'on compare est ce que la
// classe sort, pas combien de temps elle tient — la survie est l'autre axe.
export function mesureDebit(diffIndex, cls, profil = PROFIL_ENGAGE, manches = 3,
  minutes = 12) {
  const runs = [];
  const alea = Math.random;
  try {
    for (let r = 1; r <= manches; r++) {
      Math.random = grainer(r * 7919);
      runs.push(manchePilotee(diffIndex, 1, [cls], profil, minutes,
        { invulnerable: true }));
    }
  } finally {
    Math.random = alea;
  }
  const prets = rechargesParMinute(cls);
  return {
    cls, profil,
    degats: mediane(runs.map(r => r.degats)),
    soins: mediane(runs.map(r => r.soins)),
    skill1: mediane(runs.map(r => r.skill1)),
    skill2: mediane(runs.map(r => r.skill2)),
    taux1: mediane(runs.map(r => r.skill1)) / prets[0],
    taux2: mediane(runs.map(r => r.skill2)) / prets[1],
    niveau: mediane(runs.map(r => r.niveau)),
  };
}

// une CHAINE, pas une liste : chaque entree ajoute une classe a la precedente, donc
// l'ecart entre deux lignes EST l'apport de cette classe. « 2 tanks 2 soigneurs »
// n'y figure pas — `unique` la refuse en jeu (`room.js`).
export const COMPOSITIONS = [
  { nom: "4 tireurs", classes: [2, 2, 2, 2] },
  { nom: "tank + 3 tireurs", classes: [0, 2, 2, 2], apporte: 0 },
  { nom: "tank + soigneur + 2 tireurs", classes: [0, 1, 2, 2], apporte: 1 },
];

export const CLASS_GAP = 0.25;
export const COMPO_GAP = 0.15;
// deux modes, et pas trois : a quatre joueurs, calme atteint le plafond de temps,
// donc toutes les compositions y rendent le meme chiffre. Une mesure censuree ne
// departage rien.
export const COMPO_MODES = [DIFF_NORMAL, DIFFICULTIES.length - 1];

// `effectifs` reste a [1] par defaut : deux classes sur trois sont `unique`, donc
// au-dessus d'un joueur une equipe monoclasse n'existe pas en jeu — la comparaison
// y devient une COMPOSITION, et c'est `COMPOSITIONS` qui la porte.
export function matriceSurvie(effectifs = [1], profils = [0, 1, 2], manches = 4,
  diffs = null) {
  const table = [];
  const modes = diffs ?? DIFFICULTIES.map((_, i) => i);
  for (const di of modes) {
    for (const n of effectifs) {
      for (const pr of profils) {
        for (let cls = 0; cls < CLASSES.length; cls++) {
          const r = mesureSurvie(di, n, [cls], pr, manches);
          table.push({ diffIndex: di, joueurs: n, profil: pr, cls, ...r });
        }
      }
    }
  }
  return table;
}

export function verifierClasses(manches = 4, effectifs = [1]) {
  const soucis = [];

  // la doctrine du lot B se mesure contre la classe MEDIANE (D14 b) : le Rempart en
  // sort, et cette exception se verifie au lieu de se supposer.
  const vitesses = CLASSES.map(c => CFG.PLAYER_SPEED * c.speedMul);
  const med = vitesseClasseMediane();
  if (Math.min(...vitesses) >= med) {
    soucis.push(`doctrine : aucune classe sous la mediane de ${med.toFixed(0)} px/s`
      + ` — l'exception ecrite en D14 n'a plus d'objet`);
  }

  const table = matriceSurvie(effectifs, [0, 1, 2], manches);
  const debits = CLASSES.map((_, cls) => mesureDebit(DIFF_NORMAL, cls));

  // 1. le Rempart SOLO a P0 en calme : le raisonnement de D14 est cooperatif, et
  // en solo personne n'aide. On le compare aux deux autres classes, seule forme
  // mesurable sans pilote humain (le taux absolu de la matrice en demande un).
  const calme = table.filter(r => r.diffIndex === 0 && r.joueurs === 1 && r.profil === PROFIL_NEUF);
  const tank = calme.find(r => r.cls === 0);
  const autres = calme.filter(r => r.cls !== 0).map(r => r.survie);
  if (tank && autres.length) {
    const ref = mediane(autres);
    if (tank.survie < ref * (1 - CLASS_GAP)) {
      soucis.push(`tank solo P0 calme : ${tank.survie.toFixed(0)} s contre`
        + ` ${ref.toFixed(0)} s pour les autres classes, soit`
        + ` ${(100 * (1 - tank.survie / ref)).toFixed(0)} % de moins`
        + ` — le correctif porte sur ses COMPETENCES, jamais sur speedMul`);
    }
  }

  // 2. la chaine de compositions : l'ecart entre deux lignes est l'APPORT d'une
  // classe. C'est la seule lecture qui vaille pour une classe de soutien. Elle se
  // lit dans DEUX modes : l'apport du tank vaut +57 % en normal et zero en
  // cauchemar, ou il meurt aussi vite que les autres. Un mode ne tranche pas.
  const compos = [];
  const apport = new Map();
  for (const di of COMPO_MODES) {
    const chaine = COMPOSITIONS.map(c =>
      ({ ...c, diffIndex: di, r: mesureSurvie(di, 4, c.classes, PROFIL_ENGAGE, manches) }));
    for (let i = 1; i < chaine.length; i++) {
      const v = chaine[i].r.survie / chaine[i - 1].r.survie - 1;
      apport.set(chaine[i].apporte, Math.max(apport.get(chaine[i].apporte) ?? -1, v));
    }
    compos.push(...chaine);
  }

  // 3. aucune classe strictement dominee. Etre battu sur les deux axes EN SOLO ne
  // suffit pas a conclure : une classe de soutien n'a personne a soutenir en solo.
  // Elle n'est dominee que si elle n'apporte rien non plus a une equipe.
  for (let a = 0; a < CLASSES.length; a++) {
    const sa = mediane(table.filter(r => r.cls === a).map(r => r.survie));
    const da = debits[a].degats;
    for (let b = 0; b < CLASSES.length; b++) {
      if (a === b) continue;
      const sb = mediane(table.filter(r => r.cls === b).map(r => r.survie));
      const db = debits[b].degats;
      if (!(sb > sa * (1 + CLASS_GAP) && db > da * (1 + CLASS_GAP))) continue;
      const ap = apport.get(a);
      if (ap !== undefined && ap > 0) continue;
      soucis.push(`${CLASSES[a].id} est domine par ${CLASSES[b].id} :`
        + ` ${sa.toFixed(0)} s / ${da.toFixed(0)} degats par minute en solo contre`
        + ` ${sb.toFixed(0)} s / ${db.toFixed(0)}`
        + (ap === undefined ? "" : `, et ${(ap * 100).toFixed(0)} % d'apport en equipe`));
    }
  }

  // 4. la composition 1/1/2 doit aller au moins aussi loin que quatre tireurs,
  // sinon le systeme de classes est decoratif en cooperatif.
  for (const di of COMPO_MODES) {
    const chaine = compos.filter(c => c.diffIndex === di);
    const tireurs = chaine[0].r, mixte = chaine[chaine.length - 1].r;
    if (mixte.survie < tireurs.survie * (1 - COMPO_GAP)) {
      soucis.push(`${DIFFICULTIES[di].key} : ${mixte.survie.toFixed(0)} s pour 1/1/2`
        + ` contre ${tireurs.survie.toFixed(0)} s pour quatre tireurs — rien dans la`
        + ` manche ne punit l'absence de tank (le levier est au lot J, pas ici)`);
    }
  }

  return soucis;
}
