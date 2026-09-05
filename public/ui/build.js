
import { BOSS_CFG } from "/shared/bosses.js";
import { dec, onLangChange, t, tf } from "/shared/i18n.js";
import { CARD_BY_ID, RARITY_COLOR, archetypeDe, archetypeFaiblesses, archetypeForces, archetypeNom, cardDetail, cardNom, rarityLabel } from "/shared/cards.js";
import { CLASS_DEFAULT, SKILL_HEAL_MODE, classAt, classNom, skill3Nom, skillDesc, skillNom } from "/shared/classes.js";
import { CFG, PLAYER_COLORS, fullMods, plafonnerHp, powerIndex } from "/shared/game_state.js";
import { SIGNAL } from "/shared/palette.js";
import { applyMeta, metaLinesFor } from "/shared/progression.js";
import { PHASE_ROUND, bilanOpen, lastResult, latest, lobby, lootListOf, myId, ownedCounts, phase, progressState, skills } from "../core/state.js";
import { LOOT_BY_ID, lootDesc, lootNom } from "/shared/loot.js";
import { deaths } from "../render/fx.js";
import { nameOf } from "../render/stage.js";
import { buildArch, buildArchTitle, buildBackBtn, buildCards, buildClass, buildEl, buildMods, buildName, buildPower, buildSkills, buildSkillsTitle, buildStats, escapeHtml, fmtBig } from "./dom.js";

