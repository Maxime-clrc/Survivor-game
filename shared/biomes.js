
import { clefsDe, t } from "./i18n.js";

export const BIOME_CFG = {
  HAZARD_SURFACE_MAX: 0.08,

  OBSTACLE_SURFACE_MAX: 0.10,

  /* LA TRAME PREND SA PART DU MEME BUDGET, ELLE N EN AJOUTE PAS UN SECOND.
     `OBSTACLE_SURFACE_MAX` reste LE plafond de tout ce qui est bati : la trame
     se sert d abord, plafonnee a `TRAME_SURFACE_MAX`, et les cellules
     remplissent le reste. Un second budget aurait fait grossir la matiere batie
     de moitie, donc change le jeu sans que personne ne l ait decide.
     Un bloc de cellule qui tombe DANS la trame est jete : la trame passe devant,
     la cellule cede. Deux habillages l un dans l autre est le defaut que
     `verifierSuperpositions` mesure deja. */
  TRAME_SURFACE_MAX: 0.030,

  // 3 x NAV_CFG.PASSAGE_MIN. La mesure de `navigation.js` dit qu au pire calage
  // une fente de 160 px est contestee en 4,2 s et une de 200 px jamais ; 240
  // garde la marge d un corps d elite.
  TRAME_BRECHE: 240,
  // une ouverture au moins tous les deux ecrans, et JAMAIS moins de deux
  // troncons : une bande d un seul tenant qui traverse un quartier entier
  // n aurait aucune brèche.
  TRAME_PAS: 3200,
  TRAME_EP: 62,
  // recul du bord de quartier : deux trames voisines ne se touchent pas, et la
  // frontiere reste franchissable sur toute sa longueur.
  TRAME_MARGE: 200,

  CORE_RATIO: 0.45,
  CORE_CLEARANCE: 34,

  GEYSER_R: 70,
  GEYSER_PERIOD: 7,
  GEYSER_ACTIVE: 1.9,
  GEYSER_RAMP: 0.22,
  GEYSER_DOT: 26,

  POOL_R: 85,
  POOL_DOT: 11,

  EMBER_R: 55,
  EMBER_DOT: 16,
  EMBER_PERIOD: 11,
  EMBER_SPAN: 210,

  SLOW_R: 110,
  SLOW_MUL: 0.62,

  SLIP_R: 95,
  SLIP_ACCEL: 2.6,

  COVER_HP: 900,

  GUST_PUSH: 46,
  GUST_PERIOD: 26,
  GUST_CALM: 0.42,
  GUST_RAMP: 3.2,
  GUST_MIN: 0.45,
  GUST_TURN_HZ: 0.021,
  GUST_SWING: 1.15,
  GUST_AMP_HZ: 0.055,

  ASH_LIFE: 11,

  // LA BRUME RETIRE DE L'INFORMATION, elle ne teinte pas. Pleine visibilite
  // jusqu'a FOG_CLEAR, plus rien de la horde au-dela de FOG_BLIND. La demi-vue
  // fait 800 x 450 : a 480 le disque deborde a peine en haut et en bas, et
  // ampute franchement les cotes — c'est un champ de vision, plus un ecran.
  // Tout ce qui TIRE reste dedans par construction (le tireur se place a 170,
  // le soigneur ennemi a 240), donc on ne se fait jamais toucher par un corps
  // qu'on ne pouvait pas voir.
  FOG_CLEAR: 260,
  FOG_BLIND: 480,

  // le vignettage accompagne le masquage au lieu de le contredire : il partait
  // PLUS LOIN du centre (+0,12), ce qui eclaircissait les bords haut et bas.
  FOG_VIGNETTE: 1.35,
  FOG_FROM: -0.10,
};

export const HZ_GEYSER = 0;
export const HZ_POOL = 1;
export const HZ_EMBER = 2;
export const HZ_SLOW = 3;
export const HZ_SLIP = 4;

/* UN DANGER S ANNONCE PAR SA GEOMETRIE PERMANENTE, jamais par un mot : `nom`
   n avait pour seul lecteur `hazardNom`, que personne n appelait. Ce qui blesse
   est chaud, ce qui ralentit est froid — c est la seule chose a apprendre, et
   `render/dangers.js` la porte. */
export const HAZARDS = [
  { key: "geyser",   hurts: true,  r: BIOME_CFG.GEYSER_R, dot: BIOME_CFG.GEYSER_DOT },
  { key: "flaque",   hurts: true,  r: BIOME_CFG.POOL_R,   dot: BIOME_CFG.POOL_DOT },
  { key: "braise",   hurts: true,  r: BIOME_CFG.EMBER_R,  dot: BIOME_CFG.EMBER_DOT },
  { key: "ralenti",  hurts: false, r: BIOME_CFG.SLOW_R,   dot: 0 },
  { key: "glissant", hurts: false, r: BIOME_CFG.SLIP_R,   dot: 0 },
];

export function hazardAt(kind) { return HAZARDS[kind] ?? null; }

export const WX_BRUME = 0;
export const WX_BOURRASQUE = 1;
export const WX_CENDRES = 2;

export const WEATHERS = [
  { key: "brume", nom: "Brume",
    texte: "brume dense — on ne voit plus venir" },
  { key: "bourrasque", nom: "Bourrasque",
    texte: "rafales — le vent vous pousse, la horde l'ignore" },
  { key: "cendres", nom: "Cendres",
    texte: "pluie de cendres — les bonus au sol ne durent plus" },
];

export function weatherAt(id) { return WEATHERS[id] ?? null; }
export const weatherNom = i => t(`weather.${WEATHERS[i]?.key}.nom`, WEATHERS[i]?.nom ?? "");
export const weatherTexte = i => t(`weather.${WEATHERS[i]?.key}.texte`, WEATHERS[i]?.texte ?? "");

/* LE VOCABULAIRE BATI D UN LIEU. Un obstacle n etait qu un rectangle : quatre
   lieux, quatre silhouettes, et DANS un lieu la seule variation etait la taille.
   Les familles existaient pourtant deja dans la table ci-dessous — la barre
   longue de l Usine et son armoire ne sont pas le meme objet — elles n avaient
   simplement pas de nom. `kind` le leur donne, `render/blocs.js` les dessine :
   meme forme que `DANGER[biome][kind]`, qui marche deja.

   IL NE CIRCULE PAS SUR LE RESEAU ET LE SERVEUR NE LE LIT JAMAIS. La geometrie
   se regenere des deux cotes, et collision, navigation, apparition et depot
   restent sur l AABB, au pixel pres. Ajouter une famille ne peut donc pas
   deplacer un mur.

   Table ORDONNEE et append-only, `lieu` en declare le proprietaire : une famille
   appartient a UN lieu (c est la regle de non-reutilisation), et
   `verifierBiomes()` refuse aussi bien un obstacle qui porterait la famille d un
   autre qu une famille que plus aucun obstacle ne tire. */
export const B_CHAINE = 0, B_MACHINE = 1, B_POSTE = 2,
             B_FOUR = 3, B_CONDUITE = 4, B_CUVE = 5,
             B_RUINE = 6, B_MUR = 7, B_CARCASSE = 8,
             B_FRAGMENT = 9, B_TRAVEE = 10, B_DEBRIS = 11,
             B_DEVANTURE = 12, B_PYLONE = 13, B_CONTENEUR = 14,
             B_PALETTIER = 15, B_PILE = 16, B_QUAI = 17, B_REMORQUE = 18,
             B_ETABLI = 19, B_OUVERTE = 20, B_TRANSFO = 21, B_CLOTURE = 22,
             B_MOULE = 23, B_MALAXEUR = 24, B_BASSIN = 25,
             B_EPAVES = 26, B_GRILLAGE = 27, B_POTEAU = 28, B_BANCHE = 29,
             B_BRAS = 30, B_COQUE = 31, B_CLOISON = 32, B_CONSOLE = 33,
             B_AVEUGLE = 34, B_ESCALIER = 35, B_MONOLITHE = 36, B_ETAL = 37,
             B_FOSSE = 38, B_POUTRE = 39,
             B_LAMINOIR = 40,
             B_MEMBRURE = 41, B_BORDE = 42,
             B_ALVEOLE = 43, B_COURSIVE = 44,
             B_BAC = 45, B_HOTTE = 46, B_CAGE = 47, B_PORTIQUE = 48,
             B_TAS = 49, B_BOSQUET = 50, B_RONCE = 51,
             B_TUNNEL = 52, B_TOURNANTE = 53, B_CONVERTISSEUR = 54,
             B_TALUS = 55, B_PORTAIL = 56, B_DALLE = 57,
             B_ROCHE = 58, B_SAS = 59, B_ABRIBUS = 60,
             B_VEHICULE = 61, B_TOURNIQUET = 62, B_BARRIERE = 63, B_GUERITE = 64,
             B_CULTURE = 65, B_TORE = 66, B_PARABOLE = 67,
             B_WAGON = 68, B_BALLE = 69, B_FERME = 70,
             B_GABARIT = 71, B_CABINE = 72, B_BRAME = 73,
             B_BENNE = 74, B_CHAUDIERE = 75, B_CHARGEUR = 76,
             B_FONTAINE = 77, B_SOUTENEMENT = 78, B_BITTE = 79, B_BANQUE = 80,
             B_ARRIMAGE = 81, B_NAVETTE = 82, B_ECHANGEUR = 83, B_FOREUSE = 84,
             B_SILO = 85, B_CRASSE = 86, B_PAILLASSE = 87,
             B_ISOLATEUR = 88, B_POMPE = 89, B_DECANTEUR = 90;

export const BLOCS = [
  { key: "chaine", lieu: "usine" },
  { key: "machine", lieu: "usine" },
  { key: "poste", lieu: "usine" },
  { key: "four", lieu: "fonderie" },
  { key: "conduite", lieu: "fonderie" },
  { key: "cuve", lieu: "fonderie" },
  { key: "ruine", lieu: "friche" },
  { key: "mur", lieu: "friche" },
  { key: "carcasse", lieu: "friche" },
  { key: "fragment", lieu: "nebuleuse" },
  { key: "travee", lieu: "nebuleuse" },
  { key: "debris", lieu: "nebuleuse" },
  { key: "devanture", lieu: "secteur" },
  { key: "pylone", lieu: "secteur" },
  { key: "conteneur", lieu: "secteur" },
  // LES QUATRE PREMIERES FAMILLES QUI N APPARTIENNENT QU A UN BIOME, pas au
  // theme entier : c est ce que le plan 39 appelle une SIGNATURE, et c est ce
  // qui manquait — les vingt regions du depot employaient les TROIS familles de
  // leur theme, donc aucune n avait d objet a elle.
  { key: "palettier", lieu: "usine" },
  { key: "pile", lieu: "usine" },
  { key: "quai", lieu: "usine" },
  { key: "remorque", lieu: "usine" },
  { key: "etabli", lieu: "usine" },
  { key: "ouverte", lieu: "usine" },
  { key: "transfo", lieu: "usine" },
  { key: "cloture", lieu: "usine" },
  { key: "moule", lieu: "fonderie" },
  { key: "malaxeur", lieu: "fonderie" },
  { key: "bassin", lieu: "fonderie" },
  { key: "epaves", lieu: "friche" },
  { key: "grillage", lieu: "friche" },
  { key: "poteau", lieu: "friche" },
  { key: "banche", lieu: "friche" },
  { key: "bras", lieu: "nebuleuse" },
  { key: "coque", lieu: "nebuleuse" },
  { key: "cloison", lieu: "nebuleuse" },
  { key: "console", lieu: "nebuleuse" },
  { key: "aveugle", lieu: "secteur" },
  { key: "escalier", lieu: "secteur" },
  { key: "monolithe", lieu: "secteur" },
  { key: "etal", lieu: "secteur" },
  { key: "fosse", lieu: "fonderie" },
  { key: "poutre", lieu: "usine" },
  { key: "laminoir", lieu: "fonderie" },
  { key: "membrure", lieu: "nebuleuse" },
  { key: "borde", lieu: "nebuleuse" },
  { key: "alveole", lieu: "secteur" },
  { key: "coursive", lieu: "secteur" },
  { key: "bac", lieu: "usine" },
  { key: "hotte", lieu: "usine" },
  { key: "cage", lieu: "usine" },
  { key: "portique", lieu: "usine" },
  { key: "tas", lieu: "fonderie" },
  { key: "bosquet", lieu: "friche" },
  { key: "ronce", lieu: "friche" },
  /* NEUF FAMILLES POUR LES NEUF REGIONS QUI N EN AVAIENT AUCUNE A ELLES. Ce
     sont exactement les regions d ORIGINE de chaque theme : elles employaient
     les trois memes familles historiques, donc trois paires du depot etaient a
     un Jaccard de 1,00 sur le bati. Aucune silhouette neuve — caisson, cadre et
     masse molle portent les neuf. */
  { key: "tunnel", lieu: "usine" },
  { key: "tournante", lieu: "usine" },
  { key: "convertisseur", lieu: "fonderie" },
  { key: "talus", lieu: "friche" },
  { key: "portail", lieu: "friche" },
  { key: "dalle", lieu: "friche" },
  { key: "roche", lieu: "nebuleuse" },
  { key: "sas", lieu: "nebuleuse" },
  { key: "abribus", lieu: "secteur" },
  { key: "vehicule", lieu: "secteur" },
  { key: "tourniquet", lieu: "secteur" },
  { key: "barriere", lieu: "secteur" },
  { key: "guerite", lieu: "secteur" },
  { key: "culture", lieu: "nebuleuse" },
  { key: "tore", lieu: "nebuleuse" },
  { key: "parabole", lieu: "nebuleuse" },
  { key: "wagon", lieu: "friche" },
  { key: "balle", lieu: "friche" },
  { key: "ferme", lieu: "friche" },
  { key: "gabarit", lieu: "fonderie" },
  { key: "cabine", lieu: "fonderie" },
  { key: "brame", lieu: "fonderie" },
  { key: "benne", lieu: "usine" },
  { key: "chaudiere", lieu: "usine" },
  { key: "chargeur", lieu: "usine" },
  { key: "fontaine", lieu: "secteur" },
  { key: "soutenement", lieu: "secteur" },
  { key: "bitte", lieu: "secteur" },
  { key: "banque", lieu: "secteur" },
  { key: "arrimage", lieu: "nebuleuse" },
  { key: "navette", lieu: "nebuleuse" },
  { key: "echangeur", lieu: "nebuleuse" },
  { key: "foreuse", lieu: "nebuleuse" },
  { key: "silo", lieu: "fonderie" },
  { key: "crasse", lieu: "fonderie" },
  { key: "paillasse", lieu: "fonderie" },
  { key: "isolateur", lieu: "friche" },
  { key: "pompe", lieu: "friche" },
  { key: "decanteur", lieu: "friche" },
];

export function blocAt(k) { return BLOCS[k] ?? null; }
export function blocsDe(lieu) {
  const v = [];
  for (let i = 0; i < BLOCS.length; i++) if (BLOCS[i].lieu === lieu) v.push(i);
  return v;
}

/* LES TAILLES REELLES d une famille, en pixels, sans passer par `buildBiome`.
   `verifierEmpreinte()` (`render/blocs.js`) doit juger une silhouette sur les
   gabarits qu elle porte VRAIMENT : un chanfrein de 16 px ne dit pas la meme
   chose sur 99 x 59 que sur 232 x 135, et une forme jugee sur une taille
   inventee ne prouve rien. Une cellule d implantation vaut exactement une vue,
   donc la fraction se lit en pixels sans autre conversion. */
export function gabaritsDe(kind, viewW = 1600, viewH = 900) {
  const f = blocAt(kind);
  if (!f) return [];
  const v = [];
  // LA POSE DEPLIEE, sinon une entree oblique rend `NaN x NaN` : elle n a ni
  // `w` ni `h`, et `verifierEmpreinte` jugeait une silhouette sur du vide.
  for (const o of (OBSTACLES[f.lieu] ?? []).flatMap(v => deplierPose(v.poser))) {
    if (o.kind !== kind) continue;
    const w = o.w * viewW, h = o.h * viewH;
    if (!v.some(g => Math.abs(g[0] - w) < 0.5 && Math.abs(g[1] - h) < 0.5)) v.push([w, h]);
  }
  return v;
}

/* AUCUNE COULEUR ICI. Elle vivait a la fois dans `tint`/`grid` et dans la
   palette, et les deux moities se neutralisaient. La charte d'un lieu est
   entiere dans `BIOME_SKIN` — ce module decide de la GEOMETRIE, jamais du ton.

   `fond` declare que ce biome a un ARRIERE-PLAN : la matiere y laisse des baies
   transparentes au lieu de couvrir la tuile, et c'est le seul champ que le rendu
   lit pour le savoir. */
export const BIOMES = [
  {
    key: "usine", nom: "Usine",
    resume: "chaînes de production, allées franches",
  },
  {
    key: "fonderie", nom: "Fonderie",
    resume: "deux fours massifs, une coulée entre eux",
  },
  {
    key: "friche", nom: "Friche",
    resume: "deux champs de ruines, terrain nu au milieu",
  },
  {
    key: "nebuleuse", nom: "Nébuleuse",
    resume: "épaves à la dérive, verrières ouvertes sur le vide",
    fond: "espace",
  },
  /* LE SEUL LIEU HABITE, ET C EST SON VERBE : les quatre autres FONT quelque
     chose — fabriquer, couler, pourrir, deriver — celui-ci S ADRESSE A VOUS.
     Tout y est une surface qui vend : devantures, enseignes, panneaux. C est
     aussi le seul dont la matiere soit MOUILLEE, et l eau est ce qui autorise
     le neon a exister deux fois, en l air et par terre. */
  {
    key: "secteur", nom: "Secteur",
    resume: "rues trempées, néons et passerelles",
    /* IL EST SURELEVE, et c est son fond qui le dit. Un secteur logistique pose
       au-dessus de la megapole : ce qui se voit par ses caillebotis est la ville,
       trente etages plus bas. C est aussi ce qui justifie ce que le lieu porte
       deja au sol — ses grilles d air, ses plaques d egout et son effluent
       donnent tous sur QUELQUE CHOSE. */
    fond: "ville",
  },
];

export function biomeAt(i) { return BIOMES[i] ?? BIOMES[0]; }
export const biomeNom = i => t(`biome.${biomeAt(i).key}.nom`, biomeAt(i).nom);
export const biomeResume = i => t(`biome.${biomeAt(i).key}.resume`, biomeAt(i).resume);

export function mulberry32(seed) { return rng(seed); }

function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* LA COMPOSITION, ET C EST ELLE QUI FAIT PARCOURIR UN LIEU. Les quatre tables
   etaient quatre semis de rectangles dans la meme gamme de taille : un espace
   uniformement encombre, sans dense ni ouvert, donc sans rythme. Une arene se
   traverse, elle ne se pietine pas.

   Chaque lieu a maintenant SA loi d implantation :
     USINE      des bandes — chaine, allee, chaine. Long et mince, orthogonal.
     FONDERIE   deux masses et un couloir entre elles. Peu d objets, enormes.
     FRICHE     deux champs de ruines et du terrain nu au milieu. Epars, casse.
     NEBULEUSE  le CONTRASTE DE TAILLE, et le centre reste vide. Deux masses en
                diagonale, deux travees a l aplomb des bords — tres longues, deux
                fois plus fines que la chaine d Usine —, et des eclats. Sa loi
                etait celle de l Usine a un centieme pres (barre 0,230 x 0,036
                contre 0,300 x 0,034) : deux lieux avec la meme implantation sont
                le meme lieu, quelle que soit la couleur du sol.

   LE CARRE CENTRAL RESTE TRAVERSABLE dans les deux axes — `verifierBiomes()`
   le rejoue a chaque graine ET A CHAQUE MODE, et c est ce qui autorise des
   masses pareilles sans jamais enfermer une equipe.

   `min` EST LE MODE A PARTIR DUQUEL UNE ENTREE EXISTE (0 partout, 1 des le
   normal, 2 en cauchemar seul). La geometrie etait identique dans les trois
   modes ; c etait ecrit comme un invariant, et ca ne l est plus.

   CE QUI CHANGE EST CE QU IL Y A, PAS LA TAILLE DE CE QU IL Y A. Un facteur
   d echelle sur `w`/`h` aurait donne la meme arene grossie — donc le meme
   parcours, avec moins de place —, alors qu une entree en plus ou en moins
   change le CHEMIN. C est la difference entre « plus exigeant spatialement » et
   « le joueur ne peut plus bouger », et c est le §12 du cahier des charges.

   Les entrees retirees au calme sont celles qui encombrent le MILIEU, celles
   ajoutees au cauchemar sont pres des BORDS : on ouvre par le centre et on
   resserre par le pourtour. Aucun point de vie, aucun degat, aucun
   multiplicateur ne bouge — la difficulte reste celle des systemes existants. */
/* LES BORDS D UNE VARIANTE, DECLARES ET PAS DEDUITS. Le probleme des
   transitions entre deux regions voisines est un probleme de WANG TILES : elles
   doivent s accorder sur l arete partagee. On ne laisse pas l assembleur
   deviner — chaque variante dit l etat de ses quatre bords, et l assembleur ne
   pose que des variantes compatibles avec le voisin deja pose.
   TROIS ETATS SEULEMENT, parce qu il n en faut pas plus pour dire ce qui compte
   a une arete : est-ce qu on passe, est-ce qu on se faufile, est-ce qu on
   contourne. Deux bords s accordent s ils ne sont pas MUR tous les deux — deux
   murs face a face ferment une arete interne, et une arete fermee sur un 2 x 2
   coupe l arene en deux. */
export const BORD_OUVERT = 0, BORD_ENCOMBRE = 1, BORD_MUR = 2;
export const bordsAccordes = (a, b) => !(a === BORD_MUR && b === BORD_MUR);

/* LE BORD APPARTIENT A LA REGION, PLUS A LA CELLULE — ET LE MIROIR DIT POURQUOI.

   `bordsDe(v, mx, my)` retournait les bords avec la cellule. Or `mx` et `my`
   changent de valeur d une cellule a sa voisine, TOUJOURS : `my = cy & 1` bascule
   d une ligne a l autre, `mx = (cx + cy) & 1` d une colonne a l autre. En
   deroulant, le bord SUD de la cellule du dessus et le bord NORD de celle du
   dessous sont le MEME element de la table — un bord rencontrait lui-meme. Une
   loi portant un `BORD_MUR` etait donc incompatible avec ELLE-MEME, et comme une
   region entiere porte une seule loi, la reparation d arete reecrivait la moitie
   de ses cellules : mesure, 50 % sur la Friche (le cratere, deux murs) et 48 %
   sur la Nebuleuse (la breche, un mur). La region cessait de se lire.

   LA CONTRAINTE REMONTE DONC D UN CRAN. Une region est uniforme par
   construction, il n y a rien a accorder dedans ; ce qui se touche vraiment,
   c est DEUX REGIONS, et deux lois s accordent si aucun de leurs quatre bords
   n est `BORD_MUR` des deux cotes. Les orientations restent, elles ne portent
   que la GEOMETRIE. */
export const loisAccordees = (a, b) =>
  a.bords.every((x, k) => bordsAccordes(x, b.bords[k]));

/* LES VARIANTES D UN THEME, ECRITES COMME DES LOIS D IMPLANTATION ET PAS COMME
   DES DECORS. Ce qui change est CE QU IL Y A, pas la taille de ce qu il y a : un
   facteur d echelle donne la meme arene grossie, donc le meme parcours.
   LA VARIANTE 0 EST LA LOI HISTORIQUE DU LIEU, a l identique. C est elle que
   toutes les mesures des plans precedents ont vue, et la deplacer invaliderait
   des relevees qui n ont rien demande. */
