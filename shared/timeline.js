/* LE SCRIPT DE LA MANCHE — module quasi pur.

   `game_state.js` l'importe, jamais l'inverse : un cycle d'import casserait le
   chargement dans le navigateur, exactement comme pour `statuses.js`,
   `bosses.js` et `cards.js`.

   UNE seule dependance, ajoutee au lot U : l'echelle d'alerte (`ALERT_*`) de
   `bosses.js`. C'est un import feuille -> feuille, donc pas un cycle — `bosses`
   n'importe rien. Il est preferable a l'alternative, qui etait de recopier les
   trois niveaux ici : l'echelle d'alerte a UN proprietaire, et deux copies de
   trois entiers auraient diverge le jour ou un quatrieme niveau apparait. La
   regle du depot vise les cycles, pas les feuilles.

   Il remplace le modele « budget puis nettoyage ». Une manche est desormais une
   CHRONOLOGIE FIXE : six segments de 300 s de horde, cinq beats de 60 s chacun,
   identiques d'une partie a l'autre. Ce qui varie entre deux equipes, c'est ce
   qu'elles en font — pas ce qu'on leur envoie.

   Les constantes de comportement du script vivent ICI, a cote de leur table, et
   non dans `CFG` : meme regle que `CARD_CFG`, `SKILL_CFG`, `STATUS_CFG` et
   `BOSS_CFG`. */

import { ALERT_ORDER, ALERT_WARN } from "./bosses.js";

export const TL_CFG = {
  SEGMENTS: 6,
  SEGMENT_TIME: 300,
  BEATS: 5,
  BEAT_TIME: 60,

  /* Marge d'apparition hors des bords, en pixels. Un ennemi nait dehors et
     entre dans le champ : il ne se materialise jamais sous les yeux. */
  SPAWN_MARGIN: 60,

  /* Geometrie `anneau` : rayon du cercle d'apparition, en part de la demi-
     hauteur de l'arene, et distance minimale a tout joueur. C'est la SEULE
     geometrie qui fait naitre un ennemi a l'interieur des limites, donc la
     seule qui puisse deposer un corps dans le disque ou il serait invulnerable
     a son porteur — voir `_spawnPoint` cote simulation. */
  RING_RATIO: 0.62,
  RING_CLEAR: 120,
  RING_TRIES: 8,

  /* `quatre-fronts` envoie par PAQUETS et non un ennemi par bord a tour de
     role : quatre bords alimentes en alternance donnent quatre filets, pas
     quatre fronts. */
  PACK: 4,

  /* Duree d'ANNONCE d'un evenement, en secondes. Le client en retire 250 ms
     pour que le bandeau disparaisse avant la resolution — meme mecanisme que les
     mecaniques de boss, et meme raison : un texte encore affiche au moment ou ca
     se passe masque exactement ce qu'il faut regarder. Plus longue qu'une
     annonce de mecanique (1,4 a 2 s) parce qu'un evenement dure une minute :
     l'annonce n'est pas un compte a rebours avant impact, c'est le titre de ce
     qui commence. */
  EVENT_ANNOUNCE: 2.6,

  /* LE GIBIER de `chasse`. Un tank elite agrandi — c'est le seul type dont la
     silhouette supporte d'etre grossie deux fois et demie sans devenir une
     tache, et le rang d'elite se garde par-dessus pour qu'il reste lisible comme
     ce qu'il est : une elite, en beaucoup plus gros.

     Ses PV sont une PART DE CEUX D'UN BOSS du meme segment et non un multiple de
     ceux d'un tank elite. C'est le seul ancrage qui tienne : un gibier est un
     demi-boss, il doit durer une fraction d'un combat, et les deux echelles
     n'ont pas la meme pente en effectif — un tank elite fait 3 726 PV quand le
     boss du segment 5 en fait 6 627 en solo et 32 635 a quatre. Un multiple
     d'elite aurait derive du boss au premier reglage de l'un des deux.

     A 0,80, le gibier tombe en 21,7 s pour une build de reference solo (220 dps
     mesures) et en 2,7 s a x8 de puissance. C'est le GRAND ECART de D2, assume :
     ses PV ne suivent pas la puissance, et `chasse` est le meilleur endroit du
     jeu pour montrer qu'une bonne build est une bonne build — la recompense y
     est immediate et strictement proportionnelle aux degats.

     La vitesse est ABAISSEE : a cette taille, la vitesse d'un tank elite rendrait
     l'arene intraversable, et l'evenement demande de concentrer le feu, pas de
     fuir. */
  QUARRY_HP_MUL: 0.8,
  QUARRY_SIZE_MUL: 2.5,
  QUARRY_SPEED_MUL: 0.72,

  /* Ce que le gibier vaut a la jauge, en grunts. Il REMPLACE un beat entier —
     aucune autre apparition pendant sa minute — donc paye au tarif d'un tank
     elite, le joueur perdrait une carte a chaque chasse. Quarante est l'ordre de
     grandeur de ce qu'une minute ordinaire rapporte a mi-partie : on ne perd
     rien a chasser, on n'y gagne pas non plus une prime. */
  QUARRY_XP_WORTH: 40,
};

