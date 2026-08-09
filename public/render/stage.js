/* ===========================================================================
   SCENE — canvas, contexte courant, camera, biome
   Ce qui est vrai de la surface de dessin avant qu'on y dessine quoi que ce
   soit. `ctx` est une VARIABLE : `drawWorld` la bascule du canvas du dessous a
   celui du dessus une seule fois, et les deux cents fonctions de dessin
   ignorent sur lequel elles ecrivent.
   
   La conversion souris -> monde vit ici et non dans la saisie : entre deux
   mouvements de souris, c'est la camera qui bouge.
   =========================================================================== */

import { createGL } from "/gl.js";
import { bombRange } from "/shared/classes.js";
import { BIOME_CFG, CFG, HZ_SLIP, HZ_SLOW, PLAYER_COLORS, buildBiome } from "/shared/game_state.js";
import { ENEMY, cssVars, decorAt } from "/shared/palette.js";
import { PX_PER_M } from "/shared/units.js";
import { reuploadAtlas } from "/sprites.js";
import { PERF, latest, lobby, myId, predicted } from "../core/state.js";
import { cv, cvGl, cvUnder } from "../ui/dom.js";

/* Les variables CSS viennent de `palette.js` et n'existent nulle part ailleurs :
   `tokens.css` ne contient aucune couleur, precisement pour qu'il n'y ait pas
   deux listes a tenir. Pose des le chargement du module, donc avant la premiere
   image et avant que le salon ne s'affiche. */
/* `decor` est LE decor courant, relu par le fond d'arene, la grille et le
   vignettage. Une variable et non une lecture de `DECOR[difficulty]` a chaque
   image : le mode ne change qu'entre deux manches, et trois fonctions de dessin
   qui refont l'indexation soixante fois par seconde finiraient par diverger le
   jour ou l'une d'elles lira la mauvaise source. */
export let decor = decorAt(1);
/* Declare ICI et non a cote de `drawVignette` : `applyPalette()` s'execute au
   chargement du module, donc avant la ligne ou vivait ce `let` — et un `let`
   lu avant sa declaration jette. Le degrade est mis en cache parce que le
   reconstruire soixante fois par seconde se voit au profileur. */
export let vignette = null;
/* --- BIOME (lot V) ---------------------------------------------------------
   `biome` est la geometrie REGENEREE, jamais recue : `buildBiome` est le meme
   module pur des deux cotes, appele avec les memes arguments. Une variable et
   non un appel par image, exactement comme `decor` — la geometrie ne change
   qu'entre deux manches, et une fonction de dessin qui la reconstruirait
   soixante fois par seconde jetterait 200 objets par seconde pour rien.

   `biomeSeed` et `biomeIndex` sont gardes a part : le salon les envoie AVANT
   que la difficulte ne soit connue de la manche, et les trois ensemble decident
   de ce qu'il y a au sol. */
export let biomeIndex = 0;
export let biomeSeed = 1;
let biome = buildBiome(0, 1, 1, CFG.ARENA_W, CFG.ARENA_H);
// Meteo courante, deduite de `(graine, segment)` comme le reste. `null` hors
// cauchemar et un segment sur trois.
export let weather = null;
export let weatherSeg = 0;
export function rebuildBiome(diffIndex = 1) {
  biome = buildBiome(biomeIndex, diffIndex, biomeSeed,
    CFG.ARENA_W, CFG.ARENA_H, CFG.VIEW_W, CFG.VIEW_H);
  weather = null;
  weatherSeg = 0;
  vignette = null;
}
export function applyPalette(diffIndex = 1) {
  decor = decorAt(diffIndex);
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(cssVars(diffIndex))) root.setProperty(k, v);
  // Le vignettage est un degrade MIS EN CACHE : sans cette remise a zero, le
  // mode change partout sauf la ou il se voit le plus.
  vignette = null;
}
applyPalette();
export const underCtx = cvUnder.getContext("2d");
export const overCtx = cv.getContext("2d");
export let ctx = underCtx;
/* Drapeau de bascule. Le chemin canvas 2D RESTE EN PLACE et fonctionnel :
   c'est la comparaison visuelle entre les deux rendus, c'est le repli en cas de
   perte de contexte, et c'est ce qui permet de livrer a mi-chemin sans rien
   casser. `localStorage.setItem("survivor.renderer", "canvas2d")` suffit a
   revenir en arriere, depuis la console, sans rechargement du serveur.

   `localStorage` dans un try : un navigateur en navigation privee stricte le
   refuse, et le jeu n'a aucune raison de ne pas demarrer pour un reglage. */
function rendererFlag() {
  try { return localStorage.getItem("survivor.renderer") ?? "webgl"; }
  catch { return "webgl"; }
}
/* Perte de contexte : bascule de GPU sur un portable, mise en veille,
   redemarrage de pilote. Le repli est immediat et gratuit — `drawSprite`
   retombe tout seul sur le chemin 2D des que `renderer.ok` est faux — et la
   restauration doit RETELEVERSER l'atlas, sinon le jeu revient en sprites
   blancs. */
