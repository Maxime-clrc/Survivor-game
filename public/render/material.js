import { BIOMES, loisDe, mulberry32 } from "/shared/biomes.js";
import { PROP, alpha } from "/shared/palette.js";
import { PX_PER_M } from "/shared/units.js";
import { GFX_LOW, gfx, signalerErreur } from "../core/state.js";

// TILE vaut exactement GRID_MAJOR et MAILLE exactement GRID_FINE : la tuile
// porte donc les deux grilles en JOINTS au lieu de les laisser se tracer par
// dessus. Le motif est ancre a l'origine du MONDE (la camera vit dans le
// transform), donc les joints tombent sur la maille reelle, pas a cote.
export const TILE = 20 * PX_PER_M;
const MAILLE = 5 * PX_PER_M;

// une seconde periode, sans aucune arete : des nappes d'usure tres faibles.
// C'est ce qui casse la lecture de la tuile fine — a 400 px l'oeil trouve la
// periode en deux secondes, et aucune quantite de detail DANS la tuile ne
// rattrape ca.
const MACRO = 1200;

const USURE = [0.0, 0.45, 1.0];

/* IL N Y A QU UNE ARENE A LA FOIS, DONC IL N Y A QU UNE TUILE A LA FOIS.

   Ce cache n avait AUCUNE eviction et sa clef porte la GRAINE — que
   `room.drawBiome()` retire a CHAQUE sortie de manche. Chaque manche cuisait
   donc deux toiles de plus, gardees pour toujours : 9,8 Mo par manche a dpr 1,
   quatre fois plus a dpr 2, mesure. Dix manches suffisent a passer la barre des
   400 Mo de fonds de canvas.

   Et ce qui arrive ensuite est SILENCIEUX : quand le navigateur ne peut plus
   allouer, `createPattern` rend `null`, `floorPattern` rend `null`, et
   `drawFloor` SORT SANS RIEN DIRE. Il ne reste que la couleur d arene et la
   grille — une carte qui a l air « cassee » alors que rien n a leve.

   UNE ENTREE PAR FAMILLE NE SUFFIT PLUS : une carte composee montre jusqu a
   QUATRE lieux dans une vue, et une eviction par famille recuisait alors une
   toile par cellule et par image. Le plafond est le nombre de LIEUX — ce qu une
   carte peut porter au maximum — et l eviction reste par famille au-dela : un
   changement de mode, de graine ou de densite jette toujours la precedente,
   c est seulement le nombre de lieux vivants qui monte. */
const cache = new Map();
/* UNE ENTREE PAR REGION VISIBLE, ET LA FAMILLE PORTE LA REGION. `drawFloor`
   peint par cellule de vue : une vue en chevauche au plus QUATRE, donc au plus
   quatre regions coexistent a l image. Huit laisse la marge d une traversee de
   frontiere sans recuire.
   LA REGION ENTRE DANS LA FAMILLE (`${biomeIndex}-${loi}`) ET PAS APRES ELLE :
   `motif()` jette toute entree dont le RESTE de la clef differe et garde celles
   qui ne different que par la famille. Un `loi` pose apres `biomeIndex` aurait
   fait de chaque region un reste different, donc chaque cellule aurait vide le
   cache de sa voisine — un recuit par frontiere, exactement ce que `fondCache` a
   deja paye. */
const CACHE_MAX = 8;

function motif(ctx, cle, dpr, cuisson) {
  let p = cache.get(cle);
  if (p) return p;
  const cv = cuisson();
  p = ctx.createPattern(cv, "repeat");
  if (!p) {
    signalerErreur("matiere", `tuile « ${cle} » : createPattern a rendu null`
      + " — le sol ne sera pas peint", null);
    return null;
  }
  if (p.setTransform && typeof DOMMatrix === "function") {
    p.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
  }
  const fam = cle.slice(0, cle.indexOf("|") + 1);
  // le RESTE de la clef : mode, graine, densite. Ce qui differe par la est
  // perime ; ce qui ne differe que par le LIEU coexiste.
  const reste = cle.slice(cle.indexOf("|", cle.indexOf("|") + 1));
  const memeFam = [];
  for (const k of cache.keys()) {
    if (!k.startsWith(fam)) continue;
    if (!k.endsWith(reste)) { cache.delete(k); continue; }
    memeFam.push(k);
  }
  while (memeFam.length >= CACHE_MAX) cache.delete(memeFam.shift());
  cache.set(cle, p);
  return p;
}

export function floorPattern(ctx, biomeIndex, diffIndex, seed, dpr, loi = 0) {
  return motif(ctx, `f|${biomeIndex}-${loi}|${diffIndex}|${seed}|${dpr}|${gfx > GFX_LOW ? 1 : 0}`,
    dpr, () => cuire(biomeIndex, diffIndex, seed, dpr, loi));
}

// null en `low` : le sol reste celui d'avant le plan 13, au pixel.
export function macroPattern(ctx, biomeIndex, diffIndex, seed, dpr) {
  if (gfx <= GFX_LOW) return null;
  return motif(ctx, `m|${biomeIndex}|${diffIndex}|${seed}|${dpr}`,
    dpr, () => cuireMacro(biomeIndex, diffIndex, seed, dpr));
}

function toile(taille, dpr) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = Math.round(taille * dpr);
  const g = cv.getContext("2d");
  g.scale(dpr, dpr);
  return { cv, g };
}

function cuire(biomeIndex, diffIndex, seed, dpr, loi = 0) {
  const { cv, g } = toile(TILE, dpr);
  const rand = mulberry32((seed >>> 0) * 6151 + biomeIndex * 97 + loi * 1237 + 1);
  const usure = USURE[diffIndex] ?? USURE[1];
  const cle = (BIOMES[biomeIndex] ?? BIOMES[0]).key;

  (TUILE[cle] ?? TUILE.usine)(g, rand, usure);

  // qui la porte est une LISTE, pas une suite de `!==` : voir `PORTE_MAILLE`.
  if (gfx > GFX_LOW && PORTE_MAILLE.has(cle)) maille(g, usure, cle);

  /* LE THEME DONNE LA MATIERE, LA REGION DIT CE QUI LUI EST ARRIVE. La passe
     est APRES la maille : un traitement recouvre le joint quand il en recouvre
     un — une resine coule sur le joint, elle ne s arrete pas devant. */
  (TRAITEMENT[traitementDe(cle, loi)] ?? TRAITEMENT[T_LISSE])(g, rand, usure, cle);
  return cv;
}

function cuireMacro(biomeIndex, diffIndex, seed, dpr) {
  const { cv, g } = toile(MACRO, dpr);
  const rand = mulberry32((seed >>> 0) * 7919 + biomeIndex * 131 + 3);
  const usure = USURE[diffIndex] ?? USURE[1];
  const cle = (BIOMES[biomeIndex] ?? BIOMES[0]).key;
  /* LA TOILE APPARTIENT A CETTE FONCTION, DONC C EST ELLE QUI LA REND. Elle
     rendait ce que la RECETTE DE LIEU rendait, et `macroSecteur` ne rendait
     rien : `createPattern(undefined)` LEVE, a chaque image, sur le cinquieme
     lieu et lui seul. Une recette PEINT, elle ne decide pas de ce qui sort
     d ici — c est ce qui rend l oubli impossible au lieu de le rattraper. */
  (MACRO_TUILE[cle] ?? macroUsine)(g, rand, usure);
  return cv;
}

/* L USINE : de la suie, du blanc de halogene et de la rouille. Ce dessin ETAIT
   le repli implicite de la seconde periode — donc celle de tout lieu qui n en
   declarait pas, et c est exactement comme ca que le Secteur a failli porter
   de la rouille d atelier sur de l asphalte mouille. Il a maintenant son nom et
   sa ligne dans la table : un lieu qui herite de l Usine le fait desormais
   parce que quelqu un l a ECRIT. */
function macroUsine(g, rand, usure) {
  for (let i = 0; i < 5; i++) {
    const r = 260 + rand() * 300;
    nappe(g, rand() * MACRO, rand() * MACRO, r, "#ffffff", 0.016 + rand() * 0.014);
  }
  for (let i = 0; i < 7; i++) {
    const r = 200 + rand() * 340;
    nappe(g, rand() * MACRO, rand() * MACRO, r, "#000000", 0.05 + rand() * 0.07);
  }
  const n = 2 + Math.round(4 * usure);
  for (let i = 0; i < n; i++) {
    const r = 150 + rand() * 220;
    nappe(g, rand() * MACRO, rand() * MACRO, r, PROP.rouille, 0.020 + 0.028 * usure);
  }
}

/* UNE FONDERIE N EST PAS CHAUDE PARTOUT, ET C EST CA QU ON RESSENT. Douze
   nappes rondes de meme gamme donnaient une temperature uniforme ; ce que dit
   une halle de fonderie est le CONTRASTE — on est pres d un four ou on ne l est
   pas, et l ecart se lit a la dizaine de metres, pas au pixel.

   Trois foyers TRES larges, et des zones froides plus profondes que partout
   ailleurs. Aucune nappe claire : le seul clair de ce lieu doit venir de ce qui
   brule vraiment, et ce qui brule est deja pose — gueules, joints, coulee. Une
   tache blanche ici les concurrencerait a plus grande echelle qu elles. */
function macroFonderie(g, rand, usure) {
  for (let i = 0; i < 6; i++) {
    const r = 240 + rand() * 380;
    nappe(g, rand() * MACRO, rand() * MACRO, r, "#000000", 0.07 + rand() * 0.08);
  }
  for (let i = 0; i < 3; i++) {
    const r = 330 + rand() * 220;
    nappe(g, rand() * MACRO, rand() * MACRO, r, PROP.fonte, 0.022 + 0.014 * usure);
    nappe(g, rand() * MACRO, rand() * MACRO, r * 0.55, PROP.brique, 0.026 + 0.018 * usure);
  }
}

