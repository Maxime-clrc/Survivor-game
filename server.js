/* ===========================================================================
   AMORCE DU SERVEUR : HTTP, WebSocket, page admin, cablage.
   Un seul port : le meme serveur HTTP sert les fichiers du jeu et accepte les
   connexions WebSocket. Aucune configuration cote joueur, aucun CORS.

   Depuis le refactor en salons (plan infra), la logique de partie vit dans
   room.js et le registre des salles dans hub.js — ce fichier ne garde que ce
   qui existe une seule fois par processus : le serveur HTTP, la persistance,
   la boucle d'intervalle et l'admin. Le decoupage n'est pas cosmetique :

     server.js    amorce : HTTP, WebSocket, page admin, cablage
     hub.js       registre des salles, comptes, progression — SEUL a ecrire
     room.js      une partie : GameState, clients, phases, tick

   Le TLS n'est PAS ici : c'est le travail du proxy inverse (Caddy/nginx),
   Node continue de parler HTTP en local et le client bascule deja en wss://
   quand la page est servie en HTTPS.
   =========================================================================== */

import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
// Synchrones, et uniquement pour le journal : voir `log()` plus bas — la
// derniere ligne avant un plantage doit etre sur le disque, pas dans un tampon.
import { appendFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { attachWebSocket } from "./ws_lite.js";
import { createHub } from "./hub.js";
import { createStore } from "./progress_store.js";
import { VERSION } from "./shared/version.js";
import { setPerf, PERF_ON } from "./perf.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
/* 7777 et non 8080 : derriere un proxy inverse le port interne n'a plus
   d'importance, autant en prendre un sans collision sur une machine de
   developpeur. */
const PORT = Number(process.env.PORT) || 7776;

/* Cle de la page admin. Meme modele que la configuration Supabase : une
   variable d'environnement, rien d'autre. ABSENTE = admin coupe, tout /admin
   repond 404 — sur un serveur public, une page qui peut effacer la progression
   n'existe que si son operateur l'a explicitement armee. */
const ADMIN_KEY = process.env.ADMIN_KEY || "";

/* --- serveur de fichiers statiques ----------------------------------------- */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico":  "image/x-icon",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  /* Les polices des menus sont VENDUES AVEC LE JEU (public/fonts/) et non
     chargees depuis un CDN : une dependance a un tiers ajoute un point de
     panne et une latence au premier rendu sur un chemin critique — l'ecran de
     connexion. Sans ce type, le repli `application/octet-stream` fonctionne
     encore aujourd'hui pour @font-face, mais rien ne l'oblige. */
  ".woff2": "font/woff2",
  /* Les pistes audio et les echantillons (`public/assets/musics/`). Sans le
     bon type, Safari refuse de lire un `<audio>` servi en
     `application/octet-stream` — Chrome et Firefox reniflent le contenu, lui
     non, et la panne est silencieuse : l'element reste a `readyState` 0. */
  ".mp3":  "audio/mpeg",
  ".wav":  "audio/wav",
  ".ogg":  "audio/ogg",
};

/* Le chemin d'une URL est toujours en barres obliques ; celui du systeme de
   fichiers ne l'est pas. On normalise donc entierement dans l'espace URL, puis
   join() produit le separateur de la plateforme. Utiliser path.normalize() sur
   une URL casse tout sous Windows : il renvoie des antislashs et les
   comparaisons de prefixe echouent silencieusement. */
function resolvePath(urlPath) {
  let p = urlPath.split("?")[0].split("#")[0];
  try { p = decodeURIComponent(p); } catch { return null; }
  p = p.replace(/\\/g, "/");

  const parts = [];
  for (const seg of p.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") return null;
    if (seg.includes(":") || seg.includes("\0")) return null;
    parts.push(seg);
  }

  if (parts.length === 0) return join(ROOT, "public", "index.html");
  if (parts[0] === "shared") return join(ROOT, ...parts);
  return join(ROOT, "public", ...parts);
}

