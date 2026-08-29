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
   La contrepartie est qu'une cloison plus mince que `CELL - 2 x CLEARANCE`
   passerait entre deux centres — la plus mince du depot fait 32 px pour 12,
   donc la marge est de 20 px et `verifierNavigation()` la rejoue.
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
