/* ===========================================================================
   FENETRE DE BUILD
   Un ecran pour trois entrees : Tab en jeu, une ligne du bilan, une ligne du
   salon. Deux fenetres montrant la meme chose auraient diverge au premier
   reglage.
   =========================================================================== */

import { BOSS_CFG } from "/shared/bosses.js";
import { CARD_BY_ID, RARITY_COLOR, RARITY_LABEL, cardDetail } from "/shared/cards.js";
import { CLASS_DEFAULT, SKILL3_NAME, classAt } from "/shared/classes.js";
import { CFG, PLAYER_COLORS } from "/shared/game_state.js";
import { SIGNAL } from "/shared/palette.js";
import { TL_CFG } from "/shared/timeline.js";
import { PHASE_ROUND, bilanOpen, lastResult, latest, lobby, myId, ownedCounts, phase, skills } from "../core/state.js";
import { deaths } from "../render/fx.js";
import { nameOf } from "../render/stage.js";
import { buildBackBtn, buildCards, buildClass, buildEl, buildMods, buildName, buildSkills, buildSkillsTitle, buildStats, escapeHtml, fmtBig } from "./dom.js";

let buildTarget = 0;
export let buildPaintedAt = 0;
/* Qui l'on peut inspecter, dans l'ordre. En jeu ce sont les joueurs presents
   dans l'instantane ; au salon, ceux du dernier bilan ; a defaut, la table du
   salon. Trois sources et une seule liste : les fleches doivent parcourir la
   meme chose quel que soit l'ecran d'ou la fenetre a ete ouverte. */
function buildRoster() {
  if (phase === PHASE_ROUND && latest) return [...latest.players.keys()];
  if (lastResult) return lastResult.rows.map(r => r.id);
  return lobby.filter(l => !l.spectator).map(l => l.id);
}
/* Tout ce que la fenetre affiche d'un joueur, ramene a une seule forme. Les
   statistiques viennent de l'instantane en jeu et du bilan au salon — la
   fenetre, elle, ne connait qu'un objet. */
function buildInfo(id) {
  const live = phase === PHASE_ROUND ? latest?.players.get(id) : null;
  const row = lastResult?.rows.find(r => r.id === id);
  const lob = lobby.find(l => l.id === id);
  const cls = live?.cls ?? row?.cls ?? lob?.cls ?? null;
  return {
    id,
    name: nameOf(id),
    colorIndex: lob?.colorIndex ?? 0,
    cls,
    counts: ownedCounts(id),
    score: live?.score ?? row?.score ?? 0,
    kills: live?.kills ?? row?.kills ?? 0,
    deaths: live?.deaths ?? row?.deaths ?? 0,
    damage: Math.round(live?.damage ?? row?.damage ?? 0),
  };
}
/* Les multiplicateurs EFFECTIFS, calcules par la meme fonction que la
   simulation (`fullMods`, exportee par game_state) : Vœu partagé compris, part
   de palier du « Cœur de forge » comprise, repli de classe compris. Recoder ce
   calcul ici aurait donne deux resultats differents sur l'ecran dont le seul
   but est de verifier un chargement.

   Le palier se DEDUIT du segment et du beat, comme la saturation se deduit de
   la liste d'ennemis : le serveur l'a deja envoye sous une autre forme, le
   retransmettre serait payer deux fois. */
function buildMultipliers(info) {
  const others = [];
  for (const id of buildRoster()) if (id !== info.id) others.push(ownedCounts(id));
  const tier = latest?.segment
    ? ((latest.segment - 1) * TL_CFG.BEATS + (latest.beat ?? 0)) + 1
    : 1;
  return fullMods(info.counts, others, info.cls ?? CLASS_DEFAULT, tier);
}
/* Un multiplicateur se lit « ×1,84 » et non « +84 % » : c'est la forme sous
   laquelle on compare deux joueurs d'un coup d'oeil, et celle du tableau des
   scores qu'on est en train d'expliquer. La cadence est un INTERVALLE cote
   simulation — plus il est court, plus on tire — donc on affiche son inverse,
   sinon la seule ligne du panneau ou « plus grand » veut dire « pire ». */
function fmtMul(v) {
  return "×" + v.toFixed(2).replace(".", ",");
}
/* `get` rend le chiffre qui sert a COLORER la ligne — un multiplicateur, donc
   comparable a 1 dans les deux sens. `fmt` ne sert qu'a l'ecrire autrement
   quand le multiplicateur seul ne dit pas ce qu'il faut savoir : le critique se
   juge sur sa chance ET sur son multiplicateur, et « ×1,38 » cache les deux. */
