
import { CARDS, CARD_CFG, RARITY } from "./cards.js";
import { SKILL_CFG } from "./classes.js";
import { BOSS_ROSTER } from "./bosses.js";

export const PROG_CFG = {
  VERSION: 5,

  SLOTS_BASE: 3,
  SLOTS_MAX: 6,
  SLOTS_BOSSES: 3,
  SLOTS_RUNS: 25,
  SLOTS_LEVEL: 12,

  TIERS_MAX: 5,
  TIER_COSTS: [200, 420, 880, 1800, 3600],

  CORE_LEVEL: 8,
  CORE_BOSS: 25,
  CORE_RUN_CAP: 600,
  DIFF_MUL: [1, 1.4, 2],

  KILLS_MILESTONE: 500,
  NO_DOWN_MIN_LEVEL: 6,

  CONFORT_COSTS: { relance: 1200, quatrieme: 2500, ravitaillement: 900 },

  CATALYSE_TIME: 3,
  THORNS_RADIUS: 80,
  GUARD_RADIUS: 120,
};


const pct = v => `${String(Math.round(v * 1000) / 10).replace(".", ",")} %`;

export const TREES = {
  tank: [
    { id: "constitution", nom: "Constitution", step: 0.06,
      desc: n => `+${pct(0.06 * n)} de PV max`,
      apply(m, n) { m.metaHpRatio += 0.06 * n; } },
    { id: "alliage", nom: "Alliage", step: 0.02,
      desc: n => `−${pct(1 - Math.pow(0.98, n))} de dégâts subis`,
      apply(m, n) { m.damageTakenMul *= Math.pow(0.98, n); } },
    { id: "ancrage", nom: "Ancrage", step: 0.08,
      desc: n => `+${pct(0.08 * n)} de rayon et de durée du rempart`,
      apply(m, n) {
        m.bulwarkRadiusMul += 0.08 * n;
        m.bulwarkTime += SKILL_CFG.TANK_BULWARK_TIME * 0.08 * n;
      } },
    { id: "defi", nom: "Défi", step: 1,
      desc: n => `−${n} s de recharge de provocation`,
      apply(m, n) { m.tauntCd -= n; } },
    { id: "epines", nom: "Épines", step: 0.04,
      desc: n => `renvoie ${pct(0.04 * n)} des dégâts subis à 4 m`,
      apply(m, n) { m.thorns += 0.04 * n; } },
    { id: "garde", nom: "Garde", step: 0.02,
      desc: n => `les alliés à moins de 6 m subissent −${pct(0.02 * n)}`,
      apply(m, n) { m.guardAura += 0.02 * n; } },
  ],

  soigneur: [
    { id: "vitalite", nom: "Vitalité", step: 0.04,
      desc: n => `+${pct(0.04 * n)} de PV max`,
      apply(m, n) { m.metaHpRatio += 0.04 * n; } },
    { id: "flux", nom: "Flux", step: 0.07,
      desc: n => `+${pct(0.07 * n)} de soins prodigués`,
      apply(m, n) { m.healGivenMul += 0.07 * n; } },
    { id: "portee", nom: "Portée", step: 0.08,
      desc: n => `+${pct(0.08 * n)} de portée et de vitesse du faisceau`,
      apply(m, n) { m.healBeamMul += 0.08 * n; } },
    { id: "releve", nom: "Relève", step: 0.10,
      desc: n => `réanimation +${pct(0.10 * n)}, +${4 * n} PV au relevé`,
      apply(m, n) { m.reviveSpeedMul += 0.10 * n; m.reviveHpBonus += 4 * n; } },
    { id: "osmose", nom: "Osmose", step: 0.04,
      desc: n => `${pct(0.04 * n)} des soins prodigués reviennent en PV`,
      apply(m, n) { m.transfusion += 0.04 * n; } },
    { id: "catalyse", nom: "Catalyse", step: 0.03,
      desc: n => `la cible soignée gagne +${pct(0.03 * n)} de dégâts pendant ${PROG_CFG.CATALYSE_TIME} s`,
      apply(m, n) { m.catalyse += 0.03 * n; } },
  ],

  dps: [
    { id: "calibre", nom: "Calibre", step: 0.04,
      desc: n => `+${pct(0.04 * n)} de dégâts`,
      apply(m, n) { m.damageMul += 0.04 * n; } },
    { id: "precision", nom: "Précision", step: 0.02,
      desc: n => `+${pct(0.02 * n)} de chance critique`,
      apply(m, n) { m.critChance += 0.02 * n; } },
    { id: "letalite", nom: "Létalité", step: 0.08,
      desc: n => `+${pct(0.08 * n)} de dégâts critiques`,
      apply(m, n) { m.critMul += 0.08 * n; } },
    { id: "munitions", nom: "Munitions", step: 0.06,
      desc: n => `+${pct(0.06 * n)} de vitesse et de portée des balles`,
      apply(m, n) { m.bulletSpeedMul += 0.06 * n; m.bulletLifeMul += 0.06 * n; } },
    { id: "charge", nom: "Charge", step: 0.6,
      desc: n => `−${String(0.6 * n).replace(".", ",")} s de recharge de bombe, +${pct(0.05 * n)} de rayon`,
      apply(m, n) { m.bombCdCut += 0.6 * n; m.bombRadiusMul += 0.05 * n; } },
    { id: "surchauffe", nom: "Surchauffe", step: 0.5,
      desc: n => `+${String(0.5 * n).replace(".", ",")} s de durée de surcharge`,
      apply(m, n) { m.overdriveTime += 0.5 * n; } },
  ],
};

