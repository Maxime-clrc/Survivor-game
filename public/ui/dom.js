/* ===========================================================================
   DOM — les noeuds de la page, et rien d'autre
   TOUTE reference DOM vit ici, sans exception. La regle se relit d'un coup, et
   elle evite qu'un ecran garde ses noeuds pendant qu'un autre les cherche
   ailleurs. S'y ajoutent les helpers qui ne font que du texte.
   =========================================================================== */

import { VERSION } from "/shared/version.js";
import { PHASE_ROUND, connected, inRoom, keys, phase, serverCommit, serverVersion } from "../core/state.js";

/* TROIS COUCHES. Voir le commentaire d'`index.html` : tout ce qui est en canvas
   2D passe forcement AU-DESSUS de tout ce qui est en WebGL, et l'ordre de
   dessin du jeu intercale du 2D avant ET apres les entites. D'ou une couche 2D
   de chaque cote plutot qu'une seule.

   `ctx` est la couche 2D COURANTE, et c'est une variable et non une constante :
   `drawWorld` la bascule du dessous au dessus au moment ou l'on franchit les
   entites. C'est ce qui permet aux deux cents fonctions de dessin de ne pas
   savoir sur quel canvas elles ecrivent — exactement comme `drawSprite` ne dit
   pas a ses appelants s'il passe par WebGL ou par le 2D. */
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
// Le kicker du salon (« Salon · tu es l'hôte ») n'a pas d'identifiant : il est
// pose par le markup et lu ici par sa position, pour ne pas ajouter un id de
// plus a un element que seul cet ecran connait.
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
/* Marchand de reliques (lot K) : meme squelette que l'ecran de cartes. */
export const merchantEl = document.getElementById("merchant");
export const merchantTitle = document.getElementById("merchantTitle");
export const merchantRow = document.getElementById("merchantRow");
export const merchantTimerEl = document.getElementById("merchantTimer");
export const merchantTimerFill = merchantTimerEl.querySelector("i");
export const merchantWaitEl = document.getElementById("merchantWaitMsg");
export const bilanEl = document.getElementById("bilan");
export const bilanTitle = document.getElementById("bilanTitle");
export const bilanStats = document.getElementById("bilanStats");
export const bilanHurt = document.getElementById("bilanHurt");
export const bilanPerf = document.getElementById("bilanPerf");
export const bilanScoresBody = document.querySelector("#bilanScores tbody");
export const bilanGo = document.getElementById("bilanGo");
export const bilanKicker = document.getElementById("bilanKicker");
export const bilanLeaveBtn = document.getElementById("bilanLeave");
export const volInput = document.getElementById("vol");
export const volVal = document.getElementById("volVal");
export const muteBtn = document.getElementById("mute");
export const hubScreenEl = document.getElementById("hubScreen");
export const hubRefreshBtn = document.getElementById("hubRefresh");
/* Classement au temps (lot N), au hub. */
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
/* --- connexion --------------------------------------------------------------- */

export function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("err", isError);
}
/* Ecran de chargement. Le clic « Rejoindre » est le seul geste utilisateur dont
   on soit certain avant la premiere balle : c'est donc lui qui debloque le
   contexte audio ET qui declenche la generation des atlas. Meme moment, meme
   barre — et le seul ecran ou l'on peut prendre trois secondes, donc le seul ou
   un logotype a sa place. */
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
/* ===========================================================================
   BARRE SUPERIEURE

   Un seul element pour tous les ecrans hors combat : ou je suis, sous quel
   compte, et si le serveur repond encore. Chaque ecran etait jusqu'ici une
   page isolee — il fallait redescendre au pied de la liste des salles pour
   retrouver son pseudo, et rien n'affichait la latence.

   ELLE OBSERVE L'ETAT DES ECRANS, ELLE NE LE PILOTE PAS. La specification
   proposait de regrouper tout l'affichage dans un `showScreen(name)` unique,
   pour que la barre ne puisse pas apparaitre sur un ecran qu'on aurait
   oublie. Le but est le bon, le moyen ne l'est pas ici : neuf ecrans se
   montrent et se cachent depuis une quinzaine d'endroits — la file de
   transitions du monde, la reconnexion, la pause, le bilan, l'ecran de
   cartes — et les regrouper voudrait dire reecrire ces quinze chemins, dont
   plusieurs portent des regles d'ordonnancement documentees (`worldQueue`,
   les gardes de `refreshPanel`).

   Un observateur atteint le meme resultat sans y toucher : il ne PEUT PAS
   oublier un ecran, puisqu'il constate au lieu de decider. Le cout est nul —
   ce sont des menus, pas la boucle de jeu, et l'observateur ne se declenche
   qu'au changement d'un attribut `hidden`. */

