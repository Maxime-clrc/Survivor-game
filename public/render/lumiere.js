import { CFG, HZ_SLIP, HZ_SLOW, hazardState } from "/shared/game_state.js";
import { BOSS_SKIN, alpha, melange } from "/shared/palette.js";
import { GFX_HIGH, GFX_ULTRA, gfx } from "../core/state.js";
import { bursts } from "./fx.js";
import { ledDe } from "./blocs.js";
import { forEachPropLight } from "./props.js";
import { camera, ctx, hazardsActifs, obstaclesActifs, ownerColorOf, skin } from "./stage.js";

/* IL N'Y AVAIT AUCUNE LUMIERE DANS LE JEU. Tout etait eclaire a plat, seul le
   vignettage modulait.

   La pile de canvas separe deja sol / entites / effets, donc une passe posee sur
   `#cvUnder` NE PEUT PAS atteindre un ennemi, un projectile ou un telegraphe.
   La hierarchie de lisibilite est structurelle, pas reglee — et elle tient
   parce que ce module est appele AVANT tout ce qui est du gameplay.

   Le tampon est petit EXPRES : le sur-echantillonnage bilineaire du `drawImage`
   donne la douceur gratuitement. A pleine resolution il faudrait un flou.

   UNE SEULE PASSE NE SUFFIT PAS. `multiply` seul assombrit — c'est un jeu plus
   sombre, pas un jeu eclaire. `lighter` seul delave. Les deux ensemble font de
   la matiere eclairee. La base ambiante du tampon repart dans la seconde passe :
   a 12 % d'une luminance de 0,45 c'est un relevement plat et negligeable, alors
   que les taches claires, elles, montent vraiment. */
const DIV = [0, 0, 4, 2];
const GLOW = 0.12;

/* LA PRISE DU BOSS SUR LE MONDE. Deux canaux a constantes de temps distinctes,
   et l'ordre compte : LA LUMIERE CHANGE AVANT LA MATIERE. On sent l'arrivee
   avant de la voir, ce qui est l'ordre dans lequel une menace se manifeste. Une
   bascule instantanee de la couleur du sol se lirait comme un bug de rendu, pas
   comme une entree en scene.

   Le profil est GARDE pendant la sortie : il devient null des la mort du boss
   alors que les deux canaux, eux, ont encore 1,5 s a redescendre. */
const BOSS_LUM = 1.2;
const BOSS_SOL = 0.8;
const BOSS_SORTIE = 1.5;
const SPIKE_CHUTE = 2.6;

const bs = { profil: null, kL: 0, kS: 0, spike: 0, bars: -1, t: 0 };

function pasBoss(v) {
  const now = performance.now();
  const dt = bs.t ? Math.min(0.1, (now - bs.t) / 1000) : 0;
  bs.t = now;

  const P = v.boss ? (BOSS_SKIN[v.boss.kind ?? 0] ?? BOSS_SKIN[0]) : null;
  if (P) bs.profil = P;

  const cible = P ? 1 : 0;
  const vL = P ? dt / BOSS_LUM : -dt / BOSS_SORTIE;
  bs.kL = Math.max(0, Math.min(1, bs.kL + vL));
  // la matiere n'entame sa course qu'une fois la lumiere presque en place
  const vS = P && bs.kL > 0.85 ? dt / BOSS_SOL : P ? 0 : -dt / BOSS_SORTIE;
  bs.kS = Math.max(0, Math.min(bs.kL, bs.kS + vS));
  if (cible === 0 && bs.kL <= 0) bs.profil = null;

  const bars = v.boss?.bars ?? -1;
  if (bars >= 0 && bs.bars >= 0 && bars < bs.bars) bs.spike = 1;
  bs.bars = bars;
  bs.spike = Math.max(0, bs.spike - dt * SPIKE_CHUTE);

  return bs.profil;
}

// une rupture de barre est une POINTE, pas un palier : elle eclaire l'arene le
// temps d'un souffle et rend la main.
function battement(P) {
  if (!P) return 0;
  const [hz, amp] = P.puls;
  const p = hz > 0 ? amp * Math.sin(performance.now() / 1000 * hz * Math.PI * 2) : 0;
  return p + bs.spike * 0.22;
}

