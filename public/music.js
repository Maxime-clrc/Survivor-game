/* ===========================================================================
   MUSIQUE
   Bande son synthetisee, AUCUN fichier — meme regle qu'audio.js : c'est la
   seule facon de garder le zero dependance et le zero build du depot. Un
   sequenceur planifie des notes en avance sur l'horloge du contexte audio ;
   chaque voix est un oscillateur, un filtre et une enveloppe.

   Ce module ne touche ni au DOM ni au reseau. Il ne possede NI contexte NI
   sortie : il emprunte ceux d'audio.js (`audioContext`, `musicBus`), donc la
   coupure et le volume globaux l'emportent toujours — et un faux AudioContext
   pose dans un script de mesure le fait jouer en silence.

   LE LANGAGE EST CELUI DE LA TECHNO : kick aux quatre temps, basse en
   contretemps, charleys, arpege acide sous un passe-bas resonant. Ce n'est pas
   un choix de gout mais de MECANIQUE : la techno est une musique de COUCHES,
   et des couches s'empilent ou se retirent sans jamais casser le pas — c'est
   exactement ce qu'il faut pour suivre une difficulte qui monte en continu.

   L'INTENSITE EST CONTINUE (0 a 1), pas une humeur discrete : le jeu la
   pousse (`setMusicIntensity`), la musique GLISSE vers la cible — montee
   franche, descente paresseuse, comme la pression du jeu elle-meme. Chaque
   pas planifie relit l'intensite lissee : aucun fondu a orchestrer, les
   couches naissent et meurent au seuil qui les concerne.

   LA STRUCTURE RESPIRE : cycle de seize mesures dont les deux dernieres sont
   un BREAK — kick et charleys se taisent, la nappe et l'acide restent, un
   riser annonce la reprise quand la pression est haute. Une musique qui ne
   s'arrete jamais cesse d'etre entendue ; c'est la pause qui rend le retour
   du kick physique.

   ---------------------------------------------------------------------------
   CE MODULE EST AUSSI L'AIGUILLAGE de la bande son. Depuis que les pistes en
   fichiers existent (`tracks.js`), il y a DEUX bandes son pour un seul
   reglage : `startMusic`, `stopMusic`, `setMusicIntensity` et `setMusicScene`
   restent le point de passage unique du reste du client, qui n'a donc jamais a
   savoir laquelle joue. Un aiguillage ici plutot qu'un `if` chez chacun des
   appelants — meme raison que `_hurt()` cote simulation.

   Les deux entrees ne portent pas la meme information, et ce n'est pas une
   maladresse : la synthese lit une INTENSITE continue (elle empile des
   couches), les pistes lisent une SCENE discrete (elles changent de morceau).
   Un fichier ne sait pas retirer son kick, et une intensite ne dit pas quel
   morceau mettre. Le client pousse les deux a chaque image ; celle qui ne
   concerne pas la bande son active est ignoree sans rien couter.
   =========================================================================== */

/* Relatif et non absolu : le navigateur resout les deux pareil (les modules
   publics sont servis a la racine), mais seul le relatif permet d'importer ce
   fichier dans un script de mesure Node avec un faux AudioContext. */
import { audioContext, getAudioSource, musicBus } from "./audio.js";
import { setTrackFallback, setTrackScene, startTracks, stopTracks } from "./tracks.js";

export const MUSIC_CFG = {
  BPM: 122,              // le pas de la techno — il ne change JAMAIS
  /* Le sequenceur se reveille toutes les TICK_MS et planifie tout ce qui doit
     sonner dans les LOOKAHEAD prochaines secondes. 1,2 s d'avance couvrent
     largement la gigue d'un setInterval — y compris son etranglement a 1 s
     dans un onglet en arriere-plan, ou la musique continue proprement. */
  LOOKAHEAD: 1.2,
  TICK_MS: 100,
  /* Sous TOUT SOUND_GAIN : la musique est un fond, jamais un signal. Le tir le
     plus discret du jeu (0,15) doit encore passer devant le kick. */
  GAIN: 0.11,

  BARS: 16,              // le cycle : quatorze mesures pleines, deux de break
  BREAK_BARS: 2,
  STEPS_PER_BAR: 16,     // double-croches

  /* Glissement de l'intensite, par seconde. La montee est plus franche que la
     descente : le danger arrive d'un coup, le soulagement s'installe — une
     descente rapide ferait retomber la musique au premier repit d'une vague
     qui n'est pas finie. */
  RAMP_UP: 0.35,
  RAMP_DOWN: 0.10,
};

