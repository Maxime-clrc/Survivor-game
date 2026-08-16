
import { nombre, ordinal, t, tf, tn } from "./i18n.js";
import { fmtM } from "./units.js";
import { RARITY_COLOR } from "./palette.js";

export const RARITY = { COMMUNE: 0, RARE: 1, EPIQUE: 2, LEGENDAIRE: 3 };

export const RARITY_LABEL = ["commune", "rare", "épique", "légendaire"];
export const rarityLabel = i => t(`rarity.${i}`, RARITY_LABEL[i] ?? "");
export { RARITY_COLOR };

export const RARITY_WEIGHT = [60, 28, 10, 1];
export const RARITY_DRIFT = [0.92, 1, 1.18, 1.0];

export const CARD_CFG = {
  PICK_TIME: 30,
  FIRE_INTERVAL_FLOOR: 0.35,
  FIRE_INTERVAL_HARD_FLOOR: 0.20,
  DAMAGE_TAKEN_FLOOR: 0.40,
  BULLET_SPEED_FLOOR: 0.25,

  BOSS_QUALITY: 4,
  QUALITY_PER_LEVEL: 4,
  RARITY_DRIFT_CAP: 6,

  LEGENDARY_LEVELS: [13, 24],
  LEGENDARY_MAX: 2,

  BURN_TIME: 3,
  LIFESTEAL_CAP: 3,

  SHIELD_REGEN_DELAY: 6,
  SHIELD_REGEN_RAMP: 1.8,

  COUNTER_CD: 3,
  COUNTER_RADIUS: 120,

  ORBIT_RADIUS: 74,
  ORBIT_SPEED: 2.2,
  ORBIT_DAMAGE: 25,
  ORBIT_HIT_CD: 0.5,

  PULSAR_RADIUS: 250,
  PULSAR_DAMAGE: 90,

  // bande de rayon EXCLUSIVE, au-dela des lames (`ORBIT_RADIUS`) : a 46 et 30 px
  // les drones orbitaient dans la pile d'anneaux du joueur, qui les recouvrait.
  DRONE_ORBIT: 112,
  DRONE_SPEED: 1.1,
  DRONE_RANGE: 420,
  DRONE_CD: 0.5,
  DRONE_DAMAGE_MUL: 0.6,

  SWARM_ORBIT: 92,
  SWARM_SPEED: 3.1,
  SWARM_DAMAGE: 12,
  SWARM_HIT_CD: 0.6,
  SWARM_RESPAWN: 8,

  FROST_MUL: 0.65,

  HARVEST_HEAL: 5,

  DEATHWAVE_RADIUS: 80,

  CHAIN_TARGETS: 3,
  CHAIN_MUL: 0.4,

  AUTO_TURRET_CD: 45,

  GUARDIAN_CD: 60,
  GUARDIAN_RADIUS: 200,

  INSTINCT_CD: 45,
  INSTINCT_HP: 0.2,
  INSTINCT_TIME: 4,
  INSTINCT_MUL: 0.4,

  FRENZY_STEP: 0.02,
  FRENZY_MAX: 0.60,
  FRENZY_DECAY: 3,

  ZONE_IMMUNITY: 1.5,

  GRENADE_DAMAGE: 110,
  GRENADE_RADIUS: 130,
  GRENADE_SPEED_MUL: 0.55,

  SYMBIOSE_STEP: 0.05,
  AUSTERITE_BONUS: 0.30,
  RESONANCE_STEP: 0.04,
  DETTE_DAMAGE: 0.50,
  DETTE_XP_COST: 0.20,

  BOUNCE_DAMAGE_MUL: 0.75,
  BOUNCE_MAX: 3,
  INERTIA_DECAY: 0.65,
  INERTIA_MIN_MUL: 0.05,

  RAVITAILLEMENT_SCORE: 200,

  REMPART_LARGE_RADIUS: 0.4,
  REMPART_LARGE_TIME: 3,
  ANCRAGE_RADIUS: 220,
  ANCRAGE_TIME: 12,
  ANCRAGE_SHIELD_MUL: 1.5,
  PROVOCATION_LONGUE_TIME: 2,
  PROVOCATION_LONGUE_CD: 4,
  REPRESAILLES_DAMAGE: 40,
  REPRESAILLES_RADIUS: 150,

  // ce que le SOCLE abandonne devient un choix de build : `siphon` reecrit une
  // regle du mode au lieu d'ajuster un nombre, et c'est le registre d'une epique
  SIPHON_RATE: 6,
  SIPHON_DAMAGE: 14,
  BASCULE_VIVE_RATE: 0.25,
  BASCULE_VIVE_TIME: 2,
  VAGUE_LARGE_RADIUS: 0.5,
  TRANSFUSION_RATIO: 0.30,

  SURCHARGE_LONGUE_TIME: 3,
  VULNERABLE_TIME: 4,
  VULNERABLE_MUL: 1.25,

  ANTIDOTE_REDUCTION: 0.40,
  CATALYSEUR_BONUS: 0.15,

  FORGE_PER_LEVEL: 0.05,
  CONSTITUTION_REGEN: 2,
  CELERITE_DASH_CD: 0.20,
  VIF_ARGENT_DAMAGE: 45,
  VIF_ARGENT_RADIUS: 34,

  CRIT_CHANCE: 0.05,
  CRIT_MUL: 2,
  CRIT_CHANCE_CAP: 0.60,

  SINGULARITE_PULL: 26,

  FLUX_PER_KILL: 0.1,

  EXEC_HEAL: 1,

  CONVERT_HP_REF: 100,
  CONVERT_DMG_REF: 200,
  BLINDAGE_OFFENSIF: 0.15,
  FUREUR_DEFENSIVE: 0.10,
  PACTE_STEP: 0.04,
  PACTE_PER: 5,

  ELAN_STEP: 0.01,
  ELAN_MAX: 0.25,
  PACK_STEP: 0.03,
  PACK_MAX: 0.30,
  PACK_RADIUS: 160,
  ALLY_RADIUS: 160,
  CORDEE_STEP: 0.04,
  RELAIS_STEP: 0.30,
  SHIELD_SHARE: 0.25,
  SERMENT_MUL: 0.45,
  SERMENT_TIME: 8,
  PORTE_VOIX_SHARE: 0.60,
  PHALANGE_STEP: 0.08,
  REPERES_STEP: 0.12,
  BOSS_DAMAGE_CAP: 1.6,
  CRAMPONS_STEP: 0.25,
  CONDUCTEUR_DPS: 14,
  TERRAIN_LIFE: 4,
  TERRAIN_DOT: 18,
  FILINS_CHANCE: 0.12,
  FILINS_TIME: 1,
  ETAU_TIME: 0.8,
  NASSE_MUL: 0.40,
  OPPORTUNISTE_DMG: 0.20,
  OPPORTUNISTE_SHARD: 0.30,
  PROSPECTEUR_HEAL: 25,
  FILON_CHANCE: 1 / 3,
  CONTRE_PIED_TIME: 3,
  SILLAGE_HITS: 3,
  TRAQUEUR_BASE: 0.25,
  TRAQUEUR_PER_BAR: 0.10,
  RAGE_STEP: 0.01,
  RAGE_MAX: 30,
  RAGE_TIME: 4,
  ADRENALINE_HP: 0.5,
  ADRENALINE_RATE: 0.25,
  SOUFFLE_HP: 0.25,
  SOUFFLE_DAMAGE: 0.80,

  SKILL3_MIN_LEVEL: 5,
  SKILL3_ANCRE: [
    { r: 120, time: 4,   cd: 26, vuln: 0 },
    { r: 160, time: 5.5, cd: 22, vuln: 0 },
    { r: 200, time: 7,   cd: 18, vuln: 1 },
  ],
  SKILL3_ANCRE_SLOW: 0.40,
  SKILL3_ANCRE_LEASH: 2,
  SKILL3_SANCTUAIRE: [
    { r: 100, time: 5, heal: 8,  cd: 30, purge: 0 },
    { r: 130, time: 7, heal: 12, cd: 26, purge: 0 },
    { r: 160, time: 9, heal: 16, cd: 22, purge: 1 },
  ],
  SKILL3_SALVE: [
    { missiles: 4, mul: 0.55, blastR: 70, blastMul: 0.45, cd: 20, vuln: 0 },
    { missiles: 6, mul: 0.55, blastR: 70, blastMul: 0.45, cd: 17, vuln: 0 },
    { missiles: 8, mul: 0.55, blastR: 85, blastMul: 0.50, cd: 14, vuln: 1 },
  ],
  SALVE_RANGE: 480,
  SALVE_DUMB_TIME: 0.15,
  SALVE_TURN_RATE: 6.0,
  SALVE_SPEED: 620,
  SALVE_LIFE: 2.5,
  SALVE_SPREAD: 0.9,
  SALVE_BOSS_MUL: 0.25,
  // l'acquisition est a 360°, la VISEE departage : un tir a tete chercheuse qui
  // respecte un cone est incoherent, mais on garde le choix du paquet a frapper.
  SALVE_CONE: 0.7,
  SALVE_OFFCONE: 2.2,
  SALVE_RESEEK: 300,

  // un ultime s'annonce : pendant l'amorce le joueur est ENGAGE, l'annulation
  // n'est pas possible.
  SKILL3_WINDUP: 0.35,
};

/* `rang` porte le marqueur de rang : l'ordinal se place a des endroits
   differents selon la langue, donc il ne se concatene pas. */
