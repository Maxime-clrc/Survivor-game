
import { BIOME_CFG, CFG, HZ_SLIP, HZ_SLOW, WX_BOURRASQUE, WX_BRUME, WX_CENDRES, biomeAt, hazardState, windAt } from "/shared/game_state.js";
import { BIOME, BOSS, PROP, SURFACE, WALL, WEATHER, ZONE, alpha } from "/shared/palette.js";
import { GFX_HIGH, GFX_LOW, difficulty, gfx } from "../core/state.js";
import { drawGridPings } from "./fx.js";
import { couleeDe, floorPattern, fondEspace, macroPattern } from "./material.js";
import { bossAtmo, bossVignette } from "./lumiere.js";
import { contourDe, dessinerLed, evacDe, evacEtat, habillerBloc, ledDe, silhouetteBloc } from "./blocs.js";
import { forEachPropLight } from "./props.js";
import { GRID_FINE, GRID_MAJOR, biomeIndex, biomeSeed, camera, ctx, decor, hazardsActifs, inView, lumDir, obstaclesActifs, renderScale, setVignette, skin, sol, vignette, weather } from "./stage.js";

/* L'ARRIERE-PLAN, ET C'EST LE SEUL DU JEU. Il se dessine deux fois : une passe
   PLEINE VUE entre la couleur d'arene et la matiere du sol — c'est ce qui
   transparait sous un plancher a 0,93 —, puis une passe par BAIE, apres le sol,
   a pleine valeur.

   TROIS parallaxes, parce qu'un fond a une seule vitesse est un autocollant et
   qu'a deux il manque ce qui se passe ENTRE l'infini et le proche : les astres a
   0,05, le gaz a 0,10, les etoiles a 0,16. La derive maximale sur cette arene est
   de 256 px et la marge cuite en fait 300 — rien a boucler. */
const FOND_LOIN = 0.05;
const FOND_GAZ = 0.10;
const FOND_PRES = 0.16;

/* LE FOND SE BLITTE PAR SOUS-RECTANGLE. Une baie de 300 px ne doit pas payer une
   image de 2 200 : on calcule le morceau de source qui lui correspond au lieu de
   laisser un clip s'en charger. `ech` porte la demi-resolution du gaz — une
   nappe floue n'a pas besoin d'un pixel par pixel, et l'etirement du blit est
   exactement le flou qu'on aurait paye autrement. */
function blitFond(f, img, p, ech, ddx, ddy, X, Y, W, H) {
  const dx = camera.x - CFG.ARENA_W / 2, dy = camera.y - CFG.ARENA_H / 2;
  const ox = camera.x0 - f.marge - dx * p + ddx;
  const oy = camera.y0 - f.marge - dy * p + ddy;
  ctx.drawImage(img, (X - ox) / ech, (Y - oy) / ech, W / ech, H / ech, X, Y, W, H);
}

// LA NEBULEUSE DERIVE, et il faut la regarder dix secondes pour s en rendre
// compte. La derive ne touche que ce qui est LOIN — les etoiles proches restent
// fixes, sinon c est le vaisseau qui semblerait tanguer.
// un objet de module et non un tuple rendu : deux appelants par image, et rien
// ici ne doit allouer.
const derive = { lx: 0, ly: 0, gx: 0, gy: 0 };
function majDerive() {
  const t = performance.now() / 1000;
  derive.lx = Math.sin(t * 0.052) * 8;
  derive.ly = Math.cos(t * 0.037) * 6;
  derive.gx = Math.sin(t * 0.031) * 15;
  derive.gy = Math.cos(t * 0.043) * 11;
}

export function drawFond() {
  if (gfx <= GFX_LOW || biomeAt(biomeIndex).fond !== "espace") return;
  const f = fondEspace(biomeSeed, CFG.VIEW_W, CFG.VIEW_H);
  majDerive();
  const ddx = derive.lx, ddy = derive.ly, gx = derive.gx, gy = derive.gy;
  // LES ETOILES NE SONT PLUS ICI : sous un plancher a 0,93 elles ne se voyaient
  // pas, et elles coutaient une image pleine vue. Ce qui reste sous le pont est
  // ce qui a une SURFACE — la nebuleuse et son gaz —, assez pour que le plancher
  // ne soit pas plat. Le ciel, lui, se regarde par une baie.
  blitFond(f, f.loin, FOND_LOIN, 1, ddx, ddy, camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  blitFond(f, f.gaz, FOND_GAZ, f.ech, gx, gy, camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
}

/* LA BAIE, ET C'EST ELLE QUI DIT QU'ON EST DANS L'ESPACE.

   Avant : trois hexagones retires par tuile de sol, 4 % de la surface, decoupes
   DANS le motif — donc repetes tous les 400 px et remplis par ce qui transparait
   sous un plancher a 0,93. Resultat mesure a l'ecran : une salle hexagonale
   bleue, avec un cosmos invisible dessous.

   Maintenant : une baie occupe une TRAVEE du pont, elle est tiree par cellule de
   nervure, et elle redessine l'arriere-plan A PLEINE VALEUR au lieu de compter
   sur ce qui passe au travers.

   ELLE EST VITREE, ET CE N'EST PAS UN DETAIL. Un trou franc dans le plancher
   ment : le joueur le traverse, les ennemis le traversent, un obstacle du biome
   peut tomber dessus et son ombre porterait sur du vide. Une verriere donne
   exactement la meme image — le vide, en grand, sous les pieds — sans qu'aucune
   regle de deplacement n'ait a bouger. Rien a exclure du semis, rien a exclure
   des obstacles.

   Le pas est celui des nervures : une baie est ce qu'il y a ENTRE deux poutres,
   ce qui explique sa forme et sa place. */
const BAIE_TAUX = 0.38;
const BAIE_INSET = 38;
const BAIE_CHANF = 34;
const BAIE_MENEAU = 104;
const VIDE = "#03050c";
// tableau de module et non un litteral dans la boucle : jusqu'a onze baies par
// vue, et rien ici ne doit allouer par image.
const REFLETS = [[0.18, 0.055], [0.44, 0.028]];

function hCell(cx, cy, s) {
  return h01(Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663) ^ Math.imul(s, 83492791));
}

function cadreBaie(x, y, w, h) {
  const c = Math.min(BAIE_CHANF, w * 0.28, h * 0.28);
  ctx.beginPath();
  ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c); ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c);
  ctx.closePath();
}

