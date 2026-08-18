
import { audioContext, getAudioSource, musicBus } from "./audio.js";
import { setTrackFallback, setTrackScene, startTracks, stopTracks } from "./tracks.js";

export const MUSIC_CFG = {
  BPM: 122,
  LOOKAHEAD: 1.2,
  TICK_MS: 100,
  GAIN: 0.11,

  BARS: 16,
  BREAK_BARS: 2,
  STEPS_PER_BAR: 16,

  RAMP_UP: 0.35,
  RAMP_DOWN: 0.10,
};

const STEPS = MUSIC_CFG.BARS * MUSIC_CFG.STEPS_PER_BAR;

const ROOT = [110.00, 87.31, 65.41, 98.00];
const ROOT_DARK = [110.00, 98.00, 87.31, 82.41];
const THIRD = [1.189, 1.26, 1.26, 1.26];
const THIRD_DARK = [1.189, 1.26, 1.26, 1.189];

let target = 0.05;
let level = 0.05;
let running = false;
let timer = null;
let step = 0;
let nextAt = 0;
let lastTick = 0;
let scheduled = 0;

const stepDur = () => 60 / MUSIC_CFG.BPM / 4;

export function setMusicIntensity(v) {
  if (Number.isFinite(v)) target = Math.max(0, Math.min(1, v));
}

export function getMusicIntensity() { return level; }

export function musicStats() { return { running, level, target, scheduled, step }; }


let scene = "horde";
let started = false;

let tracksBroken = false;
setTrackFallback(() => {
  tracksBroken = true;
  if (started) startSynth();
});

export function startMusic() {
  started = true;
  route();
  return true;
}

export function stopMusic() {
  started = false;
  stopSynth();
  stopTracks();
}

export function setMusicScene(name) {
  const s = name === "boss" || name === "final" || name === "menu" ? name : "horde";
  if (s === scene) return;
  scene = s;
  if (started) route();
}

export function refreshMusicSource() {
  if (started) route();
  else { stopSynth(); stopTracks(); }
}

function route() {
  const pistes = getAudioSource() === "pistes" && !tracksBroken;
  if (!pistes || scene === "menu") {
    stopTracks();
    startSynth();
    return;
  }
  stopSynth();
  if (!startTracks(scene)) setTrackScene(scene);
}

function startSynth() {
  const ac = audioContext();
  if (!ac || running) return running;
  running = true;
  step = 0;
  nextAt = ac.currentTime + 0.1;
  lastTick = ac.currentTime;
  timer = setInterval(tick, MUSIC_CFG.TICK_MS);
  return true;
}

function stopSynth() {
  if (!running) return;
  running = false;
  clearInterval(timer);
  timer = null;
}

function tick() {
  const ac = audioContext();
  if (!ac || !running) return;

  const dt = Math.max(0, ac.currentTime - lastTick);
  lastTick = ac.currentTime;
  const rate = target > level ? MUSIC_CFG.RAMP_UP : MUSIC_CFG.RAMP_DOWN;
  const d = target - level;
  level += Math.sign(d) * Math.min(Math.abs(d), rate * dt);

  while (nextAt < ac.currentTime + MUSIC_CFG.LOOKAHEAD) {
    scheduleStep(step, nextAt);
    step = (step + 1) % STEPS;
    nextAt += stepDur();
  }
}


