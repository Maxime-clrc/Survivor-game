
/* --- surfaces ---------------------------------------------------------------
   GRAPHITE CHAUD. L'indigo d'origine (#08090d … #2a3140) tirait tout l'ecran
   vers le bleu : les gris y devenaient froids, et l'ambre d'action s'y lisait
   comme une alerte posee sur du ciel. La base est desormais un graphite TIEDE —
   meme echelle de luminosite, teinte deplacee vers le brun — et l'ambre s'y pose
   comme une lumiere sur du metal.

   DEUX NIVEAUX DE SURFACE, et cette distinction porte la moitie du resultat :
   une surface PASSIVE (ce qu'on lit) est enfoncee — filet presque absent, aucune
   ombre ; une surface RELEVEE (ce qu'on presse) est plus claire que celle qui la
   porte, avec un lisere clair en haut et une ombre en bas. Sans cet ecart, tout
   retombe sur le meme ton et l'ecran devient plat.

   L'ECHELLE A ETE MONTEE D'UN CRAN apres coup : les valeurs d'origine rendaient
   un ecran juste mais sombre, ou les surfaces se distinguaient mal les unes des
   autres. Ce sont les ECARTS entre crans qui font la profondeur, pas la
   noirceur du plus bas — ils sont donc conserves tels quels, et tout le jeu
   monte ensemble. Les textes, eux, ne bougent pas : leur contraste descend
   mecaniquement, et il reste au-dessus du seuil AA (mesure : titre 12,5,
   secondaire 7,1, attenue 3,9 — ce dernier est reserve aux libelles courts).

   `line` et `lineSoft` restent des HEX et non des rgba : le canvas les lit
   directement, et `alpha()` comme `ramp()` parsent six caracteres hexadecimaux.
   Les filets translucides de l'interface vivent dans `UI` juste dessous. */