export function drawBaies() {
  if (gfx <= GFX_LOW || biomeAt(biomeIndex).fond !== "espace") return;
  const f = fondEspace(biomeSeed, CFG.VIEW_W, CFG.VIEW_H);
  majDerive();
  const ddx = derive.lx, ddy = derive.ly, gx = derive.gx, gy = derive.gy;
  const s = biomeSeed >>> 0;
  const c0x = Math.floor(camera.x0 / GRID_MAJOR);
  const c1x = Math.floor((camera.x0 + CFG.VIEW_W) / GRID_MAJOR);
  const c0y = Math.floor(camera.y0 / GRID_MAJOR);
  const c1y = Math.floor((camera.y0 + CFG.VIEW_H) / GRID_MAJOR);

  for (let cy = c0y; cy <= c1y; cy++) {
    for (let cx = c0x; cx <= c1x; cx++) {
      if (cx < 0 || cy < 0) continue;
      if (hCell(cx, cy, s) >= BAIE_TAUX) continue;

      const x0 = cx * GRID_MAJOR, y0 = cy * GRID_MAJOR;
      const x1 = Math.min(CFG.ARENA_W, x0 + GRID_MAJOR);
      const y1 = Math.min(CFG.ARENA_H, y0 + GRID_MAJOR);
      let x = x0 + BAIE_INSET, y = y0 + BAIE_INSET;
      let w = x1 - x0 - BAIE_INSET * 2, h = y1 - y0 - BAIE_INSET * 2;
      // deux formats : la travee pleine, et la BANDE — c'est ce qui empeche un
      // tirage par cellule de redevenir un damier de carres identiques.
      if (hCell(cx, cy, s + 13) < 0.46) {
        const trav = hCell(cx, cy, s + 29) < 0.5;
        if (trav) { const nh = h * 0.50; y += (h - nh) * hCell(cx, cy, s + 41); h = nh; }
        else { const nw = w * 0.50; x += (w - nw) * hCell(cx, cy, s + 41); w = nw; }
      }
      if (w < 70 || h < 70) continue;
      if (!inView(x + w / 2, y + h / 2, Math.max(w, h))) continue;
      baie(f, x, y, w, h, ddx, ddy, gx, gy);
    }
  }
  ctx.lineWidth = 1;
}

