import { HZ_EMBER, HZ_GEYSER, HZ_POOL, HZ_SLIP, HZ_SLOW, hazardState } from "/shared/game_state.js";
import { BIOMES, HAZARDS, hazardsDe } from "/shared/biomes.js";
import { BIOME, PROP, alpha } from "/shared/palette.js";
import { biomeKey, ctx, hazardsActifs, inView, skin } from "./stage.js";

/* UN DANGER N'EST PAS UN CERCLE. Il l'etait : disque ambre, hachures, meme
   trace dans les quatre lieux — soit un element de debug pose sur la map, pas
   un objet du monde. Le gameplay ne bouge pas d'un chiffre ; c'est la
   REPRESENTATION qui devient diegetique.

     COLLIDER   le disque de `biomes.js`, invisible
     VISUEL     un objet du lieu, qui remplit exactement ce disque

   TROIS REGLES QUI NE SE NEGOCIENT PAS :

   1. L'EMPREINTE RESTE LISIBLE AU BORD PRES. Une coulee en fusion doit dire ou
      elle s'arrete aussi bien que le cercle qu'elle remplace. Tout dessin ici
      porte une limite franche a `h.r`, jamais un degrade qui s'eteint.
   2. UN DANGER S'ANNONCE PAR SA GEOMETRIE PERMANENTE, jamais par un clignotement
      d'avertissement : le canal du telegraphe appartient au boss. Ce qui bouge
      ici est de la MATIERE — un flux, une vapeur, une etincelle.
   3. CE QUI BLESSE EST CHAUD, CE QUI RALENTIT EST FROID. C'est la seule
      constante entre les quatre lieux, et c'est elle qui rend la table
      extensible sans reapprentissage.

   Ajouter un danger a un lieu = une entree dans `DANGER`. Rien d'autre. */

const DANGER = {
  friche: {
    [HZ_SLOW]: gravats,
    [HZ_SLIP]: boue,
    [HZ_POOL]: flaqueToxique,
    [HZ_GEYSER]: cableSousTension,
    [HZ_EMBER]: frontDeCombustion,
  },
  usine: {
    [HZ_SLOW]: convoyeur,
    [HZ_SLIP]: huile,
    [HZ_GEYSER]: jetDeVapeur,
    [HZ_EMBER]: chariot,
    [HZ_POOL]: bacDeTrempe,
  },
  fonderie: {
    [HZ_SLOW]: scorie,
    // ET NON `scorie` UNE SECONDE FOIS. Deux mecaniques opposees — l une freine,
    // l autre emporte — portaient la meme image : tant que le glissant n etait
    // pose nulle part ca n avait aucune consequence, et c est precisement ce qui
    // rendait la chose invisible. Le lieu a deja sa surface glissante, elle est
    // dans sa tuile de sol : le VITRIFIE, la ou le metal est tombe et a refroidi
    // en verre.
    [HZ_SLIP]: vitrifie,
    [HZ_POOL]: couleeEnFusion,
    [HZ_EMBER]: louche,
    [HZ_GEYSER]: grilleChaude,
  },
  nebuleuse: {
    [HZ_SLOW]: puitsDeGravite,
    [HZ_SLIP]: apesanteur,
    [HZ_POOL]: champDeRadiation,
    [HZ_EMBER]: debrisPlasma,
    [HZ_GEYSER]: anomaliePlasma,
  },
};

export function drawHazards(tm) {
  const list = hazardsActifs();
  if (!list.length) return;
  const table = DANGER[biomeKey()] ?? DANGER.usine;
  const S = skin();

  for (const h of list) {
    const st = hazardState(h, tm);
    const porte = h.kind === HZ_EMBER ? h.span + h.r : h.r;
    if (!inView(h.x, h.y, porte + 40)) continue;
    const f = table[h.kind] ?? defaut;
    f(h, st, tm, S);
  }
}

/* LES DEUX TABLES DOIVENT SE RECOUVRIR EXACTEMENT, et rien ne le verifiait.
   `biomes.js` decide QUELS dangers un lieu pose, `DANGER` decide a quoi ils
   ressemblent, et les deux ont derive : quatre dessins n etaient tires par
   aucune difficulte (le chariot de l Usine, la boue de la Friche, le glissant de
   la Fonderie, l anomalie de la Nebuleuse), pendant que l Usine posait un `kind`
   sans dessin.

   AUCUN DES DEUX SENS NE LEVE QUOI QUE CE SOIT. Une entree morte ne se signale
   jamais ; un `kind` sans dessin replie sur `defaut()`, un disque ambre qui a
   l air d un placeholder mais qui joue normalement. Meme role que
   `verifierFeedback()` pour les recettes de son. */