const STEPS = MUSIC_CFG.BARS * MUSIC_CFG.STEPS_PER_BAR;

/* Harmonie. Une boucle de quatre accords en la mineur, et une variante sombre
   qui prend le relais quand l'intensite depasse 0,7 : la cadence phrygienne
   Am G F E — la meme tonique, donc la bascule ne fait jamais une fausse note.
   Les valeurs sont des FREQUENCES de fondamentale (octave 2), les voix montent
   par multiplication. */
const ROOT = [110.00, 87.31, 65.41, 98.00];       // Am  F  C  G
const ROOT_DARK = [110.00, 98.00, 87.31, 82.41];  // Am  G  F  E
const THIRD = [1.189, 1.26, 1.26, 1.26];          // m3 puis M3
const THIRD_DARK = [1.189, 1.26, 1.26, 1.189];

let target = 0.05;         // intensite demandee par le jeu
let level = 0.05;          // intensite lissee, celle que la partition lit
let running = false;
let timer = null;
let step = 0;
let nextAt = 0;
let lastTick = 0;
let scheduled = 0;         // compteur pour la campagne de mesure

const stepDur = () => 60 / MUSIC_CFG.BPM / 4;

/* L'intensite est POUSSEE par le jeu, bornee ici : le client la calcule depuis
   l'etat (vague, boss, repit) et n'a pas a connaitre le lissage. */
export function setMusicIntensity(v) {
  if (Number.isFinite(v)) target = Math.max(0, Math.min(1, v));
}

export function getMusicIntensity() { return level; }

export function musicStats() { return { running, level, target, scheduled, step }; }

/* --- l'aiguillage -----------------------------------------------------------
   Quatre fonctions publiques, deux bandes son. Rien d'autre du client ne
   connait `tracks.js`. */

let scene = "horde";     // la scene courante, poussee par la boucle de rendu
let started = false;     // la bande son a-t-elle ete demandee

/* Une piste introuvable rend la main a la synthese. C'est ce qui permet aux
   fichiers d'etre le DEFAUT : un deploiement sans `public/assets/` sonne
   comme avant au lieu de se taire, et le joueur n'a rien a comprendre.

   Le drapeau tient pour la SESSION : sans lui, la prochaine entree en manche
   retenterait les platines, echouerait de la meme facon, et le joueur y
   perdrait deux secondes de silence a chaque fois — un dossier absent au
   premier essai l'est encore au deuxieme. Le REGLAGE, lui, n'est pas reecrit :
   c'est un repli, pas un choix ; un rechargement de page retente. */
let tracksBroken = false;
setTrackFallback(() => {
  tracksBroken = true;
  if (started) startSynth();
});

export function startMusic() {
  started = true;
  route();
  return true;
}

export function stopMusic() {
  started = false;
  stopSynth();
  stopTracks();
}

/* LA SCENE : « menu », « horde » ou « boss ». Poussee a chaque image par la
   boucle de rendu, comme l'intensite — d'ou la sortie immediate a scene
   inchangee, qui est le chemin normal. */
export function setMusicScene(name) {
  const s = name === "boss" ? "boss" : name === "menu" ? "menu" : "horde";
  if (s === scene) return;
  scene = s;
  if (started) route();
}

/* Bascule de source, depuis les reglages. `route()` arrete lui-meme celle qui
   ne doit pas jouer : sans ca, un aller-retour dans le menu laisserait les
   deux jouer ensemble, et rien dans le module ne les separerait ensuite. */
export function refreshMusicSource() {
  if (started) route();
  else { stopSynth(); stopTracks(); }
}

