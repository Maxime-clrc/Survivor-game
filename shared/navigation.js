/* ===========================================================================
   LA NAVIGATION DE LA HORDE. Module pur, sur le modele de `biomes.js` : il ne
   depend de RIEN, ne connait ni le DOM, ni le reseau, ni `GameState`.

   TROIS COUCHES, ET UNE SEULE VIT ICI :
     1. OU ALLER          — le champ de direction de ce module
     2. COMMENT EVITER    — la tangente locale de `_enemies()`
     3. COMMENT SE TASSER — `_separateEnemies()` / `_separateFromPlayers()`

   Ce module ne rend jamais un deplacement : il rend un POINT A VISER. Le corps
   reste borne par `_obstacleBlock()`, qui garde le dernier mot.

   LE CHAMP EST PARTAGE : une diffusion par JOUEUR, pas par ennemi. Quatre
   joueurs = quatre champs, quel que soit le nombre de corps. C'est ce qui rend
   la chose viable a 200 ennemis — le cout ne suit pas la population.

   LE PIEGE DEJA PAYE : la case est marquee bloquee quand son CENTRE tombe dans
   la boite gonflee de `CLEARANCE`, jamais quand les deux se recouvrent. Le
   recouvrement ferme un couloir d'une case de large ; le centre laisse passer.
   La contrepartie a DEUX faces, et une seule etait gardee :
     — une CLOISON plus mince que `CELL - 2 x CLEARANCE` passe entre deux
       centres, donc la grille ne la voit pas. La plus mince du depot fait 32 px
       pour 12, la marge est de 20 px.
     — un PASSAGE dont la bande libre (`ecart - 2 x CLEARANCE`) est plus etroite
       qu'une case ne porte aucun centre, donc la grille y voit un MUR PLEIN. Un
       corps peut s'y tenir, le champ ne peut pas l'y rejoindre — c'est un abri
       parfait, et il ne tient qu'au CALAGE de la grille.
   `verifierNavigation()` rejoue les deux.
   =========================================================================== */

export const NAV_CFG = {
  CELL: 40,
  CLEARANCE: 14,

  // en deca, le corps vise sa cible EN DROITE LIGNE : la derniere foulee
  // appartient a l'evitement local, pas au champ, sinon un joueur colle a un
  // mur (donc dans une case fermee) n'est jamais rejoint.
  NEAR: 96,

  // images entre deux tests de visibilite, par ennemi. Le reste du temps le
  // corps rejoue sa derniere decision : c'est aussi ce qui lui donne sa
  // CONSTANCE — une decision reprise a chaque image oscille.
  LOS_PERIOD: 6,
  LOS_STEP: 0.5,

  // cases descendues sur le gradient avant de rendre un point a viser. A une
  // seule case le point est trop proche et le corps zigzague ; a cinq il coupe
  // les angles que la diffusion venait d'arrondir.
  LOOK: 3,

  REBUILD_MIN: 0.2,

  /* CE QU IL FAUT A UN PASSAGE POUR EXISTER AUX YEUX DE LA GRILLE, MESURE. Deux
     barres paralleles, un joueur au milieu, la horde en anneau a 800 px.
     Sur 20 calages de grille, sans contact en 60 s : bande 22 px -> 9 calages,
     37 px -> 1, 40 px -> 1, 52 px -> 0. Et au PIRE calage — la fente centree sur
     un multiple de `CELL`, ou la bande tient entre deux centres — 50, 65 et
     68 px d ecart ne sont JAMAIS contestes, 72 et 80 le sont en 5 s.
     La bande vaut `ecart - 2 x CLEARANCE` : il lui faut DEPASSER `CELL`, et
     `CELL` tout juste ne suffit pas. En dessous, la fente porte ou ne porte pas
     de centre selon l endroit ou elle tombe — le meme objet est franchi a un
     endroit de l arene et infranchissable a un autre.
     La LONGUEUR decide si c est grave : au calage perdant, une fente de 160 px
     est contestee en 4,2 s et une de 200 px ne l est JAMAIS. En deca, le corps
     entre par un bout avant que l evitement local ne le rejette. */
  PASSAGE_MIN: 80,
  PASSAGE_LONG: 200,

  COUT_DROIT: 2,
  COUT_DIAG: 3,
};

export const NAV_INF = 65535;

