/* ===========================================================================
   CHARGEMENT ET ENTREE
   Le clic « Se connecter » est le seul geste dont on soit certain avant la
   premiere balle : c'est lui qui debloque le contexte audio ET qui declenche la
   generation des atlas.
   =========================================================================== */

import { initAudio } from "/audio.js";
import { startMusic } from "/music.js";
import { VERSION } from "/shared/version.js";
import { atlasStats, bindGL, buildAtlas, frameOf, glActive, silhouetteSheet } from "/sprites.js";
import { PERF, inRoom, sendAuth, signalerErreur, ws } from "../core/state.js";
import { bossSheet } from "../render/boss.js";
import { PARTICLE_GL, PARTICLE_MAX, fxWhite, setFxWhite, setPARTICLE_MAX } from "../render/fx.js";
import { gl, overCtx, resize, underCtx } from "../render/stage.js";
import { escapeHtml, gate, gateBuildEl, gateContinueBtn, gateFormsEl, gateHold, gateRoomsEl, gateServerEl, gateSwitchEl, goBtn, loadingEl, loginFormEl, nameInput, passInput, regGoBtn, regNameInput, regPass2Input, regPassInput, registerFormEl, setGateBusy, setLoading, setStatus, tabLoginBtn, tabRegisterBtn } from "./dom.js";
import { enterHub, myPing, refreshPanel, renderTopPing, setMyPing } from "./screens.js";

/* L'ecran d'entree n'a qu'un chemin de connexion : « Se connecter ». La
   session memorisee (jeton) s'y absorbe — pseudo prerempli, et un champ mot
   de passe laisse VIDE reprend la session, comme l'ancienne cle relue en
   silence a l'envoi. Le libelle du champ le dit, sinon un champ obligatoire
   qu'on peut laisser vide passe pour un bug. */
export function renderGateMode() {
  gateFormsEl.hidden = false;
  // L'encart « déjà connecté ailleurs » ne survit pas a un retour sur l'ecran
  // d'entree : il commente une connexion precise, pas la suivante.
  gateHold.hidden = true;
  const pseudo = localStorage.getItem("survivor.pseudo") || "";
  const token = localStorage.getItem("survivor.token") || "";
  if (!nameInput.value) nameInput.value = pseudo;
  passInput.placeholder = pseudo && token
    ? "mot de passe (vide : reprendre la session)"
    : "mot de passe";
}
/* « Continuer quand même » : le seul chemin depuis l'encart de doublon vers le
   hub. Il etait declare et jamais branche — l'ecran d'entree n'avait donc
   aucune sortie dans ce cas. */
gateContinueBtn.onclick = () => {
  gate.hidden = true;
  if (inRoom) refreshPanel();
  else enterHub();
};
/* L'ETAT DU SERVICE, en pied de colonne gauche. Le client ne peut deduire
   aucun des trois : le navigateur repond aux pings WebSocket sous la couche
   JS, donc la latence lui echappe, et les salles comme la version ne sont
   connues que du serveur. D'ou le message `serverInfo`, seul message
   periodique du jeu hors instantane — et il ne part qu'aux clients hors salle.

   La latence inconnue s'affiche en TIRET et non en « 0 ms », qui se lirait
   comme une connexion parfaite au moment precis ou l'on ne sait rien. */
