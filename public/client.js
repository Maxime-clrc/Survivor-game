/* ===========================================================================
   CLIENT
   Ne simule rien d'autoritaire. Il envoie sa direction de deplacement et sa
   direction de visee, recoit des snapshots a 20 Hz, et comble les trous par
   interpolation. Seul son propre personnage est predit localement.
   =========================================================================== */

import {
  CFG, PLAYER_COLORS, ENEMY_TYPES, POWERUP_TYPES, DIFFICULTIES,
  BUFF_DAMAGE, BUFF_RATE, BUFF_DOUBLE, BUFF_PIERCE, BUFF_RICOCHET,
  // Registre des provenances de degats : le bilan y lit ses libelles, et l'ordre
  // est celui des index qui circulent dans l'instantane.
  DAMAGE_SOURCES,
  /* La fenetre de build affiche les multiplicateurs EFFECTIFS. Elle appelle la
     meme fonction que la simulation plutot que d'en recoder le repli : deux
     implementations auraient diverge au premier reglage, sur precisement
     l'ecran dont le seul but est de verifier un chargement. */
  fullMods,
} from "/shared/game_state.js";
import {
  CARD_BY_ID, RARITY_COLOR, RARITY_LABEL, CARD_CFG, cardDetail, computeMods,
} from "/shared/cards.js";
import {
  CLASSES, CLASS_DEFAULT, SKILL_CFG, classAt, bombRange,
  SKILL_HEAL_MODE, SKILL_TAUNT, SKILL_OVERDRIVE,
} from "/shared/classes.js";
import {
  STATUSES, STATUS_VULN, STATUS_DOOM, statusBit,
} from "/shared/statuses.js";
/* Progression permanente (lot D). Le client importe les TABLES — arbres,
   couts, jalons — et ne recoit du serveur que l'etat du compte : deux copies
   des tables auraient diverge au premier reglage, exactement comme les
   couleurs. */
import {
  PROG_CFG, TREES, CONFORT, MILESTONES, slotsFor, tierCost,
} from "/shared/progression.js";
import {
  BOSS_CFG, bossAt, mechAt, ALERT_ORDER, ALERT_WARN,
  MECH_STACK, MECH_SPREAD, MECH_TOWER, MECH_COUNT, MECH_LINK, MECH_JAIL,
  MECH_CLUSTER, MECH_FEED, MECH_BAIT, MECH_SANCTUARY, MECH_PROX,
  BOSS_MATRIARCHE, BOSS_METRONOME, BOSS_ORACLE, BOSS_JUMEAUX,
} from "/shared/bosses.js";
import {
  initAudio, playSound, setVolume, setMuted, getVolume, isMuted, audioStats,
  setMusicVolume, getMusicVolume,
} from "/audio.js";
/* La bande son vit dans son propre module, sur le modele d'audio.js : elle ne
   depend ni du DOM ni du reseau, et elle emprunte le contexte et le bus
   d'audio.js — la coupure et le volume globaux l'emportent donc toujours. */
import { startMusic, setMusicIntensity } from "/music.js";
import { EventPump } from "/events.js";
/* La grille du sol est graduee en METRES : c'est ce qui rend les distances des
   descriptions de cartes lisibles a l'ecran. Seule conversion d'affichage du
   fichier, et elle passe par le point unique. */
import { PX_PER_M } from "/shared/units.js";
/* Les glyphes sont dessines a deux endroits depuis que le HUD est sorti du
   canvas — dans l'arene et dans le DOM — d'ou un module a part plutot qu'une
   seconde copie des traces. */
import {
  POWERUP_ICON, POWERUP_STYLE, EFFECT_BADGES, STATUS_ICON, SRC_ICON,
  paintIcon, iconImg,
} from "/icons.js";
/* Le HUD est en DOM depuis ce lot : ce module possede tout ce qui vit sur
   l'ecran, le canvas ne garde que le MONDE. La ligne de partage n'est pas
   « canvas ou CSS » mais « ou vit l'element ». */
import { showHud, updateHud, hudDamage, resetHud } from "/hud.js";
/* Toute entite passe par `drawSprite`, et par aucune autre fonction. Le jour ou
   la couche chaude bascule vers WebGL, on reecrit ce module et pas un appelant
   ne bouge — c'est le seul but de l'indirection, et il n'y en a qu'une. */
import {
  buildAtlas, drawSprite, frameOf, atlasStats, silhouetteSheet,
  bindGL, reuploadAtlas, glActive, SPRITE_CELL,
} from "/sprites.js";
/* Le batcher WebGL. Il ne connait ni le jeu ni l'atlas : `sprites.js` lui
   pousse des quads, `client.js` lui donne un canvas et une taille. C'est
   `drawSprite` qui choisit le chemin, et aucun de ses appelants ne le sait. */
import { createGL } from "/gl.js";
/* La charte, et rien qu'elle : plus une seule couleur en dur dans ce fichier.
   Le canvas lit la table directement au lieu d'interroger `getComputedStyle` a
   chaque image — c'est la meme source que les variables CSS, posees sur
   `:root` par `applyPalette()` juste en dessous. */
import {
  SURFACE, TEXT, SIGNAL, CLASS_COLOR, COMBAT, ENEMY, ZONE, WALL, BOSS, BOSS_SKIN,
  POWERUP_COLOR, EFFECT_COLOR, OWNED, FX, MARK, HUD, CARD_CATEGORY_COLOR,
  alpha, cssVars,
} from "/shared/palette.js";

/* Les variables CSS viennent de `palette.js` et n'existent nulle part ailleurs :
   `tokens.css` ne contient aucune couleur, precisement pour qu'il n'y ait pas
   deux listes a tenir. Pose des le chargement du module, donc avant la premiere
   image et avant que le salon ne s'affiche. */
function applyPalette() {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(cssVars())) root.setProperty(k, v);
}
applyPalette();

const INTERP_MS = 110;
const INPUT_HZ = 30;
const SNAP_THRESHOLD = 90;

const PHASE_LOBBY = 0;
const PHASE_ROUND = 1;

/* TROIS COUCHES. Voir le commentaire d'`index.html` : tout ce qui est en canvas
   2D passe forcement AU-DESSUS de tout ce qui est en WebGL, et l'ordre de
   dessin du jeu intercale du 2D avant ET apres les entites. D'ou une couche 2D
   de chaque cote plutot qu'une seule.

   `ctx` est la couche 2D COURANTE, et c'est une variable et non une constante :
   `drawWorld` la bascule du dessous au dessus au moment ou l'on franchit les
   entites. C'est ce qui permet aux deux cents fonctions de dessin de ne pas
   savoir sur quel canvas elles ecrivent — exactement comme `drawSprite` ne dit
   pas a ses appelants s'il passe par WebGL ou par le 2D. */
const arenaEl = document.getElementById("arena");
const cvUnder = document.getElementById("cvUnder");
const cvGl = document.getElementById("cvGl");
const cv = document.getElementById("cv");
const underCtx = cvUnder.getContext("2d");
const overCtx = cv.getContext("2d");
let ctx = underCtx;

/* Drapeau de bascule. Le chemin canvas 2D RESTE EN PLACE et fonctionnel :
   c'est la comparaison visuelle entre les deux rendus, c'est le repli en cas de
   perte de contexte, et c'est ce qui permet de livrer a mi-chemin sans rien
   casser. `localStorage.setItem("survivor.renderer", "canvas2d")` suffit a
   revenir en arriere, depuis la console, sans rechargement du serveur.

   `localStorage` dans un try : un navigateur en navigation privee stricte le
   refuse, et le jeu n'a aucune raison de ne pas demarrer pour un reglage. */
function rendererFlag() {
  try { return localStorage.getItem("survivor.renderer") ?? "webgl"; }
  catch { return "webgl"; }
}

/* Perte de contexte : bascule de GPU sur un portable, mise en veille,
   redemarrage de pilote. Le repli est immediat et gratuit — `drawSprite`
   retombe tout seul sur le chemin 2D des que `renderer.ok` est faux — et la
   restauration doit RETELEVERSER l'atlas, sinon le jeu revient en sprites
   blancs. */
const gl = rendererFlag() === "webgl"
  ? createGL(cvGl, { onRestore: () => { reuploadAtlas(); resize(); } })
  : null;

/* --- densite de pixels native -----------------------------------------------
   Le canvas avait une memoire FIXE de 1600 x 900 que le CSS etirait. Sur un
   ecran 1440p ou 4K, tout etait donc agrandi : sprites flous, texte flou —
   c'est la meme cause racine que le HUD illisible, vue sous un autre angle, et
   aucun reglage de taille de police ne la corrigeait.

   Les coordonnees monde restent en 1600 x 900 : la transformation absorbe tout
   et pas une ligne de logique de rendu ne change. Le plafond a 2 est
   DELIBERE — au-dela, on quadruple le cout de remplissage pour un gain que
   personne ne voit. */
let renderScale = 1;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  const w = Math.round(r.width * dpr);
  const h = Math.round(r.height * dpr);
  // Reaffecter `width` vide le canvas et remet la transformation a l'identite :
  // on ne le fait donc QUE si la taille a reellement change, sinon chaque
  // redimensionnement de fenetre effacerait l'image en cours.
  for (const c of [cv, cvUnder]) {
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }
  renderScale = cv.width / CFG.ARENA_W;
  // Les DEUX couches 2D partagent la meme transformation : elles doivent
  // coincider au pixel pres, sinon les entites glissent contre leur sol.
  underCtx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  overCtx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  // Le viewport WebGL est en pixels PHYSIQUES, deja multiplies par la densite.
  // L'oublier donne le symptome classique du rendu tasse dans un coin.
  gl?.resize(w, h, CFG.ARENA_W, CFG.ARENA_H);
}

addEventListener("resize", resize);
resize();
const gate = document.getElementById("gate");
const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const summary = document.getElementById("summary");
const scoresBody = document.querySelector("#scores tbody");
const startBtn = document.getElementById("start");
const waitMsg = document.getElementById("waitMsg");
const voteRow = document.getElementById("voteRow");
const voteHint = document.getElementById("voteHint");
const classRow = document.getElementById("classRow");
const classHint = document.getElementById("classHint");
const nameInput = document.getElementById("name");
const goBtn = document.getElementById("go");
const statusEl = document.getElementById("status");
const cardsEl = document.getElementById("cards");
const cardsTitle = document.getElementById("cardsTitle");
const cardsRow = document.getElementById("cardsRow");
const cardsTimerEl = document.getElementById("cardsTimer");
const cardsTimerFill = cardsTimerEl.querySelector("i");
const cardsWaitEl = document.getElementById("cardsWaitMsg");
const bilanEl = document.getElementById("bilan");
const bilanTitle = document.getElementById("bilanTitle");
const bilanStats = document.getElementById("bilanStats");
const bilanHurt = document.getElementById("bilanHurt");
const bilanScoresBody = document.querySelector("#bilanScores tbody");
const bilanGo = document.getElementById("bilanGo");
const bilanBarFill = document.querySelector("#bilanBar i");
const bilanHint = document.getElementById("bilanHint");
const volInput = document.getElementById("vol");
const volVal = document.getElementById("volVal");
const muteBtn = document.getElementById("mute");

/* --- etat local ------------------------------------------------------------- */

let ws = null;
let myId = 0;
let hostId = 0;
let phase = PHASE_LOBBY;
let amSpectator = false;
let lobby = [];
let roundNumber = 0;
let lastResult = null;
let difficulty = 1;        // mode retenu par le vote
let tally = [0, 0, 0];
let myVote = 1;

/* Cartes d'amelioration. `cardsState` porte l'offre en cours et le drapeau
   "picked" ; on ne le vide pas au clic pour garder l'ecran affiche en mode
   attente (cf. pickCard). `loadouts` n'est jamais remis a zero par un
   minuteur : seul le message "round" le fait, en meme temps que le reste de
   l'etat de manche. */
let cardsState = null;      // { boss, deadline, offers, picked } ou null
/* Etat du compte de progression (lot D), tel que le serveur l'envoie. Nul tant
   que rien n'est arrive — le panneau reste alors cache, un compte sans serveur
   n'existe pas. */
let progressState = null;
let cardsPending = [];      // ids des joueurs qui n'ont pas encore choisi
let cardsTimerHandle = null;
let loadouts = new Map();   // playerId -> [cardId,...]

/* Recharge d'esquive LOCALE, en secondes. « Célérité » la raccourcit, et le
   client doit rejouer la meme formule que le serveur : sans ca, sa propre
   demande d'esquive restait bloquee trois secondes alors que le serveur
   l'aurait accordee, et la pastille de recharge se remplissait a partir du
   mauvais denominateur. Mise en cache et recalculee au seul changement de
   chargement — `computeMods` rejoue toute la table de cartes, ce qui n'a rien a
   faire dans une boucle a 60 images par seconde. */
let myDashCd = CFG.DASH_CD;
function refreshLocalMods() {
  myDashCd = CFG.DASH_CD * computeMods(ownedCounts(myId)).dashCdMul;
}

let snapshots = [];
// Suivi de la reserve de bombes, pour n'afficher l'anneau de portee que dans
// les deux secondes qui suivent une fin de recharge. Voir `ingest`.
let bombStockSeen = 0;
let bombReadyAt = -1e9;
let latest = null;
let predicted = null;
let connected = false;
let lastSnapAt = 0;
let ping = 0;

/* --- connexion --------------------------------------------------------------- */

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("err", isError);
}

/* Identifiant de compte (lot D). Tire au sort a la premiere connexion et range
   dans le localStorage : le pseudo n'est PAS une identite — n'importe qui peut
   taper le tien — et c'est cette cle qui porte la progression. Changer de
   navigateur repart de zero, c'est assume en reseau local et dit au LISEZMOI. */
function accountUid() {
  let uid = localStorage.getItem("survivor.uid");
  if (uid && /^[a-z0-9]{8,64}$/i.test(uid)) return uid;
  uid = "";
  while (uid.length < 24) uid += Math.floor(Math.random() * 36).toString(36);
  localStorage.setItem("survivor.uid", uid);
  return uid;
}

function connect(name) {
  setStatus("connexion…");
  goBtn.disabled = true;

  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${proto}//${location.host}`);

  ws.onopen = () => ws.send(JSON.stringify({ t: "join", name, uid: accountUid() }));

  ws.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }

    switch (msg.t) {
      case "welcome":
        myId = msg.id;
        hostId = msg.host;
        phase = msg.phase;
        amSpectator = msg.spectator;
        connected = true;
        gate.hidden = true;
        localStorage.setItem("survivor.name", name);
        // Le serveur peut avoir remplace un identifiant difforme par un neuf :
        // on garde LE SIEN, sinon la progression du compte se perd au retour.
        if (msg.uid) localStorage.setItem("survivor.uid", msg.uid);
        refreshPanel();
        break;

      /* Etat du compte de progression (lot D) : envoye a la connexion, apres
         chaque achat et apres chaque fin de manche. */
      case "progress":
        progressState = msg;
        renderMeta();
        renderAccount();
        break;

      /* --- compte a pseudo reserve. Le code s'affiche UNE fois : il n'existe
         en clair que dans ce message, le serveur n'en garde qu'un hachage. */
      case "claimed":
        // L'identite complete est pseudo#tag : c'est ELLE qu'on note avec le
        // code, un pseudo seul peut designer plusieurs comptes.
        accCodeHandle.textContent = `${msg.pseudo}#${msg.tag}`;
        accCodeValue.textContent = msg.code;
        accCodeEl.hidden = false;
        accMsgEl.textContent = "";
        break;

      case "recovered":
        // Le compte recupere devient LE compte de ce navigateur : meme geste
        // que pour l'identifiant du welcome.
        localStorage.setItem("survivor.uid", msg.uid);
        accCodeEl.hidden = true;
        accMsgEl.textContent = `compte « ${msg.pseudo}${msg.tag ? "#" + msg.tag : ""} » récupéré`;
        break;

      case "accountError":
        accMsgEl.textContent = msg.msg;
        break;

      case "lobby":
        lobby = msg.players;
        hostId = msg.host;
        phase = msg.phase;
        roundNumber = msg.round;
        difficulty = msg.difficulty ?? difficulty;
        tally = msg.tally ?? tally;
        myVote = lobby.find(l => l.id === myId)?.vote ?? myVote;
        amSpectator = lobby.find(l => l.id === myId)?.spectator ?? false;
        refreshPanel();
        break;

      case "round":
        pushWorld(() => {
          roundNumber = msg.round;
          difficulty = msg.difficulty ?? difficulty;
          phase = PHASE_ROUND;
          amSpectator = false;
          lastResult = null;
          snapshots = [];
          latest = null;
          predicted = null;
          resetFeedback();
          // Une nouvelle manche remet les cartes a zero : sans ca, le tableau
          // de fin de la manche precedente resterait affiche derriere le
          // suivant, et l'ecran de choix d'un boss deja mort resterait ouvert
          // si la manche a ete relancee pendant qu'il attendait un choix.
          loadouts = new Map();
          refreshLocalMods();
          closeCards();
          closeBilan();
          closeBuild();
          closePause();
          refreshPanel();
        });
        break;

      case "roundAbort":
        pushWorld(() => {
          phase = PHASE_LOBBY;
          lastResult = null;
          snapshots = [];
          latest = null;
          predicted = null;
          resetFeedback();
          closeCards();
          closeBilan();
          closeBuild();
          closePause();
          refreshPanel();
        });
        break;

      case "roundEnd":
        pushWorld(() => {
          phase = PHASE_LOBBY;
          hostId = msg.host;
          lastResult = msg;
          // La file d'alertes se vide aussi ici : une consigne encore en attente
          // du retard d'interpolation serait sortie au debut de la manche
          // SUIVANTE, sur un combat qui n'a rien a voir.
          resetFeedback();
          closeCards();
          closeBuild();
          closePause();
          // Le bilan s'ouvre AVANT `refreshPanel` : c'est lui qui tient le salon
          // ferme tant qu'il est a l'ecran.
          showBilan(msg);
          refreshPanel();
        });
        break;

      case "state":
        ingest(msg);
        /* Le serveur ne signale pas explicitement la reprise de la manche : il
           cesse simplement de simuler, donc de diffuser des etats, pendant tout
           le choix. Le premier etat qui revient signe donc la reprise, et il
           n'y a pas de minuteur local a tenir.
           La fermeture ne doit surtout pas etre conditionnee au fait d'avoir
           clique : le joueur qui laisse expirer le delai recoit une carte
           d'office, la manche repart pour tout le monde, et son ecran serait
           reste ouvert sur une offre morte pendant qu'il se fait devorer.
           La fermeture passe par la file : sinon l'ecran se retire 110 ms avant
           que le monde ne reparte, et on regarde une image figee. Le drapeau
           evite d'empiler une fermeture par instantane — il en arrive vingt par
           seconde. */
        if (cardsState && !cardsCloseQueued) {
          cardsCloseQueued = true;
          pushWorld(() => { cardsCloseQueued = false; closeCards(); });
        }
        break;

      /* Un message "cards" par tour de choix. Deux niveaux gagnes dans la meme
         vague en envoient deux d'affilee, sans instantane entre les deux : on
         reconstruit donc l'etat a chaque fois plutot que de le fusionner, ce
         qui remet `picked` a faux et reamorce le minuteur. Sans ca, le second
         ecran s'ouvrait deja grise et sur le delai expire du premier. */
      /* Canal d'evenements de mecanique. Message PONCTUEL, hors du snapshot :
         c'est lui qui dit « regroupez-vous » la ou le snapshot ne montre qu'un
         cercle. Il arrive a l'instant de l'annonce, pas vingt fois par seconde. */
      case "alert":
        pushAlert(msg);
        break;

      case "cards":
        pushWorld(() => {
          cardsState = {
            wave: msg.wave, bossWave: msg.bossWave === 1, boss: msg.boss ?? 0,
            bossKind: msg.bossKind ?? 0,
            level: msg.level, more: msg.more ?? 0,
            deadline: msg.deadline, offers: msg.offers,
            // « Relance » (lot D) : le serveur dit si elle est disponible.
            reroll: msg.reroll === 1,
            picked: false, pickedId: null,
            // Instant d'ouverture, pour le filet de compte a rebours : le serveur
            // envoie une echeance, pas une duree, et le filet a besoin des deux.
            from: Date.now(),
          };
          cardsPending = [];
          renderCards();
        });
        break;

      // Dans la MEME file que `cards`, pas pour le retard mais pour l'ORDRE :
      // applique a la reception, il rendrait la liste d'attente sur un ecran
      // pas encore ouvert.
      case "cardsWait":
        pushWorld(() => {
          cardsPending = msg.pending ?? [];
          renderCardsWait();
        });
        break;

      /* Reponse du serveur a une demande de pause — et aussi son initiative :
         il la leve tout seul au bout de cinq minutes ou a l'arrivee d'un second
         joueur. Le panneau reste ouvert dans ce cas, il change simplement de
         libelle : le refermer d'office aurait retire le son et le bouton de
         sortie a quelqu'un qui ne demandait rien. */
      case "paused":
        pauseReal = msg.on === 1;
        if (!pauseEl.hidden) renderPauseState();
        break;

      case "loadout":
        loadouts = new Map(Object.entries(msg.byPlayer).map(([id, arr]) => [Number(id), arr]));
        // Seul point ou le chargement local change : c'est ici, et nulle part
        // ailleurs, qu'on recalcule les mods dont la saisie a besoin.
        refreshLocalMods();
        break;

      case "full":
        setStatus(`partie pleine (${msg.max} joueurs)`, true);
        goBtn.disabled = false;
        break;
    }
  };

  ws.onerror = () => {
    setStatus("serveur injoignable", true);
    goBtn.disabled = false;
  };

  ws.onclose = () => {
    connected = false;
    // La file de transitions se vide ICI et nulle part ailleurs : une ouverture
    // de cartes ou un bilan encore en attente sortirait par-dessus l'ecran de
    // reconnexion, 110 ms apres la coupure.
    worldQueue.length = 0;
    cardsCloseQueued = false;
    panel.hidden = true;
    gate.hidden = false;
    showHud(false);
    goBtn.disabled = false;
    closeCards();
    closeBilan();
    closeBuild();
    closePause();
    setStatus("connexion perdue", true);
  };
}

/* Ecran de chargement. Le clic « Rejoindre » est le seul geste utilisateur dont
   on soit certain avant la premiere balle : c'est donc lui qui debloque le
   contexte audio ET qui declenche la generation des atlas. Meme moment, meme
   barre — et le seul ecran ou l'on peut prendre trois secondes, donc le seul ou
   un logotype a sa place. */
const loadingEl = document.getElementById("loading");
const loadFill = document.querySelector("#loadBar > i");
const loadPct = document.getElementById("loadPct");
const loadWhat = document.getElementById("loadWhat");

function setLoading(k, quoi) {
  loadFill.style.width = (Math.max(0, Math.min(1, k)) * 100).toFixed(0) + "%";
  loadPct.textContent = Math.round(k * 100) + " %";
  if (quoi) loadWhat.textContent = quoi;
}

goBtn.onclick = async () => {
  goBtn.disabled = true;
  gate.hidden = true;
  loadingEl.hidden = false;
  setLoading(0, "génération des sprites");

  // Le contexte audio se cree ICI et nulle part ailleurs : les navigateurs
  // exigent un geste utilisateur.
  initAudio();
  // La musique demarre avec le contexte : le salon a droit a son fond calme,
  // et c'est l'humeur — pas le demarrage — qui suivra la partie.
  startMusic();
  const stats = await buildAtlas(k => setLoading(k * 0.9, null));

  /* Branchement du batcher. Il ne peut pas se faire avant : l'atlas n'existe
     qu'ici, et c'est lui la texture. Les DEUX couches 2D sont declarees comme
     cibles — la silhouette du salon et la planche de controle passent leur
     propre contexte et doivent continuer d'emprunter le chemin 2D. */
  if (gl) {
    bindGL(gl, [underCtx, overCtx]);
    resize();
  }
  if (glActive()) {
    PARTICLE_MAX = PARTICLE_GL;
    fxWhite = frameOf("fx_white");
  }

  setLoading(1, "prêt");
  if (PERF) {
    console.log(`atlas : ${stats.frames} images, ${stats.w}x${stats.h}, ` +
                `${atlasStats().mo.toFixed(1)} Mo — rendu : ` +
                `${gl?.ok ? "WebGL2" : "canvas 2D"}`);
  }

  /* `?planche` sort la planche de silhouettes en noir uni sur fond blanc.
     Ce n'est pas un gadget : c'est le CRITERE D'ACCEPTATION des silhouettes.
     Un lecteur qui ne connait pas le jeu doit pouvoir les regrouper par type
     sans hesiter ; un type qui n'est reconnaissable que par sa couleur ou son
     detail interne a rate son test, et le style travaille alors contre la
     mecanique au lieu de la servir. */
  if (location.search.includes("planche")) {
    const sheet = silhouetteSheet();
    sheet.style.cssText = "position:fixed;inset:0;margin:auto;z-index:99;" +
                          "max-width:96vw;max-height:96vh;background:#fff";
    document.body.appendChild(sheet);
    // Les boss ne sont pas dans l'atlas — ils sont traces en continu — donc ils
    // manquaient a la planche. Or le critere d'acceptation du lot 6 porte sur
    // « cinq boss et trois classes distinguables » : une bande a part, produite
    // par la MEME routine de dessin que le jeu.
    const bosses = bossSheet();
    bosses.style.cssText = "position:fixed;left:0;right:0;bottom:8px;margin:auto;" +
                           "z-index:100;max-width:96vw;background:#fff";
    document.body.appendChild(bosses);
  }

  loadingEl.hidden = true;
  gate.hidden = false;
  goBtn.disabled = false;
  connect(nameInput.value.trim() || "joueur");
};
nameInput.onkeydown = e => { if (e.key === "Enter") goBtn.click(); };
nameInput.value = localStorage.getItem("survivor.name") || "";
nameInput.focus();

