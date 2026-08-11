/* ===========================================================================
   ECRANS — barre, hub, salon, cartes, marchand, bilan, meta
   La couche ECRAN au sens de la ligne de partage du depot : ce qui vit en DOM
   parce que le compositeur y travaille a la place de la boucle de jeu.
   =========================================================================== */

import { getAudioSource, getMusicVolume, getVolume, initAudio, isMuted, playSound, setAudioSource, setMusicDuck, setMusicVolume, setMuted, setVolume } from "/audio.js";
import { showHud } from "/hud.js";
import { refreshMusicSource } from "/music.js";
import { bossAt } from "/shared/bosses.js";
import { CARDS, CARD_BY_ID, RARITY_COLOR, RARITY_LABEL, banClosure, cardDetail } from "/shared/cards.js";
import { CLASSES, CLASS_DEFAULT, SKILL3_NAME, classAt } from "/shared/classes.js";
import { CFG, DAMAGE_SOURCES, DIFFICULTIES, PLAYER_COLORS, biomeAt } from "/shared/game_state.js";
import { CARD_CATEGORY_COLOR, SRC_TINT, SURFACE } from "/shared/palette.js";
import { CONFORT, MILESTONES, PROG_CFG, TREES, slotsFor, tierCost } from "/shared/progression.js";
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

/* --- hub des salles (plan infra) ---------------------------------------------- */

export function hubStatus(msg, isError = false) {
  hubStatusEl.textContent = msg;
  hubStatusEl.classList.toggle("err", isError);
}
/* Ma latence, en millisecondes ; -1 tant qu'aucun aller-retour n'est revenu.
   DEUX sources selon l'endroit, et c'est structurel : `serverInfo` n'est
   diffuse qu'aux clients HORS salle (un joueur en manche recoit deja des
   instantanes vingt fois par seconde), tandis qu'en salle le chiffre voyage
   dans le salon, sur ma propre ligne d'equipe. */
export let myPing = -1;
/* L'ecran a rendre quand on refermera les parametres. Memorise a l'ouverture :
   sans lui on ressortirait toujours au hub, donc on perdrait son salon pour
   avoir voulu baisser le son. */
export let settingsFrom = null;
/* Les ecrans qui portent la barre, avec leur fil d'Ariane. L'ordre compte :
   c'est celui de la PRIORITE d'affichage, et il suit l'empilement reel —
   `#settings` et `#menu` passent devant le salon puisqu'ils s'ouvrent
   depuis lui. Les ecrans absents de cette table la cachent : #gate (pas
   encore de compte a afficher), #loading (rien a faire pendant trois
   secondes), #cards (on choisit sous minuterie, tout le reste doit
   disparaitre). */
const TOPBAR_SCREENS = [
  { el: () => settingsEl, crumb: () => "Paramètres" },
  { el: () => menuEl, crumb: () => `Progression · ${classAt(metaClsOverride ?? CLASS_DEFAULT).nom}` },
  { el: () => bilanEl, crumb: () => "Bilan de manche" },
  { el: () => panel, crumb: () => roomNameCur ? `Salon · ${roomNameCur}` : "Salon" },
  { el: () => hubScreenEl, crumb: () => "Salons" },
];
function syncTopbar() {
  if (!topbarEl) return;

  /* L'ecran de cartes et celui de chargement passent AVANT tout le reste : ils
     se superposent, et le salon reste techniquement affiche dessous. */
  /* `#brief` masque la barre au meme titre que `#cards` : on lit son role sous
     minuterie, un fil d'Ariane et un bouton de reglages n'ont rien a faire
     par-dessus. */
  /* `#fin` masque la barre pour la meme raison que `#cards` et `#brief` : on y
     lit un verdict, un fil d'Ariane et un bouton de reglages par-dessus
     donneraient une sortie laterale a un ecran qui n'en a qu'une. */
  const masque = (cardsEl && !cardsEl.hidden) || (loadingEl && !loadingEl.hidden)
    || (gate && !gate.hidden)
    || (finEl && !finEl.hidden)
    || (document.getElementById("brief")?.hidden === false);

  const vue = masque ? null : TOPBAR_SCREENS.find(s => { const e = s.el(); return e && !e.hidden; });
  topbarEl.hidden = !vue;
  if (!vue) return;

  topCrumbEl.textContent = vue.crumb();

  /* Pas d'avatar dans ce jeu : l'initiale en capitale plutot qu'un rond vide,
     qui serait un trou a l'endroit ou l'oeil cherche a se reconnaitre. */
  const pseudo = localStorage.getItem("survivor.pseudo") || "";
  topNameEl.textContent = pseudo;
  topAvatarEl.textContent = pseudo ? pseudo[0].toUpperCase() : "?";

  renderTopPing();
}
/* Trois seuils, et le rouge n'est pas cosmetique : au-dela de 140 ms on
   tremble, et le jeu devient injouable. Autant le dire AVANT la manche.
   La pulsation s'arrete au rouge — un temoin qui bat alors que la connexion
   ne suit plus dit exactement le contraire de ce qu'il montre. */
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
/* La cascade d'entree (`riseIn`, menus.css) est une animation d'ECRAN, pas de
   creation de noeud. Or les listes du salon, du hub et de la progression sont
   RECONSTRUITES a chaque diffusion — un vote, un choix de classe, un « prêt »,
   l'arrivee d'un joueur — c'est-a-dire a chaque clic. Mesure sur un seul clic
   du selecteur de difficulte : huit `riseIn` relances d'un coup, donc toute la
   colonne qui repart d'une opacite nulle. C'etait le clignotement.

   `.settled` coupe l'animation pour les rendus suivants, et se retire des que
   l'ecran se cache : la prochaine ouverture doit cascader. Il est pose au
   temps plutot qu'a l'evenement parce qu'une animation qu'on annule en cours
   de route s'annule VRAIMENT — poser la classe a la fin du premier rendu
   couperait la cascade qui vient de commencer, et l'`animationend` du premier
   element arrive alors que le sixieme n'a pas demarre. La derive de la
   constante est benigne : trop court, une cascade se coupe a la fin ; trop
   long, un clic dans la premiere seconde clignote encore. */
const SETTLE_MS = 760;      // --rise (380 ms) + le plafond de decalage (300 ms), avec de la marge
const settleTimers = new WeakMap();
/* LE RETRAIT EST DIFFERE, ET C'EST LA SORTIE D'ECRAN QUI L'IMPOSE. `.settled`
   se retirait des que `hidden` etait pose — ce qui etait juste tant qu'un ecran
   cache disparaissait dans la meme image. Depuis `.leaving`, il reste AFFICHE
   `LEAVE_MS` de plus, et la classe qu'on vient de lui retirer est exactement
   celle qui pose `animation: none` sur ses listes : les huit lignes du salon
   repartaient donc d'une opacite nulle avec leurs decalages `nth-child`,
   PENDANT que l'ecran s'en va. C'est le clignotement de depart, remis en scene
   par la sortie — tout l'ecran qui part se rallume ligne par ligne.
   On attend donc la fin de la sortie pour reamorcer la cascade suivante. */