/* L'AIGUILLAGE PROPREMENT DIT, seul endroit qui decide laquelle joue.

   LES PISTES NE JOUENT QU'EN MANCHE. Hors manche — hub, salon, bilan — c'est
   la synthese qui reprend, y compris en source « pistes ». Ce n'est pas une
   exception decorative : la synthese a ete ECRITE pour ce moment-la (nappe
   seule, acide clairseme, aucune percussion sous 0,15 d'intensite), elle
   s'installe sans jamais demander qu'on l'ecoute, et elle ne se repete pas —
   on passe bien plus de temps a lire un salon qu'a traverser un segment. Une
   piste composee, elle, veut etre entendue : elle a un debut, un refrain et
   une fin, et elle les rejoue en boucle pendant qu'on choisit sa classe.

   Le croisement est gratuit et c'est ce qui le rend acceptable : les notes
   deja planifiees par le sequenceur finissent seules (une mesure au plus, soit
   deux secondes, exactement la duree du fondu d'entree des pistes), et
   `stopTracks` rend la main en une seconde pendant que la nappe s'installe sur
   son attaque lente. Aucune des deux ne coupe l'autre net. */
function route() {
  const pistes = getAudioSource() === "pistes" && !tracksBroken;
  if (!pistes || scene === "menu") {
    stopTracks();
    startSynth();
    return;
  }
  stopSynth();
  // `startTracks` rend false s'il tourne deja : c'est alors un simple
  // changement de morceau (horde <-> boss), pas un demarrage.
  if (!startTracks(scene)) setTrackScene(scene);
}

/* Demarre le sequenceur. Appele apres initAudio(), donc apres le geste
   utilisateur qui debloque le contexte — le clic « Rejoindre » est deja au bon
   endroit. Sans contexte, on ne fait rien : la musique n'est jamais une raison
   de bloquer le jeu. */
function startSynth() {
  const ac = audioContext();
  if (!ac || running) return running;
  running = true;
  step = 0;
  nextAt = ac.currentTime + 0.1;
  lastTick = ac.currentTime;
  timer = setInterval(tick, MUSIC_CFG.TICK_MS);
  return true;
}

function stopSynth() {
  if (!running) return;
  running = false;
  clearInterval(timer);
  timer = null;
  // Les notes deja planifiees finissent seules — la plus longue vit une
  // mesure, soit deux secondes.
}

function tick() {
  const ac = audioContext();
  if (!ac || !running) return;

  /* Le lissage vit ICI, sur le temps reel du tick : la partition lit `level`
     au moment de planifier, donc une montee se propage en une double-croche
     sans qu'aucune voix deja lancee ne bouge. */
  const dt = Math.max(0, ac.currentTime - lastTick);
  lastTick = ac.currentTime;
  const rate = target > level ? MUSIC_CFG.RAMP_UP : MUSIC_CFG.RAMP_DOWN;
  const d = target - level;
  level += Math.sign(d) * Math.min(Math.abs(d), rate * dt);

  while (nextAt < ac.currentTime + MUSIC_CFG.LOOKAHEAD) {
    scheduleStep(step, nextAt);
    step = (step + 1) % STEPS;
    nextAt += stepDur();
  }
}

/* --- la partition -----------------------------------------------------------

   Tout est PREDICAT DE PAS et SEUIL D'INTENSITE. Rien d'aleatoire : la boucle
   doit etre identique a chaque tour pour s'installer comme un fond — une
   musique qui surprend est une musique qu'on ecoute, et l'attention appartient
   a l'arene. La variation vient du jeu, qui pousse l'intensite.

   L'empilement, du plus doux au plus stressant :
     0,00  nappe seule, acide clairseme et sourd — le salon
     0,15  la basse entre, un kick discret aux temps forts
     0,35  kick aux quatre temps, charley en contretemps — la manche s'installe
     0,55  acide en croches, charley ouvert, le filtre s'ouvre
     0,70  la variante sombre prend l'harmonie, double-croches
     0,85  stabs, charleys en doubles, filtre grand ouvert — le boss
   Chaque voix scale AUSSI son gain sur l'intensite : un seuil seul ferait
   apparaitre les couches d'un bloc, l'oreille doit les sentir monter. */

