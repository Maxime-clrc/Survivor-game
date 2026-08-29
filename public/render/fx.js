
import { playSound } from "/audio.js";
import { EventPump } from "/events.js";
import { hudDamage, hudEvent, hudLabel } from "/hud.js";
import { SRC_ICON, bonusNom } from "/icons.js";
import { ARMES } from "/shared/armes.js";
import { FAM_DISPERSION, FAM_EXPLOSIF, FAM_OBUS, FAM_RAIL, FIN_CHAMP, FIN_MASSE, MAT_CARAPACE, MAT_ENERGIE, MATIERE, POIDS_MAX, bonusFamille, bonusRang, echelleBouche, ficheDe, familleDe, finalDe, finalRayon, matiereDe, poids } from "/shared/feedback.js";
import { CFG, ENEMY_TYPES, POWERUP_TYPES, hazardState } from "/shared/game_state.js";
import { t } from "/shared/i18n.js";
import { BOSS, CLASS_COLOR, COMBAT, FX, POWERUP_COLOR, SIGNAL, SURFACE, alpha, melange } from "/shared/palette.js";
import { eventAt, eventNom, segmentName } from "/shared/timeline.js";
import { SPRITE_CELL, drawSprite, frameOf, glActive } from "/sprites.js";
import { GFX_MEDIUM, gfx, latest, myId } from "../core/state.js";
import { ENEMY_TINT, alertInfo, setAlertInfo } from "../net/interp.js";
import { ELITE_GOLD, GRID_FINE, camera, ctx, hazardsActifs, inView, lumDir, ownerColorOf, skin } from "./stage.js";


const PARTICLE_2D = 300;
export const PARTICLE_GL = 3000;
export let PARTICLE_MAX = PARTICLE_2D;
export const HIT_FLASH = 0.06;
export const HIT_KICK = 5;
const SHAKE_MAX = 10;
export const particles = [];
export const hits = new Map();
export const shake = { x: 0, y: 0, mag: 0 };

// [6] LE HITSTOP N'EXISTE QUE POUR LES BARRES DE BOSS. Dans un survivor la
// fluidite du deplacement EST le jeu : on gele l'horloge de RENDU, pas la
// simulation, et on rattrape le retard a mi-vitesse pour ne pas payer le gel en
// latence permanente.
export const timeWarp = { stop: 0, held: 0, count: 0 };
export function addHitstop(s) {
  if (timeWarp.stop <= 0) timeWarp.count++;
  timeWarp.stop = Math.max(timeWarp.stop, s);
}
function stepTimeWarp(dt) {
  if (timeWarp.stop > 0) {
    timeWarp.stop -= dt;
    timeWarp.held += dt;
  } else if (timeWarp.held > 0) {
    timeWarp.held = Math.max(0, timeWarp.held - dt * 0.5);
  }
}
export const pump = new EventPump(handleEvent, {
  get myId() { return myId; },
  get hazards() { return hazardsActifs(); },
  // le rectangle REELLEMENT affiche : `events.js` s'en sert pour ne pas lire
  // une entite filtree par le serveur comme une entite morte.
  get vue() {
    return { x0: camera.x0, y0: camera.y0,
             x1: camera.x0 + CFG.VIEW_W, y1: camera.y0 + CFG.VIEW_H };
  },
  hazardState,
});
function addShake(mag) {
  shake.mag = Math.min(SHAKE_MAX, Math.max(shake.mag, mag));
}
// UN KIND ABSENT DE CETTE TABLE EST MUET. Trois exceptions volontaires : `2`
// (niveau) et `6` (rupture de barre) sonnent par leur evenement NOMME, les
// doubler les ferait sonner deux fois ; `4` est un fourre-tout (balise,
// purification, Sentence, relevement) — un son unique pour tous mentirait, et
// ce qui compte y a deja le sien ; `3` (l'arc) sonne par CUMUL, voir `arcLot` —
// une chaine est un evenement, pas trois.
const EFFECT_SOUND = {
  0:  { son: "explosion", force: 0.7, shake: 4 },
  1:  { son: "balayage", force: 0.9, shake: 3 },
  5:  { son: "mort", pitch: 0.55, shake: 0 },
  7:  { son: "explosion", force: 1.0, shake: 6 },
  8:  { son: "explosion", force: 0.6, shake: 4 },
  9:  { son: "rempart", force: 0.8, shake: 0 },
  10: { son: "provocation", force: 0.9, shake: 0 },
  11: { son: "vagueSoin", force: 0.7, shake: 0 },
  12: { son: "explosion", force: 1.35, shake: 9 },
  13: { son: "impact", pitch: 1.4, force: 0.5, shake: 0 },
  14: { son: "impact", pitch: 0.55, force: 0.45, shake: 0 },
  15: { son: "impact", pitch: 0.9, force: 0.7, shake: 0 },
  // palier 3 · budget de MOMENT DE MANCHE : un ultime sort ~4 fois par manche.
  16: { son: "lancement", force: 0.9, shake: 3 },
  // la LAME, 2,5 balayages par seconde : palier 2, donc la hauteur porte la
  // difference et le tressaillement reste a zero — un tir ordinaire ne secoue
  // pas l'ecran, quelle que soit l'arme.
  17: { son: "balayage", pitch: 2.1, gain: 0.55, force: 0.5, shake: 0 },
  // le blocage PREND la place d'une touche : c'en est une, elle n'est pas
  // passee. Sans `key` il aurait ouvert une file a lui, et un porte-bouclier
  // sous une build a cadence rapide aurait sature le mix a lui seul.
  18: { son: "bloque", force: 1, shake: 0, key: "impact" },
  // la scission appartient au TIR qui l'a lancee : meme cle de limiteur que la
  // gerbe, donc l'arme ne coute pas deux voix par coup. Les deux ne se croisent
  // pas — 13 m de vol separent le depart de l'ouverture.
  19: { son: "scission", force: 1, shake: 0, key: "tirGerbe" },
};

/* LES QUATRE SOUFFLES, ET LEUR MATIERE. `n` est le nombre de tues : il met a
   l'echelle la duree, la taille et la gravite du son.

   LE COEUR EST TEINTE PAR SA PROPRE MATIERE. Les quatre partageaient le meme
   `blastCore` : quatre souffles differents finissaient par le meme point creme,
   qui est justement ce qu'on regarde. Il est tire vers le feu du style —
   lumineux mais CHAUD, jamais blanc. `COMBAT.flash` reste blanc pur et reste ou
   il est : sur l'eclair d'une touche, ou c'est correct. */
const coeurDe = feu => melange(COMBAT.blastCore, feu, 0.28);
const BLAST_STYLE = {
  0:  { coeur: coeurDe(FX.nova), feu: FX.novaSoft, bord: FX.nova, debris: FX.nova },
  7:  { coeur: coeurDe(FX.blastFill), feu: FX.blastEdge, bord: FX.blastFill, debris: FX.blastFill },
  8:  { coeur: coeurDe(FX.waveSoft), feu: FX.wave, bord: FX.waveSoft, debris: FX.waveSoft },
  12: { coeur: coeurDe(FX.bombFill), feu: FX.bombEdge, bord: FX.bombFill, debris: FX.bombFill },
};

