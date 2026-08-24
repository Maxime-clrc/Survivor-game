import { PROP, alpha } from "/shared/palette.js";
import { biomeKey, ctx, skin } from "./stage.js";

/* LA MASSE BATIE, ET C'EST ELLE QUI DECIDE DE QUEL LIEU ON PARLE. Le semis de
   props et la tuile de sol distinguaient deja les quatre biomes ; les obstacles,
   eux, partageaient UNE silhouette (seul le chanfrein changeait) et UN habillage
   (tole striee + bande LED). Or c'est l'obstacle qui occupe l'ecran : quatre
   sols differents sous quatre memes blocs donnent quatre memes maps.

   REGLE QUI NE SE NEGOCIE PAS : LA SILHOUETTE REMPLIT SON RECTANGLE. La
   collision est une AABB repoussee par axe (`_obstacleBlock`) ; une forme qui
   rentre ses coins fait buter le joueur sur du vide. Toute la difference se joue
   DANS l'empreinte — matiere, arete, lumiere — jamais en la rognant. Les
   chanfreins restent sous 16 px, ce que l'oeil lit comme un coin casse et non
   comme un retrait.

   La FORME vaut a tous les paliers : c est de la direction artistique. Seul
   l habillage interieur s arrete en `low` — et c est `decor.js` qui le decide,
   parce que `gfx` a cinq points de lecture et que ce module n en est pas un. */

const CHANFREIN = 9;
const CHANFREIN_LARGE = 16;

function graine(o) {
  return ((o.x * 2654435761) ^ (o.y * 40503)) >>> 0;
}

export function silhouetteBloc(g, o, cle) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  if (cle === "fonderie") return octogone(g, x, y, w, h);
  if (cle === "nebuleuse") return chanfreine(g, x, y, w, h, CHANFREIN_LARGE);
  if (cle === "friche") return ruine(g, o, x, y, w, h);
  return machine(g, x, y, w, h);
}

// LE FOUR EST LOURD : huit cotes, chanfreins egaux, aucune arete qui file.
function octogone(g, x, y, w, h) {
  const c = Math.min(CHANFREIN, w * 0.22, h * 0.22);
  g.beginPath();
  g.moveTo(x + c, y); g.lineTo(x + w - c, y);
  g.lineTo(x + w, y + c); g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h); g.lineTo(x + c, y + h);
  g.lineTo(x, y + h - c); g.lineTo(x, y + c);
  g.closePath();
}

function chanfreine(g, x, y, w, h, max) {
  const c = Math.min(max, w * 0.30, h * 0.30);
  g.beginPath();
  g.moveTo(x + c, y); g.lineTo(x + w - c, y);
  g.lineTo(x + w, y + c); g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h); g.lineTo(x + c, y + h);
  g.lineTo(x, y + h - c); g.lineTo(x, y + c);
  g.closePath();
}

// LA MACHINE EST USINEE : deux coins coupes en diagonale opposee, six autres
// angles droits. Une piece qu'on a posee, pas une pierre.
function machine(g, x, y, w, h) {
  const c = Math.min(CHANFREIN, w * 0.20, h * 0.20);
  g.beginPath();
  g.moveTo(x + c, y); g.lineTo(x + w, y);
  g.lineTo(x + w, y + h - c); g.lineTo(x + w - c, y + h);
  g.lineTo(x, y + h); g.lineTo(x, y + c);
  g.closePath();
}

/* LA RUINE N'A PLUS DE CRETE. Le bord haut est une ligne brisee, deterministe
   par obstacle, et elle mord de 4 px au plus : le mur reste plein la ou on le
   heurte, il ne l'est plus la ou on le regarde. Le bas reste franc — c'est ce
   qui le tient au sol. */
const CRETE_MORSURE = 4;
function ruine(g, o, x, y, w, h) {
  const s = graine(o);
  const n = Math.max(3, Math.min(9, Math.round(w / 26)));
  g.beginPath();
  g.moveTo(x, y + Math.min(9, h * 0.2));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const d = ((s >>> (i * 3)) & 7) / 7;
    g.lineTo(x + u * w, y + d * CRETE_MORSURE + (i & 1 ? 1.5 : 0));
  }
  g.lineTo(x + w, y + h);
  g.lineTo(x, y + h);
  g.closePath();
}