const httpServer = createServer(async (req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  // La page admin et son API passent AVANT le service de fichiers : /admin.html
  // ne doit pas etre servi comme un fichier ordinaire quand l'admin est coupe.
  if (urlPath === "/admin" || urlPath === "/admin.html" || urlPath.startsWith("/admin/")) {
    handleAdmin(req, res, urlPath);
    return;
  }

  /* Etat du service, PUBLIC et sans cle : l'ecran de connexion l'affiche avant
     toute WebSocket. Il n'y a pas de socket a ce moment-la — elle ne s'ouvre
     qu'au premier clic, et l'ouvrir des le chargement ferait une socket par
     onglet laisse ouvert, comptee dans le plafond par adresse IP.

     Il ne porte que ce qui est destine a etre lu sur cet ecran : le nombre de
     salles et le numero de version. La LATENCE ne s'y trouve pas — c'est le
     client qui chronometre l'aller-retour de cette requete, ce qui mesure
     exactement ce qu'il veut savoir : en combien de temps le serveur repond.
     Rien de tout cela ne se cache : la page d'accueil est publique. */
  if (urlPath === "/etat") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(hub.publicInfo()));
    return;
  }

  const file = resolvePath(req.url || "/");
  if (!file) { res.writeHead(400).end("Bad request"); return; }

  try {
    const data = await readFile(file);
    const ext = extname(file);
    /* Les PISTES AUDIO sont la seule chose du depot qu'on met en cache, et il
       le faut : `no-store` sur un mp3 de six mega-octets le fait retelecharger
       a CHAQUE fondu enchaine, soit toutes les trois minutes et par client.
       Le risque habituel du cache — un onglet qui tourne sur du code perime —
       ne les concerne pas : elles ne portent aucune logique, et une piste
       remplacee change de nom de fichier. */
    const audio = ext === ".mp3" || ext === ".wav" || ext === ".ogg";
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": audio ? "public, max-age=86400" : "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404");
  }
});

/* --- page admin ----------------------------------------------------------------

   Trois besoins d'operateur, pas un de plus : verifier que l'acces Supabase
   fonctionne depuis la machine qui heberge, voir la ligne, la supprimer. La
   cle voyage dans l'en-tete `x-admin-key` — jamais dans l'URL, ou elle
   finirait dans les journaux d'acces du reverse proxy. La page elle-meme est
   servie sans cle (elle ne contient rien de secret, c'est elle qui la
   demande), mais seulement si l'admin est arme. */

function adminAuthorized(req) {
  const got = Buffer.from(String(req.headers["x-admin-key"] ?? ""));
  const want = Buffer.from(ADMIN_KEY);
  // timingSafeEqual par principe, comme pour le code de compte : la longueur
  // fuit, pas le contenu.
  return got.length === want.length && timingSafeEqual(got, want);
}

function handleAdmin(req, res, urlPath) {
  const plain = (code, msg) => {
    res.writeHead(code, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(msg);
  };
  if (!ADMIN_KEY) return plain(404, "404");

  if (req.method === "GET" && (urlPath === "/admin" || urlPath === "/admin.html")) {
    readFile(join(ROOT, "public", "admin.html")).then(d => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(d);
    }).catch(() => plain(404, "404"));
    return;
  }

  if (!adminAuthorized(req)) return plain(401, "clé invalide");
  const sendJson = obj => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(obj));
  };

  /* Un seul point de lecture : l'etat interne du magasin, la sonde en direct,
     la liste des salles ET celle des comptes — jamais un hachage ni un jeton,
     seulement ce qu'un operateur lit. */
  if (req.method === "GET" && urlPath === "/admin/api/etat") {
    store.probe(probe => {
      const connectes = hub.connectedKeys();
      sendJson({
        status: store.status(),
        probe,
        ...hub.adminView(),
        perf: PERF_ON,
        comptes: store.listAccounts().map(a => ({ ...a, connecte: connectes.has(a.pseudo) ? 1 : 0 })),
      });
    });
    return;
  }

  /* Allumage de la mesure de diagnostic, a chaud — voir perf.js. Un
     operateur qui diagnostique une partie l'allume par ce bouton et le coupe
     ensuite : eteinte, la mesure coute un test de booleen par tour de boucle,
     et les echantillonneurs resident chez leurs proprietaires pour que
     l'allumage en cours de route fonctionne. */
  if (req.method === "POST" && urlPath === "/admin/api/perf") {
    readJson(req, body => {
      const on = setPerf(body?.on);
      log(`diagnostic ${on ? "activé" : "coupé"} depuis la page admin`);
      sendJson({ ok: 1, on });
    });
    return;
  }

  /* Remise a zero TOTALE (table + memoire), refusee des qu'UNE salle est en
     manche. Un mot de passe ne se recree pas d'office comme l'etait une cle
     generee : les connectes sont DECONNECTES proprement et repassent par
     l'ecran de creation — garder leurs anciens profils en memoire les ferait
     repartir au prochain save(). */
  if (req.method === "POST" && urlPath === "/admin/api/reset") {
    if (hub.anyRoundRunning()) {
      return sendJson({ error: "une manche est en cours — réinitialisation possible quand toutes les salles sont au salon" });
    }
    store.reset(err => {
      if (err) return sendJson({ error: `suppression impossible : ${err.message}` });
      hub.kickAccounts("progression réinitialisée — recrée un compte");
      log("comptes réinitialisés depuis la page admin");
      sendJson({ ok: 1 });
    });
    return;
  }

  /* Le filet « mot de passe perdu » sans email : un temporaire, affiche UNE
     fois a l'operateur, que le joueur change des sa reconnexion. */
  if (req.method === "POST" && urlPath === "/admin/api/passreset") {
    readJson(req, body => {
      const r = store.adminPassReset(body?.pseudo);
      if (!r.ok) return sendJson({ error: r.error });
      log(`mot de passe réinitialisé pour ${body.pseudo} (admin)`);
      sendJson({ ok: 1, temp: r.temp });
    });
    return;
  }

  /* Suppression d'UN compte. Le titulaire eventuellement connecte est
     deconnecte D'ABORD : son profil en memoire ne doit pas survivre a sa
     ligne, sinon il repart au prochain save(). */
  if (req.method === "POST" && urlPath === "/admin/api/delcompte") {
    readJson(req, body => {
      const pseudo = String(body?.pseudo ?? "").toLowerCase();
      hub.kickAccount(pseudo, "compte supprimé par l'administrateur");
      store.deleteAccount(pseudo, err => {
        if (err) return sendJson({ error: `suppression impossible : ${err.message}` });
        log(`compte ${pseudo} supprimé (admin)`);
        sendJson({ ok: 1 });
      });
    });
    return;
  }

  plain(404, "404");
}

