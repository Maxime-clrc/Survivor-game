
import { BIOMES, BIOME_CFG, CFG, HZ_SLIP, HZ_SLOW, WX_BOURRASQUE, WX_BRUME, WX_CENDRES, biomeAt, buildBiome, hazardState, windAt } from "/shared/game_state.js";
import { BIOME, BOSS, PROP, SURFACE, WALL, WEATHER, ZONE, alpha } from "/shared/palette.js";
import { GFX_HIGH, GFX_LOW, difficulty, gfx } from "../core/state.js";
import { drawGridPings } from "./fx.js";
import { souffleDe } from "./dangers.js";
import { couleeDe, floorPattern, fondEspace, macroPattern } from "./material.js";
import { mulberry32 } from "/shared/biomes.js";
import { bossAtmo, bossVignette } from "./lumiere.js";
import { contourDe, dessinerLed, evacDe, evacEtat, habillerBloc, ledDe, silhouetteBloc } from "./blocs.js";
import { forEachPropLight } from "./props.js";
import { GRID_FINE, GRID_MAJOR, biomeIndex, biomeSeed, camera, ctx, decor, hazardsActifs, hazardsDuLieu, inView, lumDir, obstaclesActifs, renderScale, setVignette, skin, sol, vignette, weather } from "./stage.js";

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
  orbite(x, y, w, h);

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
/* LE PLAN INTERMEDIAIRE, ET IL MANQUAIT. Le fond avait trois vitesses — astres
   0,05, gaz 0,10, etoiles 0,16 — donc trois couches toutes a l INFINI ou
   presque : rien entre le ciel et le plancher sur lequel on marche. Or c est
   exactement la que se joue la sensation d espace : une structure qu on depasse
   dit la distance, une etoile ne le peut pas.

   IL N EST PAS CUIT, et c est ce qui le rend possible. Une quatrieme image de
   2 200 x 1 500 aurait coute 13 Mo pour une couche dont l occupation utile fait
   quelques pour cent ; ce sont des SILHOUETTES, donc des chemins. Elles sont
   ancrees a une grille de l espace intermediaire, tirees par graine — meme
   motif que `props.js`, avec la parallaxe en plus.

   IL NE SE DESSINE QUE DANS LES BAIES. Sous un plancher a 0,93 il aurait coute
   une passe pleine vue pour rester invisible, exactement l argument qui a sorti
   les etoiles de `drawFond()`. Et il passe SOUS le voile de verre : le decor
   perd du contraste avant le gameplay, jamais l inverse.

   0,22 est PLUS RAPIDE que les etoiles (0,16), donc plus proche, donc dessine
   APRES elles : une station qui passerait derriere une etoile serait le seul
   endroit du jeu ou la profondeur mentirait. */
const ORBITE_P = 0.22;
const ORBITE_CELL = 620;
const ORBITE_TAUX = 0.46;

function orbite(X, Y, W, H) {
  if (gfx < GFX_HIGH) return;
  const s = biomeSeed >>> 0;
  const bx = camera.x0 - (camera.x - CFG.ARENA_W / 2) * ORBITE_P;
  const by = camera.y0 - (camera.y - CFG.ARENA_H / 2) * ORBITE_P;
  const c0x = Math.floor((X - bx) / ORBITE_CELL), c1x = Math.floor((X + W - bx) / ORBITE_CELL);
  const c0y = Math.floor((Y - by) / ORBITE_CELL), c1y = Math.floor((Y + H - by) / ORBITE_CELL);
  // UNE SEULE DIRECTION DE LUMIERE pour toute la couche : dans le vide il y a
  // un astre, pas douze. Deux silhouettes eclairees de deux cotes se lisent
  // comme deux images collees.
  const la = hCell(0, 0, s + 907) * Math.PI * 2;
  const lx = Math.cos(la), ly = Math.sin(la);

  for (let cy = c0y; cy <= c1y; cy++) {
    for (let cx = c0x; cx <= c1x; cx++) {
      if (hCell(cx, cy, s + 51) >= ORBITE_TAUX) continue;
      const ux = bx + (cx + 0.18 + hCell(cx, cy, s + 61) * 0.64) * ORBITE_CELL;
      const uy = by + (cy + 0.18 + hCell(cx, cy, s + 71) * 0.64) * ORBITE_CELL;
      const r = 34 + hCell(cx, cy, s + 81) * 46;
      if (ux + r * 2 < X || ux - r * 2 > X + W) continue;
      if (uy + r * 2 < Y || uy - r * 2 > Y + H) continue;
      const k = hCell(cx, cy, s + 91);
      ctx.save();
      ctx.translate(ux, uy);
      ctx.rotate((hCell(cx, cy, s + 101) - 0.5) * 2.4);
      if (k < 0.38) asteroide(r, lx, ly, hCell(cx, cy, s + 111));
      else if (k < 0.76) moduleOrbital(r, lx, ly, hCell(cx, cy, s + 121));
      else epaveOrbitale(r, lx, ly, hCell(cx, cy, s + 131));
      ctx.restore();
    }
  }
}