export const CATEGORIES = [
  { id: "off",     label: "offensif",   rang: "{n} carte offensive" },
  { id: "def",     label: "défensif",   rang: "{n} carte défensive" },
  { id: "soutien", label: "soutien",    rang: "{n} carte de soutien" },
  { id: "zone",    label: "zone",       rang: "{n} carte de zone" },
  { id: "util",    label: "utilitaire", rang: "{n} carte utilitaire" },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const CATEGORY_RANG = Object.fromEntries(CATEGORIES.map(c => [c.id, c.rang]));
export const categoryLabel = id => t(`cardcat.${id}.label`, CATEGORY_LABEL[id] ?? id);

export function cardCategory(card) {
  if (!card) return "util";
  if (card.cat) return card.cat;
  const t = card.tags ?? [];
  if (t.includes("coop")) return "soutien";
  if (t.includes("off")) return "off";
  if (t.includes("def")) return "def";
  return "util";
}

export function categoryCount(owned, cat) {
  let n = 0;
  for (const [id, k] of owned) {
    if (k > 0 && cardCategory(CARD_BY_ID.get(id)) === cat) n += k;
  }
  return n;
}

export const FAMILY_LABEL = {
  degats: "dégâts",
  cadence: "cadence",
  survie: "survie",
  mobilite: "mobilité",
  soutien: "soutien",
};
export const familyLabel = id => t(`cardfam.${id}`, FAMILY_LABEL[id] ?? id);
export const FAMILY_TIERS = 4;


const num = nombre;
const pctAdd = (step, n) => `+${num(step * n * 100)} %`;
const pctCut = (keep, n) => `−${num((1 - Math.pow(keep, n)) * 100)} %`;
const pctUp  = (mul, n) => `+${num((Math.pow(mul, n) - 1) * 100)} %`;
/* Le nom compte, donc il se traduit : le mot francais est la CLE autant que le
   repli, et `tn` choisit la forme dans la langue affichee. */
const plur = (n, mot) => tn(`u.${mot}`, `{n} ${mot}`, `{n} ${mot}s`, n);

/* Les trois familles de 3e competence partagent une phrase : elle s'ecrit une
   fois en francais, avec les memes marqueurs que sa traduction. */
const skill3Ancre = i => {
  const c = CARD_CFG.SKILL3_ANCRE[i];
  return {
    desc: "3ᵉ compétence (touche 3) : ancre au sol de {0} pendant {1} s — "
      + "ennemis ralentis à {2} % et retenus dans le double du rayon",
    vals: () => ({ "0": fmtM(c.r), "1": num(c.time),
                   "2": num(CARD_CFG.SKILL3_ANCRE_SLOW * 100) }),
  };
};
const skill3Sanctuaire = i => {
  const c = CARD_CFG.SKILL3_SANCTUAIRE[i];
  return {
    desc: "3ᵉ compétence (touche 3) : dôme de {0} pendant {1} s — "
      + "{2} PV/s à l'intérieur, les projectiles ennemis qui entrent sont détruits, "
      + "et le lien du soigneur s'accroche à tous les alliés du dôme",
    vals: () => ({ "0": fmtM(c.r), "1": num(c.time), "2": c.heal }),
  };
};
const skill3Salve = i => {
  const c = CARD_CFG.SKILL3_SALVE[i];
  return {
    desc: "3ᵉ compétence (touche 3) : {0} missiles à tête chercheuse dans {1} — "
      + "{2} % de dégâts directs puis un souffle de {3} à {4} %",
    vals: () => ({ "0": c.missiles, "1": fmtM(CARD_CFG.SALVE_RANGE),
                   "2": num(c.mul * 100), "3": fmtM(c.blastR),
                   "4": num(c.blastMul * 100) }),
  };
};
const suffixe = (d, s) => ({ desc: d.desc + s, vals: d.vals });


export const CARDS = [
  {
    id: "ressort", nom: "Ressort de détente", rarity: 0, max: 5, tags: ["off", "cadence"],
    desc: "−8 % d'intervalle de tir",
    stack: n => pctCut(0.92, n),
    apply(m, n) { m.fireIntervalMul *= Math.pow(0.92, n); },
  },
  {
    id: "blindage", nom: "Plaque de blindage", rarity: 0, max: 5, tags: ["def"],
    desc: "+20 PV max, soigne d'autant",
    stack: n => tf("cards.blindage.stack", "+{0} PV", { "0": 20 * n }),
    apply(m, n) { m.maxHpBonus += 20 * n; },
  },
  {
    id: "poudre", nom: "Poudre dense", rarity: 0, max: 3, tags: ["off"],
    desc: "+12 % de vitesse des balles",
    stack: n => pctAdd(0.12, n),
    apply(m, n) { m.bulletSpeedMul += 0.12 * n; },
  },
  {
    id: "canonLong", nom: "Canon long", rarity: 0, max: 3, tags: ["off"],
    desc: "+25 % de portée",
    stack: n => pctAdd(0.25, n),
    apply(m, n) { m.bulletLifeMul += 0.25 * n; },
  },
  {
    id: "trousse", nom: "Trousse de secours", rarity: 0, max: 3, tags: ["coop"],
    family: "soutien", tier: 0,
    desc: "réanimation 25 % plus rapide",
    stack: n => pctAdd(0.25, n),
    apply(m, n) { m.reviveSpeedMul += 0.25 * n; },
  },
  {
    id: "convalescence", nom: "Convalescence", rarity: 0, max: 3, tags: ["def"],
    desc: "+8 PV rendus à chaque boss tué",
    stack: n => tf("cards.convalescence.stack", "+{0} PV", { "0": 8 * n }),
    apply(m, n) { m.healPerBoss += 8 * n; },
  },
  {
    id: "poches", nom: "Poches larges", rarity: 0, max: 1, tags: ["def"],
    desc: "ramasse les bonus au sol à {0}",
    vals: () => ({ "0": fmtM(120) }),
    apply(m) { m.pickupRadius = Math.max(m.pickupRadius, 120); },
  },
  {
    id: "bourse", nom: "Bourse", rarity: 0, max: 3, tags: ["util"],
    desc: "+25 % d'éclats récoltés",
    stack: n => pctAdd(0.25, n),
    apply(m, n) { m.shardMul += 0.25 * n; },
  },

  {
    id: "culasse", nom: "Culasse allégée", rarity: 0, max: 6, tags: ["off", "cadence"],
    family: "cadence", tier: 0,
    desc: "−7 % d'intervalle de tir",
    stack: n => pctCut(0.93, n),
    apply(m, n) { m.fireIntervalMul *= Math.pow(0.93, n); },
  },
  {
    id: "plaquage", nom: "Plaquage", rarity: 0, max: 6, tags: ["def"],
    family: "survie", tier: 0,
    desc: "+18 PV max, soigne d'autant",
    stack: n => tf("cards.plaquage.stack", "+{0} PV", { "0": 18 * n }),
    apply(m, n) { m.maxHpBonus += 18 * n; },
  },
  {
    id: "affutage", nom: "Affûtage", rarity: 0, max: 6, tags: ["off"],
    family: "degats", tier: 0,
    desc: "+12 % de dégâts",
    stack: n => pctAdd(0.12, n),
    apply(m, n) { m.damageMul += 0.12 * n; },
  },
  {
    id: "foulee", nom: "Foulée", rarity: 0, max: 5, tags: ["def"],
    family: "mobilite", tier: 0,
    desc: "+7 % de vitesse de déplacement",
    stack: n => pctAdd(0.07, n),
    apply(m, n) { m.speedMul += 0.07 * n; },
  },

  {
    id: "precision", nom: "Précision", rarity: 0, max: 3, tags: ["off"],
    desc: "+6 % de chance de coup critique",
    stack: n => pctAdd(0.06, n),
    apply(m, n) { m.critChance += 0.06 * n; },
  },
  {
    id: "expansion", nom: "Expansion", rarity: 0, max: 4, tags: ["off"], cat: "zone",
    desc: "+8 % de rayon sur tes explosions, ondes et auras",
    stack: n => pctAdd(0.08, n),
    apply(m, n) { m.areaMul += 0.08 * n; },
  },
  {
    id: "condensateur", nom: "Condensateur", rarity: 0, max: 5, tags: ["def"],
    desc: "−7 % de recharge des compétences",
    stack: n => pctCut(0.93, n),
    apply(m, n) { m.skillCdMul *= Math.pow(0.93, n); },
  },
  {
    id: "elan", nom: "Élan", rarity: 0, max: 3, tags: ["off"],
    desc: "+1 % de dégâts par seconde sans être touché, jusqu'à +25 %",
    stack: n => tf("cards.elan.stack", "jusqu'à {0}", { "0": pctAdd(CARD_CFG.ELAN_MAX, n) }),
    apply(m, n) { m.elanStep += CARD_CFG.ELAN_STEP * n; m.elanMax += CARD_CFG.ELAN_MAX * n; },
  },
  {
    id: "lest", nom: "Lest", rarity: 0, max: 5, tags: ["off", "def"],
    desc: "+5 % de dégâts et +5 % de PV max",
    stack: n => tf("cards.lest.stack", "{0} de dégâts, +{1} % de PV", { "0": pctAdd(0.05, n), "1": 5 * n }),
    apply(m, n) { m.damageMul += 0.05 * n; m.maxHpRatio += 0.05 * n; },
  },
  {
    id: "rodage", nom: "Rodage", rarity: 0, max: 5, tags: ["def"],
    desc: "−5 % de recharge des compétences et +5 % de vitesse",
    stack: n => tf("cards.rodage.stack", "{0} de recharge, {1} de vitesse", { "0": pctCut(0.95, n), "1": pctAdd(0.05, n) }),
    apply(m, n) { m.skillCdMul *= Math.pow(0.95, n); m.speedMul += 0.05 * n; },
  },
  {
    id: "chargeur_long", nom: "Chargeur long", rarity: 0, max: 4, tags: ["off"],
    desc: "+10 % de portée et +8 % de vitesse des balles",
    stack: n => tf("cards.chargeur_long.stack", "{0} de portée, {1} de vitesse", { "0": pctAdd(0.10, n), "1": pctAdd(0.08, n) }),
    apply(m, n) { m.bulletLifeMul += 0.10 * n; m.bulletSpeedMul += 0.08 * n; },
  },
  {
    id: "ferraille", nom: "Ferraille", rarity: 0, max: 4, tags: ["def", "util"],
    desc: "+1 PV par ennemi tué et +15 % de portée de ramassage",
    stack: n => tf("cards.ferraille.stack", "+{0} PV par kill, {1} de portée", { "0": n, "1": pctAdd(0.15, n) }),
    apply(m, n) { m.hpPerKill += n; m.pickupRadiusMul += 0.15 * n; },
  },

  {
    id: "reserve", nom: "Réserve", rarity: 0, max: 4, tags: ["def"],
    desc: "12 points de bouclier, se recharge après 6 s sans dégât subi",
    stack: n => tf("cards.reserve.stack", "{0} points", { "0": 12 * n }),
    apply(m, n) { m.shieldPool += 12 * n; },
  },
  {
    id: "braises", nom: "Braises", rarity: 0, max: 3, tags: ["off"],
    desc: "brûlure : 3 dégâts sur 3 s",
    stack: n => tf("cards.braises.stack", "{0} dégâts", { "0": 3 * n }),
    apply(m, n) { m.burnDmg += 3 * n; },
  },
  {
    id: "sangles", nom: "Sangles", rarity: 0, max: 4, tags: ["def"],
    desc: "−4 % de dégâts subis",
    stack: n => pctCut(0.96, n),
    apply(m, n) { m.damageTakenMul *= Math.pow(0.96, n); },
  },
  {
    id: "stimulant", nom: "Stimulant", rarity: 0, max: 4, tags: ["def"],
    desc: "−8 % de recharge d'esquive",
    stack: n => pctCut(0.92, n),
    apply(m, n) { m.dashCdMul *= Math.pow(0.92, n); },
  },


  {
    id: "calibre", nom: "Calibre supérieur", rarity: 1, max: 4, tags: ["off"],
    family: "degats", tier: 1,
    desc: "+25 % de dégâts",
    stack: n => pctAdd(0.25, n),
    apply(m, n) { m.damageMul += 0.25 * n; },
  },
  {
    id: "semelles", nom: "Semelles légères", rarity: 1, max: 3, tags: ["def"],
    family: "mobilite", tier: 1,
    desc: "+14 % de vitesse de déplacement",
    stack: n => pctAdd(0.14, n),
    apply(m, n) { m.speedMul += 0.14 * n; },
  },
  {
    id: "cuir", nom: "Cuir épais", rarity: 1, max: 4, tags: ["def"],
    family: "survie", tier: 1,
    desc: "−10 % de dégâts subis",
    stack: n => pctCut(0.9, n),
    apply(m, n) { m.damageTakenMul *= Math.pow(0.9, n); },
  },

  {
    id: "perforation", nom: "Perforation", rarity: 1, max: 2, tags: ["off"],
    incompatible: ["railgun"],
    desc: "les balles traversent 1 ennemi de plus",
    stack: n => tn("cards.perforation.stack", "{n} ennemi de plus", "{n} ennemis de plus", n),
    apply(m, n) { m.pierce += n; },
  },
  {
    id: "secondCanon", nom: "Second canon", rarity: 1, max: 2, tags: ["off"],
    desc: "+1 balle en éventail, −18 % de dégâts par balle",
    stack: n => tf("cards.secondCanon.stack", "+{0}, {1} par balle", { "0": plur(n, "balle"), "1": pctCut(0.82, n) }),
    apply(m, n) { m.extraBarrels += n; m.barrelDamageMul *= Math.pow(0.82, n); },
  },
  {
    id: "bouclierRegen", nom: "Bouclier régénérant", rarity: 1, max: 3, tags: ["def"],
    desc: "30 points de bouclier, se recharge après 6 s sans dégât subi",
    stack: n => tf("cards.bouclierRegen.stack", "{0} points", { "0": 30 * n }),
    apply(m, n) { m.shieldPool += 30 * n; },
  },
  {
    id: "vampirisme", nom: "Vampirisme", rarity: 1, max: 3, tags: ["def"],
    desc: "2 % des dégâts infligés rendus en PV (max 3 PV/s)",
    stack: n => tf("cards.vampirisme.stack", "{0} %", { "0": num(2 * n) }),
    apply(m, n) { m.lifesteal += 0.02 * n; },
  },
  {
    id: "incendiaire", nom: "Munitions incendiaires", rarity: 1, max: 2, tags: ["off"],
    desc: "brûlure : 8 dégâts sur 3 s",
    stack: n => tf("cards.incendiaire.stack", "{0} dégâts", { "0": 8 * n }),
    apply(m, n) { m.burnDmg += 8 * n; },
  },
  {
    id: "ricochet", nom: "Ricochet", rarity: 1, max: 2, tags: ["off"],
    desc: "à la mort d'un ennemi, la balle rebondit une fois",
    stack: n => tf("cards.ricochet.stack", "{0}", { "0": plur(n, "rebond") }),
    apply(m, n) { m.chain += n; },
  },
  {
    id: "secondSouffle", nom: "Second souffle", rarity: 1, max: 1, tags: ["def"],
    desc: "la première mise à terre de la manche se relève seule à 30 PV",
    apply(m) { m.selfRevive = 1; },
  },
  {
    id: "reanimateur", nom: "Réanimateur", rarity: 1, max: 1, tags: ["coop"],
    family: "soutien", tier: 1,
    desc: "rayon de réanimation ×1,6, relève à 70 % des PV, +10 PV max",
    apply(m) { m.reviveRadiusMul += 0.6; m.reviveHpRatio = Math.max(m.reviveHpRatio, 0.7); m.maxHpBonus += 10; },
  },
  {
    id: "contreAttaque", nom: "Contre-attaque", rarity: 1, max: 2, tags: ["def"], cat: "zone",
    desc: "encaisser déclenche une nova de 60 dégâts sur {0} (recharge 3 s)",
    vals: () => ({ "0": fmtM(CARD_CFG.COUNTER_RADIUS) }),
    stack: n => tf("cards.contreAttaque.stack", "{0} dégâts", { "0": 60 * n }),
    apply(m, n) { m.counterNova += 60 * n; },
  },
  {
    id: "cadence", nom: "Cadence accélérée", rarity: 1, max: 3, tags: ["off", "cadence"],
    family: "cadence", tier: 1,
    desc: "−16 % d'intervalle de tir",
    stack: n => pctCut(0.84, n),
    apply(m, n) { m.fireIntervalMul *= Math.pow(0.84, n); },
  },
  {
    id: "ballesLourdes", nom: "Balles lourdes", rarity: 1, max: 2, tags: ["off"],
    desc: "+35 % de dégâts, −20 % de cadence",
    stack: n => tf("cards.ballesLourdes.stack", "{0} de dégâts, {1} d'intervalle", { "0": pctAdd(0.35, n), "1": pctUp(1.25, n) }),
    apply(m, n) { m.damageMul += 0.35 * n; m.fireIntervalMul *= Math.pow(1.25, n); },
  },
  {
    id: "talon", nom: "Talon de fer", rarity: 1, max: 1, tags: ["def"],
    desc: "immunité aux zones pendant 1,5 s après en avoir subi une",
    apply(m) { m.zoneImmunity = CARD_CFG.ZONE_IMMUNITY; },
  },
  {
    id: "antidote", nom: "Antidote", rarity: 1, max: 2, tags: ["def"],
    desc: "les états durent 40 % moins longtemps sur soi",
    stack: n => pctCut(1 - CARD_CFG.ANTIDOTE_REDUCTION, n),
    apply(m, n) { m.statusTimeMul *= Math.pow(1 - CARD_CFG.ANTIDOTE_REDUCTION, n); },
  },
  {
    id: "tourelleAppui", nom: "Tourelle d'appui", rarity: 1, max: 2, tags: ["off"],
    desc: "pose une tourelle automatique toutes les 45 s",
    stack: n => tf("cards.tourelleAppui.stack", "toutes les {0} s", { "0": num(CARD_CFG.AUTO_TURRET_CD / n) }),
    apply(m, n) { m.autoTurretCd = CARD_CFG.AUTO_TURRET_CD / n; },
  },

  {
    id: "mire", nom: "Mire", rarity: 1, max: 2, tags: ["off"],
    desc: "+12 % de chance de coup critique",
    stack: n => pctAdd(0.12, n),
    apply(m, n) { m.critChance += 0.12 * n; },
  },
  {
    id: "talon_faible", nom: "Talon faible", rarity: 1, max: 2, tags: ["off"],
    desc: "+40 % de dégâts critiques",
    stack: n => pctAdd(0.40, n),
    effective: (ctx, n) => tf("cards.talon_faible.eff",
      "critique actuellement ×{0}", { "0": num(CARD_CFG.CRIT_MUL + 0.4 * n) }),
    apply(m, n) { m.critMul += 0.40 * n; },
  },
  {
    id: "deflagration", nom: "Déflagration", rarity: 1, max: 3, tags: ["off"], cat: "zone",
    desc: "+20 % de rayon sur tes explosions, ondes et auras",
    stack: n => pctAdd(0.20, n),
    apply(m, n) { m.areaMul += 0.20 * n; },
  },
  {
    id: "surtension", nom: "Surtension", rarity: 1, max: 3, tags: ["def"],
    desc: "−15 % de recharge des compétences",
    stack: n => pctCut(0.85, n),
    apply(m, n) { m.skillCdMul *= Math.pow(0.85, n); },
  },
  {
    id: "achevement", nom: "Achèvement", rarity: 1, max: 2, tags: ["off"],
    desc: "les ennemis sous 12 % de PV meurent instantanément",
    stack: n => tf("cards.achevement.stack", "sous {0} %", { "0": num(12 + 4 * (n - 1)) }),
    apply(m, n) { m.execThreshold = Math.max(m.execThreshold, 0.12 + 0.04 * (n - 1)); },
  },
  {
    id: "meute", nom: "Meute", rarity: 1, max: 2, tags: ["off"],
    desc: "+3 % de dégâts par ennemi à moins de {0}, jusqu'à +30 %",
    vals: () => ({ "0": fmtM(CARD_CFG.PACK_RADIUS) }),
    stack: n => tf("cards.meute.stack", "jusqu'à {0}", { "0": pctAdd(CARD_CFG.PACK_MAX, n) }),
    apply(m, n) { m.packStep += CARD_CFG.PACK_STEP * n; m.packMax += CARD_CFG.PACK_MAX * n; },
  },
  {
    id: "carnage", nom: "Carnage", rarity: 1, max: 2, tags: ["off"],
    desc: "chaque ennemi tué donne +1 % de dégâts pendant 4 s, jusqu'à 30 fois",
    stack: n => tf("cards.carnage.stack", "jusqu'à {0}", { "0": pctAdd(CARD_CFG.RAGE_STEP * CARD_CFG.RAGE_MAX, n) }),
    apply(m, n) { m.ragePerKill += CARD_CFG.RAGE_STEP * n; },
  },
  {
    id: "adrenaline", nom: "Adrénaline", rarity: 1, max: 2, tags: ["off", "cadence"],
    desc: "+25 % de cadence sous 50 % de PV",
    stack: n => pctAdd(CARD_CFG.ADRENALINE_RATE, n),
    apply(m, n) { m.lowHpRate += CARD_CFG.ADRENALINE_RATE * n; },
  },

  {
    id: "symbiose", nom: "Symbiose", rarity: 1, max: 2, tags: ["off"],
    desc: "+5 % de dégâts par carte défensive possédée",
    effective: (ctx, n) => tf("cards.symbiose.eff",
      "{0} — actuellement {1} de dégâts",
      { "0": tn("u.carteDef", "{n} carte défensive", "{n} cartes défensives", ctx.defensive),
        "1": pctAdd(CARD_CFG.SYMBIOSE_STEP * ctx.defensive, n) }),
    apply() {},
    applyAfter(m, n, ctx) { m.damageMul += CARD_CFG.SYMBIOSE_STEP * n * ctx.defensive; },
  },
  {
    id: "austerite", nom: "Austérité", rarity: 1, max: 1, tags: ["off"],
    desc: "+30 % de dégâts tant qu'aucune épique ni légendaire n'est prise",
    effective: ctx => ctx.topRarity < RARITY.EPIQUE
      ? t("cards.austerite.eff.libre",
          "aucune épique ni légendaire possédée — actuellement +30 % de dégâts")
      : tf("cards.austerite.eff.prise",
          "une {0} est déjà prise — actuellement sans effet",
          { "0": rarityLabel(ctx.topRarity) }),
    apply() {},
    applyAfter(m, n, ctx) {
      if (ctx.topRarity < RARITY.EPIQUE) m.damageMul += CARD_CFG.AUSTERITE_BONUS;
    },
  },
  {
    id: "surcharge_orbitale", nom: "Surcharge orbitale", rarity: 1, max: 2, tags: ["off"],
    requires: ["orbiteurs"],
    desc: "+60 % aux dégâts des lames orbitales",
    stack: n => pctAdd(0.60, n),
    apply(m, n) { m.orbiterDamageMul += 0.60 * n; },
  },
  {
    id: "munition_dense", nom: "Munition dense", rarity: 1, max: 2, tags: ["off"],
    desc: "+40 % de dégâts, −25 % de vitesse des balles",
    stack: n => tf("cards.munition_dense.stack", "{0} de dégâts, −{1} % de vitesse", { "0": pctAdd(0.40, n), "1": num(25 * n) }),
    apply(m, n) { m.damageMul += 0.40 * n; m.bulletSpeedMul -= 0.25 * n; },
  },

  {
    id: "orbiteurs", nom: "Orbiteurs", rarity: 2, max: 3, tags: ["off"],
    desc: "2 lames tournantes à {0}, 25 dégâts au contact",
    vals: () => ({ "0": fmtM(CARD_CFG.ORBIT_RADIUS) }),
    stack: n => tf("cards.orbiteurs.stack", "{0}", { "0": plur(2 * n, "lame") }),
    apply(m, n) { m.orbiters += 2 * n; },
  },
  {
    id: "salveArriere", nom: "Salve arrière", rarity: 2, max: 1, tags: ["off"],
    desc: "chaque tir envoie aussi une balle à 180°, dégâts à 70 %",
    apply(m) { m.backShot = 1; },
  },
  {
    id: "foudre", nom: "Chaîne de foudre", rarity: 2, max: 2, tags: ["off"],
    desc: "15 % de chance qu'un impact arce sur 3 ennemis",
    stack: n => tf("cards.foudre.stack", "{0} %", { "0": num(15 * n) }),
    apply(m, n) { m.chainChance += 0.15 * n; },
  },
  {
    id: "pulsar", nom: "Pulsar", rarity: 2, max: 2, tags: ["off"], cat: "zone",
    desc: "toutes les 12 s, onde automatique de 90 dégâts sur {0}",
    vals: () => ({ "0": fmtM(CARD_CFG.PULSAR_RADIUS) }),
    stack: n => tf("cards.pulsar.stack", "toutes les {0} s", { "0": num(12 / n) }),
    apply(m, n) { m.pulsarCd = 12 / n; },
  },
  {
    id: "drone", nom: "Drone de soutien", rarity: 2, max: 2, tags: ["off"],
    desc: "un drone vous suit et tire seul à 60 % de vos dégâts",
    stack: n => tf("cards.drone.stack", "{0}", { "0": plur(n, "drone") }),
    apply(m, n) { m.drones += n; },
  },
  {
    id: "titane", nom: "Peau de titane", rarity: 2, max: 2, tags: ["def"],
    family: "survie", tier: 2,
    desc: "+40 PV max, −6 % de vitesse",
    stack: n => tf("cards.titane.stack", "+{0} PV, −{1} % de vitesse", { "0": 40 * n, "1": num(6 * n) }),
    apply(m, n) { m.maxHpBonus += 40 * n; m.speedMul -= 0.06 * n; },
  },

  {
    id: "canon_surdimensionne", nom: "Canon surdimensionné", rarity: 2, max: 2, tags: ["off"],
    family: "degats", tier: 2,
    desc: "+45 % de dégâts",
    stack: n => pctAdd(0.45, n),
    apply(m, n) { m.damageMul += 0.45 * n; },
  },
  {
    id: "rotative", nom: "Rotative", rarity: 2, max: 2, tags: ["off", "cadence"],
    family: "cadence", tier: 2,
    desc: "−28 % d'intervalle de tir",
    stack: n => pctCut(0.72, n),
    apply(m, n) { m.fireIntervalMul *= Math.pow(0.72, n); },
  },
  {
    id: "celerite", nom: "Célérité", rarity: 2, max: 2, tags: ["def"],
    family: "mobilite", tier: 2,
    desc: "+22 % de vitesse, −20 % de recharge d'esquive",
    stack: n => tf("cards.celerite.stack", "{0} de vitesse, {1} de recharge", { "0": pctAdd(0.22, n), "1": pctCut(1 - CARD_CFG.CELERITE_DASH_CD, n) }),
    apply(m, n) {
      m.speedMul += 0.22 * n;
      m.dashCdMul *= Math.pow(1 - CARD_CFG.CELERITE_DASH_CD, n);
    },
  },
  {
    id: "angeGardien", nom: "Ange gardien", rarity: 2, max: 1, tags: ["coop"],
    family: "soutien", tier: 2,
    desc: "un allié qui tombe à moins de {0} est relevé instantanément (60 s)",
    vals: () => ({ "0": fmtM(CARD_CFG.GUARDIAN_RADIUS) }),
    apply(m) { m.guardianCd = CARD_CFG.GUARDIAN_CD; },
  },
  {
    id: "frenesie", nom: "Frénésie", rarity: 2, max: 1, tags: ["off"],
    desc: "chaque kill donne +2 % de cadence, jusqu'à +60 %",
    apply(m) { m.frenzy = 1; },
  },
  {
    id: "givre", nom: "Champ de givre", rarity: 2, max: 2, tags: ["def"], cat: "zone",
    desc: "aura de {0}, ennemis à 65 % de vitesse",
    vals: () => ({ "0": fmtM(160) }),
    stack: n => tf("cards.givre.stack", "aura de {0}", { "0": fmtM(160 * (1 + 0.35 * (n - 1))) }),
    apply(m, n) { m.frostRadius = Math.max(m.frostRadius, 160 * (1 + 0.35 * (n - 1))); },
  },
  {
    id: "recolte", nom: "Récolte", rarity: 2, max: 2, tags: ["def"],
    desc: "8 % des ennemis tués laissent un fragment de 5 PV",
    stack: n => tf("cards.recolte.stack", "{0} %", { "0": num(8 * n) }),
    apply(m, n) { m.harvest += 0.08 * n; },
  },
  {
    id: "ondeMort", nom: "Onde de mort", rarity: 2, max: 2, tags: ["off"], cat: "zone",
    desc: "tuer un ennemi déclenche 25 dégâts sur {0} autour de lui",
    vals: () => ({ "0": fmtM(CARD_CFG.DEATHWAVE_RADIUS) }),
    stack: n => tf("cards.ondeMort.stack", "{0} dégâts", { "0": 25 * n }),
    apply(m, n) { m.deathWave += 25 * n; },
  },
  {
    id: "catalyseur", nom: "Catalyseur", rarity: 2, max: 2, tags: ["off"],
    desc: "+15 % de dégâts contre un ennemi affecté par un état",
    stack: n => pctAdd(CARD_CFG.CATALYSEUR_BONUS, n),
    effective: () => t("cards.catalyseur.eff",
      "n'agit que sur une cible brûlée, gelée ou vulnérable"),
    apply(m, n) { m.catalyseur += CARD_CFG.CATALYSEUR_BONUS * n; },
  },

  {
    id: "oeil_de_faucon", nom: "Œil de faucon", rarity: 2, max: 1, tags: ["off"],
    desc: "+20 % de chance et +50 % de dégâts critiques",
    stack: n => tf("cards.oeil_de_faucon.stack", "{0} de chance, {1} de dégâts", { "0": pctAdd(0.20, n), "1": pctAdd(0.50, n) }),
    apply(m, n) { m.critChance += 0.20 * n; m.critMul += 0.50 * n; },
  },
  {
    id: "singularite", nom: "Singularité", rarity: 2, max: 1, tags: ["off"], cat: "zone",
    desc: "+35 % de rayon, et tes explosions aspirent les ennemis vers leur centre",
    apply(m) { m.areaMul += 0.35; m.areaPull = 1; },
  },
  {
    id: "flux_continu", nom: "Flux continu", rarity: 2, max: 1, tags: ["def"],
    desc: "−25 % de recharge des compétences, et chaque kill en retire 0,1 s",
    apply(m) { m.skillCdMul *= 0.75; m.cdPerKill += CARD_CFG.FLUX_PER_KILL; },
  },
  {
    id: "moisson", nom: "Moisson", rarity: 2, max: 1, tags: ["off", "def"],
    desc: "les ennemis sous 20 % de PV meurent instantanément, et rendent 1 PV",
    apply(m) {
      m.execThreshold = Math.max(m.execThreshold, 0.20);
      m.execHeal += CARD_CFG.EXEC_HEAL;
    },
  },
  {
    id: "blindage_offensif", nom: "Blindage offensif", rarity: 2, max: 1, tags: ["off", "def"],
    desc: "{0} % de tes PV max s'ajoutent à tes dégâts",
    vals: () => ({ "0": Math.round(CARD_CFG.BLINDAGE_OFFENSIF * 100) }),
    apply(m) { m.hpToDamage += CARD_CFG.BLINDAGE_OFFENSIF; },
  },
  {
    id: "fureur_defensive", nom: "Fureur défensive", rarity: 2, max: 1, tags: ["off", "def"],
    desc: "{0} % de tes dégâts s'ajoutent à tes PV max",
    vals: () => ({ "0": Math.round(CARD_CFG.FUREUR_DEFENSIVE * 100) }),
    apply(m) { m.damageToHp += CARD_CFG.FUREUR_DEFENSIVE; },
  },
  {
    id: "dernier_souffle", nom: "Dernier souffle", rarity: 2, max: 1, tags: ["off"],
    desc: "+80 % de dégâts sous 25 % de PV",
    apply(m) { m.lowHpDamage += CARD_CFG.SOUFFLE_DAMAGE; },
  },

  {
    id: "rebond", nom: "Balles rebondissantes", rarity: 2, max: 1, tags: ["off"],
    desc: "les balles rebondissent sur les bords, −25 % de dégâts par rebond",
    apply(m) { m.bounce = 1; },
  },
  {
    id: "inertie", nom: "Inertie", rarity: 2, max: 1, tags: ["off"],
    desc: "les balles ne s'arrêtent plus, −35 % de dégâts par ennemi traversé",
    incompatible: ["railgun"],
    apply(m) { m.inertia = 1; },
  },
  {
    id: "resonance", nom: "Résonance", rarity: 2, max: 2, tags: ["off"],
    desc: "chaque carte de cadence donne aussi +4 % de dégâts",
    effective: (ctx, n) => tf("cards.resonance.eff",
      "{0} — actuellement {1} de dégâts",
      { "0": tn("u.carteCad", "{n} carte de cadence", "{n} cartes de cadence", ctx.cadence),
        "1": pctAdd(CARD_CFG.RESONANCE_STEP * ctx.cadence, n) }),
    apply() {},
    applyAfter(m, n, ctx) { m.damageMul += CARD_CFG.RESONANCE_STEP * n * ctx.cadence; },
  },
  {
    id: "dette", nom: "Dette", rarity: 2, max: 1, tags: ["off"],
    desc: "+50 % de dégâts, mais les niveaux de l'équipe coûtent 20 % de plus",
    apply(m) { m.damageMul += CARD_CFG.DETTE_DAMAGE; m.xpCostMul *= 1 + CARD_CFG.DETTE_XP_COST; },
  },

  {
    id: "dispersion", nom: "Fusil à dispersion", rarity: 3, max: 1, tags: ["off"],
    desc: "remplace le tir : 5 balles en cône, 55 % de dégâts chacune",
    remplaceArme: true,
    incompatible: ["railgun", "grenade"],
    apply(m) { m.weapon = "dispersion"; m.fireIntervalMul *= 1.6; },
  },
  {
    id: "railgun", nom: "Railgun", rarity: 3, max: 1, tags: ["off"],
    desc: "remplace le tir : traverse tout, ×3 dégâts, cadence divisée par 2,5",
    remplaceArme: true,
    incompatible: ["dispersion", "grenade", "perforation", "inertie"],
    apply(m) { m.weapon = "railgun"; m.damageMul += 2; m.fireIntervalMul *= 2.5; m.bulletSpeedMul += 1; },
  },
  {
    id: "grenade", nom: "Lance-grenades", rarity: 3, max: 1, tags: ["off"],
    desc: "remplace le tir : projectile lent qui explose sur {0}",
    vals: () => ({ "0": fmtM(CARD_CFG.GRENADE_RADIUS) }),
    remplaceArme: true,
    incompatible: ["dispersion", "railgun"],
    apply(m) { m.weapon = "grenade"; m.fireIntervalMul *= 2.2; },
  },
  {
    id: "echo", nom: "Écho", rarity: 3, max: 1, tags: ["off"],
    desc: "20 % de chance que chaque balle soit tirée en double",
    apply(m) { m.echoChance = 0.2; },
  },
  {
    id: "instinct", nom: "Instinct de survie", rarity: 3, max: 1, tags: ["def"],
    desc: "sous 20 PV, ralentit tous les ennemis pendant 4 s (45 s)",
    apply(m) { m.instinctCd = CARD_CFG.INSTINCT_CD; },
  },
  {
    id: "contrat", nom: "Contrat de sang", rarity: 3, max: 1, tags: ["off"],
    desc: "+80 % de dégâts, mais PV max plafonnés à 60",
    apply(m) { m.damageMul += 0.8; m.hpCap = 60; },
  },
  {
    id: "essaim", nom: "Essaim", rarity: 3, max: 1, tags: ["off"],
    desc: "4 mini-drones orbitants, 12 dégâts chacun",
    apply(m) { m.swarm = 4; },
  },

  {
    id: "sentence_capitale", nom: "Sentence capitale", rarity: 3, max: 1, tags: ["off"],
    desc: "tes coups critiques traversent la cible et la rendent vulnérable",
    apply(m) { m.critVuln = 1; },
  },
  {
    id: "pacte_de_fer", nom: "Pacte de fer", rarity: 3, max: 1, tags: ["off"],
    desc: "ton bouclier ne se régénère plus, mais tes dégâts montent de {0} % par tranche de {1} points de bouclier maximum",
    vals: () => ({ "0": Math.round(CARD_CFG.PACTE_STEP * 100), "1": CARD_CFG.PACTE_PER }),
    effective: () => t("cards.pacte_de_fer.eff",
      "sans carte de bouclier, elle ne fait rien"),
    apply(m) { m.shieldToDamage = 1; m.noShieldRegen = 1; },
  },

  {
    id: "coeur_forge", nom: "Cœur de forge", rarity: 3, max: 1, tags: ["off"],
    family: "degats", tier: 3,
    desc: "+80 % de dégâts, et +5 % de plus par niveau d'équipe",
    apply(m) { m.damageMul += 0.80; m.damagePerLevel += CARD_CFG.FORGE_PER_LEVEL; },
  },
  {
    id: "chaine_assaut", nom: "Chaîne d'assaut", rarity: 3, max: 1, tags: ["off", "cadence"],
    family: "cadence", tier: 3,
    desc: "−40 % d'intervalle de tir, et la surchauffe ne s'applique plus",
    apply(m) { m.fireIntervalMul *= 0.60; m.noOverheat = 1; },
  },
  {
    id: "constitution", nom: "Constitution", rarity: 3, max: 1, tags: ["def"],
    family: "survie", tier: 3,
    desc: "+80 PV max et {0} PV par seconde",
    vals: () => ({ "0": CARD_CFG.CONSTITUTION_REGEN }),
    apply(m) { m.maxHpBonus += 80; m.hpRegen += CARD_CFG.CONSTITUTION_REGEN; },
  },
  {
    id: "vif_argent", nom: "Vif-argent", rarity: 3, max: 1, tags: ["off", "def"],
    family: "mobilite", tier: 3,
    desc: "l'esquive laisse une traînée de {0} dégâts sur {1}",
    vals: () => ({ "0": CARD_CFG.VIF_ARGENT_DAMAGE, "1": fmtM(CARD_CFG.VIF_ARGENT_RADIUS) }),
    apply(m) { m.dashTrail += CARD_CFG.VIF_ARGENT_DAMAGE; },
  },
  {
    id: "voeu_partage", nom: "Vœu partagé", rarity: 3, max: 1, tags: ["coop"],
    family: "soutien", tier: 3,
    desc: "vos cartes de soutien profitent aussi à toute l'équipe",
  },


  {
    id: "rempart_large", nom: "Rempart élargi", rarity: 1, max: 1, tags: ["def", "coop"],
    cls: "tank",
    desc: "rempart : rayon ×1,4 et +3 s de durée",
    apply(m) {
      m.bulwarkRadiusMul += CARD_CFG.REMPART_LARGE_RADIUS;
      m.bulwarkTime += CARD_CFG.REMPART_LARGE_TIME;
    },
  },
  {
    id: "ancrage", nom: "Ancrage", rarity: 1, max: 1, tags: ["def", "coop"],
    cls: "tank",
    desc: "rempart posé au sol : {0}, {1} s, +50 % de bouclier par seconde",
    vals: () => ({ "0": fmtM(CARD_CFG.ANCRAGE_RADIUS), "1": CARD_CFG.ANCRAGE_TIME }),
    apply(m) { m.bulwarkAnchor = 1; },
  },
  {
    id: "provocation_longue", nom: "Provocation prolongée", rarity: 1, max: 1, tags: ["def", "coop"],
    cls: "tank",
    desc: "provocation : +2 s de durée, −4 s de recharge",
    apply(m) {
      m.tauntTime += CARD_CFG.PROVOCATION_LONGUE_TIME;
      m.tauntCd -= CARD_CFG.PROVOCATION_LONGUE_CD;
    },
  },
  {
    id: "carapace", nom: "Carapace", rarity: 2, max: 1, tags: ["def"],
    cls: "tank",
    desc: "le bouclier du rempart s'applique au tank même hors de sa zone",
    apply(m) { m.carapace = 1; },
  },
  {
    id: "represailles", nom: "Représailles", rarity: 2, max: 1, tags: ["def", "off"],
    cls: "tank",
    desc: "encaisser pendant la provocation renvoie 40 dégâts sur {0}",
    vals: () => ({ "0": fmtM(CARD_CFG.REPRESAILLES_RADIUS) }),
    apply(m) { m.represailles += CARD_CFG.REPRESAILLES_DAMAGE; },
  },

  {
    id: "ramification", nom: "Ramification", rarity: 1, max: 1, tags: ["coop"],
    cls: "soigneur",
    desc: "un lien de soin de plus",
    apply(m) { m.healLinks += 1; },
  },
  {
    id: "bascule_vive", nom: "Bascule vive", rarity: 1, max: 1, tags: ["coop", "cadence"],
    cls: "soigneur",
    desc: "la bascule est instantanée et donne +25 % de cadence pendant 2 s",
    apply(m) { m.swapInstant = 1; },
  },
  {
    id: "vague_large", nom: "Vague ample", rarity: 2, max: 1, tags: ["coop"],
    cls: "soigneur",
    desc: "vague de soin : rayon ×1,5",
    apply(m) { m.healWaveRadiusMul += CARD_CFG.VAGUE_LARGE_RADIUS; },
  },
  {
    id: "transfusion", nom: "Transfusion", rarity: 2, max: 1, tags: ["coop", "def"],
    cls: "soigneur",
    desc: "30 % des soins prodigués sont aussi rendus au soigneur",
    apply(m) { m.transfusion += CARD_CFG.TRANSFUSION_RATIO; },
  },
  // `transfusion` couvre « le lien me soigne quand je soigne un allie » ;
  // `siphon` couvre l'autre besoin, AVOIR UNE CIBLE quand il n'y a pas d'allie.
  // Les deux ne se recouvrent pas.
  {
    id: "siphon", nom: "Siphon", rarity: 2, max: 1, tags: ["coop", "off"],
    cls: "soigneur",
    desc: "les liens libres s'accrochent aux ennemis : {0} dégâts/s, {1} PV/s rendus au soigneur",
    vals: () => ({ "0": CARD_CFG.SIPHON_DAMAGE, "1": CARD_CFG.SIPHON_RATE }),
    apply(m) { m.siphon = 1; },
  },

  {
    id: "bombe_fragmentation", nom: "Fragmentation", rarity: 1, max: 1, tags: ["off"],
    cls: "dps",
    desc: "l'explosion projette 8 éclats à 50 % de dégâts",
    apply(m) { m.bombShards = 1; },
  },
  {
    id: "bombe_double", nom: "Double charge", rarity: 1, max: 1, tags: ["off"],
    cls: "dps",
    desc: "deux bombes en réserve, recharge inchangée",
    apply(m) { m.bombCharges += 1; },
  },
  {
    id: "surcharge_longue", nom: "Surcharge prolongée", rarity: 2, max: 1, tags: ["off", "cadence"],
    cls: "dps",
    desc: "surcharge : +3 s, et le bonus redescend au lieu de tomber d'un coup",
    apply(m) {
      m.overdriveTime += CARD_CFG.SURCHARGE_LONGUE_TIME;
      m.overdriveFade = 1;
    },
  },
  {
    id: "detonateur", nom: "Détonateur", rarity: 2, max: 1, tags: ["off"],
    cls: "dps",
    desc: "les ennemis touchés par la bombe subissent +25 % de dégâts pendant 4 s",
    apply(m) { m.bombVulnerable = 1; },
  },


  {
    id: "ancre", nom: "Ancre", rarity: 1, max: 1, tags: ["def", "coop"],
    cls: "tank", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["ancre_lourde", "ancre_souveraine"],
    ...skill3Ancre(0),
    apply(m) { m.skill3 = Math.max(m.skill3, 1); },
  },
  {
    id: "ancre_lourde", nom: "Ancre lourde", rarity: 2, max: 1, tags: ["def", "coop"],
    cls: "tank", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["ancre", "ancre_souveraine"],
    ...skill3Ancre(1),
    apply(m) { m.skill3 = Math.max(m.skill3, 2); },
  },
  {
    id: "ancre_souveraine", nom: "Ancre souveraine", rarity: 3, max: 1, tags: ["def", "coop"],
    cls: "tank", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["ancre", "ancre_lourde"],
    ...suffixe(skill3Ancre(2), " — les ennemis retenus sont Vulnérables"),
    apply(m) { m.skill3 = Math.max(m.skill3, 3); },
  },

  {
    id: "sanctuaire", nom: "Sanctuaire", rarity: 1, max: 1, tags: ["coop", "def"],
    cls: "soigneur", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["grand_sanctuaire", "sanctuaire_absolu"],
    ...skill3Sanctuaire(0),
    apply(m) { m.skill3 = Math.max(m.skill3, 1); },
  },
  {
    id: "grand_sanctuaire", nom: "Grand sanctuaire", rarity: 2, max: 1, tags: ["coop", "def"],
    cls: "soigneur", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["sanctuaire", "sanctuaire_absolu"],
    ...skill3Sanctuaire(1),
    apply(m) { m.skill3 = Math.max(m.skill3, 2); },
  },
  {
    id: "sanctuaire_absolu", nom: "Sanctuaire absolu", rarity: 3, max: 1, tags: ["coop", "def"],
    cls: "soigneur", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["sanctuaire", "grand_sanctuaire"],
    ...suffixe(skill3Sanctuaire(2), " — purge un état à l'entrée"),
    apply(m) { m.skill3 = Math.max(m.skill3, 3); },
  },

  {
    id: "salve", nom: "Salve", rarity: 1, max: 1, tags: ["off"],
    cls: "dps", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["salve_etendue", "salve_totale"],
    ...skill3Salve(0),
    apply(m) { m.skill3 = Math.max(m.skill3, 1); },
  },
  {
    id: "salve_etendue", nom: "Salve étendue", rarity: 2, max: 1, tags: ["off"],
    cls: "dps", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["salve", "salve_totale"],
    ...skill3Salve(1),
    apply(m) { m.skill3 = Math.max(m.skill3, 2); },
  },
  {
    id: "salve_totale", nom: "Salve totale", rarity: 3, max: 1, tags: ["off"],
    cls: "dps", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["salve", "salve_etendue"],
    ...suffixe(skill3Salve(2), " — cibles rendues Vulnérables"),
    apply(m) { m.skill3 = Math.max(m.skill3, 3); },
  },

  {
    id: "ravitaillement", nom: "Ravitaillement", rarity: 0, max: 99, tags: [],
    fallback: true,
    desc: "soin complet et +200 points",
    apply() {},
  },

  {
    id: "reperes", nom: "Repères", rarity: 0, max: 4, tags: ["off"],
    desc: "+{0} % de dégâts contre les boss",
    vals: () => ({ "0": num(CARD_CFG.REPERES_STEP * 100) }),
    stack: n => pctAdd(CARD_CFG.REPERES_STEP, n),
    apply(m, n) { m.bossDamageMul += CARD_CFG.REPERES_STEP * n; },
  },
  {
    id: "cordee", nom: "Cordée", rarity: 0, max: 4, tags: ["coop"],
    minPlayers: 2,
    desc: "+{0} % de dégâts par allié vivant à moins de {1}",
    vals: () => ({ "0": num(CARD_CFG.CORDEE_STEP * 100), "1": fmtM(CARD_CFG.ALLY_RADIUS) }),
    stack: n => tf("cards.cordee.stack", "{0} par allié", { "0": pctAdd(CARD_CFG.CORDEE_STEP, n) }),
    apply(m, n) { m.allyDamageStep += CARD_CFG.CORDEE_STEP * n; },
  },
  {
    id: "briseur", nom: "Briseur", rarity: 1, max: 2, tags: ["off", "cadence"],
    desc: "briser une barre de boss recharge instantanément tes compétences",
    stack: n => n > 1
      ? t("cards.briseur.stack.n", "et rend 20 % de bouclier")
      : t("cards.briseur.stack.un", "recharge immédiate"),
    apply(m, n) { m.breakRefresh = n; },
  },
  {
    id: "relais", nom: "Relais", rarity: 1, max: 2, tags: ["coop"],
    minPlayers: 2,
    desc: "allié à terre : +{0} % de dégâts et de vitesse jusqu'à la relève",
    vals: () => ({ "0": num(CARD_CFG.RELAIS_STEP * 100) }),
    stack: n => pctAdd(CARD_CFG.RELAIS_STEP, n),
    apply(m, n) { m.downedRally += CARD_CFG.RELAIS_STEP * n; },
  },
  {
    id: "bouclier_partage", nom: "Bouclier partagé", rarity: 1, max: 2, tags: ["coop", "def"],
    minPlayers: 2,
    desc: "{0} % du bouclier gagné va aussi à l'allié le plus proche",
    vals: () => ({ "0": num(CARD_CFG.SHIELD_SHARE * 100) }),
    stack: n => pctAdd(CARD_CFG.SHIELD_SHARE, n),
    apply(m, n) { m.shieldShare += CARD_CFG.SHIELD_SHARE * n; },
  },
  {
    id: "traqueur", nom: "Traqueur", rarity: 2, max: 1, tags: ["off"],
    desc: "+{0} % de dégâts contre les boss, +{1} % de plus par barre brisée",
    vals: () => ({ "0": num(CARD_CFG.TRAQUEUR_BASE * 100), "1": num(CARD_CFG.TRAQUEUR_PER_BAR * 100) }),
    apply(m) {
      m.bossDamageMul += CARD_CFG.TRAQUEUR_BASE;
      m.bossDamagePerBar += CARD_CFG.TRAQUEUR_PER_BAR;
    },
  },
  {
    id: "serment", nom: "Serment", rarity: 2, max: 1, tags: ["coop"],
    minPlayers: 2,
    desc: "relever un allié donne aux deux +{0} % de dégâts pendant {1} s",
    vals: () => ({ "0": num(CARD_CFG.SERMENT_MUL * 100), "1": num(CARD_CFG.SERMENT_TIME) }),
    apply(m) { m.oathDamage = CARD_CFG.SERMENT_MUL; },
  },
  {
    id: "porte_voix", nom: "Porte-voix", rarity: 2, max: 1, tags: ["coop"],
    minPlayers: 2,
    desc: "tes bonus ramassés s'appliquent à l'équipe, à {0} %",
    vals: () => ({ "0": num(CARD_CFG.PORTE_VOIX_SHARE * 100) }),
    apply(m) { m.powerupShare = CARD_CFG.PORTE_VOIX_SHARE; },
  },
  {
    id: "crampons", nom: "Crampons", rarity: 0, max: 3, tags: ["def", "util"],
    teamUnique: true,
    requiresSystem: "hasards_actifs",
    desc: "−{0} % de l'effet des sols glissants et ralentissants",
    vals: () => ({ "0": num(CARD_CFG.CRAMPONS_STEP * 100) }),
    stack: n => pctCut(1 - CARD_CFG.CRAMPONS_STEP, n),
    apply(m, n) { m.groundResist = 1 - Math.pow(1 - CARD_CFG.CRAMPONS_STEP, n); },
  },
  {
    id: "conducteur", nom: "Conducteur", rarity: 1, max: 2, tags: ["off", "util"],
    requiresSystem: "hasards_actifs",
    desc: "les ennemis qui traversent un danger du sol subissent {0} dégâts/s",
    vals: () => ({ "0": num(CARD_CFG.CONDUCTEUR_DPS) }),
    stack: n => tf("cards.conducteur.stack", "{0} dégâts/s", { "0": num(CARD_CFG.CONDUCTEUR_DPS * n) }),
    apply(m, n) { m.hazardDps += CARD_CFG.CONDUCTEUR_DPS * n; },
  },
  {
    id: "filins", nom: "Filins", rarity: 1, max: 2, tags: ["off"],
    desc: "{0} % de chance qu'une balle entrave sa cible {1} s",
    vals: () => ({ "0": num(CARD_CFG.FILINS_CHANCE * 100), "1": num(CARD_CFG.FILINS_TIME) }),
    stack: n => tf("cards.filins.stack", "{0} % de chance", { "0": num(CARD_CFG.FILINS_CHANCE * n * 100) }),
    apply(m, n) { m.rootChance += CARD_CFG.FILINS_CHANCE * n; },
  },
  {
    id: "etau", nom: "Étau", rarity: 1, max: 2, tags: ["off"],
    desc: "tes explosions et tes ondes entravent {0} s",
    vals: () => ({ "0": num(CARD_CFG.ETAU_TIME) }),
    stack: n => tf("cards.etau.stack", "{0} s", { "0": num(CARD_CFG.ETAU_TIME * n) }),
    apply(m, n) { m.blastRoot += CARD_CFG.ETAU_TIME * n; },
  },
  {
    id: "opportuniste", nom: "Opportuniste", rarity: 1, max: 2, tags: ["off", "util"],
    desc: "pendant un événement, +{0} % de dégâts et +{1} % d'éclats",
    vals: () => ({ "0": num(CARD_CFG.OPPORTUNISTE_DMG * 100), "1": num(CARD_CFG.OPPORTUNISTE_SHARD * 100) }),
    stack: n => pctAdd(CARD_CFG.OPPORTUNISTE_DMG, n),
    apply(m, n) {
      m.eventDamage += CARD_CFG.OPPORTUNISTE_DMG * n;
      m.eventShard += CARD_CFG.OPPORTUNISTE_SHARD * n;
    },
  },
  {
    id: "prospecteur", nom: "Prospecteur", rarity: 1, max: 2, tags: ["coop", "util"],
    desc: "récolter un point rend {0} PV à toute l'équipe",
    vals: () => ({ "0": num(CARD_CFG.PROSPECTEUR_HEAL) }),
    stack: n => tf("cards.prospecteur.stack", "{0} PV", { "0": num(CARD_CFG.PROSPECTEUR_HEAL * n) }),
    apply(m, n) { m.harvestHeal += CARD_CFG.PROSPECTEUR_HEAL * n; },
  },
  {
    id: "contre_pied", nom: "Contre-pied", rarity: 1, max: 2, tags: ["off", "util"],
    desc: "traverser un ennemi en esquivant le rend vulnérable {0} s",
    vals: () => ({ "0": num(CARD_CFG.CONTRE_PIED_TIME) }),
    stack: n => n > 1
      ? t("cards.contre_pied.stack.n", "rayon doublé")
      : tf("cards.contre_pied.stack.un", "{0} s", { "0": num(CARD_CFG.CONTRE_PIED_TIME) }),
    apply(m, n) { m.dashVuln = n; },
  },
  {
    id: "terrain_conquis", nom: "Terrain conquis", rarity: 2, max: 1, tags: ["off"],
    desc: "tes explosions et tes ondes laissent un sol brûlant {0} s",
    vals: () => ({ "0": num(CARD_CFG.TERRAIN_LIFE) }),
    apply(m) { m.blastGround = CARD_CFG.TERRAIN_LIFE; },
  },
  {
    id: "nasse", nom: "Nasse", rarity: 2, max: 1, tags: ["off"],
    requires: ["filins", "etau"],
    desc: "les ennemis entravés subissent +{0} % de dégâts",
    vals: () => ({ "0": num(CARD_CFG.NASSE_MUL * 100) }),
    apply(m) { m.rootDamage = CARD_CFG.NASSE_MUL; },
  },
  {
    id: "curee", nom: "Curée", rarity: 2, max: 1, tags: ["util"],
    desc: "les élites laissent un bonus au sol de plus en mourant",
    apply(m) { m.eliteDrop = 1; },
  },
  {
    id: "filon", nom: "Filon", rarity: 2, max: 1, tags: ["util"],
    desc: "un point de récolte sur trois en laisse un second à sa place",
    apply(m) { m.harvestAgain = CARD_CFG.FILON_CHANCE; },
  },
  {
    id: "sillage", nom: "Sillage", rarity: 2, max: 1, tags: ["off"],
    desc: "les {0} coups qui suivent une esquive sont des coups critiques",
    vals: () => ({ "0": num(CARD_CFG.SILLAGE_HITS) }),
    apply(m) { m.dashCrit = CARD_CFG.SILLAGE_HITS; },
  },
  {
    id: "phalange", nom: "Phalange", rarity: 3, max: 1, tags: ["coop", "def"],
    minPlayers: 2,
    desc: "chaque allié à moins de {0} donne à l'équipe −{1} % de dégâts subis",
    vals: () => ({ "0": fmtM(CARD_CFG.ALLY_RADIUS), "1": num(CARD_CFG.PHALANGE_STEP * 100) }),
    apply(m) { m.phalanxStep = CARD_CFG.PHALANGE_STEP; },
  },
];

export const CARD_BY_ID = new Map(CARDS.map(c => [c.id, c]));

export function banClosure(rootId) {
  const banned = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of CARDS) {
      if (banned.has(c.id)) continue;
      if ((c.dependsOn ?? []).some(d => banned.has(d))) {
        banned.add(c.id);
        grew = true;
      }
    }
  }
  return [...banned];
}