export const gl = rendererFlag() === "webgl"
  ? createGL(cvGl, { onRestore: () => { reuploadAtlas(); resize(); } })
  : null;
/* --- densite de pixels native -----------------------------------------------
   Le canvas avait une memoire FIXE de 1600 x 900 que le CSS etirait. Sur un
   ecran 1440p ou 4K, tout etait donc agrandi : sprites flous, texte flou —
   c'est la meme cause racine que le HUD illisible, vue sous un autre angle, et
   aucun reglage de taille de police ne la corrigeait.

   Les coordonnees monde restent en 1600 x 900 : la transformation absorbe tout
   et pas une ligne de logique de rendu ne change. Le plafond a 2 est
   DELIBERE — au-dela, on quadruple le cout de remplissage pour un gain que
   personne ne voit. */
let renderScale = 1;
export function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  const w = Math.round(r.width * dpr);
  const h = Math.round(r.height * dpr);
  // Reaffecter `width` vide le canvas et remet la transformation a l'identite :
  // on ne le fait donc QUE si la taille a reellement change, sinon chaque
  // redimensionnement de fenetre effacerait l'image en cours.
  for (const c of [cv, cvUnder]) {
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }
  // Sur la VUE et non l'arene (lot I) : le canvas affiche un ecran de
  // 1600 x 900, l'arene fait trois fois ca dans chaque dimension et c'est la
  // camera qui choisit le morceau. Les coordonnees monde ne changent pas.
  renderScale = cv.width / CFG.VIEW_W;
  applyCamera();
  // Le viewport WebGL est en pixels PHYSIQUES, deja multiplies par la densite.
  // L'oublier donne le symptome classique du rendu tasse dans un coin.
  gl?.resize(w, h, CFG.VIEW_W, CFG.VIEW_H);
}
/* --- CAMERA (lot I) ----------------------------------------------------------
   Chaque client suit SA position predite — l'exploration est individuelle,
   chacun voit midi a sa porte. La camera vit dans les TRANSFORMS, jamais dans
   les fonctions de dessin : une translation posee ici sur les deux contextes
   2D, un offset dans la projection WebGL (gl.begin), et la conversion souris.
   Les deux cents fonctions de dessin continuent d'ecrire en coordonnees monde
   et ignorent qu'une camera existe — meme principe que la densite de pixels.

   Lissage exponentiel et non suivi rigide : chaque micro-correction de la
   prediction locale se repercuterait sur la camera en tremblement perceptible.
   Recalage SEC au-dela d'un ecran d'ecart (debut de manche, engagement de
   boss) : suivre en douceur une traversee de salle donnerait deux secondes de
   glissade aveugle au moment ou il faut voir ou l'on est. */
export const camera = { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2, x0: 0, y0: 0 };
const CAMERA_RATE = 8;
export function updateCamera(dt) {
  let t = predicted ?? latest?.players?.get(myId) ?? null;
  // Spectateur : on suit le premier vivant plutot qu'un coin de salle vide.
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
  // Sous `?perf` comme le compteur d'images : la mesure du lot I demande de
  // verifier depuis la console que la camera suit, sans outillage externe.
  if (PERF) { window.__cam = camera; window.__pred = predicted; }
}
// Les DEUX couches 2D partagent la meme transformation : elles doivent
// coincider au pixel pres, sinon les entites glissent contre leur sol.
function applyCamera() {
  const tx = -camera.x0 * renderScale, ty = -camera.y0 * renderScale;
  underCtx.setTransform(renderScale, 0, 0, renderScale, tx, ty);
  overCtx.setTransform(renderScale, 0, 0, renderScale, tx, ty);
}
/* Culling : un point est-il dans le rectangle de vue, a une marge pres ? La
   marge par defaut couvre le plus grand sprite, son halo et son recul — une
   entite qui apparait ou disparait au bord de l'ecran se voit, c'est le
   critere d'acceptation du lot. Dessiner les 220 ennemis d'une salle 9 fois
   plus grande que l'ecran, c'est payer 9 fois le monde pour une vue. */
const CULL_MARGIN = 90;
export function inView(x, y, m = CULL_MARGIN) {
  return x > camera.x0 - m && x < camera.x0 + CFG.VIEW_W + m
      && y > camera.y0 - m && y < camera.y0 + CFG.VIEW_H + m;
}
addEventListener("resize", resize);
resize();
/* La souris est memorisee en coordonnees VUE et convertie en monde a la
   lecture : entre deux mouvements de souris, c'est la CAMERA qui bouge, et un
   point monde fige aurait fait deriver la visee a chaque pas du personnage. */
