/* ===========================================================================
   SPRITES — atlas genere au chargement, et LE point de passage du dessin
   d'entite.

   Deux choses, indissociables.

   1. L'ATLAS. Chaque forme est une fonction de trace executee UNE fois au
      chargement, dans un canvas unique. Ensuite, chaque image de jeu n'est
      plus qu'un `drawImage` avec un rectangle source — l'operation la moins
      chere qui existe. Pas d'asset a dessiner, pas de dependance, pas d'outil
      externe : c'est la meme methode que `buildSprites()` faisait deja pour un
      seul etat par type, etendue a N images.

      LA REGLE QUI DIVISE LE BUDGET PAR DEUX : ne pas stocker en image ce
      qu'une transformation peut faire. La respiration, l'ecrasement, le recul
      au tir, l'orientation et le rang d'elite sont des `scale`, des `rotate` et
      des translations — cout nul. On ne paie que les changements de FORME :
      membres, mandibules, telegraphes, etapes de mort.

      La tentation etait de generer huit images de cycle de marche par type ;
      on en genere deux, et la respiration fait le reste gratuitement.

   2. `drawSprite`, et RIEN D'AUTRE. Monstres, joueurs, projectiles, particules,
      bonus : tout dessin d'entite passe par cette seule fonction. Le jour ou la
      couche chaude bascule vers WebGL — pas pour la fluidite, mais pour des
      capacites que le canvas 2D ne sait pas produire : lueurs additives sur des
      centaines de sprites, teinte par sprite gratuite — on reecrit CE module et
      aucun appelant ne bouge.

      C'est precisement l'erreur qui rendait la situation d'avant couteuse :
      cinq cents appels vectoriels disperses dans vingt-neuf fonctions, sans
      point de passage. Ne pas la repeter un cran au-dessus.

      Si un cas ne rentre pas dans la signature, c'est la SIGNATURE qu'on etend,
      jamais une exception qu'on ouvre. Et une seule indirection : pas
      d'interface, pas de fabrique, pas de gestionnaire de ressources — ce
      serait de l'ingenierie anticipee pour un besoin sans date.

   BUDGET REEL : 9 types x 7 images (4 formes + 3 morts) + 3 classes x 4 + 3
   particules = 78 cases de 60 px logiques (64 avec la gouttiere). A une densite
   de 2, l'atlas fait 1152 x 1152 px, soit 10,6 Mo planche de silhouettes
   comprise — sous le plafond de 12 Mo, et tres loin de la limite de 4096 px de
   cote. Le lot S l'a fait passer de 50 a 78 cases : c'est le poste qui a le plus
   grossi, et c'est aussi celui ou la regle de budget est la plus rentable — les
   quatre nouveaux types n'ont pas paye une seule image pour leur anticipation de
   ruee, leur pulsation d'imminence ni leur rang d'elite, qui sont des `scale`.
   `COLS` est passe de 7 a 9 pour garder la planche a peu pres carree : a sept
   colonnes elle faisait 896 x 1536, soit la meme surface repartie moins bien.
   Le boss n'y est pas : il est unique a l'ecran, son cout est negligeable, et il
   gagne a etre anime en continu au trace.
   =========================================================================== */

import { ENEMY, COMBAT, ramp } from "/shared/palette.js";
import { parseColor, BLEND_NORMAL, BLEND_ADD } from "/gl.js";

/* Cote d'une case, en unites MONDE. Le plus gros sprite est le Rempart (canon
   a 23, braces a 21 et ombre portee de 16 de demi-largeur) plus son contour de
   3,5 px : 60 laisse la marge qu'il faut sans gaspiller de texture. */
const CELL = 60;
const HALF = CELL / 2;
const COLS = 9;

/* GOUTTIERE TRANSPARENTE autour de chaque case. Invisible en canvas 2D — un
   `drawImage` lit exactement le rectangle qu'on lui donne — mais SYSTEMATIQUE
   en WebGL : le filtrage lineaire va chercher les texels voisins au bord du
   rectangle source et ramene des franges de l'image d'a cote. Deux pixels
   suffisent, et ils coutent 14 % de surface de texture.

   `PITCH` est donc le pas de la grille, `CELL` la case utile centree dedans.
   Toute lecture de l'atlas passe par `cellRect()`, jamais par un calcul
   recopie : deux formules divergeraient au premier reglage de la gouttiere. */
const PAD = 2;
const PITCH = CELL + PAD * 2;

/* Densite de pixels de l'atlas. Elle suit celle de l'ecran — un atlas genere a
   1 sur une dalle 1440p redonnerait exactement le flou qu'on est venu corriger
   dans le canvas. Plafonnee a 2 pour la meme raison qu'ailleurs : au-dela on
   quadruple le remplissage pour un gain invisible. */
const DPR = Math.min(globalThis.devicePixelRatio || 1, 2);
const PX = CELL * DPR;
const PITCH_PX = PITCH * DPR;

let atlas = null;        // le canvas unique
let flashAtlas = null;   // la meme planche, en silhouettes blanches
const index = new Map(); // nom -> numero de case
let count = 0;

// Rectangle source d'une case, en pixels de texture. Point de passage unique :
// le chemin 2D et le chemin WebGL lisent la MEME formule, gouttiere comprise.
function cellRect(frame) {
  return {
    x: (frame % COLS) * PITCH_PX + PAD * DPR,
    y: Math.floor(frame / COLS) * PITCH_PX + PAD * DPR,
  };
}

function slot(name) {
  const id = count++;
  index.set(name, id);
  return id;
}

/* Numero de case d'une image. Passe par un NOM et non par un nombre magique :
   l'ordre des cases est un detail de l'atlas, et un appelant qui ecrit `12`
   casse au premier ajout. */
export function frameOf(name) {
  return index.get(name) ?? 0;
}

/* --- la recette en six couches ---------------------------------------------
   Appliquee uniformement, c'est elle qui fait passer des « formes
   geometriques » a des creatures :

     1. silhouette — un trace ferme, rempli en `base`
     2. ombrage    — la meme silhouette decalee en bas-droite, en `ombre`,
                     ecretee a la silhouette
     3. lumiere    — un arc en haut-gauche, ecrete de meme
     4. contour    — la silhouette tracee en `contour`, JAMAIS en noir : un noir
                     pur ecrase la teinte et rend les cinq types identiques a
                     moyenne distance
     5. accents    — yeux, plaques, mandibules, en `accent`
     6. asymetrie  — une irregularite par type, du MEME cote a chaque image

   Les couches 2, 3 et 6 sont l'essentiel du travail : ce sont elles qui font la
   difference entre une forme et une creature. Si un type demande un traitement
   particulier, c'est le type qu'il faut revoir, pas la recette — un style n'est
   tenable que s'il se repete a l'identique sur tout le jeu. */
/* SOUS-TRACE MIROIR. A n'utiliser que la, et pour une raison qui ne se voit pas
   a la lecture du code fautif.

   Ecrire les memes sommets avec `y * s` inverse le SENS DE PARCOURS quand
   s = -1. Or `fill()` applique la regle NON NULLE : deux contours parcourus en
   sens contraires annulent leur zone commune. Un appendice miroir qui chevauche
   le corps y perce donc un TROU transparent — et comme le contour est trace
   apres, le resultat lit comme une fente, pas comme une erreur.

   Trois creatures en etaient percees et personne ne l'avait vu : les mandibules
   du grunt d'un cote, les epaules du tank, les braces du Rempart. La planche de
   silhouettes le montrait depuis le debut — un pixel blanc au milieu d'une forme
   noire — mais a 64 px par case la fente fait deux pixels.

   La correction NE DEVINE PAS quel cote est fautif : elle mesure l'aire signee
   du polygone tel qu'il va etre emis, et retourne l'ordre des sommets si le
   signe n'est pas le bon. Reverser « le cote s = -1 » avait ete essaye et
   percait les DEUX cotes — c'est s = +1 qui etait a l'envers sur le tank
   (corps +845,7 contre epaule -253,5, indice de tour nul au point (0,10)).
   Un test de signe ne peut pas se tromper de cote, et il couvre le prochain
   appendice qu'on ecrira sans y penser.

   Convention : sens POSITIF, celui des corps. Les trois corps concernes sont
   des polygones parcourus a angle croissant, donc positifs — grunt, tank, et
   l'hexagone du Rempart. Un corps ecrit un jour dans l'autre sens inverserait
   la regle, et c'est la seule hypothese de cette fonction. */
function mirrored(g, s, pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * (y2 * s) - x2 * (y1 * s);
  }
  const list = area < 0 ? [...pts].reverse() : pts;
  for (let i = 0; i < list.length; i++) {
    const [px, py] = list[i];
    i === 0 ? g.moveTo(px, py * s) : g.lineTo(px, py * s);
  }
  g.closePath();
}

