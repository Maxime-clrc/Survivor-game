
/* --- surfaces DU JEU ----------------------------------------------------------
   L'indigo d'origine, et il reste : l'arene, le HUD et les entites n'ont pas
   change de direction. Le graphite chaud ne concerne que l'interface HORS
   PARTIE, et il vit dans `UI_THEME` plus bas — deux palettes, deux portees. */
export const SURFACE = {
  void:     "#08090d",
  arena:    "#0f1219",
  panel:    "#161a24",
  raised:   "#1e2431",
  line:     "#2a3140",
  lineSoft: "#1c222d",
  gridFine:  "#171b24",
  gridMajor: "#222836",
  shadow:   "#000000",
};

/* Ce qui distingue une surface qu'on PRESSE d'une surface qu'on LIT. Trois
   valeurs translucides plutot que des hex : elles se posent sur des fonds
   differents (panneau, champ, carte) et doivent s'y accorder sans qu'on
   recalcule un ton par endroit.

   Le lisere du haut est presque blanc et tres fin : c'est une ARETE DE LUMIERE,
   pas un contour — il dit d'ou vient la lumiere, donc que la surface depasse. */
export const UI = {
  rise:        "rgba(132,121,110,.5)",
  /* LE VERRE. Une carte de choix n'est pas une surface pleine : elle laisse
     passer le fond, floute ce qui est dessous et attrape la lumiere sur son
     arete haute. Deux valeurs seulement — la teinte du verre lui-meme et le
     reflet qui court sous l'arete ; le flou et la saturation sont des EFFETS,
     ils vivent dans la feuille avec les autres reglages de rendu.

     La teinte est tres peu opaque (34 %) : au-dela, le flou ne se voit plus et
     la carte redevient un panneau. En dessous, le texte perd son fond et la
     mesure de contraste ne tient plus. */
  glass:     "rgba(96,88,80,.34)",
  glassGlow: "rgba(255,247,238,.14)",
  edgeTop:     "rgba(255,255,255,.95)",
  lineRaised:  "rgba(230,226,221,.26)",
  linePassive: "rgba(230,226,221,.07)",
};

/* L'ARENE EST ANTHRACITE, PAS INDIGO. Le bleu d'origine tirait la matiere vers
   le plastique : un gris neutre-froid rend le beton et la tole, et il laisse a
   l'ambre le monopole de la chaleur. `SURFACE` ne bouge pas — elle sert aussi
   l'interface, et les deux palettes restent separees. */
export const DECOR = [
  {
    arena: "#1b1c21", gridFine: "#2a2b31", gridMajor: "#3d3f47",
    vignette: 0.40, vignetteFrom: 0.46, skip: 0, pulse: 0,
  },
  {
    arena: "#121316", gridFine: "#1b1d21", gridMajor: "#272a30",
    vignette: 0.55, vignetteFrom: 0.42, skip: 0, pulse: 0,
  },
  {
    arena: "#0b0b0d", gridFine: "#1a1718", gridMajor: "#2c2724",
    vignette: 0.68, vignetteFrom: 0.34, skip: 3, pulse: 0.06,
  },
];

export function decorAt(diffIndex) { return DECOR[diffIndex] ?? DECOR[1]; }

/* Les trois tons du JEU. Ceux de l'interface sont dans `UI_THEME`. */
export const TEXT = {
  base:  "#e9edf5",
  dim:   "#8892a6",
  faint: "#6f7a90",
};

/* La grammaire du JEU, inchangee : cyan « il faut y aller », ambre « danger,
   sortir », rouge letal. L'interface hors partie a la sienne (`UI_THEME`), ou
   l'ambre porte l'action — les deux ne se croisent jamais a l'ecran. */
export const SIGNAL = {
  go:      "#38bdf8",
  warn:    "#f5a524",
  lethal:  "#ef4056",
  ally:    "#e9edf5",
  persist: "#a855f7",
  gain:    "#34d399",
};

export const HEAL = SIGNAL.gain;

export const RARITY_COLOR = ["#94a3b8", "#38bdf8", "#c084fc", "#fbbf24"];

export const CARD_CATEGORY_COLOR = {
  off:     SIGNAL.lethal,
  def:     SIGNAL.go,
  soutien: SIGNAL.gain,
  zone:    SIGNAL.persist,
  util:    TEXT.dim,
};

