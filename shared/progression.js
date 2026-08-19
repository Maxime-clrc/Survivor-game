
import { nombre, t, tf } from "./i18n.js";
import { CARDS, CARD_CFG, RARITY } from "./cards.js";
import { SKILL_CFG } from "./classes.js";
import { BOSS_ROSTER, bossNom } from "./bosses.js";

export const PROG_CFG = {
  VERSION: 6,

  SLOTS_BASE: 3,
  SLOTS_MAX: 6,
  SLOTS_BOSSES: 3,
  SLOTS_RUNS: 25,
  SLOTS_LEVEL: 13,

  TIERS_MAX: 5,
  TIER_COSTS: [100, 180, 320, 560, 840],
  TRONC_COSTS: [120, 220, 400, 700, 1160],
  SECOURS_COSTS: [200, 400, 700, 1100, 1600],

  CORE_LEVEL: 8,
  CORE_BOSS: 25,
  CORE_RUN_CAP: 600,
  DIFF_MUL: [1, 1.4, 2],

  KILLS_MILESTONE: 500,
  NO_DOWN_MIN_LEVEL: 6,

  /* `bannissement` a quitte la table (2026-08-19) : depuis que le ban est par
     manche, c'est une commodite de base, plus un achat — le bouton est libre.
     Les comptes qui l'avaient achete gardent l'identifiant mort dans leur
     profil, ignore par tous les lecteurs. */
  CONFORT_COSTS: {
    relance: 250, quatrieme: 450, ravitaillement: 500, relance2: 900,
  },

  SECOURS_REGEN: 1.2,

  CATALYSE_TIME: 3,
  THORNS_RADIUS: 80,
  GUARD_RADIUS: 120,
};


const pct = v => `${nombre(v * 100)} %`;