/* Etendue reelle d'un trace, MESUREE et non declaree. Un `size` recopie a cote
   de chaque type aurait menti des le premier reglage de silhouette — c'est la
   meme regle que pour les descriptions de cartes qui composent `fmtM(LA
   CONSTANTE)` plutot que de recopier un nombre.

   Les huit traces du jeu n'appellent que `moveTo`, `lineTo` et `closePath`, donc
   un simple enregistreur suffit. `arc` et `ellipse` sont couverts par leur boite
   englobante : ils ne servent aujourd'hui qu'aux accents, qui ne passent pas
   par ici, mais un trace qui en gagnerait un donnerait une etendue correcte au
   lieu de faire tomber le chargement. */
function pathExtent(path) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const note = (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  path({
    moveTo: note,
    lineTo: note,
    closePath() {},
    arc(x, y, r) { note(x - r, y - r); note(x + r, y + r); },
    ellipse(x, y, rx, ry) { note(x - rx, y - ry); note(x + rx, y + ry); },
  });
  if (!Number.isFinite(minX)) return { cx: 0, cy: 0, span: CELL * 0.5 };
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    /* La PLUS PETITE des deux dimensions, jamais la plus grande ni la diagonale.
       Un runner fait 31 de long pour 21 de haut : indexer son eclairage sur sa
       longueur aurait pose un arc de lumiere plus large que le corps, qui se
       serait fait ecreter presque entierement — exactement le defaut qu'on
       corrige. C'est l'epaisseur qui dit combien de place il y a pour modeler. */
    span: Math.min(maxX - minX, maxY - minY),
  };
}

function bake(g, R, path, accents, edge = 2) {
  /* Les trois grandeurs d'eclairage suivent la TAILLE DE LA FORME. Elles etaient
     fixes — decalage d'ombre de 2 px et arc de lumiere de rayon 12,6 pour tout
     le monde —, ce qui donnait le meme modele a un runner de 21 px d'epaisseur
     et a un Rempart de 33. Sur le petit, l'arc debordait et disparaissait a
     l'ecretage ; sur le gros, l'ombre de 2 px etait un cheveu. La lumiere etait
     posee A COTE de la forme au lieu de la suivre. */
  const E = pathExtent(path);
  const off = Math.max(1.5, Math.min(3.5, E.span * 0.075));

  // 1 — silhouette
  g.beginPath(); path(g); g.closePath();
  g.fillStyle = R.base;
  g.fill();

  // 2 — ombrage, ecrete a la silhouette
  g.save();
  g.clip();
  g.translate(off, off);
  g.beginPath(); path(g); g.closePath();
  g.fillStyle = R.ombre;
  g.globalAlpha = 0.85;
  g.fill();
  g.restore();

  // 3 — lumiere, un arc en haut-gauche, ecrete de meme. Centre sur la forme
  // REELLE et non sur l'origine : un tireur dont le corps est decale vers
  // l'arriere recevait sa lumiere sur son canon.
  g.save();
  g.beginPath(); path(g); g.closePath();
  g.clip();
  g.strokeStyle = R.lumiere;
  g.lineWidth = Math.max(2.5, E.span * 0.115);
  g.globalAlpha = 0.55;
  g.beginPath();
  g.arc(E.cx, E.cy, E.span * 0.28, Math.PI * 1.05, Math.PI * 1.72);
  g.stroke();
  g.restore();

  /* 3 bis — CONTRE-JOUR. Le trace, decale du cote OPPOSE a l'ombre et ecrete a
     la silhouette d'origine : la ou le contour deplace tombe a l'interieur —
     c'est-a-dire sur le bord bas-droit — le liseré se voit ; du cote haut-gauche
     il sort de l'ecretage et disparait. Un seul decalage donne donc un liseré
     qui epouse exactement la forme, appendices compris, sans avoir a decrire
     ou est son bord.

     Il passe AVANT le contour, qui l'encadre ensuite : dessine par-dessus, il
     aurait mange la ligne sombre qui detache la creature du sol. */
  g.save();
  g.beginPath(); path(g); g.closePath();
  g.clip();
  g.translate(-off * 0.9, -off * 0.9);
  g.beginPath(); path(g); g.closePath();
  g.strokeStyle = R.rim;
  g.lineWidth = Math.max(1.5, E.span * 0.055);
  g.globalAlpha = 0.75;
  g.lineJoin = "round";
  g.stroke();
  g.restore();

  // 4 — contour
  g.beginPath(); path(g); g.closePath();
  g.strokeStyle = R.contour;
  g.lineWidth = edge;
  g.lineJoin = "round";
  g.stroke();

  // 5 et 6 — accents et asymetrie, propres au type
  if (accents) accents(g, R);
}

/* Etapes de mort, derivees de la MEME silhouette. Trois images et des
   particules : fissuration, eclatement, dispersion. Les generer a partir du
   trace du type plutot que de les dessiner une par une, c'est quinze images
   qui coutent quinze lignes — et surtout un traitement identique pour les cinq
   types, ce qui est exactement ce que la recette demande. */
function bakeDeath(g, R, path, step, edge = 2) {
  const chunks = 3;
  const spread = [0, 3.5, 8][step];
  const shrink = [1, 0.92, 0.7][step];
  const fade = [1, 0.9, 0.55][step];

  g.globalAlpha = fade;
  for (let i = 0; i < chunks; i++) {
    const a0 = (i / chunks) * Math.PI * 2 - 0.4;
    const a1 = a0 + (Math.PI * 2) / chunks - 0.12;
    const mid = (a0 + a1) / 2;

    g.save();
    // Un coin de tarte par morceau : la silhouette est decoupee, pas redessinee.
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, HALF, a0, a1);
    g.closePath();
    g.clip();

    g.translate(Math.cos(mid) * spread, Math.sin(mid) * spread);
    g.scale(shrink, shrink);
    g.beginPath(); path(g); g.closePath();
    g.fillStyle = step === 0 ? R.base : R.ombre;
    g.fill();
    g.strokeStyle = R.contour;
    g.lineWidth = edge;
    g.stroke();
    g.restore();
  }
  g.globalAlpha = 1;

  // Fissures : elles n'existent qu'a la premiere image, celle ou la creature
  // est encore entiere. Apres, les morceaux DISENT deja la cassure.
  if (step === 0) {
    g.save();
    g.beginPath(); path(g); g.closePath();
    g.clip();
    g.strokeStyle = R.contour;
    g.lineWidth = 2;
    for (let i = 0; i < chunks; i++) {
      const a = (i / chunks) * Math.PI * 2 - 0.4;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * HALF, Math.sin(a) * HALF);
      g.stroke();
    }
    g.restore();
  }
}

/* --- les cinq monstres -----------------------------------------------------
   Chaque silhouette est concue pour son VERBE, et doit passer le test de la
   silhouette : reduite a une ombre pleine, elle reste reconnaissable par type.
   Si un type n'est identifiable que par sa couleur ou son detail interne, la
   silhouette est ratee — le style et la mecanique travaillent alors l'un contre
   l'autre.

   Les sprites regardent vers la DROITE ; la rotation fait le reste. Aucune
   rotation n'est pre-calculee : generer seize angles multiplierait l'atlas par
   seize pour economiser une transformation deja quasi gratuite. */

/* GRUNT — la masse. Corps ovoide dentele, trapu, plus large que long. Sa
   silhouette est la plus NEUTRE : c'est le repere par rapport auquel les quatre
   autres se lisent. */
/* Un trace de silhouette est fait de PLUSIEURS sous-traces : le corps, puis les
   membres. Chacun commence par un `moveTo` et se ferme par un `closePath`.

   C'est la seule facon de dessiner un appendice : enchainer les pattes en
   `lineTo` a la suite du corps les raccorde au dernier sommet de celui-ci et
   creuse une entaille dans toute la creature. C'est exactement ce qui rendait
   le grunt et le tank illisibles a la premiere planche de controle — ils ne
   passaient pas leur propre test de silhouette. */
