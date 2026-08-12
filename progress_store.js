
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { scryptSync, randomBytes, timingSafeEqual, createHash } from "node:crypto";

import { PROG_CFG, newProfile } from "./shared/progression.js";

const REMOTE_TIMEOUT_MS = 3000;
const LOAD_RETRY_MS = 15000;
const PUSH_RETRY_MS = 10000;
const SAVE_BATCH_MS = 2000;
const LOAD_PAGE = 1000;

const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000;

export const PASS_MIN = 8;
export const PASS_MAX = 72;

const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function tempPassword() {
  const bytes = randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) s += TEMP_ALPHABET[bytes[i] % TEMP_ALPHABET.length];
  return s.slice(0, 5) + "-" + s.slice(5);
}

function hashPass(pass, saltHex) {
  return scryptSync(String(pass), Buffer.from(saltHex, "hex"), 32).toString("hex");
}

function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function passMatches(acc, pass) {
  const expected = Buffer.from(acc.passHash, "hex");
  const got = Buffer.from(hashPass(pass, acc.passSalt), "hex");
  return expected.length === got.length && timingSafeEqual(expected, got);
}

function remoteConfig(env, log) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY;
  if (!url && !key) return null;
  if (!url || !key) {
    log("configuration Supabase incomplète (il faut SUPABASE_URL ET SUPABASE_SERVICE_KEY) — persistance désactivée");
    return null;
  }
  return { url: url.replace(/\/+$/, ""), key };
}

function restCall(cfg, method, path, body, done, extraHeaders = null) {
  let finished = false;
  const finish = (err, out) => {
    if (finished) return;
    finished = true;
    done(err, out);
  };

  let u;
  try {
    u = new URL(cfg.url + path);
  } catch {
    return finish(new Error(`SUPABASE_URL invalide : ${cfg.url}`));
  }
  const payload = body == null ? null : JSON.stringify(body);
  const headers = {
    apikey: cfg.key,
    authorization: `Bearer ${cfg.key}`,
    "content-type": "application/json",
    ...extraHeaders,
  };
  if (method === "POST") headers.prefer = "resolution=merge-duplicates";
  if (payload) headers["content-length"] = Buffer.byteLength(payload);

  const request = u.protocol === "http:" ? httpRequest : httpsRequest;
  const req = request(u, { method, headers, timeout: REMOTE_TIMEOUT_MS }, res => {
    let out = "";
    res.setEncoding("utf8");
    res.on("data", c => { out += c; });
    res.on("end", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) finish(null, out);
      else finish(new Error(`HTTP ${res.statusCode} ${out.slice(0, 200)}`));
    });
  });
  req.on("timeout", () => req.destroy(new Error("delai depasse")));
  req.on("error", finish);
  if (payload) req.write(payload);
  req.end();
}

function pristine(p) {
  return p.cores === 0 && p.runs === 0
    && p.milestones.length === 0 && p.confort.length === 0
    && Object.keys(p.classes).length === 0;
}