/* LA COUCHE LARGE ETAIT LA MEME DANS LES QUATRE LIEUX, et c est la plus grande
   de l ecran : douze nappes rondes de 1 200 px, seule la teinte d accent
   changeait. Un semis de taches rondes de meme gamme ne decrit rien — il casse
   la periode de la tuile, ce qui etait son unique travail.

   LA FRICHE EST DEHORS, ET DEHORS IL PLEUT. Sa couche large porte donc deux
   choses qu aucune installation couverte ne peut avoir : le LESSIVAGE, des
   trainees longues et PARALLELES (le site a une pente, et une pente n a qu une
   direction — c est ce qui separe une composition d un tirage), et la
   COLONISATION, des nappes vertes qui ne suivent, elles, aucune direction.

   Les deux se lisent a 1 200 px, donc au-dela de ce que l oeil echantillonne en
   une seconde : c est ce qui fait qu on sent le lieu avant de le detailler. */
function macroFriche(g, rand, usure) {
  const pente = rand() * Math.PI;

  for (let i = 0; i < 5; i++) {
    const r = 220 + rand() * 330;
    nappe(g, rand() * MACRO, rand() * MACRO, r, "#000000", 0.05 + rand() * 0.07);
  }

  for (let i = 0; i < 4; i++) {
    const x = rand() * MACRO, y = rand() * MACRO;
    const l = 420 + rand() * 420, e = 46 + rand() * 60;
    const a = pente + (rand() - 0.5) * 0.16;
    nappeOvale(g, x, y, l, e, a, "#000000", 0.045 + 0.020 * usure);
    nappeOvale(g, x - Math.sin(a) * e * 0.9, y + Math.cos(a) * e * 0.9,
               l * 0.9, e * 0.55, a, "#c8c4b4", 0.022);
  }

  const n = 4 + Math.round(4 * usure);
  for (let i = 0; i < n; i++) {
    const rx = 150 + rand() * 200, ry = rx * (0.45 + rand() * 0.5);
    nappeOvale(g, rand() * MACRO, rand() * MACRO, rx, ry, rand() * Math.PI,
               PROP.vert, 0.030 + 0.024 * usure);
  }
}

/* UN PONT EST SOUS QUELQUE CHOSE, ET C EST CE QUI MANQUAIT. Les douze nappes
   rondes communes disaient « sol sale », ce qu un plancher de station n a aucune
   raison d etre : rien ne s y depose, il n y a pas de gravite ambiante pour ca.
   Ce qu il a, en revanche, c est de l OMBRE PORTEE par la charpente au-dessus —
   deux bandes larges et paralleles, a l echelle de 1 200 px, donc bien plus
   grandes que la nervure du pont qu on lit de pres.

   Aucune nappe claire non plus, et pour la meme raison qu a la Fonderie : le
   clair de ce lieu appartient aux BAIES. Une tache pale sur le plancher ferait
   croire a une seconde ouverture. */
function macroNebuleuse(g, rand, usure) {
  const ang = rand() * Math.PI;
  for (let i = 0; i < 2; i++) {
    const d = (i - 0.5) * MACRO * 0.42;
    nappeOvale(g, MACRO / 2 - Math.sin(ang) * d, MACRO / 2 + Math.cos(ang) * d,
               MACRO * 0.9, 120 + rand() * 70, ang, "#000000", 0.10 + 0.03 * usure);
  }
  for (let i = 0; i < 4; i++) {
    const r = 200 + rand() * 300;
    nappe(g, rand() * MACRO, rand() * MACRO, r, "#000000", 0.05 + rand() * 0.06);
  }
  // le seul apport de valeur : un froid tres faible, la ou la baie eclaire le
  // plancher autour d elle.
  for (let i = 0; i < 3; i++) {
    const r = 180 + rand() * 220;
    nappe(g, rand() * MACRO, rand() * MACRO, r, PROP.givre, 0.016 + 0.010 * usure);
  }
}

function nappeOvale(g, x, y, rx, ry, ang, couleur, a) {
  const r = Math.max(rx, ry);
  for (const dx of x < r ? [0, MACRO] : x > MACRO - r ? [0, -MACRO] : [0]) {
    for (const dy of y < r ? [0, MACRO] : y > MACRO - r ? [0, -MACRO] : [0]) {
      g.save();
      g.translate(x + dx, y + dy);
      g.rotate(ang);
      g.scale(rx / ry, 1);
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, ry);
      grad.addColorStop(0, alpha(couleur, a));
      grad.addColorStop(1, alpha(couleur, 0));
      g.fillStyle = grad;
      g.fillRect(-ry, -ry, ry * 2, ry * 2);
      g.restore();
    }
  }
}

function nappe(g, x, y, r, couleur, a) {
  for (const dx of x < r ? [0, MACRO] : x > MACRO - r ? [0, -MACRO] : [0]) {
    for (const dy of y < r ? [0, MACRO] : y > MACRO - r ? [0, -MACRO] : [0]) {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      grad.addColorStop(0, alpha(couleur, a));
      grad.addColorStop(1, alpha(couleur, 0));
      g.fillStyle = grad;
      g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    }
  }
}

// LA GRILLE DESCEND DANS LA MATIERE. Une ligne tracee decrit un plan technique ;
// un joint a une epaisseur, un cote sombre et un cote clair, donc il decrit une
// SURFACE. Le bord de tuile porte le joint de 20 m, plus large.
function maille(g, usure, cle) {
  const sombre = alpha("#000000", cle === "fonderie" ? 0.30 : 0.24 + 0.08 * usure);
  const clair = alpha(cle === "fonderie" ? "#ffd9a8" : "#c8d2e2", 0.040 - 0.014 * usure);
  for (let v = MAILLE; v < TILE; v += MAILLE) {
    joint(g, v, 0, v, TILE, sombre, clair, 2);
    joint(g, 0, v, TILE, v, sombre, clair, 2);
  }
  joint(g, 0, 0, 0, TILE, sombre, clair, 3.5);
  joint(g, 0, 0, TILE, 0, sombre, clair, 3.5);
}

function poser(g, x, y, r, dessin) {
  for (const dx of x < r ? [0, TILE] : x > TILE - r ? [0, -TILE] : [0]) {
    for (const dy of y < r ? [0, TILE] : y > TILE - r ? [0, -TILE] : [0]) {
      g.save(); g.translate(x + dx, y + dy); dessin(g); g.restore();
    }
  }
}

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

function usine(g, rand, usure) {
  const sombre = alpha("#000000", 0.20 + 0.10 * usure);
  const clair = alpha("#ffffff", 0.045 - 0.015 * usure);

  for (const v of [0, TILE / 2]) {
    joint(g, v, 0, v, TILE, sombre, clair);
    joint(g, 0, v, TILE, v, sombre, clair);
  }

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

  g.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const y = rand() * TILE, x = rand() * TILE, l = 30 + rand() * 90;
    g.strokeStyle = alpha(rand() < 0.5 ? "#ffffff" : "#000000", 0.012 + rand() * 0.014);
    g.beginPath(); g.moveTo(x, y); g.lineTo(Math.min(TILE, x + l), y); g.stroke();
  }

  // L'USINE FABRIQUE, DONC ELLE TRANSPORTE : deux paires de traces de roulage
  // qui traversent la tuile de bout en bout. C'est ce qui distingue un sol
  // d'atelier d'un sol de couloir — une usure DIRECTIONNELLE, pas dispersee.
  if (gfx > GFX_LOW) {
    for (const [v, vert] of [[TILE * 0.32, false], [TILE * 0.78, true]]) {
      for (const d of [-7, 7]) {
        g.strokeStyle = alpha("#000000", 0.09 + 0.05 * usure);
        g.lineWidth = 5;
        g.beginPath();
        if (vert) { g.moveTo(v + d, 0); g.lineTo(v + d, TILE); }
        else { g.moveTo(0, v + d); g.lineTo(TILE, v + d); }
        g.stroke();
        g.strokeStyle = alpha("#c8d2e2", 0.035);
        g.lineWidth = 1.4;
        g.stroke();
      }
    }
  }

  const n = Math.round(6 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 24 + rand() * 40, "#7a4a2a", 0.10 + rand() * 0.08);
  const h = 2 + Math.round(3 * usure);
  for (let i = 0; i < h; i++) tache(g, rand() * TILE, rand() * TILE, 18 + rand() * 26, "#000000", 0.12 + rand() * 0.10);
}

/* LA VOIE. Une fonderie TRANSPORTE des masses, donc elle a des rails coules
   dans le sol, avec leurs traverses. C est la seule usure directionnelle de ce
   lieu, et elle traverse la tuile de bout en bout. */
function voie(g, v, vertical) {
  for (const d of [-9, 9]) {
    g.strokeStyle = alpha("#000000", 0.30);
    g.lineWidth = 6;
    g.beginPath();
    if (vertical) { g.moveTo(v + d, 0); g.lineTo(v + d, TILE); }
    else { g.moveTo(0, v + d); g.lineTo(TILE, v + d); }
    g.stroke();
    g.strokeStyle = alpha(PROP.metal, 0.16);
    g.lineWidth = 2;
    g.stroke();
  }
  g.strokeStyle = alpha("#000000", 0.20);
  g.lineWidth = 3;
  g.beginPath();
  for (let t = 0; t < TILE; t += 27) {
    if (vertical) { g.moveTo(v - 15, t); g.lineTo(v + 15, t); }
    else { g.moveTo(t, v - 15); g.lineTo(t, v + 15); }
  }
  g.stroke();
}

