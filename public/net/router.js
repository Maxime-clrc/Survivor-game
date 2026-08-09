/* ===========================================================================
   ROUTEUR — la socket et le routage des messages
   Un client est en etat HUB ou en etat SALLE. Ce module ouvre la socket et
   distribue ; il ne dessine rien et ne decide rien.
   =========================================================================== */

import { playSound } from "/audio.js";
import { showHud } from "/hud.js";
import { PERF, PHASE_LOBBY, PHASE_ROUND, amSpectator, cardsPending, cardsState, connected, difficulty, hostId, inRoom, joinAttempt, lastResult, latest, loadouts, lobby, merchantState, merchantWait, metaClsOverride, myId, myPseudo, myVote, pauseReal, pendingAuth, pendingRejoin, phase, predicted, progressState, refreshLocalMods, relicsByPlayer, roomNameCur, roomsList, roundHistory, roundNumber, serverCommit, serverVersion, setAmSpectator, setCardsPending, setCardsState, setConnected, setDifficulty, setHostId, setInRoom, setJoinAttempt, setLastResult, setLatest, setLoadouts, setLobby, setMerchantState, setMerchantWait, setMetaClsOverride, setMyId, setMyPseudo, setMyVote, setPauseReal, setPendingAuth, setPendingRejoin, setPhase, setPredicted, setProgressState, setRelicsByPlayer, setRoomNameCur, setRoomsList, setRoundHistory, setRoundNumber, setServerCommit, setServerVersion, setSnapshots, setTally, setWs, snapshots, tally, viderErreurs, ws } from "../core/state.js";
import { ingest } from "./ingest.js";
import { netPerfBoundary, pushAlert, pushWorld, screenCloseQueued, setScreenCloseQueued, worldQueue } from "./interp.js";
import { applyPalette, biomeIndex, biomeSeed, rebuildBiome, setBiomeIndex, setBiomeSeed } from "../render/stage.js";
import { resetFeedback } from "../render/world.js";
import { renderGateMode, renderGateSwitch, renderServerInfo } from "../ui/boot.js";
import { closeBuild } from "../ui/build.js";
import { gate, gateHold, gateHoldMsgEl, gateWho, goBtn, hubPassAskEl, hubPassAskInput, hubPassAskWhoEl, hubResumeEl, hubScreenEl, loadingEl, menuEl, panel, passNewInput, passOldInput, pauseEl, registerFormEl, setGateBusy, setStatus, settingsEl, updateVersion, waitMsg } from "../ui/dom.js";
import { closePause, renderPauseState } from "../ui/pause.js";
import { boardData, briefWaiting, closeBilan, closeBrief, closeCards, closeMerchant, enterHub, hubStatus, launchEndsAt, myPing, openBrief, passMsg, refreshPanel, renderBoard, renderBriefWait, renderCards, renderCardsWait, renderLaunch, renderMerchant, renderMerchantWait, renderMeta, renderResume, renderRooms, renderTopPing, setBoardData, setBriefWaiting, setLaunchEndsAt, setMyPing, setSettingsFrom, settingsFrom, showBilan, updateTerminalDot } from "../ui/screens.js";

