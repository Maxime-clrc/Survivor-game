import {
  BIOMES, BLOCS, B_CARCASSE, B_CHAINE, B_CONDUITE, B_CUVE, B_DEBRIS, B_FOUR,
  B_FRAGMENT, B_MACHINE, B_MUR, B_POSTE, B_RUINE, B_TRAVEE,
  B_DEVANTURE, B_PYLONE, B_CONTENEUR,
  B_PALETTIER, B_PILE, B_QUAI, B_REMORQUE,
  B_CLOTURE, B_ETABLI, B_OUVERTE, B_TRANSFO,
  B_BASSIN, B_MALAXEUR, B_MOULE,
  B_BANCHE, B_EPAVES, B_GRILLAGE, B_POTEAU,
  B_BRAS, B_CLOISON, B_COQUE, B_CONSOLE,
  B_AVEUGLE, B_ESCALIER, B_ETAL, B_MONOLITHE, B_FOSSE, B_POUTRE,
  B_LAMINOIR, B_MEMBRURE, B_BORDE, B_ALVEOLE, B_COURSIVE,
  B_BAC, B_HOTTE, B_CAGE, B_PORTIQUE,
  B_TAS, B_BOSQUET, B_RONCE,
  B_TUNNEL, B_TOURNANTE, B_CONVERTISSEUR, B_TALUS, B_PORTAIL, B_DALLE,
  B_ROCHE, B_SAS, B_ABRIBUS,
  B_VEHICULE, B_TOURNIQUET, B_BARRIERE, B_GUERITE,
  B_CULTURE, B_TORE, B_PARABOLE,
  B_WAGON, B_BALLE, B_FERME,
  B_GABARIT, B_CABINE, B_BRAME,
  B_BENNE, B_CHAUDIERE, B_CHARGEUR,
  B_FONTAINE, B_SOUTENEMENT, B_BITTE, B_BANQUE,
  B_ARRIMAGE, B_NAVETTE, B_ECHANGEUR, B_FOREUSE,
  B_SILO, B_CRASSE, B_PAILLASSE,
  B_ISOLATEUR, B_POMPE, B_DECANTEUR, gabaritsDe,
} from "/shared/biomes.js";
import { PROP, alpha } from "/shared/palette.js";
import { biomeKey, ctx, lumDir, skin } from "./stage.js";

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
  ouverte: formeOuverte, cadre: formeCadre, nappe: formeNappe,
  masse_molle: formeMasseMolle,
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
  aveugle, escalier, monolithe, etal, fosse, poutre,
  laminoir, membrure, borde, alveole, coursive,
  bac, hotte, cage, portique,
  tas, bosquet, ronce,
  tunnel, tournante, convertisseur, talus, portail, dalle, roche, sas, abribus,
  vehicule, tourniquet, barriere, guerite,
  bacCulture, tore, paraboleSol,
  wagon, balle, fermeTombee,
  gabarit, cabine, brame,
  benne, chaudiere, chargeur,
  fontaine, soutenement, bitte, banque,
  arrimage, navette, echangeur, foreuse,
  silo, crasse, paillasse,
  isolateur, pompe, decanteur,
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
    [B_POUTRE]: { sil: "caisson", hab: "poutre" },
    // LE SECOND CREUX DU DEPOT, et le premier a l Usine.
    [B_BAC]: { sil: "nappe", hab: "bac", creux: true },
    [B_HOTTE]: { sil: "caisson", hab: "hotte" },
    [B_CAGE]: { sil: "cadre", hab: "cage" },
    [B_PORTIQUE]: { sil: "barre", hab: "portique" },
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
    [B_TUNNEL]: { sil: "caisson", hab: "tunnel" },
    [B_TOURNANTE]: { sil: "caisson", hab: "tournante" },
    [B_BENNE]: { sil: "conteneur", hab: "benne" },
    // LE PREMIER OCTOGONE HORS DE LA FONDERIE ET DE LA NEBULEUSE : ce qui
    // contient une combustion n a pas de coin, quel que soit le theme.
    [B_CHAUDIERE]: { sil: "octogone", hab: "chaudiere" },
    [B_CHARGEUR]: { sil: "machine", hab: "chargeur" },
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
    /* LE SEUL BLOC DU DEPOT QUI SE DESSINE EN CREUX. `creux` est lu par
       `drawObstacles` : pas d ombre portee — un trou n en projette pas — et
       pas de relief vers la camera, qui le ferait lire comme une masse. */
    [B_FOSSE]: { sil: "nappe", hab: "fosse", creux: true },
    [B_LAMINOIR]: { sil: "caisson", hab: "laminoir" },
    [B_TAS]: { sil: "masse_molle", hab: "tas" },
    [B_CONVERTISSEUR]: { sil: "caisson", hab: "convertisseur" },
    // LE MEME PALETTIER QUE LE MAGASIN DE L USINE, une autre matiere : deux
    // themes, une silhouette, et c est du bois au lieu de l acier.
    [B_GABARIT]: { sil: "palettier", hab: "gabarit" },
    [B_CABINE]: { sil: "caisson", hab: "cabine" },
    // LA MEME PILE QUE LA CASSE ET LE MAGASIN : ce qui s empile a des aretes.
    [B_BRAME]: { sil: "pile", hab: "brame" },
    [B_SILO]: { sil: "fut", hab: "silo" },
    // LA MEME MASSE MOLLE QUE LE TAS DE MINERAI, et c est la couleur qui les
    // separe : deux bouts de la meme chaine, une silhouette, deux matieres.
    [B_CRASSE]: { sil: "masse_molle", hab: "crasse" },
    [B_PAILLASSE]: { sil: "caisson", hab: "paillasse" },
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
    // LA MEME SILHOUETTE QUE LE TAS, une autre matiere : ce qui s accumule tout
    // seul et ce qui pousse tout seul ont le meme bord.
    [B_BOSQUET]: { sil: "masse_molle", hab: "bosquet" },
    [B_RONCE]: { sil: "mur_bas", hab: "ronce" },
    /* PAS `mur_bas` : ses creneaux disent qu un mur a CASSE, et une banche est
       neuve. `verifierEmpreinte` l a refusee a 15,6 % pour un seuil de 10 —
       une silhouette de ruine sur un panneau de coffrage faisait buter sur du
       vide en plus de mentir. */
    [B_BANCHE]: { sil: "caisson", hab: "banche" },
    // LA TROISIEME MASSE MOLLE, et la seule qui ne soit ni un tas ni un
    // bosquet : de la terre poussee la, avec ce qui a repris dessus.
    [B_TALUS]: { sil: "masse_molle", hab: "talus" },
    [B_PORTAIL]: { sil: "cadre", hab: "portail" },
    [B_DALLE]: { sil: "caisson", hab: "dalle" },
    // LE MEME CONTENEUR QUE LE SECTEUR, une troisieme matiere : caisse,
    // carrosserie, wagon — c est ce qu on met dessus qui dit lequel.
    [B_WAGON]: { sil: "conteneur", hab: "wagon" },
    [B_BALLE]: { sil: "caisson", hab: "balle" },
    [B_FERME]: { sil: "barre", hab: "fermeTombee" },
    [B_ISOLATEUR]: { sil: "mat", hab: "isolateur" },
    [B_POMPE]: { sil: "machine", hab: "pompe" },
    // LE QUATRIEME CREUX DU DEPOT, et le premier de la Friche : la fosse est
    // noire, le bac est plein, la fontaine renvoie le ciel, celui-ci est SEC.
    [B_DECANTEUR]: { sil: "nappe", hab: "decanteur", creux: true },
  },
  nebuleuse: {
    [B_FRAGMENT]: { sil: "eclat", hab: "fragment" },
    [B_TRAVEE]: { sil: "travee", hab: "travee" },
    [B_DEBRIS]: { sil: "debris", hab: "debris" },
    [B_BRAS]: { sil: "mat", hab: "bras" },
    [B_COQUE]: { sil: "caisson", hab: "coque" },
    [B_CLOISON]: { sil: "caisson", hab: "cloison" },
    [B_CONSOLE]: { sil: "caisson", hab: "console" },
    // LE CADRE, une quatrieme fois : claire-voie, chassis de sable, grillage de
    // casse, et maintenant une ossature. Sa regle tient — il est habille.
    [B_MEMBRURE]: { sil: "cadre", hab: "membrure" },
    [B_BORDE]: { sil: "caisson", hab: "borde" },
    [B_ROCHE]: { sil: "masse_molle", hab: "roche" },
    // LE CADRE, une cinquieme fois : claire-voie, chassis de sable, grillage,
    // ossature, et maintenant un bac de culture. Sa regle tient — il est habille.
    [B_CULTURE]: { sil: "cadre", hab: "bacCulture" },
    // LE PREMIER OCTOGONE HORS DE LA FONDERIE, et c est le meme argument : ce
    // qui contient une reaction n a pas de coin.
    [B_TORE]: { sil: "octogone", hab: "tore" },
    [B_PARABOLE]: { sil: "fut", hab: "paraboleSol" },
    [B_SAS]: { sil: "caisson", hab: "sas" },
    // LE CINQUIEME CONTENEUR : caisse, carrosserie, wagon, banque, colis.
    [B_ARRIMAGE]: { sil: "conteneur", hab: "arrimage" },
    // LE MEME CHASSIS QUE LA CARCASSE ET LA REMORQUE, en INTACT : c est la
    // premiere fois que cette silhouette ne dit pas une epave.
    [B_NAVETTE]: { sil: "chassis", hab: "navette" },
    [B_ECHANGEUR]: { sil: "barre", hab: "echangeur" },
    [B_FOREUSE]: { sil: "mat", hab: "foreuse" },
  },
  secteur: {
    [B_DEVANTURE]: { sil: "devanture", hab: "devanture" },
    [B_PYLONE]: { sil: "mat", hab: "pylone" },
    [B_CONTENEUR]: { sil: "conteneur", hab: "conteneur" },
    [B_AVEUGLE]: { sil: "caisson", hab: "aveugle" },
    [B_ESCALIER]: { sil: "caisson", hab: "escalier" },
    [B_MONOLITHE]: { sil: "caisson", hab: "monolithe" },
    [B_ETAL]: { sil: "conteneur", hab: "etal" },
    [B_ALVEOLE]: { sil: "mur_bas", hab: "alveole" },
    [B_COURSIVE]: { sil: "barre", hab: "coursive" },
    [B_ABRIBUS]: { sil: "cadre", hab: "abribus" },
    // LE TROISIEME CREUX DU DEPOT, et le seul qui soit PLEIN : la fosse et le
    // bac sont des vides, une fontaine contient de l eau.
    [B_FONTAINE]: { sil: "nappe", hab: "fontaine", creux: true },
    [B_SOUTENEMENT]: { sil: "caisson", hab: "soutenement" },
    [B_BITTE]: { sil: "mat", hab: "bitte" },
    // LE QUATRIEME CONTENEUR : caisse, carrosserie, wagon, banque d accueil.
    [B_BANQUE]: { sil: "conteneur", hab: "banque" },
    // LE MEME CONTENEUR, UNE AUTRE MATIERE : une boite chanfreinee vue de
    // dessus est une caisse ou une carrosserie, et c est le vitrage qui dit
    // laquelle. La carcasse de la Friche est le meme objet trente ans plus tard.
    [B_VEHICULE]: { sil: "conteneur", hab: "vehicule" },
    [B_TOURNIQUET]: { sil: "cadre", hab: "tourniquet" },
    /* PAS `mur_bas` : ses creneaux disent qu un mur a CASSE, et un bloc de
       chicane est moule. `verifierEmpreinte` l a refuse a 11,5 % pour un seuil
       de 10 — a 144 x 27 les creneaux mangent le rectangle. */
    [B_BARRIERE]: { sil: "caisson", hab: "barriere" },
    [B_GUERITE]: { sil: "caisson", hab: "guerite" },
  },
};

const formeDe = (f) => SILHOUETTE[f.sil] ?? SILHOUETTE.caisson;
// UN BLOC EST-IL UN CREUX ? Lu par `drawObstacles`, qui inverse alors son
// relief et retire son ombre portee.
export function estCreux(cle, kind) { return !!fiche(cle, kind).creux; }
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


/* LA NAPPE — LA SEULE SILHOUETTE QUI DECRIVE UNE ABSENCE. Un rectangle franc :
   un trou a un BORD NET, c est meme la seule chose qui le rende lisible. Elle
   remplit son empreinte — ce qui manque est le sol, pas le dessin. */
function formeNappe(g, o) {
  g.beginPath();
  g.rect(-o.w / 2, -o.h / 2, o.w, o.h);
  g.closePath();
}


/* LA MASSE MOLLE — LA PREMIERE FORME DU DEPOT QUI NE SOIT NI USINEE NI CASSEE.
   Tout le reste est chanfreine, creneau ou cisaille : des aretes que quelqu un a
   faites. Un tas s est fait TOUT SEUL — son bord est irregulier et CONTINU, sans
   un seul angle, et c est ce qui le rend reconnaissable d une vue entiere.

   ELLE SUIT LE PERIMETRE DE SA BOITE, ELLE N EST PAS UN CERCLE — et c est
   `verifierEmpreinte` qui l a impose. Un contour rond inscrit dans son rectangle
   laisse 21 % de vide dans le meilleur des cas (1 - pi/4), donc AUCUNE forme
   ronde ne peut passer un seuil de 10 % : la collision est une AABB, et un tas
   circulaire ferait buter sur du vide a ses quatre coins. Premier jet mesure a
   37 %.
   ON PARCOURT DONC LE PERIMETRE et on RENTRE chaque point d au plus
   `MOLLE_CREUX` : le bord reste irregulier et sans angle — c est tout ce qui
   compte — et la boite reste pleine a 93 %. */
