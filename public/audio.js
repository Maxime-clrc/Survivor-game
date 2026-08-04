/* ===========================================================================
   AUDIO
   Synthese WebAudio, AUCUN fichier : c'est la seule facon de garder le zero
   dependance et le zero build du depot. Chaque son est un oscillateur (ou du
   bruit) et une enveloppe, une dizaine de lignes chacun.

   Ce module ne touche ni au DOM ni au reseau — il ne connait que le contexte
   audio et un nom de son. C'est ce qui permet de l'importer tel quel dans un
   script de mesure avec un faux AudioContext, comme on importe game_state.js
   pour mesurer l'equilibrage.
   =========================================================================== */

export const AUDIO_CFG = {
  // Un MEME son ne se rejoue pas avant 40 ms. A 200 ennemis et une cadence a
  // 0,05 s il y a cinquante declenchements dans la meme image : sans ce
  // garde-fou c'est un mur de bruit, et le contexte sature avant meme d'etre
  // desagreable.
  SAME_COOLDOWN: 0.04,
  // Seize voix simultanees. Au-dela, les PLUS ANCIENNES sont coupees : une
  // voix qui commence porte l'information, une voix qui finit ne porte plus
  // que sa queue de reverberation.
  MAX_VOICES: 16,
  // Coupure d'urgence d'une voix volee : 25 ms de fondu, sinon le clic de
  // troncature s'entend plus que le son lui-meme.
  STEAL_FADE: 0.025,
  MASTER: 0.55,
};

/* Hierarchie de volume. Les annonces de mecanique et l'alerte de boss passent
   DEVANT tout, les impacts sont un fond discret. Sans cette echelle,
   l'information qui decide du combat se noie dans le tapis des impacts — et
   c'est exactement l'inverse de ce qu'on cherche. */
export const SOUND_GAIN = {
  alerte: 1.0,
  boss: 0.9,
  niveau: 0.8,
  bonus: 0.6,
  mort: 0.4,
  impact: 0.25,
  tir: 0.15,
};

/* ---------------------------------------------------------------------------
   Limitation de voix
   Sortie dans sa propre classe pour etre mesurable sans contexte audio : la
   campagne de mesure du lot lui envoie cinquante declenchements dans la meme
   image et verifie le plafond, ce qu'on ne peut pas faire en ecoutant.
   --------------------------------------------------------------------------- */
export class VoiceLimiter {
  constructor(cfg = AUDIO_CFG) {
    this.cfg = cfg;
    this.voices = [];          // { key, endsAt, stop }
    this.lastAt = new Map();   // nom du son -> horodatage du dernier depart
    this.peak = 0;             // pic de voix simultanees, pour la mesure
    this.dropped = 0;          // refus par recharge
    this.stolen = 0;           // voix coupees par le plafond
  }

  /* Retourne false si le son est refuse — l'appelant n'a alors rien construit,
     ce qui est tout l'interet : on ne paie pas la creation de l'oscillateur. */
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
    // On purge d'abord les voix eteintes : sans ca le plafond se remplirait de
    // sons deja termines et couperait des voix qui, elles, jouent encore.
    this.voices = this.voices.filter(v => v.endsAt > now);
    while (this.voices.length >= this.cfg.MAX_VOICES) {
      const old = this.voices.shift();
      this.stolen++;
      try { old.stop(); } catch { /* voix deja libree par le navigateur */ }
    }
    this.voices.push({ key, endsAt, stop });
    if (this.voices.length > this.peak) this.peak = this.voices.length;
  }

  get active() { return this.voices.length; }
}

/* ---------------------------------------------------------------------------
   Contexte
   --------------------------------------------------------------------------- */

let ac = null;
let master = null;
let musicG = null;
let noiseBuf = null;
const limiter = new VoiceLimiter();

// Reglages, memorises comme le pseudo. La coupure est un booleen separe du
// volume : couper puis retablir doit rendre le volume qu'on avait choisi, pas
// zero.
let volume = readNumber("survivor.audio.vol", 0.7);
let muted = readNumber("survivor.audio.mute", 0) === 1;
/* Volume de la MUSIQUE, separe des sons de jeu : la bande son est un fond
   qu'on regle — ou qu'on coupe — sans toucher aux signaux qui decident du
   combat. Il s'applique sur un bus dedie SOUS le master : la coupure et le
   volume globaux emportent donc aussi la musique, jamais l'inverse. */
let musicVolume = readNumber("survivor.audio.musicVol", 0.5);

