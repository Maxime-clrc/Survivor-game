/* ===========================================================================
   ETAT — session et partie
   Couche 0 : ce module n'importe RIEN du client. Tout le reste en depend, donc
   une seule arete remontante suffirait a rendre l'ordre de chargement indefini.
   C'est pour ca que `sendAuth` passe par un crochet (`setReconnecter`) au lieu
   d'appeler `connect()` : le routeur vit tout en haut de la pile.
   =========================================================================== */

import { bossAt } from "/shared/bosses.js";
import { computeMods } from "/shared/cards.js";
import { CFG } from "/shared/game_state.js";

export const INTERP_MS = 110;
export const INPUT_HZ = 30;
export const SNAP_THRESHOLD = 90;
export const PHASE_LOBBY = 0;
export const PHASE_ROUND = 1;
/* --- etat local ------------------------------------------------------------- */

export let ws = null;
/* --- REMONTEE D'ERREUR ------------------------------------------------------

   La console du navigateur n'est ouverte que si quelqu'un a pense a l'ouvrir, et
   personne ne joue avec les outils de developpement affiches. Une erreur non
   rattrapee dans la boucle de rendu disparait donc sans laisser de trace — or
   c'est exactement ce qu'on veut savoir : un ecran qui ne s'ouvre plus jette, et
   la pile d'appel dit ou.

   Elle part par la socket DEJA OUVERTE et non par une requete a part : il n'y a
   ni route a ajouter cote serveur, ni second chemin a garder d'accord, et le
   serveur sait deja qui parle. Corollaire assume : une erreur survenue AVANT la
   connexion n'est pas remontee — on la met en attente, et elle part a
   l'ouverture si elle a lieu.

   Le seuil est cote CLIENT en plus du plafond serveur : une erreur dans la
   boucle de rendu se repete soixante fois par seconde, et il ne s'agit pas de
   faire confiance au serveur pour absorber une rafale qu'on peut ne pas
   emettre. */
const errVues = new Set();
const errFile = [];
const ERR_MAX = 12;
export function signalerErreur(ou, message, pile, grave = true) {
  const signature = ou + "|" + String(message).slice(0, 200);
  if (errVues.has(signature) || errVues.size >= ERR_MAX) return;
  errVues.add(signature);
  const paquet = { t: "clientError", ou, message: String(message).slice(0, 200),
                   pile: String(pile ?? "").slice(0, 400) };
  /* La console reste servie : elle est le journal de qui a les outils ouverts,
     et le serveur celui de qui ne les a pas. `grave` distingue les deux
     usages du canal — une ligne d'etat affichee en ROUGE se lit comme une
     panne, et on cesse alors de regarder les vraies. */
  (grave ? console.error : console.info)("[" + ou + "]", message, pile ?? "");
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(paquet));
  else if (errFile.length < ERR_MAX) errFile.push(paquet);
}
// Vidage a l'ouverture : ce qui a casse pendant le chargement est justement ce
// qu'on ne verrait jamais autrement.
export function viderErreurs() {
  if (!ws || ws.readyState !== 1) return;
  while (errFile.length) ws.send(JSON.stringify(errFile.shift()));
}
window.addEventListener("error", e => {
  const ou = e.filename
    ? `${e.filename.split("/").pop()}:${e.lineno}` : "inconnu";
  signalerErreur(ou, e.message, e.error?.stack);
});
/* Les promesses rejetees passent par un canal SEPARE et ne declenchent pas
   `error` : `buildAtlas` est un `await`, et une panne de generation d'atlas —
   soit tout le rendu — n'aurait produit aucune trace sans cette ligne. */
window.addEventListener("unhandledrejection", e => {
  const r = e.reason;
  signalerErreur("promesse", r?.message ?? String(r), r?.stack);
});
export let myId = 0;
export let myPseudo = "";          // casse canonique du compte, pour le classement
export let hostId = 0;
export let phase = PHASE_LOBBY;
export let amSpectator = false;
export let lobby = [];
/* Manches precedentes de CETTE salle. Alimente par le salon quand le serveur
   le portera : l'historique appartient a la soiree et non au joueur, donc il
   vit sur la salle — un joueur qui se reconnecte doit le retrouver, et quatre
   clients qui tiendraient chacun le leur en afficheraient quatre versions. */
export let roundHistory = [];
export let roundNumber = 0;
/* Etat hub / etat salle (plan infra). `inRoom` est la verite locale : tant
   qu'il est faux, le salon ne s'affiche jamais — les messages de jeu
   n'existent qu'en salle, et le serveur les rejette de toute facon. */
export let inRoom = false;
export let roomsList = [];
export let roomNameCur = "";       // nom de la salle courante, pour le titre du salon
export let pendingRejoin = null;   // { code, name } propose par welcome apres rechargement
export let joinAttempt = null;     // { code, name } de la derniere salle cliquee — pour l'encart mot de passe
export let lastResult = null;
export let difficulty = 1;        // mode retenu par le vote
/* Set vide PARTAGE. La cle `wu` est absente neuf instantanes sur dix, et lui
   allouer un Set neuf a chaque fois ferait travailler le ramasse-miettes vingt
   fois par seconde pour un objet toujours vide. Jamais ecrit. */