const MOLLE_N = 28, MOLLE_CREUX = 0.03;
function formeMasseMolle(g, o) {
  const w = o.w, h = o.h;
  const s = graine(o);
  const p = [];
  const per = 2 * (w + h);
  for (let i = 0; i < MOLLE_N; i++) {
    // un point du PERIMETRE de la boite, puis un retrait vers l interieur.
    let d = (i / MOLLE_N) * per, x, y, nx, ny;
    if (d < w) { x = -w / 2 + d; y = -h / 2; nx = 0; ny = 1; }
    else if (d < w + h) { d -= w; x = w / 2; y = -h / 2 + d; nx = -1; ny = 0; }
    else if (d < 2 * w + h) { d -= w + h; x = w / 2 - d; y = h / 2; nx = 0; ny = -1; }
    else { d -= 2 * w + h; x = -w / 2; y = h / 2 - d; nx = 1; ny = 0; }
    // le bruit est DETERMINISTE et periodique en i : deux tas voisins n ont pas
    // la meme silhouette, et le meme tas la garde d une image a l autre.
    const k = MOLLE_CREUX * (((s >> (i % 13)) & 3) / 3);
    p.push([x + nx * w * k, y + ny * h * k]);
  }
  g.beginPath();
  g.moveTo((p[MOLLE_N - 1][0] + p[0][0]) / 2, (p[MOLLE_N - 1][1] + p[0][1]) / 2);
  for (let i = 0; i < MOLLE_N; i++) {
    const j = (i + 1) % MOLLE_N;
    g.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[j][0]) / 2, (p[i][1] + p[j][1]) / 2);
  }
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
    /* UNE COURBE S ECHANTILLONNE, ELLE NE SE RESUME PAS A SON POINT D ARRIVEE.
       La masse molle est le premier contour courbe du depot, et le banc a leve
       `g.quadraticCurveTo is not a function` — comme il avait leve `g.rect`
       avant elle. Garder seulement l extremite sous-estimerait le remplissage
       d une forme bombee et le surestimerait d une forme creusee : on pose
       quatre points sur la courbe, ce qui suffit a un test de parite. */
    quadraticCurveTo(cx, cy, x, y) {
      const [px, py] = poly.length ? poly[poly.length - 1] : [cx, cy];
      for (let i = 1; i <= 4; i++) {
        const t = i / 4, u = 1 - t;
        poly.push([u * u * px + 2 * u * t * cx + t * t * x,
                   u * u * py + 2 * u * t * cy + t * t * y]);
      }
    },
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

/* LE TUNNEL DE CUISSON — DEUX BOUCHES ET UN CAPOT. Ce qui le fait lire est que
   ses deux extremites sont OUVERTES et sombres, le reste ferme : on comprend
   qu une piece y entre et en ressort sans qu il faille dessiner la piece. */
function tunnel(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h, E = long ? h : w;
  ctx.fillStyle = alpha("#000000", 0.42);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.66);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  // LES DEUX BOUCHES, noires, aux extremites de l axe long.
  ctx.fillStyle = alpha("#000000", 0.72);
  for (const u of [-1, 1]) {
    if (long) ctx.fillRect(u > 0 ? w / 2 - 7 : -w / 2 + 3, -h / 2 + 6, 4, h - 12);
    else ctx.fillRect(-w / 2 + 6, u > 0 ? h / 2 - 7 : -h / 2 + 3, w - 12, 4);
  }
  // les cerces du capot : des anneaux reguliers, c est ce qui donne la longueur.
  ctx.strokeStyle = alpha("#000000", 0.26);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let u = -L / 2 + 16; u < L / 2 - 10; u += 18) {
    if (long) { ctx.moveTo(u, -h / 2 + 4); ctx.lineTo(u, h / 2 - 4); }
    else { ctx.moveTo(-w / 2 + 4, u); ctx.lineTo(w / 2 - 4, u); }
  }
  ctx.stroke();
  // la bande chaude qui fuit sous le capot, du cote de l ombre.
  ctx.fillStyle = alpha(S.emis, 0.10 + (s & 3) * 0.02);
  if (long) ctx.fillRect(-w / 2 + 6, h * 0.30, w - 12, Math.max(2, E * 0.06));
  else ctx.fillRect(w * 0.30, -h / 2 + 6, Math.max(2, E * 0.06), h - 12);
}

/* LA TABLE TOURNANTE — UN DISQUE DANS UN CARRE, ET DEUX RAILS QUI S Y CROISENT.
   Le disque ne tourne pas : un mouvement continu appartient a la matiere, et
   c est le CROISEMENT des rails qui dit la fonction, pas une animation. */
function tournante(o, S) {
  const w = o.w, h = o.h;
  const r = Math.min(w, h) * 0.40;
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.58);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  ctx.strokeStyle = alpha("#000000", 0.34);
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metal, 0.22);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2 + 4); ctx.lineTo(0, h / 2 - 4);
  ctx.moveTo(-w / 2 + 4, 0); ctx.lineTo(w / 2 - 4, 0);
  ctx.stroke();
  // le pivot, et les quatre cales qui bloquent le plateau hors rotation.
  ctx.fillStyle = alpha("#000000", 0.50);
  ctx.beginPath(); ctx.arc(0, 0, Math.max(2, r * 0.16), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(S.emis, 0.16);
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.fillRect(dx * r * 0.72 - 2, dy * r * 0.72 - 2, 4, 4);
  }
}

/* LE CONVERTISSEUR — UNE PANSE ET DEUX TOURILLONS. Le four est un octogone
   ferme, la cuve un cylindre ; celui-ci a un COL, decentre, et c est de ce cote
   qu il verse. Le seul objet du theme dont on lise l orientation. */
function convertisseur(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.46);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, alpha(S.bloc, 0.70));
  g.addColorStop(0.62, alpha(S.bloc, 0.52));
  g.addColorStop(1, alpha("#000000", 0.40));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  // LES DEUX TOURILLONS, sur l axe court : c est autour d eux qu il bascule.
  ctx.fillStyle = alpha(PROP.metalDark, 0.62);
  ctx.fillRect(-w / 2 - 2, -h * 0.06, 6, h * 0.12);
  ctx.fillRect(w / 2 - 4, -h * 0.06, 6, h * 0.12);
  // LE COL, decentre, et le seul endroit chaud de la piece.
  const d = (s & 1) ? -1 : 1;
  ctx.fillStyle = alpha("#000000", 0.54);
  ctx.fillRect(-w * 0.16, -h / 2 + 2 + (d > 0 ? 0 : h - 10), w * 0.32, 8);
  ctx.fillStyle = alpha(S.emis, 0.30);
  ctx.fillRect(-w * 0.12, -h / 2 + 4 + (d > 0 ? 0 : h - 10), w * 0.24, 4);
  // les cerclages de la panse.
  ctx.strokeStyle = alpha("#000000", 0.22);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const u of [-0.22, 0.10, 0.34]) {
    ctx.moveTo(-w / 2 + 4, h * u); ctx.lineTo(w / 2 - 4, h * u);
  }
  ctx.stroke();
}

/* LE TALUS — DE LA TERRE, DONC UN DEGRADE ET PAS UN CONTOUR. Il n a ni arete ni
   liseré franc : la clarte tombe du haut vers le pied, et ce qui a repris
   dessus est pose par touffes le long de la crete. */
function talus(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, alpha("#6a5a42", 0.60));
  g.addColorStop(0.55, alpha("#4a3d2c", 0.62));
  g.addColorStop(1, alpha("#221c14", 0.58));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // le GRAIN de terre, plus dense au pied.
  for (let i = 0; i < 70; i++) {
    const x = -w / 2 + ((s * (i + 7)) % 991) / 991 * w;
    const t = ((s * (i + 19)) % 983) / 983;
    ctx.fillStyle = alpha(i & 1 ? "#000000" : "#8a7658", 0.08 + t * 0.10);
    ctx.fillRect(x, -h / 2 + t * h, 1.8, 1.8);
  }
  // LES TOUFFES sur la crete : c est ce qui dit que rien ne l a touche depuis.
  ctx.fillStyle = alpha(PROP.vert, 0.22);
  for (let i = 0; i < 9; i++) {
    const x = -w / 2 + (i + 0.5) * (w / 9) + (((s >> i) & 3) - 1.5) * 3;
    ctx.beginPath();
    ctx.arc(x, -h * 0.26 + (((s >> (i + 3)) & 3) / 3) * h * 0.14, 3 + ((s >> i) & 1) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* LE PORTAIL — DEUX PILIERS ET DES BARREAUX, ET ON VOIT A TRAVERS. Il est
   habille parce que le cadre l exige : une silhouette qui laisse passer le
   regard doit dire de quoi elle est faite, sinon elle n est qu un trou. */
function portail(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LES DEUX PILIERS, pleins : ce sont eux qui tiennent encore.
  ctx.fillStyle = alpha(PROP.brique, 0.62);
  ctx.fillRect(-w / 2, -h / 2, w * 0.22, h);
  ctx.fillRect(w / 2 - w * 0.22, -h / 2, w * 0.22, h);
  // les barreaux, et l un d eux est TORDU — sinon le portail est neuf.
  ctx.strokeStyle = alpha(PROP.rouille, 0.50);
  ctx.lineWidth = 2;
  ctx.beginPath();
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x = -w * 0.22 + (i + 0.5) * (w * 0.44 / n);
    const t = ((s >> i) & 3) === 0 ? 4 : 0;
    ctx.moveTo(x, -h / 2 + 3); ctx.lineTo(x + t, h / 2 - 3);
  }
  ctx.stroke();
  // la traverse haute, seule : la basse est partie avec le mur.
  ctx.strokeStyle = alpha(PROP.rouille, 0.40);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, -h * 0.30); ctx.lineTo(w / 2 - 2, -h * 0.30);
  ctx.stroke();
}

/* LA DALLE LEVEE — DU BETON VU PAR LA TRANCHE, ET DES FERS QUI SORTENT. Sa
   matiere est celle du sol parce que c EST le sol : c est le seul objet du depot
   qui reprenne la couleur d arene au lieu de celle du bati. */
function dalle(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.arena, 0.86);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // la TRANCHE, plus claire : la cassure est fraiche du cote leve.
  ctx.fillStyle = alpha("#9a9186", 0.20);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, Math.max(3, h * 0.14));
  // LES FERS A BETON, tordus, au-dessus de l arete.
  ctx.strokeStyle = alpha(PROP.rouille, 0.54);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + (i + 0.8) * (w / 5);
    const d = ((s >> (i * 2)) & 3) - 1.5;
    ctx.moveTo(x, -h / 2 + 3);
    ctx.lineTo(x + d * 3, -h / 2 - 5 - ((s >> i) & 3));
  }
  ctx.stroke();
  // les fissures de la face, courtes et sans direction commune.
  ctx.strokeStyle = alpha("#000000", 0.24);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + ((s * (i + 11)) % 977) / 977 * w;
    const y = -h / 2 + ((s * (i + 5)) % 971) / 971 * h;
    ctx.moveTo(x, y); ctx.lineTo(x + 4 - ((s >> i) & 7), y + 5);
  }
  ctx.stroke();
}

/* LA ROCHE — AUCUNE LIGNE DROITE, ET C EST TOUT SON PROPOS. Pas de couture, pas
   de rivet, pas de hublot : elle se distingue de l epave par ce qu elle n a
   pas. Des crateres, et une face eclairee par l astre. */
function roche(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const g = ctx.createRadialGradient(-w * 0.18, -h * 0.20, 0, 0, 0, Math.max(w, h) * 0.62);
  g.addColorStop(0, alpha("#6d6a66", 0.62));
  g.addColorStop(0.6, alpha("#3c3a38", 0.62));
  g.addColorStop(1, alpha("#17161a", 0.60));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LES CRATERES : un anneau clair au bord eclaire, un creux sombre dedans.
  for (let i = 0; i < 7; i++) {
    const a = ((s * (i + 3)) % 997) / 997 * Math.PI * 2;
    const d = Math.sqrt(((s * (i + 13)) % 991) / 991) * 0.38;
    const r = Math.min(w, h) * (0.05 + (((s >> i) & 3) / 3) * 0.07);
    const cx = Math.cos(a) * w * d, cy = Math.sin(a) * h * d;
    ctx.fillStyle = alpha("#000000", 0.24);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha("#8d8a86", 0.16);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx - r * 0.12, cy - r * 0.12, r * 0.9, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke();
  }
  // le GIVRE du cote froid : la seule chose qu elle partage avec les coques.
  ctx.fillStyle = alpha(PROP.givre, 0.08 + (s & 3) * 0.02);
  ctx.fillRect(-w / 2 + 2, h * 0.30, w - 4, Math.max(2, h * 0.10));
}

/* LE SAS — UNE TRAPPE RONDE, SES CONDAMNATIONS, ET UN VOYANT QUI TIENT. Tout ce
   qui l entoure est creve ; lui est ferme, et ses quatre barres mises en croix
   disent que quelqu un l a verrouille depuis l interieur. */