let buildTarget = 0;
export let buildPaintedAt = 0;
function buildRoster() {
  if (phase === PHASE_ROUND && latest) return [...latest.players.keys()];
  if (lastResult) return lastResult.rows.map(r => r.id);
  return lobby.filter(l => !l.spectator).map(l => l.id);
}
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
    fireInterval: live?.fireInterval ?? 0,
    healMode: !!(live?.skillFlags & SKILL_HEAL_MODE),
  };
}
function buildMultipliers(info) {
  const others = [];
  for (const id of buildRoster()) if (id !== info.id) others.push(ownedCounts(id));
  const niveau = phase === PHASE_ROUND
    ? (latest?.teamLevel ?? 1)
    : (lastResult?.level ?? 1);
  const cls = info.cls ?? CLASS_DEFAULT;
  const r = fullMods(info.counts, others, cls, niveau);
  // la META n'est connue que pour SOI : le profil d'un allie ne voyage pas. On
  // prefere une ligne juste sur sa propre build a deux lignes fausses.
  // le plafond est le DERNIER maillon cote serveur : le rejouer ici, sinon la
  // ligne « PV max » annonce ce que Contrat de sang vient justement d'interdire
  if (info.id !== myId || !progressState) {
    return { mods: r.mods, maxHp: plafonnerHp(r.maxHp, r.mods) };
  }
  const clsId = classAt(cls).id;
  const { lines, commun } = metaLinesFor(progressState, clsId);
  const rr = applyMeta(r.mods, r.maxHp, clsId, lines, commun);
  return { mods: rr.mods, maxHp: plafonnerHp(rr.maxHp, rr.mods) };
}
function fmtMul(v) {
  return "×" + dec(v);
}
const BUILD_MODS = [
  { cle: "degats", nom: "dégâts", get: m => m.damageMul },
  { cle: "cadence", nom: "cadence", get: m => 1 / Math.max(0.01, m.fireIntervalMul), live: true },
  { cle: "critique", nom: "critique", get: m => 1 + m.critChance * (m.critMul - 1),
    fmt: m => `${Math.round(m.critChance * 100)} % · ${fmtMul(m.critMul)}` },
  { cle: "rayon", nom: "rayon", get: m => m.areaMul },
  { cle: "vitesse", nom: "vitesse", get: m => m.speedMul },
  { cle: "subis", nom: "dégâts subis", get: m => m.damageTakenMul, bas: true },
];
const POWER_MARKS = [
  { v: 1.26, cle: "nu", lab: "nu" },
  { v: CFG.BOSS_POWER_REF, cle: "mediane", lab: "médiane" },
  { v: 6.50, cle: "forte", lab: "forte" },
  { v: 9.00, cle: "max", lab: "max" },
];
const POWER_SCALE_MAX = 10.5;
const BOSS_MEDIAN_FIGHT = 70;
function powerLabel(v) {
  if (v < 1.6) return t("ui.build.pw.faible", "faible");
  if (v < CFG.BOSS_POWER_REF) return t("ui.build.pw.sousMediane", "sous la médiane");
  if (v < 6.5) return t("ui.build.pw.surMediane", "au-dessus de la médiane");
  if (v < 9.0) return t("ui.build.pw.forte", "forte");
  return t("ui.build.pw.exceptionnelle", "exceptionnelle");
}
function powerBlockHtml(mods) {
  const v = powerIndex(mods);
  const pct = x => Math.max(0, Math.min(100, (x - 1) / (POWER_SCALE_MAX - 1) * 100));
  const ref = CFG.BOSS_POWER_REF;

  const marks = POWER_MARKS.map(m =>
    `<span class="pMark" style="left:${pct(m.v)}%"><i></i>`
    + `${escapeHtml(t(`ui.build.mark.${m.cle}`, m.lab))}</span>`).join("");

  const brut = BOSS_MEDIAN_FIGHT * ref / Math.max(0.1, v);
  const plancher = (CFG.BOSS_BARS - 1) * BOSS_CFG.PALIER_TIME;
  const duree = Math.max(plancher, brut);

  return (
    `<div class="pHead">` +
      `<span class="pLab">${escapeHtml(t("ui.build.pw", "puissance"))}</span>` +
      `<span class="pVal">${dec(v)}</span>` +
      `<span class="pQual">${escapeHtml(powerLabel(v))}</span>` +
    `</div>` +
    `<div class="pGauge">` +
      `<i class="pFill" style="width:${pct(v)}%"></i>` +
      `<span class="pKnee" style="left:${pct(ref)}%" title="${escapeHtml(
        t("ui.build.pw.ref",
          "build de référence : c'est sur elle que les boss sont calibrés"))}"></span>` +
      `<span class="pCursor" style="left:${pct(v)}%"></span>` +
    `</div>` +
    `<div class="pMarks">${marks}</div>` +
    `<div class="pNote${v > ref ? " gain" : ""}">` +
      escapeHtml(tf("ui.build.pw.note",
        "les boss ne suivent plus ta puissance — un combat te prend environ {s} s",
        { s: Math.round(duree) })) +
      (duree <= plancher
        ? ` ${escapeHtml(t("ui.build.pw.plancher",
            "(plancher : le répertoire doit passer)"))}`
        : "") +
    `</div>`);
}
/* UNE FORME PAR ARCHETYPE, sur le modele de `FAMILY_ICON` : sept traces, aucun
   fichier. Elles ne portent aucune information que le nom ne porte pas — c est
   ce qui rend la ligne reconnaissable d un coup d oeil dans une liste. */
const ARCH_ICON = {
  incendiaire: `<path d="M12 2 c4 5 6 7 6 11 a6 6 0 0 1 -12 0 c0 -3 3 -5 3 -8 c2 2 3 3 3 5 z"/>`,
  sniper:      `<path d="M12 3 v4 M12 17 v4 M3 12 h4 M17 12 h4"/><circle cx="12" cy="12" r="5"/>`,
  forteresse:  `<path d="M12 2 L20 6 v6 c0 5 -4 8 -8 10 c-4 -2 -8 -5 -8 -10 V6 Z"/>`,
  berserker:   `<path d="M4 20 L16 8 M13 5 l6 6 l-3 3 l-6 -6 z M4 20 l3 -1 l-2 -2 z"/>`,
  demolition:  `<path d="M12 2 l3 6 l6 -1 l-4 5 l4 5 l-6 -1 l-3 6 l-3 -6 l-6 1 l4 -5 l-4 -5 l6 1 z"/>`,
  acrobat:     `<path d="M6 21 l5 -8 l-4 -3 l4 -7 M11 13 l6 4 M7 10 l-3 4"/>`,
  technicien:  `<path d="M13 2 L5 13 h5 l-1 9 l9 -12 h-5 z"/>`,
};
function archIcon(id) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"` +
         ` stroke-width="2" stroke-linejoin="miter">${ARCH_ICON[id] ?? ""}</svg>`;
}
/* CE QUE CE BUILD EST DEVENU. La classe est CHOISIE, l archetype est CONSTATE :
   il se pose donc SOUS elle, et il DISPARAIT tant que rien n est engage — un
   bloc permanent qui dirait « aucun » apprendrait a ne plus le lire.
   La jauge va du SEUIL — la ou l archetype s allume — au PLAFOND mesure par
   `archetypePlafond`, et les deux listes ne sont que du texte : pure lecture de
   ce que le client a deja, rien de plus ne circule, aucun bonus. Un archetype
   qui changerait quoi que ce soit serait une classe cachee. */
