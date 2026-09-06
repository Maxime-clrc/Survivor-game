import {
  BIOMES, BLOCS, B_CARCASSE, B_CHAINE, B_CONDUITE, B_CUVE, B_DEBRIS, B_FOUR,
  B_FRAGMENT, B_MACHINE, B_MUR, B_POSTE, B_RUINE, B_TRAVEE,
  B_DEVANTURE, B_PYLONE, B_CONTENEUR,
  B_PALETTIER, B_PILE, B_QUAI, B_REMORQUE,
  B_CLOTURE, B_ETABLI, B_OUVERTE, B_TRANSFO,
  B_BASSIN, B_MALAXEUR, B_MOULE,
  B_BANCHE, B_EPAVES, B_GRILLAGE, B_POTEAU,
  B_BRAS, B_CLOISON, B_COQUE, B_CONSOLE, gabaritsDe,
} from "/shared/biomes.js";
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

/* LA TABLE DE DESSIN DU BATI, sur le patron de `DANGER[biome][kind]`. Le lieu
   donnait la silhouette ET l habillage ; il ne donne plus que le rayon du
   catalogue, et c est la FAMILLE qui decide. Ajouter un objet a un lieu = une
   entree, comme pour un danger.

   `hors` est ce qui sort de l empreinte — la seule chose de ce module qui vive
   hors du clip, donc la seule qu il faut declarer plutot que deduire.

   Toutes les familles d un meme lieu partagent encore leur fiche : c est voulu,
   ce lot est la PLOMBERIE et ne change pas un pixel. Les lots suivants les
   separent une par une, et `verifierBlocs()` refuse qu une famille en soit
   privee — un `kind` sans fiche ne leverait rien, il replierait en silence. */
/* UNE FAMILLE BATIE EST UN COUPLE, PAS UN DESSIN. `forme` et `habit` etaient
   ecrits cote a cote dans la meme entree, donc 1:1 : quinze familles, quinze
   formes, quinze habillages, et aucun reemploi possible. Un conteneur n existait
   qu une fois, dans le Secteur.

   SEPARES, ILS SE COMPOSENT. La SILHOUETTE dit la forme — ce que la collision
   AABB doit remplir —, l HABILLAGE dit la matiere et son usure. Une meme barre
   peut porter de la tole peinte a l Usine et du givre a la Nebuleuse : deux
   familles, un dessin de forme, deux dessins de matiere. C est ce qui rend une
   bibliotheque de biomes payable — le couple 1:1 aurait demande un dessin par
   famille.

   CE LOT NE CHANGE PAS UN PIXEL. Les trente fonctions sont celles d avant, aux
   memes appels, dans le meme ordre ; seule la table change de forme, et
   `verifierBlocs` gagne de quoi voir une silhouette ou un habillage que plus
   personne ne tire. */
const SILHOUETTE = {
  barre: formeChaine, caisson: formeCellule, machine: formeMachine,
  octogone: formeOctogone, conduite: formeConduite, fut: formeCuve,
  pan: formeRuine, mur_bas: formeMurBas, chassis: formeCarcasse,
  eclat: formeFragment, travee: formeTravee, debris: formeDebris,
  devanture: formeDevanture, mat: formePylone, conteneur: formeConteneur,
  palettier: formePalettier, pile: formePile, quai: formeQuai,
  ouverte: formeOuverte, cadre: formeCadre,
};

const HABILLAGE = {
  chaine, cellule, poste, four, conduite, cuve,
  ruine: ruinePan, murBas, carcasse, fragment, travee, debris,
  devanture, pylone, conteneur,
  palettier, pile, quai, remorque,
  etabli, ouverte, transfo, cloture,
  moule, malaxeur, bassin,
  epaves, poteau, banche,
  bras, coque, cloison, console: console_,
};

// CE QUI SORT DE L EMPREINTE. Deux familles seulement, et c est un troisieme
// canal : ni forme, ni matiere — ce qui deborde de la boite.
const DEBORD = { pan: debord, mur_bas: eboulisPied };

const BLOC = {
  usine: {
    [B_CHAINE]: { sil: "barre", hab: "chaine" },
    [B_MACHINE]: { sil: "caisson", hab: "cellule" },
    [B_POSTE]: { sil: "machine", hab: "poste" },
    [B_PALETTIER]: { sil: "palettier", hab: "palettier" },
    [B_PILE]: { sil: "pile", hab: "pile" },
    [B_QUAI]: { sil: "quai", hab: "quai" },
    // LE MEME CHASSIS QUE LA FRICHE, UNE AUTRE MATIERE : premier couple du
    // depot a servir deux themes.
    [B_REMORQUE]: { sil: "chassis", hab: "remorque" },
    [B_ETABLI]: { sil: "caisson", hab: "etabli" },
    [B_OUVERTE]: { sil: "ouverte", hab: "ouverte" },
    // LA MEME SILHOUETTE QUE LA CUVE DE FONDERIE, une autre matiere : un
    // transformateur et une cuve sont deux recipients, et ce sont les ailettes
    // qui disent lequel.
    [B_TRANSFO]: { sil: "fut", hab: "transfo" },
    [B_CLOTURE]: { sil: "cadre", hab: "cloture" },
  },
  fonderie: {
    [B_FOUR]: { sil: "octogone", hab: "four" },
    [B_CONDUITE]: { sil: "conduite", hab: "conduite" },
    [B_CUVE]: { sil: "fut", hab: "cuve" },
    // LE MEME CADRE QUE LA CLAIRE-VOIE, et il sert ici a montrer le SABLE :
    // une silhouette qui laisse voir a travers n a pas qu un usage.
    [B_MOULE]: { sil: "cadre", hab: "moule" },
    [B_MALAXEUR]: { sil: "fut", hab: "malaxeur" },
    [B_BASSIN]: { sil: "caisson", hab: "bassin" },
  },
  friche: {
    [B_RUINE]: { sil: "pan", hab: "ruine", hors: "pan" },
    [B_MUR]: { sil: "mur_bas", hab: "murBas", hors: "mur_bas" },
    [B_CARCASSE]: { sil: "chassis", hab: "carcasse" },
    [B_EPAVES]: { sil: "pile", hab: "epaves" },
    // LE MEME CADRE QUE LA CLAIRE-VOIE, sans un dessin de plus : la palette du
    // lieu suffit a separer une cloture d atelier d une cloture de casse.
    [B_GRILLAGE]: { sil: "cadre", hab: "cloture" },
    [B_POTEAU]: { sil: "mat", hab: "poteau" },
    /* PAS `mur_bas` : ses creneaux disent qu un mur a CASSE, et une banche est
       neuve. `verifierEmpreinte` l a refusee a 15,6 % pour un seuil de 10 —
       une silhouette de ruine sur un panneau de coffrage faisait buter sur du
       vide en plus de mentir. */
    [B_BANCHE]: { sil: "caisson", hab: "banche" },
  },
  nebuleuse: {
    [B_FRAGMENT]: { sil: "eclat", hab: "fragment" },
    [B_TRAVEE]: { sil: "travee", hab: "travee" },
    [B_DEBRIS]: { sil: "debris", hab: "debris" },
    [B_BRAS]: { sil: "mat", hab: "bras" },
    [B_COQUE]: { sil: "caisson", hab: "coque" },
    [B_CLOISON]: { sil: "caisson", hab: "cloison" },
    [B_CONSOLE]: { sil: "caisson", hab: "console" },
  },
  secteur: {
    [B_DEVANTURE]: { sil: "devanture", hab: "devanture" },
    [B_PYLONE]: { sil: "mat", hab: "pylone" },
    [B_CONTENEUR]: { sil: "conteneur", hab: "conteneur" },
  },
};

const formeDe = (f) => SILHOUETTE[f.sil] ?? SILHOUETTE.caisson;
const habitDe = (f) => HABILLAGE[f.hab] ?? HABILLAGE.cellule;

// le repli d un lieu est cuit ICI et non cherche a l appel : `drawObstacles`
// passe par cette fonction quatre fois par obstacle et par image.
const REPLI = {};
for (const cle of Object.keys(BLOC)) REPLI[cle] = BLOC[cle][Object.keys(BLOC[cle])[0]];

function fiche(cle, kind) {
  const t = BLOC[cle] ?? BLOC.usine;
  return t[kind] ?? REPLI[cle] ?? REPLI.usine;
}

export function silhouetteBloc(g, o, cle) {
  return formeDe(fiche(cle, o.kind))(g, o);
}

function formeMachine(g, o) { machine(g, -o.w / 2, -o.h / 2, o.w, o.h); }
function formeOctogone(g, o) { octogone(g, -o.w / 2, -o.h / 2, o.w, o.h); }
function formeChanfreine(g, o) { chanfreine(g, -o.w / 2, -o.h / 2, o.w, o.h, CHANFREIN_LARGE); }
function formeRuine(g, o) { ruine(g, o, -o.w / 2, -o.h / 2, o.w, o.h); }

/* LE FRAGMENT S EST DETACHE DE QUELQUE CHOSE. Ses quatre coins etaient coupes
   a la meme profondeur, ce qui decrit une piece USINEE — l inverse de ce qu il
   est. Un seul coin est desormais CISAILLE, large et oblique, les trois autres
   restent nets : la rupture est un evenement, elle n arrive pas quatre fois au
   meme objet. Le coin cisaille est deterministe, donc dix-huit fragments ne
   pointent pas tous dans le meme sens. */
const FRAG_CISAILLE = 0.26;
function formeFragment(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const s = graine(o);
  const c = Math.min(CHANFREIN, w * 0.10, h * 0.10);
  const cw = w * FRAG_CISAILLE, ch = h * FRAG_CISAILLE;
  const coin = (s >>> 27) & 3;
  const p = [];
  /* LE COIN CISAILLE VAUT DEUX POINTS, ET LEUR ORDRE DEPEND DU COIN. Le premier
     est sur l arete d ARRIVEE, le second sur celle de DEPART : aux coins pairs
     on arrive par un cote vertical, aux impairs par un horizontal. Les emettre
     toujours dans le meme ordre fait un trace qui SE CROISE — la forme reste
     dessinable, elle a juste un enroulement inverse sur le triangle, et le
     resultat mesure 10 % de vide au lieu de 4. */
  const angle = (i, ax, ay) => {
    if (i !== coin) { p.push([ax, ay]); return; }
    const dx = ax === x ? cw : -cw, dy = ay === y ? ch : -ch;
    if (i & 1) p.push([ax + dx, ay], [ax, ay + dy]);
    else p.push([ax, ay + dy], [ax + dx, ay]);
  };
  angle(0, x, y);
  p.push([x + w - c, y]);
  angle(1, x + w, y);
  p.push([x + w, y + h - c]);
  angle(2, x + w, y + h);
  p.push([x + c, y + h]);
  angle(3, x, y + h);
  p.push([x, y + c]);
  g.beginPath();
  g.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
  g.closePath();
}

/* LA TRAVEE EST UNE POUTRE A TREILLIS, et une poutre a treillis a des NŒUDS.
   Elle mesure 32 px de large pour 504 de long : a cette echelle un chanfrein de
   bout ne se voit pas, et un rectangle plein serait la silhouette de la chaine
   de l Usine. Ce qui se voit est le decoupage regulier de ses deux flancs — une
   encoche de 4 px sur 32, soit un huitieme de la largeur, au pas des diagonales
   de l habillage. Aucune autre piece du depot n a une arete rythmee. */
const TRAVEE_PAS = 28;
const TRAVEE_ENCOCHE = 4;
const TRAVEE_LARGE = 7;
function formeTravee(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const vert = h >= w;
  const L = vert ? h : w, T = vert ? w : h;
  const e = Math.min(TRAVEE_ENCOCHE, T * 0.14);
  const n = Math.max(2, Math.round(L / TRAVEE_PAS));
  const pt = (u, v) => (vert ? g.lineTo(x + v, y + u) : g.lineTo(x + u, y + v));

  /* UNE ENCOCHE EST PONCTUELLE. Le premier trace alternait plat / creux d un
     nœud a l autre : un CRENEAU, qui retire la moitie de la longueur — 12,7 %
     du rectangle, au-dessus du seuil, et un joueur qui glisse le long aurait
     bute sur du vide un pas sur deux. Un creux triangulaire au nœud seul retire
     `large x profondeur / 2` par nœud, soit 3,0 %. */
  g.beginPath();
  g.moveTo(x, y);
  for (let i = 1; i < n; i++) {
    const u = (i / n) * L;
    pt(u - TRAVEE_LARGE / 2, 0);
    pt(u, e);
    pt(u + TRAVEE_LARGE / 2, 0);
  }
  pt(L, 0);
  pt(L, T);
  for (let i = n - 1; i >= 1; i--) {
    const u = (i / n) * L;
    pt(u + TRAVEE_LARGE / 2, T);
    pt(u, T - e);
    pt(u - TRAVEE_LARGE / 2, T);
  }
  pt(0, T);
  g.closePath();
}

/* LE DEBRIS EST UN ECLAT, PAS UNE PIECE. Il laissait 9,6 % de son rectangle
   vide — le pire du depot — parce qu il portait le chanfrein de 16 px du
   fragment sur un gabarit de 58 x 29 : quatre coins coupes de plus de la moitie
   de la hauteur. Il a maintenant sa propre loi : un contour a huit sommets qui
   MORD peu et PARTOUT, deterministe, donc irregulier sans etre creux. */
const DEBRIS_MORSURE = 0.16;
function formeDebris(g, o) {
  const w = o.w, h = o.h;
  const s = graine(o);
  const mx = w * DEBRIS_MORSURE, my = h * DEBRIS_MORSURE;
  const d = i => ((s >>> (i * 3)) & 7) / 7;
  g.beginPath();
  g.moveTo(-w / 2 + mx * d(0), -h / 2);
  g.lineTo(w / 2 - mx * d(1), -h / 2);
  g.lineTo(w / 2, -h / 2 + my * d(2));
  g.lineTo(w / 2, h / 2 - my * d(3));
  g.lineTo(w / 2 - mx * d(4), h / 2);
  g.lineTo(-w / 2 + mx * d(5), h / 2);
  g.lineTo(-w / 2, h / 2 - my * d(6));
  g.lineTo(-w / 2, -h / 2 + my * d(7));
  g.closePath();
}