const OBSTACLES = {
  usine: [
    { cle: "chaine", nom: "la chaine", label: "La chaîne", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.28, y: 0.16, w: 0.230, h: 0.036, kind: B_CHAINE },
      { x: 0.72, y: 0.84, w: 0.230, h: 0.036, kind: B_CHAINE },
      { x: 0.10, y: 0.16, w: 0.048, h: 0.090, kind: B_POSTE },
      { x: 0.90, y: 0.84, w: 0.048, h: 0.090, kind: B_POSTE },
      { x: 0.34, y: 0.52, w: 0.052, h: 0.130, kind: B_MACHINE, min: 1 },
      { x: 0.66, y: 0.48, w: 0.052, h: 0.130, kind: B_MACHINE, min: 1 },
      { x: 0.50, y: 0.90, w: 0.070, h: 0.048, kind: B_POSTE },
      { x: 0.14, y: 0.74, w: 0.048, h: 0.090, kind: B_POSTE, min: 2 },
      { x: 0.86, y: 0.24, w: 0.052, h: 0.130, kind: B_MACHINE, min: 2 },
      /* LE TUNNEL DE CUISSON — CE QUE LA CHAINE TRAVERSE. Une chaine sans lui
         n est qu une bande : le tunnel est la seule masse du theme qu un objet
         ENTRE d un cote et SORTE de l autre, et c est ce qui dit qu il se passe
         quelque chose ici plutot qu ailleurs. */
      { x: 0.52, y: 0.16, w: 0.150, h: 0.060, kind: B_TUNNEL },
      { x: 0.32, y: 0.86, w: 0.150, h: 0.060, kind: B_TUNNEL, min: 1 },
    ] },
    /* LE CARREFOUR — deux allees larges qui se croisent, quatre ilots. La loi
       est l AXE : tout est pousse hors des deux bandes centrales, et ce qui
       reste se contourne au lieu de se longer. */
    { cle: "carrefour", nom: "le carrefour", label: "Le carrefour", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.22, y: 0.22, w: 0.052, h: 0.130, kind: B_MACHINE },
      { x: 0.78, y: 0.78, w: 0.052, h: 0.130, kind: B_MACHINE },
      { x: 0.78, y: 0.22, w: 0.052, h: 0.130, kind: B_MACHINE, min: 1 },
      { x: 0.22, y: 0.78, w: 0.052, h: 0.130, kind: B_MACHINE, min: 2 },
      /* 0,12 CONTRE LE BORD, ET C EST LA MEME MESURE QUE LA FONDERIE. Une
         chaine a 0,07 laisse 38 px libres contre le bord de la cellule pour un
         `PASSAGE_MIN` de 80 : un corps s y tient, la grille y voit un mur, et
         c est exactement l abri parfait que le depot a deja paye une fois. */
      { x: 0.50, y: 0.12, w: 0.230, h: 0.036, kind: B_CHAINE },
      { x: 0.50, y: 0.88, w: 0.230, h: 0.036, kind: B_CHAINE, min: 1 },
      /* LA PETITE TOURNANTE TIENT LE CONTRASTE, ET ELLE A REMPLACE UN POSTE.
         Le petit format est necessaire — sans lui la variante n a que deux
         gabarits, donc un rapport max/min de 1,2 contre 2,5 ailleurs. Mais un
         POSTE ici donnait au carrefour exactement les trois familles de la
         chaine : 60 % de Jaccard sur le bati, pour un plafond de 50. Le meme
         role, la famille de la region, et le recouvrement tombe a 40 %. */
      { x: 0.50, y: 0.18, w: 0.070, h: 0.048, kind: B_TOURNANTE },
      /* LA TABLE TOURNANTE — CE QUI FAIT D UN CROISEMENT UN CARREFOUR. Elle est
         DANS UN ILOT et jamais sur la croisee : la loi de la region est que les
         deux bandes centrales restent franches, et une masse au milieu la
         detruirait au lieu de la dire. */
      { x: 0.36, y: 0.36, w: 0.080, h: 0.120, kind: B_TOURNANTE },
      { x: 0.64, y: 0.64, w: 0.080, h: 0.120, kind: B_TOURNANTE, min: 1 },
    ] },
    /* LA MAINTENANCE — ON REPARE, DONC RIEN N EST FINI. Elle remplace
       « l atelier », dont le nom promettait des etablis et qui posait des
       armoires en petit. Deux familles a elle : l ETABLI, bas et long, le seul
       objet du theme qu on contourne sans jamais le perdre de vue ; et la
       MACHINE OUVERTE, dont les capots sont poses A COTE d elle — un objet qui
       raconte qu on l a demontee.
       Semis dense et anguleux : on tire court, on ne voit jamais loin, et
       aucune masse ne coupe un passage. */
    { cle: "maintenance", nom: "la maintenance", label: "La maintenance", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      { x: 0.20, y: 0.14, w: 0.110, h: 0.030, kind: B_ETABLI },
      { x: 0.75, y: 0.22, w: 0.110, h: 0.030, kind: B_ETABLI },
      { x: 0.30, y: 0.72, w: 0.110, h: 0.030, kind: B_ETABLI, min: 1 },
      { x: 0.70, y: 0.86, w: 0.110, h: 0.030, kind: B_ETABLI, min: 1 },
      { x: 0.14, y: 0.30, w: 0.060, h: 0.100, kind: B_OUVERTE },
      { x: 0.86, y: 0.70, w: 0.060, h: 0.100, kind: B_OUVERTE, min: 1 },
      { x: 0.38, y: 0.50, w: 0.060, h: 0.100, kind: B_OUVERTE, min: 2 },
      { x: 0.60, y: 0.14, w: 0.070, h: 0.048, kind: B_POSTE },
      { x: 0.24, y: 0.90, w: 0.070, h: 0.048, kind: B_POSTE, min: 1 },
      { x: 0.92, y: 0.14, w: 0.048, h: 0.090, kind: B_POSTE, min: 2 },
      { x: 0.50, y: 0.90, w: 0.052, h: 0.130, kind: B_MACHINE },
    ] },
    /* LES UTILITES — ON ALIMENTE, ET RIEN N Y EST INOFFENSIF. Un parc de
       transformateurs sur reseau regulier, ceint d une CLAIRE-VOIE : le premier
       obstacle du depot qui bloque le CORPS sans cacher la VUE. C est un
       comportement inedit et immediatement lisible, et c est toute l identite de
       la region.
       Le reseau saute sa case centrale : les deux dangers de l Usine y sont. */
    { cle: "utilites", nom: "les utilites", label: "Les utilités", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.20, y: 0.16, w: 0.056, h: 0.070, kind: B_TRANSFO },
      { x: 0.50, y: 0.16, w: 0.056, h: 0.070, kind: B_TRANSFO },
      { x: 0.80, y: 0.16, w: 0.056, h: 0.070, kind: B_TRANSFO, min: 1 },
      { x: 0.08, y: 0.50, w: 0.056, h: 0.070, kind: B_TRANSFO },
      { x: 0.95, y: 0.50, w: 0.056, h: 0.070, kind: B_TRANSFO, min: 1 },
      { x: 0.20, y: 0.84, w: 0.056, h: 0.070, kind: B_TRANSFO, min: 1 },
      { x: 0.50, y: 0.84, w: 0.056, h: 0.070, kind: B_TRANSFO, min: 2 },
      { x: 0.80, y: 0.84, w: 0.056, h: 0.070, kind: B_TRANSFO, min: 2 },
      { x: 0.30, y: 0.30, w: 0.200, h: 0.016, kind: B_CLOTURE },
      { x: 0.74, y: 0.74, w: 0.200, h: 0.016, kind: B_CLOTURE, min: 1 },
    ] },
    /* LE DEGAGEMENT — la respiration du theme. Presque vide, deux masses
       isolees contre les bords : on y traverse en ligne droite, et c est
       precisement ce qu aucune autre variante ne permet. */
    { cle: "degagement", nom: "le degagement", label: "Le dégagement", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.12, y: 0.30, w: 0.052, h: 0.130, kind: B_MACHINE },
      { x: 0.88, y: 0.70, w: 0.052, h: 0.130, kind: B_MACHINE },
      { x: 0.50, y: 0.12, w: 0.230, h: 0.036, kind: B_CHAINE },
      { x: 0.50, y: 0.88, w: 0.230, h: 0.036, kind: B_CHAINE, min: 1 },
      { x: 0.10, y: 0.86, w: 0.048, h: 0.090, kind: B_MACHINE, min: 2 },
      { x: 0.90, y: 0.14, w: 0.048, h: 0.090, kind: B_MACHINE, min: 2 },
      /* PAS DE POSTE ICI, ET C EST UNE MESURE. Le degagement portait les trois
         familles de la chaine — 60 % de Jaccard sur le bati pour une visee de 50. On
         ne travaille pas dans un degagement : la cellule y remplace le poste, et
         la region garde ses trois formats. */
      { x: 0.11, y: 0.68, w: 0.048, h: 0.090, kind: B_MACHINE, min: 1 },
      /* LA SEULE OBLIQUE DU DEPOT, ET ELLE EST ICI PARCE QUE LA PLACE Y EST.
         Tout le reste du jeu est horizontal ou vertical : une charpente tombee
         donne une direction qui n est ni l une ni l autre, et ca se lit
         instantanement. Le degagement est la region la plus vide du theme et
         l Usine ne tremble pas (`jMax` nul) — la Friche, elle, decale de 40 px
         par cellule et fermait des ilots avec la meme poutre. */
      { oblique: true, x0: 0.62, y0: 0.24, x1: 0.88, y1: 0.34, ep: 0.036, kind: B_POUTRE },
      // UNE SEULE CHARPENTE TOMBEE NE SE VOYAIT QUE DANS 83 % DES VUES du
      // degagement, pour un plancher de 90 : elle est sa seule famille a elle,
      // et une signature qui manque une vue sur six n en est pas une.
      { oblique: true, x0: 0.20, y0: 0.70, x1: 0.42, y1: 0.78, ep: 0.036, kind: B_POUTRE, min: 1 },
    ] },
    /* LE MAGASIN — ON GARDE, ON NE TRANSFORME PAS. Des travees de racks
       paralleles, ouvertes aux DEUX bouts, et des allees entre elles. C est la
       premiere region du depot qui pose une famille que personne d autre n a :
       le palettier, long et mince, dont la repetition reguliere EST la
       silhouette. Rien de ce qui fabrique n entre ici. */
    { cle: "magasin", nom: "le magasin", label: "Le magasin", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      // les travees s ecartent de 0,20 en y, soit 180 px : plus du double de
      // `PASSAGE_MIN`, et c est la contrainte qui interdit le quinconce serre.
      /* LES TRAVEES SE POSENT ENTRE LES DANGERS, ET C EST LE CAUCHEMAR QUI
         COMMANDE. L Usine y porte cinq dangers dont une braise qui BALAIE
         420 px en x : la bande y = 0,60 a 0,72 lui appartient sur toute la
         moitie centrale, et le geyser de gauche tient x = 0,12 a 0,20 autour de
         y = 0,50. Les quatre rangs sont donc alternes en x ET cales sur les
         creux — ce n est pas un reglage esthetique, le verificateur refuse un
         danger sous un obstacle. Ecart minimal 0,20, soit 180 px, deux fois
         le passage minimal. */
      { x: 0.70, y: 0.16, w: 0.250, h: 0.030, kind: B_PALETTIER },
      { x: 0.30, y: 0.36, w: 0.250, h: 0.030, kind: B_PALETTIER },
      { x: 0.86, y: 0.68, w: 0.220, h: 0.030, kind: B_PALETTIER, min: 1 },
      { x: 0.30, y: 0.88, w: 0.250, h: 0.030, kind: B_PALETTIER, min: 1 },
      // ce qui attend au pied d une travee, et qui se degage au tir.
      { x: 0.10, y: 0.28, w: 0.046, h: 0.052, hp: 1, kind: B_PILE },
      { x: 0.90, y: 0.16, w: 0.046, h: 0.052, hp: 1, kind: B_PILE, min: 1 },
      { x: 0.12, y: 0.68, w: 0.040, h: 0.044, hp: 1, kind: B_PILE, min: 2 },
      { x: 0.88, y: 0.88, w: 0.040, h: 0.044, hp: 1, kind: B_PILE, min: 2 },
      { x: 0.50, y: 0.08, w: 0.052, h: 0.130, kind: B_MACHINE },
    ] },
    /* LE TRAITEMENT DE SURFACE — ON TREMPE, DONC IL Y A UN TROU. La seule region
       du depot dont la trame soit une ABSENCE : une saignee de bacs traverse le
       quartier, on la franchit en trois points, et le reste du semis se tient sur
       ses bords. Les hottes coupent la vue en hauteur sans rien bloquer au sol.
       C est aussi le seul sol AJOURE de l Usine — on marche sur le caillebotis
       d une passerelle, pas sur du beton. */
    { cle: "traitement", nom: "le traitement", label: "Le traitement", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.20, y: 0.14, w: 0.100, h: 0.070, kind: B_BAC },
      { x: 0.62, y: 0.14, w: 0.100, h: 0.070, kind: B_BAC },
      { x: 0.20, y: 0.86, w: 0.100, h: 0.070, kind: B_BAC, min: 1 },
      { x: 0.80, y: 0.86, w: 0.100, h: 0.070, kind: B_BAC, min: 2 },
      { x: 0.34, y: 0.28, w: 0.070, h: 0.050, kind: B_HOTTE },
      { x: 0.76, y: 0.72, w: 0.070, h: 0.050, kind: B_HOTTE, min: 1 },
      { x: 0.10, y: 0.66, w: 0.070, h: 0.050, kind: B_HOTTE, min: 2 },
    ] },
    /* LA ZONE ROBOTISEE — PERSONNE N Y MARCHE. Des cellules grillagees, un
       portique qui les enjambe, et un sol NEUF : c est la seule region du depot
       ou le sol n a pas d usure, parce que rien de vivant n y passe. Un endroit
       propre dans une usine sale dit tout.
       La cage est un CADRE, donc elle bloque le corps et laisse voir ce qui
       travaille dedans — la meme silhouette que la claire-voie des utilites, un
       cran plus serree. */
    { cle: "robotisee", nom: "la zone robotisee", label: "La zone robotisée", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.14, y: 0.20, w: 0.060, h: 0.080, kind: B_CAGE },
      { x: 0.86, y: 0.20, w: 0.060, h: 0.080, kind: B_CAGE },
      { x: 0.14, y: 0.80, w: 0.060, h: 0.080, kind: B_CAGE, min: 1 },
      { x: 0.86, y: 0.80, w: 0.060, h: 0.080, kind: B_CAGE, min: 1 },
      { x: 0.50, y: 0.14, w: 0.060, h: 0.080, kind: B_CAGE, min: 2 },
      { x: 0.30, y: 0.30, w: 0.220, h: 0.020, kind: B_PORTIQUE },
      { x: 0.50, y: 0.86, w: 0.220, h: 0.020, kind: B_PORTIQUE, min: 1 },
    ] },
    /* L EXPEDITION — LE BORD DU BATIMENT. Une file de quais sur un cote, les
       remorques a cul, et une aire de manoeuvre franche devant. La loi est
       l ASYMETRIE : tout d un cote, rien de l autre, et le miroir de cellule
       fait changer ce cote d une region a l autre.
       La remorque est le premier CHASSIS de l Usine — la silhouette existait a
       la Friche, la matiere non : une remorque en service n est pas une epave,
       et c est exactement ce que le couple silhouette x habillage permet. */
    /* LA COUR — ON EST DEHORS, ET C EST LA PREMIERE FOIS DU THEME. Les huit
       autres regions de l Usine sont des interieurs : un sol coule, un toit
       implicite, une lumiere d atelier. Ici c est de la TERRE BATTUE, et rien
       d autre du theme n en a. Des bennes alignees le long d un mur, ce qu on
       sort du batiment et qu on n a pas encore emporte.
       C est aussi la seule region ou la Friche et l Usine se touchent — sans
       partager une seule famille. */
    { cle: "cour", nom: "la cour", label: "La cour", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.24, y: 0.20, w: 0.100, h: 0.055, kind: B_BENNE },
      { x: 0.24, y: 0.34, w: 0.100, h: 0.055, kind: B_BENNE },
      { x: 0.76, y: 0.80, w: 0.100, h: 0.055, kind: B_BENNE, min: 1 },
      { x: 0.76, y: 0.66, w: 0.100, h: 0.055, kind: B_BENNE, min: 1 },
      { x: 0.26, y: 0.44, w: 0.100, h: 0.055, kind: B_BENNE, min: 2 },
      { x: 0.70, y: 0.22, w: 0.052, h: 0.130, kind: B_MACHINE },
      { x: 0.30, y: 0.78, w: 0.052, h: 0.130, kind: B_MACHINE, min: 1 },
    ] },
    /* LA CHAUFFERIE — DE LA BRIQUE, ET C EST LE SEUL ENDROIT CHAUD DE L USINE.
       La Fonderie entiere est chaude ; ici la chaleur est CONFINEE dans trois
       corps de chaudiere et le reste du theme n en sait rien. Le sol est
       mineral parce qu on ne coule pas de beton sous une chaudiere.
       Elle reprend l OCTOGONE du four : ce qui contient une combustion n a pas
       de coin, quel que soit le thème. */
    { cle: "chaufferie", nom: "la chaufferie", label: "La chaufferie", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.28, y: 0.30, w: 0.100, h: 0.130, kind: B_CHAUDIERE },
      { x: 0.72, y: 0.70, w: 0.100, h: 0.130, kind: B_CHAUDIERE, min: 1 },
      { x: 0.72, y: 0.30, w: 0.100, h: 0.130, kind: B_CHAUDIERE, min: 2 },
      { x: 0.50, y: 0.86, w: 0.230, h: 0.036, kind: B_CHAINE },
      { x: 0.14, y: 0.66, w: 0.048, h: 0.090, kind: B_POSTE },
    ] },
    /* LA ZONE DE CHARGE — LE SEUL SOL DU DEPOT QU ON AIT CHOISI. Une resine
       epoxy teintee, lustree, avec ses cloques : quelqu un a voulu que ce coin
       ait l air propre, et il vieillit mal. Les bornes de charge sont basses,
       alignees, et chacune porte un cable au sol — la seule region du theme ou
       l objet dominant soit a hauteur de genou.
       On y range les engins la nuit : rien n y travaille, tout y attend. */
    { cle: "charge", nom: "la zone de charge", label: "La zone de charge", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.22, y: 0.26, w: 0.036, h: 0.070, kind: B_CHARGEUR },
      { x: 0.38, y: 0.26, w: 0.036, h: 0.070, kind: B_CHARGEUR },
      { x: 0.62, y: 0.74, w: 0.036, h: 0.070, kind: B_CHARGEUR, min: 1 },
      { x: 0.78, y: 0.74, w: 0.036, h: 0.070, kind: B_CHARGEUR, min: 1 },
      { x: 0.22, y: 0.74, w: 0.036, h: 0.070, kind: B_CHARGEUR, min: 2 },
      { x: 0.78, y: 0.26, w: 0.036, h: 0.070, kind: B_CHARGEUR, min: 2 },
      // ni 0,50 : la braise de cauchemar occupe le centre exact de la cellule.
      { x: 0.40, y: 0.50, w: 0.070, h: 0.048, kind: B_POSTE },
    ] },
    { cle: "expedition", nom: "l expedition", label: "L'expédition", bords: [BORD_MUR, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.12, y: 0.16, w: 0.070, h: 0.100, kind: B_QUAI },
      { x: 0.12, y: 0.34, w: 0.070, h: 0.100, kind: B_QUAI },
      { x: 0.12, y: 0.64, w: 0.070, h: 0.100, kind: B_QUAI, min: 1 },
      { x: 0.12, y: 0.88, w: 0.070, h: 0.100, kind: B_QUAI, min: 2 },
      /* LA REMORQUE EST A CUL DU QUAI, donc juste devant lui et plus longue.
         0,130 et pas 0,150 : a 0,150 son nez atteignait 552 px et entrait dans
         le balayage de la braise, qui commence a 535. */
      { x: 0.26, y: 0.16, w: 0.130, h: 0.062, kind: B_REMORQUE },
      { x: 0.26, y: 0.64, w: 0.130, h: 0.062, kind: B_REMORQUE, min: 1 },
      { x: 0.26, y: 0.34, w: 0.130, h: 0.062, kind: B_REMORQUE, min: 2 },
      // l aire de manoeuvre reste FRANCHE : deux piles au pourtour, rien au
      // milieu. C est la seule region de l Usine ou l on voit d un bout a l autre.
      { x: 0.72, y: 0.12, w: 0.046, h: 0.052, hp: 1, kind: B_PILE },
      { x: 0.88, y: 0.86, w: 0.046, h: 0.052, hp: 1, kind: B_PILE, min: 1 },
      { x: 0.62, y: 0.90, w: 0.040, h: 0.044, hp: 1, kind: B_PILE, min: 2 },
    ] },
  ],
  /* LES CONDUITES ETAIENT A 0,06 ET LA FONDERIE AVAIT LE SEUL ABRI PARFAIT DU
     DEPOT. La table se MIROITE par cellule : une conduite a 0,06 dans une cellule
     fait face a sa jumelle a 0,94 dans celle du dessus, a 108 px de centre a
     centre — 65 px d ecart libre, sur 416 px de long. Gonfle de `CLEARANCE`, il
     reste 36 px, moins qu une case : aucun centre ne tombe dedans, la grille y
     voit un mur, et la horde ne peut plus y entrer. Mesure : contact en 119 s au
     lieu de 4,4 s dans la fente jumelle mieux calee, et JAMAIS avec le spawner.
     Le meme objet fermait le meme abri contre le BORD de l arene, a 32 px.
     0,12 satisfait les deux contraintes de `NAV_CFG.PASSAGE_MIN` : 173 px entre
     deux conduites, 86 px contre le bord. */
  fonderie: [
    { cle: "coulee", nom: "la coulee", label: "La coulée", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.30, y: 0.30, w: 0.120, h: 0.190, kind: B_FOUR },
      { x: 0.70, y: 0.70, w: 0.120, h: 0.190, kind: B_FOUR },
      { x: 0.50, y: 0.12, w: 0.260, h: 0.048, kind: B_CONDUITE, min: 1 },
      // la derniere cuve devient un convertisseur : la coulee VERSE, elle ne
      // stocke pas — c est le refroidissement et le puits qui contiennent.
      { x: 0.12, y: 0.78, w: 0.070, h: 0.070, kind: B_CONVERTISSEUR },
      // deux des trois cuves DEVIENNENT des convertisseurs, a la case pres :
      // c est le meme recipient, et seul celui qui BASCULE a des tourillons.
      { x: 0.88, y: 0.22, w: 0.070, h: 0.070, kind: B_CONVERTISSEUR, min: 1 },
      { x: 0.08, y: 0.30, w: 0.070, h: 0.070, kind: B_CONVERTISSEUR, min: 2 },
      { x: 0.50, y: 0.88, w: 0.260, h: 0.048, kind: B_CONDUITE, min: 2 },
      /* LE CONVERTISSEUR — L AMONT DU FOUR, ET IL BASCULE. Le four chauffe, la
         cuve contient ; celui-ci VERSE, et ses deux tourillons disent de quel
         cote. C est le seul objet du theme dont on lise l ORIENTATION. */
    ] },
    /* LA SABLERIE — LA SEULE REGION DU DEPOT QUI SOIT PLATE. Elle remplace
       « les cuves », qui n etaient que des octogones moyens sans axe : deux
       tailles d une meme forme ne font pas deux endroits.
       Des chassis de sable POSES AU SOL, en rangees, et rien qui monte. C est
       une occupation BASSE : on voit loin, on tire loin, et pourtant les corps
       sont arretes — la ligne de vue et la ligne de marche divergent, ce qu
       aucune autre region ne fait.
       Le chassis reprend le CADRE des utilites avec une matiere de grain : la
       silhouette qui laisse voir a travers sert ici a montrer le SABLE. */
    { cle: "sablerie", nom: "la sablerie", label: "La sablerie", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      { x: 0.30, y: 0.22, w: 0.120, h: 0.190, kind: B_FOUR },
      { x: 0.62, y: 0.30, w: 0.090, h: 0.070, kind: B_MOULE },
      { x: 0.75, y: 0.14, w: 0.090, h: 0.070, kind: B_MOULE },
      { x: 0.27, y: 0.50, w: 0.090, h: 0.070, kind: B_MOULE },
      { x: 0.75, y: 0.50, w: 0.090, h: 0.070, kind: B_MOULE, min: 1 },
      { x: 0.27, y: 0.86, w: 0.090, h: 0.070, kind: B_MOULE, min: 1 },
      { x: 0.75, y: 0.86, w: 0.090, h: 0.070, kind: B_MOULE, min: 2 },
      { x: 0.50, y: 0.90, w: 0.070, h: 0.070, kind: B_MALAXEUR },
      { x: 0.10, y: 0.32, w: 0.070, h: 0.070, kind: B_MALAXEUR, min: 2 },
      // 0,14 et pas 0,10 : a 0,10 la conduite laissait 68 px entre elle et le
      // bord de cellule — un corps s y tient, la grille y voit un mur.
      { x: 0.50, y: 0.14, w: 0.260, h: 0.048, kind: B_CONDUITE, min: 1 },
    ] },
    /* LE REFROIDISSEMENT — masses courtes en quinconce. C EST LA GEOMETRIE DE
       L ABRI PARFAIT, et elle ne revient qu avec sa contrainte explicite :
       l ecart entre deux rangs vaut le DOUBLE de `NAV_CFG.PASSAGE_MIN`, jamais
       moins. 0,22 d ecart en y font 198 px pour un minimum de 80. */
    { cle: "refroidissement", nom: "le refroidissement", label: "Le refroidissement", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      // AUCUN FOUR DANS UN REFROIDISSEMENT : la contradiction etait ecrite dans
      // la table depuis l origine, et c est elle qui donnait 60 % de Jaccard
      // avec la coulee et le puits. Deux bassins de plus a la place.
      { x: 0.28, y: 0.32, w: 0.120, h: 0.190, kind: B_BASSIN },
      { x: 0.72, y: 0.68, w: 0.120, h: 0.190, kind: B_BASSIN },
      { x: 0.62, y: 0.28, w: 0.070, h: 0.070, kind: B_CUVE },
      { x: 0.38, y: 0.72, w: 0.070, h: 0.070, kind: B_CUVE, min: 1 },
      /* IL REFROIDIT VRAIMENT, ET C EST LA CORRECTION DU PLUS GROS ECART DU
         DEPOT ENTRE UN NOM ET UN PIXEL. La region s appelait « refroidissement »
         et il y faisait exactement aussi chaud qu a la coulee : meme teinte,
         meme emissif, meme sol. Le BASSIN de trempe est ce qui manquait — une
         surface sombre et calme dans un lieu orange, et la seule matiere froide
         du theme. */
      { x: 0.85, y: 0.24, w: 0.130, h: 0.090, kind: B_BASSIN },
      { x: 0.15, y: 0.76, w: 0.130, h: 0.090, kind: B_BASSIN },
      { x: 0.85, y: 0.76, w: 0.130, h: 0.090, kind: B_BASSIN, min: 1 },
      { x: 0.50, y: 0.86, w: 0.260, h: 0.048, kind: B_CONDUITE },
    ] },
    /* LE LAMINOIR — UNE FILE, ET RIEN D AUTRE. Le theme a deja un RUBAN — la
       coulee — mais elle est CONTINUE : une rigole court sans interruption. Un
       train de laminage est l inverse, des masses ENORMES et ESPACEES sur un axe
       strict, avec la table a rouleaux entre elles.
       C est la seule region du depot ou tout tient sur une ligne : la meilleure
       ligne de tir du jeu, et le pire endroit pour se faire encercler. */
    { cle: "laminoir", nom: "le laminoir", label: "Le laminoir", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      /* PAS DE TABLE A ROULEAUX, ET C EST LA MESURE QUI L A RETIREE. Une file de
         cages avec ses rouleaux entre elles est juste physiquement et fait un MUR
         en travers de la cellule : sept boites avec 8 a 56 px d ecart, donc le
         carre central cessait d etre traversable. Ce qui manque a un train de
         laminage est ce qui le rendait injouable ; les cages seules disent la
         meme chose, et les ecarts valent 360 et 264 px.
         Y = 0,26 ET PAS 0,50 : le milieu de la Fonderie appartient au champ de
         ralentissement en normal (679 a 921 px) et a la braise en cauchemar. */
      { x: 0.30, y: 0.26, w: 0.075, h: 0.150, kind: B_LAMINOIR },
      { x: 0.60, y: 0.26, w: 0.075, h: 0.150, kind: B_LAMINOIR },
      { x: 0.84, y: 0.26, w: 0.075, h: 0.150, kind: B_LAMINOIR, min: 1 },
      // la quatrieme cage sort de la colonne centrale : la braise de cauchemar
      // balaie x = 521 a 1079 entre y = 561 et 699, et une cage de 135 px de haut
      // ne tient pas SOUS elle sans toucher le bord de cellule.
      { x: 0.90, y: 0.74, w: 0.075, h: 0.150, kind: B_LAMINOIR, min: 2 },
      { x: 0.50, y: 0.14, w: 0.260, h: 0.048, kind: B_CONDUITE },
      { x: 0.20, y: 0.86, w: 0.070, h: 0.070, kind: B_CUVE, min: 1 },
      { x: 0.80, y: 0.86, w: 0.070, h: 0.070, kind: B_CUVE, min: 2 },
    ] },
    /* LE PARC A MINERAI — LA SEULE FORME MOLLE DU DEPOT. Tout le reste du jeu
       est usine ou casse : des aretes, des chanfreins, des cassures. Un tas de
       minerai n a ni l un ni l autre — son bord est IRREGULIER et continu, il
       s est fait tout seul, et ca se lit d une vue entiere.
       C est aussi l amont du theme : ce qui entre avant qu on le fonde, donc le
       seul endroit de la Fonderie ou rien ne soit encore chaud. */
    { cle: "minerai", nom: "le parc a minerai", label: "Le parc à minerai", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.62, y: 0.16, w: 0.110, h: 0.110, kind: B_TAS },
      { x: 0.86, y: 0.16, w: 0.110, h: 0.110, kind: B_TAS, min: 1 },
      { x: 0.24, y: 0.84, w: 0.110, h: 0.110, kind: B_TAS },
      { x: 0.86, y: 0.80, w: 0.110, h: 0.110, kind: B_TAS, min: 1 },
      { x: 0.14, y: 0.30, w: 0.070, h: 0.070, kind: B_CUVE },
      { x: 0.40, y: 0.16, w: 0.070, h: 0.070, kind: B_CUVE, min: 2 },
      { x: 0.14, y: 0.68, w: 0.070, h: 0.070, kind: B_CUVE, min: 1 },
    ] },
    /* LE PUITS — une masse centrale massive, le reste degage. Le seul lieu du
       theme ou le centre est interdit : on tourne autour au lieu de le traverser,
       et la horde arrive donc toujours par un cote qu on ne regarde pas. */
    /* LA MODELERIE — LA SEULE PIECE FROIDE ET SECHE DE LA FONDERIE. On y taille
       les modeles AVANT de fondre quoi que ce soit : rien n y est chaud, rien
       n y coule, et c est exactement ce qui la rend reconnaissable dans un theme
       ou tout brule. Des rayonnages de gabarits, hauts et minces, et le seul
       marquage au sol du theme.
       Elle reprend le PALETTIER du magasin de l Usine : deux themes, une
       silhouette, deux matieres — c est la mutualisation que le dossier demande. */
    { cle: "modelerie", nom: "la modelerie", label: "La modelerie", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      // ECART DE 126 PX ENTRE DEUX RAYONNAGES, soit 94 px libres : `PASSAGE_MIN`
      // plus une marge. A 108 px d ecart il n en restait que 76, et une allee de
      // rayonnage ou l on ne passe pas n est pas une allee.
      { x: 0.28, y: 0.24, w: 0.120, h: 0.036, kind: B_GABARIT },
      { x: 0.28, y: 0.38, w: 0.120, h: 0.036, kind: B_GABARIT },
      { x: 0.72, y: 0.76, w: 0.120, h: 0.036, kind: B_GABARIT, min: 1 },
      { x: 0.72, y: 0.62, w: 0.120, h: 0.036, kind: B_GABARIT, min: 1 },
      { x: 0.28, y: 0.52, w: 0.120, h: 0.036, kind: B_GABARIT, min: 2 },
      { x: 0.70, y: 0.24, w: 0.070, h: 0.070, kind: B_CUVE },
      { x: 0.30, y: 0.76, w: 0.070, h: 0.070, kind: B_CUVE, min: 1 },
    ] },
    /* L EBARBAGE — ON FINIT LA PIECE, DONC ON LA CASSE UN PEU. Des cabines
       fermees sur trois cotes : le seul endroit du depot ou une masse batie
       serve a CONTENIR ce qui gicle plutot qu a bloquer un passage. Le sol est
       jonche d eclats, et c est la seule region du theme dont la trace accroche
       la lumiere au lieu de la boire. */
    { cle: "ebarbage", nom: "l ebarbage", label: "L'ébarbage", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.30, y: 0.24, w: 0.080, h: 0.100, kind: B_CABINE },
      { x: 0.70, y: 0.76, w: 0.080, h: 0.100, kind: B_CABINE, min: 1 },
      { x: 0.30, y: 0.76, w: 0.080, h: 0.100, kind: B_CABINE, min: 1 },
      { x: 0.70, y: 0.24, w: 0.080, h: 0.100, kind: B_CABINE, min: 2 },
      { x: 0.50, y: 0.14, w: 0.260, h: 0.048, kind: B_CONDUITE },
    ] },
    /* LE PARC A BRAMES — DES MASSES POSEES A PLAT, ET ELLES SONT ENCORE TIEDES.
       C est l aval du laminoir : ce qui en sort attend la, empile, et la seule
       chose qui bouge est la chaleur qui s en va. Un parc a brames est le
       contraire du parc a minerai — meme fonction, deux etats de la matiere, et
       la silhouette le dit : un tas est mou, une pile est cassante. */
    { cle: "brames", nom: "le parc a brames", label: "Le parc à brames", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.26, y: 0.26, w: 0.090, h: 0.060, kind: B_BRAME },
      { x: 0.74, y: 0.74, w: 0.090, h: 0.060, kind: B_BRAME },
      { x: 0.26, y: 0.74, w: 0.090, h: 0.060, kind: B_BRAME, min: 1 },
      { x: 0.74, y: 0.26, w: 0.090, h: 0.060, kind: B_BRAME, min: 1 },
      { x: 0.26, y: 0.50, w: 0.090, h: 0.060, kind: B_BRAME, min: 2 },
      { x: 0.64, y: 0.52, w: 0.120, h: 0.190, kind: B_FOUR },
    ] },
    /* LES SILOS — LA SEULE VERTICALE DE LA FONDERIE. Tout le theme est BAS :
       des fours trapus, des bassins, des chassis au sol. Trois cylindres hauts
       et serres se voient d une vue entiere et donnent enfin une echelle a un
       lieu qui n en avait pas.
       Sol BITUME : une aire de livraison, refaite pour les camions-citernes. */
    { cle: "silos", nom: "les silos", label: "Les silos", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.26, y: 0.30, w: 0.080, h: 0.080, kind: B_SILO },
      { x: 0.26, y: 0.46, w: 0.080, h: 0.080, kind: B_SILO },
      { x: 0.74, y: 0.70, w: 0.080, h: 0.080, kind: B_SILO, min: 1 },
      { x: 0.74, y: 0.54, w: 0.080, h: 0.080, kind: B_SILO, min: 1 },
      // QUATRE SILOS ET PAS CINQ : a cinq, la region avait exactement la meme
      // densite et le meme encombrement que le laboratoire — 9 % d ecart au
      // mieux pour un plancher de 15. Le nombre est ce qui les separe.
      { x: 0.60, y: 0.20, w: 0.180, h: 0.048, kind: B_CONDUITE },
    ] },
    /* LE CRASSIER — CE QU ON JETTE QUAND ON A FINI, ET C EST DEHORS. La scorie
       refroidie s empile sans forme, comme le minerai, mais elle est GRISE et
       VITREUSE la ou le minerai est rouge et mat : deux masses molles, deux
       bouts de chaine, et la couleur suffit a dire lequel.
       Sol de TERRE : personne ne coule de dalle sous un crassier. */
    { cle: "crassier", nom: "le crassier", label: "Le crassier", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.28, y: 0.26, w: 0.120, h: 0.110, kind: B_CRASSE },
      { x: 0.72, y: 0.74, w: 0.120, h: 0.110, kind: B_CRASSE, min: 1 },
      { x: 0.72, y: 0.24, w: 0.090, h: 0.080, kind: B_CRASSE, min: 2 },
      { x: 0.14, y: 0.66, w: 0.070, h: 0.070, kind: B_CUVE },
      { x: 0.86, y: 0.34, w: 0.070, h: 0.070, kind: B_CUVE, min: 1 },
    ] },
    /* LE LABORATOIRE — ON MESURE, DONC ON NE TOUCHE A RIEN. Des paillasses
       basses et alignees sous une lumiere qui ne vacille pas : c est le seul
       endroit de la Fonderie ou rien ne soit ni chaud ni sale, et le seul du
       theme dont le sol ait ete CHOISI.
       Il est a la modelerie ce que le controle est a la coulee : l avant et
       l apres d une chaine ou tout le reste est le milieu. */
    { cle: "labo", nom: "le laboratoire", label: "Le laboratoire", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.30, y: 0.28, w: 0.160, h: 0.044, kind: B_PAILLASSE },
      { x: 0.30, y: 0.44, w: 0.160, h: 0.044, kind: B_PAILLASSE },
      { x: 0.70, y: 0.72, w: 0.160, h: 0.044, kind: B_PAILLASSE, min: 1 },
      { x: 0.70, y: 0.56, w: 0.160, h: 0.044, kind: B_PAILLASSE, min: 1 },
      { x: 0.30, y: 0.60, w: 0.160, h: 0.044, kind: B_PAILLASSE, min: 2 },
      { x: 0.60, y: 0.20, w: 0.180, h: 0.048, kind: B_CONDUITE },
    ] },
    { cle: "puits", nom: "le puits", label: "Le puits", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.35, y: 0.50, w: 0.120, h: 0.190, kind: B_FOUR },
      /* LES DEUX FOURS SE TRAVERSAIENT DE 112 PX SUR 171. La masse restait un
         rectangle propre, donc la collision ne disait rien ; ce qui se voyait
         etait le second HABILLAGE — panneau et fente — pose en decale sur le
         corps du premier. Ils se collent maintenant bord a bord, et EN HAUTEUR :
         a cote, le second venait toucher le glissant de `HZ_NORMAL` a 0,16, et
         `verifierBiomes` refuse un danger pose sur un obstacle. */
      { x: 0.35, y: 0.69, w: 0.120, h: 0.190, kind: B_FOUR, min: 1 },
      { x: 0.26, y: 0.24, w: 0.070, h: 0.070, kind: B_CUVE },
      { x: 0.74, y: 0.76, w: 0.070, h: 0.070, kind: B_CUVE, min: 1 },
      /* LE PUITS A ENFIN UN TROU. Le nom promettait un creux et la region posait
         deux fours colles : le depot ne savait dessiner que du PLEIN, et trois
         de ses regions portaient un nom de vide — le cratere, la breche, celle-ci.
         LA FOSSE BLOQUE COMME LE RESTE, et c est une decision : la laisser
         traverser par les tirs demanderait que la simulation lise `kind`, or
         `kind` ne circule pas et le serveur ne le lit JAMAIS. On garde
         l invariant, la fosse est un obstacle — ce qui change est qu elle se
         dessine EN CREUX au lieu d en relief. */
      /* 0,200 DE HAUT ET PAS 0,220 : a 0,220 la fosse laissait 63 px jusqu au
         bord de cellule, sous le passage minimal — un corps s y tient et la
         grille y voit un mur. A 0,200 il reste 90 px des deux cotes. */
      { x: 0.80, y: 0.20, w: 0.160, h: 0.200, kind: B_FOSSE },
      { x: 0.14, y: 0.80, w: 0.160, h: 0.200, kind: B_FOSSE, min: 1 },
      /* NI TROISIEME FOUR NI CONDUITE ICI, ET C EST LE BUDGET QUI L A DIT. Le
         puits demandait 15,5 % d une cellule pour un plafond d ARENE de 10 % :
         il ne pouvait pas etre bati tel qu ecrit, et ce que `buildBiome` jetait
         en premier etait sa FOSSE — la plus grosse masse du depot, et la seule
         chose qui le nomme. Elle manquait dans 14 vues sur 172. Les deux poses
         retirees sont celles du vocabulaire PARTAGE : le puits passe a 95,9 %
         de vues signees, et son recouvrement avec le refroidissement tombe de
         40 a 20 %. */
    ] },
  ],
  friche: [
    { cle: "champ", nom: "le champ", label: "Le champ", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.10, y: 0.18, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.19, y: 0.30, w: 0.045, h: 0.110, kind: B_RUINE, min: 1 },
      { x: 0.26, y: 0.14, w: 0.060, h: 0.048, kind: B_RUINE },
      { x: 0.82, y: 0.80, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.90, y: 0.66, w: 0.045, h: 0.110, kind: B_RUINE, min: 1 },
      { x: 0.73, y: 0.88, w: 0.060, h: 0.048, kind: B_RUINE },
      // un champ n a pas de MUR : ce qui le borde est un pan de ruine tombe.
      { x: 0.50, y: 0.10, w: 0.110, h: 0.040, kind: B_RUINE },
      // TROIS EPAVES DE MEME GABARIT ETAIENT TROIS FOIS LE MEME OBJET. A surface
      // egale (± 3 %), elles portent maintenant trois formats — couche, carre,
      // debout : c est ce qui separe un champ d epaves d un parking. La vue est
      // en 16/9, donc un format DEBOUT demande h/w > 1,78 en fraction, pas 1,2.
      { x: 0.46, y: 0.44, w: 0.082, h: 0.048, hp: 1, kind: B_CARCASSE, min: 1 },
      { x: 0.70, y: 0.36, w: 0.062, h: 0.066, hp: 1, kind: B_CARCASSE },
      { x: 0.30, y: 0.62, w: 0.040, h: 0.098, hp: 1, kind: B_CARCASSE, min: 1 },
      { x: 0.06, y: 0.46, w: 0.052, h: 0.086, kind: B_RUINE, min: 2 },
      { x: 0.94, y: 0.54, w: 0.052, h: 0.086, kind: B_RUINE, min: 2 },
      /* LE TALUS — CE QUE PERSONNE N A CONSTRUIT. Toutes les autres masses du
         theme sont des restes de bati ; celle-ci est de la TERRE poussee la et
         laissee, avec ce qui a repris dessus. Meme bord organique que le
         bosquet du terrain repris, une autre matiere. */
      { x: 0.28, y: 0.80, w: 0.100, h: 0.070, kind: B_TALUS },
      { x: 0.64, y: 0.54, w: 0.100, h: 0.070, kind: B_TALUS, min: 1 },
    ] },
    /* LE MUR — une longue ruine avec PLUSIEURS breches larges. Une seule breche
       ferait un goulot, et un goulot detruit le kiting : la horde s y accumule,
       le joueur tire dans un entonnoir. Trois ouvertures, aucune obligatoire. */
    { cle: "mur", nom: "le mur", label: "Le mur", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      /* DEUX MURS QUI SE RECOUVRAIENT AUX TROIS MODES SONT UN MUR. 0,29 et 0,33
         donnaient l emprise [0,235 ; 0,385] et deux habillages l un dans l autre ;
         une seule entree de 0,150 donne EXACTEMENT la meme emprise, donc le meme
         parcours et les memes breches, avec un seul contour. */
      { x: 0.31, y: 0.50, w: 0.150, h: 0.040, kind: B_MUR },
      // le tronçon de cauchemar PROLONGE celui de normal au lieu de le doubler.
      { x: 0.68, y: 0.50, w: 0.110, h: 0.040, kind: B_MUR, min: 1 },
      { x: 0.79, y: 0.50, w: 0.110, h: 0.040, kind: B_MUR, min: 2 },
      { x: 0.29, y: 0.44, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.71, y: 0.56, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.72, y: 0.16, w: 0.045, h: 0.110, kind: B_RUINE, min: 1 },
      { x: 0.28, y: 0.84, w: 0.045, h: 0.110, kind: B_RUINE, min: 1 },
      // pas de CARCASSE au mur : ce qui traine contre lui est ce qui le fermait.
      { x: 0.29, y: 0.59, w: 0.082, h: 0.048, hp: 1, kind: B_PORTAIL },
      { x: 0.72, y: 0.36, w: 0.062, h: 0.066, hp: 1, kind: B_PORTAIL, min: 2 },
      /* LE PORTAIL — CE QUI RESTE DEBOUT QUAND LE MUR EST TOMBE. Il se pose DANS
         la plus large breche : un cadre qu on voit a travers, au milieu de
         l ouverture, et il laisse 160 px de chaque cote — deux fois
         `PASSAGE_MIN`. Un portail qui fermerait ferait un goulot, et un goulot
         detruit le kiting ; celui-ci ne fait que NOMMER l ouverture. */
      { x: 0.50, y: 0.50, w: 0.040, h: 0.075, kind: B_PORTAIL },
      // le second n a meme plus son mur : c est le dernier etat de la region.
      { x: 0.24, y: 0.26, w: 0.040, h: 0.075, kind: B_PORTAIL, min: 1 },
    ] },
    /* LA CASSE — ON DEMONTE POUR REVENDRE, DONC C EST UN ABANDON ORGANISE. Elle
       remplace « le cratere », dont le nom decrivait une disposition et
       promettait un objet : il n y avait pas de cratere, pas de sol brule, pas
       de bourrelet — juste un endroit un peu moins encombre.
       Ici il y a des PILES : le seul empilement vertical du theme, et la seule
       chose du depot qui monte en s ecartant de l aplomb. Le grillage ferme la
       cour sans la cacher — meme cadre que la claire-voie de l Usine, autre
       palette, autre lecture. */
    { cle: "casse", nom: "la casse", label: "La casse", bords: [BORD_MUR, BORD_ENCOMBRE, BORD_MUR, BORD_ENCOMBRE], poser: [
      /* AUCUNE EPAVE A MOINS DE 0,16 D UN BORD DE CELLULE, et c est le
         TREMBLEMENT qui l impose. Un bloc a 0,94 tombe a 27 px de son jumeau
         miroite de la cellule voisine ; sur la Friche, seul theme a trembler,
         deux cellules peuvent se decaler de 40 px CHACUNE et refermer l ecart.
         Mesure : 17 paires qui se traversent sur cinquante graines, jusqu a
         108 x 44 px. Il faut donc 2 x jMax plus le passage minimal, soit 160 px,
         et 0,16 de cellule en fait 144 de chaque cote — 288 au total. */
      { x: 0.20, y: 0.20, w: 0.070, h: 0.090, kind: B_EPAVES },
      { x: 0.46, y: 0.18, w: 0.070, h: 0.090, kind: B_EPAVES },
      { x: 0.78, y: 0.44, w: 0.070, h: 0.090, kind: B_EPAVES, min: 1 },
      /* TROIS PILES ET PAS CINQ. Le bas de la cellule appartient en cauchemar a
         la braise (439 a 1161 px en x, 659 a 781 en y) et a la flaque de gauche ;
         ce qui reste libre est a moins de 160 px d un grillage ou d une ruine, et
         160 est ce qu il faut sur la Friche — deux fois son tremblement plus le
         passage minimal. Trois piles suffisent a la signature ; une quatrieme
         demanderait de deplacer la moitie de la region. */
      { x: 0.50, y: 0.30, w: 0.180, h: 0.014, kind: B_GRILLAGE },
      { x: 0.30, y: 0.66, w: 0.180, h: 0.014, kind: B_GRILLAGE, min: 1 },
      { x: 0.29, y: 0.44, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.73, y: 0.16, w: 0.045, h: 0.110, kind: B_RUINE, min: 1 },
      { x: 0.29, y: 0.59, w: 0.082, h: 0.048, hp: 1, kind: B_CARCASSE, min: 2 },
    ] },
    /* LE CHANTIER — UN BATIMENT JAMAIS FINI, DONC UN ABANDON SANS USURE. C est
       le seul endroit du theme ou ce qui est la soit NEUF et deja mort : une
       ossature nue, des banches de coffrage debout, et rien entre les poteaux.
       LA GRILLE DE POTEAUX EST LA SIGNATURE : des appuis fins et REGULIERS, donc
       on voit la horde arriver de tres loin et on ne peut se cacher que du TIR.
       C est la region la plus ouverte de la Friche, et l inverse exact de la
       casse — l une empile, l autre n a rien monte. */
    { cle: "chantier", nom: "le chantier", label: "Le chantier", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.20, y: 0.20, w: 0.020, h: 0.036, kind: B_POTEAU },
      { x: 0.50, y: 0.20, w: 0.020, h: 0.036, kind: B_POTEAU },
      { x: 0.70, y: 0.18, w: 0.020, h: 0.036, kind: B_POTEAU, min: 1 },
      { x: 0.34, y: 0.50, w: 0.020, h: 0.036, kind: B_POTEAU },
      { x: 0.80, y: 0.50, w: 0.020, h: 0.036, kind: B_POTEAU, min: 1 },
      { x: 0.10, y: 0.90, w: 0.020, h: 0.036, kind: B_POTEAU, min: 2 },
      /* NI 0,94 NI x = 0,50 : a 0,94 le poteau tombe a 76 px de son jumeau
         miroite de la cellule voisine, et la Friche decale de 40 px par cellule ;
         a x = 0,50 il est sous la braise, qui balaie 439 a 1161 px entre y = 659
         et 781. Il sort donc de la colonne centrale. */
      { x: 0.24, y: 0.88, w: 0.020, h: 0.036, kind: B_POTEAU },
      { x: 0.80, y: 0.80, w: 0.020, h: 0.036, kind: B_POTEAU, min: 1 },
      { x: 0.30, y: 0.36, w: 0.100, h: 0.020, kind: B_BANCHE },
      { x: 0.72, y: 0.36, w: 0.100, h: 0.020, kind: B_BANCHE, min: 1 },
    ] },
    /* LE TERRAIN REPRIS — LE VIVANT A GAGNE. La seule region du depot ou ce qui
       occupe l espace ne soit pas bati : des bosquets a bord organique, des
       ronces basses, et ce qui reste de mur disparait dessous.
       LE BOSQUET EST SEMI-OPAQUE, et c est sa regle : on voit des silhouettes a
       travers sans pouvoir tirer proprement. Les ronces, elles, se degagent au
       tir — le terrain s ouvre au fil de la manche, comme les etals du marche
       mais organiquement. */
    { cle: "repris", nom: "le terrain repris", label: "Le terrain repris", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.24, y: 0.28, w: 0.120, h: 0.150, kind: B_BOSQUET },
      { x: 0.82, y: 0.72, w: 0.120, h: 0.150, kind: B_BOSQUET, min: 1 },
      { x: 0.30, y: 0.50, w: 0.140, h: 0.030, hp: 1, kind: B_RONCE },
      { x: 0.70, y: 0.34, w: 0.140, h: 0.030, hp: 1, kind: B_RONCE, min: 1 },
      { x: 0.10, y: 0.18, w: 0.085, h: 0.070, kind: B_RUINE },
      // 0,20 -> 0,62 : a 0,20 le pan tombait dans la flaque de cauchemar, qui
      // tient x = 1271 a 1481 entre y = 111 et 321.
      // ni 0,20 (la flaque de cauchemar) ni 0,62 (le bosquet la traversait sur
      // 4 x 27 px) : 0,46 est le seul creux de cette colonne.
      { x: 0.90, y: 0.46, w: 0.045, h: 0.110, kind: B_RUINE, min: 2 },
    ] },
    /* L EFFONDREMENT — des masses de toutes tailles, sans loi apparente. C est
       la variante qui n a pas de regle, et elle en a donc une : le contraste. */
    /* LA VOIE — LA SEULE LIGNE DROITE DE TOUT LE THEME. La Friche est faite de
       ce qui s est effondre au hasard ; une voie ferree a ete TRACEE, et elle
       tient encore parce que le ballast ne pourrit pas. Les wagons sont a
       l arret dessus, alignes, et c est l alignement qui se lit d une vue
       entiere au milieu du desordre.
       Sol MINERAL : du ballast, la seule pierre concassee du theme. */
    { cle: "voie", nom: "la voie", label: "La voie", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      /* LA RAME TIENT LA BANDE CENTRALE, ET C EST LA SEULE QUI SOIT LIBRE. La
         Friche porte quatorze dangers en cauchemar plus leurs quatre miroirs :
         les bandes y = 0,24 et y = 0,76 lui appartiennent presque entierement.
         L ecart entre deux wagons est de 80 px — `PASSAGE_MIN` tout juste, et
         c est voulu : une rame se longe, elle ne se traverse pas. */
      { x: 0.34, y: 0.52, w: 0.130, h: 0.048, kind: B_WAGON },
      { x: 0.52, y: 0.52, w: 0.130, h: 0.048, kind: B_WAGON },
      { x: 0.70, y: 0.52, w: 0.130, h: 0.048, kind: B_WAGON, min: 1 },
      { x: 0.28, y: 0.16, w: 0.130, h: 0.048, kind: B_WAGON, min: 1 },
      { x: 0.72, y: 0.16, w: 0.130, h: 0.048, kind: B_WAGON, min: 2 },
      { x: 0.26, y: 0.82, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.74, y: 0.32, w: 0.085, h: 0.070, kind: B_RUINE, min: 1 },
    ] },
    /* LA DECHARGE — DES CUBES, ET C EST CE QUI LA SEPARE DE L EFFONDREMENT. Un
       effondrement produit des morceaux de toutes les tailles ; ici tout a ete
       COMPRESSE au meme gabarit et empile par une machine. Le desordre est
       accidentel, la decharge est un rangement — et c est exactement pour ca
       qu on la reconnait.
       Sol BITUME : une aire de retournement, refaite pour les camions. */
    { cle: "decharge", nom: "la decharge", label: "La décharge", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.22, y: 0.20, w: 0.070, h: 0.070, kind: B_BALLE },
      { x: 0.22, y: 0.32, w: 0.070, h: 0.070, kind: B_BALLE },
      { x: 0.78, y: 0.80, w: 0.070, h: 0.070, kind: B_BALLE, min: 1 },
      { x: 0.78, y: 0.68, w: 0.070, h: 0.070, kind: B_BALLE, min: 1 },
      { x: 0.30, y: 0.20, w: 0.070, h: 0.070, kind: B_BALLE, min: 2 },
      { x: 0.70, y: 0.80, w: 0.070, h: 0.070, kind: B_BALLE, min: 2 },
      { x: 0.50, y: 0.50, w: 0.082, h: 0.048, hp: 1, kind: B_CARCASSE },
    ] },
    /* LA HALLE EVENTREE — LE TOIT EST PAR TERRE, ET LES FERMES AVEC. C est la
       seule region du depot ou une structure soit lisible A PLAT : on voit le
       dessin de la charpente au sol, en obliques paralleles, et on comprend le
       volume qui n existe plus. Le contraire du chantier, qui montre un volume
       qui n existe pas ENCORE.
       Sol LISSE : la dalle de la halle, la seule surface coulee de la Friche. */
    { cle: "halle", nom: "la halle eventree", label: "La halle éventrée", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      /* DEUX FERMES ET PAS TROIS, ET LEUR ENVELOPPE FAIT 336 x 81 PX. La Friche
         est le theme le plus charge en dangers du depot : une enveloppe de
         0,31 x 0,15 n a AUCUNE position libre sur la cellule, les quatre
         miroirs et les deux modes confondus. La bande centrale en accepte deux,
         et elles tombent en sens INVERSE — deux charpentes ne s effondrent pas
         du meme cote. Le peigne de la trame en pose d autres a l echelle du
         quartier : la region reste lisible avec deux. */
      { oblique: true, x0: 0.20, y0: 0.46, x1: 0.40, y1: 0.54, ep: 0.030, kind: B_FERME },
      { oblique: true, x0: 0.60, y0: 0.54, x1: 0.80, y1: 0.46, ep: 0.030, kind: B_FERME, min: 1 },
      { x: 0.72, y: 0.18, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.28, y: 0.82, w: 0.085, h: 0.070, kind: B_RUINE, min: 1 },
    ] },
    /* LA SOUS-STATION — CE QUI RESTE ALLUME QUAND PLUS RIEN NE L EST. Des
       chapelets d isolateurs sur leurs socles : fins, hauts, reguliers, et le
       seul alignement VERTICAL du theme. La Friche est faite de choses tombees ;
       ceux-la tiennent encore debout parce qu on ne demonte pas un poste sous
       tension, et personne ne sait s il l est.
       Sol TECHNIQUE : la dalle d un poste, la seule surface entretenue de la
       Friche — ou plutot la seule qu on n ait pas osé toucher. */
    { cle: "sousstation", nom: "la sous-station", label: "La sous-station", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      /* LES SIX SOCLES SONT DECALES EN QUINCONCE, ET C EST LA CARTE DES DANGERS
         QUI L A IMPOSE. Une rangee franche a y = 0,24 traversait la nappe de
         121 px de (0,42 ; 0,24) et celle de 105 px de (0,86 ; 0,24) — plus
         leurs quatre miroirs. Le quinconce garde l alignement VERTICAL, qui est
         ce qui se lit, et abandonne l alignement horizontal, qui ne se lit pas. */
      { x: 0.22, y: 0.24, w: 0.026, h: 0.110, kind: B_ISOLATEUR },
      { x: 0.32, y: 0.30, w: 0.026, h: 0.110, kind: B_ISOLATEUR },
      { x: 0.68, y: 0.70, w: 0.026, h: 0.110, kind: B_ISOLATEUR, min: 1 },
      { x: 0.78, y: 0.76, w: 0.026, h: 0.110, kind: B_ISOLATEUR, min: 1 },
      { x: 0.22, y: 0.70, w: 0.026, h: 0.110, kind: B_ISOLATEUR, min: 2 },
      { x: 0.78, y: 0.30, w: 0.026, h: 0.110, kind: B_ISOLATEUR, min: 2 },
      { x: 0.50, y: 0.50, w: 0.085, h: 0.070, kind: B_RUINE },
    ] },
    /* LA STATION-SERVICE — DES ILOTS SOUS UN AUVENT QUI N EST PLUS LA. Les
       pompes sont par PAIRES, a distance reguliere, et cette regularite au
       milieu du desordre dit qu il y avait un toit dessus : on lit une absence,
       et c est la seule fois du theme.
       Sol MARQUE : le seul marquage au sol de la Friche, parce qu il fallait
       dire aux voitures ou se ranger. */
    { cle: "pompe", nom: "la station-service", label: "La station-service", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.26, y: 0.30, w: 0.045, h: 0.080, kind: B_POMPE },
      { x: 0.26, y: 0.46, w: 0.045, h: 0.080, kind: B_POMPE },
      { x: 0.74, y: 0.70, w: 0.045, h: 0.080, kind: B_POMPE, min: 1 },
      { x: 0.74, y: 0.54, w: 0.045, h: 0.080, kind: B_POMPE, min: 1 },
      { x: 0.50, y: 0.16, w: 0.062, h: 0.066, hp: 1, kind: B_CARCASSE },
      { x: 0.50, y: 0.54, w: 0.082, h: 0.048, hp: 1, kind: B_CARCASSE, min: 2 },
    ] },
    /* LA LAGUNE — UN BASSIN VIDE, ET C EST LE PREMIER CREUX DE LA FRICHE. Le
       depot en a trois — la fosse du puits, le bac du traitement, la fontaine du
       parc — et aucun n etait ici. Celui-ci est ASSECHE : le fond est craquele
       et ce qui repousse dedans pousse mieux qu ailleurs, parce qu il y reste de
       l humidite. Sol AJOURE : les caillebotis de service en font le tour. */
    { cle: "lagune", nom: "la lagune", label: "La lagune", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.30, y: 0.42, w: 0.150, h: 0.130, kind: B_DECANTEUR },
      { x: 0.70, y: 0.58, w: 0.150, h: 0.130, kind: B_DECANTEUR, min: 1 },
      { x: 0.70, y: 0.42, w: 0.110, h: 0.090, kind: B_DECANTEUR, min: 2 },
      { x: 0.26, y: 0.62, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.74, y: 0.24, w: 0.085, h: 0.070, kind: B_RUINE, min: 1 },
    ] },
    { cle: "effondrement", nom: "l effondrement", label: "L'effondrement", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      // ce qui est tombe ici n est pas un mur mais le SOL : deux dalles de plus.
      { x: 0.30, y: 0.45, w: 0.110, h: 0.040, kind: B_DALLE },
      { x: 0.71, y: 0.56, w: 0.085, h: 0.070, kind: B_RUINE },
      /* 0,34 -> 0,44 : cette ruine DEBOUT tombait dans les deux murs a la fois
         et dans la grande ruine de 0,29 — quatre superpositions a elle seule, le
         pire point du depot. Le contraste de la variante ne demande pas qu elles
         s empilent, il demande qu elles n aient pas la meme taille. */
      { x: 0.44, y: 0.48, w: 0.045, h: 0.110, kind: B_RUINE },
      { x: 0.73, y: 0.14, w: 0.060, h: 0.048, kind: B_RUINE, min: 1 },
      { x: 0.29, y: 0.56, w: 0.085, h: 0.070, kind: B_RUINE, min: 1 },
      { x: 0.72, y: 0.40, w: 0.052, h: 0.086, kind: B_RUINE },
      { x: 0.28, y: 0.66, w: 0.052, h: 0.086, kind: B_RUINE, min: 2 },
      // les deux carcasses etaient DANS la grande ruine de 0,71 : l une descend
      // sous elle, l autre part a l est.
      { x: 0.71, y: 0.65, w: 0.082, h: 0.048, hp: 1, kind: B_CARCASSE },
      { x: 0.28, y: 0.36, w: 0.062, h: 0.066, hp: 1, kind: B_CARCASSE, min: 1 },
      { x: 0.83, y: 0.50, w: 0.040, h: 0.098, hp: 1, kind: B_CARCASSE, min: 2 },
      { x: 0.33, y: 0.50, w: 0.110, h: 0.040, kind: B_DALLE, min: 2 },
      /* LA DALLE LEVEE — LE SOL LUI-MEME, MIS DEBOUT. Une region d effondrement
         posait des morceaux de MURS ; ce qui manquait est ce sur quoi on
         marchait. Ses fers a beton sortent du bord haut, et c est le seul objet
         du depot dont la matiere soit la meme que celle du sol. */
      { x: 0.24, y: 0.18, w: 0.055, h: 0.080, kind: B_DALLE },
      { x: 0.56, y: 0.48, w: 0.055, h: 0.080, kind: B_DALLE, min: 1 },
    ] },
  ],
  nebuleuse: [
    { cle: "derive", nom: "la derive", label: "La dérive", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.22, y: 0.24, w: 0.145, h: 0.150, kind: B_FRAGMENT },
      { x: 0.78, y: 0.76, w: 0.145, h: 0.150, kind: B_FRAGMENT },
      { x: 0.06, y: 0.50, w: 0.020, h: 0.560, kind: B_TRAVEE },
      { x: 0.94, y: 0.50, w: 0.020, h: 0.560, kind: B_TRAVEE, min: 1 },
      { x: 0.10, y: 0.70, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
      { x: 0.90, y: 0.30, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 1 },
      { x: 0.63, y: 0.20, w: 0.036, h: 0.032, hp: 1, kind: B_DEBRIS, min: 1 },
      // en cauchemar, ce qu on ajoute est DESTRUCTIBLE : `celluleTraversable`
      // ignore les couvertures, donc densifier par la ne peut pas fermer le carre
      // central — et le joueur garde un moyen de rouvrir un passage au tir.
      { x: 0.37, y: 0.80, w: 0.036, h: 0.032, hp: 1, kind: B_DEBRIS, min: 2 },
      { x: 0.50, y: 0.30, w: 0.036, h: 0.032, hp: 1, kind: B_DEBRIS, min: 2 },
      /* LA ROCHE — LA SEULE CHOSE ICI QUI N AIT JAMAIS ETE UN VAISSEAU. Toute la
         Nebuleuse est de l epave : de la tole, des travees, des eclats de coque.
         Un caillou pris dans la derive n a pas d arete droite ni une seule
         soudure, et c est ce qui le rend lisible d une vue entiere. */
      { x: 0.60, y: 0.72, w: 0.110, h: 0.120, kind: B_ROCHE },
      { x: 0.76, y: 0.22, w: 0.090, h: 0.100, kind: B_ROCHE, min: 1 },
    ] },
    /* LE DOCK — ON ACCOSTE, DONC IL Y A UN BORD ET DES PINCES DESSUS. Il
       remplace « le champ d epaves », qui n etait que la derive avec des eclats
       plus petits : `dens` et `ech` ne font pas un endroit.
       Une file de BRAS D AMARRAGE le long d un cote, et derriere chacun une
       COQUE — une masse lisse, enorme, qui SORT DU CADRE. C est le seul objet du
       depot plus grand que ce qu on en voit, et c est ce qui donne l echelle de
       la station. */
    { cle: "dock", nom: "le dock", label: "Le dock", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.10, y: 0.14, w: 0.014, h: 0.120, kind: B_BRAS },
      { x: 0.10, y: 0.38, w: 0.014, h: 0.120, kind: B_BRAS },
      { x: 0.10, y: 0.62, w: 0.014, h: 0.120, kind: B_BRAS, min: 1 },
      { x: 0.10, y: 0.86, w: 0.014, h: 0.120, kind: B_BRAS, min: 2 },
      { x: 0.26, y: 0.20, w: 0.150, h: 0.170, kind: B_COQUE },
      { x: 0.26, y: 0.80, w: 0.150, h: 0.170, kind: B_COQUE, min: 1 },
      { x: 0.62, y: 0.70, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
      { x: 0.81, y: 0.28, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 1 },
      { x: 0.88, y: 0.50, w: 0.020, h: 0.560, kind: B_TRAVEE, min: 1 },
    ] },
    /* LA COURSIVE — LE DEDANS, ET C EST LUI QUI FAIT EXISTER LE DEHORS. Elle
       remplace « les grands fragments », qui etaient la derive a `ech` 1,30 :
       un facteur d echelle donne la meme arene grossie, donc le meme parcours.
       Ici le sol est PLEIN — le seul de la Nebuleuse — et deux parois continues
       le bordent. Sans cette region, « depressurise » ne veut rien dire : c est
       la seule qui donne l autre terme de l axe du theme. */
    { cle: "coursive", nom: "la coursive", label: "La coursive", bords: [BORD_MUR, BORD_OUVERT, BORD_MUR, BORD_OUVERT], poser: [
      { x: 0.06, y: 0.20, w: 0.020, h: 0.200, kind: B_CLOISON },
      { x: 0.06, y: 0.50, w: 0.020, h: 0.200, kind: B_CLOISON },
      { x: 0.06, y: 0.80, w: 0.020, h: 0.200, kind: B_CLOISON, min: 1 },
      { x: 0.94, y: 0.20, w: 0.020, h: 0.200, kind: B_CLOISON },
      { x: 0.94, y: 0.50, w: 0.020, h: 0.200, kind: B_CLOISON, min: 1 },
      { x: 0.94, y: 0.80, w: 0.020, h: 0.200, kind: B_CLOISON, min: 2 },
      { x: 0.40, y: 0.06, w: 0.050, h: 0.060, kind: B_CONSOLE },
      { x: 0.62, y: 0.92, w: 0.050, h: 0.060, kind: B_CONSOLE, min: 1 },
      { x: 0.50, y: 0.20, w: 0.050, h: 0.060, kind: B_CONSOLE, min: 2 },
      { x: 0.22, y: 0.20, w: 0.145, h: 0.150, kind: B_FRAGMENT },
      { x: 0.78, y: 0.80, w: 0.145, h: 0.150, kind: B_FRAGMENT, min: 1 },
    ] },
    /* LE CHANTIER ORBITAL — ON VOIT A TRAVERS DE PARTOUT. Une ossature nue :
       des membrures en treillis sur un reseau regulier, et le borde pose par
       endroits SEULEMENT. C est la seule region du depot dont les obstacles
       BLOQUENT SANS CACHER — on voit toute la horde en permanence et on ne peut
       pas lui tirer dessus partout, l inverse exact de la brume. */
    { cle: "chantier", nom: "le chantier orbital", label: "Le chantier orbital", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      /* LES MEMBRURES SONT COURTES ET AUX BORDS, ET C EST LE CENTRE QUI L IMPOSE.
         La Nebuleuse tient son milieu avec un puits de gravite et un glissant en
         normal (359-601 et 1006-1234 en x), une braise qui balaie de 756 a 844
         sur presque toute la hauteur en cauchemar, et une flaque a 701-899. Une
         poutre de 207 px de haut en travers de ca tombe forcement dessus.
         Six appuis de 108 px repartis dans les couloirs libres disent la meme
         ossature — c est le RESEAU qui se lit, pas la longueur d une piece. */
      { x: 0.12, y: 0.20, w: 0.018, h: 0.120, kind: B_MEMBRURE },
      { x: 0.50, y: 0.14, w: 0.018, h: 0.120, kind: B_MEMBRURE },
      { x: 0.88, y: 0.20, w: 0.018, h: 0.120, kind: B_MEMBRURE, min: 1 },
      { x: 0.12, y: 0.80, w: 0.018, h: 0.120, kind: B_MEMBRURE, min: 1 },
      { x: 0.88, y: 0.80, w: 0.018, h: 0.120, kind: B_MEMBRURE },
      { x: 0.30, y: 0.84, w: 0.018, h: 0.120, kind: B_MEMBRURE, min: 2 },
      { x: 0.35, y: 0.14, w: 0.100, h: 0.080, kind: B_BORDE },
      { x: 0.65, y: 0.88, w: 0.100, h: 0.080, kind: B_BORDE, min: 1 },
      { x: 0.12, y: 0.50, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
      { x: 0.88, y: 0.50, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 2 },
    ] },
    /* LA BRECHE — le bati concentre sur un bord, l autre ouvert sur le vide.
       La seule variante ASYMETRIQUE du theme : le miroir de cellule en fait une
       loi qui change de cote d une region a l autre, sans table de plus. */
    /* LA SERRE — LA SEULE CHOSE VIVANTE HORS DE LA FRICHE, ET ELLE EST SOUS
       VERRE. Toute la Nebuleuse est morte : de la tole, du givre, des eclats.
       Ici on cultive, donc quelqu un tient encore, et c est la seule region du
       theme dont le sol soit VEGETAL — la couleur a elle seule dit qu on a
       change d endroit.
       Les bacs sont des CADRES : on voit les plants a travers sans pouvoir
       tirer proprement, la meme mecanique que la claire-voie de l Usine au
       service de tout autre chose. */
    { cle: "serre", nom: "la serre", label: "La serre", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      /* LES RANGEES TIENNENT LE HAUT ET LE BAS, ET C EST LA CARTE DES DANGERS
         QUI L A DIT. La Nebuleuse porte deux nappes de 114 et 121 px de rayon
         sur la bande y = 0,34 a 0,66, et leurs quatre miroirs avec elles : la
         moitie centrale de la cellule lui appartient. L ecart entre deux bacs
         est de 90 px, au-dessus de `PASSAGE_MIN`. */
      { x: 0.24, y: 0.16, w: 0.150, h: 0.040, kind: B_CULTURE },
      { x: 0.24, y: 0.30, w: 0.150, h: 0.040, kind: B_CULTURE },
      { x: 0.76, y: 0.84, w: 0.150, h: 0.040, kind: B_CULTURE, min: 1 },
      { x: 0.76, y: 0.70, w: 0.150, h: 0.040, kind: B_CULTURE, min: 1 },
      { x: 0.76, y: 0.16, w: 0.150, h: 0.040, kind: B_CULTURE, min: 2 },
      // PAS DE CLOISON : c est la seule famille que la coursive ait a elle. Et
      // pas de debris non plus — une serre est le seul endroit PROPRE du theme.
      { x: 0.42, y: 0.16, w: 0.030, h: 0.130, kind: B_TRAVEE },
      { x: 0.58, y: 0.84, w: 0.030, h: 0.130, kind: B_TRAVEE, min: 1 },
    ] },
    /* LE REACTEUR — UNE MASSE CIRCULAIRE, ET C EST LA SEULE DU THEME. La
       Nebuleuse est faite de fragments et de poutres : des aretes cassees. Un
       tore est INTACT et referme sur lui-meme, donc il se lit d une vue entiere
       sans qu on ait besoin d en voir le tour.
       Il ne tourne pas et il n emet pas de telegraphe : un mouvement continu
       appartient a la matiere, et ce canal-la est au boss. */
    { cle: "reacteur", nom: "le reacteur", label: "Le réacteur", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.34, y: 0.24, w: 0.110, h: 0.150, kind: B_TORE },
      { x: 0.66, y: 0.76, w: 0.110, h: 0.150, kind: B_TORE, min: 1 },
      { x: 0.66, y: 0.24, w: 0.075, h: 0.100, kind: B_TORE, min: 2 },
      // PAS DE CONSOLE : elle appartient a la coursive. Deux petits tores font
      // le meme travail — donner un troisieme gabarit a la region.
      { x: 0.14, y: 0.66, w: 0.055, h: 0.075, kind: B_TORE },
      { x: 0.86, y: 0.34, w: 0.055, h: 0.075, kind: B_TORE, min: 1 },
      { x: 0.42, y: 0.84, w: 0.020, h: 0.140, kind: B_TRAVEE },
    ] },
    /* LE CHAMP D ANTENNES — ON ECOUTE, DONC TOUT EST TOURNE DANS LE MEME SENS.
       C est la seule region du depot dont les masses aient une ORIENTATION
       COMMUNE, et ca se voit avant qu on ait identifie un seul objet. Le sol est
       du GRANULAT : de la roche broyee, tassee sous les embases. */
    { cle: "antennes", nom: "le champ d antennes", label: "Le champ d'antennes", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.22, y: 0.22, w: 0.090, h: 0.090, kind: B_PARABOLE },
      { x: 0.78, y: 0.78, w: 0.090, h: 0.090, kind: B_PARABOLE },
      { x: 0.22, y: 0.78, w: 0.090, h: 0.090, kind: B_PARABOLE, min: 1 },
      { x: 0.78, y: 0.22, w: 0.090, h: 0.090, kind: B_PARABOLE, min: 2 },
      { x: 0.44, y: 0.50, w: 0.060, h: 0.060, kind: B_PARABOLE, min: 1 },
      // NI BRAS NI ROCHE : le bras est au dock, la roche a la derive, et les
      // leur prendre les laissait sans rien a elles.
      { x: 0.10, y: 0.50, w: 0.024, h: 0.120, kind: B_TRAVEE },
      { x: 0.90, y: 0.50, w: 0.024, h: 0.120, kind: B_TRAVEE, min: 1 },
      { x: 0.44, y: 0.28, w: 0.090, h: 0.100, kind: B_PARABOLE },
    ] },
    /* LA SOUTE — TOUT Y EST ATTACHE, ET C EST TOUT LE PROPOS. La Nebuleuse est
       faite de ce qui DERIVE : des fragments qui tournent, du givre, des eclats.
       Ici chaque masse est sanglee a un rail, alignee, immobile — et c est la
       seule region du theme ou rien ne bouge parce que quelqu un l a voulu.
       Sol POUDREUX : la poussiere de vrac qu on charge et decharge. */
    { cle: "soute", nom: "la soute", label: "La soute", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.24, y: 0.24, w: 0.090, h: 0.070, kind: B_ARRIMAGE },
      { x: 0.24, y: 0.36, w: 0.090, h: 0.070, kind: B_ARRIMAGE },
      { x: 0.76, y: 0.76, w: 0.090, h: 0.070, kind: B_ARRIMAGE, min: 1 },
      { x: 0.76, y: 0.62, w: 0.090, h: 0.070, kind: B_ARRIMAGE, min: 1 },
      { x: 0.76, y: 0.24, w: 0.090, h: 0.070, kind: B_ARRIMAGE, min: 2 },
      { x: 0.50, y: 0.74, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
    ] },
    /* LE HANGAR — UNE COQUE INTACTE ET POSEE, ET IL N Y EN A PAS D AUTRE. Toutes
       les coques du theme sont crevees ; celle-ci attend, sur ses berceaux, avec
       son marquage au sol autour. C est la seule region qui montre a quoi
       ressemblait un vaisseau AVANT, et elle le fait sans un mot.
       Sol RESINE : un hangar se lave, donc il est peint. */
    { cle: "hangar", nom: "le hangar", label: "Le hangar", bords: [BORD_MUR, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.30, y: 0.30, w: 0.170, h: 0.090, kind: B_NAVETTE },
      { x: 0.70, y: 0.78, w: 0.170, h: 0.090, kind: B_NAVETTE, min: 1 },
      { x: 0.70, y: 0.24, w: 0.120, h: 0.070, kind: B_NAVETTE, min: 2 },
      { x: 0.14, y: 0.62, w: 0.020, h: 0.140, kind: B_TRAVEE },
      { x: 0.86, y: 0.38, w: 0.020, h: 0.140, kind: B_TRAVEE, min: 1 },
    ] },
    /* LE CONDENSEUR — LE SEUL ENDROIT MOUILLE D UN THEME SANS GRAVITE, et c est
       precisement pour ca qu il existe : l eau d une station ne tombe pas, elle
       se DEPOSE sur ce qui est froid. Des faisceaux d echangeurs, longs et
       minces, avec leur givre d un cote et leur condensat de l autre.
       Rien d autre du depot ne fait tenir de l eau a la verticale. */
    { cle: "condenseur", nom: "le condenseur", label: "Le condenseur", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.28, y: 0.22, w: 0.260, h: 0.030, kind: B_ECHANGEUR },
      { x: 0.28, y: 0.34, w: 0.260, h: 0.030, kind: B_ECHANGEUR },
      { x: 0.72, y: 0.78, w: 0.260, h: 0.030, kind: B_ECHANGEUR, min: 1 },
      { x: 0.72, y: 0.66, w: 0.260, h: 0.030, kind: B_ECHANGEUR, min: 1 },
      { x: 0.46, y: 0.50, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
    ] },
    /* LA CARRIERE — ON CREUSE UN CAILLOU, ET C EST LA SEULE ACTIVITE DU THEME
       QUI PRODUISE QUELQUE CHOSE. Partout ailleurs on repare, on amarre ou on
       regarde derive ce qui est deja mort. Les foreuses sont plantees dans le
       regolithe, verticales, et leur alignement dit un FRONT DE TAILLE.
       Sol de TERRE : du regolithe tasse, la seule matiere meuble du theme. */
    { cle: "carriere", nom: "la carriere", label: "La carrière", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      /* DEUX FRONTS DE TAILLE, ET LA COLONNE CENTRALE LEUR EST INTERDITE : la
         Nebuleuse porte une nappe de 99 px a (0,50 ; 0,12) et ses quatre
         miroirs, donc l axe x = 0,50 lui appartient sur toute la hauteur. */
      { x: 0.18, y: 0.24, w: 0.030, h: 0.150, kind: B_FOREUSE },
      { x: 0.34, y: 0.24, w: 0.030, h: 0.150, kind: B_FOREUSE },
      { x: 0.66, y: 0.76, w: 0.030, h: 0.150, kind: B_FOREUSE, min: 1 },
      { x: 0.82, y: 0.76, w: 0.030, h: 0.150, kind: B_FOREUSE, min: 1 },
      { x: 0.18, y: 0.76, w: 0.030, h: 0.150, kind: B_FOREUSE, min: 2 },
      { x: 0.82, y: 0.24, w: 0.030, h: 0.150, kind: B_FOREUSE, min: 2 },
      { x: 0.54, y: 0.50, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
    ] },
    { cle: "breche", nom: "la breche", label: "La brèche", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_MUR], poser: [
      /* 0,13 -> 0,26 : LA TRAVEE PASSAIT A TRAVERS LES DEUX FRAGMENTS, 32 px sur
         86 — une poutre dessinee DANS la roche, aux trois modes et a toutes les
         graines. Elle ne bouge pas, elle : sa position tient d une passe a
         cinquante graines sur la fermeture du carre central. Les fragments
         s ecartent, et l ecart vaut 92 px, donc plus que `PASSAGE_MIN`. */
      // pas de FRAGMENT a la breche : ce qui a tenu est ce qui etait PRESSURISE.
      { x: 0.26, y: 0.24, w: 0.145, h: 0.150, kind: B_SAS },
      { x: 0.26, y: 0.76, w: 0.145, h: 0.150, kind: B_SAS, min: 1 },
      /* UNE SEULE TRAVEE, ET C EST LA PASSE A CINQUANTE GRAINES QUI L A DIT.
         Deux travees a 0,12 et 0,40 fermaient le carre central en cauchemar une
         graine sur QUATRE — treize sur cinquante — parce que la cellule voisine
         pose la sienne en face. Trois graines ne le montraient pas : avec un
         tirage PAR CELLULE, une graine ne montre qu un assemblage sur des
         milliers, et c est la mesure qui a change, pas le lieu. */
      { x: 0.12, y: 0.50, w: 0.020, h: 0.560, kind: B_TRAVEE },
      { x: 0.40, y: 0.30, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 2 },
      // 0,26 -> 0,38 : les fragments ont pris cette place.
      { x: 0.38, y: 0.16, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
      { x: 0.38, y: 0.84, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 1 },
      // 0,44 -> 0,48 : deux debris a 0,40 et 0,44 se touchaient sur 3 px.
      { x: 0.48, y: 0.30, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 2 },
      { x: 0.44, y: 0.70, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 2 },
      /* LE SAS — LA SEULE PORTE FERMEE DU DEPOT, ET ELLE NE MENE NULLE PART. Une
         breche est ce qui s est ouvert ; le sas est ce qui a tenu. Sa trappe est
         verrouillee et ses barres de condamnation sont mises : on lit qu il est
         encore sous pression alors que tout autour est creve. */
      { x: 0.88, y: 0.22, w: 0.090, h: 0.130, kind: B_SAS },
      { x: 0.68, y: 0.76, w: 0.090, h: 0.130, kind: B_SAS, min: 1 },
    ] },
  ],
  /* UNE RUE, PAS UNE SALLE. Les quatre autres lieux sont des interieurs ou du
     vide : leurs obstacles sont poses DANS un volume. Ici les devantures bordent
     deux axes et laissent une chaussee franche au milieu — c est ce que le mot
     « rue » veut dire, et c est aussi ce qui donne au joueur une ligne de fuite
     que la Fonderie n a pas.
     Les PYLONES sont fins et hauts : un mat d enseigne se contourne d un pas,
     mais il coupe la ligne de tir, donc il fait exister le couvert sans fermer
     le passage. Les CONTENEURS sont les seuls destructibles du lieu — ce qu on a
     empile dans la rue est aussi ce qu on peut degager au tir. */
  secteur: [
    { cle: "rue", nom: "la rue", label: "La rue", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.18, y: 0.16, w: 0.150, h: 0.052, kind: B_DEVANTURE },
      { x: 0.82, y: 0.84, w: 0.150, h: 0.052, kind: B_DEVANTURE },
      { x: 0.10, y: 0.72, w: 0.062, h: 0.140, kind: B_DEVANTURE, min: 1 },
      { x: 0.90, y: 0.28, w: 0.062, h: 0.140, kind: B_DEVANTURE, min: 1 },
      { x: 0.34, y: 0.50, w: 0.014, h: 0.230, kind: B_PYLONE },
      { x: 0.66, y: 0.50, w: 0.014, h: 0.230, kind: B_PYLONE },
      { x: 0.50, y: 0.14, w: 0.014, h: 0.150, kind: B_PYLONE, min: 2 },
      { x: 0.50, y: 0.86, w: 0.014, h: 0.150, kind: B_PYLONE, min: 2 },
      // les deux GRANDS conteneurs deviennent des abribus : la rue garde ses
      // deux destructibles, et sa densite ne bouge pas d une pose.
      { x: 0.26, y: 0.84, w: 0.052, h: 0.046, kind: B_ABRIBUS },
      { x: 0.74, y: 0.16, w: 0.052, h: 0.046, kind: B_ABRIBUS },
      // les deux derniers conteneurs deviennent des abribus, DESTRUCTIBLES :
      // du verre se casse, et la rue garde ses deux masses qu on peut degager.
      { x: 0.44, y: 0.74, w: 0.046, h: 0.040, hp: 1, kind: B_ABRIBUS, min: 1 },
      { x: 0.56, y: 0.26, w: 0.046, h: 0.040, hp: 1, kind: B_ABRIBUS, min: 2 },
      /* L ABRIBUS — LE SEUL MOBILIER DU DEPOT FAIT POUR QU ON S Y ARRETE. Tout
         le reste de la rue est du commerce ou de l infrastructure. Il est en
         verre sur trois cotes, donc on voit ce qui arrive derriere sans pouvoir
         y tirer : le meme cadre que la claire-voie de l Usine, a hauteur de
         trottoir. */
    ] },
    /* LA RUELLE — L ARRIERE, ET C EST LE DOS DE LA RUE. Elle remplace « la
       place », qui posait le meme catalogue de props que la rue dans un autre
       rangement : deux regions au meme vocabulaire sont une seule region.
       Ici, AUCUNE VITRINE. Des murs aveugles — la seule famille batie du Secteur
       qui n emette PAS, dans le seul lieu ou neuf blocs sur dix emettent — et
       des escaliers de secours. Une seule source par ecran contre la saturation
       de la rue : meme thème, meme palette, contraste maximal. */
    { cle: "ruelle", nom: "la ruelle", label: "La ruelle", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      // 0,12 et 0,88 : a 0,10 le mur laissait 76 px jusqu au bord de cellule,
      // sous le passage minimal — un corps s y tient, la grille y voit un mur.
      { x: 0.50, y: 0.12, w: 0.400, h: 0.030, kind: B_AVEUGLE },
      { x: 0.50, y: 0.88, w: 0.400, h: 0.030, kind: B_AVEUGLE },
      { x: 0.86, y: 0.14, w: 0.200, h: 0.030, kind: B_AVEUGLE, min: 1 },
      { x: 0.14, y: 0.86, w: 0.200, h: 0.030, kind: B_AVEUGLE, min: 2 },
      { x: 0.10, y: 0.12, w: 0.040, h: 0.070, kind: B_ESCALIER },
      { x: 0.90, y: 0.30, w: 0.040, h: 0.070, kind: B_ESCALIER },
      { x: 0.10, y: 0.72, w: 0.040, h: 0.070, kind: B_ESCALIER, min: 1 },
      { x: 0.90, y: 0.86, w: 0.040, h: 0.070, kind: B_ESCALIER, min: 2 },
      { x: 0.30, y: 0.62, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
      { x: 0.70, y: 0.38, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR, min: 1 },
    ] },
    /* LE MARCHE — semis serre de petites structures. Beaucoup d objets, peu de
       masse : on se faufile partout, on ne se cache nulle part. */
    { cle: "marche", nom: "le marche", label: "Le marché", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      { x: 0.22, y: 0.22, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
      { x: 0.34, y: 0.20, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR },
      { x: 0.50, y: 0.24, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR, min: 1 },
      { x: 0.66, y: 0.20, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR, min: 1 },
      { x: 0.78, y: 0.22, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR, min: 2 },
      { x: 0.22, y: 0.76, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR },
      { x: 0.34, y: 0.80, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR, min: 1 },
      { x: 0.50, y: 0.76, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR, min: 2 },
      { x: 0.66, y: 0.80, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR, min: 2 },
      { x: 0.29, y: 0.50, w: 0.014, h: 0.230, kind: B_PYLONE },
      { x: 0.71, y: 0.50, w: 0.014, h: 0.230, kind: B_PYLONE },
      /* L ETAL EST CE QUE « MARCHE » PROMETTAIT. La region posait des
         CONTENEURS, c est-a-dire des caisses : un marche a des tables couvertes,
         et c est la seule structure du depot qu on peut EFFACER au tir. */
      { x: 0.42, y: 0.50, w: 0.060, h: 0.036, hp: 1, kind: B_ETAL },
      { x: 0.58, y: 0.50, w: 0.060, h: 0.036, hp: 1, kind: B_ETAL },
      { x: 0.42, y: 0.66, w: 0.060, h: 0.036, hp: 1, kind: B_ETAL, min: 1 },
      { x: 0.66, y: 0.66, w: 0.060, h: 0.036, hp: 1, kind: B_ETAL, min: 1 },
      { x: 0.50, y: 0.40, w: 0.060, h: 0.036, hp: 1, kind: B_ETAL, min: 2 },
      // un marche n a pas de DEVANTURE : ce qui borde une allee de marche est
      // un etal de plus, pas une vitrine.
      { x: 0.09, y: 0.50, w: 0.062, h: 0.140, kind: B_ETAL },
      { x: 0.91, y: 0.50, w: 0.062, h: 0.140, kind: B_ETAL, min: 1 },
    ] },
    /* LES CAPSULES — ON DORT ICI. Un mur d alveoles empilees sur trois hauteurs
       et les coursives qui les desservent. Chaque alveole a sa lumiere propre,
       donc le mur est un DAMIER LUMINEUX — le seul de la ville, contre les
       grandes enseignes uniformes de la rue.
       C est le pendant urbain du campement : beaucoup de recoins, aucune ligne
       de vue, et tout y a ete pose par quelqu un qui habite la. */
    { cle: "capsules", nom: "les capsules", label: "Les capsules", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      { x: 0.50, y: 0.14, w: 0.340, h: 0.036, kind: B_ALVEOLE },
      { x: 0.50, y: 0.86, w: 0.340, h: 0.036, kind: B_ALVEOLE },
      /* LES MURS LATERAUX COLLENT AUX BORDS, et c est le centre qui l impose :
         le Secteur tient x = 210 a 430 avec son glissant et 1185 a 1375 avec son
         ralentissement, sur toute la bande y = 315 a 585. Un mur d alveoles de
         270 px de haut ne peut passer qu a l exterieur. */
      { x: 0.08, y: 0.50, w: 0.036, h: 0.300, kind: B_ALVEOLE, min: 1 },
      { x: 0.92, y: 0.50, w: 0.036, h: 0.300, kind: B_ALVEOLE, min: 2 },
      /* LES COURSIVES NE SE FONT PAS FACE, et c est la meme contrainte que les
         murs : en cauchemar le Secteur porte deux geysers a (672, 288) et
         (928, 612), plus une braise qui balaie x = -6 a 518 autour de y = 250.
         Une passerelle de 384 px centree traverse forcement l un des trois. */
      { x: 0.72, y: 0.30, w: 0.240, h: 0.020, kind: B_COURSIVE },
      { x: 0.28, y: 0.70, w: 0.240, h: 0.020, kind: B_COURSIVE, min: 1 },
      { x: 0.34, y: 0.50, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
      { x: 0.68, y: 0.50, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR, min: 1 },
    ] },
    /* LE PARVIS — presque vide, deux masses monumentales. La respiration du
       theme, et la seule ou l on voit d un bout a l autre de la region. */
    /* LE PARKING — LE SEUL ENDROIT DU DEPOT OU LES MASSES SONT RANGEES. Tout le
       reste du Secteur est pose, empile ou tombe ; ici tout est aligne au
       cordeau, en rangees, et c est ce qui se lit d une vue entiere. Les
       vehicules sont BAS et LARGES : on voit par-dessus, on ne passe pas au
       travers, et la ligne de vue diverge de la ligne de marche comme a la
       sablerie — mais en ville.
       Sol LISSE : un niveau de stationnement est coule d un coup. */
    { cle: "parking", nom: "le parking", label: "Le parking", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.30, y: 0.14, w: 0.075, h: 0.036, kind: B_VEHICULE },
      { x: 0.30, y: 0.24, w: 0.075, h: 0.036, kind: B_VEHICULE },
      { x: 0.70, y: 0.86, w: 0.075, h: 0.036, kind: B_VEHICULE, min: 1 },
      { x: 0.70, y: 0.76, w: 0.075, h: 0.036, kind: B_VEHICULE, min: 1 },
      { x: 0.50, y: 0.14, w: 0.075, h: 0.036, kind: B_VEHICULE, min: 2 },
      { x: 0.08, y: 0.50, w: 0.014, h: 0.230, kind: B_PYLONE },
      { x: 0.92, y: 0.50, w: 0.014, h: 0.230, kind: B_PYLONE, min: 1 },
      { x: 0.50, y: 0.50, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
    ] },
    /* LA STATION — ON Y PASSE, ET LA LOI EST UNE LIGNE QU IL FAUT FRANCHIR. Les
       tourniquets font une file de cadres : on voit a travers, on ne passe
       qu entre eux, et les intervalles font 112 px — plus que `PASSAGE_MIN`,
       donc jamais un goulot. C est la seule region du depot dont l architecture
       soit une REGLE plutot qu une installation.
       Sol AJOURE : on marche sur la dalle d une trémie, pas sur du beton. */
    { cle: "station", nom: "la station", label: "La station", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.41, y: 0.50, w: 0.020, h: 0.070, kind: B_TOURNIQUET },
      { x: 0.50, y: 0.50, w: 0.020, h: 0.070, kind: B_TOURNIQUET },
      { x: 0.59, y: 0.50, w: 0.020, h: 0.070, kind: B_TOURNIQUET, min: 1 },
      { x: 0.32, y: 0.50, w: 0.020, h: 0.070, kind: B_TOURNIQUET, min: 2 },
      // PAS D ABRIBUS ICI : c est la seule famille que la rue ait a elle, et
      // une station qui en pose la lui retire. Un mur aveugle fait le meme
      // travail — donner un fond a la file — et il appartient deja a l arriere.
      // 0,18 et pas 0,20 : le bloc mordait la flaque de cauchemar, qui tient
      // (0,16 ; 0,28) sur 52 px de rayon — et ses quatre miroirs avec elle.
      { x: 0.20, y: 0.18, w: 0.100, h: 0.045, kind: B_AVEUGLE },
      { x: 0.80, y: 0.82, w: 0.100, h: 0.045, kind: B_AVEUGLE, min: 1 },
      { x: 0.30, y: 0.82, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR },
      { x: 0.70, y: 0.18, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR, min: 2 },
    ] },
    /* LE POSTE DE CONTROLE — DES CHICANES, ET C EST LA SEULE COMPOSITION DU
       DEPOT QUI IMPOSE UN DETOUR SANS FERMER QUOI QUE CE SOIT. Trois barrieres
       decalees : aucune ne bloque, les trois ensemble font ralentir. Et la
       GUERITE, la seule masse pleine, qui les regarde.
       Sol GRANULAT : on a repandu du gravier pour tenir la boue des camions. */
    { cle: "controle", nom: "le poste de controle", label: "Le poste de contrôle", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.30, y: 0.36, w: 0.090, h: 0.030, kind: B_BARRIERE },
      { x: 0.62, y: 0.52, w: 0.090, h: 0.030, kind: B_BARRIERE, min: 1 },
      { x: 0.34, y: 0.68, w: 0.090, h: 0.030, kind: B_BARRIERE, min: 2 },
      { x: 0.14, y: 0.16, w: 0.050, h: 0.060, kind: B_GUERITE },
      { x: 0.86, y: 0.84, w: 0.050, h: 0.060, kind: B_GUERITE, min: 1 },
      { x: 0.50, y: 0.86, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR },
    ] },
    /* LE PARC — LE SEUL CREUX D EAU DU DEPOT, ET LE SEUL VERT DU SECTEUR. La
       fontaine est un bassin : elle se dessine EN CREUX comme la fosse du puits
       et le bac du traitement, mais elle est la seule des trois a etre PLEINE.
       C est aussi la seule region du theme ou personne ne vend rien.
       Sol VEGETAL : de la pelouse tassee par les passages, pas du gazon. */
    { cle: "parc", nom: "le parc", label: "Le parc", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.32, y: 0.34, w: 0.110, h: 0.130, kind: B_FONTAINE },
      { x: 0.68, y: 0.66, w: 0.110, h: 0.130, kind: B_FONTAINE, min: 1 },
      { x: 0.66, y: 0.30, w: 0.075, h: 0.085, kind: B_FONTAINE, min: 2 },
      { x: 0.16, y: 0.72, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
      { x: 0.84, y: 0.28, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR, min: 1 },
    ] },
    /* LA TREMIE — ON DESCEND, ET C EST LA SEULE FOIS DU DEPOT. Deux murs de
       soutenement qui se rapprochent : la region a une DIRECTION, on lit d un
       coup d oeil ou elle mene, et c est la seule composition du jeu qui donne
       un sens a une cellule.
       Les murs sont longs et bas, donc on voit par-dessus : ce n est pas un
       couloir, c est une pente qu on longe. Sol MINERAL — de la pierre de
       soutenement, pas du beton. */
    { cle: "tremie", nom: "la tremie", label: "La trémie", bords: [BORD_MUR, BORD_OUVERT, BORD_MUR, BORD_OUVERT], poser: [
      { x: 0.30, y: 0.20, w: 0.320, h: 0.040, kind: B_SOUTENEMENT },
      { x: 0.30, y: 0.80, w: 0.320, h: 0.040, kind: B_SOUTENEMENT },
      { x: 0.72, y: 0.30, w: 0.150, h: 0.040, kind: B_SOUTENEMENT, min: 1 },
      { x: 0.72, y: 0.70, w: 0.150, h: 0.040, kind: B_SOUTENEMENT, min: 1 },
      { x: 0.10, y: 0.50, w: 0.062, h: 0.140, kind: B_AVEUGLE },
    ] },
    /* LA BERGE — IL Y A DE L EAU DERRIERE, ET ON NE LA VOIT PAS. Une file de
       bittes d amarrage le long d un bord, et rien au-dela : c est le SEUL
       endroit du depot dont le hors-champ soit une information. On comprend que
       le quai s arrete la parce que les bittes s alignent, et pour aucune autre
       raison.
       Sol POUDREUX : de la poussiere de vrac, ce qu on charge et decharge. */
    { cle: "berge", nom: "la berge", label: "La berge", bords: [BORD_OUVERT, BORD_MUR, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.20, y: 0.18, w: 0.026, h: 0.055, kind: B_BITTE },
      { x: 0.40, y: 0.18, w: 0.026, h: 0.055, kind: B_BITTE },
      { x: 0.60, y: 0.18, w: 0.026, h: 0.055, kind: B_BITTE, min: 1 },
      { x: 0.80, y: 0.18, w: 0.026, h: 0.055, kind: B_BITTE, min: 1 },
      { x: 0.30, y: 0.82, w: 0.026, h: 0.055, kind: B_BITTE, min: 2 },
      { x: 0.70, y: 0.82, w: 0.026, h: 0.055, kind: B_BITTE, min: 2 },
      { x: 0.50, y: 0.52, w: 0.014, h: 0.230, kind: B_PYLONE },
    ] },
    /* LE HALL — ON ATTEND DEBOUT, ET TOUT EST FAIT POUR QU ON SE TIENNE
       TRANQUILLE. Des banques d accueil larges et basses, un sol de resine
       lustre, et pas une seule chose a acheter : c est le seul interieur PROPRE
       du Secteur, et il n est ni un commerce ni un logement.
       La banque reprend le CONTENEUR : une boite chanfreinee, en quatrieme
       matiere apres la caisse, la carrosserie et le wagon. */
    { cle: "hall", nom: "le hall", label: "Le hall", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_OUVERT], poser: [
      { x: 0.28, y: 0.30, w: 0.150, h: 0.050, kind: B_BANQUE },
      { x: 0.72, y: 0.70, w: 0.150, h: 0.050, kind: B_BANQUE, min: 1 },
      { x: 0.72, y: 0.30, w: 0.150, h: 0.050, kind: B_BANQUE, min: 2 },
      { x: 0.28, y: 0.70, w: 0.150, h: 0.050, kind: B_BANQUE, min: 2 },
      { x: 0.50, y: 0.14, w: 0.150, h: 0.052, kind: B_DEVANTURE },
      { x: 0.50, y: 0.86, w: 0.150, h: 0.052, kind: B_DEVANTURE, min: 1 },
    ] },
    { cle: "parvis", nom: "le parvis", label: "Le parvis", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.31, y: 0.50, w: 0.062, h: 0.140, kind: B_DEVANTURE },
      { x: 0.69, y: 0.50, w: 0.062, h: 0.140, kind: B_DEVANTURE },
      // pas de PYLONE sur un parvis : ce qui monte ici est taille, pas boulonne.
      { x: 0.50, y: 0.21, w: 0.014, h: 0.230, kind: B_MONOLITHE },
      { x: 0.50, y: 0.79, w: 0.014, h: 0.230, kind: B_MONOLITHE, min: 1 },
      { x: 0.11, y: 0.20, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
      { x: 0.88, y: 0.81, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR, min: 1 },
      { x: 0.88, y: 0.20, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR, min: 2 },
      { x: 0.12, y: 0.80, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR, min: 2 },
      /* LE MONOLITHE — UNE MASSE LISSE ET SANS TEXTURE, le seul objet du depot
         qui n ait AUCUN detail. Dans un lieu ou tout est une surface qui vend,
         ce qui ne dit rien est ce qui impressionne le plus. */
      { x: 0.50, y: 0.50, w: 0.100, h: 0.130, kind: B_MONOLITHE },
    ] },
  ],
};