function handleEvent(e) {
  // le HUD lit le MEME canal, et il le lit en premier : ce qu'il en fait ne
  // depend d'aucun des retours poses ci-dessous.
  hudEvent(e);
  switch (e.t) {
    case "tir":
      tirVoix(e);
      tirBouche(e);
      break;

    case "impact": {
      // LE BOSS SORT EN PREMIER ET COMPLETEMENT. Son evenement ne porte pas de
      // `hits` — il n'y a pas de `hitSeq` sur un boss — donc `palierDe` le
      // classait CONTINU et le rendait MUET. Deux baremes, deux chemins.
      if (e.boss) { bossTouche(e); break; }
      // [26d] le critique PREND la place de la touche dans le limiteur : le
      // nombre de voix par seconde ne bouge pas d'un cran. Le coup lourd fait
      // pareil — un troisieme palier de touche ne coute donc aucune voix.
      const pal = palierDe(e);
      // UN DEGAT CONTINU EST MUET. Il sortait 27 fois par seconde sur la meme
      // clef que les vraies touches et leur prenait leur place dans le limiteur :
      // le mix etait plein de poison. Les chiffres agreges le disent deja.
      if (pal !== HIT_CONTINU) {
        if (e.crits > 0) playSound("critique", { key: "impact" });
        else if (pal === HIT_LOURD) playSound("impactLourd", { key: "impact", claim: true });
        else playSound("impact");
      }
      registerHit(e, pal);
      aggregateDamage(e);
      break;
    }

    case "bossMort":
      bossMort(e.x, e.y);
      break;

    case "blesse":
      aggregateSelf("hurt", e);
      break;

    case "soigne":
      aggregateSelf("heal", e);
      break;

    case "danger":
      break;

    case "murDetruit":
      playSound("mur");
      break;

    case "mort": {
      const mat = MATIERE_DE[e.type] ?? MAT_CARAPACE;
      // MEME CLEF DE LIMITEUR POUR LES TROIS : la matiere change la recette,
      // jamais le nombre de voix. Le palier 1 porte sur la CADENCE des morts,
      // pas sur la mort — trois timbres ne doivent pas couter trois places.
      // LE SOIGNEUR ET LE CHOEUR PRENNENT LA PLACE. Ce sont les deux cibles
      // prioritaires du bestiaire — l'un rend la horde increvable, l'autre lui
      // donne 35 % de reduction — donc leur chute est une information tactique
      // et non une mort de plus. Sans `claim` elle se fait refuser par la horde
      // qui tombe en meme temps. Ils n'existent QUE en cauchemar (roster
      // `[0..8]`), et seulement apres la minute 19 : le cout est nul ailleurs.
      // MESURE, cauchemar, bestiaire force : 36 % de leurs morts s'entendent
      // contre 28 % pour la horde, pour +4 % de voix et une pointe de 4 sur 16.
      playSound(MATIERE[mat].son,
        { key: "mort", pitch: hauteurMort(e), claim: mat === MAT_ENERGIE });
      spawnDeath(e.x, e.y, e.type, e.elite, e.ang ?? 0, e.crit, e.owner, mat);
      spawnXpStream(e.x, e.y);
      if (e.dmg > 0) aggregateDamage(e);
      break;
    }

    case "bonusNe": {
      const cle = POWERUP_TYPES[e.type];
      playSound("bonusNe", { key: "bonus" });
      spawnBonusNe(e.x, e.y, POWERUP_COLOR[cle] ?? FX.heal);
      break;
    }

    case "bonus": {
      const cle = POWERUP_TYPES[e.type];
      const fam = bonusFamille(cle);
      const rang = bonusRang(cle);
      // MEME CLEF POUR LES TROIS FAMILLES : un ramassage est un ramassage, et
      // l'identite ne se paie pas en places de voix — meme regle qu'aux morts.
      playSound(fam.son, { key: "bonus", rang });
      const col = POWERUP_COLOR[cle] ?? FX.heal;
      spawnBonusPris(e.x, e.y, col, fam, rang);
      // le mot EST l'explication : un bonus se ramasse en courant, un panneau a
      // ouvrir n'existerait pour personne
      hudLabel(e.x - camera.x0, e.y - camera.y0 - 26, bonusNom(cle), col);
      break;
    }

    case "bonusPerdu":
      spawnBonusPerdu(e.x, e.y, POWERUP_COLOR[POWERUP_TYPES[e.type]] ?? FX.heal);
      break;

    case "recolte": playSound("recolte", { k: e.k }); break;
    case "recolteFin": playSound("recolteFin"); break;

    case "niveau":
      playSound("niveau");
      addPulse(SIGNAL.gain, 0.9);
      break;

    case "segment": {
      const now = performance.now();
      setAlertInfo({ nom: segmentName(e.segment).toUpperCase(),
                    texte: t("ui.alert.segment", "la horde reprend"),
                    from: now, until: now + 2500 });
      break;
    }

    case "evenementFin": {
      const now = performance.now();
      const def = eventAt(e.event);
      setAlertInfo({ nom: (def ? eventNom(e.event)
                      : t("ui.alert.event", "ÉVÉNEMENT")).toUpperCase(),
                    texte: t("ui.alert.eventFin", "terminé — équipe remise à plein"),
                    from: now, until: now + 2500 });
      playSound("releve");
      break;
    }
    case "aterre": playSound("aterre"); break;

    // LE BOUCLIER EST UNE COQUE, ET UNE COQUE SE BRISE. Trois budgets distincts :
    // la touche est l'eclair d'une image, la pose un fait notable, la rupture le
    // moment ou le joueur perd son tampon. Aucun tressaillement : ce n'est pas
    // une detonation, et le tressaillement est reserve aux gros evenements.
    case "bouclierPose":
      playSound("bouclier");
      spawnShieldOn(e.x, e.y);
      break;

    case "bouclierBrise":
      playSound("bouclierBrise");
      spawnShieldBreak(e.x, e.y);
      break;

    case "bouclierTouche":
      shieldHit.set(e.id, performance.now());
      break;

    // [21] le relevement d'un allie : flash, grave, et l'invulnerabilite se voit.
    case "releve":
      playSound("relevement");
      addPulse(SIGNAL.ally, 0.7);
      spawnRevive(e.x, e.y, ownerColorOf(e.id) ?? SIGNAL.ally);
      break;

    case "explosion": {
      const k = Math.max(0.35, Math.min(1.4, e.r / 150));
      playSound("explosion", { force: k });
      addShake(3 + k * 5);
      addGridPing(e.x, e.y, e.r);
      break;
    }

    case "barre":
      playSound("barre");
      addShake(SHAKE_MAX);
      addHitstop(0.10);
      addPulse(SIGNAL.warn, 0.5);
      addGridPing(lastBossPos.x, lastBossPos.y, 260);
      break;

    case "boss":
      playSound("boss");
      break;

    case "degats":
      pushDamage(e.x, e.y, e.dmg, e.crit);
      // [29] l'etincelle nait la ou la balle a touche, dans l'axe du tir.
      // ELLE N'EMPRUNTE PLUS LES ECLATS DU CRITIQUE A CHAQUE COUP : les eclats
      // ambres sortaient vingt fois par seconde, donc un critique sur le boss
      // ressemblait exactement a un coup ordinaire. Ils redeviennent le signe
      // du critique, et le coup ordinaire garde une etincelle a lui.
      bossEclats(e.x, e.y, e.x - lastBossPos.x, e.y - lastBossPos.y, e.crit);
      break;

    // UNE TOUCHE SOUS LE SEUIL D'AFFICHAGE, sur le boss : moins d'un point de
    // degat sur la fenetre de diffusion. Le palier ne ment pas — la touche
    // existe, elle ne compte pas. Etincelle renvoyee vers l'EXTERIEUR, son mat,
    // aucun chiffre. Ce n'est PAS un ricochet, et ca ne l'a jamais ete : le
    // rebond de carte sort en arcs.
    case "effleure": {
      const dx = e.x - (e.cx ?? e.x), dy = e.y - (e.cy ?? e.y);
      const a0 = Math.atan2(dy, dx) || Math.random() * Math.PI * 2;
      for (let i = 0; i < 2 && particles.length < PARTICLE_MAX; i++) {
        const a = a0 + (i - 0.5) * 0.9 + (Math.random() - 0.5) * 0.5;
        const sp = 130 + Math.random() * 110;
        particles.push({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.18, max: 0.18, col: COMBAT.flash, size: 2.6,
          frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 5,
        });
      }
      playSound("impact", { pitch: 0.5, force: 0.35 });
      break;
    }

    case "effet": {
      // l'arc cumule au lieu de sonner : les segments d'un meme tir arrivent
      // dans le MEME lot, et `claim` en refusait deux sur trois.
      if (e.kind === 3) {
        arcLot.n++;
        arcLot.sauts = Math.max(arcLot.sauts, Math.max(0, (e.n ?? 1) - 1));
        break;
      }
      const d = EFFECT_SOUND[e.kind];
      const S = BLAST_STYLE[e.kind];
      if (S) {
        // [8] l'intensite MET TOUT A L'ECHELLE : trente tues et trois ne
        // produisent plus la meme image ni le meme son.
        const ampleur = Math.min(1, (e.n ?? 0) / 12);
        // zero veut dire RADIAL, pas « vers l'est » : seul un souffle qui a
        // percute quelque chose porte un sens.
        spawnBlast(e.x, e.y, e.r || 90, ampleur, S, e.ang ? e.ang : null);
        playSound("explosion", { force: (d?.force ?? 1) * (0.75 + 0.75 * ampleur) });
        addShake((d?.shake ?? 4) * (0.7 + 0.6 * ampleur));
        addGridPing(e.x, e.y, Math.max(70, e.r || 0));
        break;
      }
      if (e.kind === 11) spawnHealWave(e.x, e.y, e.r);
      else if (e.kind === 9) spawnBulwark(e.x, e.y, e.r);
      else if (e.kind === 18) spawnDeflect(e.x, e.y, e.ang ?? 0);
      if (!d) break;
      playSound(d.son, d);
      if (d.shake) {
        addShake(d.shake);
        addGridPing(e.x, e.y, Math.max(70, e.r || 0));
      }
      break;
    }
  }
}

/* UNE CHAINE EST UN EVENEMENT, PAS TROIS. Les arcs d'un meme tir arrivent dans
   le MEME lot de differences ; les sonner un par un ne donnait rien de plus,
   parce que `claim` en refusait deux sur trois — un rebond ne s'entendait donc
   PAS. On les cumule et on sonne une fois apres le lot, avec la LONGUEUR de la
   chaine : la voix dure plus longtemps et craque plus loin quand ca saute, et
   trois sauts ne coutent toujours qu'une place. */
const arcLot = { n: 0, sauts: 0 };
function flushArcs() {
  if (arcLot.n === 0) return;
  const sauts = arcLot.sauts;
  arcLot.n = 0; arcLot.sauts = 0;
  playSound("foudre", { key: "impact", claim: true, sauts,
                        force: 1 + Math.min(0.4, sauts * 0.15) });
}

/* LA VOIX D'UN DEPART. L'arme ne circule pas : le proprietaire voyage dans le
   tuple de la balle, son arme dans le sien, donc `ARMES[p.arme]` la rend sans
   qu'aucune clef d'instantane s'ouvre.

   La famille donne la MATIERE, l'arme donne l'ECHELLE — hauteur, gain et duree
   se relevent sur `interval`, ils ne se declarent pas. Deux armes de la meme
   famille restent donc distinctes sans seconde table, et la clef du limiteur
   reste la famille : quatre joueurs sur la meme arme se partagent une place.

   UN ALLIE SONNE PLUS BAS QUE SOI. Sans cet ecart, a quatre joueurs on
   n'entend plus SON arme, ce qui est la seule chose que ce lot cherche. */
const TIR_ALLIE = 0.55;
function tirVoix(e) {
  const p = latest?.players?.get(e.owner);
  const a = p ? ARMES[p.arme] : null;
  const f = ficheDe(a);
  // trois familles sonnent par leur delivrance, pas par leur depart
  if (!f.son) return;
  const w = poids(a);
  const n = Math.max(1, e.n ?? 1);
  /* LA RAMPE S'ENTEND, ET ELLE NE COUTE PAS UNE VOIX. Elle se lisait dans
     l'anneau et dans l'ecartement des balles, jamais dans la matiere du tir :
     l'arme sonnait pareil au premier coup et au trentieme, alors que tout ce
     qu'elle enseigne est « reste ». `armeRes` est deja sur le joueur, la meme
     voix monte d'un demi-ton et s'appuie — et elle REDESCEND progressivement
     quand le joueur bouge, exactement comme la rampe. */
  const rampe = a?.rampe ? (p.armeRes ?? 0) : 0;
  playSound(f.son, {
    pitch: Math.pow(w, -0.35) * (1 + 0.12 * rampe)
      * (1 + (Math.random() - 0.5) * f.jitter),
    gain: Math.min(1.3, (0.7 + 0.3 * (w / POIDS_MAX)) * (1 + 0.12 * (n - 1))
                        * (1 + 0.22 * rampe))
      * (e.owner === myId ? 1 : TIR_ALLIE),
    // la queue d'un echantillon ne doit pas depasser la cadence qui l'appelle
    dur: a?.interval > 0 ? a.interval * 0.9 : 0,
  });
}

/* LA BOUCHE. Un projectile APPARAISSAIT a 16 px du corps : le seul evenement du
   jeu qui n'avait aucun depart. Le canal manquait, il n'etait pas mal regle.

   ELLE EST ATTACHEE AU CANON, PAS AU MONDE. Le tir est enregistre par
   proprietaire et le trace se fait a la position RENDUE du joueur, dans l'axe ou
   il pointe : une position monde figee decrocherait du personnage des qu'il
   bouge, et c'est le decrochage qui se voit, pas les 50 ms de retard de visee.

   23 px, MESURE sur les trois traces de classe (tireur 24, rempart 23,
   soigneur 21) : un seul nombre, l'ecart ne se voit pas. */