/* LA CONDUITE EST UN CYLINDRE VU DE DESSUS : ses FLANCS sont droits sur toute
   la longueur, ses BOUTS sont ronds. Elle ne coupe donc que ses quatre coins de
   bout, et profond (16 px sur 43 de haut) — l inverse de l octogone du four, qui
   coupe partout et peu. Deux pieces longues du meme lieu, deux lectures : le
   four est une MASSE posee, la conduite un TRONCON qui continue hors du cadre. */
function formeConduite(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const c = Math.min(CHANFREIN_LARGE, w * 0.12, h * 0.40);
  g.beginPath();
  g.moveTo(x + c, y);
  g.lineTo(x + w - c, y);
  g.lineTo(x + w, y + c);
  g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h);
  g.lineTo(x + c, y + h);
  g.lineTo(x, y + h - c);
  g.lineTo(x, y + c);
  g.closePath();
}

/* LE PALETTIER — UNE STRUCTURE, PAS UNE MASSE. Ce qui le distingue d une barre
   est qu il est AJOURE : des montants regulierement espacés et deux lisses qui
   les relient. Il remplit son rectangle — la collision est une AABB — mais son
   interieur laisse voir le sol entre les montants, et c est ce qui fait lire un
   rack plutot qu un mur.
   LE PAS EST FIXE ET PAS PROPORTIONNEL : une travee de rack a une echelle
   REELLE, c est ce qui donne l echelle du lieu quand on la longe. */
const RACK_PAS = 46;
function formePalettier(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const long = w >= h;
  const c = Math.min(6, (long ? h : w) * 0.30);
  g.beginPath();
  g.moveTo(x + c, y);
  g.lineTo(x + w - c, y);
  g.lineTo(x + w, y + c);
  g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h);
  g.lineTo(x + c, y + h);
  g.lineTo(x, y + h - c);
  g.lineTo(x, y + c);
  g.closePath();
}

/* LA PILE — CE QU ON A EMPILE, DONC CE QUI N EST PAS D APLOMB. Chaque etage est
   decale du precedent, et le decalage est deterministe : deux piles voisines ne
   penchent pas du meme cote. Le contour reste dans le rectangle. */
const PILE_ETAGES = 3;
function formePile(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const s = graine(o);
  const d = Math.min(w * 0.16, 7);
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y + h * 0.34);
  for (let i = PILE_ETAGES - 1; i >= 0; i--) {
    const yy = y + h * (i / PILE_ETAGES);
    const dx = ((s >> (i * 3)) & 1) ? d : 0;
    g.lineTo(x + dx, yy + h / PILE_ETAGES);
    g.lineTo(x + dx, yy);
  }
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + h);
  g.closePath();
}

/* LE QUAI — UNE DALLE SURELEVEE, DONC UN SEUL BORD FRANC ET TROIS CHANFREINS
   COURTS. Le bord franc est celui qu on accoste ; c est lui qui dit le sens, et
   il ne bouge pas avec la piece. */
function formeQuai(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const c = Math.min(8, w * 0.14, h * 0.14);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + h);
  g.lineTo(x, y + h);
  g.lineTo(x, y + h - c);
  g.lineTo(x + c * 0.5, y + h / 2);
  g.lineTo(x, y + c);
  g.closePath();
}


/* LA MACHINE OUVERTE — UN CARTER ECARTE. Le contour est celui d un caisson dont
   UN cote a ete tire : une echancrure franche, profonde, sur une seule face. Il
   remplit son rectangle — l echancrure se referme par le bord — donc la
   collision reste juste. Le cote echancre suit la piece, pas la camera. */
const OUVERTE_ECHANCRE = 0.19;
function formeOuverte(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const s = graine(o);
  const c = Math.min(CHANFREIN, w * 0.14, h * 0.14);
  const e = Math.min(w, h) * OUVERTE_ECHANCRE;
  const cote = s & 3;
  g.beginPath();
  g.moveTo(x + c, y);
  if (cote === 0) { g.lineTo(x + w * 0.38, y); g.lineTo(x + w * 0.43, y + e); g.lineTo(x + w * 0.62, y + e); g.lineTo(x + w * 0.68, y); }
  g.lineTo(x + w - c, y);
  g.lineTo(x + w, y + c);
  if (cote === 1) { g.lineTo(x + w, y + h * 0.38); g.lineTo(x + w - e, y + h * 0.43); g.lineTo(x + w - e, y + h * 0.62); g.lineTo(x + w, y + h * 0.68); }
  g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h);
  if (cote === 2) { g.lineTo(x + w * 0.68, y + h); g.lineTo(x + w * 0.62, y + h - e); g.lineTo(x + w * 0.43, y + h - e); g.lineTo(x + w * 0.38, y + h); }
  g.lineTo(x + c, y + h);
  g.lineTo(x, y + h - c);
  if (cote === 3) { g.lineTo(x, y + h * 0.68); g.lineTo(x + e, y + h * 0.62); g.lineTo(x + e, y + h * 0.43); g.lineTo(x, y + h * 0.38); }
  g.lineTo(x, y + c);
  g.closePath();
}

/* LE CADRE — ON VOIT A TRAVERS, ON NE PASSE PAS. C est la silhouette la plus
   reutilisee du dossier (onze biomes la tirent), et elle a une regle a elle :
   ELLE N EST JAMAIS HABILLEE D UN VIDE. Son interieur porte toujours une
   matiere — claire-voie, verre, panneau — sinon le joueur bute sur du rien, et
   `verifierEmpreinte` aurait raison de la refuser. `verifierBlocs` tient la
   regle par table plutot que par confiance. */
function formeCadre(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  g.beginPath();
  g.rect(x, y, w, h);
  g.closePath();
}

/* LA CUVE EST UN RECIPIENT, ET UN RECIPIENT N A PAS D ANGLE. Son biseau est
   ALLONGE — large en x, court en y — la ou l octogone du four les prend egaux :
   c est ce qui la rend capsulaire au lieu de trapue, et donc ce qui la separe
   d un four en petit. */
function formeCuve(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const bx = Math.min(w * 0.17, 22), by = Math.min(h * 0.17, 11);
  g.beginPath();
  g.moveTo(x + bx, y);
  g.lineTo(x + w - bx, y);
  g.lineTo(x + w, y + by);
  g.lineTo(x + w, y + h - by);
  g.lineTo(x + w - bx, y + h);
  g.lineTo(x + bx, y + h);
  g.lineTo(x, y + h - by);
  g.lineTo(x, y + by);
  g.closePath();
}

/* LA CHAINE EST LA SEULE PIECE DU DEPOT SANS UN SEUL COIN CASSE. C est ce qui
   la distingue a 368 x 32 px, ou un chanfrein de 6 px ne se voit pas : une
   poutre de convoyeur est EXTRUDEE, elle sort d une filiere, elle n a pas ete
   posee coin par coin. Les trois autres familles d Usine ont leurs coins
   coupes ; celle-ci non, et c est une decision, pas un oubli. */
function formeChaine(g, o) {
  g.beginPath();
  g.rect(-o.w / 2, -o.h / 2, o.w, o.h);
}

/* LA CELLULE A UN BATI ET UNE TABLE, donc un PROFIL EN MARCHE. Un caisson plein
   se lit « armoire » quelle que soit sa taille ; ce qui dit « machine-outil »
   est qu une partie soit haute (la broche, l habillage) et l autre basse (le
   plan de travail ou la piece arrive). La marche fait 12 % de la hauteur — 14 px
   sur 117 —, donc elle se voit sans ouvrir un vide que la collision dementirait. */
const CELL_MARCHE = 0.12;
const CELL_TABLE = 0.38;
function formeCellule(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const s = graine(o);
  const c = Math.min(CHANFREIN, w * 0.20, h * 0.20);
  const m = h * CELL_MARCHE;
  const t = w * CELL_TABLE;
  const gauche = (s >>> 23) & 1;
  const tx0 = gauche ? x : x + w - t;
  const tx1 = gauche ? x + t : x + w;
  g.beginPath();
  if (gauche) {
    g.moveTo(tx0, y + m);
    g.lineTo(tx1, y + m);
    g.lineTo(tx1, y);
    g.lineTo(x + w - c, y);
    g.lineTo(x + w, y + c);
  } else {
    g.moveTo(x + c, y);
    g.lineTo(tx0, y);
    g.lineTo(tx0, y + m);
    g.lineTo(tx1, y + m);
  }
  g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h);
  g.lineTo(x, y + h);
  g.lineTo(x, y + (gauche ? m : c));
  g.closePath();
}

/* LE MUR BAS N EST PAS UN PAN DE MUR EN PLUS PETIT. Il fait 176 x 36 px : a
   cette hauteur une crete DENTELEE se lit comme du bruit, parce que la morsure
   fait le tiers de la piece. Ce qui se lit, c est un profil en MARCHES — des
   blocs de couronnement tombes un par un, arete franche entre deux —, et une
   extremite qui a plie. Meme morsure de 4 px, lecture opposee. */
function formeMurBas(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const s = graine(o);
  const n = Math.max(3, Math.min(7, Math.round(w / 34)));
  g.beginPath();
  g.moveTo(x, y + Math.min(6, h * 0.22));
  for (let i = 0; i < n; i++) {
    const d = (((s >>> (i * 3)) & 3) / 3) * CRETE_MORSURE;
    g.lineTo(x + (i / n) * w, y + d);
    g.lineTo(x + ((i + 1) / n) * w, y + d);
  }
  g.lineTo(x + w, y + h);
  g.lineTo(x, y + h);
  g.closePath();
}

/* LA CARCASSE EST UN CORPS, PAS UNE MACONNERIE : un bout pointe (le nez, deux
   coins coupes larges), l autre reste franc (la caisse arriere ouverte). C est
   la seule silhouette ORIENTEE du depot, et l orientation est deterministe par
   obstacle — un champ d epaves toutes nez au meme cap serait un parking. */
function formeCarcasse(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const s = graine(o);
  const long = w >= h;
  const c = Math.min(CHANFREIN_LARGE, (long ? w : h) * 0.34, (long ? h : w) * 0.42);
  const av = (s >>> 21) & 1;
  g.beginPath();
  if (long) {
    const nez = av ? x + w : x;
    const cul = av ? x : x + w;
    const dir = av ? -1 : 1;
    g.moveTo(cul, y);
    g.lineTo(nez + dir * c, y);
    g.lineTo(nez, y + c);
    g.lineTo(nez, y + h - c);
    g.lineTo(nez + dir * c, y + h);
    g.lineTo(cul, y + h);
  } else {
    const nez = av ? y + h : y;
    const cul = av ? y : y + h;
    const dir = av ? -1 : 1;
    g.moveTo(x, cul);
    g.lineTo(x, nez + dir * c);
    g.lineTo(x + c, nez);
    g.lineTo(x + w - c, nez);
    g.lineTo(x + w, nez + dir * c);
    g.lineTo(x + w, cul);
  }
  g.closePath();
}

// UN `kind` SANS FICHE NE LEVERAIT RIEN : `fiche()` replie, et le lieu
// dessinerait sa premiere famille partout sans qu on le voie. Meme role que
// `verifierFeedback()` pour les recettes de son.
export function verifierBlocs() {
  const soucis = [];
  /* TROIS TABLES A CROISER AU LIEU D UNE, ET LES DEUX SENS COMPTENT. Une fiche
     qui nomme une silhouette absente replie sur `caisson` EN SILENCE — le meme
     defaut que `fiche()` a deja paye —, et une silhouette ecrite que plus aucune
     famille ne tire est un dessin mort qu on entretient. */
  const sil = new Set(), hab = new Set(), hors = new Set();
  for (let k = 0; k < BLOCS.length; k++) {
    const b = BLOCS[k];
    if (!BLOC[b.lieu]) { soucis.push(`${b.lieu} : aucune table de dessin`); continue; }
    const f = BLOC[b.lieu][k];
    if (!f) { soucis.push(`${b.lieu}/${b.key} : aucune fiche de dessin`); continue; }
    if (!SILHOUETTE[f.sil]) {
      soucis.push(`${b.lieu}/${b.key} : silhouette « ${f.sil} » inconnue`);
    } else sil.add(f.sil);
    if (!HABILLAGE[f.hab]) {
      soucis.push(`${b.lieu}/${b.key} : habillage « ${f.hab} » inconnu`);
    } else hab.add(f.hab);
    if (f.hors !== undefined) {
      if (!DEBORD[f.hors]) soucis.push(`${b.lieu}/${b.key} : debord « ${f.hors} » inconnu`);
      else hors.add(f.hors);
    }
  }
  for (const k of Object.keys(SILHOUETTE)) {
    if (!sil.has(k)) soucis.push(`silhouette « ${k} » : ecrite, tiree par aucune famille`);
  }
  for (const k of Object.keys(HABILLAGE)) {
    if (!hab.has(k)) soucis.push(`habillage « ${k} » : ecrit, tire par aucune famille`);
  }
  for (const k of Object.keys(DEBORD)) {
    if (!hors.has(k)) soucis.push(`debord « ${k} » : ecrit, tire par aucune famille`);
  }
  return soucis;
}

/* « LA SILHOUETTE REMPLIT SON RECTANGLE » ETAIT UNE REGLE ECRITE, PAS UNE REGLE
   TENUE : rien ne la rejouait, et le plan va poser huit formes de plus. Une
   forme qui rentre ses coins fait buter le joueur sur du vide — l ecart ne se
   voit pas a l arret, il se sent en glissant le long d un mur, et c est le pire
   endroit ou decouvrir un defaut.

   Le `g` passe aux formes est un ENREGISTREUR, pas un canvas : elles n emettent
   que `beginPath/moveTo/lineTo/closePath`, donc la mesure est de la geometrie
   pure et tourne partout. Deux verdicts : aucun sommet hors de l empreinte, et
   la part de rectangle laissee vide sous le seuil.

   LE SEUIL SUIT CE QUE LE DEPOT TIENT VRAIMENT. Il valait 12 % quand la plus
   creuse des formes etait le debris de la Nebuleuse a 9,6 % — un chanfrein de
   16 px sur 58 x 29. Ce debris a maintenant sa propre loi et tombe a 2,3 %, la
   plus creuse est la ruine de la Friche a 8,2 %, et laisser le seuil ou il
   etait reviendrait a garder de la marge pour un defaut corrige. */
const EMPREINTE_SEUIL = 0.10;

