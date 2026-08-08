/* LES BIOMES — module PUR, aucune dependance, sur le modele de `statuses.js`,
   `bosses.js` et `enemies.js`. `game_state.js` l'importe, jamais l'inverse : un
   cycle d'import casserait le chargement dans le navigateur.

   Un biome = une GEOMETRIE d'obstacles + un JEU DE DANGERS + une variante de
   decor. Il est tire au lancement de la manche, annonce au salon, et enregistre
   avec le score : sans lui, deux temps ne sont pas comparables.

   ---------------------------------------------------------------------------
   CE QUI NE CIRCULE PAS, ET C'EST L'ESSENTIEL DU LOT

   Le plan annoncait une cle `hz` au snapshot pour l'etat des dangers. Elle
   n'existe pas, et pour la meme raison que les traits du lot S ne coutent rien :
   TOUT SE DEDUIT de deux nombres envoyes UNE FOIS au salon — l'index du biome et
   la graine. La geometrie se regenere a l'identique des deux cotes (generateur
   deterministe, meme module), et l'etat d'un danger est une FONCTION DU TEMPS de
   manche, que le snapshot porte deja (`tm`).

   Un geyser qui souffle deux secondes toutes les sept est `((tm / 7) + phase) %
   1 < 2 / 7` : le serveur en tire ses degats, le client son jet, et les deux ne
   peuvent pas diverger puisque c'est la meme ligne. Il n'y a donc rien a
   transmettre — ni position, ni phase, ni compte a rebours. La meteo suit la
   meme regle : elle se deduit de `(graine, segment)`.

   SEULE EXCEPTION : les PV d'un mur destructible, qui dependent de ce que les
   joueurs ont fait et ne se deduisent d'aucune horloge. Ils voyagent dans la cle
   `ob`, une liste CREUSE — absente tant que rien n'a ete touche, c'est-a-dire la
   plupart du temps.

   `hazardState()` est le POINT DE PASSAGE UNIQUE de cette deduction. Deux
   implementations — une pour la simulation, une pour le rendu — auraient diverge
   au premier reglage de periode, et le desaccord serait invisible jusqu'a ce
   qu'un joueur prenne des degats sans jet a l'ecran.
   ---------------------------------------------------------------------------

   Les constantes de comportement vivent ICI, a cote de leur table, et non dans
   `CFG` : meme regle que `CARD_CFG`, `SKILL_CFG`, `STATUS_CFG`, `BOSS_CFG`,
   `TL_CFG` et `TRAIT_CFG`. */

