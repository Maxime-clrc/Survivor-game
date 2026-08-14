
import { getAudioSource, getMusicVolume, getVolume, initAudio, isMuted, playSound, setAudioSource, setMusicDuck, setMusicVolume, setMuted, setVolume } from "/audio.js";
import { showHud } from "/hud.js";
import { refreshMusicSource } from "/music.js";
import { bossAt } from "/shared/bosses.js";
import { CARDS, CARD_BY_ID, RARITY_COLOR, RARITY_LABEL, banClosure, cardDetail } from "/shared/cards.js";
import { CLASSES, CLASS_DEFAULT, SKILL3_NAME, classAt } from "/shared/classes.js";
import { CFG, DAMAGE_SOURCES, DIFFICULTIES, PLAYER_COLORS, biomeAt } from "/shared/game_state.js";
import { CARD_CATEGORY_COLOR, SRC_TINT, SURFACE } from "/shared/palette.js";
import { COMMUN, CONFORT, MILESTONES, PROG_CFG, TREES, slotsFor, tierCost } from "/shared/progression.js";
import { RELIC_RARITY, relicById, relicPrice } from "/shared/reliques.js";
import { TL_CFG, segmentName } from "/shared/timeline.js";
import { drawSprite, frameOf } from "/sprites.js";
import { INTERP_MS, PERF, PHASE_LOBBY, PHASE_ROUND, ROMAN, amSpectator, bilanOpen, finOpen, setFinOpen, cardsPending, cardsState, cardsTimerHandle, connected, difficulty, hostId, inRoom, joinAttempt, keys, lastResult, lobby, merchantState, merchantTimerHandle, merchantWait, metaClsOverride, myId, myPseudo, myVote, ownedCounts, pendingRejoin, phase, progressState, roomNameCur, roomsList, roundHistory, setBilanOpen, setCardsPending, setCardsState, setCardsTimerHandle, setJoinAttempt, setMerchantState, setMerchantTimerHandle, setMerchantWait, setMetaClsOverride, setMyVote, setPendingRejoin, tally, ws } from "../core/state.js";
import { netPerf } from "../net/interp.js";
import { fmtTime } from "../render/boss.js";
import { deaths } from "../render/fx.js";
import { biomeIndex, nameOf } from "../render/stage.js";
import { closeBuild, openBuild } from "./build.js";
import { bilanEl, bilanGo, finEl, finGo, finKicker, finStats, finTitle, bilanHurt, bilanKicker, bilanLeaveBtn, bilanPerf, bilanScoresBody, bilanStats, bilanTitle, briefBarFill, briefCountEl, briefEl, briefGoBtn, briefLeftEl, briefMissionTextEl, briefNameEl, briefSkillsEl, briefThirdEl, cardsEl, cardsRow, cardsTimerEl, cardsTimerFill, cardsTitle, cardsWaitEl, classHint, classRow, enSaisie, escapeHtml, fmtBig, gate, historyListEl, hubBoardBtn, hubBoardEl, hubBoardList, hubBoardTabs, hubLogoutBtn, hubPassAskCancelBtn, hubPassAskEl, hubPassAskGoBtn, hubPassAskInput, hubPassBoxEl, hubPassToggleBtn, hubRefreshBtn, hubResumeEl, hubResumeGoBtn, hubResumeIconEl, hubResumeStayBtn, hubResumeSubEl, hubResumeTitleEl, hubScreenEl, hubStatusEl, hubWhoEl, hudBriefEl, launchSummaryEl, loadingEl, menuCloseBtn, menuEl, menuTitleEl, merchantEl, merchantRow, merchantTimerEl, merchantTimerFill, merchantTitle, merchantWaitEl, metaBansEl, metaClassTabsEl, metaConfortEl, metaCoresEl, metaEl, metaMilestonesEl, metaSlotsEl, metaSubEl, metaTreeEl, muteBtn, panel, panelKicker, panelLeaveBtn, panelTitle, passChangeBtn, passMsgEl, passNewInput, passOldInput, readyBtn, roomCreateBtn, roomListEl, roomNameInput, roomPassInput, scoresBody, settingsCloseBtn, settingsEl, startBtn, summary, teamListEl, teamReadyEl, topAvatarEl, topCrumbEl, topHomeBtn, topNameEl, topPingEl, topPingValEl, topSettingsBtn, topbarEl, updateVersion, volInput, volVal, voteHint, voteRow, waitMsg } from "./dom.js";


export function hubStatus(msg, isError = false) {
  hubStatusEl.textContent = msg;
  hubStatusEl.classList.toggle("err", isError);
}
export let myPing = -1;
export let settingsFrom = null;
const TOPBAR_SCREENS = [
  { el: () => settingsEl, crumb: () => "Paramètres" },
  { el: () => menuEl, crumb: () => `Progression · ${classAt(metaClsOverride ?? CLASS_DEFAULT).nom}` },
  { el: () => bilanEl, crumb: () => "Bilan de manche" },
  { el: () => panel, crumb: () => roomNameCur ? `Salon · ${roomNameCur}` : "Salon" },
  { el: () => hubScreenEl, crumb: () => "Salons" },
];
function syncTopbar() {
  if (!topbarEl) return;

  const masque = (cardsEl && !cardsEl.hidden) || (loadingEl && !loadingEl.hidden)
    || (gate && !gate.hidden)
    || (finEl && !finEl.hidden)
    || (document.getElementById("brief")?.hidden === false);

  const vue = masque ? null : TOPBAR_SCREENS.find(s => { const e = s.el(); return e && !e.hidden; });
  topbarEl.hidden = !vue;
  if (!vue) return;

  topCrumbEl.textContent = vue.crumb();

  const pseudo = localStorage.getItem("survivor.pseudo") || "";
  topNameEl.textContent = pseudo;
  topAvatarEl.textContent = pseudo ? pseudo[0].toUpperCase() : "?";

  renderTopPing();
}
export function renderTopPing() {
  if (!topPingEl) return;
  const ms = Number(myPing);
  if (!Number.isFinite(ms) || ms < 0) {
    topPingEl.className = "";
    topPingValEl.textContent = "—";
    return;
  }
  topPingEl.className = ms < 60 ? "" : ms <= 140 ? "warn" : "bad";
  topPingValEl.textContent = `${ms} ms`;
}
const SETTLE_MS = 760;
const settleTimers = new WeakMap();
function syncSettled(el) {
  if (!el) return;
  clearTimeout(settleTimers.get(el));
  if (el.hidden) {
    settleTimers.set(el, setTimeout(() => el.classList.remove("settled"), LEAVE_MS));
    return;
  }
  el.classList.remove("settled");
  settleTimers.set(el, setTimeout(() => el.classList.add("settled"), SETTLE_MS));
}
const LEAVE_MS = (() => {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--screen-out").trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 320;
  return (v.endsWith("ms") ? n : n * 1000) + 40;
})();
const leaveTimers = new WeakMap();
function syncLeaving(el) {
  if (!el) return;
  clearTimeout(leaveTimers.get(el));
  if (!el.hidden) { el.classList.remove("leaving"); return; }
  el.classList.add("leaving");
  leaveTimers.set(el, setTimeout(() => el.classList.remove("leaving"), LEAVE_MS));
}
{
  const obs = new MutationObserver(recs => {
    syncTopbar();
    for (const r of recs) {
      const etaitCache = r.oldValue !== null;
      if (etaitCache === r.target.hidden) continue;
      syncSettled(r.target);
      syncLeaving(r.target);
    }
  });
  const screens = [gate, loadingEl, hubScreenEl, panel, bilanEl, finEl, menuEl, cardsEl,
                   settingsEl, document.getElementById("pause"),
                   document.getElementById("brief")];
  for (const el of screens) {
    if (el) {
      obs.observe(el, { attributes: true, attributeFilter: ["hidden"], attributeOldValue: true });
    }
  }

  const etouffants = [cardsEl, merchantEl,
                      document.getElementById("pause"),
                      document.getElementById("build")].filter(Boolean);
  const syncDuck = () => setMusicDuck(etouffants.some(el => !el.hidden));
  const obsDuck = new MutationObserver(syncDuck);
  for (const el of etouffants) {
    obsDuck.observe(el, { attributes: true, attributeFilter: ["hidden"] });
  }
  syncDuck();
}
/* Miroir de la regle `--cursor-go` de `menus.css` : ce qui montre le crochet
   sonne au survol, ce qui ne le montre pas est muet. Duplication assumee — un
   selecteur CSS ne se lit pas depuis JS sans supposer la structure de la
   feuille. Bouger l'un, bouger l'autre. */