/* ===========================================================================
   LA TRAME — CE QUI A LA TAILLE D UN QUARTIER.

   LE DEFAUT QU ELLE CORRIGE SE MESURE : le depot n avait que DEUX echelles, le
   bloc (40 a 420 px) et le prop (20 a 140 px), pour une vue de 1600 x 900.
   RIEN N AVAIT LA TAILLE D UN ECRAN, donc rien ne se reconnaissait de loin, rien
   ne traversait plusieurs vues, et une region ne pouvait etre qu un rangement
   des trois memes formes.

   ELLE EST ANCREE AU QUARTIER, PAS A LA CELLULE. Une table de `poser` est en
   fractions de CELLULE et se reinstancie a chaque vue, donc elle est periodique
   par construction ; une trame est tiree UNE FOIS par region, en coordonnees de
   quartier, et ne se repete pas.

   ELLE SORT DANS `obstacles`, ET C EST TOUT L INTERET : collision, navigation,
   apparition, depot et separation la voient sans une ligne de plus, et RIEN ne
   circule sur le reseau — `buildBiome` est deterministe, les deux cotes la
   rejouent sur la graine.

   CINQ PRIMITIVES, PAS UN CATALOGUE. La sixieme du dossier — la FAILLE — n est
   pas ici : elle demande une silhouette de VIDE que `render/blocs.js` ne sait
   pas encore dessiner, et une faille rendue en bloc plein serait un mensonge.
   Elle entre avec son dessin, pas avant.

   CHAQUE PRIMITIVE DECLARE SES OUVERTURES, elle ne les subit pas : `TRAME_BRECHE`
   au minimum, une au moins tous les `TRAME_PAS`, et la couronne en a quatre.
   =========================================================================== */
