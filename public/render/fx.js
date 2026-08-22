
import { playSound } from "/audio.js";
import { EventPump } from "/events.js";
import { hudDamage } from "/hud.js";
import { SRC_ICON } from "/icons.js";
import { CFG, hazardState } from "/shared/game_state.js";
import { t } from "/shared/i18n.js";
import { CLASS_COLOR, COMBAT, FX, POWERUP_COLOR, SIGNAL, SURFACE, alpha } from "/shared/palette.js";
import { eventAt, eventNom, segmentName } from "/shared/timeline.js";
import { SPRITE_CELL, drawSprite, frameOf, glActive } from "/sprites.js";
import { latest, myId } from "../core/state.js";
import { ENEMY_TINT, alertInfo, setAlertInfo } from "../net/interp.js";
import { ELITE_GOLD, GRID_FINE, camera, ctx, hazardsActifs, inView, ownerColorOf } from "./stage.js";


const PARTICLE_2D = 300;
export const PARTICLE_GL = 3000;
export let PARTICLE_MAX = PARTICLE_2D;
export const HIT_FLASH = 0.06;
export const HIT_KICK = 5;
const SHAKE_MAX = 10;
export const particles = [];
export const hits = new Map();
export const shake = { x: 0, y: 0, mag: 0 };

// [6] LE HITSTOP N'EXISTE QUE POUR LES BARRES DE BOSS. Dans un survivor la
// fluidite du deplacement EST le jeu : on gele l'horloge de RENDU, pas la
// simulation, et on rattrape le retard a mi-vitesse pour ne pas payer le gel en
// latence permanente.
export const timeWarp = { stop: 0, held: 0, count: 0 };
export function addHitstop(s) {
  if (timeWarp.stop <= 0) timeWarp.count++;
  timeWarp.stop = Math.max(timeWarp.stop, s);
}
function stepTimeWarp(dt) {
  if (timeWarp.stop > 0) {
    timeWarp.stop -= dt;
    timeWarp.held += dt;
  } else if (timeWarp.held > 0) {
    timeWarp.held = Math.max(0, timeWarp.held - dt * 0.5);
  }
}
export const pump = new EventPump(handleEvent, {
  get myId() { return myId; },
  get hazards() { return hazardsActifs(); },
  // le rectangle REELLEMENT affiche : `events.js` s'en sert pour ne pas lire
  // une entite filtree par le serveur comme une entite morte.
  get vue() {
    return { x0: camera.x0, y0: camera.y0,
             x1: camera.x0 + CFG.VIEW_W, y1: camera.y0 + CFG.VIEW_H };
  },
  hazardState,
});
function addShake(mag) {
  shake.mag = Math.min(SHAKE_MAX, Math.max(shake.mag, mag));
}
// UN KIND ABSENT DE CETTE TABLE EST MUET. Deux exceptions volontaires : `2`
// (niveau) et `6` (rupture de barre) sonnent par leur evenement NOMME, les
// doubler les ferait sonner deux fois ; `4` est un fourre-tout (balise,
// purification, Sentence, relevement) — un son unique pour tous mentirait, et
// ce qui compte y a deja le sien.
const EFFECT_SOUND = {
  0:  { son: "explosion", force: 0.7, shake: 4 },
  1:  { son: "balayage", force: 0.9, shake: 3 },
  // l'arc PREND la place d'une touche dans le limiteur (meme cle) : une build
  // de ricochet en produit plusieurs par seconde, le nombre de voix ne bouge pas.
  // `claim` est ce qui rend le mot vrai — sans lui l'arc se faisait REFUSER par
  // la touche qui venait de passer, et on ne voyait plus que le trace.
  3:  { son: "foudre", force: 1, shake: 0, key: "impact", claim: true },
  5:  { son: "mort", pitch: 0.55, shake: 0 },
  7:  { son: "explosion", force: 1.0, shake: 6 },
  8:  { son: "explosion", force: 0.6, shake: 4 },
  9:  { son: "rempart", force: 0.8, shake: 0 },
  10: { son: "provocation", force: 0.9, shake: 0 },
  11: { son: "vagueSoin", force: 0.7, shake: 0 },
  12: { son: "explosion", force: 1.35, shake: 9 },
  13: { son: "impact", pitch: 1.4, force: 0.5, shake: 0 },
  14: { son: "impact", pitch: 0.55, force: 0.45, shake: 0 },
  15: { son: "impact", pitch: 0.9, force: 0.7, shake: 0 },
  // palier 3 · budget de MOMENT DE MANCHE : un ultime sort ~4 fois par manche.
  16: { son: "lancement", force: 0.9, shake: 3 },
  // la LAME, 2,5 balayages par seconde : palier 2, donc la hauteur porte la
  // difference et le tressaillement reste a zero — un tir ordinaire ne secoue
  // pas l'ecran, quelle que soit l'arme.
  17: { son: "balayage", pitch: 2.1, gain: 0.55, force: 0.5, shake: 0 },
};

