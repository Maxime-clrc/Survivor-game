
import { nombre, t, tf } from "./i18n.js";
import { CARD_BY_ID, CARD_CFG } from "./cards.js";
import { ARMES, ARME_BY_ID, ARME_DEFAUT } from "./armes.js";
import { ENEMY_TYPES } from "./enemies.js";
import { BOSS_ROSTER } from "./bosses.js";
import { SKILL_CFG } from "./classes.js";
import {
  CADRE_DEFAUT, HAUTS_FAITS, HF_BY_ID, TOUTES_RECOMPENSES,
  evaluerHautsFaits, hfNom, hfTexte, recompensesDe,
} from "./hauts_faits.js";

export const PROG_CFG = {
  VERSION: 7,

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

// LES LIGNES QUI COMPTENT SONT LES LIGNES EQUIPEES : une ligne achetee mais
// laissee hors emplacement ne s'applique pas. Point de passage unique, lu par le
// serveur au lancement ET par le client pour afficher des valeurs EFFECTIVES.
export function metaLinesFor(profile, clsId) {
  const cp = profile?.classes?.[clsId];
  const lines = {};
  for (const lid of cp?.equipped ?? []) {
    const n = cp.tiers?.[lid] | 0;
    if (n > 0) lines[lid] = n;
  }
  // UNE LIGNE COMMUNE COUPEE NE S APPLIQUE PAS. Le champ absent vaut TOUT
  // ACTIF : aucun profil existant ne change, et rien n a a migrer.
  const coupees = new Set(profile?.communOff ?? []);
  const commun = {};
  for (const l of COMMUN) {
    const n = profile?.commun?.[l.id] | 0;
    if (n > 0 && !coupees.has(l.id)) commun[l.id] = n;
  }
  return { lines, commun };
}

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

export { HAUTS_FAITS, HF_BY_ID, evaluerHautsFaits, hfNom, hfTexte };

/* UNE CARTE EST VERROUILLEE SI ET SEULEMENT SI UN HAUT FAIT LA DONNE. La liste
   des verrous se DEDUIT de la table des recompenses au lieu d'etre tenue a cote,
   et une recompense nommee ne bouge plus quand `CARDS` grandit — c'est ce que
   `armes.filter((_, k) => k % 2 === 0)` ne pouvait pas promettre.
   Une arme que le depot ne connait pas encore (`laser`, `tesla`…) traverse sans
   rien verrouiller : le lot des hauts faits precede celui des armes. */
const VERROUILLABLES = new Set(
  [...TOUTES_RECOMPENSES.cartes].filter(id => CARD_BY_ID.has(id)));
/* Une ARME n'est plus une carte : elle se choisit au depart de la manche. Elle
   se verrouille donc dans sa propre liste, sur exactement la meme regle — elle
   est verrouillee si et seulement si un haut fait la donne. */
const ARMES_VERROUILLABLES = new Set(
  [...TOUTES_RECOMPENSES.cartes].filter(id => ARME_BY_ID.has(id)));
const RELIQUES_VERROUILLABLES = TOUTES_RECOMPENSES.reliques;
const LIGNES_VERROUILLABLES = TOUTES_RECOMPENSES.lignes;

const hfDe = profil => Array.isArray(profil) ? profil : (profil?.hf ?? []);

/* `debloquees` est le GRAND-PERE : la migration y a range, carte par carte, ce
   qu'un compte avait deja ouvert sous l'ancien systeme. On ne retire jamais un
   deblocage acquis, et cette garantie ne depend d'aucune correspondance
   jalon -> haut fait qu'il faudrait maintenir. */
export function lockedCards(profil = null) {
  const locked = new Set(VERROUILLABLES);
  const { cartes } = recompensesDe(hfDe(profil));
  for (const id of cartes) locked.delete(id);
  for (const id of profil?.debloquees ?? []) locked.delete(id);
  return locked;
}

export function armesOuvertes(profil = null) {
  const ouvertes = new Set([ARME_DEFAUT]);
  const { cartes } = recompensesDe(hfDe(profil));
  for (const id of cartes) if (ARME_BY_ID.has(id)) ouvertes.add(id);
  for (const id of profil?.debloquees ?? []) if (ARME_BY_ID.has(id)) ouvertes.add(id);
  for (const a of ARMES) if (!ARMES_VERROUILLABLES.has(a.id)) ouvertes.add(a.id);
  return ouvertes;
}

export function lockedRelics(profil = null) {
  const locked = new Set(RELIQUES_VERROUILLABLES);
  const { reliques } = recompensesDe(hfDe(profil));
  for (const id of reliques) locked.delete(id);
  for (const id of profil?.debloquees ?? []) locked.delete(id);
  return locked;
}

/* Une ligne s'OUVRE, elle ne se donne pas : elle coute toujours des noyaux. */
export function lignesVerrouillees(profil = null) {
  const locked = new Set(LIGNES_VERROUILLABLES);
  const { lignes } = recompensesDe(hfDe(profil));
  for (const id of lignes) locked.delete(id);
  return locked;
}

export function ligneOuverte(profil, ligne) {
  return !lignesVerrouillees(profil).has(ligne.famille ?? "");
}

export function cadresDe(profil) {
  const { cadres } = recompensesDe(hfDe(profil));
  cadres.add(CADRE_DEFAUT);
  for (const id of profil?.cadres ?? []) cadres.add(id);
  return cadres;
}

export function cadreActifDe(profil) {
  const id = profil?.cadreActif ?? CADRE_DEFAUT;
  return cadresDe(profil).has(id) ? id : CADRE_DEFAUT;
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
    /* CE QUE CE COMPTE A RENCONTRE. Des CLES et non des index : `ENEMY_TYPES`
       et `BOSS_ROSTER` sont append-only, mais un profil dure plus longtemps
       qu une table et une cle survit a n importe quel reordonnancement futur —
       c est le seul champ de progression qu on ne pourra jamais reparer si les
       index bougent, parce qu il n a pas de source de verite ailleurs.
       RENCONTRE et non VAINCU : `milestones` porte deja `boss_<kind>` pour les
       boss TUES, et un boss qui vous tue resterait un « ? » eternel. Les deux
       existent donc, et ils ne disent pas la meme chose. */
    vus: [],
    kills: {},
    classes: {},
    commun: {},
    confort: [],
    // `bannedCards` a disparu : les bans sont PAR MANCHE depuis le 2026-08-19
    // (p.locked du GameState) — les profils existants gardent un champ mort.
    bestFinal: {},
    hf: [],
    debloquees: [],
    cadres: [CADRE_DEFAUT],
    cadreActif: CADRE_DEFAUT,
    stats: statsVierges(),
  };
}

