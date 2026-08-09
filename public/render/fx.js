/* ===========================================================================
   RETOUR SENSORIEL — particules, impacts, morts, chiffres
   Rien ici ne connait le sol ni les entites : ce module produit des effets, il
   ne compose pas l'image. L'orchestration est dans `world.js`.
   =========================================================================== */

import { playSound } from "/audio.js";
import { EventPump } from "/events.js";
import { hudDamage } from "/hud.js";
import { SRC_ICON } from "/icons.js";
import { CFG, hazardState } from "/shared/game_state.js";
import { COMBAT, SIGNAL, alpha } from "/shared/palette.js";
import { eventAt, segmentName } from "/shared/timeline.js";
import { SPRITE_CELL, drawSprite, frameOf, glActive } from "/sprites.js";
import { latest, myId } from "../core/state.js";
import { ENEMY_TINT, alertInfo, setAlertInfo } from "../net/interp.js";
import { ELITE_GOLD, GRID_FINE, camera, ctx, hazardsActifs, inView } from "./stage.js";

/* ===========================================================================
   RETOUR SENSORIEL
   Tout part du meme endroit : la liste d'evenements produite par events.js en
   comparant deux snapshots, LIVREE au moment ou l'horloge de rendu franchit le
   second des deux. Le son et les particules consomment la meme liste, donc ils
   ne peuvent pas diverger, et aucun des deux n'arrive avant son image.
   =========================================================================== */

/* Plafond de particules. Il valait 300 pour une seule raison : en canvas 2D,
   chaque fragment est un `fillRect` et quarante ennemis morts sous une bombe en
   produisaient assez pour se voir a l'image. En WebGL ce sont des quads du
   MEME lot que les entites — ils ne coutent ni appel de dessin ni changement
   d'etat — et le plafond peut monter d'un facteur dix sans effet mesurable.
   C'est le gain le plus visible de la bascule : les morts, les impacts et les
   explosions deviennent des gerbes au lieu de trois etincelles. */
const PARTICLE_2D = 300;
export const PARTICLE_GL = 3000;
// Une variable et non une constante : le batcher ne se branche qu'apres la
// generation de l'atlas, donc apres le chargement de ce module. Le plafond se
// fixe la, une fois qu'on sait quel chemin de rendu on a reellement obtenu.
export let PARTICLE_MAX = PARTICLE_2D;
export const HIT_FLASH = 0.06;        // eclair blanc de 60 ms sur l'ennemi touche
export const HIT_KICK = 5;            // recul du sprite, en pixels
const SHAKE_MAX = 10;
export const particles = [];
export const hits = new Map();        // ennemi -> { until, dx, dy }
export const shake = { x: 0, y: 0, mag: 0 };
// `myId` n'est pas encore connu a la construction : un accesseur plutot qu'une
// copie, sinon la diffusion resterait sur l'identifiant 0 toute la partie.
/* `hazards` et `hazardState` sont PASSES au lieu d'etre importes par
   `events.js` : le module ne depend de rien et doit le rester — c'est ce qui
   permet de le charger dans un script de mesure sans DOM ni contexte audio. Des
   accesseurs et non des valeurs : la geometrie se regenere entre deux manches,
   et une liste capturee une fois serait celle du biome precedent. */
export const pump = new EventPump(handleEvent, {
  get myId() { return myId; },
  get hazards() { return hazardsActifs(); },
  hazardState,
});
function addShake(mag) {
  // On garde le PLUS FORT et on ne cumule pas : deux explosions dans la meme
  // image cumulees donnaient une secousse qui ne retombait plus.
  shake.mag = Math.min(SHAKE_MAX, Math.max(shake.mag, mag));
}
/* Le tressaillement ne sort QUE sur les gros evenements — detonation de zone,
   onde de choc, rupture de barre, bombe. Jamais sur un impact ordinaire : a
   trois cents impacts par minute l'ecran ne se serait jamais immobilise. */
