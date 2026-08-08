/* LE BESTIAIRE — module PUR, aucune dependance.

   `game_state.js` l'importe, jamais l'inverse : un cycle d'import casserait le
   chargement dans le navigateur, exactement comme pour `statuses.js`,
   `bosses.js`, `cards.js` et `timeline.js`.

   Il sort `ENEMY_TYPES` de `game_state.js`, et ce n'est pas un refactor gratuit :
   le fichier de simulation fait pres de sept mille lignes, le bestiaire passe de
   cinq a NEUF types avec des comportements propres, et les quatre autres tables
   de contenu (etats, cartes, classes, boss) en sont deja sorties pour cette
   raison exacte. C'etait la derniere.

   Les constantes de comportement des TRAITS vivent ici, a cote de leur table, et
   jamais dans `CFG` : meme regle que `CARD_CFG`, `SKILL_CFG`, `STATUS_CFG`,
   `BOSS_CFG` et `TL_CFG`. Celles qui appartiennent a UN type (portee du
   bouclier, rayon d'explosion, aura du choeur) restent sur la ligne du type,
   comme `shootCd`, `standoff` et `splits` l'ont toujours fait.

   ---------------------------------------------------------------------------
   LE PRINCIPE : DES MODULES, PAS DES VARIANTES.

   La demande etait « un ennemi qui court en calme, charge en normal, laisse une
   trainee en cauchemar ». Trois bestiaires distincts auraient commis l'erreur
   que le depot refuse explicitement depuis `adaptMech` : cinq variantes de cinq
   boss auraient derive au premier reglage. Un TRAIT est un module de
   comportement attache a un couple (type, difficulte) — un seul type, une seule
   table de statistiques, un comportement qu'on ecrit une fois et qu'on attache
   ou l'on veut.

   ZERO OCTET DE RESEAU. La difficulte voyage deja dans le salon, le type est
   deja dans l'instantane : le client DEDUIT l'ensemble des traits d'un ennemi de
   `(diffIndex, type)`. Meme regle que la cadence des tireurs, la direction des
   projectiles et le deplacement d'un joueur. La seule exception est
   l'anticipation de la ruee, qui ne se deduit pas d'une position — elle passe
   par la cle nommee `wu` du snapshot, courte par construction. */

/* --- les traits --------------------------------------------------------------

   TABLEAU ORDONNE, mais son index NE CIRCULE PAS : c'est un registre purement
   client au meme titre que le son, le glyphe et l'image de sprite. On peut donc
   le reordonner sans rien casser — c'est l'exception, pas la regle.

   Les identifiants sont des INDEX ; le masque porte par un ennemi est fait de
   bits (`traitBit`). Un masque et non une liste : c'est un nombre par ennemi,
   teste par un `&` dans une boucle qui tourne sur deux cents corps a soixante
   images par seconde. */
export const TRAIT_DASH = 0;
export const TRAIT_TRAIL = 1;
export const TRAIT_VOLLEY = 2;
export const TRAIT_FRENZY = 3;
export const TRAIT_SPORE = 4;
export const TRAIT_AURA = 5;

export const TRAITS = [
  { key: "dash",   nom: "Ruée" },
  { key: "trail",  nom: "Traînée" },
  { key: "volley", nom: "Salve" },
  { key: "frenzy", nom: "Frénésie" },
  { key: "spore",  nom: "Spores" },
  { key: "aura",   nom: "Aura" },
];

export function traitBit(id) { return 1 << id; }

