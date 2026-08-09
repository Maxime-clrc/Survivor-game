/* ===========================================================================
   LA MATIERE DU SOL — une tuile cuite par (biome, mode, graine)

   Le sol du depot etait une TEINTE PLATE plus une grille : trois gris pour
   trois biomes et trois modes, c'est-a-dire neuf ecrans qui se ressemblaient.
   Ce module donne une matiere a chacun — tole et rivets, dalles coulees, beton
   fissure — sans rien changer a ce qui se lit par-dessus.

   TROIS REGLES, et elles decoulent toutes de la charte.

   1. LA TUILE EST TRANSPARENTE. Elle ne peint pas un fond : elle se compose
      PAR-DESSUS `decor.arena`, qui reste la seule chose qui dise la difficulte.
      La matiere dit OU l'on est, le mode dit DANS QUOI l'on joue, et les deux
      informations ne se marchent pas dessus.

   2. LA PERIODE EST CELLE DE LA GRILLE MARQUEE (400 px = 20 m). Un joint de
      dalle qui tomberait entre deux traits marques ferait deux quadrillages
      concurrents, et la grille n'existe que pour rendre les distances lisibles.
      Ici les joints tombent SUR les traits, ou a mi-chemin — la matiere renforce
      la graduation au lieu de la brouiller.

   3. RIEN N'Y BOUGE. C'est du sol, pas un ornement : la charte interdit tout
      decor anime superpose au jeu, et la seule exception admise reste la
      pulsation du vignettage de cauchemar. Une tuile figee, c'est aussi le seul
      moyen de la cuire une fois — le rendu par image redevient UN `fillRect`,
      la ou la grille coutait plusieurs centaines de traces.

   Le cout est paye au chargement et nulle part ailleurs : une tuile de
   400 x 400 a la densite de l'ecran, gardee en cache par cle. */

import { BIOMES, mulberry32 } from "/shared/biomes.js";
import { alpha } from "/shared/palette.js";

// La periode. Egale a `GRID_MAJOR` (20 m) et ce n'est pas une coincidence.
export const TILE = 400;

/* `usure` : ce que le mode fait a la matiere. Elle ne change NI la teinte NI la
   geometrie — c'est la regle du lot T, « la difficulte ne change pas les
   creatures, elle change la machine », appliquee au sol. En calme la machine
   est propre, en cauchemar elle est rongee. */
const USURE = [0.0, 0.45, 1.0];

const cache = new Map();

/* Le point de passage unique. La cle porte la densite de pixels : l'atlas suit
   deja l'ecran (`sprites.js`), et une tuile cuite a la densite 1 puis etiree en
   1440p rendrait exactement le flou que le lot I a supprime. */
export function floorPattern(ctx, biomeIndex, diffIndex, seed, dpr) {
  const cle = `${biomeIndex}|${diffIndex}|${seed}|${dpr}`;
  let p = cache.get(cle);
  if (p) return p;
  const cv = cuire(biomeIndex, diffIndex, seed, dpr);
  p = ctx.createPattern(cv, "repeat");
  /* Un motif absent n'est pas une panne : le sol retombe sur la teinte plate du
     mode, c'est-a-dire exactement l'arene d'avant ce lot. Meme principe que le
     repli du batcher WebGL vers le canvas 2D — on degrade, on ne casse pas. */
  if (!p) return null;
  /* Le motif est en pixels de TEXTURE, le monde en pixels de SIMULATION : sans
     cette matrice, une tuile cuite en densite 2 se repeterait deux fois trop
     souvent. `setTransform` et `DOMMatrix` manquent sur les vieux moteurs —
     l'absence degrade l'echelle, jamais le chargement. */
  if (p.setTransform && typeof DOMMatrix === "function") {
    p.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
  }
  cache.set(cle, p);
  return p;
}

function cuire(biomeIndex, diffIndex, seed, dpr) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = Math.round(TILE * dpr);
  const g = cv.getContext("2d");
  g.scale(dpr, dpr);
  const rand = mulberry32((seed >>> 0) * 6151 + biomeIndex * 97 + 1);
  const usure = USURE[diffIndex] ?? USURE[1];
  const cle = (BIOMES[biomeIndex] ?? BIOMES[0]).key;

  if (cle === "fonderie") fonderie(g, rand, usure);
  else if (cle === "friche") friche(g, rand, usure);
  else usine(g, rand, usure);

  return cv;
}

/* --- outils communs ---------------------------------------------------------

   `poser` est ce qui rend la tuile RACCORDABLE : un element pose pres d'un bord
   est redessine de l'autre cote. Sans lui, chaque joint de tuile se voit comme
   une couture tous les 20 m — le defaut le plus visible d'un motif repete, et
   celui qu'on ne remarque qu'une fois en jeu. */
