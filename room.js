/* ===========================================================================
   UNE SALLE = UNE PARTIE.
   Tout ce qui, avant le refactor en salons, etait l'etat global de server.js
   vit ici en champ d'instance : GameState, phases, pause, choix de cartes,
   accumulateur de tick. Le hub instancie, attache et detache les clients,
   et appelle tick() a 120 Hz.

   LA regle qui structure tout (infra-salons.md § 2) :

     Une Room ne touche jamais a Supabase, ne lit jamais de variable globale,
     et ne connait pas les autres salles. Elle recoit ses entrees, emet des
     evenements, et c'est tout.

   Les evenements sont les `hooks` recus a la construction : awardRun,
   awardPartial, sendProgress (la progression appartient au hub, seul
   ecrivain) et occupancy (le point de passage unique du recomptage — un seul
   chemin de sortie oublie laisserait une salle affichee 4/4 avec une place
   libre, et la fin de manche est justement le cas le plus frequent).
   C'est aussi ce qui rend une salle testable sans serveur ni base.
   =========================================================================== */

import {
  GameState, CFG, PLAYER_COLORS, DIFFICULTIES, DIFF_NORMAL, BIOMES,
} from "./shared/game_state.js";
import { CARD_CFG, cardBrief, banClosure } from "./shared/cards.js";
// Le nom de l'etape, pour le journal du serveur : « Crise » se retrouve dans
// un journal, « segment 3 » demande d'ouvrir la table pour savoir ou on en est.
import { segmentName } from "./shared/timeline.js";
import { RELIC_CFG, relicRerollCost } from "./shared/reliques.js";
import { CLASSES, CLASS_DEFAULT, bombRange } from "./shared/classes.js";
import { lockedCards } from "./shared/progression.js";
import { prepareMessage } from "./ws_lite.js";
import { PERF_ON, Sampler, nowMs, f1 } from "./perf.js";

export const PHASE_LOBBY = 0;
export const PHASE_ROUND = 1;
export const PHASE_CARDS = 2;
export const PHASE_MERCHANT = 3;

export const ROOM_MAX_PLAYERS = PLAYER_COLORS.length;

/* Index dans `PLAYER_COLORS`, dont l'ordre EST celui des classes. Nommer les
   quatre plutot que d'ecrire 0..3 dans `assignColors` : c'est la seule chose
   qui relie ce fichier a l'ordre de la table, et un nombre nu s'y trompe en
   silence. */
const COLOR_TANK  = 0;
const COLOR_HEAL  = 1;
const COLOR_DPS_A = 2;
const COLOR_DPS_B = 3;

const PAUSE_MAX_MS = 5 * 60 * 1000;
const SNAPSHOT_INTERVAL = 1 / CFG.SNAPSHOT_HZ;

/* ECHAUFFEMENT au lancement d'une manche : le temps du briefing de classe.
   La simulation TOURNE — on ferme l'ecran et on se deplace — mais la vague est
   retenue (`state.warmup`, game_state.js). Une seule valeur, envoyee dans le
   message `round` : le client n'en garde aucune copie, sinon deux nombres a
   tenir d'accord et un compte a rebours qui ment des que l'un bouge. Elle est
   la MEME pour toute la salle — un joueur dont la vague partirait avant celle
   des autres jouerait une manche differente. */
const WARMUP_S = 20;

/* LE COMPTE A REBOURS DE LANCEMENT. Trois secondes entre le clic de l'hote et
   la manche, pendant lesquelles n'importe qui peut faire machine arriere.

   Trois et pas cinq : le delai doit couvrir le clic regrette — « attends, je
   n'ai pas pris ma classe » — sans devenir une attente qu'on subit a chaque
   manche. C'est la meme echelle que le retrait d'un envoi dans une messagerie,
   et pour la meme raison.

   Il vit cote SERVEUR comme le reste : un client modifie qui enverrait `start`
   ne se lancerait pas plus vite pour autant. */
const LAUNCH_DELAY_MS = 3000;

/* Manches conservees dans l'historique d'une salle. Huit et non « toutes » :
   le salon est diffuse a chaque vote et a chaque choix de classe, donc une
   soiree de trente manches ferait grossir chaque message pour une information
   que personne ne lit au-dela des trois dernieres lignes. */
const ROUND_HISTORY_MAX = 8;

export class Room {
  /* `slot` sert au DECALAGE des accumulateurs (infra-salons.md § 6) : seize
     salles qui simulent et diffusent dans le meme tour de boucle depassent le
     budget de 8,3 ms. Les origines se repartissent donc explicitement sur le
     cycle a la creation — la desynchronisation naturelle existe mais n'est
     pas fiable. */
  constructor(code, name, pass, slot, hooks) {
    this.code = code;
    this.name = name;
    // Le mot de passe reste en memoire, en clair : il protege une partie de
    // vingt minutes entre gens qui se connaissent, pas un compte. Il ne sort
    // JAMAIS de la salle — la liste du hub ne transporte qu'un booleen.
    this.pass = pass;
    this.hooks = hooks;

    this.clients = new Map();        // id -> client (tous authentifies)
    this.knownMembers = new Set();   // pseudoKeys passes par ici — re-entree sans mot de passe
    this.emptySince = 0;             // 0 = occupee ; sinon Date.now() du dernier depart

    this.phase = PHASE_LOBBY;
    /* BIOME ET GRAINE (lot V). Tires AVANT la manche et non pendant : le salon
       les annonce, et un salon qui annoncerait un biome que `startRound`
       retirerait ensuite mentirait sur la seule information qu'il donne. Ils se
       retirent a la fin de chaque manche — deux manches de suite dans la meme
       usine seraient deux fois la meme partie, alors que le biome est justement
       ce qui les distingue. */
    this.drawBiome();
    this.state = new GameState(DIFF_NORMAL, this.biomeIndex, this.seed);
    this.roundNumber = 0;
    this.hostId = 0;

    /* Manches precedentes de cette salle : { at, diffIndex, wave }. Sur la
       SALLE et non sur le client — l'historique appartient a la soiree, pas au
       joueur, et celui qui se reconnecte doit le retrouver. Le plafond n'est
       pas decoratif : `lobbyPayload()` est diffuse a chaque vote, et une soiree
       de trente manches ferait grossir chaque message sans que personne ne
       lise au-dela des trois dernieres. */
    this.history = [];

    this.paused = false;
    this.pausedAt = 0;

    /* Le briefing de manche est-il encore ouvert pour QUELQU'UN. Sur la salle
       et non sur le client : c'est un etat de la manche — « la vague est
       retenue » — la ou `client.briefDone` dit ce que chacun a fait. */
    this.briefOpen = false;

    /* Echeance du lancement, 0 quand aucun n'est engage. Sur la salle : le
       compte a rebours appartient a la table, pas a celui qui a clique — et
       c'est ce qui permet a n'importe qui de l'interrompre. */
    this.launchAt = 0;

    this.cardDeadline = 0;
    this.cardPicked = new Set();

    this.inputs = new Map();
    this.staggerFrac = (slot % 16) / 16;
    this.acc = 0;
    this.sinceSnapshot = -this.staggerFrac * SNAPSHOT_INTERVAL;

    /* Diagnostic, allumable a chaud depuis la page admin. L'espacement de
       diffusion se mesure sur l'horloge monotone et non sur `sinceSnapshot` :
       c'est justement la valeur dont on soupconne qu'elle ne dit pas la verite.

       L'etat est alloue meme quand la mesure est eteinte — deux tableaux vides
       par salle. Le conditionner laisserait `null` pour toujours dans une salle
       creee avant qu'on allume. */
    this.perf = { esp: new Sampler(), lastSend: 0, clair: 0, defl: 0 };
  }

  /* Remise a zero a l'allumage, appelee par le hub. */
  perfArm() {
    this.perf.esp.reset();
    this.perf.lastSend = 0;
    this.perf.clair = 0;
    this.perf.defl = 0;
  }

  /* --- diffusion ------------------------------------------------------------- */