function sas(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const r = Math.min(w, h) * 0.30;
  ctx.fillStyle = alpha("#000000", 0.48);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#c9ccd2", 0.30);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  ctx.fillStyle = alpha(S.bloc, 0.44);
  ctx.fillRect(-w / 2 + 3, h * 0.10, w - 6, h / 2 - 3 - h * 0.10);
  ctx.strokeStyle = alpha("#000000", 0.40);
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(0, -h * 0.08, r, 0, Math.PI * 2); ctx.stroke();
  // LES CONDAMNATIONS : quatre barres au travers de la trappe.
  ctx.strokeStyle = alpha(PROP.metalDark, 0.56);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    ctx.moveTo(Math.cos(a) * r * 1.18, -h * 0.08 + Math.sin(a) * r * 1.18);
    ctx.lineTo(Math.cos(a) * r * 0.30, -h * 0.08 + Math.sin(a) * r * 0.30);
  }
  ctx.stroke();
  // les bandes de danger au seuil, et le voyant qui tient encore.
  ctx.fillStyle = alpha("#000000", 0.30);
  for (let i = 0; i < 5; i++) ctx.fillRect(-w / 2 + 5 + i * ((w - 10) / 5), h / 2 - 8, (w - 10) / 10, 5);
  ctx.fillStyle = alpha(PROP.balise, 0.24 + (s & 1) * 0.08);
  ctx.fillRect(-3, -h / 2 + 5, 6, 3);
}

/* L ABRIBUS — DU VERRE SUR TROIS COTES, UN TOIT, UN BANC. Il laisse voir ce qui
   arrive derriere sans laisser tirer : c est la seule fois du depot ou la
   claire-voie serve a du confort et non a de la securite. */
function abribus(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h;
  ctx.fillStyle = alpha("#000000", 0.26);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LE VITRAGE, et un panneau MANQUE : une rue habitee casse ses abribus.
  const n = 4, casse = s % n;
  ctx.fillStyle = alpha(PROP.verre, 0.16);
  for (let i = 0; i < n; i++) {
    if (i === casse) continue;
    if (long) ctx.fillRect(-w / 2 + 3 + i * ((w - 6) / n), -h / 2 + 3, (w - 6) / n - 2, h - 6);
    else ctx.fillRect(-w / 2 + 3, -h / 2 + 3 + i * ((h - 6) / n), w - 6, (h - 6) / n - 2);
  }
  // LE TOIT : une arete franche du cote de la chaussee, c est ce qui l ancre.
  ctx.strokeStyle = alpha(PROP.metal, 0.40);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (long) { ctx.moveTo(-w / 2 + 1, -h / 2 + 1); ctx.lineTo(w / 2 - 1, -h / 2 + 1); }
  else { ctx.moveTo(-w / 2 + 1, -h / 2 + 1); ctx.lineTo(-w / 2 + 1, h / 2 - 1); }
  ctx.stroke();
  // le BANC, et l affiche retro-eclairee du fond.
  ctx.fillStyle = alpha(PROP.metalDark, 0.44);
  if (long) ctx.fillRect(-w / 2 + 5, h * 0.18, w - 10, Math.max(2, h * 0.16));
  else ctx.fillRect(w * 0.18, -h / 2 + 5, Math.max(2, w * 0.16), h - 10);
  ctx.fillStyle = alpha(S.emis, 0.20);
  if (long) ctx.fillRect(w / 2 - 8, -h / 2 + 5, 4, h - 10);
  else ctx.fillRect(-w / 2 + 5, h / 2 - 8, w - 10, 4);
}


/* LE VEHICULE A L ARRET — VU DE DESSUS, ET C EST CE QUI LE REND LISIBLE. Un
   capot, un pare-brise, un toit, une lunette : quatre bandes dans l ordre, et
   personne ne peut le confondre avec une caisse. Il est le seul objet du depot
   qui soit INTACT et ABANDONNE en meme temps — la carcasse de la Friche est le
   meme objet trente ans plus tard. */
function vehicule(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h, E = long ? h : w;
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LA CARROSSERIE, et sa teinte est la SEULE variation : trois carrosseries
  // identiques alignees feraient un decor de catalogue.
  const teintes = ["#6a7078", "#7a5a4a", "#4a5a6a", "#6a6a52"];
  ctx.fillStyle = alpha(teintes[s & 3], 0.62);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // LE VITRAGE : deux bandes sombres, aux deux tiers de la longueur.
  ctx.fillStyle = alpha("#1a2028", 0.50);
  for (const u of [-0.18, 0.20]) {
    if (long) ctx.fillRect(L * u - E * 0.06, -h / 2 + 4, E * 0.12, h - 8);
    else ctx.fillRect(-w / 2 + 4, L * u - E * 0.06, w - 8, E * 0.12);
  }
  // le TOIT, plus clair : c est lui qui prend la lumiere.
  ctx.fillStyle = alpha("#c8ccd2", 0.10);
  if (long) ctx.fillRect(-L * 0.16, -h / 2 + 5, L * 0.34, h - 10);
  else ctx.fillRect(-w / 2 + 5, -L * 0.16, w - 10, L * 0.34);
  ctx.strokeStyle = alpha("#000000", 0.28);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
}

/* LE TOURNIQUET — UNE LIGNE QU IL FAUT FRANCHIR. Deux montants, trois bras, et
   on voit a travers : c est un cadre, donc il bloque le corps sans cacher ce qui
   arrive derriere. Les bras sont FIXES — un mouvement continu appartient a la
   matiere, et un tourniquet qui tourne annoncerait quelque chose. */
function tourniquet(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.26);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LES DEUX MONTANTS, pleins, aux extremites de l axe court.
  ctx.fillStyle = alpha(PROP.metal, 0.44);
  const long = w >= h;
  if (long) {
    ctx.fillRect(-w / 2, -h / 2, w, 4);
    ctx.fillRect(-w / 2, h / 2 - 4, w, 4);
  } else {
    ctx.fillRect(-w / 2, -h / 2, 4, h);
    ctx.fillRect(w / 2 - 4, -h / 2, 4, h);
  }
  // LES BRAS, trois, en etoile depuis le centre.
  ctx.strokeStyle = alpha(PROP.metal, 0.34);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const r = Math.min(w, h) * 0.42;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + (s & 3) * 0.3;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  // le voyant de passage : le seul point vert du depot, et il est minuscule.
  ctx.fillStyle = alpha(((s >> 2) & 1) ? "#5ec87a" : "#c85e5e", 0.34);
  ctx.fillRect(-1.5, -h / 2 + 5, 3, 3);
}

/* LA BARRIERE DE CHICANE — BASSE, LOURDE, ET ELLE NE FERME RIEN. Un bloc de
   beton moule avec ses bandes reflechissantes : on le voit de loin, on le
   contourne d un pas, et trois d entre elles decalees font ralentir sans jamais
   couper un passage. C est le contraire d un goulot. */
function barriere(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h;
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#9a9690", 0.56);
  ctx.fillRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3);
  // LES BANDES, alternees et OBLIQUES : c est l obliquite qui dit « evite ».
  const n = Math.max(3, (L / 22) | 0);
  for (let i = 0; i < n; i++) {
    if ((i + s) & 1) continue;
    ctx.fillStyle = alpha("#c85e3e", 0.30);
    if (long) ctx.fillRect(-w / 2 + 2 + i * ((w - 4) / n), -h / 2 + 2, (w - 4) / n - 1, h - 4);
    else ctx.fillRect(-w / 2 + 2, -h / 2 + 2 + i * ((h - 4) / n), w - 4, (h - 4) / n - 1);
  }
  // le pied evase : un bloc de chicane n est pas un mur, il est POSE.
  ctx.strokeStyle = alpha("#000000", 0.22);
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
}

/* LA GUERITE — LA SEULE MASSE PLEINE DU POSTE, ET ELLE REGARDE. Une cabine, une
   vitre sur un seul cote, un toit qui deborde. Ce qui la fait lire est
   l ASYMETRIE : trois cotes aveugles et un vitre, donc elle a une direction, et
   c est vers la chicane. */
function guerite(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.62);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // LE TOIT QUI DEBORDE : une bande claire sur tout le pourtour.
  ctx.strokeStyle = alpha("#c8ccd2", 0.16);
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3);
  // LA VITRE, sur UN cote seulement — c est elle qui donne la direction.
  const cote = s & 3;
  ctx.fillStyle = alpha(PROP.verre, 0.24);
  if (cote === 0) ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.24);
  else if (cote === 1) ctx.fillRect(-w / 2 + 4, h / 2 - 4 - h * 0.24, w - 8, h * 0.24);
  else if (cote === 2) ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w * 0.24, h - 8);
  else ctx.fillRect(w / 2 - 4 - w * 0.24, -h / 2 + 4, w * 0.24, h - 8);
  ctx.fillStyle = alpha(S.emis, 0.18);
  ctx.fillRect(-2, -2, 4, 4);
}


/* LE BAC DE CULTURE — UN CADRE, ET ON VOIT LES PLANTS A TRAVERS. La meme
   mecanique que la claire-voie de l Usine au service de tout autre chose : on
   lit ce qui arrive derriere sans pouvoir tirer proprement. Ce qui pousse dedans
   est SEMI-OPAQUE et pousse VERS LA LUMIERE, donc les touffes sont plus denses
   d un cote — c est ce qui dit qu il y a un eclairage au-dessus. */
function bacCulture(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h;
  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LA CUVE, un liseré metallique franc : un bac est un objet FABRIQUE.
  ctx.strokeStyle = alpha("#c9ccd2", 0.28);
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  ctx.fillStyle = alpha("#1a2418", 0.42);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  // LES PLANTS, en rangs le long de l axe long, plus denses d un cote.
  const n = Math.max(4, (L / 16) | 0);
  for (let i = 0; i < n; i++) {
    const u = -L / 2 + (i + 0.5) * (L / n);
    const k = 0.5 + (i / n) * 0.5;
    const r = 2.4 + ((s >> (i % 11)) & 3) * 1.1;
    ctx.fillStyle = alpha(PROP.vert, 0.18 + k * 0.22);
    if (long) ctx.beginPath(), ctx.arc(u, (((s >> i) & 1) - 0.5) * h * 0.24, r, 0, Math.PI * 2), ctx.fill();
    else ctx.beginPath(), ctx.arc((((s >> i) & 1) - 0.5) * w * 0.24, u, r, 0, Math.PI * 2), ctx.fill();
  }
  // la buse d arrosage : un point clair, et c est la seule eau de la Nebuleuse.
  ctx.fillStyle = alpha(PROP.givre, 0.24);
  ctx.fillRect(long ? -L * 0.30 : -1.5, long ? -1.5 : -L * 0.30, 3, 3);
}

/* LE TORE — LA SEULE MASSE INTACTE ET REFERMEE DU THEME. Tout le reste de la
   Nebuleuse est casse : des aretes, des eclats, des poutres tordues. Un anneau
   n a pas d arete du tout, donc il se lit d une vue entiere sans qu on ait
   besoin d en voir le tour.
   L INTERIEUR N EST PAS UN TROU : la silhouette remplit son rectangle, la
   collision est une AABB, et un anneau creux ferait buter sur du vide. Ce qui
   dit l anneau est la BANDE claire, pas une absence. */
function tore(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.50);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  const rx = w * 0.36, ry = h * 0.36;
  ctx.strokeStyle = alpha("#c9ccd2", 0.22);
  ctx.lineWidth = Math.max(4, Math.min(w, h) * 0.13);
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  // LES SEGMENTS : un tore est boulonne par troncons, et c est l echelle.
  ctx.strokeStyle = alpha("#000000", 0.34);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + ((s & 3) * 0.2);
    ctx.moveTo(Math.cos(a) * rx * 0.78, Math.sin(a) * ry * 0.78);
    ctx.lineTo(Math.cos(a) * rx * 1.22, Math.sin(a) * ry * 1.22);
  }
  ctx.stroke();
  // le coeur, la seule chose chaude d un theme froid.
  ctx.fillStyle = alpha(S.emis, 0.20);
  ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.30, ry * 0.30, 0, 0, Math.PI * 2); ctx.fill();
}

/* LA PARABOLE — TOUT EST TOURNE DANS LE MEME SENS, ET C EST LA REGION QUI LE
   DIT. Le decalage du foyer donne l inclinaison ; toutes les paraboles d une
   cellule partagent la meme graine de cellule, donc elles ecoutent la meme
   chose. C est la seule orientation COMMUNE du depot. */
function paraboleSol(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const rx = w * 0.46, ry = h * 0.46;
  ctx.fillStyle = alpha("#000000", 0.42);
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  const dx = ((s & 3) / 3 - 0.5) * w * 0.22, dy = (((s >> 2) & 3) / 3 - 0.5) * h * 0.22;
  const g = ctx.createRadialGradient(dx, dy, 0, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, alpha("#dfe6ee", 0.30));
  g.addColorStop(0.65, alpha("#8c959f", 0.34));
  g.addColorStop(1, alpha("#2a2f36", 0.44));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.96, ry * 0.96, 0, 0, Math.PI * 2); ctx.fill();
  // LES NERVURES, radiales : sans elles c est une assiette.
  ctx.strokeStyle = alpha("#000000", 0.18);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * rx * 0.92, Math.sin(a) * ry * 0.92);
  }
  ctx.stroke();
  // LE FOYER, decale : c est lui qui donne le SENS d ecoute.
  ctx.fillStyle = alpha(PROP.balise, 0.30);
  ctx.beginPath(); ctx.arc(dx * 1.7, dy * 1.7, Math.min(rx, ry) * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha("#c9ccd2", 0.20);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dx * 1.7, dy * 1.7); ctx.stroke();
}


/* LE WAGON — UNE CAISSE SUR BOGIES, ET C EST LES BOGIES QUI LE DISENT. Sans eux
   c est un conteneur ; avec eux on comprend qu il etait sur une voie et qu il
   n en bougera plus. La porte coulissante, decentree, donne le sens. */
