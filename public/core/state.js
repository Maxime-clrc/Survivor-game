
import { bossAt } from "/shared/bosses.js";
import { computeMods } from "/shared/cards.js";
import { CFG } from "/shared/game_state.js";
import { t } from "/shared/i18n.js";

export const INTERP_MS = 110;
export const INPUT_HZ = 30;
export const SNAP_THRESHOLD = 90;
export const PHASE_LOBBY = 0;
export const PHASE_ROUND = 1;

export let ws = null;
const errVues = new Set();
const errFile = [];
const ERR_MAX = 12;
export function signalerErreur(ou, message, pile, grave = true) {
  const signature = ou + "|" + String(message).slice(0, 200);
  if (errVues.has(signature) || errVues.size >= ERR_MAX) return;
  errVues.add(signature);
  const paquet = { t: "clientError", ou, message: String(message).slice(0, 200),
                   pile: String(pile ?? "").slice(0, 400) };
  (grave ? console.error : console.info)("[" + ou + "]", message, pile ?? "");
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(paquet));
  else if (errFile.length < ERR_MAX) errFile.push(paquet);
}
export function viderErreurs() {
  if (!ws || ws.readyState !== 1) return;
  while (errFile.length) ws.send(JSON.stringify(errFile.shift()));
}
window.addEventListener("error", e => {
  const ou = e.filename
    ? `${e.filename.split("/").pop()}:${e.lineno}` : "inconnu";
  signalerErreur(ou, e.message, e.error?.stack);
});
window.addEventListener("unhandledrejection", e => {
  const r = e.reason;
  signalerErreur("promesse", r?.message ?? String(r), r?.stack);
});
export let myId = 0;
export let myPseudo = "";
export let hostId = 0;
export let phase = PHASE_LOBBY;
export let amSpectator = false;
export let lobby = [];
export let roundHistory = [];
export let roundNumber = 0;
export let inRoom = false;
export let roomsList = [];
export let roomNameCur = "";
export let pendingRejoin = null;
export let joinAttempt = null;
export let lastResult = null;
export let difficulty = 1;
export const EMPTY_SET = new Set();
export let tally = [0, 0, 0];
export let myVote = 1;
export let cardsState = null;
export let merchantState = null;
export let merchantWait = [];
export let merchantTimerHandle = null;
export let progressState = null;
export let cardsPending = [];
export let cardsTimerHandle = null;
export let loadouts = new Map();
export let relicsByPlayer = new Map();
export let myDashCd = CFG.DASH_CD;
export function refreshLocalMods() {
  myDashCd = CFG.DASH_CD * computeMods(ownedCounts(myId)).dashCdMul;
}
export let snapshots = [];
export let bombStockSeen = 0;
export let bombReadyAt = -1e9;
export let latest = null;
export let predicted = null;
export let connected = false;
export let lastSnapAt = 0;
export let ping = 0;
export let metaClsOverride = null;
export let pendingAuth = null;
let reconnecter = null;
export function setReconnecter(f) { reconnecter = f; }
export function sendAuth(msg) {
  pendingAuth = msg;
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  else reconnecter?.();
}
export let bilanOpen = false;
export let finOpen = false;

function cardListOf(playerId) {
  const live = loadouts.get(playerId);
  if (live && live.length) return live;
  return lastResult?.rows.find(r => r.id === playerId)?.cards ?? [];
}
export function ownedCounts(playerId) {
  const counts = new Map();
  for (const id of cardListOf(playerId)) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}
export let pauseReal = false;
export let serverVersion = null;
export let serverCommit = "";

export const keys = new Set();
export const dash = { pending: false, t: 0, cd: 0, x: 0, y: 0 };
export const skills = { s1: false, s2: false, s3: false };
// l'appui se note MEME quand la competence est en recharge : sans ce retour, le
// joueur ne sait pas s'il a mal appuye ou si c'est indisponible.
export const pipPress = [0, 0, 0, 0];
export function notePress(i) { pipPress[i] = performance.now(); }

