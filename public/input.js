
import { CFG } from "/shared/game_state.js";
import { ARMES } from "/shared/armes.js";
import { BANC, INPUT_HZ, PHASE_ROUND, amSpectator, bancReleve, cardsState, connected, dash, keys, latest, merchantState, myDashCd, myId, notePress, phase, predicted, setBancReleve, skills, ws } from "./core/state.js";
import { aimRange, aimVector, updateMouse } from "./render/stage.js";
import { closeBuild, cycleBuild, openBuild } from "./ui/build.js";
import { buildEl, cv, enSaisie, pauseEl, readMove } from "./ui/dom.js";
import { closePause, openPause } from "./ui/pause.js";

function requestInteract() {
  if (phase !== PHASE_ROUND || amSpectator || cardsState || merchantState) return;
  if (!pauseEl.hidden) return;
  if (latest?.players.get(myId)?.downed) return;
  skills.f = true;
}

function requestSkill(n) {
  if (phase !== PHASE_ROUND || amSpectator || cardsState || merchantState) return;
  if (!pauseEl.hidden) return;
  if (latest?.players.get(myId)?.downed) return;
  notePress(n);
  if (n === 1) skills.s1 = true;
  else if (n === 2) skills.s2 = true;
  else skills.s3 = true;
}
addEventListener("keydown", e => {
  if (enSaisie()) return;
  const repeat = keys.has(e.code);
  keys.add(e.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }

  if (e.code === "Space" && !repeat && !e.repeat) requestDash();
  const s1 = e.code === "Digit1" || e.code === "Numpad1" || e.code === "KeyQ";
  const s2 = e.code === "Digit2" || e.code === "Numpad2" || e.code === "KeyE";
  const s3 = e.code === "Digit3" || e.code === "Numpad3" || e.code === "KeyR";
  if (s1 && !repeat && !e.repeat) requestSkill(1);
  if (s2 && !repeat && !e.repeat) requestSkill(2);
  if (s3 && !repeat && !e.repeat) requestSkill(3);
  /* LA TOUCHE D INTERACTION EST GENERIQUE, pas « la touche contrat » : une touche
     par systeme est ce qui rend un jeu impossible a apprendre. Elle ouvrira le
     ramassage volontaire et l activation sans rien deplacer.
     `e.code` est independant de la disposition : `KeyF` est la meme touche
     physique en AZERTY et en QWERTY — et `enSaisie()` garde deja la porte, donc
     taper un nom de salle ne declenche rien. */
  if (e.code === "KeyF" && !repeat && !e.repeat) requestInteract();
});
/* LA GACHETTE. Le bouton GAUCHE etait le seul libre — le milieu porte la
   troisieme competence — et il ne servait a rien parce que le tir est
   automatique. Une carte le rend utile sans rien deplacer.

   ELLE EST TENUE, PAS CLIQUEE, et elle se relache sur trois evenements et pas
   un : `mouseup` bien sur, mais aussi `blur` de la fenetre et `mouseleave` du
   canvas. Sans les deux derniers, un alt-tab en plein tir laisse la gachette
   ENFONCEE pour toujours — le joueur revient a une arme qui surchauffe seule et
   rien ne le lui dit.

   `tirTenu()` rend TOUJOURS une valeur, et le serveur ne la lit que si la carte
   est posee : aucune des dix armes ne change de comportement sans elle. */
