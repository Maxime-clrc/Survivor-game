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
import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { attachWebSocket } from "./ws_lite.js";
import { createHub } from "./hub.js";
import { createStore } from "./progress_store.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
/* 7777 et non 8080 : derriere un proxy inverse le port interne n'a plus
   d'importance, autant en prendre un sans collision sur une machine de
   developpeur. */
const PORT = Number(process.env.PORT) || 7777;

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
  const file = resolvePath(req.url || "/");
  if (!file) { res.writeHead(400).end("Bad request"); return; }

  try {
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
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

  /* Un seul point de lecture : l'etat interne du magasin, la sonde en direct
     (latence + ligne) et le contexte de jeu qui borne les actions — desormais
     la LISTE des salles, la page supposait une partie unique. */
  if (req.method === "GET" && urlPath === "/admin/api/etat") {
    store.probe(probe => sendJson({
      status: store.status(),
      probe,
      ...hub.adminView(),
    }));
    return;
  }

  /* Suppression de la ligne + remise a zero de la memoire, refusee des qu'UNE
     salle est en manche — pendant une manche, les profils sont sous les pieds
     d'awardRun et des achats, quelle que soit la salle. Les connectes sont
     relies a des profils neufs immediatement, par le meme resolveAccount qu'un
     premier join (rebindAccounts) : garder l'ancien objet en memoire le ferait
     repartir en entier au prochain save(). */
  if (req.method === "POST" && urlPath === "/admin/api/reset") {
    if (hub.anyRoundRunning()) {
      return sendJson({ error: "une manche est en cours — réinitialisation possible quand toutes les salles sont au salon" });
    }
    store.reset(err => {
      if (err) return sendJson({ error: `suppression impossible : ${err.message}` });
      hub.rebindAccounts();
      log("progression réinitialisée depuis la page admin");
      sendJson({ ok: 1 });
    });
    return;
  }

  plain(404, "404");
}

/* --- cablage ------------------------------------------------------------------- */

function log(msg) {
  const t = new Date().toTimeString().slice(0, 8);
  console.log(`[${t}] ${msg}`);
}

/* Le magasin vit en memoire et Supabase est sa seule persistance. Le
   chargement precede l'ecoute (`store.ready` avant listen()), et sans
   configuration le jeu reste jouable mais la progression meurt avec le
   processus. Le hub est le SEUL a ecrire dedans. */
const store = createStore(msg => log(msg));
const hub = createHub(store, log);

attachWebSocket(httpServer, (conn, req) => hub.handleConnection(conn, req));

/* Un seul intervalle pour toutes les salles — voir hub.tick() pour le
   decalage des accumulateurs et l'isolation aux pannes. */
setInterval(() => hub.tick(), 1000 / 120);

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
