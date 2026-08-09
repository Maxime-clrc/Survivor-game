/* ===========================================================================
   RECEPTION DES INSTANTANES
   Les instantanes sont des tableaux POSITIONNELS : on ajoute des champs a la
   fin, jamais au milieu, et on les lit avec une valeur de repli.
   =========================================================================== */

import { CLASS_DEFAULT } from "/shared/classes.js";
import { CFG } from "/shared/game_state.js";
import { EMPTY_SET, PERF, SNAP_THRESHOLD, bombReadyAt, bombStockSeen, dash, difficulty, lastSnapAt, latest, myId, phase, ping, predicted, setBombReadyAt, setBombStockSeen, setLastSnapAt, setLatest, setPing, setPredicted, snapshots } from "../core/state.js";
import { netPerf, netPerfArrival } from "./interp.js";
import { deaths } from "../render/fx.js";
import { buildPaintedAt, renderBuild, setBuildPaintedAt } from "../ui/build.js";
import { buildEl } from "../ui/dom.js";

/* --- reception des snapshots --------------------------------------------------- */

export function ingest(msg) {
  const now = performance.now();
  if (lastSnapAt) setPing(Math.round(now - lastSnapAt));
  setLastSnapAt(now);

  const snap = {
    recvAt: now,
    tm: msg.tm,
    over: msg.ov === 1,
    kills: msg.k,
    slow: msg.sl === 1,
    players: new Map(msg.p.map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], hp: a[3], downed: a[4] === 1,
      revive: a[5], aimX: a[6], aimY: a[7], kills: a[8],
      buffs: a[9], score: a[10], deaths: a[11], shield: a[12],
      level: a[13] ?? 1, maxHp: a[14] ?? CFG.PLAYER_MAX_HP, prog: a[15] ?? 0,
      dashCd: a[16] ?? 0, dashing: a[17] === 1,
      // ajouts recents, repli a 0 : un onglet reste sur une version anterieure
      // du client continue de lire un tableau plus court sans planter.
      orbiters: a[18] ?? 0, frostRadius: a[19] ?? 0,
      // Classe et competences. Repli sur la classe par defaut : un serveur
      // anterieur n'envoie pas le champ, et le client doit alors dessiner un
      // joueur ordinaire plutot que de planter sur un index inconnu.
      cls: a[20] ?? CLASS_DEFAULT, cd1: a[21] ?? 0, cd2: a[22] ?? 0,
      skillFlags: a[23] ?? 0, bombStock: a[24] ?? 0,
      // Etats. Le masque suffit pour les icones et les halos ; seuls les cumuls
      // de Vulnerabilite et le decompte de Sentence valent un nombre a eux, le
      // second parce que le decompte EST l'information.
      statuses: a[25] ?? 0, vuln: a[26] ?? 0, doom: a[27] ?? 0,
      // Degats cumules, pour la fenetre de build ouverte en jeu. Repli a 0 : un
      // serveur anterieur ne l'envoie pas, la fenetre affiche alors zero plutot
      // que de planter.
      damage: a[28] ?? 0,
      // Provenance du dernier degat encaisse. Repli sur le contact, qui est le
      // cas majoritaire : un serveur anterieur au lot ne l'envoie pas, et le
      // chiffre rouge porte alors l'icone la plus probable au lieu d'aucune.
      src: a[29] ?? 0,
      // Troisieme competence (lot C) : recharge et palier possede. Repli a 0 —
      // un serveur anterieur n'envoie rien, la pastille reste alors grisee,
      // qui est exactement l'etat « pas de carte ».
      cd3: a[30] ?? 0, skill3: a[31] ?? 0,
      // Eclats (lot I) : la monnaie de manche. Repli 0 — serveur anterieur.
      eclats: a[32] ?? 0,
    }])),
    /* Le champ de type porte deux informations pour n'en couter qu'une seule
       sur chacun des 200 ennemis, vingt fois par seconde : le type et le rang
       d'elite (+100). Le marquage de retardataire (+200) a disparu avec les
       vagues — il n'existait que pour rendre traquables les derniers fuyards
       d'un nettoyage. Un serveur anterieur au lot P peut encore l'envoyer :
       le modulo le decode alors comme le type, ce qui serait faux, d'ou le
       `% 100` applique aussi a l'elite. */
    enemies: new Map(msg.e.map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], hp: a[3], maxHp: a[4],
      type: a[5] % 100, elite: a[5] % 200 >= 100, ang: a[6],
      // Compteur de touches, ajout en fin de tuple. Repli a 0 : un serveur
      // anterieur ne l'envoie pas, le compteur reste constant, et le module
      // d'evenements retombe alors sur l'ancien comportement — un flash par
      // variation de PV.
      hitSeq: a[7] ?? 0,
      // Cible du lien de soin du medic (lot M), neuvieme element coupe quand
      // nul : seuls les medics en train de soigner le paient.
      healTarget: a[8] ?? 0,
    }])),
    /* `heal` en fin de tuple : le projectile du mode soin se dessine dans une
       autre couleur, c'est le seul moyen pour la table de voir d'un coup d'oeil
       que le soigneur a bascule.
       `owner` est l'ajout du lot A, en fin de tuple comme toujours : la balle
       prend la couleur de son tireur. Repli 0 — aucun joueur ne porte cet
       identifiant, `colorOf` retombe alors sur la premiere couleur, et un
       onglet reste sur une version anterieure du serveur dessine donc un tir
       uniforme au lieu de planter. */
    bullets: new Map(msg.b.map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], heal: a[3] ?? 0, owner: a[4] ?? 0,
    }])),
    shots: new Map(msg.s.map(a => [a[0], { id: a[0], x: a[1], y: a[2] }])),
    /* `spread`, `life` et `prox` sont des ajouts en fin de tuple : un serveur
       anterieur au lot 5 n'envoie rien, les replis a 0 font alors dessiner les
       formes connues et rien d'autre. `life > 0` est ce qui distingue une zone
       PERSISTANTE d'une detonation — c'est la seule information dont le rendu a
       besoin pour changer de langage visuel. */
    zones: msg.z.map(a => ({
      id: a[0], x: a[1], y: a[2], r: a[3], warn: a[4], blast: a[5],
      shape: a[6] ?? 0, w: a[7] ?? 0, h: a[8] ?? 0, ang: a[9] ?? 0,
      hole: a[10] ?? 0, warn0: a[11] || CFG.ZONE_WARN,
      spread: a[12] ?? 0, life: a[13] ?? 0, prox: a[14] ?? 0,
    })),
    /* Arene mobile. Cles absentes tant que rien ne bouge : le repli est l'arene
       pleine, ce qui est aussi ce que lit un onglet reste sur une version
       anterieure — il joue alors sans voir la couronne, degrade mais jamais
       menteur sur la position des entites. */
    bounds: msg.bn
      ? { x0: msg.bn[0], y0: msg.bn[1], x1: msg.bn[2], y1: msg.bn[3],
          nx0: msg.bn[4], ny0: msg.bn[5], nx1: msg.bn[6], ny1: msg.bn[7],
          warn: msg.bn[8] }
      : { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H, warn: 0 },
    walls: msg.wl
      ? { x: msg.wl[0], y: msg.wl[1], t: msg.wl[2], k: msg.wl[3] }
      : null,
    /* COUVERTURE ENTAMEE (lot V) : la seule chose du biome qui circule, parce
       qu'elle depend de ce que les joueurs ont fait et ne se deduit d'aucune
       horloge. Liste creuse (index, part de PV), absente tant que rien n'a ete
       touche. Elle n'est PAS interpolee : c'est un etat, pas une position. */
    cover: msg.ob ?? null,
    powerups: msg.w.map(a => ({ id: a[0], x: a[1], y: a[2], type: a[3] })),
    // Points de recolte (lot I) : cle nommee, absente d'un serveur anterieur —
    // le repli est la liste vide. `k` est la jauge (PV du cristal, progression
    // de l'amas), deja en ratio.
    harvests: (msg.hv ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], kind: a[3], k: a[4] ?? 1 })),
    turrets: (msg.tu ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], k: a[3], ang: a[4] })),
    bulwarks: (msg.bw ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], r: a[3], k: a[4] })),
    // Ancres et sanctuaires (lot C) : cles nommees, absentes d'un serveur
    // anterieur — le repli est la liste vide, rien a dessiner.
    anchors: (msg.an ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], r: a[3], k: a[4], vuln: a[5] ?? 0 })),
    sancts: (msg.sa ?? []).map(a => ({ id: a[0], x: a[1], y: a[2], r: a[3], k: a[4] })),
    // `tx`/`ty` : le point de chute annonce, ajout en fin de tuple. Repli sur la
    // position courante — un serveur anterieur au lot ne l'envoie pas, et le
    // cercle d'atterrissage se colle alors a la bombe au lieu de mentir.
    bombs: new Map((msg.bm ?? []).map(a => [a[0], {
      id: a[0], x: a[1], y: a[2], k: a[3], tx: a[4] ?? a[1], ty: a[5] ?? a[2],
    }])),
    // drones : entites mobiles comme les balles, on les garde en Map pour
    // pouvoir les interpoler pareil (lerpMap) entre deux snapshots. `owner`
    // est un ajout recent en fin de tuple, repli 0 (aucun joueur connu sous
    // cet id) pour qu'un onglet reste sur une version anterieure du serveur
    // continue de lire un tuple plus court sans planter.
    drones: new Map((msg.dr ?? []).map(a => [a[0], { id: a[0], x: a[1], y: a[2], ang: a[3], kind: a[4], owner: a[5] ?? 0 }])),
    effects: (msg.f ?? []).map(a => ({
      id: a[0], x: a[1], y: a[2], r: a[3], k: a[4], kind: a[5] ?? 0,
      x2: a[6], y2: a[7],
    })),
    boss: msg.bo
      ? { id: msg.bo[0], x: msg.bo[1], y: msg.bo[2], hp: msg.bo[3],
          maxHp: msg.bo[4], ang: msg.bo[5], index: msg.bo[6],
          bars: msg.bo[7] ?? 1, phase: msg.bo[8] ?? 0,
          // Ajouts en fin de tuple : l'index du roster et la jauge d'ultime.
          // Repli sur le Ravageur, qui est le boss d'origine — un serveur
          // anterieur au lot 4 n'en envoyait pas d'autre.
          kind: msg.bo[9] ?? 0, ult: msg.bo[10] ?? 0,
          // Palier d'enrage, ajout en fin de tuple. Repli 0 : un serveur
          // anterieur au lot n'en envoie pas et la barre reste normale.
          enrage: msg.bo[11] ?? 0,
          // Degats mis de cote par le plancher de barre, ajout en fin de tuple.
          // Repli 0 : un serveur anterieur n'en envoie pas, la barre se dessine
          // alors comme avant — figee, mais sans mentir davantage.
          bank: msg.bo[12] ?? 0 }
      : null,
    // Second Jumeau : cle nommee, absente pour les quatre autres boss.
    boss2: msg.bo2
      ? { id: msg.bo2[0], x: msg.bo2[1], y: msg.bo2[2], ang: msg.bo2[3] }
      : null,
    /* Degats portes au boss depuis l'instantane precedent, par joueur. Cle
       nommee et absente hors combat ; le module d'evenements n'y lit que la
       ligne du joueur local. */
    bossDmg: msg.bd ?? null,
    // Marqueurs de mecanique de groupe. `hp` est un ratio : le client n'affiche
    // qu'une jauge, la valeur brute d'une cage ne lui apprendrait rien.
    marks: (msg.mk ?? []).map(a => ({
      id: a[0], x: a[1], y: a[2], r: a[3], k: a[4], mech: a[5],
      a: a[6], b: a[7], need: a[8], cur: a[9], hp: a[10],
    })),
    slip: msg.sp === 1,
    /* Segment et progression commune. Cles nommees : un serveur anterieur qui
       ne les envoie pas laisse simplement les replis en place — le bandeau
       reste alors cache, ce qui est degrade mais jamais menteur.
       La SATURATION n'est pas ici : elle se deduit de la liste d'ennemis. */
    segment: msg.sg ? msg.sg[0] : 0,
    hordeLeft: msg.sg ? msg.sg[1] : 0,
    beat: msg.sg ? msg.sg[2] : 0,
    teamLevel: msg.xl ?? 1,
    teamProgress: msg.xp ?? 0,
    /* Difficulte de la manche EN COURS. Elle est deja connue par le salon, mais
       c'est celle du snapshot qui fait foi pour deduire les traits : un
       spectateur arrive en cours de manche a la valeur du vote suivant, pas
       celle du combat qu'il regarde. */
    diff: msg.df ?? difficulty,
    /* ENNEMIS EN ANTICIPATION. Un Set et non un tableau : `drawEnemies` le
       consulte une fois par ennemi, soit deux cents fois par image. Cle absente
       la plupart du temps — un Set vide coute une allocation par instantane, pas
       par image. */
    windup: msg.wu ? new Set(msg.wu) : EMPTY_SET,
    /* EVENEMENT ACTIF (lot U). Cle nommée, absente hors événement — un serveur
       antérieur n'en envoie pas et le bandeau reste simplement caché. */
    event: msg.ev ? { id: msg.ev[0], t: msg.ev[1] } : null,
  };

  setLatest(snap);
  snapshots.push(snap);
  while (snapshots.length > 40) snapshots.shift();
  if (PERF) netPerfArrival(now);

  /* La fenetre de build reste VIVANTE quand elle est ouverte en jeu : les
     degats et les kills montent pendant qu'on la lit. Deux fois par seconde et
     non a chaque instantane — repeindre une liste de quinze cartes vingt fois
     par seconde ferait recalculer la mise en page pour rien, exactement le cout
     que le HUD est venu chercher en memorisant ses valeurs. */
  if (!buildEl.hidden && now - buildPaintedAt > 500) {
    setBuildPaintedAt(now);
    renderBuild();
  }

  const me = snap.players.get(myId);
  /* Fin de recharge de la bombe. On la detecte sur la RESERVE et non sur `cd1`,
     qui vaut deja zero quand il reste une charge sous le coude : c'est le
     passage d'une charge de plus qui rend le lancer possible. L'anneau de
     portee ne s'affiche que dans la foulee (voir drawBombRange) — permanent, il
     serait un cercle de plus a l'ecran a cent ennemis, et il ne dit rien tant
     qu'on n'a pas de bombe a lancer. */
  if (me) {
    const stock = me.bombStock ?? 0;
    if (stock > bombStockSeen) setBombReadyAt(performance.now());
    setBombStockSeen(stock);
  } else {
    setBombStockSeen(0);
  }

  if (me) {
    // Pendant une esquive, l'ecart avec le serveur depasse volontairement le
    // seuil de recalage : recaler la ferait avorter a mi-course.
    const dashing = dash.t > 0 || me.dashing;
    const loin = !!predicted && !dashing
      && Math.hypot(me.x - predicted.x, me.y - predicted.y) > SNAP_THRESHOLD;
    if (!predicted || me.downed || loin) {
      // Le recalage SEC est le second symptome rapporte : il doit correler avec
      // le compteur de famine, une image figee laissant la prediction deriver.
      if (PERF && loin) { netPerf.resnap++; netPerf.totResnap++; }
      setPredicted({ x: me.x, y: me.y });
    }
  } else {
    setPredicted(null);
  }
}