export const BIOME_CFG = {
  /* --- LE PLAFOND DE SURFACE, qui est le vrai sujet du lot -------------------
     A 200 ennemis, plus les zones de boss, plus les telegraphes, plus les
     marqueurs, plus les chiffres de degats, plus les trainees du lot S :
     l'ecran est PLEIN. Le budget de lisibilite est deja depense, et la surface
     est une ressource rare — le depot l'a deja chiffre pour la constriction
     (`SHRINK_MIN: 0.45`, « en dessous, la horde de 200 ennemis ne tient plus »).

     Le plafond du lot est 12 % de l'arene, TRAINEES ET SPORES COMPRISES. Elles
     ne sont pas negociables et elles ont deja leur propre plafond : 18 zones de
     26 px de rayon (`TRAIT_CFG.TRAIL_MAX`), soit 38 200 px sur 1 440 000, donc
     2,7 %. On leur en reserve 4 % — la marge couvre le rayon des spores — et il
     reste 8 % pour le biome.

     Le plafond est STRICT et non indicatif, comme `PUDDLE_MAX` : `buildBiome`
     JETTE les dangers qui le franchissent plutot que de les laisser passer.
     Un plafond qu'on verifie apres coup est un plafond qu'on depasse. */
  HAZARD_SURFACE_MAX: 0.08,
  TRAIL_BUDGET: 0.04,

  /* Surface d'obstacles. Elle ne compte PAS dans les 12 % : un obstacle n'est
     pas un danger, il ne blesse jamais et il ne clignote pas. Il mange quand
     meme de la place, d'ou un plafond a lui — plus genereux, parce qu'un mur
     visible en permanence ne coute rien a lire. */
  OBSTACLE_SURFACE_MAX: 0.10,

  /* Carre central minimal : `BOSS_CFG.SHRINK_MIN`, recopie ici parce que ce
     module ne depend de rien. La valeur est verifiee par `verifierBiomes()`, qui
     echouerait si les deux divergeaient — c'est le seul garde-fou qui vaille
     pour une constante dupliquee. Un obstacle qui ENFERME un joueur dans un coin
     de l'arene reduite est un piege mortel involontaire. */
  CORE_RATIO: 0.45,
  // Largeur du personnage prise en compte par la verification de passage. Un
  // couloir de 30 px est traversable sur le papier et infranchissable en jeu.
  CORE_CLEARANCE: 34,

  /* --- GEYSER ----------------------------------------------------------------
     Sa BOUCHE est visible en permanence, seul son JET est intermittent. C'est la
     regle 1 du lot, et elle n'est pas negociable : le canal du telegraphe
     instantane appartient au boss et ne se partage pas. Un geyser qui s'annonce
     par un cercle ambre de 1,4 s est indistinguable d'une zone de Ravageur, et le
     joueur cesse de savoir lequel des deux il regarde. On apprend la carte, on ne
     lit pas un compte a rebours.

     La periode est PREMIERE avec celles des voisins (7 / 5,4 / 6,2) : trois
     geysers de meme periode battent a l'unisson et l'arene respire comme un
     seul organisme — c'est le defaut deja corrige pour la respiration des
     creatures et pour les croix du sanctuaire. */
  GEYSER_R: 70,
  GEYSER_PERIOD: 7,
  GEYSER_ACTIVE: 1.9,
  // La montee et la retombee du jet, en part de la fenetre active. Le danger
  // est plein pendant toute la fenetre : c'est du DESSIN, jamais une tolerance
  // de degats — `ZONE_FORGIVE` est le seul endroit du jeu qui a le droit de
  // faire differer l'affiche et la logique.
  GEYSER_RAMP: 0.22,
  GEYSER_DOT: 26,

  /* --- FLAQUE / ZONE CORROMPUE -----------------------------------------------
     Toujours active, position fixe pour la manche. C'est le danger le plus
     simple du lot et le plus lisible : il ne fait rien d'autre qu'etre la. */
  POOL_R: 85,
  POOL_DOT: 11,

  /* --- BRAISE (l'incendie qui derive) ----------------------------------------
     Elle va et vient sur un RAIL FIXE. Une derive libre aurait demande de
     transmettre sa position — ou d'accepter que le serveur et le client
     divergent — alors qu'un aller-retour sur un segment connu est une fonction
     du temps, donc gratuit. Le rail est visible en permanence : c'est la
     geometrie permanente qu'exige la regle 1, la braise n'est que ce qui la
     parcourt. */
  EMBER_R: 55,
  EMBER_DOT: 16,
  EMBER_PERIOD: 11,
  EMBER_SPAN: 210,

  /* --- ZONE RALENTISSANTE ----------------------------------------------------
     Le seul danger de `normal`, et il NE BLESSE PAS — c'est le critere
     d'acceptation du mode. Elle ralentit les JOUEURS ET LES ENNEMIS : un
     ralentissement qui ne toucherait que le joueur serait une taxe, et le depot
     refuse les taxes deguisees en mecanique (cf. le retrait des degats de
     rupture de barre). */
  SLOW_R: 110,
  SLOW_MUL: 0.62,

  /* --- SOL GLISSANT ----------------------------------------------------------
     Meme formule que le sol du Metronome (`BOSS_CFG.SLIP_ACCEL`) : la vitesse
     REJOINT la consigne au lieu de la prendre. On lance son deplacement a
     l'avance, ce qui est une competence et pas une taxe. La valeur est plus
     douce que celle du boss — la sienne dure douze secondes, celle-ci est
     permanente sur sa flaque. */
  SLIP_R: 95,
  SLIP_ACCEL: 2.6,

  /* --- COUVERTURE DESTRUCTIBLE -----------------------------------------------
     Le SEUL concept nouveau du lot : un mur qui a des PV. Trois decisions.

     Il ne cede qu'au TIR DU JOUEUR. Pas aux degats d'ennemis : deux cents
     monstres qui abattent la couverture en dix secondes rendraient la mecanique
     invisible, et un mur qui disparait sans qu'on sache pourquoi est un bug de
     retour, pas une difficulte.

     Il ne rend NI SCORE NI EXPERIENCE. Le credit vaut les PV max d'un ENNEMI
     TUE (lot Q) ; une couverture n'en est pas un, et l'y faire entrer aurait
     ouvert une source d'experience sans horde.

     Il ne passe PAS par `_damage()`. Ce point de passage porte le vol de vie,
     les critiques, l'execution et le compteur de touches — aucun n'a de sens sur
     un mur, et l'execution en supprimerait un d'un seul tir. Meme raisonnement
     que « le soin du medic est un chemin neuf, pas un `_damage()` negatif ». */
  COVER_HP: 900,

  /* --- METEO -----------------------------------------------------------------
     Un MODIFICATEUR GLOBAL valable un segment, jamais une entite : elle n'a pas
     de position. Cauchemar seulement. */
  GUST_PUSH: 46,        // px/s, joueurs ET ennemis
  ASH_LIFE: 11,         // duree de vie d'un bonus au sol, en secondes
  FOG_VIGNETTE: 1.35,   // multiplicateur d'assombrissement des BORDS
  FOG_FROM: 0.12,       // le depart du degrade RECULE : le centre reste net
};