export function defaultMods() {
  return {
    damageMul: 1,
    fireIntervalMul: 1,
    maxHpBonus: 0,
    hpCap: 0,
    speedMul: 1,
    bulletSpeedMul: 1,
    bulletLifeMul: 1,
    reviveSpeedMul: 1,
    reviveRadiusMul: 1,
    reviveHpRatio: 0,
    damageTakenMul: 1,
    pickupRadius: 0,
    pickupRadiusMul: 1,
    groundResist: 0,
    hazardDps: 0,
    blastGround: 0,
    blastRoot: 0,
    rootChance: 0,
    rootDamage: 0,
    eventDamage: 0,
    eventShard: 0,
    eliteDrop: 0,
    harvestHeal: 0,
    harvestAgain: 0,
    dashVuln: 0,
    dashCrit: 0,
    allyDamageStep: 0,
    downedRally: 0,
    shieldShare: 0,
    oathDamage: 0,
    powerupShare: 0,
    phalanxStep: 0,
    bossDamageMul: 1,
    bossDamagePerBar: 0,
    breakRefresh: 0,
    scoreMul: 1,
    shardMul: 1,
    healPerBoss: 0,
    pierce: 0,
    extraBarrels: 0,
    barrelDamageMul: 1,
    shieldPool: 0,
    lifesteal: 0,
    burnDmg: 0,
    chain: 0,
    chainChance: 0,
    selfRevive: 0,
    counterNova: 0,
    zoneImmunity: 0,
    autoTurretCd: 0,
    orbiters: 0,
    backShot: 0,
    pulsarCd: 0,
    drones: 0,
    swarm: 0,
    frenzy: 0,
    frostRadius: 0,
    harvest: 0,
    deathWave: 0,
    echoChance: 0,
    guardianCd: 0,
    instinctCd: 0,
    weapon: null,
    orbiterDamageMul: 1,
    bounce: 0,
    inertia: 0,

    damagePerLevel: 0,
    noOverheat: 0,
    hpRegen: 0,
    dashCdMul: 1,
    dashTrail: 0,
    statusTimeMul: 1,
    catalyseur: 0,
    xpCostMul: 1,

    bulwarkRadiusMul: 1,
    bulwarkTime: 0,
    bulwarkAnchor: 0,
    carapace: 0,
    tauntTime: 0,
    tauntCd: 0,
    represailles: 0,
    healLinks: 0,
    siphon: 0,
    swapInstant: 0,
    healWaveRadiusMul: 1,
    transfusion: 0,
    bombShards: 0,
    bombCharges: 0,
    bombVulnerable: 0,
    overdriveTime: 0,
    overdriveFade: 0,
    skill3: 0,

    thorns: 0,
    guardAura: 0,
    healGivenMul: 1,
    healBeamMul: 1,
    reviveHpBonus: 0,
    catalyse: 0,
    bombCdCut: 0,
    bombRadiusMul: 1,

    critChance: CARD_CFG.CRIT_CHANCE,
    critMul: CARD_CFG.CRIT_MUL,
    critVuln: 0,
    areaMul: 1,
    areaPull: 0,
    skillCdMul: 1,
    cdPerKill: 0,
    execThreshold: 0,
    execHeal: 0,
    hpPerKill: 0,
    maxHpRatio: 0,
    hpToDamage: 0,
    damageToHp: 0,
    shieldToDamage: 0,
    noShieldRegen: 0,
    elanStep: 0,
    elanMax: 0,
    packStep: 0,
    packMax: 0,
    ragePerKill: 0,
    lowHpRate: 0,
    lowHpDamage: 0,
  };
}

