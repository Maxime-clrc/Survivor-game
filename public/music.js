/* ===========================================================================
   MUSIQUE
   Bande son synthetisee, AUCUN fichier — meme regle qu'audio.js : c'est la
   seule facon de garder le zero dependance et le zero build du depot. Un
   sequenceur planifie des notes en avance sur l'horloge du contexte audio ;
   chaque note est un oscillateur et une enveloppe, comme les sons de jeu.

   Ce module ne touche ni au DOM ni au reseau. Il ne possede NI contexte NI
   sortie : il emprunte ceux d'audio.js (`audioContext`, `musicBus`), donc la
   coupure et le volume globaux l'emportent toujours — et un faux AudioContext
   pose dans un script de mesure le fait jouer en silence, comme game_state.js
   se simule sans serveur.

   TROIS HUMEURS et une seule boucle harmonique : calme (salon, bilan), vague
   (manche), boss. Le tempo ne change JAMAIS — c'est la densite et le registre
   qui montent, sinon chaque transition casse le pas de l'auditeur au moment
   precis ou il a besoin de continuite. L'humeur est relue a CHAQUE pas
   planifie : une transition prend effet en une double-croche, sans fondu a
   gerer ni file d'attente.
   =========================================================================== */

/* Relatif et non absolu : le navigateur resout les deux pareil (les modules
   publics sont servis a la racine), mais seul le relatif permet d'importer ce
   fichier dans un script de mesure Node avec un faux AudioContext. */
import { audioContext, musicBus } from "./audio.js";

export const MUSIC_CFG = {
  BPM: 116,
  /* Le sequenceur se reveille toutes les TICK_MS et planifie tout ce qui doit
     sonner dans les LOOKAHEAD prochaines secondes. 300 ms d'avance couvrent
     largement la gigue d'un setInterval — y compris son etranglement a 1 s
     dans un onglet en arriere-plan, ou la musique continue proprement. */
  LOOKAHEAD: 1.2,
  TICK_MS: 100,
  /* Sous TOUT SOUND_GAIN : la musique est un fond, jamais un signal. Le tir le
     plus discret du jeu (0,15) doit encore passer devant la basse. */
  GAIN: 0.11,
  STEPS: 64,             // 4 mesures de 16 double-croches
  FADE: 0.6,             // fondu de coupure, en secondes
};

/* Harmonie. Deux boucles de quatre accords en la mineur — la meme tonique
   partout, pour que le passage d'une humeur a l'autre ne fasse jamais une
   fausse note : calme et vague tournent sur Am F C G, le boss descend sur
   Am G F E, la cadence phrygienne qui porte la tension.
   Les valeurs sont des FREQUENCES de fondamentale (octave 2), les voix
   montent par multiplication — pas de table de gammes, l'accord suffit. */
const ROOT = [110.00, 87.31, 65.41, 98.00];       // Am  F  C  G
const ROOT_BOSS = [110.00, 98.00, 87.31, 82.41];  // Am  G  F  E
// Tierces et quintes de chaque accord, en ratios depuis la fondamentale :
// mineur pour Am et E(phrygien traite mineur), majeur pour F, C, G.
const THIRD = [1.189, 1.26, 1.26, 1.26];          // m3 puis M3
const THIRD_BOSS = [1.189, 1.26, 1.26, 1.189];

let mood = "calme";        // "calme" | "vague" | "boss"
let running = false;
let timer = null;
let step = 0;
let nextAt = 0;
let scheduled = 0;         // compteur pour la campagne de mesure

const stepDur = () => 60 / MUSIC_CFG.BPM / 4;

export function setMusicMood(m) {
  if (m === "calme" || m === "vague" || m === "boss") mood = m;
}

export function getMusicMood() { return mood; }

export function musicStats() { return { running, mood, scheduled, step }; }

/* Demarre le sequenceur. Appele apres initAudio(), donc apres le geste
   utilisateur qui debloque le contexte — le clic « Rejoindre » est deja au bon
   endroit. Sans contexte, on ne fait rien et on le dit : l'appelant peut
   reessayer, la musique n'est jamais une raison de bloquer le jeu. */
export function startMusic() {
  const ac = audioContext();
  if (!ac || running) return running;
  running = true;
  step = 0;
  nextAt = ac.currentTime + 0.1;
  const bus = musicBus();
  if (bus) bus.gain.setValueAtTime(bus.gain.value, ac.currentTime);
  timer = setInterval(tick, MUSIC_CFG.TICK_MS);
  return true;
}

export function stopMusic() {
  if (!running) return;
  running = false;
  clearInterval(timer);
  timer = null;
  /* Les notes deja planifiees finissent seules — la plus longue vit une
     mesure, soit deux secondes. Pas de fondu de bus ici : il porte le volume
     choisi par le joueur, l'ecraser le perdrait au prochain demarrage. */
}

function tick() {
  const ac = audioContext();
  if (!ac || !running) return;
  while (nextAt < ac.currentTime + MUSIC_CFG.LOOKAHEAD) {
    scheduleStep(step, nextAt);
    step = (step + 1) % MUSIC_CFG.STEPS;
    nextAt += stepDur();
  }
}

