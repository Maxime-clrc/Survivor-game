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
import { PROG_CFG, applyMeta } from "./progression.js";
import { RELICS, RELIC_CFG, RELIC_RARITY, relicById, relicPrice, relicRerollCost } from "./reliques.js";
/* La SEULE valeur d'affichage lue ici, et elle ne sert qu'a construire
   `PLAYER_COLORS` juste en dessous : `palette.js` ne depend de rien, donc pas
   de cycle. La simulation elle-meme n'ouvre jamais cette table. */
import { CLASS_COLOR } from "./palette.js";
import {
  BOSS_ROSTER, BOSS_CFG, MECHS, bossAt, bossPool, mechAt, adaptMech, towerCount,
  ALERT_ORDER, ALERT_WARN, ALERT_INFO,
  MECH_STACK, MECH_SPREAD, MECH_TOWER, MECH_COUNT, MECH_LINK, MECH_JAIL,
  MECH_GAZE, MECH_PROX, MECH_MIASMA, MECH_ULT, MECH_CLUSTER, MECH_FEED,
  MECH_EXAFLARE, MECH_BAIT, MECH_DRIFT, MECH_SANCTUARY, MECH_SLIP,
  MECH_QUADRANT, MECH_CROSS, MECH_CONVERGE, MECH_DODGE,
  MECH_SHRINK, MECH_PUDDLE, MECH_SAFE,
  MECH_BREATH, MECH_BROOD, MECH_REVERSE, MECH_SWAP, MECH_ENRAGE,
  MECH_SYNTH, MECH_SEAL,
  BOSS_JUMEAUX, BOSS_ORACLE, BOSS_MATRIARCHE, BOSS_METRONOME,
  BOSS_FINAL, BOSS_POOL_COUNT,
} from "./bosses.js";
import {
  TL_CFG, SCRIPTS, EVENTS, beatAt, adaptEntry, adaptEvent, eventAt, verifierScript,
  EV_NUEE, EV_SIEGE, EV_CROISE, EV_CHASSE,
} from "./timeline.js";
import {
  ENEMY_TYPES, TRAITS, TRAIT_CFG, adaptType, hasTrait, traitBit,
  TRAIT_DASH, TRAIT_TRAIL, TRAIT_VOLLEY, TRAIT_FRENZY, TRAIT_SPORE, TRAIT_AURA,
} from "./enemies.js";
import {
  BIOMES, BIOME_CFG, HAZARDS, WEATHERS, buildBiome, hazardState, weatherFor,
  biomeAt, hazardAt, weatherAt, verifierBiomes,
  HZ_GEYSER, HZ_POOL, HZ_EMBER, HZ_SLOW, HZ_SLIP,
  WX_BRUME, WX_BOURRASQUE, WX_CENDRES,
} from "./biomes.js";

export { CARD_CFG };
/* Le bestiaire est SORTI de ce fichier au lot S, mais il continue d'en etre
   exporte : `client.js`, `hud.js` et les scripts de mesure importent
   `ENEMY_TYPES` d'ici depuis toujours, et un lot qui deplace une table n'a
   aucune raison de faire bouger ses appelants.

   `traitsOf` et `typesFor` ne sont PAS reexportes : ils ne viennent plus
   d'`enemies.js`, ils sont definis ici avec les profils (lot T). */
export {
  ENEMY_TYPES, TRAITS, TRAIT_CFG, adaptType, hasTrait,
  TRAIT_DASH, TRAIT_TRAIL, TRAIT_VOLLEY, TRAIT_FRENZY, TRAIT_SPORE, TRAIT_AURA,
};
export { TL_CFG, SCRIPTS, EVENTS, eventAt, verifierScript };
export { EV_NUEE, EV_SIEGE, EV_CROISE, EV_CHASSE };
/* Le biome est reexporte pour la MEME raison que le bestiaire : `client.js`
   regenere la geometrie de son cote a partir de `(biome, graine)`, et il importe
   deja `game_state.js`. Une seconde porte d'entree pour la meme table aurait
   donne deux chemins d'import a garder d'accord. */
export {
  BIOMES, BIOME_CFG, HAZARDS, WEATHERS, buildBiome, hazardState, weatherFor,
  biomeAt, hazardAt, weatherAt, verifierBiomes,
  HZ_GEYSER, HZ_POOL, HZ_EMBER, HZ_SLOW, HZ_SLIP,
  WX_BRUME, WX_BOURRASQUE, WX_CENDRES,
};

/* Raccourcis de masque, pour que la table des profils se lise. `DASH | TRAIL`
   est ce qu'on veut voir sur la ligne du grunt ; `1 << TRAIT_DASH | 1 <<
   TRAIT_TRAIL` ne se relit pas. */
const DASH = traitBit(TRAIT_DASH);
const TRAIL = traitBit(TRAIT_TRAIL);
const VOLLEY = traitBit(TRAIT_VOLLEY);
const FRENZY = traitBit(TRAIT_FRENZY);
const SPORE = traitBit(TRAIT_SPORE);
const AURA = traitBit(TRAIT_AURA);
export { CLASSES, CLASS_DEFAULT, SKILL_CFG, classAt };
export { STATUSES, STATUS_CFG, STATUS_VULN, STATUS_BURN, STATUS_ROOT, STATUS_DOOM };
export { BOSS_ROSTER, BOSS_CFG, MECHS, bossAt, mechAt };
export { RELICS, RELIC_CFG, RELIC_RARITY, relicById, relicPrice, relicRerollCost };

/* Liste vide PARTAGEE, rendue par les accesseurs `obstacles` et `hazards` quand
   l'arene de boss est nue. Une constante et non un `[]` par appel : ces deux
   accesseurs sont lus par la boucle de deplacement de chacun des 200 ennemis, a
   chaque image — allouer un tableau la serait deux cents allocations par image
   pour un tableau que personne n'ecrit. */
const EMPTY_LIST = Object.freeze([]);

export const CFG = {
  /* GRANDE ARENE (lot I). L'arene fait TROIS fois la vue dans chaque
     dimension : l'exploration devient un vrai deplacement, pas un pas de
     cote. La VUE reste 1600 x 900 — c'est elle que le client affiche (camera
     par joueur), c'est le format du cadre CSS, et c'est la taille de l'arene
     de combat de boss (bounds resserres a l'engagement). Tout ce qui etait
     calibre "a l'ecran" (portees, rayons, telegraphies) reste donc valide. */
  ARENA_W: 4800,
  ARENA_H: 2700,
  VIEW_W: 1600,
  VIEW_H: 900,

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

     Les rampes sont indexees sur la MINUTE DE HORDE. Elles l'etaient sur le
     numero de vague, qui n'existe plus : le script (`timeline.js`) envoie la
     meme chose a la meme minute pour toutes les equipes, donc la minute EST
     l'unite de difficulte comparable — c'est exactement la propriete qu'on
     cherchait en quittant l'horloge, et elle est desormais gratuite.
     Conversion a l'identique : un beat dure 60 s la ou une vague durait ~55 s,
     donc 9 PV/vague -> 9 PV/minute et 4 -> 4. A la minute 15, les PV de base
     valent 151 comme a la vague 16 de l'ancienne courbe.
     Le DEBIT, lui, ne se derive plus d'une rampe : il est ECRIT, beat par beat,
     dans SCRIPT. */
  /* 13 et non 9 depuis que la puissance n'entre plus dans les PV (D2) : les PV
     doivent porter SEULS ce que la rampe et le terme de puissance portaient a
     deux. Derivation : a la vague 16 — la fin de manche de l'ancien modele — un
     grunt avait 16 + 9 x 15 = 151 PV de base, que la puissance mediane (2,36,
     absorbee a 0,55) portait a ~264 PV effectifs, et l'equilibrage y etait juge
     correct. La manche est deux fois plus longue et l'equipe deux fois plus
     chargee, d'ou une cible d'environ 420 PV a la minute 30 : (420 - 16) / 30
     donne 13,5.
     Le critere qui compte n'est pas cette valeur mais le TEMPS DE MISE A MORT
     d'un grunt, qui doit rester entre 0,15 et 0,50 s pour une build mediane du
     debut a la fin — c'est lui qui fait que « 120 ennemis » veut dire la meme
     chose a la minute 5 et a la minute 25. */
  ENEMY_HP_BASE: 16,
  ENEMY_HP_MIN_RAMP: 13,     // PV gagnes par minute de horde
  ENEMY_SPEED_MIN_RAMP: 4,

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
     debit du script. Une jauge commune a paliers fixes donnait quatre fois plus
     de cartes a quatre joueurs qu'a un seul, alors que les deux tables voient
     exactement la meme horde : le solo terminait la manche avec trois cartes
     et se faisait ecraser par une pression calibree pour une equipe qui en
     avait douze. Le gain est donc divise par joueurs^WAVE_CROWD_EXP, ce qui
     rend le rythme des cartes identique quel que soit l'effectif.

     L'UNITE A CHANGE : un kill ne vaut plus 1, il vaut les PV MAX de la cible.
     Applique a la lettre, « de l'experience uniquement en tuant » s'annulait
     tout seul — les PV des ennemis montent sur l'horloge, donc un grunt de la
     minute 30 coute une vingtaine de fois plus de degats qu'un grunt de la
     minute 1 et rapportait exactement les memes 10 points. L'experience par
     minute s'effondrait au fil de la partie, la ou elle devait s'ouvrir.

     Aux PV max, l'experience par minute devient proportionnelle aux DEGATS PAR
     SECONDE de l'equipe, ce qui est exactement l'effet recherche. Quatre
     proprietes tombent sans une ligne de code : pas de dernier coup a voler
     (la valeur ne depend pas de qui acheve), une elite vaut son x3 de PV, un
     tank vaut ses 4,5 grunts, et la rampe de PV ne dilue plus rien.

     `score` ne bouge pas et ne doit pas etre confondu : il dit la valeur
     TACTIQUE d'une cible (un tireur vaut plus qu'un grunt a surface egale) et
     n'est lu que par le tableau des scores. Les PV disent la valeur ECONOMIQUE.

     LA BOUCLE NE S'EMBALLE PAS, et le frein etait deja ecrit : un palier coute
     18 % de plus que le precedent (GROWTH) quand une carte rapporte de l'ordre
     de +9 % de puissance (mesure : puissance mediane 2,36 pour ~13 cartes).
     1,18 / 1,09 = 1,08 — chaque niveau prend 8 % de temps de plus que le
     precedent, donc la courbe decelere d'elle-meme, sans plafond dur ni
     falaise. Meme raisonnement que le genou des PV de boss. */
  LEVEL_MAX: 30,             // plafond haut : un niveau = une carte
  /* MESURE, pas conversion. La conversion arithmetique donnait 240 — les 15
     kills normalises du 1er palier x 16 PV d'un grunt du debut — et elle est
     fausse d'un facteur trente : elle suppose que le nombre de kills ne bouge
     pas, alors qu'une manche de trente minutes en compte des milliers ET que
     les PV de chaque cible montent avec la manche. A 240, la table plafonnait
     au niveau 30 a mi-parcours et repartait avec 34 cartes par joueur.

     Balaye a plafond REEL (le calibrage a plafond leve est invalide : sans
     plafond, la boucle puissance -> PV des ennemis -> experience diverge, et la
     base « necessaire » varie d'un facteur sept d'un effectif a l'autre).
     Cartes par joueur, moyenne sur 4 a 6 manches completes par point :
     24000 -> 14, 8000 -> 21,5, 7000 -> 27,2, 6000 -> 27,8, 2000 -> plafond.

     7500 est le MILIEU des deux points qui encadrent la cible (24 a 26), et
     c'est tout ce que la mesure autorise a dire : l'ecart-type est de l'ordre
     de six cartes d'une manche a l'autre a reglage identique, donc plus grand
     que l'ecart entre 7000 et 8000. Cette dispersion vient de la boucle que le
     lot R coupe (WAVE_HP_POWER_K : une build forte fait monter les PV, donc
     l'experience) — c'est apres lui que le reglage se resserre.

     REMESURE AU LOT X, et le chiffre tombe de 6000 a 1800. Les deux mesures
     sont justes, elles ne repondent simplement plus a la meme question : celle
     de 6000 comptait SIX CARTES DE BOSS gratuites en plus des niveaux, et un
     niveau n'ouvrait un ecran qu'a la mort du boss suivant. Les deux ont
     disparu — un niveau ouvre son ecran, le boss ne donne plus de carte — donc
     la totalite des cartes passe par la jauge, et la meme base rendait onze
     cartes la ou la cible en demande vingt-cinq.

     Le defaut vecu etait pire que le total : le PREMIER palier coutait 375
     grunts de debut de manche, soit une premiere carte a la minute 4 ou 5 dans
     une partie qui en compte trente. Un jeu de ce genre se juge sur sa premiere
     minute, et la premiere minute ne donnait rien.

     Balayage a modele complet (bot invulnerable, boss expedie au credit exact
     de `BOSS_XP_K`, 1800 s de horde, moyenne de 3 a 4 manches par point) :
       4500 -> 16,7 cartes  ·  3500 -> 19,7  ·  2500 -> 20,3
       2200 -> 22,0  ·  1800 -> 23,8  ·  1500 -> 28,0 (plafond atteint min 28)
     A 1800, en solo : niveau 27, 26 cartes, un niveau par minute sur les neuf
     premieres — c'est cette rampe-la qu'on est venu chercher. Parite
     d'effectif inchangee (26 / 22 / 24 cartes a 1, 2 et 4 joueurs, sous
     l'ecart-type de six cartes du dispositif).

     GROWTH ne bouge pas : le frein est intact (1,18 / 1,09 = 1,08, chaque
     niveau prend 8 % de temps de plus) et c'etait le seul role de la base que
     de fixer OU la courbe commence. */
  /* --- L'UNITE A CHANGE UNE SECONDE FOIS, et l'aller-retour est instructif.

     Les PV max reglaient le defaut du score fixe (l'experience par minute
     s'effondrait quand les PV montaient x20) et en creaient le symetrique : au
     debut un grunt vaut SEIZE PV, donc le premier palier ne se remplissait pas.
     Mesure : apres une minute en solo, moins de la moitie du niveau 1 — a
     0,6 apparition/s, une minute ne produit que 36 grunts a ~16 PV.

     Un jeu de ce genre se juge sur sa premiere minute, et la premiere minute ne
     donnait rien.

     La valeur vient donc du BESTIAIRE (`ENEMY_TYPES[i].xp`, ecrite par type) et
     la croissance d'une COURBE indexee sur le niveau d'equipe. Le debut paie
     immediatement — la valeur ne depend plus des PV — et la fin ne s'effondre
     pas, la courbe suivant la progression. Surtout, la valeur redevient un
     REGLAGE : on peut rendre un bulwark plus payant qu'un tank sans toucher a
     ses PV, ce qui etait impossible tant que l'un decoulait de l'autre. */

  /* Cout du PREMIER palier. Ecrit pour que le niveau 2 tombe autour de la
     quarantaine de secondes en solo : la premiere minute doit donner une carte,
     c'est elle qui dit au joueur que la progression existe. */
  LEVEL_XP_BASE: 200,
  LEVEL_XP_GROWTH: 1.18,     // chaque palier coute 18 % de plus

  /* Croissance de la VALEUR d'un kill, par niveau d'equipe. Le rapport avec
     GROWTH est le seul chiffre qui compte ici : 1,18 / 1,09 = 1,08, donc chaque
     palier prend 8 % de temps de plus que le precedent A CADENCE DE KILLS
     CONSTANTE. La cadence, elle, monte avec le debit du script et avec la build,
     ce qui compense en partie — c'est voulu, et c'est ce qui remplace la rampe
     de PV comme moteur de fin de partie.

     Ne pas monter ce chiffre au-dessus de GROWTH : la courbe s'inverserait, les
     paliers tardifs deviendraient plus rapides que les premiers, et la
     progression n'aurait plus de fin. */
  XP_LEVEL_GROWTH: 1.09,

  /* Valeur totale d'un BOSS, dans la meme unite, avant la courbe de niveau.
     Elle est CREDITEE EN CONTINU au prorata des degats (voir `_damage`) et non
     a la mort : un palier entier qui saute d'un coup se lit comme un bug, et le
     surplus du coup fatal ne doit rien rapporter.

     300 = trente grunts du debut. Le boss ne doit pas porter la progression —
     mesure du lot X sous l'ancienne regle : il pesait 1,6 a 12,8 % de
     l'experience totale, pour un plafond qu'on s'etait fixe a 25 %. On reste
     dans le meme ordre : six boss valent cent quatre-vingts grunts, la horde en
     fournit des milliers. */
  BOSS_XP_BASE: 300,

  /* Normalisation d'effectif. Elle survit a la disparition des vagues : c'est
     elle qui porte la parite mesuree entre une table d'un et de quatre joueurs
     (15,8 contre 16,0 vagues atteintes), sur le debit comme sur les paliers
     d'experience. 0.75 donne x2,8 a quatre joueurs contre x2 pour le
     sqrt(joueurs) d'avant : la difficulte a effectif eleve etait trop molle. */
  WAVE_CROWD_EXP: 0.75,
  // Les elites montent en PROPORTION avec l'effectif, pas seulement en nombre
  // absolu : a quatre joueurs le debit triple, et sans ca on croisait la meme
  // densite d'elites dans une foule trois fois plus dense.
  WAVE_ELITE_CROWD_EXP: 0.4,

  /* PLUS AUCUN SCALING DE PUISSANCE (D2). Les deux termes valaient 0,55 et 0,35
     et repercutaient la puissance mesuree de l'equipe sur les PV des ennemis et
     sur le debit d'apparition. A zero, le facteur `(1 + K * (power - 1))` vaut
     exactement 1 et le terme s'evanouit : pas une ligne de logique ne change,
     et revenir en arriere est un changement de constante.

     La raison de fond n'est pas de doctrine : un scaler dont l'entree est sa
     propre sortie n'est PAS MESURABLE, et ce depot ne se pilote que par la
     mesure. Il se ressent aussi — le joueur qui reussit voit le mur monter,
     c'est le defaut classique de l'ajustement dynamique.

     L'ancien argument reste vrai et n'est plus le sujet : indexer sur la
     puissance MESUREE plutot que sur la composition evitait de taxer le
     soigneur. Ne jamais rouvrir cette porte-la en remettant un terme de
     composition a la place de celui qu'on retire ici.

     Ce que ca coute est ecrit et repare au meme endroit : la duree d'un combat
     de boss devient inversement proportionnelle a la build (131 s a 29 s), d'ou
     le plancher de barre et l'enrage dans `BOSS_CFG`. */
  WAVE_HP_POWER_K: 0,        // etait 0.55 — les PV d'ennemi ne suivent plus la puissance
  WAVE_RATE_POWER_K: 0,      // etait 0.35 — le debit non plus
  /* Les PV du boss se calent sur la build MEDIANE mesuree, une fois pour
     toutes. Une reference explicite et non `bossPower()` avec un K nul : avec
     `BOSS_POWER_K = 0`, `bossPower(p)` rend le genou au-dessus du genou mais
     rend `p` EN DESSOUS — une build faible garderait donc un boss aux PV
     reduits, c'est-a-dire un scaling residuel. Et un genou a zero rendrait un
     boss sans PV. */
  BOSS_POWER_REF: 2.36,
  // Delai avant qu'une baisse d'effectif vivant ne descende la pression : voir
  // `aliveCrowd()`. Assez long pour couvrir un relevement, assez court pour
  // qu'une equipe reellement decimee ne se batte pas longtemps contre un boss
  // calibre pour l'effectif complet.
  CROWD_HYSTERESIS: 8,

  SHOT_SPEED: 235,
  SHOT_RADIUS: 6,
  SHOT_DAMAGE: 14,
  SHOT_LIFE: 4,

  /* Un bonus au sol est un EVENEMENT, pas un revenu. Ces trois valeurs avaient
     ete calibrees quand les bonus etaient la seule progression du jeu ; depuis
     les vagues et les cartes, un bonus toutes les 9 a 14 secondes et trois au
     sol en permanence rendaient le trajet gratuit. Doubler l'attente redonne sa
     valeur au deplacement : aller le chercher redevient une prise de risque. */
  /* POINTS DE RECOLTE (lot I). Rares et interessants — un evenement, pas un
     revenu : c'est la raison d'explorer la grande arene. Deux formes pour
     deux gestes : le CRISTAL se detruit en tirant dessus, l'AMAS se canalise
     en restant dessus — s'arreter plutot que tirer en passant. Le rendement
     part en ECLATS, la monnaie de manche : versee a l'equipe entiere (meme
     raison que l'experience commune — celui qui explore prend le risque,
     celui qui tient la ligne ne doit pas etre taxe), jamais persistee.
     HARVEST_PLAYER_DIST : un point n'apparait jamais a moins d'un demi-ecran
     large d'un joueur vivant — s'il tombait sous les yeux, l'exploration
     n'aurait pas lieu d'etre. */
  HARVEST_MIN: 25,           // secondes entre deux apparitions
  HARVEST_MAX: 45,
  HARVEST_MAX_GROUND: 4,
  HARVEST_YIELD_MIN: 15,     // eclats par point recolte
  HARVEST_YIELD_MAX: 35,
  HARVEST_CRYSTAL_HP: 60,
  HARVEST_CHANNEL: 1.5,      // secondes de canalisation d'un amas
  HARVEST_RADIUS: 16,
  HARVEST_CHANNEL_RADIUS: 60,
  HARVEST_PLAYER_DIST: 1100,

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
  // BOSS_FIRST et BOSS_EVERY (180 s chacun) ont disparu : le boss clot un
  // SEGMENT, et son combat est HORS de l'horloge de horde (D1). `bossCount`
  // reste, il sert a la croissance des PV.
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

  /* --- boss final (lot N) ---------------------------------------------------
     Le nombre de barres et le multiplicateur de PV vivent sur l'ENTREE DU
     ROSTER (`bars`, `hpMul`, `atkCdMul`, `zoneMul`) et non ici : ce sont des
     caracteristiques d'un boss, comme le `hpMul` des cinq autres, pas des
     reglages globaux. Ne restent dans CFG que les deux constantes qui parlent
     du SCEAU — la mecanique exclusive de la derniere barre.

     Le sceau demande d'occuper des zones aux quatre coins pendant un temps
     CUMULE, pas continu : lacher un coin pour esquiver ne remet pas a zero,
     l'abandonner oui. C'est le meme choix que la canalisation d'un amas de
     recolte, et pour la meme raison — une mecanique qui punit l'esquive est
     punitive, pas difficile. */
  SEAL_RADIUS: 120,
  SEAL_HOLD: 4.5,            // secondes CUMULEES par sceau
  SEAL_WARN: 22,             // duree de la fenetre : large, c'est un marathon
  SEAL_DECAY: 0.5,           // le cumul redescend a mi-vitesse quand on lache
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
  /* GENOU DE PUISSANCE. Les PV du boss suivaient `_teamPower()` en lineaire
     PLEIN, sans plafond : puissance x2 donnait un boss a x2 de PV, donc une
     duree de combat rigoureusement constante. C'etait le seul systeme du jeu
     dans ce cas — les vagues repercutent depuis toujours une PART de la
     puissance (WAVE_HP_POWER_K, WAVE_RATE_POWER_K), jamais la totalite.

     Consequence mesuree, et elle est severe : 300 manches solo tireur avec le
     vrai systeme de tirage donnent x4,54 d'ecart de puissance entre une build
     optimisee (5,71) et une build qui ne prend que du defensif (1,26), et
     x2,93 par la CHANCE seule (p90/p10 a choix aleatoire). Le boss annulait
     cet ecart a x1,00 pres, a chaque combat, pour toujours. Un mur peut se
     fissurer sans tomber.

     Un genou et non un plafond dur (`Math.min`) : un plafond cree une falaise
     ou la carte qui fait franchir le seuil ne vaut plus rien. La forme retenue
     est celle des vagues — plein en dessous du genou, une part au-dessus.

     Le genou est pose a 2,5 et non plus bas parce que la build MEDIANE mesuree
     vaut 2,36 : tout l'etalonnage actuel (BOSS_HP_MUL, les `hpMul` du roster,
     les cinq durees par boss) reste donc valide tel quel, et seules les bonnes
     builds voient une difference. Mesure a K = 0,50 : mediane inchangee a
     70 s, build chanceuse (4,10) a 56 s, build optimisee (5,71) a 50 s — la
     fourchette annoncee est 50-80 s, on ne peut pas en sortir meme en essayant.

     La sensation reste volontairement SOUS celle des vagues (x1,39 au mieux
     contre x1,52-1,59) : le boss est le mur de la manche, il doit recompenser
     moins que la pietaille, sinon ce n'est plus un mur. Remettre K a 1 rend
     exactement l'ancienne courbe. */
  BOSS_POWER_KNEE: 2.5,
  BOSS_POWER_K: 0.50,
  BOSS_PHASE_CD_STEP: 0.09,  // le rythme se resserre a chaque barre brisee
  BOSS_PHASE_DAMAGE_STEP: 0.14,
  /* Souffle de rupture de barre. Il ne DEPLACE plus, et il NE BLESSE PLUS. Le
     deplacement d'abord : un teleport de 260 px depassait le seuil de recalage
     de la prediction locale (90 px), donc chaque changement de phase se voyait
     comme un arrachement — et il arrivait 110 ms avant l'image qui l'explique.
     Les degats ensuite (lot A) : casser une barre est une reussite, et 18 points
     multiplies par la difficulte et par la Vulnerabilite en cours en faisaient
     une taxe, cinq fois par combat et pour les cinq boss. Ce qui reste est une
     recompense — les projectiles s'effacent, le boss respire une seconde et
     demie — et une variante par boss, cf. `_bossBreak`. Le rayon n'est plus
     qu'une taille d'onde a l'ecran. */
  BOSS_BREAK_RADIUS: 572,

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

/* LES QUATRE COULEURS DE JOUEUR SONT CELLES DES CLASSES, et l'ordre du tableau
   est celui de l'attribution : 0 Rempart, 1 Soigneur, 2 Tireur A, 3 Tireur B.
   C'est `assignColors()` dans `room.js` qui distribue les index, et lui seul.

   Elles ne sont plus quatre litteraux mais des renvois vers `CLASS_COLOR` :
   deux tables de couleurs divergent au premier reglage, et `palette.js` est LA
   source de verite du depot. Le tableau reste exporte d'ici parce que tout le
   monde l'importe deja par ce chemin — c'est l'index qui circule, pas la
   valeur.

   Ordre POSITIONNEL, comme les autres tables exportees : l'index voyage jusqu'au
   client. Le reordonner change la couleur des joueurs sur un onglet reste sur
   une version anterieure — sans casser quoi que ce soit, mais il le fera. */
export const PLAYER_COLORS = [
  CLASS_COLOR.tank,      // 0 — Rempart, toujours
  CLASS_COLOR.soigneur,  // 1 — Soigneur, toujours
  CLASS_COLOR.dps,       // 2 — Tireur
  CLASS_COLOR.dps2,      // 3 — second Tireur
];

/* --- provenance des degats subis -----------------------------------------------

   Quand on perd 40 PV, rien n'indiquait si c'etait un contact, un projectile,
   une zone, une mecanique ou une brulure. C'est la principale raison pour
   laquelle on ne comprend pas ses morts : on voit un chiffre rouge et une barre
   qui tombe, jamais ce qui vient de la vider.

   `_hurt()` recevait deja tous les appels : il suffisait de lui passer une
   source. Le registre est donc un TABLEAU ORDONNE dont l'index circule dans le
   snapshot (fin du tuple joueur) — meme invariant que STATUSES, MECHS et
   POWERUP_TYPES : ne jamais inserer au milieu, ajouter a la fin.

   CINQ sources et non six. Le plan en annoncait une sixieme, « souffle », pour
   la rupture de barre de boss : le meme lot vient justement de lui retirer ses
   degats (cf. `_bossBreak`), et plus rien du jeu n'inflige de souffle a un
   joueur. Une entree toujours nulle dans un registre partage est du poids mort
   qu'on paie a chaque relecture — elle s'ajoutera EN FIN le jour ou une
   mecanique en aura besoin.

   `label` est vu par le joueur (bilan de fin), il porte donc les accents ; `key`
   est un identifiant et n'en a pas. */
export const SRC_CONTACT = 0;
export const SRC_SHOT = 1;
export const SRC_ZONE = 2;
export const SRC_MECH = 3;
export const SRC_BURN = 4;
/* SIXIEME source, AJOUTEE EN FIN au lot S : l'explosion du kamikaze. Elle en
   merite une a elle seule alors qu'elle passe techniquement par une zone —
   c'est tout l'interet du registre. Un joueur qui voit « zone au sol : 40 % de
   nos degats » au bilan cherche des flaques de boss ; ce qui l'a tue, c'est
   d'etre reste au contact d'un type qu'il aurait fallu abattre a distance. La
   conduite a tenir differe, donc la provenance aussi. */
export const SRC_BLAST = 5;
/* SEPTIEME source, AJOUTEE EN FIN au lot V : l'environnement. Meme argument que
   l'explosion du kamikaze — un geyser et une flaque de Matriarche passent tous
   deux par des degats de sol, mais la conduite a tenir n'a rien a voir : l'une
   se fuit, l'autre s'apprend et ne se retrouve jamais ailleurs qu'au meme
   endroit. « 18 % de nos degats viennent de l'environnement » est precisement ce
   qu'il faut savoir pour decider si le biome est decoratif ou s'il est le
   probleme. */
export const SRC_ENV = 6;

export const DAMAGE_SOURCES = [
  { key: "contact",    label: "contact" },
  { key: "projectile", label: "projectile" },
  { key: "zone",       label: "zone au sol" },
  { key: "mech",       label: "mécanique" },
  { key: "burn",       label: "brûlure" },
  { key: "blast",      label: "explosion" },
  { key: "env",        label: "environnement" },
];

/* Les options d'un echec de mecanique, ecrites UNE FOIS. Trois appels les
   passaient a l'identique et les recopier trois fois etait la maniere la plus
   sure de les faire diverger — c'est le plafond « ne tue jamais un joueur a
   pleine vie » qui est en jeu, et un `mech: true` oublie le supprime en
   silence. L'objet est constant et partage : `_hurt` ne le modifie pas. */
const MECH_HURT = { ignoreCooldown: true, mech: true, src: SRC_MECH };

/* --- PROFILS DE DIFFICULTE (lot T) ---------------------------------------------

   Une difficulte etait QUATRE NOMBRES. L'argument d'origine reste vrai — « tout
   passe par des multiplicateurs sur la courbe de pression, rien n'est duplique,
   un reglage ajuste les trois modes d'un coup » — mais il produisait trois modes
   qui ne se distinguaient par rien d'autre qu'une echelle. Les multiplicateurs
   cessent donc d'etre l'IDENTITE du mode pour n'en etre plus que le RESIDU.

   Un profil porte quatre axes et un residu :

     script  — quelle table de beats (`timeline.js`), donc quelle GEOMETRIE
     roster  — quels types peuvent sortir, EN PLUS du calendrier `minMin`
     traits  — l'attachement (type -> masque de traits), lot S
     resume  — ce que le mode change, en trois lignes, pour le salon
     residu  — hp / spawn / dmg / boss

   Deux axes du plan manquent encore et c'est normal : `events` (lot U) et
   `biome` (lot V). Ils s'ajouteront comme des cles de plus — un profil est un
   objet, pas un tuple positionnel.

   `DIFFICULTIES` reste un TABLEAU ORDONNE dont l'index circule (le salon envoie
   `diffIndex`) : ne jamais inserer au milieu.

   TROIS REFUS EXPLICITES, chacun evitant une duplication que le depot a deja
   refusee ailleurs :
     - les BOSS n'ont pas de variante par difficulte — trois variantes de six
       boss, c'est dix-huit combats a equilibrer et la derive au premier reglage ;
     - les MECANIQUES non plus — `adaptMech` adapte deja a l'effectif, un second
       axe rendrait la table d'adaptation illisible, or c'est elle qui rend le
       systeme tenable ;
     - les STATISTIQUES de type non plus — PV, vitesse et degats restent ceux
       d'`ENEMY_TYPES`, le residu porte tout l'ajustement chiffre.

   OU EST LA QUANTITE DE PRESSION. Le plan demandait des « debits abaisses » en
   calme et « releves » en cauchemar, EN PLUS du residu `spawn`. Ce serait deux
   boutons sur la meme grandeur, et le depot a deja tranche ce cas exact pour
   l'effectif : `adaptEntry` « ne change que la FORME de la pression, jamais sa
   quantite ». Les variantes de script changent donc la forme — la geometrie
   d'apparition — et `spawn` reste le seul reglage de quantite.

   C'EST DEVENU UN AXE FAIBLE, et il faut l'ecrire. La variante portait aussi le
   nombre d'accalmies, qui les distinguait bien mieux que la geometrie ; les
   accalmies ont disparu au lot X et rien ne les a remplacees dans `timeline.js`.
   Ce qui separe reellement les trois modes vit desormais dans les trois autres
   axes — roster, traits, residu — et c'est defendable : ce sont ceux que le
   joueur peut nommer apres une manche. Si la mesure du lot X dit que calme et
   normal se ressemblent trop, le levier est le ROSTER ou les TRAITS, jamais un
   debit par variante. */