export function cardContext(owned) {
  const ctx = { defensive: 0, cadence: 0, topRarity: -1 };
  for (const [id, n] of owned) {
    const card = CARD_BY_ID.get(id);
    if (!card || n <= 0) continue;
    if (card.tags.includes("def")) ctx.defensive += n;
    if (card.tags.includes("cadence")) ctx.cadence += n;
    if (card.rarity > ctx.topRarity) ctx.topRarity = card.rarity;
  }
  return ctx;
}

export function computeMods(owned) {
  const m = defaultMods();
  for (const [id, n] of owned) {
    const card = CARD_BY_ID.get(id);
    if (card && n > 0) card.apply?.(m, n);
  }

  const ctx = cardContext(owned);
  for (const [id, n] of owned) {
    const card = CARD_BY_ID.get(id);
    if (card && n > 0 && card.applyAfter) card.applyAfter(m, n, ctx);
  }

  m.fireIntervalMul = Math.max(
    m.noOverheat ? CARD_CFG.FIRE_INTERVAL_HARD_FLOOR : CARD_CFG.FIRE_INTERVAL_FLOOR,
    m.fireIntervalMul);
  m.damageTakenMul = Math.max(CARD_CFG.DAMAGE_TAKEN_FLOOR, m.damageTakenMul);
  m.speedMul = Math.max(0.5, m.speedMul);
  m.bulletSpeedMul = Math.max(CARD_CFG.BULLET_SPEED_FLOOR, m.bulletSpeedMul);
  m.statusTimeMul = Math.max(0.35, m.statusTimeMul);
  m.critChance = Math.min(CARD_CFG.CRIT_CHANCE_CAP, m.critChance);

  m.bulwarkRadiusMul *= m.areaMul;
  m.healWaveRadiusMul *= m.areaMul;
  m.frostRadius *= m.areaMul;
  return m;
}


