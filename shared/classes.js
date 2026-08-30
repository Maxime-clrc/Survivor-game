
import { t, tf } from "./i18n.js";
import { fmtM } from "./units.js";
import { CLASS_COLOR } from "./palette.js";

export const SKILL_HEAL_MODE = 1;
export const SKILL_TAUNT     = 2;
export const SKILL_OVERDRIVE = 4;
export const SKILL_ULT_WIND  = 8;

export const SKILL_CFG = {
  TANK_BULWARK_RADIUS: 130,
  TANK_BULWARK_TIME: 8,
  TANK_BULWARK_SHIELD_RATE: 12,
  TANK_BULWARK_SHIELD_CAP: 60,
  TANK_BULWARK_CD: 20,

  TANK_TAUNT_RADIUS: 400,
  TANK_TAUNT_TIME: 5,
  TANK_TAUNT_INVULN: 1.2,
  TANK_TAUNT_REDUCTION: 0.5,
  TANK_TAUNT_CD: 24,

  // Le mode soin reste une BASCULE et non une recharge : c'est une posture, pas
  // un declenchement. Ce qui change, c'est la question posee au joueur — « ai-je
  // une ligne de tir ? » devient « puis-je RESTER pres de lui ? ». La contrainte
  // n'est pas retiree, elle est remplacee : le lien pousse le soigneur DANS la
  // melee au lieu de le laisser tirer de loin, et ce qu'il fait devient visible
  // pour toute la table.
  HEAL_MODE_SWAP_CD: 0.5,
  HEAL_MODE_SHIELD_CAP: 60,

  HEAL_LINK_RADIUS: 260,
  HEAL_LINK_MAX: 2,
  HEAL_LINK_RATE: 20,
  // sans delai de grace, un allie qui oscille a la limite fait clignoter le lien
  HEAL_LINK_GRACE: 0.5,
  HEAL_LINK_REVIVE: 1.0,

  HEAL_WAVE_RADIUS: 300,
  HEAL_WAVE_AMOUNT: 35,
  HEAL_WAVE_CD: 16,

  DPS_BOMB_RANGE_MIN: 80,
  DPS_BOMB_RANGE_MAX: 460,
  DPS_BOMB_SPEED: 700,
  DPS_BOMB_FLIGHT_MIN: 0.15,
  DPS_BOMB_FLIGHT_MAX: 0.75,
  DPS_BOMB_RADIUS: 140,
  DPS_BOMB_DAMAGE: 200,
  DPS_BOMB_BOSS_MUL: 0.25,
  DPS_BOMB_MAX_TARGETS: 12,
  DPS_BOMB_CD: 9,
  DPS_BOMB_SHARDS: 8,
  DPS_BOMB_SHARD_MUL: 0.5,
  DPS_BOMB_SHARD_LIFE: 0.45,

  DPS_OVERDRIVE_TIME: 6,
  DPS_OVERDRIVE_BASE: 0.20,
  DPS_OVERDRIVE_PER_KILL: 0.08,
  DPS_OVERDRIVE_MAX: 1.00,
  DPS_OVERDRIVE_CD: 26,
  DPS_OVERDRIVE_FADE: 2,
};

/* POINT DE PASSAGE UNIQUE DE `ar`. Il ASSAINIT et rien de plus : absente,
   negative ou aberrante, la distance vaut « aussi loin que possible ». C'est a
   chaque usage de dire jusqu'ou il porte — une bombe et un lance-grenades
   n'ont pas la meme allonge, et un clamp unique en donnait une seule aux deux. */
export function porteeReticule(ar) {
  const r = Number(ar);
  return Number.isFinite(r) && r > 0 ? r : Infinity;
}

export function bombRange(ar) {
  const r = porteeReticule(ar);
  return Math.min(SKILL_CFG.DPS_BOMB_RANGE_MAX,
                  Math.max(SKILL_CFG.DPS_BOMB_RANGE_MIN, r));
}

export function bombFlight(range) {
  return Math.min(SKILL_CFG.DPS_BOMB_FLIGHT_MAX,
                  Math.max(SKILL_CFG.DPS_BOMB_FLIGHT_MIN,
                           range / SKILL_CFG.DPS_BOMB_SPEED));
}