function gruntPath(k) {
  const legs = k.legs ?? 0;
  const open = k.open ? 5 : 0;
  return g => {
    // Corps ovoide dentele, plus large que long.
    const teeth = 10;
    g.moveTo(12, 0);
    for (let i = 1; i <= teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      // Asymetrie : un cran nettement plus profond, TOUJOURS au meme endroit.
      const bump = (i % 2 ? 1.6 : -1.1) + (i === 3 ? -2.6 : 0);
      g.lineTo(Math.cos(a) * (12 + bump), Math.sin(a) * (13.5 + bump));
    }
    g.closePath();

    /* Mandibules DANS la silhouette et non en accent : le test de la
       silhouette se joue la. Peintes par-dessus, en couleur de contour, elles
       disparaissaient sur un corps deja sombre — et le grunt n'etait plus
       qu'une masse ronde parmi cinq masses rondes. */
    for (const s of [-1, 1]) {
      mirrored(g, s, [[8, 5], [21, 2.5 + open], [22, 6 + open], [9, 10]]);
    }

    // Pattes : trois paires courtes, en sous-traces separes, qui alternent
    // d'une image de marche a l'autre. C'est le SEUL changement de forme du
    // cycle — la respiration et l'etirement sont des transformations.
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const px = -9 + i * 6;
        const alt = (i + (s > 0 ? 0 : 1) + (legs < 0 ? 1 : 0)) & 1;
        const ext = 3.5 + (alt && legs !== 0 ? 3.5 : 0);
        mirrored(g, s, [[px - 2.5, 10], [px + 0.5, 12 + ext], [px + 3, 10]]);
      }
    }
  };
}

function gruntAccents(open) {
  return (g, R) => {
    // Deux yeux rapproches : c'est ce qui donne une TETE a une masse. Ils sont
    // le seul accent du type — la silhouette dit deja tout le reste.
    g.fillStyle = R.accent;
    for (const s of [-1, 1]) {
      g.beginPath(); g.arc(4, s * 4.5, 2.4, 0, 7); g.fill();
    }
    if (open) {
      // Gueule ouverte : un creux sombre entre les mandibules ecartees.
      g.fillStyle = R.contour;
      g.beginPath(); g.ellipse(11, 0, 4, 5.5, 0, 0, 7); g.fill();
    }
  };
}

/* RUNNER — la vitesse. Dard effile, pointe tres marquee, deux ailerons
   arriere. Beaucoup plus long que large : l'ALLONGEMENT est l'information, pas
   la couleur. */
function runnerPath(k) {
  const fin = k.fin ?? 0;
  return g => {
    g.moveTo(17, 0);
    g.lineTo(2, -6.5);
    g.lineTo(-6, -4 - fin);       // aileron haut
    g.lineTo(-13, -8 - fin * 2);
    g.lineTo(-9, -1.5);
    g.lineTo(-14, 0);
    g.lineTo(-9, 1.5);
    g.lineTo(-13, 8 + fin * 2);
    // Asymetrie : l'aileron bas est plus court, toujours du meme cote.
    g.lineTo(-6, 3 + fin);
    g.lineTo(2, 6.5);
  };
}

function runnerAccents(g, R) {
  // Une arete claire dans l'axe : elle appuie la direction, donc la vitesse.
  g.fillStyle = R.lumiere;
  g.beginPath();
  g.moveTo(13, 0); g.lineTo(0, -2.6); g.lineTo(-4, 0); g.lineTo(0, 2.6);
  g.closePath(); g.fill();
  g.fillStyle = R.accent;
  g.beginPath(); g.arc(6, 0, 1.9, 0, 7); g.fill();
}

/* TANK — la masse lente. Carapace hexagonale plaquee, epaules debordantes,
   petite tete enfoncee. Silhouette la plus large et la plus basse, contour a
   3 px au lieu de 2 : le trait epais dit le poids avant meme la taille. */
function tankPath(k) {
  const plates = k.plates ?? 1;   // 0 = retractees, juste avant la charge
  const step = k.step ?? 0;
  return g => {
    // Carapace hexagonale APLATIE : la plus large et la plus basse des cinq.
    // C'est le rapport largeur / hauteur qui dit le poids, pas la taille seule.
    g.moveTo(21, 0);
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.lineTo(Math.cos(a) * 21, Math.sin(a) * 15.5);
    }
    g.closePath();

    // Tete ENFONCEE : un museau court a l'avant, dans la silhouette.
    g.moveTo(16, -5.5);
    g.lineTo(25, -3.5);
    g.lineTo(25, 3.5);
    g.lineTo(16, 5.5);
    g.closePath();

    // Epaules DEBORDANTES, en sous-traces separes. Retractees sur la quatrieme
    // image : c'est l'anticipation de la charge, et elle doit se lire de loin.
    for (const s of [-1, 1]) {
      const out = 14 + plates * 7;
      mirrored(g, s, [[-13, 8], [-9 + step * 2, out], [6 + step * 2, out], [11, 8]]);
    }

    // Asymetrie : une plaque de plus, toujours en haut-arriere.
    g.moveTo(-19, -4);
    g.lineTo(-10, -13);
    g.lineTo(-5, -6);
    g.closePath();
  };
}

function tankAccents(g, R) {
  // Deux nervures : elles decoupent la carapace et l'empechent de lire comme
  // un simple hexagone plein.
  g.strokeStyle = R.contour;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-9, -11); g.lineTo(-9, 11);
  g.moveTo(3, -13);  g.lineTo(3, 13);
  g.stroke();

  // Ligne de plaque frontale et deux rivets d'epaule : la carapace lit comme
  // des plaques rapportees plutot qu'une coque pleine — reference :
  // docs/refs/bestiaire-socle.png.
  g.strokeStyle = R.ombre;
  g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(11, -12); g.lineTo(11, 12); g.stroke();
  g.fillStyle = R.ombre;
  for (const s of [-1, 1]) {
    g.beginPath(); g.arc(-9, 9 * s, 1.4, 0, 7); g.fill();
  }

  // Un seul point chaud, dans le museau : petit, parce que la tete est enfoncee.
  g.fillStyle = R.accent;
  g.beginPath(); g.arc(19, 0, 2.8, 0, 7); g.fill();
}

/* SHOOTER — la distance. Corps flottant a trois segments, oeil unique
   cyclopeen, canon proeminent. Le SEUL type qui ne touche pas le sol : d'ou un
   decalage vertical et une ombre portee separee, qui se lisent instantanement
   comme « celui-la vole ». */
function shooterPath(k) {
  const recoil = k.recoil ?? 0;   // -1 vise (canon recule), +1 tire (avance)
  return g => {
    /* Trois segments empiles, du plus gros au plus petit vers l'arriere, puis un
       CANON qui proemine vraiment plutot qu'un simple museau tapere — reference :
       docs/refs/bestiaire-socle.png, qui montre un long appendice frontal. Un
       epaulement (17+recoil*2.5) casse la largeur avant le tube fin : c'est ce
       qui fait lire « un canon sort d'un corps » plutot que « le corps s'amincit ».
       Le tube reste sous 30 (HALF) meme a pleine detente (recoil=1 -> 28), la
       marge que la case de 60 laisse deja au Rempart. */
    g.moveTo(9, -9);
    g.lineTo(13 + recoil * 2.5, -3.5);
    g.lineTo(17 + recoil * 2.5, -3.2);
    g.lineTo(25 + recoil * 3, -1.5);
    g.lineTo(25 + recoil * 3, 1.5);
    g.lineTo(17 + recoil * 2.5, 3.2);
    g.lineTo(13 + recoil * 2.5, 3.5);
    g.lineTo(9, 9);
    g.lineTo(-2, 12);
    g.lineTo(-9, 7);
    g.lineTo(-12, 0);
    // Asymetrie : le segment arriere est plus haut d'un cote.
    g.lineTo(-9, -9);
    g.lineTo(-2, -13.5);
  };
}

function shooterAccents(recoil) {
  return (g, R) => {
    // Oeil cyclopeen : le seul type a n'en avoir qu'un, et c'est ce qui le
    // distingue du grunt a douze pixels.
    g.fillStyle = R.contour;
    g.beginPath(); g.arc(1, 0, 6.4, 0, 7); g.fill();
    g.fillStyle = R.accent;
    g.beginPath(); g.arc(2, 0, 3.8, 0, 7); g.fill();

    // Reflet de canon : une ligne claire qui suit le tube, pour le lire comme
    // du metal plutot qu'un simple museau — reference : docs/refs/bestiaire-socle.png.
    g.strokeStyle = R.lumiere;
    g.lineWidth = 1;
    g.globalAlpha = 0.6;
    g.beginPath();
    g.moveTo(17 + recoil * 2.5, -0.8); g.lineTo(24 + recoil * 3, -0.8);
    g.stroke();
    g.globalAlpha = 1;
  };
}

function shooterShadow(g, R) {
  // Ombre portee SEPAREE du corps : c'est elle qui dit qu'il flotte. Cuite dans
  // le sprite, elle ne coute rien a l'affichage.
  g.save();
  g.globalAlpha = 0.35;
  g.fillStyle = R.contour;
  g.beginPath(); g.ellipse(0, 15, 11, 3.4, 0, 0, 7); g.fill();
  g.restore();
}

