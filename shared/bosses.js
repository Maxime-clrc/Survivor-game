/* ===========================================================================
   BOSS — module pur, importe par le serveur ET par le navigateur.
   Sur le modele exact de `cards.js`, `classes.js` et `statuses.js` : il ne
   depend de rien, surtout pas de `game_state.js`, qui l'importe — un cycle
   d'import casserait le chargement des modules dans le navigateur.

   CINQ boss, un VERBE chacun. La tentation etait d'empiler les mecaniques sur
   un boss unique : c'est ce qu'on avait, et le Ravageur finissait par tout
   demander a la fois sans rien demander de precis. Cinq combats qui posent
   chacun une question differente se lisent, se nomment et se racontent — et le
   Ravageur existant en devient un sans etre reecrit.
   =========================================================================== */

/* `BOSS_ROSTER` est un TABLEAU ORDONNE et son index circule sur le reseau
   (champ `bo[9]` du snapshot) : ne jamais inserer au milieu, ajouter a la fin.
   Meme invariant que POWERUP_TYPES, ENEMY_TYPES, DIFFICULTIES, CLASSES et
   STATUSES. */
export const BOSS_RAVAGEUR = 0;
export const BOSS_MATRIARCHE = 1;
export const BOSS_METRONOME = 2;
export const BOSS_ORACLE = 3;
export const BOSS_JUMEAUX = 4;
/* Le boss FINAL (lot N), en SIXIEME position — ajoute a la fin, comme le veut
   l'invariant : un onglet reste sur une version anterieure lit `bo[9] = 5`,
   ne trouve rien et retombe sur le Ravageur (cf. `bossAt`). Il ne se tire
   jamais au hasard : `_pickBoss` ne le rend qu'apres un cycle complet du
   roster, ce qui le sort du filtre par effectif comme du tirage sans
   repetition. */
export const BOSS_FINAL = 5;

/* Identifiants de MECANIQUE. Ordonnes eux aussi : l'index circule dans le
   canal d'alerte (`{t:"alert", mech, ...}`) et dans la liste `mk` du snapshot.
   Le registre est partage parce que le client doit pouvoir NOMMER la mecanique
   qu'il dessine — un cercle cyan ne dit pas « regroupez-vous » a la premiere
   rencontre, et c'est exactement la ou l'Oracle devient incomprehensible. */
export const MECH_STACK = 0;        // regroupement
export const MECH_SPREAD = 1;       // dispersion
export const MECH_TOWER = 2;        // tours
export const MECH_COUNT = 3;        // denombrement
export const MECH_LINK = 4;         // lien
export const MECH_JAIL = 5;         // prison
export const MECH_GAZE = 6;         // regard
export const MECH_PROX = 7;         // proximite
export const MECH_MIASMA = 8;       // usure d'equipe
export const MECH_ULT = 9;          // jauge d'ultime
export const MECH_CLUSTER = 10;     // grappe a detruire
export const MECH_FEED = 11;        // lien nourricier
export const MECH_EXAFLARE = 12;
export const MECH_BAIT = 13;        // appats
export const MECH_DRIFT = 14;       // zones en translation
export const MECH_SANCTUARY = 15;
export const MECH_SLIP = 16;        // sol glissant
export const MECH_QUADRANT = 17;    // verrouillage par quadrant
export const MECH_CROSS = 18;       // croix des Jumeaux
export const MECH_CONVERGE = 19;    // les Jumeaux se rejoignent
export const MECH_DODGE = 20;       // repli solo du regroupement : une zone a eviter
export const MECH_SHRINK = 21;      // constriction de l'arene
export const MECH_PUDDLE = 22;      // flaques remanentes
export const MECH_SAFE = 23;        // secteur epargne (Pac-Man)
/* Rupture de barre, DECLINEE PAR BOSS (lot A). Elle etait la meme cinq fois par
   combat et pour les cinq boss : un souffle, et des degats. Les degats sont
   partis — casser une barre est une reussite, le jeu la taxait — et le souffle
   parle desormais le verbe du boss qu'on est en train de casser.

   Quatre entrees et non cinq : l'Oracle pose un cumul de Vulnerabilite a toute
   l'equipe, ce que `MECH_MIASMA` annonce DEJA mot pour mot. Ajouter une
   cinquieme mecanique pour redire la meme phrase aurait fait deux libelles a
   garder d'accord. */