function fonderie(g, rand, usure) {
  const sombre = alpha("#000000", 0.26 + 0.10 * usure);
  const clair = alpha("#ffd9a8", 0.035);
  const H = TILE / 2;

  for (let r = 0; r < 2; r++) {
    const y = r * H;
    joint(g, 0, y, TILE, y, sombre, clair, 3);
    const dec = r % 2 ? TILE / 4 : 0;
    for (const x of [dec, dec + TILE / 2]) {
      const xx = ((x % TILE) + TILE) % TILE;
      g.lineWidth = 3; g.strokeStyle = sombre;
      g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + H); g.stroke();
    }
  }

  for (let i = 0; i < 7; i++) tache(g, rand() * TILE, rand() * TILE, 40 + rand() * 70, "#000000", 0.10 + rand() * 0.10);

  /* LA FONDERIE COULE, ET CA SE CUIT DANS LA MATIERE. La coulee ne dependait
     que de l'usure : en mode calme il n'en restait AUCUNE, et le sol de la
     Fonderie etait celui d'un couloir. Un plancher de base existe donc a tous
     les modes — c'est le lieu, pas la difficulte, qui le decide. */
  if (gfx > GFX_LOW) {
    for (let i = 0; i < 5; i++) {
      const x = rand() * TILE, y = rand() * TILE, r = 26 + rand() * 42;
      tache(g, x, y, r, PROP.scorie, 0.16 + rand() * 0.10);
      poser(g, x, y, r, (c) => {
        for (let k = 0; k < 7; k++) {
          const a = rand() * Math.PI * 2, d = rand() * r * 0.8;
          c.fillStyle = alpha("#000000", 0.14 + rand() * 0.12);
          c.beginPath();
          c.arc(Math.cos(a) * d, Math.sin(a) * d, 2 + rand() * 5, 0, Math.PI * 2);
          c.fill();
        }
      });
    }
    const brique = TILE / 2;
    g.fillStyle = alpha(PROP.brique, 0.10);
    g.fillRect(0, brique - 7, TILE, 14);
    g.strokeStyle = alpha("#000000", 0.16);
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x < TILE; x += 22) { g.moveTo(x, brique - 7); g.lineTo(x, brique + 7); }
    g.moveTo(0, brique); g.lineTo(TILE, brique);
    g.stroke();

    voie(g, TILE * 0.22, false);
    voie(g, TILE * 0.74, true);
  }
  /* LES ZONES VITRIFIEES SONT PARTIES, ET C EST LA TUILE QUI LES CONDAMNAIT.
     Trois ellipses lisses de 60 a 152 px, presque noires (0,44), dans une tuile
     de 400 px : donc trois taches a FORT contraste qui reviennent exactement au
     pas de la grille de 20 m. La seconde periode de 1 200 px casse des nappes
     douces, pas ca. Et une ellipse lisse ne se lit ni comme une flaque ni comme
     une marque — c est deja ce que la souillure a paye dans `props.js`.
     Ce qui a coule reste dit par la COULEE ci-dessous : elle a un sens. */

  const n = 3 + Math.round(5 * usure);
  for (let i = 0; i < n; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const ang = rand() * Math.PI * 2, l = 40 + rand() * 70;
    poser(g, x, y, l, (c) => {
      c.lineCap = "round";
      const pts = [[0, 0]];
      let px = 0, py = 0, a = ang;
      for (let k = 0; k < 4; k++) {
        a += (rand() - 0.5) * 0.9;
        px += Math.cos(a) * (l / 4); py += Math.sin(a) * (l / 4);
        pts.push([px, py]);
      }
      const trait = (col, w) => {
        c.strokeStyle = col; c.lineWidth = w;
        c.beginPath(); c.moveTo(0, 0);
        for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]);
        c.stroke();
      };
      trait(alpha("#000000", 0.22), 5.4);
      trait(alpha(PROP.fonte, 0.16 + 0.14 * usure), 3.0);
      trait(alpha("#ffd9a8", 0.08 + 0.08 * usure), 1.0);
    });
  }
}

/* LA FRICHE EST UNE INSTALLATION ABANDONNEE, PAS UN PRE, ET SON SOL EST DU
   BETON — coule en dalles, lave par vingt ans de pluie, repris par ce qui
   pousse. Il n a donc PAS de maille de 5 m : `cuire()` la saute pour ce lieu.
   Ce qui la remplace est un reseau de joints de coulage irreguliers, et c est
   lui qui casse la regularite du terrain.

   Les joints ondulent avec des sinus de periode entiere sur la tuile : ils se
   raccordent donc d une tuile a l autre sans qu on ait rien a gerer.

   En `low` on garde la recette d avant : c est le contrat du palier. */
function friche(g, rand, usure) {
  if (gfx <= GFX_LOW) return fricheLegacy(g, rand, usure);

  dalles(g, rand, usure);

  for (let i = 0; i < 6; i++) {
    const x0 = rand() * TILE, y0 = rand() * TILE;
    const seg = 4 + Math.floor(rand() * 4);
    const l = 22 + rand() * 26;
    poser(g, x0, y0, seg * l, (c) => {
      c.lineCap = "round";
      let a = (rand() < 0.5 ? 0 : Math.PI / 2) + (rand() - 0.5) * 0.5;
      const pts = [[0, 0]];
      let px = 0, py = 0;
      for (let k = 0; k < seg; k++) {
        a += (rand() - 0.5) * 0.55;
        px += Math.cos(a) * l; py += Math.sin(a) * l;
        pts.push([px, py]);
      }
      const trait = (col, w, dx, dy) => {
        c.strokeStyle = col; c.lineWidth = w;
        c.beginPath(); c.moveTo(dx, dy);
        for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0] + dx, pts[k][1] + dy);
        c.stroke();
      };
      trait(alpha("#000000", 0.30 + 0.10 * usure), 3.2, 1, 1.4);
      trait(alpha(PROP.metalDark, 0.42), 2.4, 0, 0);
      trait(alpha(PROP.metal, 0.10), 0.9, -0.7, -0.9);
    });
  }

  for (let i = 0; i < 34; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const w = 2 + rand() * 6, h = 1.5 + rand() * 4;
    const a = rand() * Math.PI;
    poser(g, x, y, 10, (c) => {
      c.rotate(a);
      c.fillStyle = alpha("#000000", 0.26);
      c.fillRect(-w / 2 + 1, -h / 2 + 1.2, w, h);
      c.fillStyle = alpha(PROP.metal, 0.10 + rand() * 0.08);
      c.fillRect(-w / 2, -h / 2, w, h);
    });
  }

  for (let i = 0; i < 200; i++) {
    const x = rand() * TILE, y = rand() * TILE, r = 0.6 + rand() * 1.4;
    g.fillStyle = alpha(rand() < 0.65 ? "#000000" : PROP.metal, 0.03 + rand() * 0.05);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  // LES FLAQUES. Une friche retient l eau : un miroir mat, plus sombre que le
  // beton, avec un cerne clair de depot au bord. Aucun reflet — un reflet
  // demanderait de savoir ce qu il y a au-dessus, et il n y a rien.
  const f = 3 + Math.round(2 * usure);
  for (let i = 0; i < f; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const rx = 16 + rand() * 26, ry = rx * (0.45 + rand() * 0.3);
    const a = rand() * Math.PI;
    poser(g, x, y, rx + 4, (c) => {
      c.rotate(a);
      c.fillStyle = alpha("#0d1013", 0.34);
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = alpha("#8a8f7a", 0.10);
      c.lineWidth = 2.2;
      c.beginPath(); c.ellipse(0, 0, rx + 1.5, ry + 1.5, 0, 0, Math.PI * 2); c.stroke();
    });
  }

  const n = 3 + Math.round(4 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 30 + rand() * 55, PROP.rouille, 0.06 + 0.07 * usure);
  const m = Math.round(4 * usure);
  for (let i = 0; i < m; i++) tache(g, rand() * TILE, rand() * TILE, 45 + rand() * 60, "#000000", 0.10);
}

/* LES DALLES ET CE QUI POUSSE ENTRE. Trois seams verticaux, deux horizontaux,
   chacun ondule ; chaque dalle prend sa propre valeur, donc le sol cesse d etre
   une seule surface. La vegetation ne pousse QUE sur les joints — c est ce qui
   la rend credible : elle suit la fissure, elle ne colonise pas la dalle. */
