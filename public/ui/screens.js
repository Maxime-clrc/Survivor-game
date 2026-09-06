
import { getAudioSource, getMusicVolume, getVolume, initAudio, isMuted, playSound, setAudioSource, setMusicDuck, setMusicVolume, setMuted, setVolume } from "/audio.js";
import { showHud } from "/hud.js";
import { refreshMusicSource } from "/music.js";
import { BOSS_ROSTER, bossNom, bossSous, bossVerbe } from "/shared/bosses.js";
import { CARDS, CARD_BY_ID, RARITY_COLOR, archetypeDe, archetypeNom, banClosure, cardDesc, cardDetail, cardNom, rarityLabel } from "/shared/cards.js";
import { CLASSES, CLASS_DEFAULT, classAt, classDesc, classMission, classNom, classSolo, skill3Nom, skillDesc, skillNom } from "/shared/classes.js";
import { CFG, DAMAGE_SOURCES, DIFFICULTIES, PLAYER_COLORS, diffLabel, diffResume, srcLabel } from "/shared/game_state.js";
import { biomeNom, biomeResume } from "/shared/biomes.js";
import { LANGS, LANG_NOM, dec, getLang, onLangChange, setLang, t, tf, tn } from "/shared/i18n.js";
import { CARD_CATEGORY_COLOR, SRC_TINT, SURFACE } from "/shared/palette.js";
import { ENEMY_TYPES, enemyLore, enemyNom, roleDe } from "/shared/enemies.js";
import { CONDITIONS, CUSTOM_INDEX, PREREGLAGES, construireCustom, exporterChoix, importerChoix, severite } from "/shared/custom.js";
import { CLASSEMENTS, COMMUN, CONFORT, PROG_CFG, TREES, codexClefs, cadresDe, cadreActifDe, confortDesc, confortNom, lignesVerrouillees, ligneNom, metaActives, metaCharge, metaPoids, slotsFor, tierCost, vueStats } from "/shared/progression.js";
import { armeAt, armeContrainte, armeFiche, armeNom, armeResume } from "/shared/armes.js";
import { CADRES, HAUTS_FAITS, HF_NIVEAUX, cadreNom, hfNiveauLabel, hfNom, hfProgres, hfTexte, rewardLabel } from "/shared/hauts_faits.js";
import { appliquerCadre } from "./cadres.js";
import { RELICS, relicById, relicDesc, relicNom, relicPrice, relicContrepartie, relicRarityLabel } from "/shared/reliques.js";
import { TL_CFG, segmentName } from "/shared/timeline.js";
import { SPRITE_CELL, drawSprite, frameOf } from "/sprites.js";
import { customChoix, setCustomChoix, traceOn, tracePar, rapportTexte, GFX_KEYS, GFX_ULTRA, INTERP_MS, PERF, PHASE_LOBBY, PHASE_ROUND, ROMAN, SECOUSSE_FACTEURS, amSpectator, bilanOpen, finOpen, setFinOpen, cardsPending, cardsState, cardsTimerHandle, connected, difficulty, hostId, inRoom, joinAttempt, keys, lastResult, lobby, merchantState, merchantTimerHandle, merchantWait, metaClsOverride, myId, myPseudo, myVote, ownedCounts, pendingRejoin, phase, progressState, roomNameCur, roomsList, roundHistory, setBilanOpen, setCardsPending, setCardsState, setCardsTimerHandle, setJoinAttempt, setMerchantState, setMerchantTimerHandle, setGfx, setMerchantWait, setMetaClsOverride, setMyVote, setPendingRejoin, setSecousse, secousse, gfx, tally, ws } from "../core/state.js";
import { netPerf } from "../net/interp.js";
import { fmtTime, portraitBoss } from "../render/boss.js";
import { deaths } from "../render/fx.js";
import { lieuxCourants, biomeIndex, nameOf } from "../render/stage.js";
import { closeBuild, openBuild } from "./build.js";
import { customBox, customJauge, customPresets, customList, customCode, customImport, customExport, customMsg, bilanRapport, bilanRapportTexte, bilanRapportCopy, traceCheck, traceHint, bilanEl, bilanGo, finEl, finGo, finKicker, finStats, finTitle, bilanFait, bilanHurt, bilanKicker, bilanLeaveBtn, bilanPerf, bilanScoresBody, bilanStats, bilanTitle, briefBarFill, briefCountEl, briefEl, briefGoBtn, briefLeftEl, briefMissionTextEl, briefNameEl, briefSkillsEl, briefThirdEl, briefArmeRowEl, briefArmeRerollBtn, buildEl, cardsEl, cardsRow, cardsTimerEl, cardsTimerFill, cardsTitle, cardsWaitEl, classHint, classRow, enSaisie, escapeHtml, fmtBig, gate, historyListEl, hubBoardBtn, hubBoardEl, hubBoardList, hubBoardTabs, hubLogoutBtn, hubPassAskCancelBtn, hubPassAskEl, hubPassAskGoBtn, hubPassAskInput, hubPassBoxEl, hubPassToggleBtn, hubRefreshBtn, hubResumeEl, hubResumeGoBtn, hubResumeIconEl, hubResumeStayBtn, hubResumeSubEl, hubResumeTitleEl, hubScreenEl, codexBossEl, codexBtn, codexCartesEl, codexReliquesEl, codexCloseBtn, codexCompteEl, codexEl, codexHordeEl, hautsFaitsBtn, hautsFaitsCloseBtn, hautsFaitsEl, hubStatusEl, hubWhoEl, hudBriefEl, launchSummaryEl, loadingEl, menuCloseBtn, menuEl, menuTitleEl, merchantEl, merchantRow, merchantTimerEl, merchantTimerFill, merchantTitle, merchantWaitEl, metaClassTabsEl, metaConfortEl, metaCoresEl, metaEl, metaCadresEl, metaHfEl, metaSlotsEl, metaSubEl, metaTreeEl, muteBtn, panel, panelKicker, panelLeaveBtn, panelTitle, passChangeBtn, passMsgEl, passNewInput, passOldInput, pauseEl, readyBtn, roomCreateBtn, roomListEl, roomNameInput, roomPassInput, scoresBody, settingsCloseBtn, settingsEl, startBtn, summary, teamListEl, teamReadyEl, topAvatarEl, topCrumbEl, topHomeBtn, topNameEl, topPingEl, topPingValEl, setLangRowEl, topLangBtn, gateLangRowEl, traduireStatique,
topSettingsBtn, topbarEl, updateVersion, volInput, volVal, voteHint, voteRow, waitMsg } from "./dom.js";


export function hubStatus(msg, isError = false) {
  hubStatusEl.textContent = msg;
  hubStatusEl.classList.toggle("err", isError);
}
export let myPing = -1;
export let settingsFrom = null;
/* LES NEUF ENDROITS OU S'ENREGISTRE UN ECRAN, EN UNE SEULE TABLE. Un oubli ne
   levait rien : `#hautsFaits` n'en tenait qu'un — le fil d'Ariane — donc il
   disparaissait d'un coup au lieu de sortir, ses quatorze controles etaient
   muets et il prenait la fleche du systeme.

   Quatre des neuf ne se declarent plus deux fois, ils se DERIVENT d'ici :
   l'observateur, le masquage de la barre, et les deux selecteurs de son. Les
   quatre qui vivent en CSS — entree, sortie, balayage, curseur — y restent, et
   `verifierEcrans(css)` les croise avec cette table dans les deux sens.

   L'ORDRE EST CELUI DU FIL D'ARIANE : `syncTopbar` prend le premier ecran
   visible qui porte un `fil`, donc l'ordre de ces lignes est une priorite.

   `son` a deux valeurs : `survol` sonne au survol ET a l'appui, `appui` ne
   sonne qu'a l'appui — c'est le regime des ecrans poses sur une manche qui
   tourne, qui gardent le reticule et n'ont donc pas de crochet a montrer. */
const ECRANS = [
  { id: "settings",   el: () => settingsEl,   observe: 1, entre: 1, sort: 1, balaye: 1,
    curseur: 1, son: "survol",
    /* Le SEUL ecran dont le parent varie : il s ouvre depuis le hub, un salon, un
       bilan ou la progression. `settingsFrom` retient deja le noeud d ou on
       vient — on le RELIT au lieu d en tenir une seconde copie qui divergerait. */
    parent: () => ECRANS.find(e => e.el() === settingsFrom)?.id ?? null,
    fil: () => t("ui.set.title", "Paramètres") },
  { id: "hautsFaits", el: () => hautsFaitsEl, observe: 1, entre: 1, sort: 1, balaye: 1,
    curseur: 1, son: "survol",
    parent: () => "panel",
    fil: () => t("ui.hf.title", "Hauts faits") },
  { id: "codex",      el: () => codexEl,      observe: 1, entre: 1, sort: 1, balaye: 1,
    curseur: 1, son: "survol",
    parent: () => "panel",
    fil: () => t("ui.codex.title", "Codex") },
  { id: "menu",       el: () => menuEl,       observe: 1, entre: 1, sort: 1, balaye: 1,
    curseur: 1, son: "survol",
    parent: () => "panel",
    fil: () => tf("ui.crumb.meta", "Progression · {cls}",
      { cls: classNom(classAt(metaClsOverride ?? CLASS_DEFAULT)) }) },
  { id: "bilan",      el: () => bilanEl,      observe: 1, entre: 1, sort: 1, balaye: 1,
    curseur: 1, son: "survol",
    fil: () => t("ui.crumb.bilan", "Bilan de manche") },
  { id: "panel",      el: () => panel,        observe: 1, entre: 1, sort: 1, balaye: 1,
    curseur: 1, son: "survol",
    parent: () => "hubScreen",
    fil: () => roomNameCur
      ? tf("ui.crumb.salon.nom", "Salon · {nom}", { nom: roomNameCur })
      : t("ui.crumb.salon", "Salon") },
  { id: "hubScreen",  el: () => hubScreenEl,  observe: 1, entre: 1, sort: 1, balaye: 1,
    curseur: 1, son: "survol",
    fil: () => t("ui.hub.title", "Salons") },

  { id: "gate",     el: () => gate,       observe: 1, masque: 1, entre: 1, sort: 1,
    balaye: 1, curseur: 1, son: "survol" },
  { id: "loading",  el: () => loadingEl,  observe: 1, masque: 1, sort: 1, curseur: 1 },
  { id: "fin",      el: () => finEl,      observe: 1, masque: 1, entre: 1, sort: 1,
    curseur: 1, son: "survol" },
  { id: "brief",    el: () => briefEl,    observe: 1, masque: 1, entre: 1, sort: 1,
    son: "appui" },
  { id: "cards",    el: () => cardsEl,    observe: 1, masque: 1, son: "appui" },
  { id: "merchant", el: () => merchantEl, masque: 1, son: "appui" },
  { id: "build",    el: () => buildEl,    son: "appui" },
  { id: "pause",    el: () => pauseEl,    observe: 1, entre: 1, sort: 1, curseur: 1,
    son: "survol" },
  /* La barre n'est pas un ecran : elle n'a ni entree ni sortie, mais elle porte
     des boutons, donc elle est dans les deux listes qui en decoulent. */
  { id: "topbar",   el: () => topbarEl,   curseur: 1, son: "survol" },
];
const TOPBAR_SCREENS = ECRANS.filter(e => e.fil);
const MASQUE_SCREENS = ECRANS.filter(e => e.masque);
/* UN FIL D ARIANE QUI NE MONTRE QUE LA FEUILLE N EN EST PAS UN. Il affichait
   `vue.fil()` — une seule etiquette —, donc ouvrir le Codex depuis un salon
   disait « Codex » et perdait le fait qu on etait dans une salle. La question
   que cette barre doit repondre n est pas « quel ecran » mais « OU SUIS-JE »,
   et les deux ne se confondent qu au premier niveau.

   `parent` est une FONCTION et non une chaine, parce que le chemin d un ecran
   n est pas toujours le meme : les Parametres s ouvrent depuis le hub, un
   salon, un bilan ou l ecran de progression, et `settingsFrom` sait deja
   lequel — on le lit au lieu d en tenir une seconde copie.

   La remontee est BORNEE : un parent mal declare qui pointerait vers lui-meme
   ferait une boucle infinie dans la barre de titre, ce qui gele la page sans
   lever la moindre erreur. `verifierFil()` refuse le cycle, la borne le rattrape
   quand meme. */
/* LE SEPARATEUR DE NIVEAU N EST PAS CELUI DES ETIQUETTES. Le point median sert
   deja DANS un libelle — « Salon · Nuit », « Progression · Tireur » — donc
   l employer aussi entre les niveaux rendait « Salons · Salon · Nuit · Codex »,
   quatre items plats au lieu de trois niveaux. Le chevron dit la DESCENTE, le
   point median QUALIFIE : deux roles, deux signes. */
const FIL_SEP = " › ";
const FIL_MAX = 4;
function filChemin(vue) {
  const parts = [];
  let cur = vue, garde = 0;
  while (cur && garde++ < FIL_MAX) {
    parts.unshift(cur.fil());
    const pid = cur.parent ? cur.parent() : null;
    cur = pid ? ECRANS.find(e => e.id === pid) : null;
  }
  return parts.join(FIL_SEP);
}