const UI_SOUND_SCREENS = "#gate, #hubScreen, #panel, #menu, #bilan, #fin, #settings, #topbar, #pause";
const UI_SOUND_TARGETS = 'button, a, summary, tr.clickable, input[type="range"]';
const UI_CLICK_SCREENS = `${UI_SOUND_SCREENS}, #cards, #build`;
const UI_SOUND_GAP = 70;
let lastHovered = null;
let lastHoverAt = 0;
document.addEventListener("pointerover", e => {
  if (e.pointerType && e.pointerType !== "mouse") return;
  const cible = e.target?.closest?.(UI_SOUND_TARGETS) ?? null;
  const vise = cible && cible.closest(UI_SOUND_SCREENS)
    && !cible.disabled && cible.getAttribute("aria-disabled") !== "true";
  if (!vise) { lastHovered = null; return; }
  if (cible === lastHovered) return;
  lastHovered = cible;
  const now = performance.now();
  if (now - lastHoverAt < UI_SOUND_GAP) return;
  lastHoverAt = now;
  playSound("survol");
});
function uiSoundFor(el) {
  if (el.id === "start") return el.classList.contains("cancel") ? "pretAnnule" : "lancer";
  if (el.id === "readyBtn") return el.classList.contains("on") ? "pretAnnule" : "pret";
  return "selection";
}
document.addEventListener("pointerdown", e => {
  const cible = e.target?.closest?.(UI_SOUND_TARGETS) ?? null;
  if (!cible || !cible.closest(UI_CLICK_SCREENS)) return;
  if (cible.disabled || cible.getAttribute("aria-disabled") === "true") return;
  playSound(uiSoundFor(cible));
});
function goHome() {
  if (!connected) return;
  if (inRoom && phase === PHASE_ROUND && !amSpectator
      && !confirm("Une manche est en cours. Quitter la salle et revenir aux salons ?")) {
    return;
  }
  if (settingsEl && !settingsEl.hidden) { settingsEl.hidden = true; settingsFrom = null; }
  if (menuEl && !menuEl.hidden) menuEl.hidden = true;
  closeBuild();
  if (!inRoom) { enterHub(); syncTopbar(); return; }
  ws.send(JSON.stringify({ t: "leaveRoom" }));
}
topHomeBtn.onclick = goHome;
function openSettings() {
  if (!settingsEl) return;
  settingsFrom = [hubScreenEl, panel, bilanEl, menuEl].find(e => e && !e.hidden) ?? null;
  if (settingsFrom) settingsFrom.hidden = true;
  settingsEl.hidden = false;
  syncTopbar();
}
function closeSettings() {
  if (!settingsEl) return;
  settingsEl.hidden = true;
  if (settingsFrom) settingsFrom.hidden = false;
  settingsFrom = null;
  syncTopbar();
}
topSettingsBtn.onclick = openSettings;
if (settingsCloseBtn) settingsCloseBtn.onclick = closeSettings;
export function enterHub() {
  if (!connected || inRoom) return;
  hubScreenEl.hidden = false;
  hubPassAskEl.hidden = true;
  hubPassAskInput.value = "";
  if (hubBoardEl) hubBoardEl.hidden = true;
  hubWhoEl.innerHTML = "Connecté comme <b></b>";
  hubWhoEl.querySelector("b").textContent = localStorage.getItem("survivor.pseudo") || "?";
  renderRooms();
  renderResume();
}
const PLAY_SVG =
  `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">`
  + `<path d="M5.4 3.4 12.2 8l-6.8 4.6z" fill="currentColor"/></svg>`;
export function renderResume() {
  if (!hubResumeEl) return;
  const salle = pendingRejoin
    ? roomsList.find(r => r.code === pendingRejoin.code)
    : null;
  hubResumeEl.hidden = !salle;
  if (!salle) return;

  hubResumeIconEl.innerHTML = PLAY_SVG;
  hubResumeTitleEl.textContent = salle.state === 1
    ? `Une manche tourne encore dans « ${salle.name} »`
    : `Ta salle « ${salle.name} » est toujours ouverte`;

  const ou = salle.state === 1
    ? `Étape ${Math.max(1, salle.segment || 0)}/6 en cours`
    : "Au salon";
  const qui = salle.count > 0
    ? `${salle.count} joueur${salle.count > 1 ? "s" : ""} présent${salle.count > 1 ? "s" : ""}`
    : "personne pour l'instant";
  hubResumeSubEl.textContent = `${ou} · ${qui} · tu reprends ta place`;
}
function answerResume(reprendre) {
  const salle = pendingRejoin;
  setPendingRejoin(null);
  if (hubResumeEl) hubResumeEl.hidden = true;
  if (!reprendre || !salle) return;
  hubStatus(`Retour vers « ${salle.name} »…`);
  ws.send(JSON.stringify({ t: "joinRoom", code: salle.code }));
}
if (hubResumeGoBtn) hubResumeGoBtn.onclick = () => answerResume(true);
if (hubResumeStayBtn) hubResumeStayBtn.onclick = () => answerResume(false);
const LOCK_SVG =
  `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">`
  + `<path d="M5.4 7V3.9h5.2V7" fill="none" stroke="currentColor" stroke-width="1.7"/>`
  + `<path d="M2.8 6.7h10.4v6.7H2.8z M7.45 8.9h1.1v2.5H7.45z" fill="currentColor" fill-rule="evenodd"/>`
  + `</svg>`;
export function renderRooms() {
  if (hubScreenEl.hidden) return;
  roomListEl.innerHTML = "";
  if (roomsList.length === 0) {
    const empty = document.createElement("div");
    empty.className = "roomEmpty";
    empty.textContent = "Aucune salle ouverte — crée la première.";
    roomListEl.appendChild(empty);
    return;
  }
  for (const r of roomsList) {
    const full = r.count >= r.max;
    const btn = document.createElement("button");
    btn.className = "roomEntry";
    btn.disabled = full;
    const lock = r.locked && r.state === 1
      ? `<span class="roomLock" title="protégée par mot de passe">${LOCK_SVG}</span>` : "";
    const state = r.state === 1 ? `<span class="roomState running">En jeu</span>`
      : full ? `<span class="roomState">Complète</span>`
      : `<span class="roomState">Ouvert</span>`;
    const slots = `<span class="roomSlots" data-n="${r.count}">`
      + "<i></i>".repeat(r.max) + "</span>";
    btn.innerHTML = `<span class="roomName"><span class="roomSub"></span></span>`
      + `${lock}${state}${slots}`
      + `<span class="roomCount">${r.count} / ${r.max}</span>`;
    const nameEl = btn.querySelector(".roomName");
    nameEl.insertBefore(document.createTextNode(r.name), nameEl.firstChild);
    const mode = DIFFICULTIES[r.diff]?.label ?? "normal";
    const etat = r.state === 1 ? `étape ${Math.max(1, r.segment || 0)}/6 en cours`
      : r.locked ? "protégée par mot de passe"
      : "en attente de joueurs";
    btn.querySelector(".roomSub").textContent = `${mode} · ${etat}`;
    btn.onclick = () => {
      setJoinAttempt({ code: r.code, name: r.name });
      hubPassAskEl.hidden = true;
      hubStatus(`entrée dans « ${r.name} »…`);
      ws.send(JSON.stringify({ t: "joinRoom", code: r.code }));
    };
    roomListEl.appendChild(btn);
  }
}
hubRefreshBtn.onclick = () => {
  if (!connected || inRoom) return;
  ws.send(JSON.stringify({ t: "listRooms" }));
  hubRefreshBtn.disabled = true;
  setTimeout(() => { hubRefreshBtn.disabled = false; }, 1000);
};
export let boardData = null;
let boardDiff = 1;
hubBoardBtn.onclick = () => {
  if (!connected || inRoom) return;
  const ouvert = !hubBoardEl.hidden;
  hubBoardEl.hidden = ouvert;
  if (ouvert) return;
  ws.send(JSON.stringify({ t: "leaderboard" }));
  hubBoardBtn.disabled = true;
  setTimeout(() => { hubBoardBtn.disabled = false; }, 1000);
  renderBoard();
};
export function renderBoard() {
  hubBoardTabs.innerHTML = "";
  DIFFICULTIES.forEach((d, i) => {
    const b = document.createElement("button");
    b.textContent = d.label;
    b.className = i === boardDiff ? "" : "ghost";
    b.onclick = () => { boardDiff = i; renderBoard(); };
    hubBoardTabs.appendChild(b);
  });

  if (!boardData) { hubBoardList.textContent = "chargement…"; return; }
  const lignes = boardData[boardDiff] ?? [];
  if (lignes.length === 0) {
    hubBoardList.innerHTML =
      `<div class="hint">personne n'a encore vaincu le Noyau à cette difficulté</div>`;
    return;
  }
  hubBoardList.innerHTML = lignes.map((l, i) =>
    `<div class="boardRow${l.pseudo === myPseudo ? " moi" : ""}">` +
      `<span class="boardRank">${i + 1}</span>` +
      `<span class="boardWho">${escapeHtml(l.pseudo)}</span>` +
      `<span class="boardTime">${escapeHtml(fmtTime(l.time))}</span>` +
    `</div>`).join("");
}
hubPassAskGoBtn.onclick = () => {
  if (!connected || inRoom || !joinAttempt) return;
  hubStatus(`entrée dans « ${joinAttempt.name} »…`);
  ws.send(JSON.stringify({ t: "joinRoom", code: joinAttempt.code, pass: hubPassAskInput.value }));
};
hubPassAskInput.onkeydown = e => { if (e.key === "Enter") hubPassAskGoBtn.click(); };
hubPassAskCancelBtn.onclick = () => {
  setJoinAttempt(null);
  hubPassAskEl.hidden = true;
  hubPassAskInput.value = "";
  hubStatus("");
};
roomCreateBtn.onclick = () => {
  if (!connected || inRoom) return;
  hubStatus("création…");
  ws.send(JSON.stringify({
    t: "createRoom",
    name: roomNameInput.value.trim(),
    pass: roomPassInput.value,
  }));
};
roomNameInput.onkeydown = e => { if (e.key === "Enter") roomCreateBtn.click(); };
panelLeaveBtn.onclick = () => {
  if (!connected || !inRoom) return;
  ws.send(JSON.stringify({ t: "leaveRoom" }));
};

