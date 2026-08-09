/* ===========================================================================
   BOSS, MARQUES, JOUEURS
   Le boss n'est pas dans l'atlas : il est unique a l'ecran, son cout est
   negligeable, et il gagne a etre anime en continu au trace.
   =========================================================================== */

import { BOSS_FINAL, BOSS_JUMEAUX, BOSS_MATRIARCHE, BOSS_METRONOME, BOSS_ORACLE, MECH_BAIT, MECH_CLUSTER, MECH_COUNT, MECH_FEED, MECH_JAIL, MECH_LINK, MECH_PROX, MECH_SANCTUARY, MECH_SEAL, MECH_SPREAD, MECH_STACK, MECH_TOWER } from "/shared/bosses.js";
import { CARD_CFG } from "/shared/cards.js";
import { CLASS_DEFAULT, SKILL_CFG, SKILL_HEAL_MODE, SKILL_OVERDRIVE, SKILL_TAUNT, classAt } from "/shared/classes.js";
import { BUFF_DAMAGE, BUFF_DOUBLE, BUFF_PIERCE, BUFF_RATE, BUFF_RICOCHET, CFG } from "/shared/game_state.js";
import { BOSS, BOSS_SKIN, CLASS_COLOR, COMBAT, EFFECT_COLOR, FX, HUD, MARK, POWERUP_COLOR, SIGNAL, SURFACE, TEXT, alpha } from "/shared/palette.js";
import { STATUSES, STATUS_DOOM, STATUS_VULN } from "/shared/statuses.js";
import { drawSprite, frameOf } from "/sprites.js";
import { amSpectator, dash, myId, phase, predicted } from "../core/state.js";
import { activeStatuses, bossCue, paintStatusIcon, setBossCue } from "../net/interp.js";
import { drawBombRange } from "./actors.js";
import { lastBossPos } from "./fx.js";
import { aimVector, colorOf, ctx, mouse, nameOf, setCtx, underCtx } from "./stage.js";

/* ===========================================================================
   LES CINQ BOSS

   Une routine par boss, et non une routine unique parametree par la couleur.
   Le roster est construit autour de cinq VERBES — positionnement, gestion de
   cibles, mouvement, cohesion, separation — et jusqu'au lot 6 les cinq
   partageaient la meme couronne de pointes : mecaniquement ils n'avaient rien
   a voir, visuellement ils etaient interchangeables.

   Chacune doit ANNONCER SON VERBE et passer le test du noir uni. Elles ne sont
   pas dans l'atlas, et c'est deliberé : le boss est unique a l'ecran, son cout
   de trace est negligeable, et il gagne a etre anime en continu — ce qui est
   precisement ce que l'atlas ne sait pas faire.

   Trois choses communes aux cinq, portees par `drawBoss` :
     - le halo et les fissures, qui disent l'etat et pas l'identite ;
     - une animation d'INACTIVITE propre a chacun (la Matriarche pulse, le
       Metronome tourne, l'Oracle derive, le Ravageur respire, les Jumeaux
       oscillent en opposition de phase) ;
     - une POSTURE D'ANNONCE : le corps se contracte avant une attaque. Le plan
       precedent la prevoyait pour les monstres ; c'est sur le boss qu'elle
       compte le plus, puisque c'est la qu'on lit les mecaniques.
   =========================================================================== */

/* Duree de la RELACHE, en millisecondes. Courte volontairement : au-dela d'un
   tiers de seconde le rebond cesse d'etre lu comme la consequence du coup et
   devient une animation d'inactivite de plus. */
const BOSS_RELEASE_MS = 320;
/* Part de la relache passee en pleine extension avant que la retombee commence.
   MESUREE et non choisie : sans ce palier, la courbe amortie seule tombait de
   1,0 a 0,09 en cent millisecondes, soit quatre images a 60 Hz — le sommet
   n'existait qu'un instant et le coup ne se lisait pas. A 0,22, l'extension
   tient cinq images pleines, ce qui est le minimum pour qu'un mouvement soit vu
   plutot que devine. */
const BOSS_HOLD = 0.22;
/* Posture du boss : { gather, burst }, tous deux 0 a 1.

   C'est une TIMELINE en trois temps et non plus une rampe lineaire, parce que
   c'est le rythme qui rend une attaque lisible, pas la couleur du bandeau :

     - ANTICIPATION — `gather` monte de 0 a 1 sur toute la fenetre d'annonce, en
       carre. Le carre et non le lineaire parce qu'une rampe droite est lue
       comme un deplacement uniforme, donc comme un etat, alors qu'un
       resserrement qui ACCELERE est lu comme un elan qui se charge. Le gros du
       mouvement tombe ainsi dans le dernier tiers, la ou le joueur regarde.
     - MAINTIEN — implicite : `gather` reste a son maximum jusqu'a `impact`,
       puisque la fenetre va jusque-la. C'est ce que l'ancienne version perdait,
       le bandeau s'effacant 250 ms plus tot.
     - RELACHE — `burst` vaut 1 A L'INSTANT DU COUP, TIENT le temps de
       `BOSS_HOLD`, puis retombe avec un depassement negatif. Le cosinus passe
       sous zero a mi-retombee : le corps se detend au-dela de son repos, revient
       legerement en deca, puis se pose. Un simple `1 - u` se serait arrete pile
       au repos, ce qui se lit comme un arret et non comme une detente.

   Aucun champ de plus dans le snapshot : la fenetre est posee par le canal
   d'alerte, qui passe deja par la timeline interpolee. */
