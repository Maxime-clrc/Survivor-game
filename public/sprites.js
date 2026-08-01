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

   BUDGET REEL : 5 types x 7 images (4 formes + 3 morts) + 3 classes x 4 = 47
   images de 60 px logiques. A une densite de 2, l'atlas fait 840 x 840 px, soit
   2,8 Mo — tres en dessous du plafond de 12 Mo et de la limite de 4096 px de
   cote, sure partout. Le boss n'y est pas : il est unique a l'ecran, son cout
   est negligeable, et il gagne a etre anime en continu au trace.
   =========================================================================== */

import { ENEMY, COMBAT, ramp } from "/shared/palette.js";

/* Cote d'une case, en unites MONDE. Le plus gros sprite est le tank (21 de
   rayon) plus son contour et ses epaules debordantes : 60 laisse la marge
   qu'il faut sans gaspiller de texture. */
const CELL = 60;
const HALF = CELL / 2;
const COLS = 7;

/* Densite de pixels de l'atlas. Elle suit celle de l'ecran — un atlas genere a
   1 sur une dalle 1440p redonnerait exactement le flou qu'on est venu corriger
   dans le canvas. Plafonnee a 2 pour la meme raison qu'ailleurs : au-dela on
   quadruple le remplissage pour un gain invisible. */
const DPR = Math.min(globalThis.devicePixelRatio || 1, 2);
const PX = CELL * DPR;

let atlas = null;        // le canvas unique
let flashAtlas = null;   // la meme planche, en silhouettes blanches
const index = new Map(); // nom -> numero de case
let count = 0;

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
function bake(g, R, path, accents, edge = 2) {
  // 1 — silhouette
  g.beginPath(); path(g); g.closePath();
  g.fillStyle = R.base;
  g.fill();

  // 2 — ombrage, ecrete a la silhouette
  g.save();
  g.clip();
  g.translate(2, 2);
  g.beginPath(); path(g); g.closePath();
  g.fillStyle = R.ombre;
  g.globalAlpha = 0.85;
  g.fill();
  g.restore();

  // 3 — lumiere, un arc en haut-gauche, ecrete de meme
  g.save();
  g.beginPath(); path(g); g.closePath();
  g.clip();
  g.strokeStyle = R.lumiere;
  g.lineWidth = 4;
  g.globalAlpha = 0.55;
  g.beginPath();
  g.arc(0, 0, HALF * 0.42, Math.PI * 1.05, Math.PI * 1.72);
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
      g.moveTo(8, s * 5);
      g.lineTo(21, s * (2.5 + open));
      g.lineTo(22, s * (6 + open));
      g.lineTo(9, s * 10);
      g.closePath();
    }

    // Pattes : trois paires courtes, en sous-traces separes, qui alternent
    // d'une image de marche a l'autre. C'est le SEUL changement de forme du
    // cycle — la respiration et l'etirement sont des transformations.
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const px = -9 + i * 6;
        const alt = (i + (s > 0 ? 0 : 1) + (legs < 0 ? 1 : 0)) & 1;
        const ext = 3.5 + (alt && legs !== 0 ? 3.5 : 0);
        g.moveTo(px - 2.5, s * 10);
        g.lineTo(px + 0.5, s * (12 + ext));
        g.lineTo(px + 3, s * 10);
        g.closePath();
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
      g.moveTo(-13, s * 8);
      g.lineTo(-9 + step * 2, s * out);
      g.lineTo(6 + step * 2, s * out);
      g.lineTo(11, s * 8);
      g.closePath();
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
    // Trois segments empiles, du plus gros au plus petit vers l'arriere.
    g.moveTo(9, -9);
    g.lineTo(13 + recoil * 3, -3.5);
    g.lineTo(22 + recoil * 4, -3);   // canon
    g.lineTo(22 + recoil * 4, 3);
    g.lineTo(13 + recoil * 3, 3.5);
    g.lineTo(9, 9);
    g.lineTo(-2, 12);
    g.lineTo(-9, 7);
    g.lineTo(-12, 0);
    // Asymetrie : le segment arriere est plus haut d'un cote.
    g.lineTo(-9, -9);
    g.lineTo(-2, -13.5);
  };
}