const SEAM_X = [0.22, 0.55, 0.81];
const SEAM_Y = [0.31, 0.69];
function dalles(g, rand, usure) {
  const xs = [0, ...SEAM_X.map(v => v * TILE), TILE];
  const ys = [0, ...SEAM_Y.map(v => v * TILE), TILE];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const v = rand();
      g.fillStyle = alpha(v < 0.5 ? "#000000" : "#c8c4b4", 0.016 + v * 0.030);
      g.fillRect(xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j]);
    }
  }

  const onde = (t, k, ph) => Math.sin((t / TILE) * Math.PI * 2 * k + ph) * 3.2;
  const joint = (vertical, v, k, ph) => {
    for (const [col, w, d] of [["#000000", 3.4, 0], ["#9aa08d", 1.1, -1.6]]) {
      g.strokeStyle = alpha(col, col === "#000000" ? 0.34 + 0.10 * usure : 0.07);
      g.lineWidth = w;
      g.beginPath();
      for (let t = 0; t <= TILE; t += 8) {
        const o = onde(t, k, ph) + d;
        if (vertical) { const x = v + o, y = t; t === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
        else { const x = t, y = v + o; t === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      }
      g.stroke();
    }
    // ce qui pousse dans le joint : des touffes courtes, jamais un aplat vert.
    const touffes = 5 + Math.round(6 * (1 - usure * 0.4));
    for (let i = 0; i < touffes; i++) {
      const t = rand() * TILE;
      const o = onde(t, k, ph);
      const x = vertical ? v + o : t, y = vertical ? t : v + o;
      g.strokeStyle = alpha(PROP.vert, 0.20 + rand() * 0.18);
      g.lineWidth = 1;
      g.beginPath();
      for (let b = 0; b < 4; b++) {
        const a = -Math.PI / 2 + (rand() - 0.5) * 1.9;
        const l = 3 + rand() * 5;
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      g.stroke();
    }
  };

  SEAM_X.forEach((v, i) => joint(true, v * TILE, i + 1, i * 2.1));
  SEAM_Y.forEach((v, i) => joint(false, v * TILE, i + 2, i * 1.7));

  // LES FISSURES PARTENT DES JOINTS, jamais du milieu d une dalle : c est la
  // que le beton cede.
  const nf = 5 + Math.round(6 * usure);
  g.lineCap = "round";
  for (let i = 0; i < nf; i++) {
    const surX = rand() < 0.5;
    const v = (surX ? SEAM_X : SEAM_Y)[(rand() * (surX ? 3 : 2)) | 0] * TILE;
    const t = rand() * TILE;
    let x = surX ? v : t, y = surX ? t : v;
    let a = (surX ? 0 : Math.PI / 2) + (rand() - 0.5) * 1.4;
    g.strokeStyle = alpha("#000000", 0.26 + 0.14 * usure);
    g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      a += (rand() - 0.5) * 0.9;
      x += Math.cos(a) * (7 + rand() * 11); y += Math.sin(a) * (7 + rand() * 11);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.lineCap = "butt";
}

/* LA NEBULEUSE EST LE SEUL SOL QUI SOUSTRAIT. Les trois autres tuiles POSENT
   des couches translucides par-dessus la couleur d arene ; celle-ci peint un
   pont presque opaque puis en RETIRE les baies, et c est par ces trous que
   l arriere-plan se voit. On marche sur un plancher, jamais sur le vide.

   ET SON PLANCHER N EST PAS UNE TOLE : c est un NID D ABEILLE. Un panneau
   hexagonal ne se confond avec aucun des trois autres lieux — ni avec la maille
   de 5 m, qui est justement sautee ici. Une baie est donc une CELLULE retiree,
   pas un rectangle decoupe, et le reseau de joints devient son meneau.

   Presque opaque et non opaque (0,93) : la teinte de mode continue de traverser,
   sinon le pont serait identique en calme et en cauchemar. */
const HEX = 50;
const HEX_U = HEX / 3;
function cellule(g, cx, cy) {
  g.beginPath();
  g.moveTo(cx, cy - HEX_U * 2);
  g.lineTo(cx + HEX / 2, cy - HEX_U);
  g.lineTo(cx + HEX / 2, cy + HEX_U);
  g.lineTo(cx, cy + HEX_U * 2);
  g.lineTo(cx - HEX / 2, cy + HEX_U);
  g.lineTo(cx - HEX / 2, cy - HEX_U);
  g.closePath();
}
function centreHex(i, j) {
  return [i * HEX + ((j & 1) ? HEX / 2 : 0), j * HEX];
}

/* LE PALIER BAS GARDE LE LIEU, IL NE LE REMPLACE PAS. La Nebuleuse et le Secteur
   rendaient la tuile de l USINE en `low` — deux lieux sur cinq portant le sol
   d un troisieme, donc trois lieux indiscernables au palier bas. La Friche, elle,
   avait `fricheLegacy` : sa PROPRE tuile d avant le plan 13, et c est le bon
   modele. Ces deux-la sont nes apres, donc ils n avaient pas d ancienne tuile —
   on leur en ecrit une au lieu d emprunter celle du voisin.
   ET CA NE COUTE RIEN PAR IMAGE : la tuile est CUITE une fois par manche puis
   repetee en motif. Le prix de `low` est ailleurs — props, traces, lumiere,
   atmosphere, premier plan —, jamais dans le four. */
function nebuleuseBasse(g) {
  const N = TILE / HEX;
  g.fillStyle = alpha("#232b40", 0.93);
  g.fillRect(0, 0, TILE, TILE);
  g.lineWidth = 2.4;
  g.strokeStyle = alpha("#000000", 0.30);
  g.beginPath();
  for (let j = -1; j <= N; j++) {
    for (let i = -1; i <= N; i++) {
      const [cx, cy] = centreHex(i, j);
      g.moveTo(cx, cy - HEX_U * 2);
      g.lineTo(cx + HEX / 2, cy - HEX_U);
      g.lineTo(cx + HEX / 2, cy + HEX_U);
      g.lineTo(cx, cy + HEX_U * 2);
    }
  }
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = alpha(PROP.givre, 0.040);
  g.stroke();
}

function nebuleuse(g, rand, usure) {
  if (gfx <= GFX_LOW) return nebuleuseBasse(g);
  const N = TILE / HEX;

  g.fillStyle = alpha("#232b40", 0.93);
  g.fillRect(0, 0, TILE, TILE);

  for (let j = -1; j <= N; j++) {
    for (let i = -1; i <= N; i++) {
      const [cx, cy] = centreHex(i, j);
      const v = ((i * 7 + j * 13 + N) % 5) / 5;
      cellule(g, cx, cy);
      g.fillStyle = alpha(v < 0.4 ? "#000000" : PROP.givre, 0.014 + v * 0.026);
      g.fill();
    }
  }

  // le meneau du nid d abeille RECULE : depuis le lot 1 la nervure du pont
  // porte le pas de 20 m, et depuis celui-ci la baie porte le vide. Trois
  // reseaux de meme force sur un seul sol se lisent « salle », pas « pont ».
  g.lineWidth = 2.4;
  g.strokeStyle = alpha("#000000", 0.30);
  g.beginPath();
  for (let j = -1; j <= N; j++) {
    for (let i = -1; i <= N; i++) {
      const [cx, cy] = centreHex(i, j);
      g.moveTo(cx, cy - HEX_U * 2);
      g.lineTo(cx + HEX / 2, cy - HEX_U);
      g.lineTo(cx + HEX / 2, cy + HEX_U);
      g.lineTo(cx, cy + HEX_U * 2);
    }
  }
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = alpha(PROP.givre, 0.040);
  g.stroke();

  /* LES BAIES NE SONT PLUS ICI. Elles etaient trois cellules retirees par
     tuile — 4 % de la surface, et surtout decoupees DANS le motif, donc
     repetees sur un reseau de 400 px. Une baie doit etre GRANDE, RARE et
     ANCREE AU MONDE : elle vit maintenant dans `drawBaies()` (`decor.js`), qui
     redessine l arriere-plan a pleine valeur au lieu de compter sur ce qui
     transparait sous un plancher a 0,93. */

  g.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const x = rand() * TILE, y = rand() * TILE, l = 12 + rand() * 30;
    g.strokeStyle = alpha(rand() < 0.5 ? PROP.metal : "#000000", 0.018 + rand() * 0.018);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke();
  }

  for (let i = 0; i < 10; i++) {
    poser(g, rand() * TILE, rand() * TILE, 4, (c) => {
      c.fillStyle = alpha("#000000", 0.30);
      c.beginPath(); c.arc(0.6, 0.8, 2.1, 0, Math.PI * 2); c.fill();
      c.fillStyle = alpha(PROP.givre, 0.13);
      c.beginPath(); c.arc(0, 0, 1.9, 0, Math.PI * 2); c.fill();
    });
  }

  const n = 2 + Math.round(4 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 24 + rand() * 40, PROP.givre, 0.045 + 0.03 * usure);
}

/* LE CANAL DE COULEE, ET IL EST ANCRE AU MONDE. Tout ce que la Fonderie disait
   d'elle-meme vivait dans une tuile de 400 px : rigoles, voies, vitrifie — donc
   des PIECES, repetees, jamais une installation. Il lui manquait la seule chose
   qu'une fonderie a et qu'un atelier n'a pas : quelque chose de long qui
   TRAVERSE, et par rapport a quoi tout le reste se situe.

   IL EST COUVERT, ET CE N'EST PAS UN DETAIL. La nappe libre de metal en fusion
   est deja prise : c'est `couleeEnFusion`, un DANGER, avec son collider. Peindre
   la meme matiere sans collider apprendrait au joueur soit a fuir ce qui ne
   blesse pas, soit a ignorer ce qui blesse. Un canal couvert n'a pas ce
   probleme : on lit une conduite, pas une mare, et la lumiere sort par ses
   JOINTS et ses REGARDS.

   La polyligne est ORTHOGONALE et ses coudes sont francs : une conduite
   industrielle tourne a angle droit, une riviere serpente. */
const COULEE_LARGE = 30;
let couleeCache = null;

export function couleeDe(seed, arenaW, arenaH, obstacles, hazards) {
  const cle = `${seed}|${arenaW}|${arenaH}|${obstacles.length}|${hazards.length}`;
  if (couleeCache && couleeCache.cle === cle) return couleeCache.v;
  const rand = mulberry32((seed >>> 0) * 9173 + 41);
  const v = [];

  for (let k = 0; k < 2; k++) {
    const vert = k === 1;
    const L = vert ? arenaH : arenaW, T = vert ? arenaW : arenaH;
    const n = 3;
    const pts = [];
    let t = T * (0.18 + rand() * 0.24) + (k ? T * 0.44 : 0);
    pts.push([-80, t]);
    for (let i = 1; i <= n; i++) {
      const l = (L / n) * i - (i < n ? L * 0.06 : -80);
      pts.push([l, t]);
      if (i < n) {
        t = Math.max(T * 0.12, Math.min(T * 0.88, t + (rand() - 0.5) * T * 0.34));
        pts.push([l, t]);
      }
    }
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      segs.push(vert ? { x0: a[1], y0: a[0], x1: b[1], y1: b[0] }
                     : { x0: a[0], y0: a[1], x1: b[0], y1: b[1] });
    }
    v.push({ segs, large: COULEE_LARGE });
  }

  /* LES REGARDS SONT LES SEULES SOURCES. Un joint par 46 px ferait des centaines
     de sources pour la passe de lumiere, et une source tous les 46 px n'est plus
     une source : c'est une nappe. Le regard est rare et il eclaire loin.

     ILS SE FILTRENT A LA GENERATION, jamais a l'usage. Releve sur six graines :
     un a quatre regards tombaient SOUS un bloc — un halo au sol sans rien qui
     l'emette — et jusqu'a deux DANS un danger, ou la coulee libre est deja
     dessinee avec son collider. Le canal, lui, passe sous un bloc sans probleme :
     une conduite passe sous une machine ; c'est la SOURCE qui n'a pas le droit
     d'etre invisible. Filtrer ici, c'est le faire une fois et pour les DEUX
     lecteurs — filtrer a l'usage, c'est le refaire par image et risquer que
     `decor.js` et `lumiere.js` ne voient pas la meme liste. */
  const couvert = (x, y) => {
    for (const o of obstacles) {
      if (Math.abs(x - o.x) < o.w / 2 + 14 && Math.abs(y - o.y) < o.h / 2 + 14) return true;
    }
    for (const h of hazards) {
      if ((x - h.x) ** 2 + (y - h.y) ** 2 < (h.r + 14) ** 2) return true;
    }
    return false;
  };
  const regards = [];
  for (const c of v) {
    for (const s of c.segs) {
      const l = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
      const n = Math.max(1, Math.round(l / 460));
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const x = s.x0 + (s.x1 - s.x0) * u, y = s.y0 + (s.y1 - s.y0) * u;
        const ph = rand();
        if (!couvert(x, y)) regards.push({ x, y, ph });
      }
    }
  }
  couleeCache = { cle, v: { canaux: v, regards } };
  return couleeCache.v;
}

/* L'ARRIERE-PLAN, CUIT UNE FOIS. Deux couches parce qu'un fond a UNE seule
   parallaxe est un autocollant : les astres sont a l'infini (0,05), les etoiles
   proches derivent trois fois plus (0,16), et c'est cet ecart qui donne la
   profondeur. Deux `drawImage` par image, rien de plus.

   La derive de camera reste sous 250 px sur cette arene — la marge suffit, il
   n'y a pas de bouclage a gerer. */