function syncSettled(el) {
  if (!el) return;
  clearTimeout(settleTimers.get(el));
  if (el.hidden) {
    settleTimers.set(el, setTimeout(() => el.classList.remove("settled"), LEAVE_MS));
    return;
  }
  /* Une reouverture DOIT cascader, et elle peut arriver avant l'echeance
     ci-dessus (aller-retour plus rapide que la sortie). Le retrait est donc
     refait ici, sans condition : l'observateur ne rappelle cette fonction qu'au
     CHANGEMENT de `hidden`, donc un appel a decouvert est toujours une vraie
     ouverture. */
  el.classList.remove("settled");
  settleTimers.set(el, setTimeout(() => el.classList.add("settled"), SETTLE_MS));
}
/* LA SORTIE D'ECRAN. `hidden` retire l'ecran en une image ; `.leaving` le
   maintient affiche le temps de son animation (menus.css), puis se retire. La
   classe est posee ICI et non chez les quinze appelants de `hidden` : plusieurs
   portent des regles d'ordonnancement documentees (`worldQueue`, les gardes de
   `refreshPanel`, l'ordre bilan/salon), et un chemin oublie serait invisible.
   L'observateur, lui, constate.

   La duree est LUE dans la feuille plutot que recopiee : deux nombres a garder
   d'accord divergent a la premiere retouche, et celui-ci ne se verrait qu'a
   l'usage — un ecran qui disparait avant la fin de son fondu. La marge de 40 ms
   couvre l'arrondi et la derniere image. */
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
  /* Reaffiche : on retire la classe tout de suite. Un aller-retour plus rapide
     que l'animation (rouvrir l'ecran qu'on vient de fermer) doit repartir sur
     l'entree, pas finir une sortie qui n'a plus lieu d'etre. */
  if (!el.hidden) { el.classList.remove("leaving"); return; }
  el.classList.add("leaving");
  leaveTimers.set(el, setTimeout(() => el.classList.remove("leaving"), LEAVE_MS));
}
/* L'observateur : neuf ecrans, un seul attribut surveille. Il constate, il ne
   decide pas — c'est ce qui le rend incapable d'oublier un chemin d'affichage.
   Il sert les TROIS lectures de l'attribut `hidden` : le fil d'Ariane de la
   barre, la cascade d'entree, et la sortie ci-dessus. Un SECOND observateur,
   sur une autre liste, sert la quatrieme : l'etouffement de la musique. */
{
  const obs = new MutationObserver(recs => {
    syncTopbar();
    for (const r of recs) {
      /* UN ENREGISTREMENT NE VEUT PAS DIRE UN CHANGEMENT. Le DOM en produit un
         a chaque ECRITURE d'attribut, meme quand la valeur ne bouge pas — et
         plusieurs chemins reposent `hidden = true` sur un ecran deja cache : le
         `welcome` le fait sur `#gate` que `bootOnce` vient de retirer. Sans
         cette comparaison, la sortie repartait pour un tour, donc l'ecran
         REAPPARAISSAIT a pleine opacite avant de refondre — le battement exact
         qu'on est venu supprimer.

         `oldValue` non nul = l'attribut etait deja pose, donc l'ecran etait
         deja cache. Si cet etat vaut le nouveau, rien n'a change. */
      const etaitCache = r.oldValue !== null;
      if (etaitCache === r.target.hidden) continue;
      syncSettled(r.target);
      syncLeaving(r.target);
    }
  });
  /* `#pause` se prend par le document et non par `pauseEl` : cette constante-la
     est declaree bien plus bas, donc encore en zone morte ici. */
  const screens = [gate, loadingEl, hubScreenEl, panel, bilanEl, finEl, menuEl, cardsEl,
                   settingsEl, document.getElementById("pause"),
                   document.getElementById("brief")];
  for (const el of screens) {
    if (el) {
      obs.observe(el, { attributes: true, attributeFilter: ["hidden"], attributeOldValue: true });
    }
  }

  /* ETOUFFEMENT DE LA MUSIQUE — un observateur A PART, et pas une ligne de
     plus dans celui du dessus : la liste n'est pas la meme (le marchand et la
     fenetre de build n'ont ni fil d'Ariane ni cascade) et surtout `screens`
     porte `syncSettled` / `syncLeaving`, qu'on ne veut surtout pas appliquer a
     `#build` — il a sa propre animation d'ouverture.

     Il CONSTATE au lieu de decider, comme la barre superieure et pour la meme
     raison : les quatre ecrans s'ouvrent depuis une dizaine de chemins
     differents (montee de niveau, mort de boss, touche Tab, Echap, clic sur
     une ligne du bilan), et un observateur ne peut pas en oublier un. */
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
/* --- LE RETOUR SONORE DE L'INTERFACE ------------------------------------------

   Un clic sec au survol de ce qui repond au clic. C'est ce qui separe un jeu
   d'un site : dans un jeu, l'interface est une machine qu'on manipule, et une
   machine fait du bruit quand on pose la main dessus.

   LA CIBLE EST CELLE DU POINTEUR, exactement. La feuille decide deja de « ce
   qui repond au clic » — c'est la regle qui pose `--cursor-go`, le crochet de
   visee — et le son reprend sa liste plutot que d'en tenir une seconde : ce
   qui montre le crochet sonne, ce qui ne le montre pas est muet. Un bouton
   DESARME ne sonne donc pas, pour la meme raison qu'il retombe au pointeur de
   repos : il n'est pas une cible, et un retour qui pretend le contraire est
   pire que pas de retour du tout. La duplication du selecteur est assumee et
   commentee des deux cotes (menus.css, « Tout ce qui REPOND au clic ») — un
   selecteur CSS ne se lit pas depuis JavaScript sans supposer la structure de
   la feuille, ce qui serait une dependance bien plus fragile que deux listes
   voisines.

   Delegation sur `document` et non un ecouteur par bouton : les listes du
   salon, du hub et de la progression sont RECONSTRUITES a chaque diffusion,
   donc chaque rendu aurait a rebrancher ses noeuds — c'est le meme piege que
   `.settled`, et il se serait paye en ecouteurs fuites. */
const UI_SOUND_SCREENS = "#gate, #hubScreen, #panel, #menu, #bilan, #fin, #settings, #topbar, #pause";
const UI_SOUND_TARGETS = 'button, a, summary, tr.clickable, input[type="range"]';
/* LA SELECTION PORTE PLUS LOIN QUE LE SURVOL, et c'est la seule difference
   entre les deux listes. Le survol suit le POINTEUR, donc il suit exactement la
   regle du curseur — qui exclut `#cards` et `#build` parce qu'ils s'ouvrent une
   manche en cours et gardent le reticule. La selection, elle, suit l'ACTION, et
   choisir une carte est le geste le plus important du jeu : c'est precisement
   celui qu'il ne faut pas laisser muet. */
const UI_CLICK_SCREENS = `${UI_SOUND_SCREENS}, #cards, #build`;
/* Deux gardes, et elles couvrent deux choses differentes. `lastHovered` evite
   la repetition : `pointerover` se declenche pour CHAQUE descendant survole, et
   un bouton qui porte trois `<span>` sonnerait quatre fois. Le delai, lui,
   borne le BALAYAGE — traverser une liste de huit entrees en un geste tirerait
   huit ticks en trois cents millisecondes, ce qui s'entend comme une
   mitraillette et non comme un retour. 70 ms laisse passer un deplacement
   volontaire d'un bouton a l'autre et coupe le survol accidentel. */
const UI_SOUND_GAP = 70;
let lastHovered = null;
let lastHoverAt = 0;
document.addEventListener("pointerover", e => {
  // Le survol n'existe pas au doigt : sans ce filtre, chaque tap sonnerait
  // deux fois — une fois comme survol, une fois comme clic.
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
/* LA SELECTION SONNE A L'APPUI, pas au clic. Un retour doit arriver pendant que
   le doigt est encore sur le bouton — c'est deja la regle ecrite pour `popIn`
   dans `menus.css` — et `click` n'arrive qu'au relachement, soit cinquante a
   cent millisecondes plus tard sur un clic ordinaire. Le prix est un appui
   annule (on presse, on sort du bouton, on relache) qui sonne quand meme : il
   est rarissime, et le geste a bel et bien eu lieu.

   Memes gardes que le survol pour la cible et le desarmement, mais AUCUNE garde
   de delai en propre : un clic est volontaire par definition, il n'y a pas de
   « balayage de clics » a borner, et deux clics sur deux options doivent rendre
   deux sons. La recharge du limiteur (40 ms) suffit, et elle passe sous tout
   geste humain — mesure : deux appuis a 45 ms rendent bien deux sons, seuls
   deux appuis dans la MEME image n'en rendent qu'un.

   Le filtre tactile du survol n'a pas d'equivalent ici, et c'est voulu : au
   doigt il n'y a pas de survol, donc `pointerdown` est le seul retour possible
   — un tap rend un son, pas deux.

   Le tout premier bouton de la session reste muet : c'est lui qui cree le
   contexte audio, qui n'existe donc pas encore quand il sonne. */
/* DEUX BOUTONS SORTENT DE `selection`, et ce sont les deux qui ENGAGENT : se
   déclarer prêt, lancer la manche. Tout le reste du salon choisit — une classe,
   une difficulté, un onglet — et se defait d'un second clic ; ces deux-la
   avancent la table vers la manche, et l'oreille doit faire la difference sans
   qu'on regarde ce qu'on vient de presser. Meme famille de son, trois degres :
   une inflexion pour un choix, deux notes pour un engagement, un accord resolu
   pour le depart.

   Une table par identifiant plutot qu'un `onclick` sur chacun : les deux
   boutons ont deja leur gestionnaire, qui envoie au serveur, et y greffer du
   son melangerait le retour sensoriel au protocole. La delegation reste le
   point de passage unique — un bouton absent de la table sonne `selection`,
   c'est-a-dire le comportement par defaut, et l'oubli est impossible.

   `#readyBtn` est une BASCULE : `.on` dit qu'on est deja pret, donc que ce clic
   RETIRE. Deux etats opposes qui rendraient le meme son apprennent au joueur a
   ne plus l'ecouter — la classe est lue a l'appui, avant que `refreshPanel` ne
   la retourne. */
function uiSoundFor(el) {
  /* `#start` porte DEUX actions opposees pendant les trois secondes du compte a
     rebours, et le son suit l'action et non le bouton — même règle que
     `#readyBtn` : deux gestes contraires qui sonneraient pareil apprennent à ne
     plus écouter. On lit la classe à l'appui, avant que le serveur ne réponde. */
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
/* RETOUR AUX SALONS. Un bouton « accueil » promet UNE chose : d'ou qu'on
   clique, on arrive au hub. Le sien n'y arrivait que depuis le salon.

   Trois defauts, tous vus a l'usage. Il sortait immediatement quand `!inRoom`,
   donc au hub avec le Terminal ou les Parametres ouverts par-dessus il ne
   faisait RIEN — c'est le « ne marche pas tout le temps ». Depuis une salle
   avec un de ces deux ecrans ouverts, il envoyait `leaveRoom` sans les fermer :
   or `#menu` et `#settings` viennent APRES `#hubScreen` dans le document, a
   z-index egal, donc ils restaient peints par-dessus le hub — on quittait la
   salle et on regardait un ecran mort. Et depuis les Parametres, `settingsFrom`
   pointait sur le salon qu'on venait de quitter : le refermer ressuscitait le
   salon d'une salle ou l'on n'etait plus.

   D'ou un point de passage unique. La confirmation vient EN PREMIER — annuler
   ne doit rien avoir referme — puis on ferme ce qui se superpose, sans rien
   restaurer : la destination est le hub, pas ce que l'ecran recouvrait. */
function goHome() {
  if (!connected) return;
  // En pleine manche on ne quitte pas sechement : meme regle que `#pauseQuit`,
  // l'action est irreversible pour la manche en cours.
  if (inRoom && phase === PHASE_ROUND && !amSpectator
      && !confirm("Une manche est en cours. Quitter la salle et revenir aux salons ?")) {
    return;
  }
  if (settingsEl && !settingsEl.hidden) { settingsEl.hidden = true; settingsFrom = null; }
  if (menuEl && !menuEl.hidden) menuEl.hidden = true;
  closeBuild();
  /* Deja au hub : il n'y a rien a quitter, on vient seulement de refermer ce
     qui le recouvrait. Sans cette branche le bouton restait inerte, ce qui est
     precisement ce qu'on corrige. */
  if (!inRoom) { enterHub(); syncTopbar(); return; }
  ws.send(JSON.stringify({ t: "leaveRoom" }));
}
topHomeBtn.onclick = goHome;
/* Les parametres se rappellent d'ou l'on vient. `settingsFrom` retient
   l'element a redonner, pas un nom d'ecran : c'est lui qu'on rendra, et il n'y
   a rien a resoudre au retour. */
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
/* Entree en etat hub. La reprise proposee par `welcome` ne part plus toute
   seule : elle s'affiche, et c'est le joueur qui tranche. Une redirection
   silencieuse remettait dans une manche en cours sans rien demander, et
   surtout sans dire CE QU'ON REPREND — la vague et l'effectif sont exactement
   ce qui fait choisir entre revenir et rester. La proposition reste a UN COUP
   par `welcome` : `pendingRejoin` est vide des qu'on repond. */
export function enterHub() {
  if (!connected || inRoom) return;
  hubScreenEl.hidden = false;
  hubPassAskEl.hidden = true;
  hubPassAskInput.value = "";
  // Le classement (lot N) se replie a chaque entree au hub : c'est une
  // consultation ponctuelle, pas un etat qu'on veut retrouver ouvert.
  if (hubBoardEl) hubBoardEl.hidden = true;
  /* Etiquette et valeur separees : `textContent` sur le pseudo, qui vient du
     compte — jamais d'interpolation dans du HTML. */
  hubWhoEl.innerHTML = "Connecté comme <b></b>";
  hubWhoEl.querySelector("b").textContent = localStorage.getItem("survivor.pseudo") || "?";
  renderRooms();
  renderResume();
}
/* La fleche de reprise. Un triangle plein, en `currentColor` : meme raison que
   le cadenas de la liste — la feuille decide de la couleur et de la taille. */
const PLAY_SVG =
  `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">`
  + `<path d="M5.4 3.4 12.2 8l-6.8 4.6z" fill="currentColor"/></svg>`;
export function renderResume() {
  if (!hubResumeEl) return;
  /* La salle proposee peut avoir disparu entre le `welcome` et l'affichage :
     on ne propose que ce que la liste confirme, sinon le bouton mene a un
     `joinRoomError` que personne n'a demande. */
  const salle = pendingRejoin
    ? roomsList.find(r => r.code === pendingRejoin.code)
    : null;
  hubResumeEl.hidden = !salle;
  if (!salle) return;

  hubResumeIconEl.innerHTML = PLAY_SVG;
  hubResumeTitleEl.textContent = salle.state === 1
    ? `Une manche tourne encore dans « ${salle.name} »`
    : `Ta salle « ${salle.name} » est toujours ouverte`;

  // Meme correctif que la liste des salles : `info()` envoie `segment`, jamais
  // `wave` — l'encart annonçait « Vague 1 en cours » a toute manche en cours.
  const ou = salle.state === 1
    ? `Étape ${Math.max(1, salle.segment || 0)}/6 en cours`
    : "Au salon";
  const qui = salle.count > 0
    ? `${salle.count} joueur${salle.count > 1 ? "s" : ""} présent${salle.count > 1 ? "s" : ""}`
    : "personne pour l'instant";
  hubResumeSubEl.textContent = `${ou} · ${qui} · tu reprends ta place`;
}
/* Repondre a la proposition la CONSOMME, dans les deux sens. Sans ca, revenir
   au hub apres avoir quitte la salle rouvrirait l'encart. */
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
/* LE CADENAS DE LA LISTE DES SALLES.

   Un SVG en ligne et non 🔒 : l'emoji sort en presentation couleur, donc en
   jaune-orange sature, et `color: var(--text-dim)` ne l'atteint pas — c'etait
   la seule tache saturee d'un ecran qui n'en a aucune, et le rendu changeait
   avec la police du systeme. Pas non plus `icons.js`, qui existe pour les
   glyphes traces a DEUX endroits (arene et HUD) et qui CUIT sa couleur dans
   une image : la teinte serait recopiee en JS alors que `menus.css` la
   declare deja.

   `currentColor` et `1em` : la couleur et la taille restent celles que la
   feuille pose sur `.roomLock`, sans qu'une valeur soit ecrite ici.

   La forme suit la charte plutot que le pictogramme d'usage : anse a angles
   VIFS et non arrondie, corps rectangulaire, serrure percee au trace
   (`fill-rule: evenodd`) et non peinte par-dessus — le fond de la ligne change
   au survol, une serrure remplie d'une couleur en dur s'y serait vue. */
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
    // Une entree pleine est DESACTIVEE, pas masquee : la salle ou sont les
    // autres est celle qu'on attend. La rendre cliquable pour afficher ensuite
    // un refus serait pire — le joueur apprendrait l'information deux fois.
    btn.disabled = full;
    /* Le cadenas ne sort QUE si la sous-ligne parle d'autre chose — donc en
       manche, ou elle porte la vague. Hors manche elle dit deja « protégée par
       mot de passe » en toutes lettres, et le glyphe repetait l'information a
       deux centimetres d'ecart. */
    const lock = r.locked && r.state === 1
      ? `<span class="roomLock" title="protégée par mot de passe">${LOCK_SVG}</span>` : "";
    // « En jeu » et non « manche en cours » : la pastille tient sur six
    // caracteres en capitales espacees, et la sous-ligne dit deja QUELLE vague
    // tourne — repeter « en cours » a deux centimetres d'ecart n'apprend rien.
    const state = r.state === 1 ? `<span class="roomState running">En jeu</span>`
      : full ? `<span class="roomState">Complète</span>`
      : `<span class="roomState">Ouvert</span>`;
    /* Les carres d'effectif ne repetent pas « 3 / 4 » : ils le rendent
       COMPARABLE d'une ligne a l'autre sans le lire. `data-n` porte l'effectif
       present, le CSS allume — rien n'est colore ici, sinon la regle « une
       salle pleine passe au gris » vivrait a deux endroits. Autant de cases
       que de places et non quatre en dur : quatre cases sur une salle qui en
       accepterait six serait un mensonge. La feuille en eclaire jusqu'a
       quatre, les deux bougent donc ensemble. */
    const slots = `<span class="roomSlots" data-n="${r.count}">`
      + "<i></i>".repeat(r.max) + "</span>";
    btn.innerHTML = `<span class="roomName"><span class="roomSub"></span></span>`
      + `${lock}${state}${slots}`
      + `<span class="roomCount">${r.count} / ${r.max}</span>`;
    /* Le nom vient d'un autre joueur : il s'insere en NOEUD DE TEXTE, jamais en
       innerHTML. Il se pose AVANT `.roomSub`, qui est deja dans le `.roomName`
       — un `textContent` sur le parent effacerait la sous-ligne. */
    const nameEl = btn.querySelector(".roomName");
    nameEl.insertBefore(document.createTextNode(r.name), nameEl.firstChild);
    /* La sous-ligne dit ce que `.roomState` ne disait pas : « SALON » ne
       reprend que le contexte de l'ecran. La difficulte et l'avancement sont
       les deux informations qui permettent de choisir une salle SANS y entrer.
       Le verrou n'apparait ici QUE hors manche : en manche, l'etape est plus
       utile, et le glyphe du cadenas porte deja l'information. */
    const mode = DIFFICULTIES[r.diff]?.label ?? "normal";
    // L'ETAPE et non la vague : `info()` envoie `segment` depuis le lot P,
    // `wave` n'existe plus — la ligne affichait donc « vague 1 » pour toutes
    // les salles en manche, quelle que soit leur avancee. Le `Math.max(1, …)`
    // reste, pour une autre raison : `info()` met `segment` a 0 hors manche, et
    // une salle qui bascule en manche a l'instant du rendu afficherait
    // « étape 0 », ce qui se lit comme un compteur casse.
    const etat = r.state === 1 ? `étape ${Math.max(1, r.segment || 0)}/6 en cours`
      : r.locked ? "protégée par mot de passe"
      : "en attente de joueurs";
    btn.querySelector(".roomSub").textContent = `${mode} · ${etat}`;
    btn.onclick = () => {
      // Premier essai toujours SANS mot de passe : un membre connu re-entre
      // directement, et le refus `motdepasse` ouvre l'encart de saisie.
      setJoinAttempt({ code: r.code, name: r.name });
      hubPassAskEl.hidden = true;
      hubStatus(`entrée dans « ${r.name} »…`);
      ws.send(JSON.stringify({ t: "joinRoom", code: r.code }));
    };
    roomListEl.appendChild(btn);
  }
}
/* Le bouton se desarme une seconde, en miroir de la limite serveur (une
   demande par seconde, les suivantes ignorees) : un bouton qui accepte le
   clic pendant que le serveur l'ignore laisse croire que la liste est a
   jour alors qu'elle n'a pas bouge. */
hubRefreshBtn.onclick = () => {
  if (!connected || inRoom) return;
  ws.send(JSON.stringify({ t: "listRooms" }));
  hubRefreshBtn.disabled = true;
  setTimeout(() => { hubRefreshBtn.disabled = false; }, 1000);
};
/* --- classement au temps (lot N) --------------------------------------------
   Il se DEPLIE, il n'ouvre pas d'ecran : c'est une consultation, et la sortir
   dans un overlay aurait fait quitter la liste des salles a qui voulait juste
   jeter un oeil avant de jouer.
   Meme desarmement d'une seconde que l'actualisation, en miroir du frein
   serveur — les deux partagent d'ailleurs ce frein cote hub. */
export let boardData = null;      // [difficulte][rang] -> { pseudo, time }
let boardDiff = 1;         // normal par defaut, comme le vote
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
  /* Un onglet par difficulte : comparer un temps de « calme » a un temps de
     « cauchemar » n'aurait aucun sens, et une liste unique aurait pousse tout
     le monde a jouer en calme pour y figurer. */
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
/* L'encart mot de passe d'une salle protegee : renvoie un joinRoom complet
   sur la MEME salle que le clic initial. */
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
/* Quitter la salle depuis le salon. Pas de confirmation : on ne quitte qu'un
   salon (la manche a son propre bouton, avec confirmation, dans le menu
   pause), et la salle survit a son delai de grace de toute facon. */
panelLeaveBtn.onclick = () => {
  if (!connected || !inRoom) return;
  ws.send(JSON.stringify({ t: "leaveRoom" }));
};
/* --- le compte, depuis le hub -------------------------------------------------- */

export function passMsg(msg, isError) {
  passMsgEl.textContent = msg;
  passMsgEl.classList.toggle("err", isError);
  passMsgEl.classList.toggle("ok", !isError && !!msg);
}
/* La deconnexion est un aller-retour : le serveur invalide le jeton PUIS le
   client purge et referme (`loggedOut`). Purger d'abord laisserait un jeton
   valide de trente jours orphelin cote serveur. */
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
/* --- Menu (progression) -----------------------------------------------------
   UN SEUL point d'entree a l'ecran, et il est SOUS LA CARTE DE LA CLASSE
   CHOISIE (`renderClasses`). Les deux versions precedentes ratent chacune une
   moitie : un bouton par carte, c'est trois fois la meme action et chacune
   concurrence le choix de classe sur sa propre carte ; un bouton dans la barre
   d'action, c'est un arbre detache de la classe qu'il decrit. Sur la seule
   carte choisie, il n'y en a jamais qu'un ET on sait sur quoi il porte.
   `openMenuFor` recoit donc toujours un index explicite. `#menuClose` revient
   au salon sans repasser par la connexion. */
/* --- Terminal (lot H) --------------------------------------------------------
   Point d'entree UNIQUE au salon, et c'est maintenant vrai a la lettre : le
   bouton « Terminal » de la barre d'action a ete retire, il ouvrait le MEME
   ecran que celui de la carte de classe sans dire sur quel arbre. Reste donc
   `.classMetaBtn`, sous la carte choisie, qui le dit. Les deux autres classes
   se consultent par les onglets de l'ecran ; `#menuClose` revient au salon sans
   repasser par la connexion. */
function openMenuFor(clsIndex) {
  panel.hidden = true;
  menuEl.hidden = false;
  renderMeta(clsIndex);
}
menuCloseBtn.onclick = () => {
  menuEl.hidden = true;
  refreshPanel();
};
/* La pastille de progression : des noyaux DEPENSABLES, pas des noyaux tout
   court — elle compare la bourse au moins cher des achats encore possibles
   (prochain palier de n'importe quelle ligne, confort restant). Sans elle,
   personne ne pense a ouvrir l'ecran ; allumee en permanence, elle ne dirait
   plus rien.

   Elle a SUIVI le bouton : elle vivait sur le « Terminal » de la barre
   d'action, elle est desormais sur `.classMetaBtn`. C'etait la seule chose que
   ce bouton apportait, et la perdre aurait rendu la progression invisible a
   qui n'y pense pas. */
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
  return min;
}
/* La pastille vit sur un bouton que `renderClasses()` reconstruit a chaque
   diffusion du salon : on ne peut donc pas la poser une fois pour toutes. Le
   drapeau est memorise ici, et c'est le rendu des classes qui le lit. */
let metaSpendable = false;
export function updateTerminalDot() {
  const pr = progressState;
  metaSpendable = !!pr && pr.cores >= cheapestPurchase(pr);
  const dot = classRow?.querySelector(".classMetaBtn .metaDot");
  if (dot) dot.hidden = !metaSpendable;
}
/* --- reglage du son -------------------------------------------------------

   TROIS jeux de controles pour un seul reglage : l'ecran d'accueil, le menu
   pause et l'ecran de parametres. Une liste et une boucle plutot que trois
   copies des gestionnaires — sans ca, un jeu oublierait de se remettre a jour
   quand on touche a un autre, et on verrait trois volumes differents affiches
   en meme temps pour une seule valeur, ce qui est pire que n'en avoir qu'un.

   Le jeu des parametres n'a PAS de bouton de coupure, et c'est voulu : la
   coupure est un geste d'urgence (« quelqu'un entre dans la piece »), elle a sa
   place la ou l'on est deja — l'accueil et la pause — pas dans un ecran qu'il
   faut d'abord ouvrir. `mute` est donc optionnel dans la table. */
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
    /* Le libelle dit l'ETAT COURANT, jamais l'action a venir. Un bouton dont
       le texte annonce ce qu'il fera se lit a l'envers une fois sur deux,
       et il n'y a rien ici pour lever le doute — c'est le titre (`title`) qui
       porte l'action. Meme raison que `#readyBtn` et sa classe `.on`.
       Le troisieme jeu vit dans une `.setRow` de trois colonnes, ou le libelle
       est deja a gauche : le bouton n'y repete pas « Bande son ». */
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
    // Bouger le volume rétablit le son : couper puis tirer la glissiere sans
    // rien entendre passe pour une panne.
    if (isMuted() && Number(u.vol.value) > 0) setMuted(false);
    refreshAudioUi();
  };

  if (u.mute) {
    u.mute.onclick = () => {
      // Le bouton sert aussi de bouton de test : il debloque le contexte au
      // premier clic, avant meme d'avoir rejoint.
      initAudio();
      setMuted(!isMuted());
      refreshAudioUi();
      if (!isMuted()) playSound("bonus");
    };
  }

  // Volume de la MUSIQUE, separe : a zero, la bande son se tait sans toucher
  // aux signaux du jeu — c'est le bouton « je joue sans musique ».
  if (u.mus) {
    u.mus.oninput = () => {
      setMusicVolume(Number(u.mus.value) / 100);
      refreshAudioUi();
    };
  }

  /* La bascule de source. Deux appels et non un : `audio.js` tient le reglage
     (il en a besoin pour le son de tir), `music.js` tient les deux bandes son
     et doit arreter l'une avant de lancer l'autre. Les fusionner ferait
     dependre `audio.js` de `music.js`, donc un cycle — et `audio.js` ne
     depend de RIEN, c'est ce qui permet de le charger dans un script de
     mesure avec un faux AudioContext.
     `initAudio()` d'abord : sur l'ecran d'entree, le contexte n'est pas encore
     debloque, et sans lui la bascule ne pourrait ni charger l'echantillon ni
     demarrer une piste. */
  if (u.src) {
    u.src.onclick = () => {
      initAudio();
      setAudioSource(getAudioSource() === "pistes" ? "synthe" : "pistes");
      refreshMusicSource();
      refreshAudioUi();
    };
  }
}
// La touche M coupe le son en jeu, sans repasser par le salon.
window.addEventListener("keydown", e => {
  if (e.key !== "m" && e.key !== "M") return;
  // Jamais pendant une saisie : l'ecran d'entree et le hub sont pleins de
  // champs (pseudo, mots de passe, nom de salle) ou un « m » est une lettre.
  // Meme test que les trois autres gestionnaires depuis qu'il existe.
  if (enSaisie()) return;
  setMuted(!isMuted());
  refreshAudioUi();
});
refreshAudioUi();
/* --- le lancement differe -------------------------------------------------------

   Trois secondes entre le clic et la manche, pendant lesquelles on peut faire
   machine arriere. Le delai vient du SERVEUR (message `launch`) et l'echeance
   est recalculee en horloge LOCALE : les deux horloges n'ont aucune raison
   d'etre d'accord, et afficher un `Date.now()` serveur donnerait un compte a
   rebours faux de plusieurs secondes.

   Le meme bouton lance et annule. Deux boutons auraient demande de la place a
   cote d'une action principale qui en occupe deja toute la largeur, et surtout
   « Annuler » n'a de sens que la ou etait « Lancer » — c'est le geste qu'on
   defait, on le defait au meme endroit.

   N'IMPORTE QUI annule, pas seulement l'hote : le compte a rebours existe pour
   rattraper une erreur, et l'erreur n'est pas toujours celle de l'hote — c'est
   aussi « attends, je me suis trompe de classe ». Le bouton est donc rendu a
   tous pendant le decompte, alors qu'il n'appartient qu'a l'hote le reste du
   temps. */