const BUILD_MODS = [
  { nom: "dégâts", get: m => m.damageMul },
  { nom: "cadence", get: m => 1 / Math.max(0.01, m.fireIntervalMul) },
  { nom: "critique", get: m => 1 + m.critChance * (m.critMul - 1),
    fmt: m => `${Math.round(m.critChance * 100)} % · ${fmtMul(m.critMul)}` },
  { nom: "rayon", get: m => m.areaMul },
  { nom: "vitesse", get: m => m.speedMul },
  { nom: "dégâts subis", get: m => m.damageTakenMul, bas: true },
];
/* REPERES DE PUISSANCE, mesures et non estimes : 300 manches solo tireur avec
   le vrai systeme de tirage, `powerIndex` releve a chaque carte prise. Les
   quatre valeurs sont la mediane a 16 cartes des politiques de choix — pire,
   aleatoire, et gloutonne — plus le tireur nu.

   Ils existent parce qu'un multiplicateur NU ne se lit pas. « ×1,49 dégâts »
   sonne bien et vaut en realite une build faible ; le joueur n'avait aucun
   moyen de le savoir, et concluait que les pourcentages ne marchaient pas. Un
   chiffre qui n'a pas d'echelle n'informe personne.

   A remesurer avec `power_spread.mjs` si le catalogue ou les raretes bougent —
   ce sont des mesures, pas des constantes de reglage. */
const POWER_MARKS = [
  { v: 1.26, lab: "nu" },
  { v: 2.36, lab: "médiane" },
  { v: 4.10, lab: "forte" },
  { v: 5.71, lab: "max" },
];
const POWER_SCALE_MAX = 6.5;   // au-dela la jauge sature : plus personne n'y va
/* Duree d'un combat de boss a la build de REFERENCE (`BOSS_POWER_REF`), en
   secondes. Mesuree et non estimee, et elle sert uniquement a donner une
   echelle au joueur : depuis que les PV du boss ne suivent plus la puissance,
   la duree d'un combat EST la lecture de la puissance. */
const BOSS_MEDIAN_FIGHT = 95;
/* Qualificatif. On nomme la build par rapport a la population mesuree, jamais
   dans l'absolu : « ×2,4 » ne veut rien dire, « au-dessus de la moitie des
   builds » se comprend sans rien connaitre du jeu. */
function powerLabel(v) {
  if (v < 1.6) return "faible";
  if (v < 2.36) return "sous la médiane";
  if (v < 3.2) return "au-dessus de la médiane";
  if (v < 4.5) return "forte";
  return "exceptionnelle";
}
/* LE GENOU A DISPARU DU PANNEAU, et c'est le lot R qui l'a emporte : plus rien
   n'indexe la difficulte sur la puissance, donc « le boss suit ta puissance a
   100 % » est devenu faux. Le laisser aurait ete pire que de ne rien dire — un
   panneau qui explique une regle qui n'existe plus.

   Ce qui le remplace dit la meme chose renversee, et c'est la promesse du plan :
   la puissance ne change plus ce qu'on affronte, elle change la VITESSE a
   laquelle on le traverse. La note porte donc la duree estimee d'un combat de
   boss, qui est desormais inversement proportionnelle a la puissance — c'est le
   seul chiffre qui rende l'echelle concrete.

   `bossPower()` et `BOSS_POWER_KNEE` restent dans le code : si la mesure du
   lot X dit que le grand ecart est intenable, le retour est un changement de
   trois constantes, et ce panneau redevient juste. */
function powerBlockHtml(mods) {
  const v = powerIndex(mods);
  const pct = x => Math.max(0, Math.min(100, (x - 1) / (POWER_SCALE_MAX - 1) * 100));
  const ref = CFG.BOSS_POWER_REF;

  const marks = POWER_MARKS.map(m =>
    `<span class="pMark" style="left:${pct(m.v)}%"><i></i>${escapeHtml(m.lab)}</span>`).join("");

  /* Un combat de boss dure `BOSS_MEDIAN_FIGHT` a la build de reference ; la
     duree suit l'inverse de la puissance, et le plancher de barre la borne en
     bas (cinq barres qui ne peuvent pas se rompre a moins de BAR_DWELL). */
  const brut = BOSS_MEDIAN_FIGHT * ref / Math.max(0.1, v);
  const plancher = CFG.BOSS_BARS * BOSS_CFG.BAR_DWELL;
  const duree = Math.max(plancher, brut);

  return (
    `<div class="pHead">` +
      `<span class="pLab">puissance</span>` +
      `<span class="pVal">${v.toFixed(2).replace(".", ",")}</span>` +
      `<span class="pQual">${escapeHtml(powerLabel(v))}</span>` +
    `</div>` +
    `<div class="pGauge">` +
      `<i class="pFill" style="width:${pct(v)}%"></i>` +
      `<span class="pKnee" style="left:${pct(ref)}%" title="build de référence : c'est sur elle que les boss sont calibrés"></span>` +
      `<span class="pCursor" style="left:${pct(v)}%"></span>` +
    `</div>` +
    `<div class="pMarks">${marks}</div>` +
    `<div class="pNote${v > ref ? " gain" : ""}">` +
      `les boss ne suivent plus ta puissance — un combat te prend environ ` +
      `${Math.round(duree)} s` +
      (duree <= plancher ? ` (plancher : le répertoire doit passer)` : "") +
    `</div>`);
}
/* Les puces de multiplicateurs, en HTML plutot qu'ecrites dans un noeud : le
   bilan les reaffiche telles quelles. Deux rendus separes auraient diverge au
   premier reglage — c'est la meme raison qui a fait exporter `fullMods`. */
