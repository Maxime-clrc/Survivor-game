/* ===========================================================================
   PROGRESSION PERMANENTE (lot D du plan v3) — module pur, importe par le
   serveur ET le navigateur, sur le modele de `cards.js` : aucune reference au
   DOM, au reseau ni au systeme de fichiers. La PERSISTANCE (lecture, ecriture
   atomique) vit dans `progress_store.js`, cote serveur uniquement — ce module
   ne connait que les tables et les regles.

   Decisions verrouillees du plan, a ne pas rouvrir sans raison :
     - les cartes sont absorbees par la difficulte, la META NE L'EST PAS :
       `_playerPower` lit `p.powerMods` (cartes + classe) et jamais les mods
       enrichis par `applyMeta` — c'est ce qui fait qu'on se sent reellement
       plus fort au lieu de courir sur un tapis roulant ;
     - plafonnement par EMPLACEMENTS, pas par valeurs : on debloque
       definitivement, on n'equipe que N lignes par partie ;
     - emplacements propres a chaque classe, monnaie commune au compte ;
     - la monnaie vient de la performance d'EQUIPE, versee a parts egales —
       jamais des kills individuels : le soigneur tue peu par construction ;
     - les cartes se deverrouillent par JALONS, pas par monnaie : deux
       systemes qui puiseraient dans la meme bourse feraient acheter la
       puissance d'abord et ne montrer les nouvelles cartes jamais.
   =========================================================================== */

import { CARDS, CARD_CFG, RARITY } from "./cards.js";
import { SKILL_CFG } from "./classes.js";
import { BOSS_ROSTER } from "./bosses.js";

export const PROG_CFG = {
  // Passe a 2 avec la simplification pseudo+cle (plus de uid ni de tag) :
  // une ligne Supabase ecrite par l'ancien format n'est plus jamais adoptee
  // en silence, `progress_store.js` la voit comme une version inconnue et
  // suspend l'ecriture au lieu d'ecraser ou de melanger les deux modeles.
  VERSION: 2,

  /* Emplacements. On debloque definitivement, on equipe partiellement : c'est
     ce qui distingue ce systeme d'une simple echelle — apres cent parties, la
     decision existe toujours, et deux tanks peuvent etre joues differemment. */
  SLOTS_BASE: 3,
  SLOTS_MAX: 6,
  SLOTS_STEP: 12,            // +1 emplacement tous les 12 paliers achetes dans la classe

  TIERS_MAX: 5,
  TIER_COSTS: [150, 260, 420, 650, 1000],

  /* La monnaie : les NOYAUX, extraits des creatures. Jamais sur les kills
     individuels — vague atteinte et boss vaincus, verses a parts egales. */
  CORE_WAVE: 4,              // par vague atteinte : 4 x numero de la vague
  CORE_BOSS: 120,
  CORE_FIRST_WAVES: { 5: 200, 10: 400, 15: 800, 20: 1500 },
  CORE_FIRST_BOSS: 300,
  DIFF_MUL: [1, 1.35, 1.8],  // meme ordre que DIFFICULTIES

  /* Jalons de deblocage de cartes. */
  KILLS_MILESTONE: 500,      // kills cumules avec une meme classe
  NO_DOWN_MIN_WAVE: 5,       // « sans etre mis a terre » ne vaut qu'a partir de la

  /* Le tronc de confort : non-puissance, coût fixe, ne consomme AUCUN
     emplacement. */
  CONFORT_COSTS: { relance: 800, quatrieme: 1500, ravitaillement: 600 },

  /* Constantes des lignes qui ne se resument pas a un mod existant. */
  CATALYSE_TIME: 3,          // secondes de bonus sur la cible soignee
  THORNS_RADIUS: 80,         // 4 m
  GUARD_RADIUS: 120,         // 6 m
};