function wagon(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h, E = long ? h : w;
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.rouille, 0.50);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // LES BOGIES : deux masses sombres qui DEBORDENT sous la caisse.
  ctx.fillStyle = alpha("#15181c", 0.62);
  for (const u of [-0.30, 0.30]) {
    if (long) ctx.fillRect(L * u - L * 0.09, h / 2 - 4, L * 0.18, 5);
    else ctx.fillRect(w / 2 - 4, L * u - L * 0.09, 5, L * 0.18);
  }
  // LA PORTE, decentree : un wagon a un cote par lequel on charge.
  const d = ((s & 1) ? -1 : 1) * L * 0.12;
  ctx.strokeStyle = alpha("#000000", 0.36);
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (long) {
    ctx.moveTo(d - L * 0.16, -h / 2 + 3); ctx.lineTo(d - L * 0.16, h / 2 - 3);
    ctx.moveTo(d + L * 0.16, -h / 2 + 3); ctx.lineTo(d + L * 0.16, h / 2 - 3);
  } else {
    ctx.moveTo(-w / 2 + 3, d - L * 0.16); ctx.lineTo(w / 2 - 3, d - L * 0.16);
    ctx.moveTo(-w / 2 + 3, d + L * 0.16); ctx.lineTo(w / 2 - 3, d + L * 0.16);
  }
  ctx.stroke();
  // les nervures de caisse, regulieres : c est l echelle.
  ctx.strokeStyle = alpha("#000000", 0.16);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let u = -L / 2 + 8; u < L / 2 - 6; u += 9) {
    if (long) { ctx.moveTo(u, -h / 2 + 4); ctx.lineTo(u, h / 2 - 4); }
    else { ctx.moveTo(-w / 2 + 4, u); ctx.lineTo(w / 2 - 4, u); }
  }
  ctx.stroke();
}

/* LA BALLE COMPRESSEE — UN CUBE, ET C EST TOUT LE PROPOS. L effondrement produit
   des morceaux de toutes les tailles ; ici une machine a tout ramene au meme
   gabarit. Les fils de cerclage sont ce qui prouve la compression : sans eux
   c est un bloc, avec eux c est du dechet qu on a RANGE. */
function balle(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.42);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#4e4a42", 0.58);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // LE GRAIN : des eclats de couleur pris dans la masse — du plastique, du
  // papier, du metal, et c est ce qui dit que ce n est pas du beton.
  const teintes = ["#8a5a3a", "#3a5a6a", "#7a7a52", "#6a3a4a"];
  for (let i = 0; i < 22; i++) {
    const x = -w / 2 + 3 + ((s * (i + 7)) % 991) / 991 * (w - 6);
    const y = -h / 2 + 3 + ((s * (i + 19)) % 983) / 983 * (h - 6);
    ctx.fillStyle = alpha(teintes[(s + i) & 3], 0.20);
    ctx.fillRect(x, y, 2.4, 2);
  }
  // LES CERCLAGES : trois fils tendus, et c est eux qui font la balle.
  ctx.strokeStyle = alpha("#c8ccd2", 0.24);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const u = -w / 2 + (w / 4) * i;
    ctx.moveTo(u, -h / 2 + 1); ctx.lineTo(u, h / 2 - 1);
  }
  ctx.stroke();
}

/* LA FERME TOMBEE — UNE CHARPENTE VUE A PLAT, ET ON LIT LE VOLUME QUI N EXISTE
   PLUS. C est un treillis : deux membrures paralleles et des diagonales entre
   elles. La regularite des diagonales est ce qui la separe d une poutre — une
   poutre est pleine, une ferme est AJOUREE, et pourtant elle remplit son
   rectangle parce que la collision est une AABB. */
function fermeTombee(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h, E = long ? h : w;
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.metalDark, 0.34);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  ctx.strokeStyle = alpha(PROP.metal, 0.40);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (long) {
    ctx.moveTo(-w / 2 + 1, -h / 2 + 2); ctx.lineTo(w / 2 - 1, -h / 2 + 2);
    ctx.moveTo(-w / 2 + 1, h / 2 - 2); ctx.lineTo(w / 2 - 1, h / 2 - 2);
  } else {
    ctx.moveTo(-w / 2 + 2, -h / 2 + 1); ctx.lineTo(-w / 2 + 2, h / 2 - 1);
    ctx.moveTo(w / 2 - 2, -h / 2 + 1); ctx.lineTo(w / 2 - 2, h / 2 - 1);
  }
  ctx.stroke();
  // LES DIAGONALES, en zigzag : le treillis, et c est lui qu on reconnait.
  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const pas = Math.max(10, E * 0.9);
  let haut = (s & 1) === 0;
  for (let u = -L / 2 + 2; u < L / 2 - 2; u += pas) {
    const v = Math.min(u + pas, L / 2 - 2);
    if (long) {
      ctx.moveTo(u, haut ? -h / 2 + 3 : h / 2 - 3);
      ctx.lineTo(v, haut ? h / 2 - 3 : -h / 2 + 3);
    } else {
      ctx.moveTo(haut ? -w / 2 + 3 : w / 2 - 3, u);
      ctx.lineTo(haut ? w / 2 - 3 : -w / 2 + 3, v);
    }
    haut = !haut;
  }
  ctx.stroke();
}


/* LE RAYONNAGE DE GABARITS — DU BOIS, ET C EST LA SEULE MATIERE TIEDE DU THEME.
   Un modele de fonderie est taille dans du bois verni, range debout, et rien de
   tout ca ne brule : la couleur suffit a dire qu on est AVANT la coulee. Meme
   silhouette que le palettier du magasin, une autre matiere. */
function gabarit(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h;
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#6a4a2c", 0.46);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // LES MONTANTS, reguliers : une etagere se lit a ses appuis.
  ctx.fillStyle = alpha(PROP.metalDark, 0.52);
  for (let u = -L / 2 + 4; u < L / 2 - 2; u += 14) {
    if (long) ctx.fillRect(u, -h / 2, 3, h);
    else ctx.fillRect(-w / 2, u, w, 3);
  }
  // LES MODELES : des formes claires, chacune differente — c est un atelier de
  // piece unique, pas un stock.
  for (let i = 0; i < 5; i++) {
    const u = -L / 2 + 8 + i * (L - 14) / 5;
    const t = 3 + ((s >> (i * 2)) & 3) * 1.6;
    ctx.fillStyle = alpha("#c8a878", 0.24 + ((s >> i) & 1) * 0.10);
    if (long) ctx.fillRect(u, -h * 0.22, t, h * 0.44);
    else ctx.fillRect(-w * 0.22, u, w * 0.44, t);
  }
}

/* LA CABINE D EBARBAGE — FERMEE SUR TROIS COTES, OUVERTE SUR UN. Elle ne bloque
   pas un passage : elle CONTIENT ce qui gicle, et c est le seul objet du depot
   dont ce soit la fonction. L ouverture se lit parce que le quatrieme cote n a
   ni paroi ni liseré — juste le sol qui continue. */
function cabine(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const cote = s & 3;
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.44);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // LES TROIS PAROIS, epaisses ; la quatrieme est absente.
  ctx.fillStyle = alpha(PROP.metalDark, 0.60);
  if (cote !== 0) ctx.fillRect(-w / 2, -h / 2, w, 5);
  if (cote !== 1) ctx.fillRect(-w / 2, h / 2 - 5, w, 5);
  if (cote !== 2) ctx.fillRect(-w / 2, -h / 2, 5, h);
  if (cote !== 3) ctx.fillRect(w / 2 - 5, -h / 2, 5, h);
  // LE RIDEAU de lamelles, du cote ouvert : on entre, mais pas la lumiere.
  ctx.strokeStyle = alpha("#8a7a6a", 0.24);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const u = -0.4 + i * 0.16;
    if (cote === 0) { ctx.moveTo(-w / 2 + 4 + i * (w - 8) / 6, -h / 2 + 1); ctx.lineTo(-w / 2 + 4 + i * (w - 8) / 6, -h / 2 + 6); }
    else if (cote === 1) { ctx.moveTo(-w / 2 + 4 + i * (w - 8) / 6, h / 2 - 1); ctx.lineTo(-w / 2 + 4 + i * (w - 8) / 6, h / 2 - 6); }
    else if (cote === 2) { ctx.moveTo(-w / 2 + 1, -h / 2 + 4 + i * (h - 8) / 6); ctx.lineTo(-w / 2 + 6, -h / 2 + 4 + i * (h - 8) / 6); }
    else { ctx.moveTo(w / 2 - 1, -h / 2 + 4 + i * (h - 8) / 6); ctx.lineTo(w / 2 - 6, -h / 2 + 4 + i * (h - 8) / 6); }
  }
  ctx.stroke();
  // la gerbe : quelques eclats clairs au fond, et rien de plus — un telegraphe
  // aurait un debut et une echeance, ce canal appartient au boss.
  ctx.fillStyle = alpha(S.emis, 0.16);
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(((s >> (i + 3)) & 7) - 4, ((s >> (i + 5)) & 7) - 4, 2, 2);
  }
}

/* LA BRAME — UNE MASSE POSEE A PLAT, ET ELLE EST ENCORE TIEDE. Le parc a minerai
   est mou et sombre, celui-ci est CASSANT et clair : meme fonction, deux etats
   de la matiere, et la silhouette le dit — un tas n a pas d arete, une pile n a
   que ca. Le degrade de chaleur va du coeur vers le bord, parce qu une brame
   refroidit par les cotes. */
function brame(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h;
  ctx.fillStyle = alpha("#000000", 0.46);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  const g = ctx.createLinearGradient(long ? -w / 2 : 0, long ? 0 : -h / 2,
                                     long ? w / 2 : 0, long ? 0 : h / 2);
  g.addColorStop(0, alpha("#3a3630", 0.62));
  g.addColorStop(0.5, alpha("#5a4a3a", 0.58));
  g.addColorStop(1, alpha("#3a3630", 0.62));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // LES TRANCHES : trois ou quatre brames empilees, chacune son arete claire.
  const n = 3 + (s & 1);
  ctx.strokeStyle = alpha("#a89880", 0.24);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 1; i < n; i++) {
    const u = -1 + (2 / n) * i;
    if (long) { ctx.moveTo(-w / 2 + 3, u * h / 2 * 0.9); ctx.lineTo(w / 2 - 3, u * h / 2 * 0.9); }
    else { ctx.moveTo(u * w / 2 * 0.9, -h / 2 + 3); ctx.lineTo(u * w / 2 * 0.9, h / 2 - 3); }
  }
  ctx.stroke();
  // la CHALEUR restante, au coeur seulement : elle part par les cotes.
  ctx.fillStyle = alpha(S.emis, 0.10 + (s & 3) * 0.02);
  ctx.fillRect(-w * 0.18, -h * 0.18, w * 0.36, h * 0.36);
}


/* LA BENNE — UN CAISSON OUVERT, ET ON VOIT CE QU IL Y A DEDANS. Tout le reste du
   theme est ferme ; celle-ci montre son contenu, et c est ce qui dit qu on est
   dehors et qu on jette. Les crochets de levage debordent du bord haut : sans
   eux c est une caisse, avec eux on sait qu un camion viendra la prendre. */
function benne(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h;
  ctx.fillStyle = alpha("#000000", 0.42);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.rouille, 0.44);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // L INTERIEUR, plus sombre et plus bas : c est ce creux qui fait la benne.
  ctx.fillStyle = alpha("#0e1013", 0.50);
  ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
  // LE CONTENU : des morceaux clairs qui DEPASSENT du bord — jamais ras.
  for (let i = 0; i < 7; i++) {
    const x = -w / 2 + 6 + ((s * (i + 5)) % 991) / 991 * (w - 12);
    const y = -h / 2 + 6 + ((s * (i + 13)) % 983) / 983 * (h - 12);
    ctx.fillStyle = alpha(((s >> i) & 1) ? "#6a6258" : "#8a7a5a", 0.30);
    ctx.fillRect(x, y, 4 + ((s >> i) & 3), 3 + ((s >> (i + 2)) & 3));
  }
  // LES CROCHETS, sur l axe long : c est par la qu on la souleve.
  ctx.strokeStyle = alpha(PROP.metal, 0.40);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (const u of [-0.28, 0.28]) {
    if (long) { ctx.moveTo(L * u, -h / 2 - 2); ctx.lineTo(L * u, -h / 2 + 4); }
    else { ctx.moveTo(-w / 2 - 2, L * u); ctx.lineTo(-w / 2 + 4, L * u); }
  }
  ctx.stroke();
}

/* LA CHAUDIERE — LE MEME OCTOGONE QUE LE FOUR DE LA FONDERIE, une autre matiere.
   Ce qui contient une combustion n a pas de coin, quel que soit le theme. Ce qui
   la separe du four est la BRIQUE : un four est en tole, une chaudiere est
   maconnee, et c est le seul appareil de l Usine qu on ait bati au lieu de
   boulonner. Le regard de flamme est minuscule et il ne clignote pas. */