/* --- LES DANGERS ----------------------------------------------------------------

   TABLEAU ORDONNE, mais son index NE CIRCULE PAS : la geometrie se regenere des
   deux cotes, le client lit donc le meme objet que le serveur. C'est
   l'exception, comme `GEOMETRIES` dans `timeline.js`, et pour la meme raison —
   ce qui ne traverse pas le reseau peut se reordonner sans rien casser.

   `hurts` est ce qui decide de l'appartenance a `normal` : le mode n'a AUCUN
   danger qui blesse, c'est un critere d'acceptation et non une intention. */
export const HZ_GEYSER = 0;
export const HZ_POOL = 1;
export const HZ_EMBER = 2;
export const HZ_SLOW = 3;
export const HZ_SLIP = 4;

export const HAZARDS = [
  { key: "geyser", nom: "geyser", hurts: true,
    r: BIOME_CFG.GEYSER_R, dot: BIOME_CFG.GEYSER_DOT },
  { key: "flaque", nom: "flaque corrompue", hurts: true,
    r: BIOME_CFG.POOL_R, dot: BIOME_CFG.POOL_DOT },
  { key: "braise", nom: "braise", hurts: true,
    r: BIOME_CFG.EMBER_R, dot: BIOME_CFG.EMBER_DOT },
  { key: "ralenti", nom: "champ de ralentissement", hurts: false,
    r: BIOME_CFG.SLOW_R, dot: 0 },
  { key: "glissant", nom: "sol glissant", hurts: false,
    r: BIOME_CFG.SLIP_R, dot: 0 },
];

export function hazardAt(kind) { return HAZARDS[kind] ?? null; }