/* LES SIX ETAPES ONT UN NOM (lot X). « Segment 3/6 » est une coordonnee, pas une
   information : il dit ou l'on est dans une liste, jamais ce qui s'y passe. Le
   mot etait un terme d'implementation — la structure de donnees s'appelle un
   segment — et il avait fini au HUD, sur l'ecran de cartes et sur le bilan, ou
   personne ne parle comme ca. Un joueur dit « on est morts a la Crise », pas
   « on est morts au segment 3 ».

   Les identifiants du code gardent `segment` : c'est bien le nom de la
   structure, et le renommer aurait touche deux mille lignes pour un mot que
   seul l'affichage montre. Le nom vit donc ici, a cote du script qu'il decrit,
   et le numero reste affiche a cote — « Crise · 3/6 » : le nom situe dans
   l'histoire, le numero situe dans la duree, les deux repondent a des questions
   differentes.

   Un seul mot chacun, et c'est une contrainte de HUD : la ligne porte deja le
   biome et la meteo, et le nom se lit d'un coup d'oeil ou ne se lit pas.
   L'intention de chaque etape est celle du script ci-dessous, mot pour mot —
   Ressac remplace « chaos maitrise » depuis que les accalmies ont disparu : la
   pression y reflue avant de revenir, elle ne s'y arrete plus. */
export const SEGMENT_NAMES = [
  "Installation",   // 1 — on apprend l'espace
  "Emprise",        // 2 — on domine
  "Crise",          // 3 — le point bas de la partie
  "Ressac",         // 4 — ca reflue, puis ca revient
  "Étau",           // 5 — pression maximale
  "Apothéose",      // 6 — le final
];

/* Le nom d'une etape, bornes comprises. Hors table — une manche qui deborde son
   script — on rend le numero : mieux vaut une coordonnee qu'une chaine vide. */
export function segmentName(segment) {
  return SEGMENT_NAMES[segment - 1] ?? `Segment ${segment}`;
}

/* --- LES EVENEMENTS (lot U) -----------------------------------------------------

   UN EVENEMENT EST UNE ENTREE DU SCRIPT, au meme titre qu'un beat de debit. La
   tentation etait un SECOND systeme, tirant au hasard en parallele ; deux
   autorites sur la meme horloge produisent des collisions (un evenement pendant
   un crescendo, deux evenements a la fois, un evenement pendant un boss) et une
   partie NON REPRODUCTIBLE, donc non classable.

   Le calendrier n'est donc plus une arithmetique a maintenir (`vague % 5 === 3`,
   la solution de plan4) mais une COLONNE de la table ci-dessous. Les deux
   garanties — jamais de collision avec un boss, jamais deux consecutives —
   deviennent triviales : elles se LISENT dans la table au lieu de se PROUVER par
   un modulo. On met alors un evenement la ou le rythme le demande, pas la ou le
   modulo le permet.

   TABLEAU ORDONNE dont l'index CIRCULE — dans le canal d'alerte et dans la cle
   nommee `ev`. Ajouter en fin, jamais au milieu : meme invariant que `MECHS`,
   `STATUSES` et `POWERUP_TYPES`.

   `MECHS` reste RESERVE AUX BOSS et n'a recu aucune entree ici. Un evenement de
   horde et une mecanique de boss n'ont ni le meme cycle, ni le meme client, ni
   le meme echec : les melanger ferait qu'`adaptMech` reponde a deux questions.

   `types` remplace la composition du beat ; `rateMul` porte sur le debit du
   beat. `minPlayers` / `fallback` ont la MEME signature que `MECHS` — aucun des
   quatre n'en a besoin aujourd'hui (tous fonctionnent a un joueur), les champs
   sont la pour que le prochain n'ait pas a inventer sa propre regle.

   `heal` : terminer un evenement rend 100 % des PV et du bouclier a TOUS les
   joueurs et RELEVE ceux qui sont a terre. Une seule regle, sans condition — un
   cas « releve mais pas soigne » serait illisible. Depuis que `WAVE_HEAL` a
   disparu au lot P, les evenements et les boss sont les deux SEULES sources
   garanties de remise a plein : c'est une piece majeure de l'economie de
   recuperation, pas une recompense decorative. */
