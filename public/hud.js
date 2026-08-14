
import {
  CFG, PLAYER_COLORS, DIFFICULTIES, enemyCap,
  BUFF_DAMAGE, BUFF_RATE, BUFF_DOUBLE, BUFF_PIERCE, BUFF_RICOCHET,
} from "/shared/game_state.js";
import { difficulty } from "./core/state.js";
import { CLASS_DEFAULT, SKILL_CFG, SKILL3_NAME, classAt,
         SKILL_HEAL_MODE, SKILL_TAUNT, SKILL_OVERDRIVE } from "/shared/classes.js";
import { CARD_CFG } from "/shared/cards.js";
import { STATUSES, STATUS_VULN, STATUS_DOOM, statusBit } from "/shared/statuses.js";
import { bossAt, beatPhase, ALERT_ORDER, BOSS_FINAL, BOSS_METRONOME } from "/shared/bosses.js";
import { TL_CFG, eventAt, segmentName } from "/shared/timeline.js";
import { HUD, SIGNAL, TEXT, COMBAT, BOSS, BOSS_SKIN } from "/shared/palette.js";
import { EFFECT_BADGES, POWERUP_STYLE, STATUS_ICON, iconImg } from "/icons.js";

const $ = id => document.getElementById(id);

const el = {
  root:     $("hud"),
  clock:    $("hudClock"),
  meta:     $("hudMeta"),
  seg:      $("hudSegment"),
  segName:  $("segName"),
  segBar:   $("segBar").firstElementChild,
  segState: $("segState"),
  boss:     $("hudBoss"),
  bossName: $("bossName"),
  bossVerb: $("bossVerb"),
  bossHp:   $("bossHp"),
  bossFill: $("bossBar").firstElementChild,
  bossLoss: $("bossLoss"),
  bossBank: $("bossBank"),
  bossMult: $("bossMult"),
  bossPips: $("bossPips"),
  bossBeat: $("bossBeat"),
  bossUlt:  $("bossUlt"),
  bossUltFill: $("bossUlt").firstElementChild,
  team:     $("hudTeam"),
  alerts:   $("hudAlerts"),
  order:    $("alertOrder"),
  warn:     $("alertWarn"),
  info:     $("alertInfo"),
  announce: $("hudAnnounce"),
  effects:  $("selfEffects"),
  buffs:    $("selfBuffs"),
  shield:   $("selfShield").firstElementChild,
  hp:       $("selfHp").firstElementChild,
  xp:       $("selfXp").firstElementChild,
  hpText:   $("selfHpText"),
  level:    $("selfLevel"),
  pips:     $("selfPips"),
  spectator: $("hudSpectator"),
  perf:     $("hudPerf"),
  dmg:      $("dmgLayer"),
};

const orderTxt = el.order.querySelector(".txt");
const orderSrc = el.order.querySelector(".src");
const orderCd  = el.order.querySelector(".cd > i");
const annBig = el.announce.querySelector(".big");
const annMid = el.announce.querySelector(".mid");
const annSub = el.announce.querySelector(".sub");

const metaLine = cls => {
  const d = document.createElement("div");
  if (cls) d.className = cls;
  el.meta.appendChild(d);
  return d;
};
const metaKills = metaLine("");
const metaEnem  = metaLine("");
const metaPing  = metaLine("");
const metaEcl   = metaLine("");
const metaDiff  = metaLine("warn");
const metaSlow  = metaLine("slow");
metaSlow.textContent = "temps ralenti";
metaEcl.hidden = metaDiff.hidden = metaSlow.hidden = true;

const memo = Object.create(null);

function setText(node, key, value) {
  if (memo[key] === value) return;
  memo[key] = value;
  node.textContent = value;
}