export let launchEndsAt = 0;      // horloge locale, 0 = aucun lancement engage
let launchTimer = 0;
function launchPending() { return launchEndsAt > performance.now(); }
export function renderLaunch() {
  if (!startBtn) return;

  if (launchEndsAt === 0) {
    clearInterval(launchTimer);
    launchTimer = 0;
    startBtn.textContent = "Lancer la manche";
    startBtn.classList.remove("cancel");
    return;                   // `refreshPanel` a deja pose `hidden` et `disabled`
  }

  /* ECHEANCE PASSEE mais toujours au salon : le compte a rebours local est
     epuise et le `round` du serveur n'est pas encore arrive — quelques dizaines
     de millisecondes d'aller-retour. Rendre le bouton a « Lancer la manche »
     ici le rearmerait juste avant qu'il ne disparaisse, et un bouton qui
     clignote a l'instant du lancement est exactement le genre de detail qui
     fait brouillon. On desarme et on annonce, sans rien re-rendre d'autre. */
  if (!launchPending()) {
    clearInterval(launchTimer);
    launchTimer = 0;
    startBtn.disabled = true;
    startBtn.classList.remove("cancel");
    startBtn.textContent = "Lancement…";
    return;
  }

  /* Pendant le decompte, le bouton est a TOUT LE MONDE et toujours actif : il
     ne lance plus, il retient. Le desarmer pour les non-hotes retirerait le
     seul recours de celui qui vient de voir sa classe partir. */
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
/* Sous ce seuil, le compte a rebours passe a l'ambre. Cinq secondes : c'est le
   temps qu'il faut pour lever les yeux et se placer, pas pour lire — donc le
   moment ou l'ecran cesse d'informer et se met a prevenir. */
const BRIEF_URGENT_S = 5;
let briefTimer = 0;
/* Echeance du briefing, en horloge locale. Elle survit a la fermeture du voile
   parce que l'attente affichee dans le HUD la reutilise : celui qui a ferme doit
   savoir combien de temps il attend au pire, sinon « en attente de Kiwi » se lit
   comme un blocage sans issue. */
let briefEndsAt = 0;
/* Qui n'a pas encore ferme, tel que le serveur le voit. Une liste et non un
   compte : le HUD nomme les gens, comme `#waitMsg` au salon — un bouton ou une
   attente qui ne dit pas QUI passe pour une panne. */
export let briefWaiting = [];
let briefWaitTimer = 0;
export function openBrief(dur) {
  if (!briefEl) return;
  /* La classe VERROUILLEE par le serveur, relue dans le salon : `startRound`
     retombe sur le tireur pour qui n'a rien choisi, et c'est cette valeur-la
     qu'il faut annoncer — pas le `null` que le joueur a laisse. */
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
    /* `touche` s'ecrit « A/1 » : deux capuchons separes par « ou ». La barre
       oblique est une notation de table, pas quelque chose qu'on montre a un
       joueur qui cherche quelle touche presser. */
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

  /* LA TROISIEME COMPETENCE, annoncee avec sa touche. Elle n'existe que si une
     carte l'accorde, et sans cette ligne la touche 3 se decouvrait en tirant la
     carte — c'est-a-dire au milieu d'une vague, au pire moment pour apprendre
     une commande. On la nomme et on donne sa touche des le briefing ; ce qui
     manque, c'est la carte, pas l'information. */
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

  /* Le compte a rebours suit `state.warmup` cote serveur, qui retient la vague.
     Il n'a rien a declencher : quand il atteint zero, le voile se retire s'il
     est encore la — et la vague part de toute facon, que l'ecran soit ouvert ou
     non. Un ecart d'une fraction de seconde ne fait donc rien de faux. */
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
    /* LES CINQ DERNIERES SECONDES passent a l'ambre. Le cyan dit « il faut y
       aller », ce qui est juste tant qu'il reste du temps pour lire ; sous cinq
       secondes il ne s'agit plus d'aller quelque part mais de se preparer a
       encaisser. La classe est posee sur le CONTENEUR et non sur le chiffre :
       la barre la lit aussi, et deux temoins du meme compte a rebours ne
       peuvent pas se contredire. Le seuil est teste sur la valeur AFFICHEE
       (`Math.ceil`) — sinon le passage a l'ambre arrive une seconde avant que
       le chiffre ne montre 5, et l'un dementirait l'autre. */
    const urgent = Math.ceil(reste) <= BRIEF_URGENT_S && reste > 0;
    briefCountEl?.classList.toggle("urgent", urgent);
    briefEl.classList.toggle("urgent", urgent);
    // A l'echeance le voile se retire tout seul : celui qui n'a pas clique
    // « continuer » ne doit pas decouvrir la premiere vague a travers un
    // panneau.
    if (reste <= 0) closeBrief();
  };
  // La barre part de zero SANS transition, sinon elle glisserait depuis la
  // largeur du briefing precedent.
  briefBarFill.style.transition = "none";
  briefBarFill.style.width = "0%";
  briefBarFill.offsetWidth;                 // force le recalcul avant de rendre la transition
  briefBarFill.style.transition = "";
  tick();
  briefTimer = setInterval(tick, 250);
}
/* Le voile se retire, le compte a rebours MEURT avec lui. Il n'a rien a
   declencher — c'est `state.warmup` cote serveur qui retient la vague, et il
   court que l'ecran soit ouvert ou non. */
