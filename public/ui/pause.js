
import { onLangChange, t, tf } from "/shared/i18n.js";
import { PHASE_ROUND, amSpectator, hostId, hudDps, hudStats, myId, pauseReal, phase, setHudDps, setHudStats, ws } from "../core/state.js";
import { openBuild } from "./build.js";
import { hudPauseEl, pauseConfirm, pauseEl, pauseQuitAsk, pauseQuitBtn, pauseState, updateVersion } from "./dom.js";

const statsBtn = document.getElementById("pauseStats");
const dpsBtn = document.getElementById("pauseDps");

function renderHudOptions() {
  statsBtn.textContent = hudStats
    ? t("ui.pause.stats.on", "Panneau de statistiques : affiché")
    : t("ui.pause.stats.off", "Panneau de statistiques : masqué");
  statsBtn.classList.toggle("on", hudStats);
  dpsBtn.textContent = hudDps
    ? t("ui.pause.dps.on", "Compteur de dégâts : affiché")
    : t("ui.pause.dps.off", "Compteur de dégâts : masqué");
  dpsBtn.classList.toggle("on", hudDps);
}
onLangChange(() => {
  renderHudOptions();
  applyPause();
});
statsBtn.onclick = () => { setHudStats(!hudStats); renderHudOptions(); };
dpsBtn.onclick = () => { setHudDps(!hudDps); renderHudOptions(); };
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