function readNumber(key, fallback) {
  if (typeof localStorage === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function store(key, value) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(key, String(value)); } catch { /* mode prive */ }
}

/* Les navigateurs exigent un geste utilisateur : le clic « Rejoindre » est
   deja au bon endroit. Appele une seconde fois, `initAudio` se contente de
   reprendre un contexte suspendu — c'est le cas apres un changement d'onglet. */
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
    musicG.gain.value = musicVolume;
    musicG.connect(master);
    noiseBuf = makeNoise(ac);
  }
  if (ac.state === "suspended" && ac.resume) ac.resume();
  return true;
}

/* Acces du module de musique, et de lui seul : le contexte et le bus dedie.
   `music.js` construit ses propres oscillateurs mais ne possede ni contexte ni
   sortie — deux contextes audio se disputeraient le materiel, et un bus hors
   du master echapperait a la coupure. */
export function audioContext() { return ac; }
export function musicBus() { return musicG; }

export function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(1, v));
  store("survivor.audio.musicVol", musicVolume);
  if (musicG) musicG.gain.value = musicVolume;
}

export function getMusicVolume() { return musicVolume; }

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

// Compteurs de la campagne de mesure. Ils ne servent a rien en jeu et ne
// coutent qu'un increment : c'est le prix d'une mesure qu'on peut refaire.
export function audioStats() {
  return { peak: limiter.peak, dropped: limiter.dropped, stolen: limiter.stolen,
           active: limiter.active };
}

export function resetAudioStats() {
  limiter.peak = 0; limiter.dropped = 0; limiter.stolen = 0;
}

/* Une seconde de bruit blanc, construite UNE fois. Regenerer 44 100 flottants
   a chaque impact coutait plus cher que tout le reste du son reuni. */