/* --- reglage du son -------------------------------------------------------

   DEUX jeux de controles pour un seul reglage : celui de l'ecran d'accueil et
   celui du menu pause. Une liste et une boucle plutot que deux copies des trois
   gestionnaires — le second jeu aurait sinon oublie de se remettre a jour quand
   on touche au premier, et on aurait vu deux volumes differents affiches en
   meme temps. */
const audioUi = [
  { vol: volInput, val: volVal, mute: muteBtn,
    mus: document.getElementById("musVol"),
    musVal: document.getElementById("musVolVal") },
  {
    vol: document.getElementById("pauseVol"),
    val: document.getElementById("pauseVolVal"),
    mute: document.getElementById("pauseMute"),
    mus: document.getElementById("pauseMusVol"),
    musVal: document.getElementById("pauseMusVolVal"),
  },
];

function refreshAudioUi() {
  const pct = Math.round(getVolume() * 100);
  const mus = Math.round(getMusicVolume() * 100);
  for (const u of audioUi) {
    u.vol.value = String(pct);
    u.val.textContent = `${pct} %`;
    u.mute.textContent = isMuted() ? "✕" : "♪";
    u.mute.classList.toggle("off", isMuted());
    u.mute.title = isMuted() ? "rétablir le son" : "couper le son";
    if (u.mus) {
      u.mus.value = String(mus);
      u.musVal.textContent = `${mus} %`;
    }
  }
}

for (const u of audioUi) {
  u.vol.oninput = () => {
    setVolume(Number(u.vol.value) / 100);
    // Bouger le volume rétablit le son : couper puis tirer la glissiere sans
    // rien entendre passe pour une panne.
    if (isMuted() && Number(u.vol.value) > 0) setMuted(false);
    refreshAudioUi();
  };

  u.mute.onclick = () => {
    // Le bouton sert aussi de bouton de test : il debloque le contexte au
    // premier clic, avant meme d'avoir rejoint.
    initAudio();
    setMuted(!isMuted());
    refreshAudioUi();
    if (!isMuted()) playSound("bonus");
  };

  // Volume de la MUSIQUE, separe : a zero, la bande son se tait sans toucher
  // aux signaux du jeu — c'est le bouton « je joue sans musique ».
  if (u.mus) {
    u.mus.oninput = () => {
      setMusicVolume(Number(u.mus.value) / 100);
      refreshAudioUi();
    };
  }
}

// La touche M coupe le son en jeu, sans repasser par le salon.
window.addEventListener("keydown", e => {
  if (e.key !== "m" && e.key !== "M") return;
  if (document.activeElement === nameInput) return;
  setMuted(!isMuted());
  refreshAudioUi();
});

refreshAudioUi();

startBtn.onclick = () => {
  if (myId !== hostId || phase !== PHASE_LOBBY) return;
  ws.send(JSON.stringify({ t: "start" }));
};

/* --- salon et tableau des scores ---------------------------------------------- */

function refreshPanel() {
  if (!connected) return;
  // Le HUD ne vit que pendant la manche. Il est en DOM : laisse affiche sous le
  // salon, il aurait montre une barre de vie et un chronometre figes.
  showHud(phase === PHASE_ROUND);
  // Le bilan passe DEVANT le salon et non par-dessus : tant que les deux
  // etaient le meme ecran, le joueur ne lisait jamais le sien.
  if (phase === PHASE_ROUND || bilanOpen) { panel.hidden = true; return; }
  panel.hidden = false;

  const isHost = myId === hostId;
  const hostName = lobby.find(l => l.id === hostId)?.name ?? "?";

  /* Le salon s'appelle toujours « Salon », meme apres une manche : c'est le
     bilan qui porte le resultat, et deux ecrans qui annoncent la meme chose
     n'en font lire aucun. Le tableau, lui, garde les lignes de la derniere
     manche — c'est de l'information consultable, pas un titre. */
  panelTitle.textContent = "Salon";
  summary.textContent = lobby.length > 1
    ? `${lobby.length} joueurs connectés`
    : "en attente de joueurs";
  renderScores(lastResult ? lastResult.rows : lobby.map(l => ({
    id: l.id, name: l.name, colorIndex: l.colorIndex,
    score: 0, kills: 0, deaths: 0, total: l.total,
  })));

  renderVote();
  renderClasses();
  renderMeta();
  renderAccount();

  startBtn.hidden = !isHost;
  startBtn.disabled = !isHost;
  waitMsg.textContent = isHost
    ? "tout le monde entre en jeu, spectateurs compris"
    : `en attente de ${hostName}…`;
}

/* Vote de difficulte. Chacun choisit, la majorite l'emporte, et l'egalite
   retient le mode le plus doux : personne ne doit pouvoir imposer cauchemar
   a la table en etant seul de son avis. */
function renderVote() {
  voteRow.innerHTML = "";

  DIFFICULTIES.forEach((d, i) => {
    const btn = document.createElement("button");
    const n = tally[i] ?? 0;
    btn.innerHTML = `${d.label}` + (n > 0 ? ` <span class="tally">${n}</span>` : "");
    btn.classList.toggle("mine", i === myVote);
    btn.classList.toggle("winner", i === difficulty);
    btn.onclick = () => {
      if (phase !== PHASE_LOBBY) return;
      myVote = i;
      ws.send(JSON.stringify({ t: "vote", v: i }));
      renderVote();
    };
    voteRow.appendChild(btn);
  });

  const retenu = DIFFICULTIES[difficulty]?.label ?? "normal";
  voteHint.textContent = lobby.length > 1
    ? `mode retenu : ${retenu} — à égalité, le plus doux l'emporte`
    : `mode retenu : ${retenu}`;
}

/* Choix de classe. Les emplacements uniques deja pris sont grises : le serveur
   refuse de toute facon le doublon, mais un bouton qui ne repond pas sans rien
   dire passe pour une panne. Une fois la premiere manche jouee, la classe est
   verrouillee pour la session — le selecteur reste affiche, en lecture seule,
   pour qu'on sache avec quoi on joue. */
/* Les trois statistiques comparees, normalisees sur la MEILLEURE des classes et
   non sur une valeur absolue : la question du salon est « laquelle encaisse le
   plus », pas « combien de points de vie fait un Rempart ». */
const CLASS_STATS = [
  { nom: "PV", val: c => c.hp, texte: c => String(c.hp) },
  { nom: "dégâts", val: c => c.damageMul, texte: c => pourcent(c.damageMul) },
  { nom: "vitesse", val: c => c.speedMul, texte: c => pourcent(c.speedMul) },
];

function pourcent(mul) {
  const p = Math.round((mul - 1) * 100);
  return (p > 0 ? "+" : p < 0 ? "−" : "±") + Math.abs(p) + " %";
}

/* Silhouette du personnage, a l'ECHELLE REELLE du jeu et surtout AVEC LE MEME
   SPRITE : le panneau montre exactement ce qu'on aura a l'ecran. Un dessin a
   part aurait menti au premier reglage — c'est la meme raison qui fait qu'il
   n'y a qu'une table de couleurs et qu'une echelle typographique.

   Elle passe donc par `drawSprite`, comme toute entite du jeu, sur le contexte
   du petit canvas plutot que sur celui de l'arene. C'est tout l'interet d'un
   point de passage qui prend son contexte en argument. */
const CLASS_SIL_PX = 88;

function paintClassSilhouette(cv2, c) {
  // Meme regle que l'arene : la memoire du canvas suit la densite de l'ecran,
  // sinon la silhouette est floue exactement la ou on la regarde de pres.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv2.width = Math.round(CLASS_SIL_PX * dpr);
  cv2.height = Math.round(CLASS_SIL_PX * dpr);
  cv2.style.width = CLASS_SIL_PX + "px";
  cv2.style.height = CLASS_SIL_PX + "px";

  const g = cv2.getContext("2d");
  const s = 1.4;                     // l'arene est vue de plus loin que ce panneau
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.translate(CLASS_SIL_PX / 2, CLASS_SIL_PX / 2);

  g.strokeStyle = SURFACE.line;
  g.lineWidth = 1;
  g.beginPath(); g.arc(0, 0, (CFG.PLAYER_RADIUS + 8) * s, 0, Math.PI * 2); g.stroke();

  drawSprite(g, frameOf(`c_${c.id}_idle`), 0, 0,
    { scaleX: s, scaleY: s, tint: c.couleur });
}

function renderClasses() {
  if (!classRow) return;
  classRow.innerHTML = "";

  const me = lobby.find(l => l.id === myId);
  const mine = me?.cls ?? null;
  const locked = me?.clsLocked ?? false;
  const taken = new Map();
  for (const l of lobby) {
    if (l.cls === null || l.cls === undefined) continue;
    if (CLASSES[l.cls]?.unique && l.id !== myId) taken.set(l.cls, l.name);
  }

  const maxi = CLASS_STATS.map(st => Math.max(...CLASSES.map(st.val)));

  CLASSES.forEach((c, i) => {
    const btn = document.createElement("button");
    const pris = taken.get(i);
    btn.className = "classOpt";
    btn.style.borderColor = c.couleur;
    btn.style.color = c.couleur;
    btn.disabled = locked || !!pris;
    btn.classList.toggle("mine", i === mine);
    btn.classList.toggle("taken", !!pris);

    /* Les barres portent la couleur de la classe (`currentColor`) : trois
       panneaux de barres grises se seraient ressemble au point qu'on aurait
       compare les longueurs sans savoir laquelle appartient a qui. */
    const stats = CLASS_STATS.map((st, k) =>
      `<div class="statRow">` +
        `<span class="statName">${st.nom}</span>` +
        `<span class="statBar"><i style="width:${Math.round(st.val(c) / maxi[k] * 100)}%"></i></span>` +
        `<span class="statVal">${escapeHtml(st.texte(c))}</span>` +
      `</div>`).join("");

    btn.innerHTML =
      `<div class="classHead">` +
        `<canvas class="classSil"></canvas>` +
        `<div>` +
          `<div class="className">${escapeHtml(c.nom)}</div>` +
          `<div class="classRole">${escapeHtml(c.desc)}</div>` +
        `</div>` +
      `</div>` +
      `<div class="classStats">${stats}</div>` +
      c.skills.map(s =>
        `<div class="classSkill"><span class="key">${escapeHtml(s.touche)}</span>` +
        `<span><b>${escapeHtml(s.nom)}</b> — ${escapeHtml(s.desc)}</span></div>`
      ).join("") +
      (pris ? `<div class="classTaken">pris par ${escapeHtml(pris)}</div>` : "");

    paintClassSilhouette(btn.querySelector(".classSil"), c);

    btn.onclick = () => {
      if (locked || pris) return;
      ws.send(JSON.stringify({ t: "pickClass", cls: i }));
    };
    classRow.appendChild(btn);
  });

  if (!classHint) return;
  if (locked) {
    classHint.textContent =
      `classe verrouillée pour la session : ${classAt(mine ?? CLASS_DEFAULT).nom}`;
  } else if (mine === null || mine === undefined) {
    classHint.textContent =
      `sans choix explicite, tu entres en ${CLASSES[CLASS_DEFAULT].nom} — le choix se verrouille au lancement`;
  } else {
    classHint.textContent = "le choix se verrouille au lancement de la première manche";
  }
}

/* --- progression permanente (lot D) ---------------------------------------------

   Le panneau vit dans le salon. Il montre l'arbre de la classe SELECTIONNEE :
   comparer trois arbres a la fois n'aide personne, et c'est de toute facon
   cette classe-la qu'on va jouer. Les tables viennent de
   `shared/progression.js` — le serveur n'envoie que l'etat du compte, et il
   valide chaque achat de son cote : ces boutons ne sont qu'une demande. */

const metaEl = document.getElementById("meta");
const metaCoresEl = document.getElementById("metaCores");
const metaSubEl = document.getElementById("metaSub");
const metaTreeEl = document.getElementById("metaTree");
const metaConfortEl = document.getElementById("metaConfort");
const metaMilestonesEl = document.getElementById("metaMilestones");

function renderMeta() {
  if (!metaEl) return;
  if (!progressState) { metaEl.hidden = true; return; }
  metaEl.hidden = false;

  const pr = progressState;
  const me = lobby.find(l => l.id === myId);
  const cdef = classAt(me?.cls ?? CLASS_DEFAULT);
  const clsId = cdef.id;
  const cp = pr.classes?.[clsId] ?? { tiers: {}, equipped: [] };
  const slots = slotsFor(cp);
  const equipped = cp.equipped ?? [];

  metaCoresEl.textContent = `${pr.cores} noyaux`;
  metaSubEl.textContent =
    `arbre du ${cdef.nom} — ${equipped.length} / ${slots} emplacements équipés · `
    + `réattribution libre entre les manches`;

  metaTreeEl.innerHTML = "";
  for (const line of TREES[clsId] ?? []) {
    const n = cp.tiers?.[line.id] | 0;
    const cost = tierCost(n);
    const isEquipped = equipped.includes(line.id);

    const row = document.createElement("div");
    row.className = "metaLine" + (isEquipped ? " equipped" : "");
    row.innerHTML =
      `<span class="metaName">${escapeHtml(line.nom)}</span>` +
      `<span class="metaPips">${"●".repeat(n)}${"○".repeat(PROG_CFG.TIERS_MAX - n)}</span>` +
      // A zero palier on montre le pas — c'est ce qu'on achete — sinon le TOTAL
      // possede, qui est ce qu'on a.
      `<span class="metaDesc">${escapeHtml(n > 0 ? line.desc(n) : line.desc(1) + " par palier")}</span>`;

    const buy = document.createElement("button");
    buy.className = "metaBuy";
    if (n >= PROG_CFG.TIERS_MAX) {
      buy.textContent = "max";
      buy.disabled = true;
    } else {
      buy.textContent = `${cost} ◈`;
      buy.disabled = pr.cores < cost || phase !== PHASE_LOBBY;
      buy.onclick = () => ws.send(JSON.stringify({ t: "metaBuy", cls: clsId, line: line.id }));
    }

    const eq = document.createElement("button");
    eq.className = "metaEquip" + (isEquipped ? " on" : "");
    eq.textContent = isEquipped ? "équipée" : "équiper";
    // On peut toujours DESEQUIPER, meme sans emplacement libre : c'est
    // precisement comme ca qu'on en libere un.
    eq.disabled = n <= 0 || (!isEquipped && equipped.length >= slots) || phase !== PHASE_LOBBY;
    eq.onclick = () => {
      const lines = isEquipped ? equipped.filter(l => l !== line.id) : [...equipped, line.id];
      ws.send(JSON.stringify({ t: "metaEquip", cls: clsId, lines }));
    };

    row.append(buy, eq);
    metaTreeEl.appendChild(row);
  }

  /* Le tronc de confort : commun aux trois classes, ne consomme aucun
     emplacement — d'ou une liste a part, sans bouton d'equipement. */
  metaConfortEl.innerHTML = "";
  for (const cf of CONFORT) {
    const owned = (pr.confort ?? []).includes(cf.id);
    const cost = PROG_CFG.CONFORT_COSTS[cf.id];
    const row = document.createElement("div");
    row.className = "metaLine confort";
    row.innerHTML =
      `<span class="metaName">${escapeHtml(cf.nom)}</span>` +
      `<span class="metaDesc">${escapeHtml(cf.desc)}</span>`;
    const b = document.createElement("button");
    b.className = "metaBuy";
    if (owned) {
      b.textContent = "acquise";
      b.disabled = true;
    } else {
      b.textContent = `${cost} ◈`;
      b.disabled = pr.cores < cost || phase !== PHASE_LOBBY;
      b.onclick = () => ws.send(JSON.stringify({ t: "metaConfort", id: cf.id }));
    }
    row.appendChild(b);
    metaConfortEl.appendChild(row);
  }

  /* Les jalons de deblocage : ce qui reste a accomplir est une promesse de
     contenu, l'afficher fait partie du systeme. */
  const done = new Set(pr.milestones ?? []);
  metaMilestonesEl.innerHTML = MILESTONES.map(m => {
    const ok = done.has(m.id);
    return `<span class="metaJalon${ok ? " done" : ""}">`
      + `${ok ? "✓" : "•"} ${escapeHtml(m.label)}`
      + ` <small>(${m.unlocks.length} carte${m.unlocks.length > 1 ? "s" : ""})</small></span>`;
  }).join("");
}

/* --- compte a pseudo reserve -----------------------------------------------------

   Deux gestes : reserver (pseudo -> code secret affiche une fois) et recuperer
   (pseudo + code -> la progression suit sur ce navigateur). Le serveur valide
   tout ; ces boutons ne sont que des demandes, comme les achats de l'arbre. */

const accountEl = document.getElementById("account");
const accStatusEl = document.getElementById("accStatus");
const accClaimPseudo = document.getElementById("accClaimPseudo");
const accClaimBtn = document.getElementById("accClaim");
const accCodeEl = document.getElementById("accCode");
const accCodeHandle = document.getElementById("accCodeHandle");
const accCodeValue = document.getElementById("accCodeValue");
const accRecPseudo = document.getElementById("accRecPseudo");
const accRecCode = document.getElementById("accRecCode");
const accRecoverBtn = document.getElementById("accRecover");
const accMsgEl = document.getElementById("accMsg");

function renderAccount() {
  if (!accountEl) return;
  if (!progressState) { accountEl.hidden = true; return; }
  accountEl.hidden = false;

  const pseudo = progressState.pseudo || "";
  const handle = pseudo + (progressState.tag ? "#" + progressState.tag : "");
  accStatusEl.textContent = pseudo
    ? `pseudo réservé : ${handle} — re-réserver régénère le code (l'ancien meurt)`
    : "aucun pseudo réservé — la progression ne vit que dans ce navigateur";
  if (!accClaimPseudo.value) {
    accClaimPseudo.value = pseudo || nameInput.value;
  }
  const inLobby = phase === PHASE_LOBBY;
  accClaimBtn.disabled = !inLobby;
  accRecoverBtn.disabled = !inLobby;
}

accClaimBtn.onclick = () => {
  const pseudo = accClaimPseudo.value.trim();
  if (!pseudo) return;
  accMsgEl.textContent = "";
  ws.send(JSON.stringify({ t: "claim", pseudo }));
};

accRecoverBtn.onclick = () => {
  const pseudo = accRecPseudo.value.trim();
  const code = accRecCode.value.trim();
  if (!pseudo || !code) return;
  accMsgEl.textContent = "";
  ws.send(JSON.stringify({ t: "recover", pseudo, code }));
};

function renderScores(rows, body = scoresBody) {
  body.innerHTML = "";
  const head = document.createElement("tr");
  head.innerHTML = "<th>joueur</th><th>classe</th><th>niv.</th><th>score</th><th>kills</th><th>morts</th><th>dégâts</th><th>cartes</th><th>noyaux</th><th>cumul</th>";
  body.appendChild(head);

  for (const r of rows) {
    const tr = document.createElement("tr");
    const col = PLAYER_COLORS[r.colorIndex % PLAYER_COLORS.length];
    const tag = r.id === hostId ? " ★" : "";
    // `cls` peut etre nul : un joueur qui n'a rien choisi et n'a pas encore
    // joue n'a pas de classe, et lui en afficher une serait mentir.
    const cdef = (r.cls === null || r.cls === undefined) ? null : classAt(r.cls);
    tr.innerHTML =
      `<td class="name" style="color:${col}">${escapeHtml(r.name)}${tag}</td>` +
      `<td class="sub"${cdef ? ` style="color:${cdef.couleur}"` : ""}>${cdef ? escapeHtml(cdef.nom) : "—"}</td>` +
      `<td>${r.level ?? 1}</td>` +
      `<td>${r.score}</td><td>${r.kills}</td><td>${r.deaths}</td>` +
      // `damage` n'existe pas cote serveur avant ce systeme : un onglet reste
      // sur une version anterieure du client doit quand meme afficher un
      // tableau coherent plutot que "undefined".
      `<td>${Math.round(r.damage ?? 0)}</td>` +
      `<td class="cards">${cardBadges(r.id)}</td>` +
      // Noyaux gagnes sur la manche (lot D). Un tiret pour les lignes du salon
      // et les serveurs anterieurs, qui n'envoient pas le champ.
      `<td class="sub">${r.cores !== undefined ? "+" + r.cores : "—"}</td>` +
      `<td class="sub">${r.total ? r.total.score : 0}</td>`;
    /* La LIGNE ouvre la fenetre de build. Les pastilles de cartes etaient la
       depuis le debut mais illisibles : c'est ici, le tableau sous les yeux,
       qu'on veut comprendre pourquoi quelqu'un a fait trois fois plus de
       degats. Le clic sur la ligne entiere et non sur un bouton dedie — la
       cible est plus grande et il n'y a rien d'autre a faire d'une ligne. */
    tr.className = "clickable";
    tr.title = "voir la build";
    tr.onclick = () => openBuild(r.id);
    body.appendChild(tr);
  }
}

/* --- bilan de fin de manche -------------------------------------------------
   Deux temps, et non un seul ecran : le bilan d'abord, le salon ensuite. Le
   joueur ne lisait jamais son resultat parce que l'ecran suivant etait deja
   la — avec le tableau, les classes, la difficulte et le bouton de lancement
   par-dessus. Le bouton « continuer » existe pour ceux qui ont deja regarde,
   le delai pour ceux qui ont laché la souris. */
const BILAN_MS = 8000;

let bilanOpen = false;
let bilanFrom = 0;
let bilanHandle = null;

function showBilan(res) {
  bilanOpen = true;
  bilanFrom = performance.now();
  bilanEl.hidden = false;
  panel.hidden = true;

  /* LE TITRE PARLE DE VAGUES. « Manche 1 terminée » apres douze vagues
     enchainees se lisait comme un compteur casse : le numero de manche etait
     juste, c'est l'unite de jeu qui a change. La vague atteinte est ce que la
     table retient de sa partie, donc c'est elle qui titre ; le numero de manche
     descend avec les autres chiffres. Repli sur le numero de manche si le
     serveur ne transmet pas la vague — un serveur anterieur au lot. */
  bilanTitle.textContent = res.wave
    ? `Partie terminée — vague ${res.wave} atteinte`
    : `Partie terminée`;
  /* Duree et kills en gros chiffres : ce sont les deux seules mesures qui
     valent pour la table entiere, et elles ouvrent la lecture du tableau. */
  bilanStats.innerHTML =
    `<div class="bilanStat"><span class="val">${escapeHtml(fmtTime(res.time))}</span>` +
    `<span class="lab">survie</span></div>` +
    `<div class="bilanStat"><span class="val">${res.kills}</span>` +
    `<span class="lab">kills</span></div>` +
    `<div class="bilanStat"><span class="val">${res.rows.length}</span>` +
    `<span class="lab">joueurs</span></div>` +
    `<div class="bilanStat"><span class="val">${res.round}</span>` +
    `<span class="lab">manche</span></div>`;
  renderHurtBy(res.rows);
  renderScores(res.rows, bilanScoresBody);

  clearInterval(bilanHandle);
  bilanHandle = setInterval(stepBilan, 100);
  stepBilan();
}

/* DE QUOI L'EQUIPE EST MORTE. Une ligne de barres, une par provenance, en part
   du total encaisse par la table.

   Agrege sur l'EQUIPE et non par joueur, et c'est un choix : cinq colonnes de
   plus dans le tableau des scores l'auraient rendu illisible a quatre joueurs,
   alors que la question — « qu'est-ce qui nous a tues » — se pose au collectif.
   Le detail par joueur existe deja ailleurs pour ce qui le merite (la fenetre de
   build, ouverte depuis une ligne du tableau).

   Rien ne s'affiche si personne n'a rien pris : une rangee de zeros n'est pas
   une information, et une manche parfaite ne doit pas se lire comme une erreur
   d'affichage. */
function renderHurtBy(rows) {
  const total = DAMAGE_SOURCES.map(() => 0);
  for (const r of rows) {
    for (let i = 0; i < total.length; i++) total[i] += (r.hurtBy?.[i] ?? 0);
  }
  const somme = total.reduce((a, b) => a + b, 0);
  if (somme <= 0) { bilanHurt.hidden = true; bilanHurt.innerHTML = ""; return; }
  bilanHurt.hidden = false;

  // Tri DECROISSANT : ce qui a le plus fait mal se lit en premier. Les
  // provenances a zero sortent — elles n'apprennent rien et diluent la ligne.
  const parts = DAMAGE_SOURCES
    .map((s, i) => ({ i, label: s.label, val: total[i] }))
    .filter(p => p.val > 0)
    .sort((a, b) => b.val - a.val);

  let html = `<div class="hurtTitle">dégâts subis par l'équipe</div>`;
  for (const p of parts) {
    const pct = Math.round(p.val / somme * 100);
    html += `<div class="hurtRow">` +
      `<span class="hurtIco"></span>` +
      `<span class="hurtLab">${escapeHtml(p.label)}</span>` +
      `<span class="hurtBar"><i style="width:${pct}%"></i></span>` +
      `<span class="hurtVal">${pct} %</span>` +
    `</div>`;
  }
  bilanHurt.innerHTML = html;
  // Les glyphes sont poses APRES coup : `iconImg` rend un element et non une
  // chaine, et le coller dans du HTML l'aurait fait passer par une adresse
  // `data:` recopiee cinq fois au lieu d'une image mise en cache.
  const icos = bilanHurt.querySelectorAll(".hurtIco");
  parts.forEach((p, k) => icos[k]?.appendChild(iconImg(SRC_ICON[p.i], HUD.low, 14)));
}