const STAT_KEY = "survivor.hudStats";
export let hudStats = readFlag(STAT_KEY, false);
export function setHudStats(v) {
  hudStats = !!v;
  try { localStorage.setItem(STAT_KEY, hudStats ? "1" : "0"); } catch {  }
}
const DPS_KEY = "survivor.hudDps";
export let hudDps = readFlag(DPS_KEY, false);
export function setHudDps(v) {
  hudDps = !!v;
  try { localStorage.setItem(DPS_KEY, hudDps ? "1" : "0"); } catch {  }
}
function readFlag(key, fallback) {
  try { return (localStorage.getItem(key) ?? (fallback ? "1" : "0")) === "1"; }
  catch { return fallback; }
}
/* LE PALIER DE QUALITE EST UN INDICE, PAS UN NOM : un module de rendu compare
   `gfx >= GFX_HIGH`, jamais une chaine. Le NOM est ce qu'on range — un indice
   stocke se reinterpreterait si un palier s'inserait un jour.

   `low` est un CONTRAT, mais sur la TECHNIQUE : matiere, semis, lumiere, grille
   d'avant le plan 13. La palette d'arene, elle, vaut a TOUS les paliers — c'est
   une decision de direction artistique, et une machine lente n'a pas a voir un
   autre jeu. Ce qui ne change JAMAIS entre paliers : la simulation, les
   collisions, les apparitions, la position de quoi que ce soit. */
export const GFX_LOW = 0, GFX_MEDIUM = 1, GFX_HIGH = 2, GFX_ULTRA = 3;
export const GFX_KEYS = ["low", "medium", "high", "ultra"];
const GFX_KEY = "survivor.gfx";
export let gfx = readGfx();
export function setGfx(v) {
  gfx = Math.min(GFX_ULTRA, Math.max(GFX_LOW, v | 0));
  try { localStorage.setItem(GFX_KEY, GFX_KEYS[gfx]); } catch {  }
}
function readGfx() {
  try {
    const i = GFX_KEYS.indexOf(localStorage.getItem(GFX_KEY) ?? "");
    return i < 0 ? GFX_HIGH : i;
  } catch { return GFX_HIGH; }
}
export const PERF = location.search.includes("perf");
export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const ATTACK_LABEL = {
  salve: "salve radiale", marques: "marques au sol", charge: "charge",
  damier: "damier — une case sur deux, puis l'autre moitié",
  couronne: "couronne — le centre puis l'anneau, ou l'inverse",
  couloirs: "couloirs — trois bandes, puis les perpendiculaires",
  balayage: "balayage — cours avec l'aiguille",
  spirale: "spirale — cours dans le sens de rotation",
  traque: "traque — la zone se pose sur toi, trois fois",
  mur: "mur — suis le trou",
  quadrant: "verrouillage — un quart de l'arène s'interdit",
  grappes: "grappes — détruis-les avant l'éclosion",
  nourriciers: "rejetons nourriciers — tue-les, ils la soignent",
  prison: "prison — libère le prisonnier",
  proximite: "proximité — le centre est mortel",
  exaflare: "exaflares — seule la première est annoncée",
  appat: "appâts — ton fantôme dépose les zones",
  derive: "dérive — les disques glissent",
  sanctuaire: "sanctuaires — reste sur les disques sûrs",
  verglas: "sol glissant — le sol ne répond plus tout de suite",
  rassemblement: "regroupement — partagez les dégâts",
  dispersion: "dispersion — écartez-vous",
  tours: "tours — occupez-les toutes",
  denombrement: "dénombrement — le nombre inscrit doit être exact",
  regard: "regard — ne visez plus le boss",
  lien: "lien — éloignez-vous pour le rompre",
  croix: "croix — l'intersection est mortelle",
  croixdurable: "croix durable — tiens ton quadrant huit secondes",
  cone: "cône — esquive latéralement",
  pacman: "secteur sûr — place-toi derrière la seule direction épargnée",
  constriction: "constriction — l'arène se referme",
  synthese: "synthèse — regroupement ET exaflares, en même temps",
  entrelacs: "entrelacs — couronne ET disques à la dérive",
  sceau: "SCEAU — tous les foyers tenus en même temps",
  regarddouble: "double regard — deux fenêtres d'affilée",
  regardmobile: "regard mobile — ne vise plus, et ne t'arrête pas",
  regardpermanent: "REGARD CLIGNOTANT — ne tire que l'œil fermé",
  noeuds: "nœuds — détruis-les, ils prennent le terrain",
  copies: "copies — elles rejouent tes déplacements",
  copiesrenvoi: "copies armées — elles répondent au tir",
  copiesliees: "copies liées — elles vous attachent l'un à l'autre",
  echange: "échange — il prend la place du plus loin",
  copiesvraie: "la vraie change — il prend une place et noie l'écran",
  synthesedouble: "double synthèse — quatre motifs, deux à deux",
  sansannonce: "SANS ANNONCE — ce que tu as déjà vu ne se dira plus",
};
export function phaseUnlockText(kind, phase) {
  const list = bossAt(kind).unlock[phase - 1];
  if (!list || !list.length) return t("ui.atk.aucune", "il accélère");
  return list.map(k => t(`ui.atk.${k}`, ATTACK_LABEL[k] ?? k)).join(" · ");
}

