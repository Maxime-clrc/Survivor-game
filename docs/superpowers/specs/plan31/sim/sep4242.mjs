import { GameState, CFG } from "../../../../../shared/game_state.js";

/* Manche reelle depuis t = 0, deux joueurs invulnerables MAINTENUS a un ecart
   fixe pendant la horde. La graine appartient a la salle depuis 0.34.0 : elle se
   passe au constructeur, plus a `Math.random`.

   DEUX PIEGES DE PROTOCOLE, PAYES :

   1. Un joueur fige a 1 800 px du boss ne peut PAS le toucher — aucune arme ne
      porte si loin — donc le combat ne finit jamais, la horde ne reprend pas, et
      deux graines sur trois ne rendaient AUCUNE image. Pendant un boss on rend
      donc leur deplacement aux deux joueurs ; l'ecart n'est tenu que pendant la
      horde, qui est ce qu'on mesure.
   2. Ce qui est PRES d'un joueur depend du terrain et de ce qu'il tue ; ce que le
      lot 04 gouverne est OU LES CORPS NAISSENT. On compte donc aussi les
      apparitions par joueur le plus proche — c'est la mesure directe du partage,
      la seule qui ne melange pas trois causes. */
const DEBUT = 600, ECHANT = 600, GARDE = 4000;

function ecart(distance, graine) {
  const g = new GameState(1, 1, graine);
  g.addPlayer(1, "a", 0); g.addPlayer(2, "b", 1);
  g.warmup = 0;
  const [a, b] = [...g.players.values()];
  const cx = CFG.ARENA_W / 2, cy = CFG.ARENA_H / 2;
  const inputs = new Map([[1, { x:0,y:0,ax:1,ay:0,ar:400,dash:false }],
                          [2, { x:0,y:0,ax:1,ay:0,ar:400,dash:false }]]);

  // apparitions, attribuees au joueur le plus proche du point de naissance
  const nes = [0, 0];
  const vrai = g._spawnEnemy.bind(g);
  g._spawnEnemy = (...args) => {
    const e = vrai(...args);
    if (e) {
      const da = (e.x - a.x) ** 2 + (e.y - a.y) ** 2;
      const db = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
      nes[da <= db ? 0 : 1]++;
    }
    return e;
  };

  const vise = Math.round(ECHANT / CFG.TICK);
  let sA = 0, sB = 0, sTot = 0, c = 0;
  for (let k = 0; g.time < GARDE && c < vise; k++) {
    if (g.cardsPending) { for (const [id, o] of g.cardOffers) { const p = g.players.get(id); if (p && o.length) g.takeCard(p, o[0]); } g.cardsPending = false; g.openNextScreen(); continue; }
    if (g.relicPending) { g.closeMerchant(); g.openNextScreen(); continue; }
    if (g.boss) {
      for (const p of g.players.values()) {
        const i = inputs.get(p.id);
        const dx = g.boss.x - p.x, dy = g.boss.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        i.ax = dx / d; i.ay = dy / d;
        i.x = d > 300 ? i.ax : 0; i.y = d > 300 ? i.ay : 0;
      }
    } else {
      a.x = cx - distance / 2; a.y = cy; b.x = cx + distance / 2; b.y = cy;
      /* CHACUN VISE SON PLUS PROCHE, sinon la mesure a un plancher de bruit :
         a ecart NUL et donc horde commune, une visee figee sur le meme cap rendait
         deja 1,33 — un joueur balaie ce qui arrive, l autre laisse passer. */
      for (const p of g.players.values()) {
        const i = inputs.get(p.id);
        i.x = 0; i.y = 0; i.ax = 1; i.ay = 0;
        let bd = Infinity;
        for (const e of g.enemies) {
          const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
          if (d2 < bd) { bd = d2; i.ax = e.x - p.x; i.ay = e.y - p.y; }
        }
        const n = Math.hypot(i.ax, i.ay) || 1;
        i.ax /= n; i.ay /= n;
      }
    }
    g.step(CFG.TICK, inputs);
    for (const p of g.players.values()) { p.hp = p.maxHp; p.downed = false; p.revive = 0; }
    g.gameOver = false;
    if (g.time > DEBUT && !g.boss) {
      let na = 0, nb = 0;
      for (const e of g.enemies) {
        if ((e.x-a.x)**2 + (e.y-a.y)**2 < 700*700) na++;
        if ((e.x-b.x)**2 + (e.y-b.y)**2 < 700*700) nb++;
      }
      sA += na; sB += nb; sTot += g.enemies.length; c++;
    }
  }
  const d = Math.max(1, c);
  return { a: sA/d, b: sB/d, tot: sTot/d, nes, kills: g.totalKills,
           s: (c * CFG.TICK) | 0 };
}

const rap = (x, y) => Math.max(x, y) / Math.max(0.01, Math.min(x, y));
console.log("Deux joueurs invulnerables maintenus a un ecart fixe pendant la horde.");
console.log(`Releve : ${ECHANT} s hors boss apres la minute ${DEBUT / 60}. Corps a moins de 700 px.\n`);
console.log("ecart".padStart(9), "graine".padStart(7), "pres A", "pres B", " rapport",
  "  total", "   nes A", "   nes B", " rap nes", "  kills", " releve");
for (const d of [3600]) {
  for (const gr of [4242]) {
    const r = ecart(d, gr);
    console.log((String(d) + " px").padStart(9), ("g" + gr).padStart(7),
      r.a.toFixed(1).padStart(6), r.b.toFixed(1).padStart(6),
      rap(r.a, r.b).toFixed(2).padStart(8), r.tot.toFixed(1).padStart(7),
      String(r.nes[0]).padStart(8), String(r.nes[1]).padStart(8),
      rap(r.nes[0], r.nes[1]).toFixed(2).padStart(8),
      String(r.kills).padStart(7), (r.s + " s").padStart(7));
  }
}