let gachette = false;
export function tirTenu() { return gachette; }
cv.addEventListener("mousedown", e => {
  if (e.button === 0) { gachette = true; return; }
  if (e.button !== 1) return;
  e.preventDefault();
  requestSkill(3);
});
addEventListener("mouseup", e => { if (e.button === 0) gachette = false; });
cv.addEventListener("mouseleave", () => { gachette = false; });
addEventListener("blur", () => { gachette = false; });
cv.addEventListener("contextmenu", e => e.preventDefault());
addEventListener("keyup", e => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
addEventListener("keydown", e => {
  if (e.code !== "Tab" || enSaisie()) return;
  e.preventDefault();
  if (cardsState) return;
  if (buildEl.hidden) openBuild(myId); else closeBuild();
});
addEventListener("keydown", e => {
  if (buildEl.hidden) return;
  if (e.code !== "ArrowLeft" && e.code !== "ArrowRight" && e.code !== "Escape") return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (e.code === "ArrowLeft") cycleBuild(-1);
  else if (e.code === "ArrowRight") cycleBuild(1);
  else closeBuild();
}, true);
addEventListener("keydown", e => {
  if (e.code !== "Escape" || enSaisie()) return;
  if (phase !== PHASE_ROUND) return;
  e.preventDefault();
  if (pauseEl.hidden) openPause(); else closePause();
});
function requestDash() {
  if (phase !== PHASE_ROUND || amSpectator || !predicted) return;
  if (!pauseEl.hidden) return;
  notePress(0);
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
/* LE BANC : dix armes sous les chiffres, la densite sous les crochets, le HUD
   sous H. Rien de tout ceci n'existe sans `?banc` cote client ET `BANC=1` cote
   serveur — le client se contente d'emettre, le serveur decide.
   Le test du NOM MASQUE est le seul des quatre protocoles ouverts qui demande
   de CACHER quelque chose : on doit pouvoir regarder dix secondes de combat et
   nommer l'arme sans qu'un panneau la donne. */
const BANC_RELEVE_MS = 10000;
let bancEl = null;
function bancDit(txt) {
  if (!bancEl) {
    bancEl = document.createElement("div");
    bancEl.id = "bancDit";
    document.body.appendChild(bancEl);
  }
  bancEl.textContent = txt;
}
if (BANC) {
  let pop = 0;
  addEventListener("keydown", e => {
    if (enSaisie() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!connected || ws.readyState !== WebSocket.OPEN) return;
    const chiffre = "Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0"
      .split(" ").indexOf(e.code);
    if (chiffre >= 0 && chiffre < ARMES.length) {
      e.preventDefault();
      ws.send(JSON.stringify({ t: "chooseArme", id: ARMES[chiffre].id }));
      bancDit(ARMES[chiffre].nom);
      return;
    }
    if (e.code === "BracketRight" || e.code === "BracketLeft") {
      e.preventDefault();
      pop = Math.max(0, Math.min(300, pop + (e.code === "BracketRight" ? 50 : -50)));
      ws.send(JSON.stringify({ t: "bancPop", n: pop }));
      bancDit(pop === 0 ? "densite libre" : pop + " corps");
      return;
    }
    if (e.code === "KeyH") {
      e.preventDefault();
      const off = document.body.classList.toggle("sansHud");
      bancDit(off ? "HUD masque" : "HUD rendu");
      return;
    }
    // LE RELEVE : dix secondes, une ligne, et on passe au palier suivant. Lire
    // un compteur qui bouge et le recopier a la main donne vingt mesures dont
    // aucune n'est comparable a la suivante.
    if (e.code === "KeyR") {
      e.preventDefault();
      if (bancReleve > 0) { setBancReleve(0); bancDit("releve annule"); return; }
      setBancReleve(performance.now() + BANC_RELEVE_MS);
      bancDit("releve " + (BANC_RELEVE_MS / 1000) + " s…");
    }
  });
}
addEventListener("mousemove", updateMouse);
addEventListener("mousedown", updateMouse);
setInterval(() => {
  if (!connected || ws.readyState !== WebSocket.OPEN) return;
  if (phase !== PHASE_ROUND || amSpectator) return;
  const m = readMove();
  const a = aimVector();
  /* LA GACHETTE EST CONTINUE, comme la visee et la portee au reticule : on la
     TIENT. Les ponctuels (`d`, `s1`..`s3`) se remettent a zero apres chaque
     tick, celle-ci non — sans quoi relacher la souris une image sur deux
     hacherait le tir.
     Elle part TOUJOURS, meme sans la carte : le serveur ne la lit que si
     `tirManuel` est pose, et un champ conditionnel aurait fait deux formes de
     message a tenir. Un booleen par tick a 30 Hz ne se mesure pas. */
  const msg = { t: "input", x: m.x, y: m.y, ax: a.ax, ay: a.ay, ar: aimRange(),
                tir: tirTenu() };
  if (dash.pending) { msg.d = 1; dash.pending = false; }
  if (skills.s1) { msg.s1 = 1; skills.s1 = false; }
  if (skills.s2) { msg.s2 = 1; skills.s2 = false; }
  if (skills.s3) { msg.s3 = 1; skills.s3 = false; }
  if (skills.f) { msg.f = 1; skills.f = false; }
  ws.send(JSON.stringify(msg));
}, 1000 / INPUT_HZ);
