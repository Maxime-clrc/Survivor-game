
export const AUDIO_CFG = {
  SAME_COOLDOWN: 0.04,
  MAX_VOICES: 16,
  STEAL_FADE: 0.025,
  MASTER: 0.55,
  MUSIC_DUCK: 0.45,
  DUCK_DOWN: 0.30,
  DUCK_UP: 0.70,
};

export const SOUND_GAIN = {
  alerte: 1.0,
  boss: 0.9,
  niveau: 0.8,
  bonus: 0.6,
  mort: 0.4,
  impact: 0.25,
  menu: 0.18,
  tir: 0.15,
};

export class VoiceLimiter {
  constructor(cfg = AUDIO_CFG) {
    this.cfg = cfg;
    this.voices = [];
    this.lastAt = new Map();
    this.peak = 0;
    this.dropped = 0;
    this.stolen = 0;
  }

  admit(key, now) {
    const last = this.lastAt.get(key);
    if (last !== undefined && now - last < this.cfg.SAME_COOLDOWN) {
      this.dropped++;
      return false;
    }
    this.lastAt.set(key, now);
    return true;
  }

  add(key, now, endsAt, stop) {
    this.voices = this.voices.filter(v => v.endsAt > now);
    while (this.voices.length >= this.cfg.MAX_VOICES) {
      const old = this.voices.shift();
      this.stolen++;
      try { old.stop(); } catch {  }
    }
    this.voices.push({ key, endsAt, stop });
    if (this.voices.length > this.peak) this.peak = this.voices.length;
  }

  get active() { return this.voices.length; }
}


let ac = null;
let master = null;
let musicG = null;
let noiseBuf = null;
const limiter = new VoiceLimiter();

let volume = readNumber("survivor.audio.vol", 0.7);
let muted = readNumber("survivor.audio.mute", 0) === 1;
let musicVolume = readNumber("survivor.audio.musicVol", 0.5);

let source = readText("survivor.audio.source", "pistes") === "synthe"
  ? "synthe" : "pistes";