export const CLASS_COLOR = {
  tank:     "#7fd8e8",
  soigneur: "#8ef0c8",
  dps:      "#f4d35e",
  dps2:     "#d98cf0",
};

/* --- LE THEME DE L'INTERFACE HORS PARTIE ---------------------------------------
   Graphite chaud et ambre, et il ne sort JAMAIS des menus. C'est la seule facon
   de tenir les deux directions a la fois : l'arene garde son indigo et sa
   grammaire — cyan « il faut y aller », ambre « danger, sortir » — pendant que
   les ecrans hors partie passent au metal chaud ou l'ambre porte l'action. Les
   memes valeurs partout auraient force un choix : soit repeindre le jeu, soit
   renoncer a la charte ; soit, pire, laisser `--go` valoir l'ambre en combat et
   se confondre avec `--warn` a deux cents ennemis.

   La SEPARATION est une portee CSS et non un second jeu de noms : `cssVars()`
   expose ces valeurs en `--ui-*`, et `menus.css` les remappe sur `--text`,
   `--go`… au niveau de `.overlay` et de la barre. Les menus heritent donc du
   theme, tout le reste garde `:root`. Aucune des deux cents references de la
   feuille n'a eu a changer de nom.

   `goInk` et `onGo` repondent a une regle : UNE COULEUR QUI PORTE DU TEXTE PREND
   SA VERSION FONCEE. Une teinte reglee pour un aplat se dissout des qu'elle
   devient un mot — meme teinte, autre densite ; `onGo` est l'inverse, l'encre
   posee SUR un aplat ambre. */
export const UI_THEME = {
  void:     "#2b2520",
  arena:    "#3a322c",
  panel:    "#453e39",
  raised:   "#554d46",
  line:     "#554d46",
  lineSoft: "#3a322c",

  text:       "#f9f9f8",
  textStrong: "#e9e7e4",
  textBody:   "#dfdcd8",
  textDim:    "#c3bdb7",
  textFaint:  "#a89e93",
  textMute:   "#988d81",

  go:      "#ffae2b",
  goSoft:  "#ffcc7a",
  goInk:   "#c07a12",
  onGo:    "#241703",
  warn:    "#ff9430",
  lethal:  "#ff5540",
  gain:    "#9dc94a",
  ally:    "#e9e7e4",

  rarity: ["#c3bdb7", "#9dc94a", "#ff9e4a", "#ffd98a"],

  clsTank:     "#e0684a",
  clsSoigneur: "#9dc94a",
  clsDps:      "#ffc44a",
};

export const COMBAT = {
  bullet:     "#f4d35e",
  shot:       "#ff3b5c",
  flash:      "#ffffff",
  // en additif, un coeur deja blanc sature des la deuxieme couche : c'est une
  // surexposition, pas une detonation. On baisse la SOURCE et on laisse
  // l'empilement fabriquer le coeur chaud. `flash` reste blanc pur — il sert au
  // flash de touche de la horde, ou c'est correct.
  blastCore:  "#fff4e0",
  downed:     "#4a5568",
  outline:    "#ffffff",
};

export const ENEMY = {
  TINT: ["#c9364a", "#f97316", "#7f1d3a", "#a855f7", "#ec4899",
         "#84cc16", "#a16207", "#2dd4bf", "#4f46e5",
         "#facc15", "#38bdf8", "#059669", "#d946ef"],

  elite:      "#ffd76e",
  base:       "#e05263",
};

export const ZONE = {
  imminent: "#ff3c5a",
  edge:     "#ff5a78",
  fill:     "#d62850",
  blast:    "#ff788c",
  dying:    "#ffbecd",
  persist:  "#b282ff",
};

export const WALL = { fill: "#7896ff", edge: "#aac3ff" };

/* Ce qui reste COMMUN aux quatre lieux, parce que c'est du gameplay et non du
   decor : une couverture destructible se lit pareil partout, et l'ambre d'un
   danger reste la couleur du danger. Tout le reste est descendu dans
   `BIOME_SKIN`. */
export const BIOME = {
  cover:     "#6d6152",
  coverEdge: "#c9a86a",
  hazard:    "#e8912f",
  hazardIdle:"#6a5334",
  slow:      "#7fa8b8",
  slip:      "#8fb6c9",
};