/* --- les trois arbres -----------------------------------------------------------

   Principe : chaque arbre renforce ce que la classe fait DEJA, il ne comble pas
   ses faiblesses. Un tank qui achete des degats devient un mauvais tireur ; un
   tank qui achete de la protection d'equipe devient un meilleur tank.

   `apply(m, n)` mute l'objet mods comme les cartes, avec `n` paliers achetes.
   `metaHpRatio` est une cle de travail consommee par `applyMeta` — les PV max
   se rejouent depuis le total de `fullMods`, jamais en increments.
   `desc(n)` rend l'effet TOTAL a n paliers, en chaine affichee (accents). */

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
    /* La ligne la plus importante du lot : elle rend le soigneur offensif
       INDIRECTEMENT, le seul moyen de le rendre desirable sans en faire un
       tireur. */
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

/* Le tronc de confort, commun aux trois classes. Non-puissance : aucun de ces
   trois achats n'entre dans `applyMeta`, ils sont lus par le serveur (relance,
   quatrieme offre) ou a l'inscription du joueur (ravitaillement). */
export const CONFORT = [
  { id: "relance", nom: "Relance",
    desc: "une relance de tirage de carte par partie" },
  { id: "quatrieme", nom: "Quatrième offre",
    desc: "quatre cartes proposées au lieu de trois" },
  { id: "ravitaillement", nom: "Ravitaillement initial",
    desc: "un bonus au sol dès la vague 1" },
];

/* --- application des paliers equipes -------------------------------------------

   En AVAL de `fullMods` et jamais dedans : `p.powerMods` garde le resultat de
   fullMods (cartes + classe), c'est lui que lit `_playerPower` — la meta est
   ainsi exclue de la difficulte par construction, pas par soustraction.
   L'objet mods est copie a plat : il ne contient que des scalaires et une
   chaine d'arme, et muter l'original ferait pointer powerMods et mods sur le
   meme objet. */
export function applyMeta(mods, maxHp, clsId, lines) {
  const m = { ...mods, metaHpRatio: 0 };
  const tree = TREES[clsId] ?? [];
  for (const line of tree) {
    const n = Math.min(lines[line.id] | 0, PROG_CFG.TIERS_MAX);
    if (n > 0) line.apply(m, n);
  }
  /* Les memes plafonds que `computeMods`, pour les mods que la meta touche :
     la meta s'ajoute APRES le plafonnement des cartes, elle ne doit pas le
     contourner. */
  m.critChance = Math.min(CARD_CFG.CRIT_CHANCE_CAP, m.critChance);
  m.damageTakenMul = Math.max(CARD_CFG.DAMAGE_TAKEN_FLOOR, m.damageTakenMul);
  const hp = Math.round(maxHp * (1 + m.metaHpRatio));
  delete m.metaHpRatio;
  return { mods: m, maxHp: hp };
}

/* Emplacements disponibles pour un profil de classe : la base, plus un tous
   les SLOTS_STEP paliers achetes dans CETTE classe — ameliorer le tank ne
   benefice pas au tireur, l'emplacement non plus. */
export function slotsFor(clsProfile) {
  let bought = 0;
  for (const v of Object.values(clsProfile?.tiers ?? {})) bought += v | 0;
  return Math.min(PROG_CFG.SLOTS_MAX,
    PROG_CFG.SLOTS_BASE + Math.floor(bought / PROG_CFG.SLOTS_STEP));
}

export function tierCost(currentTier) {
  return PROG_CFG.TIER_COSTS[currentTier] ?? Infinity;
}

/* --- deblocage de cartes par jalons --------------------------------------------

   Ce qui est verrouille au depart : les LEGENDAIRES, les ARMES de remplacement
   et les cartes CONDITIONNELLES. Tout le socle reste accessible — effet
   secondaire precieux : un nouveau joueur decouvre un pool plus simple, c'est
   de l'onboarding sans ecrire une ligne de tutoriel.

   Les groupes sont CALCULES depuis la table des cartes et non recopies : une
   liste d'identifiants ecrite ici aurait diverge a la premiere carte ajoutee
   (le lot C vient justement d'ajouter trois legendaires). */