const BOUCHE_X = 23;
export const bouches = new Map();

function tirBouche(e) {
  const p = latest?.players?.get(e.owner);
  const a = p ? ARMES[p.arme] : null;
  const f = ficheDe(a);
  if (!f.bouche) return;
  bouches.set(e.owner, {
    at: performance.now(), fam: familleDe(a), b: f.bouche, ech: echelleBouche(a),
    n: Math.min(3, Math.max(1, e.n ?? 1)), parti: 0,
  });
}

function kite(x, y, ux, uy, long, large) {
  const px = -uy, py = ux;
  ctx.beginPath();
  ctx.moveTo(x + ux * long, y + uy * long);
  ctx.lineTo(x + ux * long * 0.28 + px * large, y + uy * long * 0.28 + py * large);
  ctx.lineTo(x - ux * long * 0.3, y - uy * long * 0.3);
  ctx.lineTo(x + ux * long * 0.28 - px * large, y + uy * long * 0.28 - py * large);
  ctx.closePath();
  ctx.fill();
}
function losange(x, y, ux, uy, long, large) {
  const px = -uy, py = ux;
  ctx.beginPath();
  ctx.moveTo(x + ux * long, y + uy * long);
  ctx.lineTo(x + px * large, y + py * large);
  ctx.lineTo(x - ux * long, y - uy * long);
  ctx.lineTo(x - px * large, y - py * large);
  ctx.closePath();
  ctx.fill();
}

/* LA FORME SE LIT SUR LA FAMILLE, pas sur un champ de la fiche : « c'est une
   gerbe » ecrit a deux endroits finit par diverger. Le coeur rejoue la meme
   forme en plus petit et saute les ornements — c'est l'empilement qui fabrique
   le blanc, jamais une source deja blanche. */
function formeBouche(fam, x, y, ux, uy, L, W, coeur) {
  const px = -uy, py = ux;
  switch (fam) {
    case FAM_RAIL:
      // la seule bouche PLUS LONGUE QUE LARGE, et les rails en travers
      losange(x + ux * L * 0.35, y + uy * L * 0.35, ux, uy, L * 0.65, W);
      if (!coeur) losange(x, y, px, py, W * 3.4, W * 0.5);
      return;
    case FAM_DISPERSION:
      // LA GERBE S'OUVRE : trois lobes, jamais un cone lisse
      kite(x, y, ux, uy, L, W * 0.55);
      if (coeur) return;
      for (const s of [-1, 1]) {
        const a = Math.atan2(uy, ux) + s * 0.62;
        kite(x, y, Math.cos(a), Math.sin(a), L * 0.72, W * 0.42);
      }
      return;
    case FAM_EXPLOSIF:
      // UN TUBE NE CLAQUE PAS : une bouffee ronde, aucune pointe
      ctx.beginPath();
      ctx.arc(x + ux * L * 0.2, y + uy * L * 0.2, W, 0, Math.PI * 2);
      ctx.fill();
      return;
    case FAM_OBUS:
      kite(x, y, ux, uy, L, W * 0.7);
      if (coeur) return;
      // l'anneau de pression : ce qui separe une bouche fermee d'un tube ouvert
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + ux * L * 0.3, y + uy * L * 0.3, W * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      return;
    default:
      kite(x, y, ux, uy, L, W * 0.5);
      if (coeur) return;
      losange(x, y, px, py, W * 1.3, W * 0.28);
      return;
  }
}

export function drawBouche(id, x, y, ang, col) {
  const m = bouches.get(id);
  if (!m) return;
  const u = (performance.now() - m.at) / (m.b.vie * 1000);
  if (u >= 1) return;
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const bx = x + ux * BOUCHE_X, by = y + uy * BOUCHE_X;
  // les particules naissent a la position RENDUE, donc au premier trace et non a
  // la reception : `latest` a jusqu'a un instantane d'avance sur l'image.
  if (!m.parti) { m.parti = 1; boucheFx(m, bx, by, ux, uy); }
  if (!inView(bx, by, 60)) return;

  // ELLE NAIT A SA TAILLE MAXIMALE — meme regle que le noyau d'un souffle : une
  // montee progressive fait « animation », une naissance pleine fait « depart ».
  const k = 1 - u;
  const ech = m.ech * (1 + 0.12 * (m.n - 1));
  const L = m.b.long * ech, W = m.b.large * ech;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = k;
  ctx.fillStyle = col;
  formeBouche(m.fam, bx, by, ux, uy, L, W, false);
  ctx.globalAlpha = Math.min(1, k * 1.2);
  ctx.fillStyle = COMBAT.blastCore;
  formeBouche(m.fam, bx, by, ux, uy, L * 0.55, W * 0.5, true);
  ctx.restore();
}

function boucheFx(m, x, y, ux, uy) {
  if (!inView(x, y, 60)) return;
  const b = m.b, ech = m.ech, n = m.n;
  // le chemin 2D plafonne a 300 particules contre 3 000 : a pleine densite la
  // bouche y prendrait un tiers du budget et affamerait les morts, qui sont le
  // palier au-dessus. Un canon, la moitie des etincelles, une bouffee.
  const dense = glActive();
  const nb = dense ? n : 1;
  const ang0 = Math.atan2(uy, ux);
  const ouvert = Math.min(1.6, (b.large / b.long) * 1.6);

  const ne = dense ? b.etincelles * nb : Math.ceil(b.etincelles / 2);
  for (let i = 0; i < ne && particles.length < PARTICLE_MAX; i++) {
    const a = ang0 + (Math.random() - 0.5) * ouvert;
    const sp = 240 + Math.random() * 260;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.11, max: 0.11, col: COMBAT.flash, size: 2 * ech,
      ang: a, long: 3.6,
    });
  }
  // LA DOUILLE SORT SUR LE COTE ET ELLE TOURNE. C'est le seul debris du jeu qui
  // ne vienne pas d'une destruction, et c'est ce qui rend l'arme mecanique.
  for (let i = 0; i < b.douille * nb && particles.length < PARTICLE_MAX; i++) {
    const a = ang0 + Math.PI / 2 + (Math.random() - 0.5) * 0.7;
    const sp = 90 + Math.random() * 80;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.38, max: 0.38, col: COMBAT.bullet, size: 2.3 * ech,
      frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 22, drag: 0.86,
    });
  }
  // la fumee derive DEVANT la bouche et grandit : elle dit la pression, pas le feu
  const nf = dense ? b.fumee : Math.min(1, b.fumee);
  for (let i = 0; i < nf && particles.length < PARTICLE_MAX; i++) {
    const a = ang0 + (Math.random() - 0.5) * 0.9;
    const sp = 40 + Math.random() * 50;
    particles.push({
      x: x + ux * 4, y: y + uy * 4,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.25, max: 0.75,
      col: SURFACE.line, size: b.large * 0.7 * ech, frame: fxGlow,
      grow: 60, a0: 0.28, drag: 0.93,
    });
  }
}

// [1] LE RETOUR N'EST PAS SUR LA MORT, IL EST SUR LA CADENCE DES MORTS. Chaque
// tue dans la fenetre monte d'un demi-ton, plafonne a l'octave ; la chaine
// cassee redescend au sol. La hauteur est gratuite : aucune voix de plus.
const CHAIN_WINDOW = 0.4;
const CHAIN_MAX = 12;
const chain = { at: 0, n: 0 };
function chainPitch() {
  const now = performance.now() / 1000;
  chain.n = now - chain.at < CHAIN_WINDOW ? Math.min(CHAIN_MAX, chain.n + 1) : 0;
  chain.at = now;
  return Math.pow(2, chain.n / 12);
}
/* QUATRE PALIERS, ET C'EST LA CIBLE QUI LES DECIDE. La part de PV max retiree
   dit a la fois la puissance du coup ET la masse de ce qui l'encaisse : le meme
   rail rend LOURD sur un fantassin et LEGER sur un colosse, donc « un ennemi
   lourd reagit moins » sort du meme nombre, sans table de masse.

   LA BOUCHE DIT L'ARME, L'IMPACT DIT LE COUP. L'identite de l'arme voyage deja
   par trois canaux — depart, silhouette du projectile, voix. La rejouer ici
   ferait un quatrieme axe sur un evenement qui sort des dizaines de fois par
   seconde, et le palier 0 de `RENDU.md` ne le paie pas.

   UN TICK DE BRULURE N'EST PAS UNE TOUCHE. Le serveur le dit deja — `_damage`
   n'incremente pas `hitSeq` en `overTime` — et le client l'effacait. MESURE, 4
   graines, 12 min, 4 joueurs, mode normal : sur 92 968 evenements d'impact,
   75 651 (81 %) sont du degat CONTINU. Ils rendaient l'eclair blanc, le recul
   directionnel, deux etincelles et une voix — pour un poison. Ils gardent un
   eclair court, ils perdent tout le reste.

   Sur les 17 317 vraies touches : part de 0,1 % au p25, 0,3 % a la mediane,
   16,3 % au p90, 31,2 % au p95. Les deux seuils decoupent 93 / 5 / 2 %, soit
   31,7 / 1,7 / 0,53 par seconde — l'echelle de budget de `RENDU.md`, relevee. */
export const HIT_CONTINU = 0, HIT_LEGER = 1, HIT_MOYEN = 2, HIT_LOURD = 3;
const PALIER_MOYEN = 0.25, PALIER_LOURD = 0.60;
function palierDe(e) {
  if (!(e.hits > 0)) return HIT_CONTINU;
  const part = (e.dmg ?? 0) / e.hits / Math.max(1, e.maxHp ?? 1);
  return part >= PALIER_LOURD ? HIT_LOURD : part >= PALIER_MOYEN ? HIT_MOYEN : HIT_LEGER;
}
/* LE POIDS PILOTE AUSSI LE TRESSAILLEMENT, et c'etait la derniere colonne qui
   manquait : `PALIER` decidait deja de l'eclair, des eclats, du cone, de la
   poussiere, de l'onde et de la voix, donc la regle vivait a un seul endroit
   sauf pour celle-la.

   IL N'EXISTE QUE SUR SES PROPRES COUPS LOURDS, et les deux bornes comptent.
   « Lourd » vaut 2 % des touches — 0,53 par seconde pour toute l'equipe, releve
   — et le reserver a SON tireur le ramene sous 0,15 : c'est ce qui separe un
   accent d'un tremblement permanent. Un coup lourd d'un allie ne secoue pas MON
   ecran ; il a deja son onde, son noyau et sa voix.

   0,7 px sur une vue de 1 600, soit 7 % de `SHAKE_MAX` : il se SENT, il ne se
   voit pas, et il ne peut pas se confondre avec une detonation. Le tressaillement
   franc reste ou il etait — detonations, ondes de choc, rupture de barre. */
