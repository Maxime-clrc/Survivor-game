/* ===========================================================================
   CARTES D'AMELIORATION — module pur, importe par le serveur ET le navigateur.
   Aucune reference au DOM, au reseau, ni a GameState : le calcul des mods doit
   rester une fonction de la seule liste de cartes possedees, sinon il devient
   impossible de la rejouer pour un test.

   Les identifiants sont des CHAINES et non des index. L'invariant du depot
   (« les tableaux exportes sont ordonnes, l'index circule sur le reseau ») ne
   s'applique pas ici : les cartes possedees ne passent jamais dans le snapshot
   a 20 Hz, elles sont diffusees une fois par changement. On peut donc inserer
   une carte au milieu de la table sans rien reecrire.
   =========================================================================== */

import { fmtM } from "./units.js";
import { RARITY_COLOR } from "./palette.js";

export const RARITY = { COMMUNE: 0, RARE: 1, EPIQUE: 2, LEGENDAIRE: 3 };

export const RARITY_LABEL = ["commune", "rare", "épique", "légendaire"];
/* La couleur d'une rarete vit dans `palette.js`, avec toute la charte, et n'est
   que reexportee ici : elle est lue par le DOM (ecran de choix, tableau de fin)
   ET par le canvas, et deux listes finissent toujours par diverger. */
export { RARITY_COLOR };

/* Poids de base et derive par tirage.

   La derive a ete REMESUREE avec le passage aux vagues, et non extrapolee. Elle
   etait indexee sur le nombre de boss, qui ne depassait pas 2 ou 3 dans une
   manche : l'exposant restait petit tout seul. Indexee sur la qualite de
   tirage, qui monte jusqu'a 11, l'ancienne derive (1.35 / 1.8) donnait 714 de
   poids a la legendaire contre 12 a la commune — mesure : 3,06 legendaires par
   manche et 99 % des manches en voyant au moins une. Le systeme entier perdait
   sa pointe.

   Deux leviers plutot qu'un seul : la derive a ete adoucie (1.18) ET plafonnee
   (RARITY_DRIFT_CAP). Adoucir seul ne suffisait pas, plafonner seul a 1 tuait
   le bonus de qualite des vagues de boss, qui n'avait alors plus aucun effet.

   LA LEGENDAIRE NE DERIVE PLUS (1.0) et son poids de base tombe a 1. Le
   calibrage precedent (0,72 legendaire par manche, 55 % des manches) avait ete
   mesure a UN effectif : la qualite de tirage suit le niveau d'equipe, mais un
   joueur seul recolte a lui seul les tirages que quatre se partagent. A niveau
   egal il obtient donc autant de cartes de haute qualite pour quatre fois moins
   de cartes distribuees, et la proportion de legendaires explose — mesure a
   1,80 legendaire par manche en solo contre 0,72 a quatre. Le correctif ne
   porte pas sur les poids par effectif, qui n'auraient fait que deplacer le
   probleme : la legendaire devient GARANTIE a des jalons de NIVEAU
   (CARD_CFG.LEGENDARY_LEVELS) et plafonnee (LEGENDARY_MAX). Le hasard du
   roguelike reste entier — c'est *laquelle* qui tombe qui compte, pas *si*.

   Ce sont les epiques qui absorbent l'augmentation du nombre de cartes, et
   c'est voulu : c'est le palier ou deux joueurs de la meme table cessent de
   jouer le meme jeu. */
export const RARITY_WEIGHT = [60, 28, 10, 1];
export const RARITY_DRIFT = [0.92, 1, 1.18, 1.0];

/* Constantes de comportement des cartes. Elles vivent ici plutot que dans CFG
   pour que `cards.js` ne dependre de rien : game_state.js importe ce module,
   l'inverse creerait un cycle. Tout ce qui est mesurable reste malgre tout
   regroupe en un seul endroit, ce qui est le point de CFG. */
export const CARD_CFG = {
  PICK_TIME: 30,             // delai avant choix d'office
  FIRE_INTERVAL_FLOOR: 0.35, // plancher du produit des reductions de cadence
  /* « Chaine d'assaut » leve ce plancher-la, elle n'en supprime pas tout : une
     cadence sans plancher du tout tend vers zero, c'est-a-dire une balle par
     image et quatre cents projectiles en vol par joueur. Le plancher dur est
     donc la vraie limite du moteur, l'autre n'est qu'un reglage. */
  FIRE_INTERVAL_HARD_FLOOR: 0.20,
  DAMAGE_TAKEN_FLOOR: 0.40,  // idem pour les degats subis
  BULLET_SPEED_FLOOR: 0.25,  // « Munition dense » ne doit pas figer les balles

  /* Qualite de tirage. Une vague de boss vaut quatre niveaux d'equipe de
     bonus : c'est ce qui fait du boss un evenement de progression et pas
     seulement un mur de PV. */
  BOSS_QUALITY: 4,
  QUALITY_PER_LEVEL: 4,      // un cran de qualite tous les 4 niveaux d'equipe
  RARITY_DRIFT_CAP: 6,       // voir RARITY_DRIFT : au-dela, la derive s'emballe

  /* Legendaires : garanties a des jalons, plafonnees, quasi introuvables au
     hasard entre les deux (poids 1 contre 60, sans derive). Le jalon vaut par
     JOUEUR et par NIVEAU d'equipe : le premier ecran atteint a partir du niveau
     12 en offre une, les ecrans suivants du meme niveau n'en re-offrent pas —
     sinon trois niveaux gagnes d'affilee donnaient trois legendaires d'un coup,
     ce que le plafond seul aurait laisse passer jusqu'a deux.

     Le jalon etait sur la VAGUE (10 et 20). La vague n'existe plus, et le
     niveau est desormais gagne — c'est tout l'objet du lot : deux equipes ne
     l'atteignent plus au meme instant. 12 et 22 sur un objectif de 22 a 26 au
     bout de la manche, soit la meme place relative qu'avant. */
  LEGENDARY_LEVELS: [12, 22],
  LEGENDARY_MAX: 2,          // plafond dur par manche et par joueur

  BURN_TIME: 3,
  LIFESTEAL_CAP: 3,          // PV par seconde, tous cumuls confondus

  SHIELD_REGEN_DELAY: 6,

  COUNTER_CD: 3,
  COUNTER_RADIUS: 120,

  ORBIT_RADIUS: 74,
  ORBIT_SPEED: 2.2,          // rad/s
  ORBIT_DAMAGE: 25,
  ORBIT_HIT_CD: 0.5,         // par cible

  PULSAR_RADIUS: 250,
  PULSAR_DAMAGE: 90,

  DRONE_ORBIT: 46,
  DRONE_SPEED: 1.1,
  DRONE_RANGE: 420,
  DRONE_CD: 0.5,
  DRONE_DAMAGE_MUL: 0.6,

  SWARM_ORBIT: 30,
  SWARM_SPEED: 3.1,
  SWARM_DAMAGE: 12,
  SWARM_HIT_CD: 0.6,
  SWARM_RESPAWN: 8,

  FROST_MUL: 0.65,

  HARVEST_HEAL: 5,

  DEATHWAVE_RADIUS: 80,

  CHAIN_TARGETS: 3,
  CHAIN_MUL: 0.4,

  AUTO_TURRET_CD: 45,

  GUARDIAN_CD: 60,
  GUARDIAN_RADIUS: 200,

  INSTINCT_CD: 45,
  INSTINCT_HP: 0.2,          // part des PV max sous laquelle il se declenche
  INSTINCT_TIME: 4,
  INSTINCT_MUL: 0.4,

  FRENZY_STEP: 0.02,
  FRENZY_MAX: 0.60,
  FRENZY_DECAY: 3,

  ZONE_IMMUNITY: 1.5,

  GRENADE_DAMAGE: 110,
  GRENADE_RADIUS: 130,
  GRENADE_SPEED_MUL: 0.55,

  /* Cartes conditionnelles. Elles ne valent que combinees a autre chose, ce qui
     transforme un tirage en decision : une carte purement additive ne se
     combine pas, elle s'additionne. Leurs coefficients vivent ici parce qu'ils
     sont le seul levier d'equilibrage d'une carte dont la valeur depend de tout
     le reste du chargement. */
  SYMBIOSE_STEP: 0.05,       // par carte defensive possedee
  AUSTERITE_BONUS: 0.30,     // tant qu'aucune epique ni legendaire n'est prise
  RESONANCE_STEP: 0.04,      // par carte de cadence possedee
  DETTE_DAMAGE: 0.50,
  DETTE_XP_COST: 0.20,       // surcout de chaque palier de niveau

  // Les balles rebondissantes reviennent dans le dos du groupe : a plein degat
  // elles doublaient la puissance sans demander de viser.
  BOUNCE_DAMAGE_MUL: 0.75,
  BOUNCE_MAX: 3,             // rebonds avant disparition, sinon la balle vit
                             // toute sa duree a traverser l'arene en diagonale
  INERTIA_DECAY: 0.65,       // degats restants apres chaque ennemi traverse
  INERTIA_MIN_MUL: 0.05,     // en dessous, la balle s'eteint : sans ce plancher
                             // elle reste en vol a tester 200 ennemis pour rien

  RAVITAILLEMENT_SCORE: 200,

  /* --- cartes de classe -------------------------------------------------------
     Elles ne sortent qu'au tirage du porteur de la classe (`cls` dans la
     table). Tres peu de code pour beaucoup de rejouabilite, et elles soulagent
     au passage l'epuisement du pool : chaque joueur tire dans un pool commun
     de 64 cartes plus quatre qui n'appartiennent qu'a lui. */
  REMPART_LARGE_RADIUS: 0.4,   // +40 % de rayon
  REMPART_LARGE_TIME: 3,
  /* « Ancrage ». La competence de base SUIT desormais le tank ; cette carte lui
     rend sa version POSEE, et c'est le seul endroit du jeu ou une carte change
     la nature d'une competence au lieu d'en ajuster un chiffre. Elle existe
     parce qu'un rempart qui suit sans contrepartie est une aura permanente : le
     tank perd sa decision de placement. Rendue au sol, la zone est plus grande,
     plus longue et regenere mieux — donc le choix redevient un choix.
     Le rayon est absolu et non un multiplicateur : il remplace la valeur de
     base, il ne s'y ajoute pas. */
  ANCRAGE_RADIUS: 220,
  ANCRAGE_TIME: 12,
  ANCRAGE_SHIELD_MUL: 1.5,
  PROVOCATION_LONGUE_TIME: 2,
  PROVOCATION_LONGUE_CD: 4,
  REPRESAILLES_DAMAGE: 40,
  REPRESAILLES_RADIUS: 150,

  FAISCEAU_PIERCE: 1,          // allies traverses par le projectile de soin
  BASCULE_VIVE_RATE: 0.25,
  BASCULE_VIVE_TIME: 2,
  VAGUE_LARGE_RADIUS: 0.5,
  TRANSFUSION_RATIO: 0.30,

  SURCHARGE_LONGUE_TIME: 3,
  /* « Detonateur ». La vulnerabilite cote ENNEMI reste ce qu'elle etait : un
     minuteur absolu sur la cible (`e.vulnUntil`), lu par `_damage`. Le lot 3 a
     donne aux JOUEURS une Map d'etats complete, avec cumuls, purge et icones ;
     la porter aussi sur les 200 ennemis de l'arene aurait coute une Map par
     ennemi et par tick pour deux effets qui n'en concernent qu'une poignee.
     Ce qui a ete unifie, c'est la LECTURE : `enemyStatusMask()` dans
     `statuses.js` est la seule definition de « cet ennemi est affecte », et
     c'est elle que lit « Catalyseur ». */
  VULNERABLE_TIME: 4,
  VULNERABLE_MUL: 1.25,

  /* --- etats (lot 3) ----------------------------------------------------------
     Les deux cartes qui parlent aux etats. Elles ne les posent pas — c'est le
     travail des elites et des boss — elles changent la maniere de les subir ou
     de les exploiter, ce qui evite d'ajouter une source d'etats de plus a un
     systeme dont la mesure de reference est justement le nombre d'etats
     simultanes par joueur. */
  ANTIDOTE_REDUCTION: 0.40,  // multiplicatif par exemplaire, comme les autres reductions
  CATALYSEUR_BONUS: 0.15,    // degats en plus contre une cible affectee

  /* --- paliers hauts des familles (lot 2 du plan v2) --------------------------
     Les quatre constantes ci-dessous appartiennent aux legendaires de famille,
     seules cartes de leur famille a ne pas se resumer a un nombre. Les paliers
     0 a 2 n'ont rien a mettre ici : leur valeur EST leur effet. */
  // « Coeur de forge » : degats en plus par NIVEAU d'equipe. C'etait par vague
  // survecue ; la vague n'existe plus, et le niveau dit mieux ce que la carte
  // recompense — la carte du temps devient la carte de la progression.
  FORGE_PER_LEVEL: 0.05,
  CONSTITUTION_REGEN: 2,     // PV par seconde
  CELERITE_DASH_CD: 0.20,    // « Celerite » : reduction de recharge d'esquive
  VIF_ARGENT_DAMAGE: 45,     // trainee d'esquive, une fois par ennemi et par esquive
  VIF_ARGENT_RADIUS: 34,     // largeur de la trainee, un peu plus que le joueur

  /* --- coup critique (lot 6) --------------------------------------------------
     L'axe le plus rentable du lot, et pour une raison structurelle : il est
     MULTIPLICATIF. Il rend meilleures toutes les cartes de degats deja
     presentes au lieu de les concurrencer, la ou une quinzieme carte a +25 %
     additifs ne fait que diluer les precedentes.
     La base existe pour TOUT LE MONDE (5 %, x2) : sans elle, la premiere carte
     de chance critique ne se compare a rien et le joueur n'a aucune idee de ce
     qu'elle vaut. Le tirage se fait dans `_damage`, au point de passage unique,
     donc une nova critique autant qu'une balle. */
  CRIT_CHANCE: 0.05,
  CRIT_MUL: 2,
  CRIT_CHANCE_CAP: 0.60,     // au-dela, le critique cesse d'etre un evenement

  /* --- rayon ------------------------------------------------------------------
     Une seule cle pour une quinzaine d'effets. Les trois rayons qui sont DEJA
     des mods (rempart, vague de soin, givre) l'absorbent a la fin de
     `computeMods` : ils traversent le reseau ou servent de reference ailleurs,
     et deux endroits qui multiplient le meme rayon finissent par diverger. Les
     constantes (bombe, grenade, pulsar, onde de mort, nova, riposte) sont
     multipliees chez leur appelant. */
  SINGULARITE_PULL: 26,      // px d'aspiration vers le centre, une fois par detonation

  /* --- recharge ---------------------------------------------------------------
     Porte sur les COMPETENCES DE CLASSE (rempart, provocation, bombe, bascule,
     vague, surcharge) et pas sur l'esquive, qui a deja sa famille avec
     « Celerite » — cumuler les deux sur le meme bouton aurait rendu l'esquive
     quasi permanente. */
  FLUX_PER_KILL: 0.1,        // secondes retirees aux recharges a chaque kill

  /* --- execution --------------------------------------------------------------
     Repond a la sensation d'ennemis-eponges de fin de manche, et se marie avec
     les degats de zone qui laissent des survivants a bas PV. Jamais sur un boss
     ni sur une structure de mecanique : un seuil applique a une reserve de vie
     de boss supprimerait une barre entiere. */
  EXEC_HEAL: 1,              // PV rendus par « Moisson » a chaque execution

  /* --- conversion -------------------------------------------------------------
     Elles reglent le probleme signale des la premiere specification : une carte
     defensive donne l'impression d'un tour perdu. Avec la conversion, empiler
     du PV devient une strategie offensive assumee.
     Les deux references existent parce qu'une conversion sans echelle ne veut
     rien dire : `x % de tes PV` doit se traduire en multiplicateur de degats,
     et l'inverse en PV. La reference de degats est a 200 PV et non a 100 :
     a 100, « Fureur defensive » rendait 24 PV sur un chargement a x2,4,
     c'est-a-dire moins que Peau de titane, qui est epique elle aussi. */
  CONVERT_HP_REF: 100,       // PV de reference : le tireur nu
  CONVERT_DMG_REF: 200,      // PV rendus pour un multiplicateur de degats de 1
  BLINDAGE_OFFENSIF: 0.15,
  FUREUR_DEFENSIVE: 0.10,
  /* « Pacte de fer » : 4 % par TRANCHE de 5 points de bouclier et non par
     point. Par point, trois « Bouclier regenerant » (90 points) auraient donne
     +360 % de degats, soit quatre fois la meilleure legendaire du jeu. A cette
     tranche, un bouclier complet vaut +72 % — le prix etant qu'il ne revient
     jamais de la manche. */
  PACTE_STEP: 0.04,
  PACTE_PER: 5,

  /* --- elan et momentum -------------------------------------------------------
     Cinq cartes dont la valeur depend de l'INSTANT et non du chargement. Elles
     ne peuvent donc pas vivre dans `computeMods`, qui ne connait qu'une liste
     de cartes : elles sont relevees a chaque tick dans `_players` et
     multipliees dans `_damage`, au point de passage unique. */
  ELAN_STEP: 0.01,           // par seconde sans etre touche
  ELAN_MAX: 0.25,
  PACK_STEP: 0.03,           // par ennemi proche
  PACK_MAX: 0.30,
  PACK_RADIUS: 160,          // 8 m : la distance a laquelle on est deja au contact
  RAGE_STEP: 0.01,           // par kill
  RAGE_MAX: 30,              // cumuls
  RAGE_TIME: 4,
  ADRENALINE_HP: 0.5,        // part des PV max sous laquelle la cadence monte
  ADRENALINE_RATE: 0.25,
  SOUFFLE_HP: 0.25,
  SOUFFLE_DAMAGE: 0.80,

  /* --- troisieme competence (lot C du plan v3) --------------------------------
     Une carte accorde une TROISIEME competence, propre a la classe, declinee en
     trois paliers (rare, epique, legendaire). Le palier ne change jamais la
     nature de la competence, seulement son ampleur — sinon on ne peut pas
     apprendre a jouer avec. Les tables vivent ici et non dans SKILL_CFG, pour
     la meme raison qu'ANCRAGE_RADIUS : la competence n'existe que par sa carte,
     son reglage doit etre lisible a cote de la table qui la decrit.
     Le palier circule dans `mods.skill3` (0 = pas de carte, 1..3), et l'index
     dans ces tableaux est `palier - 1`. */
  // Jamais avant le niveau 5 : obtenue plus tot elle ecraserait le reste du
  // build. Le seuil etait la vague 4 ; le niveau 5 est le meme moment relatif
  // sur la nouvelle courbe (22 a 26 niveaux sur une manche complete).
  SKILL3_MIN_LEVEL: 5,
  SKILL3_ANCRE: [
    { r: 120, time: 4,   cd: 26, vuln: 0 },
    { r: 160, time: 5.5, cd: 22, vuln: 0 },
    { r: 200, time: 7,   cd: 18, vuln: 1 },
  ],
  SKILL3_ANCRE_SLOW: 0.40,   // vitesse RESTANTE des ennemis dans le rayon
  SKILL3_ANCRE_LEASH: 2,     // rayon de laisse, en multiples du rayon
  SKILL3_SANCTUAIRE: [
    { r: 100, time: 5, heal: 8,  cd: 30, purge: 0 },
    { r: 130, time: 7, heal: 12, cd: 26, purge: 0 },
    { r: 160, time: 9, heal: 16, cd: 22, purge: 1 },
  ],
  SKILL3_SALVE: [
    { targets: 4, mul: 0.60, cd: 20, vuln: 0 },
    { targets: 6, mul: 0.75, cd: 17, vuln: 0 },
    { targets: 8, mul: 0.90, cd: 14, vuln: 1 },
  ],
  SKILL3_SALVE_RANGE: 480,   // 24 m — un peu plus que la portee des tireurs
  SKILL3_SALVE_SPREAD: 0.7,  // demi-ouverture du cone de verrouillage, en rad
};