function baie(f, x, y, w, h, ddx, ddy, gx, gy) {
  const S = skin();
  ctx.save();
  cadreBaie(x, y, w, h);
  ctx.clip();

  // LE VIDE EST PEINT AVANT D'ETRE REMPLI : le plancher est encore dessous, et
  // ce qui doit se voir dans une baie est le ciel, pas un ciel sur du metal.
  ctx.fillStyle = VIDE;
  ctx.fillRect(x, y, w, h);
  blitFond(f, f.loin, FOND_LOIN, 1, ddx, ddy, x, y, w, h);
  blitFond(f, f.gaz, FOND_GAZ, f.ech, gx, gy, x, y, w, h);
  blitFond(f, f.pres, FOND_PRES, 1, 0, 0, x, y, w, h);
  scintiller(f, x, y, w, h);

  // LE VERRE. Un voile froid — qui PLAFONNE aussi la clarte de la baie, donc la
  // lisibilite d'un ennemi qui passe dessus — et deux reflets obliques. Sans
  // eux la baie se lit comme un trou, et un trou ment.
  ctx.fillStyle = alpha(PROP.givre, 0.030);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = alpha(PROP.givre, 0.045);
  for (const [u, e] of REFLETS) {
    const bx = x + w * u;
    ctx.beginPath();
    ctx.moveTo(bx, y + h);
    ctx.lineTo(bx + w * e, y + h);
    ctx.lineTo(bx + h * 0.55 + w * e, y);
    ctx.lineTo(bx + h * 0.55, y);
    ctx.closePath();
    ctx.fill();
  }

  // LES MENEAUX. Ils donnent l'echelle : sans eux on ne sait pas si la baie fait
  // deux metres ou vingt.
  const vert = h >= w;
  const n = Math.floor((vert ? h : w) / BAIE_MENEAU);
  if (n >= 1) {
    ctx.strokeStyle = alpha("#000000", 0.62);
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 1; i <= n; i++) {
      const v = i / (n + 1);
      if (vert) { ctx.moveTo(x, y + h * v); ctx.lineTo(x + w, y + h * v); }
      else { ctx.moveTo(x + w * v, y); ctx.lineTo(x + w * v, y + h); }
    }
    ctx.stroke();
    ctx.strokeStyle = alpha(S.blocEdge, 0.20);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // L'OMBRE DU CADRE, tracee DANS le clip : la moitie interieure d'un trait
  // large. C'est elle qui donne au plancher son EPAISSEUR — une baie sans
  // tranche est un autocollant.
  cadreBaie(x, y, w, h);
  ctx.strokeStyle = alpha("#000000", 0.55);
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.restore();

  cadreBaie(x, y, w, h);
  ctx.strokeStyle = alpha(S.blocEdge, 0.30);
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* LE SCINTILLEMENT NE SE CUIT PAS. Une couche cuite qu'on ferait pulser fait
   pulser TOUT le ciel d'un coup, ce qui n'est pas un scintillement mais un
   projecteur. Ici chaque etoile a sa propre horloge, et le regroupement par
   PALIER de clarte garde le cout a trois `fill` — le meme geste que les etoiles
   cuites, un cran plus vivant. Rien ne s'alloue : la position d'une etoile est
   une fonction de son indice. */
const SCINT_N = 420;
function scintiller(f, X, Y, W, H) {
  const dx = camera.x - CFG.ARENA_W / 2, dy = camera.y - CFG.ARENA_H / 2;
  const ox = camera.x0 - f.marge - dx * FOND_PRES;
  const oy = camera.y0 - f.marge - dy * FOND_PRES;
  const t = performance.now() / 1000;

  for (let p = 0; p < 3; p++) {
    ctx.fillStyle = alpha(PROP.astre, 0.22 + p * 0.29);
    ctx.beginPath();
    let vide = true;
    for (let i = 0; i < SCINT_N; i++) {
      const sx = ox + h01(i) * f.w, sy = oy + h01(i + 5011) * f.h;
      if (sx < X || sx > X + W || sy < Y || sy > Y + H) continue;
      const u = 0.5 + 0.5 * Math.sin(t * (0.5 + h01(i + 1229) * 1.7) + h01(i + 911) * 40);
      if (((u * 3) | 0) !== p) continue;
      ctx.rect(sx, sy, 1.8 + p * 0.7, 1.8 + p * 0.7);
      vide = false;
    }
    if (!vide) ctx.fill();
  }
}

export function drawFloor() {
  const p = floorPattern(ctx, biomeIndex, difficulty, biomeSeed, renderScale);
  if (!p) return;
  ctx.fillStyle = p;
  ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  const m = macroPattern(ctx, biomeIndex, difficulty, biomeSeed, renderScale);
  if (!m) return;
  ctx.fillStyle = m;
  ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
}

/* LE CANAL DE COULEE, DESSINE. La geometrie vit dans `material.js` — `lumiere.js`
   la lit aussi, et deux modules qui liraient deux geometries differentes
   mettraient la lueur a cote de la conduite.

   Il est COUVERT : des plaques epaisses, un joint incandescent entre chacune, et
   des regards rares. Ce qui brille est ce qui PASSE ENTRE deux plaques, jamais
   une nappe libre — la nappe libre est un danger, avec son collider. */
const COULEE_PLAQUE = 46;
export function drawCoulee() {
  if (gfx <= GFX_LOW || biomeAt(biomeIndex).key !== "fonderie") return;
  const c = couleeDe(biomeSeed, CFG.ARENA_W, CFG.ARENA_H, obstaclesActifs(), hazardsActifs());
  const t = performance.now() / 1000;

  for (const canal of c.canaux) {
    for (const s of canal.segs) {
      const mx = (s.x0 + s.x1) / 2, my = (s.y0 + s.y1) / 2;
      const l = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
      if (!inView(mx, my, l / 2 + canal.large)) continue;
      const vert = s.x0 === s.x1;
      const w = vert ? canal.large : l, h = vert ? l : canal.large;
      const x = Math.min(s.x0, s.x1) - (vert ? canal.large / 2 : 0);
      const y = Math.min(s.y0, s.y1) - (vert ? 0 : canal.large / 2);

      ctx.fillStyle = alpha("#000000", 0.44);
      ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
      ctx.fillStyle = alpha(PROP.brique, 0.30);
      ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
      ctx.fillStyle = alpha("#191413", 0.92);
      ctx.fillRect(x, y, w, h);

      // LE JOINT : ce qui passe entre deux plaques. Il ondule, il ne clignote
      // pas — de la matiere en fusion n'a pas d'echeance.
      const n = Math.max(1, Math.round(l / COULEE_PLAQUE));
      for (let i = 1; i < n; i++) {
        const u = i / n;
        const k = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.9));
        const jx = s.x0 + (s.x1 - s.x0) * u, jy = s.y0 + (s.y1 - s.y0) * u;
        ctx.strokeStyle = alpha(PROP.fonte, 0.30 + 0.34 * k);
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (vert) { ctx.moveTo(jx - canal.large / 2, jy); ctx.lineTo(jx + canal.large / 2, jy); }
        else { ctx.moveTo(jx, jy - canal.large / 2); ctx.lineTo(jx, jy + canal.large / 2); }
        ctx.stroke();
        ctx.strokeStyle = alpha("#ffd9a8", 0.20 + 0.26 * k);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.strokeStyle = alpha(PROP.metalDark, 0.60);
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
  }

  for (const r of c.regards) {
    if (!inView(r.x, r.y, 26)) continue;
    const k = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.5 + r.ph * 9));
    ctx.fillStyle = alpha("#0c0808", 0.92);
    ctx.beginPath(); ctx.arc(r.x, r.y, 11, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 9);
    g.addColorStop(0, alpha("#ffe6b0", 0.80 * k));
    g.addColorStop(0.55, alpha(PROP.fonte, 0.70 * k));
    g.addColorStop(1, alpha("#7a2a08", 0.50));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(r.x, r.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(PROP.metalDark, 0.86);
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(r.x, r.y, 10.5, 0, Math.PI * 2); ctx.stroke();
  }
}

export function drawGrid() {
  const vx0 = camera.x0, vx1 = camera.x0 + CFG.VIEW_W;
  const vy0 = camera.y0, vy1 = camera.y0 + CFG.VIEW_H;
  const lines = (step) => {
    ctx.beginPath();
    for (let x = Math.max(step, Math.ceil(vx0 / step) * step); x < Math.min(CFG.ARENA_W, vx1 + step); x += step) {
      ctx.moveTo(x + .5, vy0); ctx.lineTo(x + .5, vy1);
    }
    for (let y = Math.max(step, Math.ceil(vy0 / step) * step); y < Math.min(CFG.ARENA_H, vy1 + step); y += step) {
      ctx.moveTo(vx0, y + .5); ctx.lineTo(vx1, y + .5);
    }
    ctx.stroke();
  };
  ctx.lineWidth = 1;

  // LA 5 M EST CUITE DANS LA MATIERE des `medium` : un joint a une epaisseur et
  // deux cotes, donc il decrit une SURFACE la ou une ligne decrit un plan
  // technique. La 20 m reste tracee — c'est la seule qui serve a lire une
  // portee. `GRID_FINE` ne bouge pas : `drawGridPings` s'en sert toujours.
  const skip = decor.skip;
  if (gfx <= GFX_LOW) {
    ctx.strokeStyle = sol.gridFine;
    ctx.beginPath();
    let n = 0;
    for (let x = GRID_FINE; x < CFG.ARENA_W; x += GRID_FINE, n++) {
      if (skip && n % skip === 1) continue;
      ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, CFG.ARENA_H);
    }
    n = 0;
    for (let y = GRID_FINE; y < CFG.ARENA_H; y += GRID_FINE, n++) {
      if (skip && n % skip === 2) continue;
      ctx.moveTo(0, y + .5); ctx.lineTo(CFG.ARENA_W, y + .5);
    }
    ctx.stroke();
  }

  (GRILLE[biomeAt(biomeIndex).key] ?? grilleFranche)(gfx <= GFX_LOW ? 1 : 0.5);

  drawGridPings();
}