/* LE LISERE N'EST PAS UNE PROPRIETE DU JEU, C'EST UNE PROPRIETE DE LA MATIERE.
   Un contour clair et continu dit « panneau usine » : le tracer a la meme force
   sur les quatre lieux les ramene tous a l atelier, quelle que soit la couleur
   du sol dessous. Une ruine n a pas d arete nette, un four se lit a sa masse et
   a sa gueule.

   Les couvertures destructibles gardent le leur, plein : leur contour tirete est
   du GAMEPLAY, il dit des points de vie. */
const CONTOUR = {
  usine:     { plat: 0.45, relief: 0.70 },
  nebuleuse: { plat: 0.45, relief: 0.70 },
  fonderie:  { plat: 0.16, relief: 0.26 },
  friche:    { plat: 0.10, relief: 0.16 },
};

export function contourDe(cle) { return CONTOUR[cle] ?? CONTOUR.usine; }

/* LA SOURCE FIXE D'UN BLOC. `decor.js` la DESSINE, `lumiere.js` l'ALLUME, les
   deux lisent cette fonction — sinon la lueur au sol et le trait a l'ecran
   finissent sur deux aretes differentes. Elle porte sa TEINTE et son RAYON :
   une gueule de four et un feu de position ne sont pas la meme lumiere.

   Reservee aux blocs permanents : sur une couverture destructible elle
   concurrencerait le contour tirete, qui est du gameplay. */
export function ledDe(o) {
  if (o.maxHp > 0) return null;
  const cle = biomeKey();
  const h = ((o.x * 73856093) ^ (o.y * 19349663)) >>> 0;
  const S = skin();

  // le four a TOUJOURS sa gueule, la friche presque jamais : la premiere
  // fonctionne, la seconde a ete abandonnee.
  const seuil = cle === "fonderie" ? 10 : cle === "friche" ? 1 : cle === "nebuleuse" ? 7 : 6;
  if ((h % 10) >= seuil) return null;

  const cote = (h >>> 4) % 4;
  const inset = 4;
  const hw = o.w / 2 - inset, hh = o.h / 2 - inset;
  const long = (cote & 1 ? o.h : o.w) * (cle === "fonderie" ? 0.34 : 0.52);
  const col = cle === "fonderie" ? PROP.fonte : S.emis;
  const r = cle === "fonderie" ? long + 128 : long + 74;
  const type = cle === "fonderie" ? "gueule" : cle === "nebuleuse" ? "feux"
             : cle === "friche" ? "tube" : "bande";

  if (cote === 0) return { x: o.x, y: o.y - hh, dx: 1, dy: 0, len: long, col, r, type };
  if (cote === 1) return { x: o.x + hw, y: o.y, dx: 0, dy: 1, len: long, col, r, type };
  if (cote === 2) return { x: o.x, y: o.y + hh, dx: 1, dy: 0, len: long, col, r, type };
  return { x: o.x - hw, y: o.y, dx: 0, dy: 1, len: long, col, r, type };
}

/* L'INTERIEUR, ET IL EST TOUT LE SUJET. Quatre matieres, quatre gestes : la
   machine est PANNEAUTEE, le four est MACONNE, la ruine est FISSUREE, la travee
   est AJOUREE. Tout est clippe a la silhouette : rien ne deborde sur le sol, ou
   vivent les telegraphes. */
