/* ===========================================================================
   HORLOGE DE RENDU — interpolation, files, alertes
   Le client dessine avec 110 ms de retard sur le dernier instantane. Tout ce
   qui commente une IMAGE passe par les files d'ici ; ce qui ne commente aucune
   image (salon, scores, pause) s'applique a la reception.
   =========================================================================== */

import { playSound } from "/audio.js";
import { STATUS_ICON, paintIcon } from "/icons.js";
import { ALERT_INFO, ALERT_ORDER, ALERT_WARN, mechAt } from "/shared/bosses.js";
import { CFG, weatherAt } from "/shared/game_state.js";
import { ENEMY } from "/shared/palette.js";
import { STATUSES, statusBit } from "/shared/statuses.js";
import { eventAt } from "/shared/timeline.js";
import { EMPTY_SET, INTERP_MS, PERF, PHASE_ROUND, bilanOpen, cardsState, difficulty, merchantState, pauseReal, phase, signalerErreur, snapshots } from "../core/state.js";
import { ctx } from "../render/stage.js";

/* --- diagnostic reseau (?perf) -----------------------------------------------------
   Les suspects du lag rapporte — gigue de diffusion, bande passante, pauses de
   ramasse-miettes, cout de rendu — produisent tous le MEME graphe CPU plat.
   Sans ces compteurs on ne peut pas dire lequel decroche.

   Le plus important est `famine` : il compte les images ou l'interpolation n'a
   plus de couple encadrant et retombe sur le dernier instantane recu, donc les
   images ou le monde est FIGE a l'ecran. C'est le symptome rapporte, mesure
   directement plutot que deduit.

   La condition de famine n'est pas « moins de deux instantanes de marge », comme
   on pourrait le lire dans le LISEZMOI : il suffit qu'UNE paire encadre
   `renderTime`, donc que l'ecart depuis le dernier recu depasse INTERP_MS. C'est
   cet ecart qu'on mesure, et rien d'autre — d'ou le seuil de `gapBig`. */
export const netPerf = {
  esp: [], gapBig: 0, famine: 0, remplissage: 0, resnap: 0, frameMax: 0,
  lastRecv: 0, since: 0, txt: "",
  /* Totaux de SESSION, jamais remis a zero. Les compteurs de fenetre se
     vident chaque seconde, ce qui exige de lire le bloc PENDANT la vague
     dense ; les totaux, eux, s'accumulent sur toutes les manches — une
     partie courte suffit, on lit les chiffres une fois mort, au bilan. */
  totGap: 0, totFamine: 0, totResnap: 0, maxGap: 0, maxFrame: 0,
  /* Vrai le temps d'une image apres un retour d'onglet. Voir netPerfFrame. */
  reveil: false,
};
/* TOUTE mesure de ce bloc est bornee a la MANCHE, et c'est la lecon d'un
   premier relevé faux : « famine 17636 · recal 1 · max gap 56953 ms ». Trois
   chiffres incoherents entre eux, donc trois fois la meme contamination.

   `interpolated()` est appelé hors du test de phase (il faut bien dessiner le
   sol sous le salon), et le serveur CESSE de diffuser pendant l'ecran de
   cartes, le bilan et le salon — par construction, ce n'est pas une panne.
   Chaque image passee hors manche comptait donc une famine : 17636 images a
   60 i/s font cinq minutes hors combat, ce que n'importe quelle session
   contient. Les 57 secondes de `max gap` etaient un salon, et l'image de
   2,2 s un onglet en arriere-plan.

   Le tell etait `recal 1` : une seule correction seche de prediction. Si le
   monde avait vraiment gele dix-sept mille fois, la prediction aurait derive
   a chaque fois et le compteur de recalage aurait suivi. Deux compteurs qui
   doivent bouger ensemble et qui divergent d'un facteur dix mille ne
   mesurent pas le meme phenomene — l'un des deux est faux.

   Le test ne peut PAS se reduire a `phase === PHASE_ROUND` : il n'y a que deux
   phases cote client, et l'ecran de cartes vit DANS la manche. Or le serveur
   cesse de simuler — donc de diffuser — pendant le choix de cartes, chez le
   marchand et pendant une pause reellement accordee. Ce sont trois silences
   NORMAUX, protocolaires, qu'aucun compteur de decrochage ne doit voir. Le
   bilan s'y ajoute : il s'ouvre avant que la phase ne retombe au salon. */