  /* Serialisation ET compression une seule fois par message, pour toute la
     salle — c'est la mesure de la spec : 0,31 ms par compression, une par
     salle et non une par client. */
  broadcast(obj) {
    const prep = prepareMessage(JSON.stringify(obj));
    /* Diagnostic : on retient le MAXIMUM de la fenetre et non la derniere
       valeur. Les alertes passent par le meme chemin et font une centaine
       d'octets — la derniere valeur ecraserait le poids de l'instantane, qui
       est justement la seule qu'on vient lire ici. */
    if (PERF_ON) {
      if (prep.plain.length > this.perf.clair) this.perf.clair = prep.plain.length;
      const dl = prep.deflated ? prep.deflated.length : 0;
      if (dl > this.perf.defl) this.perf.defl = dl;
    }
    for (const c of this.clients.values()) c.conn.sendPrepared(prep);
  }

  /* Une ligne de journal par salle et par seconde, appelee par le hub (PERF=1).

     `defl=n/n` est la mesure la plus importante du lot : elle dit si
     permessage-deflate a bien ete negocie de bout en bout. Un proxy inverse
     qui supprime l'en-tete `Sec-WebSocket-Extensions` fait partir les
     instantanes en clair — ~2,5 fois la bande passante — sans que rien cote
     serveur ne s'en plaigne, et c'est un defaut VPS-seulement.

     `bloq` et `fileMax` repondent a l'autre hypothese : il n'y a AUCUNE
     backpressure dans ws_lite (le retour de socket.write est ignore), donc un
     lien sature empile en silence dans le tampon interne de Node. */
  perfReport() {
    if (!PERF_ON || this.phase !== PHASE_ROUND) return;
    const p = this.perf;
    const e = p.esp.stats();
    let deflate = 0, bloq = 0, fileMax = 0;
    for (const c of this.clients.values()) {
      if (c.conn.deflate) deflate++;
      bloq += c.conn.perfBlocked;
      if (c.conn.perfQueueMax > fileMax) fileMax = c.conn.perfQueueMax;
      c.conn.perfBlocked = 0;
      c.conn.perfQueueMax = 0;
    }
    console.log(`[perf] salle=${this.code} s${this.state.segment}`
      + ` | diff n=${e.n} esp moy=${f1(e.moy)} min=${f1(e.min)} max=${f1(e.max)} ms`
      + ` | snap clair=${p.clair} defl=${p.defl}`
      + ` | conn=${this.clients.size} defl=${deflate}/${this.clients.size}`
      + ` bloq=${bloq} fileMax=${fileMax}`);
    p.esp.reset();
    p.clair = 0;
    p.defl = 0;
  }

  joined() {
    return [...this.clients.values()];
  }

  /* Effectif et etat pour la liste du hub. Le plafond voyage avec l'effectif :
     le client compose « 3/4 » lui-meme et sait si l'entree est cliquable sans
     reanalyser un texte. */
  info() {
    return {
      code: this.code,
      name: this.name,
      count: this.clients.size,
      max: ROOM_MAX_PLAYERS,
      state: this.phase === PHASE_LOBBY ? 0 : 1,
      locked: this.pass ? 1 : 0,
      /* Les deux seules choses qui permettent de choisir une salle SANS y
         entrer, et qui existaient deja cote serveur sans jamais sortir : la
         difficulte et l'avancement. Au salon c'est le vote qui fait foi, en
         manche c'est la partie en cours — apres une manche `state.diffIndex`
         est celui de la PRECEDENTE, pas celui qu'on jouerait en entrant, d'ou
         les deux sources. Meme raison pour la vague, qui ne sort qu'en manche :
         celle du `GameState` termine survit jusqu'au lancement du suivant. */
      diff: this.phase === PHASE_LOBBY ? this.votedDifficulty().index : this.state.diffIndex,
      segment: this.phase === PHASE_LOBBY ? 0 : this.state.segment,
    };
  }

  /* --- entrees / sorties ------------------------------------------------------ */

  /* Premiere couleur libre. Ce n'est plus la regle generale — voir
     `assignColors` juste en dessous — mais c'est le filet de l'arrivee EN COURS
     DE MANCHE, ou l'attribution par classe refuse de toucher a quoi que ce
     soit. Sans lui, un spectateur arriverait sans couleur du tout. */
  freeColor() {
    const used = new Set(this.joined().map(c => c.colorIndex));
    for (let i = 0; i < PLAYER_COLORS.length; i++) if (!used.has(i)) return i;
    return 0;
  }

  /* LA COULEUR SUIT LA CLASSE, et c'est ici qu'elle est attribuee — nulle part
     ailleurs. Le Rempart est toujours bleu, le Soigneur toujours vert : a la
     table, la question posee vingt fois par manche est « ou est le soigneur »,
     et une teinte tiree au sort a l'arrivee n'y repondait jamais.

     Ce n'etait pas gratuit a obtenir. `freeColor()` attribuait la premiere
     couleur libre A L'ARRIVEE dans la salle, donc AVANT tout choix de classe, et
     ne la revoyait plus jamais. La couleur devant maintenant suivre un choix qui
     change au salon, elle se RECALCULE a chaque diffusion plutot que de se poser
     une fois : c'est idempotent, ca coute une boucle sur quatre clients, et il
     n'y a aucun point de mutation a ne pas oublier de brancher.

     LE TIREUR A DEUX TEINTES ET ELLES NE SUFFISENT PAS TOUJOURS. `unique: true`
     sur le tank et le soigneur veut dire « au plus un », pas « exactement un » :
     une table de quatre ou personne ne prend ces deux roles aligne QUATRE
     tireurs, et deux d'entre eux seraient identiques. Les tireurs puisent donc
     d'abord dans leurs deux teintes, puis EMPRUNTENT les couleurs de classe
     unique restees libres. La regle du dessus n'en souffre jamais : si un tank
     est la, le bleu est a lui, donc il n'est pas empruntable. */
  assignColors() {
    /* JAMAIS EN PLEINE MANCHE. Le recalcul depend de la salle entiere : si un
       tireur se deconnecte, les tireurs suivants remontent d'un cran dans le
       pool et changeraient de couleur SOUS LES YEUX des autres, au milieu d'un
       combat, alors que la couleur est precisement ce qui sert a se reperer.
       `startRound()` appelle cette methode avant de basculer la phase, donc
       l'attribution de depart passe ; tout ce qui arrive apres attend le salon
       suivant. Un arrivant en cours de manche garde la teinte que `freeColor()`
       lui a donnee a l'entree. */
    if (this.phase !== PHASE_LOBBY) return;
    // Tri par identifiant : l'ordre d'iteration d'une Map suffirait aujourd'hui,
    // mais l'attribution doit etre STABLE — un tireur qui change de teinte parce
    // qu'un autre joueur a quitte le salon est exactement le genre de scintillement
    // qu'on ne remarque qu'en partie.
    const list = [...this.joined()].sort((a, b) => a.id - b.id);
    const pris = new Set();

    for (const c of list) {
      const id = c.cls === null || c.cls === undefined ? null : CLASSES[c.cls]?.id;
      if (id === "tank" && !pris.has(COLOR_TANK)) {
        c.colorIndex = COLOR_TANK; pris.add(COLOR_TANK);
      } else if (id === "soigneur" && !pris.has(COLOR_HEAL)) {
        c.colorIndex = COLOR_HEAL; pris.add(COLOR_HEAL);
      } else {
        // Tireur, sans classe, ou doublon d'une classe unique que le serveur
        // aurait laisse passer : traite au second tour.
        c.colorIndex = -1;
      }
    }

    const pool = [COLOR_DPS_A, COLOR_DPS_B, COLOR_TANK, COLOR_HEAL]
      .filter(i => !pris.has(i));
    let k = 0;
    for (const c of list) {
      if (c.colorIndex === -1) c.colorIndex = pool[k++] ?? COLOR_DPS_A;
    }
  }

  /* L'hote est le plus ancien client encore present. S'il part, le suivant
     herite du bouton sans que personne n'ait a rien faire. Le calcul se fait
     AU SEIN de la salle — plus jamais globalement (point de vigilance § 10). */
  refreshHost() {
    const list = this.joined();
    if (list.some(c => c.id === this.hostId)) return false;
    this.hostId = list.length ? Math.min(...list.map(c => c.id)) : 0;
    return true;
  }