/* BROOD — l'anomalie. Sac ventru asymetrique, oeufs visibles par transparence,
   quatre appendices courts irreguliers. La plus organique et la plus
   asymetrique des cinq : c'est ce qui la fait lire comme « quelque chose qui ne
   devrait pas etre la ». */
function broodPath(k) {
  const swell = k.swell ?? 0;
  return g => {
    const pts = 11;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      // Ventre gonfle en bas-arriere : l'asymetrie est structurelle, pas un
      // bruit aleatoire — elle doit etre au meme endroit a chaque image.
      const belly = Math.sin(a - 2.2) * 3.4;
      const r = 15 + belly + swell * 3 + (i % 2 ? 1.2 : -0.8);
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.9;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();
    // Quatre appendices courts et IRREGULIERS, en sous-traces separes.
    const legs = [[-0.6, 9], [0.4, 12], [2.2, 8], [3.4, 11]];
    for (const [a, len] of legs) {
      g.moveTo(Math.cos(a - 0.2) * 12, Math.sin(a - 0.2) * 12);
      g.lineTo(Math.cos(a + 0.05) * (13 + len), Math.sin(a + 0.05) * (13 + len));
      g.lineTo(Math.cos(a + 0.3) * 12, Math.sin(a + 0.3) * 12);
      g.closePath();
    }
  };
}

function broodAccents(swell) {
  return (g, R) => {
    // Les oeufs se voient par TRANSPARENCE : c'est le detail qui rend le sac
    // organique plutot que geometrique, et il grossit avec le gonflement.
    g.save();
    g.globalAlpha = 0.55;
    g.fillStyle = R.lumiere;
    for (const [ex, ey] of [[-4, -5], [4, -3], [-2, 5], [7, 4], [0, 0]]) {
      g.beginPath(); g.arc(ex, ey, 3.2 + swell * 0.8, 0, 7); g.fill();
    }
    g.restore();
    g.fillStyle = R.accent;
    g.beginPath(); g.arc(11, -1, 2.6, 0, 7); g.fill();
  };
}

/* KAMIKAZE — la charge. Corps rond COMPACT herisse de pointes radiales
   courtes, plus une meche recourbee a l'arriere. Le herissement est
   l'information : c'est la seule silhouette du jeu dont le contour est
   discontinu sur tout son pourtour, et ca se lit comme « ne pas toucher » avant
   qu'on ait identifie quoi que ce soit.

   Les pointes sont des sous-traces INDEPENDANTS, chacun ferme, et elles sont
   toutes construites par ROTATION du meme triangle : une rotation preserve le
   sens de parcours, donc aucune ne peut percer le corps — c'est le piege de
   `mirrored()` evite par construction plutot que par mesure. */
function kamikazePath(k) {
  const bristle = k.bristle ?? 0;
  return g => {
    const pts = 9;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const px = Math.cos(a) * 11, py = Math.sin(a) * 11.5;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();

    // Huit pointes. Elles sortent avec le herissement — c'est le seul changement
    // de FORME du type ; la pulsation d'imminence, elle, est un `scale`.
    const spikes = 8;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + 0.22;
      const len = 15 + bristle * 5 + (i === 2 ? 3.5 : 0);   // asymetrie : une pointe plus longue
      const w = 0.16;
      g.moveTo(Math.cos(a - w) * 10, Math.sin(a - w) * 10);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.lineTo(Math.cos(a + w) * 10, Math.sin(a + w) * 10);
      g.closePath();
    }

    // Meche, a l'arriere et TOUJOURS du meme cote : elle donne un avant et un
    // arriere a une forme qui, autrement, serait radialement symetrique.
    g.moveTo(-10, -4);
    g.lineTo(-19, -12 - bristle * 2);
    g.lineTo(-15, -14 - bristle * 2);
    g.lineTo(-7, -6);
    g.closePath();
  };
}

function kamikazeAccents(bristle) {
  return (g, R) => {
    // Noyau instable : il grossit avec le herissement, donc avec l'imminence.
    g.fillStyle = R.lumiere;
    g.beginPath(); g.arc(0, 0, 4.2 + bristle * 1.8, 0, 7); g.fill();
    g.fillStyle = R.accent;
    g.beginPath(); g.arc(0, 0, 2.2 + bristle, 0, 7); g.fill();
  };
}

/* BULWARK — l'angle a gagner. Une PLAQUE FRONTALE large et droite devant un
   corps ramasse. C'est la seule silhouette du bestiaire dont l'avant est une
   ligne droite : rien d'autre dans le jeu, monstre ou joueur, n'a d'arete
   franche de trente pixels. Le bouclier du joueur Rempart en est proche mais il
   est en ARC et il est teinte a la couleur du joueur.

   La plaque est dans la SILHOUETTE et non en accent : c'est elle qui porte
   l'information mecanique — d'ou vient la protection — et un accent peint
   par-dessus disparait sur un corps sombre. C'est la lecon du grunt, dont les
   mandibules avaient du y entrer pour la meme raison. */
function bulwarkPath(k) {
  const brace = k.brace ?? 0;      // ecartement des retours de plaque
  const step = k.step ?? 0;
  return g => {
    // Corps ramasse, nettement plus petit que la plaque : la masse est DEVANT.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const px = Math.cos(a) * 13 - 4, py = Math.sin(a) * 12;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();

    // LA plaque. Droite, large, epaisse — et asymetrique : elle deborde d'un
    // cran de plus vers le haut, toujours du meme cote.
    g.moveTo(12, -18);
    g.lineTo(20, -15.5);
    g.lineTo(20, 14.5);
    g.lineTo(12, 17);
    g.closePath();

    // Retours de plaque, en sous-traces MIROIR : c'est exactement le cas ou
    // `mirrored()` est obligatoire — ils chevauchent la plaque, et un sens de
    // parcours inverse y percerait un trou transparent qui se lirait comme une
    // meurtriere volontaire.
    for (const s of [-1, 1]) {
      mirrored(g, s, [[11, 13], [16 + brace, 16], [16 + brace, 21 + brace * 2], [7, 15]]);
    }

    // Deux pattes courtes, alternees : le type marche, il ne flotte pas.
    for (const s of [-1, 1]) {
      const alt = (s > 0 ? 0 : 1) + (step < 0 ? 1 : 0);
      const ext = 3 + ((alt & 1) && step !== 0 ? 3.5 : 0);
      mirrored(g, s, [[-11, 9], [-8, 11 + ext], [-5, 9]]);
    }
  };
}

function bulwarkAccents(g, R) {
  // Fente d'observation dans la plaque : elle dit qu'il y a quelqu'un derriere,
  // et elle donne l'echelle qu'un aplat de trente pixels perd.
  g.fillStyle = R.contour;
  g.fillRect(14, -8, 4.5, 16);
  // Trois rivets, decales vers le haut — la meme asymetrie que la plaque.
  g.fillStyle = R.ombre;
  for (const ry of [-14, -2, 11]) {
    g.beginPath(); g.arc(16, ry, 1.7, 0, 7); g.fill();
  }
  g.fillStyle = R.accent;
  g.beginPath(); g.arc(-6, 0, 2.6, 0, 7); g.fill();
}

/* MEDIC — le soutien. La silhouette la plus HAUTE et la plus fine du bestiaire :
   corps menu et MAT DORSAL qui monte a vingt-six pixels, termine par un crochet
   emetteur. Toutes les autres creatures sont plus larges que hautes ; celle-la
   est l'inverse, et c'est ce qui la fait ressortir d'une melee ou tout est bas
   et ramasse. C'est exactement la lecture qu'on veut : le joueur doit pouvoir la
   trouver derriere la horde.

   Pas de croix : la croix est LE signe du soin cote joueur (bonus au sol,
   sanctuaire, tir du soigneur, HUD), et la coller sur un ennemi ferait mentir le
   seul glyphe du jeu qui promet un gain. Le lien de soin, lui, part du crochet
   et se dessine dans la teinte du type, jamais en `HEAL`. */
function medicPath(k) {
  const lean = k.lean ?? 0;
  return g => {
    // Corps menu, legerement pointe vers l'avant.
    const pts = 12;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 9.5 + Math.cos(a) * 2.2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.92;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();

    /* Mat dorsal, en SOUS-TRACE. Il s'incline vers l'arriere quand il se
       deplace : c'est le seul changement de forme de son cycle, tout le reste
       (respiration, etirement) etant des transformations. */
    g.moveTo(-1, -7);
    g.lineTo(-3.5 - lean * 3, -24);
    g.lineTo(1.5 - lean * 3, -25);
    g.lineTo(3.5, -7);
    g.closePath();

    // Crochet emetteur au sommet du mat, penche du MEME cote a chaque image.
    g.moveTo(1.5 - lean * 3, -25);
    g.lineTo(10 - lean * 3, -22.5);
    g.lineTo(9 - lean * 3, -18.5);
    g.lineTo(0.5 - lean * 3, -21);
    g.closePath();

    // Deux pattes filiformes : le type ne pese rien, il se replie.
    for (const s of [-1, 1]) {
      mirrored(g, s, [[-4, 7], [-6, 13], [-3, 8]]);
      mirrored(g, s, [[4, 7], [6, 13], [7, 8]]);
    }
  };
}