function shooterAccents(g, R) {
  // Oeil cyclopeen : le seul type a n'en avoir qu'un, et c'est ce qui le
  // distingue du grunt a douze pixels.
  g.fillStyle = R.contour;
  g.beginPath(); g.arc(1, 0, 6.4, 0, 7); g.fill();
  g.fillStyle = R.accent;
  g.beginPath(); g.arc(2, 0, 3.8, 0, 7); g.fill();
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

/* --- les trois classes -----------------------------------------------------
   LA FORME DIT LA CLASSE, LA COULEUR DIT LE JOUEUR. Les quatre couleurs de
   joueur sont deja prises par l'identite individuelle : si la classe passait
   elle aussi par la couleur, deux tanks seraient indistinguables ou deux
   joueurs se confondraient.

   Consequence : les sprites de classe sont cuits dans une rampe NEUTRE et
   claire, et `drawSprite` les teinte a la couleur du joueur. Une teinte
   multiplicative sur du blanc rend exactement la couleur demandee. */
const NEUTRAL = ramp("#dfe5f0");

function tankClassPath(k) {
  const move = k.move ?? 0;
  return g => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * 14, py = Math.sin(a) * 12.5;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    // Deux plaques laterales debordantes : c'est la silhouette du REMPART.
    for (const s of [-1, 1]) {
      g.lineTo(-3, s * 13);
      g.lineTo(4 + move, s * 16.5);
      g.lineTo(9, s * 10);
    }
    // Canon court et large.
    g.lineTo(13, -5);
    g.lineTo(21, -4.5);
    g.lineTo(21, 4.5);
    g.lineTo(13, 5);
  };
}

function healClassPath(k) {
  const move = k.move ?? 0;
  return g => {
    g.moveTo(14, 0);
    for (let i = 1; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.lineTo(Math.cos(a) * (13 + move * 0.6), Math.sin(a) * 13);
    }
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
  };
}

/* --- construction ----------------------------------------------------------- */

const ENEMY_SHAPES = ["idle", "walkA", "walkB", "open"];
const DEATH_STEPS = ["die0", "die1", "die2"];
const CLASS_SHAPES = ["idle", "move", "shoot", "down"];

/* Table de generation. Une entree par case de l'atlas : son nom, et la fonction
   qui la peint. Elle est construite avant tout dessin pour que la taille de
   l'atlas soit connue d'un coup — recompter les cases en cours de route
   demanderait de tout redessiner. */
function plan() {
  const jobs = [];

  const enemies = [
    { path: gruntPath,   accents: gruntAccents, edge: 2, floats: false,
      shapes: [{ legs: 0 }, { legs: 1 }, { legs: -1 }, { legs: 0, open: true }] },
    { path: runnerPath,  accents: () => runnerAccents, edge: 2, floats: false,
      shapes: [{ fin: 0 }, { fin: 0.6 }, { fin: -0.4 }, { fin: 1.4 }] },
    { path: tankPath,    accents: () => tankAccents, edge: 3, floats: false,
      shapes: [{ plates: 1, step: 0 }, { plates: 1, step: 1 }, { plates: 1, step: -1 },
               { plates: 0, step: 0 }] },
    { path: shooterPath, accents: () => shooterAccents, edge: 2, floats: true,
      shapes: [{ recoil: 0 }, { recoil: 0.3 }, { recoil: -1 }, { recoil: 1 }] },
    { path: broodPath,   accents: null, edge: 2, floats: false,
      shapes: [{ swell: 0 }, { swell: 0.35 }, { swell: -0.25 }, { swell: 1.3 }] },
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
    { id: "tank",     path: tankClassPath, edge: 3, accents: tankClassAccents },
    { id: "soigneur", path: healClassPath, edge: 1.6, accents: healClassAccents },
    { id: "dps",      path: dpsClassPath,  edge: 2, accents: dpsClassAccents },
  ];

  classes.forEach(def => {
    CLASS_SHAPES.forEach((nom, i) => {
      const k = { move: i === 1 ? 1.5 : 0, shoot: i === 2, down: i === 3 };
      const path = def.path(k);
      jobs.push({
        name: `c_${def.id}_${nom}`,
        paint: g => {
          if (k.down) g.globalAlpha = 0.55;
          bake(g, NEUTRAL, path, def.accents(k), def.edge);
          g.globalAlpha = 1;
        },
      });
    });
  });

  return jobs;
}

function tankClassAccents(k) {
  return (g, R) => {
    g.strokeStyle = R.contour;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(-6, -9); g.lineTo(-6, 9); g.stroke();
    if (k.shoot) {
      g.fillStyle = R.accent;
      g.beginPath(); g.arc(22, 0, 4, 0, 7); g.fill();
    }
  };
}

function healClassAccents(k) {
  return (g, R) => {
    // Embleme en CROIX : c'est le seul signe du jeu qui dit « celui-la soigne »,
    // et il doit se lire sans couleur — un daltonien doit s'en sortir.
    g.fillStyle = R.contour;
    g.fillRect(-2.4, -8, 4.8, 16);
    g.fillRect(-8, -2.4, 16, 4.8);
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
  const jobs = plan();
  const rows = Math.ceil(jobs.length / COLS);

  atlas = document.createElement("canvas");
  atlas.width = COLS * PX;
  atlas.height = rows * PX;
  const g = atlas.getContext("2d");
  g.scale(DPR, DPR);

  for (let i = 0; i < jobs.length; i++) {
    const id = slot(jobs[i].name);
    const cx = (id % COLS) * CELL + HALF;
    const cy = Math.floor(id / COLS) * CELL + HALF;
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
} = {}) {
  if (!atlas) return;
  const sx = (frame % COLS) * PX;
  const sy = Math.floor(frame / COLS) * PX;

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
