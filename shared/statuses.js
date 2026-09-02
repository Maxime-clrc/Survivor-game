
export const STATUS_VULN = 0;
export const STATUS_BURN = 1;
export const STATUS_ROOT = 2;
export const STATUS_DOOM = 3;

/* UN ETAT SE LIT A SON ICONE, A SA TEINTE ET A SON ANNEAU — jamais a un mot.
   `nom` et `desc` etaient traduits en anglais et n'ont JAMAIS eu de lecteur :
   `statusNom`/`statusDesc` ne sont appeles nulle part. Leur donner un lecteur
   voudrait dire une info-bulle au HUD, or on ne survole rien pendant une vague
   et le budget de l'ecran est deja depense. La regle du depot tranche : un champ
   dont la seule lecture est morte se supprime. Ce qui reste est ce qui se lit —
   la teinte, portee par `couleur`, et le rang dans `PURGE_ORDER`. */
export const STATUSES = [
  { id: STATUS_VULN, key: "vuln", stacks: 3, time: 20, lethal: false, couleur: "#f4b04a" },
  { id: STATUS_BURN, key: "burn", stacks: 1, time: 5,  lethal: false, couleur: "#ff8f4d" },
  { id: STATUS_ROOT, key: "root", stacks: 1, time: 6,  lethal: false, couleur: "#9fb4ff" },
  { id: STATUS_DOOM, key: "doom", stacks: 1, time: 8,  lethal: true,  couleur: "#ff6b8a" },
];


export function statusAt(id) { return STATUSES[id] ?? null; }
export function statusBit(id) { return 1 << id; }

export const PURGE_ORDER = [STATUS_DOOM, STATUS_BURN, STATUS_ROOT, STATUS_VULN];

export const STATUS_CFG = {
  VULN_PER_STACK: 0.25,
  BURN_DPS: 6,
  ROOT_SLOW: 0.40,
  DOOM_HEAL_RATIO: 1,

  PURGE_WINDOW: 3,

  ELITE_STATUS_CD: 4,

  BOSS_MIASMA_EVERY: 25,

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