// LE CORPS EST PRESQUE NOIR ET LE BORD PRESQUE SEUL A SE VOIR. C est ce qui
// tient la couche derriere le gameplay : une silhouette n a pas d interieur.
function corpsOrbital(trace, lx, ly, r, bord) {
  trace();
  ctx.fillStyle = alpha("#04060c", 0.88);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(-lx * r, -ly * r, lx * r * 0.4, ly * r * 0.4);
  g.addColorStop(0, alpha(bord, 0.30));
  g.addColorStop(1, alpha(bord, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
  ctx.restore();
}

function asteroide(r, lx, ly, p) {
  const n = 9;
  corpsOrbital(() => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const d = r * (0.62 + 0.38 * h01(Math.round(p * 9973) + i));
      const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.82;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }, lx, ly, r, PROP.givre);
  // deux crateres, du cote eclaire seulement : a l ombre on ne verrait rien.
  ctx.fillStyle = alpha("#000000", 0.34);
  for (let i = 0; i < 2; i++) {
    const cr = r * (0.14 + 0.10 * h01(Math.round(p * 7919) + i));
    ctx.beginPath();
    ctx.arc(-lx * r * (0.30 + i * 0.24), -ly * r * (0.30 + i * 0.24) + r * 0.1, cr, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* UN MODULE ORBITAL EST UNE POUTRE AVEC DES CAISSONS DESSUS ET DEUX VOILURES.
   C est la meme grammaire que la travee du plan de jeu, a une autre echelle :
   la station dont les fragments jonchent l arene est CELLE-LA, et c est ce qui
   raccorde les deux plans au lieu d en faire deux decors. */
function moduleOrbital(r, lx, ly, p) {
  const L = r * 1.9, T = r * 0.30;
  corpsOrbital(() => {
    ctx.beginPath();
    ctx.rect(-L / 2, -T / 2, L, T);
  }, lx, ly, r, PROP.givre);

  for (let i = 0; i < 3; i++) {
    if (h01(Math.round(p * 6151) + i) < 0.35) continue;
    const cw = r * (0.26 + 0.16 * h01(Math.round(p * 4093) + i));
    const cx = (i - 1) * L * 0.30;
    corpsOrbital(() => {
      ctx.beginPath();
      ctx.rect(cx - cw / 2, -T * 1.5, cw, T * 3);
    }, lx, ly, r, PROP.givre);
  }

  // LES VOILURES. Elles sont FINES et longues, donc elles donnent l echelle :
  // un caisson seul pourrait etre a n importe quelle distance.
  ctx.fillStyle = alpha("#0a1424", 0.80);
  ctx.strokeStyle = alpha(PROP.givre, 0.16);
  ctx.lineWidth = 1;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.rect(-L * 0.10, d * T * 1.7, L * 0.20, d * r * 0.9);
    ctx.fill(); ctx.stroke();
  }

  // LES FEUX. Deux, lents, jamais synchrones avec ceux du plan de jeu : ils
  // battent quatre fois plus lentement, donc on ne les confond pas avec un
  // objet qu on peut atteindre.
  const t = performance.now() / 1000;
  for (let i = 0; i < 2; i++) {
    const u = (t * 0.22 + p + i * 0.5) % 1;
    if (u > 0.10) continue;
    ctx.fillStyle = alpha(PROP.balise, 0.55 * (1 - u / 0.10));
    ctx.beginPath();
    ctx.arc((i ? 1 : -1) * L * 0.46, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* UNE EPAVE EST UNE COQUE OUVERTE. Elle porte le meme cisaillement que le
   fragment du plan de jeu — un flanc net, l autre dechire —, et c est la
   troisieme fois que le lieu raconte la meme chose : une station qui s est
   rompue. */
function epaveOrbitale(r, lx, ly, p) {
  const L = r * 2.1, T = r * 0.52;
  corpsOrbital(() => {
    ctx.beginPath();
    ctx.moveTo(-L / 2, -T / 2);
    ctx.lineTo(L * 0.24, -T / 2);
    ctx.lineTo(L / 2, -T * 0.10);
    ctx.lineTo(L * 0.30, T / 2);
    ctx.lineTo(-L / 2, T / 2);
    ctx.closePath();
  }, lx, ly, r, PROP.givre);

  ctx.strokeStyle = alpha(PROP.givre, 0.13);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const x = -L / 2 + (i / 4) * L * 0.8;
    ctx.moveTo(x, -T / 2 + 1.5); ctx.lineTo(x, T / 2 - 1.5);
  }
  ctx.stroke();

  // LA DECHIRURE : quelques membrures qui depassent du bout ouvert.
  ctx.strokeStyle = alpha(PROP.metalDark, 0.75);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = (-0.5 + (i + 0.5) / 3) * T;
    const l = r * (0.10 + 0.16 * h01(Math.round(p * 8161) + i));
    ctx.moveTo(-L / 2, y);
    ctx.lineTo(-L / 2 - l, y + (i - 1) * 2);
  }
  ctx.stroke();
}

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

/* LE REPERE, ET IL Y EN A UN SEUL PAR ARENE. Le semis est homogene du premier
   au dernier pixel : rien ne dit ou l on est, donc une arene de 4 800 x 2 700 se
   traverse sans jamais se situer. Ce qui manque n est pas du detail, c est un
   POINT UNIQUE — la chose qu on montre du doigt.

   IL EST PLAQUE AU SOL, ET CE N EST PAS UNE ECONOMIE. Un grand objet qui aurait
   du volume mentirait : le pathfinding verrait du vide la ou l œil voit une
   masse, et c est exactement l erreur que la charte interdit. Ce qui se lit
   comme bloquant est un OBSTACLE, dans `biomes.js`, avec son AABB. Un repere est
   une EMPREINTE — un socle, une fosse, un creuset, un collier — donc le plus
   grand element du lieu est aussi celui qui ne coute pas un pixel de collision.

   Il se dessine SOUS la grille de 20 m : la graduation reste la seule chose de
   l ecran qui serve a lire une portee, et rien ne passe devant elle.

   IL N EMET PAS DE LUMIERE. Le tampon a deja les gueules de four, les regards de
   la coulee, les props emissifs et les joueurs ; une source de 900 px le rendrait
   uniformement clair, ce qui est le contraire de ce que la Fonderie cherche. */
const AMER_R = 460;
const AMER_POSES = [[0.30, 0.34], [0.70, 0.66], [0.72, 0.28], [0.28, 0.72],
                    [0.50, 0.36], [0.50, 0.64], [0.18, 0.50], [0.82, 0.50],
                    [0.40, 0.20], [0.60, 0.80], [0.36, 0.52], [0.64, 0.48],
                    [0.22, 0.26], [0.78, 0.74]];
let amerCache = null;

/* ON PREND LE MOINS MAUVAIS, PAS LE PREMIER QUI PASSE. En cauchemar l arene
   porte jusqu a 45 dangers : un « premier emplacement libre » n aurait aucune
   garantie d exister, et un repli silencieux poserait l amer sur une flaque —
   deux marquages au sol au meme endroit, dont un seul blesse.

   CHAQUE CANDIDAT A SON PROPRE ECART, et c est ce qui rend la recherche reelle.
   Le premier jet tirait UN decalage applique aux six : le jeu de candidats etait
   donc un motif rigide translate en bloc, donc six essais qui reussissaient ou
   echouaient presque ensemble. `verifierAmers()` a signale la Friche — le lieu le
   plus dense — a 139 a 186 px pour une garde de 187, sur onze graines : le defaut
   n etait pas la garde, c etait le nombre de points reellement distincts. */
function amerDe(seed, cle, hazards) {
  const c = `${seed}|${cle}|${hazards.length}`;
  if (amerCache && amerCache.c === c) return amerCache.v;
  const rand = mulberry32((seed >>> 0) * 3571 + 13);
  const depart = (rand() * AMER_POSES.length) | 0;

  let best = null, bestD = -Infinity;
  for (let i = 0; i < AMER_POSES.length; i++) {
    const p = AMER_POSES[(depart + i) % AMER_POSES.length];
    const x = clampAmer(p[0] * CFG.ARENA_W + (rand() - 0.5) * 300, CFG.ARENA_W);
    const y = clampAmer(p[1] * CFG.ARENA_H + (rand() - 0.5) * 240, CFG.ARENA_H);
    let d = Infinity;
    for (const h of hazards) d = Math.min(d, Math.hypot(x - h.x, y - h.y) - h.r);
    if (d > bestD) { bestD = d; best = [x, y]; }
  }
  amerCache = { c, v: { x: best[0], y: best[1], a: rand() * Math.PI * 2 } };
  return amerCache.v;
}

const clampAmer = (v, max) => Math.min(Math.max(v, AMER_R), max - AMER_R);

const AMERS = {
  friche: tourEffondree,
  usine: coeurDeLigne,
  fonderie: creuset,
  nebuleuse: sasAmarrage,
  secteur: carrefour,
};

export function drawAmer() {
  const cle = biomeAt(biomeIndex).key;
  const f = AMERS[cle];
  if (!f) return;
  const r = amerDe(biomeSeed, cle, hazardsDuLieu());
  if (!inView(r.x, r.y, AMER_R)) return;
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.a);
  f(AMER_R, skin());
  ctx.restore();
}

/* DEUX MARQUAGES AU SOL AU MEME ENDROIT, DONT UN SEUL BLESSE. C est le seul
   defaut que ce systeme puisse produire, et il ne leve rien : l amer est
   decoratif, le danger a un collider, et superposes ils apprennent au joueur a
   ignorer un marquage au sol. On exige donc une garde entre le CŒUR de l amer et
   tout disque de danger, et on la rejoue sur les quatre lieux, les trois modes et
   toutes les graines demandees.

   La garde porte sur le cœur (`AMER_R x 0,32`) et non sur le rayon plein : les
   anneaux exterieurs sont clairsemes, un danger qui en effleure un ne trompe
   personne — c est le disque central, plein et sombre, qui pourrait passer pour
   une surface. */
const AMER_GARDE = 40;
export function verifierAmers(seeds = [1, 7, 99]) {
  const soucis = [];
  const garde = AMER_R * 0.32 + AMER_GARDE;
  for (let bi = 0; bi < BIOMES.length; bi++) {
    const cle = BIOMES[bi].key;
    if (!AMERS[cle]) { soucis.push(`${cle} : aucun amer declare`); continue; }
    for (let di = 0; di < 3; di++) {
      for (const seed of seeds) {
        const b = buildBiome(bi, di, seed, CFG.ARENA_W, CFG.ARENA_H, CFG.VIEW_W, CFG.VIEW_H);
        amerCache = null;
        const a = amerDe(seed, cle, b.hazards);
        const ou = `${cle}/${["calme", "normal", "cauchemar"][di]}/${seed}`;
        if (a.x < AMER_R || a.y < AMER_R
            || a.x > CFG.ARENA_W - AMER_R || a.y > CFG.ARENA_H - AMER_R) {
          soucis.push(`${ou} : amer a moins de son rayon du bord`);
        }
        for (const h of b.hazards) {
          const d = Math.hypot(a.x - h.x, a.y - h.y) - h.r;
          if (d < garde) {
            soucis.push(`${ou} : amer a ${Math.round(d)} px d'un ${h.kind} `
              + `(garde ${Math.round(garde)})`);
            break;
          }
        }
        /* CE QUE CE VERIFICATEUR NE PEUT PAS VOIR, et il faut le dire ici plutot
           que de faire semblant : `amerDe` rend forcement autre chose sur une
           liste de dangers VIDE — tous les candidats y valent `Infinity`,
           `Infinity > Infinity` est faux, donc c'est le PREMIER qui sort au lieu
           du plus loin. Ce n'est pas un defaut de la fonction, c'est un defaut
           d'APPELANT : `drawAmer` lisait `hazardsActifs()`, vide pendant un
           combat, donc l'amer sautait a l'arrivee du boss et resautait a sa mort
           — 299 cas sur 320, jusqu'a 2 596 px. Il lit `hazardsDuLieu()`, la
           geometrie de la MANCHE. Une mesure ne garde pas cette regle, seule la
           lecture du seul appelant de production le fait. */
      }
    }
  }
  amerCache = null;
  return soucis;
}

// UN ANNEAU EPAIS, en un seul `stroke` : c est la primitive de trois des quatre
// reperes, et elle evite un `arc` plein qui masquerait le sol.
function anneau(r, w, col, a) {
  ctx.strokeStyle = alpha(col, a);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
}

/* FRICHE — L EMBASE DE LA TOUR DE REFROIDISSEMENT. Ce qui reste d une tour n est
   pas la tour : c est son SOCLE, un anneau de beton de trente metres avec le
   bassin au milieu et le pan qui a cede. La brousse a repris le bassin, parce
   que c est la que l eau s est arretee. */
function tourEffondree(R, S) {
  const br = R * 0.34;
  ctx.fillStyle = alpha("#000000", 0.26);
  ctx.beginPath(); ctx.arc(0, 0, R * 0.80, 0, Math.PI * 2); ctx.fill();

  anneau(R * 0.78, 40, "#5a5c50", 0.30);
  anneau(R * 0.78, 40, "#000000", 0.16);
  anneau(R * 0.60, 3, PROP.metalDark, 0.28);

  // LES CONTREFORTS. Une tour repose sur des jambages en V ; il en reste les
  // amorces, et c est ce qui empeche l anneau de se lire comme un cercle peint.
  ctx.strokeStyle = alpha("#6e6a5e", 0.34);
  ctx.lineWidth = 11;
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.moveTo(Math.cos(a) * R * 0.60, Math.sin(a) * R * 0.60);
    ctx.lineTo(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.94);
  }
  ctx.stroke();

  // LE PAN QUI A CEDE : un secteur ou l anneau manque, et l eboulis qui en est
  // sorti. Sans lui c est une installation entretenue.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, R, -0.62, 0.32);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = alpha("#1b1a13", 0.60);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha("#6e6a5e", 0.30);
  for (let i = 0; i < 22; i++) {
    const a = -0.6 + (i * 0.043);
    const d = R * (0.62 + ((i * 7) % 11) / 11 * 0.42);
    const t = 5 + (i % 4) * 3;
    ctx.fillRect(Math.cos(a) * d - t / 2, Math.sin(a) * d - t / 2, t, t * 0.7);
  }
  ctx.restore();

  // LE BASSIN, repris par ce qui pousse : l eau s est arretee la.
  ctx.fillStyle = alpha("#0d1013", 0.34);
  ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.vert, 0.22);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const a = (i * 2.399) % (Math.PI * 2);
    const d = Math.sqrt((i * 0.618) % 1) * br;
    ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d);
    ctx.lineTo(Math.cos(a) * d + Math.cos(a + 1.2) * 9, Math.sin(a) * d + Math.sin(a + 1.2) * 9);
  }
  ctx.stroke();
}