export function construireNav(obstacles, arenaW, arenaH) {
  const cell = NAV_CFG.CELL;
  const cols = Math.max(1, Math.ceil(arenaW / cell));
  const rows = Math.max(1, Math.ceil(arenaH / cell));
  const cells = cols * rows;
  const bloque = new Uint8Array(cells);
  const m = NAV_CFG.CLEARANCE;

  for (const o of obstacles) {
    if (o.maxHp > 0 && o.hp <= 0) continue;
    const x0 = o.x - o.w / 2 - m, x1 = o.x + o.w / 2 + m;
    const y0 = o.y - o.h / 2 - m, y1 = o.y + o.h / 2 + m;
    const cy0 = Math.max(0, Math.floor(y0 / cell - 0.5));
    const cy1 = Math.min(rows - 1, Math.ceil(y1 / cell - 0.5));
    const cx0 = Math.max(0, Math.floor(x0 / cell - 0.5));
    const cx1 = Math.min(cols - 1, Math.ceil(x1 / cell - 0.5));
    for (let cy = cy0; cy <= cy1; cy++) {
      const py = (cy + 0.5) * cell;
      if (py < y0 || py > y1) continue;
      const base = cy * cols;
      for (let cx = cx0; cx <= cx1; cx++) {
        const px = (cx + 0.5) * cell;
        if (px < x0 || px > x1) continue;
        bloque[base + cx] = 1;
      }
    }
  }

  let libre = 0;
  for (let c = 0; c < cells; c++) if (!bloque[c]) libre++;

  return {
    cell, cols, rows, cells, bloque, libre,
    buckets: [
      new Int32Array(cells), new Int32Array(cells),
      new Int32Array(cells), new Int32Array(cells),
    ],
    cnt: new Int32Array(4),
  };
}

export function celluleDe(nav, x, y) {
  const cx = Math.floor(x / nav.cell), cy = Math.floor(y / nav.cell);
  if (cx < 0 || cy < 0 || cx >= nav.cols || cy >= nav.rows) return -1;
  return cy * nav.cols + cx;
}

export const celluleX = (nav, c) => ((c % nav.cols) + 0.5) * nav.cell;
export const celluleY = (nav, c) => (Math.floor(c / nav.cols) + 0.5) * nav.cell;

/* La case libre la plus proche, en anneaux carres. Sert aux DEUX bouts : une
   source posee dans un mur ne diffuse rien, un corps pousse dans un mur ne lit
   rien. */
export function libreProche(nav, c, rayonMax = 4) {
  if (c < 0) return -1;
  if (!nav.bloque[c]) return c;
  const cx = c % nav.cols, cy = Math.floor(c / nav.cols);
  for (let r = 1; r <= rayonMax; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const y = cy + dy;
      if (y < 0 || y >= nav.rows) continue;
      const bord = Math.abs(dy) === r;
      const pas = bord ? 1 : 2 * r;
      for (let dx = -r; dx <= r; dx += pas) {
        const x = cx + dx;
        if (x < 0 || x >= nav.cols) continue;
        const n = y * nav.cols + x;
        if (!nav.bloque[n]) return n;
      }
    }
  }
  return -1;
}

/* DIFFUSION DE DIAL : les deux seuls couts sont 2 et 3, donc quatre seaux
   suffisent et le tri disparait. Une file de priorite generale ferait le meme
   travail pour un graphe dont on connait deja les poids. */
export function diffuser(nav, source, dist) {
  dist.fill(NAV_INF);
  const src = libreProche(nav, source);
  if (src < 0) return false;

  const { cols, rows, bloque, buckets, cnt } = nav;
  cnt[0] = cnt[1] = cnt[2] = cnt[3] = 0;
  dist[src] = 0;
  buckets[0][cnt[0]++] = src;
  let restant = 1;
  const plafond = (cols + rows) * NAV_CFG.COUT_DIAG + 8;

  for (let cur = 0; restant > 0 && cur <= plafond; cur++) {
    const b = cur & 3;
    const n = cnt[b];
    if (n === 0) continue;
    cnt[b] = 0;
    const q = buckets[b];
    for (let k = 0; k < n; k++) {
      const c = q[k];
      restant--;
      if (dist[c] !== cur) continue;
      const cx = c % cols, cy = (c - cx) / cols;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= rows) continue;
        const nbase = ny * cols;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          if (nx < 0 || nx >= cols) continue;
          const nc = nbase + nx;
          if (bloque[nc]) continue;
          // UNE DIAGONALE NE COUPE PAS UN ANGLE : sans ces deux tests un corps
          // traverse le coin de deux boites qui se touchent.
          if (dx && dy && (bloque[cy * cols + nx] || bloque[nbase + cx])) continue;
          const nd = cur + (dx && dy ? NAV_CFG.COUT_DIAG : NAV_CFG.COUT_DROIT);
          if (nd >= dist[nc]) continue;
          dist[nc] = nd;
          const nb = nd & 3;
          if (cnt[nb] < buckets[nb].length) { buckets[nb][cnt[nb]++] = nc; restant++; }
        }
      }
    }
  }
  return true;
}

