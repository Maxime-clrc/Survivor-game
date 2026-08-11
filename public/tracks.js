/* ===========================================================================
   PISTES AUDIO
   La bande son EN FICHIERS, alternative a la synthese de `music.js` : le
   dossier `waves/` pour la horde, `boss/` pour les combats de boss.

   Elle ne remplace pas `music.js`, elle se met a cote — le joueur choisit dans
   les reglages (`survivor.audio.source`, tenu par `audio.js`). Le depot est a
   zero dependance et zero build, et il le reste : ce sont des fichiers servis
   tels quels, pas une bibliotheque. La synthese demeure le chemin par defaut,
   donc le jeu continue de sonner sans qu'un seul octet d'asset soit present.

   Ce module ne possede NI contexte NI sortie : il emprunte ceux d'`audio.js`
   (`audioContext`, `musicBus`), donc la coupure et le volume globaux
   l'emportent toujours — exactement comme `music.js`.

   DES ELEMENTS `<audio>`, PAS DES `AudioBuffer`. Une piste de six minutes
   decodee en PCM pese une soixantaine de mega-octets en memoire, et il y en a
   cinq : `decodeAudioData` sur tout le dossier coute plus cher que l'atlas de
   sprites entier. Un `HTMLAudioElement` diffuse au fil de l'eau, se met en
   boucle tout seul, et `createMediaElementSource` le fait entrer dans le
   graphe audio comme n'importe quelle voix — donc sous le bus de musique.

   DEUX PLATINES ET UN FONDU CROISE. Une seule platine imposerait une coupure
   nette au changement de scene, ce qui est precisement ce qu'on ne veut pas :
   l'entree du boss doit REMPLACER la horde sans qu'un silence ne s'ouvre. Le
   fondu est a PUISSANCE CONSTANTE (sin/cos et non deux rampes lineaires) —
   deux rampes droites creusent un creux de 3 dB au milieu du croisement, qu'on
   entend comme un trou.
   =========================================================================== */

import { audioContext, musicBus } from "./audio.js";

export const TRACK_CFG = {
  /* Crete d'une platine, SOUS le bus de musique (lui-meme sous le master).
     Les fichiers sont masterises fort — pres de 0 dBFS — la ou la synthese
     plafonne a 0,11 : sans cet abattement, basculer sur les pistes triplerait
     le volume de la bande son a reglage identique. Mesure a l'oreille contre
     `MUSIC_CFG.GAIN`, c'est un reglage et non une constante de simulation. */
  GAIN: 0.42,
  /* Le fondu croise. Deux secondes : sous une seconde le remplacement
     s'entend comme une coupure, au-dela de trois on entend les deux morceaux
     jouer ensemble assez longtemps pour que les deux tempos se battent. */
  FADE: 2.0,
  /* Reveil du surveillant de fin de piste. Un `<audio>` n'a pas d'evenement
     « il me reste deux secondes » ; `timeupdate` ne bat qu'a 4 Hz et se tait
     dans un onglet en arriere-plan. Un intervalle est plus simple et plus sur,
     et 500 ms suffisent pour armer un fondu de deux secondes. */
  WATCH_MS: 500,
  /* Delai de secours avant de croiser sans attendre `canplay`. Huit secondes :
     assez pour qu'une piste de six mega-octets arrive sur une connexion
     ordinaire, assez court pour qu'une entree de boss ne reste pas indefiniment
     sur la musique de horde si le fichier manque. */
  READY_MS: 8000,
};

const BASE = "/assets/musics";

/* LE MANIFESTE EST ECRIT, pas decouvert. Un navigateur ne sait pas lister un
   dossier, et faire produire l'index par le serveur ajouterait une route, un
   aller-retour au demarrage et un mode de panne — pour une liste qui change
   une fois par lot. On ajoute un fichier ici en meme temps qu'on le depose. */
const TRACKS = {
  horde: [
    "waves/Chrome Grid.mp3",
    "waves/Neon Run Protocol.mp3",
    "waves/Chrome Overdrive.mp3",
    "waves/Iron Choir March.mp3",
  ],
  boss: [
    "boss/Couronne de Nuée.mp3",
  ],
};

/* Les noms portent des espaces et des accents. `encodeURIComponent` segment
   par segment et non sur le chemin entier : il encoderait la barre oblique. */
