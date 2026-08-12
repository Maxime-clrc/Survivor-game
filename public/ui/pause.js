
import { PHASE_ROUND, amSpectator, myId, pauseReal, phase, ws } from "../core/state.js";
import { openBuild } from "./build.js";
import { pauseConfirm, pauseEl, pauseQuitAsk, pauseQuitBtn, pauseState, updateVersion } from "./dom.js";

export function renderPauseState() {
  pauseState.textContent = pauseReal
    ? "simulation figée — personne d'autre n'attend"
    : "la partie continue — pause indisponible à plusieurs";
  pauseState.classList.toggle("live", !pauseReal);
  pauseQuitBtn.hidden = false;
  pauseQuitBtn.textContent = amSpectator ? "Quitter la salle" : "Quitter la manche";
  pauseQuitAsk.textContent = amSpectator
    ? "Quitter la salle ? Tu retournes à la liste des salons."
    : "Quitter la manche en cours ? Tu redeviens spectateur jusqu'à la suivante.";
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