export function bossVignette() {
  return bs.profil ? 1 + (bs.profil.vig - 1) * bs.kL : 1;
}

export function bossAtmo() {
  if (!bs.profil?.atmo || bs.kS <= 0.02) return null;
  return { col: bs.profil.atmo, k: bs.kS };
}

let buf = null, bg = null, div = 0;

function tampon() {
  const d = DIV[gfx] ?? 0;
  if (d === 0) return null;
  if (!buf || div !== d) {
    div = d;
    buf = document.createElement("canvas");
    buf.width = Math.round(CFG.VIEW_W / d);
    buf.height = Math.round(CFG.VIEW_H / d);
    bg = buf.getContext("2d");
  }
  return bg;
}

// une source ne monte jamais au blanc pur toute seule : c'est l'EMPILEMENT qui
// fabrique le coeur clair, exactement comme pour un souffle.
function source(g, x, y, r, col, i) {
  if (i <= 0.004) return;
  const bx = (x - camera.x0) / div, by = (y - camera.y0) / div, br = r / div;
  if (bx + br < 0 || by + br < 0 || bx - br > buf.width || by - br > buf.height) return;
  const grad = g.createRadialGradient(bx, by, 0, bx, by, br);
  const k = Math.min(0.85, i);
  grad.addColorStop(0, alpha(col, k));
  grad.addColorStop(0.45, alpha(col, k * 0.42));
  grad.addColorStop(1, alpha(col, 0));
  g.fillStyle = grad;
  g.fillRect(bx - br, by - br, br * 2, br * 2);
}

export function drawLumiere(v) {
  // LA HORLOGE DU BOSS AVANCE MEME SANS TAMPON : le vignettage et l'atmosphere
  // le lisent aussi, et ils vivent des `medium`.
  const P = pasBoss(v);
  const g = tampon();
  if (!g) return;
  const B = skin();
  const L = P
    ? { amb: melange(B.amb, P.amb, bs.kS), emis: B.emis,
        k: B.k + (P.k - B.k) * bs.kL - battement(P) }
    : B;

  g.globalCompositeOperation = "source-over";
  g.fillStyle = L.amb;
  g.fillRect(0, 0, buf.width, buf.height);
  g.globalCompositeOperation = "lighter";

  const tm = v.tm ?? 0;
  for (const h of hazardsActifs()) {
    if (h.kind === HZ_SLOW || h.kind === HZ_SLIP) continue;
    const st = hazardState(h, tm);
    if (!st.on) continue;
    source(g, st.x, st.y, h.r * 2.4, L.emis, 0.34 * st.k);
  }

  forEachPropLight((x, y, r, col, i) => source(g, x, y, r, col, 0.30 * i));

  // un bloc eclaire son propre pourtour : c'est ce lien qui fait que le decor
  // et la lumiere decrivent le meme monde au lieu de se superposer.
  for (const o of obstaclesActifs()) {
    const l = ledDe(o);
    if (!l) continue;
    source(g, l.x, l.y, l.r, l.col, l.type === "gueule" ? 0.46 : 0.24);
  }

  // le souffle est LU, jamais pousse : ecrire vers une couche superieure est
  // interdit, et rien ici n'y oblige.
  for (const b of bursts) {
    const k = 1 - b.t / b.life;
    const e = 1 - (1 - k) * (1 - k);
    source(g, b.x, b.y, (b.r + (b.max - b.r) * e) * 1.7, b.col, 0.55 * (1 - k));
  }

  for (const p of v.playerList) {
    if (p.downed) continue;
    source(g, p.x, p.y, 170, ownerColorOf(p.id) ?? "#ffffff", 0.16);
  }
  if (v.boss) source(g, v.boss.x, v.boss.y, 260, L.emis, 0.20);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = Math.max(0, Math.min(0.95, L.k));
  ctx.drawImage(buf, camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = gfx >= GFX_ULTRA ? GLOW * 1.4 : GLOW;
  ctx.drawImage(buf, camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.restore();
}

export function lumiereActive() { return gfx >= GFX_HIGH; }
