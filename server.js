
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
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
const PORT = Number(process.env.PORT) || 7776;

const ADMIN_KEY = process.env.ADMIN_KEY || "";


const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico":  "image/x-icon",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".woff2": "font/woff2",
  ".mp3":  "audio/mpeg",
  ".wav":  "audio/wav",
  ".ogg":  "audio/ogg",
};

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
  if (urlPath === "/admin" || urlPath === "/admin.html" || urlPath.startsWith("/admin/")) {
    handleAdmin(req, res, urlPath);
    return;
  }

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


function adminAuthorized(req) {
  const got = Buffer.from(String(req.headers["x-admin-key"] ?? ""));
  const want = Buffer.from(ADMIN_KEY);
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

  if (req.method === "POST" && urlPath === "/admin/api/perf") {
    readJson(req, body => {
      const on = setPerf(body?.on);
      log(`diagnostic ${on ? "activé" : "coupé"} depuis la page admin`);
      sendJson({ ok: 1, on });
    });
    return;
  }

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

  if (req.method === "POST" && urlPath === "/admin/api/passreset") {
    readJson(req, body => {
      const r = store.adminPassReset(body?.pseudo);
      if (!r.ok) return sendJson({ error: r.error });
      log(`mot de passe réinitialisé pour ${body.pseudo} (admin)`);
      sendJson({ ok: 1, temp: r.temp });
    });
    return;
  }

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
  } catch {  }
}

function shortCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

const store = createStore(msg => log(msg));
const hub = createHub(store, log, shortCommit());

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

setInterval(() => hub.tick(), 1000 / 120);

setInterval(() => hub.pingAll(), 1000);


function lanAddresses() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) out.push(net.address);
    }
  }
  return out;
}

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.once(sig, () => {
    log(`signal ${sig} — sauvegarde finale avant arret`);
    store.flush(() => process.exit(0));
  });
}

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
