import { construireNav, diffuser, NAV_INF, NAV_CFG } from "../../../../../shared/navigation.js";
import { buildBiome } from "../../../../../shared/biomes.js";

// LE CHAMP DE NAVIGATION : une diffusion de Dial PAR JOUEUR, toutes les
// REBUILD_MIN = 0,2 s. Le cout suit la SURFACE, pas la population.
function bench(w, h, iters) {
  const b = buildBiome(1, 1, 4242, w, h, 1600, 900);
  const nav = construireNav(b.obstacles, w, h);
  const dist = new Uint16Array(nav.cells);
  const src = Math.floor(nav.cells / 2) + Math.floor(nav.cols / 3);
  diffuser(nav, src, dist);
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < iters; k++) diffuser(nav, src + (k % 7), dist);
  const us = Number(process.hrtime.bigint() - t0) / 1000 / iters;
  return { us, cases: nav.cells, libre: nav.libre };
}

const cas = [
  ["4800 x 2700   (x1, actuel)", 4800, 2700],
  ["6800 x 3820   (x2 surface)", 6800, 3820],
  ["9600 x 5400   (x4 surface)", 9600, 5400],
  ["13600 x 7640  (x8 surface)", 13600, 7640],
];
console.log("diffuser() — une source, grille 40 px, 300 appels\n");
console.log("arene".padEnd(30), "cases", "  us/diffusion", " 1 joueur", " 4 joueurs  (a 5 Hz)");
for (const [nom, w, h] of cas) {
  const r = bench(w, h, 300);
  const parSec = r.us * (1 / NAV_CFG.REBUILD_MIN) / 1000;
  console.log(nom.padEnd(30), String(r.cases).padStart(6),
    r.us.toFixed(0).padStart(9) + " us",
    parSec.toFixed(2).padStart(7) + " ms/s",
    (parSec * 4).toFixed(2).padStart(8) + " ms/s");
}
