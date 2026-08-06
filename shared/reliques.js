/* ===========================================================================
   RELIQUES (lot K) — module pur, comme cards.js : il ne depend de RIEN,
   game_state.js l'importe, jamais l'inverse (un cycle d'import casserait le
   chargement dans le navigateur).

   Une relique s'ACHETE au marchand contre des eclats (la monnaie de manche du
   lot I), apres chaque victoire de boss. Trois differences fondamentales avec
   les cartes :

     - monnaie   : une carte est gratuite (tirage), une relique se paie ;
     - effet     : une carte est presque toujours en %, une relique en VALEUR
       BRUTE — « +8 degats » reste utile sur une build qui n'a pris aucune
       autre carte de degats, c'est un axe de puissance qui ne depend d'aucun
       autre choix ;
     - duree     : l'une et l'autre tiennent une manche, et meurent avec le
       GameState — jamais de persistance (p.eclats ne se persiste pas).

   Une relique a valeur brute s'applique en AMONT du calcul de puissance, pas
   en facteur : voir _playerPower() et les points de calcul de degats.
   =========================================================================== */

/* Paliers de rarete. Meme structure que les cartes, quatre prix croissants.
   La contrainte « une seule legendaire par manche » evite qu'une manche
   tres genereuse en eclats cumule plusieurs effets exceptionnels et
   desequilibre le combat de boss suivant : elle vit dans le GameState de la
   salle (une par manche, pas par compte), jamais ici. */
export const RELIC_RARITY = ["commune", "rare", "epique", "legendaire"];

export const RELIC_CFG = {
  /* L'offre du marchand (lot K). Trois reliques proposees, achats
     INDEPENDANTS — contrairement aux cartes ce n'est pas un choix exclusif,
     c'est un budget a repartir : un joueur en achete zero, une, deux ou les
     trois s'il a assez d'eclats.

     La relance (reroll) se paie en eclats, a un cout CROISSANT avec la vague :
     un cout fixe se banalise en fin de manche quand les eclats abondent, et
     une relance systematique viderait le marchand de son interet — ce serait
     quatre tirages au lieu d'un, a prix constant. La spec laissait la
     question ouverte ; decision du porteur (2026-08-06) : oui, cout croissant.

     Les prix sont la valeur de DEPART de la liste validee par le porteur
     (2026-08-06) ; l'equilibrage fin viendra en jouant, mesures a l'appui. */
  OFFER_COUNT: 3,
  PICK_TIME: 30,           // delai de l'ecran, en secondes — au bout, on ferme
                           // sans forcer d'achat (contrairement aux cartes)
  REROLL_BASE: 6,          // cout de la premiere relance, en eclats
  REROLL_WAVE: 2,          // eclats ajoutes par vague ecoulee (croissance)
  PRICE: [25, 45, 80, 150], // par palier de rarete — ordre = RELIC_RARITY
  /* La relique se revent-elle ? Non. Pas de debannissement, pas de revente :
     le marchand est une decision, pas un marche. */
};

/* --- les dix reliques ------------------------------------------------------

   Chaque relique declare ce qu'elle fait sous forme de CLES que la simulation
   lit : `flatDamage` (ajoute aux degats d'un tir, avant les multiplicateurs),
   `flatHp` (ajoute aux PV max), `rateFlat` (intervalle de tir en secondes,
   SOUSTRAIT), ou un `mode` special pour les comportements que des chiffres ne
   suffisent pas a dire (filtre, batterie, essaim, memoire, coeur-machine).

   Convention d'identifiants : francais SANS accents (comme partout dans le
   depot — seules les chaines affichees au joueur portent des accents).
   `mémoire_gravee` de la spec est donc `memoire_gravee` ici : l'identifiant
   circule dans le protocole d'achat, et un accent y aurait ete le premier du
   depot.

   La note sur `coeur_machine` de la spec reste d'actualite : c'est la seule
   relique a contrepartie, et la contrepartie (vitesse fixee a la base) est le
   candidat le plus probable a retravailler en jouant. */

export const RELICS = [
  /* --- Communes --- */
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

  /* --- Rares --- */
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

  /* --- Epiques --- */
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
    desc: "la première compétence utilisée à chaque vague a sa recharge immédiatement réinitialisée",
  },

  /* --- Legendaire --- */
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

/* Prix d'une relique, en eclats. */
export function relicPrice(r) {
  return RELIC_CFG.PRICE[r.tier] ?? 0;
}

/* Cout d'une relance de l'offre, croissant avec la vague. */
export function relicRerollCost(wave) {
  return Math.round(RELIC_CFG.REROLL_BASE + RELIC_CFG.REROLL_WAVE * Math.max(0, wave - 1));
}