export function verifierDangers() {
  const soucis = [];
  for (const b of BIOMES) {
    const table = DANGER[b.key];
    if (!table) { soucis.push(`${b.key} : aucune table de dessin`); continue; }
    const poses = hazardsDe(b.key);
    for (const k of poses) {
      if (!table[k]) soucis.push(`${b.key}/${HAZARDS[k].key} : pose sans dessin`);
    }
    for (const k of Object.keys(table)) {
      if (!poses.includes(+k)) soucis.push(`${b.key}/${HAZARDS[+k].key} : dessin jamais pose`);
    }
    // deux mecaniques opposees sous la meme image sont injustes : le joueur ne
    // peut pas savoir si le sol va le freiner ou l emporter.
    if (table[HZ_SLOW] && table[HZ_SLOW] === table[HZ_SLIP]) {
      soucis.push(`${b.key} : ralenti et glissant partagent un dessin`);
    }
  }
  return soucis;
}

/* --- ce qui sert aux quatre ------------------------------------------- */

function sceau(h) {
  return (((h.x * 73856093) ^ (h.y * 19349663) ^ (h.kind * 83492791)) >>> 0) / 4294967296;
}

function dansLeDisque(x, y, r, dessin) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  dessin();
  ctx.restore();
}

// LA LIMITE FRANCHE. Elle remplace le cercle de debug sans le redevenir : deux
// epaisseurs, la plus fine seule saturee, et jamais de pointilles — un pointille
// est le langage du telegraphe.
function limite(x, y, r, col, a) {
  ctx.strokeStyle = alpha(col, a * 0.30);
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x, y, r - 2, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = alpha(col, a);
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(x, y, r - 0.8, 0, Math.PI * 2); ctx.stroke();
}

function nappe(x, y, r, col, a0, a1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, alpha(col, a0));
  g.addColorStop(0.82, alpha(col, a1));
  g.addColorStop(1, alpha(col, a1));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function grain(h, x, y, r, n, col, a, taille) {
  const s = sceau(h);
  ctx.fillStyle = alpha(col, a);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const ang = (i * 2.399 + s * 31) % (Math.PI * 2);
    const d = Math.sqrt(((i * 0.618 + s) % 1)) * r * 0.94;
    const t = taille * (0.5 + ((i * 7 + s * 13) % 10) / 10);
    ctx.rect(x + Math.cos(ang) * d - t / 2, y + Math.sin(ang) * d - t / 2, t, t);
  }
  ctx.fill();
}

function defaut(h, st, tm, S) {
  const chaud = st.on && h.kind !== HZ_SLOW && h.kind !== HZ_SLIP;
  const col = chaud ? BIOME.hazard : BIOME.slow;
  nappe(h.x, h.y, h.r, col, 0.16, 0.06);
  limite(h.x, h.y, h.r, col, chaud ? 0.7 : 0.3);
}

/* --- FRICHE : ce qui a ete laisse --------------------------------------- */

// LA BOUE ET LES GRAVATS : rien ne brille, rien ne bouge. C'est un sol qui
// retient, et il se lit a sa MATIERE — cailloux, ornieres, flaques mates.
function gravats(h, st, tm, S) {
  nappe(h.x, h.y, h.r, "#2b2a24", 0.42, 0.30);
  dansLeDisque(h.x, h.y, h.r, () => {
    const s = sceau(h);
    ctx.strokeStyle = alpha("#000000", 0.30);
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const y = h.y - h.r + ((i * 0.37 + s) % 1) * h.r * 2;
      ctx.moveTo(h.x - h.r, y);
      ctx.bezierCurveTo(h.x - h.r * 0.3, y + 6, h.x + h.r * 0.3, y - 6, h.x + h.r, y);
    }
    ctx.stroke();
    grain(h, h.x, h.y, h.r, 46, PROP.metalDark, 0.50, 5);
    grain(h, h.x + 3, h.y + 2, h.r, 26, PROP.rouille, 0.34, 4);
  });
  limite(h.x, h.y, h.r, BIOME.slow, 0.26);
}