function stepBilan() {
  if (!bilanOpen) return;
  const k = Math.max(0, 1 - (performance.now() - bilanFrom) / BILAN_MS);
  bilanBarFill.style.width = `${k * 100}%`;
  bilanHint.textContent = `le salon s'ouvre dans ${Math.ceil(k * BILAN_MS / 1000)} s`;
  if (k <= 0) closeBilan();
}

function closeBilan() {
  clearInterval(bilanHandle);
  bilanHandle = null;
  bilanOpen = false;
  bilanEl.hidden = true;
  refreshPanel();
}

bilanGo.onclick = closeBilan;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* --- cartes d'amelioration ------------------------------------------------- */

// Pastilles compactes pour le tableau de fin : une par carte distincte, avec
// le multiplicateur si plusieurs exemplaires. Les noms complets tiendraient
// mal a quatre joueurs sur une ligne, d'ou l'abreviation par ×N plutot que
// de repeter la carte autant de fois qu'elle a ete prise.
/* Cartes possedees d'un joueur, en Map id -> exemplaires. C'est la forme
   qu'attendent `computeMods` et `cardDetail` cote partage : la garder identique
   evite d'avoir deux representations du meme chargement dans le client. */
/* Liste brute des cartes d'un joueur. Le message `loadout` est la source en
   jeu ; le bilan de fin de manche est la source une fois revenu au salon, ou
   plus aucun `loadout` n'arrive. Une seule fonction pour les deux, sinon la
   fenetre de build aurait affiche une liste vide sur exactement l'ecran ou on
   veut la consulter. `lastResult` est remis a null au lancement d'une manche :
   aucun risque d'afficher le chargement de la precedente. */
function cardListOf(playerId) {
  const live = loadouts.get(playerId);
  if (live && live.length) return live;
  return lastResult?.rows.find(r => r.id === playerId)?.cards ?? [];
}

function ownedCounts(playerId) {
  const counts = new Map();
  for (const id of cardListOf(playerId)) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

function cardBadges(playerId) {
  const counts = ownedCounts(playerId);
  if (counts.size === 0) return "";

  let html = "";
  for (const [id, n] of counts) {
    const card = CARD_BY_ID.get(id);
    if (!card) continue;
    const col = RARITY_COLOR[card.rarity] ?? RARITY_COLOR[0];
    html += `<span class="cardBadge" style="border-color:${col};color:${col}">` +
      `${escapeHtml(card.nom)}${n > 1 ? ` ×${n}` : ""}</span>`;
  }
  return html;
}

/* Un glyphe par FAMILLE, pas un par carte. Cinq a huit signes, le joueur les
   apprend en deux manches et reconnait la nature d'une offre avant de l'avoir
   lue ; soixante icones n'auraient rien appris a personne et auraient coute
   soixante dessins. Trait seulement, dans la couleur de rarete du panneau
   (`currentColor`) — une seconde couleur ici aurait concurrence la seule qui
   porte une information sur cet ecran.

   La carte de secours n'a pas de famille : elle prend le losange neutre. */
const FAMILY_ICON = {
  degats:   `<path d="M12 2 L16 9 L12 22 L8 9 Z"/>`,                      // lame
  cadence:  `<path d="M13 2 L5 13 h5 l-1 9 l9 -12 h-5 z"/>`,              // eclair
  mobilite: `<path d="M4 6 l6 6 l-6 6 M13 6 l6 6 l-6 6"/>`,               // double chevron
  survie:   `<path d="M12 2 L20 6 v6 c0 5 -4 8 -8 10 c-4 -2 -8 -5 -8 -10 V6 Z"/>`,
  soutien:  `<path d="M12 3 v18 M3 12 h18"/>`,                            // croix
};
const FAMILY_ICON_DEFAULT = `<path d="M12 3 L21 12 L12 21 L3 12 Z"/>`;

function familyIcon(famille) {
  const d = FAMILY_ICON[famille] ?? FAMILY_ICON_DEFAULT;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"` +
         ` stroke-width="2" stroke-linejoin="miter">${d}</svg>`;
}

// Ferme l'ecran de choix et son minuteur d'affichage. Fonction unique plutot
// que de repeter les quatre lignes a chaque point de sortie (fin de manche,
// abandon, reprise apres choix, deconnexion).
function closeCards() {
  cardsState = null;
  cardsPending = [];
  stopCardsTimer();
  cardsEl.hidden = true;
}

// Envoi de la carte choisie. L'ecran reste ouvert mais bascule en mode
// attente : le serveur seul decide de la reprise, cf. le commentaire sur le
// message "state" plus haut.
function pickCard(id) {
  if (!cardsState || cardsState.picked) return;
  cardsState.picked = true;
  cardsState.pickedId = id;
  ws.send(JSON.stringify({ t: "pickCard", id }));
  renderCards();
}

function renderCards() {
  if (!cardsState) { cardsEl.hidden = true; return; }
  cardsEl.hidden = false;

  /* Le titre dit d'ou vient le choix. Les cartes ne tombent plus a la mort d'un
     boss mais a chaque niveau d'equipe, en fin de vague : sans cette mention,
     l'ecran s'ouvrait sans qu'on sache ce qui l'avait declenche.
     `more` compte les choix qui suivent celui-ci — l'annoncer evite qu'on
     prenne le second ecran pour un bug d'affichage du premier. */
  const suite = cardsState.more > 0
    ? ` — encore ${cardsState.more} choix après celui-ci`
    : "";
  cardsTitle.textContent = cardsState.bossWave
    ? `${bossAt(cardsState.bossKind).nom.toUpperCase()} ${ROMAN[cardsState.boss] ?? cardsState.boss}`
      + ` vaincu — niveau ${cardsState.level}${suite}`
    : `Vague ${cardsState.wave} terminée — niveau ${cardsState.level}${suite}`;

  /* La carte dit son effet, ce qu'on en possede deja, et ce que l'exemplaire
     suivant y ajoute. Sans les deux dernieres lignes, un joueur qui a deux
     Affutage lit « +12 % de dégâts » et n'a aucun moyen de comparer une
     troisieme carte de degats a une premiere carte defensive — c'est-a-dire
     exactement la decision que l'ecran est cense lui faire prendre.

     `cardDetail` compose les chaines dans `cards.js`, a cote de la table : le
     client place des div, il ne calcule pas de valeur de carte. */
  const owned = ownedCounts(myId);

  cardsRow.innerHTML = "";
  for (const c of cardsState.offers) {
    const col = RARITY_COLOR[c.rarity] ?? RARITY_COLOR[0];
    const d = cardDetail(c.id, owned);
    const btn = document.createElement("button");
    /* La rarete est une CLASSE et non une couleur de bordure : chaque palier a
       un materiau — bordure plate, bordure epaisse, lueur, degrade balaye — et
       c'est le materiau qui la rend reconnaissable au coin de l'oeil. Le
       detail vit dans `ui.css`, a cote des autres regles de rendu. */
    btn.className = `cardOpt r${c.rarity ?? 0}`;
    btn.style.color = col;
    btn.disabled = cardsState.picked;
    /* Selection : la carte prise se verrouille, les deux autres s'estompent.
       Le joueur doit voir ce qu'il a ECARTE — c'est la moitie de la decision,
       et l'ecran se fermait dessus sans rien en montrer. */
    if (cardsState.picked) {
      btn.classList.add(cardsState.pickedId === c.id ? "picked" : "faded");
    }

    // Le serveur reste la source de `desc` (c'est lui qui a tire la carte) ;
    // le reste est deduit localement du chargement, que le client connait deja.
    /* La famille et le palier tiennent sur la ligne de rarete : « épique » a
       gauche, « dégâts — palier 3 / 4 » a droite. C'est ce qui rend la
       progression lisible sans lire les effets — un joueur qui prend le palier 2
       sait du meme coup qu'il en existe un au-dessus, et que ses paliers
       inferieurs ne lui seront plus proposes. */
    /* L'EFFET est la ligne la plus grosse de la carte, pas le nom : c'est ce
       qu'on compare entre trois cartes en trente secondes. Le nom ne sert qu'a
       la reconnaitre une fois prise. */
    let html =
      `<div class="cardTop">` +
        `<span class="cardIcon">${familyIcon(d?.familleId)}</span>` +
        `<span class="cardName">${escapeHtml(c.nom)}</span>` +
      `</div>` +
      `<div class="cardMeta">` +
        `<span class="cardRarity">${RARITY_LABEL[c.rarity] ?? ""}</span>` +
        (d?.famille ? `<span class="cardFamily">${escapeHtml(d.famille)}</span>` : "") +
      `</div>` +
      /* CATEGORIE ET RANG. La categorie est la seule couleur de la carte qui ne
         soit pas celle de la rarete, et c'est assume : elle reprend la grammaire
         fonctionnelle (rouge offensif, cyan defensif, vert soutien, violet
         zone), donc elle se reconnait avant d'etre lue. Le rang, lui, est en
         teinte neutre : c'est un chiffre, pas un signal. */
      (d ? `<div class="cardCat">` +
        `<span class="catDot" style="background:${CARD_CATEGORY_COLOR[d.categorieId]}"></span>` +
        `<span class="catName" style="color:${CARD_CATEGORY_COLOR[d.categorieId]}">` +
          `${escapeHtml(d.categorie)}</span>` +
        `<span class="catRank">${escapeHtml(d.rang)}</span>` +
      `</div>` : "") +
      `<div class="cardBody">` +
        `<div class="cardMain">${escapeHtml(c.desc)}</div>` +
        (d?.effectif ? `<div class="cardCond">${escapeHtml(d.effectif)}</div>` : "") +
        (d?.avertissement ? `<div class="cardWarn">${escapeHtml(d.avertissement)}</div>` : "") +
      `</div>`;

    // Le pied dit l'ETAT : ce qu'on possede, et ce que l'exemplaire suivant
    // donnera. Sans la ligne avant/apres, le choix n'est pas decidable.
    if (d && (d.cumul || d.valeur)) {
      html += `<div class="cardFoot">` +
        (d.cumul ? `<span>${escapeHtml(d.cumul)}</span>` : "") +
        (d.valeur ? `<span class="cardDelta">${escapeHtml(d.valeur)}</span>` : "") +
      `</div>`;
    }

    btn.innerHTML = html;
    btn.onclick = () => pickCard(c.id);
    cardsRow.appendChild(btn);
  }

  /* « Relance » (lot D) : une nouvelle offre, une fois par manche. Le bouton
     vit dans la rangee des cartes, en derniere position — c'est un choix de
     tirage, pas une action d'ecran. Le serveur repond par un nouveau message
     `cards` qui reconstruit tout cet etat. */
  if (cardsState.reroll && !cardsState.picked) {
    const rb = document.createElement("button");
    rb.id = "cardsReroll";
    rb.innerHTML = "↻<br>relancer<br>le tirage";
    rb.title = "une seule relance par manche";
    rb.onclick = () => {
      cardsState.reroll = false;
      rb.disabled = true;
      ws?.send(JSON.stringify({ t: "reroll" }));
    };
    cardsRow.appendChild(rb);
  }

  renderCardsWait();
  startCardsTimer();
}

// La liste des joueurs connus (pseudo par id) vient du salon, deja tenue a
// jour par le message "lobby" — inutile de la faire transiter une seconde
// fois dans les messages de cartes.
function renderCardsWait() {
  if (!cardsState) return;
  const names = cardsPending.filter(id => id !== myId).map(id => nameOf(id));
  cardsWaitEl.textContent = names.length ? `en attente de ${names.join(", ")}…` : "";
}

function stopCardsTimer() {
  if (cardsTimerHandle) { clearInterval(cardsTimerHandle); cardsTimerHandle = null; }
}

function startCardsTimer() {
  stopCardsTimer();
  updateCardsTimer();
  cardsTimerHandle = setInterval(updateCardsTimer, 250);
}

// `deadline` est un Date.now() serveur : un ecart d'une seconde entre les
// horloges des machines de la LAN est sans consequence, donc pas besoin de
// synchronisation, juste d'une lecture reguliere du delta local.
/* Un FILET qui se vide sous le titre, et non un chiffre : le chiffre demandait
   de quitter les cartes des yeux pour lire un nombre, alors que la seule
   question est « est-ce que j'ai encore le temps de comparer ». Il vire a
   l'ambre sur le dernier quart — la, la reponse est non. */
function updateCardsTimer() {
  if (!cardsState) return;
  const span = Math.max(1, cardsState.deadline - cardsState.from);
  const k = Math.max(0, Math.min(1, (cardsState.deadline - Date.now()) / span));
  cardsTimerFill.style.width = `${k * 100}%`;
  cardsTimerEl.classList.toggle("urgent", k < 0.25);
}

/* ===========================================================================
   FENETRE DE BUILD
   Un seul ecran pour trois entrees : Tab en jeu, un clic sur une ligne du
   bilan, un clic sur une ligne du salon. Le panneau d'inventaire du lot 1 en
   etait deja la moitie — il ne manquait que la selection du joueur.

   Pourquoi elle existe : le bilan affichait les cartes de chacun en pastilles,
   sans moyen de les lire. Or c'est exactement le moment ou l'on veut comprendre
   pourquoi quelqu'un a fait trois fois plus de degats — et la reponse tient
   dans les MULTIPLICATEURS, pas dans la liste de cartes qu'il faut lire ligne a
   ligne pour la reconstituer de tete.
   =========================================================================== */

const buildEl = document.getElementById("build");
const buildName = document.getElementById("buildName");
const buildClass = document.getElementById("buildClass");
const buildSil = document.getElementById("buildSil");
const buildStats = document.getElementById("buildStats");
const buildMods = document.getElementById("buildMods");
const buildSkills = document.getElementById("buildSkills");
const buildCards = document.getElementById("buildCards");

let buildTarget = 0;
let buildPaintedAt = 0;

/* Qui l'on peut inspecter, dans l'ordre. En jeu ce sont les joueurs presents
   dans l'instantane ; au salon, ceux du dernier bilan ; a defaut, la table du
   salon. Trois sources et une seule liste : les fleches doivent parcourir la
   meme chose quel que soit l'ecran d'ou la fenetre a ete ouverte. */
function buildRoster() {
  if (phase === PHASE_ROUND && latest) return [...latest.players.keys()];
  if (lastResult) return lastResult.rows.map(r => r.id);
  return lobby.filter(l => !l.spectator).map(l => l.id);
}

/* Tout ce que la fenetre affiche d'un joueur, ramene a une seule forme. Les
   statistiques viennent de l'instantane en jeu et du bilan au salon — la
   fenetre, elle, ne connait qu'un objet. */
function buildInfo(id) {
  const live = phase === PHASE_ROUND ? latest?.players.get(id) : null;
  const row = lastResult?.rows.find(r => r.id === id);
  const lob = lobby.find(l => l.id === id);
  const cls = live?.cls ?? row?.cls ?? lob?.cls ?? null;
  return {
    id,
    name: nameOf(id),
    colorIndex: lob?.colorIndex ?? 0,
    cls,
    counts: ownedCounts(id),
    score: live?.score ?? row?.score ?? 0,
    kills: live?.kills ?? row?.kills ?? 0,
    deaths: live?.deaths ?? row?.deaths ?? 0,
    damage: Math.round(live?.damage ?? row?.damage ?? 0),
  };
}

/* Les multiplicateurs EFFECTIFS, calcules par la meme fonction que la
   simulation (`fullMods`, exportee par game_state) : Vœu partagé compris, part
   de vague du « Cœur de forge » comprise, repli de classe compris. Recoder ce
   calcul ici aurait donne deux resultats differents sur l'ecran dont le seul
   but est de verifier un chargement. */
function buildMultipliers(info) {
  const others = [];
  for (const id of buildRoster()) if (id !== info.id) others.push(ownedCounts(id));
  const wave = latest?.wave ?? 1;
  return fullMods(info.counts, others, info.cls ?? CLASS_DEFAULT, wave);
}

/* Un multiplicateur se lit « ×1,84 » et non « +84 % » : c'est la forme sous
   laquelle on compare deux joueurs d'un coup d'oeil, et celle du tableau des
   scores qu'on est en train d'expliquer. La cadence est un INTERVALLE cote
   simulation — plus il est court, plus on tire — donc on affiche son inverse,
   sinon la seule ligne du panneau ou « plus grand » veut dire « pire ». */
function fmtMul(v) {
  return "×" + v.toFixed(2).replace(".", ",");
}

/* `get` rend le chiffre qui sert a COLORER la ligne — un multiplicateur, donc
   comparable a 1 dans les deux sens. `fmt` ne sert qu'a l'ecrire autrement
   quand le multiplicateur seul ne dit pas ce qu'il faut savoir : le critique se
   juge sur sa chance ET sur son multiplicateur, et « ×1,38 » cache les deux. */
const BUILD_MODS = [
  { nom: "dégâts", get: m => m.damageMul },
  { nom: "cadence", get: m => 1 / Math.max(0.01, m.fireIntervalMul) },
  { nom: "critique", get: m => 1 + m.critChance * (m.critMul - 1),
    fmt: m => `${Math.round(m.critChance * 100)} % · ${fmtMul(m.critMul)}` },
  { nom: "rayon", get: m => m.areaMul },
  { nom: "vitesse", get: m => m.speedMul },
  { nom: "dégâts subis", get: m => m.damageTakenMul, bas: true },
];

function renderBuild() {
  const roster = buildRoster();
  if (roster.length === 0) { closeBuild(); return; }
  if (!roster.includes(buildTarget)) buildTarget = roster[0];

  const info = buildInfo(buildTarget);
  const col = PLAYER_COLORS[info.colorIndex % PLAYER_COLORS.length];
  const def = classAt(info.cls ?? CLASS_DEFAULT);
  const { mods, maxHp } = buildMultipliers(info);

  buildName.textContent = info.name;
  buildName.style.color = col;
  // `cls` peut etre nul : un joueur qui n'a jamais joue n'a pas de classe, et
  // lui en afficher une serait mentir.
  buildClass.textContent = info.cls === null || info.cls === undefined
    ? "sans classe" : def.nom;
  const sansClasse = info.cls === null || info.cls === undefined;
  buildClass.style.color = sansClasse ? "" : def.couleur;
  /* Meme sprite que dans l'arene, par `drawSprite` comme toute entite : un
     dessin a part aurait menti au premier reglage. Cachee quand le joueur n'a
     pas de classe — `classAt` se replie sur le tireur, et dessiner un tireur
     sous un libelle « sans classe » aurait ete la seule ligne fausse de
     l'ecran. */
  buildSil.hidden = sansClasse;
  if (!sansClasse) paintClassSilhouette(buildSil, def);

  buildStats.innerHTML = [
    ["score", info.score], ["kills", info.kills],
    ["morts", info.deaths], ["dégâts", info.damage], ["PV max", maxHp],
  ].map(([lab, val]) =>
    `<div class="buildStat"><span class="val">${escapeHtml(String(val))}</span>` +
    `<span class="lab">${escapeHtml(lab)}</span></div>`).join("");

  buildMods.innerHTML = BUILD_MODS.map(d => {
    const v = d.get(mods);
    // Vert quand c'est un gain, ambre quand c'en est un cout : la grammaire de
    // couleur du depot, sur la seule ligne du panneau ou un chiffre peut aller
    // dans les deux sens.
    const bon = d.bas ? v < 0.995 : v > 1.005;
    const mauvais = d.bas ? v > 1.005 : v < 0.995;
    const cls = bon ? " gain" : mauvais ? " cout" : "";
    const txt = d.fmt ? d.fmt(mods) : fmtMul(v);
    return `<div class="buildMod${cls}"><span class="lab">${escapeHtml(d.nom)}</span>` +
      `<span class="val">${escapeHtml(txt)}</span></div>`;
  }).join("");

  // Les deux competences de la classe, avec leur touche : la fenetre sert aussi
  // a se rappeler ce que fait la classe d'un allie qu'on ne joue jamais.
  buildSkills.innerHTML = sansClasse ? "" :
    def.skills.map(s =>
      `<div class="buildSkill"><span class="key">${escapeHtml(s.touche)}</span>` +
      `<span><b>${escapeHtml(s.nom)}</b> — ${escapeHtml(s.desc)}</span></div>`).join("");

  renderBuildCards(info.counts);
}

/* Les cartes, groupees par rarete DECROISSANTE : une legendaire perdue au
   milieu de dix communes ne se remarque pas, alors qu'elle est precisement ce
   qu'on veut voir d'un coup d'oeil.

   Chaque carte porte sa description complete, celle du tirage — donc en metres
   et avec ses valeurs effectives, composee par `cardDetail` a cote de la table.
   Une pastille avec le seul nom ne repondait a aucune question. */
function renderBuildCards(counts) {
  buildCards.innerHTML = "";
  if (counts.size === 0) {
    buildCards.innerHTML = `<div class="buildEmpty">aucune carte</div>`;
    return;
  }

  const rows = [...counts.entries()].sort((a, b) =>
    (CARD_BY_ID.get(b[0])?.rarity ?? 0) - (CARD_BY_ID.get(a[0])?.rarity ?? 0));

  let rarity = -1;
  for (const [id, n] of rows) {
    const card = CARD_BY_ID.get(id);
    if (!card) continue;
    const col = RARITY_COLOR[card.rarity] ?? RARITY_COLOR[0];

    if (card.rarity !== rarity) {
      rarity = card.rarity;
      const h = document.createElement("div");
      h.className = "buildRarity";
      h.style.color = col;
      h.textContent = RARITY_LABEL[rarity] ?? "";
      buildCards.appendChild(h);
    }

    const d = cardDetail(id, counts);
    const row = document.createElement("div");
    row.className = "buildCard";
    // La couleur de rarete est posee sur la LIGNE : le filet de gauche et
    // l'icone la prennent en `currentColor`, une seule source par ligne.
    row.style.color = col;
    /* Le TOTAL cumule et non le gain unitaire : c'est la question a laquelle ce
       panneau repond. « Affûtage ×3 » ne disait pas +36 %, et il fallait faire
       la multiplication de tete au milieu d'une vague. */
    const total = card.stack ? card.stack(n) : "";
    row.innerHTML =
      `<span class="buildCardIcon">${familyIcon(d?.familleId)}</span>` +
      `<div class="buildCardBody">` +
        `<div class="buildCardHead">` +
          `<span class="buildCardName">${escapeHtml(card.nom)}${n > 1 ? ` ×${n}` : ""}</span>` +
          (total ? `<span class="buildCardTotal">${escapeHtml(total)}</span>` : "") +
        `</div>` +
        `<div class="buildCardDesc">${escapeHtml(d?.desc ?? "")}</div>` +
        (d?.avertissement ? `<div class="buildCardWarn">${escapeHtml(d.avertissement)}</div>` : "") +
      `</div>`;
    buildCards.appendChild(row);
  }
}

function openBuild(id) {
  const roster = buildRoster();
  if (roster.length === 0) return;
  buildTarget = roster.includes(id) ? id : roster[0];
  buildEl.hidden = false;
  renderBuild();
}

function closeBuild() { buildEl.hidden = true; }

function cycleBuild(step) {
  if (buildEl.hidden) return;
  const roster = buildRoster();
  if (roster.length === 0) return;
  const i = roster.indexOf(buildTarget);
  buildTarget = roster[((i < 0 ? 0 : i) + step + roster.length) % roster.length];
  renderBuild();
}

document.getElementById("buildPrev").onclick = () => cycleBuild(-1);
document.getElementById("buildNext").onclick = () => cycleBuild(1);

/* ===========================================================================
   MENU PAUSE
   La contrainte est structurelle : le serveur est autoritaire et simule en
   continu, donc UNE PAUSE N'A DE SENS QU'A UN SEUL JOUEUR. A plusieurs, le
   panneau s'ouvre quand meme — c'est le seul endroit d'ou l'on regle le son ou
   quitte une manche — mais la partie continue derriere, et le panneau le dit.

   Le client ne DECIDE de rien : il demande, le serveur accorde ou non, et
   `pauseReal` ne vaut vrai que sur la reponse. Se fier au client ici, c'est
   accepter qu'un onglet modifie fige une partie a quatre.
   =========================================================================== */

const pauseEl = document.getElementById("pause");
const pauseState = document.getElementById("pauseState");
const pauseConfirm = document.getElementById("pauseConfirm");
const pauseQuitBtn = document.getElementById("pauseQuit");

let pauseReal = false;     // le serveur a vraiment cesse de simuler

function renderPauseState() {
  pauseState.textContent = pauseReal
    ? "simulation figée — personne d'autre n'attend"
    : "la partie continue — pause indisponible à plusieurs";
  pauseState.classList.toggle("live", !pauseReal);
  // Un spectateur n'a pas de manche a quitter : lui proposer un bouton qui ne
  // fait rien vaut moins que ne rien proposer.
  pauseQuitBtn.hidden = amSpectator;
}

function openPause() {
  if (phase !== PHASE_ROUND) return;
  pauseEl.hidden = false;
  pauseConfirm.hidden = true;
  if (!amSpectator) ws?.send(JSON.stringify({ t: "pause", on: 1 }));
  renderPauseState();
}

function closePause() {
  if (pauseEl.hidden) return;
  pauseEl.hidden = true;
  pauseConfirm.hidden = true;
  // On leve la pause meme si le serveur ne l'avait pas accordee : le message
  // est sans effet dans ce cas, et le tester ici aurait fait deux chemins la
  // ou un seul suffit.
  ws?.send(JSON.stringify({ t: "pause", on: 0 }));
}

document.getElementById("pauseResume").onclick = closePause;
document.getElementById("pauseBuild").onclick = () => openBuild(myId);
pauseQuitBtn.onclick = () => { pauseConfirm.hidden = false; };
document.getElementById("pauseQuitNo").onclick = () => { pauseConfirm.hidden = true; };
document.getElementById("pauseQuitYes").onclick = () => {
  ws?.send(JSON.stringify({ t: "leaveRound" }));
  closePause();
};

/* --- reception des snapshots --------------------------------------------------- */

function ingest(msg) {
  const now = performance.now();
  if (lastSnapAt) ping = Math.round(now - lastSnapAt);
  lastSnapAt = now;

  const snap = {
    recvAt: now,
    tm: msg.tm,
    over: msg.ov === 1,
    kills: msg.k,
    slow: msg.sl === 1,
    players: new Map(msg.p.map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], hp: a[3], downed: a[4] === 1,
      revive: a[5], aimX: a[6], aimY: a[7], kills: a[8],
      buffs: a[9], score: a[10], deaths: a[11], shield: a[12],
      level: a[13] ?? 1, maxHp: a[14] ?? CFG.PLAYER_MAX_HP, prog: a[15] ?? 0,
      dashCd: a[16] ?? 0, dashing: a[17] === 1,
      // ajouts recents, repli a 0 : un onglet reste sur une version anterieure
      // du client continue de lire un tableau plus court sans planter.
      orbiters: a[18] ?? 0, frostRadius: a[19] ?? 0,
      // Classe et competences. Repli sur la classe par defaut : un serveur
      // anterieur n'envoie pas le champ, et le client doit alors dessiner un
      // joueur ordinaire plutot que de planter sur un index inconnu.
      cls: a[20] ?? CLASS_DEFAULT, cd1: a[21] ?? 0, cd2: a[22] ?? 0,
      skillFlags: a[23] ?? 0, bombStock: a[24] ?? 0,
      // Etats. Le masque suffit pour les icones et les halos ; seuls les cumuls
      // de Vulnerabilite et le decompte de Sentence valent un nombre a eux, le
      // second parce que le decompte EST l'information.
      statuses: a[25] ?? 0, vuln: a[26] ?? 0, doom: a[27] ?? 0,
      // Degats cumules, pour la fenetre de build ouverte en jeu. Repli a 0 : un
      // serveur anterieur ne l'envoie pas, la fenetre affiche alors zero plutot
      // que de planter.
      damage: a[28] ?? 0,
      // Provenance du dernier degat encaisse. Repli sur le contact, qui est le
      // cas majoritaire : un serveur anterieur au lot ne l'envoie pas, et le
      // chiffre rouge porte alors l'icone la plus probable au lieu d'aucune.
      src: a[29] ?? 0,
      // Troisieme competence (lot C) : recharge et palier possede. Repli a 0 —
      // un serveur anterieur n'envoie rien, la pastille reste alors grisee,
      // qui est exactement l'etat « pas de carte ».
      cd3: a[30] ?? 0, skill3: a[31] ?? 0,
    }])),
    /* Le champ de type porte trois informations pour n'en couter qu'une seule
       sur chacun des 200 ennemis, vingt fois par seconde : le type, le rang
       d'elite (+100) et le marquage de retardataire (+200). L'ordre du decodage
       compte — `elite` doit retirer les 200 avant de tester les 100. */
    enemies: new Map(msg.e.map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], hp: a[3], maxHp: a[4],
      type: a[5] % 100, elite: a[5] % 200 >= 100, straggler: a[5] >= 200, ang: a[6],
      // Compteur de touches, ajout en fin de tuple. Repli a 0 : un serveur
      // anterieur ne l'envoie pas, le compteur reste constant, et le module
      // d'evenements retombe alors sur l'ancien comportement — un flash par
      // variation de PV.
      hitSeq: a[7] ?? 0,
    }])),
    /* `heal` en fin de tuple : le projectile du mode soin se dessine dans une
       autre couleur, c'est le seul moyen pour la table de voir d'un coup d'oeil
       que le soigneur a bascule.
       `owner` est l'ajout du lot A, en fin de tuple comme toujours : la balle
       prend la couleur de son tireur. Repli 0 — aucun joueur ne porte cet
       identifiant, `colorOf` retombe alors sur la premiere couleur, et un
       onglet reste sur une version anterieure du serveur dessine donc un tir
       uniforme au lieu de planter. */
    bullets: new Map(msg.b.map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], heal: a[3] ?? 0, owner: a[4] ?? 0,
    }])),
    shots: new Map(msg.s.map(a => [a[0], { id: a[0], x: a[1], y: a[2] }])),
    /* `spread`, `life` et `prox` sont des ajouts en fin de tuple : un serveur
       anterieur au lot 5 n'envoie rien, les replis a 0 font alors dessiner les
       formes connues et rien d'autre. `life > 0` est ce qui distingue une zone
       PERSISTANTE d'une detonation — c'est la seule information dont le rendu a
       besoin pour changer de langage visuel. */
    zones: msg.z.map(a => ({
      id: a[0], x: a[1], y: a[2], r: a[3], warn: a[4], blast: a[5],
      shape: a[6] ?? 0, w: a[7] ?? 0, h: a[8] ?? 0, ang: a[9] ?? 0,
      hole: a[10] ?? 0, warn0: a[11] || CFG.ZONE_WARN,
      spread: a[12] ?? 0, life: a[13] ?? 0, prox: a[14] ?? 0,
    })),
    /* Arene mobile. Cles absentes tant que rien ne bouge : le repli est l'arene
       pleine, ce qui est aussi ce que lit un onglet reste sur une version
       anterieure — il joue alors sans voir la couronne, degrade mais jamais
       menteur sur la position des entites. */
    bounds: msg.bn
      ? { x0: msg.bn[0], y0: msg.bn[1], x1: msg.bn[2], y1: msg.bn[3],
          nx0: msg.bn[4], ny0: msg.bn[5], nx1: msg.bn[6], ny1: msg.bn[7],
          warn: msg.bn[8] }
      : { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H, warn: 0 },
    walls: msg.wl
      ? { x: msg.wl[0], y: msg.wl[1], t: msg.wl[2], k: msg.wl[3] }
      : null,
    powerups: msg.w.map(a => ({ id: a[0], x: a[1], y: a[2], type: a[3] })),
    turrets: (msg.tu ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], k: a[3], ang: a[4] })),
    bulwarks: (msg.bw ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], r: a[3], k: a[4] })),
    // Ancres et sanctuaires (lot C) : cles nommees, absentes d'un serveur
    // anterieur — le repli est la liste vide, rien a dessiner.
    anchors: (msg.an ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], r: a[3], k: a[4], vuln: a[5] ?? 0 })),
    sancts: (msg.sa ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], r: a[3], k: a[4] })),
    // `tx`/`ty` : le point de chute annonce, ajout en fin de tuple. Repli sur la
    // position courante — un serveur anterieur au lot ne l'envoie pas, et le
    // cercle d'atterrissage se colle alors a la bombe au lieu de mentir.
    bombs: new Map((msg.bm ?? []).map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], k: a[3], tx: a[4] ?? a[1], ty: a[5] ?? a[2],
    }])),
    // drones : entites mobiles comme les balles, on les garde en Map pour
    // pouvoir les interpoler pareil (lerpMap) entre deux snapshots. `owner`
    // est un ajout recent en fin de tuple, repli 0 (aucun joueur connu sous
    // cet id) pour qu'un onglet reste sur une version anterieure du serveur
    // continue de lire un tuple plus court sans planter.
    drones: new Map((msg.dr ?? []).map(a => [a[0], { id: a[0], x: a[1], y: a[2], ang: a[3], kind: a[4], owner: a[5] ?? 0 }])),
    effects: (msg.f ?? []).map(a => ({
      id: a[0], x: a[1], y: a[2], r: a[3], k: a[4], kind: a[5] ?? 0,
      x2: a[6], y2: a[7],
    })),
    boss: msg.bo
      ? { id: msg.bo[0], x: msg.bo[1], y: msg.bo[2], hp: msg.bo[3],
          maxHp: msg.bo[4], ang: msg.bo[5], index: msg.bo[6],
          bars: msg.bo[7] ?? 1, phase: msg.bo[8] ?? 0,
          // Ajouts en fin de tuple : l'index du roster et la jauge d'ultime.
          // Repli sur le Ravageur, qui est le boss d'origine — un serveur
          // anterieur au lot 4 n'en envoyait pas d'autre.
          kind: msg.bo[9] ?? 0, ult: msg.bo[10] ?? 0 }
      : null,
    // Second Jumeau : cle nommee, absente pour les quatre autres boss.
    boss2: msg.bo2
      ? { id: msg.bo2[0], x: msg.bo2[1], y: msg.bo2[2], ang: msg.bo2[3] }
      : null,
    /* Degats portes au boss depuis l'instantane precedent, par joueur. Cle
       nommee et absente hors combat ; le module d'evenements n'y lit que la
       ligne du joueur local. */
    bossDmg: msg.bd ?? null,
    // Marqueurs de mecanique de groupe. `hp` est un ratio : le client n'affiche
    // qu'une jauge, la valeur brute d'une cage ne lui apprendrait rien.
    marks: (msg.mk ?? []).map(a => ({
      id: a[0], x: a[1], y: a[2], r: a[3], k: a[4], mech: a[5],
      a: a[6], b: a[7], need: a[8], cur: a[9], hp: a[10],
    })),
    slip: msg.sp === 1,
    // Vague et progression commune. Cles nommees : un serveur anterieur qui ne
    // les envoie pas laisse simplement les replis en place.
    wave: msg.wv ?? 0,
    wavePhase: msg.wp ?? 0,
    waveBoss: msg.wbs === 1,
    waveProgress: msg.wb ?? 0,
    teamLevel: msg.xl ?? 1,
    teamProgress: msg.xp ?? 0,
  };

  latest = snap;
  snapshots.push(snap);
  while (snapshots.length > 40) snapshots.shift();

  /* La fenetre de build reste VIVANTE quand elle est ouverte en jeu : les
     degats et les kills montent pendant qu'on la lit. Deux fois par seconde et
     non a chaque instantane — repeindre une liste de quinze cartes vingt fois
     par seconde ferait recalculer la mise en page pour rien, exactement le cout
     que le HUD est venu chercher en memorisant ses valeurs. */
  if (!buildEl.hidden && now - buildPaintedAt > 500) {
    buildPaintedAt = now;
    renderBuild();
  }

  const me = snap.players.get(myId);
  /* Fin de recharge de la bombe. On la detecte sur la RESERVE et non sur `cd1`,
     qui vaut deja zero quand il reste une charge sous le coude : c'est le
     passage d'une charge de plus qui rend le lancer possible. L'anneau de
     portee ne s'affiche que dans la foulee (voir drawBombRange) — permanent, il
     serait un cercle de plus a l'ecran a cent ennemis, et il ne dit rien tant
     qu'on n'a pas de bombe a lancer. */
  if (me) {
    const stock = me.bombStock ?? 0;
    if (stock > bombStockSeen) bombReadyAt = performance.now();
    bombStockSeen = stock;
  } else {
    bombStockSeen = 0;
  }

  if (me) {
    // Pendant une esquive, l'ecart avec le serveur depasse volontairement le
    // seuil de recalage : recaler la ferait avorter a mi-course.
    const dashing = dash.t > 0 || me.dashing;
    if (!predicted || me.downed
        || (!dashing && Math.hypot(me.x - predicted.x, me.y - predicted.y) > SNAP_THRESHOLD)) {
      predicted = { x: me.x, y: me.y };
    }
  } else {
    predicted = null;
  }
}