export const TR_RUBAN = 0, TR_NEF = 1, TR_PEIGNE = 2, TR_COURONNE = 3,
             TR_CRIBLE = 4, TR_FAILLE = 5;

export const TRAME_NOMS = ["ruban", "nef", "peigne", "couronne", "crible", "faille"];

function poserBloc(out, x, y, w, h, kind) {
  if (w < 24 || h < 24) return;
  out.push({ x, y, w, h, kind });
}

/* UNE BANDE AVEC SES BRECHES. `pos` est la coordonnee sur l axe TRANSVERSE,
   `a0`/`a1` les bornes sur l axe de la bande. Au moins deux troncons, donc au
   moins une ouverture — une bande d un seul tenant fermerait la region. */
function bande(out, kind, a0, a1, pos, ep, vert) {
  const L = a1 - a0;
  const br = BIOME_CFG.TRAME_BRECHE;
  const n = Math.max(2, Math.round(L / BIOME_CFG.TRAME_PAS));
  const seg = (L - (n - 1) * br) / n;
  if (seg < ep) return;
  for (let i = 0; i < n; i++) {
    const c = a0 + i * (seg + br) + seg / 2;
    if (vert) poserBloc(out, pos, c, ep, seg, kind);
    else poserBloc(out, c, pos, seg, ep, kind);
  }
}

