
import { playSound } from "/audio.js";
import { pousserHautFait, showHud } from "/hud.js";
import { t, tf } from "/shared/i18n.js";
import { setCustomChoix, traceOn, setTrace, setRapport, PERF, PHASE_LOBBY, PHASE_ROUND, amSpectator, cardsPending, cardsState, connected, difficulty, hostId, inRoom, joinAttempt, lastResult, latest, loadouts, lobby, merchantState, merchantWait, metaClsOverride, myId, myPseudo, myVote, pauseReal, pendingAuth, pendingRejoin, phase, predicted, progressState, refreshLocalMods, relicsByPlayer, roomNameCur, roomsList, roundHistory, roundNumber, serverCommit, serverVersion, setAmSpectator, setCardsPending, setCardsState, setConnected, setDifficulty, setHostId, setInRoom, setJoinAttempt, setLastResult, setLatest, setLoadouts, setLobby, setMerchantState, setMerchantWait, setMetaClsOverride, setMyId, setMyPseudo, setMyVote, setPauseReal, setPendingAuth, setPendingRejoin, setPhase, setPredicted, setProgressState, setRelicsByPlayer, setRoomNameCur, setRoomsList, setRoundHistory, setRoundNumber, setServerCommit, setServerVersion, setSnapshots, setTally, setWs, snapshots, tally, viderErreurs, ws } from "../core/state.js";
import { ingest } from "./ingest.js";
import { netPerfBoundary, pushAlert, pushWorld, screenCloseQueued, setAlertInfo, setScreenCloseQueued, worldQueue } from "./interp.js";
import { hfNom } from "/shared/hauts_faits.js";
import { applyPalette, biomeIndex, biomeSeed, rebuildBiome, setBiomeIndex, setBiomeSeed } from "../render/stage.js";
import { fermerReleve, relevesSeg, resetFeedback } from "../render/world.js";
import { renderGateMode, renderGateSwitch, renderServerInfo } from "../ui/boot.js";
import { closeBuild } from "../ui/build.js";
import { gate, gateHold, gateHoldMsgEl, gateWho, goBtn, hubPassAskEl, hubPassAskInput, hubPassAskWhoEl, hubResumeEl, hubScreenEl, loadingEl, menuEl, panel, passNewInput, passOldInput, registerFormEl, setGateBusy, setStatus, settingsEl, updateTrace, updateVersion, waitMsg } from "../ui/dom.js";
import { applyPause, closePause, setPausePar } from "../ui/pause.js";
import { boardData, briefWaiting, closeBilan, closeBrief, closeCards, closeFin, closeMerchant, enterHub, hubStatus, launchEndsAt, myPing, openBrief, openFin, passMsg, refreshPanel, renderBoard, renderBriefWait, renderCards, renderCardsWait, renderLaunch, renderMerchant, renderMerchantWait, renderCodex, renderMeta, renderHautsFaits, setArmeEtat, renderResume, renderRooms, renderTopPing, setBoardData, setBriefWaiting, setLaunchEndsAt, setMyPing, setSettingsFrom, settingsFrom, showBilan, updateTerminalDot } from "../ui/screens.js";

/* Le serveur envoie un CODE ; sa phrase francaise, quand il en met une, n'est
   plus qu'un repli pour un motif que le client ne connait pas. */
/* ON N'ENVOIE QUE SI LA SALLE MESURE : le releve tourne toujours, mais un
   message par segment sur une manche non tracee serait du bruit reseau pour
   personne. */
function viderReleves() {
  if (relevesSeg.length === 0) return;
  if (!traceOn) { relevesSeg.length = 0; return; }
  const lot = relevesSeg.splice(0, relevesSeg.length);
  ws.send(JSON.stringify({ t: "releve", fenetres: lot }));
}

function authTexte(msg) {
  const repli = msg.msg ?? t("ui.auth.refuse", "refusé");
  return msg.motif ? t(`ui.auth.${msg.motif}`, repli) : repli;
}

const LAUNCH_CANCEL = {
  etat: ["ui.launch.etat", "la salle a changé d'état"],
  arrivee: ["ui.launch.arrivee", "un joueur vient d'arriver — confirmez pour lancer"],
  pasPret: ["ui.launch.pasPret", "{qui} n'est plus prêt"],
  clic: ["ui.launch.clic", "annulé par {qui}"],
};
function launchCancelText(msg) {
  const e = LAUNCH_CANCEL[msg.why];
  const raison = e ? tf(e[0], e[1], { qui: msg.qui ?? "" }) : String(msg.why);
  return tf("ui.launch.annule", "Lancement annulé — {raison}.", { raison });
}

