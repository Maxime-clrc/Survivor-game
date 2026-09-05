import { createGL } from "/gl.js";

import { BIOME_CFG, CFG, HZ_SLIP, HZ_SLOW, PLAYER_COLORS, WX_BRUME, biomeAt, buildBiome } from "/shared/game_state.js";
import { CADRE_SKIN, ENEMY, biomeSkin, cssVars, decorAt, solDeBiome } from "/shared/palette.js";
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
let modeCourant = 1;

export let sol = solDeBiome(1, "usine");

function refreshSol() {
  sol = solDeBiome(modeCourant, biomeAt(biomeIndex).key);
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
  modeCourant = diffIndex;
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(cssVars(diffIndex))) root.setProperty(k, v);
  vignette = null;
  refreshSol();
}
applyPalette();
// `#cvUnder` REPEINT TOUJOURS SON FOND, donc il n a aucun pixel translucide a
// porter : `alpha: false` retire le canal et le melange de composition. Le
// `scale(1.015)` de `#arena` recouvre le pixel d arrondi eventuel du bord.
export const underCtx = cvUnder.getContext("2d", { alpha: false });
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
  gl?.resize(w, h, renderScale);
}
export const camera = { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2, x0: 0, y0: 0 };
const CAMERA_RATE = 8;
function clampCam(v, vue, arene) {
  return Math.min(Math.max(v, vue / 2), arene - vue / 2);
}
export function updateCamera(dt) {
  let t = predicted ?? latest?.players?.get(myId) ?? null;
  if (!t && latest) { for (const p of latest.players.values()) { t = p; break; } }
  // on ecrete la CIBLE, pas la camera : ecreter apres le lissage arrete la
  // camera net au bord, et cette discontinuite de vitesse se lit comme un zoom.
  const tx = clampCam(t ? t.x : camera.x, CFG.VIEW_W, CFG.ARENA_W);
  const ty = clampCam(t ? t.y : camera.y, CFG.VIEW_H, CFG.ARENA_H);
  if (Math.abs(tx - camera.x) > CFG.VIEW_W || Math.abs(ty - camera.y) > CFG.VIEW_H) {
    camera.x = tx; camera.y = ty;
  } else {
    const pull = 1 - Math.exp(-CAMERA_RATE * dt);
    camera.x += (tx - camera.x) * pull;
    camera.y += (ty - camera.y) * pull;
  }
  camera.x0 = camera.x - CFG.VIEW_W / 2;
  camera.y0 = camera.y - CFG.VIEW_H / 2;
  applyCamera();
  if (PERF) { window.__cam = camera; window.__pred = predicted; }
}
/* UNE SOURIS EMET JUSQU A MILLE FOIS PAR SECONDE, ET LA BOITE NE BOUGE QU UNE
   FOIS PAR IMAGE. `getBoundingClientRect` force un calcul de mise en page, et il
   etait appele a CHAQUE `mousemove` : sur une souris de jeu, mille vidages de
   layout par seconde. La boite est retenue et jetee la ou elle peut changer —
   `applyCamera()` (une fois par image, et `#arena` porte le tressaillement), le
   redimensionnement et le defilement. Le resultat est au pixel identique.
   ELLE EST DECLAREE ICI ET NON PRES DE SON LECTEUR : `resize()` tourne au
   chargement du module et appelle `applyCamera()`, donc un `let` pose plus bas
   serait lu dans sa zone morte.
*/
let rectCv = null;
function applyCamera() {
  rectCv = null;
  const tx = -camera.x0 * renderScale, ty = -camera.y0 * renderScale;
  underCtx.setTransform(renderScale, 0, 0, renderScale, tx, ty);
  overCtx.setTransform(renderScale, 0, 0, renderScale, tx, ty);
}
const CULL_MARGIN = 90;
export function inView(x, y, m = CULL_MARGIN) {
  return x > camera.x0 - m && x < camera.x0 + CFG.VIEW_W + m
      && y > camera.y0 - m && y < camera.y0 + CFG.VIEW_H + m;
}

