import { GameState, CFG, enemyCap, DIFFICULTIES } from "./shared/game_state.js";
import { CLASSES } from "./shared/classes.js";

/* HORDE PURE. On ne joue pas une manche : on place l'horloge de horde a la
   minute voulue et on laisse le spawner batir son equilibre pendant `sec`
   secondes, boss neutralise (le spawner se coupe pendant un boss, ce qui
   mesurerait `_bossAddCap()` et jamais la horde).
   - sans tir : plafond que le SPAWN SEUL peut atteindre
   - avec tir : population reellement vue, armes actives
   L'ecart entre les deux EST la part imputable a l'efficacite des armes. */
function densite(diffIndex, joueurs, minute, sec, tir) {
  const g = new GameState(diffIndex);
  for (let i = 1; i <= joueurs; i++) g.addPlayer(i, `bot${i}`, i - 1, i % CLASSES.length);
  g.warmup = 0;
  // minute -> (segment, beat) : SEGMENT_TIME=300s, BEAT_TIME=60s, BEATS=5
  const seg = Math.min(6, Math.floor(minute / 5) + 1);
  const beat = minute % 5;
  g.segment = seg; g.beat = beat;
  g.hordeTime = beat * 60;
  g.time = minute * 60;
  g._beatCache = null;
  const cap = enemyCap(diffIndex, joueurs);
  const inputs = new Map();
  let ang = 0, somme = 0, n = 0, pic = 0;
  const N = Math.round(sec / CFG.TICK);
  for (let k = 0; k < N; k++) {
    g.boss = null; g.bossPending = false;
    if (g.cardsPending) { g.cardsPending = false; g.cardOffers.clear(); }
    if (g.relicPending) { g.relicPending = false; g.relicOffers.clear(); }
    ang += 0.012;
    const vx = Math.cos(ang), vy = Math.sin(ang);
    for (const p of g.players.values()) {
      inputs.set(p.id, { x: vx, y: vy, ax: vx, ay: vy, ar: 1, dash: false });
    }
    g.step(CFG.TICK, inputs);
    g.segment = seg; g.beat = beat; g.hordeTime = beat * 60;  // fige la minute
    for (const p of g.players.values()) {
      p.hp = p.maxHp; p.downed = false;
      if (!tir) p.fireCd = 999;
    }
    g.gameOver = false; g.victory = false;
    if (k > N * 0.4) { somme += g.enemies.length; n++; if (g.enemies.length > pic) pic = g.enemies.length; }
  }
  return { moy: somme / Math.max(1, n), pic, cap };
}

const CAS = JSON.parse(process.argv[2]);
const MINUTES = JSON.parse(process.argv[3] ?? "[1,5,10,15,20,25,30]");
const SEC = Number(process.argv[4] ?? 45);
for (const [di, j] of CAS) {
  const cap = enemyCap(di, j);
  console.log(`\n=== ${DIFFICULTIES[di].key} / ${j}j — plafond ${cap}`);
  const A = [], B = [];
  for (const m of MINUTES) {
    A.push(densite(di, j, m, SEC, false));
    B.push(densite(di, j, m, SEC, true));
  }
  console.log("  minute         " + MINUTES.map(m=>String(m).padStart(6)).join(""));
  console.log("  SANS tir moy   " + A.map(r=>r.moy.toFixed(0).padStart(6)).join(""));
  console.log("  AVEC tir moy   " + B.map(r=>r.moy.toFixed(0).padStart(6)).join(""));
  console.log("  AVEC tir % cap " + B.map(r=>(100*r.moy/cap).toFixed(0).padStart(6)).join(""));
  console.log("  part tuee par les armes : "
    + MINUTES.map((m,i)=> A[i].moy>0 ? (100*(1-B[i].moy/A[i].moy)).toFixed(0)+"%" : "-").join("  "));
}