function scheduleStep(s, t) {
  const bar = Math.floor(s / MUSIC_CFG.STEPS_PER_BAR);
  const inBar = s % MUSIC_CFG.STEPS_PER_BAR;
  const i = level;
  const dark = i > 0.7;
  const roots = dark ? ROOT_DARK : ROOT;
  const thirds = dark ? THIRD_DARK : THIRD;
  const chord = bar % 4;
  const root = roots[chord];
  const third = thirds[chord];

  const inBreak = bar >= MUSIC_CFG.BARS - MUSIC_CFG.BREAK_BARS;
  const lastBar = bar === MUSIC_CFG.BARS - 1;

  if (inBar === 0) {
    const cutoff = 420 + i * 900;
    padVoice(root * 2, t, stepDur() * 16, cutoff);
    padVoice(root * 2 * third, t, stepDur() * 16, cutoff);
  }

  const acidOn = inBreak ? inBar % 2 === 0
    : i < 0.30 ? inBar % 4 === 0
    : i < 0.70 ? inBar % 2 === 0
    : true;
  if (acidOn) {
    const motif = [1, third, 1.5, 2][(Math.floor(inBar / 2) + bar) % 4];
    const cutoff = (inBreak ? 220 : 260) + i * 2600
      + Math.sin(s * 1.7) * 380 * i;
    acid(root * 4 * motif, t, Math.max(150, cutoff), 4 + i * 9,
      MUSIC_CFG.GAIN * (0.16 + i * 0.22) * (inBreak ? 0.7 : 1));
  }

  if (inBreak) {
    if (lastBar && inBar === 0 && i > 0.40) {
      riser(root * 2, t, stepDur() * 16, i);
    }
    scheduled++;
    return;
  }

  const kickOn = i < 0.15 ? false
    : i < 0.35 ? (inBar === 0 || inBar === 8)
    : inBar % 4 === 0;
  if (kickOn) kick(t, 0.45 + i * 0.55);

  const bassOn = i < 0.10 ? false
    : i < 0.60 ? inBar % 4 === 2
    : (inBar % 4 === 2 || inBar % 8 === 7);
  if (bassOn) bass(root, t, stepDur() * 1.6, 0.5 + i * 0.5);

  if (i >= 0.35 && inBar % 4 === 2) hat(t, false, 0.4 + i * 0.6);
  if (i >= 0.55 && inBar % 8 === 6) hat(t, true, 0.5 + i * 0.5);
  if (i >= 0.85 && inBar % 2 === 1) hat(t, false, 0.22);

  if (i >= 0.75 && (inBar === 6 || inBar === 14)) {
    stab([root * 4, root * 4 * third, root * 6], t, i);
  }

  scheduled++;
}


function env(g, t, attack, dur, peak) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function voice(t, dur) {
  const ac = audioContext();
  const g = ac.createGain();
  g.connect(musicBus());
  return { ac, g, kill: node => { node.start(t); node.stop(t + dur + 0.05); } };
}

function padVoice(freq, t, dur, cutoff) {
  const { ac, g, kill } = voice(t, dur);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cutoff;
  f.connect(g);
  for (const detune of [-7, 7]) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    if (o.detune) o.detune.value = detune;
    o.connect(f);
    kill(o);
  }
  env(g, t, dur * 0.25, dur, MUSIC_CFG.GAIN * 0.28);
}

function kick(t, punch) {
  const { ac, g, kill } = voice(t, 0.18);
  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
  o.connect(g);
  env(g, t, 0.003, 0.18, MUSIC_CFG.GAIN * 0.95 * punch);
  kill(o);
}

function bass(freq, t, dur, k) {
  const { ac, g, kill } = voice(t, dur);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 340;
  f.connect(g);
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq;
  o.connect(f);
  env(g, t, 0.008, dur, MUSIC_CFG.GAIN * 0.7 * k);
  kill(o);
}

function hat(t, open, k) {
  const dur = open ? 0.09 : 0.025;
  const { ac, g, kill } = voice(t, dur);
  const o = ac.createOscillator();
  o.type = "square";
  o.frequency.value = open ? 5400 : 6800;
  o.connect(g);
  env(g, t, 0.002, dur, MUSIC_CFG.GAIN * 0.15 * k);
  kill(o);
}

function acid(freq, t, cutoff, q, peak) {
  const { ac, g, kill } = voice(t, 0.14);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(cutoff, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff * 0.45), t + 0.12);
  f.Q.value = q;
  f.connect(g);
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq;
  o.connect(f);
  env(g, t, 0.004, 0.14, peak);
  kill(o);
}

function stab(freqs, t, i) {
  const { ac, g, kill } = voice(t, 0.22);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900 + i * 1400;
  f.connect(g);
  for (const freq of freqs) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.connect(f);
    kill(o);
  }
  env(g, t, 0.005, 0.22, MUSIC_CFG.GAIN * 0.30);
}

function riser(freq, t, dur, i) {
  const { ac, g, kill } = voice(t, dur);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(300 + i * 3200, t + dur);
  f.connect(g);
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 2, t + dur);
  o.connect(f);
  env(g, t, dur * 0.5, dur, MUSIC_CFG.GAIN * 0.30 * i);
  kill(o);
}