/* Les cumuls de PROFIL, ceux qu'une seule manche ne peut pas porter. Ils sont
   personnels comme les compteurs de manche : un compteur d'equipe serait atteint
   quatre fois plus vite a quatre joueurs. */
export function statsVierges() {
  return {
    bossTotal: 0, bossKinds: [], bossKindsDur: [],
    killsNear: 0, killsFar: 0, killsBlast: 0,
    harvests: 0, revives: 0, relicsBought: 0, skillUses: 0,
    classes: [],
  };
}

/* DEUX FONCTIONS, ET ELLES NE FONT PAS LA MEME CHOSE. `vueStats` FUSIONNE sans
   rien ecrire : c'est ce que lit l'evaluation, en cours de manche comme a la
   fin, et c'est pour ca qu'un premier boss donne son bandeau tout de suite au
   lieu d'attendre le bilan. `cumulerStats` REPLIE la manche dans le profil, et
   n'est appelee qu'une fois, apres l'evaluation finale — les appeler dans
   l'autre ordre compterait la manche deux fois. */
export function vueStats(profil, run = {}) {
  const s = profil?.stats ?? statsVierges();
  const kinds = new Set(s.bossKinds ?? []);
  const durs = new Set(s.bossKindsDur ?? []);
  let total = s.bossTotal | 0;
  for (const k of run.bossKindsRun ?? []) {
    if (!kinds.has(k)) total++;
    kinds.add(k);
    if ((run.diff | 0) >= 2) durs.add(k);
  }
  const classes = new Set(s.classes ?? []);
  if (run.clsId) classes.add(run.clsId);
  return {
    ...run,
    bossTotal: total,
    bossKinds: kinds.size,
    bossKindsDur: durs.size,
    killsNear: (s.killsNear | 0) + (run.killsNearRun | 0),
    killsFar: (s.killsFar | 0) + (run.killsFarRun | 0),
    killsBlast: (s.killsBlast | 0) + (run.killsBlastRun | 0),
    harvests: (s.harvests | 0) + (run.harvestsRun | 0),
    revives: (s.revives | 0) + (run.revivesRun | 0),
    relicsBought: (s.relicsBought | 0) + (run.relicsRun | 0),
    skillUses: (s.skillUses | 0) + (run.skillUsesRun | 0),
    classes: classes.size,
  };
}