const FOND_MARGE = 300;
let fondCache = null;

/* UN ARRIERE-PLAN EST TROIS COUCHES, ET LE LIEU DIT LESQUELLES. `fondEspace`
   etait la seule recette possible, en dur, et `decor.js` la demandait par un
   `fond !== "espace"` — donc un deuxieme lieu qui declarait un fond n aurait
   simplement rien affiche, en silence. Meme forme que `TUILE` : une table, et
   `verifierFonds()` la croise avec `BIOMES`.

   Les trois couches ont toujours le meme ROLE — l infini, ce qui separe, ce
   qui bouge — et jamais la meme matiere : la Nebuleuse met du gaz et des
   etoiles la ou le Secteur met du smog et de la circulation. */
const FOND = {
  espace: { loin: cuireLoin, sep: cuireGaz, pres: cuireEtoiles },
  ville:  { loin: cuireVille, sep: cuireSmog, pres: cuireCirculation },
};

export function fondDe(kind, seed, viewW, viewH) {
  const r = FOND[kind];
  if (!r) return null;
  const cle = `${kind}|${seed}|${viewW}|${viewH}`;
  if (fondCache && fondCache.cle === cle) return fondCache;
  const w = viewW + FOND_MARGE * 2, h = viewH + FOND_MARGE * 2;
  fondCache = { cle, w, h, marge: FOND_MARGE, ech: GAZ_ECH,
                loin: r.loin(seed, w, h),
                gaz: r.sep(seed, w, h),
                pres: r.pres(seed, w, h) };
  return fondCache;
}

/* Un lieu qui declare un fond sans recette n affiche rien et ne le dit pas ;
   une recette que plus aucun lieu ne demande est du code mort qui ne se
   signale jamais. Les deux sens, comme partout ailleurs. */
export function verifierFonds() {
  const soucis = [];
  const demandes = new Set();
  for (const b of BIOMES) {
    if (!b.fond) continue;
    demandes.add(b.fond);
    if (!FOND[b.fond]) soucis.push(`${b.key} : fond « ${b.fond} » sans recette`);
  }
  for (const k of Object.keys(FOND)) {
    if (!demandes.has(k)) soucis.push(`fond « ${k} » : aucun lieu ne le demande`);
  }
  return soucis;
}

/* LA TROISIEME PARALLAXE, ET ELLE EST CUITE A MOITIE. Deux couches donnaient
   deja de la profondeur ; ce qui manquait etait ce qui se passe ENTRE l infini
   et les etoiles proches — du gaz, assez pres pour deriver visiblement, assez
   diffus pour n avoir aucune arete. Une nappe floue n a pas besoin d un pixel
   par pixel : elle est cuite en demi-resolution et etiree au blit, soit un
   quart de la memoire des deux autres.

   Sa bande croise celle de `cuireLoin` au lieu de la suivre — deux bandes
   paralleles se lisent comme une seule, deux bandes croisees comme un volume. */
const GAZ_ECH = 2;
function cuireGaz(seed, w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(w / GAZ_ECH); cv.height = Math.ceil(h / GAZ_ECH);
  const g = cv.getContext("2d");
  const rand = mulberry32((seed >>> 0) * 4111 + 23);
  const W = cv.width, H = cv.height;

  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(0.66);
  const bande = g.createLinearGradient(0, -H * 0.30, 0, H * 0.30);
  bande.addColorStop(0, alpha("#1c3a4a", 0));
  bande.addColorStop(0.48, alpha("#48407a", 0.10));
  bande.addColorStop(1, alpha("#1c3a4a", 0));
  g.fillStyle = bande;
  g.fillRect(-W, -H * 0.30, W * 2, H * 0.60);
  g.restore();

  // LES NUAGES SOMBRES COMPTENT AUTANT QUE LES CLAIRS : une nebuleuse sans
  // masque d absorption est une brume. Trois nappes noires, plus larges.
  for (let i = 0; i < 3; i++) {
    const x = rand() * W, y = rand() * H, r = 140 + rand() * 190;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, alpha("#000000", 0.30));
    grad.addColorStop(1, alpha("#000000", 0));
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (let i = 0; i < 6; i++) {
    const x = rand() * W, y = rand() * H, r = 90 + rand() * 160;
    const col = ["#3a5a8c", "#5a3a70", "#2a6a72"][(rand() * 3) | 0];
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, alpha(col, 0.09 + rand() * 0.05));
    grad.addColorStop(1, alpha(col, 0));
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return cv;
}

function cuireLoin(seed, w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const rand = mulberry32((seed >>> 0) * 2749 + 17);

  // PAS DE RAINBOW NEON : deux froids et UN chaud, tous sous 22 % d'opacite.
  const teintes = ["#2a3a6e", "#3d2a5e", "#1c3a4a", "#5a3a22"];

  /* LA NEBULEUSE DOIT ETRE LE SUJET DU FOND, pas une tache dedans. Une BANDE
     traverse toute l image en diagonale — c est elle qui donne l echelle, parce
     qu elle ne tient pas dans l ecran — et les nuages se posent dessus. Un amas
     de taches rondes de meme taille se lit comme du bruit ; une bande plus des
     taches se lit comme une structure. */
  const ang = -0.42;
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(ang);
  const bande = g.createLinearGradient(0, -h * 0.42, 0, h * 0.42);
  bande.addColorStop(0, alpha("#2a3a6e", 0));
  bande.addColorStop(0.42, alpha("#3d2a5e", 0.13));
  bande.addColorStop(0.55, alpha("#2a3a6e", 0.16));
  bande.addColorStop(1, alpha("#1c3a4a", 0));
  g.fillStyle = bande;
  g.fillRect(-w, -h * 0.42, w * 2, h * 0.84);
  g.restore();

  for (let i = 0; i < 9; i++) {
    const x = rand() * w, y = rand() * h, r = 260 + rand() * 420;
    const col = teintes[(rand() * (i >= 7 ? 4 : 3)) | 0];
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, alpha(col, 0.13 + rand() * 0.07));
    grad.addColorStop(0.55, alpha(col, 0.05));
    grad.addColorStop(1, alpha(col, 0));
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (let i = 0; i < 3; i++) {
    astre(g, 120 + rand() * (w - 240), 90 + rand() * (h - 180),
          40 + rand() * 110, rand() * Math.PI * 2, rand());
  }
  return cv;
}

// UN ASTRE SANS TERMINATEUR EST UN DISQUE. Le croissant sombre est ce qui le
// rend spherique, et il coute un second arc en `destination-out` decale.
function astre(g, x, y, r, ang, t) {
  const froid = t < 0.62;
  const base = froid ? "#4a5570" : "#6b4a3a";
  const bord = froid ? PROP.astre : "#ffb060";

  const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, alpha(base, 0.46));
  grad.addColorStop(1, alpha(base, 0.14));
  g.fillStyle = grad;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();

  g.save();
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "#000";
  g.beginPath();
  g.arc(x + Math.cos(ang) * r * 0.62, y + Math.sin(ang) * r * 0.62, r * 0.98, 0, Math.PI * 2);
  g.fill();
  g.restore();

  g.strokeStyle = alpha(bord, 0.16);
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(x, y, r - 0.8, ang + Math.PI * 0.45, ang + Math.PI * 1.55);
  g.stroke();
}

/* Les etoiles sont groupees par PALIER de clarte : trois `fill`, pas un par
   etoile. Un `arc` par point aurait coute six cents chemins pour six cents
   pixels. */
function cuireEtoiles(seed, w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const rand = mulberry32((seed >>> 0) * 6779 + 31);
  const paliers = [[0.30, 1.0, 520], [0.55, 1.6, 190], [0.85, 2.4, 55]];

  for (const [a, taille, nombre] of paliers) {
    g.fillStyle = alpha(PROP.astre, a);
    g.beginPath();
    for (let i = 0; i < nombre; i++) {
      const x = rand() * w, y = rand() * h;
      g.rect(x, y, taille, taille);
    }
    g.fill();
  }
  return cv;
}

function fricheLegacy(g, rand, usure) {
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
      c.strokeStyle = alpha("#ffffff", 0.030);
      c.lineWidth = 0.8;
      c.translate(-0.9, -0.9);
      c.stroke();
    });
  }

  for (let i = 0; i < 260; i++) {
    const x = rand() * TILE, y = rand() * TILE, r = 0.6 + rand() * 1.5;
    g.fillStyle = alpha(rand() < 0.6 ? "#000000" : "#c9d2c4", 0.03 + rand() * 0.05);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  const n = 4 + Math.round(4 * usure);
  for (let i = 0; i < n; i++) tache(g, rand() * TILE, rand() * TILE, 30 + rand() * 55, "#5c6b4a", 0.07 + 0.06 * usure);
  const m = Math.round(4 * usure);
  for (let i = 0; i < m; i++) tache(g, rand() * TILE, rand() * TILE, 45 + rand() * 60, "#000000", 0.10);
}

/* LE SECTEUR : DE L ASPHALTE MOUILLE. C est le seul sol du depot qui RENDE la
   lumiere au lieu de l absorber, et c est toute la difference entre une rue de
   nuit et une salle sombre — une salle sombre est noire, une rue de nuit est
   brillante ET noire en meme temps.

   TROIS COUCHES, dans cet ordre, et aucune n est decorative :
   1. l enrobe, granuleux et presque noir ;
   2. les REPRISES — les tranchees rebouchees, en bandes plus claires et aux
      bords francs. C est ce qui dit qu il y a un reseau DESSOUS, donc ce qui
      justifie que les dangers du lieu en sortent ;
   3. le film d eau, quelques nappes claires tres etirees.

   PAS DE MAILLE DE 5 M ICI, comme la Friche et la Nebuleuse : une chaussee n a
   pas de joints techniques reguliers, elle a des reprises irregulieres, et c est
   la couche 2 qui les pose. Une maille par-dessus dirait « dalle d atelier ». */
