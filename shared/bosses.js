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
/* AJOUT EN FIN DE TABLE (lot W) : le boss final. Il ne se tire jamais avec les
   cinq autres — il CLOT le segment 6, par construction, ce qui supprime la
   constante `FINAL_BOSS_AFTER_FULL_ROSTER` du plan precedent et l'arithmetique
   qui allait avec (« les boss occupent les vagues multiples de 5, le roster en
   compte cinq, donc le cycle se termine vague 25 »). Le segment 6 EST cet
   instant : la garantie reste, le calcul disparait. */
export const BOSS_FINAL = 5;

/* Nombre de boss INTERMEDIAIRES, c'est-a-dire ceux que `_pickBoss` tire. Ecrit
   et non deduit de `BOSS_ROSTER.length` : le final est dans le roster (son index
   circule) mais il n'entre jamais dans le tirage, et deduire ferait qu'ajouter
   un septieme boss un jour le mettrait silencieusement dans le deck. */
export const BOSS_POOL_COUNT = 5;

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
/* AJOUT EN FIN DE TABLE, jamais au milieu : l'index circule dans le canal
   d'alerte et dans `mk`, l'inserer ailleurs reecrirait en silence le sens de
   toutes les annonces d'un onglet reste sur une version anterieure. */
export const MECH_ENRAGE = 28;      // le combat s'eternise : le boss s'emporte
/* Les DEUX mecaniques exclusives du boss final (lot W), en fin de table comme
   tout le reste. Le critere d'acceptation demandait « au moins deux mecaniques
   qui n'existent nulle part ailleurs » : sans elles, le combat final ne serait
   qu'un medley et le joueur qui a vu les cinq boss n'y decouvrirait rien.

   La SYNTHESE n'est pas un patron de plus : c'est la superposition de deux
   patrons deja connus, et son annonce doit dire exactement ca — le joueur sait
   deja lire chacun des deux, la difficulte est de les lire ensemble.

   Le SCEAU est la derniere barre. Il reutilise `towerCount(alive)` et non un
   second calcul d'effectif, et il est le seul du jeu a exiger que TOUTES les
   zones soient tenues a l'echeance, sous peine de sanction pleine sur toute
   l'equipe : c'est la mecanique de coordination la plus exigeante du dépôt,
   et elle n'a lieu qu'une fois par manche. */
export const MECH_SYNTH = 29;       // deux patrons a la fois
export const MECH_SEAL = 30;        // le sceau : toutes les zones, en meme temps

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
  /* ALERT_WARN et non ALERT_ORDER : le joueur n'a RIEN a faire d'un enrage, il
     a besoin de savoir ce qui vient de changer. Une consigne cyan lui ferait
     chercher un endroit ou aller. `minPlayers: 1` — l'enrage ne s'adapte pas a
     l'effectif, c'est une horloge. */
  { id: MECH_ENRAGE, key: "enrage", nom: "Emportement", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "le combat s'éternise — il frappe plus fort" },

  /* Les deux exclusives du boss final. `minPlayers: 1` et SANS repli pour les
     deux, et ce n'est pas une facilite : une mecanique de derniere barre qu'on
     ne pourrait pas poser laisserait le combat sans fin, puisque c'est elle qui
     occupe la huitieme couche du repertoire. Elles s'adaptent donc a l'effectif
     PAR LEUR CONTENU — `towerCount(alive)` pour le sceau — et non par un repli.

     La synthese est un AVERTISSEMENT et non une consigne : le joueur n'a pas
     une action a faire, il a deux lectures a tenir en meme temps. Le sceau, lui,
     est une consigne au sens plein. */
  { id: MECH_SYNTH, key: "synth", nom: "Synthèse", minPlayers: 1, fallback: -1,
    level: ALERT_WARN, texte: "deux motifs à la fois — lisez les deux" },
  { id: MECH_SEAL, key: "seal", nom: "Sceau", minPlayers: 1, fallback: -1,
    level: ALERT_ORDER, texte: "TENEZ tous les foyers en même temps" },
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