function netPerfLive() {
  return phase === PHASE_ROUND
    && !cardsState && !merchantState && !pauseReal && !bilanOpen;
}
/* Appele aux DEUX bords de manche. Sans ca l'ecart entre le dernier instantane
   d'une manche et le premier de la suivante — c'est-a-dire la duree du salon —
   entre dans les statistiques d'espacement comme s'il etait un decrochage
   reseau. C'est ce qui donnait un `max gap` de 57 secondes. */
export function netPerfBoundary() {
  netPerf.lastRecv = 0;
}
export function netPerfArrival(t) {
  if (!netPerfLive()) { netPerf.lastRecv = 0; return; }
  if (netPerf.lastRecv > 0) {
    const d = t - netPerf.lastRecv;
    netPerf.esp.push(d);
    if (d > netPerf.maxGap) netPerf.maxGap = d;
    // Au-dela d'INTERP_MS l'image gele par construction : ce compteur et
    // `famine` doivent bouger ensemble, sinon l'analyse est fausse.
    if (d > INTERP_MS) { netPerf.gapBig++; netPerf.totGap++; }
  }
  netPerf.lastRecv = t;
}
/* Un onglet en arriere-plan ne recoit plus d'images : `requestAnimationFrame`
   est bride a une par seconde, voire suspendu. La premiere image au retour
   porte donc toute la duree de l'absence — 2,2 s au premier relevé — et
   ecrasait `img max`, qui existe precisement pour distinguer une pause de
   ramasse-miettes (100 a 300 ms) d'une famine d'instantane. On saute cette
   image : sa duree ne dit rien du cout de rendu.

   Le drapeau est pose sur `visibilitychange` et non teste via `document.hidden`
   dans la boucle : au moment ou l'image longue est mesuree, l'onglet est DEJA
   redevenu visible, donc le test direct ne verrait jamais rien. */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) netPerf.reveil = true;
});
/* `raw` est la duree d'image NON plafonnee : `dt` est borne a 100 ms, ce qui
   masquerait exactement la pause longue qu'on cherche a distinguer d'une famine
   d'instantane. Une image de 300 ms avec des espacements d'arrivee normaux est un
   ramasse-miettes ; des images normales avec un monde fige est une famine. */
export function netPerfFrame(raw) {
  if (netPerf.reveil || document.hidden) {
    // La fenetre d'une seconde avance quand meme : sans ca, un onglet laisse en
    // arriere-plan figerait la ligne affichee sur des chiffres perimes.
    netPerf.reveil = false;
    netPerf.since += Math.min(raw, 1000);
  } else {
    if (raw > netPerf.frameMax) netPerf.frameMax = raw;
    if (raw > netPerf.maxFrame) netPerf.maxFrame = raw;
    netPerf.since += raw;
  }
  if (netPerf.since < 1000) return;
  netPerf.since = 0;

  const v = netPerf.esp;
  let min = 0, max = 0, moy = 0;
  if (v.length > 0) {
    min = Infinity; max = -Infinity;
    let sum = 0;
    for (const x of v) { if (x < min) min = x; if (x > max) max = x; sum += x; }
    moy = sum / v.length;
  }
  netPerf.txt = `arr n=${v.length} ${moy.toFixed(1)}/${min === Infinity ? 0 : min.toFixed(1)}`
    + `/${max === -Infinity ? 0 : max.toFixed(1)} ms`
    + ` · famine ${netPerf.famine} · >${INTERP_MS}ms ${netPerf.gapBig}`
    + ` · recal ${netPerf.resnap} · img max ${netPerf.frameMax.toFixed(0)} ms`
    + `\n· TOT famine ${netPerf.totFamine} · recal ${netPerf.totResnap}`
    + ` · >${INTERP_MS}ms ${netPerf.totGap} · max gap ${netPerf.maxGap.toFixed(0)}`
    + ` · img max ${netPerf.maxFrame.toFixed(0)} ms`;

  v.length = 0;
  netPerf.gapBig = 0;
  netPerf.famine = 0;
  netPerf.remplissage = 0;
  netPerf.resnap = 0;
  netPerf.frameMax = 0;
}
/* --- interpolation ----------------------------------------------------------------- */