/* Un `parent` qui nomme un ecran inexistant coupe le chemin en silence, et un
   cycle gele la barre. Ni l un ni l autre ne leve quoi que ce soit. */
export function verifierFil() {
  const soucis = [];
  const ids = new Set(ECRANS.map(e => e.id));
  for (const e of ECRANS) {
    if (!e.parent) continue;
    if (!e.fil) { soucis.push(`${e.id} : declare un parent sans porter de fil`); continue; }
    const vus = new Set([e.id]);
    let cur = e, n = 0;
    while (cur && n++ <= FIL_MAX) {
      const pid = cur.parent ? cur.parent() : null;
      if (!pid) break;
      if (!ids.has(pid)) { soucis.push(`${cur.id} : parent « ${pid} » inconnu`); break; }
      if (vus.has(pid)) { soucis.push(`${cur.id} : cycle de parent sur « ${pid} »`); break; }
      vus.add(pid);
      cur = ECRANS.find(x => x.id === pid);
      if (cur && !cur.fil) { soucis.push(`${cur.id} : parent d un ecran, sans fil`); break; }
    }
    if (n > FIL_MAX) soucis.push(`${e.id} : chemin plus long que ${FIL_MAX}`);
  }
  return soucis;
}

function syncTopbar() {
  if (!topbarEl) return;

  const masque = MASQUE_SCREENS.some(s => { const e = s.el(); return e && !e.hidden; });

  const vue = masque ? null : TOPBAR_SCREENS.find(s => { const e = s.el(); return e && !e.hidden; });
  topbarEl.hidden = !vue;
  if (!vue) return;

  topCrumbEl.textContent = filChemin(vue);

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
  for (const s of ECRANS) {
    const el = s.observe && s.el();
    if (el) {
      obs.observe(el, { attributes: true, attributeFilter: ["hidden"], attributeOldValue: true });
    }
  }

  const etouffants = [cardsEl, merchantEl, pauseEl, buildEl].filter(Boolean);
  const syncDuck = () => setMusicDuck(etouffants.some(el => !el.hidden));
  const obsDuck = new MutationObserver(syncDuck);
  for (const el of etouffants) {
    obsDuck.observe(el, { attributes: true, attributeFilter: ["hidden"] });
  }
  syncDuck();
}
/* Miroir de la regle `--cursor-go` de `menus.css` : ce qui montre le crochet
   sonne au survol, ce qui ne le montre pas est muet. Les deux selecteurs se
   DERIVENT d'`ECRANS` — c'est la moitie JS du miroir ; la moitie CSS y reste, et
   `verifierEcrans(css)` refuse qu'elles divergent. */
const listeSel = (f) => ECRANS.filter(f).map(s => "#" + s.id).join(", ");
const UI_SOUND_SCREENS = listeSel(s => s.son === "survol");
const UI_SOUND_TARGETS = 'button, a, summary, tr.clickable, input[type="range"]';
const UI_CLICK_SCREENS = `${UI_SOUND_SCREENS}, ${listeSel(s => s.son === "appui")}`;

/* CRITERE REJOUABLE. Muet = aucun ecran n'est enregistre a moitie. La feuille
   arrive en ARGUMENT, comme `verifierPrises(BOSS_SKIN)` : ce module ne lit pas
   un fichier, et le controle se joue en script jetable aussi bien qu'a la
   console. Les quatre points derives ne peuvent plus diverger ; restent les
   quatre qui vivent en CSS, et c'est exactement ceux-la qu'on croise ici — dans
   les DEUX sens, comme `verifierDangers` : un ecran declare et absent de la
   regle, et un identifiant dans la regle que la table ne declare pas. */