/* --- familles ------------------------------------------------------------------

   Une meme famille d'effet declinee sur quatre paliers de rarete. Trois
   problemes d'un coup : le pool commun se vidait en milieu de manche (quinze a
   vingt tirages), les raretes hautes n'avaient aucun equivalent « simple », et
   rien ne disait au joueur qu'il existait une version superieure de ce qu'il
   venait de prendre.

   Trois regles de tirage, toutes dans `eligibleCards` et `drawCards` :
     - jamais deux paliers de la meme famille dans le meme tirage — le palier
       superieur ecraserait toujours l'autre, et le choix serait faux ;
     - un palier superieur possede retire les paliers inferieurs du pool ;
     - les paliers se CUMULENT, ils ne se remplacent pas : c'est une
       progression, pas un echange. */
/* --- categories ----------------------------------------------------------------

   NE PAS CONFONDRE AVEC LES FAMILLES. Une famille est un axe decline sur quatre
   paliers de rarete, et elle ne concerne que vingt cartes : c'est une regle de
   TIRAGE. Une categorie couvre le catalogue entier et ne sert qu'a l'affichage :
   elle dit a quel rayon du magasin la carte se trouve.

   Ce qui manquait a l'ecran de choix, ce n'est pas l'effet — il est ecrit en
   gros — c'est « qu'est-ce que j'ai deja empile ». Un joueur qui a pris six
   cartes offensives et zero defensive ne s'en apercoit pas : chaque tirage se
   lit isolement, et la build se construit par accident. La categorie plus le
   RANG (« 3ᵉ carte de zone ») rendent le choix decidable en une seconde.

   Tableau ORDONNE comme les autres, mais l'index NE CIRCULE PAS : les cartes
   voyagent par identifiant de chaine, et la categorie se deduit localement de la
   table. On peut donc en inserer une au milieu sans rien reecrire.
   `CARD_CATEGORY_COLOR` vit dans `palette.js` : c'est la charte qui tient les
   couleurs, ici on ne garde que les libelles. */
/* `label` nomme la categorie, `rang` compose la phrase du rang. Deux champs et
   non un seul parce que « 4ᵉ carte de offensif » ne se lit pas : ce sont des
   chaines vues par le joueur, elles s'accordent. Composer la phrase ici plutot
   que dans le client est la meme regle que partout — le formatage vit a cote de
   la table, et deux clients ne peuvent pas diverger dessus. */