export function closeBrief() {
  if (!briefEl) return;
  clearInterval(briefTimer);
  briefTimer = 0;
  briefEl.hidden = true;
  // L'urgence meurt avec le voile : sans ca, le briefing de la manche suivante
  // rouvrirait en ambre sur ses vingt secondes.
  briefEl.classList.remove("urgent");
  briefCountEl?.classList.remove("urgent");
  renderBriefWait();
}
/* « Continuer » ne retire plus seulement le voile : il DIT au serveur qu'on a
   fini. C'est la derniere confirmation qui lance la vague, sans attendre les
   vingt secondes — la table n'a plus a regarder un compte a rebours dont plus
   personne n'a besoin.

   L'envoi est ici et pas dans `closeBrief()`, qui a trois autres appelants —
   l'echeance du compte a rebours, `roundAbort` et `roundEnd`. Aucun des trois
   n'est une confirmation : a l'echeance le serveur coupe deja tout seul, et les
   deux autres ferment un briefing dont la manche n'existe plus. Un `briefDone`
   parti de la ne dirait rien de vrai. */
if (briefGoBtn) {
  briefGoBtn.onclick = () => {
    closeBrief();
    if (connected && phase === PHASE_ROUND) ws.send(JSON.stringify({ t: "briefDone" }));
  };
}
/* L'ATTENTE, pour celui qui a deja ferme. Rien tant que le voile est ouvert :
   celui qui lit voit deja son propre compte a rebours, et lui apprendre que
   d'autres lisent aussi ne lui sert a rien — pire, ca le presserait.

   Le compte a rebours est REPRIS ici, et c'est ce qui empeche l'attente de se
   lire comme un blocage : « en attente de Kiwi » seul ne dit pas si l'on est
   parti pour deux secondes ou pour la soiree. Il descend en meme temps que le
   sien, sur la meme horloge locale. */
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
  /* Son propre battement : `briefTimer` est mort avec le voile, et c'est
     precisement pendant l'attente qu'il faut continuer a compter. Il se cree au
     premier affichage et meurt avec lui — jamais deux, la fonction est appelee
     a chaque `briefState` recu. */
  if (!briefWaitTimer) briefWaitTimer = setInterval(renderBriefWait, 250);
  /* Les noms tant qu'il y en a deux, le compte au-dela : a quatre joueurs,
     trois noms font une phrase plus longue que le bandeau de vague, et on ne
     lit pas une liste pendant qu'on se place sur la carte. Meme regle qu'au
     salon, meme seuil. */
  const qui = briefWaiting.length <= 2
    ? briefWaiting.map(escapeHtml).map(n => `<b>${n}</b>`).join(" et ")
    : `<b>${briefWaiting.length} joueurs</b>`;
  const reste = Math.max(0, Math.ceil((briefEndsAt - performance.now()) / 1000));
  hudBriefEl.innerHTML = `En attente de ${qui} — briefing <i>${reste} s</i>`;
}
/* --- salon et tableau des scores ---------------------------------------------- */