/* --- saisie ---------------------------------------------------------------------- */

const keys = new Set();

/* Esquive. Le serveur reste seul juge, mais on la joue aussi en local : sans
   prediction, on appuie et il ne se passe rien pendant un aller-retour reseau,
   ce qui est precisement le moment ou on avait besoin d'etre ailleurs. La
   recharge affichee, elle, vient toujours du serveur. */
const dash = { pending: false, t: 0, cd: 0, x: 0, y: 0 };

/* Competences : deux demandes ponctuelles, exactement comme l'esquive. Elles ne
   sont PAS predites localement, contrairement au bond : leurs effets (rempart,
   provocation, bombe) sont des entites de la simulation, et une entite predite
   qui n'existe pas cote serveur est bien pire qu'un aller-retour de latence. */
const skills = { s1: false, s2: false, s3: false };

function requestSkill(n) {
  if (phase !== PHASE_ROUND || amSpectator || cardsState) return;
  // Menu pause ouvert : meme raison que le deplacement. Une competence lancee
  // depuis un menu part sur une situation qu'on ne regarde pas.
  if (!pauseEl.hidden) return;
  if (latest?.players.get(myId)?.downed) return;
  if (n === 1) skills.s1 = true;
  else if (n === 2) skills.s2 = true;
  else skills.s3 = true;
}

addEventListener("keydown", e => {
  const repeat = keys.has(e.code);
  keys.add(e.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)
      && document.activeElement !== nameInput) e.preventDefault();

  if (e.code === "Space" && !repeat && !e.repeat) requestDash();
  /* Digit1/Digit2 et non la touche imprimee : sur un clavier AZERTY, les
     chiffres du rang superieur demandent Maj, et `e.key` vaudrait "&" ou "é".
     KeyQ/KeyE en second jeu : ce sont les deux voisines immediates de la main
     de deplacement (A/E en AZERTY, Q/E en QWERTY), donc atteignables sans
     lacher ZQSD — le rang des chiffres, lui, demande de decoller la main en
     pleine vague. KeyA est deja pris par le deplacement, d'ou KeyQ. */
  const s1 = e.code === "Digit1" || e.code === "Numpad1" || e.code === "KeyQ";
  const s2 = e.code === "Digit2" || e.code === "Numpad2" || e.code === "KeyE";
  /* La troisieme competence (lot C) : touche 3, alias clic milieu plus bas.
     KeyR en second jeu, pour la meme raison que KeyQ/KeyE — la voisine
     immediate de la main de deplacement, atteignable sans lacher ZQSD. */
  const s3 = e.code === "Digit3" || e.code === "Numpad3" || e.code === "KeyR";
  if (s1 && !repeat && !e.repeat) requestSkill(1);
  if (s2 && !repeat && !e.repeat) requestSkill(2);
  if (s3 && !repeat && !e.repeat) requestSkill(3);
});

/* Clic milieu : alias de la troisieme competence. Contrairement au clic droit
   (retire — il reste d'abord un menu contextuel), le clic milieu n'a aucun
   role dans un jeu plein ecran ; son defilement automatique, lui, doit etre
   coupe, sinon chaque declenchement fait deriver la page. Sur le canvas
   uniquement : ailleurs (une page de depannage ouverte a cote), il garde son
   sens. */
cv.addEventListener("mousedown", e => {
  if (e.button !== 1) return;
  e.preventDefault();
  requestSkill(3);
});

/* Le clic droit etait un alias de la competence 1. Retire : dans un navigateur
   un clic droit reste d'abord un menu contextuel, et le declenchement partait
   sur des clics qui ne visaient pas le jeu. On garde en revanche la suppression
   du menu sur le canvas uniquement — ailleurs (champ de pseudo), il reste
   utile. */
cv.addEventListener("contextmenu", e => e.preventDefault());
addEventListener("keyup", e => keys.delete(e.code));
addEventListener("blur", () => keys.clear());

// Tab affiche les cartes possedees. Le navigateur s'en sert par defaut pour
// deplacer le focus — sans preventDefault il fait aussi defiler la page une
// fois le focus sorti des champs, ce qui n'a aucun sens plein ecran. On laisse
// en revanche le comportement natif quand le pseudo est en cours de saisie,
// sinon impossible de tabuler jusqu'au bouton "Rejoindre".
addEventListener("keydown", e => {
  if (e.code !== "Tab" || document.activeElement === nameInput) return;
  e.preventDefault();
  if (cardsState) return;
  // La fenetre s'ouvre SUR SOI et se parcourt ensuite : c'est sa propre build
  // qu'on veut voir en pleine vague, celle des autres qu'on compare a froid.
  if (buildEl.hidden) openBuild(myId); else closeBuild();
});

/* Fleches gauche et droite : on passe d'un joueur a l'autre sans refermer.
   Refermer et rouvrir pour comparer deux chargements, c'est perdre le point de
   comparaison entre les deux — or comparer est tout ce que cet ecran sert a
   faire. Echap ferme.

   Le gestionnaire est monte en CAPTURE et sort tout de suite quand la fenetre
   est fermee : sans ca, les fleches de deplacement du jeu seraient interceptees
   pendant toute la manche. */
addEventListener("keydown", e => {
  if (buildEl.hidden) return;
  if (e.code !== "ArrowLeft" && e.code !== "ArrowRight" && e.code !== "Escape") return;
  e.preventDefault();
  /* `stopImmediatePropagation` et non `stopPropagation` : les autres
     gestionnaires de touches sont poses sur le MEME noeud (`window`), et
     `stopPropagation` ne bloque que les noeuds SUIVANTS — il les laisse donc
     tous s'executer. Le bug a existe : Echap fermait la fenetre de build et
     ouvrait le menu pause dans la meme frappe, si bien que la touche suivante
     le refermait et que le menu paraissait ne s'ouvrir qu'une fois sur deux.

     Sans cette coupure, la fleche naviguerait dans la fenetre ET ferait marcher
     le personnage, puisque le deplacement range les touches dans le meme jeu.
     Le `keyup`, lui, n'est pas coupe — la touche sort donc bien du jeu quand on
     la relache. */
  e.stopImmediatePropagation();
  if (e.code === "ArrowLeft") cycleBuild(-1);
  else if (e.code === "ArrowRight") cycleBuild(1);
  else closeBuild();
}, true);

/* Echap : le menu pause. L'ORDRE compte — la fenetre de build s'ouvre depuis le
   menu pause, donc Echap doit d'abord rendre le menu et seulement ensuite le
   fermer. Le gestionnaire de build ci-dessus coupe la propagation quand il est
   ouvert, ce qui produit exactement cet enchainement sans qu'aucun des deux ne
   connaisse l'autre. */
addEventListener("keydown", e => {
  if (e.code !== "Escape" || document.activeElement === nameInput) return;
  if (phase !== PHASE_ROUND) return;
  e.preventDefault();
  if (pauseEl.hidden) openPause(); else closePause();
});

function requestDash() {
  if (phase !== PHASE_ROUND || amSpectator || !predicted) return;
  if (!pauseEl.hidden) return;
  if (dash.cd > 0 || dash.t > 0) return;
  const me = latest?.players.get(myId);
  if (me?.downed) return;

  const m = readMove();
  let dx = m.x, dy = m.y;
  if (Math.hypot(dx, dy) < 0.01) { const a = aimVector(); dx = a.ax; dy = a.ay; }
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return;

  dash.x = dx / d;
  dash.y = dy / d;
  dash.t = CFG.DASH_TIME;
  dash.cd = myDashCd;
  dash.pending = true;
}

function readMove() {
  /* Menu pause ouvert : on ne bouge plus. En solo la simulation est figee et le
     mouvement predit derivait tout seul derriere le voile, pour se faire
     recaler sechement a la reprise. A plusieurs la partie continue vraiment, et
     un personnage qui court pendant qu'on regle le volume est encore pire.
     Le test est ici, au point de passage unique de la lecture des touches :
     la prediction locale et le paquet d'entree le voient tous les deux. */
  if (!pauseEl.hidden) return { x: 0, y: 0 };
  let x = 0, y = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp"))    y -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown"))  y += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft"))  x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  const d = Math.hypot(x, y);
  return d > 0 ? { x: x / d, y: y / d } : { x: 0, y: 0 };
}

const mouse = { x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2 };

function updateMouse(e) {
  const r = cv.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  // Vers les coordonnees MONDE, pas vers la memoire du canvas : depuis que
  // celle-ci suit la densite de pixels de l'ecran, les deux ne sont plus la
  // meme chose et viser aurait ete decale d'un facteur deux en 4K.
  mouse.x = (e.clientX - r.left) * (CFG.ARENA_W / r.width);
  mouse.y = (e.clientY - r.top) * (CFG.ARENA_H / r.height);
}
addEventListener("mousemove", updateMouse);
addEventListener("mousedown", updateMouse);

function aimVector() {
  const from = predicted ?? { x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2 };
  const dx = mouse.x - from.x, dy = mouse.y - from.y;
  const d = Math.hypot(dx, dy);
  return d > 0.001 ? { ax: dx / d, ay: dy / d } : { ax: 0, ay: 0 };
}

/* Distance au reticule, bornee ICI avec la meme fonction que le serveur. Le
   client n'y gagne aucun droit — le serveur reborne de toute facon — mais son
   apercu (anneau de portee, cercle d'atterrissage) doit annoncer exactement le
   lancer qui va partir, sinon il ment sur le seul point que ce lot corrige. */
function aimRange() {
  const from = predicted ?? { x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2 };
  return bombRange(Math.hypot(mouse.x - from.x, mouse.y - from.y));
}

setInterval(() => {
  if (!connected || ws.readyState !== WebSocket.OPEN) return;
  if (phase !== PHASE_ROUND || amSpectator) return;
  const m = readMove();
  const a = aimVector();
  // `ar` est CONTINU comme ax/ay : il part a chaque paquet et n'est jamais
  // remis a zero, contrairement aux trois drapeaux ponctuels ci-dessous.
  const msg = { t: "input", x: m.x, y: m.y, ax: a.ax, ay: a.ay, ar: aimRange() };
  if (dash.pending) { msg.d = 1; dash.pending = false; }
  if (skills.s1) { msg.s1 = 1; skills.s1 = false; }
  if (skills.s2) { msg.s2 = 1; skills.s2 = false; }
  if (skills.s3) { msg.s3 = 1; skills.s3 = false; }
  ws.send(JSON.stringify(msg));
}, 1000 / INPUT_HZ);

/* --- interpolation ----------------------------------------------------------------- */