/* Corps JSON d'une requete admin, borne : ces routes recoivent un pseudo,
   pas un televersement. */
function readJson(req, done) {
  let body = "";
  req.on("data", c => {
    body += c;
    if (body.length > 4096) req.destroy();
  });
  req.on("end", () => {
    try { done(JSON.parse(body)); } catch { done(null); }
  });
}

/* --- cablage ------------------------------------------------------------------- */

/* LE JOURNAL VA AUSSI SUR DISQUE, et c'est ce qui manquait pour deboguer une
   panne rapportee apres coup. Tout partait dans stdout : une erreur client
   remontee par `clientError`, une salle fermee sur exception, un demarrage
   rate — rien de tout ca ne survivait a la fermeture du terminal, et « je viens
   d'avoir un plantage » restait sans trace.

   Un seul fichier, en AJOUT, jamais relu par le jeu : c'est un journal
   d'operateur, pas un magasin. `data/serveur.log` parce que `data/` existe deja
   et n'est pas servi au navigateur — `resolvePath()` route `/shared/*` depuis la
   racine et tout le reste depuis `public/`, donc rien sous `data/` n'est
   joignable par une adresse.

   Ecriture SYNCHRONE et volontairement : le journal doit contenir la derniere
   ligne AVANT le plantage, ce qu'un flush asynchrone ne garantit pas — et c'est
   precisement la ligne qu'on vient lire. Le cout est une poignee d'ecritures par
   minute en regime normal, sans commune mesure avec le tick.

   PLAFOND SIMPLE : au-dela de LOG_MAX octets le fichier est reparti a zero.
   Une rotation a deux fichiers serait plus soignee ; un disque plein sur un VPS
   arrete le jeu, et c'est le risque qu'on refuse. Une erreur d'ecriture est
   avalee — un journal ne doit jamais etre la cause d'une panne. */
const LOG_FILE = join(ROOT, "data", "serveur.log");
const LOG_MAX = 4 * 1024 * 1024;

function log(msg) {
  const t = new Date().toTimeString().slice(0, 8);
  console.log(`[${t}] ${msg}`);
  try {
    const d = new Date().toISOString().slice(0, 19).replace("T", " ");
    if (existsSync(LOG_FILE) && statSync(LOG_FILE).size > LOG_MAX) {
      writeFileSync(LOG_FILE, `[${d}] journal remis a zero (plafond atteint)\n`);
    }
    appendFileSync(LOG_FILE, `[${d}] ${msg}\n`);
  } catch { /* un journal ne fait jamais tomber le serveur */ }
}

/* Le magasin vit en memoire et Supabase est sa seule persistance. Le
   chargement precede l'ecoute (`store.ready` avant listen()), et sans
   configuration le jeu reste jouable mais la progression meurt avec le
   processus. Le hub est le SEUL a ecrire dedans. */