const EFFECT_SOUND = {
  0:  { son: "explosion", force: 0.7, shake: 4 },   // nova
  5:  { son: "mort", pitch: 0.55, shake: 0 },       // elite abattue
  7:  { son: "explosion", force: 1.0, shake: 6 },   // explosion de grenade
  8:  { son: "explosion", force: 0.6, shake: 4 },   // onde blanche
  12: { son: "explosion", force: 1.35, shake: 9 },  // bombe du DPS
  // Salve (lot C) : un impact aigu par cible, jamais de tressaillement — une
  // volee de huit ne doit pas secouer l'ecran huit fois.
  13: { son: "impact", pitch: 1.4, force: 0.5, shake: 0 },
  /* Absorption du bouclier (lot S). Un impact GRAVE et etouffe, sans
     tressaillement : le son doit dire « ca a tape sur du dur » et se distinguer
     de l'impact ordinaire, qui est le retour d'un tir REUSSI. Il sort a la
     cadence du tir tant qu'on reste de face, donc il ne peut ni secouer l'ecran
     ni sonner fort. */
  14: { son: "impact", pitch: 0.55, force: 0.45, shake: 0 },
};
function handleEvent(e) {
  switch (e.t) {
    case "tir":
      playSound("tir");
      break;

    case "impact":
      playSound("impact");
      // Le boss n'a ni sprite ni recul : il est trop gros pour qu'un
      // deplacement de cinq pixels se lise, et sa barre porte deja
      // l'information. Ses chiffres passent par `degats`, qui ne montre que
      // les SIENS — le seul chiffre que le client ne peut pas deduire.
      if (!e.boss) { registerHit(e); aggregateDamage(e); }
      break;

    /* Degats subis en ROUGE et plus gros, soins recus en VERT. Ils passent
       DESORMAIS par l'agregation, comme les chiffres d'ennemi : la raison pour
       laquelle ils y echappaient — « il n'y en a jamais qu'un a la fois par
       joueur » — est fausse depuis le vol de vie et les degats continus. Voir
       `aggregateSelf`.

       La PROVENANCE accompagne le chiffre rouge. Sans elle, perdre 40 PV
       n'apprenait rien : contact, projectile, zone, mecanique et brulure
       donnaient le meme nombre au meme endroit, et c'est la principale raison
       pour laquelle on ne comprend pas ses morts. Le glyphe est a gauche du
       nombre, dans sa couleur — une seconde teinte aurait fait croire a deux
       informations. */
    case "blesse":
      aggregateSelf("hurt", e);
      break;

    case "soigne":
      aggregateSelf("heal", e);
      break;

    /* BIOME (lot V). Un geyser qui souffle et un mur qui cede sont les deux
       seuls moments ou l'environnement fait quelque chose ; le reste du temps il
       est la, et c'est precisement ce qu'on lui demande.
       AUCUN TRESSAILLEMENT : « le tressaillement ne sort que sur les gros
       evenements », et un geyser qui souffle toutes les sept secondes au meme
       endroit n'en est pas un — l'ecran ne se serait jamais immobilise. */
    /* PAS DE SON. Il y en avait un, et il etait intenable : l'usine en cauchemar
       pose VINGT-SEPT geysers sur la salle, de periodes 5,4 a 7 s, et rien ne
       filtrait la distance — quatre a cinq declenchements par seconde, dont la
       quasi-totalite pour des bouches situees a deux ecrans de la.

       Le retirer plutot que le borner a la vue, parce que la regle du lot V dit
       deja pourquoi : un danger d'environnement est du SOL, il s'annonce par sa
       GEOMETRIE PERMANENTE — la bouche est visible en continu, le jet se voit
       partir. « On apprend la carte, on ne lit pas un compte a rebours », et un
       son n'ajoute rien a ce que l'oeil a deja. Le mur qui cede garde le sien :
       il n'arrive qu'une fois. */
    case "danger":
      break;

    case "murDetruit":
      playSound("mur");
      break;

    case "mort":
      // La hauteur varie avec le type : c'est gratuit et ca suffit a entendre
      // la difference entre la pietaille et un gros.
      playSound("mort", { pitch: e.elite ? 0.6 : 1.3 - Math.min(0.6, e.type * 0.12) });
      spawnDeath(e.x, e.y, e.type, e.elite, e.ang ?? 0);
      // Le coup fatal porte son chiffre comme n'importe quelle touche : c'est
      // le seul degat du jeu qui n'apparaissait nulle part, alors qu'il est le
      // plus satisfaisant. Il passe par la meme agregation, donc il se fond
      // dans les touches qui l'ont precede au lieu d'ouvrir une seconde colonne.
      if (e.dmg > 0) aggregateDamage(e);
      break;

    case "bonus": playSound("bonus"); break;
    case "niveau": playSound("niveau"); break;

    /* L'etape passe par le bandeau d'INFORMATION, jamais par une consigne : elle
       ne demande rien, elle situe. Elle porte son NOM depuis le lot X — c'est le
       seul endroit du jeu ou l'etape s'annonce, et « SEGMENT 3 » n'annoncait
       rien du tout.

       Le beat, lui, n'a plus d'annonce : la seule qui existait etait celle de
       l'accalmie, et un changement de debit ordinaire ne se commente pas — il se
       ressent, ou il n'a pas lieu d'etre dans le script. */
    case "segment": {
      const now = performance.now();
      setAlertInfo({ nom: segmentName(e.segment).toUpperCase(),
                    texte: "la horde reprend",
                    from: now, until: now + 2500 });
      break;
    }

    /* FIN D'EVENEMENT (lot U). L'ouverture a son annonce, envoyee par le canal
       d'alerte ; la CLOTURE n'a rien, et c'est pourtant le moment ou l'equipe
       est remise a plein. Sans ce retour, la remise a plein arrive sans cause
       visible — on se retrouve soigne sans savoir pourquoi, ce qui est
       exactement le defaut de lisibilite que le registre des provenances a
       corrige pour les degats.

       Le son du relevement et non un son neuf : c'est la meme promesse, elle
       doit s'entendre pareil. Et aucun tressaillement — rien n'a explose. */
    case "evenementFin": {
      const now = performance.now();
      const def = eventAt(e.event);
      setAlertInfo({ nom: (def?.nom ?? "ÉVÉNEMENT").toUpperCase(),
                    texte: "terminé — équipe remise à plein",
                    from: now, until: now + 2500 });
      playSound("releve");
      break;
    }
    case "aterre": playSound("aterre"); break;
    case "releve": playSound("releve"); break;

    case "explosion": {
      // L'amplitude suit le RAYON : une case de damier et un balayage de toute
      // l'arene ne peuvent pas secouer pareil.
      const k = Math.max(0.35, Math.min(1.4, e.r / 150));
      playSound("explosion", { force: k });
      addShake(3 + k * 5);
      addGridPing(e.x, e.y, e.r);
      break;
    }

    case "barre":
      playSound("barre");
      addShake(SHAKE_MAX);
      addGridPing(lastBossPos.x, lastBossPos.y, 260);
      break;

    case "boss":
      playSound("boss");
      break;

    case "degats":
      pushDamage(e.x, e.y, e.dmg, e.crit);
      break;

    case "effet": {
      const d = EFFECT_SOUND[e.kind];
      if (!d) break;
      playSound(d.son, d);
      if (d.shake) {
        addShake(d.shake);
        // Le sol reagit a ce qui le secoue, et a rien d'autre : le meme seuil
        // que le tressaillement, pour ne pas allumer la grille trois cents fois
        // par minute sur des impacts ordinaires.
        addGridPing(e.x, e.y, Math.max(70, e.r || 0));
      }
      break;
    }
  }
}
/* Eclair blanc et recul. Le recul se fait dans l'axe joueur -> ennemi et non
   dans celui du projectile : les balles ne transportent pas leur direction, et
   la quasi-totalite des degats vient d'un joueur qui tire droit devant lui. La
   difference ne se voit pas sur cinq pixels et soixante millisecondes. */