function interpolated(renderTime) {
  if (snapshots.length === 0) return null;
  if (snapshots.length === 1) return flatten(snapshots[0]);

  let a = null, b = null;
  for (let i = snapshots.length - 1; i > 0; i--) {
    if (snapshots[i - 1].recvAt <= renderTime && snapshots[i].recvAt >= renderTime) {
      a = snapshots[i - 1];
      b = snapshots[i];
      break;
    }
  }
  if (!a) return flatten(snapshots[snapshots.length - 1]);

  const span = b.recvAt - a.recvAt;
  const k = span > 0 ? (renderTime - a.recvAt) / span : 0;

  const lerpMap = (ma, mb) => {
    const out = [];
    for (const [id, ea] of ma) {
      const eb = mb.get(id);
      out.push(eb
        ? { ...ea, x: ea.x + (eb.x - ea.x) * k, y: ea.y + (eb.y - ea.y) * k,
            aimX: ea.aimX + (eb.aimX - ea.aimX) * k, aimY: ea.aimY + (eb.aimY - ea.aimY) * k }
        : ea);
    }
    return out;
  };

  const lerpBoss = (ea, eb) => {
    if (!ea || !eb || ea.id !== eb.id) return eb;
    return { ...eb, x: ea.x + (eb.x - ea.x) * k, y: ea.y + (eb.y - ea.y) * k };
  };
  const boss = lerpBoss(a.boss, b.boss);
  const boss2 = lerpBoss(a.boss2, b.boss2);

  /* Les marqueurs suivent leur porteur ou glissent (sanctuaires) : ils sont
     donc interpoles comme des entites et non pris tels quels comme les zones.
     Un cercle de regroupement qui saute de 4 px vingt fois par seconde est
     exactement l'element qu'on regarde le plus pendant une mecanique.
     Le rempart, qui suit son tank depuis le lot A, a exactement le meme besoin :
     d'ou une fonction et non deux blocs recopies. Les listes indexees par
     identifiant passent par ici, les Map par `lerpMap` — c'est la seule
     difference entre les deux. */
  const lerpList = (la, lb) => {
    const prev = new Map((la ?? []).map(o => [o.id, o]));
    return (lb ?? []).map(o => {
      const p0 = prev.get(o.id);
      return p0 ? { ...o, x: p0.x + (o.x - p0.x) * k, y: p0.y + (o.y - p0.y) * k } : o;
    });
  };
  const marks = lerpList(a.marks, b.marks);

  return {
    tm: a.tm + (b.tm - a.tm) * k,
    over: b.over,
    kills: b.kills,
    slow: b.slow,
    playerList: lerpMap(a.players, b.players),
    enemyList: lerpMap(a.enemies, b.enemies),
    bulletList: lerpMap(a.bullets, b.bullets),
    shotList: lerpMap(a.shots, b.shots),
    droneList: lerpMap(a.drones, b.drones),
    bombList: lerpMap(a.bombs ?? new Map(), b.bombs ?? new Map()),
    zones: b.zones,
    powerups: b.powerups,
    turrets: b.turrets,
    /* Le rempart SUIT son tank depuis le lot A : il est donc interpole comme un
       marqueur et non pris tel quel comme une zone. Un disque de 6,5 m de rayon
       qui saute vingt fois par seconde sous les pieds du joueur est exactement
       l'element qu'on regarde le plus quand on tient une position — et il
       decrochait visiblement du personnage, qui est lui predit a l'image.
       Le rempart ANCRE traverse la meme fonction sans y perdre : sa position ne
       change pas d'un instantane a l'autre, l'interpolation est l'identite. */
    bulwarks: lerpList(a.bulwarks, b.bulwarks),
    // Ancres et sanctuaires : POSES au sol, leur position ne change jamais —
    // l'interpolation serait l'identite, on prend le snapshot le plus recent.
    anchors: b.anchors,
    sancts: b.sancts,
    effects: b.effects,
    boss, boss2, marks, slip: b.slip,
    // Limites et murs : des paliers, pas des positions. Interpoler une arene qui
    // se referme donnerait une limite a mi-chemin, c'est-a-dire une limite qui
    // ment sur l'endroit exact ou l'on prend des degats.
    bounds: b.bounds, walls: b.walls,
    // Etat de vague : pris tel quel sur le snapshot le plus recent, jamais
    // interpole. Ce sont des paliers, pas des positions — un numero de vague
    // a mi-chemin entre 6 et 7 n'aurait aucun sens.
    wave: b.wave, wavePhase: b.wavePhase, waveBoss: b.waveBoss,
    waveProgress: b.waveProgress,
    teamLevel: b.teamLevel, teamProgress: b.teamProgress,
  };
}

function flatten(s) {
  return {
    tm: s.tm, over: s.over, kills: s.kills, slow: s.slow,
    playerList: [...s.players.values()],
    enemyList: [...s.enemies.values()],
    bulletList: [...s.bullets.values()],
    shotList: [...s.shots.values()],
    droneList: [...s.drones.values()],
    bombList: [...(s.bombs?.values() ?? [])],
    zones: s.zones,
    powerups: s.powerups,
    turrets: s.turrets,
    bulwarks: s.bulwarks ?? [],
    anchors: s.anchors ?? [],
    sancts: s.sancts ?? [],
    effects: s.effects,
    boss: s.boss,
    boss2: s.boss2 ?? null,
    marks: s.marks ?? [],
    slip: s.slip ?? false,
    bounds: s.bounds ?? { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H, warn: 0 },
    walls: s.walls ?? null,
    wave: s.wave, wavePhase: s.wavePhase, waveBoss: s.waveBoss,
    waveProgress: s.waveProgress,
    teamLevel: s.teamLevel, teamProgress: s.teamProgress,
  };
}

/* --- rendu -------------------------------------------------------------------------- */

const ENEMY_TINT = ENEMY.TINT;

// Pose l'icone d'un etat, centree, dans la couleur de l'etat.
function paintStatusIcon(id, x, y, scale, opacite = 1) {
  const def = STATUSES[id];
  if (!def) return;
  paintIcon(ctx, STATUS_ICON[id], def.couleur, x, y, scale, opacite);
}

// Liste des etats actifs d'un joueur, dans l'ordre de la table.
function activeStatuses(p) {
  const out = [];
  for (const s of STATUSES) if (p.statuses & statusBit(s.id)) out.push(s.id);
  return out;
}

// Pose l'icone d'un bonus, centree sur (x, y), a l'echelle demandee.
function paintPowerupIcon(st, x, y, scale, opacite = 1) {
  paintIcon(ctx, st.icon, st.color, x, y, scale, opacite);
}

let bossAnnounce = 0;      // horodatage de l'arrivee du dernier boss
let lastBossId = 0;
let phaseAnnounce = 0;     // horodatage de la derniere barre brisee
let lastBossPhase = 0;

/* Bandeau d'alerte, TROIS niveaux. UNE consigne a la fois, la derniere recue :
   deux consignes empilees pendant qu'on esquive ne se lisent pas, et la plus
   recente est toujours celle qui compte. Chaque niveau a sa propre ligne pour
   qu'une information ne chasse jamais une consigne.

     consigne      cyan,  gros, avec compte a rebours
     avertissement ambre, court, sans compte a rebours
     information   blanc, discret, sans urgence

   Le cyan de la consigne n'est pas decoratif : c'est la couleur qui, dans
   toute la grammaire de marqueurs, veut dire « ceci te concerne, place-toi ».
   L'ambre reste au danger, le blanc a ce qui ne demande rien. */
let alertOrder = null;     // { texte, nom, from, until }
let alertWarn = null;
let alertInfo = null;

/* Les alertes arrivent hors du snapshot, donc SANS le retard d'interpolation :
   affichees a la reception, le bandeau precedait de 110 ms le telegraphe qu'il
   commente. On les met en file et on les sort sur l'horloge de rendu, comme
   les evenements — meme raison, meme horloge. */
const alertQueue = [];

/* MEME PIEGE, MEME REMEDE, pour les transitions de manche. Le serveur envoie
   `cards` a l'instant ou il constate l'arene vide ; le client, lui, dessine
   encore l'etat d'il y a 110 ms — ou deux ou trois ennemis vivent toujours.
   L'ecran de choix s'ouvrait donc PAR-DESSUS des ennemis visibles, et de facon
   irreguliere : ca ne se voit que si les derniers meurent groupes.
   Une file unique plutot qu'un `setTimeout` par message : l'ordre d'arrivee est
   preserve (`cardsWait` derriere son `cards`, `roundEnd` derriere son dernier
   `cards`) et il n'y a aucun minuteur disperse a annuler.
   REGLE : tout message ponctuel qui decrit un changement du MONDE se consomme
   ici. Les messages hors-monde — salon, choix de classe, tableau des scores,
   pause — s'appliquent a la reception : ils ne commentent aucune image. */
const worldQueue = [];
let cardsCloseQueued = false;

function pushWorld(fn) {
  worldQueue.push({ fn, at: performance.now() + INTERP_MS });
}

/* Jamais vide par `resetFeedback` : les transitions APPELLENT `resetFeedback`,
   une file videe depuis son propre element courant se perdrait elle-meme. */
function flushWorld(now) {
  while (worldQueue.length > 0 && worldQueue[0].at <= now) worldQueue.shift().fn();
}

function pushAlert(msg) {
  alertQueue.push({ msg, at: performance.now() + INTERP_MS });
}

function flushAlerts(now) {
  while (alertQueue.length > 0 && alertQueue[0].at <= now) {
    applyAlert(alertQueue.shift().msg, now);
  }
}

function applyAlert(msg, now) {
  /* Identite du boss : evenement PONCTUEL, il declenche l'annonce plein ecran.
     Le rendu la declenche aussi sur changement d'identifiant dans le snapshot —
     les deux chemins se recouvrent volontairement, un joueur qui rejoint en
     cours de combat n'a jamais recu le message et doit quand meme voir a qui il
     a affaire. */
  if (msg.boss !== undefined) {
    bossAnnounce = now;
    lastBossPhase = 0;
    alertOrder = null;
    alertWarn = null;
    alertInfo = null;
    return;
  }
  const def = mechAt(msg.mech);
  if (!def) return;
  /* Le bandeau DISPARAIT AVANT la resolution, et non une seconde apres comme
     il le faisait : un texte encore affiche au moment de l'impact masque
     exactement ce qu'il faut regarder, c'est-a-dire la zone qui explose. Les
     annonces sans duree (Miasme, ultime) tiennent 1,5 s. */
  const dur = msg.dur > 0 ? Math.max(800, msg.dur * 1000 - 250) : 1500;
  const entry = { nom: def.nom, texte: def.texte, from: now, until: now + dur };
  if (def.level === ALERT_ORDER) alertOrder = entry;
  else if (def.level === ALERT_WARN) alertWarn = entry;
  else alertInfo = entry;
}

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
const PARTICLE_GL = 3000;
// Une variable et non une constante : le batcher ne se branche qu'apres la
// generation de l'atlas, donc apres le chargement de ce module. Le plafond se
// fixe la, une fois qu'on sait quel chemin de rendu on a reellement obtenu.
let PARTICLE_MAX = PARTICLE_2D;
const HIT_FLASH = 0.06;        // eclair blanc de 60 ms sur l'ennemi touche
const HIT_KICK = 5;            // recul du sprite, en pixels
const SHAKE_MAX = 10;

const particles = [];
const hits = new Map();        // ennemi -> { until, dx, dy }
const shake = { x: 0, y: 0, mag: 0 };

// `myId` n'est pas encore connu a la construction : un accesseur plutot qu'une
// copie, sinon la diffusion resterait sur l'identifiant 0 toute la partie.
const pump = new EventPump(handleEvent, { get myId() { return myId; } });

/* Remise a zero entre deux manches. Sans elle, le premier snapshot d'une
   nouvelle manche se comparait au dernier de la precedente : deux cents morts
   d'un coup, un mur de bruit et trois cents fragments a l'ouverture. */
function resetFeedback() {
  pump.reset();
  particles.length = 0;
  deaths.length = 0;
  gridPings.length = 0;
  // La cadence des tireurs est DEDUITE des projectiles observes : gardee d'une
  // manche a l'autre, elle telegraphierait a partir d'un tir qui n'a pas eu
  // lieu dans celle-ci.
  shooterFire.clear();
  seenShots.clear();
  dmgAgg.clear();
  // Un cumul sous le seuil d'affichage attend la fenetre suivante : sans ce
  // vidage, le filet de soin de la manche precedente ressortirait sur la
  // premiere image de la suivante.
  selfAgg.clear();
  bulletTrail.clear();
  shotTrail.clear();
  lastPlayerPos.clear();
  // Lot E : tout ce que les zones ont depose meurt avec la manche — une
  // decoloration ou une direction de courant gardee d'une manche a l'autre
  // commenterait un sol qui n'existe plus.
  zoneCracks.clear();
  zoneMotion.clear();
  blastSeen.clear();
  scorches.length = 0;
  zoneFx = 0;
  resetHud();
  alertQueue.length = 0;
  hits.clear();
  hitQueue.length = 0;
  shake.mag = 0; shake.x = 0; shake.y = 0;
  alertOrder = null; alertWarn = null; alertInfo = null;
}

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

    case "mort":
      // La hauteur varie avec le type : c'est gratuit et ca suffit a entendre
      // la difference entre la pietaille et un gros.
      playSound("mort", { pitch: e.elite ? 0.6 : 1.3 - Math.min(0.6, e.type * 0.12) });
      spawnDeath(e.x, e.y, e.type, e.elite);
      // Le coup fatal porte son chiffre comme n'importe quelle touche : c'est
      // le seul degat du jeu qui n'apparaissait nulle part, alors qu'il est le
      // plus satisfaisant. Il passe par la meme agregation, donc il se fond
      // dans les touches qui l'ont precede au lieu d'ouvrir une seconde colonne.
      if (e.dmg > 0) aggregateDamage(e);
      break;

    case "bonus": playSound("bonus"); break;
    case "niveau": playSound("niveau"); break;
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
const hitQueue = [];

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
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.14, max: 0.14, col: COMBAT.flash, size: 2,
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
const deaths = [];
const DEATH_MAX = 30;
const DEATH_MS = 260;

function drawDeaths() {
  if (deaths.length === 0) return;
  const now = performance.now();
  for (let i = deaths.length - 1; i >= 0; i--) {
    const d = deaths[i];
    const k = (now - d.at) / DEATH_MS;
    if (k >= 1) { deaths[i] = deaths[deaths.length - 1]; deaths.pop(); continue; }
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

function spawnDeath(x, y, type, elite) {
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
  const n = elite ? (dense ? 22 : 10) : (dense ? 14 : 7);
  for (let i = 0; i < n && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 130;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.4, max: 0.4, col, size: elite ? 3.5 : 2.5,
    });
  }
  /* L'ECLAT. Un fragment blanc, immobile, gros et bref : en additif il sature
     le centre pendant deux images et c'est lui qui fait « lire » la mort comme
     un evenement plutot que comme une disparition. Il ne coute qu'une particule
     de plus, et le mode additif le rend gratuit a l'oeil comme au GPU. */
  if (particles.length < PARTICLE_MAX) {
    particles.push({
      x, y, vx: 0, vy: 0, life: 0.12, max: 0.12,
      col: COMBAT.flash, size: elite ? 13 : 8,
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
const bursts = [];
const BURST_MAX = 24;

function stepBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    bursts[i].t -= dt;
    if (bursts[i].t <= 0) { bursts[i] = bursts[bursts.length - 1]; bursts.pop(); }
  }
}

function drawBursts() {
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
const dmgAgg = new Map();

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
const selfAgg = new Map();

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

function flushSelf(now) {
  if (selfAgg.size === 0) return;
  for (const [cle, a] of selfAgg) {
    if (now - a.at < SELF_AGG_MS) continue;
    // Rien d'affichable : on garde le cumul et on rouvre une fenetre plutot que
    // de le jeter. Voir l'en-tete — ce garde-fou dort tant que les PV circulent
    // arrondis.
    if (Math.round(a.sum) < 1) { a.at = now; continue; }
    selfAgg.delete(cle);
    hudDamage(a.x, a.y - 26, a.sum, a.kind,
              a.kind === "hurt" ? (SRC_ICON[a.src] ?? null) : null);
  }
}

function flushDamage(now) {
  if (dmgAgg.size === 0) return;
  for (const [id, a] of dmgAgg) {
    if (now - a.at < DMG_AGG_MS) continue;
    dmgAgg.delete(id);
    if (a.sum >= a.maxHp * DMG_THRESHOLD) {
      hudDamage(a.x + (Math.random() - 0.5) * 18, a.y - 22, a.sum, "deal");
    }
  }
}

function stepFeedback(dt) {
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
  }
  stepBursts(dt);

  const now = performance.now();
  if (hitQueue.length > 0) flushHitQueue(now);
  if (hits.size > 0) {
    for (const [id, h] of hits) if (h.until < now) hits.delete(id);
  }
}

/* Case blanche de l'atlas, teintee a la volee : c'est ce qui fait passer les
   fragments par le MEME lot que les entites. Sans elle il faudrait un second
   chemin de rendu pour dessiner des carres. */
let fxWhite = 0;

function drawParticles() {
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
      drawSprite(ctx, fxWhite, p.x, p.y, {
        scaleX: p.size / SPRITE_CELL,
        scaleY: p.size / SPRITE_CELL,
        tint: p.col,
        alpha: Math.max(0, p.life / p.max),
        additive: true,
      });
    }
    return;
  }

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// Vitesse portee de la prediction locale. Elle ne sert qu'au sol glissant du
// Metronome et rejoue exactement la formule du serveur — sinon le personnage
// prevu et le personnage reel divergent de plus de 90 px et se recalent sec.
const slipV = { x: 0, y: 0 };

let lastFrame = performance.now();

/* Compteur de performance, sur `?perf` dans l'adresse. Il n'est pas decoratif :
   le lot demande de MESURER les images par seconde avec 300 particules et 200
   ennemis, et une mesure qu'on ne peut pas refaire ne vaut rien. Hors de ce
   drapeau il ne coute pas une ligne de rendu. */
const PERF = location.search.includes("perf");
let fps = 0;

function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  // Moyenne glissante sur environ une seconde : l'inverse du dt brut saute de
  // 45 a 75 d'une image a l'autre et ne se lit pas.
  if (PERF && dt > 0) fps += (1 / dt - fps) * Math.min(1, dt * 1.5);

  /* Hors du `if` : une transition en attente doit sortir meme quand il n'y a
     plus d'instantane a dessiner — c'est precisement le cas de `roundEnd`. */
  flushWorld(now);

  /* L'INTENSITE musicale suit l'etat du jeu, relue a chaque image. C'est une
     cible : le sequenceur glisse vers elle — montee franche, descente lente —
     et chaque couche (kick, basse, charleys, acide) nait au seuil qui la
     concerne. Ici on ne fait que dire au juke-box a quel point ca chauffe. */
  setMusicIntensity(gameIntensity());

  if (connected && latest) {
    const renderTime = now - INTERP_MS;
    if (phase === PHASE_ROUND) {
      stepPrediction(dt);
      /* Diffusion des evenements sur l'horloge de RENDU et non a la reception :
         c'est ce qui fait tomber le son sur l'image et non 110 ms avant. */
      pump.pump(snapshots, renderTime);
      flushAlerts(now);
      flushDamage(now);
      flushSelf(now);
    }
    stepFeedback(dt);
    draw(interpolated(renderTime) ?? flatten(latest));
  } else {
    // Hors manche : le sol seul, sur la couche du dessous. Les deux autres sont
    // videes a chaque image — un canvas WebGL qu'on cesse de dessiner garde un
    // contenu indefini, et la derniere image de la manche precedente aurait pu
    // reapparaitre par-dessous le salon.
    ctx = underCtx;
    ctx.fillStyle = SURFACE.arena;
    ctx.fillRect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
    drawGrid();
    overCtx.clearRect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
    gl?.begin();
    gl?.end();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function stepPrediction(dt) {
  dash.cd = Math.max(0, dash.cd - dt);
  dash.t = Math.max(0, dash.t - dt);

  const me = latest.players.get(myId);
  if (!me) { predicted = null; return; }
  if (!predicted) { predicted = { x: me.x, y: me.y }; return; }

  if (me.downed || latest.over) {
    predicted.x = me.x; predicted.y = me.y;
    dash.t = 0;
    return;
  }

  /* Prison : le serveur fige le joueur, la prediction doit le figer aussi.
     Sans ca on jouait quatre secondes a cote de son propre personnage, puis on
     revenait d'un coup dans la cage — le pire des deux mondes. */
  if ((latest.marks ?? []).some(m => m.mech === MECH_JAIL && m.a === myId)) {
    predicted.x = me.x; predicted.y = me.y;
    dash.t = 0;
    slipV.x = 0; slipV.y = 0;
    return;
  }

  // Position d'avant deplacement : elle dit de quel cote d'un mur de
  // verrouillage on se trouvait, exactement comme cote serveur.
  const wasX = predicted.x, wasY = predicted.y;

  if (dash.t > 0) {
    predicted.x += dash.x * CFG.DASH_SPEED * dt;
    predicted.y += dash.y * CFG.DASH_SPEED * dt;
  } else {
    const m = readMove();
    if (latest.slip) {
      // Meme formule que `_players` cote serveur : la vitesse REJOINT la
      // consigne au lieu de la prendre.
      const k = Math.min(1, BOSS_CFG.SLIP_ACCEL * dt);
      slipV.x += (m.x * CFG.PLAYER_SPEED - slipV.x) * k;
      slipV.y += (m.y * CFG.PLAYER_SPEED - slipV.y) * k;
      predicted.x += slipV.x * dt;
      predicted.y += slipV.y * dt;
    } else {
      slipV.x = m.x * CFG.PLAYER_SPEED;
      slipV.y = m.y * CFG.PLAYER_SPEED;
      predicted.x += m.x * CFG.PLAYER_SPEED * dt;
      predicted.y += m.y * CFG.PLAYER_SPEED * dt;
    }
  }

  /* Les memes limites que le serveur, et le meme blocage sur les murs. Sans ca,
     la prediction marchait droit dans la couronne d'une constriction ou a
     travers un mur de verrouillage : le rappel la ramenait ensuite en continu,
     ce qui donne exactement le recalage permanent qu'on cherche a eviter. */
  const r = CFG.PLAYER_RADIUS;
  const B = latest.bounds ?? { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H };
  predicted.x = Math.min(Math.max(predicted.x, B.x0 + r), B.x1 - r);
  predicted.y = Math.min(Math.max(predicted.y, B.y0 + r), B.y1 - r);
  const W = latest.walls;
  if (W) {
    const t = W.t / 2 + r;
    if (Math.abs(predicted.x - W.x) < t) predicted.x = wasX <= W.x ? W.x - t : W.x + t;
    if (Math.abs(predicted.y - W.y) < t) predicted.y = wasY <= W.y ? W.y - t : W.y + t;
  }

  // Pendant l'esquive, on relache le rappel vers la position serveur : le
  // dash local est en avance d'un aller-retour, le corriger en direct
  // donnerait un mouvement qui bafouille au pire moment.
  const pull = 1 - Math.exp((dash.t > 0 ? -1.2 : -6) * dt);
  predicted.x += (me.x - predicted.x) * pull;
  predicted.y += (me.y - predicted.y) * pull;
}

/* Ce que le jeu dit a la musique : un seul nombre entre 0 et 1. Tres doux au
   salon, montee avec les vagues, souffle pendant le repit, pic sur le boss —
   qui se tend encore a mesure que ses barres tombent, parce que la fin d'un
   combat est son moment le plus dangereux. Les coefficients sont des reglages
   d'oreille, pas de la simulation : ils n'ont rien a faire dans CFG. */
function gameIntensity() {
  if (phase !== PHASE_ROUND || !latest) return 0.05;
  const v = latest;
  let i = 0.20 + Math.min(0.45, (v.wave ?? 1) * 0.04);
  if (v.wavePhase === 2) i -= 0.18;              // repit : la musique souffle
  if (v.boss) {
    const bars = v.boss.bars ?? 1;
    i = Math.max(i, 0.72) + (CFG.BOSS_BARS - bars) * 0.05;
  }
  return Math.max(0.05, Math.min(1, i));
}

function colorOf(id) {
  const entry = lobby.find(l => l.id === id);
  return PLAYER_COLORS[entry ? entry.colorIndex % PLAYER_COLORS.length : 0];
}

// Comme colorOf, mais sans repli sur la couleur 0 : un drone dont le
// proprietaire a quitte le salon (ou un tuple d'ancienne version sans
// `owner`, replie a 0) doit garder une teinte neutre plutot que d'emprunter
// la couleur du premier joueur venu — colorOf ferait justement cette confusion.
function ownerColorOf(id) {
  const entry = lobby.find(l => l.id === id);
  return entry ? PLAYER_COLORS[entry.colorIndex % PLAYER_COLORS.length] : null;
}

function nameOf(id) {
  return lobby.find(l => l.id === id)?.name ?? "?";
}

/* LE SOL. L'arene est une MACHINE, les monstres sont ce qui s'y est introduit :
   le decor est froid, precis, instrumente — grille technique, filets fins,
   angles durs, palette desaturee — la ou les creatures sont chaudes,
   organiques, irregulieres. Ce contraste EST l'identite, et il n'est pas
   decoratif : les monstres sont les seuls elements organiques a l'ecran, donc
   ils se detachent instantanement. La direction artistique sert la lisibilite
   au lieu de la combattre.

   Grille a DEUX niveaux : un trait tous les 5 m, un trait marque tous les
   20 m. Elle donne une echelle lisible et rend les distances en metres des
   descriptions de cartes immediatement comprehensibles — sans elle, « rayon
   6 m » ne veut rien dire a l'ecran. */
const GRID_FINE = 5 * PX_PER_M;     // 100 px
const GRID_MAJOR = 20 * PX_PER_M;   // 400 px

function drawGrid() {
  ctx.lineWidth = 1;

  ctx.strokeStyle = SURFACE.gridFine;
  ctx.beginPath();
  for (let x = GRID_FINE; x < CFG.ARENA_W; x += GRID_FINE) {
    ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, CFG.ARENA_H);
  }
  for (let y = GRID_FINE; y < CFG.ARENA_H; y += GRID_FINE) {
    ctx.moveTo(0, y + .5); ctx.lineTo(CFG.ARENA_W, y + .5);
  }
  ctx.stroke();

  ctx.strokeStyle = SURFACE.gridMajor;
  ctx.beginPath();
  for (let x = GRID_MAJOR; x < CFG.ARENA_W; x += GRID_MAJOR) {
    ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, CFG.ARENA_H);
  }
  for (let y = GRID_MAJOR; y < CFG.ARENA_H; y += GRID_MAJOR) {
    ctx.moveTo(0, y + .5); ctx.lineTo(CFG.ARENA_W, y + .5);
  }
  ctx.stroke();

  drawGridPings();
}

/* REACTION AUX IMPACTS : les lignes de grille brillent brievement dans le rayon
   d'une explosion ou d'une onde de choc. Peu couteux, tres caracteristique du
   registre instrumentation — le sol est un ECRAN DE MESURE, et un ecran de
   mesure reagit a ce qu'il mesure. */
const gridPings = [];
const GRID_PING_MS = 420;

function addGridPing(x, y, r) {
  if (gridPings.length > 8) gridPings.shift();
  gridPings.push({ x, y, r, at: performance.now() });
}

