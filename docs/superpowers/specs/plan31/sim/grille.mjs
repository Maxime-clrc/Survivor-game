import { GameState, CFG } from "../../../../../shared/game_state.js";

// ISOLE LE COUT DE LA GRILLE SPATIALE : meme nombre de corps, meme disposition
// relative, seule la SURFACE de l'arene change.
function bench(w, h, n, iters) {
  CFG.ARENA_W = w; CFG.ARENA_H = h;
  const g = new GameState(1, 1, 4242);
  g.addPlayer(1, "bot", 0);
  const p = g.players.get(1);
  p.x = w / 2; p.y = h / 2;
  g.enemies = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = 60 + (i % 40) * 12;
    g.enemies.push({ id: i + 10, type: 0, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r,
      vx: 0, vy: 0, r: 12, hp: 10, maxHp: 10, ang: 0, hitSeq: 0, critSeq: 0, shield: 0, elite: false });
  }
  g._grille();                                    // chauffe
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < iters; k++) g._grille();
  const us = Number(process.hrtime.bigint() - t0) / 1000 / iters;
  const cell = 64;
  const cases = Math.ceil(w / cell) * Math.ceil(h / cell);
  return { us, cases };
}

const cas = [
  ["4800 x 2700   (x1, actuel)", 4800, 2700],
  ["6800 x 3820   (x2 surface)", 6800, 3820],
  ["9600 x 5400   (x4 surface)", 9600, 5400],
  ["13600 x 7640  (x8 surface)", 13600, 7640],
];
for (const n of [200, 600]) {
  console.log(`\n=== _grille(), ${n} corps, 2000 appels ===`);
  console.log("arene".padEnd(30), "cases", "  us/appel", " x3/tick a 60 Hz");
  for (const [nom, w, h] of cas) {
    const r = bench(w, h, n, 2000);
    console.log(nom.padEnd(30), String(r.cases).padStart(6),
      r.us.toFixed(1).padStart(8) + " us",
      (r.us * 3 * 60 / 1000).toFixed(2).padStart(6) + " ms/s");
  }
}