export const CLASSES = [
  {
    id: "tank", nom: "Rempart", hp: 150, damageMul: 0.80, speedMul: 0.92,
    unique: true,
    desc: "150 PV, −20 % de dégâts. Encaisse et déplace la horde.",
    mission: "Tu décides où la horde se trouve, personne d'autre ne le fera. "
      + "Va la chercher, ramène-la loin des tiens, et pose ton Rempart avant "
      + "d'encaisser — pas après.",
    couleur: CLASS_COLOR.tank,
    skills: [
      { nom: "Rempart", touche: "A/1",
        desc: "zone de bouclier de {0} qui te suit, 8 s",
        vals: () => ({ "0": fmtM(SKILL_CFG.TANK_BULWARK_RADIUS) }) },
      { nom: "Provocation", touche: "E/2",
        desc: "attire la horde dans {0}, invulnérable 1,2 s puis −50 %",
        vals: () => ({ "0": fmtM(SKILL_CFG.TANK_TAUNT_RADIUS) }) },
    ],
  },
  {
    id: "soigneur", nom: "Soigneur", hp: 100, damageMul: 0.85, speedMul: 1.00,
    unique: true,
    solo: "sans allié à lier, sa posture de soin est inerte — c'est un rôle de groupe",
    desc: "100 PV, −15 % de dégâts. Lie ses alliés proches et les relève.",
    mission: "Tu relèves les tiens, personne d'autre ne le fera. En posture de "
      + "soin tu ne tires plus : tes liens s'accrochent seuls aux alliés proches "
      + "et cassent si tu les laisses partir. Reste dans la mêlée avec eux.",
    couleur: CLASS_COLOR.soigneur,
    skills: [
      { nom: "Mode soin", touche: "A/1",
        desc: "bascule : {0} liens de {1} PV/s sur les alliés dans {2}",
        vals: () => ({ "0": SKILL_CFG.HEAL_LINK_MAX, "1": SKILL_CFG.HEAL_LINK_RATE,
                       "2": fmtM(SKILL_CFG.HEAL_LINK_RADIUS) }) },
      { nom: "Vague de soin", touche: "E/2",
        desc: "{0} PV à toute l'équipe dans {1}",
        vals: () => ({ "0": SKILL_CFG.HEAL_WAVE_AMOUNT,
                       "1": fmtM(SKILL_CFG.HEAL_WAVE_RADIUS) }) },
    ],
  },
  {
    id: "dps", nom: "Tireur", hp: 85, damageMul: 1.20, speedMul: 1.04,
    unique: false,
    desc: "85 PV, +20 % de dégâts. Fragile, et c'est lui qui vide les vagues.",
    mission: "Tu vides les vagues, personne d'autre ne le fera. Reste derrière "
      + "le Rempart, garde tes distances, et lance ta bombe sur les groupes "
      + "serrés plutôt que sur l'ennemi le plus proche.",
    couleur: CLASS_COLOR.dps,
    skills: [
      { nom: "Bombe", touche: "A/1",
        desc: "explosif visé au réticule jusqu'à {0}, détonation retardée, {1} de souffle",
        vals: () => ({ "0": fmtM(SKILL_CFG.DPS_BOMB_RANGE_MAX),
                       "1": fmtM(SKILL_CFG.DPS_BOMB_RADIUS) }) },
      { nom: "Surcharge", touche: "E/2", desc: "cadence croissante à chaque kill pendant 6 s" },
    ],
  },
];

export const CLASS_BY_ID = new Map(CLASSES.map((c, i) => [c.id, i]));

export const SKILL3_NAME = { tank: "Ancre", soigneur: "Sanctuaire", dps: "Salve" };

export const CLASS_DEFAULT = CLASS_BY_ID.get("dps");

export function classAt(index) {
  return CLASSES[index] ?? CLASSES[CLASS_DEFAULT];
}

/* Points de passage du texte d'une classe. Le francais de la table est le repli ;
   une description de competence compose ses constantes par marqueurs, comme une
   carte. */
export const classNom = c => t(`class.${c.id}.nom`, c.nom);
export const classDesc = c => t(`class.${c.id}.desc`, c.desc);
export const classMission = c => t(`class.${c.id}.mission`, c.mission ?? c.desc);
export const classSolo = c => (c.solo ? t(`class.${c.id}.solo`, c.solo) : "");
export const skillNom = (c, i) => t(`skill.${c.id}.${i}.nom`, c.skills[i].nom);
export const skillDesc = (c, i) => {
  const s = c.skills[i];
  const cle = `skill.${c.id}.${i}.desc`;
  return s.vals ? tf(cle, s.desc, s.vals()) : t(cle, s.desc);
};
export const skill3Nom = id => t(`skill3.${id}`, SKILL3_NAME[id] ?? "");