function poser(g, x, y, r, dessin) {
  for (const dx of x < r ? [0, TILE] : x > TILE - r ? [0, -TILE] : [0]) {
    for (const dy of y < r ? [0, TILE] : y > TILE - r ? [0, -TILE] : [0]) {
      g.save(); g.translate(x + dx, y + dy); dessin(g); g.restore();
    }
  }
}

// Un joint : une ligne sombre doublee d'un filet clair du cote de la lumiere
// (haut-gauche), la MEME direction que les creatures et que les obstacles.
function joint(g, x0, y0, x1, y1, sombre, clair, w = 2) {
  g.lineWidth = w;
  g.strokeStyle = sombre;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = clair;
  const n = x0 === x1 ? [-1, 0] : [0, -1];
  g.beginPath();
  g.moveTo(x0 + n[0] * w, y0 + n[1] * w); g.lineTo(x1 + n[0] * w, y1 + n[1] * w);
  g.stroke();
}

function tache(g, x, y, r, couleur, a) {
  poser(g, x, y, r, (c) => {
    const grad = c.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, alpha(couleur, a));
    grad.addColorStop(1, alpha(couleur, 0));
    c.fillStyle = grad;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  });
}

/* --- USINE : tole rivetee ---------------------------------------------------

   Le biome le plus lisible du depot, celui qui ressemble le plus a l'arene nue.
   Sa matiere le dit : des plaques REGULIERES de 200 px (10 m), donc deux par
   maille marquee, et des rivets aux angles. C'est la seule des trois a etre
   strictement orthogonale — on doit pouvoir estimer une distance a l'oeil rien
   qu'en comptant les plaques. */
function usine(g, rand, usure) {
  const sombre = alpha("#000000", 0.20 + 0.10 * usure);
  const clair = alpha("#ffffff", 0.045 - 0.015 * usure);

  for (const v of [0, TILE / 2]) {
    joint(g, v, 0, v, TILE, sombre, clair);
    joint(g, 0, v, TILE, v, sombre, clair);
  }

  // Rivets : quatre par plaque, en retrait de l'angle. Deux pixels, un point
  // clair et son ombre — a la taille ou on les voit, un degrade serait perdu.
  for (let px = 0; px < 2; px++) {
    for (let py = 0; py < 2; py++) {
      const ox = px * TILE / 2, oy = py * TILE / 2;
      for (const [rx, ry] of [[14, 14], [TILE / 2 - 14, 14], [14, TILE / 2 - 14], [TILE / 2 - 14, TILE / 2 - 14]]) {
        poser(g, ox + rx, oy + ry, 3, (c) => {
          c.fillStyle = alpha("#000000", 0.28);
          c.beginPath(); c.arc(0.6, 0.8, 1.9, 0, Math.PI * 2); c.fill();
          c.fillStyle = alpha("#c8d2e2", 0.14 - 0.06 * usure);
          c.beginPath(); c.arc(0, 0, 1.7, 0, Math.PI * 2); c.fill();
        });
      }
    }
  }

  // Brossage : des stries horizontales tres faibles. C'est ce qui empeche la
  // plaque de se lire comme un aplat vide entre deux joints.
  g.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const y = rand() * TILE, x = rand() * TILE, l = 30 + rand() * 90;
    g.strokeStyle = alpha(rand() < 0.5 ? "#ffffff" : "#000000", 0.012 + rand() * 0.014);
    g.beginPath(); g.moveTo(x, y); g.lineTo(Math.min(TILE, x + l), y); g.stroke();
  }

  // L'usure du mode : de la rouille dans les angles de plaque, nulle en calme.
  const n = Math.round(6 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 24 + rand() * 40, "#7a4a2a", 0.10 + rand() * 0.08);
}

/* --- FONDERIE : dalles coulees ----------------------------------------------

   Le biome ou quelque chose chauffe. Ses dalles sont plus grandes et posees en
   APPAREIL A JOINTS ROMPUS — une rangee sur deux decalee d'une demi-dalle. Le
   decalage n'est pas decoratif : il rompt la lecture en quadrillage et separe
   nettement ce biome de l'usine, alors que les deux sont faits de rectangles.

   Les fissures chaudes sont la seule lueur du sol, et elles restent tres basses
   en valeur : une fissure qui brille autant qu'un telegraphe entrerait dans la
   grammaire du danger, ou elle n'a rien a faire. */