const NEF_BORD = 0.16;
const PEIGNE_DENT = 0.24;
const COURONNE_R = 0.30, COURONNE_N = 12;
const CRIBLE_NX = 4, CRIBLE_NY = 3, CRIBLE_TROUS = 2;

/* LE QUARTIER EST DONNE EN PIXELS ET LA TRAME SE POSE DEDANS. `rand` est le
   tirage de la carte : une region change de trame d une graine a l autre par ses
   parametres, jamais par son type — le type appartient au biome. */
export function poserTrame(type, kind, q, rand) {
  const out = [];
  const m = BIOME_CFG.TRAME_MARGE;
  const x0 = q.x0 + m, x1 = q.x1 - m, y0 = q.y0 + m, y1 = q.y1 - m;
  const W = x1 - x0, H = y1 - y0;
  if (W < 600 || H < 600) return out;
  const ep = BIOME_CFG.TRAME_EP;
  // l axe long : une structure qui traverse suit la plus grande dimension.
  const vert = H > W;
  const a0 = vert ? y0 : x0, a1 = vert ? y1 : x1;
  const t0 = vert ? x0 : y0, T = vert ? W : H;

  if (type === TR_RUBAN) {
    const n = 2;
    for (let i = 0; i < n; i++) {
      const pos = t0 + T * (0.30 + 0.40 * (i / Math.max(1, n - 1))) + (rand() - 0.5) * T * 0.10;
      bande(out, kind, a0, a1, pos, ep, vert);
    }
  } else if (type === TR_NEF) {
    // DEUX PAROIS ET UN FOND. Le fond ne ferme pas : son ouverture centrale vaut
    // le tiers de la nef, donc bien plus que `TRAME_BRECHE`.
    for (const f of [NEF_BORD, 1 - NEF_BORD]) {
      bande(out, kind, a0, a1, t0 + T * f, ep, vert);
    }
    const cote = rand() < 0.5 ? a0 + ep : a1 - ep;
    const p0 = t0 + T * NEF_BORD, p1 = t0 + T * (1 - NEF_BORD);
    const trou = (p1 - p0) / 3;
    const l = ((p1 - p0) - trou) / 2;
    for (const s of [p0, p1 - l]) {
      if (vert) poserBloc(out, s + l / 2, cote, l, ep, kind);
      else poserBloc(out, cote, s + l / 2, ep, l, kind);
    }
  } else if (type === TR_PEIGNE) {
    // UNE ECHINE ET SES DENTS. La dent s arrete avant le bord : un cul-de-sac
    // ouvert d un cote seulement se contourne, un cul-de-sac ferme bouchonne.
    const pos = t0 + T * 0.5;
    bande(out, kind, a0, a1, pos, ep, vert);
    const pas = Math.max(760, (a1 - a0) / 7);
    const dent = T * PEIGNE_DENT;
    let i = 0;
    for (let a = a0 + pas / 2; a < a1 - pas / 4; a += pas, i++) {
      const sens = (i & 1) ? 1 : -1;
      const c = pos + sens * (dent / 2 + ep / 2);
      if (vert) poserBloc(out, c, a, dent, ep, kind);
      else poserBloc(out, a, c, ep, dent, kind);
    }
  } else if (type === TR_COURONNE) {
    // QUATRE OUVERTURES, UNE PAR QUADRANT : `i % 3 === 2` en saute exactement
    // quatre sur douze, regulierement reparties.
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const R = Math.min(W, H) * COURONNE_R;
    const c0 = rand() * Math.PI * 2;
    const cote = ep * 2.6;
    for (let i = 0; i < COURONNE_N; i++) {
      if (i % 3 === 2) continue;
      const a = c0 + (i / COURONNE_N) * Math.PI * 2;
      poserBloc(out, cx + Math.cos(a) * R, cy + Math.sin(a) * R, cote, cote, kind);
    }
  } else if (type === TR_FAILLE) {
    /* UNE SAIGNEE, ET ELLE EST SEULE. C est la seule primitive qui decrive une
       ABSENCE : ses blocs sont `creux`, donc `drawObstacles` leur retire l ombre
       portee et le relief, et il ne reste que le bord et le fond.
       ELLE EST DEUX FOIS ET DEMIE PLUS EPAISSE QU UN RUBAN et n en pose qu une :
       un trou n a d interet que s il faut le contourner, et deux trous
       paralleles feraient une bande impraticable entre eux.
       ELLE BLOQUE LES TIRS COMME LE RESTE, et c est ecrit ailleurs : la rendre
       traversable demanderait que la simulation lise `kind`, or `kind` ne circule
       pas et le serveur ne le lit jamais. */
    const pos = t0 + T * (0.36 + rand() * 0.28);
    bande(out, kind, a0, a1, pos, ep * 2.4, vert);
  } else if (type === TR_CRIBLE) {
    // UN RESEAU REGULIER AVEC SES MANQUES : les allees sont orthogonales, donc
    // toujours traversantes, et deux cases retirees cassent la regularite.
    const cote = ep * 3.0;
    const sautA = Math.floor(rand() * CRIBLE_NX * CRIBLE_NY);
    const sautB = (sautA + 1 + Math.floor(rand() * (CRIBLE_NX * CRIBLE_NY - 2)))
      % (CRIBLE_NX * CRIBLE_NY);
    for (let j = 0; j < CRIBLE_NY; j++) {
      for (let i = 0; i < CRIBLE_NX; i++) {
        const k = j * CRIBLE_NX + i;
        if (CRIBLE_TROUS >= 1 && k === sautA) continue;
        if (CRIBLE_TROUS >= 2 && k === sautB) continue;
        poserBloc(out, x0 + W * ((i + 0.5) / CRIBLE_NX),
                  y0 + H * ((j + 0.5) / CRIBLE_NY), cote, cote, kind);
      }
    }
  }
  return out;
}

/* QUELLE TRAME POUR QUELLE REGION, ET AVEC QUELLE FAMILLE BATIE. Une entree par
   loi d implantation, dans l ordre d `OBSTACLES`. DEUX REGIONS D UN THEME
   N ONT JAMAIS LA MEME : c est ce qui rend une frontiere lisible a la
   silhouette, et `verifierTrame` le compare au lieu de le supposer.

   LA FAMILLE EST UNE DE CELLES DU LIEU, sans exception : ce lot pose la
   STRUCTURE, il n ajoute pas un dessin. Les familles propres a chaque biome
   viennent avec leur silhouette. */
/* PAR CLEF DE REGION, ET C EST LA TROISIEME FOIS QUE CE DEFAUT SE PAIE. `TRAMES`
   etait un tableau indexe par RANG, comme `loiNom` au lot 5 et comme `AIR` et
   `SOL_REGION` au lot 20 : inserer une region au milieu d `OBSTACLES` decale
   toutes les suivantes. Mesure : NEUF REGIONS SUR TRENTE ET UNE portaient la
   trame d une autre — six a l Usine, trois a la Friche — et la trame est la plus
   grosse structure de l ecran, jusqu a 3 680 px.
   Pire que le sol et les props : SIX de ces neuf posaient la famille EXCLUSIVE
   d une voisine, donc l exclusivite que `verifierSignature` declarait etait
   fausse EN JEU. La zone robotisee batissait des bacs de traitement.
   `familles()` compte donc aussi le `kind` de la trame : ce qui est pose est
   pose, quel que soit le systeme qui l a pose. */
const TRAMES = {
  usine: {
    chaine: { type: TR_RUBAN, kind: B_CHAINE },
    carrefour: { type: TR_CRIBLE, kind: B_MACHINE },
    // la maintenance est une HALLE : deux parois et un fond, en etablis.
    maintenance: { type: TR_NEF, kind: B_ETABLI },
    // les utilites sont un PARC, donc un crible — de transformateurs, pas
    // d armoires : le couple separe ce que le type seul confondrait.
    utilites: { type: TR_CRIBLE, kind: B_TRANSFO },
    degagement: { type: TR_NEF, kind: B_CHAINE },
    // le magasin est un PEIGNE de racks : meme primitive que la maintenance,
    // autre famille — et c est la famille qui porte la moitie de la silhouette.
    magasin: { type: TR_PEIGNE, kind: B_PALETTIER },
    // le traitement est LA FAILLE : la seule trame qui decrive une absence.
    traitement: { type: TR_FAILLE, kind: B_BAC },
    // la zone robotisee tourne autour de sa cellule : une couronne de cages.
    robotisee: { type: TR_COURONNE, kind: B_CAGE },
    // l expedition aligne ses quais sur un BORD : le peigne a echine de bord.
    expedition: { type: TR_PEIGNE, kind: B_QUAI },
    // une cour aligne ses bennes le long d un bord : un peigne a echine de bord.
    cour: { type: TR_PEIGNE, kind: B_BENNE },
    // une chaufferie tourne autour de ses corps : une couronne, comme le puits.
    chaufferie: { type: TR_COURONNE, kind: B_CHAUDIERE },
    // une zone de charge est un CRIBLE de bornes : des appuis reguliers et rien
    // entre eux, la meme primitive que le carrefour en beaucoup plus bas.
    charge: { type: TR_CRIBLE, kind: B_CHARGEUR },
  },
  fonderie: {
    coulee: { type: TR_RUBAN, kind: B_CONDUITE },
    // la sablerie est une HALLE BASSE : deux parois, un fond, et des chassis.
    sablerie: { type: TR_NEF, kind: B_MOULE },
    // le refroidissement aligne ses bassins : un peigne de trempe.
    refroidissement: { type: TR_PEIGNE, kind: B_BASSIN },
    // le laminoir est un RUBAN de masses espacees, pas une rigole continue.
    laminoir: { type: TR_RUBAN, kind: B_LAMINOIR },
    // un parc est un CRIBLE de tas : le meme reseau que les cuves, en mou.
    minerai: { type: TR_CRIBLE, kind: B_TAS },
    puits: { type: TR_COURONNE, kind: B_FOUR },
    // une modelerie est un PEIGNE de rayonnages, comme le magasin de l Usine.
    modelerie: { type: TR_PEIGNE, kind: B_GABARIT },
    // l ebarbage est une HALLE : deux parois de cabines et un fond.
    ebarbage: { type: TR_NEF, kind: B_CABINE },
    // un parc a brames est un CRIBLE, comme le parc a minerai — et c est la
    // famille qui separe le mou du cassant.
    brames: { type: TR_CRIBLE, kind: B_BRAME },
    // des silos sont un CRIBLE de cylindres : le meme reseau que les cuves, en
    // haut au lieu d etre en large.
    silos: { type: TR_CRIBLE, kind: B_SILO },
    // un crassier tourne autour de son point de deversement : une couronne.
    crassier: { type: TR_COURONNE, kind: B_CRASSE },
    // un laboratoire est un PEIGNE de paillasses, comme la modelerie l est de
    // rayonnages — et c est la famille qui separe les deux.
    labo: { type: TR_PEIGNE, kind: B_PAILLASSE },
  },
  friche: {
    champ: { type: TR_CRIBLE, kind: B_RUINE },
    mur: { type: TR_RUBAN, kind: B_MUR },
    // la casse est un CRIBLE de piles : meme primitive que le champ, autre
    // famille — c est la famille qui porte la moitie de la silhouette.
    casse: { type: TR_CRIBLE, kind: B_EPAVES },
    // une ossature EST un crible : des appuis reguliers et rien entre eux.
    chantier: { type: TR_CRIBLE, kind: B_POTEAU },
    // le vivant pousse en MASSE, pas en ligne : une couronne de bosquets.
    repris: { type: TR_COURONNE, kind: B_BOSQUET },
    effondrement: { type: TR_NEF, kind: B_MUR },
    // une voie est un RUBAN de wagons : la premiere ligne droite du theme.
    voie: { type: TR_RUBAN, kind: B_WAGON },
    // une decharge est un CRIBLE de balles — meme primitive que le champ et la
    // casse, et c est la famille qui separe les trois.
    decharge: { type: TR_CRIBLE, kind: B_BALLE },
    // une halle est un PEIGNE de fermes : le premier du theme, et c est le
    // dessin d une charpente vue a plat.
    halle: { type: TR_PEIGNE, kind: B_FERME },
    // une sous-station est un CRIBLE de socles : des appuis reguliers et rien
    // entre eux, la meme primitive que le chantier en beaucoup plus haut.
    sousstation: { type: TR_CRIBLE, kind: B_ISOLATEUR },
    // une station-service aligne ses ilots : un peigne, comme la halle.
    pompe: { type: TR_PEIGNE, kind: B_POMPE },
    // une lagune est une NEF a ciel ouvert : deux parois de bassins et un fond.
    lagune: { type: TR_NEF, kind: B_DECANTEUR },
  },
  nebuleuse: {
    derive: { type: TR_CRIBLE, kind: B_FRAGMENT },
    // le dock aligne ses postes d amarrage : un peigne a echine de bord.
    dock: { type: TR_PEIGNE, kind: B_BRAS },
    // la coursive est le seul VOLUME CLOS du theme.
    coursive: { type: TR_NEF, kind: B_CLOISON },
    // une ossature EST un crible : des appuis reguliers et rien entre eux.
    chantier: { type: TR_CRIBLE, kind: B_MEMBRURE },
    breche: { type: TR_NEF, kind: B_TRAVEE },
    // une serre est un PEIGNE de bacs : la meme primitive que le dock, et c est
    // la famille qui separe une file d amarrages d une file de cultures.
    serre: { type: TR_PEIGNE, kind: B_CULTURE },
    // un reacteur tourne autour de son coeur : la premiere couronne du theme.
    reacteur: { type: TR_COURONNE, kind: B_TORE },
    // un champ d antennes est un CRIBLE : des embases regulieres et rien entre.
    antennes: { type: TR_CRIBLE, kind: B_PARABOLE },
    // une soute est un PEIGNE de travees sanglees.
    soute: { type: TR_PEIGNE, kind: B_ARRIMAGE },
    // un hangar est une NEF : deux parois de berceaux et un fond.
    hangar: { type: TR_NEF, kind: B_NAVETTE },
    // un condenseur est un RUBAN de faisceaux — le premier du theme.
    condenseur: { type: TR_RUBAN, kind: B_ECHANGEUR },
    // une carriere tourne autour de son front de taille : une couronne.
    carriere: { type: TR_COURONNE, kind: B_FOREUSE },
  },
  secteur: {
    rue: { type: TR_RUBAN, kind: B_DEVANTURE },
    // une ruelle est un CANYON : deux parois aveugles et rien entre elles.
    ruelle: { type: TR_NEF, kind: B_AVEUGLE },
    // un marche est un PEIGNE d etals, pas un empilement de caisses.
    marche: { type: TR_PEIGNE, kind: B_ETAL },
    // les capsules sont un PEIGNE d alveoles : meme primitive, autre echelle.
    capsules: { type: TR_PEIGNE, kind: B_ALVEOLE },
    // le parvis tourne autour de sa masse : c est une couronne.
    parvis: { type: TR_COURONNE, kind: B_MONOLITHE },
    // un parking est un PEIGNE de rangees — la troisieme du theme, et c est la
    // famille qui les separe : etals, alveoles, vehicules.
    parking: { type: TR_PEIGNE, kind: B_VEHICULE },
    // une station est un RUBAN de portiques : la ligne qu on franchit.
    station: { type: TR_RUBAN, kind: B_TOURNIQUET },
    // un controle est un CRIBLE de chicanes — la premiere du Secteur, et la
    // seule trame du theme qui ne soit ni une file ni un alignement.
    controle: { type: TR_CRIBLE, kind: B_BARRIERE },
    // un parc tourne autour de son bassin : une couronne, comme le parvis.
    parc: { type: TR_COURONNE, kind: B_FONTAINE },
    // une tremie est une NEF a ciel ouvert : deux parois et un fond.
    tremie: { type: TR_NEF, kind: B_SOUTENEMENT },
    // une berge est un RUBAN de bittes le long d un bord.
    berge: { type: TR_RUBAN, kind: B_BITTE },
    // un hall est un CRIBLE de banques : des ilots reguliers dans du vide.
    hall: { type: TR_CRIBLE, kind: B_BANQUE },
  },
};


export function trameDe(cle, loi) {
  const t = TRAMES[cle] ?? TRAMES.usine;
  return t[loiCle(cle, loi)] ?? Object.values(t)[0];
}

/* LES BORNES D UN QUARTIER, EN PIXELS. Un quartier est d un seul tenant
   (`verifierDistricts` le garantit) donc sa boite englobante le decrit sans
   trou — c est assez pour y poser une structure, et ca ne coute qu un balayage
   de la grille de decoupage. */
export function bornesDistricts(grille, cols, rows, cw, ch) {
  const n = grille.reduce((m, q) => Math.max(m, q), 0) + 1;
  const b = [];
  for (let i = 0; i < n; i++) b.push({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const q = b[grille[cy * cols + cx]];
      q.x0 = Math.min(q.x0, cx * cw); q.x1 = Math.max(q.x1, (cx + 1) * cw);
      q.y0 = Math.min(q.y0, cy * ch); q.y1 = Math.max(q.y1, (cy + 1) * ch);
    }
  }
  return b;
}

const surHazard = (x, y, w, h, hazards) => hazards.some(z => {
  const px = Math.max(x - w / 2, Math.min(z.x, x + w / 2));
  const py = Math.max(y - h / 2, Math.min(z.y, y + h / 2));
  return (z.x - px) ** 2 + (z.y - py) ** 2 < z.r * z.r;
});

/* `g` EST UNE GARDE, PAS UNE TOLERANCE. Deux boites separees de moins que
   `NAV_CFG.PASSAGE_MIN` (80) laissent une bande libre plus etroite qu une case
   de navigation : aucun centre ne tombe dedans, la grille y voit un MUR, et un
   corps peut quand meme s y tenir. C est l ABRI PARFAIT, que ce depot a deja
   paye deux fois. 88 garde la marge d un arrondi.
   `navigation.js` n est pas importe ici — ce module ne depend de RIEN, c est sa
   regle — donc la valeur est ecrite avec sa raison. */
const TRAME_GARDE = 88;

const seChevauchent = (a, b, g = 0) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + g && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + g;

// un troncon plus court que ca n est plus une structure, c est un debris : il ne
// se lit ni de loin ni comme une ligne.
const TRAME_TRONCON_MIN = 300;
const TRAME_PAS_DECOUPE = 40;

/* ON DECOUPE, ON NE JETTE PAS. Mesure du premier jet : un bloc de trame etait
   rejete en entier des qu il touchait un danger ou debordait de son quartier —
   or une bande fait trois mille pixels de long, donc elle rencontre presque
   toujours quelque chose. Resultat, la trame PERDAIT LA MOITIE DE SES BLOCS EN
   CAUCHEMAR (2,23 % de surface au calme, 0,75 % en cauchemar a la Fonderie) :
   le mode ou la pression est la plus forte etait celui ou l architecture etait la
   moins lisible.
   On echantillonne donc le long de l axe LONG au pas d une case de navigation,
   on garde les suites valides et on rend un troncon par suite. Ce qui coupe une
   bande devient une OUVERTURE — un danger qui interrompt une structure se lit,
   une structure qui disparait ne se lit pas. */
function decouper(o, garde) {
  const vert = o.h >= o.w;
  const L = vert ? o.h : o.w;
  if (L <= TRAME_TRONCON_MIN) return garde(o.x, o.y, o.w, o.h) ? [o] : [];
  const a0 = (vert ? o.y : o.x) - L / 2;
  const ep = vert ? o.w : o.h;
  const n = Math.max(1, Math.round(L / TRAME_PAS_DECOUPE));
  const pas = L / n;
  const out = [];
  let debut = -1;
  for (let i = 0; i <= n; i++) {
    const c = a0 + (i + 0.5) * pas;
    const ok = i < n && garde(vert ? o.x : c, vert ? c : o.y,
                              vert ? ep : pas, vert ? pas : ep);
    if (ok && debut < 0) debut = i;
    if (!ok && debut >= 0) {
      const l = (i - debut) * pas;
      if (l >= TRAME_TRONCON_MIN) {
        const m = a0 + (debut + (i - debut) / 2) * pas;
        out.push({ x: vert ? o.x : m, y: vert ? m : o.y,
                   w: vert ? ep : l, h: vert ? l : ep, kind: o.kind });
      }
      debut = -1;
    }
  }
  return out;
}

/* L ECHELLE D UN DANGER APPARTIENT AU LIEU, SES DEGATS NON. `h.r` etait lu par
   `buildBiome` depuis toujours (`h.r ?? d.r`) et AUCUNE table ne s en servait :
   tout geyser faisait 70 px, toute flaque 85, dans les quatre lieux. Le dessin
   changeait, la geometrie non — et c est la geometrie qu on joue.

   `dot` NE BOUGE PAS, ET C EST DELIBERE. Ce qui blesse doit blesser pareil
   partout, sinon le joueur reapprend un bareme a chaque lieu ; la seule constante
   des quatre reste « ce qui est chaud blesse, ce qui est froid ralentit ». Un
   lieu se dit par la TAILLE et le RYTHME de ce qu il pose, pas par le chiffre.

   ET LES QUATRE RESTENT COMPARABLES : `verifierBiomes()` refuse maintenant qu une
   surface de danger s ecarte de plus de 25 % de la moyenne des quatre a mode
   egal. Une identite qui rendrait un lieu franchement plus dur serait un
   desequilibre, pas une identite. */
/* L USINE N Y FIGURE PAS, ET C EST CE QU ELLE DIT : elle EST le gabarit. Une
   installation reglee ne fait rien deborder, donc ses cinq dangers sont aux
   rayons de reference et les trois autres lieux se lisent PAR RAPPORT a elle. */
const ECHELLE = {
  // ce qui a ete laisse : large et diffus, sauf l arc electrique — un cable qui
  // claque est petit et mechant.
  friche: { [HZ_GEYSER]: 0.76, [HZ_POOL]: 1.24, [HZ_EMBER]: 1.10,
            [HZ_SLOW]: 1.10, [HZ_SLIP]: 1.10 },
  // la masse : tout y est plus gros, c est le seul mot de ce lieu.
  fonderie: { [HZ_GEYSER]: 1.14, [HZ_POOL]: 1.30, [HZ_EMBER]: 1.26,
              [HZ_SLOW]: 1.10, [HZ_SLIP]: 1.00 },
  // des CHAMPS : larges et mous, sauf ce qui est ponctuel — un eclat de plasma
  // et une anomalie sont petits, et c est le seul lieu ou ce qui blesse soit
  // PLUS FIN qu ailleurs alors que ce qui entrave est plus large.
  nebuleuse: { [HZ_GEYSER]: 0.72, [HZ_POOL]: 1.16, [HZ_EMBER]: 0.80,
               [HZ_SLOW]: 1.10, [HZ_SLIP]: 1.20 },
  // une rue est ETROITE : tout y est plus petit que partout ailleurs, sauf le
  // glissant, qui est l eau et qui court. C est le seul lieu dont TOUT ce qui
  // blesse tienne sous 1,0 — on y esquive au pas, pas a la course.
  secteur: { [HZ_GEYSER]: 0.88, [HZ_POOL]: 0.90, [HZ_EMBER]: 0.94,
             [HZ_SLOW]: 0.86, [HZ_SLIP]: 1.16 },
};

/* LE MODE NORMAL ETAIT LE MEME DANS LES QUATRE LIEUX : deux champs de
   ralentissement, meme rayon, meme place, 5,28 % de surface partout. Toute une
   difficulte sans une once d identite.

   Les deux dangers qui NE BLESSENT PAS sont pourtant deux verbes opposes — l un
   freine, l autre emporte — et c est assez pour dire un lieu : l Usine a de
   l huile sur un sol qu elle balaie encore, la Fonderie des champs de scorie qui
   collent, la Friche de la boue, la Nebuleuse n a PAS DE FREIN. */
const HZ_NORMAL = {
  usine: [
    { kind: HZ_SLOW, x: 0.50, y: 0.34 },
    { kind: HZ_SLIP, x: 0.50, y: 0.66 },
  ],
  fonderie: [
    { kind: HZ_SLOW, x: 0.50, y: 0.50 },
    { kind: HZ_SLIP, x: 0.16, y: 0.50 },
  ],
  friche: [
    { kind: HZ_SLOW, x: 0.58, y: 0.76 },
    { kind: HZ_SLIP, x: 0.14, y: 0.62 },
  ],
  // en apesanteur c est le FREINAGE qui manque, et ca se dit par l ECHELLE : son
  // glissant est le plus large des quatre (x1,20), et son champ de
  // ralentissement n est pas un sol qui colle mais un PUITS DE GRAVITE — le seul
  // des quatre qui ne soit pas une matiere.
  nebuleuse: [
    { kind: HZ_SLOW, x: 0.30, y: 0.55 },
    { kind: HZ_SLIP, x: 0.70, y: 0.45 },
  ],
  // une rue mouillee GLISSE, et le ralentissement y est ce qui s est accumule
  // dans le caniveau. Les deux se tiennent aux bords : le milieu reste franc.
  secteur: [
    { kind: HZ_SLIP, x: 0.20, y: 0.46 },
    { kind: HZ_SLOW, x: 0.80, y: 0.56 },
  ],
};

/* CHAQUE LIEU RECOMPOSE LES CINQ DANGERS, il n en invente aucun : ce sont les
   memes rayons, les memes degats, la meme horloge. Ce qui change est ce qu ils
   SONT — un geyser est un jet de vapeur a l Usine, une grille chaude a la
   Fonderie, un cable sous tension a la Friche, une anomalie dans le vide. La
   table de rendu vit dans `render/dangers.js`. */
