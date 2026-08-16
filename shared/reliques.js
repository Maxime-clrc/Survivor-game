
import { t } from "./i18n.js";

export const RELIC_RARITY = ["commune", "rare", "epique", "legendaire"];

export const RELIC_CFG = {
  OFFER_COUNT: 4,
  BUY_PER_VISIT: 1,
  PICK_TIME: 30,
  REROLL_BASE: 10,
  REROLL_LEVEL: 3,
  REROLL_GROWTH: 1.8,
  PRICE: [25, 45, 80, 150],
  // plus PLAT que celui des cartes, volontairement : le marchand est un achat, pas
  // un cadeau. Voir une epique sans pouvoir se la payer est une decision.
  WEIGHT: [50, 28, 15, 4],
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
    id: "silex", nom: "Silex", tier: 0,
    burnFlat: 5,
    desc: "+5 dégâts de brûlure bruts",
  },
  {
    id: "semelle_cloutee", nom: "Semelle cloutée", tier: 0,
    slipImmune: true,
    desc: "immunité aux sols glissants",
  },
  {
    id: "contrepoids", nom: "Contrepoids", tier: 0,
    dashCdFlat: -0.6,
    desc: "−0,6 s de recharge d'esquive",
  },
  {
    id: "lame_recolte", nom: "Lame de récolte", tier: 0,
    harvestSpeed: 1,
    desc: "canalisation d'un amas deux fois plus rapide",
  },
  {
    id: "fanion", nom: "Fanion", tier: 0,
    allyFlatHp: 15, equipe: true,
    desc: "+15 PV bruts à chaque allié",
  },
  {
    id: "cran_arret", nom: "Cran d'arrêt", tier: 0,
    dashShotFlat: 12,
    desc: "+12 dégâts bruts sur le premier tir après une esquive",
  },
  {
    id: "besace", nom: "Besace", tier: 0,
    shardFlat: 6,
    desc: "+6 éclats par point de récolte",
  },

  {
    id: "crochet", nom: "Crochet", tier: 1,
    rootChance: 0.10,
    desc: "10 % de chance d'entraver la cible 1 s",
  },
  {
    id: "trousse_campagne", nom: "Trousse de campagne", tier: 1,
    reviveHeal: 30,
    desc: "relever un allié rend 30 PV bruts aux deux",
  },
  {
    id: "boussole", nom: "Boussole", tier: 1,
    harvestGround: 1,
    equipe: true,
    desc: "un point de récolte de plus au sol en permanence — vaut pour toute l'équipe",
  },
  {
    id: "marteau_breche", nom: "Marteau de brèche", tier: 1,
    mechDamage: 30,
    desc: "+30 dégâts bruts contre les structures de mécanique de boss",
  },

  {
    id: "terre_brulee", nom: "Terre brûlée", tier: 2,
    hazardDamage: 22, requiresSystem: "hasards_actifs",
    desc: "+22 dégâts bruts contre un ennemi dans un danger du sol",
  },
  {
    id: "registre", nom: "Registre", tier: 2,
    barDamage: 7, barDamageMax: 105,
    desc: "chaque barre de boss brisée donne +7 dégâts bruts, jusqu'à +105, pour le reste de la manche",
  },

  {
    id: "serment_de_fer", nom: "Serment de fer", tier: 3,
    allyFlatDamage: 35, allyFlatHp: 50, noHeal: true, minPlayers: 2,
    desc: "+35 dégâts bruts et +50 PV bruts à tous les alliés, mais tu ne peux plus être soigné",
    contrepartie: "aucun soin reçu",
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

/* Point de passage du texte d'une relique. Le francais de la table est le repli.
   Aucune description de relique ne compose de constante : ce sont des valeurs
   brutes ecrites a cote de leur champ, elles n'ont donc pas de marqueur. */
export const relicRarityLabel = i => t(`relicrarity.${i}`, RELIC_RARITY[i] ?? "");
export const relicNom = id => t(`relics.${id}.nom`, relicById(id)?.nom ?? "");
export const relicDesc = id => t(`relics.${id}.desc`, relicById(id)?.desc ?? "");
export const relicContrepartie = id =>
  t(`relics.${id}.contrepartie`, relicById(id)?.contrepartie ?? "");

export function relicPrice(r) {
  return RELIC_CFG.PRICE[r.tier] ?? 0;
}

// la relance croit DANS la visite : sans ca, un achat unique n'empeche pas
// d'enchainer cinq relances jusqu'a l'epique voulue
export function relicRerollCost(niveau, dansLaVisite = 0) {
  const base = RELIC_CFG.REROLL_BASE
    + RELIC_CFG.REROLL_LEVEL * Math.max(0, niveau - 1);
  return Math.round(base * Math.pow(RELIC_CFG.REROLL_GROWTH, dansLaVisite));
}