export function interpolated(renderTime) {
  if (snapshots.length === 0) return null;
  if (snapshots.length === 1) return flatten(snapshots[0]);

  let a = null, b = null;
  for (let i = snapshots.length - 1; i > 0; i--) {
    if (snapshots[i - 1].recvAt <= renderTime && snapshots[i].recvAt >= renderTime) {
      a = snapshots[i - 1];
      b = snapshots[i];
      break;
    }
  }
  if (!a) {
    /* Deux causes passent par ici et elles ne disent PAS la meme chose.
       `renderTime` au-dela du plus recent : plus rien n'arrive, le monde est
       fige a l'ecran — c'est le defaut traque. `renderTime` avant le plus
       ancien : le tampon se remplit (entree en manche, reconnexion), c'est
       benin et transitoire. Les confondre ferait lire un demarrage normal
       comme une famine. */
    /* `netPerfLive` borne la mesure a la MANCHE : hors manche le serveur ne
       diffuse rien du tout, et compter ces images ferait de l'ecran de cartes
       la principale source de famine du jeu — c'etait le cas. */
    if (PERF && netPerfLive()) {
      if (renderTime > snapshots[snapshots.length - 1].recvAt) {
        netPerf.famine++;
        netPerf.totFamine++;
      } else netPerf.remplissage++;
    }
    return flatten(snapshots[snapshots.length - 1]);
  }

  const span = b.recvAt - a.recvAt;
  const k = span > 0 ? (renderTime - a.recvAt) / span : 0;

  const lerpMap = (ma, mb) => {
    const out = [];
    for (const [id, ea] of ma) {
      const eb = mb.get(id);
      out.push(eb
        ? { ...ea, x: ea.x + (eb.x - ea.x) * k, y: ea.y + (eb.y - ea.y) * k,
            aimX: ea.aimX + (eb.aimX - ea.aimX) * k, aimY: ea.aimY + (eb.aimY - ea.aimY) * k }
        : ea);
    }
    return out;
  };

  const lerpBoss = (ea, eb) => {
    if (!ea || !eb || ea.id !== eb.id) return eb;
    return { ...eb, x: ea.x + (eb.x - ea.x) * k, y: ea.y + (eb.y - ea.y) * k };
  };
  const boss = lerpBoss(a.boss, b.boss);
  const boss2 = lerpBoss(a.boss2, b.boss2);

  /* Les marqueurs suivent leur porteur ou glissent (sanctuaires) : ils sont
     donc interpoles comme des entites et non pris tels quels comme les zones.
     Un cercle de regroupement qui saute de 4 px vingt fois par seconde est
     exactement l'element qu'on regarde le plus pendant une mecanique.
     Le rempart, qui suit son tank depuis le lot A, a exactement le meme besoin :
     d'ou une fonction et non deux blocs recopies. Les listes indexees par
     identifiant passent par ici, les Map par `lerpMap` — c'est la seule
     difference entre les deux. */
  const lerpList = (la, lb) => {
    const prev = new Map((la ?? []).map(o => [o.id, o]));
    return (lb ?? []).map(o => {
      const p0 = prev.get(o.id);
      return p0 ? { ...o, x: p0.x + (o.x - p0.x) * k, y: p0.y + (o.y - p0.y) * k } : o;
    });
  };
  const marks = lerpList(a.marks, b.marks);

  return {
    tm: a.tm + (b.tm - a.tm) * k,
    over: b.over,
    kills: b.kills,
    slow: b.slow,
    playerList: lerpMap(a.players, b.players),
    enemyList: lerpMap(a.enemies, b.enemies),
    bulletList: lerpMap(a.bullets, b.bullets),
    shotList: lerpMap(a.shots, b.shots),
    droneList: lerpMap(a.drones, b.drones),
    bombList: lerpMap(a.bombs ?? new Map(), b.bombs ?? new Map()),
    zones: b.zones,
    powerups: b.powerups,
    turrets: b.turrets,
    /* Le rempart SUIT son tank depuis le lot A : il est donc interpole comme un
       marqueur et non pris tel quel comme une zone. Un disque de 6,5 m de rayon
       qui saute vingt fois par seconde sous les pieds du joueur est exactement
       l'element qu'on regarde le plus quand on tient une position — et il
       decrochait visiblement du personnage, qui est lui predit a l'image.
       Le rempart ANCRE traverse la meme fonction sans y perdre : sa position ne
       change pas d'un instantane a l'autre, l'interpolation est l'identite. */
    bulwarks: lerpList(a.bulwarks, b.bulwarks),
    // Ancres et sanctuaires : POSES au sol, leur position ne change jamais —
    // l'interpolation serait l'identite, on prend le snapshot le plus recent.
    anchors: b.anchors,
    sancts: b.sancts,
    // Points de recolte : immobiles eux aussi, snapshot le plus recent.
    harvests: b.harvests ?? [],
    effects: b.effects,
    boss, boss2, marks, slip: b.slip,
    // Limites et murs : des paliers, pas des positions. Interpoler une arene qui
    // se referme donnerait une limite a mi-chemin, c'est-a-dire une limite qui
    // ment sur l'endroit exact ou l'on prend des degats.
    bounds: b.bounds, walls: b.walls,
    // Couverture entamee : un etat, comme les murs. Le plus recent fait foi.
    cover: b.cover,
    // Etat de segment : pris tel quel sur le snapshot le plus recent, jamais
    // interpole. Ce sont des paliers, pas des positions — un numero de segment
    // a mi-chemin entre 3 et 4 n'aurait aucun sens. Le temps restant, lui,
    // pourrait s'interpoler ; il ne le vaut pas, la barre a deja sa transition
    // CSS et le HUD n'ecrit que si la valeur a change.
    segment: b.segment, hordeLeft: b.hordeLeft, beat: b.beat,
    teamLevel: b.teamLevel, teamProgress: b.teamProgress,
    // Difficulte et anticipations : des ETATS, jamais des positions. Un ennemi
    // a moitie en train de se ramasser n'existe pas.
    diff: b.diff, windup: b.windup,
    // Evenement : un ETAT et un compte a rebours, jamais interpole — un
    // evenement a moitie ouvert n'existe pas.
    event: b.event,
  };
}
export function flatten(s) {
  return {
    tm: s.tm, over: s.over, kills: s.kills, slow: s.slow,
    playerList: [...s.players.values()],
    enemyList: [...s.enemies.values()],
    bulletList: [...s.bullets.values()],
    shotList: [...s.shots.values()],
    droneList: [...s.drones.values()],
    bombList: [...(s.bombs?.values() ?? [])],
    zones: s.zones,
    powerups: s.powerups,
    turrets: s.turrets,
    bulwarks: s.bulwarks ?? [],
    anchors: s.anchors ?? [],
    sancts: s.sancts ?? [],
    harvests: s.harvests ?? [],
    effects: s.effects,
    boss: s.boss,
    boss2: s.boss2 ?? null,
    marks: s.marks ?? [],
    slip: s.slip ?? false,
    bounds: s.bounds ?? { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H, warn: 0 },
    walls: s.walls ?? null,
    cover: s.cover ?? null,
    segment: s.segment, hordeLeft: s.hordeLeft, beat: s.beat,
    teamLevel: s.teamLevel, teamProgress: s.teamProgress,
    diff: s.diff ?? difficulty, windup: s.windup ?? EMPTY_SET,
    event: s.event ?? null,
  };
}
/* --- rendu -------------------------------------------------------------------------- */

