
import { onLangChange, t } from "/shared/i18n.js";
import { PHASE_ROUND, amSpectator, hudDps, hudStats, myId, pauseReal, phase, setHudDps, setHudStats, ws } from "../core/state.js";
import { openBuild } from "./build.js";
import { pauseConfirm, pauseEl, pauseQuitAsk, pauseQuitBtn, pauseState, updateVersion } from "./dom.js";

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
  if (!pauseEl.hidden) renderPauseState();
});
statsBtn.onclick = () => { setHudStats(!hudStats); renderHudOptions(); };
dpsBtn.onclick = () => { setHudDps(!hudDps); renderHudOptions(); };
renderHudOptions();

export function renderPauseState() {
  pauseState.textContent = pauseReal
    ? t("ui.pause.state.solo", "simulation figée — personne d'autre n'attend")
    : t("ui.pause.state.multi", "la partie continue — pause indisponible à plusieurs");
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
  if (!amSpectator) ws?.send(JSON.stringify({ t: "pause", on: 1 }));
  renderPauseState();
  updateVersion();
}
export function closePause() {
  if (pauseEl.hidden) return;
  pauseEl.hidden = true;
  pauseConfirm.hidden = true;
  ws?.send(JSON.stringify({ t: "pause", on: 0 }));
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