function rarityWeights(quality) {
  const k = Math.min(Math.max(0, quality - 1), CARD_CFG.RARITY_DRIFT_CAP);
  return RARITY_WEIGHT.map((w, i) => w * Math.pow(RARITY_DRIFT[i], k));
}

export function legendaryCount(owned) {
  let n = 0;
  for (const [id, k] of owned) {
    const card = CARD_BY_ID.get(id);
    if (card && card.rarity === RARITY.LEGENDAIRE) n += k;
  }
  return n;
}

function topTiers(owned) {
  const top = new Map();
  for (const [id, n] of owned) {
    const card = CARD_BY_ID.get(id);
    if (!card || !card.family || n <= 0) continue;
    top.set(card.family, Math.max(top.get(card.family) ?? -1, card.tier));
  }
  return top;
}

export const POOL_MIN = 6;

// `ctx` : { players, teamOwned:Set, systems:Set }. Absent, les trois filtres de
// contexte laissent tout passer — un script de mesure n'a rien a construire.
export function eligibleCards(owned, cls = null, levelNow = 0, locked = null, ctx = null) {
  const blocked = new Set();
  for (const id of owned.keys()) {
    const card = CARD_BY_ID.get(id);
    if (card && card.incompatible) for (const other of card.incompatible) blocked.add(other);
  }
  const top = topTiers(owned);
  return CARDS.filter(c => {
    if (c.family && (top.get(c.family) ?? -1) > c.tier) return false;
    if (c.fallback) return false;
    if (c.cls && c.cls !== cls) return false;
    if (c.minLevel && levelNow < c.minLevel) return false;
    if (locked && locked.has(c.id)) return false;
    if (blocked.has(c.id)) return false;
    if (c.requires && !c.requires.some(id => (owned.get(id) || 0) > 0)) return false;
    if (c.minPlayers && (ctx?.players ?? 1) < c.minPlayers) return false;
    // le porteur continue de l'empiler, la table ne la revoit plus
    if (c.teamUnique && ctx?.teamOwned?.has(c.id) && !(owned.get(c.id) > 0)) return false;
    if (c.requiresSystem && !(ctx?.systems?.has(c.requiresSystem))) return false;
    return (owned.get(c.id) || 0) < c.max;
  });
}