export function passMsg(msg, isError) {
  passMsgEl.textContent = msg;
  passMsgEl.classList.toggle("err", isError);
  passMsgEl.classList.toggle("ok", !isError && !!msg);
}
hubLogoutBtn.onclick = () => {
  if (!connected) return;
  ws.send(JSON.stringify({ t: "logout" }));
};
hubPassToggleBtn.onclick = () => {
  hubPassBoxEl.hidden = !hubPassBoxEl.hidden;
  passMsg("", false);
  if (!hubPassBoxEl.hidden) passOldInput.focus();
};
passChangeBtn.onclick = () => {
  if (!connected) return;
  const ancien = passOldInput.value;
  const neuf = passNewInput.value;
  if (neuf.length < 8) { passMsg("nouveau mot de passe : 8 caractères minimum", true); return; }
  ws.send(JSON.stringify({ t: "changePass", ancien, neuf }));
};
function openMenuFor(clsIndex) {
  panel.hidden = true;
  menuEl.hidden = false;
  renderMeta(clsIndex);
}
menuCloseBtn.onclick = () => {
  menuEl.hidden = true;
  refreshPanel();
};
function cheapestPurchase(pr) {
  let min = Infinity;
  for (const clsId of Object.keys(TREES)) {
    const cp = pr.classes?.[clsId];
    for (const line of TREES[clsId]) {
      const n = cp?.tiers?.[line.id] | 0;
      if (n < PROG_CFG.TIERS_MAX) min = Math.min(min, tierCost(n));
    }
  }
  for (const cf of CONFORT) {
    if (!(pr.confort ?? []).includes(cf.id)) {
      min = Math.min(min, PROG_CFG.CONFORT_COSTS[cf.id]);
    }
  }
  for (const line of COMMUN) {
    const n = (pr.commun ?? {})[line.id] | 0;
    if (n < PROG_CFG.TIERS_MAX) min = Math.min(min, tierCost(n, line.id));
  }
  return min;
}
let metaSpendable = false;
export function updateTerminalDot() {
  const pr = progressState;
  metaSpendable = !!pr && pr.cores >= cheapestPurchase(pr);
  const dot = classRow?.querySelector(".classMetaBtn .metaDot");
  if (dot) dot.hidden = !metaSpendable;
}
const audioUi = [
  { vol: volInput, val: volVal, mute: muteBtn,
    mus: document.getElementById("musVol"),
    musVal: document.getElementById("musVolVal"),
    src: document.getElementById("musSrc") },
  {
    vol: document.getElementById("pauseVol"),
    val: document.getElementById("pauseVolVal"),
    mute: document.getElementById("pauseMute"),
    mus: document.getElementById("pauseMusVol"),
    musVal: document.getElementById("pauseMusVolVal"),
    src: document.getElementById("pauseSrc"),
  },
  {
    vol: document.getElementById("setVol"),
    val: document.getElementById("setVolVal"),
    mus: document.getElementById("setMusVol"),
    musVal: document.getElementById("setMusVolVal"),
    src: document.getElementById("setSrc"),
    srcVal: document.getElementById("setSrcVal"),
  },
].filter(u => u.vol);
function refreshAudioUi() {
  const pct = Math.round(getVolume() * 100);
  const mus = Math.round(getMusicVolume() * 100);
  const pistes = getAudioSource() === "pistes";
  for (const u of audioUi) {
    u.vol.value = String(pct);
    u.val.textContent = `${pct} %`;
    if (u.mute) {
      u.mute.textContent = isMuted() ? "✕" : "♪";
      u.mute.classList.toggle("off", isMuted());
      u.mute.title = isMuted() ? "rétablir le son" : "couper le son";
    }
    if (u.mus) {
      u.mus.value = String(mus);
      u.musVal.textContent = `${mus} %`;
    }
    if (u.src) {
      u.src.textContent = u.srcVal
        ? (pistes ? "Pistes" : "Synthé")
        : (pistes ? "Bande son : pistes" : "Bande son : synthé");
      u.src.classList.toggle("on", pistes);
      if (u.srcVal) u.srcVal.textContent = pistes ? "fichiers" : "calculée";
    }
  }
}
for (const u of audioUi) {
  u.vol.oninput = () => {
    setVolume(Number(u.vol.value) / 100);
    if (isMuted() && Number(u.vol.value) > 0) setMuted(false);
    refreshAudioUi();
  };

  if (u.mute) {
    u.mute.onclick = () => {
      initAudio();
      setMuted(!isMuted());
      refreshAudioUi();
      if (!isMuted()) playSound("bonus");
    };
  }

  if (u.mus) {
    u.mus.oninput = () => {
      setMusicVolume(Number(u.mus.value) / 100);
      refreshAudioUi();
    };
  }

  if (u.src) {
    u.src.onclick = () => {
      initAudio();
      setAudioSource(getAudioSource() === "pistes" ? "synthe" : "pistes");
      refreshMusicSource();
      refreshAudioUi();
    };
  }
}
window.addEventListener("keydown", e => {
  if (e.key !== "m" && e.key !== "M") return;
  if (enSaisie()) return;
  setMuted(!isMuted());
  refreshAudioUi();
});
refreshAudioUi();
export let launchEndsAt = 0;
let launchTimer = 0;
function launchPending() { return launchEndsAt > performance.now(); }
export function renderLaunch() {
  if (!startBtn) return;

  if (launchEndsAt === 0) {
    clearInterval(launchTimer);
    launchTimer = 0;
    startBtn.textContent = "Lancer la manche";
    startBtn.classList.remove("cancel");
    return;
  }

  if (!launchPending()) {
    clearInterval(launchTimer);
    launchTimer = 0;
    startBtn.disabled = true;
    startBtn.classList.remove("cancel");
    startBtn.textContent = "Lancement…";
    return;
  }

  startBtn.hidden = false;
  startBtn.disabled = false;
  startBtn.classList.add("cancel");
  const reste = Math.max(0, Math.ceil((launchEndsAt - performance.now()) / 1000));
  startBtn.textContent = `Annuler le lancement — ${reste} s`;
  waitMsg.textContent = "La manche démarre. Un clic pour tout arrêter.";

  if (!launchTimer) launchTimer = setInterval(renderLaunch, 200);
}
startBtn.onclick = () => {
  if (phase !== PHASE_LOBBY) return;
  if (launchPending()) { ws.send(JSON.stringify({ t: "cancelStart" })); return; }
  if (myId !== hostId) return;
  ws.send(JSON.stringify({ t: "start" }));
};
const BRIEF_URGENT_S = 5;
let briefTimer = 0;
let briefEndsAt = 0;
export let briefWaiting = [];
let briefWaitTimer = 0;
export function openBrief(dur) {
  if (!briefEl) return;
  const me = lobby.find(l => l.id === myId);
  const c = classAt(me?.cls ?? CLASS_DEFAULT);

  briefEl.querySelector(".briefWrap").style.setProperty("--tint", c.couleur);
  briefNameEl.textContent = c.nom;
  briefMissionTextEl.textContent = c.mission ?? c.desc;

  briefSkillsEl.textContent = "";
  for (const s of c.skills) {
    const card = document.createElement("div");
    card.className = "briefSkill";

    const keys = document.createElement("div");
    keys.className = "briefKeys";
    const parts = String(s.touche).split("/");
    parts.forEach((k, i) => {
      if (i > 0) {
        const ou = document.createElement("span");
        ou.className = "briefOr";
        ou.textContent = "ou";
        keys.appendChild(ou);
      }
      const cap = document.createElement("span");
      cap.className = "briefKey";
      cap.textContent = k;
      keys.appendChild(cap);
    });

    const nom = document.createElement("div");
    nom.className = "briefSkillName";
    nom.textContent = s.nom;

    const desc = document.createElement("div");
    desc.className = "briefSkillDesc";
    desc.textContent = s.desc;

    card.append(keys, nom, desc);
    briefSkillsEl.appendChild(card);
  }

  const nom3 = SKILL3_NAME[c.id];
  briefThirdEl.textContent = "";
  briefThirdEl.hidden = !nom3;
  if (nom3) {
    const keys = document.createElement("span");
    keys.className = "briefKeys";
    ["3", "R"].forEach((k, i) => {
      if (i > 0) {
        const ou = document.createElement("span");
        ou.className = "briefOr";
        ou.textContent = "ou";
        keys.appendChild(ou);
      }
      const cap = document.createElement("span");
      cap.className = "briefKey small";
      cap.textContent = k;
      keys.appendChild(cap);
    });
    const txt = document.createElement("span");
    txt.className = "briefThirdText";
    txt.innerHTML = `<b>${escapeHtml(nom3)}</b> — troisième compétence, `
      + `une carte peut te l'accorder en cours de partie`;
    briefThirdEl.append(keys, txt);
  }

  briefEl.hidden = false;

  const total = Number(dur) > 0 ? Number(dur) : 20;
  const fin = performance.now() + total * 1000;
  briefEndsAt = fin;
  briefWaiting = [];
  renderBriefWait();
  clearInterval(briefTimer);
  const tick = () => {
    const reste = Math.max(0, (fin - performance.now()) / 1000);
    briefLeftEl.textContent = String(Math.ceil(reste));
    briefBarFill.style.width = `${(1 - reste / total) * 100}%`;
    const urgent = Math.ceil(reste) <= BRIEF_URGENT_S && reste > 0;
    briefCountEl?.classList.toggle("urgent", urgent);
    briefEl.classList.toggle("urgent", urgent);
    if (reste <= 0) closeBrief();
  };
  briefBarFill.style.transition = "none";
  briefBarFill.style.width = "0%";
  briefBarFill.offsetWidth;
  briefBarFill.style.transition = "";
  tick();
  briefTimer = setInterval(tick, 250);
}
export function closeBrief() {
  if (!briefEl) return;
  clearInterval(briefTimer);
  briefTimer = 0;
  briefEl.hidden = true;
  briefEl.classList.remove("urgent");
  briefCountEl?.classList.remove("urgent");
  renderBriefWait();
}
if (briefGoBtn) {
  briefGoBtn.onclick = () => {
    closeBrief();
    if (connected && phase === PHASE_ROUND) ws.send(JSON.stringify({ t: "briefDone" }));
  };
}
export function renderBriefWait() {
  if (!hudBriefEl) return;
  const montre = briefWaiting.length > 0 && briefEl?.hidden !== false
    && phase === PHASE_ROUND;
  hudBriefEl.hidden = !montre;
  if (!montre) {
    clearInterval(briefWaitTimer);
    briefWaitTimer = 0;
    return;
  }
  if (!briefWaitTimer) briefWaitTimer = setInterval(renderBriefWait, 250);
  const qui = briefWaiting.length <= 2
    ? briefWaiting.map(escapeHtml).map(n => `<b>${n}</b>`).join(" et ")
    : `<b>${briefWaiting.length} joueurs</b>`;
  const reste = Math.max(0, Math.ceil((briefEndsAt - performance.now()) / 1000));
  hudBriefEl.innerHTML = `En attente de ${qui} — briefing <i>${reste} s</i>`;
}