function scheduleStep(s, t) {
  const bar = Math.floor(s / MUSIC_CFG.STEPS_PER_BAR);
  const inBar = s % MUSIC_CFG.STEPS_PER_BAR;
  const i = level;
  const dark = i > 0.7;
  const roots = dark ? ROOT_DARK : ROOT;
  const thirds = dark ? THIRD_DARK : THIRD;
  const chord = bar % 4;
  const root = roots[chord];
  const third = thirds[chord];

  /* LE BREAK : les deux dernieres mesures du cycle. Percussions et basse se
     taisent, la nappe et l'acide respirent — et sur la derniere mesure, un
     riser remonte vers le drop si la pression le justifie. C'est la pause
     demandee : sans elle le kick cesse d'exister au bout d'une minute. */
  const inBreak = bar >= MUSIC_CFG.BARS - MUSIC_CFG.BREAK_BARS;
  const lastBar = bar === MUSIC_CFG.BARS - 1;

  // NAPPE : deux dents de scie desaccordees sous un passe-bas dont
  // l'ouverture suit l'intensite. Le sol de la musique, jamais absente.
  if (inBar === 0) {
    const cutoff = 420 + i * 900;
    padVoice(root * 2, t, stepDur() * 16, cutoff);
    padVoice(root * 2 * third, t, stepDur() * 16, cutoff);
  }

  // ACIDE : l'arpege sous filtre resonant, la voix qui rend la techno
  // stressante. Densite par seuil, ouverture et morsure par intensite, motif
  // fondamentale-tierce-quinte-octave. Pendant le break il reste seul en
  // croches sourdes : la pause n'est pas un silence.
  const acidOn = inBreak ? inBar % 2 === 0
    : i < 0.30 ? inBar % 4 === 0
    : i < 0.70 ? inBar % 2 === 0
    : true;
  if (acidOn) {
    const motif = [1, third, 1.5, 2][(Math.floor(inBar / 2) + bar) % 4];
    const cutoff = (inBreak ? 220 : 260) + i * 2600
      + Math.sin(s * 1.7) * 380 * i;      // le wobble deterministe du 303
    acid(root * 4 * motif, t, Math.max(150, cutoff), 4 + i * 9,
      MUSIC_CFG.GAIN * (0.16 + i * 0.22) * (inBreak ? 0.7 : 1));
  }

  if (inBreak) {
    // RISER : derniere mesure du cycle, une dent de scie qui glisse d'une
    // octave sous un filtre qui s'ouvre — l'annonce du drop. Seulement quand
    // la pression est reelle : un riser sur un salon calme mentirait.
    if (lastBar && inBar === 0 && i > 0.40) {
      riser(root * 2, t, stepDur() * 16, i);
    }
    scheduled++;
    return;
  }

  // KICK. Discret aux temps forts des 0,15, quatre au plancher des 0,35 —
  // c'est LE seuil qui fait basculer du fond sonore a la pulsation.
  const kickOn = i < 0.15 ? false
    : i < 0.35 ? (inBar === 0 || inBar === 8)
    : inBar % 4 === 0;
  if (kickOn) kick(t, 0.45 + i * 0.55);

  // BASSE en CONTRETEMPS — la pompe : elle sonne exactement entre deux kicks,
  // c'est elle qui donne le mouvement. Double-croche pointee en haute
  // intensite pour durcir le roulement.
  const bassOn = i < 0.10 ? false
    : i < 0.60 ? inBar % 4 === 2
    : (inBar % 4 === 2 || inBar % 8 === 7);
  if (bassOn) bass(root, t, stepDur() * 1.6, 0.5 + i * 0.5);

  // CHARLEYS : fermes en contretemps des 0,35, ouverts a la croche 6 des
  // 0,55, doubles-croches fantomes au-dela de 0,85.
  if (i >= 0.35 && inBar % 4 === 2) hat(t, false, 0.4 + i * 0.6);
  if (i >= 0.55 && inBar % 8 === 6) hat(t, true, 0.5 + i * 0.5);
  if (i >= 0.85 && inBar % 2 === 1) hat(t, false, 0.22);

  // STAB : l'accord plaque des moments les plus durs, deux fois par mesure,
  // en syncope. C'est la couche « boss » — elle n'existe pas en dessous.
  if (i >= 0.75 && (inBar === 6 || inBar === 14)) {
    stab([root * 4, root * 4 * third, root * 6], t, i);
  }

  scheduled++;
}

