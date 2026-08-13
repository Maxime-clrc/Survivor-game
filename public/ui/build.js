
import { BOSS_CFG } from "/shared/bosses.js";
import { CARD_BY_ID, RARITY_COLOR, RARITY_LABEL, cardDetail } from "/shared/cards.js";
import { CLASS_DEFAULT, SKILL3_NAME, SKILL_HEAL_MODE, classAt } from "/shared/classes.js";
import { CFG, PLAYER_COLORS, fullMods, powerIndex } from "/shared/game_state.js";
import { SIGNAL } from "/shared/palette.js";
import { PHASE_ROUND, bilanOpen, lastResult, latest, lobby, myId, ownedCounts, phase, skills } from "../core/state.js";
import { deaths } from "../render/fx.js";
import { nameOf } from "../render/stage.js";
import { buildBackBtn, buildCards, buildClass, buildEl, buildMods, buildName, buildSkills, buildSkillsTitle, buildStats, escapeHtml, fmtBig } from "./dom.js";

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
  return fullMods(info.counts, others, info.cls ?? CLASS_DEFAULT, niveau);
}
function fmtMul(v) {
  return "×" + v.toFixed(2).replace(".", ",");
}
const BUILD_MODS = [
  { nom: "dégâts", get: m => m.damageMul },
  { nom: "cadence", get: m => 1 / Math.max(0.01, m.fireIntervalMul), live: true },
  { nom: "critique", get: m => 1 + m.critChance * (m.critMul - 1),
    fmt: m => `${Math.round(m.critChance * 100)} % · ${fmtMul(m.critMul)}` },
  { nom: "rayon", get: m => m.areaMul },
  { nom: "vitesse", get: m => m.speedMul },
  { nom: "dégâts subis", get: m => m.damageTakenMul, bas: true },
];
const POWER_MARKS = [
  { v: 1.26, lab: "nu" },
  { v: CFG.BOSS_POWER_REF, lab: "médiane" },
  { v: 4.10, lab: "forte" },
  { v: 5.71, lab: "max" },
];
const POWER_SCALE_MAX = 6.5;
const BOSS_MEDIAN_FIGHT = 70;
function powerLabel(v) {
  if (v < 1.6) return "faible";
  if (v < CFG.BOSS_POWER_REF) return "sous la médiane";
  if (v < 3.7) return "au-dessus de la médiane";
  if (v < 4.5) return "forte";
  return "exceptionnelle";
}
function powerBlockHtml(mods) {
  const v = powerIndex(mods);
  const pct = x => Math.max(0, Math.min(100, (x - 1) / (POWER_SCALE_MAX - 1) * 100));
  const ref = CFG.BOSS_POWER_REF;

  const marks = POWER_MARKS.map(m =>
    `<span class="pMark" style="left:${pct(m.v)}%"><i></i>${escapeHtml(m.lab)}</span>`).join("");

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
  buildName.style.color = buildTarget === myId ? SIGNAL.go : col;
  buildClass.textContent = sansClasse ? "sans classe" : def.nom;
  buildClass.style.color = sansClasse ? "" : def.couleur;

  buildStats.innerHTML = [
    ["score", info.score], ["kills", info.kills],
    ["morts", info.deaths], ["dégâts", info.damage], ["PV max", maxHp],
  ].map(([lab, val]) =>
    `<div class="buildStat"><span class="val">${escapeHtml(fmtBig(val))}</span>` +
    `<span class="lab">${escapeHtml(lab)}</span></div>`).join("");

  buildMods.innerHTML = modsChipsHtml(mods, info);

  let skills = "";
  if (!sansClasse) {
    skills = def.skills.map(s =>
      `<div class="buildSkill"><span class="key">${escapeHtml(s.touche)}</span>` +
      `<span><b>${escapeHtml(s.nom)}</b> — ${escapeHtml(s.desc)}</span></div>`).join("");

    const nom3 = SKILL3_NAME[def.id];
    if (nom3) {
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
    row.style.color = col;
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

export function setBuildPaintedAt(v) { buildPaintedAt = v; }