const REGLES_CSS = [
  { champ: "entre",   corps: "animation: fadeIn" },
  { champ: "sort",    selecteur: "[hidden].leaving" },
  { champ: "balaye",  corps: "animation: rasterSweep" },
  { champ: "curseur", corps: "cursor: var(--cursor-ui), default" },
  /* LE MIROIR DEVIENT EXECUTABLE. « Ce qui montre le crochet est exactement ce
     qui sonne au survol » etait une duplication assumee des deux cotes ; c est
     maintenant un croisement. */
  { champ: "crochet", corps: "cursor: var(--cursor-go), pointer",
    test: s => s.son === "survol" },
];
function selecteurAvant(css, i) {
  const ouvre = css.lastIndexOf("{", i);
  if (ouvre < 0) return "";
  const fin = Math.max(css.lastIndexOf("}", ouvre), css.lastIndexOf("*/", ouvre));
  return css.slice(fin + 1, ouvre);
}
function idsDeRegle(css, { corps, selecteur }) {
  const marque = corps ?? selecteur;
  const vus = new Set();
  for (let i = css.indexOf(marque); i >= 0; i = css.indexOf(marque, i + marque.length)) {
    const sel = corps ? selecteurAvant(css, i) : selecteurAvant(css, css.indexOf("{", i));
    for (const m of sel.matchAll(/#([A-Za-z][\w-]*)/g)) vus.add(m[1]);
  }
  return vus;
}
export function verifierEcrans(css = "") {
  const soucis = [];
  for (const s of ECRANS) {
    if (!s.el()) soucis.push(`${s.id} : aucun noeud`);
  }
  const connus = new Set(ECRANS.map(s => s.id));
  for (const r of REGLES_CSS) {
    const vus = idsDeRegle(css, r);
    if (!vus.size) { soucis.push(`regle « ${r.champ} » introuvable dans la feuille`); continue; }
    const veut = r.test ?? (s => !!s[r.champ]);
    for (const s of ECRANS) {
      if (veut(s) && !vus.has(s.id)) soucis.push(`${s.id} : declare « ${r.champ} », absent de la regle`);
      if (!veut(s) && vus.has(s.id)) soucis.push(`${s.id} : dans la regle « ${r.champ} », non declare`);
    }
    for (const id of vus) {
      if (!connus.has(id)) soucis.push(`${id} : dans la regle « ${r.champ} », inconnu de la table`);
    }
  }
  return soucis;
}
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
/* UN ENGAGEMENT N EST PAS UN CHOIX, et les trois degres de la famille existent
   deja : inflexion pour un choix, deux notes pour un engagement, accord resolu
   pour le depart. Acheter une relique depense des eclats et ferme la visite,
   choisir une arme verrouille la manche, fermer le briefing lance la vague :
   les trois prennent la deuxieme marche. Une carte parmi trois reste une
   inflexion — elle ne coute rien et l ecran ne se referme pas sur elle. */
function uiSoundFor(el) {
  if (el.id === "start") return el.classList.contains("cancel") ? "pretAnnule" : "lancer";
  if (el.id === "readyBtn") return el.classList.contains("on") ? "pretAnnule" : "pret";
  if (el.id === "briefGo") return "pret";
  if (el.classList.contains("armeOpt")) return "pret";
  if (el.classList.contains("cardOpt") && el.closest("#merchantRow")) return "pret";
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
      && !confirm(t("ui.confirm.leaveRunning",
        "Une manche est en cours. Quitter la salle et revenir aux salons ?"))) {
    return;
  }
  if (settingsEl && !settingsEl.hidden) { settingsEl.hidden = true; settingsFrom = null; }
  if (menuEl && !menuEl.hidden) menuEl.hidden = true;
  if (hautsFaitsEl && !hautsFaitsEl.hidden) hautsFaitsEl.hidden = true;
  closeBuild();
  if (!inRoom) { enterHub(); syncTopbar(); return; }
  ws.send(JSON.stringify({ t: "leaveRoom" }));
}
topHomeBtn.onclick = goHome;
function openSettings() {
  if (!settingsEl) return;
  settingsFrom = [hubScreenEl, panel, bilanEl, menuEl,
    hautsFaitsEl].find(e => e && !e.hidden) ?? null;
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

/* Le nom d'une langue s'ecrit dans cette langue : ni « Anglais » ni « French ».
   Les deux boutons ne portent donc aucune cle de traduction. */
function remplirLangRow(row) {
  if (!row) return;
  if (!row.children.length) {
    for (const code of LANGS) {
      const b = document.createElement("button");
      b.className = "langBtn";
      b.dataset.lang = code;
      b.textContent = LANG_NOM[code];
      b.onclick = () => setLang(code);
      row.append(b);
    }
  }
  for (const b of row.children) b.classList.toggle("on", b.dataset.lang === getLang());
}
/* La barre superieure est masquee sur `#gate` : sans cette troisieme entree, on
   ne pourrait changer de langue qu'une fois connecte. */
function renderLangue() {
  if (topLangBtn) topLangBtn.textContent = getLang().toUpperCase();
  remplirLangRow(setLangRowEl);
  remplirLangRow(gateLangRowEl);
}
if (topLangBtn) {
  topLangBtn.onclick = () => setLang(LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length]);
}
/* Chaque module se rafraichit lui-meme (`onLangChange` dans `hud.js`,
   `ui/pause.js`, `ui/build.js`) : la couche qui possede un ecran est la seule a
   savoir le reconstruire. Ici, les ecrans de `screens.js` et rien d'autre. */
onLangChange(() => {
  traduireStatique();
  renderLangue();
  refreshAudioUi();
  refreshImageUi();
  syncTopbar();
  if (hubScreenEl && !hubScreenEl.hidden) { renderRooms(); renderResume(); renderBoard(); }
  if (panel && !panel.hidden) refreshPanel();
  if (menuEl && !menuEl.hidden) renderMeta();
  renderHautsFaits();
  if (finEl && !finEl.hidden && lastResult) openFin(lastResult);
  if (bilanEl && !bilanEl.hidden && lastResult) showBilan(lastResult);
  if (cardsEl && !cardsEl.hidden) renderCards();
  if (merchantEl && !merchantEl.hidden) renderMerchant();
  renderBriefWait();
});
traduireStatique();
renderLangue();
export function enterHub() {
  if (!connected || inRoom) return;
  hubScreenEl.hidden = false;
  hubPassAskEl.hidden = true;
  hubPassAskInput.value = "";
  if (hubBoardEl) hubBoardEl.hidden = true;
  hubWhoEl.textContent = "";
  hubWhoEl.append(t("ui.hub.who", "Connecté comme "),
    document.createElement("b"));
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
    ? tf("ui.hub.resume.running", "Une manche tourne encore dans « {nom} »", { nom: salle.name })
    : tf("ui.hub.resume.open", "Ta salle « {nom} » est toujours ouverte", { nom: salle.name });

  const ou = salle.state === 1
    ? tf("ui.hub.resume.step", "Étape {n}/6 en cours", { n: Math.max(1, salle.segment || 0) })
    : t("ui.hub.resume.lobby", "Au salon");
  const qui = salle.count > 0
    ? tn("ui.hub.resume.count", "{n} joueur présent", "{n} joueurs présents", salle.count)
    : t("ui.hub.resume.nobody", "personne pour l'instant");
  hubResumeSubEl.textContent = tf("ui.hub.resume.sub",
    "{ou} · {qui} · tu reprends ta place", { ou, qui });
}
function answerResume(reprendre) {
  const salle = pendingRejoin;
  setPendingRejoin(null);
  if (hubResumeEl) hubResumeEl.hidden = true;
  if (!reprendre || !salle) return;
  hubStatus(tf("ui.hub.backTo", "Retour vers « {nom} »…", { nom: salle.name }));
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
    empty.textContent = t("ui.hub.empty", "Aucune salle ouverte — crée la première.");
    roomListEl.appendChild(empty);
    return;
  }
  for (const r of roomsList) {
    const full = r.count >= r.max;
    const btn = document.createElement("button");
    btn.className = "roomEntry";
    btn.disabled = full;
    const lock = r.locked && r.state === 1
      ? `<span class="roomLock" title="${escapeHtml(
          t("ui.hub.room.locked", "protégée par mot de passe"))}">${LOCK_SVG}</span>` : "";
    const etiquette = r.state === 1 ? t("ui.hub.room.running", "En jeu")
      : full ? t("ui.hub.room.full", "Complète")
      : t("ui.hub.room.open", "Ouvert");
    const state = `<span class="roomState${r.state === 1 ? " running" : ""}">`
      + `${escapeHtml(etiquette)}</span>`;
    const slots = `<span class="roomSlots" data-n="${r.count}">`
      + "<i></i>".repeat(r.max) + "</span>";
    btn.innerHTML = `<span class="roomName"><span class="roomSub"></span></span>`
      + `${lock}${state}${slots}`
      + `<span class="roomCount">${r.count} / ${r.max}</span>`;
    const nameEl = btn.querySelector(".roomName");
    nameEl.insertBefore(document.createTextNode(r.name), nameEl.firstChild);
    const mode = diffLabel(r.diff);
    const etat = r.state === 1
      ? tf("ui.hub.room.step", "étape {n}/6 en cours", { n: Math.max(1, r.segment || 0) })
      : r.locked ? t("ui.hub.room.locked", "protégée par mot de passe")
      : t("ui.hub.room.waiting", "en attente de joueurs");
    btn.querySelector(".roomSub").textContent = `${mode} · ${etat}`;
    btn.onclick = () => {
      setJoinAttempt({ code: r.code, name: r.name });
      hubPassAskEl.hidden = true;
      hubStatus(tf("ui.hub.entering", "entrée dans « {nom} »…", { nom: r.name }));
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
/* UN CLASSEMENT PAR EFFECTIF, parce qu'un temps solo et un temps a quatre ne se
   comparent pas. Les quatre sections vivent sur le meme ecran : une manche a
   quatre n'a plus a chasser un record solo pour exister.
   ET TROIS TABLEAUX SUR LA MEME MANCHE : le temps est une grandeur d EQUIPE (une
   manche, une ligne, quatre pseudos), les kills et les degats des grandeurs de
   JOUEUR (quatre lignes). Le regroupement appartient au premier et a lui seul. */
const EFFECTIF_NOM = ["", "Solo", "Duo", "Trio", "Quatuor"];
export const effectifNom = n => t(`ui.hub.board.n${n}`, EFFECTIF_NOM[n] ?? `${n} joueurs`);

const BOARD_NOM = { temps: "Temps", kills: "Éliminations", degats: "Dégâts" };
const boardNom = m => t(`ui.hub.board.mode.${m}`, BOARD_NOM[m] ?? m);
let boardMode = "temps";

export function renderBoard() {
  hubBoardTabs.innerHTML = "";
  DIFFICULTIES.forEach((d, i) => {
    if (d.custom) return;
    const b = document.createElement("button");
    b.textContent = diffLabel(i);
    b.className = i === boardDiff ? "" : "ghost";
    b.onclick = () => { boardDiff = i; renderBoard(); };
    hubBoardTabs.appendChild(b);
  });
  const sep = document.createElement("span");
  sep.className = "boardSep";
  hubBoardTabs.appendChild(sep);
  for (const m of CLASSEMENTS) {
    const b = document.createElement("button");
    b.textContent = boardNom(m);
    b.className = m === boardMode ? "" : "ghost";
    b.onclick = () => { boardMode = m; renderBoard(); };
    hubBoardTabs.appendChild(b);
  }

  if (!boardData) { hubBoardList.textContent = t("ui.hub.board.loading", "chargement…"); return; }
  const parEffectif = (boardData[boardMode] ?? [])[boardDiff] ?? {};
  const effectifs = Object.keys(parEffectif)
    .map(Number).filter(n => (parEffectif[n] ?? []).length > 0).sort((a, b) => a - b);
  if (effectifs.length === 0) {
    hubBoardList.innerHTML =
      `<div class="hint">${escapeHtml(t("ui.hub.board.empty",
        "personne n'a encore vaincu le Noyau à cette difficulté"))}</div>`;
    return;
  }
  const valeur = l => boardMode === "temps" ? fmtTime(l.time)
    : boardMode === "kills" ? tf("ui.hub.board.kills", "{n} corps", { n: l.valeur | 0 })
    : tf("ui.hub.board.degats", "{n} dgts", { n: Math.round(l.valeur | 0).toLocaleString() });
  hubBoardList.innerHTML = effectifs.map(n =>
    `<div class="boardSection">${escapeHtml(effectifNom(n))}</div>` +
    (parEffectif[n] ?? []).map((l, i) => {
      const moi = (l.pseudos ?? []).includes(myPseudo);
      return `<div class="boardRow${moi ? " moi" : ""}">` +
        `<span class="boardRank">${i + 1}</span>` +
        `<span class="boardWho">${escapeHtml((l.pseudos ?? []).join(" / "))}</span>` +
        // le niveau et le lieu etaient STOCKES et jetes a l'affichage : un temps
        // sans contexte ne dit pas a quel prix il a ete fait. Hors du tableau des
        // temps, le temps de la manche REJOINT ce contexte.
        `<span class="boardMeta">${escapeHtml(tf("ui.hub.board.meta",
          "niv. {n} · {lieu}", { n: l.level | 0, lieu: biomeNom(l.biome | 0) })
          + (boardMode === "temps" ? "" : ` · ${fmtTime(l.time)}`))}</span>` +
        `<span class="boardTime">${escapeHtml(valeur(l))}</span>` +
      `</div>`;
    }).join("")).join("");
}
hubPassAskGoBtn.onclick = () => {
  if (!connected || inRoom || !joinAttempt) return;
  hubStatus(tf("ui.hub.entering", "entrée dans « {nom} »…", { nom: joinAttempt.name }));
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
  hubStatus(t("ui.hub.creating", "création…"));
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
  if (neuf.length < 8) {
    passMsg(t("ui.hub.pass.short", "nouveau mot de passe : 8 caractères minimum"), true);
    return;
  }
  ws.send(JSON.stringify({ t: "changePass", ancien, neuf }));
};
function openMenuFor(clsIndex) {
  panel.hidden = true;
  menuEl.hidden = false;
  renderMeta(clsIndex);
}

/* HAUTS FAITS : page dediee, hors du Terminal. L'entree est le bouton or
   sous la categorie Classe du salon ; le retour est le salon. */
function openHautsFaits() {
  panel.hidden = true;
  hautsFaitsEl.hidden = false;
  renderHautsFaits();
  syncTopbar();
}

hautsFaitsBtn.onclick = openHautsFaits;
hautsFaitsCloseBtn.onclick = () => {
  hautsFaitsEl.hidden = true;
  refreshPanel();
  syncTopbar();
};

export function renderHautsFaits() {
  if (!hautsFaitsEl || hautsFaitsEl.hidden) return;
  if (!progressState) return;
  renderHauts(progressState);
  renderCadres(progressState);
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
/* IMAGE ET CONFORT, DANS LES DEUX VUES OU ON LES CHERCHE. Le palier de qualite
   n'avait qu'un appelant, le menu de pause — donc joignable seulement une manche
   en cours, alors que « Parametres » annonce « les reglages de cette machine » et
   porte deja la langue, l'audio et les controles. Et le tressaillement n'avait
   aucun reglage : `prefers-reduced-motion` est lu par `menus.css` et n'atteint
   pas un `transform` ecrit par JS.
   Meme forme qu'`audioUi` : une liste de vues, un rendu, un setter. Les deux
   boutons de la pause sont ici pour la meme raison que ses trois rangees de son
   — c'est cette couche qui tient ce qui existe a plusieurs endroits. */
const GFX_NOM = ["basse", "moyenne", "élevée", "ultra"];
const SHAKE_NOM = ["coupé", "réduit", "complet"];
const imageUi = [
  { gfx: document.getElementById("setGfx"), gfxVal: document.getElementById("setGfxVal"),
    shake: document.getElementById("setShake"),
    shakeVal: document.getElementById("setShakeVal") },
  { gfx: document.getElementById("pauseGfx"), shake: document.getElementById("pauseShake"),
    long: true },
].filter(u => u.gfx);
function refreshImageUi() {
  const q = t(`ui.pause.gfx.${GFX_KEYS[gfx]}`, GFX_NOM[gfx]);
  const s = t(`ui.image.shake.${secousse}`, SHAKE_NOM[secousse]);
  for (const u of imageUi) {
    u.gfx.textContent = u.long
      ? tf("ui.pause.gfx", "Qualité graphique : {n}", { n: q }) : q;
    u.gfx.classList.toggle("on", gfx > 0);
    if (u.gfxVal) u.gfxVal.textContent = q;
    u.shake.textContent = u.long
      ? tf("ui.pause.shake", "Tressaillement : {n}", { n: s }) : s;
    u.shake.classList.toggle("on", secousse > 0);
    if (u.shakeVal) u.shakeVal.textContent = s;
  }
}
for (const u of imageUi) {
  u.gfx.onclick = () => { setGfx((gfx + 1) % (GFX_ULTRA + 1)); refreshImageUi(); };
  u.shake.onclick = () => {
    setSecousse((secousse + 1) % SECOUSSE_FACTEURS.length);
    refreshImageUi();
  };
}
refreshImageUi();

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
      u.mute.title = isMuted()
        ? t("ui.audio.unmute.title", "rétablir le son")
        : t("ui.audio.mute.title", "couper le son");
    }
    if (u.mus) {
      u.mus.value = String(mus);
      u.musVal.textContent = `${mus} %`;
    }
    if (u.src) {
      u.src.textContent = u.srcVal
        ? (pistes ? t("ui.audio.src.pistes", "Pistes") : t("ui.audio.src.synthe", "Synthé"))
        : (pistes ? t("ui.audio.src.longPistes", "Bande son : pistes")
                  : t("ui.audio.src.longSynthe", "Bande son : synthé"));
      u.src.classList.toggle("on", pistes);
      if (u.srcVal) {
        u.srcVal.textContent = pistes
          ? t("ui.audio.src.fichiers", "fichiers")
          : t("ui.audio.src.calculee", "calculée");
      }
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
/* Derniere seconde ANNONCEE. Le tick ne part pas a chaque passage de
   `renderLaunch` — la fonction tourne cinq fois par seconde, et elle est aussi
   rappelee par `refreshPanel` a chaque diffusion du salon. Il part quand le
   chiffre AFFICHE change, donc exactement une fois par seconde. */
let launchLastSec = 0;
function launchPending() { return launchEndsAt > performance.now(); }
export function renderLaunch() {
  if (!startBtn) return;

  if (launchEndsAt === 0) {
    clearInterval(launchTimer);
    launchTimer = 0;
    launchLastSec = 0;
    startBtn.textContent = t("ui.panel.start", "Lancer la manche");
    startBtn.classList.remove("cancel");
    return;
  }

  if (!launchPending()) {
    clearInterval(launchTimer);
    launchTimer = 0;
    launchLastSec = 0;
    startBtn.disabled = true;
    startBtn.classList.remove("cancel");
    startBtn.textContent = t("ui.panel.starting", "Lancement…");
    return;
  }

  startBtn.hidden = false;
  startBtn.disabled = false;
  startBtn.classList.add("cancel");
  const reste = Math.max(0, Math.ceil((launchEndsAt - performance.now()) / 1000));
  /* Un tick par seconde ecoulee, et AUCUN sur la premiere valeur affichee : le
     clic vient de rendre `lancer`, un tick colle dessus ferait deux sons pour un
     seul evenement. On n'annonce donc que les secondes qui TOMBENT — 3 → 2,
     2 → 1 — et le souffle de `lancement` conclut a l'echeance. */
  if (launchLastSec && reste && reste < launchLastSec) playSound("tick");
  launchLastSec = reste;
  startBtn.textContent = tf("ui.panel.cancel", "Annuler le lancement — {n} s", { n: reste });
  waitMsg.textContent = t("ui.panel.starting.msg",
    "La manche démarre. Un clic pour tout arrêter.");

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
/* L'offre d'arme est POUSSEE par le serveur (message `armes`), pas deduite : le
   verrou de haut fait vit au profil, et le profil ne voyage pas. */
let armeEtat = null;
export function setArmeEtat(v) { armeEtat = v; renderArmes(); }

export function renderArmes() {
  if (!briefArmeRowEl) return;
  const on = !!armeEtat && (armeEtat.offres ?? []).length > 1;
  briefArmeRowEl.parentElement.hidden = !on;
  if (!on) return;

  briefArmeRowEl.innerHTML = "";
  for (const id of armeEtat.offres) {
    const a = armeAt(id);
    const f = armeFiche(id);
    const b = document.createElement("button");
    b.className = "armeOpt" + (id === armeEtat.choisie ? " mine" : "");
    b.innerHTML =
      `<span class="armeNom">${escapeHtml(armeNom(id))}</span>`
      + `<span class="armeDit">${escapeHtml(armeResume(id))}</span>`
      + `<span class="armeChiffres">${escapeHtml(f.cadence)} · ${escapeHtml(f.degats)}`
      + ` · ${escapeHtml(f.dps)} · ${escapeHtml(f.portee)}</span>`
      + (a.contrainte
          ? `<span class="armeCout">${escapeHtml(armeContrainte(id))}</span>` : "");
    b.onclick = () => ws.send(JSON.stringify({ t: "chooseArme", id }));
    briefArmeRowEl.appendChild(b);
  }
  briefArmeRerollBtn.hidden = (armeEtat.relances ?? 0) <= 0;
  briefArmeRerollBtn.textContent = tn("ui.brief.arme.relance",
    "Relancer ({n} restante)", "Relancer ({n} restantes)", armeEtat.relances ?? 0);
}
if (briefArmeRerollBtn) {
  briefArmeRerollBtn.onclick = () => ws.send(JSON.stringify({ t: "rerollArme" }));
}

export function openBrief(dur) {
  if (!briefEl) return;
  renderArmes();
  const me = lobby.find(l => l.id === myId);
  const c = classAt(me?.cls ?? CLASS_DEFAULT);

  briefEl.querySelector(".briefWrap").style.setProperty("--tint", c.couleur);
  briefNameEl.textContent = classNom(c);
  briefMissionTextEl.textContent = classMission(c);

  briefSkillsEl.textContent = "";
  for (let si = 0; si < c.skills.length; si++) {
    const s = c.skills[si];
    const card = document.createElement("div");
    card.className = "briefSkill";

    const keys = document.createElement("div");
    keys.className = "briefKeys";
    const parts = String(s.touche).split("/");
    parts.forEach((k, i) => {
      if (i > 0) {
        const ou = document.createElement("span");
        ou.className = "briefOr";
        ou.textContent = t("ui.brief.or", "ou");
        keys.appendChild(ou);
      }
      const cap = document.createElement("span");
      cap.className = "briefKey";
      cap.textContent = k;
      keys.appendChild(cap);
    });

    const nom = document.createElement("div");
    nom.className = "briefSkillName";
    nom.textContent = skillNom(c, si);

    const desc = document.createElement("div");
    desc.className = "briefSkillDesc";
    desc.textContent = skillDesc(c, si);

    card.append(keys, nom, desc);
    briefSkillsEl.appendChild(card);
  }

  const nom3 = skill3Nom(c.id);
  briefThirdEl.textContent = "";
  briefThirdEl.hidden = !nom3;
  if (nom3) {
    const keys = document.createElement("span");
    keys.className = "briefKeys";
    ["3", "R"].forEach((k, i) => {
      if (i > 0) {
        const ou = document.createElement("span");
        ou.className = "briefOr";
        ou.textContent = t("ui.brief.or", "ou");
        keys.appendChild(ou);
      }
      const cap = document.createElement("span");
      cap.className = "briefKey small";
      cap.textContent = k;
      keys.appendChild(cap);
    });
    const txt = document.createElement("span");
    txt.className = "briefThirdText";
    txt.innerHTML = `<b>${escapeHtml(nom3)}</b> — ${escapeHtml(t("ui.brief.third",
      "troisième compétence, une carte peut te l'accorder en cours de partie"))}`;
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
    ? briefWaiting.map(escapeHtml).map(n => `<b>${n}</b>`)
        .join(` ${escapeHtml(t("ui.and", "et"))} `)
    : `<b>${tf("ui.nPlayers", "{n} joueurs", { n: briefWaiting.length })}</b>`;
  const reste = Math.max(0, Math.ceil((briefEndsAt - performance.now()) / 1000));
  hudBriefEl.innerHTML = tf("ui.hud.briefWait",
    "En attente de {qui} — briefing <i>{n} s</i>", { qui, n: reste });
}

/* LA MESURE S'ARME AU SALON, ET TOUT LE MONDE LA VOIT. Elle vivait dans l'URL —
   « aucun clic, et surtout pas un menu ou on l'oublierait armee ». L'objection
   etait juste, la reponse ne l'etait pas : une URL ne se voit pas non plus, pas
   meme de celui qui l'a tapee. On la rend donc IMPOSSIBLE A OUBLIER — une case
   dans le salon, un temoin a l'ecran pendant toute la manche, et le nom de qui
   l'a armee des deux cotes. */
function syncTrace() {
  if (!traceCheck) return;
  traceCheck.checked = traceOn;
  if (traceHint) {
    traceHint.textContent = traceOn
      ? tf("ui.panel.trace.on", "La manche sera enregistrée · armée par {qui}",
          { qui: tracePar || "?" })
      : t("ui.panel.trace.off",
          "Enregistre la manche et produit un compte rendu à coller. Visible de tous.");
  }
}
if (traceCheck) {
  traceCheck.onchange = () => {
    if (!connected || !inRoom) return;
    ws.send(JSON.stringify({ t: "trace", on: traceCheck.checked ? 1 : 0 }));
  };
}
if (bilanRapportCopy) {
  bilanRapportCopy.onclick = e => {
    e.preventDefault();
    if (!rapportTexte) return;
    navigator.clipboard?.writeText(rapportTexte);
    bilanRapportCopy.textContent = t("ui.bilan.rapport.copied", "Copié");
    setTimeout(() => {
      bilanRapportCopy.textContent = t("ui.bilan.rapport.copy", "Copier");
    }, 1200);
  };
}

/* L'ECRAN DU SUR MESURE. Le fond reste une liste de RANGS ; la presentation
   s'adapte, et c'est une decision de presentation, pas de modele : deux ou trois
   rangs se lisent mieux en CASES — on voit les options d'un coup — cinq rangs
   monotones se liraient mieux en curseur crante. Ici toutes les conditions ont
   deux a quatre rangs, donc des cases partout, et un bouton « aucun » qui est le
   rang absent.

   DEUX INDICATEURS, ET ILS DISENT DEUX CHOSES DIFFERENTES. La SEVERITE annonce
   l'intention (une somme de couts ecrits a la main) ; le PRODUIT annonce ce que la
   simulation va reellement subir, parce que les coefficients se composent et que
   le produit explose bien avant que chaque facteur soit a son maximum. Les deux
   ensemble evitent la surprise de la composition — et le REPERE par rapport a
   cauchemar en dit plus a quelqu'un qui ouvre le mode qu'un nombre absolu.

   L'INDICE EST UNE APPROXIMATION ET IL LE DIT. Pas d'avertissement moralisateur
   pour autant : « attention, ce reglage est tres difficile » n'apprend rien a qui
   vient de tout pousser expres. */

const customEnvoi = () => {
  if (!connected || !inRoom) return;
  ws.send(JSON.stringify({ t: "custom", on: customChoix ? 1 : 0,
                           choix: customChoix ?? {} }));
};

function customProduit(choix) {
  const d = construireCustom(DIFFICULTIES[1], choix ?? {});
  const cauchemar = DIFFICULTIES[2];
  const p = d.hp * d.spawn * d.dmg * d.speed * (d.cap ?? 1);
  const ref = cauchemar.hp * cauchemar.spawn * cauchemar.dmg * cauchemar.speed
    * (CFG.MAX_ENEMIES_DIFF[2] / CFG.MAX_ENEMIES_DIFF[1]);
  return { produit: p, versCauchemar: p / ref };
}

/* LES PALIERS D UNE CONDITION, ORDONNES PAR COUT, ET « aucun » EST LE ZERO. La
   table ecrit des rangs dans l ordre ou ils ont ete PENSES, pas dans celui ou ils
   se lisent : `densite` commence par -15 % puis monte. Un axe demande un ordre, et
   le seul ordre honnete est le COUT, qui est deja la mesure du mode. Le rang
   absent n est donc pas un bouton a part : c est la graduation du milieu.
   `i` est l index DANS LA TABLE et il ne bouge pas — c est lui qui circule sur le
   reseau et dans le code de partage. */
function paliersDe(c) {
  // DEUX RANGS PEUVENT PARTAGER UN COUT — `Maree` a deux fois +2, et
  // `verifierConditions` ne refuse qu'un cout qui REDESCEND. Le departage est
  // alors l'ordre de la TABLE, qui est celui dans lequel les rangs ont ete
  // penses (« les rangs positifs se lisent de haut en bas »). Il est ecrit ici
  // au lieu d'etre emprunte a la stabilite de `sort`.
  const par = (signe) => c.rangs
    .map((r, i) => ({ r, i }))
    .filter(x => Math.sign(x.r.cout) === signe)
    .sort((a, b) => a.r.cout - b.r.cout || a.i - b.i);
  return [...par(-1), { r: null, i: -1 }, ...par(1)];
}

/* LE WIDGET SE DEDUIT DE LA TABLE, IL NE SE DECLARE PAS. Un rang qui pose un NOM
   (`script: "cauchemar"`) n est pas sur un axe : entre « calme » et « cauchemar »
   il n y a pas de milieu, donc des cases. Tout le reste est un coefficient, donc
   monotone, donc un curseur — et un curseur dit d un coup COMBIEN DE CRANS il
   reste, ce qu une rangee de boutons ne dit pas.
   La regle vaut pour la condition qu on ajoutera : rien ici ne connait `script`. */
const conditionNommee = c =>
  c.rangs.some(r => Object.values(r.mods).some(v => typeof v === "string"));

function detailCustom() {
  if (!customChoix) return diffResume(CUSTOM_INDEX).join(" · ");
  const actives = CONDITIONS
    .filter(c => c.rangs[customChoix[c.key] ?? -1])
    .map(c => c.nom.toLowerCase());
  if (actives.length === 0) {
    return t("ui.vote.custom.vierge",
      "aucune condition — la manche vaut normal, et c'est le point de départ");
  }
  return actives.join(" · ");
}

export function renderCustom() {
  if (!customBox) return;
  const hote = myId === hostId;
  const actif = !!customChoix;
  // LA CARTE OUVRE LE BLOC, ET RIEN D AUTRE NE L OUVRE : desarme, ces onze lignes
  // sont onze lignes de reglages qui ne reglent rien.
  customBox.hidden = phase !== PHASE_LOBBY || !actif;
  if (customBox.hidden) return;

  if (customJauge) {
    const sev = severite(customChoix);
    const { produit, versCauchemar } = customProduit(customChoix);
    customJauge.textContent = tf("ui.panel.custom.jauge",
      "sévérité {s} · pression ×{p} · {r} fois cauchemar",
      { s: sev, p: produit.toFixed(2), r: versCauchemar.toFixed(2) });
    customJauge.title = t("ui.panel.custom.approx",
      "la sévérité est une approximation : une même condition ne coûte pas le même prix à toutes les armes");
  }

  if (customPresets) {
    customPresets.innerHTML = "";
    for (const p of PREREGLAGES) {
      const b = document.createElement("button");
      b.className = "ghost";
      b.textContent = p.nom;
      b.title = p.resume;
      b.disabled = !hote;
      b.onclick = () => {
        setCustomChoix(p.choix); customEnvoi(); renderCustom(); renderVote();
      };
      customPresets.appendChild(b);
    }
  }

  if (!customList) return;
  customList.innerHTML = "";
  for (const c of CONDITIONS) {
    const paliers = paliersDe(c);
    const rang = customChoix[c.key] ?? -1;
    const pos = Math.max(0, paliers.findIndex(p => p.i === rang));

    const ligne = document.createElement("div");
    ligne.className = "customLigne";

    const tete = document.createElement("div");
    tete.className = "customNom";
    tete.textContent = c.nom;
    tete.title = c.resume;
    ligne.appendChild(tete);

    const dit = document.createElement("div");
    dit.className = "customDit";
    const cout = document.createElement("span");
    const ecrire = (p) => {
      dit.textContent = p.r ? p.r.dit : c.resume;
      dit.classList.toggle("neutre", !p.r);
      cout.textContent = p.r ? (p.r.cout > 0 ? `+${p.r.cout}` : String(p.r.cout)) : "0";
      cout.className = "customCout" + (p.r ? (p.r.cout > 0 ? " dur" : " doux") : "");
    };

    const poser = (i) => {
      const suivant = { ...customChoix };
      if (i < 0) delete suivant[c.key];
      else suivant[c.key] = i;
      setCustomChoix(suivant);
      customEnvoi();
      renderCustom();
      // LA CARTE RESUME CE QUE LE BLOC REGLE : sans ce rappel elle garde la liste
      // des conditions d'avant le geste.
      renderVote();
    };

    const ctl = document.createElement("div");
    ctl.className = "customCtl";
    if (conditionNommee(c)) {
      for (const p of paliers) {
        const b = document.createElement("button");
        b.textContent = p.r ? p.r.dit : t("ui.panel.custom.aucun", "aucun");
        b.className = p.i === rang ? "" : "ghost";
        b.disabled = !hote;
        b.onclick = () => poser(p.i);
        ctl.appendChild(b);
      }
    } else {
      const s = document.createElement("input");
      s.type = "range";
      s.min = "0";
      s.max = String(paliers.length - 1);
      s.step = "1";
      s.value = String(pos);
      s.disabled = !hote;
      s.setAttribute("aria-label", c.nom);
      // L APERCU SUIT LE POUCE, L ENVOI ATTEND QU ON LE LACHE : un `input` de
      // curseur emet a chaque pixel, et chacun serait un message de salon
      // rediffuse a toute la table.
      s.oninput = () => ecrire(paliers[+s.value] ?? paliers[0]);
      s.onchange = () => poser((paliers[+s.value] ?? paliers[0]).i);
      ctl.appendChild(s);
    }
    ligne.appendChild(ctl);
    ligne.appendChild(cout);
    ligne.appendChild(dit);
    ecrire(paliers[pos] ?? paliers[0]);
    customList.appendChild(ligne);
  }
}

if (customExport) {
  customExport.onclick = () => {
    if (!customChoix) return;
    const code = exporterChoix(customChoix);
    if (customCode) customCode.value = code;
    navigator.clipboard?.writeText(code);
    if (customMsg) customMsg.textContent = tf("ui.panel.custom.copie", "copié : {code}", { code });
  };
}
if (customImport) {
  customImport.onclick = () => {
    const r = importerChoix(customCode?.value ?? "");
    if (!r.ok) {
      // REFUSER, ET DIRE POURQUOI. Un code d'une autre version applique en
      // silence decale les rangs, et la mesure est fausse sans que rien le dise.
      if (customMsg) {
        customMsg.textContent = r.motif === "version"
          ? tf("ui.panel.custom.mauvaiseVersion",
              "code d'une autre table (v{a}, ici v{b}) — les rangs ne veulent plus dire la même chose",
              { a: r.version, b: r.attendue })
          : t("ui.panel.custom.mauvaisCode", "code illisible");
      }
      return;
    }
    setCustomChoix(r.choix);
    if (customMsg) customMsg.textContent = "";
    customEnvoi();
    renderCustom();
  };
}


export function refreshPanel() {
  updateVersion();
  syncTrace();
  renderCustom();
  if (!connected) return;
  if (!inRoom) { panel.hidden = true; return; }
  if (!gate.hidden) return;
  if (!menuEl.hidden) return;
  // La page Hauts faits est un ecran a part entiere : un `lobby` broadcast ne
  // doit pas repeindre le salon par-dessus — meme garde que #menu.
  if (!hautsFaitsEl.hidden) return;
  showHud(phase === PHASE_ROUND);
  if (phase === PHASE_ROUND || bilanOpen || finOpen) { panel.hidden = true; return; }
  panel.hidden = false;

  const isHost = myId === hostId;
  const hostName = lobby.find(l => l.id === hostId)?.name ?? "?";

  if (panelKicker) {
    panelKicker.textContent = isHost
      ? t("ui.panel.kicker.host", "Salon · tu es l'hôte")
      : t("ui.crumb.salon", "Salon");
  }
  panelTitle.textContent = roomNameCur || t("ui.crumb.salon", "Salon");
  summary.textContent = lobby.length > 1
    ? tf("ui.panel.connected", "{n} joueurs connectés.", { n: lobby.length })
    : t("ui.panel.waiting", "En attente de joueurs.");
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
  readyBtn.textContent = jeSuisPret
    ? t("ui.panel.notReady", "Je ne suis plus prêt")
    : t("ui.panel.ready", "Je suis prêt");
  readyBtn.classList.toggle("on", jeSuisPret);

  startBtn.hidden = !isHost;
  startBtn.disabled = !isHost || manquants.length > 0;

  renderTeam();
  renderHistory();

  const maClasse = classNom(classAt(me?.cls ?? CLASS_DEFAULT));
  const mode = diffLabel(difficulty);
  const prets = lobby.length - manquants.length;
  launchSummaryEl.textContent = solo
    ? tf("ui.panel.sum.solo", "{cls} · difficulté {mode} · en solo",
        { cls: maClasse, mode })
    : tf("ui.panel.sum.team", "{cls} · difficulté {mode} · {prets} sur {tot} {verbe}",
        { cls: maClasse, mode, prets, tot: lobby.length,
          verbe: tn("ui.panel.sum.verbe", "est prêt", "sont prêts", prets) });

  if (solo) {
    waitMsg.textContent = t("ui.panel.wait.solo", "Tu joues seul. Lance quand tu veux.");
  } else if (manquants.length === 0) {
    waitMsg.textContent = isHost
      ? t("ui.panel.wait.allHost",
          "Tout le monde est prêt. Tout le monde entre en jeu, spectateurs compris.")
      : tf("ui.panel.wait.allGuest", "Tout le monde est prêt. En attente de {qui}…",
          { qui: hostName });
  } else if (manquants.length === 1 && manquants[0].id === myId) {
    waitMsg.textContent = t("ui.panel.wait.you", "Il ne manque que toi.");
  } else if (manquants.length <= 2) {
    waitMsg.textContent = tf("ui.panel.wait.some", "En attente de {qui}.",
      { qui: manquants.map(l => l.name).join(` ${t("ui.and", "et")} `) });
  } else {
    waitMsg.textContent = tf("ui.panel.wait.some", "En attente de {qui}.",
      { qui: tf("ui.nPlayers", "{n} joueurs", { n: manquants.length }) });
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
      : tf("ui.panel.readyCount", "{n} / {tot} prêts",
          { n: prets, tot: lobby.length });
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
          (l.id === hostId
            ? `<span class="teamHost">${escapeHtml(t("ui.panel.host", "hôte"))}</span>`
            : "") +
        `</span>` +
        `<span class="teamCls">${escapeHtml(cls ? cls.nom
          : t("ui.panel.noClass", "choisit sa classe…"))}</span>` +
      `</span>` +
      `<span class="teamPing">${pingTxt}</span>` +
      `<span class="teamDot"></span>`;

    row.querySelector(".teamName").textContent = l.name;
    // sur la LIGNE, pas sur le nom : une plaque a besoin d'une surface
    appliquerCadre(row, l.cadre);
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
      + `<span class="histLabel">${escapeHtml(t("ui.panel.hist.empty",
        "Aucune manche jouée dans cette salle."))}</span><span></span>`;
    historyListEl.appendChild(row);
    return;
  }

  for (const h of roundHistory) {
    const t = new Date(h.at);
    const heure = Number.isFinite(t.getTime())
      ? `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`
      : "—";
    const mode = diffLabel(h.diffIndex);

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
function mulCourt(v) { return "×" + dec(+v.toFixed(2)).replace(/[.,]?0+$/, ""); }
// les lieux d une carte composee, dans l ordre ou la graine les a poses.
function lieuxDeLaCarte() {
  const l = lieuxCourants();
  return l.length ? l.map(biomeNom).join(" · ") : "";
}
function voteDetail(d, i) {
  const lignes = diffResume(i);
  const risque = i === 0 ? t("ui.vote.biome.calme", "aucun danger")
    : i === 1 ? t("ui.vote.biome.normal", "rien qui blesse")
    : t("ui.vote.biome.cauchemar", "dangers actifs et météo");
  /* UNE CARTE COMPOSEE N A PAS UN NOM, ELLE EN A CINQ. Le salon annonce ce dans
     quoi on entre : la liste des lieux vaut mieux qu un nom unique qui serait faux
     des le premier ecran traverse. */
  lignes.push(biomeIndex < 0
    ? `${t("ui.vote.carte", "carte composée")} — ${lieuxDeLaCarte()} · ${risque}`
    : `${biomeNom(biomeIndex)} — ${biomeResume(biomeIndex)} · ${risque}`);
  return lignes.join(" · ");
}
/* QUATRE CARTES, MAIS PAS QUATRE VOTES. Les trois premieres se votent — chacun la
   sienne, la majorite l emporte ; la quatrieme est un INTERRUPTEUR D HOTE, parce
   que le serveur refuse `v === CUSTOM_INDEX` : un vote l aurait choisie avec les
   reglages par defaut, donc une manche normale privee de tout, sans que personne
   l ait voulu.
   ELLE RESTE UNE CARTE DE LA RANGEE, ET C EST LA DECISION : la difficulte est UN
   choix, et l offrir a deux endroits — trois cartes ici, une case ailleurs —
   demande au joueur de deviner que les deux parlent de la meme chose.
   LE VOTE SURVIT DESSOUS. Le sur mesure ARME, il n efface pas : le desarmer rend
   la main a la majorite, donc les voix restent visibles pendant qu il est actif.
   Ce qui change est la couronne — `.winner` dit ce qui SERA JOUE, et c est le sur
   mesure des qu il est arme. */
function renderVote() {
  voteRow.innerHTML = "";
  const hote = myId === hostId;
  const surMesure = !!customChoix;

  DIFFICULTIES.forEach((d, i) => {
    const btn = document.createElement("button");
    const n = d.custom ? 0 : (tally[i] ?? 0);
    const noyaux = PROG_CFG.DIFF_MUL[i];
    // LA PASTILLE DIT LE PRIX, ET POUR LE SUR MESURE LE PRIX EST « rien » :
    // `DIFF_MUL` n a pas de quatrieme entree, et un `?? 1` aurait annonce le
    // tarif de normal — l inverse exact de ce que le mode paie.
    const chip = noyaux === undefined
      ? escapeHtml(t("ui.vote.cores.aucun", "aucun gain"))
      : `${escapeHtml(t("ui.vote.cores", "noyaux"))} ${mulCourt(noyaux)}`;
    btn.innerHTML =
      `<span class="voteHead"><span class="voteName"></span>`
      + `<span class="voteMul">${chip}</span></span>`
      + `<span class="voteDetail"></span>`
      + (n > 0 ? `<span class="tally"></span>` : "");
    btn.querySelector(".voteName").textContent = diffLabel(i);
    btn.querySelector(".voteDetail").textContent = d.custom
      ? detailCustom() : voteDetail(d, i);
    if (n > 0) {
      btn.querySelector(".tally").textContent =
        tn("ui.vote.tally", "{n} voix", "{n} voix", n);
    }
    btn.classList.toggle("mine", !d.custom && i === myVote);
    btn.classList.toggle("winner", d.custom ? surMesure : (!surMesure && i === difficulty));
    btn.classList.toggle("customOpt", !!d.custom);
    btn.disabled = d.custom && !hote;

    btn.onclick = () => {
      if (phase !== PHASE_LOBBY) return;
      if (d.custom) {
        // le tirage vide EST le mode : `{}` vaut normal, et c est le critere
        // rejoue par `verifierCustom`.
        setCustomChoix(customChoix ? null : {});
        customEnvoi();
      } else {
        setMyVote(i);
        ws.send(JSON.stringify({ t: "vote", v: i }));
        // CHOISIR UN DES TROIS DESARME LE SUR MESURE, SINON LA CARTE MENT : le
        // serveur prend `this.custom` avant la majorite, donc voter en laissant
        // le sur mesure arme aurait coche une carte qui ne sera pas jouee. Seul
        // l hote peut desarmer — c est lui qui l a arme.
        if (surMesure && hote) { setCustomChoix(null); customEnvoi(); }
      }
      renderVote();
      renderCustom();
    };
    voteRow.appendChild(btn);
  });

  const retenu = diffLabel(surMesure ? CUSTOM_INDEX : difficulty);
  voteHint.textContent = surMesure
    ? tf("ui.vote.hint.custom",
         "Mode retenu : {mode}. Il passe devant le vote tant qu'il est actif.",
         { mode: retenu })
    : lobby.length > 1
      ? tf("ui.vote.hint.team",
          "Mode retenu : {mode} ({n} voix sur {tot}). À égalité, le plus doux l'emporte.",
          { mode: retenu, n: tally[difficulty] ?? 0, tot: lobby.length })
      : tf("ui.vote.hint.solo",
          "Mode retenu : {mode}. Le vote se verrouille au lancement.", { mode: retenu });
}
const CLASS_STATS = [
  { cle: "pv", nom: "PV", val: c => c.hp, texte: c => String(c.hp) },
  { cle: "degats", nom: "dégâts", val: c => c.damageMul, texte: c => pourcent(c.damageMul) },
  { cle: "vitesse", nom: "vitesse", val: c => c.speedMul, texte: c => pourcent(c.speedMul) },
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
        `<span class="statName">${escapeHtml(t(`ui.stat.${st.cle}`, st.nom))}</span>` +
        `<span class="statBar"><i style="width:${Math.round(st.val(c) / maxi[k] * 100)}%"></i></span>` +
        `<span class="statVal">${escapeHtml(st.texte(c))}</span>` +
      `</div>`).join("");

    btn.innerHTML =
      `<div class="classHead">` +
        `<canvas class="classSil"></canvas>` +
        `<div>` +
          `<div class="className">${escapeHtml(classNom(c))}</div>` +
          `<div class="classRole">${escapeHtml(classDesc(c))}</div>` +
        `</div>` +
      `</div>` +
      `<div class="classStats">${stats}</div>` +
      c.skills.map((s, k) =>
        `<div class="classSkill"><span class="key">${escapeHtml(s.touche)}</span>` +
        `<span><b>${escapeHtml(skillNom(c, k))}</b> — `
        + `${escapeHtml(skillDesc(c, k))}</span></div>`
      ).join("") +
      // un joueur qui choisit soigneur pour une partie SOLO doit le savoir
      // avant, pas le decouvrir a la minute 8
      (c.solo && lobby.length <= 1
        ? `<div class="classSolo">${escapeHtml(tf("ui.class.solo", "seul : {txt}",
            { txt: classSolo(c) }))}</div>` : "") +
      (pris ? `<div class="classTaken">${escapeHtml(tf("ui.class.taken",
        "pris par {qui}", { qui: pris }))}</div>` : "");

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
      meta.textContent = tf("ui.class.talents", "Talents du {cls}", { cls: classNom(c) });
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
    classHint.textContent = tf("ui.class.locked",
      "Classe verrouillée pour la session : {cls}.",
      { cls: classNom(classAt(mine ?? CLASS_DEFAULT)) });
  } else if (mine === null || mine === undefined) {
    classHint.textContent = tf("ui.class.default",
      "Sans choix explicite, tu entres en {cls}. Le choix se verrouille au lancement.",
      { cls: classNom(CLASSES[CLASS_DEFAULT]) });
  } else {
    classHint.textContent = t("ui.class.lockHint",
      "Le choix se verrouille au lancement de la première manche.");
  }
}
// L'onglet « Bannies » a quitte l'ecran des talents (demande du porteur) :
// les bans restent permanents et par compte, seule leur consultation disparait.
const META_TABS = [
  ["metaTabArbre", "arbre"], ["metaTabConfort", "confort"],
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

  menuTitleEl.textContent = tf("ui.meta.title", "Arbre du {cls}", { cls: classNom(cdef) });

  /* UN JOUEUR QUI PERD DES LIGNES ACTIVES SANS EXPLICATION LIT UN NERF, pas un
     choix rendu. Le bandeau vit le temps d une lecture : le serveur ferme le
     drapeau, donc il ne revient pas a la connexion suivante. */
  if (pr.avisMeta) {
    let avis = document.getElementById("metaAvis");
    if (!avis) {
      avis = document.createElement("div");
      avis.id = "metaAvis";
      metaEl.insertBefore(avis, metaEl.firstChild);
    }
    avis.textContent = tf("ui.meta.avis",
      "Deux bornes arrivent : {n} emplacements de classe, et {b} points de doctrine"
      + " partagés par les communes et le confort. Rien n'est perdu — tes paliers"
      + " restent payés, à toi de choisir lesquels porter.",
      { n: slots, b: PROG_CFG.META_BUDGET });
    avis.onclick = () => {
      avis.remove();
      ws.send(JSON.stringify({ t: "metaAvisVu" }));
    };
  } else {
    document.getElementById("metaAvis")?.remove();
  }
  metaCoresEl.textContent = tf("ui.meta.cores", "{n} noyaux", { n: pr.cores });

  metaClassTabsEl.innerHTML = "";
  for (let i = 0; i < CLASSES.length; i++) {
    const b = document.createElement("button");
    b.textContent = classNom(CLASSES[i]);
    b.className = classAt(i).id === clsId ? "mine" : "";
    b.onclick = () => renderMeta(i);
    metaClassTabsEl.appendChild(b);
  }

  const bosses = (pr.milestones ?? []).filter(id => id.startsWith("boss_")).length;
  metaSlotsEl.innerHTML =
    `<b>${escapeHtml(tf("ui.meta.slots", "Emplacements {n} / {tot}",
      { n: equipped.length, tot: slots }))}</b> `
    + escapeHtml(tf("ui.meta.slots.sur",
        "équipés sur le {cls} · réattribution libre entre les manches",
        { cls: classNom(cdef) }))
    + `<br><small>`
    + escapeHtml(tf("ui.meta.slots.base", "{n} de départ", { n: PROG_CFG.SLOTS_BASE }))
    + ` · ` + escapeHtml(tf("ui.meta.slots.niveau", "niveau {n}", { n: PROG_CFG.SLOTS_LEVEL }))
    + ` ${(pr.milestones ?? []).includes(`niveau${PROG_CFG.SLOTS_LEVEL}`) ? "✓" : "•"}`
    + ` · ` + escapeHtml(tf("ui.meta.slots.boss", "{n} boss différents ({a}/{n})",
        { n: PROG_CFG.SLOTS_BOSSES, a: Math.min(bosses, PROG_CFG.SLOTS_BOSSES) }))
    + ` · ` + escapeHtml(tf("ui.meta.slots.parties", "{n} parties ({a}/{n})",
        { n: PROG_CFG.SLOTS_RUNS, a: Math.min(pr.runs ?? 0, PROG_CFG.SLOTS_RUNS) }))
    + `</small>`
    /* LE BUDGET SE LIT A COTE DES EMPLACEMENTS, parce que c est la meme question
       posee deux fois : ce que je possede n est pas ce que j emporte. */
    + `<br><b>` + escapeHtml(tf("ui.meta.doctrine", "Doctrine {n} / {tot}",
        { n: metaCharge([...metaActives(pr)], pr), tot: PROG_CFG.META_BUDGET })) + `</b> `
    + escapeHtml(t("ui.meta.doctrine.sur",
        "points partagés par les lignes communes et le confort — le poids de chacun est sur sa carte"));

  metaTreeEl.hidden = metaTab !== "arbre";
  metaConfortEl.hidden = metaTab !== "confort";
  for (const [id, tab] of META_TABS) {
    document.getElementById(id).classList.toggle("mine", metaTab === tab);
  }
  metaSubEl.textContent = metaTab === "arbre"
    ? tf("ui.meta.sub.arbre", "arbre du {cls} — l'effet affiché est le TOTAL possédé",
        { cls: classNom(cdef) })
    : t("ui.meta.sub.confort",
        "confort et lignes communes : un budget de doctrine partagé, valable pour les trois classes");

  /* LE POIDS EST SUR LA CARTE, pas dans une bulle d'aide : le compromis doit se
     voir AVANT l'achat, pas se découvrir après. */
  const badgePoids = id =>
    `<i class="metaPoids" title="${escapeHtml(tf("ui.meta.poids",
      "pèse {n} sur les {tot} points de doctrine",
      { n: metaPoids(id, pr), tot: PROG_CFG.META_BUDGET }))}">${metaPoids(id, pr)}</i>`;

  metaTreeEl.innerHTML = "";
  for (const line of TREES[clsId] ?? []) {
    const n = cp.tiers?.[line.id] | 0;
    const cost = tierCost(n);
    const isEquipped = equipped.includes(line.id);

    const row = document.createElement("div");
    row.className = "metaLine"
      + (isEquipped ? " equipped" : n > 0 ? " owned" : " locked");
    row.innerHTML =
      `<span class="metaName">${escapeHtml(ligneNom(line))}${badgePoids(line.id)}</span>` +
      `<span class="metaPips">${"●".repeat(n)}${"○".repeat(PROG_CFG.TIERS_MAX - n)}</span>` +
      `<span class="metaDesc">${escapeHtml(n > 0 ? line.desc(n)
        : tf("ui.meta.parPalier", "{txt} par palier", { txt: line.desc(1) }))}</span>`;

    const buy = document.createElement("button");
    buy.className = "metaBuy";
    if (n >= PROG_CFG.TIERS_MAX) {
      buy.textContent = t("ui.meta.max", "max");
      buy.disabled = true;
    } else {
      buy.textContent = tf("ui.meta.cores", "{n} noyaux", { n: cost });
      buy.disabled = pr.cores < cost || phase !== PHASE_LOBBY;
      buy.onclick = () => ws.send(JSON.stringify({ t: "metaBuy", cls: clsId, line: line.id }));
    }

    const eq = document.createElement("button");
    eq.className = "metaEquip" + (isEquipped ? " on" : "");
    eq.textContent = isEquipped
      ? t("ui.meta.equipped", "équipée")
      : t("ui.meta.equip", "équiper");
    eq.disabled = n <= 0 || (!isEquipped && equipped.length >= slots) || phase !== PHASE_LOBBY;
    eq.onclick = () => {
      const lines = isEquipped ? equipped.filter(l => l !== line.id) : [...equipped, line.id];
      ws.send(JSON.stringify({ t: "metaEquip", cls: clsId, lines }));
    };

    row.append(buy, eq);
    metaTreeEl.appendChild(row);
  }

  metaConfortEl.innerHTML = "";
  const actives = metaActives(pr);
  const charge = metaCharge([...actives], pr);

  const boutonDoctrine = id => {
    const on = actives.has(id);
    const b = document.createElement("button");
    b.className = "metaEquip" + (on ? " on" : "");
    b.textContent = on
      ? t("ui.meta.equipped", "équipée")
      : t("ui.meta.equip", "équiper");
    b.disabled = phase !== PHASE_LOBBY
      || (!on && charge + metaPoids(id, pr) > PROG_CFG.META_BUDGET);
    b.onclick = () => {
      // on repart de ce que le SERVEUR applique, pas de ce que le profil porte :
      // un identifiant tombé hors budget ne doit pas revenir par la porte
      const reste = [...actives].filter(x => x !== id);
      ws.send(JSON.stringify({ t: "metaEquipes", ids: on ? reste : [...reste, id] }));
    };
    return b;
  };

  for (const cf of CONFORT) {
    const owned = (pr.confort ?? []).includes(cf.id);
    const cost = PROG_CFG.CONFORT_COSTS[cf.id];
    const row = document.createElement("div");
    row.className = "metaLine confort"
      + (owned && !actives.has(cf.id) ? " coupee" : "");
    row.innerHTML =
      `<span class="metaName">${escapeHtml(confortNom(cf.id))}${badgePoids(cf.id)}</span>` +
      `<span class="metaDesc">${escapeHtml(confortDesc(cf.id))}</span>`;
    const b = document.createElement("button");
    b.className = "metaBuy";
    if (owned) {
      b.textContent = t("ui.meta.owned", "acquise");
      b.disabled = true;
    } else {
      b.textContent = tf("ui.meta.cores", "{n} noyaux", { n: cost });
      b.disabled = pr.cores < cost || phase !== PHASE_LOBBY;
      b.onclick = () => ws.send(JSON.stringify({ t: "metaConfort", id: cf.id }));
    }
    row.appendChild(b);
    if (owned) row.appendChild(boutonDoctrine(cf.id));
    metaConfortEl.appendChild(row);
  }

  const verrous = lignesVerrouillees(pr);
  const ouvreLigne = new Map();
  for (const h of HAUTS_FAITS) {
    if (h.reward.type !== "ligne") continue;
    for (const id of h.reward.ids) ouvreLigne.set(id, h.id);
  }
  for (const line of COMMUN) {
    const n = (pr.commun ?? {})[line.id] | 0;
    const cost = tierCost(n, line.id);
    const ferme = verrous.has(line.famille ?? "");
    const coupee = n > 0 && !actives.has(line.id);
    const row = document.createElement("div");
    row.className = "metaLine" + (n > 0 ? " owned" : "") + (ferme ? " taken" : "")
      + (coupee ? " coupee" : "");
    row.innerHTML =
      `<span class="metaName">${escapeHtml(ligneNom(line))}</span>` +
      `<span class="metaPips">${"●".repeat(n)}${"○".repeat(PROG_CFG.TIERS_MAX - n)}</span>` +
      `<span class="metaDesc">${escapeHtml(n > 0 ? line.desc(n)
        : tf("ui.meta.parPalier", "{txt} par palier", { txt: line.desc(1) }))}</span>`;
    const b = document.createElement("button");
    b.className = "metaBuy";
    if (ferme) {
      b.textContent = t("ui.meta.verrouillee", "verrouillée");
      b.title = hfTexte(ouvreLigne.get(line.famille) ?? "");
      b.disabled = true;
    } else if (n >= PROG_CFG.TIERS_MAX) {
      b.textContent = t("ui.meta.max", "max");
      b.disabled = true;
    } else {
      b.textContent = tf("ui.meta.cores", "{n} noyaux", { n: cost });
      b.disabled = pr.cores < cost || phase !== PHASE_LOBBY;
      b.onclick = () => ws.send(JSON.stringify({ t: "metaCommun", line: line.id }));
    }
    row.appendChild(b);
    if (n > 0) row.appendChild(boutonDoctrine(line.id));
    metaConfortEl.appendChild(row);
  }

}

/* UN HAUT FAIT CACHE EST UNE LOTERIE, PAS UN OBJECTIF : la liste montre la
   progression chiffree quand elle existe, la recompense AVANT l'obtention — les
   cadres compris, qui doivent se voir pour etre desires — et l'exigence de
   difficulte en clair sur les cinq concernes. */
function nomsRecompense(h) {
  return h.reward.ids.map(id =>
    h.reward.type === "cadre" ? cadreNom(id)
    : h.reward.type === "relique" ? relicNom(id)
    : h.reward.type === "ligne" ? t(`prog.famille.${id}`, id)
    : h.reward.type === "arme" ? armeNom(id)
    : (cardNom(id) || id)).join(", ");
}

/* DES PLAQUES, PAS UNE LISTE. Le systeme derriere est riche — progression
   chiffree, trois niveaux, recompenses nommees, cadres — et il s affichait en
   lignes de texte : rien n y donnait envie de collectionner.

   DEUX FORMES, ET C EST LA MESURE QUI L IMPOSE. Sur les 36 hauts faits,
   DIX-HUIT seulement ont une progression chiffree utile (`max > 1`) ; les
   dix-huit autres sont a pile ou face — on l a fait ou on ne l a pas fait.
   Une barre vide sur la moitie des plaques aurait eu l air CASSEE, et c est
   exactement ce qu une grille uniforme aurait produit. Celles qui n ont pas de
   compteur montrent donc leur CONDITION a la place : l information existe
   (`hfTexte`), elle n a simplement pas la forme d une jauge.

   TROIS ETATS, TROIS LECTURES : verrouille (plaque sourde), en cours (la
   jauge porte le regard), obtenu (plein, et la recompense passe devant la
   condition — une fois acquis, ce qui compte est ce qu on a GAGNE). */
function plaqueHf(h, ok, pg, modes) {
  const diff = h.diffMin !== undefined
    ? `<span class="hfDiff">${escapeHtml(modes[h.diffMin] ?? "")}</span>` : "";
  const jauge = !ok && pg && pg.max > 1
    ? `<div class="hfBarre"><i style="width:${Math.round(100 * pg.n / pg.max)}%"></i></div>`
      + `<div class="hfCompte">${pg.n} / ${pg.max}</div>`
    : "";
  return `<div class="hfPlaque${ok ? " done" : ""}">`
    + `<div class="hfTete"><span class="hfMark">${ok ? "✓" : "•"}</span>`
      + `<span class="hfTitre">${escapeHtml(hfNom(h.id))}</span>${diff}</div>`
    + `<div class="hfCond">${escapeHtml(hfTexte(h.id))}</div>`
    + jauge
    + `<div class="hfPrix">${escapeHtml(rewardLabel(h.reward.type))} · `
      + `${escapeHtml(nomsRecompense(h))}</div>`
    + `</div>`;
}

function renderHauts(pr) {
  const done = new Set(pr.hf ?? []);
  const stats = vueStats(pr);
  const modes = [t("ui.diff.calme", "calme"), t("ui.diff.normal", "normal"),
                 t("ui.diff.cauchemar", "cauchemar")];
  let html = `<div class="hfCount">`
    + escapeHtml(tf("ui.meta.hf.total", "{n} / {tot} obtenus",
        { n: done.size, tot: HAUTS_FAITS.length }))
    + `</div>`;
  for (let niv = 0; niv < HF_NIVEAUX.length; niv++) {
    const liste = HAUTS_FAITS.filter(h => h.niveau === niv);
    const faits = liste.filter(h => done.has(h.id)).length;
    html += `<div class="sectionTitle">${escapeHtml(hfNiveauLabel(niv))}`
      + ` <small>${faits} / ${liste.length}</small></div>`
      + `<div class="hfGrille">`
      + liste.map(h => plaqueHf(h, done.has(h.id),
          done.has(h.id) ? null : hfProgres(h.id, stats), modes)).join("")
      + `</div>`;
  }
  metaHfEl.innerHTML = html;
}

/* Les cadres non obtenus sont VISIBLES mais grises, avec leur condition : c'est
   ce qui les rend desirables. Un clic equipe, un seul actif a la fois. */
function renderCadres(pr) {
  const avoir = cadresDe(pr);
  const actif = cadreActifDe(pr);
  const parCadre = new Map();
  for (const h of HAUTS_FAITS) {
    if (h.reward.type !== "cadre") continue;
    for (const id of h.reward.ids) parCadre.set(id, h.id);
  }
  metaCadresEl.innerHTML = "";
  for (const c of CADRES) {
    const ok = avoir.has(c.id);
    const row = document.createElement("button");
    row.className = "cadreRow" + (ok ? "" : " taken") + (c.id === actif ? " mine" : "");
    row.disabled = !ok;
    row.innerHTML =
      // ON EQUIPE CE QU'ON A VU, et ce qu'on verra est une ligne de salon : on
      // en rend une en miniature plutot qu'un echantillon a part
      `<span class="cadreApercu"><span class="teamRow">`
        + `<span class="teamAvatar"></span>`
        + `<span class="teamMain"><span class="teamTop">`
          + `<span class="teamName"></span></span>`
          + `<span class="teamCls"></span></span>`
      + `</span></span>`
      + `<span class="cadreBody">`
        + `<span class="cadreNom">${escapeHtml(cadreNom(c.id))}</span>`
        + `<span class="cadreCond">${escapeHtml(ok
            ? (c.id === actif ? t("ui.meta.cadre.actif", "équipé") : t("ui.meta.cadre.libre", "obtenu"))
            : hfTexte(parCadre.get(c.id) ?? ""))}</span>`
      + `</span>`;
    const plaque = row.querySelector(".cadreApercu .teamRow");
    const nom = myPseudo || t("ui.meta.cadre.toi", "toi");
    plaque.querySelector(".teamName").textContent = nom;
    plaque.querySelector(".teamAvatar").textContent = nom.trim().charAt(0).toUpperCase() || "?";
    plaque.querySelector(".teamCls").textContent = cadreNom(c.id);
    appliquerCadre(plaque, c.id);
    if (ok) row.onclick = () => ws.send(JSON.stringify({ t: "metaCadre", id: c.id }));
    metaCadresEl.appendChild(row);
  }
}
function renderScores(rows, body = scoresBody) {
  body.innerHTML = "";
  const head = document.createElement("tr");
  head.innerHTML = [
    ["joueur", "joueur"], ["classe", "classe"], ["niv", "niv."], ["score", "score"],
    ["kills", "kills"], ["morts", "morts"], ["degats", "dégâts"],
    ["cartes", "cartes"], ["noyaux", "noyaux"], ["cumul", "cumul"],
  ].map(([cle, lab]) => `<th>${escapeHtml(t(`ui.col.${cle}`, lab))}</th>`).join("");
  body.appendChild(head);

  for (const r of rows) {
    const tr = document.createElement("tr");
    const col = PLAYER_COLORS[r.colorIndex % PLAYER_COLORS.length];
    const tag = r.id === hostId ? " ★" : "";
    const cdef = (r.cls === null || r.cls === undefined) ? null : classAt(r.cls);
    tr.innerHTML =
      `<td class="name" style="color:${col}">${escapeHtml(r.name)}${tag}</td>` +
      `<td class="sub"${cdef ? ` style="color:${cdef.couleur}"` : ""}>${cdef ? escapeHtml(classNom(cdef)) : "—"}</td>` +
      `<td>${r.level ?? 1}</td>` +
      `<td>${r.score}</td><td>${r.kills}</td><td>${r.deaths}</td>` +
      `<td>${Math.round(r.damage ?? 0)}</td>` +
      `<td class="cards">${cardBadges(r.id)}</td>` +
      `<td class="sub">${r.cores !== undefined ? "+" + r.cores : "—"}</td>` +
      `<td class="sub">${r.total ? r.total.score : 0}</td>`;
    // AUCUN CADRE AU BILAN : le <td> porte deja la couleur de classe en texte, et
    // une plaque n'a pas la place d'une colonne de tableau
    tr.className = "clickable";
    tr.title = t("ui.col.voirBuild", "voir la build");
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
    finKicker.textContent = [roomNameCur, diffLabel(difficulty)].filter(Boolean).join(" · ");
  }

  finEl.classList.toggle("win", !!res.victory);
  finTitle.textContent = res.victory
    ? t("ui.fin.win", "Victoire")
    : t("ui.fin.lose", "Tu es tombé");

  const etape = res.segment
    ? `${segmentName(res.segment)} (${res.segment}/${TL_CFG.SEGMENTS})`
    : "—";
  finStats.innerHTML = [
    [t("ui.fin.stat.etape", "étape atteinte"), etape],
    [t("ui.fin.stat.niveau", "niveau"), String(res.level ?? 1)],
    [t("ui.fin.stat.survie", "survie"), fmtTime(res.time)],
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
  if (bilanRapport) {
    bilanRapport.hidden = !rapportTexte;
    if (rapportTexte && bilanRapportTexte) bilanRapportTexte.textContent = rapportTexte;
  }

  const niv = res.level
    ? ` — ${tf("ui.bilan.niveau", "niveau {n}", { n: res.level })}`
    : "";
  bilanEl.classList.toggle("win", !!res.victory);
  bilanTitle.textContent = res.victory
    ? t("ui.bilan.win", "Victoire — les six étapes franchies") + niv
    : res.segment
      ? tf("ui.bilan.lose.step", "Partie terminée — {etape} ({n}/{tot})",
          { etape: segmentName(res.segment), n: res.segment, tot: TL_CFG.SEGMENTS }) + niv
      : t("ui.bilan.lose", "Partie terminée");
  if (bilanKicker) {
    bilanKicker.textContent = [roomNameCur, diffLabel(difficulty)].filter(Boolean).join(" · ");
  }

  const joueurs = res.rows.filter(r => r.played).length || res.rows.length;
  bilanStats.innerHTML =
    `<div class="bilanStat"><span class="lab">${escapeHtml(
      t("ui.fin.stat.survie", "survie"))}</span>` +
    `<span class="val">${escapeHtml(fmtTime(res.time))}</span></div>` +
    `<div class="bilanStat"><span class="lab">${escapeHtml(
      t("ui.col.kills", "kills"))}</span>` +
    `<span class="val">${res.kills}</span></div>` +
    `<div class="bilanStat"><span class="lab">${escapeHtml(
      t("ui.bilan.stat.joueurs", "joueurs"))}</span>` +
    `<span class="val">${joueurs}</span></div>` +
    `<div class="bilanStat"><span class="lab">${escapeHtml(
      t("ui.bilan.stat.manche", "manche"))}</span>` +
    `<span class="val">${res.round}</span></div>`;
  renderBilanFait(res.rows);
  renderHurtBy(res.rows);
  renderBilanScores(res.rows);
}

/* CE QUE LA MANCHE A LAISSE AU COMPTE, et rien d autre : un record et des hauts
   faits sont des faits de PROFIL, donc ils ne concernent que le sien — les
   afficher pour toute l equipe ferait quatre lignes dont trois ne se lisent pas.
   L ecart se compare a un record de MEME effectif : `clefRecord` le garantit
   cote serveur, et c est ce qui rend la ligne honnete en solo comme a quatre. */
function renderBilanFait(rows) {
  const mine = rows.find(r => r.id === myId);
  const lignes = [];

  const fin = mine?.final;
  if (fin && fin.temps > 0) {
    const ecart = fin.avant === null || fin.avant === undefined
      ? null : Math.abs(fin.temps - fin.avant);
    lignes.push({
      cle: "record",
      lab: t("ui.bilan.fait.record", "record"),
      gain: !!fin.record,
      txt: fin.record
        ? (ecart === null
            ? tf("ui.bilan.fait.premier", "premier temps à cet effectif — {t}",
                { t: fmtTime(fin.temps) })
            : tf("ui.bilan.fait.battu", "record battu de {e} s — {t}",
                { e: dec(ecart, 1), t: fmtTime(fin.temps) }))
        : tf("ui.bilan.fait.manque", "à {e} s de ton record ({t})",
            { e: dec(ecart ?? 0, 1), t: fmtTime(fin.avant ?? 0) }),
    });
  }

  const hf = mine?.hf ?? [];
  if (hf.length > 0) {
    lignes.push({
      cle: "hf",
      lab: tn("ui.bilan.fait.hf", "haut fait", "hauts faits", hf.length),
      gain: true,
      txt: hf.map(id => hfNom(id)).join(" · "),
    });
  }

  bilanFait.hidden = lignes.length === 0;
  bilanFait.innerHTML = lignes.map(l =>
    `<div class="faitLigne${l.gain ? " gain" : ""}">` +
      `<span class="faitLab">${escapeHtml(l.lab)}</span>` +
      `<span class="faitTxt">${escapeHtml(l.txt)}</span>` +
    `</div>`).join("");
}
const BILAN_COLS = [
  { cle: "score",  lab: "score",  val: r => fmtBig(r.score ?? 0),   mine: true },
  { cle: "kills",  lab: "kills",  val: r => String(r.kills ?? 0) },
  { cle: "morts",  lab: "morts",  val: r => String(r.deaths ?? 0) },
  { cle: "degats", lab: "dégâts", val: r => fmtBig(r.damage ?? 0) },
  { cle: "soins",  lab: "soins",  val: r => (r.heal ?? 0) > 0 ? fmtBig(r.heal) : "—" },
  { cle: "noyaux", lab: "noyaux", val: r => r.cores !== undefined ? String(r.cores) : "—" },
];
function renderBilanScores(rows) {
  bilanScoresBody.innerHTML = "";
  const head = document.createElement("tr");
  head.innerHTML = `<th>${escapeHtml(t("ui.col.joueur", "joueur"))}</th>`
    + BILAN_COLS.map(c =>
        `<th>${escapeHtml(t(`ui.col.${c.cle}`, c.lab))}</th>`).join("");
  bilanScoresBody.appendChild(head);

  for (const r of rows) {
    const tr = document.createElement("tr");
    const cdef = (r.cls === null || r.cls === undefined) ? null : classAt(r.cls);
    const col = cdef ? cdef.couleur : PLAYER_COLORS[r.colorIndex % PLAYER_COLORS.length];
    const ini = (r.name || "?")[0].toUpperCase();
    const arch = archetypeDe(ownedCounts(r.id));

    tr.innerHTML =
      `<td class="who">` +
        `<span class="whoDot" style="color:${col}">${escapeHtml(ini)}</span>` +
        `<span class="whoText">` +
          `<span class="whoName">${escapeHtml(r.name)}</span>` +
          `<span class="whoCls">${cdef ? escapeHtml(classNom(cdef)) : "—"}</span>` +
          (arch ? `<span class="whoArch">${escapeHtml(archetypeNom(arch.id))}</span>` : "") +
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
    .map((s, i) => ({ i, label: srcLabel(i), val: total[i] }))
    .filter(p => p.val > 0)
    .sort((a, b) => b.val - a.val);

  const segs = parts.map(p => ({ ...p, pct: Math.round(p.val / somme * 100) }));
  bilanHurt.innerHTML =
    `<div class="hurtTitle sectionTitle">${escapeHtml(t("ui.bilan.hurt",
      "dégâts subis par l'équipe"))}</div>` +
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
    bilanPerf.textContent = tf("ui.bilan.perf",
      "diagnostic réseau — famine {fam} · recal {rec} · >{ms}ms {gap}"
      + " · max gap {maxGap} ms · img max {maxImg} ms",
      { fam: netPerf.totFamine, rec: netPerf.totResnap, ms: INTERP_MS,
        gap: netPerf.totGap, maxGap: netPerf.maxGap.toFixed(0),
        maxImg: netPerf.maxFrame.toFixed(0) });
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
      `${escapeHtml(cardNom(id))}${n > 1 ? ` ×${n}` : ""}</span>`;
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
    `${escapeHtml(t("ui.merchant.title", "Marchand"))} `
    + `<span class="merchantEclats">${escapeHtml(tf("ui.merchant.eclats",
        "{n} éclats", { n: merchantState.eclats }))}</span>` +
    (epuise ? `<span class="merchantAchat">${escapeHtml(t("ui.merchant.oneBuy",
      "une relique par visite"))}</span>` : "");

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
        `<span class="cardName">${escapeHtml(relicNom(r.id))}</span>` +
      `</div>` +
      `<div class="cardMeta">` +
        `<span class="cardRarity">${escapeHtml(relicRarityLabel(r.tier))}</span>` +
      `</div>` +
      `<div class="cardBody">` +
        `<div class="cardMain">${escapeHtml(relicDesc(r.id))}</div>` +
        (r.equipe ? `<div class="cardTeam">${escapeHtml(t("ui.merchant.team",
          "effet d'équipe"))}</div>` : "") +
        (r.contrepartie
          ? `<div class="cardWarn">${escapeHtml(relicContrepartie(r.id))}</div>`
          : "") +
      `</div>` +
      `<div class="cardFoot">` +
        `<span class="merchantPrix">${escapeHtml(tf("ui.merchant.eclats",
          "{n} éclats", { n: prix }))}</span>` +
      `</div>`;
    btn.innerHTML = html;
    btn.onclick = () => buyRelic(id);
    merchantRow.appendChild(btn);
  }

  const reroll = document.createElement("button");
  reroll.className = "ghost";
  reroll.textContent = tf("ui.merchant.reroll", "Relancer ({n} éclats)",
    { n: merchantState.rerollCost });
  reroll.disabled = merchantState.done || epuise
    || merchantState.eclats < merchantState.rerollCost;
  reroll.onclick = () => {
    ws.send(JSON.stringify({ t: "rerollRelic" }));
  };
  merchantRow.appendChild(reroll);

  const passer = document.createElement("button");
  passer.className = "ghost";
  passer.textContent = epuise
    ? t("ui.merchant.done", "Terminer")
    : t("ui.merchant.skip", "Passer");
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
    ? tf("ui.wait.players", "en attente de {qui}…", { qui: names.join(", ") })
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
  const span = merchantState.deadline - merchantState.from;
  const k = span > 0
    ? Math.max(0, Math.min(1, (merchantState.deadline - Date.now()) / span))
    : 0;
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
/* Le ban est PAR MANCHE (decision du porteur, 2026-08-19) : la carte ne
   reviendra plus dans les tirages de CETTE manche, et c'est tout — plus
   d'ecriture au compte, plus d'avertissement de derniere variante a vie. Il
   coute quand meme la phase de choix, d'ou la confirmation. */
function banCard(id) {
  if (!cardsState || cardsState.picked) return;
  const card = CARD_BY_ID.get(id);
  if (!card) return;
  const closure = banClosure(id);
  let msg = tf("ui.ban.ask", "Bannir « {nom} » ?", { nom: cardNom(id) }) + "\n\n"
    + t("ui.ban.warn",
        "Cette carte ne sera plus proposée pendant CETTE manche, et tu ne "
        + "recevras pas de carte de remplacement pour cette apparition.");
  const entrained = closure.filter(bid => bid !== id);
  if (entrained.length > 0) {
    msg += "\n\n" + t("ui.ban.closure",
      "Bannies avec elle (elles dépendent de celle-ci) :") + "\n— "
      + entrained.map(bid => cardNom(bid) || bid).join("\n— ");
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
    ? ` — ` + tf("ui.cards.more", "encore {n} choix après celui-ci", { n: cardsState.more })
    : "";
  const niveau = tf("ui.cards.level", "niveau {n}", { n: cardsState.level });
  cardsTitle.textContent = cardsState.bossWave
    ? tf("ui.cards.title.boss", "{boss} vaincu — {niveau}", {
        boss: `${bossNom(cardsState.bossKind).toUpperCase()} `
          + `${ROMAN[cardsState.boss] ?? cardsState.boss}`, niveau }) + suite
    : tf("ui.cards.title.segment", "{etape} — {niveau}",
        { etape: segmentName(cardsState.segment), niveau }) + suite;

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
        `<span class="cardName">${escapeHtml(cardNom(c.id))}</span>` +
      `</div>` +
      `<div class="cardMeta">` +
        `<span class="cardRarity">${escapeHtml(rarityLabel(c.rarity))}</span>` +
        (d?.famille ? `<span class="cardFamily">${escapeHtml(d.famille)}</span>` : "") +
      `</div>` +
      (d ? `<div class="cardCat">` +
        `<span class="catDot" style="background:${CARD_CATEGORY_COLOR[d.categorieId]}"></span>` +
        `<span class="catName" style="color:${CARD_CATEGORY_COLOR[d.categorieId]}">` +
          `${escapeHtml(d.categorie)}</span>` +
        `<span class="catRank">${escapeHtml(d.rang)}</span>` +
      `</div>` : "") +
      `<div class="cardBody">` +
        `<div class="cardMain">${escapeHtml(cardDesc(c.id))}</div>` +
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

    // Le ban est libre depuis qu'il est par manche (2026-08-19) : plus
    // d'achat confort qui le debloque.
    if (!cardsState.picked) {
      const ban = document.createElement("span");
      ban.className = "cardBan";
      ban.textContent = t("ui.cards.ban", "bannir");
      ban.setAttribute("role", "button");
      ban.title = t("ui.cards.ban.title",
        "retirer cette carte du tirage pour le reste de la manche");
      ban.onclick = ev => { ev.stopPropagation(); banCard(c.id); };
      btn.appendChild(ban);
    }
    cardsRow.appendChild(btn);
  }

  if (cardsState.reroll && !cardsState.picked) {
    const rb = document.createElement("button");
    rb.id = "cardsReroll";
    const reste = cardsState.reroll | 0;
    rb.innerHTML = `↻<br>${escapeHtml(t("ui.cards.reroll", "relancer<br>le tirage"))}`
      + `${reste > 1 ? ` (${reste})` : ""}`;
    rb.title = reste > 1
      ? tf("ui.cards.reroll.left", "{n} relances restantes pour cette manche", { n: reste })
      : t("ui.cards.reroll.last", "dernière relance de la manche");
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
  cardsWaitEl.textContent = names.length
    ? tf("ui.wait.players", "en attente de {qui}…", { qui: names.join(", ") })
    : "";
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
  // une portee absente ou nulle vide la jauge, elle ne la laisse pas PLEINE :
  // une barre qui ne descend pas ment sur le temps qui reste.
  const span = cardsState.deadline - cardsState.from;
  const k = span > 0
    ? Math.max(0, Math.min(1, (cardsState.deadline - Date.now()) / span))
    : 0;
  cardsTimerFill.style.width = `${k * 100}%`;
  cardsTimerEl.classList.toggle("urgent", k < 0.25);
}

export function setBoardData(v) { boardData = v; }
export function setBriefWaiting(v) { briefWaiting = v; }
export function setLaunchEndsAt(v) { launchEndsAt = v; }
export function setMyPing(v) { myPing = v; }
export function setSettingsFrom(v) { settingsFrom = v; }

/* --- LE CODEX -------------------------------------------------------------

   CE QU ON A RENCONTRE, ET RIEN DE PLUS. Une fiche s ouvre a la RENCONTRE et pas
   a la victoire — un boss qui vous tue doit entrer au codex, sinon le seul
   moyen d ouvrir sa page serait de ne jamais perdre contre lui.

   LE « ? » N EST PAS UNE CASE VIDE. Il garde la place, la forme et le rang de la
   fiche qu il cache : on voit donc TOUJOURS combien il en reste et ou elles sont.
   Une grille qui n afficherait que le connu ne dirait pas qu il manque quelque
   chose — c est la difference entre une collection et une liste.

   AUCUN CHIFFRE DE COMBAT ICI. Le codex dit ce qu une creature EST et ce qu elle
   FAIT ; ses points de vie et ses degats appartiennent a l equilibrage et
   changeraient sous le texte. `roleDe()` porte le comportement, et il se DEDUIT
   de la fiche de combat — donc il suit un reglage tout seul. */
/* LA VIGNETTE, ET ELLE VIENT DE LA MEME MAIN QUE LE JEU. Une fiche qui nommerait
   sans montrer demande au joueur de se souvenir d une silhouette ; or c est
   precisement ce que le depot travaille — « un corps se reconnait sans sa
   couleur ». La montrer ici est donc la suite de cette regle, pas une decoration.

   DEUX CHEMINS PARCE QU IL Y A DEUX NATURES. Un corps de horde est CUIT DANS
   L ATLAS, a sa taille reelle : `drawSprite` a l echelle 1 rend donc les tailles
   RELATIVES justes, un colosse est plus gros qu un rampant sans qu on l ecrive.
   Un boss n est pas dans l atlas — son corps est un trace —, d ou
   `portraitBoss`, qui detourne le `ctx` du module comme le fait deja
   `bossSheet()`.

   ELLE SE PEINT APRES `innerHTML` : une balise `<canvas>` dans une chaine n a pas
   de contexte tant qu elle n est pas dans le document. */
const CODEX_VIGNETTE = 72;
function peindreVignettes(racine) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  for (const cv of racine.querySelectorAll("canvas.codexVisuel")) {
    const T = CODEX_VIGNETTE;
    cv.width = Math.round(T * dpr);
    cv.height = Math.round(T * dpr);
    cv.style.width = T + "px";
    cv.style.height = T + "px";
    const g = cv.getContext("2d");
    if (!g) continue;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    try {
      const e = cv.dataset.e, b = cv.dataset.b;
      if (e !== undefined) {
        const k = T / SPRITE_CELL;
        drawSprite(g, frameOf(`e${e}_idle`), T / 2, T / 2, { scaleX: k, scaleY: k });
      } else if (b !== undefined) {
        portraitBoss(g, Number(b), T);
      }
    } catch (err) {
      // une vignette qui echoue ne doit pas emporter la grille : la fiche reste
      // lisible sans elle, et l erreur se raconte.
      signalerErreur("codex", err?.message ?? String(err), err?.stack);
    }
  }
}
function carteCodex(ouverte, nom, sous, lignes, vis = "") {
  if (!ouverte) {
    return `<div class="codexCarte closed" aria-hidden="true">`
      + `<div class="codexMarque">?</div></div>`;
  }
  return `<div class="codexCarte">`
    + (vis ? `<canvas class="codexVisuel" ${vis} aria-hidden="true"></canvas>` : "")
    + `<div class="codexTexte">`
    + `<div class="codexNom">${escapeHtml(nom)}</div>`
    + (sous ? `<div class="codexSous">${escapeHtml(sous)}</div>` : "")
    + (lignes.length
        ? `<ul class="codexRoles">`
          + lignes.map(l => `<li>${escapeHtml(l)}</li>`).join("")
          + `</ul>`
        : "")
    + `</div></div>`;
}

/* UNE PUCE PAR ENTREE, DANS L ORDRE DU CATALOGUE. L ordre compte : il est
   stable d une visite a l autre, donc un trou reste au meme endroit et se
   remarque. Trier par « obtenu d abord » ferait bouger la grille a chaque
   decouverte et effacerait cette lecture. */
function puces(liste, cleDe, nomDe) {
  const vus = new Set(progressState?.vus ?? []);
  return liste.map(x => vus.has(cleDe(x))
    ? `<span class="codexPuce">${escapeHtml(nomDe(x))}</span>`
    : `<span class="codexPuce closed" aria-hidden="true">?</span>`).join("");
}

export function renderCodex() {
  if (!codexEl || codexEl.hidden) return;
  const vus = new Set(progressState?.vus ?? []);

  codexHordeEl.innerHTML = ENEMY_TYPES.map((def, i) => {
    const ouverte = vus.has(`e:${def.key}`);
    return carteCodex(ouverte, enemyNom(def.key), enemyLore(def.key), roleDe(def),
                      `data-e="${i}"`);
  }).join("");
  peindreVignettes(codexHordeEl);

  /* LE BOSS N A RIEN A ECRIRE : sa fiche existe deja dans `BOSS_ROSTER`. `sous`
     est la consigne que le jeu affiche a son arrivee, `verbe` l axe qu il
     enseigne — les deux etaient ecrits pour l annonce, ils disent exactement ce
     qu un codex doit dire. Un second texte les aurait fait diverger. */
  codexBossEl.innerHTML = BOSS_ROSTER.map((b, i) => {
    const ouverte = vus.has(`b:${b.key}`);
    return carteCodex(ouverte, bossNom(i), bossSous(i), [bossVerbe(i)].filter(Boolean),
                      `data-b="${i}"`);
  }).join("");
  peindreVignettes(codexBossEl);

  /* CARTES ET RELIQUES EN PUCES, PAS EN FICHES, et ce n est pas une economie
     de place : leur texte EXISTE DEJA — au tirage, chez le marchand, sur
     l ecran de build. Le repeter ici en ferait une troisieme copie a tenir a
     jour, et c est exactement ce que ce depot refuse partout ailleurs.
     Ce que le codex apporte pour elles est ce qu aucun autre ecran ne dit :
     COMBIEN il en reste, et lesquelles. Une puce suffit a ca.

     La fiche reste riche pour les creatures parce que la, l information
     n existe nulle part ailleurs : rien dans le jeu ne nomme un Pavois. */
  codexCartesEl.innerHTML = puces(CARDS, c => `c:${c.id}`, c => cardNom(c.id));
  codexReliquesEl.innerHTML = puces(RELICS, r => `r:${r.id}`, r => relicNom(r.id));

  const total = codexClefs().length;
  const n = codexClefs().filter(c => vus.has(c)).length;
  codexCompteEl.textContent = tf("ui.codex.compte", "{n} / {tot} rencontrés",
    { n, tot: total });
}

function openCodex() {
  panel.hidden = true;
  codexEl.hidden = false;
  renderCodex();
  syncTopbar();
}

codexBtn.onclick = openCodex;
codexCloseBtn.onclick = () => {
  codexEl.hidden = true;
  refreshPanel();
  syncTopbar();
};