const PALIER = [
  { flash: 0.045,      kick: 0,    eclats: 0, sp: 0,   cone: 0,    poussiere: 0, shake: 0 },
  { flash: HIT_FLASH,  kick: 1,    eclats: 2, sp: 90,  cone: 1.60, poussiere: 0, shake: 0 },
  { flash: 0.085,      kick: 1.35, eclats: 4, sp: 140, cone: 1.18, poussiere: 1, shake: 0 },
  { flash: 0.120,      kick: 1.90, eclats: 6, sp: 210, cone: 0.76, poussiere: 3, shake: 0.7 },
];

function registerHit(e, pal) {
  let dx = e.dx ?? 0, dy = e.dy ?? 0;
  // aucun projectile ne l'explique — zone, brulure, arc, balayage : la source
  // est le joueur le plus proche, et pour CES sources-la c'est exact.
  if (dx === 0 && dy === 0 && latest) {
    let best = Infinity;
    for (const p of latest.players.values()) {
      const d = (p.x - e.x) ** 2 + (p.y - e.y) ** 2;
      if (d < best) { best = d; dx = e.x - p.x; dy = e.y - p.y; }
    }
  }
  const n0 = Math.hypot(dx, dy) || 1;
  dx /= n0; dy /= n0;

  const now = performance.now();
  const n = Math.max(1, Math.min(HIT_BURST_MAX, e.hits ?? 1));
  const span = 1000 / CFG.SNAPSHOT_HZ;
  const step = Math.max(HIT_FLASH * 1000, span / n);
  // la teinte de l'allie qui tire : on voit ce que font les autres sans quitter
  // son propre ecran. Elle est un attribut de sommet, donc gratuite.
  const col = e.owner && e.owner !== myId ? ownerColorOf(e.owner) : null;
  let restants = e.crits ?? 0;
  const type = e.type ?? 0;
  const perce = e.perce === 1;
  // `col` ne suffit PAS a repondre « est-ce mon coup » : il est nul aussi bien
  // pour moi que pour une source sans proprietaire — zone, brulure, danger.
  const mien = e.owner === myId;
  for (let i = 0; i < n; i++) {
    const crit = restants-- > 0;
    if (i === 0) applyHit(e.id, e.x, e.y, dx, dy, crit, col, pal, type, perce, mien);
    else hitQueue.push({ at: now + i * step, id: e.id, x: e.x, y: e.y, dx, dy,
                         crit, col, pal, type, perce, mien });
  }
}
const HIT_BURST_MAX = 4;
export const hitQueue = [];
const CRIT_FLASH = 0.17;
function applyHit(id, x, y, dx, dy, crit = false, col = null, pal = HIT_LEGER,
                  type = 0, perce = false, mien = false) {
  const now = performance.now();
  const P = PALIER[pal] ?? PALIER[HIT_LEGER];
  hits.set(id, {
    until: now + (crit ? CRIT_FLASH : P.flash) * 1000,
    dx, dy,
    // RIEN NE REND L'ETAT « BRULE » SUR UN ENNEMI — la brulure n'est pas dans
    // l'instantane — donc l'eclair par tick est la SEULE information et il ne
    // peut pas disparaitre. Il change de couleur : violet = persistant, la
    // grammaire deja ecrite. Un ennemi qui brule se teinte au lieu de clignoter
    // blanc, et cesse de se lire comme un ennemi qu'on frappe en continu.
    col: crit ? SIGNAL.warn : (pal === HIT_CONTINU ? SIGNAL.persist : col),
    kick: P.kick,
    // [26c] le coup de zoom porte la reponse sur LA CIBLE et non sur la camera :
    // dans une foule de 400 corps, c'est le seul endroit ou elle se lit.
    punch: crit ? now + CRIT_PUNCH * 1000 : 0,
  });

  // LES ETINCELLES PARTENT DANS L'AXE DU COUP, et le cone se resserre quand il
  // porte : un coup leger eparpille, un coup lourd perfore.
  // LA MATIERE LES PLIE SANS EN AJOUTER UNE SEULE : `PALIER` garde le compte, le
  // cone et la vitesse de base — le budget de frequence ne bouge pas d'un cran —
  // et `MATIERE.touche` decide de ce qui part. Une carapace jette des eclats
  // blancs et tendus, un sac des gouttes lourdes qui gonflent, un champ des
  // motes teintees qui montent et s'attardent.
  const a0 = Math.atan2(dy, dx);
  const T = (MATIERE[MATIERE_DE[type] ?? MAT_CARAPACE] ?? MATIERE[MAT_CARAPACE]).touche;
  const teinte = T.teinte ? (ENEMY_TINT[type] ?? COMBAT.flash) : COMBAT.flash;
  const vie = (0.14 + pal * 0.03) * T.tenue;
  for (let i = 0; i < P.eclats && particles.length < PARTICLE_MAX; i++) {
    const a = a0 + (Math.random() - 0.5) * P.cone;
    const sp = (P.sp + Math.random() * (P.sp * 0.8)) * T.vite;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: vie, max: vie,
      col: teinte, size: (2 + pal * 0.5) * T.taille,
      frame: T.eclat ? fxGlow : fxWhite,
      ang: a, long: T.eclat ? 1 : 3.4 + pal * 0.8,
      drag: T.freine, lift: T.monte, grow: T.gonfle, a0: T.a0,
    });
  }
  // RIEN NE SE DETACHE D'UN CHAMP : la poussiere est de la matiere du LIEU, elle
  // suppose une coque qui s'ecaille.
  if (P.poussiere > 0 && T.debris) poussiere(x, y, a0, P.poussiere);
  // le coup lourd sort du budget de la touche : il vaut ~0,2 par seconde, donc
  // il a droit a l'onde et au noyau que le palier 0 ne peut pas payer.
  if (mien && P.shake > 0) addShake(P.shake);
  if (pal === HIT_LOURD && bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 4, max: 34, life: 0.2, t: 0.2, col: COMBAT.flash, w: 1.8 });
    if (particles.length < PARTICLE_MAX) {
      particles.push({ x, y, vx: 0, vy: 0, life: 0.07, max: 0.07,
                       col: COMBAT.blastCore, size: 15, frame: fxGlow, drag: 1 });
    }
  }
  if (crit) spawnCritShards(x, y, dx, dy);
  /* LA TRAVERSEE. Une balle qui ressort n'avait aucun retour a elle : le railgun
     et le fusil de precision traversaient une file entiere en rendant exactement
     ce que rend une balle qui s'arrete. Le client le SAIT deja — l'attribution
     par balle survivante est precisement « elle est ressortie » — donc rien ne
     s'ouvre au reseau.
     UNE SEULE PARTICULE, et c'est une LIGNE, pas une gerbe : ce qu'il faut lire
     est un axe qui continue derriere le corps, et une gerbe de plus dirait
     « plus fort » au lieu de « ca passe a travers ». */
  if (perce && particles.length < PARTICLE_MAX) {
    particles.push({
      x: x + dx * 6, y: y + dy * 6, vx: dx * 70, vy: dy * 70,
      life: 0.10, max: 0.10, col: COMBAT.flash, size: 1.7,
      ang: Math.atan2(dy, dx), long: 11, drag: 0.9,
    });
  }
}

/* LA POUSSIERE EST DE LA MATIERE DU LIEU, et la matiere du lieu est DEJA
   declaree : `skin().blocEdge` porte le beton lave de la Friche, la tole peinte
   de l'Usine, la fonte brulee de la Fonderie, le composite froid de la
   Nebuleuse. Une seule regle, quatre lectures, aucune table de plus.

   Elle part A CONTRE-SENS du coup et elle est LENTE : les etincelles disent ou
   va l'energie, la poussiere dit ce qui s'est detache. */
function poussiere(x, y, a0, n) {
  const col = skin().blocEdge;
  const nb = glActive() ? n : Math.ceil(n / 2);
  for (let i = 0; i < nb && particles.length < PARTICLE_MAX; i++) {
    const a = a0 + Math.PI + (Math.random() - 0.5) * 2.2;
    const sp = 30 + Math.random() * 55;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.34 + Math.random() * 0.2, max: 0.54,
      col, size: 5 + Math.random() * 4, frame: fxGlow,
      grow: 22, a0: 0.30, drag: 0.9,
    });
  }
}
/* LES ETINCELLES D'UN BLOCAGE GLISSENT, elles ne repartent pas dans l'axe :
   c'est ce qui separe « arretee » de « ratee ». Deux gerbes tangentes a la
   plaque, courtes, et rien qui clignote sur le corps — il n'a rien encaisse. */
export function spawnDeflect(x, y, a) {
  const ux = Math.cos(a), uy = Math.sin(a);
  const px = -uy, py = ux;
  for (let i = 0; i < 4 && particles.length < PARTICLE_MAX; i++) {
    const s = i % 2 ? 1 : -1;
    const ang = Math.atan2(py * s + uy * 0.3, px * s + ux * 0.3)
      + (Math.random() - 0.5) * 0.5;
    const sp = 190 + Math.random() * 150;
    particles.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      life: 0.16, max: 0.16, col: COMBAT.flash, size: 2.2,
      ang, long: 3.2, drag: 0.86,
    });
  }
}
/* LA CHALEUR SE VOIT PARTIR DU CANON. Un faisceau continu n'a rien qui bouge :
   ses seules variables sont la largeur et la teinte, et les deux saturent vite.
   Ce qui manquait est de la MATIERE qui s'echappe — et elle ne doit exister
   qu'en HAUT de la jauge, sinon elle dit « ca marche » au lieu de « ca chauffe ».
   La cadence d'emission est bornee par emetteur : le trace tourne a 60 Hz et
   plus, l'emission a 16. */