function chaudiere(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.46);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.brique, 0.54);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // L APPAREILLAGE DE BRIQUE : des rangs decales, et c est ce qu on reconnait.
  ctx.strokeStyle = alpha("#000000", 0.20);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = -h / 2 + 6; y < h / 2 - 2; y += 6) {
    ctx.moveTo(-w / 2 + 2, y); ctx.lineTo(w / 2 - 2, y);
  }
  ctx.stroke();
  ctx.strokeStyle = alpha("#000000", 0.14);
  ctx.beginPath();
  let dec = 0;
  for (let y = -h / 2 + 6; y < h / 2 - 2; y += 6) {
    for (let x = -w / 2 + 4 + (dec ? 7 : 0); x < w / 2 - 2; x += 14) {
      ctx.moveTo(x, y); ctx.lineTo(x, y + 6);
    }
    dec ^= 1;
  }
  ctx.stroke();
  // LE CERCLAGE metallique : une chaudiere est frettee.
  ctx.strokeStyle = alpha(PROP.metalDark, 0.44);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, -h * 0.22); ctx.lineTo(w / 2 - 2, -h * 0.22);
  ctx.moveTo(-w / 2 + 2, h * 0.26); ctx.lineTo(w / 2 - 2, h * 0.26);
  ctx.stroke();
  // LE REGARD DE FLAMME, minuscule, et il ne clignote pas.
  ctx.fillStyle = alpha(S.emis, 0.34);
  ctx.beginPath(); ctx.arc(0, h * 0.04, Math.min(w, h) * 0.07, 0, Math.PI * 2); ctx.fill();
}

/* LA BORNE DE CHARGE — A HAUTEUR DE GENOU, ET C EST LA SEULE DU THEME. Tout
   l Usine est vertical : des machines, des racks, des poteaux. Une borne est
   BASSE et son cable traine au sol vers l engin absent — c est le cable qui dit
   qu il manque quelque chose ici, et c est tout le propos de la region. */
function chargeur(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.36);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.metal, 0.40);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // LE BANDEAU de facade, plus clair : une borne a une face avant.
  ctx.fillStyle = alpha("#c8ccd2", 0.14);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.30);
  // LE CABLE, enroule puis lache au sol : il SORT de la boite.
  ctx.strokeStyle = alpha("#15181c", 0.50);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const d = (s & 1) ? 1 : -1;
  ctx.moveTo(d * w * 0.30, h * 0.10);
  ctx.quadraticCurveTo(d * w * 0.80, h * 0.28, d * w * 0.46, h * 0.46);
  ctx.stroke();
  // les deux voyants d etat, l un allume, l autre non.
  ctx.fillStyle = alpha(S.emis, 0.30);
  ctx.fillRect(-w * 0.18, h * 0.04, 2.5, 2.5);
  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.fillRect(w * 0.06, h * 0.04, 2.5, 2.5);
}


/* LA FONTAINE — LE TROISIEME CREUX DU DEPOT, ET LE SEUL QUI SOIT PLEIN. La fosse
   du puits et le bac du traitement sont des vides ; celle-ci contient de l eau,
   donc elle RENVOIE le ciel au lieu de l avaler. Deux passes : la margelle en
   relief, la nappe en creux — et c est la margelle qui dit qu on ne tombe pas
   dedans par accident. */
function fontaine(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  // LA MARGELLE, claire et epaisse : le seul bord franc de la region.
  ctx.fillStyle = alpha("#8a8478", 0.50);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
  // LA NAPPE : un degrade froid, plus clair au centre — c est un reflet, pas
  // une profondeur.
  const g = ctx.createRadialGradient(-w * 0.12, -h * 0.14, 0, 0, 0, Math.max(w, h) * 0.5);
  g.addColorStop(0, alpha("#8fb4c8", 0.30));
  g.addColorStop(1, alpha("#22343e", 0.40));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);
  // LES RIDES, concentriques et immobiles : deux traits, pas une animation.
  ctx.strokeStyle = alpha("#cfe0ea", 0.14);
  ctx.lineWidth = 1.2;
  for (const k of [0.34, 0.56]) {
    ctx.beginPath();
    ctx.ellipse(-w * 0.06, -h * 0.06, w * k * 0.5, h * k * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // le depot de sels sur la margelle, du cote ou l eau a debordé.
  ctx.fillStyle = alpha("#d8cfae", 0.10 + (s & 3) * 0.02);
  ctx.fillRect(-w / 2 + 2, h / 2 - 5, w - 4, 3);
}

/* LE MUR DE SOUTENEMENT — IL RETIENT LA TERRE, DONC IL A UN COTE PLEIN ET UN
   COTE VIDE. Les contreforts sont du cote qu il retient : ils donnent la
   DIRECTION de la pente, et c est la seule information de ce genre du depot.
   Bas et long : on voit par-dessus, ce n est pas un couloir. */
function soutenement(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h;
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#6a675e", 0.56);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // L APPAREILLAGE : de gros moellons, decales, et c est ce qui le separe d une
  // banche — un mur de soutenement est MACONNE, pas coule.
  ctx.strokeStyle = alpha("#000000", 0.22);
  ctx.lineWidth = 1;
  ctx.beginPath();
  let dec = 0;
  for (let u = -L / 2 + 10; u < L / 2 - 4; u += 20) {
    if (long) { ctx.moveTo(u + (dec ? 10 : 0), -h / 2 + 1); ctx.lineTo(u + (dec ? 10 : 0), h / 2 - 1); }
    else { ctx.moveTo(-w / 2 + 1, u + (dec ? 10 : 0)); ctx.lineTo(w / 2 - 1, u + (dec ? 10 : 0)); }
    dec ^= 1;
  }
  ctx.stroke();
  // LES CONTREFORTS, d un seul cote : ils disent ce que le mur retient.
  const d = (s & 1) ? 1 : -1;
  ctx.fillStyle = alpha("#4a473e", 0.60);
  for (let u = -L / 2 + 14; u < L / 2 - 8; u += 34) {
    if (long) ctx.fillRect(u, d > 0 ? h / 2 - 4 : -h / 2, 8, 4);
    else ctx.fillRect(d > 0 ? w / 2 - 4 : -w / 2, u, 4, 8);
  }
  // la barbacane : un point sombre, et la coulee qui en part est une TRACE.
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(long ? -L * 0.18 : -2, long ? -2 : -L * 0.18, 4, 4);
}

/* LA BITTE D AMARRAGE — LA PLUS PETITE MASSE DU DEPOT, ET ELLE PORTE LE SENS DE
   TOUTE UNE REGION. Un champignon de fonte : large en haut, etrangle au pied.
   Alignees, elles disent qu il y a de l eau derriere, et c est la seule fois du
   jeu ou le hors-champ soit une information. */
function bitte(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const r = Math.min(w, h) * 0.44;
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.beginPath(); ctx.ellipse(0, h * 0.10, r * 1.05, r * 0.80, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha("#3a3a36", 0.66);
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha("#8a8880", 0.24);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(0, -h * 0.06, r * 0.62, r * 0.50, 0, 0, Math.PI * 2); ctx.stroke();
  // L AUSSIERE, quand il y en a une : un trait epais qui sort du cadre.
  if (s & 1) {
    ctx.strokeStyle = alpha("#6a6252", 0.34);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(w * 0.5, h * 0.3, w * 0.5, h * 0.5);
    ctx.stroke();
  }
}

/* LA BANQUE D ACCUEIL — LARGE, BASSE, ET ELLE A UN DEVANT. Le plateau deborde
   du cote du public et pas de l autre : on lit de quel cote on est cense se
   tenir, et c est tout ce qu il faut pour qu un hall se lise comme un hall.
   Quatrieme matiere du conteneur, apres la caisse, la carrosserie et le wagon. */
function banque(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h;
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#4a4640", 0.52);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // LE PLATEAU, plus clair, decale vers le public.
  const d = (s & 1) ? 1 : -1;
  ctx.fillStyle = alpha("#c8bfa8", 0.24);
  if (long) ctx.fillRect(-w / 2 + 2, d > 0 ? -h / 2 + 2 : h / 2 - 8, w - 4, 6);
  else ctx.fillRect(d > 0 ? -w / 2 + 2 : w / 2 - 8, -h / 2 + 2, 6, h - 4);
  // LE BANDEAU LUMINEUX au nu du sol : un hall se signale, il ne crie pas.
  ctx.fillStyle = alpha(S.emis, 0.16);
  if (long) ctx.fillRect(-w / 2 + 6, d > 0 ? h / 2 - 4 : -h / 2 + 2, w - 12, 2);
  else ctx.fillRect(d > 0 ? w / 2 - 4 : -w / 2 + 2, -h / 2 + 6, 2, h - 12);
  ctx.strokeStyle = alpha("#000000", 0.24);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3);
}


/* LE COLIS ARRIME — DES SANGLES, ET C EST TOUT CE QUI LE SEPARE D UNE CAISSE.
   Deux bandes croisees en travers de la boite, tendues vers un rail hors du
   cadre : dans un theme ou tout derive, ce qui est ATTACHE se remarque. */
function arrimage(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.54);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  ctx.strokeStyle = alpha("#000000", 0.22);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
  // LES SANGLES : plus claires que tout le reste, et elles DEBORDENT du bloc.
  ctx.strokeStyle = alpha("#c8b880", 0.34);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w / 2 - 3, -h * 0.18); ctx.lineTo(w / 2 + 3, -h * 0.18);
  ctx.moveTo(-w * 0.16, -h / 2 - 3); ctx.lineTo(-w * 0.16, h / 2 + 3);
  ctx.stroke();
  // les boucles de tension, sur une sangle seulement.
  ctx.fillStyle = alpha(PROP.metalDark, 0.56);
  ctx.fillRect(w * 0.22 - 3, -h * 0.18 - 3, 6, 6);
  ctx.fillStyle = alpha(S.emis, 0.12 + (s & 3) * 0.02);
  ctx.fillRect(-w / 2 + 4, h / 2 - 6, 4, 2);
}

/* LA NAVETTE — LA SEULE COQUE INTACTE DU THEME, ET ELLE EST POSEE. Toutes les
   autres sont crevees. Un fuselage, deux ailerons, une verriere a l avant : la
   verriere donne le SENS, et c est elle qui empeche de la lire comme une epave.
   Elle est sur berceaux, donc legerement decollee du sol — l ombre porte plus
   loin que la coque, et c est ce qui dit qu elle ne repose pas dessus. */
function navette(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h, E = long ? h : w;
  ctx.fillStyle = alpha("#000000", 0.42);
  ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
  ctx.fillStyle = alpha("#b9c2cc", 0.44);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  const d = (s & 1) ? 1 : -1;
  // LA VERRIERE, a une extremite : elle donne le sens.
  ctx.fillStyle = alpha("#1c2a34", 0.54);
  if (long) ctx.fillRect(d > 0 ? w / 2 - 4 - L * 0.18 : -w / 2 + 4, -h / 2 + 5, L * 0.18, h - 10);
  else ctx.fillRect(-w / 2 + 5, d > 0 ? h / 2 - 4 - L * 0.18 : -h / 2 + 4, w - 10, L * 0.18);
  // LES AILERONS : deux triangles sombres au tiers arriere.
  ctx.fillStyle = alpha("#6a737d", 0.50);
  for (const k of [-1, 1]) {
    ctx.beginPath();
    if (long) {
      ctx.moveTo(-d * L * 0.18, k * h / 2);
      ctx.lineTo(-d * L * 0.40, k * h / 2);
      ctx.lineTo(-d * L * 0.30, k * h * 0.24);
    } else {
      ctx.moveTo(k * w / 2, -d * L * 0.18);
      ctx.lineTo(k * w / 2, -d * L * 0.40);
      ctx.lineTo(k * w * 0.24, -d * L * 0.30);
    }
    ctx.closePath(); ctx.fill();
  }
  // la couture de fuselage, une seule, dans l axe.
  ctx.strokeStyle = alpha("#000000", 0.20);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (long) { ctx.moveTo(-w / 2 + 4, 0); ctx.lineTo(w / 2 - 4, 0); }
  else { ctx.moveTo(0, -h / 2 + 4); ctx.lineTo(0, h / 2 - 4); }
  ctx.stroke();
}

/* L ECHANGEUR — UN FAISCEAU, ET IL A DEUX FACES. Du givre du cote froid, du
   condensat de l autre : c est le seul objet du depot dont les deux longs cotes
   ne disent pas la meme chose. Les ailettes sont serrees et regulieres — sans
   elles, c est un tuyau. */
function echangeur(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h, E = long ? h : w;
  ctx.fillStyle = alpha("#000000", 0.38);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#6f7a84", 0.48);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // LES AILETTES, serrees : c est le seul rythme fin du theme.
  ctx.strokeStyle = alpha("#000000", 0.22);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let u = -L / 2 + 3; u < L / 2 - 1; u += 5) {
    if (long) { ctx.moveTo(u, -h / 2 + 2); ctx.lineTo(u, h / 2 - 2); }
    else { ctx.moveTo(-w / 2 + 2, u); ctx.lineTo(w / 2 - 2, u); }
  }
  ctx.stroke();
  // LE GIVRE d un cote, LE CONDENSAT de l autre : deux faces, deux etats.
  ctx.fillStyle = alpha(PROP.givre, 0.20);
  if (long) ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, Math.max(2, E * 0.22));
  else ctx.fillRect(-w / 2 + 1, -h / 2 + 1, Math.max(2, E * 0.22), h - 2);
  ctx.fillStyle = alpha("#8fb4c8", 0.14 + (s & 3) * 0.02);
  if (long) ctx.fillRect(-w / 2 + 1, h / 2 - 1 - Math.max(2, E * 0.18), w - 2, Math.max(2, E * 0.18));
  else ctx.fillRect(w / 2 - 1 - Math.max(2, E * 0.18), -h / 2 + 1, Math.max(2, E * 0.18), h - 2);
}

