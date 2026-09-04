
import {
  CFG, PLAYER_COLORS, DAMAGE_SOURCES, diffLabel, srcLabel, enemyCap, fullMods,
  BUFF_DAMAGE, BUFF_RATE, BUFF_DOUBLE, BUFF_PIERCE, BUFF_RICOCHET,
} from "/shared/game_state.js";
import { playSound } from "/audio.js";
import { dec, getLang, onLangChange, t, tf } from "/shared/i18n.js";
import { relicById } from "/shared/reliques.js";
import { fmtM, toM } from "/shared/units.js";
import { difficulty, hudDps, hudStats, myId, ownedCounts, pipPress, progressState, relicsByPlayer } from "./core/state.js";
import { ARMES, ARME_DEFAUT, canonEffet, canonGain } from "/shared/armes.js";
import { applyMeta, metaLinesFor } from "/shared/progression.js";
import { CLASS_DEFAULT, classAt, skill3Nom, skillNom,
         SKILL_HEAL_MODE, SKILL_TAUNT, SKILL_OVERDRIVE } from "/shared/classes.js";
import { STATUSES, STATUS_VULN, STATUS_DOOM, statusBit } from "/shared/statuses.js";
import { bossAt, bossNom, bossSous, bossVerbe, beatPhase, estFinal, ALERT_ORDER, BOSS_METRONOME } from "/shared/bosses.js";
import { TL_CFG, eventAt, segmentName } from "/shared/timeline.js";
import { HUD, SIGNAL, TEXT, COMBAT, BOSS, BOSS_SKIN, SRC_TINT } from "/shared/palette.js";
import { EFFECT_BADGES, POWERUP_STYLE, SKILL_ICON, SRC_ICON, STATUS_ICON, iconImg } from "/icons.js";
import { HF_BY_ID, cadreNom, hfNom, hfTexte, rewardLabel } from "/shared/hauts_faits.js";
import { CARD_CFG, cardNom } from "/shared/cards.js";
import { relicNom } from "/shared/reliques.js";

const $ = id => document.getElementById(id);