function boue(h, st, tm, S) {
  nappe(h.x, h.y, h.r, "#22261f", 0.50, 0.34);
  dansLeDisque(h.x, h.y, h.r, () => {
    const s = sceau(h);
    for (let i = 0; i < 5; i++) {
      const a = (i * 1.7 + s * 9) % (Math.PI * 2);
      const d = ((i * 0.31 + s) % 1) * h.r * 0.7;
      const rx = h.r * (0.18 + ((i * 3 + s * 7) % 10) / 40);
      ctx.fillStyle = alpha(BIOME.slip, 0.14);
      ctx.beginPath();
      ctx.ellipse(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, rx, rx * 0.55, a, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(h, h.x, h.y, h.r, 30, "#000000", 0.30, 4);
  });
  limite(h.x, h.y, h.r, BIOME.slip, 0.26);
}

/* LA FLAQUE TOXIQUE : elle ne coule pas, elle STAGNE. La surface ondule sur
   place et la mousse s'accumule au bord — c'est la stagnation qui dit le
   poison, la couleur seule dirait une piscine. */
function flaqueToxique(h, st, tm, S) {
  const puls = 0.5 + 0.5 * Math.sin(tm * 0.9 + h.x * 0.01);
  nappe(h.x, h.y, h.r, "#3d4a1e", 0.62, 0.46);
  dansLeDisque(h.x, h.y, h.r, () => {
    const s = sceau(h);
    for (let i = 0; i < 4; i++) {
      const r = h.r * (0.30 + i * 0.20) + Math.sin(tm * 0.7 + i * 1.9 + s * 6) * 4;
      ctx.strokeStyle = alpha("#8fbf3a", 0.10 + 0.06 * ((i + 1) % 2));
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = alpha("#b9d97a", 0.13 + 0.05 * puls);
    for (let i = 0; i < 9; i++) {
      const a = (i * 2.399 + s * 21) % (Math.PI * 2);
      const d = h.r * (0.55 + ((i * 5 + s * 11) % 10) / 26);
      ctx.beginPath();
      ctx.arc(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, 3 + (i % 3) * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  limite(h.x, h.y, h.r, "#a8d13a", 0.52 + 0.16 * puls);
}

/* LE CABLE SOUS TENSION : la seule chose encore alimentee de la Friche, et elle
   l'est mal. Au repos le cable est LA, mort, visible — c'est lui l'annonce
   permanente ; a l'amorce l'arc court le long et saute au sol. */
function cableSousTension(h, st, tm, S) {
  const s = sceau(h);
  const a0 = s * Math.PI * 2;
  const x0 = h.x - Math.cos(a0) * h.r, y0 = h.y - Math.sin(a0) * h.r;
  const x1 = h.x + Math.cos(a0) * h.r, y1 = h.y + Math.sin(a0) * h.r;

  ctx.strokeStyle = alpha("#000000", 0.44);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(h.x + Math.sin(a0) * 14, h.y - Math.cos(a0) * 14, x1, y1);
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metalDark, 0.90);
  ctx.lineWidth = 3.4;
  ctx.stroke();

  if (!st.on) { limite(h.x, h.y, h.r, BIOME.hazardIdle, 0.34); return; }

  const k = st.k;
  dansLeDisque(h.x, h.y, h.r, () => {
    nappe(h.x, h.y, h.r * k, "#7fd0e8", 0.20 * k, 0.05 * k);
    ctx.strokeStyle = alpha("#dff4ff", 0.85 * k);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      let x = x0, y = y0;
      ctx.moveTo(x, y);
      for (let seg = 1; seg <= 7; seg++) {
        const u = seg / 7;
        const nx = x0 + (x1 - x0) * u, ny = y0 + (y1 - y0) * u;
        const j = Math.sin(tm * 47 + seg * 2.7 + i * 5 + s * 13) * 11 * k;
        x = nx + Math.sin(a0) * j; y = ny - Math.cos(a0) * j;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  });
  limite(h.x, h.y, h.r, "#9fe4ff", 0.30 + 0.5 * k);
}

/* --- USINE : ce qui fabrique ------------------------------------------- */

// LE CONVOYEUR : il RALENTIT parce qu'il roule a contresens. Les lattes defilent
// vraiment — un tapis immobile ne serait qu'un caillebotis peint.
function convoyeur(h, st, tm, S) {
  const s = sceau(h);
  const a = Math.round(s * 4) * (Math.PI / 4);
  const ca = Math.cos(a), sa = Math.sin(a);
  nappe(h.x, h.y, h.r, "#1e242c", 0.62, 0.50);
  dansLeDisque(h.x, h.y, h.r, () => {
    const pas = 17;
    const defile = (tm * 26) % pas;
    ctx.strokeStyle = alpha(PROP.metalDark, 0.90);
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let d = -h.r - pas; d <= h.r + pas; d += pas) {
      const u = d + defile;
      ctx.moveTo(h.x + ca * u - sa * h.r, h.y + sa * u + ca * h.r);
      ctx.lineTo(h.x + ca * u + sa * h.r, h.y + sa * u - ca * h.r);
    }
    ctx.stroke();
    ctx.strokeStyle = alpha(PROP.metal, 0.20);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    for (const cote of [-1, 1]) {
      ctx.strokeStyle = alpha(PROP.metal, 0.26);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(h.x - ca * h.r + sa * h.r * cote * 0.86, h.y - sa * h.r - ca * h.r * cote * 0.86);
      ctx.lineTo(h.x + ca * h.r + sa * h.r * cote * 0.86, h.y + sa * h.r - ca * h.r * cote * 0.86);
      ctx.stroke();
    }
  });
  limite(h.x, h.y, h.r, BIOME.slow, 0.30);
}

function huile(h, st, tm, S) {
  nappe(h.x, h.y, h.r, "#14161c", 0.66, 0.44);
  dansLeDisque(h.x, h.y, h.r, () => {
    const s = sceau(h);
    for (let i = 0; i < 4; i++) {
      const a = (i * 1.9 + s * 11) % (Math.PI * 2);
      const d = ((i * 0.29 + s) % 1) * h.r * 0.6;
      const g = ctx.createLinearGradient(
        h.x + Math.cos(a) * d - 18, h.y + Math.sin(a) * d - 18,
        h.x + Math.cos(a) * d + 18, h.y + Math.sin(a) * d + 18);
      g.addColorStop(0, alpha("#6f8fd8", 0.14));
      g.addColorStop(0.5, alpha("#b07fd8", 0.10));
      g.addColorStop(1, alpha("#7fd0b0", 0.12));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d,
                  h.r * 0.42, h.r * 0.26, a, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  limite(h.x, h.y, h.r, BIOME.slip, 0.30);
}

/* LE JET DE VAPEUR : au repos, une buse et sa plaque rivetee — l'installation
   est l'annonce. Actif, la vapeur monte et le disque blanchit ; c'est le seul
   danger d'Usine qui claque. */
function jetDeVapeur(h, st, tm, S) {
  ctx.fillStyle = alpha(PROP.metalDark, 0.80);
  ctx.beginPath(); ctx.arc(h.x, h.y, 15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.34);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(h.x, h.y, 15, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = alpha("#000000", 0.62);
  ctx.beginPath(); ctx.arc(h.x, h.y, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.20);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.4;
    ctx.moveTo(h.x + Math.cos(a) * 15, h.y + Math.sin(a) * 15);
    ctx.lineTo(h.x + Math.cos(a) * h.r * 0.9, h.y + Math.sin(a) * h.r * 0.9);
  }
  ctx.stroke();

  if (!st.on) { limite(h.x, h.y, h.r, BIOME.hazardIdle, 0.36); return; }

  const k = st.k;
  const s = sceau(h);
  dansLeDisque(h.x, h.y, h.r, () => {
    nappe(h.x, h.y, h.r * k, "#dfe7ee", 0.30 * k, 0.10 * k);
    ctx.fillStyle = alpha("#ffffff", 0.16 * k);
    for (let i = 0; i < 12; i++) {
      const a = (i * 2.399 + s * 17) % (Math.PI * 2);
      const u = ((tm * 0.9 + i * 0.31 + s) % 1);
      const d = u * h.r;
      ctx.beginPath();
      ctx.arc(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, (5 + u * 16) * k, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  limite(h.x, h.y, h.r, "#eef4f8", 0.30 + 0.5 * k);
}

// LE CHARIOT AUTOMATE : un danger qui se DEPLACE le long de son rail. Le rail
// est peint au sol en permanence, donc la trajectoire est connue avant le
// passage — c'est ce qui rend la chose evitable et non subie.
function chariot(h, st, tm, S) {
  rail(h, PROP.peint, 0.16);
  const k = st.k;
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.beginPath(); ctx.arc(st.x + 3, st.y + 3, h.r * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.94);
  ctx.beginPath(); ctx.arc(st.x, st.y, h.r * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.30);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(st.x, st.y, h.r * 0.62, 0, Math.PI * 2); ctx.stroke();
  const puls = 0.5 + 0.5 * Math.sin(tm * 6);
  ctx.fillStyle = alpha(S.emis, 0.30 + 0.55 * puls);
  ctx.beginPath(); ctx.arc(st.x, st.y, 4.5, 0, Math.PI * 2); ctx.fill();
  limite(st.x, st.y, h.r, BIOME.hazard, 0.42 + 0.3 * k);
}

/* LE BAC DE TREMPE. Le seul danger d Usine qui ne soit ni un jet ni une piece en
   mouvement : une cuve ouverte, encastree dans le sol, ou l on plonge ce qui
   sort du four. Elle est CARREE dans un disque — c est le seul danger du depot
   qui le soit, et une cuve rectangulaire dans un lieu tout en angles droits est
   plus juste qu une mare. Le disque reste le collider ; la limite le dit. */
function bacDeTrempe(h, st, tm, S) {
  const c = h.r * 0.72;
  dansLeDisque(h.x, h.y, h.r, () => {
    ctx.fillStyle = alpha("#0d1114", 0.86);
    ctx.fillRect(h.x - c, h.y - c, c * 2, c * 2);

    // le bain FUME : une nappe chaude qui respire, jamais un clignotement.
    const s = sceau(h);
    const puls = 0.55 + 0.45 * Math.sin(tm * 0.62 + s * 9);
    const g = ctx.createLinearGradient(h.x, h.y - c, h.x, h.y + c);
    g.addColorStop(0, alpha(BIOME.hazard, 0.10 * puls));
    g.addColorStop(0.5, alpha(PROP.fonte, 0.26 * puls));
    g.addColorStop(1, alpha(BIOME.hazard, 0.10 * puls));
    ctx.fillStyle = g;
    ctx.fillRect(h.x - c, h.y - c, c * 2, c * 2);

    // LE CAILLEBOTIS DU BORD : deux rangs de barreaux sur le pourtour, c est ce
    // qui dit qu on peut s en approcher mais pas y poser le pied.
    ctx.strokeStyle = alpha(PROP.metalDark, 0.80);
    ctx.lineWidth = 3;
    ctx.strokeRect(h.x - c, h.y - c, c * 2, c * 2);
    ctx.strokeStyle = alpha(PROP.metal, 0.24);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 1; i < 5; i++) {
      const u = h.x - c + (i / 5) * c * 2;
      ctx.moveTo(u, h.y - c); ctx.lineTo(u, h.y - c * 0.72);
      ctx.moveTo(u, h.y + c); ctx.lineTo(u, h.y + c * 0.72);
    }
    ctx.stroke();
    grain(h, h.x, h.y, h.r * 0.6, 12, "#ffd9a8", 0.20 * puls, 3);
  });
  limite(h.x, h.y, h.r, BIOME.hazard, 0.40);
}

/* LE FRONT DE COMBUSTION. Une decharge technologique brule par en dessous, des
   mois durant : ce qui avance n est pas une piece mais une LIGNE — un arc de
   braise avec du noir derriere lui et du combustible devant. Il porte donc son
   SENS dans sa forme, ce qu aucun autre danger mobile ne fait, et c est ce qui
   le separe de la louche et du chariot. */
function frontDeCombustion(h, st, tm, S) {
  const nx = -h.dy, ny = h.dx;
  const sens = st.x > h.x ? 1 : -1;
  const dx = h.dx * sens, dy = h.dy * sens;

  // le brule DERRIERE : ce qui est deja passe ne repousse pas.
  ctx.fillStyle = alpha("#0b0806", 0.62);
  ctx.beginPath();
  ctx.ellipse(st.x - dx * h.r * 0.9, st.y - dy * h.r * 0.9,
              h.r * 1.15, h.r * 0.86, Math.atan2(ny, nx), 0, Math.PI * 2);
  ctx.fill();

  dansLeDisque(st.x, st.y, h.r, () => {
    const s = sceau(h);
    nappe(st.x, st.y, h.r, "#2a1408", 0.70, 0.44);
    // L ARC DE BRAISE, en tete. Trois traits paralleles, le plus avance le plus
    // clair : un front a une epaisseur, une ligne n en a pas.
    for (let i = 0; i < 3; i++) {
      const av = (1 - i * 0.34) * h.r * 0.52;
      const k = 0.55 + 0.45 * Math.sin(tm * (1.1 + i * 0.4) + s * 11 + i);
      ctx.strokeStyle = alpha(i ? PROP.fonte : "#ffd9a8", (0.50 - i * 0.13) * k);
      ctx.lineWidth = 3.4 - i;
      ctx.beginPath();
      ctx.arc(st.x - dx * h.r * 0.3, st.y - dy * h.r * 0.3, av + h.r * 0.3,
              Math.atan2(dy, dx) - 0.9, Math.atan2(dy, dx) + 0.9);
      ctx.stroke();
    }
    grain(h, st.x, st.y, h.r * 0.8, 16, "#000000", 0.40, 6);
  });
  limite(st.x, st.y, h.r, BIOME.hazard, 0.44);
}

/* LE VITRIFIE. La ou le metal est tombe, le sol a FONDU puis refroidi en verre :
   presque noir, presque lisse, et c est exactement pour ca qu on y glisse. La
   tuile de sol de ce lieu en porte deja — celui-ci est le meme, en grand et avec
   un collider. Froid, parce qu il n arrete pas : ce qui blesse est chaud, ce qui
   emporte est froid, et cette regle-la ne se negocie dans aucun lieu. */
function vitrifie(h, st, tm, S) {
  nappe(h.x, h.y, h.r, "#070507", 0.80, 0.62);
  dansLeDisque(h.x, h.y, h.r, () => {
    const s = sceau(h);
    // LE REFLET : deux bandes obliques et froides. C est la seule chose qui
    // distingue du verre d un trou, et elles glissent tres lentement — une
    // surface qui renvoie la lumiere n est jamais tout a fait fixe.
    const d = Math.sin(tm * 0.18 + s * 5) * h.r * 0.10;
    for (const [u, e] of [[-0.30, 0.30], [0.24, 0.16]]) {
      const g = ctx.createLinearGradient(
        h.x + u * h.r - h.r * 0.2 + d, h.y - h.r,
        h.x + u * h.r + h.r * 0.2 + d, h.y + h.r);
      g.addColorStop(0, alpha(BIOME.slip, 0));
      g.addColorStop(0.5, alpha(BIOME.slip, e * 0.42));
      g.addColorStop(1, alpha(BIOME.slip, 0));
      ctx.fillStyle = g;
      ctx.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
    }
    // les CRAQUELURES du verre, fines et droites : le verre casse en lignes, la
    // scorie en plaques, et c est ce qui empeche de confondre les deux.
    ctx.strokeStyle = alpha(PROP.givre, 0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * 1.7 + s * 17) % (Math.PI * 2);
      const d0 = ((i * 0.37 + s) % 1) * h.r * 0.5;
      ctx.moveTo(h.x + Math.cos(a) * d0, h.y + Math.sin(a) * d0);
      ctx.lineTo(h.x + Math.cos(a) * h.r * 0.94, h.y + Math.sin(a) * h.r * 0.94);
    }
    ctx.stroke();
  });
  limite(h.x, h.y, h.r, BIOME.slip, 0.34);
}

function rail(h, col, a) {
  const x0 = h.x - h.dx * h.span, y0 = h.y - h.dy * h.span;
  const x1 = h.x + h.dx * h.span, y1 = h.y + h.dy * h.span;
  const nx = -h.dy, ny = h.dx;
  ctx.strokeStyle = alpha(col, a);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (const c of [-1, 1]) {
    ctx.moveTo(x0 + nx * 7 * c, y0 + ny * 7 * c);
    ctx.lineTo(x1 + nx * 7 * c, y1 + ny * 7 * c);
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(col, a * 0.7);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let d = -h.span; d <= h.span; d += 26) {
    ctx.moveTo(h.x + h.dx * d + nx * 9, h.y + h.dy * d + ny * 9);
    ctx.lineTo(h.x + h.dx * d - nx * 9, h.y + h.dy * d - ny * 9);
  }
  ctx.stroke();
}

/* --- FONDERIE : ce qui coule ------------------------------------------- */

// LA SCORIE : du metal qui refroidit. Elle ralentit parce qu'elle est molle
// dessous, et ca se voit — la croute est noire, les FISSURES sont encore
// rouges. Le seul ralentissement chaud du jeu, et il ne blesse pas.
function scorie(h, st, tm, S) {
  nappe(h.x, h.y, h.r, "#1a1512", 0.72, 0.56);
  dansLeDisque(h.x, h.y, h.r, () => {
    const s = sceau(h);
    const puls = 0.55 + 0.45 * Math.sin(tm * 0.5 + s * 7);
    ctx.strokeStyle = alpha(PROP.fonte, 0.20 + 0.12 * puls);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      let a = (i * 0.9 + s * 13) % (Math.PI * 2);
      let x = h.x, y = h.y;
      ctx.moveTo(x, y);
      for (let seg = 0; seg < 4; seg++) {
        a += (((i * 3 + seg * 7 + s * 29) % 10) / 10 - 0.5) * 1.2;
        x += Math.cos(a) * h.r * 0.30; y += Math.sin(a) * h.r * 0.30;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    grain(h, h.x, h.y, h.r, 34, "#000000", 0.44, 7);
  });
  limite(h.x, h.y, h.r, PROP.scorie, 0.40);
}

/* LA COULEE : la seule matiere du jeu qui BOUGE toute seule sans etre un
   effet. Le bain circule, la croute derive dessus, et le bord est un liseré
   blanc — c'est le contraste croute/bain qui fait la chaleur, pas la teinte. */
function couleeEnFusion(h, st, tm, S) {
  nappe(h.x, h.y, h.r, "#521a06", 0.86, 0.72);
  dansLeDisque(h.x, h.y, h.r, () => {
    const s = sceau(h);
    for (let i = 0; i < 5; i++) {
      const d = h.r * (0.18 + i * 0.17);
      const a = tm * (0.24 + i * 0.06) + i * 1.7 + s * 9;
      const g = ctx.createRadialGradient(
        h.x + Math.cos(a) * d * 0.4, h.y + Math.sin(a) * d * 0.4, 0,
        h.x + Math.cos(a) * d * 0.4, h.y + Math.sin(a) * d * 0.4, h.r * 0.55);
      g.addColorStop(0, alpha("#ffd9a8", 0.34));
      g.addColorStop(1, alpha(PROP.fonte, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(h.x + Math.cos(a) * d * 0.4, h.y + Math.sin(a) * d * 0.4, h.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = alpha("#241a14", 0.70);
    for (let i = 0; i < 6; i++) {
      const a = tm * -0.13 + i * 1.05 + s * 5;
      const d = h.r * (0.30 + ((i * 7 + s * 11) % 10) / 22);
      ctx.beginPath();
      ctx.ellipse(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d,
                  9 + (i % 3) * 5, 6 + (i % 2) * 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  limite(h.x, h.y, h.r, "#ffe6bd", 0.72);
}

// LA LOUCHE SUR RAIL : la coulee qui se DEPLACE. Meme langage que la coulee,
// meme rail peint que le chariot d'Usine — deux lieux, deux matieres, un seul
// contrat de lisibilite.
function louche(h, st, tm, S) {
  rail(h, PROP.brique, 0.24);
  const r = h.r * 0.7;
  ctx.fillStyle = alpha("#000000", 0.46);
  ctx.beginPath(); ctx.arc(st.x + 3, st.y + 4, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.94);
  ctx.beginPath(); ctx.arc(st.x, st.y, r, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, r * 0.72);
  g.addColorStop(0, alpha("#fff0d0", 0.92));
  g.addColorStop(0.6, alpha(PROP.fonte, 0.70));
  g.addColorStop(1, alpha(PROP.fonte, 0.20));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(st.x, st.y, r * 0.72, 0, Math.PI * 2); ctx.fill();
  limite(st.x, st.y, h.r, "#ffb46a", 0.60);
}

/* LA GRILLE CHAUDE : au repos c'est une grille de fonte, franchement dessinee —
   on la voit, on peut passer. Quand elle souffle, la lumiere monte D'ENTRE les
   barreaux, donc la grille reste lisible pendant la phase dangereuse. */
function grilleChaude(h, st, tm, S) {
  const pas = 11;
  dansLeDisque(h.x, h.y, h.r, () => {
    ctx.fillStyle = alpha("#0d0a08", 0.80);
    ctx.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
    if (st.on) {
      const k = st.k;
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
      g.addColorStop(0, alpha("#fff0d0", 0.80 * k));
      g.addColorStop(0.55, alpha(PROP.fonte, 0.52 * k));
      g.addColorStop(1, alpha("#7a1d02", 0.28 * k));
      ctx.fillStyle = g;
      ctx.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
    }
    ctx.fillStyle = alpha("#1a1512", st.on ? 0.86 : 0.94);
    for (let y = -h.r; y < h.r; y += pas) ctx.fillRect(h.x - h.r, h.y + y, h.r * 2, pas * 0.55);
    ctx.strokeStyle = alpha(PROP.metal, 0.10);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = -h.r; y < h.r; y += pas) { ctx.moveTo(h.x - h.r, h.y + y); ctx.lineTo(h.x + h.r, h.y + y); }
    ctx.stroke();
  });
  limite(h.x, h.y, h.r, st.on ? "#ffc07a" : PROP.brique, st.on ? 0.30 + 0.5 * st.k : 0.38);
}

/* --- NEBULEUSE : ce qui flotte ------------------------------------------ */

/* LE PUITS DE GRAVITE : il ralentit parce qu'il TIRE. Des anneaux concentriques
   qui convergent vers le centre — la direction du mouvement porte a elle seule
   toute l'information, et elle ne ressemble a rien d'autre dans le jeu. */
function puitsDeGravite(h, st, tm, S) {
  nappe(h.x, h.y, h.r, "#0d1430", 0.60, 0.20);
  dansLeDisque(h.x, h.y, h.r, () => {
    for (let i = 0; i < 5; i++) {
      const u = ((tm * 0.20 + i / 5) % 1);
      const r = h.r * (1 - u);
      ctx.strokeStyle = alpha("#7fa8d8", 0.30 * u);
      ctx.lineWidth = 1.4 + 1.6 * (1 - u);
      ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = alpha("#05070f", 0.66);
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r * 0.22, 0, Math.PI * 2); ctx.fill();
  });
  limite(h.x, h.y, h.r, "#7fa8d8", 0.30);
}

// L'APESANTEUR : le sol y est un damier de dalles qui ne portent plus. Elles
// DERIVENT, tres lentement, chacune la sienne — c'est ce decalage qui dit qu'il
// n'y a plus d'adherence.
function apesanteur(h, st, tm, S) {
  nappe(h.x, h.y, h.r, "#0a1024", 0.56, 0.30);
  dansLeDisque(h.x, h.y, h.r, () => {
    const s = sceau(h);
    const c = 26;
    for (let iy = -3; iy <= 3; iy++) {
      for (let ix = -3; ix <= 3; ix++) {
        if (((ix + iy) & 1) === 0) continue;
        const p = ((ix * 7 + iy * 13 + s * 31) % 10) / 10;
        const dx = Math.sin(tm * 0.32 + p * 6.3) * 5;
        const dy = Math.cos(tm * 0.27 + p * 5.1) * 5;
        ctx.fillStyle = alpha("#2a3a5e", 0.42);
        ctx.fillRect(h.x + ix * c + dx - c / 2 + 2, h.y + iy * c + dy - c / 2 + 2, c - 4, c - 4);
        ctx.strokeStyle = alpha(PROP.balise, 0.18);
        ctx.lineWidth = 1;
        ctx.strokeRect(h.x + ix * c + dx - c / 2 + 2, h.y + iy * c + dy - c / 2 + 2, c - 4, c - 4);
      }
    }
  });
  limite(h.x, h.y, h.r, BIOME.slip, 0.30);
}

/* LE CHAMP DE RADIATION : il n'a pas de surface, il a une DENSITE. Un semis de
   points qui scintille, dense au centre, et un liseré net au bord — sinon on ne
   saurait pas ou il s'arrete, ce qui est la seule chose qu'il faut savoir. */
function champDeRadiation(h, st, tm, S) {
  const puls = 0.5 + 0.5 * Math.sin(tm * 1.6);
  nappe(h.x, h.y, h.r, "#4a2a6e", 0.46 + 0.10 * puls, 0.14);
  dansLeDisque(h.x, h.y, h.r, () => {
    const s = sceau(h);
    ctx.fillStyle = alpha("#d8a8ff", 0.30 + 0.20 * puls);
    ctx.beginPath();
    for (let i = 0; i < 60; i++) {
      const a = (i * 2.399 + s * 41) % (Math.PI * 2);
      const d = Math.sqrt(((i * 0.618 + s + tm * 0.05) % 1)) * h.r * 0.94;
      const t = 1 + ((i * 3 + Math.floor(tm * 9)) % 3);
      ctx.rect(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, t, t);
    }
    ctx.fill();
  });
  limite(h.x, h.y, h.r, "#c78fff", 0.50 + 0.20 * puls);
}

function debrisPlasma(h, st, tm, S) {
  ctx.strokeStyle = alpha("#7fa8d8", 0.12);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(h.x - h.dx * h.span, h.y - h.dy * h.span);
  ctx.lineTo(h.x + h.dx * h.span, h.y + h.dy * h.span);
  ctx.stroke();

  const r = h.r * 0.66;
  const g = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, r);
  g.addColorStop(0, alpha("#ffffff", 0.90));
  g.addColorStop(0.35, alpha("#9fe4ff", 0.62));
  g.addColorStop(1, alpha("#5a7fff", 0.10));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(st.x, st.y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha("#9fe4ff", 0.40);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = tm * 3 + i * 1.257;
    ctx.moveTo(st.x, st.y);
    ctx.lineTo(st.x + Math.cos(a) * r * 1.5, st.y + Math.sin(a) * r * 1.5);
  }
  ctx.stroke();
  limite(st.x, st.y, h.r, "#9fe4ff", 0.55);
}

/* L'ANOMALIE : au repos, une distorsion — le sol y est TORDU mais rien n'y
   brule. Active, la faille s'ouvre. C'est le seul danger dont l'etat de repos
   soit lui-meme un evenement visuel, parce que dans le vide rien d'autre ne
   justifie une installation. */
function anomaliePlasma(h, st, tm, S) {
  const s = sceau(h);
  dansLeDisque(h.x, h.y, h.r, () => {
    ctx.strokeStyle = alpha("#5a7fff", 0.22);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 1; i <= 5; i++) {
      const r = h.r * (i / 5);
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.35) {
        const w = r + Math.sin(a * 3 + tm * 0.8 + i + s * 7) * 6;
        const x = h.x + Math.cos(a) * w, y = h.y + Math.sin(a) * w;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  });

  if (!st.on) { limite(h.x, h.y, h.r, "#5a7fff", 0.34); return; }

  const k = st.k;
  dansLeDisque(h.x, h.y, h.r, () => {
    nappe(h.x, h.y, h.r * k, "#8b5cf6", 0.34 * k, 0.08 * k);
    ctx.strokeStyle = alpha("#e0d0ff", 0.85 * k);
    ctx.lineWidth = 2.4 * k;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a0 = s * 6.28 + i * 1.57;
      ctx.moveTo(h.x, h.y);
      let x = h.x, y = h.y, a = a0;
      for (let seg = 1; seg <= 5; seg++) {
        a += Math.sin(tm * 31 + seg * 2.1 + i * 3 + s * 9) * 0.5;
        x += Math.cos(a) * (h.r / 5); y += Math.sin(a) * (h.r / 5);
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  });
  limite(h.x, h.y, h.r, "#c8b4ff", 0.30 + 0.5 * k);
}