/* LA FOREUSE — PLANTEE, ET C EST LE SEUL OBJET DU DEPOT QUI ENTRE DANS LE SOL.
   Un mat, un collier, et le cone de debris qu elle a remonte autour de son pied.
   C est le cone qui fait la difference : sans lui c est un pylone, avec lui on
   comprend qu elle CREUSE. */
function foreuse(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h, E = long ? h : w;
  // LE CONE DE DEBRIS, au pied et plus large que le mat.
  ctx.fillStyle = alpha("#4a443c", 0.36);
  ctx.beginPath();
  ctx.ellipse(0, long ? 0 : L * 0.34, long ? L * 0.20 : E * 1.6, long ? E * 1.6 : L * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.metalDark, 0.58);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // LES COLLIERS, reguliers : un mat de forage est assemble par troncons.
  ctx.strokeStyle = alpha(PROP.metal, 0.30);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let u = -L / 2 + 8; u < L / 2 - 4; u += 12) {
    if (long) { ctx.moveTo(u, -h / 2); ctx.lineTo(u, h / 2); }
    else { ctx.moveTo(-w / 2, u); ctx.lineTo(w / 2, u); }
  }
  ctx.stroke();
  // la tete, a l extremite qui entre : plus large, et elle est claire.
  ctx.fillStyle = alpha("#a8a49c", 0.34);
  const d = (s & 1) ? 1 : -1;
  if (long) ctx.fillRect(d > 0 ? w / 2 - 5 : -w / 2 + 1, -h / 2 - 1, 4, h + 2);
  else ctx.fillRect(-w / 2 - 1, d > 0 ? h / 2 - 5 : -h / 2 + 1, w + 2, 4);
}


/* LE SILO — LA SEULE VERTICALE DE LA FONDERIE, ET ELLE SE LIT A SA COIFFE. Vu de
   dessus un cylindre n est qu un disque ; ce qui dit la hauteur est l anneau de
   passerelle qui le ceinture et l ombre portee plus longue que les autres. Le
   cone de vidange au pied, decentre, donne le cote par lequel on soutire. */
function silo(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const rx = w * 0.46, ry = h * 0.46;
  ctx.fillStyle = alpha("#000000", 0.48);
  ctx.beginPath(); ctx.ellipse(w * 0.05, h * 0.07, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(-rx, 0, rx, 0);
  g.addColorStop(0, alpha("#8a8f96", 0.52));
  g.addColorStop(0.45, alpha("#666c74", 0.56));
  g.addColorStop(1, alpha("#2e3238", 0.58));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  // L ANNEAU DE PASSERELLE : c est lui qui dit qu on est haut.
  ctx.strokeStyle = alpha(PROP.metalDark, 0.48);
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.84, ry * 0.84, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = alpha("#000000", 0.20);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.moveTo(Math.cos(a) * rx * 0.84, Math.sin(a) * ry * 0.84);
    ctx.lineTo(Math.cos(a) * rx, Math.sin(a) * ry);
  }
  ctx.stroke();
  // LE CONE DE VIDANGE, decentre : le cote par lequel on soutire.
  const d = (s & 3) / 3 - 0.5;
  ctx.fillStyle = alpha("#20242a", 0.50);
  ctx.beginPath(); ctx.ellipse(d * rx * 0.7, d * ry * 0.7, rx * 0.26, ry * 0.26, 0, 0, Math.PI * 2); ctx.fill();
}

/* LA CRASSE — LA MEME MASSE MOLLE QUE LE TAS DE MINERAI, ET C EST LA COULEUR QUI
   LES SEPARE. Le minerai est rouge et mat, la scorie refroidie est GRISE et
   VITREUSE : elle accroche des points de lumiere que rien d autre du theme ne
   fait. Deux bouts de la meme chaine, une silhouette, deux matieres. */
function crasse(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const g = ctx.createRadialGradient(-w * 0.12, -h * 0.16, 0, 0, 0, Math.max(w, h) * 0.55);
  g.addColorStop(0, alpha("#7a7c80", 0.60));
  g.addColorStop(0.55, alpha("#4a4c50", 0.62));
  g.addColorStop(1, alpha("#232528", 0.60));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LE GRAIN vitreux : des eclats CLAIRS a aretes, pas des points ronds.
  for (let i = 0; i < 60; i++) {
    const a = ((s * (i + 3)) % 997) / 997 * Math.PI * 2;
    const d = Math.sqrt(((s * (i + 11)) % 991) / 991) * 0.46;
    const x = Math.cos(a) * w * d, y = Math.sin(a) * h * d;
    ctx.fillStyle = alpha((i & 3) === 0 ? "#cfd6dc" : "#000000", 0.10 + ((s >> (i % 7)) & 3) * 0.03);
    ctx.fillRect(x, y, 1.8, 1.4);
  }
  // la CRETE, un trait clair : un crassier a une pente, comme un tas.
  ctx.strokeStyle = alpha("#9aa2aa", 0.18);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, h * 0.06, Math.min(w, h) * 0.26, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

/* LA PAILLASSE — BASSE, LONGUE, ET SON PLATEAU EST CLAIR. C est le seul meuble
   de la Fonderie dont la face superieure soit plus claire que son socle : tout
   le reste du theme est sombre et chaud. Les eprouvettes alignees dessus font
   un rythme fin que rien d autre du lieu ne porte. */
function paillasse(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h, L = long ? w : h;
  ctx.fillStyle = alpha("#000000", 0.38);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#3e4348", 0.52);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // LE PLATEAU, clair, decale d un cote : une paillasse a une face de travail.
  const d = (s & 1) ? 1 : -1;
  ctx.fillStyle = alpha("#cfd2cc", 0.26);
  if (long) ctx.fillRect(-w / 2 + 2, d > 0 ? -h / 2 + 2 : h / 2 - 7, w - 4, 5);
  else ctx.fillRect(d > 0 ? -w / 2 + 2 : w / 2 - 7, -h / 2 + 2, 5, h - 4);
  // LES EPROUVETTES : un rythme fin, et c est le seul du theme.
  ctx.fillStyle = alpha(PROP.verre, 0.30);
  for (let u = -L / 2 + 6; u < L / 2 - 4; u += 7) {
    if (long) ctx.fillRect(u, d > 0 ? -h / 2 + 3 : h / 2 - 6, 2, 3);
    else ctx.fillRect(d > 0 ? -w / 2 + 3 : w / 2 - 6, u, 3, 2);
  }
  // le bandeau d eclairage sous le plateau : une lumiere qui ne vacille pas.
  ctx.fillStyle = alpha("#e8eef4", 0.10);
  if (long) ctx.fillRect(-w / 2 + 4, d > 0 ? h / 2 - 4 : -h / 2 + 2, w - 8, 2);
  else ctx.fillRect(d > 0 ? w / 2 - 4 : -w / 2 + 2, -h / 2 + 4, 2, h - 8);
}


/* LE CHAPELET D ISOLATEURS — DES DISQUES EMPILES, ET C EST LE SEUL RYTHME
   VERTICAL DE LA FRICHE. Vu de dessus : une pile d anneaux concentriques de plus
   en plus larges, et le brin de cable qui part en oblique. La porcelaine est
   CLAIRE et propre — c est la seule chose du theme que le temps n a pas salie,
   parce que rien n adhere sur du verre. */
function isolateur(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const r = Math.min(w, h) * 0.46;
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.metalDark, 0.50);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // LES JUPES : des anneaux de plus en plus larges vers le bas.
  const long = w >= h, L = long ? w : h;
  const n = Math.max(3, (L / 9) | 0);
  for (let i = 0; i < n; i++) {
    const u = -L / 2 + 4 + i * (L - 8) / n;
    const k = 0.55 + (i / n) * 0.45;
    ctx.strokeStyle = alpha("#d8dce0", 0.24);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (long) ctx.ellipse(u, 0, 2, r * k, 0, 0, Math.PI * 2);
    else ctx.ellipse(0, u, r * k, 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // LE BRIN, en oblique : il part vers un pylone qu on ne voit pas.
  ctx.strokeStyle = alpha("#15181c", 0.40);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(long ? L / 2 - 2 : 0, long ? 0 : L / 2 - 2);
  ctx.lineTo(long ? L / 2 + 8 : ((s & 1) ? 9 : -9), long ? ((s & 1) ? 9 : -9) : L / 2 + 8);
  ctx.stroke();
}

/* LA POMPE — UN VOLUCOMPTEUR ET SON PISTOLET AU BOUT DU FLEXIBLE. Le flexible
   traine au sol, decroche, et c est lui qui dit que la station a ete abandonnee
   en service plutot que fermee proprement. La face avant est plus claire : un
   afficheur mort. */
function pompe(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#7a5a4a", 0.50);
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // L AFFICHEUR : une plaque claire, morte.
  ctx.fillStyle = alpha("#c8ccd2", 0.20);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.26);
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h * 0.14);
  // LE FLEXIBLE, decroche et traine : il SORT du bloc.
  const d = (s & 1) ? 1 : -1;
  ctx.strokeStyle = alpha("#1a1a1c", 0.46);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(d * w * 0.34, -h * 0.06);
  ctx.quadraticCurveTo(d * w * 0.80, h * 0.20, d * w * 0.52, h * 0.52);
  ctx.stroke();
  // le socle, plus large : un ilot de pompe est monte sur un massif.
  ctx.strokeStyle = alpha("#000000", 0.26);
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 0.5, h / 2 - 5, w - 1, 4);
}

/* LE BASSIN DE DECANTATION — UN CREUX SEC, ET C EST LE PREMIER DE LA FRICHE. La
   fosse du puits est noire, le bac du traitement est plein, la fontaine du parc
   renvoie le ciel ; celui-ci est VIDE et son fond est craquele. Ce qui repousse
   dedans pousse mieux qu ailleurs, parce qu il y reste de l humidite — c est la
   seule vegetation du depot qui soit un INDICE. */
function decanteur(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  // LA MARGELLE, mince : un bassin technique n a pas de bord confortable.
  ctx.fillStyle = alpha("#5a564e", 0.46);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
  ctx.fillStyle = alpha("#3e3a32", 0.50);
  ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
  // LE FOND CRAQUELE : des traits courts, sans direction commune.
  ctx.strokeStyle = alpha("#000000", 0.26);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const x = -w / 2 + 6 + ((s * (i + 7)) % 991) / 991 * (w - 12);
    const y = -h / 2 + 6 + ((s * (i + 19)) % 983) / 983 * (h - 12);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5 - ((s >> i) & 7), y + 4 - ((s >> (i + 2)) & 5));
  }
  ctx.stroke();
  // CE QUI REPOUSSE AU FOND, plus dense qu ailleurs : l humidite est restee.
  for (let i = 0; i < 9; i++) {
    const x = -w / 2 + 8 + ((s * (i + 11)) % 977) / 977 * (w - 16);
    const y = -h / 2 + 8 + ((s * (i + 23)) % 971) / 971 * (h - 16);
    ctx.fillStyle = alpha(PROP.vert, 0.16 + ((s >> i) & 3) * 0.04);
    ctx.beginPath(); ctx.arc(x, y, 2.4 + ((s >> (i + 1)) & 3), 0, Math.PI * 2); ctx.fill();
  }
}

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


/* LE MUR AVEUGLE — LA SEULE FAMILLE DU SECTEUR QUI N EMETTE PAS. Dans le seul
   lieu ou neuf blocs sur dix sont de la signaletique, ce qui reste noir est ce
   qui se remarque. Pas de vitrine, pas d enseigne : de la maconnerie, une porte
   de service, et ce que les gens ont ecrit dessus. */
function aveugle(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h;
  ctx.fillStyle = alpha("#000000", 0.52);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.brique, 0.34);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // L APPAREIL de maconnerie : des joints decales d une assise a l autre.
  ctx.strokeStyle = alpha("#000000", 0.22);
  ctx.lineWidth = 1;
  ctx.beginPath();
  const L = long ? w : h, E = long ? h : w;
  const assises = Math.max(2, Math.round(E / 9));
  for (let a = 1; a < assises; a++) {
    const d = -E / 2 + (E / assises) * a;
    if (long) { ctx.moveTo(-w / 2 + 2, d); ctx.lineTo(w / 2 - 2, d); }
    else { ctx.moveTo(d, -h / 2 + 2); ctx.lineTo(d, h / 2 - 2); }
  }
  for (let a = 0; a < assises; a++) {
    const d0 = -E / 2 + (E / assises) * a, d1 = d0 + E / assises;
    for (let u = -L / 2 + ((a & 1) ? 9 : 0); u < L / 2; u += 18) {
      if (long) { ctx.moveTo(u, d0); ctx.lineTo(u, d1); }
      else { ctx.moveTo(d0, u); ctx.lineTo(d1, u); }
    }
  }
  ctx.stroke();
  // LA PORTE DE SERVICE, une seule, et son applique au-dessus : l unique
  // source de la region, et elle est jaune sale, pas magenta.
  const px = -L / 2 + L * (0.28 + ((s & 3) * 0.14));
  ctx.fillStyle = alpha("#000000", 0.44);
  if (long) ctx.fillRect(px - 7, -h / 2 + 3, 14, h - 6);
  else ctx.fillRect(-w / 2 + 3, px - 7, w - 6, 14);
  ctx.fillStyle = alpha(PROP.led, 0.28);
  if (long) ctx.fillRect(px - 3, -h / 2 + 1, 6, 2);
  else ctx.fillRect(-w / 2 + 1, px - 3, 2, 6);
  // LES TAGS : deux traits satures, seule couleur vive d une region noire.
  ctx.strokeStyle = alpha("#ff3d9a", 0.14);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const tx = -L / 2 + L * 0.66;
  if (long) { ctx.moveTo(tx, -h / 2 + 5); ctx.lineTo(tx + 12, h / 2 - 5); ctx.moveTo(tx + 12, -h / 2 + 5); ctx.lineTo(tx, h / 2 - 5); }
  else { ctx.moveTo(-w / 2 + 5, tx); ctx.lineTo(w / 2 - 5, tx + 12); ctx.moveTo(-w / 2 + 5, tx + 12); ctx.lineTo(w / 2 - 5, tx); }
  ctx.stroke();
}