function drawGridPings() {
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

/* VIGNETTAGE. Il concentre le regard et masque les apparitions hors champ.
   Peint APRES le monde et avant rien d'autre : c'est du decor, il ne doit
   jamais passer devant une consigne — mais celles-ci sont dans le DOM, donc
   au-dessus par construction. Le degrade est mis en cache, le reconstruire
   soixante fois par seconde se voit au profileur. */
let vignette = null;

function drawVignette() {
  if (!vignette) {
    const r = Math.hypot(CFG.ARENA_W, CFG.ARENA_H) / 2;
    vignette = ctx.createRadialGradient(
      CFG.ARENA_W / 2, CFG.ARENA_H / 2, r * 0.42,
      CFG.ARENA_W / 2, CFG.ARENA_H / 2, r);
    vignette.addColorStop(0, alpha(SURFACE.void, 0));
    vignette.addColorStop(1, alpha(SURFACE.void, 0.55));
  }
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
}

/* UNE seule passe. La separation en deux — le monde secoue, l'interface fixe —
   n'a plus lieu d'etre : le HUD est un FRERE du canvas et non son contenu, donc
   il ne peut plus trembler avec lui. Le tressaillement est devenu un
   `transform` CSS sur l'element canvas, que le compositeur applique sans que la
   boucle de jeu ait a redessiner quoi que ce soit.

   Les pourcentages d'une translation CSS se rapportent a la boite de l'element,
   qui fait exactement la taille de l'arene : la conversion monde -> ecran est
   donc une division, et elle reste juste quelle que soit la fenetre. */
function draw(v) {
  // Le fond n'est peint que par la couche du DESSOUS ; les deux autres doivent
  // rester transparentes, sinon elles effacent ce qu'il y a dessous.
  underCtx.fillStyle = SURFACE.arena;
  underCtx.fillRect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
  overCtx.clearRect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
  // Le lot WebGL s'ouvre autour de TOUT le monde : les quads sont accumules au
  // fil des appels et vides a la fin, donc leur ordre entre eux est celui du
  // code, mais leur position dans l'empilement est celle du canvas.
  gl?.begin();
  drawWorld(v);
  gl?.end();
  applyShake();
  drawScreen(v);
}

let shakeApplied = false;

function applyShake() {
  const on = shake.mag > 0;
  if (!on && !shakeApplied) return;
  shakeApplied = on;
  // Le tressaillement porte sur `#arena` et non sur un canvas : les trois
  // couches doivent bouger ENSEMBLE, au sous-pixel pres.
  arenaEl.style.transform = on
    ? `scale(1.015) translate(${(shake.x / CFG.ARENA_W * 100).toFixed(3)}%, ` +
      `${(shake.y / CFG.ARENA_H * 100).toFixed(3)}%)`
    : "scale(1.015)";
}

/* Tout ce qui vit sur l'ECRAN et non dans le monde. Le canvas n'en dessine plus
   une ligne — voir `hud.js`. Ce qui reste ici est ce que le HUD ne peut pas
   deduire seul : l'expiration des consignes, l'annonce de phase (qui demande la
   table des boss) et les compteurs locaux. */
function drawScreen(v) {
  const now = performance.now();
  if (alertOrder && now > alertOrder.until) alertOrder = null;
  if (alertWarn && now > alertWarn.until) alertWarn = null;
  if (alertInfo && now > alertInfo.until) alertInfo = null;

  const st = PERF ? audioStats() : null;
  updateHud(v, {
    now, myId, lobby, ping, difficulty, amSpectator,
    myColor: colorOf(myId),
    dashCd: myDashCd,
    counts: ownedCounts(myId),
    alertOrder, alertWarn, alertInfo,
    bossAnnounce, phaseAnnounce,
    phaseText: v.boss && v.boss.phase > 0
      ? phaseUnlockText(v.boss.kind ?? 0, v.boss.phase) : "",
    perf: PERF, fps, particles: particles.length,
    renderer: glActive() ? "GL" : "2D",
    draws: gl?.draws ?? 0, quads: gl?.quads ?? 0,
    voices: st ? st.active : 0, peak: st ? st.peak : 0,
  });
}

function drawWorld(v) {
  /* LA LIGNE DE PARTAGE. Tout ce qui suit vit SOUS les entites : sol, zones,
     telegraphes, projectiles, marqueurs. Elle bascule une seule fois, juste
     apres les monstres — voir plus bas. */
  ctx = underCtx;
  drawGrid();

  if (v.slow) {
    ctx.fillStyle = alpha(WALL.fill, 0.06);
    ctx.fillRect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
  }

  // La couronne interdite passe SOUS les zones : c'est le sol lui-meme, et une
  // annonce dessinee dessous serait invisible exactement la ou il faut encore
  // pouvoir la lire — au moment ou on court pour rentrer.
  drawArenaBounds(v.bounds);
  drawZones(v.zones, v.tm);
  // Le rempart passe SOUS les entites : c'est un marquage de sol, et il occupe
  // 6,5 m de rayon (11 m ancre) — dessine par-dessus, il masquait exactement
  // les ennemis qu'il attire.
  drawBulwarks(v.bulwarks ?? []);
  // Ancre et sanctuaire (lot C) : des marquages de sol, comme le rempart, et
  // pour la meme raison — dessines par-dessus, ils masqueraient exactement ce
  // qu'ils retiennent ou protegent.
  drawAnchors(v.anchors ?? []);
  drawSancts(v.sancts ?? []);
  drawTurrets(v.turrets ?? []);
  drawEffects(v.effects);
  drawPowerups(v.powerups);

  pruneTrails(v);
  // Les tireurs se telegraphent depuis les projectiles observes : il faut donc
  // regarder les projectiles AVANT de dessiner les ennemis. Le suivi ne dessine
  // rien, il n'a donc rien a voir avec la couche courante.
  trackShooters(v);

  drawBombs(v.bombList ?? []);
  // Les marqueurs de mecanique passent SOUS les entites, comme le rempart :
  // un cercle de regroupement de 135 px de rayon dessine par-dessus masquait
  // exactement les joueurs qu'il demande de compter.
  drawMarks(v.marks ?? [], v.playerList);
  // Les depouilles passent SOUS les vivants : une sequence de mort dessinee
  // par-dessus la horde qui avance masquerait ce qui arrive.
  drawDeaths();
  drawEnemies(v.enemyList);

  /* BASCULE VERS LA COUCHE DU DESSUS. Tout ce qui suit passait deja par-dessus
     les monstres dans l'ordre de dessin d'origine : boss, drones, anneaux de
     joueur, barres, noms, lames orbitales, murs, fragments, vignettage. Le seul
     ecart assume est que les anneaux d'un joueur passent desormais AU-DESSUS de
     son propre sprite au lieu de dessous — ils vivent a 18 px et plus du centre
     pour un personnage de 14 px de rayon, le recouvrement se compte en un ou
     deux pixels. */
  ctx = overCtx;

  if (v.boss) {
    if (v.boss.id !== lastBossId) {
      lastBossId = v.boss.id;
      bossAnnounce = performance.now();
      lastBossPhase = 0;
    }
    if (v.boss.phase > lastBossPhase) {
      lastBossPhase = v.boss.phase;
      phaseAnnounce = performance.now();
    }
    drawBoss(v.boss);
    /* Le second Jumeau passe par la MEME routine : c'est le meme adversaire, et
       `twin` n'y choisit que la moitie de motif a dessiner. `kind` doit etre
       repris de `boss` — le snapshot ne le porte pas deux fois, et sans lui le
       second Jumeau se serait dessine en Ravageur. */
    if (v.boss2) {
      drawBoss({ ...v.boss2, kind: v.boss.kind, phase: v.boss.phase, bars: v.boss.bars,
                 hp: v.boss.hp, maxHp: v.boss.maxHp, twin: 1 });
    }
  }
  drawDrones(v.droneList);

  /* LES PROJECTILES PASSENT AU-DESSUS DES ENNEMIS, et c'est un changement d'ordre
     assume : ils etaient sous la horde, donc une balle disparaissait derriere le
     premier corps rencontre et on ne voyait plus ce qu'on tirait. L'ordre impose
     par le lot est : sol -> zones -> bonus -> ennemis -> projectiles -> joueurs.

     `drawEffects` reste, lui, SOUS les entites, contre la lettre de l'ordre :
     une nova de 250 px de rayon dessinee par-dessus masquerait exactement les
     joueurs que le lot vient de rendre identifiables. Une onde est un ornement
     de sol, un projectile est une entite — la ligne de partage est la. */
  for (const s of v.shotList) {
    // Rouge franc ET losange : deux signaux pour la meme information, parce
    // qu'aucun des deux ne suffit seul a 220 ennemis.
    drawBolt(s, CFG.SHOT_RADIUS, COMBAT.shot, shotTrail, true);
  }
  for (const b of v.bulletList) {
    /* La balle prend LA COULEUR DE SON TIREUR. Elle repond du meme coup a deux
       questions : « est-ce a moi que ca fait mal » et « qui a tire ca » — la
       seconde n'avait aucune reponse en cooperatif.
       Le projectile de soin garde le vert et son embonpoint : il ne dit pas qui
       tire mais CE QUE le tir fait, et c'est l'information la plus utile a la
       table.

       `ownerColorOf` et non `colorOf` : un proprietaire inconnu — serveur
       anterieur au lot, ou tireur deja deconnecte dont les balles volent encore
       — doit retomber sur l'ambre d'origine et non emprunter la couleur du
       premier joueur venu, qui serait un mensonge sur qui a tire. */
    drawBolt(b, CFG.BULLET_RADIUS + (b.heal ? 1.5 : 0),
             b.heal ? COMBAT.bulletHeal : (ownerColorOf(b.owner) ?? COMBAT.bullet),
             bulletTrail);
  }

  drawPlayers(v.playerList, v.tm, v.marks ?? []);
  /* Colonnes lumineuses des marqueurs accueillants (lot E) : le seul element
     autorise a depasser en hauteur, donc dessine PAR-DESSUS la horde — le
     disque du marqueur, lui, reste sous les entites, comme documente. */
  drawMarkColumns(v.marks ?? [], v.tm);
  // Les lames orbitales par-dessus tout le monde : c'est la bande de rayon la
  // plus disputee de l'ecran (givre, rempart, marqueurs) et la seule qui dise
  // au joueur qu'il possede la carte.
  drawOrbiters(v.playerList, v.tm);
  // Les murs passent PAR-DESSUS les entites : ils sont infranchissables, et un
  // ennemi dessine devant laissait croire qu'on pouvait le rejoindre.
  drawWalls(v.walls);
  // Fragments par-dessus tout le monde : ce sont des confirmations, elles ne
  // doivent jamais passer derriere ce qu'elles confirment. Les chiffres de
  // degats, eux, sont montes d'un cran : ils vivent dans le DOM par-dessus le
  // canvas, donc au-dessus de tout par construction.
  drawParticles();
  // Les ondes annulaires par-dessus les fragments : elles bornent la gerbe, et
  // une onde dessinee dessous se serait perdue dedans.
  drawBursts();

  // Le vignettage ferme le monde. Il vient en dernier parce qu'il assombrit
  // TOUT ce qui precede : place plus tot, il aurait laisse les entites des
  // bords a pleine luminosite sur un sol deja eteint.
  drawVignette();
}

/* TRAINEES DE PROJECTILE. Le sprite est etire dans son axe, plus une copie a
   30 % d'opacite un cran en arriere : c'est ce qui fait la difference entre une
   balle et un point qui saute d'un endroit a l'autre.

   La direction n'est PAS transmise — les projectiles ne portent que leur
   position, pour la meme raison qu'ils ne portent pas leur proprietaire : un
   champ de plus sur quatre cents balles en vol, vingt fois par seconde. On la
   deduit de l'image precedente, ce qui est exact des le second instantane.

   La TAILLE DE COLLISION ne change pas : elle vit dans la simulation, et un
   projectile qu'on voit plus long que ce qu'il touche est un mensonge dans le
   sens qui pardonne — c'est le seul sens autorise. */
const bulletTrail = new Map();
const shotTrail = new Map();

/* LUEUR ADDITIVE. Ce que la bascule a debloque et qui ne servait pas encore :
   un halo qui s'AJOUTE au fond au lieu de le recouvrir. Sur le sol ardoise, dix
   balles groupees se lisent alors comme une gerbe lumineuse et non comme dix
   pastilles, et le tir du soigneur se distingue du tir normal a la luminosite
   autant qu'a la teinte.
   Elle est UNIFORME et non proportionnelle aux degats, contrairement a ce que
   le plan proposait : un projectile ne transporte pas son proprietaire ni ses
   degats, et un champ de plus sur les quatre cents balles en vol, vingt fois
   par seconde, coute plus que l'effet ne rapporte — c'est exactement la raison
   pour laquelle `bd` existe cote boss. */
function boltGlow(b, r, col) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = alpha(col, 0.16);
  ctx.beginPath(); ctx.arc(b.x, b.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* LOSANGE ETIRE : la forme du projectile HOSTILE. La couleur seule ne suffit
   pas — a 220 ennemis elle se noie, et c'est exactement le moment ou il faut
   distinguer ce qu'on tire de ce qu'on recoit. Une forme, elle, survit a la
   saturation : elle reste lisible en vision peripherique et pour un daltonien.

   Il est trace dans l'axe de vol, comme la capsule du tir allie, et sur le meme
   demi-grand-axe : la taille de collision ne change pas, seule la silhouette. */
function boltDiamond(x, y, ux, uy, r) {
  const px = -uy, py = ux;                  // normale a l'axe
  const long = r * 2.4, wide = r * 0.9;
  ctx.beginPath();
  ctx.moveTo(x + ux * long, y + uy * long);
  ctx.lineTo(x + px * wide, y + py * wide);
  ctx.lineTo(x - ux * long, y - uy * long);
  ctx.lineTo(x - px * wide, y - py * wide);
  ctx.closePath();
  ctx.fill();
}

/* `diamond` choisit la silhouette : capsule ronde pour le tir allie, losange
   pour le tir hostile. Un parametre et non deux fonctions — le halo, la
   trainee, la deduction de direction et la purge des tables sont communs, et
   les dupliquer les aurait fait diverger au premier reglage. */
function drawBolt(b, r, col, trail, diamond = false) {
  const prev = trail.get(b.id);
  trail.set(b.id, { x: b.x, y: b.y });

  boltGlow(b, r, col);
  ctx.fillStyle = col;
  if (prev) {
    const dx = b.x - prev.x, dy = b.y - prev.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const ux = dx / d, uy = dy / d;
      if (diamond) {
        // La copie en arriere d'abord, sous le corps : elle donne le sens du vol
        // sans qu'on ait a comparer deux images.
        ctx.globalAlpha = 0.3;
        boltDiamond(b.x - ux * r * 3, b.y - uy * r * 3, ux, uy, r * 0.7);
        ctx.globalAlpha = 1;
        boltDiamond(b.x, b.y, ux, uy, r);
        return;
      }
      // La copie en arriere : un seul cran, et a 30 % — deux crans donnaient un
      // chapelet de perles au lieu d'une trainee.
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(b.x - ux * r * 3, b.y - uy * r * 3, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      /* Le corps, ETIRE dans l'axe : une capsule tracee au trait, qui coute une
         ligne la ou une ellipse pivotee en coute cinq. Elle est plus FINE que
         le disque d'origine et plus longue — a epaisseur egale, l'allongement
         donnait une pastille et non une balle. La taille de collision, elle, ne
         bouge pas : elle vit dans la simulation. */
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x - ux * r * 2.2, b.y - uy * r * 2.2);
      ctx.lineTo(b.x + ux * r * 0.5, b.y + uy * r * 0.5);
      ctx.stroke();
      ctx.lineCap = "butt";
      return;
    }
  }
  /* Premiere image d'un projectile : la direction n'est pas encore connue (elle
     se deduit de l'image precedente). Le losange se trace alors dans l'axe
     horizontal — une pastille ronde ici aurait fait clignoter la forme d'une
     image sur l'autre, ce qui est pire que pas de distinction du tout. */
  if (diamond) { boltDiamond(b.x, b.y, 1, 0, r); return; }
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.fill();
}

/* Les tables de trainee ne grandissent pas indefiniment : une balle disparue ne
   revient jamais, et garder son entree ferait fuir la memoire sur une manche de
   dix minutes. On purge par lot plutot qu'a chaque disparition — parcourir
   quatre cents entrees a chaque image coute plus que de le faire une fois de
   temps en temps. */
function pruneTrails(v) {
  if (bulletTrail.size > 900) {
    bulletTrail.clear();
    for (const b of v.bulletList) bulletTrail.set(b.id, { x: b.x, y: b.y });
  }
  if (shotTrail.size > 400) {
    shotTrail.clear();
    for (const s of v.shotList) shotTrail.set(s.id, { x: s.x, y: s.y });
  }
}

/* Trace le contour d'une zone dans le contexte courant, quelle que soit sa
   forme. L'anneau se dessine en deux cercles de sens opposes : c'est ce qui
   creuse le trou une fois la regle "evenodd" appliquee au remplissage. */
const ZONE_INSET = 3;      // retrait purement visuel, la zone de degats est pleine

function zonePath(z, grow = 1) {
  ctx.beginPath();
  zoneSubPath(z, grow);
}

/* Trace SANS ouvrir de chemin : c'est ce qui permet d'empiler plusieurs zones
   dans un seul `beginPath` et de les remplir d'un coup. Deux mares qui se
   chevauchent donnent alors une seule tache, sans la couture interne qu'un
   remplissage par zone laissait — et une fin de combat de Matriarche compte
   vingt-cinq mares. */
function zoneSubPath(z, grow = 1) {
  if (z.shape === 1) {
    // Les cases du damier se touchent exactement cote serveur ; on les separe
    // ici pour qu'on lise une grille et non un aplat.
    const w = Math.max(4, z.w * grow - ZONE_INSET * 2);
    const h = Math.max(4, z.h * grow - ZONE_INSET * 2);
    rectSub(z.x, z.y, w, h, z.ang || 0);
  } else if (z.shape === 2) {
    ctx.moveTo(z.x + z.r * grow, z.y);
    ctx.arc(z.x, z.y, z.r * grow, 0, Math.PI * 2);
    ctx.moveTo(z.x + z.hole, z.y);
    ctx.arc(z.x, z.y, z.hole, 0, Math.PI * 2, true);
  } else if (z.shape === 3) {
    // Cone : le sommet est au centre de la zone, l'ouverture vaut deux fois
    // `spread`. La pointe est fermee, sinon le remplissage debordait sur la
    // corde et le joueur croyait le sommet sur.
    ctx.moveTo(z.x, z.y);
    ctx.arc(z.x, z.y, z.r * grow, z.ang - z.spread, z.ang + z.spread);
    ctx.closePath();
  } else if (z.shape === 4) {
    // Pac-Man : le disque MOINS le secteur sur. On trace donc le complement,
    // de `ang + spread` a `ang - spread` : ce qui est peint est ce qui blesse,
    // regle valable pour toutes les formes du registre.
    ctx.moveTo(z.x, z.y);
    ctx.arc(z.x, z.y, z.r * grow, z.ang + z.spread, z.ang - z.spread + Math.PI * 2);
    ctx.closePath();
  } else if (z.shape === 5) {
    // Croix : deux bandes croisees, `r` demi-longueur et `h` epaisseur. Les
    // deux rectangles se recouvrent au centre — remplis dans le meme chemin en
    // « nonzero », ils ne laissent aucune couture.
    const len = z.r * grow * 2, th = z.h * grow;
    rectSub(z.x, z.y, len, th, z.ang || 0);
    rectSub(z.x, z.y, th, len, z.ang || 0);
  } else {
    ctx.moveTo(z.x + z.r * grow, z.y);
    ctx.arc(z.x, z.y, z.r * grow, 0, Math.PI * 2);
  }
}

// Rectangle oriente ajoute au chemin courant. `ctx.rect` ne sait pas tourner et
// `save/restore` autour d'un `beginPath` deja ouvert casserait l'empilement.
function rectSub(cx, cy, w, h, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const hw = w / 2, hh = h / 2;
  const pt = (dx, dy) => [cx + dx * c - dy * s, cy + dx * s + dy * c];
  const a = pt(-hw, -hh), b = pt(hw, -hh), d = pt(hw, hh), e = pt(-hw, hh);
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(d[0], d[1]);
  ctx.lineTo(e[0], e[1]);
  ctx.closePath();
}

// L'anneau est la seule forme qui se CREUSE : partout ailleurs les sous-chemins
// doivent s'additionner, sinon la croix perdrait son centre et deux mares qui se
// chevauchent laisseraient un trou exactement la ou elles sont le plus denses.
function zoneRule(z) { return z.shape === 2 ? "evenodd" : "nonzero"; }

/* Plafond de zones DESSINEES. La simulation en autorise davantage (mares,
   exaflares et damier peuvent se croiser) mais au-dela d'une quarantaine le sol
   n'est plus lisible : mieux vaut montrer les plus urgentes que toutes. Le tri
   ne se paie que quand le plafond est franchi. */
const ZONE_DRAW_MAX = 40;

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
const ZONE_FX_MAX = 600;
let zoneFx = 0;

/* Craquelures pre-generees par identifiant de zone : deux zones voisines ne
   sont jamais identiques, et la geometrie ne se recalcule pas a chaque image.
   La table se vide d'un bloc quand elle grossit — les identifiants ne se
   reutilisent pas, une entree morte ne sera jamais relue. */
const zoneCracks = new Map();
const zoneMotion = new Map();   // id -> { x, y, dx, dy } : le courant est DEDUIT
const scorches = [];            // { z, until } : decoloration du sol, 2 s
const blastSeen = new Map();    // id -> instant de la derniere resolution

// Petit generateur deterministe : la craquelure d'une zone doit etre la meme a
// chaque image, et Math.random ne sait pas promettre ca.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rayon d'encombrement d'une zone, toutes formes confondues : les craquelures
// et le courant en ont besoin sans vouloir connaitre la geometrie exacte.
function zoneSpan(z) {
  if (z.shape === 1) return Math.max(z.w, z.h) / 2;
  return z.r || 40;
}

function crackSetFor(id) {
  let branches = zoneCracks.get(id);
  if (branches) return branches;
  if (zoneCracks.size > 160) zoneCracks.clear();
  const rnd = mulberry32(id);
  branches = [];
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    let a = (i / n) * Math.PI * 2 + rnd() * 0.9;
    const pts = [];
    let d = 0.10 + rnd() * 0.08;
    while (d < 1) {
      pts.push({ d, a });
      d += 0.14 + rnd() * 0.20;
      a += (rnd() - 0.5) * 0.8;
    }
    pts.push({ d: 1, a });
    branches.push(pts);
  }
  zoneCracks.set(id, branches);
  return branches;
}

/* Le reseau de fissures s'ETEND au rythme du compte a rebours, et sa lueur
   suit la meme rampe non lineaire que le remplissage : lente sur deux tiers,
   brutale sur les 300 dernieres millisecondes. Ecretees a la forme — une
   fissure qui depasse d'un couloir en ferait un disque. */
