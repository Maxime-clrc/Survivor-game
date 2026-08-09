/* ===========================================================================
   SAISIE — clavier, souris, envoi des intentions
   Le client n'envoie que des intentions : deux directions, la distance au
   reticule, un drapeau d'esquive. Il ne decide jamais de sa position.
   =========================================================================== */

import { CFG } from "/shared/game_state.js";
import { INPUT_HZ, PHASE_ROUND, amSpectator, cardsState, connected, dash, keys, latest, merchantState, myDashCd, myId, phase, predicted, skills, ws } from "./core/state.js";
import { aimRange, aimVector, updateMouse } from "./render/stage.js";
import { closeBuild, cycleBuild, openBuild } from "./ui/build.js";
import { buildEl, cv, enSaisie, pauseEl, readMove } from "./ui/dom.js";
import { closePause, openPause } from "./ui/pause.js";

function requestSkill(n) {
  if (phase !== PHASE_ROUND || amSpectator || cardsState || merchantState) return;
  // Menu pause ouvert : meme raison que le deplacement. Une competence lancee
  // depuis un menu part sur une situation qu'on ne regarde pas.
  if (!pauseEl.hidden) return;
  if (latest?.players.get(myId)?.downed) return;
  if (n === 1) skills.s1 = true;
  else if (n === 2) skills.s2 = true;
  else skills.s3 = true;
}
addEventListener("keydown", e => {
  /* On sort AVANT `keys.add`, et pas seulement avant `preventDefault`. Le jeu
     range les touches enfoncees dans `keys`, d'ou il lit le deplacement et les
     competences : taper « q » dans un nom de salle y laissait KeyQ, donc une
     lettre du nom faisait marcher le personnage et lancait une competence. Le
     `preventDefault` n'etait que la moitie visible du probleme — celle qui
     mangeait l'espace. */
  if (enSaisie()) return;
  const repeat = keys.has(e.code);
  keys.add(e.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }

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
// en revanche le comportement natif pendant une SAISIE, sinon impossible de
// tabuler d'un champ au bouton qui le suit — pseudo, mot de passe, nom de
// salle.
addEventListener("keydown", e => {
  if (e.code !== "Tab" || enSaisie()) return;
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
  if (e.code !== "Escape" || enSaisie()) return;
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
addEventListener("mousemove", updateMouse);
addEventListener("mousedown", updateMouse);
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