/* --- LA METEO -------------------------------------------------------------------

   TABLEAU ORDONNE dont l'index circule dans le canal d'alerte — ajouter en fin,
   jamais au milieu. La meteo elle-meme ne circule pas dans le snapshot : elle se
   deduit de `(graine, segment)`, que le client a deja.

   LE PIEGE, et il est le seul de la table : une meteo qui touche la VISIBILITE
   ne doit jamais masquer un telegraphe de boss ni un marqueur pose sur un
   joueur. La brume renforce donc le vignettage sur les BORDS, ou rien
   d'important ne se joue, et RECULE le depart du degrade — le centre reste net.
   Sans cette contrainte, la brume devient une difficulte artificielle qui punit
   la lecture, c'est-a-dire l'inverse exact de ce que le depot mesure comme
   « difficile » : l'ecart entre un joueur qui lit les annonces et un joueur qui
   les ignore.

   La bourrasque pousse LES DEUX CAMPS. Ne pousser que le joueur serait une taxe
   deguisee en mecanique. */
export const WX_BRUME = 0;
export const WX_BOURRASQUE = 1;
export const WX_CENDRES = 2;

export const WEATHERS = [
  { key: "brume", nom: "Brume",
    texte: "brume dense — les bords de l'arène se ferment" },
  { key: "bourrasque", nom: "Bourrasque",
    texte: "bourrasque — tout est poussé, vous comme eux" },
  { key: "cendres", nom: "Cendres",
    texte: "pluie de cendres — les bonus au sol ne durent plus" },
];

export function weatherAt(id) { return WEATHERS[id] ?? null; }

/* --- LES TROIS BIOMES -----------------------------------------------------------

   TABLEAU ORDONNE dont l'index circule — UNE fois, dans le payload de salon,
   comme `diffIndex`. Ajouter en fin, jamais au milieu.

   LA GEOMETRIE EST LA MEME DANS LES TROIS MODES, et seuls les dangers changent.
   Un joueur qui connait `usine` en calme reconnait `usine` en cauchemar : c'est
   ce qui rend la montee en difficulte APPRENABLE au lieu d'etre un autre jeu.

   `skip` suit la meme mecanique que le decor de mode (`palette.js`) : une ligne
   de grille FINE sur N est eteinte. C'est ainsi que se rend la « densite de
   grille » demandee par le plan, et non en changeant le pas : la grille reste
   GRADUEE EN METRES dans les trois biomes, sinon « rayon 6 m » cesse de vouloir
   dire quelque chose a l'ecran, ce qui est sa seule raison d'exister. Les traits
   marques tous les 20 m ne sont jamais touches. */
export const BIOMES = [
  {
    key: "usine", nom: "Usine",
    resume: "piliers en grille, couloirs francs",
    // Ardoise a peine plus bleue et grille dense : c'est le biome le plus
    // lisible, celui qui ressemble le plus a l'arene nue du depot.
    tint: "#0f141c", grid: "#1a2130", skip: 0,
  },
  {
    key: "fonderie", nom: "Fonderie",
    resume: "ouvertures larges, deux cuves centrales",
    // Le sol tire vers l'orange brule : c'est le biome ou quelque chose chauffe.
    tint: "#161110", grid: "#241b18", skip: 4,
  },
  {
    key: "friche", nom: "Friche",
    resume: "obstacles épars, couverture destructible",
    // Vert eteint, presque gris : rien n'y fonctionne plus, d'ou la couverture
    // qu'on peut casser.
    tint: "#101410", grid: "#1a221b", skip: 3,
  },
];

export function biomeAt(i) { return BIOMES[i] ?? BIOMES[0]; }

/* --- generateur deterministe ----------------------------------------------------

   Mulberry32 : trente lignes, aucune dependance, et surtout le MEME resultat
   dans Node et dans le navigateur — c'est toute l'exigence. `Math.random()` ne
   pouvait pas servir : la geometrie doit se regenerer a l'identique des deux
   cotes a partir de la seule graine. */
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