/* USINE — LE CŒUR DE LIGNE. Une usine a un point ou tout converge : le plateau
   tournant qui distribue vers les chaines. Il est PEINT et BOULONNE, pas
   construit : une empreinte de production, avec ses allees qui partent en
   rayons et ses trappes de service. */
function coeurDeLigne(R, S) {
  const p = R * 0.62;
  ctx.fillStyle = alpha("#000000", 0.22);
  ctx.fillRect(-p, -p, p * 2, p * 2);

  // LES ALLEES QUI CONVERGENT : deux lignes continues et pales par allee, jamais
  // des hachures — un marquage hachure se lit comme un telegraphe.
  ctx.strokeStyle = alpha(PROP.peint, 0.26);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    for (const d of [-13, 13]) {
      const nx = -Math.sin(a) * d, ny = Math.cos(a) * d;
      ctx.moveTo(Math.cos(a) * R * 0.34 + nx, Math.sin(a) * R * 0.34 + ny);
      ctx.lineTo(Math.cos(a) * R * 1.02 + nx, Math.sin(a) * R * 1.02 + ny);
    }
  }
  ctx.stroke();

  anneau(R * 0.36, 26, S.bloc, 0.34);
  anneau(R * 0.36, 26, "#000000", 0.14);
  anneau(R * 0.50, 2, PROP.metal, 0.16);

  // LE PLATEAU TOURNANT et sa croix d entrainement.
  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.beginPath(); ctx.arc(0, 0, R * 0.23, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.22);
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22);
  }
  ctx.stroke();

  // LES ANCRAGES : la grille de boulons d une machine qu on a demontee. C est ce
  // qui dit qu il y avait quelque chose, et qu il n y est plus.
  ctx.fillStyle = alpha("#000000", 0.34);
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      const x = i * p * 0.28, y = j * p * 0.28;
      if (Math.hypot(x, y) < R * 0.40 || Math.abs(x) > p || Math.abs(y) > p) continue;
      ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/* FONDERIE — LE CREUSET. Le seul repere des quatre qui soit une FOSSE et non un
   socle : un puits de brique refractaire, ses ceintures, et le CANAL DE COULEE
   qui en sort par un cote. Il ne rougeoie pas — la lumiere du lieu appartient
   aux gueules et aux regards, qui sont, eux, des sources declarees. */