// Les armes sont TOUTES legendaires aujourd'hui : les tenir a part d'abord,
// sinon le groupe des legendaires les absorbe et le jalon des armes ne
// debloque rien — c'est arrive, l'ecran affichait « (0 carte) ».
const armes = CARDS
  .filter(c => c.remplaceArme && !c.fallback)
  .map(c => c.id);
const legendaires = CARDS
  .filter(c => c.rarity === RARITY.LEGENDAIRE && !c.fallback && !c.remplaceArme)
  .map(c => c.id);
const conditionnelles = CARDS
  .filter(c => c.applyAfter && c.rarity !== RARITY.LEGENDAIRE && !c.remplaceArme)
  .map(c => c.id);

// Les legendaires se repartissent sur les cinq boss, en tourniquet : chaque
// premiere victoire en libere deux ou trois, et l'ordre des combats n'a pas
// d'importance.
const legendairesDuBoss = i => legendaires.filter((_, k) => k % BOSS_ROSTER.length === i);

export const MILESTONES = [
  { id: "vague8", label: "atteindre la vague 8", unlocks: conditionnelles },
  ...BOSS_ROSTER.map((b, i) => ({
    id: `boss_${i}`, label: `vaincre ${b.nom}`, unlocks: legendairesDuBoss(i),
  })),
  { id: "sans_chute",
    label: `terminer une manche (vague ${PROG_CFG.NO_DOWN_MIN_WAVE}+) sans être mis à terre`,
    unlocks: armes.filter((_, k) => k % 2 === 0) },
  { id: "kills500",
    label: `tuer ${PROG_CFG.KILLS_MILESTONE} ennemis avec une même classe`,
    unlocks: armes.filter((_, k) => k % 2 === 1) },
];

const MILESTONE_BY_ID = new Map(MILESTONES.map(m => [m.id, m]));

/* Cartes encore verrouillees pour un compte, d'apres ses jalons accomplis.
   Rend un Set d'identifiants, consomme par `eligibleCards`. */
export function lockedCards(milestonesDone = []) {
  const locked = new Set([...legendaires, ...armes, ...conditionnelles]);
  for (const id of milestonesDone) {
    const m = MILESTONE_BY_ID.get(id);
    if (m) for (const cardId of m.unlocks) locked.delete(cardId);
  }
  return locked;
}

/* --- monnaie --------------------------------------------------------------------

   La somme des vagues est fermee : Σ 4w pour w = 1..W vaut 2 W (W+1). Verse a
   parts EGALES : la fonction ne prend rien d'individuel, et c'est voulu. */
export function coresForRun(wave, bossKills, diffIndex) {
  const base = PROG_CFG.CORE_WAVE * wave * (wave + 1) / 2
    + PROG_CFG.CORE_BOSS * bossKills;
  return Math.round(base * (PROG_CFG.DIFF_MUL[diffIndex] ?? 1));
}

// Part d'un joueur qui quitte en cours de manche : les vagues jouees, rien
// d'autre — ni boss ni jalons, qui se constatent a la fin.
export function coresPartial(wave, diffIndex) {
  return Math.round(PROG_CFG.CORE_WAVE * wave * (wave + 1) / 2
    * (PROG_CFG.DIFF_MUL[diffIndex] ?? 1));
}

/* Profil neuf. Le champ `version` vit sur le FICHIER (progress_store), pas sur
   chaque profil. `kills` cumule par classe, pour le jalon des 500. */
/* Simplification pseudo+cle : le pseudo EST le compte, plus un champ `name`
   distinct qui ne servait qu'a l'affichage avant reservation. Le compte
   n'existe qu'a partir du moment ou un pseudo lui est attache — `pseudo` est
   donc pose ici, a la creation, par `progress_store.js#resolveAccount`. */
export function newProfile(pseudo) {
  return {
    pseudo,
    cores: 0,
    runs: 0,
    best: { wave: 0, score: 0 },
    milestones: [],
    kills: {},           // clsId -> kills cumules
    classes: {},         // clsId -> { tiers: { ligne -> palier }, equipped: [lignes] }
    confort: [],         // identifiants de CONFORT achetes
  };
}