export const ENEMY_TINT = ENEMY.TINT;
// Pose l'icone d'un etat, centree, dans la couleur de l'etat.
export function paintStatusIcon(id, x, y, scale, opacite = 1) {
  const def = STATUSES[id];
  if (!def) return;
  paintIcon(ctx, STATUS_ICON[id], def.couleur, x, y, scale, opacite);
}
// Liste des etats actifs d'un joueur, dans l'ordre de la table.
export function activeStatuses(p) {
  const out = [];
  for (const s of STATUSES) if (p.statuses & statusBit(s.id)) out.push(s.id);
  return out;
}
// Pose l'icone d'un bonus, centree sur (x, y), a l'echelle demandee.
export function paintPowerupIcon(st, x, y, scale, opacite = 1) {
  paintIcon(ctx, st.icon, st.color, x, y, scale, opacite);
}
export let bossAnnounce = 0;      // horodatage de l'arrivee du dernier boss
export let lastBossId = 0;
export let phaseAnnounce = 0;     // horodatage de la derniere barre brisee
export let lastBossPhase = 0;
/* Bandeau d'alerte, TROIS niveaux. UNE consigne a la fois, la derniere recue :
   deux consignes empilees pendant qu'on esquive ne se lisent pas, et la plus
   recente est toujours celle qui compte. Chaque niveau a sa propre ligne pour
   qu'une information ne chasse jamais une consigne.

     consigne      cyan,  gros, avec compte a rebours
     avertissement ambre, court, sans compte a rebours
     information   blanc, discret, sans urgence

   Le cyan de la consigne n'est pas decoratif : c'est la couleur qui, dans
   toute la grammaire de marqueurs, veut dire « ceci te concerne, place-toi ».
   L'ambre reste au danger, le blanc a ce qui ne demande rien. */