function creuset(R, S) {
  ctx.fillStyle = alpha("#000000", 0.36);
  ctx.beginPath(); ctx.arc(0, 0, R * 0.86, 0, Math.PI * 2); ctx.fill();

  for (let i = 0; i < 4; i++) {
    const r = R * (0.86 - i * 0.13);
    anneau(r, 9, i & 1 ? PROP.brique : PROP.metalDark, 0.30 - i * 0.04);
  }

  // L APPAREILLAGE : les joints de brique rayonnent, decales d une assise a
  // l autre. Un cercle concentrique sans joints est une cible, pas une maconnerie.
  ctx.strokeStyle = alpha("#000000", 0.30);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let a = 0; a < 4; a++) {
    const r0 = R * (0.86 - a * 0.13), r1 = r0 - R * 0.11;
    const n = 26 - a * 3;
    for (let i = 0; i < n; i++) {
      const ang = ((i + (a & 1) * 0.5) / n) * Math.PI * 2;
      ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
      ctx.lineTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    }
  }
  ctx.stroke();

  ctx.fillStyle = alpha("#0a0605", 0.72);
  ctx.beginPath(); ctx.arc(0, 0, R * 0.32, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.scorie, 0.42);
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.32, 0, Math.PI * 2); ctx.stroke();

  // LE TROU DE COULEE. Une rigole franche, orthogonale, qui sort du puits et
  // continue hors du repere : c est ce qui le raccorde au reste du lieu.
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(R * 0.20, -17, R * 0.98, 34);
  ctx.fillStyle = alpha(PROP.scorie, 0.34);
  ctx.fillRect(R * 0.20, -11, R * 0.98, 22);
  ctx.strokeStyle = alpha(PROP.metalDark, 0.50);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(R * 0.20, -17); ctx.lineTo(R * 1.18, -17);
  ctx.moveTo(R * 0.20, 17); ctx.lineTo(R * 1.18, 17);
  ctx.stroke();
}