  attach(client) {
    client.room = this;
    /* Teinte provisoire : la premiere libre, comme avant. Elle ne sert qu'a
       couvrir l'arrivee EN COURS DE MANCHE, ou `assignColors()` refuse de
       toucher a quoi que ce soit — sans elle, un spectateur arriverait sans
       couleur du tout. Au salon, elle est ecrasee deux lignes plus bas. */
    client.colorIndex = this.freeColor();
    // Arriver en cours de manche ne coupe pas la partie des autres : on
    // regarde, on entre a la manche suivante — comportement inchange, par
    // salle desormais.
    client.spectator = this.phase !== PHASE_LOBBY;
    /* Entrer dans une salle, c'est repartir de zero : le drapeau vit sur le
       CLIENT et le suivrait sinon d'une salle a l'autre — on arriverait
       « prêt » dans un salon ou l'on vient de mettre le pied. */
    client.ready = false;
    /* Meme raison, meme endroit : sans remise a zero, celui qui a ferme le
       briefing d'une salle arriverait « briefing lu » dans la suivante. Il ne
       sert a rien avant la manche, mais il vit sur le CLIENT — donc il voyage
       avec lui. */
    client.briefDone = false;
    this.clients.set(client.id, client);
    // APRES l'insertion : l'attribution regarde la salle entiere, l'arrivant
    // compris. Il n'a pas encore de classe, il prendra donc une teinte de
    // tireur — et changera des qu'il choisira, comme tout le monde.
    this.assignColors();
    this.knownMembers.add(client.pseudoKey);
    this.emptySince = 0;

    // Un second joueur arrive : la pause tombe. Sinon un solo en pause bloque
    // la salle et l'arrivant regarde une image figee.
    if (this.paused) this.setPaused(false, "un second joueur est arrivé");

    this.refreshHost();
    client.conn.send(JSON.stringify({
      t: "roomJoined",
      code: this.code,
      name: this.name,
      host: this.hostId,
      phase: this.phase,
      round: this.roundNumber,
      spectator: client.spectator,
    }));
    this.broadcast(this.lobbyPayload());
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] ${client.name} rejoint`
      + `${client.spectator ? " (spectateur)" : ""} — ${this.clients.size} présent(s)`);
  }

  /* TOUTES les sorties passent ici : leaveRoom, fermeture de socket, fermeture
     de salle sur erreur. La part du deserteur se verse avant que le joueur ne
     sorte de la simulation, comme avant. */
  detach(client) {
    if (!this.clients.has(client.id)) return;
    this.hooks.awardPartial(client, this);
    this.state.removePlayer(client.id);
    this.clients.delete(client.id);
    client.room = null;
    client.spectator = false;

    if (this.clients.size === 0) {
      // Le delai de grace demarre ICI. La salle survit ROOM_GRACE_MS pour
      // qu'une coupure reseau breve ou un rechargement de page ne detruise
      // pas la partie — le hub fait le menage a l'echeance.
      this.emptySince = Date.now();
    } else {
      /* Un partant sort de `state.players` juste au-dessus, donc de la liste
         d'attente du briefing. Sans ce recompte, une deconnexion pendant les
         vingt secondes retient la vague jusqu'a l'echeance pour quelqu'un qui
         n'est plus la — c'est le cas que `briefWaiting()` est ecrit pour
         couvrir, encore faut-il le lui demander. */
      this.syncBrief();
      const changed = this.refreshHost();
      this.broadcast(this.lobbyPayload());
      if (changed && this.hostId) {
        this.hooks.log(`[${this.code}] hôte : ${this.clients.get(this.hostId)?.name}`);
      }
    }
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] ${client.name} quitte — ${this.clients.size} présent(s)`);
  }

  /* --- salon ------------------------------------------------------------------ */

  votedDifficulty() {
    const tally = DIFFICULTIES.map(() => 0);
    for (const c of this.joined()) tally[c.vote]++;

    let best = DIFF_NORMAL, bestN = -1;
    for (let i = 0; i < tally.length; i++) {
      if (tally[i] > bestN) { bestN = tally[i]; best = i; }
    }
    return { index: bestN > 0 ? best : DIFF_NORMAL, tally };
  }

  takenClasses() {
    const taken = new Set();
    for (const c of this.joined()) {
      if (c.cls === null) continue;
      if (CLASSES[c.cls]?.unique) taken.add(c.cls);
    }
    return taken;
  }

  /* Point de passage unique du deverrouillage de classe, appele par les deux
     sorties de manche AVANT de diffuser le salon — sinon les clients recoivent
     un `clsLocked` perime et grisent le selecteur. */
  unlockClasses() {
    for (const c of this.clients.values()) c.clsLocked = false;
  }

  // Le biome de la PROCHAINE manche. Deux nombres, et c'est tout ce que le lot V
  // coute au reseau : le client en regenere la geometrie entiere.
  drawBiome() {
    this.biomeIndex = Math.floor(Math.random() * BIOMES.length);
    this.seed = Math.floor(Math.random() * 0x7fffffff);
  }

  /* Consigne la manche qui vient de finir. Appele aux DEUX sorties de manche,
     a cote d'`unlockClasses()` et pour la meme raison : c'est la qu'une manche
     se termine, et un seul des deux chemins oublie laisserait un trou dans
     l'historique une fois sur deux.

     LE SEGMENT ET LE NIVEAU, et non la vague : celle-ci n'existe plus. La
     victoire, elle, ENTRE dans l'historique — contrairement a ce que le modele
     par vagues pouvait dire, une manche de plan 5 peut se GAGNER (six segments,
     six boss), et c'est precisement le resultat qu'on veut retrouver dans une
     liste. Ce n'est pas une regle de game design decidee par un ecran : c'est
     `state.victory`, pose par la simulation. */
  recordRound() {
    this.history.push({
      at: Date.now(),
      diffIndex: this.state.diffIndex,
      segment: this.state.segment,
      level: this.state.level,
      victory: this.state.victory ? 1 : 0,
    });
    if (this.history.length > ROUND_HISTORY_MAX) this.history.shift();
  }

  /* Qui n'a pas encore confirme. Point de passage unique : la garde serveur du
     `case "start"` et le libelle d'attente cote client doivent compter la MEME
     chose, sinon le bouton refuse en silence un lancement que le message
     annonce comme possible.

     Aucun filtre sur `spectator`, et c'est deliberement contraire a ce que la
     specification de conception demandait. En phase de salon, `spectator` dit
     « je n'ai pas joue la manche qui vient de finir » : c'est un residu, pas
     une prevision. `startRound()` remet tout le monde a `spectator = false`,
     donc au salon TOUS les presents entrent dans la manche a venir — exclure
     les spectateurs aurait laisse un joueur revenu du mode spectateur incapable
     de se declarer prêt, tout en lancant sans lui. */
  notReady() {
    return this.joined().filter(c => !c.ready);
  }

  /* LE LANCEMENT DIFFERE, et son annulation. Le message porte un DELAI en
     secondes et non une echeance : les deux horloges n'ont aucune raison d'etre
     d'accord, et un `Date.now()` serveur affiche tel quel chez le client donne
     un compte a rebours faux de plusieurs secondes.

     `why` n'existe que pour les annulations SUBIES — quelqu'un s'est dé-prêt,
     quelqu'un est parti. Une annulation volontaire n'a rien a expliquer : celui
     qui vient de cliquer sait pourquoi, et les autres ont vu le bouton. */
  launchPayload(why = "") {
    const reste = this.launchAt ? Math.max(0, this.launchAt - Date.now()) : 0;
    return { t: "launch", delay: +(reste / 1000).toFixed(2), why };
  }

  cancelLaunch(why = "") {
    if (!this.launchAt) return;
    this.launchAt = 0;
    this.broadcast(this.launchPayload(why));
    this.hooks.log(`[${this.code}] lancement annulé${why ? ` — ${why}` : ""}`);
  }

  /* Les CONDITIONS du lancement sont revalidees a chaque tick, et pas seulement
     au clic. Sans ca, les trois secondes ouvrent une fenetre ou la garde du
     `case "start"` ne vaut plus rien : il suffit de se dé-prêt juste apres pour
     entrer dans une manche qu'on n'a pas confirmee. C'est le meme raisonnement
     que la garde serveur elle-meme — desarmer le bouton est de l'affichage. */
  tickLaunch() {
    if (!this.launchAt) return;
    /* UN DEPART N'ANNULE PAS, et c'est delibere : celui qui part etait prêt,
       ceux qui restent le sont toujours, et la manche part avec eux. Annuler
       aurait donne a n'importe qui le pouvoir d'interrompre la table en
       fermant son onglet — alors que le bouton d'annulation est deja la pour
       ceux qui veulent vraiment le dire. Une salle VIDEE, elle, annule : il
       n'y a plus personne pour jouer. */
    if (this.phase !== PHASE_LOBBY || this.joined().length === 0) {
      this.cancelLaunch("la salle a changé d'état");
      return;
    }
    const manquants = this.notReady();
    if (manquants.length > 0) {
      this.cancelLaunch(`${manquants[0].name} n'est plus prêt`);
      return;
    }
    if (Date.now() >= this.launchAt) {
      this.launchAt = 0;
      this.startRound();
    }
  }

  /* Qui est encore DANS le briefing. Meme role que `notReady()` et meme raison
     d'etre un point de passage unique : la decision de lancer la vague et le
     libelle d'attente affiche a ceux qui ont deja ferme doivent compter la meme
     chose, sinon l'un attend quelqu'un que l'autre ne nomme pas.

     Le filtre est `state.players`, et lui seul. C'est la verite de « qui joue » :
     un spectateur n'y est pas, un arrivant en cours de manche non plus, et un
     joueur A TERRE y est — il lit son briefing comme les autres. Corollaire
     essentiel : un joueur qui se DECONNECTE en sort tout seul, donc il ne peut
     pas retenir la vague vingt secondes pour rien. C'est la meme regle qu'un
     marqueur de mecanique dont le porteur disparait. */
  briefWaiting() {
    return this.joined().filter(c => this.state.players.has(c.id) && !c.briefDone);
  }

  /* L'ECHAUFFEMENT SE TERMINE AU PREMIER DES DEUX : tout le monde a ferme le
     briefing, ou l'echeance tombe. L'echeance n'est pas un doublon — c'est le
     filet qui empeche un joueur parti se faire un cafe de retenir la table,
     exactement comme la pause qui se leve seule au bout de cinq minutes.

     `briefOpen` existe pour que cette methode soit appelable de partout sans
     rien diffuser en trop : la fin est un evenement unique, et les appelants
     sont quatre (une confirmation, un depart de manche, une deconnexion, et
     l'echeance vue par la boucle). */
  syncBrief() {
    /* La phase est testee ICI plutot que remise a zero dans `endRound` ET
       `abortRound` : deux sorties de manche a ne pas oublier, c'est exactement
       le trou qui se paie une fois sur deux. Une manche qui s'interrompt pendant
       le briefing laisse donc `briefOpen` a vrai — sans consequence, puisque
       `startRound` le repose et que plus personne ne peut le lire. */
    if (!this.briefOpen || this.phase !== PHASE_ROUND) return;
    const attente = this.briefWaiting();
    if (attente.length > 0 && this.state.warmup > 0) {
      this.broadcast({ t: "briefState", waiting: attente.map(c => c.name) });
      return;
    }
    this.briefOpen = false;
    if (this.state.warmup > 0) {
      // Couper `warmup` relance d'un coup les vagues, le tir automatique et
      // l'horloge de manche : c'est le seul champ a toucher, `step()` fait le
      // reste tout seul.
      this.state.warmup = 0;
      this.hooks.log(`[${this.code}] briefing fermé par tous — la vague part`);
    }
    this.broadcast({ t: "briefState", waiting: [] });
  }

  lobbyPayload() {
    /* Recalcul AVANT la diffusion, et c'est le point de passage qui rend le
       reste inutile : le salon est rediffuse a chaque changement — arrivee,
       depart, choix de classe — donc la couleur suit la classe sans qu'aucun
       de ces trois endroits ait a y penser. Idempotent, quatre clients au plus. */
    this.assignColors();
    const vote = this.votedDifficulty();
    return {
      t: "lobby",
      phase: this.phase,
      host: this.hostId,
      round: this.roundNumber,
      // Le nom de la salle accompagne le salon : le titre dit OU l'on est,
      // maintenant qu'il existe plusieurs endroits ou etre.
      roomName: this.name,
      difficulty: vote.index,
      tally: vote.tally,
      modes: DIFFICULTIES.map(d => d.label),
      /* La VARIANTE DE SCRIPT retenue (lot T). Le client la connait deja par
         `DIFFICULTIES[difficulty].script` — il importe la meme table — mais elle
         voyage quand meme : c'est le serveur qui decide de la manche, et le jour
         ou une variante se tirera au hasard (A/B/C) le champ sera deja la et le
         client n'aura rien a changer. Un nom et non un index : la table des
         variantes n'est pas un tableau ordonne dont l'index circule. */
      script: DIFFICULTIES[vote.index]?.script ?? "normal",
      /* LE BIOME ET SA GRAINE (lot V). Deux nombres, envoyes une fois — c'est
         TOUT ce que le lot coute au reseau : le client en regenere la geometrie
         a l'identique (`buildBiome`, module pur, meme generateur des deux cotes)
         et deduit l'etat des dangers du temps de manche, deja present dans le
         snapshot. Meme raisonnement que les traits du lot S, sans meme
         l'exception de l'anticipation de ruee.

         Ils accompagnent le salon et non le message `round` : le salon est
         rediffuse a toute arrivee, donc un joueur qui rejoint EN COURS DE MANCHE
         recoit la geometrie sans qu'on ait a la lui renvoyer a part. Ils sont
         portes par la SALLE et non par `state` — un `null` avant la premiere
         manche dirait qu'il n'y a pas encore de biome, ce qui est faux : il y en
         a un des la construction, il n'est simplement pas encore joue. */
      biome: this.biomeIndex,
      seed: this.seed,
      /* La plus RECENTE en tete : c'est celle qu'on cherche, et une liste
         chronologique obligerait a descendre jusqu'en bas pour la trouver.
         `slice()` avant `reverse()`, qui mute en place — l'ordre de la salle
         est celui de l'insertion et doit le rester. */
      history: this.history.slice().reverse(),
      players: this.joined().map(c => ({
        id: c.id,
        name: c.name,
        colorIndex: c.colorIndex,
        spectator: c.spectator,
        vote: c.vote,
        total: c.total,
        cls: c.cls,
        clsLocked: c.clsLocked,
        ready: c.ready ? 1 : 0,
        /* Le ping voyage avec le salon plutot que dans un message periodique :
           `lobbyPayload()` n'est diffuse que sur evenement (arrivee, vote,
           choix de classe, prêt), donc le chiffre a quelques secondes au
           salon — sans importance, on ne joue pas. Un message a 1 Hz aurait
           fait d'un salon inactif un salon bavard. */
        ping: c.conn.rtt != null ? Math.round(c.conn.rtt) : -1,
      })),
    };
  }

  expandCards(p) {
    const out = [];
    for (const [id, n] of p.cards) for (let i = 0; i < n; i++) out.push(id);
    return out;
  }

  loadoutPayload() {
    const byPlayer = {};
    const relics = {};
    for (const p of this.state.players.values()) {
      byPlayer[p.id] = this.expandCards(p);
      /* Reliques (lot K), dans un champ SEPARE : un onglet reste sur une
         version anterieure lit `byPlayer` comme avant et ignore `relics`
         (cle inconnue). Elles sont la pour la fenetre de build, qui doit
         afficher l'indice de puissance REEL — celui qui pilote les PV du
         boss — et il inclut le flat des reliques. */
      relics[p.id] = [...p.relics.keys()];
    }
    return { t: "loadout", byPlayer, relics };
  }

  scoreboardRows() {
    return this.joined().map(c => {
      const p = this.state.players.get(c.id);
      return {
        id: c.id,
        name: c.name,
        colorIndex: c.colorIndex,
        played: !!p,
        cls: p ? p.cls : c.cls,
        level: p ? this.state.level : 1,
        score: p ? p.score : 0,
        kills: p ? p.kills : 0,
        deaths: p ? p.deaths : 0,
        damage: p ? Math.round(p.damageDealt) : 0,
        /* Les SOINS rendus, a cote des degats. La simulation les comptait deja
           (`p.healDealt`, meme raison que `damageDealt`) mais ils ne sortaient
           nulle part : le soigneur lisait donc son bilan sur la seule colonne
           ou il est structurellement dernier. Un champ de plus dans un message
           envoye UNE fois par manche — rien a voir avec l'instantane. */
        heal: p ? Math.round(p.healDealt) : 0,
        hurtBy: p ? p.hurtBy.map(v => Math.round(v)) : [],
        cards: p ? this.expandCards(p) : [],
        total: c.total,
        cores: c.lastGain ?? 0,
        /* Verdict personnel de la victoire finale (lot N) : « record » si le
           temps ameliore le meilleur de CE compte a cette difficulte,
           « victoire » sinon. Pose par le hub dans `awardRun`, nul hors
           victoire — c'est ce qui permet a chacun de lire son propre resultat
           sur un ecran commun. */
        final: c.lastFinal ?? null,
      };
    }).sort((a, b) => b.score - a.score);
  }

  /* --- pause ------------------------------------------------------------------ */

  /* Levee de pause, quelle qu'en soit la raison. Point de passage unique :
     trois causes (demande du joueur, echeance, arrivee d'un second joueur) et
     un seul endroit ou l'etat retombe. */
  setPaused(on, why = "") {
    if (this.paused === on) return;
    this.paused = on;
    this.pausedAt = on ? Date.now() : 0;
    this.broadcast({ t: "paused", on: on ? 1 : 0, why });
    this.hooks.log(`[${this.code}] ` + (on ? "manche en pause (solo)"
      : `pause levée${why ? ` — ${why}` : ""}`));
  }

  /* --- cartes ----------------------------------------------------------------- */

  cardsPendingIds() {
    return [...this.state.players.keys()]
      .filter(id => !this.cardPicked.has(id) && this.clients.has(id));
  }

  enterCardPhase() {
    this.phase = PHASE_CARDS;
    this.state.cardsPending = false;
    this.cardPicked.clear();
    this.cardDeadline = Date.now() + CARD_CFG.PICK_TIME * 1000;

    for (const [id, offers] of this.state.cardOffers) {
      const c = this.clients.get(id);
      if (!c) continue;
      c.conn.send(JSON.stringify({
        t: "cards",
        reroll: c.profile?.confort.includes("relance") && !c.rerollUsed ? 1 : 0,
        /* `bossWave` redevient une VRAIE question depuis le lot X : un ecran
           s'ouvre a chaque niveau, en pleine horde, et seuls ceux qui suivent un
           combat portent le nom du boss vaincu. `relicBossDue` est le drapeau
           exact — pose a la mort du boss, efface par l'ouverture du marchand,
           donc vrai pendant toute la file d'ecrans qui les separe. */
        segment: this.state.segment,
        bossWave: this.state.relicBossDue ? 1 : 0,
        boss: this.state.bossCount,
        bossKind: this.state.lastBossKind,
        more: this.state.pendingLevels,
        level: this.state.level,
        deadline: this.cardDeadline,
        offers: offers.map(cardBrief),
      }));
    }
    this.broadcast({ t: "cardsWait", pending: this.cardsPendingIds() });
    this.hooks.log(`[${this.code}] ${segmentName(this.state.segment)} — choix de cartes`
      + ` (niveau ${this.state.level}`
      + `${this.state.pendingLevels > 0 ? `, ${this.state.pendingLevels} autre(s) à suivre` : ""})`);
  }

  forceRemainingPicks() {
    let forced = 0;
    for (const [id, offers] of this.state.cardOffers) {
      if (this.cardPicked.has(id)) continue;
      const p = this.state.players.get(id);
      if (p && offers.length) { this.state.takeCard(p, offers[0]); forced++; }
      this.cardPicked.add(id);
    }
    if (forced > 0) {
      this.hooks.log(`[${this.code}] délai de choix écoulé — ${forced} carte(s) d'office`);
    }
  }

  /* --- marchand (lot K) -------------------------------------------------------

     Miroir exact de la phase cartes : l'ecran s'ouvre quand GameState pose
     `relicPending` (pose par _endWave apres une victoire de boss), la boucle
     s'arrete, et la phase se gere comme PHASE_CARDS — deadline comprise, sauf
     qu'a l'echeance on ne FORCE aucun achat : on ferme. Un joueur qui ne fait
     rien garde ses eclats, c'est la difference avec une carte qu'il faut bien
     choisir. */

  merchantPendingIds() {
    return [...this.state.players.keys()]
      .filter(id => this.state.relicOffers.has(id) && this.clients.has(id));
  }

  enterMerchantPhase() {
    this.phase = PHASE_MERCHANT;
    this.state.relicPending = false;
    this.merchantDeadline = Date.now() + RELIC_CFG.PICK_TIME * 1000;

    for (const [id, offers] of this.state.relicOffers) {
      const c = this.clients.get(id);
      if (!c) continue;
      const p = this.state.players.get(id);
      c.conn.send(JSON.stringify({
        t: "merchant",
        segment: this.state.segment,
        deadline: this.merchantDeadline,
        eclats: p ? p.eclats : 0,
        rerollCost: relicRerollCost(this.state.level),
        offers,
      }));
    }
    this.broadcast({ t: "merchantWait", pending: this.merchantPendingIds() });
    this.hooks.log(`[${this.code}] boss vaincu — marchand ouvert`);
  }

  /* Le joueur a fini (achete ou passe). Il sort de l'attente ; quand plus
     personne n'attend, le tick ferme et reprend la manche. */
  merchantDone(id) {
    this.state.relicOffers.delete(id);
  }

  /* L'offre a jour a UN joueur : apres un achat ou une relance, le solde a
     change et la relique achetée est sortie de l'offre. */
  merchantSend(id) {
    const c = this.clients.get(id);
    const p = this.state.players.get(id);
    if (!c || !p) return;
    const offers = this.state.relicOffers.get(id);
    if (!offers) return;
    c.conn.send(JSON.stringify({
      t: "merchant",
      segment: this.state.segment,
      deadline: this.merchantDeadline,
      eclats: p.eclats,
      rerollCost: relicRerollCost(this.state.level),
      offers,
    }));
  }

  forceMerchantClose() {
    this.state.closeMerchant();
  }

  /* La salle ne connait plus l'ORDRE des ecrans — cartes puis marchand — elle
     demande le suivant. `openNextScreen()` est le point de passage unique cote
     simulation (lot X) : il etait disperse ici, dans `_killBoss` et dans
     `_addXp`, et le marchand y avait purement disparu depuis que `_endWave`
     n'existe plus. */
  resumeRound() {
    const ecran = this.state.openNextScreen();
    if (ecran === "cards") { this.enterCardPhase(); return; }
    if (ecran === "merchant") { this.enterMerchantPhase(); return; }
    this.phase = PHASE_ROUND;
    this.state.cardOffers = new Map();
    this.broadcast(this.loadoutPayload());
  }

  /* --- manche ----------------------------------------------------------------- */

  startRound() {
    this.roundNumber++;
    this.setPaused(false);
    const diff = this.votedDifficulty().index;
    this.state = new GameState(diff, this.biomeIndex, this.seed);
    this.cardPicked.clear();
    /* Les classes non choisies retombent sur le tireur AVANT l'attribution des
       couleurs, et l'attribution avant `addPlayer` : elle depend de la classe,
       et un `null` ne dirait pas quelle teinte prendre. Deux passes plutot
       qu'une, pour cette seule raison. */
    for (const c of this.joined()) if (c.cls === null) c.cls = CLASS_DEFAULT;
    this.assignColors();
    for (const c of this.joined()) {
      c.spectator = false;
      c.clsLocked = true;
      /* Remise a zero AU LANCEMENT, et non a la sortie de manche : le salon se
         reaffiche entre deux manches, et un `ready` herite ferait demarrer la
         suivante sans que personne n'ait rien reconfirme. Meme raison que le
         verrou de classe pose ici plutot qu'au choix. */
      c.ready = false;
      /* Le briefing de la manche PRECEDENTE ne vaut pas pour celle-ci : sans
         cette ligne, la deuxieme manche partirait sans que personne n'ait eu le
         temps de lire quoi que ce soit. Meme endroit et meme raison que
         `ready` — au lancement, jamais a la sortie de manche. */
      c.briefDone = false;
      /* Progression permanente (lot D) : la simulation recoit les lignes
         EQUIPEES de la classe jouee, les achats de confort et les cartes
         encore verrouillees. La salle LIT le profil — elle n'y ecrit jamais,
         c'est l'affaire du hub. */
      let meta = null;
      if (c.profile) {
        const clsId = CLASSES[c.cls].id;
        const cp = c.profile.classes[clsId];
        const lines = {};
        if (cp) {
          for (const lid of cp.equipped ?? []) {
            const t = cp.tiers?.[lid] | 0;
            if (t > 0) lines[lid] = t;
          }
        }
        meta = {
          lines,
          confort: {
            ravitaillement: c.profile.confort.includes("ravitaillement") ? 1 : 0,
            quatrieme: c.profile.confort.includes("quatrieme") ? 1 : 0,
          },
          locked: (() => {
            /* Le ban (lot J) emprunte le mecanisme des jalons : `locked` est
               deja le filtre « n'apparait jamais dans un tirage », en amont
               du tirage — exactement la garantie que le ban demande. */
            const locked = lockedCards(c.profile.milestones);
            for (const bid of c.profile.bannedCards ?? []) locked.add(bid);
            return locked;
          })(),
        };
      }
      c.rerollUsed = false;
      /* Verdict de victoire finale (lot N) remis a zero au LANCEMENT et non a
         la fin : le bilan le lit apres `endRound`, l'effacer la-bas l'aurait
         efface avant qu'il ne serve. */
      c.lastFinal = null;
      this.state.addPlayer(c.id, c.name, c.colorIndex, c.cls, meta);
      c.input.x = 0; c.input.y = 0; c.input.dash = false;
      c.input.s1 = false; c.input.s2 = false; c.input.s3 = false;
    }
    /* La manche demarre TOUT DE SUITE : les joueurs se deplacent des la
       premiere image, l'ecran de briefing est un voile qu'on ferme quand on
       veut. C'est `state.warmup` qui retient la vague, pas la phase — une
       phase a part aurait fige la simulation, donc interdit le deplacement que
       le bouton « continuer » est justement la pour rendre. */
    this.state.warmup = WARMUP_S;
    /* Le briefing est OUVERT pour la salle tant que quelqu'un ne l'a pas ferme.
       Il se referme au premier des deux : `syncBrief()` sur la derniere
       confirmation, ou l'echeance vue par la boucle. */
    this.briefOpen = true;
    this.phase = PHASE_ROUND;
    // Repartir la simulation sur le cycle de la boucle : la manche demarre au
    // clic de l'hote, mais deux salles lancees dans la meme seconde ne doivent
    // pas simuler dans le meme tour (infra-salons.md § 6).
    this.acc = -this.staggerFrac * CFG.TICK;
    this.broadcast({
      t: "round",
      round: this.roundNumber,
      difficulty: diff,
      // En SECONDES et depuis le serveur : le client n'a aucune constante de
      // duree a lui, il ne fait qu'afficher celle-ci.
      warmup: WARMUP_S,
    });
    this.broadcast(this.lobbyPayload());
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] manche ${this.roundNumber} lancée — `
      + `${this.state.players.size} joueur(s), difficulté ${DIFFICULTIES[diff].label}`
      + `, ${WARMUP_S} s d'échauffement`);
  }

  abortRound() {
    this.phase = PHASE_LOBBY;
    this.setPaused(false);
    this.unlockClasses();
    this.recordRound();
    this.drawBiome();
    this.hooks.log(`[${this.code}] manche ${this.roundNumber} interrompue — plus aucun joueur en jeu`);
    this.broadcast({ t: "roundAbort", round: this.roundNumber });
    this.broadcast(this.lobbyPayload());
    this.hooks.occupancy(this);
  }

  endRound() {
    this.phase = PHASE_LOBBY;
    this.setPaused(false);
    this.unlockClasses();
    this.recordRound();
    // Le biome de la manche SUIVANTE se tire ici, avant la diffusion du salon :
    // c'est lui que l'ecran de salon doit annoncer, pas celui qu'on vient de
    // finir. `abortRound` fait de meme.
    this.drawBiome();
    /* La victoire est relevee AVANT `awardRun`, qui la consomme en
       l'enregistrant au classement : sans cette copie, le bilan ne saurait plus
       qu'il y a eu victoire et afficherait une fin de manche ordinaire —
       exactement l'ecran qu'on cherche a distinguer.
       `state.victory` (plan 5) et non `finalVictory` : la victoire est posee par
       `_nextSegment` quand les six segments sont franchis, et elle est deja ce
       que le `roundEnd` transporte. */
    const final = this.state.victory;
    /* Les noyaux se versent AVANT le tableau : `scoreboardRows` lit `lastGain`
       pour afficher le gain de chacun. C'est le hub qui ecrit — la salle emet
       l'evenement, la persistance ne la concerne pas. */
    this.hooks.awardRun(this);
    for (const c of this.joined()) {
      const p = this.state.players.get(c.id);
      if (!p) continue;
      c.total.score += p.score;
      c.total.kills += p.kills;
      c.total.deaths += p.deaths;
      c.total.rounds += 1;
    }
    const rows = this.scoreboardRows();
    this.broadcast({
      t: "roundEnd",
      round: this.roundNumber,
      segment: this.state.segment,
      // Le NIVEAU atteint est desormais le resultat qui distingue deux manches :
      // le segment est le meme pour tout le monde par construction, le niveau
      // se gagne. Il paie la monnaie et il titre le bilan.
      level: this.state.level,
      // Une manche peut desormais se GAGNER : six segments, six boss. Le bilan
      // ne peut pas le deduire — un segment 6 atteint et un script termine se
      // ressemblent — donc le drapeau voyage.
      victory: this.state.victory ? 1 : 0,
      /* Le biome JOUE, et non celui que le salon vient de tirer pour la manche
         suivante. Sans lui, deux temps ne sont pas comparables — c'est la seule
         raison pour laquelle il figure au bilan, et c'est ce que le lot X
         enregistrera avec le score. */
      biome: this.state.biomeIndex,
      /* Duree du COMBAT FINAL seul (lot W), 0 s'il n'a pas ete vaincu. C'est le
         chiffre qui se classe : le temps pour ATTEINDRE le boss final est une
         constante sous D1 — 1800 s de horde plus les cinq combats — donc il ne
         distinguerait aucune equipe. Le bilan l'affiche pour la meme raison
         qu'il affiche la victoire : il ne se deduit d'aucun autre champ. */
      finalKill: this.state.finalKill,
      time: Math.round(this.state.time),
      kills: this.state.totalKills,
      host: this.hostId,
      rows,
      /* Victoire finale : cle ABSENTE dans le cas ordinaire — un onglet reste
         sur une version anterieure ne la lit pas et affiche le bilan normal, ce
         qui reste juste. Chaque client y trouve aussi son propre verdict
         (`record` ou `victoire`), pose par le hub.

         `time` est la MISE A MORT du boss final et non la duree de la manche :
         sous D1 celle-ci est dominee par une constante — 1800 s de horde plus
         les cinq combats precedents — donc elle ne distinguerait aucune equipe.
         Le contexte l'accompagne, parce qu'un temps ne se compare qu'a
         variante, biome et effectif egaux. */
      ...(final ? {
        final: {
          time: this.state.finalKill,
          level: this.state.level,
          difficulty: this.state.diffIndex,
          variant: DIFFICULTIES[this.state.diffIndex]?.script ?? "normal",
          biome: this.state.biomeIndex,
          players: this.joined().length,
        },
      } : {}),
    });
    this.broadcast(this.lobbyPayload());
    // Le solde de compte part APRES le bilan : voir awardRun cote hub.
    for (const c of this.joined()) if (c.profile) this.hooks.sendProgress(c);
    this.hooks.occupancy(this);
    this.hooks.log(`[${this.code}] manche ${this.roundNumber} terminée — `
      + `${Math.round(this.state.time)} s, ${this.state.totalKills} kills`);
  }

  /* --- messages de jeu --------------------------------------------------------- */

  /* Tout ce qui n'a de sens QUE dans une partie. Le hub route ici apres avoir
     traite les messages d'etat hub — un message de jeu recu hors salle est
     rejete la-bas, c'est exactement le type de message qu'un client modifie
     enverrait. */
  handleMessage(client, msg) {
    const id = client.id;
    switch (msg.t) {
      case "input": {
        // Le serveur ne fait jamais confiance au client : on borne le vecteur.
        let x = Number(msg.x) || 0;
        let y = Number(msg.y) || 0;
        const d = Math.hypot(x, y);
        if (d > 1) { x /= d; y /= d; }
        client.input.x = x;
        client.input.y = y;

        const ax = Number(msg.ax);
        const ay = Number(msg.ay);
        if (Number.isFinite(ax) && Number.isFinite(ay) && (ax !== 0 || ay !== 0)) {
          const ad = Math.hypot(ax, ay);
          client.input.ax = ax / ad;
          client.input.ay = ay / ad;
        }

        client.input.ar = bombRange(msg.ar);

        if (msg.d) client.input.dash = true;
        if (msg.s1) client.input.s1 = true;
        if (msg.s2) client.input.s2 = true;
        if (msg.s3) client.input.s3 = true;
        break;
      }

      case "pickClass": {
        if (client.clsLocked) break;
        const v = Number(msg.cls);
        if (!Number.isInteger(v) || v < 0 || v >= CLASSES.length) break;
        if (CLASSES[v].unique && client.cls !== v && this.takenClasses().has(v)) break;
        client.cls = v;
        this.broadcast(this.lobbyPayload());
        break;
      }

      case "vote": {
        if (this.phase !== PHASE_LOBBY) break;
        const v = Number(msg.v);
        if (!Number.isInteger(v) || v < 0 || v >= DIFFICULTIES.length) break;
        client.vote = v;
        this.broadcast(this.lobbyPayload());
        break;
      }

      /* Prêt. Meme forme et meme garde de phase que `vote` — c'est le meme
         genre d'etat de salon, et la garde de phase suffit : hors salon
         personne n'a de bouton, et au salon tout le monde entre (cf.
         `notReady()`). */
      case "ready": {
        if (this.phase !== PHASE_LOBBY) break;
        client.ready = !!msg.on;
        this.broadcast(this.lobbyPayload());
        break;
      }

      case "pickCard": {
        if (this.phase !== PHASE_CARDS || this.cardPicked.has(id)) break;
        const offers = this.state.cardOffers.get(id);
        const p = this.state.players.get(id);
        if (!offers || !p || !offers.includes(msg.id)) break;
        if (!this.state.takeCard(p, msg.id)) break;

        this.cardPicked.add(id);
        this.broadcast(this.loadoutPayload());
        this.broadcast({ t: "cardsWait", pending: this.cardsPendingIds() });
        break;
      }

      /* Marchand (lot K). Memes gardes que pickCard — l'offre courante, la
         phase ouverte — plus le solde verifie DANS le GameState (un client ne
         peut pas tricher le montant de ses eclats, et la limite de legendaire
         par manche y vit). Apres un achat, on renvoie l'offre a jour : le
         solde a change, la relique achetée est sortie de l'offre. */
      case "buyRelic": {
        if (this.phase !== PHASE_MERCHANT) break;
        const p = this.state.players.get(id);
        if (!p || !this.state.relicOffers.has(id)) break;
        if (!this.state.buyRelic(p, msg.id)) break;
        this.merchantSend(id);
        this.broadcast({ t: "merchantWait", pending: this.merchantPendingIds() });
        break;
      }

      /* Relance de l'offre contre des eclats, cout croissant avec la vague.
         C'est un choix de BUDGET : le cout est debite dans le GameState, et
         une relance qui echoue (pas assez d'eclats) ne change rien. */
      case "rerollRelic": {
        if (this.phase !== PHASE_MERCHANT) break;
        const p = this.state.players.get(id);
        if (!p || !this.state.relicOffers.has(id)) break;
        if (!this.state.rerollRelic(p)) break;
        this.merchantSend(id);
        this.broadcast({ t: "merchantWait", pending: this.merchantPendingIds() });
        break;
      }

      /* Passer : le joueur annonce qu'il a fini. On ne force jamais d'achat —
         a l'echeance, le serveur ferme et garde les eclats. */
      case "skipMerchant": {
        if (this.phase !== PHASE_MERCHANT) break;
        if (!this.state.relicOffers.has(id)) break;
        this.merchantDone(id);
        this.broadcast({ t: "merchantWait", pending: this.merchantPendingIds() });
        break;
      }

      /* Bannissement (lot J). Memes gardes que pickCard — la carte doit
         figurer dans l'OFFRE COURANTE de ce joueur, la phase etre ouverte —
         plus l'idempotence. Bannir CONSOMME la phase : pas de selection, pas
         de carte de remplacement. La cloture de dependances est calculee ici
         et ecrite a plat ; `p.locked` est mis a jour dans la foulee pour que
         le prochain ecran de la meme manche ne re-propose jamais la carte. */
      case "banCard": {
        if (this.phase !== PHASE_CARDS || this.cardPicked.has(id)) break;
        const offers = this.state.cardOffers.get(id);
        const p = this.state.players.get(id);
        if (!offers || !p || !offers.includes(msg.id)) break;
        if (!client.profile) break;
        const pr = client.profile;
        pr.bannedCards ??= [];
        if (pr.bannedCards.includes(msg.id)) break;

        const closure = banClosure(msg.id).filter(bid => !pr.bannedCards.includes(bid));
        pr.bannedCards.push(...closure);
        p.locked ??= new Set();
        for (const bid of closure) p.locked.add(bid);
        this.hooks.persist(client);
        this.hooks.sendProgress(client);

        this.cardPicked.add(id);
        this.broadcast({ t: "cardsWait", pending: this.cardsPendingIds() });
        this.hooks.log(`[${this.code}] ${client.name} bannit ${msg.id}`
          + (closure.length > 1 ? ` (+${closure.length - 1} dépendante(s))` : ""));
        break;
      }

      case "pause": {
        if (this.phase !== PHASE_ROUND) break;
        const on = !!msg.on;
        if (on && (this.joined().length > 1 || !this.state.players.has(id))) break;
        this.setPaused(on, on ? "" : "reprise");
        break;
      }

      /* LE BRIEFING FERME. Il ne lance rien a lui seul : il retire une voix de
         la liste d'attente, et c'est `syncBrief()` qui decide. Trois gardes, les
         memes que partout ailleurs — la phase, le fait d'etre reellement en jeu
         (un spectateur n'a pas de briefing a fermer, et le compter aurait retenu
         la vague pour quelqu'un qui regarde), et l'idempotence : deux clics ou
         un client modifie ne doivent pas rediffuser l'etat pour rien. */
      case "briefDone": {
        if (this.phase !== PHASE_ROUND || !this.state.players.has(id)) break;
        if (client.briefDone) break;
        client.briefDone = true;
        this.syncBrief();
        break;
      }

      case "leaveRound": {
        if (this.phase === PHASE_LOBBY || !this.state.players.has(id)) break;
        this.hooks.awardPartial(client, this);
        this.state.removePlayer(id);
        this.hooks.sendProgress(client);
        client.spectator = true;
        this.setPaused(false, "le joueur a quitté la manche");
        // Il vient de sortir de `state.players`, donc de la liste d'attente :
        // sans ce recompte, les autres attendraient le briefing d'un joueur qui
        // n'est plus dans la manche.
        this.syncBrief();
        this.broadcast(this.lobbyPayload());
        this.hooks.log(`[${this.code}] ${client.name} quitte la manche ${this.roundNumber}`);
        break;
      }

      case "start": {
        if (id !== this.hostId || this.phase !== PHASE_LOBBY) break;
        if (this.joined().length === 0) break;
        /* Desarmer le bouton cote client est de l'AFFICHAGE, pas une regle :
           un client modifie enverrait `{ t: "start" }` directement. La garde
           vit donc ici aussi, au meme titre que `id !== this.hostId`. */
        if (this.notReady().length > 0) break;
        // Idempotence : un second clic pendant le compte a rebours ne le
        // raccourcit pas et ne le relance pas non plus.
        if (this.launchAt) break;
        this.launchAt = Date.now() + LAUNCH_DELAY_MS;
        this.broadcast(this.launchPayload());
        this.hooks.log(`[${this.code}] lancement dans ${LAUNCH_DELAY_MS / 1000} s`);
        break;
      }

      /* N'IMPORTE QUI ANNULE, pas seulement l'hote. Le compte a rebours existe
         pour rattraper une erreur, et l'erreur n'est pas toujours celle de
         l'hote : c'est aussi « attends, je me suis trompe de classe ». Trois
         secondes pour dire non a une manche qu'on va jouer, c'est un droit qui
         appartient a la table. La garde d'hote reste sur le LANCEMENT, ou elle
         a un sens — decider quand on part. */
      case "cancelStart": {
        if (this.phase !== PHASE_LOBBY || !this.launchAt) break;
        /* Pas de `lobbyPayload()` derriere : rien du salon n'a change, et le
           renvoyer ferait reecrire par `refreshPanel()` la ligne d'attente que
           le message d'annulation vient de poser. */
        this.cancelLaunch(`annulé par ${client.name}`);
        break;
      }

      case "reroll": {
        if (this.phase !== PHASE_CARDS || this.cardPicked.has(id)) break;
        if (!client.profile?.confort.includes("relance") || client.rerollUsed) break;
        const p = this.state.players.get(id);
        if (!p || !this.state.cardOffers.has(id)) break;
        client.rerollUsed = true;
        const offers = this.state.offerCards(p);
        this.state.cardOffers.set(id, offers);
        client.conn.send(JSON.stringify({
          t: "cards",
          reroll: 0,
          segment: this.state.segment,
          bossWave: 1,
          boss: this.state.bossCount,
          bossKind: this.state.lastBossKind,
          more: this.state.pendingLevels,
          level: this.state.level,
          deadline: this.cardDeadline,
          offers: offers.map(cardBrief),
        }));
        break;
      }
    }
  }

  /* --- boucle ------------------------------------------------------------------ */

  /* Un pas de la boucle partagee. `dt` est deja borne par le hub (0,25 s max) :
     chaque salle garde son propre accumulateur, mais l'horloge est commune. */
  tick(dt) {
    // Hors de la chaine ci-dessous : le compte a rebours de lancement vit en
    // phase de SALON, la seule que cette chaine ne traite pas.
    this.tickLaunch();
    if (this.phase !== PHASE_LOBBY && this.state.players.size === 0) {
      this.abortRound();
    } else if (this.phase === PHASE_ROUND && this.paused) {
      /* En pause : on n'appelle PAS step(). Les recharges et les etats vivent
         dans p.timers et p.statuses, qui ne descendent que la. L'accumulateur
         est vide a chaque tour, sinon la reprise rattraperait d'un coup toute
         la duree de la pause. Les instantanes continuent de partir. */
      this.acc = 0;
      if (Date.now() - this.pausedAt > PAUSE_MAX_MS) {
        this.setPaused(false, "délai de 5 minutes écoulé");
      }
    } else if (this.phase === PHASE_ROUND) {
      this.acc += dt;
      while (this.acc >= CFG.TICK && !this.state.cardsPending && !this.state.relicPending) {
        this.inputs.clear();
        for (const c of this.clients.values()) if (!c.spectator) this.inputs.set(c.id, c.input);
        this.state.step(CFG.TICK, this.inputs);
        // Les demandes ponctuelles ne valent que pour un tick ; `ax`, `ay` et
        // `ar` sont des etats continus, on ne les vide pas.
        for (const c of this.clients.values()) {
          c.input.dash = false;
          c.input.s1 = false;
          c.input.s2 = false;
          c.input.s3 = false;
        }
        this.acc -= CFG.TICK;
      }

      if (this.state.alerts.length > 0) {
        for (const a of this.state.alerts) this.broadcast({ t: "alert", ...a });
        this.state.alerts.length = 0;
      }
      /* L'ECHEANCE, vue par la boucle. C'est le quatrieme et dernier appelant de
         `syncBrief()`, et le seul qui ne soit pas un evenement : `warmup`
         descend dans `step()`, personne ne previent quand il touche zero. Le
         test est deux comparaisons par tick tant que le briefing est ouvert, et
         plus rien du tout ensuite. */
      if (this.briefOpen && this.state.warmup <= 0) this.syncBrief();
      /* VICTOIRE : la manche s'arrete sur la mort du boss final, elle ne se
         poursuit pas en segment 7. C'est la fin du contenu — laisser la boucle
         continuer aurait transforme le combat final en simple etape, et le
         classement au temps n'aurait plus rien mesure.
         Teste AVANT `gameOver` : une equipe qui tombe dans la meme image que le
         coup fatal a gagne, pas perdu. `_nextSegment` pose d'ailleurs les deux
         drapeaux ensemble, donc l'ordre de ces deux lignes EST la regle. */
      if (this.state.victory) this.endRound();
      else if (this.state.gameOver) this.endRound();
      else if (this.state.cardsPending) { this.acc = 0; this.enterCardPhase(); }
      else if (this.state.relicPending) { this.acc = 0; this.enterMerchantPhase(); }
    } else if (this.phase === PHASE_CARDS) {
      this.acc = 0;
      if (this.cardsPendingIds().length === 0 || Date.now() >= this.cardDeadline) {
        this.forceRemainingPicks();
        this.resumeRound();
      }
    } else if (this.phase === PHASE_MERCHANT) {
      this.acc = 0;
      if (this.merchantPendingIds().length === 0 || Date.now() >= this.merchantDeadline) {
        this.forceMerchantClose();
        this.resumeRound();
      }
    } else {
      this.acc = 0;
    }

    this.sinceSnapshot += dt;
    if (this.sinceSnapshot >= SNAPSHOT_INTERVAL) {
      /* Remise a zero RELATIVE et non absolue : conserver le decalage de
         diffusion pose a la creation, sinon toutes les salles reconvergent
         vers le meme instant d'envoi au premier ralentissement.

         Le code faisait `= 0` malgre ce commentaire, et ca coutait cher :
         l'absolue jette le depassement, donc la periode de diffusion se
         QUANTIFIE sur un multiple de la periode de la boucle partagee. Mesure
         sur ce VPS : `setInterval(1000/120)` reveille toutes les 8,2 ms en
         moyenne (min 7,1, max 9,3) et non 8,333 — donc 6 tours font 49,2 ms,
         soit moins de 50, et il en fallait SEPT. Resultat simule sur 60 s a
         periode constante : 17,40 Hz au lieu de 20, espacement 57,4 ms.
         En relatif le residu s'accumule et la cadence revient a 19,98 Hz.

         Ce que ca ne corrige PAS, mesure aussi : le PIRE espacement ne bouge
         pas (58,7 ms en relatif contre 59,1 en absolu, avec la gigue reelle du
         minuteur). C'est lui qui affame l'interpolation du client, pas la
         moyenne — on rachete ~7 ms de tolerance a la gigue reseau, pas plus.

         Un `if` et non un `while` : un retard de plus d'une periode ne se
         rattrape pas, deux instantanes emis dans le meme tour porteraient
         exactement le meme etat puisque la simulation n'a tourne qu'une fois.
         Le cas se produit vraiment — `dt` est borne a 0,25 s par le hub, soit
         cinq periodes d'un coup apres un hoquet. */
      this.sinceSnapshot -= SNAPSHOT_INTERVAL;
      if (this.sinceSnapshot >= SNAPSHOT_INTERVAL) this.sinceSnapshot = 0;
      if (PERF_ON) {
        const t = nowMs();
        if (this.perf.lastSend > 0) this.perf.esp.add(t - this.perf.lastSend);
        this.perf.lastSend = t;
      }
      if (this.clients.size > 0 && this.phase === PHASE_ROUND) {
        const snap = this.state.snapshot();
        snap.ph = this.phase;
        this.broadcast(snap);
      }
      if (this.phase === PHASE_ROUND && this.state.bossDmg.size > 0) this.state.bossDmg.clear();
    }
  }
}