/* LES PROPS SONT DE LA MATIERE, PAS UN SIGNAL. Un signal est sature et anime,
   une matiere est desaturee et fixe : c'est la seule regle qui empeche le decor
   de mentir, maintenant que l'ambre n'est plus reserve a l'avertissement.
   `led` est le seul ton chaud vif, et il ne couvre jamais plus de trois pixels. */
export const PROP = {
  ombre: "#000000",
  metal: "#8b939f",
  metalDark: "#3a3f47",
  rouille: "#6b4326",
  peint: "#b9a06a",
  led: "#ffa63d",
  verre: "#9fb0bd",
  vert: "#5c6b4a",
  // la fonte est le SEUL ton du depot plus chaud que l'ambre de signal : elle ne
  // sert qu'a de la matiere en fusion, jamais a un avertissement.
  fonte: "#ff6a18",
  scorie: "#4a423c",
  brique: "#7a5544",
  givre: "#a8c4d6",
  astre: "#cfe0ff",
  // LE SEUL CYAN DU DECOR, et il ne sert qu'a une balise d'arrimage. Il reste
  // sous l'ambre : la station eclaire en chaud, elle se signale en froid.
  balise: "#6fc6d8",
};

/* LA CHARTE D'UN LIEU, ET ELLE EST LE SEUL ENDROIT OU IL SE DECLARE.

   Avant, un biome posait sa couleur a trois endroits et son bloc a aucun :
   `tint`/`grid` dans `biomes.js`, son ambiante ici, et les quatre partageaient
   `BIOME.block`. Mesure du resultat : apres `teinter()` — qui preserve la
   luminance de la base — les quatre arenes tenaient dans 15 niveaux RGB sur
   255. Quatre sols a 6 % l'un de l'autre ne sont pas quatre lieux.

   La couleur d'un lieu est donc ECRITE et non derivee, et la difficulte n'est
   plus qu'un FACTEUR DE CLARTE (`solDeBiome`) : elle assombrit, elle ne teinte
   plus. C'est la seule facon d'avoir a la fois trois modes et quatre lieux.

   `amb` est la couleur vers laquelle le sol descend loin de toute source —
   jamais noire : un sol a zero n'est plus une matiere, c'est un trou. `k` est
   la profondeur de l'ombre, `dir` la direction de la lumiere (partagee par
   toutes les ombres portees), `emis` la teinte des sources fixes, `bloc` et
   `blocEdge` la masse batie — celle qui occupe l'ecran. */
export const BIOME_SKIN = {
  usine: {
    arena: "#121a26", gridFine: "#1f2a3c", gridMajor: "#32405e",
    bloc: "#4e5a6e", blocEdge: "#93a2b8",
    amb: "#6d7480", k: 0.52, dir: [0.62, 0.78], emis: "#ffa63d",
  },
  fonderie: {
    arena: "#1d1310", gridFine: "#2c1d17", gridMajor: "#45291d",
    bloc: "#5a4034", blocEdge: "#a8724a",
    amb: "#8a6a52", k: 0.58, dir: [0.55, 0.84], emis: "#ff8a2a",
  },
  // le gris-vert du beton lave, et la seule ambiante PLATE : dans une friche
  // rien n'eclaire, donc rien ne modele.
  friche: {
    arena: "#1b1a13", gridFine: "#27261c", gridMajor: "#3a3829",
    bloc: "#5c5f55", blocEdge: "#9aa08d",
    amb: "#6e7570", k: 0.62, dir: [0.70, 0.71], emis: "#ffb44f",
  },
  // la seule ambiante FROIDE du depot, la plus profonde, et le seul emissif qui
  // ne soit pas ambre : dans le vide il n'y a pas de lumiere rasante, seulement
  // les feux de position de la station.
  // `arena` descend sous les trois autres, et c'est le lieu qui l'exige : c'est
  // la valeur a laquelle la nebuleuse et les etoiles se comparent. A #0b1020 le
  // ciel n'avait nulle part ou etre plus sombre que le sol.
  nebuleuse: {
    arena: "#06080f", gridFine: "#16203a", gridMajor: "#24325a",
    bloc: "#38455f", blocEdge: "#7fa8d8",
    amb: "#59637d", k: 0.70, dir: [0.58, 0.81], emis: "#7fd0e8",
  },
};

export function biomeSkin(key) { return BIOME_SKIN[key] ?? BIOME_SKIN.usine; }