export const CATEGORIES = [
  { id: "off",     label: "offensif",   rang: "carte offensive" },
  { id: "def",     label: "défensif",   rang: "carte défensive" },
  { id: "soutien", label: "soutien",    rang: "carte de soutien" },
  { id: "zone",    label: "zone",       rang: "carte de zone" },
  { id: "util",    label: "utilitaire", rang: "carte utilitaire" },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const CATEGORY_RANG = Object.fromEntries(CATEGORIES.map(c => [c.id, c.rang]));

/* Categorie d'une carte. Point de passage UNIQUE, et DEDUITE des tags plutot
   qu'ecrite cent six fois : les tags existent deja, ils sont deja tenus a jour
   (« Resonance » compte `cadence`, `Symbiose` compte `def`), et un second champ
   a recopier sur tout le catalogue aurait divergé du premier des la carte
   suivante. Seul `cat` explicite passe devant — c'est ce qui sort les cartes de
   ZONE, que les tags ne savent pas nommer.

   L'ORDRE DE PRIORITE compte, et il n'est pas arbitraire : une carte cooperative
   est d'abord du soutien meme si elle protege (« Rempart élargi » porte def et
   coop), et une carte qui touche aux degats est offensive meme si elle donne
   aussi des PV (« Lest »). Autrement dit, on nomme la carte par ce qui la rend
   remarquable, pas par sa premiere lettre de tag. */
export function cardCategory(card) {
  if (!card) return "util";
  if (card.cat) return card.cat;
  const t = card.tags ?? [];
  if (t.includes("coop")) return "soutien";
  if (t.includes("off")) return "off";
  if (t.includes("def")) return "def";
  return "util";
}

/* Exemplaires possedes dans une categorie, toutes cartes confondues. C'est le
   chiffre du rang, et il compte les EXEMPLAIRES et non les cartes distinctes :
   quatre Affutage, c'est bien quatre cartes offensives dans la build. */
export function categoryCount(owned, cat) {
  let n = 0;
  for (const [id, k] of owned) {
    if (k > 0 && cardCategory(CARD_BY_ID.get(id)) === cat) n += k;
  }
  return n;
}

export const FAMILY_LABEL = {
  degats: "dégâts",
  cadence: "cadence",
  survie: "survie",
  mobilite: "mobilité",
  soutien: "soutien",
};
export const FAMILY_TIERS = 4;

/* --- affichage des cumuls -----------------------------------------------------

   `stack(n)` rend la valeur TOTALE a n exemplaires, et rien d'autre : la ligne
   `desc` dit deja de quelle statistique il s'agit, le client compose
   « possédée 2 / 6 · +24 % → +36 % » a partir des deux. Sans ce champ, un
   joueur qui a deux Affutage lit « +12 % de dégâts » et ne sait ni ce qu'il a
   deja, ni ce que la carte lui fera au total — c'est exactement le moment ou il
   faut comparer une troisieme carte de degats a une premiere defensive.

   Le champ est OPTIONNEL : une carte a exemplaire unique n'a pas de cumul a
   afficher, et une carte dont l'effet ne se resume pas a un nombre (Second
   souffle, Carapace) n'en gagnerait rien.

   Trois helpers plutot qu'un seul parce que les gains additifs, les reductions
   multiplicatives et les surcouts multiplicatifs ne se resument pas pareil —
   melanger les conventions ici redirait exactement le mensonge que
   `computeMods` prend soin d'eviter dans le calcul.
   ------------------------------------------------------------------------- */

// Virgule et non point : ce sont des chaines affichees au joueur.
const num = v => String(Math.round(v * 10) / 10).replace(".", ",");
const pctAdd = (step, n) => `+${num(step * n * 100)} %`;
const pctCut = (keep, n) => `−${num((1 - Math.pow(keep, n)) * 100)} %`;
const pctUp  = (mul, n) => `+${num((Math.pow(mul, n) - 1) * 100)} %`;
const plur = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/* Descriptions de la troisieme competence (lot C). Composees depuis les tables
   de CARD_CFG et non recopiees — meme regle que fmtM partout ailleurs : un
   texte qui recopie une constante ment des le premier reglage. Le suffixe
   propre au palier legendaire (Vulnerabilite, purge) est ajoute a la main dans
   la carte : c'est un EFFET en plus, pas un chiffre de la table. */
const skill3Ancre = t => {
  const c = CARD_CFG.SKILL3_ANCRE[t];
  return `3ᵉ compétence (touche 3) : ancre au sol de ${fmtM(c.r)} pendant ${num(c.time)} s — `
    + `ennemis ralentis à ${num(CARD_CFG.SKILL3_ANCRE_SLOW * 100)} % et retenus dans le double du rayon`;
};
const skill3Sanctuaire = t => {
  const c = CARD_CFG.SKILL3_SANCTUAIRE[t];
  return `3ᵉ compétence (touche 3) : dôme de ${fmtM(c.r)} pendant ${num(c.time)} s — `
    + `${c.heal} PV/s à l'intérieur, les projectiles ennemis qui entrent sont détruits`;
};
const skill3Salve = t => {
  const c = CARD_CFG.SKILL3_SALVE[t];
  return `3ᵉ compétence (touche 3) : verrouille ${c.targets} ennemis dans un cône de ${fmtM(CARD_CFG.SKILL3_SALVE_RANGE)} `
    + `et les touche à coup sûr, ${num(c.mul * 100)} % de dégâts par cible`;
};

/* --- la table -----------------------------------------------------------------

   `apply(m, n)` recoit l'objet mods en construction et le nombre d'exemplaires
   possedes. Les gains sont additifs sur un multiplicateur (`1 + Σ`), les
   reductions multiplicatives (`Π`) et plafonnees a la fin par `computeMods`.
   Melanger les deux conventions rend le boss inequilibrable : quatre cartes a
   -25 % additives donnent zero.
   ------------------------------------------------------------------------- */

export const CARDS = [
  /* --- communes : petits gains, toujours utiles, jamais decisifs. Ce sont
     elles qui remplissent les tirages et rendent les autres remarquables. --- */
  {
    // Le tag « cadence » n'est pas decoratif : « Resonance » compte les cartes
    // qui le portent. Une carte qui rallonge l'intervalle (Balles lourdes) ne
    // le porte donc pas, meme si elle touche la meme statistique.
    id: "ressort", nom: "Ressort de détente", rarity: 0, max: 5, tags: ["off", "cadence"],
    desc: "−8 % d'intervalle de tir",
    stack: n => pctCut(0.92, n),
    apply(m, n) { m.fireIntervalMul *= Math.pow(0.92, n); },
  },
  {
    id: "blindage", nom: "Plaque de blindage", rarity: 0, max: 5, tags: ["def"],
    desc: "+20 PV max, soigne d'autant",
    stack: n => `+${20 * n} PV`,
    apply(m, n) { m.maxHpBonus += 20 * n; },
  },
  {
    id: "poudre", nom: "Poudre dense", rarity: 0, max: 3, tags: ["off"],
    desc: "+12 % de vitesse des balles",
    stack: n => pctAdd(0.12, n),
    apply(m, n) { m.bulletSpeedMul += 0.12 * n; },
  },
  {
    id: "canonLong", nom: "Canon long", rarity: 0, max: 3, tags: ["off"],
    desc: "+25 % de portée",
    stack: n => pctAdd(0.25, n),
    apply(m, n) { m.bulletLifeMul += 0.25 * n; },
  },
  {
    id: "trousse", nom: "Trousse de secours", rarity: 0, max: 3, tags: ["coop"],
    family: "soutien", tier: 0,
    desc: "réanimation 25 % plus rapide",
    stack: n => pctAdd(0.25, n),
    apply(m, n) { m.reviveSpeedMul += 0.25 * n; },
  },
  {
    id: "convalescence", nom: "Convalescence", rarity: 0, max: 3, tags: ["def"],
    desc: "+8 PV rendus à chaque boss tué",
    stack: n => `+${8 * n} PV`,
    apply(m, n) { m.healPerBoss += 8 * n; },
  },
  {
    id: "poches", nom: "Poches larges", rarity: 0, max: 1, tags: ["def"],
    desc: `ramasse les bonus au sol à ${fmtM(120)}`,
    apply(m) { m.pickupRadius = Math.max(m.pickupRadius, 120); },
  },
  {
    id: "bourse", nom: "Bourse", rarity: 0, max: 3, tags: [],
    desc: "+20 % de score gagné",
    stack: n => pctAdd(0.20, n),
    apply(m, n) { m.scoreMul += 0.20 * n; },
  },

  /* Quatre communes de plus, avec des plafonds hauts (5 a 6 la ou les
     anciennes sont a 3 ou 4). Le pool est desormais sollicite quatre fois plus
     — quinze a vingt tirages au lieu de quatre — et les raretes basses se
     vidaient en milieu de manche, ce qui faisait remonter mecaniquement les
     epiques et les legendaires par simple epuisement. */
  {
    id: "culasse", nom: "Culasse allégée", rarity: 0, max: 6, tags: ["off", "cadence"],
    family: "cadence", tier: 0,
    desc: "−7 % d'intervalle de tir",
    stack: n => pctCut(0.93, n),
    apply(m, n) { m.fireIntervalMul *= Math.pow(0.93, n); },
  },
  {
    id: "plaquage", nom: "Plaquage", rarity: 0, max: 6, tags: ["def"],
    family: "survie", tier: 0,
    desc: "+18 PV max, soigne d'autant",
    stack: n => `+${18 * n} PV`,
    apply(m, n) { m.maxHpBonus += 18 * n; },
  },
  {
    id: "affutage", nom: "Affûtage", rarity: 0, max: 6, tags: ["off"],
    family: "degats", tier: 0,
    desc: "+12 % de dégâts",
    stack: n => pctAdd(0.12, n),
    apply(m, n) { m.damageMul += 0.12 * n; },
  },
  {
    id: "foulee", nom: "Foulée", rarity: 0, max: 5, tags: ["def"],
    family: "mobilite", tier: 0,
    desc: "+7 % de vitesse de déplacement",
    stack: n => pctAdd(0.07, n),
    apply(m, n) { m.speedMul += 0.07 * n; },
  },

  /* Huit communes de plus (lot 6). Le catalogue en comptait TREIZE pour vingt-
     sept rares, alors que les communes sortent six fois plus souvent : sur une
     partie a quinze ou vingt tirages, le joueur revoyait les memes treize en
     boucle, dont plusieurs plafonnees donc retirees du pool en cours de route.
     Quatre d'entre elles ouvrent un axe nouveau (critique, rayon, recharge,
     elan) et quatre sont de pur remplissage a deux petites statistiques : une
     commune ne doit jamais etre un choix, seulement un gain. */
  {
    id: "precision", nom: "Précision", rarity: 0, max: 3, tags: ["off"],
    desc: "+6 % de chance de coup critique",
    stack: n => pctAdd(0.06, n),
    apply(m, n) { m.critChance += 0.06 * n; },
  },
  {
    id: "expansion", nom: "Expansion", rarity: 0, max: 4, tags: ["off"], cat: "zone",
    desc: "+8 % de rayon sur tes explosions, ondes et auras",
    stack: n => pctAdd(0.08, n),
    apply(m, n) { m.areaMul += 0.08 * n; },
  },
  {
    id: "condensateur", nom: "Condensateur", rarity: 0, max: 5, tags: ["def"],
    desc: "−7 % de recharge des compétences",
    stack: n => pctCut(0.93, n),
    apply(m, n) { m.skillCdMul *= Math.pow(0.93, n); },
  },
  {
    /* Elle recompense de ne pas etre touche, ce qu'aucune carte ne faisait :
       tout le reste du pool recompense d'encaisser ou de tuer. Remise a zero
       dans `_hurt`, au point de passage unique. */
    id: "elan", nom: "Élan", rarity: 0, max: 3, tags: ["off"],
    desc: "+1 % de dégâts par seconde sans être touché, jusqu'à +25 %",
    stack: n => `jusqu'à ${pctAdd(CARD_CFG.ELAN_MAX, n)}`,
    apply(m, n) { m.elanStep += CARD_CFG.ELAN_STEP * n; m.elanMax += CARD_CFG.ELAN_MAX * n; },
  },
  {
    id: "lest", nom: "Lest", rarity: 0, max: 5, tags: ["off", "def"],
    desc: "+5 % de dégâts et +5 % de PV max",
    stack: n => `${pctAdd(0.05, n)} de dégâts, +${5 * n} % de PV`,
    apply(m, n) { m.damageMul += 0.05 * n; m.maxHpRatio += 0.05 * n; },
  },
  {
    id: "rodage", nom: "Rodage", rarity: 0, max: 5, tags: ["def"],
    desc: "−5 % de recharge des compétences et +5 % de vitesse",
    stack: n => `${pctCut(0.95, n)} de recharge, ${pctAdd(0.05, n)} de vitesse`,
    apply(m, n) { m.skillCdMul *= Math.pow(0.95, n); m.speedMul += 0.05 * n; },
  },
  {
    id: "chargeur_long", nom: "Chargeur long", rarity: 0, max: 4, tags: ["off"],
    desc: "+10 % de portée et +8 % de vitesse des balles",
    stack: n => `${pctAdd(0.10, n)} de portée, ${pctAdd(0.08, n)} de vitesse`,
    apply(m, n) { m.bulletLifeMul += 0.10 * n; m.bulletSpeedMul += 0.08 * n; },
  },
  {
    id: "ferraille", nom: "Ferraille", rarity: 0, max: 4, tags: [],
    desc: "+12 % de score et +1 PV par ennemi tué",
    stack: n => `${pctAdd(0.12, n)} de score, +${n} PV par kill`,
    apply(m, n) { m.scoreMul += 0.12 * n; m.hpPerKill += n; },
  },

  /* Quatre communes de plus que les huit du plan, et pas du remplissage : les
     huit premieres portaient le compte a 21 pour 27 rares, et la MESURE donnait
     12,8 communes distinctes vues par manche contre les 15 demandes — le pool
     de rarete basse se vide toujours en milieu de manche. Chacune de ces quatre
     comble en plus un TROU reel du catalogue : quatre systemes n'avaient aucune
     entree commune, et un joueur devait donc attendre une rare pour decouvrir
     qu'ils existent. */
  {
    id: "reserve", nom: "Réserve", rarity: 0, max: 4, tags: ["def"],
    desc: "12 points de bouclier, se recharge après 6 s sans dégât subi",
    stack: n => `${12 * n} points`,
    apply(m, n) { m.shieldPool += 12 * n; },
  },
  {
    id: "braises", nom: "Braises", rarity: 0, max: 3, tags: ["off"],
    desc: "brûlure : 3 dégâts sur 3 s",
    stack: n => `${3 * n} dégâts`,
    apply(m, n) { m.burnDmg += 3 * n; },
  },
  {
    id: "sangles", nom: "Sangles", rarity: 0, max: 4, tags: ["def"],
    desc: "−4 % de dégâts subis",
    stack: n => pctCut(0.96, n),
    apply(m, n) { m.damageTakenMul *= Math.pow(0.96, n); },
  },
  {
    id: "stimulant", nom: "Stimulant", rarity: 0, max: 4, tags: ["def"],
    desc: "−8 % de recharge d'esquive",
    stack: n => pctCut(0.92, n),
    apply(m, n) { m.dashCdMul *= Math.pow(0.92, n); },
  },

  /* --- rares : elles modifient une mecanique plutot qu'un nombre. La plupart
     reutilisent un systeme deja present (perforant, ricochet, tourelle,
     bouclier), ce qui les rend lisibles sans explication. --- */

  /* Paliers 1 des familles. Elles etaient communes avant le lot 2 : une famille
     qui commence en commune et finit en legendaire doit occuper les quatre
     paliers, sinon la rarete cesse de dire quoi que ce soit de la puissance. Le
     gain a ete releve en consequence — un palier superieur qui rend moins que
     deux exemplaires du palier inferieur n'est pas une progression. */
  {
    id: "calibre", nom: "Calibre supérieur", rarity: 1, max: 4, tags: ["off"],
    family: "degats", tier: 1,
    desc: "+25 % de dégâts",
    stack: n => pctAdd(0.25, n),
    apply(m, n) { m.damageMul += 0.25 * n; },
  },
  {
    id: "semelles", nom: "Semelles légères", rarity: 1, max: 3, tags: ["def"],
    family: "mobilite", tier: 1,
    desc: "+14 % de vitesse de déplacement",
    stack: n => pctAdd(0.14, n),
    apply(m, n) { m.speedMul += 0.14 * n; },
  },
  {
    id: "cuir", nom: "Cuir épais", rarity: 1, max: 4, tags: ["def"],
    family: "survie", tier: 1,
    desc: "−10 % de dégâts subis",
    stack: n => pctCut(0.9, n),
    apply(m, n) { m.damageTakenMul *= Math.pow(0.9, n); },
  },

  {
    id: "perforation", nom: "Perforation", rarity: 1, max: 2, tags: ["off"],
    desc: "les balles traversent 1 ennemi de plus",
    stack: n => `${plur(n, "ennemi")} de plus`,
    apply(m, n) { m.pierce += n; },
  },
  {
    id: "secondCanon", nom: "Second canon", rarity: 1, max: 2, tags: ["off"],
    desc: "+1 balle en éventail, −18 % de dégâts par balle",
    stack: n => `+${plur(n, "balle")}, ${pctCut(0.82, n)} par balle`,
    apply(m, n) { m.extraBarrels += n; m.barrelDamageMul *= Math.pow(0.82, n); },
  },
  {
    id: "bouclierRegen", nom: "Bouclier régénérant", rarity: 1, max: 3, tags: ["def"],
    desc: "30 points de bouclier, se recharge après 6 s sans dégât subi",
    stack: n => `${30 * n} points`,
    apply(m, n) { m.shieldPool += 30 * n; },
  },
  {
    id: "vampirisme", nom: "Vampirisme", rarity: 1, max: 3, tags: ["def"],
    desc: "2 % des dégâts infligés rendus en PV (max 3 PV/s)",
    stack: n => `${num(2 * n)} %`,
    apply(m, n) { m.lifesteal += 0.02 * n; },
  },
  {
    id: "incendiaire", nom: "Munitions incendiaires", rarity: 1, max: 2, tags: ["off"],
    desc: "brûlure : 8 dégâts sur 3 s",
    stack: n => `${8 * n} dégâts`,
    apply(m, n) { m.burnDmg += 8 * n; },
  },
  {
    id: "ricochet", nom: "Ricochet", rarity: 1, max: 2, tags: ["off"],
    desc: "à la mort d'un ennemi, la balle rebondit une fois",
    stack: n => `${plur(n, "rebond")}`,
    apply(m, n) { m.chain += n; },
  },
  {
    id: "secondSouffle", nom: "Second souffle", rarity: 1, max: 1, tags: ["def"],
    desc: "la première mise à terre de la manche se relève seule à 30 PV",
    apply(m) { m.selfRevive = 1; },
  },
  {
    /* Carte cooperative. Le petit bonus personnel n'est pas decoratif : sans
       lui, personne ne la prend au premier boss quand tout va bien, et elle ne
       sort plus jamais du tirage utile. */
    id: "reanimateur", nom: "Réanimateur", rarity: 1, max: 1, tags: ["coop"],
    family: "soutien", tier: 1,
    desc: "rayon de réanimation ×1,6, relève à 70 % des PV, +10 PV max",
    apply(m) { m.reviveRadiusMul += 0.6; m.reviveHpRatio = Math.max(m.reviveHpRatio, 0.7); m.maxHpBonus += 10; },
  },
  {
    id: "contreAttaque", nom: "Contre-attaque", rarity: 1, max: 2, tags: ["def"], cat: "zone",
    desc: `encaisser déclenche une nova de 60 dégâts sur ${fmtM(CARD_CFG.COUNTER_RADIUS)} (recharge 3 s)`,
    stack: n => `${60 * n} dégâts`,
    apply(m, n) { m.counterNova += 60 * n; },
  },
  {
    id: "cadence", nom: "Cadence accélérée", rarity: 1, max: 3, tags: ["off", "cadence"],
    family: "cadence", tier: 1,
    // −16 % et non −18 : le palier 2 de la famille (Rotative, −28 %) doit rester
    // nettement au-dessus de lui, sans quoi la progression ne se sent pas.
    desc: "−16 % d'intervalle de tir",
    stack: n => pctCut(0.84, n),
    apply(m, n) { m.fireIntervalMul *= Math.pow(0.84, n); },
  },
  {
    id: "ballesLourdes", nom: "Balles lourdes", rarity: 1, max: 2, tags: ["off"],
    desc: "+35 % de dégâts, −20 % de cadence",
    stack: n => `${pctAdd(0.35, n)} de dégâts, ${pctUp(1.25, n)} d'intervalle`,
    apply(m, n) { m.damageMul += 0.35 * n; m.fireIntervalMul *= Math.pow(1.25, n); },
  },
  {
    id: "talon", nom: "Talon de fer", rarity: 1, max: 1, tags: ["def"],
    desc: "immunité aux zones pendant 1,5 s après en avoir subi une",
    apply(m) { m.zoneImmunity = CARD_CFG.ZONE_IMMUNITY; },
  },
  {
    /* Elle raccourcit les etats SUBIS, elle n'en purge aucun : une carte qui
       purgerait aurait fait du soigneur un role optionnel, ce que tout le lot 3
       cherche a eviter. Elle rend la Sentence survivable sans soin a plein —
       huit secondes deviennent moins de cinq — mais ne la retire pas. */
    id: "antidote", nom: "Antidote", rarity: 1, max: 2, tags: ["def"],
    desc: "les états durent 40 % moins longtemps sur soi",
    stack: n => pctCut(1 - CARD_CFG.ANTIDOTE_REDUCTION, n),
    apply(m, n) { m.statusTimeMul *= Math.pow(1 - CARD_CFG.ANTIDOTE_REDUCTION, n); },
  },
  {
    id: "tourelleAppui", nom: "Tourelle d'appui", rarity: 1, max: 2, tags: ["off"],
    desc: "pose une tourelle automatique toutes les 45 s",
    // Deux exemplaires ne posent pas deux tourelles : ils divisent l'attente.
    stack: n => `toutes les ${num(CARD_CFG.AUTO_TURRET_CD / n)} s`,
    apply(m, n) { m.autoTurretCd = CARD_CFG.AUTO_TURRET_CD / n; },
  },

  /* --- rares du lot 6 : les paliers moyens des cinq axes nouveaux ------------- */
  {
    id: "mire", nom: "Mire", rarity: 1, max: 2, tags: ["off"],
    desc: "+12 % de chance de coup critique",
    stack: n => pctAdd(0.12, n),
    apply(m, n) { m.critChance += 0.12 * n; },
  },
  {
    /* L'autre moitie de l'axe. Seule elle ne vaut rien — 5 % de chance de base
       sur un x2,4 au lieu d'un x2 — et c'est voulu : c'est ce qui fait du
       critique un axe a construire et non une statistique de plus. */
    id: "talon_faible", nom: "Talon faible", rarity: 1, max: 2, tags: ["off"],
    desc: "+40 % de dégâts critiques",
    stack: n => pctAdd(0.40, n),
    effective: (ctx, n) =>
      `critique actuellement ×${num(CARD_CFG.CRIT_MUL + 0.4 * n)}`,
    apply(m, n) { m.critMul += 0.40 * n; },
  },
  {
    id: "deflagration", nom: "Déflagration", rarity: 1, max: 3, tags: ["off"], cat: "zone",
    desc: "+20 % de rayon sur tes explosions, ondes et auras",
    stack: n => pctAdd(0.20, n),
    apply(m, n) { m.areaMul += 0.20 * n; },
  },
  {
    id: "surtension", nom: "Surtension", rarity: 1, max: 3, tags: ["def"],
    desc: "−15 % de recharge des compétences",
    stack: n => pctCut(0.85, n),
    apply(m, n) { m.skillCdMul *= Math.pow(0.85, n); },
  },
  {
    id: "achevement", nom: "Achèvement", rarity: 1, max: 2, tags: ["off"],
    desc: "les ennemis sous 12 % de PV meurent instantanément",
    stack: n => `sous ${num(12 + 4 * (n - 1))} %`,
    // Le seuil ne se cumule pas en s'additionnant tout droit : deux exemplaires
    // a +12 % auraient supprime le dernier quart de la barre de tous les elites.
    apply(m, n) { m.execThreshold = Math.max(m.execThreshold, 0.12 + 0.04 * (n - 1)); },
  },
  {
    /* Celle qui change le plus la facon de jouer : elle recompense de rester au
       contact, alors que tout le reste du jeu pousse a reculer. */
    id: "meute", nom: "Meute", rarity: 1, max: 2, tags: ["off"],
    desc: `+3 % de dégâts par ennemi à moins de ${fmtM(CARD_CFG.PACK_RADIUS)}, jusqu'à +30 %`,
    stack: n => `jusqu'à ${pctAdd(CARD_CFG.PACK_MAX, n)}`,
    apply(m, n) { m.packStep += CARD_CFG.PACK_STEP * n; m.packMax += CARD_CFG.PACK_MAX * n; },
  },
  {
    id: "carnage", nom: "Carnage", rarity: 1, max: 2, tags: ["off"],
    desc: "chaque ennemi tué donne +1 % de dégâts pendant 4 s, jusqu'à 30 fois",
    stack: n => `jusqu'à ${pctAdd(CARD_CFG.RAGE_STEP * CARD_CFG.RAGE_MAX, n)}`,
    apply(m, n) { m.ragePerKill += CARD_CFG.RAGE_STEP * n; },
  },
  {
    id: "adrenaline", nom: "Adrénaline", rarity: 1, max: 2, tags: ["off", "cadence"],
    desc: "+25 % de cadence sous 50 % de PV",
    stack: n => pctAdd(CARD_CFG.ADRENALINE_RATE, n),
    apply(m, n) { m.lowHpRate += CARD_CFG.ADRENALINE_RATE * n; },
  },

  /* --- rares conditionnelles ---------------------------------------------------

     Elles ne valent rien seules et beaucoup combinees. C'est ce qui manquait au
     pool : quinze cartes purement additives ne se combinent pas, elles
     s'additionnent, et le tirage cesse d'etre une decision des qu'on sait
     laquelle a le plus gros nombre. Leur valeur se calcule dans une SECONDE
     passe (`applyAfter`), parce qu'elle depend du reste du chargement — voir
     computeMods. --- */
  {
    id: "symbiose", nom: "Symbiose", rarity: 1, max: 2, tags: ["off"],
    desc: "+5 % de dégâts par carte défensive possédée",
    /* `effective` rend ce que la carte vaudrait A L'INSTANT DU TIRAGE, avec le
       chargement actuel. Sans lui, une conditionnelle est impossible a evaluer
       en trente secondes et personne ne la prend — ce qui vide de son sens la
       moitie du travail d'equilibrage sur ces cartes. */
    effective: (ctx, n) =>
      `${plur(ctx.defensive, "carte")} défensive${ctx.defensive > 1 ? "s" : ""}`
      + ` — actuellement ${pctAdd(CARD_CFG.SYMBIOSE_STEP * ctx.defensive, n)} de dégâts`,
    apply() {},
    applyAfter(m, n, ctx) { m.damageMul += CARD_CFG.SYMBIOSE_STEP * n * ctx.defensive; },
  },
  {
    /* Se desamorce elle-meme : prendre une epique annule le bonus. Le joueur
       qui la garde active refuse donc des cartes, ce qui est le seul moyen
       qu'on ait trouve de rendre un choix couteux sans le rendre mauvais. */
    id: "austerite", nom: "Austérité", rarity: 1, max: 1, tags: ["off"],
    desc: "+30 % de dégâts tant qu'aucune épique ni légendaire n'est prise",
    effective: ctx => ctx.topRarity < RARITY.EPIQUE
      ? `aucune épique ni légendaire possédée — actuellement +30 % de dégâts`
      : `une ${RARITY_LABEL[ctx.topRarity]} est déjà prise — actuellement sans effet`,
    apply() {},
    applyAfter(m, n, ctx) {
      if (ctx.topRarity < RARITY.EPIQUE) m.damageMul += CARD_CFG.AUSTERITE_BONUS;
    },
  },
  {
    id: "surcharge_orbitale", nom: "Surcharge orbitale", rarity: 1, max: 2, tags: ["off"],
    desc: "+60 % aux dégâts des lames orbitales",
    stack: n => pctAdd(0.60, n),
    apply(m, n) { m.orbiterDamageMul += 0.60 * n; },
  },
  {
    id: "munition_dense", nom: "Munition dense", rarity: 1, max: 2, tags: ["off"],
    desc: "+40 % de dégâts, −25 % de vitesse des balles",
    stack: n => `${pctAdd(0.40, n)} de dégâts, −${num(25 * n)} % de vitesse`,
    apply(m, n) { m.damageMul += 0.40 * n; m.bulletSpeedMul -= 0.25 * n; },
  },

  /* --- epiques : elles definissent une orientation de build. C'est le premier
     palier ou deux joueurs de la meme table ne jouent plus le meme jeu. --- */
  {
    id: "orbiteurs", nom: "Orbiteurs", rarity: 2, max: 3, tags: ["off"],
    desc: `2 lames tournantes à ${fmtM(CARD_CFG.ORBIT_RADIUS)}, 25 dégâts au contact`,
    stack: n => `${plur(2 * n, "lame")}`,
    apply(m, n) { m.orbiters += 2 * n; },
  },
  {
    id: "salveArriere", nom: "Salve arrière", rarity: 2, max: 1, tags: ["off"],
    desc: "chaque tir envoie aussi une balle à 180°, dégâts à 70 %",
    apply(m) { m.backShot = 1; },
  },
  {
    id: "foudre", nom: "Chaîne de foudre", rarity: 2, max: 2, tags: ["off"],
    desc: "15 % de chance qu'un impact arce sur 3 ennemis",
    stack: n => `${num(15 * n)} %`,
    apply(m, n) { m.chainChance += 0.15 * n; },
  },
  {
    id: "pulsar", nom: "Pulsar", rarity: 2, max: 2, tags: ["off"], cat: "zone",
    desc: `toutes les 12 s, onde automatique de 90 dégâts sur ${fmtM(CARD_CFG.PULSAR_RADIUS)}`,
    stack: n => `toutes les ${num(12 / n)} s`,
    apply(m, n) { m.pulsarCd = 12 / n; },
  },
  {
    id: "drone", nom: "Drone de soutien", rarity: 2, max: 2, tags: ["off"],
    desc: "un drone vous suit et tire seul à 60 % de vos dégâts",
    stack: n => `${plur(n, "drone")}`,
    apply(m, n) { m.drones += n; },
  },
  {
    id: "titane", nom: "Peau de titane", rarity: 2, max: 2, tags: ["def"],
    family: "survie", tier: 2,
    desc: "+40 PV max, −6 % de vitesse",
    stack: n => `+${40 * n} PV, −${num(6 * n)} % de vitesse`,
    apply(m, n) { m.maxHpBonus += 40 * n; m.speedMul -= 0.06 * n; },
  },

  /* Paliers 2 des familles. Ils restent des NOMBRES la ou les autres epiques
     changent une regle : c'est exactement leur role, offrir a chaque rarete un
     equivalent « simple » que le joueur sait evaluer sans lire trois lignes.
     Une famille dont le palier epique demanderait une explication ne servirait
     plus de repere de progression. */
  {
    id: "canon_surdimensionne", nom: "Canon surdimensionné", rarity: 2, max: 2, tags: ["off"],
    family: "degats", tier: 2,
    desc: "+45 % de dégâts",
    stack: n => pctAdd(0.45, n),
    apply(m, n) { m.damageMul += 0.45 * n; },
  },
  {
    id: "rotative", nom: "Rotative", rarity: 2, max: 2, tags: ["off", "cadence"],
    family: "cadence", tier: 2,
    desc: "−28 % d'intervalle de tir",
    stack: n => pctCut(0.72, n),
    apply(m, n) { m.fireIntervalMul *= Math.pow(0.72, n); },
  },
  {
    id: "celerite", nom: "Célérité", rarity: 2, max: 2, tags: ["def"],
    family: "mobilite", tier: 2,
    desc: "+22 % de vitesse, −20 % de recharge d'esquive",
    stack: n => `${pctAdd(0.22, n)} de vitesse, ${pctCut(1 - CARD_CFG.CELERITE_DASH_CD, n)} de recharge`,
    apply(m, n) {
      m.speedMul += 0.22 * n;
      m.dashCdMul *= Math.pow(1 - CARD_CFG.CELERITE_DASH_CD, n);
    },
  },
  {
    /* Elle passe de legendaire a epique : elle est le palier 2 de la famille
       soutien, et une legendaire de soutien existe desormais au-dessus d'elle.
       Son effet n'a pas bouge — c'est sa place dans l'echelle qui change. */
    id: "angeGardien", nom: "Ange gardien", rarity: 2, max: 1, tags: ["coop"],
    family: "soutien", tier: 2,
    desc: `un allié qui tombe à moins de ${fmtM(CARD_CFG.GUARDIAN_RADIUS)} est relevé instantanément (60 s)`,
    apply(m) { m.guardianCd = CARD_CFG.GUARDIAN_CD; },
  },
  {
    id: "frenesie", nom: "Frénésie", rarity: 2, max: 1, tags: ["off"],
    desc: "chaque kill donne +2 % de cadence, jusqu'à +60 %",
    apply(m) { m.frenzy = 1; },
  },
  {
    id: "givre", nom: "Champ de givre", rarity: 2, max: 2, tags: ["def"], cat: "zone",
    desc: `aura de ${fmtM(160)}, ennemis à 65 % de vitesse`,
    stack: n => `aura de ${fmtM(160 * (1 + 0.35 * (n - 1)))}`,
    apply(m, n) { m.frostRadius = Math.max(m.frostRadius, 160 * (1 + 0.35 * (n - 1))); },
  },
  {
    id: "recolte", nom: "Récolte", rarity: 2, max: 2, tags: ["def"],
    desc: "8 % des ennemis tués laissent un fragment de 5 PV",
    stack: n => `${num(8 * n)} %`,
    apply(m, n) { m.harvest += 0.08 * n; },
  },
  {
    id: "ondeMort", nom: "Onde de mort", rarity: 2, max: 2, tags: ["off"], cat: "zone",
    desc: `tuer un ennemi déclenche 25 dégâts sur ${fmtM(CARD_CFG.DEATHWAVE_RADIUS)} autour de lui`,
    stack: n => `${25 * n} dégâts`,
    apply(m, n) { m.deathWave += 25 * n; },
  },
  {
    /* Conditionnelle sans etre calculee dans la seconde passe : sa condition ne
       porte pas sur le chargement mais sur la CIBLE, elle se lit donc dans
       `_damage`. Elle recompense les cartes qui affligent (incendiaire,
       Detonateur) et le combat contre un boss qui pose des etats — d'ou son
       palier epique : seule, elle ne vaut rien. */
    id: "catalyseur", nom: "Catalyseur", rarity: 2, max: 2, tags: ["off"],
    desc: "+15 % de dégâts contre un ennemi affecté par un état",
    stack: n => pctAdd(CARD_CFG.CATALYSEUR_BONUS, n),
    /* Conditionnelle, mais sa condition porte sur la CIBLE et non sur le
       chargement : elle ne peut pas s'evaluer au tirage, le seul service qu'on
       puisse rendre au joueur est de lui rappeler d'ou viennent les etats. */
    effective: () => "n'agit que sur une cible brûlée, gelée ou vulnérable",
    apply(m, n) { m.catalyseur += CARD_CFG.CATALYSEUR_BONUS * n; },
  },

  /* --- epiques du lot 6 : sommets des axes nouveaux, et les conversions ------- */
  {
    id: "oeil_de_faucon", nom: "Œil de faucon", rarity: 2, max: 1, tags: ["off"],
    desc: "+20 % de chance et +50 % de dégâts critiques",
    stack: n => `${pctAdd(0.20, n)} de chance, ${pctAdd(0.50, n)} de dégâts`,
    apply(m, n) { m.critChance += 0.20 * n; m.critMul += 0.50 * n; },
  },
  {
    id: "singularite", nom: "Singularité", rarity: 2, max: 1, tags: ["off"], cat: "zone",
    desc: "+35 % de rayon, et tes explosions aspirent les ennemis vers leur centre",
    apply(m) { m.areaMul += 0.35; m.areaPull = 1; },
  },
  {
    /* Elle lie enfin les competences au rythme de la vague : la recharge ne
       descend plus toute seule dans le vide, elle descend parce qu'on tue. */
    id: "flux_continu", nom: "Flux continu", rarity: 2, max: 1, tags: ["def"],
    desc: "−25 % de recharge des compétences, et chaque kill en retire 0,1 s",
    apply(m) { m.skillCdMul *= 0.75; m.cdPerKill += CARD_CFG.FLUX_PER_KILL; },
  },
  {
    id: "moisson", nom: "Moisson", rarity: 2, max: 1, tags: ["off", "def"],
    desc: "les ennemis sous 20 % de PV meurent instantanément, et rendent 1 PV",
    apply(m) {
      m.execThreshold = Math.max(m.execThreshold, 0.20);
      m.execHeal += CARD_CFG.EXEC_HEAL;
    },
  },
  {
    /* Les deux conversions se nourrissent l'une l'autre SANS boucler : elles se
       calculent toutes les deux sur les valeurs de BASE, avant conversion. Voir
       `fullMods` — c'est la que la regle est tenue, pas ici. */
    id: "blindage_offensif", nom: "Blindage offensif", rarity: 2, max: 1, tags: ["off", "def"],
    desc: `${Math.round(CARD_CFG.BLINDAGE_OFFENSIF * 100)} % de tes PV max s'ajoutent à tes dégâts`,
    apply(m) { m.hpToDamage += CARD_CFG.BLINDAGE_OFFENSIF; },
  },
  {
    id: "fureur_defensive", nom: "Fureur défensive", rarity: 2, max: 1, tags: ["off", "def"],
    desc: `${Math.round(CARD_CFG.FUREUR_DEFENSIVE * 100)} % de tes dégâts s'ajoutent à tes PV max`,
    apply(m) { m.damageToHp += CARD_CFG.FUREUR_DEFENSIVE; },
  },
  {
    id: "dernier_souffle", nom: "Dernier souffle", rarity: 2, max: 1, tags: ["off"],
    desc: "+80 % de dégâts sous 25 % de PV",
    apply(m) { m.lowHpDamage += CARD_CFG.SOUFFLE_DAMAGE; },
  },

  /* --- epiques qui reecrivent une regle -----------------------------------------

     Les trois premieres epiques ci-dessus ajoutent une source de degats. Ces
     quatre-la changent le fonctionnement du tir lui-meme : c'est ce qui rend
     soudain interessantes des cartes qui ne l'etaient pas. --- */
  {
    id: "rebond", nom: "Balles rebondissantes", rarity: 2, max: 1, tags: ["off"],
    desc: "les balles rebondissent sur les bords, −25 % de dégâts par rebond",
    apply(m) { m.bounce = 1; },
  },
  {
    /* Elle rend d'un coup utiles toutes les cartes de portee et de vitesse de
       balle, qui sont les plus faibles du pool : une balle qui ne s'arrete
       jamais ne vaut que par la distance qu'elle parcourt. C'est le genre de
       carte qui cree une build a elle seule.
       Incompatible avec le railgun, qui traverse deja tout : elle n'y
       ajouterait que sa decroissance de degats — une carte strictement
       mauvaise, ce qui est pire qu'une carte absente. */
    id: "inertie", nom: "Inertie", rarity: 2, max: 1, tags: ["off"],
    desc: "les balles ne s'arrêtent plus, −35 % de dégâts par ennemi traversé",
    incompatible: ["railgun"],
    apply(m) { m.inertia = 1; },
  },
  {
    id: "resonance", nom: "Résonance", rarity: 2, max: 2, tags: ["off"],
    desc: "chaque carte de cadence donne aussi +4 % de dégâts",
    effective: (ctx, n) =>
      `${plur(ctx.cadence, "carte")} de cadence`
      + ` — actuellement ${pctAdd(CARD_CFG.RESONANCE_STEP * ctx.cadence, n)} de dégâts`,
    apply() {},
    applyAfter(m, n, ctx) { m.damageMul += CARD_CFG.RESONANCE_STEP * n * ctx.cadence; },
  },
  {
    /* La seule carte dont le cout se paie sur la jauge COMMUNE : celui qui la
       prend ralentit les niveaux de toute la table. C'est assume — c'est le
       seul endroit du jeu ou un choix individuel engage le groupe, et il se
       voit puisque la jauge est affichee a tout le monde. */
    id: "dette", nom: "Dette", rarity: 2, max: 1, tags: ["off"],
    desc: "+50 % de dégâts, mais les niveaux de l'équipe coûtent 20 % de plus",
    apply(m) { m.damageMul += CARD_CFG.DETTE_DAMAGE; m.xpCostMul *= 1 + CARD_CFG.DETTE_XP_COST; },
  },

  /* --- legendaires : rares, spectaculaires, structurantes. Les trois armes
     s'excluent entre elles, sinon leurs effets se remplacent en silence selon
     l'ordre d'application. --- */
  {
    id: "dispersion", nom: "Fusil à dispersion", rarity: 3, max: 1, tags: ["off"],
    desc: "remplace le tir : 5 balles en cône, 55 % de dégâts chacune",
    remplaceArme: true,
    incompatible: ["railgun", "grenade"],
    apply(m) { m.weapon = "dispersion"; m.fireIntervalMul *= 1.6; },
  },
  {
    id: "railgun", nom: "Railgun", rarity: 3, max: 1, tags: ["off"],
    desc: "remplace le tir : traverse tout, ×3 dégâts, cadence divisée par 2,5",
    remplaceArme: true,
    // « Perforation » n'apporterait plus rien a une balle qui traverse deja
    // tout : on la retire du tirage plutot que d'offrir une carte morte.
    incompatible: ["dispersion", "grenade", "perforation"],
    apply(m) { m.weapon = "railgun"; m.damageMul += 2; m.fireIntervalMul *= 2.5; m.bulletSpeedMul += 1; },
  },
  {
    id: "grenade", nom: "Lance-grenades", rarity: 3, max: 1, tags: ["off"],
    desc: `remplace le tir : projectile lent qui explose sur ${fmtM(CARD_CFG.GRENADE_RADIUS)}`,
    remplaceArme: true,
    incompatible: ["dispersion", "railgun"],
    apply(m) { m.weapon = "grenade"; m.fireIntervalMul *= 2.2; },
  },
  {
    id: "echo", nom: "Écho", rarity: 3, max: 1, tags: ["off"],
    desc: "20 % de chance que chaque balle soit tirée en double",
    apply(m) { m.echoChance = 0.2; },
  },
  {
    id: "instinct", nom: "Instinct de survie", rarity: 3, max: 1, tags: ["def"],
    desc: "sous 20 PV, ralentit tous les ennemis pendant 4 s (45 s)",
    apply(m) { m.instinctCd = CARD_CFG.INSTINCT_CD; },
  },
  {
    id: "contrat", nom: "Contrat de sang", rarity: 3, max: 1, tags: ["off"],
    desc: "+80 % de dégâts, mais PV max plafonnés à 60",
    apply(m) { m.damageMul += 0.8; m.hpCap = 60; },
  },
  {
    id: "essaim", nom: "Essaim", rarity: 3, max: 1, tags: ["off"],
    desc: "4 mini-drones orbitants, 12 dégâts chacun",
    apply(m) { m.swarm = 4; },
  },

  {
    /* Le sommet de l'axe critique. Elle ne donne AUCUN chiffre : elle change ce
       qu'un critique fait, ce qui est la definition d'une legendaire ici. Le
       perforant se lit dans `_bulletHitEnemy`, la Vulnerabilite dans `_damage`,
       tous deux au point de passage unique. */
    id: "sentence_capitale", nom: "Sentence capitale", rarity: 3, max: 1, tags: ["off"],
    desc: "tes coups critiques traversent la cible et la rendent vulnérable",
    apply(m) { m.critVuln = 1; },
  },
  {
    /* Le seul echange sec du jeu : on renonce a une defense entiere pour un
       multiplicateur. Sans bouclier, la carte ne fait rien — c'est ce qui en
       fait une legendaire de BUILD et non une legendaire de puissance. */
    id: "pacte_de_fer", nom: "Pacte de fer", rarity: 3, max: 1, tags: ["off"],
    desc: `ton bouclier ne se régénère plus, mais tes dégâts montent de `
      + `${Math.round(CARD_CFG.PACTE_STEP * 100)} % par tranche de `
      + `${CARD_CFG.PACTE_PER} points de bouclier maximum`,
    effective: () => "sans carte de bouclier, elle ne fait rien",
    apply(m) { m.shieldToDamage = 1; m.noShieldRegen = 1; },
  },

  /* --- paliers 3 des familles ---------------------------------------------------

     Le sommet de chaque famille. Toutes a exemplaire unique : elles ne sont plus
     un nombre qu'on empile mais une regle qui change, et deux exemplaires d'une
     regle ne veulent rien dire. Elles ne sortent qu'aux jalons de NIVEAU
     (LEGENDARY_LEVELS) ou par un coup de chance a poids 1 — c'est ce qui fait
     qu'atteindre le niveau 12 est devenu un objectif en soi. --- */
  {
    /* Le seul mod du jeu dont la valeur depend de l'AVANCEMENT et non du
       chargement. Il ne peut donc pas etre resolu dans `computeMods`, qui est
       une fonction de la seule liste de cartes possedees : c'est
       `_recomputeMods` cote GameState qui ajoute la part de niveau, et qui
       rejoue le calcul a chaque montee de niveau. */
    id: "coeur_forge", nom: "Cœur de forge", rarity: 3, max: 1, tags: ["off"],
    family: "degats", tier: 3,
    desc: "+80 % de dégâts, et +5 % de plus par niveau d'équipe",
    apply(m) { m.damageMul += 0.80; m.damagePerLevel += CARD_CFG.FORGE_PER_LEVEL; },
  },
  {
    id: "chaine_assaut", nom: "Chaîne d'assaut", rarity: 3, max: 1, tags: ["off", "cadence"],
    family: "cadence", tier: 3,
    desc: "−40 % d'intervalle de tir, et la surchauffe ne s'applique plus",
    apply(m) { m.fireIntervalMul *= 0.60; m.noOverheat = 1; },
  },
  {
    id: "constitution", nom: "Constitution", rarity: 3, max: 1, tags: ["def"],
    family: "survie", tier: 3,
    desc: `+80 PV max et ${CARD_CFG.CONSTITUTION_REGEN} PV par seconde`,
    apply(m) { m.maxHpBonus += 80; m.hpRegen += CARD_CFG.CONSTITUTION_REGEN; },
  },
  {
    /* Elle recompense l'esquive AGRESSIVE : la trainee ne touche qu'une fois par
       ennemi et par esquive, donc traverser le groupe vaut mieux que reculer.
       C'est la seule carte du jeu qui donne des degats a un bouton defensif. */
    id: "vif_argent", nom: "Vif-argent", rarity: 3, max: 1, tags: ["off", "def"],
    family: "mobilite", tier: 3,
    desc: `l'esquive laisse une traînée de ${CARD_CFG.VIF_ARGENT_DAMAGE} dégâts sur ${fmtM(CARD_CFG.VIF_ARGENT_RADIUS)}`,
    apply(m) { m.dashTrail += CARD_CFG.VIF_ARGENT_DAMAGE; },
  },
  {
    /* La seule carte du jeu qui modifie les mods des AUTRES. Elle n'est pas
       resolue ici — `computeMods` ne connait qu'un chargement a la fois — mais
       dans `_recomputeMods`, qui ajoute les cartes « coop » du porteur au
       chargement effectif de chaque coequipier. Le porteur ne double pas les
       siennes : ce sont deja les siennes. */
    id: "voeu_partage", nom: "Vœu partagé", rarity: 3, max: 1, tags: ["coop"],
    family: "soutien", tier: 3,
    desc: "vos cartes de soutien profitent aussi à toute l'équipe",
    apply(m) { m.sharedSupport = 1; },
  },

  /* --- cartes de classe ---------------------------------------------------------

     Le champ `cls` les retire du tirage de tous les autres. Elles n'ont pas de
     rarete a part : une rare de classe se tire contre les rares communes, avec
     les memes poids, sinon un tank aurait vu ses quatre cartes tomber d'office
     et le systeme de rarete n'aurait plus rien voulu dire pour lui. --- */

  /* Tank */
  {
    id: "rempart_large", nom: "Rempart élargi", rarity: 1, max: 1, tags: ["def", "coop"],
    cls: "tank",
    desc: "rempart : rayon ×1,4 et +3 s de durée",
    apply(m) {
      m.bulwarkRadiusMul += CARD_CFG.REMPART_LARGE_RADIUS;
      m.bulwarkTime += CARD_CFG.REMPART_LARGE_TIME;
    },
  },
  {
    /* La seule carte du jeu qui change la NATURE d'une competence. Le rempart
       de base suit le tank depuis le lot A ; celle-ci le repose au sol, plus
       grand et plus long. Elle n'est donc pas une amelioration mais un ECHANGE :
       on rend la mobilite pour une zone qui vaut la peine d'etre tenue.
       Incompatible avec rien — « Rempart élargi » s'y ajoute, et le cumul des
       deux est exactement la build de tank statique qu'on veut rendre jouable. */
    id: "ancrage", nom: "Ancrage", rarity: 1, max: 1, tags: ["def", "coop"],
    cls: "tank",
    desc: `rempart posé au sol : ${fmtM(CARD_CFG.ANCRAGE_RADIUS)}, `
        + `${CARD_CFG.ANCRAGE_TIME} s, +50 % de bouclier par seconde`,
    apply(m) { m.bulwarkAnchor = 1; },
  },
  {
    id: "provocation_longue", nom: "Provocation prolongée", rarity: 1, max: 1, tags: ["def", "coop"],
    cls: "tank",
    desc: "provocation : +2 s de durée, −4 s de recharge",
    apply(m) {
      m.tauntTime += CARD_CFG.PROVOCATION_LONGUE_TIME;
      m.tauntCd -= CARD_CFG.PROVOCATION_LONGUE_CD;
    },
  },
  {
    /* Depuis que le rempart de base SUIT le tank, elle ne dit plus rien de ce
       rempart-la : son porteur est toujours dedans. Elle est devenue la
       compagne d'« Ancrage » — poser la zone puis aller chercher la horde sans
       renoncer a son propre bouclier — et c'est la seule paire de cartes de
       classe du jeu ou l'une conditionne l'interet de l'autre. Elle reste
       tiree comme les autres : rendre son offre conditionnelle a une carte deja
       possedee serait le premier pool a deux etages du depot. */
    id: "carapace", nom: "Carapace", rarity: 2, max: 1, tags: ["def"],
    cls: "tank",
    desc: "le bouclier du rempart s'applique au tank même hors de sa zone",
    apply(m) { m.carapace = 1; },
  },
  {
    // Elle ne recompense pas le fait d'appuyer sur la provocation, mais celui
    // de rester dedans une fois l'invulnerabilite passee : c'est la seule
    // maniere d'en faire une carte offensive sans annuler le risque.
    id: "represailles", nom: "Représailles", rarity: 2, max: 1, tags: ["def", "off"],
    cls: "tank",
    desc: `encaisser pendant la provocation renvoie 40 dégâts sur ${fmtM(CARD_CFG.REPRESAILLES_RADIUS)}`,
    apply(m) { m.represailles += CARD_CFG.REPRESAILLES_DAMAGE; },
  },

  /* Soigneur */
  {
    id: "faisceau_double", nom: "Faisceau divisé", rarity: 1, max: 1, tags: ["coop"],
    cls: "soigneur",
    desc: "le projectile de soin traverse un allié et en touche un second",
    apply(m) { m.healPierce += CARD_CFG.FAISCEAU_PIERCE; },
  },
  {
    id: "bascule_vive", nom: "Bascule vive", rarity: 1, max: 1, tags: ["coop", "cadence"],
    cls: "soigneur",
    desc: "la bascule est instantanée et donne +25 % de cadence pendant 2 s",
    apply(m) { m.swapInstant = 1; },
  },
  {
    id: "vague_large", nom: "Vague ample", rarity: 2, max: 1, tags: ["coop"],
    cls: "soigneur",
    desc: "vague de soin : rayon ×1,5",
    apply(m) { m.healWaveRadiusMul += CARD_CFG.VAGUE_LARGE_RADIUS; },
  },
  {
    id: "transfusion", nom: "Transfusion", rarity: 2, max: 1, tags: ["coop", "def"],
    cls: "soigneur",
    desc: "30 % des soins prodigués sont aussi rendus au soigneur",
    apply(m) { m.transfusion += CARD_CFG.TRANSFUSION_RATIO; },
  },

  /* Tireur */
  {
    id: "bombe_fragmentation", nom: "Fragmentation", rarity: 1, max: 1, tags: ["off"],
    cls: "dps",
    desc: "l'explosion projette 8 éclats à 50 % de dégâts",
    apply(m) { m.bombShards = 1; },
  },
  {
    // Deux charges, recharge inchangee : la bombe ne sort pas plus souvent, on
    // peut simplement en garder une sous le coude pour le moment ou la vague
    // se regroupe. C'est une carte de rythme, pas de puissance.
    id: "bombe_double", nom: "Double charge", rarity: 1, max: 1, tags: ["off"],
    cls: "dps",
    desc: "deux bombes en réserve, recharge inchangée",
    apply(m) { m.bombCharges += 1; },
  },
  {
    id: "surcharge_longue", nom: "Surcharge prolongée", rarity: 2, max: 1, tags: ["off", "cadence"],
    cls: "dps",
    desc: "surcharge : +3 s, et le bonus redescend au lieu de tomber d'un coup",
    apply(m) {
      m.overdriveTime += CARD_CFG.SURCHARGE_LONGUE_TIME;
      m.overdriveFade = 1;
    },
  },
  {
    id: "detonateur", nom: "Détonateur", rarity: 2, max: 1, tags: ["off"],
    cls: "dps",
    desc: "les ennemis touchés par la bombe subissent +25 % de dégâts pendant 4 s",
    apply(m) { m.bombVulnerable = 1; },
  },

  /* --- troisieme competence (lot C) ----------------------------------------------

     Le seul endroit du jeu ou une carte change ce qu'on FAIT, pas seulement les
     nombres. Trois regles, portees par trois champs :
       - `minLevel` : jamais avant le niveau 5 — obtenue trop tot, elle ecrase le
         reste du build, et le joueur n'a pas encore assimile ses deux premieres
         competences ;
       - `incompatible` mutuel : PAS de cumul — une fois un palier obtenu, les
         deux autres sortent du pool. Ce n'est pas une famille : les familles se
         cumulent, ici on choisit une fois ;
       - `excl` : jamais deux paliers de la meme competence dans le meme tirage
         — le palier superieur ecraserait toujours l'autre et le choix serait
         faux. Meme regle que `family`, sans en porter l'affichage de cumul. --- */

  /* Tank — Ancre. Du controle de foule pur, ce qui manque totalement au jeu :
     on ne peut aujourd'hui que subir la horde ou la fuir, jamais la contenir.
     Les descriptions COMPOSENT les constantes (skill3Ancre etc.), comme partout :
     un texte qui recopie un nombre ment des le premier reglage. */
  {
    id: "ancre", nom: "Ancre", rarity: 1, max: 1, tags: ["def", "coop"],
    cls: "tank", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["ancre_lourde", "ancre_souveraine"],
    desc: skill3Ancre(0),
    apply(m) { m.skill3 = Math.max(m.skill3, 1); },
  },
  {
    id: "ancre_lourde", nom: "Ancre lourde", rarity: 2, max: 1, tags: ["def", "coop"],
    cls: "tank", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["ancre", "ancre_souveraine"],
    desc: skill3Ancre(1),
    apply(m) { m.skill3 = Math.max(m.skill3, 2); },
  },
  {
    id: "ancre_souveraine", nom: "Ancre souveraine", rarity: 3, max: 1, tags: ["def", "coop"],
    cls: "tank", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["ancre", "ancre_lourde"],
    desc: skill3Ancre(2) + " — les ennemis retenus sont Vulnérables",
    apply(m) { m.skill3 = Math.max(m.skill3, 3); },
  },

  /* Soigneur — Sanctuaire. La destruction de projectiles est l'effet le plus
     important : c'est la seule reponse du jeu a la saturation de tirs pendant
     un combat de boss, et elle donne au soigneur un role qui n'est pas du
     rattrapage. */
  {
    id: "sanctuaire", nom: "Sanctuaire", rarity: 1, max: 1, tags: ["coop", "def"],
    cls: "soigneur", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["grand_sanctuaire", "sanctuaire_absolu"],
    desc: skill3Sanctuaire(0),
    apply(m) { m.skill3 = Math.max(m.skill3, 1); },
  },
  {
    id: "grand_sanctuaire", nom: "Grand sanctuaire", rarity: 2, max: 1, tags: ["coop", "def"],
    cls: "soigneur", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["sanctuaire", "sanctuaire_absolu"],
    desc: skill3Sanctuaire(1),
    apply(m) { m.skill3 = Math.max(m.skill3, 2); },
  },
  {
    id: "sanctuaire_absolu", nom: "Sanctuaire absolu", rarity: 3, max: 1, tags: ["coop", "def"],
    cls: "soigneur", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["sanctuaire", "grand_sanctuaire"],
    desc: skill3Sanctuaire(2) + " — purge un état à l'entrée",
    apply(m) { m.skill3 = Math.max(m.skill3, 3); },
  },

  /* Tireur — Salve. La reponse aux tireurs qui gardent leurs distances et aux
     ennemis qui tournent derriere — la faiblesse structurelle de la visee
     manuelle : le verrouillage touche a coup sur. */
  {
    id: "salve", nom: "Salve", rarity: 1, max: 1, tags: ["off"],
    cls: "dps", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["salve_etendue", "salve_totale"],
    desc: skill3Salve(0),
    apply(m) { m.skill3 = Math.max(m.skill3, 1); },
  },
  {
    id: "salve_etendue", nom: "Salve étendue", rarity: 2, max: 1, tags: ["off"],
    cls: "dps", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["salve", "salve_totale"],
    desc: skill3Salve(1),
    apply(m) { m.skill3 = Math.max(m.skill3, 2); },
  },
  {
    id: "salve_totale", nom: "Salve totale", rarity: 3, max: 1, tags: ["off"],
    cls: "dps", excl: "skill3", minLevel: CARD_CFG.SKILL3_MIN_LEVEL,
    incompatible: ["salve", "salve_etendue"],
    desc: skill3Salve(2) + " — cibles rendues Vulnérables",
    apply(m) { m.skill3 = Math.max(m.skill3, 3); },
  },

  /* --- carte de secours ---------------------------------------------------------

     Elle ne sort JAMAIS du tirage normal (`fallback`), uniquement pour combler
     une offre que le pool ne peut plus remplir. Avec quinze a vingt tirages
     dans une manche, un joueur qui plafonne ses cartes preferees finit par ne
     plus avoir trois cartes distinctes a se voir proposer, et l'ecran de choix
     s'ouvrait alors sur une ou deux cases. Son effet est immediat et non un
     mod : il est traite dans takeCard, pas ici. --- */
  {
    id: "ravitaillement", nom: "Ravitaillement", rarity: 0, max: 99, tags: [],
    fallback: true,
    desc: "soin complet et +200 points",
    apply() {},
  },
];

export const CARD_BY_ID = new Map(CARDS.map(c => [c.id, c]));

/* --- mods ------------------------------------------------------------------ */

export function defaultMods() {
  return {
    damageMul: 1,
    fireIntervalMul: 1,
    maxHpBonus: 0,
    hpCap: 0,
    speedMul: 1,
    bulletSpeedMul: 1,
    bulletLifeMul: 1,
    reviveSpeedMul: 1,
    reviveRadiusMul: 1,
    reviveHpRatio: 0,
    damageTakenMul: 1,
    pickupRadius: 0,
    scoreMul: 1,
    healPerBoss: 0,
    pierce: 0,
    extraBarrels: 0,
    barrelDamageMul: 1,
    shieldPool: 0,
    lifesteal: 0,
    burnDmg: 0,
    chain: 0,
    chainChance: 0,
    selfRevive: 0,
    counterNova: 0,
    zoneImmunity: 0,
    autoTurretCd: 0,
    orbiters: 0,
    backShot: 0,
    pulsarCd: 0,
    drones: 0,
    swarm: 0,
    frenzy: 0,
    frostRadius: 0,
    harvest: 0,
    deathWave: 0,
    echoChance: 0,
    guardianCd: 0,
    instinctCd: 0,
    weapon: null,
    // Degats des lames orbitales, separes de damageMul : « Surcharge orbitale »
    // ne doit pas profiter au tir principal.
    orbiterDamageMul: 1,
    // Drapeaux, pas des multiplicateurs : ils changent une regle du tir.
    bounce: 0,
    inertia: 0,

    /* --- paliers hauts des familles (lot 2 du plan v2) ----------------------
       `damagePerLevel` et `sharedSupport` ne sont PAS resolus par computeMods :
       l'un depend du temps, l'autre du chargement des coequipiers, et cette
       fonction ne connait qu'une liste de cartes. Ils sont lus par
       `_recomputeMods` cote GameState, qui a acces aux deux. La cle existe
       quand meme ici, comme toutes les autres : un mod absent donne NaN au
       premier calcul plutot qu'une valeur neutre. */
    damagePerLevel: 0,
    noOverheat: 0,           // leve le plancher de cadence, pas le plancher dur
    hpRegen: 0,              // PV par seconde
    dashCdMul: 1,
    dashTrail: 0,            // degats de la trainee d'esquive
    sharedSupport: 0,
    /* --- etats (lot 3) -----------------------------------------------------
       `statusTimeMul` est une REDUCTION, donc multiplicative et plafonnee comme
       damageTakenMul : deux Antidote additifs auraient donne des etats de duree
       nulle, c'est-a-dire une purge permanente et gratuite. */
    statusTimeMul: 1,
    catalyseur: 0,
    // Surcout des paliers de niveau. Il se paie sur la jauge commune, donc la
    // simulation prend le PLUS ELEVE de la table et non le cumul : sinon deux
    // « Dette » a quatre joueurs bloquaient la progression de tout le monde.
    xpCostMul: 1,

    /* --- competences de classe ---------------------------------------------
       Ces cles existent pour TOUT LE MONDE, y compris un tireur qui ne posera
       jamais de rempart : la simulation lit `p.mods` sans jamais demander la
       classe du joueur, et un mod absent aurait donne NaN au premier calcul
       plutot qu'une valeur neutre. Elles sont exprimees en valeurs ABSOLUES
       (secondes, degats) ou en multiplicateurs additifs, jamais en drapeaux
       quand un nombre suffit — une carte suivante doit pouvoir s'y ajouter. */
    bulwarkRadiusMul: 1,
    bulwarkTime: 0,          // secondes ajoutees a la duree de base
    /* « Ancrage » : le rempart redevient POSE au sol au lieu de suivre le tank.
       Un drapeau et non un nombre — c'est le seul mod du jeu qui change la
       nature d'une competence, et il n'y a rien a y cumuler. */
    bulwarkAnchor: 0,
    carapace: 0,
    tauntTime: 0,
    tauntCd: 0,              // negatif : reduction de recharge
    represailles: 0,
    healPierce: 0,
    swapInstant: 0,
    healWaveRadiusMul: 1,
    transfusion: 0,
    bombShards: 0,
    bombCharges: 0,          // charges EN PLUS de la premiere
    bombVulnerable: 0,
    overdriveTime: 0,
    overdriveFade: 0,
    /* Troisieme competence (lot C) : le PALIER possede, 0 = pas de carte,
       1 rare, 2 epique, 3 legendaire. Un nombre et non un drapeau : la
       simulation indexe les tables SKILL3_* dessus. */
    skill3: 0,

    /* --- progression permanente (lot D) -------------------------------------
       Ces cles ne sont ecrites par AUCUNE carte : elles n'existent que pour
       `applyMeta` (shared/progression.js), qui s'applique en aval de fullMods.
       Elles vivent quand meme ici, comme toutes les autres — un mod absent
       donne NaN au premier calcul plutot qu'une valeur neutre, et la
       simulation les lit sans savoir si le joueur a un compte. */
    thorns: 0,               // « Epines » : part des degats subis renvoyee a 4 m
    guardAura: 0,            // « Garde » : reduction des degats des allies proches
    healGivenMul: 1,         // « Flux » : multiplicateur des soins prodigues
    healBeamMul: 1,          // « Portee » : vitesse et portee du projectile de soin
    reviveHpBonus: 0,        // « Releve » : PV rendus en plus au releve
    catalyse: 0,             // « Catalyse » : bonus de degats de la cible soignee
    bombCdCut: 0,            // « Charge » : secondes retirees a la recharge de bombe
    bombRadiusMul: 1,        // « Charge » : rayon de la bombe

    /* --- axes du lot 6 ------------------------------------------------------
       `critChance` et `critMul` sont les seuls mods qui ne partent PAS d'une
       valeur neutre : le critique existe pour tout le monde, sans carte. Une
       base a zero aurait rendu la premiere carte de chance critique
       incomparable a quoi que ce soit — le joueur n'aurait eu aucun point de
       reference pour juger « +6 % ». */
    critChance: CARD_CFG.CRIT_CHANCE,
    critMul: CARD_CFG.CRIT_MUL,
    critVuln: 0,
    areaMul: 1,
    areaPull: 0,
    skillCdMul: 1,
    cdPerKill: 0,
    execThreshold: 0,
    execHeal: 0,
    hpPerKill: 0,
    maxHpRatio: 0,           // part des PV de base, appliquee dans `fullMods`
    /* Conversions. Resolues dans `fullMods` et non ici : l'une a besoin des PV
       max, l'autre du multiplicateur de degats APRES la classe, et
       `computeMods` ne connait ni l'un ni l'autre. */
    hpToDamage: 0,
    damageToHp: 0,
    shieldToDamage: 0,
    noShieldRegen: 0,
    /* Momentum. Ces cinq-la dependent de l'INSTANT et pas du chargement : ils
       sont relevés a chaque tick par `_players` et multiplies dans `_damage`.
       La cle vit quand meme ici, comme toutes les autres — un mod absent donne
       NaN au premier calcul plutot qu'une valeur neutre. */
    elanStep: 0,
    elanMax: 0,
    packStep: 0,
    packMax: 0,
    ragePerKill: 0,
    lowHpRate: 0,
    lowHpDamage: 0,
  };
}

/* Ce qu'une carte conditionnelle a besoin de savoir du reste du chargement.
   Releve une seule fois par recalcul : chaque carte qui interrogerait la Map
   elle-meme reparcourrait toute la table pour la meme reponse. */
export function cardContext(owned) {
  const ctx = { defensive: 0, cadence: 0, topRarity: -1 };
  for (const [id, n] of owned) {
    const card = CARD_BY_ID.get(id);
    if (!card || n <= 0) continue;
    if (card.tags.includes("def")) ctx.defensive += n;
    if (card.tags.includes("cadence")) ctx.cadence += n;
    if (card.rarity > ctx.topRarity) ctx.topRarity = card.rarity;
  }
  return ctx;
}

/* `owned` est une Map id -> nombre d'exemplaires. On recalcule tout depuis zero
   a chaque prise : c'est le seul moyen de garantir qu'un mod ne derive pas au
   fil des cartes, et ca ne coute rien puisque ca n'arrive qu'entre deux vagues.

   DEUX passes, et non une. Les cartes conditionnelles (Symbiose, Austerite,
   Resonance) valent en fonction du reste du chargement : les evaluer dans la
   meme boucle rendait leur valeur dependante de l'ordre d'insertion dans la
   Map, c'est-a-dire de l'ordre dans lequel le joueur avait pris ses cartes.
   Deux joueurs avec exactement les memes cartes n'avaient pas les memes degats.
   La seconde passe lit un contexte fige, donc le resultat ne depend plus que de
   ce qu'on possede. */
export function computeMods(owned) {
  const m = defaultMods();
  for (const [id, n] of owned) {
    const card = CARD_BY_ID.get(id);
    if (card && n > 0) card.apply(m, n);
  }

  const ctx = cardContext(owned);
  for (const [id, n] of owned) {
    const card = CARD_BY_ID.get(id);
    if (card && n > 0 && card.applyAfter) card.applyAfter(m, n, ctx);
  }

  // Les reductions sont plafonnees ici, une fois pour toutes : les cartes
  // ignorent le plancher, seul cet endroit le connait.
  m.fireIntervalMul = Math.max(
    m.noOverheat ? CARD_CFG.FIRE_INTERVAL_HARD_FLOOR : CARD_CFG.FIRE_INTERVAL_FLOOR,
    m.fireIntervalMul);
  m.damageTakenMul = Math.max(CARD_CFG.DAMAGE_TAKEN_FLOOR, m.damageTakenMul);
  m.speedMul = Math.max(0.5, m.speedMul);
  m.bulletSpeedMul = Math.max(CARD_CFG.BULLET_SPEED_FLOOR, m.bulletSpeedMul);
  // Plancher de duree des etats : deux Antidote donnent 36 % de la duree, et il
  // n'existe rien en dessous. Sans plancher, une troisieme source les aurait
  // rendus invisibles — un etat qui ne se voit pas ne s'apprend pas.
  m.statusTimeMul = Math.max(0.35, m.statusTimeMul);
  /* Le critique reste un EVENEMENT : au-dela de trois coups sur quatre, il
     cesse d'etre une pointe et devient un multiplicateur permanent qu'on
     aurait aussi bien pu ecrire dans `damageMul`. */
  m.critChance = Math.min(CARD_CFG.CRIT_CHANCE_CAP, m.critChance);

  /* Les trois rayons qui sont deja des mods absorbent `areaMul` ICI, en un seul
     endroit : `frostRadius` traverse le reseau (le client dessine l'aura
     dessus) et les deux autres sont lus a plusieurs endroits de la simulation.
     Multiplier chez l'appelant aurait donne une aura dessinee d'une taille et
     une aura qui ralentit d'une autre. Les rayons CONSTANTS (bombe, grenade,
     pulsar, onde de mort, nova, riposte) n'ont pas ce probleme et sont
     multiplies chez leur appelant. */
  m.bulwarkRadiusMul *= m.areaMul;
  m.healWaveRadiusMul *= m.areaMul;
  m.frostRadius *= m.areaMul;
  return m;
}

/* --- tirage ------------------------------------------------------------------ */

/* `quality` commence a 1 pour le premier tirage : la derive ne s'applique donc
   qu'a partir du second, le premier tirage reste sur les poids de base. Le
   plafond evite qu'elle ne s'emballe en fin de manche — voir RARITY_DRIFT. */
function rarityWeights(quality) {
  const k = Math.min(Math.max(0, quality - 1), CARD_CFG.RARITY_DRIFT_CAP);
  return RARITY_WEIGHT.map((w, i) => w * Math.pow(RARITY_DRIFT[i], k));
}

/* Legendaires deja possedees, exemplaires compris. Elles sont toutes a
   exemplaire unique aujourd'hui, mais le plafond compte des CARTES et pas des
   identifiants distincts : une legendaire a deux exemplaires resterait deux
   legendaires. */
export function legendaryCount(owned) {
  let n = 0;
  for (const [id, k] of owned) {
    const card = CARD_BY_ID.get(id);
    if (card && card.rarity === RARITY.LEGENDAIRE) n += k;
  }
  return n;
}

/* Plus haut palier possede, par famille. Releve une seule fois par tirage : le
   filtre en a besoin pour chaque carte de la table. */
function topTiers(owned) {
  const top = new Map();
  for (const [id, n] of owned) {
    const card = CARD_BY_ID.get(id);
    if (!card || !card.family || n <= 0) continue;
    top.set(card.family, Math.max(top.get(card.family) ?? -1, card.tier));
  }
  return top;
}

/* `cls` est l'IDENTIFIANT de classe du joueur (chaine), pas son index : cette
   table ne connait pas l'ordre de `CLASSES` et n'a pas a le connaitre — c'est
   le seul endroit du depot ou une classe est designee par son nom, et c'est
   volontaire, une carte doit rester lisible sans compter les colonnes d'un
   tableau exporte ailleurs. */
export function eligibleCards(owned, cls = null, levelNow = 0, locked = null) {
  const blocked = new Set();
  for (const id of owned.keys()) {
    const card = CARD_BY_ID.get(id);
    if (card && card.incompatible) for (const other of card.incompatible) blocked.add(other);
  }
  const top = topTiers(owned);
  return CARDS.filter(c => {
    // Un palier superieur possede retire les paliers inferieurs : proposer
    // Affutage a qui a Coeur de forge, c'est proposer une carte que le joueur
    // sait deja depassee. Le palier possede lui-meme reste offert tant qu'il
    // n'est pas plafonne — les paliers se cumulent.
    if (c.family && (top.get(c.family) ?? -1) > c.tier) return false;
    // La carte de secours ne participe jamais au tirage normal : elle ne sert
    // qu'a combler une offre incomplete, sinon elle diluerait le pool commun.
    if (c.fallback) return false;
    // Une carte de classe n'existe que pour sa classe. Le filtre est ici et
    // non a l'affichage : une carte visible mais impossible a prendre est pire
    // qu'une carte absente.
    if (c.cls && c.cls !== cls) return false;
    /* Troisieme competence : jamais avant son niveau seuil. Le defaut de
       `levelNow` (0) FILTRE ces cartes — un appelant qui ne connait pas le
       niveau n'a pas a les offrir, c'est le sens sur de l'oubli. */
    if (c.minLevel && levelNow < c.minLevel) return false;
    /* Deblocage par jalons (lot D) : une carte encore verrouillee pour ce
       compte n'apparait JAMAIS dans un tirage. Le filtre est ici, avec les
       autres, et non a l'affichage. */
    if (locked && locked.has(c.id)) return false;
    if (blocked.has(c.id)) return false;
    return (owned.get(c.id) || 0) < c.max;
  });
}

export const FALLBACK_CARD = CARDS.find(c => c.fallback);

/* Tire trois cartes distinctes. `forceRare` vient de la garantie
   anti-frustration : deux tirages d'affilee sans rien d'autre que des communes
   et le joueur decroche du systeme entier, meme si la probabilite lui donnera
   raison a la longue. Une vague de boss la leve aussi, systematiquement.

   `quality` a remplace le numero de boss : les cartes ne tombent plus a la mort
   d'un boss mais a chaque montee de niveau, et il en sort quinze a vingt par
   manche au lieu de quatre. Indexer la derive sur le nombre de boss aurait fige
   la qualite des tirages a celle du premier quart de la manche.

   `jalon` ne sert QU'A la garantie de legendaire, et vaut 0 partout ailleurs.
   L'appelant ne le passe qu'au PREMIER ecran atteint a partir d'un niveau de
   jalon : trois niveaux gagnes d'affilee ne doivent pas donner trois
   legendaires. C'est GameState qui tient ce compte, pas cette fonction — elle
   doit rester une fonction de ses arguments, rejouable telle quelle dans un
   script de mesure. */
export function drawCards(owned, quality, forceRare = false, cls = null,
                          rng = Math.random, jalon = 0, levelNow = 0, opts = {}) {
  /* `opts.locked` : cartes verrouillees par la progression (lot D), jamais
     tirees. `opts.count` : nombre de cartes offertes — 3 partout, 4 pour la
     « Quatrieme offre » du tronc de confort. */
  const count = opts.count ?? 3;
  /* Plafond dur. Sans lui, un joueur chanceux en cumulait quatre et rendait
     toute mesure d'equilibrage inutilisable : la puissance de la table ne
     depend plus alors du systeme mais d'un tirage. */
  const capped = legendaryCount(owned) >= CARD_CFG.LEGENDARY_MAX;
  const pool = eligibleCards(owned, cls, levelNow, opts.locked ?? null)
    .filter(c => !(capped && c.rarity === RARITY.LEGENDAIRE));
  const weights = rarityWeights(quality);
  const out = [];
  const taken = new Set();
  const families = new Set();
  // Groupes d'exclusion de tirage (troisieme competence) : meme regle que les
  // familles — deux paliers ensemble, le superieur ecrase l'autre — sans en
  // porter l'affichage de cumul, puisque ces cartes ne se cumulent pas.
  const excls = new Set();

  const pickFrom = list => {
    let total = 0;
    for (const c of list) total += weights[c.rarity];
    if (total <= 0) return null;
    let roll = rng() * total;
    for (const c of list) {
      roll -= weights[c.rarity];
      if (roll <= 0) return c;
    }
    return list[list.length - 1];
  };

  const push = c => {
    out.push(c);
    taken.add(c.id);
    // Jamais deux paliers de la meme famille dans le meme tirage : le palier
    // superieur ecrase toujours l'autre, et le choix n'en est plus un.
    if (c.family) families.add(c.family);
    if (c.excl) excls.add(c.excl);
  };
  const restant = () =>
    pool.filter(c => !taken.has(c.id)
      && !(c.family && families.has(c.family))
      && !(c.excl && excls.has(c.excl)));

  /* Garantie de jalon. Elle passe AVANT `forceRare`, qu'elle satisfait au
     passage : une legendaire est une rare au sens de la garantie
     anti-frustration. */
  if (jalon > 0 && CARD_CFG.LEGENDARY_LEVELS.includes(jalon) && !capped) {
    const c = pickFrom(restant().filter(x => x.rarity === RARITY.LEGENDAIRE));
    if (c) push(c);
  }

  if (out.length === 0 && forceRare) {
    const c = pickFrom(restant().filter(x => x.rarity >= RARITY.RARE));
    if (c) push(c);
  }

  while (out.length < count) {
    const list = restant();
    if (list.length === 0) break;
    const c = pickFrom(list);
    if (!c) break;
    push(c);
  }

  /* Repli. Le pool finit par ne plus fournir trois cartes distinctes : un
     joueur qui a plafonne ses preferees, pris une arme legendaire (qui en
     bloque deux autres) et vide les communes se voyait offrir un ecran a une
     case. La carte de secours n'a pas de plafond et comble autant de cases que
     necessaire — c'est le seul endroit du jeu ou elle apparait. */
  while (out.length < count && FALLBACK_CARD) out.push(FALLBACK_CARD);

  return out;
}

/* Ce que le client a besoin de savoir d'une carte, et rien de plus : les effets
   restent cote serveur, seul l'affichage traverse le reseau. */
export function cardBrief(id) {
  const c = CARD_BY_ID.get(id);
  if (!c) return null;
  return { id: c.id, nom: c.nom, rarity: c.rarity, desc: c.desc };
}

/* Tout ce qu'un ecran de choix doit afficher d'une carte, en chaines DEJA
   composees. Le formatage vit ici et non dans le client pour la meme raison que
   `computeMods` : c'est une fonction de la seule liste de cartes possedees,
   donc rejouable dans un script de mesure, et deux clients ne peuvent pas
   diverger sur ce qu'une carte annonce.

   Trois informations en plus de l'effet, et pas une de plus :
     - le CUMUL possede et son plafond, qui dit s'il reste quelque chose a
       gagner ;
     - la valeur AVANT et APRES, qui est la seule maniere de comparer une
       troisieme carte de degats a une premiere carte defensive ;
     - la valeur EFFECTIVE des conditionnelles, sans laquelle elles sont
       inevaluables en trente secondes et ne se prennent jamais.

   `owned` est la Map id -> exemplaires du joueur, comme partout ailleurs. Vide
   par defaut : l'ecran du premier niveau n'a rien a lire. */
export function cardDetail(id, owned = new Map()) {
  const c = CARD_BY_ID.get(id);
  if (!c) return null;

  const have = owned.get(id) ?? 0;
  const next = Math.min(c.max, have + 1);

  /* La carte de secours a un plafond de 99 pour combler autant de cases que
     necessaire : afficher « possédée 3 / 99 » ne dirait rien a personne. */
  const cumul = (c.max > 1 && !c.fallback) ? `possédée ${have} / ${c.max}` : null;

  /* La valeur ne s'affiche qu'a partir du deuxieme exemplaire : a zero, elle
     repeterait mot pour mot la ligne d'effet juste au-dessus. Au plafond, elle
     ne s'affiche pas non plus — « 11 m → 11 m » ne dit rien, et `cumul` a deja
     annonce « possédée 2 / 2 ». */
  const valeur = (c.stack && have > 0 && next > have)
    ? `${c.stack(have)} → ${c.stack(next)}`
    : null;

  const effectif = c.effective ? c.effective(cardContext(owned), next) : null;

  let avertissement = null;
  if (c.incompatible && c.incompatible.length > 0) {
    const noms = c.incompatible.map(x => CARD_BY_ID.get(x)?.nom ?? x).join(", ");
    avertissement = (c.remplaceArme ? "remplace le tir — " : "") + `incompatible avec ${noms}`;
  } else if (c.remplaceArme) {
    avertissement = "remplace le tir";
  }

  /* La famille et le palier. C'est ce qui rend la progression lisible : le
     joueur qui prend « Calibre supérieur — dégâts, palier 2 / 4 » sait du meme
     coup qu'il existe deux versions superieures et que ses Affutage ne lui
     seront plus proposes. Sans cette ligne, les familles ne sont qu'un detail
     de tirage que personne ne voit. */
  const famille = c.family
    ? `${FAMILY_LABEL[c.family] ?? c.family} — palier ${c.tier + 1} / ${FAMILY_TIERS}`
    : null;

  /* CATEGORIE ET RANG DANS LA BUILD. C'est la ligne qui rend un choix decidable
     en une seconde : « 3ᵉ carte de zone » dit d'un coup ce que la liste de
     cartes ne dit qu'apres reconstitution de tete. Sans elle, chaque tirage se
     lit isolement et on empile un axe sans s'en apercevoir — le defaut se voit
     au tableau de fin, c'est-a-dire trop tard.

     Le rang compte la carte QU'ON EST EN TRAIN DE REGARDER, exemplaire suivant
     inclus : c'est ce qu'elle serait si on la prenait, pas ce qu'on a deja.
     « 1ʳᵉ » et non « 1ᵉ » : c'est une chaine vue par le joueur, elle est
     ecrite correctement.

     `categorieId` est la CLE et non le libelle — le client y prend sa couleur
     dans `CARD_CATEGORY_COLOR`, comme il prend son glyphe sur `familleId`. */
  const catId = cardCategory(c);
  const rangN = categoryCount(owned, catId) + 1;
  const rang = `${rangN === 1 ? "1ʳᵉ" : `${rangN}ᵉ`} ${CATEGORY_RANG[catId]}`;

  /* `familleId` est la CLE de famille, pas son libelle : le client choisit son
     glyphe dessus. Une icone par famille et non par carte — cinq glyphes que le
     joueur apprend a reconnaitre valent mieux que soixante qu'il ne lira
     jamais. */
  return { id: c.id, nom: c.nom, rarity: c.rarity, desc: c.desc,
           famille, familleId: c.family ?? null,
           categorie: CATEGORY_LABEL[catId], categorieId: catId, rang,
           cumul, valeur, effectif, avertissement };
}