export function renderServerInfo(info) {
  /* La barre superieure lit la MEME mesure. `serverInfo` couvre le hub ET le
     salon — partout ou l'on ne joue pas — et c'est la source vivante : le
     salon, lui, ne rediffuse qu'sur evenement. */
  setMyPing(info ? Number(info.rtt) : -1);
  renderTopPing();

  if (!gateServerEl) return;

  /* Les trois classes sont celles que la feuille connait — `pending`, aucune,
     `off` — et pas un vocabulaire invente : `.online` / `.offline` n'existent
     nulle part dans le CSS, la pastille serait restee verte et pulsante y
     compris serveur tombe. */
  if (!info) {
    gateServerEl.className = "gateChip off";
    gateServerEl.innerHTML = `<i class="chipDot"></i>serveur injoignable`;
    gateRoomsEl.hidden = true;
    gateBuildEl.hidden = true;
    return;
  }

  const ms = Number(info.rtt);
  const lat = Number.isFinite(ms) && ms >= 0 ? `${ms} ms` : "—";
  gateServerEl.className = "gateChip";
  gateServerEl.innerHTML = `<i class="chipDot"></i>serveur en ligne · ${escapeHtml(lat)}`;

  const n = info.rooms | 0;
  gateRoomsEl.hidden = false;
  gateRoomsEl.textContent = n === 0
    ? "aucune salle ouverte"
    : `${n} salle${n > 1 ? "s" : ""} ouverte${n > 1 ? "s" : ""}`;

  // La version disparait plutot que d'afficher « build — » : une pastille vide
  // n'apprend rien et occupe la place des deux qui, elles, disent quelque chose.
  gateBuildEl.hidden = !info.build;
  if (info.build) gateBuildEl.textContent = `build ${info.build}`;
}
/* Avant la WebSocket, l'etat vient d'une requete HTTP — la socket ne s'ouvre
   qu'au premier clic, et l'ouvrir des le chargement ferait une socket par
   onglet laisse ouvert, comptee dans le plafond par adresse du serveur.

   La LATENCE se mesure ici, en chronometrant l'aller-retour : c'est exactement
   ce que la pastille annonce — en combien de temps le serveur repond. Elle est
   un peu plus haute qu'un ping WebSocket (une requete HTTP porte ses en-tetes),
   et c'est honnete : c'est le temps que met le service a repondre, pas une
   valeur de laboratoire.

   Le sondage s'arrete des que la socket prend le relais (`serverInfo` a 1 Hz,
   avec le vrai aller-retour WebSocket) et des que l'ecran d'entree est ferme :
   personne ne regarde ces pastilles depuis une manche. */
const GATE_POLL_MS = 5000;
let gatePollTimer = 0;
async function pollServerInfo() {
  if (!gate.hidden && (!ws || ws.readyState !== WebSocket.OPEN)) {
    const t0 = performance.now();
    try {
      const r = await fetch("/etat", { cache: "no-store" });
      const info = await r.json();
      renderServerInfo({ ...info, rtt: Math.round(performance.now() - t0) });
    } catch {
      renderServerInfo(null);
    }
  }
  clearTimeout(gatePollTimer);
  gatePollTimer = setTimeout(pollServerInfo, GATE_POLL_MS);
}
/* La bascule d'onglet, redite sous le bouton. Le libelle depend de l'onglet
   ACTIF : proposer « crée un compte » a quelqu'un qui est deja sur le
   formulaire de creation serait un cul-de-sac. */
export function renderGateSwitch(register) {
  if (!gateSwitchEl) return;
  /* Pas de classe sur le bouton : la feuille habille `.gateSwitch button`
     directement. Un `.linkBtn` de plus n'aurait rien style et aurait laissé
     croire le contraire. Un `<button>` et non un `<a>` — ca ne navigue nulle
     part, ca bascule un onglet dans la meme page. */
  gateSwitchEl.innerHTML = register
    ? `Tu as déjà un compte ? <button type="button" id="gateSwitchBtn">Connecte-toi.</button>`
    : `Pas encore de compte ? <button type="button" id="gateSwitchBtn">Crée-en un en dix secondes.</button>`;
  gateSwitchEl.querySelector("#gateSwitchBtn").onclick = () => activateTab(!register);
}
/* La generation des atlas et le contexte audio ne se font qu'UNE fois, au
   premier geste — quel que soit le bouton : connexion, creation ou reprise.
   Les navigateurs exigent un geste utilisateur pour l'audio, et c'est le seul
   ecran ou l'on peut prendre trois secondes. */