export function refreshPanel() {
  /* AVANT toutes les gardes, et c'est ce qui fait de `refreshPanel` le bon
     porteur : chacune de ses sorties precoces — hors salle, `#gate` ouvert,
     Menu ouvert — est un ecran ou le numero de version doit rester VISIBLE. */
  updateVersion();
  if (!connected) return;
  // Hors salle, il n'y a pas de salon : c'est le hub qui occupe l'ecran, et
  // un broadcast attarde de la salle qu'on vient de quitter ne doit pas le
  // rouvrir par-dessus la liste.
  if (!inRoom) { panel.hidden = true; return; }
  // #gate peut etre en pause (cle a lire, ou message de doublon) sans etre
  // hidden : #panel est plus loin dans le DOM, meme z-index, et peindrait
  // dessus au premier broadcast "lobby" (qui arrive presque tout de suite
  // apres n'importe quelle connexion) si on ne le bloquait pas ici.
  if (!gate.hidden) return;
  // Le Menu (progression) est ouvert PAR-DESSUS le salon (meme z-index,
  // #panel apres #menu dans le DOM) : un lobby broadcast pendant qu'on le lit
  // ne doit pas rouvrir le salon dessous. `menuCloseBtn` cache #menu AVANT
  // d'appeler refreshPanel(), donc le retour volontaire n'est pas bloque ici.
  if (!menuEl.hidden) return;
  /* Pas de garde pour le briefing : il n'est plus un ecran qui remplace le
     salon mais un VOILE pose sur une manche qui tourne. Le HUD doit vivre
     dessous — c'est lui qu'on decouvre en cliquant « continuer ». */
  // Le HUD ne vit que pendant la manche. Il est en DOM : laisse affiche sous le
  // salon, il aurait montre une barre de vie et un chronometre figes.
  showHud(phase === PHASE_ROUND);
  // Le bilan passe DEVANT le salon et non par-dessus : tant que les deux
  // etaient le meme ecran, le joueur ne lisait jamais le sien.
  // `finOpen` compte au meme titre que `bilanOpen` : le salon arrive avec le
  // `roundEnd` et se peindrait dessous, ce qui est exactement le defaut qui
  // avait fait sortir le bilan du salon.
  if (phase === PHASE_ROUND || bilanOpen || finOpen) { panel.hidden = true; return; }
  panel.hidden = false;

  const isHost = myId === hostId;
  const hostName = lobby.find(l => l.id === hostId)?.name ?? "?";

  /* TROIS NIVEAUX, un seul par element. Le KICKER dit ou l'on est (« Salon ·
     tu es l'hôte »), le TITRE dit quoi — le nom de la salle, pas le mot
     « Salon », qui serait redit deux fois de suite. Le titre reste « Salon »
     quand la salle n'a pas de nom : un titre vide vaut moins qu'un titre
     generique. */
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

  /* Le lancement attend que TOUT LE MONDE ait confirme. C'est le bon choix en
     ligne : les joueurs ne sont plus dans la meme piece, on ne peut pas
     demander « t'es prêt ? » a voix haute, et l'hote n'a aucun autre moyen de
     savoir si quelqu'un est encore en train de lire les cartes de classe.
     La garde vit AUSSI dans room.js — desarmer un bouton est de l'affichage,
     pas une regle. */
  /* EN SOLO, PERSONNE NE MANQUE — et la regle est celle de `notReady()` cote
     serveur, recopiee ici parce que les deux cotes doivent compter la MEME
     chose. Le bouton disparait plutot que de rester sans effet : le depot refuse
     un controle qui repond au clic sans rien changer, et « 1 joueur sur 1 est
     prêt » se lit comme un compteur casse. */
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

  /* Le resume de lancement dit ce qu'on s'apprete a lancer, en une ligne :
     ma classe, le mode retenu, l'effectif prêt. `#waitMsg` juste dessous dit
     pourquoi le bouton ne repond pas. Deux lignes et deux roles — la premiere
     decrit, la seconde explique. */
  const maClasse = classAt(me?.cls ?? CLASS_DEFAULT).nom;
  const mode = DIFFICULTIES[difficulty]?.label ?? "normal";
  const prets = lobby.length - manquants.length;
  launchSummaryEl.textContent = solo
    ? `${maClasse} · difficulté ${mode} · en solo`
    : `${maClasse} · difficulté ${mode} · ${prets} joueur${prets > 1 ? "s" : ""}`
      + ` sur ${lobby.length} ${prets > 1 ? "sont prêts" : "est prêt"}`;

  /* Griser sans expliquer fait passer le bouton pour une panne — meme regle
     que `.classOpt.taken`, qui nomme l'occupant au lieu de seulement griser.
     On NOMME donc qui manque, et au-dela de deux on compte : quatre pseudos
     dans une barre de 16 px de haut ne se lisent plus. */
  if (solo) {
    // Branche SOLO en premier : sans elle, la branche « personne ne manque »
    // annoncerait « tout le monde est prêt, spectateurs compris » a un joueur
    // seul — une phrase qui parle d'une table qui n'existe pas.
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

  /* EN DERNIER, et c'est la condition pour qu'il gagne : `renderLaunch()`
     ecrase le libelle du bouton et la ligne d'attente quand un compte a rebours
     court. Place plus haut, tout ce qui precede le reecrirait. */
  renderLaunch();
}
/* L'EQUIPE : qui est la, avec quelle classe, prêt ou non, et a quelle latence.
   Rien de tout cela n'existait, et c'est ce qui manquait le plus depuis le
   passage du reseau local au jeu en ligne — en LAN le ping etait une
   decoration a 8 ms pres, en ligne c'est ce qui explique pourquoi un joueur
   « teleporte », et c'est ce qui decide si on rejoint une salle ou non. */
function renderTeam() {
  if (!teamListEl) return;
  teamListEl.innerHTML = "";

  /* Le decompte des prets suit le BOUTON : en solo il n'y en a plus, donc la
     pastille se tait au lieu d'annoncer « 0 / 1 prêts » pour un etat que plus
     rien ne permet de changer. Meme raison pour le liseré `.ready` des lignes —
     la ligne d'equipe ne peut pas contredire un controle absent. */
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
    /* Le ping vaut -1 tant qu'aucun aller-retour n'est revenu : on affiche un
       tiret et non « 0 ms », qui se lirait comme une connexion parfaite —
       exactement le contraire de « on ne sait pas encore ». */
    const ms = Number(l.ping);
    const pingTxt = Number.isFinite(ms) && ms >= 0 ? `${ms} ms` : "—";

    /* DEUX LIGNES et une pastille d'initiale. Sur une seule ligne, le pseudo,
       la classe, le ping et l'etat se disputaient la largeur : la classe
       tombait a 11 px entre deux colonnes de chiffres, alors que c'est
       l'information qu'on relit le plus au salon. La pastille porte la
       COULEUR DU JOUEUR — celle de son personnage dans l'arene, pas celle de
       sa classe : c'est la meme convention que le liseré autour des noms
       pendant la manche. */
    const teinte = PLAYER_COLORS[l.colorIndex % PLAYER_COLORS.length] ?? PLAYER_COLORS[0];
    row.innerHTML =
      `<span class="teamAvatar"></span>` +
      `<span class="teamMain">` +
        `<span class="teamTop">` +
          `<span class="teamName"></span>` +
          (l.id === hostId ? `<span class="teamHost">hôte</span>` : "") +
        `</span>` +
        // « choisit sa classe… » plutot qu'un tiret : un tiret se lit comme une
        // valeur manquante, la phrase dit que quelqu'un est en train de faire
        // quelque chose — ce qui est exactement le cas, et ce qu'on attend.
        `<span class="teamCls">${cls ? escapeHtml(cls.nom) : "choisit sa classe…"}</span>` +
      `</span>` +
      `<span class="teamPing">${pingTxt}</span>` +
      // Le carre porte l'etat prêt en plus du fond de la ligne. Ce n'est pas
      // une redondance decorative : le fond vert est tres pale (7 %) pour
      // rester lisible sous du texte, et il ne suffit pas seul a distinguer
      // quatre lignes d'un coup d'oeil.
      `<span class="teamDot"></span>`;

    // textContent et non innerHTML : le pseudo vient d'un autre joueur.
    row.querySelector(".teamName").textContent = l.name;
    const av = row.querySelector(".teamAvatar");
    av.textContent = (l.name || "?").trim().charAt(0).toUpperCase() || "?";
    av.style.color = teinte;
    if (cls) row.querySelector(".teamCls").style.color = cls.couleur;
    else row.querySelector(".teamCls").classList.add("pending");
    teamListEl.appendChild(row);
  }
}
/* Les manches precedentes de CETTE salle, la plus recente en tete. Trois
   informations et pas une de plus : l'heure, le mode, la vague atteinte.

   PAS de victoire ni de defaite, contrairement a ce que montre le prototype :
   le jeu ne connait pas cette notion — `bilanTitle` dit « vague N atteinte » —
   et l'introduire ici en ferait une regle de game design decidee par un ecran
   d'interface. Decision de l'auteur du jeu, la vague seule.

   L'heure est formatee ICI et non cote serveur : elle voyage en horodatage
   absolu, donc chaque joueur la lit dans SON fuseau. Un « 21:04 » calcule sur
   le serveur serait faux pour tout le monde sauf lui. */
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

    /* DEUX cellules et une troisieme vide, pas trois pleines : la feuille
       n'habille que `.histWhen` et `.histLabel`, et le mode comme l'etape
       forment une seule information — « ce qu'on a joué et jusqu'où ». Les
       separer sur deux colonnes les faisait lire comme deux mesures.

       L'ETAPE et non la vague. La ligne lisait `h.wave`, champ que
       `recordRound()` n'ecrit plus depuis le lot P : TOUTES les lignes de
       l'historique affichaient « vague 0 » — le compteur casse que ce meme
       commentaire redoutait ailleurs. Le NOM en plus du numero, comme le
       bilan : « Crise » se redit, « 3/6 » se traduit.
       Repli en tiret et non « étape 0 » : `history` vient du serveur, qui peut
       etre reste sur une version anterieure pendant un deploiement. */
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
/* Prêt : le client DEMANDE, le serveur decide et rediffuse le salon. On ne
   bascule donc rien localement — a quatre, deux clients qui se contredisent
   afficheraient deux salons differents. */
readyBtn.onclick = () => {
  if (phase !== PHASE_LOBBY) return;
  const me = lobby.find(l => l.id === myId);
  ws.send(JSON.stringify({ t: "ready", on: !me?.ready }));
};
/* Vote de difficulte. Chacun choisit, la majorite l'emporte, et l'egalite
   retient le mode le plus doux : personne ne doit pouvoir imposer cauchemar
   a la table en etant seul de son avis. */
/* Les quatre multiplicateurs d'un mode, COMPOSES depuis `DIFFICULTIES` et
   jamais recopies : un texte qui recopie une constante ment des le premier
   reglage. Meme regle que les descriptions de cartes, qui composent `fmtM(LA
   CONSTANTE)` au lieu d'ecrire un nombre. */
const VOTE_STATS = [
  { nom: "PV",          val: d => d.hp },
  { nom: "apparitions", val: d => d.spawn },
  { nom: "dégâts",      val: d => d.dmg },
  { nom: "boss",        val: d => d.boss },
];
// « ×1,28 » — virgule decimale et deux decimales, comme la fenetre de build.
function mul2(v) { return "×" + v.toFixed(2).replace(".", ","); }
// « ×1,8 » — la meme chose sans les zeros de queue, pour une pastille etroite.
function mulCourt(v) { return "×" + String(+v.toFixed(2)).replace(".", ","); }
/* CE QUE LE MODE CHANGE, en une ligne. Ce sont les trois lignes de `resume` du
   PROFIL et non les quatre multiplicateurs.

   La raison est celle du lot T : une difficulte n'est plus quatre nombres. Elle
   choisit un script — donc quelle geometrie —, un roster, un attachement de
   traits et un decor ; les multiplicateurs n'en sont plus que le RESIDU. Les
   afficher seuls redonnait au joueur exactement l'impression que le lot T a
   corrigee, celle de trois modes qui ne different que par une echelle. La
   preuve par l'absurde etait deja dans le code : le mode de reference n'ayant
   que des x1,00, la ligne n'avait rien a dire et il fallait la remplacer par une
   phrase d'excuse.

   La quatrieme ligne est le BIOME, parce que c'est la difficulte qui decide de
   ce qu'il fait : meme geometrie dans les trois modes, seuls les dangers
   changent. Les deux informations se lisent ensemble ou pas du tout. */
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
    /* Le gain de noyaux est une VRAIE valeur de la meta (`PROG_CFG.DIFF_MUL`),
       pas un indice de difficulte agrege pour l'occasion : c'est ce qu'on gagne
       a jouer plus dur, et c'est la seule chose que les quatre multiplicateurs
       ci-dessous ne disent pas. Le mot « noyaux » est ECRIT et vient EN TETE —
       un « ×1,8 » nu se confondrait avec les multiplicateurs de la ligne du
       dessous, qui ne parlent pas de la meme chose, et « ×1,8 noyaux » se lit
       comme une quantite alors que c'est un multiplicateur sur le gain. */
    const noyaux = PROG_CFG.DIFF_MUL[i] ?? 1;
    btn.innerHTML =
      `<span class="voteHead"><span class="voteName"></span>`
      + `<span class="voteMul">noyaux ${mulCourt(noyaux)}</span></span>`
      + `<span class="voteDetail"></span>`
      + (n > 0 ? `<span class="tally"></span>` : "");
    btn.querySelector(".voteName").textContent = d.label;
    btn.querySelector(".voteDetail").textContent = voteDetail(d, i);
    // Le decompte reste sur la CARTE et pas seulement au pied : a quatre, ce
    // qu'on veut voir c'est la repartition, pas seulement le vainqueur.
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
  /* Deux regles reelles, chacune la ou elle sert : a plusieurs, la seule
     question est ce qui arrive en cas d'egalite ; seul, elle ne se pose pas et
     ce qui compte est que le vote se ferme au lancement. */
  voteHint.textContent = lobby.length > 1
    ? `Mode retenu : ${retenu} (${tally[difficulty] ?? 0} voix sur ${lobby.length}).`
      + ` À égalité, le plus doux l'emporte.`
    : `Mode retenu : ${retenu}. Le vote se verrouille au lancement.`;
}
/* Choix de classe. Les emplacements uniques deja pris sont grises : le serveur
   refuse de toute facon le doublon, mais un bouton qui ne repond pas sans rien
   dire passe pour une panne. Une fois la premiere manche jouee, la classe est
   verrouillee pour la session — le selecteur reste affiche, en lecture seule,
   pour qu'on sache avec quoi on joue. */
/* Les trois statistiques comparees, normalisees sur la MEILLEURE des classes et
   non sur une valeur absolue : la question du salon est « laquelle encaisse le
   plus », pas « combien de points de vie fait un Rempart ». */
const CLASS_STATS = [
  { nom: "PV", val: c => c.hp, texte: c => String(c.hp) },
  { nom: "dégâts", val: c => c.damageMul, texte: c => pourcent(c.damageMul) },
  { nom: "vitesse", val: c => c.speedMul, texte: c => pourcent(c.speedMul) },
];
function pourcent(mul) {
  const p = Math.round((mul - 1) * 100);
  return (p > 0 ? "+" : p < 0 ? "−" : "±") + Math.abs(p) + " %";
}
/* Silhouette du personnage, a l'ECHELLE REELLE du jeu et surtout AVEC LE MEME
   SPRITE : le panneau montre exactement ce qu'on aura a l'ecran. Un dessin a
   part aurait menti au premier reglage — c'est la meme raison qui fait qu'il
   n'y a qu'une table de couleurs et qu'une echelle typographique.

   Elle passe donc par `drawSprite`, comme toute entite du jeu, sur le contexte
   du petit canvas plutot que sur celui de l'arene. C'est tout l'interet d'un
   point de passage qui prend son contexte en argument. */