const HZ_CAUCHEMAR = {
  usine: [
    { kind: HZ_GEYSER, x: 0.50, y: 0.34, period: 7.0, phase: 0.00 },
    { kind: HZ_GEYSER, x: 0.16, y: 0.50, period: 6.2, phase: 0.64 },
    { kind: HZ_EMBER, x: 0.50, y: 0.66, dx: 1, dy: 0, phase: 0.30 },
    { kind: HZ_POOL, x: 0.84, y: 0.50 },
    { kind: HZ_SLIP, x: 0.50, y: 0.50 },
  ],
  // la louche court ENTRE les deux fours : le couloir central est le seul
  // endroit ou elle a la place, et c est aussi le passage franc de la carte.
  fonderie: [
    { kind: HZ_POOL, x: 0.16, y: 0.14 },
    { kind: HZ_EMBER, x: 0.50, y: 0.50, dx: 1, dy: 0, phase: 0.00 },
    { kind: HZ_EMBER, x: 0.50, y: 0.70, dx: 1, dy: 0, phase: 0.50 },
    { kind: HZ_GEYSER, x: 0.50, y: 0.32, period: 6.6, phase: 0.20 },
  ],
  friche: [
    { kind: HZ_POOL, x: 0.14, y: 0.76 },
    { kind: HZ_POOL, x: 0.86, y: 0.24 },
    { kind: HZ_GEYSER, x: 0.56, y: 0.62, period: 7.4, phase: 0.10 },
    { kind: HZ_GEYSER, x: 0.38, y: 0.26, period: 6.0, phase: 0.55 },
    // le front de combustion RAMPE : une friche brule lentement et longtemps,
    // donc il va deux fois plus loin que la louche et met deux fois plus de
    // temps a le faire.
    { kind: HZ_EMBER, x: 0.50, y: 0.80, dx: 1, dy: 0, phase: 0.40,
      period: 19, span: 300 },
  ],
  nebuleuse: [
    { kind: HZ_SLIP, x: 0.24, y: 0.54 },
    { kind: HZ_EMBER, x: 0.50, y: 0.44, dx: 1, dy: 0, phase: 0.20, period: 7 },
    { kind: HZ_EMBER, x: 0.50, y: 0.62, dx: 0, dy: 1, phase: 0.70, period: 7 },
    { kind: HZ_POOL, x: 0.50, y: 0.88 },
    { kind: HZ_GEYSER, x: 0.76, y: 0.34, period: 4.6, phase: 0.45, active: 1.2 },
  ],
  /* CE QUI TUE DANS UNE RUE VIENT DU RESEAU, PAS DU SOL. Une fuite de vapeur
     sous la chaussee, un transformateur qui lache, une enseigne qui tombe et
     tracte son arc le long du trottoir. Le GEYSER est donc le danger dominant
     ici — c est le seul lieu ou le danger intermittent soit plus present que le
     permanent, et c est ce qui fait qu on TRAVERSE une rue au lieu de la
     contourner. */
  secteur: [
    { kind: HZ_SLIP, x: 0.20, y: 0.46 },
    { kind: HZ_GEYSER, x: 0.42, y: 0.32, period: 5.4, phase: 0.00 },
    { kind: HZ_GEYSER, x: 0.58, y: 0.68, period: 6.0, phase: 0.50 },
    { kind: HZ_EMBER, x: 0.16, y: 0.28, dx: 1, dy: 0, phase: 0.25, period: 9 },
    { kind: HZ_POOL, x: 0.80, y: 0.56 },
  ],
};

/* QUELLE VARIANTE DANS QUELLE CELLULE. Sorti de `buildBiome` pour que le
   verificateur d aretes juge LE MEME tirage que le jeu : deux assembleurs, meme
   ecrits pareil, divergent au premier reglage, et celui qui n est pas verifie
   est celui qui joue.

   CHAQUE CELLULE NE REGARDE QUE SES DEUX VOISINS DEJA POSES — gauche et haut —
   donc l ordre de parcours suffit et aucun solveur n est necessaire. Sur un
   3 x 3 il y a douze aretes internes ; douze contraintes se resolvent en
   balayant.
   UN THEME A UNE SEULE VARIANTE NE TIRE RIEN : consommer un `rand()` pour un
   choix qui n existe pas deplacerait toutes les arenes deja mesurees. Et le
   repli, quand aucune variante n est compatible, est de tirer dans TOUTES — une
   arete un peu dure vaut mieux qu une cellule vide. */
/* UN QUARTIER EST UNE REGION QU ON TRAVERSE, PAS UNE CELLULE.

   MESURE DU DEFAUT, ET ELLE EST LA RAISON DE CE DECOUPAGE : la variante etait
   tiree independamment PAR CELLULE, donc sur les 81 cellules d une arene on
   comptait 45 a 48 amas de meme variante, de 1,8 cellule en moyenne. Le joueur
   changeait de loi d implantation tous les deux ecrans — c est du bruit a
   l echelle ou il se deplace, et un lieu qui change tout le temps ne change
   jamais. Quatre lois d implantation existaient et aucune n avait la place de se
   faire reconnaitre.

   ON PLANTE, ON FAIT POUSSER, PUIS ON REPARE. Quelques germes, chaque cellule
   rejoint le plus proche, et la distance porte un BRUIT DE GRAINE : sans lui les
   frontieres sont les bissectrices de Voronoi, donc des droites, et on lit un
   decoupage administratif au lieu d un lieu.

   LA REPARATION EST L ANCIENNE BOUCLE, ET ELLE NE TOUCHE QUE CE QU IL FAUT :
   deux murs face a face ferment une arete interne, et une arete fermee coupe
   l arene. On ne renonce donc pas a l invariant — la cellule fautive reprend une
   variante compatible, et elle seule. C est ce qui garde `verifierVariantes` a
   zero faute sans rendre le pavage a son bruit d avant. */
/* COMBIEN DE CELLULES PAR QUARTIER — donc combien de VUES on traverse avant que
   le lieu change de discours. En dessous d une quinzaine on retombe sur le bruit
   qu on vient de retirer ; au-dessus, une arene de 81 cellules n a plus que deux
   quartiers et la traversee ne raconte rien. */
/* COMBIEN DE REGIONS — ET C EST UN TIRAGE, PAS UNE CONSTANTE. Cinq a chaque
   partie donnait cinq regions a chaque partie : la carte avait une taille de
   maille fixe, donc un rythme de traversee fixe. Trois grandes regions et six
   petites ne se parcourent pas pareil, et c est de la rejouabilite gratuite.
   LE PLAFOND RESTE LA TAILLE DE L ARENE : `DISTRICT_CELLULES` garantit qu une
   region fait au moins une douzaine de cellules, donc trois ecrans de cote. En
   dessous on retombe sur le bruit que le decoupage a justement retire. */
const DISTRICT_CELLULES = 12;
const DISTRICT_MIN = 3, DISTRICT_MAX = 6;

export function districtsDe(seed, cols, rows) {
  const rand = rng(seed ^ 0x5bf03635);
  const plafond = Math.max(1, Math.floor((cols * rows) / DISTRICT_CELLULES));
  const n = Math.min(plafond,
    DISTRICT_MIN + Math.floor(rand() * (DISTRICT_MAX - DISTRICT_MIN + 1)));
  const germes = [];
  // LES GERMES S ECARTENT, ET L ECART SUIT LEUR NOMBRE. Fixe, il tenait pour
  // cinq germes et devenait impossible a six : la boucle epuisait ses trente-deux
  // essais et posait deux germes cote a cote, donc un quartier d une cellule —
  // exactement ce que le decoupage a retire.
  const ecart = Math.max(1, Math.floor((cols + rows) / (n + 1.2)));
  for (let i = 0; i < n; i++) {
    let gx = 0, gy = 0;
    for (let essai = 0; essai < 32; essai++) {
      gx = Math.floor(rand() * cols); gy = Math.floor(rand() * rows);
      if (germes.every(g => Math.abs(g[0] - gx) + Math.abs(g[1] - gy) > ecart)) break;
    }
    germes.push([gx, gy]);
  }
  /* LE BRUIT S AJOUTE A LA DISTANCE, PAS A SON CARRE, ET IL RESTE PETIT DEVANT
     UNE CELLULE. Premier jet : `+/- 3,4` sur une distance AU CARRE — pres d un
     germe les carres valent 0, 1, 4, donc le bruit decidait seul et le decoupage
     sortait mouchete au lieu de continu. Ici il vaut au plus une demi-cellule :
     assez pour que la frontiere ne soit pas la bissectrice de deux germes — une
     droite se lit comme un decoupage administratif —, trop peu pour detacher une
     cellule de son quartier. */
  const bruit = new Array(cols * rows);
  for (let i = 0; i < bruit.length; i++) bruit[i] = rand() - 0.5;

  const out = new Array(cols * rows).fill(0);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < germes.length; i++) {
        const dx = cx - germes[i][0], dy = cy - germes[i][1];
        const d = Math.hypot(dx, dy) + bruit[cy * cols + cx];
        if (d < bd) { bd = d; best = i; }
      }
      out[cy * cols + cx] = best;
    }
  }

  /* UN QUARTIER D UN SEUL TENANT, ET C EST LE BRUIT QUI L EN EMPECHE. Le bruit
     vaut une demi-cellule : sur une frontiere il peut detacher une cellule de sa
     region et la coller a une autre qui ne la touche pas. Deux morceaux du meme
     quartier sont deux endroits qui se ressemblent sans se toucher, et le joueur
     croit revenir sur ses pas.
     ON REPARE AU LIEU DE RETIRER LE BRUIT : sans lui les frontieres sont les
     bissectrices des germes, donc des droites, et on lit un decoupage
     administratif. La reparation part du GERME — le seul point dont on sait
     qu il appartient a sa region — et tout ce qu elle n atteint pas rejoint le
     voisin le mieux represente autour de lui. */
  const atteint = new Array(cols * rows).fill(false);
  for (let i = 0; i < germes.length; i++) {
    const gi = germes[i][1] * cols + germes[i][0];
    if (out[gi] !== i) continue;
    const file = [gi];
    atteint[gi] = true;
    while (file.length) {
      const c = file.pop();
      const cx = c % cols, cy = (c / cols) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const j = ny * cols + nx;
        if (!atteint[j] && out[j] === i) { atteint[j] = true; file.push(j); }
      }
    }
  }
  for (let tour = 0; tour < cols * rows; tour++) {
    let reste = 0;
    for (let c = 0; c < out.length; c++) {
      if (atteint[c]) continue;
      const cx = c % cols, cy = (c / cols) | 0;
      let pris = -1;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const j = ny * cols + nx;
        if (atteint[j]) { pris = out[j]; break; }
      }
      if (pris < 0) { reste++; continue; }
      out[c] = pris;
      atteint[c] = true;
    }
    if (reste === 0) break;
  }
  return out;
}

/* CRITERE REJOUABLE DU DECOUPAGE. Trois questions, et la premiere est celle qui
   compte : un quartier doit etre d UN SEUL TENANT. Un quartier en deux morceaux
   est deux endroits qui se ressemblent sans se toucher, et c est pire que pas de
   quartier du tout — le joueur croit revenir sur ses pas. */
export function verifierDistricts(graines = 60, cols = 9, rows = 9) {
  const soucis = [];
  let sommeTaille = 0, nAmas = 0;
  for (let k = 0; k < graines; k++) {
    const s = k * 7 + 1;
    const g = districtsDe(s, cols, rows);
    const nq = g.reduce((m, q) => Math.max(m, q), 0) + 1;
    const vu = new Array(cols * rows).fill(false);
    const morceaux = new Array(nq).fill(0);
    for (let i = 0; i < g.length; i++) {
      if (vu[i]) continue;
      morceaux[g[i]]++;
      const file = [i]; vu[i] = true; let taille = 0;
      while (file.length) {
        const c = file.pop(); taille++;
        const cx = c % cols, cy = (c / cols) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const j = ny * cols + nx;
          if (!vu[j] && g[j] === g[i]) { vu[j] = true; file.push(j); }
        }
      }
      sommeTaille += taille; nAmas++;
    }
    for (let q = 0; q < nq; q++) {
      if (morceaux[q] > 1) {
        soucis.push(`graine ${s} : le quartier ${q} est en ${morceaux[q]} morceaux`);
      }
    }
    const tailles = new Array(nq).fill(0);
    for (const q of g) tailles[q]++;
    if (Math.min(...tailles) < 3) {
      soucis.push(`graine ${s} : un quartier de ${Math.min(...tailles)} cellule(s)`);
    }
  }
  const moy = sommeTaille / nAmas;
  if (moy < 8) {
    soucis.push(`quartier moyen de ${moy.toFixed(1)} cellules : en dessous de huit`
      + " on retombe sur le bruit d avant le decoupage");
  }
  return soucis;
}

/* UNE LOI D IMPLANTATION PAR QUARTIER, ET C EST ELLE LE BIOME.

   UNE CARTE EST D UN SEUL THEME. Le decoupage porte la LOI, jamais le theme :
   cinq regions de seize cellules, chacune sa loi, deux voisines jamais la meme.
   Poser cinq THEMES sur une carte donnait cinq mondes dans une arene — une
   friche pouvait etre une nebuleuse — et c est ce que ce module faisait jusqu au
   plan 38. Ce qui varie DANS un theme est une variation de ce theme. */
export function grilleVariantes(lieu, seed, cols, rows) {
  const vs = OBSTACLES[lieu] ?? [];
  const choix = new Array(rows * cols).fill(0);
  if (vs.length < 2) return choix;
  const rand = rng(seed);

  /* UNE LOI PAR QUARTIER, ET DEUX QUARTIERS VOISINS N EN PARTAGENT PAS.

     L ADJACENCE SE CONSTRUIT DANS LES DEUX SENS, et c est ce qui manquait : le
     premier jet ne regardait que le voisin de GAUCHE et du HAUT deja pose, donc
     un quartier entierement a DROITE d un autre ne le voyait jamais et les deux
     pouvaient porter la meme loi. Mesure : 24 graines x 5 themes, une dizaine de
     frontieres fautives — et le decoupage y disparaissait a l oeil.

     ON PREFERE UNE LOI JAMAIS POSEE. Quatre lois sur cinq regions doivent en
     montrer QUATRE ; le tirage reste, il se fait seulement dans les lois encore
     libres. Un `rand()` par quartier, comme avant. */
  const quartiers = districtsDe(seed, cols, rows);
  const nq = quartiers.reduce((m, q) => Math.max(m, q), 0) + 1;
  const adj = Array.from({ length: nq }, () => new Set());
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const d = quartiers[cy * cols + cx];
      if (cx > 0) {
        const g = quartiers[cy * cols + cx - 1];
        if (g !== d) { adj[d].add(g); adj[g].add(d); }
      }
      if (cy > 0) {
        const g = quartiers[(cy - 1) * cols + cx];
        if (g !== d) { adj[d].add(g); adj[g].add(d); }
      }
    }
  }
  const parQuartier = new Array(nq).fill(-1);
  const pris = new Set();
  for (let q = 0; q < nq; q++) {
    const voisines = new Set();
    const poses = [];
    for (const g of adj[q]) {
      if (parQuartier[g] < 0) continue;
      voisines.add(parQuartier[g]);
      poses.push(parQuartier[g]);
    }
    const libres = vs.map((_, i) => i)
      .filter(i => !voisines.has(i) && poses.every(j => loisAccordees(vs[i], vs[j])));
    const neufs = libres.filter(i => !pris.has(i));
    let pool;
    if (neufs.length > 0) pool = neufs;
    else if (libres.length > 0) pool = libres;
    else {
      /* PLUS DE REGIONS QUE LE THEME N A DE LOIS. Un quartier borde par quatre
         voisins qui portent les quatre lois ne PEUT pas etre distinct : c est une
         clique, pas un reglage. On repete alors une loi — mais JAMAIS une qui
         fermerait la frontiere : l accord des bords passe devant la repetition,
         parce qu une frontiere muree coupe l arene alors qu une loi repetee ne
         fait que se voir. Et c est l argument pour qu un theme porte plus de lois
         qu une carte n a de regions. */
      const sains = vs.map((_, i) => i)
        .filter(i => poses.every(j => loisAccordees(vs[i], vs[j])));
      const cands = sains.length > 0 ? sains : vs.map((_, i) => i);
      let bas = Infinity;
      pool = [];
      for (const i of cands) {
        let n = 0;
        for (const g of adj[q]) if (parQuartier[g] === i) n++;
        if (n < bas) { bas = n; pool = [i]; } else if (n === bas) pool.push(i);
      }
    }
    parQuartier[q] = pool[Math.floor(rand() * pool.length)];
    pris.add(parQuartier[q]);
  }

  // LA CELLULE PORTE LA LOI DE SA REGION, SANS EXCEPTION. C est ce qui fait
  // qu une region SE LIT : une reparation par cellule la reecrivait a moitie.
  for (let i = 0; i < choix.length; i++) choix[i] = parQuartier[quartiers[i]];
  return choix;
}

/* LA TRAME EXISTE-T-ELLE VRAIMENT, ET DEUX REGIONS EN ONT-ELLES DEUX ?

   TROIS QUESTIONS DE TABLE, GRATUITES, ET UNE QUATRIEME QUI COUTE. Les trois
   premieres se lisent sur `TRAMES` ; la quatrieme demande de CONSTRUIRE, parce
   qu une trame peut etre declaree et ne rien poser : elle est clipee a son
   quartier, ecartee des dangers et des blocs deja poses, et une structure qui
   sort vide ne leve rien du tout — elle disparait en silence, exactement le
   premier piege de `CLAUDE.md`.

   LA CONNEXITE N EST PAS ICI, ET C EST VOULU : `verifierNavigation` inonde deja
   la grille sur l ARENE ENTIERE et compte les cases inatteignables. Un second
   test dirait la meme chose, et ce module ne depend de RIEN — il ne peut pas
   importer `navigation.js`. */
export function verifierTrame(graines = [1, 7, 99, 323, 50, 8],
                              arenaW = 14400, arenaH = 8100,
                              viewW = 1600, viewH = 900) {
  const soucis = [];
  const tires = new Set();
  for (const b of BIOMES) {
    const t = TRAMES[b.key];
    if (!t) { soucis.push(`${b.key} : aucune trame`); continue; }
    /* LES DEUX SENS, COMME LE SOL ET L AIR. Une trame pour une region qui
       n existe pas est un reglage mort ; une region sans trame repliait en
       silence sur celle de la premiere. */
    const cles = clesDe(b.key);
    for (const c of cles) if (!t[c]) soucis.push(`${b.key}/${c} : aucune trame`);
    for (const c of Object.keys(t)) {
      if (!cles.includes(c)) soucis.push(`${b.key}/${c} : une trame pour une region qui n existe pas`);
    }
    const dispo = new Set(blocsDe(b.key));
    const vus = new Map();
    for (const [c, tr] of Object.entries(t)) {
      if (TRAME_NOMS[tr.type] === undefined) {
        soucis.push(`${b.key}/${c} : type de trame ${tr.type} inconnu`);
        continue;
      }
      tires.add(tr.type);
      if (!dispo.has(tr.kind)) {
        soucis.push(`${b.key}/${c} : la trame emploie la famille ${tr.kind},`
          + " qui n appartient pas au lieu");
      }
      /* ET ELLE DOIT ETRE A ELLE. La trame est la plus grosse structure de
         l ecran : batir avec la famille EXCLUSIVE d une voisine, c est lui
         retirer sa signature sans que rien ne le dise. Neuf regions sur trente
         et une le faisaient quand la table etait indexee par rang. */
      const sienne = famillesDe(b.key, c);
      if (sienne && !sienne.has(tr.kind)) {
        soucis.push(`${b.key}/${c} : sa trame batit en ${tr.kind}, que la region ne pose pas`);
      }
      /* LE COUPLE, PAS LE TYPE. Cinq primitives ne peuvent pas donner douze
         regions distinctes, et ce n est pas la bonne question : un peigne de
         racks et un peigne de quais ne se ressemblent pas — c est la FAMILLE
         qui porte la moitie de la silhouette. Ce qu on refuse est un doublon
         entier, structure ET vocabulaire. */
      const couple = `${tr.type}|${tr.kind}`;
      if (vus.has(couple)) {
        soucis.push(`${b.key} : « ${vus.get(couple)} » et « ${c} » portent la meme`
          + ` trame « ${TRAME_NOMS[tr.type]} » sur la meme famille — meme silhouette`);
      } else vus.set(couple, c);
    }
  }
  for (let ty = 0; ty < TRAME_NOMS.length; ty++) {
    if (!tires.has(ty)) soucis.push(`trame « ${TRAME_NOMS[ty]} » : ecrite, tiree par aucune region`);
  }

  /* UNE TRAME QUI NE POSE RIEN N EST PAS UNE TRAME. On compte les blocs poses
     par region sur des arenes REELLES : le clipping au quartier, l ecart aux
     dangers et la garde de passage peuvent tout manger, et rien ne le dirait. */
  const poses = new Map();
  for (const b of BIOMES) for (let i = 0; i < loisDe(b.key); i++) poses.set(`${b.key}|${i}`, 0);
  for (let bi = 0; bi < BIOMES.length; bi++) {
    const cle = BIOMES[bi].key;
    for (const seed of graines) {
      for (const di of [0, 2]) {
        const a = buildBiome(bi, di, seed, arenaW, arenaH, viewW, viewH);
        for (const [loi, n] of a.trameParRegion) {
          poses.set(`${cle}|${loi}`, (poses.get(`${cle}|${loi}`) ?? 0) + n);
        }
        if (a.trameSurface > BIOME_CFG.TRAME_SURFACE_MAX + 1e-9) {
          soucis.push(`${cle}/graine ${seed} : trame a ${(a.trameSurface * 100).toFixed(1)} %`
            + ` de surface, au-dessus du plafond`);
        }
      }
    }
  }
  for (const [k, n] of poses) {
    if (n === 0) soucis.push(`${k} : sa trame ne pose AUCUN bloc sur ${graines.length} graines`);
  }
  return soucis;
}

/* L OBLIQUE N EST PAS UNE SILHOUETTE, C EST UN MACRO DE POSE.

   `verifierEmpreinte` refuse une forme qui ne remplit pas son rectangle, et il a
   raison : la collision est une AABB, donc une masse penchee ferait buter sur du
   vide sur toute la surface de ses coins. Le depot n a par consequent aucun
   obstacle desaligne des axes — et il lui manque exactement ca, parce que TOUT y
   est horizontal ou vertical.

   ON DEPLIE EN ESCALIER. Une entree `{ oblique: true, x0, y0, x1, y1, ep }`
   devient trois a huit rectangles AABB, chacun remplissant le sien. Zero
   changement de collision, zero exception au verificateur, et l oeil lit une
   diagonale : c est la meme illusion qu une courbe de Bresenham.

   LES MARCHES NE SE TRAVERSENT PAS. Elles se suivent sur l axe LONG — leurs
   intervalles y sont disjoints — et se recouvrent sur l axe court tant que la
   montee par marche reste sous `ep`. C est ce qui interdit a la fois la
   superposition (`verifierSuperpositions`) et la fuite entre deux marches.

   LE DEPLIAGE EST EN FRACTIONS DE CELLULE, donc il ne depend pas de la taille de
   l arene : il se cache par table et ne se recalcule jamais. */
const MARCHE_MIN = 3, MARCHE_MAX = 8;
const deplie = new Map();

export function deplierPose(poser) {
  let v = deplie.get(poser);
  if (v) return v;
  v = [];
  for (const o of poser) {
    if (!o.oblique) { v.push(o); continue; }
    // en pixels de vue, sinon un ecart en x et le meme en y ne pesent pas pareil
    const dx = (o.x1 - o.x0) * 1600, dy = (o.y1 - o.y0) * 900;
    const long = Math.abs(dx) >= Math.abs(dy);
    const court = Math.abs(long ? dy : dx);
    const epPx = o.ep * (long ? 900 : 1600);
    const n = Math.min(MARCHE_MAX, Math.max(MARCHE_MIN, Math.ceil(court / (epPx * 0.8))));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
      const x = o.x0 + (o.x1 - o.x0) * tm, y = o.y0 + (o.y1 - o.y0) * tm;
      const w = long ? Math.abs(o.x1 - o.x0) / n : o.ep;
      const h = long ? o.ep : Math.abs(o.y1 - o.y0) / n;
      v.push({ x, y, w, h, kind: o.kind, hp: o.hp, min: o.min });
    }
  }
  deplie.set(poser, v);
  return v;
}

/* Est-ce que le decalage de cette cellule met un de ses blocs sur un danger ?
   On teste la POSE ENTIERE et non un bloc : le tremblement est par cellule, donc
   il se garde ou se jette en entier. */
function cellePosePerturbe(pose, cx, cy, cw, ch, mx, my, jx, jy, diffIndex, hazards) {
  for (const o of pose) {
    if ((o.min ?? 0) > diffIndex) continue;
    const w = o.w * cw, h = o.h * ch;
    const fx = mx ? 1 - o.x : o.x, fy = my ? 1 - o.y : o.y;
    const x = cx * cw + fx * cw + jx, y = cy * ch + fy * ch + jy;
    for (const z of hazards) {
      const px = Math.max(x - w / 2, Math.min(z.x, x + w / 2));
      const py = Math.max(y - h / 2, Math.min(z.y, y + h / 2));
      if ((z.x - px) ** 2 + (z.y - py) ** 2 < z.r * z.r) return true;
    }
  }
  return false;
}

/* LE MIROIR D UNE CELLULE, ET IL ETAIT A MOITIE MORT. `my = (cx * 2 + cy) & 1`
   vaut `cy & 1` — `cx * 2` est pair — donc les DEUX miroirs avaient la meme
   periode de deux cellules, et une region entiere ne contenait que QUATRE
   dispositions. Mesure a l ouverture du plan 39 : une arene de quatre-vingt-une
   vues n en portait que SEIZE distinctes, chacune revue cinq fois, et la
   repetition etait REGULIERE donc lisible comme une grille.

   UN HACHAGE DE POSITION LES REND INDEPENDANTS. Deux bits d un melange de
   (cx, cy, graine) : meme cout, meme determinisme des deux cotes, et la periode
   disparait au lieu de doubler. Soixante-quatre dispositions par arene.

   IL NE PEUT PLUS RIEN FERMER QU AVANT NE FERMAIT DEJA. Le bord d une variante
   appartient a la REGION depuis 0.42 — c est ecrit plus haut, et la raison en
   etait justement que le miroir changeait a chaque cellule. Un miroir tire au
   hasard ne change donc rien a l accord des aretes ; ce qu il change est la
   GEOMETRIE, et `verifierBiomes`, `verifierSuperpositions` et
   `verifierNavigation` la rejouent sur cinquante graines. */