function modsChipsHtml(mods) {
  return BUILD_MODS.map(d => {
    const v = d.get(mods);
    // Vert quand c'est un gain, ambre quand c'en est un cout : la grammaire de
    // couleur du depot, sur la seule ligne du panneau ou un chiffre peut aller
    // dans les deux sens.
    const bon = d.bas ? v < 0.995 : v > 1.005;
    const mauvais = d.bas ? v > 1.005 : v < 0.995;
    const cls = bon ? " gain" : mauvais ? " cout" : "";
    const txt = d.fmt ? d.fmt(mods) : fmtMul(v);
    return `<div class="buildMod${cls}"><span class="lab">${escapeHtml(d.nom)}</span>` +
      `<span class="val">${escapeHtml(txt)}</span></div>`;
  }).join("");
}
export function renderBuild() {
  const roster = buildRoster();
  if (roster.length === 0) { closeBuild(); return; }
  if (!roster.includes(buildTarget)) buildTarget = roster[0];

  const info = buildInfo(buildTarget);
  const col = PLAYER_COLORS[info.colorIndex % PLAYER_COLORS.length];
  const def = classAt(info.cls ?? CLASS_DEFAULT);
  const { mods, maxHp } = buildMultipliers(info);

  const sansClasse = info.cls === null || info.cls === undefined;
  buildName.textContent = info.name;
  /* CYAN QUAND C'EST TOI, ta teinte de joueur sinon. C'est la lecture des deux
     maquettes — au bilan, c'est ton score qui est en cyan — et elle rend le
     bandeau bicolore : le nom ne redit plus la couleur du libelle de classe
     juste dessous, qui la porte deja. */
  buildName.style.color = buildTarget === myId ? SIGNAL.go : col;
  // `cls` peut etre nul : un joueur qui n'a jamais joue n'a pas de classe, et
  // lui en afficher une serait mentir.
  buildClass.textContent = sansClasse ? "sans classe" : def.nom;
  buildClass.style.color = sansClasse ? "" : def.couleur;

  // Les grands nombres sont GROUPES : « 186420 » ne se lit pas, et le bilan
  // juste a cote les groupe deja.
  buildStats.innerHTML = [
    ["score", info.score], ["kills", info.kills],
    ["morts", info.deaths], ["dégâts", info.damage], ["PV max", maxHp],
  ].map(([lab, val]) =>
    `<div class="buildStat"><span class="val">${escapeHtml(fmtBig(val))}</span>` +
    `<span class="lab">${escapeHtml(lab)}</span></div>`).join("");

  buildMods.innerHTML = modsChipsHtml(mods);

  /* LES TROIS COMPETENCES, avec leur touche : la fenetre sert aussi a se
     rappeler ce que fait la classe d'un allie qu'on ne joue jamais.

     La TROISIEME n'existe que par sa carte, et c'est justement pour ca qu'elle
     doit figurer meme quand elle manque : la pastille grisee du HUD dit deja
     « il y a quelque chose a obtenir ici », et une fenetre de build qui n'en
     parlerait pas serait le seul endroit du jeu ou l'on ne peut pas savoir ce
     qui pourrait s'ajouter. Sa description est celle de la CARTE tiree — les
     trois paliers ne disent pas la meme chose, et la recopier ici l'aurait
     figee au premier reglage. */
  let skills = "";
  if (!sansClasse) {
    skills = def.skills.map(s =>
      `<div class="buildSkill"><span class="key">${escapeHtml(s.touche)}</span>` +
      `<span><b>${escapeHtml(s.nom)}</b> — ${escapeHtml(s.desc)}</span></div>`).join("");

    const nom3 = SKILL3_NAME[def.id];
    if (nom3) {
      // La carte qui l'accorde porte `excl: "skill3"` — c'est ce marqueur qui
      // l'identifie, pas son identifiant : il y en a trois par classe.
      const carte3 = [...info.counts.keys()].find(
        id => CARD_BY_ID.get(id)?.excl === "skill3");
      const desc3 = carte3 ? (cardDetail(carte3, info.counts)?.desc ?? "") : "";
      skills +=
        `<div class="buildSkill${carte3 ? "" : " off"}">` +
        `<span class="key">3/R</span>` +
        `<span><b>${escapeHtml(nom3)}</b> — ` +
        `${escapeHtml(carte3 ? desc3 : "carte non tirée, la compétence reste indisponible")}` +
        `</span></div>`;
    }
  }
  buildSkills.innerHTML = skills;
  buildSkillsTitle.hidden = skills === "";

  renderBuildCards(info.counts);
}
/* Les cartes, groupees par rarete DECROISSANTE : une legendaire perdue au
   milieu de dix communes ne se remarque pas, alors qu'elle est precisement ce
   qu'on veut voir d'un coup d'oeil.

   Chaque carte porte sa description complete, celle du tirage — donc en metres
   et avec ses valeurs effectives, composee par `cardDetail` a cote de la table.
   Une pastille avec le seul nom ne repondait a aucune question. */