function enregistreur() {
  let poly = [];
  return {
    poly: () => poly,
    beginPath() { poly = []; },
    moveTo(x, y) { poly.push([x, y]); },
    lineTo(x, y) { poly.push([x, y]); },
    // `rect` est un sous-trace ferme a lui seul : une forme qui l utilise doit
    // etre la SEULE de son chemin, sinon le test de parite melangerait deux
    // enroulements. Aucune ne le fait, et c est la chaine qui l a revele — le
    // banc a leve `g.rect is not a function` au lieu de mesurer du vide.
    rect(x, y, w, h) { poly.push([x, y], [x + w, y], [x + w, y + h], [x, y + h]); },
    closePath() {},
  };
}

function dansPoly(poly, x, y) {
  let dedans = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/* LE PIEGE, PAYE DES LA PREMIERE MESURE : `graine(o)` vaut ZERO en (0, 0), donc
   un obstacle pose a l origine tire la variante nulle de toute forme aleatoire —
   creneaux tous plats, nez toujours du meme cote. Le banc annoncait 0,0 % de
   vide sur le mur bas, ce qui etait vrai et ne voulait rien dire. On mesure donc
   sur plusieurs POSITIONS et on garde la PIRE. */
const EMPREINTE_POSES = [[0, 0], [137, 89], [911, 433], [2477, 1601], [313, 2153]];

export function videEmpreinte(kind, w, h, pas = 2, x0 = 0, y0 = 0) {
  const b = BLOCS[kind];
  const f = b && BLOC[b.lieu]?.[kind];
  if (!f) return { vide: 1, hors: 0 };
  const g = enregistreur();
  formeDe(f)(g, { x: x0, y: y0, w, h, kind, maxHp: 0 });
  const poly = g.poly();

  let hors = 0;
  for (const [px, py] of poly) {
    if (Math.abs(px) > w / 2 + 0.01 || Math.abs(py) > h / 2 + 0.01) hors++;
  }
  let dedans = 0, total = 0;
  for (let y = -h / 2 + pas / 2; y < h / 2; y += pas) {
    for (let x = -w / 2 + pas / 2; x < w / 2; x += pas) {
      total++;
      if (dansPoly(poly, x, y)) dedans++;
    }
  }
  return { vide: total ? 1 - dedans / total : 1, hors };
}

export function verifierEmpreinte(pas = 2) {
  const soucis = [];
  for (let k = 0; k < BLOCS.length; k++) {
    const b = BLOCS[k];
    if (!BLOC[b.lieu]?.[k]) continue;
    for (const [w, h] of gabaritsDe(k)) {
      let vide = 0, hors = 0;
      for (const [x, y] of EMPREINTE_POSES) {
        const m = videEmpreinte(k, w, h, pas, x, y);
        vide = Math.max(vide, m.vide);
        hors += m.hors;
      }
      const ou = `${b.lieu}/${b.key} ${Math.round(w)}x${Math.round(h)}`;
      if (hors > 0) soucis.push(`${ou} : ${hors} sommet(s) hors de l'empreinte`);
      if (vide > EMPREINTE_SEUIL) {
        soucis.push(`${ou} : ${(vide * 100).toFixed(1)} % de l'empreinte vide au pire `
          + `(seuil ${EMPREINTE_SEUIL * 100} %)`);
      }
    }
  }
  return soucis;
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
  // une vitrine a un CADRE, et un cadre est ce qui se lit de plus loin dans une
  // rue : le lisere le plus marque des cinq lieux, et c est voulu.
  secteur:   { plat: 0.52, relief: 0.78 },
  nebuleuse: { plat: 0.45, relief: 0.70 },
  fonderie:  { plat: 0.16, relief: 0.26 },
  friche:    { plat: 0.10, relief: 0.16 },
};

export function contourDe(cle) { return CONTOUR[cle] ?? CONTOUR.usine; }

/* CE QU UN LIEU EMET, EN TABLE. Ces cinq valeurs se choisissaient par une
   chaine de ternaires a defaut implicite, et le cinquieme lieu en a paye le
   prix : il heritait du profil complet de l Usine, CHENILLE COMPRISE — or le
   commentaire de `dessinerLed` dit noir sur blanc qu elle n appartient qu a
   l Usine, parce qu un point qui COURT dit qu une ligne tourne. Une devanture
   ne tourne pas. La regle etait ecrite et le code disait le contraire, en
   silence : exactement le defaut que ce depot a deja paye sur la gueule du four.

   `seuil` est la part sur dix qui EMET (la garde est `h % 10 >= seuil`), et
   c est le seul champ qui varie par famille — un four ouvre sa gueule, une
   conduite jamais. `verifierLed()` croise la table avec `BIOMES` dans les deux
   sens et refuse deux lieux sous le meme `type`. */
const LED = {
  usine: { seuil: { defaut: 6 }, part: 0.52, fonte: false,
           porte: { defaut: 74 }, type: "bande" },
  fonderie: { seuil: { [B_CONDUITE]: 0, [B_FOUR]: 6, defaut: 10 }, part: 0.34,
              fonte: true, porte: { [B_FOUR]: 128, defaut: 74 }, type: "gueule" },
  friche: { seuil: { [B_RUINE]: 1, defaut: 0 }, part: 0.52, fonte: false,
            porte: { defaut: 74 }, type: "tube" },
  nebuleuse: { seuil: { defaut: 7 }, part: 0.52, fonte: false,
               porte: { defaut: 74 }, type: "feux" },
  /* LE SEUL LIEU OU PRESQUE TOUT EMET, et c est son identite : sa masse batie
     EST de la signaletique. Neuf sur dix, la bande la plus longue des cinq, et
     la portee la plus grande — une devanture eclaire la rue d en face, pas
     seulement son propre pied. */
  secteur: { seuil: { defaut: 9 }, part: 0.72, fonte: false,
             porte: { defaut: 118 }, type: "enseigne" },
};

export function verifierLed() {
  const soucis = [];
  const cles = new Set(BIOMES.map(b => b.key));
  for (const b of BIOMES) if (!LED[b.key]) soucis.push(`${b.key} : aucun profil emissif`);
  for (const k of Object.keys(LED)) if (!cles.has(k)) soucis.push(`${k} : profil emissif sans lieu`);
  const vus = new Map();
  for (const [k, f] of Object.entries(LED)) {
    if (f.seuil.defaut === undefined) soucis.push(`${k} : seuil sans defaut`);
    if (f.porte.defaut === undefined) soucis.push(`${k} : portee sans defaut`);
    if (vus.has(f.type)) soucis.push(`${k} et ${vus.get(f.type)} partagent le type « ${f.type} »`);
    else vus.set(f.type, k);
  }
  return soucis;
}

/* LA SOURCE FIXE D'UN BLOC. `decor.js` la DESSINE, `lumiere.js` l'ALLUME, les
   deux lisent cette fonction — sinon la lueur au sol et le trait a l'ecran
   finissent sur deux aretes differentes. Elle porte sa TEINTE et son RAYON :
   une gueule de four et un feu de position ne sont pas la meme lumiere.

   Reservee aux blocs permanents : sur une couverture destructible elle
   concurrencerait le contour tirete, qui est du gameplay. */
export function ledDe(o) {
  if (o.maxHp > 0) return null;
  // LE LIEU D UN BLOC EST CELUI DE SA POSITION, pas celui de la camera : sur une
  // carte composee, un four vu depuis la Friche voisine porte sa propre gueule.
  const cle = biomeKey();
  const h = ((o.x * 73856093) ^ (o.y * 19349663)) >>> 0;
  const S = skin();

  // le four a TOUJOURS sa gueule, la friche presque jamais : la premiere
  // fonctionne, la seconde a ete abandonnee. Et quand elle s allume, c est sur
  // un PAN DE MUR : un tube se fixe en hauteur. Sur un mur bas de 36 px il
  // n aurait pas de quoi tenir, et une epave n a jamais eu d eclairage fixe.
  /* ET UNE CONDUITE N A PAS DE GUEULE. Les trois familles de Fonderie tiraient
     la meme, donc neuf conduites par arene portaient une bouche de four : ce qui
     brule est DEDANS, une conduite est calorifugee et ne s ouvre pas. Elle garde
     sa chaleur par ses joints, dans son habillage — pas par une source.

     LE FOUR DESCEND A 7, ET C EST UNE CORRECTION. A 10 la condition `(h % 10) >=
     seuil` etait TOUJOURS fausse, donc `ledDe` ne rendait jamais `null` pour ce
     lieu, donc l EMBASE DE CHEMINEE de `four()` — le pied des cheminees du
     premier plan, sans lequel elles ne tiennent a rien — n a jamais ete dessinee
     une seule fois. La regle etait ecrite dans la charte et le code disait le
     contraire, en silence. Un four sur trois montre desormais son conduit au
     lieu de sa bouche. */
  const F = LED[cle] ?? LED.usine;
  if ((h % 10) >= (F.seuil[o.kind] ?? F.seuil.defaut)) return null;

  const cote = (h >>> 4) % 4;
  const inset = 4;
  const hw = o.w / 2 - inset, hh = o.h / 2 - inset;
  const long = (cote & 1 ? o.h : o.w) * F.part;
  const col = F.fonte ? PROP.fonte : S.emis;
  // UNE POCHE N ECLAIRE PAS COMME UN FOUR. Le four ouvre sa bouche sur ce qui
  // brule dedans, la cuve ne montre que sa surface : meme matiere, deux fois
  // moins de portee.
  const r = long + (F.porte[o.kind] ?? F.porte.defaut);
  const type = F.type;

  if (cote === 0) return { x: o.x, y: o.y - hh, dx: 1, dy: 0, len: long, col, r, type, cote };
  if (cote === 1) return { x: o.x + hw, y: o.y, dx: 0, dy: 1, len: long, col, r, type, cote };
  if (cote === 2) return { x: o.x, y: o.y + hh, dx: 1, dy: 0, len: long, col, r, type, cote };
  return { x: o.x - hw, y: o.y, dx: 0, dy: 1, len: long, col, r, type, cote };
}

/* LA BOUCHE D'EVACUATION. Une installation qui fabrique EVACUE, et c'est par la
   que l'Usine respire — le seul lieu du depot dont le verbe soit au present.
   Meme forme de declaration que `ledDe` : `decor.js` la lit, personne ne la
   pousse.

   Elle se pose sur le cote OPPOSE a la bande LED quand il y en a une : deux
   choses qui vivent sur la meme arete se disputent la lecture, et la bande a
   ete la premiere. Un bloc sur trois, jamais une couverture destructible. */
export function evacDe(o) {
  if (biomeKey() !== "usine" || o.maxHp > 0) return null;
  const h = ((o.x * 40503) ^ (o.y * 2654435761)) >>> 0;
  if (h % 3 !== 0) return null;
  const l = ledDe(o);
  const cote = l ? (l.cote + 2) % 4 : (h >>> 6) % 4;
  const hw = o.w / 2, hh = o.h / 2;
  const ph = ((h >>> 12) & 255) / 255;
  if (cote === 0) return { x: o.x, y: o.y - hh, dx: 0, dy: -1, ph };
  if (cote === 1) return { x: o.x + hw, y: o.y, dx: 1, dy: 0, ph };
  if (cote === 2) return { x: o.x, y: o.y + hh, dx: 0, dy: 1, ph };
  return { x: o.x - hw, y: o.y, dx: -1, dy: 0, ph };
}

/* L'ENVELOPPE D'UNE BOUFFEE, et elle est DOUCE des deux cotes. Un flanc franc
   ferait un debut et une fin, donc une echeance, donc un telegraphe — et ce
   canal appartient au boss. Une machine qui souffle n'annonce rien : elle
   respire. */
const EVAC_PERIODE = 5.4;
export function evacEtat(e, t) {
  const u = ((t / EVAC_PERIODE) + e.ph) % 1;
  if (u > 0.42) return 0;
  const v = u / 0.42;
  return Math.sin(v * Math.PI) ** 1.6;
}

/* L'INTERIEUR, ET IL EST TOUT LE SUJET. Quatre matieres, quatre gestes : la
   machine est PANNEAUTEE, le four est MACONNE, la ruine est FISSUREE, la travee
   est AJOUREE. Tout est clippe a la silhouette : rien ne deborde sur le sol, ou
   vivent les telegraphes. */
export function habillerBloc(o, rx, ry, cle, S) {
  const f = fiche(cle, o.kind);

  ctx.save();
  ctx.translate(o.x + rx, o.y + ry);
  silhouetteBloc(ctx, o, cle);
  ctx.clip();
  habitDe(f)(o, S);
  ctx.restore();

  // CE QUI SORT DE L EMPREINTE, et il est HORS du clip pour ca. Deux choses, et
  // aucune ne se lit comme un volume : des fers a beton qui depassent la crete de
  // 5 px, et l EBOULIS de la breche, plaque au sol contre le pied du mur. Un mur
  // casse dont rien ne depasse est un mur coupe a la scie ; un mur perce dont
  // rien n est tombe est un mur qu on a perce PROPREMENT.
  if (f.hors) DEBORD[f.hors]?.(o, rx, ry);
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

/* --- USINE : ce qui FABRIQUE --------------------------------------------
   Trois objets, trois roles dans une meme ligne : la CHAINE transporte, la
   CELLULE transforme, le POSTE commande. C est la seule des quatre lois du
   depot dont le verbe soit au PRESENT, et c est pourquoi elle est la seule ou
   quelque chose bouge dans la masse batie.

   LE MOUVEMENT RESTE CONTINU ET PERIODIQUE, donc sans debut ni echeance, donc
   ce n est pas un telegraphe — ce canal appartient au boss. Un taquet qui passe
   ne previent de rien : il dit que la ligne tourne. */
const maintenant = () => performance.now() / 1000;

/* LA CHAINE TRANSPORTE, ET ELLE LE MONTRE. Deux longerons, des rouleaux entre
   eux, un tapis, un TAQUET qui court dessus, et le groupe d entrainement a un
   bout — c est lui qui donne un SENS a la piece, sans quoi une barre reste une
   barre. Le taquet reprend le pas des rouleaux : il glisse sur la ligne, il ne
   flotte pas au-dessus. */
const CHAINE_PAS = 13;
const CHAINE_VITESSE = 26;
const CHAINE_MOTIF = CHAINE_PAS * 4;
function chaine(o, S) {
  // LA LOI D IMPLANTATION DE L USINE NE POSE QUE DES BANDES HORIZONTALES
  // (« chaine, allee, chaine »), donc `L` est toujours la largeur. Une bascule
  // d orientation serait ici du code que rien n executerait — on l ecrira le
  // jour ou la table posera une chaine debout, et pas avant.
  const L = o.w, T = o.h;
  const s = graine(o);

  ctx.save();

  // le tapis : plus sombre que les longerons, c est le creux de la piece.
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-L / 2, -T / 2 + 4, L, T - 8);

  ctx.strokeStyle = alpha("#000000", 0.30);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = -L / 2 + CHAINE_PAS / 2; x < L / 2; x += CHAINE_PAS) {
    ctx.moveTo(x, -T / 2 + 5); ctx.lineTo(x, T / 2 - 5);
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metal, 0.16);
  ctx.beginPath();
  for (let x = -L / 2 + CHAINE_PAS / 2 + 1; x < L / 2; x += CHAINE_PAS) {
    ctx.moveTo(x, -T / 2 + 5); ctx.lineTo(x, T / 2 - 5);
  }
  ctx.stroke();

  // LES LONGERONS. Ils bordent le tapis sur toute la longueur, et leur arete
  // haute prend la lumiere : c est le seul relief franc de la piece.
  for (const d of [-1, 1]) {
    const y = d * (T / 2 - 2);
    ctx.fillStyle = alpha(S.bloc, 0.62);
    ctx.fillRect(-L / 2, y - 2, L, 4);
    ctx.fillStyle = alpha(S.blocEdge, 0.16);
    ctx.fillRect(-L / 2, y - 2, L, 1.2);
  }

  const sens = (s >>> 25) & 1 ? 1 : -1;
  // LE REPLI SE FAIT SUR LA PERIODE DE CE QUI EST DESSINE, jamais sur une
  // sous-graduation de la surface : `CHAINE_PAS` est le pas des stries du tapis,
  // les taquets sont tous les quatre. Replie sur 13 px pour un motif de 52, ils
  // reculaient d un quart d ecartement deux fois par seconde, indefiniment.
  const u = ((maintenant() * CHAINE_VITESSE * sens) % CHAINE_MOTIF + CHAINE_MOTIF) % CHAINE_MOTIF;
  ctx.fillStyle = alpha(S.emis, 0.30);
  // et la boucle demarre une periode AVANT le bord : sinon le premier taquet
  // NAIT sur le tapis au lieu d y entrer. Le clip de `habillerBloc` retient ce
  // qui deborde, des deux cotes.
  for (let x = -L / 2 - CHAINE_MOTIF + u; x < L / 2; x += CHAINE_MOTIF) {
    ctx.fillRect(x - 2.4, -T / 2 + 6, 4.8, T - 12);
  }

  // LE GROUPE D ENTRAINEMENT, au bout vers lequel la ligne va : un carter plein,
  // deux boulons, et c est ce qui empeche la barre de se lire comme un rail.
  const gx = sens > 0 ? L / 2 : -L / 2;
  const gw = Math.min(18, L * 0.09);
  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.fillRect(gx - (sens > 0 ? gw : 0), -T / 2, gw, T);
  ctx.fillStyle = alpha(S.bloc, 0.70);
  ctx.fillRect(gx - (sens > 0 ? gw - 1.5 : -1.5), -T / 2 + 1.5, gw - 3, T - 3);
  ctx.fillStyle = alpha(S.blocEdge, 0.22);
  ctx.beginPath();
  ctx.arc(gx - sens * gw / 2, 0, Math.min(4, T * 0.18), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* LA CELLULE TRANSFORME. Son sujet est la MARCHE que la silhouette vient de
   poser : le bati est habille de tole nervuree, la table est nue et porte une
   piece. Une machine-outil se lit a ce qu on voit CE QU ELLE TIENT. */
function cellule(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);
  const gauche = (s >>> 23) & 1;
  const m = h * CELL_MARCHE;
  const t = w * CELL_TABLE;
  const bx = gauche ? -w / 2 + t : -w / 2;
  const bw = w - t;

  ctx.fillStyle = alpha("#000000", 0.22);
  ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
  ctx.fillStyle = alpha(S.bloc, 0.55);
  ctx.fillRect(bx + 3, -h / 2 + 3, bw - 6, h - 10);

  ctx.strokeStyle = alpha("#000000", 0.26);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = -h / 2 + 12; y < h / 2 - 8; y += 9) { ctx.moveTo(bx + 6, y); ctx.lineTo(bx + bw - 6, y); }
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metal, 0.12);
  ctx.beginPath();
  for (let y = -h / 2 + 13; y < h / 2 - 8; y += 9) { ctx.moveTo(bx + 6, y); ctx.lineTo(bx + bw - 6, y); }
  ctx.stroke();

  // LA LUCARNE. On voit la broche travailler : un fond noir, une lueur froide au
  // milieu. Froide, parce que l ambre du lieu appartient deja a la bande LED et
  // qu une seconde source chaude sur la meme piece les mettrait en concurrence.
  const lw = Math.min(bw * 0.52, 26), lh = Math.min(h * 0.20, 20);
  const lx = bx + bw / 2, ly = -h / 2 + m + lh * 0.9;
  ctx.fillStyle = alpha("#000000", 0.62);
  ctx.fillRect(lx - lw / 2, ly - lh / 2, lw, lh);
  ctx.fillStyle = alpha(PROP.verre, 0.16);
  ctx.fillRect(lx - lw / 2 + 1.5, ly - lh / 2 + 1.5, lw - 3, 2);
  ctx.strokeStyle = alpha(PROP.metalDark, 0.55);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(lx - lw / 2, ly - lh / 2, lw, lh);

  // LA TABLE ET SA PIECE. La table reste nue — c est ce qui la separe du bati —
  // et la piece est un simple pave clair : on ne fabrique pas du decor, on
  // fabrique une PIECE.
  const tx = gauche ? -w / 2 + t / 2 : w / 2 - t / 2;
  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.fillRect(tx - t / 2 + 3, -h / 2 + m + 2, t - 6, 3);
  const pw = Math.min(t * 0.44, 18), ph = Math.min(h * 0.08, 11);
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(tx - pw / 2 + 1.2, -h / 2 + m + 6 + 1.2, pw, ph);
  ctx.fillStyle = alpha(PROP.metal, 0.30);
  ctx.fillRect(tx - pw / 2, -h / 2 + m + 6, pw, ph);

  boulons(o, S, 2);
}