export const CONFORT = [
  { id: "relance", nom: "Relance",
    desc: "une relance de tirage de carte par partie" },
  { id: "quatrieme", nom: "Quatrième offre",
    desc: "quatre cartes proposées au lieu de trois" },
  { id: "ravitaillement", nom: "Ravitaillement initial",
    desc: "un bonus au sol dès le début de la manche" },
];

export function applyMeta(mods, maxHp, clsId, lines) {
  const m = { ...mods, metaHpRatio: 0 };
  const tree = TREES[clsId] ?? [];
  for (const line of tree) {
    const n = Math.min(lines[line.id] | 0, PROG_CFG.TIERS_MAX);
    if (n > 0) line.apply(m, n);
  }
  m.critChance = Math.min(CARD_CFG.CRIT_CHANCE_CAP, m.critChance);
  m.damageTakenMul = Math.max(CARD_CFG.DAMAGE_TAKEN_FLOOR, m.damageTakenMul);
  const hp = Math.round(maxHp * (1 + m.metaHpRatio));
  delete m.metaHpRatio;
  return { mods: m, maxHp: hp };
}

export function slotsFor(profile) {
  const ms = profile?.milestones ?? [];
  let n = PROG_CFG.SLOTS_BASE;
  if (ms.includes(`niveau${PROG_CFG.SLOTS_LEVEL}`)) n++;
  let bosses = 0;
  for (const id of ms) if (id.startsWith("boss_")) bosses++;
  if (bosses >= PROG_CFG.SLOTS_BOSSES) n++;
  if ((profile?.runs | 0) >= PROG_CFG.SLOTS_RUNS) n++;
  return Math.min(PROG_CFG.SLOTS_MAX, n);
}

export function tierCost(currentTier) {
  return PROG_CFG.TIER_COSTS[currentTier] ?? Infinity;
}

const armes = CARDS
  .filter(c => c.remplaceArme && !c.fallback)
  .map(c => c.id);
const legendaires = CARDS
  .filter(c => c.rarity === RARITY.LEGENDAIRE && !c.fallback && !c.remplaceArme)
  .map(c => c.id);
const conditionnelles = CARDS
  .filter(c => c.applyAfter && c.rarity !== RARITY.LEGENDAIRE && !c.remplaceArme)
  .map(c => c.id);

const LEGENDARY_SPLIT = 5;
const legendairesDuBoss = i => legendaires.filter((_, k) => k % LEGENDARY_SPLIT === i);

export const MILESTONES = [
  { id: "niveau10", label: "atteindre le niveau 10", unlocks: conditionnelles },
  ...BOSS_ROSTER.map((b, i) => ({
    id: `boss_${i}`, label: `vaincre ${b.nom}`,
    unlocks: i < LEGENDARY_SPLIT ? legendairesDuBoss(i) : armes,
  })),
  { id: "sans_chute",
    label: `terminer une manche (niveau ${PROG_CFG.NO_DOWN_MIN_LEVEL}+) sans être mis à terre`,
    unlocks: armes.filter((_, k) => k % 2 === 0) },
  { id: "kills500",
    label: `tuer ${PROG_CFG.KILLS_MILESTONE} ennemis avec une même classe`,
    unlocks: armes.filter((_, k) => k % 2 === 1) },
];

const MILESTONE_BY_ID = new Map(MILESTONES.map(m => [m.id, m]));

export function lockedCards(milestonesDone = []) {
  const locked = new Set([...legendaires, ...armes, ...conditionnelles]);
  for (const id of milestonesDone) {
    const m = MILESTONE_BY_ID.get(id);
    if (m) for (const cardId of m.unlocks) locked.delete(cardId);
  }
  return locked;
}

export function coresForRun(level, bossKills, diffIndex) {
  const base = PROG_CFG.CORE_LEVEL * level + PROG_CFG.CORE_BOSS * bossKills;
  return Math.min(PROG_CFG.CORE_RUN_CAP,
    Math.round(base * (PROG_CFG.DIFF_MUL[diffIndex] ?? 1)));
}

export function coresPartial(level, diffIndex) {
  return Math.min(PROG_CFG.CORE_RUN_CAP,
    Math.round(PROG_CFG.CORE_LEVEL * level * (PROG_CFG.DIFF_MUL[diffIndex] ?? 1)));
}

export function newProfile(pseudo) {
  return {
    pseudo,
    cores: 0,
    runs: 0,
    best: { wave: 0, level: 0, segment: 0, score: 0 },
    milestones: [],
    kills: {},
    classes: {},
    confort: [],
    bannedCards: [],
    bestFinal: {},
  };
}

export function recordFinal(profile, run, dateISO) {
  if (!profile || !run) return false;
  if (!profile.bestFinal) profile.bestFinal = {};
  const k = String(run.difficulty | 0);
  const cur = profile.bestFinal[k];
  if (cur && cur.time <= run.time) return false;
  profile.bestFinal[k] = {
    time: Math.round((run.time ?? 0) * 10) / 10,
    level: run.level | 0,
    total: run.total | 0,
    variant: run.variant ?? "",
    biome: run.biome | 0,
    players: run.players | 0,
    date: dateISO,
  };
  return true;
}