// les quatre souffles, et LEUR MATIERE. `n` est le nombre de tues : il met a
// l'echelle la duree, la taille et la gravite du son.
const BLAST_STYLE = {
  0:  { coeur: COMBAT.blastCore, feu: FX.novaSoft, bord: FX.nova, debris: FX.nova },
  7:  { coeur: COMBAT.blastCore, feu: FX.blastEdge, bord: FX.blastFill, debris: FX.blastFill },
  8:  { coeur: COMBAT.blastCore, feu: FX.wave, bord: FX.waveSoft, debris: FX.waveSoft },
  12: { coeur: COMBAT.blastCore, feu: FX.bombEdge, bord: FX.bombFill, debris: FX.bombFill },
};

function handleEvent(e) {
  switch (e.t) {
    case "tir":
      playSound("tir");
      break;

    case "impact":
      // [26d] le critique PREND la place de la touche dans le limiteur : le
      // nombre de voix par seconde ne bouge pas d'un cran.
      if (e.crits > 0) playSound("critique", { key: "impact" });
      else playSound("impact");
      if (e.boss) bossHit.at = performance.now();
      else { registerHit(e); aggregateDamage(e); }
      break;

    case "blesse":
      aggregateSelf("hurt", e);
      break;

    case "soigne":
      aggregateSelf("heal", e);
      break;

    case "danger":
      break;

    case "murDetruit":
      playSound("mur");
      break;

    case "mort": {
      const base = e.elite ? 0.6 : 1.3 - Math.min(0.6, e.type * 0.12);
      playSound("mort", { pitch: base * chainPitch() });
      spawnDeath(e.x, e.y, e.type, e.elite, e.ang ?? 0, e.crit, e.owner);
      spawnXpStream(e.x, e.y);
      if (e.dmg > 0) aggregateDamage(e);
      break;
    }

    case "bonus": playSound("bonus"); break;

    case "recolte": playSound("recolte", { k: e.k }); break;
    case "recolteFin": playSound("recolteFin"); break;

    case "niveau":
      playSound("niveau");
      addPulse(SIGNAL.gain, 0.9);
      break;

    case "segment": {
      const now = performance.now();
      setAlertInfo({ nom: segmentName(e.segment).toUpperCase(),
                    texte: t("ui.alert.segment", "la horde reprend"),
                    from: now, until: now + 2500 });
      break;
    }

    case "evenementFin": {
      const now = performance.now();
      const def = eventAt(e.event);
      setAlertInfo({ nom: (def ? eventNom(e.event)
                      : t("ui.alert.event", "ÉVÉNEMENT")).toUpperCase(),
                    texte: t("ui.alert.eventFin", "terminé — équipe remise à plein"),
                    from: now, until: now + 2500 });
      playSound("releve");
      break;
    }
    case "aterre": playSound("aterre"); break;

    // LE BOUCLIER EST UNE COQUE, ET UNE COQUE SE BRISE. Trois budgets distincts :
    // la touche est l'eclair d'une image, la pose un fait notable, la rupture le
    // moment ou le joueur perd son tampon. Aucun tressaillement : ce n'est pas
    // une detonation, et le tressaillement est reserve aux gros evenements.
    case "bouclierPose":
      playSound("bouclier");
      spawnShieldOn(e.x, e.y);
      break;

    case "bouclierBrise":
      playSound("bouclierBrise");
      spawnShieldBreak(e.x, e.y);
      break;

    case "bouclierTouche":
      shieldHit.set(e.id, performance.now());
      break;

    // [21] le relevement d'un allie : flash, grave, et l'invulnerabilite se voit.
    case "releve":
      playSound("relevement");
      addPulse(SIGNAL.ally, 0.7);
      spawnRevive(e.x, e.y, ownerColorOf(e.id) ?? SIGNAL.ally);
      break;

    case "explosion": {
      const k = Math.max(0.35, Math.min(1.4, e.r / 150));
      playSound("explosion", { force: k });
      addShake(3 + k * 5);
      addGridPing(e.x, e.y, e.r);
      break;
    }

    case "barre":
      playSound("barre");
      addShake(SHAKE_MAX);
      addHitstop(0.10);
      addPulse(SIGNAL.warn, 0.5);
      addGridPing(lastBossPos.x, lastBossPos.y, 260);
      break;

    case "boss":
      playSound("boss");
      break;

    case "degats":
      pushDamage(e.x, e.y, e.dmg, e.crit);
      // [29] l'etincelle nait la ou la balle a touche, dans l'axe du tir, et
      // reutilise les eclats du critique : aucun asset de plus.
      spawnCritShards(e.x, e.y, e.x - lastBossPos.x, e.y - lastBossPos.y);
      bossHit.at = performance.now();
      break;

    // le palier ne ment pas : la touche existe, elle ne compte pas. Etincelle
    // renvoyee vers l'EXTERIEUR, son mat, aucun chiffre.
    case "ricochet": {
      const dx = e.x - (e.cx ?? e.x), dy = e.y - (e.cy ?? e.y);
      const a0 = Math.atan2(dy, dx) || Math.random() * Math.PI * 2;
      for (let i = 0; i < 2 && particles.length < PARTICLE_MAX; i++) {
        const a = a0 + (i - 0.5) * 0.9 + (Math.random() - 0.5) * 0.5;
        const sp = 130 + Math.random() * 110;
        particles.push({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.18, max: 0.18, col: COMBAT.flash, size: 2.6,
          frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 5,
        });
      }
      playSound("impact", { pitch: 0.5, force: 0.35 });
      break;
    }

    case "effet": {
      const d = EFFECT_SOUND[e.kind];
      const S = BLAST_STYLE[e.kind];
      if (S) {
        // [8] l'intensite MET TOUT A L'ECHELLE : trente tues et trois ne
        // produisent plus la meme image ni le meme son.
        const ampleur = Math.min(1, (e.n ?? 0) / 12);
        spawnBlast(e.x, e.y, e.r || 90, ampleur, S);
        playSound("explosion", { force: (d?.force ?? 1) * (0.75 + 0.75 * ampleur) });
        addShake((d?.shake ?? 4) * (0.7 + 0.6 * ampleur));
        addGridPing(e.x, e.y, Math.max(70, e.r || 0));
        break;
      }
      if (e.kind === 11) spawnHealWave(e.x, e.y, e.r);
      else if (e.kind === 9) spawnBulwark(e.x, e.y, e.r);
      if (!d) break;
      playSound(d.son, d);
      if (d.shake) {
        addShake(d.shake);
        addGridPing(e.x, e.y, Math.max(70, e.r || 0));
      }
      break;
    }
  }
}