const FAISCEAU_SEUIL = 0.45;
const FAISCEAU_GAP = 62;
const faisceauT = new Map();
export function spawnFaisceauChaud(cle, x, y, ux, uy, chaud, col) {
  if (chaud < FAISCEAU_SEUIL) { faisceauT.delete(cle); return; }
  const now = performance.now();
  if (now - (faisceauT.get(cle) ?? 0) < FAISCEAU_GAP) return;
  faisceauT.set(cle, now);
  const k = (chaud - FAISCEAU_SEUIL) / (1 - FAISCEAU_SEUIL);
  const n = glActive() ? 1 + Math.round(k * 2) : 1;
  const px = -uy, py = ux;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const s = Math.random() < 0.5 ? -1 : 1;
    const sp = 40 + Math.random() * 90 * k;
    particles.push({
      x: x + ux * 6, y: y + uy * 6,
      vx: px * s * sp - ux * sp * 0.35, vy: py * s * sp - uy * sp * 0.35,
      life: 0.24, max: 0.24, col, size: 3 + 3 * k, frame: fxGlow,
      grow: 26, a0: 0.35 + 0.35 * k, drag: 0.9,
    });
  }
}
export const CRIT_PUNCH = 0.07;
// [26e] des ECLATS, pas un disque : la forme doit dire « perforation ». Le
// noyau chaud qui les accompagne est ce qui rend le critique lisible dans une
// foule : les eclats partent, le point reste une image de plus.
export function spawnCritShards(x, y, dx, dy) {
  const a0 = Math.atan2(dy, dx);
  const n = glActive() ? 5 : 3;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = a0 + (i - (n - 1) / 2) * 0.30 + (Math.random() - 0.5) * 0.16;
    const sp = 260 + Math.random() * 220;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.26, max: 0.26, col: SIGNAL.warn, size: 3.6,
      frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 6,
    });
  }
  if (particles.length < PARTICLE_MAX) {
    particles.push({
      x, y, vx: 0, vy: 0, life: 0.13, max: 0.13,
      col: SIGNAL.warn, size: 11, frame: fxGlow,
    });
  }
}
function flushHitQueue(now) {
  for (let i = hitQueue.length - 1; i >= 0; i--) {
    if (hitQueue[i].at > now) continue;
    const h = hitQueue[i];
    hitQueue.splice(i, 1);
    applyHit(h.id, h.x, h.y, h.dx, h.dy, h.crit, h.col, h.pal, h.type, h.perce, h.mien);
  }
}
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
      scaleX: d.gain * (1 + k * 0.18),
      scaleY: d.gain * (1 - k * 0.25),
      alpha: 1 - k * 0.5,
    });
  }
}
/* La matiere d'une creature vit dans `shared/feedback.js`, avec celle des armes.
   Ce qui reste ici est ce qu'elle ne coute PAS : les trois cases de particule
   sont deja dans l'atlas et `DEATH_BURST` distingue deja le nombre, la taille et
   la vitesse. Ce qui manquait, c'est la case et le comportement — un eclat
   anguleux qui tournoie ne peut pas dire « poche qui creve ». */
const MATIERE_DE = ENEMY_TYPES.map(matiereDe);
const FIN_DE = ENEMY_TYPES.map(finalDe);

/* LA HAUTEUR DIT LA MASSE. Elle disait l'INDEX : `1.3 - type * 0.12`, donc
   l'ordre d'arrivee dans la table. Le coureur, le plus petit corps du bestiaire,
   sonnait plus GRAVE que le fantassin, et le colosse plus AIGU que le couvain —
   l'inverse de ce qu'on voit. Le rayon est deja la, et il est juste.
   L'elite garde un cran a lui : c'est un fait notable, et un fait notable se
   distingue par la hauteur (`RENDU.md`, palier 2). ELITE_RADIUS_MUL vaut 1,18,
   trop peu pour s'entendre seul. */
const MORT_REF = 12;
const MORT_ELITE = 0.72;
function hauteurMort(e) {
  const d = ENEMY_TYPES[e.type];
  const masse = Math.pow(MORT_REF / (d?.r ?? MORT_REF), 0.55);
  return masse * (e.elite ? MORT_ELITE : 1) * chainPitch();
}

const DEATH_BURST = [
  { n: 1.00, size: 2.5, sp: 60, spread: 130, life: 0.40, flash: 1.0, cone: 7 },
  { n: 0.75, size: 2.0, sp: 150, spread: 190, life: 0.30, flash: 0.8, cone: 1.1 },
  { n: 0.50, size: 5.2, sp: 35, spread: 70, life: 0.65, flash: 1.35, cone: 7 },
  { n: 0.85, size: 2.6, sp: 45, spread: 95, life: 0.45, flash: 0.9, cone: 7 },
  { n: 1.70, size: 1.8, sp: 95, spread: 175, life: 0.35, flash: 0.85, cone: 7 },
  { n: 1.60, size: 2.2, sp: 190, spread: 240, life: 0.26, flash: 1.8, cone: 7 },
  { n: 0.55, size: 4.6, sp: 50, spread: 85, life: 0.60, flash: 1.25, cone: 7 },
  { n: 0.85, size: 2.0, sp: 80, spread: 130, life: 0.42, flash: 0.8, cone: 7 },
  { n: 1.35, size: 2.4, sp: 45, spread: 95, life: 0.60, flash: 1.15, cone: 7 },

  /* LES QUATRE DERNIERS MOURAIENT EN FANTASSIN : la table s'arretait a neuf
     entrees et `DEATH_BURST[type] ?? DEATH_BURST[0]` faisait le reste, en
     silence. Chacun meurt maintenant comme il a vecu, et le `cone` est ce qui
     porte l'intention — 7 vaut « dans toutes les directions », une valeur
     etroite projette DANS LE SENS DU DEPLACEMENT. */
  // harceleur : rapide et leger, il eclate VERS L'AVANT comme le coureur
  { n: 0.70, size: 1.9, sp: 165, spread: 200, life: 0.28, flash: 0.85, cone: 1.0 },
  // generateur : la coque se DEFAIT — peu d'eclats, gros, lents, tres lumineux
  { n: 0.45, size: 5.6, sp: 30, spread: 60, life: 0.75, flash: 1.55, cone: 7 },
  // saboteur : un chassis qui se DEMONTE, eclats nombreux et bas
  { n: 1.20, size: 2.2, sp: 55, spread: 110, life: 0.50, flash: 0.75, cone: 7 },
  // relais : le mat CEDE et l'arc se rompt — jet vertical, court et vif
  { n: 0.90, size: 2.8, sp: 130, spread: 90, life: 0.34, flash: 1.45, cone: 7 },
];
function spawnDeath(x, y, type, elite, ang = 0, crit = false, owner = 0, mat = MAT_CARAPACE) {
  if (deaths.length < DEATH_MAX) {
    deaths.push({
      x, y, type, at: performance.now(),
      ang: Math.random() * Math.PI * 2,
      gain: elite ? CFG.ELITE_RADIUS_MUL : 1,
    });
  }
  if (particles.length >= PARTICLE_MAX) return;
  const col = ENEMY_TINT[type] ?? ENEMY_TINT[0];
  const dense = glActive();
  const D = DEATH_BURST[type] ?? DEATH_BURST[0];
  const gros = crit ? 1.6 : 1;
  const n = Math.round((elite ? (dense ? 22 : 10) : (dense ? 14 : 7)) * D.n * gros);
  const taille = elite ? 1.4 : 1;
  const M = MATIERE[mat] ?? MATIERE[MAT_CARAPACE];
  // `fxShard` et `fxGlow` sont assignes a la construction de l'atlas : la case
  // se lit a l'appel, jamais dans la table.
  const frame = mat === MAT_CARAPACE ? fxShard : fxGlow;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = D.cone >= 7 ? Math.random() * Math.PI * 2
                          : ang + (Math.random() - 0.5) * D.cone;
    const sp = (D.sp + Math.random() * D.spread) * gros;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: D.life, max: D.life, col, size: D.size * taille,
      frame, ang: Math.random() * Math.PI * 2,
      spin: M.spin ? (Math.random() - 0.5) * M.spin * (2.5 / D.size) : 0,
      grow: M.grow ? M.grow * taille : 0,
      a0: M.a0, drag: M.drag,
    });
  }
  if (particles.length < PARTICLE_MAX) {
    particles.push({
      x, y, vx: 0, vy: 0, life: 0.12, max: 0.12,
      col: crit ? SIGNAL.warn : (owner && owner !== myId ? ownerColorOf(owner) ?? COMBAT.flash
                                                        : COMBAT.flash),
      size: (elite ? 20 : 13) * D.flash * gros, frame: fxGlow,
    });
  }
  // [26f] le critique qui TUE monte d'un palier : il emprunte un fragment de
  // l'onde de choc du souffle.
  if (crit && bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 8, max: 62, life: 0.26, t: 0.26, col: SIGNAL.warn, w: 2.4 });
  }
  if (elite && bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 20, max: 74, life: 0.35, t: 0.35, col: ELITE_GOLD });
  }
  finAct(x, y, type, elite);
}

/* CE QUE LA CREATURE TENAIT NE S'ARRETE PAS EN SILENCE. Quatre lignes du
   bestiaire sur treize, et c'est la condition pour que ce soit un fait notable :
   un acte de fermeture sur les treize types sortirait 20 a 60 fois par seconde,
   et cesserait d'etre une information.

   Aucune des trois formes n'ajoute de mecanique de rendu : le CHAMP est un
   `burst` dont le rayon maximal est PLUS PETIT que le rayon de depart — il se
   retracte au lieu de s'ouvrir, et c'est la seule chose a dire —, la MASSE est
   un anneau court et epais plus trois debris lents, et l'ARC est une donnee que
   `actors.js` va chercher, parce que `drawArc` vit une couche plus haut. */
export const finArcs = [];
const FIN_ARC_MAX = 6;
const FIN_ARC_MS = 260;
function finAct(x, y, type, elite) {
  const def = ENEMY_TYPES[type];
  const acte = FIN_DE[type];
  if (!acte) return;
  const gros = elite ? CFG.ELITE_RADIUS_MUL : 1;
  const R = finalRayon(def) * gros;

  if (acte === FIN_CHAMP && bursts.length < BURST_MAX) {
    // il se RETRACTE : `max` sous `r`, et l'anneau rentre vers ce qui le tenait
    bursts.push({ x, y, r: R, max: R * 0.12, life: 0.34, t: 0.34,
                  col: ENEMY_TINT[type] ?? COMBAT.flash, w: 2.4 });
    return;
  }

  if (acte === FIN_MASSE) {
    if (bursts.length < BURST_MAX) {
      bursts.push({ x, y, r: R * 0.2, max: R, life: 0.30, t: 0.30,
                    col: skin().blocEdge, w: 5 });
    }
    // ce qui tombe d'un corps lourd est LENT et RESTE : trois morceaux, pas une
    // gerbe — la gerbe appartient deja a l'eclat de type.
    const nb = glActive() ? 3 : 2;
    for (let i = 0; i < nb && particles.length < PARTICLE_MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 55 + Math.random() * 70;
      particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.62, max: 0.62, col: skin().blocEdge, size: 4.4 + Math.random() * 2,
        frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 7, drag: 0.82,
      });
    }
    return;
  }

  // L'ARC FINAL : le mat cede, et la derniere decharge part vers le corps le
  // plus proche QU'IL AURAIT PU RELIER — au-dela de sa portee, il n'y a rien a
  // rompre, et l'arc ne se dessine pas.
  if (!latest || finArcs.length >= FIN_ARC_MAX) return;
  let cx = 0, cy = 0, bd = R * R;
  for (const e of latest.enemies.values()) {
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d > 4 && d < bd) { bd = d; cx = e.x; cy = e.y; }
  }
  if (bd >= R * R) return;
  finArcs.push({ x, y, x2: cx, y2: cy, at: performance.now(), dur: FIN_ARC_MS });
}