/* LE POSTE COMMANDE. C est l armoire, et une armoire se reconnait a UNE chose :
   elle s OUVRE. Un joint de porte franc du haut en bas, une poignee dessus, des
   ouies de ventilation d un cote, et le pupitre — trois voyants froids, jamais
   animes : l animation appartient au danger. */
function poste(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);

  ctx.fillStyle = alpha("#000000", 0.22);
  ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
  ctx.fillStyle = alpha(S.bloc, 0.55);
  ctx.fillRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14);

  // LE JOINT DE PORTE, franc, d un bord a l autre : c est LUI qui dit
  // « armoire ». Les striations d avant disaient « tole », ce qu on peut dire
  // d une machine comme d une caisse ; une porte ne se dit que d un meuble.
  const vert = h >= w;
  const dx = ((s >>> 5) & 7) / 7 * 0.16;
  const jv = vert ? (0.42 + dx) * w - w / 2 : 0;
  const jh = vert ? 0 : (0.42 + dx) * h - h / 2;
  ctx.strokeStyle = alpha("#000000", 0.44);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (vert) { ctx.moveTo(jv, -h / 2 + 6); ctx.lineTo(jv, h / 2 - 6); }
  else { ctx.moveTo(-w / 2 + 6, jh); ctx.lineTo(w / 2 - 6, jh); }
  ctx.stroke();
  ctx.strokeStyle = alpha(S.blocEdge, 0.16);
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (vert) { ctx.moveTo(jv + 1.4, -h / 2 + 6); ctx.lineTo(jv + 1.4, h / 2 - 6); }
  else { ctx.moveTo(-w / 2 + 6, jh + 1.4); ctx.lineTo(w / 2 - 6, jh + 1.4); }
  ctx.stroke();

  // LA POIGNEE, sur le joint : une porte qu on ne peut pas ouvrir est un panneau.
  ctx.fillStyle = alpha(PROP.metalDark, 0.70);
  if (vert) ctx.fillRect(jv - 4.5, -2.5, 3, 12);
  else ctx.fillRect(-2.5, jh - 4.5, 12, 3);

  // LES OUIES, du cote OPPOSE a la poignee : une armoire dissipe, et les fentes
  // sont courtes et groupees, pas etalees sur toute la face.
  const ox = vert ? (jv < 0 ? w * 0.28 : -w * 0.28) : 0;
  const oy = vert ? 0 : (jh < 0 ? h * 0.28 : -h * 0.28);
  const ol = Math.min(vert ? w * 0.26 : w * 0.42, 22);
  ctx.strokeStyle = alpha("#000000", 0.34);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    if (vert) { ctx.moveTo(ox - ol / 2, oy + i * 4.2); ctx.lineTo(ox + ol / 2, oy + i * 4.2); }
    else { ctx.moveTo(ox + i * 4.2, oy - ol / 2); ctx.lineTo(ox + i * 4.2, oy + ol / 2); }
  }
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

  /* L'EMBASE DE CHEMINEE, sur les fours qui n'ont pas de gueule. Le premier plan
     en porte deja, tout en haut de l'ecran : celle-ci est leur PIED, et c'est ce
     qui raccorde les deux — sans elle les cheminees du bord ne tiennent a rien.
     Un anneau de brique, un conduit noir, et la suie qui a coule autour. */
  const l = ledDe(o);
  if (!l) {
    const r = Math.min(w, h) * 0.30;
    if (r < 9) return;
    const suie = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 2.1);
    suie.addColorStop(0, alpha("#000000", 0.40));
    suie.addColorStop(1, alpha("#000000", 0));
    ctx.fillStyle = suie;
    ctx.fillRect(-r * 2.1, -r * 2.1, r * 4.2, r * 4.2);
    ctx.fillStyle = alpha(PROP.brique, 0.46);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha("#000000", 0.44);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = alpha("#070505", 0.90);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(PROP.metalDark, 0.60);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + (s & 7) * 0.1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
      ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
      ctx.stroke();
    }
    if (s & 4) boulons(o, S, 2);
    return;
  }
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

/* LA CONDUITE EST UN CYLINDRE, ET RIEN D AUTRE NE LE DIT QUE SON DEGRADE. Vue
   de dessus, une conduite n a aucune arete interieure : ce qui la rend ronde est
   que sa valeur monte au milieu et tombe aux flancs. Un aplat avec des lignes
   dessus reste une planche.

   Sa loi d implantation ne pose qu une conduite couchee (0,260 x 0,048), donc
   pas de bascule d orientation ici — meme raison que pour la chaine de l Usine.

   ELLE EST CALORIFUGEE : ce qui brule est dedans, on ne le voit qu aux JOINTS.
   C est la seule facon d avoir une piece manifestement brulante qui ne soit pas
   une seconde source de lumiere — la gueule du four et la coulee en tiennent
   deja deux, et une troisieme rendrait le tampon uniformement chaud. */
const CONDUITE_BRIDE = 74;
function conduite(o, S) {
  const L = o.w, T = o.h;
  const s = graine(o);

  const rond = ctx.createLinearGradient(0, -T / 2, 0, T / 2);
  rond.addColorStop(0, alpha("#000000", 0.42));
  rond.addColorStop(0.38, alpha(S.bloc, 0.30));
  rond.addColorStop(0.62, alpha("#000000", 0.10));
  rond.addColorStop(1, alpha("#000000", 0.50));
  ctx.fillStyle = rond;
  ctx.fillRect(-L / 2, -T / 2, L, T);

  // LES SELLES. Une conduite de ce diametre ne tient pas toute seule : elle
  // repose sur des berceaux, et ce sont eux qui disent son POIDS.
  const nb = Math.max(2, Math.round(L / 150));
  for (let i = 0; i < nb; i++) {
    const x = -L / 2 + ((i + 0.5) / nb) * L;
    ctx.fillStyle = alpha("#000000", 0.44);
    ctx.fillRect(x - 7, -T / 2, 14, T);
    ctx.fillStyle = alpha(PROP.metalDark, 0.50);
    ctx.fillRect(x - 5, -T / 2, 10, T);
  }

  // LES BRIDES, et l une d elles FUIT. Deux troncons se boulonnent, et c est au
  // joint que la chaleur sort — une ligne mince, qui ONDULE parce que du metal
  // en fusion ondule. Continue et periodique : elle n annonce rien.
  const t = maintenant();
  let k = 0;
  for (let x = -L / 2 + CONDUITE_BRIDE; x < L / 2 - 6; x += CONDUITE_BRIDE, k++) {
    ctx.fillStyle = alpha("#000000", 0.40);
    ctx.fillRect(x - 3, -T / 2, 6, T);
    ctx.fillStyle = alpha(S.blocEdge, 0.20);
    ctx.fillRect(x - 3, -T / 2, 1.4, T);
    if (((s >>> (k * 3)) & 3) !== 0) continue;
    const on = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * (0.5 + (k & 3) * 0.11) + k * 2.3));
    const fuite = ctx.createLinearGradient(x, -T / 2, x, T / 2);
    fuite.addColorStop(0, alpha(PROP.fonte, 0));
    fuite.addColorStop(0.5, alpha("#ffd9a8", 0.70 * on));
    fuite.addColorStop(1, alpha(PROP.fonte, 0));
    ctx.fillStyle = fuite;
    ctx.fillRect(x - 1, -T / 2, 2, T);
  }

  // LE CALORIFUGE : des cerces fines entre les brides. Elles ne coupent pas le
  // degrade — elles sont plus claires que lui d un cheveu.
  ctx.strokeStyle = alpha(PROP.metal, 0.08);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -L / 2 + 12; x < L / 2; x += 17) {
    ctx.moveTo(x, -T / 2 + 3); ctx.lineTo(x, T / 2 - 3);
  }
  ctx.stroke();
}

/* LA CUVE MONTRE SA SURFACE, LE FOUR MONTRE SA BOUCHE. C est toute la
   difference entre les deux, et c est pourquoi la cuve n a pas de suie : rien ne
   sort par le haut d une poche, ca reste dedans et ca refroidit en peau.

   LA PEAU EST LE SUJET. Du metal au repos se couvre d une croute sombre que le
   mouvement dechire : la surface n est donc pas orange, elle est NOIRE avec des
   dechirures oranges — et c est ce qui la rend liquide au lieu de lumineuse. */