export const TRAIT_CFG = {
  /* RUEE. Le preavis n'est pas negociable : un dash sans anticipation visible
     est une teleportation, et l'anticipation NE SE DEDUIT PAS d'une position —
     c'est exactement la limite deja notee pour la cadence des tireurs. D'ou la
     cle `wu` du snapshot. */
  DASH_WARN: 0.5,
  DASH_MUL: 2.5,
  DASH_TIME: 0.35,
  DASH_CD: 6,
  /* Vitesse PENDANT le preavis. L'anticipation doit se lire de deux facons —
     l'ecrasement du sprite, que le client tire de `wu`, et le ralentissement,
     qui reste lisible quand la creature est cachee par la masse. Une seule des
     deux et l'ennemi enseveli sous vingt corps ruait sans prevenir. */
  DASH_GATHER: 0.25,
  /* Portee de declenchement. Une ruee lancee de l'autre bout de l'arene se
     termine dans le vide, et le joueur ne la relie jamais a l'anticipation qu'il
     a vue passer six secondes plus tot. */
  DASH_RANGE: 420,

  /* TRAINEE. Le plafond n'est PAS indicatif. Le depot a deja rencontre le piege
     avec les flaques de la Matriarche : sans lui, une fin de combat a deux cents
     ennemis pavait le sol, l'instantane enflait et la mecanique devenait
     illisible avant d'etre difficile. `PUDDLE_MAX: 25` est le precedent, et deux
     cents ennemis a trainee sont un cas bien plus dense qu'un combat de boss.
     La zone la PLUS ANCIENNE cede sa place — pas de refus silencieux, sinon la
     trainee du premier ennemi arrive fige le sol pour toute la manche.

     `TRAIL_STEP` est la distance parcourue entre deux depots. Sans elle, un
     ennemi a 95 px/s poserait soixante zones par seconde et mangerait le plafond
     a lui tout seul. */
  TRAIL_LIFE: 4,
  TRAIL_DOT: 14,
  TRAIL_R: 26,
  TRAIL_MAX: 18,
  TRAIL_STEP: 46,

  /* SALVE. Trois projectiles au lieu d'un, meme cadence : c'est la couverture
     qui change, pas le debit de degats par tir. */
  VOLLEY_COUNT: 3,
  VOLLEY_SPREAD: 0.22,

  /* FRENESIE. La vitesse monte a mesure que les PV descendent, jusqu'a x1,6 a
     10 % de PV. C'est le seul trait qui rende un ennemi PLUS dangereux quand on
     l'a presque tue — donc le seul qui punisse de laisser un blesse derriere. */
  FRENZY_MAX: 1.6,
  FRENZY_AT: 0.1,

  /* SPORES. Petite zone remanente a la mort. Elle compte dans `TRAIL_MAX` :
     c'est la meme surface au sol, et le plafond porte sur ce que le joueur doit
     lire, pas sur la mecanique qui l'a pose. */
  SPORE_LIFE: 3,
  SPORE_DOT: 10,
  SPORE_R: 22,

  /* AURA. Reduction des degats SUBIS par les ennemis proches. Elle ne se cumule
     jamais : deux porteurs sur la meme cible appliquent la MEILLEURE reduction,
     jamais le produit — meme regle que le Voeu partage et que les auras de
     givre. Sans cette regle, trois porteurs groupes rendaient un paquet
     strictement increvable. */
  AURA_RADIUS: 90,
  AURA_REDUCTION: 0.35,
};

/* --- les neuf types -----------------------------------------------------------

   L'ORDRE FAIT FOI : l'index circule dans l'instantane (champ de type, rang
   d'elite encode a +100). On ajoute EN FIN, jamais au milieu — les quatre
   nouveaux occupent donc les index 5 a 8.

   `from` a disparu. Il disait la VAGUE a partir de laquelle un type pouvait
   sortir, et il n'y a plus de vague : `minLevel` / `fallback` le remplacent,
   avec la MEME signature que `minPlayers` / `fallback` de `MECHS`. Voir
   `adaptType` plus bas — c'est la seule boucle de retroaction du design.

   `weight` est le poids dans le tirage, `share` le plafond de population
   (`share x MAX_ENEMIES` simultanes). La somme des `share` peut depasser 1 sans
   probleme ; ce qu'aucun type ne doit pouvoir faire, c'est occuper seul la
   moitie de l'arene — sans ce garde-fou, les tireurs, qui restent hors du corps
   a corps et meurent rarement, finissaient par occuper 117 des 180 places.

   NE JAMAIS ECRIRE DANS CETTE TABLE. Elle est partagee, exportee et lue par le
   client : `standoff` est COPIE sur l'ennemi (`e.standoff`), et tout ce que le
   comportement d'un individu modifie doit l'etre aussi. */