function medicAccents(lean) {
  return (g, R) => {
    // Point emetteur : c'est de LA que part le lien de soin dessine par le
    // client, et les deux doivent coincider.
    g.fillStyle = R.accent;
    g.beginPath(); g.arc(8.5 - lean * 3, -21, 2.6, 0, 7); g.fill();
    g.fillStyle = R.lumiere;
    g.beginPath(); g.arc(3, 0, 3.2, 0, 7); g.fill();
  };
}

/* CHOEUR — la couverture. COURONNE de trois pointes dressees vers le haut et
   deux rubans qui trainent a l'arriere. Le seul type dont la silhouette est
   ouverte vers le haut : les huit autres sont fermes, et la couronne se lit
   comme quelque chose qui EMET.

   Son aura est dessinee sur les ennemis COUVERTS (un lisere) et pas au sol : un
   grand disque de plus entrerait en concurrence avec les zones de boss et le
   rempart, et le budget de lisibilite est deja depense. La silhouette doit donc
   porter seule l'identite du porteur. */
function choeurPath(k) {
  const call = k.call ?? 0;        // hauteur des pointes de couronne
  return g => {
    // Corps allonge verticalement, pointe legere vers l'avant.
    const pts = 10;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const px = Math.cos(a) * 12.5, py = Math.sin(a) * 14;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();

    // Couronne : trois pointes dressees, de hauteurs INEGALES — l'asymetrie
    // structurelle, toujours du meme cote.
    const crown = [[-7, 9 + call * 4], [1, 13 + call * 5], [8, 10.5 + call * 4]];
    for (const [cx, h] of crown) {
      g.moveTo(cx - 3, -10);
      g.lineTo(cx + 0.6, -10 - h);
      g.lineTo(cx + 3, -10);
      g.closePath();
    }

    // Deux rubans a l'arriere, en miroir : ils donnent une direction a une forme
    // qui, sans eux, n'aurait pas d'arriere.
    for (const s of [-1, 1]) {
      mirrored(g, s, [[-9, 3], [-20, 7 + call * 2], [-18, 11 + call * 2], [-7, 8]]);
    }
  };
}

function choeurAccents(call) {
  return (g, R) => {
    // Un point lumineux au sommet de chaque pointe : c'est ce qui fait lire la
    // couronne comme un emetteur plutot que comme des cornes.
    g.fillStyle = R.accent;
    for (const [cx, h] of [[-7, 9 + call * 4], [1, 13 + call * 5], [8, 10.5 + call * 4]]) {
      g.beginPath(); g.arc(cx + 0.6, -10 - h, 2, 0, 7); g.fill();
    }
    g.fillStyle = R.lumiere;
    g.beginPath(); g.ellipse(3, 1, 4.5, 6, 0, 0, 7); g.fill();
  };
}

/* --- les trois classes -----------------------------------------------------
   LA FORME DIT LA CLASSE, LA COULEUR DIT LE JOUEUR. Les quatre couleurs de
   joueur sont deja prises par l'identite individuelle : si la classe passait
   elle aussi par la couleur, deux tanks seraient indistinguables ou deux
   joueurs se confondraient.

   Consequence : les sprites de classe sont cuits dans une rampe NEUTRE et
   claire, et `drawSprite` les teinte a la couleur du joueur. Une teinte
   multiplicative sur du blanc rend exactement la couleur demandee. */
const NEUTRAL = ramp("#dfe5f0");

/* LE REMPART — refait au lot 6. Trois defauts cumules dans la version d'avant,
   tous constates sur la planche de silhouettes :

   - il n'etait PAS plus imposant que les autres (hexagone 14 x 12,5 contre 13
     de rayon pour le soigneur), alors que la masse est son identite entiere et
     le signal le plus rapide qui existe ;
   - les plaques partaient de l'ARRIERE (-3) et pointaient vers l'avant : la
     silhouette lisait comme un crabe, pas comme un bouclier ;
   - le canon etait aussi long que celui du tireur (21 contre 21) alors que sa
     fiche de classe annonce « canon court et large ».

   Corps porte a 17 x 15 — nettement le plus gros des trois —, plaques deplacees
   a l'AVANT en arc de bouclier, canon court et epais (±6 contre ±2 pour le
   tireur), contour a 3,5 px et ombre portee plus marquee que les deux autres
   classes. Le poids du trait et l'ancrage au sol participent a la masse autant
   que les dimensions.

   Ecart assume avec la specification, qui demandait un canon s'arretant a 17 :
   le corps y arrive deja (l'hexagone a son sommet a x = 17), un canon a 17
   aurait donc disparu de la silhouette. Il s'arrete a 23, ce qui le laisse
   court par rapport a celui du tireur (24 sur un corps de 16) tout en restant
   visible.

   Chaque appendice est un SOUS-TRACE : un `lineTo` enchaine a la suite du corps
   se raccorde a son dernier sommet et creuse une entaille dans toute la
   creature — le bug est documente pour le grunt et le tank ennemi. */
function tankClassPath(k) {
  const move = k.move ?? 0;
  return g => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * 17, py = Math.sin(a) * 15;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();
    // Arc de bouclier FRONTAL : deux braces qui enveloppent l'avant de part et
    // d'autre du canon. C'est ce que le joueur doit lire — un truc qui protege
    // ce qui est devant lui.
    for (const s of [-1, 1]) {
      mirrored(g, s, [[2, 14], [16 + move, 16.5], [21 + move, 8.5], [9, 8.5]]);
    }
    // Canon court et large, entre les deux braces.
    g.moveTo(10, -6);
    g.lineTo(23, -6);
    g.lineTo(23, 6);
    g.lineTo(10, 6);
    g.closePath();
  };
}

/* Ancrage au sol. Plus marque que celle du tireur volant (0,5 contre 0,35, et
   plus large) : c'est le troisieme levier de masse apres les dimensions et le
   poids du trait, et le seul qui dise que le Rempart PESE au lieu de flotter. */
function tankClassShadow(g, R) {
  g.save();
  g.globalAlpha = 0.5;
  g.fillStyle = R.contour;
  g.beginPath(); g.ellipse(0, 15, 16, 5, 0, 0, 7); g.fill();
  g.restore();
}

/* LE SOIGNEUR — refait, pour le meme defaut que le Rempart au lot 6 et constate
   sur la meme planche : c'etait un polygone a quatorze cotes de rayon 13,
   c'est-a-dire un CERCLE. Aucun appendice, aucune pointe, donc aucune
   orientation lisible en silhouette — et c'etait la seule des trois classes
   dans ce cas, le Rempart ayant son arc de bouclier et le DPS son dard.

   Or la charte disait alors « la forme dit la classe, la couleur dit le
   joueur » — elle a depuis ete renversee, la couleur dit la classe elle aussi,
   mais la silhouette reste et doit porter la meme information : un
   soigneur qui ne tient que par sa teinte fait exactement porter la classe par
   la couleur, alors que les quatre couleurs sont deja prises par l'identite des
   joueurs. Sur la planche en noir uni, ses quatre cases etaient des ronds
   pleins qu'on ne pouvait ni orienter ni distinguer l'un de l'autre.

   Trois ajouts, et pas un canon : il soigne, il ne perce pas.
     - CORPS EN OEUF pointe vers l'avant plutot qu'un disque. Il garde sa masse
       ronde — c'est elle qui le separe de l'hexagone du Rempart et du dard du
       DPS — mais il a desormais un avant et un arriere.
     - ANTENNE DORSALE, d'un seul cote. C'est l'asymetrie structurelle que les
       cinq monstres ont tous et qu'aucune des trois classes n'avait ; elle est
       toujours du meme cote, comme la regle l'exige.
     - EMBOUCHURE COURTE ET LARGE a l'avant, la ou le faisceau de mode soin part
       deja (x = 12). Courte face aux deux autres — 21 contre 23 pour le Rempart
       et 24 pour le DPS — et large par rapport a sa longueur : ca se lit comme
       une buse, pas comme une arme. */