function cuve(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);
  const t = maintenant();

  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // LA CEINTURE. Une poche est ferree : un bandeau epais sur tout le pourtour,
  // et c est lui qui porte le poids a l ecran.
  ctx.strokeStyle = alpha(PROP.metalDark, 0.72);
  ctx.lineWidth = 7;
  formeCuve(ctx, { w: w - 5, h: h - 5 });
  ctx.stroke();
  ctx.strokeStyle = alpha(S.blocEdge, 0.20);
  ctx.lineWidth = 1.6;
  formeCuve(ctx, { w: w - 9, h: h - 9 });
  ctx.stroke();

  const rw = w * 0.62, rh = h * 0.52;
  ctx.fillStyle = alpha("#0a0605", 0.86);
  ctx.beginPath(); ctx.ellipse(0, 0, rw / 2, rh / 2, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, rw / 2, rh / 2, 0, 0, Math.PI * 2); ctx.clip();
  for (let i = 0; i < 4; i++) {
    const ph = ((s >>> (i * 4)) & 15) / 15;
    const u = 0.5 + 0.5 * Math.sin(t * (0.30 + ph * 0.24) + ph * 8 + i);
    const y = (-0.5 + (i + 0.5) / 4) * rh + (u - 0.5) * rh * 0.16;
    const l = rw * (0.30 + 0.42 * u);
    const dech = ctx.createLinearGradient(-l / 2, 0, l / 2, 0);
    dech.addColorStop(0, alpha(PROP.fonte, 0));
    dech.addColorStop(0.5, alpha("#ffd9a8", 0.52 + 0.26 * u));
    dech.addColorStop(1, alpha(PROP.fonte, 0));
    ctx.fillStyle = dech;
    ctx.fillRect(-l / 2, y - 1.6, l, 3.2);
  }
  ctx.restore();

  // LES TOURILLONS : les deux axes par lesquels on la BASCULE. Sans eux une
  // poche est une marmite ; avec eux, c est une piece d installation.
  for (const d of [-1, 1]) {
    const x = d * (w / 2 - 4);
    ctx.fillStyle = alpha("#000000", 0.50);
    ctx.beginPath(); ctx.arc(x, 0, 5.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = alpha(PROP.metal, 0.26);
    ctx.beginPath(); ctx.arc(x, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  }

  if (s & 8) boulons(o, S, 2);
}

/* --- FRICHE : ce qui a ETE LAISSE --------------------------------------
   Trois matieres, pas une usure de plus en plus forte : le PAN DE MUR est du
   beton qui se fissure, le MUR BAS du beton COFFRE qui se descelle, la CARCASSE
   de la tole qui rouille. Une friche n est pas une usine dont on aurait baisse
   les lumieres, et c est la ou elle le prouve — trois objets qui n ont pas cede
   de la meme facon. */

function ruinePan(o, S) {
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

/* LE MUR BAS EST COFFRE, ET C EST TOUT SON SUJET. Le pan de mur se lit a ses
   FISSURES ; celui-ci se lit a ses JOINTS DE BANCHE — les planches horizontales
   du coffrage et les trous de tige qui les traversent, tous les deux rangs. Un
   beton coule en banches garde la trace de ses planches vingt ans apres, et
   c est le seul detail de ce lieu qui dise « quelqu un a construit ca » au lieu
   de « ca s est effondre ».

   PAS DE BRECHE ICI. Il fait 36 px de haut : un pan qui cede en son milieu ne
   laisserait plus rien au-dessus, et un mur qui n a plus de haut n est plus un
   mur — c est l eboulis, et il est deja dehors. */
function murBas(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);

  ctx.fillStyle = alpha("#000000", 0.16);
  ctx.fillRect(-w / 2, -h / 2, w, h);

  const banche = Math.max(9, h * 0.34);
  ctx.strokeStyle = alpha("#000000", 0.32);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let y = -h / 2 + banche; y < h / 2; y += banche) {
    ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y);
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(S.blocEdge, 0.10);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = -h / 2 + banche + 1.2; y < h / 2; y += banche) {
    ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y);
  }
  ctx.stroke();

  // LES TROUS DE TIGE. Ils sont sur la ligne de banche, jamais entre : c est ce
  // qui les rend credibles — la tige traverse le joint des deux planches.
  const pas = Math.max(26, w / 6);
  for (let x = -w / 2 + pas * 0.6; x < w / 2; x += pas) {
    const y = -h / 2 + banche;
    ctx.fillStyle = alpha("#000000", 0.46);
    ctx.beginPath(); ctx.arc(x, y, 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = alpha(PROP.rouille, 0.30);
    ctx.beginPath(); ctx.arc(x, y + 0.6, 1.2, 0, Math.PI * 2); ctx.fill();
  }

  // LE DESCELLEMENT : le couronnement est parti par blocs, donc la crete montre
  // sa TRANCHE claire la ou elle a casse. Un seul trait, sur le profil en
  // marches que la silhouette vient de poser.
  const n = Math.max(3, Math.min(7, Math.round(w / 34)));
  ctx.strokeStyle = alpha(S.blocEdge, 0.22);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const d = (((s >>> (i * 3)) & 3) / 3) * CRETE_MORSURE;
    ctx.moveTo(-w / 2 + (i / n) * w, -h / 2 + d + 0.8);
    ctx.lineTo(-w / 2 + ((i + 1) / n) * w, -h / 2 + d + 0.8);
  }
  ctx.stroke();

  for (let i = 0; i < 3; i++) {
    const x = -w / 2 + ((s >>> (i * 6)) % Math.max(1, w | 0));
    const g = ctx.createLinearGradient(x, -h / 2, x, h / 2);
    g.addColorStop(0, alpha(PROP.rouille, 0.26));
    g.addColorStop(1, alpha(PROP.rouille, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 2, -h / 2, 3 + (i & 1) * 2, h);
  }

  ctx.fillStyle = alpha(PROP.vert, 0.18);
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + ((s >>> (i * 4 + 3)) % Math.max(1, w | 0));
    ctx.beginPath();
    ctx.ellipse(x, h / 2 - 1.5, 5 + (i & 3) * 3, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* LA CARCASSE EST DE LA TOLE, ET ELLE EST DESTRUCTIBLE. Elle se dessine donc
   PAR-DESSUS `BIOME.cover` et son contour tirete : tout ce qui est ecrit ici
   reste sous eux en valeur, sinon la lecture des points de vie passerait apres
   celle de la rouille — et elle est du gameplay.

   Ce qui la separe des deux betons : elle a un INTERIEUR. Une cabine crevee,
   une arete de caisse, des moyeux nus. On voit dedans, on ne voit pas dans un
   mur. */
function carcasse(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);
  const long = w >= h;
  const L = long ? w : h, T = long ? h : w;

  ctx.save();
  if (!long) ctx.rotate(Math.PI / 2);

  ctx.fillStyle = alpha("#000000", 0.26);
  ctx.fillRect(-L / 2 + 3, -T / 2 + 3, L - 6, T - 6);

  // L ARETE DE CAISSE : une tole emboutie a un pli longitudinal, et c est lui
  // qui donne le volume sans une seule ombre portee.
  ctx.strokeStyle = alpha("#000000", 0.34);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-L / 2 + 4, -T * 0.10); ctx.lineTo(L / 2 - 4, -T * 0.10);
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metal, 0.16);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-L / 2 + 4, -T * 0.10 - 1.3); ctx.lineTo(L / 2 - 4, -T * 0.10 - 1.3);
  ctx.stroke();

  // LA CABINE CREVEE. Le vitrage a saute : c est un trou noir, avec le montant
  // qui tient encore d un cote.
  const av = (s >>> 21) & 1;
  const cx = (av ? 1 : -1) * L * 0.22;
  const cw = Math.min(L * 0.30, 22), ch = Math.min(T * 0.44, 14);
  ctx.fillStyle = alpha("#000000", 0.60);
  ctx.fillRect(cx - cw / 2, -ch / 2, cw, ch);
  ctx.strokeStyle = alpha(PROP.metalDark, 0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - cw / 2, -ch / 2); ctx.lineTo(cx - cw / 2, ch / 2);
  ctx.stroke();

  // LES MOYEUX. Deux, nus, sur le flanc bas : une epave n a plus ses roues, mais
  // elle a encore ce qui les portait.
  for (const d of [-1, 1]) {
    const mx = d * L * 0.30;
    ctx.fillStyle = alpha("#000000", 0.50);
    ctx.beginPath(); ctx.arc(mx, T / 2 - 3, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(PROP.rouille, 0.50);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(mx, T / 2 - 3, 3.4, 0, Math.PI * 2); ctx.stroke();
  }

  for (let i = 0; i < 5; i++) {
    const x = -L / 2 + ((s >>> (i * 5)) % Math.max(1, L | 0));
    const y = -T / 2 + ((s >>> (i * 3 + 1)) % Math.max(1, T | 0));
    ctx.fillStyle = alpha(PROP.rouille, 0.14 + ((s >>> i) & 3) * 0.05);
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + ((s >>> (i + 7)) & 3), 2 + ((s >>> (i + 11)) & 1), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/* L EBOULIS DU MUR BAS. Meme geste que le debord du pan de mur — hors du clip,
   plaque au sol, aucun volume — mais reparti sur TOUTE la longueur au lieu de
   sortir d une breche : un mur bas ne se perce pas, il se desagrege. Et pas un
   fer a beton : le couronnement est du beton de propreté, il n en contient pas. */
function eboulisPied(o, rx, ry) {
  const s = graine(o);
  const w = o.w, h = o.h;
  const n = Math.max(4, Math.min(11, Math.round(w / 22)));
  ctx.save();
  ctx.translate(o.x + rx, o.y + ry);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + ((i + 0.5) / n) * w + (((s >>> (i * 3)) & 7) / 7 - 0.5) * 14;
    const y = h / 2 + ((s >>> (i * 2 + 1)) & 7) * 0.6;
    const t = 2.2 + ((s >>> i) & 3);
    ctx.fillStyle = alpha("#000000", 0.28);
    ctx.fillRect(x - t / 2 + 1, y - t / 2 + 1, t, t * 0.7);
    ctx.fillStyle = alpha("#6e6a5e", 0.40 + (i % 3) * 0.10);
    ctx.fillRect(x - t / 2, y - t / 2, t, t * 0.7);
  }
  ctx.restore();
}

/* --- NEBULEUSE : ce qui FLOTTE ------------------------------------------
   Trois etats d une meme station : la TRAVEE tient encore (charpente reguliere,
   feux qui courent), le FRAGMENT s en est detache (bordage, un flanc cisaille,
   des membrures a nu), le DEBRIS n est plus qu un eclat (facettes, givre, un
   moignon). C est une chronologie, pas trois objets — et c est ce qui donne au
   lieu son recit sans une ligne de texte. */

/* LES FEUX DE POSITION : une file de points froids le long d une arete, et ils
   COURENT — un module qu on doit pouvoir suivre dans le noir. Partages par la
   travee et le fragment : c est la meme station, donc la meme signalisation. */
function feux(o, l) {
  if (!l) return;
  const t = maintenant();
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

/* LE FRAGMENT EST BORDE, PAS AJOURE. La travee est une charpente qu on voit au
   travers ; celui-ci est un morceau de COQUE — des panneaux, des joints, et sur
   le flanc cisaille les membrures que la rupture a mises a nu. C est la seule
   piece du depot qui montre son INTERIEUR STRUCTUREL, et elle ne le montre que
   la ou elle a casse. */
function fragment(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);

  ctx.fillStyle = alpha("#000000", 0.36);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.34);
  ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);

  // LE BORDAGE : de grands panneaux, joints francs, decales d une rangee a
  // l autre. Un pas large — une coque n est pas une tole striee.
  const pas = 26;
  ctx.strokeStyle = alpha("#000000", 0.34);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let y = -h / 2 + pas; y < h / 2 - 4; y += pas) { ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); }
  ctx.stroke();
  ctx.strokeStyle = alpha(S.blocEdge, 0.14);
  ctx.lineWidth = 1;
  ctx.beginPath();
  let r = 0;
  for (let y = -h / 2; y < h / 2 - 4; y += pas, r++) {
    const dec = (r & 1) ? pas : 0;
    for (let x = -w / 2 + dec; x < w / 2; x += pas * 2) {
      ctx.moveTo(x, y); ctx.lineTo(x, Math.min(h / 2, y + pas));
    }
  }
  ctx.stroke();

  // LES MEMBRURES A NU, sur le coin cisaille et nulle part ailleurs.
  const coin = (s >>> 27) & 3;
  const cx = (coin === 1 || coin === 2) ? 1 : -1;
  const cy = (coin >= 2) ? 1 : -1;
  const cw = w * FRAG_CISAILLE, ch = h * FRAG_CISAILLE;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx * w / 2, cy * h / 2);
  ctx.lineTo(cx * (w / 2 - cw), cy * h / 2);
  ctx.lineTo(cx * w / 2, cy * (h / 2 - ch));
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = alpha("#05070d", 0.70);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = alpha(PROP.metal, 0.34);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 1; i < 6; i++) {
    const u = i / 6;
    ctx.moveTo(cx * (w / 2 - cw * u), cy * h / 2);
    ctx.lineTo(cx * (w / 2 - cw * u * 0.35), cy * (h / 2 - ch * u));
  }
  ctx.stroke();
  ctx.restore();

  // LE HUBLOT. Un seul, froid, jamais anime : ce qui bat sur ce lieu est la
  // balise du semis, et deux clignotants de rythmes differents sur le meme
  // ecran se lisent comme une alarme.
  if ((s >>> 13) & 1) {
    const hx = -cx * w * 0.22, hy = -cy * h * 0.18;
    const hr = Math.min(w, h) * 0.09;
    ctx.fillStyle = alpha("#05070d", 0.86);
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(PROP.metalDark, 0.66);
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = alpha(S.emis, 0.22);
    ctx.beginPath(); ctx.arc(hx - hr * 0.25, hy - hr * 0.25, hr * 0.45, 0, Math.PI * 2); ctx.fill();
  }

  feux(o, ledDe(o));
}