export const topbarEl = document.getElementById("topbar");
export const topHomeBtn = document.getElementById("topHome");
export const topCrumbEl = document.getElementById("topCrumb");
export const topPingEl = document.getElementById("topPing");
export const topPingValEl = document.getElementById("topPingVal");
export const topAvatarEl = document.getElementById("topAvatar");
export const topNameEl = document.getElementById("topName");
export const topSettingsBtn = document.getElementById("topSettings");
/* --- briefing de classe --------------------------------------------------------

   Vingt secondes entre le clic de l'hote et la premiere vague. La phase est
   SERVEUR (`PHASE_BRIEF`, room.js) : rien ne tourne derriere, le compte a
   rebours ne recouvre donc pas une manche deja lancee.

   Aucun texte ne voyage sur le reseau : le client importe `CLASSES` — le meme
   module que le serveur — et y lit le nom, la teinte, les deux competences avec
   leurs touches, et la mission. Le message `brief` ne porte que la duree, et
   c'est la seule chose que le client ne peut pas deduire. */
export const briefEl = document.getElementById("brief");
export const briefNameEl = document.getElementById("briefName");
export const briefSkillsEl = document.getElementById("briefSkills");
export const briefMissionTextEl = document.getElementById("briefMissionText");
export const briefBarFill = document.querySelector("#briefBar > i");
export const briefLeftEl = document.getElementById("briefLeft");
export const briefThirdEl = document.getElementById("briefThird");
export const briefGoBtn = document.getElementById("briefGo");
export const briefCountEl = document.getElementById("briefCount");
export const hudBriefEl = document.getElementById("hudBrief");
/* --- Terminal : progression permanente (lots D et H) -----------------------------

   Un ecran, trois niveaux d'onglets fixes : la CLASSE (les trois arbres se
   consultent sans fermer), puis Arbre / Confort / Jalons. Les emplacements
   sont affiches en permanence sous le titre — c'est la contrainte qui
   structure toutes les decisions, elle ne demande jamais un clic.
   `metaClsOverride` retient la classe montree entre deux rendus (un lobby
   broadcast pendant que le Terminal est ouvert rejoue `renderMeta()` sans
   argument). Les tables viennent de `shared/progression.js` — le serveur
   n'envoie que l'etat du compte, et il valide chaque achat de son cote : ces
   boutons ne sont qu'une demande. */

export const metaEl = document.getElementById("meta");
export const metaCoresEl = document.getElementById("metaCores");
export const metaSubEl = document.getElementById("metaSub");
export const metaTreeEl = document.getElementById("metaTree");
export const metaConfortEl = document.getElementById("metaConfort");
export const metaMilestonesEl = document.getElementById("metaMilestones");
export const menuTitleEl = document.getElementById("menuTitle");
export const metaClassTabsEl = document.getElementById("metaClassTabs");
export const metaSlotsEl = document.getElementById("metaSlots");
export const metaBansEl = document.getElementById("metaBans");
/* Groupement par milliers, espace insecable fin. Pas de « 80,8 k » : un bilan
   se compare d'une manche a l'autre, et un arrondi qui mange trois chiffres
   rend deux manches voisines identiques. */
