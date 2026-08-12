
import { fmtM } from "./units.js";
import { CLASS_COLOR } from "./palette.js";

export const SKILL_HEAL_MODE = 1;
export const SKILL_TAUNT     = 2;
export const SKILL_OVERDRIVE = 4;

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

  HEAL_MODE_INTERVAL: 0.35,
  HEAL_MODE_ALLY: 10,
  HEAL_MODE_SELF: 3,
  HEAL_MODE_REVIVE: 0.35,
  HEAL_MODE_SWAP_CD: 0.5,
  HEAL_MODE_SHIELD_CAP: 60,

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

export function bombRange(ar) {
  const r = Number(ar);
  if (!Number.isFinite(r) || r <= 0) return SKILL_CFG.DPS_BOMB_RANGE_MAX;
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
        desc: `zone de bouclier de ${fmtM(SKILL_CFG.TANK_BULWARK_RADIUS)} qui te suit, 8 s` },
      { nom: "Provocation", touche: "E/2",
        desc: `attire la horde dans ${fmtM(SKILL_CFG.TANK_TAUNT_RADIUS)}, invulnérable 1,2 s puis −50 %` },
    ],
  },
  {
    id: "soigneur", nom: "Soigneur", hp: 100, damageMul: 0.85, speedMul: 1.00,
    unique: true,
    desc: "100 PV, −15 % de dégâts. Soigne à distance, relève à distance.",
    mission: "Tu relèves les tiens, personne d'autre ne le fera. En mode soin "
      + "tes tirs ne blessent plus mais s'arrêtent quand même sur les ennemis : "
      + "trouve l'angle avant d'en avoir besoin.",
    couleur: CLASS_COLOR.soigneur,
    skills: [
      { nom: "Mode soin", touche: "A/1", desc: "bascule : les tirs soignent au lieu de blesser" },
      { nom: "Vague de soin", touche: "E/2",
        desc: `${SKILL_CFG.HEAL_WAVE_AMOUNT} PV à toute l'équipe dans ${fmtM(SKILL_CFG.HEAL_WAVE_RADIUS)}` },
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
        desc: `explosif visé au réticule jusqu'à ${fmtM(SKILL_CFG.DPS_BOMB_RANGE_MAX)}, `
            + `détonation retardée, ${fmtM(SKILL_CFG.DPS_BOMB_RADIUS)} de souffle` },
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

export function classBrief(index) {
  const c = classAt(index);
  return { id: c.id, nom: c.nom, desc: c.desc, couleur: c.couleur, unique: c.unique, skills: c.skills };
}