export function poolCounts(pool) {
  const counts = [0, 0, 0, 0];
  for (const c of pool) counts[c.rarity]++;
  return counts;
}

export function poolThin(pool, min = POOL_MIN) {
  return poolCounts(pool)
    .map((n, rarity) => ({ rarity, n }))
    .filter(x => x.n < min);
}

export const FALLBACK_CARD = CARDS.find(c => c.fallback);

export function drawCards(owned, quality, forceRare = false, cls = null,
                          rng = Math.random, jalon = 0, levelNow = 0, opts = {}) {
  const count = opts.count ?? 3;
  const capped = legendaryCount(owned) >= CARD_CFG.LEGENDARY_MAX;
  const pool = eligibleCards(owned, cls, levelNow, opts.locked ?? null, opts.ctx ?? null)
    .filter(c => !(capped && c.rarity === RARITY.LEGENDAIRE));
  const weights = rarityWeights(quality);
  const out = [];
  const taken = new Set();
  const families = new Set();
  const excls = new Set();

  const pickFrom = list => {
    let total = 0;
    for (const c of list) total += weights[c.rarity];
    if (total <= 0) return null;
    let roll = rng() * total;
    for (const c of list) {
      roll -= weights[c.rarity];
      if (roll <= 0) return c;
    }
    return list[list.length - 1];
  };

  const push = c => {
    out.push(c);
    taken.add(c.id);
    if (c.family) families.add(c.family);
    if (c.excl) excls.add(c.excl);
  };
  const restant = () =>
    pool.filter(c => !taken.has(c.id)
      && !(c.family && families.has(c.family))
      && !(c.excl && excls.has(c.excl)));

  if (jalon > 0 && CARD_CFG.LEGENDARY_LEVELS.includes(jalon) && !capped) {
    const c = pickFrom(restant().filter(x => x.rarity === RARITY.LEGENDAIRE));
    if (c) push(c);
  }

  if (out.length === 0 && forceRare) {
    const c = pickFrom(restant().filter(x => x.rarity >= RARITY.RARE));
    if (c) push(c);
  }

  while (out.length < count) {
    const list = restant();
    if (list.length === 0) break;
    const c = pickFrom(list);
    if (!c) break;
    push(c);
  }

  while (out.length < count && FALLBACK_CARD) out.push(FALLBACK_CARD);

  return out;
}

