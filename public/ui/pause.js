
import { onLangChange, t, tf } from "/shared/i18n.js";
import { GFX_KEYS, GFX_ULTRA, PHASE_ROUND, amSpectator, gfx, hostId, hudDps, hudStats, myId, pauseReal, phase, setGfx, setHudDps, setHudStats, ws } from "../core/state.js";
import { openBuild } from "./build.js";
import { hudPauseEl, pauseConfirm, pauseEl, pauseQuitAsk, pauseQuitBtn, pauseState, updateVersion } from "./dom.js";

const teleBtn = document.getElementById("pauseTele");
const gfxBtn = document.getElementById("pauseGfx");

const GFX_NOM = ["basse", "moyenne", "élevée", "ultra"];

/* DEUX BOUTONS POUR UN SEUL PANNEAU : le compteur de degats et le panneau de
   statistiques etaient deux interrupteurs independants alors qu'ils sont deux
   NIVEAUX de la meme couche. Un seul controle, trois crans — et les deux
   drapeaux restent, donc un reglage deja enregistre se relit tel quel. */
const TELE_NOM = ["masquée", "combat", "détail"];
const teleNiveau = () => hudStats ? 2 : hudDps ? 1 : 0;

function renderHudOptions() {
  const n = teleNiveau();
  teleBtn.textContent = tf("ui.pause.tele", "Télémétrie : {n}",
    { n: t(`ui.pause.tele.${n}`, TELE_NOM[n]) });
  teleBtn.classList.toggle("on", n > 0);
  gfxBtn.textContent = tf("ui.pause.gfx", "Qualité graphique : {n}",
    { n: t(`ui.pause.gfx.${GFX_KEYS[gfx]}`, GFX_NOM[gfx]) });
  gfxBtn.classList.toggle("on", gfx > 0);
}
onLangChange(() => {
  renderHudOptions();
  applyPause();
});
teleBtn.onclick = () => {
  const n = (teleNiveau() + 1) % 3;
  setHudDps(n >= 1);
  setHudStats(n === 2);
  renderHudOptions();
};
gfxBtn.onclick = () => { setGfx((gfx + 1) % (GFX_ULTRA + 1)); renderHudOptions(); };
renderHudOptions();

// le nom de celui qui a fige la partie : le serveur envoie une DONNEE (`par`),
// pas une phrase.
let pausePar = "";
export function setPausePar(nom) { pausePar = nom || ""; }

// la pause de l'hote vaut pour TOUT LE MONDE : celui qui n'a pas ouvert le menu
// n'a que le bandeau pour comprendre pourquoi son ecran ne bouge plus.
export function applyPause() {
  const montrer = pauseReal && pauseEl.hidden && phase === PHASE_ROUND;
  hudPauseEl.hidden = !montrer;
  if (montrer) {
    hudPauseEl.textContent = t("ui.pause.banner", "PARTIE EN PAUSE");
    const sous = document.createElement("span");
    sous.className = "par";
    sous.textContent = pausePar
      ? tf("ui.pause.banner.par", "mise en pause par {qui}", { qui: pausePar })
      : t("ui.pause.banner.seul", "en attente de la reprise");
    hudPauseEl.appendChild(sous);
  }
  if (!pauseEl.hidden) renderPauseState();
}

function renderPauseState() {
  pauseState.textContent = pauseReal
    ? t("ui.pause.state.on", "simulation figée — la partie est en pause pour tout le monde")
    : myId === hostId
      ? t("ui.pause.state.solo", "simulation figée — personne d'autre n'attend")
      : t("ui.pause.state.multi", "la partie continue — seul l'hôte peut la mettre en pause");
  pauseState.classList.toggle("live", !pauseReal);
  pauseQuitBtn.hidden = false;
  pauseQuitBtn.textContent = amSpectator
    ? t("ui.pause.leaveRoom", "Quitter la salle")
    : t("ui.pause.quit", "Quitter la manche");
  pauseQuitAsk.textContent = amSpectator
    ? t("ui.pause.leaveRoom.ask", "Quitter la salle ? Tu retournes à la liste des salons.")
    : t("ui.pause.quit.ask",
        "Quitter la manche en cours ? Tu redeviens spectateur jusqu'à la suivante.");
}
export function openPause() {
  if (phase !== PHASE_ROUND) return;
  pauseEl.hidden = false;
  pauseConfirm.hidden = true;
  // l'hote peut figer la partie meme en spectateur : c'est le SERVEUR qui
  // decide, le client demande.
  ws?.send(JSON.stringify({ t: "pause", on: 1 }));
  applyPause();
  updateVersion();
}
export function closePause() {
  if (pauseEl.hidden) { applyPause(); return; }
  pauseEl.hidden = true;
  pauseConfirm.hidden = true;
  ws?.send(JSON.stringify({ t: "pause", on: 0 }));
  applyPause();
  updateVersion();
}
document.getElementById("pauseResume").onclick = closePause;
document.getElementById("pauseBuild").onclick = () => openBuild(myId);
pauseQuitBtn.onclick = () => { pauseConfirm.hidden = false; };
document.getElementById("pauseQuitNo").onclick = () => { pauseConfirm.hidden = true; };
document.getElementById("pauseQuitYes").onclick = () => {
  ws?.send(JSON.stringify({ t: amSpectator ? "leaveRoom" : "leaveRound" }));
  closePause();
};
updateVersion();
