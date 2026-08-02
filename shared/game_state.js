/* ===========================================================================
   LOGIQUE PURE — importee telle quelle par le serveur ET par le navigateur.
   Aucune reference au DOM, au canvas, au clavier ou au reseau.
   En multijoueur, seul le serveur appelle step() : il est autoritaire.
   =========================================================================== */

import {
  CARD_BY_ID, CARD_CFG, computeMods, defaultMods, drawCards,
} from "./cards.js";
import {
  CLASSES, CLASS_DEFAULT, SKILL_CFG, classAt, bombRange, bombFlight,
  SKILL_HEAL_MODE, SKILL_TAUNT, SKILL_OVERDRIVE,
} from "./classes.js";
import {
  STATUSES, STATUS_CFG, STATUS_VULN, STATUS_BURN, STATUS_ROOT, STATUS_DOOM,
  PURGE_ORDER, ELITE_STATUS, statusAt, statusBit, enemyStatusMask,
} from "./statuses.js";
import {
  BOSS_ROSTER, BOSS_CFG, MECHS, bossAt, bossPool, mechAt, adaptMech, towerCount,
  ALERT_ORDER, ALERT_WARN, ALERT_INFO,
  MECH_STACK, MECH_SPREAD, MECH_TOWER, MECH_COUNT, MECH_LINK, MECH_JAIL,
  MECH_GAZE, MECH_PROX, MECH_MIASMA, MECH_ULT, MECH_CLUSTER, MECH_FEED,
  MECH_EXAFLARE, MECH_BAIT, MECH_DRIFT, MECH_SANCTUARY, MECH_SLIP,
  MECH_QUADRANT, MECH_CROSS, MECH_CONVERGE, MECH_DODGE,
  MECH_SHRINK, MECH_PUDDLE, MECH_SAFE,
  BOSS_JUMEAUX, BOSS_ORACLE, BOSS_MATRIARCHE, BOSS_METRONOME,
} from "./bosses.js";

export { CARD_CFG };
export { CLASSES, CLASS_DEFAULT, SKILL_CFG, classAt };
export { STATUSES, STATUS_CFG, STATUS_VULN, STATUS_BURN, STATUS_ROOT, STATUS_DOOM };
export { BOSS_ROSTER, BOSS_CFG, MECHS, bossAt, mechAt };

export const CFG = {
  ARENA_W: 1600,
  ARENA_H: 900,

  PLAYER_SPEED: 260,
  PLAYER_RADIUS: 14,
  PLAYER_MAX_HP: 100,
  PLAYER_HIT_CD: 0.55,

  /* Esquive. C'etait la seule chose que le jeu ne permettait pas : subir ou
     marcher, jamais reagir. Les images d'invulnerabilite couvrent exactement
     la duree du dash — pas une seconde de plus, sinon on traverse les vagues
     en appuyant sur une touche au lieu de choisir un trou. */
  DASH_SPEED: 900,
  DASH_TIME: 0.18,           // 162 px parcourus
  DASH_CD: 3,

  /* La cadence ne progresse plus toute seule avec le temps de manche. Elle
     montait auparavant jusqu'a son plancher vers 170 s, ce qui rendait mortes
     toutes les cartes de cadence a partir du premier boss — et le joueur
     n'avait de toute facon rien decide pour l'obtenir. Elle ne s'obtient
     desormais que par les cartes et les bonus au sol : c'est la seule
     progression du jeu qui se choisisse.

     Le reglage a ete remesure et non extrapole. A 0.26 fixe, deux bots
     mouraient a 130 s au lieu de 185 : l'ancienne courbe leur donnait un tir
     deux fois plus rapide a l'approche du premier boss. Une base a 0.09
     rendait la survie identique a l'ancienne, mais collait au plancher des le
     depart et rendait mortes toutes les cartes de cadence — c'est-a-dire
     exactement le probleme qu'on voulait resoudre. La base reste donc haute
     (0.16, soit trois cartes de cadence de marge avant le plancher) et c'est
     la pression ennemie qui a ete detendue en face : ENEMY_HP_RAMP 0.20 -> 0.16
     et SPAWN_RAMP 58 -> 78. Survie mesuree : 182 s contre 182 s pour
     l'ancienne courbe, meme nombre de boss atteints, 20 % de kills en moins. */
  FIRE_INTERVAL: 0.16,
  // Plancher abaisse de 0.07 : les cartes ne peuvent de toute facon pas
  // descendre sous 0.056 (leur propre plafond de reduction), c'est le bonus de
  // cadence au sol qui a besoin de la marge restante.
  FIRE_INTERVAL_MIN: 0.05,
  BULLET_SPEED: 640,
  BULLET_RADIUS: 4,
  BULLET_LIFE: 1.5,
  BULLET_DAMAGE: 12,

  ENEMY_SEPARATION: 0.35,
  /* Repulsion ennemi / JOUEUR. Constante dediee et non `ENEMY_SEPARATION`
     reutilise : la force qui separe deux monstres est un evitement souple —
     le troupeau doit continuer de couler — la ou celle qui separe un monstre
     d'un joueur est une CONTRAINTE. A 0,35 un runner rapide s'enfoncait de dix
     pixels avant d'etre repousse, ce qui laissait vivre le bug qu'on corrige.

     Rien ne pousse le joueur en retour : il n'est deplace que par ses propres
     entrees. Une repulsion symetrique aurait laisse deux cents ennemis le
     charrier a travers l'arene, et la prediction locale aurait combattu le
     serveur a chaque image.

     Le contact garde volontairement UNE MORSURE d'un pixel (`PLAYER_BITE`) :
     resolue exactement a la somme des rayons, la distance retombe pile sur la
     frontiere et le test de degat de contact — un `<=` sur les carres —
     echouait une image sur deux au gre de l'arrondi flottant. Un monstre colle
     cessait alors de faire mal, ce qui est le bug inverse. */
  PLAYER_SEPARATION: 1,
  PLAYER_BITE: 1,
  MAX_ENEMIES: 200,

  /* Elites. Cadences par un minuteur et non par un tirage a chaque
     apparition : sous forme de probabilite, leur nombre suivait le debit
     d'apparition et il en sortait un toutes les sept secondes en fin de
     manche. Le minuteur garantit un rythme constant du debut a la fin. */
  ELITE_FROM: 40,
  ELITE_MIN: 22,
  ELITE_MAX: 34,
  ELITE_HP_MUL: 3,
  ELITE_SPEED_MUL: 0.88,
  ELITE_SCORE_MUL: 2.5,
  ELITE_RADIUS_MUL: 1.18,

  /* Courbe de pression. Elle etait entierement en dur : impossible de la
     mesurer sans toucher au code. Les PV montent lineairement, le debit
     d'apparition aussi ; c'est le produit des deux qui ecrase le joueur. Le
     levier qui compte ici est le debit — baisser les PV des ennemis ne
     rallongeait la survie que de quelques secondes, c'est la densite qui tue,
     pas la resistance.

     Les rampes sont indexees sur le NUMERO DE VAGUE et non plus sur le temps
     ecoule. Sur une horloge, une equipe qui nettoie vite affrontait la vague 6
     avec la pression de la vague 3, et une equipe lente l'inverse : la vague
     cessait d'etre une unite de difficulte comparable d'une partie a l'autre.
     Conversion depuis l'ancienne courbe temporelle a duree de vague egale
     (~55 s) : 0.16 PV/s -> 9 PV/vague, 0.08 -> 4, et le debit ramene a un gain
     par vague au lieu des 7,7 apparitions/s que l'ancienne rampe atteignait a
     600 s — ou seul MAX_ENEMIES l'arretait encore. */
  ENEMY_HP_BASE: 16,
  ENEMY_HP_WAVE_RAMP: 9,     // PV gagnes par vague
  ENEMY_SPEED_WAVE_RAMP: 4,
  SPAWN_BASE: 0.8,           // apparitions par seconde a la vague 1
  SPAWN_WAVE_RAMP: 0.15,     // apparitions par seconde gagnees par vague

  // Reanimation volontairement rapide : a 3 s, relever quelqu'un au milieu
  // d'une vague etait impossible, on restait immobile bien trop longtemps.
  // A 1 s, le sauveteur ne s'immobilise plus qu'un battement : c'est un risque
  // qu'on accepte de prendre en pleine vague, pas une condamnation a deux.
  REVIVE_RADIUS: 96,
  REVIVE_TIME: 1.0,
  REVIVE_HP_RATIO: 0.45,     // part des PV max rendus au releve
  REVIVE_DECAY: 0.3,

  /* Progression. Elle etait double et illisible : les niveaux donnaient +30 %
     de degats chacun jusqu'au niveau 12 (soit x4,3) AUTOMATIQUEMENT, et les
     cartes s'ajoutaient par-dessus. Aucune des deux ne se lisait, et la
     premiere ne se choisissait pas. Un niveau ne donne plus rien d'autre que
     le droit de choisir une carte : c'est la seule progression du jeu, et elle
     se decide entierement.

     La jauge est COMMUNE a l'equipe. Les niveaux montent aux kills ; un
     soigneur ne tue rien, un tank tue moins qu'un DPS. Avec des jauges
     individuelles donnant des cartes, le DPS accumule pendant que le soutien
     decroche — et moins il a de cartes, moins il tue. C'est une spirale, et
     elle rend les roles de soutien injouables. Une jauge commune supprime le
     probleme entierement et donne une barre de progression partagee.

     Les paliers sont NORMALISES sur l'effectif, avec le meme exposant que le
     budget de vague. Une jauge commune a paliers fixes donnait quatre fois plus
     de cartes a quatre joueurs qu'a un seul, alors que les deux tables voient
     exactement les memes vagues : le solo terminait la manche avec trois cartes
     et se faisait ecraser par une vague 8 calibree pour une equipe qui en avait
     douze. Le gain est donc divise par joueurs^WAVE_CROWD_EXP, ce qui rend le
     rythme des cartes identique quel que soit l'effectif.

     Courbe remesuree apres la suppression des gains automatiques : a 1.35 de
     croissance, le palier 6 coutait deja 129 kills normalises et l'equipe
     mourait vague 4 avec deux cartes. Il fallait que les cartes arrivent au
     rythme des vagues, sinon rien ne reprend les x4,3 de degats disparus. */
  LEVEL_MAX: 30,             // plafond haut : un niveau = une carte
  LEVEL_KILLS_BASE: 15,      // kills normalises du 1er palier
  LEVEL_KILLS_GROWTH: 1.18,  // chaque palier coute 18 % de plus
  WAVE_XP_BONUS: 12,         // en equivalent kills, verse a la fin d'une vague

  /* Vagues. Une vague est un BUDGET d'apparitions : elle se termine quand le
     budget est epuise ET que l'arene est vide. Le flux continu ne laissait
     jamais respirer et rendait impossible de donner une carte ailleurs qu'a la
     mort d'un boss — soit toutes les 180 s, sur une survie moyenne de 182 s.
     La plupart des parties ne voyaient qu'un seul choix de carte. */
  WAVE_BUDGET_BASE: 14,      // apparitions de la vague 1
  WAVE_BUDGET_RAMP: 6,       // apparitions ajoutees par vague
  // 0.75 donne x2,8 a quatre joueurs contre x2 pour le sqrt(joueurs) d'avant :
  // la difficulte a effectif eleve etait trop molle.
  WAVE_CROWD_EXP: 0.75,
  WAVE_BREATHER: 4,          // secondes de repit entre deux vagues
  WAVE_BOSS_EVERY: 5,        // la vague 5, 10, 15... est un boss

  /* Soin de fin de vague. Il ne figurait pas au plan du lot, et son absence
     s'est vue a la premiere mesure : la suppression des gains de niveau avait
     emporte LEVEL_HEAL (10 PV par palier) sans rien mettre a la place, et il ne
     restait plus AUCUNE source de recuperation entre deux vagues — seule la
     mort d'un boss en donnait, soit une fois toutes les cinq vagues. Les bots
     mouraient vague 4 avec des PV qui ne remontaient jamais. Le repit doit
     rendre des PV, sinon ce n'est pas un repit, c'est un compte a rebours. */
  WAVE_HEAL: 18,
  // Les elites montent en PROPORTION avec l'effectif, pas seulement en nombre
  // absolu : a quatre joueurs le budget triple, et sans ca on croisait la meme
  // densite d'elites dans une foule trois fois plus dense.
  WAVE_ELITE_CROWD_EXP: 0.4,

  /* Retardataires. C'est le point faible du modele « nettoyage » : shooters et
     runners fuient, et traquer les six derniers a travers 1600 x 900 est
     fastidieux — mesure a plus de 40 s sur une vague qui en dure 50. Passe le
     delai, les restants recoivent un halo, accelerent, et les tireurs perdent
     leur distance de securite : ils viennent au contact et la vague se termine
     d'elle-meme en quelques secondes. */
  WAVE_STRAGGLER_DELAY: 8,
  WAVE_STRAGGLER_SPEED: 1.6,

  /* Difficulte indexee sur la PUISSANCE MESUREE de l'equipe, jamais sur sa
     composition. La tentation etait d'ajuster selon les roles presents — plus
     de PV aux monstres s'il y a un soigneur. C'est le mecanisme qui a tue les
     roles de soutien dans beaucoup de jeux cooperatifs : celui qui choisit le
     soigneur rend la partie plus dure pour tout le monde, et plus personne ne
     le choisit. Une equipe avec soigneur a mecaniquement moins de degats bruts,
     donc une puissance mesuree plus faible, donc des vagues un peu plus
     tendres : l'ajustement se fait tout seul, sans que personne ne se sente
     taxe. */
  WAVE_HP_POWER_K: 0.55,     // part de la puissance repercutee sur les PV
  WAVE_RATE_POWER_K: 0.35,   // ... et sur le debit d'apparition

  SHOT_SPEED: 235,
  SHOT_RADIUS: 6,
  SHOT_DAMAGE: 14,
  SHOT_LIFE: 4,

  /* Un bonus au sol est un EVENEMENT, pas un revenu. Ces trois valeurs avaient
     ete calibrees quand les bonus etaient la seule progression du jeu ; depuis
     les vagues et les cartes, un bonus toutes les 9 a 14 secondes et trois au
     sol en permanence rendaient le trajet gratuit. Doubler l'attente redonne sa
     valeur au deplacement : aller le chercher redevient une prise de risque. */
  POWERUP_MIN: 18,
  POWERUP_MAX: 26,
  POWERUP_LIFE: 22,
  POWERUP_MAX_GROUND: 2,
  POWERUP_RADIUS: 13,
  BUFF_TIME: 14,
  BUFF_DAMAGE_MUL: 1.8,
  BUFF_RATE_MUL: 0.55,
  HEAL_AMOUNT: 45,

  // Balise : le seul bonus purement cooperatif. Sans repli quand personne
  // n'est a terre, le ramasser au mauvais moment serait une perte seche, et
  // personne n'oserait plus y toucher.
  BEACON_HP_RATIO: 0.45,     // PV rendus aux releves, en part de leurs PV max
  BEACON_SHIELD: 45,         // repli : bouclier pour toute l'equipe

  // Tourelle : le seul bonus qui demande une decision de placement.
  TURRET_LIFE: 20,
  TURRET_RANGE: 350,
  TURRET_CD: 0.35,
  TURRET_RADIUS: 12,

  // Ricochet : chaine sur les voisins. Brille dans la foule, inutile sur un
  // boss isole — c'est exactement l'inverse du perforant.
  RICOCHET_RADIUS: 250,
  RICOCHET_MUL: 0.6,
  RICOCHET_MAX: 2,

  SHIELD_POOL: 80,           // le bouclier absorbe des degats, il n'a pas de duree
  SLOW_TIME: 7,
  SLOW_MUL: 0.45,
  PIERCE_HITS: 2,            // ennemis traverses par balle
  NOVA_RADIUS: 430,
  NOVA_DAMAGE: 140,
  NOVA_BOSS_DAMAGE: 220,
  NOVA_PUSH: 95,

  /* Etait en dur dans _boss : impossible a balayer depuis un script de mesure,
     ce qui est precisement ce qu'il a fallu faire quand la cadence fixe a
     divise par deux les degats de l'equipe a l'arrivee du premier boss. A
     2800, le premier combat passait de 51 s a 94 s et le troisieme depassait
     les deux minutes trente. */
  // BOSS_FIRST et BOSS_EVERY (180 s chacun) ont ete remplaces par
  // WAVE_BOSS_EVERY : le boss occupe une vague entiere au lieu d'interrompre
  // une horloge. `bossCount` reste, il sert a la croissance des PV.
  /* Recalibre de 1500 a 1200 avec la suppression des gains de niveau. Le boss
     n'a pas change de formule — ses PV restent indexes sur la puissance de
     l'equipe — mais l'echelle de cette puissance, elle, a change du tout au
     tout : elle incluait le x4,3 de degats des niveaux, elle ne reflete plus
     que les cartes. A 1500, la duree mesuree remontait a 76 s de mediane
     contre 54-68 s pour l'ancienne base. */
  BOSS_HP_BASE: 1200,
  BOSS_RADIUS: 34,
  BOSS_SPEED: 44,
  BOSS_CONTACT_DAMAGE: 30,
  BOSS_ATTACK_CD: 3.2,
  BOSS_SUMMON_EVERY: 15,     // le boss appelle lui-meme ses renforts
  BOSS_SUMMON_BASE: 3,
  BOSS_ADD_CAP: 55,          // plafond des renforts : garde le combat lisible
  BOSS_SWEEP_R: 1000,

  /* Le boss se lisait en trois attaques tournantes et mourait en 25 s : c'etait
     un gros ennemi, pas un combat. Il a maintenant cinq barres de vie, et
     chaque barre brisee ajoute une mecanique au repertoire. La derniere se
     joue donc avec sept mecaniques en rotation et un rythme plus serre : on
     apprend le combat par couches, ce qui est exactement ce que fait un raid.
     Le total de PV vaut 2.6 fois l'ancien, mais l'essentiel de l'allongement
     vient du temps passe a esquiver plutot qu'a tirer. */
  BOSS_BARS: 5,
  BOSS_HP_MUL: 2.6,
  /* Croissance d'un boss au suivant. Elle etait a 45 % quand le combat durait
     25 s ; sur une base de 50 s, le troisieme boss aurait depasse la minute
     quarante. La difficulte des combats tardifs vient maintenant des
     mecaniques, pas de la duree.
     Descendue de 0.15 a 0.06 avec les cartes : la puissance de l'equipe entre
     deja dans le calcul des PV (`_playerPower`), et elle grimpe d'un boss a
     l'autre a mesure que les cartes s'accumulent. Garder 0.15 par-dessus,
     c'etait compter deux fois la meme progression — mesure : 54/63/64/68 s a
     0.06 contre 51/61/71/77 s pour l'ancienne courbe, quatre boss d'affilee. */
  BOSS_GROWTH: 0.06,
  BOSS_PHASE_CD_STEP: 0.09,  // le rythme se resserre a chaque barre brisee
  BOSS_PHASE_DAMAGE_STEP: 0.14,
  BOSS_BREAK_PUSH: 260,      // souffle de rupture de barre
  BOSS_BREAK_DAMAGE: 18,

  ZONE_WARN: 1.4,
  ZONE_RADIUS: 74,
  ZONE_DAMAGE: 34,

  /* Zones PERSISTANTES (lot 5). Une zone qui reste (`life`) inflige `dot`
     degats par seconde, mais par PALIERS de ZONE_TICK et non a chaque image :
     a soixante applications par seconde le joueur ne lit plus rien, la barre
     de vie fond en continu et aucune information ne remonte sur ce qui frappe.
     Un quart de seconde donne quatre coups lisibles par seconde. */
  ZONE_TICK: 0.25,

  /* TOLERANCE DE COLLISION — ecart affichage/logique ASSUME, pas un bug.
     Le client affiche avec INTERP_MS (110 ms) de retard sur l'etat serveur :
     un joueur qui sort d'une zone a l'image exacte ou elle explose SUR SON
     ECRAN etait encore dedans cote serveur. Sur des zones instantanees ca
     passe ; sur les exaflares, les zones mobiles et les croix durables, ou on
     frole en permanence, c'etait la source numero un de « j'etais sorti ! ».

     Deux correctifs existaient : resoudre contre la position du joueur telle
     qu'elle etait il y a INTERP_MS (exact, mais il faut un historique de
     positions pour TOUS les joueurs en permanence — on ne le paie aujourd'hui
     que pour les appats du Metronome), ou retrecir le rayon de collision.
     C'est le second : trois lignes dans `_zoneHits`, et il pardonne toujours
     dans le bon sens. La zone AFFICHEE reste la vraie taille — c'est elle qui
     doit faire peur. */
  ZONE_FORGIVE: 0.9,

  // Mecaniques de zone. Les temps d'annonce sont plus longs que ceux des
  // cercles simples : une grille demande a etre lue, pas seulement vue.
  GRID_COLS: 4,
  GRID_ROWS: 3,
  GRID_WARN: 1.7,
  GRID_GAP: 1.15,            // decalage entre les deux moities du damier
  DONUT_WARN: 1.8,
  DONUT_HOLE: 190,
  DONUT_GAP: 1.5,
  LANE_WARN: 1.6,
  LANE_GAP: 1.25,
  LANE_THICKNESS: 132,
  SWEEP_WARN: 1.5,
  SWEEP_BLADES: 12,          // pales du balayage rotatif
  SWEEP_THICKNESS: 110,
  SWEEP_STAGGER: 0.12,       // decalage d'une pale a l'autre

  /* Trois mecaniques de plus, ouvertes par numero de boss et non par barre :
     les cartes rendent l'equipe plus forte d'un boss a l'autre, il fallait que
     le boss reponde par du repertoire et pas seulement par des PV. Gonfler ses
     PV allonge un combat ; lui donner une attaque de plus le rend different. */
  SPIRAL_ARMS: 3,            // bras de la spirale
  SPIRAL_SHOTS: 14,          // projectiles par bras
  SPIRAL_STEP: 0.055,        // secondes entre deux projectiles d'un bras
  SPIRAL_TURN: 0.9,          // rad par seconde de rotation de la spirale

  HUNT_WAVES: 3,             // vagues de la traque
  HUNT_WARN: 1.3,
  HUNT_RADIUS: 96,
  HUNT_STEP: 0.75,           // decalage entre deux vagues
  // Vitesse de poursuite de la zone traquante. Sous PLAYER_SPEED (260) : une
  // zone qui rattrape ne se seme pas, elle se subit — et une mecanique qu'on ne
  // peut pas resoudre par du deplacement n'apprend rien.
  HUNT_CHASE: 165,

  WALL_WARN: 2.0,
  WALL_THICKNESS: 150,
  WALL_STEPS: 5,             // positions successives du mur
  WALL_STAGGER: 0.5,
  WALL_HOLE: 210,            // largeur du trou, il se deplace a chaque pas

  TICK: 1 / 60,
  SNAPSHOT_HZ: 20,
};

export const PLAYER_COLORS = ["#6fe3a0", "#5ab6f0", "#d98cf0", "#f0a95a"];

/* Difficultes. Tout passe par des multiplicateurs sur la courbe de pression,
   qui vit desormais dans CFG : rien n'est duplique, et un reglage ajuste
   automatiquement les trois modes. L'ordre fait foi, l'index circule sur le
   reseau. */
export const DIFFICULTIES = [
  { key: "calme",     label: "calme",     hp: 0.78, spawn: 0.80, dmg: 0.80, boss: 0.75 },
  { key: "normal",    label: "normal",    hp: 1.00, spawn: 1.00, dmg: 1.00, boss: 1.00 },
  { key: "cauchemar", label: "cauchemar", hp: 1.35, spawn: 1.28, dmg: 1.25, boss: 1.25 },
];
export const DIFF_NORMAL = 1;

/* Types d'ennemis. `from` est la VAGUE a partir de laquelle le type peut
   sortir, `weight` son poids dans le tirage. Les multiplicateurs portent sur
   les PV de base, qui montent d'une vague a l'autre.

   `from` etait un instant en secondes (0 / 40 / 80 / 115 / 150). Sur une
   horloge, la composition d'une vague dependait de la vitesse a laquelle
   l'equipe avait nettoye les precedentes : deux tables affrontaient la « meme »
   vague 4 avec des bestiaires differents. Conversion faite a duree de vague
   moyenne mesuree (~55 s), en gardant l'ordre d'apparition d'origine. */
export const ENEMY_TYPES = [
  { key: "grunt",   from: 1, weight: 1.00, share: 1.00, hpMul: 1.0,  speed: 95,  dmg: 18, r: 12, score: 10 },
  { key: "runner",  from: 2, weight: 0.55, share: 0.45, hpMul: 0.45, speed: 188, dmg: 12, r: 9,  score: 14 },
  { key: "tank",    from: 3, weight: 0.30, share: 0.22, hpMul: 4.5,  speed: 52,  dmg: 30, r: 21, score: 30 },
  { key: "shooter", from: 4, weight: 0.30, share: 0.16, hpMul: 1.3,  speed: 62,  dmg: 14, r: 14, score: 25, shootCd: 2.6, standoff: 170 },
  { key: "brood",   from: 6, weight: 0.25, share: 0.12, hpMul: 1.8,  speed: 78,  dmg: 20, r: 16, score: 20, splits: 3 },
];

/* L'ordre fait foi : le snapshot ne transmet que l'index. On ajoute donc a la
   fin, jamais au milieu — et on ne REORDONNE pas davantage, y compris pour
   sortir une entree de la rotation : `damage`, `rate`, `double` et `pierce` en
   sont sortis au lot 2 du plan v2 et gardent pourtant leur place, sinon un
   onglet reste sur une version anterieure dessinerait la mauvaise icone sur
   tous les bonus. Ce qui circule, c'est l'index ; ce qui se tire, c'est
   POWERUP_ROTATION. */
export const POWERUP_TYPES = [
  "heal", "damage", "rate", "double", "shield", "slow", "pierce", "nova",
  "beacon", "turret", "ricochet",
  // Le fragment ne tombe jamais du tirage normal : seule la carte Recolte en
  // fait apparaitre. Il est ici parce que c'est le tableau que le client sait
  // deja dessiner, pas parce qu'il fait partie de la rotation.
  "fragment",
  /* Purification : retire TOUS les etats du ramasseur. Il ne fait pas partie de
     la rotation uniforme non plus — il se tire a part, avec un poids releve
     quand l'equipe n'a pas de soigneur (voir `_randomPowerupType`). Un bonus de
     purge aussi frequent que le soin aurait rendu le soigneur optionnel, et
     aussi rare que les autres n'aurait rien change pour une equipe qui n'en a
     pas : c'est le seul bonus du jeu dont le poids depend de la table. */
  "purification",
];

/* La rotation uniforme : les index qu'un bonus au sol peut prendre quand il
   tombe au hasard. Une LISTE et non plus un prefixe compte (`POWERUP_RANDOM_
   COUNT`), parce que ce qui sort de la rotation n'est plus contigu.

   `damage`, `rate`, `double` et `pierce` en sont sortis : depuis que les cartes
   sont frequentes, ils ne sont qu'une redite de 14 secondes de ce qu'une carte
   permanente donne pour toute la manche. Ce qui reste est SITUATIONNEL (soin,
   bouclier, purge) ou de l'action ponctuelle (nova, balise, tourelle,
   ralentissement) — c'est-a-dire ce qu'une carte ne peut pas offrir. On garde
   ce qui cree une decision de trajet, on retire ce qui n'est qu'un
   multiplicateur en double.

   `fragment` (seule la carte Recolte en fait tomber) et `purification` (tiree a
   part, avec un poids qui depend de la table) n'y ont jamais figure. */
export const POWERUP_ROTATION = [
  "heal", "shield", "slow", "nova", "beacon", "turret", "ricochet",
].map(k => POWERUP_TYPES.indexOf(k));

export const BUFF_DAMAGE = 1;
export const BUFF_RATE = 2;
export const BUFF_DOUBLE = 4;
export const BUFF_PIERCE = 8;
export const BUFF_RICOCHET = 16;

/* --- chargement effectif et table de mods complete ----------------------------

   Deux fonctions PURES, exportees, et c'est volontaire : la fenetre de build du
   client doit afficher les multiplicateurs REELS d'un joueur — « ×2,4 dégâts,
   ×1,8 cadence » explique le tableau des scores bien mieux que la liste des
   cartes. Recoder ce repli cote client aurait donne deux implementations qui
   divergent au premier reglage, sur precisement l'ecran qui sert a verifier un
   chargement.

   Elles vivent ici et non dans `cards.js` : le repli de classe a besoin de
   `classAt`, et `cards.js` ne doit dependre de rien — un cycle d'import casse
   le chargement dans le navigateur. `game_state.js` importe deja les deux.
   ----------------------------------------------------------------------- */

/* Ses cartes, plus les cartes de soutien de tout coequipier qui porte le
   « Vœu partagé ». C'est le seul endroit du jeu ou le chargement d'un joueur
   depend de celui d'un autre, et c'est pour ca que la fusion se fait ici et non
   dans `computeMods` : cette derniere ne connait qu'une liste de cartes a la
   fois, et doit le rester pour qu'un script de mesure puisse la rejouer sans
   table.

   On prend le MAXIMUM et non la somme : deux Trousse chez le porteur et deux
   chez le receveur ne font pas quatre exemplaires, sinon le plafond de la carte
   ne veut plus rien dire. Et le Vœu lui-meme ne se partage pas — il se serait
   propage de proche en proche a toute la table. */
export function effectiveCards(cards, others = []) {
  let fusion = null;
  for (const o of others) {
    if (o === cards || !((o.get("voeu_partage") ?? 0) > 0)) continue;
    for (const [id, n] of o) {
      if (id === "voeu_partage" || n <= 0) continue;
      const c = CARD_BY_ID.get(id);
      if (!c || !c.tags.includes("coop")) continue;
      fusion ??= new Map(cards);
      fusion.set(id, Math.max(fusion.get(id) ?? 0, n));
    }
  }
  // Chemin rapide : sans Vœu sur la table — c'est-a-dire la quasi-totalite des
  // manches — on ne cree aucune Map de plus par recalcul.
  return fusion ?? cards;
}

/* Table de mods complete : cartes, Vœu partagé, part de vague du « Cœur de
   forge », puis repli de la classe. Rend aussi les PV max, qui en decoulent.

   La classe est MULTIPLICATIVE et non additive : un tank a -20 % qui prend cinq
   cartes de degats doit garder sa penalite, alors qu'un terme additif l'aurait
   diluee jusqu'a la rendre invisible en fin de manche — et la classe n'aurait
   plus voulu dire grand-chose passe la vague 8. Consequence voulue :
   `_playerPower` lit `damageMul`, donc la puissance d'equipe integre la classe
   sans une ligne de plus, et la pression des vagues suit. */
export function fullMods(cards, others, cls, wave = 1) {
  const mods = computeMods(effectiveCards(cards, others));

  /* « Coeur de forge » : la seule carte dont la valeur depend du TEMPS.
     `computeMods` est une fonction de la seule liste de cartes possedees — la
     vague n'y a rien a faire, sinon elle cesse d'etre rejouable telle quelle
     dans un script de mesure. La part de vague est donc ajoutee ici. */
  if (mods.damagePerWave > 0) {
    mods.damageMul += mods.damagePerWave * Math.max(0, wave - 1);
  }

  const def = classAt(cls);
  mods.damageMul *= def.damageMul;
  mods.speedMul *= def.speedMul;

  // Plus de terme de niveau : les PV max ne viennent que de la classe et des
  // cartes. C'est une perte de 88 PV en fin de manche, que les cartes
  // defensives doivent reprendre a leur compte.
  let maxHp = def.hp + mods.maxHpBonus;
  if (mods.hpCap > 0) maxHp = Math.min(maxHp, mods.hpCap);
  return { mods, maxHp: Math.round(maxHp) };
}