export function connect() {
  setStatus(t("ui.net.connecting", "connexion…"));
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
          gateHoldMsgEl.textContent = t("ui.gate.hold.temp",
            "Ta progression restera temporaire sur cet onglet : elle ne sera pas "
            + "enregistrée sur le compte.");
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
          hubPassAskWhoEl.textContent = tf("ui.hub.passask.who",
            "« {nom} » demande un mot de passe.", { nom: joinAttempt.name });
          hubPassAskEl.hidden = false;
          hubPassAskInput.value = "";
          hubPassAskInput.focus();
          hubStatus(retry ? t("ui.hub.err.badpass", "Mot de passe incorrect.") : "", retry);
          break;
        }
        const MOTIFS = {
          pleine: "salle pleine — attends qu'une place se libère, ou crée la tienne",
          disparue: "cette salle n'existe plus — actualise la liste",
          motdepasse: "mot de passe incorrect",
          plafond: "plafond de salles atteint — rejoins une salle existante",
        };
        hubStatus(MOTIFS[msg.motif]
          ? t(`ui.hub.join.${msg.motif}`, MOTIFS[msg.motif])
          : t("ui.hub.join.autre", "impossible de rejoindre cette salle"), true);
        break;
      }

      case "roomClosed":
        setInRoom(false);
        setTrace(false, "");
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
        if (msg.why === "erreur") {
          hubStatus(t("ui.hub.roomerr",
            "la salle a été fermée sur une erreur — désolé"), true);
        }
        break;

      case "progress":
        setProgressState(msg);
        // le bilan arrive avec la manche : les hauts faits gagnes a la fin
        // passent par la meme file que le reste
        for (const id of msg.gagnes ?? []) pousserHautFait(id);
        renderMeta();
        renderHautsFaits();
        // le codex se rafraichit AUSSI : ouvert pendant qu une manche se termine,
        // il restait sur ses « ? ». La garde `hidden` est dans `renderCodex`.
        renderCodex();
        updateTerminalDot();
        break;

      case "armes":
        setArmeEtat(msg);
        break;

      case "hautFait":
        for (const id of msg.ids ?? []) pousserHautFait(id);
        break;

      // en cooperatif, seuls TES hauts faits produisent un bandeau : ceux des
      // allies passent en une ligne dans le fil d'evenements
      // `applyAlert` reste reserve aux trois tables du serveur (event, mech,
      // meteo) : cette ligne est un texte CLIENT, elle se pose directement.
      case "hautFaitAllie": {
        const maintenant = performance.now();
        setAlertInfo({
          nom: t("ui.hf.obtenu", "haut fait"),
          texte: tf("ui.hf.allie", "{qui} — {quoi}",
            { qui: msg.qui ?? "", quoi: (msg.ids ?? []).map(hfNom).join(", ") }),
          from: maintenant, until: maintenant + 3200, forme: "",
        });
        break;
      }

      case "authError":
        setPendingAuth(null);
        setGateBusy(false);
        if (msg.motif === "jeton" || msg.motif === "reset") {
          localStorage.removeItem("survivor.token");
        }
        if (connected) {
          passMsg(authTexte(msg), true);
          break;
        }
        loadingEl.hidden = true;
        gate.hidden = false;
        renderGateMode();
        setStatus(msg.motif === "jeton"
          ? t("ui.auth.jeton.gate", "session expirée — tape ton mot de passe")
          : authTexte(msg),
          msg.motif !== "jeton");
        if (msg.fatal) ws.close();
        break;

      case "passChanged":
        passMsg(t("ui.auth.passChanged", "mot de passe changé"), false);
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
          setTrace(msg.trace === 1, msg.tracePar ?? "");
          updateTrace(msg.trace === 1, msg.tracePar ?? "");
          // LE REGLAGE VIENT DU SERVEUR, PAS DE CE NAVIGATEUR : un joueur qui
          // rejoint doit voir les regles avant de se dire pret, et l hote reste
          // le seul a les poser.
          setCustomChoix(msg.custom ?? null);
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
        setTrace(msg.on === 1, msg.par ?? "");
        updateTrace(msg.on === 1, msg.par ?? "");
        refreshPanel();
        break;

      /* LA PAGE ARRIVE A TOUTE LA SALLE, et elle arrive AVANT le bilan : le
         serveur la produit a la fermeture de la trace, donc au meme instant que
         la fin de manche. On la garde, le bilan la montre. */
      case "rapport":
        setRapport(msg.texte ?? "");
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
        if (!d && msg.why) waitMsg.textContent = launchCancelText(msg);
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
        /* LA FIN DE MANCHE FERME LA FENETRE EN COURS, puis la file part. Une
           fenetre par segment est deja remontee au fil de l'eau : un client qui
           se deconnecte en cours de manche laisse ce qu'il a mesure au lieu de
           tout perdre. */
        fermerReleve();
        viderReleves();
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
        /* UNE FENETRE PART DES QU'ELLE EST FERMEE, pas a la fin de la manche : un
           client qui se deconnecte au segment 4 laisse ses trois premieres au
           lieu de tout perdre. Une fenetre par segment, donc au plus six envois. */
        if (relevesSeg.length > 0) viderReleves();
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
            // LE MESSAGE PORTE UNE DUREE, JAMAIS UNE ECHEANCE : une horloge de
            // machine en retard sur celle du serveur laissait la jauge pleine
            // alors que la manche avait DEJA repris, et le joueur mourait
            // devant son ecran de cartes.
            deadline: Date.now() + (msg.duree ?? 0), offers: msg.offers,
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
            deadline: Date.now() + (msg.duree ?? 0),
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
        setPausePar(msg.par ?? "");
        applyPause();
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
    // une pause survit a la socket sinon : `readMove()` la lit, et on revient
    // dans une manche ou le personnage refuse d'avancer.
    setPauseReal(false);
    setPausePar("");
    closePause();
    updateVersion();
    if (localStorage.getItem("survivor.pseudo") || pendingAuth) {
      setStatus("connexion perdue", true);
    } else {
      setStatus("");
    }
  };
}