function registerHit(e) {
  let dx = 0, dy = 0;
  if (latest) {
    let best = Infinity;
    for (const p of latest.players.values()) {
      const d = (p.x - e.x) ** 2 + (p.y - e.y) ** 2;
      if (d < best) { best = d; dx = e.x - p.x; dy = e.y - p.y; }
    }
    const n = Math.hypot(dx, dy) || 1;
    dx /= n; dy /= n;
  }

  /* PLUSIEURS touches dans le meme intervalle : on les ETALE au lieu de n'en
     montrer qu'une. Le compteur du serveur dit exactement combien de balles
     sont tombees pendant les cinquante millisecondes qui separent deux
     instantanes ; les empiler au meme instant redonnerait le seul flash qu'on
     vient de corriger.

     L'espacement est celui de l'intervalle divise par le nombre de touches,
     borne par la duree du flash lui-meme : deux flashes plus rapproches que
     leur propre duree se recouvrent et se relisent comme un seul. Au-dela de
     ce que l'intervalle peut porter, on renonce — c'est le meme raisonnement
     que le plafond des eclats. */
  const now = performance.now();
  const n = Math.max(1, Math.min(HIT_BURST_MAX, e.hits ?? 1));
  const span = 1000 / CFG.SNAPSHOT_HZ;
  const step = Math.max(HIT_FLASH * 1000, span / n);
  for (let i = 0; i < n; i++) {
    if (i === 0) applyHit(e.id, e.x, e.y, dx, dy);
    else hitQueue.push({ at: now + i * step, id: e.id, x: e.x, y: e.y, dx, dy });
  }
}
// Au-dela, l'oeil ne compte plus : quatre eclairs en cinquante millisecondes
// sont deja a la limite du discernable, et les suivants ne feraient
// qu'allonger la file.
const HIT_BURST_MAX = 4;
export const hitQueue = [];
function applyHit(id, x, y, dx, dy) {
  hits.set(id, { until: performance.now() + HIT_FLASH * 1000, dx, dy });

  /* ECLAT D'IMPACT : deux fragments clairs projetes dans l'axe du tir. C'est
     l'action secondaire la moins chere du jeu et celle qui change le plus le
     ressenti — sans elle, tirer dans la foule ne donne aucune confirmation
     qu'on touche. Elle passe par le meme plafond que les morts : a trois cents
     impacts par minute, un eclat non plafonne noie l'ecran. */
  for (let i = 0; i < 2 && particles.length < PARTICLE_MAX; i++) {
    const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.6;
    const sp = 90 + Math.random() * 70;
    /* TRAINEE et non carre : `long` etire la case blanche le long de sa propre
       vitesse. C'est une transformation, donc aucune case d'atlas — et c'est
       precisement pour ca que l'etincelle allongee n'est pas cuite. Une gerbe
       de traits orientes se lit comme une direction ; la meme gerbe en carres
       ne disait que « quelque chose s'est passe ici ». */
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.14, max: 0.14, col: COMBAT.flash, size: 2,
      ang: a, long: 3.4,
    });
  }
}
/* Sortie des flashes differes. Une file balayee en entier et non arretee au
   premier terme non echu : deux ennemis touches dans la meme diffusion ont des
   espacements differents — quatre balles sur l'un, deux sur l'autre — et la
   file n'est donc PAS triee par echeance. Elle ne depasse jamais quelques
   dizaines d'entrees, le balayage complet est gratuit.

   Une file, et pas un minuteur par touche : a trois cents impacts par minute,
   ce serait trois cents `setTimeout` pour soixante millisecondes de flash. */
