/* ===========================================================================
   AUDIO
   Synthese WebAudio, AUCUN fichier : c'est la seule facon de garder le zero
   dependance et le zero build du depot. Chaque son est un oscillateur (ou du
   bruit) et une enveloppe, une dizaine de lignes chacun.

   Ce module ne touche ni au DOM ni au reseau — il ne connait que le contexte
   audio et un nom de son. C'est ce qui permet de l'importer tel quel dans un
   script de mesure avec un faux AudioContext, comme on importe game_state.js
   pour mesurer l'equilibrage.
   =========================================================================== */

export const AUDIO_CFG = {
  // Un MEME son ne se rejoue pas avant 40 ms. A 200 ennemis et une cadence a
  // 0,05 s il y a cinquante declenchements dans la meme image : sans ce
  // garde-fou c'est un mur de bruit, et le contexte sature avant meme d'etre
  // desagreable.
  SAME_COOLDOWN: 0.04,
  // Seize voix simultanees. Au-dela, les PLUS ANCIENNES sont coupees : une
  // voix qui commence porte l'information, une voix qui finit ne porte plus
  // que sa queue de reverberation.
  MAX_VOICES: 16,
  // Coupure d'urgence d'une voix volee : 25 ms de fondu, sinon le clic de
  // troncature s'entend plus que le son lui-meme.
  STEAL_FADE: 0.025,
  MASTER: 0.55,
  /* ETOUFFEMENT DE LA MUSIQUE quand un menu s'ouvre PAR-DESSUS la partie —
     choix de carte, marchand, pause, fenetre de build. Ce sont les moments ou
     l'on LIT, et la bande son y devient le seul son present : le combat s'est
     tu, elle reste au niveau qu'elle avait sous les explosions.
     0,45, soit environ −7 dB : « un peu », pas une coupure — la musique doit
     continuer de tenir la tension pendant qu'on choisit, sinon la manche se
     coupe en deux.
     Descente franche et remontee lente, comme le lissage d'intensite et pour
     la meme raison : on veut que le menu se pose tout de suite, et que le
     retour au jeu ne claque pas. */
  MUSIC_DUCK: 0.45,
  DUCK_DOWN: 0.30,
  DUCK_UP: 0.70,
};

/* Hierarchie de volume. Les annonces de mecanique et l'alerte de boss passent
   DEVANT tout, les impacts sont un fond discret. Sans cette echelle,
   l'information qui decide du combat se noie dans le tapis des impacts — et
   c'est exactement l'inverse de ce qu'on cherche. */
export const SOUND_GAIN = {
  alerte: 1.0,
  boss: 0.9,
  niveau: 0.8,
  bonus: 0.6,
  mort: 0.4,
  impact: 0.25,
  /* L'INTERFACE est basse par construction : c'est le seul son du jeu qui se
     declenche sans qu'on ait rien fait — traverser un ecran de haut en bas en
     survole une dizaine. Au niveau d'un impact il deviendrait le son le plus
     present d'une soiree ; sous le tir il ne s'entendrait plus hors combat, ou
     il est seul. Entre les deux, donc. */
  menu: 0.18,
  tir: 0.15,
};

/* ---------------------------------------------------------------------------
   Limitation de voix
   Sortie dans sa propre classe pour etre mesurable sans contexte audio : la
   campagne de mesure du lot lui envoie cinquante declenchements dans la meme
   image et verifie le plafond, ce qu'on ne peut pas faire en ecoutant.
   --------------------------------------------------------------------------- */
export class VoiceLimiter {
  constructor(cfg = AUDIO_CFG) {
    this.cfg = cfg;
    this.voices = [];          // { key, endsAt, stop }
    this.lastAt = new Map();   // nom du son -> horodatage du dernier depart
    this.peak = 0;             // pic de voix simultanees, pour la mesure
    this.dropped = 0;          // refus par recharge
    this.stolen = 0;           // voix coupees par le plafond
  }

  /* Retourne false si le son est refuse — l'appelant n'a alors rien construit,
     ce qui est tout l'interet : on ne paie pas la creation de l'oscillateur. */
  admit(key, now) {
    const last = this.lastAt.get(key);
    if (last !== undefined && now - last < this.cfg.SAME_COOLDOWN) {
      this.dropped++;
      return false;
    }
    this.lastAt.set(key, now);
    return true;
  }