export const MECH_BREATH = 24;      // Ravageur : souffle qui repousse
export const MECH_BROOD = 25;       // Matriarche : nuee de rejetons
export const MECH_REVERSE = 26;     // Metronome : les motifs s'inversent
export const MECH_SWAP = 27;        // Jumeaux : ils echangent leurs places
/* Les deux mecaniques EXCLUSIVES du boss final (lot N). Ajoutees a la fin,
   l'index circule — meme invariant que le reste du registre. */
export const MECH_SYNTHESE = 28;    // exaflares traversant une zone de regroupement
export const MECH_SCEAU = 29;       // les quatre coins, tenus simultanement

/* Niveaux d'alerte. `consigne` demande une action immediate, `avertissement`
   previent d'un danger, `information` raconte. Le client n'affiche jamais deux
   consignes en meme temps — voir le bandeau. */
export const ALERT_ORDER = 0;
export const ALERT_WARN = 1;
export const ALERT_INFO = 2;

/* Table des mecaniques. `minPlayers` et `fallback` sont l'adaptation a
   l'effectif : un SEUIL PAR MECANIQUE plutot qu'une variante de combat par
   effectif — cinq variantes de cinq boss seraient impossibles a maintenir, et
   c'est le genre de duplication qui derive au premier reglage.

   `texte` est la consigne affichee. Elle porte les accents (chaine vue par le
   joueur) alors que `key` n'en a pas (identifiant). */