function flushHitQueue(now) {
  for (let i = hitQueue.length - 1; i >= 0; i--) {
    if (hitQueue[i].at > now) continue;
    const h = hitQueue[i];
    hitQueue.splice(i, 1);
    applyHit(h.id, h.x, h.y, h.dx, h.dy);
  }
}
/* MORTS ANIMEES. Trois images d'atlas — fissuration, eclatement, dispersion —
   plus les fragments. Duree totale 260 ms.

   Plafond global a trente morts simultanees : au-dela, seules les particules
   subsistent. Quarante ennemis qui meurent sous une bombe, ce sont quarante
   sequences de trois images qui se recouvrent — on n'en lit aucune, et on paie
   les quarante. */
export const deaths = [];
const DEATH_MAX = 30;
const DEATH_MS = 260;
export function drawDeaths() {
  if (deaths.length === 0) return;
  const now = performance.now();
  for (let i = deaths.length - 1; i >= 0; i--) {
    const d = deaths[i];
    const k = (now - d.at) / DEATH_MS;
    if (k >= 1) { deaths[i] = deaths[deaths.length - 1]; deaths.pop(); continue; }
    if (!inView(d.x, d.y)) continue;
    const step = k < 0.33 ? 0 : (k < 0.66 ? 1 : 2);
    drawSprite(ctx, frameOf(`e${d.type}_die${step}`), d.x, d.y, {
      angle: d.ang,
      // La depouille s'affaisse : l'ecrasement dit la chute sans une image de
      // plus, exactement comme l'etirement dit la course.
      scaleX: d.gain * (1 + k * 0.18),
      scaleY: d.gain * (1 - k * 0.25),
      alpha: 1 - k * 0.5,
    });
  }
}
/* Comment meurt chaque type. Registre PUREMENT CLIENT, comme le son ou le
   glyphe : rien de tout ca ne traverse le reseau, tout se deduit du type que le
   snapshot porte deja.

   Les cinq mouraient a l'identique — `n = elite ? 22 : 14`, `size = 2,5`,
   le seul branchement etant le rang d'elite. Un tank de 42 px de large se
   desagregeait donc en la meme poussiere qu'un runner de 21, ce qui gaspille la
   seule information gratuite qu'on ait : le joueur SAIT deja ce qu'il vient de
   tuer, la mort doit le lui confirmer.

   `cone` est l'ouverture de la gerbe autour de l'orientation de la depouille.
   A 2π elle part dans toutes les directions, ce qui reste le cas general — seul
   le runner meurt dans son axe. */
