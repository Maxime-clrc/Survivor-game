
export const RELIC_RARITY = ["commune", "rare", "epique", "legendaire"];

export const RELIC_CFG = {
  OFFER_COUNT: 3,
  PICK_TIME: 30,
  REROLL_BASE: 6,
  REROLL_LEVEL: 2,
  PRICE: [25, 45, 80, 150],
};


export const RELICS = [
  {
    id: "eclat_dur", nom: "Éclat dur", tier: 0,
    flatDamage: 6,
    desc: "+6 dégâts bruts sur chaque tir",
  },
  {
    id: "plaque_rouillee", nom: "Plaque rouillée", tier: 0,
    flatHp: 25,
    desc: "+25 PV bruts",
  },
  {
    id: "ressort_use", nom: "Ressort usé", tier: 0,
    rateFlat: -0.03,
    desc: "−0,03 s d'intervalle de tir",
  },

  {
    id: "noyau_instable", nom: "Noyau instable", tier: 1,
    flatDamage: 18, flatHp: -10,
    desc: "+18 dégâts bruts, mais −10 PV bruts",
    contrepartie: "−10 PV bruts",
  },
  {
    id: "filtre_purifiant", nom: "Filtre purifiant", tier: 1,
    mode: "filtre",
    desc: "retire un état toutes les 10 s",
  },
  {
    id: "battery_secours", nom: "Batterie de secours", tier: 1,
    mode: "battery",
    desc: "le bouclier, une fois vide, se recharge une fois à 50 % de sa jauge (une fois par manche)",
  },

  {
    id: "coeur_de_ravageur", nom: "Cœur de Ravageur", tier: 2,
    bossDamage: 35,
    desc: "+35 dégâts bruts contre les boss uniquement",
  },
  {
    id: "essaim_captif", nom: "Essaim captif", tier: 2,
    mode: "swarm",
    desc: "un projectile supplémentaire orbite en permanence autour du joueur",
  },
  {
    id: "memoire_gravee", nom: "Mémoire gravée", tier: 2,
    mode: "memoire",
    desc: "la première compétence utilisée à chaque minute de horde a sa recharge immédiatement réinitialisée",
  },

  {
    id: "coeur_machine", nom: "Cœur-machine", tier: 3,
    flatDamage: 50, flatHp: 80, speedFixed: true,
    desc: "+50 dégâts bruts, +80 PV bruts, mais la vitesse de déplacement est fixée à sa valeur de base (annule tout bonus de vitesse des cartes)",
    contrepartie: "vitesse de déplacement fixée à la base",
  },
];

export function relicById(id) {
  for (const r of RELICS) if (r.id === id) return r;
  return null;
}

export function relicPrice(r) {
  return RELIC_CFG.PRICE[r.tier] ?? 0;
}

export function relicRerollCost(niveau) {
  return Math.round(RELIC_CFG.REROLL_BASE + RELIC_CFG.REROLL_LEVEL * Math.max(0, niveau - 1));
}