/* LE DEBRIS N A PLUS DE FONCTION, donc plus rien de regulier : trois facettes
   de valeurs differentes, un moignon de structure arrachee, et du GIVRE sur une
   seule face — celle qui ne voit jamais d etoile. C est le seul objet du lieu
   qui dise le FROID, et il le dit parce qu il est le seul a etre mort.

   Il est destructible, donc dessine PAR-DESSUS `BIOME.cover` et son contour
   tirete : tout reste sous eux en valeur, la lecture des points de vie passe
   avant celle du givre. */
function debris(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);

  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.fillRect(-w / 2, -h / 2, w, h);

  const a = ((s >>> 5) & 7) / 7 - 0.5;
  ctx.fillStyle = alpha("#000000", 0.24);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2 + h * (0.30 + a * 0.2));
  ctx.lineTo(w / 2, -h / 2 + h * (0.62 - a * 0.2));
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = alpha(PROP.metal, 0.20);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2 + h * (0.30 + a * 0.2));
  ctx.lineTo(w / 2, -h / 2 + h * (0.62 - a * 0.2));
  ctx.stroke();

  const gx = ((s >>> 9) & 1) ? 1 : -1;
  const givre = ctx.createLinearGradient(gx * w / 2, 0, 0, 0);
  givre.addColorStop(0, alpha(PROP.givre, 0.26));
  givre.addColorStop(1, alpha(PROP.givre, 0));
  ctx.fillStyle = givre;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.strokeStyle = alpha(PROP.metalDark, 0.62);
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const x = -gx * (w / 2 - 3 - i * 4);
    ctx.moveTo(x, h / 2 - 2);
    ctx.lineTo(x + gx * 2.5, h / 2 - 2 - h * (0.30 + i * 0.12));
  }
  ctx.stroke();
  ctx.lineCap = "butt";
}

/* --- LA TRAVEE : ce qui TIENT ENCORE ------------------------------------ */

function travee(o, S) {
  const w = o.w, h = o.h;
  const s = graine(o);

  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);

  /* LE TREILLIS, ET IL EST AU PAS DE LA SILHOUETTE. Il tournait a 16 px sans
     rapport avec le contour ; la silhouette porte maintenant une encoche a ce
     meme pas, donc chaque diagonale ABOUTIT dans un creux au lieu de croiser un
     bord lisse. Une charpente dont les barres ne tombent pas sur les nœuds est
     un motif imprime sur une plaque. */
  const vert = h >= w;
  const L = vert ? h : w, T = vert ? w : h;
  const n = Math.max(2, Math.round(L / TRAVEE_PAS));
  const marge = 4;
  const bord = T / 2 - marge;
  const noeud = (i) => -L / 2 + (i / n) * L;

  ctx.save();
  if (vert) ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = alpha(S.blocEdge, 0.30);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    ctx.moveTo(noeud(i), -bord); ctx.lineTo(noeud(i + 1), bord);
    ctx.moveTo(noeud(i), bord); ctx.lineTo(noeud(i + 1), -bord);
  }
  ctx.stroke();

  // LES MEMBRURES : les deux barres continues que les diagonales relient. Sans
  // elles un treillis est un zigzag.
  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-L / 2, -bord); ctx.lineTo(L / 2, -bord);
  ctx.moveTo(-L / 2, bord); ctx.lineTo(L / 2, bord);
  ctx.stroke();

  // LES GOUSSETS, un nœud sur deux : la ou l encoche mord, il y a une plaque.
  ctx.fillStyle = alpha(PROP.metalDark, 0.55);
  for (let i = 1; i < n; i += 2) {
    const u = noeud(i);
    ctx.fillRect(u - 2.4, -bord - 1.6, 4.8, 3.2);
    ctx.fillRect(u - 2.4, bord - 1.6, 4.8, 3.2);
  }
  ctx.restore();

  feux(o, ledDe(o));

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
  /* TROIS COMPORTEMENTS, TROIS ETATS D ENTRETIEN. Le TUBE de la Friche grelotte
     — un neon mort qui ne parvient plus a s amorcer. L ENSEIGNE du Secteur tient
     sa lumiere puis LACHE d un coup, brievement, et revient : un ballast fatigue,
     pas un tube mort, et c est la difference entre un commerce mal entretenu et
     une ruine. La BANDE de l Usine respire, parce que l installation marche.
     L enseigne ne peut pas grelotter comme la Friche : ce lieu VEND, et une
     enseigne illisible ne vend rien. */
  const puls = l.type === "tube"
    ? (Math.sin(t / 90 + l.x) * Math.sin(t / 640) > 0.1 ? 1 : 0.12)
    : l.type === "enseigne"
    ? (((t / 7300 + l.x * 0.0007) % 1) < 0.055 ? 0.10
       : 0.80 + 0.20 * Math.sin(t / 380 + l.y * 0.01))
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

  /* LA CHENILLE, et elle n'appartient qu'a l'Usine. Une bande qui pulse dit
     qu'un appareil est sous tension ; un point qui COURT dit qu'une ligne
     tourne. C'est la difference entre allume et en marche, et c'est tout ce que
     ce lieu demande. Continue et periodique, donc sans echeance. */
  if (l.type === "bande") {
    const u = (t / 2400 + l.x * 0.004) % 1;
    const cx = l.x + l.dx * (u - 0.5) * l.len;
    const cy = l.y + l.dy * (u - 0.5) * l.len;
    const q = 7;
    ctx.strokeStyle = alpha("#ffffff", 0.34);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx - l.dx * q, cy - l.dy * q);
    ctx.lineTo(cx + l.dx * q, cy + l.dy * q);
    ctx.stroke();
  }

  ctx.lineCap = "butt";
  ctx.restore();
}

/* --- SECTEUR : ce qui borde une rue --------------------------------------

   TROIS FAMILLES, TROIS ROLES DANS UNE RUE, et aucune ne peut etre prise pour
   une piece d un autre lieu : la DEVANTURE est un front bati continu perce
   d une vitrine, le PYLONE un mat qui coupe la ligne de tir sans fermer le
   passage, le CONTENEUR ce qu on a empile sur le trottoir et qu on peut degager
   au tir. */

/* LA DEVANTURE. Elle remplit son rectangle — c est la regle : la collision est
   une AABB, une forme qui rentre ses coins fait buter sur du vide. Ce qui la
   separe de la chaine de l Usine, qui est aussi un long rectangle, est son
   AUVENT : un debord franc sur la face longue, cote rue, qui casse l arete sur
   toute la longueur au lieu de la chanfreiner aux bouts. */
const AUVENT = 7;
function formeDevanture(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const c = Math.min(CHANFREIN, w * 0.08, h * 0.08);
  const large = w >= h;
  g.beginPath();
  if (large) {
    const d = Math.min(AUVENT, h * 0.22);
    g.moveTo(x + c, y);
    g.lineTo(x + w - c, y);
    g.lineTo(x + w, y + c);
    g.lineTo(x + w, y + h - d);
    g.lineTo(x + w - d * 0.6, y + h);
    g.lineTo(x + d * 0.6, y + h);
    g.lineTo(x, y + h - d);
    g.lineTo(x, y + c);
  } else {
    const d = Math.min(AUVENT, w * 0.22);
    g.moveTo(x + c, y);
    g.lineTo(x + w - d, y);
    g.lineTo(x + w, y + d * 0.6);
    g.lineTo(x + w, y + h - d * 0.6);
    g.lineTo(x + w - d, y + h);
    g.lineTo(x + c, y + h);
    g.lineTo(x, y + h - c);
    g.lineTo(x, y + c);
  }
  g.closePath();
}

/* LE PYLONE. 22 px de large pour 207 de haut. Il REMPLIT SON RECTANGLE, et ce
   n est pas negociable : la collision est une AABB, et une forme qui rentre ses
   coins fait buter sur du vide — `verifierEmpreinte` l a refusee a 33 % avant
   celle-ci. Le premier dessin lui donnait un PIED evase et un mat etroit : juste,
   physiquement, et faux ici.

   Ce qui le separe donc de la travee de la Nebuleuse, l autre longue piece fine
   du depot, n est pas sa masse mais sa TETE : deux coupes symetriques au seul
   bout haut, la lame d enseigne. La travee, elle, est rythmee sur ses FLANCS. */
function formePylone(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const debout = h >= w;
  const c = Math.min(CHANFREIN, (debout ? w : h) * 0.42);
  g.beginPath();
  if (debout) {
    g.moveTo(x + c, y);
    g.lineTo(x + w - c, y);
    g.lineTo(x + w, y + c);
    g.lineTo(x + w, y + h);
    g.lineTo(x, y + h);
    g.lineTo(x, y + c);
  } else {
    g.moveTo(x, y);
    g.lineTo(x + w - c, y);
    g.lineTo(x + w, y + c);
    g.lineTo(x + w, y + h - c);
    g.lineTo(x + w - c, y + h);
    g.lineTo(x, y + h);
  }
  g.closePath();
}

// LE CONTENEUR : une caisse, donc des coins FRANCS et un seul chanfrein large en
// haut a gauche — c est ce qui dit « pose la » plutot que « construit la ».
function formeConteneur(g, o) {
  const w = o.w, h = o.h, x = -w / 2, y = -h / 2;
  const c = Math.min(CHANFREIN_LARGE, w * 0.24, h * 0.24);
  g.beginPath();
  g.moveTo(x + c, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + h);
  g.lineTo(x, y + h);
  g.lineTo(x, y + c);
  g.closePath();
}

/* LA DEVANTURE EST ALLUMEE, ET C EST TOUT CE QU ELLE A A DIRE. Une vitrine
   occupe la moitie basse de sa face longue, le bandeau d enseigne la borde en
   haut. Le reste est du beton sale — un signal sature n existe que parce que ce
   qui l entoure ne l est pas. */
function devanture(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const large = w >= h;

  ctx.fillStyle = alpha("#000000", 0.42);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.40);
  ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);

  // le BANDEAU : la bande d enseigne, toujours du cote long, toujours en haut.
  const bx = -w / 2 + 6, by = -h / 2 + 6;
  const bw = large ? w - 12 : (w - 12) * 0.62;
  const bh = large ? (h - 12) * 0.34 : h - 12;
  ctx.fillStyle = alpha("#000000", 0.50);
  ctx.fillRect(bx, by, bw, bh);

  // LA VITRINE : des travees regulieres, allumees INEGALEMENT. Toutes allumees,
  // c est un bureau ; une sur trois eteinte, c est une rue.
  const n = Math.max(2, Math.round((large ? w : h) / 42));
  const pas = (large ? bw : bh) / n;
  for (let i = 0; i < n; i++) {
    const mort = ((s >>> (i % 12)) & 7) === 0;
    const k = mort ? 0.05 : 0.28 + (((s >> (i * 3)) & 7) / 7) * 0.34;
    ctx.fillStyle = alpha(S.emis, k);
    if (large) ctx.fillRect(bx + i * pas + 2, by + 2, pas - 4, bh - 4);
    else       ctx.fillRect(bx + 2, by + i * pas + 2, bw - 4, pas - 4);
  }

  // le SOUBASSEMENT : le beton sous la vitrine, plus sombre, avec ses coulures.
  if (large) {
    ctx.fillStyle = alpha("#000000", 0.30);
    ctx.fillRect(-w / 2 + 6, by + bh + 3, w - 12, h / 2 - bh * 0.5);
  }
  ctx.strokeStyle = alpha(S.blocEdge, 0.16);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 5; i++) {
    const u = -w / 2 + (w * i) / 5 + (((s >> i) & 3) - 1.5) * 3;
    ctx.moveTo(u, by + bh + 4); ctx.lineTo(u, h / 2 - 3);
  }
  ctx.stroke();
}

/* LE PYLONE PORTE UNE ENSEIGNE VERTICALE, et c est le seul objet du depot qui
   ecrive dans le sens de sa hauteur. Des caissons empiles, un seul allume a la
   fois et il DESCEND — un chenillard. Mouvement continu et periodique, donc pas
   un telegraphe. */
function pylone(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const debout = h >= w;
  const L = debout ? h : w;

  ctx.fillStyle = alpha("#000000", 0.52);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.34);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);

  const n = Math.max(3, Math.round(L / 34));
  const pas = L / n;
  const t = performance.now() / 1000;
  const vif = Math.floor(((t * 0.9 + (s & 15) / 16) % 1) * n);
  for (let i = 0; i < n; i++) {
    const k = i === vif ? 0.72 : 0.10 + (((s >> i) & 3) / 3) * 0.10;
    ctx.fillStyle = alpha(S.emis, k);
    if (debout) ctx.fillRect(-w / 2 + 3, -h / 2 + i * pas + 2, w - 6, pas - 4);
    else        ctx.fillRect(-w / 2 + i * pas + 2, -h / 2 + 3, pas - 4, h - 6);
  }
  // le mat reste visible SOUS l enseigne : sans lui le pylone est un ruban.
  ctx.strokeStyle = alpha(S.blocEdge, 0.30);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (debout) { ctx.moveTo(0, -h / 2 + 2); ctx.lineTo(0, h / 2 - 2); }
  else        { ctx.moveTo(-w / 2 + 2, 0); ctx.lineTo(w / 2 - 2, 0); }
  ctx.stroke();
}

/* LE CONTENEUR EST LE SEUL DESTRUCTIBLE DU LIEU, donc le seul qui garde son
   contour plein — c est du gameplay. Sa matiere est de la TOLE ONDULEE : des
   nervures serrees, dans le sens de sa plus grande dimension, et rien d autre.
   Aucun neon : ce qu on a pose dans la rue ne vend rien. */
/* LE RACK — CE QU IL PORTE EST CE QUI SE VOIT. Des montants au pas reel, deux
   lisses, et des charges posees dessus dont une case sur trois est VIDE : un
   magasin plein ne se lit pas, un magasin a trous se lit. */