function makeNoise(context) {
  const n = Math.floor(context.sampleRate * 1);
  const buf = context.createBuffer(1, n, context.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/* ---------------------------------------------------------------------------
   Briques
   --------------------------------------------------------------------------- */

// Un oscillateur, une enveloppe, une eventuelle glissade de hauteur.
function tone({ freq, to = 0, dur, type = "sine", gain, delay = 0 }) {
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  // Attaque de 4 ms : a zero on entend le clic de discontinuite, au-dela de
  // 10 ms un tir de 25 ms n'a plus de percussion du tout.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  return { end: t0 + dur, stop: () => fadeOut(g, osc, t0) };
}

// Du bruit blanc passe dans un filtre. Le filtre EST le timbre : passe-bande
// aigu pour un impact sec, passe-bas pour un souffle d'explosion.
function noise({ dur, type = "bandpass", freq, to = 0, q = 1, gain, delay = 0 }) {
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
  g.gain.setValueAtTime(Math.max(0.0002, gain), t0);
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
  try { node.stop(now + AUDIO_CFG.STEAL_FADE); } catch { /* deja arrete */ }
  void t0;
}

/* ---------------------------------------------------------------------------
   Palette
   Chaque recette rend { end, stop } : la premiere valeur sert au plafond de
   voix, la seconde a la coupure des plus anciennes.
   --------------------------------------------------------------------------- */

const PALETTE = {
  // Impulsion carree tres courte. C'est le son le plus frequent du jeu, donc
  // le plus bas de la hierarchie : on doit le sentir sans jamais l'ecouter.
  tir: () => tone({ freq: 900, to: 700, dur: 0.025, type: "square", gain: SOUND_GAIN.tir }),

  // Bruit filtre de 40 ms : la confirmation d'impact. Sans elle, tirer dans la
  // foule ne donne aucun retour et on ne sait pas si on touche.
  impact: () => noise({ dur: 0.04, freq: 2400, to: 1200, q: 1.2, gain: SOUND_GAIN.impact }),

  // Bruit descendant. La hauteur varie selon le type d'ennemi : c'est gratuit
  // et ca suffit a distinguer une piétaille d'un gros a l'oreille.
  mort: (o) => noise({ dur: 0.12, type: "lowpass", freq: 1400 * (o.pitch ?? 1),
                       to: 200 * (o.pitch ?? 1), gain: SOUND_GAIN.mort }),

  // Deux sinus montants : le seul son franchement agreable du jeu, et c'est
  // voulu — c'est la recompense.
  bonus: (o) => {
    const a = tone({ freq: 620, dur: 0.09, gain: SOUND_GAIN.bonus * 0.8 });
    tone({ freq: 930, dur: 0.11, gain: SOUND_GAIN.bonus, delay: 0.07 });
    void o;
    return { end: a.end + 0.18, stop: a.stop };
  },

  // Arpege de trois notes.
  niveau: () => {
    const a = tone({ freq: 523, dur: 0.10, type: "triangle", gain: SOUND_GAIN.niveau });
    tone({ freq: 659, dur: 0.10, type: "triangle", gain: SOUND_GAIN.niveau, delay: 0.09 });
    tone({ freq: 880, dur: 0.16, type: "triangle", gain: SOUND_GAIN.niveau, delay: 0.18 });
    return { end: a.end + 0.34, stop: a.stop };
  },

  // Sinus grave a deux temps. Il passe devant tout le reste : c'est la
  // condition pour que l'Oracle soit comprehensible a la premiere rencontre.
  annonce: (o) => {
    const g = SOUND_GAIN.alerte * (o.level === 0 ? 1 : 0.7);
    const f = o.level === 0 ? 196 : 165;
    const a = tone({ freq: f, dur: 0.13, type: "sine", gain: g });
    tone({ freq: f * 1.5, dur: 0.16, type: "sine", gain: g, delay: 0.14 });
    return { end: a.end + 0.30, stop: a.stop };
  },

  // Souffle passe-bas de 300 ms, plus un coup grave : c'est ce qui donne le
  // poids d'une detonation de zone.
  explosion: (o) => {
    const k = Math.max(0.4, Math.min(1.4, o.force ?? 1));
    const a = noise({ dur: 0.30, type: "lowpass", freq: 900 * k, to: 90,
                      gain: SOUND_GAIN.mort * 1.5 * k });
    tone({ freq: 110 * k, to: 45, dur: 0.22, type: "sine", gain: SOUND_GAIN.mort * k });
    return { end: a.end, stop: a.stop };
  },

  // Glissando descendant : on doit comprendre sans regarder le HUD qu'un
  // coequipier vient de tomber, parce que c'est le moment ou il faut arreter
  // ce qu'on fait pour aller le relever.
  aterre: () => tone({ freq: 520, to: 120, dur: 0.42, type: "sawtooth",
                       gain: SOUND_GAIN.niveau * 0.7 }),

  // Arpege court montant, symetrique du precedent.
  releve: () => {
    const a = tone({ freq: 440, dur: 0.09, type: "triangle", gain: SOUND_GAIN.bonus });
    tone({ freq: 660, dur: 0.14, type: "triangle", gain: SOUND_GAIN.bonus, delay: 0.08 });
    return { end: a.end + 0.22, stop: a.stop };
  },

  // Accord grave + bruit : la barre de boss qui rompt est l'evenement le plus
  // important d'un combat, il a droit au son le plus large.
  barre: () => {
    const a = tone({ freq: 147, dur: 0.5, type: "sawtooth", gain: SOUND_GAIN.boss * 0.5 });
    tone({ freq: 220, dur: 0.5, type: "sawtooth", gain: SOUND_GAIN.boss * 0.35 });
    noise({ dur: 0.35, type: "lowpass", freq: 1600, to: 200, gain: SOUND_GAIN.boss * 0.4 });
    return { end: a.end, stop: a.stop };
  },

  // Entree de boss : meme accord, une octave plus bas et plus long.
  boss: () => {
    const a = tone({ freq: 98, to: 82, dur: 0.9, type: "sawtooth", gain: SOUND_GAIN.boss * 0.55 });
    tone({ freq: 147, dur: 0.9, type: "sine", gain: SOUND_GAIN.boss * 0.3 });
    return { end: a.end, stop: a.stop };
  },
};

/* Point d'entree unique. Tout passe par la : la recharge par nom, le plafond
   de voix et la hierarchie de volume sont ainsi appliques une seule fois, pour
   la meme raison que `_hurt()` cote simulation. */
export function playSound(name, opts = {}) {
  if (!ac || muted || volume <= 0) return false;
  const recipe = PALETTE[name];
  if (!recipe) return false;

  const now = ac.currentTime;
  // La cle de recharge inclut la variante : deux annonces de niveaux
  // differents ne sont pas le meme son et n'ont pas a s'evincer.
  const key = opts.key ?? (opts.level !== undefined ? `${name}:${opts.level}` : name);
  if (!limiter.admit(key, now)) return false;

  const v = recipe(opts);
  limiter.add(key, now, v.end, v.stop);
  return true;
}