// [1] LE RETOUR N'EST PAS SUR LA MORT, IL EST SUR LA CADENCE DES MORTS. Chaque
// tue dans la fenetre monte d'un demi-ton, plafonne a l'octave ; la chaine
// cassee redescend au sol. La hauteur est gratuite : aucune voix de plus.
const CHAIN_WINDOW = 0.4;
const CHAIN_MAX = 12;
const chain = { at: 0, n: 0 };
function chainPitch() {
  const now = performance.now() / 1000;
  chain.n = now - chain.at < CHAIN_WINDOW ? Math.min(CHAIN_MAX, chain.n + 1) : 0;
  chain.at = now;
  return Math.pow(2, chain.n / 12);
}
function registerHit(e) {
  let dx = 0, dy = 0;
  if (latest) {
    let best = Infinity;
    for (const p of latest.players.values()) {
      const d = (p.x - e.x) ** 2 + (p.y - e.y) ** 2;
      if (d < best) { best = d; dx = e.x - p.x; dy = e.y - p.y; }
    }
    const n = Math.hypot(dx, dy) || 1;
    dx /= n; dy /= n;
  }

  const now = performance.now();
  const n = Math.max(1, Math.min(HIT_BURST_MAX, e.hits ?? 1));
  const span = 1000 / CFG.SNAPSHOT_HZ;
  const step = Math.max(HIT_FLASH * 1000, span / n);
  // la teinte de l'allie qui tire : on voit ce que font les autres sans quitter
  // son propre ecran. Elle est un attribut de sommet, donc gratuite.
  const col = e.owner && e.owner !== myId ? ownerColorOf(e.owner) : null;
  let restants = e.crits ?? 0;
  for (let i = 0; i < n; i++) {
    const crit = restants-- > 0;
    if (i === 0) applyHit(e.id, e.x, e.y, dx, dy, crit, col);
    else hitQueue.push({ at: now + i * step, id: e.id, x: e.x, y: e.y, dx, dy, crit, col });
  }
}
const HIT_BURST_MAX = 4;
export const hitQueue = [];
const CRIT_FLASH = 0.17;
function applyHit(id, x, y, dx, dy, crit = false, col = null) {
  const now = performance.now();
  hits.set(id, {
    until: now + (crit ? CRIT_FLASH : HIT_FLASH) * 1000,
    dx, dy, col: crit ? SIGNAL.warn : col,
    // [26c] le coup de zoom porte la reponse sur LA CIBLE et non sur la camera :
    // dans une foule de 400 corps, c'est le seul endroit ou elle se lit.
    punch: crit ? now + CRIT_PUNCH * 1000 : 0,
  });

  for (let i = 0; i < 2 && particles.length < PARTICLE_MAX; i++) {
    const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.6;
    const sp = 90 + Math.random() * 70;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.14, max: 0.14, col: COMBAT.flash, size: 2,
      ang: a, long: 3.4,
    });
  }
  if (crit) spawnCritShards(x, y, dx, dy);
}
export const CRIT_PUNCH = 0.07;
// [26e] des ECLATS, pas un disque : la forme doit dire « perforation ». Le
// noyau chaud qui les accompagne est ce qui rend le critique lisible dans une
// foule : les eclats partent, le point reste une image de plus.
export function spawnCritShards(x, y, dx, dy) {
  const a0 = Math.atan2(dy, dx);
  const n = glActive() ? 5 : 3;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = a0 + (i - (n - 1) / 2) * 0.30 + (Math.random() - 0.5) * 0.16;
    const sp = 260 + Math.random() * 220;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.26, max: 0.26, col: SIGNAL.warn, size: 3.6,
      frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 6,
    });
  }
  if (particles.length < PARTICLE_MAX) {
    particles.push({
      x, y, vx: 0, vy: 0, life: 0.13, max: 0.13,
      col: SIGNAL.warn, size: 11, frame: fxGlow,
    });
  }
}
function flushHitQueue(now) {
  for (let i = hitQueue.length - 1; i >= 0; i--) {
    if (hitQueue[i].at > now) continue;
    const h = hitQueue[i];
    hitQueue.splice(i, 1);
    applyHit(h.id, h.x, h.y, h.dx, h.dy, h.crit, h.col);
  }
}
export const deaths = [];
const DEATH_MAX = 30;
const DEATH_MS = 260;
export function drawDeaths() {
  if (deaths.length === 0) return;
  const now = performance.now();
  for (let i = deaths.length - 1; i >= 0; i--) {
    const d = deaths[i];
    const k = (now - d.at) / DEATH_MS;
    if (k >= 1) { deaths[i] = deaths[deaths.length - 1]; deaths.pop(); continue; }
    if (!inView(d.x, d.y)) continue;
    const step = k < 0.33 ? 0 : (k < 0.66 ? 1 : 2);
    drawSprite(ctx, frameOf(`e${d.type}_die${step}`), d.x, d.y, {
      angle: d.ang,
      scaleX: d.gain * (1 + k * 0.18),
      scaleY: d.gain * (1 - k * 0.25),
      alpha: 1 - k * 0.5,
    });
  }
}
const DEATH_BURST = [
  { n: 1.00, size: 2.5, sp: 60, spread: 130, life: 0.40, flash: 1.0, cone: 7 },
  { n: 0.75, size: 2.0, sp: 150, spread: 190, life: 0.30, flash: 0.8, cone: 1.1 },
  { n: 0.50, size: 5.2, sp: 35, spread: 70, life: 0.65, flash: 1.35, cone: 7 },
  { n: 0.85, size: 2.6, sp: 45, spread: 95, life: 0.45, flash: 0.9, cone: 7 },
  { n: 1.70, size: 1.8, sp: 95, spread: 175, life: 0.35, flash: 0.85, cone: 7 },
  { n: 1.60, size: 2.2, sp: 190, spread: 240, life: 0.26, flash: 1.8, cone: 7 },
  { n: 0.55, size: 4.6, sp: 50, spread: 85, life: 0.60, flash: 1.25, cone: 7 },
  { n: 0.85, size: 2.0, sp: 80, spread: 130, life: 0.42, flash: 0.8, cone: 7 },
  { n: 1.35, size: 2.4, sp: 45, spread: 95, life: 0.60, flash: 1.15, cone: 7 },
];
function spawnDeath(x, y, type, elite, ang = 0, crit = false, owner = 0) {
  if (deaths.length < DEATH_MAX) {
    deaths.push({
      x, y, type, at: performance.now(),
      ang: Math.random() * Math.PI * 2,
      gain: elite ? CFG.ELITE_RADIUS_MUL : 1,
    });
  }
  if (particles.length >= PARTICLE_MAX) return;
  const col = ENEMY_TINT[type] ?? ENEMY_TINT[0];
  const dense = glActive();
  const D = DEATH_BURST[type] ?? DEATH_BURST[0];
  const gros = crit ? 1.6 : 1;
  const n = Math.round((elite ? (dense ? 22 : 10) : (dense ? 14 : 7)) * D.n * gros);
  const grow = elite ? 1.4 : 1;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = D.cone >= 7 ? Math.random() * Math.PI * 2
                          : ang + (Math.random() - 0.5) * D.cone;
    const sp = (D.sp + Math.random() * D.spread) * gros;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: D.life, max: D.life, col, size: D.size * grow,
      frame: fxShard, ang: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 14 * (2.5 / D.size),
    });
  }
  if (particles.length < PARTICLE_MAX) {
    particles.push({
      x, y, vx: 0, vy: 0, life: 0.12, max: 0.12,
      col: crit ? SIGNAL.warn : (owner && owner !== myId ? ownerColorOf(owner) ?? COMBAT.flash
                                                        : COMBAT.flash),
      size: (elite ? 20 : 13) * D.flash * gros, frame: fxGlow,
    });
  }
  // [26f] le critique qui TUE monte d'un palier : il emprunte un fragment de
  // l'onde de choc du souffle.
  if (crit && bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 8, max: 62, life: 0.26, t: 0.26, col: SIGNAL.warn, w: 2.4 });
  }
  if (elite && bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 20, max: 74, life: 0.35, t: 0.35, col: ELITE_GOLD });
  }
}

