/* ===========================================================================
   CLASSES ET COMPETENCES — module pur, importe par le serveur ET le navigateur.
   Sur le modele exact de `cards.js` : il ne depend de rien, surtout pas de
   `game_state.js`, qui l'importe — un cycle d'import casserait le chargement
   des modules dans le navigateur.

   C'est aussi pourquoi les constantes de competence vivent ICI et non dans
   `CFG` : une competence de classe est de la meme famille qu'une carte, son
   reglage doit etre lisible a cote de la table qui le decrit.
   =========================================================================== */

import { fmtM } from "./units.js";
import { CLASS_COLOR } from "./palette.js";

/* Masque de drapeaux du snapshot. Trois etats visibles a l'ecran, un bit
   chacun : un champ de plus par joueur aurait coute trois nombres la ou un
   seul suffit. */
export const SKILL_HEAL_MODE = 1;
export const SKILL_TAUNT     = 2;
export const SKILL_OVERDRIVE = 4;

/* SKILL_CFG est declare AVANT `CLASSES` — et non apres, comme c'etait le cas —
   pour que les descriptions de competence composent leurs distances avec
   `fmtM(SKILL_CFG.…)` au lieu de recopier un nombre a la main. Un texte qui
   recopie une constante ment des le premier reglage, et personne ne pense a
   relire les chaines quand il change un rayon. */