function miroirDe(cx, cy, seed) {
  let h = Math.imul(cx | 0, 0x27d4eb2d) ^ Math.imul(cy | 0, 0x85ebca6b)
        ^ Math.imul(seed | 0, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return h >>> 0;
}

export function buildBiome(biomeIndex, diffIndex, seed = 1,
                           arenaW = 1600, arenaH = 900,
                           viewW = 1600, viewH = 900) {
  const rand = rng(seed);
  const surface = arenaW * arenaH;

  const cols = Math.max(1, Math.round(arenaW / viewW));
  const rows = Math.max(1, Math.round(arenaH / viewH));
  const cw = arenaW / cols, ch = arenaH / rows;

  /* UN THEME PAR CARTE. Ce qui change d une region a l autre est la LOI
     D IMPLANTATION, pas le monde : `choix` porte le biome de chaque cellule et
     `def` le theme de toute l arene. */
  const def = biomeAt(biomeIndex);
  const cle = def.key;

  const choix = grilleVariantes(cle, seed, cols, rows);
  const grilleDistricts = districtsDe(seed, cols, rows);

  const ech = ECHELLE[cle] ?? null;
  const tableHz = diffIndex === 1 ? (HZ_NORMAL[cle] ?? [])
    : diffIndex >= 2 ? (HZ_CAUCHEMAR[cle] ?? []) : [];

  const hazards = [];
  let hzArea = 0;
  let hzJetes = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const mi = miroirDe(cx, cy, seed);
      const mx = mi & 1, my = (mi >> 1) & 1;
      for (const h of tableHz) {
        const d = hazardAt(h.kind);
        if (!d) continue;
        const r = Math.round(h.r ?? d.r * (ech?.[h.kind] ?? 1));
        const area = Math.PI * r * r;
        if ((hzArea + area) / surface > BIOME_CFG.HAZARD_SURFACE_MAX) { hzJetes++; continue; }
        hzArea += area;
        const fx = mx ? 1 - h.x : h.x, fy = my ? 1 - h.y : h.y;
        hazards.push({
          kind: h.kind, r,
          x: cx * cw + fx * cw, y: cy * ch + fy * ch,
          dot: h.dot ?? d.dot,
          period: h.period ?? (h.kind === HZ_EMBER ? BIOME_CFG.EMBER_PERIOD : BIOME_CFG.GEYSER_PERIOD),
          active: h.active ?? BIOME_CFG.GEYSER_ACTIVE,
          phase: ((h.phase ?? 0) + (cy * cols + cx) * 0.37) % 1,
          dx: (h.dx ?? 0) * (mx ? -1 : 1), dy: (h.dy ?? 0) * (my ? -1 : 1),
          span: h.span ?? BIOME_CFG.EMBER_SPAN,
        });
      }
    }
  }

  const obstacles = [];
  const varis = OBSTACLES[cle] ?? [];
  const kDefaut = blocsDe(cle)[0] ?? 0;
  const jMax = cle === "friche" ? 40 : 0;
  let obsArea = 0;

  /* LA TRAME SE SERT LA PREMIERE, ET DU MEME BUDGET. Elle est ce qui a la taille
     d un quartier — la seule echelle qui manquait au depot — et elle est posee
     AVANT la boucle de cellules pour deux raisons : le budget bati est unique
     (`OBSTACLE_SURFACE_MAX`), et un bloc de cellule qui tombe dedans doit ceder,
     pas l inverse.
     Un bloc de trame sur un danger est jete, comme le tremblement de la Friche :
     `verifierBiomes` refuse un danger sous un obstacle, et une brèche de plus
     n a jamais ferme quoi que ce soit. */
  const trames = [];
  const trameParRegion = [];
  let trArea = 0;
  {
    const bornes = bornesDistricts(grilleDistricts, cols, rows, cw, ch);
    const randTr = rng((seed >>> 0) * 2749 + 17);
    for (let i = 0; i < bornes.length; i++) {
      // une region porte UNE loi, sans exception : la premiere de ses cellules
      // la donne toute entiere.
      const cellule = grilleDistricts.indexOf(i);
      const loi = choix[cellule < 0 ? 0 : cellule] ?? 0;
      const tr = trameDe(cle, loi);
      let n = 0;
      /* LA BOITE ENGLOBANTE D UN QUARTIER N EST PAS LE QUARTIER. Un quartier est
         d un seul tenant mais pas convexe : deux boites englobantes se recouvrent
         largement, donc deux trames voisines se traversaient — 207 paires de
         blocs sur cinquante graines a l Usine. Un morceau n est garde que s il
         tombe dans une cellule de SA region, s il est clair de tout danger et
         s il laisse sa distance de passage a ce qui est deja pose. */
      const garde = (x, y, w, h) => {
        const qx = Math.min(cols - 1, Math.max(0, Math.floor(x / cw)));
        const qy = Math.min(rows - 1, Math.max(0, Math.floor(y / ch)));
        if (grilleDistricts[qy * cols + qx] !== i) return false;
        if (surHazard(x, y, w, h, hazards)) return false;
        return !trames.some(t => seChevauchent({ x, y, w, h }, t, TRAME_GARDE));
      };
      for (const brut of poserTrame(tr.type, tr.kind, bornes[i], randTr)) {
        for (const o of decouper(brut, garde)) {
          const area = o.w * o.h;
          if ((trArea + area) / surface > BIOME_CFG.TRAME_SURFACE_MAX) continue;
          if (trames.some(t => seChevauchent(o, t, TRAME_GARDE))) continue;
          trArea += area; obsArea += area;
          trames.push(o);
          n++;
          obstacles.push({ x: o.x, y: o.y, w: o.w, h: o.h, kind: o.kind, maxHp: 0, hp: 0 });
        }
      }
      trameParRegion.push([loi, n]);
    }
  }
  /* LE TREMBLEMENT DE LA FRICHE EST PAR CELLULE, PAS PAR OBSTACLE. Tire par
     objet, il rapprochait deux voisins de 80 px au pire — plus que l ecart de la
     plupart des paires d un champ de ruines, qui est dense par definition. Sur
     40 graines x 3 modes il produisait 19 318 paires de blocs qui se traversent,
     dont 176 x 36 px : le seul lieu du depot ou deux habillages se dessinaient
     l un dans l autre en permanence.
     Par CELLULE, l ecart entre deux blocs d une meme variante ne bouge plus
     JAMAIS — la table redevient le seul endroit ou une superposition peut
     naitre, donc le seul a verifier. Ce qu on perd est le desordre a l interieur
     d une cellule ; ce qu on garde est la desynchronisation entre cellules, qui
     est ce qui casse la grille de 1600 x 900, la seule qui se voie. */
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const mi = miroirDe(cx, cy, seed);
      const mx = mi & 1, my = (mi >> 1) & 1;
      let jx = (rand() - 0.5) * 2 * jMax, jy = (rand() - 0.5) * 2 * jMax;
      const pose = deplierPose((varis[choix[cy * cols + cx]] ?? varis[0]).poser);
      /* UN TREMBLEMENT NE POSE PAS UN BLOC SUR UN DANGER. Mesure sur la Friche,
         carte d un seul lieu et arene REELLE : 41 arenes sur 200 avaient un
         danger sous un obstacle. `verifierBiomes` ne pouvait pas le voir — il
         tourne sur 1600 x 900, donc UNE cellule et un seul jeu de miroirs, et le
         defaut naissait du decalage. Le repli est la position de table, qui est
         justement celle que ce verificateur-la valide. */
      if (jMax > 0 && cellePosePerturbe(pose, cx, cy, cw, ch, mx, my, jx, jy,
                                     diffIndex, hazards)) { jx = 0; jy = 0; }
      for (const o of pose) {
        if ((o.min ?? 0) > diffIndex) continue;
        const w = o.w * cw, h = o.h * ch;
        const area = w * h;
        if ((obsArea + area) / surface > BIOME_CFG.OBSTACLE_SURFACE_MAX) continue;
        const fx = mx ? 1 - o.x : o.x, fy = my ? 1 - o.y : o.y;
        const bx = cx * cw + fx * cw + jx, by = cy * ch + fy * ch + jy;
        /* LA TRAME PASSE DEVANT, LA CELLULE CEDE — ET LA GARDE VAUT PLUS QUE LE
           CONTACT. Jeter seulement ce qui se traverse laissait des FENTES
           AVEUGLES de 33 px entre un bloc de cellule et une bande de trame :
           332 sur cinquante graines. La structure est ce qui se lit, donc c est
           elle qui reste, et elle reste avec sa distance de passage. */
        if (trames.some(t => seChevauchent({ x: bx, y: by, w, h }, t, TRAME_GARDE))) continue;
        obsArea += area;
        obstacles.push({
          x: bx,
          y: by,
          w, h,
          kind: o.kind ?? kDefaut,
          maxHp: o.hp ? BIOME_CFG.COVER_HP : 0,
          hp: o.hp ? BIOME_CFG.COVER_HP : 0,
        });
      }
    }
  }


  return {
    index: biomeIndex, key: def.key, nom: def.nom,
    /* LA LOI DE CHAQUE CELLULE SORT AVEC LA CARTE — c est LE BIOME d un point,
       et tout ce qui se dessine QUELQUE PART le lit. Elle ne circule pas :
       `buildBiome` est deterministe et les deux cotes le rejouent sur la graine. */
    lois: choix,
    /* COMBIEN DE LOIS LE THEME PORTE, et non combien la carte en montre : tout
       ce qui s indexe par loi — le vecteur de poids, sa table de durete — est de
       cette taille-la, et une carte qui n en montre que cinq lirait a cote. */
    nLois: Math.max(1, varis.length),
    melSeed: seed >>> 0,
    cols, rows, cw, ch,
    obstacles, hazards,
    /* LE DECOUPAGE SORT AVEC LE LIEU, ET C EST TOUT L INTERET. Le semis avait sa
       PROPRE notion de quartier — un hachage de la cellule divisee, sur une
       maille de 600 px — donc le batî et ce qui traîne autour tiraient deux
       decoupages independants, a deux echelles differentes, et ne tombaient
       jamais d accord. Un lieu se reconnait quand sa loi d implantation et son
       semis disent la meme chose au meme endroit.
       Il ne circule PAS sur le reseau : `buildBiome` est deterministe et les
       deux cotes le rejouent sur la meme graine. */
    districts: grilleDistricts, districtCols: cols, districtRows: rows,
    obstacleSurface: obsArea / surface,
    /* CE QUE LA TRAME A REELLEMENT POSE, PAR REGION. Une trame declaree peut ne
       rien poser — elle est clipee a son quartier, ecartee des dangers et des
       blocs deja poses — et une structure vide ne leve rien. `verifierTrame` le
       compte au lieu de le supposer. */
    trameSurface: trArea / surface,
    trameParRegion,
    hazardSurface: hzArea / surface,
    // le budget EVINCE en silence : une entree declaree pouvait ne jamais etre
    // construite sans que rien ne le dise, et un lieu se retrouvait avec un
    // danger de moins que ce que sa table annonce. On le compte.
    hazardJetes: hzJetes,
  };
}

/* LE BIOME D UN POINT DU MONDE. Point de passage unique : le semis, la teinte de
   sol, la charte des blocs et le HUD le lisent tous ici. Repli sur la premiere
   loi — une carte a toujours des lois, mais un appelant qui n a pas encore de
   carte (le module de scene s initialise avant la premiere manche) ne doit pas
   rendre `undefined`, qui deviendrait `NaN` puis rien. */
export function loiAt(b, x, y) {
  if (!b?.lois) return 0;
  const cx = Math.min(b.cols - 1, Math.max(0, Math.floor(x / b.cw)));
  const cy = Math.min(b.rows - 1, Math.max(0, Math.floor(y / b.ch)));
  return b.lois[cy * b.cols + cx] ?? 0;
}

/* LE POIDS DE CHAQUE REGION EN UN POINT, ET C EST TOUT LE SUJET DES FRONTIERES.

   `loiAt` rend un ENTIER, donc une fonction en escalier sur une grille dont la
   maille est UNE VUE : la frontiere de deux regions est une droite axiale longue
   d un ecran, et les quatre choses qui la lisent — teinte du sol, matiere du
   sol, densite du semis, matiere des traces — basculent toutes au MEME pixel.
   C est la SYNCHRONISATION qui fait le patchwork, pas l ecart de chaque axe.

   ICI ON REND UN VECTEUR. Au centre d une region un seul poids vaut 1 —
   l identite reste ENTIERE, c est la contrainte posee : on borde le biome, on ne
   le delave pas. Sur une frontiere deux poids se partagent l unite ; a un coin de
   trois regions, trois. Le voisinage est le 2x2 des centres de cellule, donc
   quatre lois peuvent peser : une jonction triple n est PAS un cas particulier,
   elle tombe du meme calcul — trois transitions independantes en feraient une
   quatrieme couture au centre.

   LE NOYAU A UN PLATEAU, et c est ce qui separe « melanger » de « delaver ». Un
   noyau bilineaire ordinaire fondrait sur une cellule ENTIERE, donc pur nulle
   part sauf au centre exact. Ici il vaut 1 jusqu a `0.5 - LARGE` et 0 au-dela de
   `0.5 + LARGE` : le fondu ne mord que sur `2 x LARGE` cellule. Les deux noyaux
   d un axe somment a 1 EXACTEMENT — smoothstep est antisymetrique autour de 1/2 —
   donc la normalisation ne rattrape rien, elle garde.

   LE GAUCHISSEMENT EST CE QUI TUE LA DROITE. On ne deforme pas la frontiere, on
   deplace le POINT D ECHANTILLONNAGE avant de la lire : deux octaves de bruit de
   valeur, donc une limite irreguliere a deux echelles. Sans lui le plateau ne
   ferait qu epaissir une droite, et une droite epaisse reste une droite. */
export const MEL_CFG = {
  // demi-largeur du fondu, en cellules. 0,24 fait 768 px sur une cellule de
  // 1600 : une demi-vue de transition, assez pour se lire en marchant.
  LARGE: 0.24,
  // amplitude du gauchissement, en cellules. Sous 0,12 la frontiere reste une
  // droite molle ; au-dela de 0,25 elle detache des ilots de leur region.
  ONDULE: 0.19,
  PAS: 0.62,
  OCTAVE: 0.45,
};