export function habillerBloc(o, rx, ry, cle, S) {
  ctx.save();
  ctx.translate(o.x + rx, o.y + ry);
  silhouetteBloc(ctx, o, cle);
  ctx.clip();

  if (cle === "fonderie") four(o, S);
  else if (cle === "friche") friche(o, S);
  else if (cle === "nebuleuse") travee(o, S);
  else usine(o, S);

  ctx.restore();

  // CE QUI SORT DE L EMPREINTE, et il est HORS du clip pour ca. Deux choses, et
  // aucune ne se lit comme un volume : des fers a beton qui depassent la crete de
  // 5 px, et l EBOULIS de la breche, plaque au sol contre le pied du mur. Un mur
  // casse dont rien ne depasse est un mur coupe a la scie ; un mur perce dont
  // rien n est tombe est un mur qu on a perce PROPREMENT.
  if (cle === "friche") debord(o, rx, ry);
}

function debord(o, rx, ry) {
  const s = graine(o);
  const w = o.w, h = o.h;
  ctx.save();
  ctx.translate(o.x + rx, o.y + ry);
  ctx.strokeStyle = alpha(PROP.rouille, 0.72);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const x = -w / 2 + ((s >>> (i * 5)) % Math.max(1, w | 0));
    const l = 4 + ((s >>> (i * 3)) & 3);
    ctx.moveTo(x, -h / 2 + 4);
    ctx.quadraticCurveTo(x + (i & 1 ? 2 : -2), -h / 2 - l * 0.6, x + (i & 1 ? 4 : -4), -h / 2 - l);
  }
  ctx.stroke();
  ctx.lineCap = "butt";

  const b = breche(o);
  if (b) {
    for (let i = 0; i < 7; i++) {
      const x = b.x + (((s >>> (i * 3)) & 15) / 15 - 0.5) * b.w * 1.15;
      const y = h / 2 + ((s >>> (i * 2 + 1)) & 7) * 0.7;
      const t = 2.4 + ((s >>> i) & 3);
      ctx.fillStyle = alpha("#000000", 0.30);
      ctx.fillRect(x - t / 2 + 1, y - t / 2 + 1, t, t * 0.7);
      ctx.fillStyle = alpha("#6e6a5e", 0.46 + (i % 3) * 0.10);
      ctx.fillRect(x - t / 2, y - t / 2, t, t * 0.7);
    }
  }
  ctx.restore();
}

/* LA BRECHE. Deux blocs sur trois en ont une, et c'est ce qui empeche une friche
   d'etre une usine dont on aurait baisse les lumieres : un pan de mur qui a CEDE.
   Elle vit DANS l'empreinte — la collision ne bouge pas d'un pixel, c'est
   l'invariant de ce module —, mais elle se lit comme un trou parce que ce qui la
   remplit est un eboulis et non une matiere.

   Elle ne touche jamais un coin : un mur cede en son milieu, il ne se dechausse
   pas par l'angle. */
function breche(o) {
  const s = graine(o);
  if ((s >>> 17) % 3 === 0) return null;
  const w = Math.min(o.w * 0.34, 46);
  const x = (((s >>> 19) & 15) / 15 - 0.5) * (o.w - w * 1.6);
  return { x, w, h: Math.min(o.h * 0.52, 34) };
}

/* --- USINE : ce qui est USINE ------------------------------------------ */

function usine(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);

  ctx.fillStyle = alpha("#000000", 0.22);
  ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
  ctx.fillStyle = alpha(S.bloc, 0.55);
  ctx.fillRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14);

  const vert = h >= w;
  ctx.strokeStyle = alpha("#000000", 0.26);
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (vert) for (let x = -w / 2 + 12; x < w / 2 - 6; x += 9) { ctx.moveTo(x, -h / 2 + 8); ctx.lineTo(x, h / 2 - 8); }
  else for (let y = -h / 2 + 12; y < h / 2 - 6; y += 9) { ctx.moveTo(-w / 2 + 8, y); ctx.lineTo(w / 2 - 8, y); }
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metal, 0.12);
  ctx.beginPath();
  if (vert) for (let x = -w / 2 + 13; x < w / 2 - 6; x += 9) { ctx.moveTo(x, -h / 2 + 8); ctx.lineTo(x, h / 2 - 8); }
  else for (let y = -h / 2 + 13; y < h / 2 - 6; y += 9) { ctx.moveTo(-w / 2 + 8, y); ctx.lineTo(w / 2 - 8, y); }
  ctx.stroke();

  // LE PUPITRE : ce qui dit qu'une machine se COMMANDE. Trois voyants froids,
  // jamais animes — l'animation appartient au danger.
  const pw = Math.min(26, w * 0.42), ph = Math.min(16, h * 0.32);
  const px = ((s & 1) ? 1 : -1) * (w / 2 - pw / 2 - 9);
  const py = ((s & 2) ? 1 : -1) * (h / 2 - ph / 2 - 9);
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
  ctx.strokeStyle = alpha(PROP.metal, 0.24);
  ctx.lineWidth = 1;
  ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = alpha(i === 1 ? PROP.verre : S.emis, 0.30);
    ctx.fillRect(px - pw / 2 + 4 + i * 5, py - 1.4, 3, 2.8);
  }

  boulons(o, S, 4);
}

