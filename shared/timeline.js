
import { ALERT_ORDER, ALERT_WARN } from "./bosses.js";

export const TL_CFG = {
  SEGMENTS: 6,
  SEGMENT_TIME: 300,
  BEATS: 5,
  BEAT_TIME: 60,

  SPAWN_MARGIN: 60,

  RING_RATIO: 0.62,
  RING_CLEAR: 120,
  RING_TRIES: 8,

  PACK: 4,

  EVENT_ANNOUNCE: 2.6,

  QUARRY_HP_MUL: 0.8,
  QUARRY_SIZE_MUL: 2.5,
  QUARRY_SPEED_MUL: 0.72,

  QUARRY_XP_WORTH: 40,
};

export const SEGMENT_NAMES = [
  "Installation",
  "Emprise",
  "Crise",
  "Ressac",
  "Étau",
  "Apothéose",
];

export function segmentName(segment) {
  return SEGMENT_NAMES[segment - 1] ?? `Segment ${segment}`;
}

export const EV_NUEE = 0;
export const EV_SIEGE = 1;
export const EV_CROISE = 2;
export const EV_CHASSE = 3;

export const EVENTS = [
  { key: "nuee", nom: "Nuée", level: ALERT_WARN,
    texte: "une nuée arrive — tenez votre position",
    types: [1], rateMul: 2.6, minPlayers: 1, fallback: -1 },

  { key: "siege", nom: "Siège", level: ALERT_WARN,
    texte: "siège de blindés — ne vous laissez pas encercler",
    types: [2], rateMul: 0.38, minPlayers: 1, fallback: -1 },

  { key: "croise", nom: "Tir croisé", level: ALERT_WARN,
    texte: "tir croisé — fermez la distance",
    types: [3, 3, 3, 0], rateMul: 0.9, minPlayers: 1, fallback: -1 },

  { key: "chasse", nom: "Chasse", level: ALERT_ORDER,
    texte: "CONCENTREZ LE FEU sur la cible",
    types: [], rateMul: 0, minPlayers: 1, fallback: -1 },
];

export function eventAt(id) { return EVENTS[id] ?? null; }

export const GEOMETRIES = ["bords", "front", "pince", "quatre-fronts", "anneau"];

export const SCRIPT = [
  [
    { rate: 0.6, geom: "bords" },
    { rate: 0.9, geom: "bords" },
    { rate: 1.2, geom: "front" },
    { rate: 1.5, geom: "bords" },
    { rate: 1.8, geom: "pince" },
  ],
  [
    { rate: 1.4, geom: "bords" },
    { rate: 1.7, geom: "front" },
    { rate: 2.0, geom: "pince", event: EV_NUEE },
    { rate: 2.3, geom: "bords" },
    { rate: 2.6, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
  [
    { rate: 2.0, geom: "front" },
    { rate: 2.4, geom: "pince", event: EV_CROISE },
    { rate: 2.2, geom: "bords" },
    { rate: 2.8, geom: "quatre-fronts", minPlayers: 3, fallback: "front" },
    { rate: 3.2, geom: "pince" },
  ],
  [
    { rate: 2.2, geom: "bords" },
    { rate: 2.5, geom: "bords" },
    { rate: 2.9, geom: "front", event: EV_SIEGE },
    { rate: 3.3, geom: "pince" },
    { rate: 3.8, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
  [
    { rate: 3.0, geom: "pince" },
    { rate: 3.4, geom: "quatre-fronts", minPlayers: 3, fallback: "front", event: EV_CHASSE },
    { rate: 3.2, geom: "bords" },
    { rate: 3.9, geom: "front" },
    { rate: 4.4, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
  [
    { rate: 3.4, geom: "front" },
    { rate: 3.7, geom: "bords" },
    { rate: 4.0, geom: "pince", event: EV_NUEE },
    { rate: 4.6, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
    { rate: 5.0, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
];


const GEOM_CALME = { pince: "front", "quatre-fronts": "front", anneau: "bords" };
const GEOM_CAUCHEMAR = { bords: "front", front: "pince", pince: "quatre-fronts" };

function derive(nom) {
  const dur = nom === "cauchemar";
  const doux = nom === "calme";
  return SCRIPT.map(seg => seg.map(b => {
    let geom = b.geom;
    if (doux) geom = GEOM_CALME[geom] ?? geom;
    else if (dur) geom = GEOM_CAUCHEMAR[geom] ?? geom;
    const out = { ...b, geom };
    if (out.fallback) out.fallback = doux ? (GEOM_CALME[out.fallback] ?? out.fallback)
      : dur ? (GEOM_CAUCHEMAR[out.fallback] ?? out.fallback)
      : out.fallback;
    return out;
  }));
}

export const SCRIPTS = {
  calme: derive("calme"),
  normal: derive("normal"),
  cauchemar: derive("cauchemar"),
};

const REPLI = { rate: 1.0, geom: "bords" };

export function beatAt(script, segment, beat) {
  const table = SCRIPTS[script] ?? SCRIPTS.normal;
  const seg = table[segment - 1];
  if (!seg) return REPLI;
  return seg[Math.max(0, Math.min(seg.length - 1, beat))] ?? REPLI;
}

export function adaptEntry(entry, alive) {
  if (!entry) return REPLI;
  if (!entry.minPlayers || alive >= entry.minPlayers) return entry;
  const back = entry.fallback;
  if (!back || !GEOMETRIES.includes(back)) return { ...entry, geom: "bords" };
  return { ...entry, geom: back };
}

export function adaptEvent(id, alive) {
  const def = EVENTS[id];
  if (!def) return -1;
  if (alive >= def.minPlayers) return id;
  const back = def.fallback ?? -1;
  if (back < 0) return -1;
  const bd = EVENTS[back];
  return bd && alive >= bd.minPlayers ? back : -1;
}

export function verifierScript() {
  const soucis = [];
  for (const [nom, table] of Object.entries(SCRIPTS)) {
    let precedent = -9;
    table.forEach((seg, s) => seg.forEach((b, i) => {
      const ou = `${nom} ${s + 1}.${i + 1}`;
      if (b.event === undefined) return;
      if (!EVENTS[b.event]) soucis.push(`${ou} : evenement inconnu ${b.event}`);
      if (i === TL_CFG.BEATS - 1) soucis.push(`${ou} : evenement sur un crescendo`);
      const idx = s * TL_CFG.BEATS + i;
      if (idx - precedent < 2) soucis.push(`${ou} : deux evenements consecutifs`);
      precedent = idx;
    }));
  }
  return soucis;
}

export function beatIndex(segment, beat) {
  return (segment - 1) * TL_CFG.BEATS + beat;
}
