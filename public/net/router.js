
import { playSound } from "/audio.js";
import { showHud } from "/hud.js";
import { PERF, PHASE_LOBBY, PHASE_ROUND, amSpectator, cardsPending, cardsState, connected, difficulty, hostId, inRoom, joinAttempt, lastResult, latest, loadouts, lobby, merchantState, merchantWait, metaClsOverride, myId, myPseudo, myVote, pauseReal, pendingAuth, pendingRejoin, phase, predicted, progressState, refreshLocalMods, relicsByPlayer, roomNameCur, roomsList, roundHistory, roundNumber, serverCommit, serverVersion, setAmSpectator, setCardsPending, setCardsState, setConnected, setDifficulty, setHostId, setInRoom, setJoinAttempt, setLastResult, setLatest, setLoadouts, setLobby, setMerchantState, setMerchantWait, setMetaClsOverride, setMyId, setMyPseudo, setMyVote, setPauseReal, setPendingAuth, setPendingRejoin, setPhase, setPredicted, setProgressState, setRelicsByPlayer, setRoomNameCur, setRoomsList, setRoundHistory, setRoundNumber, setServerCommit, setServerVersion, setSnapshots, setTally, setWs, snapshots, tally, viderErreurs, ws } from "../core/state.js";
import { ingest } from "./ingest.js";
import { netPerfBoundary, pushAlert, pushWorld, screenCloseQueued, setScreenCloseQueued, worldQueue } from "./interp.js";
import { applyPalette, biomeIndex, biomeSeed, rebuildBiome, setBiomeIndex, setBiomeSeed } from "../render/stage.js";
import { resetFeedback } from "../render/world.js";
import { renderGateMode, renderGateSwitch, renderServerInfo } from "../ui/boot.js";
import { closeBuild } from "../ui/build.js";
import { gate, gateHold, gateHoldMsgEl, gateWho, goBtn, hubPassAskEl, hubPassAskInput, hubPassAskWhoEl, hubResumeEl, hubScreenEl, loadingEl, menuEl, panel, passNewInput, passOldInput, pauseEl, registerFormEl, setGateBusy, setStatus, settingsEl, updateTrace, updateVersion, waitMsg } from "../ui/dom.js";
import { closePause, renderPauseState } from "../ui/pause.js";
import { boardData, briefWaiting, closeBilan, closeBrief, closeCards, closeFin, closeMerchant, enterHub, hubStatus, launchEndsAt, myPing, openBrief, openFin, passMsg, refreshPanel, renderBoard, renderBriefWait, renderCards, renderCardsWait, renderLaunch, renderMerchant, renderMerchantWait, renderMeta, renderResume, renderRooms, renderTopPing, setBoardData, setBriefWaiting, setLaunchEndsAt, setMyPing, setSettingsFrom, settingsFrom, showBilan, updateTerminalDot } from "../ui/screens.js";

// LA MESURE S'ARME PAR L'URL : elle sert a enregistrer de VRAIES parties pour
// l'equilibrage, donc elle ne doit couter aucun clic a personne — et surtout
// pas vivre dans un menu ou on l'oublierait armee.
const MESURE = location.search.includes("mesure");

