
import {
  CFG, PLAYER_COLORS, DIFFICULTIES, DAMAGE_SOURCES, enemyCap, fullMods,
  BUFF_DAMAGE, BUFF_RATE, BUFF_DOUBLE, BUFF_PIERCE, BUFF_RICOCHET,
} from "/shared/game_state.js";
import { relicById } from "/shared/reliques.js";
import { fmtM, toM } from "/shared/units.js";
import { difficulty, hudDps, hudStats, ownedCounts, pipPress, relicsByPlayer } from "./core/state.js";
import { CLASS_DEFAULT, SKILL_CFG, SKILL3_NAME, classAt,
         SKILL_HEAL_MODE, SKILL_TAUNT, SKILL_OVERDRIVE } from "/shared/classes.js";
import { CARD_CFG } from "/shared/cards.js";
import { STATUSES, STATUS_VULN, STATUS_DOOM, statusBit } from "/shared/statuses.js";
import { bossAt, beatPhase, estFinal, ALERT_ORDER, BOSS_METRONOME } from "/shared/bosses.js";
import { TL_CFG, eventAt, segmentName } from "/shared/timeline.js";
import { HUD, SIGNAL, TEXT, COMBAT, BOSS, BOSS_SKIN, SRC_TINT } from "/shared/palette.js";
import { EFFECT_BADGES, POWERUP_STYLE, SKILL_ICON, SRC_ICON, STATUS_ICON, iconImg } from "/icons.js";

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
  hpBar:    $("selfHp"),
  hp:       $("selfHp").firstElementChild,
  hpGhost:  $("selfHp").children[1],
  shieldBar: $("selfHp").children[2],
  shield:   $("selfHp").children[2].firstElementChild,
  xp:       $("selfXp").firstElementChild,
  hpText:   $("selfHpText"),
  level:    $("selfLevel"),
  pips:     $("selfPips"),
  stats:    $("hudStats"),
  statsDps: $("statsDps"),
  statsRows: $("statsRows"),
  statsHurt: $("statsHurt"),
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
  ghosts.clear();
  shieldSeen.clear();
  buffSeen.clear();
  badges.clear();
  el.effects.textContent = "";
  el.buffs.textContent = "";
  dpsWindow.length = 0;
  hurtParSrc.fill(0);
  hurtHp = -1;
  for (const k of Object.keys(memo)) delete memo[k];
}

function hpColor(k, downed, col) {
  if (downed) return COMBAT.downed;
  return k < 0.25 ? HUD.low : (k < 0.5 ? HUD.mid : col);
}

// le seuil bas est le SEUL moment ou le HUD a le droit d'attirer le regard.
const LOW_HP = 0.30;

// le bouclier s'eteint au coup et se rallume pendant la rampe de `SHIELD_REGEN_RAMP`
// — sans ca le joueur subit une regle qu'il ne voit pas.
const SHIELD_HIT_MS = 220;
const shieldSeen = new Map();

function updateShield(bar, node, key, shield, now) {
  const k = shield > 0 ? Math.min(1, shield / CFG.SHIELD_POOL) : 0;
  setWidth(node, `sh${key}`, k);
  const prev = shieldSeen.get(key);
  if (!prev) { shieldSeen.set(key, { v: shield, hit: 0 }); }
  else {
    if (shield < prev.v - 0.5) prev.hit = now;
    prev.v = shield;
  }
  const s = shieldSeen.get(key);
  setClass(bar, `shh${key}`, "shieldHit", now - s.hit < SHIELD_HIT_MS);
  setClass(bar, `shr${key}`, "shieldUp", k > 0 && k < 1 && now - s.hit >= SHIELD_HIT_MS);
  setClass(bar, `shO${key}`, "shielded", k > 0);
}


let teamSig = "";

function buildTeam(lobby, myId) {
  el.team.textContent = "";
  for (const l of lobby) {
    const row = document.createElement("div");
    row.className = "teamRow" + (l.id === myId ? " me" : "");
    row.innerHTML =
      '<div class="cls"></div><div class="nom"></div>' +
      '<div class="pv"></div><div class="score"></div>' +
      '<div class="bar gauge"><i></i><b></b><u><i></i></u></div><div class="tags"></div>';
    row.dataset.pid = l.id;
    el.team.appendChild(row);
  }
}

