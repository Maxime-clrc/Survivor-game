import { CFG } from "/shared/game_state.js";
import { PROP, alpha } from "/shared/palette.js";
import { GFX_HIGH, GFX_LOW, gfx } from "../core/state.js";
import { biomeKey, biomeIndex, biomeSeed, camera, ctx, hazardsDuLieu, loiAt, obstaclesDuLieu, quartierMonde, skin } from "./stage.js";
import { biomeAt, loisDe, B_CARCASSE, B_CHAINE, B_CONDUITE, B_AVEUGLE, B_BANCHE, B_BASSIN, B_BRAS, B_CLOISON, B_COQUE, B_CONSOLE, B_ESCALIER, B_ETAL, B_MONOLITHE, B_CONTENEUR, B_CUVE, B_DEBRIS, B_DEVANTURE, B_FOUR, B_FRAGMENT, B_MACHINE, B_CLOTURE, B_ETABLI, B_EPAVES, B_GRILLAGE, B_MALAXEUR, B_MOULE, B_POTEAU, B_MUR, B_OUVERTE, B_PALETTIER, B_PILE, B_POSTE, B_PYLONE, B_QUAI, B_REMORQUE, B_TRANSFO, B_RUINE, B_TRAVEE, blocAt, blocsDe } from "/shared/biomes.js";

/* LE DECOR N'EXISTE AUJOURD'HUI QUE S'IL BLOQUE. Ce module ajoute ce qui ne
   bloque pas — et il le fait sans rien garder : la presence, le type, l'angle
   et l'echelle d'un prop sont des FONCTIONS de sa cellule monde et de la graine.
   Meme motif que `champ()` dans decor.js, ancre a une cellule au lieu d'un
   indice, donc le semis est infini, non repetitif et identique chez tous.

   REGLE ABSOLUE : rien ici ne doit se lire comme bloquant. Tout est plaque au
   sol. Un prop qui ferait hesiter un joueur sur une trajectoire est un bug. */
const CELL = 200;
const MARGE = 1;

/* UNE MAP DOIT RESSEMBLER A SON NOM. Un jeu de props PROPRE a chaque biome, qui
   porte son verbe : l'Usine fabrique (convoyeurs, caisses, allees), la Fonderie
   coule (rigoles, lingots, scorie), la Friche a ete abandonnee (gravats,
   ferraille, tubes morts), la Nebuleuse FLOTTE. Un catalogue partage rendait les
   quatre interchangeables.

   LA NEBULEUSE NE PARTAGE PLUS RIEN. Elle tirait cinq props sur douze dans le
   fonds commun — caillebotis, plaque, cable, tuyau, coffret : de la quincaillerie
   TERRESTRE, posee au sol d'une station orbitale parce qu'elle etait deja
   ecrite. C'est la seule justification qu'un prop n'a pas le droit d'avoir. Son
   catalogue est desormais entierement le sien ; le lien avec les trois autres
   lieux passe par la charte, les cadres et les effets de jeu, pas par un tuyau.

   Les trois autres gardent leur fonds commun : il est honnetement industriel, et
   eux SONT des installations industrielles. */
const P_CAILLEBOTIS = 1, P_CABLE = 2, P_TUYAU = 3,
      P_DEBRIS = 4, P_MARQUAGE = 5, P_TUBE = 7,
      P_CONVOYEUR = 8, P_CAISSES = 9, P_ALLEE = 10,
      P_RIGOLE = 11, P_LINGOTS = 12, P_SCORIE = 13,
      P_RAIL = 14, P_GIVRE = 15, P_ANCRAGE = 16, P_BALISE = 17,
      P_EPAVE = 18, P_VOILE = 19, P_MODULE = 20, P_CRISTAL = 21, P_ANTENNE = 22,
      P_BROUSSE = 23, P_JONCHEE = 24, P_GRILLAGE = 25, P_CARCASSE = 26,
      P_BIDON = 27, P_PANNEAU = 28,
      P_BRAS = 29, P_PRESSE = 30, P_VENTILATION = 31, P_PALETTIER = 32,
      P_POCHE = 33, P_MOULE = 34, P_TREMIE = 35, P_OUTILLAGE = 36,
      P_PASSAGE = 37, P_BORNE = 38, P_AFFICHE = 39, P_GRILLE_AIR = 40,
      P_DISTRIB = 41, P_MOTO = 42, P_CAGEOT = 43, P_PARABOLE = 44,
      P_NEON_SOL = 45, P_PLAQUE_EGOUT = 46, P_GAINE = 47, P_FLAQUE = 48;

/* UN PROP QUI BOUGE N'EST PAS UN SIGNAL, A UNE CONDITION QUI SE VERIFIE : SON
   MOUVEMENT EST CONTINU ET PERIODIQUE, donc il n'a ni debut ni fin, donc il
   n'annonce rien. Un telegraphe a un debut et une echeance — c'est exactement ce
   qui le rend lisible, et c'est ce canal-la qui appartient au boss.

   La regle « une matiere est desaturee et fixe » reste entiere sur la SATURATION.
   Sur le mouvement, le depot l'avait deja assouplie sans le dire : un tube mort
   gresille, un voyant respire, du metal en fusion ondule, une balise bat. Le
   comportement est un canal de MATIERE. L'Usine est le lieu qui l'exploite le
   plus, parce que c'est le seul dont le verbe soit au present. */
const CYCLE = (t, periode, phase) => ((t / periode) + phase) % 1;

// un prop emissif declare son RAYON et sa COULEUR : une poche en fusion et un
// tube mort ne sont pas la meme lumiere.
const EMISSIF = {
  [P_TUBE]:    { r: 78, col: PROP.led },
  [P_RIGOLE]:  { r: 96, col: PROP.fonte },
  [P_POCHE]:   { r: 120, col: PROP.fonte },
  [P_BALISE]:  { r: 70, col: PROP.balise },
  [P_CRISTAL]: { r: 86, col: PROP.balise },
  // LE SEUL LIEU QUI AIT TROIS SOURCES AU SOL, et c est ce qui le definit : une
  // rue est eclairee par ce qui la borde, pas par son ciel.
  [P_BORNE]:     { r: 74, col: "#ff3d9a" },
  [P_AFFICHE]:   { r: 92, col: "#ff3d9a" },
  [P_NEON_SOL]:  { r: 66, col: "#4de0ff" },
  [P_DISTRIB]:   { r: 58, col: "#4de0ff" },
};

const TABLE = {
  usine: [P_CONVOYEUR, P_CONVOYEUR, P_CONVOYEUR, P_BRAS, P_PRESSE, P_VENTILATION,
          P_PALETTIER, P_CAISSES, P_ALLEE, P_ALLEE, P_MARQUAGE, P_CABLE],
  // la PLAQUE et le COFFRET sont SUPPRIMES du depot, pas deplaces : elle etait le
  // dernier lieu a les tirer, et un prop que plus aucune table ne tire ne
  // s'oublie pas au catalogue. Elle garde le caillebotis et le tuyau — une
  // fonderie a des grilles de sol et des conduites, ce n'est pas de l'emprunt.
  fonderie: [P_POCHE, P_RIGOLE, P_RIGOLE, P_MOULE, P_MOULE, P_TREMIE,
             P_OUTILLAGE, P_LINGOTS, P_SCORIE, P_SCORIE, P_CAILLEBOTIS, P_TUYAU],
  // le TUBE reste, et il n'est plus tire que par elle : un neon qui gresille est
  // le seul reste ALLUME que ce lieu s'autorise, et son comportement dit
  // l'abandon mieux qu'une rouille de plus. Le coffret, lui, part — un voyant
  // qui respire dit qu'un appareil FONCTIONNE, et plus rien ne fonctionne ici.
  friche: [P_BROUSSE, P_BROUSSE, P_BROUSSE, P_JONCHEE, P_JONCHEE, P_GRILLAGE,
           P_CARCASSE, P_BIDON, P_PANNEAU, P_TUBE, P_DEBRIS, P_CABLE],
  nebuleuse: [P_EPAVE, P_EPAVE, P_VOILE, P_VOILE, P_CRISTAL, P_CRISTAL,
              P_MODULE, P_ANTENNE, P_RAIL, P_ANCRAGE, P_GIVRE, P_BALISE],
  /* LE SECTEUR NE PARTAGE RIEN NON PLUS. La tentation etait de lui preter le
     cable et le tuyau du fonds industriel — ils existent, ils sont ecrits — mais
     une rue habitee n a pas la meme quincaillerie qu un atelier : ce qui traine
     ici a ete JETE ou POSE par quelqu un, pas monte. Douze props, tous les
     siens. */
  secteur: [P_PASSAGE, P_PASSAGE, P_FLAQUE, P_FLAQUE, P_BORNE, P_AFFICHE,
            P_GRILLE_AIR, P_DISTRIB, P_MOTO, P_CAGEOT, P_PARABOLE, P_NEON_SOL,
            P_PLAQUE_EGOUT, P_GAINE],
};

/* UN LIEU A DES QUARTIERS, ET LE SEMIS N EN AVAIT AUCUN. Chaque prop tirait
   uniformement dans TOUTE la liste du biome, independamment de ses voisins : un
   bras robotise naissait a cote d un marquage au sol et d un palettier sans
   qu aucune regle ne l en empeche. Le semis etait deterministe dans son calcul
   et parfaitement aleatoire dans sa DISTRIBUTION — c est la difference entre
   « genere » et « compose », et c est elle qui rendait les quatre lieux plats.

   UNE FONCTION DE PLUS, PAS UNE COUCHE DE PLUS : la zone est un hachage de la
   cellule divisee, donc elle ne s alloue pas, ne se garde pas entre deux images,
   et reste une fonction pure de (cellule, graine) — les trois proprietes qui
   font que deux clients voient la meme chose.

   `TABLE` reste ce que le lieu POSSEDE, `ZONES` devient la facon dont il
   l ARRANGE, et `verifierZones()` croise les deux : un prop qu aucune zone ne
   tire est un prop SUPPRIME du jeu en silence, exactement le piege que
   `CLAUDE.md` nomme en premier.

   LA FUITE EST CE QUI EMPECHE LA FRONTIERE DE SE VOIR. Sans elle, deux quartiers
   se separent sur une droite franche — un decoupage administratif, pas une
   installation. Une part des props ignore donc sa zone et tire dans le fonds du
   lieu : les quartiers gardent leur dominante, leur bord se brouille. */
const FUITE = 0.18;
// deux cellules sur trois : au-dela le sol devient un tapis et plus aucune
// trace ne se lit comme un evenement.
const TRACE_TAUX = 0.66;

const ZONES = {
  // elle FABRIQUE : la chaine, ce qu on empile autour, ce par quoi on circule,
  // et ce qui l entretient.
  usine: [
    [P_CONVOYEUR, P_CONVOYEUR, P_BRAS, P_PRESSE],
    [P_PALETTIER, P_CAISSES, P_CAISSES, P_MARQUAGE],
    [P_ALLEE, P_ALLEE, P_MARQUAGE, P_CONVOYEUR],
    [P_VENTILATION, P_CABLE, P_CABLE, P_BRAS],
  ],
  // elle COULE : le metal liquide, ce qui le met en forme, ce qui en sort, et ce
  // qu on jette.
  fonderie: [
    [P_POCHE, P_RIGOLE, P_RIGOLE, P_MOULE],
    [P_MOULE, P_MOULE, P_TREMIE, P_OUTILLAGE],
    [P_LINGOTS, P_LINGOTS, P_CAILLEBOTIS, P_OUTILLAGE],
    [P_SCORIE, P_SCORIE, P_TUYAU, P_CAILLEBOTIS],
  ],
  // elle a ETE ABANDONNEE : ce qui repousse, ce qui a ete casse, ce qui fermait,
  // et le peu qui reste allume.
  friche: [
    [P_BROUSSE, P_BROUSSE, P_BROUSSE, P_JONCHEE],
    [P_CARCASSE, P_DEBRIS, P_JONCHEE, P_BIDON],
    [P_GRILLAGE, P_PANNEAU, P_CABLE, P_BROUSSE],
    [P_TUBE, P_CABLE, P_DEBRIS, P_PANNEAU],
  ],
  // elle FLOTTE : la coque morte, la voilure, ce qui a gele dessus, et le point
  // ou l on s amarre.
  nebuleuse: [
    [P_EPAVE, P_EPAVE, P_GIVRE, P_MODULE],
    [P_VOILE, P_VOILE, P_ANCRAGE, P_RAIL],
    [P_CRISTAL, P_CRISTAL, P_GIVRE, P_VOILE],
    [P_BALISE, P_ANTENNE, P_RAIL, P_ANCRAGE, P_MODULE],
  ],
  // elle S AFFICHE : le devant de vitrine, la chaussee, ce qui dessert par
  // derriere, et le coin ou l on stationne.
  secteur: [
    [P_AFFICHE, P_BORNE, P_NEON_SOL, P_DISTRIB],
    [P_PASSAGE, P_PASSAGE, P_FLAQUE, P_PLAQUE_EGOUT],
    [P_GRILLE_AIR, P_GAINE, P_CAGEOT, P_FLAQUE],
    [P_MOTO, P_PARABOLE, P_CAGEOT, P_BORNE],
  ],
};

/* CE QUE L ARCHITECTURE ATTIRE AUTOUR D ELLE. Le quartier se lisait sur un
   hachage de la cellule divisee : coherent avec lui-meme, mais pose AU HASARD
   par rapport aux batiments. Une « zone stockage » pouvait donc tomber a dix
   metres d une presse et loin de tout rack — les quartiers etaient corrects et
   ne racontaient rien.

   La regle manquante est une hierarchie : L ARCHITECTURE DECIDE, LE SEMIS SUIT.
   Un prop assez proche d un bloc prend le quartier de ce bloc ; loin de tout, il
   retombe sur le hachage. Ce repli n est pas un defaut, c est le SENS : le
   stockage et la circulation sont precisement ce qui occupe l espace ENTRE les
   machines, donc ils n ont pas d architecture propre a suivre.

   La donnee etait deja la — `occupe()` balayait les memes obstacles pour eviter
   les collisions et jetait la distance. On la garde maintenant.

   `verifierZones()` exige qu une famille batie pointe sur un quartier qui
   existe, et que le lieu en desserve au moins DEUX : une architecture qui
   ramene tout au meme quartier ne compose rien. */