const el = {
  root:     $("hud"),
  clock:    $("hudClock"),
  custom:   $("hudCustom"),
  contrat:  $("hudContrat"),
  ctNom:    $("ctNom"),
  ctObj:    $("ctObj"),
  ctProg:   $("ctProg"),
  prop:     $("hudProposition"),
  propNom:  $("propNom"),
  propObj:  $("propObj"),
  propGain: $("propGain"),
  propAide: $("propAide"),
  meta:     $("hudMeta"),
  seg:      $("hudSegment"),
  segKicker: $("segKicker"),
  segName:  $("segName"),
  segBar:   $("segBar").firstElementChild,
  segState: $("segState"),
  hf:       $("hudHf"),
  boss:     $("hudBoss"),
  bossName: $("bossName"),
  bossEtat: $("bossEtat"),
  bossVerb: $("bossVerb"),
  bossFill: $("bossBar").firstElementChild,
  bossLoss: $("bossLoss"),
  bossBank: $("bossBank"),
  bossMult: $("bossMult"),
  bossPips: $("bossPips"),
  bossBeat: $("bossBeat"),
  bossUlt:  $("bossUlt"),
  bossUltFill: $("bossUlt").firstElementChild,
  team:     $("hudTeam"),
  marks:    $("hudMarks"),
  alerts:   $("hudAlerts"),
  order:    $("alertOrder"),
  warn:     $("alertWarn"),
  info:     $("alertInfo"),
  announce: $("hudAnnounce"),
  status:   $("selfStatus"),
  hpBar:    $("selfHp"),
  hp:       $("selfHp").firstElementChild,
  hpGhost:  $("selfHp").children[1],
  shieldRow: $("selfShield"),
  shieldBar: $("selfShield").querySelector(".gauge"),
  shield:   $("selfShield").querySelector(".gauge").firstElementChild,
  shieldGhost: $("selfShield").querySelector(".gauge").children[1],
  shieldVal: $("selfShield").querySelector(".val"),
  downed:   $("selfDowned"),
  xpRow:    $("selfXp").parentElement,
  xp:       $("selfXp").firstElementChild,
  hpText:   $("selfHpText"),
  level:    $("selfLevel"),
  pips:     $("selfPips"),
  stats:    $("hudStats"),
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

/* LE BLOC DE TELEMETRIE — quatre comptes et deux etats, sur DEUX rangs de
   lecture. Six lignes de la meme taille et de la meme couleur donnaient au ping
   le poids des kills ; le chrono domine, les comptes suivent, le reseau ferme la
   marche. Les LIBELLES sont statiques : ils s'ecrivent une fois. */
const telelignes = [];
const ligneTele = (root, cle, repli, cls = "") => {
  const d = document.createElement("div");
  d.className = cls ? `tele ${cls}` : "tele";
  d.innerHTML = '<span class="lab"></span><span class="val"></span>';
  d.firstElementChild.textContent = t(cle, repli);
  telelignes.push([d.firstElementChild, cle, repli]);
  root.appendChild(d);
  return d;
};
const metaCompte = (cle, repli) => ligneTele(el.meta, cle, repli);
const metaEtat = cls => {
  const d = document.createElement("div");
  d.className = "etat " + cls;
  el.meta.appendChild(d);
  return d;
};
// LA TELEMETRIE DE COMBAT — deux lignes, la meme grammaire que le bloc de
// comptes. « 1284 dps · 42813 total » etait une phrase : deux nombres colles
// dans un ordre qu'il fallait relire a chaque fois.
const statDps = ligneTele($("statsDps"), "ui.hud.lab.dps", "dps");
const statTot = ligneTele($("statsDps"), "ui.hud.lab.total", "total", "faible");

const metaKills = metaCompte("ui.hud.lab.kills", "kills");
const metaEnem  = metaCompte("ui.hud.lab.enemies", "ennemis");
const metaEcl   = metaCompte("ui.hud.lab.eclats", "éclats");
const metaPing  = metaCompte("ui.hud.lab.ping", "ping");
metaPing.classList.add("faible");
const metaDiff  = metaEtat("warn");
const metaSlow  = metaEtat("slow");
metaSlow.textContent = t("ui.hud.slow", "temps ralenti");
metaEcl.hidden = metaDiff.hidden = metaSlow.hidden = true;

function relireLibelles() {
  for (const [node, cle, repli] of telelignes) node.textContent = t(cle, repli);
}

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

/* UNE ANIMATION SE REJOUE EN RETIRANT SA CLASSE, en forcant un calcul de mise en
   page, puis en la reposant. La classe reste ensuite : elle ne decrit pas un
   etat, elle a declenche un evenement. */
function rejouer(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

/* LE HUD S'ABONNE AU CANAL D'EVENEMENTS au lieu de deviner. Deux fronts ne se
   deduisent pas d'une comparaison de valeurs : la RUPTURE d'un bouclier — un
   bouclier qui passe de 30 a 0 en deux touches n'est pas la meme chose qu'un
   bouclier qui tombe d'un coup — et la montee de NIVEAU, qui est un fait
   d'equipe. `events.js` les emet deja, `fx.js` les fait sonner ; le HUD n'ouvre
   pas un second canal, il ecoute celui-la.

   Aucun son n'est ajoute ici : ils sont tous poses par `fx.js`. */
export function hudEvent(e) {
  switch (e.t) {
    case "bouclierBrise":
      if (e.id === myId) rejouer(el.shieldBar, "brise");
      break;
    case "niveau":
      rejouer(el.xpRow, "niveau");
      break;
  }
}

export function resetHud() {
  el.root.classList.remove("hf");
  el.root.classList.remove("bas");
  el.dmg.textContent = "";
  dmgCount = 0;
  dmgLive.length = 0;
  ghosts.clear();
  shieldSeen.clear();
  buffSeen.clear();
  badges.clear();
  el.status.textContent = "";
  cdPeak.fill(0);
  missionSig = "";
  pools.clear();
  poolAt = 0;
  hurtParSrc.fill(0);
  hurtHp = -1;
  for (const k of Object.keys(memo)) delete memo[k];
}

/* Le HUD n'ecrit que si la valeur a change : un changement de langue change
   toutes les valeurs a la fois, mais pas les signatures qui les gardent. On
   oublie donc la table, et la prochaine image reecrit tout. */
onLangChange(() => {
  for (const k of Object.keys(memo)) delete memo[k];
  metaSlow.textContent = t("ui.hud.slow", "temps ralenti");
  relireLibelles();
});

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

/* LA RESERVE DE BOUCLIER EST UNE FONCTION DE LA BUILD, et elle valait ZERO au
   depart : elle vient des cartes (+12, +30, +45, +60) et de l'arme (le siege en
   ajoute). La barre se normalisait sur `CFG.SHIELD_POOL` (80), donc une seule
   carte de bouclier affichait 15 % de barre A PLEIN. On rejoue `fullMods` par
   joueur — les cartes COOP des autres comptent, la classe et l'arme aussi ; la
   meta, non, aucune ligne ne touche la reserve. Toutes les 250 ms : une reserve
   ne bouge qu'a la prise d'une carte. */
const POOL_MS = 250;
const pools = new Map();
let poolAt = 0;

function shieldPools(v) {
  const now = performance.now();
  if (now - poolAt < POOL_MS && pools.size) return pools;
  poolAt = now;
  const counts = v.playerList.map(p => ownedCounts(p.id));
  for (let i = 0; i < v.playerList.length; i++) {
    const p = v.playerList[i];
    const autres = [];
    for (let j = 0; j < counts.length; j++) if (j !== i) autres.push(counts[j]);
    const arme = ARMES[p.arme]?.id ?? ARME_DEFAUT;
    // la jauge de bouclier passe par `mods` cote serveur, reliques comprises :
    // l'omettre ici ferait mentir le panneau ET la coque dessinee
    pools.set(p.id, fullMods(counts[i], autres, p.cls ?? CLASS_DEFAULT,
                             v.teamLevel ?? p.level ?? 1, arme).mods.shieldPool
                    + relicFlat(p.id, "shieldFlat"));
  }
  return pools;
}

/* AU-DESSUS DE LA RESERVE la barre est PLEINE et se marque : dome, mode soin,
   recharge du siege et bonus ramasse depassent tous le plafond de regeneration,
   et ce qui deborde ne reviendra pas. Le chiffre, lui, dit toujours le vrai. */
function updateShield(bar, node, key, shield, pool, now) {
  // SANS RESERVE, la reference reste `CFG.SHIELD_POOL` : c'est ce que donne le
  // bonus ramasse, et c'est l'ordre de grandeur du dome et du mode soin. La
  // marque de surcharge, elle, n'a de sens que s'il Y A une reserve a depasser.
  const ref = pool > 0 ? pool : CFG.SHIELD_POOL;
  const k = Math.min(1, Math.max(0, shield / ref));
  setWidth(node, `sh${key}`, k);
  setClass(bar, `shs${key}`, "surcharge", pool > 0 && shield > pool + 0.5);
  const prev = shieldSeen.get(key);
  if (!prev) { shieldSeen.set(key, { v: shield, hit: -1e9 }); }
  else {
    if (shield < prev.v - 0.5) prev.hit = now;
    prev.v = shield;
  }
  const s = shieldSeen.get(key);
  setClass(bar, `shh${key}`, "shieldHit", now - s.hit < SHIELD_HIT_MS);
  // la rampe ne pulse que si quelque chose remonte VRAIMENT : sans reserve, un
  // bouclier a mi-barre est un bonus qui s'epuise, pas une recharge en cours.
  setClass(bar, `shr${key}`, "shieldUp",
    pool > 0 && k > 0 && k < 1 && now - s.hit >= SHIELD_HIT_MS);
}


let teamSig = "";

function buildTeam(lobby, myId) {
  el.team.textContent = "";
  el.marks.textContent = "";
  for (const l of lobby) {
    if (l.id !== myId) {
      const m = document.createElement("div");
      m.className = "mark";
      m.innerHTML = '<i></i><span></span>';
      m.hidden = true;
      m.dataset.pid = l.id;
      el.marks.appendChild(m);
    }
    const row = document.createElement("div");
    row.className = "teamRow hudPanel" + (l.id === myId ? " me" : "");
    // LE BOUCLIER A SON PROPRE FILET, comme chez soi : superpose a la vie, il
    // faisait lire deux valeurs sur la meme surface.
    row.innerHTML =
      '<div class="cls"></div><div class="nom"></div>' +
      '<div class="pv"></div><div class="score"></div>' +
      '<div class="bar gauge"><i></i><b></b></div>' +
      '<div class="sh gauge bouclier"><i></i></div><div class="tags"></div>';
    row.dataset.pid = l.id;
    el.team.appendChild(row);
  }
}

function updateTeam(v, c, now) {
  const reserves = shieldPools(v);
  const sig = c.lobby.map(l => `${l.id}:${l.name}:${l.colorIndex}`).join("|");
  if (sig !== teamSig) { teamSig = sig; buildTeam(c.lobby, c.myId); }

  let i = 0;
  for (const l of c.lobby) {
    const row = el.team.children[i++];
    if (!row) break;
    const p = v.playerList.find(pp => pp.id === l.id);
    const col = PLAYER_COLORS[l.colorIndex % PLAYER_COLORS.length];
    const [cls, nom, pv, score, bar, shBar, tags] = row.children;
    const [fill, ghost] = bar.children;
    const sh = shBar.firstElementChild;

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
      setHidden(shBar, `tshh${l.id}`, true);
      setText(pv, `tpv${l.id}`, "");
      setText(tags, `tg${l.id}`, l.spectator ? t("ui.hud.spec", "spectateur") : "…");
      continue;
    }

    const maxHp = p.maxHp || CFG.PLAYER_MAX_HP;
    const k = p.downed ? 0 : Math.max(0, Math.min(1, p.hp / maxHp));
    // le CHIFFRE, pas la proportion : « il lui reste 40 PV » se decide, « il est
    // a un quart » se devine.
    setText(pv, `tpv${l.id}`, p.downed ? t("ui.hud.downed", "à terre") : String(Math.round(p.hp)));
    setClass(pv, `tpd${l.id}`, "downed", !!p.downed);
    setStyle(pv, `tpc${l.id}`, "color", hpColor(k, p.downed, TEXT.base));
    // A TERRE, LA BARRE DEVIENT CELLE DU RELEVEMENT : elle est vide de toute
    // facon, et c'est la seule chose qui bouge encore pour ce joueur.
    const releve = p.downed && p.revive > 0;
    setWidth(fill, `tf${l.id}`, releve ? p.revive / CFG.REVIVE_TIME : k);
    setStyle(fill, `tfc${l.id}`, "background-color",
      releve ? SIGNAL.gain : hpColor(k, p.downed, col));
    setGhost(ghost, `tgh${l.id}`, releve ? 1 : k, barGhost(`t${l.id}`, k, now));
    setTicks(bar, `ttk${l.id}`, maxHp);
    setClass(bar, `tlo${l.id}`, "low", !p.downed && k < LOW_HP);
    setClass(row, `tdw${l.id}`, "aterre", !!p.downed);
    setHidden(shBar, `tshh${l.id}`,
      (reserves.get(l.id) ?? 0) <= 0 && p.shield <= 0.5);
    updateShield(shBar, sh, `t${l.id}`, p.shield, reserves.get(l.id) ?? 0, now);

    // MES etats sont dans la bande, au-dessus de mes vitales : les repeter ici
    // ferait deux endroits a surveiller pour la meme information.
    if (l.id === c.myId) { setText(tags, `tg${l.id}`, ""); continue; }

    const stSig = `${p.statuses}|${p.vuln}|${p.doom > 0 ? p.doom.toFixed(1) : 0}|${p.downed}`;
    if (memo[`tst${l.id}`] !== stSig) {
      memo[`tst${l.id}`] = stSig;
      tags.textContent = "";
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

/* LES CHEVRONS HORS ECRAN — un allie sorti du champ n'existait NULLE PART a
   l'ecran : ni direction, ni distance, ni dans le monde ni dans le HUD. L'arene
   fait 4800 x 2700 pour une vue de 1600 x 900 : c'est le cas ordinaire, pas un
   cas limite. Rien ne s'ouvre sur le reseau — les joueurs ne sont jamais filtres
   par vue, donc leur position est deja la.

   Le chevron reste DISCRET par defaut et ne prend de la voix que quand il y a
   quelque chose a faire : il change de forme et de couleur pour un allie a
   terre, et gagne en presence pour un allie au seuil bas. */
const MARK_MARGE = 60;

function updateMarks(v, c) {
  const me = v.playerList.find(p => p.id === c.myId);
  if (!me) return;
  const cx = CFG.VIEW_W / 2, cy = CFG.VIEW_H / 2;

  for (const m of el.marks.children) {
    const id = +m.dataset.pid;
    const p = v.playerList.find(pp => pp.id === id);
    const vx = p ? p.x - c.camX : 0, vy = p ? p.y - c.camY : 0;
    const dehors = !!p && (vx < MARK_MARGE || vx > CFG.VIEW_W - MARK_MARGE
                        || vy < MARK_MARGE || vy > CFG.VIEW_H - MARK_MARGE);
    setHidden(m, `mk${id}`, !dehors);
    if (!dehors) continue;

    const dx = vx - cx, dy = vy - cy;
    // on ramene le point sur le RECTANGLE de la vue, pas sur un cercle : un
    // cercle laisse les quatre coins vides et fait glisser le chevron.
    const k = Math.min((cx - MARK_MARGE) / Math.max(1e-3, Math.abs(dx)),
                       (cy - MARK_MARGE) / Math.max(1e-3, Math.abs(dy)));
    setStyle(m, `mkx${id}`, "left", ((cx + dx * k) / CFG.VIEW_W * 100).toFixed(2) + "%");
    setStyle(m, `mky${id}`, "top", ((cy + dy * k) / CFG.VIEW_H * 100).toFixed(2) + "%");
    setStyle(m, `mka${id}`, "--ang", (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1) + "deg");

    // LE CHEVRON GARDE LA COULEUR DU JOUEUR, toujours : c'est une DIRECTION, et
    // la charte interdit le rouge pour ce vers quoi il faut aller. L'etat passe
    // par la forme, la presence et le mot — jamais par la teinte.
    const maxHp = p.maxHp || CFG.PLAYER_MAX_HP;
    const bas = !p.downed && p.hp / maxHp < LOW_HP;
    setStyle(m, `mkc${id}`, "color", colorDe(c.lobby, id));
    setClass(m, `mkd${id}`, "aterre", !!p.downed);
    setClass(m, `mkb${id}`, "bas", bas);
    // LA DISTANCE EST EN METRES, comme partout ce qui s'adresse au joueur.
    setText(m.lastElementChild, `mkt${id}`, p.downed
      ? t("ui.hud.downed", "à terre")
      : fmtM(Math.hypot(p.x - me.x, p.y - me.y)));
  }
}

/* LE SUIVI EST LE PREMIER ELEMENT PERSISTANT DU HUD DE JEU, et c est tout le
   point du lot : le reste de ce qui informe est TRANSITOIRE — les bandeaux
   s effacent, les popups passent, les pips sont des etats. Il ne rappelle donc
   que ce qui CHANGE (un encart fige pendant deux minutes devient du decor), et il
   ne porte ni la recompense — elle etait dans la proposition, au moment
   d accepter — ni de fleche vers la zone : le ping est un autre systeme, et un
   contrat n est pas une destination imposee. */
function updateContrat(v) {
  const ct = v.contrat;
  setHidden(el.contrat, "ctOn", !ct);
  if (ct) {
    const def = CONTRATS[ct.def];
    const rare = RARETES[ct.rarete];
    setText(el.ctNom, "ctN", rare ? rare.nom : "Contrat");
    // LA RARETE SE LIT SANS TEXTE, ET PAR LA FORME AVANT LA COULEUR : un lisere
    // qui s epaissit puis se dedouble. La charte interdit le rouge pour ce vers
    // quoi il faut aller, donc aucune rarete n y touche.
    for (let i = 0; i < RARETES.length; i++) {
      setClass(el.contrat, "ctR" + i, "r" + i, i === ct.rarete);
    }
    setText(el.ctObj, "ctO",
      def ? def.texte.replace("{n}", String(Math.round(ct.seuil))) : "");
    const minuteur = ct.t > 0 ? " · " + fmtTime(ct.t) : "";
    setText(el.ctProg, "ctP",
      Math.floor(ct.cur) + " / " + Math.round(ct.seuil) + minuteur);
  }

  /* LA PROPOSITION NE FIGE RIEN : elle est un ELEMENT DU HUD et non un ecran.
     Les ecrans de carte et de marchand suspendent la manche ; celui-ci laisse la
     horde avancer — sinon activer une borne deviendrait une pause, et le joueur
     l utiliserait comme telle sous la horde. C est LA decision de ce lot, et la
     tentation de reutiliser le mecanisme d ecran existant etait forte. */
  const prop = (v.bornes ?? []).find(b => b.etat === 1);
  setHidden(el.prop, "prOn", !prop || !!ct);
  if (prop && !ct) {
    setText(el.propNom, "prN", t("ui.hud.contrat.prop", "Contrat disponible"));
    setText(el.propObj, "prO",
      t("ui.hud.contrat.propObj", "l’objectif se révèle à l’acceptation"));
    setText(el.propAide, "prA",
      t("ui.hud.contrat.aide", "F pour accepter · G pour refuser"));
  }
}

function colorDe(lobby, id) {
  const l = lobby.find(o => o.id === id);
  return PLAYER_COLORS[(l?.colorIndex ?? 0) % PLAYER_COLORS.length];
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
  setText(el.bossName, "bn", `${bossNom(b.kind).toUpperCase()} ${ROMAN[b.index] ?? b.index}`);
  // L EMPORTEMENT ET LA PHASE SONT DES ETATS DU CADRE, pas un suffixe de nom qui
  // clignote : le nom cessait d etre un nom, et rien ne doit pulser en continu.
  const etats = [];
  if (b.phase > 0) etats.push(tf("ui.hud.phase", "phase {n}", { n: b.phase + 1 }));
  if (rage > 0) etats.push(`${t("ui.hud.enrage", "EMPORTEMENT")} ${ROMAN[rage] ?? rage}`);
  setHidden(el.bossEtat, "beH", etats.length === 0);
  setText(el.bossEtat, "be", etats.join(" · "));
  setClass(el.bossEtat, "ber", "enrage", rage > 0);
  setClass(el.boss, "bnr", "enrage", rage > 0);
  setText(el.bossVerb, "bv", bossVerbe(b.kind));
  // la barre en cours devient BLANCHE et se vide sur le palier : le temps
  // restant se lit sur l'objet que le joueur regarde deja.
  const palier = Math.max(0, Math.min(1, b.palier ?? 0));
  setWidth(el.bossFill, "bf", k);
  // la clef du memo est PROPRE au palier : `bpl` etait aussi celle du compte de
  // barres, donc chaque image ecrasait le dernier compte par un booleen — le
  // rail se retoggait pour rien, et la rupture ne pouvait pas se detecter.
  setClass(el.boss, "bpal", "palier", palier > 0);
  setStyle(el.bossBank, "bkl", "left", "0%");
  setStyle(el.bossBank, "bkw", "width", `${palier * 100}%`);
  // « x4 » et le rail disaient la meme chose de deux facons. Le rail MONTRE,
  // le texte NOMME — et il nomme la barre en cours, pas celles qui restent.
  setText(el.bossMult, "bm",
    tf("ui.hud.barre", "barre {n} / {max}", { n: bars - left + 1, max: bars }));
  setClass(el.bossMult, "bml", "last", left <= 1);

  if (memo.bpn !== bars) {
    memo.bpn = bars;
    el.bossPips.textContent = "";
    for (let i = 0; i < bars; i++) el.bossPips.appendChild(document.createElement("span"));
    memo.bpl = -1;
  }
  if (memo.bpl !== left) {
    const avant = memo.bpl;
    memo.bpl = left;
    // LE RAIL SE REMPLIT DE LA GAUCHE, comme la barre de mission : la POSITION
    // du segment allume EST le numero de la barre en cours. Un rail qui se vidait
    // par la droite donnait quatre segments allumes pour « barre 2 / 5 ».
    const tombees = bars - left;
    for (let i = 0; i < bars; i++) {
      const seg = el.bossPips.children[i];
      seg.classList.toggle("tombee", i < tombees);
      seg.classList.toggle("encours", i === tombees);
    }
    // LA RUPTURE SE JOUE DANS LE RAIL : le segment qui vient de tomber casse sur
    // place. Le hitstop et le son sont deja poses par le canal d evenements ;
    // le HUD n ajoute que la trace visuelle du compte.
    if (avant > left && avant <= bars) {
      for (let i = bars - avant; i < tombees; i++) {
        const seg = el.bossPips.children[i];
        if (!seg) continue;
        seg.classList.remove("brise");
        void seg.offsetWidth;
        seg.classList.add("brise");
      }
    }
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

/* L'EN-TETE DE MISSION — trois rangs et rien de plus : OU je suis (le lieu, en
   inscription), OU J'EN SUIS (la vague, en gros), COMBIEN DE TEMPS (la barre et
   le decompte). Le nom du lieu ne peut pas etre un titre de jeu au milieu de
   l'ecran : il descend en 13 px, et tout le bloc s'efface au bout de six
   secondes quand plus rien ne change.

   LA VAGUE CIRCULAIT SANS JAMAIS S'AFFICHER. `v.beat` ne servait qu'a detecter
   le crescendo, alors que c'est le seul palier de progression a l'echelle de la
   minute : un segment dure cinq minutes, une vague soixante secondes. */
const MISSION_MS = 6000;
let missionSig = "";
let missionAt = 0;

function updateSegment(v, c = {}, now = 0) {
  if (!v.segment || v.boss) { setHidden(el.seg, "sgOn", true); return; }
  setHidden(el.seg, "sgOn", false);

  const dernier = v.beat >= TL_CFG.BEATS - 1;
  const lieu = c.biomeNom ? ` · ${c.biomeNom}` : "";
  setText(el.segKicker, "sgk",
    `${segmentName(v.segment)} · ${v.segment}/${TL_CFG.SEGMENTS}${lieu}`);
  setText(el.segName, "sgn",
    tf("ui.hud.vague", "vague {n} / {max}",
       { n: Math.min(TL_CFG.BEATS, (v.beat ?? 0) + 1), max: TL_CFG.BEATS }));
  setClass(el.segName, "sgb", "crescendo", dernier);

  // LA BARRE MONTE, le chiffre descend : le front de remplissage tombe alors sur
  // la limite de la vague en cours, et les cinq graduations disent lesquelles
  // sont passees. Une barre qui se VIDE placait le front a l'oppose du compte.
  const frac = 1 - Math.max(0, Math.min(1, v.hordeLeft / TL_CFG.SEGMENT_TIME));
  let etat, couleur;
  const ev = v.event ? eventAt(v.event.id) : null;
  if (ev)             { etat = `${ev.nom} · ${mmss(v.event.t)}`;
                        couleur = ev.level === ALERT_ORDER ? SIGNAL.go : SIGNAL.warn; }
  else if (dernier)   { etat = t("ui.hud.crescendo", "crescendo"); couleur = SIGNAL.warn; }
  else                { etat = mmss(v.hordeLeft); couleur = TEXT.dim; }
  if (!ev && c.meteoNom) etat += ` · ${c.meteoNom}`;

  const sat = v.enemyList.length / enemyCap(difficulty, v.playerList.length);
  if (sat >= 0.7) {
    etat += ` · ${tf("ui.hud.arene", "arène {p} %", { p: Math.round(sat * 100) })}`;
    if (sat >= 0.98) couleur = SIGNAL.lethal;
    else couleur = SIGNAL.warn;
  }

  setWidth(el.segBar, "sgf", frac);
  setStyle(el.segBar, "sgc", "background-color", couleur);
  setText(el.segState, "sgs", etat);
  setStyle(el.segState, "sgsc", "color", couleur);

  // il ne s'efface que si RIEN n'attend une lecture : un evenement en cours et le
  // crescendo gardent le bloc allume.
  const sig = `${v.segment}|${v.beat}|${v.event?.id ?? ""}`;
  if (sig !== missionSig) { missionSig = sig; missionAt = now; }
  setClass(el.seg, "sgd", "dim", !ev && !dernier && now - missionAt > MISSION_MS);
}

function mmss(s) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}


/* LA BASE D'UNE RECHARGE EST CELLE QU'ON A VUE, jamais celle qu'on recalcule.
   Deux tables recopiaient les constantes du serveur en ignorant tout ce que les
   cartes en font : `skillCdMul` descend jusqu'a x0,55, `bombCdCut` retranche,
   `tauntCd` ajoute, `cdPerKill` raccourcit a chaque mort. Une recharge divisee
   par la mauvaise base part deja a moitie remplie. Le SOMMET OBSERVE est exact,
   gratuit, et il n'a rien a tenir a jour : la valeur au premier instantane qui
   suit le declenchement EST la duree. */
const cdPeak = [0, 0, 0, 0];

function cdFraction(i, cd) {
  if (cd <= 0) { cdPeak[i] = 0; return 1; }
  if (cd > cdPeak[i]) cdPeak[i] = cd;
  return 1 - cd / cdPeak[i];
}

// UNE LETTRE DANS UNE CASE EST UN RACCOURCI CLAVIER, PAS UNE ICONE : elle ne se
// reconnait pas du coin de l'oeil, et c'est la seule facon dont on regarde ses
// recharges. Le glyphe passe au premier plan, la touche reste ecrite en coin.
const pipNoms = [];

function buildPips(cdef) {
  el.pips.textContent = "";
  pipNoms.length = 0;
  const mk = (key, label, color, icon, px) => {
    pipNoms.push(label);
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
  mk(t("ui.key.spaceShort", "ESP"), t("ui.hud.pip.dash", "esquive"),
     TEXT.base, SKILL_ICON.dash, 20);
  mk("A", skillNom(cdef, 0).slice(0, 11), cdef.couleur, SKILL_ICON[`${cdef.id}0`], 20);
  mk("E", skillNom(cdef, 1).slice(0, 11), cdef.couleur, SKILL_ICON[`${cdef.id}1`], 20);
  // l'ultime a un rang a part : c'est le lot 04 qui en fait un ultime, l'interface
  // doit le dire aussi, sinon la promotion n'existe que dans le code.
  mk("3", skill3Nom(cdef.id).toLowerCase().slice(0, 11), cdef.couleur,
     SKILL_ICON[`${cdef.id}2`], 26)
    .classList.add("ult");
}

const PRESS_MS = 160;

/* LE LIBELLE PORTE DEUX CHOSES, JAMAIS DEUX LIGNES : le nom quand la case est
   prete — c'est la seule fois ou on a le temps de le lire — et le decompte
   pendant la recharge. Le nombre reste secondaire : ce qui se lit du coin de
   l'oeil est l'aire du voile et l'allumage du filet. */
function tempsPip(cd) {
  return cd >= 10 ? String(Math.ceil(cd)) : dec(cd, 1);
}

function updatePip(node, i, ready, cd, active, stock, now, verrou = false) {
  setClass(node, `pr${i}`, "ready", ready);
  setClass(node, `pa${i}`, "active", active);
  setStyle(node.firstElementChild, `pk${i}`, "--k",
    (cdFraction(i, cd) * 100).toFixed(0) + "%");
  setText(node.querySelector(".stock"), `ps${i}`, stock > 1 ? "×" + stock : "");
  setText(node.querySelector(".lbl"), `pl${i}`,
    verrou || cd <= 0 ? (pipNoms[i] ?? "") : tempsPip(cd));
  setClass(node.querySelector(".lbl"), `plc${i}`, "cd", !verrou && cd > 0);

  const presse = now - pipPress[i] < PRESS_MS;
  setClass(node, `pp${i}`, "press", presse && ready);
  // APPUYER SUR UNE CASE QUI NE PART PAS doit se distinguer d'un depart : sans
  // ca, le joueur ne sait pas s'il a mal appuye ou si c'est indisponible.
  setClass(node, `pf${i}`, "refus", presse && !ready);

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

  // DEUX LIGNES, JAMAIS DEUX COUCHES : le bouclier etait une trame posee SUR la
  // vie et son chiffre vivait dans la meme phrase que celui des PV.
  const pool = shieldPools(v).get(me.id) ?? 0;
  setHidden(el.shieldRow, "shrow", pool <= 0 && me.shield <= 0.5);
  updateShield(el.shieldBar, el.shield, "self", me.shield, pool, now);
  const ks = Math.min(1, me.shield / (pool > 0 ? pool : CFG.SHIELD_POOL));
  setGhost(el.shieldGhost, "sgs", ks, barGhost("selfSh", ks, now));
  setText(el.shieldVal, "shv", String(Math.round(me.shield)));

  const maxHp = me.maxHp || CFG.PLAYER_MAX_HP;
  const k = Math.max(0, Math.min(1, me.hp / maxHp));
  setWidth(el.hp, "shp", k);
  setStyle(el.hp, "shpc", "background-color", hpColor(k, me.downed, c.myColor));
  setGhost(el.hpGhost, "sgh", k, barGhost("self", k, now));
  setTicks(el.hpBar, "stk", maxHp);
  const bas = !me.downed && k < LOW_HP;
  setClass(el.hpBar, "slo", "low", bas);
  // LE SEUIL BAS EST UN ETAT DU HUD, pas une propriete de la barre : l'arete du
  // panneau change et l'ecran prend une vignette lente. Rien ne clignote.
  setClass(el.root, "sbas", "bas", bas);

  setText(el.hpText, "shpt", me.downed
    ? t("ui.hud.downed", "à terre")
    : `${Math.round(me.hp)} / ${maxHp}`);
  setClass(el.hpText, "shpd", "downed", !!me.downed);
  setHidden(el.downed, "sdwn", !me.downed);

  const teamProg = v.teamProgress ?? me.prog ?? 0;
  const teamLvl = v.teamLevel ?? me.level ?? 1;
  setWidth(el.xp, "sxp", teamProg);
  setText(el.level, "slvl", tf("ui.hud.level", "niv. {n}", { n: teamLvl }));

  const cdef = classAt(me.cls ?? CLASS_DEFAULT);
  if (memo.scls !== cdef.id) { memo.scls = cdef.id; buildPips(cdef); }

  updatePip(el.pips.children[0], 0, (me.dashCd ?? 0) <= 0, me.dashCd ?? 0,
    false, 0, now);

  // LA BOMBE EST UNE RESERVE, PAS UNE RECHARGE : elle part tant qu'il reste une
  // charge, et `cd1` mesure la remise en stock de la suivante.
  const stock = cdef.id === "dps" ? (me.bombStock ?? 0) : 0;
  const cd1 = me.cd1 ?? 0, cd2 = me.cd2 ?? 0;
  updatePip(el.pips.children[1], 1, cdef.id === "dps" ? stock > 0 : cd1 <= 0, cd1,
    (me.skillFlags & SKILL_HEAL_MODE) !== 0, stock, now);
  updatePip(el.pips.children[2], 2, cd2 <= 0, cd2,
    (me.skillFlags & (SKILL_TAUNT | SKILL_OVERDRIVE)) !== 0, 0, now);

  const tier3 = me.skill3 ?? 0;
  const pip3 = el.pips.children[3];
  setClass(pip3, "p3lock", "locked", tier3 <= 0);
  setClass(pip3, "p3t", "t3", tier3 >= 3);
  const cd3 = me.cd3 ?? 0;
  updatePip(pip3, 3, tier3 > 0 && cd3 <= 0, tier3 > 0 ? cd3 : 0,
    false, 0, now, tier3 <= 0);

  updateStatus(me, c.counts, now);
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
      node.className = `badge ${w.cls} in`;
      node.style.color = w.color;
      if (w.icon) node.appendChild(iconImg(w.icon, w.color, w.size));
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

/* TROIS RANGS DANS UNE SEULE BANDE, ET L'ORDRE EST LE RANG. Les etats vivaient
   dans le coin le plus froid de l'ecran — la ligne d'equipe, en 13 px — alors
   que ce sont les seules donnees du HUD dont la lecture change ce qu'on fait
   dans la seconde. Ils passent devant les bonus, qui passent devant les effets
   de build. Seul le rang 3 se replie : quatre effets, puis un compteur. */
const ETATS_MAX = 4;

function updateStatus(me, counts, now) {
  updateEtats(me);
  updateBuffs(me.buffs, now);
  updateEffects(counts);
}

function updateEtats(me) {
  const wanted = new Map();
  for (let i = 0; i < STATUSES.length; i++) {
    const st = STATUSES[i];
    if (!(me.statuses & statusBit(st.id))) continue;
    // la SENTENCE porte son decompte, la VULNERABILITE son empilement : les deux
    // seules durees que l'instantane donne deja.
    const txt = st.id === STATUS_DOOM && me.doom > 0 ? me.doom.toFixed(1)
      : st.id === STATUS_VULN && me.vuln > 1 ? "×" + me.vuln : "";
    wanted.set("s:" + st.id, { color: st.couleur, icon: STATUS_ICON[st.id],
                               size: 18, text: txt, ord: i, cls: "r1" });
  }
  reconcileBadges(el.status, "s:", wanted);
}

function updateEffects(counts) {
  const wanted = new Map();
  let replies = 0;
  for (let i = 0; i < EFFECT_BADGES.length; i++) {
    const e = EFFECT_BADGES[i];
    const n = counts.get(e.id) ?? 0;
    if (n <= 0) continue;
    if (wanted.size >= ETATS_MAX) { replies++; continue; }
    wanted.set("e:" + e.id, { color: e.color, icon: e.icon, size: 12,
                              text: n > 1 ? "×" + n : "", ord: 200 + i, cls: "r3" });
  }
  if (replies > 0) {
    wanted.set("e:+", { color: TEXT.dim, icon: null, size: 0,
                        text: "+" + replies, ord: 299, cls: "r3" });
  }
  reconcileBadges(el.status, "e:", wanted);
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
    wanted.set("b:" + key, { color: st.color, icon: st.icon, size: 14,
                             text: t(`ui.buff.${key}`, label), ord: 100 + i,
                             k: (until - now) / duree, cls: "r2" });
  }
  reconcileBadges(el.status, "b:", wanted);
}


// LE JOUEUR NE DOIT PAS FAIRE L'ARITHMETIQUE : le panneau donne des valeurs
// EFFECTIVES, jamais des pourcentages. Tout se deduit de ce que le client a
// deja — instantane, cartes, reliques — sans un octet de reseau.
const num = (v, d = 1) => dec(v, d);

// « critique » ne disait pas si c'etait le TAUX ou les DEGATS : deux lignes
// valent mieux qu'un libelle a deviner. Ce qui n'a pas de valeur absolue —
// reduction et rayon — reste un multiplicateur, mais son sens est ecrit.
const STAT_ROWS = [
  { cle: "degatsTir", nom: "dégâts par tir", val: s => num(s.degats) },
  { cle: "cadence", nom: "tirs par seconde", val: s => num(s.cadence, 2) },
  { cle: "dps", nom: "dégâts par seconde", val: s => num(s.dps) },
  { cle: "canons", nom: "projectiles par tir", val: s => num(s.canons, 2) },
  { cle: "critTaux", nom: "taux de critique", val: s => Math.round(s.critChance * 100) + " %" },
  { cle: "critDegats", nom: "dégâts critiques", val: s => "×" + num(s.critMul, 2) },
  // ces trois lignes existent parce qu'une carte entiere ne se voyait NULLE PART
  // sans elles : « Poudre dense » et « Canon long » ne touchent ni les degats ni
  // la cadence. Un panneau ou une carte prise ne bouge rien ne sert a rien.
  { cle: "portee", nom: "portée", val: s => fmtM(s.portee) },
  { cle: "pierce", nom: "perforation", val: s => String(s.pierce) },
  { cle: "chain", nom: "ricochets", val: s => String(s.chain) },
  { cle: "pointsDeVie", nom: "points de vie", val: s => `${Math.round(s.hp)} / ${Math.round(s.maxHp)}` },
  { cle: "bouclier", nom: "bouclier max", val: s => String(Math.round(s.bouclier)) },
  { cle: "vitesse", nom: "vitesse", val: s => num(toM(s.vitesse)) + " m/s" },
  { cle: "subis", nom: "dégâts subis", val: s => "×" + num(s.subis, 2) },
  { cle: "rayon", nom: "rayon d'effet", val: s => "×" + num(s.rayon, 2) },
];

// au-dela de dix mille, les milliers ne se lisent plus : ils s'estiment.
function grandNombre(n) {
  return n >= 10000 ? `${dec(n / 1000, 1)} K` : String(Math.round(n));
}

const STATS_MS = 250;
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

// LE PANNEAU DONNE DES VALEURS EFFECTIVES : il lui manquait la META, donc un
// compte qui avait equipe « Precision » au maximum lisait encore 5 % de taux de
// critique la ou le serveur en roulait 15. On rejoue exactement ce que `room.js`
// construit au lancement — lignes EQUIPEES seulement — et le profil ne change
// pas en manche, donc on le resout par identite d'objet et non par signature.
let metaFrom = null, metaCls = "", metaCache = null, metaGen = 0;
function myMeta(clsId) {
  if (progressState !== metaFrom || clsId !== metaCls) {
    metaFrom = progressState;
    metaCls = clsId;
    metaGen++;
    metaCache = progressState ? metaLinesFor(progressState, clsId) : null;
  }
  return metaCache;
}
function myMods(me, v) {
  const counts = ownedCounts(me.id);
  const others = [];
  for (const p of v.playerList) if (p.id !== me.id) others.push(ownedCounts(p.id));
  const niveau = v.teamLevel ?? me.level ?? 1;
  const cls = me.cls ?? CLASS_DEFAULT;
  const clsId = classAt(cls).id;
  const meta = myMeta(clsId);
  let sig = `${niveau}|${me.cls}|${metaGen}|`;
  for (const [id, n] of counts) sig += `${id}${n},`;
  sig += "#";
  for (const o of others) for (const [id, n] of o) sig += `${id}${n},`;
  if (sig !== modsSig || !modsCache) {
    modsSig = sig;
    // `fullMods` rend `{ mods, maxHp }`, pas les mods : le lire a plat donnait
    // des `NaN` en cascade, et le premier `.toFixed` sur un champ absent vidait
    // toutes les lignes suivantes du panneau.
    const r = fullMods(counts, others, cls, niveau);
    modsCache = meta ? applyMeta(r.mods, r.maxHp, clsId, meta.lines, meta.commun).mods
                     : r.mods;
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

  if (!on || now - statsAt < STATS_MS) return;
  statsAt = now;

  // UN COMPTEUR DE DEGATS JUGE LA PARTIE, PAS UNE FENETRE : le total divise par
  // le temps de manche ecoule. `tm` ne court ni pendant le briefing ni pendant
  // un ecran, donc le denominateur est deja du temps de COMBAT.
  const tot = me.damage ?? 0;
  setText(statDps.lastElementChild, "stD",
    grandNombre(tot / Math.max(1, v.tm ?? 0)));
  setText(statTot.lastElementChild, "stT", grandNombre(tot));

  setHidden(el.statsRows, "stRH", !hudStats);
  setHidden(el.statsHurt, "stHH", !hudStats);
  if (!hudStats) return;

  const m = myMods(me, v);
  const flat = relicFlat(me.id, "flatDamage")
    + [...v.playerList].reduce((s, p) => p.id === me.id ? s : s + relicFlat(p.id, "allyFlatDamage"), 0);
  // meme decoupe que `_volley` : ce que le canon en plus ajoute depend de
  // l'arme, et seule celle qui l'encaisse affiche la penalite
  const arme = ARMES[me.arme] ?? ARMES[0];
  const canons = canonEffet(arme) !== null;
  const degats = (CFG.BULLET_DAMAGE + flat) * m.damageMul
    * (canons ? m.barrelDamageMul : 1);
  const interval = me.fireInterval > 0 ? me.fireInterval : CFG.FIRE_INTERVAL * m.fireIntervalMul;
  const cadence = 1 / Math.max(0.01, interval);
  const tubes = canonGain(arme, canons ? m.extraBarrels : 0) + (m.backShot ? 0.7 : 0);
  // les reliques de critique ne passent PAS par `mods` : elles se lisent au
  // point d'application, comme les degats bruts au-dessus
  const critChance = Math.min(CARD_CFG.CRIT_CHANCE_CAP,
    m.critChance + relicFlat(me.id, "critFlat"));
  const critMul = m.critMul + relicFlat(me.id, "critMulFlat");
  const s = {
    degats, cadence, canons: tubes,
    dps: degats * cadence * tubes * (1 + critChance * (critMul - 1)),
    critChance, critMul,
    hp: me.hp, maxHp: me.maxHp || CFG.PLAYER_MAX_HP,
    bouclier: shieldPools(v).get(me.id) ?? 0,
    portee: CFG.BULLET_SPEED * m.bulletSpeedMul * CFG.BULLET_LIFE * m.bulletLifeMul,
    pierce: m.pierce, chain: m.chain,
    vitesse: CFG.PLAYER_SPEED * m.speedMul,
    subis: m.damageTakenMul, rayon: m.areaMul,
  };

  if (el.statsRows.children.length !== STAT_ROWS.length || memo.stLang !== getLang()) {
    memo.stLang = getLang();
    el.statsRows.textContent = "";
    for (const r of STAT_ROWS) {
      const d = document.createElement("div");
      d.className = "tele statRow";
      d.innerHTML = '<span class="lab"></span><span class="val"></span>';
      d.firstElementChild.textContent = t(`ui.stat.${r.cle}`, r.nom);
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
    d.append(`${srcLabel(i)} ${Math.round(hurtParSrc[i] / total * 100)} %`);
    el.statsHurt.appendChild(d);
  }
}

function updateAlerts(c, now) {
  const o = c.alertOrder;
  setHidden(el.order, "aoOn", !o);
  if (o) {
    // L'ENTREE SE REJOUE A CHAQUE CONSIGNE, meme quand la precedente n'a pas eu
    // le temps de disparaitre : le noeud ne change pas d'etat cache, donc rien
    // ne la rejouerait sans ca.
    if (memo.aoe !== o.from) { memo.aoe = o.from; rejouer(el.order, "entre"); }
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
    setClass(el.announce, "anFin", "final", finalBoss);
    show("boss",
      sinceBoss < plein ? 1 : 1 - (sinceBoss - plein) / (duree - plein), false,
      finalBoss ? bossNom(v.boss.kind).toUpperCase()
        : `${bossNom(v.boss.kind).toUpperCase()} ${ROMAN[v.boss.index] ?? v.boss.index}`,
      bossVerbe(v.boss.kind).toUpperCase(), bossSous(v.boss.kind));
    return;
  }
  if (v.boss && v.boss.phase > 0 && sincePhase < 2200) {
    show("phase", sincePhase < 1600 ? 1 : 1 - (sincePhase - 1600) / 600, true,
      tf("ui.hud.barBroken", "BARRE BRISÉE — PHASE {n}", { n: v.boss.phase + 1 }),
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

/* LE MOT QUI MONTE. Meme couche et meme animation que les chiffres — c'est la
   meme question posee au meme endroit : « qu'est-ce qui vient de se passer la ».
   Il ne se FUSIONNE pas, contrairement aux degats : deux bonus ramasses coup sur
   coup sont deux faits, pas un cumul. */
export function hudLabel(x, y, texte, col) {
  if (!texte) return;
  if (x < -20 || x > CFG.VIEW_W + 20 || y < -20 || y > CFG.VIEW_H + 20) return;
  if (dmgCount >= DMG_MAX) return;
  const d = document.createElement("div");
  d.className = "dmg mot";
  d.style.color = col;
  d.appendChild(document.createTextNode(texte));
  d.style.left = (x / CFG.VIEW_W * 100).toFixed(2) + "%";
  d.style.top = (y / CFG.VIEW_H * 100).toFixed(2) + "%";
  d.addEventListener("animationend", () => { d.remove(); dmgCount--; }, { once: true });
  el.dmg.appendChild(d);
  dmgCount++;
}

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
  /* LE SUR MESURE SE VOIT EN MANCHE, ET IL DIT SA SEVERITE : le mode change ce
     que la salle joue ET ce qu elle ne gagnera pas. Il disparait dans les trois
     modes normaux — un temoin permanent qui ne dit rien cesse d etre lu. */
  updateContrat(v);
  const surMesure = c.difficulty === CUSTOM_INDEX;
  setHidden(el.custom, "cst", !surMesure);
  if (surMesure) {
    setText(el.custom, "cstT",
      tf("ui.hud.custom", "SUR MESURE · sévérité {s}", { s: c.customSeverite ?? 0 }));
  }

  const me = v.playerList.find(p => p.id === c.myId);
  const eclats = me?.eclats ?? 0;

  setText(metaKills.lastElementChild, "mKills", String(v.kills));
  setText(metaEnem.lastElementChild, "mEnem", String(v.enemyList.length));
  setText(metaPing.lastElementChild, "mPing", String(c.ping));

  setHidden(metaEcl, "mEclH", eclats === 0);
  if (eclats > 0) setText(metaEcl.lastElementChild, "mEcl", String(eclats));

  setHidden(metaDiff, "mDiffH", c.difficulty === 1);
  if (c.difficulty !== 1) {
    setText(metaDiff, "mDiff", diffLabel(c.difficulty).toUpperCase());
    setStyle(metaDiff, "mDiffC", "color", c.difficulty > 1 ? BOSS.barLow : SIGNAL.gain);
  }

  updateSegment(v, c, now);
  setHidden(metaSlow, "mSlowH", !v.slow);

  // LE BOSS EST UN ETAT DU HUD : ce qui est du confort recule d'un rang tant
  // qu'il est la.
  setClass(el.root, "hbo", "boss", !!v.boss);
  updateBoss(v.boss, now);
  updateBeat(v);
  updateTeam(v, c, now);
  updateMarks(v, c);
  updateSelf(v, c, now);
  setHidden(el.stats, "stOn", !me || !(hudStats || hudDps));
  updateAlerts(c, now);
  updateAnnounce(v, c, now);

  setHidden(el.spectator, "spec", !c.amSpectator);
  updateHautsFaits(now, !!c.ecranOuvert);

  if (c.perf) {
    setHidden(el.perf, "pfOn", false);
    // `#hudPerf` est en `pre-line` : deux lignes, la charge d'abord, le cout
    // ensuite. `frag` porte son PLAFOND — un compteur de particules sans le
    // sien ne dit pas si on sature, et c'est la seule question qu'il pose.
    setText(el.perf, "pf",
      `${c.fps.toFixed(0)} i/s · ${c.particles}/${c.fragMax} frag · ${c.fx} fx · ` +
      `${v.enemyList.length} ennemis · ${v.bulletList.length} balles\n` +
      `${c.renderer} ${c.draws} appels / ${c.quads} quads · ` +
      `${c.voices} voix (pic ${c.peak} · ${c.refus} refus · ${c.vols} vols)`
      + (c.net ? `\n${c.net}` : ""));
    setClass(el.perf, "pfl", "low", c.fps < 55);
  }
}

/* LE BANDEAU DIT CE QU'IL DONNE. Un haut fait qui ne nomme pas sa recompense
   oblige a aller verifier, donc a quitter la manche des yeux.
   Trois regles : une a la fois, les autres en file ; il ATTEND que l'ecran de
   cartes se ferme, parce que la decision du joueur ne doit pas etre recouverte ;
   et il ne parle que de TES hauts faits — ceux des allies passent en alerte. */
const HF_BANDEAU_MS = 4000;
const file = [];
let bandeau = null;

export function pousserHautFait(id) {
  if (!HF_BY_ID.has(id)) return;
  file.push(id);
}

function nomRecompense(h) {
  const type = h.reward.type;
  const noms = h.reward.ids.map(id =>
    type === "cadre" ? cadreNom(id)
    : type === "relique" ? relicNom(id)
    : type === "ligne" ? t(`prog.famille.${id}`, id)
    : (cardNom(id) || id));
  return `${rewardLabel(type)} — ${noms.join(", ")}`;
}

function updateHautsFaits(now, couvert) {
  if (bandeau && now >= bandeau.fin) {
    bandeau = null;
    el.hf.hidden = true;
    el.hf.classList.remove("on");
    el.root.classList.remove("hf");
  }
  if (bandeau || couvert || file.length === 0) return;
  const h = HF_BY_ID.get(file.shift());
  if (!h) return;
  bandeau = { fin: now + HF_BANDEAU_MS };
  el.hf.innerHTML =
    `<div class="hfKicker">${escapeHtml(t("ui.hf.obtenu", "haut fait"))}</div>`
    + `<div class="hfNom">${escapeHtml(hfNom(h.id))}</div>`
    + `<div class="hfTexte">${escapeHtml(hfTexte(h.id))}</div>`
    + `<div class="hfGain">${escapeHtml(nomRecompense(h))}</div>`;
  el.hf.hidden = false;
  // LE BANDEAU AVAIT TOUT SAUF UNE VOIX. `hud.js` etait le seul module du client
  // qui affiche quelque chose sans jamais rien faire entendre — et ce qu il
  // affiche ici est la recompense la plus rare du jeu.
  playSound("hautFait");
  // le panneau de telemetrie occupe le meme coin : il s'efface pendant que le
  // bandeau est la, et lui seul — c'est le rang de lecture qui tranche.
  el.root.classList.add("hf");
  // deux images separent l'affichage de la classe : sans ca la transition CSS
  // part d'un noeud qui vient de naitre et ne joue pas.
  requestAnimationFrame(() => requestAnimationFrame(() => el.hf.classList.add("on")));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function fmtTime(t) {
  const m = String(Math.floor(t / 60)).padStart(2, "0");
  const s = String(Math.floor(t % 60)).padStart(2, "0");
  return m + ":" + s;
}