const mouseView = { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2 };
export const mouse = { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2 };
export function updateMouse(e) {
  const r = cv.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  // Vers les coordonnees de VUE, pas vers la memoire du canvas : celle-ci
  // suit la densite de pixels de l'ecran, et viser aurait ete decale d'un
  // facteur deux en 4K.
  mouseView.x = (e.clientX - r.left) * (CFG.VIEW_W / r.width);
  mouseView.y = (e.clientY - r.top) * (CFG.VIEW_H / r.height);
}
// Point vise en coordonnees MONDE, a l'instant de la lecture.
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
/* Distance au reticule, bornee ICI avec la meme fonction que le serveur. Le
   client n'y gagne aucun droit — le serveur reborne de toute facon — mais son
   apercu (anneau de portee, cercle d'atterrissage) doit annoncer exactement le
   lancer qui va partir, sinon il ment sur le seul point que ce lot corrige. */
export function aimRange() {
  refreshMouseWorld();
  const from = predicted ?? { x: camera.x, y: camera.y };
  return bombRange(Math.hypot(mouse.x - from.x, mouse.y - from.y));
}
/* Etat du sol sous un point, cote client. Le JUMEAU EXACT de `_ground()` cote
   simulation, et il vaut mieux qu'il le reste : les deux repondent a la meme
   question sur la meme geometrie, et un desaccord se paierait en recalage
   permanent de la prediction. Le recopier plutot que de l'exporter serait le
   defaut ; il n'est ici que parce que `_ground` est une methode d'instance, donc
   inatteignable sans un GameState — ce que le client n'a pas. */
/* L'ARENE DE BOSS EST NUE — le JUMEAU EXACT des accesseurs `obstacles` et
   `hazards` de `game_state.js`, et il vaut mieux qu'il le reste : le serveur
   cesse de bloquer sur les piliers pendant un combat, et une prediction qui
   continuerait de s'y cogner ramenerait le personnage en arriere a chaque image.
   C'est le plus gros risque de recalage permanent du lot V, deja note la-bas.

   DEDUIT, jamais transmis. Le serveur eteint la geometrie des que `bossPending`
   est pose — donc avant que l'entite n'existe — et le client ne connait pas ce
   drapeau. Mais il connait les BOUNDS, et la constriction a une vue est
   exactement ce qui accompagne l'arrivee du boss : « boss present OU salle
   resserree » rend la meme reponse des deux cotes, sans une cle de plus. C'est
   la regle du depot appliquee telle quelle — avant d'ouvrir un champ, chercher
   si la valeur est une fonction de ce que le client a deja. */
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
    // Deux champs ne se cumulent jamais : on prend le meilleur. Meme regle que
    // les auras de givre et le Voeu partage.
    if (h.kind === HZ_SLOW) slow = Math.min(slow, BIOME_CFG.SLOW_MUL);
    else slip = true;
  }
  return { slow, slip };
}
export function colorOf(id) {
  const entry = lobby.find(l => l.id === id);
  return PLAYER_COLORS[entry ? entry.colorIndex % PLAYER_COLORS.length : 0];
}
// Comme colorOf, mais sans repli sur la couleur 0 : un drone dont le
// proprietaire a quitte le salon (ou un tuple d'ancienne version sans
// `owner`, replie a 0) doit garder une teinte neutre plutot que d'emprunter
// la couleur du premier joueur venu — colorOf ferait justement cette confusion.
export function ownerColorOf(id) {
  const entry = lobby.find(l => l.id === id);
  return entry ? PLAYER_COLORS[entry.colorIndex % PLAYER_COLORS.length] : null;
}
export function nameOf(id) {
  return lobby.find(l => l.id === id)?.name ?? "?";
}
/* LE SOL. L'arene est une MACHINE, les monstres sont ce qui s'y est introduit :
   le decor est froid, precis, instrumente — grille technique, filets fins,
   angles durs, palette desaturee — la ou les creatures sont chaudes,
   organiques, irregulieres. Ce contraste EST l'identite, et il n'est pas
   decoratif : les monstres sont les seuls elements organiques a l'ecran, donc
   ils se detachent instantanement. La direction artistique sert la lisibilite
   au lieu de la combattre.

   Grille a DEUX niveaux : un trait tous les 5 m, un trait marque tous les
   20 m. Elle donne une echelle lisible et rend les distances en metres des
   descriptions de cartes immediatement comprehensibles — sans elle, « rayon
   6 m » ne veut rien dire a l'ecran. */
export const GRID_FINE = 5 * PX_PER_M;     // 100 px
export const GRID_MAJOR = 20 * PX_PER_M;   // 400 px
export const ELITE_GOLD = ENEMY.elite;

/* Setters. Une liaison de module ES est VIVANTE en lecture — l'importateur
   voit toujours la valeur courante — mais elle est en lecture seule. Ecrire
   depuis un autre module demande donc de passer par ici, et par rien d'autre.
   C'est ce qui rend l'ecriture de cet etat cherchable en un grep. */
export function setBiomeIndex(v) { biomeIndex = v; }
export function setBiomeSeed(v) { biomeSeed = v; }
export function setCtx(v) { ctx = v; }
export function setVignette(v) { vignette = v; }
export function setWeather(v) { weather = v; }
export function setWeatherSeg(v) { weatherSeg = v; }
