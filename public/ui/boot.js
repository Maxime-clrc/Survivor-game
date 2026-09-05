
import { initAudio } from "/audio.js";
import { onLangChange, t, tf, tn } from "/shared/i18n.js";
import { startMusic } from "/music.js";
import { VERSION } from "/shared/version.js";
import { atlasStats, bindGL, buildAtlas, frameOf, glActive, silhouetteSheet } from "/sprites.js";
import { PERF, inRoom, sendAuth, signalerErreur, ws } from "../core/state.js";
import { bossSheet } from "../render/boss.js";
import { PARTICLE_GL, setFxGlow, setFxShard, setFxWhite, setPARTICLE_MAX } from "../render/fx.js";
import { gl, overCtx, resize, underCtx } from "../render/stage.js";
import { escapeHtml, gate, gateBuildEl, gateContinueBtn, gateFormsEl, gateHold, gateRoomsEl, gateServerEl, gateSwitchEl, goBtn, loadingEl, loginFormEl, nameInput, passInput, regGoBtn, regNameInput, regPass2Input, regPassInput, registerFormEl, setGateBusy, setLoading, setStatus, tabLoginBtn, tabRegisterBtn } from "./dom.js";
import { enterHub, refreshPanel, renderTopPing, setMyPing } from "./screens.js";