const PORTEE_QUARTIER = 90;
const QUARTIER = {
  // la chaine et la cellule PRODUISENT, le poste ENTRETIENT. Stockage et
  // circulation restent a l espace libre, et c est leur definition.
  // le palettier et la pile STOCKENT, le quai et la remorque font CIRCULER —
  // c est par eux que la marchandise entre et sort.
  usine: { [B_CHAINE]: 0, [B_MACHINE]: 0, [B_POSTE]: 3,
           [B_PALETTIER]: 1, [B_PILE]: 1, [B_QUAI]: 2, [B_REMORQUE]: 2,
           // l etabli et la machine ouverte ENTRETIENNENT ; le transformateur
           // et la claire-voie aussi — rien ne se fabrique dans un poste.
           [B_ETABLI]: 3, [B_OUVERTE]: 3, [B_TRANSFO]: 3, [B_CLOTURE]: 3 },
  // le four COULE, la cuve MOULE, la conduite appartient au rebut — c est par
  // elle que part ce qui ne sert plus.
  // le chassis et le malaxeur METTENT EN FORME, le bassin est ce qui SORT.
  fonderie: { [B_FOUR]: 0, [B_CUVE]: 1, [B_CONDUITE]: 3,
              [B_MOULE]: 1, [B_MALAXEUR]: 1, [B_BASSIN]: 2 },
  // la carcasse fait la CASSE, le mur fait la CLOTURE, et une ruine est le seul
  // endroit ou il reste quelque chose d allume.
  // la pile d epaves fait la CASSE comme la carcasse ; le grillage, le poteau
  // et la banche FERMENT ou DELIMITENT — c est le quartier de la cloture.
  friche: { [B_CARCASSE]: 1, [B_MUR]: 2, [B_RUINE]: 3,
            [B_EPAVES]: 1, [B_GRILLAGE]: 2, [B_POTEAU]: 2, [B_BANCHE]: 2 },
  // la coque et ses debris font l EPAVE, la travee est ce a quoi on s AMARRE.
  // la coque et ses debris font l EPAVE ; le bras, la cloison et la console
  // sont ce a quoi on s AMARRE ou ce qui dessert — le quartier de la travee.
  nebuleuse: { [B_FRAGMENT]: 0, [B_DEBRIS]: 0, [B_TRAVEE]: 3, [B_COQUE]: 0,
               [B_BRAS]: 3, [B_CLOISON]: 3, [B_CONSOLE]: 3 },
  // devanture et pylone VENDENT, le conteneur est ce qu on livre PAR DERRIERE.
  // le monolithe et l etal VENDENT (ou impressionnent) ; le mur aveugle et
  // l escalier sont l arriere, la ou l on livre — le quartier du conteneur.
  secteur: { [B_DEVANTURE]: 0, [B_PYLONE]: 0, [B_CONTENEUR]: 2,
             [B_MONOLITHE]: 0, [B_ETAL]: 0, [B_AVEUGLE]: 2, [B_ESCALIER]: 2 },
};

/* LES DEUX TABLES DOIVENT SE RECOUVRIR EXACTEMENT, DANS LES DEUX SENS. Un prop
   de `TABLE` qu aucune zone ne tire ne se signale JAMAIS : il disparait du lieu
   et le semis continue de tourner. Un prop de `ZONES` absent de `TABLE` est
   l inverse — il entre dans un lieu sans que le catalogue le dise. Meme role que
   `verifierDangers` pour les dessins de danger. */
export function verifierZones() {
  const soucis = [];
  for (const [lieu, table] of Object.entries(TABLE)) {
    const zones = ZONES[lieu];
    if (!zones) { soucis.push(`${lieu} : aucune zone`); continue; }
    const dansZones = new Set(zones.flat());
    const dansTable = new Set(table);
    for (const p of dansTable) {
      if (!dansZones.has(p)) soucis.push(`${lieu} : prop ${p} au catalogue, tire par aucune zone`);
    }
    for (const p of dansZones) {
      if (!dansTable.has(p)) soucis.push(`${lieu} : prop ${p} tire par une zone, absent du catalogue`);
    }
    if (zones.length < 2) soucis.push(`${lieu} : une seule zone, donc pas de composition`);

    /* ET L ARCHITECTURE DOIT DESSERVIR CE QU ELLE DECLARE. Une famille batie
       qui pointe sur un quartier inexistant retombe silencieusement sur le
       modulo, donc sur un quartier arbitraire ; une famille du lieu absente de
       la table ne dit rien de ce qui l entoure ; et un lieu dont toutes les
       familles menent au meme quartier ne compose pas, il uniformise. */
    const q = QUARTIER[lieu];
    if (!q) { soucis.push(`${lieu} : aucune table de quartier`); continue; }
    const familles = blocsDe(lieu);
    for (const k of familles) {
      if (q[k] === undefined) soucis.push(`${lieu}/${blocAt(k).key} : famille sans quartier`);
    }
    for (const k of Object.keys(q)) {
      if (!familles.includes(+k)) soucis.push(`${lieu} : quartier sur une famille etrangere (${k})`);
      else if (!(q[k] >= 0 && q[k] < zones.length)) {
        soucis.push(`${lieu}/${blocAt(+k).key} : quartier ${q[k]} hors des ${zones.length} zones`);
      }
    }
    if (new Set(Object.values(q)).size < 2) {
      soucis.push(`${lieu} : toutes les familles menent au meme quartier`);
    }
  }
  for (const lieu of Object.keys(QUARTIER)) {
    if (!TABLE[lieu]) soucis.push(`${lieu} : quartiers sans catalogue`);
  }
  for (const lieu of Object.keys(ZONES)) {
    if (!TABLE[lieu]) soucis.push(`${lieu} : zones sans catalogue`);
  }
  return soucis;
}

// densite : 0 en `low` — le sol reste celui d'avant le plan 13.
const DENSITE = [0, 0.34, 0.58, 0.74];

/* COMBIEN, ET GROS COMMENT — PAR LIEU. Les deux etaient GLOBAUX : `DENSITE[gfx]`
   et l echelle `0,72 + h x 0,66` n avaient aucun terme de lieu, donc les cinq
   posaient le meme nombre d objets a la meme taille et ne differaient que par la
   LISTE. C est la raison pour laquelle ils se ressemblent en mouvement : ce qui
   se lit a la seconde est une quantite et un calibre, pas un catalogue.

   Le multiplicateur porte le VERBE du lieu, pas un gout :
   un atelier est encombre, une rue habitee l est plus encore parce que tout y a
   ete pose par quelqu un ; une friche est un terrain NU entre deux champs de
   ruines, sa table le dit deja ; et un champ de debris a la derive est
   majoritairement du VIDE — c est ce qui fait qu on y voit loin.

   L echelle porte la meme phrase : ce qui derive dans le vide est une EPAVE,
   donc grand et rare ; ce qui traine dans une rue est un cageot, donc petit et
   partout. `[base, etendue]`, l usine restant la reference d origine. */
const DENSITE_LIEU = {
  usine: 1.15, fonderie: 1.00, friche: 0.78, nebuleuse: 0.62, secteur: 1.28,
};
const ECHELLE_LIEU = {
  usine:     [0.72, 0.66],
  fonderie:  [0.80, 0.70],
  // une carcasse et une brousse n ont pas le meme calibre : l etendue est la
  // plus large des cinq, et c est ce qui fait lire « ce qui reste » et non
  // « ce qui a ete pose ».
  friche:    [0.66, 0.92],
  nebuleuse: [0.90, 1.05],
  secteur:   [0.60, 0.52],
};

export function verifierSemis() {
  const soucis = [];
  for (const lieu of Object.keys(TABLE)) {
    if (!DENSITE_LIEU[lieu]) soucis.push(`${lieu} : aucune densite de semis`);
    if (!ECHELLE_LIEU[lieu]) soucis.push(`${lieu} : aucune echelle de props`);
  }
  for (const lieu of Object.keys(DENSITE_LIEU)) {
    if (!TABLE[lieu]) soucis.push(`densite de semis pour ${lieu}, qui n est pas un lieu`);
  }
  for (const lieu of Object.keys(ECHELLE_LIEU)) {
    if (!TABLE[lieu]) soucis.push(`echelle de props pour ${lieu}, qui n est pas un lieu`);
  }
  // DEUX LIEUX AU MEME COUPLE (densite, echelle) NE SE DISTINGUENT PLUS QUE PAR
  // LEUR CATALOGUE — c est l etat d ou l on vient, et il ne doit pas revenir.
  const vus = new Map();
  for (const lieu of Object.keys(TABLE)) {
    const cle = `${DENSITE_LIEU[lieu]}|${(ECHELLE_LIEU[lieu] ?? []).join(",")}`;
    if (vus.has(cle)) soucis.push(`${lieu} et ${vus.get(cle)} ont le meme semis`);
    else vus.set(cle, lieu);
  }
  // le plafond protege le chemin chaud : la densite est une probabilite par
  // cellule de 200 px, et au-dela de 1 elle sature sans rien ajouter.
  for (const [lieu, d] of Object.entries(DENSITE_LIEU)) {
    if (d <= 0 || d > 1.4) soucis.push(`${lieu} : densite ${d} hors de ]0 ; 1,4]`);
  }
  return soucis;
}

function h2(x, y, s) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x85ebca6b) ^ Math.imul(s | 0, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2545f491); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const props = [];
// UNE trace par CELLULE, la ou l architecture en designe une — pas une par
// prop : ce qui a marque le sol est plus grand que ce qui traine dessus.
const traces = [];
let cle = "";

/* LE SEMIS LIT LA GEOMETRIE DE LA MANCHE, PAS LA LISTE ACTIVE. Un prop est place
   UNE fois par cellule et pour la manche ; le lire sur les listes videes par le
   boss le fait NAITRE dans l'empreinte des blocs des que la camera bouge — et
   `cle` ne contient ni obstacles ni dangers, donc c'est le panoramique du combat
   qui declenche le recalcul. Il disparait ensuite a la mort du boss. La trace
   d'un bloc absent est le prix, et il est plus petit qu'un semis qui change. */
/* UN SEUL BALAYAGE POUR LES DEUX QUESTIONS : « est-ce libre ? » et « quelle
   architecture est la plus proche ? ». Les separer relirait la meme liste deux
   fois par prop candidat, et `refresh()` en teste une centaine.
   Rend -2 si la place est prise, sinon l indice de quartier du bloc le plus
   proche, ou -1 si aucun n est a portee. */
/* LA SOURCE SORT AVEC LE QUARTIER, et elle etait DEJA CALCULEE. `sonder`
   balayait les obstacles, gardait le plus proche, en tirait un quartier et
   JETAIT sa position — alors qu une trace n est pas un motif, c est la
   CONSEQUENCE de quelque chose qui est encore la. Une aureole entoure ce qui a
   deborde, une coulee pointe vers ce qui a fui : sans la source, les deux sont
   du bruit avec un nom.
   Objet de module et non valeur de retour : `refresh` appelle `sonder` une
   centaine de fois par changement de fenetre, et le retour numerique a deux
   sentinelles (-2 pris, -1 loin de tout) qu on ne veut pas transformer. */
const SONDE = { x: 0, y: 0 };

function sonder(x, y, quartiers) {
  let best = -1, bestD = PORTEE_QUARTIER * PORTEE_QUARTIER;
  for (const o of obstaclesDuLieu()) {
    if (Math.abs(x - o.x) < o.w / 2 + 26 && Math.abs(y - o.y) < o.h / 2 + 26) return -2;
    const q = quartiers[o.kind];
    if (q === undefined) continue;
    // distance au RECTANGLE, pas a son centre : une chaine longue de 368 px
    // rayonnerait depuis son milieu et ne dirait rien a ses extremites.
    const dx = Math.max(Math.abs(x - o.x) - o.w / 2, 0);
    const dy = Math.max(Math.abs(y - o.y) - o.h / 2, 0);
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d; best = q;
      /* LE POINT LE PLUS PROCHE DU RECTANGLE, JAMAIS SON CENTRE. La distance se
         mesure deja au rectangle — c est ecrit deux lignes plus haut et c est
         juste — mais une bande de trame fait jusqu a 3 680 px : son centre peut
         etre a dix-huit cents pixels d une trace qui la touche. Une coulee
         partirait du milieu du bloc, donc de nulle part. */
      SONDE.x = Math.max(o.x - o.w / 2, Math.min(x, o.x + o.w / 2));
      SONDE.y = Math.max(o.y - o.h / 2, Math.min(y, o.y + o.h / 2));
    }
  }
  for (const h of hazardsDuLieu()) {
    if ((x - h.x) ** 2 + (y - h.y) ** 2 < (h.r + 14) ** 2) return -2;
  }
  return best;
}

/* LE SEMIS EST PAR CELLULE DE 200 PX, DONC LE LIEU AUSSI. Une carte composee en
   montre jusqu a quatre dans une vue : catalogue, quartiers, matieres, densite et
   calibre se relisent a chaque cellule, et rien de tout ca n est cher — ce sont
   des lectures de table, dans une boucle qui ne tourne qu au changement de
   fenetre. */