export const SKILL_CFG = {
  /* --- tank --------------------------------------------------------------
     Une competence de PLACEMENT (proactive, a anticiper) et une de REACTION
     (le bouton qu'on presse quand ca tourne mal). C'est la regle des trois
     classes : deux boutons de reaction auraient ete redondants. */
  /* LE REMPART SUIT LE TANK. Il etait pose au sol, a `x`/`y` figes, et la
     justification d'origine — « ca recompense l'immobilite dans un jeu qui la
     punit, donc c'est une tension interessante » — ne tenait pas a l'usage : ce
     n'etait pas une tension, c'etait inutilisable. Le tank qui va chercher la
     horde pour la ramener est precisement celui qui ne peut pas rester dedans.

     Le rayon tombe de 170 a 130 : une zone qui suit vaut bien plus qu'une zone
     posee, et la garder a 170 aurait fait du bouton une aura permanente de
     8,5 m sans aucune decision.

     Mais le faire suivre SANS RIEN D'AUTRE retire au tank sa seule decision de
     placement. D'ou la carte « Ancrage », qui rend la version posee — plus
     grande, plus longue, meilleure regeneration — a qui la veut. Les deux
     versions coexistent, et c'est la carte qui choisit. */
  TANK_BULWARK_RADIUS: 130,
  TANK_BULWARK_TIME: 8,
  TANK_BULWARK_SHIELD_RATE: 12,   // points de bouclier par seconde
  TANK_BULWARK_SHIELD_CAP: 60,    // au-dela du reservoir des cartes
  TANK_BULWARK_CD: 20,

  TANK_TAUNT_RADIUS: 400,
  TANK_TAUNT_TIME: 5,
  /* 1,2 s et non une invulnerabilite franche : les annonces du boss durent 1,4
     a 2 s. Une invulnerabilite couvrant une annonce entiere ferait traverser
     les mecaniques sans les lire, et l'ecart entre « lire l'annonce » et
     « l'ignorer » — la mesure de reference du depot pour juger une mecanique —
     s'effondrerait. 1,2 s couvre le pic d'un coup encaisse, pas une phase. */
  TANK_TAUNT_INVULN: 1.2,
  TANK_TAUNT_REDUCTION: 0.5,      // apres l'invulnerabilite
  TANK_TAUNT_CD: 24,

  /* --- soigneur ----------------------------------------------------------
     Le mode soin est une BASCULE et non une recharge : c'est une posture, pas
     un declenchement. En mode soin les projectiles ne blessent plus mais
     s'arretent quand meme sur les ennemis — c'est cette contrainte qui rend la
     classe interessante : soigner quelqu'un derriere la horde devient un
     probleme de position et de ligne de vue, pas un clic sur une barre. */
  HEAL_MODE_INTERVAL: 0.35,
  HEAL_MODE_ALLY: 10,             // PV rendus par impact sur un allie
  HEAL_MODE_SELF: 3,              // PV rendus au soigneur par impact sur un ennemi
  HEAL_MODE_REVIVE: 0.35,         // secondes de reanimation par impact sur un joueur a terre
  HEAL_MODE_SWAP_CD: 0.5,         // anti-spam de la bascule
  // Le surplus de soin se convertit en bouclier, sinon soigner quelqu'un a
  // pleine vie ne sert a rien — et c'est precisement le moment ou on a le
  // temps de le faire.
  HEAL_MODE_SHIELD_CAP: 60,

  HEAL_WAVE_RADIUS: 300,
  HEAL_WAVE_AMOUNT: 35,
  HEAL_WAVE_CD: 16,

  /* --- tireur ------------------------------------------------------------
     Le delai de detonation est essentiel : sans lui, la bombe est un clic
     gagnant sans anticipation.

     Elle est VISEE et non « lancee devant soi ». L'ancienne version partait a
     vitesse et delai fixes, donc toujours a 420 px : sur un amas proche, elle
     passait au-dessus et explosait derriere, et le joueur n'avait aucun moyen
     de raccourcir son lancer. Le protocole transporte desormais un scalaire de
     plus (`ar`, la distance au reticule) en plus des deux directions
     normalisees. C'est le SERVEUR qui le borne — un client ne doit pas pouvoir
     poser une explosion n'importe ou dans l'arene, sur une cible qu'il ne voit
     meme pas : d'ou l'encadrement strict ci-dessous plutot qu'une position
     libre.

     Le temps de vol suit la distance, ce qui garde le point de chute
     previsible : un lancer court explose vite, un lancer long laisse le temps
     de reagir. Il reste borne des deux cotes — sans plancher, une bombe posee
     a bout portant detonerait avant d'etre vue ; sans plafond, un lancer
     maximal deviendrait une annonce interminable. */
  DPS_BOMB_RANGE_MIN: 80,         // 4 m — en deca, elle explose sur soi
  DPS_BOMB_RANGE_MAX: 460,        // 23 m
  DPS_BOMB_SPEED: 700,            // le temps de vol en decoule, il n'est plus fixe
  DPS_BOMB_FLIGHT_MIN: 0.15,
  DPS_BOMB_FLIGHT_MAX: 0.75,
  DPS_BOMB_RADIUS: 140,
  DPS_BOMB_DAMAGE: 200,
  DPS_BOMB_BOSS_MUL: 0.25,        // fortement reduite sur le boss
  /* Plafond de cibles. Avec 200 ennemis, une explosion peut en toucher
     quarante : sans plafond, la bombe devient l'essentiel de la contribution
     du tireur et le reste de son jeu ne compte plus. Les douze plus proches
     d'abord. */
  DPS_BOMB_MAX_TARGETS: 12,
  DPS_BOMB_CD: 9,
  // Eclats de « Fragmentation » : des balles ordinaires, donc soumises aux
  // memes collisions et au meme plafond de portee que le tir normal.
  DPS_BOMB_SHARDS: 8,
  DPS_BOMB_SHARD_MUL: 0.5,
  DPS_BOMB_SHARD_LIFE: 0.45,

  /* Le bonus MONTE a chaque kill pendant la fenetre : c'est ce qui sauve la
     surcharge du bouton sans decision. Declenchee au creux d'une vague elle
     est mediocre, au pic elle est spectaculaire — le tireur doit lire le
     rythme, comme le tank lit les regroupements. */
  DPS_OVERDRIVE_TIME: 6,
  DPS_OVERDRIVE_BASE: 0.20,
  DPS_OVERDRIVE_PER_KILL: 0.08,
  DPS_OVERDRIVE_MAX: 1.00,
  DPS_OVERDRIVE_CD: 26,
  // « Surcharge prolongee » : le bonus redescend au lieu de tomber d'un coup.
  DPS_OVERDRIVE_FADE: 2,
};

