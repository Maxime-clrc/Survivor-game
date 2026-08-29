
import { t } from "./i18n.js";

export const STATUS_VULN = 0;
export const STATUS_BURN = 1;
export const STATUS_ROOT = 2;
export const STATUS_DOOM = 3;

export const STATUSES = [
  {
    id: STATUS_VULN, key: "vuln", nom: "Vulnérabilité",
    stacks: 3, time: 20, lethal: false,
    desc: "+25 % de dégâts subis par cumul",
    couleur: "#f4b04a",
  },
  {
    id: STATUS_BURN, key: "burn", nom: "Brûlure",
    stacks: 1, time: 5, lethal: false,
    desc: "6 dégâts par seconde",
    couleur: "#ff8f4d",
  },
  {
    id: STATUS_ROOT, key: "root", nom: "Entrave",
    stacks: 1, time: 6, lethal: false,
    desc: "vitesse −40 %",
    couleur: "#9fb4ff",
  },
  {
    id: STATUS_DOOM, key: "doom", nom: "Sentence",
    stacks: 1, time: 8, lethal: true,
    desc: "mort à échéance sauf si soigné à plein",
    couleur: "#ff6b8a",
  },
];

export const STATUS_BY_KEY = new Map(STATUSES.map(s => [s.key, s.id]));

export function statusAt(id) { return STATUSES[id] ?? null; }
export const statusNom = id => t(`status.${id}.nom`, statusAt(id)?.nom ?? "");
export const statusDesc = id => t(`status.${id}.desc`, statusAt(id)?.desc ?? "");
export function statusBit(id) { return 1 << id; }

export const PURGE_ORDER = [STATUS_DOOM, STATUS_BURN, STATUS_ROOT, STATUS_VULN];

export const STATUS_CFG = {
  VULN_PER_STACK: 0.25,
  BURN_DPS: 6,
  ROOT_SLOW: 0.40,
  DOOM_HEAL_RATIO: 1,

  PURGE_HITS: 2,
  PURGE_WINDOW: 3,

  ELITE_STATUS_CD: 4,

  BOSS_MIASMA_EVERY: 25,

  BULWARK_PURGE: 1,

  PURIFY_CHANCE: 0.06,
  PURIFY_CHANCE_NO_HEALER: 0.16,
  // la chance ci-dessus est MODULEE par les etats reellement poses : plancher
  // quand l'equipe est propre, x2 quand chacun en porte un
  PURIFY_FLOOR: 0.25,
  PURIFY_SPAN: 1.75,
};

export const ELITE_STATUS = {
  runner: STATUS_ROOT,
  tank: STATUS_VULN,
  shooter: STATUS_BURN,
};

export function enemyStatusMask(e, time) {
  let mask = 0;
  if (e.burn) mask |= statusBit(STATUS_BURN);
  if (e.vulnUntil > time) mask |= statusBit(STATUS_VULN);
  return mask;
}