export const ENEMY_TYPES = [
  { key: "grunt",   minLevel: 1,  fallback: -1, weight: 1.00, share: 1.00, hpMul: 1.0,  speed: 95,  dmg: 18, r: 12, score: 10 },
  { key: "runner",  minLevel: 2,  fallback: 0,  weight: 0.55, share: 0.45, hpMul: 0.45, speed: 188, dmg: 12, r: 9,  score: 14 },
  { key: "tank",    minLevel: 5,  fallback: 0,  weight: 0.30, share: 0.22, hpMul: 4.5,  speed: 52,  dmg: 30, r: 21, score: 30 },
  { key: "shooter", minLevel: 7,  fallback: 1,  weight: 0.30, share: 0.16, hpMul: 1.3,  speed: 62,  dmg: 14, r: 14, score: 25,
    shootCd: 2.6, standoff: 170 },
  { key: "brood",   minLevel: 9,  fallback: 1,  weight: 0.25, share: 0.12, hpMul: 1.8,  speed: 78,  dmg: 20, r: 16, score: 20,
    splits: 3 },

  /* KAMIKAZE (plan4 lot M, repris tel quel). Il punit le corps-a-corps et rend
     les cartes de degats de zone du joueur risquees a bout portant — une tension
     qui n'existait nulle part.

     L'explosion se branche au POINT UNIQUE DE MORT (`_killEnemy`) : c'est ce qui
     garantit « quelle que soit la cause », brulure et zone comprises. Elle est
     posee comme une zone de 0,15 s d'annonce plutot que resolue seche : le depot
     n'a pas d'autre facon de dire « ca va exploser la » au client, et le delai
     court laisse une chance de sortie sans rendre l'explosion gratuite.

     Elle ne blesse QUE les joueurs. `plan4` la voulait aussi sur les ennemis
     voisins ; ca ouvrait une reaction en chaine (un kamikaze qui en tue un
     autre) qu'il aurait fallu brider comme l'onde de mort, et surtout une facon
     de faire nettoyer la horde par la horde — c'est-a-dire de recompenser le
     fait de ne pas jouer, ce que tout le lot P s'emploie a interdire. */
  { key: "kamikaze", minLevel: 11, fallback: 1, weight: 0.22, share: 0.18, hpMul: 0.5, speed: 118, dmg: 8, r: 10, score: 18,
    blastRadius: 90, blastDamage: 45, blastDelay: 0.15 },

  /* BULWARK. Bouclier frontal : il faut GAGNER L'ANGLE. Deux consequences
     indissociables. L'absorption vit dans `_bulletHitEnemy()` — la boucle de
     collision ET le balayage d'apparition l'appellent, sinon une balle nee a
     bout portant traverse le bouclier qu'une balle tiree a dix metres respecte.
     Et son orientation est LIMITEE EN VITESSE (`shieldTurnRate`) au lieu de
     suivre sa cible a l'image : un bouclier qui se retourne instantanement rend
     le flanc inatteignable, donc le type injouable. C'est le seul ennemi du jeu
     dont `e.ang` n'est pas l'angle vers sa cible. */
  { key: "bulwark",  minLevel: 13, fallback: 2, weight: 0.30, share: 0.16, hpMul: 2.2, speed: 58, dmg: 22, r: 15, score: 32,
    shieldArc: 100, shieldTurnRate: 2.4 },

  /* MEDIC. Le seul type qui force explicitement une priorite de cible. Il reste
     en retrait (meme logique de `standoff` que le tireur), soigne le voisin
     blesse, et ROMPT son soin s'il est vise plus d'une seconde — sans quoi il
     serait un mur qui regenere tout seul indefiniment.

     Son soin est un CHEMIN NEUF et non un `_damage()` negatif : `_damage` porte
     le vol de vie, les critiques et le compteur de touches, dont aucun n'a de
     sens sur un soin.

     `share: 0.09`, parmi les plus bas : c'est un multiplicateur de menace pour
     le reste de la horde, pas un ennemi qu'on veut voir en nombre. */
  { key: "medic",    minLevel: 15, fallback: 3, weight: 0.28, share: 0.09, hpMul: 0.9, speed: 68, dmg: 10, r: 13, score: 28,
    standoff: 240, heal: 6, healInterval: 1.2, healRange: 190,
    /* `fireWindow` : delai au-dela duquel on cesse de le considerer « sous le
       feu ». Le critere est le temps passe SOUS LE FEU et non « touche
       recemment » — une balle perdue ne doit pas couper un soin, s'acharner
       une seconde doit le couper. */
    fireWindow: 0.35, breakTime: 1.0, fleeTime: 3.0 },

  /* CHOEUR — le seul type inedit de ce plan. Le medic pose une priorite de cible
     sur un INDIVIDU ; le choeur la pose sur un GROUPE : il accorde l'aura a tous
     les ennemis dans son rayon, plus large que celui de `TRAIT_AURA`. Le tuer
     d'abord debloque le paquet ; l'ignorer rend une foule ordinaire pres de deux
     fois plus longue a percer.

     `share: 0.08`, le plus bas du bestiaire : deux choeurs qui se couvrent
     mutuellement sont un mur, et il faut que ce cas reste rare et intentionnel. */
  { key: "choeur",   minLevel: 17, fallback: 4, weight: 0.20, share: 0.08, hpMul: 1.6, speed: 70, dmg: 12, r: 15, score: 30,
    auraRadius: 130, auraReduction: 0.35 },
];