function refresh() {
  const c0x = Math.floor(camera.x0 / CELL) - MARGE;
  const c0y = Math.floor(camera.y0 / CELL) - MARGE;
  const c1x = Math.ceil((camera.x0 + CFG.VIEW_W) / CELL) + MARGE;
  const c1y = Math.ceil((camera.y0 + CFG.VIEW_H) / CELL) + MARGE;
  const k = `${c0x},${c0y},${c1x},${c1y},${biomeIndex},${biomeSeed},${gfx}`;
  if (k === cle) return;
  cle = k;
  props.length = 0;
  traces.length = 0;
  if ((DENSITE[gfx] ?? 0) <= 0) return;

  const s = biomeSeed >>> 0;
  /* LE SEMIS EST PAR CELLULE, DONC LA REGION AUSSI : catalogue, quartiers,
     matieres, densite et calibre se relisent a chaque cellule. Ce sont des
     lectures de table, dans une boucle qui ne tourne qu au changement de
     fenetre — quatre entrees de cache au plus, une par loi. */
  const cleTheme = biomeKey();
  const parLoi = new Map();
  const lieuDe = (x, y) => {
    const loi = loiAt(x, y);
    let v = parLoi.get(loi);
    if (!v) {
      const a = airDe(cleTheme, loi);
      const zt = ZONES[cleTheme] ?? ZONES.usine;
      v = { table: TABLE[cleTheme] ?? TABLE.usine,
            zones: a.zones.map(i => zt[i] ?? zt[0]),
            quartiers: QUARTIER[cleTheme] ?? {}, matieres: a.matieres ?? null,
            ech: a.ech, dens: (DENSITE_LIEU[cleTheme] ?? 1) * a.dens };
      parLoi.set(loi, v);
    }
    return v;
  };

  for (let cy = c0y; cy <= c1y; cy++) {
    for (let cx = c0x; cx <= c1x; cx++) {
      if (cx < 0 || cy < 0 || cx * CELL > CFG.ARENA_W || cy * CELL > CFG.ARENA_H) continue;
      const LI = lieuDe((cx + 0.5) * CELL, (cy + 0.5) * CELL);
      const table = LI.table, zones = LI.zones, quartiers = LI.quartiers;
      const matieres = LI.matieres, ech = LI.ech;
      const dens = (DENSITE[gfx] ?? 0) * LI.dens;
      if (dens <= 0) continue;

      /* LA TRACE SE SONDE AU CENTRE DE LA CELLULE, pas a la position d un prop :
         elle est plus grande que ce qui traine dessus, et une cellule vide de
         props a autant de raisons d etre marquee qu une cellule pleine. Deux
         cellules sur trois seulement, sinon le sol devient un tapis et plus rien
         ne ressort.
         MAIS ELLE NE SE DESSINE PAS OU ELLE SE SONDE. Le centre est le bon point
         pour LIRE le quartier — il est stable, il ne depend d aucun prop — et le
         pire pour POSER la marque : deux cellules sur trois marquees au centre
         d une maille de 200 px font vingt-quatre taches par ecran sur un reseau
         carre, et c est le reseau qu on voit, pas les taches. */
      if (matieres && h2(cx, cy, s + 199) < TRACE_TAUX) {
        const mx = (cx + 0.5) * CELL, my = (cy + 0.5) * CELL;
        const mq = sonder(mx, my, quartiers);
        if (mq >= 0) {
          const t = matieres[mq % matieres.length];
          if (t) {
            traces.push({ t, cx, cy,
              x: (cx + 0.15 + h2(cx, cy, s + 201) * 0.70) * CELL,
              y: (cy + 0.15 + h2(cx, cy, s + 202) * 0.70) * CELL, s,
              // la source, capturee par le meme balayage qui a donne le quartier
              ax: SONDE.x, ay: SONDE.y });
          }
        }
      }

      const n = h2(cx, cy, s) < dens ? (h2(cx, cy, s + 31) < 0.28 ? 2 : 1) : 0;
      for (let i = 0; i < n; i++) {
        const g = s + 101 * (i + 1);
        const x = (cx + 0.12 + h2(cx, cy, g + 1) * 0.76) * CELL;
        const y = (cy + 0.12 + h2(cx, cy, g + 2) * 0.76) * CELL;
        const q = sonder(x, y, quartiers);
        if (q === -2) continue;
        /* L ARCHITECTURE DECIDE, LE QUARTIER DU LIEU COMBLE, LA FUITE BROUILLE.
           Trois sources dans cet ordre : ce qui est BATI a cote impose son
           quartier ; en terrain libre on prend celui du DECOUPAGE DU LIEU, le
           meme qui a choisi la loi d implantation des blocs ; et une part des
           props ignore les deux pour que la frontiere ne soit pas une droite.
           LE COMBLEMENT ETAIT UN HACHAGE A LUI, sur une maille de 600 px — plus
           petite qu une vue, donc le semis changeait deux a trois fois par ecran
           et ne pouvait designer aucun endroit. Et il etait INDEPENDANT du bati :
           deux decoupages a deux echelles qui ne tombaient jamais d accord. */
        const jeu = h2(cx, cy, g + 8) < FUITE
          ? table
          : zones[(q >= 0 ? q : quartierMonde(x, y)) % zones.length];
        props.push({
          k: jeu[(h2(cx, cy, g + 3) * jeu.length) | 0],
          x, y,
          a: h2(cx, cy, g + 4) * Math.PI * 2,
          s: ech[0] + h2(cx, cy, g + 5) * ech[1],
          o: 0.55 + h2(cx, cy, g + 6) * 0.45,
          p: h2(cx, cy, g + 7),
        });
      }
    }
  }
}

/* Un prop emissif porte la meme description qu'un danger : `lumiere.js` la
   consomme sans rien savoir du catalogue. */
export function forEachPropLight(fn) {
  if (gfx < GFX_HIGH) return;
  refresh();
  for (const p of props) {
    const e = EMISSIF[p.k];
    if (!e) continue;
    fn(p.x, p.y, e.r * p.s, e.col, gresil(p));
  }
}

/* TROIS LUMIERES, TROIS COMPORTEMENTS. Un tube mort GRESILLE — il tient,
   faiblit, revient d'un coup ; un voyant de coffret RESPIRE ; du metal en
   fusion ONDULE, lentement et sans jamais s'eteindre. Le comportement dit la
   matiere mieux que la couleur. */
function gresil(p) {
  const t = performance.now() / 1000;
  if (p.k === P_TUBE) {
    const u = Math.sin(t * (7 + p.p * 5) + p.p * 12) * Math.sin(t * 1.7 + p.p * 3);
    return u > 0.15 ? 1 : u > -0.2 ? 0.35 : 0.06;
  }
  if (p.k === P_RIGOLE || p.k === P_POCHE) {
    return 0.70 + 0.30 * (0.5 + 0.5 * Math.sin(t * (0.42 + p.p * 0.3) + p.p * 7));
  }
  // une balise d'arrimage BAT : elle appelle, elle n'eclaire pas.
  if (p.k === P_BALISE) {
    const u = (t * (0.6 + p.p * 0.2) + p.p) % 1;
    return u < 0.12 ? 1 : u < 0.24 ? 0.5 : 0.10;
  }
  // un cristal RESPIRE PROFOND et lentement : rien ne le commande, rien ne
  // l'alimente. C'est la seule source du depot qui ne soit pas un appareil.
  if (p.k === P_CRISTAL) {
    return 0.30 + 0.70 * (0.5 + 0.5 * Math.sin(t * (0.24 + p.p * 0.16) + p.p * 11));
  }
  return 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * (1.1 + p.p) + p.p * 9));
}

export function drawProps() {
  if (gfx <= GFX_LOW) return;
  refresh();
  if (props.length === 0) return;
  const dir = skin().dir;
  const ox = dir[0] * 2.4, oy = dir[1] * 2.4;

  for (const p of props) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.scale(p.s, p.s);
    ctx.globalAlpha = p.o;
    dessin(p, ox, oy);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function dessin(p, ox, oy) {
  switch (p.k) {
    case P_CAILLEBOTIS: return caillebotis(ox, oy);
    case P_CABLE:       return cable(p);
    case P_TUYAU:       return tuyau(ox, oy);
    case P_DEBRIS:      return debris(p, ox, oy);
    case P_MARQUAGE:    return marquage(p);
    case P_POCHE:       return poche(p, ox, oy);
    case P_MOULE:       return moule(p, ox, oy);
    case P_TREMIE:      return tremie(p, ox, oy);
    case P_OUTILLAGE:   return outillage(p, ox, oy);
    case P_CONVOYEUR:   return convoyeur(p, ox, oy);
    case P_CAISSES:     return caisses(p, ox, oy);
    case P_ALLEE:       return allee(p);
    case P_RIGOLE:      return rigole(p);
    case P_LINGOTS:     return lingots(p, ox, oy);
    case P_SCORIE:      return scorie(p);
    case P_BRAS:        return bras(p, ox, oy);
    case P_PRESSE:      return presse(p, ox, oy);
    case P_VENTILATION: return ventilation(p, ox, oy);
    case P_PALETTIER:   return palettier(p, ox, oy);
    case P_BROUSSE:     return brousse(p);
    case P_JONCHEE:     return jonchee(p, ox, oy);
    case P_GRILLAGE:    return grillage(p, ox, oy);
    case P_CARCASSE:    return carcasse(p, ox, oy);
    case P_BIDON:       return bidon(p, ox, oy);
    case P_PANNEAU:     return panneau(p, ox, oy);
    case P_EPAVE:       return epave(p, ox, oy);
    case P_VOILE:       return voile(p, ox, oy);
    case P_MODULE:      return module_(p, ox, oy);
    case P_CRISTAL:     return cristal(p);
    case P_ANTENNE:     return antenne(p, ox, oy);
    case P_RAIL:        return rail(p, ox, oy);
    case P_GIVRE:       return givre(p);
    case P_ANCRAGE:     return ancrage(ox, oy);
    case P_BALISE:      return balise(p, ox, oy);
    case P_PASSAGE:      return passage(p);
    case P_FLAQUE:       return flaqueRue(p);
    case P_BORNE:        return borne(p, ox, oy);
    case P_AFFICHE:      return affiche(p, ox, oy);
    case P_GRILLE_AIR:   return grilleAir(ox, oy);
    case P_DISTRIB:      return distributeur(p, ox, oy);
    case P_MOTO:         return moto(p, ox, oy);
    case P_CAGEOT:       return cageot(p, ox, oy);
    case P_PARABOLE:     return parabole(p, ox, oy);
    case P_NEON_SOL:     return neonSol(p);
    case P_PLAQUE_EGOUT: return plaqueEgout(ox, oy);
    case P_GAINE:        return gaine(p, ox, oy);
    default:            return tube(p, ox, oy);
  }
}

/* --- FRICHE : ce qui a ETE LAISSE --------------------------------------- */

/* LA BROUSSE, ET C'EST ELLE QUI DIT « ABANDONNEE » MIEUX QUE TOUTE ROUILLE. Une
   friche n'est pas une usine sombre : c'est un endroit d'ou l'homme est parti, et
   ce qui le prouve est ce qui a POUSSE depuis. Aucune touffe n'est plantee, elles
   naissent d'un centre et s'ecartent — une couronne reguliere ferait un massif.

   Pas de contour, pas de masse pleine : le module ne dessine QUE du plaque au sol,
   et un buisson qui aurait du volume se lirait comme bloquant. */
function brousse(p) {
  const n = 5 + ((p.p * 4) | 0);
  ctx.fillStyle = alpha(PROP.ombre, 0.16);
  ctx.beginPath(); ctx.ellipse(1.5, 2, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 6;
    const d = 2 + ((i * 31 + p.p * 67) % 9);
    const cx = Math.cos(a) * d, cy = Math.sin(a) * d * 0.8;
    const brins = 5 + (i % 3);
    ctx.strokeStyle = alpha(PROP.vert, 0.26 + ((i * 13 + p.p * 41) % 7) / 24);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let b = 0; b < brins; b++) {
      const ba = -Math.PI / 2 + (((b * 29 + i * 17 + p.p * 53) % 20) / 10 - 1) * 1.5;
      const l = 4 + ((b * 23 + i * 11 + p.p * 37) % 8);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ba) * l, cy + Math.sin(ba) * l);
    }
    ctx.stroke();
  }
}

/* LA JONCHEE. Du beton casse, pas de la ferraille : des blocs anguleux, clairs
   sur le dessus et sombres sur la tranche, et QUELQUES fers qui en sortent. Le
   fer est ce qui distingue un moellon d'un caillou. */
function jonchee(p, ox, oy) {
  const n = 4 + ((p.p * 4) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 7;
    const d = 3 + ((i * 41 + p.p * 79) % 15);
    const w = 5 + ((i * 19 + p.p * 47) % 8), h = w * 0.62;
    const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.82;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a * 1.3);
    ctx.fillStyle = alpha(PROP.ombre, 0.34);
    ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
    ctx.fillStyle = alpha("#7e7a6e", 0.60 + (i % 3) * 0.10);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = alpha(PROP.ombre, 0.30);
    ctx.fillRect(-w / 2, h / 2 - 1.4, w, 1.4);
    ctx.restore();
  }
  ctx.strokeStyle = alpha(PROP.rouille, 0.52);
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = p.p * 9 + i * 2.1;
    const d = 4 + ((i * 37 + p.p * 61) % 10);
    const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.8;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 1) * 6, y + Math.sin(a + 1) * 5,
                         x + Math.cos(a + 0.4) * 11, y + Math.sin(a + 0.4) * 9);
  }
  ctx.stroke();
  ctx.lineCap = "butt";
}

/* LE GRILLAGE TOMBE. Un panneau de cloture couche au sol : une maille losangee,
   AFFAISSEE en son milieu — une maille reguliere decrirait une cloture encore
   debout, et celle-ci ne l'est plus depuis longtemps. Le cadre est tordu, donc
   ses deux montants ne sont pas paralleles. */
function grillage(p, ox, oy) {
  const w = 44 + p.p * 22, h = 26 + p.p * 10;
  const gauche = h * (0.86 + p.p * 0.2), droite = h * (1.1 - p.p * 0.18);
  const bordY = (u) => (-gauche + (droite - gauche) * u) / 2;

  ctx.strokeStyle = alpha(PROP.ombre, 0.30);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const u = i / 6, x = -w / 2 + w * u;
    ctx.moveTo(x + ox, bordY(u) + oy); ctx.lineTo(x + ox, -bordY(u) + oy);
  }
  ctx.stroke();

  ctx.strokeStyle = alpha(PROP.metal, 0.24);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const u = i / 6, x = -w / 2 + w * u;
    ctx.moveTo(x, bordY(u)); ctx.lineTo(x + w / 6, -bordY(u + 1 / 6));
    ctx.moveTo(x, -bordY(u)); ctx.lineTo(x + w / 6, bordY(u + 1 / 6));
  }
  ctx.stroke();

  ctx.strokeStyle = alpha(PROP.rouille, 0.46);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-w / 2, bordY(0)); ctx.lineTo(w / 2, bordY(1));
  ctx.moveTo(-w / 2, -bordY(0)); ctx.lineTo(w / 2, -bordY(1));
  ctx.stroke();
}

/* LA CARCASSE. Une machine qu'on a videe : un chassis rouille, un tambour reste
   dedans, et une trappe OUVERTE — c'est la trappe qui dit qu'on est venu prendre
   ce qu'il y avait a prendre. */
function carcasse(p, ox, oy) {
  const w = 40 + p.p * 16, h = 26 + p.p * 9;
  ctx.fillStyle = alpha(PROP.ombre, 0.38);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha(PROP.rouille, 0.62);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#0d0c0a", 0.72);
  ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);

  ctx.strokeStyle = alpha(PROP.metalDark, 0.70);
  ctx.lineWidth = 2.2;
  ctx.strokeRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3);

  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(-w * 0.12, 0, h * 0.28, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(-w * 0.12, 0, h * 0.14, 0, Math.PI * 2); ctx.stroke();

  // la trappe, rabattue sur le cote et plus claire que le trou.
  ctx.fillStyle = alpha(PROP.rouille, 0.50);
  ctx.fillRect(w / 2 - 1, -h * 0.34, 13, h * 0.66);
  ctx.strokeStyle = alpha(PROP.metalDark, 0.60);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(w / 2 - 1, -h * 0.34, 13, h * 0.66);
}

/* LE BIDON RENVERSE. Couche, jamais debout : un fut debout est un obstacle, et
   rien ici n'a le droit de se lire comme bloquant. Deux cerclages, un fond
   ELLIPTIQUE — c'est l'ellipse qui dit qu'il est sur le flanc. */
function bidon(p, ox, oy) {
  const l = 26 + p.p * 10, r = 8 + p.p * 2.5;
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-l / 2 + ox, -r + oy, l, r * 2);
  ctx.fillStyle = alpha(PROP.rouille, 0.66);
  ctx.fillRect(-l / 2, -r, l, r * 2);
  ctx.fillStyle = alpha("#c8c4b4", 0.07);
  ctx.fillRect(-l / 2, -r, l, r * 0.7);
  ctx.strokeStyle = alpha(PROP.ombre, 0.40);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const u of [-0.22, 0.22]) {
    ctx.moveTo(l * u, -r); ctx.lineTo(l * u, r);
  }
  ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.74);
  ctx.beginPath(); ctx.ellipse(-l / 2, 0, 2.6, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.rouille, 0.40);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(l / 2, 0, 2.6, r, 0, 0, Math.PI * 2); ctx.stroke();
}