// [4] LE FLUX D'XP. Aucune entite, aucun ramassage, aucun changement de jeu :
// l'experience reste instantanee. Un filet part du cadavre vers le joueur, et
// c'est la premiere fois que le partage d'equipe se voit.
const XP_LIFE = 0.55;
function spawnXpStream(x, y) {
  if (!latest || particles.length > PARTICLE_MAX * 0.6) return;
  let cible = null, bd = Infinity;
  for (const p of latest.players.values()) {
    if (p.downed) continue;
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) { bd = d; cible = p; }
  }
  if (!cible || bd > 900 * 900) return;
  const n = glActive() ? 2 : 1;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 60;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: XP_LIFE, max: XP_LIFE, col: SIGNAL.gain, size: 2.6,
      frame: fxGlow, vers: cible.id, drag: 1,
    });
  }
}

// [9][10][11] LE SOUFFLE EN COUCHES : chacune a SA constante de temps. Si tout
// s'estompe sur la meme courbe, ca reste un element d'interface.
export function spawnBlast(x, y, r, ampleur, S) {
  const dense = glActive();

  // noyau : il NAIT a sa taille maximale — une montee progressive fait
  // « animation » la ou une detonation fait « matiere ».
  if (particles.length < PARTICLE_MAX) {
    particles.push({ x, y, vx: 0, vy: 0, life: 0.034, max: 0.034,
                     col: S.coeur, size: r * 0.85, frame: fxGlow, drag: 1 });
  }

  // boule de feu : trois quads decales, blanc -> feu -> bord. Un cercle parfait
  // se lit comme de l'interface, une forme irreguliere comme de la matiere.
  const boules = [
    { c: S.coeur, s: 0.62, l: 0.10 },
    { c: S.feu,   s: 0.92, l: 0.14 + 0.06 * ampleur },
    { c: S.bord,  s: 1.20, l: 0.17 + 0.09 * ampleur },
  ];
  for (const b of boules) {
    if (particles.length >= PARTICLE_MAX) break;
    const a = Math.random() * Math.PI * 2;
    const off = r * 0.13;
    particles.push({
      x: x + Math.cos(a) * off, y: y + Math.sin(a) * off,
      vx: 0, vy: 0, life: b.l, max: b.l, col: b.c,
      size: r * b.s * (0.9 + 0.35 * ampleur), frame: fxGlow,
      ang: Math.random() * Math.PI * 2, grow: r * 0.5, drag: 1,
    });
  }

  // onde de choc : elle DEPASSE le remplissage, sinon elle disparait dedans.
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: r * 0.35, max: r * (1.5 + 0.5 * ampleur),
                  life: 0.25, t: 0.25, col: S.bord, w: 2 + 2.5 * ampleur });
  }

  // debris
  const nd = Math.round((dense ? 7 : 3) + (dense ? 8 : 3) * ampleur);
  for (let i = 0; i < nd && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 180 + Math.random() * (260 + 320 * ampleur);
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.25, max: 0.75,
      col: S.debris, size: 2.6 + 2 * Math.random(),
      frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 16,
    });
  }

  // fumee : la meme case que le halo, distinguee par son COMPORTEMENT — grosse,
  // tres transparente, lente, et elle grandit.
  const nf = dense ? 3 + Math.round(2 * ampleur) : 1;
  for (let i = 0; i < nf && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 22 + Math.random() * 30;
    particles.push({
      x: x + Math.cos(a) * r * 0.3, y: y + Math.sin(a) * r * 0.3,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.9 + 0.5 * ampleur, max: 0.9 + 0.5 * ampleur,
      col: SURFACE.line, size: r * 0.55, frame: fxGlow,
      grow: r * 0.5, a0: 0.34, drag: 0.985,
    });
  }

  if (blastMarks.length >= BLAST_MARK_MAX) blastMarks.shift();
  blastMarks.push({ x, y, r: r * 0.8, at: performance.now(), dur: 1600 + 900 * ampleur });
}