function drawZoneCracks(z, k, punch) {
  const span = zoneSpan(z);
  const R = span * Math.min(1, k * 1.15);
  if (R < 12) return;
  const branches = crackSetFor(z.id);
  ctx.save();
  zonePath(z);
  ctx.clip(zoneRule(z));
  ctx.strokeStyle = alpha(ZONE.blast, 0.20 + punch * 0.70);
  ctx.lineWidth = 1 + punch * 1.6;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const pts of branches) {
    ctx.moveTo(z.x, z.y);
    for (const pt of pts) {
      if (pt.d * span > R) break;
      ctx.lineTo(z.x + Math.cos(pt.a) * pt.d * span,
                 z.y + Math.sin(pt.a) * pt.d * span);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/* Le courant est DEDUIT du deplacement entre deux images, comme la direction
   des projectiles : un champ de plus sur chaque zone, vingt fois par seconde,
   couterait plus que la deduction. Lisse, parce que les positions arrivent a
   20 Hz et sauteraient. */
function trackZoneMotion(list) {
  for (const z of list) {
    const m = zoneMotion.get(z.id);
    if (!m) { zoneMotion.set(z.id, { x: z.x, y: z.y, dx: 0, dy: 0 }); continue; }
    m.dx = m.dx * 0.85 + (z.x - m.x) * 0.15;
    m.dy = m.dy * 0.85 + (z.y - m.y) * 0.15;
    m.x = z.x; m.y = z.y;
  }
  if (zoneMotion.size > 220) zoneMotion.clear();
}

/* Signature MOBILE : bandes perpendiculaires au deplacement qui defilent plus
   vite que la zone (la sensation de vitesse), trainee qui s'estompe derriere,
   et avant-garde plus lumineuse — on lit la direction A L'ARRET, sur une
   capture. Les exaflares heritent gratuitement de l'orientation : chaque
   explosion successive du meme train suit le meme vecteur. */
function drawZoneFlow(z, tm) {
  const m = zoneMotion.get(z.id);
  if (!m) return;
  const d = Math.hypot(m.dx, m.dy);
  if (d < 0.45) return;
  const ux = m.dx / d, uy = m.dy / d;
  const R = zoneSpan(z);

  // Trainee : deux contours fantomes derriere, sur environ deux longueurs.
  for (let i = 1; i <= 2; i++) {
    ctx.save();
    ctx.translate(-ux * R * 0.55 * i, -uy * R * 0.55 * i);
    ctx.globalAlpha = 0.14 / i;
    ctx.strokeStyle = ZONE.edge;
    ctx.lineWidth = 2;
    zonePath(z);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Bandes de courant, ecretees a la forme.
  ctx.save();
  zonePath(z);
  ctx.clip(zoneRule(z));
  ctx.strokeStyle = alpha(ZONE.edge, 0.30);
  ctx.lineWidth = 2.5;
  const pas = 22;
  const off = (tm * 90) % pas;
  ctx.beginPath();
  for (let s = -R + off - pas; s < R + pas; s += pas) {
    const cx = z.x + ux * s, cy = z.y + uy * s;
    ctx.moveTo(cx - uy * R, cy + ux * R);
    ctx.lineTo(cx + uy * R, cy - ux * R);
  }
  ctx.stroke();
  ctx.restore();

  // Avant-garde : liseré lumineux sur le bord AVANT, plus sombre a l'arriere.
  if (!z.shape || z.shape === 2) {
    const ang = Math.atan2(uy, ux);
    ctx.strokeStyle = alpha(ZONE.blast, 0.65);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, ang - 0.9, ang + 0.9);
    ctx.stroke();
  }
}

/* RESOLUTION d'un telegraphe : onde annulaire qui depasse largement le rayon,
   debris projetes, et une decoloration du sol qui persiste deux secondes — la
   trace de ce qui vient de se passer, celle qui aide a comprendre ce qui nous
   a touche. Declenchee sur le souffle, une fois par detonation : les zones qui
   PULSENT (derive, verrouillage) redetonent et redeclenchent. */
function zoneResolved(z, tm) {
  const last = blastSeen.get(z.id) ?? -9;
  if (tm - last < 0.4) return;
  blastSeen.set(z.id, tm);
  if (blastSeen.size > 220) { const keep = blastSeen.get(z.id); blastSeen.clear(); blastSeen.set(z.id, keep); }

  scorches.push({ z: { ...z }, until: tm + 2 });
  if (scorches.length > 24) scorches.shift();

  const span = zoneSpan(z);
  if (bursts.length < BURST_MAX) {
    bursts.push({ x: z.x, y: z.y, r: span * 0.5, max: span * 1.6, life: 0.35, t: 0.35, col: ZONE.blast });
  }
  for (let i = 0; i < 8 && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 70 + Math.random() * 120;
    particles.push({
      x: z.x + Math.cos(a) * span * 0.4, y: z.y + Math.sin(a) * span * 0.4,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      life: 0.5, max: 0.5, col: ZONE.blast, size: 2.6,
    });
  }
}

function drawScorches(tm) {
  for (let i = scorches.length - 1; i >= 0; i--) {
    const s = scorches[i];
    if (s.until <= tm || s.until > tm + 2.5) {
      scorches[i] = scorches[scorches.length - 1];
      scorches.pop();
      continue;
    }
    ctx.fillStyle = alpha(SURFACE.void, 0.30 * ((s.until - tm) / 2));
    zonePath(s.z);
    ctx.fill(zoneRule(s.z));
  }
}

// Point aleatoire DANS une zone, pour l'emission de braises. Approximatif sur
// les formes anguleuses — une braise a un centimetre du bord ne ment a
// personne, et l'exactitude couterait un test de forme par particule.
function zoneRandomPoint(z) {
  if (z.shape === 1) {
    const c = Math.cos(z.ang || 0), s = Math.sin(z.ang || 0);
    const dx = (Math.random() - 0.5) * z.w, dy = (Math.random() - 0.5) * z.h;
    return { x: z.x + dx * c - dy * s, y: z.y + dx * s + dy * c };
  }
  const rMin = z.shape === 2 ? (z.hole || 0) : 0;
  const rr = rMin + Math.sqrt(Math.random()) * Math.max(1, (z.r || 40) - rMin);
  const a = Math.random() * Math.PI * 2;
  return { x: z.x + Math.cos(a) * rr, y: z.y + Math.sin(a) * rr };
}

/* Deux temps, deux langages — c'est la condition de reussite du lot. L'arene
   contient deja 200 ennemis, des projectiles et des marqueurs : si l'annonce et
   la zone active se ressemblent, tout le catalogue de motifs devient du bruit.

     ANNONCE : remplissage faible, contour ANIME (pointilles qui defilent), et
               un anneau de compte a rebours quand il y a peu de zones a lire.
     ACTIVE  : remplissage franc, contour fixe, leger pulse.

   Les zones persistantes sont en plus FUSIONNEES : un seul chemin, un contour
   obtenu par dilatation, donc aucune couture entre deux mares qui se touchent. */
function drawZones(zones, tm = 0) {
  let list = zones;
  if (list.length > ZONE_DRAW_MAX) {
    const rank = z => (z.warn > 0 ? z.warn : z.life > 0 ? 0 : 99);
    list = [...list].sort((a, b) => rank(a) - rank(b)).slice(0, ZONE_DRAW_MAX);
  }

  // La trace des detonations passe SOUS tout le reste : c'est le sol, pas un
  // danger — une decoloration par-dessus une annonce masquerait la suivante.
  drawScorches(tm);
  trackZoneMotion(list);

  /* L'anneau de compte a rebours ne sort que s'il y a peu d'annonces : douze
     anneaux sur un damier disent moins que les douze contours eux-memes, qui
     s'allument deja en meme temps. */
  const ring = list.reduce((n, z) => n + (z.warn > 0 ? 1 : 0), 0) <= 8;

  const persistent = [];
  for (const z of list) {
    if (z.blast > 0.15) zoneResolved(z, tm);
    if (z.warn <= 0 && z.life > 0) { persistent.push(z); continue; }
    if (z.warn > 0) drawZoneWarn(z, tm, ring);
    else {
      const k = Math.max(0, z.blast / 0.25);
      ctx.fillStyle = alpha(ZONE.blast, k * 0.65);
      zonePath(z, z.shape === 1 || z.shape === 5 ? 1 : 1 + (1 - k) * 0.12);
      ctx.fill(zoneRule(z));
    }
  }

  if (persistent.length) drawZonesActive(persistent, tm);

  /* Le courant se dessine PAR-DESSUS la signature de la zone : c'est une
     information de trajectoire, elle vaut pour une annonce qui glisse comme
     pour une mare poursuivante. */
  for (const z of list) drawZoneFlow(z, tm);
}

/* INTENSITE NON LINEAIRE. Le carre de la progression montait deja doucement,
   mais il ne DECOLLAIT jamais : on lisait une jauge au lieu de ressentir une
   echeance. Les 300 dernieres millisecondes valent maintenant a elles seules
   autant que tout le reste de l'annonce — c'est la fenetre ou il faut avoir
   bouge, et c'est la seule chose que le telegraphe doit dire.
   Rendue entre 0 et 1 comme `k*k` l'etait, donc tous les coefficients d'appel
   restent valables. */
const ZONE_PUNCH = 0.3;               // secondes de la montee brutale

function warnRamp(k, warn) {
  const doux = k * k * 0.55;
  if (warn > ZONE_PUNCH) return doux;
  return doux + (1 - warn / ZONE_PUNCH) * 0.45;
}

function drawZoneWarn(z, tm, ring) {
  const k = 1 - z.warn / (z.warn0 || CFG.ZONE_WARN);
  const imminent = z.warn < 0.35;
  const punch = warnRamp(k, z.warn);

  /* Etincelles qui MONTENT de la zone pendant la fenetre brutale. Elles ne
     coutent rien — memes particules, meme lot que les entites — et elles font
     regarder la zone au moment ou le contour seul ne suffit plus. Une seule
     tous les quelques images : une gerbe continue aurait masque le sol qu'on
     demande justement de lire. */
  if (z.warn <= ZONE_PUNCH && particles.length < PARTICLE_MAX && Math.random() < 0.35) {
    const rad = Math.max(8, z.r || 40);
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * rad;
    particles.push({
      x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d,
      vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 40,
      lift: 90, life: 0.45, max: 0.45, col: ZONE.imminent, size: 2.4,
    });
  }

  // Remplissage volontairement PAUVRE : c'est le contour qui porte l'annonce,
  // et c'est ce qui la distingue d'une zone active a 45 %.
  if (z.prox) {
    // Degats de proximite : le degrade EST l'information. Un aplat aurait dit
    // « toute la zone fait mal », alors que seul le centre est letal.
    const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, Math.max(1, z.r));
    g.addColorStop(0, alpha(ZONE.imminent, 0.10 + punch * 0.30));
    g.addColorStop(1, alpha(ZONE.imminent, 0.02 + punch * 0.05));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = alpha(BOSS.skin, 0.03 + punch * 0.13);
  }
  zonePath(z);
  ctx.fill(zoneRule(z));

  /* Craquelures (lot E). C'est la SIGNATURE de l'imminent : un reseau de
     fissures qui s'ouvre depuis le centre au rythme du compte a rebours, la ou
     le persistant a ses braises et le mobile son courant. Le remplissage reste
     pauvre — les fissures disent l'echeance, pas la surface. */
  drawZoneCracks(z, k, punch);

  ctx.strokeStyle = imminent ? BOSS.barWarn : BOSS.skin;
  ctx.globalAlpha = 0.5 + k * 0.5;
  ctx.lineWidth = imminent ? 3 : 2;
  // Les pointilles DEFILENT : un contour anime se distingue au premier coup
  // d'oeil d'un contour fixe, meme du coin de l'oeil, meme sur une forme qu'on
  // n'a jamais vue.
  ctx.setLineDash(imminent ? [] : [7, 6]);
  ctx.lineDashOffset = imminent ? 0 : -tm * 26;
  zonePath(z);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.globalAlpha = 1;

  /* Arc de progression, au centre de la zone quelle que soit sa forme. Un arc
     epousant le CONTOUR n'avait aucun sens sur un rectangle ou un couloir long
     de toute l'arene — c'est la raison pour laquelle il avait ete retire. Au
     centre, il vaut pour les six formes et se lit sans compter les images. */
  if (ring) {
    ctx.strokeStyle = imminent ? BOSS.barWarn : BOSS.barRing;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(z.x, z.y, 15, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    ctx.stroke();
  }

  /* Une zone qui PULSE (dérive, verrouillage) a une annonce ET un souffle en
     meme temps : son compte a rebours est relance des la detonation. Ne
     dessiner que l'annonce donnait un danger qui ne se voyait jamais exploser. */
  if (z.blast > 0) {
    ctx.fillStyle = alpha(ZONE.blast, Math.max(0, z.blast / 0.25) * 0.5);
    zonePath(z);
    ctx.fill(zoneRule(z));
  }
}

/* Zones persistantes, toutes ensemble. Le contour vient d'une DILATATION du
   meme chemin plutot que d'un `stroke` : sur douze mares qui se chevauchent,
   un trait par mare redessinait chaque cercle a l'interieur de la tache et on
   ne voyait plus ou finissait la surface dangereuse. */
function drawZonesActive(list, tm) {
  /* La pulsation est SYNCHRONISEE sur le tic de degats (ZONE_TICK) et non sur
     une sinusoide decorative : on voit QUAND ca frappe, ce qui rend le danger
     previsible au lieu de continu. Un eclat bref a chaque palier, puis la
     surface retombe. */
  const tick = CFG.ZONE_TICK || 0.25;
  const ph = (tm % tick) / tick;
  const pulse = 0.88 + 0.12 * Math.max(0, 1 - ph * 2.5);

  /* Braises et fumee (lot E) : la signature du persistant. Emission cadencee —
     duree de vie x debit tient chaque zone sous la quarantaine de particules —
     et budget global a part (`zoneFx`), pour que vingt-cinq mares de fin de
     Matriarche ne volent pas les fragments des morts. La fumee ne sort QUE
     ici : jamais sur un telegraphe. */
  for (const z of list) {
    if (zoneFx >= ZONE_FX_MAX || particles.length >= PARTICLE_MAX) break;
    if (Math.random() < 0.55) {
      const pt = zoneRandomPoint(z);
      particles.push({
        x: pt.x, y: pt.y,
        vx: (Math.random() - 0.5) * 12, vy: -14 - Math.random() * 18,
        lift: 26, life: 0.9 + Math.random() * 0.5, max: 1.4,
        col: ZONE.blast, size: 2.2, zfx: 1,
      });
      zoneFx++;
    }
    if (Math.random() < 0.16 && zoneFx < ZONE_FX_MAX && particles.length < PARTICLE_MAX) {
      const pt = zoneRandomPoint(z);
      particles.push({
        x: pt.x, y: pt.y,
        vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 10,
        lift: 14, life: 1.6 + Math.random() * 0.6, max: 2.2,
        col: SURFACE.line, size: 6 + Math.random() * 3, zfx: 1,
      });
      zoneFx++;
    }
  }

  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1.05);
  ctx.fillStyle = alpha(ZONE.edge, 0.34 * pulse);
  ctx.fill("nonzero");

  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1);
  ctx.fillStyle = alpha(ZONE.fill, 0.45 * pulse);
  ctx.fill("nonzero");

  /* TEXTURE QUI DEFILE. C'est le seul moyen de distinguer d'un coup d'oeil
     « active » de « en cours d'annonce » a la peripherie du regard : les deux
     sont des aplats rouges, et seule celle-ci bouge. Des hachures obliques
     tracees en une passe, ecretees a la reunion des zones — un motif par zone
     aurait coute autant de `clip` que de zones, et il y en a douze sur un
     damier.
     Le pas de 14 px et la vitesse de 22 px/s sont ceux du contour pointille de
     l'annonce : deux vitesses differentes a l'ecran auraient donne deux
     mecaniques la ou il n'y en a qu'une. */
  ctx.save();
  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1);
  ctx.clip("nonzero");
  ctx.strokeStyle = alpha(ZONE.persist, 0.22);
  ctx.lineWidth = 3;
  const pas = 14;
  const off = (tm * 22) % pas;
  const span = CFG.ARENA_W + CFG.ARENA_H;
  ctx.beginPath();
  for (let d = -CFG.ARENA_H; d < span; d += pas) {
    ctx.moveTo(d + off, 0);
    ctx.lineTo(d + off + CFG.ARENA_H, CFG.ARENA_H);
  }
  ctx.stroke();
  ctx.restore();

  /* Lisere VIOLET sur le pourtour. Dans la grammaire de marqueurs, le violet
     dit « persistant : ca restera la apres ». Le remplissage garde le rouge du
     danger — repeindre la mare en violet aurait casse la regle qui compte le
     plus, une couleur pour une seule chose. Le violet ne fait donc qu'AJOUTER
     l'information de duree a un danger qui reste un danger. */
  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1.05);
  ctx.strokeStyle = alpha(ZONE.persist, 0.55 * pulse);
  ctx.lineWidth = 2;
  ctx.stroke();

  /* Fin de vie : les trois dernieres secondes clignotent. Sans ca, une mare
     disparaissait sous les pieds sans prevenir et on apprenait a ne plus s'y
     fier du tout — c'est-a-dire a jouer comme si elle etait permanente. */
  const dying = list.filter(z => z.life > 0 && z.life < 3);
  if (dying.length && Math.sin(tm * 12) > 0) {
    ctx.beginPath();
    for (const z of dying) zoneSubPath(z, 1.05);
    ctx.fillStyle = alpha(ZONE.dying, 0.16);
    ctx.fill("nonzero");
  }
}

/* Constriction. La couronne interdite est ASSOMBRIE et non peinte en rouge :
   le rouge est deja la couleur de tout ce qui explose, et une bande rouge
   permanente sur le pourtour aurait rendu illisible la seule chose qui compte
   pendant un combat, les annonces. Le palier a venir, lui, est en pointilles
   rouges : c'est une annonce, il en porte le langage. */
function drawArenaBounds(b) {
  if (!b) return;
  const full = b.x0 <= 0 && b.y0 <= 0 && b.x1 >= CFG.ARENA_W && b.y1 >= CFG.ARENA_H;

  if (!full) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
    ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.fillStyle = alpha(SURFACE.void, 0.72);
    ctx.fill("evenodd");
    ctx.restore();

    ctx.strokeStyle = alpha(ZONE.edge, 0.75);
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x0 + 1.5, b.y0 + 1.5, b.x1 - b.x0 - 3, b.y1 - b.y0 - 3);
  }

  if (b.warn > 0) {
    ctx.strokeStyle = BOSS.barWarn;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(b.nx0, b.ny0, b.nx1 - b.nx0, b.ny1 - b.ny0);
    ctx.setLineDash([]);
  }
}

/* Murs de verrouillage. Ils BLOQUENT et ne blessent pas : d'ou une couleur
   franchement differente de tout ce qui explose, et un aplat plein plutot
   qu'un contour — on doit lire « obstacle », jamais « zone a esquiver ». */
function drawWalls(w) {
  if (!w) return;
  const t = w.t;
  ctx.fillStyle = alpha(WALL.fill, 0.30);
  ctx.fillRect(w.x - t / 2, 0, t, CFG.ARENA_H);
  ctx.fillRect(0, w.y - t / 2, CFG.ARENA_W, t);
  ctx.strokeStyle = alpha(WALL.edge, 0.85);
  ctx.lineWidth = 2;
  ctx.strokeRect(w.x - t / 2, 0, t, CFG.ARENA_H);
  ctx.strokeRect(0, w.y - t / 2, CFG.ARENA_W, t);
}

/* La tourelle se dessine sous les ennemis : elle fait partie du decor qu'on a
   pose, pas de la mêlée. Son cercle de portee est indispensable — sans lui, on
   ne peut pas decider ou la poser, et c'est tout son interet. */