export function refreshPanel() {
  updateVersion();
  if (!connected) return;
  if (!inRoom) { panel.hidden = true; return; }
  if (!gate.hidden) return;
  if (!menuEl.hidden) return;
  showHud(phase === PHASE_ROUND);
  if (phase === PHASE_ROUND || bilanOpen || finOpen) { panel.hidden = true; return; }
  panel.hidden = false;

  const isHost = myId === hostId;
  const hostName = lobby.find(l => l.id === hostId)?.name ?? "?";

  if (panelKicker) panelKicker.textContent = isHost ? "Salon · tu es l'hôte" : "Salon";
  panelTitle.textContent = roomNameCur || "Salon";
  summary.textContent = lobby.length > 1
    ? `${lobby.length} joueurs connectés.`
    : "En attente de joueurs.";
  renderScores(lastResult ? lastResult.rows : lobby.map(l => ({
    id: l.id, name: l.name, colorIndex: l.colorIndex,
    score: 0, kills: 0, deaths: 0, total: l.total,
  })));

  renderVote();
  renderClasses();
  renderMeta();

  const solo = lobby.length <= 1;
  const manquants = solo ? [] : lobby.filter(l => !l.ready);
  const me = lobby.find(l => l.id === myId);
  const jeSuisPret = !!me?.ready;

  readyBtn.hidden = solo;
  readyBtn.textContent = jeSuisPret ? "Je ne suis plus prêt" : "Je suis prêt";
  readyBtn.classList.toggle("on", jeSuisPret);

  startBtn.hidden = !isHost;
  startBtn.disabled = !isHost || manquants.length > 0;

  renderTeam();
  renderHistory();

  const maClasse = classAt(me?.cls ?? CLASS_DEFAULT).nom;
  const mode = DIFFICULTIES[difficulty]?.label ?? "normal";
  const prets = lobby.length - manquants.length;
  launchSummaryEl.textContent = solo
    ? `${maClasse} · difficulté ${mode} · en solo`
    : `${maClasse} · difficulté ${mode} · ${prets} joueur${prets > 1 ? "s" : ""}`
      + ` sur ${lobby.length} ${prets > 1 ? "sont prêts" : "est prêt"}`;

  if (solo) {
    waitMsg.textContent = "Tu joues seul. Lance quand tu veux.";
  } else if (manquants.length === 0) {
    waitMsg.textContent = isHost
      ? "Tout le monde est prêt. Tout le monde entre en jeu, spectateurs compris."
      : `Tout le monde est prêt. En attente de ${hostName}…`;
  } else if (manquants.length === 1 && manquants[0].id === myId) {
    waitMsg.textContent = "Il ne manque que toi.";
  } else if (manquants.length <= 2) {
    waitMsg.textContent = `En attente de ${manquants.map(l => l.name).join(" et ")}.`;
  } else {
    waitMsg.textContent = `En attente de ${manquants.length} joueurs.`;
  }

  renderLaunch();
}
function renderTeam() {
  if (!teamListEl) return;
  teamListEl.innerHTML = "";

  const solo = lobby.length <= 1;
  const prets = lobby.filter(l => l.ready).length;
  if (teamReadyEl) {
    teamReadyEl.textContent = solo
      ? ""
      : `${prets} / ${lobby.length} prêt${lobby.length > 1 ? "s" : ""}`;
  }

  for (const l of lobby) {
    const row = document.createElement("div");
    row.className = "teamRow" + (!solo && l.ready ? " ready" : "");

    const cls = (l.cls === null || l.cls === undefined) ? null : classAt(l.cls);
    const ms = Number(l.ping);
    const pingTxt = Number.isFinite(ms) && ms >= 0 ? `${ms} ms` : "—";

    const teinte = PLAYER_COLORS[l.colorIndex % PLAYER_COLORS.length] ?? PLAYER_COLORS[0];
    row.innerHTML =
      `<span class="teamAvatar"></span>` +
      `<span class="teamMain">` +
        `<span class="teamTop">` +
          `<span class="teamName"></span>` +
          (l.id === hostId ? `<span class="teamHost">hôte</span>` : "") +
        `</span>` +
        `<span class="teamCls">${cls ? escapeHtml(cls.nom) : "choisit sa classe…"}</span>` +
      `</span>` +
      `<span class="teamPing">${pingTxt}</span>` +
      `<span class="teamDot"></span>`;

    row.querySelector(".teamName").textContent = l.name;
    const av = row.querySelector(".teamAvatar");
    av.textContent = (l.name || "?").trim().charAt(0).toUpperCase() || "?";
    av.style.color = teinte;
    if (cls) row.querySelector(".teamCls").style.color = cls.couleur;
    else row.querySelector(".teamCls").classList.add("pending");
    teamListEl.appendChild(row);
  }
}
function renderHistory() {
  if (!historyListEl) return;
  historyListEl.innerHTML = "";

  if (!roundHistory.length) {
    const row = document.createElement("div");
    row.className = "histRow";
    row.innerHTML = `<span class="histWhen">—</span>`
      + `<span class="histLabel">Aucune manche jouée dans cette salle.</span><span></span>`;
    historyListEl.appendChild(row);
    return;
  }

  for (const h of roundHistory) {
    const t = new Date(h.at);
    const heure = Number.isFinite(t.getTime())
      ? `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`
      : "—";
    const mode = DIFFICULTIES[h.diffIndex]?.label ?? "?";

    const etape = h.segment > 0 ? `${segmentName(h.segment)} (${h.segment}/6)` : "—";
    const row = document.createElement("div");
    row.className = "histRow";
    row.innerHTML =
      `<span class="histWhen">${escapeHtml(heure)}</span>` +
      `<span class="histLabel">${escapeHtml(mode)} · ${escapeHtml(etape)}</span>` +
      `<span></span>`;
    historyListEl.appendChild(row);
  }
}
readyBtn.onclick = () => {
  if (phase !== PHASE_LOBBY) return;
  const me = lobby.find(l => l.id === myId);
  ws.send(JSON.stringify({ t: "ready", on: !me?.ready }));
};
const VOTE_STATS = [
  { nom: "PV",          val: d => d.hp },
  { nom: "apparitions", val: d => d.spawn },
  { nom: "dégâts",      val: d => d.dmg },
  { nom: "boss",        val: d => d.boss },
];
function mul2(v) { return "×" + v.toFixed(2).replace(".", ","); }
function mulCourt(v) { return "×" + String(+v.toFixed(2)).replace(".", ","); }
function voteDetail(d, i) {
  const lignes = (d.resume ?? []).slice();
  const b = biomeAt(biomeIndex);
  lignes.push(i === 0
    ? `${b.nom} — ${b.resume} · aucun danger`
    : i === 1
      ? `${b.nom} — ${b.resume} · rien qui blesse`
      : `${b.nom} — ${b.resume} · dangers actifs et météo`);
  return lignes.join(" · ");
}
function renderVote() {
  voteRow.innerHTML = "";

  DIFFICULTIES.forEach((d, i) => {
    const btn = document.createElement("button");
    const n = tally[i] ?? 0;
    const noyaux = PROG_CFG.DIFF_MUL[i] ?? 1;
    btn.innerHTML =
      `<span class="voteHead"><span class="voteName"></span>`
      + `<span class="voteMul">noyaux ${mulCourt(noyaux)}</span></span>`
      + `<span class="voteDetail"></span>`
      + (n > 0 ? `<span class="tally"></span>` : "");
    btn.querySelector(".voteName").textContent = d.label;
    btn.querySelector(".voteDetail").textContent = voteDetail(d, i);
    if (n > 0) btn.querySelector(".tally").textContent = `${n} voix`;
    btn.classList.toggle("mine", i === myVote);
    btn.classList.toggle("winner", i === difficulty);
    btn.onclick = () => {
      if (phase !== PHASE_LOBBY) return;
      setMyVote(i);
      ws.send(JSON.stringify({ t: "vote", v: i }));
      renderVote();
    };
    voteRow.appendChild(btn);
  });

  const retenu = DIFFICULTIES[difficulty]?.label ?? "normal";
  voteHint.textContent = lobby.length > 1
    ? `Mode retenu : ${retenu} (${tally[difficulty] ?? 0} voix sur ${lobby.length}).`
      + ` À égalité, le plus doux l'emporte.`
    : `Mode retenu : ${retenu}. Le vote se verrouille au lancement.`;
}
const CLASS_STATS = [
  { nom: "PV", val: c => c.hp, texte: c => String(c.hp) },
  { nom: "dégâts", val: c => c.damageMul, texte: c => pourcent(c.damageMul) },
  { nom: "vitesse", val: c => c.speedMul, texte: c => pourcent(c.speedMul) },
];
function pourcent(mul) {
  const p = Math.round((mul - 1) * 100);
  return (p > 0 ? "+" : p < 0 ? "−" : "±") + Math.abs(p) + " %";
}
const CLASS_SIL_PX = 88;
function paintClassSilhouette(cv2, c) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv2.width = Math.round(CLASS_SIL_PX * dpr);
  cv2.height = Math.round(CLASS_SIL_PX * dpr);
  cv2.style.width = CLASS_SIL_PX + "px";
  cv2.style.height = CLASS_SIL_PX + "px";

  const g = cv2.getContext("2d");
  const s = 1.4;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.translate(CLASS_SIL_PX / 2, CLASS_SIL_PX / 2);

  g.strokeStyle = SURFACE.line;
  g.lineWidth = 1;
  g.beginPath(); g.arc(0, 0, (CFG.PLAYER_RADIUS + 8) * s, 0, Math.PI * 2); g.stroke();

  drawSprite(g, frameOf(`c_${c.id}_idle`), 0, 0,
    { scaleX: s, scaleY: s, tint: c.couleur });
}
let metaBtnCls = null;
function renderClasses() {
  if (!classRow) return;
  classRow.innerHTML = "";

  const me = lobby.find(l => l.id === myId);
  const mine = me?.cls ?? null;
  const locked = me?.clsLocked ?? false;
  const taken = new Map();
  for (const l of lobby) {
    if (l.cls === null || l.cls === undefined) continue;
    if (CLASSES[l.cls]?.unique && l.id !== myId) taken.set(l.cls, l.name);
  }

  const maxi = CLASS_STATS.map(st => Math.max(...CLASSES.map(st.val)));

  CLASSES.forEach((c, i) => {
    const btn = document.createElement("button");
    const pris = taken.get(i);
    btn.className = "classOpt";
    btn.style.borderColor = c.couleur;
    btn.style.color = c.couleur;
    btn.disabled = locked || !!pris;
    btn.classList.toggle("mine", i === mine);
    btn.classList.toggle("taken", !!pris);

    const stats = CLASS_STATS.map((st, k) =>
      `<div class="statRow">` +
        `<span class="statName">${st.nom}</span>` +
        `<span class="statBar"><i style="width:${Math.round(st.val(c) / maxi[k] * 100)}%"></i></span>` +
        `<span class="statVal">${escapeHtml(st.texte(c))}</span>` +
      `</div>`).join("");

    btn.innerHTML =
      `<div class="classHead">` +
        `<canvas class="classSil"></canvas>` +
        `<div>` +
          `<div class="className">${escapeHtml(c.nom)}</div>` +
          `<div class="classRole">${escapeHtml(c.desc)}</div>` +
        `</div>` +
      `</div>` +
      `<div class="classStats">${stats}</div>` +
      c.skills.map(s =>
        `<div class="classSkill"><span class="key">${escapeHtml(s.touche)}</span>` +
        `<span><b>${escapeHtml(s.nom)}</b> — ${escapeHtml(s.desc)}</span></div>`
      ).join("") +
      (pris ? `<div class="classTaken">pris par ${escapeHtml(pris)}</div>` : "");

    paintClassSilhouette(btn.querySelector(".classSil"), c);

    btn.onclick = () => {
      if (locked || pris) return;
      ws.send(JSON.stringify({ t: "pickClass", cls: i }));
    };

    const cell = document.createElement("div");
    cell.className = "classCell";
    cell.appendChild(btn);

    if (i === mine) {
      const meta = document.createElement("button");
      meta.className = "classMetaBtn";
      if (mine !== metaBtnCls) meta.classList.add("fresh");
      meta.textContent = `Talents du ${c.nom}`;
      meta.style.color = c.couleur;
      const dot = document.createElement("i");
      dot.className = "metaDot";
      dot.hidden = !metaSpendable;
      meta.appendChild(dot);
      meta.onclick = () => openMenuFor(i);
      cell.appendChild(meta);
    }
    classRow.appendChild(cell);
  });
  metaBtnCls = mine;

  if (!classHint) return;
  if (locked) {
    classHint.textContent =
      `Classe verrouillée pour la session : ${classAt(mine ?? CLASS_DEFAULT).nom}.`;
  } else if (mine === null || mine === undefined) {
    classHint.textContent =
      `Sans choix explicite, tu entres en ${CLASSES[CLASS_DEFAULT].nom}.`
      + " Le choix se verrouille au lancement.";
  } else {
    classHint.textContent = "Le choix se verrouille au lancement de la première manche.";
  }
}
const META_TABS = [
  ["metaTabArbre", "arbre"], ["metaTabConfort", "confort"],
  ["metaTabJalons", "jalons"], ["metaTabBans", "bans"],
];
let metaTab = "arbre";
for (const [id, tab] of META_TABS) {
  document.getElementById(id).onclick = () => { metaTab = tab; renderMeta(); };
}
export function renderMeta(clsOverride) {
  if (clsOverride !== undefined) setMetaClsOverride(clsOverride);
  if (!metaEl) return;
  if (!progressState) { metaEl.hidden = true; return; }
  metaEl.hidden = false;

  const pr = progressState;
  const me = lobby.find(l => l.id === myId);
  const cdef = classAt(metaClsOverride ?? me?.cls ?? CLASS_DEFAULT);
  const clsId = cdef.id;
  const cp = pr.classes?.[clsId] ?? { tiers: {}, equipped: [] };
  const slots = slotsFor(pr);
  const equipped = cp.equipped ?? [];

  menuTitleEl.textContent = `Arbre du ${cdef.nom}`;
  metaCoresEl.textContent = `${pr.cores} noyaux`;

  metaClassTabsEl.innerHTML = "";
  for (let i = 0; i < CLASSES.length; i++) {
    const b = document.createElement("button");
    b.textContent = CLASSES[i].nom;
    b.className = classAt(i).id === clsId ? "mine" : "";
    b.onclick = () => renderMeta(i);
    metaClassTabsEl.appendChild(b);
  }

  const bosses = (pr.milestones ?? []).filter(id => id.startsWith("boss_")).length;
  metaSlotsEl.innerHTML =
    `<b>Emplacements ${equipped.length} / ${slots}</b> équipés sur le ${escapeHtml(cdef.nom)}`
    + ` · réattribution libre entre les manches<br>`
    + `<small>${PROG_CFG.SLOTS_BASE} de départ`
    + ` · niveau ${PROG_CFG.SLOTS_LEVEL} ${(pr.milestones ?? []).includes(`niveau${PROG_CFG.SLOTS_LEVEL}`) ? "✓" : "•"}`
    + ` · ${PROG_CFG.SLOTS_BOSSES} boss différents (${Math.min(bosses, PROG_CFG.SLOTS_BOSSES)}/${PROG_CFG.SLOTS_BOSSES})`
    + ` · ${PROG_CFG.SLOTS_RUNS} parties (${Math.min(pr.runs ?? 0, PROG_CFG.SLOTS_RUNS)}/${PROG_CFG.SLOTS_RUNS})</small>`;

  metaTreeEl.hidden = metaTab !== "arbre";
  metaConfortEl.hidden = metaTab !== "confort";
  metaMilestonesEl.hidden = metaTab !== "jalons";
  metaBansEl.hidden = metaTab !== "bans";
  for (const [id, tab] of META_TABS) {
    document.getElementById(id).classList.toggle("mine", metaTab === tab);
  }
  metaSubEl.textContent = metaTab === "arbre"
    ? `arbre du ${cdef.nom} — l'effet affiché est le TOTAL possédé`
    : metaTab === "confort"
      ? "confort et lignes communes : aucun emplacement consommé, valent pour les trois classes"
      : metaTab === "jalons"
        ? "les jalons débloquent cartes et emplacements — jamais des noyaux"
        : "cartes bannies de ce compte — définitif, pas de débannissement";

  metaBansEl.innerHTML = "";
  const bans = progressState?.bannedCards ?? [];
  if (bans.length === 0) {
    metaBansEl.innerHTML = `<div class="hint">aucune carte bannie — le bouton vit sur l'écran de choix, pendant une manche</div>`;
  } else {
    for (const bid of bans) {
      const card = CARD_BY_ID.get(bid);
      const row = document.createElement("div");
      row.className = "metaLine confort banned";
      row.innerHTML =
        `<span class="metaName">${escapeHtml(card?.nom ?? bid)}</span>` +
        `<span class="metaDesc">${escapeHtml(card?.desc ?? "carte inconnue de cette version")}</span>` +
        `<span class="metaBanTag">bannie</span>`;
      metaBansEl.appendChild(row);
    }
  }

  metaTreeEl.innerHTML = "";
  for (const line of TREES[clsId] ?? []) {
    const n = cp.tiers?.[line.id] | 0;
    const cost = tierCost(n);
    const isEquipped = equipped.includes(line.id);

    const row = document.createElement("div");
    row.className = "metaLine"
      + (isEquipped ? " equipped" : n > 0 ? " owned" : " locked");
    row.innerHTML =
      `<span class="metaName">${escapeHtml(line.nom)}</span>` +
      `<span class="metaPips">${"●".repeat(n)}${"○".repeat(PROG_CFG.TIERS_MAX - n)}</span>` +
      `<span class="metaDesc">${escapeHtml(n > 0 ? line.desc(n) : line.desc(1) + " par palier")}</span>`;

    const buy = document.createElement("button");
    buy.className = "metaBuy";
    if (n >= PROG_CFG.TIERS_MAX) {
      buy.textContent = "max";
      buy.disabled = true;
    } else {
      buy.textContent = `${cost} noyaux`;
      buy.disabled = pr.cores < cost || phase !== PHASE_LOBBY;
      buy.onclick = () => ws.send(JSON.stringify({ t: "metaBuy", cls: clsId, line: line.id }));
    }

    const eq = document.createElement("button");
    eq.className = "metaEquip" + (isEquipped ? " on" : "");
    eq.textContent = isEquipped ? "équipée" : "équiper";
    eq.disabled = n <= 0 || (!isEquipped && equipped.length >= slots) || phase !== PHASE_LOBBY;
    eq.onclick = () => {
      const lines = isEquipped ? equipped.filter(l => l !== line.id) : [...equipped, line.id];
      ws.send(JSON.stringify({ t: "metaEquip", cls: clsId, lines }));
    };

    row.append(buy, eq);
    metaTreeEl.appendChild(row);
  }

  metaConfortEl.innerHTML = "";
  for (const cf of CONFORT) {
    const owned = (pr.confort ?? []).includes(cf.id);
    const cost = PROG_CFG.CONFORT_COSTS[cf.id];
    const row = document.createElement("div");
    row.className = "metaLine confort";
    row.innerHTML =
      `<span class="metaName">${escapeHtml(cf.nom)}</span>` +
      `<span class="metaDesc">${escapeHtml(cf.desc)}</span>`;
    const b = document.createElement("button");
    b.className = "metaBuy";
    if (owned) {
      b.textContent = "acquise";
      b.disabled = true;
    } else {
      b.textContent = `${cost} noyaux`;
      b.disabled = pr.cores < cost || phase !== PHASE_LOBBY;
      b.onclick = () => ws.send(JSON.stringify({ t: "metaConfort", id: cf.id }));
    }
    row.appendChild(b);
    metaConfortEl.appendChild(row);
  }

  for (const line of COMMUN) {
    const n = (pr.commun ?? {})[line.id] | 0;
    const cost = tierCost(n, line.id);
    const row = document.createElement("div");
    row.className = "metaLine confort" + (n > 0 ? " owned" : "");
    row.innerHTML =
      `<span class="metaName">${escapeHtml(line.nom)}</span>` +
      `<span class="metaPips">${"●".repeat(n)}${"○".repeat(PROG_CFG.TIERS_MAX - n)}</span>` +
      `<span class="metaDesc">${escapeHtml(n > 0 ? line.desc(n) : line.desc(1) + " par palier")}</span>`;
    const b = document.createElement("button");
    b.className = "metaBuy";
    if (n >= PROG_CFG.TIERS_MAX) {
      b.textContent = "max";
      b.disabled = true;
    } else {
      b.textContent = `${cost} noyaux`;
      b.disabled = pr.cores < cost || phase !== PHASE_LOBBY;
      b.onclick = () => ws.send(JSON.stringify({ t: "metaCommun", line: line.id }));
    }
    row.appendChild(b);
    metaConfortEl.appendChild(row);
  }

  const done = new Set(pr.milestones ?? []);
  metaMilestonesEl.innerHTML = MILESTONES.map(m => {
    const ok = done.has(m.id);
    return `<span class="metaJalon${ok ? " done" : ""}">`
      + `${ok ? "✓" : "•"} ${escapeHtml(m.label)}`
      + ` <small>(${m.unlocks.length} carte${m.unlocks.length > 1 ? "s" : ""})</small></span>`;
  }).join("");
}
function renderScores(rows, body = scoresBody) {
  body.innerHTML = "";
  const head = document.createElement("tr");
  head.innerHTML = "<th>joueur</th><th>classe</th><th>niv.</th><th>score</th><th>kills</th><th>morts</th><th>dégâts</th><th>cartes</th><th>noyaux</th><th>cumul</th>";
  body.appendChild(head);

  for (const r of rows) {
    const tr = document.createElement("tr");
    const col = PLAYER_COLORS[r.colorIndex % PLAYER_COLORS.length];
    const tag = r.id === hostId ? " ★" : "";
    const cdef = (r.cls === null || r.cls === undefined) ? null : classAt(r.cls);
    tr.innerHTML =
      `<td class="name" style="color:${col}">${escapeHtml(r.name)}${tag}</td>` +
      `<td class="sub"${cdef ? ` style="color:${cdef.couleur}"` : ""}>${cdef ? escapeHtml(cdef.nom) : "—"}</td>` +
      `<td>${r.level ?? 1}</td>` +
      `<td>${r.score}</td><td>${r.kills}</td><td>${r.deaths}</td>` +
      `<td>${Math.round(r.damage ?? 0)}</td>` +
      `<td class="cards">${cardBadges(r.id)}</td>` +
      `<td class="sub">${r.cores !== undefined ? "+" + r.cores : "—"}</td>` +
      `<td class="sub">${r.total ? r.total.score : 0}</td>`;
    tr.className = "clickable";
    tr.title = "voir la build";
    tr.onclick = () => openBuild(r.id);
    body.appendChild(tr);
  }
}
export function openFin(res) {
  if (!finEl) return;
  setFinOpen(true);
  finEl.hidden = false;
  panel.hidden = true;
  bilanEl.hidden = true;

  if (finKicker) {
    const mode = DIFFICULTIES[difficulty]?.label ?? "";
    finKicker.textContent = [roomNameCur, mode].filter(Boolean).join(" · ");
  }

  finEl.classList.toggle("win", !!res.victory);
  finTitle.textContent = res.victory ? "Victoire" : "Tu es tombé";

  const etape = res.segment
    ? `${segmentName(res.segment)} (${res.segment}/${TL_CFG.SEGMENTS})`
    : "—";
  finStats.innerHTML = [
    ["étape atteinte", etape],
    ["niveau", String(res.level ?? 1)],
    ["survie", fmtTime(res.time)],
  ].map(([lab, val]) =>
    `<div class="finStat"><span class="val">${escapeHtml(val)}</span>` +
    `<span class="lab">${escapeHtml(lab)}</span></div>`).join("");
}
export function closeFin() {
  if (!finEl) return;
  setFinOpen(false);
  finEl.hidden = true;
  finEl.classList.remove("win");
}
if (finGo) {
  finGo.onclick = () => {
    closeFin();
    if (lastResult) showBilan(lastResult);
    refreshPanel();
  };
}