// la marque au sol : SOUS tout le reste, et elle s'efface lentement.
const BLAST_MARK_MAX = 14;
export const blastMarks = [];
export function drawBlastMarks() {
  if (blastMarks.length === 0) return;
  const now = performance.now();
  for (let i = blastMarks.length - 1; i >= 0; i--) {
    const m = blastMarks[i];
    const k = (now - m.at) / m.dur;
    if (k >= 1) { blastMarks[i] = blastMarks[blastMarks.length - 1]; blastMarks.pop(); continue; }
    if (!inView(m.x, m.y, m.r)) continue;
    ctx.fillStyle = alpha(SURFACE.void, 0.34 * (1 - k));
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * (0.85 + 0.15 * k), 0, Math.PI * 2);
    ctx.fill();
  }
}

// [21] l'invulnerabilite breve d'un releve doit SE VOIR.
// CHAQUE EFFET AUTOUR D'UN PERSONNAGE OCCUPE UNE BANDE DE RAYON EXCLUSIVE. La
// table vit ici, la couche la plus basse qui en a besoin : les eclats de coque
// doivent naitre exactement sur le rayon que `boss.js` dessine, et deux
// definitions du meme rayon finiraient par diverger.
// La premiere bande part de la SILHOUETTE, pas du rayon de collision : les
// tracés de classe vont jusqu'a 24 px (`sprites.js`), donc une coque a
// `PLAYER_RADIUS + 4` passait DANS le personnage au lieu de l'envelopper.
export const RING_SHIELD = CFG.PLAYER_RADIUS + 12;
export const RING_STATUS = CFG.PLAYER_RADIUS + 17;
export const RING_SKILL  = CFG.PLAYER_RADIUS + 22;
export const RING_BUFF0  = CFG.PLAYER_RADIUS + 27;