export const EMPTY_SET = new Set();
export let tally = [0, 0, 0];
export let myVote = 1;
/* Cartes d'amelioration. `cardsState` porte l'offre en cours et le drapeau
   "picked" ; on ne le vide pas au clic pour garder l'ecran affiche en mode
   attente (cf. pickCard). `loadouts` n'est jamais remis a zero par un
   minuteur : seul le message "round" le fait, en meme temps que le reste de
   l'etat de manche. */
export let cardsState = null;      // { boss, deadline, offers, picked } ou null
/* Marchand de reliques (lot K). `merchantState` porte l'offre en cours et le
   solde ; contrairement aux cartes, `done` ne verrouille pas tout l'ecran —
   on peut acheter zero, une ou trois reliques, et « passer » n'est qu'un
   renoncement. */
export let merchantState = null;
export let merchantWait = [];      // ids des joueurs qui n'ont pas encore passe
export let merchantTimerHandle = null;
/* Etat du compte de progression (lot D), tel que le serveur l'envoie. Nul tant
   que rien n'est arrive — le panneau reste alors cache, un compte sans serveur
   n'existe pas. */
export let progressState = null;
export let cardsPending = [];      // ids des joueurs qui n'ont pas encore choisi
export let cardsTimerHandle = null;
export let loadouts = new Map();   // playerId -> [cardId,...]
/* Reliques par joueur (lot K), portees par le meme message `loadout` dans un
   champ separe : la fenetre de build affiche l'indice de puissance reel, et
   il inclut le flat des reliques. */
export let relicsByPlayer = new Map();  // playerId -> [relicId,...]
/* Recharge d'esquive LOCALE, en secondes. « Célérité » la raccourcit, et le
   client doit rejouer la meme formule que le serveur : sans ca, sa propre
   demande d'esquive restait bloquee trois secondes alors que le serveur
   l'aurait accordee, et la pastille de recharge se remplissait a partir du
   mauvais denominateur. Mise en cache et recalculee au seul changement de
   chargement — `computeMods` rejoue toute la table de cartes, ce qui n'a rien a
   faire dans une boucle a 60 images par seconde. */
export let myDashCd = CFG.DASH_CD;
export function refreshLocalMods() {
  myDashCd = CFG.DASH_CD * computeMods(ownedCounts(myId)).dashCdMul;
}
export let snapshots = [];
// Suivi de la reserve de bombes, pour n'afficher l'anneau de portee que dans
// les deux secondes qui suivent une fin de recharge. Voir `ingest`.
export let bombStockSeen = 0;
export let bombReadyAt = -1e9;
export let latest = null;
export let predicted = null;
export let connected = false;
export let lastSnapAt = 0;
export let ping = 0;
// Quelle classe le Menu (progression) montre actuellement : posee par la
// carte qui l'a ouvert (`openMenuFor`), pas par la classe deja choisie au
// salon — on doit pouvoir consulter les trois arbres avant de choisir.
export let metaClsOverride = null;
/* Identite = compte pseudo + mot de passe ; session = JETON. Le localStorage
   ne contient que `survivor.pseudo` et `survivor.token` — jamais le mot de
   passe : un jeton volé ouvre CE jeu, un mot de passe volé ouvre tout ce que
   le joueur protège avec le même. `pendingAuth` porte le message
   d'authentification à (re)jouer : les tentatives suivantes, après un
   `authError` non-fatal, renvoient sur la MÊME socket — sinon chaque faute de
   frappe ouvrirait une socket fantôme. */
export let pendingAuth = null;
/* La socket est ouverte par le ROUTEUR, qui vit tout en haut de la pile ; l'etat
   vit tout en bas. Un appel direct a `connect()` d'ici serait donc la seule
   arete remontante du client, et elle suffirait a rendre l'ordre de chargement
   des modules indefini. L'amorce pose le crochet, comme `createHub` recoit ses
   `hooks` cote serveur. */
let reconnecter = null;
export function setReconnecter(f) { reconnecter = f; }
export function sendAuth(msg) {
  pendingAuth = msg;
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  else reconnecter?.();
}
/* --- bilan de fin de manche -------------------------------------------------
   Deux temps, et non un seul ecran : le bilan d'abord, le salon ensuite. Le
   joueur ne lisait jamais son resultat parce que l'ecran suivant etait deja
   la — avec le tableau, les classes, la difficulte et le bouton de lancement
   par-dessus.

   IL NE SE FERME PLUS TOUT SEUL. Une minuterie de huit secondes couvrait le
   cas du joueur qui a lache la souris, et coutait celui — beaucoup plus
   frequent — du joueur qui lit encore : le bilan porte desormais la
   repartition des degats subis, la jauge de puissance et le detail de sa
   propre partie, c'est-a-dire de quoi passer une minute dessus. Un ecran qui
   se retire pendant qu'on le lit est le defaut meme qu'on est venu corriger en
   le separant du salon. « Continuer » est le seul chemin, et il n'y en a
   qu'un — donc rien a deviner. */