function healClassPath(k) {
  const move = k.move ?? 0;
  return g => {
    // Corps en oeuf : le rayon decroit vers l'arriere, donc la pointe est a
    // l'avant sans qu'aucune arete ne vienne casser la rondeur.
    const pts = 16;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 13 + Math.cos(a) * 3;
      const px = Math.cos(a) * (r + move * 0.6), py = Math.sin(a) * r * 0.96;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();

    /* Antenne dorsale, en SOUS-TRACE : enchainee au corps elle y creuserait une
       entaille — le bug est documente pour le grunt et le tank. Elle se couche
       vers l'arriere quand il se deplace, ce qui est le seul changement de FORME
       de son cycle : le reste (respiration, etirement) sont des transformations
       et ne coutent donc aucune image. */
    g.moveTo(3, -10.5);
    g.lineTo(7 - move * 3, -22);
    g.lineTo(12 - move * 3, -20.5);
    g.lineTo(9.5, -8.5);
    g.closePath();

    // Embouchure : courte, large, et evasee vers l'avant.
    g.moveTo(13, -4.5);
    g.lineTo(21, -6.5);
    g.lineTo(21, 6.5);
    g.lineTo(13, 4.5);
    g.closePath();
  };
}

function dpsClassPath(k) {
  const move = k.move ?? 0;
  return g => {
    // Dard triangulaire, pointe marquee vers la visee.
    g.moveTo(16, 0);
    g.lineTo(-4, -12 - move);
    g.lineTo(-9, 0);
    g.lineTo(-4, 12 + move);
    // Canon long et fin.
    g.lineTo(6, 3);
    g.lineTo(24, 2);
    g.lineTo(24, -2);
    g.lineTo(6, -3);
    g.closePath();

    /* Aileron arriere, UN SEUL cote : l'asymetrie structurelle que les neuf
       monstres portent tous et qu'aucune des trois classes n'avait avant le
       Soigneur (antenne dorsale, lot 6) — meme raisonnement, applique ici.
       Sous-trace independant, ferme par son propre `closePath` : enchaine au
       dard en `lineTo` il en creuserait une entaille, le bug documente pour
       le grunt et le tank. Un seul cote, donc pas de `mirrored()` a faire —
       rien ne le recouvre, la regle de l'aire signee ne s'applique qu'aux
       appendices EN PAIRE. */
    g.moveTo(-9, 0);
    g.lineTo(-15, 9);
    g.lineTo(-9, 6);
    g.closePath();
  };
}

/* --- construction ----------------------------------------------------------- */

const ENEMY_SHAPES = ["idle", "walkA", "walkB", "open"];
const DEATH_STEPS = ["die0", "die1", "die2"];
const CLASS_SHAPES = ["idle", "move", "shoot", "down"];

/* EXPERIENCE JETABLE — sprites raster pour les 3 classes, a la demande de
   l'utilisateur, pour juger du style en jeu avant de decider quoi que ce soit.
   Pas destinee a rester : aucun appelant hors `buildAtlas` ne doit dependre de
   ce mecanisme, et il disparait avec le test. Voir `public/assets/raster_test/`. */
function rasterTestPaint(img, k) {
  return g => {
    if (k.down) g.globalAlpha = 0.55;
    // 0.78 et non 0.92 : c'est le taux de remplissage du Rempart VECTORIEL
    // (diametre ~48 sur une case de 60). Le lisere permanent (`paintOutline`,
    // x1.16) scale avec le sprite qu'on lui donne — un raster plus gros que le
    // vectoriel dans sa case fait un halo plus epais en pixels ecran, meme a
    // ratio 1.16 identique.
    const scale = Math.min((CELL * 0.78) / img.width, (CELL * 0.78) / img.height);
    const w = img.width * scale, h = img.height * scale;
    g.drawImage(img, -w / 2, -h / 2, w, h);
    g.globalAlpha = 1;
  };
}

/* Table de generation. Une entree par case de l'atlas : son nom, et la fonction
   qui la peint. Elle est construite avant tout dessin pour que la taille de
   l'atlas soit connue d'un coup — recompter les cases en cours de route
   demanderait de tout redessiner. */
function plan(raster) {
  const jobs = [];

  const enemies = [
    { path: gruntPath,   accents: gruntAccents, edge: 2, floats: false,
      shapes: [{ legs: 0 }, { legs: 1 }, { legs: -1 }, { legs: 0, open: true }] },
    { path: runnerPath,  accents: () => runnerAccents, edge: 2, floats: false,
      shapes: [{ fin: 0 }, { fin: 0.6 }, { fin: -0.4 }, { fin: 1.4 }] },
    { path: tankPath,    accents: () => tankAccents, edge: 3, floats: false,
      shapes: [{ plates: 1, step: 0 }, { plates: 1, step: 1 }, { plates: 1, step: -1 },
               { plates: 0, step: 0 }] },
    { path: shooterPath, accents: k => shooterAccents(k.recoil ?? 0), edge: 2, floats: true,
      shapes: [{ recoil: 0 }, { recoil: 0.3 }, { recoil: -1 }, { recoil: 1 }] },
    { path: broodPath,   accents: null, edge: 2, floats: false,
      shapes: [{ swell: 0 }, { swell: 0.35 }, { swell: -0.25 }, { swell: 1.3 }] },
    // Les quatre du lot S, EN FIN comme dans `ENEMY_TYPES` : l'index du type
    // sert a nommer la case (`e5_idle`...), donc les deux tables ne peuvent pas
    // diverger sans que ca se voie immediatement a l'ecran.
    { path: kamikazePath, accents: k => kamikazeAccents(k.bristle ?? 0), edge: 2, floats: false,
      shapes: [{ bristle: 0 }, { bristle: 0.3 }, { bristle: -0.2 }, { bristle: 1 }] },
    // Contour a 3 px, comme le tank : le poids du trait dit le blindage avant la
    // taille.
    { path: bulwarkPath, accents: () => bulwarkAccents, edge: 3, floats: false,
      shapes: [{ brace: 0, step: 0 }, { brace: 0, step: 1 }, { brace: 0, step: -1 },
               { brace: 1.2, step: 0 }] },
    { path: medicPath,   accents: k => medicAccents(k.lean ?? 0), edge: 1.8, floats: false,
      shapes: [{ lean: 0 }, { lean: 0.5 }, { lean: -0.3 }, { lean: 1.2 }] },
    { path: choeurPath,  accents: k => choeurAccents(k.call ?? 0), edge: 2, floats: false,
      shapes: [{ call: 0 }, { call: 0.25 }, { call: -0.2 }, { call: 1 }] },
  ];

  enemies.forEach((def, t) => {
    const R = ramp(ENEMY.TINT[t] ?? ENEMY.base);
    def.shapes.forEach((k, i) => {
      const path = def.path(k);
      const accents = t === 0 ? gruntAccents(!!k.open)
        : t === 4 ? broodAccents(k.swell)
        : def.accents(k);
      jobs.push({
        name: `e${t}_${ENEMY_SHAPES[i]}`,
        paint: g => {
          if (def.floats) { shooterShadow(g, R); g.translate(0, -3); }
          bake(g, R, path, accents, def.edge);
        },
      });
    });
    // Trois etapes de mort, derivees de la silhouette au repos.
    const dead = def.path(def.shapes[0]);
    DEATH_STEPS.forEach((nom, s) => {
      jobs.push({
        name: `e${t}_${nom}`,
        paint: g => bakeDeath(g, R, dead, s, def.edge),
      });
    });
  });

  const classes = [
    // Contour a 3,5 px pour le seul Rempart : le poids du trait participe a la
    // masse, et la masse EST son identite.
    { id: "tank",     path: tankClassPath, edge: 3.5, accents: tankClassAccents,
      shadow: tankClassShadow },
    { id: "soigneur", path: healClassPath, edge: 1.6, accents: healClassAccents },
    { id: "dps",      path: dpsClassPath,  edge: 2, accents: dpsClassAccents },
  ];

  classes.forEach(def => {
    const rImg = raster?.[def.id];
    CLASS_SHAPES.forEach((nom, i) => {
      const k = { move: i === 1 ? 1.5 : 0, shoot: i === 2, down: i === 3 };
      const path = def.path(k);
      jobs.push({
        name: `c_${def.id}_${nom}`,
        paint: rImg ? rasterTestPaint(rImg, k) : g => {
          if (k.down) g.globalAlpha = 0.55;
          if (def.shadow) def.shadow(g, NEUTRAL);
          bake(g, NEUTRAL, path, def.accents(k), def.edge);
          g.globalAlpha = 1;
        },
      });
    });
  });

  /* Une case UNIFORMEMENT BLANCHE, pour les particules. Ce n'est pas un sprite
     de plus au sens de la recette : c'est le moyen de faire passer les
     fragments par le meme batcher que tout le reste. Sans elle il faudrait un
     second chemin de rendu — un tampon a part, un shader a part — pour dessiner
     des carres, ce qui est exactement le genre d'exception que ce module
     refuse d'ouvrir. La teinte de `drawSprite` fait la couleur. */
  jobs.push({
    name: "fx_white",
    paint: g => { g.fillStyle = "#ffffff"; g.fillRect(-HALF, -HALF, CELL, CELL); },
  });

  /* Deux formes de particule, et DEUX SEULEMENT. La regle de budget de l'atlas
     tranche seule la liste : on ne stocke pas en image ce qu'une transformation
     sait faire.

     L'ETINCELLE ALLONGEE, qu'on aurait pu croire indispensable, n'est donc PAS
     ici : une trainee, c'est le carre blanc avec `scaleX` different de `scaleY`
     et un `angle` — trois parametres que `drawSprite` porte deja. La cuire
     aurait paye une case pour un `scale`.

     Restent les deux vrais changements de FORME, que nulle transformation d'un
     carre ne produit :
       - `fx_shard`, un eclat anguleux. Un fragment de creature n'est pas un
         pixel : la silhouette irreguliere est ce qui le rattache au corps d'ou
         il sort, et c'est le meme contraste organique/geometrique qui separe
         les monstres du decor.
       - `fx_glow`, un halo a degradé radial. C'est celui qui compte le plus :
         l'eclair de mort et l'etincelle d'impact partaient en ADDITIF sur un
         carre blanc a bords francs, donc se lisaient comme des carres lumineux.
         Une source de lumiere n'a pas d'arete. */
  jobs.push({
    name: "fx_shard",
    paint: g => {
      // Quadrilatere volontairement DISSYMETRIQUE : quatre sommets suffisent, et
      // deux d'entre eux hors des axes suffisent a casser la lecture « losange ».
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.moveTo(0, -HALF);
      g.lineTo(HALF * 0.62, -HALF * 0.12);
      g.lineTo(HALF * 0.18, HALF);
      g.lineTo(-HALF * 0.72, HALF * 0.3);
      g.closePath();
      g.fill();
    },
  });

  jobs.push({
    name: "fx_glow",
    paint: g => {
      /* Le degradé s'arrete a 0,5 de rayon et non au bord de la case : en
         additif, une queue qui court jusqu'au bord empile des valeurs quasi
         nulles sur toute la surface et une gerbe dense finit par blanchir le
         fond. Le point d'arret a 0,45 garde en plus la forme a l'interieur de
         la gouttiere. */
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, HALF * 0.9);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.45, "rgba(255,255,255,0.38)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, HALF * 0.9, 0, Math.PI * 2);
      g.fill();
    },
  });

  return jobs;
}