// [4] LE FLUX D'XP. Aucune entite, aucun ramassage, aucun changement de jeu :
// l'experience reste instantanee. Un filet part du cadavre vers le joueur, et
// c'est la premiere fois que le partage d'equipe se voit.
const XP_LIFE = 0.55;
function spawnXpStream(x, y) {
  if (!latest || particles.length > PARTICLE_MAX * 0.6) return;
  let cible = null, bd = Infinity;
  for (const p of latest.players.values()) {
    if (p.downed) continue;
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) { bd = d; cible = p; }
  }
  if (!cible || bd > 900 * 900) return;
  const n = glActive() ? 2 : 1;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 60;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: XP_LIFE, max: XP_LIFE, col: SIGNAL.gain, size: 2.6,
      frame: fxGlow, vers: cible.id, drag: 1,
    });
  }
}

// [9][10][11] LE SOUFFLE EN COUCHES : chacune a SA constante de temps. Si tout
// s'estompe sur la meme courbe, ca reste un element d'interface.
export function spawnBlast(x, y, r, ampleur, S, ang = null) {
  const dense = glActive();

  // noyau : il NAIT a sa taille maximale — une montee progressive fait
  // « animation » la ou une detonation fait « matiere ».
  if (particles.length < PARTICLE_MAX) {
    particles.push({ x, y, vx: 0, vy: 0, life: 0.034, max: 0.034,
                     col: S.coeur, size: r * 0.85, frame: fxGlow, drag: 1 });
  }

  // boule de feu : trois quads decales, blanc -> feu -> bord. Un cercle parfait
  // se lit comme de l'interface, une forme irreguliere comme de la matiere.
  const boules = [
    { c: S.coeur, s: 0.62, l: 0.10 },
    { c: S.feu,   s: 0.92, l: 0.14 + 0.06 * ampleur },
    { c: S.bord,  s: 1.20, l: 0.17 + 0.09 * ampleur },
  ];
  for (const b of boules) {
    if (particles.length >= PARTICLE_MAX) break;
    const a = Math.random() * Math.PI * 2;
    const off = r * 0.13;
    particles.push({
      x: x + Math.cos(a) * off, y: y + Math.sin(a) * off,
      vx: 0, vy: 0, life: b.l, max: b.l, col: b.c,
      size: r * b.s * (0.9 + 0.35 * ampleur), frame: fxGlow,
      ang: Math.random() * Math.PI * 2, grow: r * 0.5, drag: 1,
    });
  }

  // onde de choc : elle DEPASSE le remplissage, sinon elle disparait dedans.
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: r * 0.35, max: r * (1.5 + 0.5 * ampleur),
                  life: 0.25, t: 0.25, col: S.bord, w: 2 + 2.5 * ampleur });
  }
  /* LA SECONDE ONDE N'EXISTE QU'AU-DELA D'UNE MAGNITUDE. Sur un petit souffle
     deux anneaux ne disent pas « plus gros », ils disent « deux souffles ». Elle
     est FINE, PLUS LENTE et va PLUS LOIN : c'est l'ecart entre les deux vitesses
     qui donne l'echelle, pas un rayon plus grand. */
  if (ampleur > 0.45 && bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: r * 0.15, max: r * (2.1 + 0.7 * ampleur),
                  life: 0.42, t: 0.42, col: S.coeur, w: 1.2 });
  }

  /* DEBRIS. Un souffle qui a un SENS les projette devant lui : l'obus du siege
     percute et sa matiere continue, la grenade retombe et n'a plus de sens. Le
     cone est la seule difference, et c'est celle qui separe les deux armes
     explosives a l'oeil. */
  const nd = Math.round((dense ? 7 : 3) + (dense ? 8 : 3) * ampleur);
  const cone = ang === null ? Math.PI * 2 : 1.5;
  for (let i = 0; i < nd && particles.length < PARTICLE_MAX; i++) {
    const a = ang === null ? Math.random() * Math.PI * 2
                           : ang + (Math.random() - 0.5) * cone;
    const sp = (180 + Math.random() * (260 + 320 * ampleur))
      * (ang === null ? 1 : 1.25);
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.25, max: 0.75,
      col: S.debris, size: 2.6 + 2 * Math.random(),
      frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 16,
    });
  }

  // fumee : la meme case que le halo, distinguee par son COMPORTEMENT — grosse,
  // tres transparente, lente, et elle grandit.
  const nf = dense ? 3 + Math.round(2 * ampleur) : 1;
  for (let i = 0; i < nf && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 22 + Math.random() * 30;
    particles.push({
      x: x + Math.cos(a) * r * 0.3, y: y + Math.sin(a) * r * 0.3,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.9 + 0.5 * ampleur, max: 0.9 + 0.5 * ampleur,
      col: SURFACE.line, size: r * 0.55, frame: fxGlow,
      grow: r * 0.5, a0: 0.34, drag: 0.985,
    });
  }

  if (blastMarks.length >= BLAST_MARK_MAX) blastMarks.shift();
  blastMarks.push({ x, y, r: r * 0.8, at: performance.now(), dur: 1600 + 900 * ampleur });
}

// la marque au sol : SOUS tout le reste, et elle s'efface lentement.
const BLAST_MARK_MAX = 14;
export const blastMarks = [];
export function drawBlastMarks() {
  if (blastMarks.length === 0) return;
  const now = performance.now();
  for (let i = blastMarks.length - 1; i >= 0; i--) {
    const m = blastMarks[i];
    const k = (now - m.at) / m.dur;
    if (k >= 1) { blastMarks[i] = blastMarks[blastMarks.length - 1]; blastMarks.pop(); continue; }
    if (!inView(m.x, m.y, m.r)) continue;
    ctx.fillStyle = alpha(SURFACE.void, 0.34 * (1 - k));
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * (0.85 + 0.15 * k), 0, Math.PI * 2);
    ctx.fill();
  }
}

/* LA TRAINEE DE VIF-ARGENT. La carte blessait depuis toujours, elle ne se
   voyait pas — donc elle « ne faisait rien ». Un point tous les 10 px et non un
   par image : sinon la densite de la trainee suit la frequence d'affichage. */
const DASH_MARK_MAX = 48;
const DASH_MARK_PAS = 10;
const DASH_MARK_DUR = 520;
export const dashMarks = [];
export function spawnDashMark(x, y, r, col, owner) {
  for (let i = dashMarks.length - 1; i >= 0; i--) {
    if (dashMarks[i].owner !== owner) continue;
    if ((dashMarks[i].x - x) ** 2 + (dashMarks[i].y - y) ** 2 < DASH_MARK_PAS ** 2) return;
    break;
  }
  if (dashMarks.length >= DASH_MARK_MAX) dashMarks.shift();
  dashMarks.push({ x, y, r, col, owner, at: performance.now() });
}
export function drawDashMarks() {
  if (dashMarks.length === 0) return;
  const now = performance.now();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = dashMarks.length - 1; i >= 0; i--) {
    const m = dashMarks[i];
    const k = (now - m.at) / DASH_MARK_DUR;
    if (k >= 1) { dashMarks[i] = dashMarks[dashMarks.length - 1]; dashMarks.pop(); continue; }
    if (!inView(m.x, m.y, m.r)) continue;
    const rr = m.r * (0.55 + 0.45 * (1 - k));
    ctx.fillStyle = alpha(m.col, 0.20 * (1 - k));
    ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(FX.flash, 0.26 * (1 - k) ** 2);
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// [21] l'invulnerabilite breve d'un releve doit SE VOIR.
// CHAQUE EFFET AUTOUR D'UN PERSONNAGE OCCUPE UNE BANDE DE RAYON EXCLUSIVE. La
// table vit ici, la couche la plus basse qui en a besoin : les eclats de coque
// doivent naitre exactement sur le rayon que `boss.js` dessine, et deux
// definitions du meme rayon finiraient par diverger.
// La premiere bande part de la SILHOUETTE, pas du rayon de collision : les
// tracés de classe vont jusqu'a 24 px (`sprites.js`), donc une coque a
// `PLAYER_RADIUS + 4` passait DANS le personnage au lieu de l'envelopper.
export const RING_SHIELD = CFG.PLAYER_RADIUS + 12;
export const RING_STATUS = CFG.PLAYER_RADIUS + 17;
export const RING_SKILL  = CFG.PLAYER_RADIUS + 22;
export const RING_BUFF0  = CFG.PLAYER_RADIUS + 27;

/* L'OMBRE DE CONTACT. Sans elle une entite FLOTTE : elle n'a aucune ancre au
   sol. C'est le plus fort rapport gain/cout du plan 13, et il est presque nul —
   `fx_glow` est deja dans l'atlas, la teinte noire prémultipliee donne un
   melange alpha classique, et le quad tombe dans le lot NORMAL qui existe deja.
   Aucun appel de dessin supplementaire.

   ELLE NE S'ADDITIONNE PAS : a 200 ennemis serres, 200 ombres empilees feraient
   une flaque noire. Opacite plafonnee, ecrasement vertical, decalage par la
   direction de lumiere du biome — jamais centree, sinon elle se lit comme un
   halo et non comme une ombre.

   Pas d'ombre pour un projectile : meme raison que pour la lumiere, la
   frequence. */
const OMBRE_A = 0.34;
const OMBRE_PLAT = 0.52;
/* L'APPELANT A BESOIN DE SAVOIR, et il n'a pas le droit de le demander a `gfx`.
   `drawOmbre` se garde deja toute seule, mais la passe qui l'appelle balaye la
   horde entiere : la sauter vaut la peine, et le faire avec un `gfx >= ...` chez
   l'appelant ferait de lui un SIXIEME point de lecture. Meme motif que
   `lumiereActive()`. */
export function ombresActives() { return gfx >= GFX_MEDIUM; }

export function drawOmbre(x, y, r, k = 1) {
  if (gfx < GFX_MEDIUM || !fxGlow) return;
  const d = lumDir();
  const s = (r * 2.15) / SPRITE_CELL;
  drawSprite(ctx, fxGlow, x + d[0] * r * 0.30, y + d[1] * r * 0.34, {
    scaleX: s,
    scaleY: s * OMBRE_PLAT,
    tint: SURFACE.shadow,
    alpha: OMBRE_A * k,
  });
}

// LA COQUE. Sa rupture est du VERRE : `fx_shard` est deja la matiere « eclat
// anguleux » de l'atlas, elle passe donc par le lot WebGL comme le reste — pas
// de quatrieme case, pas de chemin special.
export const shieldHit = new Map();
const SHIELD_PLATES = 9;

export function spawnShieldOn(x, y) {
  const col = POWERUP_COLOR.shield;
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 44, max: RING_SHIELD, life: 0.28, t: 0.28, col, w: 2.5 });
  }
  // les plaques CONVERGENT : la coque se ferme sur le porteur au lieu de
  // s'allumer sur place.
  for (let i = 0; i < SHIELD_PLATES && particles.length < PARTICLE_MAX; i++) {
    const a = (i / SHIELD_PLATES) * Math.PI * 2 + Math.random() * 0.2;
    const d = RING_SHIELD + 32 + Math.random() * 26;
    particles.push({
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: -Math.cos(a) * d * 2.6, vy: -Math.sin(a) * d * 2.6,
      life: 0.34, max: 0.34, col, size: 3.4,
      frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 2, drag: 0.9,
    });
  }
}

