
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
  for (const o of OBSTACLES[f.lieu] ?? []) {
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
const OBSTACLES = {
  usine: [
    { x: 0.28, y: 0.16, w: 0.230, h: 0.036, kind: B_CHAINE },
    { x: 0.72, y: 0.84, w: 0.230, h: 0.036, kind: B_CHAINE },
    { x: 0.10, y: 0.16, w: 0.048, h: 0.090, kind: B_POSTE },
    { x: 0.90, y: 0.84, w: 0.048, h: 0.090, kind: B_POSTE },
    { x: 0.34, y: 0.52, w: 0.052, h: 0.130, kind: B_MACHINE, min: 1 },
    { x: 0.66, y: 0.48, w: 0.052, h: 0.130, kind: B_MACHINE, min: 1 },
    { x: 0.50, y: 0.90, w: 0.070, h: 0.048, kind: B_POSTE },
    { x: 0.14, y: 0.74, w: 0.048, h: 0.090, kind: B_POSTE, min: 2 },
    { x: 0.86, y: 0.24, w: 0.052, h: 0.130, kind: B_MACHINE, min: 2 },
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
    { x: 0.30, y: 0.30, w: 0.120, h: 0.190, kind: B_FOUR },
    { x: 0.70, y: 0.70, w: 0.120, h: 0.190, kind: B_FOUR },
    { x: 0.50, y: 0.12, w: 0.260, h: 0.048, kind: B_CONDUITE, min: 1 },
    { x: 0.12, y: 0.78, w: 0.070, h: 0.070, kind: B_CUVE },
    { x: 0.88, y: 0.22, w: 0.070, h: 0.070, kind: B_CUVE, min: 1 },
    { x: 0.08, y: 0.30, w: 0.070, h: 0.070, kind: B_CUVE, min: 2 },
    { x: 0.50, y: 0.88, w: 0.260, h: 0.048, kind: B_CONDUITE, min: 2 },
  ],
  friche: [
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
  ],
  nebuleuse: [
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

export function buildBiome(biomeIndex, diffIndex, seed = 1,
                           arenaW = 1600, arenaH = 900,
                           viewW = 1600, viewH = 900) {
  const def = biomeAt(biomeIndex);
  const rand = rng(seed);
  const surface = arenaW * arenaH;

  const cols = Math.max(1, Math.round(arenaW / viewW));
  const rows = Math.max(1, Math.round(arenaH / viewH));
  const cw = arenaW / cols, ch = arenaH / rows;

  const obstacles = [];
  const kDefaut = blocsDe(def.key)[0] ?? 0;
  let obsArea = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const mx = (cx + cy) & 1, my = (cx * 2 + cy) & 1;
      for (const o of OBSTACLES[def.key] ?? []) {
        if ((o.min ?? 0) > diffIndex) continue;
        const j = def.key === "friche" ? 40 : 0;
        const w = o.w * cw, h = o.h * ch;
        const area = w * h;
        if ((obsArea + area) / surface > BIOME_CFG.OBSTACLE_SURFACE_MAX) continue;
        obsArea += area;
        const fx = mx ? 1 - o.x : o.x, fy = my ? 1 - o.y : o.y;
        obstacles.push({
          x: cx * cw + fx * cw + (rand() - 0.5) * 2 * j,
          y: cy * ch + fy * ch + (rand() - 0.5) * 2 * j,
          w, h,
          kind: o.kind ?? kDefaut,
          maxHp: o.hp ? BIOME_CFG.COVER_HP : 0,
          hp: o.hp ? BIOME_CFG.COVER_HP : 0,
        });
      }
    }
  }

  let table = [];
  if (diffIndex === 1) table = HZ_NORMAL[def.key] ?? [];
  else if (diffIndex >= 2) table = HZ_CAUCHEMAR[def.key] ?? [];

  const hazards = [];
  const ech = ECHELLE[def.key] ?? null;
  let hzArea = 0;
  let hzJetes = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const mx = (cx + cy) & 1, my = (cx * 2 + cy) & 1;
      for (const h of table) {
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

  return {
    index: biomeIndex, key: def.key, nom: def.nom,
    obstacles, hazards,
    obstacleSurface: obsArea / surface,
    hazardSurface: hzArea / surface,
    // le budget EVINCE en silence : une entree declaree pouvait ne jamais etre
    // construite sans que rien ne le dise, et un lieu se retrouvait avec un
    // danger de moins que ce que sa table annonce. On le compte.
    hazardJetes: hzJetes,
  };
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

// deux lois sont distinctes des qu'UN axe les separe franchement. Exiger les
// quatre interdirait des variations legitimes ; n'en exiger aucun a produit deux
// fois la meme map.
const LOI_ECART = 0.40;
const LOI_AXES = ["densite", "encombrement", "contraste", "elongation"];

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
    for (const o of OBSTACLES[b.key] ?? []) {
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

function coeurTraversable(b, arenaW, arenaH, viewW, viewH) {
  const cols = Math.max(1, Math.round(arenaW / viewW));
  const rows = Math.max(1, Math.round(arenaH / viewH));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!celluleTraversable(b, arenaW / cols, arenaH / rows,
                              (i * arenaW) / cols, (j * arenaH) / rows)) return false;
    }
  }
  return true;
}

function celluleTraversable(b, vw, vh, ox, oy) {
  const cw = vw * BIOME_CFG.CORE_RATIO, ch = vh * BIOME_CFG.CORE_RATIO;
  const x0 = ox + (vw - cw) / 2, y0 = oy + (vh - ch) / 2;
  const step = 10;
  const cols = Math.floor(cw / step), rows = Math.floor(ch / step);
  const c = BIOME_CFG.CORE_CLEARANCE;

  const libre = (ix, iy) => {
    const x = x0 + ix * step, y = y0 + iy * step;
    for (const o of b.obstacles) {
      if (o.maxHp > 0) continue;
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