/* NEBULEUSE — LE COLLIER D AMARRAGE. Un anneau de vingt metres encastre dans le
   pont, avec ses griffes de verrouillage et ses secteurs de guidage. Il dit
   qu on est sur une station A QUAI, et c est la seule chose de ce lieu qui parle
   d autre chose que de rupture. */
function sasAmarrage(R, S) {
  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.beginPath(); ctx.arc(0, 0, R * 0.76, 0, Math.PI * 2); ctx.fill();

  anneau(R * 0.72, 22, S.bloc, 0.34);
  anneau(R * 0.72, 22, "#000000", 0.14);
  anneau(R * 0.50, 3, PROP.givre, 0.16);

  // LES GRIFFES. Huit, orientees dans le meme sens : un verrouillage tourne, et
  // c est ce sens partage qui le dit sans qu il ait besoin de bouger.
  ctx.strokeStyle = alpha(PROP.metalDark, 0.66);
  ctx.lineWidth = 13;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r0 = R * 0.50, r1 = R * 0.70;
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a + 0.26) * r1, Math.sin(a + 0.26) * r1);
  }
  ctx.stroke();
  ctx.lineCap = "butt";

  // LES SECTEURS DE GUIDAGE : des arcs PLEINS, jamais des tirets — un pointille
  // est le langage du telegraphe et il appartient au boss.
  ctx.strokeStyle = alpha(S.emis, 0.20);
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    ctx.arc(0, 0, R * 0.86, a, a + 0.38);
    ctx.moveTo(0, 0);
  }
  ctx.stroke();

  ctx.fillStyle = alpha("#05070d", 0.50);
  ctx.beginPath(); ctx.arc(0, 0, R * 0.30, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.givre, 0.20);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = ((i + 1) / 6) * Math.PI * 2;
    ctx.moveTo(Math.cos(a) * R * 0.29, Math.sin(a) * R * 0.29);
    ctx.lineTo(Math.cos(b) * R * 0.29, Math.sin(b) * R * 0.29);
  }
  ctx.stroke();
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
  secteur: grilleCaniveau,
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
  /* L USINE NE DERIVE PAS, ELLE TIRE. Une installation en marche a une
     ventilation forcee : l air y a UNE direction, tenue, et il va VITE. C est
     ce que le champ commun ne pouvait pas dire — son angle oscillait de ±0,30
     rad, ce qui est la signature d un courant d air libre, donc de tout sauf
     d une extraction. `swing: 0` est le reglage, pas un oubli.
     L angle n est pas horizontal : a 0 exactement les brins se confondraient
     avec le trait franc de la grille de 20 m, qui est le seul autre reseau
     rectiligne de ce lieu. */
  usine: { v: 64, l: 7, n: 130, col: WEATHER.wind, a: 0.045, e: 1.2,
           ang: 0.12, swing: 0 },
  /* DANS UNE FONDERIE, L AIR MONTE. C est la seule chose qu on ne peut pas ne
     pas ressentir sur un plancher a cette temperature, et c est aussi ce qui
     l oppose terme a terme a l Usine juste au-dessus : celle-ci tire vite et
     droit a l horizontale, celle-la monte lentement et epais. Sept fois plus
     lent, deux fois plus long, deux fois moins nombreux, et le trait le plus
     epais du depot — de l air charge se voit, il ne file pas.
     La teinte est la CENDRE et non la fonte : ce qui flotte a refroidi. Le ton
     chaud reste a ce qui brule vraiment — gueules, joints, coulee. */
  fonderie: { v: 9, l: 9, n: 72, col: WEATHER.ash, a: 0.055, e: 2.3,
              ang: -Math.PI / 2, swing: 0.10 },
  /* IL PLEUT DANS LE SECTEUR, ET C EST LA SEULE AMBIANCE DU DEPOT QUI TOMBE. Les
     quatre autres derivent, tirent ou montent ; celle-ci DESCEND, presque a la
     verticale, vite et fin. C est aussi ce qui justifie que son sol soit mouille
     et que ses flaques rendent la lumiere — sans la pluie au-dessus, l eau par
     terre n a pas de cause.
     `swing` est faible mais pas nul : une pluie parfaitement verticale est une
     texture, une pluie qui balance un peu est de la meteo. */
  secteur: { v: 340, l: 18, n: 150, col: "#a8b6d8", a: 0.055, e: 1.1,
             ang: Math.PI / 2 + 0.16, swing: 0.06 },
};
const AMB_ANG = Math.PI * 0.62;
const AMB_SWING = 0.30;