function bossPose(now) {
  if (!bossCue) return { gather: 0, burst: 0 };
  const { from, impact } = bossCue;
  if (now < impact) {
    const p = Math.min(1, Math.max(0, (now - from) / Math.max(1, impact - from)));
    return { gather: p * p, burst: 0 };
  }
  const u = (now - impact) / BOSS_RELEASE_MS;
  /* Une fenetre epuisee rend zero mais n'est PAS effacee ici. La fonction doit
     rester sans effet de bord : `drawBoss` est appele DEUX FOIS par image pour
     les Jumeaux, et une posture qui se consomme a la lecture aurait rendu la
     vraie valeur au premier et zero au second — les deux moities se seraient
     desynchronisees pile sur le coup. La fenetre est remplacee a l'annonce
     suivante et effacee aux transitions de manche. */
  if (u >= 1) return { gather: 0, burst: 0 };
  if (u < BOSS_HOLD) return { gather: 0, burst: 1 };
  const v = (u - BOSS_HOLD) / (1 - BOSS_HOLD);
  const k = 1 - v;
  return { gather: 0, burst: k * k * Math.cos(v * Math.PI * 1.3) };
}
export function drawBoss(b) {
  /* Le Noyau (lot N) fait 40 % de plus que les cinq autres. Le gabarit est le
     seul signal d'echelle qui se lise AVANT la barre de vie et avant le nom :
     il faut savoir qu'on n'est pas devant un boss ordinaire a l'instant ou il
     apparait. Le facteur porte sur le RAYON, donc toute la routine de dessin
     suit — elle travaille en unites de `r` d'un bout a l'autre. */
  const r = CFG.BOSS_RADIUS * ((b.kind ?? 0) === BOSS_FINAL ? 1.4 : 1);
  const now = performance.now();
  const t = now / 1000;
  const wounded = 1 - b.hp / b.maxHp;
  lastBossPos.x = b.x; lastBossPos.y = b.y;

  const kind = b.kind ?? 0;
  const K = BOSS_SKIN[kind] ?? BOSS_SKIN[0];
  /* Les Jumeaux portent la couleur de l'etat qu'ils appliquent — orange pour la
     Brulure, bleu pour l'Entrave. C'est la seule facon de savoir lequel on
     vient de toucher, donc de ne pas cumuler les deux par accident. */
  const twin = b.twin ? 1 : 0;
  const skin = twin ? BOSS.twin : K.skin;
  const dark = twin ? BOSS.twinDark : K.dark;
  const edge = twin ? BOSS.twinEdge : K.edge;

  const { gather, burst } = bossPose(now);

  /* Le halo respire la posture : il se resserre pendant que le corps se ramasse
     et se dilate d'un coup a la relache. C'est le seul element de la creature
     visible A TRAVERS la horde quand elle est collee au boss — le corps, lui,
     est masque par les monstres exactement au moment ou l'on voudrait le lire. */
  /* ABSORPTION (lot W). Le boss final va A CONTRESENS de la relache commune :
     sa masse se CONTRACTE sur le coup au lieu de se detendre, et ce qu'il envoie
     semble arrache a lui-meme.

     C'est son VERBE, et il en faut un : les cinq autres en ont chacun un —
     les pointes du Ravageur jaillissent, les poches de la Matriarche se vident,
     les anneaux du Metronome recoivent un a-coup proportionnel a leur vitesse,
     les glyphes de l'Oracle s'eteignent, l'oscillation des Jumeaux enfle. Le
     final rejouant leurs patrons, la tentation etait de rejouer leurs verbes :
     il en aurait eu cinq, donc aucun.

     L'absorption est le seul verbe coherent avec « il est la synthese des
     cinq », et il est distinct de la Matriarche — qui se vide vers l'EXTERIEUR —
     comme des quatre autres, qui poussent. Une ligne, deux signes inverses. */
  const dedans = kind === BOSS_FINAL;
  ctx.fillStyle = alpha(skin, 0.10 + burst * (dedans ? -0.04 : 0.10));
  ctx.beginPath();
  ctx.arc(b.x, b.y, r + 22 - gather * 10 + burst * (dedans ? -18 : 26), 0, Math.PI * 2);
  ctx.fill();

  /* Ecrasement : -9 % au ramasse, +12 % a la detente. L'asymetrie est voulue —
     une detente qui ne depasserait pas le repos se lit comme un arret et non
     comme un coup porte, et c'est precisement l'instant qu'on cherche a rendre
     lisible. Les deux restent trop faibles pour qu'on croie que le boss recule
     ou grandit. */
  const squash = 1 - gather * 0.09 + burst * (dedans ? -0.10 : 0.12);

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(squash, squash);
  // `tense` garde son nom dans `S` : c'est le vocabulaire des cinq routines, et
  // le renommer aurait touche les cinq pour ne rien dire de plus.
  const S = { r, t, skin, dark, edge, wounded, ang: b.ang ?? 0,
              phase: b.phase ?? 0, bars: b.bars ?? 4, tense: gather, burst, twin };
  switch (kind) {
    case BOSS_MATRIARCHE: drawBossMatriarche(S); break;
    case BOSS_METRONOME:  drawBossMetronome(S); break;
    case BOSS_ORACLE:     drawBossOracle(S); break;
    case BOSS_JUMEAUX:    drawBossJumeaux(S); break;
    case BOSS_FINAL:      drawBossFinal(S); break;
    default:              drawBossRavageur(S);
  }

  // Fissures : elles disent les DEGATS et pas l'identite, donc elles sont
  // communes aux cinq et se tracent par-dessus la silhouette.
  if (wounded > 0.2) {
    ctx.strokeStyle = alpha(BOSS.crack, Math.min(1, wounded));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.2); ctx.lineTo(-r * 0.1, r * 0.15); ctx.lineTo(r * 0.5, -r * 0.35);
    ctx.stroke();
  }
  ctx.restore();
}
/* Bande de silhouettes de boss, pour `?planche`. Elle passe par `drawBoss` et
   par rien d'autre : une planche qui redessinerait les cinq creatures pour les
   besoins du test aurait cesse de tester ce que le jeu montre des le premier
   reglage. `ctx` est une VARIABLE, on la detourne le temps du trace — c'est le
   meme mecanisme qui fait basculer `drawWorld` d'une couche a l'autre. */
