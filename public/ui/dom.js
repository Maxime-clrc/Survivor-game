
import { getLang, t } from "/shared/i18n.js";
import { VERSION } from "/shared/version.js";
import { PHASE_ROUND, connected, inRoom, keys, pauseReal, phase, serverCommit, serverVersion } from "../core/state.js";

export const arenaEl = document.getElementById("arena");
export const cvUnder = document.getElementById("cvUnder");
export const cvGl = document.getElementById("cvGl");
export const cv = document.getElementById("cv");
export const gate = document.getElementById("gate");
export const gateFormsEl = document.getElementById("gateForms");
export const tabLoginBtn = document.getElementById("tabLogin");
export const tabRegisterBtn = document.getElementById("tabRegister");
export const loginFormEl = document.getElementById("loginForm");
export const registerFormEl = document.getElementById("registerForm");
export const passInput = document.getElementById("pass");
export const regNameInput = document.getElementById("regName");
export const regPassInput = document.getElementById("regPass");
export const regPass2Input = document.getElementById("regPass2");
export const regGoBtn = document.getElementById("regGo");
export const gateHold = document.getElementById("gateHold");
export const gateWho = document.getElementById("gateWho");
export const gateHoldMsgEl = document.getElementById("gateHoldMsg");
export const gateContinueBtn = document.getElementById("gateContinue");
export const gateServerEl = document.getElementById("gateServer");
export const gateRoomsEl = document.getElementById("gateRooms");
export const gateBuildEl = document.getElementById("gateBuild");
export const gateSwitchEl = document.getElementById("gateSwitch");
export const menuEl = document.getElementById("menu");
export const menuCloseBtn = document.getElementById("menuClose");
export const settingsEl = document.getElementById("settings");
export const settingsCloseBtn = document.getElementById("settingsClose");
export const panel = document.getElementById("panel");
export const panelTitle = document.getElementById("panelTitle");
export const summary = document.getElementById("summary");
export const scoresBody = document.querySelector("#scores tbody");
export const startBtn = document.getElementById("start");
export const readyBtn = document.getElementById("readyBtn");
export const teamListEl = document.getElementById("teamList");
export const teamReadyEl = document.getElementById("teamReady");
export const historyListEl = document.getElementById("historyList");
export const launchSummaryEl = document.getElementById("launchSummary");
export const panelKicker = document.querySelector(".panelHead .sectionTitle");
export const waitMsg = document.getElementById("waitMsg");
export const voteRow = document.getElementById("voteRow");
export const voteHint = document.getElementById("voteHint");
export const classRow = document.getElementById("classRow");
export const classHint = document.getElementById("classHint");
export const nameInput = document.getElementById("name");
export const goBtn = document.getElementById("go");
const statusEl = document.getElementById("status");
export const cardsEl = document.getElementById("cards");
export const cardsTitle = document.getElementById("cardsTitle");
export const cardsRow = document.getElementById("cardsRow");
export const cardsTimerEl = document.getElementById("cardsTimer");
export const cardsTimerFill = cardsTimerEl.querySelector("i");
export const cardsWaitEl = document.getElementById("cardsWaitMsg");
export const merchantEl = document.getElementById("merchant");
export const merchantTitle = document.getElementById("merchantTitle");
export const merchantRow = document.getElementById("merchantRow");
export const merchantTimerEl = document.getElementById("merchantTimer");
export const merchantTimerFill = merchantTimerEl.querySelector("i");
export const merchantWaitEl = document.getElementById("merchantWaitMsg");
export const bilanEl = document.getElementById("bilan");
export const bilanTitle = document.getElementById("bilanTitle");
export const bilanStats = document.getElementById("bilanStats");
export const bilanFait = document.getElementById("bilanFait");
export const bilanHurt = document.getElementById("bilanHurt");
export const bilanPerf = document.getElementById("bilanPerf");
export const bilanRapport = document.getElementById("bilanRapport");
export const bilanRapportTexte = document.getElementById("bilanRapportTexte");
export const bilanRapportCopy = document.getElementById("bilanRapportCopy");
export const traceCheck = document.getElementById("traceCheck");
export const traceHint = document.getElementById("traceHint");
export const bilanScoresBody = document.querySelector("#bilanScores tbody");
export const bilanGo = document.getElementById("bilanGo");
export const bilanKicker = document.getElementById("bilanKicker");
export const bilanLeaveBtn = document.getElementById("bilanLeave");
export const finEl = document.getElementById("fin");
export const finKicker = document.getElementById("finKicker");
export const finTitle = document.getElementById("finTitle");
export const finStats = document.getElementById("finStats");
export const finGo = document.getElementById("finGo");
export const volInput = document.getElementById("vol");
export const volVal = document.getElementById("volVal");
export const muteBtn = document.getElementById("mute");
export const hubScreenEl = document.getElementById("hubScreen");
export const hubRefreshBtn = document.getElementById("hubRefresh");
export const hubBoardBtn = document.getElementById("hubBoardBtn");
export const hubBoardEl = document.getElementById("hubBoard");
export const hubBoardTabs = document.getElementById("hubBoardTabs");
export const hubBoardList = document.getElementById("hubBoardList");
export const roomListEl = document.getElementById("roomList");
export const roomNameInput = document.getElementById("roomName");
export const roomPassInput = document.getElementById("roomPass");
export const roomCreateBtn = document.getElementById("roomCreate");
export const hubStatusEl = document.getElementById("hubStatus");
export const hubResumeEl = document.getElementById("hubResume");
export const hubResumeIconEl = document.getElementById("hubResumeIcon");
export const hubResumeTitleEl = document.getElementById("hubResumeTitle");
export const hubResumeSubEl = document.getElementById("hubResumeSub");
export const hubResumeGoBtn = document.getElementById("hubResumeGo");
export const hubResumeStayBtn = document.getElementById("hubResumeStay");
export const hubPassAskEl = document.getElementById("hubPassAsk");
export const hubPassAskWhoEl = document.getElementById("hubPassAskWho");
export const hubPassAskInput = document.getElementById("hubPassAskInput");
export const hubPassAskGoBtn = document.getElementById("hubPassAskGo");
export const hubPassAskCancelBtn = document.getElementById("hubPassAskCancel");
export const panelLeaveBtn = document.getElementById("panelLeave");
export const hubWhoEl = document.getElementById("hubWho");
export const hubLogoutBtn = document.getElementById("hubLogout");
export const hubPassToggleBtn = document.getElementById("hubPassToggle");
export const hubPassBoxEl = document.getElementById("hubPassBox");
export const passOldInput = document.getElementById("passOld");
export const passNewInput = document.getElementById("passNew");
export const passChangeBtn = document.getElementById("passChangeBtn");
export const passMsgEl = document.getElementById("passMsg");