/* L ESCALIER DE SECOURS — DES MARCHES, DONC DES LIGNES REGULIERES ET SERREES.
   Vu de dessus il n a pas de volume : c est un PEIGNE de traits clairs sur une
   ombre, et c est exactement ce qui le distingue d une caisse. */
function escalier(o, S) {
  const w = o.w, h = o.h;
  const vert = h >= w;
  ctx.fillStyle = alpha("#000000", 0.50);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.34);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  ctx.strokeStyle = alpha(S.blocEdge, 0.34);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const L = vert ? h : w;
  for (let u = -L / 2 + 4; u < L / 2 - 2; u += 5) {
    if (vert) { ctx.moveTo(-w / 2 + 3, u); ctx.lineTo(w / 2 - 3, u); }
    else { ctx.moveTo(u, -h / 2 + 3); ctx.lineTo(u, h / 2 - 3); }
  }
  ctx.stroke();
  // LE LIMON, un trait plein d un seul cote : l escalier est ACCROCHE au mur.
  ctx.fillStyle = alpha(S.blocEdge, 0.30);
  if (vert) ctx.fillRect(-w / 2 + 1, -h / 2 + 2, 2.5, h - 4);
  else ctx.fillRect(-w / 2 + 2, -h / 2 + 1, w - 4, 2.5);
}

/* LE MONOLITHE — LE SEUL OBJET DU DEPOT SANS AUCUN DETAIL. Pas de joint, pas de
   liseré, pas de voyant : une masse, son ombre portee et un reflet. Dans un lieu
   ou tout est une surface qui vend, ce qui ne dit RIEN est ce qui impressionne
   le plus, et c est la seule facon de dessiner « corporatif ». */
function monolithe(o, S) {
  const w = o.w, h = o.h;
  ctx.fillStyle = alpha("#000000", 0.58);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.42);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // UN SEUL reflet, vertical, tres doux : la pierre est polie et rien d autre
  // ne se lit dessus.
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, alpha("#ffffff", 0));
  g.addColorStop(0.42, alpha("#ffffff", 0.07));
  g.addColorStop(0.52, alpha("#ffffff", 0.02));
  g.addColorStop(1, alpha("#ffffff", 0));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // une arete claire sur UN cote, et c est tout : le volume tient a ca.
  ctx.fillStyle = alpha(S.blocEdge, 0.16);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, 2, h - 4);
}

/* L ETAL — UNE TABLE SOUS UNE BACHE. C est ce que « marche » promettait et que
   des conteneurs ne pouvaient pas dire. La bache DEBORDE de la table, elle est
   la seule chose du depot qui ait des plis, et le contraste entre son ampleur et
   la petitesse de l etal est la signature de la region. */
function etal(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h;
  // LA BACHE : un ton chaud et desature, pose au-dessus du plateau.
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(PROP.peint, 0.30 + ((s & 3) * 0.03));
  ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // LES PLIS, des ombres paralleles irregulieres : rien d autre n en a.
  ctx.strokeStyle = alpha("#000000", 0.20);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const L = long ? w : h;
  for (let i = 0; i < 4; i++) {
    const u = -L / 2 + L * (0.18 + i * 0.22) + ((s >> i) & 1);
    if (long) { ctx.moveTo(u, -h / 2 + 1); ctx.lineTo(u + 2, h / 2 - 1); }
    else { ctx.moveTo(-w / 2 + 1, u); ctx.lineTo(w / 2 - 1, u + 2); }
  }
  ctx.stroke();
  // LE PLATEAU visible sous l auvent, plus sombre, et la marchandise dessus.
  const pw = w * 0.66, ph = h * 0.44;
  ctx.fillStyle = alpha("#000000", 0.30);
  ctx.fillRect(-pw / 2, h / 2 - 2 - ph, pw, ph);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = alpha(((s >> i) & 1) ? PROP.vert : PROP.rouille, 0.30);
    ctx.fillRect(-pw / 2 + 2 + i * (pw / 4), h / 2 - ph, Math.max(2, pw / 6), Math.max(2, ph * 0.5));
  }
  // LA GUIRLANDE, deux points chauds : la seule lumiere basse du Secteur.
  ctx.fillStyle = alpha(PROP.led, 0.34);
  ctx.fillRect(-w / 2 + w * 0.24, -h / 2 + 1, 2, 2);
  ctx.fillRect(-w / 2 + w * 0.68, -h / 2 + 1, 2, 2);
}


/* LA FOSSE — ON REGARDE DEDANS. Une paroi eclairee du cote oppose a la lumiere,
   un fond qui s assombrit vers le centre, et au fond du metal encore tiede. Rien
   n en sort : c est le seul objet du depot dont le contenu soit PLUS BAS que le
   sol, et tout son dessin sert a le dire. */
function fosse(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const p = Math.min(14, w * 0.16, h * 0.16);
  // LE FOND, plus sombre au centre : c est la profondeur.
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.5);
  g.addColorStop(0, alpha("#000000", 0.92));
  g.addColorStop(0.6, alpha("#000000", 0.80));
  g.addColorStop(1, alpha("#000000", 0.58));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LES PAROIS : deux bandes claires du cote de la lumiere, deux sombres en
  // face. C est l inverse exact du relief d un bloc, et c est ce qui fait lire
  // « creux » sans un mot.
  const d = lumDir();
  ctx.fillStyle = alpha(S.blocEdge, 0.16);
  if (d[0] > 0) ctx.fillRect(-w / 2, -h / 2, p, h); else ctx.fillRect(w / 2 - p, -h / 2, p, h);
  if (d[1] > 0) ctx.fillRect(-w / 2, -h / 2, w, p); else ctx.fillRect(-w / 2, h / 2 - p, w, p);
  ctx.fillStyle = alpha("#000000", 0.30);
  if (d[0] > 0) ctx.fillRect(w / 2 - p, -h / 2, p, h); else ctx.fillRect(-w / 2, -h / 2, p, h);
  // LE METAL AU FOND, tiede : quelques nappes orangees, jamais jusqu au bord.
  for (let i = 0; i < 3; i++) {
    const rx = w * (0.10 + ((s >> (i * 2)) & 3) * 0.05);
    const px = ((((s >> i) & 7) / 7) - 0.5) * w * 0.44;
    const py = ((((s >> (i + 3)) & 7) / 7) - 0.5) * h * 0.44;
    const gr = ctx.createRadialGradient(px, py, 0, px, py, rx);
    gr.addColorStop(0, alpha(S.emis, 0.20));
    gr.addColorStop(1, alpha(S.emis, 0));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(px, py, rx, 0, Math.PI * 2); ctx.fill();
  }
  // LA MARGELLE, un lisere franc tout autour : un trou se lit a son BORD.
  ctx.strokeStyle = alpha(S.blocEdge, 0.34);
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
}


/* LA POUTRE — UNE FERME DE CHARPENTE, DONC UN TREILLIS. Elle ne se dessine pas
   comme une barre : ce qui la fait lire est la DIAGONALE de son ame, repetee, et
   c est aussi ce qui dit qu elle etait faite pour porter et qu elle ne porte
   plus. Chaque marche de l escalier en montre un troncon. */
function poutre(o, S) {
  const w = o.w, h = o.h;
  const long = w >= h;
  const L = long ? w : h, E = long ? h : w;
  ctx.fillStyle = alpha("#000000", 0.44);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LES DEUX MEMBRURES, pleines, sur les bords longs.
  ctx.fillStyle = alpha(PROP.rouille, 0.44);
  if (long) {
    ctx.fillRect(-w / 2, -h / 2, w, Math.max(2, E * 0.22));
    ctx.fillRect(-w / 2, h / 2 - Math.max(2, E * 0.22), w, Math.max(2, E * 0.22));
  } else {
    ctx.fillRect(-w / 2, -h / 2, Math.max(2, E * 0.22), h);
    ctx.fillRect(w / 2 - Math.max(2, E * 0.22), -h / 2, Math.max(2, E * 0.22), h);
  }
  // L AME EN ZIGZAG : c est elle qui dit « treillis » et pas « barre ».
  ctx.strokeStyle = alpha(PROP.rouille, 0.34);
  ctx.lineWidth = 2;
  ctx.beginPath();
  const pas = Math.max(9, E * 0.9);
  let haut = true;
  for (let u = -L / 2; u < L / 2 - 1; u += pas, haut = !haut) {
    const a = Math.min(u + pas, L / 2);
    if (long) {
      ctx.moveTo(u, haut ? -h / 2 + 2 : h / 2 - 2);
      ctx.lineTo(a, haut ? h / 2 - 2 : -h / 2 + 2);
    } else {
      ctx.moveTo(haut ? -w / 2 + 2 : w / 2 - 2, u);
      ctx.lineTo(haut ? w / 2 - 2 : -w / 2 + 2, a);
    }
  }
  ctx.stroke();
}


/* LA CAGE DE LAMINOIR — DEUX TOURILLONS ET UNE FENTE. Ce qui la fait lire est la
   FENTE horizontale au milieu : c est par la que passe la barre, et c est la
   seule ouverture traversante d un objet du depot. */
function laminoir(o, S) {
  const w = o.w, h = o.h;
  ctx.fillStyle = alpha("#000000", 0.46);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.56);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  // LA FENTE, incandescente : la barre y passe encore.
  ctx.fillStyle = alpha("#000000", 0.62);
  ctx.fillRect(-w / 2 + 1, -h * 0.06, w - 2, h * 0.12);
  ctx.fillStyle = alpha(S.emis, 0.26);
  ctx.fillRect(-w / 2 + 1, -h * 0.03, w - 2, h * 0.06);
  // LES TOURILLONS, deux disques sur les flancs.
  ctx.fillStyle = alpha(S.blocEdge, 0.28);
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(0, d * h * 0.26, Math.min(w, h) * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = alpha("#000000", 0.30);
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
}

/* LA MEMBRURE — UN TREILLIS QUI NE CACHE RIEN. Deux membrures fines et une ame
   en zigzag ; entre les traits, on voit le fond. C est le seul obstacle du depot
   qui bloque le corps en laissant passer le REGARD sur toute sa longueur. */
function membrure(o, S) {
  const w = o.w, h = o.h;
  const vert = h >= w;
  const L = vert ? h : w, E = vert ? w : h;
  ctx.strokeStyle = alpha(S.blocEdge, 0.42);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const d of [-E / 2 + 1, E / 2 - 1]) {
    if (vert) { ctx.moveTo(d, -h / 2); ctx.lineTo(d, h / 2); }
    else { ctx.moveTo(-w / 2, d); ctx.lineTo(w / 2, d); }
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(S.blocEdge, 0.26);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const pas = Math.max(10, E * 1.6);
  let haut = true;
  for (let u = -L / 2; u < L / 2 - 1; u += pas, haut = !haut) {
    const a = Math.min(u + pas, L / 2);
    if (vert) {
      ctx.moveTo(haut ? -w / 2 + 1 : w / 2 - 1, u);
      ctx.lineTo(haut ? w / 2 - 1 : -w / 2 + 1, a);
    } else {
      ctx.moveTo(u, haut ? -h / 2 + 1 : h / 2 - 1);
      ctx.lineTo(a, haut ? h / 2 - 1 : -h / 2 + 1);
    }
  }
  ctx.stroke();
  // LE GIVRE aux nœuds : la structure est DEHORS.
  ctx.fillStyle = alpha(PROP.givre, 0.22);
  for (let u = -L / 2; u <= L / 2; u += pas * 2) {
    if (vert) ctx.fillRect(-w / 2, u - 1.5, w, 3);
    else ctx.fillRect(u - 1.5, -h / 2, 3, h);
  }
}

/* LE BORDE — LE SEUL OPAQUE DU CHANTIER. Un panneau de coque pose sur
   l ossature, pas encore soude : ses bords sont NETS et il ne porte aucun
   detail. Dans une region ou tout est transparent, ce qui bouche se remarque. */
function borde(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#000000", 0.42);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.blocEdge, 0.24);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // les points de SOUDURE PROVISOIRE, sur un seul bord : il tient a peine.
  ctx.fillStyle = alpha(PROP.balise, 0.30);
  for (let i = 0; i < 4; i++) {
    const u = -w / 2 + w * (0.2 + i * 0.2);
    ctx.fillRect(u - 1.5, (s & 1) ? -h / 2 + 1 : h / 2 - 4, 3, 3);
  }
}

/* L ALVEOLE — UN MUR DE PETITS TROUS ECLAIRES. Chaque capsule a sa lumiere
   propre et deux sur cinq sont eteintes : c est un DAMIER, et rien d autre du
   Secteur n eclaire par petits points. */