// meme raison que `nebuleuseBasse` : l enrobe et ses reprises, sans le grain fin
// ni le film d eau. Ce qui reste dit encore « chaussee », et rien d autre ne dit
// chaussee.
function secteurBasse(g, rand, usure) {
  g.fillStyle = alpha("#1a1228", 0.95);
  g.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < 3; i++) {
    const vert = rand() < 0.5;
    const u = rand() * TILE;
    const w = 14 + rand() * 26;
    g.fillStyle = alpha("#2b2340", 0.55 + usure * 0.20);
    if (vert) g.fillRect(u, 0, w, TILE);
    else      g.fillRect(0, u, TILE, w);
    g.strokeStyle = alpha("#000000", 0.34);
    g.lineWidth = 1.4;
    g.beginPath();
    if (vert) { g.moveTo(u, 0); g.lineTo(u, TILE); g.moveTo(u + w, 0); g.lineTo(u + w, TILE); }
    else      { g.moveTo(0, u); g.lineTo(TILE, u); g.moveTo(0, u + w); g.lineTo(TILE, u + w); }
    g.stroke();
  }
}

function secteur(g, rand, usure) {
  if (gfx <= GFX_LOW) return secteurBasse(g, rand, usure);

  g.fillStyle = alpha("#1a1228", 0.95);
  g.fillRect(0, 0, TILE, TILE);

  // 1. L ENROBE. Un grain dense et fin : de l asphalte n a pas de motif, il a une
  // texture, et c est ce qui le separe du beton lave de la Friche.
  for (let i = 0; i < 260; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const t = 1 + rand() * 2.2;
    g.fillStyle = alpha(rand() < 0.42 ? "#000000" : "#3a3352", 0.05 + rand() * 0.07);
    g.fillRect(x, y, t, t);
  }

  // 2. LES REPRISES. Bords FRANCS, largeurs inegales, jamais paralleles entre
  // elles : une tranchee rebouchee ne suit pas un plan, elle suit une panne.
  for (let i = 0; i < 3; i++) {
    const vert = rand() < 0.5;
    const u = rand() * TILE;
    const w = 14 + rand() * 26;
    g.fillStyle = alpha("#2b2340", 0.55 + usure * 0.20);
    if (vert) g.fillRect(u, 0, w, TILE);
    else      g.fillRect(0, u, TILE, w);
    g.strokeStyle = alpha("#000000", 0.34);
    g.lineWidth = 1.4;
    g.beginPath();
    if (vert) { g.moveTo(u, 0); g.lineTo(u, TILE); g.moveTo(u + w, 0); g.lineTo(u + w, TILE); }
    else      { g.moveTo(0, u); g.lineTo(TILE, u); g.moveTo(0, u + w); g.lineTo(TILE, u + w); }
    g.stroke();
  }

  // 3. LE FILM D EAU. Des nappes tres etirees, presque horizontales, jamais
  // rondes : une flaque de chaussee suit la pente, elle ne fait pas un disque.
  for (let i = 0; i < 5; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const rx = 26 + rand() * 54, ry = 5 + rand() * 9;
    const grad = g.createRadialGradient(x, y, 0, x, y, rx);
    grad.addColorStop(0, alpha("#8f7fc4", 0.10));
    grad.addColorStop(1, alpha("#8f7fc4", 0));
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    g.fillStyle = grad;
    g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill();
    g.restore();
  }
}

/* LE MACRO DU SECTEUR : DES HALOS, PAS DES TACHES. Les quatre autres lieux
   posent a cette echelle de la SALISSURE — rouille, vegetation, suie, givre. Une
   rue de nuit n a pas de grande tache : elle a des ILOTS DE LUMIERE, larges et
   mous, entre lesquels il fait noir. C est ce qui remplace la salissure ici, et
   c est aussi ce qui donne au lieu son rythme quand on le traverse.

   Deux teintes seulement, et ce sont celles du lieu : le magenta des enseignes,
   le cyan de ce qui reste allume tout seul. La troisieme couche est le NOIR
   entre elles, et il est plus fort que partout ailleurs — sans lui les halos ne
   sont pas des halos, juste un fond clair. */
function macroSecteur(g, rand, usure) {
  for (let i = 0; i < 6; i++) {
    const r = 300 + rand() * 380;
    nappe(g, rand() * MACRO, rand() * MACRO, r, "#000000", 0.07 + rand() * 0.08);
  }
  for (let i = 0; i < 5; i++) {
    const chaud = rand() < 0.6;
    const rx = 200 + rand() * 300, ry = rx * (0.55 + rand() * 0.45);
    nappeOvale(g, rand() * MACRO, rand() * MACRO, rx, ry, rand() * Math.PI,
               chaud ? "#ff3d9a" : "#4de0ff", 0.022 + 0.014 * (1 - usure));
  }
  // LES TRAINEES D EAU : plus l arene est usee, plus il a plu. Elles sont
  // presque horizontales et tres etirees — de l eau suit la pente, elle ne fait
  // pas de tache ronde, et c est la meme regle que sur la tuile de sol.
  const n = 3 + Math.round(3 * usure);
  for (let i = 0; i < n; i++) {
    const a = (rand() - 0.5) * 0.5;
    nappeOvale(g, rand() * MACRO, rand() * MACRO, 380 + rand() * 340, 34 + rand() * 44,
               a, "#8f7fc4", 0.020 + 0.016 * usure);
  }
}

/* TROIS TABLES, ET C EST UNE CORRECTION. La matiere d un lieu se choisissait par
   des chaines de `if` a defaut implicite : `cle === "fonderie" ? ... : usine`.
   Tant qu il y avait quatre lieux ecrits en meme temps, ca tenait. Le cinquieme
   a montre le prix : il n avait AUCUNE branche dans `cuireMacro`, donc il
   heritait en silence du macro de l Usine — de la rouille d atelier sur de
   l asphalte mouille — et rien ne pouvait le signaler, parce qu un defaut
   implicite est indistinguable d un choix.

   Une TABLE rend l absence visible, et `verifierMatiere()` la refuse. Meme forme
   que `DANGER`, `BLOC`, `SOUFFLE`, `ZONES` : ajouter un lieu = une entree.

   Les cinq lieux ont une entree dans les trois : plus aucun defaut implicite,
   donc plus rien a heriter sans le savoir. */
/* ===========================================================================
   CE QUI EST ARRIVE A CE SOL-LA. Le theme donne la MATIERE — un beton d Usine
   reste un beton d Usine —, la region donne le TRAITEMENT : douze passes
   fermees, posees par-dessus la tuile du theme, dans sa palette.

   C EST LE LEVIER LE PLUS FORT DU DEPOT, ET IL SE MESURE. `floorPattern`
   n avait pas d argument de region : une arene de 14400 x 8100 avait UN sol,
   et le sol est la plus grande surface de l ecran. Deux regions ne differaient
   que par la teinte d arene (dE 3 a 8) sous un motif identique AU PIXEL — les
   deux captures de `docs/screens/` le montrent.

   IL VAUT A TOUS LES PALIERS DE `gfx`, comme la palette d arene : c est de la
   DA, pas de la qualite. Ce qui suit `gfx` est la DENSITE des grains, jamais la
   presence du traitement — sinon `low` retombe sur un sol unique, donc sur le
   defaut qu on corrige.

   Il passe APRES la maille : une resine coule sur le joint, elle ne s arrete
   pas devant.
   =========================================================================== */
const T_LISSE = 0, T_DALLE = 1, T_GRANULAT = 2, T_POUDRE = 3, T_AJOURE = 4,
      T_TECHNIQUE = 5, T_TERRE = 6, T_VEGETAL = 7, T_BITUME = 8, T_MINERAL = 9,
      T_MOUILLE = 10, T_MARQUE = 11;

const DENS = () => (gfx > GFX_LOW ? 1 : 0.4);

function trLisse(g, rand, usure) {
  g.fillStyle = alpha("#ffffff", 0.020 - 0.008 * usure);
  g.fillRect(0, 0, TILE, TILE);
  g.lineWidth = 46;
  g.strokeStyle = alpha("#ffffff", 0.013);
  for (let i = 0; i < 3; i++) {
    const d = rand() * TILE;
    // pente 1 et periode TILE : les trois copies suffisent a fermer le raccord.
    for (const o of [-TILE, 0, TILE]) {
      g.beginPath(); g.moveTo(d + o, 0); g.lineTo(d + o + TILE, TILE); g.stroke();
    }
  }
  for (let i = 0; i < Math.round(5 * DENS()); i++) {
    tache(g, rand() * TILE, rand() * TILE, 30 + rand() * 50, "#ffffff", 0.020);
  }
}

function trDalle(g, rand, usure) {
  const s = alpha("#000000", 0.26 + 0.10 * usure);
  const c = alpha("#ffffff", 0.050 - 0.020 * usure);
  const v = Math.round(TILE * (0.34 + rand() * 0.32));
  joint(g, v, 0, v, TILE, s, c, 3.5);
  joint(g, 0, v, TILE, v, s, c, 3.5);
  joint(g, 0, 0, 0, TILE, s, c, 3.5);
  joint(g, 0, 0, TILE, 0, s, c, 3.5);
  for (const [x, y] of [[0, 0], [v, 0], [0, v], [v, v]]) {
    poser(g, x, y, 10, (cc) => {
      cc.fillStyle = alpha("#000000", 0.16 + 0.10 * usure);
      cc.fillRect(-5, -5, 10, 10);
    });
  }
}

function trGranulat(g, rand, usure) {
  const n = Math.round(520 * DENS());
  for (let i = 0; i < n; i++) {
    const x = rand() * TILE, y = rand() * TILE, r = 1 + rand() * 2.6;
    g.fillStyle = alpha(rand() < 0.5 ? "#000000" : "#ffffff", 0.05 + rand() * 0.09);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < Math.round(4 * DENS()); i++) {
    tache(g, rand() * TILE, rand() * TILE, 40 + rand() * 60, "#000000", 0.06 + 0.04 * usure);
  }
}

function trPoudre(g, rand, usure) {
  g.fillStyle = alpha("#e8e2d4", 0.026 + 0.018 * (1 - usure));
  g.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < Math.round(7 * DENS()); i++) {
    tache(g, rand() * TILE, rand() * TILE, 40 + rand() * 70, "#e8e2d4", 0.05);
  }
  const n = Math.round(160 * DENS());
  g.fillStyle = alpha("#ffffff", 0.05);
  for (let i = 0; i < n; i++) g.fillRect(rand() * TILE, rand() * TILE, 1.4, 1.4);
}