function urlOf(rel) {
  return `${BASE}/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

let decks = null;        // [{ el, gain }, { el, gain }]
let cur = -1;            // platine active, -1 si aucune
let scene = "";          // "horde" | "boss"
let rot = 0;             // rang courant dans la liste de horde
let running = false;
let watch = 0;
let fading = 0;          // horodatage de fin du fondu en cours

export function tracksStats() {
  return { running, scene, cur, rot, playing: decks?.[cur]?.el?.src ?? "" };
}

/* Le module est chargeable sans navigateur — un script de mesure importe
   `music.js`, qui importe ce fichier. Sans `Audio`, tout devient un no-op. */
function ready() {
  return typeof Audio !== "undefined" && audioContext() !== null;
}

function build() {
  if (decks || !ready()) return decks;
  const ac = audioContext();
  decks = [0, 1].map(() => {
    const el = new Audio();
    /* `crossOrigin` bien qu'on serve tout depuis la meme origine : sans lui,
       une future mise derriere un CDN rendrait `createMediaElementSource`
       silencieux (le graphe recoit du zero, sans erreur) — c'est un piege
       connu qui ne se voit qu'en production. */
    el.crossOrigin = "anonymous";
    el.preload = "none";
    const gain = ac.createGain();
    gain.gain.value = 0;
    ac.createMediaElementSource(el).connect(gain);
    gain.connect(musicBus());
    return { el, gain };
  });
  return decks;
}

/* Fondu a PUISSANCE CONSTANTE. La somme des carres des deux courbes vaut 1 a
   chaque instant, donc le niveau percu ne bouge pas pendant le croisement. */
function ramp(param, from, to, at, dur) {
  const n = 24;
  const curve = new Float32Array(n);
  const up = to > from;
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const k = up ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2);
    curve[i] = from + (to - from) * (up ? k : 1 - k);
  }
  param.cancelScheduledValues(at);
  try { param.setValueCurveAtTime(curve, at, dur); }
  catch { param.value = to; }      // courbe deja en cours : on tranche
}

/* Bascule vers `rel`, en croisant depuis la platine active. `loop` distingue
   les deux usages : un combat de boss dure ce qu'il dure et sa piste doit
   tenir, une piste de horde cede la place a la suivante quand elle finit.

   LE FONDU N'EST ARME QU'UNE FOIS LA PISTE PRETE (`canplay`), et c'est le
   point qui fait toute la difference a l'usage : une piste pese plusieurs
   mega-octets, donc lancer les deux rampes a l'instant du basculement fait
   descendre l'ancienne pendant que la nouvelle telecharge encore — on entend
   un trou de deux secondes, c'est-a-dire exactement la coupure que le fondu
   existe pour supprimer. Le delai de secours evite l'inverse : une piste qui
   n'arrive jamais bloquerait la bande son sur le morceau precedent.

   `seq` protege l'enchainement rapide (entree de boss pendant qu'une rotation
   de horde s'arme) : seul le dernier appel a le droit de croiser, sinon deux
   platines montent ensemble et rien ne les separe ensuite. */
let seq = 0;

/* LE REPLI. `tracks.js` ne peut pas rappeler `music.js` — ce serait le cycle
   d'import que le depot interdit — donc l'aiguillage POSE son repli ici, sur
   le modele de `setReconnecter(connect)` cote couche 0. Sans lui, un dossier
   `assets/` absent laisserait la bande son muette au lieu de retomber sur la
   synthese, et c'est precisement ce qui autorise les pistes comme defaut. */
let onFail = null;
export function setTrackFallback(fn) { onFail = fn; }

function fail() {
  if (!onFail) { stopTracks(); return; }
  const fn = onFail;
  onFail = null;              // une seule fois : on ne rejoue pas la bascule
  stopTracks();
  fn();
}

function crossTo(rel, loop) {
  if (!ready()) return;
  build();
  const next = (cur + 1) % 2;
  const from = cur >= 0 ? decks[cur] : null;
  const to = decks[next];
  const mine = ++seq;

  to.el.preload = "auto";
  to.el.loop = !!loop;
  to.el.src = urlOf(rel);

  let armed = false;
  const go = () => {
    if (armed || mine !== seq || !running) return;
    armed = true;
    clearTimeout(guard);
    const ac = audioContext();
    if (!ac) return;
    const t = ac.currentTime;

    /* `play()` rend une promesse rejetee quand le navigateur refuse : on ne la
       laisse pas remonter en erreur non rattrapee — la musique n'est jamais
       une raison de casser quoi que ce soit. */
    const p = to.el.play();
    if (p && p.catch) p.catch(() => { /* geste utilisateur manquant */ });

    ramp(to.gain.gain, 0, TRACK_CFG.GAIN, t, TRACK_CFG.FADE);
    if (from) {
      ramp(from.gain.gain, from.gain.gain.value, 0, t, TRACK_CFG.FADE);
      /* On ne coupe l'element qu'APRES le fondu, jamais a l'instant du
         basculement : une pause immediate rendrait le fondu sortant muet et le
         croisement redeviendrait une coupure.

         Le differe verifie que la platine n'a pas ETE REPRISE entre-temps : il
         n'y en a que deux, donc deux croisements espaces de moins de deux
         secondes — une entree de boss juste apres une rotation de piste —
         ramenent la sortante en position active, et la minuterie du premier
         croisement couperait alors le morceau qui vient de commencer. */
      setTimeout(() => {
        if (running && decks && decks[cur] === from) return;
        try { from.el.pause(); } catch { /* deja libere */ }
      }, (TRACK_CFG.FADE + 0.1) * 1000);
    }
    cur = next;
    fading = t + TRACK_CFG.FADE;
  };

  const guard = setTimeout(go, TRACK_CFG.READY_MS);
  if (to.el.readyState >= 3) go();
  else {
    to.el.addEventListener("canplay", go, { once: true });
    /* Fichier absent, type MIME refuse, decodage impossible : on ne laisse pas
       la minuterie de secours croiser vers du silence. */
    to.el.addEventListener("error", () => {
      if (mine !== seq || armed) return;
      clearTimeout(guard);
      fail();
    }, { once: true });
  }
}

function nextHorde() {
  const list = TRACKS.horde;
  const rel = list[rot % list.length];
  rot = (rot + 1) % list.length;
  return rel;
}

/* LA SCENE EST POUSSEE PAR LE JEU, comme l'intensite de la synthese : le
   client la deduit de son etat (manche, boss) et n'a pas a connaitre les
   platines. Un appel par image, donc la sortie a scene inchangee est le
   chemin normal et doit rester gratuite. */
export function setTrackScene(name) {
  const s = name === "boss" ? "boss" : "horde";
  if (s === scene) return;
  scene = s;
  if (!running) return;
  crossTo(s === "boss" ? TRACKS.boss[0] : nextHorde(), s === "boss");
}

export function startTracks(name) {
  if (running || !ready()) return false;
  running = true;
  scene = name === "boss" ? "boss" : "horde";
  crossTo(scene === "boss" ? TRACKS.boss[0] : nextHorde(), scene === "boss");
  watch = setInterval(tick, TRACK_CFG.WATCH_MS);
  return true;
}

export function stopTracks() {
  if (!running) return;
  running = false;
  clearInterval(watch);
  watch = 0;
  if (!decks) return;
  const ac = audioContext();
  const t = ac ? ac.currentTime : 0;
  for (const d of decks) {
    if (ac) ramp(d.gain.gain, d.gain.gain.value, 0, t, TRACK_CFG.FADE * 0.5);
    const el = d.el;
    setTimeout(() => { try { el.pause(); } catch { /* deja libere */ } },
               TRACK_CFG.FADE * 500 + 100);
  }
  cur = -1;
  scene = "";
}

/* Enchainement des pistes de horde. On arme le fondu AVANT la fin — un
   croisement declenche sur `ended` commencerait par un silence de deux
   secondes, c'est-a-dire l'inverse d'un enchainement. La garde `fading`
   evite de rearmer pendant qu'un croisement est deja en cours. */
function tick() {
  if (!running || !decks || cur < 0) return;
  const ac = audioContext();
  if (!ac || ac.currentTime < fading) return;
  const el = decks[cur].el;

  /* RATTRAPAGE D'AUTOPLAY. `play()` part depuis le rappel `canplay` et non
     depuis le gestionnaire de clic : la plupart des navigateurs l'acceptent
     (l'activation utilisateur est remanente une fois la page touchee), mais
     pas tous, et un refus est silencieux — la promesse est simplement rejetee.
     On reessaie donc a chaque reveil : le prochain geste du joueur, quel qu'il
     soit, aura leve l'interdiction. Sans ca, une bande son refusee au premier
     essai ne revient jamais. */
  if (el.paused) {
    const p = el.play();
    if (p && p.catch) p.catch(() => { /* toujours refuse : on retentera */ });
    return;
  }

  if (el.loop) return;
  const d = el.duration;
  // `duration` vaut NaN tant que les metadonnees ne sont pas la.
  if (!Number.isFinite(d) || d <= 0) return;
  if (d - el.currentTime <= TRACK_CFG.FADE) crossTo(nextHorde(), false);
}