export let alertOrder = null;     // { texte, nom, from, until }
export let alertWarn = null;
export let alertInfo = null;
/* Fenetre d'anticipation du CORPS du boss, distincte du bandeau. { from, impact }
   ou null — consommee par `bossPose`, plus bas.

   Deux horloges et pas une, parce que les deux regles se contredisent : le
   bandeau DISPARAIT 250 ms AVANT la resolution (un texte encore affiche masque
   ce qu'il faut regarder), alors que le corps doit rester ramasse jusqu'au coup
   et se detendre DESSUS. Deduire la posture de la duree du bandeau, comme on le
   faisait, detendait donc le boss un quart de seconde avant de frapper —
   l'anticipation retombait a plat et rien ne marquait l'impact. */
export let bossCue = null;
/* Les alertes arrivent hors du snapshot, donc SANS le retard d'interpolation :
   affichees a la reception, le bandeau precedait de 110 ms le telegraphe qu'il
   commente. On les met en file et on les sort sur l'horloge de rendu, comme
   les evenements — meme raison, meme horloge. */
export const alertQueue = [];
/* MEME PIEGE, MEME REMEDE, pour les transitions de manche. Le serveur envoie
   `cards` a l'instant ou il constate l'arene vide ; le client, lui, dessine
   encore l'etat d'il y a 110 ms — ou deux ou trois ennemis vivent toujours.
   L'ecran de choix s'ouvrait donc PAR-DESSUS des ennemis visibles, et de facon
   irreguliere : ca ne se voit que si les derniers meurent groupes.
   Une file unique plutot qu'un `setTimeout` par message : l'ordre d'arrivee est
   preserve (`cardsWait` derriere son `cards`, `roundEnd` derriere son dernier
   `cards`) et il n'y a aucun minuteur disperse a annuler.
   REGLE : tout message ponctuel qui decrit un changement du MONDE se consomme
   ici. Les messages hors-monde — salon, choix de classe, tableau des scores,
   pause — s'appliquent a la reception : ils ne commentent aucune image. */
export const worldQueue = [];
/* Une seule fermeture d'ecran de transition en file a la fois — il arrive
   vingt instantanes par seconde, et sans ce drapeau on en empilerait autant.
   Il couvre les DEUX ecrans (cartes et marchand) : c'est le meme evenement de
   reprise qui les ferme, et deux drapeaux auraient laisse passer le cas ou les
   deux se suivent. */
export let screenCloseQueued = false;
export function pushWorld(fn) {
  worldQueue.push({ fn, at: performance.now() + INTERP_MS });
}
/* Jamais vide par `resetFeedback` : les transitions APPELLENT `resetFeedback`,
   une file videe depuis son propre element courant se perdrait elle-meme.

   CHAQUE CALLBACK EST ISOLE, et ce n'est pas de la prudence gratuite : cette
   file porte l'ouverture de l'ecran de cartes, celle du marchand, le bilan et
   la fin de manche — c'est-a-dire tout ce qui CHANGE D'ECRAN. Elle est videe
   depuis `frame()`, en amont du `requestAnimationFrame` qui reamorce la boucle :
   une seule exception dans une transition tuait donc la boucle de rendu POUR DE
   BON, et le symptome n'etait pas une erreur visible mais « l'ecran de cartes
   n'apparait pas — et la pause non plus », puisque plus rien ne se redessinait
   ensuite. Un defaut passager devenait une panne definitive.

   Isole, le pire cas redevient ce qu'il devrait etre : une transition ratee,
   signalee au serveur, et le jeu continue. */