// LA COQUE. Sa rupture est du VERRE : `fx_shard` est deja la matiere « eclat
// anguleux » de l'atlas, elle passe donc par le lot WebGL comme le reste — pas
// de quatrieme case, pas de chemin special.
export const shieldHit = new Map();
const SHIELD_PLATES = 9;

export function spawnShieldOn(x, y) {
  const col = POWERUP_COLOR.shield;
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 44, max: RING_SHIELD, life: 0.28, t: 0.28, col, w: 2.5 });
  }
  // les plaques CONVERGENT : la coque se ferme sur le porteur au lieu de
  // s'allumer sur place.
  for (let i = 0; i < SHIELD_PLATES && particles.length < PARTICLE_MAX; i++) {
    const a = (i / SHIELD_PLATES) * Math.PI * 2 + Math.random() * 0.2;
    const d = RING_SHIELD + 32 + Math.random() * 26;
    particles.push({
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: -Math.cos(a) * d * 2.6, vy: -Math.sin(a) * d * 2.6,
      life: 0.34, max: 0.34, col, size: 3.4,
      frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 2, drag: 0.9,
    });
  }
}

export function spawnShieldBreak(x, y) {
  const col = POWERUP_COLOR.shield;
  const dense = glActive();
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: RING_SHIELD, max: RING_SHIELD + 34,
                  life: 0.30, t: 0.30, col, w: 3 });
  }
  if (particles.length < PARTICLE_MAX) {
    particles.push({ x, y, vx: 0, vy: 0, life: 0.05, max: 0.05,
                     col: COMBAT.flash, size: 40, frame: fxGlow, drag: 1 });
  }
  // les eclats partent du BORD de la coque, pas du centre : c'est la coque qui
  // cede, pas le personnage qui explose.
  const n = dense ? 22 : 10;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
    const sp = 150 + Math.random() * 170;
    particles.push({
      x: x + Math.cos(a) * RING_SHIELD, y: y + Math.sin(a) * RING_SHIELD,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.42, max: 0.42, col, size: 3 + Math.random() * 2.2,
      frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 9, drag: 0.93,
    });
  }
}

// LA VAGUE DE SOIN EST UN DON, PAS UNE DETONATION : tout part du centre vers
// l'exterieur et rien ne retombe. Deux constantes de temps — l'anneau freine,
// les motes filent — sinon la vague se lit comme un souffle vert.
const HEAL_MOTES = 12;
export function spawnHealWave(x, y, r) {
  const rr = r || 120;
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: rr * 0.2, max: rr * 1.08, life: 0.5, t: 0.5,
                  col: FX.heal, w: 2.6 });
  }
  if (particles.length < PARTICLE_MAX) {
    particles.push({ x, y, vx: 0, vy: 0, life: 0.22, max: 0.22,
                     col: FX.healSoft, size: 30, frame: fxGlow, drag: 1, grow: 110 });
  }
  const n = glActive() ? HEAL_MOTES : Math.floor(HEAL_MOTES / 2);
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.35;
    const sp = rr * (1.5 + Math.random() * 0.5);
    particles.push({
      x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.55, max: 0.55, col: FX.heal, size: 3.6,
      frame: fxGlow, drag: 0.88,
    });
  }
}

// LE REMPART SE MONTE. Les plaques viennent de l'exterieur et se posent SUR le
// bord — l'inverse de la coque du joueur, qui se ferme sur son porteur.
const BULWARK_PLATES_FX = 12;
export function spawnBulwark(x, y, r) {
  const rr = r || 110;
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: rr * 1.32, max: rr, life: 0.34, t: 0.34,
                  col: CLASS_COLOR.tank, w: 3.5 });
  }
  for (let i = 0; i < BULWARK_PLATES_FX && particles.length < PARTICLE_MAX; i++) {
    const a = (i / BULWARK_PLATES_FX) * Math.PI * 2;
    const d = rr + 34;
    particles.push({
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: -Math.cos(a) * 130, vy: -Math.sin(a) * 130,
      life: 0.32, max: 0.32, col: CLASS_COLOR.tank, size: 4.2,
      frame: fxShard, ang: a + Math.PI / 2, spin: 0, drag: 0.84,
    });
  }
}