/* LE PANNEAU CASSE. Il est TOMBE, avec son pied et son massif de beton : un
   panneau encore droit dirait qu'on entretient les lieux. Sa tole est percee, et
   ce qui restait de peinture est efface — jamais sature, sinon il redevient un
   avertissement, et le canal de l'avertissement appartient au jeu. */
function panneau(p, ox, oy) {
  const w = 24 + p.p * 9, h = 17 + p.p * 6;
  ctx.strokeStyle = alpha(PROP.metalDark, 0.68);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.lineTo(w * 0.5 + 22, 4 + p.p * 5);
  ctx.stroke();
  ctx.fillStyle = alpha("#6b6a60", 0.50);
  ctx.fillRect(w * 0.5 + 20, -3 + p.p * 5, 9, 12);

  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha("#5a5a52", 0.72);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = alpha(PROP.peint, 0.16);
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  // les percements : ils traversent, donc ils sont NOIRS et non gris.
  ctx.fillStyle = alpha("#0a0a08", 0.80);
  for (let i = 0; i < 3; i++) {
    const x = -w / 2 + 4 + ((i * 37 + p.p * 71) % Math.max(1, w - 8));
    const y = -h / 2 + 3 + ((i * 23 + p.p * 53) % Math.max(1, h - 6));
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + (i % 2) * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* --- NEBULEUSE : ce qui FLOTTE ET CE QUI ARRIME ------------------------- */

/* L'EPAVE. Un fragment de coque tombe sur le pont : un polygone ANGULEUX, jamais
   un rectangle — ce qui casse ne casse pas droit. Le contour reste ferme et la
   piece plaquee au sol, comme tout ce module ; c'est sa forme qui dit qu'elle a
   ete arrachee, pas un volume. */
function epave(p, ox, oy) {
  const n = 5 + ((p.p * 3) | 0);
  const r0 = 13 + p.p * 9;
  const trace = (dx, dy, k) => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = r0 * k * (0.62 + ((i * 37 + p.p * 83) % 11) / 14);
      const x = Math.cos(a) * r + dx, y = Math.sin(a) * r * 0.78 + dy;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  trace(ox, oy, 1); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.86);
  trace(0, 0, 1); ctx.fill();
  ctx.strokeStyle = alpha(PROP.givre, 0.18);
  ctx.lineWidth = 1.2;
  trace(0, 0, 1); ctx.stroke();
  // la NERVURE interne : c'est elle qui dit « coque » plutot que « caillou ».
  ctx.strokeStyle = alpha(PROP.metal, 0.22);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r0 * 0.5, -r0 * 0.12); ctx.lineTo(r0 * 0.55, r0 * 0.10);
  ctx.moveTo(-r0 * 0.1, -r0 * 0.5); ctx.lineTo(r0 * 0.05, r0 * 0.5);
  ctx.stroke();
}

/* LA VOILE. Un panneau solaire detache : une trame de cellules, un cadre, et un
   REFLET qui ne couvre qu'une moitie. Il est bleu-noir et non gris — une voile
   ne renvoie pas la lumiere d'une station, elle boit celle d'une etoile. */
function voile(p, ox, oy) {
  const w = 46 + p.p * 26, h = 24 + p.p * 8;
  const cols = 4 + ((p.p * 3) | 0);
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha("#111a2e", 0.88);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = alpha(PROP.ombre, 0.50);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 1; i < cols; i++) {
    const x = -w / 2 + (w / cols) * i;
    ctx.moveTo(x, -h / 2 + 1.5); ctx.lineTo(x, h / 2 - 1.5);
  }
  ctx.moveTo(-w / 2 + 1.5, 0); ctx.lineTo(w / 2 - 1.5, 0);
  ctx.stroke();
  ctx.fillStyle = alpha(PROP.givre, 0.07);
  ctx.fillRect(-w / 2, -h / 2, w * 0.44, h);
  ctx.strokeStyle = alpha(PROP.metal, 0.30);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  // le BRAS d'attache : une voile sans point de fixation flotte sans raison.
  ctx.fillStyle = alpha(PROP.metalDark, 0.90);
  ctx.fillRect(w / 2 - 1, -2, 11, 4);
}

/* LE MODULE. Une capsule : deux anneaux de jonction, un hublot, une coque plus
   claire que tout le reste du semis. C'est le seul prop du lieu qui ait ete
   HABITE, et c'est ce qui lui donne son hublot. */
function module_(p, ox, oy) {
  const l = 40 + p.p * 22, r = 11 + p.p * 4;
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.beginPath();
  ctx.ellipse(ox, oy, l / 2, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = alpha("#4a5468", 0.88);
  ctx.beginPath();
  ctx.ellipse(0, 0, l / 2, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = alpha(PROP.givre, 0.10);
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.32, l / 2 - 3, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alpha(PROP.ombre, 0.46);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (const u of [-0.28, 0.30]) {
    ctx.moveTo(l * u, -r * 0.92); ctx.lineTo(l * u, r * 0.92);
  }
  ctx.stroke();
  ctx.fillStyle = alpha("#0a0f1c", 0.90);
  ctx.beginPath(); ctx.arc(l * 0.04, 0, r * 0.34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.34);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(l * 0.04, 0, r * 0.34, 0, Math.PI * 2); ctx.stroke();
}

/* LE CRISTAL. Des prismes, et il ECLAIRE — la seule source du lieu qui ne soit
   pas un appareil. Pas de contour ferme sur le halo : un contour en ferait une
   zone de jeu, et le canal du telegraphe ne se prete pas. */
function cristal(p) {
  const k = gresil(p);
  const n = 3 + ((p.p * 3) | 0);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
  grad.addColorStop(0, alpha(PROP.balise, 0.16 + 0.16 * k));
  grad.addColorStop(1, alpha(PROP.balise, 0));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 5;
    const d = 3 + ((i * 29 + p.p * 61) % 7);
    const h = 9 + ((i * 17 + p.p * 43) % 9);
    const w = 3.4 + ((i * 11 + p.p * 29) % 3);
    const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
    const ca = Math.cos(a - 0.5), sa = Math.sin(a - 0.5);
    ctx.beginPath();
    ctx.moveTo(cx + ca * h, cy + sa * h);
    ctx.lineTo(cx - sa * w, cy + ca * w);
    ctx.lineTo(cx - ca * h * 0.45, cy - sa * h * 0.45);
    ctx.lineTo(cx + sa * w, cy - ca * w);
    ctx.closePath();
    ctx.fillStyle = alpha(PROP.balise, 0.30 + 0.42 * k);
    ctx.fill();
    ctx.strokeStyle = alpha("#ffffff", 0.10 + 0.22 * k);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
}

/* L'ANTENNE. Une parabole vue de dessus, son bras et son contrepoids. Elle est
   MORTE — aucun voyant, aucune pulsation : ce qui appelle encore dans ce lieu
   est la balise, et il ne doit y avoir qu'une chose qui appelle. */
function antenne(p, ox, oy) {
  const r = 13 + p.p * 6;
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.beginPath(); ctx.ellipse(ox, oy, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.84);
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i <= 2; i++) {
    ctx.ellipse(0, 0, r * (i / 3), r * 0.62 * (i / 3), 0, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metal, 0.38);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(r * 1.5, -r * 0.30);
  ctx.moveTo(-r * 1.15, r * 0.22); ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.88);
  ctx.fillRect(-r * 1.45, r * 0.10, 6, 5);
}

function rail(p, ox, oy) {
  const l = 88 + p.p * 54;
  for (const dy of [-6, 6]) {
    ctx.fillStyle = alpha(PROP.ombre, 0.32);
    ctx.fillRect(-l / 2 + ox, dy - 2 + oy, l, 4);
    ctx.fillStyle = alpha(PROP.metalDark, 0.88);
    ctx.fillRect(-l / 2, dy - 2, l, 4);
    ctx.fillStyle = alpha(PROP.givre, 0.14);
    ctx.fillRect(-l / 2, dy - 2, l, 1.2);
  }
  ctx.fillStyle = alpha(PROP.metal, 0.16);
  for (let x = -l / 2 + 10; x < l / 2; x += 26) ctx.fillRect(x, -7, 3, 14);
}

// LE GIVRE N'A PAS DE CONTOUR : c'est un depot, pas un objet. Des taches molles
// et claires, jamais un trace ferme — un contour en ferait une zone.
function givre(p) {
  const n = 6 + ((p.p * 5) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 4;
    const d = ((i * 47 + p.p * 97) % 18);
    const r = 5 + ((i * 23 + p.p * 41) % 9);
    const grad = ctx.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0,
                                          Math.cos(a) * d, Math.sin(a) * d, r);
    grad.addColorStop(0, alpha(PROP.givre, 0.16));
    grad.addColorStop(1, alpha(PROP.givre, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ancrage(ox, oy) {
  const r = 11;
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.beginPath(); ctx.arc(ox, oy, r + 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.82);
  ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.44);
  ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = alpha(PROP.metal, 0.26);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.fillRect(Math.cos(a) * (r + 1) - 2, Math.sin(a) * (r + 1) - 2, 4, 4);
  }
}

function balise(p, ox, oy) {
  const k = gresil(p);
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.90);
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.30);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = alpha(PROP.balise, 0.28 + 0.62 * k);
  ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
}

/* --- USINE : ce qui FABRIQUE ------------------------------------------- */

/* LA BANDE DEFILE, ET C'EST LE GESTE DE CE LIEU. Un convoyeur a l'arret est un
   caisson. Le decalage est une fonction du temps modulo le PAS des taquets, donc
   il ne derive jamais et ne garde rien ; le sens depend de la cellule, sinon
   toute l'usine transporte vers la meme chose.

   Vitesse basse volontairement : a l'arret quelque chose bouge et on ne sait pas
   dire quoi, en mouvement on ne le remarque pas. C'est le budget de l'ambiance. */
const TAQUET = 9;
function convoyeur(p, ox, oy) {
  const l = 68 + p.p * 40, w = 17;
  const sens = p.p < 0.5 ? 1 : -1;
  const d = (performance.now() / 1000 * 11 * sens) % TAQUET;
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.fillRect(-l / 2 + ox, -w / 2 + oy, l, w);
  ctx.fillStyle = alpha(PROP.metalDark, 0.86);
  ctx.fillRect(-l / 2, -w / 2, l, w);

  ctx.save();
  ctx.beginPath(); ctx.rect(-l / 2, -w / 2, l, w); ctx.clip();
  ctx.strokeStyle = alpha(PROP.ombre, 0.46);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let x = -l / 2 - TAQUET + d; x < l / 2 + TAQUET; x += TAQUET) {
    ctx.moveTo(x, -w / 2 + 1.5); ctx.lineTo(x, w / 2 - 1.5);
  }
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = alpha(PROP.metal, 0.22);
  ctx.fillRect(-l / 2, -w / 2, l, 2);
  ctx.fillRect(-l / 2, w / 2 - 2, l, 2);
  // les TAMBOURS de bout : ils disent que la bande est fermee sur elle-meme.
  ctx.fillStyle = alpha(PROP.metalDark, 0.94);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * l / 2, 0, 3.4, w / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* LE BRAS. Il PIVOTE entre deux positions et s'arrete a chaque bout : un
   mouvement qui ne s'arrete jamais se lit comme une rotation libre, pas comme un
   geste commande. L'arret est ce qui dit qu'il y a un ordre derriere. */
function bras(p, ox, oy) {
  const u = CYCLE(performance.now() / 1000, 4.2 + p.p * 2.6, p.p);
  // deux tiers de course, un tiers d'arret a chaque bout
  const v = u < 0.5 ? Math.min(1, u * 3) : Math.min(1, (1 - u) * 3);
  const a0 = -0.9 + p.p * 0.5, a1 = a0 + 1.5;
  const a = a0 + (a1 - a0) * (v * v * (3 - 2 * v));
  const l1 = 16 + p.p * 5, l2 = 13 + p.p * 4;

  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.beginPath(); ctx.arc(ox, oy, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.90);
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.30);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();

  const x1 = Math.cos(a) * l1, y1 = Math.sin(a) * l1;
  const b = a + 0.85;
  const x2 = x1 + Math.cos(b) * l2, y2 = y1 + Math.sin(b) * l2;
  ctx.strokeStyle = alpha(PROP.ombre, 0.40);
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = alpha("#6a7284", 0.86);
  ctx.lineWidth = 4.6;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.92);
  ctx.beginPath(); ctx.arc(x1, y1, 3.4, 0, Math.PI * 2); ctx.fill();
  // la PINCE : deux doigts, et ils s'ecartent en bout de course.
  const e = 2.2 + v * 2.4;
  ctx.strokeStyle = alpha(PROP.metal, 0.60);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + Math.cos(b + s * 0.5) * e * 1.8, y2 + Math.sin(b + s * 0.5) * e * 1.8);
  }
  ctx.stroke();
}

/* LA PRESSE. Une masse qui descend VITE et remonte lentement, avec un temps mort
   en haut : c'est le rythme qui dit la force. L'inverse — descente lente,
   remontee vive — se lirait comme un ressort. */
function presse(p, ox, oy) {
  const u = CYCLE(performance.now() / 1000, 2.6 + p.p * 1.4, p.p * 7);
  const c = u < 0.62 ? 0 : u < 0.70 ? (u - 0.62) / 0.08 : 1 - (u - 0.70) / 0.30;
  const w = 30 + p.p * 10, h = 22 + p.p * 7;

  ctx.fillStyle = alpha(PROP.ombre, 0.38);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha("#3f4552", 0.90);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = alpha("#0b0d12", 0.72);
  ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);

  // les COLONNES de guidage, fixes — c'est par rapport a elles qu'on voit que
  // la masse bouge.
  ctx.fillStyle = alpha(PROP.metalDark, 0.88);
  for (const s of [-1, 1]) ctx.fillRect(s * (w / 2 - 5) - 2, -h / 2 + 3, 4, h - 6);

  const mh = h * 0.34;
  const my = -h / 2 + 5 + (h - mh - 10) * c;
  ctx.fillStyle = alpha(PROP.ombre, 0.50);
  ctx.fillRect(-w / 2 + 7, my + 2, w - 14, mh);
  ctx.fillStyle = alpha("#79808f", 0.92);
  ctx.fillRect(-w / 2 + 7, my, w - 14, mh);
  ctx.fillStyle = alpha(PROP.metal, 0.24);
  ctx.fillRect(-w / 2 + 7, my, w - 14, 2);
}

/* LA VENTILATION. Le seul mouvement CONTINU du lot — une soufflerie ne s'arrete
   pas —, et le seul qui tourne. Les pales restent sous la grille : une pale plus
   claire que son capot se lirait comme une piece detachee. */
function ventilation(p, ox, oy) {
  const r = 13 + p.p * 5;
  const a = performance.now() / 1000 * (1.5 + p.p * 1.1);
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.beginPath(); ctx.arc(ox, oy, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha("#0d1017", 0.88);
  ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = alpha("#4b5364", 0.60);
  for (let i = 0; i < 5; i++) {
    const b = a + (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, b, b + 0.62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = alpha(PROP.metalDark, 0.80);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const b = (i / 4) * Math.PI;
    ctx.moveTo(-Math.cos(b) * r, -Math.sin(b) * r);
    ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r);
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metal, 0.34);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r + 1, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.94);
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
}