const CLASS_SIL_PX = 88;
function paintClassSilhouette(cv2, c) {
  // Meme regle que l'arene : la memoire du canvas suit la densite de l'ecran,
  // sinon la silhouette est floue exactement la ou on la regarde de pres.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv2.width = Math.round(CLASS_SIL_PX * dpr);
  cv2.height = Math.round(CLASS_SIL_PX * dpr);
  cv2.style.width = CLASS_SIL_PX + "px";
  cv2.style.height = CLASS_SIL_PX + "px";

  const g = cv2.getContext("2d");
  const s = 1.4;                     // l'arene est vue de plus loin que ce panneau
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.translate(CLASS_SIL_PX / 2, CLASS_SIL_PX / 2);

  g.strokeStyle = SURFACE.line;
  g.lineWidth = 1;
  g.beginPath(); g.arc(0, 0, (CFG.PLAYER_RADIUS + 8) * s, 0, Math.PI * 2); g.stroke();

  drawSprite(g, frameOf(`c_${c.id}_idle`), 0, 0,
    { scaleX: s, scaleY: s, tint: c.couleur });
}
/* La classe pour laquelle le bouton d'arbre est DEJA pose. Il ne rejoue son
   apparition que si cette valeur change — voir le commentaire au point de
   creation. `null` au depart et jamais remis a zero : revenir dans un salon
   avec la meme classe fait arriver le bouton AVEC l'ecran (`screenIn`), il n'a
   pas a se signaler une seconde fois. */
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

    /* Les barres portent la couleur de la classe (`currentColor`) : trois
       panneaux de barres grises se seraient ressemble au point qu'on aurait
       compare les longueurs sans savoir laquelle appartient a qui. */
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

    /* L'ACCES A L'ARBRE, sous la carte et sur la SEULE carte choisie.

       Trois versions ont existe. Un bouton sur chacune des trois cartes :
       trois fois la meme action, et chacune concurrencait le choix de classe
       sur sa propre carte. Un bouton unique dans la barre d'action : plus
       aucune ambiguite, mais l'arbre n'etait plus rattache a la classe qu'il
       decrit. Un bouton sur la carte CHOISIE reprend les deux : il n'y en a
       jamais qu'un a l'ecran, et on lit sur quoi il porte sans avoir a
       l'ouvrir.

       Il vit SOUS la carte et non dedans : `.classOpt` est un <button>, et un
       bouton imbrique dans un bouton est invalide — le navigateur le sort du
       parent et la mise en page part avec. D'ou la cellule. */
    const cell = document.createElement("div");
    cell.className = "classCell";
    cell.appendChild(btn);

    if (i === mine) {
      const meta = document.createElement("button");
      meta.className = "classMetaBtn";
      /* `.fresh` porte l'apparition, et il ne se pose QUE sur un vrai
         changement de classe. Cette fonction rejoue a chaque diffusion du
         salon — un vote, un « prêt », l'arrivee d'un joueur — et reconstruit
         `#classRow` a chaque fois : sans ce test, le bouton renaissait
         identique et rejouait son `popIn`, donc il clignotait a chaque clic
         de la page. C'est le meme defaut que les listes voisines, mais
         `.settled` ne peut pas le couvrir : ce bouton nait d'un clic, bien
         apres que l'ecran s'est pose. */
      if (mine !== metaBtnCls) meta.classList.add("fresh");
      meta.textContent = `Talents du ${c.nom}`;
      meta.style.color = c.couleur;
      /* La pastille des noyaux depensables, reposee a chaque rendu : ce bouton
         est reconstruit a chaque diffusion du salon, elle ne peut pas survivre
         toute seule. Un POINT et non un nombre — le nombre est dans l'ecran,
         ici il ne s'agit que de dire qu'il y a quelque chose a y faire. */
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
// Onglet courant du Terminal. L'arbre est l'onglet par defaut : c'est la
// qu'on depense, les autres sont de la consultation.
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
  // `slotsFor` prend le PROFIL (lot H) : la capacite vient des jalons du
  // compte, elle est commune aux trois classes.
  const slots = slotsFor(pr);
  const equipped = cp.equipped ?? [];

  /* Le titre porte l'arbre affiche : c'est la premiere chose a savoir sur cet
     ecran, et le kicker au-dessus dit deja de quoi il s'agit. Le chiffre de
     noyaux sort du libelle pour devenir un chiffre a part entiere — c'est
     l'information qu'on vient chercher, elle ne doit pas etre un suffixe. */
  menuTitleEl.textContent = `Arbre du ${cdef.nom}`;
  metaCoresEl.textContent = `${pr.cores} noyaux`;

  // Onglets de classe : les trois arbres, celui affiche marque `.mine` —
  // meme langage de bascule que les onglets de connexion et le vote.
  metaClassTabsEl.innerHTML = "";
  for (let i = 0; i < CLASSES.length; i++) {
    const b = document.createElement("button");
    b.textContent = CLASSES[i].nom;
    b.className = classAt(i).id === clsId ? "mine" : "";
    b.onclick = () => renderMeta(i);
    metaClassTabsEl.appendChild(b);
  }

  // Les emplacements, toujours visibles, avec la provenance de chacun : ce
  // qui manque est une promesse — l'afficher fait partie du systeme.
  const bosses = (pr.milestones ?? []).filter(id => id.startsWith("boss_")).length;
  metaSlotsEl.innerHTML =
    `<b>Emplacements ${equipped.length} / ${slots}</b> équipés sur le ${escapeHtml(cdef.nom)}`
    + ` · réattribution libre entre les manches<br>`
    + `<small>${PROG_CFG.SLOTS_BASE} de départ`
    + ` · vague ${PROG_CFG.SLOTS_WAVE} ${(pr.milestones ?? []).includes("vague10") ? "✓" : "•"}`
    + ` · ${PROG_CFG.SLOTS_BOSSES} boss différents (${Math.min(bosses, PROG_CFG.SLOTS_BOSSES)}/${PROG_CFG.SLOTS_BOSSES})`
    + ` · ${PROG_CFG.SLOTS_RUNS} parties (${Math.min(pr.runs ?? 0, PROG_CFG.SLOTS_RUNS)}/${PROG_CFG.SLOTS_RUNS})</small>`;

  // Bascule d'onglet : une seule des listes est visible.
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
      ? "confort : aucun emplacement consommé, commun aux trois classes"
      : metaTab === "jalons"
        ? "les jalons débloquent cartes et emplacements — jamais des noyaux"
        : "cartes bannies de ce compte — définitif, pas de débannissement";

  /* Cartes bannies (lot J) : consultation seule. Le nom et l'effet — on doit
     pouvoir se rappeler ce qu'on a ecarte — et rien d'autre : pas de bouton,
     le ban est definitif par contrat. */
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

    /* Trois etats VISUELLEMENT distincts (lot H) : achete et equipe, achete
       non equipe, non achete — trois traitements nets, pas trois gris. */
    const row = document.createElement("div");
    row.className = "metaLine"
      + (isEquipped ? " equipped" : n > 0 ? " owned" : " locked");
    row.innerHTML =
      `<span class="metaName">${escapeHtml(line.nom)}</span>` +
      `<span class="metaPips">${"●".repeat(n)}${"○".repeat(PROG_CFG.TIERS_MAX - n)}</span>` +
      // A zero palier on montre le pas — c'est ce qu'on achete — sinon le TOTAL
      // possede, qui est ce qu'on a.
      `<span class="metaDesc">${escapeHtml(n > 0 ? line.desc(n) : line.desc(1) + " par palier")}</span>`;

    const buy = document.createElement("button");
    buy.className = "metaBuy";
    if (n >= PROG_CFG.TIERS_MAX) {
      buy.textContent = "max";
      buy.disabled = true;
    } else {
      // L'unite en toutes lettres, jamais un glyphe : un signe de monnaie
      // invente doit s'apprendre avant de pouvoir lire un prix, et il n'existe
      // nulle part ailleurs dans le jeu. C'est la meme forme qu'en tete
      // d'ecran, « 2 480 noyaux ».
      buy.textContent = `${cost} noyaux`;
      buy.disabled = pr.cores < cost || phase !== PHASE_LOBBY;
      buy.onclick = () => ws.send(JSON.stringify({ t: "metaBuy", cls: clsId, line: line.id }));
    }

    const eq = document.createElement("button");
    eq.className = "metaEquip" + (isEquipped ? " on" : "");
    eq.textContent = isEquipped ? "équipée" : "équiper";
    // On peut toujours DESEQUIPER, meme sans emplacement libre : c'est
    // precisement comme ca qu'on en libere un.
    eq.disabled = n <= 0 || (!isEquipped && equipped.length >= slots) || phase !== PHASE_LOBBY;
    eq.onclick = () => {
      const lines = isEquipped ? equipped.filter(l => l !== line.id) : [...equipped, line.id];
      ws.send(JSON.stringify({ t: "metaEquip", cls: clsId, lines }));
    };

    row.append(buy, eq);
    metaTreeEl.appendChild(row);
  }

  /* Le tronc de confort : commun aux trois classes, ne consomme aucun
     emplacement — d'ou une liste a part, sans bouton d'equipement. */
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

  /* Les jalons de deblocage : ce qui reste a accomplir est une promesse de
     contenu, l'afficher fait partie du systeme. */
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
    // `cls` peut etre nul : un joueur qui n'a rien choisi et n'a pas encore
    // joue n'a pas de classe, et lui en afficher une serait mentir.
    const cdef = (r.cls === null || r.cls === undefined) ? null : classAt(r.cls);
    tr.innerHTML =
      `<td class="name" style="color:${col}">${escapeHtml(r.name)}${tag}</td>` +
      `<td class="sub"${cdef ? ` style="color:${cdef.couleur}"` : ""}>${cdef ? escapeHtml(cdef.nom) : "—"}</td>` +
      `<td>${r.level ?? 1}</td>` +
      `<td>${r.score}</td><td>${r.kills}</td><td>${r.deaths}</td>` +
      // `damage` n'existe pas cote serveur avant ce systeme : un onglet reste
      // sur une version anterieure du client doit quand meme afficher un
      // tableau coherent plutot que "undefined".
      `<td>${Math.round(r.damage ?? 0)}</td>` +
      `<td class="cards">${cardBadges(r.id)}</td>` +
      // Noyaux gagnes sur la manche (lot D). Un tiret pour les lignes du salon
      // et les serveurs anterieurs, qui n'envoient pas le champ.
      `<td class="sub">${r.cores !== undefined ? "+" + r.cores : "—"}</td>` +
      `<td class="sub">${r.total ? r.total.score : 0}</td>`;
    /* La LIGNE ouvre la fenetre de build. Les pastilles de cartes etaient la
       depuis le debut mais illisibles : c'est ici, le tableau sous les yeux,
       qu'on veut comprendre pourquoi quelqu'un a fait trois fois plus de
       degats. Le clic sur la ligne entiere et non sur un bouton dedie — la
       cible est plus grande et il n'y a rien d'autre a faire d'une ligne. */
    tr.className = "clickable";
    tr.title = "voir la build";
    tr.onclick = () => openBuild(r.id);
    body.appendChild(tr);
  }
}
/* --- l'ecran de fin de manche (0.8.7) ----------------------------------------
   Ce qui vient d'arriver, AVANT les chiffres. Une manche se terminait sur
   l'apparition d'un tableau de scores : la seule chose que le joueur voulait
   savoir — je suis tombe, ou j'ai gagne, et jusqu'ou — se lisait en cherchant
   un titre au-dessus d'une grille.

   Le lot W refusait un ecran de victoire dedie, au nom de « moins d'ecrans
   entre le joueur et ses chiffres ». Le defaut d'origine etait pourtant autre
   chose : le salon restait affiche SOUS le bilan et lui volait l'attention —
   deux ecrans se disputaient le meme instant. Ici il n'y a aucune concurrence,
   `#fin` est seul, il porte trois chiffres a grande echelle et UNE action
   nommee qui mene exactement la ou l'on allait deja.

   Rien ne voyage : tout vient du `roundEnd` que le bilan lit deja. Et AUCUN
   compte a rebours — un ecran qui se ferme tout seul redeviendrait le voile
   qu'on traverse sans lire, ce que le bilan a fini par refuser pour de bon.
   Corollaire : pas de minuteur, donc rien a nettoyer dans `closeFin`. */