export const DIFFICULTIES = [
  {
    key: "calme", label: "calme",
    /* La horde arrive d'UN SEUL COTE. C'est le mode qui enseigne l'espace : le
       deplacement, la distance, la lecture des zones — et on ne lit pas d'ou ca
       vient quand ca vient de partout. */
    script: "calme",
    // Les cinq types d'origine seulement. Ni medic, ni bulwark, ni choeur : ce
    // sont les trois qui demandent de CHOISIR SA CIBLE, et ce n'est pas la
    // competence que ce mode a a enseigner.
    roster: [0, 1, 2, 3, 4],
    // Aucun trait. Le mode qui enseigne les types les montre NUS.
    traits: {},
    resume: [
      "les cinq types d'origine, rien de plus",
      "aucun comportement particulier : ils avancent et ils frappent",
      "la horde arrive d'un seul côté — le sol ne fait jamais rien",
    ],
    hp: 0.78, spawn: 0.80, dmg: 0.80, boss: 0.75,
  },
  {
    key: "normal", label: "normal",
    script: "normal",
    /* `kamikaze` et `bulwark` sont les deux types qui font passer le mode de
       « tirer sur ce qui approche » a « tirer sur le bon d'abord, sous le bon
       angle ». C'est le saut que normal doit produire. */
    roster: [0, 1, 2, 3, 4, 5, 6],
    traits: {
      grunt: DASH,
      runner: FRENZY,
      tank: AURA,
      shooter: VOLLEY,
      brood: SPORE,
      kamikaze: FRENZY,
    },
    resume: [
      "kamikaze et porte-bouclier en plus : il faut choisir sa cible et son angle",
      "les grunts chargent, les tireurs envoient des salves de trois",
      "pinces et quatre fronts sur les crescendos — le sol ne blesse pas",
    ],
    hp: 1.00, spawn: 1.00, dmg: 1.00, boss: 1.00,
  },
  {
    key: "cauchemar", label: "cauchemar",
    // Plusieurs directions en PERMANENCE : ce qui est un crescendo ailleurs est
    // ici l'ordinaire.
    script: "cauchemar",
    roster: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    /* Le mode se distingue moins par ses chiffres que par le fait que LE SOL
       PARTICIPE : entre les trainees des grunts et les spores des broods, la
       surface jouable se reduit en permanence — un chronometre deguise, ce que
       le depot trouve deja bien plus lisible qu'un enrage brutal. */
    traits: {
      grunt: DASH | TRAIL,
      runner: DASH | FRENZY,
      tank: AURA | TRAIL,
      shooter: VOLLEY,
      brood: SPORE | FRENZY,
      kamikaze: FRENZY | TRAIL,
      bulwark: AURA,
      medic: FRENZY,
      /* Le choeur n'a PAS `TRAIT_AURA` : la sienne est intrinseque et plus
         large, c'est son identite entiere. La lui donner en double aurait fait
         croire a un cumul qui n'existe pas. */
    },
    resume: [
      "les neuf types, soigneurs et choeurs compris — un paquet couvert est un mur",
      "les grunts chargent ET brûlent le sol derrière eux, les broods sporulent",
      "plusieurs directions en permanence : le sol se referme derrière eux",
    ],
    hp: 1.35, spawn: 1.28, dmg: 1.25, boss: 1.25,
  },
];
export const DIFF_NORMAL = 1;

/* Attachement resolu UNE FOIS au chargement : `{ grunt: DASH }` devient un
   tableau indexe par type. L'ecriture par CLE est ce qu'on veut lire dans le
   profil — une colonne de masques alignes ne dit pas de quel type on parle — et
   l'index est ce que la boucle veut lire deux cents fois par image. Resoudre au
   chargement donne les deux sans avoir a choisir.

   Une cle inconnue est ignoree en silence : c'est le seul cas ou ce serait un
   defaut, mais l'alternative — jeter au chargement — casserait le jeu entier
   pour une faute de frappe dans un mode qu'on ne joue pas. */
const TRAIT_BY_TYPE = DIFFICULTIES.map(d => {
  const row = new Array(ENEMY_TYPES.length).fill(0);
  for (const [key, mask] of Object.entries(d.traits)) {
    const i = ENEMY_TYPES.findIndex(t => t.key === key);
    if (i >= 0) row[i] = mask;
  }
  return row;
});

/* Les deux lectures du profil dont le CLIENT a besoin, exportees en fonctions
   pures — meme raison que `fullMods` et `powerIndex` : le client recalcule les
   traits de chaque ennemi pour les dessiner, et deux implementations auraient
   diverge au premier reglage. Un couple hors table rend le mode normal plutot
   qu'`undefined` : une partie qui deborde sa table doit continuer de tourner. */
export function typesFor(diffIndex) {
  return (DIFFICULTIES[diffIndex] ?? DIFFICULTIES[DIFF_NORMAL]).roster;
}

export function traitsOf(diffIndex, type) {
  return TRAIT_BY_TYPE[diffIndex]?.[type] ?? 0;
}

/* Le bestiaire vit desormais dans `shared/enemies.js` — voir l'import et le
   reexport en tete de fichier. `from` (la vague d'apparition) y a ete remplace
   par `minMin` / `fallback` : il n'y a plus de vague, et le calendrier des types
   suit la MINUTE DE HORDE. `this.tier` n'a donc plus aucun lecteur. */
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
export function fullMods(cards, others, cls, level = 1) {
  const mods = computeMods(effectiveCards(cards, others));

  /* « Coeur de forge » : la seule carte dont la valeur depend de l'AVANCEMENT.
     `computeMods` est une fonction de la seule liste de cartes possedees — le
     niveau n'y a rien a faire, sinon elle cesse d'etre rejouable telle quelle
     dans un script de mesure. La part de niveau est donc ajoutee ici. */
  if (mods.damagePerLevel > 0) {
    mods.damageMul += mods.damagePerLevel * Math.max(0, level - 1);
  }

  const def = classAt(cls);
  mods.damageMul *= def.damageMul;
  mods.speedMul *= def.speedMul;

  // Plus de terme de niveau : les PV max ne viennent que de la classe et des
  // cartes. C'est une perte de 88 PV en fin de manche, que les cartes
  // defensives doivent reprendre a leur compte.
  let maxHp = (def.hp + mods.maxHpBonus) * (1 + mods.maxHpRatio);

  /* CONVERSIONS. Les deux se calculent sur les valeurs de BASE, relevees avant
     la moindre conversion, et jamais l'une sur le resultat de l'autre : sinon
     « Blindage offensif » lit des PV deja gonfles par « Fureur defensive », qui
     lit des degats deja gonfles par le premier, et le chargement diverge un peu
     plus a chaque recalcul — c'est-a-dire a chaque carte prise. C'est le seul
     endroit du depot ou l'ordre d'ecriture change le resultat, d'ou les deux
     copies. */
  const baseDamageMul = mods.damageMul;
  const baseHp = maxHp;
  if (mods.hpToDamage > 0) {
    mods.damageMul += mods.hpToDamage * (baseHp / CARD_CFG.CONVERT_HP_REF);
  }
  if (mods.damageToHp > 0) {
    maxHp += mods.damageToHp * baseDamageMul * CARD_CFG.CONVERT_DMG_REF;
  }
  /* « Pacte de fer ». Le bouclier reste dans `shieldPool` — c'est lui qui donne
     sa valeur a la carte — mais il ne se remplit plus qu'une fois : la regle
     vit dans `_players`, la ou la regeneration est ecrite. */
  if (mods.shieldToDamage > 0 && mods.shieldPool > 0) {
    mods.damageMul += CARD_CFG.PACTE_STEP * (mods.shieldPool / CARD_CFG.PACTE_PER);
  }

  if (mods.hpCap > 0) maxHp = Math.min(maxHp, mods.hpCap);
  return { mods, maxHp: Math.round(maxHp) };
}

/* INDICE DE PUISSANCE. Degats par seconde estimes d'un chargement, et le seul
   chiffre du jeu qui explique a la fois les PV du boss et la pression des
   vagues — `_teamPower()` en est la moyenne. Approximatif par construction : il
   ne cherche pas a predire les degats reels, seulement a suivre l'ordre de
   grandeur des cartes prises.

   PUR et EXPORTE pour la meme raison que `fullMods` et `effectiveCards` : la
   fenetre de build l'affiche au joueur, et le recoder cote client aurait donne
   deux implementations qui divergent au premier reglage — sur precisement
   l'ecran dont le seul but est d'expliquer un chargement.

   Prend un `mods` et rien d'autre. Cote simulation on lui passe `powerMods`
   (cartes + classe, sans la progression permanente) et non `mods` : la meta est
   exclue de la difficulte PAR CONSTRUCTION. */
export function powerIndex(m, flat = 0) {
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
  /* CRITIQUE. C'est une source de degats PERMANENTE, donc elle doit figurer
     ici : l'oubli de `barrelDamageMul` avait triple la duree du troisieme
     combat de boss, et une build critique complete (+38 % de chance, x2,9)
     vaut +72 % de degats reels — le meme ordre de grandeur.
     Valeur exacte et non estimee : l'esperance d'un tirage a deux issues est
     `1 + chance x (multiplicateur - 1)`, et le critique s'applique a tout ce
     qui passe par `_damage`, donc a tout ce que cette formule mesure deja.
     Le momentum (elan, meute, carnage, dernier souffle) n'y est PAS : il est
     transitoire par construction, et indexer la pression des vagues sur un
     pic de quatre secondes ferait monter la difficulte au moment precis ou le
     joueur vient de gagner son bonus. */
  const crit = 1 + m.critChance * (m.critMul - 1);
  /* Reliques a degats bruts (lot K). Le flat s'ajoute a la BASE comme dans
     `_shoot` : le facteur vaut exactement l'apport d'une relique au tir reel,
     ni plus ni moins. `flat` est le TOTAL brut (eclat_dur + noyau_instable +
     coeur_machine), passe par les appelants — la fonction reste pure, elle
     ne lit aucune table. */
  const flatMul = 1 + flat / CFG.BULLET_DAMAGE;
  return m.damageMul * barrels * catalyseur * crit
    * (1 + m.echoChance) / m.fireIntervalMul * flatMul;
}

/* Puissance vue par un BOSS : l'indice passe au genou. Pure elle aussi, pour
   que la fenetre de build montre au joueur OU il se situe par rapport au genou
   sans reimplementer la regle. `GameState._bossPower()` n'en est que la moyenne
   d'equipe. */
export function bossPower(power) {
  if (power <= CFG.BOSS_POWER_KNEE) return power;
  return CFG.BOSS_POWER_KNEE + CFG.BOSS_POWER_K * (power - CFG.BOSS_POWER_KNEE);
}

export class GameState {
  /* `biomeIndex` et `seed` sont OPTIONNELS et tires au hasard s'ils manquent :
     `new GameState(1)` reste la ligne des scripts de mesure, et un lot qui
     ajoute un axe n'a aucune raison de casser tous les scripts jetables du
     depot. La salle, elle, les passe explicitement — c'est elle qui les annonce
     au salon, et le client en regenere la geometrie a l'identique. */
  constructor(difficulty = DIFF_NORMAL, biomeIndex = null, seed = null) {
    this.diffIndex = Math.min(Math.max(difficulty | 0, 0), DIFFICULTIES.length - 1);
    this.diff = DIFFICULTIES[this.diffIndex];

    /* --- BIOME (lot V) ------------------------------------------------------
       La geometrie est posee ICI, a la construction, et ne bouge plus. Trois
       raisons, toutes deja ecrites ailleurs dans le depot : la prediction locale
       rejoue la regle des murs cote client et un obstacle apparu sous un joueur
       en pleine esquive le teleporterait (162 px en trois images) ; la geometrie
       des zones de boss garde volontairement l'arene pleine, et un damier
       calcule sur une surface libre qui change n'est plus lisible ; et
       `_dropPoint` doit pouvoir poser un bonus ailleurs que dans un mur, ce
       qu'il ne peut pas faire contre une geometrie mouvante.

       Ce qui PEUT naitre en cours de manche : les zones — traversables, donc
       elles ne cassent ni la prediction ni le placement. */
    this.biomeIndex = biomeIndex === null
      ? Math.floor(Math.random() * BIOMES.length)
      : Math.min(Math.max(biomeIndex | 0, 0), BIOMES.length - 1);
    this.seed = (seed === null ? Math.floor(Math.random() * 0x7fffffff) : seed | 0) >>> 0;
    this.biome = buildBiome(this.biomeIndex, this.diffIndex, this.seed,
      CFG.ARENA_W, CFG.ARENA_H, CFG.VIEW_W, CFG.VIEW_H);
    /* L'ARENE DE BOSS EST NUE, et c'est un POINT DE PASSAGE UNIQUE plutot qu'un
       test disperse. Un combat se joue dans une vue resserree ancree sur
       l'equipe ; la geometrie du biome, elle, est posee sur la salle entiere et
       ne sait rien de cette boite. Selon l'endroit ou l'equipe se trouvait quand
       le boss est sorti, on se battait donc contre deux ou trois piliers plantes
       au milieu de la choregraphie — le damier, la croix et les couloirs sont
       calcules sur les bounds et ne les evitent pas, et le boss lui-meme ne
       collisionne pas avec les obstacles (il fait jusqu'a 90 px de rayon).
       L'arene de boss est un lieu a part : elle doit se presenter nue.

       DES LISTES VIDES plutot qu'un drapeau lu partout : tous les consommateurs
       testent deja `this.obstacles.length &&` avant de boucler, donc ils
       s'eteignent tous seuls — deplacement des joueurs, deplacement des ennemis,
       arret des balles, arret des tirs ennemis, sol glissant, ralentissement,
       placement des bonus et des points de recolte. Un test de plus a chacun de
       ces endroits, c'est un oubli garanti au prochain ajout.

       La geometrie n'est pas DETRUITE : `this.biome` la garde, et elle revient
       intacte a la mort du boss. Rien a regenerer, rien a resynchroniser — le
       client applique la meme regle a partir de la meme information (`bo` dans
       l'instantane), exactement comme il rejoue deja la constriction des
       bounds. */
    this._biomeObstacles = this.biome.obstacles;
    this._biomeHazards = this.biome.hazards;
    /* Minuteur de degats des dangers, UN SEUL pour tous et non un par danger :
       ils infligent tous par paliers de `ZONE_TICK`, et quatre horloges qui
       battent a la meme cadence avec des origines differentes auraient fait
       clignoter les chiffres sans rien changer au total. */
    this.hazardTick = 0;
    /* METEO du segment. Un MODIFICATEUR GLOBAL, jamais une entite : elle n'a pas
       de position. Elle ne circule pas — elle se deduit de `(graine, segment)`,
       que le client a deja — mais elle s'ANNONCE, parce qu'un changement muet
       surprend au lieu d'informer. */
    this.weather = null;

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
    this.anchors = [];      // ancres du tank (3e competence, lot C)
    this.sancts = [];       // sanctuaires du soigneur (3e competence, lot C)
    this.effects = [];      // purement visuel : ondes de choc
    /* Ennemis en anticipation de ruee (lot S). Une liste d'identifiants, videe
       et reconstruite a chaque tick par `_enemies`, envoyee telle quelle dans la
       cle nommee `wu`. Une liste plutot qu'un champ par ennemi : ce serait un
       huitieme element paye sur les deux cents, vingt fois par seconde, pour une
       information qui concerne trois entites — c'est le raisonnement du rang
       d'elite encode dans le champ de type. */
    this.windup = [];
    /* EVENEMENT en cours (lot U), ou `null`. Un objet plutot que trois champs
       sur l'instance : « pas d'evenement » doit etre UNE valeur, pas trois
       valeurs qu'il faut garder coherentes. `quarry` est l'identifiant du gibier
       de `chasse`, 0 quand il n'y en a pas — un identifiant et non l'entite, qui
       disparait de `enemies` a sa mort. */
    this.event = null;
    this.quarry = 0;

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

    /* --- ARENE MOBILE (lot 5, etendue au lot I) ------------------------------
       `bounds` est la surface JOUABLE courante. Elle vaut l'arene entiere
       pendant les vagues, une VUE (1600 x 900) ancree sur l'equipe pendant
       tout combat de boss, et se referme encore par paliers pendant la
       constriction du Ravageur. TOUT ce qui borne un deplacement doit la lire — joueurs,
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

    /* Points de recolte (lot I) : { id, x, y, kind (0 cristal, 1 amas), hp,
       maxHp, prog }. Les eclats vivent SUR le joueur (p.eclats) et non en
       reserve commune : le marchand du lot K vend a chacun son budget. Ils
       meurent avec le GameState — la monnaie de manche ne se persiste pas. */
    this.harvests = [];
    this.harvestCd = CFG.HARVEST_MIN
      + Math.random() * (CFG.HARVEST_MAX - CFG.HARVEST_MIN);

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
    /* Boss VAINCUS cette manche (lot D) : le compte pour la monnaie, les kinds
       pour les jalons de premiere victoire. La progression vit cote serveur,
       mais c'est la simulation qui sait qui est mort. */
    this.bossKills = 0;
    this.bossKindsKilled = new Set();
    /* Duree du combat contre le BOSS FINAL, en secondes, ou 0 s'il n'a pas ete
       vaincu (lot W). Sur `GameState` et non sur l'entite : elle doit survivre a
       la mort du boss, c'est justement le moment ou elle devient interessante. */
    this.finalKill = 0;

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
    /* playerId -> { d, crit, x, y }. UNE seule table et non trois : la part
       critique et le POINT D'IMPACT accompagnent forcement le cumul, et trois
       Map a vider ensemble se seraient desynchronisees a la premiere oubliee.
       Une allocation par joueur et par intervalle d'instantane, soit quatre par
       50 ms pendant un combat de boss et rien du tout le reste du temps.

       `x`/`y` est le point d'impact du DERNIER coup de l'intervalle, et il
       existe pour les Jumeaux : ils partagent une reserve de vie, donc
       `_damage` redirige tout sur `boss`, et le chiffre flottant sortait
       toujours sur le premier des deux — on tirait sur l'un et le nombre
       s'affichait sur l'autre. La position est donc relevee AVANT la
       redirection, sur l'entite reellement touchee. */
    this.bossDmg = new Map();
    /* Le dernier coup resolu par `_damage` etait-il critique. Relu par le SEUL
       `_bulletHitEnemy`, immediatement apres l'appel — voir le commentaire du
       tirage. Un champ d'instance et non un retour de fonction : `_damage` a
       une trentaine d'appelants dont aucun ne veut savoir. */
    this.lastCrit = false;

    /* Pause de choix de cartes. GameState ne connait ni minuteur de salon ni
       reseau : il leve le drapeau a la fin d'une vague s'il reste des niveaux
       en attente, et c'est le serveur qui decide de ne plus appeler step(). */
    this.cardsPending = false;
    this.cardOffers = new Map();   // playerId -> [3 ids]
    this.cardsQuality = 1;         // qualite du tirage en cours
    /* Jalons de legendaire deja honores. Un jalon vaut une fois et pour toute
       la table : c'est ce qui empeche trois niveaux gagnes d'affilee de donner
       trois legendaires. */
    this.legendaryLevelDone = new Set();

    /* --- marchand (lot K) ----------------------------------------------------
       Meme modele que les cartes : `relicPending` stoppe la boucle du serveur,
       `relicOffers` est l'offre courante (une par joueur, comme `cardOffers`),
       et `relicLegendaryTaken` est la limite « une seule legendaire par manche,
       tous marchands confondus » — l'equivalent local de `legendaryWaveDone` :
       sans elle l'offre se regenererait et la borne sauterait. */
    this.relicPending = false;
    this.relicOffers = new Map();  // playerId -> [3 ids]
    this.relicLegendaryTaken = false;
    /* Un marchand par victoire de boss, jamais plus : sans ce drapeau, une
       victoire suivie de pres par une autre (boss final du lot N, ou une vague
       de boss dont le repit se termine pendant qu'une autre commence) ouvrirait
       deux ecrans d'affilee. Pose par _killBoss, consomme par openMerchant. */
    this.relicBossDue = false;

    /* --- boss final (lot N) --------------------------------------------------
       `finalDone` : le Noyau ne revient jamais, meme si la manche continue
       apres sa mort — sans lui, `_rosterCleared()` reste vrai et toute vague
       de boss suivante le rappellerait.
       `finalVictory` : l'entree du classement au temps, posee a sa mort et lue
       UNE fois par la salle (qui la persiste puis la vide). Elle vit ici et non
       dans la Room parce que c'est `state.time` qui fait foi — l'horloge
       autoritaire de la simulation, pas celle du serveur. */
    this.finalDone = false;
    this.finalVictory = null;

    this.time = 0;
    this.spawnAcc = 0;
    this.powerupCd = 8;
    this.eliteCd = CFG.ELITE_FROM;
    this.bossCount = 0;
    this.totalKills = 0;
    this.gameOver = false;
    this._nextId = 1;

    /* --- segments ------------------------------------------------------------
       LA MANCHE EST UNE CHRONOLOGIE, plus un enchainement de vagues. Six
       segments de TL_CFG.SEGMENT_TIME secondes de horde, cinq beats de 60 s
       par segment, le tout ecrit dans `timeline.js`.

       `hordeTime` ne compte QUE la horde : elle s'arrete pendant le combat de
       boss et pendant l'ecran de cartes (D1). C'est ce qui rend deux manches
       comparables minute par minute, quelle que soit la duree des combats.

       `tier`, l'index global du beat, A DISPARU au lot S. Le lot Q avait
       reindexe tout ce qui s'appuyait dessus sur le niveau d'equipe et lui
       avait laisse un seul lecteur — les seuils d'apparition des types
       (`ENEMY_TYPES.from`) ; le bestiaire les porte desormais en `minMin`, sur
       la minute de horde, et un champ que personne ne lit est un champ qu'on
       finira par croire vrai.
       `beatIndex()` reste dans `timeline.js` pour qui en aurait besoin. */
    /* ECHAUFFEMENT (briefing de classe). Secondes pendant lesquelles la
       simulation tourne — les joueurs se deplacent, visent, testent leurs
       competences — mais ou la HORDE est retenue : ni horloge de segment, ni
       apparition, ni tir. Tenir la horde plutot que la simulation entiere est ce
       qui permet a l'ecran de briefing d'avoir un bouton « continuer » : on le
       ferme, on marche sur la carte, et la manche commence quand elle doit.

       `this.time` ne court pas non plus : c'est l'horloge de la manche, celle du
       bilan et du CLASSEMENT au temps du boss final. Vingt secondes de promenade
       comptees comme de la survie rendraient deux parties incomparables —
       exactement ce que le classement mesure.

       Il vaut zero par defaut : un script de mesure qui construit un `GameState`
       a la main ne doit pas avoir a le savoir, sinon toutes les mesures du depot
       commenceraient par un silence. C'est la SALLE qui le leve, quand elle
       ouvre le briefing. */
    this.warmup = 0;

    this.segment = 1;
    this.hordeTime = 0;
    this.beat = 0;
    // La meteo du premier segment est posee ici et non annoncee : personne n'est
    // encore en jeu pour lire un bandeau, et le salon dit deja le biome. Les
    // suivantes passent par `_nextSegment`, qui annonce.
    this.weather = weatherFor(this.diffIndex, this.seed, 1);
    // Bord courant des geometries `front` et `pince`, et compteur de paquet de
    // `quatre-fronts` : tires au changement de beat, pas a chaque apparition —
    // un bord retire a chaque ennemi redonnerait la pression diffuse.
    this.beatSide = 0;
    this.packLeft = 0;
    this.packSide = 0;
    // Le boss sort dans `_boss`, qui tourne APRES `_segmentTick` dans le meme
    // tick. Le drapeau porte l'attente entre les deux.
    this.bossPending = false;
    this._beatCache = null;
    // Effectif de pression retenu et date de sa derniere baisse : voir
    // `aliveCrowd()`.
    this._crowdHeld = 1;
    this._crowdAt = 0;
    // Une manche va au bout de son script : six boss vaincus, la manche est
    // GAGNEE. Sans ce drapeau, le segment 7 n'aurait plus de script et la
    // horde tournerait sur un repli jusqu'a ce que quelqu'un tombe.
    this.victory = false;

    /* --- progression d'equipe -----------------------------------------------
       Commune, et non par joueur : voir le commentaire de LEVEL_MAX. Les
       montees se METTENT EN FILE et se consomment a la fin de la vague, jamais
       en plein combat — un ecran de choix qui s'ouvre pendant qu'on esquive
       n'est pas un choix, c'est une punition. */
    this.xp = 0;
    this.level = 1;
    this.levelFrom = 0;
    this.levelStep = CFG.LEVEL_XP_BASE;
    this.levelAt = CFG.LEVEL_XP_BASE;
    this.pendingLevels = 0;

    // Le premier beat n'est jamais « atteint » par le tick — il est deja
    // courant au premier pas. Sans cet appel, son bord d'apparition resterait
    // celui du constructeur et un premier beat silencieux ne forcerait aucun
    // bonus.
    this._startBeat();
  }