/* Hash court du commit, resolu UNE fois au demarrage et jamais par requete.
   Il repond a la question que la version seule ne couvre pas : sur un VPS
   deploye par `git pull`, deux deploiements peuvent partager le meme numero —
   et c'est aussi le filet quand quelqu'un a oublie de bumper, cas ou le numero
   ne dit plus rien mais ou le hash dit encore quel code tourne.

   `execFileSync` et non un lancement asynchrone : dix millisecondes au boot, et
   la version asynchrone obligerait a attendre avant de construire le hub. Pas de
   shell (tableau d'arguments), et `stdio` muet sur l'erreur — hors d'un depot
   git, la sortie d'erreur polluerait le journal de demarrage pour rien. */
function shortCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    /* Deploiement depuis une archive, git absent du PATH, dossier sorti de son
       depot : le hash est un CONFORT D'EXPLOITATION, son absence ne doit jamais
       empecher un demarrage. Chaine vide = la cle ne part pas dans le welcome. */
    return "";
  }
}

const store = createStore(msg => log(msg));
/* Le hash est passe A LA CONSTRUCTION, comme les `hooks` d'une Room : le hub ne
   lit aucune variable de module posee ailleurs. */
const hub = createHub(store, log, shortCommit());

/* GARDE-FOU de version, pas une seconde source de verite : le serveur ne lit
   jamais `package.json` pour connaitre sa version — `shared/version.js` est LA
   source, et c'est elle que le navigateur importe. Le paquet etant `private` et
   jamais publie, personne ne lit son champ `version` : sans ce controle il
   mentirait en silence, et c'est exactement le genre de detail qu'on decouvre
   en lisant un rapport de defaut.

   Une ligne de journal et rien de plus. Refuser de demarrer pour un numero
   desaccorde serait une panne auto-infligee sur une machine de joueur. Une
   lecture de fichier au boot, jamais en regime. */
readFile(join(ROOT, "package.json"), "utf8")
  .then(txt => {
    const v = JSON.parse(txt).version;
    if (v !== VERSION) {
      log(`ATTENTION package.json annonce ${v}, shared/version.js annonce ${VERSION}`
        + " — c'est shared/version.js qui fait foi");
    }
  })
  .catch(err => log(`package.json illisible (${err.message}) — version non verifiee`));

attachWebSocket(httpServer, (conn, req) => hub.handleConnection(conn, req));

/* Un seul intervalle pour toutes les salles — voir hub.tick() pour le
   decalage des accumulateurs et l'isolation aux pannes. */
setInterval(() => hub.tick(), 1000 / 120);

/* Battement de coeur WebSocket, a part de la boucle de simulation : c'est du
   RESEAU, pas du jeu, et la cadence n'a rien a voir. Une seconde — huit octets
   de charge utile par socket, negligeable devant un instantané, et assez
   frequent pour que la moyenne glissante d'aller-retour converge en quelques
   secondes plutot qu'en une minute. */
setInterval(() => hub.pingAll(), 1000);

/* --- demarrage ----------------------------------------------------------------------- */

function lanAddresses() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) out.push(net.address);
    }
  }
  return out;
}

/* Le deploiement en conteneur redemarre le serveur a chaque push : la
   plateforme envoie SIGTERM puis tue. Sans copie disque, un envoi Supabase en
   vol a cet instant serait perdu pour de bon — on pousse une derniere fois et
   on attend que l'envoi aboutisse, borne par le flush lui-meme. SIGINT suit le
   meme chemin pour qu'un Ctrl+C local ne soit pas moins sur qu'un deploiement.
   `data` etant mute en place, le flush emporte aussi les save() encore dans la
   fenetre de regroupement du hub. */
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.once(sig, () => {
    log(`signal ${sig} — sauvegarde finale avant arret`);
    store.flush(() => process.exit(0));
  });
}

/* L'ecoute attend le chargement de la progression : un joueur connecte avant
   la lecture Supabase recevrait un profil neuf qui masquerait le sien. `ready`
   se resout des la premiere tentative, succes ou echec — une panne reseau
   retarde le demarrage de quelques secondes, elle ne l'empeche jamais. */
store.ready.then(() => {
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log("\n  Survivor — serveur demarre (hub + salles)\n");
    console.log(`  Sur cette machine   http://localhost:${PORT}`);
    for (const ip of lanAddresses()) {
      console.log(`  Pour les autres     http://${ip}:${PORT}`);
    }
    console.log("\n  Ctrl+C pour arreter\n");
  });
});