export const MECHS = [
  { id: MECH_STACK, key: "stack", nom: "Regroupement", minPlayers: 2, fallback: MECH_DODGE,
    level: ALERT_ORDER, texte: "REGROUPEZ-VOUS sur le cercle" },
  { id: MECH_SPREAD, key: "spread", nom: "Dispersion", minPlayers: 2, fallback: -1,
    level: ALERT_ORDER, texte: "ÉCARTEZ-VOUS les uns des autres" },
  { id: MECH_TOWER, key: "tower", nom: "Tours", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "OCCUPEZ toutes les tours" },
  { id: MECH_COUNT, key: "count", nom: "Dénombrement", minPlayers: 3, fallback: MECH_TOWER,
    level: ALERT_ORDER, texte: "le nombre inscrit doit être exact" },
  { id: MECH_LINK, key: "link", nom: "Lien", minPlayers: 2, fallback: -1,
    level: ALERT_ORDER, texte: "ÉLOIGNEZ-VOUS pour rompre le lien" },
  { id: MECH_JAIL, key: "jail", nom: "Prison", minPlayers: 2, fallback: MECH_CLUSTER,
    level: ALERT_ORDER, texte: "LIBÉREZ le prisonnier en tirant sur la cage" },
  { id: MECH_GAZE, key: "gaze", nom: "Regard", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "NE VISEZ PLUS le boss" },
  { id: MECH_PROX, key: "prox", nom: "Proximité", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "le centre est mortel, éloigne-toi" },
  { id: MECH_MIASMA, key: "miasma", nom: "Miasme", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "un cumul de Vulnérabilité pour toute l'équipe" },
  { id: MECH_ULT, key: "ult", nom: "Jauge d'ultime", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "la jauge ne descend que si les tours sont tenues" },
  { id: MECH_CLUSTER, key: "cluster", nom: "Grappe", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "DÉTRUIS la grappe avant l'éclosion" },
  { id: MECH_FEED, key: "feed", nom: "Lien nourricier", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "TUE les rejetons, ils la soignent" },
  { id: MECH_EXAFLARE, key: "exaflare", nom: "Exaflare", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "la suite arrive dans le même axe" },
  { id: MECH_BAIT, key: "bait", nom: "Appâts", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "ton fantôme te suit — ne t'arrête pas" },
  { id: MECH_DRIFT, key: "drift", nom: "Dérive", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "les disques glissent" },
  { id: MECH_SANCTUARY, key: "sanctuary", nom: "Sanctuaires", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "RESTE sur les disques sûrs" },
  { id: MECH_SLIP, key: "slip", nom: "Sol glissant", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "le sol ne répond plus tout de suite" },
  /* Le verrouillage est passe a `minPlayers: 3`. Des murs infranchissables qui
     decoupent l'arene en quatre separent les joueurs, chacun avec sa portion de
     horde : a deux ca revient a jouer deux parties solo, et en solo ca ne veut
     rien dire du tout. Le repli est une simple zone a quitter — meme geste,
     sans dependance a un allie. */
  { id: MECH_QUADRANT, key: "quadrant", nom: "Verrouillage", minPlayers: 3, fallback: MECH_DODGE,
    level: ALERT_ORDER, texte: "les murs vous séparent — tenez votre quart" },
  { id: MECH_CROSS, key: "cross", nom: "Croix", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "l'intersection est mortelle" },
  { id: MECH_CONVERGE, key: "converge", nom: "Convergence", minPlayers: 2, fallback: -1,
    level: ALERT_INFO, texte: "ils se rejoignent — regroupez-vous" },
  { id: MECH_DODGE, key: "dodge", nom: "Zone", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "sors de la zone" },
  { id: MECH_SHRINK, key: "shrink", nom: "Constriction", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "l'arène se referme — la couronne devient mortelle" },
  { id: MECH_PUDDLE, key: "puddle", nom: "Mares", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "chaque tir laisse une mare — le sol se réduit" },
  { id: MECH_SAFE, key: "safe", nom: "Secteur sûr", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "PLACE-TOI dans le secteur épargné" },

  /* Les quatre ruptures de barre. Toutes en `minPlayers: 1` et sans repli : une
     rupture arrive quel que soit l'effectif, et une variante qu'on ne pourrait
     pas poser laisserait la barre se casser en silence — ce qui est exactement
     le defaut qu'on corrige.
     Aucune n'est une CONSIGNE : le joueur n'a rien a faire d'un souffle, il a
     besoin de savoir ce qui vient de changer. D'ou `avertissement` pour les
     trois qui modifient le champ de bataille, et `information` pour le souffle
     du Ravageur, qui ne fait que nettoyer. */
  { id: MECH_BREATH, key: "breath", nom: "Souffle", minPlayers: 1, fallback: -1,
    level: ALERT_INFO, texte: "le souffle efface les projectiles" },
  { id: MECH_BROOD, key: "brood", nom: "Nuée", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "une nuée de rejetons éclot" },
  { id: MECH_REVERSE, key: "reverse", nom: "Inversion", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "les motifs repartent en sens inverse" },
  { id: MECH_SWAP, key: "swap", nom: "Échange", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "ils viennent d'échanger leurs places" },

  /* Les deux mecaniques EXCLUSIVES du boss final (lot N).

     La synthese COMBINE deux repertoires au lieu de les enchainer : une zone
     de regroupement de l'Oracle que des exaflares du Metronome traversent. Le
     groupe doit tenir ensemble ET bouger ensemble, ce qu'aucun des cinq boss
     ne demande — chacun ne pose qu'une moitie de la question. Repli solo :
     l'esquive seule, comme le regroupement.

     Le sceau est la mecanique de la DERNIERE barre. Les quatre coins tenus
     simultanement pendant un temps CUMULE : c'est le seul endroit du jeu ou
     l'equipe doit se disperser au maximum tout en restant coordonnee, et le
     nombre de zones suit l'effectif par `adaptMech` — a un joueur il n'en
     reste qu'une, ce qui en fait une occupation simple, longue et sous le feu.
     Pas de `fallback` vers une autre mecanique : c'est le sceau ou rien, il
     porte la fin du combat. */
  { id: MECH_SYNTHESE, key: "synthese", nom: "Synthèse", minPlayers: 2, fallback: MECH_DODGE,
    level: ALERT_ORDER, texte: "RESTEZ groupés ET fuyez les traînées" },
  { id: MECH_SCEAU, key: "sceau", nom: "Sceau final", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "TENEZ les sceaux jusqu'à la rupture" },
];

export function mechAt(id) { return MECHS[id] ?? null; }

/* Adaptation a l'effectif : renvoie la mecanique REELLEMENT posee, c'est-a-dire
   elle-meme, son repli, ou -1 si elle n'a pas lieu d'etre. Un seul endroit
   decide — sinon chaque appel refait le test a sa maniere et la table du
   LISEZMOI cesse d'etre vraie. */
export function adaptMech(id, alive) {
  const def = MECHS[id];
  if (!def) return -1;
  if (alive >= def.minPlayers) return id;
  const back = def.fallback ?? -1;
  if (back < 0) return -1;
  // Un seul niveau de repli : un repli qui replie serait impossible a lire dans
  // la table d'adaptation, qui est justement ce qui rend le systeme tenable.
  const bd = MECHS[back];
  return bd && alive >= bd.minPlayers ? back : -1;
}