export function spawnShieldBreak(x, y) {
  const col = POWERUP_COLOR.shield;
  const dense = glActive();
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: RING_SHIELD, max: RING_SHIELD + 34,
                  life: 0.30, t: 0.30, col, w: 3 });
  }
  if (particles.length < PARTICLE_MAX) {
    particles.push({ x, y, vx: 0, vy: 0, life: 0.05, max: 0.05,
                     col: COMBAT.flash, size: 40, frame: fxGlow, drag: 1 });
  }
  // les eclats partent du BORD de la coque, pas du centre : c'est la coque qui
  // cede, pas le personnage qui explose.
  const n = dense ? 22 : 10;
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
    const sp = 150 + Math.random() * 170;
    particles.push({
      x: x + Math.cos(a) * RING_SHIELD, y: y + Math.sin(a) * RING_SHIELD,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.42, max: 0.42, col, size: 3 + Math.random() * 2.2,
      frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 9, drag: 0.93,
    });
  }
}

/* LE RAMASSAGE EST UNE CONVERGENCE, PAS UNE DETONATION. Les eclats viennent du
   sol et montent vers le porteur, l'anneau se RESSERRE : c'est le seul mouvement
   qui dise « pris » plutot que « eclate ». La FAMILLE donne le nombre, la
   vitesse et la matiere du grain, le TYPE donne la teinte — deux bonus d'une
   meme famille ne doivent pas se confondre. Le RANG ajoute un second anneau, et
   rien d'autre : « rare » se lit en portee, pas en taille de gerbe. */
export function spawnBonusPris(x, y, col, fam, rang = 0) {
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 34, max: 8, life: 0.26, t: 0.26, col, w: 2.4 });
  }
  if (rang > 0 && bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 6, max: 78, life: 0.44, t: 0.44, col, w: 1.6 });
  }
  const n = glActive() ? fam.eclats : Math.ceil(fam.eclats / 2);
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const d = 15 + Math.random() * 13;
    particles.push({
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: -Math.cos(a) * fam.vite,
      vy: -Math.sin(a) * fam.vite - fam.vite * 0.6,
      life: 0.36, max: 0.36, col, size: 3.2,
      frame: fam.cotes ? fxShard : fxGlow,
      ang: a, spin: fam.cotes ? 6 : 0, drag: 0.9,
    });
  }
}

/* UNE OCCASION PERDUE N'EST PAS UN EVENEMENT : aucun son, trois grains qui
   retombent. Ce qu'il faut lire est que la place s'est LIBEREE, pas qu'on a
   rate quelque chose. */
export function spawnBonusPerdu(x, y, col) {
  for (let i = 0; i < 3 && particles.length < PARTICLE_MAX; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 18, vy: 16 + Math.random() * 14,
      life: 0.5, max: 0.5, col, size: 2.4, frame: fxGlow, drag: 0.94,
    });
  }
}

/* L'APPARITION MONTRE OU, une fois. Un anneau qui s'ouvre coute un burst et
   aucune particule : a quatre bonus par minute, c'est le budget d'un palier 2. */
export function spawnBonusNe(x, y, col) {
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 4, max: 42, life: 0.34, t: 0.34, col, w: 1.8 });
  }
}

// LA VAGUE DE SOIN EST UN DON, PAS UNE DETONATION : tout part du centre vers
// l'exterieur et rien ne retombe. Deux constantes de temps — l'anneau freine,
// les motes filent — sinon la vague se lit comme un souffle vert.
const HEAL_MOTES = 12;
export function spawnHealWave(x, y, r) {
  const rr = r || 120;
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: rr * 0.2, max: rr * 1.08, life: 0.5, t: 0.5,
                  col: FX.heal, w: 2.6 });
  }
  if (particles.length < PARTICLE_MAX) {
    particles.push({ x, y, vx: 0, vy: 0, life: 0.22, max: 0.22,
                     col: FX.healSoft, size: 30, frame: fxGlow, drag: 1, grow: 110 });
  }
  const n = glActive() ? HEAL_MOTES : Math.floor(HEAL_MOTES / 2);
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.35;
    const sp = rr * (1.5 + Math.random() * 0.5);
    particles.push({
      x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.55, max: 0.55, col: FX.heal, size: 3.6,
      frame: fxGlow, drag: 0.88,
    });
  }
}

// LE REMPART SE MONTE. Les plaques viennent de l'exterieur et se posent SUR le
// bord — l'inverse de la coque du joueur, qui se ferme sur son porteur.
const BULWARK_PLATES_FX = 12;
export function spawnBulwark(x, y, r) {
  const rr = r || 110;
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: rr * 1.32, max: rr, life: 0.34, t: 0.34,
                  col: CLASS_COLOR.tank, w: 3.5 });
  }
  for (let i = 0; i < BULWARK_PLATES_FX && particles.length < PARTICLE_MAX; i++) {
    const a = (i / BULWARK_PLATES_FX) * Math.PI * 2;
    const d = rr + 34;
    particles.push({
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: -Math.cos(a) * 130, vy: -Math.sin(a) * 130,
      life: 0.32, max: 0.32, col: CLASS_COLOR.tank, size: 4.2,
      frame: fxShard, ang: a + Math.PI / 2, spin: 0, drag: 0.84,
    });
  }
}

function spawnRevive(x, y, col) {
  if (bursts.length < BURST_MAX) {
    bursts.push({ x, y, r: 10, max: 150, life: 0.55, t: 0.55, col, w: 3.5 });
  }
  for (let i = 0; i < 14 && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 40 + Math.random() * 90;
    const sp = 120 + Math.random() * 90;
    particles.push({
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp,
      life: 0.5, max: 0.5, col, size: 3.2, frame: fxGlow, drag: 0.94,
    });
  }
}