export const EV_NUEE = 0;
export const EV_SIEGE = 1;
export const EV_CROISE = 2;
export const EV_CHASSE = 3;

export const EVENTS = [
  /* NUEE — uniquement des runners, tres nombreux. Elle demande de tenir une
     position et recompense les degats de zone. Debit fortement releve : un
     runner meurt en un tir, la menace est le NOMBRE. */
  { key: "nuee", nom: "Nuée", level: ALERT_WARN,
    texte: "une nuée arrive — tenez votre position",
    types: [1], rateMul: 2.6, minPlayers: 1, fallback: -1 },

  /* SIEGE — uniquement des tanks. Debit ABAISSE : un tank vaut dix runners en
     encombrement comme en PV, et le meme debit remplirait l'arene en quinze
     secondes. Elle demande de la patience et de ne pas se laisser encercler. */
  { key: "siege", nom: "Siège", level: ALERT_WARN,
    texte: "siège de blindés — ne vous laissez pas encercler",
    types: [2], rateMul: 0.38, minPlayers: 1, fallback: -1 },

  /* TIR CROISE — forte proportion de tireurs. Le seul evenement qui demande de
     FERMER la distance au lieu de la tenir, ce qui en fait l'exact inverse de la
     nuee ; les deux se repondent. Les grunts restent dans le melange, sinon
     l'arene se vide de tout ce qui oblige a bouger. */
  { key: "croise", nom: "Tir croisé", level: ALERT_WARN,
    texte: "tir croisé — fermez la distance",
    types: [3, 3, 3, 0], rateMul: 0.9, minPlayers: 1, fallback: -1 },

  /* CHASSE — un seul elite au gabarit tres augmente, AUCUN autre ennemi. C'est
     une CONSIGNE et non un avertissement : elle demande une action immediate et
     collective, concentrer le feu.

     Deux pieges, tous deux documentes ailleurs et tous deux entiers ici.
     Le gibier doit etre EXCLU DU SEUIL D'EXECUTION, comme le boss et les
     structures de mecanique : sinon le dernier quart de sa reserve disparait en
     un tir pour tout joueur qui a la carte.
     Et sous D2 ses PV ne suivent plus la puissance, donc une build optimisee
     l'expedie en quelques secondes. C'est ASSUME et sans plancher de duree : le
     plancher de barre des boss existe pour proteger une choregraphie, `chasse`
     n'en a pas — c'est au contraire le meilleur endroit du jeu pour montrer
     qu'une bonne build est une bonne build, puisque la recompense y est
     immediate et proportionnelle aux degats. */
  { key: "chasse", nom: "Chasse", level: ALERT_ORDER,
    texte: "CONCENTREZ LE FEU sur la cible",
    types: [], rateMul: 0, minPlayers: 1, fallback: -1 },
];

export function eventAt(id) { return EVENTS[id] ?? null; }

/* Geometries d'apparition. TABLEAU ORDONNE mais son index NE CIRCULE PAS : la
   geometrie est resolue cote serveur au moment de l'apparition, le client ne
   voit que des positions. On peut donc le reordonner sans rien casser — c'est
   l'exception, pas la regle. */
export const GEOMETRIES = ["bords", "front", "pince", "quatre-fronts", "anneau"];