  /* `meta` (lot D) : ce que la progression permanente change pour CE joueur —
     `{ lines, confort, locked }` construit par le serveur depuis le profil.
     Nul pour un compte neuf comme pour un script de mesure : la simulation
     reste jouable seule, et une mesure sans profil est le « compte neuf » de
     reference. */
  addPlayer(id, name = "joueur", colorIndex = 0, cls = CLASS_DEFAULT, meta = null) {
    const def = classAt(cls);
    /* Pres du GROUPE, pas au centre geometrique : sur 4800 x 2700 le centre
       de la salle n'a aucun rapport avec l'endroit ou l'equipe joue, et un
       arrivant y serait seul, hors de tout ecran. Premier joueur : centre des
       bounds, qui vaut le centre de l'arene en debut de manche. */
    const at = this._teamCentroid();
    const p = {
      id, name, colorIndex,
      // Index dans CLASSES : c'est lui qui circule dans le snapshot. L'objet de
      // classe se relit par classAt(), jamais stocke ici — il contient des
      // chaines affichees, qui n'ont rien a faire dans la simulation.
      cls: CLASSES[cls] ? cls : CLASS_DEFAULT,
      x: at.x + (Math.random() - 0.5) * 140,
      y: at.y + (Math.random() - 0.5) * 140,
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
        relicPurge: 0,     // « Filtre purifiant » (lot K) : compte a rebours 10 s
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

      /* --- momentum (lot 6) --------------------------------------------------
         `power` est le multiplicateur de degats de l'INSTANT : elan, meute,
         carnage, dernier souffle. Il ne peut pas vivre dans `mods`, qui n'est
         recalcule qu'a la prise d'une carte, et il est releve une fois par tick
         plutot qu'a chaque coup — la meute demande de compter les ennemis
         proches, ce qui ne se paie pas quatre cents fois par seconde.
         Applique dans `_damage`, au point de passage unique : une nouvelle
         source de degats en herite sans qu'on y pense, exactement comme le vol
         de vie. Consequence assumee : `_playerPower` ne le voit pas, donc la
         pression des vagues ne monte pas avec un bonus transitoire — c'est le
         bon choix, la difficulte suivrait sinon un pic de quatre secondes. */
      power: 1,
      elanT: 0,            // secondes sans avoir ete touche
      rageStacks: 0,       // « Carnage »
      rageT: 0,
      pacteUsed: 0,        // « Pacte de fer » : le bouclier a deja ete donne
      /* Reliques (lot K) — drapeaux d'usage unique par manche, meme rege que
         `pacteUsed` : `relicBatteryUsed` (Batterie de secours, une recharge),
         `relicMemoireUsed` (Memoire gravee, une competence par VAGUE — le
         drapeau se remet a zero dans _startWave, pas ici). */
      relicBatteryUsed: 0,
      relicMemoireUsed: 0,

      selfReviveUsed: 0,
      commonStreak: 0,     // boss consecutifs sans mieux qu'une commune
      damageDealt: 0,      // pour que la contribution defensive se voie ailleurs
      healDealt: 0,        // meme raison, pour le soigneur
      eclats: 0,           // monnaie de manche (lot I) — jamais persistee
      /* Reliques du marchand (lot K). A COTE de p.mods, jamais dedans :
         `_recomputeMods()` rejoue tout le chargement a chaque carte prise, et
         une relique rangee dans mods disparaitrait au premier ecran de choix.
         C'est la meme rege que les etats et les minuteurs. La Map id->1 (le
         comptage sert pour « une seule relique de chaque ») et les effets a
         `mode` ajoutent leurs champs d'etat propres (batteryUsed, etc.). */
      relics: new Map(),

      /* --- competences ------------------------------------------------------
         Deux recharges seulement, quelle que soit la classe : le protocole
         transporte deux drapeaux, l'affichage montre deux icones, et une
         troisieme competence n'aurait pas de touche. `cd1` peut porter des
         charges (bombe double) : c'est la seule recharge du jeu qui se
         reaccumule au lieu de simplement descendre a zero. */
      cd1: 0,
      cd2: 0,
      /* La troisieme recharge (lot C) existe pour tout le monde, comme les
         cles de mods : elle ne sert que si `mods.skill3` est non nul, et un
         champ absent aurait donne NaN au premier decompte. */
      cd3: 0,
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
      skillUses: [0, 0, 0],

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

      /* --- provenance des degats subis (lot A) -------------------------------
         `lastSrc` est la derniere source encaissee : elle traverse le reseau
         pour que le chiffre rouge porte son icone. Elle n'est jamais remise a
         zero — le client ne la lit qu'a l'instant ou les PV baissent, donc une
         valeur perimee n'est jamais consultee, et la remettre a zero aurait
         coute un champ de plus a ecrire soixante fois par seconde.
         `hurtBy` cumule la manche entiere, par source. Il reste cote serveur et
         ne sort qu'au bilan : c'est la ou l'on comprend ses morts, et c'est
         aussi le meilleur outil d'equilibrage du depot — il dit si une
         mecanique tue ou si c'est la horde. */
      lastSrc: SRC_CONTACT,
      hurtBy: DAMAGE_SOURCES.map(() => 0),

      /* --- progression permanente (lot D) -----------------------------------
         `meta` porte les lignes equipees, `locked` les cartes que les jalons
         n'ont pas encore debloquees. `catalyseT` / `catalyseMul` sont l'etat
         de la ligne « Catalyse » du soigneur : poses par `_heal`, lus par
         `_momentum` — un bonus de l'instant, comme la meute. */
      meta,
      locked: meta && meta.locked
        ? (meta.locked instanceof Set ? meta.locked : new Set(meta.locked))
        : null,
      catalyseT: 0,
      catalyseMul: 1,
    };

    this.players.set(id, p);
    /* Les multiplicateurs de classe passent par le meme chemin que les cartes :
       tous les systemes lisent `p.mods`, aucun ne demande la classe du joueur.
       Sans ce recalcul a l'inscription, `mods.damageMul` valait 1 jusqu'a la
       premiere carte et le tank tapait comme un tireur pendant deux vagues. */
    this._recomputeMods(p);
    p.hp = p.maxHp;

    /* « Ravitaillement initial » (tronc de confort, lot D) : un bonus au sol
       des la vague 1, pose pres du joueur a l'inscription. Un bonus ordinaire
       du pool tournant — pas un choix, juste une avance sur le premier
       detour. */
    if (meta && meta.confort && meta.confort.ravitaillement) {
      const a = Math.random() * Math.PI * 2;
      // `_dropPoint` et non un clamp a la main : c'etait la seule pose de
      // bonus au sol qui ne passait pas par le point de passage unique.
      const at2 = this._dropPoint(p.x + Math.cos(a) * 120, p.y + Math.sin(a) * 120, 60);
      this.powerups.push({
        id: this._nextId++,
        type: this._randomPowerupType(),
        x: at2.x,
        y: at2.y,
        life: CFG.POWERUP_LIFE,
      });
    }
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

  offerCards(p, quality = this.cardsQuality, forceRare = false, jalon = 0) {
    // La classe filtre le pool : quatre cartes n'existent que pour elle, et
    // les huit autres n'ont jamais a apparaitre dans son tirage.
    // `jalon` ne vaut autre chose que 0 qu'au premier ecran atteint a partir
    // d'un niveau de jalon — c'est lui qui declenche la legendaire garantie.
    // `this.level` est le niveau COURANT, passe a chaque tirage : c'est lui qui
    // tient la troisieme competence hors des premiers ecrans (`minLevel`). A ne
    // pas confondre avec `jalon`, qui ne sert qu'a la legendaire garantie.
    // Lot D : les cartes encore verrouillees par les jalons du compte ne sont
    // jamais tirees, et la « Quatrieme offre » du tronc de confort elargit
    // l'ecran a quatre cases.
    const picks = drawCards(p.cards, quality, forceRare || p.commonStreak >= 2,
      classAt(p.cls).id, Math.random, jalon, this.level,
      { locked: p.locked, count: p.meta?.confort?.quatrieme ? 4 : 3 });
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
     la simulation se sert. `_startBeat` rappelle ce recalcul a chaque palier,
     sinon le « Cœur de forge » resterait fige au palier ou la carte a ete
     prise. */
  _recomputeMods(p) {
    const before = p.maxHp;
    const r = fullMods(p.cards, this._otherCards(p), p.cls, this.level);
    /* PROGRESSION PERMANENTE (lot D). `powerMods` garde le resultat de
       fullMods — cartes et classe, rien d'autre — et c'est LUI que lit
       `_playerPower` : la meta est exclue de la difficulte PAR CONSTRUCTION,
       jamais par soustraction. Les cartes restent absorbees par les vagues et
       les boss ; la puissance permanente est un gain net, borne par les
       emplacements. `applyMeta` copie l'objet a plat, les deux ne partagent
       donc jamais une reference. */
    p.powerMods = r.mods;
    if (p.meta && p.meta.lines) {
      const rr = applyMeta(r.mods, r.maxHp, classAt(p.cls).id, p.meta.lines);
      p.mods = rr.mods;
      p.maxHp = rr.maxHp;
    } else {
      p.mods = r.mods;
      p.maxHp = r.maxHp;
    }

    /* Reliques a PV bruts (lot K), apres la meta — le delta ci-dessous fait
       tout le travail : un achat ajoute les PV a la jauge. `flatHp` peut etre
       negatif (« Noyau instable », -10) : la contrepartie se lit a l'achat,
       et elle peut faire tomber un joueur deja tres bas — c'est le prix
       assume de la relique, elle l'affiche en evidence. */
    const flat = this._relicSum(p, "flatHp");
    if (flat !== 0) p.maxHp = Math.max(1, p.maxHp + flat);

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

  /* EFFECTIF DE PRESSION — point de passage unique, comme `assignColors()` en a
     un et pour la meme raison : sinon chaque appel refait le test a sa maniere.

     Les termes de pression comptent les joueurs VIVANTS. `_teamPower()` etait
     une moyenne sur tous les joueurs, a terre compris, et les PV de boss
     suivaient `players.size` : une equipe de quatre dont deux sont morts
     affrontait un boss calibre pour quatre. Sur une manche de trois minutes
     c'etait du bruit ; sur trente minutes et six boss, c'est structurel.

     HYSTERESIS de quelques secondes : une mise a terre de deux secondes ne doit
     pas faire osciller la formule, et un compte qui remonte au relevement ferait
     grossir le boss en pleine phase. On ne descend donc qu'apres un delai, mais
     on remonte IMMEDIATEMENT — le sens sur est celui qui ne rend pas le jeu
     plus facile par accident.

     PIEGE SYMETRIQUE, a ne pas confondre : la normalisation de l'EXPERIENCE
     (`joueurs^WAVE_CROWD_EXP` dans `_addXp`) compte les joueurs CONNECTES et
     non les vivants. Sinon une equipe qui perd deux joueurs voit ses paliers
     baisser au moment ou elle tue moins — un cadeau exactement au mauvais
     moment, et une boucle de retroaction que D2 refuse. */
  aliveCrowd() {
    const n = Math.max(1, this.aliveCount());
    if (n >= this._crowdHeld) {
      this._crowdHeld = n;
      this._crowdAt = this.time;
    } else if (this.time - this._crowdAt >= CFG.CROWD_HYSTERESIS) {
      this._crowdHeld = n;
      this._crowdAt = this.time;
    }
    return this._crowdHeld;
  }

  step(dt, inputs) {
    if (this.gameOver) return;

    /* ECHAUFFEMENT : tout tourne SAUF la vague et l'horloge de manche. Les
       joueurs bougent donc pendant le briefing, mais rien n'apparait et le
       chronometre ne demarre pas — voir `warmup` dans le constructeur. */
    const echauffement = this.warmup > 0;
    if (echauffement) this.warmup = Math.max(0, this.warmup - dt);
    else this.time += dt;

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
    /* L'ECHAUFFEMENT RETIENT LA HORDE, et deux choses seulement : l'horloge de
       segment et les apparitions. Le reste de la simulation tourne, sinon le
       briefing serait une image figee au lieu d'une carte sur laquelle on
       marche. Le tir est retenu ailleurs, dans `_players` — pour la meme raison
       et avec le meme mot. */
    if (!echauffement) {
      this._segmentTick(dt);
      this._spawner(dt);
    }
    // Les competences tournent avant les ennemis : une bombe qui explose doit
    // le faire sur les positions de l'image precedente, celles que le joueur
    // avait a l'ecran quand il l'a lancee.
    this._skills(dt);
    this._effects(dt);
    this._powerups(dt);
    this._harvests(dt);
    this._turrets(dt);
    this._drones(dt);
    this._enemies(dt);
    // Les dangers du biome APRES les ennemis et avant le boss : ils lisent des
    // positions deja resolues pour cette image, comme les zones.
    this._hazards(dt);
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
    // Une seule lecture de la meteo pour toute la passe : elle est globale, la
    // relire par joueur ne dirait rien de plus.
    const gust = this._gust(dt);
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
      p.cd3 = Math.max(0, p.cd3 - dt);
      p.catalyseT = Math.max(0, p.catalyseT - dt);
      if (p.catalyseT <= 0) p.catalyseMul = 1;
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
            // « Charge » (méta, lot D) retire des secondes AVANT skillCdMul,
            // avec un plancher — les deux reductions cumulees ne doivent pas
            // rendre la bombe permanente.
            if (p.bombStock < stockMax) {
              p.cd1 = Math.max(2, SKILL_CFG.DPS_BOMB_CD - p.mods.bombCdCut)
                * p.mods.skillCdMul;
            }
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
      if (p.rageStacks > 0) {
        p.rageT -= dt;
        // Meme modele que la frenesie : les cumuls tombent d'un bloc a
        // l'echeance et non un par un. Une decroissance par cumul demandait un
        // minuteur par cumul, pour un effet que personne ne distingue.
        if (p.rageT <= 0) p.rageStacks = 0;
      }
      p.elanT += dt;
      this._momentum(p);

      /* Le bouclier des cartes se remplit d'un coup apres le delai : une
         regeneration continue transformait chaque accrochage en attente, alors
         que le seuil recompense le fait de decrocher completement.
         « Pacte de fer » coupe ce remplissage — c'est tout le contrat de la
         carte — mais laisse le PREMIER : un bouclier qui n'existe jamais ne se
         perd pas, il ne serait qu'un multiplicateur de degats deguise. */
      if (p.mods.shieldPool > 0 && !p.downed
          && T.shieldRegen <= 0 && p.shield < p.mods.shieldPool
          && !(p.mods.noShieldRegen && p.pacteUsed)) {
        p.shield = p.mods.shieldPool;
        if (p.mods.noShieldRegen) p.pacteUsed = 1;
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
      if (inp && inp.s3) this._skill3(p);

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
        /* ETAT DU SOL (lot V). Le ralentissement multiplie la vitesse, le
           glissement change la FORMULE — on rejoint la consigne au lieu de la
           prendre. Les deux se lisent ici, une seule fois, et le client rejoue
           exactement les memes lignes dans sa prediction. */
        const g = this.hazards.length ? this._ground(p.x, p.y) : null;
        /* Relique « Coeur-machine » (lot K) : la vitesse est FIXEE a sa valeur
           de base, tous les bonus de vitesse des cartes sont annules — c est
           la contrepartie, elle doit peser. Elle remplace le mod au lieu de le
           multiplier, sinon l annulation serait incomplete.
           Le sol du biome, lui, s applique PAR-DESSUS : il ne vient pas du
           chargement du joueur, c est le terrain — la relique annule ce que le
           joueur a construit, pas ce sur quoi il marche. */
        const speedMul = p.relics.has("coeur_machine") ? 1 : p.mods.speedMul;
        const sp = CFG.PLAYER_SPEED * speedMul
          * (p.statuses.has(STATUS_ROOT) ? 1 - STATUS_CFG.ROOT_SLOW : 1)
          * (g ? g.slow : 1);
        if (this.slipT > 0 || (g && g.slip)) {
          /* Sol glissant du Metronome : la vitesse REJOINT la consigne au lieu
             de la prendre. Un facteur applique a la position aurait glisse sans
             qu'on puisse l'anticiper ; avec une vitesse portee, on lance son
             deplacement a l'avance, ce qui est une competence et pas une taxe.
             La prediction du client rejoue exactement la meme formule. */
          // Le sol du biome glisse MOINS que celui du Metronome : le sien dure
          // douze secondes et se subit, celui-ci est permanent sur sa flaque et
          // doit rester traversable a volonte.
          const k = Math.min(1, (this.slipT > 0 ? BOSS_CFG.SLIP_ACCEL : BIOME_CFG.SLIP_ACCEL) * dt);
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
      // Bourrasque : dans la passe de deplacement, avant les limites et avant
      // les obstacles — appliquee apres, elle aurait pousse dans les piliers.
      if (gust && !p.downed) { p.x += gust.x; p.y += gust.y; }
      // Les limites viennent de `bounds` et non de CFG.ARENA_W/H : pendant une
      // constriction, l'arene jouable est plus petite que l'arene dessinee.
      this._clampToBounds(p, CFG.PLAYER_RADIUS);
      this._wallBlock(p, wasX, wasY, CFG.PLAYER_RADIUS);
      if (this.obstacles.length) this._obstacleBlock(p, wasX, wasY, CFG.PLAYER_RADIUS);

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
      // « Adrenaline » : en division comme tous les autres bonus de cadence.
      // Additionner les reductions donne un intervalle nul des la troisieme.
      if (p.mods.lowHpRate > 0 && p.hp <= p.maxHp * CARD_CFG.ADRENALINE_HP) {
        interval /= 1 + p.mods.lowHpRate;
      }
      if (p.buffRate > 0) interval *= CFG.BUFF_RATE_MUL;
      // Surcharge et bascule vive : deux bonus de cadence de classe, tous deux
      // en division comme la frenesie — additionner les reductions donnait un
      // intervalle nul des la moitie de la fenetre.
      if (p.odBonus > 0) interval /= 1 + p.odBonus;
      if (p.healSwapBoost > 0) interval /= 1 + CARD_CFG.BASCULE_VIVE_RATE;
      /* Relique « Ressort use » (lot K) : reduction FIXE de l'intervalle, en
         secondes. Soustraite apres toutes les divisions, avant le plancher —
         une valeur brute ne doit pas etre diluee par les bonus de cadence.
         `rateFlat` est negatif dans la table (-0,03) : ajouter la somme la
         soustrait bien de l'intervalle. */
      interval = Math.max(CFG.FIRE_INTERVAL_MIN, interval + this._relicSum(p, "rateFlat"));

      /* PAS DE TIR PENDANT L'ECHAUFFEMENT. Le tir part tout seul — c'est la
         regle du jeu — donc sans cette garde le briefing se lisait derriere une
         arene ou quatre joueurs arrosaient le vide en continu : du bruit, des
         projectiles plein l'ecran et pas une seule cible. L'echauffement sert a
         se placer, pas a vider son chargeur.

         La recharge, elle, continue de descendre juste au-dessus : on entre en
         vague l'arme prete, jamais avec un temps mort qu'on n'aurait pas
         choisi. */
      if (p.fireCd <= 0 && this.warmup <= 0) {
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
  /* Somme d'une cle a valeur brute des reliques du joueur (lot K). La table
     RELICS est la source de verite : aucune constante recopiee, un reglage se
     fait dans reliques.js et rien ne derive ici. `flatDamage` s'ajoute a la
     base d'un tir AVANT les multiplicateurs ; `bossDamage` au montant final
     d'un degat contre le boss — deux cles, deux points d'application. */
  _relicSum(p, key) {
    let s = 0;
    for (const id of p.relics.keys()) {
      const r = relicById(id);
      if (r && r[key]) s += r[key];
    }
    return s;
  }

  _shoot(p) {
    /* Reliques a valeur brute (lot K) : le bonus s'ajoute a la BASE, AVANT les
       multiplicateurs — c'est ce qui rend « +8 degats » utile meme sur une
       build sans aucune carte de degats. Le multiplicateur de la classe
       (0,80 pour le Rempart) s'applique donc au total, pas a la base seule :
       une relique de degats vaut autant pour toutes les classes, ce qui est
       precisement l'axe de puissance neuf que les cartes ne donnent pas. */
    const base = (CFG.BULLET_DAMAGE + this._relicSum(p, "flatDamage")) * p.mods.damageMul
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

  /* Relique « Memoire gravee » (lot K) : la PREMIERE competence utilisee a
     chaque vague a sa recharge immediatement reinitialisee. Le drapeau est
     leve ici et remis a zero dans `_startWave` — une vague est la frontiere
     naturelle, pas un temps fixe. La recharge depend de la classe :
     le Rempart reprend son rempart, le Soigneur rebascule a volonte, le
     Tireur retrouve sa charge de bombe. */
  _relicMemoire(p) {
    if (p.relicMemoireUsed || !p.relics.has("memoire_gravee")) return;
    p.relicMemoireUsed = 1;
    switch (classAt(p.cls).id) {
      case "tank": p.cd1 = 0; break;
      case "soigneur": p.healSwapCd = 0; break;
      default:
        // La bombe se reaccumule par le bas dans `_players` : rendre la
        // charge, c'est incrementer le stock, pas mettre cd1 a zero — la
        // recharge ne se rearme qu'en traversant la boucle. Meme plafond que
        // la reaccumulation (`1 + mods.bombCharges`), sinon la relique
        // contournerait la limite de « Double charge ».
        p.bombStock = Math.min(1 + p.mods.bombCharges, p.bombStock + 1);
        p.cd1 = 0;
    }
  }

  _skill1(p) {
    if (p.downed) return;
    switch (classAt(p.cls).id) {
      case "tank": {
        if (p.cd1 > 0) return;
        /* `skillCdMul` s'applique a l'affectation de chaque recharge de CLASSE
           et nulle part ailleurs : l'esquive a deja sa famille (« Celerite »),
           et cumuler les deux sur le meme bouton l'aurait rendue permanente. */
        p.cd1 = SKILL_CFG.TANK_BULWARK_CD * p.mods.skillCdMul;
        p.skillUses[0]++;
        /* Deux remparts pour un seul bouton, et c'est « Ancrage » qui tranche :
           celui qui SUIT le tank (defaut) et celui qu'on POSE (la carte). Le
           choix est fait a la pose et grave sur l'entite : le relire a chaque
           image aurait fait bouger un rempart deja pose le jour ou une carte
           arrive en cours de manche. */
        const anchor = p.mods.bulwarkAnchor > 0;
        const r = (anchor ? CARD_CFG.ANCRAGE_RADIUS : SKILL_CFG.TANK_BULWARK_RADIUS)
          * p.mods.bulwarkRadiusMul;
        const life = (anchor ? CARD_CFG.ANCRAGE_TIME : SKILL_CFG.TANK_BULWARK_TIME)
          + p.mods.bulwarkTime;
        this.bulwarks.push({
          id: this._nextId++, x: p.x, y: p.y, r, life, max: life, owner: p.id,
          anchor: anchor ? 1 : 0,
          rate: anchor ? CARD_CFG.ANCRAGE_SHIELD_MUL : 1,
          /* Purge a l'entree, UNE FOIS par joueur et par pose : sans cette
             memoire, rester dans la zone purgeait un etat par image et le
             rempart remplacait le soigneur a lui seul. Elle donne une raison de
             plus de s'y regrouper, surtout aux equipes qui n'en ont pas. */
          purged: new Set(),
        });
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r, life: 0.5, max: 0.5, kind: 9,
        });
        this._relicMemoire(p);
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
          p.healSwapCd = SKILL_CFG.HEAL_MODE_SWAP_CD * p.mods.skillCdMul;
        }
        this._relicMemoire(p);
        return;
      }

      default: {
        // Le tireur garde une reserve de charges : « Double charge » ne rend
        // pas la bombe plus frequente, elle permet d'en garder une pour le
        // moment ou la vague se regroupe.
        if (p.bombStock <= 0) return;
        p.bombStock--;
        // Meme formule que la reaccumulation dans `_players` : « Charge »
        // (méta) retire ses secondes avant skillCdMul, plancher compris.
        if (p.cd1 <= 0) {
          p.cd1 = Math.max(2, SKILL_CFG.DPS_BOMB_CD - p.mods.bombCdCut)
            * p.mods.skillCdMul;
        }
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
          // Borne aux BOUNDS comme le vol lui-meme (voir la boucle des
          // bombes) : un cercle d'atterrissage dessine dans la couronne
          // mortelle annoncerait une explosion la ou elle n'aura pas lieu.
          tx: Math.min(Math.max(p.x + p.aimX * range, this.bounds.x0), this.bounds.x1),
          ty: Math.min(Math.max(p.y + p.aimY * range, this.bounds.y0), this.bounds.y1),
          owner: p.id,
        });
        this._relicMemoire(p);
      }
    }
  }

  _skill2(p) {
    if (p.downed || p.cd2 > 0) return;
    switch (classAt(p.cls).id) {
      case "tank": {
        const dur = SKILL_CFG.TANK_TAUNT_TIME + p.mods.tauntTime;
        p.cd2 = Math.max(5, (SKILL_CFG.TANK_TAUNT_CD + p.mods.tauntCd) * p.mods.skillCdMul);
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
        this._relicMemoire(p);
        return;
      }

      case "soigneur": {
        const r = SKILL_CFG.HEAL_WAVE_RADIUS * p.mods.healWaveRadiusMul;
        p.cd2 = SKILL_CFG.HEAL_WAVE_CD * p.mods.skillCdMul;
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
        this._relicMemoire(p);
        return;
      }

      default: {
        p.cd2 = SKILL_CFG.DPS_OVERDRIVE_CD * p.mods.skillCdMul;
        p.skillUses[1]++;
        p.odT = SKILL_CFG.DPS_OVERDRIVE_TIME + p.mods.overdriveTime;
        // On ne repart pas de zero si un reliquat de la fenetre precedente
        // descend encore : la carte « Surcharge prolongee » recompenserait
        // sinon d'attendre que le bonus soit retombe.
        p.odBonus = Math.max(p.odBonus, SKILL_CFG.DPS_OVERDRIVE_BASE);
        this._relicMemoire(p);
      }
    }
  }

  /* Troisieme competence (lot C). Elle n'existe que si sa carte a ete tiree :
     `mods.skill3` porte le palier (1 rare, 2 epique, 3 legendaire), zero sinon.
     Meme modele que les deux autres — le client DEMANDE, le serveur decide, le
     drapeau `s3` est ponctuel et remis a zero par la boucle du serveur apres
     chaque tick. `areaMul` s'applique aux rayons et `skillCdMul` aux recharges,
     exactement comme pour les competences de base : c'est ce qui rend le palier
     rare viable face au legendaire une fois les cartes de recharge prises. */
  _skill3(p) {
    if (p.downed || p.cd3 > 0) return;
    const tier = p.mods.skill3;
    if (tier <= 0) return;

    switch (classAt(p.cls).id) {
      case "tank": {
        const c = CARD_CFG.SKILL3_ANCRE[tier - 1];
        p.cd3 = c.cd * p.mods.skillCdMul;
        p.skillUses[2]++;
        const r = c.r * p.mods.areaMul;
        this.anchors.push({
          id: this._nextId++, x: p.x, y: p.y, r,
          life: c.time, max: c.time, owner: p.id, vuln: c.vuln,
          /* Ennemis captures : la laisse ne retient que ceux qui sont ENTRES
             dans le rayon, jamais toute l'arene — un Set d'identifiants, comme
             les purges du rempart. Il n'est pas nettoye des morts : un
             identifiant d'ennemi ne se reutilise jamais dans une manche. */
          held: new Set(),
        });
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r, life: 0.5, max: 0.5, kind: 9,
        });
        return;
      }

      case "soigneur": {
        const c = CARD_CFG.SKILL3_SANCTUAIRE[tier - 1];
        p.cd3 = c.cd * p.mods.skillCdMul;
        p.skillUses[2]++;
        const r = c.r * p.mods.areaMul;
        this.sancts.push({
          id: this._nextId++, x: p.x, y: p.y, r,
          life: c.time, max: c.time, owner: p.id,
          heal: c.heal, purge: c.purge,
          // Purge a l'entree (palier legendaire), UNE FOIS par joueur et par
          // pose : la meme memoire que le rempart, pour la meme raison.
          purged: new Set(),
        });
        this.effects.push({
          id: this._nextId++, x: p.x, y: p.y, r, life: 0.45, max: 0.45, kind: 11,
        });
        return;
      }

      default: {
        /* Salve. Le verrouillage se fait dans un cone vers la visee et touche a
           coup sur : c'est la reponse aux tireurs qui gardent leurs distances,
           la faiblesse structurelle de la visee manuelle. SANS CIBLE, PAS DE
           RECHARGE : une volee dans le vide punirait la lecture du terrain que
           la competence est censee recompenser. */
        const c = CARD_CFG.SKILL3_SALVE[tier - 1];
        const a0 = Math.atan2(p.aimY, p.aimX);
        const range = CARD_CFG.SKILL3_SALVE_RANGE;
        const near = [];
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const dx = e.x - p.x, dy = e.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > range * range) continue;
          if (Math.abs(this._angleDiff(Math.atan2(dy, dx), a0))
              > CARD_CFG.SKILL3_SALVE_SPREAD) continue;
          near.push({ e, d2 });
        }
        if (near.length === 0) return;
        near.sort((a, b) => a.d2 - b.d2);

        p.cd3 = c.cd * p.mods.skillCdMul;
        p.skillUses[2]++;
        /* Les degats passent par `_damage`, au point de passage unique : la
           salve critique donc comme une balle, sans le savoir. Pas de boss dans
           les cibles — comme l'execution, un verrouillage garanti applique a
           une reserve de vie de boss changerait la nature du combat. */
        const dmg = CFG.BULLET_DAMAGE * p.mods.damageMul * p.mods.barrelDamageMul * c.mul;
        for (let i = 0; i < near.length && i < c.targets; i++) {
          const e = near[i].e;
          // La Vulnerabilite s'applique AVANT les degats, comme « Detonateur » :
          // sinon le palier ne vaut rien sur une cible que la salve tue.
          if (c.vuln) e.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
          this._damage(e, dmg, p.id);
          this.effects.push({
            id: this._nextId++, x: e.x, y: e.y, r: 16,
            life: 0.3, max: 0.3, kind: 13, x2: p.x, y2: p.y,
          });
        }
      }
    }
  }

  /* Soin d'un joueur par un autre. Point de passage unique, comme `_hurt` pour
     les degats : le surplus en bouclier, le retour de transfusion et le
     comptage y sont branches une seule fois, et une future source de soin en
     heritera sans qu'on y pense. */
  _heal(healer, target, amount) {
    if (amount <= 0 || target.downed) return 0;
    // « Flux » (méta, lot D) : multiplicateur des soins prodigues, applique au
    // point de passage unique — toute source de soin en herite sans le savoir.
    amount *= healer.mods.healGivenMul ?? 1;

    /* « Catalyse » (méta, lot D) : la cible soignee gagne un bonus de degats
       bref. Pose ICI et lu par `_momentum`, comme la meute — c'est un bonus de
       l'instant, pas un mod. Jamais sur soi : la ligne rend le soigneur
       offensif INDIRECTEMENT, c'est tout son contrat. */
    if ((healer.mods.catalyse ?? 0) > 0 && healer !== target) {
      target.catalyseT = PROG_CFG.CATALYSE_TIME;
      target.catalyseMul = Math.max(target.catalyseMul, 1 + healer.mods.catalyse);
    }

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
    // « Portee » (méta, lot D) : vitesse ET portee du seul faisceau de soin —
    // les cartes de balles du soigneur profitent deja a son tir normal.
    const speed = CFG.BULLET_SPEED * p.mods.bulletSpeedMul * (p.mods.healBeamMul ?? 1);
    this.bullets.push({
      id: this._nextId++,
      x: p.x + dx * (CFG.PLAYER_RADIUS + 2),
      y: p.y + dy * (CFG.PLAYER_RADIUS + 2),
      vx: dx * speed, vy: dy * speed,
      life: CFG.BULLET_LIFE * p.mods.bulletLifeMul * (p.mods.healBeamMul ?? 1),
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
          // « Releve » (méta, lot D) : des PV plats en plus, ceux du SAUVETEUR
          // — comme le ratio, c'est sa ligne qui aide, pas celle du tombe.
          p.hp = Math.min(p.maxHp, Math.round(p.maxHp * Math.max(CFG.REVIVE_HP_RATIO,
            owner ? owner.mods.reviveHpRatio : 0))
            + (owner ? owner.mods.reviveHpBonus ?? 0 : 0));
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
       coup a la pose : la horde converge exactement la, et donner le bouclier a
       l'entree aurait fait du bouton un soin instantane.

       LE REMPART SUIT SON TANK, sauf s'il est ancre. La version figee ne
       survivait pas a l'usage : le tank qui va chercher la horde pour la ramener
       est celui qui ne peut jamais rester dans sa propre zone, et ses allies
       n'ont aucune raison de tenir un disque au milieu de l'arene. Le suivi est
       une simple recopie de position — l'entite reste une entite du monde, avec
       son identifiant, sa duree et son ensemble de purges, et le client n'a rien
       de nouveau a lire : il dessine deja la position transmise.
       Un proprietaire deconnecte ou a terre laisse le rempart ou il est : la
       zone posee par un tank qui vient de tomber est exactement ce qui permet a
       l'equipe de le relever. */
    const kept = [];
    for (const bw of this.bulwarks) {
      bw.life -= dt;
      const owner = this.players.get(bw.owner);
      if (!bw.anchor && owner && !owner.downed) { bw.x = owner.x; bw.y = owner.y; }
      const gain = SKILL_CFG.TANK_BULWARK_SHIELD_RATE * (bw.rate ?? 1) * dt;

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

    /* Ancres (lot C). Le RALENTISSEMENT s'applique dans `_enemies`, comme le
       givre — c'est la que la vitesse se calcule. Ici : la capture, la laisse
       et la Vulnerabilite du palier legendaire. `_skills` tourne avant
       `_enemies`, la laisse rattrape donc le deplacement de l'image PRECEDENTE
       — un depassement d'une image, invisible a 60 Hz, et aucune double
       resolution. */
    if (this.anchors.length) {
      const keptAnchors = [];
      for (const an of this.anchors) {
        an.life -= dt;
        const leash = an.r * CARD_CFG.SKILL3_ANCRE_LEASH;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const d2 = (e.x - an.x) ** 2 + (e.y - an.y) ** 2;
          if (d2 <= an.r * an.r) an.held.add(e.id);
          else if (an.held.has(e.id) && d2 > leash * leash) {
            const d = Math.sqrt(d2) || 1;
            e.x = an.x + (e.x - an.x) / d * leash;
            e.y = an.y + (e.y - an.y) / d * leash;
          }
          // Palier legendaire : les ennemis retenus restent Vulnerables tant
          // que l'ancre tient — le minuteur est relance a chaque tick, il
          // expire donc VULNERABLE_TIME apres la sortie ou la fin de l'ancre.
          if (an.vuln && an.held.has(e.id)) {
            e.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
          }
        }
        if (an.life > 0) keptAnchors.push(an);
      }
      this.anchors = keptAnchors;
    }

    /* Sanctuaires (lot C). Le soin passe par `_heal`, point de passage unique —
       surplus en bouclier et comptage compris. La destruction des projectiles
       ennemis vit dans `_shots`, la ou ils avancent. Un proprietaire
       deconnecte laisse son dome finir sa vie : la cible se soigne alors « en
       son nom », ce qui ne fausse qu'un compteur de bilan. */
    if (this.sancts.length) {
      const keptSancts = [];
      for (const sa of this.sancts) {
        sa.life -= dt;
        const owner = this.players.get(sa.owner);
        for (const p of this.players.values()) {
          if (p.downed) continue;
          if ((p.x - sa.x) ** 2 + (p.y - sa.y) ** 2 > sa.r * sa.r) continue;
          if (sa.purge && !sa.purged.has(p.id)) {
            sa.purged.add(p.id);
            this._purgeStatus(p);
          }
          this._heal(owner ?? p, p, sa.heal * dt);
        }
        if (sa.life > 0) keptSancts.push(sa);
      }
      this.sancts = keptSancts;
    }

    // Bombes en vol. Le delai est essentiel : sans lui, c'est un clic gagnant
    // sans anticipation.
    const flying = [];
    for (const bo of this.bombs) {
      bo.t -= dt;
      bo.x += bo.vx * dt;
      bo.y += bo.vy * dt;
      this._clampToBounds(bo);
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
    // « Charge » (méta, lot D) s'ajoute a areaMul : les deux rayons se
    // composent, comme partout ou areaMul multiplie une constante.
    const r = SKILL_CFG.DPS_BOMB_RADIUS
      * (owner ? owner.mods.areaMul * (owner.mods.bombRadiusMul ?? 1) : 1);

    this.effects.push({
      id: this._nextId++, x: bo.x, y: bo.y, r, life: 0.4, max: 0.4, kind: 12,
    });
    // « Singularite » : l'aspiration est posee AVANT les degats, sinon elle
    // deplacerait des ennemis deja morts et le regroupement ne se verrait que
    // sur les survivants du bord.
    this._areaPull(bo.x, bo.y, r, bo.owner);

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
    /* L'entite REELLEMENT touchee, relevee avant la redirection : c'est elle qui
       porte le chiffre flottant. Sans ca, frapper le second Jumeau faisait sortir
       le nombre sur le premier. */
    const struck = target;
    /* Relique « Coeur de Ravageur » (lot K) : degats bruts contre les boss
       uniquement. Teste sur la cible AVANT la redirection des Jumeaux — une
       balle qui frappe le second jumeau blesse bien le boss. Valeur brute :
       ajoutee au montant final, apres tout ce qui l'a multiplie, et c'est
       exactement la que spec K5 la veut. */
    if ((struck === this.boss || struck === this.boss2) && ownerId) {
      const owner = this.players.get(ownerId);
      if (owner) amount += this._relicSum(owner, "bossDamage");
    }
    if (this.boss2 && target === this.boss2) target = this.boss;
    /* Vulnerabilite (« Detonateur »). Elle vit sur une echeance absolue et non
       sur un minuteur decompte : un champ de plus a faire descendre sur chacun
       des 200 ennemis a chaque image, pour un etat qui ne concerne que douze
       d'entre eux pendant quatre secondes, ne se justifiait pas. Le lot 3
       reprendra cet etat avec son icone et sa purge. */
    if (target.vulnUntil > this.time) amount *= CARD_CFG.VULNERABLE_MUL;
    /* AURA (lot S). La reduction est relevee une fois par tick par `_auraPass`
       et lue ICI, au point de passage unique — comme la Vulnerabilite juste
       au-dessus, comme le critique et le vol de vie juste en dessous. Une nova,
       une lame orbitale et une balle sont donc toutes les trois absorbees sans
       qu'aucune ne le sache. Le boss n'a pas le champ, donc il ne paie rien. */
    if (target.aura > 0) amount *= 1 - target.aura;
    /* Instant du dernier degat DIRECT, pour la rupture de soin du medic. Un
       champ ecrit sur les seuls ennemis qui en ont un — le test coute une
       lecture de propriete absente ailleurs, la ou une liste des touches
       recentes aurait coute une allocation par impact. */
    if (target.hitAt !== undefined && !overTime) target.hitAt = this.time;
    const owner = this.players.get(ownerId);
    /* COUP CRITIQUE. Le tirage se fait ICI et nulle part ailleurs, pour la meme
       raison que le vol de vie : une nova, une lame orbitale et une balle
       critiquent donc toutes les trois sans qu'aucune ne le sache. Un degat
       CONTINU en est exclu — une brulure qui tire soixante fois par seconde
       critiquerait a tous les coups en moyenne, et le critique cesserait d'etre
       un evenement.
       Le drapeau est relu juste apres l'appel par `_bulletHitEnemy` (Sentence
       capitale : les critiques traversent). C'est un retour de fonction
       deguise, et c'en est un a dessein : `_damage` est appele par une trentaine
       d'endroits dont aucun ne veut savoir ce qui s'est passe. */
    this.lastCrit = false;
    if (owner) {
      amount *= owner.power;
      if (!overTime && Math.random() < owner.mods.critChance) {
        this.lastCrit = true;
        amount *= owner.mods.critMul;
        /* « Sentence capitale ». La Vulnerabilite cote ennemi est la meme que
           celle du Detonateur : une echeance absolue sur la cible, lue en haut
           de cette methode. Un critique qui prepare le coup suivant, c'est ce
           qui fait de l'axe une chaine plutot qu'un multiplicateur. */
        if (owner.mods.critVuln) target.vulnUntil = this.time + CARD_CFG.VULNERABLE_TIME;
      }

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
        let cumul = this.bossDmg.get(ownerId);
        if (!cumul) this.bossDmg.set(ownerId, cumul = { d: 0, crit: 0, x: 0, y: 0 });
        cumul.d += amount;
        // Part critique du cumul, pour que le chiffre flottant se distingue.
        // Un instantane agrege plusieurs touches : le client ne demande donc
        // pas « ce coup etait-il critique » mais « ce paquet en contient-il un ».
        if (this.lastCrit) cumul.crit += amount;
        /* Point d'impact du DERNIER coup de l'intervalle, sur l'entite frappee et
           non sur le porteur de la reserve de vie. Le dernier et non une moyenne :
           deux Jumeaux touches dans le meme intervalle donneraient un chiffre a
           mi-chemin, c'est-a-dire sur aucun des deux. */
        cumul.x = struck.x;
        cumul.y = struck.y;
      }
      if (owner.mods.lifesteal > 0) this._lifesteal(owner, amount * owner.mods.lifesteal);
    }

    /* EXPERIENCE DU BOSS. Un ennemi credite sa valeur a la mort ; le boss ne
       meurt qu'une fois, donc il credite EN CONTINU, AU PRORATA DES DEGATS —
       `BOSS_XP_BASE` reparti sur sa reserve de vie. Un palier entier qui saute
       d'un coup a la mort se lirait comme un bug, et le surplus du coup fatal ne
       doit rien rapporter : sinon une nova de fin de combat vaudrait un niveau.

       LE PRORATA, ET NON UNE FRACTION DES PV. C'etait `35 % des degats portes`,
       ce qui marchait tant que l'experience se comptait en PV ; dans la nouvelle
       unite ca ferait du boss la seule source qui compte — quelques milliers de
       PV contre une dizaine de points par grunt. La valeur est donc ECRITE et
       repartie, exactement comme celle d'un type l'est dans le bestiaire.

       Ici et non chez les appelants, comme le cumul de `bossDmg` juste au-dessus
       et pour la meme raison : une nouvelle source de degats est comptee sans
       qu'on y pense. Hors du test `if (owner)` : un degat sans proprietaire
       compte aussi, exactement comme un kill sans proprietaire. Les structures
       de mecanique (cage, grappe) n'en sont pas — elles ne sont pas `this.boss`. */
    if (target === this.boss && target.maxHp > 0) {
      const part = Math.min(amount, Math.max(0, target.hp)) / target.maxHp;
      this._addXp(part * CFG.BOSS_XP_BASE * this._xpLevelMul());
    }

    target.hp -= amount;

    /* PLANCHER DE BARRE — la moitie qui manque au minuteur de `_bossBars`.
       Retarder la RUPTURE ne suffit pas : les PV, eux, continuaient de descendre
       et le boss mourait avant d'avoir joue son repertoire — mesure a puissance
       5,71 : des combats de 27 s et trois barres sur cinq seulement.

       Les PV sont donc BORNES au plancher de la barre courante et l'exces est
       MIS DE COTE, jamais perdu : il s'applique d'un coup a l'echeance, quand
       `_bossBars` casse la barre. Rien ne disparait, la rupture est differee —
       c'est la difference entre « le boss encaisse moins » et « le boss encaisse
       plus tard », et seule la seconde est honnete envers le joueur.

       La DERNIERE barre n'est jamais bornee : sinon le boss serait immortel. */
    if (target === this.boss) {
      // Dernier a l'avoir touche : c'est lui qui recevra le credit si le boss
      // tombe sur les degats mis de cote, resolus dans `_bossBars`.
      target.lastHitBy = ownerId;
      if (target.phase < target.bars - 1) {
        const plancher = target.maxHp - (target.phase + 1) * target.barHp;
        if (target.hp < plancher) {
          target.bank = (target.bank ?? 0) + (plancher - target.hp);
          target.hp = plancher;
        }
      } else if (target.kind === BOSS_FINAL
                 && target.fightT - target.lastBreak < BOSS_CFG.FINAL_BAR_DWELL) {
        /* LA DERNIERE BARRE DU FINAL A UN PLANCHER ELLE AUSSI (lot W), et c'est
           le seul boss du jeu dans ce cas.

           Sans lui, une build forte tuait le boss DANS la rupture de la septieme
           barre — la banque s'y vide en entier — et la huitieme couche de
           repertoire, c'est-a-dire le SCEAU, la seule mecanique inedite du
           combat, ne jouait jamais. Mesure : 11 s de combat a x20 de degats,
           une couche vue sur huit.

           Le boss n'est pas invulnerable : les degats sont mis de cote comme sur
           les sept autres barres et tombent d'un bloc a l'echeance. Ce qu'on
           achete, ce sont les dix secondes pendant lesquelles le sceau se pose,
           s'annonce et se resout. C'est la meme promesse que le plancher de lot
           R, tenue jusqu'au bout du combat au lieu de s'arreter une barre trop
           tot. */
        if (target.hp < 1) {
          target.bank = (target.bank ?? 0) + (1 - target.hp);
          target.hp = 1;
        }
      }
    }

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

    /* EXECUTION (« Achevement », « Moisson »). Elle repond a la sensation
       d'ennemis-eponges de fin de manche et se marie avec les degats de zone,
       qui laissent des survivants a bas PV.
       Jamais sur le boss ni sur une structure de mecanique : un seuil applique
       a une reserve de vie de boss supprimerait une barre entiere, c'est-a-dire
       la moitie du combat que le lot 4 a passe son temps a rendre lisible.
       Le test se fait APRES les degats et sur les PV MAX de la cible, pas sur
       ceux du type : un elite a plus de vie et doit donc mourir plus tard. */
    if (target === this.boss) {
      if (target.hp <= 0) this._killBoss(ownerId);
      return;
    }
    /* `noExec` : le GIBIER de `chasse` est exclu du seuil d'execution, comme le
       boss juste au-dessus et comme les structures de mecanique. Le piege est le
       meme et il etait identifie avant d'etre ecrit : un seuil applique a une
       grosse reserve de vie en supprime le dernier quart d'un coup, et
       l'evenement se terminerait sur un tir qui n'a rien coute. Un drapeau sur
       l'entite et non un test de type — c'est la fonction de la cible qui
       compte, pas son espece. */
    if (target.hp > 0 && owner && owner.mods.execThreshold > 0 && !target.noExec
        && target.maxHp > 0 && target.hp <= target.maxHp * owner.mods.execThreshold) {
      target.hp = 0;
      if (owner.mods.execHeal > 0 && !owner.downed) {
        owner.hp = Math.min(owner.maxHp, owner.hp + owner.mods.execHeal);
      }
    }
    if (target.hp <= 0) {
      /* La mort RENTRE dans `_damage` : l'onde de mort en declenche une autre,
         et elle ecraserait le drapeau de critique que `_bulletHitEnemy` va lire
         juste apres. On le rend a sa valeur — sinon un critique FATAL, le seul
         cas ou l'on veut vraiment que la balle traverse, perdait sa
         perforation. */
      const crit = this.lastCrit;
      this._killEnemy(target, ownerId);
      this.lastCrit = crit;
    }
  }

  /* MULTIPLICATEUR DE L'INSTANT. Quatre cartes dont la valeur ne depend pas du
     chargement mais de la situation : elan (temps sans etre touche), meute
     (ennemis proches), carnage (kills recents), dernier souffle (PV bas).
     Releve une fois par tick et par joueur, jamais au coup : le comptage de la
     meute est une boucle sur les 220 ennemis, et il se paierait quatre cents
     fois par seconde a la place.
     Les quatre s'ADDITIONNENT entre elles et multiplient le reste : quatre
     bonus multiplicatifs sur un chargement deja a x2,4 auraient donne des
     pointes a x6 sans qu'aucune carte n'annonce ce chiffre. */
  _momentum(p) {
    const m = p.mods;
    // « Catalyse » (méta, lot D) : le bonus de la cible soignee vit ici, avec
    // le reste du multiplicateur de l'instant — il est transitoire par
    // construction, donc invisible de `_playerPower`, exactement comme l'elan.
    const cata = p.catalyseT > 0 ? p.catalyseMul : 1;
    if (m.elanStep === 0 && m.packStep === 0 && m.ragePerKill === 0
        && m.lowHpDamage === 0) {
      // Chemin rapide : aucune de ces quatre cartes, donc rien a compter. C'est
      // le cas de la quasi-totalite des joueurs pendant la quasi-totalite d'une
      // manche, et la boucle de meute est le seul cout non trivial du lot.
      p.power = cata;
      return;
    }
    let bonus = 0;
    if (m.elanStep > 0) bonus += Math.min(m.elanMax, m.elanStep * p.elanT);
    if (m.packStep > 0) {
      let near = 0;
      const r2 = CARD_CFG.PACK_RADIUS ** 2;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2) near++;
      }
      bonus += Math.min(m.packMax, m.packStep * near);
    }
    if (p.rageStacks > 0) bonus += m.ragePerKill * p.rageStacks;
    if (m.lowHpDamage > 0 && p.hp <= p.maxHp * CARD_CFG.SOUFFLE_HP) {
      bonus += m.lowHpDamage;
    }
    p.power = (1 + bonus) * cata;
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

  /* « Singularite ». Un deplacement SEC vers le centre et non une force : les
     ennemis n'ont pas de vitesse propre a laquelle ajouter quoi que ce soit, et
     une attraction etalee dans le temps aurait demande un champ de plus sur
     chacun des 200 ennemis pour un effet qui dure une image.
     Le deplacement est borne par la distance restante — un ennemi au centre ne
     traverse pas de l'autre cote — et suivi de la separation d'avec les joueurs,
     sans laquelle l'aspiration deposait la horde a l'interieur du disque de
     16 px ou une balle nait deja au-dela de sa cible. */
  _areaPull(x, y, r, ownerId) {
    const owner = this.players.get(ownerId);
    if (!owner || !owner.mods.areaPull) return;
    const r2 = r * r;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = x - e.x, dy = y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const d = Math.sqrt(d2);
      if (d < 1) continue;
      const k = Math.min(CARD_CFG.SINGULARITE_PULL, d) / d;
      e.x += dx * k;
      e.y += dy * k;
    }
    this._separateFromPlayers();
  }

  /* Explosion de grenade. Elle touche aussi le boss : une arme qui ne sert a
     rien pendant le seul moment ou le combat se decide n'est pas une arme. */
  _explode(x, y, dmg, ownerId) {
    const owner = this.players.get(ownerId);
    const r = CARD_CFG.GRENADE_RADIUS * (owner ? owner.mods.areaMul : 1);
    this.effects.push({
      id: this._nextId++,
      x, y, r, life: 0.35, max: 0.35, kind: 7,
    });

    this._areaPull(x, y, r, ownerId);
    const r2 = r * r;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 <= r2) this._damage(e, dmg, ownerId);
    }
    for (const boss of this._bossTargets()) {
      if ((boss.x - x) ** 2 + (boss.y - y) ** 2 <= r2) this._damage(boss, dmg, ownerId);
    }
    this._hitMarks(x, y, r, dmg);
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  /* Onde blanche : pulsar, onde de mort et riposte partagent la meme forme.
     Trois effets distincts pour trois cartes auraient coute trois `kind` de
     plus au client sans rien apprendre au joueur.
     `areaMul` s'applique ICI et pas chez les trois appelants, pour la meme
     raison : c'est le point de passage unique de l'onde. */
  _wave(x, y, radius, dmg, ownerId) {
    const owner = this.players.get(ownerId);
    if (owner) radius *= owner.mods.areaMul;
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
      /* Relique « Essaim captif » (lot K) : un mini-drone d'essaim de plus en
         permanence. Meme chemin, meme rendu — le drone est deja une entite du
         snapshot, rien a transmettre de plus. Il partage le rayon des drones
         de la carte Essaim par choix : c'est le MEME effet (des drones
         d'essaim), pas deux effets concurrents — l'invariant des bandes de
         rayon exclut un conflit d'EFFETS, pas un empilement du meme. */
      const swarm = p.mods.swarm + (p.relics.has("essaim_captif") ? 1 : 0);
      if (p.mods.drones || swarm > 0) {
        want.set(p.id, { sup: p.mods.drones, swarm });
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

  /* Trois filtres, dans cet ordre, et aucun n'est facultatif.

     LA DIFFICULTE dit quels types EXISTENT (`typesFor`) : le mode calme ne voit
     ni medic, ni bulwark, ni choeur, parce que ce sont les trois types qui
     demandent de choisir sa cible et que c'est la competence qu'il n'a pas a
     enseigner.

     LA MINUTE DE HORDE dit lesquels sont ENTRES EN JEU (`minMin`). C'etait le
     niveau d'equipe, et la mesure a tranche contre : le niveau 2 arrivant a la
     dixieme minute en calme solo, une partie entiere se jouait contre des
     grunts. Le temps est la seule chose que toutes les equipes partagent — c'est
     D1 — donc la seule qui puisse porter le rythme du bestiaire.
     Le repli n'intervient pas ici : un type pas encore entre est simplement
     absent du tirage. `adaptType` sert aux apparitions EXPLICITES, ou l'appelant
     a nomme un type qu'il faut bien remplacer par quelque chose.

     LE QUOTA (`share`) plafonne la population par type. Il devient PLUS critique
     en modele continu qu'il ne l'etait avec les vagues : plus rien ne vide
     periodiquement l'arene, donc un type qui meurt rarement s'y accumule
     jusqu'a la fin de la manche. */
  _pickType() {
    const counts = new Array(ENEMY_TYPES.length).fill(0);
    for (const e of this.enemies) counts[e.type]++;

    const minute = this.hordeMinutes();
    const pool = typesFor(this.diffIndex);
    let avail = pool.filter(i =>
      minute >= ENEMY_TYPES[i].minMin
      && counts[i] < ENEMY_TYPES[i].share * CFG.MAX_ENEMIES);
    if (avail.length === 0) avail = [0];
    let total = 0;
    for (const i of avail) total += ENEMY_TYPES[i].weight;
    let roll = Math.random() * total;
    for (const i of avail) {
      roll -= ENEMY_TYPES[i].weight;
      if (roll <= 0) return ENEMY_TYPES[i];
    }
    return ENEMY_TYPES[0];
  }

  _spawnEnemy(typeIndex = -1, x = null, y = null, elite = false, geom = "bords") {
    if (this.enemies.length >= CFG.MAX_ENEMIES) return null;
    /* Apparition EXPLICITE : l'appelant a nomme un type (la nuee d'une pondeuse,
       un script de mesure). C'est le cas d'`adaptType` — une pondeuse qui creve
       a la premiere minute liberait des runners qui ne sont pas encore entres en
       jeu. Le grunt est le plancher : c'est le seul type sans seuil. */
    let ti = typeIndex;
    if (ti >= 0) {
      ti = adaptType(ti, this.hordeMinutes());
      if (ti < 0 || !typesFor(this.diffIndex).includes(ti)) ti = 0;
    }
    const t = ti >= 0 ? ENEMY_TYPES[ti] : this._pickType();
    if (ti < 0) ti = ENEMY_TYPES.indexOf(t);

    /* PV indexes sur la MINUTE DE HORDE et sur la puissance mesuree de l'equipe.
       La minute est continue et non le palier de beat : une marche de 9 PV
       toutes les soixante secondes se sentirait, alors que la rampe doit se
       subir sans qu'on puisse la dater. */
    const past = this.hordeMinutes();
    const baseHp = (CFG.ENEMY_HP_BASE + past * CFG.ENEMY_HP_MIN_RAMP)
      * (1 + CFG.WAVE_HP_POWER_K * (this._teamPower() - 1))
      * this.diff.hp;
    const pos = x === null ? this._spawnPoint(geom, t.r) : { x, y };
    const hp = baseHp * t.hpMul * (elite ? CFG.ELITE_HP_MUL : 1);
    const e = {
      id: this._nextId++,
      type: ti,
      elite: elite ? 1 : 0,
      x: pos.x,
      y: pos.y,
      hp,
      maxHp: hp,
      speed: (t.speed * (0.9 + Math.random() * 0.2) + past * CFG.ENEMY_SPEED_MIN_RAMP)
        * (elite ? CFG.ELITE_SPEED_MUL : 1),
      r: elite ? t.r * CFG.ELITE_RADIUS_MUL : t.r,
      /* Oriente vers le CENTRE de l'arene et non a zero. Sans interet pour les
         huit types dont `ang` est recalcule des le premier tick — decisif pour
         le bulwark, dont l'orientation est limitee en vitesse : ne un bouclier
         vers la droite au bord droit, il entrait dans l'arene a reculons et
         mettait deux secondes a se retourner. */
      ang: Math.atan2(CFG.ARENA_H / 2 - pos.y, CFG.ARENA_W / 2 - pos.x),
      shootCd: t.shootCd ? t.shootCd * (0.5 + Math.random()) : 0,
      // `standoff` reste une COPIE de celui du type et non une lecture directe :
      // ecrire dans ENEMY_TYPES desarmerait les tireurs pour tout le processus.
      // Le lot S rouvre exactement ce piege avec les traits — d'ou `traits`,
      // `shieldArc` et `aura` copies ici eux aussi.
      standoff: t.standoff ?? 200,
      /* MASQUE DES TRAITS, resolu une fois a l'apparition. La difficulte ne
         change jamais en cours de manche, donc le recalculer a chaque image
         serait un appel de fonction par ennemi et par tick pour une valeur
         constante — et le client, lui, le recalcule de son cote sans qu'un seul
         octet ne circule. */
      traits: traitsOf(this.diffIndex, ti),
      /* Etat des traits et des comportements de type. Tous a zero par defaut,
         donc gratuits pour les types qui ne s'en servent pas : la boucle des
         ennemis teste un nombre, elle n'appelle rien. */
      dashCd: TRAIT_CFG.DASH_CD * (0.4 + Math.random()),
      dashWarn: 0,      // preavis en cours (transmis par `wu`)
      dashT: 0,         // ruee en cours
      trailAt: 0,       // distance restante avant le prochain depot
      aura: 0,          // reduction de degats recue, relevee une fois par tick
      // Bouclier frontal : l'ANGLE est sur l'entite parce que le bulwark est le
      // seul ennemi dont `e.ang` ne suit pas sa cible a l'image.
      shieldArc: t.shieldArc ? (t.shieldArc * Math.PI) / 180 : 0,
      healT: t.healInterval ?? 0,
      fireT: 0,         // temps passe sous le feu (medic)
      fleeT: 0,         // fuite en cours (medic)
      hitAt: -99,       // instant du dernier degat direct (medic)
      // Compteur de touches, transmis dans l'instantane : voir `_damage`. Il
      // n'existe QUE sur les ennemis — le boss a ses propres chiffres de degats
      // et sa barre, il n'a besoin ni de l'un ni de l'autre.
      hitSeq: 0,
      /* Recharge d'application d'etat, en echeance ABSOLUE et non en minuteur
         decompte : un champ de plus a faire descendre sur chacun des 200
         ennemis a chaque image, pour un effet qui ne concerne que les elites,
         ne se justifie pas — meme raison que `vulnUntil`. */
      statusAt: 0,
      /* Lot M — champs du medic, presents sur tous les ennemis pour garder la
         forme d'objet stable (V8), testes seulement derriere `def.heal` :
         healCd la recharge de soin, healTarget l'allie lie (0 = aucun,
         transmis en fin de tuple et coupe par trimTail), pressT le temps de
         tirs encaisses en continu, fleeT la fuite en cours, lastSeq la
         derniere valeur vue du compteur de touches. */
      healCd: t.healInterval ?? 0,
      healTarget: 0,
      pressT: 0,
      fleeT: 0,
      lastSeq: 0,
      /* Lot L — le gibier de « Chasse ». Deux drapeaux et non un : ils disent
         deux choses distinctes qui se trouvent coincider aujourd'hui.
         `noExec` l'exclut du seuil d'execution, exactement comme le boss et les
         structures de mecanique — sans lui, le dernier quart de la vague
         disparait en un tir pour quiconque a la carte, et une vague entiere
         s'evapore. `hunt` le protege du marquage de retardataire : une chasse
         dure par construction plus que WAVE_STRAGGLER_DELAY, et un gibier a
         x2 de vitesse cesse d'etre chassable. Presents sur tous les ennemis
         pour garder la forme d'objet stable, comme les champs du medic. */
      noExec: 0,
      hunt: 0,
      /* Ce que cette mort vaut, en APPARITIONS representees. Un ennemi ordinaire
         en vaut une, d'ou 1 partout. Le gibier de « Chasse » remplace a lui seul
         le budget entier d'une vague : sans ces deux facteurs, une vague de
         chasse verse 1 point d'experience la ou une vague 18 en verse 116, et le
         joueur perd purement et simplement une carte a chaque chasse. Deux
         champs et non un parce que ce sont deux monnaies : l'experience se
         compte par apparition (donc exactement le budget), le score se compte en
         points (donc au score moyen d'une apparition). */
      xpWorth: 1,
      scoreWorth: 1,
    };
    this.enemies.push(e);
    return e;
  }

  /* --- segments ---------------------------------------------------------------

     Le cycle complet :

       segment N -> 300 s de horde scriptee, cinq beats de 60 s
                 -> le cinquieme beat est le CRESCENDO, debit le plus haut
                 -> BOSS (l'horloge de horde s'arrete, D1)
                 -> sa mort ouvre autant d'ecrans de cartes qu'il y a de
                    niveaux en attente
                 -> segment N+1

     Rien ne se « nettoie » et la horde ne s'arrete JAMAIS d'elle-meme. Elle le
     faisait aux accalmies, qui ont disparu au lot X : la respiration vient
     desormais du DEPLACEMENT — arene de neuf vues, camera qui suit — et des
     ecrans de cartes, qui arretent la simulation a chaque niveau. Le seul
     balayage restant est
     celui de l'arrivee du boss, et il ne credite ni score ni experience — sans
     quoi arreter de jouer a 4 min 30 d'un segment serait strictement optimal.

     `_segmentTick` et non `_segment` : l'onde blanche des cartes s'appelle deja
     `_wave(x, y, r, dmg, owner)`, et la gestion de vague qu'elle a ecrasee en
     silence s'appelait `_wave` elle aussi. Deux methodes de meme nom dans un
     corps de classe ne sont pas une erreur en JavaScript — la DERNIERE ecrase
     la precedente. Le bug a coute des degats nuls sur le pulsar, la riposte et
     l'onde de mort ; le prefixe est ce qui empeche de le refaire. */
  _segmentTick(dt) {
    /* L'HORLOGE NE COMPTE QUE LA HORDE. Elle s'arrete pendant le combat de boss
       et pendant l'attente d'un boss ; l'ecran de cartes, lui, arrete step()
       cote serveur, donc il n'y a rien a faire pour lui ici. Sans cet arret, la
       duree d'un combat — de 29 a 131 s selon la build sous D2 — mangerait une
       part variable du segment suivant, et deux manches cesseraient d'etre
       comparables. */
    if (this.boss || this.bossPending) return;

    this.hordeTime += dt;

    /* L'evenement descend sur la MEME horloge que la horde, donc il s'arrete
       lui aussi pendant un boss : sans ca, une chasse ouverte juste avant la fin
       d'un segment expirerait pendant le combat, sur un compte a rebours que
       personne ne voit. */
    if (this.event) {
      this.event.t -= dt;
      /* `chasse` se termine a la MORT DU GIBIER et non a l'echeance. Le test
         porte sur l'identifiant : l'entite a disparu de `enemies`, et la
         chercher a chaque image couterait une boucle sur deux cents corps pour
         une comparaison de nombre. `_killEnemy` remet `quarry` a zero. */
      if (this.event.id === EV_CHASSE && this.quarry === 0) this._closeEvent(true);
    }

    const b = Math.min(TL_CFG.BEATS - 1, Math.floor(this.hordeTime / TL_CFG.BEAT_TIME));
    if (b !== this.beat) { this.beat = b; this._startBeat(); }

    if (this.hordeTime >= TL_CFG.SEGMENT_TIME) this._endSegment();
  }

  /* Minutes de horde ECOULEES depuis le debut de la manche, boss et ecrans de
     cartes exclus. C'est l'axe de difficulte du lot : deux equipes a la meme
     minute voient exactement la meme pression, quelle que soit la duree de
     leurs combats. */
  /* L'arene de boss est nue : voir le constructeur. `bossPending` compte aussi —
     l'arene se resserre et se balaie AVANT que l'entite n'existe, et laisser les
     piliers une seconde de plus les ferait disparaitre sous les yeux. */
  get biomeNu() { return !!this.boss || this.bossPending; }
  get obstacles() { return this.biomeNu ? EMPTY_LIST : this._biomeObstacles; }
  get hazards() { return this.biomeNu ? EMPTY_LIST : this._biomeHazards; }

  hordeMinutes() {
    return ((this.segment - 1) * TL_CFG.SEGMENT_TIME + this.hordeTime) / 60;
  }

  /* Le beat courant, deja adapte a l'effectif VIVANT. Point de passage unique :
     le debit, la geometrie et l'evenement se lisent tous ici.

     MEMORISE, parce qu'`adaptEntry` alloue quand il replie et que ceci est
     appele a chaque tick par le spawner et vingt fois par seconde par le
     snapshot. La cle est l'effectif vivant : c'est la seule chose qui puisse
     changer le resultat sans changer de beat. */
  _beat() {
    const alive = Math.max(1, this.aliveCount());
    const c = this._beatCache;
    if (c && c.alive === alive && c.seg === this.segment && c.beat === this.beat) {
      return c.entry;
    }
    // La VARIANTE vient du profil de difficulte (lot T) : c'est elle qui dit ou
    // quelle geometrie sort. Un profil sans `script` — un
    // GameState construit a la main dans un script de mesure — retombe sur la
    // table de reference.
    const entry = adaptEntry(beatAt(this.diff.script, this.segment, this.beat), alive);
    this._beatCache = { alive, seg: this.segment, beat: this.beat, entry };
    return entry;
  }

  _startBeat() {
    this.spawnAcc = 0;
    this.packLeft = 0;
    // Bord tire une fois par beat : `front` et `pince` ne veulent rien dire si
    // le cote change a chaque ennemi.
    this.beatSide = Math.floor(Math.random() * 4);

    /* PLUS DE BONUS FORCE ICI (lot X). Un silence en echoyait un des son
       ouverture ; les silences ont disparu, et le bonus ne pouvait pas les
       suivre — accroche a un beat quelconque il aurait rendu la cadence des
       bonus dependante d'un decoupage que le joueur ne voit pas. La cadence a
       un seul reglage, `CFG.POWERUP_MIN` / `POWERUP_MAX`, et c'est aussi le
       premier levier de la table de recuperation du lot X : s'il faut rendre
       des PV plus souvent, c'est la que ca se regle, en un endroit et en clair. */

    // Le beat change : l'evenement du beat precedent s'acheve, celui du nouveau
    // s'ouvre. Deux appels et non un test disperse — c'est le seul endroit du
    // fichier ou un beat commence.
    this._closeEvent(true);
    this._openEvent();
  }

  /* --- evenements (lot U) ---------------------------------------------------

     Un evenement N'EST PAS un second systeme : c'est une colonne du script,
     resolue au changement de beat et nulle part ailleurs. Il n'y a donc aucun
     tirage en cours de manche, et deux parties lancees avec la meme variante,
     la meme difficulte et le meme effectif voient exactement la meme sequence —
     c'est ce qui rend un temps de completion comparable, donc classable.

     L'etat tient dans un objet ou `null` : identifiant, temps restant, duree.
     Un objet plutot que trois champs sur l'instance parce que « pas
     d'evenement » doit etre UNE valeur et non trois valeurs coherentes entre
     elles. */
  _openEvent() {
    const entry = this._beat();
    if (entry.event === undefined) return;
    const id = adaptEvent(entry.event, Math.max(1, this.aliveCount()));
    if (id < 0) return;
    const def = eventAt(id);
    if (!def) return;

    this.event = { id, t: TL_CFG.BEAT_TIME, max: TL_CFG.BEAT_TIME };
    /* ANNONCE OBLIGATOIRE, au niveau porte par la table : une consigne demande
       une action immediate (`chasse` : concentrez le feu), un avertissement
       previent d'un danger, une information raconte. Pas de surprise
       silencieuse — c'est le principe deja etabli pour les mecaniques, et le
       bandeau disparait avant la resolution par le meme mecanisme cote client. */
    this.alerts.push({ event: id, level: def.level, dur: TL_CFG.EVENT_ANNOUNCE });
    if (this.alerts.length > 16) this.alerts.shift();

    /* `chasse` : un seul gibier, aucun autre ennemi. Le balayage est le meme
       qu'a l'arrivee d'un boss et pour la meme raison — la cible se perdrait
       dans la masse — et comme lui il ne credite NI score NI experience : il
       passe par `enemies = []` et pas par `_killEnemy`. */
    if (id === EV_CHASSE) {
      this.enemies = [];
      this.effects.push({
        id: this._nextId++,
        x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2,
        r: Math.hypot(CFG.ARENA_W, CFG.ARENA_H) / 2, life: 0.6, max: 0.6, kind: 1,
      });
      this._spawnQuarry();
    }
  }

  /* Le GIBIER. Un elite au gabarit tres augmente — l'echelle est un facteur de
     PLUS que le rang d'elite, pas a la place : un gibier doit rester
     reconnaissable comme une elite, en beaucoup plus gros.

     Ses PV suivent l'effectif (`aliveCrowd`) mais PAS la puissance : c'est D2, et
     `chasse` est justement l'endroit ou le grand ecart doit se voir. Une build
     optimisee l'expedie en quelques secondes et gagne sa remise a plein tres
     vite ; c'est la recompense la plus lisible du jeu pour une bonne build, et
     c'est deliberement sans plancher de duree — le plancher de barre des boss
     protege une choregraphie, celui-ci n'en a pas. */
  _spawnQuarry() {
    const e = this._spawnEnemy(2, CFG.ARENA_W / 2, 120, true, "bords");
    if (!e) return;
    /* SES PV SONT UNE FRACTION DE CEUX D'UN BOSS, et non un multiple de ceux
       d'un tank elite. C'est le seul ancrage qui tienne : le gibier est un
       demi-boss, il doit durer une fraction d'un combat de boss, et la formule
       de boss porte deja l'effectif, le segment et la difficulte. Un multiple
       d'elite aurait derive du boss au premier reglage de l'un des deux —
       mesure a l'appui, un tank elite fait 3 726 PV quand le boss du segment 5
       en fait 6 627 en solo et 32 635 a quatre : les deux echelles n'ont pas la
       meme pente en effectif (1,15 contre l'exposant de horde).

       La PUISSANCE n'y entre pas, contrairement au boss : c'est D2, et `chasse`
       est justement l'endroit ou le grand ecart doit se voir. */
    const crowd = this.aliveCrowd();
    const hp = CFG.BOSS_HP_BASE * Math.pow(crowd, 1.15)
      * (1 + (this.segment - 1) * CFG.BOSS_GROWTH)
      * CFG.BOSS_HP_MUL * this.diff.boss * TL_CFG.QUARRY_HP_MUL;
    e.hp = e.maxHp = hp;
    e.r *= TL_CFG.QUARRY_SIZE_MUL;
    e.speed *= TL_CFG.QUARRY_SPEED_MUL;
    /* EXCLU DU SEUIL D'EXECUTION, comme le boss et les structures de mecanique.
       Le piege est le meme : un seuil applique a une grosse reserve de vie en
       supprime le dernier quart d'un coup, et l'evenement se termine sur un tir
       qui n'a rien coute. `_damage` lit ce drapeau au point de passage unique. */
    e.noExec = 1;
    /* IL VAUT UN BEAT ENTIER, parce qu'il en remplace un. `chasse` supprime
       toute autre apparition pendant sa minute : paye au tarif d'un tank elite,
       le joueur perdrait une carte a chaque chasse — c'est le defaut exact que
       `xpWorth` avait ete ecrit pour corriger du temps ou l'experience se
       comptait en kills, et qui revient avec la nouvelle unite. Quarante
       grunts : l'ordre de grandeur de ce qu'une minute ordinaire rapporte a
       mi-partie, sans en faire une prime a la chasse. */
    e.xpWorth = TL_CFG.QUARRY_XP_WORTH;
    this.quarry = e.id;
  }

  /* Fin d'un evenement. `parBeat` distingue les deux sorties : l'echeance du
     beat (l'evenement a ete TENU) et l'annulation (fin de segment, arrivee du
     boss, manche terminee). Seule la premiere recompense.

     Definition de « terminer » en modele continu : un evenement a une DUREE, pas
     une condition de nettoyage — sauf `chasse`, qui se termine a la mort du
     gibier et ne rend RIEN si le gibier survit a son beat. Sans cette exception,
     il suffirait de fuir soixante secondes pour encaisser la remise a plein. */
  _closeEvent(parBeat) {
    if (!this.event) return;
    const id = this.event.id;
    const gagne = parBeat && (id !== EV_CHASSE || this.quarry === 0);
    this.event = null;
    this.quarry = 0;
    if (gagne) this._eventReward();
  }

  /* REUSSIR UN EVENEMENT REMET L'EQUIPE DEBOUT : 100 % des PV, 100 % du
     bouclier, et les joueurs a terre sont releves. Une seule regle et sans
     condition — un cas « releve mais pas soigne » ou « soigne mais reste a
     terre » serait illisible.

     Son poids a AUGMENTE depuis que `WAVE_HEAL` a disparu au lot P : les
     evenements et les boss sont desormais les deux seules sources garanties de
     remise a plein, et la mesure du depot est formelle — ni plus de cartes ni
     moins de pression n'ont jamais rallonge la survie, une source de
     recuperation si. */
  _eventReward() {
    for (const p of this.players.values()) {
      p.hp = p.maxHp;
      // `shieldPool` est LA reserve de bouclier du chargement — la meme que
      // relit la regeneration de `_players`. Un joueur sans carte de bouclier
      // n'en gagne donc pas ici : la remise a plein rend ce qu'on avait, elle
      // n'offre rien de neuf.
      if (p.mods.shieldPool > p.shield) p.shield = p.mods.shieldPool;
      if (p.downed) { p.downed = false; p.revive = 0; }
      // Meme effet visuel que le relevement par balise : c'est la meme promesse,
      // elle doit se lire pareil.
      this.effects.push({
        id: this._nextId++,
        x: p.x, y: p.y, r: 70, life: 0.5, max: 0.5, kind: 4,
      });
    }
  }

  _endSegment() {
    // L'horloge se fige sur la fin du segment : le client affiche « 0:00 » le
    // temps que le boss sorte, au lieu de repartir de 300 s.
    this.hordeTime = TL_CFG.SEGMENT_TIME;
    this.bossPending = true;
    /* L'evenement est ANNULE, pas termine : le boss arrive, il n'y a rien a
       recompenser. Le calendrier ne place aucun evenement sur le dernier beat —
       le crescendo EST l'evenement — donc ce chemin ne sert qu'aux sorties
       anormales, mais il doit exister : un evenement qui survit a son segment
       ferait descendre son compte a rebours pendant le combat de boss. */
    this._closeEvent(false);
  }

  /* Fin d'un segment cote boss : appele par `_killBoss`, jamais ailleurs. Le
     segment 6 clot la manche par une VICTOIRE — c'est la premiere fois que le
     jeu peut se gagner, et sans ca le segment 7 tournerait sur un script
     inexistant. */
  _nextSegment() {
    if (this.segment >= TL_CFG.SEGMENTS) {
      this.victory = true;
      this.gameOver = true;
      return;
    }
    this.segment++;
    this.hordeTime = 0;
    this.beat = 0;
    /* METEO DU SEGMENT (lot V). Elle se DEDUIT de `(graine, segment)` des deux
       cotes et ne circule donc pas — mais elle s'ANNONCE, au niveau
       `ALERT_INFO` : une modification globale muette surprend au lieu
       d'informer, exactement le reproche fait a une mecanique punitive. C'est la
       regle deja posee pour les variantes de rupture de barre et pour l'enrage. */
    const avant = this.weather?.id ?? -1;
    this.weather = weatherFor(this.diffIndex, this.seed, this.segment);
    if (this.weather && this.weather.id !== avant) this._alertWeather(this.weather.id);
    this._startBeat();
  }

  /* Prepare une offre pour chacun. Appelable plusieurs fois de suite : le
     serveur la rappelle pour chaque niveau en attente. Les joueurs a terre
     tirent aussi — sans ca, un joueur malchanceux decroche definitivement de la
     progression alors que la jauge, elle, est commune. */
  openCards(apresBoss = false) {
    this.pendingLevels--;
    /* LE BONUS DE QUALITE REDEVIENT CELUI DU BOSS (lot X). Il s'appliquait a
       tous les ecrans depuis le lot P, et l'argument tenait tant que tous les
       ecrans suivaient un boss : il n'y en avait pas d'autre. Un niveau ouvre
       desormais son propre ecran en pleine horde, et le lui donner reviendrait a
       supprimer `BOSS_QUALITY` en le generalisant — un bonus que tout le monde a
       tout le temps n'est plus un bonus, c'est la valeur de base ecrite deux
       fois. Le boss redevient donc un point d'etape de QUALITE, ce qu'il etait a
       l'origine, faute d'etre encore un point d'etape de QUANTITE : sa carte
       garantie a disparu au meme lot. */
    this.cardsQuality = this.drawQuality(apresBoss);

    /* Jalon de legendaire. Il se declenche au premier ecran ATTEINT A PARTIR du
       NIVEAU du jalon, et non pendant ce niveau exactement : un niveau qui
       n'ouvre pas d'ecran ferait sauter la garantie purement et simplement —
       c'est le defaut mesure de l'ancienne version indexee sur la vague, elle
       ne tombait qu'une fois sur deux. Le correctif reste ecrit ainsi bien qu'un
       niveau ouvre desormais son ecran (lot X) : le cas subsiste pour les
       niveaux gagnes PENDANT un combat de boss, qui sont mis en file et
       consommes ensemble a sa mort.
       Honore une seule fois, meme si trois niveaux sont gagnes d'affilee : le
       plafond (LEGENDARY_MAX) n'aurait rattrape que la troisieme.
       `legendaryLevelDone` vit ici et non dans `cards.js`, qui doit rester une
       fonction de ses arguments. */
    const jalon = CARD_CFG.LEGENDARY_LEVELS
      .find(n => this.level >= n && !this.legendaryLevelDone.has(n));
    if (jalon !== undefined) this.legendaryLevelDone.add(jalon);

    this.cardOffers = new Map();
    for (const p of this.players.values()) {
      this.cardOffers.set(p.id,
        this.offerCards(p, this.cardsQuality, true, jalon ?? 0));
    }
    this.cardsPending = true;
  }

  /* L'ENCHAINEMENT DES ECRANS A UN POINT DE PASSAGE UNIQUE (lot X). Trois
     appelants — la mort du boss, la montee de niveau, et la salle qui vient de
     fermer un ecran — posaient chacun leur bout de la sequence, et le marchand
     n'etait plus appele du tout : `openMerchant()` etait branche sur `_endWave`,
     que le lot P a supprime avec les vagues. Les reliques n'apparaissaient donc
     dans aucune manche depuis, sans qu'une seule ligne ne soit fausse — c'est le
     defaut classique du chainage disperse, et la raison de cette methode.

     L'ORDRE EST UNE REGLE : les cartes d'abord, le marchand ensuite. Les cartes
     changent la puissance, donc ce qu'on veut acheter ; l'inverse ferait choisir
     ses reliques avant de savoir ce qu'on a. Et le marchand ferme la sequence
     parce qu'il ne se rouvre pas — un seul par boss, la ou les cartes
     s'enchainent tant qu'il reste des niveaux en attente.

     Rend le nom de l'ecran ouvert, ou `null` si la manche peut reprendre. La
     salle n'a plus a connaitre l'ordre : elle demande le suivant. */
  openNextScreen() {
    if (this.pendingLevels > 0) {
      this.openCards(this.relicBossDue);
      return "cards";
    }
    if (this.relicBossDue) {
      this.openMerchant();
      return "merchant";
    }
    return null;
  }

  /* --- marchand de reliques (lot K) -----------------------------------------

     S'ouvre apres chaque victoire de boss, quand la vague est finie (donc
     depuis _endWave, jamais depuis _killBoss : c'est le serveur qui decide de
     ne plus appeler step(), et le boss meurt un tick avant que la vague ne se
     termine — l'ecran s'ouvrirait alors par-dessus la depouille). Le serveur
     vide `relicPending` quand tout le monde a fini (achete ou passe), et la
     manche reprend la ou le repit l'a laissee.

     Differences avec les cartes, qui tiennent le modele :
       - ce n'est pas un choix EXCLUSIF : c'est un budget a repartir, un joueur
         achete zero, une ou plusieurs reliques ;
       - il n'y a qu'UN marchand par victoire de boss, la ou les cartes peuvent
         s'enchaner (plusieurs niveaux) ;
       - les reliques se paient en eclats — la monnaie du lot I, jamais
         persistee, qui meurt avec le GameState. */

  /* Le drapeau se leve a la mort du boss ; la vague se termine au tick suivant,
     et _endWave decidera d'ouvrir (voir la-bas). */
  _merchantDue() {
    this.relicBossDue = true;
  }

  /* Tire une offre pour un joueur. Meme regle de non-repetition que les cartes
     pour le joueur, PLUS la limite de legendaire pour toute la manche. */
  _offerRelics(p) {
    const poss = p.relics;
    const pool = RELICS.filter(r =>
      !poss.has(r.id)
      && (r.tier < 3 || !this.relicLegendaryTaken));
    const picks = [];
    const from = [...pool];
    while (picks.length < RELIC_CFG.OFFER_COUNT && from.length > 0) {
      // Poids par palier : plus une relique est chere, plus elle est rare.
      const weights = [46, 32, 17, 5];   // commune..legendaire
      let total = 0;
      for (const r of from) total += weights[r.tier];
      let roll = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < from.length; i++) {
        roll -= weights[from[i].tier];
        if (roll <= 0) { idx = i; break; }
      }
      picks.push(from[idx].id);
      from.splice(idx, 1);
    }
    return picks;
  }

  openMerchant() {
    this.relicBossDue = false;
    this.relicOffers = new Map();
    for (const p of this.players.values()) {
      this.relicOffers.set(p.id, this._offerRelics(p));
    }
    this.relicPending = true;
  }

  /* Achat. Retourne true si l'achat a eu lieu. Le serveur a deja verifie que
     la relique figure dans l'offre courante : ici on verifie ce que le client
     ne peut pas tricher — le solde, et la limite de legendaire. */
  buyRelic(p, id) {
    const offers = this.relicOffers.get(p.id);
    if (!offers || !offers.includes(id)) return false;
    const r = relicById(id);
    if (!r) return false;
    if (r.tier === 3 && this.relicLegendaryTaken) return false;
    const price = relicPrice(r);
    if (p.eclats < price) return false;
    p.eclats -= price;
    p.relics.set(id, 1);
    if (r.tier === 3) this.relicLegendaryTaken = true;
    /* La relique achetée sort de l'offre courante : sans cette retraite, un
       solde genererux permettait d'acheter la MÊME relique trois fois — et
       les PV bruts se cumulaient sur la jauge. Elle reste possedee, donc
       `_offerRelics` ne la retirera plus jamais. */
    const off = this.relicOffers.get(p.id);
    if (off) this.relicOffers.set(p.id, off.filter(o => o !== id));
    /* Les PV bruts changent la jauge : il faut la recalculer tout de suite,
       pas au prochain ecran de cartes. */
    if (r.flatHp) this._recomputeAll(p);
    return true;
  }

  /* Relance de l'offre contre des eclats, cout croissant avec la vague. */
  rerollRelic(p) {
    const cost = relicRerollCost(this.wave);
    if (p.eclats < cost) return false;
    p.eclats -= cost;
    this.relicOffers.set(p.id, this._offerRelics(p));
    return true;
  }

  /* Le joueur a fini au marchand (achete, ou passe). Le serveur rouvre quand
     plus personne n'attend. */
  relicDone(p) {
    this.relicOffers.delete(p.id);
  }

  /* Fin de marchand : tout le monde a fini (ou le delai est ecoule). */
  closeMerchant() {
    this.relicPending = false;
    this.relicOffers.clear();
  }

  _spawner(dt) {
    // Pendant un combat de boss, c'est lui qui gere le rythme : il appelle ses
    // propres renforts. Rien ne sort non plus entre la fin d'un segment et
    // l'arrivee du boss — ce serait remplir l'arene juste avant qu'il ne la
    // balaie.
    if (this.boss || this.bossPending) return;

    const entry = this._beat();
    /* EVENEMENT EN COURS (lot U) : il remplace la COMPOSITION du beat et
       multiplie son debit, il ne remplace pas le beat. La geometrie, l'effectif
       et la difficulte continuent de s'appliquer — un evenement dit QUOI arrive,
       le beat dit combien et par ou.

       `rateMul: 0` (`chasse`) coupe les apparitions net : le gibier est seul
       dans l'arene, c'est toute la mecanique. */
    const ev = this.event ? eventAt(this.event.id) : null;
    if (ev && ev.rateMul <= 0) return;

    // Effectif VIVANT (lot R) : une table a moitie a terre ne doit pas recevoir
    // le debit d'une table complete. Voir `aliveCrowd()` pour l'hysteresis.
    const crowd = this.aliveCrowd();
    // Le debit n'est plus derive d'une rampe : il est ECRIT, beat par beat. Les
    // deux facteurs qui restent sont ceux qu'on ne veut surtout pas toucher —
    // la normalisation d'effectif, qui porte la parite 1 / 4 joueurs, et la
    // difficulte choisie a la table.
    const rate = entry.rate
      * (ev ? ev.rateMul : 1)
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
      /* SATURATION. Passe le plafond, les apparitions sont silencieusement
         jetees : c'est une misericorde involontaire — la difficulte plafonne au
         moment precis ou l'equipe est en train de perdre. On ne la corrige pas
         par du debit (la mesure dit que ce n'est pas le levier) mais par de
         l'INFORMATION : le client affiche le taux d'occupation, qu'il deduit de
         la longueur de la liste sans qu'on paie un champ de plus. */
      if (this.enemies.length >= CFG.MAX_ENEMIES) { this.spawnAcc = 0; break; }
      /* La composition d'un evenement passe par le meme argument que la nuee
         d'une pondeuse : un type NOMME. Elle traverse donc `adaptType` et le
         roster de difficulte comme tout le reste — une nuee au niveau 1 sort en
         grunts plutot qu'en runners, ce qui est exactement ce qu'on veut. */
      const type = ev && ev.types.length > 0
        ? ev.types[Math.floor(Math.random() * ev.types.length)]
        : -1;
      const e = this._spawnEnemy(type, null, null, eliteDue, entry.geom);
      if (!e) break;
      if (eliteDue) {
        eliteDue = false;
        // La cadence d'elite se resserre avec l'effectif : a quatre joueurs le
        // budget triple, et sans ca on croisait la meme densite d'elites dans
        // une foule trois fois plus dense.
        const k = Math.pow(crowd, CFG.WAVE_ELITE_CROWD_EXP);
        this.eliteCd = (CFG.ELITE_MIN + Math.random() * (CFG.ELITE_MAX - CFG.ELITE_MIN)) / k;
      }
    }
  }

  // Un point sur le bord `side` (0 nord, 1 sud, 2 ouest, 3 est), hors champ.
  /* BOITE D'APPARITION — le cadre dans lequel toutes les geometries tirent.

     C'est LA reconciliation entre le plan 5 et la grande arene du lot I, et
     elle etait obligatoire : les geometries du script (`bords`, `front`,
     `pince`, `quatre-fronts`) nomment des COTES, et sur 1600 x 900 les cotes de
     la salle sont a une demi-vue du joueur, donc juste hors champ. Sur
     4800 x 2700 ils sont a deux mille pixels, soit une demi-minute de marche :
     la vague trainait sans qu'aucune decision de jeu ne s'y joue, et la mesure
     le disait — quatre-vingt-dix ennemis en vol, zero kill en deux minutes.

     Les cotes deviennent donc ceux de la BOITE DE L'EQUIPE, gonflee d'une
     demi-vue plus la marge : hors ecran pour le joueur le plus proche — on ne
     se materialise jamais sous les yeux — mais a portee de course. Sur une
     arene d'une seule vue le calcul redonne EXACTEMENT les quatre bords
     d'avant, donc le script n'a pas une valeur a rerégler.

     La boite est ecretee aux bords de la salle : un front ne se declenche pas
     dans le vide hors terrain. */
  _spawnBox() {
    const m = TL_CFG.SPAWN_MARGIN;
    const hw = CFG.VIEW_W / 2 + m, hh = CFG.VIEW_H / 2 + m;
    const ps = this._alivePlayers();
    let x0, y0, x1, y1;
    if (ps.length === 0) {
      const c = this._teamCentroid();
      x0 = c.x - hw; x1 = c.x + hw; y0 = c.y - hh; y1 = c.y + hh;
    } else {
      x0 = y0 = Infinity; x1 = y1 = -Infinity;
      for (const p of ps) {
        if (p.x < x0) x0 = p.x;
        if (p.x > x1) x1 = p.x;
        if (p.y < y0) y0 = p.y;
        if (p.y > y1) y1 = p.y;
      }
      x0 -= hw; x1 += hw; y0 -= hh; y1 += hh;
    }
    // Ecretage a la salle, marge comprise : au-dela il n'y a plus de terrain.
    return {
      x0: Math.max(-m, x0), y0: Math.max(-m, y0),
      x1: Math.min(CFG.ARENA_W + m, x1), y1: Math.min(CFG.ARENA_H + m, y1),
    };
  }

  _edgePoint(side) {
    const B = this._spawnBox();
    const s = side & 3;
    let pt;
    switch (s) {
      case 0:  pt = { x: B.x0 + Math.random() * (B.x1 - B.x0), y: B.y0 }; break;
      case 1:  pt = { x: B.x0 + Math.random() * (B.x1 - B.x0), y: B.y1 }; break;
      case 2:  pt = { x: B.x0, y: B.y0 + Math.random() * (B.y1 - B.y0) }; break;
      default: pt = { x: B.x1, y: B.y0 + Math.random() * (B.y1 - B.y0) };
    }
    return this._pushOffScreen(pt, s);
  }

  /* JAMAIS SOUS LES YEUX. `_spawnBox` ecrete aux bords de la salle — « au-dela
     il n'y a plus de terrain » — et c'est ce qui cassait l'invariant ecrit a
     cote de `SPAWN_MARGIN` : colle a un mur, le cote correspondant de la boite
     tombe A PORTEE DE VUE, et la camera etant clampee a la salle elle aussi, le
     joueur regarde exactement l'endroit ou ca sort. Mesure avant correctif :
     15 % des apparitions dans le champ en solo, 34 % a quatre joueurs, et
     fortement asymetriques (1901 a l'est contre 346 a l'ouest) — c'est-a-dire
     lisible comme « ils sortent tous du meme cote », qui est le defaut
     rapporte.

     LE COTE APPARTIENT AU SCRIPT, LA DISTANCE A LA LISIBILITE. On ne change
     donc pas de bord — `front` et `pince` perdraient tout leur sens — on
     REPOUSSE le point le long de l'axe de son bord jusqu'a sortir de toutes les
     vues. Sortir de la salle est acceptable et c'est deja ce que la marge fait :
     rien n'y borne un ennemi, il entre en marchant. Le contraire — se
     materialiser a l'ecran — est ce qu'on refuse.

     Le rectangle de vue est RECONSTRUIT comme le client le calcule (centre sur
     le joueur, clampe a la salle) et non suppose centre : c'est precisement
     pres des murs que les deux different, donc precisement la ou le probleme se
     pose. O(joueurs) par apparition, quatre au plus, quelques apparitions par
     seconde — negligeable devant la boucle d'evitement.

     `anneau` n'y passe pas : c'est la seule geometrie qui fait naitre DANS les
     limites, deliberement, et elle a sa propre distance de garde. */
  _pushOffScreen(pt, side) {
    const m = TL_CFG.SPAWN_MARGIN;
    for (const p of this.players.values()) {
      if (p.downed) continue;
      const vx = Math.max(0, Math.min(CFG.ARENA_W - CFG.VIEW_W, p.x - CFG.VIEW_W / 2));
      const vy = Math.max(0, Math.min(CFG.ARENA_H - CFG.VIEW_H, p.y - CFG.VIEW_H / 2));
      if (pt.x < vx || pt.x > vx + CFG.VIEW_W || pt.y < vy || pt.y > vy + CFG.VIEW_H) continue;
      switch (side) {
        case 0:  pt.y = Math.min(pt.y, vy - m); break;
        case 1:  pt.y = Math.max(pt.y, vy + CFG.VIEW_H + m); break;
        case 2:  pt.x = Math.min(pt.x, vx - m); break;
        default: pt.x = Math.max(pt.x, vx + CFG.VIEW_W + m);
      }
    }
    return pt;
  }

  /* GEOMETRIE D'APPARITION. Une seule geometrie pour toute la partie, c'etait
     une pression uniformement diffuse — rien ne distinguait un mur de runners
     arrivant du nord d'un grignotage general. Le script en nomme une par beat.

     `bords` diffus, `front` un seul cote (on recule), `pince` deux cotes
     opposes (on ne peut plus reculer, il faut percer), `quatre-fronts` par
     paquets (a trois joueurs et plus : on se repartit), `anneau` un cercle
     autour du centre (encerclement, reserve aux evenements). */
  _spawnPoint(geom = "bords", r = 12) {
    switch (geom) {
      case "front":
        return this._edgePoint(this.beatSide);
      case "pince":
        // Les cotes opposes vont par paires (0/1 et 2/3) : le XOR est la paire.
        return this._edgePoint(Math.random() < 0.5 ? this.beatSide : this.beatSide ^ 1);
      case "quatre-fronts": {
        // Par PAQUETS : quatre bords alimentes un ennemi a la fois donnent
        // quatre filets, pas quatre fronts.
        if (this.packLeft <= 0) {
          this.packLeft = TL_CFG.PACK;
          this.packSide = (this.packSide + 1) & 3;
        }
        this.packLeft--;
        return this._edgePoint(this.packSide);
      }
      case "anneau":
        return this._ringPoint(r);
      default:
        return this._edgePoint(Math.floor(Math.random() * 4));
    }
  }

  /* La SEULE geometrie qui fait naitre un ennemi a l'INTERIEUR des limites,
     donc la seule qui puisse le deposer dans le disque de 16 px autour d'un
     joueur ou il serait strictement invulnerable a son porteur — les balles
     naissent a 16 px du centre, un runner a 9 px de rayon et une balle 4, donc
     la collision se fait a 13 px. C'est le bug documente de la separation
     ennemi / joueur, et il se reproduirait exactement ici.

     On tire donc jusqu'a trouver un point degage, et on retombe sur un bord si
     l'arene est trop encombree : un ennemi qui n'apparait pas vaut mieux qu'un
     ennemi invulnerable, et un bord est toujours sur. */
  _ringPoint(r) {
    /* Autour de l'EQUIPE et non du centre de la salle (grande arene) : un
       encerclement centre sur une arene de 4800 x 2700 n'encercle personne. Le
       rayon suit la demi-vue, donc un anneau qui tient a l'ecran — c'est toute
       la lecture de cette geometrie. */
    const c = this._teamCentroid();
    const cx = c.x, cy = c.y;
    const rad = (CFG.VIEW_H / 2) * TL_CFG.RING_RATIO;
    for (let i = 0; i < TL_CFG.RING_TRIES; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      const clear = TL_CFG.RING_CLEAR + r;
      // Un ennemi ne nait pas DANS un pilier : la separation le ferait ressortir
      // d'un cote imprevisible, et le meme tirage sait deja se recommencer.
      if (this._inObstacle(x, y, r)) continue;
      let ok = true;
      for (const p of this.players.values()) {
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < clear * clear) { ok = false; break; }
      }
      if (ok) return { x, y };
    }
    return this._edgePoint(Math.floor(Math.random() * 4));
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
      // `_dropPoint` et non les limites brutes : c'est lui qui sait ecarter un
      // obstacle de biome, et un bonus pose dans un pilier est un bonus perdu.
      const pt = this._dropPoint(
        B.x0 + margin + Math.random() * Math.max(1, B.x1 - B.x0 - margin * 2),
        B.y0 + margin + Math.random() * Math.max(1, B.y1 - B.y0 - margin * 2),
        margin);
      this.powerups.push({
        id: this._nextId++,
        type: this._randomPowerupType(),
        x: pt.x, y: pt.y,
        /* CENDRES (lot V) : le bonus ne dure plus. La meteo ne change ni le
           tirage, ni la frequence, ni l'effet — elle change le TEMPS QU'ON A
           pour aller le chercher, ce qui est une decision de trajet et non un
           affaiblissement. */
        life: this.weather?.id === WX_CENDRES ? BIOME_CFG.ASH_LIFE : CFG.POWERUP_LIFE,
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

  /* --- points de recolte (lot I) ---------------------------------------------
     Le cristal se detruit AUX BALLES — le test vit ici et non dans la boucle
     de collision des ennemis : un cristal n'est pas un ennemi (pas de
     critique, pas de vol de vie, pas de compteur de touches), et quatre
     structures au sol contre quatre cents balles restent bon marche. L'amas
     se CANALISE : rester dessus 1,5 s, la progression retombe lentement si
     tout le monde s'ecarte. Le rendement est verse a CHAQUE joueur — meme
     logique que l'experience commune, celui qui reste au contact du groupe
     ne subit pas de penalite de revenu. */
  _harvests(dt) {
    // Pas d'apparition pendant un combat de boss : l'arene utile est reduite
    // a une vue, un point pose dehors serait une promesse inatteignable.
    this.harvestCd -= dt;
    if (this.harvestCd <= 0) {
      this.harvestCd = CFG.HARVEST_MIN
        + Math.random() * (CFG.HARVEST_MAX - CFG.HARVEST_MIN);
      if (!this.boss && !this.waveBoss
          && this.harvests.length < CFG.HARVEST_MAX_GROUND) {
        const at = this._harvestPoint();
        if (at) {
          this.harvests.push({
            id: this._nextId++,
            x: at.x, y: at.y,
            kind: Math.random() < 0.5 ? 0 : 1,
            hp: CFG.HARVEST_CRYSTAL_HP, maxHp: CFG.HARVEST_CRYSTAL_HP,
            prog: 0,
          });
        }
      }
    }

    if (this.harvests.length === 0) return;
    const kept = [];
    for (const h of this.harvests) {
      if (h.kind === 0) {
        // cristal : les balles le grignotent (voir _bullets)
        if (h.hp <= 0) { this._harvestYield(h); continue; }
      } else {
        let on = false;
        for (const p of this._alivePlayers()) {
          const r = CFG.HARVEST_CHANNEL_RADIUS;
          if ((p.x - h.x) ** 2 + (p.y - h.y) ** 2 <= r * r) { on = true; break; }
        }
        // La progression retombe a mi-vitesse : lacher l'amas pour esquiver ne
        // remet pas a zero, l'abandonner oui.
        h.prog = on
          ? h.prog + dt / CFG.HARVEST_CHANNEL
          : Math.max(0, h.prog - dt * 0.5 / CFG.HARVEST_CHANNEL);
        if (h.prog >= 1) { this._harvestYield(h); continue; }
      }
      kept.push(h);
    }
    if (kept.length !== this.harvests.length) this.harvests = kept;
  }

  /* Position d'un point de recolte : loin de TOUT joueur vivant — c'est la
     definition meme de l'exploration — et dans les limites courantes. Vingt
     tirages, sinon on renonce jusqu'a la prochaine echeance : une salle ou
     l'equipe est dispersee peut ne laisser aucun coin assez lointain. */
  _harvestPoint() {
    const B = this.bounds;
    const margin = 150;
    for (let i = 0; i < 20; i++) {
      const x = B.x0 + margin + Math.random() * Math.max(1, B.x1 - B.x0 - margin * 2);
      const y = B.y0 + margin + Math.random() * Math.max(1, B.y1 - B.y0 - margin * 2);
      let ok = true;
      for (const p of this._alivePlayers()) {
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < CFG.HARVEST_PLAYER_DIST ** 2) {
          ok = false; break;
        }
      }
      /* JAMAIS DANS UN OBSTACLE (lot V oublie ici). Le tirage ne connaissait que
         les joueurs et les bornes : un cristal pouvait naitre dans un pilier,
         donc a moitie enfoui — et alors inatteignable, la balle mourant sur le
         mur avant de l'atteindre. Un amas, lui, restait canalisable en se
         collant au pilier, mais illisible.

         La marge est le rayon du point PLUS celui du personnage : il ne suffit
         pas que le centre soit dehors, il faut pouvoir venir se tenir dessus
         pour canaliser. C'est la meme distinction qu'entre `_obstacleHit` (un
         point) et `_obstacleBlock` (un corps qui a un rayon). */
      if (ok && this.obstacles.length) {
        const m = CFG.HARVEST_RADIUS + CFG.PLAYER_RADIUS;
        for (const b of this.obstacles) {
          if (b.maxHp > 0 && b.hp <= 0) continue;
          if (Math.abs(x - b.x) < b.w / 2 + m && Math.abs(y - b.y) < b.h / 2 + m) {
            ok = false; break;
          }
        }
      }
      if (ok) return { x, y };
    }
    return null;
  }

  _harvestYield(h) {
    const gain = CFG.HARVEST_YIELD_MIN
      + Math.floor(Math.random() * (CFG.HARVEST_YIELD_MAX - CFG.HARVEST_YIELD_MIN + 1));
    for (const p of this.players.values()) p.eclats += gain;
    // kind 14 : recolte aboutie — l'onde doree qui dit que l'equipe vient de
    // gagner des eclats, meme pour ceux qui etaient a l'autre bout de la salle.
    this.effects.push({
      id: this._nextId++,
      x: h.x, y: h.y, r: 90,
      life: 0.6, max: 0.6,
      kind: 14,
    });
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
    // Un seul rayon pour l'effet dessine, les degats, la poussee et le balayage
    // des projectiles : quatre valeurs a garder d'accord, donc une variable.
    const R = CFG.NOVA_RADIUS * p.mods.areaMul;
    this.effects.push({
      id: this._nextId++,
      x: p.x, y: p.y,
      r: R,
      life: 0.45, max: 0.45,
      kind: 0,
    });

    for (const e of this.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const ux = d > 0.01 ? dx / d : 1, uy = d > 0.01 ? dy / d : 0;
      e.x += ux * CFG.NOVA_PUSH;
      e.y += uy * CFG.NOVA_PUSH;
      this._damage(e, CFG.NOVA_DAMAGE, p.id);
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);

    for (const boss of this._bossTargets()) {
      const d = Math.hypot(boss.x - p.x, boss.y - p.y);
      if (d <= R) this._damage(boss, CFG.NOVA_BOSS_DAMAGE, p.id);
    }

    // L'onde balaie aussi les projectiles ennemis : c'est ce qui en fait un
    // vrai recours quand l'ecran est sature.
    this.shots = this.shots.filter(sh =>
      (sh.x - p.x) ** 2 + (sh.y - p.y) ** 2 > R * R);
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
    this._auraPass();
    /* Liste des ennemis en ANTICIPATION, reconstruite a chaque tick. Elle part
       dans la cle nommee `wu` du snapshot, et c'est la seule information de
       trait qui circule : une position ne dit pas qu'un mouvement se prepare —
       c'est exactement la limite deja notee pour la cadence des tireurs, ou
       « un telegraphe qui devine serait pire que pas de telegraphe ».
       Courte par construction : la recharge est de 6 s et le preavis de 0,5 s,
       donc quelques ennemis sur deux cents, et vide la plupart du temps. */
    this.windup.length = 0;
    // La bourrasque est globale : une seule lecture pour les deux cents.
    const gust = this._gust(dt);

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
      /* Champ de ralentissement du biome (lot V). Il porte sur les ennemis comme
         sur les joueurs : un champ qui ne ralentirait que le joueur serait une
         taxe deguisee en mecanique, et le depot les refuse. Le test ne coute que
         dans les modes qui en posent — `hazards` est vide en calme. */
      if (this.hazards.length) mul *= this._ground(e.x, e.y).slow;
      /* Ancre (lot C) : ralentissement dans le rayon, comme le givre — et
         comme lui, deux ancres ne se cumulent pas. La laisse, elle, vit dans
         `_skills` : elle est une contrainte de position, pas de vitesse. */
      for (const an of this.anchors) {
        if ((e.x - an.x) ** 2 + (e.y - an.y) ** 2 <= an.r * an.r) {
          mul *= CARD_CFG.SKILL3_ANCRE_SLOW;
          break;
        }
      }
      /* Orientation. Elle sert au rendu cote client pour huit types sur neuf, et
         elle EST la mecanique du neuvieme : le bouclier du bulwark protege ce
         qu'il regarde, donc sa rotation est limitee en vitesse. Un bouclier qui
         se retourne a l'image rend le flanc inatteignable, c'est-a-dire le type
         injouable — « il faut gagner l'angle » ne veut plus rien dire. */
      const want = Math.atan2(dy, dx);
      if (e.shieldArc > 0) {
        let turn = want - e.ang;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        const max = def.shieldTurnRate * dt;
        e.ang += turn > max ? max : turn < -max ? -max : turn;
      } else {
        e.ang = want;
      }

      /* FRENESIE. La vitesse monte a mesure que les PV descendent. C'est le seul
         trait qui rende un ennemi plus dangereux quand on l'a presque tue, donc
         le seul qui punisse de laisser un blesse derriere soi. */
      if (hasTrait(e.traits, TRAIT_FRENZY) && e.maxHp > 0) {
        const missing = 1 - e.hp / e.maxHp;
        const k = Math.min(1, missing / (1 - TRAIT_CFG.FRENZY_AT));
        mul *= 1 + (TRAIT_CFG.FRENZY_MAX - 1) * k;
      }

      /* RUEE. Trois temps, et le premier n'est pas facultatif : sans preavis
         visible, une ruee est une teleportation. Il se voit de DEUX facons — la
         creature se ramasse (le client l'ecrase par `scale`, informe par `wu`)
         et elle RALENTIT. Le ralentissement compte autant que l'ecrasement : il
         est lisible meme quand la creature est cachee par la masse.
         Elle ne se declenche qu'a portee : une ruee lancee de l'autre bout de
         l'arene se termine dans le vide et le joueur ne la relie jamais a
         l'anticipation qu'il a vue. */
      if (hasTrait(e.traits, TRAIT_DASH)) {
        if (e.dashT > 0) {
          e.dashT -= dt;
          mul *= TRAIT_CFG.DASH_MUL;
        } else if (e.dashWarn > 0) {
          e.dashWarn -= dt;
          mul *= TRAIT_CFG.DASH_GATHER;
          this.windup.push(e.id);
          if (e.dashWarn <= 0) e.dashT = TRAIT_CFG.DASH_TIME;
        } else {
          e.dashCd -= dt;
          if (e.dashCd <= 0 && d < TRAIT_CFG.DASH_RANGE) {
            e.dashCd = TRAIT_CFG.DASH_CD;
            e.dashWarn = TRAIT_CFG.DASH_WARN;
          }
        }
      }

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
          /* SALVE : trois projectiles en eventail au lieu d'un, a cadence
             INCHANGEE. Ce qui change est la couverture, pas le debit de degats —
             un tireur qui tirerait trois fois plus fort au meme rythme serait un
             reglage de statistique, pas un comportement. */
          const fan = hasTrait(e.traits, TRAIT_VOLLEY) ? TRAIT_CFG.VOLLEY_COUNT : 1;
          const base = Math.atan2(dy, dx) - ((fan - 1) / 2) * TRAIT_CFG.VOLLEY_SPREAD;
          for (let i = 0; i < fan; i++) {
            const a = base + i * TRAIT_CFG.VOLLEY_SPREAD;
            this.shots.push({
              id: this._nextId++,
              x: e.x, y: e.y,
              vx: Math.cos(a) * CFG.SHOT_SPEED,
              vy: Math.sin(a) * CFG.SHOT_SPEED,
              life: CFG.SHOT_LIFE,
            });
          }
        }
      } else if (def.heal) {
        /* MEDIC. Il garde ses distances comme un tireur, et il FUIT quand on
           s'acharne sur lui : `standoff` est le meme champ, seule la consigne
           change. */
        const want2 = e.fleeT > 0 ? e.standoff * 1.6 : e.standoff;
        const approach = d > want2 ? 1 : -0.6;
        e.x += (dx / d) * e.speed * mul * approach * dt;
        e.y += (dy / d) * e.speed * mul * approach * dt;
        this._medic(e, def, dt);
      } else {
        e.x += (dx / d) * e.speed * mul * dt;
        e.y += (dy / d) * e.speed * mul * dt;
      }

      /* TRAINEE, posee a la DISTANCE parcourue et non au temps ecoule. Sur une
         cadence, un ennemi arrete continuerait de paver le sol sous lui, et un
         runner a 188 px/s en poserait deux fois moins qu'un grunt pour le double
         de terrain couvert. */
      if (hasTrait(e.traits, TRAIT_TRAIL)) {
        e.trailAt -= Math.hypot(e.x - wasX, e.y - wasY);
        if (e.trailAt <= 0) {
          e.trailAt = TRAIT_CFG.TRAIL_STEP;
          this._groundZone(e.x, e.y, TRAIT_CFG.TRAIL_R, TRAIT_CFG.TRAIL_DOT,
            TRAIT_CFG.TRAIL_LIFE);
        }
      }

      // Bourrasque : elle pousse les DEUX camps, sinon c'est une taxe.
      if (gust) { e.x += gust.x; e.y += gust.y; }

      // Le test ne coute que pendant les vingt secondes d'un verrouillage : hors
      // de la, `walls` est nul et l'appel sort a la premiere ligne.
      if (this.walls) this._wallBlock(e, wasX, wasY, e.r);
      /* Obstacles du biome. Le repoussage par axe fait glisser le long du mur :
         sans lui, deux cents ennemis restaient plaques contre un pilier sans
         jamais le contourner, et la population montait jusqu'au plafond. */
      if (this.obstacles.length) this._obstacleBlock(e, wasX, wasY, e.r);
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

  /* AURA — relevee UNE FOIS par tick, exactement comme les auras de givre et
     pour la meme raison : la lire dans `_damage` reviendrait a parcourir les
     deux cents ennemis a chaque impact, soit quelques centaines de fois par
     seconde en fin de manche. Ici on paie porteurs x population, et les
     porteurs sont rares par construction (`share: 0.08` pour le choeur).

     ELLE NE SE CUMULE JAMAIS : deux porteurs sur la meme cible appliquent la
     MEILLEURE reduction, jamais le produit. C'est la meme regle que le Voeu
     partage et que les auras de givre, et sans elle trois porteurs groupes
     rendaient un paquet strictement increvable.

     Un porteur se couvre lui-meme — il est a distance nulle de sa propre aura.
     Ce n'est pas un oubli : le choeur est un ennemi qu'on doit vouloir tuer en
     premier, et une cible qui resiste un peu plus est ce qui rend ce choix
     couteux au lieu d'evident. */
  _auraPass() {
    const src = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.aura = 0;
      const def = ENEMY_TYPES[e.type];
      if (def.auraRadius) src.push({ e, r: def.auraRadius, k: def.auraReduction });
      else if (hasTrait(e.traits, TRAIT_AURA)) {
        src.push({ e, r: TRAIT_CFG.AURA_RADIUS, k: TRAIT_CFG.AURA_REDUCTION });
      }
    }
    if (src.length === 0) return;
    for (const s of src) {
      const r2 = s.r * s.r;
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.aura >= s.k) continue;
        if ((e.x - s.e.x) ** 2 + (e.y - s.e.y) ** 2 <= r2) e.aura = s.k;
      }
    }
  }

  /* MEDIC. Le soin est un CHEMIN NEUF et non un `_damage()` negatif : cette
     methode porte le vol de vie, les critiques, l'execution et le compteur de
     touches, dont aucun n'a le moindre sens sur un soin — et un montant negatif
     les traverserait tous.

     La rupture se mesure en temps passe SOUS LE FEU (`fireT`) et non en « touche
     recemment » : une balle perdue ne coupe pas un soin, s'acharner une seconde
     le coupe. La jauge redescend deux fois moins vite qu'elle ne monte, sinon un
     tir intermittent ne la faisait jamais atteindre son seuil. */
  _medic(e, def, dt) {
    if (this.time - e.hitAt < def.fireWindow) e.fireT += dt;
    else e.fireT = Math.max(0, e.fireT - dt * 0.5);

    if (e.fireT >= def.breakTime) { e.fireT = 0; e.fleeT = def.fleeTime; }
    if (e.fleeT > 0) { e.fleeT -= dt; return; }

    e.healT -= dt;
    if (e.healT > 0) return;
    e.healT = def.healInterval;

    // Le voisin blesse le plus proche, et JAMAIS lui-meme : un medic qui se
    // soigne est le mur increvable que la rupture existe precisement pour
    // empecher.
    let best = null, bd = def.healRange * def.healRange;
    for (const o of this.enemies) {
      if (o === e || o.hp <= 0 || o.hp >= o.maxHp) continue;
      const d2 = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
      if (d2 < bd) { bd = d2; best = o; }
    }
    if (best) best.hp = Math.min(best.maxHp, best.hp + def.heal);
  }

  /* Zone posee par la HORDE : trainee, spores. Elle passe par `_zone` comme
     tout le reste — donc par `_zoneApply`, donc par `_hurt` — mais avec un
     PLAFOND GLOBAL, et il n'est pas indicatif. Le depot a deja rencontre le
     piege avec les flaques de la Matriarche : sans lui, une fin de segment a
     deux cents ennemis pave le sol, l'instantane enfle et la mecanique devient
     illisible avant d'etre difficile.

     La zone la plus ANCIENNE cede sa place, on ne refuse jamais la nouvelle :
     un refus silencieux aurait fige le sol autour du premier ennemi arrive pour
     tout le reste de la manche. */
  _groundZone(x, y, r, dot, life) {
    let oldest = -1;
    let count = 0;
    for (let i = 0; i < this.zones.length; i++) {
      if (!this.zones[i].horde) continue;
      count++;
      if (oldest < 0) oldest = i;
    }
    if (count >= TRAIT_CFG.TRAIL_MAX && oldest >= 0) this.zones.splice(oldest, 1);
    this._zone({
      x, y, r, dot, life,
      // Aucune annonce : la zone EST derriere la creature qui vient de passer,
      // et un telegraphe sur une trainee ferait clignoter la moitie de l'arene.
      warn: 0, tick: CFG.ZONE_TICK, horde: 1,
    });
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
  /* Tirage des boss INTERMEDIAIRES. Le final n'y entre jamais : il clot le
     segment 6, par construction, et c'est ce qui rend inutile toute
     arithmetique de « cycle complet du roster ».

     La borne est `BOSS_POOL_COUNT` et non `BOSS_ROSTER.length` — ecrite dans
     `bosses.js` a cote de la table. Deduire la longueur ferait entrer
     silencieusement dans le deck tout boss ajoute plus tard, y compris le final.

     Depuis le lot W, les cinq sont eligibles a TOUT effectif : le deck se
     distribue donc exactement, cinq boss pour cinq places, sans repetition et
     quel que soit le nombre de joueurs. */
  _pickBoss(alive) {
    /* BOSS FINAL (lot N). Il ne se tire pas : il ARRIVE, une fois que les cinq
       boss normaux ont ete VAINCUS dans la manche en cours. La condition porte
       sur `bossKindsKilled` et non sur `bossSeen` — un boss croise puis fui
       (manche abandonnee, joueur reconnecte) n'a rien appris a personne, et le
       Noyau est la synthese de ce qu'on a battu.
       Une seule fois par manche : `finalDone` l'empeche de revenir si la
       manche continue apres sa mort. */
    if (!this.finalDone && this._rosterCleared()) return BOSS_FINAL;

    const eligible = [];
    for (let i = 0; i < BOSS_POOL_COUNT && i < BOSS_ROSTER.length; i++) {
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

  /* Le cycle du roster est-il boucle ? Les CINQ boss normaux vaincus dans la
     manche en cours. Point de passage unique : le client rejoue la meme
     question pour annoncer « le Noyau approche » au salon, et deux copies
     divergeraient. */
  _rosterCleared() {
    for (let i = 0; i < BOSS_FINAL; i++) {
      if (!this.bossKindsKilled.has(i)) return false;
    }
    return true;
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
      // Le boss CLOT un segment : il sort quand l'horloge de horde atteint
      // TL_CFG.SEGMENT_TIME, et son combat est hors de cette horloge (D1). Le
      // spawner est muet pendant ce temps ; c'est sa mort qui ouvre le segment
      // suivant.
      if (this.bossPending) {
        this.bossPending = false;
        this.bossCount++;
        const crowd = this.aliveCrowd();

        /* Le boss balaie l'arene en arrivant. Sans ca il debarquait au milieu
           de 200 ennemis deja presents : sa silhouette, ses zones et sa barre
           de vie se perdaient dans la masse, et personne ne pouvait concentrer
           son feu sur lui. Ce nettoyage cree la respiration qui manquait.
           Aucun point n'est credite : ce n'est pas un cadeau de score. */
        this.enemies = [];
        this.shots = [];
        this.zones = [];

        /* ARENE DE BOSS (lot I). Le combat se joue dans des bounds resserres
           a la taille d'UNE VUE, ancres sur le centre de gravite de l'equipe :
           toutes les mecaniques (damier, exaflares, couronne...) restent
           calibrees a l'echelle d'un ecran, et la couronne mortelle existante
           fait le reste — la horde des renforts la traverse, les joueurs non.
           Les joueurs eloignes sont RAMENES au bord : le combat commence, il
           n'attend personne. C'est le mecanisme de constriction du lot 5,
           reutilise tel quel — `_bossDead` rouvre l'arene entiere. */
        const c = this._teamCentroid();
        const bw = CFG.VIEW_W, bh = CFG.VIEW_H;
        const bcx = Math.min(Math.max(c.x, bw / 2), CFG.ARENA_W - bw / 2);
        const bcy = Math.min(Math.max(c.y, bh / 2), CFG.ARENA_H - bh / 2);
        this.bounds = {
          x0: bcx - bw / 2, y0: bcy - bh / 2,
          x1: bcx + bw / 2, y1: bcy + bh / 2,
        };
        for (const p of this.players.values()) this._clampToBounds(p, CFG.PLAYER_RADIUS);

        this.effects.push({
          id: this._nextId++,
          x: bcx, y: bcy,
          r: CFG.BOSS_SWEEP_R,
          life: 0.9, max: 0.9,
          kind: 1,
        });

        /* PV cales sur l'effectif vivant, le segment, la difficulte et le
           `hpMul` du roster — ET SUR RIEN D'AUTRE (D2). Ils suivaient la
           puissance mesuree de l'equipe, ce qui donnait une duree de combat
           rigoureusement constante : x1,00 de sensation de puissance pour un
           ecart de build mesure a x4,54. Le genou etait la premiere moitie du
           chemin, la reference fixe est la seconde.
           `_bossPower()` reste dans le code et alimente encore la fenetre de
           build : revenir en arriere est un changement de constante. */
        const power = CFG.BOSS_POWER_REF;
        /* `hpMul` du roster : il compense ce que le VERBE coute en temps de
           tir, et rien d'autre. La Matriarche voit une partie des degats de
           l'equipe partir sur ses rejetons (0,85), le Metronome fait passer le
           combat a courir (0,90), l'Oracle donne a une equipe coordonnee des
           fenetres de degats franches (1,10). */
        /* LE BOSS FINAL CLOT LE SEGMENT 6, et rien d'autre ne le fait sortir.
           C'est la simplification du lot W : le plan precedent devait prouver
           « apres un cycle complet du roster » par arithmetique, la structure en
           segments rend la garantie vraie par construction. Les cinq
           intermediaires ont donc ete vus une fois chacun quand il arrive, le
           deck se distribuant exactement. */
        const kind = this.segment >= TL_CFG.SEGMENTS
          ? BOSS_FINAL
          : this._pickBoss(this.players.size);
        this.lastBossKind = kind;
        const def = bossAt(kind);
        const hp = CFG.BOSS_HP_BASE * Math.pow(crowd, 1.15)
          * (1 + (this.bossCount - 1) * CFG.BOSS_GROWTH)
          * power * CFG.BOSS_HP_MUL * this.diff.boss * def.hpMul
          // Le final porte huit barres au lieu de cinq : ses PV suivent, et
          // au-dela du simple rapport 8/5 — voir `FINAL_HP_MUL`.
          * (kind === BOSS_FINAL ? BOSS_CFG.FINAL_HP_MUL : 1);
        // `bars` vient du ROSTER depuis le lot W, avec la constante globale en
        // repli : un boss qui suit la regle commune n'a rien a declarer.
        const bars = def.bars ?? CFG.BOSS_BARS;
        const pos = this._spawnPoint();
        this.boss = {
          id: this._nextId++,
          kind,
          x: pos.x, y: pos.y,
          hp, maxHp: hp,
          bars,
          barHp: hp / bars,
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
             qui n'allongent que la duree.
             Indexe sur le SEGMENT et non sur `bossCount` : les deux coincident
             en pratique, mais le segment est le meme pour toutes les equipes,
             donc la choregraphie du segment 4 est apprenable et racontable.
             L'ecrire ainsi supprime la possibilite qu'ils divergent — un boss
             non tue, une reprise, un evenement. */
          /* Le final ne commence PAS avec un repertoire deja ouvert : `floor` a
             zero. Les cinq intermediaires demarrent au niveau du segment parce
             qu'ils rejouent un repertoire qu'on connait ; le final, lui, raconte
             une progression — une barre, un boss d'origine — et la faire sauter
             reviendrait a supprimer la seule chose qui distingue sa premiere
             moitie d'un medley. */
          floor: kind === BOSS_FINAL
            ? 0
            : Math.min(this.segment - 1, bars - 1),
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
          // Lot R : duree du combat, date de la derniere rupture de barre et
          // paliers d'enrage franchis. Tous sur l'ENTITE et non sur GameState,
          // comme les autres minuteurs de boss : ils disparaissent avec lui.
          fightT: 0,
          lastBreak: 0,
          enrage: 0,
          bank: 0,               // degats mis de cote par le plancher de barre
          // Attaques differees en attente (lot W) : la seconde moitie d'une
          // synthese, l'ouverture d'une barre. Sur l'entite comme tous les
          // minuteurs de boss — elles disparaissent avec lui, et une moitie qui
          // se resoudrait apres sa mort poserait des zones sans boss.
          defer: [],
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

    b.fightT += dt;
    this._bossEnrage(b);
    // Seconde moitie d'une synthese (lot W) : elle tombe `SYNTH_GAP` apres la
    // premiere, jamais dans la meme image — deux annonces simultanees ne se
    // lisent ni l'une ni l'autre.
    this._bossDefer(b, dt);

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
        /* Les renforts naissent sur le BORD de l'arene de boss, jamais via
           `_spawnPoint` : depuis le lot I le combat vit dans des bounds
           resserres, et un renfort tire autour des joueurs serait ne dans la
           couronne — a 60 degats par seconde, il mourait avant d'arriver et
           le boss perdait tous ses renforts sans que personne ne tire. */
        const B = this.bounds;
        for (let i = 0; i < count; i++) {
          const side = Math.floor(Math.random() * 4);
          const sx = side === 2 ? B.x0 + 20 : side === 3 ? B.x1 - 20
            : B.x0 + Math.random() * (B.x1 - B.x0);
          const sy = side === 0 ? B.y0 + 20 : side === 1 ? B.y1 - 20
            : B.y0 + Math.random() * (B.y1 - B.y0);
          this._spawnEnemy(-1, sx, sy);
        }
      }
    }

    b.attackCd -= dt;
    if (b.attackCd <= 0) {
      // Le rythme se resserre a chaque barre brisee, et une seconde fois a
      // chaque palier d'enrage — deux planchers distincts, le second plus bas :
      // l'enrage est une sortie, il a le droit d'etre plus violent que la
      // progression normale du combat.
      const phase = Math.max(0.55, 1 - CFG.BOSS_PHASE_CD_STEP * b.phase);
      const rage = Math.max(BOSS_CFG.ENRAGE_CD_FLOOR, 1 - BOSS_CFG.ENRAGE_CD * b.enrage);
      b.attackCd = CFG.BOSS_ATTACK_CD * phase * rage;
      this._bossAttack(b, dx / d, dy / d);
    }
  }

  /* ENRAGE. Le combat s'eternise : le boss frappe plus fort et plus vite, par
     paliers, et CHAQUE PALIER S'ANNONCE. Une variante muette surprend au lieu
     d'informer, ce qui est exactement le reproche fait a une mecanique
     punitive — meme regle que les variantes de rupture de barre.

     Il ne contourne aucun invariant : il ne fait que monter des degats de zone
     et une cadence, donc tout passe par `_hurt`, donc sous le plafond « une
     mecanique ratee ne tue jamais un joueur a pleine vie ». */
  _bossEnrage(b) {
    /* Le seuil du FINAL est le sien : sa mediane attendue est deux fois celle
       d'un boss ordinaire, et au seuil commun la moitie des combats medians
       enrageraient — un garde-fou deviendrait une mecanique de phase. C'est le
       RAPPORT (environ deux fois la mediane) qu'on conserve, pas la valeur. */
    const seuil = b.kind === BOSS_FINAL ? BOSS_CFG.FINAL_ENRAGE_AT : BOSS_CFG.ENRAGE_AT;
    if (b.fightT < seuil) return;
    const palier = 1 + Math.floor((b.fightT - seuil) / BOSS_CFG.ENRAGE_STEP);
    if (palier <= b.enrage) return;
    b.enrage = palier;
    this._alert(MECH_ENRAGE, 2);
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

  /* Rupture de barre. C'est le moment ou le combat change de tete : souffle,
     projectiles effaces, une mecanique de plus au repertoire.
     On boucle plutot que d'incrementer une fois, parce qu'une nova ou une
     equipe de quatre peut traverser deux barres dans la meme image.

     Le souffle ne DEPLACE pas les joueurs : un joueur qu'on repousse pendant
     qu'il esquive une zone se fait tuer par un evenement qu'il n'a aucun moyen
     de jouer, et le recalage sec de la prediction rendait le tout illisible.

     ELLE NE FAIT PLUS DE DEGATS (lot A). C'etait la meme ligne cinq fois par
     combat, pour les cinq boss, et elle PUNISSAIT une reussite : le joueur qui
     casse une barre encaissait 18 points de degats multiplies par la difficulte
     et par sa Vulnerabilite en cours. Le souffle seul suffit a marquer le
     changement de phase — il efface les projectiles en vol et releve
     `attackCd`, donc il ouvre une fenetre de respiration au lieu de la fermer.

     Et elle est DECLINEE PAR BOSS, selon son verbe. Une variante par boss et
     non une variante par effectif : c'est le meme principe que `adaptMech`, et
     la duplication qu'on refuse est celle des combats, pas celle des
     evenements. Chacune s'annonce par le canal d'alerte — une variante qui ne
     s'annonce pas surprend au lieu d'informer, ce qui est precisement ce qu'on
     reproche a une mecanique punitive. */
  _bossBars(b) {
    /* LA BANQUE EST LE SIGNAL, pas le quotient des PV. Le compte de barres se
       deduisait d'une division — `floor((maxHp - hp) / barHp)` — et depuis que
       le plancher borne les PV, ce quotient vaut 1 a un cheveu pres : du mauvais
       cote, `floor` rend 0 et AUCUNE barre ne casse. Le boss restait alors fige
       a un cheveu de sa rupture, la reserve montait a cent mille PV et le combat
       ne se terminait jamais — mesure : les Jumeaux survivaient a treize minutes
       de tir continu, les quatre autres boss tombant en une minute.

       Un epsilon aurait deplace le probleme sans le supprimer : rien ne garantit
       l'ecart, et il s'est avere valoir plusieurs PV et non un ulp. Or la
       reserve dit DEJA, par construction, que la barre est epuisee — elle ne se
       remplit que quand le plancher a mordu. On teste donc ca, et le quotient ne
       sert plus que de filet pour le cas ou la barre serait franchie sans que le
       plancher ait eu a border quoi que ce soit. */
    while (b.phase < b.bars - 1
           && (b.bank > 0 || b.hp <= b.maxHp - (b.phase + 1) * b.barHp + 1e-6)) {
      /* PLANCHER DE BARRE (lot R). Sous D2, un combat de 29 s traverse les cinq
         barres sans laisser sortir la moitie du repertoire — or chaque barre
         ouvre une couche de repertoire, et c'est lui qui fait la difficulte des
         combats tardifs a la place des PV. On perdrait du contenu au moment
         precis ou l'on recompense le joueur.

         Les degats en exces ne sont PAS perdus : `broken` se deduit des PV a
         chaque image, donc la rupture est seulement DIFFEREE. Un `while` qui
         sort au lieu d'un `continue` — la barre suivante attendra son tour.

         Le test `if (!this.boss) return` plus bas reste bien qu'il soit devenu
         theoriquement inatteignable : le plancher supprime le cas de deux
         barres traversees dans la meme image, mais un test qui ne coute rien et
         qui protege la prochaine mecanique se garde. */
      // Le plancher du final est le sien : huit barres a franchir, et c'est lui
      // qui garantit que les huit couches de repertoire passent a l'ecran.
      const dwell = b.kind === BOSS_FINAL ? BOSS_CFG.FINAL_BAR_DWELL : BOSS_CFG.BAR_DWELL;
      if (b.fightT - b.lastBreak < dwell) return;
      b.lastBreak = b.fightT;
      b.phase++;
      /* Les degats mis de cote par le plancher s'appliquent MAINTENANT. Ils
         peuvent traverser la barre suivante d'un coup — c'est voulu, une equipe
         qui frappe trois fois trop fort doit le voir — mais le `while` sera
         bloque par le delai au tour suivant, donc une seule rupture par
         echeance.

         LA MORT SE TESTE ICI, et c'est le seul endroit du jeu hors `_damage`
         qui retire des PV : sans ce test le boss tombait a des PV negatifs et y
         RESTAIT — plus aucun coup ne pouvait le tuer puisque `_damage` clampait
         a nouveau, et le combat ne se terminait jamais. Mesure avant correctif :
         zero boss abattu en dix minutes de combat. */
      /* La banque se vide BARRE PAR BARRE et non d'un coup, et c'est le
         correctif qui rend le plancher vrai (lot W).

         Elle se vidait entierement a la premiere rupture. Contre une build tres
         forte, l'excedent accumule pendant les dix secondes du palier depassait
         la reserve restante et le boss mourait DANS sa premiere rupture :
         mesure sur le final a x20 de degats, 11 s de combat et une seule couche
         de repertoire vue sur huit. Le plancher differait la rupture sans jamais
         differer la MORT — c'est-a-dire qu'il ne protegeait rien.

         On n'applique donc que ce qui mene au plancher de la barre SUIVANTE ; le
         reste attend la prochaine echeance. Aucun degat n'est perdu, la promesse
         de lot R est intacte, et le combat dure desormais au moins
         (barres - 1) x DWELL quelle que soit la build. Sur la DERNIERE barre il
         n'y a plus de plancher : tout s'applique, et le boss peut mourir la —
         c'est le seul endroit ou il le doit. */
      if (b.bank > 0) {
        /* Le plancher a viser apres CETTE rupture. Sur une barre ordinaire c'est
           celui de la suivante ; sur la derniere il n'y en a pas — sauf pour le
           final, dont la derniere barre en a un a 1 PV, le temps que le sceau se
           joue. Sans cette exception, la banque videe a la septieme rupture
           tuait le boss dans l'image meme ou sa huitieme barre s'ouvrait. */
        const dernier = b.phase >= b.bars - 1;
        const plancher = dernier
          ? (b.kind === BOSS_FINAL ? 1 : 0)
          : b.maxHp - (b.phase + 1) * b.barHp;
        const prise = Math.min(b.bank, Math.max(0, b.hp - plancher));
        b.hp -= prise;
        b.bank -= prise;
        if (b.hp <= 0) { this._killBoss(b.lastHitBy ?? 0); return; }
      }

      /* CHAQUE BARRE DU BOSS FINAL OUVRE SUR LE PATRON QU'ELLE VIENT DE
         DEBLOQUER, il n'est pas tire au sort.

         Laisse au tirage, le patron d'une couche n'est qu'une chance sur dix a
         chaque attaque d'une barre qui dure dix secondes, soit trois ou quatre
         tirages : le sceau — seule mecanique inedite du combat — pouvait ne
         jamais sortir, et la synthese non plus. C'est exactement le defaut que le
         plancher de barre existe pour corriger, perdre du contenu au moment ou
         l'on recompense, et le plancher seul n'y suffisait pas.

         C'est aussi ce qui rend la structure du combat LISIBLE : la barre 1
         s'ouvre sur le damier du Ravageur, la 2 sur les grappes de la Matriarche,
         la 8 sur le sceau. Le joueur entend la citation au moment ou elle est
         faite au lieu de la rencontrer trois attaques plus tard, melangee au
         reste.

         Ca passe par la file d'attaques differees plutot que d'etre pose ici : la
         rupture vient d'effacer les projectiles et de relever `attackCd`, et une
         consigne lancee dans la meme image que le souffle serait annoncee
         par-dessus lui. */
      if (b.kind === BOSS_FINAL) {
        const couche = bossAt(BOSS_FINAL).unlock[b.phase - 1];
        if (couche && couche.length) this._deferAtk(b, couche[0], 1.2);
      }
      b.attackCd = Math.max(b.attackCd, 1.6);   // respiration avant la suite
      this.shots = [];

      this.effects.push({
        id: this._nextId++,
        x: b.x, y: b.y,
        r: CFG.BOSS_BREAK_RADIUS,
        life: 0.8, max: 0.8,
        kind: 6,
      });

      this._bossBreak(b);
      // Le boss peut mourir dans sa propre rupture (deux barres traversees dans
      // la meme image, derniere barre incluse) : `_bossBreak` lit `this.boss2`,
      // qui a pu disparaitre entre deux tours de boucle.
      if (!this.boss) return;
    }

    /* ECHEANCE DE LA DERNIERE BARRE DU FINAL. Le `while` ci-dessus ne tourne que
       tant qu'il reste une barre a rompre ; la derniere n'en est pas une, elle
       est la mort. Les degats mis de cote pendant ses dix secondes tombent donc
       ici, une fois le delai passe — sans cette ligne, ils resteraient en banque
       et le boss vivrait a 1 PV indefiniment. */
    if (b.kind === BOSS_FINAL && b.phase >= b.bars - 1 && b.bank > 0
        && b.fightT - b.lastBreak >= BOSS_CFG.FINAL_BAR_DWELL) {
      b.hp -= b.bank;
      b.bank = 0;
      if (b.hp <= 0) this._killBoss(b.lastHitBy ?? 0);
    }
  }

  /* La variante de rupture, par boss. Extraite pour que `_bossBars` reste le
     squelette partage — cinq barres, une couche de repertoire par barre — et que
     l'ecart entre les cinq combats tienne en un seul `switch`. */
  _bossBreak(b) {
    switch (b.kind) {
      /* Matriarche : elle PRODUIT, c'est tout son verbe. Une nuee hors budget de
         vague, exactement comme ses renforts ordinaires : la barre rompue ne
         doit pas se payer sur le budget de la vague en cours, mais les rejetons
         comptent bien pour « arene vide ». Le plafond d'arene est respecte —
         sans lui, une derniere barre cassee arene pleine ne faisait rien
         apparaitre et l'annonce mentait. */
      case BOSS_MATRIARCHE:
        this._finalBrood(b);
        return;

      /* Metronome : il n'attaque pas, il occupe l'espace — donc on renverse
         l'espace. Toutes les zones EN COURS repartent dans l'autre sens : les
         disques a la derive, les sanctuaires qui glissent, les exaflares deja
         posees. Le joueur qui avait lu le motif doit le relire, ce qui est
         exactement la question que ce combat pose.
         Les zones qui POURSUIVENT un joueur (`follow`) en sont exclues : une
         poursuite inversee devient une fuite, c'est-a-dire plus rien. */
      case BOSS_METRONOME:
        this._finalReverse();
        return;

      /* Oracle : il regarde, il ordonne, il ne touche pas. Sa rupture est donc
         la seule qui laisse une TRACE durable, et c'est un cumul de
         Vulnerabilite a toute l'equipe — la monnaie de sanction de tout le jeu.
         Elle passe par `_applyStatus`, point de passage unique, donc la
         Sentence en equipe sans soigneur et la duree d'etat des cartes sont
         respectees sans qu'on y pense. Le Miasme dit deja cette phrase : on
         reutilise son annonce plutot que d'en ecrire une seconde. */
      case BOSS_ORACLE:
        this._finalVuln();
        return;

      /* Jumeaux : leur verbe est la separation. Ils echangent leurs places, donc
         l'equipe qui venait de se repartir entre les deux se retrouve du mauvais
         cote. C'est le renversement le moins couteux du roster — deux positions
         permutees — et le plus lisible : la teinte dit lequel on avait devant
         soi, elle vient de traverser l'arene. */
      case BOSS_JUMEAUX: {
        if (!this.boss2) return;
        const x = b.x, y = b.y;
        b.x = this.boss2.x; b.y = this.boss2.y;
        this.boss2.x = x; this.boss2.y = y;
        this._alert(MECH_SWAP, 2);
        return;
      }

      /* LE BOSS FINAL (lot W). Sa rupture est une synthese, comme le reste de
         lui : chaque barre rejoue la rupture du boss dont elle vient d'ouvrir le
         patron. La barre 1 souffle comme le Ravageur, la 2 lache une nuee comme
         la Matriarche, la 3 inverse les motifs comme le Metronome, la 4 pose un
         cumul comme l'Oracle.

         L'echange des Jumeaux n'y figure PAS, et c'est le seul trou de la
         serie : il permute deux positions, et le final n'a pas de moitie. Une
         rupture qui n'aurait rien permute aurait annonce un echange sans
         echange — exactement le defaut qu'on reproche a une variante muette,
         mais a l'envers.

         A partir de la barre 5 il rejoue DEUX variantes a la fois, ce qui est
         son verbe. Deux annonces et non une troisieme entree de table : les deux
         phrases existent, elles sont exactes, et en ecrire une nouvelle qui dise
         « les deux precedentes » aurait fait trois libelles a garder d'accord. */
      case BOSS_FINAL: {
        if (b.phase <= 1) { this._alert(MECH_BREATH, 2); return; }
        if (b.phase === 2) { this._finalBrood(b); return; }
        if (b.phase === 3) { this._finalReverse(); return; }
        if (b.phase === 4) { this._finalVuln(); return; }
        this._finalBrood(b);
        this._finalVuln();
        return;
      }

      // Ravageur, et repli de tout boss ajoute plus tard : le souffle seul.
      default:
        this._alert(MECH_BREATH, 2);
    }
  }

  /* Les deux variantes de rupture que le final REJOUE, extraites pour qu'elles
     ne soient ecrites qu'une fois. Elles sont volontairement identiques a celles
     de la Matriarche et de l'Oracle — un final qui les jouerait « un peu
     autrement » perdrait la citation, qui est tout l'effet recherche. */
  _finalBrood(b) {
    for (let i = 0; i < BOSS_CFG.BROOD_COUNT; i++) {
      if (this.enemies.length >= CFG.MAX_ENEMIES) break;
      const a = Math.random() * Math.PI * 2;
      this._spawnEnemy(1, b.x + Math.cos(a) * 130, b.y + Math.sin(a) * 130);
    }
    this._alert(MECH_BROOD, 2);
  }

  _finalVuln() {
    for (const p of this._alivePlayers()) {
      this._applyStatus(p, STATUS_VULN, BOSS_CFG.MECH_VULN);
    }
    this._alert(MECH_MIASMA, 0);
  }

  _finalReverse() {
    let n = 0;
    for (const z of this.zones) {
      if (z.follow) continue;
      if (!z.vx && !z.vy) continue;
      z.vx = -z.vx; z.vy = -z.vy;
      n++;
    }
    // On n'annonce l'inversion que s'il y avait quelque chose a inverser : une
    // consigne sans rien a l'ecran est pire que pas de consigne.
    if (n > 0) this._alert(MECH_REVERSE, 2);
    else this._alert(MECH_BREATH, 2);
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
      // Les trois exclusives du boss final (lot W).
      case "synthese":     this._atkSynthese(b, 0); break;
      case "entrelacs":    this._atkSynthese(b, 1); break;
      case "sceau":        this._atkSceau(b); break;
      default:             this._atkMarques(b); break;
    }
  }

  /* SYNTHESE (lot W, boss final). Elle ne cree AUCUNE geometrie a elle : elle
     superpose deux patrons que le joueur connait deja, avec un decalage.

     C'est tout l'interet du boss final tel qu'il est ecrit. Un huitieme patron
     inedit aurait ete un patron de plus a apprendre ; deux patrons connus joues
     ensemble demandent de tenir DEUX lectures a la fois, ce qu'aucun des cinq
     combats ne demande — et ca ne coute pas une ligne de geometrie nouvelle.

     Le decalage n'est pas cosmetique : sans lui les deux annonces tombent dans
     la meme image et le joueur n'en lit aucune. Avec, il lit la premiere, se
     place, et doit relire pendant qu'il tient sa position.

     `_atk` est rappele plutot que la methode visee directement : le decalage
     passe par la meme file d'attaques differees que le reste, et une variante
     ajoutee plus tard n'aura rien a rebrancher. */
  _atkSynthese(b, variante) {
    /* Les deux combinaisons sont choisies pour se CONTREDIRE, jamais pour
       s'additionner. La premiere demande de se rassembler pendant qu'une ligne
       d'exaflares traverse : on doit tenir un point ET s'ecarter d'un axe. La
       seconde demande de lire une couronne (rentrer, puis ressortir) pendant que
       des disques derivent : deux horloges qui ne battent pas ensemble.
       Deux patrons qui demanderaient la meme chose ne seraient qu'un patron
       joue deux fois plus fort. */
    if (variante === 0) {
      this._atkRassemblement(b);
      this._deferAtk(b, "exaflare", BOSS_CFG.SYNTH_GAP);
    } else {
      this._atkCouronne(b);
      this._deferAtk(b, "derive", BOSS_CFG.SYNTH_GAP);
    }
    this._alert(MECH_SYNTH, BOSS_CFG.SYNTH_GAP);
  }

  /* File d'attaques DIFFEREES, portee par l'ENTITE — comme tous les minuteurs de
     boss, elle disparait donc avec lui : une seconde moitie de synthese qui se
     resoudrait apres sa mort poserait des zones dans une arene sans boss.

     UNE LISTE et non un emplacement unique, et le bug qui l'a impose vaut d'etre
     ecrit : a un seul emplacement, la synthese tiree par le pool de la huitieme
     barre ECRASAIT le sceau que la rupture venait d'y mettre. La seule mecanique
     inedite du combat disparaissait donc une fois sur deux, sans trace, au profit
     d'un patron que le joueur venait deja de voir. Mesure : sceau absent a tous
     les niveaux de degats testes.

     Deux entrees au plus en pratique — la moitie d'une synthese et l'ouverture
     d'une barre — donc la liste ne se plafonne pas : la borner aurait fait
     reapparaitre le meme probleme sous un autre nom. */
  _deferAtk(b, key, delay) {
    (b.defer ??= []).push({ key, t: delay });
  }

  _bossDefer(b, dt) {
    if (!b.defer || b.defer.length === 0) return;
    const restants = [];
    for (const d of b.defer) {
      d.t -= dt;
      if (d.t > 0) { restants.push(d); continue; }
      this._atk(d.key, b, Math.cos(b.ang), Math.sin(b.ang));
    }
    b.defer = restants;
  }

  /* LE SCEAU — huitieme barre, la derniere mecanique du jeu.

     Il reutilise `towerCount(alive)` et NON un second calcul d'effectif : une
     zone en solo (sinon la mecanique est une taxe), deux a deux, autant que de
     vivants au-dela — c'est la que « repartir l'equipe » devient une decision.
     Ecrire un second calcul aurait donne deux regles a garder d'accord pour la
     meme question.

     Trois choses le distinguent des tours de l'Oracle, et les trois sont
     necessaires pour qu'il soit lisible comme autre chose :
       - la fenetre est LONGUE (6 s contre 4,2) : il faut traverser l'arene, pas
         se decaler ;
       - les foyers sont poses plus LOIN du centre : le sceau demande de se
         repartir sur toute la surface, pas autour du boss ;
       - la sanction est PLEINE et frappe TOUTE l'equipe, un seul foyer vide
         suffit. Les tours sanctionnent au prorata ; le sceau est tout ou rien,
         c'est ce qui en fait la derniere marche. */
  _atkSceau(b) {
    const alive = this._alivePlayers();
    if (alive.length === 0) return;
    const grp = this._nextId++;
    const B = this.bounds;
    const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
    const rad = Math.min(B.x1 - B.x0, B.y1 - B.y0) * BOSS_CFG.SEAL_SPREAD;
    const base = Math.random() * Math.PI * 2;
    const n = towerCount(alive.length);

    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      this._mark({
        mech: MECH_SEAL, grp, lead: i === 0 ? 1 : 0,
        x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad,
        r: BOSS_CFG.SEAL_RADIUS, t: BOSS_CFG.SEAL_WARN, need: 1,
      });
    }
    this._alert(MECH_SEAL, BOSS_CFG.SEAL_WARN);
  }

  /* Resolution du sceau : TOUT OU RIEN. Un seul foyer vide et l'equipe entiere
     prend la sanction pleine — la meme que l'ultime de l'Oracle, qui est le seul
     autre endroit du jeu ou reussir une mecanique achete quelque chose plutot
     que d'eviter une punition.
     Le requis est plafonne aux joueurs REELLEMENT vivants, comme pour les tours :
     un joueur qui se deconnecte ne doit pas rendre le sceau impossible et bloquer
     la derniere barre du dernier boss. */
  _resolveSceau(lead) {
    const group = this.marks.filter(m => m.grp === lead.grp);
    const alive = this._alivePlayers();
    if (alive.length === 0) return;
    const foyers = Math.min(group.length, alive.length);
    let tenus = 0;
    for (const m of group) {
      if (this._countIn(m) >= 1) tenus++;
    }
    if (tenus >= foyers) return;         // reussi : aucune sanction
    for (const p of alive) this._mechHit(p, BOSS_CFG.SEAL_RATIO);
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
    // Geometrie sur les BOUNDS du combat, plus sur l'arene dessinee (lot I) :
    // un mur qui balaie 4800 px n'annonce plus rien a l'echelle d'une vue.
    const B = this.bounds;
    const bw = B.x1 - B.x0, bh = B.y1 - B.y0;
    const vertical = Math.random() < 0.5;
    const span = vertical ? bw : bh;
    const across = vertical ? bh : bw;
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
          x: B.x0 + (vertical ? pos : before / 2),
          y: B.y0 + (vertical ? before / 2 : pos),
          w: vertical ? CFG.WALL_THICKNESS : before,
          h: vertical ? before : CFG.WALL_THICKNESS,
          warn, dmg: this._zoneDamage(b),
        });
      }
      if (after > 4) {
        this._zone({
          shape: 1,
          x: B.x0 + (vertical ? pos : across - after / 2),
          y: B.y0 + (vertical ? across - after / 2 : pos),
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

  /* Centre de gravite de l'equipe vivante (lot I). Repli : centre des bounds —
     qui vaut le centre de l'arene en temps normal. Trois usages : l'apparition
     d'un joueur, l'ancrage de l'arene de boss, l'onde de montee de niveau.

     Il n'existe que depuis la GRANDE ARENE : sur 1600 x 900 le centre de la
     salle faisait l'affaire pour les trois, sur 4800 x 2700 il peut etre a
     trente secondes de marche de tout le monde. */
  _teamCentroid() {
    const ps = this._alivePlayers();
    if (ps.length === 0) {
      const B = this.bounds;
      return { x: (B.x0 + B.x1) / 2, y: (B.y0 + B.y1) / 2 };
    }
    let sx = 0, sy = 0;
    for (const p of ps) { sx += p.x; sy += p.y; }
    return { x: sx / ps.length, y: sy / ps.length };
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

  /* ANNONCE DE METEO (lot V). Troisieme entree du canal d'alerte apres les
     mecaniques et les evenements, et pour la meme raison qu'eux : deux tables,
     UN SEUL chemin d'annonce. `applyAlert` cote client consulte l'une ou l'autre
     selon la cle presente, et tout le reste — file, horloge de rendu, retrait de
     250 ms — reste commun.
     `dur` a 0 : une meteo dure un segment entier, ce n'est pas un compte a
     rebours avant impact mais le titre de ce qui commence. Le client tient alors
     le bandeau 1,5 s, comme le Miasme. */
  _alertWeather(id) {
    const def = weatherAt(id);
    if (!def) return;
    this.alerts.push({ meteo: id, level: ALERT_INFO, dur: 0 });
    if (this.alerts.length > 16) this.alerts.shift();
  }

  // Identite du boss a l'entree : nom et verbe. C'est ce qui permet a une equipe
  // de savoir immediatement a quoi s'attendre, avant meme la premiere annonce.
  _alertBoss(kind) {
    this.alerts.push({ mech: -1, level: ALERT_INFO, dur: 3, boss: kind });
  }

  /* Annonce d'une vague speciale (lot L). Troisieme variante du canal, a cote
     de la mecanique et de l'identite du boss : ce n'est ni l'une ni l'autre —
     aucune entree de MECHS ne lui correspond, et en fabriquer une melangerait
     le registre des mecaniques de boss avec celui des compositions de vague.
     Un client reste sur une version anterieure ignore la cle et ne voit rien,
     ce qui est le comportement voulu : la vague se joue de la meme facon. */
  _alertSpecial(index) {
    this.alerts.push({ mech: -1, level: ALERT_WARN, dur: CFG.WAVE_BREATHER, special: index });
    if (this.alerts.length > 16) this.alerts.shift();
  }

  /* Sanction d'echec. Calibree en part des PV MAX et non en valeur brute : une
     valeur fixe vieillit des la premiere carte de PV. Le drapeau `mech` de
     `_hurt` garantit qu'un joueur a pleine vie n'en meurt pas — c'est le cumul
     de Vulnerabilite pose ici qui rend le SECOND echec fatal. */
  _mechDamage(p) { return p.maxHp * BOSS_CFG.MECH_DAMAGE_RATIO; }

  _mechHit(p, ratio = 1) {
    if (!p || p.downed) return;
    p.mechFails++;
    this._hurt(p, this._mechDamage(p) * ratio, MECH_HURT);
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
      this._hurt(p, this._mechDamage(p) * share, MECH_HURT);
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
    const hp = BOSS_CFG.JAIL_HP * this._bossPower();
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
    const hp = BOSS_CFG.CLUSTER_HP * this._bossPower();
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
      else this._hurt(p, this._mechDamage(p) * ratio, MECH_HURT);
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
    const B = this.bounds;
    const bw = B.x1 - B.x0, bh = B.y1 - B.y0;
    const a = Math.random() * Math.PI * 2;
    const start = {
      x: (B.x0 + B.x1) / 2 - Math.cos(a) * bw * 0.45,
      y: (B.y0 + B.y1) / 2 - Math.sin(a) * bh * 0.45,
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
    const B = this.bounds;
    if (f.left <= 0 || f.x < B.x0 - 200 || f.x > B.x1 + 200
        || f.y < B.y0 - 200 || f.y > B.y1 + 200) b.flare = null;
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
      const len = Math.hypot(this.bounds.x1 - this.bounds.x0, this.bounds.y1 - this.bounds.y0);
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
    const len = Math.hypot(this.bounds.x1 - this.bounds.x0, this.bounds.y1 - this.bounds.y0) / 2;
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
      // Le sceau se compte comme une tour : c'est la meme question — combien de
      // joueurs sont dedans — et le client dessine la meme jauge.
      case MECH_SEAL:
        m.cur = this._countIn(m);
        break;
      case MECH_LINK: {
        const a = this.players.get(m.a), c = this.players.get(m.b);
        // Lien orphelin : un joueur qui se deconnecte ou tombe ne doit pas
        // laisser l'autre attache a rien jusqu'a l'echeance.
        if (!a || !c || a.downed || c.downed) { m.dead = true; return; }
        m.x = (a.x + c.x) / 2; m.y = (a.y + c.y) / 2;
        if ((a.x - c.x) ** 2 + (a.y - c.y) ** 2 >= m.r * m.r) { m.dead = true; return; }
        const lien = { ignoreCooldown: true, overTime: true, src: SRC_MECH };
        this._hurt(a, BOSS_CFG.LINK_DPS * dt, lien);
        this._hurt(c, BOSS_CFG.LINK_DPS * dt, lien);
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
      // Meme regle de meneur unique, resolution differente : le sceau est tout
      // ou rien la ou les tours sanctionnent au prorata.
      case MECH_SEAL:
        if (m.lead) this._resolveSceau(m);
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
     grandeur des cartes prises.

     Le CALCUL vit dans `powerIndex()`, fonction pure exportee : la fenetre de
     build affiche ce chiffre au joueur, et c'est le seul du panneau qui explique
     a la fois les PV du boss et la pression des vagues. Le recoder cote client
     aurait donne deux implementations qui divergent au premier reglage — meme
     raison que `fullMods` et `effectiveCards`. */
  _playerPower(p) {
    /* `powerMods` et non `mods` : la progression permanente (lot D) est exclue
       de la mesure de puissance par decision verrouillee du plan. L'indexer
       ici rendrait la meta absorbee par la difficulte — un tapis roulant — et
       taxerait l'arbre offensif du Tireur la ou celui du Rempart, defensif,
       passerait gratuit, sans que personne ne comprenne pourquoi. Le repli sur
       `mods` couvre un GameState d'avant le lot (script de mesure).

       Les reliques a degats bruts (lot K), elles, y ENTREnt — c'est la
       decision de K5 : sans elles, les vagues suivant un passage chez le
       marchand seraient sous-calibrees par rapport aux degats reels de
       l'equipe, et le boss du lot N serait une formalite. La spec exigeait
       l'injection « en amont du calcul », c'est exactement ce que fait le
       parametre `flat` de powerIndex : un facteur sur la base, comme dans
       `_shoot`.

       Le flat du « Coeur de Ravageur » (boss uniquement) compte A UN TIERS —
       la part du temps de jeu passe contre les boss, une vague sur cinq plus
       leur duree — exactement le precedent du catalyseur, qui ne vaut que
       contre une cible affectee et compte a moitie. Le compter plein
       sur-calibrerait les vagues, ne pas le compter sous-calibrerait les
       boss : le premier tiers est la moyenne mesuree. */
    const flat = this._relicSum(p, "flatDamage")
      + this._relicSum(p, "bossDamage") * 0.3;
    return powerIndex(p.powerMods ?? p.mods, flat);
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

  /* Puissance vue par un BOSS : la meme, passee au genou (BOSS_POWER_KNEE). Une
     methode et non trois multiplications recopiees, pour la meme raison que
     `_hurt` ou `_damage` — les structures de mecanique (cage, grappe) doivent
     suivre exactement la meme courbe que la reserve de vie du boss. Sans ce
     point de passage, une build au-dessus du genou trouverait les cages
     RELATIVEMENT plus dures que le boss lui-meme, ce qui est le contraire de
     ce qu'on cherche : la cage est ce qu'on casse pour liberer un coequipier,
     pas le mur. Les VAGUES ne passent pas par ici — elles ont leur propre part
     (WAVE_HP_POWER_K), plus genereuse, et c'est voulu. */
  _bossPower() {
    return bossPower(this._teamPower());
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
      /* PROVENANCE des degats de la zone, et marquage HORDE. Le premier existe
         parce que l'explosion du kamikaze passe par une zone tout en devant se
         compter comme une explosion au bilan : sans lui, `_zoneApply` etait le
         seul point du jeu ou la source etait ecrite en dur. Le second sert au
         plafond de `_groundZone` — une zone de boss et une trainee ne se
         comptent pas dans le meme budget. */
      src: SRC_ZONE, horde: 0,
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
    // La grille couvre les BOUNDS du combat (lot I) — un damier decoupe sur
    // l'arene dessinee aurait des cases de 1200 px et un seul carreau visible.
    const B = this.bounds;
    const cw = (B.x1 - B.x0) / CFG.GRID_COLS;
    const ch = (B.y1 - B.y0) / CFG.GRID_ROWS;
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
          x: B.x0 + cw * (cx + 0.5), y: B.y0 + ch * (cy + 0.5),
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
    const B = this.bounds;
    const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
    const ringFirst = Math.random() < 0.5;
    const outer = Math.hypot(B.x1 - B.x0, B.y1 - B.y0);

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
    const B = this.bounds;
    const bw = B.x1 - B.x0, bh = B.y1 - B.y0;
    const mx = (B.x0 + B.x1) / 2, my = (B.y0 + B.y1) / 2;
    const vertical = Math.random() < 0.5;
    const lanes = 3;

    for (let i = 0; i < lanes; i++) {
      const k = (i + 0.5) / lanes;
      this._zone({
        shape: 1,
        x: vertical ? B.x0 + bw * k : mx,
        y: vertical ? my : B.y0 + bh * k,
        w: vertical ? CFG.LANE_THICKNESS : bw,
        h: vertical ? bh : CFG.LANE_THICKNESS,
        warn: CFG.LANE_WARN,
        dmg: this._zoneDamage(b),
      });
      this._zone({
        shape: 1,
        x: vertical ? mx : B.x0 + bw * k,
        y: vertical ? B.y0 + bh * k : my,
        w: vertical ? bw : CFG.LANE_THICKNESS,
        h: vertical ? CFG.LANE_THICKNESS : bh,
        warn: CFG.LANE_WARN + CFG.LANE_GAP,
        dmg: this._zoneDamage(b),
      });
    }
  }

  /* Balayage : des pales partent du boss et explosent l'une apres l'autre,
     dans le sens horaire ou l'inverse. On court avec l'aiguille, pas contre. */
  _atkBalayage(b) {
    const blades = CFG.SWEEP_BLADES;
    const len = Math.hypot(this.bounds.x1 - this.bounds.x0, this.bounds.y1 - this.bounds.y0);
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

  /* Point de passage unique des degats de zone du boss — d'ou l'enrage se
     branche ici et nulle part ailleurs : une mecanique ajoutee plus tard en
     herite sans qu'on y pense, exactement comme elle herite du palier de
     barre. */
  _zoneDamage(b) {
    return CFG.ZONE_DAMAGE
      * (1 + CFG.BOSS_PHASE_DAMAGE_STEP * b.phase)
      * (1 + BOSS_CFG.ENRAGE_DAMAGE * (b.enrage ?? 0));
  }

  /* ===========================================================================
     ARENE MOBILE (lot 5)

     Deux mecaniques ne posent pas de zone : elles changent la SURFACE. La
     constriction referme les limites par paliers, le verrouillage plante des
     murs infranchissables. Elles partagent le meme principe — rien n'est
     dessine sur le sol, c'est le sol lui-meme qui bouge — et le meme risque :
     tout ce qui borne un deplacement doit lire `this.bounds`.
     =========================================================================== */

  /* Deux choses gardent VOLONTAIREMENT l'arene entiere, et ce ne sont pas des
     oublis :

     - l'apparition des ennemis (`_spawnPoint`) : le tirage se fait autour des
       joueurs mais JAMAIS borne aux bounds — la horde traverse la couronne
       pour arriver, ce qui est exactement l'interaction que la constriction
       cherche a creer ;
     - le CULLING des projectiles : leur duree de vie fait le vrai travail, et
       les bornes larges de l'arene n'existent que contre une fuite infinie.

     La GEOMETRIE des zones, elle, lit les bounds depuis le lot I : une arene
     de boss fait une vue (1600 x 900) dans une salle de 4800 x 2700, et un
     damier decoupe sur la salle entiere n'aurait plus montre qu'un carreau.
     La grille se redecoupe donc au palier de constriction — c'est le prix,
     et il est paye une fois par palier, pas par image. Le REBOND des balles
     lit les bounds pour la meme raison : sur la salle entiere, une balle
     partait vivre sa vie a deux ecrans du combat. */

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
    const pt = {
      x: Math.min(Math.max(x, B.x0 + margin), B.x1 - margin),
      y: Math.min(Math.max(y, B.y0 + margin), B.y1 - margin),
    };
    if (!this.obstacles.length) return pt;
    /* Un bonus pose DANS un pilier est un bonus supprime, et c'est exactement la
       raison pour laquelle la geometrie ne bouge jamais en cours de manche :
       `_dropPoint` ne peut pas verifier une geometrie qui change. On ressort par
       le cote le moins enfonce — le meme calcul que `_obstacleBlock`, sans
       memoire du sens puisqu'un point ne vient de nulle part. */
    for (const b of this.obstacles) {
      if (b.maxHp > 0 && b.hp <= 0) continue;
      const hw = b.w / 2 + CFG.POWERUP_RADIUS, hh = b.h / 2 + CFG.POWERUP_RADIUS;
      const dx = pt.x - b.x, dy = pt.y - b.y;
      if (Math.abs(dx) >= hw || Math.abs(dy) >= hh) continue;
      if (hw - Math.abs(dx) <= hh - Math.abs(dy)) pt.x = b.x + (dx < 0 ? -hw : hw);
      else pt.y = b.y + (dy < 0 ? -hh : hh);
    }
    return this._clampToBounds(pt, margin);
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

  /* OBSTACLES DE BIOME (lot V). Meme regle que les murs de verrouillage, et
     c'est deliberement le meme code a une boucle pres : on repousse DU COTE D'OU
     L'ON VENAIT et non du cote le plus proche. A l'esquive, un joueur traverse
     162 px en trois images et se retrouverait de l'autre cote du pilier.

     Le repoussage est PAR AXE, ce qui donne le glissement le long d'un mur sans
     une ligne de plus : l'axe qui penetre le moins est corrige, l'autre continue
     son chemin. C'est ce qui empeche deux cents ennemis de rester colles a un
     pilier sans jamais le contourner — ils longent.

     Le BOSS n'y passe pas, et c'est assume : il fait jusqu'a 90 px de rayon,
     ses mecaniques le deplacent d'autorite (`_atkBond`, les Jumeaux) et un boss
     coince derriere une cuve rendrait le combat injouable. Ni lui ni les
     structures de mecanique — cage, grappe, tour — n'ont a connaitre le biome. */
  _obstacleBlock(o, wasX, wasY, radius = 0) {
    for (const b of this.obstacles) {
      if (b.maxHp > 0 && b.hp <= 0) continue;    // couverture abattue
      const hw = b.w / 2 + radius, hh = b.h / 2 + radius;
      const dx = o.x - b.x, dy = o.y - b.y;
      if (Math.abs(dx) >= hw || Math.abs(dy) >= hh) continue;
      // Profondeur de penetration sur chaque axe : on ressort par le moins
      // enfonce, en gardant le SENS d'ou l'on venait.
      const px = hw - Math.abs(dx), py = hh - Math.abs(dy);
      if (px <= py) o.x = wasX <= b.x ? b.x - hw : b.x + hw;
      else o.y = wasY <= b.y ? b.y - hh : b.y + hh;
    }
  }

  // Un point est-il dans un obstacle. Sert au placement (bonus au sol, anneau
  // d'apparition) : poser un bonus dans un pilier revient a le supprimer.
  _inObstacle(x, y, margin = 0) {
    for (const b of this.obstacles) {
      if (b.maxHp > 0 && b.hp <= 0) continue;
      if (Math.abs(x - b.x) < b.w / 2 + margin && Math.abs(y - b.y) < b.h / 2 + margin) {
        return true;
      }
    }
    return false;
  }

  /* Un projectile touche-t-il un obstacle. `dmg` positif vient d'un JOUEUR et
     entame la couverture destructible ; un tir ennemi s'arrete dessus sans rien
     lui faire. C'est la premiere des trois decisions du mur destructible : deux
     cents monstres abattraient la couverture en dix secondes, et un mur qui
     disparait sans qu'on sache pourquoi est un bug de retour, pas une
     difficulte.

     Le mur ne passe PAS par `_damage()` : ce point de passage porte le vol de
     vie, les critiques, l'execution et le compteur de touches, dont aucun n'a de
     sens ici — et l'execution en supprimerait un d'un seul tir. Meme
     raisonnement que « le soin du medic est un chemin neuf, pas un `_damage()`
     negatif ». Il ne rend NI SCORE NI EXPERIENCE : le credit vaut les PV max
     d'un ennemi TUE, une couverture n'en est pas un. */
  /* Une balle touche-t-elle un cristal ? Rend vrai si elle s'y arrete. Seuls
     les cristaux (`kind === 0`) encaissent : l'amas se canalise en se tenant
     dessus, lui tirer dessus n'aurait aucun sens — et le traverser est
     precisement ce qu'il faut pouvoir faire pour aller le canaliser.

     Aucun credit d'experience ni de score : une structure n'est pas un ennemi
     tue, c'est la meme regle que le mur destructible. Le rendement se verse
     dans `_harvestYield`, a la destruction, et il va a TOUTE l'equipe. */
  _harvestHit(x, y, dmg = 0) {
    for (const h of this.harvests) {
      if (h.kind !== 0 || h.hp <= 0) continue;
      const r = CFG.HARVEST_RADIUS + CFG.BULLET_RADIUS;
      if ((x - h.x) ** 2 + (y - h.y) ** 2 > r * r) continue;
      if (dmg > 0) h.hp = Math.max(0, h.hp - dmg);
      return true;
    }
    return false;
  }

  _obstacleHit(x, y, dmg = 0) {
    for (const b of this.obstacles) {
      if (b.maxHp > 0 && b.hp <= 0) continue;
      if (Math.abs(x - b.x) >= b.w / 2 || Math.abs(y - b.y) >= b.h / 2) continue;
      if (dmg > 0 && b.maxHp > 0) b.hp = Math.max(0, b.hp - dmg);
      return true;
    }
    return false;
  }

  /* ETAT DU SOL SOUS UN POINT. Un seul balayage pour les deux effets qui ne
     blessent pas — le ralentissement et le glissement — parce qu'ils se lisent
     au meme endroit, dans la passe de deplacement, et qu'un second parcours de
     la meme liste de cinq elements ne se justifie pas.

     LES DEUX PORTENT SUR LES ENNEMIS AUSSI (le ralentissement, du moins) : un
     champ qui ne toucherait que le joueur serait une taxe deguisee en mecanique,
     et le depot les refuse — c'est l'argument qui a fait retirer les degats de
     rupture de barre. Le glissement, lui, ne concerne que les joueurs : les
     ennemis n'ont pas d'inertie a rejouer, ils n'ont qu'une vitesse. */
  _ground(x, y) {
    let slow = 1, slip = false;
    for (const h of this.hazards) {
      if (h.kind !== HZ_SLOW && h.kind !== HZ_SLIP) continue;
      if ((x - h.x) ** 2 + (y - h.y) ** 2 > h.r * h.r) continue;
      // Deux champs ne se cumulent JAMAIS : on prend le meilleur. Meme regle que
      // les auras de givre, le Voeu partage et l'aura du choeur — sans elle,
      // deux disques qui se recouvrent immobilisent.
      if (h.kind === HZ_SLOW) slow = Math.min(slow, BIOME_CFG.SLOW_MUL);
      else slip = true;
    }
    return { slow, slip };
  }

  /* DEGATS DES DANGERS. Par paliers de `ZONE_TICK` et jamais a chaque image, et
     avec `overTime: true` — les deux sont indissociables et le depot a deja paye
     l'oubli du second : sans ce drapeau, un danger permanent remet `hitCd` a
     0,55 s quatre fois par seconde et rend sa victime immunisee au contact, aux
     tirs et aux zones. On mourait en securite dans une flaque.

     `hazardState` est le point de passage unique de la lecture : le client
     dessine le jet a partir de la meme fonction, donc un joueur ne peut pas
     prendre des degats d'un geyser qu'il voit eteint. */
  _hazards(dt) {
    if (this.hazards.length === 0) return;
    this.hazardTick -= dt;
    if (this.hazardTick > 0) return;
    this.hazardTick = CFG.ZONE_TICK;

    for (const h of this.hazards) {
      const def = hazardAt(h.kind);
      if (!def || !def.hurts) continue;
      const st = hazardState(h, this.time);
      if (!st.on) continue;
      // Meme tolerance que les zones, et dans le meme sens : le client affiche
      // avec 110 ms de retard, donc le bord qui blesse est plus petit que le
      // bord dessine.
      const r = h.r * CFG.ZONE_FORGIVE;
      for (const p of this._alivePlayers()) {
        if ((p.x - st.x) ** 2 + (p.y - st.y) ** 2 > r * r) continue;
        this._hurt(p, h.dot * CFG.ZONE_TICK, { overTime: true, src: SRC_ENV });
      }
    }
  }

  /* METEO. Un modificateur global, valable un segment, cauchemar seulement. Elle
     n'est ni une entite ni une zone — elle n'a pas de position — donc elle ne
     s'ajoute a aucune liste et ne coute rien a dessiner.

     La bourrasque pousse LES DEUX CAMPS. Ne pousser que le joueur en ferait une
     taxe, et sa direction est deterministe (`weatherFor`) pour que la prediction
     locale du client la rejoue au pixel pres.

     Elle rend un DEPLACEMENT et ne l'applique pas : le decalage doit tomber
     DANS la passe de deplacement, avant les limites et avant les obstacles.
     Applique apres coup, il aurait pousse joueurs et ennemis a l'interieur des
     piliers une image sur deux. */
  _gust(dt) {
    const w = this.weather;
    if (!w || w.id !== WX_BOURRASQUE) return null;
    return { x: w.dx * BIOME_CFG.GUST_PUSH * dt, y: w.dy * BIOME_CFG.GUST_PUSH * dt };
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
    // Les QUATRE cotes : une arene de boss collee au bord gauche de la salle
    // a x0 = 0, et la couronne existait bel et bien sur les trois autres.
    const B = this.bounds;
    if (B.x0 > 0 || B.y0 > 0 || B.x1 < CFG.ARENA_W || B.y1 < CFG.ARENA_H) {
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
     centre reste celui des bounds COURANTS — pas celui de l'arene dessinee :
     depuis le lot I, un combat de boss se joue dans des bounds ancres sur
     l'equipe, et un palier recentre sur la salle aurait teleporte la couronne
     ailleurs que sur le combat. Le plancher et le pas sont relatifs a la VUE,
     qui est la taille d'une arene de boss — les relire sur ARENA_W aurait
     donne un plancher plus grand que l'arene de combat elle-meme. */
  _atkConstriction(b) {
    if (this.shrink) return;      // un palier a la fois, sinon ils se doublent
    const B = this.bounds;
    const w = B.x1 - B.x0, h = B.y1 - B.y0;
    const minW = CFG.VIEW_W * BOSS_CFG.SHRINK_MIN;
    const minH = CFG.VIEW_H * BOSS_CFG.SHRINK_MIN;
    if (w <= minW + 1 && h <= minH + 1) { this._atkMarques(b); return; }

    const nw = Math.max(minW, w - CFG.VIEW_W * BOSS_CFG.SHRINK_STEP);
    const nh = Math.max(minH, h - CFG.VIEW_H * BOSS_CFG.SHRINK_STEP);
    const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
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
        // Sur les BOUNDS et non les bords de la salle : pendant un combat de
        // boss, une balle qui rebondit doit revenir dans le combat, pas
        // s'echapper a deux ecrans de la. Hors combat, bounds = la salle.
        const BB = this.bounds;
        let bounced = false;
        if (b.x < BB.x0)           { b.x = 2 * BB.x0 - b.x; b.vx = -b.vx; bounced = true; }
        else if (b.x > BB.x1)      { b.x = 2 * BB.x1 - b.x; b.vx = -b.vx; bounced = true; }
        if (b.y < BB.y0)           { b.y = 2 * BB.y0 - b.y; b.vy = -b.vy; bounced = true; }
        else if (b.y > BB.y1)      { b.y = 2 * BB.y1 - b.y; b.vy = -b.vy; bounced = true; }
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

      /* LE CRISTAL DE RECOLTE (lot I). Il se detruit AUX BALLES, et ce code
         avait purement disparu a la fusion du plan 5 : `_harvests` renvoyait
         encore a « voir `_bullets` », mais plus rien n'y touchait `h.hp`. Le
         cristal etait donc indestructible et les tirs le traversaient — la
         moitie des points de recolte du jeu etait injouable, sans une seule
         erreur pour le dire.

         HORS DE `_bulletHitEnemy()`, et c'est delibere : ce point de passage
         porte le critique, le vol de vie, l'execution et le compteur de touches,
         dont aucun n'a de sens sur une structure — l'execution en supprimerait
         un d'un seul tir. Meme raisonnement que « le soin du medic est un chemin
         neuf, pas un `_damage()` negatif ».

         AVANT l'obstacle : un cristal pose contre un pilier resterait sinon
         inatteignable, la balle mourant sur le mur un pixel avant lui. C'est le
         defaut jumeau de celui du placement, corrige dans `_harvestPoint`. */
      if (this.harvests.length && this._harvestHit(b.x, b.y, b.dmg)) {
        if (b.boom > 0) this._explode(b.x, b.y, b.boom, b.owner);
        continue;
      }

      /* COUVERTURE (lot V). Une balle s'arrete sur un obstacle, et c'est ce qui
         fait d'un pilier une couverture plutot qu'un decor : le tir ennemi s'y
         arrete aussi (`_shots`), donc se placer derriere protege. Seul le tir du
         JOUEUR entame un mur destructible — voir `_obstacleHit`. */
      if (this.obstacles.length && this._obstacleHit(b.x, b.y, b.dmg)) {
        // Une grenade explose sur le mur : elle a touche quelque chose, et une
        // grenade qui s'eteint sans souffle contre un obstacle se lit comme un
        // tir perdu.
        if (b.boom > 0) this._explode(b.x, b.y, b.boom, b.owner);
        continue;
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
      /* Sanctuaire (lot C) : les projectiles ennemis qui entrent sont DETRUITS
         — la seule reponse du jeu a la saturation de tirs d'un boss. Detruit
         et non expire : un tir absorbe ne laisse pas de flaque de Matriarche,
         il n'a jamais fini sa course. Le test ne coute que dome ouvert. */
      if (this.sancts.length) {
        let absorbed = false;
        for (const sa of this.sancts) {
          if ((s.x - sa.x) ** 2 + (s.y - sa.y) ** 2 <= sa.r * sa.r) { absorbed = true; break; }
        }
        if (absorbed) continue;
      }
      // Un tir hostile s'arrete sur un obstacle sans l'entamer : la couverture
      // protege dans les deux sens, mais deux cents monstres ne l'abattent pas.
      if (this.obstacles.length && this._obstacleHit(s.x, s.y, 0)) continue;
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
      this._hurt(p, dmg, { ignoreCooldown: true, fromZone: true, overTime, src: z.src });
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
      /* Relique « Filtre purifiant » (lot K) : retire un etat toutes les 10 s,
         sans action du joueur. Le compte descend ICI, avant le test de vide —
         le filtre doit tourner meme quand le joueur n'a aucun etat : il a
         precisement pour fonction d'empêcher qu'ils s'accumulent. `_purgeStatus`
         respecte deja PURGE_ORDER, donc ce qu'il retire est le bon. */
      if (p.relics.has("filtre_purifiant")) {
        p.timers.relicPurge -= dt;
        if (p.timers.relicPurge <= 0) {
          p.timers.relicPurge = 10;
          if (p.statuses.size > 0) this._purgeStatus(p);
        }
      }

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
        if (id === STATUS_BURN) {
          this._hurt(p, STATUS_CFG.BURN_DPS * dt,
            { ignoreCooldown: true, overTime: true, src: SRC_BURN });
        }

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
  /* SAC D'OPTIONS et non plus cinq booleens positionnels. Le lot A ajoute une
     sixieme information — la PROVENANCE — et `_hurt(p, d, true, false, false,
     true)` etait deja illisible au point d'appel : on ne savait plus lequel des
     `false` etait la zone. Un sac coute une allocation par degat subi, soit
     quelques dizaines par seconde au pire (les degats INFLIGES, qui se comptent
     par centaines, passent par `_damage` et ne changent pas) : c'est le seul
     endroit du depot ou la lisibilite valait ce prix-la.

     `src` a une valeur par defaut et non pas d'obligation : un appel qui
     l'oublie compte en contact, ce qui est le cas majoritaire — et non une
     source « inconnue » de plus dans le registre, qui n'apprendrait rien a
     personne et n'aurait jamais ete corrigee. */
  _hurt(p, amount, {
    ignoreCooldown = false, fromZone = false, overTime = false, mech = false,
    src = SRC_CONTACT,
  } = {}) {
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
    /* « Garde » (méta, lot D) : un Rempart proche protege ses ALLIES, jamais
       lui-meme — l'arbre renforce ce que la classe fait deja. Une seule aura
       compte, comme le givre : deux tanks ne coexistent pas (classe unique),
       le break est une precaution, pas une regle. */
    for (const o of this.players.values()) {
      if (o === p || o.downed || !(o.mods.guardAura > 0)) continue;
      if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 <= PROG_CFG.GUARD_RADIUS ** 2) {
        amount *= 1 - o.mods.guardAura;
        break;
      }
    }
    /* Vulnerabilite. Elle s'applique ICI et nulle part ailleurs, exactement
       comme le multiplicateur de difficulte : une nouvelle source de degats est
       ainsi couverte sans qu'on y pense, et personne n'a a se demander si telle
       attaque « compte » pour l'etat. */
    const vuln = p.statuses.get(STATUS_VULN);
    if (vuln) amount *= 1 + STATUS_CFG.VULN_PER_STACK * vuln.stacks;
    if (p.tauntT > 0) amount *= SKILL_CFG.TANK_TAUNT_REDUCTION;
    /* « Elan » : le compteur repart de zero ICI, au point de passage unique de
       tout ce qui blesse un joueur. Y compris pour un degat continu — une
       brulure qui laisserait l'elan monter viderait la carte de son sens. */
    p.elanT = 0;
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

    /* PROVENANCE. Relevee ICI et nulle part ailleurs, comme le multiplicateur de
       difficulte et la Vulnerabilite : apres tous les multiplicateurs et apres
       le plafond de mecanique, donc sur le montant qui atteint reellement le
       joueur — bouclier compris, puisqu'un bouclier consomme est bien du degat
       encaisse.
       Deux destinations, et deux couts differents : `lastSrc` traverse le reseau
       (un nombre par joueur et par instantane, soit quatre au total) pour que le
       chiffre rouge porte son icone ; `hurtBy` reste dans la simulation et ne
       sort qu'au bilan de fin, ou il est aussi un excellent outil
       d'equilibrage — c'est lui qui dira si une mecanique tue ou si c'est le
       contact. */
    p.lastSrc = src;
    p.hurtBy[src] += amount;

    /* « Epines » (méta, lot D) : renvoie une part des degats subis aux ennemis
       proches. Sur le montant qui atteint reellement le joueur — bouclier
       compris — et jamais sur un degat continu : une brulure qui renverrait
       soixante fois par seconde ferait des epines une aura gratuite. Passe par
       `_damage`, comme tout ce qui blesse un ennemi. */
    if (p.mods.thorns > 0 && amount > 0 && !overTime) {
      const rr = PROG_CFG.THORNS_RADIUS ** 2;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= rr) {
          this._damage(e, amount * p.mods.thorns, p.id);
        }
      }
    }

    // Le bouclier encaisse d'abord, jusqu'a epuisement de sa reserve
    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, amount);
      p.shield -= absorbed;
      amount -= absorbed;
      /* Relique « Batterie de secours » (lot K) : le bouclier venant de se
         vider, il se recharge UNE fois a 50 % de sa jauge — usage unique par
         manche, le drapeau est la meme rege que `pacteUsed`. Teste AVANT
         l'epuisement du montant : une batterie qui se declenche sur un coup
         qui la depasse doit quand meme encaisser la suite de ce coup. */
      if (p.shield === 0 && !p.relicBatteryUsed && p.relics.has("battery_secours")) {
        p.relicBatteryUsed = 1;
        p.shield = p.mods.shieldPool * 0.5;
      }
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
      p.hp = Math.min(p.maxHp,
        Math.round(p.maxHp * Math.max(CFG.REVIVE_HP_RATIO, o.mods.reviveHpRatio))
        + (o.mods.reviveHpBonus ?? 0));
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
    /* Bouclier frontal du bulwark (lot M), AVANT tout le reste — grenade
       comprise : une plaque qui laisserait passer l'explosion mais pas la
       balle ne se lirait pas. L'absorption vit ICI et nulle part ailleurs :
       la boucle de collision ET le balayage d'apparition passent par ce point
       de passage, sinon une balle nee a bout portant traverserait le bouclier
       qu'une balle tiree a dix metres respecte. Le compteur de touches est
       incremente SANS degat : c'est lui qui porte l'eclair blanc cote client,
       et un impact absorbe doit se voir — c'est toute la pedagogie de la
       mecanique. Un tir de flanc ou de dos touche normalement. */
    const bdef = ENEMY_TYPES[e.type];
    if (bdef?.shieldArc) {
      const from = Math.atan2(iy - e.y, ix - e.x);
      if (Math.abs(this._angleDiff(from, e.ang)) <= bdef.shieldArc / 2) {
        e.hitSeq = (e.hitSeq + 1) % 10;
        return true;
      }
    }

    if (b.boom > 0) {
      this._explode(ix, iy, b.boom, b.owner);
      return true;
    }

    /* BOUCLIER FRONTAL du bulwark. Il vit ICI et nulle part ailleurs, et c'est
       un point de passage OBLIGATOIRE : la boucle de collision appelle cette
       methode, mais le balayage a l'apparition aussi — sans ca, une balle nee a
       bout portant traverserait le bouclier qu'une balle tiree a dix metres
       respecte, ce qui est exactement le bug de l'ennemi colle intouchable pris
       par l'autre bout.

       L'ANGLE est mesure depuis le CENTRE de l'ennemi vers le point d'impact et
       non depuis le tireur : une balle perforante qui traverse le groupe touche
       le bulwark par ou elle arrive, pas par ou elle est partie.

       La balle est CONSOMMEE, perforation comprise : un bouclier qui laisserait
       passer les charges de perforation ne serait plus un angle a gagner, juste
       une carte a prendre. */
    if (e.shieldArc > 0) {
      let off = Math.atan2(iy - e.y, ix - e.x) - e.ang;
      while (off > Math.PI) off -= Math.PI * 2;
      while (off < -Math.PI) off += Math.PI * 2;
      if (Math.abs(off) <= e.shieldArc / 2) {
        /* L'absorption DOIT se voir : sans retour, le joueur ne comprend pas
           pourquoi ses tirs frontaux ne font rien et conclut a un bug. Un `kind`
           a lui plutot qu'un flash generique — c'est le seul evenement du jeu
           qui dise « ce tir etait juste mal place ». */
        this.effects.push({
          id: this._nextId++,
          x: ix, y: iy, r: 14, life: 0.18, max: 0.18, kind: 14,
        });
        return true;
      }
    }

    this._damage(e, b.dmg, b.owner, b.burn);
    /* « Sentence capitale » : un critique traverse. Le drapeau est relu ICI,
       immediatement apres l'appel, parce que `_damage` ne rend rien — il est
       appele par une trentaine d'endroits dont aucun ne veut savoir ce qui
       s'est passe, et lui faire rendre un objet aurait coute une allocation par
       impact, soit quelques centaines par seconde en fin de manche.
       La charge de perforation n'est pas decomptee : c'est bien le critique qui
       paie le passage, pas la balle. */
    const critPierce = this.lastCrit && this.players.get(b.owner)?.mods.critVuln;
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
    if (critPierce) {
      // Le Set n'existe que sur une balle deja perforante : sans lui, la balle
      // reste superposee a sa victime et la retouche a l'image suivante.
      b.hits ??= new Set();
      b.hits.add(e.id);
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
          this._hurt(p, ENEMY_TYPES[e.type].dmg, { src: SRC_CONTACT });
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
        this._hurt(p, CFG.BOSS_CONTACT_DAMAGE, { src: SRC_CONTACT });
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
          this._hurt(p, CFG.SHOT_DAMAGE, { src: SRC_SHOT });
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
  /* Le SCORE seulement. L'experience ne passe plus par ici : elle vaut les PV
     max de la cible et se verse dans `_killEnemy`, avant tout test de
     proprietaire — une mort par brulure sans proprietaire, ou le kill d'un
     joueur deconnecte entre-temps, ne doit pas disparaitre de la progression
     commune. Les degats au boss, eux, creditent en continu depuis `_damage`. */
  _credit(owner, score) {
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

  /* Jauge commune. Un palier franchi ne donne RIEN d'autre qu'un choix de carte :
     ni degats, ni PV, ni soin.

     LE CHOIX S'OUVRE TOUT DE SUITE (lot X). Il attendait la mort du boss qui
     clot le segment, et l'intention etait bonne — ne jamais couper la horde —
     mais l'effet vecu ne l'etait pas : un niveau ne donnait RIEN au moment ou on
     le gagnait, juste une promesse a encaisser cinq minutes plus tard, et
     plusieurs niveaux se cumulaient en une file d'ecrans identiques ou plus
     personne ne se rappelait ce qui les avait ouverts. Une progression qu'on ne
     touche pas quand on la gagne n'est pas ressentie comme une progression.

     UNE SEULE EXCEPTION, et c'est le combat de boss : on ne le coupe pas en
     deux. Les niveaux gagnes pendant restent en file et sortent a sa mort, ce
     qui est exactement l'ancien comportement — il n'a pas disparu, il s'est
     reduit a son seul cas justifie. Un ecran deja ouvert (cartes ou marchand) ne
     s'empile pas non plus : la salle rappelle `openNextScreen()` en fermant. */
  _addXp(amount) {
    /* LE COUT D'UN PALIER SUIT L'EFFECTIF, et c'est ce que cette division
       exprime. A quatre joueurs le debit du script est multiplie par
       `4^0,75 = 2,83` : sans normalisation, la meme jauge se remplirait 2,83
       fois plus vite pour une horde qui n'est pas plus dure par tete, et le solo
       finirait la partie avec trois cartes contre douze.

       DIVISER LE GAIN plutot que MULTIPLIER LE SEUIL — les deux sont
       arithmetiquement equivalents, un seul est stable. `levelAt` est un cumul
       ABSOLU : multiplier les seuils par l'effectif les ferait tous bouger quand
       quelqu'un se deconnecte en pleine partie, donc la jauge sauterait en
       arriere ou se remplirait d'un coup. En divisant le gain, ce qui est deja
       acquis reste acquis et seul le rythme change — ce qui est exactement ce
       qu'on veut dire.

       Les CONNECTES et non les vivants : une equipe a moitie morte tue moins,
       et baisser ses paliers au meme moment serait un cadeau au pire moment,
       c'est-a-dire la boucle de retroaction que D2 refuse. Ne pas confondre avec
       `aliveCrowd()`, qui porte la PRESSION. */
    this.xp += amount / Math.pow(Math.max(1, this.players.size), CFG.WAVE_CROWD_EXP);

    while (this.level < CFG.LEVEL_MAX && this.xp >= this.levelAt) {
      this.level++;
      this.pendingLevels++;
      this.levelFrom = this.levelAt;
      this.levelStep = Math.round(this.levelStep * CFG.LEVEL_XP_GROWTH * this._xpCostMul());
      this.levelAt = this.levelFrom + this.levelStep;

      /* « Coeur de forge » gagne 5 % de degats par NIVEAU d'equipe, et c'est
         ici qu'il bouge — il suivait le changement de beat, mais son unite est
         desormais le niveau. Le recalcul est complet (`_recomputeMods` rejoue
         tout depuis zero) donc il ne derive pas, et il est bon marche : une
         vingtaine de fois par manche. */
      for (const p of this.players.values()) {
        if (p.mods.damagePerLevel > 0) this._recomputeMods(p);
      }

      /* L'onde de montee de niveau part du CENTRE DE GRAVITE DE L'EQUIPE et non
         d'un joueur : la jauge n'appartient plus a personne en particulier.
         Du centroide et non du centre de la salle depuis la grande arene — sur
         4800 x 2700 le centre peut etre hors de vue de tout le monde, et une
         recompense que personne ne voit n'en est pas une. */
      const lvlAt = this._teamCentroid();
      this.effects.push({
        id: this._nextId++,
        x: lvlAt.x, y: lvlAt.y,
        r: 78,
        life: 0.55, max: 0.55,
        kind: 2,
      });
    }

    /* L'ecran s'ouvre APRES la boucle et non dedans : deux paliers franchis dans
       la meme image (une nova qui balaie l'ecran) doivent donner deux cartes,
       pas deux ecrans concurrents. `openCards` decremente `pendingLevels`, la
       salle rouvre tant qu'il en reste. */
    if (this.pendingLevels > 0 && !this.boss && !this.bossPending
      && !this.cardsPending && !this.relicPending) {
      this.openCards(false);
    }
  }

  /* VALEUR D'UN KILL, point de passage unique. La valeur de base vient du
     bestiaire, la courbe du niveau d'equipe, et le rang d'elite multiplie —
     une elite coute son x3 de PV, elle doit payer en proportion.

     `xpWorth` etait un champ mort depuis le lot Q : il comptait des
     « apparitions representees » du temps ou l'experience se comptait en kills,
     puis les PV max l'ont rendu inutile et personne ne l'a retire. Il reprend
     exactement son role d'origine, qui redevient le bon : le gibier de `chasse`
     remplace a lui seul la composition d'un beat entier, donc il doit valoir
     autre chose qu'un tank. */
  _xpValue(e) {
    const def = ENEMY_TYPES[e.type];
    const base = (def?.xp ?? 10) * (e.elite ? CFG.ELITE_SCORE_MUL : 1);
    return base * (e.xpWorth ?? 1) * this._xpLevelMul();
  }

  /* La courbe, isolee parce que le boss la lit aussi. `level` est le niveau
     d'equipe COURANT : un kill vaut ce qu'il vaut a l'instant ou il tombe, pas
     ce qu'il valait a l'apparition — sinon un ennemi laisse en vie deviendrait
     un placement financier. */
  _xpLevelMul() {
    return Math.pow(CFG.XP_LEVEL_GROWTH, Math.max(0, this.level - 1));
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
    /* Le GIBIER est tombe : `_segmentTick` le constate au tick suivant et cloture
       l'evenement. Ici on se contente d'oublier l'identifiant — cloturer depuis
       la mort d'un ennemi ferait partir la remise a plein au milieu de la boucle
       de collision, c'est-a-dire pendant que `_damage` tourne encore. */
    if (this.quarry === e.id) this.quarry = 0;
    const def = ENEMY_TYPES[e.type];
    const owner = this.players.get(ownerId);
    /* L'EXPERIENCE VAUT LES PV MAX DE LA CIBLE — voir LEVEL_XP_BASE. Elle est
       versee ici, avant `_credit`, donc quel que soit l'auteur du dernier coup
       et meme s'il n'y en a pas. Un ennemi qui DISPARAIT sans mourir (balayage
       d'arrivee du boss) ne passe pas par cette methode et ne credite donc
       rien : c'est la meme regle que pour le score, et c'est ce qui empeche
       d'arreter de jouer en fin de segment. */
    this._addXp(this._xpValue(e));
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

      /* Trois cartes du lot 6 branchees sur le kill, toutes ici : le point de
         passage unique de la mort d'un ennemi, comme `_damage` l'est de la
         blessure. « Carnage » relance sa fenetre a chaque kill au lieu de
         decompter chaque cumul separement — meme modele que la frenesie
         juste au-dessus. */
      if (owner.mods.ragePerKill > 0) {
        owner.rageStacks = Math.min(CARD_CFG.RAGE_MAX, owner.rageStacks + 1);
        owner.rageT = CARD_CFG.RAGE_TIME;
      }
      if (owner.mods.hpPerKill > 0 && !owner.downed) {
        owner.hp = Math.min(owner.maxHp, owner.hp + owner.mods.hpPerKill);
      }
      /* « Flux continu ». Il lie les competences au rythme de la vague : la
         recharge ne descend plus toute seule dans le vide, elle descend parce
         qu'on tue. Sur les deux recharges, y compris celle qui reaccumule les
         charges de bombe. */
      if (owner.mods.cdPerKill > 0) {
        owner.cd1 = Math.max(0, owner.cd1 - owner.mods.cdPerKill);
        owner.cd2 = Math.max(0, owner.cd2 - owner.mods.cdPerKill);
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

    /* EXPLOSION DU KAMIKAZE, branchee au point UNIQUE de mort. C'est ce qui
       garantit « quelle que soit la cause » : tir, zone, brulure, execution,
       onde de mort — aucune n'a a savoir que ce type existe.

       Elle est posee comme une ZONE de 0,15 s d'annonce et non resolue seche.
       Deux raisons. Le depot n'a pas d'autre facon de dire « ca va exploser
       la » au client, et un dommage instantane sur la mort d'un ennemi qu'on
       vient de tuer se lit comme un bug. Et le delai court — un dixieme de ce
       qu'annonce une mecanique de boss — laisse une chance de sortie sans rendre
       l'explosion gratuite : c'est un ennemi ordinaire, pas une mecanique.

       `src: SRC_BLAST` : elle passe par une zone, elle ne se compte pas comme
       une zone. Au bilan, « zone au sol » envoie chercher des flaques de boss ;
       ce qui a tue, c'est d'etre reste au contact. */
    if (def.blastRadius) {
      this._zone({
        x: e.x, y: e.y,
        r: def.blastRadius,
        warn: def.blastDelay,
        dmg: def.blastDamage,
        src: SRC_BLAST,
      });
    }

    /* SPORES : petite zone remanente a la mort. Elle passe par le MEME plafond
       que les trainees — c'est la meme surface au sol, et le budget porte sur ce
       que le joueur doit lire, pas sur la mecanique qui l'a pose. */
    if (hasTrait(e.traits, TRAIT_SPORE)) {
      this._groundZone(e.x, e.y, TRAIT_CFG.SPORE_R, TRAIT_CFG.SPORE_DOT,
        TRAIT_CFG.SPORE_LIFE);
    }
  }

  _killBoss(ownerId) {
    this._credit(this.players.get(ownerId), 500);
    this.totalKills++;
    // Lot D : la monnaie et les jalons de premiere victoire se constatent a la
    // fin de manche, mais c'est ICI qu'on sait quel boss vient de tomber.
    if (this.boss) this.bossKindsKilled.add(this.boss.kind);
    /* DUREE DU COMBAT FINAL (lot W). Relevee ici et nulle part ailleurs : c'est
       le seul instant ou l'on a encore l'entite, et `fightT` meurt avec elle.

       C'est ce chiffre-la qui est classe, et non le temps pour ATTEINDRE le boss
       final : sous D1 celui-ci vaut 1800 s de horde plus la duree des cinq
       combats precedents, donc il est domine par une constante et deux equipes
       tres differentes afficheraient des temps voisins. Le record perdrait
       l'essentiel de son sens. */
    if (this.boss && this.boss.kind === BOSS_FINAL) {
      this.finalKill = Math.round(this.boss.fightT * 10) / 10;
    }
    this.bossKills++;
    /* Le marchand (lot K) se cale sur la FIN DE VAGUE, pas ici — mais c'est
       ici qu'on sait QUELLE vague vient de se terminer. Les cinq boss normaux
       l'ouvrent ; le Noyau (lot N) a son propre traitement de victoire et
       n'ouvre rien : il n'y a plus de vague suivante a preparer. */
    const final = this.boss && this.boss.kind === BOSS_FINAL;
    if (this.boss && !final) this._merchantDue();

    /* VICTOIRE FINALE (lot N). L'entree du classement au temps est posee ici,
       au seul endroit qui sait que le Noyau vient de tomber. `state.time` est
       l'horloge AUTORITAIRE de la simulation : le serveur ne recalcule rien,
       il persiste ce chiffre — c'est ce qui rend le classement verifiable.
       `finalDone` ferme la porte : la manche peut continuer (l'equipe est
       vivante), mais le Noyau ne reviendra pas. */
    if (final) {
      this.finalDone = true;
      this.finalVictory = {
        time: Math.round(this.time),
        wave: this.wave,
        difficulty: this.diffIndex,
      };
    }
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

    /* LA CARTE GARANTIE PAR BOSS A DISPARU (lot X). Elle etait un
       `pendingLevels++` pose ici, et son argument — « faire du boss un point
       d'etape de progression et pas seulement un mur de PV » — tenait tant que
       le boss etait le SEUL endroit ou un ecran pouvait s'ouvrir. Un niveau
       ouvre desormais le sien ; garder la carte gratuite en plus aurait ajoute
       six choix a une courbe qu'on vient justement d'accelerer, et surtout elle
       aurait rendu la recompense du boss independante de ce qu'on y a fait. Le
       boss reste un point d'etape par sa QUALITE de tirage (`BOSS_QUALITY`) et
       par le marchand ; ce qu'on y gagne en cartes, on l'a gagne en tuant.

       Ce qui reste ici est donc la CONSOMMATION de la file : les niveaux gagnes
       pendant le combat n'ont pas pu ouvrir d'ecran — on ne coupe pas un boss en
       deux — et ils sortent tous a sa mort, le marchand derriere. */
    this._nextSegment();
    if (this.gameOver) return;
    this.openNextScreen();
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
      let bonus = 0;
      for (const o of this.players.values()) {
        if (o.id === p.id || o.downed) continue;
        const r = CFG.REVIVE_RADIUS * o.mods.reviveRadiusMul;
        if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 > r * r) continue;
        rate += o.mods.reviveSpeedMul;
        if (o.mods.reviveHpRatio > ratio) ratio = o.mods.reviveHpRatio;
        // « Releve » (méta, lot D) : le meilleur bonus present, comme le ratio.
        if ((o.mods.reviveHpBonus ?? 0) > bonus) bonus = o.mods.reviveHpBonus;
      }

      if (rate > 0) {
        // Plusieurs sauveteurs relevent plus vite : a deux, deux fois plus
        // vite. Ca recompense le regroupement au pire moment.
        p.revive += dt * rate;
        if (p.revive >= CFG.REVIVE_TIME) {
          p.downed = false;
          p.hp = Math.min(p.maxHp, Math.round(p.maxHp * ratio) + bonus);
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

  /* Etat des couvertures destructibles, ou `null`. L'INDEX dans la liste
     d'obstacles fait office d'identifiant : les deux cotes construisent la meme
     liste dans le meme ordre a partir de la meme graine, donc un identifiant
     transmis n'apprendrait rien de plus et couterait un nombre de plus. */
  _coverState() {
    let out = null;
    for (let i = 0; i < this.obstacles.length; i++) {
      const b = this.obstacles[i];
      if (b.maxHp <= 0 || b.hp >= b.maxHp) continue;
      (out ??= []).push([i, Math.round(b.hp / b.maxHp * 100) / 100]);
    }
    return out;
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
        /* PROVENANCE du dernier degat encaisse. En fin de tableau comme tout le
           reste, et c'est le seul moyen de la connaitre : le client deduit les
           degats subis d'une variation de PV, ce qui ne dit jamais d'ou ils
           viennent. Un nombre par joueur, soit quatre par instantane, la ou la
           liste d'ennemis en compte seize cents — et sans lui on continue de
           mourir sans comprendre pourquoi, ce qui est le defaut de lisibilite le
           plus cher du jeu. */
        p.lastSrc,
        /* Troisieme competence (lot C), en fin de tableau : la recharge et le
           palier possede (0 = pas de carte). Le palier sert au HUD — la
           pastille reste grisee tant que la carte n'est pas tiree — et le
           repli a 0 d'un serveur anterieur donne exactement cet etat. */
        r1(p.cd3), p.mods.skill3,
        /* Eclats (lot I), en fin de tableau : la monnaie de manche du joueur.
           Un nombre par joueur, et le seul chiffre que le client ne peut pas
           deduire — le rendement d'un point de recolte est tire au sort. */
        p.eclats,
      ]),
      /* Le rang d'elite voyage dans le champ de type (+100) : un drapeau separe
         aurait coute un nombre de plus sur chacun des 200 ennemis. Decodage
         cote client : type = a[5] % 100, elite = a[5] >= 100. Le marquage de
         retardataire (+200) a disparu avec les vagues — il n'existait que pour
         rendre traquables les derniers fuyards d'un nettoyage, et il n'y a plus
         rien a nettoyer. */
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
      /* NEUVIEME element, ajout en fin (lot M) : la cible du lien de soin du
         medic. Nul sur tout ce qui n'est pas un medic en train de soigner,
         donc coupe par `trimTail` — seuls les medics actifs le paient. Le
         client dessine le filet lumineux avec, et c'est ce filet qui permet
         de reperer le soigneur ennemi dans la melee. */
      e: this.enemies.map(e => trimTail([e.id, r1(e.x), r1(e.y), Math.round(e.hp), Math.round(e.maxHp),
                                e.type + (e.elite ? 100 : 0),
                                r2(e.ang), e.hitSeq], 7)),
      /* Quatrieme element : projectile de soin. Ajout en fin de tuple, repli 0
         cote client — la balle reste dessinee, simplement dans la couleur du
         tir normal sur un onglet reste en arriere.

         CINQUIEME element, ajout en fin de tuple (lot A) : le PROPRIETAIRE. Le
         depot avait jusqu'ici refuse de le transmettre, et la raison etait
         bonne — un champ de plus sur quatre cents balles en vol, vingt fois par
         seconde. Ce qui a change, c'est ce qu'on en fait : ce n'etait qu'un
         chiffre de degats a attribuer (ce que `bd` resout cote boss sans rien
         payer par balle), c'est maintenant la LISIBILITE du tir. Deux ambres
         voisins pour le tir allie et le tir hostile rendaient l'ecran illisible
         a 220 ennemis, et aucune deduction locale ne peut retrouver le tireur.

         Le cout est MESURE et non estime : +5,4 % de poids d'instantane dans le
         pire cas (arene pleine, 400 balles en vol, quatre joueurs) et +2,0 % en
         moyenne sur une manche a quatre — sous le budget de 10 % du depot, et du
         meme ordre que `hitSeq` (+6,2 %). Les chiffres sont au LISEZMOI.
         C'est un entier court — les identifiants de joueur vont de 1 a 4 — la ou
         un tuple d'ennemi en coute huit. `trimTail` ne s'y applique pas : un
         proprietaire nul est justement le cas qu'on veut distinguer. */
      b: this.bullets.map(b => [b.id, r1(b.x), r1(b.y), b.heal > 0 ? 1 : 0, b.owner]),
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
      /* Points de recolte (lot I). Cle nommee, comme les remparts : un client
         anterieur l'ignore et joue sans les voir. Le cinquieme champ est la
         jauge — PV restants du cristal ou progression de l'amas — en RATIO,
         la valeur brute n'apprendrait rien au client. */
      hv: this.harvests.map(h => [h.id, r1(h.x), r1(h.y), h.kind,
        r2(h.kind === 0 ? h.hp / h.maxHp : h.prog)]),
      tu: this.turrets.map(t => [t.id, r1(t.x), r1(t.y), r2(t.life / CFG.TURRET_LIFE), r2(t.ang)]),
      // Remparts et bombes : deux listes nouvelles, donc des cles nommees. Un
      // client plus ancien les ignore et joue sans les voir, ce qui reste
      // correct — aucune des deux ne le fait mentir sur l'etat du jeu.
      bw: this.bulwarks.map(b => [b.id, r1(b.x), r1(b.y), Math.round(b.r), r2(b.life / b.max)]),
      /* Ancres et sanctuaires (lot C) : deux cles nommees, memes regles que
         `bw` — un client anterieur les ignore simplement. Le sixieme champ de
         l'ancre dit si le palier legendaire rend Vulnerable, pour que le
         client puisse le montrer sans deviner. */
      an: this.anchors.map(a => [a.id, r1(a.x), r1(a.y), Math.round(a.r),
                                 r2(a.life / a.max), a.vuln ? 1 : 0]),
      sa: this.sancts.map(s => [s.id, r1(s.x), r1(s.y), Math.round(s.r),
                                r2(s.life / s.max)]),
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
      /* Les kinds 3 (ricochet) et 13 (salve) transportent deux points de plus :
         l'arc a besoin de ses deux extremites. Les autres ne paient pas ce
         supplement. */
      f: this.effects.map(f => f.kind === 3 || f.kind === 13
        ? [f.id, r1(f.x), r1(f.y), Math.round(f.r ?? 0), r2(f.life / f.max), f.kind, r1(f.x2), r1(f.y2)]
        : [f.id, r1(f.x), r1(f.y), Math.round(f.r), r2(f.life / f.max), f.kind ?? 0]),
      sl: this.slow > 0 ? 1 : 0,
      df: this.diffIndex,
      /* ANTICIPATION DE RUEE (lot S). Cle NOMMEE et ABSENTE la plupart du temps,
         exactement comme `bn` et `wl` : la recharge est de six secondes et le
         preavis d'une demi-seconde, donc la liste est vide neuf fois sur dix et
         courte le reste du temps.

         C'est le SEUL octet de trait qui circule, et il circule parce qu'il ne
         se deduit pas : une position ne dit pas qu'un mouvement se prepare —
         c'est la limite deja notee pour la cadence des tireurs. Tout le reste
         (quel ennemi porte quel trait) se recalcule cote client a partir de
         `(df, type)`, que le client a deja.

         Pas un champ par ennemi : ce serait un huitieme element paye sur les
         deux cents, vingt fois par seconde, pour une information qui concerne
         trois entites. */
      wu: this.windup.length > 0 ? [...this.windup] : null,
      /* EVENEMENT ACTIF (lot U) : index et temps restant. Cle NOMMEE et ABSENTE
         hors evenement — cinq minutes sur trente en portent un. Deux nombres, et
         l'index circule : `EVENTS` est un tableau ordonne, ne jamais inserer au
         milieu.

         Le NOM et le texte n'y sont pas : le client a la meme table, il n'a
         besoin que de l'index — meme raison que les mecaniques, les boss et les
         etats. Le temps restant, lui, ne se deduit pas : il faudrait connaitre
         l'instant d'ouverture, que le client n'a pas s'il rejoint en cours. */
      ev: this.event ? [this.event.id, r1(Math.max(0, this.event.t))] : null,
      /* Segment et progression commune. Cles NOMMEES du snapshot et non des
         elements de tableau : la regle positionnelle ne vaut qu'a l'interieur
         des tableaux, une cle inconnue est simplement ignoree par un client
         plus ancien — et `wv`/`wp`/`wbs`/`wb`, qui disparaissent ici, sont lues
         avec un repli cote client.

         `sg` : segment sur TL_CFG.SEGMENTS, secondes de horde RESTANTES dans le
         segment, index du beat. Le taux d'occupation de l'arene N'Y EST PAS : il
         se deduit de la longueur de la liste d'ennemis, que le client a deja —
         meme regle que la cadence des tireurs et la direction des projectiles.

         Le QUATRIEME element disait « le beat courant est un silence » ; il est
         parti avec les accalmies (lot X). Retirer le DERNIER element d'un
         tableau positionnel est le seul retrait autorise, et c'est exactement ce
         que `trimTail` fait ailleurs : un onglet reste sur une version
         anterieure lit `undefined`, donc « pas de silence », ce qui est vrai. */
      sg: [this.segment, r1(Math.max(0, TL_CFG.SEGMENT_TIME - this.hordeTime)),
           this.beat],
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
           this.boss.kind, r2(this.boss.ult),
           /* Douzieme element, AJOUT EN FIN de tuple : le palier d'enrage. Le
              canal d'alerte l'annonce a chaque palier, mais une annonce dure
              deux secondes et l'enrage dure tout le reste du combat — sans un
              etat permanent, le joueur qui a rate le bandeau ne sait plus
              pourquoi il fond. Un client anterieur lit un tuple plus court et
              retombe sur zero, donc sur l'affichage d'avant. */
           this.boss.enrage ?? 0,
           /* TREIZIEME element, ajout EN FIN : les degats MIS DE COTE par le
              plancher de barre. Sans lui la barre de boss ment.

              Le plancher borne les PV au seuil de la barre courante et banque
              l'exces (voir `_damage`) : pendant tout le palier, `hp` ne descend
              plus D'UN POINT. Mesure a deux joueurs, trois combats par point :
              la barre est FIGEE 46 % du combat a degats nominaux, 60 % a x4. Le
              joueur tire, les degats entrent, et rien ne bouge — rapporte comme
              « je ne sais pas si le boss est bugue ou si c'est visuel », ce qui
              est exactement le doute qu'une barre est censee lever.

              On transmet donc la reserve pour que le client la dessine comme une
              part EN ATTENTE : les degats se voient arriver, et la rupture qui
              suit se lit comme une echeance plutot que comme un a-coup. La
              mecanique ne change pas d'un cheveu — c'est un defaut de lecture,
              pas de simulation, et on le corrige la ou il est. */
           Math.round(this.boss.bank ?? 0)]
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
      /* Troisieme element AJOUTE EN FIN de tuple : la part critique. Un client
         anterieur lit un tableau de deux et affiche le chiffre comme avant.
         Quatrieme et cinquieme, ajoutes en fin eux aussi : le POINT D'IMPACT. Il
         n'existe que pour les Jumeaux — partout ailleurs c'est la position du
         boss, que le client a deja dans `bo`. Un client anterieur lit un tableau
         de trois et retombe sur cette position, donc sur le comportement d'avant :
         juste pour quatre boss sur cinq, faux pour le cinquieme. */
      bd: this.boss && this.bossDmg.size > 0
        ? [...this.bossDmg].map(([id, c]) =>
            [id, Math.round(c.d), Math.round(c.crit), r1(c.x), r1(c.y)])
        : null,
      sp: this.slipT > 0 ? 1 : 0,
      /* Arene mobile (lot 5). Cles NOMMEES, et absentes tant que rien ne bouge
         — c'est le cas de quatre-vingt-dix pour cent d'une manche, et payer
         huit nombres par instantane pour dire « l'arene fait toujours sa
         taille » ne se justifie pas.

         `bn` porte les limites courantes ET le palier annonce : le client doit
         pouvoir dessiner la couronne qui VA devenir mortelle, sinon la
         constriction se subit au lieu de se lire. */
      /* La condition teste les QUATRE cotes : une arene de boss ancree pres du
         bord gauche de la salle a x0 = 0 avec x1 < ARENA_W, et l'ancienne
         condition (x0/y0 seuls) aurait omis la cle — le client aurait dessine
         l'arene pleine pendant tout le combat. */
      bn: this.bounds.x0 > 0 || this.bounds.y0 > 0
          || this.bounds.x1 < CFG.ARENA_W || this.bounds.y1 < CFG.ARENA_H || this.shrink
        ? [r1(this.bounds.x0), r1(this.bounds.y0), r1(this.bounds.x1), r1(this.bounds.y1),
           this.shrink ? r1(this.shrink.x0) : 0, this.shrink ? r1(this.shrink.y0) : 0,
           this.shrink ? r1(this.shrink.x1) : 0, this.shrink ? r1(this.shrink.y1) : 0,
           this.shrink ? r2(this.shrink.t) : 0]
        : null,
      wl: this.walls
        ? [r1(this.walls.x), r1(this.walls.y), BOSS_CFG.QUAD_THICK,
           r2(this.walls.t / this.walls.max)]
        : null,
      /* BIOME (lot V) — et c'est tout ce qu'il coute au reseau.

         Ni la geometrie, ni les dangers, ni la meteo ne circulent : le client
         les REGENERE a partir de `(biome, graine)`, envoyes une fois dans le
         payload de salon, et l'etat d'un danger est une fonction de `tm`, que le
         snapshot porte deja. C'est le meme raisonnement que les traits du lot S,
         pousse un cran plus loin — la, il restait l'anticipation de ruee, qui ne
         se deduisait d'aucune position ; ici, il ne reste rien.

         SEULE EXCEPTION : les PV d'un mur destructible. Ils dependent de ce que
         les joueurs ont fait et ne se deduisent d'aucune horloge. Liste CREUSE
         de paires (index, part de PV) et ABSENTE tant que rien n'a ete touche —
         c'est-a-dire la plupart d'une manche, et la totalite de deux biomes sur
         trois, qui n'ont aucune couverture destructible. */
      ob: this._coverState(),
    };
  }
}