// Les positions sont ecrites en PART de l'arene et non en pixels : les tables
// restent lisibles, et une arene qui changerait de taille ne demanderait pas de
// tout reecrire.
const OBSTACLES = {
  /* USINE — six piliers sur une grille reguliere. Les couloirs sont francs :
     deux bandes horizontales et trois verticales, toutes traversables. La
     colonne centrale est la seule a entrer dans le carre minimal, et elle y
     laisse 268 px de passage vertical. */
  usine: [
    { x: 0.20, y: 0.30, w: 0.0575, h: 0.102 },
    { x: 0.20, y: 0.70, w: 0.0575, h: 0.102 },
    { x: 0.50, y: 0.30, w: 0.0575, h: 0.102 },
    { x: 0.50, y: 0.70, w: 0.0575, h: 0.102 },
    { x: 0.80, y: 0.30, w: 0.0575, h: 0.102 },
    { x: 0.80, y: 0.70, w: 0.0575, h: 0.102 },
  ],
  /* FONDERIE — deux cuves centrales et rien d'autre. C'est le biome des
     ouvertures larges : la contrainte y est le COUPLE de masses au milieu, qui
     coupe la ligne de tir la plus utilisee de l'arene. */
  fonderie: [
    { x: 0.35, y: 0.50, w: 0.125, h: 0.167 },
    { x: 0.65, y: 0.50, w: 0.125, h: 0.167 },
  ],
  /* FRICHE — epars et ASYMETRIQUE. C'est le seul biome dont la geometrie n'a
     aucune symetrie : on ne peut pas en deduire une moitie de l'autre, il faut
     l'apprendre. Les trois derniers sont DESTRUCTIBLES (`hp`). */
  friche: [
    { x: 0.14, y: 0.22, w: 0.075, h: 0.089 },
    { x: 0.30, y: 0.74, w: 0.056, h: 0.144 },
    { x: 0.62, y: 0.18, w: 0.100, h: 0.078 },
    { x: 0.86, y: 0.58, w: 0.069, h: 0.122 },
    { x: 0.44, y: 0.42, w: 0.069, h: 0.078, hp: 1 },
    { x: 0.72, y: 0.62, w: 0.069, h: 0.078, hp: 1 },
    { x: 0.24, y: 0.50, w: 0.069, h: 0.078, hp: 1 },
  ],
};

/* Les dangers, par biome ET par mode. `calme` n'apparait pas : il n'a AUCUN
   danger, la geometrie seule — c'est le mode qui enseigne l'espace, et le sol
   n'y fait jamais rien.

   `normal` a la meme table dans les trois biomes : deux champs de
   ralentissement, rien qui blesse. C'est deliberement le mode ou le biome n'est
   qu'une FORME, pour qu'on l'apprenne avant qu'il ne morde. */
const HZ_NORMAL = [
  { kind: HZ_SLOW, x: 0.28, y: 0.58 },
  { kind: HZ_SLOW, x: 0.74, y: 0.36 },
];

const HZ_CAUCHEMAR = {
  // Geysers aux INTERSECTIONS des couloirs, exactement la ou l'on passe. Trois
  // periodes premieres entre elles : ils ne battent jamais ensemble.
  usine: [
    { kind: HZ_GEYSER, x: 0.35, y: 0.50, period: 7.0, phase: 0.00 },
    { kind: HZ_GEYSER, x: 0.65, y: 0.50, period: 5.4, phase: 0.37 },
    { kind: HZ_GEYSER, x: 0.50, y: 0.14, period: 6.2, phase: 0.64 },
    { kind: HZ_SLIP, x: 0.16, y: 0.50 },
    { kind: HZ_SLIP, x: 0.84, y: 0.50 },
  ],
  // Flaques REMANENTES aux pieds des cuves, braises qui derivent entre elles.
  fonderie: [
    { kind: HZ_POOL, x: 0.35, y: 0.24 },
    { kind: HZ_POOL, x: 0.65, y: 0.76 },
    { kind: HZ_EMBER, x: 0.50, y: 0.30, dx: 1, dy: 0, phase: 0.00 },
    { kind: HZ_EMBER, x: 0.50, y: 0.70, dx: 1, dy: 0, phase: 0.50 },
  ],
  // Zones corrompues FIXES : le biome de la couverture destructible n'ajoute
  // rien de mobile, il y aurait deux choses a lire au meme endroit.
  friche: [
    { kind: HZ_POOL, x: 0.18, y: 0.68 },
    { kind: HZ_POOL, x: 0.55, y: 0.28 },
    { kind: HZ_POOL, x: 0.82, y: 0.80 },
  ],
};