// Nombre de tours a poser. A un joueur une seule tour, sinon la mecanique est
// une taxe ; a partir de trois, autant que de vivants — c'est la que « repartir
// l'equipe » devient une decision et pas une formalite.
export function towerCount(alive) {
  if (alive <= 1) return 1;
  if (alive === 2) return 2;
  return alive;
}

/* Les cinq boss. `hpMul` compense ce que le verbe coute en temps de tir : la
   Matriarche voit une partie des degats partir sur ses rejetons, le Metronome
   fait passer le combat a courir. `minPlayers` interdit un combat plutot que de
   le denaturer — un Oracle solo, c'est le boss de la cohesion sans equipe.

   `base` est le repertoire d'entree, `unlock[i]` ce que la barre i+1 ajoute :
   on apprend le combat par couches au lieu de tout subir d'un coup. Les cles
   sont des CHAINES et non des index : elles ne circulent pas sur le reseau,
   elles ne sont lues que par le repartiteur `_atk`. */
export const BOSS_ROSTER = [
  {
    id: BOSS_RAVAGEUR, key: "ravageur", nom: "Ravageur", verbe: "positionnement",
    minPlayers: 1, hpMul: 1.00,
    sous: "lis le sol",
    base: ["salve", "marques", "charge"],
    unlock: [
      ["damier"],
      ["couronne"],
      ["couloirs", "spirale", "constriction"],
      ["balayage", "mur", "quadrant"],
    ],
  },
  {
    id: BOSS_MATRIARCHE, key: "matriarche", nom: "Matriarche", verbe: "gestion de cibles",
    minPlayers: 1, hpMul: 0.85,
    sous: "choisis ta cible",
    base: ["salve", "grappes", "marques"],
    unlock: [
      ["nourriciers"],
      ["prison"],
      ["proximite"],
      ["traque"],
    ],
  },
  {
    id: BOSS_METRONOME, key: "metronome", nom: "Métronome", verbe: "mouvement",
    minPlayers: 1, hpMul: 0.90,
    sous: "ne t'arrête jamais",
    base: ["exaflare", "appat", "derive"],
    unlock: [
      ["charge"],
      ["sanctuaire"],
      ["verglas"],
      ["balayage"],
    ],
  },
  {
    id: BOSS_ORACLE, key: "oracle", nom: "Oracle", verbe: "cohésion",
    /* `hpMul` etait a 1,10 dans le plan : l'Oracle etait cense offrir a une
       equipe coordonnee des fenetres de degats franches. La mesure dit le
       contraire — 80 s a deux et 97 s a quatre, contre 50 a 57 pour le
       Ravageur. Le Regard fait cesser le tir deux secondes a chaque pose et les
       tours eloignent du boss : le combat coute deja du temps de tir sans
       qu'on ait a le payer une seconde fois en PV. Ramene a 0,95. */
    minPlayers: 2, hpMul: 0.95,
    sous: "jouez ensemble",
    base: ["rassemblement", "dispersion", "regard", "cone"],
    unlock: [
      ["tours"],
      ["couronne", "pacman"],
      ["denombrement"],
      ["proximite"],
    ],
  },
  {
    id: BOSS_JUMEAUX, key: "jumeaux", nom: "Jumeaux", verbe: "séparation",
    minPlayers: 2, hpMul: 1.00,
    sous: "séparez-vous",
    base: ["salve", "croix", "marques"],
    unlock: [
      ["lien"],
      ["damier"],
      ["prison"],
      ["croixdurable"],
    ],
  },

  /* --- LE NOYAU (lot N) -----------------------------------------------------

     Boss FINAL. Il n'apparait qu'apres un cycle complet du roster — les cinq
     boss rencontres dans la meme manche — et pas a un numero de vague fixe :
     la condition se lit (« tu les as tous vus »), un numero ne se lit pas. Avec
     la cadence des boss (une vague sur cinq), le cycle se termine vague 25 et
     le Noyau tombe donc vague 30.

     Son repertoire pioche dans les CINQ, un pattern caracteristique par boss —
     c'est la synthese que le combat raconte — plus ses deux mecaniques
     propres. Les patterns repris ne sont pas reecrits : ils sont INTENSIFIES
     par deux champs lus aux points de passage uniques (`atkCdMul` sur la
     cadence d'attaque, `zoneMul` sur les degats de zone). Vingt attaques
     intensifiees par deux nombres plutot que vingt variantes a maintenir —
     c'est la meme raison qui a fait `adaptMech` au lieu d'une variante de
     combat par effectif.

     HUIT barres et non cinq (`bars`), pour marquer l'echelle : cinq pour les
     patterns repris, deux pour la synthese, une pour le sceau.

     ATTENTION au compte de `unlock` : une barre rompue incremente `phase`, et
     `_bossBars` plafonne `phase` a `bars - 1`. Avec huit barres, la phase monte
     donc de 0 a 7 et `bossPool` lit `unlock[0..6]` — SEPT entrees, pas huit.
     Une huitieme ne sortirait jamais, et c'est le sceau qui y serait tombe.

     `floor` reste a ZERO pour lui, contrairement aux cinq autres : la montee en
     repertoire par barre EST le combat sur huit barres. Le laisser au niveau
     du `bossCount` (5 a ce stade de la manche) aurait ouvert d'emblee les
     quatre premieres couches et rendu muettes la moitie des ruptures. */
  {
    id: BOSS_FINAL, key: "noyau", nom: "Noyau", verbe: "synthèse",
    /* `minPlayers: 1` : le combat final ne peut pas etre interdit a un solo qui
       a fait tout le chemin. Ses deux mecaniques exclusives ont leur propre
       adaptation d'effectif, comme partout ailleurs. */
    minPlayers: 1,
    /* 2,2 fois un boss normal calibre pour la meme vague. Mesure a la vague 30,
       bossCount 6 : 44 046 PV contre 20 021 a quatre joueurs, soit exactement
       le rapport annonce. Reparti sur huit barres et non cinq, chaque barre
       coute donc 1,37 fois une barre ordinaire (5 506 PV contre 4 004) — les
       huit segments ne diluent pas le mur, ils le decoupent plus finement pour
       que la progression reste lisible sur un combat deux fois plus long. */
    hpMul: 2.2,
    bars: 8,
    /* Intensification des patterns repris. 0,80 sur la cadence (il attaque un
       cinquieme plus vite) et 1,25 sur les degats de zone : deux nombres qui
       portent sur les vingt attaques d'un coup, aux deux points de passage. */
    atkCdMul: 0.80,
    zoneMul: 1.25,
    sous: "tout ce qu'ils t'ont appris",
    /* Repertoire d'entree : un pattern par boss d'origine. Le damier vient du
       Ravageur, les grappes de la Matriarche, les exaflares du Metronome, le
       regroupement de l'Oracle, le lien des Jumeaux. Un joueur qui a fait le
       cycle les reconnait tous les cinq des la premiere barre. */
    base: ["salve", "damier", "exaflare", "grappes", "rassemblement", "lien"],
    unlock: [
      ["couronne"],              // barre 1 — Ravageur
      ["prison"],                // barre 2 — Matriarche
      ["derive", "appat"],       // barre 3 — Metronome
      ["tours", "regard"],       // barre 4 — Oracle
      ["croix", "quadrant"],     // barre 5 — Jumeaux
      ["synthese"],              // barre 6 — premiere exclusive
      ["sceau"],                 // barre 7 — le sceau, derniere barre
    ],
  },
];