export function connect() {
  setStatus("connexion…");
  setGateBusy(true);

  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  setWs(new WebSocket(`${proto}//${location.host}`));

  ws.onopen = () => {
    if (pendingAuth) ws.send(JSON.stringify(pendingAuth));
    viderErreurs();
  };

  ws.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }

    switch (msg.t) {
      case "welcome":
        setMyId(msg.id);
        setConnected(true);
        setPendingAuth(null);
        setGateBusy(false);
        setStatus("");
        setInRoom(false);
        setServerVersion(msg.version ?? null);
        setServerCommit(msg.commit ?? "");
        updateVersion();
        setPendingRejoin(msg.rejoin ?? null);
        localStorage.setItem("survivor.pseudo", msg.pseudo ?? "");
        setMyPseudo(msg.pseudo ?? "");
        if (msg.token) localStorage.setItem("survivor.token", msg.token);
        if (msg.dup) {
          loadingEl.hidden = true;
          gate.hidden = false;
          gateWho.hidden = true;
          gateHoldMsgEl.hidden = false;
          gateHoldMsgEl.textContent =
            "Ta progression restera temporaire sur cet onglet : elle ne sera pas "
            + "enregistrée sur le compte.";
          gateHold.hidden = false;
        } else {
          gate.hidden = true;
          enterHub();
        }
        break;

      case "rooms":
        setRoomsList(msg.rooms ?? []);
        renderRooms();
        renderResume();
        break;

      case "leaderboard":
        setBoardData(msg.board ?? null);
        renderBoard();
        break;

      case "roomJoined":
        setInRoom(true);
        if (MESURE) ws.send(JSON.stringify({ t: "trace", on: 1 }));
        setPendingRejoin(null);
        hubResumeEl.hidden = true;
        setJoinAttempt(null);
        hubPassAskEl.hidden = true;
        hubPassAskInput.value = "";
        setRoomNameCur(msg.name ?? "");
        setHostId(msg.host);
        setPhase(msg.phase);
        setRoundNumber(msg.round ?? 0);
        setAmSpectator(msg.spectator);
        hubScreenEl.hidden = true;
        hubStatus("");
        refreshPanel();
        break;

      case "joinRoomError": {
        setPendingRejoin(null);
        hubResumeEl.hidden = true;
        if (msg.motif === "motdepasse" && joinAttempt) {
          const retry = !hubPassAskEl.hidden;
          hubPassAskWhoEl.textContent = `« ${joinAttempt.name} » demande un mot de passe.`;
          hubPassAskEl.hidden = false;
          hubPassAskInput.value = "";
          hubPassAskInput.focus();
          hubStatus(retry ? "Mot de passe incorrect." : "", retry);
          break;
        }
        const MOTIFS = {
          pleine: "salle pleine — attends qu'une place se libère, ou crée la tienne",
          disparue: "cette salle n'existe plus — actualise la liste",
          motdepasse: "mot de passe incorrect",
          plafond: "plafond de salles atteint — rejoins une salle existante",
        };
        hubStatus(MOTIFS[msg.motif] ?? "impossible de rejoindre cette salle", true);
        break;
      }

      case "roomClosed":
        setInRoom(false);
        updateTrace(false, "");
        setRoomNameCur("");
        setPhase(PHASE_LOBBY);
        setLastResult(null);
        setSnapshots([]);
        setLatest(null);
        setPredicted(null);
        worldQueue.length = 0;
        setScreenCloseQueued(false);
        resetFeedback();
        closeBrief();
        closeCards();
        closeMerchant();
        closeBilan();
        closeFin();
        closeBuild();
        closePause();
        showHud(false);
        panel.hidden = true;
        if (menuEl) menuEl.hidden = true;
        if (settingsEl) settingsEl.hidden = true;
        setSettingsFrom(null);
        enterHub();
        if (msg.why === "erreur interne") {
          hubStatus("la salle a été fermée sur une erreur — désolé", true);
        }
        break;

      case "progress":
        setProgressState(msg);
        renderMeta();
        updateTerminalDot();
        break;

      case "authError":
        setPendingAuth(null);
        setGateBusy(false);
        if (msg.motif === "jeton" || msg.motif === "reset") {
          localStorage.removeItem("survivor.token");
        }
        if (connected) {
          passMsg(msg.msg ?? "refusé", true);
          break;
        }
        loadingEl.hidden = true;
        gate.hidden = false;
        renderGateMode();
        setStatus(msg.motif === "jeton"
          ? "session expirée — tape ton mot de passe" : (msg.msg ?? ""),
          msg.motif !== "jeton" ? true : false);
        if (msg.fatal) ws.close();
        break;

      case "passChanged":
        passMsg("mot de passe changé", false);
        passOldInput.value = "";
        passNewInput.value = "";
        break;

      case "loggedOut":
        localStorage.removeItem("survivor.token");
        localStorage.removeItem("survivor.pseudo");
        ws.close();
        break;

      // DEUX `case "lobby"` COHABITAIENT DANS CE SWITCH depuis le decoupage du
      // client : JS retient le PREMIER, donc celui qui differait par la file du
      // monde etait mort, et le vivant tombait sans `break` dans `serverInfo`
      // — d'ou un `rtt` indefini a chaque salon. L'invariant du depot est celui
      // du bloc mort : le salon porte `phase`, applique avant `roundEnd` il
      // ouvrirait le salon 110 ms avant le bilan.
      case "lobby": {
        const appliquer = () => {
          setLobby(msg.players);
          setHostId(msg.host);
          setPhase(msg.phase);
          setRoundNumber(msg.round);
          setRoomNameCur(msg.roomName ?? roomNameCur);
          setDifficulty(msg.difficulty ?? difficulty);
          if (msg.biome !== undefined) {
            setBiomeIndex(msg.biome);
            setBiomeSeed(msg.seed ?? biomeSeed);
            rebuildBiome(phase === PHASE_ROUND ? difficulty : msg.difficulty ?? difficulty);
          }
          setTally(msg.tally ?? tally);
          setRoundHistory(msg.history ?? []);
          updateTrace(msg.trace === 1, msg.tracePar ?? "");
          const mine = msg.players?.find(p => p.id === myId);
          if (mine && mine.ping !== undefined) { setMyPing(Number(mine.ping)); renderTopPing(); }
          setMyVote(lobby.find(l => l.id === myId)?.vote ?? myVote);
          setAmSpectator(lobby.find(l => l.id === myId)?.spectator ?? false);
          refreshPanel();
        };
        if (worldQueue.length > 0) pushWorld(appliquer);
        else appliquer();
        break;
      }

      case "serverInfo":
        renderServerInfo(msg);
        break;

      case "traceState":
        updateTrace(msg.on === 1, msg.par ?? "");
        break;

      case "round":
        pushWorld(() => {
          setRoundNumber(msg.round);
          setDifficulty(msg.difficulty ?? difficulty);
          applyPalette(difficulty);
          rebuildBiome(difficulty);
          setPhase(PHASE_ROUND);
          setLaunchEndsAt(0);
          setAmSpectator(false);
          setLastResult(null);
          setSnapshots([]);
          setLatest(null);
          setPredicted(null);
          resetFeedback();
          if (PERF) netPerfBoundary();
          setLoadouts(new Map());
          refreshLocalMods();
          closeCards();
          closeMerchant();
          closeBilan();
          closeFin();
          closeBuild();
          closePause();
          refreshPanel();
          playSound("lancement");
          openBrief(msg.warmup);
        });
        break;

      case "launch": {
        const d = Number(msg.delay) || 0;
        setLaunchEndsAt(d > 0 ? performance.now() + d * 1000 : 0);
        renderLaunch();
        if (!d && msg.why) waitMsg.textContent = `Lancement annulé — ${msg.why}.`;
        break;
      }

      case "briefState":
        setBriefWaiting(Array.isArray(msg.waiting) ? msg.waiting : []);
        renderBriefWait();
        break;

      case "roundAbort":
        pushWorld(() => {
          setPhase(PHASE_LOBBY);
          setLastResult(null);
          setSnapshots([]);
          setLatest(null);
          setPredicted(null);
          resetFeedback();
          closeBrief();
          closeCards();
          closeMerchant();
          closeBilan();
          closeFin();
          closeBuild();
          closePause();
          refreshPanel();
        });
        break;

      case "roundEnd":
        pushWorld(() => {
          setPhase(PHASE_LOBBY);
          setHostId(msg.host);
          setLastResult(msg);
          resetFeedback();
          closeBrief();
          closeCards();
          closeMerchant();
          closeBuild();
          closePause();
          openFin(msg);
          refreshPanel();
        });
        break;

      case "state":
        ingest(msg);
        if ((cardsState || merchantState) && !screenCloseQueued) {
          setScreenCloseQueued(true);
          pushWorld(() => { setScreenCloseQueued(false); closeCards(); closeMerchant(); });
        }
        break;

      case "alert":
        pushAlert(msg);
        break;

      case "cards":
        pushWorld(() => {
          setCardsState({
            segment: msg.segment ?? 0, bossWave: msg.bossWave === 1, boss: msg.boss ?? 0,
            bossKind: msg.bossKind ?? 0,
            level: msg.level, more: msg.more ?? 0,
            deadline: msg.deadline, offers: msg.offers,
            reroll: msg.reroll === 1,
            picked: false, pickedId: null,
            from: Date.now(),
          });
          setCardsPending([]);
          renderCards();
        });
        break;

      case "cardsWait":
        pushWorld(() => {
          setCardsPending(msg.pending ?? []);
          renderCardsWait();
        });
        break;

      case "merchant":
        pushWorld(() => {
          setMerchantState({
            wave: msg.wave ?? 0,
            deadline: msg.deadline,
            eclats: msg.eclats ?? 0,
            rerollCost: msg.rerollCost ?? 0,
            achats: msg.achats ?? 1,
            offers: msg.offers ?? [],
            done: false,
            from: Date.now(),
          });
          setMerchantWait([]);
          renderMerchant();
        });
        break;

      case "merchantWait":
        pushWorld(() => {
          setMerchantWait(msg.pending ?? []);
          renderMerchantWait();
        });
        break;

      case "paused":
        setPauseReal(msg.on === 1);
        if (!pauseEl.hidden) renderPauseState();
        break;

      case "loadout":
        setLoadouts(new Map(Object.entries(msg.byPlayer).map(([id, arr]) => [Number(id), arr])));
        setRelicsByPlayer(new Map(
          Object.entries(msg.relics ?? {}).map(([id, arr]) => [Number(id), arr])));
        refreshLocalMods();
        break;

      case "full":
        setStatus(`partie pleine (${msg.max} joueurs)`, true);
        goBtn.disabled = false;
        break;
    }
  };

  ws.onerror = () => {
    loadingEl.hidden = true;
    gate.hidden = false;
    setStatus("serveur injoignable", true);
    setGateBusy(false);
  };

  ws.onclose = () => {
    setConnected(false);
    setMetaClsOverride(null);
    setInRoom(false);
    setRoomNameCur("");
    setRoomsList([]);
    setPendingRejoin(null);
    hubResumeEl.hidden = true;
    hubScreenEl.hidden = true;
    worldQueue.length = 0;
    setScreenCloseQueued(false);
    if (PERF) netPerfBoundary();
    panel.hidden = true;
    menuEl.hidden = true;
    renderGateMode();
    renderGateSwitch(!registerFormEl.hidden);
    renderServerInfo(null);
    gate.hidden = false;
    showHud(false);
    setGateBusy(false);
    closeCards();
    closeMerchant();
    closeBilan();
    closeFin();
    closeBuild();
    closePause();
    updateVersion();
    if (localStorage.getItem("survivor.pseudo") || pendingAuth) {
      setStatus("connexion perdue", true);
    } else {
      setStatus("");
    }
  };
}