// LA BRUME EST UN CHAMP DE VISION, PAS UNE TEINTE : elle retire de
// l'information. Le disque est centre sur LE JOUEUR et non sur la vue — c'est
// sa vision qui se retrecit, et la camera s'ecrete aux bords de l'arene alors
// que lui non. Decroissance en carre : on garde longtemps une silhouette, puis
// elle s'efface d'un coup.
//
// Ce que ca masque : la HORDE. Jamais un telegraphe, jamais une zone, jamais un
// marqueur, jamais le boss, jamais un allie — une annonce qu'on ne voit pas
// n'est pas difficile, elle est injuste. C'est la seule regle de l'effet.
export function voileBrume(x, y) {
  if (!weather || weather.id !== WX_BRUME) return 1;
  const p = predicted ?? latest?.players?.get(myId);
  const cx = p ? p.x : camera.x, cy = p ? p.y : camera.y;
  const d = Math.hypot(x - cx, y - cy);
  if (d <= BIOME_CFG.FOG_CLEAR) return 1;
  if (d >= BIOME_CFG.FOG_BLIND) return 0;
  const k = (BIOME_CFG.FOG_BLIND - d) / (BIOME_CFG.FOG_BLIND - BIOME_CFG.FOG_CLEAR);
  return k * k;
}
addEventListener("resize", resize);
resize();
const mouseView = { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2 };
export const mouse = { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2 };
function rectDeCv() {
  if (!rectCv) rectCv = cv.getBoundingClientRect();
  return rectCv;
}
export function updateMouse(e) {
  const r = rectDeCv();
  if (r.width === 0 || r.height === 0) return;
  mouseView.x = (e.clientX - r.left) * (CFG.VIEW_W / r.width);
  mouseView.y = (e.clientY - r.top) * (CFG.VIEW_H / r.height);
}
addEventListener("scroll", () => { rectCv = null; }, { passive: true });
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
/* LA DISTANCE BRUTE, et le serveur decide. Elle etait clampee ici par
   `bombRange` : le lance-grenades, qui porte deux fois plus loin que la bombe,
   ne pouvait pas recevoir sa propre allonge. */
export function aimRange() {
  refreshMouseWorld();
  const from = predicted ?? { x: camera.x, y: camera.y };
  return Math.hypot(mouse.x - from.x, mouse.y - from.y);
}
const VIDE = Object.freeze([]);
function biomeNu() {
  if (latest?.boss) return true;
  const b = latest?.bounds;
  return !!b && (b.x1 - b.x0) < CFG.ARENA_W - 1;
}
export function obstaclesActifs() { return biomeNu() ? VIDE : biome.obstacles; }
export function hazardsActifs() { return biomeNu() ? VIDE : biome.hazards; }
/* LA GEOMETRIE DE LA MANCHE, celle qui ne bouge pas de l'arrivee du boss a sa
   mort. Ce qui est PLACE UNE FOIS pour la manche la lit — l'amer, le semis —
   parce que la placer sur la liste videe la fait BOUGER : l'amer sautait dans
   93 % des cas, jusqu'a 2 596 px, et des props apparaissaient dans l'empreinte
   des blocs des que la camera bougeait. Ce qui se DESSINE par image lit les
   listes actives : pendant un boss il n'y a ni bloc ni danger a montrer. */
export function obstaclesDuLieu() { return biome.obstacles; }
export function hazardsDuLieu() { return biome.hazards; }
/* LE QUARTIER D UN POINT DU MONDE, celui-la meme qui a decide la loi
   d implantation des blocs. Le semis avait le SIEN — un hachage sur une maille
   de 600 px —, donc le bati et ce qui traine autour tiraient deux decoupages
   independants a deux echelles differentes. Il ne circule pas sur le reseau :
   `buildBiome` est deterministe, les deux cotes le rejouent sur la graine. */
export function quartierMonde(x, y) {
  const d = biome.districts;
  if (!d) return 0;
  const c = biome.districtCols, r = biome.districtRows;
  const cx = Math.min(c - 1, Math.max(0, Math.floor(x / (CFG.ARENA_W / c))));
  const cy = Math.min(r - 1, Math.max(0, Math.floor(y / (CFG.ARENA_H / r))));
  return d[cy * c + cx];
}
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
/* Le cadre voyage avec le salon : la plaque n'ouvre aucune clef d'instantane.
   En manche il ne rend que TEINTE et PALIER — le fond, l'ornement et l'insigne
   restent aux menus : rien de decoratif ne se superpose au jeu, et le sol porte
   les telegraphes. */
export function cadreOf(id) {
  const c = lobby.find(l => l.id === id)?.cadre;
  return c ? (CADRE_SKIN[c] ?? null) : null;
}
/* UNE SEULE DIRECTION DE LUMIERE PAR BIOME, et elle vit ICI — la couche la plus
   basse qui la connaisse, sous `fx.js` qui en a besoin pour les ombres de
   contact et sous `decor.js` pour les ombres portees. Deux ombres qui pointent
   differemment sur le meme ecran, c'est le defaut le plus visible d'un rendu 2D.
   Le relief RADIAL de `drawObstacles` reste : c'est la CAMERA, pas la lumiere,
   et les deux coexistent — c'est ce que fait la 2D haut de gamme. */
export function biomeKey() { return biomeAt(biomeIndex).key; }
export function lumDir() {
  return biomeSkin(biomeAt(biomeIndex).key).dir;
}

// LA CHARTE DU LIEU COURANT. Un seul point de lecture cote rendu : forme,
// matiere et lumiere d'un biome sortent toutes d'ici.
export function skin() {
  return biomeSkin(biomeAt(biomeIndex).key);
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