export function bossAt(i) { return BOSS_ROSTER[i] ?? BOSS_ROSTER[0]; }

/* Repertoire disponible a une barre donnee. `floor` sert au meme usage que dans
   le combat existant : le boss N ne reapprend pas son damier a la barre 2, il
   demarre avec le repertoire deja ouvert des combats precedents. */
export function bossPool(kind, phase) {
  const def = bossAt(kind);
  const pool = def.base.slice();
  for (let i = 0; i < phase && i < def.unlock.length; i++) pool.push(...def.unlock[i]);
  return pool;
}

export const BOSS_CFG = {
  /* --- rupture de barre ----------------------------------------------------
     Elle NE FAIT PLUS DE DEGATS. Casser une barre est une reussite, et le jeu
     la punissait cinq fois par combat : c'est devenu une recompense — le souffle
     repousse la pression, efface les projectiles en vol et ouvre une fenetre de
     respiration (`attackCd` releve). La sanction, quand il en faut une, vient
     des mecaniques ratees, qui se jouent.

     La nuee de la Matriarche est HORS BUDGET de vague, comme ses renforts
     ordinaires : elle ne doit pas vider le budget de la vague en cours, mais
     elle compte bien pour « arene vide ». */
  BROOD_COUNT: 5,            // rejetons liberes par barre rompue
  /* --- sanction d'echec ---------------------------------------------------
     Une mecanique ratee MET A TERRE, elle ne tue jamais sechement. Dans un MMO
     rater une mecanique tue et on recommence en trois minutes ; ici une manche
     ratee coute plusieurs minutes de progression et de cartes, et le systeme de
     reanimation existe precisement pour ca.

     Les degats sont donc calibres en part des PV MAX de la cible — pas en
     valeur brute, qui vieillirait mal des que les cartes de PV entrent en jeu —
     et un joueur a PLEINE VIE ne peut pas mourir d'un seul echec (voir le
     plafond dans `_hurt`). C'est le cumul de Vulnerabilite pose par l'echec qui
     rend le SECOND fatal : la progression de la sanction est portee par l'etat,
     pas par la valeur. */
  MECH_DAMAGE_RATIO: 0.90,
  MECH_VULN: 1,              // cumuls poses par un echec

  /* --- mecaniques de groupe ---------------------------------------------- */
  STACK_RADIUS: 135,
  STACK_WARN: 3.4,
  SPREAD_MIN: 230,
  SPREAD_WARN: 3.0,
  SPREAD_RATIO: 0.55,        // part de la sanction pour chaque paire trop proche
  TOWER_RADIUS: 95,
  TOWER_WARN: 4.2,
  TOWER_RATIO: 0.45,         // part de la sanction, par tour vide, sur TOUTE l'equipe
  COUNT_WARN: 4.8,
  LINK_BREAK: 300,
  LINK_TIME: 8,
  LINK_DPS: 11,
  JAIL_TIME: 7,
  JAIL_HP: 240,              // PV de la cage, tires par les autres
  GAZE_WARN: 1.6,
  GAZE_TIME: 2.0,
  GAZE_TICK: 0.5,            // cadence de sanction pendant le regard
  GAZE_RATIO: 0.22,
  PROX_RADIUS: 280,
  PROX_WARN: 2.2,

  /* --- Matriarche --------------------------------------------------------- */
  CLUSTER_HP: 230,
  CLUSTER_TIME: 12,
  CLUSTER_HATCH: 3,          // runners liberes par une grappe qui eclot
  CLUSTER_COUNT: 2,
  FEED_COUNT: 2,
  /* Part des PV max rendue par seconde et par rejeton. Etait a 1,2 % : a deux
     rejetons, la Matriarche se rendait 2,4 % par seconde, ce qu'un joueur seul
     ne rattrape pas — 91 s de combat en solo contre 49 s pour le Ravageur. La
     mecanique doit couter du temps de tir, pas rendre le combat interminable
     quand personne ne peut se detacher pour les tuer. Puis de 0,8 % a 0,5 % :
     a 0,8 le combat solo tenait encore 95 s contre 49 pour le Ravageur, alors
     que le rejeton y est deja seul. */
  FEED_HEAL: 0.005,

  /* --- Metronome ---------------------------------------------------------- */
  EXAFLARE_STEPS: 7,
  EXAFLARE_R: 105,
  EXAFLARE_WARN: 1.5,
  EXAFLARE_STEP: 0.32,
  BAIT_COUNT: 4,
  BAIT_STEP: 0.55,
  BAIT_WARN: 1.5,
  BAIT_R: 90,
  BAIT_LAG: 1.0,             // le fantome depose la zone la ou on etait il y a 1 s
  DRIFT_COUNT: 3,
  DRIFT_R: 115,
  DRIFT_SPEED: 95,
  DRIFT_TICKS: 10,
  DRIFT_PERIOD: 0.5,
  SANCT_R: 125,
  SANCT_WARN: 3.2,
  SANCT_SPEED: 55,
  SANCT_TICKS: 5,
  SANCT_PERIOD: 1.1,
  SLIP_TIME: 12,
  SLIP_ACCEL: 3.4,           // plus c'est bas, plus ca patine

  /* --- Matriarche : flaques remanentes (lot 5) -----------------------------
     Chaque tir de la horde laisse une mare pendant son combat : l'arene se
     reduit au fil des minutes, ce qui est un chronometre deguise, bien plus
     lisible qu'un enrage brutal. Le PLAFOND est strict et non indicatif — sans
     lui, une fin de combat a 200 ennemis pavait le sol, le snapshot enflait et
     la mecanique devenait illisible avant d'etre difficile. */
  PUDDLE_MAX: 25,
  PUDDLE_LIFE: 15,
  PUDDLE_R: 44,
  PUDDLE_DOT: 20,            // degats par seconde
  PUDDLE_WARN: 0.4,          // annonce courte : la mare se voit arriver sans se lire

  /* --- Ravageur ----------------------------------------------------------- */
  QUADRANT_WARN: 1.9,
  QUADRANT_TICKS: 5,
  QUADRANT_PERIOD: 0.7,
  QUAD_TIME: 20,             // duree des murs de separation
  QUAD_THICK: 26,

  /* Constriction. Elle avance par PALIERS et non en continu : une arene qui
     retrecit doucement ne se remarque pas, alors qu'un palier annonce est une
     mecanique qu'on lit. `SHRINK_MIN` borne le carre central — en dessous, la
     horde de 200 ennemis ne tient plus et le combat devient une bouillie ou le
     positionnement ne veut plus rien dire. */
  SHRINK_STEP: 0.13,         // part de chaque dimension retiree par palier
  SHRINK_MIN: 0.45,          // arene minimale, en part de la taille d'origine
  SHRINK_WARN: 2.6,
  SHRINK_RATIO: 0.5,         // sanction pour qui est pris dans la couronne
  CROWN_DPS: 60,             // degats par seconde aux ENNEMIS restes dehors

  /* --- Oracle ------------------------------------------------------------- */
  /* Cone et Pac-Man (lot 5). Le cone est l'attaque frontale du repertoire : un
     eventail par joueur, qu'on esquive lateralement. Le Pac-Man est son
     inverse — tout le disque explose SAUF un secteur, il faut donc se placer
     derriere une direction precise au lieu de fuir. Il porte le mode
     `proximity` : letal au centre, supportable au bord, ce qui evite d'avoir a
     dessiner deux zones concentriques pour dire la meme chose. */
  CONE_R: 640,
  CONE_SPREAD: 0.40,         // demi-angle, en radians (~23 degres)
  CONE_WARN: 1.8,
  PACMAN_R: 700,
  PACMAN_SAFE: 0.58,         // demi-angle du secteur epargne (~33 degres)
  PACMAN_WARN: 2.6,

  ULT_FILL: 1 / 42,          // par seconde
  ULT_DRAIN: 1 / 9,          // par seconde, tours toutes occupees
  ULT_RATIO: 1.0,            // sanction pleine : c'est LE controle de degats du jeu

  /* --- Jumeaux ------------------------------------------------------------ */
  TWIN_HEAL_RANGE: 400,
  /* Soin mutuel, en part des PV max par seconde. Etait a 2 % : les Jumeaux se
     rejoignent d'eux-memes puisqu'ils poursuivent des joueurs, et le combat
     durait 167 a 198 s contre 50 a 80 attendues — la mecanique ne demandait
     plus de se separer, elle interdisait de gagner. A 0,8 % elle reste
     dissuasive (elle annule environ un tiers des degats d'une equipe qui
     laisse les deux colles) sans devenir un mur. */
  TWIN_HEAL: 0.008,
  TWIN_GAP: 520,             // ecart vise a l'apparition
  TWIN_BLAST_RATIO: 0.75,    // explosion du porteur des DEUX etats
  TWIN_STATUS_CD: 5,
  CROSS_THICKNESS: 150,
  CROSS_WARN: 1.7,
  CROSS_GAP: 0.18,           // decalage entre les deux branches : l'intersection prend deux fois
  /* Croix DURABLE (barre 5). La meme figure, mais elle reste : quatre bandes
     depuis chaque Jumeau, quatre quadrants surs, et il faut tenir sa portion
     pendant huit secondes au lieu de sauter une fois. C'est la seule zone du
     jeu qui utilise la forme 5 — deux rectangles croises auraient coute deux
     entrees de snapshot par branche et deux tests de collision. */
  CROSSD_THICKNESS: 130,
  CROSSD_WARN: 2.2,
  CROSSD_LIFE: 8,
  CROSSD_DOT: 26,            // degats par seconde
};