function palettier(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h;
  const L = long ? w : h, E = long ? h : w;

  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // les LISSES : deux traits continus sur toute la longueur, c est l ossature.
  ctx.strokeStyle = alpha(S.blocEdge, 0.30);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const d of [-E / 2 + 3, E / 2 - 3]) {
    if (long) { ctx.moveTo(-w / 2, d); ctx.lineTo(w / 2, d); }
    else { ctx.moveTo(d, -h / 2); ctx.lineTo(d, h / 2); }
  }
  ctx.stroke();

  let i = 0;
  for (let u = -L / 2 + RACK_PAS / 2; u < L / 2; u += RACK_PAS, i++) {
    const mx = long ? u : 0, my = long ? 0 : u;
    // le MONTANT
    ctx.fillStyle = alpha(S.blocEdge, 0.34);
    if (long) ctx.fillRect(u - 2, -h / 2, 4, h);
    else ctx.fillRect(-w / 2, u - 2, w, 4);
    // LA CHARGE, une alveole sur trois vide. Le tirage suit la piece.
    if (((s >> (i % 12)) & 3) === 0) continue;
    const cw = long ? RACK_PAS - 12 : w - 8;
    const chh = long ? h - 8 : RACK_PAS - 12;
    ctx.fillStyle = alpha(S.bloc, 0.50);
    ctx.fillRect(mx - cw / 2 + (long ? RACK_PAS / 2 - 2 : 0), my - chh / 2 + (long ? 0 : RACK_PAS / 2 - 2), cw, chh);
    ctx.strokeStyle = alpha("#000000", 0.26);
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - cw / 2 + (long ? RACK_PAS / 2 - 2 : 0), my - chh / 2 + (long ? 0 : RACK_PAS / 2 - 2), cw, chh);
  }
  // l ADRESSE, peinte au pied : jamais lisible, c est de la matiere.
  ctx.fillStyle = alpha(S.emis, 0.12);
  if (long) ctx.fillRect(-w / 2 + 4, h / 2 - 5, Math.min(26, w * 0.2), 3);
  else ctx.fillRect(w / 2 - 5, -h / 2 + 4, 3, Math.min(26, h * 0.2));
}

/* LA PILE — DES CAISSES, ET CE QUI LES TIENT. Le film etirable est ce qui dit
   qu on l a preparee pour partir ; sans lui c est un tas. */
function pile(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.38);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  const e = h / PILE_ETAGES;
  for (let i = 0; i < PILE_ETAGES; i++) {
    const dx = ((s >> (i * 3)) & 1) ? Math.min(w * 0.16, 7) : 0;
    ctx.fillStyle = alpha(S.bloc, 0.44 + i * 0.05);
    ctx.fillRect(-w / 2 + dx + 1, -h / 2 + i * e + 1, w - dx - 2, e - 2);
    ctx.strokeStyle = alpha("#000000", 0.28);
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + dx + 1, -h / 2 + i * e + 1, w - dx - 2, e - 2);
  }
  ctx.strokeStyle = alpha(S.blocEdge, 0.16);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, -h / 2 + e * 0.6); ctx.lineTo(w / 2 - 2, -h / 2 + e * 1.1);
  ctx.moveTo(-w / 2 + 2, -h / 2 + e * 2.1); ctx.lineTo(w / 2 - 2, -h / 2 + e * 1.6);
  ctx.stroke();
}

/* LE QUAI — UNE ARETE, UN BUTOIR, UN NIVELEUR. Le butoir est le seul objet du
   depot qui soit peint en NOIR ET JAUNE, et c est ce qui le rend reconnaissable
   d une vue entiere. */
function quai(o, S) {
  const w = o.w, h = o.h;
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.52);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);

  // L ARETE accostable, du cote du chanfrein.
  ctx.fillStyle = alpha(S.blocEdge, 0.34);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, Math.max(3, w * 0.10), h - 4);

  // LES BUTOIRS, deux, en tete d arete.
  const b = Math.min(7, h * 0.16);
  ctx.fillStyle = alpha("#0b0b0b", 0.72);
  for (const d of [-h * 0.26, h * 0.26]) {
    ctx.fillRect(-w / 2 - 1, d - b / 2, Math.max(3, w * 0.08), b);
  }
  // la bande d avertissement au bord de la dalle, hachuree et courte.
  ctx.strokeStyle = alpha(S.emis, 0.20);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let u = -h / 2 + 5; u < h / 2 - 3; u += 9) {
    ctx.moveTo(-w / 2 + w * 0.14, u); ctx.lineTo(-w / 2 + w * 0.14 + 5, u + 5);
  }
  ctx.stroke();
}

/* LA REMORQUE — LE MEME CHASSIS QUE LA FRICHE, UNE AUTRE MATIERE. C est le
   premier couple silhouette x habillage du depot a servir deux themes : une
   epave et une remorque en service ont la meme forme et ne disent pas du tout
   la meme chose. Ici la tole est PEINTE, les portes sont fermees, et rien ne
   pend. */
function remorque(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h;
  ctx.fillStyle = alpha("#000000", 0.36);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.56);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);

  // les NERVURES de caisse, regulieres et serrees : une remorque est une boite
  // raidie, pas une plaque.
  ctx.strokeStyle = alpha("#000000", 0.20);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const pas = 11;
  if (long) for (let u = -w / 2 + pas; u < w / 2 - 2; u += pas) { ctx.moveTo(u, -h / 2 + 3); ctx.lineTo(u, h / 2 - 3); }
  else for (let u = -h / 2 + pas; u < h / 2 - 2; u += pas) { ctx.moveTo(-w / 2 + 3, u); ctx.lineTo(w / 2 - 3, u); }
  ctx.stroke();

  // LES PORTES, a l arriere, et l arriere est du cote du quai.
  ctx.strokeStyle = alpha(S.blocEdge, 0.30);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (long) { ctx.moveTo(-w / 2 + 3, -h / 2 + 3); ctx.lineTo(-w / 2 + 3, h / 2 - 3); }
  else { ctx.moveTo(-w / 2 + 3, -h / 2 + 3); ctx.lineTo(w / 2 - 3, -h / 2 + 3); }
  ctx.stroke();

  // les BEQUILLES, deux traits courts sous le nez : elle est POSEE, pas attelee.
  ctx.strokeStyle = alpha("#000000", 0.34);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  const n = long ? w / 2 - 8 : 0, m = long ? 0 : h / 2 - 8;
  for (const d of [-0.22, 0.22]) {
    if (long) { ctx.moveTo(n, h * d); ctx.lineTo(n + 5, h * d); }
    else { ctx.moveTo(w * d, m); ctx.lineTo(w * d, m + 5); }
  }
  ctx.stroke();

  ctx.fillStyle = alpha(S.emis, 0.10 + ((s & 3) * 0.02));
  if (long) ctx.fillRect(-w / 2 + w * 0.30, -h / 2 + h * 0.32, w * 0.24, h * 0.16);
  else ctx.fillRect(-w / 2 + w * 0.32, -h / 2 + h * 0.30, w * 0.16, h * 0.24);
}


/* L ETABLI — UN PLATEAU, DES PIEDS, ET CE QU ON A LAISSE DESSUS. Bas et long :
   c est le seul objet du theme qu on contourne sans jamais le perdre de vue,
   et son plateau est plus clair que ses pieds parce qu on le regarde d en haut. */
function etabli(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h;
  ctx.fillStyle = alpha("#000000", 0.36);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.58);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // le CHANT du plateau, un liseré clair sur le bord long.
  ctx.fillStyle = alpha(S.blocEdge, 0.26);
  if (long) ctx.fillRect(-w / 2 + 2, h / 2 - 4, w - 4, 2);
  else ctx.fillRect(w / 2 - 4, -h / 2 + 2, 2, h - 4);
  // LES PIEDS, aux quarts : c est ce qui dit qu il est POSE et pas encastre.
  ctx.fillStyle = alpha("#000000", 0.30);
  const L = long ? w : h;
  for (const f of [0.14, 0.5, 0.86]) {
    const u = -L / 2 + L * f;
    if (long) ctx.fillRect(u - 2, -h / 2 + 2, 4, h - 4);
    else ctx.fillRect(-w / 2 + 2, u - 2, w - 4, 4);
  }
  // CE QU ON A LAISSE DESSUS : deux a quatre pieces, jamais alignees.
  ctx.fillStyle = alpha(S.blocEdge, 0.20);
  const n = 2 + (s & 3);
  for (let i = 0; i < n; i++) {
    const u = -L / 2 + L * (0.12 + 0.24 * i + ((s >> (i * 2)) & 1) * 0.05);
    const t = 3 + ((s >> i) & 3);
    if (long) ctx.fillRect(u, -h / 2 + 4, t, Math.max(2, h - 10));
    else ctx.fillRect(-w / 2 + 4, u, Math.max(2, w - 10), t);
  }
}

/* LA MACHINE OUVERTE — LES CAPOTS SONT POSES A COTE. Le carter ecarte est dans
   la silhouette ; ce qui se peint ici est l INTERIEUR : plus sombre que la
   coque, avec deux ou trois pieces claires dedans. Un objet qui montre son
   ventre raconte qu on l a demonte, et rien d autre du depot ne le fait. */
function ouverte(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.42);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.50);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  // LE VENTRE : un rectangle franchement plus sombre, decale, avec ses organes.
  const vw = w * 0.44, vh = h * 0.44;
  const vx = ((s & 1) ? 0.10 : -0.10) * w, vy = ((s & 2) ? 0.10 : -0.10) * h;
  ctx.fillStyle = alpha("#000000", 0.46);
  ctx.fillRect(vx - vw / 2, vy - vh / 2, vw, vh);
  ctx.fillStyle = alpha(S.blocEdge, 0.24);
  for (let i = 0; i < 3; i++) {
    const px = vx - vw / 2 + 3 + ((s >> (i * 2)) & 3) * (vw / 6);
    const py = vy - vh / 2 + 3 + ((s >> (i * 3)) & 3) * (vh / 6);
    ctx.fillRect(px, py, Math.max(2, vw * 0.14), Math.max(2, vh * 0.14));
  }
  // LE CAPOT DEPOSE, plaque au sol contre le flanc : plus clair, plus mince.
  ctx.fillStyle = alpha(S.bloc, 0.30);
  const cw2 = w * 0.24, ch2 = h * 0.30;
  ctx.fillRect((s & 1) ? -w / 2 + 3 : w / 2 - 3 - cw2, h / 2 - 3 - ch2, cw2, ch2);
}

/* LE TRANSFORMATEUR — DES AILETTES, ET C EST TOUT CE QU IL FAUT. Une cuve avec
   des ailettes serrees sur ses deux flancs longs : la repetition fine est ce
   qui le separe d une cuve de fonderie a la meme silhouette. */
function transfo(o, S) {
  const w = o.w, h = o.h;
  ctx.fillStyle = alpha("#000000", 0.38);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.54);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  ctx.strokeStyle = alpha("#000000", 0.34);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const long = w >= h;
  const L = long ? w : h;
  for (let u = -L / 2 + 6; u < L / 2 - 4; u += 5) {
    if (long) { ctx.moveTo(u, -h / 2 + 3); ctx.lineTo(u, -h / 2 + 8); ctx.moveTo(u, h / 2 - 8); ctx.lineTo(u, h / 2 - 3); }
    else { ctx.moveTo(-w / 2 + 3, u); ctx.lineTo(-w / 2 + 8, u); ctx.moveTo(w / 2 - 8, u); ctx.lineTo(w / 2 - 3, u); }
  }
  ctx.stroke();
  // LES ISOLATEURS, trois plots clairs sur le dessus : la seule chose qui
  // depasse d une cuve, et ce qui la rend electrique au premier coup d oeil.
  ctx.fillStyle = alpha(S.blocEdge, 0.34);
  for (const f of [0.28, 0.5, 0.72]) {
    if (long) ctx.fillRect(-w / 2 + w * f - 2, -h / 2 + h * 0.24, 4, 4);
    else ctx.fillRect(-w / 2 + w * 0.24, -h / 2 + h * f - 2, 4, 4);
  }
}

/* LA CLAIRE-VOIE — LE PREMIER OBSTACLE DU DEPOT QUI BLOQUE LE CORPS SANS CACHER
   LA VUE. Rien ne se peint en plein : deux lisses, des poteaux au pas reel, et
   un grillage croise a tres faible alpha. C est ce qui remplit le rectangle
   sans jamais faire ecran. */
const CLOTURE_PAS = 34;
function cloture(o, S) {
  const w = o.w, h = o.h;
  const long = w >= h;
  const L = long ? w : h, E = long ? h : w;

  ctx.strokeStyle = alpha(S.blocEdge, 0.10);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let u = -L / 2; u < L / 2; u += 7) {
    if (long) { ctx.moveTo(u, -h / 2); ctx.lineTo(u + 7, h / 2); ctx.moveTo(u + 7, -h / 2); ctx.lineTo(u, h / 2); }
    else { ctx.moveTo(-w / 2, u); ctx.lineTo(w / 2, u + 7); ctx.moveTo(-w / 2, u + 7); ctx.lineTo(w / 2, u); }
  }
  ctx.stroke();

  ctx.strokeStyle = alpha(S.blocEdge, 0.34);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (const d of [-E / 2 + 1, E / 2 - 1]) {
    if (long) { ctx.moveTo(-w / 2, d); ctx.lineTo(w / 2, d); }
    else { ctx.moveTo(d, -h / 2); ctx.lineTo(d, h / 2); }
  }
  ctx.stroke();

  ctx.fillStyle = alpha("#000000", 0.40);
  for (let u = -L / 2; u <= L / 2; u += CLOTURE_PAS) {
    if (long) ctx.fillRect(u - 1.5, -h / 2, 3, h);
    else ctx.fillRect(-w / 2, u - 1.5, w, 3);
  }
  // le panneau de danger, une seule fois par piece, au tiers.
  ctx.fillStyle = alpha(S.emis, 0.22);
  if (long) ctx.fillRect(-w / 2 + L * 0.33, -h / 2 + 2, 7, Math.max(3, h - 4));
  else ctx.fillRect(-w / 2 + 2, -h / 2 + L * 0.33, Math.max(3, w - 4), 7);
}


/* LE CHASSIS DE MOULAGE — UN CADRE PLEIN DE SABLE. Le cadre est celui des
   utilites ; ce qui change est ce qu il CONTIENT. Un grain fin, mat, sans aucun
   reflet, et l empreinte creuse au milieu : c est la piece qu on n a pas encore
   coulee, et c est ce qui rend la region lisible sans un mot. */