function renderBuildCards(counts) {
  buildCards.innerHTML = "";
  if (counts.size === 0) {
    buildCards.innerHTML = `<div class="buildEmpty">aucune carte</div>`;
    return;
  }

  const rows = [...counts.entries()].sort((a, b) =>
    (CARD_BY_ID.get(b[0])?.rarity ?? 0) - (CARD_BY_ID.get(a[0])?.rarity ?? 0));

  let rarity = -1;
  for (const [id, n] of rows) {
    const card = CARD_BY_ID.get(id);
    if (!card) continue;
    const col = RARITY_COLOR[card.rarity] ?? RARITY_COLOR[0];

    if (card.rarity !== rarity) {
      rarity = card.rarity;
      const h = document.createElement("div");
      h.className = "buildRarity";
      h.style.color = col;
      h.textContent = RARITY_LABEL[rarity] ?? "";
      buildCards.appendChild(h);
    }

    const d = cardDetail(id, counts);
    const row = document.createElement("div");
    row.className = "buildCard";
    // La couleur de rarete est posee sur la LIGNE : le filet de gauche la prend
    // en `currentColor`, une seule source par carte.
    row.style.color = col;
    /* Le NOMBRE d'exemplaires a droite, la description en dessous. Le glyphe de
       famille a saute : a cette taille il redisait la categorie que la
       description donne en toutes lettres, et il volait la place qui manquait
       pour passer a deux colonnes — or c'est le passage a deux colonnes qui
       rend une build de quinze cartes lisible sans defiler. */
    row.innerHTML =
      `<div class="buildCardHead">` +
        `<span class="buildCardName">${escapeHtml(card.nom)}</span>` +
        (n > 1 ? `<span class="buildCardMul">×${n}</span>` : "") +
      `</div>` +
      `<div class="buildCardDesc">${escapeHtml(d?.desc ?? "")}</div>` +
      (d?.avertissement ? `<div class="buildCardWarn">${escapeHtml(d.avertissement)}</div>` : "");
    buildCards.appendChild(row);
  }
}
export function openBuild(id) {
  const roster = buildRoster();
  if (roster.length === 0) return;
  buildTarget = roster.includes(id) ? id : roster[0];
  /* Le bouton de sortie NOMME l'ecran d'ou l'on vient. La fenetre s'ouvre
     depuis trois endroits — le bilan, le salon, la touche Tab en jeu — et
     « Retour au bilan » aurait menti dans deux cas sur trois. */
  if (buildBackBtn) {
    buildBackBtn.textContent = bilanOpen ? "← Retour au bilan" : "← Fermer";
  }
  buildEl.hidden = false;
  renderBuild();
}
export function closeBuild() { buildEl.hidden = true; }
if (buildBackBtn) buildBackBtn.onclick = closeBuild;
export function cycleBuild(step) {
  if (buildEl.hidden) return;
  const roster = buildRoster();
  if (roster.length === 0) return;
  const i = roster.indexOf(buildTarget);
  buildTarget = roster[((i < 0 ? 0 : i) + step + roster.length) % roster.length];
  renderBuild();
}
document.getElementById("buildPrev").onclick = () => cycleBuild(-1);
document.getElementById("buildNext").onclick = () => cycleBuild(1);

/* Setters. Une liaison de module ES est VIVANTE en lecture — l'importateur
   voit toujours la valeur courante — mais elle est en lecture seule. Ecrire
   depuis un autre module demande donc de passer par ici, et par rien d'autre.
   C'est ce qui rend l'ecriture de cet etat cherchable en un grep. */
export function setBuildPaintedAt(v) { buildPaintedAt = v; }