/* LE PAS DE 20 M RESTE, SA FORME DEVIENT CELLE DU LIEU. La ligne droite pleine
   arene etait le signal le plus fort de l'ecran ET le seul qui ne variait pas
   d'un pixel entre les quatre : quatre sols, quatre blocs, quatre dangers, et
   par-dessus le meme plan technique. Ce qu'on garde est la FONCTION — un pas
   regulier de 20 m, la seule chose a l'ecran qui serve a lire une portee. Ce
   qu'on change est ce qui le PORTE.

   ET CA VAUT A TOUS LES PALIERS : c'est de la direction artistique, pas une
   technique. `low` garde sa grille fine, il ne garde pas la forme de l'autre —
   meme regle que `silhouetteBloc` et que la palette d'arene. */
const GRILLE = {
  usine: grilleFranche,
  fonderie: grilleRepere,
  friche: grilleEffacee,
  nebuleuse: grilleNervure,
};

// L'USINE EST CONSTRUITE ET ENTRETENUE : le trait franc est le sien, et c'est
// le repere auquel les trois autres se comparent.
function grilleFranche(a) {
  ctx.globalAlpha = a;
  ctx.strokeStyle = sol.gridMajor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = GRID_MAJOR; x < CFG.ARENA_W; x += GRID_MAJOR) {
    ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, CFG.ARENA_H);
  }
  for (let y = GRID_MAJOR; y < CFG.ARENA_H; y += GRID_MAJOR) {
    ctx.moveTo(0, y + .5); ctx.lineTo(CFG.ARENA_W, y + .5);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/* LA FONDERIE PORTE DEJA SES JOINTS DE PLAQUE dans la matiere du sol : une
   seconde trame par-dessus fait deux reseaux. La ligne s'efface, les NOEUDS
   restent — et un noeud tous les 20 m suffit a lire une portee. */
const REPERE = 13;
function grilleRepere(a) {
  grilleFranche(a * 0.30);
  ctx.globalAlpha = a;
  ctx.strokeStyle = sol.gridMajor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = GRID_MAJOR; x < CFG.ARENA_W; x += GRID_MAJOR) {
    for (let y = GRID_MAJOR; y < CFG.ARENA_H; y += GRID_MAJOR) {
      ctx.moveTo(x - REPERE, y + .5); ctx.lineTo(x + REPERE, y + .5);
      ctx.moveTo(x + .5, y - REPERE); ctx.lineTo(x + .5, y + REPERE);
    }
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;
}

/* LA FRICHE N'A PLUS DE PLAN, ELLE A UN MARQUAGE — peint au sol il y a vingt
   ans, efface depuis. Chaque maille porte trois troncons, un sur trois manque,
   aucun n'est tout a fait dans l'axe. Le pas reste mesurable, on le reconstruit
   d'un troncon a l'autre ; plus rien ne se lit comme une trame.

   La peinture est celle des props et jamais la couleur de grille : ce qui reste
   au sol d'une installation abandonnee est du pigment, pas un trait technique. */
const EFFACE_N = 3;
function grilleEffacee(a) {
  ctx.globalAlpha = a;
  ctx.strokeStyle = alpha(PROP.peint, 0.20);
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  let i = 0;
  for (let x = GRID_MAJOR; x < CFG.ARENA_W; x += GRID_MAJOR) {
    for (let y = 0; y < CFG.ARENA_H; y += GRID_MAJOR) troncons(x, y, true, i++);
  }
  for (let y = GRID_MAJOR; y < CFG.ARENA_H; y += GRID_MAJOR) {
    for (let x = 0; x < CFG.ARENA_W; x += GRID_MAJOR) troncons(y, x, false, i++);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;
}

function troncons(v, t0, vert, i) {
  const d = GRID_MAJOR / EFFACE_N;
  for (let k = 0; k < EFFACE_N; k++) {
    const j = i * EFFACE_N + k;
    if (h01(j) < 0.34) continue;
    const a0 = t0 + k * d + h01(j + 31) * d * 0.30;
    const a1 = a0 + d * (0.34 + h01(j + 61) * 0.42);
    const o = (h01(j + 97) - 0.5) * 5;
    if (vert) { ctx.moveTo(v + o, a0); ctx.lineTo(v + o, Math.min(CFG.ARENA_H, a1)); }
    else { ctx.moveTo(a0, v + o); ctx.lineTo(Math.min(CFG.ARENA_W, a1), v + o); }
  }
}

/* LA NEBULEUSE N'A PAS DE GRILLE TRACEE : le pas de 20 m est porte par les
   NERVURES du pont. Une nervure a une epaisseur, un cote a l'ombre et un cote
   eclaire, donc elle decrit une STRUCTURE la ou une ligne decrit un plan. Meme
   geste que le joint de la tuile, un cran plus haut — et il ne restait sinon
   sur ce lieu QUE des reseaux : le nid d'abeille, puis la trame par-dessus.

   Le cote eclaire lit `lumDir()` et rien d'autre. */
const NERVURE = 7;
function grilleNervure(a) {
  const dir = lumDir();
  ctx.globalAlpha = a;
  ctx.strokeStyle = alpha("#000000", 0.38);
  ctx.lineWidth = NERVURE;
  nervures(0, 0);
  ctx.strokeStyle = alpha(skin().blocEdge, 0.20);
  ctx.lineWidth = 1.4;
  nervures(-dir[0] * NERVURE / 2, -dir[1] * NERVURE / 2);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;
}

function nervures(ox, oy) {
  ctx.beginPath();
  for (let x = GRID_MAJOR; x < CFG.ARENA_W; x += GRID_MAJOR) {
    ctx.moveTo(x + ox, 0); ctx.lineTo(x + ox, CFG.ARENA_H);
  }
  for (let y = GRID_MAJOR; y < CFG.ARENA_H; y += GRID_MAJOR) {
    ctx.moveTo(0, y + oy); ctx.lineTo(CFG.ARENA_W, y + oy);
  }
  ctx.stroke();
}
export function drawVignette() {
  const puls = decor.pulse > 0
    ? 1 + decor.pulse * Math.sin(performance.now() / 2600)
    : 1;
  const fog = weather?.id === WX_BRUME;
  const bv = bossVignette();
  if (!vignette || decor.pulse > 0 || fog || bv !== 1) {
    const r = Math.hypot(CFG.VIEW_W, CFG.VIEW_H) / 2;
    const from = Math.max(0, decor.vignetteFrom + (fog ? BIOME_CFG.FOG_FROM : 0));
    const amt = decor.vignette * puls * (fog ? BIOME_CFG.FOG_VIGNETTE : 1) * bv;
    setVignette(ctx.createRadialGradient(
      CFG.VIEW_W / 2, CFG.VIEW_H / 2, r * Math.min(0.9, from),
      CFG.VIEW_W / 2, CFG.VIEW_H / 2, r));
    vignette.addColorStop(0, alpha(SURFACE.void, 0));
    vignette.addColorStop(1, alpha(SURFACE.void, Math.min(1, amt)));
  }
  ctx.save();
  ctx.translate(camera.x0, camera.y0);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.restore();
}
export function drawArenaBounds(b) {
  if (!b) return;
  const full = b.x0 <= 0 && b.y0 <= 0 && b.x1 >= CFG.ARENA_W && b.y1 >= CFG.ARENA_H;

  if (!full) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
    ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.fillStyle = alpha(SURFACE.void, 0.72);
    ctx.fill("evenodd");
    ctx.restore();

    ctx.strokeStyle = alpha(ZONE.edge, 0.75);
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x0 + 1.5, b.y0 + 1.5, b.x1 - b.x0 - 3, b.y1 - b.y0 - 3);
  }

  if (b.warn > 0) {
    ctx.strokeStyle = BOSS.barWarn;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(b.nx0, b.ny0, b.nx1 - b.nx0, b.ny1 - b.ny0);
    ctx.setLineDash([]);
  }
}
const OBST_RELIEF = 7;
const OBST_OMBRE = 9;

