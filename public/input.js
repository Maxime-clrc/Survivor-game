
import { CFG } from "/shared/game_state.js";
import { INPUT_HZ, PHASE_ROUND, amSpectator, cardsState, connected, dash, keys, latest, merchantState, myDashCd, myId, phase, predicted, skills, ws } from "./core/state.js";
import { aimRange, aimVector, updateMouse } from "./render/stage.js";
import { closeBuild, cycleBuild, openBuild } from "./ui/build.js";
import { buildEl, cv, enSaisie, pauseEl, readMove } from "./ui/dom.js";
import { closePause, openPause } from "./ui/pause.js";

function requestSkill(n) {
  if (phase !== PHASE_ROUND || amSpectator || cardsState || merchantState) return;
  if (!pauseEl.hidden) return;
  if (latest?.players.get(myId)?.downed) return;
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
});
cv.addEventListener("mousedown", e => {
  if (e.button !== 1) return;
  e.preventDefault();
  requestSkill(3);
});
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
  const msg = { t: "input", x: m.x, y: m.y, ax: a.ax, ay: a.ay, ar: aimRange() };
  if (dash.pending) { msg.d = 1; dash.pending = false; }
  if (skills.s1) { msg.s1 = 1; skills.s1 = false; }
  if (skills.s2) { msg.s2 = 1; skills.s2 = false; }
  if (skills.s3) { msg.s3 = 1; skills.s3 = false; }
  ws.send(JSON.stringify(msg));
}, 1000 / INPUT_HZ);