  add(key, now, endsAt, stop) {
    // On purge d'abord les voix eteintes : sans ca le plafond se remplirait de
    // sons deja termines et couperait des voix qui, elles, jouent encore.
    this.voices = this.voices.filter(v => v.endsAt > now);
    while (this.voices.length >= this.cfg.MAX_VOICES) {
      const old = this.voices.shift();
      this.stolen++;
      try { old.stop(); } catch { /* voix deja libree par le navigateur */ }
    }
    this.voices.push({ key, endsAt, stop });
    if (this.voices.length > this.peak) this.peak = this.voices.length;
  }

  get active() { return this.voices.length; }
}

/* ---------------------------------------------------------------------------
   Contexte
   --------------------------------------------------------------------------- */

let ac = null;
let master = null;
let musicG = null;
let noiseBuf = null;
const limiter = new VoiceLimiter();

// Reglages, memorises comme le pseudo. La coupure est un booleen separe du
// volume : couper puis retablir doit rendre le volume qu'on avait choisi, pas
// zero.
let volume = readNumber("survivor.audio.vol", 0.7);
let muted = readNumber("survivor.audio.mute", 0) === 1;
/* Volume de la MUSIQUE, separe des sons de jeu : la bande son est un fond
   qu'on regle — ou qu'on coupe — sans toucher aux signaux qui decident du
   combat. Il s'applique sur un bus dedie SOUS le master : la coupure et le
   volume globaux emportent donc aussi la musique, jamais l'inverse. */
let musicVolume = readNumber("survivor.audio.musicVol", 0.5);

/* LA SOURCE AUDIO : « pistes » (les fichiers de `public/assets/musics/`, le
   defaut) ou « synthe » (tout est calcule, le chemin d'origine). Un seul
   reglage pour les DEUX familles — la bande son de `tracks.js` et les
   echantillons de cette palette — parce qu'ils forment un meme essai : revenir
   en arriere doit se faire d'un clic et tout rendre a la synthese, pas la
   moitie.

   Le defaut est « pistes » PARCE QUE le repli est automatique : un fichier
   absent ou illisible ramene la synthese tout seul — l'echantillon par son
   test sur le tampon charge, la musique par le rappel d'echec de `tracks.js`.
   Sans ce repli, un defaut sur les fichiers rendrait le jeu muet chez qui ne
   deploie pas `public/assets/`, ce que la regle « le depot doit sonner entier
   sans un seul asset » interdit. */
let source = readText("survivor.audio.source", "pistes") === "synthe"
  ? "synthe" : "pistes";