function setWidth(node, key, frac) {
  const pct = (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + "%";
  if (memo[key] === pct) return;
  memo[key] = pct;
  node.style.width = pct;
}

function setStyle(node, key, prop, value) {
  if (memo[key] === value) return;
  memo[key] = value;
  node.style.setProperty(prop, value);
}

function setHidden(node, key, hidden) {
  if (memo[key] === hidden) return;
  memo[key] = hidden;
  node.hidden = hidden;
}

function setClass(node, key, name, on) {
  if (memo[key] === on) return;
  memo[key] = on;
  node.classList.toggle(name, on);
}


export function showHud(on) {
  el.root.hidden = !on;
}

export function resetHud() {
  el.dmg.textContent = "";
  dmgCount = 0;
  dmgLive.length = 0;
  residu.k = 1;
  for (const k of Object.keys(memo)) delete memo[k];
}

function hpColor(k, downed, col) {
  if (downed) return COMBAT.downed;
  return k < 0.25 ? HUD.low : (k < 0.5 ? HUD.mid : col);
}


let teamSig = "";

function buildTeam(lobby, myId) {
  el.team.textContent = "";
  for (const l of lobby) {
    const row = document.createElement("div");
    row.className = "teamRow" + (l.id === myId ? " me" : "");
    row.innerHTML =
      '<div class="nom"></div><div class="score"></div>' +
      '<div class="bar"><i></i><u></u></div><div class="tags"></div>';
    row.dataset.pid = l.id;
    el.team.appendChild(row);
  }
}

function updateTeam(v, c) {
  const sig = c.lobby.map(l => `${l.id}:${l.name}:${l.colorIndex}`).join("|");
  if (sig !== teamSig) { teamSig = sig; buildTeam(c.lobby, c.myId); }

  let i = 0;
  for (const l of c.lobby) {
    const row = el.team.children[i++];
    if (!row) break;
    const p = v.playerList.find(pp => pp.id === l.id);
    const col = PLAYER_COLORS[l.colorIndex % PLAYER_COLORS.length];
    const [nom, score, bar, tags] = row.children;
    const fill = bar.firstElementChild, sh = bar.lastElementChild;

    setText(nom, `tn${l.id}`, l.name);
    setStyle(nom, `tc${l.id}`, "color", col);
    setText(score, `ts${l.id}`, String(p ? p.score : 0));

    if (l.spectator || !p) {
      setWidth(fill, `tf${l.id}`, 0);
      setWidth(sh, `tsh${l.id}`, 0);
      setText(tags, `tg${l.id}`, l.spectator ? "spectateur" : "…");
      continue;
    }

    const maxHp = p.maxHp || CFG.PLAYER_MAX_HP;
    const k = p.downed ? 0 : Math.max(0, Math.min(1, p.hp / maxHp));
    setWidth(fill, `tf${l.id}`, k);
    setStyle(fill, `tfc${l.id}`, "background", hpColor(k, p.downed, col));
    setWidth(sh, `tsh${l.id}`, p.shield > 0 ? Math.min(1, p.shield / CFG.SHIELD_POOL) : 0);

    const stSig = `${p.statuses}|${p.vuln}|${p.doom > 0 ? p.doom.toFixed(1) : 0}|${p.downed}`;
    if (memo[`tst${l.id}`] !== stSig) {
      memo[`tst${l.id}`] = stSig;
      tags.textContent = "";
      if (p.downed) {
        const d = document.createElement("span");
        d.textContent = "à terre";
        d.style.color = COMBAT.downed;
        tags.appendChild(d);
      }
      for (const s of STATUSES) {
        if (!(p.statuses & statusBit(s.id))) continue;
        tags.appendChild(iconImg(STATUS_ICON[s.id], s.couleur, 13));
        if (s.id === STATUS_VULN && p.vuln > 1) {
          const n = document.createElement("span");
          n.className = "stack";
          n.textContent = "×" + p.vuln;
          n.style.color = s.couleur;
          tags.appendChild(n);
        }
      }
      if (p.doom > 0) {
        const d = document.createElement("span");
        d.className = "doom";
        d.textContent = p.doom.toFixed(1);
        d.style.color = STATUSES[STATUS_DOOM].couleur;
        tags.appendChild(d);
      }
    }
  }
}

// B-3 · RIEN D'EXCLUSIVEMENT SONORE. Le Metronome porte une information
// temporelle : quatre temoins sous la barre, le quatrieme rouge avant la frappe.
// La grille est `tm`, la meme des deux cotes — l'audio n'accelere que la lecture.
function updateBeat(v) {
  const on = (v.boss?.kind ?? -1) === BOSS_METRONOME;
  setHidden(el.bossBeat, "bbOn", !on);
  if (!on) return;
  const { temps, k } = beatPhase(v.tm ?? 0);
  for (let i = 0; i < 4; i++) {
    const w = el.bossBeat.children[i];
    if (!w) break;
    setClass(w, `bb${i}`, "on", i <= temps);
    setClass(w, `bbl${i}`, "last", i === 3 && temps === 3);
  }
  setStyle(el.bossBeat, "bbk", "--beat", (1 - k).toFixed(2));
}

// [30] une balle retire une fraction infime de la barre, et une barre qui
// glisse en continu ne se voit pas. Le segment perdu RESTE affiche en clair et
// rattrape en ~300 ms : c'est la salve qui devient visible, pas le total.
const residu = { k: 1, at: 0 };
const RESIDU_MS = 300;

function updateBoss(b, now) {
  if (!b) { setHidden(el.boss, "bossOn", true); residu.k = 1; return; }
  setHidden(el.boss, "bossOn", false);

  const bars = Math.max(1, b.bars ?? 1);
  const barHp = b.maxHp / bars;
  const left = Math.max(1, Math.min(bars, Math.ceil(b.hp / barHp)));
  const k = Math.max(0, Math.min(1, (b.hp - (left - 1) * barHp) / barHp));

  if (k >= residu.k) residu.k = k;
  else {
    const dt = Math.min(100, now - (residu.at || now));
    residu.k = k + (residu.k - k) * Math.pow(0.02, dt / RESIDU_MS);
    if (residu.k - k < 0.002) residu.k = k;
  }
  residu.at = now;
  setStyle(el.bossLoss, "blx", "left", `${(k * 100).toFixed(2)}%`);
  setStyle(el.bossLoss, "blw", "width", `${((residu.k - k) * 100).toFixed(2)}%`);

  const kind = b.kind ?? 0;
  const def = bossAt(kind);
  if (memo.bsk !== kind) {
    memo.bsk = kind;
    const K = BOSS_SKIN[kind] ?? BOSS_SKIN[0];
    el.boss.style.setProperty("--boss-low", K.bar);
    el.boss.style.setProperty("--boss-deep", K.deep);
    el.boss.classList.toggle("final", kind === BOSS_FINAL);
  }
  const rage = b.enrage ?? 0;
  setText(el.bossName, "bn", `${def.nom.toUpperCase()} ${ROMAN[b.index] ?? b.index}`
    + (rage > 0 ? ` — EMPORTEMENT ${ROMAN[rage] ?? rage}` : ""));
  setClass(el.bossName, "bnr", "enrage", rage > 0);
  setText(el.bossVerb, "bv", def.verbe);
  // la barre en cours devient BLANCHE et se vide sur le palier : le temps
  // restant se lit sur l'objet que le joueur regarde deja.
  const palier = Math.max(0, Math.min(1, b.palier ?? 0));
  setText(el.bossHp, "bh", `${Math.max(0, Math.round(b.hp))} / ${b.maxHp}`);
  setWidth(el.bossFill, "bf", k);
  setClass(el.boss, "bpl", "palier", palier > 0);
  setStyle(el.bossBank, "bkl", "left", "0%");
  setStyle(el.bossBank, "bkw", "width", `${palier * 100}%`);
  setText(el.bossMult, "bm", `×${left}`);
  setClass(el.bossMult, "bml", "last", left <= 1);

  if (memo.bpn !== bars) {
    memo.bpn = bars;
    el.bossPips.textContent = "";
    for (let i = 0; i < bars; i++) el.bossPips.appendChild(document.createElement("span"));
    memo.bpl = -1;
  }
  if (memo.bpl !== left) {
    memo.bpl = left;
    for (let i = 0; i < bars; i++) el.bossPips.children[i].classList.toggle("spent", i >= left);
    if (kind === BOSS_FINAL) {
      const k = bars > 1 ? (bars - left) / (bars - 1) : 1;
      el.boss.style.setProperty("--final-pulse", `${(2.6 - k * 1.7).toFixed(2)}s`);
    }
  }

  const ult = b.ult ?? 0;
  setHidden(el.bossUlt, "bun", ult <= 0);
  if (ult > 0) {
    setWidth(el.bossUltFill, "buf", Math.min(1, ult));
    setClass(el.bossUlt, "buh", "high", ult > 0.75);
  }
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function updateSegment(v, c = {}) {
  if (!v.segment || v.boss) { setHidden(el.seg, "sgOn", true); return; }
  setHidden(el.seg, "sgOn", false);

  const dernier = v.beat >= TL_CFG.BEATS - 1;
  const lieu = c.biomeNom ? ` · ${c.biomeNom}` : "";
  const meteo = c.meteoNom ? ` · ${c.meteoNom}` : "";
  setText(el.segName, "sgn",
    `${segmentName(v.segment)} · ${v.segment}/${TL_CFG.SEGMENTS}${lieu}${meteo}`);
  setClass(el.segName, "sgb", "crescendo", dernier);

  const frac = Math.max(0, Math.min(1, v.hordeLeft / TL_CFG.SEGMENT_TIME));
  let etat, couleur;
  const ev = v.event ? eventAt(v.event.id) : null;
  if (ev)             { etat = `${ev.nom} · ${mmss(v.event.t)}`;
                        couleur = ev.level === ALERT_ORDER ? SIGNAL.go : SIGNAL.warn; }
  else if (dernier)   { etat = "crescendo"; couleur = SIGNAL.warn; }
  else                { etat = mmss(v.hordeLeft); couleur = TEXT.dim; }

  const sat = v.enemyList.length / enemyCap(difficulty, v.playerList.length);
  if (sat >= 0.7) {
    etat += ` · arène ${Math.round(sat * 100)} %`;
    if (sat >= 0.98) couleur = SIGNAL.lethal;
    else couleur = SIGNAL.warn;
  }

  setWidth(el.segBar, "sgf", frac);
  setStyle(el.segBar, "sgc", "background", couleur);
  setText(el.segState, "sgs", etat);
  setStyle(el.segState, "sgsc", "color", couleur);
}

function mmss(s) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}


const SKILL_BASE_CD = {
  tank: [SKILL_CFG.TANK_BULWARK_CD, SKILL_CFG.TANK_TAUNT_CD],
  soigneur: [SKILL_CFG.HEAL_MODE_SWAP_CD, SKILL_CFG.HEAL_WAVE_CD],
  dps: [SKILL_CFG.DPS_BOMB_CD, SKILL_CFG.DPS_OVERDRIVE_CD],
};

const SKILL3_BASE_CD = {
  tank: CARD_CFG.SKILL3_ANCRE.map(c => c.cd),
  soigneur: CARD_CFG.SKILL3_SANCTUAIRE.map(c => c.cd),
  dps: CARD_CFG.SKILL3_SALVE.map(c => c.cd),
};

function buildPips(cdef) {
  el.pips.textContent = "";
  const mk = (key, label, color) => {
    const p = document.createElement("div");
    p.className = "pip";
    p.style.setProperty("--pip", color);
    p.innerHTML = `<div class="box">${key}<span class="stock"></span></div><div class="lbl"></div>`;
    p.querySelector(".lbl").textContent = label;
    el.pips.appendChild(p);
    return p;
  };
  mk("ESP", "esquive", TEXT.base);
  mk("A", cdef.skills[0].nom.slice(0, 11), cdef.couleur);
  mk("E", cdef.skills[1].nom.slice(0, 11), cdef.couleur);
  mk("3", (SKILL3_NAME[cdef.id] ?? "").toLowerCase().slice(0, 11), cdef.couleur);
}

function updatePip(node, i, ready, k, active, stock) {
  setClass(node, `pr${i}`, "ready", ready);
  setClass(node, `pa${i}`, "active", active);
  setStyle(node.firstElementChild, `pk${i}`, "--k",
    (Math.max(0, Math.min(1, k)) * 100).toFixed(0) + "%");
  setText(node.querySelector(".stock"), `ps${i}`, stock > 1 ? "×" + stock : "");

  if (ready && memo[`pw${i}`] === false) {
    node.classList.remove("flash");
    void node.offsetWidth;
    node.classList.add("flash");
  }
  memo[`pw${i}`] = ready;
}


function updateSelf(v, c) {
  const me = v.playerList.find(p => p.id === c.myId);
  if (!me) return;

  const maxHp = me.maxHp || CFG.PLAYER_MAX_HP;
  const k = Math.max(0, Math.min(1, me.hp / maxHp));
  setWidth(el.hp, "shp", k);
  setStyle(el.hp, "shpc", "background", hpColor(k, me.downed, c.myColor));
  setWidth(el.shield, "ssh", me.shield > 0 ? Math.min(1, me.shield / CFG.SHIELD_POOL) : 0);

  setText(el.hpText, "shpt", me.downed
    ? "à terre — attends un coéquipier"
    : `${Math.round(me.hp)} / ${maxHp} pv` + (me.shield > 0 ? ` · ${Math.round(me.shield)} bouclier` : ""));
  setClass(el.hpText, "shpd", "downed", !!me.downed);

  const teamProg = v.teamProgress ?? me.prog ?? 0;
  const teamLvl = v.teamLevel ?? me.level ?? 1;
  setWidth(el.xp, "sxp", teamProg);
  if (memo.slvl !== teamLvl) {
    memo.slvl = teamLvl;
    el.level.innerHTML = "";
    el.level.append(`niv. ${teamLvl}`, Object.assign(document.createElement("small"),
      { textContent: "équipe" }));
  }

  const cdef = classAt(me.cls ?? CLASS_DEFAULT);
  if (memo.scls !== cdef.id) { memo.scls = cdef.id; buildPips(cdef); }
  const base = SKILL_BASE_CD[cdef.id] ?? [1, 1];

  const dashCd = me.dashCd ?? 0;
  updatePip(el.pips.children[0], 0, dashCd <= 0, dashCd <= 0 ? 1 : 1 - dashCd / c.dashCd, false, 0);

  const stock = cdef.id === "dps" ? (me.bombStock ?? 0) : 0;
  const cd1 = me.cd1 ?? 0, cd2 = me.cd2 ?? 0;
  updatePip(el.pips.children[1], 1, cd1 <= 0 || stock > 0, cd1 <= 0 ? 1 : 1 - cd1 / base[0],
    (me.skillFlags & SKILL_HEAL_MODE) !== 0, stock);
  updatePip(el.pips.children[2], 2, cd2 <= 0, cd2 <= 0 ? 1 : 1 - cd2 / base[1],
    (me.skillFlags & (SKILL_TAUNT | SKILL_OVERDRIVE)) !== 0, 0);

  const tier3 = me.skill3 ?? 0;
  const pip3 = el.pips.children[3];
  setClass(pip3, "p3lock", "locked", tier3 <= 0);
  const cd3 = me.cd3 ?? 0;
  const base3 = tier3 > 0 ? (SKILL3_BASE_CD[cdef.id]?.[tier3 - 1] ?? 1) : 1;
  updatePip(pip3, 3, tier3 > 0 && cd3 <= 0, cd3 <= 0 ? (tier3 > 0 ? 1 : 0) : 1 - cd3 / base3,
    false, 0);

  updateEffects(c.counts);
  updateBuffs(me.buffs);
}

function updateEffects(counts) {
  let sig = "";
  for (const e of EFFECT_BADGES) {
    const n = counts.get(e.id) ?? 0;
    if (n > 0) sig += `${e.id}:${n};`;
  }
  if (memo.eff === sig) return;
  memo.eff = sig;

  el.effects.textContent = "";
  for (const e of EFFECT_BADGES) {
    const n = counts.get(e.id) ?? 0;
    if (n <= 0) continue;
    const b = document.createElement("div");
    b.className = "badge";
    b.style.color = e.color;
    b.appendChild(iconImg(e.icon, e.color, 16));
    if (n > 1) b.append("×" + n);
    el.effects.appendChild(b);
  }
}

const BUFF_ROW = [
  [BUFF_DAMAGE, "damage", "dégâts"],
  [BUFF_RATE, "rate", "cadence"],
  [BUFF_DOUBLE, "double", "double"],
  [BUFF_PIERCE, "pierce", "perforant"],
  [BUFF_RICOCHET, "ricochet", "ricochet"],
];

function updateBuffs(mask) {
  if (memo.buf === mask) return;
  memo.buf = mask;

  el.buffs.textContent = "";
  for (const [bit, key, label] of BUFF_ROW) {
    if (!(mask & bit)) continue;
    const st = POWERUP_STYLE[key];
    const b = document.createElement("div");
    b.className = "badge";
    b.style.color = st.color;
    b.appendChild(iconImg(st.icon, st.color, 14));
    b.append(label);
    el.buffs.appendChild(b);
  }
}


function updateAlerts(c, now) {
  const o = c.alertOrder;
  setHidden(el.order, "aoOn", !o);
  if (o) {
    setText(orderTxt, "aot", o.texte);
    setText(orderSrc, "aos", o.nom.toUpperCase());
    // le violet ne dit qu'une chose : ce n'est pas ton probleme, c'est notre
    // probleme. Il se deduit de `minPlayers`, il ne se declare pas.
    setClass(el.order, "aoc", "collective", !!o.collective);
    // la FORME est repetee a cote de l'ordre : c'est ce qui fait qu'un joueur
    // finit par reagir au telegraphe sans lire le texte.
    if (memo.aof !== o.forme) { memo.aof = o.forme; el.order.dataset.forme = o.forme ?? ""; }
    const span = Math.max(1, o.until - o.from);
    setWidth(orderCd, "aok", (o.until - now) / span);
  }

  setHidden(el.warn, "awOn", !c.alertWarn);
  if (c.alertWarn) {
    setText(el.warn, "awt", `${c.alertWarn.nom.toUpperCase()} — ${c.alertWarn.texte}`);
  }

  setHidden(el.info, "aiOn", !c.alertInfo);
  if (c.alertInfo) {
    setText(el.info, "ait", `${c.alertInfo.nom} — ${c.alertInfo.texte}`);
  }
}

function updateAnnounce(v, c, now) {
  const sinceBoss = now - c.bossAnnounce;
  const sincePhase = now - c.phaseAnnounce;

  const finalBoss = (v.boss?.kind ?? 0) === BOSS_FINAL;
  const duree = finalBoss ? 5000 : 2600;
  const plein = finalBoss ? 4200 : 2000;
  if (v.boss && sinceBoss < duree) {
    const def = bossAt(v.boss.kind ?? 0);
    setClass(el.announce, "anFin", "final", finalBoss);
    show("boss",
      sinceBoss < plein ? 1 : 1 - (sinceBoss - plein) / (duree - plein), false,
      finalBoss ? def.nom.toUpperCase()
        : `${def.nom.toUpperCase()} ${ROMAN[v.boss.index] ?? v.boss.index}`,
      def.verbe.toUpperCase(), def.sous);
    return;
  }
  if (v.boss && v.boss.phase > 0 && sincePhase < 2200) {
    show("phase", sincePhase < 1600 ? 1 : 1 - (sincePhase - 1600) / 600, true,
      `BARRE BRISÉE — PHASE ${v.boss.phase + 1}`,
      c.phaseText ?? "", "");
    return;
  }
  setHidden(el.announce, "anOn", true);

  function show(key, fade, phaseStyle, big, mid, sub) {
    setHidden(el.announce, "anOn", false);
    setClass(el.announce, "anP", "phase", phaseStyle);
    setText(annBig, "anB", big);
    setText(annMid, "anM", mid);
    setText(annSub, "anS", sub);
    setStyle(el.announce, "anF", "opacity", fade.toFixed(2));
  }
}

const DMG_MAX = 40;
let dmgCount = 0;

// A quatre joueurs sur un boss, quarante elements DOM MORDENT. On fusionne les
// chiffres proches plutot que d'en perdre au hasard : un chiffre jete ment sur
// les degats, un chiffre fusionne non.
const DMG_MERGE_PX = 34;
const DMG_MERGE_MS = 420;
const dmgLive = [];

export function hudDamage(x, y, val, kind = "deal", icon = null) {
  if (x < -20 || x > CFG.VIEW_W + 20 || y < -20 || y > CFG.VIEW_H + 20) return;

  const now = performance.now();
  for (let i = dmgLive.length - 1; i >= 0; i--) {
    const o = dmgLive[i];
    if (!o.node.isConnected || now - o.at > DMG_MERGE_MS) {
      dmgLive[i] = dmgLive[dmgLive.length - 1];
      dmgLive.pop();
      continue;
    }
    if (o.kind !== kind || o.icon !== icon) continue;
    if (Math.abs(o.x - x) > DMG_MERGE_PX || Math.abs(o.y - y) > DMG_MERGE_PX) continue;
    o.val += val;
    o.txt.nodeValue = kind === "heal" ? "+" + Math.round(o.val) : String(Math.round(o.val));
    return;
  }

  if (dmgCount >= DMG_MAX) return;
  const d = document.createElement("div");
  d.className = "dmg " + kind;
  if (icon) {
    d.appendChild(iconImg(icon, HUD.low, 12));
  }
  const txt = document.createTextNode(
    kind === "heal" ? "+" + Math.round(val) : String(Math.round(val)));
  d.appendChild(txt);
  d.style.left = (x / CFG.VIEW_W * 100).toFixed(2) + "%";
  d.style.top = (y / CFG.VIEW_H * 100).toFixed(2) + "%";
  d.addEventListener("animationend", () => { d.remove(); dmgCount--; }, { once: true });
  el.dmg.appendChild(d);
  dmgCount++;
  dmgLive.push({ node: d, txt, x, y, val, kind, icon, at: now });
}


export function updateHud(v, c) {
  const now = c.now;

  setText(el.clock, "clk", fmtTime(v.tm));

  const me = v.playerList.find(p => p.id === c.myId);
  const eclats = me?.eclats ?? 0;

  setText(metaKills, "mKills", `kills ${v.kills}`);
  setText(metaEnem, "mEnem", `ennemis ${v.enemyList.length}`);
  setText(metaPing, "mPing", `ping ${c.ping} ms`);

  setHidden(metaEcl, "mEclH", eclats === 0);
  if (eclats > 0) setText(metaEcl, "mEcl", `éclats ${eclats}`);

  setHidden(metaDiff, "mDiffH", c.difficulty === 1);
  if (c.difficulty !== 1) {
    setText(metaDiff, "mDiff", DIFFICULTIES[c.difficulty]?.label ?? "");
    setStyle(metaDiff, "mDiffC", "color", c.difficulty > 1 ? BOSS.barLow : SIGNAL.gain);
  }

  updateSegment(v, c);
  setHidden(metaSlow, "mSlowH", !v.slow);

  updateBoss(v.boss, now);
  updateBeat(v);
  updateTeam(v, c);
  updateSelf(v, c);
  updateAlerts(c, now);
  updateAnnounce(v, c, now);

  setHidden(el.spectator, "spec", !c.amSpectator);

  if (c.perf) {
    setHidden(el.perf, "pfOn", false);
    setText(el.perf, "pf",
      `${c.fps.toFixed(0)} i/s · ${c.particles} frag · ${v.enemyList.length} ennemis · ` +
      `${c.renderer} ${c.draws} appels / ${c.quads} quads · ` +
      `${c.voices} voix (pic ${c.peak})`
      + (c.net ? `\n${c.net}` : ""));
    setClass(el.perf, "pfl", "low", c.fps < 55);
  }
}

function fmtTime(t) {
  const m = String(Math.floor(t / 60)).padStart(2, "0");
  const s = String(Math.floor(t % 60)).padStart(2, "0");
  return m + ":" + s;
}