/* Construit la manche. PUR : memes arguments, meme resultat, dans Node comme
   dans le navigateur — c'est ce qui permet de ne rien transmettre.

   `seed` ne sert aujourd'hui qu'a la friche (une gigue de position), mais il est
   pris par tout le monde : le jour ou un biome tirera vraiment sa geometrie, la
   plomberie sera deja en place et le client n'aura rien a changer.

   LA GEOMETRIE EST POSEE ICI ET NE BOUGE PLUS. Un obstacle qui apparaitrait en
   cours de manche teleporterait un joueur en pleine esquive (162 px en trois
   images, et la prediction locale rejoue la regle des murs), rendrait le damier
   du Ravageur illisible et empecherait `_dropPoint` de poser un bonus. Seules
   les ZONES peuvent naitre en cours de route : elles sont traversables. */
export function buildBiome(biomeIndex, diffIndex, seed = 1,
                           arenaW = 1600, arenaH = 900,
                           viewW = 1600, viewH = 900) {
  const def = biomeAt(biomeIndex);
  const rand = rng(seed);
  const surface = arenaW * arenaH;

  /* LE MOTIF EST DEFINI PAR VUE ET REPETE, jamais etire sur la salle. C'est la
     reconciliation avec la grande arene du lot I, et elle etait obligatoire :
     les tables ci-dessus ecrivent des parts (0,20 ; 0,50 ; 0,80) qui, projetees
     sur 4800 x 2700, donnaient des piliers de 276 px et six obstacles pour neuf
     millions de pixels carres. Les dangers, eux, gardaient leur rayon absolu et
     retombaient a 0,79 % de surface couverte — le biome devenait exactement le
     decor que le lot V refuse d'etre.

     Ce qui compte est la densite DANS LE CHAMP : un joueur voit une vue a la
     fois, et c'est sur une vue que les mesures du lot V ont ete faites. On pave
     donc la salle de cellules d'une vue et on repose le motif dans chacune. Les
     parts de surface sont alors identiques a celles mesurees, quelle que soit la
     taille de la salle, et le script n'a pas une valeur a rerégler.

     Chaque cellule est MIROITEE selon sa position, de facon deterministe : sans
     ca, neuf copies rigoureusement identiques se lisent comme un defaut de
     generation, et un joueur qui traverse la salle a l'impression de tourner en
     rond. Un miroir et non une rotation : la geometrie doit rester
     RECONNAISSABLE — « un joueur qui connait l'usine la reconnait » — et une
     rotation de 90 degres d'une grille de piliers ne se reconnait plus. */
  const cols = Math.max(1, Math.round(arenaW / viewW));
  const rows = Math.max(1, Math.round(arenaH / viewH));
  const cw = arenaW / cols, ch = arenaH / rows;

  const obstacles = [];
  let obsArea = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      // Miroir deterministe par cellule. Le damier (`(cx + cy) & 1`) plutot
      // qu'un tirage : deux cellules voisines ne sont jamais identiques, et la
      // salle reste la meme d'une partie a l'autre pour une graine donnee.
      const mx = (cx + cy) & 1, my = (cx * 2 + cy) & 1;
      for (const o of OBSTACLES[def.key] ?? []) {
        // La friche gigue, les deux autres non : leur lisibilite tient a leur
        // regularite, et une grille de piliers qui tremble n'est plus une grille.
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
          maxHp: o.hp ? BIOME_CFG.COVER_HP : 0,
          hp: o.hp ? BIOME_CFG.COVER_HP : 0,
        });
      }
    }
  }

  /* Les dangers par mode. Le tableau vide de `calme` n'est pas un oubli : c'est
     LE critere d'acceptation du mode. */
  let table = [];
  if (diffIndex === 1) table = HZ_NORMAL;
  else if (diffIndex >= 2) table = HZ_CAUCHEMAR[def.key] ?? [];

  const hazards = [];
  let hzArea = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const mx = (cx + cy) & 1, my = (cx * 2 + cy) & 1;
      for (const h of table) {
        const d = hazardAt(h.kind);
        if (!d) continue;
        const r = h.r ?? d.r;
        const area = Math.PI * r * r;
        /* PLAFOND STRICT. On JETTE plutot que de laisser passer : un plafond
           qu'on verifie apres coup est un plafond qu'on depasse, et le depot a
           deja paye ce prix avec les mares de la Matriarche. */
        if ((hzArea + area) / surface > BIOME_CFG.HAZARD_SURFACE_MAX) continue;
        hzArea += area;
        const fx = mx ? 1 - h.x : h.x, fy = my ? 1 - h.y : h.y;
        hazards.push({
          kind: h.kind, r,
          x: cx * cw + fx * cw, y: cy * ch + fy * ch,
          dot: h.dot ?? d.dot,
          period: h.period ?? (h.kind === HZ_EMBER ? BIOME_CFG.EMBER_PERIOD : BIOME_CFG.GEYSER_PERIOD),
          active: h.active ?? BIOME_CFG.GEYSER_ACTIVE,
          /* La phase est DECALEE par cellule : sans ca, tous les geysers de la
             salle souffleraient a l'unisson et l'arene entiere respirerait comme
             un seul organisme — le defaut deja corrige pour la respiration des
             creatures et pour les croix du sanctuaire. */
          phase: ((h.phase ?? 0) + (cy * cols + cx) * 0.37) % 1,
          // Le rail d'une braise se retourne avec sa cellule, sinon la braise
          // partirait du mauvais bout de son propre trace.
          dx: (h.dx ?? 0) * (mx ? -1 : 1), dy: (h.dy ?? 0) * (my ? -1 : 1),
          span: h.span ?? BIOME_CFG.EMBER_SPAN,
        });
      }
    }
  }

  return {
    index: biomeIndex, key: def.key, nom: def.nom,
    obstacles, hazards,
    // Rendues pour la mesure : le lot X doit pouvoir relever la part de surface
    // couverte sans la recalculer d'une seconde facon.
    obstacleSurface: obsArea / surface,
    hazardSurface: hzArea / surface,
  };
}