function drawTurrets(list) {
  const col = POWERUP_STYLE.turret.color;
  for (const t of list) {
    const fading = t.k < 0.25;                 // clignote sur la fin
    const blink = fading ? 0.35 + 0.65 * Math.abs(Math.sin(performance.now() / 110)) : 1;

    ctx.globalAlpha = 0.13 * blink;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.arc(t.x, t.y, CFG.TURRET_RANGE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.globalAlpha = blink;

    ctx.fillStyle = alpha(SURFACE.void, 0.85);
    ctx.beginPath(); ctx.arc(0, 0, CFG.TURRET_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.rotate(t.ang ?? 0);
    ctx.fillStyle = col;
    ctx.fillRect(2, -2.5, CFG.TURRET_RADIUS + 5, 5);
    ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // arc de vie restante autour du socle
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.75 * blink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, CFG.TURRET_RADIUS + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t.k);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/* Drones : `owner` permet de retrouver la couleur du proprietaire via le
   meme chemin que colorOf (lobby -> colorIndex -> PLAYER_COLORS), pour que
   chacun reconnaisse ses propres drones en pleine melee. Repli sur une
   teinte neutre par espece quand le proprietaire est inconnu (parti du
   salon, ou tuple d'ancienne version sans `owner`) : le soutien tire de loin
   donc reste visible, le mini-drone d'essaim fonce au contact donc reste
   petit et effile. */
const DRONE_COLOR = { 0: OWNED.droneAtk, 1: OWNED.droneHeal };

function drawDrones(list) {
  for (const d of list) {
    const col = ownerColorOf(d.owner) ?? DRONE_COLOR[d.kind] ?? OWNED.orphan;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.ang ?? 0);

    if (d.kind === 1) {
      // essaim : dard effile, se consume au contact
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(7, 0); ctx.lineTo(-4, -3.4); ctx.lineTo(-1.2, 0); ctx.lineTo(-4, 3.4);
      ctx.closePath(); ctx.fill();
    } else {
      // soutien : losange qui tire de loin, plus massif que le mini-drone
      ctx.fillStyle = alpha(SURFACE.void, 0.85);
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(0, -6); ctx.lineTo(-8, 0); ctx.lineTo(0, 6);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawEffects(effects) {
  for (const f of effects) {
    const grow = 1 - f.k;                    // k va de 1 a 0

    if (f.kind === 1) {
      // balayage d'arrivee du boss : voile blanc puis onde large
      ctx.fillStyle = alpha(FX.veil, f.k * 0.16);
      ctx.fillRect(0, 0, CFG.ARENA_W, CFG.ARENA_H);

      ctx.strokeStyle = alpha(FX.flash, f.k * 0.85);
      ctx.lineWidth = 14 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(BOSS.skin, f.k * 0.8);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.86, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 3) {
      // ricochet : arc entre deux cibles, avec une cassure au milieu pour
      // qu'on lise un rebond et pas un rayon
      const mx = (f.x + f.x2) / 2, my = (f.y + f.y2) / 2;
      const nx = -(f.y2 - f.y), ny = f.x2 - f.x;
      const nd = Math.hypot(nx, ny) || 1;
      const off = 14 * (1 - f.k);

      ctx.strokeStyle = alpha(FX.ricochet, f.k);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(mx + (nx / nd) * off, my + (ny / nd) * off);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();

      ctx.fillStyle = alpha(FX.ricochetCore, f.k * 0.9);
      ctx.beginPath(); ctx.arc(f.x2, f.y2, 3.5, 0, Math.PI * 2); ctx.fill();
      continue;
    }

    if (f.kind === 13) {
      // Salve (lot C) : rayon de verrouillage du tireur vers sa cible, plus un
      // losange qui marque la cible touchee. Droit et non casse — c'est un
      // verrouillage, pas un rebond, et la difference doit se lire.
      ctx.strokeStyle = alpha(CLASS_COLOR.dps, f.k * 0.8);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(f.x2, f.y2);
      ctx.lineTo(f.x, f.y);
      ctx.stroke();

      const s = 6 + 6 * f.k;
      ctx.strokeStyle = alpha(CLASS_COLOR.dps, f.k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - s);
      ctx.lineTo(f.x + s, f.y);
      ctx.lineTo(f.x, f.y + s);
      ctx.lineTo(f.x - s, f.y);
      ctx.closePath();
      ctx.stroke();
      continue;
    }

    if (f.kind === 4) {
      // balise : double anneau vert qui se resserre sur le releve
      ctx.strokeStyle = alpha(FX.beacon, f.k * 0.95);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.2 + grow * 0.8), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(FX.beaconSoft, f.k * 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1 - grow * 0.75), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 5) {
      // elite abattue : eclat dore, le butin est juste dessous
      ctx.strokeStyle = alpha(FX.elite, f.k * 0.9);
      ctx.lineWidth = 3 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.2 + grow * 0.8), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 6) {
      // rupture d'une barre du boss : souffle blanc puis onde rouge
      ctx.fillStyle = alpha(FX.veil, f.k * 0.12);
      ctx.fillRect(0, 0, CFG.ARENA_W, CFG.ARENA_H);

      ctx.strokeStyle = alpha(FX.elite, f.k * 0.95);
      ctx.lineWidth = 12 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(BOSS.skin, f.k * 0.8);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 7) {
      // explosion de grenade : souffle bref et dense, chaud pour se
      // distinguer des ondes froides du pulsar et de la riposte
      ctx.fillStyle = alpha(FX.blastFill, f.k * 0.35);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = alpha(FX.blastEdge, f.k * 0.9);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 8) {
      // onde blanche : pulsar, onde de mort et riposte partagent ce rendu —
      // trois declencheurs differents pour le meme signal, le joueur n'a pas
      // besoin de distinguer la source pour comprendre qu'une zone vient d'agir
      ctx.strokeStyle = alpha(FX.wave, f.k * 0.85);
      ctx.lineWidth = 4 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(BOSS.twin, f.k * 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 9) {
      // pose d'un rempart : l'anneau se REFERME vers le rayon final, la zone
      // reste ensuite dessinee par drawBulwarks
      ctx.strokeStyle = alpha(CLASS_COLOR.tank, f.k * 0.9);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1.35 - grow * 0.35), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 10) {
      // provocation : onde large qui part du tank, dans sa couleur de classe —
      // c'est la seule competence dont l'effet est de deplacer la horde, elle
      // doit se voir depuis n'importe ou dans l'arene
      ctx.strokeStyle = alpha(CLASS_COLOR.tank, f.k * 0.75);
      ctx.lineWidth = 8 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(FX.flash, f.k * 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 11) {
      // vague de soin : anneau vert plein, distinct de l'onde blanche des
      // cartes qui, elle, fait des degats
      ctx.fillStyle = alpha(FX.beacon, f.k * 0.10);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = alpha(FX.beacon, f.k * 0.9);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 12) {
      // explosion de bombe : meme famille chaude que la grenade mais plus
      // large et plus dense — c'est la plus grosse frappe ponctuelle du jeu
      ctx.fillStyle = alpha(FX.bombFill, f.k * 0.42);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = alpha(FX.bombEdge, f.k * 0.95);
      ctx.lineWidth = 7 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 2) {
      // montee de niveau : anneau dore qui s'ouvre vers l'exterieur
      ctx.strokeStyle = alpha(FX.level, f.k * 0.9);
      ctx.lineWidth = 4 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.15 + grow * 0.85), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(FX.levelSoft, f.k * 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.15 + grow * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    ctx.strokeStyle = alpha(FX.nova, f.k * 0.9);
    ctx.lineWidth = 6 * f.k + 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * (0.25 + grow * 0.75), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = alpha(FX.novaSoft, f.k * 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * (0.25 + grow * 0.62), 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* Rempart du tank. Le contour est plein et la surface a peine teintee : la
   zone doit se lire d'un coup d'oeil depuis l'autre bout de l'arene sans
   masquer ce qui se passe dedans — c'est precisement dedans qu'on se bat. */
function drawBulwarks(list) {
  for (const b of list) {
    const opacite = 0.35 + b.k * 0.45;
    ctx.fillStyle = alpha(CLASS_COLOR.tank, 0.05 + b.k * 0.04);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = alpha(CLASS_COLOR.tank, opacite);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();

    // Arc de duree restante, sur le bord : le tank doit savoir quand replier
    // sans quitter des yeux le centre de sa zone.
    ctx.strokeStyle = alpha(OWNED.bulwarkArc, 0.85);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.k);
    ctx.stroke();
  }
}

/* Ancre du tank (lot C). Le langage est celui du rempart — disque discret,
   anneau a la couleur de classe, arc de duree — avec DEUX ajouts qui disent la
   mecanique : la laisse (anneau pointille au double du rayon, la ou les
   ennemis captures butent) et des crampons vers l'interieur, qui disent
   « retenue » la ou le rempart dit « abri ». */
function drawAnchors(list) {
  for (const an of list) {
    // Zone de capture.
    ctx.fillStyle = alpha(CLASS_COLOR.tank, 0.04 + an.k * 0.04);
    ctx.beginPath(); ctx.arc(an.x, an.y, an.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.30 + an.k * 0.45);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(an.x, an.y, an.r, 0, Math.PI * 2); ctx.stroke();

    // La laisse : c'est elle que les allies lisent pour savoir ou la horde
    // s'arretera. Pointillee — elle ne bloque pas les joueurs, elle retient.
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(an.x, an.y, an.r * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Crampons : six ticks orientes vers le centre.
    ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.7);
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(an.x + Math.cos(a) * an.r, an.y + Math.sin(a) * an.r);
      ctx.lineTo(an.x + Math.cos(a) * (an.r - 10), an.y + Math.sin(a) * (an.r - 10));
      ctx.stroke();
    }

    // Arc de duree restante, sur le bord, comme le rempart.
    ctx.strokeStyle = alpha(OWNED.bulwarkArc, 0.85);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(an.x, an.y, an.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * an.k);
    ctx.stroke();
  }
}

/* Sanctuaire du soigneur (lot C). Couleur de classe, comme le rempart et
   l'ancre — l'identite dit QUI protege. Le bord est double : le liseré
   exterieur marque la limite ou les projectiles ennemis meurent, c'est
   l'information tactique du dome. */
function drawSancts(list) {
  for (const sa of list) {
    ctx.fillStyle = alpha(CLASS_COLOR.soigneur, 0.05 + sa.k * 0.04);
    ctx.beginPath(); ctx.arc(sa.x, sa.y, sa.r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = alpha(CLASS_COLOR.soigneur, 0.35 + sa.k * 0.45);
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sa.x, sa.y, sa.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = alpha(CLASS_COLOR.soigneur, 0.18);
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(sa.x, sa.y, sa.r - 5, 0, Math.PI * 2); ctx.stroke();

    // Arc de duree restante — meme grammaire que le rempart et l'ancre.
    ctx.strokeStyle = alpha(OWNED.bulwarkArc, 0.85);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(sa.x, sa.y, sa.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sa.k);
    ctx.stroke();
  }
}

/* Bombe en vol. Le compte a rebours se lit sur l'anneau qui se referme : le
   delai de detonation est toute la competence, le cacher en ferait un clic
   gagnant sans anticipation — pour celui qui la lance comme pour les autres. */
/* La bombe est desormais VISEE, donc son point de chute est une information et
   non une devinette. On le dessine avec la grammaire des annonces de boss —
   cercle au sol a la couleur de danger, arc de progression sur le pourtour —
   parce que c'est exactement le meme contrat : « ceci va exploser ici, dans ce
   delai ». Un langage visuel de plus pour la meme promesse aurait demande a
   chacun d'apprendre deux fois la meme chose.

   Le cercle passe SOUS les entites, comme le rempart et les marqueurs : dessine
   par-dessus, il masquait l'amas d'ennemis qu'on vise. */
function drawBombs(list) {
  for (const b of list) {
    const k = 1 - b.k;                      // 0 au lancer, 1 a l'explosion
    const r = SKILL_CFG.DPS_BOMB_RADIUS;

    // Point de chute : disque plein tres discret, contour net, arc de compte a
    // rebours qui se remplit. Le remplissage monte avec l'attente, ce qui rend
    // l'imminence lisible sans regarder l'arc.
    ctx.fillStyle = alpha(OWNED.bomb, 0.05 + k * 0.10);
    ctx.beginPath(); ctx.arc(b.tx, b.ty, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(OWNED.bomb, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(b.tx, b.ty, r, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = OWNED.bomb;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.tx, b.ty, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.stroke();

    // Le projectile lui-meme, en vol vers ce cercle.
    ctx.fillStyle = OWNED.bomb;
    ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
  }
}

/* Anneau de portee maximale, pour le seul tireur et pour lui seul. Deux
   secondes apres une fin de recharge, puis il disparait : la portee est une
   information dont on a besoin AU MOMENT de decider si l'amas est atteignable,
   pas en permanence — affiche tout le temps, c'est un cercle de plus a lire
   dans une arene qui en compte deja beaucoup. */
const BOMB_RANGE_SHOW_MS = 2000;

function drawBombRange(x, y) {
  const age = performance.now() - bombReadyAt;
  if (age > BOMB_RANGE_SHOW_MS) return;
  const fade = 1 - age / BOMB_RANGE_SHOW_MS;

  ctx.strokeStyle = alpha(OWNED.bomb, 0.30 * fade);
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(x, y, SKILL_CFG.DPS_BOMB_RANGE_MAX, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPowerups(list) {
  const now = performance.now();
  for (const w of list) {
    const st = POWERUP_STYLE[POWERUP_TYPES[w.type]] ?? POWERUP_STYLE.heal;
    const r = CFG.POWERUP_RADIUS;
    const pulse = 1 + Math.sin(now / 260 + w.id) * 0.1;
    const bob = Math.sin(now / 520 + w.id * 1.7) * 1.6;   // leger flottement
    const y = w.y + bob;

    ctx.strokeStyle = st.color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(w.x, y, r * 1.9 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;

    // ombre au sol : garde le repere de position malgre le flottement
    ctx.fillStyle = alpha(SURFACE.shadow, 0.28);
    ctx.beginPath();
    ctx.ellipse(w.x, w.y + r * 0.95, r * 0.62, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // pastille ronde sombre : l'icone se lit mieux sur un fond plein
    ctx.fillStyle = alpha(SURFACE.void, 0.82);
    ctx.beginPath(); ctx.arc(w.x, y, r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    paintPowerupIcon(st, w.x, y, (r / 8.6) * pulse);
  }
}

const ELITE_GOLD = ENEMY.elite;
// Halo des retardataires. Volontairement froid, la ou l'elite est doree : les
// deux marquages peuvent porter sur le meme ennemi, ils doivent rester lisibles
// l'un sur l'autre.
const STRAGGLER_HALO = ENEMY.straggler;

/* Trois principes d'animation, choisis pour leur rapport effet / effort. Aucun
   ne coute une image d'atlas de plus.

   ANTICIPATION — une image avant l'action principale, ou la creature fait le
   mouvement inverse. Sans elle, les actions semblent se teleporter. Ce n'est
   pas du style : c'est aussi un telegraphe de jeu, et il est plus marque sur
   les attaques dangereuses.

   ECRASEMENT ET ETIREMENT — gratuit via `scale`. Une creature qui se deplace
   s'etire de 6 % dans son axe, une creature touchee s'ecrase de 12 %.

   ACTION SECONDAIRE — les fragments d'impact et de mort, ailleurs dans ce
   fichier. C'est le meilleur investissement de toute la partie.

   La respiration est DESYNCHRONISEE par identifiant : deux cents creatures qui
   respirent en phase produisent une pulsation collective qui saute aux yeux. */
const BREATH_HZ = 1.2;

/* Cadence des tireurs, DEDUITE et non transmise. Ajouter une recharge au tuple
   d'ennemi couterait un nombre sur chacun des deux cents ennemis, vingt fois
   par seconde — exactement ce que le depot refuse pour le rang d'elite, et pour
   un seul type sur cinq.

   On observe donc l'apparition d'un projectile ennemi pres d'un tireur : c'est
   la date de son dernier tir. La cadence etant fixe, la SUIVANTE est connue des
   le second tir, et l'anticipation qui la precede est alors exacte. Avant le
   premier tir, le tireur reste au repos — un telegraphe qui devine serait pire
   que pas de telegraphe. */
const shooterFire = new Map();   // id d'ennemi -> date du dernier tir
const seenShots = new Set();

function trackShooters(v) {
  for (const s of v.shotList) {
    if (seenShots.has(s.id)) continue;
    seenShots.add(s.id);
    let best = 40 * 40, who = 0;
    for (const e of v.enemyList) {
      if (e.type !== 3) continue;
      const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2;
      if (d < best) { best = d; who = e.id; }
    }
    if (who) shooterFire.set(who, performance.now());
  }
  // Le jeu d'identifiants ne grandit pas indefiniment : au-dela de quelques
  // centaines de projectiles disparus, on repart du jeu vivant.
  if (seenShots.size > 600) {
    seenShots.clear();
    for (const s of v.shotList) seenShots.add(s.id);
  }
}

const SHOOTER_AIM = 400;         // duree de la visee, en millisecondes
const SHOOTER_RECOIL = 160;      // duree de la pose de tir

function enemyFrame(e, t, def) {
  const base = `e${e.type}_`;

  // Le brood gonfle avant d'eclater : c'est l'anticipation la plus utile du
  // jeu, elle vaut un avertissement.
  if (e.type === 4 && e.hp / e.maxHp < 0.12) return frameOf(base + "open");

  if (e.type === 3) {
    const last = shooterFire.get(e.id);
    if (last !== undefined) {
      const since = performance.now() - last;
      if (since < SHOOTER_RECOIL) return frameOf(base + "open");   // canon avance
      const untilNext = def.shootCd * 1000 - since;
      if (untilNext > 0 && untilNext < SHOOTER_AIM) {
        return frameOf(base + "walkB");                            // canon recule
      }
    }
    return frameOf(base + "idle");
  }

  // Les autres alternent leurs deux images de marche, a une cadence
  // proportionnelle a leur vitesse.
  const step = Math.floor(t * def.speed / 90) & 1;
  return frameOf(base + (step ? "walkA" : "walkB"));
}

function drawEnemies(list) {
  const t = performance.now();
  const ts = t / 1000;
  for (const e of list) {
    const def = ENEMY_TYPES[e.type] ?? ENEMY_TYPES[0];
    const r = e.elite ? def.r * CFG.ELITE_RADIUS_MUL : def.r;

    /* Retour d'impact : eclair blanc et recul de quelques pixels dans l'axe du
       tir. Le recul ne deplace QUE le sprite, jamais la barre de vie ni les
       halos — la position reelle de l'ennemi ne bouge pas, et un marqueur qui
       sautille dirait le contraire. */
    const hit = hits.get(e.id);
    const flash = hit ? Math.max(0, (hit.until - t) / (HIT_FLASH * 1000)) : 0;
    const kx = flash > 0 ? hit.dx * HIT_KICK * flash : 0;
    const ky = flash > 0 ? hit.dy * HIT_KICK * flash : 0;

    /* Retardataire. Le halo n'est pas decoratif : il dit au joueur que ces
       ennemis-la sont les derniers de la vague, qu'ils foncent desormais sur
       lui et qu'il n'a plus a les chercher. Sans ce signal, l'acceleration
       soudaine des fuyards passait pour une irregularite du jeu.
       Dessine AVANT le halo d'elite, en cercle plein et large, pour que les
       deux se distinguent : celui-ci marque une position, celui-la un rang. */
    if (e.straggler) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 160 + e.id);
      ctx.fillStyle = STRAGGLER_HALO;
      ctx.globalAlpha = 0.10 + pulse * 0.14;
      ctx.beginPath(); ctx.arc(e.x, e.y, r + 13 + pulse * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // L'elite doit se reperer dans une foule de deux cents silhouettes : un
    // halo qui pulse et un lisere dore, lisibles meme au milieu de la masse.
    if (e.elite) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 240 + e.id);
      ctx.strokeStyle = ELITE_GOLD;
      ctx.globalAlpha = 0.3 + pulse * 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r + 6 + pulse * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* Respiration, etirement et ecrasement, tous les trois par `scale` : le
       budget d'atlas ne paie QUE les changements de forme. Le dephasage par
       identifiant est indispensable — en phase, deux cents creatures pulsent
       ensemble et l'arene respire comme un seul organisme. */
    const breath = 1 + 0.03 * Math.sin(ts * BREATH_HZ * Math.PI * 2 + e.id * 1.7);
    const squash = flash > 0 ? 0.12 * flash : 0;
    // Le rang d'elite est une ECHELLE et un contour, pas une image de plus :
    // la taille est le signal le plus rapide a lire dans une foule de deux
    // cents, et les collisions restent sur le rayon logique.
    const gain = (e.elite ? CFG.ELITE_RADIUS_MUL : 1) * breath;

    drawSprite(ctx, enemyFrame(e, ts, def), e.x + kx, e.y + ky, {
      angle: e.ang ?? 0,
      scaleX: gain * (1 + squash * 0.5),
      scaleY: gain * (1 - squash),
      flash,
    });

    if (e.hp < e.maxHp) {
      const w = r * 2;
      const tx = e.x - r, ty = e.y - r - 9;
      ctx.fillStyle = alpha(SURFACE.shadow, 0.45);
      ctx.fillRect(tx, ty, w, 3);
      ctx.fillStyle = e.elite ? ELITE_GOLD : (ENEMY_TINT[e.type] ?? ENEMY_TINT[0]);
      ctx.fillRect(tx, ty, w * (e.hp / e.maxHp), 3);
    }
  }
}

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

/* Tension d'annonce, 0 a 1. Deduite des bandeaux d'alerte deja en place — donc
   deja cales sur la timeline interpolee — et pas d'un champ de plus dans le
   snapshot : une consigne ou un avertissement affiche signifie exactement
   « quelque chose va tomber », c'est-a-dire l'instant ou le corps doit se
   ramasser. Elle monte a l'approche de l'echeance, comme le remplissage d'un
   telegraphe de zone. */
function bossTension(now) {
  let k = 0;
  for (const a of [alertOrder, alertWarn]) {
    if (!a || now > a.until) continue;
    const p = (now - a.from) / Math.max(1, a.until - a.from);
    k = Math.max(k, Math.min(1, p));
  }
  return k;
}

function drawBoss(b) {
  const r = CFG.BOSS_RADIUS;
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

  ctx.fillStyle = alpha(skin, 0.10);
  ctx.beginPath(); ctx.arc(b.x, b.y, r + 22, 0, Math.PI * 2); ctx.fill();

  /* Contraction d'annonce : jusqu'a -8 % sur les deux axes. Assez pour se voir
     du coin de l'oeil, trop peu pour qu'on croie que le boss recule. */
  const tense = bossTension(now);
  const squash = 1 - tense * 0.08;

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(squash, squash);
  const S = { r, t, skin, dark, edge, wounded, ang: b.ang ?? 0,
              phase: b.phase ?? 0, bars: b.bars ?? 4, tense, twin };
  switch (kind) {
    case BOSS_MATRIARCHE: drawBossMatriarche(S); break;
    case BOSS_METRONOME:  drawBossMetronome(S); break;
    case BOSS_ORACLE:     drawBossOracle(S); break;
    case BOSS_JUMEAUX:    drawBossJumeaux(S); break;
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
function bossSheet() {
  const r = CFG.BOSS_RADIUS;
  const pas = (r + 26) * 2;
  const poses = [0, 1, 2, 3, 4, 4];       // les Jumeaux comptent pour deux
  const c = document.createElement("canvas");
  c.width = pas * poses.length;
  c.height = pas;
  const g = c.getContext("2d");

  const garde = ctx;
  ctx = g;
  poses.forEach((kind, i) => {
    drawBoss({
      kind, x: pas * i + pas / 2, y: pas / 2, ang: 0,
      hp: 100, maxHp: 100, bars: 4, phase: 0,
      twin: kind === 4 && i === poses.length - 1 ? 1 : 0,
    });
  });
  ctx = garde;

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
  const { r, t, skin, dark, edge, tense } = S;

  ctx.save();
  ctx.rotate(t * 0.6);
  ctx.fillStyle = dark;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    // Les pointes RENTRENT a l'annonce, comme un animal qui se ramasse.
    const out = r + 14 - tense * 10;
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
  const { r, t, skin, dark, edge, phase, bars, tense } = S;
  ctx.save();
  ctx.rotate(S.ang);

  // Quatre appendices courts et irreguliers, chacun en SOUS-TRACE : enchaines
  // au corps ils y creuseraient une entaille — le bug est documente pour le
  // grunt et le tank.
  ctx.fillStyle = dark;
  const legs = [[-0.75, 0.55], [0.55, 0.75], [2.35, 0.6], [3.6, 0.8]];
  for (const [a0, len] of legs) {
    const a = a0 + Math.sin(t * 1.4 + a0) * 0.07;
    const out = r * (1 + len) * (1 - tense * 0.12);
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
    const k = 1 + Math.sin(t * 2.2 + i * 1.3 + Math.PI) * 0.18;
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
  const { r, t, skin, dark, edge, tense } = S;

  // Trois anneaux, trois vitesses, trois inclinaisons. Des vitesses proches
  // auraient donne un seul mouvement flou ; le rapport 1 / -1,6 / 2,7 se lit.
  const rings = [
    { rad: r * 1.05, w: 5, spin: 1.0, tilt: 0.0, col: dark },
    { rad: r * 0.78, w: 4, spin: -1.6, tilt: 0.7, col: skin },
    { rad: r * 0.5, w: 3, spin: 2.7, tilt: 1.4, col: skin },
  ];
  for (const ring of rings) {
    ctx.save();
    ctx.rotate(t * ring.spin);
    // L'ecrasement fait tourner l'anneau DANS l'espace : un cercle parfait qui
    // tourne ne montre rien, et c'est le mouvement qui est l'identite ici.
    ctx.scale(1, 0.42 + 0.58 * Math.abs(Math.cos(t * ring.spin * 0.5 + ring.tilt)));
    ctx.strokeStyle = ring.col;
    ctx.lineWidth = ring.w;
    ctx.beginPath(); ctx.arc(0, 0, ring.rad * (1 - tense * 0.1), 0, Math.PI * 2);
    ctx.stroke();
    // Un ergot par anneau : sans lui la rotation d'un cercle est invisible.
    ctx.fillStyle = edge;
    ctx.beginPath(); ctx.arc(ring.rad * (1 - tense * 0.1), 0, ring.w * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Noyau VIDE : un anneau fin et rien dedans. C'est ce qui le distingue des
  // quatre autres, qui ont tous un corps plein.
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = alpha(BOSS.eye, 0.5 + tense * 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.stroke();
}

/* L'ORACLE — cohesion. Un grand oeil unique entoure d'anneaux FLOTTANTS,
   separes du corps, avec des glyphes qui s'allument. Les anneaux servent aussi
   de telegraphe : ils s'orientent vers ce qui va se passer, c'est-a-dire vers
   la direction du boss, et se resserrent a l'annonce. */
function drawBossOracle(S) {
  const { r, t, skin, dark, edge, tense } = S;

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
    ctx.arc(0, 0, r * (1.15 - i * 0.22) * (1 - tense * 0.12), 0.5, Math.PI * 2 - 0.5);
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
    ctx.strokeStyle = alpha(BOSS.eye, 0.25 + lit * 0.75);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.44);
    ctx.lineTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
    ctx.stroke();
  }
  ctx.restore();

  // L'oeil. Iris qui suit l'orientation du boss : c'est ce qui dit « il te
  // regarde », et c'est toute l'identite de la creature.
  const eyeR = r * 0.34 * (1 - tense * 0.25);
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
  const { r, t, skin, dark, edge, twin, tense } = S;
  const side = twin ? 1 : -1;          // -1 : moitie gauche, +1 : moitie droite

  ctx.save();
  ctx.rotate(S.ang);
  // Oscillation en OPPOSITION de phase entre les deux : en phase, ils
  // paraissaient un seul objet coupe en deux plutot que deux creatures.
  ctx.rotate(Math.sin(t * 1.3 + (twin ? Math.PI : 0)) * 0.09);

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
  const ex = side * r * 0.42;
  ctx.fillStyle = BOSS.maw;
  ctx.beginPath(); ctx.arc(ex, 0, r * 0.3 * (1 - tense * 0.2), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BOSS.eye;
  ctx.beginPath(); ctx.arc(ex, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
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
function drawMarkColumns(marks, t) {
  for (const m of marks) {
    if (m.mech !== MECH_TOWER && m.mech !== MECH_COUNT
        && m.mech !== MECH_STACK && m.mech !== MECH_SANCTUARY) continue;
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

function drawMarks(marks, players) {
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
      case MECH_TOWER:
      case MECH_COUNT: {
        const ok = m.mech === MECH_COUNT ? m.cur === m.need : m.cur >= 1;
        const col = ok ? MARK.ok : MARK_GO;
        ctx.fillStyle = ok ? alpha(FX.beacon, 0.14) : alpha(SIGNAL.go, 0.10);
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
        ctx.strokeStyle = alpha(FX.beacon, 0.5 + pulse * 0.4);
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
        ctx.fillStyle = alpha(FX.beacon, 0.16);
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

// Derniere position connue du boss : le lien nourricier y pointe sans avoir a
// transporter une seconde paire de coordonnees par rejeton.
const lastBossPos = { x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2 };

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
const lastPlayerPos = new Map();

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

function drawPlayers(list, tm, marks = []) {
  for (const p of list) {
    const isMe = p.id === myId;
    const x = isMe && predicted ? predicted.x : p.x;
    const y = isMe && predicted ? predicted.y : p.y;
    const col = colorOf(p.id);

    if (p.downed) {
      const ang = Math.atan2(p.aimY, p.aimX);
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

      /* LA FORME DIT LA CLASSE, LA COULEUR DIT LE JOUEUR. Les quatre couleurs
         de joueur etaient deja prises par l'identite individuelle : faire
         porter la classe par la couleur aussi rendait soit deux tanks
         identiques, soit deux joueurs confondus. Les trois silhouettes sont
         donc distinctes de loin, et la teinte reste celle du joueur.

         Le mode soin est la seule exception, et c'est voulu : la bascule est
         une posture qui dure, elle doit se lire sur le personnage lui-meme et
         pas seulement sur ses projectiles — c'est une information tactique
         pour toute l'equipe. */
      const moving = playerMoving(p.id, x, y);
      const teinte = dashing ? FX.flash
        : ((p.skillFlags & SKILL_HEAL_MODE) ? CLASS_COLOR.soigneur : col);
      const frame = classFrame(p, moving ? "move" : "idle");
      const ang = Math.atan2(p.aimY, p.aimX);
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
function drawOrbiters(list, tm) {
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

function fmtTime(t) {
  const m = String(Math.floor(t / 60)).padStart(2, "0");
  const s = String(Math.floor(t % 60)).padStart(2, "0");
  return m + ":" + s;
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/* Ce que chaque barre brisee ajoute au repertoire. La liste n'est plus ecrite
   a la main : elle se lit dans `BOSS_ROSTER`, sinon elle mentirait des le
   deuxieme boss — c'est exactement ce qui est arrive quand le Ravageur etait
   seul et que le texte etait recopie ici. */
const ATTACK_LABEL = {
  salve: "salve radiale", marques: "marques au sol", charge: "charge",
  damier: "damier — une case sur deux, puis l'autre moitié",
  couronne: "couronne — le centre puis l'anneau, ou l'inverse",
  couloirs: "couloirs — trois bandes, puis les perpendiculaires",
  balayage: "balayage — cours avec l'aiguille",
  spirale: "spirale — cours dans le sens de rotation",
  traque: "traque — la zone se pose sur toi, trois fois",
  mur: "mur — suis le trou",
  quadrant: "verrouillage — un quart de l'arène s'interdit",
  grappes: "grappes — détruis-les avant l'éclosion",
  nourriciers: "rejetons nourriciers — tue-les, ils la soignent",
  prison: "prison — libère le prisonnier",
  proximite: "proximité — le centre est mortel",
  exaflare: "exaflares — seule la première est annoncée",
  appat: "appâts — ton fantôme dépose les zones",
  derive: "dérive — les disques glissent",
  sanctuaire: "sanctuaires — reste sur les disques sûrs",
  verglas: "sol glissant — le sol ne répond plus tout de suite",
  rassemblement: "regroupement — partagez les dégâts",
  dispersion: "dispersion — écartez-vous",
  tours: "tours — occupez-les toutes",
  denombrement: "dénombrement — le nombre inscrit doit être exact",
  regard: "regard — ne visez plus le boss",
  lien: "lien — éloignez-vous pour le rompre",
  croix: "croix — l'intersection est mortelle",
};

function phaseUnlockText(kind, phase) {
  const list = bossAt(kind).unlock[phase - 1];
  if (!list || !list.length) return "il accélère";
  return list.map(k => ATTACK_LABEL[k] ?? k).join(" · ");
}


window.__clientReady = true;