export function typeAt(index) { return ENEMY_TYPES[index] ?? ENEMY_TYPES[0]; }

/* --- ou vit l'ATTACHEMENT des traits --------------------------------------------

   PAS ICI, et c'est une decision du lot T. Ce module repond a « comment un dash
   fonctionne » ; le PROFIL DE DIFFICULTE (`DIFFICULTIES` dans `game_state.js`)
   repond a « qui l'a ». La table d'attachement a vecu ici le temps du lot S,
   quand le profil n'existait pas encore ; l'avoir aux deux endroits serait le
   bug — c'est exactement la duplication que le depot refuse partout ailleurs.

   La regle est celle du depot : les VALEURS d'un comportement vivent a cote de
   leur table (`CARD_CFG`, `SKILL_CFG`, `STATUS_CFG`, `BOSS_CFG`, `TRAIT_CFG`),
   son ATTACHEMENT vit la ou se prend la decision. Une difficulte EST un choix
   d'attachement — c'est meme a peu pres tout ce qu'elle est depuis le lot T.

   Meme raison pour le ROSTER (quels types sortent dans quel mode) : il etait ici
   sous le nom de `DIFF_TYPES`, il est desormais une ligne du profil.
   `typesFor()` et `traitsOf()` sont exportes par `game_state.js`. */

export function hasTrait(mask, id) { return (mask & traitBit(id)) !== 0; }

/* --- adaptType : LA seule boucle de retroaction du design -----------------------

   Le script nomme la pression de chaque beat, mais D3 indexe l'acces aux types
   sur le NIVEAU D'EQUIPE : une equipe en retard arrivee a la minute 12 au niveau
   4 n'a pas les degats pour des tanks. `minLevel` / `fallback` repondent
   exactement comme `minPlayers` / `fallback` repondent a l'effectif, et le point
   de passage est le jumeau d'`adaptMech`.

   Elle est AUTHORED (une table, pas une formule qui lit une performance),
   ASYMETRIQUE (elle n'aide qu'une equipe en retard, elle ne punit jamais celle
   qui avance) et LISIBLE (un seuil par type). C'est ce qui la rend compatible
   avec D2, qui refuse tout scaler dont l'entree est sa propre sortie.

   UN SEUL NIVEAU DE REPLI, comme `adaptMech` : un repli qui replie serait
   impossible a lire dans la table, qui est justement ce qui rend le systeme
   tenable. Rend -1 quand meme le repli est hors de portee — l'appelant retombe
   alors sur le grunt, seul type sans seuil.

   Effet secondaire precieux, le meme que celui deja note pour les cartes
   verrouillees par jalons : un nouveau joueur decouvre un pool plus simple,
   c'est de l'onboarding sans une ligne de tutoriel. */
export function adaptType(index, level) {
  const def = ENEMY_TYPES[index];
  if (!def) return -1;
  if (level >= def.minLevel) return index;
  const back = def.fallback ?? -1;
  if (back < 0) return -1;
  const bd = ENEMY_TYPES[back];
  return bd && level >= bd.minLevel ? back : -1;
}