/* Bornage de la distance au reticule. Point de passage UNIQUE, appele par le
   serveur a la reception de l'entree et par la simulation au lancer : le
   serveur ne fait jamais confiance au client, et `game_state.js` doit rester
   testable seul, sans serveur pour l'avoir nettoyee avant lui.

   Une valeur absente, negative ou aberrante retombe sur la portee MAXIMALE et
   non sur zero : c'est le comportement d'avant le lot (« lancee devant soi a
   bout de portee »), donc un client plus ancien, qui n'envoie pas `ar` du
   tout, continue de jouer exactement comme avant. */
export function bombRange(ar) {
  const r = Number(ar);
  if (!Number.isFinite(r) || r <= 0) return SKILL_CFG.DPS_BOMB_RANGE_MAX;
  return Math.min(SKILL_CFG.DPS_BOMB_RANGE_MAX,
                  Math.max(SKILL_CFG.DPS_BOMB_RANGE_MIN, r));
}

/* Temps de vol pour une portee deja bornee. Sorti ici pour que le client
   puisse dessiner l'arc de progression du cercle d'atterrissage avec la meme
   duree que la simulation, sans la recalculer de son cote. */
export function bombFlight(range) {
  return Math.min(SKILL_CFG.DPS_BOMB_FLIGHT_MAX,
                  Math.max(SKILL_CFG.DPS_BOMB_FLIGHT_MIN,
                           range / SKILL_CFG.DPS_BOMB_SPEED));
}

/* `CLASSES` est un TABLEAU ORDONNE et son index circule dans les snapshots
   (champ `cls` du tuple joueur) : ne jamais inserer au milieu, ajouter a la
   fin. Meme invariant que POWERUP_TYPES, ENEMY_TYPES et DIFFICULTIES.

   Les ecarts de puissance sont volontairement MODERES. Avec « au maximum un
   tank et un soigneur », une table de deux peut se composer d'un tank et d'un
   soigneur : les trois classes doivent donc rester capables de tuer. Des
   ecarts du type 0,3 / 1 / 2 rendaient ce duo incapable de finir une vague, et
   la table decouvrait le probleme au bout de dix minutes de jeu. */
export const CLASSES = [
  {
    id: "tank", nom: "Rempart", hp: 150, damageMul: 0.80, speedMul: 0.92,
    unique: true,
    desc: "150 PV, −20 % de dégâts. Encaisse et déplace la horde.",
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

/* Nom de la TROISIEME competence (lot C), par identifiant de classe. Elle ne
   vit pas dans `skills` : ces deux entrees decrivent ce qu'on a toujours, la
   troisieme n'existe que si sa carte est tiree — ses chiffres vivent donc dans
   CARD_CFG (tables SKILL3_*), a cote des cartes qui l'accordent. Le nom reste
   ici parce que le HUD en a besoin AVANT la carte : la pastille grisee doit
   dire ce qu'on pourrait obtenir, c'est ce qui rend la carte desirable. */
export const SKILL3_NAME = { tank: "Ancre", soigneur: "Sanctuaire", dps: "Salve" };

/* Classe par defaut d'un joueur qui n'a rien choisi. C'est le tireur : la
   seule classe non unique, donc la seule qu'on puisse attribuer d'office sans
   risquer de voler l'emplacement de quelqu'un. */
export const CLASS_DEFAULT = CLASS_BY_ID.get("dps");

export function classAt(index) {
  return CLASSES[index] ?? CLASSES[CLASS_DEFAULT];
}

/* Ce que le client a besoin de savoir d'une classe pour l'afficher, et rien de
   plus — meme decoupage que `cardBrief`. */
export function classBrief(index) {
  const c = classAt(index);
  return { id: c.id, nom: c.nom, desc: c.desc, couleur: c.couleur, unique: c.unique, skills: c.skills };
}