export function showBilan(res) {
  setBilanOpen(true);
  bilanEl.hidden = false;
  panel.hidden = true;

  const niv = res.level ? ` — niveau ${res.level}` : "";
  bilanEl.classList.toggle("win", !!res.victory);
  bilanTitle.textContent = res.victory
    ? `Victoire — les six étapes franchies${niv}`
    : res.segment
      ? `Partie terminée — ${segmentName(res.segment)}`
        + ` (${res.segment}/${TL_CFG.SEGMENTS})${niv}`
      : `Partie terminée`;
  if (bilanKicker) {
    const mode = DIFFICULTIES[difficulty]?.label ?? "";
    bilanKicker.textContent = [roomNameCur, mode].filter(Boolean).join(" · ");
  }

  const joueurs = res.rows.filter(r => r.played).length || res.rows.length;
  bilanStats.innerHTML =
    `<div class="bilanStat"><span class="lab">survie</span>` +
    `<span class="val">${escapeHtml(fmtTime(res.time))}</span></div>` +
    `<div class="bilanStat"><span class="lab">kills</span>` +
    `<span class="val">${res.kills}</span></div>` +
    `<div class="bilanStat"><span class="lab">joueurs</span>` +
    `<span class="val">${joueurs}</span></div>` +
    `<div class="bilanStat"><span class="lab">manche</span>` +
    `<span class="val">${res.round}</span></div>`;
  renderHurtBy(res.rows);
  renderBilanScores(res.rows);
}
const BILAN_COLS = [
  { lab: "score",  val: r => fmtBig(r.score ?? 0),   mine: true },
  { lab: "kills",  val: r => String(r.kills ?? 0) },
  { lab: "morts",  val: r => String(r.deaths ?? 0) },
  { lab: "dégâts", val: r => fmtBig(r.damage ?? 0) },
  { lab: "soins",  val: r => (r.heal ?? 0) > 0 ? fmtBig(r.heal) : "—" },
  { lab: "noyaux", val: r => r.cores !== undefined ? String(r.cores) : "—" },
];
function renderBilanScores(rows) {
  bilanScoresBody.innerHTML = "";
  const head = document.createElement("tr");
  head.innerHTML = `<th>joueur</th>`
    + BILAN_COLS.map(c => `<th>${c.lab}</th>`).join("");
  bilanScoresBody.appendChild(head);

  for (const r of rows) {
    const tr = document.createElement("tr");
    const cdef = (r.cls === null || r.cls === undefined) ? null : classAt(r.cls);
    const col = cdef ? cdef.couleur : PLAYER_COLORS[r.colorIndex % PLAYER_COLORS.length];
    const ini = (r.name || "?")[0].toUpperCase();

    tr.innerHTML =
      `<td class="who">` +
        `<span class="whoDot" style="color:${col}">${escapeHtml(ini)}</span>` +
        `<span class="whoText">` +
          `<span class="whoName">${escapeHtml(r.name)}</span>` +
          `<span class="whoCls">${cdef ? escapeHtml(cdef.nom) : "—"}</span>` +
        `</span>` +
      `</td>`
      + BILAN_COLS.map(c =>
          `<td class="num${c.mine && r.id === myId ? " mine" : ""}">${c.val(r)}</td>`).join("");

    tr.className = "clickable";
    tr.onclick = () => openBuild(r.id);
    bilanScoresBody.appendChild(tr);
  }
}