/* ETAT D'UN DANGER A UN INSTANT — LE POINT DE PASSAGE UNIQUE.

   Le serveur en tire ses degats, le client son dessin, et c'est la meme ligne :
   ils ne peuvent pas diverger. Rend la position courante (les braises derivent)
   et l'intensite dans [0, 1].

   `k` vaut 1 sur toute la fenetre active d'un geyser sauf sur sa montee et sa
   retombee, qui sont du DESSIN et ne changent rien aux degats — la zone qui
   blesse est pleine des la premiere image. `ZONE_FORGIVE` est le seul endroit du
   jeu autorise a faire differer l'affiche et la logique, et il pardonne dans
   l'autre sens. */
export function hazardState(h, t) {
  if (h.kind === HZ_EMBER) {
    /* Aller-retour sur un rail fixe : une onde TRIANGULAIRE et non une
       sinusoide. La braise garde une vitesse constante d'un bout a l'autre — une
       sinusoide l'aurait fait ralentir aux extremites, donc s'attarder
       precisement la ou le rail est le plus previsible. */
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

/* LA METEO DU SEGMENT, deduite de la graine et du segment. Cauchemar seulement —
   « calme n'a aucun danger actif, normal aucun danger qui blesse », et une meteo
   est un danger.

   Deterministe des deux cotes, donc rien a transmettre : le client connait la
   graine (salon) et le segment (cle `sg`). Seule l'ANNONCE circule, par le canal
   d'alerte, parce qu'un changement muet surprend au lieu d'informer — c'est la
   regle deja posee pour les variantes de rupture de barre et pour l'enrage.

   La DIRECTION de la bourrasque en fait partie : elle doit etre la meme des deux
   cotes, la prediction locale du client la rejoue. */
export function weatherFor(diffIndex, seed, segment) {
  if (diffIndex < 2 || segment < 1) return null;
  const rand = rng((seed >>> 0) * 733 + segment * 9176);
  // Un segment sur trois SANS meteo. Une meteo permanente cesse d'etre un
  // evenement et redevient un multiplicateur — exactement ce que le lot T a
  // retire aux difficultes.
  if (rand() < 0.34) return null;
  const id = Math.min(WEATHERS.length - 1, Math.floor(rand() * WEATHERS.length));
  const ang = rand() * Math.PI * 2;
  return { id, dx: Math.cos(ang), dy: Math.sin(ang) };
}

/* --- VERIFICATION ---------------------------------------------------------------

   Meme role que `verifierScript()` : ce n'est pas un test unitaire deguise,
   c'est le CRITERE D'ACCEPTATION du lot, et il ne vaut que s'il est rejouable.
   Rend la liste des soucis, vide quand tout va bien.

   Quatre regles :
     - la surface des dangers actifs ne depasse jamais le plafond ;
     - la surface d'obstacles non plus ;
     - un passage traversable existe DANS LE CARRE CENTRAL MINIMAL, de bord a
       bord, dans les deux axes — c'est la constriction du Ravageur qui l'impose,
       un obstacle qui enferme un joueur dans un coin de l'arene reduite est un
       piege mortel involontaire ;
     - `normal` n'a aucun danger qui blesse.

   Le passage se verifie par remplissage sur une grille, obstacles DILATES du
   rayon du personnage : un couloir de 30 px est traversable sur le papier et
   infranchissable en jeu. */
export function verifierBiomes(seeds = [1, 7, 99], arenaW = 1600, arenaH = 900,
                               viewW = 1600, viewH = 900) {
  const soucis = [];
  const budget = BIOME_CFG.HAZARD_SURFACE_MAX;

  for (let bi = 0; bi < BIOMES.length; bi++) {
    for (let di = 0; di < 3; di++) {
      for (const seed of seeds) {
        const b = buildBiome(bi, di, seed, arenaW, arenaH, viewW, viewH);
        const ou = `${b.key}/${["calme", "normal", "cauchemar"][di]}/${seed}`;

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
      }
    }
  }
  return soucis;
}

/* Le carre central minimal se mesure sur une CELLULE DE VUE et non sur la
   salle : c est la vue qui se referme pendant la constriction du Ravageur
   (`_atkConstriction` borne sur `CFG.VIEW_*` depuis la grande arene), et un
   carre central de 2160 x 1215 ne dirait rien de ce qui se passe a l ecran.
   On verifie CHAQUE cellule, pas seulement celle du milieu : le combat de boss
   s ancre sur l equipe, donc n importe laquelle peut devenir l arene. */
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
      if (o.maxHp > 0) continue;   // une couverture destructible n'enferme pas
      if (Math.abs(x - o.x) < o.w / 2 + c && Math.abs(y - o.y) < o.h / 2 + c) return false;
    }
    return true;
  };

  // Traversee gauche -> droite et haut -> bas. Les deux, parce qu'un couloir
  // unique dans un seul axe laisse quand meme un joueur pris dans un coin.
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