export function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("err", isError);
}
export const loadingEl = document.getElementById("loading");
const loadFill = document.querySelector("#loadBar > i");
const loadPct = document.getElementById("loadPct");
const loadWhat = document.getElementById("loadWhat");
export function setLoading(k, quoi) {
  loadFill.style.width = (Math.max(0, Math.min(1, k)) * 100).toFixed(0) + "%";
  loadPct.textContent = Math.round(k * 100) + " %";
  if (quoi) loadWhat.textContent = quoi;
}
export function setGateBusy(busy) {
  goBtn.disabled = busy;
  regGoBtn.disabled = busy;
}

export const topbarEl = document.getElementById("topbar");
export const topHomeBtn = document.getElementById("topHome");
export const topCrumbEl = document.getElementById("topCrumb");
export const topPingEl = document.getElementById("topPing");
export const topPingValEl = document.getElementById("topPingVal");
export const topAvatarEl = document.getElementById("topAvatar");
export const topNameEl = document.getElementById("topName");
export const topSettingsBtn = document.getElementById("topSettings");
export const topLangBtn = document.getElementById("topLang");
export const setLangRowEl = document.getElementById("setLangRow");
export const gateLangRowEl = document.getElementById("gateLangRow");
export const briefEl = document.getElementById("brief");
export const briefNameEl = document.getElementById("briefName");
export const briefSkillsEl = document.getElementById("briefSkills");
export const briefMissionTextEl = document.getElementById("briefMissionText");
export const briefBarFill = document.querySelector("#briefBar > i");
export const briefLeftEl = document.getElementById("briefLeft");
export const briefThirdEl = document.getElementById("briefThird");
export const briefArmeRowEl = document.getElementById("briefArmeRow");
export const briefArmeRerollBtn = document.getElementById("briefArmeReroll");
export const briefGoBtn = document.getElementById("briefGo");
export const briefCountEl = document.getElementById("briefCount");
export const hudBriefEl = document.getElementById("hudBrief");