/* Detail ajoute a partir d'une planche de reference generee (docs/refs/classes.png) :
   la silhouette du lot 6 etait deja juste (masse, arc de bouclier, canon
   court) mais restait plate — deux nervures et un point de tir. Tout l'ajout
   vit en ACCENT et non dans le trace : le Rempart est en rampe NEUTRE claire,
   un detail sombre s'y voit sans avoir a entrer dans la silhouette,
   contrairement aux mandibules du grunt qui disparaissaient sur un corps deja
   fonce. */
function tankClassAccents(k) {
  return (g, R) => {
    // Deux nervures verticales plutot qu'une : elles decoupent le corps en
    // bandes et lui donnent l'echelle qu'un aplat de 34 px de large perd.
    g.strokeStyle = R.contour;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-8, -11); g.lineTo(-8, 11);
    g.moveTo(-1, -13); g.lineTo(-1, 13);
    g.stroke();

    // Plaque centrale INSCRITE : un hexagone concentrique, plus petit, fait
    // lire la coque comme des plaques rapportees plutot qu'un bloc plein —
    // exactement ce que la reference montre et que la silhouette seule ne dit
    // pas.
    g.strokeStyle = R.ombre;
    g.lineWidth = 1.6;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * 10, py = Math.sin(a) * 8.8;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();
    g.stroke();

    // Rivets aux deux racines de brace : la jointure visible du bouclier.
    g.fillStyle = R.contour;
    for (const s of [-1, 1]) {
      g.beginPath(); g.arc(8.5, 13 * s, 1.6, 0, 7); g.fill();
    }

    // Collier de canon : deux troncons plutot qu'un tube plein.
    g.strokeStyle = R.ombre;
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(17, -6); g.lineTo(17, 6); g.stroke();

    // Voyant de coeur, asymetrique — TOUJOURS du meme cote, comme le reste du
    // bestiaire. Le bouclier lui-meme reste symetrique par construction (il
    // protege les deux flancs) ; c'est ici, en accent, que le Rempart porte sa
    // seule irregularite structurelle.
    g.fillStyle = R.accent;
    g.beginPath(); g.arc(-8.5, -13, 1.8, 0, 7); g.fill();

    if (k.shoot) {
      g.fillStyle = R.accent;
      g.beginPath(); g.arc(24, 0, 4.5, 0, 7); g.fill();
    }
  };
}

function healClassAccents(k) {
  const move = k.move ?? 0;
  return (g, R) => {
    // Embleme en CROIX : c'est le seul signe du jeu qui dit « celui-la soigne »,
    // et il doit se lire sans couleur — un daltonien doit s'en sortir.
    g.fillStyle = R.contour;
    g.fillRect(-2.4, -8, 4.8, 16);
    g.fillRect(-8, -2.4, 16, 4.8);

    // Coutures de coque : deux arcs qui traversent le corps, pour lire des
    // panneaux rapportes plutot qu'une capsule pleine — meme raisonnement que
    // le hexagone inscrit du Rempart, sur la meme reference (docs/refs/classes.png).
    g.strokeStyle = R.ombre;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-3, -12.5); g.quadraticCurveTo(-4, 0, -3, 12.5);
    g.moveTo(4, -12.8); g.quadraticCurveTo(5, 0, 4, 12.8);
    g.stroke();

    // Bille au bout de l'antenne : le joint que le trace plat n'a pas. Suit le
    // meme `move` que l'antenne elle-meme, pour rester soudee a sa pointe.
    g.fillStyle = R.contour;
    g.beginPath(); g.arc(9.5 - move * 3, -21, 2, 0, 7); g.fill();

    // Collerette a la base de l'embouchure.
    g.strokeStyle = R.ombre;
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(17, -5.6); g.lineTo(17, 5.6); g.stroke();

    if (k.shoot) {
      // Faisceau a la place du canon en mode soin : le mode doit se voir de
      // loin, c'est une information tactique pour toute l'equipe.
      g.save();
      g.globalAlpha = 0.5;
      g.fillStyle = R.lumiere;
      g.beginPath(); g.moveTo(12, -5); g.lineTo(26, -2); g.lineTo(26, 2); g.lineTo(12, 5);
      g.closePath(); g.fill();
      g.restore();
    }
  };
}

function dpsClassAccents(k) {
  return (g, R) => {
    g.fillStyle = R.lumiere;
    g.beginPath();
    g.moveTo(12, 0); g.lineTo(-2, -4.5); g.lineTo(-5, 0); g.lineTo(-2, 4.5);
    g.closePath(); g.fill();

    // Facette de plaque : une ligne qui suit le bord du dard des deux cotes,
    // pour lire deux plaques rapportees plutot qu'une pointe pleine —
    // reference : docs/refs/classes.png.
    g.strokeStyle = R.ombre;
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(9, -3); g.lineTo(-3, -7);
    g.moveTo(9, 3); g.lineTo(-3, 7);
    g.stroke();

    // Collier de canon, a mi-longueur.
    g.strokeStyle = R.ombre;
    g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(15, -2.6); g.lineTo(15, 2.6); g.stroke();

    if (k.shoot) {
      g.fillStyle = R.accent;
      g.beginPath(); g.arc(25, 0, 3.4, 0, 7); g.fill();
    }
  };
}

/* Construction de l'atlas, par tranches. Elle prend quelques dizaines de
   millisecondes au total ; on la decoupe quand meme pour que l'ecran de
   chargement puisse afficher un pourcentage plutot que de geler puis
   disparaitre. */