const DEATH_BURST = [
  // grunt — la reference dont les quatre autres s'ecartent.
  { n: 1.00, size: 2.5, sp: 60, spread: 130, life: 0.40, flash: 1.0, cone: 7 },
  /* runner — il meurt EN AVANCANT. Peu d'eclats, petits, rapides, dans un cone
     serre autour de sa course : c'est la vitesse qui etait son identite
     entiere, elle doit lui survivre d'une demi-seconde. */
  { n: 0.75, size: 2.0, sp: 150, spread: 190, life: 0.30, flash: 0.8, cone: 1.1 },
  /* tank — gros morceaux, lents, PEU NOMBREUX, et ils trainent. Une masse ne se
     pulverise pas ; elle se casse. La duree plus longue est ce qui fait qu'on
     voit les morceaux se poser au lieu de les voir disparaitre. */
  { n: 0.50, size: 5.2, sp: 35, spread: 70, life: 0.65, flash: 1.35, cone: 7 },
  // tireur — il flottait : ses debris partent mollement, sans elan propre.
  { n: 0.85, size: 2.6, sp: 45, spread: 95, life: 0.45, flash: 0.9, cone: 7 },
  /* brood — la NUEE. Beaucoup, minuscules, vifs : ce qui sortait d'elle etait
     le danger, et sa mort doit se lire comme une dispersion de ce qu'elle
     portait, pas comme l'eclatement d'un corps. */
  { n: 1.70, size: 1.8, sp: 95, spread: 175, life: 0.35, flash: 0.85, cone: 7 },
  /* kamikaze — il ne se casse pas, il DETONE. Beaucoup d'eclats, tres rapides,
     tres brefs, et l'eclat lumineux le plus fort du bestiaire : c'est la seule
     mort du jeu qui soit elle-meme une menace, et elle doit se lire comme un
     depart d'explosion et non comme une fin. La zone de souffle qui suit a son
     propre telegraphe — la gerbe l'annonce, elle ne la remplace pas. */
  { n: 1.60, size: 2.2, sp: 190, spread: 240, life: 0.26, flash: 1.8, cone: 7 },
  /* bulwark — la plaque cede. Peu de morceaux, GROS et lents, comme le tank
     dont il partage la masse : une armure ne se pulverise pas. Un cran plus
     rapides que ceux du tank quand meme, parce que ce qui part en premier est
     une plaque tendue et non une carapace. */
  { n: 0.55, size: 4.6, sp: 50, spread: 85, life: 0.60, flash: 1.25, cone: 7 },
  /* medic — frele. Peu de matiere, des fragments fins, une duree moyenne : il
     s'effondre plus qu'il n'eclate, et l'eclat reste discret — sa mort est un
     soulagement tactique, pas un evenement. */
  { n: 0.85, size: 2.0, sp: 80, spread: 130, life: 0.42, flash: 0.8, cone: 7 },
  /* choeur — l'aura RETOMBE. Beaucoup de fragments lents qui trainent : ce qui
     meurt est la couverture d'un paquet entier, et une dispersion qui s'attarde
     est ce qui le dit. C'est la seule mort qu'on veut voir de loin, parce
     qu'elle dit a toute l'equipe que le mur vient de tomber. */
  { n: 1.35, size: 2.4, sp: 45, spread: 95, life: 0.60, flash: 1.15, cone: 7 },
];
function spawnDeath(x, y, type, elite, ang = 0) {
  if (deaths.length < DEATH_MAX) {
    deaths.push({
      x, y, type, at: performance.now(),
      ang: Math.random() * Math.PI * 2,
      gain: elite ? CFG.ELITE_RADIUS_MUL : 1,
    });
  }
  // Plafond franc plutot qu'une eviction des plus anciennes : quand quarante
  // ennemis meurent ensemble, les huit premiers fragments disent deja tout, et
  // recycler la liste coutait plus cher que de refuser.
  if (particles.length >= PARTICLE_MAX) return;
  const col = ENEMY_TINT[type] ?? ENEMY_TINT[0];
  /* Deux fois plus de fragments en WebGL. Le plafond y est dix fois plus haut
     (3 000 contre 300) parce qu'un fragment est un quad du MEME lot que les
     entites : le compte par mort peut suivre, et c'est le gain le plus visible
     de la bascule. En 2D chaque fragment reste un `fillRect`, donc l'ancien
     compte tient. */
  const dense = glActive();
  const D = DEATH_BURST[type] ?? DEATH_BURST[0];
  /* Le rang d'elite reste ORTHOGONAL au type : il multiplie le compte et la
     taille, il ne choisit pas une autre facon de mourir. Un tank elite doit
     mourir comme un tank, en plus gros — sinon le rang effacerait le type au
     moment precis ou l'on veut lire les deux. */
  const n = Math.round((elite ? (dense ? 22 : 10) : (dense ? 14 : 7)) * D.n);
  const grow = elite ? 1.4 : 1;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = D.cone >= 7 ? Math.random() * Math.PI * 2
                          : ang + (Math.random() - 0.5) * D.cone;
    const sp = D.sp + Math.random() * D.spread;
    /* ECLAT anguleux, et il TOURNE. Un debris de creature n'est pas une
       etincelle : il a une masse, donc une orientation propre qui n'a aucune
       raison de suivre sa trajectoire. La rotation est ce qui le dit — et elle
       ne coute qu'une addition par image, la ou une seconde image d'atlas
       aurait paye une forme figee. */
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: D.life, max: D.life, col, size: D.size * grow,
      frame: fxShard, ang: Math.random() * Math.PI * 2,
      /* Un GROS morceau tourne LENTEMENT — c'est la seule chose qui distingue
         un debris massif d'un petit debris grossi, et sans elle un fragment de
         tank tourbillonnait comme une escarbille. */
      spin: (Math.random() - 0.5) * 14 * (2.5 / D.size),
    });
  }
  /* L'ECLAT. Un halo blanc, immobile, gros et bref : en additif il sature le
     centre pendant deux images et c'est lui qui fait « lire » la mort comme un
     evenement plutot que comme une disparition. Il ne coute qu'une particule de
     plus, et le mode additif le rend gratuit a l'oeil comme au GPU.

     Halo et non carre : un carre blanc de 13 px en additif se lisait comme un
     CARRE lumineux, ce qui est exactement l'aspect que le reste du rendu evite.
     Une source de lumiere n'a pas d'arete — et c'est la seule des trois formes
     dont on ne peut pas se passer, aucune transformation d'un carre ne
     produisant un degradé. */
  if (particles.length < PARTICLE_MAX) {
    particles.push({
      x, y, vx: 0, vy: 0, life: 0.12, max: 0.12,
      // Le halo suit la MASSE du type, comme le reste : un tank part avec un
      // eclat nettement plus large qu'un runner.
      col: COMBAT.flash, size: (elite ? 20 : 13) * D.flash, frame: fxGlow,
    });
  }
  // Une elite laisse en plus une onde annulaire : c'est un evenement de manche,
  // pas une mort de piétaille, et le son a deja sa propre entree.
  if (elite && bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 20, max: 74, life: 0.35, t: 0.35, col: ELITE_GOLD });
  }
}
/* Ondes annulaires locales, purement visuelles : elles ne viennent d'aucun
   `kind` d'effet du serveur et n'ont donc rien a diffuser. Une liste a part
   plutot qu'une entree dans `effects` — celle-la est la copie interpolee de la
   simulation, y glisser du decor client aurait melange deux sources de verite. */