export function bossSheet() {
  const r = CFG.BOSS_RADIUS;
  const pas = (r + 26) * 2;
  // Les Jumeaux comptent pour deux, et le final ferme la planche : c'est lui
  // qu'on regarde en premier pour verifier qu'il ne ressemble a aucun des cinq.
  const poses = [0, 1, 2, 3, 4, 4, 5];
  const c = document.createElement("canvas");
  c.width = pas * poses.length;
  c.height = pas;
  const g = c.getContext("2d");

  const garde = ctx;
  setCtx(g);
  /* La posture est NEUTRALISEE le temps du trace, par le meme detournement que
     `ctx`. Sans ca une planche prise pendant une annonce sortait les cinq boss
     ramasses ou en pleine detente : le test de silhouette est un critere
     d'acceptation, il ne peut pas dependre de l'instant ou on l'a pris. */
  const gardeCue = bossCue;
  setBossCue(null);
  poses.forEach((kind, i) => {
    drawBoss({
      kind, x: pas * i + pas / 2, y: pas / 2, ang: 0,
      hp: 100, maxHp: 100, bars: 4,
      // Le final est sorti a MI-COMBAT (trois barres brisees) : a `phase: 0` un
      // seul de ses cinq fragments serait eveille et la planche mentirait sur sa
      // silhouette, qui est justement d'etre composee.
      phase: kind === BOSS_FINAL ? 4 : 0,
      twin: kind === BOSS_JUMEAUX && i === 5 ? 1 : 0,
    });
  });
  setCtx(garde);
  setBossCue(gardeCue);

  // Aplatissement en noir uni sur blanc, exactement comme `silhouetteSheet` —
  // et dans le meme ordre, pour la meme raison : le fond peint d'abord aurait
  // rendu tout le canvas opaque et noirci la planche entiere.
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "#000000";
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-over";
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
/* LE RAVAGEUR — positionnement. L'original, conserve : bloc compact, couronne
   de pointes, lourd. Il est la reference dont les quatre autres s'ecartent.
   Seul ajout : la respiration, qui ne coute rien puisque c'est un `scale`. */
function drawBossRavageur(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  ctx.save();
  /* MOUVEMENT SECONDAIRE : la couronne prend de l'avance sur le corps a la
     detente. Une piece qui suit le mouvement principal avec un decalage est ce
     qui distingue un objet articule d'un bloc qu'on redimensionne — et elle ne
     coute rien, la rotation etait deja la. */
  ctx.rotate(t * 0.6 + burst * 0.24);
  ctx.fillStyle = dark;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    /* Les pointes RENTRENT a l'annonce, comme un animal qui se ramasse, puis
       JAILLISSENT au-dela de leur repos au moment du coup. Le depassement est
       le double de la retraction : c'est lui qui porte la lecture de l'impact,
       la retraction ne fait que l'annoncer. */
    const out = r + 14 - tense * 10 + burst * 20;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * out, Math.sin(a) * out);
    ctx.lineTo(Math.cos(a + 0.16) * r, Math.sin(a + 0.16) * r);
    ctx.lineTo(Math.cos(a - 0.16) * r, Math.sin(a - 0.16) * r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.rotate(S.ang);
  const breath = 1 + Math.sin(t * 1.8) * 0.03;
  ctx.scale(breath, 1 / breath);

  ctx.fillStyle = skin;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(r * 0.35, 0, r * 0.34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(r * 0.42, 0, r * 0.17, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/* LA MATRIARCHE — gestion de cibles. Abdomen segmente et BAS sur le sol, quatre
   appendices courts, et des poches d'oeufs qui pulsent dont le nombre DECROIT a
   mesure qu'elle perd ses barres. Le joueur doit comprendre au premier regard
   que la menace vient de ce qu'elle produit, pas d'elle — et voir sa reserve
   s'epuiser est la seule facon de savoir qu'on avance. */
function drawBossMatriarche(S) {
  const { r, t, skin, dark, edge, phase, bars, tense, burst } = S;
  ctx.save();
  ctx.rotate(S.ang);

  // Quatre appendices courts et irreguliers, chacun en SOUS-TRACE : enchaines
  // au corps ils y creuseraient une entaille — le bug est documente pour le
  // grunt et le tank.
  ctx.fillStyle = dark;
  const legs = [[-0.75, 0.55], [0.55, 0.75], [2.35, 0.6], [3.6, 0.8]];
  for (const [a0, len] of legs) {
    const a = a0 + Math.sin(t * 1.4 + a0) * 0.07;
    // Les appendices se replient a l'annonce et se DETENDENT sur le coup — elle
    // prend appui pour expulser, elle ne frappe pas avec.
    const out = r * (1 + len) * (1 - tense * 0.12 + burst * 0.22);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.22) * r * 0.9, Math.sin(a - 0.22) * r * 0.9);
    ctx.lineTo(Math.cos(a) * out, Math.sin(a) * out);
    ctx.lineTo(Math.cos(a + 0.22) * r * 0.9, Math.sin(a + 0.22) * r * 0.9);
    ctx.closePath();
    ctx.fill();
  }

  // Abdomen : ovale ecrase, plus large que haut. C'est ce qui le pose au sol.
  const pulse = 1 + Math.sin(t * 2.2) * 0.04;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, 0, r * 1.05 * pulse, r * 0.78 / pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Segmentation : trois arceaux, le signe le plus court d'un abdomen.
  ctx.strokeStyle = alpha(edge, 0.7);
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    const x = -r * 0.85 + i * r * 0.42;
    ctx.beginPath();
    ctx.ellipse(x, 0, r * 0.1, r * 0.7 * Math.sqrt(1 - (i - 2) * (i - 2) * 0.1), 0,
      -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }

  /* Poches d'oeufs. Elles pulsent en OPPOSITION de phase avec l'abdomen — deux
     rythmes identiques ne se distinguent pas — et il en reste une de moins par
     barre brisee : c'est la seule lecture de progression qui ne demande pas de
     regarder la barre du haut. */
  const pockets = Math.max(1, bars - phase);
  for (let i = 0; i < pockets; i++) {
    const a = -1.1 + (i / Math.max(1, pockets - 1 || 1)) * 2.2;
    const px = Math.cos(a) * r * 0.55 - r * 0.15;
    const py = Math.sin(a) * r * 0.42;
    /* Les poches se VIDENT sur le coup, au lieu de gonfler comme tout le reste.
       C'est la seule piece du jeu qui va a contresens de la detente, et c'est le
       sens meme de la creature : ce qui sort d'elle est le danger, donc l'instant
       de l'attaque doit se lire comme une expulsion et pas comme une poussee. */
    const k = (1 + Math.sin(t * 2.2 + i * 1.3 + Math.PI) * 0.18) * (1 - burst * 0.38);
    ctx.fillStyle = alpha(BOSS.eye, 0.85);
    ctx.beginPath(); ctx.arc(px, py, r * 0.15 * k, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(edge, 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Tete minuscule a l'avant : c'est elle qui dit dans quel sens elle regarde,
  // et sa petitesse dit que ce n'est pas elle, le danger.
  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(r * 0.95, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(r * 0.98, 0, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/* LE METRONOME — mouvement. Purement geometrique, AUCUN membre : trois anneaux
   concentriques desaxes qui tournent a des vitesses differentes, et un noyau
   vide au centre. C'est le seul boss qui doit paraitre MECANIQUE, ce qui est
   coherent avec le fait qu'il ne frappe jamais — il occupe l'espace. */
function drawBossMetronome(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  // Trois anneaux, trois vitesses, trois inclinaisons. Des vitesses proches
  // auraient donne un seul mouvement flou ; le rapport 1 / -1,6 / 2,7 se lit.
  const rings = [
    { rad: r * 1.05, w: 5, spin: 1.0, tilt: 0.0, col: dark },
    { rad: r * 0.78, w: 4, spin: -1.6, tilt: 0.7, col: skin },
    { rad: r * 0.5, w: 3, spin: 2.7, tilt: 1.4, col: skin },
  ];
  const kick = 1 - tense * 0.1 + burst * 0.16;
  for (const ring of rings) {
    ctx.save();
    /* A-COUP proportionnel a la vitesse de chaque anneau : le plus rapide saute
       le plus loin, donc l'ecart entre les trois s'ACCENTUE sur le coup au lieu
       de se refermer. Un a-coup identique pour les trois les aurait fait bouger
       comme une seule piece, ce qui est exactement ce que les trois vitesses
       existent pour eviter. */
    ctx.rotate(t * ring.spin + burst * 0.30 * ring.spin);
    // L'ecrasement fait tourner l'anneau DANS l'espace : un cercle parfait qui
    // tourne ne montre rien, et c'est le mouvement qui est l'identite ici.
    ctx.scale(1, 0.42 + 0.58 * Math.abs(Math.cos(t * ring.spin * 0.5 + ring.tilt)));
    ctx.strokeStyle = ring.col;
    ctx.lineWidth = ring.w;
    ctx.beginPath(); ctx.arc(0, 0, ring.rad * kick, 0, Math.PI * 2);
    ctx.stroke();
    // Un ergot par anneau : sans lui la rotation d'un cercle est invisible.
    ctx.fillStyle = edge;
    ctx.beginPath(); ctx.arc(ring.rad * kick, 0, ring.w * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Noyau VIDE : un anneau fin et rien dedans. C'est ce qui le distingue des
  // quatre autres, qui ont tous un corps plein.
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = alpha(BOSS.eye, Math.min(1, 0.5 + tense * 0.5 + burst * 0.5));
  ctx.lineWidth = 2;
  // Le noyau est le seul point FIXE de la creature : il ne peut pas rendre le
  // coup par un deplacement, il le rend donc par sa taille.
  ctx.beginPath(); ctx.arc(0, 0, r * 0.14 * (1 + burst * 0.45), 0, Math.PI * 2); ctx.stroke();
}
/* L'ORACLE — cohesion. Un grand oeil unique entoure d'anneaux FLOTTANTS,
   separes du corps, avec des glyphes qui s'allument. Les anneaux servent aussi
   de telegraphe : ils s'orientent vers ce qui va se passer, c'est-a-dire vers
   la direction du boss, et se resserrent a l'annonce. */
function drawBossOracle(S) {
  const { r, t, skin, dark, edge, tense, burst } = S;

  /* Deux anneaux detaches, en derive lente. Ils ne sont PAS concentriques au
     corps : c'est ce qui les fait lire comme flottants et non comme une
     armure. */
  for (let i = 0; i < 2; i++) {
    const spin = t * (0.5 + i * 0.35) + i * 2.1;
    const off = r * (0.18 + i * 0.1) * (1 - tense);
    ctx.save();
    ctx.rotate(S.ang + Math.sin(t * 0.6 + i) * 0.3);
    ctx.translate(Math.cos(spin) * off, Math.sin(spin) * off);
    ctx.strokeStyle = alpha(i === 0 ? skin : dark, 0.9);
    ctx.lineWidth = 3;
    // Anneau OUVERT : une brisure oriente le regard, un cercle ferme ne dit
    // rien de la direction.
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.15 - i * 0.22) * (1 - tense * 0.12 + burst * 0.20),
      0.5, Math.PI * 2 - 0.5);
    ctx.stroke();
    ctx.restore();
  }

  // Corps : disque sombre, volontairement petit — l'Oracle est surtout un oeil.
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  /* Six glyphes en couronne. Ils s'allument A TOUR DE ROLE au repos, et TOUS a
     l'annonce : c'est le telegraphe le moins cher qui soit, et il se lit meme
     quand le bandeau est masque par un effet. */
  ctx.save();
  ctx.rotate(S.ang);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lit = tense > 0 ? 1 : (Math.sin(t * 2 - i * 1.05) > 0.7 ? 1 : 0);
    /* Les glyphes S'ETEIGNENT sur le coup. Ils se sont allumes tous ensemble
       pendant la charge ; les voir se vider au moment ou l'oeil se dilate rend
       la creature causale — l'energie va quelque part, elle ne disparait pas.
       `Math.max(0, burst)` parce que le rebond passe sous zero : sans la garde,
       les glyphes redeviendraient plus lumineux qu'au repos pendant le retour. */
    ctx.strokeStyle = alpha(BOSS.eye,
      (0.25 + lit * 0.75) * (1 - Math.max(0, burst) * 0.85));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.44);
    ctx.lineTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
    ctx.stroke();
  }
  ctx.restore();

  // L'oeil. Iris qui suit l'orientation du boss : c'est ce qui dit « il te
  // regarde », et c'est toute l'identite de la creature.
  // L'oeil se plisse pendant la charge et se DILATE sur le coup. C'est la piece
  // qui porte l'identite de l'Oracle, donc celle qui doit porter l'instant.
  const eyeR = r * 0.34 * (1 - tense * 0.25 + burst * 0.40);
  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, 0, eyeR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath();
  ctx.arc(Math.cos(S.ang) * eyeR * 0.45, Math.sin(S.ang) * eyeR * 0.45,
    eyeR * 0.42, 0, Math.PI * 2);
  ctx.fill();
}
/* LES JUMEAUX — separation. Deux DEMI-FORMES complementaires, chacune
   incomplete : l'une porte la moitie gauche d'un motif, l'autre la droite.
   Quand ils se rapprochent, les moities s'alignent visuellement — ce qui rend
   leur mecanique de soin mutuel lisible sans lire la barre.
   `twin` dit lequel des deux on dessine, et c'est le SEUL parametre : deux
   routines auraient diverge au premier reglage. */
function drawBossJumeaux(S) {
  const { r, t, skin, dark, edge, twin, tense, burst } = S;
  const side = twin ? 1 : -1;          // -1 : moitie gauche, +1 : moitie droite

  ctx.save();
  ctx.rotate(S.ang);
  /* Oscillation en OPPOSITION de phase entre les deux : en phase, ils
     paraissaient un seul objet coupe en deux plutot que deux creatures.

     Son amplitude ENFLE sur le coup, et c'est ce qui fait leur relache : les
     deux moities s'ecartent visiblement l'une de l'autre au moment de frapper.
     Un ecrasement, comme pour les quatre autres, n'aurait rien dit ici — leur
     verbe est la separation, pas la poussee. */
  ctx.rotate(Math.sin(t * 1.3 + (twin ? Math.PI : 0)) * (0.09 + Math.max(0, burst) * 0.11));

  // Demi-disque : le plat regarde vers l'autre Jumeau. La forme est INCOMPLETE
  // et doit le rester — c'est ce qui fait qu'on cherche l'autre moitie.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, 0, r, side > 0 ? -Math.PI / 2 : Math.PI / 2,
    side > 0 ? Math.PI / 2 : -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Trois dents sur le plat : elles s'emboitent avec celles de l'autre moitie.
  // Le motif est le meme des deux cotes, en creux d'un cote et en relief de
  // l'autre — c'est ce qui rend l'alignement visible quand ils convergent.
  ctx.fillStyle = twin ? skin : dark;
  for (let i = -1; i <= 1; i++) {
    const y = i * r * 0.45;
    ctx.beginPath();
    ctx.arc(0, y, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.lineTo(0, r);
  ctx.stroke();

  // L'oeil est REPOUSSE vers l'exterieur : les deux regardent chacun de leur
  // cote, ce qui dit la separation aussi bien que la forme.
  // L'oeil s'ecarte encore un peu du plat sur le coup : la separation se lit
  // deux fois, dans la rotation et dans la position du regard.
  const ex = side * r * (0.42 + Math.max(0, burst) * 0.10);
  ctx.fillStyle = BOSS.maw;
  ctx.beginPath();
  ctx.arc(ex, 0, r * 0.3 * (1 - tense * 0.2 + burst * 0.35), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(ex, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/* AMALGAME — le boss final (lot W). Il n'a pas de forme a lui : il est fait de
   CINQ FRAGMENTS, un par boss d'origine, qui gravitent autour d'un noyau vide.

   C'est le seul choix de silhouette qui tienne la promesse du combat. Une
   sixieme creature dessinee comme les cinq autres aurait ete un sixieme boss ;
   celle-ci se reconnait au premier coup d'oeil sur la planche parce qu'elle est
   la SEULE composee — cinq eclats distincts, aucun corps continu. Le test de
   silhouette la separe donc des cinq sans qu'on ait a lire une couleur.

   Chaque fragment cite la forme de son boss : une pointe (Ravageur), une poche
   (Matriarche), un anneau ouvert (Metronome), un glyphe (Oracle), un demi-disque
   (Jumeaux). Ils ne sont pas dessines en detail — a ce rayon, une citation de
   trois traits se lit mieux qu'une reproduction.

   Le nombre de fragments EVEILLES suit la barre : le combat commence avec un
   seul actif et les allume un par un. La cinquieme barre les a tous, et les
   trois dernieres — synthese, synthese, sceau — les font tourner ensemble. La
   silhouette raconte donc la meme chose que le repertoire, sans un mot. */
function drawBossFinal(S) {
  const { r, t, skin, dark, edge, tense, burst, phase } = S;

  /* L'absorption se lit DEUX FOIS : dans l'ecrasement commun, deja inverse par
     `drawBoss`, et ici dans le rayon d'orbite. Les fragments plongent vers le
     noyau au moment du coup au lieu de s'en ecarter — c'est le mouvement
     secondaire, celui qui distingue un objet articule d'un bloc redimensionne. */
  const orbite = r * (1.02 + tense * 0.10 - Math.max(0, burst) * 0.34);
  // Eveilles : un de plus par barre brisee, cinq au maximum. Le fragment
  // endormi reste dessine — en creux — sinon la silhouette changerait de forme
  // en cours de combat et cesserait d'etre reconnaissable.
  const eveilles = Math.max(1, Math.min(5, phase + 1));

  ctx.save();
  ctx.rotate(S.ang * 0.35 + t * 0.22);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const on = i < eveilles;
    ctx.save();
    ctx.translate(Math.cos(a) * orbite, Math.sin(a) * orbite);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = on ? skin : dark;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2.5;
    const f = r * 0.34;

    ctx.beginPath();
    switch (i) {
      case 0:   // Ravageur : une pointe
        ctx.moveTo(0, -f * 1.25); ctx.lineTo(f * 0.62, f * 0.7); ctx.lineTo(-f * 0.62, f * 0.7);
        ctx.closePath();
        break;
      case 1:   // Matriarche : une poche
        ctx.ellipse(0, 0, f * 0.72, f * 1.05, 0, 0, Math.PI * 2);
        break;
      case 2:   // Metronome : un anneau ouvert
        ctx.arc(0, 0, f * 0.9, 0.6, Math.PI * 2 - 0.6);
        break;
      case 3:   // Oracle : un glyphe, losange evide
        ctx.moveTo(0, -f); ctx.lineTo(f * 0.7, 0); ctx.lineTo(0, f); ctx.lineTo(-f * 0.7, 0);
        ctx.closePath();
        break;
      default:  // Jumeaux : un demi-disque
        ctx.arc(0, 0, f * 0.95, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();
    }
    // L'anneau du Metronome est le seul tracé OUVERT : le remplir donnerait un
    // disque, c'est-a-dire la citation du mauvais boss.
    if (i !== 2 && on) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  /* Le NOYAU est un vide cercle de sombre : le boss final n'a pas de corps
     propre, et c'est exactement ce qu'il faut voir. Il s'illumine BREVEMENT sur
     le coup — ce que les fragments viennent de perdre, il l'a pris. */
  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();

  const eclat = Math.max(0, burst);
  ctx.fillStyle = alpha(skin, 0.18 + eclat * 0.72);
  ctx.beginPath();
  ctx.arc(0, 0, r * (0.16 + tense * 0.10 + eclat * 0.28), 0, Math.PI * 2);
  ctx.fill();
}
/* Marqueurs de mecanique de groupe. Une seule fonction pour les huit, avec un
   code couleur constant : CYAN = va dessus, ROUGE = sors de la, JAUNE = detruis.
   Le sens se lit a la couleur avant meme d'avoir lu le bandeau — c'est ce qui
   permet de reagir a la deuxieme rencontre sans relire la consigne. */
const MARK_GO = SIGNAL.go;        // cyan : occuper
const MARK_AWAY = SIGNAL.lethal;      // rouge : quitter
const MARK_BREAK = SIGNAL.warn;     // jaune : detruire
/* Halo qui monte vers l'INTERIEUR (lot E) : l'inverse exact du telegraphe,
   dont l'energie sort. Le mouvement centripete est lu comme un appel — c'est
   la signature des zones ACCUEILLANTES, partagee par les tours, le
   regroupement et le sanctuaire. Cyan ou vert, jamais de rouge : la regle de
   la grammaire ne souffre aucune exception. */
function markHalo(x, y, r, col, t) {
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.6 + i * 0.5) % 1;
    ctx.strokeStyle = alpha(col, 0.30 * ph);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(8, r * (1.05 - ph * 0.4)), 0, Math.PI * 2);
    ctx.stroke();
  }
}
/* Colonnes lumineuses des marqueurs accueillants. Elles vivent dans la couche
   SUPERIEURE, contrairement au disque qui reste sous les entites : c'est le
   seul element du jeu autorise a depasser en hauteur, justement pour etre
   reperable par-dessus la horde — une tour qu'on ne voit pas ne s'occupe pas. */
export function drawMarkColumns(marks, t) {
  for (const m of marks) {
    if (m.mech !== MECH_TOWER && m.mech !== MECH_COUNT
        && m.mech !== MECH_STACK && m.mech !== MECH_SANCTUARY
        // Le sceau est une zone ACCUEILLANTE : il a sa colonne comme les tours,
        // et il en a plus besoin qu'elles — on le tient six secondes en
        // regardant ailleurs, a l'autre bout de l'arene.
        && m.mech !== MECH_SEAL) continue;
    const ok = m.mech === MECH_SANCTUARY
      || (m.mech === MECH_COUNT ? m.cur === m.need : m.cur >= 1);
    const col = ok ? MARK.ok : MARK_GO;
    const h = 110 + Math.sin(t * 2.2) * 8;
    const g = ctx.createLinearGradient(m.x, m.y, m.x, m.y - h);
    g.addColorStop(0, alpha(col, 0.50));
    g.addColorStop(1, alpha(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(m.x - 3, m.y - h, 6, h);
  }
}
export function drawMarks(marks, players) {
  if (!marks.length) return;
  const byId = new Map(players.map(p => [p.id, p]));
  const t = performance.now() / 1000;

  for (const m of marks) {
    const pulse = 0.55 + 0.45 * Math.sin(t * 5);
    switch (m.mech) {
      case MECH_STACK: {
        // Le remplissage monte avec le compte a rebours : c'est le meme code
        // visuel que les zones, ou `k` dit « ca tombe bientot ».
        const k = 1 - m.k;
        ctx.fillStyle = alpha(SIGNAL.go, 0.05 + k * k * 0.22);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        markHalo(m.x, m.y, m.r, MARK_GO, t);
        ctx.strokeStyle = MARK_GO;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        markLabel(m.x, m.y - m.r - 10, "REGROUPEMENT", MARK_GO);
        break;
      }
      case MECH_SPREAD: {
        // Rien au sol : la mecanique porte sur la distance entre joueurs. On
        // dessine donc le rayon interdit AUTOUR DE CHACUN, seul endroit ou
        // l'information est utile.
        ctx.strokeStyle = alpha(FX.nova, 0.35 + 0.35 * (1 - m.k));
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        for (const p of players) {
          if (p.downed) continue;
          ctx.beginPath(); ctx.arc(p.x, p.y, m.r / 2, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.setLineDash([]);
        break;
      }
      /* LE SCEAU (lot W) partage le dessin des tours, et c'est voulu : il pose
         la meme question — « quelqu'un est-il dedans » — et lui inventer une
         signature l'aurait rendu illisible au moment precis ou l'equipe n'a
         jamais eu si peu de temps pour lire. Ce qui le distingue est PORTE PAR
         LE LIBELLE et par sa geometrie : des foyers plus petits, plus ecartes,
         et une fenetre deux fois plus longue.
         Un liseré continu et epais en plus : c'est la derniere barre du dernier
         boss, elle a le droit d'etre la marque la plus voyante du jeu. */
      case MECH_SEAL:
      case MECH_TOWER:
      case MECH_COUNT: {
        const ok = m.mech === MECH_COUNT ? m.cur === m.need : m.cur >= 1;
        const col = ok ? MARK.ok : MARK_GO;
        ctx.fillStyle = ok ? alpha(FX.heal, 0.14) : alpha(SIGNAL.go, 0.10);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        markHalo(m.x, m.y, m.r, col, t);
        ctx.strokeStyle = col;
        ctx.lineWidth = ok ? 4 : 2;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        /* Le denombrement affiche « presents / requis » : c'est toute la
           mecanique, elle n'existe pas sans ce chiffre. Le chiffre vire au vert
           (`col`) quand le compte est bon, et il est CERCLE de sombre pour
           rester lisible par-dessus la horde. */
        ctx.textAlign = "center";
        ctx.font = "700 26px ui-monospace, Menlo, Consolas, monospace";
        ctx.lineWidth = 4;
        ctx.strokeStyle = alpha(SURFACE.void, 0.8);
        const compte = m.mech === MECH_COUNT ? `${m.cur}/${m.need}` : `${m.cur}`;
        ctx.strokeText(compte, m.x, m.y + 9);
        ctx.fillStyle = col;
        ctx.fillText(compte, m.x, m.y + 9);
        if (m.mech === MECH_SEAL) {
          ctx.strokeStyle = alpha(col, 0.5 + 0.5 * pulse);
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 9, 0, Math.PI * 2); ctx.stroke();
          markLabel(m.x, m.y - m.r - 18, "SCEAU", col);
        }
        break;
      }
      case MECH_LINK: {
        const a = byId.get(m.a), b = byId.get(m.b);
        if (!a || !b) break;
        ctx.strokeStyle = MARK_AWAY;
        ctx.lineWidth = 3 + pulse * 2;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.globalAlpha = 1;
        markLabel((a.x + b.x) / 2, (a.y + b.y) / 2 - 16, "ÉCARTEZ-VOUS", MARK_AWAY);
        break;
      }
      case MECH_JAIL: {
        // Cage : barreaux + jauge de PV. La jauge est ce qui dit aux autres que
        // tirer sert a quelque chose.
        ctx.strokeStyle = MARK_BREAK;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI;
          ctx.moveTo(m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r);
          ctx.lineTo(m.x - Math.cos(a) * m.r, m.y - Math.sin(a) * m.r);
        }
        ctx.stroke();
        markGauge(m.x, m.y + m.r + 8, m.hp, MARK_BREAK);
        markLabel(m.x, m.y - m.r - 10, "LIBÈRE-LE", MARK_BREAK);
        break;
      }
      case MECH_CLUSTER: {
        ctx.fillStyle = alpha(FX.elite, 0.25 + pulse * 0.25);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = MARK_BREAK;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        // Le compte a rebours d'eclosion se lit sur l'anneau exterieur
        ctx.strokeStyle = MARK.bait;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r + 7, -Math.PI / 2, -Math.PI / 2 + m.k * Math.PI * 2);
        ctx.stroke();
        markGauge(m.x, m.y + m.r + 12, m.hp, MARK_BREAK);
        break;
      }
      case MECH_FEED: {
        // Lien nourricier : un trait vers la Matriarche. Il n'a pas besoin de
        // sa position — il part du rejeton vers le centre de l'arene, la ou
        // elle se tient de toute facon la plupart du temps.
        ctx.strokeStyle = alpha(FX.heal, 0.5 + pulse * 0.4);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(lastBossPos.x, lastBossPos.y);
        ctx.stroke();
        ctx.strokeStyle = MARK.ok;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case MECH_BAIT: {
        // Le fantome : c'est LUI l'annonce, la zone tombe la ou il est.
        ctx.strokeStyle = alpha(MARK.bait, 0.4 + pulse * 0.4);
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(m.x, m.y, CFG.PLAYER_RADIUS + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case MECH_SANCTUARY: {
        // Le seul marqueur qui veut dire « ici on est en securite » : il est
        // donc plein et clair, a l'inverse de toutes les zones du jeu.
        ctx.fillStyle = alpha(FX.heal, 0.16);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        markHalo(m.x, m.y, m.r, MARK.ok, t);
        ctx.strokeStyle = MARK.ok;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case MECH_PROX: {
        // Degrade : la couleur dit le danger, pas un contour binaire.
        const g = ctx.createRadialGradient(m.x, m.y, 10, m.x, m.y, m.r);
        g.addColorStop(0, alpha(BOSS.skin, 0.45));
        g.addColorStop(1, alpha(BOSS.skin, 0.02));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        break;
      }
      default: break;
    }
  }
}
function markLabel(x, y, text, col) {
  ctx.textAlign = "center";
  ctx.fillStyle = col;
  ctx.font = "700 13px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText(text, x, y);
}
function markGauge(x, y, k, col) {
  const w = 54, h = 5;
  ctx.fillStyle = alpha(SURFACE.void, 0.8);
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = col;
  ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, k)), h);
}
/* GRILLE DES RAYONS. Chaque effet dessine autour d'un personnage occupe une
   bande EXCLUSIVE, et deux effets ne partagent jamais un rayon. Sans cette
   regle, prendre deux cartes revenait a en perdre une a l'affichage : les lames
   orbitales (3,7 m) disparaissaient dans l'anneau du champ de givre (8 m), et
   le joueur ne savait plus qu'il les avait.

   Les valeurs sont donnees en metres pour se relire, en pixels pour se
   dessiner — la simulation, elle, ne connait que les pixels.

     0,9 m   bouclier          arc epais colle au corps
     1,1 m   etats             halo colore
     1,3 m   competence        provocation ou surcharge (jamais les deux)
     1,5 m+  bonus au sol      anneaux fins empiles
     3,7 m   lames orbitales   au-dessus de TOUT, avec trainee
     8 m     champ de givre    disque teinte, sans anneau
     8,5 m   rempart du tank   zone au sol, sous les entites               */
const RING_SHIELD = CFG.PLAYER_RADIUS + 4;    // 18 px
const RING_STATUS = CFG.PLAYER_RADIUS + 8;    // 22 px
const RING_SKILL  = CFG.PLAYER_RADIUS + 12;   // 26 px
const RING_BUFF0  = CFG.PLAYER_RADIUS + 16;   // 30 px, puis +4 par bonus
/* Image de classe. Le tuple de joueur ne transporte pas de vitesse — un champ
   de plus par joueur pour une information que le client peut lire tout seul en
   comparant deux images. On la deduit donc localement. */
export const lastPlayerPos = new Map();
function playerMoving(id, x, y) {
  const prev = lastPlayerPos.get(id);
  lastPlayerPos.set(id, { x, y });
  if (!prev) return false;
  // Seuil bas mais non nul : la correction de prediction fait bouger un
  // personnage a l'arret de quelques dixiemes de pixel, et il se serait mis a
  // marcher sur place.
  return Math.hypot(x - prev.x, y - prev.y) > 0.6;
}
function classFrame(p, pose) {
  const id = classAt(p.cls ?? CLASS_DEFAULT).id;
  // Le soigneur en mode soin porte son faisceau a la place du canon : c'est la
  // seule pose de tir qu'on sache dater a coup sur, et c'est celle qui compte —
  // toute l'equipe doit voir de loin qu'il ne fait plus de degats.
  if (id === "soigneur" && (p.skillFlags & SKILL_HEAL_MODE) && pose !== "down") {
    pose = "shoot";
  }
  return frameOf(`c_${id}_${pose}`);
}
/* LISERE PERMANENT DU JOUEUR — le correctif le plus rentable du lot. Rien ne
   distinguait un personnage d'un monstre en priorite d'affichage : dans une
   melee de 220 creatures organiques, la silhouette du joueur etait une de plus.

   Ce n'est pas un `stroke` : les entites passent par `drawSprite`, qui ne rend
   pas de chemin. C'est la SILHOUETTE BLANCHE deja cuite dans l'atlas
   (`flash: 1`), dessinee un cran plus grande SOUS le sprite — donc un quad de
   plus dans le meme lot, aucune nouvelle image, et le meme resultat par les deux
   chemins de rendu. L'echelle vaut 2 px de contour pour un corps de 14 px de
   rayon : au-dela le personnage grossit au lieu de se cerner.

   Il porte l'orientation, l'etirement et l'ecrasement du sprite qu'il double :
   un contour qui garderait ses proportions se decollerait a chaque pas. */
const OUTLINE_SCALE = 1.16;
function paintOutline(frame, x, y, angle, scaleX, scaleY, a) {
  drawSprite(ctx, frame, x, y, {
    angle,
    scaleX: scaleX * OUTLINE_SCALE,
    scaleY: scaleY * OUTLINE_SCALE,
    flash: 1,
    alpha: a,
  });
}
export function drawPlayers(list, tm, marks = []) {
  for (const p of list) {
    const isMe = p.id === myId;
    const x = isMe && predicted ? predicted.x : p.x;
    const y = isMe && predicted ? predicted.y : p.y;
    const col = colorOf(p.id);

    if (p.downed) {
      const aimDir = isMe ? aimVector() : { ax: p.aimX, ay: p.aimY };
      const ang = Math.atan2(aimDir.ay, aimDir.ax);
      // Un cran plus discret a terre : le personnage n'agit plus, mais il faut
      // toujours pouvoir le trouver pour aller le relever.
      paintOutline(classFrame(p, "down"), x, y, ang, 1, 1, 0.45);
      drawSprite(ctx, classFrame(p, "down"), x, y,
        { angle: ang, tint: COMBAT.downed });

      ctx.strokeStyle = COMBAT.downed;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(x, y, CFG.REVIVE_RADIUS, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      if (p.revive > 0) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, CFG.PLAYER_RADIUS + 8, -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * (p.revive / CFG.REVIVE_TIME));
        ctx.stroke();
      }
    } else {
      // Esquive : sillage derriere le joueur et halo blanc. Les autres doivent
      // voir qu'un coequipier est invulnerable, c'est ce qui permet de decider
      // qui traverse la zone.
      const dashing = isMe ? dash.t > 0 : p.dashing;
      if (dashing) {
        const dir = isMe ? dash : { x: -p.aimX, y: -p.aimY };
        /* Le sillage est le SEUL trace de ce bloc a passer explicitement par la
           couche du dessous : c'est un trait epais de 22 px qui part du centre
           du personnage, et dessine par-dessus il l'aurait efface pendant toute
           l'esquive. Les anneaux, eux, vivent au-dela du corps et n'ont pas ce
           probleme. */
        const g = underCtx;
        g.strokeStyle = FX.flash;
        g.globalAlpha = 0.45;
        g.lineWidth = CFG.PLAYER_RADIUS * 1.6;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - dir.x * 34, y - dir.y * 34);
        g.stroke();
        g.globalAlpha = 1;
        g.lineCap = "butt";
      }

      /* Provocation active : halo pulsant dans la couleur du tank. Les autres
         joueurs doivent le voir — c'est ce qui leur dit que la horde part vers
         lui et qu'ils ont trois secondes pour relever le coequipier a terre. */
      if (p.skillFlags & SKILL_TAUNT) {
        const puls = 0.55 + 0.25 * Math.sin(tm * 9);
        ctx.strokeStyle = alpha(CLASS_COLOR.tank, puls);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, RING_SKILL, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.16);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, SKILL_CFG.TANK_TAUNT_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Surcharge : couronne doree. Meme bande que la provocation — les deux
      // appartiennent a des classes differentes, elles ne coexistent jamais sur
      // un meme personnage.
      if (p.skillFlags & SKILL_OVERDRIVE) {
        ctx.strokeStyle = alpha(FX.level, 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, RING_SKILL, 0, Math.PI * 2); ctx.stroke();
      }
      /* Mode soin : anneau pulsant, MEME BANDE que la provocation et la
         surcharge — troisieme classe, et les trois ne coexistent jamais sur un
         personnage.

         Il n'existait pas : la bascule se lisait a la TEINTE du personnage, qui
         passait de sa couleur de joueur au vert du soigneur. Depuis que la
         couleur dit la classe, le soigneur est vert en permanence et ce signal
         a perdu presque tout son contraste — il ne restait que le passage d'un
         vert pale a un vert sature. Le mouvement le remplace : une pulsation se
         lit a travers la horde la ou deux verts voisins ne se lisent plus. */
      if (p.skillFlags & SKILL_HEAL_MODE) {
        const puls = 0.55 + 0.25 * Math.sin(tm * 7);
        ctx.strokeStyle = alpha(FX.heal, puls);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, RING_SKILL, 0, Math.PI * 2); ctx.stroke();
      }

      /* LA COULEUR DIT LA CLASSE, ET LA FORME AUSSI. C'est le renversement de la
         regle d'origine — « la forme dit la classe, la couleur dit le joueur ».
         Elle tenait tant que les quatre teintes servaient a distinguer Paul de
         Marie ; a l'usage, la question posee vingt fois par manche est « ou est
         le soigneur », pas « lequel de ces deux points est Paul ». Les deux
         canaux disent donc la meme chose et se renforcent, au lieu de se
         partager le travail.

         Ce que ca coute : deux tireurs ne se distinguent plus que par leurs deux
         teintes (`dps` et `dps2`), et quatre tireurs empruntent le bleu et le
         vert restes libres — voir `assignColors()` dans `room.js`, ou vit toute
         la regle. */
      const moving = playerMoving(p.id, x, y);
      /* La teinte de mode soin reste, mais elle ne porte plus le signal a elle
         seule : c'est l'anneau pulsant ci-dessus qui le fait. Elle sature le
         vert du personnage, ce qui accompagne la pulsation au lieu de la
         doubler. */
      const teinte = dashing ? FX.flash
        : ((p.skillFlags & SKILL_HEAL_MODE) ? FX.heal : col);
      const frame = classFrame(p, moving ? "move" : "idle");
      const aimDir = isMe ? aimVector() : { ax: p.aimX, ay: p.aimY };
      const ang = Math.atan2(aimDir.ay, aimDir.ax);
      // Etirement dans l'axe du deplacement : 6 %, comme les creatures.
      const sx = moving ? 1.06 : 1;
      const sy = moving ? 0.96 : 1;
      // Pas de lisere pendant l'esquive : le personnage est DEJA blanc, le
      // contour n'y ajouterait qu'un pate de deux pixels.
      if (!dashing) paintOutline(frame, x, y, ang, sx, sy, 0.9);
      drawSprite(ctx, frame, x, y, {
        angle: ang, scaleX: sx, scaleY: sy, tint: teinte,
      });

      // bouclier : arc d'autant plus complet que la reserve est pleine, colle
      // au corps — c'est la bande la plus interieure de la grille des rayons.
      if (p.shield > 0) {
        const k = p.shield / CFG.SHIELD_POOL;
        ctx.strokeStyle = POWERUP_COLOR.shield;
        ctx.globalAlpha = 0.35 + k * 0.45;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, RING_SHIELD, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      let ring = RING_BUFF0;
      for (const [bit, colour] of [
        [BUFF_DAMAGE, POWERUP_COLOR.damage], [BUFF_RATE, POWERUP_COLOR.rate],
        [BUFF_DOUBLE, POWERUP_COLOR.double], [BUFF_PIERCE, POWERUP_COLOR.pierce],
        [BUFF_RICOCHET, POWERUP_COLOR.ricochet],
      ]) {
        if (p.buffs & bit) {
          ctx.strokeStyle = colour;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, ring, 0, Math.PI * 2); ctx.stroke();
          ring += 4;
        }
      }

      /* Aura de givre : disque teinte a bord NET, et plus d'anneau. L'anneau
         occupait une bande de rayon a lui seul, et les lames orbitales — qui
         tournent a 3,7 m, dans la meme famille de trait — s'y noyaient : un
         joueur qui prenait les deux cartes ne voyait plus qu'il avait les
         lames. Un bord de 1 px suffit a dire ou l'aura s'arrete, ce qui est
         tout ce qu'on lui demande. */
      if (p.frostRadius > 0) {
        ctx.fillStyle = alpha(EFFECT_COLOR.givre, 0.06);
        ctx.beginPath(); ctx.arc(x, y, p.frostRadius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = alpha(EFFECT_COLOR.givre, 0.22);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, p.frostRadius, 0, Math.PI * 2); ctx.stroke();
      }
    }

    if (isMe && !p.downed && !amSpectator) {
      // Portee de la bombe. Sous le reticule et la ligne de visee : c'est un
      // repere de sol, pas une consigne.
      if (classAt(p.cls ?? CLASS_DEFAULT).id === "dps" && (p.bombStock ?? 0) > 0) {
        drawBombRange(x, y);
      }

      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 7, 0, Math.PI * 2);
      ctx.moveTo(mouse.x - 12, mouse.y); ctx.lineTo(mouse.x - 3, mouse.y);
      ctx.moveTo(mouse.x + 3, mouse.y);  ctx.lineTo(mouse.x + 12, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - 12); ctx.lineTo(mouse.x, mouse.y - 3);
      ctx.moveTo(mouse.x, mouse.y + 3);  ctx.lineTo(mouse.x, mouse.y + 12);
      ctx.stroke();
    }

    /* Halo d'etat sur le personnage lui-meme. Une icone seule ne se voit pas en
       pleine action : quand l'arene contient 200 ennemis, le regard est sur la
       horde, pas sur une pastille de six pixels. Le halo, lui, se lit dans la
       vision peripherique — c'est lui qui dit « celui-la a un probleme ». */
    const actifs = activeStatuses(p);
    if (actifs.length > 0 && !p.downed) {
      const top = actifs[actifs.length - 1];   // Sentence en dernier : elle prime
      const def = STATUSES[top];
      const puls = top === STATUS_DOOM ? 0.35 + 0.45 * Math.abs(Math.sin(tm * 7)) : 0.5;
      ctx.strokeStyle = def.couleur;
      ctx.globalAlpha = puls;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, RING_STATUS, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    drawPlayerBar(p, x, y, col);
    drawPlayerMarks(p, x, y, marks, tm);

    if (!isMe) {
      ctx.fillStyle = TEXT.dim;
      ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(nameOf(p.id), x, y - CFG.PLAYER_RADIUS - 28);
    }
  }
}
/* Lames orbitales, en PASSE SEPAREE et par-dessus tout le reste — y compris les
   autres joueurs et le champ de givre. Dessinees dans la boucle des joueurs,
   elles passaient sous tout ce qui venait apres et se perdaient dans l'aura du
   givre : la carte etait prise et invisible.

   L'angle se deduit du temps de manche avec exactement la meme formule que
   `_orbiters()` dans game_state.js — toute derive ici dessinerait des lames qui
   touchent les ennemis ailleurs que la ou elles font reellement des degats.

   La trainee n'est pas un ornement : une lame de huit pixels qui tourne a
   2,2 rad/s se remarque en mouvement, pas a l'arret, et c'est precisement en
   mouvement qu'un arc court la rend impossible a confondre avec un anneau. */
export function drawOrbiters(list, tm) {
  for (const p of list) {
    if (p.downed || !(p.orbiters > 0)) continue;
    const isMe = p.id === myId;
    const x = isMe && predicted ? predicted.x : p.x;
    const y = isMe && predicted ? predicted.y : p.y;
    const col = colorOf(p.id);
    const n = p.orbiters;
    const r = CARD_CFG.ORBIT_RADIUS;

    for (let i = 0; i < n; i++) {
      const oa = tm * CARD_CFG.ORBIT_SPEED + (i / n) * Math.PI * 2;

      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x, y, r, oa - 0.45, oa);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(x + Math.cos(oa) * r, y + Math.sin(oa) * r);
      ctx.rotate(oa);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(-4, -3); ctx.lineTo(-4, 3);
      ctx.closePath(); ctx.fill();
      // Liseré sombre : la lame reste detachee meme posee sur une aura de la
      // meme famille de teinte.
      ctx.strokeStyle = alpha(SURFACE.void, 0.85);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
}
/* Barre de vie au-dessus de CHAQUE joueur, la sienne comprise. Elle n'existait
   pas : on lisait ses PV en bas a gauche et ceux des autres dans une liste de
   texte en haut a droite, ce qui interdisait de voir qui etait bas sans quitter
   l'arene des yeux. Avec un soigneur dans l'equipe, c'est simplement injouable.

   Le bouclier est SUPERPOSE et non accole : une seconde barre a cote decale la
   lecture de la premiere, et on finit par croire qu'un allie a plus de vie qu'il
   n'en a. */
const BAR_W = 40, BAR_H = 4;
function drawPlayerBar(p, x, y, col) {
  const by = y - CFG.PLAYER_RADIUS - 14;
  const bx = x - BAR_W / 2;
  const maxHp = p.maxHp || CFG.PLAYER_MAX_HP;
  const k = p.downed ? 0 : Math.max(0, Math.min(1, p.hp / maxHp));

  ctx.fillStyle = alpha(SURFACE.shadow, 0.45);
  ctx.fillRect(bx - 1, by - 1, BAR_W + 2, BAR_H + 2);
  ctx.fillStyle = SURFACE.lineSoft;
  ctx.fillRect(bx, by, BAR_W, BAR_H);

  // Ambre sous 50 %, rouge sous 25 % : la couleur du joueur ne dit rien de son
  // etat, et c'est justement ce qu'on cherche a lire d'un coup d'oeil.
  ctx.fillStyle = k < 0.25 ? HUD.low : (k < 0.5 ? HUD.mid : col);
  ctx.fillRect(bx, by, BAR_W * k, BAR_H);

  if (p.shield > 0) {
    const sk = Math.max(0, Math.min(1, p.shield / CFG.SHIELD_POOL));
    ctx.fillStyle = alpha(CLASS_COLOR.tank, 0.85);
    ctx.fillRect(bx, by, BAR_W * sk, 2);
  }

  // Icones d'etats sous la barre, dans l'ordre de la table.
  const actifs = activeStatuses(p);
  if (actifs.length > 0) {
    let ix = x - (actifs.length * 11 - 3) / 2 + 4;
    for (const id of actifs) {
      paintStatusIcon(id, ix, by + BAR_H + 7, 0.62);
      // Les cumuls de Vulnerabilite se comptent : trois cumuls et un seul ne
      // sont pas la meme situation, c'est meme toute la mecanique de rotation.
      if (id === STATUS_VULN && p.vuln > 1) {
        ctx.fillStyle = STATUSES[STATUS_VULN].couleur;
        ctx.font = "700 8px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "left";
        ctx.fillText(String(p.vuln), ix + 4, by + BAR_H + 11);
      }
      ix += 11;
    }
  }

  /* Sentence : le decompte chiffre, gros, sur le joueur concerne. C'est
     l'urgence absolue du jeu — il faut le soigner a plein avant l'echeance — et
     une icone de sablier ne dit pas s'il reste sept secondes ou une. */
  if (p.doom > 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = p.doom < 3 && Math.floor(p.doom * 4) % 2 === 0
      ? SIGNAL.ally : STATUSES[STATUS_DOOM].couleur;
    ctx.font = "700 20px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(p.doom.toFixed(1), x, by - 8);
  }
  ctx.textAlign = "left";
}
/* Marqueurs SUR LE JOUEUR, au-dessus de sa barre de vie : cible, a regrouper,
   lie, en cage. Ils repondent a la seule question qu'on se pose quand une
   mecanique part — « est-ce que ca me concerne, moi ? » — et le cercle au sol
   n'y repond pas quand on est quatre a se chevaucher dessus.

   GLYPHES DISTINCTS EN SILHOUETTE, jamais differencies par la seule couleur :
   un daltonien doit s'en sortir, et de toute facon la couleur se noie dans le
   chaos de deux cents ennemis. La couleur ne fait que confirmer ce que la forme
   dit deja, avec la meme grammaire qu'au sol : cyan on y va, rouge on s'ecarte,
   jaune on casse. */
const PLAYER_MARK = {
  [MECH_STACK]:  { col: MARK_GO, glyph: "converge" },
  [MECH_LINK]:   { col: MARK_AWAY, glyph: "lien" },
  [MECH_JAIL]:   { col: MARK_BREAK, glyph: "cage" },
  [MECH_BAIT]:   { col: MARK.bait, glyph: "cible" },
};
function drawPlayerMarks(p, x, y, marks, tm) {
  if (marks.length === 0) return;
  const my = [];
  for (const m of marks) {
    // `a` porte un identifiant d'ENTITE et non de joueur pour le lien
    // nourricier : sans cette exclusion, un rejeton dont l'identifiant tombe
    // sur celui d'un joueur lui collait un glyphe sur la tete.
    if (m.mech === MECH_FEED) continue;
    const def = PLAYER_MARK[m.mech];
    if (!def) continue;
    if (m.a === p.id || m.b === p.id) my.push(def);
  }
  if (my.length === 0) return;

  const gy = y - CFG.PLAYER_RADIUS - 26;
  const puls = 0.7 + 0.3 * Math.sin(tm * 7);
  let gx = x - (my.length * 15 - 15) / 2;
  for (const def of my) {
    ctx.save();
    ctx.translate(gx, gy);
    ctx.globalAlpha = puls;
    ctx.fillStyle = def.col;
    ctx.strokeStyle = def.col;
    ctx.lineWidth = 2;
    paintMarkGlyph(def.glyph);
    ctx.restore();
    gx += 15;
  }
  ctx.globalAlpha = 1;
}
function paintMarkGlyph(glyph) {
  switch (glyph) {
    case "converge":     // triangle pointe en bas : viens ici
      ctx.beginPath();
      ctx.moveTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(0, 4);
      ctx.closePath(); ctx.fill();
      break;
    case "lien":         // deux anneaux relies : ecarte-toi de l'autre
      ctx.beginPath(); ctx.arc(-4, 0, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(4, 0, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(1, 0); ctx.stroke();
      break;
    case "cage":         // carre barre : on te libere en cassant
      ctx.strokeRect(-5, -5, 10, 10);
      ctx.beginPath();
      ctx.moveTo(-1.5, -5); ctx.lineTo(-1.5, 5);
      ctx.moveTo(1.5, -5); ctx.lineTo(1.5, 5);
      ctx.stroke();
      break;
    case "cible":        // croix dans un cercle : c'est toi qui es vise
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
      ctx.moveTo(0, -7); ctx.lineTo(0, 7);
      ctx.stroke();
      break;
  }
}
export function fmtTime(t) {
  const m = String(Math.floor(t / 60)).padStart(2, "0");
  const s = String(Math.floor(t % 60)).padStart(2, "0");
  return m + ":" + s;
}
window.__clientReady = true;