/* --- planification d'un pas -----------------------------------------------

   Toute la partition tient dans ces predicats de pas. Rien d'aleatoire : la
   boucle doit etre la meme a chaque tour pour s'installer comme un fond — une
   musique qui surprend est une musique qu'on ecoute, et l'attention appartient
   a l'arene. La variation vient du jeu, qui change l'humeur. */

function scheduleStep(s, t) {
  const bar = Math.floor(s / 16);      // 0..3 : l'accord de la mesure
  const inBar = s % 16;                // 0..15 : la double-croche
  const boss = mood === "boss";
  const roots = boss ? ROOT_BOSS : ROOT;
  const thirds = boss ? THIRD_BOSS : THIRD;
  const root = roots[bar];
  const third = thirds[bar];

  // NAPPE : deux dents de scie desaccordees sous un passe-bas, une par
  // mesure. C'est le sol de la musique, presente dans les trois humeurs.
  if (inBar === 0) {
    pad(root * 2, t, stepDur() * 16, boss ? 900 : 620);
    pad(root * 2 * third, t, stepDur() * 16, boss ? 900 : 620);
  }

  // BASSE. Calme : une ronde par mesure. Vague : des croches. Boss : une
  // syncope — c'est elle qui fait courir.
  const bassOn = mood === "calme" ? inBar === 0
    : mood === "vague" ? inBar % 2 === 0
    : (inBar % 8 === 0 || inBar % 8 === 3 || inBar % 8 === 6);
  if (bassOn) {
    bass(root, t, mood === "calme" ? stepDur() * 12 : stepDur() * 1.8);
  }

  // PERCUSSION. Rien en calme — le salon n'a pas de pouls. Vague : un kick
  // aux temps forts. Boss : quatre au plancher, plus un souffle en contretemps.
  if (mood === "vague" && (inBar === 0 || inBar === 8)) kick(t);
  if (boss) {
    if (inBar % 4 === 0) kick(t);
    if (inBar % 4 === 2) hat(t);
  }

  // ARPEGE : fondamentale, tierce, quinte, octave sur le motif 0-1-2-1.
  // Calme : une note par temps, seulement les mesures impaires — un carillon
  // qui laisse le salon respirer. Vague : une par croche. Boss : la meme
  // grille mais une octave plus bas, plus mordante.
  const arpOn = mood === "calme" ? (bar % 2 === 1 && inBar % 4 === 0)
    : inBar % 2 === 0;
  if (arpOn) {
    const motif = [1, third, 1.5, third][Math.floor(inBar / 4) % 4];
    const oct = boss ? 4 : 8;
    arp(root * oct * motif, t, boss);
  }
  scheduled++;
}

/* --- timbres ----------------------------------------------------------------
   Quatre recettes, volontairement sourdes : tout ce qui est brillant
   appartient aux sons de jeu. Chaque gain est une fraction de MUSIC_CFG.GAIN,
   qui est lui-meme sous le son le plus discret du jeu. */

function env(g, t, attack, dur, peak) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function voice(t, dur) {
  const ac = audioContext();
  const g = ac.createGain();
  g.connect(musicBus());
  return { ac, g, kill: node => { node.start(t); node.stop(t + dur + 0.05); } };
}

function pad(freq, t, dur, cutoff) {
  const { ac, g, kill } = voice(t, dur);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cutoff;
  f.connect(g);
  for (const detune of [-6, 6]) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    if (o.detune) o.detune.value = detune;
    o.connect(f);
    kill(o);
  }
  // Attaque lente : la nappe s'installe, elle ne frappe pas.
  env(g, t, dur * 0.25, dur, MUSIC_CFG.GAIN * 0.30);
}

function bass(freq, t, dur) {
  const { ac, g, kill } = voice(t, dur);
  const o = ac.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq;
  o.connect(g);
  env(g, t, 0.01, dur, MUSIC_CFG.GAIN * 0.9);
  kill(o);
}

function kick(t) {
  const { ac, g, kill } = voice(t, 0.16);
  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  o.connect(g);
  env(g, t, 0.004, 0.16, MUSIC_CFG.GAIN * 0.8);
  kill(o);
}

function hat(t) {
  // Un souffle tres court en carre aigu plutot que du bruit : le bruit blanc
  // vit dans audio.js avec son tampon, et un charley n'a pas besoin de mieux.
  const { ac, g, kill } = voice(t, 0.03);
  const o = ac.createOscillator();
  o.type = "square";
  o.frequency.value = 6200;
  o.connect(g);
  env(g, t, 0.002, 0.03, MUSIC_CFG.GAIN * 0.16);
  kill(o);
}

function arp(freq, t, boss) {
  const { ac, g, kill } = voice(t, 0.16);
  const o = ac.createOscillator();
  o.type = boss ? "sawtooth" : "triangle";
  o.frequency.value = freq;
  o.connect(g);
  env(g, t, 0.006, 0.16, MUSIC_CFG.GAIN * (boss ? 0.32 : 0.38));
  kill(o);
}