export function setAmSpectator(v) { amSpectator = v; }
export function setBilanOpen(v) { bilanOpen = v; }
export function setBombReadyAt(v) { bombReadyAt = v; }
export function setBombStockSeen(v) { bombStockSeen = v; }
export function setCardsPending(v) { cardsPending = v; }
export function setFinOpen(v) { finOpen = v; }
export function setCardsState(v) { cardsState = v; }
export function setCardsTimerHandle(v) { cardsTimerHandle = v; }
export function setConnected(v) { connected = v; }
export function setDifficulty(v) { difficulty = v; }
export function setHostId(v) { hostId = v; }
export function setInRoom(v) { inRoom = v; }
export function setJoinAttempt(v) { joinAttempt = v; }
export function setLastResult(v) { lastResult = v; }
export function setLastSnapAt(v) { lastSnapAt = v; }
export function setLatest(v) { latest = v; }
export function setLoadouts(v) { loadouts = v; }
export function setLobby(v) { lobby = v; }
export function setMerchantState(v) { merchantState = v; }
export function setMerchantTimerHandle(v) { merchantTimerHandle = v; }
export function setMerchantWait(v) { merchantWait = v; }
export function setMetaClsOverride(v) { metaClsOverride = v; }
export function setMyId(v) { myId = v; }
export function setMyPseudo(v) { myPseudo = v; }
export function setMyVote(v) { myVote = v; }
export function setPauseReal(v) { pauseReal = v; }
export function setPendingAuth(v) { pendingAuth = v; }
export function setPendingRejoin(v) { pendingRejoin = v; }
export function setPhase(v) { phase = v; }
export function setPing(v) { ping = v; }
export function setPredicted(v) { predicted = v; }
export function setProgressState(v) { progressState = v; }
export function setRelicsByPlayer(v) { relicsByPlayer = v; }
export function setRoomNameCur(v) { roomNameCur = v; }
export function setRoomsList(v) { roomsList = v; }
export function setRoundHistory(v) { roundHistory = v; }
export function setRoundNumber(v) { roundNumber = v; }
export function setServerCommit(v) { serverCommit = v; }
export function setServerVersion(v) { serverVersion = v; }
export function setSnapshots(v) { snapshots = v; }
export function setTally(v) { tally = v; }
export function setWs(v) { ws = v; }