export const bursts = [];
export const BURST_MAX = 24;
function stepBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    bursts[i].t -= dt;
    if (bursts[i].t <= 0) { bursts[i] = bursts[bursts.length - 1]; bursts.pop(); }
  }
}
export function drawBursts() {
  for (const b of bursts) {
    const k = 1 - b.t / b.life;
    ctx.save();
    // ADDITIF : sur le fond ardoise, un anneau qui s'ajoute a la lumiere se lit
    // comme une onde de choc, la ou un anneau opaque se lit comme un trait.
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = alpha(b.col, (1 - k) * 0.75);
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + (b.max - b.r) * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
/* Chiffres de degats. Ce sont des elements DOM depuis que le HUD est sorti du
   canvas : ils recuperent gratuitement le contour de texte, l'assouplissement
   et le fondu, pour le seul cout d'une conversion monde -> ecran.

   Un seul chiffre par instantane et par boss : le cumul arrive deja somme du
   serveur. Douze chiffres empiles sur la meme silhouette masqueraient
   exactement ce qu'il faut regarder pendant un combat. */
/* Le critique a sa propre classe : ambre, plus gros. C'est la seule raison
   qu'un joueur ait jamais eue de REGARDER ces chiffres — sans distinction
   visible, un axe de build entier ne produit aucun retour a l'ecran et le
   joueur ne sait pas s'il fonctionne. */
function pushDamage(x, y, dmg, crit = false) {
  hudDamage(x + (Math.random() - 0.5) * 40, y - 30, dmg, crit ? "crit" : "deal");
}
/* AGREGATION SUR 200 ms. Les chiffres s'affichent desormais sur tous les
   ennemis et non plus sur le seul boss — mais une balle toutes les 90 ms sur la
   meme cible produirait une colonne de « 12 » illisible. On somme, on attend
   deux dixiemes de seconde, et on sort UN chiffre.

   Le seuil d'affichage est de 5 % des PV MAX de la cible : en dessous, le
   chiffre n'apprend rien et occupe l'ecran. C'est ce qui evite de repeindre la
   horde de nombres quand une nova touche quarante ennemis pour trois points
   chacun. */
const DMG_AGG_MS = 200;
const DMG_THRESHOLD = 0.05;
export const dmgAgg = new Map();
function aggregateDamage(e) {
  const a = dmgAgg.get(e.id);
  if (a) { a.sum += e.dmg; a.x = e.x; a.y = e.y; return; }
  dmgAgg.set(e.id, {
    x: e.x, y: e.y, sum: e.dmg, at: performance.now(),
    maxHp: e.maxHp || 1,
  });
}
/* AGREGATION DES CHIFFRES QUI CONCERNENT UN JOUEUR — degats subis et soins recus.
   Ils y echappaient, et la justification etait « il n'y en a jamais qu'un a la
   fois par joueur ». Cette premisse est fausse depuis deux mecaniques :

     - le VOL DE VIE rend un pourcentage des degats a CHAQUE TOUCHE. Mesure a un
       exemplaire : 0,29 a 0,58 PV par touche, six touches par seconde, soit un
       « +1 » vert environ trois fois par seconde. Le joueur en conclut
       logiquement que la carte se declenche au TIR et non a la touche — alors que
       la simulation est juste, et mesuree comme telle : trente tirs qui touchent
       donnent trente soins, trente tirs qui ratent en donnent zero.
     - un degat CONTINU (brulure, mare) descend les PV a chaque tic, donc a
       chaque instantane : jusqu'a vingt nombres rouges par seconde pour un seul
       effet.

   Meme fenetre que les chiffres d'ennemi, pour la meme raison : on somme, on
   attend deux dixiemes de seconde, et on sort UN chiffre. Mesure a un exemplaire
   de Vampirisme, cinq secondes de tir dans une horde : quinze nombres verts
   avant, neuf apres, et ils portent des valeurs qu'on peut lire au lieu d'un
   clignotement de « +1 ».

   Pas de seuil en part des PV max, contrairement aux chiffres d'ennemi : on ne
   connait pas ceux de la source. Le garde-fou porte sur la valeur AFFICHABLE — un
   total qui arrondit a zero n'est pas jete mais reporte sur la fenetre suivante.
   Il ne se declenche pas aujourd'hui (les PV traversent le reseau arrondis, donc
   un evenement porte toujours au moins un point entier) et c'est voulu : le jour
   ou ils passeront au dixieme, un filet de soin ne doit pas disparaitre. */
const SELF_AGG_MS = 200;
export const selfAgg = new Map();
function aggregateSelf(kind, e) {
  const cle = e.id + ":" + kind;
  const a = selfAgg.get(cle);
  if (a) {
    a.sum += e.dmg;
    a.x = e.x; a.y = e.y;
    // La provenance retenue est celle du DERNIER tic de la fenetre : c'est celle
    // qui est encore en train de faire mal.
    if (kind === "hurt") a.src = e.src ?? 0;
    return;
  }
  selfAgg.set(cle, {
    kind, x: e.x, y: e.y, sum: e.dmg, at: performance.now(), src: e.src ?? 0,
  });
}
export function flushSelf(now) {
  if (selfAgg.size === 0) return;
  for (const [cle, a] of selfAgg) {
    if (now - a.at < SELF_AGG_MS) continue;
    // Rien d'affichable : on garde le cumul et on rouvre une fenetre plutot que
    // de le jeter. Voir l'en-tete — ce garde-fou dort tant que les PV circulent
    // arrondis.
    if (Math.round(a.sum) < 1) { a.at = now; continue; }
    selfAgg.delete(cle);
    // Monde -> VUE ici, au point d'appel : le HUD ne connait pas la camera.
    hudDamage(a.x - camera.x0, a.y - camera.y0 - 26, a.sum, a.kind,
              a.kind === "hurt" ? (SRC_ICON[a.src] ?? null) : null);
  }
}
export function flushDamage(now) {
  if (dmgAgg.size === 0) return;
  for (const [id, a] of dmgAgg) {
    if (now - a.at < DMG_AGG_MS) continue;
    dmgAgg.delete(id);
    if (a.sum >= a.maxHp * DMG_THRESHOLD) {
      hudDamage(a.x - camera.x0 + (Math.random() - 0.5) * 18,
                a.y - camera.y0 - 22, a.sum, "deal");
    }
  }
}
export function stepFeedback(dt) {
  // Decroissance en 200 ms, exactement : au-dela l'ecran flotte, en deca la
  // secousse ne se distingue plus d'un decrochage d'image.
  if (shake.mag > 0.05) {
    shake.mag *= Math.pow(0.004, dt / 0.2);
    shake.x = (Math.random() - 0.5) * 2 * shake.mag;
    shake.y = (Math.random() - 0.5) * 2 * shake.mag;
  } else {
    shake.mag = 0; shake.x = 0; shake.y = 0;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      // Le budget des particules de zone (lot E) se rend ICI, au seul endroit
      // ou une particule meurt — un compteur separe aurait derive.
      if (p.zfx) zoneFx--;
      particles[i] = particles[particles.length - 1];
      particles.pop();
      continue;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    // Frottement : sans lui les fragments partent en ligne droite jusqu'au bord
    // et on lit une gerbe d'etincelles au lieu d'un eclatement.
    p.vx *= 0.90; p.vy *= 0.90;
    // Les etincelles d'annonce MONTENT : une derive verticale constante suffit
    // a les distinguer d'un eclatement, qui part dans toutes les directions.
    if (p.lift) p.vy -= p.lift * dt;
    /* Deux champs OPTIONNELS, testes et non appliques par defaut : la boucle
       tourne sur trois mille particules a chaque image, et deux multiplications
       inutiles par fragment se paient. Un `if` sur un champ absent est
       strictement moins cher que l'arithmetique qu'il evite. */
    if (p.spin) p.ang += p.spin * dt;
    // La fumee GONFLE en montant. C'est ce qui la separe d'une braise, qui garde
    // sa taille : deux effets qui partagent la meme case d'atlas doivent se
    // distinguer par leur comportement, sinon la case est mal partagee.
    if (p.grow) p.size += p.grow * dt;
  }
  stepBursts(dt);

  const now = performance.now();
  if (hitQueue.length > 0) flushHitQueue(now);
  if (hits.size > 0) {
    for (const [id, h] of hits) if (h.until < now) hits.delete(id);
  }
}
/* Cases de particule de l'atlas, teintees a la volee : c'est ce qui fait passer
   les fragments par le MEME lot que les entites. Sans elles il faudrait un
   second chemin de rendu pour dessiner des carres.

   Trois cases pour trois MATIERES, et le vocabulaire est fixe :
     - `fxWhite`  etire en trainee — une etincelle, ce qui file ;
     - `fxShard`  eclat anguleux   — de la matiere, ce qui est arrache ;
     - `fxGlow`   halo degradé     — de la lumiere ou de la fumee, ce qui n'a
                                     pas d'arete.
   Un fragment de creature et un eclair de mort partaient du meme carre blanc :
   a l'ecran, la mort d'un monstre etait un tas de pixels identiques a la gerbe
   d'un impact. La forme est ce qui les separe, et elle se lit avant la
   couleur — meme raison que pour les silhouettes de monstres. */
export let fxWhite = 0, fxShard = 0, fxGlow = 0;
export function drawParticles() {
  /* CHEMIN WEBGL. Les fragments partent en ADDITIF : sur un fond sombre, deux
     etincelles qui se croisent s'additionnent au lieu de se recouvrir, et une
     gerbe se lit comme une source de lumiere et non comme un tas de carres.
     C'est le mode que la bascule debloque, et le premier endroit ou l'employer.

     Ecart d'empilement assume : en WebGL les fragments vivent dans la couche
     des entites, donc SOUS le boss, les anneaux de joueur et les barres, la ou
     le chemin 2D les mettait au-dessus de tout. Les remonter demanderait un
     second contexte WebGL au-dessus de la couche 2D superieure — un canvas
     de plus a composer a chaque image pour quatre cents millisecondes d'effet
     derriere un boss. */
  if (glActive()) {
    for (const p of particles) {
      if (!inView(p.x, p.y, 40)) continue;
      const s = p.size / SPRITE_CELL;
      drawSprite(ctx, p.frame ?? fxWhite, p.x, p.y, {
        // `long` etire le long de l'axe propre de la particule : combine a
        // `angle`, c'est la trainee — et elle ne coute aucune case d'atlas.
        scaleX: s * (p.long ?? 1),
        scaleY: s,
        angle: p.ang ?? 0,
        tint: p.col,
        alpha: Math.max(0, p.life / p.max),
        additive: true,
      });
    }
    return;
  }

  /* CHEMIN CANVAS 2D — le mode degradé. Il ne rejoue ni l'eclat ni la trainee :
     un quadrilatere tourne y coute un `path` par fragment, la ou le chemin
     WebGL n'ajoute rien du tout au lot. Le halo, lui, est repris — un `arc` est
     du meme ordre qu'un `fillRect`, et sans lui l'eclair de mort reste le carre
     blanc que toute cette passe est venue supprimer. */
  for (const p of particles) {
    if (!inView(p.x, p.y, 40)) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.col;
    if (p.frame === fxGlow && fxGlow) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}
/* REACTION AUX IMPACTS : les lignes de grille brillent brievement dans le rayon
   d'une explosion ou d'une onde de choc. Peu couteux, tres caracteristique du
   registre instrumentation — le sol est un ECRAN DE MESURE, et un ecran de
   mesure reagit a ce qu'il mesure. */
export const gridPings = [];
const GRID_PING_MS = 420;
function addGridPing(x, y, r) {
  if (gridPings.length > 8) gridPings.shift();
  gridPings.push({ x, y, r, at: performance.now() });
}
export function drawGridPings() {
  if (gridPings.length === 0) return;
  const now = performance.now();

  for (let i = gridPings.length - 1; i >= 0; i--) {
    const p = gridPings[i];
    const k = (now - p.at) / GRID_PING_MS;
    if (k >= 1) { gridPings.splice(i, 1); continue; }

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = SIGNAL.go;
    ctx.globalAlpha = 0.30 * (1 - k);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = Math.floor((p.x - p.r) / GRID_FINE) * GRID_FINE;
    const y0 = Math.floor((p.y - p.r) / GRID_FINE) * GRID_FINE;
    for (let x = x0; x <= p.x + p.r; x += GRID_FINE) {
      ctx.moveTo(x + .5, p.y - p.r); ctx.lineTo(x + .5, p.y + p.r);
    }
    for (let y = y0; y <= p.y + p.r; y += GRID_FINE) {
      ctx.moveTo(p.x - p.r, y + .5); ctx.lineTo(p.x + p.r, y + .5);
    }
    ctx.stroke();
    ctx.restore();
  }
}
/* --- lot E : les quatre signatures ------------------------------------------

   Une zone se reconnait a son COMPORTEMENT avant sa couleur — la couleur
   confirme, elle ne distingue jamais, elle se noie dans le chaos :

     IMMINENT    craquelures qui s'ouvrent depuis le centre  « ca va exploser »
     PERSISTANT  braises et fumee qui montent                « ca restera »
     MOBILE      courant qui defile dans le deplacement      « ca vient »
     ACCUEILLANT halo vers l'interieur, colonne              « il faut y etre »

   Les signatures se COMBINENT avec les six formes du registre : une zone est
   un couple forme x signature, pas un cas particulier de plus. */

/* Budget des particules de zone : 600 au total, et l'emission par zone est
   cadencee pour qu'une zone n'en tienne jamais plus d'une quarantaine en vie
   (duree de vie x debit). La fumee ne sort QUE sur les persistantes, jamais
   sur un telegraphe — c'est l'erreur classique : soigner l'annonce jusqu'a ce
   qu'on ne voie plus qu'on brule. */
export const ZONE_FX_MAX = 600;
export let zoneFx = 0;
// Derniere position connue du boss : le lien nourricier y pointe sans avoir a
// transporter une seconde paire de coordonnees par rejeton.
export const lastBossPos = { x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2 };

/* Setters. Une liaison de module ES est VIVANTE en lecture — l'importateur
   voit toujours la valeur courante — mais elle est en lecture seule. Ecrire
   depuis un autre module demande donc de passer par ici, et par rien d'autre.
   C'est ce qui rend l'ecriture de cet etat cherchable en un grep. */
export function setPARTICLE_MAX(v) { PARTICLE_MAX = v; }
export function setFxWhite(v) { fxWhite = v; }
export function setFxShard(v) { fxShard = v; }
export function setFxGlow(v) { fxGlow = v; }
export function setZoneFx(v) { zoneFx = v; }