/* --- FONDERIE : ce qui est MACONNE ------------------------------------- */

function four(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);

  const rang = 13;
  ctx.strokeStyle = alpha("#000000", 0.34);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let y = -h / 2 + rang; y < h / 2; y += rang) { ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); }
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.brique, 0.30);
  ctx.lineWidth = 1;
  ctx.beginPath();
  let n = 0;
  for (let y = -h / 2; y < h / 2; y += rang, n++) {
    const dec = (n & 1) ? rang : 0;
    for (let x = -w / 2 + dec; x < w / 2; x += rang * 2) {
      ctx.moveTo(x, y); ctx.lineTo(x, Math.min(h / 2, y + rang));
    }
  }
  ctx.stroke();

  // LES TIRANTS. Un four se ceinture, sinon il s'ouvre : deux plats verticaux
  // rivetes, et c'est ce qui lui donne son poids a l'ecran.
  const ecart = Math.max(18, w * 0.28);
  for (const x of [-ecart, ecart]) {
    if (Math.abs(x) > w / 2 - 6) continue;
    ctx.fillStyle = alpha("#000000", 0.30);
    ctx.fillRect(x - 4, -h / 2, 8, h);
    ctx.fillStyle = alpha(PROP.metalDark, 0.60);
    ctx.fillRect(x - 3, -h / 2, 6, h);
    ctx.fillStyle = alpha(PROP.metal, 0.14);
    for (let y = -h / 2 + 7; y < h / 2; y += 14) {
      ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // LA GUEULE. Elle est la seule chose de ce depot qui eclaire depuis un
  // obstacle, et son halo est cuit ici : au sol c'est `ledDe` qui le porte.
  const l = ledDe(o);
  if (!l) return;
  const gx = l.x - o.x, gy = l.y - o.y;
  const gw = l.dx ? l.len : 13, gh = l.dy ? l.len : 13;
  ctx.fillStyle = alpha("#000000", 0.62);
  ctx.fillRect(gx - gw / 2 - 3, gy - gh / 2 - 3, gw + 6, gh + 6);
  const grad = ctx.createLinearGradient(gx - gw / 2, gy - gh / 2, gx + gw / 2, gy + gh / 2);
  grad.addColorStop(0, alpha(PROP.fonte, 0.55));
  grad.addColorStop(0.5, alpha("#ffd9a8", 0.85));
  grad.addColorStop(1, alpha(PROP.fonte, 0.55));
  ctx.fillStyle = grad;
  ctx.fillRect(gx - gw / 2, gy - gh / 2, gw, gh);
  // la suie monte TOUJOURS de la gueule, quel que soit le cote : c'est ce qui
  // dit que ca brule dedans depuis longtemps.
  const suie = ctx.createLinearGradient(gx, gy, gx, gy - h * 0.5);
  suie.addColorStop(0, alpha("#000000", 0.42));
  suie.addColorStop(1, alpha("#000000", 0));
  ctx.fillStyle = suie;
  ctx.fillRect(gx - gw, gy - h * 0.5, gw * 2, h * 0.5);
  if (s & 4) boulons(o, S, 2);
}

/* --- FRICHE : ce qui est FISSURE --------------------------------------- */

function friche(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);

  ctx.fillStyle = alpha("#000000", 0.18);
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // LES FISSURES : elles partent d'un bord et se divisent une fois. Un trace qui
  // ne se divise pas est une rayure, pas une fissure.
  ctx.strokeStyle = alpha("#000000", 0.44);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    let x = -w / 2 + ((s >>> (i * 7)) % Math.max(1, w | 0));
    let y = -h / 2;
    let a = Math.PI / 2 + (((s >>> (i * 4)) & 7) / 7 - 0.5) * 1.1;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      a += (((s >>> (i * 3 + k)) & 7) / 7 - 0.5) * 0.8;
      const l = 6 + ((s >>> k) & 7);
      const nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l;
      ctx.lineTo(nx, ny);
      if (k === 1) {
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx + Math.cos(a + 0.9) * l, ny + Math.sin(a + 0.9) * l);
        ctx.moveTo(nx, ny);
      }
      x = nx; y = ny;
    }
  }
  ctx.stroke();

  // LE TROU. Une ruine se traverse du regard : un percement sombre, un liseré
  // clair en bas — le beton est epais, donc le trou a une TRANCHE.
  if ((s & 3) !== 0) {
    const r = Math.min(w, h) * 0.17;
    const hx = ((s >>> 9) & 1 ? 1 : -1) * w * 0.18;
    const hy = ((s >>> 10) & 1 ? 1 : -1) * h * 0.14;
    ctx.fillStyle = alpha("#000000", 0.62);
    ctx.beginPath(); ctx.ellipse(hx, hy, r * 1.25, r, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(S.blocEdge, 0.24);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(hx, hy + 1.6, r * 1.2, r * 0.95, 0.3, 0.1, Math.PI - 0.1); ctx.stroke();
  }

  // LES COULURES : la rouille descend, elle ne s'etale pas. Verticales strictes,
  // depuis la crete — c'est ce qui dit que la pluie passe dessus depuis des ans.
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + ((s >>> (i * 6)) % Math.max(1, w | 0));
    const l = h * (0.3 + ((s >>> i) & 7) / 14);
    const g = ctx.createLinearGradient(x, -h / 2, x, -h / 2 + l);
    g.addColorStop(0, alpha(PROP.rouille, 0.34));
    g.addColorStop(1, alpha(PROP.rouille, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 2, -h / 2, 4 + (i & 1) * 2, l);
  }

  // LE PAN QUI A CEDE. Il est dans l'empreinte — la collision ne bouge pas —, et
  // il se lit comme un trou parce que ce qui le remplit est un EBOULIS. Il part
  // du pied : un mur cede par le bas, il ne s'evide pas par le haut.
  const b = breche(o);
  if (b) {
    const y0 = h / 2 - b.h;
    ctx.fillStyle = alpha("#000000", 0.66);
    ctx.beginPath();
    ctx.moveTo(b.x - b.w / 2, h / 2);
    for (let i = 0; i <= 5; i++) {
      const u = i / 5;
      const d = ((s >>> (i * 3 + 1)) & 7) / 7;
      ctx.lineTo(b.x - b.w / 2 + b.w * u, y0 + d * b.h * 0.34);
    }
    ctx.lineTo(b.x + b.w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    // la TRANCHE : le beton est epais, donc le bord du trou a une epaisseur, et
    // c'est elle qui empeche la breche de se lire comme une tache.
    ctx.strokeStyle = alpha(S.blocEdge, 0.26);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const t = 3 + ((s >>> (i * 2)) & 3);
      const x = b.x + (((s >>> (i * 5)) & 15) / 15 - 0.5) * b.w * 0.9;
      ctx.fillStyle = alpha("#6e6a5e", 0.40 + (i % 3) * 0.12);
      ctx.fillRect(x - t / 2, h / 2 - t - ((s >>> i) & 3), t, t * 0.8);
    }
  }

  ctx.fillStyle = alpha(PROP.vert, 0.16);
  for (let i = 0; i < 3; i++) {
    const x = -w / 2 + ((s >>> (i * 4 + 2)) % Math.max(1, w | 0));
    ctx.beginPath();
    ctx.ellipse(x, h / 2 - 2, 7 + (i & 3) * 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* --- NEBULEUSE : ce qui est AJOURE ------------------------------------- */

function travee(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);

  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);

  // LE TREILLIS. Une structure orbitale se lit a son CROISILLON : la matiere y
  // est un cadre, pas une plaque. Le fond reste sombre et plein — ca bloque
  // toujours — mais ce qu'on voit est une charpente.
  const vert = h >= w;
  const pas = 16;
  ctx.strokeStyle = alpha(S.blocEdge, 0.30);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (vert) {
    for (let y = -h / 2 + 6; y < h / 2 - 6; y += pas) {
      ctx.moveTo(-w / 2 + 6, y); ctx.lineTo(w / 2 - 6, y + pas);
      ctx.moveTo(w / 2 - 6, y); ctx.lineTo(-w / 2 + 6, y + pas);
    }
  } else {
    for (let x = -w / 2 + 6; x < w / 2 - 6; x += pas) {
      ctx.moveTo(x, -h / 2 + 6); ctx.lineTo(x + pas, h / 2 - 6);
      ctx.moveTo(x, h / 2 - 6); ctx.lineTo(x + pas, -h / 2 + 6);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = alpha(PROP.metal, 0.22);
  ctx.lineWidth = 2.4;
  ctx.strokeRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);

  // LES FEUX DE POSITION : une file de points froids le long d'une arete, et ils
  // COURENT — un module qu'on doit pouvoir suivre dans le noir.
  const l = ledDe(o);
  if (l) {
    const t = performance.now() / 1000;
    const bx = l.x - o.x, by = l.y - o.y;
    const n = Math.max(3, Math.round(l.len / 13));
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1) - 0.5) * l.len;
      const k = 0.20 + 0.80 * Math.max(0, 1 - ((t * 1.6 - i * 0.16) % 1.6));
      ctx.fillStyle = alpha(l.col, 0.22 + 0.66 * k);
      ctx.beginPath();
      ctx.arc(bx + l.dx * u, by + l.dy * u, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (s & 1) {
    ctx.strokeStyle = alpha(PROP.metal, 0.30);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 6); ctx.lineTo(0, -h / 2 - 4);
    ctx.moveTo(-4, -h / 2 - 4); ctx.lineTo(4, -h / 2 - 4);
    ctx.stroke();
  }
}

function boulons(o, S, coins) {
  const w = o.w, h = o.h;
  const pts = coins === 4
    ? [[-1, -1], [1, -1], [-1, 1], [1, 1]]
    : [[-1, -1], [1, 1]];
  for (const [sx, sy] of pts) {
    const x = sx * (w / 2 - 6), y = sy * (h / 2 - 6);
    ctx.fillStyle = alpha("#000000", 0.40);
    ctx.beginPath(); ctx.arc(x + 0.8, y + 0.8, 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = alpha(S.blocEdge, 0.24);
    ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill();
  }
}

/* LA BANDE ET LE TUBE, dessines a l'ecran. La gueule du four et les feux de la
   travee vivent dans leur habillage : ils sont DANS la matiere, pas poses
   dessus. */
export function dessinerLed(l, rx, ry) {
  if (!l || l.type === "gueule" || l.type === "feux") return;
  const t = performance.now();
  const puls = l.type === "tube"
    ? (Math.sin(t / 90 + l.x) * Math.sin(t / 640) > 0.1 ? 1 : 0.12)
    : 0.72 + 0.28 * Math.sin(t / 620 + l.x * 0.01);
  ctx.save();
  ctx.translate(rx, ry);
  ctx.lineCap = "round";
  ctx.strokeStyle = alpha(l.col, 0.20 * puls);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(l.x - l.dx * l.len / 2, l.y - l.dy * l.len / 2);
  ctx.lineTo(l.x + l.dx * l.len / 2, l.y + l.dy * l.len / 2);
  ctx.stroke();
  ctx.strokeStyle = alpha(l.col, 0.85 * puls);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.restore();
}