/* LE PALETTIER. Le seul prop FIXE que l'Usine ajoute, et il lui faut l'etre :
   quatre machines animees sans rien d'immobile autour font une vitrine, pas un
   atelier. Ses alveoles ne sont pas toutes pleines — un rack plein se lit comme
   un damier. */
function palettier(p, ox, oy) {
  const w = 54 + p.p * 24, h = 20 + p.p * 7;
  const n = 3 + ((p.p * 3) | 0);
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha("#2c3038", 0.76);
  ctx.fillRect(-w / 2, -h / 2, w, h);

  for (let i = 0; i < n; i++) {
    if (((i * 37 + p.p * 71) % 10) < 3) continue;
    const aw = w / n - 4;
    const x = -w / 2 + 2 + i * (w / n);
    ctx.fillStyle = alpha(PROP.rouille, 0.44);
    ctx.fillRect(x, -h / 2 + 3, aw, h - 6);
    ctx.strokeStyle = alpha(PROP.peint, 0.16);
    ctx.lineWidth = 1;
    ctx.strokeRect(x, -h / 2 + 3, aw, h - 6);
  }

  ctx.strokeStyle = alpha(PROP.metal, 0.40);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2);
  ctx.moveTo(-w / 2, h / 2); ctx.lineTo(w / 2, h / 2);
  ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.90);
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + i * (w / n);
    ctx.fillRect(x - 1.6, -h / 2 - 1, 3.2, h + 2);
  }
}

function caisses(p, ox, oy) {
  const n = 2 + ((p.p * 3) | 0);
  for (let i = 0; i < n; i++) {
    const c = 13 + ((i * 29 + p.p * 61) % 8);
    const dx = ((i * 41 + p.p * 83) % 17) - 8, dy = ((i * 23 + p.p * 47) % 17) - 8;
    ctx.fillStyle = alpha(PROP.ombre, 0.34);
    ctx.fillRect(dx - c / 2 + ox * 1.5, dy - c / 2 + oy * 1.5, c, c);
    ctx.fillStyle = alpha(PROP.rouille, 0.52);
    ctx.fillRect(dx - c / 2, dy - c / 2, c, c);
    ctx.strokeStyle = alpha(PROP.peint, 0.22);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(dx - c / 2, dy - c / 2, c, c);
    ctx.beginPath();
    ctx.moveTo(dx - c / 2, dy); ctx.lineTo(dx + c / 2, dy);
    ctx.stroke();
  }
}

// L'ALLEE N'EST PAS UN AVERTISSEMENT : deux lignes continues et pales, pas des
// hachures. Un marquage hachure se lit comme un telegraphe.
function allee(p) {
  const l = 96 + p.p * 60;
  ctx.strokeStyle = alpha(PROP.peint, 0.13 + p.p * 0.06);
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-l / 2, -9); ctx.lineTo(l / 2, -9);
  ctx.moveTo(-l / 2, 9); ctx.lineTo(l / 2, 9);
  ctx.stroke();
}

/* --- FONDERIE : ce qui COULE ------------------------------------------- */

/* LA POCHE DE COULEE. Le plus gros prop du depot, et la plus forte source du
   sol : c'est elle qui donne a la Fonderie sa masse au niveau du semis, la ou
   les trois autres lieux n'ont que des pieces. Son bain est plus clair que son
   bord, sinon la cuve se lit comme un disque plein.

   Elle est POSEE SUR SON SOCLE, jamais suspendue : une poche en l'air demanderait
   une grue, donc un volume, et rien dans ce module n'a le droit d'en avoir un. */
function poche(p, ox, oy) {
  const r = 17 + p.p * 6;
  const k = gresil(p);
  ctx.fillStyle = alpha(PROP.ombre, 0.40);
  ctx.beginPath(); ctx.ellipse(ox, oy, r + 4, r + 3, 0, 0, Math.PI * 2); ctx.fill();

  // le socle, plus large que la cuve : c'est ce qui la pose au sol.
  ctx.fillStyle = alpha(PROP.metalDark, 0.80);
  ctx.beginPath(); ctx.ellipse(0, 0, r + 4, r + 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.brique, 0.52);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metalDark, 0.86);
  ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.stroke();

  const bain = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.72);
  bain.addColorStop(0, alpha("#ffe6b0", 0.55 + 0.35 * k));
  bain.addColorStop(0.6, alpha(PROP.fonte, 0.60 + 0.30 * k));
  bain.addColorStop(1, alpha("#7a2a08", 0.72));
  ctx.fillStyle = bain;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill();

  // la CROUTE : du metal qui refroidit en surface, et elle derive avec le bain.
  ctx.fillStyle = alpha(PROP.scorie, 0.60);
  for (let i = 0; i < 3; i++) {
    const a = p.p * 8 + i * 2.3 + performance.now() / 1000 * 0.09;
    const d = r * (0.24 + ((i * 29 + p.p * 53) % 7) / 22);
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, 4 + (i % 3), 2.6 + (i % 2), a, 0, Math.PI * 2);
    ctx.fill();
  }

  // les TOURILLONS et le BEC : sans eux c'est un chaudron, pas une poche.
  ctx.fillStyle = alpha(PROP.metalDark, 0.92);
  for (const s of [-1, 1]) ctx.fillRect(s * (r + 1) - 3, -3.4, 6, 6.8);
  ctx.beginPath();
  ctx.moveTo(r * 0.72, -5); ctx.lineTo(r + 7, 0); ctx.lineTo(r * 0.72, 5);
  ctx.closePath(); ctx.fill();
}

/* LA LINGOTIERE. Une rangee d'empreintes, et elles ne sont pas toutes au meme
   stade : une pleine et rouge, une qui a tourne au brun, une vide. Un rang
   uniforme dirait qu'on a coule d'un coup — une fonderie coule EN CONTINU, et
   c'est le degrade du rang qui le raconte. */
function moule(p, ox, oy) {
  const n = 3 + ((p.p * 3) | 0);
  const w = 15, h = 26;
  const W = n * (w + 3);
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.fillRect(-W / 2 + ox, -h / 2 + oy, W, h);
  ctx.fillStyle = alpha("#2a221e", 0.88);
  ctx.fillRect(-W / 2, -h / 2, W, h);
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 1.5 + i * (w + 3);
    const etat = ((i * 41 + p.p * 79) % 10) / 10;
    ctx.fillStyle = alpha("#050405", 0.80);
    ctx.fillRect(x, -h / 2 + 3, w, h - 6);
    if (etat < 0.28) continue;
    const c = etat < 0.55 ? PROP.scorie : etat < 0.8 ? "#8c3a12" : PROP.fonte;
    ctx.fillStyle = alpha(c, 0.55 + etat * 0.35);
    ctx.fillRect(x + 1.5, -h / 2 + 4.5, w - 3, h - 9);
    if (etat > 0.8) {
      ctx.fillStyle = alpha("#ffd9a8", 0.34);
      ctx.fillRect(x + 3.5, -h / 2 + 7, w - 7, h - 14);
    }
  }
  ctx.strokeStyle = alpha(PROP.metal, 0.24);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-W / 2, -h / 2, W, h);
}

/* LA TREMIE. Ce qui ENTRE dans une fonderie : de la charge, versee par une
   goulotte. Elle est vue de dessus, donc c'est son ouverture qu'on lit — un
   trapeze sombre — et le tas qui a debordé au pied. */
function tremie(p, ox, oy) {
  const w = 30 + p.p * 12, h = 22 + p.p * 8;
  ctx.fillStyle = alpha(PROP.ombre, 0.36);
  ctx.beginPath();
  ctx.moveTo(-w / 2 + ox, -h / 2 + oy); ctx.lineTo(w / 2 + ox, -h / 2 + oy);
  ctx.lineTo(w * 0.28 + ox, h / 2 + oy); ctx.lineTo(-w * 0.28 + ox, h / 2 + oy);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = alpha("#3c3630", 0.90);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w * 0.28, h / 2); ctx.lineTo(-w * 0.28, h / 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = alpha("#070605", 0.86);
  ctx.beginPath();
  ctx.moveTo(-w * 0.36, -h * 0.28); ctx.lineTo(w * 0.36, -h * 0.28);
  ctx.lineTo(w * 0.17, h * 0.34); ctx.lineTo(-w * 0.17, h * 0.34);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2);
  ctx.stroke();

  ctx.fillStyle = alpha(PROP.scorie, 0.62);
  for (let i = 0; i < 5; i++) {
    const x = (((i * 37 + p.p * 71) % 20) / 20 - 0.5) * w * 0.8;
    const y = h / 2 + ((i * 23 + p.p * 47) % 7) * 0.8;
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
}

/* L'OUTILLAGE. Des ringards et des pinces, poses EN FAISCEAU contre rien : c'est
   le seul prop du lieu qui parle de la MAIN qui travaille ici. Les manches
   partent d'un point commun, jamais paralleles — un rateau range est un rateau
   qu'on n'utilise pas. */
function outillage(p, ox, oy) {
  const n = 3 + ((p.p * 3) | 0);
  const bx = -14, by = 6;
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const a = -0.9 + (i / Math.max(1, n - 1)) * 0.8 + p.p * 0.3;
    const l = 30 + ((i * 31 + p.p * 61) % 12);
    const ex = bx + Math.cos(a) * l, ey = by + Math.sin(a) * l;
    ctx.strokeStyle = alpha(PROP.ombre, 0.34);
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(bx + ox, by + oy); ctx.lineTo(ex + ox, ey + oy); ctx.stroke();
    ctx.strokeStyle = alpha(PROP.metalDark, 0.86);
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
    // le bout de l'outil : crochet, palette ou fourche selon le tirage.
    ctx.strokeStyle = alpha(PROP.metal, 0.46);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const t = (i + ((p.p * 3) | 0)) % 3;
    if (t === 0) ctx.arc(ex, ey, 3.6, a - 2.2, a + 0.8);
    else if (t === 1) {
      ctx.moveTo(ex - Math.sin(a) * 4, ey + Math.cos(a) * 4);
      ctx.lineTo(ex + Math.sin(a) * 4, ey - Math.cos(a) * 4);
    } else {
      for (const s of [-1, 0, 1]) {
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(a + s * 0.4) * 5, ey + Math.sin(a + s * 0.4) * 5);
      }
    }
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.fillStyle = alpha(PROP.rouille, 0.50);
  ctx.beginPath(); ctx.ellipse(bx, by, 5, 3.4, 0.3, 0, Math.PI * 2); ctx.fill();
}

function rigole(p) {
  const l = 74 + p.p * 46, w = 13;
  const k = gresil(p);
  ctx.fillStyle = alpha(PROP.ombre, 0.55);
  ctx.fillRect(-l / 2, -w / 2, l, w);
  ctx.fillStyle = alpha(PROP.brique, 0.44);
  ctx.fillRect(-l / 2, -w / 2, l, 2.6);
  ctx.fillRect(-l / 2, w / 2 - 2.6, l, 2.6);
  ctx.fillStyle = alpha(PROP.fonte, 0.30 + 0.34 * k);
  ctx.fillRect(-l / 2 + 2, -w / 2 + 3.4, l - 4, w - 6.8);
  ctx.fillStyle = alpha("#ffd9a8", 0.22 + 0.30 * k);
  ctx.fillRect(-l / 2 + 6, -1.1, l - 12, 2.2);
  ctx.fillStyle = alpha(PROP.scorie, 0.60);
  for (let i = 0; i < 3; i++) {
    const x = -l / 2 + 12 + ((i * 37 + p.p * 71) % Math.max(1, l - 24));
    ctx.fillRect(x, -w / 2 + 3.4, 5 + (i % 3) * 3, w - 6.8);
  }
}

function lingots(p, ox, oy) {
  const n = 3 + ((p.p * 3) | 0);
  for (let i = 0; i < n; i++) {
    const w = 22, h = 7;
    const dy = (i - (n - 1) / 2) * (h + 1.6);
    const dx = ((i * 31 + p.p * 53) % 9) - 4;
    ctx.fillStyle = alpha(PROP.ombre, 0.34);
    ctx.fillRect(dx - w / 2 + ox, dy - h / 2 + oy, w, h);
    ctx.fillStyle = alpha(PROP.metalDark, 0.90);
    ctx.beginPath();
    ctx.moveTo(dx - w / 2, dy + h / 2);
    ctx.lineTo(dx - w / 2 + 2.6, dy - h / 2);
    ctx.lineTo(dx + w / 2 - 2.6, dy - h / 2);
    ctx.lineTo(dx + w / 2, dy + h / 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = alpha(PROP.metal, 0.16);
    ctx.fillRect(dx - w / 2 + 3, dy - h / 2, w - 6, 1.4);
  }
}

function scorie(p) {
  const n = 5 + ((p.p * 5) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 5;
    const d = 5 + ((i * 43 + p.p * 89) % 16);
    const r = 3.5 + ((i * 19 + p.p * 37) % 6);
    ctx.fillStyle = alpha(PROP.scorie, 0.50 + (i % 3) * 0.12);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = alpha(PROP.ombre, 0.24);
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
}


function caillebotis(ox, oy) {
  const w = 34, h = 22;
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.fillStyle = alpha(PROP.ombre, 0.55);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = alpha(PROP.metal, 0.26);
  ctx.lineWidth = 1.4;
  for (let x = -w / 2 + 3; x < w / 2; x += 4.5) {
    ctx.beginPath(); ctx.moveTo(x, -h / 2 + 1.5); ctx.lineTo(x, h / 2 - 1.5); ctx.stroke();
  }
  ctx.strokeStyle = alpha(PROP.metal, 0.34);
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
}

function cable(p) {
  const l = 46 + p.p * 34;
  const n = 2 + ((p.p * 3) | 0);
  for (let i = 0; i < n; i++) {
    const dy = (i - (n - 1) / 2) * 2.8;
    const bosse = 5 + p.p * 6;
    ctx.strokeStyle = alpha(PROP.ombre, 0.34);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-l / 2 + 1, dy + 1.4);
    ctx.quadraticCurveTo(0, dy + bosse + 1.4, l / 2 + 1, dy + 1.4);
    ctx.stroke();
    ctx.strokeStyle = alpha(PROP.metalDark, 0.62);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-l / 2, dy);
    ctx.quadraticCurveTo(0, dy + bosse, l / 2, dy);
    ctx.stroke();
  }
}

function tuyau(ox, oy) {
  const l = 58, r = 5;
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-l / 2 + ox, -r + oy, l, r * 2);
  ctx.fillStyle = alpha(PROP.metalDark, 0.80);
  ctx.fillRect(-l / 2, -r, l, r * 2);
  ctx.fillStyle = alpha(PROP.metal, 0.20);
  ctx.fillRect(-l / 2, -r, l, 1.8);
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-l / 2, r - 1.4, l, 1.4);
  ctx.fillStyle = alpha(PROP.metal, 0.16);
  for (const x of [-l / 2 + 8, 0, l / 2 - 8]) ctx.fillRect(x - 1.6, -r - 1.4, 3.2, r * 2 + 2.8);
}