export function connect() {
  setStatus("connexion…");
  setGateBusy(true);

  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  setWs(new WebSocket(`${proto}//${location.host}`));

  ws.onopen = () => {
    if (pendingAuth) ws.send(JSON.stringify(pendingAuth));
    // Ce qui a casse avant la connexion part maintenant : le chargement est
    // justement le moment ou personne ne regarde la console.
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
        // La connexion tombe desormais sur le HUB, pas dans une partie : hote,
        // phase et statut de spectateur arriveront avec `roomJoined`.
        setInRoom(false);
        /* La version du serveur, envoyee une fois par connexion. `?? null` et
           non `?? VERSION` : un serveur d'avant ce lot ne l'envoie pas, et
           l'absence n'est pas un desaccord. */
        setServerVersion(msg.version ?? null);
        // Absent quand le serveur tourne hors d'un depot git : rien a afficher,
        // et surtout pas une parenthese vide.
        setServerCommit(msg.commit ?? "");
        updateVersion();
        setPendingRejoin(msg.rejoin ?? null);
        /* Le pseudo memorise est celui que le SERVEUR renvoie (casse
           canonique du compte), jamais la valeur tapee. Le jeton n'arrive
           que fraichement emis (register/login) : une reprise par jeton
           prolonge l'existant sans en changer. */
        localStorage.setItem("survivor.pseudo", msg.pseudo ?? "");
        // Retenu pour le classement (lot N) : c'est ce qui permet de surligner
        // sa propre ligne. La casse canonique du compte, jamais la valeur tapee.
        setMyPseudo(msg.pseudo ?? "");
        if (msg.token) localStorage.setItem("survivor.token", msg.token);
        /* Compte deja connecte ailleurs : on RESTE sur #gate, formulaire
           compris. L'avertissement se pose DESSOUS, comme la maquette — on
           vient de taper ses identifiants, masquer le formulaire donnerait
           l'impression que la connexion a echoue alors qu'elle a reussi. Le
           kicker de l'encart nomme le cas, la phrase dit la CONSEQUENCE avant
           le clic, et « Continuer quand même » la fait assumer.

           Un `gate.hidden = true` inconditionnel etait pose ici avec un `else`
           qui le refaisait : l'encart etait bien rempli, mais sur un ecran
           deja masque — l'avertissement n'a jamais ete visible. Decide sur CE
           DRAPEAU, jamais sur l'ordre d'arrivee des messages. */
        if (msg.dup) {
          /* LE GATE DOIT ETRE REAFFICHE. `bootOnce()` le cache pour montrer le
             chargement et ne le rend plus — ce sont les chemins de sortie qui
             s'en chargent. Le doublon est le seul chemin de SUCCES qui reste
             sur cet ecran, et l'oublier donnait un ecran entierement noir :
             plus de gate, pas encore de hub. */
          loadingEl.hidden = true;
          gate.hidden = false;
          // Le renvoi vers la creation de compte RESTE : le formulaire est
          // toujours la, on peut encore repartir sur un autre compte plutot
          // que d'assumer la session temporaire.
          // Une seule phrase dans l'encart : le kicker dit deja « compte déjà
          // connecté ailleurs », le repeter en dessous ne dirait rien de plus.
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

      /* Liste des salles. Poussee par le serveur a chaque changement
         d'effectif ou d'etat, et en reponse a `listRooms` : la version recue
         est TOUJOURS plus fraiche que l'affichee, on remplace sans comparer. */
      case "rooms":
        setRoomsList(msg.rooms ?? []);
        renderRooms();
        renderResume();
        break;

      /* Classement au temps (lot N). Message HORS-MONDE : il ne commente
         aucune image, il s'applique donc a la reception — comme le salon et la
         liste des salles, et contrairement a `cards` ou `merchant`. */
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

      /* Echec d'entree en salle. `pleine` et `disparue` arrivent au meme
         moment (fin de manche, salle qui se vide ou se remplit pendant qu'on
         lit la liste) et la conduite a tenir differe : reessayer, ou creer la
         sienne — d'ou un motif distinct plutot qu'un texte unique. */
      case "joinRoomError": {
        setPendingRejoin(null);
        hubResumeEl.hidden = true;
        /* `motdepasse` ouvre l'encart de saisie sous la liste : le premier
           clic sur une salle protegee tente l'entree SANS mot de passe (un
           membre connu re-entre directement), et c'est ce refus qui fait
           apparaitre le champ — jamais un champ affiche d'avance. */
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

      /* Retour au hub, volontaire (leaveRoom) ou subi (salle fermee sur
         erreur). Meme nettoyage qu'une fin de connexion, sans toucher a la
         socket : l'etat de manche appartient a la salle qu'on vient de
         quitter. */
      case "roomClosed":
        setInRoom(false);
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
        closeBuild();
        closePause();
        showHud(false);
        panel.hidden = true;
        /* Le Terminal et les Parametres se ferment ICI aussi, et ce n'est pas
           une redite de `goHome()` : on sort d'une salle par bien d'autres
           chemins — `#panelLeave`, le bouton du bilan, une salle fermee sur
           erreur, une exclusion. Tous aboutissent a ce message, et aucun ne
           doit laisser un ecran de salle peint par-dessus le hub. `settingsFrom`
           part avec eux : il pointe sur le salon qu'on vient de quitter. */
        if (menuEl) menuEl.hidden = true;
        if (settingsEl) settingsEl.hidden = true;
        setSettingsFrom(null);
        enterHub();
        if (msg.why === "erreur interne") {
          hubStatus("la salle a été fermée sur une erreur — désolé", true);
        }
        break;

      /* Etat du compte de progression (lot D) : envoye a la connexion, apres
         chaque achat et apres chaque fin de manche. */
      case "progress":
        setProgressState(msg);
        renderMeta();
        updateTerminalDot();
        break;

      /* Echec d'authentification. Deux cas se traitent sans bruit : un jeton
         expire (`jeton` — cas NORMAL, on retombe sur les formulaires) et la
         remise a zero admin (`reset` — le compte n'existe plus, le jeton non
         plus). Le reste s'affiche tel quel. `fatal` : cette socket ne peut
         plus reussir (cinq essais), il en faut une neuve pour reobtenir un
         compteur a zero — retenter dessus contournerait le frein pour rien. */
      case "authError":
        setPendingAuth(null);
        setGateBusy(false);
        if (msg.motif === "jeton" || msg.motif === "reset") {
          localStorage.removeItem("survivor.token");
        }
        /* Connecte, la seule source d'authError est le changement de mot de
           passe : la reponse va dans son encart, pas sur l'ecran d'entree. */
        if (connected) {
          passMsg(msg.msg ?? "refusé", true);
          break;
        }
        // Meme raison que dans `onerror` : le gate ne se reaffiche plus a la
        // fin du chargement, c'est le chemin d'echec qui le rappelle.
        loadingEl.hidden = true;
        gate.hidden = false;
        renderGateMode();
        setStatus(msg.motif === "jeton"
          ? "session expirée — tape ton mot de passe" : (msg.msg ?? ""),
          msg.motif !== "jeton" ? true : false);
        if (msg.fatal) ws.close();
        break;

      /* Reponses du bloc compte (hub) : changement de mot de passe reussi,
         deconnexion actee — le client purge sa session et repart de l'ecran
         d'entree via onclose. */
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

      case "lobby":
        setLobby(msg.players);
        setHostId(msg.host);
        setPhase(msg.phase);
        setRoundNumber(msg.round);
        setRoomNameCur(msg.roomName ?? roomNameCur);
        setDifficulty(msg.difficulty ?? difficulty);
        /* BIOME (lot V). Recu au salon et regenere ici : c'est tout ce que le
           lot coute au reseau. Le salon est rediffuse a toute arrivee, donc un
           joueur qui rejoint EN COURS DE MANCHE obtient la geometrie sans qu'on
           ait a la lui renvoyer a part — c'est pour ca qu'elle voyage avec lui
           plutot qu'avec le message `round`. */
        if (msg.biome !== undefined) {
          setBiomeIndex(msg.biome);
          setBiomeSeed(msg.seed ?? biomeSeed);
          // La difficulte du SALON et non celle de la manche en cours : au
          // salon, c'est la seule qu'on ait, et `round` rejouera le calcul avec
          // la bonne au lancement.
          rebuildBiome(phase === PHASE_ROUND ? difficulty : msg.difficulty ?? difficulty);
        }
        setTally(msg.tally ?? tally);
        setMyVote(lobby.find(l => l.id === myId)?.vote ?? myVote);
        setAmSpectator(lobby.find(l => l.id === myId)?.spectator ?? false);
        refreshPanel();
      case "serverInfo":
        renderServerInfo(msg);
        break;

      /* LE SALON PORTE LA PHASE, DONC IL DECRIT LE MONDE — et une transition en
         attente doit passer avant lui.

         `endRound()` diffuse `roundEnd` puis le salon. Le premier passe par la
         file et sort 110 ms plus tard ; le second s'appliquait a la reception,
         donc il posait `phase = PHASE_LOBBY` alors que `bilanOpen` etait encore
         faux — et `refreshPanel()` ouvrait le SALON pour 110 ms, jusqu'a ce que
         le bilan le recouvre. C'est ce qu'on voyait en fin de manche.

         La regle du depot dit que ce qui commente le monde se consomme depuis la
         timeline. Le salon n'en fait pas partie la plupart du temps — un vote,
         un « prêt », une arrivee ne commentent aucune image et doivent sortir
         tout de suite. Mais quand il ACCOMPAGNE une transition, il en fait
         partie : d'ou le test sur la file plutot qu'un `pushWorld` systematique,
         qui aurait retarde tout le salon de 110 ms pour rien. L'ordre de la file
         fait le reste — pousse apres `roundEnd`, il sort apres lui. */
      case "lobby": {
        const appliquer = () => {
          setLobby(msg.players);
          setHostId(msg.host);
          setPhase(msg.phase);
          setRoundNumber(msg.round);
          setRoomNameCur(msg.roomName ?? roomNameCur);
          setDifficulty(msg.difficulty ?? difficulty);
          setTally(msg.tally ?? tally);
          // Une cle inconnue d'un client anterieur est simplement ignoree ; ici
          // c'est le repli qui compte — un serveur anterieur n'envoie rien et la
          // liste reste vide plutot que de valoir `undefined`.
          setRoundHistory(msg.history ?? []);
          /* En salle, `serverInfo` ne part plus : le chiffre voyage dans le
             salon, sur ma propre ligne d'equipe. Un seul aller-retour, deux
             transports selon l'endroit — et la barre ne sait pas lequel. */
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

      case "round":
        pushWorld(() => {
          setRoundNumber(msg.round);
          setDifficulty(msg.difficulty ?? difficulty);
          /* Le DECOR suit le mode (lot T). Applique ici et pas au salon : le
             salon montre l'arene en fond, et la repeindre au fil des votes
             ferait clignoter la page a chaque clic d'un coequipier. Le mode ne
             devient une realite qu'au lancement. */
          applyPalette(difficulty);
          /* La geometrie se REGENERE avec la bonne difficulte : c'est elle qui
             decide des dangers (aucun en calme, aucun qui blesse en normal), pas
             le biome seul. Au salon on ne connaissait que le mode vote. */
          rebuildBiome(difficulty);
          setPhase(PHASE_ROUND);
          // Le compte a rebours a rempli son office : sans cette remise a zero,
          // le salon de la manche SUIVANTE rouvrirait sur un bouton « Lancement… »
          // desarme.
          setLaunchEndsAt(0);
          setAmSpectator(false);
          setLastResult(null);
          setSnapshots([]);
          setLatest(null);
          setPredicted(null);
          resetFeedback();
          // Le tampon d'espacement repart de zero avec les instantanes : sans
          // ca, l'attente du salon entrerait dans les statistiques comme un
          // decrochage reseau.
          if (PERF) netPerfBoundary();
          // Une nouvelle manche remet les cartes a zero : sans ca, le tableau
          // de fin de la manche precedente resterait affiche derriere le
          // suivant, et l'ecran de choix d'un boss deja mort resterait ouvert
          // si la manche a ete relancee pendant qu'il attendait un choix.
          setLoadouts(new Map());
          refreshLocalMods();
          closeCards();
          closeMerchant();
          closeBilan();
          closeBuild();
          closePause();
          refreshPanel();
          /* LE SOUFFLE DE LANCEMENT. Il part d'ici et non du clic sur « Lancer
             la manche » : le clic n'appartient qu'a l'hote, alors que le
             lancement est ce que TOUTE la table vit au meme instant. Il est
             donc dans la file du monde comme le reste de la transition, et il
             sonne sur l'image qu'il commente et non 110 ms avant. */
          playSound("lancement");
          /* Le briefing s'ouvre APRES `refreshPanel` : c'est un voile pose sur
             une manche qui tourne deja, pas un ecran qui la remplace. Le HUD
             est donc en place dessous, et le bouton « continuer » n'a qu'a
             retirer le voile pour rendre l'arene. */
          openBrief(msg.warmup);
        });
        break;

      /* QUI LIT ENCORE. Applique A LA RECEPTION et non par `worldQueue` : ce
         message ne commente aucune image — il dit ou en sont les autres dans un
         menu, comme le salon ou le tableau des scores. Le retard
         d'interpolation n'a rien a lui apporter, et le faire attendre 110 ms
         n'aurait fait que retarder la disparition de l'attente au moment ou la
         vague part. */
      /* LE COMPTE A REBOURS DE LANCEMENT. A la reception, sans passer par la
         file : il ne commente aucune image — il annonce une manche qui n'a pas
         commence, et le retard d'interpolation ne ferait que raccourcir le
         delai d'annulation de 110 ms.

         `delay` est une DUREE et non une echeance ; elle est convertie ici en
         horloge locale. `why` n'accompagne que les annulations subies. */
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
          // Une manche peut s'interrompre PENDANT le briefing : le dernier
          // joueur quitte, la salle revient au salon, et l'ecran resterait a
          // compter vers une entree en jeu qui n'aura pas lieu.
          closeBrief();
          closeCards();
          closeMerchant();
          closeBilan();
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
          // La file d'alertes se vide aussi ici : une consigne encore en attente
          // du retard d'interpolation serait sortie au debut de la manche
          // SUIVANTE, sur un combat qui n'a rien a voir.
          resetFeedback();
          closeBrief();
          closeCards();
          closeMerchant();
          closeBuild();
          closePause();
          // Le bilan s'ouvre AVANT `refreshPanel` : c'est lui qui tient le salon
          // ferme tant qu'il est a l'ecran.
          showBilan(msg);
          refreshPanel();
        });
        break;

      case "state":
        ingest(msg);
        /* Le serveur ne signale pas explicitement la reprise de la manche : il
           cesse simplement de simuler, donc de diffuser des etats, pendant tout
           le choix. Le premier etat qui revient signe donc la reprise, et il
           n'y a pas de minuteur local a tenir.
           La fermeture ne doit surtout pas etre conditionnee au fait d'avoir
           clique : le joueur qui laisse expirer le delai recoit une carte
           d'office, la manche repart pour tout le monde, et son ecran serait
           reste ouvert sur une offre morte pendant qu'il se fait devorer.
           La fermeture passe par la file : sinon l'ecran se retire 110 ms avant
           que le monde ne reparte, et on regarde une image figee. Le drapeau
           evite d'empiler une fermeture par instantane — il en arrive vingt par
           seconde. */
        /* La garde porte sur LES DEUX ecrans de transition, pas seulement sur
           les cartes. Elle ne testait que `cardsState`, et le marchand (lot K)
           s'ouvre precisement APRES la fermeture de l'ecran de cartes, qui
           remet `cardsState` a null : la condition etait donc fausse au moment
           ou il fallait fermer, et l'ecran du marchand restait affiche
           par-dessus une manche qui avait repris. Le joueur ne pouvait plus
           rien faire. */
        if ((cardsState || merchantState) && !screenCloseQueued) {
          setScreenCloseQueued(true);
          pushWorld(() => { setScreenCloseQueued(false); closeCards(); closeMerchant(); });
        }
        break;

      /* Un message "cards" par tour de choix. Deux niveaux gagnes dans la meme
         vague en envoient deux d'affilee, sans instantane entre les deux : on
         reconstruit donc l'etat a chaque fois plutot que de le fusionner, ce
         qui remet `picked` a faux et reamorce le minuteur. Sans ca, le second
         ecran s'ouvrait deja grise et sur le delai expire du premier. */
      /* Canal d'evenements de mecanique. Message PONCTUEL, hors du snapshot :
         c'est lui qui dit « regroupez-vous » la ou le snapshot ne montre qu'un
         cercle. Il arrive a l'instant de l'annonce, pas vingt fois par seconde. */
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
            // « Relance » (lot D) : le serveur dit si elle est disponible.
            reroll: msg.reroll === 1,
            picked: false, pickedId: null,
            // Instant d'ouverture, pour le filet de compte a rebours : le serveur
            // envoie une echeance, pas une duree, et le filet a besoin des deux.
            from: Date.now(),
          });
          setCardsPending([]);
          renderCards();
        });
        break;

      // Dans la MEME file que `cards`, pas pour le retard mais pour l'ORDRE :
      // applique a la reception, il rendrait la liste d'attente sur un ecran
      // pas encore ouvert.
      case "cardsWait":
        pushWorld(() => {
          setCardsPending(msg.pending ?? []);
          renderCardsWait();
        });
        break;

      /* Marchand (lot K). Message de transition du monde, comme `cards` :
         il s'ouvre par-dessus la depouille du boss 110 ms avant que le client
         ne la dessine morte, sinon. `offers` est un tableau d'IDS — le client
         lit la table partagee, comme pour les boss ; un onglet anterieur
         ignore le message entier et continue de jouer. */
      case "merchant":
        pushWorld(() => {
          setMerchantState({
            wave: msg.wave ?? 0,
            deadline: msg.deadline,
            eclats: msg.eclats ?? 0,
            rerollCost: msg.rerollCost ?? 0,
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

      /* Reponse du serveur a une demande de pause — et aussi son initiative :
         il la leve tout seul au bout de cinq minutes ou a l'arrivee d'un second
         joueur. Le panneau reste ouvert dans ce cas, il change simplement de
         libelle : le refermer d'office aurait retire le son et le bouton de
         sortie a quelqu'un qui ne demandait rien. */
      case "paused":
        setPauseReal(msg.on === 1);
        if (!pauseEl.hidden) renderPauseState();
        break;

      case "loadout":
        setLoadouts(new Map(Object.entries(msg.byPlayer).map(([id, arr]) => [Number(id), arr])));
        setRelicsByPlayer(new Map(
          Object.entries(msg.relics ?? {}).map(([id, arr]) => [Number(id), arr])));
        // Seul point ou le chargement local change : c'est ici, et nulle part
        // ailleurs, qu'on recalcule les mods dont la saisie a besoin.
        refreshLocalMods();
        break;

      case "full":
        setStatus(`partie pleine (${msg.max} joueurs)`, true);
        goBtn.disabled = false;
        break;
    }
  };

  ws.onerror = () => {
    // Le gate ne revient plus tout seul apres le chargement : sans ca, un
    // serveur injoignable laisse un ecran noir et un message que personne ne
    // voit.
    loadingEl.hidden = true;
    gate.hidden = false;
    setStatus("serveur injoignable", true);
    setGateBusy(false);
  };

  ws.onclose = () => {
    setConnected(false);
    setMetaClsOverride(null);
    // L'etat hub/salle meurt avec la socket : a la reconnexion, le serveur
    // reproposera la salle survivante via `welcome.rejoin`.
    setInRoom(false);
    setRoomNameCur("");
    setRoomsList([]);
    setPendingRejoin(null);
    hubResumeEl.hidden = true;
    hubScreenEl.hidden = true;
    // La file de transitions se vide ICI et nulle part ailleurs : une ouverture
    // de cartes ou un bilan encore en attente sortirait par-dessus l'ecran de
    // reconnexion, 110 ms apres la coupure.
    worldQueue.length = 0;
    setScreenCloseQueued(false);
    // Une coupure de socket n'est pas un decrochage d'interpolation : sans ce
    // bord, toute la duree de la reconnexion sortirait en `max gap`.
    if (PERF) netPerfBoundary();
    panel.hidden = true;
    menuEl.hidden = true;
    // Reconnexion : on repart de l'ecran d'entree, dans le mode qui
    // correspond a la session memorisee (reprise par jeton s'il en reste un,
    // formulaires sinon).
    renderGateMode();
    // La bascule d'onglet revient avec les formulaires : `dup` l'avait videe.
    renderGateSwitch(!registerFormEl.hidden);
    // La pastille passe en ambre : celui qui revient sur cet ecran apres une
    // coupure doit voir POURQUOI le bouton ne mene nulle part, sans avoir a
    // l'essayer. Ambre et non rouge — il n'y a rien a fuir, juste a attendre.
    renderServerInfo(null);
    gate.hidden = false;
    showHud(false);
    setGateBusy(false);
    closeCards();
    closeMerchant();
    closeBilan();
    closeBuild();
    closePause();
    // Meme raison que dans `roomClosed` : une coupure en pleine manche renvoie
    // sur `#gate`, ou le numero doit etre lisible — c'est l'ecran qu'on regarde
    // au moment d'ecrire un rapport.
    updateVersion();
    // `loggedOut` ferme aussi la socket : une deconnexion voulue n'est pas
    // une connexion perdue, le statut reste muet dans ce cas.
    if (localStorage.getItem("survivor.pseudo") || pendingAuth) {
      setStatus("connexion perdue", true);
    } else {
      setStatus("");
    }
  };
}
