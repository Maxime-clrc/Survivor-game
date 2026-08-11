/* ===========================================================================
   LE HUB : registre des salles, comptes, progression — SEUL A ECRIRE.
   Un seul processus, salles en memoire (infra-salons.md § 1) : la progression
   permanente vit en memoire avec Supabase pour seule persistance, et deux
   processus tiendraient chacun leur copie du meme compte — celle du salon A
   ecraserait celle du salon B. Le verrouillage distribue qu'il faudrait pour
   s'en sortir coute plus que le gain CPU (mesure : ~5 % d'un coeur par salle
   au pire cas).

   Le hub recoit chaque connexion, authentifie (pseudo + cle), sert la liste
   des salles, cree et detruit les salles, et route les messages : un client
   est en etat HUB (liste des salles) ou en etat SALLE (comportement d'avant).
   Un message de jeu recu en etat hub est rejete — c'est exactement le type de
   message qu'un client modifie enverrait.

   La persistance ne bouge pas de mecanisme : les salles EMETTENT (awardRun,
   awardPartial), le hub ecrit. Avec plusieurs salles la frequence d'ecriture
   monte, d'ou le REGROUPEMENT : les save() s'accumulent sur une courte
   fenetre et partent en une fois — `data` est mute en place, le flush de
   SIGTERM couvre donc aussi ce qui attendait la fenetre.
   =========================================================================== */

import { readFileSync } from "node:fs";

import { CFG, PLAYER_COLORS, DIFF_NORMAL, DIFFICULTIES } from "./shared/game_state.js";
import { CLASSES, SKILL_CFG } from "./shared/classes.js";
import { PROG_CFG, TREES, slotsFor, tierCost, coresForRun, coresPartial, recordFinal } from "./shared/progression.js";
import { PASS_MIN, PASS_MAX } from "./progress_store.js";
import { VERSION } from "./shared/version.js";
import { Room, ROOM_MAX_PLAYERS, PHASE_LOBBY, PHASE_ROUND } from "./room.js";
/* `nowMs` est importe sous un autre nom : `tick()` declare deja un
   `const nowMs = Date.now()` local, qui shadowerait l'import sur toute la
   fonction et le ferait echouer en zone morte temporelle. */
import { PERF_ON, PERF_REPORT_S, Sampler, nowMs as perfNow, f1 } from "./perf.js";

/* Surchargeables par l'environnement POUR LES TESTS uniquement (un delai de
   grace de 60 s rendrait le test de destruction interminable) — en production
   ces valeurs sont celles de la spec, on ne les regle pas. */
const ROOM_GRACE_MS = Number(process.env.ROOM_GRACE_MS) || 60000;
const ROOM_MAX = Number(process.env.ROOM_MAX) || 16;

/* Le port est desormais public (VPS) : quelques connexions par adresse
   suffisent a une table de quatre, et ca evite qu'un scan automatise remplisse
   le serveur de sockets mortes. */
const IP_CONN_MAX = 8;
const LIST_MIN_MS = 1000;   // une demande de liste par seconde et par client

/* Numero de version affiche sur l'ecran de connexion. Il est LU dans
   package.json et non recopie ici : deux litteraux divergent au premier
   `npm version`, et un numero faux sur un ecran de depannage est pire que pas
   de numero du tout. Lecture unique au chargement du module — le fichier ne
   change pas en cours d'execution — et repli silencieux : le jeu doit
   demarrer meme lance depuis une arborescence incomplete. */
const BUILD = (() => {
  try {
    return JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version || "";
  } catch {
    return "";
  }
})();

/* Frein par PSEUDO CIBLE, en plus des cinq essais par connexion : depuis que
   se reconnecter est gratuit (plus de place de partie a occuper), le frein
   par connexion seul se contourne en rouvrant une socket. Cinq echecs sur un
   pseudo gelent ce pseudo dix secondes — et le gel se teste AVANT scrypt,
   c'est aussi ce qui borne le cout CPU d'une rafale. */
const PSEUDO_FAILS_MAX = 5;
const PSEUDO_FREEZE_MS = 10000;

/* Code de salle : quatre caracteres sans ambiguite (pas de O/0, I/1/l). Il
   identifie la salle dans le protocole ; la LISTE publique est le moyen normal
   de la trouver, le code n'a pas besoin d'etre secret ni memorisable. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/* `commit` : hash court du commit, resolu au boot par `server.js`. Chaine vide
   quand il n'a pas pu l'etre (archive sans .git, git absent) — le hub n'a alors
   rien a dire, et la cle ne part pas. */