function debris(p, ox, oy) {
  const n = 3 + ((p.p * 4) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.p * 6;
    const d = 4 + ((i * 37 + p.p * 91) % 13);
    const w = 2.4 + ((i * 17 + p.p * 53) % 5);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a * 1.7);
    ctx.fillStyle = alpha(PROP.ombre, 0.36);
    ctx.fillRect(-w / 2 + ox, -w / 3 + oy, w, w * 0.66);
    ctx.fillStyle = alpha(i % 3 === 0 ? PROP.rouille : PROP.metalDark, 0.72);
    ctx.fillRect(-w / 2, -w / 3, w, w * 0.66);
    ctx.restore();
  }
}

// LE MARQUAGE PEINT EST EFFACE, PAS NEUF : c'est ce qui l'empeche de se lire
// comme un telegraphe. Il n'est jamais sature, jamais anime.
function marquage(p) {
  const w = 52, h = 15;
  ctx.save();
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
  ctx.strokeStyle = alpha(PROP.peint, 0.16 + p.p * 0.10);
  ctx.lineWidth = 5;
  for (let x = -w; x < w; x += 11) {
    ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h * 1.2, -h); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = alpha(PROP.peint, 0.13);
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
}


function tube(p, ox, oy) {
  const l = 40, r = 2.6;
  const k = gresil(p);
  ctx.fillStyle = alpha(PROP.ombre, 0.34);
  ctx.fillRect(-l / 2 + ox, -r + oy, l, r * 2);
  ctx.fillStyle = alpha(PROP.verre, 0.22);
  ctx.fillRect(-l / 2, -r, l, r * 2);
  ctx.fillStyle = alpha(PROP.led, 0.18 + 0.62 * k);
  ctx.fillRect(-l / 2 + 2, -r + 0.8, l - 4, r * 2 - 1.6);
  ctx.fillStyle = alpha(PROP.metalDark, 0.85);
  ctx.fillRect(-l / 2 - 2, -r - 1, 4, r * 2 + 2);
  ctx.fillRect(l / 2 - 2, -r - 1, 4, r * 2 + 2);
}

/* --- SECTEUR : ce qu on a POSE ou JETE ------------------------------------

   Une rue habitee n a pas la quincaillerie d un atelier. Ce qui traine ici a ete
   POSE par quelqu un (bornes, cageots, moto) ou JETE par quelqu un (flaques,
   affiches decollees) — jamais monte. C est ce qui separe ses douze props du
   fonds industriel que les trois premiers lieux partagent, et c est la meme
   regle qui avait deja fait retirer la quincaillerie terrestre de la Nebuleuse.

   ET IL EST LE SEUL A AVOIR QUATRE SOURCES DE LUMIERE AU SOL : une rue s eclaire
   par ce qui la borde, pas par son ciel. */

// LE PASSAGE PIETON : la seule chose peinte de ce lieu, et elle est EFFACEE par
// endroits — une bande sur quatre manque. Une peinture neuve dirait entretenu.
function passage(p) {
  const n = 5, pas = 11;
  for (let i = 0; i < n; i++) {
    const use = ((p.p * 97 + i * 31) | 0) % 4 === 0;
    ctx.fillStyle = alpha("#c8cede", use ? 0.05 : 0.13);
    ctx.fillRect(-n * pas / 2 + i * pas, -13, pas - 4, 26);
  }
}

/* LA FLAQUE : elle ne fait rien, elle REND. Une tache sombre, et deux traits
   clairs etires VERS LE HAUT — un reflet est toujours plus long que ce qu il
   reflete, et c est ce qui le fait lire comme un reflet plutot que comme une
   tache lumineuse. Elle ne lit rien de son entourage : la ville qu elle rend est
   une fonction de sa graine, comme tout le reste du semis. */
function flaqueRue(p) {
  const r = 9 + p.p * 7;
  ctx.fillStyle = alpha("#080610", 0.34);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.5, r * 0.72, p.p * 3, 0, Math.PI * 2);
  ctx.fill();
  const col = p.p < 0.5 ? "#ff3d9a" : "#4de0ff";
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, alpha(col, 0));
  g.addColorStop(0.5, alpha(col, 0.16));
  g.addColorStop(1, alpha(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r * 0.5, -r * 0.9, 2.4, r * 1.8);
  ctx.fillRect(r * 0.2, -r * 0.7, 1.6, r * 1.4);
}

// LA BORNE : un pied lumineux de trottoir. Elle RESPIRE — mouvement continu et
// periodique, donc de la matiere, jamais un telegraphe.
function borne(p, ox, oy) {
  ctx.fillStyle = alpha(PROP.ombre, 0.24);
  ctx.beginPath(); ctx.ellipse(ox, oy + 2, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.metalDark, 0.86);
  ctx.fillRect(-3, -9, 6, 18);
  const k = gresil(p);
  ctx.fillStyle = alpha("#ff3d9a", 0.34 + 0.5 * k);
  ctx.fillRect(-2, -6, 4, 11);
}

/* L AFFICHE DECOLLEE : le seul prop du depot qui soit du PAPIER. Plaquee au sol
   comme tout le reste — c est ce qui est TOMBE d un mur, pas ce qui y est
   encore. Son coin est CORNE : sans lui, c est un rectangle lumineux, donc un
   ecran, donc un objet qui fonctionne. */
function affiche(p, ox, oy) {
  const w = 15 + p.p * 9, h = 20 + p.p * 8;
  ctx.fillStyle = alpha(PROP.ombre, 0.18);
  ctx.fillRect(-w / 2 + ox, -h / 2 + oy, w, h);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w / 2, h / 2 - 6);
  ctx.lineTo(w / 2 - 7, h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();
  ctx.fillStyle = alpha("#1a1226", 0.80);
  ctx.fill();
  ctx.fillStyle = alpha("#ff3d9a", 0.30 + 0.30 * gresil(p));
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.42);
  ctx.fillStyle = alpha("#e6ecf4", 0.14);
  for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + 4, h * 0.02 + i * 4, w - 9 - i * 3, 1.6);
}

// LA GRILLE D AIR : la bouche d extraction d en dessous, au ras du trottoir.
function grilleAir(ox, oy) {
  ctx.fillStyle = alpha(PROP.ombre, 0.20);
  ctx.fillRect(-13 + ox, -9 + oy, 26, 18);
  ctx.fillStyle = alpha("#0d0b14", 0.72);
  ctx.fillRect(-13, -9, 26, 18);
  ctx.strokeStyle = alpha(PROP.metal, 0.24);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let y = -6; y <= 6; y += 4) { ctx.moveTo(-11, y); ctx.lineTo(11, y); }
  ctx.stroke();
}

// LE DISTRIBUTEUR : la seule chose de la rue qui FONCTIONNE encore, et son ecran
// est le seul cyan du lieu qui ne soit pas un reflet.
function distributeur(p, ox, oy) {
  ctx.fillStyle = alpha(PROP.ombre, 0.24);
  ctx.fillRect(-8 + ox, -11 + oy, 16, 22);
  ctx.fillStyle = alpha(PROP.metalDark, 0.90);
  ctx.fillRect(-8, -11, 16, 22);
  ctx.strokeStyle = alpha(PROP.metal, 0.22);
  ctx.lineWidth = 1;
  ctx.strokeRect(-8, -11, 16, 22);
  ctx.fillStyle = alpha("#4de0ff", 0.26 + 0.34 * gresil(p));
  ctx.fillRect(-5, -8, 10, 8);
  ctx.fillStyle = alpha("#000000", 0.50);
  ctx.fillRect(-5, 3, 10, 5);
}

// LA MOTO COUCHEE : ce qu on a laisse tomber la. Un cadre et deux roues, a plat.
function moto(p, ox, oy) {
  ctx.fillStyle = alpha(PROP.ombre, 0.22);
  ctx.beginPath(); ctx.ellipse(ox, oy, 19, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metalDark, 0.88);
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-15, 2); ctx.lineTo(-4, -4); ctx.lineTo(7, -2); ctx.lineTo(15, 3);
  ctx.stroke();
  ctx.strokeStyle = alpha("#0a0810", 0.86);
  ctx.lineWidth = 2.6;
  for (const cx of [-14, 14]) { ctx.beginPath(); ctx.arc(cx, 2, 5.5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = alpha("#ff3d9a", 0.14);
  ctx.fillRect(-2, -5, 7, 2.4);
}

// LES CAGEOTS : ce qu on empile derriere une boutique. Trois, jamais alignes.
function cageot(p, ox, oy) {
  for (let i = 0; i < 3; i++) {
    const dx = ((p.p * 37 + i * 13) % 9) - 4, dy = ((p.p * 53 + i * 7) % 7) - 3;
    ctx.fillStyle = alpha(PROP.ombre, 0.18);
    ctx.fillRect(dx - 6 + ox, dy - 5 + oy, 12, 10);
    ctx.fillStyle = alpha(PROP.rouille, 0.50);
    ctx.fillRect(dx - 6, dy - 5, 12, 10);
    ctx.strokeStyle = alpha("#000000", 0.34);
    ctx.lineWidth = 1;
    ctx.strokeRect(dx - 6, dy - 5, 12, 10);
    ctx.beginPath(); ctx.moveTo(dx - 6, dy); ctx.lineTo(dx + 6, dy); ctx.stroke();
  }
}

// LA PARABOLE TOMBEE : un disque et son bras. Elle regarde le sol, maintenant.
function parabole(p, ox, oy) {
  const r = 9 + p.p * 4;
  ctx.fillStyle = alpha(PROP.ombre, 0.20);
  ctx.beginPath(); ctx.ellipse(ox, oy, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha(PROP.verre, 0.34);
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.30);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = alpha(PROP.metalDark, 0.74);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 1.5, r * 0.5); ctx.stroke();
}

// LE NEON AU SOL : un tube tombe qui ECLAIRE ENCORE. Le seul objet du lieu qui
// soit a la fois casse et vivant, et c est pour ca qu il est cyan et non magenta
// — le magenta ici est ce qui vend, le cyan ce qui reste allume tout seul.
function neonSol(p) {
  const L = 16 + p.p * 10;
  const k = gresil(p);
  ctx.strokeStyle = alpha("#4de0ff", 0.16 + 0.30 * k);
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke();
  ctx.strokeStyle = alpha("#dffaff", 0.30 + 0.5 * k);
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L * 0.62, 0); ctx.stroke();
  ctx.fillStyle = alpha(PROP.metalDark, 0.80);
  ctx.fillRect(-L - 3, -2.6, 4, 5.2);
  ctx.fillRect(L - 1, -2.6, 4, 5.2);
}

// LA PLAQUE D EGOUT : ronde et pleine, la seule du sol de ce lieu a l etre.
function plaqueEgout(ox, oy) {
  ctx.fillStyle = alpha(PROP.ombre, 0.22);
  ctx.beginPath(); ctx.arc(ox, oy, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = alpha("#141220", 0.84);
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(PROP.metal, 0.20);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
    ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
  }
  ctx.stroke();
}

// LA GAINE : le faisceau de cables qui court au pied des murs. Il PEND, il n est
// pas tendu — c est ce qui le separe du cable d atelier, qui est agrafe.
function gaine(p, ox, oy) {
  const L = 20 + p.p * 14;
  ctx.strokeStyle = alpha(PROP.ombre, 0.20);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-L + ox, oy); ctx.quadraticCurveTo(ox, 8 + oy, L + ox, oy);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = alpha(i === 1 ? PROP.rouille : PROP.metalDark, 0.60);
    ctx.lineWidth = 2.2 - i * 0.4;
    ctx.beginPath();
    ctx.moveTo(-L, i * 1.6 - 1.6);
    ctx.quadraticCurveTo(0, 8 + i * 1.4, L, i * 1.6 - 1.6);
    ctx.stroke();
  }
}

/* --- LA MATIERE DU SOL, PAR QUARTIER -------------------------------------

   UN LIEU N AVAIT QU UNE SEULE MATIERE. La tuile de `material.js` est cuite une
   fois par (lieu, mode, graine) : elle donne au sol son grain et sa couleur, et
   c est tout ce qu il dit. Deux endroits d une meme Usine — devant une presse et
   au fond d un rack — portent donc exactement le meme beton, alors que ce qui
   distingue l un de l autre dans une vraie installation n est pas le materiau
   mais ce qui lui est ARRIVE.

   SIX PRIMITIVES PARTAGEES, PAS SOIXANTE MARQUES. Le brief demande une grammaire
   de materiaux, pas un catalogue : les memes six gestes — rouler, souiller,
   empoussierer, cendrer, rayer, ruisseler — suffisent aux cinq lieux, et c est la
   TABLE qui dit lequel appartient a quel quartier. Ajouter un lieu = une ligne.

   ELLES SUIVENT LE QUARTIER, DONC L ARCHITECTURE. C est ce qui les separe d une
   texture de plus : une trace de roulage n a de sens que dans une circulation,
   une souillure que la ou quelque chose fonctionne. Posees au hasard, ce serait
   du bruit avec des noms.

   MEME CONTRAT QUE LE SEMIS : fonction pure de (cellule, graine), rien ne
   s alloue, et le tout est recalcule seulement quand la fenetre de cellules
   change. `null` est permis — un quartier sans trace est du sol NU, et le
   contraste en a besoin ; `verifierTraces()` exige seulement qu un lieu en pose
   au moins deux differentes. */

const TRACE_ROULAGE = 1, TRACE_SOUILLURE = 2, TRACE_POUSSIERE = 3,
      TRACE_CENDRES = 4, TRACE_RAYURES = 5, TRACE_RUISSELLEMENT = 6,
      TRACE_CORROSION = 7, TRACE_FISSURES = 8, TRACE_DECHETS = 9,
      TRACE_AUREOLE = 10, TRACE_COULEE = 11;

/* UNE TRACE N EST PAS UN MOTIF, C EST LA CONSEQUENCE DE QUELQUE CHOSE QUI EST
   ENCORE LA. C est ce qui la separe d une texture, et le depot ne le disait pas :
   les neuf primitives se posaient au hasard DANS leur quartier sans jamais
   regarder l objet dont elles sont la trace.
   LA SOURCE EXISTAIT DEJA, ET C EST MESURE : une trace n est posee que si
   `sonder` rend un quartier, donc QUE si un bloc est a moins de
   `PORTEE_QUARTIER` — 18 a 30 % des cellules selon le theme. Ce qui manquait
   n etait pas la source, c est qu aucune primitive ne s en servait ; `sonder`
   la calculait et la JETAIT.
   PAS DE TABLE DE CLASSE. Une premiere version en portait une — libre, ancree,
   orientee — dont le seul lecteur etait un controle de completude SUR
   ELLE-MEME. Ce qu elle disait est deja porte par la signature : une primitive
   qui prend `(ax, ay)` s en sert, les autres non. */