function updateTeam(v, c, now) {
  const sig = c.lobby.map(l => `${l.id}:${l.name}:${l.colorIndex}`).join("|");
  if (sig !== teamSig) { teamSig = sig; buildTeam(c.lobby, c.myId); }

  let i = 0;
  for (const l of c.lobby) {
    const row = el.team.children[i++];
    if (!row) break;
    const p = v.playerList.find(pp => pp.id === l.id);
    const col = PLAYER_COLORS[l.colorIndex % PLAYER_COLORS.length];
    const [cls, nom, pv, score, bar, tags] = row.children;
    const [fill, ghost, shWrap] = bar.children;
    const sh = shWrap.firstElementChild;

    setText(nom, `tn${l.id}`, l.name);
    setStyle(nom, `tc${l.id}`, "color", col);
    setText(score, `ts${l.id}`, String(p ? p.score : 0));

    // LA CLASSE SE RECONNAIT AVANT LE NOM. Une liste d'equipe se lit en un coup
    // d'oeil pendant qu'on esquive : c'est le ROLE qui decide si on va aider.
    const cid = p?.cls ?? l.cls ?? CLASS_DEFAULT;
    if (memo[`tcl${l.id}`] !== cid) {
      memo[`tcl${l.id}`] = cid;
      cls.textContent = "";
      cls.appendChild(iconImg(SKILL_ICON[`${classAt(cid).id}0`], col, 14));
    }

    if (l.spectator || !p) {
      setWidth(fill, `tf${l.id}`, 0);
      setWidth(sh, `tsh${l.id}`, 0);
      setWidth(ghost, `tgh${l.id}`, 0);
      setText(pv, `tpv${l.id}`, "");
      setText(tags, `tg${l.id}`, l.spectator ? "spectateur" : "…");
      continue;
    }

    const maxHp = p.maxHp || CFG.PLAYER_MAX_HP;
    const k = p.downed ? 0 : Math.max(0, Math.min(1, p.hp / maxHp));
    // le CHIFFRE, pas la proportion : « il lui reste 40 PV » se decide, « il est
    // a un quart » se devine.
    setText(pv, `tpv${l.id}`, p.downed ? "à terre" : String(Math.round(p.hp)));
    setClass(pv, `tpd${l.id}`, "downed", !!p.downed);
    setStyle(pv, `tpc${l.id}`, "color", hpColor(k, p.downed, TEXT.base));
    setWidth(fill, `tf${l.id}`, k);
    setStyle(fill, `tfc${l.id}`, "background", hpColor(k, p.downed, col));
    setGhost(ghost, `tgh${l.id}`, k, barGhost(`t${l.id}`, k, now));
    setTicks(bar, `ttk${l.id}`, maxHp);
    setClass(bar, `tlo${l.id}`, "low", !p.downed && k < LOW_HP);
    updateShield(bar, sh, `t${l.id}`, p.shield, now);

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
// UN SEUL POINT DE PASSAGE pour toutes les barres du HUD, boss compris.
const RESIDU_MS = 300;
const ghosts = new Map();

function barGhost(key, k, now) {
  let g = ghosts.get(key);
  if (!g) { g = { k, at: now }; ghosts.set(key, g); }
  if (k >= g.k) g.k = k;
  else {
    const dt = Math.min(100, now - (g.at || now));
    g.k = k + (g.k - k) * Math.pow(0.02, dt / RESIDU_MS);
    if (g.k - k < 0.002) g.k = k;
  }
  g.at = now;
  return g.k;
}

function setGhost(node, key, k, ghost) {
  setStyle(node, key + "x", "left", `${(k * 100).toFixed(2)}%`);
  setStyle(node, key + "w", "width", `${(Math.max(0, ghost - k) * 100).toFixed(2)}%`);
}

// une graduation tous les 25 PV : a 150 PV pour un Rempart et 85 pour un Tireur,
// la meme fraction ne dit pas la meme chose.
const HP_TICK = 25;

function setTicks(node, key, maxHp) {
  const n = Math.max(1, Math.round(maxHp / HP_TICK));
  setStyle(node, key, "--tick", (100 / n).toFixed(3) + "%");
}

function updateBoss(b, now) {
  if (!b) { setHidden(el.boss, "bossOn", true); ghosts.delete("boss"); return; }
  setHidden(el.boss, "bossOn", false);

  const bars = Math.max(1, b.bars ?? 1);
  const barHp = b.maxHp / bars;
  const left = Math.max(1, Math.min(bars, Math.ceil(b.hp / barHp)));
  const k = Math.max(0, Math.min(1, (b.hp - (left - 1) * barHp) / barHp));

  setGhost(el.bossLoss, "bl", k, barGhost("boss", k, now));

  const kind = b.kind ?? 0;
  const def = bossAt(kind);
  if (memo.bsk !== kind) {
    memo.bsk = kind;
    const K = BOSS_SKIN[kind] ?? BOSS_SKIN[0];
    el.boss.style.setProperty("--boss-low", K.bar);
    el.boss.style.setProperty("--boss-deep", K.deep);
    el.boss.classList.toggle("final", estFinal(kind));
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
    if (estFinal(kind)) {
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

// UNE LETTRE DANS UNE CASE EST UN RACCOURCI CLAVIER, PAS UNE ICONE : elle ne se
// reconnait pas du coin de l'oeil, et c'est la seule facon dont on regarde ses
// recharges. Le glyphe passe au premier plan, la touche reste ecrite en coin.
function buildPips(cdef) {
  el.pips.textContent = "";
  const mk = (key, label, color, icon, px) => {
    const p = document.createElement("div");
    p.className = "pip";
    p.style.setProperty("--pip", color);
    p.innerHTML = '<div class="box"><span class="key"></span>'
      + '<span class="stock"></span></div><div class="lbl"></div>';
    p.querySelector(".key").textContent = key;
    p.querySelector(".lbl").textContent = label;
    if (icon) p.firstElementChild.prepend(iconImg(icon, color, px));
    el.pips.appendChild(p);
    return p;
  };
  mk("ESP", "esquive", TEXT.base, SKILL_ICON.dash, 20);
  mk("A", cdef.skills[0].nom.slice(0, 11), cdef.couleur, SKILL_ICON[`${cdef.id}0`], 20);
  mk("E", cdef.skills[1].nom.slice(0, 11), cdef.couleur, SKILL_ICON[`${cdef.id}1`], 20);
  // l'ultime a un rang a part : c'est le lot 04 qui en fait un ultime, l'interface
  // doit le dire aussi, sinon la promotion n'existe que dans le code.
  mk("3", (SKILL3_NAME[cdef.id] ?? "").toLowerCase().slice(0, 11), cdef.couleur,
     SKILL_ICON[`${cdef.id}2`], 26)
    .classList.add("ult");
}

const PRESS_MS = 160;

function updatePip(node, i, ready, k, active, stock, now) {
  setClass(node, `pr${i}`, "ready", ready);
  setClass(node, `pa${i}`, "active", active);
  setStyle(node.firstElementChild, `pk${i}`, "--k",
    (Math.max(0, Math.min(1, k)) * 100).toFixed(0) + "%");
  setText(node.querySelector(".stock"), `ps${i}`, stock > 1 ? "×" + stock : "");
  setClass(node, `pp${i}`, "press", now - pipPress[i] < PRESS_MS);

  if (ready && memo[`pw${i}`] === false) {
    node.classList.remove("flash");
    void node.offsetWidth;
    node.classList.add("flash");
  }
  memo[`pw${i}`] = ready;
}


function updateSelf(v, c, now) {
  const me = v.playerList.find(p => p.id === c.myId);
  if (!me) return;

  const maxHp = me.maxHp || CFG.PLAYER_MAX_HP;
  const k = Math.max(0, Math.min(1, me.hp / maxHp));
  setWidth(el.hp, "shp", k);
  setStyle(el.hp, "shpc", "background", hpColor(k, me.downed, c.myColor));
  setGhost(el.hpGhost, "sgh", k, barGhost("self", k, now));
  setTicks(el.hpBar, "stk", maxHp);
  setClass(el.hpBar, "slo", "low", !me.downed && k < LOW_HP);
  updateShield(el.hpBar, el.shield, "self", me.shield, now);

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
  updatePip(el.pips.children[0], 0, dashCd <= 0, dashCd <= 0 ? 1 : 1 - dashCd / c.dashCd,
    false, 0, now);

  const stock = cdef.id === "dps" ? (me.bombStock ?? 0) : 0;
  const cd1 = me.cd1 ?? 0, cd2 = me.cd2 ?? 0;
  updatePip(el.pips.children[1], 1, cd1 <= 0 || stock > 0, cd1 <= 0 ? 1 : 1 - cd1 / base[0],
    (me.skillFlags & SKILL_HEAL_MODE) !== 0, stock, now);
  updatePip(el.pips.children[2], 2, cd2 <= 0, cd2 <= 0 ? 1 : 1 - cd2 / base[1],
    (me.skillFlags & (SKILL_TAUNT | SKILL_OVERDRIVE)) !== 0, 0, now);

  const tier3 = me.skill3 ?? 0;
  const pip3 = el.pips.children[3];
  setClass(pip3, "p3lock", "locked", tier3 <= 0);
  setClass(pip3, "p3t", "t3", tier3 >= 3);
  const cd3 = me.cd3 ?? 0;
  const base3 = tier3 > 0 ? (SKILL3_BASE_CD[cdef.id]?.[tier3 - 1] ?? 1) : 1;
  updatePip(pip3, 3, tier3 > 0 && cd3 <= 0, cd3 <= 0 ? (tier3 > 0 ? 1 : 0) : 1 - cd3 / base3,
    false, 0, now);

  updateEffects(c.counts);
  updateBuffs(me.buffs, now);
  updateStats(me, v, c, now);
}

// un etat qui surgit sans transition passe inapercu, et c'est justement
// l'information qu'il fallait voir : les pastilles se reconcilient par CLE au
// lieu de se reconstruire, sinon toute la rangee rejouerait son apparition.
const BADGE_OUT_MS = 220;
const badges = new Map();

function reconcileBadges(root, prefix, wanted) {
  for (const [key, node] of [...badges]) {
    if (!key.startsWith(prefix) || wanted.has(key)) continue;
    badges.delete(key);
    node.classList.remove("in");
    node.classList.add("out");
    setTimeout(() => node.remove(), BADGE_OUT_MS);
  }
  for (const [key, w] of wanted) {
    let node = badges.get(key);
    if (!node) {
      node = document.createElement("div");
      node.className = "badge in";
      node.style.color = w.color;
      node.appendChild(iconImg(w.icon, w.color, w.size));
      node.appendChild(document.createElement("span"));
      badges.set(key, node);
      root.appendChild(node);
    }
    if (node.style.order !== String(w.ord)) node.style.order = String(w.ord);
    const txt = node.lastElementChild;
    if (txt.textContent !== w.text) txt.textContent = w.text;
    if (w.k !== undefined) {
      const pct = (Math.max(0, Math.min(1, w.k)) * 100).toFixed(0) + "%";
      if (node.dataset.k !== pct) { node.dataset.k = pct; node.style.setProperty("--k", pct); }
    }
  }
}

function updateEffects(counts) {
  const wanted = new Map();
  for (let i = 0; i < EFFECT_BADGES.length; i++) {
    const e = EFFECT_BADGES[i];
    const n = counts.get(e.id) ?? 0;
    if (n <= 0) continue;
    wanted.set("e:" + e.id,
      { color: e.color, icon: e.icon, size: 16, text: n > 1 ? "×" + n : "", ord: i });
  }
  reconcileBadges(el.effects, "e:", wanted);
}

const BUFF_ROW = [
  [BUFF_DAMAGE, "damage", "dégâts"],
  [BUFF_RATE, "rate", "cadence"],
  [BUFF_DOUBLE, "double", "double"],
  [BUFF_PIERCE, "pierce", "perforant"],
  [BUFF_RICOCHET, "ricochet", "ricochet"],
];

// la duree d'un bonus est une FONCTION DE CE QUE LE CLIENT A DEJA : `CFG.BUFF_TIME`
// et le front montant du bit. Le serveur reste la verite — bit encore pose apres
// l'echeance = ramassage qui a rafraichi, on repart d'un cycle plein.
const buffSeen = new Map();

function updateBuffs(mask, now) {
  const wanted = new Map();
  const duree = CFG.BUFF_TIME * 1000;
  for (let i = 0; i < BUFF_ROW.length; i++) {
    const [bit, key, label] = BUFF_ROW[i];
    if (!(mask & bit)) { buffSeen.delete(bit); continue; }
    let until = buffSeen.get(bit);
    if (until === undefined || now >= until) { until = now + duree; buffSeen.set(bit, until); }
    const st = POWERUP_STYLE[key];
    wanted.set("b:" + key, { color: st.color, icon: st.icon, size: 14, text: label, ord: i,
                             k: (until - now) / duree });
  }
  reconcileBadges(el.buffs, "b:", wanted);
}


// LE JOUEUR NE DOIT PAS FAIRE L'ARITHMETIQUE : le panneau donne des valeurs
// EFFECTIVES, jamais des pourcentages. Tout se deduit de ce que le client a
// deja — instantane, cartes, reliques — sans un octet de reseau.
const num = (v, d = 1) => v.toFixed(d).replace(".", ",");

// « critique » ne disait pas si c'etait le TAUX ou les DEGATS : deux lignes
// valent mieux qu'un libelle a deviner. Ce qui n'a pas de valeur absolue —
// reduction et rayon — reste un multiplicateur, mais son sens est ecrit.
const STAT_ROWS = [
  { nom: "dégâts par tir", val: s => num(s.degats) },
  { nom: "tirs par seconde", val: s => num(s.cadence, 2) },
  { nom: "dégâts par seconde", val: s => num(s.dps) },
  { nom: "projectiles par tir", val: s => num(s.canons, 2) },
  { nom: "taux de critique", val: s => Math.round(s.critChance * 100) + " %" },
  { nom: "dégâts critiques", val: s => "×" + num(s.critMul, 2) },
  // ces trois lignes existent parce qu'une carte entiere ne se voyait NULLE PART
  // sans elles : « Poudre dense » et « Canon long » ne touchent ni les degats ni
  // la cadence. Un panneau ou une carte prise ne bouge rien ne sert a rien.
  { nom: "portée", val: s => fmtM(s.portee) },
  { nom: "perforation", val: s => String(s.pierce) },
  { nom: "ricochets", val: s => String(s.chain) },
  { nom: "points de vie", val: s => `${Math.round(s.hp)} / ${Math.round(s.maxHp)}` },
  { nom: "bouclier max", val: s => String(Math.round(s.bouclier)) },
  { nom: "vitesse", val: s => num(toM(s.vitesse)) + " m/s" },
  { nom: "dégâts subis", val: s => "×" + num(s.subis, 2) },
  { nom: "rayon d'effet", val: s => "×" + num(s.rayon, 2) },
];

const STATS_MS = 250;
const DPS_WINDOW_MS = 5000;
const dpsWindow = [];
const hurtParSrc = new Array(DAMAGE_SOURCES.length).fill(0);
let hurtHp = -1;
let statsAt = 0;
let modsSig = "";
let modsCache = null;

function relicFlat(id, key) {
  let total = 0;
  for (const r of relicsByPlayer.get(id) ?? []) total += relicById(r)?.[key] ?? 0;
  return total;
}

function myMods(me, v) {
  const counts = ownedCounts(me.id);
  const others = [];
  for (const p of v.playerList) if (p.id !== me.id) others.push(ownedCounts(p.id));
  const niveau = v.teamLevel ?? me.level ?? 1;
  let sig = `${niveau}|${me.cls}|`;
  for (const [id, n] of counts) sig += `${id}${n},`;
  sig += "#";
  for (const o of others) for (const [id, n] of o) sig += `${id}${n},`;
  if (sig !== modsSig || !modsCache) {
    modsSig = sig;
    // `fullMods` rend `{ mods, maxHp }`, pas les mods : le lire a plat donnait
    // des `NaN` en cascade, et le premier `.toFixed` sur un champ absent vidait
    // toutes les lignes suivantes du panneau.
    modsCache = fullMods(counts, others, me.cls ?? CLASS_DEFAULT, niveau).mods;
  }
  return modsCache;
}

function updateStats(me, v, c, now) {
  const on = hudStats || hudDps;

  // savoir CE QUI TE TUE vaut mieux qu'un compteur de degats : on l'accumule a
  // partir de la chute de PV et de `lastSrc`, tous deux deja dans l'instantane.
  if (hurtHp >= 0 && me.hp < hurtHp - 0.01) {
    const i = Math.max(0, Math.min(DAMAGE_SOURCES.length - 1, me.src ?? 0));
    hurtParSrc[i] += hurtHp - me.hp;
  }
  hurtHp = me.hp;

  dpsWindow.push({ at: now, total: me.damage ?? 0 });
  while (dpsWindow.length > 2 && now - dpsWindow[0].at > DPS_WINDOW_MS) dpsWindow.shift();

  if (!on || now - statsAt < STATS_MS) return;
  statsAt = now;

  if (hudDps) {
    const a = dpsWindow[0], b = dpsWindow[dpsWindow.length - 1];
    const span = Math.max(0.001, (b.at - a.at) / 1000);
    const dps = span < 1 ? 0 : Math.max(0, b.total - a.total) / span;
    setText(el.statsDps, "stD", `${Math.round(dps)} dps · ${Math.round(me.damage ?? 0)} total`);
  }
  setHidden(el.statsDps, "stDH", !hudDps);

  setHidden(el.statsRows, "stRH", !hudStats);
  setHidden(el.statsHurt, "stHH", !hudStats);
  if (!hudStats) return;

  const m = myMods(me, v);
  const flat = relicFlat(me.id, "flatDamage")
    + [...v.playerList].reduce((s, p) => p.id === me.id ? s : s + relicFlat(p.id, "allyFlatDamage"), 0);
  const degats = (CFG.BULLET_DAMAGE + flat) * m.damageMul * m.barrelDamageMul;
  const interval = me.fireInterval > 0 ? me.fireInterval : CFG.FIRE_INTERVAL * m.fireIntervalMul;
  const cadence = 1 / Math.max(0.01, interval);
  const canons = 1 + m.extraBarrels + (m.backShot ? 0.7 : 0);
  const s = {
    degats, cadence, canons,
    dps: degats * cadence * canons * (1 + m.critChance * (m.critMul - 1)),
    critChance: m.critChance, critMul: m.critMul,
    hp: me.hp, maxHp: me.maxHp || CFG.PLAYER_MAX_HP,
    bouclier: m.shieldPool + relicFlat(me.id, "flatShield"),
    portee: CFG.BULLET_SPEED * m.bulletSpeedMul * CFG.BULLET_LIFE * m.bulletLifeMul,
    pierce: m.pierce, chain: m.chain,
    vitesse: CFG.PLAYER_SPEED * m.speedMul,
    subis: m.damageTakenMul, rayon: m.areaMul,
  };

  if (el.statsRows.children.length !== STAT_ROWS.length) {
    el.statsRows.textContent = "";
    for (const r of STAT_ROWS) {
      const d = document.createElement("div");
      d.className = "statRow";
      d.innerHTML = '<span class="lab"></span><span class="val"></span>';
      d.firstElementChild.textContent = r.nom;
      el.statsRows.appendChild(d);
    }
  }
  // la ligne concernee s'illumine une seconde : c'est ce qui relie un choix a
  // son effet. Elle se declenche sur le CHANGEMENT DE VALEUR, donc sans hameçon
  // sur la prise de carte.
  for (let i = 0; i < STAT_ROWS.length; i++) {
    const node = el.statsRows.children[i];
    const txt = STAT_ROWS[i].val(s);
    if (memo[`sv${i}`] !== undefined && memo[`sv${i}`] !== txt) {
      node.classList.remove("bump");
      void node.offsetWidth;
      node.classList.add("bump");
    }
    setText(node.lastElementChild, `sv${i}`, txt);
  }

  const total = hurtParSrc.reduce((a, b) => a + b, 0);
  if (total <= 0) { setText(el.statsHurt, "stH", ""); return; }
  const sig = hurtParSrc.map(x => Math.round(x)).join(",");
  if (memo.stHs === sig) return;
  memo.stHs = sig;
  el.statsHurt.textContent = "";
  for (let i = 0; i < DAMAGE_SOURCES.length; i++) {
    if (hurtParSrc[i] <= 0) continue;
    const d = document.createElement("div");
    d.className = "hurtRow";
    d.style.color = SRC_TINT[i];
    d.appendChild(iconImg(SRC_ICON[i], SRC_TINT[i], 12));
    d.append(`${DAMAGE_SOURCES[i].label} ${Math.round(hurtParSrc[i] / total * 100)} %`);
    el.statsHurt.appendChild(d);
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

  const finalBoss = v.boss ? estFinal(v.boss.kind ?? 0) : false;
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
  updateTeam(v, c, now);
  updateSelf(v, c, now);
  setHidden(el.stats, "stOn", !me || !(hudStats || hudDps));
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