export class GameState {
  constructor(difficulty = DIFF_NORMAL) {
    this.diffIndex = Math.min(Math.max(difficulty | 0, 0), DIFFICULTIES.length - 1);
    this.diff = DIFFICULTIES[this.diffIndex];
    this.players = new Map();
    this.enemies = [];
    this.bullets = [];
    this.shots = [];
    this.zones = [];
    this.powerups = [];
    this.turrets = [];
    this.drones = [];
    this.bulwarks = [];     // remparts poses par les tanks
    this.bombs = [];        // bombes du tireur, en vol
    this.effects = [];      // purement visuel : ondes de choc

    /* Provocation : un etat GLOBAL et non une cible par ennemi. Les ennemis
       choisissent leur proie dans `_nearestPlayer`, qui consulte ce champ ;
       stocker une cible sur chacun des 200 ennemis aurait coute un champ de
       plus dans la simulation ET dans le snapshot pour une information qui ne
       vaut que cinq secondes. La position est celle du LANCER : les ennemis
       concernes sont ceux qui etaient dans le rayon a ce moment-la, pas ceux
       qui s'en approchent ensuite. */
    this.taunt = null;      // { id, until, x, y }
    this.slow = 0;          // ralentissement global des ennemis
    this.slipT = 0;         // sol glissant du Metronome, temps restant
    this.boss = null;

    /* --- ARENE MOBILE (lot 5) ------------------------------------------------
       `bounds` est la surface JOUABLE courante. Elle vaut l'arene entiere en
       temps normal et se referme par paliers pendant la constriction du
       Ravageur. TOUT ce qui borne un deplacement doit la lire — joueurs,
       esquive, souffle de rupture de barre, boss, bonus au sol — et jamais
       CFG.ARENA_W/H en dur : c'est le principal risque de regression du lot,
       un seul oubli laisse un joueur, un boss ou un bonus dans la couronne
       mortelle sans moyen d'en sortir.

       `shrink` est le palier ANNONCE et pas encore applique : la couronne ne
       devient mortelle qu'a l'echeance, ce qui laisse le temps de rentrer.
       `walls` est le verrouillage par quadrant — deux bandes infranchissables
       qui separent l'equipe, pas des degats. Une entite qui BLOQUE et une zone
       qui BLESSE ne se melangent pas : le joueur doit pouvoir lire d'un coup
       d'oeil laquelle des deux il a devant lui. */
    this.bounds = { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H };
    this.shrink = null;     // { x0, y0, x1, y1, t }
    this.walls = null;      // { x, y, t, max }
    this.puddleSeen = false;

    /* --- roster de boss ------------------------------------------------------
       `bossSeen` porte les INDEX du roster deja sortis dans la manche : le
       tirage est sans repetition tant que la liste n'est pas epuisee, puis elle
       se reinitialise. Un tirage uniforme donnait deux Metronomes d'affilee une
       manche sur cinq, ce qui est exactement l'impression qu'on cherchait a
       supprimer en ecrivant cinq boss.

       `boss2` est le second des Jumeaux. C'est le seul cas ou deux entites
       existent : elles partagent la reserve de vie de `boss`, qui reste la
       source de verite pour les PV, les barres et la phase. `_damage` redirige,
       ce qui evite d'avoir a doubler tout ce qui touche un boss. */
    this.bossSeen = [];
    this.boss2 = null;
    // Dernier boss sorti. Il survit a sa mort : l'ecran de choix de cartes
    // s'ouvre APRES, et il doit pouvoir dire lequel vient d'etre vaincu.
    this.lastBossKind = 0;

    /* Marqueurs de mecanique de groupe : cercles de regroupement, tours, liens,
       cages, grappes, sanctuaires. Une liste unique plutot qu'un champ par
       mecanique — elles ont toutes le meme cycle (annonce, resolution,
       disparition) et le client n'a alors qu'UNE liste a dessiner. */
    this.marks = [];

    /* Canal d'evenements de mecanique. GameState ne connait pas le reseau : il
       EMPILE ici, le serveur vide apres chaque tick et diffuse. Message
       ponctuel, hors du snapshot a 20 Hz — une consigne repetee vingt fois par
       seconde ne serait plus une consigne. */
    this.alerts = [];

    /* Degats portes au boss depuis le dernier instantane, par joueur. Meme
       modele que la file d'alertes : la simulation empile, le serveur vide
       apres diffusion. C'est la seule information dont le client ne dispose
       pas et qu'il ne peut pas deduire — les projectiles ne transportent pas
       leur proprietaire, et le chiffre de degats n'a de sens que si c'est
       VRAIMENT le sien. La somme par instantane plutot que par coup : a huit
       canons et 0,05 s de cadence, un chiffre par impact serait illisible. */
    this.bossDmg = new Map();      // playerId -> degats cumules

    /* Pause de choix de cartes. GameState ne connait ni minuteur de salon ni
       reseau : il leve le drapeau a la fin d'une vague s'il reste des niveaux
       en attente, et c'est le serveur qui decide de ne plus appeler step(). */
    this.cardsPending = false;
    this.cardOffers = new Map();   // playerId -> [3 ids]
    this.cardsQuality = 1;         // qualite du tirage en cours
    /* Jalons de legendaire deja honores. Un jalon vaut une fois par vague et
       pour toute la table : c'est ce qui empeche trois niveaux gagnes dans la
       vague 10 de donner trois legendaires. */
    this.legendaryWaveDone = new Set();

    this.time = 0;
    this.spawnAcc = 0;
    this.powerupCd = 8;
    this.eliteCd = CFG.ELITE_FROM;
    this.bossCount = 0;
    this.totalKills = 0;
    this.gameOver = false;
    this._nextId = 1;

    /* --- vagues -------------------------------------------------------------
       `wavePhase` : 0 apparition, 1 nettoyage, 2 repit. Le budget se decremente
       a l'apparition REELLE d'un ennemi et non a l'echeance du debit : sinon
       une vague lancee alors que l'arene est deja pleine (MAX_ENEMIES) brulait
       son budget sans rien faire sortir, et se terminait a vide. */
    this.wave = 0;                 // 0 = pas encore commencee, _wave la leve a 1
    this.waveBudget = 0;
    this.waveSpawned = 0;
    this.wavePhase = 2;
    // Repit initial court : quatre secondes d'arene vide au lancement de la
    // manche donnaient l'impression que le serveur n'avait pas demarre.
    this.waveTimer = 1.5;
    this.waveBoss = false;
    // Le boss apparait dans _boss, qui tourne APRES _wave dans le meme tick.
    // Sans ce drapeau, _wave voyait un budget nul et basculait en nettoyage
    // avant que le boss n'existe : l'arene etant vide, la vague de boss se
    // terminait immediatement et le boss ne sortait jamais.
    this.waveBossPending = false;

    /* --- progression d'equipe -----------------------------------------------
       Commune, et non par joueur : voir le commentaire de LEVEL_MAX. Les
       montees se METTENT EN FILE et se consomment a la fin de la vague, jamais
       en plein combat — un ecran de choix qui s'ouvre pendant qu'on esquive
       n'est pas un choix, c'est une punition. */
    this.xp = 0;
    this.level = 1;
    this.levelFrom = 0;
    this.levelStep = CFG.LEVEL_KILLS_BASE;
    this.levelAt = CFG.LEVEL_KILLS_BASE;
    this.pendingLevels = 0;
  }

  addPlayer(id, name = "joueur", colorIndex = 0, cls = CLASS_DEFAULT) {
    const def = classAt(cls);
    const p = {
      id, name, colorIndex,
      // Index dans CLASSES : c'est lui qui circule dans le snapshot. L'objet de
      // classe se relit par classAt(), jamais stocke ici — il contient des
      // chaines affichees, qui n'ont rien a faire dans la simulation.
      cls: CLASSES[cls] ? cls : CLASS_DEFAULT,
      x: CFG.ARENA_W / 2 + (Math.random() - 0.5) * 140,
      y: CFG.ARENA_H / 2 + (Math.random() - 0.5) * 140,
      hp: def.hp,
      maxHp: def.hp,
      /* Ni `level` ni `dmgMul` ici : la progression est commune (this.level) et
         un niveau ne donne plus de statistiques, seulement le droit de choisir
         une carte. `dmgMul` valait 1 + 0.30 * (niveau - 1) et multipliait sept
         sources de degats ; le laisser fige a 1 aurait fini par etre rebranche
         par erreur, il a donc ete retire de tous ses points d'appel. */
      downed: false,
      revive: 0,
      fireCd: 0,
      hitCd: 0,
      dashCd: 0,
      dashT: 0,        // temps d'esquive restant, aussi les images d'invulnerabilite
      dashX: 0,
      dashY: 0,
      // « Vif-argent » : cibles deja touchees par la trainee de l'esquive en
      // cours. Vide et jamais alloue tant que la carte n'est pas prise.
      dashHits: new Set(),
      kills: 0,
      deaths: 0,
      score: 0,
      aimX: 1,
      aimY: 0,
      /* Distance au reticule, en PIXELS de simulation. Continue comme aimX/aimY
         et non ponctuelle comme l'esquive : elle decrit une position, pas une
         demande. Valeur de depart = portee maximale, qui est aussi le repli
         d'une entree absente ou aberrante — un client anterieur au lot, qui
         n'envoie pas `ar`, lance donc exactement comme avant. */
      aimR: SKILL_CFG.DPS_BOMB_RANGE_MAX,
      buffDamage: 0,
      buffRate: 0,
      buffDouble: 0,
      buffPierce: 0,
      buffRicochet: 0,
      shield: 0,

      /* Cartes. `mods` est recalcule a chaque prise et lu par tous les
         systemes ; aucun d'eux ne parcourt `cards`. Les minuteurs vivent a
         part, sinon un recalcul de mods remettrait a zero une recharge en
         cours au pire moment. */
      cards: new Map(),
      mods: defaultMods(),
      timers: {
        shieldRegen: 0,
        counter: 0,
        pulsar: 0,
        turret: 0,
        guardian: 0,
        instinct: 0,
        zoneImmune: 0,
        frenzy: 0,
        lifesteal: 0,      // budget de vol de vie restant sur la seconde
        lifestealSec: 0,
      },
      /* --- etats ------------------------------------------------------------
         Ils vivent A COTE de `mods`, comme les minuteurs : `_recomputeMods()`
         rejoue tout le chargement a chaque carte prise, et un etat range dans
         `mods` aurait disparu au premier ecran de choix — c'est-a-dire au pire
         moment, celui ou le boss vient de poser sa Sentence.
         `healHits` compte les impacts de soin par COUPLE (soigneur, cible) :
         c'est la purge par insistance, elle appartient a la cible. */
      statuses: new Map(),   // id -> { stacks, until }
      healHits: new Map(),   // healerId -> { n, until }
      purges: 0,             // pour la campagne de mesure

      frenzyStacks: 0,
      selfReviveUsed: 0,
      commonStreak: 0,     // boss consecutifs sans mieux qu'une commune
      damageDealt: 0,      // pour que la contribution defensive se voie ailleurs
      healDealt: 0,        // meme raison, pour le soigneur

      /* --- competences ------------------------------------------------------
         Deux recharges seulement, quelle que soit la classe : le protocole
         transporte deux drapeaux, l'affichage montre deux icones, et une
         troisieme competence n'aurait pas de touche. `cd1` peut porter des
         charges (bombe double) : c'est la seule recharge du jeu qui se
         reaccumule au lieu de simplement descendre a zero. */
      cd1: 0,
      cd2: 0,
      bombStock: 1,
      healMode: 0,
      healSwapCd: 0,
      healSwapBoost: 0,    // « Bascule vive » : cadence pendant 2 s
      tauntT: 0,
      tauntInvuln: 0,
      odT: 0,              // fenetre de surcharge restante
      odBonus: 0,
      // Compteurs de competence, pour la campagne de mesure : une recharge qui
      // dort est un probleme de conception, pas de reglage, et on ne le voit
      // qu'en comptant les declenchements contre les recharges disponibles.
      skillUses: [0, 0],

      /* --- mecaniques de boss (lot 4) ---------------------------------------
         Cinq champs legers plutot qu'une structure : ils ne servent qu'a un
         combat de boss sur cinq vagues, et un objet de plus par joueur se
         paierait a chaque `_recomputeMods` comme a chaque instantane.
         `trail` est l'historique des positions — les appats du Metronome
         deposent leur zone la ou le joueur etait il y a une seconde, ce qui
         n'est pas calculable autrement. */
      jailed: 0,           // temps d'immobilisation restant (Prison)
      vx: 0, vy: 0,        // vitesse portee, lue par le seul sol glissant
      gazeCd: 0,           // cadence de sanction du Regard
      twinCd: 0,           // recharge d'application d'etat des Jumeaux
      trail: [],           // [{t, x, y}], borne a BAIT_LAG secondes
      mechFails: 0,        // pour la campagne de mesure
    };

    this.players.set(id, p);
    /* Les multiplicateurs de classe passent par le meme chemin que les cartes :
       tous les systemes lisent `p.mods`, aucun ne demande la classe du joueur.
       Sans ce recalcul a l'inscription, `mods.damageMul` valait 1 jusqu'a la
       premiere carte et le tank tapait comme un tireur pendant deux vagues. */
    this._recomputeMods(p);
    p.hp = p.maxHp;
  }

  /* --- cartes ---------------------------------------------------------------

     Le tirage vit ici et non dans le serveur : c'est de la logique de jeu, et
     on doit pouvoir la rejouer dans un test sans ouvrir de socket. Le serveur
     se contente de transporter le resultat et de valider le choix recu. */

  /* Qualite de tirage. Elle remplace le numero de boss, qui plafonnait a 2 ou 3
     par manche : avec quinze a vingt tirages, la derive de rarete serait restee
     figee a celle du premier quart de la partie. Une vague de boss vaut
     BOSS_QUALITY crans de plus ET garantit une rare — c'est ce qui en fait un
     evenement de progression et pas seulement un mur de PV. */
  drawQuality(onBossWave = false) {
    return Math.floor(this.level / CARD_CFG.QUALITY_PER_LEVEL)
      + (onBossWave ? CARD_CFG.BOSS_QUALITY : 0) + 1;
  }

  offerCards(p, quality = this.cardsQuality, forceRare = false, wave = 0) {
    // La classe filtre le pool : quatre cartes n'existent que pour elle, et
    // les huit autres n'ont jamais a apparaitre dans son tirage.
    // `wave` ne vaut autre chose que 0 qu'au premier ecran d'une vague de jalon
    // — c'est lui qui declenche la legendaire garantie.
    const picks = drawCards(p.cards, quality, forceRare || p.commonStreak >= 2,
      classAt(p.cls).id, Math.random, wave);
    return picks.map(c => c.id);
  }

  takeCard(p, id) {
    const card = CARD_BY_ID.get(id);
    if (!card) return false;
    const had = p.cards.get(id) || 0;
    if (had >= card.max) return false;

    p.cards.set(id, had + 1);
    // La carte de secours ne compte pas dans la garantie anti-frustration :
    // elle n'est pas un tirage malchanceux, c'est un pool epuise. La compter
    // aurait force une rare au tirage suivant sans que rien ne l'ait merite.
    if (!card.fallback) p.commonStreak = card.rarity === 0 ? p.commonStreak + 1 : 0;
    // Le Vœu partagé est la seule carte dont la prise change les mods des
    // AUTRES : quand il est sur la table, on rejoue tout le monde.
    if (this._hasSharedSupport()) this._recomputeAll();
    else this._recomputeMods(p);

    /* Effet immediat plutot que mod : la carte de secours soigne et rapporte
       des points sur-le-champ. Elle est traitee ici et non dans `apply` parce
       que computeMods rejoue TOUT le chargement a chaque prise — un soin ecrit
       la-bas se serait redeclenche a chaque carte suivante. */
    if (card.id === "ravitaillement") {
      if (!p.downed) p.hp = p.maxHp;
      p.score += Math.round(CARD_CFG.RAVITAILLEMENT_SCORE * p.mods.scoreMul);
    }
    return true;
  }

  // Les listes de cartes des AUTRES joueurs, pour le « Vœu partagé ». La fusion
  // elle-meme vit dans `effectiveCards`, en fonction pure : c'est la fenetre de
  // build du client qui l'a rendue partageable, et deux implementations de la
  // meme regle auraient diverge au premier reglage.
  _otherCards(p) {
    const out = [];
    for (const o of this.players.values()) if (o !== p) out.push(o.cards);
    return out;
  }

  // Le Vœu partagé fait dependre les mods de TOUS les joueurs de la liste de
  // cartes d'UN joueur : une prise de carte du porteur doit donc rejouer la
  // table entiere, pas seulement la sienne.
  _hasSharedSupport() {
    for (const o of this.players.values()) {
      if ((o.cards.get("voeu_partage") ?? 0) > 0) return true;
    }
    return false;
  }

  _recomputeAll() {
    for (const o of this.players.values()) this._recomputeMods(o);
  }

  /* Les PV max sont la seule statistique que les cartes modifient et que le
     joueur possede deja : on rejoue donc le total au lieu de l'incrementer,
     sinon deux recalculs successifs le feraient deriver. Le gain est rendu
     immediatement — prendre +20 PV max a 12 PV doit sauver la vie tout de
     suite, pas au prochain soin. */
  /* Tout le calcul vit dans `fullMods`, en fonction pure et exportee : la
     fenetre de build du client affiche les MEMES multiplicateurs que ceux dont
     la simulation se sert. `_waveStart` rappelle ce recalcul a chaque vague,
     sinon le « Cœur de forge » resterait fige a la vague ou la carte a ete
     prise. */
  _recomputeMods(p) {
    const before = p.maxHp;
    const r = fullMods(p.cards, this._otherCards(p), p.cls, this.wave);
    p.mods = r.mods;
    p.maxHp = r.maxHp;

    const gained = p.maxHp - before;
    if (gained > 0 && !p.downed) p.hp = Math.min(p.maxHp, p.hp + gained);
    p.hp = Math.min(p.hp, p.maxHp);
  }

  // Le depart du porteur du Vœu retire son partage a toute la table : sans ce
  // recalcul, les coequipiers gardaient ses cartes de soutien jusqu'a leur
  // prochaine prise de carte, c'est-a-dire potentiellement toute la manche.
  removePlayer(id) {
    const partage = this._hasSharedSupport();
    this.players.delete(id);
    if (partage) this._recomputeAll();
  }

  aliveCount() {
    let n = 0;
    for (const p of this.players.values()) if (!p.downed) n++;
    return n;
  }

  step(dt, inputs) {
    if (this.gameOver) return;
    this.time += dt;

    this.slow = Math.max(0, this.slow - dt);
    this.slipT = Math.max(0, this.slipT - dt);
    // L'arene bouge AVANT tout le monde : un palier de constriction qui se
    // fermerait apres le deplacement des joueurs les aurait deja laisses sortir
    // des limites pour une image, ce que le client aurait affiche.
    this._arena(dt);
    this._players(dt, inputs);
    // Les etats tournent juste apres les joueurs : l'expiration, la brulure et
    // l'echeance de la Sentence doivent etre resolues avant que quoi que ce soit
    // d'autre ne blesse — sinon un joueur peut tomber au contact dans l'image ou
    // sa Sentence allait justement expirer sans dommage.
    this._statuses(dt);
    this._waveTick(dt);
    this._spawner(dt);
    // Les competences tournent avant les ennemis : une bombe qui explose doit
    // le faire sur les positions de l'image precedente, celles que le joueur
    // avait a l'ecran quand il l'a lancee.
    this._skills(dt);
    this._effects(dt);
    this._powerups(dt);
    this._turrets(dt);
    this._drones(dt);
    this._enemies(dt);
    this._boss(dt);
    this._orbiters(dt);
    this._bullets(dt);
    this._shots(dt);
    this._zones(dt);
    this._collisions();
    this._revive(dt);

    if (this.players.size > 0 && this.aliveCount() === 0) this.gameOver = true;
  }

  /* --- joueurs ------------------------------------------------------------- */