function moule(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LE SABLE : mat, sans liseré clair — c est la seule matiere du depot qui ne
  // renvoie rien, et c est ce qui l oppose a la calamine du laminoir.
  ctx.fillStyle = alpha("#2a2622", 0.62);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  const n = 90;
  ctx.fillStyle = alpha("#ffffff", 0.045);
  for (let i = 0; i < n; i++) {
    const a = ((s * (i + 7)) % 997) / 997, b = ((s * (i + 31)) % 991) / 991;
    ctx.fillRect(-w / 2 + 4 + a * (w - 8), -h / 2 + 4 + b * (h - 8), 1.2, 1.2);
  }
  // L EMPREINTE, creuse et centree : un contour sombre et un liseré au bord bas.
  const ew = w * 0.44, eh = h * 0.40;
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
  ctx.fillStyle = alpha("#8b7f6d", 0.14);
  ctx.fillRect(-ew / 2, eh / 2 - 2, ew, 2);
  // LE CADRE metallique, seul element clair de la piece.
  ctx.strokeStyle = alpha(S.blocEdge, 0.30);
  ctx.lineWidth = 2.4;
  ctx.strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
}

/* LE MALAXEUR — UNE CUVE QUI TOURNE. La cuve de fonderie ne dit rien de ce
   qu elle contient ; celle-ci porte sa couronne d entrainement et sa trappe, et
   c est ce qui la separe. */
function malaxeur(o, S) {
  const w = o.w, h = o.h;
  const r = Math.min(w, h) * 0.42;
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.52);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(S.blocEdge, 0.30);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  // LA COURONNE : des dents courtes et regulieres sur le pourtour.
  ctx.strokeStyle = alpha("#000000", 0.34);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  // LA TRAPPE, en bas : un arc plus sombre, et le sable qui en est tombe.
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-r * 0.34, r * 0.52, r * 0.68, Math.max(3, r * 0.22));
  ctx.fillStyle = alpha("#2a2622", 0.40);
  ctx.fillRect(-r * 0.44, h / 2 - 4, r * 0.88, 3);
}

/* LE BASSIN DE TREMPE — LA SEULE MATIERE FROIDE DE LA FONDERIE. Une margelle
   claire, une eau sombre et CALME, et un liseré de vapeur au bord. Rien n y est
   ambre : c est le contraste avec le reste du theme qui porte l information, et
   il vaut plus que n importe quelle etiquette. */
function bassin(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.42);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LA MARGELLE, claire et large : c est elle qu on longe.
  ctx.fillStyle = alpha(S.bloc, 0.50);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  const m = Math.min(7, w * 0.10, h * 0.10);
  // L EAU : bleu-gris tres sombre, hors palette chaude du lieu.
  ctx.fillStyle = alpha("#0e1a20", 0.86);
  ctx.fillRect(-w / 2 + m, -h / 2 + m, w - m * 2, h - m * 2);
  // trois rides horizontales, immobiles : une eau de trempe est CALME.
  ctx.strokeStyle = alpha("#a8c4d6", 0.10);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i <= 3; i++) {
    const y = -h / 2 + m + (h - m * 2) * (i / 4);
    ctx.moveTo(-w / 2 + m + 2, y); ctx.lineTo(w / 2 - m - 2, y);
  }
  ctx.stroke();
  // LA VAPEUR au bord, seul element clair : un liseré diffus sur le cote long.
  ctx.fillStyle = alpha("#a8c4d6", 0.09);
  ctx.fillRect(-w / 2 + m, -h / 2 + m, w - m * 2, Math.max(2, h * 0.10));
  // LA PIECE qu on y a plongee, une fois sur deux, encore rougeoyante au bord.
  if (s & 1) {
    const pw = (w - m * 2) * 0.30, ph = (h - m * 2) * 0.34;
    ctx.fillStyle = alpha("#000000", 0.50);
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.strokeStyle = alpha(S.emis, 0.16);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
  }
}


/* LA PILE D EPAVES — CE QUI MONTE EN S ECARTANT DE L APLOMB. Elle reprend la
   silhouette de la pile de palettes ; ce qui change est que chaque etage est une
   CARROSSERIE, donc une forme qui a eu des vitres, des portes et de la rouille.
   Trois etages, jamais alignes, et le plus bas est le plus ecrase. */
function epaves(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  const e = h / 3;
  for (let i = 0; i < 3; i++) {
    const dx = ((s >> (i * 3)) & 1) ? Math.min(w * 0.16, 7) : 0;
    const y0 = -h / 2 + i * e;
    // la carrosserie : plus sombre en bas, la rouille prend le dessus en haut.
    ctx.fillStyle = alpha(i === 2 ? PROP.rouille : S.bloc, 0.36 + i * 0.10);
    ctx.fillRect(-w / 2 + dx + 1, y0 + 1, w - dx - 2, e - 2);
    // LE PARE-BRISE, un trapeze clair : c est ce qui dit « voiture » et pas
    // « caisse », et il n existe qu une fois par etage.
    ctx.fillStyle = alpha(PROP.verre, 0.14);
    ctx.fillRect(-w / 2 + dx + w * 0.22, y0 + e * 0.20, w * 0.46, e * 0.28);
    ctx.strokeStyle = alpha("#000000", 0.34);
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + dx + 1, y0 + 1, w - dx - 2, e - 2);
  }
  // les COULEES de rouille, verticales, depuis le haut de la pile.
  ctx.strokeStyle = alpha(PROP.rouille, 0.26);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const x = -w / 2 + w * (0.20 + 0.3 * i);
    ctx.moveTo(x, -h / 2 + 2); ctx.lineTo(x, -h / 2 + e * (1.2 + (s >> i & 1)));
  }
  ctx.stroke();
}

/* LE POTEAU NU — DU BETON COFFRE ET DES FERS EN ATTENTE. Le fer qui depasse est
   toute l information : il dit INACHEVE la ou tout le reste du theme dit
   DETRUIT, et c est la seule region de la Friche qui parle d un futur. */
function poteau(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.58);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // les traces de banche : deux lignes horizontales, le beton garde son moule.
  ctx.strokeStyle = alpha("#000000", 0.22);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const f of [0.36, 0.68]) {
    ctx.moveTo(-w / 2 + 1, -h / 2 + h * f); ctx.lineTo(w / 2 - 1, -h / 2 + h * f);
  }
  ctx.stroke();
  // LES FERS EN ATTENTE : quatre traits fins qui sortent du haut. Ils depassent
  // de l empreinte, et c est voulu — rien ne se lit comme un volume.
  ctx.strokeStyle = alpha(PROP.rouille, 0.44);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + w * (0.2 + i * 0.2);
    const l = 3 + ((s >> (i * 2)) & 3);
    ctx.moveTo(x, -h / 2 + 1); ctx.lineTo(x + ((s >> i) & 1 ? 1 : -1), -h / 2 - l);
  }
  ctx.stroke();
}

/* LA BANCHE — UN PANNEAU DE COFFRAGE DEBOUT. Metal jaune, raidisseurs
   horizontaux, et deux pieds obliques : elle est POSEE contre quelque chose,
   jamais scellee. C est le seul objet NEUF de la Friche. */
function banche(o, S) {
  const w = o.w, h = o.h;
  const long = w >= h;
  ctx.fillStyle = alpha("#000000", 0.38);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.peint, 0.40);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  ctx.strokeStyle = alpha("#000000", 0.30);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const L = long ? w : h;
  for (let u = -L / 2 + 8; u < L / 2 - 4; u += 14) {
    if (long) { ctx.moveTo(u, -h / 2 + 1); ctx.lineTo(u, h / 2 - 1); }
    else { ctx.moveTo(-w / 2 + 1, u); ctx.lineTo(w / 2 - 1, u); }
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(S.blocEdge, 0.28);
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
}


/* LE BRAS D AMARRAGE — UNE PINCE, DONC DEUX MACHOIRES ET UNE ARTICULATION. Il
   est fin et long, il ne cache rien, et pourtant on le reconnait d une vue
   entiere : c est la seule forme du depot qui se termine par une OUVERTURE. */
function bras(o, S) {
  const w = o.w, h = o.h;
  const vert = h >= w;
  const L = vert ? h : w, E = vert ? w : h;
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.56);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // L ARTICULATION : un renflement au tiers, plus clair.
  ctx.fillStyle = alpha(S.blocEdge, 0.30);
  const a = -L / 2 + L * 0.34;
  if (vert) ctx.fillRect(-w / 2 - 1, a - 3, w + 2, 6);
  else ctx.fillRect(a - 3, -h / 2 - 1, 6, h + 2);
  // LES MACHOIRES, en bout : deux traits qui s ecartent.
  ctx.strokeStyle = alpha(S.blocEdge, 0.38);
  ctx.lineWidth = 2;
  ctx.beginPath();
  const b = L / 2 - 1, o2 = E * 0.9;
  for (const d of [-1, 1]) {
    if (vert) { ctx.moveTo(0, b - E); ctx.lineTo(d * o2, b); }
    else { ctx.moveTo(b - E, 0); ctx.lineTo(b, d * o2); }
  }
  ctx.stroke();
  // le feu d approche, un point froid en bout : la station se signale en cyan.
  ctx.fillStyle = alpha(PROP.balise, 0.44);
  if (vert) ctx.fillRect(-1.5, b - 3, 3, 3);
  else ctx.fillRect(b - 3, -1.5, 3, 3);
}

/* LA COQUE — LE SEUL OBJET DU DEPOT PLUS GRAND QUE CE QU ON EN VOIT. Une masse
   lisse, quasi sans detail, avec une seule ligne de HUBLOTS qui donne l echelle.
   Ce qui la fait lire n est pas son dessin, c est son GABARIT : rien d autre
   n occupe autant d ecran d un seul tenant. */
function coque(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.46);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.60);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  // deux plaques de bordé, jointes par une seule couture longitudinale.
  ctx.strokeStyle = alpha("#000000", 0.20);
  ctx.lineWidth = 2;
  const long = w >= h;
  ctx.beginPath();
  if (long) { ctx.moveTo(-w / 2 + 4, -h * 0.12); ctx.lineTo(w / 2 - 4, -h * 0.12); }
  else { ctx.moveTo(-w * 0.12, -h / 2 + 4); ctx.lineTo(-w * 0.12, h / 2 - 4); }
  ctx.stroke();
  // LES HUBLOTS : une file reguliere, petits, froids. C est l echelle.
  const L = long ? w : h;
  ctx.fillStyle = alpha(PROP.balise, 0.20);
  for (let u = -L / 2 + 14; u < L / 2 - 8; u += 16) {
    if (long) ctx.fillRect(u, h * 0.16, 4, 4);
    else ctx.fillRect(w * 0.16, u, 4, 4);
  }
  // un GIVRE d arete, du cote de l ombre : la coque est dehors.
  ctx.fillStyle = alpha(PROP.givre, 0.10 + (s & 3) * 0.02);
  if (long) ctx.fillRect(-w / 2 + 3, h / 2 - 7, w - 6, 4);
  else ctx.fillRect(w / 2 - 7, -h / 2 + 3, 4, h - 6);
}

/* LA CLOISON ETANCHE — LE SEUL PLEIN DE LA NEBULEUSE. Elle porte un CADRE
   massif et un hublot rond : dedans, on ne voit le vide que par un trou. C est
   l inverse exact de tout le reste du theme, et c est ce qui fait exister le
   mot « depressurise ». */
function cloison(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const vert = h >= w;
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // le PANNEAU composite, clair et uni : rien d autre du theme n est clair.
  ctx.fillStyle = alpha(S.blocEdge, 0.26);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // LES RAIDISSEURS, reguliers et serres.
  ctx.strokeStyle = alpha("#000000", 0.24);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const L = vert ? h : w;
  for (let u = -L / 2 + 12; u < L / 2 - 6; u += 18) {
    if (vert) { ctx.moveTo(-w / 2 + 2, u); ctx.lineTo(w / 2 - 2, u); }
    else { ctx.moveTo(u, -h / 2 + 2); ctx.lineTo(u, h / 2 - 2); }
  }
  ctx.stroke();
  // LE HUBLOT, un seul, rond, sombre : le vide vu de l interieur.
  const r = Math.min(w, h) * 0.30;
  const c = (((s >> 2) & 3) - 1.5) * L * 0.18;
  ctx.fillStyle = alpha("#03050c", 0.80);
  ctx.beginPath();
  ctx.arc(vert ? 0 : c, vert ? c : 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alpha(S.blocEdge, 0.34);
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

/* LA CONSOLE — UN POSTE MURAL, DONC UN OBJET A HAUTEUR D HOMME. Elle est la
   seule chose de la Nebuleuse qui soit ALLUMEE de l interieur, et c est ce qui
   dit qu on est dans une piece et pas dans le vide. */
function console_(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.42);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.56);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // L ECRAN : un rectangle froid, plus clair que tout le reste du lieu.
  const ew = w * 0.52, eh = h * 0.34;
  ctx.fillStyle = alpha(PROP.balise, 0.22);
  ctx.fillRect(-ew / 2, -h / 2 + h * 0.18, ew, eh);
  ctx.strokeStyle = alpha("#000000", 0.30);
  ctx.lineWidth = 1;
  ctx.strokeRect(-ew / 2, -h / 2 + h * 0.18, ew, eh);
  // LES VOYANTS, une rangee, deux allumes sur cinq — un poste au repos.
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = alpha(((s >> i) & 1) ? PROP.balise : "#000000", ((s >> i) & 1) ? 0.34 : 0.30);
    ctx.fillRect(-w / 2 + w * (0.16 + i * 0.16), h / 2 - h * 0.24, 3, 3);
  }
}

function conteneur(o, S) {
  const w = o.w, h = o.h, s = graine(o);

  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.46);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);

  const long = w >= h;
  const pas = 7;
  ctx.strokeStyle = alpha("#000000", 0.30);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (long) for (let u = -w / 2 + pas; u < w / 2; u += pas) { ctx.moveTo(u, -h / 2 + 3); ctx.lineTo(u, h / 2 - 3); }
  else      for (let u = -h / 2 + pas; u < h / 2; u += pas) { ctx.moveTo(-w / 2 + 3, u); ctx.lineTo(w / 2 - 3, u); }
  ctx.stroke();

  // deux ferrures aux extremites : c est ce qui dit qu on le souleve.
  ctx.fillStyle = alpha(S.blocEdge, 0.22);
  const f = Math.min(6, w * 0.18, h * 0.18);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, f, h - 6);
  ctx.fillRect(w / 2 - 3 - f, -h / 2 + 3, f, h - 6);
  // une marque peinte, differente par piece, jamais lisible : de la matiere.
  ctx.fillStyle = alpha(S.emis, 0.10);
  ctx.fillRect(-w / 2 + f + 6, -h / 2 + h * 0.30, Math.max(4, w * 0.16), Math.max(3, h * 0.16));
}