function meilleurVoisin(nav, dist, c) {
  const { cols, rows, bloque } = nav;
  const cx = c % cols, cy = (c - cx) / cols;
  let best = -1, bd = dist[c];
  for (let dy = -1; dy <= 1; dy++) {
    const ny = cy + dy;
    if (ny < 0 || ny >= rows) continue;
    const nbase = ny * cols;
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cx + dx;
      if (nx < 0 || nx >= cols) continue;
      const nc = nbase + nx;
      if (bloque[nc] || dist[nc] >= bd) continue;
      if (dx && dy && (bloque[cy * cols + nx] || bloque[nbase + cx])) continue;
      bd = dist[nc]; best = nc;
    }
  }
  return best;
}

/* Le point a viser, en coordonnees MONDE. `out` est reutilise : il est lu
   immediatement par l'appelant, jamais garde d'une image a l'autre. */
/* LE PIEGE LE PLUS CHER DE CE MODULE. Un corps plaque contre une cloison est
   DANS une case fermee : `CLEARANCE` vaut 14 px et le plus petit rayon 9, donc
   le contact met le corps a l'interieur de la bande. Il faut donc une case
   d'ancrage — et la prendre « la plus proche » est FAUX : sur une bande d'une
   case d'epaisseur, la case libre d'en face porte une distance plus courte,
   donc elle aspire le corps DANS le mur, ou il reste jusqu'a la fin de la
   manche (mesure : 4 corps sur 4 plantes a la face du mur, 0 arrivee en 40 s).

   Le bon cote ne se deduit d'aucune geometrie locale : il se SOUVIENT. Le corps
   etait libre il y a moins de 0,1 s, a moins d'une case de la — c'est cette
   case-la qui dit de quel cote il se trouve. `ancre` la transporte, `viser` rend
   celle qu'il a retenue. */
export function viser(nav, dist, x, y, ancre, out) {
  const ici = celluleDe(nav, x, y);
  if (ici < 0) return -1;
  let c = ici;
  if (nav.bloque[c] || dist[c] === NAV_INF) {
    c = proche(nav, ici, ancre) ? ancre : libreProche(nav, ici);
    if (c < 0 || nav.bloque[c] || dist[c] === NAV_INF) return -1;
  }
  const retenue = c;
  let vx = celluleX(nav, c), vy = celluleY(nav, c);
  let pose = false;
  for (let i = 0; i < NAV_CFG.LOOK; i++) {
    const n = meilleurVoisin(nav, dist, c);
    if (n < 0) break;
    const nx = celluleX(nav, n), ny = celluleY(nav, n);
    // LE POINT VISE DOIT SE REJOINDRE EN LIGNE DROITE. Sinon le cap traverse
    // une boite, la tangente locale le corrige, et elle annule exactement la
    // composante qui ferait tourner le coin : le corps se colle a la face et
    // n'en repart plus (mesure : 0 arrivee en 40 s dans la poche en U).
    // Le premier pas echappe au test — il est adjacent, donc sûr, et un corps
    // plaque contre la boite ne passerait aucun test depuis sa position.
    if (pose && !droitPossible(nav, x, y, nx, ny)) break;
    c = n; vx = nx; vy = ny; pose = true;
  }
  if (!pose) return -1;
  out.x = vx;
  out.y = vy;
  return retenue;
}

/* Une ancre ne vaut que tant qu'elle est ADJACENTE : un corps qui glisse le
   long d'une cloison pendant plusieurs secondes finirait sinon a viser depuis
   l'endroit ou il est entre. */
function proche(nav, ici, ancre) {
  if (ancre < 0 || ancre >= nav.cells || nav.bloque[ancre]) return false;
  const ax = ancre % nav.cols, ay = (ancre - ax) / nav.cols;
  const bx = ici % nav.cols, by = (ici - bx) / nav.cols;
  return Math.abs(ax - bx) <= 2 && Math.abs(ay - by) <= 2;
}

/* « Puis-je y aller TOUT DROIT ». Ce n'est pas une ligne de vue optique : le
   masque est gonfle de `CLEARANCE`, donc frôler une boite compte comme bloque.
   Le pas vaut une demi-case, et la bande bloquee la plus mince en fait une :
   aucun mur ne peut passer entre deux echantillons. */
export function droitPossible(nav, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const n = Math.ceil(d / (nav.cell * NAV_CFG.LOS_STEP));
  const ux = dx / n, uy = dy / n;
  let x = x0, y = y0;
  for (let i = 1; i < n; i++) {
    x += ux; y += uy;
    const c = celluleDe(nav, x, y);
    if (c >= 0 && nav.bloque[c]) return false;
  }
  return true;
}

