
import { audioContext, musicBus } from "./audio.js";

export const TRACK_CFG = {
  GAIN: 0.42,
  FADE: 2.0,
  WATCH_MS: 500,
  READY_MS: 8000,
};

const BASE = "/assets/musics";

const TRACKS = {
  horde: [
    "waves/Chrome Grid.mp3",
    "waves/Neon Run Protocol.mp3",
    "waves/Chrome Overdrive.mp3",
    "waves/Iron Choir March.mp3",
  ],
  boss: [
    "boss/Couronne de Nuée.mp3",
  ],
};

function urlOf(rel) {
  return `${BASE}/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

let decks = null;
let cur = -1;
let scene = "";
let rot = 0;
let running = false;
let watch = 0;
let fading = 0;

export function tracksStats() {
  return { running, scene, cur, rot, playing: decks?.[cur]?.el?.src ?? "" };
}

function ready() {
  return typeof Audio !== "undefined" && audioContext() !== null;
}

function build() {
  if (decks || !ready()) return decks;
  const ac = audioContext();
  decks = [0, 1].map(() => {
    const el = new Audio();
    el.crossOrigin = "anonymous";
    el.preload = "none";
    const gain = ac.createGain();
    gain.gain.value = 0;
    ac.createMediaElementSource(el).connect(gain);
    gain.connect(musicBus());
    return { el, gain };
  });
  return decks;
}

function ramp(param, from, to, at, dur) {
  const n = 24;
  const curve = new Float32Array(n);
  const up = to > from;
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const k = up ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2);
    curve[i] = from + (to - from) * (up ? k : 1 - k);
  }
  param.cancelScheduledValues(at);
  try { param.setValueCurveAtTime(curve, at, dur); }
  catch { param.value = to; }
}

let seq = 0;

let onFail = null;
export function setTrackFallback(fn) { onFail = fn; }

function fail() {
  if (!onFail) { stopTracks(); return; }
  const fn = onFail;
  onFail = null;
  stopTracks();
  fn();
}

function crossTo(rel, loop) {
  if (!ready()) return;
  build();
  const next = (cur + 1) % 2;
  const from = cur >= 0 ? decks[cur] : null;
  const to = decks[next];
  const mine = ++seq;

  to.el.preload = "auto";
  to.el.loop = !!loop;
  to.el.src = urlOf(rel);

  let armed = false;
  const go = () => {
    if (armed || mine !== seq || !running) return;
    armed = true;
    clearTimeout(guard);
    const ac = audioContext();
    if (!ac) return;
    const t = ac.currentTime;

    const p = to.el.play();
    if (p && p.catch) p.catch(() => {  });

    ramp(to.gain.gain, 0, TRACK_CFG.GAIN, t, TRACK_CFG.FADE);
    if (from) {
      ramp(from.gain.gain, from.gain.gain.value, 0, t, TRACK_CFG.FADE);
      setTimeout(() => {
        if (running && decks && decks[cur] === from) return;
        try { from.el.pause(); } catch {  }
      }, (TRACK_CFG.FADE + 0.1) * 1000);
    }
    cur = next;
    fading = t + TRACK_CFG.FADE;
  };

  const guard = setTimeout(go, TRACK_CFG.READY_MS);
  if (to.el.readyState >= 3) go();
  else {
    to.el.addEventListener("canplay", go, { once: true });
    to.el.addEventListener("error", () => {
      if (mine !== seq || armed) return;
      clearTimeout(guard);
      fail();
    }, { once: true });
  }
}

function nextHorde() {
  const list = TRACKS.horde;
  const rel = list[rot % list.length];
  rot = (rot + 1) % list.length;
  return rel;
}

export function setTrackScene(name) {
  const s = name === "boss" ? "boss" : "horde";
  if (s === scene) return;
  scene = s;
  if (!running) return;
  crossTo(s === "boss" ? TRACKS.boss[0] : nextHorde(), s === "boss");
}

export function startTracks(name) {
  if (running || !ready()) return false;
  running = true;
  scene = name === "boss" ? "boss" : "horde";
  crossTo(scene === "boss" ? TRACKS.boss[0] : nextHorde(), scene === "boss");
  watch = setInterval(tick, TRACK_CFG.WATCH_MS);
  return true;
}

export function stopTracks() {
  if (!running) return;
  running = false;
  clearInterval(watch);
  watch = 0;
  if (!decks) return;
  const ac = audioContext();
  const t = ac ? ac.currentTime : 0;
  for (const d of decks) {
    if (ac) ramp(d.gain.gain, d.gain.gain.value, 0, t, TRACK_CFG.FADE * 0.5);
    const el = d.el;
    setTimeout(() => { try { el.pause(); } catch {  } },
               TRACK_CFG.FADE * 500 + 100);
  }
  cur = -1;
  scene = "";
}

function tick() {
  if (!running || !decks || cur < 0) return;
  const ac = audioContext();
  if (!ac || ac.currentTime < fading) return;
  const el = decks[cur].el;

  if (el.paused) {
    const p = el.play();
    if (p && p.catch) p.catch(() => {  });
    return;
  }

  if (el.loop) return;
  const d = el.duration;
  if (!Number.isFinite(d) || d <= 0) return;
  if (d - el.currentTime <= TRACK_CFG.FADE) crossTo(nextHorde(), false);
}