/* LE MODE REGLE LA CLARTE, LE LIEU REGLE LA TEINTE. Le facteur se releve sur
   `DECOR` au lieu de s'ecrire : les trois modes gardent leur echelle exacte, et
   retoucher `DECOR` continue de tout suivre. */
export function solDeBiome(diffIndex, key) {
  const S = biomeSkin(key);
  const k = luminance(decorAt(diffIndex).arena) / luminance(DECOR[1].arena);
  return {
    arena: eclat(S.arena, k),
    gridFine: eclat(S.gridFine, k),
    gridMajor: eclat(S.gridMajor, k),
  };
}

function luminance(hex) {
  const c = rgbDe(hex);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function eclat(hex, k) {
  const c = rgbDe(hex);
  const m = (i) => Math.round(clamp255(c[i] * k)).toString(16).padStart(2, "0");
  return `#${m(0)}${m(1)}${m(2)}`;
}

// LA METEO EST DU DECOR, donc froide et sous 18 % de saturation : elle ne doit
// jamais concurrencer un telegraphe. La cendre est le seul ecart, chaude parce
// qu'elle vient du feu — et elle reste plus sombre que n'importe quel signal.
export const WEATHER = {
  wind: "#9fb4cc",
  ash:  "#b8a48c",
};

export const BOSS = {
  skin:     "#ff4d6d",
  skinDark: "#8e1230",
  edge:     "#5c0b1c",
  twin:     "#9fb4ff",
  twinDark: "#2a3a7a",
  twinEdge: "#1b2450",
  maw:      "#2a0410",
  eye:      "#ffe08a",

  barLow:   "#ff8fa3",
  barWarn:  "#ffd7de",
  barRing:  "#ffb3c1",
  barDeep:  "#7a0f26",
  barEmpty: "#783c4b",
  ult:      "#a97bff",
  ultSoft:  "#c8b4ff",
  crack:    "#ffdc78",
};

/* UN BOSS NE SE CONTENTE PAS D'APPARAITRE DANS L'ARENE, IL LA PREND. Quatre
   champs de plus par ligne, et ce sont des NOMBRES : `amb` la couleur vers
   laquelle l'ambiante tire, `k` la profondeur d'ombre, `vig` le facteur de
   vignettage, `puls` [hz, amplitude] le battement de l'ambiante, `atmo` la
   teinte du champ d'arene (null = aucun).

   Chacun rejoue le VERBE que sa silhouette dit deja : le Ravageur creuse une
   fosse, le Metronome bat, l'Oracle ouvre trop grand, le final absorbe. Le monde
   ne fait pas un effet en plus — il repete le boss.

   Les cinq dernieres lignes sont les finals par difficulte : meme profil que le
   final, c'est le meme combat. */
export const BOSS_SKIN = [
  { skin: "#ff4d6d", dark: "#8e1230", edge: "#5c0b1c", bar: "#ff8fa3", deep: "#7a0f26",
    amb: "#5a3a28", k: 0.72, vig: 1.30, puls: [0, 0],       atmo: "#ff8a3d" },
  { skin: "#a8d13a", dark: "#4a6112", edge: "#2b3a08", bar: "#c6e46a", deep: "#3f5410",
    amb: "#4f5a3a", k: 0.66, vig: 1.15, puls: [0.55, 0.16], atmo: "#a8d13a" },
  { skin: "#9db4c8", dark: "#3f5266", edge: "#25313d", bar: "#c2d3e2", deep: "#374857",
    amb: "#5a6270", k: 0.62, vig: 1.12, puls: [1.50, 0.20], atmo: null },
  { skin: "#8b5cf6", dark: "#3b1d80", edge: "#22114d", bar: "#b79dff", deep: "#331a70",
    amb: "#6e6a72", k: 0.48, vig: 0.78, puls: [0, 0],       atmo: "#8b5cf6" },
  { skin: "#ff8a3d", dark: "#8a3c05", edge: "#4d2103", bar: "#ffb782", deep: "#7a3604",
    amb: "#44506e", k: 0.68, vig: 1.18, puls: [0.90, 0.10], atmo: "#7ec8ff" },
  { skin: "#e8e4dc", dark: "#6f6a63", edge: "#2f2c28", bar: "#f4f1ea", deep: "#5b5750",
    amb: "#2e2a30", k: 0.80, vig: 1.45, puls: [0.35, 0.22], atmo: "#e8e4dc" },
  { skin: "#f2c14e", dark: "#7a5a0c", edge: "#3f2e04", bar: "#ffdc8a", deep: "#6b4f0a",
    amb: "#2e2a30", k: 0.80, vig: 1.45, puls: [0.35, 0.22], atmo: "#e8e4dc" },
  { skin: "#3fbfa0", dark: "#125a4a", edge: "#08312a", bar: "#7fe0c8", deep: "#0f4c40",
    amb: "#2e2a30", k: 0.80, vig: 1.45, puls: [0.35, 0.22], atmo: "#e8e4dc" },
  { skin: "#7ec8ff", dark: "#1d5c8e", edge: "#0d3350", bar: "#b4e0ff", deep: "#19506f",
    amb: "#2e2a30", k: 0.80, vig: 1.45, puls: [0.35, 0.22], atmo: "#e8e4dc" },
  { skin: "#c9a227", dark: "#6b530c", edge: "#3a2c05", bar: "#e6c96a", deep: "#5c470a",
    amb: "#2e2a30", k: 0.80, vig: 1.45, puls: [0.35, 0.22], atmo: "#e8e4dc" },
  { skin: "#4a4a55", dark: "#1c1c24", edge: "#0a0a0e", bar: "#8a8a99", deep: "#16161d",
    amb: "#2e2a30", k: 0.80, vig: 1.45, puls: [0.35, 0.22], atmo: "#e8e4dc" },
];

/* LA PEAU D'UN CADRE — l'identite reste dans hauts_faits.js, comme BOSS_ROSTER
   garde la sienne a cote de BOSS_SKIN.

   Six emplacements a valeurs NOMMEES, jamais du CSS : une table de donnees qui
   porte une declaration de style ne s'inspecte plus qu'a l'oeil. La silhouette
   est le sixieme : elle etait soudee a `bordure: encoche`, or la FORME et
   l'EPAISSEUR sont deux decisions — une plaque blindee peut avoir un bord fin.

     silhouette  droit · coupe · cran · blindee · brisee
     fond        aucun · voile · trame · plaque · circuit · balaye · irise
     bordure     trait · plein · double · blindee · chassis
     ornement    aucun · crans · chevrons · barres · pointes · angles · boulons · rail
     lueur       aucune · douce · nette · segment · pulse
     insigne     les douze glyphes de ui/cadres.js

   `palier` n'est pas un septieme emplacement, c'est ce qui BORNE les six autres,
   et il se croise avec l'exigence du haut fait (verifierHautsFaits) :
     1  defis libres     lueur <= douce, aucun marqueur de palier 2, plaque inerte
     2  defis cauchemar  au moins un marqueur, un reflet lent, la visserie complete
     3  legende          seul a porter irise, pulse et chassis
   Le palier ne se declare pas dans le CSS cadre par cadre : la feuille le LIT
   (`data-cadre-palier`) pour doser la visserie, le reflet et la profondeur. Une
   rarete se voit a la complexite technique, pas a la couleur.

   `defaut` n'a pas d'entree : ce n'est pas un cadre, c'est son absence. */
export const CADRE_EMPLACEMENTS = ["silhouette", "fond", "bordure", "ornement", "lueur", "insigne"];
export const CADRE_PALIER_MAX = 3;
export const CADRE_MARQUEURS_2 = ["double", "blindee", "balaye", "nette", "segment"];
export const CADRE_ANIMES = ["irise", "pulse", "chassis"];

export const CADRE_SKIN = {
  sobre:       { palier: 1, teinte: "#9aa4b2", silhouette: "droit",   fond: "trame",   bordure: "trait",   ornement: "aucun",    lueur: "aucune",  insigne: "cercle" },
  depouille:   { palier: 1, teinte: "#7f8a99", silhouette: "cran",    fond: "aucun",   bordure: "plein",   ornement: "crans",    lueur: "aucune",  insigne: "anneau" },
  immacule:    { palier: 1, teinte: "#eaf2ff", silhouette: "droit",   fond: "voile",   bordure: "trait",   ornement: "aucun",    lueur: "douce",   insigne: "losange" },
  foudroyant:  { palier: 1, teinte: "#63d7ff", silhouette: "coupe",   fond: "circuit", bordure: "plein",   ornement: "pointes",  lueur: "douce",   insigne: "eclair" },
  arsenal:     { palier: 1, teinte: "#ffb454", silhouette: "coupe",   fond: "plaque",  bordure: "plein",   ornement: "boulons",  lueur: "aucune",  insigne: "ratelier" },
  ermite:      { palier: 1, teinte: "#8f7ad6", silhouette: "droit",   fond: "aucun",   bordure: "trait",   ornement: "angles",   lueur: "douce",   insigne: "solitude" },

  insomniaque: { palier: 2, teinte: "#c4453f", silhouette: "cran",    fond: "trame",   bordure: "double",  ornement: "crans",    lueur: "nette",   insigne: "oeil" },
  intact:      { palier: 2, teinte: "#4fd6a0", silhouette: "blindee", fond: "voile",   bordure: "blindee", ornement: "angles",   lueur: "douce",   insigne: "bouclier" },
  chasseur:    { palier: 2, teinte: "#d64f8f", silhouette: "coupe",   fond: "plaque",  bordure: "double",  ornement: "pointes",  lueur: "nette",   insigne: "trophee" },
  or:          { palier: 2, teinte: "#ffd24a", silhouette: "coupe",   fond: "balaye",  bordure: "double",  ornement: "barres",   lueur: "nette",   insigne: "laurier" },
  phalange:    { palier: 2, teinte: "#4a8fff", silhouette: "blindee", fond: "plaque",  bordure: "blindee", ornement: "chevrons", lueur: "segment", insigne: "phalange" },

  /* seule entree dont la teinte n'est pas une couleur mais un spectre, et seul
     insigne qui prend ce spectre au lieu d'un aplat */
  prismatique: { palier: 3, teinte: "#e8ecf5", silhouette: "brisee",  fond: "irise",   bordure: "chassis", ornement: "rail",     lueur: "pulse",   insigne: "prisme",
                 spectre: ["#ff5c7a", "#ffb454", "#ffd24a", "#4fd6a0", "#63d7ff", "#a78bfa", "#ff5c7a"] },
};

/* L'accent est DERIVE, pas ecrit : douze hex de plus a tenir d'accord avec leur
   teinte est douze occasions de les desaccorder. */
export const cadreAccent = (teinte) => melange(teinte, "#ffffff", 0.42);

export const POWERUP_COLOR = {
  heal:     HEAL,
  damage:   "#f4d35e",
  rate:     "#5ab6f0",
  double:   "#d98cf0",
  shield:   "#7fd8e8",
  slow:     "#9fb4ff",
  pierce:   "#ff9d4d",
  nova:     "#ff6b8a",
  beacon:   HEAL,
  turret:   "#c8d24a",
  ricochet: "#66e0d8",
  fragment: "#bfe36a",
  purification: "#e6f2ff",
};

export const EFFECT_COLOR = {
  orbiteurs:     "#d98cf0",
  givre:         "#9acdff",
  drone:         "#66e0d8",
  essaim:        "#f4d35e",
  pulsar:        "#ff6b8a",
  bouclierRegen: "#7fd8e8",
  vampirisme:    "#ff8fa3",
  vif_argent:    "#9acdff",
};

export const OWNED = {
  droneAtk:   "#7fd0f0",
  droneSwarm: "#f0a15f",
  orphan:     "#9aa4c0",
  bomb:       "#ff9d4d",
  bulwarkArc: "#b4f0fa",
};

export const FX = {
  flash:        "#ffffff",
  veil:         "#fff0f5",
  ricochet:     "#66e0d8",
  ricochetCore: "#c8fffa",
  heal:         HEAL,
  healSoft:     "#dcfff0",
  elite:        "#ffd76e",
  blastFill:    "#ff8c3c",
  blastEdge:    "#ffb45a",
  bombFill:     "#ff7828",
  bombEdge:     "#ffc878",
  wave:         "#ebf5ff",
  waveSoft:     "#9fb4ff",
  level:        "#f4d35e",
  levelSoft:    "#fff5cd",
  nova:         "#ff6b8a",
  novaSoft:     "#ffc8d2",
  slow:         "#7896ff",
};

export const MARK = {
  go:    SIGNAL.go,
  away:  SIGNAL.lethal,
  break: SIGNAL.warn,
  bait:  "#ff8f4d",
  ok:    SIGNAL.gain,
};

// une entree par DAMAGE_SOURCES : sept, pas six. La ventilation du bilan lit
// cette table par index — une entree manquante donne une couleur `undefined`.
export const SRC_TINT = [
  SIGNAL.lethal,
  COMBAT.shot,
  SIGNAL.persist,
  SIGNAL.warn,
  FX.bombFill,
  ZONE.blast,
  BIOME.hazard,
];

export const HUD = {
  low:      "#ff6b8a",
  mid:      "#f4b04a",
  ready:    "#ffffff",
  notReady: "#565c6e",
  xp:       "#f4d35e",
  shield:   "#7fd8e8",
  ghost:    "#ffe0b0",
};

export const TYPE = [13, 15, 18, 22, 29, 38, 50];

const RGB_CACHE = new Map();

export function alpha(hex, a) {
  let t = RGB_CACHE.get(hex);
  if (!t) {
    t = [parseInt(hex.slice(1, 3), 16),
         parseInt(hex.slice(3, 5), 16),
         parseInt(hex.slice(5, 7), 16)];
    RGB_CACHE.set(hex, t);
  }
  return `rgba(${t[0]},${t[1]},${t[2]},${a})`;
}

export function melange(a, b, k) {
  const A = rgbDe(a), B = rgbDe(b);
  const m = (i) => Math.round(clamp255(A[i] + (B[i] - A[i]) * k)).toString(16).padStart(2, "0");
  return `#${m(0)}${m(1)}${m(2)}`;
}

const clamp255 = (v) => Math.max(0, Math.min(255, v));

function rgbDe(hex) {
  let t = RGB_CACHE.get(hex);
  if (!t) {
    t = [parseInt(hex.slice(1, 3), 16),
         parseInt(hex.slice(3, 5), 16),
         parseInt(hex.slice(5, 7), 16)];
    RGB_CACHE.set(hex, t);
  }
  return t;
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r)      h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else                h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
          : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + t.map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

const RAMP_CACHE = new Map();

export function ramp(hex) {
  let r = RAMP_CACHE.get(hex);
  if (r) return r;
  const [h, s, l] = hexToHsl(hex);
  const dark = (drop, floor) => hslToHex(h - 8, s + 10, Math.max(floor, l - drop));
  r = {
    ombre:   dark(28, 13),
    base:    hex,
    lumiere: hslToHex(h + 6,  s - 12, Math.max(l + 16, 34)),
    accent:  hslToHex(h + 40, s + 20, Math.max(l + 30, 62)),
    contour: hslToHex(h - 4,  s + 14, Math.max(l - 40, 8)),
    rim:     hslToHex(h + 10, Math.max(0, s - 30), Math.min(92, l + 44)),
  };
  RAMP_CACHE.set(hex, r);
  return r;
}


const CURSOR_ARROW = "M2 2 L2 20 L6.6 15.6 L9.4 21.6 L12.6 20.1 L9.8 14.4 L16 14 Z";
const CURSOR_HOOK = "M17.4 3 L21.5 3 L21.5 7.1";

function cursorUri(fill, hook) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
    + `<path d="${CURSOR_ARROW}" fill="${SURFACE.void}" stroke="${SURFACE.void}"`
    + ' stroke-width="2.6" stroke-linejoin="miter"/>'
    + `<path d="${CURSOR_ARROW}" fill="${fill}"/>`
    + (hook
      ? `<path d="${CURSOR_HOOK}" fill="none" stroke="${SURFACE.void}"`
        + ' stroke-width="3.6" stroke-linejoin="miter"/>'
        + `<path d="${CURSOR_HOOK}" fill="none" stroke="${fill}"`
        + ' stroke-width="1.8" stroke-linejoin="miter"/>'
      : "")
    + "</svg>";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 2 2`;
}

export function cssVars(diffIndex = 1) {
  const D = decorAt(diffIndex);
  return {
    "--bg-void":   SURFACE.void,
    "--bg-arena":  D.arena,
    "--bg-panel":  SURFACE.panel,
    "--bg-raised": SURFACE.raised,
    "--line":      SURFACE.line,
    "--line-soft": SURFACE.lineSoft,

    /* Ce qui separe une surface qu'on PRESSE d'une surface qu'on LIT. La
       relevee est plus claire que son support, avec l'arete de lumiere en haut ;
       la passive n'a qu'un filet presque absent et aucune ombre. */
    "--ui-rise":         UI.rise,
    "--ui-edge-top":     UI.edgeTop,
    "--ui-line-raised":  UI.lineRaised,
    "--ui-line-passive": UI.linePassive,
    "--ui-glass":        UI.glass,
    "--ui-glass-glow":   UI.glassGlow,

    "--text":        TEXT.base,
    "--text-strong": TEXT.strong,
    "--text-body":   TEXT.body,
    "--text-dim":    TEXT.dim,
    "--text-faint":  TEXT.faint,
    "--text-mute":   TEXT.mute,

    "--go":      SIGNAL.go,
    "--warn":    SIGNAL.warn,
    "--lethal":  SIGNAL.lethal,
    "--ally":    SIGNAL.ally,
    "--persist": SIGNAL.persist,
    "--gain":    SIGNAL.gain,

    "--commune":    RARITY_COLOR[0],
    "--rare":       RARITY_COLOR[1],
    "--epique":     RARITY_COLOR[2],
    "--legendaire": RARITY_COLOR[3],

    "--cls-tank":     CLASS_COLOR.tank,
    "--cls-soigneur": CLASS_COLOR.soigneur,
    "--cls-dps":      CLASS_COLOR.dps,

    "--boss-low":      BOSS.barLow,
    "--boss-warn":     BOSS.barWarn,
    "--boss-deep":     BOSS.barDeep,
    "--boss-empty":    BOSS.barEmpty,
    "--boss-ult":      BOSS.ult,
    "--boss-ult-soft": BOSS.ultSoft,
    "--boss-eye":      BOSS.eye,

    "--hud-low":    HUD.low,
    "--hud-mid":    HUD.mid,
    "--hud-shield": HUD.shield,
    "--hud-ghost":  HUD.ghost,
    "--xp":         HUD.xp,

    "--downed": COMBAT.downed,
    "--flash":  COMBAT.flash,

    "--cursor-ui": cursorUri(TEXT.base, false),
    "--cursor-go": cursorUri(UI_THEME.go, true),

    /* LE THEME DE L'INTERFACE, expose a part et remappe par `menus.css` sur les
       ecrans hors partie. Ces valeurs ne touchent jamais l'arene ni le HUD :
       c'est la portee CSS qui les separe, pas un second jeu de noms. */
    "--ui-bg-void":   UI_THEME.void,
    "--ui-bg-arena":  UI_THEME.arena,
    "--ui-bg-panel":  UI_THEME.panel,
    "--ui-bg-raised": UI_THEME.raised,
    "--ui-line-c":    UI_THEME.line,
    "--ui-line-softc": UI_THEME.lineSoft,

    "--ui-text":        UI_THEME.text,
    "--ui-text-strong": UI_THEME.textStrong,
    "--ui-text-body":   UI_THEME.textBody,
    "--ui-text-dim":    UI_THEME.textDim,
    "--ui-text-faint":  UI_THEME.textFaint,
    "--ui-text-mute":   UI_THEME.textMute,

    "--ui-go":      UI_THEME.go,
    "--ui-go-soft": UI_THEME.goSoft,
    "--ui-go-ink":  UI_THEME.goInk,
    "--ui-on-go":   UI_THEME.onGo,
    "--ui-warn":    UI_THEME.warn,
    "--ui-lethal":  UI_THEME.lethal,
    "--ui-gain":    UI_THEME.gain,
    "--ui-ally":    UI_THEME.ally,

    "--ui-commune":    UI_THEME.rarity[0],
    "--ui-rare":       UI_THEME.rarity[1],
    "--ui-epique":     UI_THEME.rarity[2],
    "--ui-legendaire": UI_THEME.rarity[3],

    "--ui-cls-tank":     UI_THEME.clsTank,
    "--ui-cls-soigneur": UI_THEME.clsSoigneur,
    "--ui-cls-dps":      UI_THEME.clsDps,

    "--t-xs":  TYPE[0] + "px",
    "--t-s":   TYPE[1] + "px",
    "--t-m":   TYPE[2] + "px",
    "--t-l":   TYPE[3] + "px",
    "--t-xl":  TYPE[4] + "px",
    "--t-2xl": TYPE[5] + "px",
    "--t-3xl": TYPE[6] + "px",
  };
}
