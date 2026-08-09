/* ===========================================================================
   MENU PAUSE
   Une pause n'a de sens qu'a UN SEUL joueur, et c'est le serveur qui l'accorde.
   Le client ouvre le meme panneau dans les deux cas ; `pauseReal` ne vaut vrai
   que sur la reponse du serveur.
   =========================================================================== */

import { PHASE_ROUND, amSpectator, myId, pauseReal, phase, ws } from "../core/state.js";
import { openBuild } from "./build.js";
import { pauseConfirm, pauseEl, pauseQuitAsk, pauseQuitBtn, pauseState, updateVersion } from "./dom.js";

export function renderPauseState() {
  pauseState.textContent = pauseReal
    ? "simulation figée — personne d'autre n'attend"
    : "la partie continue — pause indisponible à plusieurs";
  pauseState.classList.toggle("live", !pauseReal);
  /* Un spectateur n'a pas de manche a quitter, mais il a une SALLE a quitter —
     et pendant une manche le menu pause est sa seule porte de sortie : le
     salon (`#panel`, qui porte le bouton « quitter la salle ») est cache. Sans
     ce cas, un spectateur arrive sur une partie en cours y restait prisonnier
     jusqu'a la fin de la manche. Meme bouton, meme confirmation : deux boutons
     auraient demande deux libelles a lire au moment ou l'un des deux n'existe
     jamais. */
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
  // Le menu pause est la seule exception au masquage en manche : c'est ici qu'on
  // recopie un numero de version dans un rapport de defaut.
  updateVersion();
}
export function closePause() {
  if (pauseEl.hidden) return;
  pauseEl.hidden = true;
  pauseConfirm.hidden = true;
  // On leve la pause meme si le serveur ne l'avait pas accordee : le message
  // est sans effet dans ce cas, et le tester ici aurait fait deux chemins la
  // ou un seul suffit.
  ws?.send(JSON.stringify({ t: "pause", on: 0 }));
  updateVersion();
}
document.getElementById("pauseResume").onclick = closePause;
document.getElementById("pauseBuild").onclick = () => openBuild(myId);
pauseQuitBtn.onclick = () => { pauseConfirm.hidden = false; };
document.getElementById("pauseQuitNo").onclick = () => { pauseConfirm.hidden = true; };
document.getElementById("pauseQuitYes").onclick = () => {
  // `leaveRound` est un message de SALLE (elle le route vers la simulation),
  // `leaveRoom` un message de HUB : un spectateur n'est dans aucune manche, il
  // sort de la salle. Le retour au hub arrive par `roomClosed`, qui referme le
  // menu — on n'y touche pas ici.
  ws?.send(JSON.stringify({ t: amSpectator ? "leaveRoom" : "leaveRound" }));
  closePause();
};
/* Mise en place immediate : au chargement, `#gate` est ouvert et personne n'a
   encore appele `refreshPanel()`, qui sort des sa premiere garde tant qu'on
   n'est pas connecte. */
updateVersion();