// 40 divise 400, et le nombre de rangs est PAIR : le decalage en quinconce se
// raccorde donc de lui-meme d une tuile a la suivante.
const AJOURE_PAS = 40;
function trAjoure(g) {
  let rang = 0;
  for (let y = AJOURE_PAS / 2; y < TILE; y += AJOURE_PAS, rang++) {
    const dec = (rang & 1) ? AJOURE_PAS / 2 : 0;
    for (let x = AJOURE_PAS / 2; x < TILE; x += AJOURE_PAS) {
      poser(g, (x + dec) % TILE, y, 11, (c) => {
        c.fillStyle = alpha("#000000", 0.42);
        c.beginPath(); c.arc(0, 0, 7.5, 0, Math.PI * 2); c.fill();
        c.strokeStyle = alpha("#ffffff", 0.06);
        c.lineWidth = 1.2;
        c.beginPath(); c.arc(0, -0.8, 8.4, 0, Math.PI * 2); c.stroke();
      });
    }
  }
}

const PLAQUE = TILE / 4;
function trTechnique(g, rand, usure) {
  const s = alpha("#000000", 0.22), c = alpha("#ffffff", 0.045 - 0.015 * usure);
  for (let v = 0; v < TILE; v += PLAQUE) {
    joint(g, v, 0, v, TILE, s, c, 2);
    joint(g, 0, v, TILE, v, s, c, 2);
  }
  for (let y = 0; y < TILE; y += PLAQUE) {
    for (let x = 0; x < TILE; x += PLAQUE) {
      for (const [bx, by] of [[7, 7], [PLAQUE - 7, 7], [7, PLAQUE - 7], [PLAQUE - 7, PLAQUE - 7]]) {
        poser(g, x + bx, y + by, 4, (cc) => {
          cc.fillStyle = alpha("#000000", 0.30);
          cc.beginPath(); cc.arc(0.5, 0.7, 2.4, 0, Math.PI * 2); cc.fill();
          cc.fillStyle = alpha("#c8d2e2", 0.16 - 0.06 * usure);
          cc.beginPath(); cc.arc(0, 0, 2.1, 0, Math.PI * 2); cc.fill();
        });
      }
    }
  }
}

function trTerre(g, rand, usure) {
  for (let i = 0; i < Math.round(14 * DENS()); i++) {
    tache(g, rand() * TILE, rand() * TILE, 40 + rand() * 90,
      rand() < 0.5 ? "#2b2318" : "#6b5c44", 0.10 + rand() * 0.10);
  }
  const n = Math.round(140 * DENS());
  g.fillStyle = alpha("#0d0b07", 0.22);
  for (let i = 0; i < n; i++) {
    const x = rand() * TILE, y = rand() * TILE, r = 1.2 + rand() * 2.4;
    g.beginPath(); g.ellipse(x, y, r * 1.4, r, rand() * 3, 0, Math.PI * 2); g.fill();
  }
}

function trVegetal(g, rand, usure) {
  for (let i = 0; i < Math.round(9 * DENS()); i++) {
    tache(g, rand() * TILE, rand() * TILE, 34 + rand() * 60, PROP.vert, 0.10 + rand() * 0.08);
  }
  g.lineWidth = 1.2;
  const n = Math.round(120 * DENS());
  for (let i = 0; i < n; i++) {
    // LE BRIN POUSSE SUR LE JOINT : c est le seul endroit ou rien ne l empeche.
    const surX = rand() < 0.5;
    const v = Math.round(rand() * 4) * PLAQUE;
    const x = surX ? v : rand() * TILE, y = surX ? rand() * TILE : v;
    const l = 3 + rand() * 7, a = rand() * Math.PI * 2;
    g.strokeStyle = alpha(PROP.vert, 0.20 + rand() * 0.22);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
}

function trBitume(g, rand, usure) {
  g.fillStyle = alpha("#000000", 0.10);
  g.fillRect(0, 0, TILE, TILE);
  const n = Math.round(420 * DENS());
  for (let i = 0; i < n; i++) {
    g.fillStyle = alpha(rand() < 0.4 ? "#ffffff" : "#000000", 0.035 + rand() * 0.05);
    g.fillRect(rand() * TILE, rand() * TILE, 1.6, 1.6);
  }
  // LE RAPIECAGE A UN BORD FRANC, et c est ce qui le separe d une tache : une
  // reprise de chaussee est DECOUPEE, une souillure ne l est pas.
  for (let i = 0; i < 2; i++) {
    const w = 70 + rand() * 130, h = 50 + rand() * 110;
    const x = rand() * TILE, y = rand() * TILE;
    for (const dx of [-TILE, 0, TILE]) {
      for (const dy of [-TILE, 0, TILE]) {
        g.fillStyle = alpha("#000000", 0.13);
        g.fillRect(x + dx, y + dy, w, h);
        g.strokeStyle = alpha("#000000", 0.20);
        g.lineWidth = 2;
        g.strokeRect(x + dx, y + dy, w, h);
      }
    }
  }
}

function trMineral(g, rand, usure) {
  g.lineWidth = 3;
  for (let i = 0; i < Math.round(26 * DENS()); i++) {
    const y = rand() * TILE, x = rand() * TILE, l = 60 + rand() * 220;
    const dy = (rand() - 0.5) * 10;
    g.strokeStyle = alpha(rand() < 0.5 ? "#000000" : "#ffffff", 0.030 + rand() * 0.030);
    for (const o of [-TILE, 0]) {
      g.beginPath(); g.moveTo(x + o, y); g.lineTo(x + o + l, y + dy); g.stroke();
    }
  }
  g.fillStyle = alpha("#ffffff", 0.06);
  for (let i = 0; i < Math.round(60 * DENS()); i++) {
    const x = rand() * TILE, y = rand() * TILE, r = 2 + rand() * 4;
    g.beginPath();
    g.moveTo(x, y - r); g.lineTo(x + r, y + r); g.lineTo(x - r, y + r * 0.6);
    g.closePath(); g.fill();
  }
}

function trMouille(g, rand, usure) {
  g.fillStyle = alpha("#000000", 0.10);
  g.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < Math.round(6 * DENS()); i++) {
    const rx = 30 + rand() * 60, ry = 14 + rand() * 26;
    poser(g, rand() * TILE, rand() * TILE, Math.max(rx, ry) + 4, (c) => {
      c.fillStyle = alpha("#ffffff", 0.055);
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = alpha("#ffffff", 0.08);
      c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.stroke();
    });
  }
  g.lineWidth = 2;
  g.strokeStyle = alpha("#ffffff", 0.030);
  for (let i = 0; i < Math.round(30 * DENS()); i++) {
    const x = rand() * TILE, y = rand() * TILE, l = 20 + rand() * 60;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke();
  }
}

function trMarque(g, rand, usure, cle) {
  const col = cle === "secteur" ? "#e8d24a" : "#d8b23c";
  const a = 0.17 - 0.07 * usure;
  const v = Math.round(TILE * (0.18 + rand() * 0.24));
  // UN MARQUAGE TRAVERSE, IL NE TACHE PAS : deux bandes de bout en bout.
  g.strokeStyle = alpha(col, a);
  g.lineWidth = 7;
  for (const [x0, y0, x1, y1] of [[v, 0, v, TILE], [0, TILE - v, TILE, TILE - v]]) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  const hx = TILE * 0.58, hy = TILE * 0.12, hw = TILE * 0.34, hh = TILE * 0.16;
  g.save();
  g.beginPath(); g.rect(hx, hy, hw, hh); g.clip();
  g.strokeStyle = alpha(col, a * 0.8);
  g.lineWidth = 6;
  for (let d = -hh; d < hw + hh; d += 16) {
    g.beginPath(); g.moveTo(hx + d, hy + hh); g.lineTo(hx + d + hh, hy); g.stroke();
  }
  g.restore();
}

const TRAITEMENT = {
  [T_LISSE]: trLisse, [T_DALLE]: trDalle, [T_GRANULAT]: trGranulat,
  [T_POUDRE]: trPoudre, [T_AJOURE]: trAjoure, [T_TECHNIQUE]: trTechnique,
  [T_TERRE]: trTerre, [T_VEGETAL]: trVegetal, [T_BITUME]: trBitume,
  [T_MINERAL]: trMineral, [T_MOUILLE]: trMouille, [T_MARQUE]: trMarque,
};

/* QUEL TRAITEMENT POUR QUELLE REGION. Une entree par loi d implantation, dans
   l ordre d `OBSTACLES` — c est `verifierMatiere` qui compare les longueurs a
   `loisDe`, pas la confiance. DEUX REGIONS D UN THEME N ONT JAMAIS LE MEME :
   c est la seule chose qui rende une frontiere visible au sol. */
const SOL_REGION = {
  usine:     [T_LISSE, T_MARQUE, T_TECHNIQUE, T_DALLE],
  fonderie:  [T_LISSE, T_GRANULAT, T_MOUILLE, T_DALLE],
  friche:    [T_TERRE, T_GRANULAT, T_POUDRE, T_VEGETAL],
  nebuleuse: [T_TECHNIQUE, T_AJOURE, T_LISSE, T_MINERAL],
  secteur:   [T_MARQUE, T_MOUILLE, T_BITUME, T_DALLE],
};

export function traitementDe(cle, loi) {
  const t = SOL_REGION[cle] ?? SOL_REGION.usine;
  return t[loi] ?? t[0];
}

const TUILE = {
  usine, fonderie, friche, nebuleuse, secteur,
};

const MACRO_TUILE = {
  usine: macroUsine,
  friche: macroFriche,
  fonderie: macroFonderie,
  nebuleuse: macroNebuleuse,
  secteur: macroSecteur,
};

/* QUI PORTE LA PORTE_MAILLE DE 5 M. Un joint technique regulier decrit une
   installation ENTRETENUE : l Usine et la Fonderie en ont une, les trois autres
   non — la Friche a des joints de coulage irreguliers, la Nebuleuse son nid
   d abeille, le Secteur ses reprises de chaussee. L ecrire en liste plutot qu en
   suite de `!==` fait qu un sixieme lieu doit CHOISIR au lieu d heriter. */
const PORTE_MAILLE = new Set(["usine", "fonderie"]);