let booted = false;
async function bootOnce() {
  if (booted) return;
  booted = true;

  gate.hidden = true;
  loadingEl.hidden = false;
  setLoading(0, "génération des sprites");

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
    setPARTICLE_MAX(PARTICLE_GL);
    setFxWhite(frameOf("fx_white"));
    fxShard = frameOf("fx_shard");
    fxGlow = frameOf("fx_glow");
  }

  setLoading(1, "prêt");
  if (PERF) {
    console.log(`atlas : ${stats.frames} images, ${stats.w}x${stats.h}, ` +
                `${atlasStats().mo.toFixed(1)} Mo — rendu : ` +
                `${gl?.ok ? "WebGL2" : "canvas 2D"}`);
  }
  /* ETAT DE DEMARRAGE, remonte UNE fois. Ce n'est pas une erreur, et ca emprunte
     pourtant le meme canal : ce sont les trois choses qu'on demande toujours en
     premier quand un joueur dit « c'est bizarre chez moi » — quel chemin de
     rendu, quelle densite de pixels, quelle version d'onglet. Les redemander par
     message revient a attendre une reponse ; les avoir dans le journal revient a
     les lire. Une ligne par connexion, jamais plus. */
  signalerErreur("demarrage",
    `rendu ${gl?.ok ? "WebGL2" : "canvas 2D"}, atlas ${stats.frames} images `
    + `${stats.w}x${stats.h}, densite ${window.devicePixelRatio ?? 1}, v${VERSION}`,
    "", false);

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

  /* L'ecran d'entree NE REVIENT PAS ici. Il le faisait, et la premiere
     connexion enchainait alors quatre animations : gate qui part, chargement,
     gate qui revient pour deux cent quarante millisecondes, gate qui repart
     vers le hub. Un battement, sur la toute premiere impression du jeu.
     `sendAuth` part juste apres, donc l'ecran suivant est soit le hub, soit le
     gate rendu par un echec — et les trois chemins d'echec le reaffichent
     eux-memes (`authError`, `onerror`, `onclose`). */
  loadingEl.hidden = true;
}
/* Connexion : le mot de passe part vers le serveur et n'est range NULLE part.
   Un champ mot de passe VIDE avec une session memorisee pour CE pseudo part
   en `loginToken` — c'est la reprise silencieuse, sans bouton a part. Si le
   jeton a expire, `authError{motif:"jeton"}` retombe ici et le joueur tape
   son mot de passe. Retenter apres un `authError` non-fatal reutilise la
   meme socket (sendAuth) : elle est deja ouverte et l'atlas deja construit. */
goBtn.onclick = async () => {
  const pseudo = nameInput.value.trim();
  const pass = passInput.value;
  if (!pseudo) { setStatus("tape ton pseudo", true); return; }

  const storedPseudo = localStorage.getItem("survivor.pseudo") || "";
  const token = localStorage.getItem("survivor.token") || "";
  const canResume = !!token && pseudo.toLowerCase() === storedPseudo.toLowerCase();
  if (!pass && !canResume) { setStatus("tape ton mot de passe", true); return; }

  setGateBusy(true);
  await bootOnce();
  sendAuth(pass
    ? { t: "login", pseudo, pass }
    : { t: "loginToken", pseudo: storedPseudo, token });
};
/* Creation : la confirmation et la longueur se verifient ICI, avant le
   reseau — le serveur revalide de toute facon, mais une faute de frappe ne
   merite pas un aller-retour. */
regGoBtn.onclick = async () => {
  const pseudo = regNameInput.value.trim();
  const pass = regPassInput.value;
  if (!pseudo) { setStatus("choisis un pseudo", true); return; }
  if (pass.length < 8) { setStatus("mot de passe : 8 caractères minimum", true); return; }
  if (pass !== regPass2Input.value) { setStatus("les deux mots de passe ne correspondent pas", true); return; }
  setGateBusy(true);
  await bootOnce();
  sendAuth({ t: "register", pseudo, pass });
};
function activateTab(register) {
  tabLoginBtn.classList.toggle("mine", !register);
  tabRegisterBtn.classList.toggle("mine", register);
  loginFormEl.hidden = register;
  registerFormEl.hidden = !register;
  renderGateSwitch(register);
  setStatus("");
  (register ? regNameInput : nameInput).focus();
}
tabLoginBtn.onclick = () => activateTab(false);
tabRegisterBtn.onclick = () => activateTab(true);
nameInput.onkeydown = e => { if (e.key === "Enter") goBtn.click(); };
passInput.onkeydown = e => { if (e.key === "Enter") goBtn.click(); };
regPass2Input.onkeydown = e => { if (e.key === "Enter") regGoBtn.click(); };
renderGateMode();
renderGateSwitch(false);
pollServerInfo();
nameInput.focus();