const ALVEOLE_PAS = 15;
function alveole(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const long = w >= h;
  const L = long ? w : h, E = long ? h : w;
  ctx.fillStyle = alpha("#000000", 0.50);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.44);
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  let i = 0;
  for (let u = -L / 2 + ALVEOLE_PAS * 0.6; u < L / 2 - 3; u += ALVEOLE_PAS, i++) {
    for (let r = 0; r < 2; r++) {
      const d = (r - 0.5) * E * 0.44;
      const on = ((s >> ((i * 2 + r) % 11)) & 3) !== 0;
      ctx.fillStyle = alpha("#000000", 0.54);
      if (long) ctx.fillRect(u - 4, d - E * 0.16, 8, E * 0.32);
      else ctx.fillRect(d - E * 0.16, u - 4, E * 0.32, 8);
      if (!on) continue;
      // la teinte varie d une capsule a l autre : personne n a la meme ampoule.
      const t = ((s >> i) & 3);
      ctx.fillStyle = alpha(["#ffb84d", "#ff7ac2", "#7ad6ff", "#ffe08a"][t], 0.26);
      if (long) ctx.fillRect(u - 3, d - E * 0.12, 6, E * 0.24);
      else ctx.fillRect(d - E * 0.12, u - 3, E * 0.24, 6);
    }
  }
}

/* LA COURSIVE — UNE PASSERELLE ET SON GARDE-CORPS. Deux lignes fines et des
   montants reguliers : elle dessert les alveoles et ne cache rien. */
function coursive(o, S) {
  const w = o.w, h = o.h;
  const long = w >= h;
  const L = long ? w : h, E = long ? h : w;
  ctx.fillStyle = alpha("#000000", 0.34);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = alpha(S.blocEdge, 0.34);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (const d of [-E / 2 + 1, E / 2 - 1]) {
    if (long) { ctx.moveTo(-w / 2, d); ctx.lineTo(w / 2, d); }
    else { ctx.moveTo(d, -h / 2); ctx.lineTo(d, h / 2); }
  }
  ctx.stroke();
  ctx.fillStyle = alpha("#000000", 0.40);
  for (let u = -L / 2; u <= L / 2; u += 9) {
    if (long) ctx.fillRect(u - 1, -h / 2, 2, h);
    else ctx.fillRect(-w / 2, u - 1, w, 2);
  }
  // LE LINGE, un trait clair en travers : on habite au-dessus.
  ctx.strokeStyle = alpha("#d8d2c4", 0.16);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (long) { ctx.moveTo(-w * 0.24, 0); ctx.lineTo(w * 0.10, 0); }
  else { ctx.moveTo(0, -h * 0.24); ctx.lineTo(0, h * 0.10); }
  ctx.stroke();
}


/* LE BAC DE TREMPE — LE SEUL CREUX DE L USINE. Meme famille de dessin que la
   fosse de la Fonderie : parois eclairees du cote oppose a la lumiere, fond qui
   s assombrit. Ce qui change est le CONTENU — un bain de traitement, pas du
   metal en fusion : une nappe froide, opaque, avec sa mousse au bord. */
function bac(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const p = Math.min(11, w * 0.14, h * 0.14);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.5);
  g.addColorStop(0, alpha("#000000", 0.88));
  g.addColorStop(1, alpha("#000000", 0.56));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  const d = lumDir();
  ctx.fillStyle = alpha(S.blocEdge, 0.16);
  if (d[0] > 0) ctx.fillRect(-w / 2, -h / 2, p, h); else ctx.fillRect(w / 2 - p, -h / 2, p, h);
  if (d[1] > 0) ctx.fillRect(-w / 2, -h / 2, w, p); else ctx.fillRect(-w / 2, h / 2 - p, w, p);
  // LE BAIN : une nappe unie, froide, sans reflet — un bain de traitement ne
  // brille pas, c est ce qui le separe d une flaque.
  ctx.fillStyle = alpha(["#1d3a34", "#2a2f18", "#132a3a"][s % 3], 0.62);
  ctx.fillRect(-w / 2 + p, -h / 2 + p, w - p * 2, h - p * 2);
  // LA MOUSSE au bord, seule chose claire : elle dit que ca a servi.
  ctx.fillStyle = alpha("#d8cfae", 0.12);
  ctx.fillRect(-w / 2 + p, -h / 2 + p, w - p * 2, Math.max(2, h * 0.08));
  ctx.strokeStyle = alpha(S.blocEdge, 0.30);
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
}

/* LA HOTTE — CE QUI EST AU-DESSUS. Un caisson d aspiration suspendu : son
   contour est franc, son interieur est VIDE et sombre, et une gaine en sort. Ce
   qui la fait lire est qu elle ne touche pas le sol — pas d ombre de contact,
   juste un liseré. */
function hotte(o, S) {
  const w = o.w, h = o.h;
  ctx.fillStyle = alpha("#000000", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha(S.bloc, 0.26);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  // les LAMES d aspiration, serrees, tres sombres : on voit a travers et il n y
  // a rien derriere.
  ctx.strokeStyle = alpha("#000000", 0.38);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const long = w >= h, L = long ? w : h;
  for (let u = -L / 2 + 6; u < L / 2 - 3; u += 6) {
    if (long) { ctx.moveTo(u, -h / 2 + 4); ctx.lineTo(u, h / 2 - 4); }
    else { ctx.moveTo(-w / 2 + 4, u); ctx.lineTo(w / 2 - 4, u); }
  }
  ctx.stroke();
  // LA GAINE, un tube court qui sort d un angle : elle va quelque part.
  ctx.fillStyle = alpha(S.blocEdge, 0.24);
  ctx.fillRect(w / 2 - 4, -h * 0.16, 7, h * 0.32);
  ctx.strokeStyle = alpha(S.blocEdge, 0.34);
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
}

/* LA CAGE ROBOTISEE — UN GRILLAGE SERRE ET CE QUI TRAVAILLE DEDANS. Le grillage
   est plus fin que celui des utilites — une cellule de robot se regarde de
   pres — et il y a un BRAS a l interieur, replie, qui ne sort jamais. */
function cage(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.strokeStyle = alpha(S.blocEdge, 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let u = -w / 2; u < w / 2; u += 5) {
    ctx.moveTo(u, -h / 2); ctx.lineTo(u + 5, h / 2);
    ctx.moveTo(u + 5, -h / 2); ctx.lineTo(u, h / 2);
  }
  ctx.stroke();
  // LE BRAS, replie : un segment epais et un coude. Il est SOMBRE, la cage est
  // claire — ce qui travaille se voit a travers ce qui protege.
  ctx.strokeStyle = alpha(S.bloc, 0.66);
  ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.10);
  ctx.lineCap = "round";
  ctx.beginPath();
  const a = ((s & 3) / 4) * Math.PI * 2;
  ctx.moveTo(0, h * 0.22);
  ctx.lineTo(Math.cos(a) * w * 0.18, h * 0.22 + Math.sin(a) * h * 0.18);
  ctx.lineTo(Math.cos(a) * w * 0.30, -h * 0.10);
  ctx.stroke();
  ctx.lineCap = "butt";
  // le SOCLE, un disque au pied du bras.
  ctx.fillStyle = alpha(S.bloc, 0.50);
  ctx.beginPath(); ctx.arc(0, h * 0.22, Math.min(w, h) * 0.13, 0, Math.PI * 2); ctx.fill();
  // le CADRE, franc : c est lui qui dit qu on ne passe pas.
  ctx.strokeStyle = alpha(S.blocEdge, 0.40);
  ctx.lineWidth = 2.2;
  ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  // le voyant d etat, un point ambre en coin : la cellule est SOUS TENSION.
  ctx.fillStyle = alpha(S.emis, 0.42);
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, 3, 3);
}

/* LE PORTIQUE — IL ENJAMBE. Deux pieds francs et une poutre entre eux : le seul
   objet de l Usine dont le MILIEU ne touche pas le sol, et c est ce qui le
   separe d une barre. Le chariot est quelque part sur la poutre. */
function portique(o, S) {
  const w = o.w, h = o.h;
  const long = w >= h;
  const L = long ? w : h, E = long ? h : w;
  // LA POUTRE, fine et claire : elle est en l air.
  ctx.strokeStyle = alpha(S.blocEdge, 0.30);
  ctx.lineWidth = Math.max(2, E * 0.30);
  ctx.beginPath();
  if (long) { ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); }
  else { ctx.moveTo(0, -h / 2); ctx.lineTo(0, h / 2); }
  ctx.stroke();
  // LES PIEDS, aux deux bouts, pleins et sombres : eux touchent le sol.
  ctx.fillStyle = alpha("#000000", 0.44);
  const pw = Math.max(6, L * 0.06);
  if (long) {
    ctx.fillRect(-w / 2, -h / 2, pw, h);
    ctx.fillRect(w / 2 - pw, -h / 2, pw, h);
  } else {
    ctx.fillRect(-w / 2, -h / 2, w, pw);
    ctx.fillRect(-w / 2, h / 2 - pw, w, pw);
  }
  ctx.fillStyle = alpha(S.bloc, 0.46);
  if (long) {
    ctx.fillRect(-w / 2 + 1, -h / 2 + 1, pw - 2, h - 2);
    ctx.fillRect(w / 2 - pw + 1, -h / 2 + 1, pw - 2, h - 2);
  } else {
    ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, pw - 2);
    ctx.fillRect(-w / 2 + 1, h / 2 - pw + 1, w - 2, pw - 2);
  }
  // LE CHARIOT, un bloc sur la poutre, jamais au milieu.
  ctx.fillStyle = alpha(S.blocEdge, 0.34);
  const c = Math.max(4, L * 0.08);
  if (long) ctx.fillRect(-w / 2 + L * 0.34, -E * 0.34, c, E * 0.68);
  else ctx.fillRect(-E * 0.34, -h / 2 + L * 0.34, E * 0.68, c);
}


/* LE TAS DE MINERAI — DU GRAIN, ET UNE CRETE. Ce qui le fait lire est le
   DEGRADE : clair sur la crete, sombre au pied, parce qu un tas a une pente. Et
   la coulee au pied, la ou il s est etale — c est ce qui dit qu on l a verse et
   pas pose. */
function tas(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  const g = ctx.createRadialGradient(-w * 0.10, -h * 0.14, 0, 0, 0, Math.max(w, h) * 0.55);
  g.addColorStop(0, alpha("#7a4a30", 0.72));
  g.addColorStop(0.55, alpha("#4e2f1e", 0.66));
  g.addColorStop(1, alpha("#2a1a11", 0.62));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // LE GRAIN : des points fins, plus denses au pied. Un tas n a pas de texture
  // uniforme, il a une granulometrie.
  const n = 120;
  for (let i = 0; i < n; i++) {
    const a = ((s * (i + 3)) % 997) / 997 * Math.PI * 2;
    const d = Math.sqrt(((s * (i + 11)) % 991) / 991);
    ctx.fillStyle = alpha(i & 1 ? "#000000" : "#9a6a4a", 0.10 + d * 0.10);
    ctx.fillRect(Math.cos(a) * w * 0.46 * d, Math.sin(a) * h * 0.46 * d, 1.6, 1.6);
  }
  // LA CRETE, un trait clair en arc : la ligne de plus grande hauteur.
  ctx.strokeStyle = alpha("#c08a5a", 0.20);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, h * 0.06, Math.min(w, h) * 0.26, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

/* LE BOSQUET — SEMI-OPAQUE, ET C EST SA REGLE. Il ne se peint pas en plein : un
   fond sombre, puis des touffes claires par-dessus, et entre elles on devine le
   sol. On voit des SILHOUETTES a travers sans pouvoir tirer proprement, ce que
   rien d autre du depot ne fait. */
function bosquet(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#0f150c", 0.54);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = ((s * (i + 5)) % 983) / 983 * Math.PI * 2;
    const d = Math.sqrt(((s * (i + 17)) % 977) / 977) * 0.46;
    const r = Math.min(w, h) * (0.10 + (((s >> (i % 11)) & 3) / 3) * 0.10);
    ctx.fillStyle = alpha(PROP.vert, 0.16 + ((i & 3) * 0.05));
    ctx.beginPath();
    ctx.arc(Math.cos(a) * w * d, Math.sin(a) * h * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // LES TRONCS, deux ou trois traits sombres qui montent : sans eux c est de la
  // mousse, pas un bosquet.
  ctx.strokeStyle = alpha("#1d1a12", 0.44);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const x = -w * 0.24 + w * 0.24 * i + ((s >> i) & 1) * 6;
    ctx.moveTo(x, h * 0.30); ctx.lineTo(x + ((s >> (i + 2)) & 1 ? 4 : -4), -h * 0.10);
  }
  ctx.stroke();
}

/* LA RONCE — BASSE, DENSE, ET ELLE SE DEGAGE AU TIR. Un enchevetrement de
   traits courts qui se croisent : aucune forme, juste de la matiere emmelee.
   C est ce qui la separe d une haie, qui aurait une direction. */
function ronce(o, S) {
  const w = o.w, h = o.h, s = graine(o);
  ctx.fillStyle = alpha("#141a10", 0.40);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = alpha(PROP.vert, 0.30);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const n = 40;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + ((s * (i + 7)) % 991) / 991 * w;
    const y = -h / 2 + ((s * (i + 23)) % 983) / 983 * h;
    const a = ((s * (i + 3)) % 977) / 977 * Math.PI * 2;
    const l = 4 + ((s >> (i % 9)) & 3) * 2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  ctx.stroke();
  // les EPINES, quelques points clairs : ce n est pas de l herbe.
  ctx.fillStyle = alpha("#8a9a6a", 0.22);
  for (let i = 0; i < 10; i++) {
    const x = -w / 2 + ((s * (i + 31)) % 971) / 971 * w;
    const y = -h / 2 + ((s * (i + 13)) % 967) / 967 * h;
    ctx.fillRect(x, y, 1.6, 1.6);
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