function hachMel(ix, iy, s) {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x85ebca6b)
        ^ Math.imul(s | 0, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

// bruit de valeur, lisse, centre sur zero. Rien ne s alloue : il tourne par
// pixel de masque et par cellule de semis.
function ondule(x, y, pas, s) {
  const fx = x / pas, fy = y / pas;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hachMel(ix, iy, s), b = hachMel(ix + 1, iy, s);
  const c = hachMel(ix, iy + 1, s), d = hachMel(ix + 1, iy + 1, s);
  const h0 = a + (b - a) * sx;
  return h0 + ((c + (d - c) * sx) - h0) * sy - 0.5;
}

function noyauMel(d, L) {
  const t = (0.5 + L - d) / (2 * L);
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/* LE POINT LU, GAUCHI. Sorti de `poidsAt` parce que ce qui doit s accorder avec
   la frontiere SANS peser les regions — le debord d une trame — lit le meme point
   deplace. Deux gauchissements differents dessineraient deux limites. */
export function pointMel(b, x, y, out) {
  const amp = MEL_CFG.ONDULE * b.ch, pas = MEL_CFG.PAS * b.ch;
  const s = (b.melSeed ?? 1) | 0;
  const ox = ondule(x, y, pas, s)
    + ondule(x, y, pas * 0.37, s + 11) * MEL_CFG.OCTAVE;
  const oy = ondule(y, x, pas, s + 7)
    + ondule(y, x, pas * 0.37, s + 19) * MEL_CFG.OCTAVE;
  out[0] = x + ox * 2 * amp;
  out[1] = y + oy * 2 * amp;
  return out;
}

const MEL_PT = [0, 0];

/* REMPLIT `poids` ET REND LE NOMBRE DE REGIONS QUI PESENT. `poids` est indexe par
   loi et remis a zero par l appel : aucune allocation, il tourne par pixel de
   masque et par cellule de semis.

   `durete` EST OPTIONNELLE ET C EST ELLE QUI REGLE LA LARGEUR PAR PAIRE. Une
   largeur unique est fausse dans les deux sens : deux regions de meme teinte n ont
   rien a fondre sur 768 px, et deux palettes eloignees en demandent plus. Un
   exposant sur le vecteur deplace la mi-pente sans toucher aux bouts — au-dessus
   de 1 le fondu se resserre, en dessous il s etale — donc la largeur se regle SANS
   que le noyau ait a connaitre la paire.
   `biomes.js` NE DEPEND DE RIEN : ce qui separe deux regions se lit dans la
   palette, donc c est l APPELANT qui construit la table (plate, de pas `nLois`). */
export function poidsAt(b, x, y, poids, durete = null) {
  poids.fill(0);
  if (!b?.lois) { poids[0] = 1; return 1; }
  pointMel(b, x, y, MEL_PT);
  const u = MEL_PT[0] / b.cw - 0.5, v = MEL_PT[1] / b.ch - 0.5;
  const i0 = Math.floor(u), j0 = Math.floor(v);
  const L = MEL_CFG.LARGE;
  let som = 0;
  for (let j = j0; j <= j0 + 1; j++) {
    const ky = noyauMel(Math.abs(v - j), L);
    if (ky <= 0) continue;
    const cy = j < 0 ? 0 : j >= b.rows ? b.rows - 1 : j;
    for (let i = i0; i <= i0 + 1; i++) {
      const kx = noyauMel(Math.abs(u - i), L);
      if (kx <= 0) continue;
      const cx = i < 0 ? 0 : i >= b.cols ? b.cols - 1 : i;
      poids[b.lois[cy * b.cols + cx] ?? 0] += kx * ky;
      som += kx * ky;
    }
  }
  if (som <= 0) { poids[loiAt(b, x, y)] = 1; return 1; }

  let n = 0, a = -1, d = -1, wa = -1, wd = -1;
  for (let i = 0; i < poids.length; i++) {
    const w = poids[i];
    if (w <= 0) continue;
    n++;
    if (w > wa) { d = a; wd = wa; a = i; wa = w; }
    else if (w > wd) { d = i; wd = w; }
  }
  // LE CAS COURANT EST UNE SEULE REGION — le centre d un biome — et il ne paie
  // ni exposant ni division.
  if (n === 1) { poids[a] = 1; return 1; }

  const g = durete && d >= 0 ? (durete[a * b.nLois + d] || 1) : 1;
  if (g !== 1) {
    som = 0;
    for (let i = 0; i < poids.length; i++) {
      if (poids[i] > 0) { poids[i] = Math.pow(poids[i], g); som += poids[i]; }
    }
  }
  const inv = 1 / som;
  for (let i = 0; i < poids.length; i++) poids[i] *= inv;
  return n;
}

/* LA REGION D UN POINT, TIREE DANS SES POIDS. Ce qui est CATEGORIEL — un
   catalogue de props, une matiere de trace — ne s interpole pas : on tire. `u` est
   le hachage deterministe que l appelant a deja pour cette cellule, donc deux
   clients voient le meme semis et la part de chaque region sur une POPULATION est
   exactement son poids. Au bord, un prop sur trois vient d en face et on ne peut
   pas dire lesquels : c est ca, une frontiere qui ne se lit pas. */
export function loiTiree(poids, u) {
  let c = 0;
  for (let i = 0; i < poids.length; i++) {
    c += poids[i];
    if (u < c) return i;
  }
  for (let i = poids.length - 1; i >= 0; i--) if (poids[i] > 0) return i;
  return 0;
}

/* LE MELANGE FAIT-IL CE QU IL DIT, ET SURTOUT NE FAIT-IL QUE CA.

   QUATRE QUESTIONS, ET LA PREMIERE EST CELLE QUI COMPTE : le CENTRE d une region
   reste PUR. Un fondu qui delave l identite au lieu de la border est le defaut que
   la mission interdit explicitement, et il ne leve rien — la carte reste jouable,
   elle cesse seulement de se lire.
   Les trois autres : les poids somment a 1 partout (sinon le sol s assombrit sur
   une bande sans que rien ne le dise) ; le melange melange VRAIMENT quelque part,
   et pas trop ; et une frontiere n est PAS une droite — on la mesure en comptant
   les abscisses distinctes ou la region dominante bascule, ligne par ligne. Une
   droite en donne UNE. */
export function verifierMelange(graines = 10) {
  const soucis = [];
  const aw = 14400, ah = 8100, vw = 1600, vh = 900;
  let purs = 0, vus = 0, melanges = 0, nMel = 0;
  for (let k = 0; k < graines; k++) {
    const b = buildBiome(0, 1, k * 13 + 3, aw, ah, vw, vh);
    const poids = new Float32Array(b.nLois);
    for (let cy = 0; cy < b.rows; cy++) {
      for (let cx = 0; cx < b.cols; cx++) {
        const n = poidsAt(b, (cx + 0.5) * b.cw, (cy + 0.5) * b.ch, poids);
        vus++;
        if (n === 1 && poids[b.lois[cy * b.cols + cx]] === 1) purs++;
      }
    }
    let mauvais = 0;
    for (let i = 0; i < 600; i++) {
      const x = ((i * 37) % 599) / 599 * aw, y = ((i * 53) % 587) / 587 * ah;
      const n = poidsAt(b, x, y, poids);
      let s = 0;
      for (let j = 0; j < poids.length; j++) s += poids[j];
      if (Math.abs(s - 1) > 1e-3 && mauvais++ === 0) {
        soucis.push("graine " + k + " : les poids somment a " + s.toFixed(3)
          + " en (" + (x | 0) + ", " + (y | 0) + ")");
      }
      nMel++;
      if (n > 1) melanges++;
    }
    const abscisses = new Set();
    let bascules = 0;
    for (let cy = 0; cy < b.rows; cy++) {
      const yy = (cy + 0.5) * b.ch;
      let prec = -1;
      for (let px = 0; px < aw; px += 40) {
        poidsAt(b, px, yy, poids);
        let best = 0;
        for (let j = 1; j < poids.length; j++) if (poids[j] > poids[best]) best = j;
        if (prec >= 0 && best !== prec) { abscisses.add(px); bascules++; }
        prec = best;
      }
    }
    if (bascules > 0 && abscisses.size < 3) {
      soucis.push("graine " + k + " : " + bascules + " bascules de region pour"
        + " seulement " + abscisses.size + " abscisse(s) — la frontiere est une droite");
    }
  }
  const partPure = purs / vus;
  if (partPure < 0.85) {
    soucis.push("seulement " + (partPure * 100).toFixed(0) + " % des centres de"
      + " cellule sont d une region PURE : le fondu delave au lieu de border");
  }
  const partMel = melanges / nMel;
  if (partMel < 0.10) {
    soucis.push((partMel * 100).toFixed(0) + " % des points melangent deux"
      + " regions : le fondu est trop etroit pour se voir");
  }
  if (partMel > 0.55) {
    soucis.push((partMel * 100).toFixed(0) + " % des points melangent deux"
      + " regions : il ne reste plus assez de centre pur");
  }
  return soucis;
}

// COMBIEN DE LOIS UN THEME PORTE-T-IL. Lu par les tables qui en declarent une
// entree chacune, et par leurs verificateurs.
export function loisDe(cle) { return (OBSTACLES[cle] ?? []).length; }

/* LA CLEF D UNE REGION, ET C EST PAR LA QUE LES AUTRES TABLES LA DESIGNENT.
   `AIR` et `SOL_REGION` etaient indexees par RANG : inserer une region au milieu
   d `OBSTACLES` decalait toutes les suivantes, donc chacune heritait de l air et
   du sol de sa voisine, SANS QU AUCUN VERIFICATEUR NE PUISSE LE VOIR — les deux
   tables restaient completes et bien formees.
   Mesure du degat sur le code LIVRE : six regions sur neuf a l Usine et deux sur
   cinq a la Friche portaient le sol ET l air d une autre. C est exactement le
   defaut que `loiNom` a paye au lot 5, et il avait ete corrige la SEULEMENT.
   Les clefs de toutes les regions d un theme, dans l ordre. */
export function clesDe(cle) { return (OBSTACLES[cle] ?? []).map(v => v.cle); }
export function loiCle(cle, loi) { return (OBSTACLES[cle] ?? [])[loi]?.cle ?? ""; }

/* LE NOM AFFICHE D UNE LOI. `nom` est l identifiant de developpement, sans
   accent ; ce qui va au joueur passe par `t()` et porte ses accents. */
export function loiNom(biomeIndex, loi) {
  const cle = biomeAt(biomeIndex).key;
  const v = (OBSTACLES[cle] ?? [])[loi];
  if (!v) return "";
  return t(`biome.${cle}.${v.cle}`, v.label ?? v.nom);
}

export function hazardState(h, t) {
  if (h.kind === HZ_EMBER) {
    const u = ((t / h.period) + h.phase) % 1;
    const tri = u < 0.5 ? u * 4 - 1 : 3 - u * 4;
    return { on: true, k: 1, x: h.x + h.dx * h.span * tri, y: h.y + h.dy * h.span * tri };
  }
  if (h.kind !== HZ_GEYSER) return { on: true, k: 1, x: h.x, y: h.y };

  const u = (((t / h.period) + h.phase) % 1) * h.period;
  if (u >= h.active) return { on: false, k: 0, x: h.x, y: h.y };
  const ramp = h.active * BIOME_CFG.GEYSER_RAMP;
  const k = Math.min(1, Math.min(u, h.active - u) / Math.max(0.001, ramp));
  return { on: true, k: Math.max(0.12, k), x: h.x, y: h.y };
}

export function weatherFor(diffIndex, seed, segment) {
  if (diffIndex < 2 || segment < 1) return null;
  const rand = rng((seed >>> 0) * 733 + segment * 9176);
  if (rand() < 0.34) return null;
  const id = Math.min(WEATHERS.length - 1, Math.floor(rand() * WEATHERS.length));
  const TAU = Math.PI * 2;
  return {
    id,
    ang: rand() * TAU,
    ph: rand(),
    p1: rand() * TAU,
    p2: rand() * TAU,
    pa: rand() * TAU,
  };
}

// LA BOURRASQUE N'EST PAS UN VECTEUR CONSTANT : angle et force sont des
// FONCTIONS DU TEMPS DE MANCHE, donc rejouables a l'identique des deux cotes
// sans un octet de reseau, comme l'etat d'un danger. L'enveloppe reprend
// d'ailleurs la forme de `hazardState` — periode, fenetre active, rampe : le
// vent RETOMBE A ZERO entre deux rafales, sinon il cesse d'etre un evenement et
// devient une taxe permanente sur le deplacement.
// Les deux sinus d'angle sont incommensurables et leur somme depasse le
// demi-tour, donc la rafale peut s'inverser en cours de segment.
export function windAt(w, t) {
  if (!w || w.id !== WX_BOURRASQUE) return null;
  const C = BIOME_CFG;
  const TAU = Math.PI * 2;
  const u = (((t / C.GUST_PERIOD) + w.ph) % 1) * C.GUST_PERIOD;
  const active = C.GUST_PERIOD * (1 - C.GUST_CALM);
  if (u >= active) return null;
  const rampe = Math.min(1, Math.min(u, active - u) / C.GUST_RAMP);
  if (rampe <= 0) return null;
  const ampleur = C.GUST_MIN + (1 - C.GUST_MIN)
    * (0.5 + 0.5 * Math.sin(t * C.GUST_AMP_HZ * TAU + w.pa));
  const ang = w.ang
    + Math.sin(t * C.GUST_TURN_HZ * TAU + w.p1) * C.GUST_SWING
    + Math.sin(t * C.GUST_TURN_HZ * 2.7 * TAU + w.p2) * C.GUST_SWING * 0.5;
  return { ang, dx: Math.cos(ang), dy: Math.sin(ang), force: rampe * ampleur };
}

/* LA SIGNATURE D UNE LOI D IMPLANTATION, en quatre nombres. Elle existe pour une
   seule raison : DEUX LIEUX NE PEUVENT PAS PARTAGER UNE LOI, et c est arrive —
   la Nebuleuse a porte celle de l Usine jusqu au plan 16, barre 0,230 x 0,036
   contre 0,300 x 0,034. Deux lieux a la meme implantation sont le meme lieu,
   quelle que soit la couleur du sol, et rien ne le signalait.

   Les quatre axes disent des choses differentes, et c est voulu : la DENSITE
   (combien d objets par vue), l ENCOMBREMENT (quelle part de sol), le CONTRASTE
   (le rapport de la plus grosse piece a la plus petite) et l ELONGATION (une
   barre ou un pave). Le contraste seul laissait passer Usine/Friche, l elongation
   seule laissait passer Usine/Nebuleuse. */
export function signatureBiome(biomeIndex, arenaW = 1600, arenaH = 900,
                               viewW = 1600, viewH = 900) {
  const b = buildBiome(biomeIndex, 2, 7, arenaW, arenaH, viewW, viewH);
  const vues = Math.max(1, Math.round(arenaW / viewW) * Math.round(arenaH / viewH));
  let min = Infinity, max = 0, elong = 0;
  for (const o of b.obstacles) {
    const a = o.w * o.h;
    if (a < min) min = a;
    if (a > max) max = a;
    elong = Math.max(elong, o.w / o.h, o.h / o.w);
  }
  return {
    key: b.key,
    densite: b.obstacles.length / vues,
    encombrement: b.obstacleSurface,
    contraste: min > 0 ? max / min : 1,
    elongation: elong,
  };
}

/* LA SIGNATURE D UNE VARIANTE, MESUREE SUR SA TABLE ET PAS SUR UNE ARENE. Le
   budget de surface est invariant d echelle — `obsArea / surface` se reduit a
   `somme(w x h)` en fractions — donc la loi d implantation se lit sur la table
   seule, sans construire quoi que ce soit. C est aussi ce qui la rend comparable
   entre deux variantes sans que le tirage de cellules s en mele. */
export function signatureVariante(lieu, vi, diffIndex = 2) {
  const v = (OBSTACLES[lieu] ?? [])[vi];
  if (!v) return null;
  /* LA POSE DEPLIEE, MEME RAISON QUE `gabaritsDe`. Une entree oblique n a ni
     `w` ni `h` : `o.w * o.h` rend `NaN`, `surf` devient `NaN`, et les deux
     comparaisons de min et de max sont FAUSSES pour un NaN — donc l entree
     disparaissait de trois axes sur six SANS RIEN LEVER. Mesure du symptome :
     « le degagement » et « le traitement » declares semblables a 13 % alors que
     leurs densites reelles different de 36 %. */
  const poser = deplierPose(v.poser).filter(o => (o.min ?? 0) <= diffIndex);
  let min = Infinity, max = 0, elong = 1, surf = 0;
  for (const o of poser) {
    const a = o.w * o.h;
    surf += a;
    if (a < min) min = a;
    if (a > max) max = a;
    elong = Math.max(elong, o.w / o.h, o.h / o.w);
  }
  /* DEUX AXES QUE LA SIGNATURE DE LIEU N A PAS, ET IL LUI FAUT LES DEUX ICI.
     Les quatre axes de `signatureBiome` disent ce qu il y a — combien, quelle
     surface, quel contraste, quelle forme — et rien de ce qui separe « vide au
     centre, dense au pourtour » de son inverse. Or c est exactement ce que les
     variantes font varier : la plupart sont des ARRANGEMENTS a inventaire
     comparable.
     `centrage` dit si la loi occupe le milieu ou les bords ; `etalement` si elle
     se groupe ou se repartit. Aucun des deux n entre dans le plafond — ils ne
     decrivent pas le lieu, ils decrivent la variante. */
  let dc = 0, sx = 0, sy = 0;
  for (const o of poser) {
    dc += Math.hypot(o.x - 0.5, o.y - 0.5);
    sx += o.x; sy += o.y;
  }
  const n = Math.max(1, poser.length);
  const mx = sx / n, my = sy / n;
  let ec = 0;
  for (const o of poser) ec += (o.x - mx) ** 2 + (o.y - my) ** 2;
  return {
    lieu, vi, nom: v.nom,
    densite: poser.length,
    encombrement: surf,
    contraste: min > 0 && min < Infinity ? max / min : 1,
    elongation: elong,
    centrage: dc / n,
    etalement: Math.sqrt(ec / n),
  };
}


/* UNE REGION DOIT POSSEDER UN OBJET, ET RIEN NE LE VERIFIAIT.

   C EST LA PREMIERE MESURE DU PLAN 39, ET LA SEULE QUI DECRIVE LE BATI. Les
   verificateurs existants croisent des tables (`verifierZones`), comparent des
   arrangements (`verifierVariantes`, sur six axes de GEOMETRIE) ou des semis
   (`verifierVocabulaire`). Aucun ne repond a « qu est-ce que cette region a que
   les autres n ont pas ». A l ouverture du plan : ZERO region sur vingt — les
   vingt employaient les trois familles historiques de leur theme, donc un biome
   ne pouvait etre qu un rangement des memes formes.

   LE PLANCHER EST ZERO ET IL EST ARITHMETIQUE, pas un gout : chaque theme porte
   plus de familles que de regions (16 pour 9 a l Usine, 9 pour 6 ou moins
   ailleurs), donc une exclusive par region est toujours atteignable. Le jour ou
   un theme aura plus de regions que de familles, la borne montera d elle-meme.

   LE PLAFOND EST LA VISEE DU DOSSIER, ET IL A ETE PAYE. Le pire recouvrement
   mesure etait 0,60 : chaque theme avait un NOYAU de trois familles que deux ou
   trois de ses regions employaient toutes, plus une exclusive chacune — donc
   3/5, structurellement. Huit substitutions ont casse les cinq noyaux : une pose
   qui change de `kind` sans changer de boite ne touche aucun des six axes de
   `signatureVariante` ni des quatre de `signatureBiome`, qui se lisent tous sur
   la GEOMETRIE. Pire mesure apres : 0,50 tout juste, sur les 86 paires.
   Le seuil est donc une garde contre la regression, et il est a la valeur
   atteinte — pas un cran au-dessus. */
const SIGNATURE_MAX = 0.50;

/* CE QU UNE REGION POSE, TRAME COMPRISE. La trame emet dans le meme tableau
   d obstacles que la pose de cellule : ne compter que `poser` faisait declarer
   exclusive une famille qu une voisine batissait par sa trame. */
function familles(cle, v, diffIndex = 2) {
  const k = new Set(deplierPose(v.poser)
    .filter(o => (o.min ?? 0) <= diffIndex)
    .map(o => o.kind));
  const tr = (TRAMES[cle] ?? {})[v.cle];
  if (tr) k.add(tr.kind);
  return k;
}

export function verifierSignature() {
  const soucis = [];
  let pire = 0, ou = "";
  for (const b of BIOMES) {
    const vs = OBSTACLES[b.key] ?? [];
    if (vs.length < 2) continue;
    const fam = vs.map(v => familles(b.key, v));
    const dispo = new Set(fam.flatMap(f => [...f]));
    if (dispo.size < vs.length) {
      soucis.push(`${b.key} : ${dispo.size} familles baties pour ${vs.length} regions`
        + " — une exclusive par region n est plus atteignable");
    }
    for (let i = 0; i < vs.length; i++) {
      const autres = new Set(fam.filter((_, j) => j !== i).flatMap(f => [...f]));
      if (![...fam[i]].some(k => !autres.has(k))) {
        soucis.push(`${b.key}/${vs[i].cle} : aucune famille batie a elle`
          + " — elle n est qu un rangement des formes de ses voisines");
      }
    }
    for (let i = 0; i < vs.length; i++) {
      for (let j = i + 1; j < vs.length; j++) {
        let n = 0;
        for (const k of fam[i]) if (fam[j].has(k)) n++;
        const jac = n / (fam[i].size + fam[j].size - n);
        if (jac >= 0.999) {
          soucis.push(`${b.key} : « ${vs[i].cle} » et « ${vs[j].cle} » batissent avec`
            + ` EXACTEMENT les memes ${fam[i].size} familles`);
        } else if (jac > pire) { pire = jac; ou = `${b.key} ${vs[i].cle}/${vs[j].cle}`; }
      }
    }
  }
  // le pire SORT avec le verdict : c est lui qui dira quand le plafond peut
  // descendre a la valeur visee, et il ne se devine pas.
  if (pire > SIGNATURE_MAX + 1e-9) {
    soucis.push(`${ou} : ${(pire * 100).toFixed(0)} % de bati commun pour un plafond`
      + ` de ${SIGNATURE_MAX * 100} % — un noyau de familles partage entre trois`
      + " regions donne 3/5, et c est ce qu il faut casser");
  }
  return soucis;
}

/* LE TEST DU SCREENSHOT, RENDU MECANIQUE — ET C EST LA DEMANDE CENTRALE DU
   CAHIER DES CHARGES : la difference doit etre PERCEPTIBLE EN JEU, pas seulement
   vraie dans une table. `verifierSignature` dit qu une region POSSEDE un objet ;
   il ne dit pas qu on le VOIT. Ce sont deux choses differentes, et le budget de
   surface les separe.

   ON BALAIE LES 81 VUES D UNE ARENE REELLE, cinq graines et deux modes, on
   demande a chaque vue quelle region la couvre, et on compte celles qui montrent
   au moins une piece de la famille exclusive de cette region. Le plancher est
   PAR REGION et non global : une moyenne de 99 % cacherait une region invisible
   une fois sur cinq.

   CE QUI FAIT MANQUER UNE VUE EST LE BUDGET, PAS LA TABLE. `buildBiome` jette un
   bloc des que la surface batie de l ARENE depasserait `OBSTACLE_SURFACE_MAX`,
   et il parcourt les cellules dans l ordre : ce qui tombe est donc ce qui vient
   en dernier, et le premier a tomber est le PLUS GROS. Mesure a l ouverture :
   le puits demandait 15,5 % d une cellule pour un plafond d arene de 10 % — sa
   fosse, la plus grosse masse du depot, disparaissait 14 fois sur 172 et la
   region perdait exactement ce qui la nomme.

   Il tourne en 100 ms, donc dans la suite RAPIDE. Une region qu aucune des
   cinquante arenes ne pose n est pas comptee ici : c est `verifierRegions` qui
   refuse ce cas, et le dire deux fois ferait deux verdicts pour un defaut. */
const VUE_MIN = 0.90;
const VUE_GRAINES = [1, 7, 42, 99, 1234];

/* LES FAMILLES QU UNE REGION EST SEULE A POSER, une par region et dans l ordre
   des lois. Exportee parce que le SEMIS en a besoin : ce qui a marque le sol
   d une region est ce que cette region a d unique, et sans cette liste la
   matiere de trace ne pouvait s accrocher qu a un quartier de props — un
   decoupage qui n a rien a voir avec le bati. */
export function famillesDe(cle, regionCle) {
  const v = (OBSTACLES[cle] ?? []).find(r => r.cle === regionCle);
  return v ? familles(cle, v) : null;
}

export function exclusivesDe(cle) {
  const vs = OBSTACLES[cle] ?? [];
  const fam = vs.map(v => familles(cle, v));
  return fam.map((f, i) => {
    const autres = new Set(fam.filter((_, j) => j !== i).flatMap(g => [...g]));
    return new Set([...f].filter(k => !autres.has(k)));
  });
}

export function verifierVue(arenaW = 14400, arenaH = 8100, viewW = 1600, viewH = 900) {
  const soucis = [];
  let pire = 1, ou = "";
  for (let bi = 0; bi < BIOMES.length; bi++) {
    const cle = BIOMES[bi].key;
    const vs = OBSTACLES[cle] ?? [];
    const excl = exclusivesDe(cle);
    const vu = vs.map(() => [0, 0]);
    for (const seed of VUE_GRAINES) {
      for (const diff of [1, 2]) {
        const b = buildBiome(bi, diff, seed, arenaW, arenaH, viewW, viewH);
        for (let cy = 0; cy < b.rows; cy++) {
          for (let cx = 0; cx < b.cols; cx++) {
            const loi = b.lois[cy * b.cols + cx];
            const e = excl[loi];
            if (!e || e.size === 0) continue;
            const x0 = cx * viewW, y0 = cy * viewH;
            let ok = false;
            for (const o of b.obstacles) {
              if (o.x + o.w / 2 < x0 || o.x - o.w / 2 > x0 + viewW) continue;
              if (o.y + o.h / 2 < y0 || o.y - o.h / 2 > y0 + viewH) continue;
              if (e.has(o.kind)) { ok = true; break; }
            }
            vu[loi][1]++;
            if (ok) vu[loi][0]++;
          }
        }
      }
    }
    for (let i = 0; i < vs.length; i++) {
      const [o, n] = vu[i];
      if (n === 0) continue;
      const p = o / n;
      if (p < VUE_MIN) {
        soucis.push(`${cle}/${vs[i].cle} : sa famille ne se voit que dans `
          + `${(p * 100).toFixed(1)} % de ses vues (${o}/${n}) — plancher ${VUE_MIN * 100} %`);
      }
      if (p < pire) { pire = p; ou = `${cle}/${vs[i].cle}`; }
    }
  }
  return soucis;
}

/* DEUX BIOMES D UN MEME THEME DOIVENT DIFFERER ASSEZ POUR SE DISTINGUER. Sans
   plancher, deux biomes sont un doublon — et un doublon ne se signale pas tout
   seul, il se joue. Ce qui les garde DANS le theme n est plus ici : voir
   `VARIANTE_AXES`. */
const VARIANTE_PLANCHER = 0.15;

// deux lois sont distinctes des qu'UN axe les separe franchement. Exiger les
// quatre interdirait des variations legitimes ; n'en exiger aucun a produit deux
// fois la meme map.
const LOI_ECART = 0.40;
const LOI_AXES = ["densite", "encombrement", "contraste", "elongation"];

/* LE PLANCHER SE LIT SUR SIX AXES, ET IL EST LE SEUL QUI RESTE. Il repond
   « est-ce encore la meme variante ? », et deux arrangements opposes a inventaire
   egal sont deux variantes — donc il voit les six.

   LE PLAFOND GEOMETRIQUE EST SUPPRIME, ET C EST UNE MESURE QUI L A DIT. Il
   repondait « est-ce encore le meme lieu ? » sur les quatre axes de
   `verifierLois` — combien, quelle surface, quel contraste, quelle forme. Or ces
   quatre axes ne portent PAS l identite d un theme : mesure sur l existant, en
   distance normalisee au centroide de chaque theme, TROIS regions sur vingt sont
   deja plus proches du centroide d un AUTRE theme que du leur — l atelier de
   l Usine (marge 0,49), les cuves de la Fonderie (0,98) et le mur de la Friche
   (0,72). Le plafond ne les voyait pas parce qu il comparait deux a deux ; il
   aurait suffi d une cinquieme loi un peu plus vide pour le faire rougir sur une
   conception juste.

   CE QUI TIENT UN THEME EST AILLEURS, ET C EST DEJA VERIFIE. La CHARTE
   (`BIOME_SKIN`, `lumDir`, `GRILLE`, `FOND`, `LED`, `CONTOUR`) est par theme par
   construction, donc un biome ne peut pas en sortir. Le VOCABULAIRE l est aussi :
   `verifierBiomes` refuse un obstacle qui porterait la famille d un autre lieu,
   `verifierTrame` la meme chose pour la structure, et `verifierBlocs` refuse une
   famille sans fiche. LA GEOMETRIE, ELLE, DOIT ETRE LIBRE — c est exactement ce
   qui separe deux endroits d un meme monde. */
export const VARIANTE_AXES = [...LOI_AXES, "centrage", "etalement"];

// ce qui separe une identite d un desequilibre. 25 % laisse une echelle de lieu
// se voir ; au-dela, un lieu demande objectivement plus au joueur que les trois
// autres, et la difficulte choisie cesse d etre le cadre principal.
const HZ_ECART = 0.25;

/* QUELS `kind` UN LIEU POSE-T-IL, TOUS MODES CONFONDUS. Lu par
   `verifierDangers()` (`render/dangers.js`) pour croiser les deux tables : un
   dessin que plus aucune difficulte ne tire est une entree morte, un `kind` pose
   sans dessin replie sur `defaut()` — un disque ambre — SANS RIEN LEVER. */
export function hazardsDe(lieu) {
  const v = new Set();
  for (const t of [HZ_NORMAL[lieu], HZ_CAUCHEMAR[lieu]]) {
    for (const h of t ?? []) v.add(h.kind);
  }
  return [...v].sort((a, b) => a - b);
}

/* LES VARIANTES : ASSEZ DIFFERENTES POUR SE VOIR, ASSEZ PROCHES POUR RESTER LE
   MEME LIEU — ET LEURS ARETES DOIVENT S ACCORDER SUR CINQUANTE GRAINES.

   TROIS EXIGENCES, ET LA TROISIEME EST CELLE QUI COUTE. Le plancher et le
   plafond se lisent sur la table, donc ils sont gratuits ; la compatibilite des
   bords, elle, depend du TIRAGE, donc elle se rejoue sur des graines. Un
   assembleur qui poserait deux murs face a face couperait l arene en deux, et le
   symptome serait « la horde n arrive jamais », pas une erreur. */
export function verifierVariantes() {
  const soucis = [];
  const dicoEn = new Set(clefsDe("en"));

  for (const b of BIOMES) {
    const vs = OBSTACLES[b.key] ?? [];
    if (vs.length === 0) { soucis.push(`${b.key} : aucune variante`); continue; }
    /* LA CLEF D UNE REGION EST SON IDENTIFIANT, PAS SON RANG. `loiNom` composait
       `biome.<lieu>.loi<i>` : reordonner `OBSTACLES` — ou en inserer une au
       milieu — reecrivait TOUS les noms affiches, dans les deux langues, sans
       qu une seule ligne ne bouge et sans qu aucun verificateur ne le voie. Un
       theme qui passe de quatre regions a douze le fera forcement. */
    const cles = new Set();
    for (const v of vs) {
      if (!v.cle) soucis.push(`${b.key} : une region sans clef`);
      else if (!/^[a-z0-9_]+$/.test(v.cle)) {
        soucis.push(`${b.key}/${v.cle} : une clef s ecrit sans accent ni majuscule`);
      } else if (cles.has(v.cle)) soucis.push(`${b.key} : deux regions sous la clef « ${v.cle} »`);
      else cles.add(v.cle);
    }
    /* UNE REGION SANS TRADUCTION NE SE SIGNALE JAMAIS : `t()` replie sur le
       francais, ce qui est le bon comportement en jeu et exactement ce qui rend
       un oubli invisible. On croise donc avec le dictionnaire. */
    for (const v of vs) {
      if (!v.cle) continue;
      if (!dicoEn.has(`biome.${b.key}.${v.cle}`)) {
        soucis.push(`${b.key}/${v.cle} : aucun nom anglais — le joueur verra le francais`);
      }
    }
    const noms = new Set();
    for (const v of vs) {
      if (!v.nom) soucis.push(`${b.key} : une variante sans nom`);
      else if (noms.has(v.nom)) soucis.push(`${b.key} : deux variantes nommees « ${v.nom} »`);
      else noms.add(v.nom);
      if (!Array.isArray(v.bords) || v.bords.length !== 4) {
        soucis.push(`${b.key}/${v.nom} : bords absents ou mal formes`);
      } else if (v.bords.every(x => x === BORD_MUR)) {
        soucis.push(`${b.key}/${v.nom} : quatre bords murs — la cellule est une ile`);
      }
      if (!Array.isArray(v.poser) || v.poser.length === 0) {
        soucis.push(`${b.key}/${v.nom} : variante vide`);
      }
    }

    const sig = vs.map((_, i) => signatureVariante(b.key, i));
    for (let i = 0; i < sig.length; i++) {
      for (let j = i + 1; j < sig.length; j++) {
        let pire = 0, quoi = "";
        for (const axe of VARIANTE_AXES) {
          const a = sig[i][axe], c = sig[j][axe];
          const d = Math.abs(a - c) / Math.max(1e-9, Math.max(Math.abs(a), Math.abs(c)));
          if (d > pire) { pire = d; quoi = axe; }
        }
        if (pire < VARIANTE_PLANCHER) {
          soucis.push(`${b.key} : « ${sig[i].nom} » et « ${sig[j].nom} » se ressemblent`
            + ` (${(100 * pire).toFixed(0)} % au mieux sur ${quoi},`
            + ` plancher ${100 * VARIANTE_PLANCHER} %)`);
        }
      }
    }
  }

  return soucis;
}

export function verifierBiomes(seeds = [1, 7, 99], arenaW = 1600, arenaH = 900,
                               viewW = 1600, viewH = 900) {
  const soucis = [];
  const budget = BIOME_CFG.HAZARD_SURFACE_MAX;

  /* UNE FAMILLE APPARTIENT A UN LIEU, ET AUCUNE NE S OUBLIE AU CATALOGUE. Les
     deux sens comptent : un obstacle qui porterait la famille d un autre lieu
     y dessinerait un objet etranger sans rien lever, et une famille que plus
     aucune table ne tire est une entree morte — meme regle que pour les props. */
  const tirees = new Set();
  for (const b of BIOMES) {
    for (const o of (OBSTACLES[b.key] ?? []).flatMap(v => v.poser)) {
      const f = blocAt(o.kind);
      if (!f) soucis.push(`${b.key} : obstacle sans famille declaree`);
      else if (f.lieu !== b.key) soucis.push(`${b.key} : la famille ${f.key} appartient a ${f.lieu}`);
      else tirees.add(o.kind);
    }
  }
  for (let k = 0; k < BLOCS.length; k++) {
    if (!tirees.has(k)) soucis.push(`${BLOCS[k].lieu}/${BLOCS[k].key} : famille jamais tiree`);
  }

  /* LA DIFFICULTE DOIT SE VOIR DANS LE TERRAIN, ET DANS LE BON SENS. Trois
     modes qui produisent la meme geometrie ne servent a rien ; un cauchemar plus
     OUVERT qu un normal serait pire encore, et ce serait une inversion de signe
     que personne ne remarquerait a l ecran. On exige donc la monotonie stricte,
     par lieu, sur le NOMBRE et sur la SURFACE. */
  for (const b of BIOMES) {
    const bi = BIOMES.indexOf(b);
    const v = [0, 1, 2].map(di => buildBiome(bi, di, 7, arenaW, arenaH, viewW, viewH));
    for (let di = 1; di < 3; di++) {
      const m = ["calme", "normal", "cauchemar"];
      if (v[di].obstacles.length <= v[di - 1].obstacles.length) {
        soucis.push(`${b.key} : ${m[di]} n'a pas plus d'obstacles que ${m[di - 1]} `
          + `(${v[di - 1].obstacles.length} -> ${v[di].obstacles.length})`);
      }
      if (v[di].obstacleSurface <= v[di - 1].obstacleSurface) {
        soucis.push(`${b.key} : ${m[di]} n'encombre pas plus que ${m[di - 1]} `
          + `(${(v[di - 1].obstacleSurface * 100).toFixed(1)} -> `
          + `${(v[di].obstacleSurface * 100).toFixed(1)} %)`);
      }
    }
  }

  const sigs = BIOMES.map((_, i) => signatureBiome(i, arenaW, arenaH, viewW, viewH));
  for (let a = 0; a < sigs.length; a++) {
    for (let b = a + 1; b < sigs.length; b++) {
      let ecart = 0, axe = "";
      for (const k of LOI_AXES) {
        const hi = Math.max(sigs[a][k], sigs[b][k]);
        const e = hi > 0 ? Math.abs(sigs[a][k] - sigs[b][k]) / hi : 0;
        if (e > ecart) { ecart = e; axe = k; }
      }
      if (ecart < LOI_ECART) {
        soucis.push(`${sigs[a].key}/${sigs[b].key} : lois d'implantation trop proches `
          + `(meilleur axe ${axe} a ${(ecart * 100).toFixed(0)} %, seuil ${LOI_ECART * 100} %)`);
      }
    }
  }

  /* LES QUATRE LIEUX DOIVENT RESTER COMPARABLES. Une echelle de danger par lieu
     est une identite ; la meme echelle poussee trop loin est un desequilibre, et
     rien ne distinguait les deux. A mode egal, aucune surface ne s ecarte de plus
     de `HZ_ECART` de la moyenne des quatre — c est le §28 rendu executable. */
  for (let di = 1; di < 3; di++) {
    const s = BIOMES.map((_, i) =>
      buildBiome(i, di, 7, arenaW, arenaH, viewW, viewH).hazardSurface);
    const moy = s.reduce((a, v) => a + v, 0) / s.length;
    for (let i = 0; i < s.length; i++) {
      const e = moy > 0 ? Math.abs(s[i] - moy) / moy : 0;
      if (e > HZ_ECART) {
        soucis.push(`${BIOMES[i].key}/${["calme", "normal", "cauchemar"][di]} : `
          + `surface de danger a ${(s[i] * 100).toFixed(2)} % pour une moyenne de `
          + `${(moy * 100).toFixed(2)} % (ecart ${(e * 100).toFixed(0)} %, `
          + `seuil ${HZ_ECART * 100} %)`);
      }
    }
  }

  for (let bi = 0; bi < BIOMES.length; bi++) {
    for (let di = 0; di < 3; di++) {
      for (const seed of seeds) {
        const b = buildBiome(bi, di, seed, arenaW, arenaH, viewW, viewH);
        const ou = `${b.key}/${["calme", "normal", "cauchemar"][di]}/${seed}`;

        if (b.hazardJetes > 0) {
          soucis.push(`${ou} : ${b.hazardJetes} danger(s) evince(s) par le budget`);
        }
        if (b.hazardSurface > budget + 1e-9) {
          soucis.push(`${ou} : dangers a ${(b.hazardSurface * 100).toFixed(1)} %`);
        }
        if (b.obstacleSurface > BIOME_CFG.OBSTACLE_SURFACE_MAX + 1e-9) {
          soucis.push(`${ou} : obstacles a ${(b.obstacleSurface * 100).toFixed(1)} %`);
        }
        if (di === 0 && b.hazards.length > 0) {
          soucis.push(`${ou} : calme ne doit avoir aucun danger`);
        }
        if (di === 1 && b.hazards.some(h => hazardAt(h.kind).hurts)) {
          soucis.push(`${ou} : normal ne doit avoir aucun danger qui blesse`);
        }
        if (!coeurTraversable(b, arenaW, arenaH, viewW, viewH)) {
          soucis.push(`${ou} : le carre central minimal n'est pas traversable`);
        }
        const chevauche = comptePosesSurObstacle(b);
        if (chevauche > 0) {
          soucis.push(`${ou} : ${chevauche} danger(s) poses sur un obstacle`);
        }
      }
    }
  }
  return soucis;
}

/* DEUX BLOCS NE SE TRAVERSENT PAS, ET RIEN NE LE REGARDAIT.

   Une superposition ne leve RIEN : la collision est une AABB, deux AABB qui se
   recouvrent bornent exactement comme leur union, et la navigation lit les memes
   rectangles. Ce qui se voit est le DESSIN — `silhouetteBloc` remplit son rectangle
   et `contourDe` le cerne, donc le second habillage se pose en decale sur le corps
   du premier, et ca ressemble a une erreur de rendu. C est exactement comme ca que
   le defaut est remonte : par une capture d ecran, pas par un verificateur.

   IL SE MESURE SUR L ARENE REELLE, pas sur la table. Trois choses ne se lisent pas
   dans `OBSTACLES` : le miroir de cellule, le tremblement de la Friche, et le
   voisinage entre deux cellules. On construit donc les arenes et on compare les
   blocs poses, en seaux de cellule — sans quoi c est du n^2 sur 700 blocs.

   La tolerance est de 1 px : deux blocs qui se TOUCHENT sont une masse plus longue,
   et c est une figure legitime — le mur de la Friche est fait comme ca. */
const SUPERPOSE_TOL = 1;

function compteSuperpositions(b, cols, rows, cw, ch) {
  const seaux = new Map();
  const o = b.obstacles;
  for (let i = 0; i < o.length; i++) {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(o[i].x / cw)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(o[i].y / ch)));
    const k = cy * cols + cx;
    const s = seaux.get(k);
    if (s) s.push(i); else seaux.set(k, [i]);
  }
  const VOISINS = [[0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  let n = 0, pire = null;
  for (const [k, ids] of seaux) {
    const cx = k % cols, cy = (k / cols) | 0;
    for (const [dx, dy] of VOISINS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || nx >= cols || ny >= rows) continue;
      const autres = seaux.get(ny * cols + nx);
      if (!autres) continue;
      const meme = dx === 0 && dy === 0;
      for (const i of ids) {
        for (const j of autres) {
          if (meme && j <= i) continue;
          const a = o[i], c = o[j];
          const ox = Math.min(a.x + a.w / 2, c.x + c.w / 2) - Math.max(a.x - a.w / 2, c.x - c.w / 2);
          if (ox <= SUPERPOSE_TOL) continue;
          const oy = Math.min(a.y + a.h / 2, c.y + c.h / 2) - Math.max(a.y - a.h / 2, c.y - c.h / 2);
          if (oy <= SUPERPOSE_TOL) continue;
          n++;
          if (!pire || ox * oy > pire.ox * pire.oy) {
            pire = { ox, oy, a: blocAt(a.kind).key, b: blocAt(c.kind).key };
          }
        }
      }
    }
  }
  return { n, pire };
}

export function verifierSuperpositions(seeds = [1, 7, 99], arenaW = 1600, arenaH = 900,
                                       viewW = 1600, viewH = 900) {
  const soucis = [];
  const cols = Math.max(1, Math.round(arenaW / viewW));
  const rows = Math.max(1, Math.round(arenaH / viewH));
  const cw = arenaW / cols, ch = arenaH / rows;
  const modes = ["calme", "normal", "cauchemar"];
  for (let bi = 0; bi < BIOMES.length; bi++) {
    for (let di = 0; di < 3; di++) {
      // le PIRE cas par (lieu, mode), pas une ligne par graine : cinquante
      // graines d un meme defaut de table donnent cinquante fois la meme phrase.
      let total = 0, pire = null, ou = "";
      for (const seed of seeds) {
        const b = buildBiome(bi, di, seed, arenaW, arenaH, viewW, viewH);
        const r = compteSuperpositions(b, cols, rows, cw, ch);
        total += r.n;
        if (r.pire && (!pire || r.pire.ox * r.pire.oy > pire.ox * pire.oy)) {
          pire = r.pire; ou = `graine ${seed}`;
        }
      }
      if (total > 0) {
        soucis.push(`${BIOMES[bi].key}/${modes[di]} : ${total} paire(s) de blocs qui se`
          + ` traversent sur ${seeds.length} graines — pire ${pire.a}/${pire.b} a`
          + ` ${Math.round(pire.ox)} x ${Math.round(pire.oy)} px (${ou})`);
      }
    }
  }
  return soucis;
}


/* UNE CARTE PORTE PLUSIEURS BIOMES D UN SEUL THEME, UN PAR REGION.

   PERSONNE NE REGARDAIT CA. `verifierDistricts` juge le DECOUPAGE,
   `verifierVariantes` juge les LOIS et leurs aretes — et rien ne disait qu une
   region porte UNE loi, ni que deux voisines en portent DEUX. C est pourtant la
   seule chose qu une carte promet, et c est exactement ce qui avait derape :
   les regions ont porte cinq THEMES au lieu de cinq biomes d un theme, et le
   verificateur qui existait l EXIGEAIT.

   QUATRE QUESTIONS. Toutes les cellules d une region portent-elles SA loi ; deux
   regions voisines en portent-elles deux ; leurs bords s accordent-ils a la
   frontiere ; et la carte montre-t-elle autant de lois que le theme peut en
   donner. */
export function verifierRegions(seeds = [1, 7, 99], arenaW = 1600, arenaH = 900,
                                viewW = 1600, viewH = 900) {
  const soucis = [];
  const cols = Math.max(1, Math.round(arenaW / viewW));
  const rows = Math.max(1, Math.round(arenaH / viewH));
  for (const b of BIOMES) {
    const vs = OBSTACLES[b.key] ?? [];
    if (vs.length < 2) { soucis.push(`${b.key} : moins de deux biomes`); continue; }
    for (const seed of seeds) {
      const q = districtsDe(seed, cols, rows);
      const choix = grilleVariantes(b.key, seed, cols, rows);
      const nq = q.reduce((m, x) => Math.max(m, x), 0) + 1;

      const dom = new Array(nq).fill(-1);
      let hors = 0;
      for (let i = 0; i < choix.length; i++) {
        if (dom[q[i]] < 0) dom[q[i]] = choix[i];
        else if (dom[q[i]] !== choix[i]) hors++;
      }
      if (hors > 0) {
        soucis.push(`${b.key}/graine ${seed} : ${hors} cellule(s) hors de la loi de`
          + ` leur region — une region qui change en son milieu ne se lit pas`);
      }

      // UNE PAIRE, PAS UNE CELLULE : deux regions se touchent par une frontiere
      // entiere, et signaler chaque cellule de la frontiere dirait quarante fois
      // la meme chose.
      const paires = new Set();
      const frontieres = new Set();
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const d = q[cy * cols + cx];
          for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= cols || ny >= rows) continue;
            const g = q[ny * cols + nx];
            if (g === d) continue;
            const k = d < g ? `${d}|${g}` : `${g}|${d}`;
            frontieres.add(k);
            if (dom[g] === dom[d]) paires.add(k);
          }
        }
      }
      /* LE PLANCHER EST LA PIGEONNIER, PAS ZERO. Cinq regions et quatre lois ne
         peuvent pas etre toutes distinctes ; ce qu on exige est que le nombre de
         frontieres fautives ne depasse pas ce que l arithmetique impose. Le jour
         ou un theme portera plus de lois qu une carte n a de regions, la borne
         tombera d elle-meme a zero. */
      const borne = Math.max(0, nq - vs.length);
      if (paires.size > borne) {
        const noms = [...paires].map(k => {
          const [d, g] = k.split("|");
          return `${d}/${g} « ${vs[dom[+d]].nom} »`;
        }).join(", ");
        soucis.push(`${b.key}/graine ${seed} : ${paires.size} frontiere(s) entre deux`
          + ` regions de meme loi pour une borne de ${borne} — ${noms}`);
      }

      // L ARETE ENTRE DEUX REGIONS, la seule qui existe encore : deux murs face
      // a face ferment une frontiere entiere, et une frontiere fermee coupe
      // l arene en deux.
      for (const k of frontieres) {
        const [d, g] = k.split("|").map(Number);
        if (!loisAccordees(vs[dom[d]], vs[dom[g]])) {
          soucis.push(`${b.key}/graine ${seed} : « ${vs[dom[d]].nom} » et`
            + ` « ${vs[dom[g]].nom} » se touchent avec deux bords murs`);
        }
      }

      const vues = new Set(dom).size;
      const attendu = Math.min(nq, vs.length);
      if (vues < attendu) {
        soucis.push(`${b.key}/graine ${seed} : ${vues} loi(s) pour ${nq} regions`
          + ` — la carte en montre moins que le theme n en a`);
      }
    }
  }
  return soucis;
}

function comptePosesSurObstacle(b) {
  let n = 0;
  for (const h of b.hazards) {
    for (const o of b.obstacles) {
      const cx = Math.max(o.x - o.w / 2, Math.min(h.x, o.x + o.w / 2));
      const cy = Math.max(o.y - o.h / 2, Math.min(h.y, o.y + o.h / 2));
      if (Math.hypot(h.x - cx, h.y - cy) < h.r) { n++; break; }
    }
  }
  return n;
}

/* LE BALAYAGE NE REGARDE QUE LES BOITES DE SA CELLULE. Il testait les 750
   obstacles de l arene pour chacun des 5 000 points d une cellule, quatre-vingt-
   une fois : 315 millions de comparaisons par arene, et le verificateur de carte
   composee mettait 15 s la ou la construction en met 25 ms. Sur une arene d une
   seule cellule — la taille a laquelle `verifierBiomes` tournait — le cout ne se
   voyait pas. Le filtre est exact : une boite hors de la cellule elargie de sa
   demi-taille et de la garde ne peut pas toucher un point du coeur. */
function coeurTraversable(b, arenaW, arenaH, viewW, viewH) {
  const cols = Math.max(1, Math.round(arenaW / viewW));
  const rows = Math.max(1, Math.round(arenaH / viewH));
  const vw = arenaW / cols, vh = arenaH / rows;
  const c = BIOME_CFG.CORE_CLEARANCE;
  const durs = b.obstacles.filter(o => o.maxHp === 0);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const ox = i * vw, oy = j * vh;
      const mx = ox + vw / 2, my = oy + vh / 2;
      const proches = durs.filter(o =>
        Math.abs(o.x - mx) < vw / 2 + o.w / 2 + c
        && Math.abs(o.y - my) < vh / 2 + o.h / 2 + c);
      if (!celluleTraversable(proches, vw, vh, ox, oy)) return false;
    }
  }
  return true;
}

function celluleTraversable(durs, vw, vh, ox, oy) {
  const cw = vw * BIOME_CFG.CORE_RATIO, ch = vh * BIOME_CFG.CORE_RATIO;
  const x0 = ox + (vw - cw) / 2, y0 = oy + (vh - ch) / 2;
  const step = 10;
  const cols = Math.floor(cw / step), rows = Math.floor(ch / step);
  const c = BIOME_CFG.CORE_CLEARANCE;

  const libre = (ix, iy) => {
    const x = x0 + ix * step, y = y0 + iy * step;
    for (const o of durs) {
      if (Math.abs(x - o.x) < o.w / 2 + c && Math.abs(y - o.y) < o.h / 2 + c) return false;
    }
    return true;
  };

  return remplissage(cols, rows, libre, "h") && remplissage(cols, rows, libre, "v");
}

function remplissage(cols, rows, libre, axe) {
  const vus = new Set();
  const pile = [];
  const cle = (x, y) => y * cols + x;
  if (axe === "h") {
    for (let y = 0; y < rows; y++) if (libre(0, y)) { pile.push([0, y]); vus.add(cle(0, y)); }
  } else {
    for (let x = 0; x < cols; x++) if (libre(x, 0)) { pile.push([x, 0]); vus.add(cle(x, 0)); }
  }
  while (pile.length) {
    const [x, y] = pile.pop();
    if (axe === "h" ? x >= cols - 1 : y >= rows - 1) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (vus.has(cle(nx, ny)) || !libre(nx, ny)) continue;
      vus.add(cle(nx, ny));
      pile.push([nx, ny]);
    }
  }
  return false;
}
