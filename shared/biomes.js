
import { t } from "./i18n.js";

export const BIOME_CFG = {
  HAZARD_SURFACE_MAX: 0.08,

  OBSTACLE_SURFACE_MAX: 0.10,

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
             B_DEVANTURE = 12, B_PYLONE = 13, B_CONTENEUR = 14;

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
  for (const o of (OBSTACLES[f.lieu] ?? []).flatMap(v => v.poser)) {
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
    { nom: "la chaine", label: "La chaîne", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.28, y: 0.16, w: 0.230, h: 0.036, kind: B_CHAINE },
      { x: 0.72, y: 0.84, w: 0.230, h: 0.036, kind: B_CHAINE },
      { x: 0.10, y: 0.16, w: 0.048, h: 0.090, kind: B_POSTE },
      { x: 0.90, y: 0.84, w: 0.048, h: 0.090, kind: B_POSTE },
      { x: 0.34, y: 0.52, w: 0.052, h: 0.130, kind: B_MACHINE, min: 1 },
      { x: 0.66, y: 0.48, w: 0.052, h: 0.130, kind: B_MACHINE, min: 1 },
      { x: 0.50, y: 0.90, w: 0.070, h: 0.048, kind: B_POSTE },
      { x: 0.14, y: 0.74, w: 0.048, h: 0.090, kind: B_POSTE, min: 2 },
      { x: 0.86, y: 0.24, w: 0.052, h: 0.130, kind: B_MACHINE, min: 2 },
    ] },
    /* LE CARREFOUR — deux allees larges qui se croisent, quatre ilots. La loi
       est l AXE : tout est pousse hors des deux bandes centrales, et ce qui
       reste se contourne au lieu de se longer. */
    { nom: "le carrefour", label: "Le carrefour", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
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
      // LE PETIT POSTE TIENT LE CONTRASTE DU THEME. Sans lui la variante n a que
      // deux formats, donc un rapport max/min de 1,2 contre 2,5 ailleurs : elle
      // sortait du lieu par le bas au lieu d en etre une variante.
      { x: 0.50, y: 0.18, w: 0.070, h: 0.048, kind: B_POSTE },
    ] },
    /* L ATELIER — semis dense de petits postes. Beaucoup d angles, rien qui
       bloque : c est la variante ou l on tire court et ou l on ne voit jamais
       loin, sans qu une seule masse coupe un passage. */
    { nom: "l atelier", label: "L'atelier", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      { x: 0.18, y: 0.26, w: 0.048, h: 0.090, kind: B_POSTE },
      { x: 0.38, y: 0.20, w: 0.048, h: 0.090, kind: B_POSTE },
      { x: 0.62, y: 0.30, w: 0.070, h: 0.048, kind: B_POSTE },
      { x: 0.82, y: 0.22, w: 0.048, h: 0.090, kind: B_POSTE, min: 1 },
      { x: 0.28, y: 0.50, w: 0.070, h: 0.048, kind: B_POSTE },
      { x: 0.72, y: 0.52, w: 0.070, h: 0.048, kind: B_POSTE, min: 1 },
      { x: 0.18, y: 0.76, w: 0.048, h: 0.090, kind: B_POSTE, min: 1 },
      { x: 0.40, y: 0.82, w: 0.070, h: 0.048, kind: B_POSTE, min: 2 },
      { x: 0.84, y: 0.80, w: 0.052, h: 0.130, kind: B_MACHINE },
      { x: 0.24, y: 0.62, w: 0.070, h: 0.048, kind: B_POSTE, min: 1 },
      { x: 0.50, y: 0.13, w: 0.230, h: 0.036, kind: B_CHAINE },
    ] },
    /* LE DEGAGEMENT — la respiration du theme. Presque vide, deux masses
       isolees contre les bords : on y traverse en ligne droite, et c est
       precisement ce qu aucune autre variante ne permet. */
    { nom: "le degagement", label: "Le dégagement", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.12, y: 0.30, w: 0.052, h: 0.130, kind: B_MACHINE },
      { x: 0.88, y: 0.70, w: 0.052, h: 0.130, kind: B_MACHINE },
      { x: 0.50, y: 0.12, w: 0.230, h: 0.036, kind: B_CHAINE },
      { x: 0.50, y: 0.88, w: 0.230, h: 0.036, kind: B_CHAINE, min: 1 },
      { x: 0.10, y: 0.86, w: 0.048, h: 0.090, kind: B_POSTE, min: 2 },
      { x: 0.90, y: 0.14, w: 0.048, h: 0.090, kind: B_POSTE, min: 2 },
      { x: 0.11, y: 0.68, w: 0.048, h: 0.090, kind: B_POSTE, min: 1 },
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
    { nom: "la coulee", label: "La coulée", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.30, y: 0.30, w: 0.120, h: 0.190, kind: B_FOUR },
      { x: 0.70, y: 0.70, w: 0.120, h: 0.190, kind: B_FOUR },
      { x: 0.50, y: 0.12, w: 0.260, h: 0.048, kind: B_CONDUITE, min: 1 },
      { x: 0.12, y: 0.78, w: 0.070, h: 0.070, kind: B_CUVE },
      { x: 0.88, y: 0.22, w: 0.070, h: 0.070, kind: B_CUVE, min: 1 },
      { x: 0.08, y: 0.30, w: 0.070, h: 0.070, kind: B_CUVE, min: 2 },
      { x: 0.50, y: 0.88, w: 0.260, h: 0.048, kind: B_CONDUITE, min: 2 },
    ] },
    /* LES CUVES — six masses moyennes, aucun axe. La coulee donne une direction
       a suivre ; celle-ci n en donne aucune, et c est tout ce qui les separe. */
    { nom: "les cuves", label: "Les cuves", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      /* UN SEUL FOUR, ET CINQ CUVES. Deux fours en faisaient une coulee sans
         son axe : c est la MASSE qui separe les deux lois, pas le rangement. */
      { x: 0.30, y: 0.22, w: 0.120, h: 0.190, kind: B_FOUR },
      { x: 0.73, y: 0.78, w: 0.070, h: 0.070, kind: B_CUVE },
      { x: 0.30, y: 0.74, w: 0.070, h: 0.070, kind: B_CUVE },
      { x: 0.70, y: 0.26, w: 0.070, h: 0.070, kind: B_CUVE, min: 1 },
      { x: 0.86, y: 0.35, w: 0.070, h: 0.070, kind: B_CUVE },
      { x: 0.14, y: 0.65, w: 0.070, h: 0.070, kind: B_CUVE, min: 2 },
      { x: 0.50, y: 0.14, w: 0.260, h: 0.048, kind: B_CONDUITE, min: 1 },
    ] },
    /* LE REFROIDISSEMENT — masses courtes en quinconce. C EST LA GEOMETRIE DE
       L ABRI PARFAIT, et elle ne revient qu avec sa contrainte explicite :
       l ecart entre deux rangs vaut le DOUBLE de `NAV_CFG.PASSAGE_MIN`, jamais
       moins. 0,22 d ecart en y font 198 px pour un minimum de 80. */
    { nom: "le refroidissement", label: "Le refroidissement", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.28, y: 0.32, w: 0.120, h: 0.190, kind: B_FOUR },
      { x: 0.72, y: 0.68, w: 0.120, h: 0.190, kind: B_FOUR },
      { x: 0.62, y: 0.28, w: 0.070, h: 0.070, kind: B_CUVE },
      { x: 0.38, y: 0.72, w: 0.070, h: 0.070, kind: B_CUVE, min: 1 },
      { x: 0.50, y: 0.86, w: 0.260, h: 0.048, kind: B_CONDUITE },
    ] },
    /* LE PUITS — une masse centrale massive, le reste degage. Le seul lieu du
       theme ou le centre est interdit : on tourne autour au lieu de le traverser,
       et la horde arrive donc toujours par un cote qu on ne regarde pas. */
    { nom: "le puits", label: "Le puits", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
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
      { x: 0.74, y: 0.24, w: 0.070, h: 0.070, kind: B_CUVE, min: 2 },
      { x: 0.70, y: 0.50, w: 0.120, h: 0.190, kind: B_FOUR, min: 2 },
      { x: 0.50, y: 0.14, w: 0.260, h: 0.048, kind: B_CONDUITE },
    ] },
  ],
  friche: [
    { nom: "le champ", label: "Le champ", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.10, y: 0.18, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.19, y: 0.30, w: 0.045, h: 0.110, kind: B_RUINE, min: 1 },
      { x: 0.26, y: 0.14, w: 0.060, h: 0.048, kind: B_RUINE },
      { x: 0.82, y: 0.80, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.90, y: 0.66, w: 0.045, h: 0.110, kind: B_RUINE, min: 1 },
      { x: 0.73, y: 0.88, w: 0.060, h: 0.048, kind: B_RUINE },
      { x: 0.50, y: 0.10, w: 0.110, h: 0.040, kind: B_MUR },
      // TROIS EPAVES DE MEME GABARIT ETAIENT TROIS FOIS LE MEME OBJET. A surface
      // egale (± 3 %), elles portent maintenant trois formats — couche, carre,
      // debout : c est ce qui separe un champ d epaves d un parking. La vue est
      // en 16/9, donc un format DEBOUT demande h/w > 1,78 en fraction, pas 1,2.
      { x: 0.46, y: 0.44, w: 0.082, h: 0.048, hp: 1, kind: B_CARCASSE, min: 1 },
      { x: 0.70, y: 0.36, w: 0.062, h: 0.066, hp: 1, kind: B_CARCASSE },
      { x: 0.30, y: 0.62, w: 0.040, h: 0.098, hp: 1, kind: B_CARCASSE, min: 1 },
      { x: 0.06, y: 0.46, w: 0.052, h: 0.086, kind: B_RUINE, min: 2 },
      { x: 0.94, y: 0.54, w: 0.052, h: 0.086, kind: B_RUINE, min: 2 },
    ] },
    /* LE MUR — une longue ruine avec PLUSIEURS breches larges. Une seule breche
       ferait un goulot, et un goulot detruit le kiting : la horde s y accumule,
       le joueur tire dans un entonnoir. Trois ouvertures, aucune obligatoire. */
    { nom: "le mur", label: "Le mur", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT], poser: [
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
      { x: 0.29, y: 0.59, w: 0.082, h: 0.048, hp: 1, kind: B_CARCASSE },
      { x: 0.72, y: 0.36, w: 0.062, h: 0.066, hp: 1, kind: B_CARCASSE, min: 2 },
    ] },
    /* LE CRATERE — vide au centre, dense au pourtour : l INVERSE de la loi du
       theme, qui seme partout. On y combat au milieu, dos a rien, et c est la
       seule variante de friche qui offre ca. */
    { nom: "le cratere", label: "Le cratère", bords: [BORD_MUR, BORD_ENCOMBRE, BORD_MUR, BORD_ENCOMBRE], poser: [
      { x: 0.29, y: 0.44, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.71, y: 0.56, w: 0.085, h: 0.070, kind: B_RUINE },
      { x: 0.27, y: 0.84, w: 0.045, h: 0.110, kind: B_RUINE },
      { x: 0.73, y: 0.16, w: 0.045, h: 0.110, kind: B_RUINE, min: 1 },
      { x: 0.31, y: 0.11, w: 0.110, h: 0.040, kind: B_MUR },
      /* 0,70 -> 0,86 : ce mur se tenait DANS la ruine de 0,71 et la rayait sur
         140 x 41 px. Il part au POURTOUR, qui est la loi de la variante — le
         centre reste vide, et c est le seul endroit ou il ne croise rien. */
      { x: 0.86, y: 0.55, w: 0.110, h: 0.040, kind: B_MUR, min: 1 },
      // les deux petites ruines s ecartent des grandes de 10 px : elles les
      // entamaient de 17 px en hauteur, sur 84 de large.
      { x: 0.27, y: 0.51, w: 0.060, h: 0.048, kind: B_RUINE },
      { x: 0.73, y: 0.49, w: 0.060, h: 0.048, kind: B_RUINE, min: 1 },
      { x: 0.29, y: 0.59, w: 0.082, h: 0.048, hp: 1, kind: B_CARCASSE, min: 2 },
      // 0,73 -> 0,62 : elle etait POSEE DANS la ruine debout de 0,73.
      { x: 0.62, y: 0.14, w: 0.040, h: 0.098, hp: 1, kind: B_CARCASSE, min: 2 },
    ] },
    /* L EFFONDREMENT — des masses de toutes tailles, sans loi apparente. C est
       la variante qui n a pas de regle, et elle en a donc une : le contraste. */
    { nom: "l effondrement", label: "L'effondrement", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      { x: 0.30, y: 0.45, w: 0.110, h: 0.040, kind: B_MUR },
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
      { x: 0.33, y: 0.50, w: 0.110, h: 0.040, kind: B_MUR, min: 2 },
    ] },
  ],
  nebuleuse: [
    { nom: "la derive", label: "La dérive", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
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
    ] },
    /* LE CHAMP D EPAVES — beaucoup de petits eclats, aucune grosse masse. Rien
       ne cache, tout accroche : on voit la horde arriver de partout et on ne
       peut jamais s en couper. */
    { nom: "le champ d epaves", label: "Le champ d'épaves", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      { x: 0.18, y: 0.22, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
      { x: 0.82, y: 0.78, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
      { x: 0.38, y: 0.30, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
      { x: 0.62, y: 0.70, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 1 },
      { x: 0.19, y: 0.72, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 1 },
      { x: 0.81, y: 0.28, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 2 },
      { x: 0.41, y: 0.84, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 2 },
      { x: 0.30, y: 0.20, w: 0.145, h: 0.150, kind: B_FRAGMENT },
      { x: 0.12, y: 0.50, w: 0.020, h: 0.560, kind: B_TRAVEE },
      { x: 0.88, y: 0.50, w: 0.020, h: 0.560, kind: B_TRAVEE, min: 1 },
    ] },
    /* LES GRANDS FRAGMENTS — trois masses enormes et tres espacees. Peu de
       choses, mais chaque contournement est LONG : c est la variante ou l on
       perd la horde de vue et ou elle reapparait d un cote qu on a quitte. */
    { nom: "les grands fragments", label: "Les grands fragments", bords: [BORD_OUVERT, BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE], poser: [
      { x: 0.22, y: 0.20, w: 0.145, h: 0.150, kind: B_FRAGMENT },
      { x: 0.78, y: 0.80, w: 0.145, h: 0.150, kind: B_FRAGMENT },
      { x: 0.78, y: 0.20, w: 0.145, h: 0.150, kind: B_FRAGMENT, min: 1 },
      { x: 0.12, y: 0.50, w: 0.020, h: 0.560, kind: B_TRAVEE },
      { x: 0.41, y: 0.86, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS },
      { x: 0.59, y: 0.14, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 1 },
      { x: 0.45, y: 0.50, w: 0.042, h: 0.038, hp: 1, kind: B_DEBRIS, min: 2 },
    ] },
    /* LA BRECHE — le bati concentre sur un bord, l autre ouvert sur le vide.
       La seule variante ASYMETRIQUE du theme : le miroir de cellule en fait une
       loi qui change de cote d une region a l autre, sans table de plus. */
    { nom: "la breche", label: "La brèche", bords: [BORD_ENCOMBRE, BORD_OUVERT, BORD_ENCOMBRE, BORD_MUR], poser: [
      /* 0,13 -> 0,26 : LA TRAVEE PASSAIT A TRAVERS LES DEUX FRAGMENTS, 32 px sur
         86 — une poutre dessinee DANS la roche, aux trois modes et a toutes les
         graines. Elle ne bouge pas, elle : sa position tient d une passe a
         cinquante graines sur la fermeture du carre central. Les fragments
         s ecartent, et l ecart vaut 92 px, donc plus que `PASSAGE_MIN`. */
      { x: 0.26, y: 0.24, w: 0.145, h: 0.150, kind: B_FRAGMENT },
      { x: 0.26, y: 0.76, w: 0.145, h: 0.150, kind: B_FRAGMENT, min: 1 },
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
    { nom: "la rue", label: "La rue", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.18, y: 0.16, w: 0.150, h: 0.052, kind: B_DEVANTURE },
      { x: 0.82, y: 0.84, w: 0.150, h: 0.052, kind: B_DEVANTURE },
      { x: 0.10, y: 0.72, w: 0.062, h: 0.140, kind: B_DEVANTURE, min: 1 },
      { x: 0.90, y: 0.28, w: 0.062, h: 0.140, kind: B_DEVANTURE, min: 1 },
      { x: 0.34, y: 0.50, w: 0.014, h: 0.230, kind: B_PYLONE },
      { x: 0.66, y: 0.50, w: 0.014, h: 0.230, kind: B_PYLONE },
      { x: 0.50, y: 0.14, w: 0.014, h: 0.150, kind: B_PYLONE, min: 2 },
      { x: 0.50, y: 0.86, w: 0.014, h: 0.150, kind: B_PYLONE, min: 2 },
      { x: 0.26, y: 0.84, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
      { x: 0.74, y: 0.16, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
      { x: 0.44, y: 0.74, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR, min: 1 },
      { x: 0.56, y: 0.26, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR, min: 2 },
    ] },
    /* LA PLACE — ouvert au centre, encombre au pourtour. On y tient le milieu
       et la horde arrive par des angles ; c est l inverse de la rue, ou l on
       longe. */
    { nom: "la place", label: "La place", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
      { x: 0.09, y: 0.22, w: 0.062, h: 0.140, kind: B_DEVANTURE },
      { x: 0.91, y: 0.78, w: 0.062, h: 0.140, kind: B_DEVANTURE },
      { x: 0.91, y: 0.22, w: 0.062, h: 0.140, kind: B_DEVANTURE, min: 1 },
      { x: 0.09, y: 0.78, w: 0.062, h: 0.140, kind: B_DEVANTURE, min: 1 },
      { x: 0.34, y: 0.21, w: 0.014, h: 0.230, kind: B_PYLONE },
      { x: 0.66, y: 0.79, w: 0.014, h: 0.230, kind: B_PYLONE },
      { x: 0.66, y: 0.21, w: 0.014, h: 0.230, kind: B_PYLONE, min: 1 },
      { x: 0.34, y: 0.79, w: 0.014, h: 0.230, kind: B_PYLONE, min: 2 },
      { x: 0.10, y: 0.50, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
      { x: 0.90, y: 0.50, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
    ] },
    /* LE MARCHE — semis serre de petites structures. Beaucoup d objets, peu de
       masse : on se faufile partout, on ne se cache nulle part. */
    { nom: "le marche", label: "Le marché", bords: [BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE, BORD_ENCOMBRE], poser: [
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
      { x: 0.09, y: 0.50, w: 0.062, h: 0.140, kind: B_DEVANTURE },
      { x: 0.91, y: 0.50, w: 0.062, h: 0.140, kind: B_DEVANTURE, min: 1 },
    ] },
    /* LE PARVIS — presque vide, deux masses monumentales. La respiration du
       theme, et la seule ou l on voit d un bout a l autre de la region. */
    { nom: "le parvis", label: "Le parvis", bords: [BORD_OUVERT, BORD_OUVERT, BORD_OUVERT, BORD_OUVERT], poser: [
      { x: 0.31, y: 0.50, w: 0.062, h: 0.140, kind: B_DEVANTURE },
      { x: 0.69, y: 0.50, w: 0.062, h: 0.140, kind: B_DEVANTURE },
      { x: 0.50, y: 0.21, w: 0.014, h: 0.230, kind: B_PYLONE },
      { x: 0.50, y: 0.79, w: 0.014, h: 0.230, kind: B_PYLONE, min: 1 },
      { x: 0.11, y: 0.20, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR },
      { x: 0.88, y: 0.81, w: 0.052, h: 0.046, hp: 1, kind: B_CONTENEUR, min: 1 },
      { x: 0.88, y: 0.20, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR, min: 2 },
      { x: 0.12, y: 0.80, w: 0.046, h: 0.040, hp: 1, kind: B_CONTENEUR, min: 2 },
      { x: 0.50, y: 0.50, w: 0.062, h: 0.140, kind: B_DEVANTURE, min: 1 },
    ] },
  ],
};

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
      const mx = (cx + cy) & 1, my = (cx * 2 + cy) & 1;
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
      const mx = (cx + cy) & 1, my = (cx * 2 + cy) & 1;
      let jx = (rand() - 0.5) * 2 * jMax, jy = (rand() - 0.5) * 2 * jMax;
      const pose = (varis[choix[cy * cols + cx]] ?? varis[0]).poser;
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
        obsArea += area;
        const fx = mx ? 1 - o.x : o.x, fy = my ? 1 - o.y : o.y;
        obstacles.push({
          x: cx * cw + fx * cw + jx,
          y: cy * ch + fy * ch + jy,
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

// COMBIEN DE LOIS UN THEME PORTE-T-IL. Lu par les tables qui en declarent une
// entree chacune, et par leurs verificateurs.
export function loisDe(cle) { return (OBSTACLES[cle] ?? []).length; }

/* LE NOM AFFICHE D UNE LOI. `nom` est l identifiant de developpement, sans
   accent ; ce qui va au joueur passe par `t()` et porte ses accents. */
export function loiNom(biomeIndex, loi) {
  const cle = biomeAt(biomeIndex).key;
  const v = (OBSTACLES[cle] ?? [])[loi];
  if (!v) return "";
  return t(`biome.${cle}.loi${loi}`, v.label ?? v.nom);
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
  const poser = v.poser.filter(o => (o.min ?? 0) <= diffIndex);
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


/* DEUX VARIANTES D UN MEME THEME DOIVENT DIFFERER ASSEZ POUR SE DISTINGUER, ET
   PAS TROP POUR RESTER DANS LE THEME. C est le garde-fou symetrique de celui qui
   separe deux LIEUX : sans plancher, deux variantes sont un doublon ; sans
   plafond, elles derivent en lieux deguises et le theme se dissout.
   LE PLAFOND EST `LOI_ECART` LUI-MEME, et ce n est pas un choix arbitraire :
   c est exactement le seuil au-dela duquel l instrument declare deux LOIS
   distinctes. Une variante qui le franchit n est plus une variante. */
const VARIANTE_PLANCHER = 0.15;

// deux lois sont distinctes des qu'UN axe les separe franchement. Exiger les
// quatre interdirait des variations legitimes ; n'en exiger aucun a produit deux
// fois la meme map.
const LOI_ECART = 0.40;
const LOI_AXES = ["densite", "encombrement", "contraste", "elongation"];

/* LE PLANCHER SE LIT SUR SIX AXES, LE PLAFOND SUR QUATRE — et l asymetrie est le
   coeur du garde-fou. Le PLAFOND doit repondre « est-ce encore le meme lieu ? »,
   donc il n emploie que les axes dont `verifierLois` se sert pour separer deux
   LIEUX : y ajouter l arrangement ferait rougir une variante qui ne fait que
   ranger autrement. Le PLANCHER doit repondre « est-ce encore la meme
   variante ? », et deux arrangements opposes a inventaire egal sont deux
   variantes — donc il voit les six. */
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

  for (const b of BIOMES) {
    const vs = OBSTACLES[b.key] ?? [];
    if (vs.length === 0) { soucis.push(`${b.key} : aucune variante`); continue; }
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
        let pire = 0, quoi = "", plafond = 0, quoiP = "";
        for (const axe of VARIANTE_AXES) {
          const a = sig[i][axe], c = sig[j][axe];
          const d = Math.abs(a - c) / Math.max(1e-9, Math.max(Math.abs(a), Math.abs(c)));
          if (d > pire) { pire = d; quoi = axe; }
          if (LOI_AXES.includes(axe) && d > plafond) { plafond = d; quoiP = axe; }
        }
        if (pire < VARIANTE_PLANCHER) {
          soucis.push(`${b.key} : « ${sig[i].nom} » et « ${sig[j].nom} » se ressemblent`
            + ` (${(100 * pire).toFixed(0)} % au mieux, plancher ${100 * VARIANTE_PLANCHER} %)`);
        }
        if (plafond >= LOI_ECART) {
          soucis.push(`${b.key} : « ${sig[i].nom} » et « ${sig[j].nom} » divergent sur`
            + ` ${quoiP} (${(100 * plafond).toFixed(0)} %) — ce n est plus le meme lieu`);
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