export const TREES = {
  tank: [
    { id: "constitution", nom: "Constitution", step: 0.06,
      desc: n => tf("prog.constitution.desc", "+{0} de PV max", { "0": pct(0.06 * n) }),
      apply(m, n) { m.metaHpRatio += 0.06 * n; } },
    { id: "alliage", nom: "Alliage", step: 0.02,
      desc: n => tf("prog.alliage.desc", "−{0} de dégâts subis", { "0": pct(1 - Math.pow(0.98, n)) }),
      apply(m, n) { m.damageTakenMul *= Math.pow(0.98, n); } },
    { id: "ancrage", nom: "Ancrage", step: 0.08,
      desc: n => tf("prog.ancrage.desc", "+{0} de rayon et de durée du rempart", { "0": pct(0.08 * n) }),
      apply(m, n) {
        m.bulwarkRadiusMul += 0.08 * n;
        m.bulwarkTime += SKILL_CFG.TANK_BULWARK_TIME * 0.08 * n;
      } },
    { id: "defi", nom: "Défi", step: 1,
      desc: n => tf("prog.defi.desc", "−{0} s de recharge de provocation", { "0": n }),
      apply(m, n) { m.tauntCd -= n; } },
    { id: "epines", nom: "Épines", step: 0.04,
      desc: n => tf("prog.epines.desc", "renvoie {0} des dégâts subis à 4 m", { "0": pct(0.04 * n) }),
      apply(m, n) { m.thorns += 0.04 * n; } },
    { id: "garde", nom: "Garde", step: 0.02,
      desc: n => tf("prog.garde.desc", "les alliés à moins de 6 m subissent −{0}", { "0": pct(0.02 * n) }),
      apply(m, n) { m.guardAura += 0.02 * n; } },
  ],

  soigneur: [
    { id: "vitalite", nom: "Vitalité", step: 0.04,
      desc: n => tf("prog.vitalite.desc", "+{0} de PV max", { "0": pct(0.04 * n) }),
      apply(m, n) { m.metaHpRatio += 0.04 * n; } },
    { id: "flux", nom: "Flux", step: 0.07,
      desc: n => tf("prog.flux.desc", "+{0} de soins prodigués", { "0": pct(0.07 * n) }),
      apply(m, n) { m.healGivenMul += 0.07 * n; } },
    // ce n'est plus une portee de TIR mais un rayon de TOLERANCE : c'est devenu
    // la ligne defensive du soigneur, celle qui le laisse plus loin du danger
    { id: "portee", nom: "Portée", step: 0.08,
      desc: n => tf("prog.portee.desc", "+{0} de rayon d'accrochage des liens", { "0": pct(0.08 * n) }),
      apply(m, n) { m.healBeamMul += 0.08 * n; } },
    { id: "releve", nom: "Relève", step: 0.10,
      desc: n => tf("prog.releve.desc", "réanimation +{0}, +{1} PV au relevé", { "0": pct(0.10 * n), "1": 4 * n }),
      apply(m, n) { m.reviveSpeedMul += 0.10 * n; m.reviveHpBonus += 4 * n; } },
    { id: "osmose", nom: "Osmose", step: 0.04,
      desc: n => tf("prog.osmose.desc", "{0} des soins prodigués reviennent en PV", { "0": pct(0.04 * n) }),
      apply(m, n) { m.transfusion += 0.04 * n; } },
    // elle s'applique a TOUS les allies lies, donc a taux reduit : le plafond
    // reste comparable a deux cibles (+20 % contre +15 %), et l'archetype
    // « lier large » se paie en efficacite par cible au lieu d'etre gratuit.
    { id: "catalyse", nom: "Catalyse", step: 0.02,
      desc: n => tf("prog.catalyse.desc", "chaque allié lié gagne +{0} de dégâts pendant {1} s", { "0": pct(0.02 * n), "1": PROG_CFG.CATALYSE_TIME }),
      apply(m, n) { m.catalyse += 0.02 * n; } },
  ],

  dps: [
    { id: "calibre", nom: "Calibre", step: 0.04,
      desc: n => tf("prog.calibre.desc", "+{0} de dégâts", { "0": pct(0.04 * n) }),
      apply(m, n) { m.damageMul += 0.04 * n; } },
    { id: "precision", nom: "Précision", step: 0.02,
      desc: n => tf("prog.precision.desc", "+{0} de chance critique", { "0": pct(0.02 * n) }),
      apply(m, n) { m.critChance += 0.02 * n; } },
    { id: "letalite", nom: "Létalité", step: 0.08,
      desc: n => tf("prog.letalite.desc", "+{0} de dégâts critiques", { "0": pct(0.08 * n) }),
      apply(m, n) { m.critMul += 0.08 * n; } },
    { id: "munitions", nom: "Munitions", step: 0.06,
      desc: n => tf("prog.munitions.desc", "+{0} de vitesse et de portée des balles", { "0": pct(0.06 * n) }),
      apply(m, n) { m.bulletSpeedMul += 0.06 * n; m.bulletLifeMul += 0.06 * n; } },
    { id: "charge", nom: "Charge", step: 0.6,
      desc: n => tf("prog.charge.desc", "−{0} s de recharge de bombe, +{1} de rayon", { "0": nombre(0.6 * n), "1": pct(0.05 * n) }),
      apply(m, n) { m.bombCdCut += 0.6 * n; m.bombRadiusMul += 0.05 * n; } },
    { id: "surchauffe", nom: "Surchauffe", step: 0.5,
      desc: n => tf("prog.surchauffe.desc", "+{0} s de durée de surcharge", { "0": nombre(0.5 * n) }),
      apply(m, n) { m.overdriveTime += 0.5 * n; } },
  ],
};

export const confortNom = id => {
  const c = CONFORT.find(x => x.id === id);
  return c ? t(`confort.${id}.nom`, c.nom) : "";
};
export const confortDesc = id => {
  const c = CONFORT.find(x => x.id === id);
  return c ? t(`confort.${id}.desc`, c.desc) : "";
};
export const ligneNom = l => t(`prog.${l.id}.nom`, l.nom);
/* `label` est une FONCTION depuis la refonte i18n (elle compose deja t/tf avec
   sa propre cle) : il faut l'APPELER — passee en repli a t(), l'ecran affichait
   son code source. L'ancienne forme chaine reste acceptee par prudence. */
export const jalonLabel = m =>
  typeof m.label === "function" ? m.label() : t(`jalon.${m.id}`, m.label);

export const CONFORT = [
  { id: "relance", nom: "Relance",
    desc: "une relance de tirage de carte par partie" },
  { id: "quatrieme", nom: "Quatrième offre",
    desc: "quatre cartes proposées au lieu de trois" },
  { id: "ravitaillement", nom: "Ravitaillement initial",
    desc: "un bonus au sol dès le début de la manche" },
  { id: "relance2", nom: "Seconde relance",
    desc: "une deuxième relance de tirage par partie" },
];