export async function buildAtlas(onProgress) {
  if (atlas) return atlasStats();   // une seule generation par session

  // EXPERIENCE JETABLE : precharge les 3 rasters de classe si le dossier de
  // test existe, sinon `raster` reste vide et `plan()` retombe sur le trace
  // vectoriel comme toujours. Echec de chargement = silencieux, pas de
  // garde-fou a construire pour un test qu'on retire ensuite.
  const raster = {};
  await Promise.all([["tank", "rempart"], ["soigneur", "soigneur"], ["dps", "tireur"]]
    .map(([id, file]) => new Promise(res => {
      const img = new Image();
      img.onload = () => { raster[id] = img; res(); };
      img.onerror = () => res();
      img.src = `/assets/raster_test/${file}.png`;
    })));

  const jobs = plan(raster);
  const rows = Math.ceil(jobs.length / COLS);

  atlas = document.createElement("canvas");
  // Le pas de grille porte la GOUTTIERE : la case utile reste a CELL, mais deux
  // pixels transparents la separent de sa voisine. Voir le commentaire de PAD.
  atlas.width = COLS * PITCH_PX;
  atlas.height = rows * PITCH_PX;
  const g = atlas.getContext("2d");
  g.scale(DPR, DPR);

  for (let i = 0; i < jobs.length; i++) {
    const id = slot(jobs[i].name);
    const cx = (id % COLS) * PITCH + PITCH / 2;
    const cy = Math.floor(id / COLS) * PITCH + PITCH / 2;
    g.save();
    g.translate(cx, cy);
    jobs[i].paint(g);
    g.restore();

    if ((i & 7) === 7) {
      onProgress?.((i + 1) / jobs.length);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  onProgress?.(1);

  /* Planche de silhouettes BLANCHES, construite a cote. C'est l'eclair d'impact
     le moins cher qui existe : le rendu par sprites fait tout le travail, un
     second passage en blanc applique DANS le canvas hors ecran, ou l'alpha est
     deja la silhouette. Le faire a l'ecran aurait peint tout le fond de
     l'arene, qui est opaque. */
  flashAtlas = document.createElement("canvas");
  flashAtlas.width = atlas.width;
  flashAtlas.height = atlas.height;
  const fg = flashAtlas.getContext("2d");
  fg.drawImage(atlas, 0, 0);
  fg.globalCompositeOperation = "source-atop";
  fg.fillStyle = COMBAT.flash;
  fg.fillRect(0, 0, flashAtlas.width, flashAtlas.height);

  return { frames: jobs.length, w: atlas.width, h: atlas.height };
}

/* --- bascule WebGL ---------------------------------------------------------
   `drawSprite` reste LE point de passage : le batcher se branche ici, et pas un
   appelant ne bouge. Le chemin canvas 2D reste vivant juste en dessous — c'est
   le repli en cas de perte de contexte, et la reference de comparaison
   visuelle tant que la migration n'est pas finie. */
let renderer = null;
let targets = new Set();
const WHITE = [255, 255, 255];

export function bindGL(r, ctxList) {
  renderer = r;
  targets = new Set(ctxList ?? []);
  if (r) {
    r.setFlashColor(...parseColor(COMBAT.flash).map(v => v / 255));
    r.setAtlas(atlas);
  }
}

// Le contexte restaure repart d'une texture vide : l'atlas est a RETELEVERSER,
// sinon le jeu revient en sprites blancs. Appele par le gestionnaire de
// restauration du client.
export function reuploadAtlas() {
  renderer?.setAtlas(atlas);
}

export function atlasCanvas() { return atlas; }

/* Cote d'une case, en unites monde. Exporte pour une seule raison : les
   particules passent par `drawSprite` sur la case blanche, et leur taille se
   demande en `scaleX`. Sans cette constante l'appelant recopierait 60, ce qui
   ferait mentir toutes les particules le jour ou la case change de taille. */
export const SPRITE_CELL = CELL;

// Vrai quand le rendu passe reellement par le batcher. Les particules s'en
// servent pour choisir leur plafond : trois mille quads ne coutent rien en
// WebGL et sont hors de portee du canvas 2D, qui les paie en `fillRect`.
export function glActive() { return !!(renderer && renderer.ok); }

/* Canvas de travail pour la teinte. UN seul, reutilise : allouer un canvas par
   appel ferait travailler le ramasse-miettes soixante fois par seconde. */
let scratch = null;

function scratchCtx() {
  if (!scratch) {
    scratch = document.createElement("canvas");
    scratch.width = scratch.height = PX;
  }
  return scratch.getContext("2d");
}

/* --- LE point de passage ------------------------------------------------------

   Toute entite passe par ici, sans exception.

   `tint` existe DES AUJOURD'HUI, meme implemente par un mode de composition
   approximatif : sans lui, il faudrait reprendre tous les appelants le jour ou
   il devient gratuit. C'est le parametre qui remplacera a terme le marquage des
   elites et les variantes d'etat.

   `flash` est son cas particulier deja cuit : la silhouette blanche est
   pre-calculee, donc elle ne coute rien, la ou une teinte demande trois
   operations sur un canvas de travail. En WebGL les deux deviendront le meme
   uniforme. */
export function drawSprite(g, frame, x, y, {
  angle = 0,
  scaleX = 1,
  scaleY = 1,
  tint = null,
  alpha = 1,
  flash = 0,
  additive = false,
} = {}) {
  if (!atlas) return;
  const rect = cellRect(frame);
  const sx = rect.x, sy = rect.y;

  /* CHEMIN WEBGL. Il ne s'ouvre que pour les contextes DECLARES par `bindGL` :
     la silhouette du salon et la planche de controle passent leur propre
     contexte 2D et doivent continuer de l'utiliser. C'est aussi ce qui evite
     un drapeau global que deux appelants liraient differemment.

     Aucun appelant ne change — c'etait tout le but de n'avoir qu'un seul point
     de passage, et c'est le critere d'acceptation de la bascule. */
  if (renderer && renderer.ok && targets.has(g)) {
    renderer.setBlend(additive ? BLEND_ADD : BLEND_NORMAL);
    const [tr, tg, tb] = tint ? parseColor(tint) : WHITE;
    const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
    // Teinte PREMULTIPLIEE par l'alpha, les quatre canaux : la texture l'est
    // deja, et l'oublier donne un additif deux fois trop lumineux.
    renderer.quad(
      sx / atlas.width, sy / atlas.height,
      (sx + PX) / atlas.width, (sy + PX) / atlas.height,
      x, y, HALF * scaleX, HALF * scaleY, angle,
      (tr * a) | 0, (tg * a) | 0, (tb * a) | 0, (a * 255) | 0,
      flash > 0 ? Math.min(255, (flash * 255) | 0) : 0);
    return;
  }

  g.save();
  g.translate(x, y);
  if (angle) g.rotate(angle);
  if (scaleX !== 1 || scaleY !== 1) g.scale(scaleX, scaleY);
  if (alpha !== 1) g.globalAlpha *= alpha;

  if (tint) {
    const s = scratchCtx();
    s.clearRect(0, 0, PX, PX);
    s.drawImage(atlas, sx, sy, PX, PX, 0, 0, PX, PX);
    // Multiplier puis re-masquer : le multiply deborde sur les pixels
    // transparents, `destination-in` leur rend leur alpha d'origine.
    s.globalCompositeOperation = "multiply";
    s.fillStyle = tint;
    s.fillRect(0, 0, PX, PX);
    s.globalCompositeOperation = "destination-in";
    s.drawImage(atlas, sx, sy, PX, PX, 0, 0, PX, PX);
    s.globalCompositeOperation = "source-over";
    g.drawImage(scratch, 0, 0, PX, PX, -HALF, -HALF, CELL, CELL);
  } else {
    g.drawImage(atlas, sx, sy, PX, PX, -HALF, -HALF, CELL, CELL);
  }

  if (flash > 0) {
    g.globalAlpha *= Math.min(1, flash);
    g.drawImage(flashAtlas, sx, sy, PX, PX, -HALF, -HALF, CELL, CELL);
  }

  g.restore();
}

/* Mesure, pour le drapeau `?perf` : le lot demande de verifier que l'atlas
   reste sous 12 Mo et sous 300 ms de generation, et une mesure qu'on ne peut
   pas refaire ne vaut rien. */
export function atlasStats() {
  if (!atlas) return { mo: 0, w: 0, h: 0, frames: 0 };
  return {
    mo: (atlas.width * atlas.height * 4 * 2) / 1048576,   // planche + silhouettes
    w: atlas.width, h: atlas.height, frames: count,
  };
}

/* Planche de controle : tous les sprites en NOIR UNI sur fond blanc. Ce n'est
   pas un gadget, c'est le critere d'acceptation des silhouettes — un lecteur
   qui ne connait pas le jeu doit pouvoir les regrouper par type sans hesiter.
   Un type qui n'est reconnaissable que par sa couleur a rate son test.
   Accessible par `?planche` dans l'adresse. */
export function silhouetteSheet() {
  const c = document.createElement("canvas");
  c.width = atlas.width;
  c.height = atlas.height;
  const g = c.getContext("2d");
  // L'ordre compte : on aplatit d'abord les sprites en noir sur du VIDE, puis
  // on glisse le blanc dessous. Peindre le fond blanc en premier rendait tout
  // le canvas opaque, et le `source-atop` noircissait la planche entiere.
  g.drawImage(atlas, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "#000000";
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-over";
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