/* LES TROIS DERNIERES PRIMITIVES DU BRIEF NE SONT PAS UN AJOUT, ELLES SONT UN
   DEDOUBLONNAGE. Trois lieux repetaient une matiere sur deux quartiers — la
   fonderie posait deux fois des cendres, la Nebuleuse deux fois des rayures, le
   Secteur deux fois du ruissellement — donc deux de leurs quatre quartiers se
   ressemblaient. Corrosion, fissures et dechets prennent ces trois places : la
   variete monte sans qu un seul quartier perde son sens, et `null` reste ou il
   est, parce que le sol NU est ce qui fait lire les autres. */

const TRACES_CONNUES = new Set([TRACE_ROULAGE, TRACE_SOUILLURE, TRACE_POUSSIERE,
                                TRACE_CENDRES, TRACE_RAYURES, TRACE_RUISSELLEMENT,
                                TRACE_CORROSION, TRACE_FISSURES, TRACE_DECHETS,
                                TRACE_AUREOLE, TRACE_COULEE]);

/* L AIR D UNE REGION — LA SECONDE MOITIE DE CE QUI FAIT UN BIOME.

   LA PALETTE DIT QU ON A CHANGE DE REGION, L AIR DIT LAQUELLE. Une loi
   d implantation ne deplace que des blocs, et a une dizaine de blocs par ecran
   ca ne se voit pas ; la teinte du sol se voit tout de suite mais ne raconte
   rien. Ce qui raconte est ce qu on trouve par terre : COMBIEN (`dens`, en
   facteur de la densite du theme), GROS COMMENT (`ech`), QUOI (`zones`, un
   sous-ensemble des quartiers de props du theme) et CE QUI A MARQUE LE SOL
   (`matieres`, une par zone tiree).

   LE THEME GARDE SON VOCABULAIRE, LA REGION N EN TIRE QU UNE PART. Une friche
   pose toujours des brousses et des carcasses ; le champ en pose beaucoup et
   grandes, le mur pose surtout des clotures, l effondrement pose tout et serre.
   C est la difference entre « un autre lieu » et « un autre endroit du meme
   lieu », et c est toute la regle.

   LA LOI 0 EST LA REFERENCE : `dens` vaut 1 et `ech` reprend `ECHELLE_LIEU` — ce
   n est pas une duplication mais un invariant, et `verifierAir` le compare. */
/* DEUX REGIONS AU MEME VOCABULAIRE SONT UNE SEULE REGION, ET C ETAIT LE CAS DE
   QUATRE THEMES SUR CINQ. `zones` etait tire dans un ORDRE different — usine
   [2,1] contre [1,2], nebuleuse [0,2] contre [2,0], secteur [0,1] contre [1,0] —
   et l ordre ne change rien a un ENSEMBLE : les deux regions posaient exactement
   les memes props et ne differaient plus que par `dens` et `ech`, un nombre et
   un calibre. La friche faisait pire : [2,1] contre [0,2,1], donc une region
   STRICTEMENT INCLUSE dans l autre, et l union des trois zones rendait les huit
   memes props.
   Les MATIERES avaient le meme defaut, et sur les memes themes : quatre paires
   de regions posaient le meme jeu de traces, la Nebuleuse deux fois.
   `verifierVocabulaire` compare maintenant les regions deux a deux ; rien ne le
   faisait, et les deux tables etaient vertes. */
const AIR = {
  usine: [
    { dens: 1.00, ech: [0.72, 0.66], zones: [0, 2], matieres: [TRACE_SOUILLURE, TRACE_ROULAGE] },
    { dens: 0.82, ech: [0.70, 0.60], zones: [2, 1], matieres: [TRACE_ROULAGE, TRACE_POUSSIERE] },
    // la maintenance ne tire QUE de l entretien : on n y fabrique rien.
    { dens: 1.34, ech: [0.56, 0.48], zones: [3], matieres: [TRACE_SOUILLURE] },
    // le degagement ENTRETIENT et STOCKE, il ne fabrique pas : c est la seule
    // region du theme qui ne tire aucune zone de production.
    { dens: 0.58, ech: [0.88, 0.86], zones: [1, 3], matieres: [TRACE_POUSSIERE, TRACE_FISSURES] },
    /* UNE SEULE ZONE, ET C EST CE QUI LES SEPARE DE TOUT LE RESTE. Le theme n a
       que quatre quartiers de props : a six regions, les paires distinctes sont
       epuisees. Un magasin ne pose QUE du stockage et une expedition QUE de la
       circulation — un inventaire etroit est une identite, pas un manque. */
    { dens: 0.90, ech: [0.66, 0.54], zones: [1], matieres: [TRACE_ROULAGE] },
    { dens: 0.70, ech: [0.80, 0.70], zones: [2], matieres: [TRACE_RAYURES] },
    // la retention des utilites DEBORDE : une aureole autour de ce qui a fui.
    { dens: 0.76, ech: [0.74, 0.62], zones: [0, 3], matieres: [TRACE_POUSSIERE, TRACE_AUREOLE] },
  ],
  fonderie: [
    { dens: 1.00, ech: [0.80, 0.70], zones: [0, 1], matieres: [TRACE_SOUILLURE, TRACE_CENDRES] },
    // le sable COULE des malaxeurs, et la coulee pointe vers celui qui l a lache.
    { dens: 1.18, ech: [0.74, 0.58], zones: [1, 2], matieres: [TRACE_COULEE, TRACE_CORROSION] },
    // le bassin laisse un depot de sels en s evaporant : une aureole, pas une tache.
    { dens: 0.78, ech: [0.90, 0.76], zones: [2, 3], matieres: [TRACE_AUREOLE, TRACE_CORROSION] },
    { dens: 0.66, ech: [0.98, 0.92], zones: [0, 3], matieres: [TRACE_CENDRES, TRACE_RAYURES] },
  ],
  friche: [
    { dens: 1.00, ech: [0.66, 0.92], zones: [0, 1], matieres: [TRACE_POUSSIERE, null] },
    { dens: 1.12, ech: [0.58, 0.78], zones: [2, 1], matieres: [TRACE_POUSSIERE, TRACE_SOUILLURE] },
    // l huile coule des piles d epaves, toujours vers le bas de la pile.
    { dens: 0.70, ech: [0.82, 1.08], zones: [1, 3], matieres: [TRACE_COULEE, TRACE_SOUILLURE] },
    // ce qui FERMAIT et le peu qui reste ALLUME : deux zones, pas trois. Trois
    // zones sur quatre rendaient l union du theme entier.
    { dens: 1.40, ech: [0.52, 1.14], zones: [2, 3], matieres: [TRACE_SOUILLURE, TRACE_CENDRES] },
    // un chantier n a RIEN a lui : ce qui traine est ce qui fermait le terrain.
    { dens: 0.64, ech: [0.72, 0.90], zones: [2], matieres: [TRACE_FISSURES] },
  ],
  nebuleuse: [
    // la derive tire l EPAVE et ce qui a gele dessus, jamais l amarrage : a
    // [0,3] elle partageait 71 % de ses props avec le dock.
    { dens: 1.00, ech: [0.90, 1.05], zones: [0, 2], matieres: [TRACE_RAYURES, null] },
    // un dock ne pose QUE ce a quoi on s amarre : balise, antenne, rail, ancrage.
    { dens: 1.10, ech: [0.66, 0.70], zones: [3], matieres: [TRACE_FISSURES] },
    // la coursive tire ce qui FLOTTE et ce a quoi on s AMARRE, jamais la
    // signaletique du dock : a [1,3] elle partageait 83 % de ses props avec lui.
    { dens: 0.52, ech: [1.30, 1.34], zones: [0, 1], matieres: [TRACE_CORROSION, null] },
    { dens: 0.86, ech: [0.80, 1.00], zones: [1, 2], matieres: [TRACE_RAYURES, TRACE_DECHETS] },
  ],
  secteur: [
    { dens: 1.00, ech: [0.60, 0.52], zones: [0, 1], matieres: [TRACE_RUISSELLEMENT, TRACE_ROULAGE] },
    // la chaussee et ce qui la DESSERT par derriere : la place n est pas une rue
    // vue de plus loin, elle a son propre inventaire.
    { dens: 0.84, ech: [0.70, 0.62], zones: [1, 2], matieres: [TRACE_RUISSELLEMENT, TRACE_SOUILLURE] },
    { dens: 1.38, ech: [0.48, 0.40], zones: [3, 2], matieres: [TRACE_DECHETS, TRACE_SOUILLURE] },
    { dens: 0.60, ech: [0.82, 0.74], zones: [0, 3], matieres: [TRACE_ROULAGE, TRACE_FISSURES] },
  ],
};

const airDe = (cle, loi) => {
  const t = AIR[cle] ?? AIR.usine;
  return t[loi] ?? t[0];
};

/* DEUX REGIONS D UN THEME DOIVENT AVOIR DEUX AIRS, et les deux tables se
   croisent dans les deux sens — une zone de props que plus aucune region ne tire
   disparait du jeu en silence, exactement le piege que `CLAUDE.md` nomme en
   premier. Il remplace `verifierTraces` : les matieres ne sont plus par theme. */
/* DEUX REGIONS D UN THEME NE PEUVENT PAS AVOIR LE MEME VOCABULAIRE.

   C EST LE PREMIER VERIFICATEUR DU SEMIS QUI COMPARE DEUX REGIONS ENTRE ELLES.
   `verifierZones` croise `TABLE` et `ZONES` — un prop qu aucune zone ne tire —,
   `verifierTraces` croise `ZONES` et `AIR` — une zone qu aucune region ne tire.
   Les deux repondent « tout est branche », et aucun ne repond « tout est
   DIFFERENT ». Mesure a l ouverture du plan 39 : quatre themes sur cinq avaient
   deux regions au jeu de props IDENTIQUE, et quatre sur cinq au jeu de traces
   identique — la Nebuleuse deux fois. Les deux tables etaient vertes.

   LE SEUIL EST L IDENTITE, PAS UNE FRACTION, ET C EST DELIBERE. Un theme n a que
   QUATRE zones de props : deux regions qui en tirent deux chacune en partagent
   une dans quatre cas sur six, donc un Jaccard de 0,4 a 0,6 est le mieux que la
   table permette. Exiger moins interdirait la conception au lieu de la garder.
   L ecart maximal est RENDU avec le verdict : quand `ZONES` passera par biome,
   le plafond descendra sur une mesure et pas sur un gout. */
function jaccard(a, b) {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
}

export function verifierVocabulaire() {
  const soucis = [];
  let pireProps = 0, ouProps = "", pireMat = 0, ouMat = "";
  for (const [cle, zones] of Object.entries(ZONES)) {
    const t = AIR[cle];
    if (!t) continue;
    const props = t.map(a => new Set(a.zones.flatMap(z => zones[z] ?? [])));
    const mats = t.map(a => new Set((a.matieres ?? []).filter(m => m)));
    for (let i = 0; i < t.length; i++) {
      for (let j = i + 1; j < t.length; j++) {
        const jp = jaccard(props[i], props[j]);
        if (jp >= 0.999) {
          soucis.push(`${cle} : les regions ${i} et ${j} posent EXACTEMENT les memes`
            + ` ${props[i].size} props — elles ne different que par un nombre et un calibre`);
        } else if (jp > pireProps) { pireProps = jp; ouProps = `${cle} ${i}/${j}`; }
        if (mats[i].size && jaccard(mats[i], mats[j]) >= 0.999) {
          soucis.push(`${cle} : les regions ${i} et ${j} marquent le sol des memes traces`);
        } else if (mats[i].size) {
          const jm = jaccard(mats[i], mats[j]);
          if (jm > pireMat) { pireMat = jm; ouMat = `${cle} ${i}/${j}`; }
        }
      }
    }
  }
  // le pire ecart SORT avec le verdict : c est lui qui dira quand le plafond
  // peut descendre, et il ne se devine pas.
  if (soucis.length === 0 && pireProps > 0.70) {
    soucis.push(`aucune region identique, mais ${ouProps} partage ${(pireProps * 100).toFixed(0)} %`
      + ` de ses props et ${ouMat} ${(pireMat * 100).toFixed(0)} % de ses traces`);
  }
  return soucis;
}

export function verifierTraces() {
  const soucis = [];
  const tirees = new Set();
  for (const [cle, zones] of Object.entries(ZONES)) {
    const t = AIR[cle];
    const n = loisDe(cle);
    if (!t) { soucis.push(`${cle} : aucun air de region`); continue; }
    if (t.length !== n) soucis.push(`${cle} : ${t.length} airs pour ${n} lois`);
    const ref = ECHELLE_LIEU[cle] ?? [];
    if (String(t[0]?.ech) !== String(ref) || t[0]?.dens !== 1) {
      soucis.push(`${cle} : la loi 0 n est pas la reference du theme`);
    }
    for (let i = 0; i < t.length; i++) {
      const a = t[i];
      if (!(a.dens > 0 && a.dens <= 2)) soucis.push(`${cle}/loi ${i} : densite ${a.dens} hors de ]0 ; 2]`);
      if (!Array.isArray(a.ech) || a.ech.length !== 2) soucis.push(`${cle}/loi ${i} : echelle mal formee`);
      if (!a.zones?.length) soucis.push(`${cle}/loi ${i} : aucune zone de props`);
      for (const z of a.zones ?? []) {
        if (!(z >= 0 && z < zones.length)) soucis.push(`${cle}/loi ${i} : zone ${z} hors des ${zones.length}`);
      }
      if ((a.matieres ?? []).length !== (a.zones ?? []).length) {
        soucis.push(`${cle}/loi ${i} : ${(a.matieres ?? []).length} matieres pour ${(a.zones ?? []).length} zones`);
      }
      const vives = new Set((a.matieres ?? []).filter(m => m !== null));
      if (vives.size < 1) soucis.push(`${cle}/loi ${i} : aucune matiere vive`);
      for (const m of vives) {
        if (!TRACES_CONNUES.has(m)) soucis.push(`${cle}/loi ${i} : trace inconnue ${m}`);
        else tirees.add(m);
      }
    }
    for (let i = 0; i < t.length; i++) {
      for (let j = i + 1; j < t.length; j++) {
        const a = t[i], b = t[j];
        if (Math.abs(a.dens - b.dens) < 0.12 && a.zones.join() === b.zones.join()
            && String(a.matieres) === String(b.matieres) && String(a.ech) === String(b.ech)) {
          soucis.push(`${cle} : les lois ${i} et ${j} ont le meme air`);
        }
      }
    }
    const zTirees = new Set(t.flatMap(a => a.zones ?? []));
    for (let z = 0; z < zones.length; z++) {
      if (!zTirees.has(z)) soucis.push(`${cle} : la zone de props ${z} n est tiree par aucune region`);
    }
  }
  for (const cle of Object.keys(AIR)) {
    if (!ZONES[cle]) soucis.push(`air pour ${cle}, qui n est pas un theme`);
  }
  for (const t of TRACES_CONNUES) {
    if (!tirees.has(t)) soucis.push(`trace ${t} : ecrite et tiree par aucune region`);
  }
  return soucis;
}

/* LE ROULAGE : deux traces PARALLELES, et c est le parallelisme qui fait tout —
   deux bandes seules disent « un vehicule est passe la », dix disent « le sol
   est raye ». L ecartement ne varie pas dans une cellule : c est le meme engin. */