/* Les cinq boss, plus le final. `hpMul` compense ce que le verbe coute en temps
   de tir : la Matriarche voit une partie des degats partir sur ses rejetons, le
   Metronome fait passer le combat a courir.

   `base` est le repertoire d'entree, `unlock[i]` ce que la barre i+1 ajoute :
   on apprend le combat par couches au lieu de tout subir d'un coup. Les cles
   sont des CHAINES et non des index : elles ne circulent pas sur le reseau,
   elles ne sont lues que par le repartiteur `_atk`.

   `bars` est une propriete du ROSTER depuis le lot W et non plus la constante
   globale `CFG.BOSS_BARS` : le final en a huit, les cinq autres cinq. Absente,
   elle retombe sur la constante — un boss ajoute plus tard n'a rien a declarer
   s'il suit la regle commune.

   `minPlayers: 2` A DISPARU de l'Oracle et des Jumeaux (lot W). La raison est
   arithmetique avant d'etre esthetique : cinq boss intermediaires pour cinq
   places, tires sans repetition, c'est un deck qui se distribue EXACTEMENT et
   cent vingt permutations gratuites. En solo, le pool tombait a trois pour cinq
   places, donc deux combats se repetaient — visible et pauvre.

   Les trois options etaient : repeter, ecrire deux boss solo dedies, ou ADAPTER.
   L'adaptation gagne parce que le mecanisme existe deja, est teste, documente et
   utilise par onze mecaniques : `MECH_STACK` retombe sur `MECH_DODGE`,
   `MECH_COUNT` sur `MECH_TOWER`, `MECH_JAIL` sur `MECH_CLUSTER`. Les deux
   mecaniques sans repli — `MECH_SPREAD` pour l'Oracle, `MECH_LINK` pour les
   Jumeaux — sortent simplement du repertoire solo : leurs attaques retombent sur
   les marques, ce que `_atkDispersion` et `_atkLien` font deja.

   La reserve du depot reste ecrite et elle est honnete : « un Oracle solo, c'est
   le boss de la cohesion sans equipe ». Le critere de revocation est chiffre —
   si l'ecart lit / ignore tombe sous 40 % en solo sur ces deux combats, on
   revient aux boss solo dedies. C'est une mesure du lot X, pas une opinion. */
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
    minPlayers: 1, hpMul: 0.95,
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
    minPlayers: 1, hpMul: 1.00,
    sous: "séparez-vous",
    base: ["salve", "croix", "marques"],
    unlock: [
      ["lien"],
      ["damier"],
      ["prison"],
      ["croixdurable"],
    ],
  },
  /* LE BOSS FINAL (lot W). Il n'est pas un sixieme verbe : il est LA SYNTHESE
     des cinq, et c'est ce qui dicte sa structure.

     Barres 1 a 5 : un patron repris a chacun des cinq boss, dans l'ordre du
     roster. Le joueur reconnait ce qu'il a appris, et le reconnait au bon
     moment — la premiere barre rend le damier du Ravageur, la deuxieme les
     grappes de la Matriarche, et ainsi de suite. Aucune n'est inedite : c'est
     precisement l'inverse de ce qu'on attend d'un boss final, et c'est ce qui
     fait de la sixieme barre un evenement.

     Barres 6 et 7 : la SYNTHESE, deux patrons superposes. C'est la que le
     combat cesse d'etre un medley.

     Barre 8 : le SCEAU, inedit, a haute exigence de coordination.

     SEPT ENTREES D'`unlock` POUR HUIT BARRES, et c'est la meme erreur
     d'arithmetique que celle deja ecrite pour `BAR_DWELL` : huit barres ne font
     pas huit ruptures mais SEPT — la premiere barre est ouverte des le premier
     tir. `bossPool` empile `unlock[i]` pour `i < phase`, et `phase` plafonne a
     `bars - 1` : une huitieme entree n'aurait JAMAIS ete atteinte. Ecrite comme
     le plan le demandait, elle mettait le sceau — la seule mecanique inedite du
     combat — dans du code mort. Mesure avant correctif : sceau jamais pose, quel
     que soit le niveau de degats.

     Le damier du Ravageur est donc dans `base`, ce qui n'est pas un pis-aller :
     le Ravageur EST le boss d'origine du depot, et sa figure la plus connue a sa
     place dans le repertoire d'entree du boss qui les resume. */
  {
    id: BOSS_FINAL, key: "final", nom: "Amalgame", verbe: "synthèse",
    minPlayers: 1, hpMul: 1.00, bars: 8,
    sous: "tout ce qu'ils t'ont appris",
    base: ["salve", "marques", "charge", "damier"],   // barre 1 — Ravageur
    unlock: [
      ["grappes"],                      // barre 2 — Matriarche
      ["exaflare"],                     // barre 3 — Metronome
      ["rassemblement", "regard"],      // barre 4 — Oracle
      ["croix"],                        // barre 5 — Jumeaux
      ["synthese"],                     // barre 6 — synthese I
      ["entrelacs"],                    // barre 7 — synthese II
      ["sceau"],                        // barre 8 — le sceau
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
  /* --- plancher de barre (lot R) -------------------------------------------
     Sous D2 les PV du boss ne suivent plus la puissance de l'equipe : la duree
     d'un combat devient inversement proportionnelle a la build, de 131 s a 29 s
     selon les mesures. C'est le grand ecart demande, et il casse une chose : un
     combat de 29 s traverse les cinq barres sans laisser sortir la moitie du
     repertoire, alors que chaque barre brisee est precisement ce qui ouvre du
     repertoire (`unlock[i]`). On perd du CONTENU au moment ou l'on recompense.

     Une barre ne peut donc pas se rompre moins de DWELL secondes apres la
     precedente, et les PV sont BORNES au plancher de la barre courante : les
     degats en exces sont mis de cote et s'appliquent a l'echeance. Retarder la
     rupture sans borner les PV ne suffisait pas — le boss mourait quand meme
     avant d'avoir joue, mesure a 27 s et trois barres sur cinq.

     10 et non 8, et c'est une erreur d'arithmetique qu'il vaut mieux ecrire :
     cinq barres ne font pas cinq delais mais QUATRE — la premiere barre commence
     entamee des le premier tir. Le plancher vaut donc 4 x DWELL, soit 32 s a 8
     et 40 s a 10. Mesure a 8 : les combats les plus courts tombaient a 32 s,
     sous les 40 s visees. */
  BAR_DWELL: 10,

  /* --- enrage (lot R) ------------------------------------------------------
     L'autre bout du grand ecart : a 131 s, et bien au-dela si la build est pire
     que la pire mesuree, le boss bloque l'horloge de horde indefiniment. Il
     faut une sortie, et elle ne doit pas etre une mort seche — d'ou des paliers
     qui montent, chacun ANNONCE par le canal d'alerte. L'equipe perd sur un pic
     qu'elle a vu venir (« nous n'etions pas assez forts ») et non sur un
     compteur invisible.

     L'enrage ne contourne aucun invariant : il passe par `_zoneDamage` et par
     la cadence d'attaque, donc par `_hurt`, donc sous le plafond « une
     mecanique ratee ne tue jamais un joueur a pleine vie ». */
  ENRAGE_AT: 150,            // secondes de combat avant le premier palier
  ENRAGE_STEP: 30,           // un palier de plus toutes les 30 s
  /* Le boss FINAL a son propre seuil, et c'est une necessite arithmetique et non
     un confort. `ENRAGE_AT: 150` est cale sur un boss normal, dont la mediane
     mesuree est a ~70 s : le garde-fou se declenche a deux fois la mediane, donc
     presque jamais en jeu normal. Le final a une mediane attendue autour de
     155 s ; au meme seuil, LA MOITIE des combats medians enrageraient, ce qui
     transformerait une sortie de secours en mecanique de phase.
     C'est le RAPPORT qu'il faut conserver (environ deux fois la mediane), pas la
     valeur — a remesurer une fois `FINAL_HP_MUL` cale. */
  FINAL_ENRAGE_AT: 300,
  ENRAGE_DAMAGE: 0.25,       // degats de zone en plus par palier
  ENRAGE_CD: 0.12,           // cadence d'attaque resserree par palier
  ENRAGE_CD_FLOOR: 0.45,     // ... sans descendre sous cette part de la cadence

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

  /* --- BOSS FINAL (lot W) --------------------------------------------------

     `FINAL_HP_MUL` multiplie les PV par-dessus tout le reste. 2,2 pour huit
     barres et non 8/5 = 1,6 : les barres tardives sont plus dangereuses que les
     premieres — le repertoire y est complet, l'attaque plus rapide — donc une
     barre du final ne vaut pas une barre d'un boss ordinaire. La valeur est un
     POINT DE DEPART derive des mesures existantes, comme tout ce plan, et le
     lot X la recalera sur la mediane visee (~155 s).

     Le PLANCHER DE BARRE compte double ici, et il compte HUIT FOIS et non sept :
     la derniere barre du final en a un elle aussi, ce qu'aucun autre boss n'a.
     C'est ce qui donne les 80 s de combat minimum — huit barres x 10 s — et
     surtout ce qui garantit que la HUITIEME couche joue : sans plancher sur la
     derniere barre, une build forte tuait le boss dans la rupture de la
     septieme et le sceau, seule mecanique inedite du combat, ne sortait jamais.
     Mesure avant correctif : 44 s a x4 de degats, 11 s a x20, une couche vue
     sur huit. On perdait le contenu au moment precis ou l'on recompense. */
  FINAL_HP_MUL: 2.2,
  FINAL_BAR_DWELL: 10,

  /* Le SCEAU. Fenetre plus longue que les tours ordinaires (4,2 s) : il faut
     traverser l'arene, pas se decaler. La sanction est PLEINE, comme l'ultime de
     l'Oracle — c'est la derniere barre du dernier boss, et une sanction partielle
     en ferait une formalite. Elle met a terre et ne tue pas, comme toute
     mecanique : le plafond de `_hurt` s'applique.

     Les foyers sont poses plus LOIN du centre que les tours (0,40 contre 0,32 de
     la plus petite dimension) : le sceau demande de se repartir sur toute
     l'arene, pas autour du boss. */
  SEAL_RADIUS: 88,
  SEAL_WARN: 6.0,
  SEAL_RATIO: 1.0,
  SEAL_SPREAD: 0.40,

  /* La SYNTHESE. Elle ne cree aucune geometrie a elle : elle superpose deux
     patrons existants, avec un DECALAGE — le second part `SYNTH_GAP` secondes
     apres le premier. Sans ce decalage les deux annonces tombent dans la meme
     image et le joueur n'en lit aucune ; avec, il lit la premiere, se place, et
     doit relire pendant qu'il tient sa position. */
  SYNTH_GAP: 0.9,
};
