
import { createGL } from "/gl.js";
import { bombRange } from "/shared/classes.js";
import { BIOME_CFG, CFG, HZ_SLIP, HZ_SLOW, PLAYER_COLORS, biomeAt, buildBiome } from "/shared/game_state.js";
import { ENEMY, cssVars, decorAt, teinter } from "/shared/palette.js";
import { PX_PER_M } from "/shared/units.js";
import { reuploadAtlas } from "/sprites.js";
import { PERF, latest, lobby, myId, predicted } from "../core/state.js";
import { cv, cvGl, cvUnder } from "../ui/dom.js";

export let decor = decorAt(1);
export let vignette = null;
export let biomeIndex = 0;
export let biomeSeed = 1;
let biome = buildBiome(0, 1, 1, CFG.ARENA_W, CFG.ARENA_H);
export let weather = null;
export let weatherSeg = 0;
const PART_BIOME = 0.75;
const PART_BIOME_GRILLE = 0.8;

export let sol = { arena: "#0b0e14", gridFine: "#151b26", gridMajor: "#232c3d" };

function refreshSol() {
  const b = biomeAt(biomeIndex);
  sol = {
    arena: teinter(decor.arena, b.tint, PART_BIOME),
    gridFine: teinter(decor.gridFine, b.grid, PART_BIOME_GRILLE),
    gridMajor: decor.gridMajor,
  };
  vignette = null;
}

export function rebuildBiome(diffIndex = 1) {
  biome = buildBiome(biomeIndex, diffIndex, biomeSeed,
    CFG.ARENA_W, CFG.ARENA_H, CFG.VIEW_W, CFG.VIEW_H);
  weather = null;
  weatherSeg = 0;
  vignette = null;
  refreshSol();
}
export function applyPalette(diffIndex = 1) {
  decor = decorAt(diffIndex);
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(cssVars(diffIndex))) root.setProperty(k, v);
  vignette = null;
  refreshSol();
}
applyPalette();
export const underCtx = cvUnder.getContext("2d");
export const overCtx = cv.getContext("2d");
export let ctx = underCtx;
function rendererFlag() {
  try { return localStorage.getItem("survivor.renderer") ?? "webgl"; }
  catch { return "webgl"; }
}
export const gl = rendererFlag() === "webgl"
  ? createGL(cvGl, { onRestore: () => { reuploadAtlas(); resize(); } })
  : null;
export let renderScale = 1;
export function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  const w = Math.round(r.width * dpr);
  const h = Math.round(r.height * dpr);
  for (const c of [cv, cvUnder]) {
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }
  renderScale = cv.width / CFG.VIEW_W;
  applyCamera();
  gl?.resize(w, h, CFG.VIEW_W, CFG.VIEW_H);
}
export const camera = { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2, x0: 0, y0: 0 };
const CAMERA_RATE = 8;
export function updateCamera(dt) {
  let t = predicted ?? latest?.players?.get(myId) ?? null;
  if (!t && latest) { for (const p of latest.players.values()) { t = p; break; } }
  const tx = t ? t.x : camera.x, ty = t ? t.y : camera.y;
  if (Math.abs(tx - camera.x) > CFG.VIEW_W || Math.abs(ty - camera.y) > CFG.VIEW_H) {
    camera.x = tx; camera.y = ty;
  } else {
    const pull = 1 - Math.exp(-CAMERA_RATE * dt);
    camera.x += (tx - camera.x) * pull;
    camera.y += (ty - camera.y) * pull;
  }
  camera.x = Math.min(Math.max(camera.x, CFG.VIEW_W / 2), CFG.ARENA_W - CFG.VIEW_W / 2);
  camera.y = Math.min(Math.max(camera.y, CFG.VIEW_H / 2), CFG.ARENA_H - CFG.VIEW_H / 2);
  camera.x0 = camera.x - CFG.VIEW_W / 2;
  camera.y0 = camera.y - CFG.VIEW_H / 2;
  applyCamera();
  if (PERF) { window.__cam = camera; window.__pred = predicted; }
}
function applyCamera() {
  const tx = -camera.x0 * renderScale, ty = -camera.y0 * renderScale;
  underCtx.setTransform(renderScale, 0, 0, renderScale, tx, ty);
  overCtx.setTransform(renderScale, 0, 0, renderScale, tx, ty);
}
const CULL_MARGIN = 90;
export function inView(x, y, m = CULL_MARGIN) {
  return x > camera.x0 - m && x < camera.x0 + CFG.VIEW_W + m
      && y > camera.y0 - m && y < camera.y0 + CFG.VIEW_H + m;
}
addEventListener("resize", resize);
resize();
const mouseView = { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2 };
export const mouse = { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2 };
export function updateMouse(e) {
  const r = cv.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  mouseView.x = (e.clientX - r.left) * (CFG.VIEW_W / r.width);
  mouseView.y = (e.clientY - r.top) * (CFG.VIEW_H / r.height);
}
function refreshMouseWorld() {
  mouse.x = mouseView.x + camera.x0;
  mouse.y = mouseView.y + camera.y0;
}
export function aimVector() {
  refreshMouseWorld();
  const from = predicted ?? { x: camera.x, y: camera.y };
  const dx = mouse.x - from.x, dy = mouse.y - from.y;
  const d = Math.hypot(dx, dy);
  return d > 0.001 ? { ax: dx / d, ay: dy / d } : { ax: 0, ay: 0 };
}
export function aimRange() {
  refreshMouseWorld();
  const from = predicted ?? { x: camera.x, y: camera.y };
  return bombRange(Math.hypot(mouse.x - from.x, mouse.y - from.y));
}
const VIDE = Object.freeze([]);
function biomeNu() {
  if (latest?.boss) return true;
  const b = latest?.bounds;
  return !!b && (b.x1 - b.x0) < CFG.ARENA_W - 1;
}
export function obstaclesActifs() { return biomeNu() ? VIDE : biome.obstacles; }
export function hazardsActifs() { return biomeNu() ? VIDE : biome.hazards; }
export function groundAt(x, y) {
  let slow = 1, slip = false;
  for (const h of hazardsActifs()) {
    if (h.kind !== HZ_SLOW && h.kind !== HZ_SLIP) continue;
    if ((x - h.x) ** 2 + (y - h.y) ** 2 > h.r * h.r) continue;
    if (h.kind === HZ_SLOW) slow = Math.min(slow, BIOME_CFG.SLOW_MUL);
    else slip = true;
  }
  return { slow, slip };
}
export function colorOf(id) {
  const entry = lobby.find(l => l.id === id);
  return PLAYER_COLORS[entry ? entry.colorIndex % PLAYER_COLORS.length : 0];
}
export function ownerColorOf(id) {
  const entry = lobby.find(l => l.id === id);
  return entry ? PLAYER_COLORS[entry.colorIndex % PLAYER_COLORS.length] : null;
}
export function nameOf(id) {
  return lobby.find(l => l.id === id)?.name ?? "?";
}
export const GRID_FINE = 5 * PX_PER_M;
export const GRID_MAJOR = 20 * PX_PER_M;
export const ELITE_GOLD = ENEMY.elite;

export function setBiomeIndex(v) { biomeIndex = v; refreshSol(); }
export function setBiomeSeed(v) { biomeSeed = v; }
export function setCtx(v) { ctx = v; }
export function setVignette(v) { vignette = v; }
export function setWeather(v) { weather = v; }
export function setWeatherSeg(v) { weatherSeg = v; }