export const SURFACE = {
  void:     "#2b2520",
  arena:    "#3a322c",
  panel:    "#453e39",
  raised:   "#554d46",
  line:     "#554d46",
  lineSoft: "#3a322c",
  gridFine:  "#372f29",
  gridMajor: "#4b4139",
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

export const DECOR = [
  {
    arena: "#413830", gridFine: "#50463d", gridMajor: "#63564a",
    vignette: 0.40, vignetteFrom: 0.46, skip: 0, pulse: 0,
  },
  {
    arena: SURFACE.arena, gridFine: SURFACE.gridFine, gridMajor: SURFACE.gridMajor,
    vignette: 0.55, vignetteFrom: 0.42, skip: 0, pulse: 0,
  },
  {
    arena: "#2d2620", gridFine: "#3f332c", gridMajor: "#544036",
    vignette: 0.68, vignetteFrom: 0.34, skip: 3, pulse: 0.06,
  },
];

export function decorAt(diffIndex) { return DECOR[diffIndex] ?? DECOR[1]; }

/* SIX tons et non trois, et aucun ne contient de bleu. Le gris froid d'origine
   se voyait surtout sur les grandes surfaces de prose : sur un fond tiede, un
   texte bleute paraît sale. L'echelle est graphite chaud de bout en bout.

   `faint` et `mute` ont ete remontes AVEC les surfaces, et pas par gout : sur le
   panneau eclairci, leurs valeurs d'origine tombaient a 3,4 et 2,8 de contraste,
   c'est-a-dire sous le seuil AA — pour des tons qui portent des libelles reels
   (noms de statistiques, heures, notes de pied). Un gris qu'on ne peut pas lire
   ne hierarchise rien, il supprime. C'est la meme correction que le depot avait
   deja faite une fois sur le troisieme ton.

   `dim` est le ton le PLUS FREQUENT de l'interface — c'est celui des leads, des
   notes et des lignes secondaires — d'ou sa place au milieu et non en bas. */
export const TEXT = {
  base:   "#f9f9f8",   // titre
  strong: "#e9e7e4",   // fort
  body:   "#dfdcd8",   // courant
  dim:    "#c3bdb7",   // secondaire, le plus frequent
  faint:  "#a89e93",   // attenue
  mute:   "#988d81",   // discret
};

/* L'AMBRE, ET LUI SEUL, porte l'action. Le cyan est parti avec l'indigo : sur
   une base tiede il ressortait comme un corps etranger, alors que l'ambre est la
   couleur meme du materiau eclaire.

   `goInk` et `onGo` ne sont pas des variantes decoratives, ils repondent a une
   regle : UNE COULEUR QUI PORTE DU TEXTE PREND SA VERSION FONCEE. Une teinte
   reglee pour un aplat se dissout des qu'elle devient un mot — meme teinte,
   autre densite. `onGo` est l'inverse, le texte pose SUR un aplat ambre. */
export const SIGNAL = {
  go:      "#ffae2b",
  goSoft:  "#ffcc7a",
  goInk:   "#c07a12",
  onGo:    "#241703",
  warn:    "#ff9430",
  lethal:  "#ff5540",
  ally:    "#e9e7e4",
  persist: "#a855f7",
  gain:    "#9dc94a",
};

export const HEAL = SIGNAL.gain;

export const RARITY_COLOR = ["#c3bdb7", "#9dc94a", "#ff9e4a", "#ffd98a"];

export const CARD_CATEGORY_COLOR = {
  off:     SIGNAL.lethal,
  def:     SIGNAL.go,
  soutien: SIGNAL.gain,
  zone:    SIGNAL.persist,
  util:    TEXT.dim,
};

/* `dps2` est la SEULE teinte que la charte ne fournit pas, et il en faut une :
   le tireur est la seule classe non unique, donc deux joueurs peuvent la porter
   en meme temps. Un ambre PALE, assez proche pour rester « tireur » et assez
   clair pour ne pas se confondre avec le premier a l'ecran. */
export const CLASS_COLOR = {
  tank:     "#e0684a",
  soigneur: "#9dc94a",
  dps:      "#ffc44a",
  dps2:     "#ffd98a",
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
         "#84cc16", "#a16207", "#2dd4bf", "#4f46e5"],

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

export const BIOME = {
  block:     "#5b6472",
  blockEdge: "#8b96a8",
  cover:     "#6d6152",
  coverEdge: "#c9a86a",
  hazard:    "#e8912f",
  hazardIdle:"#6a5334",
  slow:      "#7fa8b8",
  slip:      "#8fb6c9",
};

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

export const BOSS_SKIN = [
  { skin: "#ff4d6d", dark: "#8e1230", edge: "#5c0b1c", bar: "#ff8fa3", deep: "#7a0f26" },
  { skin: "#a8d13a", dark: "#4a6112", edge: "#2b3a08", bar: "#c6e46a", deep: "#3f5410" },
  { skin: "#9db4c8", dark: "#3f5266", edge: "#25313d", bar: "#c2d3e2", deep: "#374857" },
  { skin: "#8b5cf6", dark: "#3b1d80", edge: "#22114d", bar: "#b79dff", deep: "#331a70" },
  { skin: "#ff8a3d", dark: "#8a3c05", edge: "#4d2103", bar: "#ffb782", deep: "#7a3604" },
  { skin: "#e8e4dc", dark: "#6f6a63", edge: "#2f2c28", bar: "#f4f1ea", deep: "#5b5750" },
  { skin: "#f2c14e", dark: "#7a5a0c", edge: "#3f2e04", bar: "#ffdc8a", deep: "#6b4f0a" },
  { skin: "#3fbfa0", dark: "#125a4a", edge: "#08312a", bar: "#7fe0c8", deep: "#0f4c40" },
  { skin: "#7ec8ff", dark: "#1d5c8e", edge: "#0d3350", bar: "#b4e0ff", deep: "#19506f" },
  { skin: "#c9a227", dark: "#6b530c", edge: "#3a2c05", bar: "#e6c96a", deep: "#5c470a" },
  { skin: "#4a4a55", dark: "#1c1c24", edge: "#0a0a0e", bar: "#8a8a99", deep: "#16161d" },
];

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

export function teinter(base, teinte, k) {
  const A = rgbDe(base), B = rgbDe(teinte);
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const la = lum(A), lb = lum(B);
  if (lb < 1) return base;
  const f = la / lb;
  const m = (i) => Math.round(clamp255(A[i] + (B[i] * f - A[i]) * k)).toString(16).padStart(2, "0");
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
    /* Les trois etats de l'ambre. `--go-ink` est l'ambre qui porte du TEXTE sur
       un fond clair, `--on-go` le texte pose SUR un aplat ambre — les deux
       existent parce qu'une teinte reglee pour un aplat se dissout des qu'elle
       devient un mot. */
    "--go-soft": SIGNAL.goSoft,
    "--go-ink":  SIGNAL.goInk,
    "--on-go":   SIGNAL.onGo,
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
    "--cursor-go": cursorUri(SIGNAL.go, true),

    "--t-xs":  TYPE[0] + "px",
    "--t-s":   TYPE[1] + "px",
    "--t-m":   TYPE[2] + "px",
    "--t-l":   TYPE[3] + "px",
    "--t-xl":  TYPE[4] + "px",
    "--t-2xl": TYPE[5] + "px",
    "--t-3xl": TYPE[6] + "px",
  };
}