/* Le texte d'une carte ne traverse PLUS le reseau : le client a la table. Le
   serveur n'envoie que ce qu'il decide, l'identifiant et la rarete. */
export function cardBrief(id) {
  const c = CARD_BY_ID.get(id);
  if (!c) return null;
  return { id: c.id, rarity: c.rarity };
}

/* Point de passage unique du texte d'une carte. Le francais de la table est le
   repli ; les marqueurs de `desc` sont remplis par le thunk `vals`, pour qu'une
   traduction compose les memes constantes au lieu d'en recopier les nombres. */
export function cardNom(id) {
  const c = CARD_BY_ID.get(id);
  return c ? t(`cards.${id}.nom`, c.nom) : "";
}
export function cardDesc(id) {
  const c = CARD_BY_ID.get(id);
  if (!c) return "";
  return c.vals ? tf(`cards.${id}.desc`, c.desc, c.vals()) : t(`cards.${id}.desc`, c.desc);
}

export function cardDetail(id, owned = new Map()) {
  const c = CARD_BY_ID.get(id);
  if (!c) return null;

  const have = owned.get(id) ?? 0;
  const next = Math.min(c.max, have + 1);

  const cumul = (c.max > 1 && !c.fallback)
    ? tf("cards.cumul", "possédée {n} / {max}", { n: have, max: c.max })
    : null;

  const valeur = (c.stack && have > 0 && next > have)
    ? `${c.stack(have)} → ${c.stack(next)}`
    : null;

  const effectif = c.effective ? c.effective(cardContext(owned), next) : null;

  let avertissement = null;
  if (c.incompatible && c.incompatible.length > 0) {
    const noms = c.incompatible.map(x => cardNom(x) || x).join(", ");
    avertissement = (c.remplaceArme ? t("cards.remplaceArme", "remplace le tir") + " — " : "")
      + tf("cards.incompatible", "incompatible avec {noms}", { noms });
  } else if (c.remplaceArme) {
    avertissement = t("cards.remplaceArme", "remplace le tir");
  }

  const famille = c.family
    ? tf("cards.famille", "{fam} — palier {n} / {max}",
        { fam: familyLabel(c.family), n: c.tier + 1, max: FAMILY_TIERS })
    : null;

  const catId = cardCategory(c);
  const rangN = categoryCount(owned, catId) + 1;
  const rang = tf(`cardcat.${catId}.rang`, CATEGORY_RANG[catId],
    { n: ordinal(rangN) });

  return { id: c.id, nom: cardNom(c.id), rarity: c.rarity, desc: cardDesc(c.id),
           famille, familleId: c.family ?? null,
           categorie: categoryLabel(catId), categorieId: catId, rang,
           cumul, valeur, effectif, avertissement };
}