export function renderGateMode() {
  gateFormsEl.hidden = false;
  gateHold.hidden = true;
  const pseudo = localStorage.getItem("survivor.pseudo") || "";
  const token = localStorage.getItem("survivor.token") || "";
  if (!nameInput.value) nameInput.value = pseudo;
  passInput.placeholder = pseudo && token
    ? t("ui.gate.ph.passResume", "mot de passe (vide : reprendre la session)")
    : t("ui.gate.ph.pass", "mot de passe");
}
gateContinueBtn.onclick = () => {
  gate.hidden = true;
  if (inRoom) refreshPanel();
  else enterHub();
};
let lastServerInfo = null;
export function renderServerInfo(info) {
  lastServerInfo = info ?? null;
  setMyPing(info ? Number(info.rtt) : -1);
  renderTopPing();

  if (!gateServerEl) return;

  if (!info) {
    gateServerEl.className = "gateChip off";
    gateServerEl.innerHTML = `<i class="chipDot"></i>${escapeHtml(t("ui.gate.srv.off", "serveur injoignable"))}`;
    gateRoomsEl.hidden = true;
    gateBuildEl.hidden = true;
    return;
  }

  const ms = Number(info.rtt);
  const lat = Number.isFinite(ms) && ms >= 0 ? `${ms} ms` : "—";
  gateServerEl.className = "gateChip";
  gateServerEl.innerHTML = `<i class="chipDot"></i>${escapeHtml(
    tf("ui.gate.srv.on", "serveur en ligne · {lat}", { lat }))}`;

  const n = info.rooms | 0;
  gateRoomsEl.hidden = false;
  gateRoomsEl.textContent = n === 0
    ? t("ui.gate.srv.rooms0", "aucune salle ouverte")
    : tn("ui.gate.srv.rooms", "{n} salle ouverte", "{n} salles ouvertes", n);

  gateBuildEl.hidden = !info.build;
  if (info.build) gateBuildEl.textContent = `build ${info.build}`;
}
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
export function renderGateSwitch(register) {
  if (!gateSwitchEl) return;
  gateSwitchEl.innerHTML = register
    ? `${escapeHtml(t("ui.gate.switch.hasAcc", "Tu as déjà un compte ?"))} `
      + `<button type="button" id="gateSwitchBtn">`
      + `${escapeHtml(t("ui.gate.switch.toLogin", "Connecte-toi."))}</button>`
    : `${escapeHtml(t("ui.gate.switch.noAcc", "Pas encore de compte ?"))} `
      + `<button type="button" id="gateSwitchBtn">`
      + `${escapeHtml(t("ui.gate.switch.toRegister", "Crée-en un en dix secondes."))}</button>`;
  gateSwitchEl.querySelector("#gateSwitchBtn").onclick = () => activateTab(!register);
}
let booted = false;
async function bootOnce() {
  if (booted) return;
  booted = true;

  gate.hidden = true;
  loadingEl.hidden = false;
  setLoading(0, t("ui.load.what", "génération des sprites"));

  initAudio();
  startMusic();
  const stats = await buildAtlas(k => setLoading(k * 0.9, null));

  if (gl) {
    bindGL(gl, [underCtx, overCtx]);
    resize();
  }
  if (glActive()) {
    setPARTICLE_MAX(PARTICLE_GL);
    setFxWhite(frameOf("fx_white"));
    setFxShard(frameOf("fx_shard"));
    setFxGlow(frameOf("fx_glow"));
  }

  setLoading(1, t("ui.load.ready", "prêt"));
  if (PERF) {
    console.log(`atlas : ${stats.frames} images, ${stats.w}x${stats.h}, ` +
                `${atlasStats().mo.toFixed(1)} Mo — rendu : ` +
                `${gl?.ok ? "WebGL2" : "canvas 2D"}`);
  }
  signalerErreur("demarrage",
    `rendu ${gl?.ok ? "WebGL2" : "canvas 2D"}, atlas ${stats.frames} images `
    + `${stats.w}x${stats.h}, densite ${window.devicePixelRatio ?? 1}, v${VERSION}`,
    "", false);

  if (location.search.includes("planche")) {
    const sheet = silhouetteSheet();
    sheet.style.cssText = "position:fixed;inset:0;margin:auto;z-index:99;" +
                          "max-width:96vw;max-height:96vh;background:#fff";
    document.body.appendChild(sheet);
    const bosses = bossSheet();
    bosses.style.cssText = "position:fixed;left:0;right:0;bottom:8px;margin:auto;" +
                           "z-index:100;max-width:96vw;background:#fff";
    document.body.appendChild(bosses);
  }

  loadingEl.hidden = true;
}
goBtn.onclick = async () => {
  const pseudo = nameInput.value.trim();
  const pass = passInput.value;
  if (!pseudo) { setStatus(t("ui.gate.err.noPseudo", "tape ton pseudo"), true); return; }

  const storedPseudo = localStorage.getItem("survivor.pseudo") || "";
  const token = localStorage.getItem("survivor.token") || "";
  const canResume = !!token && pseudo.toLowerCase() === storedPseudo.toLowerCase();
  if (!pass && !canResume) { setStatus(t("ui.gate.err.noPass", "tape ton mot de passe"), true); return; }

  setGateBusy(true);
  await bootOnce();
  sendAuth(pass
    ? { t: "login", pseudo, pass }
    : { t: "loginToken", pseudo: storedPseudo, token });
};
regGoBtn.onclick = async () => {
  const pseudo = regNameInput.value.trim();
  const pass = regPassInput.value;
  if (!pseudo) { setStatus(t("ui.gate.err.pickPseudo", "choisis un pseudo"), true); return; }
  if (pass.length < 8) { setStatus(t("ui.gate.err.passShort", "mot de passe : 8 caractères minimum"), true); return; }
  if (pass !== regPass2Input.value) { setStatus(t("ui.gate.err.passMismatch", "les deux mots de passe ne correspondent pas"), true); return; }
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
/* Le placeholder du mot de passe et les puces de serveur sont ECRITS ici : ils
   ne portent pas de `data-i18n`, donc `traduireStatique()` ne les couvre pas.
   Garde sur `gate.hidden` — `renderGateMode()` rouvre les formulaires. */
onLangChange(() => {
  if (gate.hidden) return;
  if (gateHold.hidden) {
    renderGateMode();
    renderGateSwitch(!registerFormEl.hidden);
  }
  renderServerInfo(lastServerInfo);
});
renderGateMode();
renderGateSwitch(false);
pollServerInfo();
nameInput.focus();