export function flushWorld(now) {
  while (worldQueue.length > 0 && worldQueue[0].at <= now) {
    const item = worldQueue.shift();
    try {
      item.fn();
    } catch (err) {
      signalerErreur("transition", err?.message ?? String(err), err?.stack);
    }
  }
}
export function pushAlert(msg) {
  alertQueue.push({ msg, at: performance.now() + INTERP_MS });
}
export function flushAlerts(now) {
  while (alertQueue.length > 0 && alertQueue[0].at <= now) {
    applyAlert(alertQueue.shift().msg, now);
  }
}
function applyAlert(msg, now) {
  /* Identite du boss : evenement PONCTUEL, il declenche l'annonce plein ecran.
     Le rendu la declenche aussi sur changement d'identifiant dans le snapshot —
     les deux chemins se recouvrent volontairement, un joueur qui rejoint en
     cours de combat n'a jamais recu le message et doit quand meme voir a qui il
     a affaire. */
  if (msg.boss !== undefined) {
    bossAnnounce = now;
    lastBossPhase = 0;
    alertOrder = null;
    alertWarn = null;
    alertInfo = null;
    bossCue = null;
    return;
  }
  /* ANNONCE D'EVENEMENT (lot U). Elle emprunte exactement le meme chemin qu'une
     mecanique de boss — meme file, meme horloge de rendu, meme retrait de 250 ms
     avant la resolution — parce que c'est la meme chose du point de vue du
     joueur : quelque chose est annonce, puis arrive. Seule la table consultee
     change, et c'est pour ca que `MECHS` n'a pas recu d'entree d'evenement :
     deux tables, un seul chemin. */
  /* ANNONCE DE METEO (lot V). Troisieme table consultee par le meme chemin,
     apres les mecaniques et les evenements — deux tables, puis trois, mais
     TOUJOURS un seul chemin d'annonce : meme file, meme horloge de rendu, meme
     retrait avant resolution. C'est ce qui a evite d'ouvrir un message reseau de
     plus a chaque fois. */
  const def = msg.meteo !== undefined ? weatherAt(msg.meteo)
    : msg.event !== undefined ? eventAt(msg.event) : mechAt(msg.mech);
  if (!def) return;
  // La meteo n'a pas de niveau d'alerte dans sa table : elle est TOUJOURS une
  // information. Elle ne precede aucun coup — elle dure un segment entier.
  const level = msg.meteo !== undefined ? ALERT_INFO : def.level;
  /* Le bandeau DISPARAIT AVANT la resolution, et non une seconde apres comme
     il le faisait : un texte encore affiche au moment de l'impact masque
     exactement ce qu'il faut regarder, c'est-a-dire la zone qui explose. Les
     annonces sans duree (Miasme, ultime) tiennent 1,5 s. */
  const dur = msg.dur > 0 ? Math.max(800, msg.dur * 1000 - 250) : 1500;
  const entry = { nom: def.nom, texte: def.texte, from: now, until: now + dur };
  if (level === ALERT_ORDER) alertOrder = entry;
  else if (level === ALERT_WARN) alertWarn = entry;
  else alertInfo = entry;
  /* La meteo emprunte le son d'evenement, jamais un son a elle. Elle occupe
     exactement la meme place dans la vie du joueur — quelque chose d'annonce qui
     commence et qui dure — et une entree de plus dans `PALETTE` n'aurait dit
     qu'une chose que le bandeau dit deja. `haut` est faux : c'est une
     information, pas une consigne. */
  if (msg.meteo !== undefined) { playSound("evenement", { haut: false }); return; }
  /* La posture du corps se cale sur la RESOLUTION, pas sur le bandeau : d'ou la
     duree brute et non celle, amputee de 250 ms, du texte. Seules la consigne et
     l'avertissement en posent une — une information ne precede aucun coup, et
     faire se ramasser le boss dessus mentirait sur ce qui arrive. */
  /* Le boss ne se ramasse QUE pour ses propres annonces. Un evenement de horde
     n'est pas un coup qu'il prepare : lui faire prendre la posture d'anticipation
     sur une nuee mentirait sur ce qui arrive, et c'est exactement pour ca que la
     posture est calee sur la resolution et pas sur le bandeau. */
  if (msg.event !== undefined) {
    playSound("evenement", { haut: def.level === ALERT_ORDER });
    return;
  }
  if (def.level === ALERT_ORDER || def.level === ALERT_WARN) {
    bossCue = { from: now, impact: now + (msg.dur > 0 ? msg.dur * 1000 : 1500) };
  }
}

/* Setters. Une liaison de module ES est VIVANTE en lecture — l'importateur
   voit toujours la valeur courante — mais elle est en lecture seule. Ecrire
   depuis un autre module demande donc de passer par ici, et par rien d'autre.
   C'est ce qui rend l'ecriture de cet etat cherchable en un grep. */
export function setAlertInfo(v) { alertInfo = v; }
export function setAlertOrder(v) { alertOrder = v; }
export function setAlertWarn(v) { alertWarn = v; }
export function setBossAnnounce(v) { bossAnnounce = v; }
export function setBossCue(v) { bossCue = v; }
export function setLastBossId(v) { lastBossId = v; }
export function setLastBossPhase(v) { lastBossPhase = v; }
export function setPhaseAnnounce(v) { phaseAnnounce = v; }
export function setScreenCloseQueued(v) { screenCloseQueued = v; }