/* LE SCRIPT. Debit en apparitions par seconde, AVANT effectif et difficulte :
   les memes facteurs qu'avant s'appliquent par-dessus (`crowd^WAVE_CROWD_EXP`
   et `diff.spawn`).

   La courbe n'est pas monotone dans un segment — 2,4 puis 2,2 au segment 3,
   3,4 puis 3,2 au segment 5. Ce n'est pas une coquille : une rampe strictement
   croissante se lit comme un ETAT, un resserrement qui relache puis reprend se
   lit comme une RESPIRATION. C'est le raisonnement deja ecrit pour la posture
   des boss.

   Le point bas de la partie est au segment 4 et non au 5 : une courbe qui ne
   fait que monter n'a pas de sommet.

   AVERTISSEMENT MESURE (lot X) — CES DEBITS SONT INOPERANTS DES LA 5e MINUTE.
   La population bute sur `CFG.MAX_ENEMIES` des la CINQUIEME minute de horde en
   cauchemar a deux joueurs et plus, la huitieme en normal, la neuvieme ou
   dixieme en calme — et y reste les deux tiers du temps ; passe le plafond,
   `_spawnEnemy` rend `null` et les apparitions sont jetees en silence. Ecrire 4,6 ou 5,0 dans les derniers beats ne change donc
   RIEN a ce qui arrive a l'ecran, et le residu `spawn` du profil de difficulte
   (x0,80 / x1,00 / x1,28) n'y change rien non plus — trois modes qui butent sur
   le meme plafond envoient la meme quantite.

   C'est un choix ASSUME et non un defaut a corriger : le plafond est une
   contrainte de performance, un monstre tue libere une place, et ce qui
   differencie les modes doit etre le COMPORTEMENT (traits, patterns d'attaque
   et de mouvement, roster) et non la quantite. La consequence pratique : ne pas
   passer une soiree a regler un debit tardif en croyant changer la difficulte.
   Le levier est dans `DIFFICULTIES[i].traits` et `.roster`.

   LES ACCALMIES ONT DISPARU (lot X), et l'argument qui les portait est mort
   avec sa premisse. Il etait ecrit ici meme : « sans nettoyage de vague, dans un
   ECRAN FIXE et SANS CAMERA, la population tend vers MAX_ENEMIES et y reste ».
   Le lot I a donne au jeu une arene de 4800 x 2700 pour une vue de 1600 x 900 et
   une camera qui suit le joueur — neuf fois la surface, et la possibilite de
   se decrocher d'un paquet au lieu d'attendre qu'il se vide. La respiration ne
   vient plus d'un trou dans le debit, elle vient du DEPLACEMENT.

   Ce qu'un beat de silence portait en plus est repris ailleurs, sans quoi on
   perdrait deux choses au lieu d'en retirer une :
     - la fenetre de recuperation -> l'ecran de cartes, qui s'ouvre desormais a
       chaque niveau (lot X) et arrete la simulation le temps du choix ;
     - le bonus au sol force -> `CFG.POWERUP_*`, seul reglage de cadence des
       bonus, et le premier levier de la table de recuperation du lot X.

   Les quatre beats concernes reprennent leur PLACE SUR LA COURBE — la moyenne de
   leurs voisins, exactement la regle que `comble()` appliquait aux variantes.
   Garder leur debit d'origine (0,5 la ou les voisins font 1,2 et 1,8) aurait
   donne le pire des deux mondes : une accalmie qu'on ne lit plus mais qui vide
   quand meme l'arene.

   `minPlayers` / `fallback` : la MEME signature que `MECHS`, et pour la meme
   raison. A budget constant, une petite equipe recoit moins de menaces mais
   plus grosses et par un front unique — on resout par le positionnement ; une
   grande equipe recoit plus de fronts simultanes — on resout par la
   coordination. La quantite ne change pas, la forme si. */