function roulage(cx, cy, x, y, s) {
  const a = h2(cx, cy, s + 211) * Math.PI;
  const e = 26 + h2(cx, cy, s + 212) * 14;
  const L = 70 + h2(cx, cy, s + 213) * 70;
  const nx = -Math.sin(a), ny = Math.cos(a);
  ctx.strokeStyle = alpha("#000000", 0.13);
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (const k of [-0.5, 0.5]) {
    ctx.moveTo(x + nx * e * k - Math.cos(a) * L, y + ny * e * k - Math.sin(a) * L);
    ctx.lineTo(x + nx * e * k + Math.cos(a) * L, y + ny * e * k + Math.sin(a) * L);
  }
  ctx.stroke();
}

/* LA SOUILLURE : ce qui a coule et qu on n a pas essuye.

   ELLE ETAIT UNE ELLIPSE, DONC ELLE N ETAIT RIEN. Le commentaire revendiquait
   « un bord net et une aureole » ; le code posait un ovale parfaitement lisse
   sous un halo radial, et un ovale lisse au sol ne se lit ni comme une flaque ni
   comme une marque — juste comme un rond. Une marque a besoin de DEUX choses
   qu une ellipse n a pas : un bord irregulier et une DIRECTION.

   Le contour est donc tire de la cellule, sept rayons, refermes en courbes par
   leurs milieux — une tache organique, pas un polygone. Et une COULEE part du
   bord dans un sens tire lui aussi de la cellule : c est elle qui dit que
   quelque chose a coule LA, et vers ou. */
const SOUILLURE_N = 7;
function souillure(cx, cy, x, y, s) {
  const r = 16 + h2(cx, cy, s + 221) * 20;
  const ap = r * (0.55 + h2(cx, cy, s + 222) * 0.4);
  const a = h2(cx, cy, s + 223) * Math.PI * 2;

  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.9);
  g.addColorStop(0, alpha("#000000", 0.20));
  g.addColorStop(0.45, alpha("#000000", 0.10));
  g.addColorStop(1, alpha("#000000", 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = alpha("#000000", 0.16);

  const px = [], py = [];
  for (let i = 0; i < SOUILLURE_N; i++) {
    const th = (i / SOUILLURE_N) * Math.PI * 2;
    const k = 0.62 + h2(cx * 31 + i, cy, s + 224) * 0.56;
    px.push(Math.cos(th) * r * k);
    py.push(Math.sin(th) * ap * k);
  }
  ctx.beginPath();
  ctx.moveTo((px[SOUILLURE_N - 1] + px[0]) / 2, (py[SOUILLURE_N - 1] + py[0]) / 2);
  for (let i = 0; i < SOUILLURE_N; i++) {
    const j = (i + 1) % SOUILLURE_N;
    ctx.quadraticCurveTo(px[i], py[i], (px[i] + px[j]) / 2, (py[i] + py[j]) / 2);
  }
  ctx.closePath();
  ctx.fill();

  // LA COULEE : une langue qui s affine. C est le seul trait DIRECTIONNEL de la
  // marque, donc le seul qui la distingue d une tache posee.
  const L = r * (1.3 + h2(cx, cy, s + 225) * 1.5);
  ctx.beginPath();
  ctx.moveTo(r * 0.2, -ap * 0.42);
  ctx.quadraticCurveTo(r * 0.9, -ap * 0.22, L, 0);
  ctx.quadraticCurveTo(r * 0.9, ap * 0.26, r * 0.2, ap * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* LA POUSSIERE : un film CLAIR, et il a un bord BALAYE. C est le seul de ces
   gestes qui ajoute de la clarte au lieu d en retirer, et c est ce qui le rend
   lisible sur un sol sombre.

   LE DEGRADE ETAIT RADIAL DANS UN TRAPEZE, donc il debordait de son arete par
   tous les cotes et rendait le trapeze invisible : il ne restait qu une aureole
   claire, exactement ce que le commentaire disait vouloir eviter. Il est
   maintenant LINEAIRE et PERPENDICULAIRE a l arete balayee — dense contre elle,
   eteint de l autre cote —, et le bord oppose est irregulier. Un coup de balai a
   un cote net et un cote qui fuit. */
function poussiere(cx, cy, x, y, s) {
  const L = 40 + h2(cx, cy, s + 231) * 44;
  const W = L * (0.34 + h2(cx, cy, s + 232) * 0.30);
  const a = h2(cx, cy, s + 233) * Math.PI;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
  g.addColorStop(0, alpha("#c8cede", 0.085));
  g.addColorStop(0.55, alpha("#c8cede", 0.030));
  g.addColorStop(1, alpha("#c8cede", 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-L / 2, -W / 2);
  ctx.lineTo(L / 2, -W / 2);
  for (let i = 4; i >= 0; i--) {
    ctx.lineTo(-L / 2 + (i / 4) * L,
               W / 2 * (0.55 + h2(cx * 17 + i, cy, s + 234) * 0.60));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// LES CENDRES : un semis de points, pas une nappe. Ce qui a brule est retombe
// en morceaux, et des morceaux se comptent.
function cendres(cx, cy, x, y, s) {
  ctx.fillStyle = alpha("#000000", 0.22);
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i * 2.399 + h2(cx, cy, s + 241) * 31) % (Math.PI * 2);
    const d = Math.sqrt((i * 0.618 + h2(cx, cy, s + 242)) % 1) * 52;
    const t = 2 + ((i * 5) % 3);
    ctx.rect(x + Math.cos(a) * d, y + Math.sin(a) * d, t, t);
  }
  ctx.fill();
}

/* LES RAYURES : le seul geste qui n a pas besoin de gravite, donc le seul que la
   Nebuleuse puisse porter. Elles sont FINES, DROITES et presque paralleles —
   quelque chose a frotte le long de la coque, ca n a pas coule dessus. */
function rayures(cx, cy, x, y, s) {
  const a = h2(cx, cy, s + 251) * Math.PI;
  const ca = Math.cos(a), sa = Math.sin(a);
  ctx.strokeStyle = alpha("#c8cede", 0.075);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const off = (i - 2) * (7 + h2(cx, cy, s + 252 + i) * 6);
    const L = 30 + h2(cx, cy, s + 258 + i) * 46;
    ctx.moveTo(x - sa * off - ca * L, y + ca * off - sa * L);
    ctx.lineTo(x - sa * off + ca * L, y + ca * off + sa * L);
  }
  ctx.stroke();
}

/* LE RUISSELLEMENT : de l eau suit la PENTE, elle ne fait pas de tache. Des
   filets qui vont tous dans le meme sens dans une cellule, et qui se rejoignent
   — c est ce qui separe une chaussee mouillee d une flaque. */
function ruissellement(cx, cy, x, y, s) {
  const a = Math.PI * 0.5 + (h2(cx, cy, s + 261) - 0.5) * 0.7;
  const ca = Math.cos(a), sa = Math.sin(a);
  ctx.strokeStyle = alpha("#8f7fc4", 0.085);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) * (13 + h2(cx, cy, s + 262 + i) * 9);
    const L = 34 + h2(cx, cy, s + 266 + i) * 40;
    const x0 = x - sa * off, y0 = y + ca * off;
    // ils CONVERGENT : un filet plus loin est plus pres de l axe.
    ctx.moveTo(x0 - ca * L, y0 - sa * L);
    ctx.quadraticCurveTo(x0, y0, x - sa * off * 0.3 + ca * L, y + ca * off * 0.3 + sa * L);
  }
  ctx.stroke();
}

/* LA CORROSION : elle part d un POINT et gagne vers l exterieur, en auréoles
   de plus en plus pales. C est ce qui la separe d une souillure — une tache
   renversee a un bord, une rouille a un FOYER et n en a pas. */
function corrosion(cx, cy, x, y, s) {
  const r0 = 9 + h2(cx, cy, s + 271) * 7;
  for (let i = 3; i >= 0; i--) {
    const r = r0 * (1 + i * 0.72);
    ctx.fillStyle = alpha(PROP.rouille, 0.13 - i * 0.028);
    ctx.beginPath();
    for (let k = 0; k <= 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const rr = r * (0.74 + h2(cx * 13 + k, cy * 7 + i, s + 272) * 0.52);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}

/* LES FISSURES : un trait qui se DIVISE. Une fissure sans embranchement est
   une rayure, et la Nebuleuse en pose deja — c est la fourche qui dit que la
   matiere a cede au lieu d avoir ete frottee. */
function fissures(cx, cy, x, y, s) {
  const a0 = h2(cx, cy, s + 281) * Math.PI * 2;
  ctx.strokeStyle = alpha("#05070b", 0.30);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const sens of [1, -1]) {
    let px = x, py = y, a = a0 + (sens < 0 ? Math.PI : 0);
    ctx.moveTo(px, py);
    for (let i = 0; i < 4; i++) {
      const L = 13 + h2(cx * 5 + i, cy, s + 282) * 15;
      a += (h2(cx, cy * 3 + i, s + 283) - 0.5) * 1.05;
      px += Math.cos(a) * L; py += Math.sin(a) * L;
      ctx.lineTo(px, py);
      if (i !== 1) continue;
      const b = a + (h2(cx, cy, s + 284) - 0.5 > 0 ? 0.85 : -0.85);
      const Lb = 11 + h2(cx, cy, s + 285) * 13;
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(b) * Lb, py + Math.sin(b) * Lb);
      ctx.moveTo(px, py);
    }
  }
  ctx.stroke();
}

/* LES DECHETS : des morceaux ORIENTES AU HASARD, et c est tout ce qui les
   separe des cendres — une cendre est retombee, un emballage a ete jete. Ils
   portent donc une ombre, parce qu ils sont POSES SUR le sol et non dedans. */
function dechets(cx, cy, x, y, s) {
  for (let i = 0; i < 7; i++) {
    const a = (i * 2.399 + h2(cx, cy, s + 291) * 17) % (Math.PI * 2);
    const d = Math.sqrt((i * 0.618 + h2(cx, cy, s + 292)) % 1) * 44;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    const w = 4 + h2(cx * 11 + i, cy, s + 293) * 7;
    const h = 2.5 + h2(cx, cy * 11 + i, s + 294) * 4;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(h2(cx + i, cy, s + 295) * Math.PI);
    ctx.fillStyle = alpha(PROP.ombre, 0.16);
    ctx.fillRect(-w / 2 + 1.5, -h / 2 + 1.5, w, h);
    ctx.fillStyle = alpha(i % 3 === 0 ? PROP.peint : PROP.metal, 0.16);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
}


/* L AUREOLE — CE QUI A DEBORDE PUIS SECHE. Elle est ANCREE : un anneau pale,
   irregulier, pose contre la source et allonge dans son axe. Sans source elle
   ne se dessine pas — et c est `verifierTraces` qui garantit qu une region ne
   pose jamais QUE des traces ancrees, sinon les cellules loin de tout batî
   seraient muettes. */
const AUREOLE_N = 9;
function aureole(cx, cy, x, y, s, ax, ay) {
  const dx = ax - x, dy = ay - y;
  const l = Math.hypot(dx, dy);
  if (l < 1) return;
  const a = Math.atan2(dy, dx);
  const r = 20 + h2(cx, cy, s + 261) * 22;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  // deux passes : un depot clair au centre, un LISERE plus marque au bord —
  // c est le bord qui dit qu une flaque a seche, pas la tache.
  for (const [k, al, lw] of [[1.0, 0.055, 0], [1.0, 0.11, 2.2]]) {
    ctx.beginPath();
    for (let i = 0; i <= AUREOLE_N; i++) {
      const th = (i / AUREOLE_N) * Math.PI * 2;
      const w = 0.66 + h2(cx * 17 + i, cy, s + 262) * 0.62;
      const px = Math.cos(th) * r * 1.45 * w * k, py = Math.sin(th) * r * 0.78 * w * k;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (lw) { ctx.strokeStyle = alpha("#d8cfae", al); ctx.lineWidth = lw; ctx.stroke(); }
    else { ctx.fillStyle = alpha("#d8cfae", al); ctx.fill(); }
  }
  ctx.restore();
}

/* LA COULEE — CA S EST ECOULE DEPUIS UN POINT. Elle est ORIENTEE : elle part de
   la source, s eloigne d elle et MAIGRIT, donc elle porte un sens que rien
   d autre au sol ne porte. Trois doigts, jamais paralleles. */
function coulee(cx, cy, x, y, s, ax, ay) {
  const dx = x - ax, dy = y - ay;
  const l = Math.hypot(dx, dy);
  if (l < 6) return;
  const a = Math.atan2(dy, dx);
  const L = Math.min(l + 26, 92);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(a);
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * (5 + h2(cx * 7 + i, cy, s + 271) * 7);
    const li = L * (0.55 + h2(cx * 13 + i, cy, s + 272) * 0.45);
    const w0 = 5 + h2(cx * 5 + i, cy, s + 273) * 4;
    ctx.beginPath();
    ctx.moveTo(0, off - w0 / 2);
    ctx.quadraticCurveTo(li * 0.6, off - w0 * 0.28, li, off);
    ctx.quadraticCurveTo(li * 0.6, off + w0 * 0.28, 0, off + w0 / 2);
    ctx.closePath();
    ctx.fillStyle = alpha("#000000", 0.10 + h2(cx * 3 + i, cy, s + 274) * 0.08);
    ctx.fill();
  }
  ctx.restore();
}

function tracer(t, cx, cy, x, y, s, ax, ay) {
  switch (t) {
    case TRACE_ROULAGE:      return roulage(cx, cy, x, y, s);
    case TRACE_SOUILLURE:    return souillure(cx, cy, x, y, s);
    case TRACE_POUSSIERE:    return poussiere(cx, cy, x, y, s);
    case TRACE_CENDRES:      return cendres(cx, cy, x, y, s);
    case TRACE_RAYURES:      return rayures(cx, cy, x, y, s);
    case TRACE_RUISSELLEMENT: return ruissellement(cx, cy, x, y, s);
    case TRACE_CORROSION:    return corrosion(cx, cy, x, y, s);
    case TRACE_FISSURES:     return fissures(cx, cy, x, y, s);
    case TRACE_DECHETS:      return dechets(cx, cy, x, y, s);
    case TRACE_AUREOLE:      return aureole(cx, cy, x, y, s, ax, ay);
    case TRACE_COULEE:       return coulee(cx, cy, x, y, s, ax, ay);
  }
}

/* LE SOL SE PEINT SOUS LA GRILLE DE 20 M, comme l amer : c est de la matiere,
   pas une graduation. Et sous les props, evidemment — ce qui traine est POSE
   SUR ce qui a marque le sol, jamais l inverse.
   Le meme cache que le semis : rien ne se recalcule tant que la fenetre de
   cellules ne bouge pas. */
export function drawTraces() {
  if (gfx <= GFX_LOW) return;
  refresh();
  for (const t of traces) tracer(t.t, t.cx, t.cy, t.x, t.y, t.s, t.ax, t.ay);
}