// Communes aux trois classes : la polyvalence n'est pas une taxe. `secours` est la
// clemence, et son cinquieme palier est le seul achat qui change l'issue d'une
// manche — c'est lui qui porte le saut P0 -> P1, pas les pourcentages.
export const COMMUN = [
  { id: "sursis", nom: "Sursis", famille: "secours", costs: "SECOURS_COSTS",
    step: PROG_CFG.SECOURS_REGEN,
    desc: n => tf("prog.sursis.desc", "+{0} PV/s hors coup",
      { "0": nombre(PROG_CFG.SECOURS_REGEN * n) })
      + (n >= PROG_CFG.TIERS_MAX
        ? t("prog.sursis.plein", ", et un relèvement automatique par manche") : ""),
    apply(m, n) {
      m.hpRegen += PROG_CFG.SECOURS_REGEN * n;
      if (n >= PROG_CFG.TIERS_MAX) m.selfRevive = 1;
    } },
  { id: "carcasse", nom: "Carcasse", famille: "tronc", costs: "TRONC_COSTS", step: 0.03,
    desc: n => tf("prog.carcasse.desc", "+{0} de PV max", { "0": pct(0.03 * n) }),
    apply(m, n) { m.metaHpRatio += 0.03 * n; } },
  { id: "foulee", nom: "Foulée", famille: "tronc", costs: "TRONC_COSTS", step: 0.015,
    desc: n => tf("prog.foulee.desc", "+{0} de vitesse", { "0": pct(0.015 * n) }),
    apply(m, n) { m.speedMul += 0.015 * n; } },
  { id: "glanage", nom: "Glanage", famille: "tronc", costs: "TRONC_COSTS", step: 14,
    desc: n => tf("prog.glanage.desc", "+{0} px de portée de ramassage", { "0": 14 * n }),
    apply(m, n) { m.pickupRadius = Math.max(m.pickupRadius, 14 * n); } },
];

const COMMUN_BY_ID = new Map(COMMUN.map(l => [l.id, l]));

export function applyMeta(mods, maxHp, clsId, lines, commun = null) {
  const m = { ...mods, metaHpRatio: 0 };
  for (const line of TREES[clsId] ?? []) {
    const n = Math.min(lines?.[line.id] | 0, PROG_CFG.TIERS_MAX);
    if (n > 0) line.apply(m, n);
  }
  for (const line of COMMUN) {
    const n = Math.min(commun?.[line.id] | 0, PROG_CFG.TIERS_MAX);
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

export function tierCost(currentTier, lineId = null) {
  const table = lineId && COMMUN_BY_ID.has(lineId)
    ? PROG_CFG[COMMUN_BY_ID.get(lineId).costs]
    : PROG_CFG.TIER_COSTS;
  return table[currentTier] ?? Infinity;
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

/* `label` est une FONCTION : « vaincre Ravageur » compose le nom du boss, qui se
   traduit lui aussi, au lieu de le recopier dans le libelle. */
export const MILESTONES = [
  { id: "niveau10",
    label: () => t("jalon.niveau10", "atteindre le niveau 10"),
    unlocks: conditionnelles },
  ...BOSS_ROSTER.map((b, i) => ({
    id: `boss_${i}`,
    label: () => tf("jalon.boss", "vaincre {nom}", { nom: bossNom(i) }),
    unlocks: i < LEGENDARY_SPLIT ? legendairesDuBoss(i) : armes,
  })),
  { id: "sans_chute",
    label: () => tf("jalon.sans_chute",
      "terminer une manche (niveau {n}+) sans être mis à terre",
      { n: PROG_CFG.NO_DOWN_MIN_LEVEL }),
    unlocks: armes.filter((_, k) => k % 2 === 0) },
  { id: "kills500",
    label: () => tf("jalon.kills500", "tuer {n} ennemis avec une même classe",
      { n: PROG_CFG.KILLS_MILESTONE }),
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
    commun: {},
    confort: [],
    // `bannedCards` a disparu : les bans sont PAR MANCHE depuis le 2026-08-19
    // (p.locked du GameState) — les profils existants gardent un champ mort.
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