export const SCRIPT = [
  // segment 1 — installation
  [
    { rate: 0.6, geom: "bords" },
    { rate: 0.9, geom: "bords" },
    { rate: 1.2, geom: "front" },
    { rate: 1.5, geom: "bords" },
    { rate: 1.8, geom: "pince" },
  ],
  // segment 2 — on domine
  [
    { rate: 1.4, geom: "bords" },
    { rate: 1.7, geom: "front" },
    { rate: 2.0, geom: "pince", event: EV_NUEE },
    { rate: 2.3, geom: "bords" },
    { rate: 2.6, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
  // segment 3 — la crise : le point bas de la partie
  [
    { rate: 2.0, geom: "front" },
    { rate: 2.4, geom: "pince", event: EV_CROISE },
    { rate: 2.2, geom: "bords" },
    { rate: 2.8, geom: "quatre-fronts", minPlayers: 3, fallback: "front" },
    { rate: 3.2, geom: "pince" },
  ],
  // segment 4 — ressac : ca reflue, puis ca revient
  [
    { rate: 2.2, geom: "bords" },
    { rate: 2.5, geom: "bords" },
    { rate: 2.9, geom: "front", event: EV_SIEGE },
    { rate: 3.3, geom: "pince" },
    { rate: 3.8, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
  // segment 5 — l'etau : pression maximale
  [
    { rate: 3.0, geom: "pince" },
    { rate: 3.4, geom: "quatre-fronts", minPlayers: 3, fallback: "front", event: EV_CHASSE },
    { rate: 3.2, geom: "bords" },
    { rate: 3.9, geom: "front" },
    { rate: 4.4, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
  // segment 6 — apotheose
  [
    { rate: 3.4, geom: "front" },
    { rate: 3.7, geom: "bords" },
    { rate: 4.0, geom: "pince", event: EV_NUEE },
    { rate: 4.6, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
    { rate: 5.0, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
];

/* --- LES TROIS VARIANTES (lot T) ------------------------------------------------

   Une difficulte choisit sa table par nom (`profil.script`). Depuis que les
   accalmies ont disparu (lot X), il ne reste qu'UN axe ici, et il faut le dire
   franchement plutot que de laisser croire qu'il y en a deux :

     - QUELLE GEOMETRIE. Calme reste sur `bords` et `front` — une menace qui
       arrive d'un cote se lit ; cauchemar prend `pince`, `quatre-fronts` et
       `anneau`, qui demandent de tenir plusieurs directions a la fois.

   L'axe perdu etait « OU SONT LES SILENCES », et c'etait le plus fort des deux :
   six accalmies contre une faisaient deux jeux differents. Il n'a PAS ete
   remplace par un equivalent dans cette table, et c'est volontaire — le seul
   substitut a portee de main etait un debit propre a chaque variante, or c'est
   exactement le second bouton sur la meme grandeur que le paragraphe suivant
   refuse. Ce que le mode change se lit ailleurs, et y est deja plus lisible : le
   roster, les traits attaches et le residu du profil (`game_state.js`).

   LA QUANTITE N'EST PAS ICI. Les debits sont IDENTIQUES d'une variante a
   l'autre : c'est `diff.spawn` (0,80 / 1,00 / 1,28) qui la porte, et lui seul.
   Le plan demandait des debits abaisses en calme et releves en cauchemar EN PLUS
   du residu ; ce serait deux boutons sur la meme grandeur, et le depot a deja
   tranche ce cas exact pour l'effectif — `adaptEntry` « ne change que la FORME
   de la pression, jamais sa quantite ». Un jour ou l'autre on regle l'un en
   croyant regler l'autre.

   Les variantes sont DERIVEES de la reference et non recopiees : trois tables de
   trente beats ecrites a la main auraient diverge au premier reglage de debit,
   ce qui est precisement le defaut qu'on vient de decrire. On decrit ce qui
   CHANGE — la geometrie — et le reste suit. */

/* Geometrie par variante. Une fonction du beat de reference plutot qu'une table
   : calme RETOMBE sur la geometrie la plus lisible quand la reference en demande
   une qui exige de tenir plusieurs directions, cauchemar DURCIT dans l'autre
   sens. C'est exactement la signature d'`adaptEntry`, appliquee a un autre axe. */
const GEOM_CALME = { pince: "front", "quatre-fronts": "front", anneau: "bords" };
const GEOM_CAUCHEMAR = { bords: "front", front: "pince", pince: "quatre-fronts" };

function derive(nom) {
  const dur = nom === "cauchemar";
  const doux = nom === "calme";
  return SCRIPT.map(seg => seg.map(b => {
    let geom = b.geom;
    if (doux) geom = GEOM_CALME[geom] ?? geom;
    else if (dur) geom = GEOM_CAUCHEMAR[geom] ?? geom;
    const out = { ...b, geom };
    /* Un repli de geometrie perd son sens quand la geometrie a change : la table
       `minPlayers` / `fallback` de la reference dit « a moins de trois joueurs,
       quatre-fronts devient pince ». En calme quatre-fronts n'existe deja plus,
       en cauchemar le repli doit durcir avec le reste. */
    if (out.fallback) out.fallback = doux ? (GEOM_CALME[out.fallback] ?? out.fallback)
      : dur ? (GEOM_CAUCHEMAR[out.fallback] ?? out.fallback)
      : out.fallback;
    return out;
  }));
}

export const SCRIPTS = {
  calme: derive("calme"),
  normal: derive("normal"),
  cauchemar: derive("cauchemar"),
};

const REPLI = { rate: 1.0, geom: "bords" };

/* Le beat courant, bornes comprises. `script` est le NOM de la variante, tire du
   profil de difficulte ; `segment` compte a partir de 1 comme dans la
   simulation. Hors table on rend un repli plutot qu'`undefined` : une manche qui
   deborde son script doit continuer de tourner, et un profil dont le nom de
   variante ne correspond a rien doit rester jouable en normal. */
export function beatAt(script, segment, beat) {
  const table = SCRIPTS[script] ?? SCRIPTS.normal;
  const seg = table[segment - 1];
  if (!seg) return REPLI;
  return seg[Math.max(0, Math.min(seg.length - 1, beat))] ?? REPLI;
}

/* Adaptation a l'effectif VIVANT, sur le modele exact d'`adaptMech` : un seul
   point de passage, un seul niveau de repli. Un repli qui replie serait
   impossible a lire dans la table, qui est justement ce qui rend le systeme
   tenable. Rend toujours une entree utilisable — le debit ne change pas, seule
   la geometrie retombe. */
export function adaptEntry(entry, alive) {
  if (!entry) return REPLI;
  if (!entry.minPlayers || alive >= entry.minPlayers) return entry;
  const back = entry.fallback;
  if (!back || !GEOMETRIES.includes(back)) return { ...entry, geom: "bords" };
  return { ...entry, geom: back };
}

/* Adaptation d'un EVENEMENT a l'effectif vivant. Le meme point de passage que
   `adaptEntry` aurait ete tentant, mais les deux tables ne repondent pas a la
   meme question — l'une choisit une geometrie, l'autre choisit une composition —
   et c'est exactement la confusion qu'on refuse entre `MECHS` et `EVENTS`. Meme
   signature, meme regle du SEUL niveau de repli, deux fonctions.

   Rend l'index de l'evenement REELLEMENT joue, ou -1 s'il n'a pas lieu d'etre.
   Aucun des quatre n'est adapte aujourd'hui : ils fonctionnent tous a un joueur,
   le gibier de `chasse` suivant deja l'effectif par ses PV. */
export function adaptEvent(id, alive) {
  const def = EVENTS[id];
  if (!def) return -1;
  if (alive >= def.minPlayers) return id;
  const back = def.fallback ?? -1;
  if (back < 0) return -1;
  const bd = EVENTS[back];
  return bd && alive >= bd.minPlayers ? back : -1;
}

/* VERIFICATION DU CALENDRIER. Ce n'est pas un test unitaire deguise : c'est le
   critere d'acceptation du lot, et il ne vaut que s'il est rejouable. Il rend la
   liste des collisions trouvees, vide quand tout va bien.

   Trois regles, et les trois etaient des GARANTIES A PROUVER du temps du
   modulo de plan4 ; elles se LISENT desormais dans la table, ce qui est tout
   l'interet du calendrier explicite :
     - pas d'evenement sur un beat de crescendo (le crescendo EST l'evenement) ;
     - jamais deux evenements sur des beats consecutifs ;
     - pas d'evenement inconnu.
   La quatrieme — pas d'evenement sur un silence — est partie avec les accalmies
   au lot X. Elle n'a pas de successeur : plus rien dans la table n'a priorite
   sur un evenement.
   La collision avec un BOSS ne se teste pas : l'horloge de horde est arretee
   pendant un combat, donc aucun beat ne tourne — la question ne se pose plus. */
export function verifierScript() {
  const soucis = [];
  for (const [nom, table] of Object.entries(SCRIPTS)) {
    let precedent = -9;
    table.forEach((seg, s) => seg.forEach((b, i) => {
      const ou = `${nom} ${s + 1}.${i + 1}`;
      if (b.event === undefined) return;
      if (!EVENTS[b.event]) soucis.push(`${ou} : evenement inconnu ${b.event}`);
      if (i === TL_CFG.BEATS - 1) soucis.push(`${ou} : evenement sur un crescendo`);
      const idx = s * TL_CFG.BEATS + i;
      if (idx - precedent < 2) soucis.push(`${ou} : deux evenements consecutifs`);
      precedent = idx;
    }));
  }
  return soucis;
}

// Index global du beat, de 0 a 29. Il sert de PALIER de progression a tout ce
// qui lisait le numero de vague (seuils de type, jalons de legendaire, rampes
// de PV) jusqu'a ce que le lot Q reindexe le tout sur le niveau d'equipe.
export function beatIndex(segment, beat) {
  return (segment - 1) * TL_CFG.BEATS + beat;
}