export let bilanOpen = false;
/* --- cartes d'amelioration ------------------------------------------------- */

// Pastilles compactes pour le tableau de fin : une par carte distincte, avec
// le multiplicateur si plusieurs exemplaires. Les noms complets tiendraient
// mal a quatre joueurs sur une ligne, d'ou l'abreviation par ×N plutot que
// de repeter la carte autant de fois qu'elle a ete prise.
/* Cartes possedees d'un joueur, en Map id -> exemplaires. C'est la forme
   qu'attendent `computeMods` et `cardDetail` cote partage : la garder identique
   evite d'avoir deux representations du meme chargement dans le client. */
/* Liste brute des cartes d'un joueur. Le message `loadout` est la source en
   jeu ; le bilan de fin de manche est la source une fois revenu au salon, ou
   plus aucun `loadout` n'arrive. Une seule fonction pour les deux, sinon la
   fenetre de build aurait affiche une liste vide sur exactement l'ecran ou on
   veut la consulter. `lastResult` est remis a null au lancement d'une manche :
   aucun risque d'afficher le chargement de la precedente. */
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
export let pauseReal = false;     // le serveur a vraiment cesse de simuler
/* Null tant que le serveur n'a rien dit. L'ABSENCE N'EST PAS UN DESACCORD : un
   serveur d'avant ce lot n'envoie pas la cle, et son client ne doit alors
   afficher aucun avertissement. */
export let serverVersion = null;
/* Hash court du commit du SERVEUR. Il n'est affiche qu'en cas d'ACCORD — voir
   `updateVersion`, c'est le piege de cette paire. */
export let serverCommit = "";
/* --- saisie ---------------------------------------------------------------------- */

export const keys = new Set();
/* Esquive. Le serveur reste seul juge, mais on la joue aussi en local : sans
   prediction, on appuie et il ne se passe rien pendant un aller-retour reseau,
   ce qui est precisement le moment ou on avait besoin d'etre ailleurs. La
   recharge affichee, elle, vient toujours du serveur. */
export const dash = { pending: false, t: 0, cd: 0, x: 0, y: 0 };
/* Competences : deux demandes ponctuelles, exactement comme l'esquive. Elles ne
   sont PAS predites localement, contrairement au bond : leurs effets (rempart,
   provocation, bombe) sont des entites de la simulation, et une entite predite
   qui n'existe pas cote serveur est bien pire qu'un aller-retour de latence. */
export const skills = { s1: false, s2: false, s3: false };
/* Compteur de performance, sur `?perf` dans l'adresse. Il n'est pas decoratif :
   le lot demande de MESURER les images par seconde avec 300 particules et 200
   ennemis, et une mesure qu'on ne peut pas refaire ne vaut rien. Hors de ce
   drapeau il ne coute pas une ligne de rendu. */
export const PERF = location.search.includes("perf");
export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
/* Ce que chaque barre brisee ajoute au repertoire. La liste n'est plus ecrite
   a la main : elle se lit dans `BOSS_ROSTER`, sinon elle mentirait des le
   deuxieme boss — c'est exactement ce qui est arrive quand le Ravageur etait
   seul et que le texte etait recopie ici. */
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
  // Les trois exclusives du boss final (lot W). `croixdurable`, `cone`,
  // `pacman` et `constriction` manquaient deja : `phaseUnlockText` retombe sur
  // la cle brute, ce qui est degrade mais jamais faux — on les ajoute au
  // passage, l'ecran de phase du final serait sinon le seul a montrer un
  // identifiant nu.
  croixdurable: "croix durable — tiens ton quadrant huit secondes",
  cone: "cône — esquive latéralement",
  pacman: "secteur sûr — place-toi derrière la seule direction épargnée",
  constriction: "constriction — l'arène se referme",
  synthese: "synthèse — regroupement ET exaflares, en même temps",
  entrelacs: "entrelacs — couronne ET disques à la dérive",
  sceau: "SCEAU — tous les foyers tenus en même temps",
};
export function phaseUnlockText(kind, phase) {
  const list = bossAt(kind).unlock[phase - 1];
  if (!list || !list.length) return "il accélère";
  return list.map(k => ATTACK_LABEL[k] ?? k).join(" · ");
}

/* Setters. Une liaison de module ES est VIVANTE en lecture — l'importateur
   voit toujours la valeur courante — mais elle est en lecture seule. Ecrire
   depuis un autre module demande donc de passer par ici, et par rien d'autre.
   C'est ce qui rend l'ecriture de cet etat cherchable en un grep. */
export function setAmSpectator(v) { amSpectator = v; }
export function setBilanOpen(v) { bilanOpen = v; }
export function setBombReadyAt(v) { bombReadyAt = v; }
export function setBombStockSeen(v) { bombStockSeen = v; }
export function setCardsPending(v) { cardsPending = v; }
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