/* LES TROIS TABLES CONTRE `BIOMES`, DANS LES DEUX SENS. Un lieu sans tuile
   heritait de l Usine sans que rien ne le dise ; une tuile pour un lieu qui
   n existe plus ne se signale jamais non plus. */
export function verifierMatiere() {
  const soucis = [];
  const cles = new Set(BIOMES.map(b => b.key));
  for (const b of BIOMES) {
    if (!TUILE[b.key]) soucis.push(`${b.key} : aucune tuile de sol`);
    if (!MACRO_TUILE[b.key]) soucis.push(`${b.key} : aucune seconde periode (heritera de l Usine)`);
  }
  for (const k of Object.keys(TUILE)) if (!cles.has(k)) soucis.push(`${k} : tuile sans lieu`);
  for (const k of Object.keys(MACRO_TUILE)) if (!cles.has(k)) soucis.push(`${k} : seconde periode sans lieu`);
  for (const k of PORTE_MAILLE) if (!cles.has(k)) soucis.push(`${k} : maille sans lieu`);

  /* DEUX REGIONS D UN THEME NE PEUVENT PAS AVOIR LE MEME SOL, et un traitement
     ecrit que personne ne tire est mort. Les deux se lisent sur les tables,
     donc c est gratuit — et sans le premier, une frontiere ne se voit pas. */
  const tires = new Set();
  for (const b of BIOMES) {
    const t = SOL_REGION[b.key];
    if (!t) { soucis.push(`${b.key} : aucun traitement de sol`); continue; }
    const n = loisDe(b.key);
    if (t.length !== n) soucis.push(`${b.key} : ${t.length} traitements de sol pour ${n} regions`);
    const vus = new Map();
    for (let i = 0; i < t.length; i++) {
      if (!TRAITEMENT[t[i]]) { soucis.push(`${b.key}/region ${i} : traitement ${t[i]} inconnu`); continue; }
      tires.add(t[i]);
      if (vus.has(t[i])) {
        soucis.push(`${b.key} : les regions ${vus.get(t[i])} et ${i} partagent le traitement de sol ${t[i]}`
          + " — leur frontiere ne se verra pas");
      } else vus.set(t[i], i);
    }
  }
  for (const k of Object.keys(SOL_REGION)) {
    if (!cles.has(k)) soucis.push(`${k} : traitements de sol sans lieu`);
  }
  for (const k of Object.keys(TRAITEMENT)) {
    if (!tires.has(+k)) soucis.push(`traitement de sol ${k} : ecrit, tire par aucune region`);
  }
  return soucis;
}

/* LA VILLE, VUE D EN HAUT ET DE TRES LOIN. Meme contrat que `fondEspace` et
   meme cache : trois couches cuites une fois, blittees avec trois derives
   differentes.

   LE SECTEUR EST UN PONT LOGISTIQUE AU-DESSUS DE LA MEGAPOLE, et c est ce fond
   qui le dit. C est aussi ce qui justifie ce que le lieu porte deja au sol : ses
   grilles d air, ses plaques d egout et son effluent donnent tous sur QUELQUE
   CHOSE, et ce quelque chose est en bas.

   TROIS COUCHES, DE L INFINI AU PROCHE :
   1. `loin` — la masse batie. Des toits, pas des facades : on regarde vers le
      BAS. Un immeuble vu du dessus est un rectangle sombre borde de lumiere, et
      c est la seule chose qui le distingue d une tache.
   2. `gaz` — la couche de smog qui separe le pont de la ville. Elle est ce qui
      rend la distance credible : sans elle, les toits sont a portee de main.
   3. `pres` — la CIRCULATION. Des trainees courtes, alignees sur deux axes, a
      des altitudes differentes. C est la seule couche qui bouge assez pour se
      lire comme du mouvement plutot que comme de la matiere.

   PAS DE NEON DANS LE FOND. La regle du lieu est que le sature appartient aux
   enseignes, qui sont AU NIVEAU DU JOUEUR ; une ville lointaine qui clignoterait
   en magenta concurrencerait ses propres devantures et rendrait le sol illisible.
   Le fond est donc froid et sourd, et c est le contraste qui fait exister les
   enseignes. */
function cuireVille(seed, w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const rand = mulberry32((seed >>> 0) * 3253 + 29);

  g.fillStyle = alpha("#070610", 0.96);
  g.fillRect(0, 0, w, h);

  /* LES AVENUES D ABORD, LES ILOTS ENSUITE. Poser des immeubles au hasard donne
     un champ de rectangles ; poser d abord la TRAME et batir dedans donne une
     ville. Deux axes, pas orthogonaux a l ecran — une grille alignee sur la vue
     se lirait comme un motif d interface. */
  const ang = 0.22;
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(ang);
  const PAS = 132;
  for (let u = -w; u < w; u += PAS) {
    const large = 16 + rand() * 14;
    g.fillStyle = alpha("#0d0c1a", 0.9);
    g.fillRect(u, -h, large, h * 2);
    g.fillRect(-w, u, w * 2, large * 0.8);
  }

  // LES ILOTS. Chacun est un toit : sombre, avec une arete claire du cote de la
  // lumiere du lieu, et quelques edicules dessus.
  for (let i = 0; i < 90; i++) {
    const bx = -w + rand() * w * 2, by = -h + rand() * h * 2;
    const bw = 34 + rand() * 78, bh = 34 + rand() * 78;
    g.fillStyle = alpha("#14121f", 0.72 + rand() * 0.2);
    g.fillRect(bx, by, bw, bh);
    g.fillStyle = alpha("#3a3556", 0.16 + rand() * 0.12);
    g.fillRect(bx + bw - 3, by, 3, bh);
    g.fillRect(bx, by + bh - 3, bw, 3);
    // les EDICULES : ce qui depasse d un toit et qui donne l echelle.
    const n = 1 + ((rand() * 3) | 0);
    g.fillStyle = alpha("#0a0912", 0.8);
    for (let k = 0; k < n; k++) {
      g.fillRect(bx + 5 + rand() * (bw - 16), by + 5 + rand() * (bh - 16),
                 6 + rand() * 10, 6 + rand() * 10);
    }
    // et de tres rares fenetres CHAUDES : un immeuble habite au milieu du froid.
    if (rand() < 0.34) {
      g.fillStyle = alpha("#ffcf8a", 0.10 + rand() * 0.10);
      for (let k = 0; k < 3; k++) {
        g.fillRect(bx + 4 + rand() * (bw - 10), by + 4 + rand() * (bh - 10), 2.4, 2.4);
      }
    }
    /* LA PUBLICITE, ET C EST LE SEUL ENDROIT DU LIEU OU LA COULEUR A LE DROIT DE
       SATURER. Le Secteur tient sa lisibilite en gardant l arene sombre et son
       rose emissif pour la signaletique ; une enseigne de trente etages plus bas
       ne dispute rien au centre de l ecran, elle est a DEUX couches de lui.
       DEUX teintes et non une : une seule ferait une ville qui appartient a un
       seul annonceur. Une par tirage, jamais melangees sur un meme toit.
       Le panneau est plus HAUT que large, ou franchement plus large que haut —
       jamais carre : un carre lumineux sur un toit est un edicule qui brille,
       une proportion franche est une enseigne. Le halo est un second rectangle
       plus grand et bien plus pale, parce que la couche est CUITE une fois et
       qu un flou coute a chaque pixel pour un resultat qu on ne verra pas a
       cette echelle. */
    if (rand() < 0.11) {
      const teinte = rand() < 0.5 ? "#ff3d9a" : "#3de0ff";
      const debout = rand() < 0.5;
      const pw = debout ? 3 + rand() * 3 : 14 + rand() * 20;
      const ph = debout ? 16 + rand() * 22 : 3 + rand() * 3;
      const px = bx + 3 + rand() * Math.max(1, bw - pw - 6);
      const py = by + 3 + rand() * Math.max(1, bh - ph - 6);
      g.fillStyle = alpha(teinte, 0.05);
      g.fillRect(px - 3, py - 3, pw + 6, ph + 6);
      g.fillStyle = alpha(teinte, 0.16 + rand() * 0.14);
      g.fillRect(px, py, pw, ph);
    }
  }
  g.restore();
  return cv;
}

// LE SMOG : la couche qui rend la distance credible. Cuite en demi-resolution
// comme le gaz de la Nebuleuse — une nappe floue n a pas besoin d un pixel par
// pixel, et c est un quart de la memoire des deux autres.
function cuireSmog(seed, w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(w / GAZ_ECH); cv.height = Math.ceil(h / GAZ_ECH);
  const g = cv.getContext("2d");
  const rand = mulberry32((seed >>> 0) * 6151 + 71);
  const W = cv.width, H = cv.height;
  for (let i = 0; i < 14; i++) {
    const x = rand() * W, y = rand() * H, r = (60 + rand() * 130) / GAZ_ECH * GAZ_ECH;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const froid = rand() < 0.7;
    grad.addColorStop(0, alpha(froid ? "#2a3352" : "#4a3a52", 0.10 + rand() * 0.08));
    grad.addColorStop(1, alpha(froid ? "#2a3352" : "#4a3a52", 0));
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return cv;
}

/* LA CIRCULATION AERIENNE. Des TRAINEES et non des points : a cette distance un
   vehicule n est pas un objet, c est la lumiere qu il laisse. Elles sont
   alignees sur deux axes seulement — une circulation qui part dans toutes les
   directions n est pas une circulation, c est de la poussiere. */
function cuireCirculation(seed, w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const rand = mulberry32((seed >>> 0) * 8419 + 13);
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(0.22);
  g.lineCap = "round";
  for (let i = 0; i < 46; i++) {
    const vertical = rand() < 0.5;
    const x = -w + rand() * w * 2, y = -h + rand() * h * 2;
    const L = 10 + rand() * 26;
    // deux couleurs, et elles disent le SENS : ce qui vient vers vous est blanc,
    // ce qui s eloigne est rouge. La regle est la meme dans toutes les villes.
    const vers = rand() < 0.5;
    g.strokeStyle = alpha(vers ? "#cfe0ff" : "#ff7a6a", 0.16 + rand() * 0.16);
    g.lineWidth = 1 + rand() * 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(vertical ? x : x + L, vertical ? y + L : y);
    g.stroke();
  }
  g.restore();
  return cv;
}