export function drawAtmosphere(tm) {
  if (gfx < GFX_HIGH) return;

  // LES QUATRE LIEUX DECLARENT LEUR AIR. Un cinquieme qui ne le ferait pas n a
  // pas d ambiance du tout : c est visible tout de suite, la ou un repli sur
  // celle d un autre lieu ne se serait jamais signale.
  const A = AMBIANCE[biomeAt(biomeIndex).key];
  if (A) {
    const ang = (A.ang ?? AMB_ANG) + Math.sin(tm * 0.07) * (A.swing ?? AMB_SWING);
    champ(tm, ang, A.v, A.l, A.n, A.col, A.a, A.e);
    if (A.contre) {
      const c = A.contre;
      champ(tm, c.ang + Math.sin(tm * 0.04) * 0.22, c.v, c.l, c.n, A.col, c.a, c.e);
    }
  }

  // CE QUI BLESSE EXHALE SA PROPRE MATIERE. Le sol distingue vingt dangers,
  // l air au-dessus n en distinguait aucun : `dangers.js` porte la table, ici on
  // la LIT — meme contrat que le bloc qui evacue et le regard de coulee.
  for (const h of hazardsActifs()) {
    if (h.kind === HZ_SLOW || h.kind === HZ_SLIP) continue;
    const st = hazardState(h, tm);
    if (!st.on || !inView(st.x, st.y, h.r)) continue;
    const s = souffleDe(h.kind);
    champ(tm, s.ang, s.v, s.l, s.n, s.col, s.a * st.k, s.e,
          st.x, st.y, h.r * s.r);
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
/* LA SILHOUETTE DE BORD, PAR LIEU, EN TABLE. Elle se choisissait par une chaine
   de `if` a defaut implicite, comme la matiere : un cinquieme lieu qui oubliait
   sa branche heritait de la passerelle de l Usine sans que rien ne le dise.
   Une table rend l absence visible, `verifierPremierPlan()` la refuse.

   Les cinq silhouettes ne partagent AUCUNE orientation : passerelle
   horizontale, cheminees verticales et fumantes, grillage affaisse, haubans en
   diagonale, montants d immeuble. Un bord qui se ressemblerait d un lieu a
   l autre annulerait tout le travail fait sur le sol et les blocs. */
const PREMIER_PLAN = {
  usine: passerelle,
  fonderie: cheminees,
  friche: grillage,
  nebuleuse: haubans,
  secteur: passerelles,
};

export function verifierPremierPlan() {
  const soucis = [];
  const cles = new Set(BIOMES.map(b => b.key));
  for (const b of BIOMES) {
    if (!PREMIER_PLAN[b.key]) soucis.push(`${b.key} : aucun premier plan`);
  }
  for (const k of Object.keys(PREMIER_PLAN)) {
    if (!cles.has(k)) soucis.push(`${k} : premier plan sans lieu`);
  }
  // deux lieux sous la meme silhouette de bord rendraient leurs bords
  // interchangeables — c est exactement le defaut que ce systeme corrigeait.
  const vus = new Map();
  for (const [k, f] of Object.entries(PREMIER_PLAN)) {
    if (vus.has(f)) soucis.push(`${k} et ${vus.get(f)} partagent un premier plan`);
    else vus.set(f, k);
  }
  return soucis;
}

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

  (PREMIER_PLAN[cle] ?? passerelle)(h, dx, dy);

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

/* LA GRILLE DU SECTEUR : DEUX TRAITS, PAS UN. Le pas de 20 m ne se negocie pas,
   mais ce qui le PORTE appartient au lieu, et dans une rue ce sont les
   caniveaux : une ligne creuse, doublee d un filet clair du cote de la lumiere.
   C est le meme principe que la nervure de la Nebuleuse, avec la lumiere qui
   vient d en FACE au lieu d en haut — donc un decalage presque horizontal. */
function grilleCaniveau(a) {
  const dir = lumDir();
  ctx.globalAlpha = a;
  ctx.strokeStyle = alpha("#000000", 0.42);
  ctx.lineWidth = 3;
  nervures(0, 0);
  ctx.strokeStyle = alpha(skin().blocEdge, 0.22);
  ctx.lineWidth = 1.2;
  nervures(-dir[0] * 2.2, -dir[1] * 2.2);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;
}

/* L AMER DU SECTEUR : LE CARREFOUR. Les quatre autres lieux ont un objet pour
   amer — un creuset, une tour, un sas, un coeur de ligne. Une rue n a pas
   d objet remarquable : ce qui fait qu on se repere dans une ville est un
   CROISEMENT, donc un vide organise, et c est le seul amer du depot qui soit
   defini par ce qu il n a pas.

   Plaque au sol et sans collider, comme les quatre autres : un grand objet qui
   aurait du volume ferait voir une masse la ou le pathfinding voit du vide. */
function carrefour(R, S) {
  // le disque d asphalte plus sombre : le centre est use, pas construit.
  ctx.fillStyle = alpha("#000000", 0.26);
  ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, Math.PI * 2); ctx.fill();

  // LES QUATRE BRANCHES, et leurs passages pietons. C est ce qui dit
  // « croisement » avant toute autre lecture.
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i / 4) * Math.PI * 2);
    ctx.fillStyle = alpha("#c8cede", 0.07);
    for (let j = 0; j < 6; j++) {
      ctx.fillRect(R * 0.34 + j * (R * 0.072), -R * 0.26, R * 0.040, R * 0.52);
    }
    ctx.restore();
  }

  // LA LIGNE D ARRET : un anneau franc, la ou les branches s ouvrent. Un cercle
  // peint est la seule geometrie qu une ville produise a cette echelle.
  anneau(R * 0.30, 4, "#c8cede", 0.10);
  anneau(R * 0.79, 2, S.blocEdge, 0.12);

  // LE MAT CENTRAL, couche : ce qui reglait le carrefour est tombe dedans.
  ctx.strokeStyle = alpha(PROP.metalDark, 0.50);
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-R * 0.10, -R * 0.06);
  ctx.lineTo(R * 0.52, R * 0.30);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = alpha(S.emis, 0.16);
  ctx.beginPath(); ctx.arc(R * 0.52, R * 0.30, 7, 0, Math.PI * 2); ctx.fill();
}