function readNumber(key, fallback) {
  if (typeof localStorage === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readText(key, fallback) {
  if (typeof localStorage === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

function store(key, value) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(key, String(value)); } catch {  }
}

export function initAudio() {
  const Ctor = typeof globalThis !== "undefined"
    ? (globalThis.AudioContext || globalThis.webkitAudioContext)
    : null;
  if (!Ctor) return false;
  if (!ac) {
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = muted ? 0 : volume * AUDIO_CFG.MASTER;
    master.connect(ac.destination);
    musicG = ac.createGain();
    musicG.gain.value = musicVolume * duck;
    musicG.connect(master);
    noiseBuf = makeNoise(ac);
  }
  if (ac.state === "suspended" && ac.resume) ac.resume();
  if (source === "pistes") loadSamples();
  return true;
}

export const SAMPLES = {
  tir: { url: "/assets/musics/effects/laser shot.wav",
         offset: 0.035, dur: 0.26, gain: 2.4 },
};

const buffers = new Map();
const loading = new Set();

export function loadSamples() {
  if (!ac || typeof fetch !== "function") return;
  for (const [name, spec] of Object.entries(SAMPLES)) {
    if (buffers.has(name) || loading.has(name)) continue;
    loading.add(name);
    fetch(spec.url)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(buf => ac.decodeAudioData(buf))
      .then(decoded => { buffers.set(name, decoded); })
      .catch(() => {  })
      .finally(() => loading.delete(name));
  }
}

export function sampleReady(name) { return buffers.has(name); }

function sample(name, gain) {
  const buf = buffers.get(name);
  const spec = SAMPLES[name];
  const t0 = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  const dur = Math.min(spec.dur, Math.max(0.02, buf.duration - spec.offset));
  g.gain.setValueAtTime(Math.max(0.0002, gain), t0);
  g.gain.setValueAtTime(Math.max(0.0002, gain), t0 + Math.max(0, dur - 0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(g); g.connect(master);
  src.start(t0, spec.offset, dur + 0.02);
  return { end: t0 + dur, stop: () => fadeOut(g, src, t0) };
}

export function setAudioSource(kind) {
  source = kind === "pistes" ? "pistes" : "synthe";
  store("survivor.audio.source", source);
  if (source === "pistes") loadSamples();
}

export function getAudioSource() { return source; }

export function audioContext() { return ac; }
export function musicBus() { return musicG; }

export function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(1, v));
  store("survivor.audio.musicVol", musicVolume);
  applyMusicGain(0);
}

export function getMusicVolume() { return musicVolume; }

let duck = 1;

export function setMusicDuck(on) {
  const k = on ? AUDIO_CFG.MUSIC_DUCK : 1;
  if (k === duck) return;
  const monte = k > duck;
  duck = k;
  applyMusicGain(monte ? AUDIO_CFG.DUCK_UP : AUDIO_CFG.DUCK_DOWN);
}

export function getMusicDuck() { return duck; }

function applyMusicGain(dur) {
  if (!musicG) return;
  const cible = musicVolume * duck;
  if (!ac || dur <= 0) { musicG.gain.value = cible; return; }
  const now = ac.currentTime;
  musicG.gain.cancelScheduledValues(now);
  musicG.gain.setValueAtTime(musicG.gain.value, now);
  musicG.gain.linearRampToValueAtTime(cible, now + dur);
}

export function audioReady() { return ac !== null; }

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  store("survivor.audio.vol", volume);
  applyGain();
}

export function setMuted(m) {
  muted = !!m;
  store("survivor.audio.mute", muted ? 1 : 0);
  applyGain();
}

export function getVolume() { return volume; }
export function isMuted() { return muted; }

function applyGain() {
  if (!master) return;
  master.gain.value = muted ? 0 : volume * AUDIO_CFG.MASTER;
}

export function audioStats() {
  return { peak: limiter.peak, dropped: limiter.dropped, stolen: limiter.stolen,
           active: limiter.active };
}

export function resetAudioStats() {
  limiter.peak = 0; limiter.dropped = 0; limiter.stolen = 0;
}

function makeNoise(context) {
  const n = Math.floor(context.sampleRate * 1);
  const buf = context.createBuffer(1, n, context.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}


function tone({ freq, to = 0, dur, type = "sine", gain, delay = 0, attack = 0.004 }) {
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  return { end: t0 + dur, stop: () => fadeOut(g, osc, t0) };
}

function noise({ dur, type = "bandpass", freq, to = 0, q = 1, gain, delay = 0, attack = 0 }) {
  const t0 = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (to > 0) f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
  const g = ac.createGain();
  if (attack > 0) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
  } else {
    g.gain.setValueAtTime(Math.max(0.0002, gain), t0);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
  return { end: t0 + dur, stop: () => fadeOut(g, src, t0) };
}

function fadeOut(g, node, t0) {
  const now = ac.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + AUDIO_CFG.STEAL_FADE);
  try { node.stop(now + AUDIO_CFG.STEAL_FADE); } catch {  }
  void t0;
}


const PALETTE = {
  tir: () => (source === "pistes" && buffers.has("tir"))
    ? sample("tir", SOUND_GAIN.tir * SAMPLES.tir.gain)
    : tone({ freq: 900, to: 700, dur: 0.025, type: "square", gain: SOUND_GAIN.tir }),

  impact: () => noise({ dur: 0.04, freq: 2400, to: 1200, q: 1.2, gain: SOUND_GAIN.impact }),

  mort: (o) => noise({ dur: 0.12, type: "lowpass", freq: 1400 * (o.pitch ?? 1),
                       to: 200 * (o.pitch ?? 1), gain: SOUND_GAIN.mort }),

  bonus: (o) => {
    const a = tone({ freq: 620, dur: 0.09, gain: SOUND_GAIN.bonus * 0.8 });
    tone({ freq: 930, dur: 0.11, gain: SOUND_GAIN.bonus, delay: 0.07 });
    void o;
    return { end: a.end + 0.18, stop: a.stop };
  },

  // la jauge est COMMUNE : la montee de niveau est un evenement d'equipe, et le
  // fondamental grave est ce qui la fait sonner comme tel.
  niveau: () => {
    const a = tone({ freq: 523, dur: 0.10, type: "triangle", gain: SOUND_GAIN.niveau });
    tone({ freq: 659, dur: 0.10, type: "triangle", gain: SOUND_GAIN.niveau, delay: 0.09 });
    tone({ freq: 880, dur: 0.16, type: "triangle", gain: SOUND_GAIN.niveau, delay: 0.18 });
    tone({ freq: 131, dur: 0.46, type: "sine", gain: SOUND_GAIN.niveau * 0.55 });
    tone({ freq: 1760, dur: 0.34, type: "sine", gain: SOUND_GAIN.niveau * 0.22, delay: 0.20 });
    return { end: a.end + 0.34, stop: a.stop };
  },

  annonce: (o) => {
    const g = SOUND_GAIN.alerte * (o.level === 0 ? 1 : 0.7);
    const f = o.level === 0 ? 196 : 165;
    const a = tone({ freq: f, dur: 0.13, type: "sine", gain: g });
    tone({ freq: f * 1.5, dur: 0.16, type: "sine", gain: g, delay: 0.14 });
    return { end: a.end + 0.30, stop: a.stop };
  },

  evenement: (o) => {
    const f = o.haut ? 220 : 165;
    const a = tone({ freq: f, to: f * 1.5, dur: 0.5, type: "triangle",
                     gain: SOUND_GAIN.alerte * 0.55 });
    tone({ freq: f * 2, dur: 0.4, type: "sine",
           gain: SOUND_GAIN.alerte * 0.3, delay: 0.12 });
    noise({ dur: 0.5, type: "lowpass", freq: 700, to: 240,
            gain: SOUND_GAIN.mort * 0.45 });
    return { end: a.end + 0.2, stop: a.stop };
  },

  geyser: () => {
    const a = noise({ dur: 0.42, type: "bandpass", freq: 380, to: 1500,
                      gain: SOUND_GAIN.bonus * 0.5 });
    tone({ freq: 90, to: 210, dur: 0.34, type: "sine", gain: SOUND_GAIN.mort * 0.5 });
    return { end: a.end, stop: a.stop };
  },

  mur: () => {
    const a = noise({ dur: 0.20, type: "lowpass", freq: 1400, to: 300,
                      gain: SOUND_GAIN.mort * 0.9 });
    tone({ freq: 140, to: 70, dur: 0.14, type: "square", gain: SOUND_GAIN.mort * 0.45 });
    return { end: a.end, stop: a.stop };
  },

  // TROIS COUCHES, et c'est l'ampleur du grave qui dit combien elle a fauche :
  // un transitoire claquant (haut), un corps de bruit filtre (medium), un sub
  // qui balaie vers le bas. `force` vient du nombre de tues.
  explosion: (o) => {
    const k = Math.max(0.4, Math.min(1.6, o.force ?? 1));
    const gros = Math.max(0, Math.min(1, (k - 0.7) / 0.9));
    noise({ dur: 0.035, type: "highpass", freq: 3600, q: 0.7,
            gain: SOUND_GAIN.mort * 1.1 });
    const a = noise({ dur: 0.16 + 0.20 * gros, type: "lowpass",
                      freq: 1500 - 700 * gros, to: 110,
                      gain: SOUND_GAIN.mort * 1.4 * k });
    tone({ freq: 150 - 70 * gros, to: 34 - 12 * gros, dur: 0.14 + 0.16 * gros,
           type: "sine", gain: SOUND_GAIN.mort * (0.7 + 0.6 * gros) });
    if (gros > 0.35) {
      tone({ freq: 62, to: 30, dur: 0.42, type: "sine",
             gain: SOUND_GAIN.mort * 0.55 * gros, delay: 0.02 });
    }
    return { end: a.end + 0.2, stop: a.stop };
  },

  // L'ELECTRICITE N'EST PAS UN BOURDONNEMENT : c'est une serie de craquements
  // IRREGULIERS. Un intervalle constant donne une machine a coudre, et le carre
  // est ce qui la rend sale. `force` vient du nombre de cibles.
  foudre: (o) => {
    const k = Math.max(0.5, Math.min(1.4, o.force ?? 1));
    let d = 0;
    for (let i = 0; i < 4; i++) {
      noise({ dur: 0.022, type: "highpass", freq: 3000 + Math.random() * 3000,
              q: 0.8, gain: SOUND_GAIN.impact * 1.2 * k, delay: d });
      d += 0.03 + Math.random() * 0.06;
    }
    const a = tone({ freq: (180 + Math.random() * 80) * (2 - k), to: 120,
                     dur: 0.20, type: "square", gain: SOUND_GAIN.impact * 0.55 * k });
    tone({ freq: 58, dur: 0.26, type: "sine", gain: SOUND_GAIN.impact * 0.3 });
    return { end: a.end + d, stop: a.stop };
  },

  // le balayage : ce qui traverse l'arene se lit comme un souffle qui MONTE.
  balayage: () => {
    const a = noise({ dur: 0.5, type: "bandpass", freq: 260, to: 2400, q: 0.6,
                      gain: SOUND_GAIN.mort * 0.7, attack: 0.06 });
    tone({ freq: 70, to: 180, dur: 0.42, type: "sawtooth", gain: SOUND_GAIN.mort * 0.35 });
    return { end: a.end, stop: a.stop };
  },

  rempart: () => {
    const a = tone({ freq: 110, to: 78, dur: 0.22, type: "square",
                     gain: SOUND_GAIN.mort * 0.6 });
    tone({ freq: 330, to: 294, dur: 0.30, type: "triangle",
           gain: SOUND_GAIN.bonus * 0.35, delay: 0.03 });
    return { end: a.end + 0.1, stop: a.stop };
  },

  // LA COQUE SE FERME ET SE BRISE. Elle monte a la pose, elle CASSE a la
  // rupture : deux sens opposes, comme la bascule du salon — un bouclier qui
  // rendrait le meme son dans les deux sens ne dirait rien.
  bouclier: () => {
    const a = tone({ freq: 330, to: 494, dur: 0.16, type: "triangle",
                     gain: SOUND_GAIN.bonus * 0.45 });
    tone({ freq: 660, to: 988, dur: 0.12, type: "sine",
           gain: SOUND_GAIN.bonus * 0.20, delay: 0.02 });
    return { end: a.end + 0.05, stop: a.stop };
  },

  // le VERRE : un craquement large, court, sans corps tonal tenu — deux
  // fragments de bruit desaccordes, pas une note.
  bouclierBrise: () => {
    const a = noise({ dur: 0.09, type: "highpass", freq: 2600, to: 1400,
                      gain: SOUND_GAIN.mort * 0.8 });
    noise({ dur: 0.17, type: "bandpass", freq: 1800, to: 700, q: 0.8,
            gain: SOUND_GAIN.mort * 0.5, delay: 0.03 });
    tone({ freq: 494, to: 208, dur: 0.14, type: "triangle",
           gain: SOUND_GAIN.impact * 0.7 });
    return { end: a.end + 0.12, stop: a.stop };
  },

  provocation: () => {
    const a = tone({ freq: 260, to: 92, dur: 0.34, type: "sawtooth",
                     gain: SOUND_GAIN.mort * 0.55 });
    noise({ dur: 0.18, type: "lowpass", freq: 900, to: 200, gain: SOUND_GAIN.mort * 0.4 });
    return { end: a.end, stop: a.stop };
  },

  // le soin MONTE et ne resout pas : c'est un secours, pas une recompense.
  vagueSoin: () => {
    const a = tone({ freq: 392, to: 587, dur: 0.28, type: "triangle",
                     gain: SOUND_GAIN.bonus * 0.5 });
    tone({ freq: 784, dur: 0.22, type: "sine", gain: SOUND_GAIN.bonus * 0.22,
           delay: 0.07 });
    return { end: a.end + 0.1, stop: a.stop };
  },

  // [26d] le critique ne monte PAS le volume : il ajoute un transitoire aigu au
  // son de touche, et il lui prend sa place dans le limiteur (meme cle).
  critique: () => {
    const a = noise({ dur: 0.04, freq: 2400, to: 1200, q: 1.2, gain: SOUND_GAIN.impact });
    tone({ freq: 2960, to: 3520, dur: 0.055, type: "triangle",
           gain: SOUND_GAIN.impact * 0.85, attack: 0.002 });
    return { end: a.end + 0.02, stop: a.stop };
  },

  // [3] tension puis relachement : la hauteur monte avec la canalisation.
  recolte: (o) => {
    const k = Math.max(0, Math.min(1, o.k ?? 0));
    return tone({ freq: 330 * Math.pow(2, k), dur: 0.06, type: "triangle",
                  gain: SOUND_GAIN.bonus * (0.35 + 0.3 * k), attack: 0.005 });
  },

  recolteFin: () => {
    const a = tone({ freq: 523, dur: 0.16, type: "triangle", gain: SOUND_GAIN.bonus });
    tone({ freq: 784, dur: 0.20, type: "triangle", gain: SOUND_GAIN.bonus * 0.8, delay: 0.03 });
    tone({ freq: 1046, dur: 0.26, type: "sine", gain: SOUND_GAIN.bonus * 0.6, delay: 0.07 });
    return { end: a.end + 0.30, stop: a.stop };
  },

  // [21] le moment le plus tendu du jeu merite le plus gros budget.
  relevement: () => {
    const a = tone({ freq: 74, to: 148, dur: 0.5, type: "sine", gain: SOUND_GAIN.boss * 0.7 });
    tone({ freq: 392, to: 587, dur: 0.34, type: "triangle",
           gain: SOUND_GAIN.niveau * 0.8, delay: 0.06, attack: 0.02 });
    tone({ freq: 784, dur: 0.30, type: "sine", gain: SOUND_GAIN.niveau * 0.5, delay: 0.18 });
    noise({ dur: 0.4, type: "bandpass", freq: 300, to: 1800, q: 1.4,
            gain: SOUND_GAIN.mort * 0.4 });
    return { end: a.end + 0.2, stop: a.stop };
  },

  aterre: () => tone({ freq: 520, to: 120, dur: 0.42, type: "sawtooth",
                       gain: SOUND_GAIN.niveau * 0.7 }),

  releve: () => {
    const a = tone({ freq: 440, dur: 0.09, type: "triangle", gain: SOUND_GAIN.bonus });
    tone({ freq: 660, dur: 0.14, type: "triangle", gain: SOUND_GAIN.bonus, delay: 0.08 });
    return { end: a.end + 0.22, stop: a.stop };
  },

  barre: () => {
    const a = tone({ freq: 147, dur: 0.5, type: "sawtooth", gain: SOUND_GAIN.boss * 0.5 });
    tone({ freq: 220, dur: 0.5, type: "sawtooth", gain: SOUND_GAIN.boss * 0.35 });
    noise({ dur: 0.35, type: "lowpass", freq: 1600, to: 200, gain: SOUND_GAIN.boss * 0.4 });
    return { end: a.end, stop: a.stop };
  },

  survol: () => noise({ dur: 0.018, type: "bandpass", freq: 3400, to: 2200,
                        q: 6, gain: SOUND_GAIN.menu }),

  selection: () => {
    const a = tone({ freq: 740, to: 880, dur: 0.11, type: "sine",
                     gain: SOUND_GAIN.menu * 1.3, attack: 0.012 });
    tone({ freq: 1480, to: 1760, dur: 0.08, type: "sine",
           gain: SOUND_GAIN.menu * 0.32, attack: 0.012 });
    tone({ freq: 370, to: 440, dur: 0.13, type: "triangle",
           gain: SOUND_GAIN.menu * 0.4, attack: 0.016 });
    return { end: a.end + 0.05, stop: a.stop };
  },

  pret: () => {
    const a = tone({ freq: 587, dur: 0.10, type: "sine",
                     gain: SOUND_GAIN.menu * 1.3, attack: 0.012 });
    tone({ freq: 740, to: 784, dur: 0.16, type: "sine",
           gain: SOUND_GAIN.menu * 1.2, attack: 0.014, delay: 0.07 });
    tone({ freq: 294, dur: 0.14, type: "triangle",
           gain: SOUND_GAIN.menu * 0.42, attack: 0.018 });
    return { end: a.end + 0.20, stop: a.stop };
  },

  pretAnnule: () => {
    const a = tone({ freq: 740, dur: 0.08, type: "sine",
                     gain: SOUND_GAIN.menu * 0.9, attack: 0.012 });
    tone({ freq: 587, to: 554, dur: 0.12, type: "sine",
           gain: SOUND_GAIN.menu * 0.8, attack: 0.014, delay: 0.06 });
    return { end: a.end + 0.14, stop: a.stop };
  },

  lancer: () => {
    const a = tone({ freq: 392, dur: 0.12, type: "sine",
                     gain: SOUND_GAIN.menu * 1.2, attack: 0.012 });
    tone({ freq: 494, dur: 0.14, type: "sine",
           gain: SOUND_GAIN.menu * 1.1, attack: 0.012, delay: 0.06 });
    tone({ freq: 784, to: 830, dur: 0.26, type: "sine",
           gain: SOUND_GAIN.menu * 1.3, attack: 0.016, delay: 0.13 });
    tone({ freq: 196, dur: 0.30, type: "triangle",
           gain: SOUND_GAIN.menu * 0.5, attack: 0.020 });
    return { end: a.end + 0.32, stop: a.stop };
  },

  lancement: () => {
    const a = noise({ dur: 1.1, type: "lowpass", freq: 900, to: 60, attack: 0.12,
                      gain: SOUND_GAIN.boss * 0.5 });
    tone({ freq: 80, to: 44, dur: 0.9, type: "sine", gain: SOUND_GAIN.boss * 0.55 });
    tone({ freq: 120, to: 66, dur: 0.7, type: "triangle", gain: SOUND_GAIN.boss * 0.22 });
    return { end: a.end, stop: a.stop };
  },

  boss: () => {
    const a = tone({ freq: 98, to: 82, dur: 0.9, type: "sawtooth", gain: SOUND_GAIN.boss * 0.55 });
    tone({ freq: 147, dur: 0.9, type: "sine", gain: SOUND_GAIN.boss * 0.3 });
    return { end: a.end, stop: a.stop };
  },
};

export function playSound(name, opts = {}) {
  if (!ac || muted || volume <= 0) return false;
  const recipe = PALETTE[name];
  if (!recipe) return false;

  const now = ac.currentTime;
  const key = opts.key ?? (opts.level !== undefined ? `${name}:${opts.level}` : name);
  if (!limiter.admit(key, now)) return false;

  const v = recipe(opts);
  limiter.add(key, now, v.end, v.stop);
  return true;
}