export function createStore(log = console.log) {
  const remote = remoteConfig(process.env, log);

  const accounts = new Map();
  const frozen = new Set();

  let loaded = false;
  let pushing = false;
  const dirty = new Set();
  let batchTimer = null;
  let retryTimer = null;

  let lastOkAt = 0;
  let lastError = "";
  let lastErrorAt = 0;

  function noteOk() {
    lastOkAt = Date.now();
    lastError = "";
  }
  function noteError(err) {
    lastError = err.message;
    lastErrorAt = Date.now();
  }


  function rowFor(lower) {
    const acc = accounts.get(lower);
    if (!acc) return null;
    try {
      return JSON.parse(JSON.stringify({
        pseudo: lower,
        affichage: acc.affichage,
        pass_salt: acc.passSalt,
        pass_hash: acc.passHash,
        jeton_hash: acc.jetonHash,
        jeton_exp: acc.jetonExp ? new Date(acc.jetonExp).toISOString() : null,
        version: PROG_CFG.VERSION,
        data: acc.profile,
        cree_le: acc.creeLe,
        vu_le: acc.vuLe,
      }));
    } catch (err) {
      log(`compte ${lower} : ligne insérialisable (${err.message}) — écarté de l'envoi`);
      return null;
    }
  }

  function push() {
    if (!remote || dirty.size === 0) return;
    if (!loaded || pushing) return;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    const batch = [...dirty];
    const rows = batch.map(rowFor).filter(Boolean);
    dirty.clear();
    if (rows.length === 0) return;
    pushing = true;
    restCall(remote, "POST", "/rest/v1/comptes", rows, err => {
      pushing = false;
      if (err) {
        noteError(err);
        for (const lower of batch) if (accounts.has(lower)) dirty.add(lower);
        log(`comptes Supabase : envoi impossible (${err.message}) — nouvel essai dans ${PUSH_RETRY_MS / 1000} s`);
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            push();
          }, PUSH_RETRY_MS);
        }
        return;
      }
      noteOk();
      if (dirty.size > 0) push();
    });
  }

  function save(lower) {
    if (!lower || !accounts.has(lower)) return;
    dirty.add(lower);
    if (batchTimer) return;
    batchTimer = setTimeout(() => {
      batchTimer = null;
      push();
    }, SAVE_BATCH_MS);
  }


  const JALONS_V3 = new Map([
    ["vague8", "niveau10"],
    ["vague5", "niveau6"], ["vague10", "niveau12"],
    ["vague15", "niveau18"], ["vague20", "niveau24"],
  ]);

  function migrate(profile, from) {
    if (!profile || typeof profile !== "object") return false;
    if (from === PROG_CFG.VERSION) return false;
    if (from !== 3 && from !== 4) return false;

    if (from === 3 && Array.isArray(profile.milestones)) {
      profile.milestones = [...new Set(profile.milestones
        .map(id => JALONS_V3.get(id) ?? id))];
    }

    const best = profile.best ?? (profile.best = {});
    if (best.level === undefined) best.level = 0;
    if (best.segment === undefined) best.segment = 0;
    if (!Array.isArray(profile.bannedCards)) profile.bannedCards = [];
    if (!profile.bestFinal || typeof profile.bestFinal !== "object") profile.bestFinal = {};
    return true;
  }

  function adoptRow(row) {
    const lower = String(row.pseudo ?? "").toLowerCase();
    if (!lower) return 0;
    const connue = row.version === 3 || row.version === 4;
    if (typeof row.version !== "number" || row.version > PROG_CFG.VERSION) {
      frozen.add(lower);
      return 0;
    }
    const migre = connue && migrate(row.data, row.version);
    const reset = row.version < PROG_CFG.VERSION && !migre;
    const cur = accounts.get(lower);
    if (cur && !pristine(cur.profile)) return 0;
    const affichage = typeof row.affichage === "string" && row.affichage ? row.affichage : lower;
    accounts.set(lower, {
      affichage,
      passSalt: row.pass_salt,
      passHash: row.pass_hash,
      jetonHash: row.jeton_hash ?? null,
      jetonExp: row.jeton_exp ? Date.parse(row.jeton_exp) || 0 : 0,
      profile: reset ? newProfile(affichage) : row.data,
      creeLe: row.cree_le ?? new Date().toISOString(),
      vuLe: row.vu_le ?? new Date().toISOString(),
    });
    if (reset) {
      log(`compte ${lower} : profil v${row.version} remis a neuf en v${PROG_CFG.VERSION}`);
      dirty.add(lower);
    } else if (migre) {
      dirty.add(lower);
    }
    return 1;
  }

  function attemptLoad(resolveReady) {
    let adopted = 0;
    let total = 0;

    const page = from => {
      const path = "/rest/v1/comptes?select=*&order=pseudo";
      restCall(remote, "GET", path, null, (err, out) => {
        if (err) {
          noteError(err);
          log(`comptes Supabase : lecture impossible (${err.message}) — `
            + `nouvel essai dans ${LOAD_RETRY_MS / 1000} s, sauvegarde suspendue d'ici là`);
          setTimeout(() => attemptLoad(resolveReady), LOAD_RETRY_MS);
          resolveReady();
          return;
        }
        let rows;
        try {
          rows = JSON.parse(out);
        } catch {
          rows = [];
        }
        if (!Array.isArray(rows)) rows = [];
        total += rows.length;
        for (const row of rows) adopted += adoptRow(row);

        if (rows.length === LOAD_PAGE) return page(from + LOAD_PAGE);

        loaded = true;
        noteOk();
        log(total > 0
          ? `comptes Supabase chargés — ${adopted} adopté(s) sur ${total}`
            + (frozen.size > 0 ? `, ${frozen.size} gelé(s) (version inconnue)` : "")
          : "comptes Supabase : table vide, première utilisation");
        if (dirty.size > 0) push();
        resolveReady();
      }, { "range-unit": "items", range: `${from}-${from + LOAD_PAGE - 1}` });
    };
    page(0);
  }

  let ready;
  if (remote) {
    ready = new Promise(resolve => attemptLoad(resolve));
  } else {
    log("aucune configuration Supabase (SUPABASE_URL / SUPABASE_SERVICE_KEY) — "
      + "les comptes ne survivront PAS à un redémarrage");
    ready = Promise.resolve();
  }


  function issueToken(acc) {
    const token = randomBytes(32).toString("base64url");
    acc.jetonHash = hashToken(token);
    acc.jetonExp = Date.now() + TOKEN_TTL_MS;
    return token;
  }

  function register(pseudo, pass) {
    const lower = pseudo.toLowerCase();
    if (accounts.has(lower) || frozen.has(lower)) return { ok: false, motif: "pris" };

    const salt = randomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const acc = {
      affichage: pseudo,
      passSalt: salt,
      passHash: hashPass(pass, salt),
      jetonHash: null,
      jetonExp: 0,
      profile: newProfile(pseudo),
      creeLe: now,
      vuLe: now,
    };
    accounts.set(lower, acc);
    const token = issueToken(acc);
    save(lower);
    return { ok: true, profile: acc.profile, token };
  }

  function login(pseudo, pass) {
    const lower = pseudo.toLowerCase();
    const acc = accounts.get(lower);
    if (!acc || !passMatches(acc, pass)) return { ok: false };
    const token = issueToken(acc);
    acc.vuLe = new Date().toISOString();
    save(lower);
    return { ok: true, profile: acc.profile, token };
  }

  function loginToken(pseudo, token) {
    const lower = String(pseudo ?? "").toLowerCase();
    const acc = accounts.get(lower);
    if (!acc || !acc.jetonHash || Date.now() > acc.jetonExp) return { ok: false };
    const expected = Buffer.from(acc.jetonHash, "hex");
    const got = Buffer.from(hashToken(token), "hex");
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) return { ok: false };
    acc.jetonExp = Date.now() + TOKEN_TTL_MS;
    acc.vuLe = new Date().toISOString();
    save(lower);
    return { ok: true, profile: acc.profile };
  }

  function logout(pseudo) {
    const lower = String(pseudo ?? "").toLowerCase();
    const acc = accounts.get(lower);
    if (!acc) return;
    acc.jetonHash = null;
    acc.jetonExp = 0;
    save(lower);
  }

  function changePass(pseudo, oldPass, newPass) {
    const lower = String(pseudo ?? "").toLowerCase();
    const acc = accounts.get(lower);
    if (!acc || !passMatches(acc, oldPass)) return { ok: false };
    const salt = randomBytes(16).toString("hex");
    acc.passSalt = salt;
    acc.passHash = hashPass(newPass, salt);
    save(lower);
    return { ok: true };
  }


  function status() {
    return {
      configured: !!remote,
      loaded,
      pushing,
      pending: dirty.size > 0 || !!retryTimer || !!batchTimer,
      players: accounts.size,
      frozen: frozen.size,
      lastOkAt,
      lastError,
      lastErrorAt,
    };
  }

  function probe(done) {
    if (!remote) return done({ ok: false, error: "configuration absente" });
    const t0 = Date.now();
    restCall(remote, "GET", "/rest/v1/comptes?select=pseudo", null, (err, out) => {
      const ms = Date.now() - t0;
      if (err) {
        noteError(err);
        return done({ ok: false, ms, error: err.message });
      }
      noteOk();
      let count = 0;
      try {
        count = JSON.parse(out).length;
      } catch {
        count = 0;
      }
      done({ ok: true, ms, count });
    });
  }

  function listAccounts() {
    return [...accounts.entries()].map(([lower, acc]) => ({
      pseudo: lower,
      affichage: acc.affichage,
      cores: acc.profile.cores,
      runs: acc.profile.runs,
      vuLe: acc.vuLe,
      creeLe: acc.creeLe,
    })).sort((a, b) => a.pseudo.localeCompare(b.pseudo));
  }

  function afterPush(fn) {
    const deadline = Date.now() + REMOTE_TIMEOUT_MS + 500;
    const wait = () => {
      if (pushing && Date.now() < deadline) return setTimeout(wait, 50);
      fn();
    };
    wait();
  }

  function reset(done) {
    if (!remote) return done(new Error("configuration Supabase absente"));
    afterPush(() => {
      dirty.clear();
      if (batchTimer) { clearTimeout(batchTimer); batchTimer = null; }
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      restCall(remote, "DELETE", "/rest/v1/comptes?cree_le=not.is.null", null, err => {
        if (err) {
          noteError(err);
          return done(err);
        }
        noteOk();
        accounts.clear();
        frozen.clear();
        loaded = true;
        done(null);
      });
    });
  }

  function deleteAccount(pseudo, done) {
    const lower = String(pseudo ?? "").toLowerCase();
    if (!accounts.has(lower)) return done(new Error("compte inconnu"));
    accounts.delete(lower);
    dirty.delete(lower);
    if (!remote) return done(null);
    afterPush(() => {
      restCall(remote, "DELETE", `/rest/v1/comptes?pseudo=eq.${encodeURIComponent(lower)}`, null, err => {
        if (err) {
          noteError(err);
          return done(err);
        }
        noteOk();
        done(null);
      });
    });
  }

  function adminPassReset(pseudo) {
    const lower = String(pseudo ?? "").toLowerCase();
    const acc = accounts.get(lower);
    if (!acc) return { ok: false, error: "compte inconnu" };
    const temp = tempPassword();
    const salt = randomBytes(16).toString("hex");
    acc.passSalt = salt;
    acc.passHash = hashPass(temp, salt);
    acc.jetonHash = null;
    acc.jetonExp = 0;
    save(lower);
    return { ok: true, temp };
  }

  function flush(done) {
    if (!remote || !loaded) return done();
    if (batchTimer) { clearTimeout(batchTimer); batchTimer = null; }
    push();
    const deadline = Date.now() + REMOTE_TIMEOUT_MS + 500;
    const wait = () => {
      if ((!pushing && dirty.size === 0) || Date.now() > deadline) return done();
      setTimeout(wait, 50);
    };
    wait();
  }

  function* profiles() {
    for (const acc of accounts.values()) {
      if (acc.frozen || !acc.profile) continue;
      yield acc.profile;
    }
  }

  return {
    ready, save, flush, status, probe, reset,
    register, login, loginToken, logout, changePass,
    listAccounts, deleteAccount, adminPassReset, profiles,
  };
}