function archBlockHtml(counts) {
  const a = archetypeDe(counts);
  if (!a) return "";
  const plafond = Math.max(1, a.plafond);
  const pct = Math.max(0, Math.min(100, a.n / plafond * 100));
  const liste = (cle, lab, items) =>
    `<div class="archCol ${cle}">` +
      `<div class="archColLab">${escapeHtml(t(`ui.build.arch.${cle}`, lab))}</div>` +
      items.map(x => `<div class="archLigne">${escapeHtml(x)}</div>`).join("") +
    `</div>`;

  return (
    `<div class="archHead">` +
      `<span class="archIcon">${archIcon(a.id)}</span>` +
      `<span class="archNom">${escapeHtml(archetypeNom(a.id))}</span>` +
      `<span class="archCount">${a.n} / ${plafond}</span>` +
    `</div>` +
    `<div class="archGauge">` +
      `<i style="width:${pct}%"></i>` +
      `<span class="archSeuil" style="left:${a.seuil / plafond * 100}%" title="${
        escapeHtml(tf("ui.build.arch.seuil", "l'archétype s'allume à {n} cartes",
          { n: a.seuil }))}"></span>` +
    `</div>` +
    `<div class="archListes">` +
      liste("gain", "points forts", archetypeForces(a.id)) +
      liste("cout", "à surveiller", archetypeFaiblesses(a.id)) +
    `</div>`);
}
function modsChipsHtml(mods, live) {
  return BUILD_MODS.map(d => {
    let v = d.get(mods);
    if (d.live && live?.fireInterval > 0 && !live.healMode) {
      v = CFG.FIRE_INTERVAL / live.fireInterval;
    }
    const bon = d.bas ? v < 0.995 : v > 1.005;
    const mauvais = d.bas ? v > 1.005 : v < 0.995;
    const cls = bon ? " gain" : mauvais ? " cout" : "";
    const txt = d.fmt ? d.fmt(mods) : fmtMul(v);
    return `<div class="buildMod${cls}">`
      + `<span class="lab">${escapeHtml(t(`ui.build.mod.${d.cle}`, d.nom))}</span>` +
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
  buildName.style.color = buildTarget === myId ? SIGNAL.go : col;
  buildClass.textContent = sansClasse ? t("ui.build.noClass", "sans classe") : classNom(def);
  buildClass.style.color = sansClasse ? "" : def.couleur;

  buildStats.innerHTML = [
    ["score", "score", info.score], ["kills", "kills", info.kills],
    ["morts", "morts", info.deaths], ["degats", "dégâts", info.damage],
    ["pvmax", "PV max", maxHp],
  ].map(([cle, lab, val]) =>
    `<div class="buildStat"><span class="val">${escapeHtml(fmtBig(val))}</span>` +
    `<span class="lab">${escapeHtml(t(`ui.stat.${cle}`, lab))}</span></div>`).join("");

  const arche = archBlockHtml(info.counts);
  buildArch.innerHTML = arche;
  buildArch.hidden = arche === "";
  buildArchTitle.hidden = arche === "";

  buildMods.innerHTML = modsChipsHtml(mods, info);
  buildPower.innerHTML = powerBlockHtml(mods);

  let skills = "";
  if (!sansClasse) {
    skills = def.skills.map((s, i) =>
      `<div class="buildSkill"><span class="key">${escapeHtml(s.touche)}</span>` +
      `<span><b>${escapeHtml(skillNom(def, i))}</b> — `
      + `${escapeHtml(skillDesc(def, i))}</span></div>`).join("");

    const nom3 = skill3Nom(def.id);
    if (nom3) {
      const carte3 = [...info.counts.keys()].find(
        id => CARD_BY_ID.get(id)?.excl === "skill3");
      const desc3 = carte3 ? (cardDetail(carte3, info.counts)?.desc ?? "") : "";
      skills +=
        `<div class="buildSkill${carte3 ? "" : " off"}">` +
        `<span class="key">3/R</span>` +
        `<span><b>${escapeHtml(nom3)}</b> — ` +
        `${escapeHtml(carte3 ? desc3
          : t("ui.build.skill3.absente",
              "carte non tirée, la compétence reste indisponible"))}` +
        `</span></div>`;
    }
  }
  buildSkills.innerHTML = skills;
  buildSkillsTitle.hidden = skills === "";

  renderBuildCards(info.counts, lootListOf(info.id));
}

/* LE LOOT PASSE AVANT LES CARTES, ET C EST DELIBERE : c est ce qui a change le
   plus recemment, et c est le seul systeme dont le joueur n a pas vu l ecran de
   choix — il l a ramasse en courant. Un compte par identifiant, parce que le
   meme objet se cumule. */
function renderBuildLoot(loot) {
  if (!loot || loot.length === 0) return;
  const counts = new Map();
  for (const id of loot) counts.set(id, (counts.get(id) ?? 0) + 1);
  const rows = [...counts.entries()].sort((a, b) =>
    (LOOT_BY_ID.get(b[0])?.rang ?? 0) - (LOOT_BY_ID.get(a[0])?.rang ?? 0));

  const h = document.createElement("div");
  h.className = "buildRarity";
  h.style.color = RARITY_COLOR[2] ?? RARITY_COLOR[0];
  h.textContent = t("ui.build.loot", "Trouvé au sol");
  buildCards.appendChild(h);

  for (const [id, n] of rows) {
    const def = LOOT_BY_ID.get(id);
    if (!def) continue;
    const row = document.createElement("div");
    row.className = "buildCard";
    row.style.color = RARITY_COLOR[def.rang] ?? RARITY_COLOR[0];
    row.innerHTML =
      `<div class="buildCardHead">` +
        `<span class="buildCardName">${escapeHtml(lootNom(id))}</span>` +
        (n > 1 ? `<span class="buildCardMul">×${n}</span>` : "") +
      `</div>` +
      `<div class="buildCardDesc">${escapeHtml(lootDesc(id))}</div>`;
    buildCards.appendChild(row);
  }
}
function renderBuildCards(counts, loot) {
  buildCards.innerHTML = "";
  renderBuildLoot(loot);
  if (counts.size === 0) {
    const vide = document.createElement("div");
    vide.className = "buildEmpty";
    vide.textContent = t("ui.build.noCards", "aucune carte");
    buildCards.appendChild(vide);
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
      h.textContent = rarityLabel(rarity);
      buildCards.appendChild(h);
    }

    const d = cardDetail(id, counts);
    const row = document.createElement("div");
    row.className = "buildCard";
    row.style.color = col;
    row.innerHTML =
      `<div class="buildCardHead">` +
        `<span class="buildCardName">${escapeHtml(cardNom(id))}</span>` +
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
  if (buildBackBtn) {
    buildBackBtn.textContent = bilanOpen
      ? t("ui.build.backBilan", "← Retour au bilan")
      : t("ui.build.back", "← Fermer");
  }
  buildEl.hidden = false;
  renderBuild();
}
export function closeBuild() { buildEl.hidden = true; }
onLangChange(() => { if (!buildEl.hidden) renderBuild(); });
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

export function setBuildPaintedAt(v) { buildPaintedAt = v; }