export const metaEl = document.getElementById("meta");
export const metaCoresEl = document.getElementById("metaCores");
export const metaSubEl = document.getElementById("metaSub");
export const metaTreeEl = document.getElementById("metaTree");
export const metaConfortEl = document.getElementById("metaConfort");
export const menuTitleEl = document.getElementById("menuTitle");
export const metaClassTabsEl = document.getElementById("metaClassTabs");
export const metaSlotsEl = document.getElementById("metaSlots");
export const metaHfEl = document.getElementById("metaHf");
export const metaCadresEl = document.getElementById("metaCadres");
export const hautsFaitsEl = document.getElementById("hautsFaits");
export const hautsFaitsBtn = document.getElementById("hautsFaitsBtn");
export const hautsFaitsCloseBtn = document.getElementById("hautsFaitsClose");
export const codexEl = document.getElementById("codex");
export const codexBtn = document.getElementById("codexBtn");
export const codexCloseBtn = document.getElementById("codexClose");
export const codexCompteEl = document.getElementById("codexCompte");
export const codexHordeEl = document.getElementById("codexHorde");
export const codexBossEl = document.getElementById("codexBoss");
export const codexCartesEl = document.getElementById("codexCartes");
export const codexReliquesEl = document.getElementById("codexReliques");
/* Le francais du markup EST le repli : on le releve au premier passage, on ne
   le recopie donc jamais dans le dictionnaire. */
const ORIGINE = new WeakMap();
function repli(el, champ, valeur) {
  let m = ORIGINE.get(el);
  if (!m) ORIGINE.set(el, m = {});
  if (!(champ in m)) m[champ] = valeur;
  return m[champ];
}
export function traduireStatique(racine = document) {
  for (const el of racine.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n, repli(el, "txt", el.textContent));
  }
  for (const el of racine.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.dataset.i18nTitle, repli(el, "title", el.title));
  }
  for (const el of racine.querySelectorAll("[data-i18n-ph]")) {
    el.placeholder = t(el.dataset.i18nPh, repli(el, "ph", el.placeholder));
  }
  document.documentElement.lang = getLang();
}

export function fmtBig(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const buildEl = document.getElementById("build");
export const buildName = document.getElementById("buildName");
export const buildClass = document.getElementById("buildClass");
export const buildStats = document.getElementById("buildStats");
export const buildArch = document.getElementById("buildArch");
export const buildArchTitle = document.getElementById("buildArchTitle");
export const buildPower = document.getElementById("buildPower");
export const buildMods = document.getElementById("buildMods");
export const buildSkills = document.getElementById("buildSkills");
export const buildSkillsTitle = document.getElementById("buildSkillsTitle");
export const buildCards = document.getElementById("buildCards");
export const buildBackBtn = document.getElementById("buildBack");

export const pauseEl = document.getElementById("pause");
export const pauseState = document.getElementById("pauseState");
export const pauseConfirm = document.getElementById("pauseConfirm");
export const pauseQuitBtn = document.getElementById("pauseQuit");
export const pauseQuitAsk = document.getElementById("pauseQuitAsk");
export const hudPauseEl = document.getElementById("hudPause");
const versionEl = document.getElementById("version");
export function updateVersion() {
  versionEl.hidden = connected && inRoom && phase === PHASE_ROUND && pauseEl.hidden;

  const stale = serverVersion != null && serverVersion !== VERSION;
  versionEl.classList.toggle("stale", stale);

  versionEl.textContent = stale
    ? `v${VERSION} — serveur v${serverVersion} · recharge la page`
    : `v${VERSION}${serverCommit ? ` (${serverCommit})` : ""}`;
}
const traceEl = document.getElementById("trace");
export function updateTrace(on, par) {
  traceEl.hidden = !on;
  traceEl.textContent = on ? `● MESURE${par ? ` · ${par}` : ""}` : "";
}
const SAISIE_TEXTE = new Set(["", "text", "password", "search", "email", "url", "tel", "number"]);
export function enSaisie() {
  const el = document.activeElement;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName !== "INPUT") return false;
  return SAISIE_TEXTE.has((el.getAttribute("type") ?? "").toLowerCase());
}
export function readMove() {
  // la simulation est figee : predire un deplacement ne ferait qu'un recalage
  // sec a la reprise. Vaut pour la pause de l'hote, menu ouvert ou non.
  if (!pauseEl.hidden || pauseReal) return { x: 0, y: 0 };
  let x = 0, y = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp"))    y -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown"))  y += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft"))  x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  const d = Math.hypot(x, y);
  return d > 0 ? { x: x / d, y: y / d } : { x: 0, y: 0 };
}