function renderHurtBy(rows) {
  const total = DAMAGE_SOURCES.map(() => 0);
  for (const r of rows) {
    for (let i = 0; i < total.length; i++) total[i] += (r.hurtBy?.[i] ?? 0);
  }
  const somme = total.reduce((a, b) => a + b, 0);
  if (somme <= 0) { bilanHurt.hidden = true; bilanHurt.innerHTML = ""; return; }
  bilanHurt.hidden = false;

  const parts = DAMAGE_SOURCES
    .map((s, i) => ({ i, label: s.label, val: total[i] }))
    .filter(p => p.val > 0)
    .sort((a, b) => b.val - a.val);

  const segs = parts.map(p => ({ ...p, pct: Math.round(p.val / somme * 100) }));
  bilanHurt.innerHTML =
    `<div class="hurtTitle sectionTitle">dégâts subis par l'équipe</div>` +
    `<div class="hurtStack">` +
      segs.map(p => `<i style="width:${p.pct}%;background:${SRC_TINT[p.i]}"></i>`).join("") +
    `</div>` +
    `<div class="hurtLegend">` +
      segs.map(p => `<span class="hurtItem">` +
        `<i style="background:${SRC_TINT[p.i]}"></i>` +
        `<span class="hurtLab">${escapeHtml(p.label)}</span>` +
        `<span class="hurtVal">${p.pct} %</span>` +
      `</span>`).join("") +
    `</div>`;
  if (PERF) {
    bilanPerf.hidden = false;
    bilanPerf.textContent =
      `diagnostic réseau — famine ${netPerf.totFamine} · recal ${netPerf.totResnap}`
      + ` · >${INTERP_MS}ms ${netPerf.totGap} · max gap ${netPerf.maxGap.toFixed(0)} ms`
      + ` · img max ${netPerf.maxFrame.toFixed(0)} ms`;
  }
}
export function closeBilan() {
  setBilanOpen(false);
  bilanEl.hidden = true;
  bilanEl.classList.remove("win");
  refreshPanel();
}
bilanGo.onclick = closeBilan;
if (bilanLeaveBtn) {
  bilanLeaveBtn.onclick = () => {
    if (!connected || !inRoom) return;
    closeBilan();
    ws.send(JSON.stringify({ t: "leaveRoom" }));
  };
}
function cardBadges(playerId) {
  const counts = ownedCounts(playerId);
  if (counts.size === 0) return "";

  let html = "";
  for (const [id, n] of counts) {
    const card = CARD_BY_ID.get(id);
    if (!card) continue;
    const col = RARITY_COLOR[card.rarity] ?? RARITY_COLOR[0];
    html += `<span class="cardBadge" style="border-color:${col};color:${col}">` +
      `${escapeHtml(card.nom)}${n > 1 ? ` ×${n}` : ""}</span>`;
  }
  return html;
}
const FAMILY_ICON = {
  degats:   `<path d="M12 2 L16 9 L12 22 L8 9 Z"/>`,
  cadence:  `<path d="M13 2 L5 13 h5 l-1 9 l9 -12 h-5 z"/>`,
  mobilite: `<path d="M4 6 l6 6 l-6 6 M13 6 l6 6 l-6 6"/>`,
  survie:   `<path d="M12 2 L20 6 v6 c0 5 -4 8 -8 10 c-4 -2 -8 -5 -8 -10 V6 Z"/>`,
  soutien:  `<path d="M12 3 v18 M3 12 h18"/>`,
};
const FAMILY_ICON_DEFAULT = `<path d="M12 3 L21 12 L12 21 L3 12 Z"/>`;
function familyIcon(famille) {
  const d = FAMILY_ICON[famille] ?? FAMILY_ICON_DEFAULT;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"` +
         ` stroke-width="2" stroke-linejoin="miter">${d}</svg>`;
}
export function closeCards() {
  setCardsState(null);
  setCardsPending([]);
  stopCardsTimer();
  cardsEl.hidden = true;
}

