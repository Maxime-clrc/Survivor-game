/* ===========================================================================
   HUD — la couche ECRAN, en DOM.

   Elle est sortie du canvas. La cause racine du HUD illisible n'etait pas une
   taille de police : le canvas a une memoire fixe que le CSS etire, donc tout
   ce qui y est dessine grandit ou retrecit avec la fenetre. Un element CSS,
   lui, fait la taille qu'on lui donne.

   Trois consequences qui tombent du decoupage :
     - le tressaillement d'ecran devient un `transform` sur le canvas, et le
       HUD, qui en est le FRERE, ne tremble plus — la separation en deux passes
       de rendu n'a plus lieu d'etre ;
     - une recharge en `conic-gradient`, une barre avec `transition`, un voile
       en `opacity` : c'est le compositeur qui travaille, pas la boucle de jeu ;
     - les chiffres de degats sont des elements DOM et recuperent gratuitement
       le contour de texte, l'assouplissement et le fondu.

   Ce module ne connait ni le reseau, ni le canvas, ni la prediction. Il recoit
   une vue interpolee et un contexte, et il ecrit dans le DOM — rien d'autre.

   REGLE DE PERFORMANCE : on n'ecrit dans le DOM que si la valeur a change.
   Repeindre soixante fois par seconde une chaine identique fait recalculer la
   mise en page pour rien, et c'est exactement le cout qu'on est venu chercher
   ici en sortant du canvas.
   =========================================================================== */

import {
  CFG, PLAYER_COLORS, DIFFICULTIES,
  BUFF_DAMAGE, BUFF_RATE, BUFF_DOUBLE, BUFF_PIERCE, BUFF_RICOCHET,
} from "/shared/game_state.js";
import { CLASS_DEFAULT, SKILL_CFG, SKILL3_NAME, classAt,
         SKILL_HEAL_MODE, SKILL_TAUNT, SKILL_OVERDRIVE } from "/shared/classes.js";
import { CARD_CFG } from "/shared/cards.js";
import { STATUSES, STATUS_VULN, STATUS_DOOM, statusBit } from "/shared/statuses.js";
import { bossAt, ALERT_ORDER, BOSS_FINAL } from "/shared/bosses.js";
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
  bossBank: $("bossBank"),
  bossMult: $("bossMult"),
  bossPips: $("bossPips"),
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

/* Les six lignes du bloc meta, construites UNE fois.

   Elles etaient recomposees en une chaine unique dont la signature contenait
   le compte d'ennemis : pendant une apparition de vague ce compte change a
   chaque image, donc le sous-arbre entier etait detruit (`textContent = ""`)
   puis reconstruit — trois a cinq `createElement` soixante fois par seconde,
   au moment precis ou l'arene est la plus chargee. La table `memo` existe pour
   empecher exactement ca, et cette seule chaine la desarmait.

   Les trois lignes conditionnelles (eclats, difficulte, temps ralenti) sont
   MASQUEES et non creees ni detruites : un `hidden` memoise ne coute rien, une
   creation de noeud fait recalculer la mise en page. */
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
/* Masques des la construction : `updateHud` les corrigera, mais il ne tourne
   qu'en manche — sans ca, la premiere image apres `showHud(true)` montrerait
   deux lignes vides le temps d'un tour. */
metaEcl.hidden = metaDiff.hidden = metaSlow.hidden = true;

/* Memoire des dernieres valeurs ecrites. Une seule table plate : la question
   posee a chaque champ est « est-ce la meme chaine qu'a l'image precedente »,
   et une table plate y repond sans allouer. */
const memo = Object.create(null);

function setText(node, key, value) {
  if (memo[key] === value) return;
  memo[key] = value;
  node.textContent = value;
}