export function cumulerStats(profil, run) {
  if (!profil.stats) profil.stats = statsVierges();
  const s = profil.stats;
  const vue = vueStats(profil, run);
  s.killsNear = vue.killsNear;
  s.killsFar = vue.killsFar;
  s.killsBlast = vue.killsBlast;
  s.harvests = vue.harvests;
  s.revives = vue.revives;
  s.relicsBought = vue.relicsBought;
  s.skillUses = vue.skillUses;
  s.bossTotal = vue.bossTotal;
  const kinds = new Set(s.bossKinds ?? []);
  const durs = new Set(s.bossKindsDur ?? []);
  for (const k of run.bossKindsRun ?? []) {
    kinds.add(k);
    if ((run.diff | 0) >= 2) durs.add(k);
  }
  s.bossKinds = [...kinds];
  s.bossKindsDur = [...durs];
  const classes = new Set(s.classes ?? []);
  if (run.clsId) classes.add(run.clsId);
  s.classes = [...classes];
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

/* CE QUE LE CODEX PEUT CONTENIR, ET RIEN D AUTRE. Les cles de decouverte sont
   ecrites a DEUX endroits de la simulation — l apparition d un corps et
   l arrivee d un boss — et lues par un ecran qui affichera « ? » pour tout ce
   qu il ne trouve pas. Une cle mal formee ne leve donc rien du tout : elle
   s ecrit dans le profil, s y persiste pour toujours, et l entree correspondante
   reste un « ? » que le joueur ne pourra JAMAIS ouvrir.

   `codexClefs()` est la seule source de verite du format, et les deux ecrivains
   comme le lecteur s y comparent. */
export function codexClefs() {
  return [
    ...ENEMY_TYPES.map(t => `e:${t.key}`),
    ...BOSS_ROSTER.map(b => `b:${b.key}`),
  ];
}

export function verifierCodex(vus = []) {
  const soucis = [];
  const connues = new Set(codexClefs());
  if (connues.size !== ENEMY_TYPES.length + BOSS_ROSTER.length) {
    soucis.push("deux entrees partagent une cle de codex");
  }
  for (const t of ENEMY_TYPES) {
    if (!t.key) soucis.push(`un type d ennemi sans cle : ${t.nom ?? "?"}`);
  }
  for (const b of BOSS_ROSTER) {
    if (!b.key) soucis.push(`un boss sans cle : ${b.nom ?? "?"}`);
  }
  for (const v of vus) {
    if (!connues.has(v)) soucis.push(`« ${v} » : rencontre enregistree, entree inconnue`);
  }
  return soucis;
}