export function openFin(res) {
  if (!finEl) return;
  setFinOpen(true);
  finEl.hidden = false;
  panel.hidden = true;
  bilanEl.hidden = true;

  // OU l'on etait, comme le kicker du bilan — et pour la meme raison : ce sont
  // les deux choses qui distinguent deux fins par ailleurs identiques.
  if (finKicker) {
    const mode = DIFFICULTIES[difficulty]?.label ?? "";
    finKicker.textContent = [roomNameCur, mode].filter(Boolean).join(" · ");
  }

  /* Le verdict, en une phrase. « Tu es tombé » et non « Partie terminée » :
     l'ecran ne resume pas, il dit ce qui vient de se passer a CELUI qui le
     lit. Le bilan, juste apres, garde son titre descriptif. */
  finEl.classList.toggle("win", !!res.victory);
  finTitle.textContent = res.victory ? "Victoire" : "Tu es tombé";

  /* TROIS chiffres, et pas un de plus : l'etape atteinte, le niveau, le temps
     de survie. Ce sont ceux qu'on cite en se retournant vers la table. Tout le
     reste — kills, degats, ventilation, tableau nominatif — est a un clic, et
     c'est precisement le role du bouton. */
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
  // Meme piege que la classe de victoire du bilan : laissee en place, la manche
  // suivante ouvrirait sur une fin de defaite habillee en gain.
  finEl.classList.remove("win");
}
/* L'ENCHAINEMENT VERS LE BILAN VIT DANS LE CLIC, jamais dans `closeFin()`.
   C'est exactement le piege deja documente pour `#brief`, dont le `briefDone`
   part du bouton et non de `closeBrief()` : `closeFin` a quatre autres
   appelants — manche interrompue, nouvelle manche, salle fermee, deconnexion —
   dont aucun n'est une confirmation, et qui ne doivent surtout pas ouvrir le
   bilan. */
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

  /* LE TITRE PARLE DU SCRIPT. « Manche 1 terminée » apres une demi-heure de jeu
     se lisait comme un compteur casse : le numero de manche etait juste, c'est
     l'unite de jeu qui a change. L'etape atteinte est ce que la table retient
     de sa partie, donc c'est elle qui titre ; le numero de manche descend avec
     les autres chiffres.

     Elle est NOMMEE depuis le lot X, et c'est le titre qui en profite le plus :
     « morts à la Crise » est une phrase qu'une table se redit, « morts au
     segment 3 » est une coordonnee qu'il faut traduire. Le numero reste a cote,
     il dit la distance parcourue.

     Et une manche peut desormais se GAGNER — six etapes, six boss. C'est la
     seule chose que ce titre doit dire quand elle arrive. */
  const niv = res.level ? ` — niveau ${res.level}` : "";
  // La victoire change la TETE du bilan, elle n'ouvre pas un ecran de plus :
  // voir `#bilan.win` dans la feuille de style.
  bilanEl.classList.toggle("win", !!res.victory);
  bilanTitle.textContent = res.victory
    ? `Victoire — les six étapes franchies${niv}`
    : res.segment
      ? `Partie terminée — ${segmentName(res.segment)}`
        + ` (${res.segment}/${TL_CFG.SEGMENTS})${niv}`
      : `Partie terminée`;
  /* Les chiffres de la TABLE, pas ceux d'un joueur — le tableau juste dessous
     ventile par personne. « joueurs » a saute : le tableau en donne la liste
     nominative deux lignes plus bas, le compter etait la seule statistique de
     l'ecran qui n'apprenait rien.

     A la place, DEGATS et DPS. Ils manquaient et ce n'est pas un detail : le
     tableau donnait des degats bruts, qu'on ne peut comparer d'une manche a
     l'autre sans les rapporter au temps. Une manche de 4 min a 80 000 degats et
     une de 12 min a 190 000 se lisent enfin. Deduits cote client — la somme des
     lignes divisee par la duree — donc rien de neuf sur le reseau. */
  /* OU l'on etait. Le nom de la salle et la difficulte ne se lisent nulle part
     ailleurs une fois la manche finie, et ce sont les deux choses qui
     distinguent deux bilans par ailleurs identiques. */
  if (bilanKicker) {
    const mode = DIFFICULTIES[difficulty]?.label ?? "";
    bilanKicker.textContent = [roomNameCur, mode].filter(Boolean).join(" · ");
  }

  /* QUATRE chiffres, et ce sont ceux de la TABLE. Il y en avait six, dont
     trois — degats, degats/s, subis — qui ne disent rien au niveau collectif :
     le tableau juste dessous les ventile par joueur, ou ils se comparent. Les
     quatre qui restent repondent chacun a une question qu'aucune ligne du
     tableau ne pose : combien de temps, combien de morts en face, combien
     etions-nous, laquelle des manches de la soiree. */
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
/* LE TABLEAU DU BILAN, distinct de celui du salon. Les deux partageaient
   `renderScores`, et c'est ce qui avait fait grossir celui du bilan a dix
   colonnes : chacune servait a l'un des deux ecrans. Ici sept, et chacune
   repond a « qui a fait quoi » — la classe rejoint le nom (c'est une identite,
   pas une mesure), le niveau et le cumul de session sortent (ils appartiennent
   au salon), les pastilles de cartes sortent aussi : la build s'ouvre d'un clic
   sur la ligne, et c'est ce que dit le texte sous le titre. */
const BILAN_COLS = [
  { lab: "score",  val: r => fmtBig(r.score ?? 0),   mine: true },
  { lab: "kills",  val: r => String(r.kills ?? 0) },
  { lab: "morts",  val: r => String(r.deaths ?? 0) },
  { lab: "dégâts", val: r => fmtBig(r.damage ?? 0) },
  // Un TIRET et non zero : le tireur ne soigne pas, il n'a pas rate quelque
  // chose. Zero se lirait comme un resultat.
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
    // La pastille porte la TEINTE DE CLASSE, pas celle du joueur : sur un
    // ecran de fin on lit des roles, plus des positions dans l'arene.
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

    /* La LIGNE ouvre la fenetre de build — c'est ce que la phrase sous le titre
       annonce, et c'est la seule chose qu'on puisse faire d'une ligne. */
    tr.className = "clickable";
    tr.onclick = () => openBuild(r.id);
    bilanScoresBody.appendChild(tr);
  }
}
/* LE BILAN NE SE FERME PLUS TOUT SEUL, et les deux boutons sont sa seule
   sortie. L'echeance de douze secondes a existe, a ete retiree, est revenue,
   et repart pour de bon — l'aller-retour vaut d'etre ecrit.

   L'argument pour : le bilan est court — quatre chiffres, une ventilation, un
   tableau — et une table de quatre n'a pas a attendre celui qui a lache sa
   souris. L'argument contre l'emporte : un ecran qui se retire pendant qu'on
   le lit est un defaut, et le remede — un compte a rebours affiche, suspendu
   au premier clic — mettait la lecture SOUS MINUTERIE pour l'annoncer. Or on
   ne lit pas de la meme facon quand un chiffre descend a cote du texte : c'est
   le defaut qu'on croyait corriger qui se deplacait dans l'oeil du lecteur.

   Ce qui reste de l'ancien mecanisme : rien. Pas de minuteur suspendu, pas de
   barre a zero, pas de gestionnaire de clic pour l'interrompre — les trois
   n'existaient que pour lui. Celui qui veut repartir clique « Continuer »,
   comme partout ailleurs dans le jeu. */

/* DE QUOI L'EQUIPE EST MORTE. Une ligne de barres, une par provenance, en part
   du total encaisse par la table.

   Agrege sur l'EQUIPE et non par joueur, et c'est un choix : cinq colonnes de
   plus dans le tableau des scores l'auraient rendu illisible a quatre joueurs,
   alors que la question — « qu'est-ce qui nous a tues » — se pose au collectif.
   Le detail par joueur existe deja ailleurs pour ce qui le merite (la fenetre de
   build, ouverte depuis une ligne du tableau).

   Rien ne s'affiche si personne n'a rien pris : une rangee de zeros n'est pas
   une information, et une manche parfaite ne doit pas se lire comme une erreur
   d'affichage. */
function renderHurtBy(rows) {
  const total = DAMAGE_SOURCES.map(() => 0);
  for (const r of rows) {
    for (let i = 0; i < total.length; i++) total[i] += (r.hurtBy?.[i] ?? 0);
  }
  const somme = total.reduce((a, b) => a + b, 0);
  if (somme <= 0) { bilanHurt.hidden = true; bilanHurt.innerHTML = ""; return; }
  bilanHurt.hidden = false;

  // Tri DECROISSANT : ce qui a le plus fait mal se lit en premier. Les
  // provenances a zero sortent — elles n'apprennent rien et diluent la ligne.
  const parts = DAMAGE_SOURCES
    .map((s, i) => ({ i, label: s.label, val: total[i] }))
    .filter(p => p.val > 0)
    .sort((a, b) => b.val - a.val);

  /* UNE SEULE BARRE EMPILEE, et une legende dessous. Il y avait une barre par
     provenance, chacune tracee sur toute la largeur : quatre barres a comparer
     de l'oeil alors qu'elles sont les parts d'un meme total. Empilees, la
     comparaison ne demande plus rien — c'est la forme meme de la question.

     Les couleurs viennent de la rampe des degats subis (`SRC_TINT`), donc de
     la charte : la legende n'a plus besoin du glyphe de provenance, la pastille
     suffit a relier un segment a son nom. */
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
  // Diagnostic reseau : les totaux de SESSION se lisent ici, sans avoir a
  // viser une vague dense — la partie jouee, quelle qu'elle soit, suffit.
  // Apres roundEnd il n'arrive plus d'instantane, les totaux sont figes.
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
  /* La classe de victoire (lot N) se retire ICI : laissee en place, la manche
     suivante afficherait un bilan de defaite en vert. Elle s'appelle `win` —
     c'est le nom que `showBilan` pose. Cette ligne retirait `victoire`, classe
     qu'aucun chemin n'ajoutait : elle ne faisait rien, et les regles CSS ecrites
     pour elle n'ont jamais eu de porteur. Le `toggle` de `showBilan` couvrait le
     retrait, donc rien ne se voyait — c'est exactement le genre de faux filet
     qu'on prend pour une securite. */
  bilanEl.classList.remove("win");
  refreshPanel();
}
bilanGo.onclick = closeBilan;
/* Remonter au HUB depuis le bilan. Il fallait sinon fermer le bilan, attendre
   le salon, puis le quitter — trois gestes pour dire « j'arrete ». */
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
/* Un glyphe par FAMILLE, pas un par carte. Cinq a huit signes, le joueur les
   apprend en deux manches et reconnait la nature d'une offre avant de l'avoir
   lue ; soixante icones n'auraient rien appris a personne et auraient coute
   soixante dessins. Trait seulement, dans la couleur de rarete du panneau
   (`currentColor`) — une seconde couleur ici aurait concurrence la seule qui
   porte une information sur cet ecran.

   La carte de secours n'a pas de famille : elle prend le losange neutre. */
const FAMILY_ICON = {
  degats:   `<path d="M12 2 L16 9 L12 22 L8 9 Z"/>`,                      // lame
  cadence:  `<path d="M13 2 L5 13 h5 l-1 9 l9 -12 h-5 z"/>`,              // eclair
  mobilite: `<path d="M4 6 l6 6 l-6 6 M13 6 l6 6 l-6 6"/>`,               // double chevron
  survie:   `<path d="M12 2 L20 6 v6 c0 5 -4 8 -8 10 c-4 -2 -8 -5 -8 -10 V6 Z"/>`,
  soutien:  `<path d="M12 3 v18 M3 12 h18"/>`,                            // croix
};
const FAMILY_ICON_DEFAULT = `<path d="M12 3 L21 12 L12 21 L3 12 Z"/>`;
function familyIcon(famille) {
  const d = FAMILY_ICON[famille] ?? FAMILY_ICON_DEFAULT;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"` +
         ` stroke-width="2" stroke-linejoin="miter">${d}</svg>`;
}
// Ferme l'ecran de choix et son minuteur d'affichage. Fonction unique plutot
// que de repeter les quatre lignes a chaque point de sortie (fin de manche,
// abandon, reprise apres choix, deconnexion).
export function closeCards() {
  setCardsState(null);
  setCardsPending([]);
  stopCardsTimer();
  cardsEl.hidden = true;
}
/* --- marchand de reliques (lot K) -------------------------------------------
   Meme squelette que l'ecran de cartes — overlay, titre, filet de temps,
   rangee — mais les achats sont INDEPENDANTS : pas de verrouillage global au
   premier clic. Le prix et le solde changent a chaque achat ; le serveur
   renvoie alors l'offre a jour (message `merchant`), que ce rendu rejoue.

   L'effet d'une relique est en valeur EXACTE, jamais en pourcentage — c'est
   sa nature, la spec K7 l'exige, et c'est ce qui la distingue d'une carte
   des qu'on la lit. La contrepartie est en evidence (`.cardWarn`, ambre),
   pas en petit texte : une relique a contrepartie doit se refuser pour ce
   qu'elle COUTE, pas pour ce qu'elle donne. */