// [20] LE POULS D'EQUIPE : la jauge d'XP est deja commune, rien ne celebrait la
// montee de niveau comme un evenement partage. Quatre ecrans, un seul instant.
export const pulse = { t: 0, max: 0, col: SIGNAL.gain };
export function addPulse(col, dur) {
  pulse.col = col;
  pulse.max = dur;
  pulse.t = dur;
}
export function drawPulse() {
  if (pulse.t <= 0) return;
  const k = pulse.t / pulse.max;
  const bord = Math.min(CFG.VIEW_W, CFG.VIEW_H) * 0.34;
  const g = ctx.createRadialGradient(
    camera.x0 + CFG.VIEW_W / 2, camera.y0 + CFG.VIEW_H / 2,
    Math.max(1, Math.min(CFG.VIEW_W, CFG.VIEW_H) / 2 - bord * k),
    camera.x0 + CFG.VIEW_W / 2, camera.y0 + CFG.VIEW_H / 2,
    Math.hypot(CFG.VIEW_W, CFG.VIEW_H) / 2);
  g.addColorStop(0, alpha(pulse.col, 0));
  g.addColorStop(1, alpha(pulse.col, 0.30 * k * k));
  ctx.fillStyle = g;
  ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
}
export const bursts = [];
export const BURST_MAX = 24;
function stepBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    bursts[i].t -= dt;
    if (bursts[i].t <= 0) { bursts[i] = bursts[bursts.length - 1]; bursts.pop(); }
  }
}
export function drawBursts() {
  if (bursts.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const b of bursts) {
    const k = 1 - b.t / b.life;
    // l'anneau part vite et freine : c'est ce profil qui le fait lire comme un
    // souffle et non comme un cercle qui grandit.
    const e = 1 - (1 - k) * (1 - k);
    ctx.strokeStyle = alpha(b.col, (1 - k) * 0.75);
    ctx.lineWidth = (b.w ?? 3) * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + (b.max - b.r) * e, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
function pushDamage(x, y, dmg, crit = false) {
  hudDamage(x - camera.x0 + (Math.random() - 0.5) * 40, y - camera.y0 - 30,
            dmg, crit ? "crit" : "deal");
}
const DMG_AGG_MS = 200;
const DMG_THRESHOLD = 0.05;
export const dmgAgg = new Map();
function aggregateDamage(e) {
  // le critique voyage jusqu'au CHIFFRE : un coup qui vaut le double sans que
  // rien ne le dise n'existe pas pour le joueur. Un seul critique dans le lot
  // suffit a teinter le total — la couleur porte l'evenement, pas la somme.
  const crit = (e.crits ?? 0) > 0 || e.crit === true;
  const a = dmgAgg.get(e.id);
  if (a) { a.sum += e.dmg; a.x = e.x; a.y = e.y; a.crit = a.crit || crit; return; }
  dmgAgg.set(e.id, {
    x: e.x, y: e.y, sum: e.dmg, at: performance.now(), crit,
    maxHp: e.maxHp || 1,
  });
}
const SELF_AGG_MS = 200;
export const selfAgg = new Map();
function aggregateSelf(kind, e) {
  const cle = e.id + ":" + kind;
  const a = selfAgg.get(cle);
  if (a) {
    a.sum += e.dmg;
    a.x = e.x; a.y = e.y;
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
    if (Math.round(a.sum) < 1) { a.at = now; continue; }
    selfAgg.delete(cle);
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
                a.y - camera.y0 - 22, a.sum, a.crit ? "crit" : "deal");
    }
  }
}
export function stepFeedback(dt) {
  // apres `pump`, donc apres le lot : c'est ce qui permet a une chaine entiere
  // de tenir dans une seule voix.
  flushArcs();
  stepTimeWarp(dt);
  if (pulse.t > 0) pulse.t = Math.max(0, pulse.t - dt);

  if (shake.mag > 0.05) {
    shake.mag *= Math.pow(0.004, dt / 0.2);
    shake.x = (Math.random() - 0.5) * 2 * shake.mag;
    shake.y = (Math.random() - 0.5) * 2 * shake.mag;
  } else {
    shake.mag = 0; shake.x = 0; shake.y = 0;
  }

  const joueurs = latest?.players;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      if (p.zfx) zoneFx--;
      particles[i] = particles[particles.length - 1];
      particles.pop();
      continue;
    }
    if (p.vers && joueurs) {
      const c = joueurs.get(p.vers);
      if (c) {
        const dx = c.x - p.x, dy = c.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = 1900 * (1 - p.life / p.max);
        p.vx += (dx / d) * pull * dt;
        p.vy += (dy / d) * pull * dt;
        if (d < 26) p.life = Math.min(p.life, 0.06);
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const drag = Math.pow(p.drag ?? 0.90, dt * 60);
    p.vx *= drag; p.vy *= drag;
    if (p.lift) p.vy -= p.lift * dt;
    if (p.spin) p.ang += p.spin * dt;
    if (p.grow) p.size += p.grow * dt;
  }
  stepBursts(dt);

  const now = performance.now();
  if (bossMortQueue.length > 0) flushBossMort(now);
  if (hitQueue.length > 0) flushHitQueue(now);
  if (hits.size > 0) {
    for (const [id, h] of hits) if (h.until < now) hits.delete(id);
  }
  if (bouches.size > 0) {
    for (const [id, m] of bouches) {
      if (now - m.at > m.b.vie * 1000) bouches.delete(id);
    }
  }
}
export let fxWhite = 0, fxShard = 0, fxGlow = 0;
export function drawParticles() {
  if (glActive()) {
    for (const p of particles) {
      if (!inView(p.x, p.y, 40)) continue;
      const s = p.size / SPRITE_CELL;
      drawSprite(ctx, p.frame ?? fxWhite, p.x, p.y, {
        scaleX: s * (p.long ?? 1),
        scaleY: s,
        angle: p.ang ?? 0,
        tint: p.col,
        alpha: Math.max(0, p.life / p.max) * (p.a0 ?? 1),
        additive: true,
      });
    }
    return;
  }

  // [7] LE MELANGE ADDITIF. Une explosion en alpha classique est un disque
  // gris ; en additif, c'est de la lumiere. Le chemin WebGL le fait par
  // `BLEND_ADD` ; le chemin 2D ne le faisait pas du tout.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    if (!inView(p.x, p.y, 40)) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max) * (p.a0 ?? 1);
    ctx.fillStyle = p.col;
    if (p.frame === fxGlow && fxGlow) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
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

export const ZONE_FX_MAX = 600;
export let zoneFx = 0;
export const lastBossPos = { x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2 };

// [27] LE RETOUR DE TOUCHE DU BOSS. L'eclair blanc de la horde vit dans
// `flashAtlas` ; le boss est trace a la main, hors atlas, donc il n'en avait
// aucun equivalent. Ce n'etait pas un reglage trop discret, c'etait un canal
// absent — et le choix de rendu, lui, etait bon.
export const BOSS_FLASH_MS = 80;
export const bossHit = { at: 0, k: 1, dur: BOSS_FLASH_MS };
export function bossFlash(now) {
  if (bossHit.at <= 0) return 0;
  const k = 1 - (now - bossHit.at) / bossHit.dur;
  return k > 0 ? k * bossHit.k : 0;
}

/* LA TOUCHE D'UN BOSS SE MESURE EN PART DE BARRE, et elle etait PLATE : le meme
   eclair de 80 ms pour un tick de brulure et pour un rail. Le boss est la seule
   cible qu'on regarde en continu — c'est justement la que l'ecart se lit.

   MESURE, 3 graines, 4 joueurs, 10 boss tues, 12 694 instantanes ou le boss perd
   des PV : la part d'UNE barre retiree par pas de 50 ms vaut 0,01 % a la mediane,
   1,14 % au p90, 4,22 % au p99, 15 % au maximum. 2 % est donc le haut du bareme
   utile — au-dela l'eclair est deja plein.

   LA RACINE, PAS LA PROPORTION. En lineaire, 82 % des touches tombaient sur le
   plancher et tout le milieu du bareme etait vide — l'ecart ne se lisait qu'entre
   « rien » et « enorme ». La racine rend le p75 a 0,41 et le p90 a 0,76 : c'est
   la meme courbe que `poids`, et pour la meme raison.

   Le plancher a 0,25 n'est pas cosmetique : sans lui une brulure sur le boss ne
   se verrait plus du tout, et c'est souvent tout ce qui reste pendant un palier. */
const BOSS_PART_PLEIN = 0.02;
function bossTouche(e) {
  const crit = e.crit === true;
  const k = crit ? 1
    : Math.max(0.25, Math.min(1, Math.sqrt((e.part ?? 0) / BOSS_PART_PLEIN)));
  bossHit.at = performance.now();
  bossHit.k = k;
  bossHit.dur = 50 + 90 * k;
  // meme grammaire que la horde, meme clef de limiteur : le palier d'un coup ne
  // change pas de langue selon la cible.
  if (crit) playSound("critique", { key: "impact" });
  else if (k >= 1) playSound("impactLourd", { key: "impact", claim: true });
  else playSound("impact");
}

// le coup ordinaire sur le boss : deux traits blancs dans l'axe, la meme matiere
// qu'une touche legere de la horde. Les eclats ambres restent au critique.
function bossEclats(x, y, dx, dy, crit) {
  if (crit) { spawnCritShards(x, y, dx, dy); return; }
  const a0 = Math.atan2(dy, dx);
  for (let i = 0; i < 2 && particles.length < PARTICLE_MAX; i++) {
    const a = a0 + (Math.random() - 0.5) * 1.2;
    const sp = 120 + Math.random() * 110;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.15, max: 0.15, col: COMBAT.flash, size: 2.2,
      ang: a, long: 3.6,
    });
  }
}

/* LA MORT D'UN BOSS NE PRODUISAIT RIEN. `_killBoss` met `this.boss` a `null` et
   n'emet aucun effet, aucune zone, aucun son : le corps disparaissait entre deux
   images. C'etait le seul moment de palier 3 du jeu sans aucun budget, alors que
   c'est celui que la manche entiere prepare.

   CINQ ECHEANCES, ET C'EST L'ETALEMENT QUI FAIT L'EVENEMENT — tout au meme
   instant ne fait qu'un flash. Les anneaux s'elargissent et RALENTISSENT, le
   souffle vient en premier, la queue grave arrive quand l'image est finie. */
const BOSS_MORT_R = 150;
const BOSS_BLAST = { coeur: COMBAT.blastCore, feu: BOSS.barLow,
                     bord: BOSS.barRing, debris: BOSS.skin };
const BOSS_MORT = [
  { t: 0,    r: 0.6, w: 5,   blast: 1, shake: 10, ping: 1, son: "bossBrise" },
  { t: 0.09, r: 1.0, w: 4 },
  { t: 0.20, r: 1.5, w: 3,   debris: 16, ping: 1 },
  { t: 0.36, r: 2.1, w: 2,   fumee: 6 },
  { t: 0.62, r: 2.8, w: 1.4, son: "bossQueue" },
];
export const bossMortQueue = [];
function bossMort(x, y) {
  const now = performance.now();
  // le hitstop appartient aux barres de boss ; la derniere barre en est une, et
  // c'est la seule qui n'en avait pas parce que `_killBoss` n'emet pas `barre`.
  addHitstop(0.14);
  addPulse(COMBAT.flash, 0.7);
  for (let i = 0; i < BOSS_MORT.length; i++) {
    bossMortQueue.push({ at: now + BOSS_MORT[i].t * 1000, i, x, y });
  }
}
function flushBossMort(now) {
  for (let i = bossMortQueue.length - 1; i >= 0; i--) {
    if (bossMortQueue[i].at > now) continue;
    const q = bossMortQueue[i];
    bossMortQueue[i] = bossMortQueue[bossMortQueue.length - 1];
    bossMortQueue.pop();
    jouerBossMort(q);
  }
}
function jouerBossMort(q) {
  const E = BOSS_MORT[q.i];
  const r = BOSS_MORT_R * E.r;
  if (E.blast) spawnBlast(q.x, q.y, BOSS_MORT_R, 1, BOSS_BLAST);
  if (bursts.length < BURST_MAX) {
    const vie = 0.30 + E.r * 0.12;
    bursts.push({ x: q.x, y: q.y, r: r * 0.3, max: r, life: vie, t: vie,
                  col: BOSS.barRing, w: E.w });
  }
  if (E.shake) addShake(E.shake);
  if (E.ping) addGridPing(q.x, q.y, r);
  if (E.son) playSound(E.son);
  const dense = glActive();
  if (E.debris) {
    const n = dense ? E.debris : Math.ceil(E.debris / 2);
    for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 220 + Math.random() * 420;
      particles.push({
        x: q.x, y: q.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.7 + Math.random() * 0.4, max: 1.1,
        col: BOSS.skin, size: 3.4 + Math.random() * 3,
        frame: fxShard, ang: a, spin: (Math.random() - 0.5) * 12,
      });
    }
  }
  if (E.fumee) {
    const n = dense ? E.fumee : Math.ceil(E.fumee / 2);
    for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 26 + Math.random() * 46;
      particles.push({
        x: q.x + Math.cos(a) * r * 0.25, y: q.y + Math.sin(a) * r * 0.25,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1.2 + Math.random() * 0.6, max: 1.8,
        col: SURFACE.line, size: BOSS_MORT_R * 0.45, frame: fxGlow,
        grow: 70, a0: 0.30, drag: 0.985,
      });
    }
  }
}

export function setPARTICLE_MAX(v) { PARTICLE_MAX = v; }
export function setFxWhite(v) { fxWhite = v; }
export function setFxShard(v) { fxShard = v; }
export function setFxGlow(v) { fxGlow = v; }
export function setZoneFx(v) { zoneFx = v; }