function setWidth(node, key, frac) {
  // Arrondi au dixieme de pour cent : en dessous, la difference n'est pas
  // affichable et on paierait une ecriture de style par image.
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

/* --- visibilite ------------------------------------------------------------ */

export function showHud(on) {
  el.root.hidden = !on;
}

export function resetHud() {
  el.dmg.textContent = "";
  dmgCount = 0;
  for (const k of Object.keys(memo)) delete memo[k];
}

/* --- barre de vie : les seuils ---------------------------------------------
   Le passage a l'ambre puis au rouge se lit sans compter les pixels, ce qu'une
   barre d'une seule couleur ne permet pas. */
function hpColor(k, downed, col) {
  if (downed) return COMBAT.downed;
  return k < 0.25 ? HUD.low : (k < 0.5 ? HUD.mid : col);
}

/* --- cadre d'equipe --------------------------------------------------------- */

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

    /* Etats et decompte de Sentence : c'est ICI qu'on decide qui purger, donc
       l'information doit y etre entiere. La signature evite de reconstruire
       quatre glyphes par image pour un etat qui n'a pas bouge. */
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

/* --- barre de boss ---------------------------------------------------------
   La barre affichee n'est pas la vie totale mais la barre EN COURS, et le
   compteur « ×N » dit combien il en reste. Une seule jauge pour cinq barres
   avancait si lentement qu'on ne voyait plus ses degats ; decoupee, chaque
   barre est un objectif atteignable et sa rupture est un evenement. */
function updateBoss(b) {
  if (!b) { setHidden(el.boss, "bossOn", true); return; }
  setHidden(el.boss, "bossOn", false);

  const bars = Math.max(1, b.bars ?? 1);
  const barHp = b.maxHp / bars;
  const left = Math.max(1, Math.min(bars, Math.ceil(b.hp / barHp)));
  const k = Math.max(0, Math.min(1, (b.hp - (left - 1) * barHp) / barHp));

  /* La barre prend la teinte de la CREATURE. Deux informations sur le meme
     adversaire — sa silhouette dans l'arene, sa vie en haut de l'ecran — ne
     peuvent pas etre de deux couleurs differentes ; jusqu'au lot 6 elles
     l'etaient, parce que les cinq boss se dessinaient tous en rouge.
     Deux variables CSS posees sur le seul bloc de boss, ce qui laisse la
     feuille de style entierement en charge du degrade et des seuils : le
     canvas ne connait pas cette barre, elle est en DOM. */
  const kind = b.kind ?? 0;
  const def = bossAt(kind);
  if (memo.bsk !== kind) {
    memo.bsk = kind;
    const K = BOSS_SKIN[kind] ?? BOSS_SKIN[0];
    el.boss.style.setProperty("--boss-low", K.bar);
    el.boss.style.setProperty("--boss-deep", K.deep);
    /* BARRE DU BOSS FINAL (lot W). Une classe posee UNE FOIS, au changement de
       boss — tout le reste (largeur, nom plus gros, pulsation) vit en CSS. La
       pulsation ne peut pas etre pilotee ici : le HUD n'ecrit dans le DOM que si
       la valeur a change, et une animation par image reprendrait exactement le
       cout qu'on est venu chercher en sortant du canvas. C'est le compositeur
       qui travaille, pas la boucle de jeu. */
    el.boss.classList.toggle("final", kind === BOSS_FINAL);
  }
  /* ENRAGE. Le canal d'alerte annonce chaque palier, mais une annonce dure deux
     secondes et l'enrage dure tout le reste du combat : sans etat permanent, le
     joueur qui a rate le bandeau ne sait plus pourquoi il fond. Le nom du boss
     le porte — c'est deja l'element qui dit QUI frappe, il dit maintenant
     comment. Le palier est ecrit en chiffres : le deuxieme fait deux fois plus
     mal que le premier, et le taire donnerait une menace sans echelle. */
  const rage = b.enrage ?? 0;
  setText(el.bossName, "bn", `${def.nom.toUpperCase()} ${ROMAN[b.index] ?? b.index}`
    + (rage > 0 ? ` — EMPORTEMENT ${ROMAN[rage] ?? rage}` : ""));
  setClass(el.bossName, "bnr", "enrage", rage > 0);
  setText(el.bossVerb, "bv", def.verbe);
  /* La pulsation ACCELERE quand il s'affaiblit : un signal de progression en
     plus du remplissage, et le seul du jeu qui dise « la fin approche » sans
     chiffre. La periode passe de 2,4 s a pleine vie a 0,7 s sur la derniere
     barre — calculee ici parce que le CSS ne connait pas les PV. */
  if (final) {
    const usure = 1 - Math.max(0, Math.min(1, b.hp / b.maxHp));
    const per = (2.4 - usure * 1.7).toFixed(2);
    if (memo.bfp !== per) {
      memo.bfp = per;
      el.boss.style.setProperty("--boss-pulse", `${per}s`);
    }
  }
  /* Les PV AFFICHES retranchent la reserve : c'est le chiffre que le joueur
     verifie quand la barre ne bouge pas, et lui montrer les PV bornes le ferait
     mentir exactement comme elle. Il peut donc descendre sous le seuil de la
     barre courante — c'est vrai, la rupture n'attend qu'une echeance. */
  const bank = Math.max(0, b.bank ?? 0);
  setText(el.bossHp, "bh",
    `${Math.max(0, Math.round(b.hp - bank))} / ${b.maxHp}`);
  setWidth(el.bossFill, "bf", k);
  /* La part en attente se pose SUR le remplissage, collee a son bord droit :
     `left` la fait commencer la ou les PV tomberont, `width` dit combien. */
  const bf = Math.max(0, Math.min(k, bank / Math.max(1, b.maxHp)));
  setStyle(el.bossBank, "bkl", "left", `${(k - bf) * 100}%`);
  setStyle(el.bossBank, "bkw", "width", `${bf * 100}%`);
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
    /* La pulsation du boss final ACCELERE a mesure que les barres tombent, et
       elle est ecrite ICI — au changement de barre, soit huit fois dans tout le
       combat — et non par image : c'est une variable CSS que le compositeur
       consomme ensuite tout seul. De 2,6 s a la premiere barre a 0,9 s a la
       derniere. */
    if (kind === BOSS_FINAL) {
      const k = bars > 1 ? (bars - left) / (bars - 1) : 1;
      el.boss.style.setProperty("--final-pulse", `${(2.6 - k * 1.7).toFixed(2)}s`);
    }
  }

  /* Jauge d'ultime de l'Oracle. Elle ne s'affiche que si elle existe : c'est le
     seul boss ou reussir une mecanique fait DESCENDRE quelque chose, et elle
     n'aurait aucun sens sous les quatre autres. */
  const ult = b.ult ?? 0;
  setHidden(el.bossUlt, "bun", ult <= 0);
  if (ult > 0) {
    setWidth(el.bossUltFill, "buf", Math.min(1, ult));
    setClass(el.bossUlt, "buh", "high", ult > 0.75);
  }
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/* --- bandeau de segment ----------------------------------------------------
   Il s'efface quand le boss est la : deux barres centrees l'une sous l'autre
   ne se lisent pas, et pendant un boss c'est la sienne qui compte.

   Trois informations, et la troisieme est nouvelle : la SATURATION de l'arene.
   Sans nettoyage de vague, la population tend vers son plafond et les
   apparitions en trop sont silencieusement jetees — la difficulte plafonne au
   moment precis ou l'equipe est en train de perdre, et rien a l'ecran ne le
   disait. Elle ne traverse PAS le reseau : elle se deduit de la liste
   d'ennemis, que le client a deja. */
function updateSegment(v, c = {}) {
  if (!v.segment || v.boss) { setHidden(el.seg, "sgOn", true); return; }
  setHidden(el.seg, "sgOn", false);

  const dernier = v.beat >= TL_CFG.BEATS - 1;
  /* LE BIOME ET LA METEO SE GREFFENT SUR LA LIGNE DE SEGMENT, ils n'ouvrent pas
     une ligne a eux (lot V). C'est exactement l'arbitrage deja fait pour les
     evenements : le bandeau dit « ou l'on en est », et le lieu en fait partie.
     Une troisieme ligne aurait ete un element de plus a chercher au moment ou
     l'ecran est le plus charge — et le biome, lui, ne change jamais en cours de
     manche : on le lit une fois, il n'a pas a se disputer l'attention ensuite.

     La meteo s'affiche a cote parce qu'elle change AVEC le segment : les deux
     repondent a la meme question et se lisent d'un seul coup d'oeil. Hors
     cauchemar il n'y en a jamais, et la ligne redevient celle d'avant. */
  const lieu = c.biomeNom ? ` · ${c.biomeNom}` : "";
  const meteo = c.meteoNom ? ` · ${c.meteoNom}` : "";
  /* L'ETAPE PORTE SON NOM (lot X). « Segment 3/6 » est une coordonnee : il dit
     ou l'on est dans une liste, jamais ce qui s'y passe. Le numero reste a cote
     — les deux repondent a des questions differentes, et l'un ne remplace pas
     l'autre : le nom situe dans l'histoire, le numero dans la duree. */
  setText(el.segName, "sgn",
    `${segmentName(v.segment)} · ${v.segment}/${TL_CFG.SEGMENTS}${lieu}${meteo}`);
  setClass(el.segName, "sgb", "crescendo", dernier);

  // La barre se VIDE : c'est le temps de horde restant avant le boss, pas une
  // progression a accomplir.
  const frac = Math.max(0, Math.min(1, v.hordeLeft / TL_CFG.SEGMENT_TIME));
  /* L'EVENEMENT prend la place de l'etat, il n'ajoute pas une ligne (lot U). Le
     bandeau de segment dit deja « ou en est la minute » ; un evenement EST cette
     reponse tant qu'il dure, et une seconde ligne aurait ete un element de plus
     a chercher au moment ou l'ecran est le plus charge.

     Sa couleur suit la grammaire par le niveau d'alerte de la table : une
     consigne est cyan (il faut y aller — concentrer le feu), un avertissement
     ambre (danger). Le nom vient de `EVENTS`, que le client importe : le
     snapshot ne transporte qu'un index et un compte a rebours. */
  let etat, couleur;
  const ev = v.event ? eventAt(v.event.id) : null;
  if (ev)             { etat = `${ev.nom} · ${mmss(v.event.t)}`;
                        couleur = ev.level === ALERT_ORDER ? SIGNAL.go : SIGNAL.warn; }
  else if (dernier)   { etat = "crescendo"; couleur = SIGNAL.warn; }
  else                { etat = mmss(v.hordeLeft); couleur = TEXT.dim; }

  /* La saturation ne s'affiche qu'a partir du seuil ou elle veut dire quelque
     chose : en permanence, elle deviendrait un chiffre de fond qu'on ne lit
     plus, et c'est justement au moment ou elle grimpe qu'il faut la voir. */
  const sat = v.enemyList.length / CFG.MAX_ENEMIES;
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

/* --- pastilles de competence ------------------------------------------------
   Trois : l'esquive, puis les deux competences de classe, toujours dans le
   meme ordre. La lettre et non le chiffre — c'est la touche qu'on utilise, la
   main restant sur ZQSD. */

/* Recharges de BASE, pour le seul calcul du voile. Le client ne connait pas les
   cartes des autres, donc une recharge raccourcie par « Provocation prolongee »
   se remplit un peu plus vite que le secteur ne le montre. Sans consequence :
   l'information qui compte est « pret / pas pret », et elle est exacte. */
const SKILL_BASE_CD = {
  tank: [SKILL_CFG.TANK_BULWARK_CD, SKILL_CFG.TANK_TAUNT_CD],
  soigneur: [SKILL_CFG.HEAL_MODE_SWAP_CD, SKILL_CFG.HEAL_WAVE_CD],
  dps: [SKILL_CFG.DPS_BOMB_CD, SKILL_CFG.DPS_OVERDRIVE_CD],
};

/* Recharges de base de la TROISIEME competence (lot C), indexees par palier —
   la recharge depend du palier de la carte, contrairement aux deux premieres. */
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
  // « ESP » et non le symbole d'espace : le glyphe ␣ se rend en carre vide dans
  // la moitie des chasses fixes, et une touche illisible ne sert a rien.
  mk("ESP", "esquive", TEXT.base);
  mk("A", cdef.skills[0].nom.slice(0, 11), cdef.couleur);
  mk("E", cdef.skills[1].nom.slice(0, 11), cdef.couleur);
  /* La troisieme pastille existe DES LE DEBUT, grisee et barree tant que la
     carte n'est pas tiree : le joueur voit que l'emplacement existe, ce qui
     rend la carte desirable avant meme de la connaitre. */
  mk("3", (SKILL3_NAME[cdef.id] ?? "").toLowerCase().slice(0, 11), cdef.couleur);
}

function updatePip(node, i, ready, k, active, stock) {
  setClass(node, `pr${i}`, "ready", ready);
  setClass(node, `pa${i}`, "active", active);
  setStyle(node.firstElementChild, `pk${i}`, "--k",
    (Math.max(0, Math.min(1, k)) * 100).toFixed(0) + "%");
  setText(node.querySelector(".stock"), `ps${i}`, stock > 1 ? "×" + stock : "");

  /* Eclat au retour a disponibilite. On le declenche sur la TRANSITION et non
     sur l'etat : allume en permanence, il ne dirait plus rien. */
  if (ready && memo[`pw${i}`] === false) {
    node.classList.remove("flash");
    void node.offsetWidth;       // force le redemarrage de l'animation
    node.classList.add("flash");
  }
  memo[`pw${i}`] = ready;
}

/* --- bloc personnel --------------------------------------------------------- */

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

  /* Jauge d'experience COMMUNE a l'equipe, collee sous la vie. Le libelle le
     dit explicitement, sinon chacun croit lire sa propre progression et
     s'etonne de la voir bouger quand il ne tue rien. */
  const teamProg = v.teamProgress ?? me.prog ?? 0;
  const teamLvl = v.teamLevel ?? me.level ?? 1;
  setWidth(el.xp, "sxp", teamProg);
  if (memo.slvl !== teamLvl) {
    memo.slvl = teamLvl;
    el.level.innerHTML = "";
    el.level.append(`niv. ${teamLvl}`, Object.assign(document.createElement("small"),
      { textContent: "équipe" }));
  }

  // Pastilles : esquive + les deux competences de la classe.
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

  /* Troisieme pastille (lot C). Grisee tant que `skill3` vaut zero — c'est le
     palier de la carte, transmis par le snapshot, et un serveur anterieur qui
     ne l'envoie pas donne exactement cet etat. */
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

/* Bande d'effets POSSEDES. Elle est la source de verite de ce qu'on a : le
   rendu dans l'arene peut toujours etre masque par deux cents ennemis, la
   bande, elle, ne bouge pas. */
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

/* Bonus RAMASSES AU SOL, sur une rangee distincte : les premiers sont
   permanents, les seconds passent. Une seule rangee melangee et on ne sait
   plus ce qui va disparaitre. */
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

/* --- consignes -------------------------------------------------------------- */

function updateAlerts(c, now) {
  const o = c.alertOrder;
  setHidden(el.order, "aoOn", !o);
  if (o) {
    setText(orderTxt, "aot", o.texte);
    setText(orderSrc, "aos", o.nom.toUpperCase());
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

/* --- annonces plein ecran ---------------------------------------------------
   Deux seulement : l'arrivee du boss (son NOM et son VERBE, la premiere
   information du combat) et la rupture de barre, qui annonce ce qui vient de
   s'ouvrir — c'est ce qui transforme la surprise en apprentissage. */
function updateAnnounce(v, c, now) {
  const sinceBoss = now - c.bossAnnounce;
  const sincePhase = now - c.phaseAnnounce;

  /* L'annonce du NOYAU (lot N) tient deux fois plus longtemps que celle des
     cinq autres — 5 s contre 2,6 — et n'affiche pas de numero de passage : il
     n'y en a qu'un. C'est ce premier instant qui doit installer « ceci est le
     combat final », et une annonce de meme duree que les cinq precedentes
     aurait dit exactement l'inverse. La classe `final` porte le traitement
     d'apparition, comme pour la barre. */
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

/* --- chiffres de degats ------------------------------------------------------
   Elements DOM plafonnes a 40. Ils sont poses en POURCENTAGE du cadre, ce qui
   est la conversion monde -> ecran la moins chere : aucune lecture de la
   geometrie de la page, et la position reste juste quelle que soit la taille
   de la fenetre.

   Ils sortent de la timeline interpolee comme tout le reste — jamais de
   `latest`, sinon ils apparaissent 110 ms avant l'image qu'ils commentent. */
const DMG_MAX = 40;
let dmgCount = 0;

/* `icon` est une fonction de trace d'`icons.js`, jamais une image ni une chaine :
   le HUD ne sait pas dessiner, et `iconImg` met le rendu en cache par (glyphe,
   couleur, taille) — donc le trace n'est fait qu'une fois par provenance, pas
   une fois par chiffre. Elle ne sert qu'aux degats SUBIS : sur un chiffre
   inflige, la provenance est evidente (c'est nous), et un glyphe de plus a trois
   cents impacts par minute repeindrait l'ecran. */
/* `x`/`y` sont des coordonnees de VUE (lot I) : la conversion monde -> vue se
   fait chez l'appelant (`flushDamage`/`flushSelf`), qui connait la camera. Le
   HUD, lui, ne la connait pas — la boite de #dmgLayer fait exactement une vue,
   les pourcentages se rapportent donc a VIEW_W/H. */
export function hudDamage(x, y, val, kind = "deal", icon = null) {
  if (dmgCount >= DMG_MAX) return;
  // Hors du rectangle de vue : un chiffre pousse contre le bord mentirait sur
  // la position de l'impact — on le laisse tomber, l'impact est hors ecran.
  if (x < -20 || x > CFG.VIEW_W + 20 || y < -20 || y > CFG.VIEW_H + 20) return;
  const d = document.createElement("div");
  d.className = "dmg " + kind;
  if (icon) {
    // La couleur du glyphe est celle du texte : c'est la meme information, elle
    // ne peut pas etre de deux couleurs.
    d.appendChild(iconImg(icon, HUD.low, 12));
  }
  d.appendChild(document.createTextNode(
    kind === "heal" ? "+" + Math.round(val) : String(Math.round(val))));
  d.style.left = (x / CFG.VIEW_W * 100).toFixed(2) + "%";
  d.style.top = (y / CFG.VIEW_H * 100).toFixed(2) + "%";
  d.addEventListener("animationend", () => { d.remove(); dmgCount--; }, { once: true });
  el.dmg.appendChild(d);
  dmgCount++;
}

/* --- point d'entree ---------------------------------------------------------- */

export function updateHud(v, c) {
  const now = c.now;

  setText(el.clock, "clk", fmtTime(v.tm));

  /* Les eclats (lot I) vivent dans le bloc meta, pas dans le bloc personnel :
     c'est une monnaie d'EQUIPE versee a tous — chacun lit le meme montant. La
     ligne n'apparait qu'une fois le premier eclat gagne : avant le premier
     point de recolte, elle n'annoncerait qu'un zero. */
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

  // `updateSegment` a REMPLACE `updateWave` : le bandeau ne compte plus des
  // vagues, il dit ou l'on en est dans le script. Un seul appel, jamais les deux.
  updateSegment(v, c);
  setHidden(metaSlow, "mSlowH", !v.slow);

  updateBoss(v.boss);
  updateTeam(v, c);
  updateSelf(v, c);
  updateAlerts(c, now);
  updateAnnounce(v, c, now);

  setHidden(el.spectator, "spec", !c.amSpectator);

  if (c.perf) {
    setHidden(el.perf, "pfOn", false);
    /* Les APPELS DE DESSIN sont la mesure qui compte pour le batcher : un lot
       vide a chaque sprite donne des centaines d'appels pour exactement la meme
       image, et rien a l'ecran ne le dit. On en attend deux a quatre. */
    /* La seconde ligne est le diagnostic RESEAU, et c'est elle qu'on vient lire
       ici : `famine` compte les images ou le monde est fige faute d'instantane
       encadrant. Elle passe dans la meme chaine et le meme accesseur memoise —
       un second bloc d'affichage serait un second chemin a maintenir pour la
       meme information. Le retour a la ligne est rendu par `white-space`. */
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