/* LE PREMIER PLAN DU SECTEUR : DES PASSERELLES ET LEURS ENSEIGNES. Les trois
   regles tiennent — rien au centre, jamais opaque, coupe pendant un boss — et
   c est la seule des cinq silhouettes qui soit VERTICALE : l Usine a une
   passerelle horizontale, la Fonderie des cheminees, la Friche un grillage
   affaisse, la Nebuleuse des haubans. Ici ce sont des IMMEUBLES, donc des
   montants, et entre eux les enseignes qui pendent.

   Les caissons sont eteints un sur trois, comme les vitrines : c est la meme
   regle et elle fait la meme chose — toutes allumees, c est un centre-ville de
   carte postale. */
function passerelles(h, dx, dy) {
  const S = skin();
  const pas = 176;
  const base = Math.floor(-dx / pas) * pas;
  for (const haut of [true, false]) {
    for (let i = 0; i < CFG.VIEW_W / pas + 2; i++) {
      const x = base + i * pas - dx * 0.5;
      const w = 30 + ((i * 37) % 5) * 11;
      const hh = h * (0.52 + ((i * 53) % 7) / 14);
      const y0 = haut ? -6 - dy * 0.4 : CFG.VIEW_H - hh + 6 - dy * 0.4;
      ctx.fillStyle = alpha(SURFACE.void, 0.40);
      ctx.fillRect(x, y0, w, hh);

      // l enseigne pendante : un caisson etroit, sur le flanc du montant.
      const mort = (i * 29) % 3 === 0;
      const ey = haut ? y0 + hh - 22 : y0 + 8;
      ctx.fillStyle = alpha(SURFACE.void, 0.46);
      ctx.fillRect(x + w - 4, ey, 9, 34);
      ctx.fillStyle = alpha(S.emis, mort ? 0.04 : 0.13);
      ctx.fillRect(x + w - 3, ey + 2, 7, 30);
    }
  }
}