  _players(dt, inputs) {
    for (const p of this.players.values()) {
      p.hitCd = Math.max(0, p.hitCd - dt);
      p.buffDamage = Math.max(0, p.buffDamage - dt);
      p.buffRate = Math.max(0, p.buffRate - dt);
      p.buffDouble = Math.max(0, p.buffDouble - dt);
      p.buffPierce = Math.max(0, p.buffPierce - dt);
      p.buffRicochet = Math.max(0, p.buffRicochet - dt);
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashT = Math.max(0, p.dashT - dt);

      /* Recharges de competence. Elles tournent meme a terre, pour la meme
         raison que les minuteurs de cartes : un joueur qui attend d'etre releve
         est deja puni une fois. La bombe se REACCUMULE tant qu'il manque une
         charge, au lieu de s'arreter a zero. */
      p.cd2 = Math.max(0, p.cd2 - dt);
      p.healSwapCd = Math.max(0, p.healSwapCd - dt);
      p.healSwapBoost = Math.max(0, p.healSwapBoost - dt);
      p.tauntInvuln = Math.max(0, p.tauntInvuln - dt);
      p.tauntT = Math.max(0, p.tauntT - dt);

      if (classAt(p.cls).id === "dps") {
        const stockMax = 1 + p.mods.bombCharges;
        if (p.bombStock < stockMax) {
          p.cd1 = Math.max(0, p.cd1 - dt);
          if (p.cd1 <= 0) {
            p.bombStock++;
            if (p.bombStock < stockMax) p.cd1 = SKILL_CFG.DPS_BOMB_CD;
          }
        }
      } else {
        p.cd1 = Math.max(0, p.cd1 - dt);
      }

      /* Surcharge. Le bonus tombe d'un coup a l'expiration, sauf « Surcharge
         prolongee » qui le fait redescendre : la carte ne rallonge donc pas
         seulement la fenetre, elle change la maniere dont on la termine —
         la fin d'une vague n'annule plus le travail des six secondes. */
      if (p.odT > 0) {
        p.odT = Math.max(0, p.odT - dt);
        if (p.odT <= 0) {
          if (p.mods.overdriveFade) p.odFade = SKILL_CFG.DPS_OVERDRIVE_FADE;
          else p.odBonus = 0;
        }
      } else if (p.odBonus > 0) {
        const fade = p.odFade || SKILL_CFG.DPS_OVERDRIVE_FADE;
        p.odBonus = Math.max(0, p.odBonus - dt * (SKILL_CFG.DPS_OVERDRIVE_MAX / fade));
      }

      /* Les minuteurs de cartes tournent meme a terre : une recharge qui se
         fige pendant qu'on attend d'etre releve punit deux fois le meme
         joueur. Le budget de vol de vie se recharge par seconde entiere, ce
         qui plafonne le cumul de plusieurs exemplaires sans avoir a les
         compter. */
      const T = p.timers;
      T.shieldRegen = Math.max(0, T.shieldRegen - dt);
      T.counter = Math.max(0, T.counter - dt);
      T.zoneImmune = Math.max(0, T.zoneImmune - dt);
      T.guardian = Math.max(0, T.guardian - dt);
      T.instinct = Math.max(0, T.instinct - dt);
      T.lifestealSec -= dt;
      if (T.lifestealSec <= 0) {
        T.lifestealSec = 1;
        T.lifesteal = CARD_CFG.LIFESTEAL_CAP;
      }
      if (p.frenzyStacks > 0) {
        T.frenzy -= dt;
        if (T.frenzy <= 0) p.frenzyStacks = 0;
      }

      // Le bouclier des cartes se remplit d'un coup apres le delai : une
      // regeneration continue transformait chaque accrochage en attente, alors
      // que le seuil recompense le fait de decrocher completement.
      if (p.mods.shieldPool > 0 && !p.downed
          && T.shieldRegen <= 0 && p.shield < p.mods.shieldPool) {
        p.shield = p.mods.shieldPool;
      }

      /* « Constitution » : la seule regeneration de PV du jeu qui ne demande
         rien a personne. Elle tourne AUSSI pendant les degats — pas de delai
         hors combat : a 2 PV/s elle ne sauve pas d'une vague, elle epargne le
         trajet vers un bonus de soin entre deux vagues, ce qui est exactement le
         role attendu du sommet de la famille survie. Rien a terre : un joueur au
         sol se releve par un coequipier, jamais tout seul. */
      if (p.mods.hpRegen > 0 && !p.downed && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + p.mods.hpRegen * dt);
      }

      if (p.downed) { p.dashT = 0; continue; }

      if (p.mods.pulsarCd > 0) {
        T.pulsar -= dt;
        if (T.pulsar <= 0) { T.pulsar = p.mods.pulsarCd; this._pulse(p); }
      }
      if (p.mods.autoTurretCd > 0) {
        T.turret -= dt;
        if (T.turret <= 0) { T.turret = p.mods.autoTurretCd; this._turret(p); }
      }

      const inp = inputs.get(p.id);

      // La visee se met a jour avant l'esquive : sinon une esquive declenchee
      // a l'arret partait dans la direction visee une image plus tot, ce qui
      // se voyait des qu'on tournait vite autour de soi.
      if (inp && (inp.ax || inp.ay)) {
        const ad = Math.hypot(inp.ax, inp.ay);
        if (ad > 0.001) { p.aimX = inp.ax / ad; p.aimY = inp.ay / ad; }
      }
      /* La distance au reticule est bornee ICI aussi, et pas seulement dans le
         serveur : `game_state.js` doit rester jouable seul dans un script de
         mesure, sans personne pour nettoyer l'entree avant lui. `bombRange()`
         est le point de passage unique des deux cotes. */
      if (inp) p.aimR = bombRange(inp.ar);

      /* Le client demande, le serveur decide : la recharge n'est verifiee
         qu'ici. Un client qui envoie l'esquive a chaque paquet n'obtient
         jamais plus qu'une esquive toutes les trois secondes. */
      if (inp && inp.dash && p.dashCd <= 0 && p.dashT <= 0) {
        let dx = inp.x, dy = inp.y;
        // Immobile, on esquive vers la visee : le joueur regarde toujours la
        // ou est le danger, c'est la direction qu'il a en tete.
        if (Math.hypot(dx, dy) < 0.01) { dx = p.aimX; dy = p.aimY; }
        const d = Math.hypot(dx, dy) || 1;
        p.dashX = dx / d;
        p.dashY = dy / d;
        p.dashT = CFG.DASH_TIME;
        // « Celerite » raccourcit la recharge. Le client rejoue exactement la
        // meme formule sur son chargement local, sinon sa propre demande
        // d'esquive resterait bloquee trois secondes pendant que le serveur
        // l'aurait acceptee.
        p.dashCd = CFG.DASH_CD * p.mods.dashCdMul;
        // « Vif-argent » : une cible ne peut etre touchee qu'une fois par
        // esquive. Sans ce Set, la trainee frappait a chaque image, soit onze
        // fois en 0,18 s — la carte tuait une vague entiere au contact.
        if (p.mods.dashTrail > 0) p.dashHits = new Set();
      }

      /* Competences. Meme regle que l'esquive : le client DEMANDE, le serveur
         decide. La recharge n'est verifiee qu'ici, et le drapeau est ponctuel
         — c'est la boucle du serveur qui le remet a zero apres chaque tick,
         sinon une demande resterait levee et la competence repartirait toute
         seule a chaque fin de recharge. */
      if (inp && inp.s1) this._skill1(p);
      if (inp && inp.s2) this._skill2(p);

      /* Prison : le joueur est immobile tant que la cage tient, esquive
         comprise. C'est la seule chose du jeu qui coupe l'esquive, et c'est
         assume — la mecanique n'existe que parce qu'elle demande aux AUTRES
         d'agir. Le drapeau est repose a chaque image par le marqueur, il ne
         survit donc jamais a la destruction de la cage. */
      // Position d'avant deplacement : c'est elle qui dit de quel cote d'un mur
      // de verrouillage le joueur se trouvait, donc de quel cote le repousser.
      const wasX = p.x, wasY = p.y;

      p.jailed = Math.max(0, p.jailed - dt);
      if (p.jailed > 0) { p.dashT = 0; p.vx = 0; p.vy = 0; }
      else if (p.dashT > 0) {
        p.x += p.dashX * CFG.DASH_SPEED * dt;
        p.y += p.dashY * CFG.DASH_SPEED * dt;
        if (p.mods.dashTrail > 0) this._dashTrail(p);
      } else if (inp) {
        // Entrave : -40 % de vitesse. Elle porte sur le DEPLACEMENT et pas sur
        // l'esquive, qui reste la reponse a tout — un etat qui coupe aussi
        // l'esquive ne se subit pas, il se regarde.
        const sp = CFG.PLAYER_SPEED * p.mods.speedMul
          * (p.statuses.has(STATUS_ROOT) ? 1 - STATUS_CFG.ROOT_SLOW : 1);
        if (this.slipT > 0) {
          /* Sol glissant du Metronome : la vitesse REJOINT la consigne au lieu
             de la prendre. Un facteur applique a la position aurait glisse sans
             qu'on puisse l'anticiper ; avec une vitesse portee, on lance son
             deplacement a l'avance, ce qui est une competence et pas une taxe.
             La prediction du client rejoue exactement la meme formule. */
          const k = Math.min(1, BOSS_CFG.SLIP_ACCEL * dt);
          p.vx += (inp.x * sp - p.vx) * k;
          p.vy += (inp.y * sp - p.vy) * k;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        } else {
          p.vx = inp.x * sp; p.vy = inp.y * sp;
          p.x += inp.x * sp * dt;
          p.y += inp.y * sp * dt;
        }
      }
      // Les limites viennent de `bounds` et non de CFG.ARENA_W/H : pendant une
      // constriction, l'arene jouable est plus petite que l'arene dessinee.
      this._clampToBounds(p, CFG.PLAYER_RADIUS);
      this._wallBlock(p, wasX, wasY, CFG.PLAYER_RADIUS);

      /* Historique de position, pour les appats du Metronome. Enregistre
         UNIQUEMENT pendant son combat : soixante entrees par joueur et par
         seconde ne se paient pas pour une mecanique qui sort dans un combat sur
         cinq. La liste est bornee par la duree de retard. */
      if (this.boss && this.boss.kind === BOSS_METRONOME) {
        p.trail.push({ t: this.time, x: p.x, y: p.y });
        while (p.trail.length && p.trail[0].t < this.time - BOSS_CFG.BAIT_LAG) p.trail.shift();
      } else if (p.trail.length) {
        p.trail.length = 0;
      }

      p.fireCd = Math.max(0, p.fireCd - dt);

      /* La cadence ne depend plus du temps de manche : cartes, frenesie et
         bonus au sol, rien d'autre. Les reductions se multiplient — quatre
         cartes a -18 % additifs auraient donne un intervalle nul. */
      /* Le mode soin a sa CADENCE PROPRE et ignore celle du tir : les cartes de
         cadence du soigneur profitent deja a ses degats quand il repasse en
         mode normal, les faire compter deux fois transformait le soin en
         faisceau continu des trois cartes. */
      let interval = p.healMode
        ? SKILL_CFG.HEAL_MODE_INTERVAL
        : CFG.FIRE_INTERVAL * p.mods.fireIntervalMul;
      if (p.frenzyStacks > 0) interval /= 1 + p.frenzyStacks * CARD_CFG.FRENZY_STEP;
      if (p.buffRate > 0) interval *= CFG.BUFF_RATE_MUL;
      // Surcharge et bascule vive : deux bonus de cadence de classe, tous deux
      // en division comme la frenesie — additionner les reductions donnait un
      // intervalle nul des la moitie de la fenetre.
      if (p.odBonus > 0) interval /= 1 + p.odBonus;
      if (p.healSwapBoost > 0) interval /= 1 + CARD_CFG.BASCULE_VIVE_RATE;
      interval = Math.max(CFG.FIRE_INTERVAL_MIN, interval);

      if (p.fireCd <= 0) {
        p.fireCd = interval;
        if (p.healMode) this._fireHeal(p);
        else this._shoot(p);
      }
    }
  }

  /* Un tir, c'est une salve — eventuellement doublee par l'echo. Separer les
     deux evite que l'echo ne rejoue aussi la salve arriere et les canons
     supplementaires deux fois chacun, ce qui la rendait bien plus forte que
     ses 20 % annonces. */
  _shoot(p) {
    const base = CFG.BULLET_DAMAGE * p.mods.damageMul
      * (p.buffDamage > 0 ? CFG.BUFF_DAMAGE_MUL : 1);
    this._volley(p, base);
    if (p.mods.echoChance > 0 && Math.random() < p.mods.echoChance) this._volley(p, base);
  }

  _volley(p, base) {
    const dmg = base * p.mods.barrelDamageMul;

    switch (p.mods.weapon) {
      case "dispersion": {
        // Cinq balles sur 0,45 rad : le cone est etroit, l'arme reste une arme
        // de ligne. Elargi, elle devenait une aura et ne demandait plus de viser.
        const each = dmg * 0.55;
        for (let i = 0; i < 5; i++) this._fire(p, each, (i / 4 - 0.5) * 0.45);
        break;
      }
      case "railgun":
        this._fire(p, dmg, 0, { pierceAll: true });
        break;
      case "grenade":
        this._fire(p, dmg, 0, { boom: true });
        break;
      default: {
        // Le bonus au sol « double » compte comme un canon de plus : les deux
        // sources se cumulent au lieu de se remplacer.
        const barrels = 1 + p.mods.extraBarrels + (p.buffDouble > 0 ? 1 : 0);
        for (let i = 0; i < barrels; i++) {
          const off = barrels === 1 ? 0 : (i - (barrels - 1) / 2) * 0.13;
          this._fire(p, dmg, off);
        }
      }
    }

    if (p.mods.backShot) this._fire(p, dmg * 0.7, Math.PI);
  }

  _fire(p, dmg, angleOffset, opt = {}) {
    const a = Math.atan2(p.aimY, p.aimX) + angleOffset;
    const dx = Math.cos(a), dy = Math.sin(a);
    const speed = CFG.BULLET_SPEED * p.mods.bulletSpeedMul
      * (opt.boom ? CARD_CFG.GRENADE_SPEED_MUL : 1);
    // « Inertie » traverse tout, comme le railgun, mais en payant a chaque
    // ennemi : c'est la decroissance qui la borne, pas un nombre de charges.
    const pierce = (opt.pierceAll || p.mods.inertia)
      ? Infinity
      : (p.buffPierce > 0 ? CFG.PIERCE_HITS : 0) + p.mods.pierce;

    const b = {
      id: this._nextId++,
      x: p.x + dx * (CFG.PLAYER_RADIUS + 2),
      y: p.y + dy * (CFG.PLAYER_RADIUS + 2),
      vx: dx * speed,
      vy: dy * speed,
      life: CFG.BULLET_LIFE * p.mods.bulletLifeMul,
      dmg,
      owner: p.id,
      pierce,
      chain: (p.buffRicochet > 0 ? CFG.RICOCHET_MAX : 0) + p.mods.chain,
      burn: p.mods.burnDmg,
      arc: p.mods.chainChance,
      // Degats d'explosion indexes sur ceux de la balle : sans ca la grenade
      // devenait ridicule des le second boss, quand les cartes de degats
      // s'accumulent et que sa valeur en dur ne bouge pas.
      boom: opt.boom ? CARD_CFG.GRENADE_DAMAGE * (dmg / CFG.BULLET_DAMAGE) : 0,
      // Une balle qui traverse doit retenir toutes ses victimes, pas seulement
      // la derniere : en restant superposee a la premiere, elle la touchait
      // une seconde fois a l'image suivante.
      hits: pierce > 0 ? new Set() : null,
      hit: null,
      // Cartes qui reecrivent le tir. `dmg0` sert de reference a la
      // decroissance : decroitre `dmg` sur lui-meme se composait avec les
      // rebonds et faisait tomber les degats a zero en deux ennemis.
      inertia: p.mods.inertia ? 1 : 0,
      bounce: p.mods.bounce ? CARD_CFG.BOUNCE_MAX : 0,
      dmg0: dmg,
    };

    // La balle nait a seize pixels du centre : tout ce qui se tient dans cet
    // intervalle doit etre teste MAINTENANT, sinon elle commence sa vie de
    // l'autre cote de sa cible. Une balle consommee sur place n'entre jamais
    // dans la liste — elle n'a jamais existe a l'ecran.
    if (this._spawnSweep(b, p.x, p.y)) return;
    this.bullets.push(b);
  }

  /* --- competences de classe ----------------------------------------------------

     Deux touches, jamais plus. Chaque classe a une competence de PLACEMENT
     (proactive, a anticiper) et une de REACTION (le bouton qu'on presse quand
     ca tourne mal) : deux boutons de reaction auraient ete redondants, et deux
     boutons de placement auraient laisse les classes sans reponse a l'urgence.
     ---------------------------------------------------------------------- */

  _skill1(p) {
    if (p.downed) return;
    switch (classAt(p.cls).id) {
      case "tank": {
        if (p.cd1 > 0) return;
        p.cd1 = SKILL_CFG.TANK_BULWARK_CD;
        p.skillUses[0]++;
        const r = SKILL_CFG.TANK_BULWARK_RADIUS * p.mods.bulwarkRadiusMul;
        const life = SKILL_CFG.TANK_BULWARK_TIME + p.mods.bulwarkTime;
        this.bulwarks.push({
          id: this._nextId++, x: p.x, y: p.y, r, life, max: life, owner: p.id,
          /* Purge a l'entree, UNE FOIS par joueur et par pose : sans cette
             memoire, rester dans la zone purgeait un etat par image et le
             rempart remplacait le soigneur a lui seul. Elle donne une raison de
             plus de s'y regrouper, surtout aux equipes qui n'en ont pas. */
          purged: new Set(),
        });
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r, life: 0.5, max: 0.5, kind: 9,
        });
        return;
      }

      case "soigneur": {
        /* Bascule et non recharge : c'est une posture, pas un declenchement.
           L'anti-spam existe parce qu'un aller-retour a chaque image donnait un
           joueur qui soigne ET tire a pleine cadence — la contrainte du mode
           soin est de renoncer aux degats, elle doit se payer en secondes. */
        if (p.healSwapCd > 0) return;
        p.healMode = p.healMode ? 0 : 1;
        p.skillUses[0]++;
        if (p.mods.swapInstant) {
          p.healSwapCd = 0;
          p.healSwapBoost = CARD_CFG.BASCULE_VIVE_TIME;
          // Instantanee au sens propre : le prochain projectile part a l'image
          // suivante au lieu d'attendre la fin de l'intervalle en cours.
          p.fireCd = 0;
        } else {
          p.healSwapCd = SKILL_CFG.HEAL_MODE_SWAP_CD;
        }
        return;
      }

      default: {
        // Le tireur garde une reserve de charges : « Double charge » ne rend
        // pas la bombe plus frequente, elle permet d'en garder une pour le
        // moment ou la vague se regroupe.
        if (p.bombStock <= 0) return;
        p.bombStock--;
        if (p.cd1 <= 0) p.cd1 = SKILL_CFG.DPS_BOMB_CD;
        p.skillUses[0]++;
        /* La bombe est VISEE : elle atterrit sous le reticule et non a une
           distance fixe. L'ancienne version partait a vitesse et delai
           constants, donc toujours a 420 px — sur un amas proche elle passait
           au-dessus et explosait derriere, sans aucun moyen de raccourcir.

           On calcule le temps de vol depuis la portee, puis la vitesse depuis
           les deux : c'est le bornage du temps de vol qui commande, pas la
           vitesse. Poser l'inverse (vitesse fixe, temps de vol libre) rendait
           un lancer a bout portant plus rapide que l'oeil et un lancer maximal
           interminable. La vitesse reelle varie donc de 533 a 700 px/s, ce qui
           ne se remarque pas, alors que le point de chute, lui, se voit. */
        const range = p.aimR;
        const flight = bombFlight(range);
        this.bombs.push({
          id: this._nextId++,
          x: p.x, y: p.y,
          vx: p.aimX * range / flight,
          vy: p.aimY * range / flight,
          t: flight,
          max: flight,
          // Point de chute, transmis tel quel au client : le cercle
          // d'atterrissage doit se dessiner des le lancer, pas se deviner en
          // extrapolant une vitesse qui n'est plus constante.
          // Borne a l'arene comme le vol lui-meme (voir la boucle des bombes) :
          // un cercle d'atterrissage dessine hors du terrain annoncerait une
          // explosion la ou elle n'aura pas lieu.
          tx: Math.min(Math.max(p.x + p.aimX * range, 0), CFG.ARENA_W),
          ty: Math.min(Math.max(p.y + p.aimY * range, 0), CFG.ARENA_H),
          owner: p.id,
        });
      }
    }
  }

  _skill2(p) {
    if (p.downed || p.cd2 > 0) return;
    switch (classAt(p.cls).id) {
      case "tank": {
        const dur = SKILL_CFG.TANK_TAUNT_TIME + p.mods.tauntTime;
        p.cd2 = Math.max(5, SKILL_CFG.TANK_TAUNT_CD + p.mods.tauntCd);
        p.skillUses[1]++;
        p.tauntT = dur;
        p.tauntInvuln = SKILL_CFG.TANK_TAUNT_INVULN;
        /* Un seul etat de provocation pour toute la simulation. Deux tanks ne
           peuvent pas coexister (la classe est unique), donc un tableau serait
           un tableau a un element ; et le lot 3 n'en ajoutera pas d'autre. */
        this.taunt = { id: p.id, until: this.time + dur, x: p.x, y: p.y };
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y,
          r: SKILL_CFG.TANK_TAUNT_RADIUS, life: 0.55, max: 0.55, kind: 10,
        });
        return;
      }

      case "soigneur": {
        const r = SKILL_CFG.HEAL_WAVE_RADIUS * p.mods.healWaveRadiusMul;
        p.cd2 = SKILL_CFG.HEAL_WAVE_CD;
        p.skillUses[1]++;
        // Instantanee, contrairement au rempart du tank qui se prepare : c'est
        // la competence de reaction du soigneur, elle doit repondre au coup
        // deja parti et non a celui qu'on anticipe.
        for (const o of this.players.values()) {
          if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 > r * r) continue;
          this._heal(p, o, SKILL_CFG.HEAL_WAVE_AMOUNT);
          /* Un etat retire a chaque allie touche : c'est la seule utilite
             supplementaire de la vague, et elle en fait le bouton qui rattrape
             une phase ratee. Un seul etat, comme partout — la regle d'ordre ne
             souffre aucune exception, sinon la vague de soin devient la reponse
             a tout ce que le boss pose. */
          this._purgeStatus(o);
        }
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r, life: 0.45, max: 0.45, kind: 11,
        });
        return;
      }

      default: {
        p.cd2 = SKILL_CFG.DPS_OVERDRIVE_CD;
        p.skillUses[1]++;
        p.odT = SKILL_CFG.DPS_OVERDRIVE_TIME + p.mods.overdriveTime;
        // On ne repart pas de zero si un reliquat de la fenetre precedente
        // descend encore : la carte « Surcharge prolongee » recompenserait
        // sinon d'attendre que le bonus soit retombe.
        p.odBonus = Math.max(p.odBonus, SKILL_CFG.DPS_OVERDRIVE_BASE);
      }
    }
  }

  /* Soin d'un joueur par un autre. Point de passage unique, comme `_hurt` pour
     les degats : le surplus en bouclier, le retour de transfusion et le
     comptage y sont branches une seule fois, et une future source de soin en
     heritera sans qu'on y pense. */
  _heal(healer, target, amount) {
    if (amount <= 0 || target.downed) return 0;

    const missing = Math.max(0, target.maxHp - target.hp);
    const healed = Math.min(missing, amount);
    target.hp += healed;

    /* Le surplus se convertit en bouclier : sans ca, soigner un allie a pleine
       vie ne servait a rien, or c'est precisement le moment ou le soigneur a le
       temps de le faire. Le plafond est celui du rempart, pour que les deux
       classes de soutien ne s'empilent pas en un mur de 200 points. */
    const over = amount - healed;
    if (over > 0) {
      const cap = target.mods.shieldPool + SKILL_CFG.HEAL_MODE_SHIELD_CAP;
      target.shield = Math.min(cap, target.shield + over);
    }

    healer.healDealt += amount;
    // Transfusion : le retour ne repasse PAS par cette fonction, sinon deux
    // soigneurs se renvoyaient le rendement l'un a l'autre a l'infini.
    if (healer.mods.transfusion > 0 && healer !== target && !healer.downed) {
      healer.hp = Math.min(healer.maxHp, healer.hp + amount * healer.mods.transfusion);
    }
    return healed;
  }

  /* Projectile de soin. Il ne blesse pas, mais il s'ARRETE quand meme sur les
     ennemis — c'est cette contrainte qui rend la classe interessante : soigner
     quelqu'un derriere la horde devient un probleme de position et de ligne de
     vue, pas un clic sur une barre de vie. */
  _fireHeal(p) {
    const a = Math.atan2(p.aimY, p.aimX);
    const dx = Math.cos(a), dy = Math.sin(a);
    const speed = CFG.BULLET_SPEED * p.mods.bulletSpeedMul;
    this.bullets.push({
      id: this._nextId++,
      x: p.x + dx * (CFG.PLAYER_RADIUS + 2),
      y: p.y + dy * (CFG.PLAYER_RADIUS + 2),
      vx: dx * speed, vy: dy * speed,
      life: CFG.BULLET_LIFE * p.mods.bulletLifeMul,
      dmg: 0,
      owner: p.id,
      // Les champs du tir normal restent presents et neutres : `_bullets` et
      // `_collisions` ne testent pas la nature du projectile a chaque ligne.
      pierce: 0, chain: 0, burn: 0, arc: 0, boom: 0,
      hits: null, hit: null, inertia: 0, bounce: 0, dmg0: 0,
      heal: SKILL_CFG.HEAL_MODE_ALLY,
      healPierce: p.mods.healPierce,
    });
  }

  /* Collision d'un projectile de soin. Renvoie vrai s'il est consomme.
     Le test contre les JOUEURS n'existe que pour ces projectiles-la : le faire
     sur les quatre cents balles en vol d'une fin de manche aurait coute quatre
     fois le test le plus chaud de la simulation pour un cas qui ne concerne
     qu'une classe. */
  _healBullet(b) {
    const owner = this.players.get(b.owner);

    for (const p of this.players.values()) {
      // Jamais sur soi : le retour personnel du mode soin vient des impacts sur
      // les ENNEMIS, sinon le soigneur se soignerait a bout portant sans jamais
      // regarder ses coequipiers.
      if (p.id === b.owner) continue;
      const rr = CFG.PLAYER_RADIUS + CFG.BULLET_RADIUS;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 > rr * rr) continue;

      if (p.downed) {
        /* Toucher un allie a terre fait progresser sa reanimation : le soigneur
           devient le releveur a distance, ce qui n'existe nulle part ailleurs
           et donne enfin une reponse au coequipier tombe au milieu de la
           horde. */
        p.revive = Math.min(CFG.REVIVE_TIME, p.revive + SKILL_CFG.HEAL_MODE_REVIVE);
        if (p.revive >= CFG.REVIVE_TIME) {
          p.downed = false;
          p.hp = Math.round(p.maxHp * Math.max(CFG.REVIVE_HP_RATIO,
            owner ? owner.mods.reviveHpRatio : 0));
          p.revive = 0;
          p.hitCd = CFG.PLAYER_HIT_CD;
        }
        if (owner) owner.healDealt += SKILL_CFG.HEAL_MODE_ALLY;
      } else if (owner) {
        this._heal(owner, p, b.heal);
      }

      /* Purge par insistance. Elle est ici et non dans `_heal` : c'est le
         FAISCEAU qui purge, pas le soin. Il faut choisir une cible et rester
         dessus alors que le jeu pousse a arroser, et la contrainte du projectile
         qui s'arrete sur les ennemis en fait un probleme de position — purger
         quelqu'un derriere la horde demande de se deplacer. */
      if (owner && owner.id !== p.id) this._healPurgeHit(owner.id, p);

      // « Faisceau divise » : le projectile traverse un allie et en touche un
      // second, aligne derriere lui.
      if (b.healPierce > 0) { b.healPierce--; continue; }
      return true;
    }

    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const rr = e.r + CFG.BULLET_RADIUS;
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 > rr * rr) continue;
      // Zero degat, mais le projectile s'arrete. Un petit retour de PV sur soi
      // a chaque impact : sans lui, le mode soin serait mort en solo, or le jeu
      // se joue aussi seul.
      if (owner && !owner.downed) {
        owner.hp = Math.min(owner.maxHp, owner.hp + SKILL_CFG.HEAL_MODE_SELF);
      }
      return true;
    }

    return false;
  }

  _skills(dt) {
    /* Remparts. Le bouclier se donne par seconde passee dedans et non d'un
       coup a la pose : la zone recompense l'immobilite dans un jeu qui la
       punit, et la horde converge exactement la — c'est toute la tension de la
       competence, la retirer en donnant le bouclier a l'entree la viderait. */
    const kept = [];
    for (const bw of this.bulwarks) {
      bw.life -= dt;
      const owner = this.players.get(bw.owner);
      const gain = SKILL_CFG.TANK_BULWARK_SHIELD_RATE * dt;

      for (const p of this.players.values()) {
        if (p.downed) continue;
        const inside = (p.x - bw.x) ** 2 + (p.y - bw.y) ** 2 <= bw.r * bw.r;
        // « Carapace » : le tank emporte le bouclier de sa propre zone. Sans
        // elle, le tank qui va chercher la horde pour la ramener sur son
        // rempart est le seul a ne jamais en profiter.
        const carapace = owner && p.id === owner.id && owner.mods.carapace > 0;
        // La purge, elle, demande d'etre VRAIMENT entre : la Carapace donne le
        // bouclier a distance, pas le nettoyage — le tank doit revenir sur sa
        // zone comme tout le monde.
        if (inside && !bw.purged.has(p.id)) {
          bw.purged.add(p.id);
          this._purgeStatus(p);
        }
        if (!inside && !carapace) continue;
        const cap = p.mods.shieldPool + SKILL_CFG.TANK_BULWARK_SHIELD_CAP;
        if (p.shield < cap) p.shield = Math.min(cap, p.shield + gain);
      }

      if (bw.life > 0) kept.push(bw);
    }
    this.bulwarks = kept;

    // Bombes en vol. Le delai est essentiel : sans lui, c'est un clic gagnant
    // sans anticipation.
    const flying = [];
    for (const bo of this.bombs) {
      bo.t -= dt;
      bo.x += bo.vx * dt;
      bo.y += bo.vy * dt;
      bo.x = Math.min(Math.max(bo.x, 0), CFG.ARENA_W);
      bo.y = Math.min(Math.max(bo.y, 0), CFG.ARENA_H);
      /* A l'echeance, on RECALE sur le point de chute annonce. Le pas de temps
         ne tombe presque jamais juste sur la duree de vol : la derniere image
         emportait la bombe une dizaine de pixels plus loin, et le cercle
         d'atterrissage devenait un mensonge d'un demi-metre. Un cercle qui
         designe un endroit doit designer exactement celui-la. */
      if (bo.t <= 0) { bo.x = bo.tx ?? bo.x; bo.y = bo.ty ?? bo.y; this._bombBlast(bo); }
      else flying.push(bo);
    }
    this.bombs = flying;

    if (this.taunt) {
      const tank = this.players.get(this.taunt.id);
      // Un tank qui tombe ou qui se deconnecte relache la horde immediatement :
      // sinon les ennemis continuaient de converger vers un cadavre pendant
      // cinq secondes, ce qui ressemblait a un bug plutot qu'a un repit.
      if (this.time >= this.taunt.until || !tank || tank.downed) this.taunt = null;
    }
  }

  /* Explosion de bombe. Le plafond de cibles n'est pas un detail d'optimisation :
     avec 200 ennemis, une explosion peut en toucher quarante, et la bombe
     devient alors l'essentiel de la contribution du tireur — le reste de son jeu
     ne compte plus. Les douze plus proches, ce qui recompense de viser le coeur
     du groupe et non son bord. */
  _bombBlast(bo) {
    const owner = this.players.get(bo.owner);
    const mul = owner ? owner.mods.damageMul : 1;
    const dmg = SKILL_CFG.DPS_BOMB_DAMAGE * mul;
    const r = SKILL_CFG.DPS_BOMB_RADIUS;

    this.effects.push({
      id: this._nextId++, x: bo.x, y: bo.y, r, life: 0.4, max: 0.4, kind: 12,
    });

    const near = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d2 = (e.x - bo.x) ** 2 + (e.y - bo.y) ** 2;
      if (d2 <= r * r) near.push({ e, d2 });
    }
    near.sort((a, b) => a.d2 - b.d2);

    const vulnerable = owner && owner.mods.bombVulnerable > 0;
    for (let i = 0; i < near.length && i < SKILL_CFG.DPS_BOMB_MAX_TARGETS; i++) {
      // « Detonateur » : la vulnerabilite s'applique AVANT les degats, sinon la
      // carte ne valait rien sur un ennemi que la bombe tue de toute facon.
      if (vulnerable) near[i].e.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
      this._damage(near[i].e, dmg, bo.owner);
    }

    /* Le boss encaisse une bombe fortement reduite. Sans cette reduction, la
       competence de vague la plus forte du jeu devenait aussi la meilleure
       reponse au boss, et le tireur n'avait plus qu'a attendre sa recharge au
       lieu de jouer le combat. */
    for (const boss of this._bossTargets()) {
      if ((boss.x - bo.x) ** 2 + (boss.y - bo.y) ** 2 > r * r) continue;
      if (vulnerable) boss.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
      this._damage(boss, dmg * SKILL_CFG.DPS_BOMB_BOSS_MUL, bo.owner);
    }
    this._hitMarks(bo.x, bo.y, r, dmg);

    // « Fragmentation » : de vraies balles, donc soumises aux memes collisions
    // que le tir normal. Une seconde explosion en anneau aurait double les
    // degats de zone sans rien changer au jeu de position.
    if (owner && owner.mods.bombShards > 0) {
      const n = SKILL_CFG.DPS_BOMB_SHARDS;
      const speed = CFG.BULLET_SPEED;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        this.bullets.push({
          id: this._nextId++,
          x: bo.x, y: bo.y,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          life: SKILL_CFG.DPS_BOMB_SHARD_LIFE,
          dmg: dmg * SKILL_CFG.DPS_BOMB_SHARD_MUL,
          owner: bo.owner,
          pierce: 0, chain: 0, burn: 0, arc: 0, boom: 0,
          hits: null, hit: null, inertia: 0, bounce: 0,
          dmg0: dmg * SKILL_CFG.DPS_BOMB_SHARD_MUL,
        });
      }
    }

    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  /* --- tourelles ------------------------------------------------------------- */

  /* Elle tire les memes balles que son proprietaire, a sa puissance de niveau,
     mais sans ses bonus temporaires : degats x1.8 plus double canon plus
     perforant sur une tourelle qui vise toute seule pendant 20 s, ce n'etait
     plus un bonus, c'etait une deuxieme partie qui se jouait sans nous. */
  _turrets(dt) {
    const kept = [];
    for (const tu of this.turrets) {
      tu.life -= dt;
      tu.fireCd -= dt;

      let best = null, bestD = CFG.TURRET_RANGE * CFG.TURRET_RANGE;
      for (const e of this.enemies) {
        const d = (e.x - tu.x) ** 2 + (e.y - tu.y) ** 2;
        if (d < bestD) { bestD = d; best = e; }
      }
      for (const boss of this._bossTargets()) {
        const d = (boss.x - tu.x) ** 2 + (boss.y - tu.y) ** 2;
        if (d < bestD) { bestD = d; best = boss; }
      }

      if (best) {
        const dx = best.x - tu.x, dy = best.y - tu.y;
        tu.ang = Math.atan2(dy, dx);
        if (tu.fireCd <= 0) {
          tu.fireCd = CFG.TURRET_CD;
          const d = Math.hypot(dx, dy) || 1;
          this.bullets.push({
            id: this._nextId++,
            x: tu.x + (dx / d) * (CFG.TURRET_RADIUS + 2),
            y: tu.y + (dy / d) * (CFG.TURRET_RADIUS + 2),
            vx: (dx / d) * CFG.BULLET_SPEED,
            vy: (dy / d) * CFG.BULLET_SPEED,
            life: CFG.BULLET_LIFE,
            dmg: tu.dmg,
            owner: tu.owner,
            pierce: 0,
            chain: 0,
            hit: null,
          });
        }
      }

      if (tu.life > 0) kept.push(tu);
    }
    this.turrets = kept;
  }

  /* --- degats infliges ---------------------------------------------------------

     Pendant exact de _hurt() cote joueur : tout ce qui blesse un ennemi ou le
     boss passe par ici. Le vol de vie, la brulure et le comptage des degats y
     sont branches une seule fois — une nouvelle source de degats en herite
     sans qu'on ait a y penser, ce qui est precisement ce qu'on a appris a
     faire avec la difficulte dans _hurt(). */
  /* `overTime` a exactement le sens qu'il a dans `_hurt` : un degat CONTINU,
     etale image par image, et non une touche. Sans ce drapeau, la brulure
     incrementerait le compteur de touches soixante fois par seconde et
     l'ennemi qui brule clignoterait en permanence — c'est-a-dire que le retour
     d'impact, qu'on vient precisement de rendre exact, ne voudrait plus rien
     dire. */
  _damage(target, amount, ownerId, burn = 0, overTime = false) {
    if (!target || amount <= 0) return;
    /* Les Jumeaux partagent UNE reserve de vie : frapper le second, c'est
       frapper le premier. La redirection est ici, au point de passage unique,
       plutot que chez les huit appelants — c'est la meme raison qui met la
       difficulte dans `_hurt` et le vol de vie ici. */
    if (this.boss2 && target === this.boss2) target = this.boss;
    /* Vulnerabilite (« Detonateur »). Elle vit sur une echeance absolue et non
       sur un minuteur decompte : un champ de plus a faire descendre sur chacun
       des 200 ennemis a chaque image, pour un etat qui ne concerne que douze
       d'entre eux pendant quatre secondes, ne se justifiait pas. Le lot 3
       reprendra cet etat avec son icone et sa purge. */
    if (target.vulnUntil > this.time) amount *= CARD_CFG.VULNERABLE_MUL;
    const owner = this.players.get(ownerId);
    if (owner) {
      /* « Catalyseur ». La condition porte sur la CIBLE et non sur le
         chargement : elle ne peut donc pas se calculer dans `computeMods`, elle
         se lit ici. `enemyStatusMask` est la seule definition de « cette cible
         est affectee » — la carte ne teste pas `burn` ni `vulnUntil` elle-meme,
         sinon la prochaine source d'etat lui echapperait en silence. */
      if (owner.mods.catalyseur > 0 && enemyStatusMask(target, this.time) !== 0) {
        amount *= 1 + owner.mods.catalyseur;
      }
      owner.damageDealt += amount;
      // Cumul par instantane pour le chiffre flottant sur le boss. Il est pris
      // ICI, au point de passage unique, et non chez les appelants : une
      // nouvelle source de degats est ainsi comptee sans qu'on y pense, comme
      // le vol de vie juste en dessous.
      if (target === this.boss) {
        this.bossDmg.set(ownerId, (this.bossDmg.get(ownerId) ?? 0) + amount);
      }
      if (owner.mods.lifesteal > 0) this._lifesteal(owner, amount * owner.mods.lifesteal);
    }

    target.hp -= amount;

    /* COMPTEUR DE TOUCHES. Le client deduisait le flash d'impact d'une variation
       de PV entre deux instantanes : a 20 Hz, un joueur a cadence elevee place
       deux a quatre balles dans les cinquante millisecondes qui les separent, et
       le client n'en voyait qu'une seule. Pire, un ennemi tue entre deux
       instantanes ne montre jamais de PV intermediaires — le coup fatal, le plus
       satisfaisant de tous, ne produisait aucun retour.
       Aucun reglage cote client ne corrige ca : la source manquait.

       Le compteur va de 0 a 9 et non de 0 a 255. Le client ne lit qu'une
       DIFFERENCE entre deux instantanes consecutifs, jamais une valeur absolue,
       et dix touches en cinquante millisecondes sur la meme cible — deux cents
       par seconde — est une cadence qu'aucun chargement n'approche. Un chiffre
       de plus et non trois : mesure arene pleine, la version a 255 faisait
       +11,8 % de poids d'instantane au pire cas, au-dessus du budget de 10 %
       qu'on s'etait fixe. A un chiffre la hausse retombe a +6,2 %.

       Pose ici, au point de passage unique, comme le vol de vie et le cumul de
       degats au boss : une nouvelle source de degats est comptee sans qu'on y
       pense. */
    if (!overTime && target.hitSeq !== undefined) {
      target.hitSeq = (target.hitSeq + 1) % 10;
    }

    if (burn > 0) {
      /* La brulure ne se cumule pas sur la meme cible, sinon quatre balles par
         seconde empilent quatre brulures et l'incendiaire devient la seule
         carte offensive qui compte. On garde la plus forte et on relance la
         duree. */
      if (!target.burn || burn >= target.burn.dmg) {
        target.burn = { dmg: burn, t: CARD_CFG.BURN_TIME, owner: ownerId };
      } else {
        target.burn.t = CARD_CFG.BURN_TIME;
      }
    }

    if (target === this.boss) {
      if (target.hp <= 0) this._killBoss(ownerId);
    } else if (target.hp <= 0) {
      this._killEnemy(target, ownerId);
    }
  }

  /* Le vol de vie se paie sur un budget par seconde plutot que par un plafond
     par coup : c'est le seul reglage qui tienne quand la cadence, le nombre de
     canons et les degats varient d'un joueur a l'autre. */
  _lifesteal(p, amount) {
    if (p.downed) return;
    const heal = Math.min(amount, p.timers.lifesteal);
    if (heal <= 0) return;
    p.timers.lifesteal -= heal;
    p.hp = Math.min(p.maxHp, p.hp + heal);
  }

  /* Explosion de grenade. Elle touche aussi le boss : une arme qui ne sert a
     rien pendant le seul moment ou le combat se decide n'est pas une arme. */
  _explode(x, y, dmg, ownerId) {
    this.effects.push({
      id: this._nextId++,
      x, y, r: CARD_CFG.GRENADE_RADIUS, life: 0.35, max: 0.35, kind: 7,
    });

    const r2 = CARD_CFG.GRENADE_RADIUS ** 2;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 <= r2) this._damage(e, dmg, ownerId);
    }
    for (const boss of this._bossTargets()) {
      if ((boss.x - x) ** 2 + (boss.y - y) ** 2 <= r2) this._damage(boss, dmg, ownerId);
    }
    this._hitMarks(x, y, CARD_CFG.GRENADE_RADIUS, dmg);
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  /* Onde blanche : pulsar, onde de mort et riposte partagent la meme forme.
     Trois effets distincts pour trois cartes auraient coute trois `kind` de
     plus au client sans rien apprendre au joueur. */
  _wave(x, y, radius, dmg, ownerId) {
    this.effects.push({
      id: this._nextId++,
      x, y, r: radius, life: 0.35, max: 0.35, kind: 8,
    });

    const r2 = radius * radius;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 <= r2) this._damage(e, dmg, ownerId);
    }
    for (const boss of this._bossTargets()) {
      if ((boss.x - x) ** 2 + (boss.y - y) ** 2 <= r2) this._damage(boss, dmg, ownerId);
    }
    this._hitMarks(x, y, radius, dmg);
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  _pulse(p) {
    this._wave(p.x, p.y, CARD_CFG.PULSAR_RADIUS,
      CARD_CFG.PULSAR_DAMAGE * p.mods.damageMul, p.id);
  }

  /* « Vif-argent ». Appelee a chaque image d'esquive et non une seule fois a
     l'arrivee : l'esquive traverse 162 px en trois images, et une seule
     verification de fin de course aurait laisse passer tout ce qui se trouvait
     entre les deux positions. Le Set `dashHits` est remis a neuf a chaque
     esquive, donc traverser le groupe vaut mieux que reculer — c'est ce qui
     fait de la carte une recompense de prise de risque et non un bouton de
     nettoyage.

     Pas d'effet visuel dedie : la trainee se lit deja sur le sillage d'esquive
     que le client dessine, et un `kind` de plus pour un effet qui sort trois
     fois par minute ne se justifie pas. */
  _dashTrail(p) {
    const r = CARD_CFG.VIF_ARGENT_RADIUS;
    const dmg = p.mods.dashTrail * p.mods.damageMul;
    for (const e of this.enemies) {
      if (e.hp <= 0 || p.dashHits.has(e.id)) continue;
      const rr = r + e.r;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > rr * rr) continue;
      p.dashHits.add(e.id);
      this._damage(e, dmg, p.id);
    }
    const rb = r + CFG.BOSS_RADIUS;
    for (const boss of this._bossTargets()) {
      if (p.dashHits.has(boss.id)) continue;
      if ((boss.x - p.x) ** 2 + (boss.y - p.y) ** 2 > rb * rb) continue;
      p.dashHits.add(boss.id);
      this._damage(boss, dmg, p.id);
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  /* Chaine de foudre. Comme le ricochet, elle memorise ses cibles : sans ce
     Set, deux voisins se renvoient l'arc indefiniment. Elle part d'un impact
     et non d'un kill — c'est ce qui la distingue du ricochet, qui recompense
     le choix de cible la ou la foudre recompense la densite. */
  _arc(origin, dmg, ownerId) {
    const seen = new Set([origin.id]);
    let src = origin;

    for (let i = 0; i < CARD_CFG.CHAIN_TARGETS; i++) {
      let best = null, bestD = CFG.RICOCHET_RADIUS * CFG.RICOCHET_RADIUS;
      for (const e of this.enemies) {
        if (e.hp <= 0 || seen.has(e.id)) continue;
        const d = (e.x - src.x) ** 2 + (e.y - src.y) ** 2;
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) break;

      seen.add(best.id);
      this.effects.push({
        id: this._nextId++,
        x: src.x, y: src.y, x2: best.x, y2: best.y,
        r: 0, life: 0.22, max: 0.22, kind: 3,
      });
      this._damage(best, dmg * CARD_CFG.CHAIN_MUL, ownerId);
      src = best;
    }
  }

  /* --- orbiteurs ---------------------------------------------------------------

     Aucun etat reseau : l'angle se deduit de `this.time`, que le snapshot
     transporte deja. Le client applique la meme formule et dessine les lames
     au bon endroit sans qu'on paie une entite de plus par joueur. */
  _orbiters(dt) {
    for (const p of this.players.values()) {
      if (!p.mods.orbiters || p.downed) continue;
      if (!p.orbitHits) p.orbitHits = new Map();

      // Purge des cibles refroidies : sans elle, la table grossit de tous les
      // ennemis de la manche et ne redescend jamais.
      for (const [id, t] of p.orbitHits) {
        const left = t - dt;
        if (left <= 0) p.orbitHits.delete(id); else p.orbitHits.set(id, left);
      }

      const n = p.mods.orbiters;
      const dmg = CARD_CFG.ORBIT_DAMAGE * p.mods.damageMul * p.mods.orbiterDamageMul;

      for (let i = 0; i < n; i++) {
        const a = this.time * CARD_CFG.ORBIT_SPEED + (i / n) * Math.PI * 2;
        const bx = p.x + Math.cos(a) * CARD_CFG.ORBIT_RADIUS;
        const by = p.y + Math.sin(a) * CARD_CFG.ORBIT_RADIUS;

        for (const e of this.enemies) {
          if (e.hp <= 0 || p.orbitHits.has(e.id)) continue;
          const rr = e.r + 10;
          if ((e.x - bx) ** 2 + (e.y - by) ** 2 <= rr * rr) {
            p.orbitHits.set(e.id, CARD_CFG.ORBIT_HIT_CD);
            this._damage(e, dmg, p.id);
          }
        }
        for (const boss of this._bossTargets()) {
          if (p.orbitHits.has(boss.id)) continue;
          const rr = CFG.BOSS_RADIUS + 10;
          if ((boss.x - bx) ** 2 + (boss.y - by) ** 2 <= rr * rr) {
            p.orbitHits.set(boss.id, CARD_CFG.ORBIT_HIT_CD);
            this._damage(boss, dmg, p.id);
          }
        }
      }
      this.enemies = this.enemies.filter(e => e.hp > 0);
    }
  }

  /* --- drones -------------------------------------------------------------------

     Deux especes dans le meme tableau : le drone de soutien tire de loin, le
     mini-drone d'essaim fonce et se consume a l'impact. C'est ce qui les rend
     lisibles a l'ecran malgre leur ressemblance, et ce qui donne un sens a la
     reapparition annoncee sur la carte. */
  _drones(dt) {
    const want = new Map();
    for (const p of this.players.values()) {
      if (p.mods.drones || p.mods.swarm) {
        want.set(p.id, { sup: p.mods.drones, swarm: p.mods.swarm });
      }
    }

    const have = new Map();
    for (const d of this.drones) {
      const h = have.get(d.owner) || { sup: 0, swarm: 0 };
      if (d.kind === 0) h.sup++; else h.swarm++;
      have.set(d.owner, h);
    }
    for (const [id, w] of want) {
      const h = have.get(id) || { sup: 0, swarm: 0 };
      for (let i = h.sup; i < w.sup; i++) this.drones.push(this._makeDrone(id, 0, i));
      for (let i = h.swarm; i < w.swarm; i++) this.drones.push(this._makeDrone(id, 1, i));
    }

    const kept = [];
    for (const d of this.drones) {
      const p = this.players.get(d.owner);
      const w = want.get(d.owner);
      if (!p || !w) continue;
      if (d.kind === 0 ? d.slot >= w.sup : d.slot >= w.swarm) continue;

      if (d.dead > 0) {
        d.dead -= dt;
        kept.push(d);
        continue;
      }

      if (d.kind === 0) this._droneSupport(d, p, dt);
      else this._droneSwarm(d, p, dt);
      kept.push(d);
    }
    this.drones = kept;
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  _makeDrone(owner, kind, slot) {
    return {
      id: this._nextId++,
      owner, kind, slot,
      x: 0, y: 0, ang: 0,
      fireCd: 0,
      dead: 0,
      target: 0,
    };
  }

  _droneSupport(d, p, dt) {
    const a = this.time * CARD_CFG.DRONE_SPEED + (d.slot / 2) * Math.PI * 2;
    d.x = p.x + Math.cos(a) * CARD_CFG.DRONE_ORBIT;
    d.y = p.y + Math.sin(a) * CARD_CFG.DRONE_ORBIT;
    d.fireCd -= dt;
    if (p.downed) return;

    const best = this._nearestTarget(d.x, d.y, CARD_CFG.DRONE_RANGE);
    if (!best) return;
    d.ang = Math.atan2(best.y - d.y, best.x - d.x);
    if (d.fireCd > 0) return;

    d.fireCd = CARD_CFG.DRONE_CD;
    this.bullets.push({
      id: this._nextId++,
      x: d.x, y: d.y,
      vx: Math.cos(d.ang) * CFG.BULLET_SPEED,
      vy: Math.sin(d.ang) * CFG.BULLET_SPEED,
      life: CFG.BULLET_LIFE,
      // Le drone tire a la puissance de son proprietaire mais sans ses bonus
      // temporaires, comme la tourelle : deux systemes automatiques qui
      // heritent des bonus au sol, c'est une deuxieme partie qui se joue sans
      // nous.
      dmg: CFG.BULLET_DAMAGE * p.mods.damageMul * CARD_CFG.DRONE_DAMAGE_MUL,
      owner: p.id,
      pierce: 0, chain: 0, burn: 0, arc: 0, boom: 0,
      hits: null, hit: null,
    });
  }

  _droneSwarm(d, p, dt) {
    const target = d.target ? this._enemyById(d.target) : null;

    if (!target) {
      d.target = 0;
      const a = this.time * CARD_CFG.SWARM_SPEED + (d.slot / Math.max(1, p.mods.swarm)) * Math.PI * 2;
      d.x = p.x + Math.cos(a) * CARD_CFG.SWARM_ORBIT;
      d.y = p.y + Math.sin(a) * CARD_CFG.SWARM_ORBIT;
      d.ang = a + Math.PI / 2;
      if (p.downed) return;
      const found = this._nearestTarget(d.x, d.y, 300);
      // Le boss n'est pas une cible de nuee : `_enemyById` ne le retrouverait
      // pas au tick suivant. Les deux Jumeaux sont exclus pour la meme raison.
      if (found && found !== this.boss && found !== this.boss2) d.target = found.id;
      return;
    }

    const dx = target.x - d.x, dy = target.y - d.y;
    const dist = Math.hypot(dx, dy) || 1;
    d.ang = Math.atan2(dy, dx);
    const step = 620 * dt;
    d.x += (dx / dist) * step;
    d.y += (dy / dist) * step;

    if (dist <= target.r + 12) {
      this._damage(target, CARD_CFG.SWARM_DAMAGE * p.mods.damageMul, p.id);
      d.dead = CARD_CFG.SWARM_RESPAWN;
      d.target = 0;
    }
  }

  _enemyById(id) {
    for (const e of this.enemies) if (e.id === id && e.hp > 0) return e;
    return null;
  }

  _nearestTarget(x, y, range) {
    let best = null, bestD = range * range;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) { bestD = d; best = e; }
    }
    for (const boss of this._bossTargets()) {
      const d = (boss.x - x) ** 2 + (boss.y - y) ** 2;
      if (d < bestD) { bestD = d; best = boss; }
    }
    return best;
  }

  /* --- apparition des ennemis ----------------------------------------------- */

  /* Chaque type a un quota exprime en part du plafond. Sans ce garde-fou, les
     types qui se font rarement tuer finissent par occuper toutes les places et
     la composition des vagues s'appauvrit. */
  _pickType() {
    const counts = new Array(ENEMY_TYPES.length).fill(0);
    for (const e of this.enemies) counts[e.type]++;

    let avail = ENEMY_TYPES.filter((t, i) =>
      this.wave >= t.from && counts[i] < t.share * CFG.MAX_ENEMIES);
    if (avail.length === 0) avail = [ENEMY_TYPES[0]];
    let total = 0;
    for (const t of avail) total += t.weight;
    let roll = Math.random() * total;
    for (const t of avail) {
      roll -= t.weight;
      if (roll <= 0) return t;
    }
    return ENEMY_TYPES[0];
  }

  _spawnEnemy(typeIndex = -1, x = null, y = null, elite = false) {
    if (this.enemies.length >= CFG.MAX_ENEMIES) return null;
    const t = typeIndex >= 0 ? ENEMY_TYPES[typeIndex] : this._pickType();
    const ti = ENEMY_TYPES.indexOf(t);

    /* PV indexes sur la vague ET sur la puissance mesuree de l'equipe. Les PV
       du boss l'etaient deja, mais pas la pression des vagues, qui suivait une
       rampe purement temporelle : avec quinze cartes au lieu de quatre, les
       vagues seraient devenues triviales pendant que le boss restait calibre. */
    const past = Math.max(0, this.wave - 1);
    const baseHp = (CFG.ENEMY_HP_BASE + past * CFG.ENEMY_HP_WAVE_RAMP)
      * (1 + CFG.WAVE_HP_POWER_K * (this._teamPower() - 1))
      * this.diff.hp;
    const pos = x === null ? this._spawnPoint() : { x, y };
    const hp = baseHp * t.hpMul * (elite ? CFG.ELITE_HP_MUL : 1);
    const e = {
      id: this._nextId++,
      type: ti,
      elite: elite ? 1 : 0,
      x: pos.x,
      y: pos.y,
      hp,
      maxHp: hp,
      speed: (t.speed * (0.9 + Math.random() * 0.2) + past * CFG.ENEMY_SPEED_WAVE_RAMP)
        * (elite ? CFG.ELITE_SPEED_MUL : 1),
      r: elite ? t.r * CFG.ELITE_RADIUS_MUL : t.r,
      ang: 0,
      shootCd: t.shootCd ? t.shootCd * (0.5 + Math.random()) : 0,
      // Marquage de retardataire, pose par _wave. `standoff` est une COPIE de
      // celui du type : les retardataires le mettent a zero, et ecrire dans
      // ENEMY_TYPES aurait desarme les tireurs pour tout le processus.
      straggler: 0,
      standoff: t.standoff ?? 200,
      // Compteur de touches, transmis dans l'instantane : voir `_damage`. Il
      // n'existe QUE sur les ennemis — le boss a ses propres chiffres de degats
      // et sa barre, il n'a besoin ni de l'un ni de l'autre.
      hitSeq: 0,
      /* Recharge d'application d'etat, en echeance ABSOLUE et non en minuteur
         decompte : un champ de plus a faire descendre sur chacun des 200
         ennemis a chaque image, pour un effet qui ne concerne que les elites,
         ne se justifie pas — meme raison que `vulnUntil`. */
      statusAt: 0,
    };
    this.enemies.push(e);
    return e;
  }

  /* --- vagues -----------------------------------------------------------------

     Le cycle complet :

       vague N -> budget epuise -> arene vide
               -> si niveaux en attente : le serveur ouvre l'ecran de cartes
                  (autant de choix que de niveaux)
               -> repit WAVE_BREATHER
               -> vague N+1

     Une vague de boss n'a pas de budget : le boss occupe la vague entiere et
     seuls ses propres renforts sortent.

     `_waveTick` et non `_wave` : l'onde blanche des cartes s'appelle deja
     `_wave(x, y, r, dmg, owner)`. Deux methodes de meme nom dans un corps de
     classe ne sont pas une erreur en JavaScript — la DERNIERE ecrase la
     precedente en silence. Le pulsar, la riposte et l'onde de mort appelaient
     donc la gestion de vague avec une abscisse en guise de `dt` : aucun degat
     inflige, et un `waveTimer` avance de plusieurs centaines de secondes qui
     marquait toute l'arene comme retardataire au premier kill. */
  _waveTick(dt) {
    if (this.wavePhase === 2) {
      // Repit. Il continue de courir meme sans joueur vivant : la condition de
      // fin de manche est ailleurs, et figer la vague ici bloquerait le serveur
      // dans une phase dont plus rien ne le sortirait.
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) this._startWave();
      return;
    }

    if (this.wavePhase === 0) {
      // Apparition. On passe au nettoyage des que le budget est consomme — et,
      // sur une vague de boss, pas avant que le boss ne soit effectivement
      // sorti : son budget etant nul, la bascule aurait sinon lieu au tick qui
      // precede son apparition.
      if (this.waveSpawned >= this.waveBudget && !this.waveBossPending) {
        this.wavePhase = 1;
        this.waveTimer = 0;
      }
      return;
    }

    /* Nettoyage. La vague se termine quand l'arene est vide — boss compris.
       Les renforts du boss et les nuees liberees par les pondeuses ne comptent
       PAS dans le budget (ils ne sont pas des apparitions de vague) mais
       comptent bien ici : sinon la vague se terminait avec trente ennemis a
       l'ecran. */
    this.waveTimer += dt;
    if (this.enemies.length === 0 && !this.boss) { this._endWave(); return; }

    /* Retardataires. Passe le delai, on les rend traquables au lieu de les
       laisser fuir : halo, vitesse x1.6 et, pour les tireurs, plus de distance
       de securite. Sans ca, traquer les six derniers shooters a travers
       1600 x 900 prenait plus longtemps que la vague elle-meme. */
    if (this.waveTimer >= CFG.WAVE_STRAGGLER_DELAY) {
      for (const e of this.enemies) {
        if (e.straggler) continue;
        e.straggler = 1;
        // Applique UNE fois : e.speed est un champ stocke, le multiplier a
        // chaque tick l'aurait fait diverger en une seconde.
        e.speed *= CFG.WAVE_STRAGGLER_SPEED;
        // Jamais sur ENEMY_TYPES : la table est partagee, exportee, et lue par
        // le client. La muter aurait supprime la distance de securite des
        // tireurs pour tout le reste du processus.
        e.standoff = 0;
      }
    }
  }

  _startWave() {
    this.wave++;
    this.waveBoss = this.wave % CFG.WAVE_BOSS_EVERY === 0;
    this.waveBossPending = this.waveBoss;
    this.wavePhase = 0;
    this.waveSpawned = 0;
    this.waveTimer = 0;
    this.spawnAcc = 0;

    /* « Coeur de forge » gagne 5 % de degats par vague survecue : c'est le seul
       mod indexe sur le temps, et il ne bouge qu'ici. Le recalcul est complet
       (`_recomputeMods` rejoue tout depuis zero) donc il ne derive pas, et il
       est bon marche : une fois par vague, pas une fois par image. */
    for (const p of this.players.values()) {
      if (p.mods.damagePerWave > 0) this._recomputeMods(p);
    }

    const crowd = Math.max(1, this.players.size);
    this.waveBudget = this.waveBoss
      ? 0
      : Math.round((CFG.WAVE_BUDGET_BASE + CFG.WAVE_BUDGET_RAMP * (this.wave - 1))
          * Math.pow(crowd, CFG.WAVE_CROWD_EXP) * this.diff.spawn);
  }

  _endWave() {
    // L'experience de fin de vague recompense le nettoyage lui-meme, pas
    // seulement les kills : sans elle, une vague de tanks lents rapportait
    // moins qu'une vague de grunts alors qu'elle prend plus longtemps.
    this._addXp(CFG.WAVE_XP_BONUS);

    // Respiration. Les joueurs a terre n'en profitent pas : c'est la
    // reanimation qui les releve, sinon la fin de vague annulerait toute la
    // tension d'un coequipier au sol.
    for (const p of this.players.values()) {
      if (!p.downed) p.hp = Math.min(p.maxHp, p.hp + CFG.WAVE_HEAL);
    }

    this.wavePhase = 2;
    this.waveTimer = CFG.WAVE_BREATHER;

    /* Les niveaux gagnes pendant la vague se consomment MAINTENANT, tous
       d'affilee. Le drapeau part au serveur, qui enchaine autant d'ecrans de
       choix qu'il y a de niveaux en attente. */
    if (this.pendingLevels > 0) this.openCards();
  }

  /* Prepare une offre pour chacun. Appelable plusieurs fois de suite : le
     serveur la rappelle pour chaque niveau en attente. Les joueurs a terre
     tirent aussi — sans ca, un joueur malchanceux decroche definitivement de la
     progression alors que la jauge, elle, est commune. */
  openCards() {
    this.pendingLevels--;
    this.cardsQuality = this.drawQuality(this.waveBoss);

    /* Jalon de legendaire. Il se declenche au premier ecran ATTEINT A PARTIR de
       la vague du jalon, et non pendant cette vague exactement : une vague ou
       personne ne monte de niveau n'ouvre aucun ecran, et la garantie sautait
       purement et simplement — mesure : elle ne tombait qu'une fois sur deux.
       Honore une seule fois, meme si trois niveaux sont gagnes d'affilee : le
       plafond (LEGENDARY_MAX) n'aurait rattrape que la troisieme.
       `legendaryWaveDone` vit ici et non dans `cards.js`, qui doit rester une
       fonction de ses arguments. */
    const jalon = CARD_CFG.LEGENDARY_WAVES
      .find(w => this.wave >= w && !this.legendaryWaveDone.has(w));
    if (jalon !== undefined) this.legendaryWaveDone.add(jalon);

    this.cardOffers = new Map();
    for (const p of this.players.values()) {
      this.cardOffers.set(p.id,
        this.offerCards(p, this.cardsQuality, this.waveBoss, jalon ?? 0));
    }
    this.cardsPending = true;
  }

  _spawner(dt) {
    // Pendant un combat de boss, c'est lui qui gere le rythme : il appelle ses
    // propres renforts. Rien ne sort non plus pendant le nettoyage ni le repit,
    // c'est tout l'interet du modele : l'arene finit par se vider.
    if (this.boss || this.wavePhase !== 0) return;
    if (this.waveSpawned >= this.waveBudget) return;

    const crowd = Math.max(1, this.players.size);
    const rate = (CFG.SPAWN_BASE + (this.wave - 1) * CFG.SPAWN_WAVE_RAMP)
      * Math.pow(crowd, CFG.WAVE_CROWD_EXP)
      * (1 + CFG.WAVE_RATE_POWER_K * (this._teamPower() - 1))
      * this.diff.spawn;

    // L'elite est cadencee par le temps, pas par le nombre d'apparitions :
    // une seule sort a l'echeance, la suivante repart pour un tour complet.
    this.eliteCd -= dt;
    let eliteDue = this.eliteCd <= 0;

    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length >= CFG.MAX_ENEMIES) { this.spawnAcc = 0; break; }
      const e = this._spawnEnemy(-1, null, null, eliteDue);
      if (!e) break;
      // Le budget se decremente sur l'apparition REELLE : compter a l'echeance
      // du debit videment le budget sans rien faire sortir quand l'arene est
      // pleine, et la vague se terminait alors avant d'avoir commence.
      this.waveSpawned++;
      if (eliteDue) {
        eliteDue = false;
        // La cadence d'elite se resserre avec l'effectif : a quatre joueurs le
        // budget triple, et sans ca on croisait la meme densite d'elites dans
        // une foule trois fois plus dense.
        const k = Math.pow(crowd, CFG.WAVE_ELITE_CROWD_EXP);
        this.eliteCd = (CFG.ELITE_MIN + Math.random() * (CFG.ELITE_MAX - CFG.ELITE_MIN)) / k;
      }
      if (this.waveSpawned >= this.waveBudget) break;
    }
  }

  _spawnPoint() {
    const m = 60;
    switch (Math.floor(Math.random() * 4)) {
      case 0:  return { x: Math.random() * CFG.ARENA_W, y: -m };
      case 1:  return { x: Math.random() * CFG.ARENA_W, y: CFG.ARENA_H + m };
      case 2:  return { x: -m, y: Math.random() * CFG.ARENA_H };
      default: return { x: CFG.ARENA_W + m, y: Math.random() * CFG.ARENA_H };
    }
  }

  /* --- bonus au sol ---------------------------------------------------------- */

  /* Tirage d'un bonus au sol. La Purification se tire A PART du reste : elle
     n'est pas dans la rotation uniforme (POWERUP_ROTATION ne la contient pas)
     mais remplace le tirage avec une probabilite qui DOUBLE quand l'equipe n'a
     pas de soigneur. C'est le seul bonus du jeu dont le poids depend de la
     table, et c'est assume : sans soigneur, la purge doit venir de quelque
     part, et l'inverse — un bonus de purge aussi frequent avec un soigneur —
     rendrait la classe optionnelle.

     Le soin, lui, reste a poids uniforme quelle que soit la table. Le lot 2 a
     divise par deux la frequence des bonus au sol, et la reserve etait qu'une
     equipe sans soigneur en souffre plus que les autres : mesure faite, l'ecart
     de survie avant/apres est du meme ordre avec et sans soigneur (voir
     LISEZMOI), donc rien a compenser. Un second bonus dont le poids depend de
     la composition aurait fait de `hasHealer()` un reglage de difficulte, ce
     que le depot refuse par principe. */
  _randomPowerupType() {
    const chance = this.hasHealer()
      ? STATUS_CFG.PURIFY_CHANCE
      : STATUS_CFG.PURIFY_CHANCE_NO_HEALER;
    if (Math.random() < chance) return POWERUP_TYPES.indexOf("purification");
    return POWERUP_ROTATION[Math.floor(Math.random() * POWERUP_ROTATION.length)];
  }

  _powerups(dt) {
    this.powerupCd -= dt;
    if (this.powerupCd <= 0 && this.powerups.length < CFG.POWERUP_MAX_GROUND) {
      this.powerupCd = CFG.POWERUP_MIN + Math.random() * (CFG.POWERUP_MAX - CFG.POWERUP_MIN);
      // Sur les limites COURANTES : un bonus depose dans la couronne pendant
      // une constriction demandait d'aller mourir pour le ramasser.
      const margin = 90;
      const B = this.bounds;
      this.powerups.push({
        id: this._nextId++,
        type: this._randomPowerupType(),
        x: B.x0 + margin + Math.random() * Math.max(1, B.x1 - B.x0 - margin * 2),
        y: B.y0 + margin + Math.random() * Math.max(1, B.y1 - B.y0 - margin * 2),
        life: CFG.POWERUP_LIFE,
      });
    }

    const kept = [];
    for (const w of this.powerups) {
      w.life -= dt;
      let taken = false;
      for (const p of this.players.values()) {
        if (p.downed) continue;
        // « Poches larges » n'aimante pas le bonus, elle elargit la portee de
        // ramassage : l'aimantation donnait l'impression que le jeu jouait a
        // notre place, et rendait le detour vers un bonus indolore.
        const reach = CFG.PLAYER_RADIUS + CFG.POWERUP_RADIUS + p.mods.pickupRadius;
        if ((p.x - w.x) ** 2 + (p.y - w.y) ** 2 <= reach * reach) {
          this._applyPowerup(p, w.type);
          taken = true;
          break;
        }
      }
      if (!taken && w.life > 0) kept.push(w);
    }
    this.powerups = kept;
  }

  _applyPowerup(p, type) {
    switch (POWERUP_TYPES[type]) {
      case "heal":   p.hp = Math.min(p.maxHp, p.hp + CFG.HEAL_AMOUNT); break;
      case "damage": p.buffDamage = CFG.BUFF_TIME; break;
      case "rate":   p.buffRate = CFG.BUFF_TIME; break;
      case "double": p.buffDouble = CFG.BUFF_TIME; break;
      case "pierce": p.buffPierce = CFG.BUFF_TIME; break;
      case "ricochet": p.buffRicochet = CFG.BUFF_TIME; break;
      case "beacon": this._beacon(p); break;
      case "turret": this._turret(p); break;
      // Le bouclier est une reserve de degats, pas une duree : il tient tant
      // qu'on ne se fait pas toucher, ce qui recompense le jeu propre.
      case "shield": p.shield = CFG.SHIELD_POOL; break;
      // Ralentissement global : c'est un bonus d'equipe, pas individuel.
      case "slow":   this.slow = CFG.SLOW_TIME; break;
      case "nova":   this._nova(p); break;
      // Fragment de la carte Recolte : soin modeste, ramasse en passant.
      case "fragment": p.hp = Math.min(p.maxHp, p.hp + CARD_CFG.HARVEST_HEAL); return;
      /* Purification : elle retire TOUT, y compris la Sentence. C'est le seul
         endroit du jeu ou une purge ignore la regle d'ordre — un bonus au sol se
         ramasse une fois, il ne se rejoue pas, et un filet qui ne retire qu'un
         etat sur trois n'est pas un filet. */
      case "purification":
        this._purgeAll(p);
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r: 90, life: 0.5, max: 0.5, kind: 4,
        });
        break;
    }
    p.score += Math.round(15 * p.mods.scoreMul);
  }

  /* Balise : releve tout le monde d'un coup, ou qu'ils soient. C'est le seul
     bonus dont la valeur depend entierement du moment ou on le ramasse — d'ou
     la vraie question qu'il pose : le garder sous le pied ou le prendre tout
     de suite. Quand personne n'est a terre il ne se perd pas pour autant, il
     donne un bouclier a toute l'equipe : un repli plus faible que son effet
     principal, assez pour qu'on ne l'evite jamais. */
  _beacon(p) {
    const downed = [...this.players.values()].filter(o => o.downed);

    if (downed.length === 0) {
      for (const o of this.players.values()) {
        o.shield = Math.max(o.shield, CFG.BEACON_SHIELD);
        this.effects.push({
          id: this._nextId++,
          x: o.x, y: o.y, r: 70, life: 0.5, max: 0.5, kind: 4,
        });
      }
      return;
    }

    for (const o of downed) {
      o.downed = false;
      o.hp = Math.round(o.maxHp * CFG.BEACON_HP_RATIO);
      o.revive = 0;
      o.hitCd = CFG.PLAYER_HIT_CD;
      this.effects.push({
        id: this._nextId++,
        x: o.x, y: o.y, r: 120, life: 0.7, max: 0.7, kind: 4,
      });
    }
  }

  /* Tourelle : se pose la ou on l'a ramassee, d'ou son interet — un couloir
     d'arrivee ne vaut pas un coin d'arene. */
  _turret(p) {
    this.turrets.push({
      id: this._nextId++,
      x: p.x, y: p.y,
      owner: p.id,
      dmg: CFG.BULLET_DAMAGE * p.mods.damageMul,
      life: CFG.TURRET_LIFE,
      fireCd: 0,
      ang: Math.atan2(p.aimY, p.aimX),
    });
  }

  /* Onde de choc : bouton panique. Repousse et blesse tout autour du joueur. */
  _nova(p) {
    this.effects.push({
      id: this._nextId++,
      x: p.x, y: p.y,
      r: CFG.NOVA_RADIUS,
      life: 0.45, max: 0.45,
      kind: 0,
    });

    for (const e of this.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > CFG.NOVA_RADIUS) continue;
      const ux = d > 0.01 ? dx / d : 1, uy = d > 0.01 ? dy / d : 0;
      e.x += ux * CFG.NOVA_PUSH;
      e.y += uy * CFG.NOVA_PUSH;
      this._damage(e, CFG.NOVA_DAMAGE, p.id);
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);

    for (const boss of this._bossTargets()) {
      const d = Math.hypot(boss.x - p.x, boss.y - p.y);
      if (d <= CFG.NOVA_RADIUS) this._damage(boss, CFG.NOVA_BOSS_DAMAGE, p.id);
    }

    // L'onde balaie aussi les projectiles ennemis : c'est ce qui en fait un
    // vrai recours quand l'ecran est sature.
    this.shots = this.shots.filter(sh =>
      (sh.x - p.x) ** 2 + (sh.y - p.y) ** 2 > CFG.NOVA_RADIUS ** 2);
  }

  _effects(dt) {
    const kept = [];
    for (const f of this.effects) {
      f.life -= dt;
      if (f.life > 0) kept.push(f);
    }
    this.effects = kept;
  }

  /* --- ennemis ---------------------------------------------------------------- */

  _enemies(dt) {
    // Les auras de givre sont relevees une fois par tick : parcourir les
    // joueurs pour chacun des 200 ennemis coutait quatre fois plus cher pour
    // le meme resultat.
    const frost = [];
    for (const p of this.players.values()) {
      if (p.mods.frostRadius > 0 && !p.downed) frost.push(p);
    }

    for (const e of this.enemies) {
      if (e.hp <= 0) continue;

      /* La brulure tique en continu plutot que par paliers : a un degat par
         demi-seconde, on voyait la barre de vie sauter et la carte passait
         pour un bug d'affichage. */
      if (e.burn) {
        e.burn.t -= dt;
        // `overTime` : une brulure n'est pas une touche. Sans ce drapeau elle
        // incrementerait le compteur soixante fois par seconde et l'ennemi
        // clignoterait tout du long.
        this._damage(e, e.burn.dmg * dt / CARD_CFG.BURN_TIME, e.burn.owner, 0, true);
        if (e.burn.t <= 0) e.burn = null;
        if (e.hp <= 0) continue;
      }

      const t = this._nearestPlayer(e.x, e.y);
      if (!t) continue;
      // Position d'avant deplacement, pour les murs de verrouillage : ils
      // separent AUSSI la horde, sinon chaque joueur isole recevrait quand meme
      // les quatre quarts et la mecanique ne separerait que les alliances.
      const wasX = e.x, wasY = e.y;
      const dx = t.x - e.x, dy = t.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const def = ENEMY_TYPES[e.type];
      let mul = this.slow > 0 ? CFG.SLOW_MUL : 1;
      for (const p of frost) {
        const fr = p.mods.frostRadius;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= fr * fr) {
          // Deux auras ne se cumulent pas : a 0,65 chacune, trois joueurs
          // givres immobilisaient l'arene entiere.
          mul *= CARD_CFG.FROST_MUL;
          break;
        }
      }
      e.ang = Math.atan2(dy, dx);   // sert au rendu oriente cote client

      if (def.shootCd) {
        // Les tireurs gardent leurs distances et arrosent de loin
        e.shootCd -= dt;
        // e.standoff et non def.standoff : un retardataire l'a mis a zero pour
        // lui seul, il vient donc au contact au lieu de reculer.
        const approach = d > e.standoff ? 1 : -0.35;
        e.x += (dx / d) * e.speed * mul * approach * dt;
        e.y += (dy / d) * e.speed * mul * approach * dt;
        if (e.shootCd <= 0 && d < 520) {
          e.shootCd = def.shootCd;
          this.shots.push({
            id: this._nextId++,
            x: e.x, y: e.y,
            vx: (dx / d) * CFG.SHOT_SPEED,
            vy: (dy / d) * CFG.SHOT_SPEED,
            life: CFG.SHOT_LIFE,
          });
        }
      } else {
        e.x += (dx / d) * e.speed * mul * dt;
        e.y += (dy / d) * e.speed * mul * dt;
      }

      // Le test ne coute que pendant les vingt secondes d'un verrouillage : hors
      // de la, `walls` est nul et l'appel sort a la premiere ligne.
      if (this.walls) this._wallBlock(e, wasX, wasY, e.r);
    }

    // La brulure a pu en tuer : on nettoie avant l'evitement mutuel, sinon des
    // cadavres continuent de pousser leurs voisins pendant une image.
    this.enemies = this.enemies.filter(e => e.hp > 0);

    // Evitement mutuel, sinon tout le troupeau se superpose en un point
    const n = this.enemies.length;
    for (let i = 0; i < n; i++) {
      const a = this.enemies[i];
      for (let j = i + 1; j < n; j++) {
        const b = this.enemies[j];
        const min = a.r + b.r;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < min * min) {
          const d = Math.sqrt(d2);
          const push = (min - d) * CFG.ENEMY_SEPARATION;
          const ux = (dx / d) * push, uy = (dy / d) * push;
          a.x -= ux; a.y -= uy;
          b.x += ux; b.y += uy;
        }
      }
    }

    this._separateFromPlayers();
  }

  /* Separation ennemi / joueur. Elle n'existait pas : `ENEMY_SEPARATION` ne
     servait qu'a la boucle ennemi contre ennemi, et rien n'empechait un runner
     de se poser exactement sur le centre d'un joueur.

     C'etait la cause racine de l'ennemi colle intouchable. Les balles naissent
     a PLAYER_RADIUS + 2 = 16 px du centre ; un runner a 9 px de rayon, une
     balle 4, donc la collision se fait a 13 px. Un runner a moins de 3 px du
     centre voyait la balle naitre DEJA AU-DELA de lui, puis s'eloigner : il y
     avait un disque de 16 px de rayon autour de chaque joueur dans lequel un
     ennemi etait strictement invulnerable a son porteur. En equipe un allie le
     tuait de l'exterieur ; en solo, personne — d'ou la reproduction
     systematique en solo.

     Elle rend aussi les degats de contact lisibles : on voit le monstre qui
     frappe au lieu de le voir disparaitre sous soi.

     Le joueur, lui, n'est jamais deplace : voir le commentaire de
     PLAYER_SEPARATION. */
  _separateFromPlayers() {
    for (const p of this.players.values()) {
      if (p.downed) continue;
      for (const e of this.enemies) {
        const min = e.r + CFG.PLAYER_RADIUS - CFG.PLAYER_BITE;
        const dx = e.x - p.x, dy = e.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        // Centres exactement confondus : aucune direction ne se deduit, on en
        // choisit une plutot que de diviser par zero et de propager un NaN dans
        // toute la simulation.
        const d = Math.sqrt(d2) || 0.0001;
        const push = (min - d) * CFG.PLAYER_SEPARATION;
        const ux = d2 > 0.000001 ? dx / d : 1;
        const uy = d2 > 0.000001 ? dy / d : 0;
        e.x += ux * push;
        e.y += uy * push;
      }
    }
  }

  /* --- boss -------------------------------------------------------------------- */

  /* Tirage du boss. Sans repetition tant que la liste n'est pas epuisee, et
     filtre par effectif : en solo on tire parmi les trois boss dont les
     mecaniques sont individuelles par nature, plutot que de denaturer un combat
     de cohesion pour le rendre jouable seul. Un Oracle a un joueur, c'est le
     boss de la coordination sans equipe — il ne reste que la punition. */
  _pickBoss(alive) {
    const eligible = [];
    for (let i = 0; i < BOSS_ROSTER.length; i++) {
      if (BOSS_ROSTER[i].minPlayers <= alive) eligible.push(i);
    }
    if (eligible.length === 0) return 0;
    let pool = eligible.filter(i => !this.bossSeen.includes(i));
    // Liste epuisee : on repart d'une liste neuve. Le filtre par effectif est
    // reapplique et non memorise — un joueur peut avoir rejoint entre-temps.
    if (pool.length === 0) { this.bossSeen = []; pool = eligible; }
    const kind = pool[Math.floor(Math.random() * pool.length)];
    this.bossSeen.push(kind);
    return kind;
  }

  /* Tout ce qui frappe « le boss » doit considerer les DEUX Jumeaux : ils
     partagent une reserve de vie mais occupent deux points de l'arene, et sans
     cette liste la moitie du combat aurait ete invulnerable aux grenades, aux
     ondes et aux orbiteurs — c'est-a-dire a tout ce qui ne vise pas. */
  _bossTargets() {
    if (!this.boss) return [];
    return this.boss2 ? [this.boss, this.boss2] : [this.boss];
  }

  _boss(dt) {
    if (!this.boss) {
      // Le boss sort a l'ENTREE d'une vague de boss, et non a une echeance de
      // l'horloge. Il occupe la vague entiere : budget nul, seuls ses renforts
      // sortent, et c'est sa mort qui vide l'arene donc qui termine la vague.
      if (this.waveBossPending) {
        this.waveBossPending = false;
        this.bossCount++;
        const crowd = Math.max(1, this.players.size);

        /* Le boss balaie l'arene en arrivant. Sans ca il debarquait au milieu
           de 200 ennemis deja presents : sa silhouette, ses zones et sa barre
           de vie se perdaient dans la masse, et personne ne pouvait concentrer
           son feu sur lui. Ce nettoyage cree la respiration qui manquait.
           Aucun point n'est credite : ce n'est pas un cadeau de score. */
        this.enemies = [];
        this.shots = [];
        this.zones = [];
        this.effects.push({
          id: this._nextId++,
          x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2,
          r: CFG.BOSS_SWEEP_R,
          life: 0.9, max: 0.9,
          kind: 1,
        });

        // PV cales sur le nombre de joueurs : la duree du combat reste la meme
        // a un ou a quatre, avec un leger supplement pour les groupes.
        // Cales aussi sur le niveau moyen de l'equipe, pour la meme raison :
        // sans ca, une equipe niveau 8 pliait le second boss en 18 s au lieu
        // de 45. Le boss doit rester le mur de la manche, pas la recompense
        // d'avoir bien farme.
        /* La puissance ne peut plus se lire sur le seul niveau : avec les
           cartes, deux equipes de meme niveau peuvent infliger le simple et le
           triple. On evalue donc un indice de degats par seconde — degats,
           nombre de canons, cadence, arme de remplacement — sinon le troisieme
           boss tombe en quinze secondes et cesse d'etre le mur de la manche. */
        const power = this._teamPower();
        /* `hpMul` du roster : il compense ce que le VERBE coute en temps de
           tir, et rien d'autre. La Matriarche voit une partie des degats de
           l'equipe partir sur ses rejetons (0,85), le Metronome fait passer le
           combat a courir (0,90), l'Oracle donne a une equipe coordonnee des
           fenetres de degats franches (1,10). */
        const kind = this._pickBoss(this.players.size);
        this.lastBossKind = kind;
        const def = bossAt(kind);
        const hp = CFG.BOSS_HP_BASE * Math.pow(crowd, 1.15)
          * (1 + (this.bossCount - 1) * CFG.BOSS_GROWTH)
          * power * CFG.BOSS_HP_MUL * this.diff.boss * def.hpMul;
        const pos = this._spawnPoint();
        this.boss = {
          id: this._nextId++,
          kind,
          x: pos.x, y: pos.y,
          hp, maxHp: hp,
          bars: CFG.BOSS_BARS,
          barHp: hp / CFG.BOSS_BARS,
          phase: 0,               // nombre de barres deja brisees
          ang: 0,
          attackCd: 4,
          summonCd: CFG.BOSS_SUMMON_EVERY,
          lastAttack: "",
          dash: 0,
          dashX: 0,
          dashY: 0,
          /* Le boss N n'a pas a reapprendre le damier en barre 2 : il demarre
             avec le repertoire deja ouvert des combats precedents. C'est ce
             qui le rend plus dur d'un boss a l'autre sans lui ajouter des PV,
             qui n'allongent que la duree. */
          floor: Math.min(this.bossCount - 1, CFG.BOSS_BARS - 1),
          spiral: null,
          hunt: null,
          /* Mecaniques propres a un boss : elles vivent toutes sur l'entite et
             non dans des champs de GameState, pour disparaitre avec lui. Un
             minuteur d'Oracle laisse en place apres sa mort continuait de poser
             du Miasme pendant la vague suivante. */
          gaze: 0,               // Regard actif : temps restant
          gazeWarn: 0,
          ult: 0,                // jauge d'ultime de l'Oracle, 0 a 1
          miasmaCd: STATUS_CFG.BOSS_MIASMA_EVERY,
          converge: 0,           // Jumeaux : derniere barre, ils se rejoignent
        };

        /* Les Jumeaux : deux entites, UNE reserve de vie. `boss` reste la
           source de verite (PV, barres, phase) et `boss2` n'est qu'un second
           point d'application — `_damage` redirige. Doubler les champs de vie
           aurait impose de synchroniser deux barres a chaque coup, pour un
           combat ou la seule question interessante est la distance entre eux. */
        if (kind === BOSS_JUMEAUX) {
          const g = BOSS_CFG.TWIN_GAP / 2;
          const B = this.bounds;
          const put = x => Math.min(Math.max(x, B.x0 + 60), B.x1 - 60);
          this.boss.x = put(pos.x - g);
          this.boss.status = STATUS_BURN;
          this.boss2 = {
            id: this._nextId++,
            kind, twin: 1,
            x: put(pos.x + g), y: pos.y,
            ang: 0, dash: 0, dashX: 0, dashY: 0,
            status: STATUS_ROOT,
          };
        }
        this._alertBoss(kind);
      }
      return;
    }

    const b = this.boss;
    const t = this._nearestPlayer(b.x, b.y);
    if (!t) return;
    const dx = t.x - b.x, dy = t.y - b.y;
    const d = Math.hypot(dx, dy) || 1;

    this._bossMove(b, dt);
    if (this.boss2) this._bossMove(this.boss2, dt);

    if (b.burn) {
      b.burn.t -= dt;
      this._damage(b, b.burn.dmg * dt / CARD_CFG.BURN_TIME, b.burn.owner, 0, true);
      if (b.burn.t <= 0) b.burn = null;
      if (!this.boss) return;      // la brulure peut l'achever
    }

    this._spiral(b, dt);
    this._hunt(b, dt);
    this._marks(dt);
    this._bossPassives(b, dt);
    if (!this.boss) return;        // les Jumeaux peuvent mourir dans leur passe
    this._bossBars(b);

    b.summonCd -= dt;
    if (b.summonCd <= 0) {
      b.summonCd = CFG.BOSS_SUMMON_EVERY;
      if (this.enemies.length < CFG.BOSS_ADD_CAP) {
        const count = CFG.BOSS_SUMMON_BASE + Math.max(1, this.players.size);
        for (let i = 0; i < count; i++) this._spawnEnemy();
      }
    }

    b.attackCd -= dt;
    if (b.attackCd <= 0) {
      // Le rythme se resserre a chaque barre brisee
      b.attackCd = CFG.BOSS_ATTACK_CD * Math.max(0.55, 1 - CFG.BOSS_PHASE_CD_STEP * b.phase);
      this._bossAttack(b, dx / d, dy / d);
    }
  }

  /* Deplacement d'UNE entite de boss. Extrait de `_boss` parce que les Jumeaux
     en ont deux : le second poursuit le joueur le plus proche de LUI, sinon les
     deux se collent sur la meme cible et l'equipe n'a jamais a se separer. */
  _bossMove(b, dt) {
    let tx, ty;
    if (this.boss.converge > 0 && this.boss2) {
      // Derniere barre des Jumeaux : ils se rejoignent au centre. L'equipe doit
      // se regrouper alors qu'elle a passe le combat a se separer — c'est le
      // renversement qui donne son sens au verbe du combat.
      tx = (this.bounds.x0 + this.bounds.x1) / 2;
      ty = (this.bounds.y0 + this.bounds.y1) / 2;
    } else {
      const t = this._nearestPlayer(b.x, b.y);
      if (!t) return;
      tx = t.x; ty = t.y;
    }
    const dx = tx - b.x, dy = ty - b.y;
    const d = Math.hypot(dx, dy) || 1;
    b.ang = Math.atan2(dy, dx);
    if (b.dash > 0) {
      b.dash -= dt;
      b.x += b.dashX * 430 * dt;
      b.y += b.dashY * 430 * dt;
    } else {
      b.x += (dx / d) * CFG.BOSS_SPEED * dt;
      b.y += (dy / d) * CFG.BOSS_SPEED * dt;
    }
    /* Le boss reste dans les limites COURANTES, avec une marge : un Ravageur
       laisse dans sa propre couronne pendant une constriction devenait
       intouchable au corps a corps alors qu'il continuait de charger. La marge
       de 80 px lui laisse la meme latitude qu'avant sur l'arene pleine. */
    const B = this.bounds;
    b.x = Math.min(Math.max(b.x, B.x0 - 80), B.x1 + 80);
    b.y = Math.min(Math.max(b.y, B.y0 - 80), B.y1 + 80);
  }

  /* Rupture de barre. C'est le moment ou le combat change de tete : souffle
     qui repousse, projectiles effaces, une mecanique de plus au repertoire.
     On boucle plutot que d'incrementer une fois, parce qu'une nova ou une
     equipe de quatre peut traverser deux barres dans la meme image. */
  _bossBars(b) {
    const broken = Math.min(b.bars - 1, Math.floor((b.maxHp - b.hp) / b.barHp));
    while (b.phase < broken) {
      b.phase++;
      b.attackCd = Math.max(b.attackCd, 1.6);   // respiration avant la suite
      this.shots = [];

      this.effects.push({
        id: this._nextId++,
        x: b.x, y: b.y,
        r: CFG.BOSS_BREAK_PUSH * 2.2,
        life: 0.8, max: 0.8,
        kind: 6,
      });

      for (const p of this.players.values()) {
        if (p.downed) continue;
        const dx = p.x - b.x, dy = p.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        p.x += (dx / d) * CFG.BOSS_BREAK_PUSH;
        p.y += (dy / d) * CFG.BOSS_BREAK_PUSH;
        // Le souffle repousse DANS les limites courantes : pendant une
        // constriction, il projetait sinon droit dans la couronne mortelle.
        this._clampToBounds(p, CFG.PLAYER_RADIUS);
        this._hurt(p, CFG.BOSS_BREAK_DAMAGE);
      }
    }
  }

  /* Repertoire d'attaques. Il n'est plus commun : c'est ce qui change d'un boss
     a l'autre, les cinq barres de vie et la montee en repertoire par barre
     rompue restant le squelette partage. Le repertoire d'entree est disponible
     d'emblee, chaque barre brisee en ouvre une couche — on apprend le combat
     par etages au lieu de tout subir d'un coup.

     Le tirage evite la repetition immediate, sinon deux grilles d'affilee
     donnent l'impression d'un bug. */
  _bossAttack(b, ux, uy) {
    const pool = bossPool(b.kind, Math.max(b.phase, b.floor));
    let choice = pool[Math.floor(Math.random() * pool.length)];
    if (choice === b.lastAttack && pool.length > 1) {
      choice = pool[(pool.indexOf(choice) + 1) % pool.length];
    }
    b.lastAttack = choice;
    this._atk(choice, b, ux, uy);
  }

  /* Repartiteur d'attaques. Les cles sont des CHAINES et ne circulent jamais
     sur le reseau : seul l'identifiant de MECANIQUE le fait, via le canal
     d'alerte. Une attaque de groupe dont la mecanique n'a pas lieu d'etre a cet
     effectif retombe sur les marques — le boss ne reste jamais les bras
     ballants, ce qui allongeait le combat d'autant. */
  _atk(key, b, ux, uy) {
    switch (key) {
      case "salve":        this._atkSalve(b); break;
      case "marques":      this._atkMarques(b); break;
      case "charge":       b.dash = 0.55; b.dashX = ux; b.dashY = uy; break;
      case "damier":       this._atkDamier(b); break;
      case "couronne":     this._atkCouronne(b); break;
      case "couloirs":     this._atkCouloirs(b); break;
      case "balayage":     this._atkBalayage(b); break;
      case "spirale":      this._atkSpirale(b); break;
      case "traque":       this._atkTraque(b); break;
      case "mur":          this._atkMur(b); break;
      case "quadrant":     this._atkQuadrant(b); break;
      case "grappes":      this._atkGrappes(b); break;
      case "nourriciers":  this._atkNourriciers(b); break;
      case "prison":       this._atkPrison(b); break;
      case "proximite":    this._atkProximite(b); break;
      case "exaflare":     this._atkExaflare(b); break;
      case "appat":        this._atkAppats(b); break;
      case "derive":       this._atkDerive(b); break;
      case "sanctuaire":   this._atkSanctuaires(b); break;
      case "verglas":      this._atkVerglas(b); break;
      case "rassemblement":this._atkRassemblement(b); break;
      case "dispersion":   this._atkDispersion(b); break;
      case "tours":        this._atkTours(b, false); break;
      case "denombrement": this._atkTours(b, true); break;
      case "regard":       this._atkRegard(b); break;
      case "lien":         this._atkLien(b); break;
      case "croix":        this._atkCroix(b); break;
      case "croixdurable": this._atkCroixDurable(b); break;
      case "cone":         this._atkCone(b); break;
      case "pacman":       this._atkPacman(b); break;
      case "constriction": this._atkConstriction(b); break;
      default:             this._atkMarques(b); break;
    }
  }

  /* Spirale : trois bras de projectiles qui tournent lentement. Contrairement
     a la salve, on ne l'esquive pas en se decalant une fois — il faut courir
     dans le sens de rotation, ce qui interdit de rester au contact du boss.
     C'est la reponse a une equipe qui a assez de degats pour le coller. */
  _atkSpirale(b) {
    b.spiral = {
      left: CFG.SPIRAL_SHOTS,
      t: 0,
      ang: Math.random() * Math.PI * 2,
      dir: Math.random() < 0.5 ? 1 : -1,
    };
  }

  _spiral(b, dt) {
    const s = b.spiral;
    if (!s || s.left <= 0) return;
    s.t -= dt;
    while (s.t <= 0 && s.left > 0) {
      for (let i = 0; i < CFG.SPIRAL_ARMS; i++) {
        const a = s.ang + (i / CFG.SPIRAL_ARMS) * Math.PI * 2;
        this.shots.push({
          id: this._nextId++,
          x: b.x, y: b.y,
          vx: Math.cos(a) * CFG.SHOT_SPEED,
          vy: Math.sin(a) * CFG.SHOT_SPEED,
          life: CFG.SHOT_LIFE,
        });
      }
      s.ang += s.dir * CFG.SPIRAL_TURN * CFG.SPIRAL_STEP;
      s.left--;
      s.t += CFG.SPIRAL_STEP;
    }
    if (s.left <= 0) b.spiral = null;
  }

  /* Traque : la zone se pose sur le joueur, trois fois de suite. La premiere
     s'evite en marchant, la troisieme oblige a avoir prevu ou aller — c'est la
     seule mecanique qui punit le fait de rester immobile en tirant.

     Depuis le lot 5 elle POURSUIT : la zone ne vise plus une position figee,
     elle colle aux talons pendant son annonce (`follow`, `chase`). Ca change
     tout le geste — on ne s'ecarte plus d'un point, on DESSINE une trajectoire,
     et il faut le faire sans la ramener sur ses allies. La vitesse de
     poursuite est volontairement inferieure a celle du joueur : une zone qui
     rattrape est une taxe, une zone qu'on seme est une decision. */
  _atkTraque(b) {
    b.hunt = { left: CFG.HUNT_WAVES, t: 0 };
  }

  _hunt(b, dt) {
    const h = b.hunt;
    if (!h || h.left <= 0) return;
    h.t -= dt;
    if (h.t > 0) return;

    h.t = CFG.HUNT_STEP;
    h.left--;
    for (const p of this.players.values()) {
      if (p.downed) continue;
      this._zone({
        x: p.x, y: p.y,
        r: CFG.HUNT_RADIUS,
        warn: CFG.HUNT_WARN,
        follow: p.id, chase: CFG.HUNT_CHASE,
        dmg: this._zoneDamage(b),
      });
    }
    if (h.left <= 0) b.hunt = null;
  }

  /* Mur : une bande traverse l'arene par paliers, avec un trou qui se deplace
     a chaque pas. On ne lit pas une forme, on lit un trajet : il faut suivre
     le trou en courant, et il n'y a pas d'endroit ou attendre. */
  _atkMur(b) {
    const vertical = Math.random() < 0.5;
    const span = vertical ? CFG.ARENA_W : CFG.ARENA_H;
    const across = vertical ? CFG.ARENA_H : CFG.ARENA_W;
    let hole = CFG.WALL_HOLE / 2 + Math.random() * (across - CFG.WALL_HOLE);
    const drift = (Math.random() < 0.5 ? 1 : -1) * (across / (CFG.WALL_STEPS + 1));

    for (let i = 0; i < CFG.WALL_STEPS; i++) {
      const k = (i + 0.5) / CFG.WALL_STEPS;
      const pos = span * k;
      // Le trou repart de l'autre bord plutot que de s'arreter contre le mur :
      // colle a un bord, il donnait un coin ou toute l'equipe campait.
      hole += drift;
      if (hole < CFG.WALL_HOLE / 2 || hole > across - CFG.WALL_HOLE / 2) {
        hole = Math.min(Math.max(hole, CFG.WALL_HOLE / 2), across - CFG.WALL_HOLE / 2);
      }
      const warn = CFG.WALL_WARN + i * CFG.WALL_STAGGER;

      // Une bande trouee, c'est deux rectangles : les zones sont pleines, on ne
      // sait pas y decouper un vide.
      const before = hole - CFG.WALL_HOLE / 2;
      const after = across - (hole + CFG.WALL_HOLE / 2);
      if (before > 4) {
        this._zone({
          shape: 1,
          x: vertical ? pos : before / 2,
          y: vertical ? before / 2 : pos,
          w: vertical ? CFG.WALL_THICKNESS : before,
          h: vertical ? before : CFG.WALL_THICKNESS,
          warn, dmg: this._zoneDamage(b),
        });
      }
      if (after > 4) {
        this._zone({
          shape: 1,
          x: vertical ? pos : across - after / 2,
          y: vertical ? across - after / 2 : pos,
          w: vertical ? CFG.WALL_THICKNESS : after,
          h: vertical ? after : CFG.WALL_THICKNESS,
          warn, dmg: this._zoneDamage(b),
        });
      }
    }
  }

  /* ===========================================================================
     MECANIQUES DE GROUPE (lot 4)

     Toutes suivent le meme cycle : annonce (canal d'alerte + marqueur au sol),
     puis resolution. Elles vivent dans UNE liste `marks` et non dans un champ
     par mecanique : le cycle est identique, et le client n'a alors qu'une seule
     liste a dessiner au lieu d'une par idee.

     L'adaptation a l'effectif se fait par un SEUIL PAR MECANIQUE
     (`adaptMech`), jamais par une variante de combat : cinq variantes de cinq
     boss auraient ete impossibles a maintenir, et la premiere a deriver aurait
     rendu la table du LISEZMOI fausse sans que personne ne s'en apercoive.
     ======================================================================== */

  _alivePlayers() {
    const out = [];
    for (const p of this.players.values()) if (!p.downed) out.push(p);
    return out;
  }

  /* Canal d'evenements de mecanique. GameState ne connait pas le reseau : il
     empile, le serveur vide apres le tick. Message PONCTUEL, hors du snapshot a
     20 Hz — une consigne repetee vingt fois par seconde ne serait plus une
     consigne, ce serait un decor. */
  _alert(mech, dur = 0) {
    const def = mechAt(mech);
    if (!def) return;
    this.alerts.push({ mech, level: def.level, dur: Math.round(dur * 100) / 100 });
    // Borne de securite : si personne ne vide la file (test hors serveur), elle
    // ne doit pas croitre indefiniment sur une manche de dix minutes.
    if (this.alerts.length > 16) this.alerts.shift();
  }

  // Identite du boss a l'entree : nom et verbe. C'est ce qui permet a une equipe
  // de savoir immediatement a quoi s'attendre, avant meme la premiere annonce.
  _alertBoss(kind) {
    this.alerts.push({ mech: -1, level: ALERT_INFO, dur: 3, boss: kind });
  }

  /* Sanction d'echec. Calibree en part des PV MAX et non en valeur brute : une
     valeur fixe vieillit des la premiere carte de PV. Le drapeau `mech` de
     `_hurt` garantit qu'un joueur a pleine vie n'en meurt pas — c'est le cumul
     de Vulnerabilite pose ici qui rend le SECOND echec fatal. */
  _mechDamage(p) { return p.maxHp * BOSS_CFG.MECH_DAMAGE_RATIO; }

  _mechHit(p, ratio = 1) {
    if (!p || p.downed) return;
    p.mechFails++;
    this._hurt(p, this._mechDamage(p) * ratio, true, false, false, true);
    this._applyStatus(p, STATUS_VULN, BOSS_CFG.MECH_VULN);
  }

  _mark(o) {
    const m = {
      id: this._nextId++,
      mech: 0, x: 0, y: 0, r: 0, t: 0, max: 0,
      a: 0, b: 0,              // joueurs ou entites concernes
      need: 0, cur: 0,         // denombrement : requis / presents
      hp: 0, maxHp: 0,         // cage, grappe
      vx: 0, vy: 0, grp: 0, lead: 0, left: 0, step: 0,
      dead: false,
      ...o,
    };
    if (!m.max) m.max = m.t;
    this.marks.push(m);
    return m;
  }

  _countIn(m) {
    let n = 0;
    for (const p of this.players.values()) {
      if (p.downed) continue;
      if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 <= m.r * m.r) n++;
    }
    return n;
  }

  /* --- regroupement --------------------------------------------------------
     La mecanique de cohesion de reference : les degats sont divises par le
     nombre de joueurs dans le cercle. Seul, on encaisse tout. En solo elle n'a
     pas de sens — elle se replie sur une zone a esquiver, meme geste, sans
     dependance a un allie. */
  _atkRassemblement(b) {
    const alive = this._alivePlayers();
    const mech = adaptMech(MECH_STACK, alive.length);
    if (mech < 0 || alive.length === 0) { this._atkMarques(b); return; }

    if (mech === MECH_DODGE) {
      const p = alive[0];
      this._alert(MECH_DODGE, BOSS_CFG.STACK_WARN);
      this._zone({
        x: p.x, y: p.y, r: BOSS_CFG.STACK_RADIUS,
        warn: BOSS_CFG.STACK_WARN, dmg: this._zoneDamage(b),
      });
      return;
    }

    const p = alive[Math.floor(Math.random() * alive.length)];
    this._mark({
      mech: MECH_STACK, a: p.id, x: p.x, y: p.y,
      r: BOSS_CFG.STACK_RADIUS, t: BOSS_CFG.STACK_WARN,
    });
    this._alert(MECH_STACK, BOSS_CFG.STACK_WARN);
  }

  _resolveStack(m) {
    const carrier = this.players.get(m.a);
    if (!carrier || carrier.downed) return;
    const inside = [];
    for (const p of this.players.values()) {
      if (p.downed) continue;
      if (p === carrier || (p.x - m.x) ** 2 + (p.y - m.y) ** 2 <= m.r * m.r) inside.push(p);
    }
    // Le porteur encaisse TOUJOURS : c'est ce qui fait de la mecanique une
    // demande a l'equipe et non un test d'esquive individuel.
    if (inside.length <= 1) { this._mechHit(carrier); return; }
    const share = 1 / inside.length;
    for (const p of inside) {
      this._hurt(p, this._mechDamage(p) * share, true, false, false, true);
    }
  }

  /* --- dispersion ---------------------------------------------------------- */
  _atkDispersion(b) {
    const alive = this._alivePlayers();
    if (adaptMech(MECH_SPREAD, alive.length) !== MECH_SPREAD) { this._atkMarques(b); return; }
    this._mark({
      mech: MECH_SPREAD,
      x: (this.bounds.x0 + this.bounds.x1) / 2,
      y: (this.bounds.y0 + this.bounds.y1) / 2,
      r: BOSS_CFG.SPREAD_MIN, t: BOSS_CFG.SPREAD_WARN,
    });
    this._alert(MECH_SPREAD, BOSS_CFG.SPREAD_WARN);
  }

  _resolveSpread() {
    const alive = this._alivePlayers();
    const hit = new Set();
    const min2 = BOSS_CFG.SPREAD_MIN * BOSS_CFG.SPREAD_MIN;
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], c = alive[j];
        if ((a.x - c.x) ** 2 + (a.y - c.y) ** 2 > min2) continue;
        hit.add(a); hit.add(c);
      }
    }
    // Un joueur pris dans deux paires trop proches n'encaisse qu'une fois : la
    // sanction porte sur « tu n'as pas ecarte », pas sur le nombre de voisins.
    for (const p of hit) this._mechHit(p, BOSS_CFG.SPREAD_RATIO);
  }

  /* --- tours et denombrement -----------------------------------------------
     Ce qui force une repartition explicite en pleine vague. Le denombrement en
     est la variante exigeante : un nombre exact par zone, affiche sur le
     marqueur, et il ne sort qu'a trois joueurs ou plus. */
  _atkTours(b, exact) {
    const alive = this._alivePlayers();
    const mech = adaptMech(exact ? MECH_COUNT : MECH_TOWER, alive.length);
    if (mech < 0) { this._atkMarques(b); return; }

    const grp = this._nextId++;
    // Les tours se posent dans les limites COURANTES : une tour tombee dans la
    // couronne d'une constriction serait inoccupable, donc un echec force.
    const B = this.bounds;
    const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
    const rad = Math.min(B.x1 - B.x0, B.y1 - B.y0) * 0.32;
    const base = Math.random() * Math.PI * 2;
    const warn = mech === MECH_COUNT ? BOSS_CFG.COUNT_WARN : BOSS_CFG.TOWER_WARN;

    /* Denombrement : deux zones seulement, et une repartition INEGALE tiree au
       sort. A une par joueur, « le nombre exact » se lit « un chacun » et la
       variante n'ajoute rien a des tours ordinaires. */
    const n = mech === MECH_COUNT ? 2 : towerCount(alive.length);
    const needs = [];
    if (mech === MECH_COUNT) {
      const first = 1 + Math.floor(Math.random() * (alive.length - 1));
      needs.push(first, alive.length - first);
    } else {
      for (let i = 0; i < n; i++) needs.push(1);
    }

    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      this._mark({
        mech, grp, lead: i === 0 ? 1 : 0,
        x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad,
        r: BOSS_CFG.TOWER_RADIUS, t: warn, need: needs[i],
      });
    }
    this._alert(mech, warn);
  }

  _resolveTowers(lead) {
    const group = this.marks.filter(m => m.grp === lead.grp);
    const alive = this._alivePlayers().length;
    let missed = 0;
    for (const m of group) {
      const n = this._countIn(m);
      /* Un joueur qui se deconnecte ne doit pas bloquer la mecanique : le
         requis est ramene a ce qui reste jouable. Sans ce plafond, trois tours
         posees a quatre joueurs restaient a jamais inoccupables a trois et la
         sanction tombait a chaque resolution sans qu'on puisse rien y faire. */
      const need = Math.min(m.need, Math.max(1, alive));
      if (m.mech === MECH_COUNT ? n !== need : n < 1) missed++;
    }
    if (missed > 0) {
      // Chaque tour manquee frappe TOUTE l'equipe : c'est ce qui en fait une
      // affaire collective et pas la faute de celui qui n'y etait pas.
      for (const p of this._alivePlayers()) {
        this._mechHit(p, BOSS_CFG.TOWER_RATIO * missed);
      }
    }
    for (const m of group) m.dead = true;
  }

  /* --- lien ---------------------------------------------------------------- */
  _atkLien(b) {
    const alive = this._alivePlayers();
    if (adaptMech(MECH_LINK, alive.length) !== MECH_LINK) { this._atkMarques(b); return; }
    const i = Math.floor(Math.random() * alive.length);
    let j = Math.floor(Math.random() * (alive.length - 1));
    if (j >= i) j++;
    this._mark({
      mech: MECH_LINK, a: alive[i].id, b: alive[j].id,
      x: (alive[i].x + alive[j].x) / 2, y: (alive[i].y + alive[j].y) / 2,
      r: BOSS_CFG.LINK_BREAK, t: BOSS_CFG.LINK_TIME,
    });
    this._alert(MECH_LINK, BOSS_CFG.LINK_TIME);
  }

  /* --- prison --------------------------------------------------------------
     Un joueur enferme, immobile, jusqu'a ce que les autres brisent la cage en
     tirant dessus. En solo elle se replie sur une grappe a detruire dans un
     delai serre : meme verbe — « detruis vite » — sans dependance a un allie. */
  _atkPrison(b) {
    const alive = this._alivePlayers();
    const mech = adaptMech(MECH_JAIL, alive.length);
    if (mech === MECH_CLUSTER) { this._atkGrappes(b, 1, true); return; }
    if (mech !== MECH_JAIL) { this._atkMarques(b); return; }

    const p = alive[Math.floor(Math.random() * alive.length)];
    const hp = BOSS_CFG.JAIL_HP * this._teamPower();
    this._mark({
      mech: MECH_JAIL, a: p.id, x: p.x, y: p.y, r: 46,
      t: BOSS_CFG.JAIL_TIME, hp, maxHp: hp,
    });
    this._alert(MECH_JAIL, BOSS_CFG.JAIL_TIME);
  }

  /* --- grappes -------------------------------------------------------------
     Le combat de la Matriarche n'est pas « tirer sur le boss » mais « choisir
     sa cible » : une grappe laissee tranquille eclot en trois runners. */
  _atkGrappes(b, count = 0, urgent = false) {
    /* Une seule grappe en solo. A deux, un joueur peut se detacher pendant que
       l'autre tient le boss ; seul, chaque grappe est du temps de tir pris sur
       le boss lui-meme — la mesure donnait 91 s de combat contre 49 pour le
       Ravageur, soit un combat deux fois plus long pour la meme idee. */
    if (!count) count = this.players.size >= 2 ? BOSS_CFG.CLUSTER_COUNT : 1;
    const hp = BOSS_CFG.CLUSTER_HP * this._teamPower();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 90 + Math.random() * 190;
      const pt = this._dropPoint(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d);
      this._mark({
        mech: MECH_CLUSTER,
        x: pt.x, y: pt.y,
        r: 30, t: urgent ? BOSS_CFG.CLUSTER_TIME * 0.5 : BOSS_CFG.CLUSTER_TIME,
        hp, maxHp: hp,
      });
    }
    this._alert(MECH_CLUSTER, urgent ? BOSS_CFG.CLUSTER_TIME * 0.5 : BOSS_CFG.CLUSTER_TIME);
  }

  /* --- liens nourriciers ---------------------------------------------------
     Des rejetons la soignent tant que le lien n'est pas coupe : il faut les
     tuer, pas elle. C'est la mecanique qui punit le degat brut. */
  _atkNourriciers(b) {
    // Un seul rejeton en solo, pour la meme raison que les grappes : c'est du
    // temps de tir, et seul on ne peut pas le partager.
    const n = this.players.size >= 2 ? BOSS_CFG.FEED_COUNT : 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = this._spawnEnemy(0, b.x + Math.cos(a) * 120, b.y + Math.sin(a) * 120);
      if (!e) continue;
      /* Le lien nourricier n'a PAS d'echeance : il ne se coupe qu'en tuant le
         rejeton. Un `t` de zero l'aurait resolu des le premier tick — c'est
         arrive, et le soin de la Matriarche ne s'appliquait jamais. La borne a
         600 s existe pour qu'un rejeton devenu inatteignable ne laisse pas un
         marqueur eternel dans la liste. */
      this._mark({ mech: MECH_FEED, a: e.id, x: e.x, y: e.y, r: 24, t: 600 });
    }
    this._alert(MECH_FEED, 0);
  }

  /* --- proximite -----------------------------------------------------------
     Un degrade plutot qu'un binaire dedans/dehors : plus lisible pour un
     debutant, plus exigeant pour qui optimise — la difference entre « je suis
     sorti » et « je suis sorti assez loin » devient mesurable. */
  _atkProximite(b) {
    this._mark({
      mech: MECH_PROX, x: b.x, y: b.y,
      r: BOSS_CFG.PROX_RADIUS, t: BOSS_CFG.PROX_WARN,
    });
    this._alert(MECH_PROX, BOSS_CFG.PROX_WARN);
  }

  _resolveProx(m) {
    for (const p of this._alivePlayers()) {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d >= m.r) continue;
      const k = 1 - d / m.r;
      const ratio = 0.2 + 0.8 * k * k;
      // Letal au centre : au-dela de 85 % de la sanction on passe par le meme
      // chemin qu'un echec franc, cumul de Vulnerabilite compris.
      if (ratio >= 0.85) this._mechHit(p, ratio);
      else this._hurt(p, this._mechDamage(p) * ratio, true, false, false, true);
    }
  }

  /* --- regard --------------------------------------------------------------
     Pendant deux secondes, tout joueur dont la DIRECTION DE VISEE pointe vers
     le boss est sanctionne. Mecanique inedite et gratuite : elle punit
     exactement le reflexe central du jeu, et elle n'existe que parce qu'on vise
     a la souris — aucun jeu au clavier ne pourrait la poser. */
  _atkRegard(b) {
    b.gazeWarn = BOSS_CFG.GAZE_WARN;
    b.gaze = BOSS_CFG.GAZE_TIME;
    this._alert(MECH_GAZE, BOSS_CFG.GAZE_WARN + BOSS_CFG.GAZE_TIME);
  }

  /* --- Metronome -----------------------------------------------------------
     Exaflares : une sequence d'explosions qui traverse l'arene, SEULE LA
     PREMIERE etant annoncee. Les suivantes se posent au fur et a mesure avec
     une annonce breve : c'est la lecture du trajet qui sauve, pas celle d'une
     forme. D'ou un minuteur sur le boss plutot que douze zones posees d'un
     coup, qui auraient tout revele. */
  _atkExaflare(b) {
    const a = Math.random() * Math.PI * 2;
    const start = {
      x: CFG.ARENA_W / 2 - Math.cos(a) * CFG.ARENA_W * 0.45,
      y: CFG.ARENA_H / 2 - Math.sin(a) * CFG.ARENA_H * 0.45,
    };
    b.flare = {
      x: start.x, y: start.y,
      dx: Math.cos(a) * BOSS_CFG.EXAFLARE_R * 1.55,
      dy: Math.sin(a) * BOSS_CFG.EXAFLARE_R * 1.55,
      left: BOSS_CFG.EXAFLARE_STEPS, t: 0, first: 1,
    };
    this._alert(MECH_EXAFLARE, BOSS_CFG.EXAFLARE_WARN);
  }

  _flare(b, dt) {
    const f = b.flare;
    if (!f) return;
    f.t -= dt;
    if (f.t > 0) return;
    f.t = BOSS_CFG.EXAFLARE_STEP;
    this._zone({
      x: f.x, y: f.y, r: BOSS_CFG.EXAFLARE_R,
      // La premiere est annoncee longuement, les suivantes juste assez pour
      // qu'on voie ou elles vont : c'est tout le principe de l'exaflare.
      warn: f.first ? BOSS_CFG.EXAFLARE_WARN : 0.4,
      dmg: this._zoneDamage(b),
    });
    f.first = 0;
    f.x += f.dx; f.y += f.dy;
    f.left--;
    if (f.left <= 0 || f.x < -200 || f.x > CFG.ARENA_W + 200
        || f.y < -200 || f.y > CFG.ARENA_H + 200) b.flare = null;
  }

  /* Appats : la zone se pose la ou le joueur etait il y a une seconde, et le
     fantome qui l'annonce le suit avec le meme retard. Rester immobile fait
     tomber la zone sur soi ; c'est la mecanique qui apprend a ne pas camper. */
  _atkAppats(b) {
    for (const p of this._alivePlayers()) {
      this._mark({
        mech: MECH_BAIT, a: p.id, x: p.x, y: p.y, r: BOSS_CFG.BAIT_R,
        t: BOSS_CFG.BAIT_COUNT * BOSS_CFG.BAIT_STEP,
        left: BOSS_CFG.BAIT_COUNT, step: 0,
      });
    }
    this._alert(MECH_BAIT, BOSS_CFG.BAIT_COUNT * BOSS_CFG.BAIT_STEP);
  }

  // Disques persistants qui glissent : ils obligent a un deplacement lateral
  // continu, la ou toutes les autres zones s'esquivent une fois puis s'oublient.
  _atkDerive(b) {
    for (let i = 0; i < BOSS_CFG.DRIFT_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      this._zone({
        x: this.bounds.x0 + Math.random() * (this.bounds.x1 - this.bounds.x0),
        y: this.bounds.y0 + Math.random() * (this.bounds.y1 - this.bounds.y0),
        r: BOSS_CFG.DRIFT_R,
        vx: Math.cos(a) * BOSS_CFG.DRIFT_SPEED,
        vy: Math.sin(a) * BOSS_CFG.DRIFT_SPEED,
        warn: 1.2, period: BOSS_CFG.DRIFT_PERIOD, left: BOSS_CFG.DRIFT_TICKS,
        dmg: this._zoneDamage(b) * 0.55,
      });
    }
    this._alert(MECH_DRIFT, 1.2);
  }

  /* Sanctuaires : toute l'arene devient dangereuse SAUF deux ou trois disques
     surs, qui se deplacent. C'est l'inverse de tout le reste du jeu, ou les
     zones sont le danger — d'ou un marqueur a part et non une zone. */
  _atkSanctuaires(b) {
    const alive = Math.max(1, this._alivePlayers().length);
    const n = alive <= 2 ? 2 : 3;
    const grp = this._nextId++;
    const total = BOSS_CFG.SANCT_WARN + BOSS_CFG.SANCT_TICKS * BOSS_CFG.SANCT_PERIOD;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this._mark({
        mech: MECH_SANCTUARY, grp, lead: i === 0 ? 1 : 0,
        x: this.bounds.x0 + 200 + Math.random() * Math.max(1, this.bounds.x1 - this.bounds.x0 - 400),
        y: this.bounds.y0 + 150 + Math.random() * Math.max(1, this.bounds.y1 - this.bounds.y0 - 300),
        vx: Math.cos(a) * BOSS_CFG.SANCT_SPEED,
        vy: Math.sin(a) * BOSS_CFG.SANCT_SPEED,
        r: BOSS_CFG.SANCT_R, t: total,
        left: BOSS_CFG.SANCT_TICKS, step: BOSS_CFG.SANCT_WARN,
      });
    }
    this._alert(MECH_SANCTUARY, BOSS_CFG.SANCT_WARN);
  }

  // Sol glissant : de l'inertie sur le deplacement, rien d'autre. Le Metronome
  // est le seul boss ou le tir compte peu — il fallait qu'il puisse s'attaquer
  // au deplacement lui-meme et pas seulement a ce qu'on esquive.
  _atkVerglas(b) {
    this.slipT = BOSS_CFG.SLIP_TIME;
    this._alert(MECH_SLIP, BOSS_CFG.SLIP_TIME);
  }

  /* Croix depuis chaque Jumeau. Les deux branches sont decalees de CROSS_GAP :
     les zones etant pleines, l'intersection prend les DEUX explosions au lieu
     d'une, ce qui la rend mortelle sans avoir a inventer une forme de zone. */
  _atkCroix(b) {
    for (const e of this._bossTargets()) {
      const a = Math.random() * Math.PI * 2;
      const len = Math.hypot(CFG.ARENA_W, CFG.ARENA_H);
      for (let i = 0; i < 2; i++) {
        this._zone({
          shape: 1, x: e.x, y: e.y,
          w: len, h: BOSS_CFG.CROSS_THICKNESS,
          ang: a + i * Math.PI / 2,
          warn: BOSS_CFG.CROSS_WARN + i * BOSS_CFG.CROSS_GAP,
          dmg: this._zoneDamage(b) * 0.8,
        });
      }
    }
    this._alert(MECH_CROSS, BOSS_CFG.CROSS_WARN);
  }

  /* Croix DURABLE (barre 5 des Jumeaux). Meme figure, mais elle RESTE : quatre
     bandes depuis chaque Jumeau, quatre quadrants surs, huit secondes a tenir
     sa portion au lieu d'un saut a placer. C'est le seul usage de la forme 5 —
     et la raison de son existence : deux rectangles croises auraient coute deux
     entrees de snapshot par branche, deux tests de collision, et surtout deux
     annonces distinctes la ou le joueur doit lire UNE figure. */
  _atkCroixDurable(b) {
    const len = Math.hypot(CFG.ARENA_W, CFG.ARENA_H) / 2;
    for (const e of this._bossTargets()) {
      this._zone({
        shape: 5, x: e.x, y: e.y,
        r: len, h: BOSS_CFG.CROSSD_THICKNESS,
        ang: Math.random() * Math.PI / 2,
        warn: BOSS_CFG.CROSSD_WARN,
        life: BOSS_CFG.CROSSD_LIFE,
        dot: BOSS_CFG.CROSSD_DOT,
        dmg: this._zoneDamage(b) * 0.55,
      });
    }
    this._alert(MECH_CROSS, BOSS_CFG.CROSSD_WARN);
  }

  /* --- Oracle : cone et Pac-Man (lot 5) ------------------------------------
     Le cone est l'attaque frontale qui manquait au registre : un eventail par
     joueur, qu'on esquive LATERALEMENT. Aucune autre forme du jeu ne demande ce
     geste — le disque se fuit en ligne droite, la bande se traverse. */
  _atkCone(b) {
    const alive = this._alivePlayers();
    if (alive.length === 0) { this._atkMarques(b); return; }
    for (const p of alive) {
      this._zone({
        shape: 3, x: b.x, y: b.y,
        r: BOSS_CFG.CONE_R, spread: BOSS_CFG.CONE_SPREAD,
        ang: Math.atan2(p.y - b.y, p.x - b.x),
        warn: BOSS_CFG.CONE_WARN,
        dmg: this._zoneDamage(b),
      });
    }
    this._alert(MECH_DODGE, BOSS_CFG.CONE_WARN);
  }

  /* Pac-Man : tout le disque explose SAUF un secteur. C'est l'inverse exact du
     cone — on ne fuit pas, on se PLACE derriere une direction precise. Il porte
     aussi le mode `proximity` : letal au centre, supportable au bord. Une
     seconde zone concentrique aurait dit la meme chose en doublant la lecture,
     alors que le degrade se voit d'un coup d'oeil. */
  _atkPacman(b) {
    this._zone({
      shape: 4, x: b.x, y: b.y,
      r: BOSS_CFG.PACMAN_R, spread: BOSS_CFG.PACMAN_SAFE,
      ang: Math.random() * Math.PI * 2,
      warn: BOSS_CFG.PACMAN_WARN,
      prox: 1,
      dmg: this._zoneDamage(b) * 1.25,
    });
    this._alert(MECH_SAFE, BOSS_CFG.PACMAN_WARN);
  }

  /* --- cycle de vie des marqueurs ------------------------------------------ */

  _marks(dt) {
    if (this.marks.length === 0) return;
    for (const m of this.marks) if (!m.dead) this._markTick(m, dt);
    for (const m of this.marks) {
      if (m.dead || m.t > 0) continue;
      this._markResolve(m);
    }
    this.marks = this.marks.filter(m => !m.dead);
  }

  _markTick(m, dt) {
    switch (m.mech) {
      case MECH_STACK: {
        // Le cercle SUIT son porteur : pose au sol, il se resoudrait en
        // s'ecartant, ce qui est exactement l'inverse de la consigne.
        const p = this.players.get(m.a);
        if (!p || p.downed) { m.dead = true; return; }
        m.x = p.x; m.y = p.y;
        break;
      }
      case MECH_TOWER:
      case MECH_COUNT:
        m.cur = this._countIn(m);
        break;
      case MECH_LINK: {
        const a = this.players.get(m.a), c = this.players.get(m.b);
        // Lien orphelin : un joueur qui se deconnecte ou tombe ne doit pas
        // laisser l'autre attache a rien jusqu'a l'echeance.
        if (!a || !c || a.downed || c.downed) { m.dead = true; return; }
        m.x = (a.x + c.x) / 2; m.y = (a.y + c.y) / 2;
        if ((a.x - c.x) ** 2 + (a.y - c.y) ** 2 >= m.r * m.r) { m.dead = true; return; }
        this._hurt(a, BOSS_CFG.LINK_DPS * dt, true, false, true);
        this._hurt(c, BOSS_CFG.LINK_DPS * dt, true, false, true);
        break;
      }
      case MECH_JAIL: {
        const p = this.players.get(m.a);
        if (!p || p.downed) { m.dead = true; return; }
        // Le drapeau est REPOSE a chaque image plutot que remis a zero a la
        // liberation : une cage detruite dans le meme tick qu'une autre pose
        // laissait le joueur immobile pour toujours.
        p.jailed = 0.15;
        p.x = m.x; p.y = m.y;
        break;
      }
      case MECH_FEED: {
        const e = this._enemyById(m.a);
        if (!e) { m.dead = true; return; }
        m.x = e.x; m.y = e.y;
        // Le soin va a `boss`, jamais a `boss2` : c'est la meme reserve, et la
        // Matriarche n'a de toute facon pas de jumeau.
        const bo = this.boss;
        if (bo) bo.hp = Math.min(bo.maxHp, bo.hp + bo.maxHp * BOSS_CFG.FEED_HEAL * dt);
        break;
      }
      case MECH_BAIT: {
        const p = this.players.get(m.a);
        if (!p) { m.dead = true; return; }
        const ghost = this._trailAt(p, this.time - BOSS_CFG.BAIT_LAG);
        m.x = ghost.x; m.y = ghost.y;
        m.step -= dt;
        if (m.step <= 0 && m.left > 0) {
          m.step = BOSS_CFG.BAIT_STEP;
          m.left--;
          this._zone({
            x: ghost.x, y: ghost.y, r: m.r,
            warn: BOSS_CFG.BAIT_WARN,
            dmg: this.boss ? this._zoneDamage(this.boss) : CFG.ZONE_DAMAGE,
          });
        }
        break;
      }
      case MECH_SANCTUARY: {
        // Les disques rebondissent sur les bords : sortis de l'arene, ils
        // laissaient un combat sans refuge, donc sans mecanique.
        m.x += m.vx * dt; m.y += m.vy * dt;
        {
          const B = this.bounds;
          if (m.x < B.x0 + m.r || m.x > B.x1 - m.r) { m.vx = -m.vx; }
          if (m.y < B.y0 + m.r || m.y > B.y1 - m.r) { m.vy = -m.vy; }
          this._clampToBounds(m, m.r);
        }
        if (m.lead) {
          m.step -= dt;
          if (m.step <= 0 && m.left > 0) {
            m.step = BOSS_CFG.SANCT_PERIOD;
            m.left--;
            this._pulseSanctuaires(m.grp);
          }
        }
        break;
      }
      default: break;
    }
    m.t -= dt;
  }

  _markResolve(m) {
    m.dead = true;
    switch (m.mech) {
      case MECH_STACK: this._resolveStack(m); break;
      case MECH_SPREAD: this._resolveSpread(); break;
      case MECH_TOWER:
      case MECH_COUNT:
        // Seul le meneur resout, pour tout le groupe : compter trois fois la
        // meme repartition aurait triple la sanction.
        if (m.lead) this._resolveTowers(m);
        break;
      case MECH_PROX: this._resolveProx(m); break;
      case MECH_LINK: {
        const a = this.players.get(m.a), c = this.players.get(m.b);
        this._mechHit(a, 0.5);
        this._mechHit(c, 0.5);
        break;
      }
      case MECH_JAIL: {
        const p = this.players.get(m.a);
        if (p) p.jailed = 0;
        this._mechHit(p);
        break;
      }
      case MECH_CLUSTER:
        // Elle eclot : trois runners de plus, et l'arene pourrit si on laisse
        // vivre les ajouts.
        for (let i = 0; i < BOSS_CFG.CLUSTER_HATCH; i++) {
          const a = Math.random() * Math.PI * 2;
          this._spawnEnemy(1, m.x + Math.cos(a) * 24, m.y + Math.sin(a) * 24);
        }
        break;
      default: break;
    }
  }

  /* Cage ou grappe detruite par l'equipe. C'est la seule sortie SANS sanction
     d'une mecanique destructible : elle rend le prisonnier a lui-meme et la
     grappe n'eclot pas. */
  _breakMark(m) {
    m.dead = true;
    const p = this.players.get(m.a);
    if (m.mech === MECH_JAIL && p) p.jailed = 0;
    this.effects.push({
      id: this._nextId++,
      x: m.x, y: m.y, r: 90, life: 0.45, max: 0.45, kind: 4,
    });
  }

  /* Les degats de zone touchent aussi les marqueurs destructibles. Sans ca, un
     tireur au lance-grenades ne pouvait litteralement pas liberer un
     coequipier : son arme n'emet aucune balle qui s'arrete sur une cage. */
  _hitMarks(x, y, radius, dmg) {
    if (!this.marks.length) return;
    for (const m of this.marks) {
      if (m.dead || m.maxHp <= 0) continue;
      const rr = radius + m.r;
      if ((m.x - x) ** 2 + (m.y - y) ** 2 > rr * rr) continue;
      m.hp -= dmg;
      if (m.hp <= 0) this._breakMark(m);
    }
  }

  // Chaque pulsation frappe qui n'est sur AUCUN disque sur. Le test se fait sur
  // le groupe et non disque par disque : etre sur l'un d'eux suffit.
  _pulseSanctuaires(grp) {
    const safe = this.marks.filter(m => m.grp === grp && !m.dead);
    for (const p of this._alivePlayers()) {
      let ok = false;
      for (const s of safe) {
        if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 <= s.r * s.r) { ok = true; break; }
      }
      if (!ok) this._mechHit(p, 0.3);
    }
  }

  /* Position d'un joueur a un instant passe. L'historique est borne a la duree
     de retard des appats et n'est enregistre QUE pendant un combat de Metronome
     — soixante entrees par joueur et par seconde ne se paient pas pour une
     mecanique qui sort dans un combat sur cinq. */
  _trailAt(p, when) {
    if (!p.trail.length) return { x: p.x, y: p.y };
    for (let i = 0; i < p.trail.length; i++) {
      if (p.trail[i].t >= when) return p.trail[i];
    }
    return p.trail[p.trail.length - 1];
  }

  /* --- passes continues du boss --------------------------------------------
     Regard, jauge d'ultime, Miasme, Jumeaux : tout ce qui tourne en continu
     pendant un combat, par opposition au repertoire d'attaques. */
  _bossPassives(b, dt) {
    this._flare(b, dt);

    // Regard : l'annonce d'abord, la sanction ensuite. Le seuil de 0,6 sur le
    // produit scalaire vaut un cone d'environ 106 degres — assez large pour
    // qu'on ne le traverse pas par hasard, assez etroit pour qu'on puisse
    // continuer a tirer sur les renforts a cote.
    if (b.gazeWarn > 0) {
      b.gazeWarn -= dt;
    } else if (b.gaze > 0) {
      b.gaze -= dt;
      for (const p of this._alivePlayers()) {
        p.gazeCd -= dt;
        if (p.gazeCd > 0) continue;
        const dx = b.x - p.x, dy = b.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        if ((p.aimX * dx + p.aimY * dy) / d < 0.6) continue;
        p.gazeCd = BOSS_CFG.GAZE_TICK;
        this._mechHit(p, BOSS_CFG.GAZE_RATIO);
      }
    }

    if (b.kind === BOSS_ORACLE) {
      /* Jauge d'ultime. Elle monte toute seule et ne DESCEND que si les tours
         sont toutes tenues : c'est le vrai controle de degats et de
         coordination du jeu — le seul endroit ou reussir une mecanique achete
         du temps au lieu d'eviter une punition. */
      const towers = this.marks.filter(m => (m.mech === MECH_TOWER || m.mech === MECH_COUNT) && !m.dead);
      const held = towers.length > 0 && towers.every(m => m.cur >= Math.max(1, m.need));
      b.ult += (held ? -BOSS_CFG.ULT_DRAIN : BOSS_CFG.ULT_FILL) * dt;
      if (b.ult <= 0) b.ult = 0;
      if (b.ult >= 1) {
        b.ult = 0;
        this._alert(MECH_ULT, 0);
        for (const p of this._alivePlayers()) this._mechHit(p, BOSS_CFG.ULT_RATIO);
        this.effects.push({
          id: this._nextId++,
          x: b.x, y: b.y, r: CFG.BOSS_SWEEP_R, life: 0.8, max: 0.8, kind: 6,
        });
      }

      /* Miasme : un cumul de Vulnerabilite a toute l'equipe toutes les 25 s.
         L'Oracle est le boss du Miasme parce que c'est celui qui offre des
         fenetres pour le purger — pose ailleurs, il ne serait qu'un impot. */
      b.miasmaCd -= dt;
      if (b.miasmaCd <= 0) {
        b.miasmaCd = STATUS_CFG.BOSS_MIASMA_EVERY;
        this._alert(MECH_MIASMA, 0);
        for (const p of this._alivePlayers()) this._applyStatus(p, STATUS_VULN, 1);
      }
    }

    if (this.boss2) this._twins(b, dt);
  }

  /* Les Jumeaux. Ils se soignent mutuellement a moins de 400 px l'un de
     l'autre : l'equipe doit se separer, ce qui est terrifiant quand la survie
     depend habituellement du regroupement. A la derniere barre ils convergent,
     et la consigne s'inverse. */
  _twins(b, dt) {
    const o = this.boss2;
    if (b.phase >= b.bars - 1 && !b.converge) {
      b.converge = 1;
      this._alert(MECH_CONVERGE, 0);
    }
    if (!b.converge && (b.x - o.x) ** 2 + (b.y - o.y) ** 2 < BOSS_CFG.TWIN_HEAL_RANGE ** 2) {
      b.hp = Math.min(b.maxHp, b.hp + b.maxHp * BOSS_CFG.TWIN_HEAL * dt);
    }

    /* Cumuler les DEUX etats declenche une explosion sur le porteur : il faut
       les traiter separement, donc alterner les Jumeaux au lieu de taper le
       plus proche. Les deux etats sont retires apres l'explosion — les laisser
       en place rejouait la detonation a chaque image. */
    for (const p of this._alivePlayers()) {
      if (!p.statuses.has(STATUS_BURN) || !p.statuses.has(STATUS_ROOT)) continue;
      p.statuses.delete(STATUS_BURN);
      p.statuses.delete(STATUS_ROOT);
      this._mechHit(p, BOSS_CFG.TWIN_BLAST_RATIO);
      this.effects.push({
        id: this._nextId++,
        x: p.x, y: p.y, r: 150, life: 0.5, max: 0.5, kind: 7,
      });
    }
  }

  /* Indice de degats par seconde d'un joueur. Approximatif par construction —
     il ne cherche pas a predire les degats reels, seulement a suivre l'ordre de
     grandeur des cartes prises. */
  _playerPower(p) {
    const m = p.mods;
    // barrelDamageMul, oubli d'origine : « Second canon » ajoute un canon mais
    // retire 18 % de degats a CHAQUE balle. Compter les canons sans la penalite
    // surestimait la puissance de 44 % avec deux exemplaires, et le boss
    // recevait des PV pour des degats qui n'existaient pas — mesure : 76 s au
    // premier boss contre 172 s au troisieme, alors que la formule est censee
    // rendre la duree constante d'un boss a l'autre.
    let barrels = (1 + m.extraBarrels + (m.backShot ? 0.7 : 0)) * m.barrelDamageMul;
    if (m.weapon === "dispersion") barrels = 5 * 0.55;
    else if (m.weapon === "grenade") barrels = 4;      // degats de zone, en partie perdus sur un boss seul
    else if (m.weapon === "railgun") barrels = 1.15;
    // « Inertie » vaut sa decroissance moyenne sur trois ennemis traverses :
    // sans ce terme, une equipe qui la prend affrontait des vagues calibrees
    // pour la moitie de ses degats reels.
    if (m.inertia) barrels *= 1.9;
    /* « Catalyseur » ne vaut que contre une cible affectee, ce qui n'est le cas
       ni toujours ni jamais : compte a MOITIE. L'ignorer donnerait au boss des
       PV pour des degats qui existent (le meme oubli que barrelDamageMul), le
       compter plein lui en donnerait pour des degats qu'on ne fait pas la
       plupart du temps. */
    const catalyseur = 1 + m.catalyseur * 0.5;
    return m.damageMul * barrels * catalyseur * (1 + m.echoChance) / m.fireIntervalMul;
  }

  /* Puissance moyenne de l'equipe. Elle calait deja les PV du boss ; elle cale
     desormais AUSSI la pression des vagues, sans quoi les vagues seraient
     devenues triviales avec quinze cartes pendant que le boss restait calibre.

     Mise en cache pour la duree du tick : _spawnEnemy l'appelle a chaque
     apparition, soit plusieurs fois par seconde, et elle ne peut pas changer
     entre deux apparitions du meme tick.

     Reserve connue : la puissance capture les degats, pas la survie. Un
     soigneur augmente surtout la duree de vie. Si la mesure montre un ecart,
     corriger le DEBIT et non les PV — c'est la densite qui tue, pas la
     resistance. */
  _teamPower() {
    if (this._powerAt === this.time) return this._powerCache;
    let power = 0;
    for (const p of this.players.values()) power += this._playerPower(p);
    this._powerCache = this.players.size ? power / this.players.size : 1;
    this._powerAt = this.time;
    return this._powerCache;
  }

  /* Registre des FORMES. L'index circule dans le snapshot et le client le lit
     dans `zonePath()` : on ajoute donc a la fin, jamais au milieu.

       0 disque · 1 rectangle oriente · 2 anneau
       3 cone (r, ang, spread) · 4 Pac-Man (disque moins un secteur)
       5 croix (quatre bandes depuis un centre, r = demi-longueur, h = epaisseur)

     `proximity` n'est PAS une forme mais un mode de RESOLUTION : les degats se
     degradent avec la distance a l'epicentre, letaux au centre. Il se combine
     avec n'importe quelle forme, ce qu'une sixieme entree de registre n'aurait
     pas permis.

     `warn0` est conserve parce que les annonces n'ont plus toutes la meme
     duree — sans lui, le client ne peut pas dessiner un compte a rebours juste. */
  _zone(z) {
    const zone = {
      id: this._nextId++,
      shape: 0, x: 0, y: 0, r: CFG.ZONE_RADIUS,
      w: 0, h: 0, ang: 0, hole: 0, spread: 0,
      warn: CFG.ZONE_WARN, blast: 0,
      dmg: CFG.ZONE_DAMAGE,
      // Deplacement, repetition, persistance, poursuite : nuls par defaut, donc
      // gratuits pour les quinze zones qui ne s'en servent pas.
      vx: 0, vy: 0, left: 0, period: 0.5,
      life: 0, dot: 0, tick: 0, prox: 0, follow: 0, chase: 0, puddle: 0,
      ...z,
    };
    zone.warn0 = zone.warn;
    this.zones.push(zone);
  }

  // Salve radiale : la seule attaque qu'on esquive en bougeant, pas en lisant.
  _atkSalve(b) {
    const count = 16 + b.phase * 2;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = base + (i / count) * Math.PI * 2;
      this.shots.push({
        id: this._nextId++,
        x: b.x, y: b.y,
        vx: Math.cos(a) * CFG.SHOT_SPEED,
        vy: Math.sin(a) * CFG.SHOT_SPEED,
        life: CFG.SHOT_LIFE,
      });
    }
  }

  // Marques sous les joueurs : ca oblige a s'ecarter des autres.
  _atkMarques(b) {
    for (const p of this.players.values()) {
      if (p.downed) continue;
      this._zone({
        x: p.x + (Math.random() - 0.5) * 90,
        y: p.y + (Math.random() - 0.5) * 90,
        r: CFG.ZONE_RADIUS,
        dmg: this._zoneDamage(b),
      });
    }
    this._zone({ x: b.x, y: b.y, r: CFG.ZONE_RADIUS * 1.3, dmg: this._zoneDamage(b) });
  }

  /* Damier : une case sur deux explose, puis l'autre moitie. Il n'y a jamais
     de case sure sur les deux temps — il faut bouger entre les deux, ce qui
     en fait la premiere mecanique qui demande de prevoir plutot que reagir. */
  _atkDamier(b) {
    const cw = CFG.ARENA_W / CFG.GRID_COLS;
    const ch = CFG.ARENA_H / CFG.GRID_ROWS;
    const parity = Math.random() < 0.5 ? 0 : 1;

    for (let cx = 0; cx < CFG.GRID_COLS; cx++) {
      for (let cy = 0; cy < CFG.GRID_ROWS; cy++) {
        const first = (cx + cy) % 2 === parity;
        // Les cases se touchent exactement. Avec un jeu de quelques pixels
        // entre elles pour la lisibilite, il restait une ligne parfaitement
        // sure sur toute la hauteur de l'arene : le retrait visuel se fait
        // au dessin, jamais sur la zone de degats.
        this._zone({
          shape: 1,
          x: cw * (cx + 0.5), y: ch * (cy + 0.5),
          w: cw, h: ch,
          warn: CFG.GRID_WARN + (first ? 0 : CFG.GRID_GAP),
          dmg: this._zoneDamage(b),
        });
      }
    }
  }

  /* Couronne : anneau d'abord (on rentre au centre), disque ensuite (on
     ressort). L'ordre s'inverse une fois sur deux pour qu'on ne joue pas de
     memoire. */
  _atkCouronne(b) {
    const cx = CFG.ARENA_W / 2, cy = CFG.ARENA_H / 2;
    const ringFirst = Math.random() < 0.5;
    const outer = Math.hypot(CFG.ARENA_W, CFG.ARENA_H);

    this._zone({
      shape: 2, x: cx, y: cy, r: outer, hole: CFG.DONUT_HOLE,
      warn: CFG.DONUT_WARN + (ringFirst ? 0 : CFG.DONUT_GAP),
      dmg: this._zoneDamage(b),
    });
    this._zone({
      shape: 0, x: cx, y: cy, r: CFG.DONUT_HOLE - 10,
      warn: CFG.DONUT_WARN + (ringFirst ? CFG.DONUT_GAP : 0),
      dmg: this._zoneDamage(b),
    });
  }

  /* Couloirs : trois bandes, puis les trois perpendiculaires. On lit un axe,
     on se place, on relit l'autre. */
  _atkCouloirs(b) {
    const vertical = Math.random() < 0.5;
    const lanes = 3;

    for (let i = 0; i < lanes; i++) {
      const k = (i + 0.5) / lanes;
      this._zone({
        shape: 1,
        x: vertical ? CFG.ARENA_W * k : CFG.ARENA_W / 2,
        y: vertical ? CFG.ARENA_H / 2 : CFG.ARENA_H * k,
        w: vertical ? CFG.LANE_THICKNESS : CFG.ARENA_W,
        h: vertical ? CFG.ARENA_H : CFG.LANE_THICKNESS,
        warn: CFG.LANE_WARN,
        dmg: this._zoneDamage(b),
      });
      this._zone({
        shape: 1,
        x: vertical ? CFG.ARENA_W / 2 : CFG.ARENA_W * k,
        y: vertical ? CFG.ARENA_H * k : CFG.ARENA_H / 2,
        w: vertical ? CFG.ARENA_W : CFG.LANE_THICKNESS,
        h: vertical ? CFG.LANE_THICKNESS : CFG.ARENA_H,
        warn: CFG.LANE_WARN + CFG.LANE_GAP,
        dmg: this._zoneDamage(b),
      });
    }
  }

  /* Balayage : des pales partent du boss et explosent l'une apres l'autre,
     dans le sens horaire ou l'inverse. On court avec l'aiguille, pas contre. */
  _atkBalayage(b) {
    const blades = CFG.SWEEP_BLADES;
    const len = Math.hypot(CFG.ARENA_W, CFG.ARENA_H);
    const base = Math.random() * Math.PI * 2;
    const dir = Math.random() < 0.5 ? 1 : -1;

    for (let i = 0; i < blades; i++) {
      const a = base + dir * (i / blades) * Math.PI * 2;
      this._zone({
        shape: 1,
        x: b.x + Math.cos(a) * len / 2,
        y: b.y + Math.sin(a) * len / 2,
        w: len, h: CFG.SWEEP_THICKNESS, ang: a,
        warn: CFG.SWEEP_WARN + i * CFG.SWEEP_STAGGER,
        dmg: this._zoneDamage(b),
      });
    }
  }

  _zoneDamage(b) {
    return CFG.ZONE_DAMAGE * (1 + CFG.BOSS_PHASE_DAMAGE_STEP * b.phase);
  }

  /* ===========================================================================
     ARENE MOBILE (lot 5)

     Deux mecaniques ne posent pas de zone : elles changent la SURFACE. La
     constriction referme les limites par paliers, le verrouillage plante des
     murs infranchissables. Elles partagent le meme principe — rien n'est
     dessine sur le sol, c'est le sol lui-meme qui bouge — et le meme risque :
     tout ce qui borne un deplacement doit lire `this.bounds`.
     =========================================================================== */

  /* Trois choses gardent VOLONTAIREMENT CFG.ARENA_W/H, et ce ne sont pas des
     oublis :

     - l'apparition des ennemis (`_edgeSpawn`) : la horde vient toujours des
       bords de la salle et traverse la couronne pour arriver, ce qui est
       exactement l'interaction que la constriction cherche a creer ;
     - le vol et la culture des projectiles : une balle qui rebondit sur une
       limite invisible au milieu de l'ecran ne se lit pas, alors que le mur de
       la salle se voit ;
     - la GEOMETRIE des zones (damier, couloirs, balayage, couronne) : elles
       couvrent la salle entiere. Deborder sur la couronne est sans effet
       puisque plus personne n'y est, et redecouper la grille a chaque palier
       aurait change la taille des cases en plein combat. */

  // Ramene une entite dans les limites courantes. Point de passage unique, sur
  // le modele de `_hurt` : une nouvelle chose qui se deplace est couverte sans
  // qu'on y pense, et il n'y a qu'un endroit a relire pour en etre sur.
  _clampToBounds(o, margin = 0) {
    const B = this.bounds;
    o.x = Math.min(Math.max(o.x, B.x0 + margin), B.x1 - margin);
    o.y = Math.min(Math.max(o.y, B.y0 + margin), B.y1 - margin);
    return o;
  }

  // Meme chose pour un point qu'on va poser (bonus au sol, apparition) : on ne
  // depose jamais dans la couronne mortelle ce qu'il faudra aller chercher.
  _dropPoint(x, y, margin = 40) {
    const B = this.bounds;
    return {
      x: Math.min(Math.max(x, B.x0 + margin), B.x1 - margin),
      y: Math.min(Math.max(y, B.y0 + margin), B.y1 - margin),
    };
  }

  /* Murs de verrouillage. On repousse du COTE D'OU L'ON VENAIT plutot que du
     cote le plus proche : a l'esquive, un joueur traverse 162 px en trois
     images et se serait retrouve de l'autre cote du mur, c'est-a-dire
     exactement ce que la mecanique interdit. */
  _wallBlock(o, wasX, wasY, radius = 0) {
    const W = this.walls;
    if (!W) return;
    const t = BOSS_CFG.QUAD_THICK / 2 + radius;
    if (Math.abs(o.x - W.x) < t) o.x = wasX <= W.x ? W.x - t : W.x + t;
    if (Math.abs(o.y - W.y) < t) o.y = wasY <= W.y ? W.y - t : W.y + t;
  }

  _arena(dt) {
    /* Palier de constriction annonce. La couronne ne devient mortelle qu'ici,
       a l'echeance : appliquer les limites des l'annonce aurait pousse les
       joueurs sans prevenir, ce qui est le contraire d'une mecanique lisible. */
    if (this.shrink) {
      this.shrink.t -= dt;
      if (this.shrink.t <= 0) {
        const next = this.shrink;
        this.shrink = null;
        this.bounds = { x0: next.x0, y0: next.y0, x1: next.x1, y1: next.y1 };
        /* Qui est pris dehors passe par la sanction de mecanique : elle MET A
           TERRE et ne tue jamais sec, exactement comme un damier rate. Le
           joueur est ensuite repousse a l'interieur par `_players` — la
           constriction ne piege jamais personne hors des limites. */
        for (const p of this._alivePlayers()) {
          if (p.x < next.x0 || p.x > next.x1 || p.y < next.y0 || p.y > next.y1) {
            this._mechHit(p, BOSS_CFG.SHRINK_RATIO);
          }
        }
      }
    }

    /* Couronne mortelle POUR LES ENNEMIS. C'est la seule mecanique de sol du
       jeu qui les blesse, et c'est une decision de conception : les zones de
       boss qui blesseraient la horde annuleraient la difficulte d'elles-memes
       — on attirerait les ennemis dedans et le boss deviendrait une ressource.
       La constriction fait l'inverse : elle COMPRIME 200 ennemis avec les
       joueurs, et en faire un outil de nettoyage desespere est ce qui rend le
       palier memorable au lieu d'etre une simple taxe de surface. */
    const B = this.bounds;
    if (B.x0 > 0 || B.y0 > 0) {
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if (e.x >= B.x0 && e.x <= B.x1 && e.y >= B.y0 && e.y <= B.y1) continue;
        // Degat CONTINU de la couronne : meme drapeau que la brulure, sinon
        // toute la horde comprimee clignote a soixante hertz.
        this._damage(e, BOSS_CFG.CROWN_DPS * dt, 0, 0, true);
      }
      this.enemies = this.enemies.filter(e => e.hp > 0);
    }

    if (this.walls) {
      this.walls.t -= dt;
      if (this.walls.t <= 0) this.walls = null;
    }
  }

  /* Constriction : un palier de plus a chaque lancer, jusqu'au plancher. Le
     centre reste celui de l'arene — un carre qui derive obligerait a relire
     toute la surface a chaque palier au lieu de simplement rentrer. */
  _atkConstriction(b) {
    if (this.shrink) return;      // un palier a la fois, sinon ils se doublent
    const B = this.bounds;
    const w = B.x1 - B.x0, h = B.y1 - B.y0;
    const minW = CFG.ARENA_W * BOSS_CFG.SHRINK_MIN;
    const minH = CFG.ARENA_H * BOSS_CFG.SHRINK_MIN;
    if (w <= minW + 1 && h <= minH + 1) { this._atkMarques(b); return; }

    const nw = Math.max(minW, w - CFG.ARENA_W * BOSS_CFG.SHRINK_STEP);
    const nh = Math.max(minH, h - CFG.ARENA_H * BOSS_CFG.SHRINK_STEP);
    const cx = CFG.ARENA_W / 2, cy = CFG.ARENA_H / 2;
    this.shrink = {
      x0: cx - nw / 2, y0: cy - nh / 2,
      x1: cx + nw / 2, y1: cy + nh / 2,
      t: BOSS_CFG.SHRINK_WARN,
    };
    this._alert(MECH_SHRINK, BOSS_CFG.SHRINK_WARN);
  }

  /* Verrouillage par quadrant. A trois joueurs et plus, deux murs coupent
     l'arene en quatre : chacun se retrouve avec sa portion de horde, le
     regroupement est brise et le soigneur hors de portee. En dessous, la
     mecanique n'a pas de sens — `adaptMech` la replie sur la zone pulsee
     d'origine, meme geste, sans dependance a un allie. */
  _atkQuadrant(b) {
    const mech = adaptMech(MECH_QUADRANT, this._alivePlayers().length);
    if (mech !== MECH_QUADRANT) { this._atkQuadrantZone(b); return; }
    const B = this.bounds;
    this.walls = {
      x: (B.x0 + B.x1) / 2, y: (B.y0 + B.y1) / 2,
      t: BOSS_CFG.QUAD_TIME, max: BOSS_CFG.QUAD_TIME,
    };
    this._alert(MECH_QUADRANT, BOSS_CFG.QUAD_TIME);
  }

  // Repli solo/duo : un quart de l'arene interdit, qui pulse plusieurs fois.
  // On ne lit pas une forme, on lit un endroit ou ne plus etre.
  _atkQuadrantZone(b) {
    const B = this.bounds;
    const qx = Math.random() < 0.5 ? 0 : 1;
    const qy = Math.random() < 0.5 ? 0 : 1;
    const w = (B.x1 - B.x0) / 2, h = (B.y1 - B.y0) / 2;
    this._zone({
      shape: 1,
      x: B.x0 + w * (qx ? 1.5 : 0.5),
      y: B.y0 + h * (qy ? 1.5 : 0.5),
      w, h,
      warn: BOSS_CFG.QUADRANT_WARN,
      period: BOSS_CFG.QUADRANT_PERIOD, left: BOSS_CFG.QUADRANT_TICKS,
      dmg: this._zoneDamage(b) * 0.6,
    });
    this._alert(MECH_DODGE, BOSS_CFG.QUADRANT_WARN);
  }

  /* Flaques remanentes de la Matriarche. Chaque tir de la horde laisse une mare
     de quinze secondes : l'arene se reduit au fil du combat, ce qui fait d'un
     combat qui traine une difficulte PHYSIQUE et non un enrage arbitraire.

     Le plafond est strict et se fait en retirant la PLUS ANCIENNE : laisser
     simplement le compte deborder pavait le sol en fin de combat, et refuser la
     mare la plus recente donnait un sol fige ou plus rien n'apparaissait la ou
     on venait de se faire tirer dessus — c'est-a-dire nulle part ou ca compte. */
  _puddle(x, y) {
    let count = 0, oldest = -1;
    for (let i = 0; i < this.zones.length; i++) {
      if (!this.zones[i].puddle) continue;
      count++;
      if (oldest < 0) oldest = i;
    }
    if (count >= BOSS_CFG.PUDDLE_MAX && oldest >= 0) this.zones.splice(oldest, 1);

    const pt = this._dropPoint(x, y, 0);
    this._zone({
      x: pt.x, y: pt.y, r: BOSS_CFG.PUDDLE_R,
      warn: BOSS_CFG.PUDDLE_WARN,
      life: BOSS_CFG.PUDDLE_LIFE,
      dot: BOSS_CFG.PUDDLE_DOT,
      dmg: BOSS_CFG.PUDDLE_DOT * CFG.ZONE_TICK,
      puddle: 1,
    });
    if (!this.puddleSeen) {
      this.puddleSeen = true;
      this._alert(MECH_PUDDLE, 0);
    }
  }

  // Les mares ne tombent QUE pendant le combat de la Matriarche : c'est son
  // verbe (gestion de cibles) qui les justifie, et les payer sur toutes les
  // vagues aurait rendu chaque tireur de la horde plus dangereux que le boss.
  _puddlesActive() {
    return this.boss !== null && this.boss.kind === BOSS_MATRIARCHE;
  }

  /* --- projectiles --------------------------------------------------------------- */

  _bullets(dt) {
    const kept = [];
    for (const b of this.bullets) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      /* Rebond sur les bords. Le nombre de rebonds est borne (BOUNCE_MAX) et
         non laisse a la seule duree de vie : avec « Canon long », une balle
         traversait l'arene en diagonale pendant deux secondes et demie, et
         quarante balles en vol simultane doublaient la charge de collision
         pour un gain de jeu nul — on ne visait plus, on remplissait. */
      if (b.bounce > 0) {
        let bounced = false;
        if (b.x < 0)               { b.x = -b.x; b.vx = -b.vx; bounced = true; }
        else if (b.x > CFG.ARENA_W) { b.x = 2 * CFG.ARENA_W - b.x; b.vx = -b.vx; bounced = true; }
        if (b.y < 0)               { b.y = -b.y; b.vy = -b.vy; bounced = true; }
        else if (b.y > CFG.ARENA_H) { b.y = 2 * CFG.ARENA_H - b.y; b.vy = -b.vy; bounced = true; }
        if (bounced) {
          b.bounce--;
          b.dmg *= CARD_CFG.BOUNCE_DAMAGE_MUL;
          /* La memoire des cibles est REMISE A ZERO : une balle qui revient sur
             un ennemi deja touche doit pouvoir le retoucher, sinon la carte ne
             valait rien dans une foule dense — c'est-a-dire exactement la
             situation ou on la prend. Le rebond borne empeche la boucle. */
          if (b.hits) b.hits.clear(); else b.hit = null;
        }
      }

      if (b.life > 0 && b.x > -50 && b.x < CFG.ARENA_W + 50
                     && b.y > -50 && b.y < CFG.ARENA_H + 50) {
        kept.push(b);
      } else if (b.boom > 0 && b.life <= 0) {
        // Une grenade qui n'a rien touche explose quand meme : sans ca, tirer
        // dans le vide etait une perte seche alors que l'arme se joue en
        // visant le sol au milieu du groupe.
        this._explode(b.x, b.y, b.boom, b.owner);
      }
    }
    this.bullets = kept;
  }

  _shots(dt) {
    const kept = [];
    const puddles = this._puddlesActive();
    const B = this.bounds;
    for (const s of this.shots) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life > 0 && s.x > -60 && s.x < CFG.ARENA_W + 60
                     && s.y > -60 && s.y < CFG.ARENA_H + 60) { kept.push(s); continue; }
      /* Flaques de la Matriarche : le tir qui S'ETEINT laisse sa mare, pas
         seulement celui qui touche. Sur les seuls impacts, une equipe qui
         esquive bien ne voyait jamais l'arene se reduire — c'est-a-dire que la
         mecanique ne concernait que ceux qui n'en avaient pas besoin. */
      if (puddles && s.life <= 0
          && s.x > B.x0 && s.x < B.x1 && s.y > B.y0 && s.y < B.y1) {
        this._puddle(s.x, s.y);
      }
    }
    this.shots = kept;
  }

  /* Test de collision d'une zone. TOUTES les mesures sont retrecies de
     ZONE_FORGIVE : voir le commentaire de la constante, c'est un ecart
     affichage/logique assume qui compense les 110 ms d'interpolation du client.
     Le sens du retrait s'inverse pour ce qui EPARGNE — le trou de l'anneau et
     le secteur sur du Pac-Man s'elargissent au lieu de retrecir, sinon la
     tolerance jouerait contre le joueur exactement la ou elle doit le
     proteger. */
  _zoneHits(z, p) {
    const dx = p.x - z.x, dy = p.y - z.y;
    const F = CFG.ZONE_FORGIVE;

    if (z.shape === 1) {
      // rectangle oriente : on ramene le joueur dans le repere de la zone
      const c = Math.cos(-z.ang), s = Math.sin(-z.ang);
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      return Math.abs(lx) <= z.w * F / 2 && Math.abs(ly) <= z.h * F / 2;
    }
    if (z.shape === 2) {
      const d2 = dx * dx + dy * dy;
      const out = z.r * F, inn = z.hole / F;
      return d2 <= out * out && d2 >= inn * inn;
    }
    if (z.shape === 3) {
      // Cone : dans le disque ET dans l'ouverture. L'ecart angulaire se ramene
      // dans [-PI, PI] avant comparaison, sinon un cone a cheval sur l'origine
      // des angles n'attrape personne.
      const rr = z.r * F;
      if (dx * dx + dy * dy > rr * rr) return false;
      return Math.abs(this._angleDiff(Math.atan2(dy, dx), z.ang)) <= z.spread * F;
    }
    if (z.shape === 4) {
      // Pac-Man : le disque, moins un secteur sur. Le secteur s'ELARGIT de la
      // tolerance — c'est le refuge, il doit pardonner dans le meme sens.
      const rr = z.r * F;
      if (dx * dx + dy * dy > rr * rr) return false;
      return Math.abs(this._angleDiff(Math.atan2(dy, dx), z.ang)) > z.spread / F;
    }
    if (z.shape === 5) {
      // Croix : deux bandes perpendiculaires depuis un centre. `r` est la
      // demi-longueur des branches, `h` leur epaisseur ; les quatre quadrants
      // entre les branches sont les refuges.
      const c = Math.cos(-z.ang), s = Math.sin(-z.ang);
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      const half = z.h * F / 2, len = z.r * F;
      return (Math.abs(ly) <= half && Math.abs(lx) <= len)
          || (Math.abs(lx) <= half && Math.abs(ly) <= len);
    }
    const rr = z.r * F;
    return dx * dx + dy * dy <= rr * rr;
  }

  // Ecart angulaire ramene dans [-PI, PI]. Utilise par les formes 3 et 4, et
  // ecrit une fois : deux versions locales auraient diverge au premier reglage.
  _angleDiff(a, b) {
    let d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  /* Detonation d'une zone : c'est le seul endroit qui applique ses degats aux
     joueurs, que la zone explose une fois, pulse, ou tique en persistant.

     Le mode `prox` degrade les degats avec la distance a l'epicentre, sur la
     meme courbe que la mecanique de proximite de la Matriarche (0,2 au bord,
     letal au centre) — reutiliser la courbe plutot que d'en inventer une
     seconde garantit que les deux se lisent pareil a l'ecran. */
  _zoneApply(z, amount, overTime) {
    for (const p of this.players.values()) {
      if (p.downed) continue;
      if (!this._zoneHits(z, p)) continue;
      let dmg = amount;
      if (z.prox) {
        const d = Math.hypot(p.x - z.x, p.y - z.y);
        const k = 1 - Math.min(1, d / (z.r || 1));
        dmg *= 0.2 + 0.8 * k * k;
      }
      /* `overTime` sur les tics d'une zone PERSISTANTE, jamais sur une
         detonation. Sans lui, une mare de quinze secondes remettait `hitCd` a
         0,55 s quatre fois par seconde et rendait sa victime immunisee a tout
         le reste — le contact, les tirs, les autres zones. On mourait en
         securite dans une flaque. C'est exactement le bug de la brulure. */
      this._hurt(p, dmg, true, true, overTime);
    }
  }

  /* Cycle de vie d'une zone. Trois regimes, dans cet ordre :

       ANNONCE   (`warn > 0`)  — rien ne blesse encore, le client dessine le
                                 compte a rebours.
       DETONATION              — un passage de degats, puis :
                                   `left > 0`   relance une annonce courte (pulse),
                                   `life > 0`   la zone RESTE et tique,
                                   sinon        elle s'efface avec son souffle.
       PERSISTANCE (`life > 0`) — `dot` degats par seconde, appliques par
                                 paliers de ZONE_TICK.

     C'est ce troisieme regime qui manquait completement : sans lui, aucune zone
     du jeu n'avait la notion de « rester dedans coute cher », et la moitie du
     catalogue de motifs (mares, croix durables, sanctuaires inverses) etait
     inecrivable. Deux champs ont suffi. */
  _zones(dt) {
    const kept = [];
    const B = this.bounds;
    for (const z of this.zones) {
      /* Zones MOBILES (lot 4) et POURSUIVANTES (lot 5). Le glissement demande
         un deplacement lateral continu ; la poursuite, elle, colle aux talons
         d'un joueur au lieu de viser une position figee — il faut alors
         dessiner sa trajectoire pour ne pas ramener la zone sur ses allies. */
      if (z.follow) {
        const t = this.players.get(z.follow);
        if (t && !t.downed) {
          const dx = t.x - z.x, dy = t.y - z.y;
          const d = Math.hypot(dx, dy);
          if (d > 1) {
            const step = Math.min(d, z.chase * dt);
            z.x += (dx / d) * step;
            z.y += (dy / d) * step;
          }
        }
      } else if (z.vx || z.vy) {
        z.x += z.vx * dt;
        z.y += z.vy * dt;
        // Sortie de l'arene JOUABLE et non de l'arene dessinee : pendant une
        // constriction, un disque parti dans la couronne n'a plus personne a
        // menacer et continuait pourtant de pulser dans le vide.
        if (z.x < B.x0 - z.r || z.x > B.x1 + z.r
            || z.y < B.y0 - z.r || z.y > B.y1 + z.r) { z.left = 0; z.life = 0; }
      }

      if (z.warn > 0) {
        z.warn -= dt;
        if (z.warn <= 0) {
          z.blast = 0.25;
          this._zoneApply(z, z.dmg, false);
          // Pulsation suivante : on RELANCE l'annonce sur la periode. Le client
          // lit alors un compte a rebours court au lieu d'un flash sans
          // explication, et la zone reste lisible tant qu'elle est dangereuse.
          if (z.left > 0) { z.left--; z.warn = z.period; z.warn0 = z.period; }
          // Le premier tic ne tombe pas dans la meme image que la detonation :
          // sinon entrer dans une mare a l'instant de sa pose coutait deux fois.
          else if (z.life > 0) z.tick = CFG.ZONE_TICK;
        }
        kept.push(z);
      } else if (z.life > 0) {
        z.life -= dt;
        z.blast = Math.max(0, z.blast - dt);
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = CFG.ZONE_TICK;
          this._zoneApply(z, z.dot * CFG.ZONE_TICK, true);
        }
        if (z.life > 0) kept.push(z);
      } else {
        z.blast -= dt;
        if (z.blast > 0) kept.push(z);
      }
    }
    this.zones = kept;
  }

  /* --- etats -------------------------------------------------------------------

     Deux points d'entree uniques, sur le modele exact de `_hurt()` et
     `_damage()` : tout ce qui POSE un etat passe par `_applyStatus`, tout ce
     qui en RETIRE un passe par `_purgeStatus`. Les effets, eux, se lisent la ou
     ils s'appliquent — la Vulnerabilite dans `_hurt`, l'Entrave dans
     `_players`, la Brulure dans la passe ci-dessous — et jamais ailleurs.
     ---------------------------------------------------------------------- */

  /* Une equipe a un soigneur si un joueur CONNECTE en porte la classe, qu'il
     soit a terre ou non : un soigneur au sol sera releve, la mecanique reste
     jouable. C'est la seule question que le systeme d'etats pose a la
     composition de l'equipe, et elle ne sert qu'a decider si la Sentence a le
     droit d'exister — jamais a ajuster une difficulte, ce que le depot refuse
     par principe (voir WAVE_HP_POWER_K). */
  hasHealer() {
    for (const p of this.players.values()) {
      if (classAt(p.cls).id === "soigneur") return true;
    }
    return false;
  }

  _applyStatus(p, id, stacks = 1, duration = null) {
    const def = statusAt(id);
    if (!def || !p || p.downed) return false;

    /* Sentence : elle n'apparait QUE si l'equipe compte un soigneur. Sans lui
       elle ne peut pas se purger, donc elle tue a coup sur — un etat qui ne se
       joue pas n'est pas une menace, c'est un impot. Le boss qui la porte a
       pour consigne (lot 4) de la remplacer par un gros coup encaissable sur la
       meme cible : plus honnete que d'affaiblir arbitrairement la menace. */
    if (def.lethal && !this.hasHealer()) return false;

    // « Antidote » : elle raccourcit, elle ne bloque pas. Un etat qui ne se pose
    // plus du tout ne s'apprend jamais.
    const time = (duration ?? def.time) * p.mods.statusTimeMul;
    const cur = p.statuses.get(id);
    if (cur) {
      cur.stacks = Math.min(def.stacks, cur.stacks + stacks);
      // On RAFRAICHIT sans jamais raccourcir : deux sources dont l'une est plus
      // breve ne doivent pas annuler la plus longue.
      cur.until = Math.max(cur.until, this.time + time);
    } else {
      p.statuses.set(id, {
        stacks: Math.min(def.stacks, Math.max(1, stacks)),
        until: this.time + time,
      });
    }
    return true;
  }

  /* UN SEUL etat par purge, jamais tout d'un coup, et dans un ordre fixe :
     Sentence > Brulure > Entrave > un cumul de Vulnerabilite. Sans cette regle
     les cumuls ne veulent plus rien dire et le soigneur annule mecaniquement
     tout le travail du boss — c'est exactement ce qui rend un soigneur
     obligatoire, puis odieux a jouer. Renvoie l'etat retire, ou -1. */
  _purgeStatus(p) {
    for (const id of PURGE_ORDER) {
      const st = p.statuses.get(id);
      if (!st) continue;
      // La Vulnerabilite se retire un cumul a la fois : c'est le seul etat a
      // cumuls, et le purger d'un coup effacerait la rotation qu'il cree.
      if (st.stacks > 1) st.stacks--;
      else p.statuses.delete(id);
      p.purges++;
      return id;
    }
    return -1;
  }

  /* Purification (bonus au sol). La seule source qui retire TOUT : c'est le
     filet des equipes sans soigneur, et son poids de tirage monte quand il n'y
     en a pas. Une purge complete a la portee d'un soigneur aurait rendu la
     regle d'ordre decorative. */
  _purgeAll(p) {
    if (p.statuses.size === 0) return 0;
    const n = p.statuses.size;
    p.purges += n;
    p.statuses.clear();
    return n;
  }

  _statuses(dt) {
    for (const p of this.players.values()) {
      // Fenetres de purge par insistance expirees. Le compteur appartient au
      // couple (soigneur, cible) : deux soigneurs ne s'additionnent pas, chacun
      // doit rester sur sa cible.
      for (const [id, w] of p.healHits) {
        if (this.time >= w.until) p.healHits.delete(id);
      }
      if (p.statuses.size === 0) continue;

      for (const [id, st] of p.statuses) {
        /* Brulure. Elle tique en continu plutot que par paliers, comme celle des
           ennemis : a un degat par demi-seconde on voyait la barre de vie sauter
           et l'etat passait pour un bug d'affichage. `overTime` empeche qu'elle
           ne pose un temps d'invincibilite a chaque image — voir `_hurt`. */
        if (id === STATUS_BURN) this._hurt(p, STATUS_CFG.BURN_DPS * dt, true, false, true);

        if (this.time < st.until) continue;
        p.statuses.delete(id);

        /* Sentence a echeance : on regarde les PV. Le joueur soigne a plein
           survit, les autres sont MIS A TERRE et non tues sec — un joueur tue
           net par un decompte qu'il n'a pas pu purger n'apprend rien, et la
           manche s'arrete sur une equipe qui n'a pas failli. La mise a terre,
           elle, se releve : la sanction est reelle mais la partie continue. */
        if (id === STATUS_DOOM && !p.downed) {
          if (p.hp >= p.maxHp * STATUS_CFG.DOOM_HEAL_RATIO) {
            this.effects.push({
              id: this._nextId++,
              x: p.x, y: p.y, r: 120, life: 0.6, max: 0.6, kind: 4,
            });
          } else {
            p.hp = 0;
            p.downed = true;
            p.revive = 0;
            p.deaths++;
            p.statuses.clear();
          }
        }
      }
    }
  }

  /* Purge par insistance : DEUX impacts de soin sur le meme allie en moins de
     trois secondes. Appelee depuis `_healBullet`, jamais depuis `_heal` — la
     vague de soin a sa propre purge, immediate et sur toute la zone, et compter
     ses impacts aurait fait des deux competences la meme chose. */
  _healPurgeHit(healerId, target) {
    const w = target.healHits.get(healerId);
    if (w && this.time < w.until) {
      w.n++;
      w.until = this.time + STATUS_CFG.PURGE_WINDOW;
      if (w.n >= STATUS_CFG.PURGE_HITS) {
        target.healHits.delete(healerId);
        return this._purgeStatus(target);
      }
      return -1;
    }
    target.healHits.set(healerId, { n: 1, until: this.time + STATUS_CFG.PURGE_WINDOW });
    return -1;
  }

  /* --- collisions ------------------------------------------------------------------ */

  /* Tout ce qui blesse un joueur passe par ici, et la difficulte s'applique
     ici et nulle part ailleurs : une nouvelle attaque du boss est couverte
     sans qu'on ait a y penser. La mettre aux points d'appel revenait a parier
     qu'on n'en oublierait jamais un. */
  /* `overTime` : degat CONTINU (la brulure, qui tique a chaque image). Il ne
     pose pas de temps d'invincibilite, et c'est tout l'interet du drapeau —
     avec `ignoreCooldown` seul, une brulure de cinq secondes remettait
     `hitCd` a 0,55 s soixante fois par seconde et rendait sa victime immunisee
     a tout le reste : le contact, les tirs, les zones. On brulait en securite. */
  _hurt(p, amount, ignoreCooldown = false, fromZone = false, overTime = false, mech = false) {
    if (!p || p.downed) return;
    // L'esquive traverse tout, y compris ce qui ignore le temps d'invincibilite
    // normal : c'est la seule reponse possible aux zones du boss.
    if (p.dashT > 0) return;
    /* Provocation : 1,2 s d'invulnerabilite franche, puis -50 %. La fenetre est
       volontairement plus courte qu'une annonce de boss (1,4 a 2 s) : une
       invulnerabilite qui couvre une annonce entiere fait traverser les
       mecaniques sans les lire, et l'ecart entre le joueur qui lit et celui qui
       ignore — la mesure de reference du depot — s'effondre. */
    if (p.tauntInvuln > 0) return;
    // « Talon de fer » : la fenetre s'ouvre au premier degat de zone encaisse
    // et couvre le second temps d'un damier ou d'un couloir. Elle ne protege
    // de rien d'autre — sinon la carte remplacait l'esquive.
    if (fromZone && p.timers.zoneImmune > 0) return;
    if (!ignoreCooldown && p.hitCd > 0) return;

    amount *= this.diff.dmg * p.mods.damageTakenMul;
    /* Vulnerabilite. Elle s'applique ICI et nulle part ailleurs, exactement
       comme le multiplicateur de difficulte : une nouvelle source de degats est
       ainsi couverte sans qu'on y pense, et personne n'a a se demander si telle
       attaque « compte » pour l'etat. */
    const vuln = p.statuses.get(STATUS_VULN);
    if (vuln) amount *= 1 + STATUS_CFG.VULN_PER_STACK * vuln.stacks;
    if (p.tauntT > 0) amount *= SKILL_CFG.TANK_TAUNT_REDUCTION;
    if (!overTime) p.hitCd = CFG.PLAYER_HIT_CD;

    /* « Represailles ». Elle recompense de RESTER dans la provocation une fois
       l'invulnerabilite passee, et non d'avoir appuye sur la touche : c'est la
       seule facon d'en faire une carte offensive sans annuler le risque qu'elle
       est censee faire prendre. Elle passe par l'onde blanche des cartes, donc
       par `_damage` — vol de vie et comptage compris. */
    if (p.tauntT > 0 && p.mods.represailles > 0) {
      this._wave(p.x, p.y, CARD_CFG.REPRESAILLES_RADIUS,
        p.mods.represailles * p.mods.damageMul, p.id);
    }
    p.timers.shieldRegen = CARD_CFG.SHIELD_REGEN_DELAY;
    if (fromZone && p.mods.zoneImmunity > 0) p.timers.zoneImmune = p.mods.zoneImmunity;

    if (p.mods.counterNova > 0 && p.timers.counter <= 0) {
      p.timers.counter = CARD_CFG.COUNTER_CD;
      this._wave(p.x, p.y, CARD_CFG.COUNTER_RADIUS,
        p.mods.counterNova * p.mods.damageMul, p.id);
    }

    /* Sanction d'echec de mecanique : elle MET A TERRE, elle ne tue jamais
       sechement un joueur a pleine vie. Le plafond est ici et non au point
       d'appel, pour la meme raison que le multiplicateur de difficulte : une
       nouvelle mecanique est couverte sans qu'on y pense.

       Il ne rend pas la Vulnerabilite decorative — elle continue de multiplier
       les degats de tout le reste, et surtout du SECOND echec, qui trouve un
       joueur qui n'est plus a pleine vie. C'est la progression de la sanction
       par l'etat, exactement ce que le lot demande. */
    if (mech && p.hp >= p.maxHp - 0.5 && p.shield <= 0) {
      amount = Math.min(amount, p.hp - 1);
      if (amount <= 0) return;
    }

    // Le bouclier encaisse d'abord, jusqu'a epuisement de sa reserve
    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, amount);
      p.shield -= absorbed;
      amount -= absorbed;
      if (amount <= 0) return;
    }

    p.hp -= amount;

    /* Instinct de survie. Il reutilise le ralentissement global des bonus au
       sol au lieu d'un ralentissement propre : le joueur connait deja l'effet
       et son indicateur, et une seconde teinte d'ecran pour la meme idee
       n'aurait rien appris a personne. */
    if (p.hp > 0 && p.mods.instinctCd > 0 && p.timers.instinct <= 0
        && p.hp <= p.maxHp * CARD_CFG.INSTINCT_HP) {
      p.timers.instinct = p.mods.instinctCd;
      this.slow = Math.max(this.slow, CARD_CFG.INSTINCT_TIME);
    }

    if (p.hp <= 0) {
      p.hp = 0;

      // « Second souffle » : une fois par manche, on ne tombe pas. Le compteur
      // de morts ne bouge pas non plus — la mise a terre n'a pas eu lieu.
      if (p.mods.selfRevive && !p.selfReviveUsed) {
        p.selfReviveUsed = 1;
        p.hp = 30;
        p.hitCd = CFG.PLAYER_HIT_CD;
        this.effects.push({
          id: this._nextId++,
          x: p.x, y: p.y, r: 110, life: 0.6, max: 0.6, kind: 4,
        });
        return;
      }

      if (this._guardian(p)) return;

      p.downed = true;
      p.revive = 0;
      p.deaths++;
    }
  }

  /* Ange gardien : un allie porteur de la carte, assez proche, releve d'office.
     La verification se fait avant de marquer la mise a terre — sinon le joueur
     voyait son compteur de morts monter pour une chute qui n'a jamais eu lieu,
     et l'effet passait pour une reanimation tres rapide. */
  _guardian(p) {
    for (const o of this.players.values()) {
      if (o.id === p.id || o.downed) continue;
      if (o.mods.guardianCd <= 0 || o.timers.guardian > 0) continue;
      const r = CARD_CFG.GUARDIAN_RADIUS;
      if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 > r * r) continue;

      o.timers.guardian = o.mods.guardianCd;
      p.hp = Math.round(p.maxHp * Math.max(CFG.REVIVE_HP_RATIO, o.mods.reviveHpRatio));
      p.hitCd = CFG.PLAYER_HIT_CD;
      this.effects.push({
        id: this._nextId++,
        x: p.x, y: p.y, r: 130, life: 0.7, max: 0.7, kind: 4,
      });
      return true;
    }
    return false;
  }

  /* Une balle touche un ennemi. Extrait de `_collisions` pour devenir le POINT
     DE PASSAGE UNIQUE de l'impact balle / ennemi : le balayage a l'apparition
     (`_spawnSweep`) doit appliquer exactement les memes regles — grenade,
     chaine de foudre, ricochet, inertie, perforation — sinon une balle qui
     touche a bout portant se comporte differemment d'une balle qui touche a
     dix metres, ce qui est indefendable et se paierait a la premiere carte
     ajoutee.

     `ix`/`iy` est le point d'IMPACT et non la position de la balle : pour la
     grenade, les deux different quand la touche est detectee sur un segment.
     Rend vrai si la balle est consommee. */
  _bulletHitEnemy(b, e, ix, iy) {
    if (b.boom > 0) {
      this._explode(ix, iy, b.boom, b.owner);
      return true;
    }

    this._damage(e, b.dmg, b.owner, b.burn);
    // La chaine de foudre part de l'impact, le ricochet du kill : deux
    // cartes qui se ressemblent a l'ecran mais pas dans la main.
    if (b.arc > 0 && Math.random() < b.arc) this._arc(e, b.dmg, b.owner);
    if (e.hp <= 0 && b.chain > 0) this._ricochet(e, b);

    /* « Inertie » : la balle ne s'arrete pas, elle s'use. Le plancher
       n'est pas cosmetique — sans lui, une balle a 0,1 degat restait en
       vol a se tester contre les 200 ennemis de l'arene a chaque tick
       jusqu'a expiration, et le cout CPU montait avec la densite,
       c'est-a-dire au pire moment. */
    if (b.inertia) {
      b.dmg *= CARD_CFG.INERTIA_DECAY;
      if (b.dmg < b.dmg0 * CARD_CFG.INERTIA_MIN_MUL) return true;
    }

    // Une balle perforante continue sa route en decomptant ses charges
    if (b.pierce > 0) {
      b.pierce--;
      if (b.hits) b.hits.add(e.id); else b.hit = e.id;
      return false;
    }
    return true;
  }

  /* Balayage a l'APPARITION. Filet de securite du correctif de l'ennemi colle :
     la balle nait a PLAYER_RADIUS + 2 du centre, donc tout ce qui se trouve
     entre le joueur et ce point n'a jamais ete teste — la balle commence sa vie
     de l'autre cote de sa cible et s'en eloigne.

     La separation ennemi / joueur vide normalement ce disque ; ce balayage
     couvre ce qui y entrerait quand meme, et c'est de toute facon la bonne
     correction pour toute apparition decalee (un canon, un drone) que le depot
     pourrait ajouter plus tard.

     On teste le SEGMENT centre du joueur -> point d'apparition, dans l'ordre
     ou la balle le parcourt : sinon une balle perforante depenserait sa charge
     sur l'ennemi le plus lointain du segment. Rend vrai si la balle est
     consommee avant meme d'avoir vole. */
  _spawnSweep(b, px, py) {
    const sx = b.x - px, sy = b.y - py;
    const len2 = sx * sx + sy * sy;
    if (len2 <= 0) return false;

    // Candidats seulement : zero a trois ennemis dans les seize pixels autour
    // du joueur, la boucle de tri ne coute donc rien.
    const near = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const rr = e.r + CFG.BULLET_RADIUS;
      const t = Math.max(0, Math.min(1, ((e.x - px) * sx + (e.y - py) * sy) / len2));
      const cx = px + sx * t - e.x, cy = py + sy * t - e.y;
      if (cx * cx + cy * cy <= rr * rr) near.push({ e, t });
    }
    if (near.length === 0) return false;
    near.sort((a, c) => a.t - c.t);

    for (const { e, t } of near) {
      if (e.hp <= 0) continue;
      if (b.hits ? b.hits.has(e.id) : b.hit === e.id) continue;
      if (this._bulletHitEnemy(b, e, px + sx * t, py + sy * t)) return true;
    }
    return false;
  }

  _collisions() {
    // balles du joueur contre le boss et les ennemis
    const live = [];
    for (const b of this.bullets) {
      let hit = false;

      /* Les projectiles de soin sortent tout de suite de la boucle de degats :
         ils ne blessent rien, mais ils testent les JOUEURS, ce qu'aucune autre
         balle ne fait. Restreindre le test aux seuls projectiles du soigneur en
         mode soin evite de le payer sur les quatre cents balles en vol d'une
         fin de manche. */
      if (b.heal > 0) {
        if (!this._healBullet(b)) live.push(b);
        continue;
      }

      for (const boss of this._bossTargets()) {
        if (hit) break;
        if (b.hits ? b.hits.has(boss.id) : b.hit === boss.id) continue;
        const rr = CFG.BOSS_RADIUS + CFG.BULLET_RADIUS;
        if ((b.x - boss.x) ** 2 + (b.y - boss.y) ** 2 <= rr * rr) {
          if (b.boom > 0) {
            this._explode(b.x, b.y, b.boom, b.owner);
            hit = true;
          } else {
            this._damage(boss, b.dmg, b.owner, b.burn);
            if (b.pierce > 0) {
              b.pierce--;
              if (b.hits) b.hits.add(boss.id); else b.hit = boss.id;
            } else {
              hit = true;
            }
          }
        }
      }

      /* Cages et grappes. Elles ne sont pas des ennemis : un ennemi immobile,
         sans degat de contact, qui ne compte pas pour « arene vide » et qui ne
         doit rien rapporter au score aurait demande autant d'exceptions qu'il
         y a de systemes. Le test ne coute que sur les zero a trois marqueurs
         destructibles presents pendant un combat de boss. */
      if (!hit && this.marks.length) {
        for (const m of this.marks) {
          if (m.dead || m.maxHp <= 0) continue;
          const rr = m.r + CFG.BULLET_RADIUS;
          if ((b.x - m.x) ** 2 + (b.y - m.y) ** 2 > rr * rr) continue;
          if (b.boom > 0) { this._explode(b.x, b.y, b.boom, b.owner); hit = true; break; }
          m.hp -= b.dmg;
          if (m.hp <= 0) this._breakMark(m);
          if (b.pierce > 0) b.pierce--; else hit = true;
          break;
        }
      }

      if (!hit) {
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (b.hits ? b.hits.has(e.id) : b.hit === e.id) continue;   // deja traverse celui-la
          const rr = e.r + CFG.BULLET_RADIUS;
          if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 > rr * rr) continue;
          hit = this._bulletHitEnemy(b, e, b.x, b.y);
          break;
        }
      }
      if (!hit) live.push(b);
    }
    this.bullets = live;
    this.enemies = this.enemies.filter(e => e.hp > 0);

    // contact ennemi / joueur
    for (const p of this.players.values()) {
      if (p.downed) continue;
      for (const e of this.enemies) {
        const rr = e.r + CFG.PLAYER_RADIUS;
        if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 <= rr * rr) {
          this._hurt(p, ENEMY_TYPES[e.type].dmg);
          /* Les elites appliquent leur etat AU CONTACT. C'est ce qui leur donne
             enfin une raison d'etre traitees en priorite plutot que contournees.
             La recharge par elite existe parce qu'une elite collee a sa cible
             reposait son etat soixante fois par seconde ; et l'esquive protege
             de l'etat comme elle protege des degats, sinon elle cesserait
             d'etre la reponse a tout. */
          if (e.elite && e.statusAt <= this.time && p.dashT <= 0 && p.tauntInvuln <= 0) {
            const id = ELITE_STATUS[ENEMY_TYPES[e.type].key];
            if (id !== undefined) {
              e.statusAt = this.time + STATUS_CFG.ELITE_STATUS_CD;
              this._applyStatus(p, id);
            }
          }
          break;
        }
      }
      for (const boss of this._bossTargets()) {
        const rr = CFG.BOSS_RADIUS + CFG.PLAYER_RADIUS;
        if ((p.x - boss.x) ** 2 + (p.y - boss.y) ** 2 > rr * rr) continue;
        this._hurt(p, CFG.BOSS_CONTACT_DAMAGE);
        /* Jumeaux : chacun applique SON etat au contact — Brulure d'un cote,
           Entrave de l'autre. Porter les deux fait exploser (voir `_twins`),
           c'est ce qui interdit de les traiter ensemble. La recharge est celle
           du joueur et non celle du boss : deux Jumeaux colles a deux joueurs
           differents doivent pouvoir marquer les deux. */
        if (boss.status !== undefined && p.twinCd <= this.time
            && p.dashT <= 0 && p.tauntInvuln <= 0) {
          p.twinCd = this.time + BOSS_CFG.TWIN_STATUS_CD;
          this._applyStatus(p, boss.status);
        }
        break;
      }
    }

    // projectiles ennemis contre joueurs
    const keptShots = [];
    const puddles = this._puddlesActive();
    for (const s of this.shots) {
      let hit = false;
      for (const p of this.players.values()) {
        if (p.downed) continue;
        const rr = CFG.PLAYER_RADIUS + CFG.SHOT_RADIUS;
        if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 <= rr * rr) {
          this._hurt(p, CFG.SHOT_DAMAGE);
          hit = true;
          break;
        }
      }
      if (!hit) keptShots.push(s);
      else if (puddles) this._puddle(s.x, s.y);
    }
    this.shots = keptShots;
  }

  /* Chaine de ricochet. Le piege est la boucle infinie : sans memoire des
     ennemis deja touches, deux voisins se renvoient l'arc indefiniment. On
     garde donc la liste des cibles de la chaine, et les degats decroissent a
     chaque saut pour que la portee reste une decision et pas une evidence. */
  _ricochet(origin, b) {
    const seen = new Set([origin.id]);
    let src = origin;
    let dmg = b.dmg * CFG.RICOCHET_MUL;

    for (let i = 0; i < b.chain; i++) {
      let best = null, bestD = CFG.RICOCHET_RADIUS * CFG.RICOCHET_RADIUS;
      for (const e of this.enemies) {
        if (e.hp <= 0 || seen.has(e.id)) continue;
        const d = (e.x - src.x) ** 2 + (e.y - src.y) ** 2;
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) break;

      seen.add(best.id);
      this.effects.push({
        id: this._nextId++,
        x: src.x, y: src.y, x2: best.x, y2: best.y,
        r: 0, life: 0.22, max: 0.22, kind: 3,
      });

      this._damage(best, dmg, b.owner);
      src = best;
      dmg *= CFG.RICOCHET_MUL;
    }
  }

  /* --- progression ------------------------------------------------------------ */

  /* Un kill credite le tueur et peut declencher plusieurs paliers d'un coup :
     une nova qui balaie l'ecran doit pouvoir faire monter de deux niveaux. */
  _credit(owner, score) {
    // L'experience est versee que le kill soit attribue ou non : une mort par
    // brulure sans proprietaire, ou le kill d'un joueur deconnecte entre-temps,
    // faisait autrement disparaitre de la progression commune.
    this._addXp(1);
    if (!owner) return;
    owner.kills++;
    owner.score += Math.round(score * owner.mods.scoreMul);

    /* Surcharge : le bonus MONTE a chaque kill pendant la fenetre. C'est ce qui
       la sauve du bouton sans decision — declenchee au creux d'une vague elle
       est mediocre, declenchee au pic elle est spectaculaire. Le tireur doit
       lire le rythme de la vague, comme le tank lit les regroupements. */
    if (owner.odT > 0) {
      owner.odBonus = Math.min(SKILL_CFG.DPS_OVERDRIVE_MAX,
        owner.odBonus + SKILL_CFG.DPS_OVERDRIVE_PER_KILL);
    }
  }

  /* Jauge commune. Un palier franchi ne donne RIEN d'autre qu'un choix de carte
     mis en file : ni degats, ni PV, ni soin. Le choix se consomme a la fin de
     la vague, pas ici — voir _endWave. */
  _addXp(amount) {
    // Normalisation sur l'effectif : voir le commentaire de LEVEL_KILLS_BASE.
    // Sans elle, quatre joueurs franchissaient les paliers 2,8 fois plus vite
    // qu'un seul pour des vagues identiques.
    this.xp += amount / Math.pow(Math.max(1, this.players.size), CFG.WAVE_CROWD_EXP);

    while (this.level < CFG.LEVEL_MAX && this.xp >= this.levelAt) {
      this.level++;
      this.pendingLevels++;
      this.levelFrom = this.levelAt;
      this.levelStep = Math.round(this.levelStep * CFG.LEVEL_KILLS_GROWTH * this._xpCostMul());
      this.levelAt = this.levelFrom + this.levelStep;

      // L'onde de montee de niveau part du centre de l'arene et non d'un
      // joueur : la jauge n'appartient plus a personne en particulier.
      this.effects.push({
        id: this._nextId++,
        x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2,
        r: 78,
        life: 0.55, max: 0.55,
        kind: 2,
      });
    }
  }

  /* Surcout de « Dette ». Le PLUS ELEVE de la table, jamais le cumul : a quatre
     joueurs, deux Dette auraient multiplie le cout par 1,44 et trois par 1,73,
     ce qui bloquait la progression de toute l'equipe pour un choix que trois
     joueurs sur quatre n'avaient pas fait. Le cout reste celui du joueur le
     plus endette — il engage le groupe, il ne le condamne pas. */
  _xpCostMul() {
    let worst = 1;
    for (const p of this.players.values()) {
      if (p.mods.xpCostMul > worst) worst = p.mods.xpCostMul;
    }
    return worst;
  }

  _killEnemy(e, ownerId) {
    this.totalKills++;
    const def = ENEMY_TYPES[e.type];
    const owner = this.players.get(ownerId);
    this._credit(owner, e.elite ? Math.round(def.score * CFG.ELITE_SCORE_MUL) : def.score);

    if (owner) {
      // Frenesie : la cadence monte kill apres kill et retombe des qu'on
      // arrete. C'est la seule carte qui recompense le fait de rester dans la
      // masse plutot que de la fuir.
      if (owner.mods.frenzy) {
        const cap = Math.round(CARD_CFG.FRENZY_MAX / CARD_CFG.FRENZY_STEP);
        owner.frenzyStacks = Math.min(cap, owner.frenzyStacks + 1);
        owner.timers.frenzy = CARD_CFG.FRENZY_DECAY;
      }

      if (owner.mods.harvest > 0 && Math.random() < owner.mods.harvest) {
        // `_dropPoint` et non les dimensions de l'arene : un ennemi tue dans la
        // couronne pendant une constriction laissait son fragment hors des
        // limites, donc inatteignable.
        const pt = this._dropPoint(e.x, e.y);
        this.powerups.push({
          id: this._nextId++,
          type: POWERUP_TYPES.indexOf("fragment"),
          x: pt.x, y: pt.y,
          life: CFG.POWERUP_LIFE,
        });
      }

      /* L'onde de mort ne se rappelle pas elle-meme : une nuee dense partait
         sinon en reaction en chaine sur toute l'arene, avec une pile d'appels
         de deux cents niveaux et une manche gagnee par une seule balle. */
      if (owner.mods.deathWave > 0 && !this._inWave) {
        this._inWave = true;
        this._wave(e.x, e.y, CARD_CFG.DEATHWAVE_RADIUS,
          owner.mods.deathWave * owner.mods.damageMul, ownerId);
        this._inWave = false;
      }
    }

    /* Une elite laisse toujours un bonus, et il sort meme si le sol est deja
       plein : le plafond est la pour brider la pluie automatique, pas pour
       annuler une recompense qu'on est alle chercher. */
    if (e.elite) {
      const pt = this._dropPoint(e.x, e.y);
      this.powerups.push({
        id: this._nextId++,
        type: this._randomPowerupType(),
        x: pt.x, y: pt.y,
        life: CFG.POWERUP_LIFE,
      });
      this.effects.push({
        id: this._nextId++,
        x: e.x, y: e.y, r: 90, life: 0.5, max: 0.5, kind: 5,
      });
    }

    // Les pondeuses liberent une nuee de rapides en mourant
    if (def.splits) {
      for (let i = 0; i < def.splits; i++) {
        const a = Math.random() * Math.PI * 2;
        this._spawnEnemy(1, e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22);
      }
    }
  }

  _killBoss(ownerId) {
    this._credit(this.players.get(ownerId), 500);
    this.totalKills++;
    this.boss = null;
    this.boss2 = null;
    this.shots = [];
    this.zones = [];
    /* Tout ce que les mecaniques ont pose meurt avec lui : une cage qui survit
       au combat garde son prisonnier immobile pendant la vague suivante, et un
       marqueur de tour sans boss pour le resoudre ne disparaitrait jamais. */
    this.marks = [];
    this.slipT = 0;
    /* L'arene revient a sa taille pleine et les murs tombent. Une constriction
       qui survit au combat rend TOUTES les vagues suivantes injouables — la
       horde continue d'apparaitre sur les bords de l'arene dessinee et meurt
       dans la couronne avant d'arriver. */
    this.bounds = { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H };
    this.shrink = null;
    this.walls = null;
    this.puddleSeen = false;
    for (const p of this.players.values()) { p.jailed = 0; p.trail.length = 0; }
    // Respiration apres le combat : tout le monde recupere un peu
    for (const p of this.players.values()) {
      if (!p.downed) p.hp = Math.min(p.maxHp, p.hp + 40 + p.mods.healPerBoss);
    }

    /* Plus de pause de choix ICI. Les cartes ne tombent plus a la mort d'un
       boss mais a la fin de la vague, et seulement s'il reste des niveaux en
       attente — sans quoi la vague de boss aurait ouvert deux ecrans d'affilee,
       le sien et celui de la fin de vague. La mort du boss vide l'arene, ce qui
       termine la vague au tick suivant : c'est _endWave qui decide. */
  }

  /* --- reanimation -------------------------------------------------------------------- */

  _revive(dt) {
    for (const p of this.players.values()) {
      if (!p.downed) continue;

      /* Le rayon, la vitesse et les PV rendus sont ceux du SAUVETEUR, pas du
         joueur a terre : c'est lui qui a pris la carte, et c'est ce qui rend
         les cartes cooperatives visibles a la table — on voit qui releve vite. */
      let rate = 0;
      let ratio = CFG.REVIVE_HP_RATIO;
      for (const o of this.players.values()) {
        if (o.id === p.id || o.downed) continue;
        const r = CFG.REVIVE_RADIUS * o.mods.reviveRadiusMul;
        if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 > r * r) continue;
        rate += o.mods.reviveSpeedMul;
        if (o.mods.reviveHpRatio > ratio) ratio = o.mods.reviveHpRatio;
      }

      if (rate > 0) {
        // Plusieurs sauveteurs relevent plus vite : a deux, deux fois plus
        // vite. Ca recompense le regroupement au pire moment.
        p.revive += dt * rate;
        if (p.revive >= CFG.REVIVE_TIME) {
          p.downed = false;
          p.hp = Math.round(p.maxHp * ratio);
          p.revive = 0;
          p.hitCd = CFG.PLAYER_HIT_CD;
        }
      } else {
        p.revive = Math.max(0, p.revive - dt * CFG.REVIVE_DECAY);
      }
    }
  }

  _nearestPlayer(x, y) {
    /* Provocation. Un seul test par ennemi et par image, contre un etat global :
       une cible stockee sur chacun des 200 ennemis aurait coute un champ de plus
       dans la simulation et dans le snapshot pour une information qui ne dure
       que cinq secondes. Le rayon se mesure depuis la position du LANCER : sont
       provoques ceux qui etaient dans la zone a ce moment-la, ce qui rend la
       competence lisible — le tank voit qui il a pris. */
    if (this.taunt) {
      const r = SKILL_CFG.TANK_TAUNT_RADIUS;
      if ((x - this.taunt.x) ** 2 + (y - this.taunt.y) ** 2 <= r * r) {
        const tank = this.players.get(this.taunt.id);
        if (tank && !tank.downed) return tank;
      }
    }

    let best = null, bestD = Infinity;
    for (const p of this.players.values()) {
      if (p.downed) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best) for (const p of this.players.values()) return p;
    return best;
  }

  /* --- serialisation ------------------------------------------------------------------- */

  _statusMask(p) {
    let mask = 0;
    for (const id of p.statuses.keys()) mask |= statusBit(id);
    return mask;
  }

  snapshot() {
    const r1 = v => Math.round(v * 10) / 10;
    const r2 = v => Math.round(v * 100) / 100;

    /* Les ZEROS DE QUEUE sont coupes. La regle positionnelle interdit de
       deplacer un champ, pas d'en omettre a la fin : le client lit deja tout ce
       qui suit l'index 6 avec un repli (`a[7] ?? 0`), exactement le mecanisme
       qui fait qu'un onglet reste sur une version anterieure ne plante pas. Un
       tuple de zone en compte quinze et la plupart des formes n'en remplissent
       que douze — un damier de douze cases economise ainsi trente-six nombres
       par instantane, vingt fois par seconde.

       `keep` est le nombre de champs INTOUCHABLES : ceux que le client lit sans
       valeur de repli. Pour une zone c'est les six premiers (identifiant,
       position, rayon, annonce, souffle) — une zone posee sans annonce les aurait
       tous vus disparaitre, et le client aurait dessine un `undefined`. */
    const trimTail = (a, keep) => {
      let n = a.length;
      while (n > keep && !a[n - 1]) n--;
      return n === a.length ? a : a.slice(0, n);
    };

    return {
      t: "state",
      tm: r2(this.time),
      ov: this.gameOver ? 1 : 0,
      k: this.totalKills,
      p: [...this.players.values()].map(p => [
        p.id, r1(p.x), r1(p.y), Math.round(p.hp), p.downed ? 1 : 0,
        r2(p.revive), r2(p.aimX), r2(p.aimY), p.kills,
        (p.buffDamage > 0 ? BUFF_DAMAGE : 0)
          | (p.buffRate > 0 ? BUFF_RATE : 0)
          | (p.buffDouble > 0 ? BUFF_DOUBLE : 0)
          | (p.buffPierce > 0 ? BUFF_PIERCE : 0)
          | (p.buffRicochet > 0 ? BUFF_RICOCHET : 0),
        p.score, p.deaths, Math.round(p.shield),
        /* Les emplacements 13 et 15 gardent leur POSITION et leur sens
           d'affichage (niveau, avancee dans le palier) mais portent desormais
           les valeurs de l'equipe : la jauge est commune. Les remplir plutot
           que de les vider evite de decaler tout ce qui suit, et un onglet
           reste sur une version anterieure continue d'afficher une barre juste
           — simplement la meme pour tout le monde. */
        this.level, Math.round(p.maxHp),
        this.level >= CFG.LEVEL_MAX
          ? 1
          : r2(Math.min(1, (this.xp - this.levelFrom) / Math.max(1, this.levelAt - this.levelFrom))),
        r2(p.dashCd), p.dashT > 0 ? 1 : 0,
        // Ajouts en fin de tableau, jamais au milieu : un onglet reste sur une
        // version anterieure continue de lire les champs qu'il connait. Les
        // orbiteurs ne transportent que leur nombre — leur angle se deduit du
        // temps de manche, deja present dans le snapshot.
        p.mods.orbiters, Math.round(p.mods.frostRadius),
        /* Classe et competences, toujours en fin de tableau. Les trois etats
           visibles tiennent dans un seul masque : mode soin, provocation,
           surcharge. Un champ par etat aurait coute trois nombres par joueur et
           par instantane pour la meme information. */
        p.cls,
        r1(p.cd1), r1(p.cd2),
        (p.healMode ? SKILL_HEAL_MODE : 0)
          | (p.tauntT > 0 ? SKILL_TAUNT : 0)
          | (p.odT > 0 || p.odBonus > 0 ? SKILL_OVERDRIVE : 0),
        p.bombStock,
        /* Etats. Trois nombres, toujours en fin de tableau : le masque des etats
           actifs, les cumuls de Vulnerabilite, et le decompte de Sentence au
           dixieme. On ne transmet PAS la duree des autres : l'icone suffit, et
           trois nombres par joueur restent negligeables la ou une duree par etat
           en aurait coute quatre de plus. La Sentence fait exception parce que
           le decompte EST l'information — c'est l'urgence absolue du jeu. */
        this._statusMask(p),
        p.statuses.get(STATUS_VULN)?.stacks ?? 0,
        r1(Math.max(0, (p.statuses.get(STATUS_DOOM)?.until ?? 0) - this.time)),
        /* Degats cumules depuis le debut de la manche. En fin de tableau comme
           tout le reste, et c'est le seul chiffre de la fenetre de build que le
           client ne peut pas deduire : les projectiles ne portent pas leur
           proprietaire. Quatre nombres par instantane la ou la liste d'ennemis
           en compte seize cents — la fenetre s'ouvre EN JEU, sur soi comme sur
           un allie, et sans lui elle aurait affiche un tiret au moment ou l'on
           veut justement comprendre qui porte l'equipe. */
        Math.round(p.damageDealt),
      ]),
      /* Le rang d'elite voyage dans le champ de type (+100) : un drapeau separe
         aurait coute un nombre de plus sur chacun des 200 ennemis. Le marquage
         de retardataire s'y ajoute (+200) pour la meme raison — un huitieme
         element paye sur tous les ennemis, vingt fois par seconde, pour une
         information qui ne concerne que les dernieres secondes d'une vague.
         Decodage cote client : type = a[5] % 100, elite = a[5] % 200 >= 100,
         retardataire = a[5] >= 200. */
      /* Huitieme element, AJOUT EN FIN de tuple : le compteur de touches. C'est
         le seul chiffre du retour d'impact que le client ne peut pas deduire —
         a 20 Hz, deux a quatre balles tombent entre deux instantanes et une
         variation de PV n'en montre qu'une. Un CHIFFRE de plus par ennemi, soit
         +6,2 % de poids d'instantane arene pleine, pire cas ou tous ont deja ete
         touches ; la mesure est au LISEZMOI. Un onglet reste sur une version
         anterieure lit un tuple de sept et retombe sur l'ancien comportement,
         degrade mais correct.

         Le compteur est COUPE quand il vaut zero, comme les zeros de queue des
         zones : la majorite des ennemis presents a un instant donne n'ont jamais
         ete touches — on meurt en une ou deux balles — et ils ne paient donc
         rien. `keep` vaut 7 et non 6 : le client lit `a[6]` (l'orientation) sans
         valeur de repli, et une orientation nulle est parfaitement ordinaire. */
      e: this.enemies.map(e => trimTail([e.id, r1(e.x), r1(e.y), Math.round(e.hp), Math.round(e.maxHp),
                                e.type + (e.elite ? 100 : 0) + (e.straggler ? 200 : 0),
                                r2(e.ang), e.hitSeq], 7)),
      // Quatrieme element : projectile de soin. Ajout en fin de tuple, repli 0
      // cote client — la balle reste dessinee, simplement dans la couleur du
      // tir normal sur un onglet reste en arriere.
      b: this.bullets.map(b => [b.id, r1(b.x), r1(b.y), b.heal > 0 ? 1 : 0]),
      s: this.shots.map(s => [s.id, r1(s.x), r1(s.y)]),
      /* Trois ajouts EN FIN de tuple (lot 5), jamais au milieu : l'ouverture
         angulaire des formes 3 et 4, le temps de persistance restant, et le
         drapeau de proximite. Un onglet reste sur une version anterieure lit un
         tableau plus court, retombe sur `spread: 0` et `life: 0`, et dessine
         donc les nouvelles formes comme des disques annonces — degrade, mais
         jamais mensonger sur la position du danger. */
      z: this.zones.map(z => trimTail([
        z.id, r1(z.x), r1(z.y), Math.round(z.r), r2(z.warn), r2(z.blast),
        z.shape ?? 0, Math.round(z.w ?? 0), Math.round(z.h ?? 0),
        r2(z.ang ?? 0), Math.round(z.hole ?? 0), r2(z.warn0 ?? CFG.ZONE_WARN),
        r2(z.spread ?? 0), r2(z.life ?? 0), z.prox ? 1 : 0], 6)),
      /* Marqueurs de mecanique de groupe. Cle NOMMEE, comme les remparts : la
         regle positionnelle ne vaut qu'a l'interieur des tableaux, et un onglet
         reste sur une version anterieure ignore simplement la liste — il joue
         alors sans voir les cercles, ce qui est degrade mais jamais mensonger.
         `hp` voyage en RATIO : le client n'affiche qu'une jauge, la valeur
         brute d'une cage ne lui apprendrait rien. */
      mk: this.marks.map(m => [m.id, r1(m.x), r1(m.y), Math.round(m.r),
                               r2(m.max > 0 ? Math.max(0, m.t) / m.max : 0), m.mech,
                               m.a, m.b, m.need, m.cur,
                               r2(m.maxHp > 0 ? Math.max(0, m.hp) / m.maxHp : 0)]),
      w: this.powerups.map(w => [w.id, r1(w.x), r1(w.y), w.type]),
      tu: this.turrets.map(t => [t.id, r1(t.x), r1(t.y), r2(t.life / CFG.TURRET_LIFE), r2(t.ang)]),
      // Remparts et bombes : deux listes nouvelles, donc des cles nommees. Un
      // client plus ancien les ignore et joue sans les voir, ce qui reste
      // correct — aucune des deux ne le fait mentir sur l'etat du jeu.
      bw: this.bulwarks.map(b => [b.id, r1(b.x), r1(b.y), Math.round(b.r), r2(b.life / b.max)]),
      // Le point de chute est AJOUTE EN FIN de tuple, comme partout : un onglet
      // reste sur une version anterieure lit les quatre premiers champs et
      // dessine la bombe sans son cercle d'atterrissage.
      bm: this.bombs.map(b => [b.id, r1(b.x), r1(b.y), r2(b.t / b.max), r1(b.tx), r1(b.ty)]),
      // Les drones detruits ne sont pas transmis : ils n'existent plus a
      // l'ecran, seul leur retour compte et il se voit tout seul.
      dr: this.drones.filter(d => d.dead <= 0)
        .map(d => [d.id, r1(d.x), r1(d.y), r2(d.ang), d.kind, d.owner]),
      // les segments de chaine trainent deux points de plus ; les autres
      // effets ne paient pas ce supplement
      f: this.effects.map(f => f.kind === 3
        ? [f.id, r1(f.x), r1(f.y), 0, r2(f.life / f.max), 3, r1(f.x2), r1(f.y2)]
        : [f.id, r1(f.x), r1(f.y), Math.round(f.r), r2(f.life / f.max), f.kind ?? 0]),
      sl: this.slow > 0 ? 1 : 0,
      df: this.diffIndex,
      /* Vague et progression commune. Ce sont des cles NOMMEES du snapshot et
         non des elements de tableau : la regle positionnelle ne vaut qu'a
         l'interieur des tableaux, une cle inconnue est simplement ignoree par
         un client plus ancien. `wp` : 0 apparition, 1 nettoyage, 2 repit.
         `wb` est l'avancement du budget, deja calcule ici pour que le client
         n'ait pas a connaitre la formule. */
      wv: this.wave,
      wp: this.wavePhase,
      wbs: this.waveBoss ? 1 : 0,
      wb: this.waveBudget > 0 ? r2(Math.min(1, this.waveSpawned / this.waveBudget)) : 1,
      xl: this.level,
      xp: this.level >= CFG.LEVEL_MAX
        ? 1
        : r2(Math.min(1, (this.xp - this.levelFrom) / Math.max(1, this.levelAt - this.levelFrom))),
      /* Ajouts EN FIN de tuple, comme partout : l'index du roster et la jauge
         d'ultime. Un onglet reste sur une version anterieure lit un tableau
         plus court, retombe sur le Ravageur et ne dessine pas la jauge — il ne
         plante pas et ne ment sur rien d'essentiel. */
      bo: this.boss
        ? [this.boss.id, r1(this.boss.x), r1(this.boss.y),
           Math.round(this.boss.hp), Math.round(this.boss.maxHp),
           r2(this.boss.ang), this.bossCount,
           this.boss.bars, this.boss.phase,
           this.boss.kind, r2(this.boss.ult)]
        : null,
      /* Second Jumeau. Cle nommee et non un second element de `bo` : c'est un
         cas qui ne concerne qu'un boss sur cinq, et le tuple principal aurait
         porte neuf zeros pour les quatre autres. Il n'a ni PV ni barres — la
         reserve est commune, `bo` en reste la source de verite. */
      bo2: this.boss2
        ? [this.boss2.id, r1(this.boss2.x), r1(this.boss2.y), r2(this.boss2.ang)]
        : null,
      /* Degats portes au boss depuis le dernier instantane. Cle NOMMEE et
         absente hors combat : quatre paires de nombres pendant un combat de
         boss, rien du tout le reste du temps. Chaque client n'y lit QUE sa
         propre ligne — les chiffres des autres n'apprennent rien et
         rempliraient l'ecran au moment ou il faut le lire. */
      bd: this.boss && this.bossDmg.size > 0
        ? [...this.bossDmg].map(([id, d]) => [id, Math.round(d)])
        : null,
      sp: this.slipT > 0 ? 1 : 0,
      /* Arene mobile (lot 5). Cles NOMMEES, et absentes tant que rien ne bouge
         — c'est le cas de quatre-vingt-dix pour cent d'une manche, et payer
         huit nombres par instantane pour dire « l'arene fait toujours sa
         taille » ne se justifie pas.

         `bn` porte les limites courantes ET le palier annonce : le client doit
         pouvoir dessiner la couronne qui VA devenir mortelle, sinon la
         constriction se subit au lieu de se lire. */
      bn: this.bounds.x0 > 0 || this.bounds.y0 > 0 || this.shrink
        ? [r1(this.bounds.x0), r1(this.bounds.y0), r1(this.bounds.x1), r1(this.bounds.y1),
           this.shrink ? r1(this.shrink.x0) : 0, this.shrink ? r1(this.shrink.y0) : 0,
           this.shrink ? r1(this.shrink.x1) : 0, this.shrink ? r1(this.shrink.y1) : 0,
           this.shrink ? r2(this.shrink.t) : 0]
        : null,
      wl: this.walls
        ? [r1(this.walls.x), r1(this.walls.y), BOSS_CFG.QUAD_THICK,
           r2(this.walls.t / this.walls.max)]
        : null,
    };
  }
}