export function createHub(store, log, commit = "") {
  const clients = new Map();          // id -> client (toutes connexions, authentifiees ou non)
  const rooms = new Map();            // code -> Room
  const ipCounts = new Map();         // adresse -> connexions ouvertes
  const lastRoomOf = new Map();       // pseudoKey -> code, pour retrouver sa salle
  const authFails = new Map();        // pseudoLower -> { n, until } (frein par pseudo cible)
  let nextClientId = 1;               // unique sur TOUT le serveur, jamais par salle
  let nextSlot = 0;                   // decalage d'accumulateur des salles

  /* --- persistance (seul ecrivain) ------------------------------------------- */

  /* Le regroupement des ecritures vit dans le magasin (fenetre de 2 s) ; ici
     on ne fait que designer QUEL compte doit survivre. Une session temporaire
     (deja connecte ailleurs) n'est pas dans le magasin : save() l'ignore tout
     seul, exactement le comportement voulu — les noyaux ne se comptent jamais
     en double. */
  function persist(c) {
    if (c.pseudoKey) store.save(c.pseudoKey);
  }

  function progressPayload(c) {
    const pr = c.profile;
    return {
      t: "progress",
      cores: pr.cores,
      runs: pr.runs,
      best: pr.best,
      milestones: pr.milestones,
      kills: pr.kills,
      classes: pr.classes,
      confort: pr.confort,
      // Lot J : la liste des cartes bannies — le Terminal l'affiche, le
      // repli couvre les profils v4 d'avant le lot.
      bannedCards: pr.bannedCards ?? [],
      pseudo: pr.pseudo ?? "",
      gained: c.lastGain ?? 0,
    };
  }
  function sendProgress(c) {
    c.conn.send(JSON.stringify(progressPayload(c)));
    c.lastGain = 0;
  }

  /* Versement de fin de manche — port de l'awardRun d'avant, par salle. La
     salle emet, le hub ecrit : c'est ce qui fait disparaitre les ecritures
     concurrentes par construction. */
  /* Tout est indexe sur le NIVEAU D'EQUIPE (D3). Le numero de vague n'existe
     plus, et le segment atteint ne dirait rien : toutes les equipes voient les
     six memes segments. Le niveau, lui, se gagne — c'est ce que le lot Q rend
     vrai — donc c'est lui qui paie. */
  function awardRun(room) {
    const state = room.state;
    const shared = coresForRun(state.level, state.bossKills, state.diffIndex);
    for (const c of room.joined()) {
      const p = state.players.get(c.id);
      if (!p || !c.profile) continue;
      const pr = c.profile;
      /* Les jalons ne creditent plus AUCUN noyau (lot H) : la monnaie vient du
         jeu repete, la capacite (emplacements, cartes) vient des jalons. Les
         `boss_N` restent poses — ils deverrouillent les legendaires et
         comptent pour l'emplacement « trois boss » — et `vague10` porte
         l'emplacement du meme nom. */
      const gain = shared;

      for (const kind of state.bossKindsKilled) {
        const id = `boss_${kind}`;
        if (!pr.milestones.includes(id)) pr.milestones.push(id);
      }
      /* Les jalons de NIVEAU et non de vague : celle-ci n'existe plus. Ils ne
         paient AUCUNE prime — le lot H les a retirees apres avoir mesure
         qu'elles faisaient les deux tiers du revenu — ils ne font que debloquer
         des cartes et, pour le jalon d'emplacement, une ligne de plus a
         equiper. */
      if (state.level >= 10 && !pr.milestones.includes("niveau10")) {
        pr.milestones.push("niveau10");
      }
      if (state.level >= PROG_CFG.SLOTS_LEVEL
          && !pr.milestones.includes(`niveau${PROG_CFG.SLOTS_LEVEL}`)) {
        pr.milestones.push(`niveau${PROG_CFG.SLOTS_LEVEL}`);
      }
      if (p.deaths === 0 && state.level >= PROG_CFG.NO_DOWN_MIN_LEVEL
          && !pr.milestones.includes("sans_chute")) {
        pr.milestones.push("sans_chute");
      }
      const clsId = CLASSES[p.cls]?.id ?? "dps";
      pr.kills[clsId] = (pr.kills[clsId] ?? 0) + p.kills;
      if (!pr.milestones.includes("kills500")
          && Object.values(pr.kills).some(k => k >= PROG_CFG.KILLS_MILESTONE)) {
        pr.milestones.push("kills500");
      }

      pr.cores += gain;
      pr.runs += 1;
      /* `best.wave` n'est plus jamais ecrit : c'est le record historique du
         modele par vagues, il reste lisible tel quel. Les deux records du
         nouveau modele vivent a cote — le niveau dit la build, le segment dit
         jusqu'ou l'equipe est allee dans le script. */
      if (state.level > (pr.best.level | 0)) pr.best.level = state.level;
      if (state.segment > (pr.best.segment | 0)) pr.best.segment = state.segment;
      if (p.score > pr.best.score) pr.best.score = p.score;

      /* CLASSEMENT AU TEMPS. Le hub ENREGISTRE, il ne recalcule rien : la duree
         du combat final est relevee par la simulation (`_killBoss`, seul instant
         ou l'entite existe encore) et le contexte vient du salon.

         Le record est PAR DIFFICULTE — comparer un temps de calme a un temps de
         cauchemar n'aurait aucun sens — et il est verse a CHAQUE joueur present :
         la victoire est celle de l'equipe, et un classement qui ne crediterait
         que le porteur du coup fatal recompenserait le hasard de la derniere
         balle.

         Le temps est celui du COMBAT FINAL SEUL. Celui pour l'atteindre vaut
         1800 s de horde plus les cinq combats precedents : domine par une
         constante, il ne distinguerait personne. */
      if (state.victory && state.finalKill > 0) {
        c.lastFinal = recordFinal(pr, {
          time: state.finalKill,
          total: Math.round(state.time),
          level: state.level,
          difficulty: state.diffIndex,
          variant: DIFFICULTIES[state.diffIndex]?.script ?? "normal",
          biome: state.biomeIndex,
          players: room.joined().length,
        }, new Date().toISOString()) ? "record" : "victoire";
      }

      c.lastGain = gain;
      persist(c);
    }
    /* Consommee UNE fois, apres la boucle : `awardRun` est appele une seule
       fois par manche, mais la vider ici garantit qu'une manche relancee dans
       la foulee ne represente pas la meme victoire. */
  }

  /* Classement global au temps (lot N), toutes salles confondues, par
     difficulte. Lu depuis la MEMOIRE du magasin — jamais une requete par
     affichage : la Map `accounts` est deja l'etat chaud, et le classement est
     consulte au hub, c'est-a-dire souvent.
     Il vit au HUB et non au Terminal : le classement compare des COMPTES entre
     eux, sa place est la ou l'on est justement hors salle, et il est ainsi
     visible des la connexion. */
  function leaderboard(limit = 10) {
    const par = DIFFICULTIES.map(() => []);
    for (const pr of store.profiles()) {
      const bf = pr.bestFinal;
      if (!bf) continue;
      for (const k of Object.keys(bf)) {
        const d = Number(k);
        if (!par[d]) continue;
        // `wave` a voyage ici jusqu'en 0.8.6 : `recordFinal` ne l'ecrit pas
        // (il classe sur le niveau) et `renderBoard` ne le lit pas — un champ
        // mort qui transportait `0` a chaque ligne.
        par[d].push({ pseudo: pr.pseudo, time: bf[k].time | 0 });
      }
    }
    // Le TEMPS classe, et seulement lui : c'est un classement de vitesse.
    for (const l of par) l.sort((a, b) => a.time - b.time);
    return par.map(l => l.slice(0, limit));
  }

  /* Part d'un joueur qui quitte EN COURS de manche : les niveaux atteints, rien
     d'autre. Appele AVANT que le joueur ne sorte de state.players. */
  function awardPartial(c, room) {
    if (room.phase === PHASE_LOBBY || !c.profile || !room.state.players.has(c.id)) return;
    c.profile.cores += coresPartial(room.state.level, room.state.diffIndex);
    persist(c);
  }

  /* --- registre des salles ----------------------------------------------------- */

  const hooks = {
    log,
    occupancy: () => broadcastRooms(),
    awardRun,
    awardPartial,
    sendProgress,
    /* Lot J : le bannissement s'ecrit IMMEDIATEMENT — il ne doit pas se
       perdre si le serveur redemarre avant la fin de la manche. La salle
       emet, le hub ecrit, comme pour tout le reste de la progression ;
       l'ecran de cartes est une pause entre deux vagues, pas une vague. */
    persist,
  };

  function roomsPayload() {
    return { t: "rooms", rooms: [...rooms.values()].map(r => r.info()) };
  }

  /* LE point de passage unique du recomptage (infra-salons.md § 10) : tout ce
     qui change l'effectif ou l'etat d'une salle passe par le hook `occupancy`,
     qui aboutit ici. Les clients en etat hub sont peu nombreux et le message
     minuscule ; une liste qui vieillit sur l'ecran de celui qui attend une
     place est exactement le defaut qu'on veut eviter. */
  function broadcastRooms() {
    const msg = JSON.stringify(roomsPayload());
    for (const c of clients.values()) {
      if (c.joined && !c.room) c.conn.send(msg);
    }
  }

  function makeCode() {
    for (;;) {
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
      if (!rooms.has(code)) return code;
    }
  }

  function sanitizeRoomName(v, fallback) {
    if (typeof v !== "string") return fallback;
    const name = v.replace(/[\p{C}]/gu, "").replace(/\s+/g, " ").trim().slice(0, 20);
    return name.length >= 1 ? name : fallback;
  }

  function joinError(c, motif) {
    c.conn.send(JSON.stringify({ t: "joinRoomError", motif }));
  }

  /* Detache un client de sa salle et le ramene en etat hub. `why` fait la
     difference entre un depart volontaire et une salle qui ferme. */
  function returnToHub(c, why) {
    c.conn.send(JSON.stringify({ t: "roomClosed", why }));
    c.conn.send(JSON.stringify(roomsPayload()));
  }

  /* Fermeture d'une salle en erreur : une salle qui plante ne doit emporter ni
     les autres ni le hub. On detache chaque client avec la meme prudence que
     le tick — la salle vient de prouver qu'elle peut lancer. */
  function closeRoom(room, why) {
    for (const c of [...room.clients.values()]) {
      try {
        room.detach(c);
      } catch {
        c.room = null;
        room.clients.delete(c.id);
      }
      returnToHub(c, why);
    }
    rooms.delete(room.code);
    broadcastRooms();
    log(`salle ${room.code} fermée — ${why}`);
  }

  /* --- messages en etat hub ----------------------------------------------------- */

  function handleCreateRoom(client, msg) {
    if (client.room) return;
    if (rooms.size >= ROOM_MAX) return joinError(client, "plafond");
    const name = sanitizeRoomName(msg.name, `salle de ${client.name}`);
    const pass = typeof msg.pass === "string" ? msg.pass.trim().slice(0, 20) : "";
    const room = new Room(makeCode(), name, pass, nextSlot++, hooks);
    rooms.set(room.code, room);
    log(`salle ${room.code} créée par ${client.name} — « ${name} »${pass ? " (protégée)" : ""}`);
    lastRoomOf.set(client.pseudoKey, room.code);
    room.attach(client);
  }

  function handleJoinRoom(client, msg) {
    if (client.room) return;
    const room = rooms.get(typeof msg.code === "string" ? msg.code.toUpperCase() : "");
    /* `pleine` et `disparue` sont deux motifs DISTINCTS : ils arrivent au meme
       moment (fin de manche, salle qui se vide ou se remplit pendant qu'on lit
       la liste) et la conduite a tenir n'est pas la meme — reessayer, ou creer
       sa propre salle. */
    if (!room) return joinError(client, "disparue");
    if (room.clients.size >= ROOM_MAX_PLAYERS) return joinError(client, "pleine");
    /* Un membre connu re-entre sans mot de passe : c'est ce qui fait qu'un
       rechargement de page pendant le delai de grace retrouve sa salle sans
       rien retaper, meme protegee. */
    if (room.pass && !room.knownMembers.has(client.pseudoKey)) {
      const pass = typeof msg.pass === "string" ? msg.pass.trim() : "";
      if (pass !== room.pass) return joinError(client, "motdepasse");
    }
    lastRoomOf.set(client.pseudoKey, room.code);
    room.attach(client);
  }

  /* --- journal d'erreur client ---------------------------------------------

     Le navigateur n'a pas de journal qu'on relise : la console est ouverte ou
     elle ne l'est pas, et personne ne joue avec les outils de developpement
     affiches. Une erreur non rattrapee dans la boucle de rendu disparait donc
     sans laisser de trace, alors que c'est precisement ce qu'on veut apres une
     fusion — un ecran qui ne s'ouvre plus jette, et la pile d'appel dit ou.

     PLAFONNE PAR CONNEXION, et ce n'est pas une precaution de style : une erreur
     dans la boucle de rendu se REPETE soixante fois par seconde. Sans plafond,
     un seul defaut noierait le journal du serveur en quelques secondes et
     emporterait tout ce qu'il y avait autour — c'est-a-dire exactement le
     contexte qu'on est venu chercher. Une meme signature n'est journalisee
     qu'une fois : la deuxieme occurrence n'apprend rien que la premiere n'ait
     deja dit. */
  const ERR_MAX = 12;              // par connexion, tout le reste est jete

  function propre(v, max) {
    // Les retours a la ligne sont remplaces et non retires : sans separateur
    // visible, une pile d'appel devient une bouillie de noms colles.
    return String(v ?? "").slice(0, max).replace(/[\r\n\t]+/g, " ⏎ ");
  }

  function logClientError(client, msg) {
    client.errSeen ??= new Set();
    if (client.errSeen.size >= ERR_MAX) return;
    const ou = propre(msg.ou, 60);
    const quoi = propre(msg.message, 200);
    const signature = ou + "|" + quoi;
    if (client.errSeen.has(signature)) return;
    client.errSeen.add(signature);

    const qui = client.name || "anonyme";
    const pile = propre(msg.pile, 400);
    log(`[client] ${qui} — ${ou} : ${quoi}${pile ? ` — ${pile}` : ""}`);
  }

  /* Achats et reattributions de la progression permanente. Ils vivent au HUB —
     seul ecrivain — et restent refuses pendant une manche : depuis le hub ou
     depuis le salon d'une salle, jamais en jeu. */
  function metaAllowed(client) {
    return client.joined && !!client.profile
      && (!client.room || client.room.phase === PHASE_LOBBY);
  }

  function handleMeta(client, msg) {
    switch (msg.t) {
      case "metaBuy": {
        const tree = TREES[msg.cls];
        if (!tree) break;
        const line = tree.find(l => l.id === msg.line);
        if (!line) break;
        const pr = client.profile;
        const cp = pr.classes[msg.cls] ??= { tiers: {}, equipped: [] };
        const cur = cp.tiers[line.id] | 0;
        if (cur >= PROG_CFG.TIERS_MAX) break;
        const cost = tierCost(cur);
        if (pr.cores < cost) break;
        pr.cores -= cost;
        cp.tiers[line.id] = cur + 1;
        // `slotsFor` prend le PROFIL depuis le lot H : la capacite vient des
        // jalons du compte, plus des paliers achetes dans la classe.
        if (cur === 0 && !cp.equipped.includes(line.id)
            && cp.equipped.length < slotsFor(pr)) {
          cp.equipped.push(line.id);
        }
        persist(client);
        sendProgress(client);
        break;
      }

      case "metaEquip": {
        const cp = client.profile.classes[msg.cls];
        if (!cp || !Array.isArray(msg.lines) || msg.lines.length > 16) break;
        const lines = [...new Set(msg.lines.filter(l => typeof l === "string"))];
        if (lines.some(l => !(cp.tiers[l] > 0))) break;
        if (lines.length > slotsFor(client.profile)) break;
        cp.equipped = lines;
        persist(client);
        sendProgress(client);
        break;
      }

      case "metaConfort": {
        const cost = PROG_CFG.CONFORT_COSTS[msg.id];
        if (cost === undefined) break;
        const pr = client.profile;
        if (pr.confort.includes(msg.id) || pr.cores < cost) break;
        pr.cores -= cost;
        pr.confort.push(msg.id);
        persist(client);
        sendProgress(client);
        break;
      }
    }
  }

  /* --- connexion ---------------------------------------------------------------- */

  function handleConnection(conn, req) {
    const ip = req.socket?.remoteAddress ?? "?";
    const ipCount = (ipCounts.get(ip) ?? 0) + 1;
    if (ipCount > IP_CONN_MAX) {
      conn.send(JSON.stringify({ t: "authError",
        msg: "trop de connexions depuis cette adresse", fatal: 1 }));
      setTimeout(() => conn.close(), 200);
      return;
    }
    ipCounts.set(ip, ipCount);

    const id = nextClientId++;
    const client = {
      id, conn,
      name: "joueur " + id,
      colorIndex: 0,
      joined: false,       // authentifie (pseudo + cle valides)
      room: null,          // null = etat hub, sinon la Room
      spectator: false,
      vote: DIFF_NORMAL,
      cls: null,
      clsLocked: false,
      /* Prêt au salon. Le SERVEUR en est proprietaire, pas le client : a
         quatre, deux clients qui se contredisent afficheraient deux salons
         differents. Il vit ici et non sur la Room parce qu'il suit le joueur
         d'une salle a l'autre, exactement comme `cls` et `vote`. */
      ready: false,
      lastListAt: 0,
      input: { x: 0, y: 0, ax: 1, ay: 0, ar: SKILL_CFG.DPS_BOMB_RANGE_MAX,
               dash: false, s1: false, s2: false, s3: false },
      total: { score: 0, kills: 0, deaths: 0, rounds: 0 },
    };
    clients.set(id, client);

    /* Un premier etat tout de suite, sans attendre le battement de coeur : la
       latence est encore inconnue (`-1`, affichee en tiret) mais le nombre de
       salles et la version le sont, et l'ecran de connexion cesse de dire
       « connexion au serveur… » des la premiere image. */
    conn.send(JSON.stringify(serverInfoPayload(client)));

    conn.onmessage = raw => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (!msg || typeof msg !== "object") return;

      if (msg.t === "register")   { handleRegister(client, msg); return; }
      if (msg.t === "login")      { handleLogin(client, msg); return; }
      if (msg.t === "loginToken") { handleLoginToken(client, msg); return; }
      if (!client.joined) return;   // rien d'autre n'a de sens avant l'authentification

      switch (msg.t) {
        case "logout": {
          /* Invalide le jeton et ramene la connexion a l'etat non authentifie.
             Le client purge son localStorage et referme la socket de lui-meme ;
             cote serveur on detache proprement au cas ou il ne le ferait pas. */
          const room = client.room;
          if (room) {
            try { room.detach(client); } catch { client.room = null; }
          }
          store.logout(client.pseudoKey);
          client.joined = false;
          client.profile = null;
          client.pseudoKey = null;
          client.conn.send(JSON.stringify({ t: "loggedOut" }));
          return;
        }
        case "changePass": {
          const neuf = typeof msg.neuf === "string" ? msg.neuf : "";
          if (neuf.length < PASS_MIN || neuf.length > PASS_MAX) {
            client.conn.send(JSON.stringify({ t: "authError", motif: "passfaible",
              msg: `mot de passe : ${PASS_MIN} caractères minimum` }));
            return;
          }
          const r = store.changePass(client.pseudoKey,
            typeof msg.ancien === "string" ? msg.ancien : "", neuf);
          client.conn.send(JSON.stringify(r.ok
            ? { t: "passChanged" }
            : { t: "authError", motif: "identifiants", msg: "ancien mot de passe incorrect" }));
          return;
        }
        case "listRooms": {
          /* Le bouton de rafraichissement est un bouton qu'on martele, et le
             port est public : au-dela d'une demande par seconde, on ignore. */
          const now = Date.now();
          if (now - client.lastListAt < LIST_MIN_MS) return;
          client.lastListAt = now;
          client.conn.send(JSON.stringify(roomsPayload()));
          return;
        }
        /* Classement au temps (lot N). Meme frein que la liste des salles, et
           pour la meme raison : c'est un bouton qu'on martele et le port est
           public. Il partage `lastListAt` — les deux demandes lisent l'etat
           chaud du hub, un frein commun suffit et evite qu'on contourne l'un
           en alternant avec l'autre. */
        case "leaderboard": {
          const now = Date.now();
          if (now - client.lastListAt < LIST_MIN_MS) return;
          client.lastListAt = now;
          client.conn.send(JSON.stringify({ t: "leaderboard", board: leaderboard() }));
          return;
        }
        case "createRoom": handleCreateRoom(client, msg); return;
        case "joinRoom":   handleJoinRoom(client, msg); return;
        case "leaveRoom": {
          const room = client.room;
          if (!room) return;
          try { room.detach(client); } catch { client.room = null; }
          /* Sortie VOLONTAIRE : on oublie la salle. `lastRoomOf` ne sert qu'a
             proposer un retour apres un rechargement ou une coupure ; le
             garder ici rendrait la salle qu'on vient de quitter a chaque
             reconnexion, c'est-a-dire exactement le contraire de ce qui vient
             d'etre demande. */
          lastRoomOf.delete(client.pseudoKey);
          returnToHub(client, "quitté");
          return;
        }
        case "metaBuy":
        case "metaEquip":
        case "metaConfort":
          if (metaAllowed(client)) handleMeta(client, msg);
          return;

        /* JOURNAL D'ERREUR CLIENT. Traite au HUB et non dans la salle, parce
           qu'une erreur de navigateur ne connait pas l'etat du joueur : elle
           arrive aussi bien sur l'ecran de connexion, au salon qu'en manche, et
           la router vers la salle l'aurait perdue dans les deux premiers cas.

           Elle existe parce que le serveur est le SEUL journal qu'on regarde. Un
           defaut de rendu ou un ecran qui ne s'ouvre plus se manifeste dans la
           console du navigateur, que personne n'a ouverte pendant qu'il joue —
           et une pile d'appel perdue est un bug qu'on debogue a l'aveugle.

           LE CONTENU EST HOSTILE PAR CONSTRUCTION : c'est une chaine choisie par
           le client. Elle est donc tronquee, et ses retours a la ligne sont
           APLATIS — sans ca, un client modifie ecrirait de fausses lignes de
           journal, ce qui est le seul moyen de mentir a l'operateur ici. */
        case "clientError":
          logClientError(client, msg);
          return;
      }

      /* Tout le reste est un message de jeu : valide en etat salle, rejete en
         etat hub. Le try/catch a la meme raison d'etre que celui du tick — une
         salle qui plante sur un message ne doit pas emporter le processus. */
      const room = client.room;
      if (!room) return;
      try {
        room.handleMessage(client, msg);
      } catch (err) {
        log(`salle ${room.code} en erreur sur « ${msg.t} » : ${err.message}`);
        closeRoom(room, "erreur interne");
      }
    };

    conn.onclose = () => {
      if (client.room) {
        try { client.room.detach(client); } catch { client.room = null; }
      }
      clients.delete(id);
      const left = (ipCounts.get(ip) ?? 1) - 1;
      if (left <= 0) ipCounts.delete(ip); else ipCounts.set(ip, left);
      if (client.joined) {
        log(`${client.name} déconnecté — ${[...clients.values()].filter(c => c.joined).length} connecté(s)`);
      }
    };
  }

  /* --- authentification ----------------------------------------------------------

     Trois portes : `register` (la page de creation), `login` (pseudo + mot de
     passe) et `loginToken` (la reconnexion silencieuse du meme navigateur).
     Toutes aboutissent a `finishAuth`, le seul endroit qui fabrique un client
     authentifie — session temporaire, salle a retrouver et `welcome` compris. */

  function authError(client, motif, msg, fatal = 0) {
    client.conn.send(JSON.stringify(fatal
      ? { t: "authError", motif, msg, fatal: 1 }
      : { t: "authError", motif, msg }));
  }

  /* Frein par connexion (cinq essais puis socket a fermer) — le meme qu'avant,
     il borne une socket unique. Le frein par pseudo est teste separement dans
     handleLogin. */
  function connFailsExceeded(client) {
    if ((client.joinFails | 0) < 5) return false;
    authError(client, "essais", "trop d'essais — reconnecte-toi pour réessayer", 1);
    return true;
  }

  function validPass(client, v) {
    const pass = typeof v === "string" ? v : "";
    if (pass.length >= PASS_MIN && pass.length <= PASS_MAX) return pass;
    authError(client, "passfaible",
      `mot de passe : ${PASS_MIN} caractères minimum (${PASS_MAX} maximum)`);
    return null;
  }

  function handleRegister(client, msg) {
    if (client.joined || connFailsExceeded(client)) return;
    const pseudo = sanitizePseudo(msg.pseudo);
    if (!pseudo) {
      return authError(client, "pseudo",
        "pseudo invalide (3 à 14 caractères : lettres, chiffres, _ . -)");
    }
    const pass = validPass(client, msg.pass);
    if (pass === null) return;
    const r = store.register(pseudo, pass);
    // « Deja pris » est la reponse normale d'une inscription — pas un echec a
    // compter dans le frein, c'est le parcours de qui cherche un pseudo libre.
    if (!r.ok) return authError(client, "pris", "ce pseudo est déjà pris — choisis-en un autre, ou connecte-toi avec");
    finishAuth(client, r.profile, r.token, "nouveau compte");
  }

  function handleLogin(client, msg) {
    if (client.joined || connFailsExceeded(client)) return;
    const pseudo = sanitizePseudo(msg.pseudo);
    const pass = typeof msg.pass === "string" ? msg.pass : "";
    if (!pseudo || !pass) return authError(client, "identifiants", "pseudo ou mot de passe incorrect");

    /* Gel par pseudo cible, teste AVANT scrypt : c'est lui qui borne a la fois
       la devinette distribuee (rouvrir une socket ne remet pas ce compteur a
       zero) et le cout CPU d'une rafale. */
    const lower = pseudo.toLowerCase();
    const freeze = authFails.get(lower);
    if (freeze && Date.now() < freeze.until) {
      return authError(client, "attente", "trop d'essais sur ce pseudo — attends quelques secondes");
    }

    const r = store.login(pseudo, pass);
    if (!r.ok) {
      client.joinFails = (client.joinFails | 0) + 1;
      const rec = authFails.get(lower) ?? { n: 0, until: 0 };
      rec.n += 1;
      if (rec.n >= PSEUDO_FAILS_MAX) rec.until = Date.now() + PSEUDO_FREEZE_MS;
      authFails.set(lower, rec);
      // Jamais le detail : l'inscription revele deja les pseudos pris, inutile
      // d'offrir en plus une confirmation gratuite a qui essaie des mots de passe.
      return authError(client, "identifiants", "pseudo ou mot de passe incorrect");
    }
    authFails.delete(lower);
    finishAuth(client, r.profile, r.token, "");
  }

  /* La reconnexion silencieuse. Un echec est un cas NORMAL (jeton expire,
     compte supprime, login plus recent ailleurs) : le client retombe sur le
     formulaire sans bruit — ni compteur, ni gel, un jeton de 256 bits ne se
     devine pas. */
  function handleLoginToken(client, msg) {
    if (client.joined) return;
    const pseudo = typeof msg.pseudo === "string" ? msg.pseudo : "";
    const token = typeof msg.token === "string" ? msg.token : "";
    const r = pseudo && token ? store.loginToken(pseudo, token) : { ok: false };
    if (!r.ok) return authError(client, "jeton", "session expirée — reconnecte-toi");
    finishAuth(client, r.profile, null, "reprise par jeton");
  }

  function finishAuth(client, profile, token, note) {
    const conn = client.conn;
    client.joined = true;
    client.name = profile.pseudo;
    client.pseudoKey = profile.pseudo.toLowerCase();
    /* Le meme compte connecte deux fois cumulerait les noyaux en double. La
       copie est DETACHEE et jamais rangee dans le magasin : elle ne laisse
       aucun dechet a sauvegarder derriere elle. */
    client.tempAccount = [...clients.values()]
      .some(c => c !== client && c.pseudoKey === client.pseudoKey);
    client.profile = client.tempAccount ? structuredClone(profile) : profile;

    /* Retrouver sa salle apres un rechargement : si le compte etait dans une
       salle encore vivante (delai de grace compris), le client peut y revenir
       d'un geste — c'est lui qui envoie joinRoom, le hub ne teleporte pas. */
    const lastCode = lastRoomOf.get(client.pseudoKey);
    const lastRoom = lastCode ? rooms.get(lastCode) : null;
    const rejoin = lastRoom && lastRoom.clients.size < ROOM_MAX_PLAYERS
      ? { code: lastRoom.code, name: lastRoom.name } : null;

    conn.send(JSON.stringify({
      t: "welcome",
      id: client.id,
      pseudo: client.name,
      // Le jeton ne part QUE fraichement emis (register/login) : la reprise
      // par jeton n'en regenere pas, elle prolonge l'existant.
      token: token ?? undefined,
      colors: PLAYER_COLORS,
      /* La version du SERVEUR. Le client compare avec celle qu'il a lui-meme
         importee : les fichiers sont servis en `no-store`, donc aucune requete
         ne ramene du vieux code — mais un onglet LAISSE OUVERT pendant un
         redeploiement continue de faire tourner celui de la veille, et c'est
         precisement ce qui produit les rapports de defaut incomprehensibles.
         Cle nommee, envoyee une fois par connexion : quelques octets, aucun
         instantane touche, et un client d'avant ce lot l'ignore simplement. */
      version: VERSION,
      /* Le hash court, quand on a pu le resoudre. `|| undefined` et non la chaine
         vide : une cle absente se lit « on ne sait pas », une chaine vide
         s'afficherait comme une parenthese vide a l'ecran. */
      commit: commit || undefined,
      dup: client.tempAccount ? 1 : 0,
      rejoin,
      cfg: {
        ARENA_W: CFG.ARENA_W, ARENA_H: CFG.ARENA_H,
        SNAPSHOT_HZ: CFG.SNAPSHOT_HZ,
      },
    }));
    sendProgress(client);
    conn.send(JSON.stringify(roomsPayload()));
    log(`${client.name} connecté au hub`
      + `${note ? ` (${note})` : ""}`
      + `${client.tempAccount ? " (déjà connecté ailleurs : session temporaire)" : ""}`
      + ` — ${[...clients.values()].filter(c => c.joined).length} connecté(s)`);
  }

  /* --- boucle ------------------------------------------------------------------- */

  /* Un SEUL intervalle pour toutes les salles : moins de minuteurs, et la
     maitrise du budget total. Le decalage des accumulateurs fait le reste
     (voir Room). L'isolation aux pannes est le benefice reel du try/catch :
     avant le refactor, une exception dans une partie tombait tout le serveur. */
  let lastTick = process.hrtime.bigint();

  /* Diagnostic (PERF=1). Deux mesures distinctes qu'on confond facilement :
     `perfPeriode` est l'espacement REEL entre deux reveils du setInterval —
     nominalement 8,333 ms, jamais exactement ca — et `perfTour` est le temps
     passe DANS le tour. La premiere explique la quantification de la cadence
     de diffusion, la seconde repond au budget de 8,3 ms. Un tour court avec
     une periode longue est un probleme de minuteur, pas de charge. */
  const perfPeriode = new Sampler();
  const perfTour = new Sampler();
  let perfSince = 0;
  let perfEtait = false;

  function tick() {
    const now = process.hrtime.bigint();
    let elapsed = Number(now - lastTick) / 1e9;
    lastTick = now;
    if (elapsed > 0.25) elapsed = 0.25;

    /* Allumage a chaud : on repart de zero. Sans ca, la premiere ligne
       melangerait les echantillons d'avant l'extinction avec ceux d'apres, et
       `lastSend` des salles produirait un espacement absurde. */
    if (PERF_ON !== perfEtait) {
      perfEtait = PERF_ON;
      perfPeriode.reset();
      perfTour.reset();
      perfSince = 0;
      for (const room of rooms.values()) room.perfArm();
    }

    const t0 = PERF_ON ? perfNow() : 0;
    if (PERF_ON) perfPeriode.add(elapsed * 1000);

    const nowMs = Date.now();
    for (const room of [...rooms.values()]) {
      /* Une salle vide TICKE quand meme : une manche abandonnee doit revenir
         au salon d'elle-meme (abortRound), sinon celui qui la retrouve pendant
         le delai de grace arriverait spectateur d'une partie figee. Elle ne
         coute rien — sans manche en cours, le tick se reduit a trois tests. */
      try {
        room.tick(elapsed);
      } catch (err) {
        // Une salle qui plante ne doit pas emporter les autres.
        log(`salle ${room.code} en erreur : ${err.message}`);
        closeRoom(room, "erreur interne");
        continue;
      }
      // Une salle vide survit son delai de grace, puis disparait. Pas de
      // message a envoyer : il n'y a personne dedans par definition.
      if (room.clients.size === 0 && room.emptySince
          && nowMs - room.emptySince >= ROOM_GRACE_MS) {
        rooms.delete(room.code);
        broadcastRooms();
        log(`salle ${room.code} détruite — vide depuis ${Math.round(ROOM_GRACE_MS / 1000)} s`);
      }
    }

    if (PERF_ON) {
      perfTour.add(perfNow() - t0);
      perfSince += elapsed;
      if (perfSince >= PERF_REPORT_S) {
        perfSince = 0;
        const pe = perfPeriode.stats(), to = perfTour.stats();
        console.log(`[perf] boucle n=${pe.n}`
          + ` periode moy=${f1(pe.moy)} min=${f1(pe.min)} max=${f1(pe.max)}`
          + ` | tour moy=${f1(to.moy)} p99=${f1(to.p99)} max=${f1(to.max)} ms`);
        perfPeriode.reset();
        perfTour.reset();
        /* Chaque salle rapporte sa propre ligne : l'espacement de diffusion et
           le poids d'instantane sont des grandeurs PAR SALLE, et les agreger
           masquerait exactement la salle qui decroche. */
        for (const room of rooms.values()) room.perfReport();
      }
    }
  }

  /* --- vues pour la page admin ---------------------------------------------------- */

  function adminView() {
    return {
      salles: [...rooms.values()].map(r => ({
        code: r.code,
        nom: r.name,
        joueurs: r.clients.size,
        max: ROOM_MAX_PLAYERS,
        phase: r.phase,
        manche: r.roundNumber,
        vague: r.phase === PHASE_ROUND ? r.state.segment : 0,
      })),
      connectes: [...clients.values()].filter(c => c.joined).length,
    };
  }

  function anyRoundRunning() {
    return [...rooms.values()].some(r => r.phase !== PHASE_LOBBY);
  }

  /* Apres un reset : les comptes n'existent plus, et un mot de passe ne se
     recree pas d'office comme l'etait une cle generee. On DECONNECTE donc
     proprement tous les authentifies — `fatal` fait fermer la socket au
     client, qui purge son jeton et retombe sur l'ecran de creation. Garder
     l'ancien profil en memoire le ferait repartir au prochain save(). */
  function kickAccounts(msg) {
    for (const c of [...clients.values()]) {
      if (!c.joined) continue;
      if (c.room) {
        try { c.room.detach(c); } catch { c.room = null; }
      }
      c.joined = false;
      c.profile = null;
      c.pseudoKey = null;
      authError(c, "reset", msg, 1);
    }
  }

  /* La deconnexion d'UN compte (suppression admin) : meme chemin, un seul
     visé. */
  function kickAccount(lower, msg) {
    for (const c of [...clients.values()]) {
      if (!c.joined || c.pseudoKey !== lower) continue;
      if (c.room) {
        try { c.room.detach(c); } catch { c.room = null; }
      }
      c.joined = false;
      c.profile = null;
      c.pseudoKey = null;
      authError(c, "reset", msg, 1);
    }
  }

  function connectedKeys() {
    const out = new Set();
    for (const c of clients.values()) if (c.joined && c.pseudoKey) out.add(c.pseudoKey);
    return out;
  }

  /* Battement de coeur WebSocket, seul emetteur de `ping()` du processus.
     `ws_lite` savait envoyer un ping depuis toujours mais personne ne
     l'appelait — d'ou l'absence de toute mesure d'aller-retour.

     Il vit au HUB et non dans une salle : la latence est une propriete de la
     CONNEXION, pas de la partie, et un joueur au hub a autant besoin de la
     connaitre qu'un joueur au salon. C'est aussi ce qui garantit une seule
     serie de pings par socket quoi qu'il arrive. */
  function pingAll() {
    for (const c of clients.values()) c.conn.ping();
    broadcastServerInfo();
  }

  /* L'etat du SERVICE, pour l'ecran de connexion et le hub : la latence, le
     nombre de salles ouvertes, la version. Trois faits que le client ne peut
     pas deduire — il ne voit pas les pongs (le navigateur y repond sous la
     couche JS) et il ne connait pas les salles avant d'etre authentifie.

     Envoye a 1 Hz, mais SEULEMENT aux clients hors salle. C'est l'exception a
     la regle qui a fait passer le ping du salon dans `lobbyPayload()` plutot
     que dans un message periodique : ici le chiffre EST ce qu'on regarde, et
     celui qui le lit ne recoit aucun instantane par ailleurs. Une soixantaine
     d'octets par seconde et par spectateur, contre 7 Ko vingt fois par seconde
     pour un joueur en manche — qui, lui, ne le recoit pas. */
  function serverInfoPayload(c) {
    return {
      t: "serverInfo",
      rtt: c.conn.rtt != null ? Math.round(c.conn.rtt) : -1,
      rooms: rooms.size,
      build: BUILD,
    };
  }

  function broadcastServerInfo() {
    for (const c of clients.values()) {
      /* Hors salle, ou au SALON. Pas pendant une manche : celui qui joue
         recoit deja un instantane vingt fois par seconde, et la barre
         superieure ne s'affiche pas par-dessus l'arene.

         Le salon en fait partie et c'est necessaire, pas confortable :
         `lobbyPayload()` ne part que sur evenement (arrivee, vote, choix de
         classe, prêt), donc dans un salon ou personne ne touche a rien la
         latence resterait affichee « — » indefiniment — c'est-a-dire sur
         l'ecran ou l'on decide precisement si la connexion tient. */
      if (c.room && c.room.phase !== PHASE_LOBBY) continue;
      c.conn.send(JSON.stringify(serverInfoPayload(c)));
    }
  }

  /* La MEME information, avant toute WebSocket. L'ecran de connexion l'affiche
     alors que la socket n'est pas encore ouverte — elle ne l'est qu'au premier
     clic, et l'ouvrir des le chargement ferait une socket par onglet laisse
     ouvert, comptee dans le plafond par adresse IP.

     Elle ne porte NI la latence (le client la mesure lui-meme, en chronometrant
     l'aller-retour de la requete) NI rien qui ne soit deja destine a etre lu
     sur l'ecran d'accueil : un nombre de salles et un numero de version. */
  function publicInfo() {
    return { rooms: rooms.size, build: BUILD };
  }

  return {
    handleConnection, tick, pingAll, publicInfo, adminView, anyRoundRunning,
    kickAccounts, kickAccount, connectedKeys, rooms, clients,
  };
}

/* Le pseudo est le compte (simplification pseudo+cle). SANS espace — un pseudo
   se recopie a la main pour se reconnecter — et un minimum de trois
   caracteres. */
function sanitizePseudo(v) {
  if (typeof v !== "string") return null;
  const p = v.replace(/[^\p{L}\p{N}_.-]/gu, "").slice(0, 14);
  return p.length >= 3 ? p : null;
}