/* CRITERE REJOUABLE, sur le modele de `verifierBiomes()`. Muet = tout va bien.
   Il ne juge pas un chemin : il juge la GRILLE — qu'aucune cloison du depot ne
   passe entre deux centres, et que le lieu reste d'un seul tenant. */
/* LES FENTES QUE LA GRILLE NE PEUT PAS VOIR. Les quatre bords de l arene comptent
   comme des boites : un obstacle long pose a 32 px du mur ferme le meme abri que
   deux obstacles face a face. `CORPS` est le diametre du plus petit corps du
   bestiaire — en dessous personne ne s y glisse, et la fente n est rien. */
const CORPS = 18;
export function passagesAveugles(obstacles, arenaW, arenaH) {
  const out = [];
  const boites = [];
  for (const o of obstacles) {
    if (o.maxHp > 0 && o.hp <= 0) continue;
    boites.push({ x: o.x, y: o.y, w: o.w, h: o.h, bord: false });
  }
  boites.push(
    { x: -arenaW, y: arenaH / 2, w: 2 * arenaW, h: 4 * arenaH, bord: true },
    { x: 2 * arenaW, y: arenaH / 2, w: 2 * arenaW, h: 4 * arenaH, bord: true },
    { x: arenaW / 2, y: -arenaH, w: 4 * arenaW, h: 2 * arenaH, bord: true },
    { x: arenaW / 2, y: 2 * arenaH, w: 4 * arenaW, h: 2 * arenaH, bord: true });

  for (let i = 0; i < boites.length; i++) {
    for (let j = i + 1; j < boites.length; j++) {
      const a = boites[i], b = boites[j];
      if (a.bord && b.bord) continue;
      const gx = Math.abs(a.x - b.x) - (a.w + b.w) / 2;
      const gy = Math.abs(a.y - b.y) - (a.h + b.h) / 2;
      let ecart, long, x, y;
      if (gy > 0 && gx < 0) {
        ecart = gy;
        const x0 = Math.max(a.x - a.w / 2, b.x - b.w / 2);
        const x1 = Math.min(a.x + a.w / 2, b.x + b.w / 2);
        long = x1 - x0;
        x = (x0 + x1) / 2;
        y = (a.y < b.y ? a.y + a.h / 2 : b.y + b.h / 2) + ecart / 2;
      } else if (gx > 0 && gy < 0) {
        ecart = gx;
        const y0 = Math.max(a.y - a.h / 2, b.y - b.h / 2);
        const y1 = Math.min(a.y + a.h / 2, b.y + b.h / 2);
        long = y1 - y0;
        y = (y0 + y1) / 2;
        x = (a.x < b.x ? a.x + a.w / 2 : b.x + b.w / 2) + ecart / 2;
      } else continue;
      if (ecart < CORPS || ecart >= NAV_CFG.PASSAGE_MIN) continue;
      if (long < NAV_CFG.PASSAGE_LONG) continue;
      out.push({ ecart: Math.round(ecart), long: Math.round(long),
                 x: Math.round(x), y: Math.round(y), bord: a.bord || b.bord });
    }
  }
  return out;
}

export function verifierNavigation(obstacles, arenaW, arenaH) {
  const soucis = [];
  const nav = construireNav(obstacles, arenaW, arenaH);

  let mince = Infinity;
  for (const o of obstacles) {
    if (o.maxHp > 0 && o.hp <= 0) continue;
    mince = Math.min(mince, o.w, o.h);
  }
  const seuil = NAV_CFG.CELL - 2 * NAV_CFG.CLEARANCE;
  if (mince < seuil) {
    soucis.push(`cloison de ${mince.toFixed(0)} px sous le seuil de ${seuil} px`
      + " — elle peut passer entre deux centres de case");
  }

  for (const p of passagesAveugles(obstacles, arenaW, arenaH)) {
    soucis.push(`fente aveugle de ${p.ecart} px sur ${p.long} px en (${p.x}, ${p.y})`
      + " — un corps s y tient, la grille y voit un mur");
  }

  if (nav.libre < nav.cells * 0.35) {
    soucis.push(`${nav.libre}/${nav.cells} cases libres — le lieu est mure`);
  }

  let depart = -1;
  for (let c = 0; c < nav.cells && depart < 0; c++) if (!nav.bloque[c]) depart = c;
  if (depart < 0) { soucis.push("aucune case libre"); return soucis; }

  const dist = new Uint16Array(nav.cells);
  diffuser(nav, depart, dist);
  let iles = 0;
  for (let c = 0; c < nav.cells; c++) if (!nav.bloque[c] && dist[c] === NAV_INF) iles++;
  if (iles > 0) soucis.push(`${iles} cases libres inatteignables (ilot ferme)`);

  return soucis;
}