export function renderMerchant() {
  if (!merchantState) { merchantEl.hidden = true; return; }
  merchantEl.hidden = false;

  const epuise = (merchantState.achats ?? 1) <= 0;
  merchantTitle.innerHTML =
    `Marchand <span class="merchantEclats">${merchantState.eclats} éclats</span>` +
    (epuise ? `<span class="merchantAchat">une relique par visite</span>` : "");

  merchantRow.innerHTML = "";
  for (const id of merchantState.offers) {
    const r = relicById(id);
    if (!r) continue;
    const col = RARITY_COLOR[r.tier] ?? RARITY_COLOR[0];
    const prix = relicPrice(r);
    const btn = document.createElement("button");
    btn.className = `cardOpt r${r.tier}`;
    btn.style.color = col;
    btn.dataset.id = id;
    btn.disabled = merchantState.done || epuise || merchantState.eclats < prix;
    let html =
      `<div class="cardTop">` +
        `<span class="cardName">${escapeHtml(r.nom)}</span>` +
      `</div>` +
      `<div class="cardMeta">` +
        `<span class="cardRarity">${RELIC_RARITY[r.tier] ?? ""}</span>` +
      `</div>` +
      `<div class="cardBody">` +
        `<div class="cardMain">${escapeHtml(r.desc)}</div>` +
        (r.equipe ? `<div class="cardTeam">effet d'équipe</div>` : "") +
        (r.contrepartie
          ? `<div class="cardWarn">${escapeHtml(r.contrepartie)}</div>`
          : "") +
      `</div>` +
      `<div class="cardFoot">` +
        `<span class="merchantPrix">${prix} éclats</span>` +
      `</div>`;
    btn.innerHTML = html;
    btn.onclick = () => buyRelic(id);
    merchantRow.appendChild(btn);
  }

  const reroll = document.createElement("button");
  reroll.className = "ghost";
  reroll.textContent = `Relancer (${merchantState.rerollCost} éclats)`;
  reroll.disabled = merchantState.done || epuise
    || merchantState.eclats < merchantState.rerollCost;
  reroll.onclick = () => {
    ws.send(JSON.stringify({ t: "rerollRelic" }));
  };
  merchantRow.appendChild(reroll);

  const passer = document.createElement("button");
  passer.className = "ghost";
  passer.textContent = epuise ? "Terminer" : "Passer";
  passer.disabled = merchantState.done;
  passer.onclick = () => {
    merchantState.done = true;
    ws.send(JSON.stringify({ t: "skipMerchant" }));
    renderMerchant();
  };
  merchantRow.appendChild(passer);

  renderMerchantWait();
  startMerchantTimer();
}
export function renderMerchantWait() {
  if (!merchantState) return;
  const names = merchantWait.filter(id => id !== myId).map(id => nameOf(id));
  merchantWaitEl.textContent = names.length
    ? `en attente de ${names.join(", ")}…`
    : "";
}
function buyRelic(id) {
  if (!merchantState || merchantState.done) return;
  ws.send(JSON.stringify({ t: "buyRelic", id }));
  const btn = merchantRow.querySelector(`button[data-id="${id}"]`);
  if (btn) btn.disabled = true;
}
export function closeMerchant() {
  setMerchantState(null);
  setMerchantWait([]);
  stopMerchantTimer();
  merchantEl.hidden = true;
}
function stopMerchantTimer() {
  if (merchantTimerHandle) { clearInterval(merchantTimerHandle); setMerchantTimerHandle(null); }
}
function startMerchantTimer() {
  stopMerchantTimer();
  updateMerchantTimer();
  setMerchantTimerHandle(setInterval(updateMerchantTimer, 250));
}
function updateMerchantTimer() {
  if (!merchantState) return;
  const span = Math.max(1, merchantState.deadline - merchantState.from);
  const k = Math.max(0, Math.min(1, (merchantState.deadline - Date.now()) / span));
  merchantTimerFill.style.width = `${k * 100}%`;
  merchantTimerEl.classList.toggle("urgent", k < 0.25);
}
function pickCard(id) {
  if (!cardsState || cardsState.picked) return;
  cardsState.picked = true;
  cardsState.pickedId = id;
  ws.send(JSON.stringify({ t: "pickCard", id }));
  markCardPicked(id);
}
function markCardPicked(id) {
  for (const btn of cardsRow.querySelectorAll(".cardOpt")) {
    const mienne = btn.dataset.card === String(id);
    btn.disabled = true;
    btn.classList.toggle("picked", mienne);
    btn.classList.toggle("faded", !mienne);
    btn.querySelector(".cardBan")?.remove();
  }
  const rb = cardsRow.querySelector("#cardsReroll");
  if (rb) { rb.disabled = true; rb.hidden = true; }
  renderCardsWait();
}
function banCard(id) {
  if (!cardsState || cardsState.picked) return;
  const card = CARD_BY_ID.get(id);
  if (!card) return;
  const closure = banClosure(id)
    .filter(bid => !(progressState?.bannedCards ?? []).includes(bid));
  let msg = `Bannir « ${card.nom} » ?\n\n`
    + "Cette carte ne sera plus JAMAIS proposée sur ce compte, et tu ne "
    + "recevras pas de carte de remplacement pour cette apparition.";
  const entrained = closure.filter(bid => bid !== id);
  if (entrained.length > 0) {
    msg += "\n\nBannies avec elle (elles dépendent de celle-ci) :\n— "
      + entrained.map(bid => CARD_BY_ID.get(bid)?.nom ?? bid).join("\n— ");
  }
  if (card.excl === "skill3") {
    const variants = CARDS.filter(c => c.excl === "skill3" && c.cls === card.cls);
    const banned = new Set([...(progressState?.bannedCards ?? []), ...closure]);
    if (variants.every(v => banned.has(v.id))) {
      msg += "\n\n⚠ C'est la DERNIÈRE variante de troisième compétence du "
        + `${classAt(lobby.find(l => l.id === myId)?.cls ?? CLASS_DEFAULT).nom} : `
        + "ce compte n'aura plus jamais de troisième compétence sur cette classe.";
    }
  }
  if (!confirm(msg)) return;
  cardsState.picked = true;
  cardsState.pickedId = null;
  ws.send(JSON.stringify({ t: "banCard", id }));
  renderCards();
}
export function renderCards() {
  if (!cardsState) { cardsEl.hidden = true; return; }
  cardsEl.hidden = false;

  const suite = cardsState.more > 0
    ? ` — encore ${cardsState.more} choix après celui-ci`
    : "";
  cardsTitle.textContent = cardsState.bossWave
    ? `${bossAt(cardsState.bossKind).nom.toUpperCase()} ${ROMAN[cardsState.boss] ?? cardsState.boss}`
      + ` vaincu — niveau ${cardsState.level}${suite}`
    : `${segmentName(cardsState.segment)} — niveau ${cardsState.level}${suite}`;

  const owned = ownedCounts(myId);

  cardsRow.innerHTML = "";
  for (const c of cardsState.offers) {
    const col = RARITY_COLOR[c.rarity] ?? RARITY_COLOR[0];
    const d = cardDetail(c.id, owned);
    const btn = document.createElement("button");
    btn.className = `cardOpt r${c.rarity ?? 0}`;
    btn.style.color = col;
    btn.dataset.card = c.id;
    btn.disabled = cardsState.picked;
    if (cardsState.picked) {
      btn.classList.add(cardsState.pickedId === c.id ? "picked" : "faded");
    }

    let html =
      `<div class="cardTop">` +
        `<span class="cardIcon">${familyIcon(d?.familleId)}</span>` +
        `<span class="cardName">${escapeHtml(c.nom)}</span>` +
      `</div>` +
      `<div class="cardMeta">` +
        `<span class="cardRarity">${RARITY_LABEL[c.rarity] ?? ""}</span>` +
        (d?.famille ? `<span class="cardFamily">${escapeHtml(d.famille)}</span>` : "") +
      `</div>` +
      (d ? `<div class="cardCat">` +
        `<span class="catDot" style="background:${CARD_CATEGORY_COLOR[d.categorieId]}"></span>` +
        `<span class="catName" style="color:${CARD_CATEGORY_COLOR[d.categorieId]}">` +
          `${escapeHtml(d.categorie)}</span>` +
        `<span class="catRank">${escapeHtml(d.rang)}</span>` +
      `</div>` : "") +
      `<div class="cardBody">` +
        `<div class="cardMain">${escapeHtml(c.desc)}</div>` +
        (d?.effectif ? `<div class="cardCond">${escapeHtml(d.effectif)}</div>` : "") +
        (d?.avertissement ? `<div class="cardWarn">${escapeHtml(d.avertissement)}</div>` : "") +
      `</div>`;

    if (d && (d.cumul || d.valeur)) {
      html += `<div class="cardFoot">` +
        (d.cumul ? `<span>${escapeHtml(d.cumul)}</span>` : "") +
        (d.valeur ? `<span class="cardDelta">${escapeHtml(d.valeur)}</span>` : "") +
      `</div>`;
    }

    btn.innerHTML = html;
    btn.onclick = () => pickCard(c.id);

    if (!cardsState.picked && (progressState?.confort ?? []).includes("bannissement")) {
      const ban = document.createElement("span");
      ban.className = "cardBan";
      ban.textContent = "bannir";
      ban.setAttribute("role", "button");
      ban.title = "retirer définitivement cette carte du tirage de ce compte";
      ban.onclick = ev => { ev.stopPropagation(); banCard(c.id); };
      btn.appendChild(ban);
    }
    cardsRow.appendChild(btn);
  }

  if (cardsState.reroll && !cardsState.picked) {
    const rb = document.createElement("button");
    rb.id = "cardsReroll";
    const reste = cardsState.reroll | 0;
    rb.innerHTML = `↻<br>relancer<br>le tirage${reste > 1 ? ` (${reste})` : ""}`;
    rb.title = reste > 1 ? `${reste} relances restantes pour cette manche`
      : "derniere relance de la manche";
    rb.onclick = () => {
      cardsState.reroll = reste - 1;
      rb.disabled = true;
      ws?.send(JSON.stringify({ t: "reroll" }));
    };
    cardsRow.appendChild(rb);
  }

  renderCardsWait();
  startCardsTimer();
}
export function renderCardsWait() {
  if (!cardsState) return;
  const names = cardsPending.filter(id => id !== myId).map(id => nameOf(id));
  cardsWaitEl.textContent = names.length ? `en attente de ${names.join(", ")}…` : "";
}
function stopCardsTimer() {
  if (cardsTimerHandle) { clearInterval(cardsTimerHandle); setCardsTimerHandle(null); }
}
function startCardsTimer() {
  stopCardsTimer();
  updateCardsTimer();
  setCardsTimerHandle(setInterval(updateCardsTimer, 250));
}
function updateCardsTimer() {
  if (!cardsState) return;
  const span = Math.max(1, cardsState.deadline - cardsState.from);
  const k = Math.max(0, Math.min(1, (cardsState.deadline - Date.now()) / span));
  cardsTimerFill.style.width = `${k * 100}%`;
  cardsTimerEl.classList.toggle("urgent", k < 0.25);
}

export function setBoardData(v) { boardData = v; }
export function setBriefWaiting(v) { briefWaiting = v; }
export function setLaunchEndsAt(v) { launchEndsAt = v; }
export function setMyPing(v) { myPing = v; }
export function setSettingsFrom(v) { settingsFrom = v; }