function spawnRevive(x, y, col) {
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 10, max: 150, life: 0.55, t: 0.55, col, w: 3.5 });
  }
  for (let i = 0; i < 14 && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 40 + Math.random() * 90;
    const sp = 120 + Math.random() * 90;
    particles.push({
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp,
      life: 0.5, max: 0.5, col, size: 3.2, frame: fxGlow, drag: 0.94,
    });
  }
}

// [20] LE POULS D'EQUIPE : la jauge d'XP est deja commune, rien ne celebrait la
// montee de niveau comme un evenement partage. Quatre ecrans, un seul instant.
export const pulse = { t: 0, max: 0, col: SIGNAL.gain };
export function addPulse(col, dur) {
  pulse.col = col;
  pulse.max = dur;
  pulse.t = dur;
}
export function drawPulse() {
  if (pulse.t <= 0) return;
  const k = pulse.t / pulse.max;
  const bord = Math.min(CFG.VIEW_W, CFG.VIEW_H) * 0.34;
  const g = ctx.createRadialGradient(
    camera.x0 + CFG.VIEW_W / 2, camera.y0 + CFG.VIEW_H / 2,
    Math.max(1, Math.min(CFG.VIEW_W, CFG.VIEW_H) / 2 - bord * k),
    camera.x0 + CFG.VIEW_W / 2, camera.y0 + CFG.VIEW_H / 2,
    Math.hypot(CFG.VIEW_W, CFG.VIEW_H) / 2);
  g.addColorStop(0, alpha(pulse.col, 0));
  g.addColorStop(1, alpha(pulse.col, 0.30 * k * k));
  ctx.fillStyle = g;
  ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
}
export const bursts = [];
export const BURST_MAX = 24;
function stepBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    bursts[i].t -= dt;
    if (bursts[i].t <= 0) { bursts[i] = bursts[bursts.length - 1]; bursts.pop(); }
  }
}
export function drawBursts() {
  if (bursts.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const b of bursts) {
    const k = 1 - b.t / b.life;
    // l'anneau part vite et freine : c'est ce profil qui le fait lire comme un
    // souffle et non comme un cercle qui grandit.
    const e = 1 - (1 - k) * (1 - k);
    ctx.strokeStyle = alpha(b.col, (1 - k) * 0.75);
    ctx.lineWidth = (b.w ?? 3) * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + (b.max - b.r) * e, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
function pushDamage(x, y, dmg, crit = false) {
  hudDamage(x - camera.x0 + (Math.random() - 0.5) * 40, y - camera.y0 - 30,
            dmg, crit ? "crit" : "deal");
}
const DMG_AGG_MS = 200;
const DMG_THRESHOLD = 0.05;
export const dmgAgg = new Map();
function aggregateDamage(e) {
  // le critique voyage jusqu'au CHIFFRE : un coup qui vaut le double sans que
  // rien ne le dise n'existe pas pour le joueur. Un seul critique dans le lot
  // suffit a teinter le total — la couleur porte l'evenement, pas la somme.
  const crit = (e.crits ?? 0) > 0 || e.crit === true;
  const a = dmgAgg.get(e.id);
  if (a) { a.sum += e.dmg; a.x = e.x; a.y = e.y; a.crit = a.crit || crit; return; }
  dmgAgg.set(e.id, {
    x: e.x, y: e.y, sum: e.dmg, at: performance.now(), crit,
    maxHp: e.maxHp || 1,
  });
}
const SELF_AGG_MS = 200;
export const selfAgg = new Map();
function aggregateSelf(kind, e) {
  const cle = e.id + ":" + kind;
  const a = selfAgg.get(cle);
  if (a) {
    a.sum += e.dmg;
    a.x = e.x; a.y = e.y;
    if (kind === "hurt") a.src = e.src ?? 0;
    return;
  }
  selfAgg.set(cle, {
    kind, x: e.x, y: e.y, sum: e.dmg, at: performance.now(), src: e.src ?? 0,
  });
}
export function flushSelf(now) {
  if (selfAgg.size === 0) return;
  for (const [cle, a] of selfAgg) {
    if (now - a.at < SELF_AGG_MS) continue;
    if (Math.round(a.sum) < 1) { a.at = now; continue; }
    selfAgg.delete(cle);
    hudDamage(a.x - camera.x0, a.y - camera.y0 - 26, a.sum, a.kind,
              a.kind === "hurt" ? (SRC_ICON[a.src] ?? null) : null);
  }
}
export function flushDamage(now) {
  if (dmgAgg.size === 0) return;
  for (const [id, a] of dmgAgg) {
    if (now - a.at < DMG_AGG_MS) continue;
    dmgAgg.delete(id);
    if (a.sum >= a.maxHp * DMG_THRESHOLD) {
      hudDamage(a.x - camera.x0 + (Math.random() - 0.5) * 18,
                a.y - camera.y0 - 22, a.sum, a.crit ? "crit" : "deal");
    }
  }
}
export function stepFeedback(dt) {
  stepTimeWarp(dt);
  if (pulse.t > 0) pulse.t = Math.max(0, pulse.t - dt);

  if (shake.mag > 0.05) {
    shake.mag *= Math.pow(0.004, dt / 0.2);
    shake.x = (Math.random() - 0.5) * 2 * shake.mag;
    shake.y = (Math.random() - 0.5) * 2 * shake.mag;
  } else {
    shake.mag = 0; shake.x = 0; shake.y = 0;
  }

  const joueurs = latest?.players;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      if (p.zfx) zoneFx--;
      particles[i] = particles[particles.length - 1];
      particles.pop();
      continue;
    }
    if (p.vers && joueurs) {
      const c = joueurs.get(p.vers);
      if (c) {
        const dx = c.x - p.x, dy = c.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = 1900 * (1 - p.life / p.max);
        p.vx += (dx / d) * pull * dt;
        p.vy += (dy / d) * pull * dt;
        if (d < 26) p.life = Math.min(p.life, 0.06);
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const drag = Math.pow(p.drag ?? 0.90, dt * 60);
    p.vx *= drag; p.vy *= drag;
    if (p.lift) p.vy -= p.lift * dt;
    if (p.spin) p.ang += p.spin * dt;
    if (p.grow) p.size += p.grow * dt;
  }
  stepBursts(dt);

  const now = performance.now();
  if (hitQueue.length > 0) flushHitQueue(now);
  if (hits.size > 0) {
    for (const [id, h] of hits) if (h.until < now) hits.delete(id);
  }
}
export let fxWhite = 0, fxShard = 0, fxGlow = 0;
export function drawParticles() {
  if (glActive()) {
    for (const p of particles) {
      if (!inView(p.x, p.y, 40)) continue;
      const s = p.size / SPRITE_CELL;
      drawSprite(ctx, p.frame ?? fxWhite, p.x, p.y, {
        scaleX: s * (p.long ?? 1),
        scaleY: s,
        angle: p.ang ?? 0,
        tint: p.col,
        alpha: Math.max(0, p.life / p.max) * (p.a0 ?? 1),
        additive: true,
      });
    }
    return;
  }

  // [7] LE MELANGE ADDITIF. Une explosion en alpha classique est un disque
  // gris ; en additif, c'est de la lumiere. Le chemin WebGL le fait par
  // `BLEND_ADD` ; le chemin 2D ne le faisait pas du tout.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    if (!inView(p.x, p.y, 40)) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max) * (p.a0 ?? 1);
    ctx.fillStyle = p.col;
    if (p.frame === fxGlow && fxGlow) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
export const gridPings = [];
const GRID_PING_MS = 420;
function addGridPing(x, y, r) {
  if (gridPings.length > 8) gridPings.shift();
  gridPings.push({ x, y, r, at: performance.now() });
}
export function drawGridPings() {
  if (gridPings.length === 0) return;
  const now = performance.now();

  for (let i = gridPings.length - 1; i >= 0; i--) {
    const p = gridPings[i];
    const k = (now - p.at) / GRID_PING_MS;
    if (k >= 1) { gridPings.splice(i, 1); continue; }

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = SIGNAL.go;
    ctx.globalAlpha = 0.30 * (1 - k);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = Math.floor((p.x - p.r) / GRID_FINE) * GRID_FINE;
    const y0 = Math.floor((p.y - p.r) / GRID_FINE) * GRID_FINE;
    for (let x = x0; x <= p.x + p.r; x += GRID_FINE) {
      ctx.moveTo(x + .5, p.y - p.r); ctx.lineTo(x + .5, p.y + p.r);
    }
    for (let y = y0; y <= p.y + p.r; y += GRID_FINE) {
      ctx.moveTo(p.x - p.r, y + .5); ctx.lineTo(p.x + p.r, y + .5);
    }
    ctx.stroke();
    ctx.restore();
  }
}

export const ZONE_FX_MAX = 600;
export let zoneFx = 0;
export const lastBossPos = { x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2 };

// [27] LE RETOUR DE TOUCHE DU BOSS. L'eclair blanc de la horde vit dans
// `flashAtlas` ; le boss est trace a la main, hors atlas, donc il n'en avait
// aucun equivalent. Ce n'etait pas un reglage trop discret, c'etait un canal
// absent — et le choix de rendu, lui, etait bon.
export const bossHit = { at: 0 };
export const BOSS_FLASH_MS = 80;
export function bossFlash(now) {
  if (bossHit.at <= 0) return 0;
  const k = 1 - (now - bossHit.at) / BOSS_FLASH_MS;
  return k > 0 ? k : 0;
}

export function setPARTICLE_MAX(v) { PARTICLE_MAX = v; }
export function setFxWhite(v) { fxWhite = v; }
export function setFxShard(v) { fxShard = v; }
export function setFxGlow(v) { fxGlow = v; }
export function setZoneFx(v) { zoneFx = v; }