function fonderie(g, rand, usure) {
  const sombre = alpha("#000000", 0.26 + 0.10 * usure);
  const clair = alpha("#ffd9a8", 0.035);
  const H = TILE / 2;                      // deux rangees par tuile

  for (let r = 0; r < 2; r++) {
    const y = r * H;
    joint(g, 0, y, TILE, y, sombre, clair, 3);
    // Joint vertical decale d'une demi-dalle une rangee sur deux.
    const dec = r % 2 ? TILE / 4 : 0;
    for (const x of [dec, dec + TILE / 2]) {
      const xx = ((x % TILE) + TILE) % TILE;
      g.lineWidth = 3; g.strokeStyle = sombre;
      g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + H); g.stroke();
    }
  }

  // Suie : ce qui donne au biome sa profondeur. Presente meme en calme — la
  // fonderie a toujours chauffe, c'est le mode qui dit si elle chauffe ENCORE.
  for (let i = 0; i < 7; i++) tache(g, rand() * TILE, rand() * TILE, 40 + rand() * 70, "#000000", 0.10 + rand() * 0.10);

  // Fissures chaudes, uniquement des que la machine tourne (normal et au-dela).
  const n = Math.round(5 * usure);
  for (let i = 0; i < n; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const ang = rand() * Math.PI * 2, l = 30 + rand() * 60;
    poser(g, x, y, l, (c) => {
      c.lineCap = "round";
      c.strokeStyle = alpha("#ff7a2a", 0.10 + 0.10 * usure);
      c.lineWidth = 2.4;
      c.beginPath();
      let px = 0, py = 0, a = ang;
      c.moveTo(0, 0);
      for (let k = 0; k < 4; k++) {
        a += (rand() - 0.5) * 0.9;
        px += Math.cos(a) * (l / 4); py += Math.sin(a) * (l / 4);
        c.lineTo(px, py);
      }
      c.stroke();
      c.strokeStyle = alpha("#ffd9a8", 0.07 * usure);
      c.lineWidth = 0.9;
      c.stroke();
    });
  }
}

/* --- FRICHE : beton fissure --------------------------------------------------

   Le seul biome sans symetrie, et sa matiere suit : pas un joint droit, un
   RESEAU de fissures. C'est ce qui le rend reconnaissable du premier coup d'oeil
   sans rien lire — la ou l'usine et la fonderie sont faites de lignes droites,
   ici il n'y en a aucune.

   Le lichen n'est pas le vert du soin : il est desature et sombre, tres loin de
   `HEAL`. Un vert clair au sol dirait « viens la », ce que la grammaire reserve
   a ce qui rend des PV. */
function friche(g, rand, usure) {
  // Reseau de fissures : des marches aleatoires depuis des points de depart
  // repartis. Elles se raccordent d'une tuile a l'autre par `poser`.
  const brins = 9;
  for (let i = 0; i < brins; i++) {
    const x0 = rand() * TILE, y0 = rand() * TILE;
    const seg = 5 + Math.floor(rand() * 4);
    const l = 26 + rand() * 26;
    poser(g, x0, y0, seg * l, (c) => {
      c.lineCap = "round";
      let a = rand() * Math.PI * 2, px = 0, py = 0;
      c.strokeStyle = alpha("#000000", 0.22 + 0.10 * usure);
      c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(0, 0);
      for (let k = 0; k < seg; k++) {
        a += (rand() - 0.5) * 1.3;
        px += Math.cos(a) * l; py += Math.sin(a) * l;
        c.lineTo(px, py);
      }
      c.stroke();
      // Le filet clair du cote lumiere : c'est lui qui creuse la fissure au lieu
      // de la poser comme un trait d'encre.
      c.strokeStyle = alpha("#ffffff", 0.030);
      c.lineWidth = 0.8;
      c.translate(-0.9, -0.9);
      c.stroke();
    });
  }

  // Gravier : la texture de fond. Sans lui le beton reste un aplat entre deux
  // fissures, et le biome se lit comme « l'usine sans les joints ».
  for (let i = 0; i < 260; i++) {
    const x = rand() * TILE, y = rand() * TILE, r = 0.6 + rand() * 1.5;
    g.fillStyle = alpha(rand() < 0.6 ? "#000000" : "#c9d2c4", 0.03 + rand() * 0.05);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  // Lichen : present partout, il gagne du terrain avec l'usure.
  const n = 4 + Math.round(4 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 30 + rand() * 55, "#5c6b4a", 0.07 + 0.06 * usure);
  // Et des flaques sombres, qui creusent le sol en cauchemar.
  const m = Math.round(4 * usure);
  for (let i = 0; i < m; i++) tache(g, rand() * TILE, rand() * TILE, 45 + rand() * 60, "#000000", 0.10);
}