/* --- timbres ----------------------------------------------------------------
   Volontairement sourds : tout ce qui est brillant appartient aux sons de
   jeu. Chaque gain est une fraction de MUSIC_CFG.GAIN, lui-meme sous le son
   le plus discret du jeu. */

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

function padVoice(freq, t, dur, cutoff) {
  const { ac, g, kill } = voice(t, dur);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cutoff;
  f.connect(g);
  for (const detune of [-7, 7]) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    if (o.detune) o.detune.value = detune;
    o.connect(f);
    kill(o);
  }
  // Attaque lente : la nappe s'installe, elle ne frappe pas.
  env(g, t, dur * 0.25, dur, MUSIC_CFG.GAIN * 0.28);
}

/* Le kick techno : un sinus qui chute de 150 a 42 Hz en un dixieme. Le punch
   est dans la vitesse de la chute, pas dans le volume. */
function kick(t, punch) {
  const { ac, g, kill } = voice(t, 0.18);
  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
  o.connect(g);
  env(g, t, 0.003, 0.18, MUSIC_CFG.GAIN * 0.95 * punch);
  kill(o);
}

/* La basse en contretemps : une dent de scie sous un passe-bas ferme, courte —
   on doit la sentir pousser, jamais l'ecouter chanter. */
function bass(freq, t, dur, k) {
  const { ac, g, kill } = voice(t, dur);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 340;
  f.connect(g);
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq;
  o.connect(f);
  env(g, t, 0.008, dur, MUSIC_CFG.GAIN * 0.7 * k);
  kill(o);
}

/* Charley en carre aigu plutot qu'en bruit : le tampon de bruit vit dans
   audio.js, et un charley n'a pas besoin de mieux. Ouvert = plus long. */
function hat(t, open, k) {
  const dur = open ? 0.09 : 0.025;
  const { ac, g, kill } = voice(t, dur);
  const o = ac.createOscillator();
  o.type = "square";
  o.frequency.value = open ? 5400 : 6800;
  o.connect(g);
  env(g, t, 0.002, dur, MUSIC_CFG.GAIN * 0.15 * k);
  kill(o);
}

/* L'acide : UNE dent de scie, un passe-bas resonant, une enveloppe seche.
   C'est le cutoff et le Q — passes par l'appelant, donc par l'intensite — qui
   font passer la meme note du murmure au cri. */
function acid(freq, t, cutoff, q, peak) {
  const { ac, g, kill } = voice(t, 0.14);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(cutoff, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff * 0.45), t + 0.12);
  f.Q.value = q;
  f.connect(g);
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq;
  o.connect(f);
  env(g, t, 0.004, 0.14, peak);
  kill(o);
}

/* Le stab : trois dents de scie plaquees, une croche, filtre mi-ouvert. */
function stab(freqs, t, i) {
  const { ac, g, kill } = voice(t, 0.22);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900 + i * 1400;
  f.connect(g);
  for (const freq of freqs) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.connect(f);
    kill(o);
  }
  env(g, t, 0.005, 0.22, MUSIC_CFG.GAIN * 0.30);
}

/* Le riser : une octave montee en une mesure sous un filtre qui s'ouvre.
   L'annonce du drop — il transforme la reprise du kick en evenement. */
function riser(freq, t, dur, i) {
  const { ac, g, kill } = voice(t, dur);
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(300 + i * 3200, t + dur);
  f.connect(g);
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 2, t + dur);
  o.connect(f);
  env(g, t, dur * 0.5, dur, MUSIC_CFG.GAIN * 0.30 * i);
  kill(o);
}