export function drawObstacles(cover) {
  const list = obstaclesActifs();
  if (!list.length) return;
  const biome = biomeAt(biomeIndex).key;
  const S = skin();
  const C = contourDe(biome);
  const ox = camera.x0 + CFG.VIEW_W / 2, oy = camera.y0 + CFG.VIEW_H / 2;
  // L'OMBRE PORTEE LIT `lumDir()`, le relief reste RADIAL : l'un dit d'ou vient
  // la lumiere, l'autre ou est la camera. Deux gestes distincts, pas deux
  // reglages du meme.
  const dir = lumDir();

  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    const k = o.maxHp > 0 ? (cover?.find(c => c[0] === i)?.[1] ?? 1) : 1;
    if (o.maxHp > 0 && k <= 0) continue;

    const dx = o.x - ox, dy = o.y - oy;
    const d = Math.hypot(dx, dy) || 1;
    const rx = (dx / d) * OBST_RELIEF, ry = (dy / d) * OBST_RELIEF;

    ctx.save();
    ctx.translate(o.x + dir[0] * OBST_OMBRE, o.y + dir[1] * OBST_OMBRE);
    silhouetteBloc(ctx, o, biome);
    ctx.fillStyle = alpha("#000000", 0.34);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(o.x + rx, o.y + ry);
    silhouetteBloc(ctx, o, biome);
    ctx.fillStyle = o.maxHp > 0 ? BIOME.cover : S.bloc;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(o.x, o.y);
    silhouetteBloc(ctx, o, biome);
    ctx.fillStyle = alpha(o.maxHp > 0 ? BIOME.cover : S.bloc, 0.55);
    ctx.fill();
    ctx.strokeStyle = alpha(o.maxHp > 0 ? BIOME.coverEdge : S.blocEdge,
                            o.maxHp > 0 ? 0.45 : C.plat);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(o.x + rx, o.y + ry);
    silhouetteBloc(ctx, o, biome);
    ctx.strokeStyle = alpha(o.maxHp > 0 ? BIOME.coverEdge : S.blocEdge,
                            o.maxHp > 0 ? 0.7 : C.relief);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (gfx > GFX_LOW) {
      habillerBloc(o, rx, ry, biome, S);
      dessinerLed(ledDe(o), rx, ry);
    }

    if (o.maxHp > 0) {
      ctx.save();
      ctx.translate(o.x + rx, o.y + ry);
      silhouetteBloc(ctx, o, biome);
      ctx.strokeStyle = alpha(BIOME.coverEdge, 0.85);
      ctx.lineWidth = 2;
      ctx.setLineDash([Math.max(3, 14 * k), 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}
// UN CHAMP DE PARTICULES SANS PARTICULES : la position d'un brin est une
// fonction de son indice et du temps, donc rien ne s'alloue, rien ne se garde
// entre deux images, et deux clients voient la meme chose. Un seul `stroke`
// pour tout le champ.
// le champ couvre un DISQUE (il tourne avec le vent) et la vue en prend un peu
// moins de la moitie : mesure, 220 brins en laissent une bonne quatre-vingtaine
// a l'ecran.
const CHAMP_MAX = 220;
function h01(i) {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
function enroule(v, centre, demi) {
  const p = 2 * demi;
  let d = (v - centre + demi) % p;
  if (d < 0) d += p;
  return centre + d - demi;
}
// le champ est ancre au MONDE et non a la camera : sinon il glisse avec le
// joueur, et le vent parait accroche a lui au lieu de traverser l'arene.
// `cx0/cy0/rayon` ancrent le champ sur une SOURCE au lieu de la vue : c'est le
// seul ecart entre la meteo et la vapeur d'un geyser. Parametres positionnels et
// non un objet d'options — le module ne doit rien allouer par image.
function champ(tm, ang, vitesse, longueur, nombre, couleur, opacite, epaisseur,
               cx0, cy0, rayon) {
  const demi = (rayon ?? Math.hypot(CFG.VIEW_W, CFG.VIEW_H) / 2) + longueur;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const cx = cx0 ?? camera.x0 + CFG.VIEW_W / 2;
  const cy = cy0 ?? camera.y0 + CFG.VIEW_H / 2;
  const cu = cx * ca + cy * sa, cw = cy * ca - cx * sa;
  const portee = demi * 2;

  ctx.beginPath();
  for (let i = 0; i < nombre; i++) {
    const u = enroule(h01(i) * portee + tm * vitesse, cu, demi);
    const w = enroule(h01(i + 7919) * portee, cw, demi);
    const l = longueur * (0.55 + 0.45 * h01(i + 104729));
    const x = u * ca - w * sa, y = u * sa + w * ca;
    ctx.moveTo(x, y);
    ctx.lineTo(x - ca * l, y - sa * l);
  }
  ctx.strokeStyle = alpha(couleur, opacite);
  ctx.lineWidth = epaisseur;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";
}

// LE VENT SE VOIT, SINON IL N'EST QU'UNE DERIVE INEXPLIQUEE. La densite, la
// longueur et la vitesse des brins lisent toutes la meme `force`, donc une
// accalmie se voit avant de se sentir.
export function drawWeather(tm) {
  if (!weather) return;
  if (weather.id === WX_BOURRASQUE) {
    const v = windAt(weather, tm);
    if (!v) return;
    champ(tm, v.ang, 520 + 1150 * v.force, 30 + 82 * v.force,
          Math.round(CHAMP_MAX * (0.35 + 0.65 * v.force)),
          WEATHER.wind, 0.05 + 0.15 * v.force, 1.2);
    return;
  }
  if (weather.id === WX_CENDRES) {
    const ang = Math.PI / 2 + Math.sin(tm * 0.11 + weather.p1) * 0.22;
    champ(tm, ang, 108, 9, CHAMP_MAX, WEATHER.ash, 0.20, 2.1);
  }
}

/* LE MONDE NE DOIT PAS SEMBLER MORT QUAND LE JOUEUR S'ARRETE. Tout reutilise
   `champ()` : la position d'un brin reste une fonction de son indice et du
   temps, donc ce lot n'alloue rien et ne peut pas deriver — si un effet avait
   besoin d'un tableau qui persiste, il ne serait pas ici, il serait dans `fx.js`
   sous `PARTICLE_MAX`.

   TOUT RESTE DISCRET : a l'arret quelque chose bouge et on ne sait pas dire
   quoi ; en mouvement on ne le remarque pas. */
const POUSSIERE = 150;

/* LA POUSSIERE N'EST PAS LA MEME PARTOUT. Dans le vide il n'y a pas d'air, donc
   rien ne reste en suspension : ce qui derive est du DEBRIS — cinq fois plus
   lent, deux fois plus court, et froid. Il derive dans DEUX sens : deux nappes
   croisees se lisent comme un volume, une seule comme du vent, et il n'y a pas
   de vent dans le vide. */
const AMBIANCE = {
  nebuleuse: { v: 5, l: 3, n: 110, col: PROP.givre, a: 0.075, e: 1.9,
               contre: { ang: -1.9, v: 3, l: 5, n: 60, a: 0.045, e: 1.3 } },
  // LA FRICHE N A PLUS DE VENTILATION, DONC PLUS DE COURANT D AIR. Ce qui
  // derive ici n est pas de la poussiere d atelier chassee par une soufflerie :
  // c est ce que la brousse relache, deux fois plus lent, plus court, moins
  // nombreux — et VERT, la seule matiere en suspension du depot qui ne soit pas
  // minerale. Un lieu abandonne se reconnait aussi a ce qu il ne souffle plus.
  friche: { v: 11, l: 4, n: 84, col: PROP.vert, a: 0.070, e: 1.5 },
};
const AMB_DEFAUT = { v: 24, l: 5, n: POUSSIERE, col: WEATHER.wind, a: 0.055, e: 1.6 };

export function drawAtmosphere(tm) {
  if (gfx < GFX_HIGH) return;

  const A = AMBIANCE[biomeAt(biomeIndex).key] ?? AMB_DEFAUT;
  champ(tm, Math.PI * 0.62 + Math.sin(tm * 0.07) * 0.30, A.v, A.l,
        A.n, A.col, A.a, A.e);
  if (A.contre) {
    const c = A.contre;
    champ(tm, c.ang + Math.sin(tm * 0.04) * 0.22, c.v, c.l, c.n, A.col, c.a, c.e);
  }

  for (const h of hazardsActifs()) {
    if (h.kind === HZ_SLOW || h.kind === HZ_SLIP) continue;
    const st = hazardState(h, tm);
    if (!st.on || !inView(st.x, st.y, h.r)) continue;
    champ(tm, -Math.PI / 2, 30, 15, 14, WEATHER.wind, 0.10 * st.k, 3.2,
          st.x, st.y, h.r * 0.75);
  }

  // UN COFFRET QUI GRESILLE EST DU DECOR ; un coffret qui gresille, crache trois
  // etincelles et eclaire son pourtour est un OBJET. Les deux autres canaux sont
  // deja ecrits, celui-ci ferme le troisieme — et il lit la meme declaration.
  forEachPropLight((x, y, r, col, i) => {
    if (i < 0.55 || !inView(x, y, 40)) return;
    champ(tm, Math.PI * 0.52, 110, 7, 4, col, 0.34 * i, 1.4, x, y, 20);
  });

  /* LA CHALEUR MONTE, ET C'EST LE SEUL EFFET DE CE LIEU QUI TRAVERSE LE CENTRE.
     Elle ne le traverse pas comme un champ de meteo : elle est ANCREE sur chaque
     regard, donc elle dit ou est la source au lieu de teinter la vue. Une
     distorsion thermique aurait demande un second tampon et un blit par image
     pour le meme mot ; un brin qui monte le dit avec un `stroke`. */
  if (biomeAt(biomeIndex).key === "fonderie") {
    const c = couleeDe(biomeSeed, CFG.ARENA_W, CFG.ARENA_H, obstaclesActifs(), hazardsActifs());
    for (const r of c.regards) {
      if (!inView(r.x, r.y, 70)) continue;
      const k = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(tm * 0.5 + r.ph * 9));
      champ(tm, -Math.PI / 2, 34, 16, 9, PROP.fonte, 0.09 * k, 2.6, r.x, r.y, 30);
    }
  }

  // L'USINE RESPIRE. La bouffee sort DU BLOC et dans la direction de sa bouche —
  // un jet vertical partout dirait qu'il y a un plafond, et il n'y en a pas. La
  // declaration vit dans `blocs.js` : ici on la LIT, comme un danger.
  for (const o of obstaclesActifs()) {
    const e = evacDe(o);
    if (!e || !inView(e.x, e.y, 90)) continue;
    const k = evacEtat(e, tm);
    if (k <= 0.02) continue;
    champ(tm, Math.atan2(e.dy, e.dx), 44 + 60 * k, 13, Math.round(4 + 10 * k),
          WEATHER.wind, 0.13 * k, 3.4, e.x + e.dx * 14, e.y + e.dy * 14, 46);
  }

  // LE BOSS RESPIRE DANS L'ARENE. Il arrive en dernier et sur toute la vue :
  // c'est le seul champ qui ait le droit de traverser le centre, parce qu'il
  // annonce ce qui s'y trouve.
  const ba = bossAtmo();
  if (ba) {
    champ(tm, -Math.PI / 2 + Math.sin(tm * 0.13) * 0.4, 46, 11,
          Math.round(90 * ba.k), ba.col, 0.075 * ba.k, 2.2);
  }
}

/* LE PREMIER PLAN. Trois regles sans exception : rien au centre (il appartient
   au joueur), jamais opaque, et coupe pendant un boss — l arene se resserre deja
   a une vue, y ajouter du bord serait le contraire de ce que le resserrement
   cherche.

   ET IL PARLE DU LIEU. Les memes colonnes grises dans les quatre biomes etaient
   la derniere piece qui les rendait interchangeables jusque dans les bords :
   l Usine porte une PASSERELLE et ses conduites, la Fonderie des CHEMINEES et
   leur fumee, la Friche un GRILLAGE affaisse, la Nebuleuse des HAUBANS. Meme
   budget de dessin, quatre lectures.

   La parallaxe est une DERIVE globale proportionnelle a la position de camera :
   assez pour donner la profondeur, trop peu pour attirer l oeil. */
const PP_PARALLAXE = 0.055;
const PP_BANDE = 0.155;
export function drawPremierPlan(v) {
  if (gfx < GFX_HIGH || v.boss) return;
  const h = CFG.VIEW_H * PP_BANDE;
  const dx = (camera.x - CFG.ARENA_W / 2) * PP_PARALLAXE;
  const dy = (camera.y - CFG.ARENA_H / 2) * PP_PARALLAXE;
  const cle = biomeAt(biomeIndex).key;

  ctx.save();
  ctx.translate(camera.x0, camera.y0);

  for (const haut of [true, false]) {
    const y0 = haut ? 0 : CFG.VIEW_H;
    const g = ctx.createLinearGradient(0, y0, 0, haut ? h : CFG.VIEW_H - h);
    g.addColorStop(0, alpha(SURFACE.void, cle === "fonderie" ? 0.42 : 0.34));
    g.addColorStop(1, alpha(SURFACE.void, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, haut ? 0 : CFG.VIEW_H - h, CFG.VIEW_W, h);
  }

  if (cle === "friche") grillage(h, dx, dy);
  else if (cle === "fonderie") cheminees(h, dx, dy);
  else if (cle === "nebuleuse") haubans(h, dx, dy);
  else passerelle(h, dx, dy);

  ctx.restore();
}

// L USINE : une passerelle continue et ses conduites. C est la seule silhouette
// des quatre qui soit HORIZONTALE — elle dit que l installation est construite.
function passerelle(h, dx, dy) {
  ctx.fillStyle = alpha(SURFACE.void, 0.34);
  for (const haut of [true, false]) {
    const yb = haut ? h * 0.42 - dy * 0.4 : CFG.VIEW_H - h * 0.42 - dy * 0.4;
    ctx.fillRect(-40, yb - 9, CFG.VIEW_W + 80, 18);
    for (let i = 0; i < 7; i++) {
      const x = ((i * 263 + dx) % (CFG.VIEW_W + 200)) - 100;
      ctx.fillRect(x, haut ? -20 : yb, 13, haut ? yb + 20 : CFG.VIEW_H - yb + 20);
    }
    ctx.fillStyle = alpha(SURFACE.void, 0.26);
    ctx.fillRect(-40, haut ? yb + 15 : yb - 21, CFG.VIEW_W + 80, 6);
    ctx.fillStyle = alpha(SURFACE.void, 0.34);
  }
}

// LA FONDERIE : des cheminees larges, et la fumee qui en sort DEBORDE sur la
// bande — c est ce qui la rend chaude sans une seule touche d orange.
function cheminees(h, dx, dy) {
  for (let i = 0; i < 4; i++) {
    const x = ((i * 431 + dx) % (CFG.VIEW_W + 320)) - 160;
    const haut = (i & 1) === 0;
    const ep = 44 + (i % 3) * 16;
    const y = haut ? -20 - dy * 0.4 : CFG.VIEW_H - h * 0.86 - dy * 0.4;
    ctx.fillStyle = alpha(SURFACE.void, 0.46);
    ctx.fillRect(x, y, ep, h * 1.05);
    ctx.fillRect(x - 6, haut ? y + h * 0.95 : y, ep + 12, 11);
    const f = ctx.createRadialGradient(x + ep / 2, haut ? y + h : y, 0,
                                       x + ep / 2, haut ? y + h : y, 130);
    f.addColorStop(0, alpha(SURFACE.void, 0.30));
    f.addColorStop(1, alpha(SURFACE.void, 0));
    ctx.fillStyle = f;
    ctx.fillRect(x + ep / 2 - 130, (haut ? y + h : y) - 130, 260, 260);
  }
}

// LA FRICHE : un grillage affaisse. Des poteaux qui ne sont plus d aplomb et
// une maille qui pend entre eux — la seule silhouette des quatre qui ne tienne
// pas droit.
function grillage(h, dx, dy) {
  const pas = 118;
  for (const haut of [true, false]) {
    const yb = haut ? h * 0.92 - dy * 0.4 : CFG.VIEW_H - h * 0.92 - dy * 0.4;
    const y0 = haut ? -20 : CFG.VIEW_H + 20;
    ctx.strokeStyle = alpha(SURFACE.void, 0.30);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = -pas; x < CFG.VIEW_W + pas; x += 15) {
      const u = ((x + dx) % pas) / pas;
      const creux = Math.sin(u * Math.PI) * 14 * (haut ? 1 : -1);
      const y = yb + creux;
      ctx.moveTo(x, y0); ctx.lineTo(x, y);
    }
    for (let k = 0; k < 4; k++) {
      const t = (k + 1) / 5;
      for (let x = -pas; x < CFG.VIEW_W + pas; x += 15) {
        const u = ((x + dx) % pas) / pas;
        const creux = Math.sin(u * Math.PI) * 14 * (haut ? 1 : -1);
        const y = y0 + (yb + creux - y0) * t;
        x === -pas ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.fillStyle = alpha(SURFACE.void, 0.44);
    for (let i = 0; i < 6; i++) {
      const x = ((i * pas + dx) % (CFG.VIEW_W + 200)) - 100;
      const pen = ((i * 7) % 5 - 2) * 3;
      ctx.save();
      ctx.translate(x, yb);
      ctx.rotate(pen * 0.012);
      ctx.fillRect(-4, haut ? -h - 20 : 0, 8, h + 20);
      ctx.restore();
    }
  }
}

/* LA NEBULEUSE : des VOILURES et un ratelier d'antennes. Les haubans etaient des
   traits noirs a 0,40 sur le fond le plus sombre du jeu — ils n'existaient pas a
   l'ecran. Une voilure a une SURFACE, donc elle se lit meme en noir sur noir :
   c'est le decoupage de sa trame qui la dessine, pas son contour.

   Un liseré froid a 0,10 sur l'arete haute, et c'est tout ce que ce lieu
   s'autorise : la regle est que le premier plan assombrit, il n'eclaire pas —
   mais une arete a 10 % ne fait pas de lumiere, elle rend la forme lisible. */
function haubans(h, dx, dy) {
  for (let i = 0; i < 4; i++) {
    const x = ((i * 449 + dx) % (CFG.VIEW_W + 340)) - 170;
    const haut = (i & 1) === 0;
    const w = 132 + (i % 3) * 38, hh = h * (0.72 + (i % 2) * 0.22);
    const y = haut ? -18 - dy * 0.4 : CFG.VIEW_H + 18 - hh - dy * 0.4;
    const pen = ((i * 5) % 3 - 1) * 0.05;

    ctx.save();
    ctx.translate(x + w / 2, y + hh / 2);
    ctx.rotate(pen);
    ctx.fillStyle = alpha(SURFACE.void, 0.46);
    ctx.fillRect(-w / 2, -hh / 2, w, hh);
    // LA TRAME : c'est elle qui dit « panneau solaire » et non « bloc noir ».
    ctx.strokeStyle = alpha(SURFACE.void, 0.62);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 1; k < 5; k++) {
      const u = -w / 2 + (w / 5) * k;
      ctx.moveTo(u, -hh / 2); ctx.lineTo(u, hh / 2);
    }
    ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
    ctx.stroke();
    ctx.strokeStyle = alpha(PROP.givre, 0.10);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w / 2, haut ? hh / 2 : -hh / 2);
    ctx.lineTo(w / 2, haut ? hh / 2 : -hh / 2);
    ctx.stroke();
    // LE MAT qui la porte : une voilure sans bras flotte sans raison.
    ctx.fillStyle = alpha(SURFACE.void, 0.52);
    ctx.fillRect(-5, haut ? -hh / 2 - 30 : hh / 2, 10, 34);
    ctx.restore();
  }

  // LE RATELIER D'ANTENNES : trois mats fins et leurs traverses. C'est le seul
  // detail fin de ce bord, et il donne l'echelle des voilures.
  ctx.strokeStyle = alpha(SURFACE.void, 0.50);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const x = ((i * 661 + dx) % (CFG.VIEW_W + 280)) - 140;
    const haut = (i & 1) === 1;
    const y0 = haut ? -18 - dy * 0.4 : CFG.VIEW_H + 18 - dy * 0.4;
    const y1 = haut ? h * 0.86 : CFG.VIEW_H - h * 0.86;
    ctx.moveTo(x, y0); ctx.lineTo(x, y1);
    for (let k = 1; k <= 3; k++) {
      const y = y0 + (y1 - y0) * (k / 4);
      const l = 15 - k * 3;
      ctx.moveTo(x - l, y); ctx.lineTo(x + l, y);
    }
  }
  ctx.stroke();
}

export function drawWalls(w) {
  if (!w) return;
  const t = w.t;
  ctx.fillStyle = alpha(WALL.fill, 0.30);
  ctx.fillRect(w.x - t / 2, 0, t, CFG.ARENA_H);
  ctx.fillRect(0, w.y - t / 2, CFG.ARENA_W, t);
  ctx.strokeStyle = alpha(WALL.edge, 0.85);
  ctx.lineWidth = 2;
  ctx.strokeRect(w.x - t / 2, 0, t, CFG.ARENA_H);
  ctx.strokeRect(0, w.y - t / 2, CFG.ARENA_W, t);
}
