
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

export const DECOR = [
  {
    arena: "#181d28", gridFine: "#252c3b", gridMajor: "#38455f",
    vignette: 0.40, vignetteFrom: 0.46, skip: 0, pulse: 0,
  },
  {
    arena: SURFACE.arena, gridFine: SURFACE.gridFine, gridMajor: SURFACE.gridMajor,
    vignette: 0.55, vignetteFrom: 0.42, skip: 0, pulse: 0,
  },
  {
    arena: "#0a0a0e", gridFine: "#1c1719", gridMajor: "#2e2624",
    vignette: 0.68, vignetteFrom: 0.34, skip: 3, pulse: 0.06,
  },
];

export function decorAt(diffIndex) { return DECOR[diffIndex] ?? DECOR[1]; }

export const TEXT = {
  base:  "#e9edf5",
  dim:   "#8892a6",
  faint: "#6f7a90",
};

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

export const COMBAT = {
  bullet:     "#f4d35e",
  shot:       "#ff3b5c",
  flash:      "#ffffff",
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

    "--text":       TEXT.base,
    "--text-dim":   TEXT.dim,
    "--text-faint": TEXT.faint,

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

    "--hud-low": HUD.low,
    "--hud-mid": HUD.mid,
    "--xp":      HUD.xp,

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