export function fmtBig(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
/* ===========================================================================
   FENETRE DE BUILD
   Un seul ecran pour trois entrees : Tab en jeu, un clic sur une ligne du
   bilan, un clic sur une ligne du salon. Le panneau d'inventaire du lot 1 en
   etait deja la moitie — il ne manquait que la selection du joueur.

   Pourquoi elle existe : le bilan affichait les cartes de chacun en pastilles,
   sans moyen de les lire. Or c'est exactement le moment ou l'on veut comprendre
   pourquoi quelqu'un a fait trois fois plus de degats — et la reponse tient
   dans les MULTIPLICATEURS, pas dans la liste de cartes qu'il faut lire ligne a
   ligne pour la reconstituer de tete.
   =========================================================================== */

export const buildEl = document.getElementById("build");
export const buildName = document.getElementById("buildName");
export const buildClass = document.getElementById("buildClass");
export const buildStats = document.getElementById("buildStats");
export const buildMods = document.getElementById("buildMods");
export const buildSkills = document.getElementById("buildSkills");
export const buildSkillsTitle = document.getElementById("buildSkillsTitle");
export const buildCards = document.getElementById("buildCards");
export const buildBackBtn = document.getElementById("buildBack");
/* ===========================================================================
   MENU PAUSE
   La contrainte est structurelle : le serveur est autoritaire et simule en
   continu, donc UNE PAUSE N'A DE SENS QU'A UN SEUL JOUEUR. A plusieurs, le
   panneau s'ouvre quand meme — c'est le seul endroit d'ou l'on regle le son ou
   quitte une manche — mais la partie continue derriere, et le panneau le dit.

   Le client ne DECIDE de rien : il demande, le serveur accorde ou non, et
   `pauseReal` ne vaut vrai que sur la reponse. Se fier au client ici, c'est
   accepter qu'un onglet modifie fige une partie a quatre.
   =========================================================================== */

export const pauseEl = document.getElementById("pause");
export const pauseState = document.getElementById("pauseState");
export const pauseConfirm = document.getElementById("pauseConfirm");
export const pauseQuitBtn = document.getElementById("pauseQuit");
export const pauseQuitAsk = document.getElementById("pauseQuitAsk");
/* --- numero de version ---------------------------------------------------------
   Un numero seul ne detecte pas le cas reel. Les fichiers sont servis en
   `Cache-Control: no-store`, donc aucune requete ne ramene du vieux code — mais
   un onglet LAISSE OUVERT pendant un redeploiement continue de faire tourner
   celui de la veille, et c'est precisement ce qui produit les rapports de defaut
   incomprehensibles. D'ou DEUX versions comparees, et c'est tout l'interet :
   `VERSION` dit ce que cet onglet execute, `serverVersion` ce que le serveur
   execute.

   Le bloc vit ici, apres le menu pause, parce qu'`updateVersion` lit `pauseEl` :
   place plus haut, l'appel de mise en place initiale tomberait dans la zone
   morte de sa declaration. */
const versionEl = document.getElementById("version");
export function updateVersion() {
  /* Masque pendant une manche : « rien de decoratif ne se superpose au jeu », et
     un numero de version est decoratif en combat. Le menu pause fait exception,
     et ce n'est pas une entorse — c'est le seul ecran qui s'ouvre PAR-DESSUS la
     manche, donc le seul endroit ou on lit l'ecran sans la quitter, et c'est la
     qu'on recopie un numero dans un rapport de defaut.

     `connected && inRoom` n'est pas une ceinture de securite : ni `ws.onclose`
     ni `roomClosed` ne remettent `phase` a `PHASE_LOBBY`, donc une coupure
     reseau ou une salle fermee EN PLEINE MANCHE renvoie sur `#gate` ou sur le
     hub en laissant la phase a `PHASE_ROUND`. Sans ces deux termes, le numero
     restait masque precisement sur l'ecran ou l'on vient lire ce qui s'est
     passe. Une manche n'existe que dans une salle, et une salle qu'avec une
     socket. */
  versionEl.hidden = connected && inRoom && phase === PHASE_ROUND && pauseEl.hidden;

  const stale = serverVersion != null && serverVersion !== VERSION;
  /* AMBRE et non rouge — c'est la couleur de l'avertissement dans la grammaire
     du depot, et rien n'est letal ici. La couleur vit dans `ui.css` via une
     classe, jamais posee en style en ligne : le fichier ne connait pas de
     couleur en dur. */
  versionEl.classList.toggle("stale", stale);

  /* LE HASH N'APPARAIT QUE DANS LE CAS D'ACCORD, et ce n'est pas un oubli dans
     l'autre. Celui qu'on recoit est celui du SERVEUR, et un onglet ne peut pas
     connaitre le sien sans etape de build — le depot n'en a pas. L'accoler a
     `VERSION`, qui vient d'ici, serait donc faux exactement dans le cas ou l'on
     regarde l'ecran : « v0.7.0 (a1b2c3d) » decrirait deux codes differents comme
     un seul. Quand les deux versions s'accordent, c'est le meme code et le hash
     est aussi le sien. */
  versionEl.textContent = stale
    ? `v${VERSION} — serveur v${serverVersion} · recharge la page`
    : `v${VERSION}${serverCommit ? ` (${serverCommit})` : ""}`;
}
/* --- « SUIS-JE EN TRAIN D'ECRIRE ? » ------------------------------------------

   Point de passage unique des quatre gestionnaires de touches. La garde etait
   `document.activeElement !== nameInput`, c'est-a-dire UN champ nomme — celui du
   pseudo, le seul qui existait quand elle a ete ecrite. Depuis, la page en porte
   une dizaine : nom de salle, mot de passe de salle, mot de passe de compte,
   ancien et nouveau mot de passe. Dans tous ceux-la, Espace etait avale par
   `preventDefault` et declenchait une esquive au lieu d'ecrire — on ne pouvait
   donc pas nommer une salle « Vendredi soir » — et les fleches ne deplacaient
   pas le curseur.

   Le test porte sur le TYPE de champ et non sur `tagName === "INPUT"`, et c'est
   la subtilite qui compte : un `input[type="range"]` est un INPUT, mais Espace
   et les fleches y sont des commandes de JEU qu'on ne veut pas perdre. Le menu
   pause porte deux curseurs de volume ; si l'un d'eux garde le focus apres
   qu'on a referme le menu, une garde trop large rendrait l'esquive muette pour
   le reste de la manche. On ne s'efface donc que devant une saisie de TEXTE.

   `type` absent vaut « text » — c'est le cas de `#roomName`, qui n'en declare
   pas. */
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
  /* Menu pause ouvert : on ne bouge plus. En solo la simulation est figee et le
     mouvement predit derivait tout seul derriere le voile, pour se faire
     recaler sechement a la reprise. A plusieurs la partie continue vraiment, et
     un personnage qui court pendant qu'on regle le volume est encore pire.
     Le test est ici, au point de passage unique de la lecture des touches :
     la prediction locale et le paquet d'entree le voient tous les deux. */
  if (!pauseEl.hidden) return { x: 0, y: 0 };
  let x = 0, y = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp"))    y -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown"))  y += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft"))  x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  const d = Math.hypot(x, y);
  return d > 0 ? { x: x / d, y: y / d } : { x: 0, y: 0 };
}