function readNumber(key, fallback) {
  if (typeof localStorage === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readText(key, fallback) {
  if (typeof localStorage === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

function store(key, value) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(key, String(value)); } catch { /* mode prive */ }
}

/* Les navigateurs exigent un geste utilisateur : le clic « Rejoindre » est
   deja au bon endroit. Appele une seconde fois, `initAudio` se contente de
   reprendre un contexte suspendu — c'est le cas apres un changement d'onglet. */
export function initAudio() {
  const Ctor = typeof globalThis !== "undefined"
    ? (globalThis.AudioContext || globalThis.webkitAudioContext)
    : null;
  if (!Ctor) return false;
  if (!ac) {
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = muted ? 0 : volume * AUDIO_CFG.MASTER;
    master.connect(ac.destination);
    musicG = ac.createGain();
    musicG.gain.value = musicVolume * duck;
    musicG.connect(master);
    noiseBuf = makeNoise(ac);
  }
  if (ac.state === "suspended" && ac.resume) ac.resume();
  if (source === "pistes") loadSamples();
  return true;
}

/* ---------------------------------------------------------------------------
   Echantillons
   La regle « aucun fichier » du module portait sur le zero dependance et le
   zero build, et elle tient toujours : un echantillon est un fichier SERVI
   TEL QUEL, il n'ajoute ni paquet ni etape. Ce qu'elle protege vraiment, c'est
   qu'un chargement rate ne fasse jamais taire le jeu — d'ou le repli
   systematique sur la recette synthetisee, ici comme en cas d'echec.

   Les trois nombres de `SAMPLES` sont MESURES sur le fichier, pas devines :
   `laser shot.wav` dure 925 ms dont 40 ms de silence en tete et plus rien
   d'audible apres 260 ms, avec une crete a −9 dBFS. Le decalage evite un tir
   qui repond quarante millisecondes trop tard — c'est perceptible sur une
   cadence a six coups par seconde ; la coupure evite que six queues de laser
   se recouvrent en permanence ; le gain compense l'ecart de crete avec le
   carre synthetise, sans quoi le tir en fichier s'entendrait trois fois moins
   fort a reglage identique. */
export const SAMPLES = {
  tir: { url: "/assets/musics/effects/laser shot.wav",
         offset: 0.035, dur: 0.26, gain: 2.4 },
};

const buffers = new Map();
const loading = new Set();

export function loadSamples() {
  if (!ac || typeof fetch !== "function") return;
  for (const [name, spec] of Object.entries(SAMPLES)) {
    if (buffers.has(name) || loading.has(name)) continue;
    loading.add(name);
    fetch(spec.url)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(buf => ac.decodeAudioData(buf))
      .then(decoded => { buffers.set(name, decoded); })
      .catch(() => { /* fichier absent : la recette synthetisee reprend la main */ })
      .finally(() => loading.delete(name));
  }
}

export function sampleReady(name) { return buffers.has(name); }

/* Un echantillon suit exactement le contrat des autres briques : il rend
   { end, stop }, donc le plafond de voix et la recharge par nom s'appliquent
   sans une ligne de plus. La queue courte (`fadeOut` sur les 30 derniers
   millisecondes) n'est pas decorative : couper un PCM net produit un clic de
   discontinuite, exactement celui que `STEAL_FADE` evite ailleurs. */
function sample(name, gain) {
  const buf = buffers.get(name);
  const spec = SAMPLES[name];
  const t0 = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  const dur = Math.min(spec.dur, Math.max(0.02, buf.duration - spec.offset));
  g.gain.setValueAtTime(Math.max(0.0002, gain), t0);
  g.gain.setValueAtTime(Math.max(0.0002, gain), t0 + Math.max(0, dur - 0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(g); g.connect(master);
  src.start(t0, spec.offset, dur + 0.02);
  return { end: t0 + dur, stop: () => fadeOut(g, src, t0) };
}

export function setAudioSource(kind) {
  source = kind === "pistes" ? "pistes" : "synthe";
  store("survivor.audio.source", source);
  if (source === "pistes") loadSamples();
}

export function getAudioSource() { return source; }

/* Acces du module de musique, et de lui seul : le contexte et le bus dedie.
   `music.js` construit ses propres oscillateurs mais ne possede ni contexte ni
   sortie — deux contextes audio se disputeraient le materiel, et un bus hors
   du master echapperait a la coupure. */
export function audioContext() { return ac; }
export function musicBus() { return musicG; }

export function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(1, v));
  store("survivor.audio.musicVol", musicVolume);
  applyMusicGain(0);
}

export function getMusicVolume() { return musicVolume; }

/* L'etouffement vit sur le BUS de musique et non dans une des deux bandes son :
   c'est la seule facon qu'il couvre la synthese ET les pistes sans qu'aucune
   des deux ait a le savoir — un sequenceur ne sait pas baisser des notes deja
   planifiees, et un `<audio>` a son propre volume qu'on ne veut pas melanger
   au reglage du joueur. Il n'est PAS memorise : c'est un etat de l'instant,
   pas un reglage. */
let duck = 1;

export function setMusicDuck(on) {
  const k = on ? AUDIO_CFG.MUSIC_DUCK : 1;
  if (k === duck) return;
  const monte = k > duck;
  duck = k;
  applyMusicGain(monte ? AUDIO_CFG.DUCK_UP : AUDIO_CFG.DUCK_DOWN);
}

export function getMusicDuck() { return duck; }

/* Une RAMPE et non une affectation : un bus de musique qui saute de 0,5 a 0,22
   en une image s'entend comme un decrochage, exactement le clic de troncature
   que `STEAL_FADE` evite sur une voix. Duree nulle pour le curseur de volume,
   qu'on veut voir repondre au doigt. */
function applyMusicGain(dur) {
  if (!musicG) return;
  const cible = musicVolume * duck;
  if (!ac || dur <= 0) { musicG.gain.value = cible; return; }
  const now = ac.currentTime;
  musicG.gain.cancelScheduledValues(now);
  musicG.gain.setValueAtTime(musicG.gain.value, now);
  musicG.gain.linearRampToValueAtTime(cible, now + dur);
}

export function audioReady() { return ac !== null; }

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  store("survivor.audio.vol", volume);
  applyGain();
}

export function setMuted(m) {
  muted = !!m;
  store("survivor.audio.mute", muted ? 1 : 0);
  applyGain();
}

export function getVolume() { return volume; }
export function isMuted() { return muted; }

function applyGain() {
  if (!master) return;
  master.gain.value = muted ? 0 : volume * AUDIO_CFG.MASTER;
}

// Compteurs de la campagne de mesure. Ils ne servent a rien en jeu et ne
// coutent qu'un increment : c'est le prix d'une mesure qu'on peut refaire.
export function audioStats() {
  return { peak: limiter.peak, dropped: limiter.dropped, stolen: limiter.stolen,
           active: limiter.active };
}

export function resetAudioStats() {
  limiter.peak = 0; limiter.dropped = 0; limiter.stolen = 0;
}

/* Une seconde de bruit blanc, construite UNE fois. Regenerer 44 100 flottants
   a chaque impact coutait plus cher que tout le reste du son reuni. */
function makeNoise(context) {
  const n = Math.floor(context.sampleRate * 1);
  const buf = context.createBuffer(1, n, context.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/* ---------------------------------------------------------------------------
   Briques
   --------------------------------------------------------------------------- */

/* Un oscillateur, une enveloppe, une eventuelle glissade de hauteur.

   `attack` par defaut a 4 ms : a zero on entend le clic de discontinuite,
   au-dela de 10 ms un tir de 25 ms n'a plus de percussion du tout. C'est le bon
   reglage pour tout ce qui FRAPPE — donc pour tout le combat. Un son doux va
   dans l'autre sens : une attaque de 4 ms sur une sinusoide s'entend encore
   comme un coup d'ongle, et c'est exactement ce qu'on ne veut pas d'un retour
   de menu. Le parametre est donc ouvert, comme celui de `noise`, plutot que
   d'ecrire une seconde brique. */
function tone({ freq, to = 0, dur, type = "sine", gain, delay = 0, attack = 0.004 }) {
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  return { end: t0 + dur, stop: () => fadeOut(g, osc, t0) };
}

/* Du bruit blanc passe dans un filtre. Le filtre EST le timbre : passe-bande
   aigu pour un impact sec, passe-bas pour un souffle d'explosion.

   `attack` etend la brique au lieu d'ouvrir une seconde fonction : a zero — le
   defaut, donc tous les appelants d'avant — le bruit part a plein volume, ce
   qui est exactement ce qu'on veut d'un impact ou d'une detonation. Un SOUFFLE
   va dans l'autre sens : il s'ouvre. Sans montee, le souffle de lancement
   commencait par un claquement, c'est-a-dire par le contraire de ce qu'il
   annonce. */
function noise({ dur, type = "bandpass", freq, to = 0, q = 1, gain, delay = 0, attack = 0 }) {
  const t0 = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (to > 0) f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
  const g = ac.createGain();
  if (attack > 0) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
  } else {
    g.gain.setValueAtTime(Math.max(0.0002, gain), t0);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
  return { end: t0 + dur, stop: () => fadeOut(g, src, t0) };
}

function fadeOut(g, node, t0) {
  const now = ac.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + AUDIO_CFG.STEAL_FADE);
  try { node.stop(now + AUDIO_CFG.STEAL_FADE); } catch { /* deja arrete */ }
  void t0;
}

/* ---------------------------------------------------------------------------
   Palette
   Chaque recette rend { end, stop } : la premiere valeur sert au plafond de
   voix, la seconde a la coupure des plus anciennes.
   --------------------------------------------------------------------------- */

const PALETTE = {
  /* Impulsion carree tres courte. C'est le son le plus frequent du jeu, donc
     le plus bas de la hierarchie : on doit le sentir sans jamais l'ecouter.

     En source « pistes », l'echantillon de laser prend sa place — et seulement
     s'il est CHARGE : le test porte sur le tampon et non sur le reglage, sinon
     un fichier absent ou un decodage rate rendrait le tir muet, c'est-a-dire
     supprimerait le retour du geste le plus frequent du jeu. */
  tir: () => (source === "pistes" && buffers.has("tir"))
    ? sample("tir", SOUND_GAIN.tir * SAMPLES.tir.gain)
    : tone({ freq: 900, to: 700, dur: 0.025, type: "square", gain: SOUND_GAIN.tir }),

  // Bruit filtre de 40 ms : la confirmation d'impact. Sans elle, tirer dans la
  // foule ne donne aucun retour et on ne sait pas si on touche.
  impact: () => noise({ dur: 0.04, freq: 2400, to: 1200, q: 1.2, gain: SOUND_GAIN.impact }),

  // Bruit descendant. La hauteur varie selon le type d'ennemi : c'est gratuit
  // et ca suffit a distinguer une piétaille d'un gros a l'oreille.
  mort: (o) => noise({ dur: 0.12, type: "lowpass", freq: 1400 * (o.pitch ?? 1),
                       to: 200 * (o.pitch ?? 1), gain: SOUND_GAIN.mort }),

  // Deux sinus montants : le seul son franchement agreable du jeu, et c'est
  // voulu — c'est la recompense.
  bonus: (o) => {
    const a = tone({ freq: 620, dur: 0.09, gain: SOUND_GAIN.bonus * 0.8 });
    tone({ freq: 930, dur: 0.11, gain: SOUND_GAIN.bonus, delay: 0.07 });
    void o;
    return { end: a.end + 0.18, stop: a.stop };
  },

  // Arpege de trois notes.
  niveau: () => {
    const a = tone({ freq: 523, dur: 0.10, type: "triangle", gain: SOUND_GAIN.niveau });
    tone({ freq: 659, dur: 0.10, type: "triangle", gain: SOUND_GAIN.niveau, delay: 0.09 });
    tone({ freq: 880, dur: 0.16, type: "triangle", gain: SOUND_GAIN.niveau, delay: 0.18 });
    return { end: a.end + 0.34, stop: a.stop };
  },

  // Sinus grave a deux temps. Il passe devant tout le reste : c'est la
  // condition pour que l'Oracle soit comprehensible a la premiere rencontre.
  annonce: (o) => {
    const g = SOUND_GAIN.alerte * (o.level === 0 ? 1 : 0.7);
    const f = o.level === 0 ? 196 : 165;
    const a = tone({ freq: f, dur: 0.13, type: "sine", gain: g });
    tone({ freq: f * 1.5, dur: 0.16, type: "sine", gain: g, delay: 0.14 });
    return { end: a.end + 0.30, stop: a.stop };
  },

  /* OUVERTURE D'EVENEMENT (lot U). Une quinte montante, tenue, avec un souffle
     dessous : c'est un TITRE, pas un impact — un evenement dure une minute, il
     ne commente rien de ponctuel. Il devait se distinguer d'`annonce`, qui est
     un compte a rebours avant coup, et de `boss`, qui est une entree ; d'ou le
     sens MONTANT, le seul des trois.

     `haut` distingue les deux familles sans ouvrir une entree par evenement :
     une consigne (`chasse`) sonne une quarte plus haut qu'un avertissement, ce
     qui suffit a dire « celle-la demande une action » sans quatre sons a
     equilibrer. */
  evenement: (o) => {
    const f = o.haut ? 220 : 165;
    const a = tone({ freq: f, to: f * 1.5, dur: 0.5, type: "triangle",
                     gain: SOUND_GAIN.alerte * 0.55 });
    tone({ freq: f * 2, dur: 0.4, type: "sine",
           gain: SOUND_GAIN.alerte * 0.3, delay: 0.12 });
    noise({ dur: 0.5, type: "lowpass", freq: 700, to: 240,
            gain: SOUND_GAIN.mort * 0.45 });
    return { end: a.end + 0.2, stop: a.stop };
  },

  /* GEYSER (lot V). Un souffle qui MONTE, la ou l'explosion descend : c'est la
     seule chose qui les distingue a l'oreille, et il le faut — un geyser qui
     sonnerait comme une detonation de zone ferait chercher un boss. Il vit dans
     la hierarchie des BONUS et non des alertes : il est previsible, on l'a vu
     venir, et le rappeler au volume d'une consigne serait mentir sur son
     importance. */
  geyser: () => {
    const a = noise({ dur: 0.42, type: "bandpass", freq: 380, to: 1500,
                      gain: SOUND_GAIN.bonus * 0.5 });
    tone({ freq: 90, to: 210, dur: 0.34, type: "sine", gain: SOUND_GAIN.mort * 0.5 });
    return { end: a.end, stop: a.stop };
  },

  /* MUR ABATTU (lot V). Sec, mat, sans queue : de la matiere qui cede. Il ne
     doit surtout pas ressembler a une mort d'ennemi — on vient de detruire du
     decor, pas de tuer quelque chose, et confondre les deux ferait croire a un
     kill qui n'a rapporte ni score ni experience. */
  mur: () => {
    const a = noise({ dur: 0.20, type: "lowpass", freq: 1400, to: 300,
                      gain: SOUND_GAIN.mort * 0.9 });
    tone({ freq: 140, to: 70, dur: 0.14, type: "square", gain: SOUND_GAIN.mort * 0.45 });
    return { end: a.end, stop: a.stop };
  },

  // Souffle passe-bas de 300 ms, plus un coup grave : c'est ce qui donne le
  // poids d'une detonation de zone.
  explosion: (o) => {
    const k = Math.max(0.4, Math.min(1.4, o.force ?? 1));
    const a = noise({ dur: 0.30, type: "lowpass", freq: 900 * k, to: 90,
                      gain: SOUND_GAIN.mort * 1.5 * k });
    tone({ freq: 110 * k, to: 45, dur: 0.22, type: "sine", gain: SOUND_GAIN.mort * k });
    return { end: a.end, stop: a.stop };
  },

  // Glissando descendant : on doit comprendre sans regarder le HUD qu'un
  // coequipier vient de tomber, parce que c'est le moment ou il faut arreter
  // ce qu'on fait pour aller le relever.
  aterre: () => tone({ freq: 520, to: 120, dur: 0.42, type: "sawtooth",
                       gain: SOUND_GAIN.niveau * 0.7 }),

  // Arpege court montant, symetrique du precedent.
  releve: () => {
    const a = tone({ freq: 440, dur: 0.09, type: "triangle", gain: SOUND_GAIN.bonus });
    tone({ freq: 660, dur: 0.14, type: "triangle", gain: SOUND_GAIN.bonus, delay: 0.08 });
    return { end: a.end + 0.22, stop: a.stop };
  },

  // Accord grave + bruit : la barre de boss qui rompt est l'evenement le plus
  // important d'un combat, il a droit au son le plus large.
  barre: () => {
    const a = tone({ freq: 147, dur: 0.5, type: "sawtooth", gain: SOUND_GAIN.boss * 0.5 });
    tone({ freq: 220, dur: 0.5, type: "sawtooth", gain: SOUND_GAIN.boss * 0.35 });
    noise({ dur: 0.35, type: "lowpass", freq: 1600, to: 200, gain: SOUND_GAIN.boss * 0.4 });
    return { end: a.end, stop: a.stop };
  },

  /* LE SURVOL. Un clic sec et rien d'autre : 18 ms de bruit passe-bande etroit
     (Q eleve), sans aucune composante tonale. Une note, meme courte, se lit
     comme une reponse — or survoler n'est pas agir, et un carillon a chaque
     bouton traverse fatigue en une soiree. Un tick dit « ceci est une cible »
     et se laisse oublier, ce qui est precisement le role d'un retour de
     survol. La descente de hauteur (3400 → 2200) evite le sifflement d'un
     bruit filtre a hauteur fixe, qu'on entend comme une tonalite. */
  survol: () => noise({ dur: 0.018, type: "bandpass", freq: 3400, to: 2200,
                        q: 6, gain: SOUND_GAIN.menu }),

  /* LA SELECTION. Une note ronde qui MONTE, et AUCUN bruit.

     Un twang de blaster avait ete essaye : descente de 1750 a 180 Hz en dent de
     scie, carre une octave dessous, bruit passe-bande par-dessus. Il etait juste
     techniquement — c'est bien ce son-la — et desagreable a l'usage, pour deux
     raisons qui valent regle. Le BRUIT d'abord : filtre etroit et bref, il rape,
     et on le declenche a chaque clic d'un ecran qu'on parcourt pendant une
     minute — ce qui passe une fois par combat ne passe pas trente fois par
     menu. La DESCENTE ensuite : une hauteur qui tombe se lit comme une perte
     (c'est `aterre`, mot pour mot), or selectionner est un gain.

     Donc l'inverse, terme a terme. Trois sinus, aucune source de bruit : la
     sinusoide est la seule forme d'onde sans harmonique, donc la seule qui ne
     puisse pas raper. La hauteur MONTE d'un ton (740 → 880) plutot que de sauter
     — un intervalle franc sonne comme une alerte, une inflexion sonne comme un
     acquiescement. L'octave superieure, a un quart du volume, donne le brillant
     qui fait qu'on l'entend par-dessus le reste sans avoir a monter le gain ; la
     quarte grave en dessous donne le corps, sans quoi il ne reste qu'un bip de
     montre.

     Attaque de 12 ms et non 4 : sur une sinusoide, 4 ms s'entend encore comme
     un coup d'ongle. C'est le seul reglage qui separe « rond » de « sec », et
     c'est pour lui que `tone` a gagne son parametre.

     ×1,3 sur le survol — c'est une REPONSE, elle doit passer devant la
     signalisation — et 110 ms, parce qu'on enchaine les clics dans un menu. */
  selection: () => {
    const a = tone({ freq: 740, to: 880, dur: 0.11, type: "sine",
                     gain: SOUND_GAIN.menu * 1.3, attack: 0.012 });
    tone({ freq: 1480, to: 1760, dur: 0.08, type: "sine",
           gain: SOUND_GAIN.menu * 0.32, attack: 0.012 });
    tone({ freq: 370, to: 440, dur: 0.13, type: "triangle",
           gain: SOUND_GAIN.menu * 0.4, attack: 0.016 });
    return { end: a.end + 0.05, stop: a.stop };
  },

  /* SE DECLARER PRET. La meme matiere que `selection` — sinus, montee, attaque
     ronde — mais un INTERVALLE et non une inflexion : deux notes distinctes,
     une tierce majeure (587 → 740), la seconde a peine posee sur la premiere.
     C'est ce qui separe « j'ai choisi » de « je m'engage » : une inflexion
     acquiesce, deux notes qui montent affirment. Elles se recouvrent de 30 ms
     au lieu de s'enchainer proprement — jointes, on entend un accord et non une
     progression, espacees, on entend un carillon.

     Le grave a l'octave n'est pas decoratif : c'est ce qui fait qu'on le sent
     dans un salon a quatre ou tout le monde clique en meme temps. */
  pret: () => {
    const a = tone({ freq: 587, dur: 0.10, type: "sine",
                     gain: SOUND_GAIN.menu * 1.3, attack: 0.012 });
    tone({ freq: 740, to: 784, dur: 0.16, type: "sine",
           gain: SOUND_GAIN.menu * 1.2, attack: 0.014, delay: 0.07 });
    tone({ freq: 294, dur: 0.14, type: "triangle",
           gain: SOUND_GAIN.menu * 0.42, attack: 0.018 });
    return { end: a.end + 0.20, stop: a.stop };
  },

  /* SE RETIRER. Le meme geste a l'envers, et il DOIT sonner autrement : le
     bouton est une bascule, et deux etats opposes qui rendent le meme son
     apprennent au joueur a ne plus l'ecouter. Meme tierce, jouee en descendant
     et plus courte, sans le renfort grave — c'est un retrait, il n'a pas a
     occuper la piece. C'est la regle du depot appliquee telle quelle : une
     hauteur qui monte est un gain, une hauteur qui tombe est une perte. */
  pretAnnule: () => {
    const a = tone({ freq: 740, dur: 0.08, type: "sine",
                     gain: SOUND_GAIN.menu * 0.9, attack: 0.012 });
    tone({ freq: 587, to: 554, dur: 0.12, type: "sine",
           gain: SOUND_GAIN.menu * 0.8, attack: 0.014, delay: 0.06 });
    return { end: a.end + 0.14, stop: a.stop };
  },

  /* LANCER LA MANCHE. Le troisieme degre de la meme famille : trois notes, un
     accord majeur qui monte et RESOUT a l'octave (392 · 494 · 784). Les deux
     precedents ne resolvent pas — ils repondent a un geste, et la partie
     continue ; celui-ci ferme le salon, donc il se termine.

     Il n'est pas le souffle de `lancement`, et les deux ne se genent pas : le
     clic part de la main de l'hote, le souffle part du message `round` un
     aller-retour serveur plus tard, et ils vivent dans deux registres — accord
     medium et court ici, sous-grave long la-bas. L'un annonce, l'autre
     accomplit. */
  lancer: () => {
    const a = tone({ freq: 392, dur: 0.12, type: "sine",
                     gain: SOUND_GAIN.menu * 1.2, attack: 0.012 });
    tone({ freq: 494, dur: 0.14, type: "sine",
           gain: SOUND_GAIN.menu * 1.1, attack: 0.012, delay: 0.06 });
    tone({ freq: 784, to: 830, dur: 0.26, type: "sine",
           gain: SOUND_GAIN.menu * 1.3, attack: 0.016, delay: 0.13 });
    tone({ freq: 196, dur: 0.30, type: "triangle",
           gain: SOUND_GAIN.menu * 0.5, attack: 0.020 });
    return { end: a.end + 0.32, stop: a.stop };
  },

  /* LE LANCEMENT. Un souffle grave qui s'ouvre — la seule recette du jeu a
     monter avant de descendre (`attack`), et c'est ce qui la separe de
     `explosion` : une detonation frappe, un lancement se met en route.
     Trois couches, chacune pour une raison : le bruit passe-bas qui s'effondre
     de 900 a 60 Hz porte le souffle, le sinus a 80 Hz porte le POIDS (un
     souffle seul reste un bruit de vent, sans masse), et la quinte a 120 Hz
     l'ancre sur une hauteur — sans elle, le grave est du sous-grave qu'une
     enceinte d'ordinateur portable ne restitue pas du tout.
     Il dure 1,1 s, ce qui est long pour ce depot : c'est le seul son declenche
     une fois par manche, il n'a personne a bousculer. */
  lancement: () => {
    const a = noise({ dur: 1.1, type: "lowpass", freq: 900, to: 60, attack: 0.12,
                      gain: SOUND_GAIN.boss * 0.5 });
    tone({ freq: 80, to: 44, dur: 0.9, type: "sine", gain: SOUND_GAIN.boss * 0.55 });
    tone({ freq: 120, to: 66, dur: 0.7, type: "triangle", gain: SOUND_GAIN.boss * 0.22 });
    return { end: a.end, stop: a.stop };
  },

  // Entree de boss : meme accord, une octave plus bas et plus long.
  boss: () => {
    const a = tone({ freq: 98, to: 82, dur: 0.9, type: "sawtooth", gain: SOUND_GAIN.boss * 0.55 });
    tone({ freq: 147, dur: 0.9, type: "sine", gain: SOUND_GAIN.boss * 0.3 });
    return { end: a.end, stop: a.stop };
  },
};

/* Point d'entree unique. Tout passe par la : la recharge par nom, le plafond
   de voix et la hierarchie de volume sont ainsi appliques une seule fois, pour
   la meme raison que `_hurt()` cote simulation. */
export function playSound(name, opts = {}) {
  if (!ac || muted || volume <= 0) return false;
  const recipe = PALETTE[name];
  if (!recipe) return false;

  const now = ac.currentTime;
  // La cle de recharge inclut la variante : deux annonces de niveaux
  // differents ne sont pas le meme son et n'ont pas a s'evincer.
  const key = opts.key ?? (opts.level !== undefined ? `${name}:${opts.level}` : name);
  if (!limiter.admit(key, now)) return false;

  const v = recipe(opts);
  limiter.add(key, now, v.end, v.stop);
  return true;
}