export function renderMerchant() {
  if (!merchantState) { merchantEl.hidden = true; return; }
  merchantEl.hidden = false;

  /* Le titre porte le solde : c'est la question que l'ecran pose — « qu'est-ce
     que je peux m'offrir » — et le solde est la reponse, avant meme de lire
     les reliques. */
  merchantTitle.innerHTML =
    `Marchand <span class="merchantEclats">${merchantState.eclats} éclats</span>`;

  merchantRow.innerHTML = "";
  for (const id of merchantState.offers) {
    const r = relicById(id);
    if (!r) continue;
    const col = RARITY_COLOR[r.tier] ?? RARITY_COLOR[0];
    const prix = relicPrice(r);
    const btn = document.createElement("button");
    /* Memes materiaux de rarete que les cartes : une relique legendaire est un
       evenement, elle se reconnait avant d'etre lue. */
    btn.className = `cardOpt r${r.tier}`;
    btn.style.color = col;
    btn.dataset.id = id;
    btn.disabled = merchantState.done || merchantState.eclats < prix;
    /* L'effet est la ligne la plus grosse, comme sur les cartes : c'est ce
       qu'on compare entre trois reliques. */
    let html =
      `<div class="cardTop">` +
        `<span class="cardName">${escapeHtml(r.nom)}</span>` +
      `</div>` +
      `<div class="cardMeta">` +
        `<span class="cardRarity">${RELIC_RARITY[r.tier] ?? ""}</span>` +
      `</div>` +
      `<div class="cardBody">` +
        `<div class="cardMain">${escapeHtml(r.desc)}</div>` +
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

  /* La relance, a cote de la rangee : elle se paie et elle ne repart pas.
     Desactivee quand le joueur n'a pas assez — le cout croit avec la vague,
     donc elle finit toujours par couter plus que ce qu'elle vaut. */
  const reroll = document.createElement("button");
  reroll.className = "ghost";
  reroll.textContent = `Relancer (${merchantState.rerollCost} éclats)`;
  reroll.disabled = merchantState.done || merchantState.eclats < merchantState.rerollCost;
  reroll.onclick = () => {
    ws.send(JSON.stringify({ t: "rerollRelic" }));
  };
  merchantRow.appendChild(reroll);

  /* Passer est un RENONCEMENT, jamais un choix par defaut : le bouton reste
     explicite, la spec K7 l'exige — on ne doit jamais avoir l'impression qu'un
     achat est obligatoire. */
  const passer = document.createElement("button");
  passer.className = "ghost";
  passer.textContent = "Passer";
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
  /* On ne grise pas tout : les autres reliques restent achetables. Mais on
     desactive celle-ci pour eviter le double envoi (le serveur renverra
     l'offre a jour, qui la retirera). */
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
// Envoi de la carte choisie. L'ecran reste ouvert mais bascule en mode
// attente : le serveur seul decide de la reprise, cf. le commentaire sur le
// message "state" plus haut.
function pickCard(id) {
  if (!cardsState || cardsState.picked) return;
  cardsState.picked = true;
  cardsState.pickedId = id;
  ws.send(JSON.stringify({ t: "pickCard", id }));
  markCardPicked(id);
}
/* LA SELECTION MUTE LA RANGEE, ELLE NE LA RECONSTRUIT PAS.

   `pickCard` appelait `renderCards()`, qui vide `cardsRow.innerHTML` et recree
   les trois boutons. Or `#cardsRow .cardOpt` porte `riseIn` en `both`, avec des
   delais de 0, 70 et 140 ms : les trois cartes repartaient donc d'une opacite
   NULLE au moment ou l'on venait d'en choisir une. C'etait le clignotement, et
   c'est exactement le defaut que `.settled` corrige ailleurs.

   `.settled` ne pouvait pas servir ici, et le depot le disait deja : la carte
   epique porte `riseIn` ET `epicBreath` dans la MEME declaration, donc un
   `animation: none` lui aurait aussi retire sa respiration — c'est-a-dire la
   seule chose qui en fait un evenement. La bonne correction est en amont : on
   ne detruit pas ce qui n'a pas change. Trois classes, un `disabled` et deux
   retraits suffisent a dire « c'est joue ».

   `renderCards()` reste le chemin des vrais changements d'offre — nouveau
   tirage, relance, tour suivant — ou reconstruire est correct. */
function markCardPicked(id) {
  for (const btn of cardsRow.querySelectorAll(".cardOpt")) {
    const mienne = btn.dataset.card === String(id);
    btn.disabled = true;
    btn.classList.toggle("picked", mienne);
    btn.classList.toggle("faded", !mienne);
    // Le ban n'a plus de sens une fois la carte prise : il disparaissait deja
    // dans l'ancien rendu, faute d'etre recree.
    btn.querySelector(".cardBan")?.remove();
  }
  // `hidden` plutot que `remove()` : meme resultat a l'ecran, et le noeud reste
  // la si un nouveau tirage le reactive.
  const rb = cardsRow.querySelector("#cardsReroll");
  if (rb) { rb.disabled = true; rb.hidden = true; }
  renderCardsWait();
}
/* Bannissement (lot J). Irreversible et sans carte de remplacement : la
   confirmation est SYSTEMATIQUE et dit tout — la cloture de dependances, et
   le cas particulier de la derniere variante de troisieme competence encore
   disponible pour la classe, qui prive le compte de `s3` pour toujours. */
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

  /* Le titre dit D'OU VIENT LE CHOIX, et les deux cas existent a nouveau depuis
     le lot X : un ecran s'ouvre a chaque niveau, en pleine horde, et seuls ceux
     qui suivent un combat portent le nom du boss vaincu. `more` compte les choix
     qui suivent celui-ci — sans lui on prend le second ecran pour un bug
     d'affichage du premier. */
  const suite = cardsState.more > 0
    ? ` — encore ${cardsState.more} choix après celui-ci`
    : "";
  cardsTitle.textContent = cardsState.bossWave
    ? `${bossAt(cardsState.bossKind).nom.toUpperCase()} ${ROMAN[cardsState.boss] ?? cardsState.boss}`
      + ` vaincu — niveau ${cardsState.level}${suite}`
    : `${segmentName(cardsState.segment)} — niveau ${cardsState.level}${suite}`;

  /* La carte dit son effet, ce qu'on en possede deja, et ce que l'exemplaire
     suivant y ajoute. Sans les deux dernieres lignes, un joueur qui a deux
     Affutage lit « +12 % de dégâts » et n'a aucun moyen de comparer une
     troisieme carte de degats a une premiere carte defensive — c'est-a-dire
     exactement la decision que l'ecran est cense lui faire prendre.

     `cardDetail` compose les chaines dans `cards.js`, a cote de la table : le
     client place des div, il ne calcule pas de valeur de carte. */
  const owned = ownedCounts(myId);

  cardsRow.innerHTML = "";
  for (const c of cardsState.offers) {
    const col = RARITY_COLOR[c.rarity] ?? RARITY_COLOR[0];
    const d = cardDetail(c.id, owned);
    const btn = document.createElement("button");
    /* La rarete est une CLASSE et non une couleur de bordure : chaque palier a
       un materiau — bordure plate, bordure epaisse, lueur, degrade balaye — et
       c'est le materiau qui la rend reconnaissable au coin de l'oeil. Le
       detail vit dans `ui.css`, a cote des autres regles de rendu. */
    btn.className = `cardOpt r${c.rarity ?? 0}`;
    btn.style.color = col;
    // L'identifiant est pose sur le noeud : c'est ce qui permet a la selection
    // de retrouver SA carte sans reconstruire la rangee. Voir `markCardPicked`.
    btn.dataset.card = c.id;
    btn.disabled = cardsState.picked;
    /* Selection : la carte prise se verrouille, les deux autres s'estompent.
       Le joueur doit voir ce qu'il a ECARTE — c'est la moitie de la decision,
       et l'ecran se fermait dessus sans rien en montrer. */
    if (cardsState.picked) {
      btn.classList.add(cardsState.pickedId === c.id ? "picked" : "faded");
    }

    // Le serveur reste la source de `desc` (c'est lui qui a tire la carte) ;
    // le reste est deduit localement du chargement, que le client connait deja.
    /* La famille et le palier tiennent sur la ligne de rarete : « épique » a
       gauche, « dégâts — palier 3 / 4 » a droite. C'est ce qui rend la
       progression lisible sans lire les effets — un joueur qui prend le palier 2
       sait du meme coup qu'il en existe un au-dessus, et que ses paliers
       inferieurs ne lui seront plus proposes. */
    /* L'EFFET est la ligne la plus grosse de la carte, pas le nom : c'est ce
       qu'on compare entre trois cartes en trente secondes. Le nom ne sert qu'a
       la reconnaitre une fois prise. */
    let html =
      `<div class="cardTop">` +
        `<span class="cardIcon">${familyIcon(d?.familleId)}</span>` +
        `<span class="cardName">${escapeHtml(c.nom)}</span>` +
      `</div>` +
      `<div class="cardMeta">` +
        `<span class="cardRarity">${RARITY_LABEL[c.rarity] ?? ""}</span>` +
        (d?.famille ? `<span class="cardFamily">${escapeHtml(d.famille)}</span>` : "") +
      `</div>` +
      /* CATEGORIE ET RANG. La categorie est la seule couleur de la carte qui ne
         soit pas celle de la rarete, et c'est assume : elle reprend la grammaire
         fonctionnelle (rouge offensif, cyan defensif, vert soutien, violet
         zone), donc elle se reconnait avant d'etre lue. Le rang, lui, est en
         teinte neutre : c'est un chiffre, pas un signal. */
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

    // Le pied dit l'ETAT : ce qu'on possede, et ce que l'exemplaire suivant
    // donnera. Sans la ligne avant/apres, le choix n'est pas decidable.
    if (d && (d.cumul || d.valeur)) {
      html += `<div class="cardFoot">` +
        (d.cumul ? `<span>${escapeHtml(d.cumul)}</span>` : "") +
        (d.valeur ? `<span class="cardDelta">${escapeHtml(d.valeur)}</span>` : "") +
      `</div>`;
    }

    btn.innerHTML = html;
    btn.onclick = () => pickCard(c.id);

    /* Bouton de BAN (lot J), clairement separe du choix : un `span` en pied
       de carte (le HTML interdit un bouton dans un bouton), discret — c'est
       une action rare et irreversible, elle ne doit pas concurrencer le
       choix. `stopPropagation` l'empeche de declencher aussi pickCard. */
    if (!cardsState.picked) {
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

  /* « Relance » (lot D) : une nouvelle offre, une fois par manche. Le bouton
     vit dans la rangee des cartes, en derniere position — c'est un choix de
     tirage, pas une action d'ecran. Le serveur repond par un nouveau message
     `cards` qui reconstruit tout cet etat. */
  if (cardsState.reroll && !cardsState.picked) {
    const rb = document.createElement("button");
    rb.id = "cardsReroll";
    rb.innerHTML = "↻<br>relancer<br>le tirage";
    rb.title = "une seule relance par manche";
    rb.onclick = () => {
      cardsState.reroll = false;
      rb.disabled = true;
      ws?.send(JSON.stringify({ t: "reroll" }));
    };
    cardsRow.appendChild(rb);
  }

  renderCardsWait();
  startCardsTimer();
}
// La liste des joueurs connus (pseudo par id) vient du salon, deja tenue a
// jour par le message "lobby" — inutile de la faire transiter une seconde
// fois dans les messages de cartes.
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
// `deadline` est un Date.now() serveur : un ecart d'une seconde entre les
// horloges des machines de la LAN est sans consequence, donc pas besoin de
// synchronisation, juste d'une lecture reguliere du delta local.
/* Un FILET qui se vide sous le titre, et non un chiffre : le chiffre demandait
   de quitter les cartes des yeux pour lire un nombre, alors que la seule
   question est « est-ce que j'ai encore le temps de comparer ». Il vire a
   l'ambre sur le dernier quart — la, la reponse est non. */
function updateCardsTimer() {
  if (!cardsState) return;
  const span = Math.max(1, cardsState.deadline - cardsState.from);
  const k = Math.max(0, Math.min(1, (cardsState.deadline - Date.now()) / span));
  cardsTimerFill.style.width = `${k * 100}%`;
  cardsTimerEl.classList.toggle("urgent", k < 0.25);
}

/* Setters. Une liaison de module ES est VIVANTE en lecture — l'importateur
   voit toujours la valeur courante — mais elle est en lecture seule. Ecrire
   depuis un autre module demande donc de passer par ici, et par rien d'autre.
   C'est ce qui rend l'ecriture de cet etat cherchable en un grep. */
export function setBoardData(v) { boardData = v; }
export function setBriefWaiting(v) { briefWaiting = v; }
export function setLaunchEndsAt(v) { launchEndsAt = v; }
export function setMyPing(v) { myPing = v; }
export function setSettingsFrom(v) { settingsFrom = v; }
