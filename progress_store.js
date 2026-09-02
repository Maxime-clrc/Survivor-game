
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { scryptSync, randomBytes, timingSafeEqual, createHash } from "node:crypto";

import { PROG_CFG, clefRecord, newProfile, slotsFor, sousBudget, statsVierges } from "./shared/progression.js";
import { CADRE_DEFAUT, HAUTS_FAITS } from "./shared/hauts_faits.js";
import { BOSS_ROSTER } from "./shared/bosses.js";

const REMOTE_TIMEOUT_MS = 3000;
const LOAD_RETRY_MS = 15000;
const PUSH_RETRY_MS = 10000;
const SAVE_BATCH_MS = 2000;
const LOAD_PAGE = 1000;

const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000;

/* LE BAC A SABLE. Meme statut que `BANC`, `BIOME` et `GRAINE` : une surcharge
   d'environnement, POUR LES TESTS UNIQUEMENT — un profil neuf nait avec de quoi
   acheter et avec toutes les clefs.

   IL N'EST PAS DEDUIT DE L'ABSENCE DE SUPABASE : un hote de production mal
   configure est dans le meme etat, et il ouvrirait la meta a de vrais joueurs
   sans que rien ne le dise.

   `1e6` et non `Infinity`, qui se serialise en `null` : plus rien ne serait
   payable, l'inverse exact du but. Et on pose `hf` SEUL — `lignesVerrouillees()`
   et `cadresDe()` relisent les recompenses de la, donc ecrire aussi `cadres`
   serait une seconde source pour la meme information. */
const BAC = process.env.BAC === "1";
const BAC_NOYAUX = 1e6;

function profilNeuf(pseudo) {
  const p = newProfile(pseudo);
  if (BAC) {
    p.cores = BAC_NOYAUX;
    p.hf = HAUTS_FAITS.map(h => h.id);
  }
  return p;
}

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
    && Object.keys(p.classes).length === 0
    && Object.keys(p.commun ?? {}).length === 0;
}

/* UNE MIGRATION DECRIT LE PASSE. Ces listes sont celles de la v6, figees :
   elles ne doivent PAS suivre `CARDS`, sinon la conversion changerait de sens
   au prochain lot. C'est exactement le defaut qu'on supprime — un deblocage
   indexe sur une position de tableau. */
const V6_ARMES = ["dispersion", "railgun", "grenade"];
const V6_LEGENDAIRES = [
  "echo", "instinct", "contrat", "essaim", "sentence_capitale",
  "pacte_de_fer", "coeur_forge", "chaine_assaut", "constitution", "vif_argent",
  "voeu_partage", "ancre_souveraine", "sanctuaire_absolu", "salve_totale", "phalange",
  "dynamo", "horizon", "fournaise", "faucheuse", "cataclysme",
];
const V6_CONDITIONNELLES = ["symbiose", "austerite", "resonance"];
const V6_SPLIT = 5;

function v6Ouvertes(jalons) {
  const out = new Set();
  const done = new Set(jalons ?? []);
  if (done.has("niveau10")) for (const id of V6_CONDITIONNELLES) out.add(id);
  for (let i = 0; i < 20; i++) {
    if (!done.has(`boss_${i}`)) continue;
    if (i < V6_SPLIT) {
      V6_LEGENDAIRES.forEach((id, k) => { if (k % V6_SPLIT === i) out.add(id); });
    } else {
      for (const id of V6_ARMES) out.add(id);
    }
  }
  if (done.has("sans_chute")) V6_ARMES.forEach((id, k) => { if (k % 2 === 0) out.add(id); });
  if (done.has("kills500")) V6_ARMES.forEach((id, k) => { if (k % 2 === 1) out.add(id); });
  return [...out];
}

const JALONS_V3 = new Map([
  ["vague8", "niveau10"],
  ["vague5", "niveau6"], ["vague10", "niveau12"],
  ["vague15", "niveau18"], ["vague20", "niveau24"],
]);

/* CE QU UN PROFIL DOIT PORTER, QUELLE QUE SOIT SA VERSION.

   Ce bloc vivait DANS `migrateProfile`, qui sort en tete sur
   `from === PROG_CFG.VERSION` : un profil deja a la version courante ne le
   traversait donc JAMAIS. Or c est exactement la population des comptes
   enregistres AVANT qu un champ n existe, sans bump de version — le motif que
   le commentaire du codex revendique (« on normalise a la lecture »). Il ne
   normalisait rien du tout.

   Consequence mesuree sur `vus` : `pr.vus` restait `undefined`,
   `progressPayload` le MASQUAIT avec `?? []` — donc un codex vide a l ecran,
   pour toujours — et `mergerCodex` levait sur `pr.vus.push`, ce qui fait
   FERMER LA SALLE (`hub.js`, `room.tick` en erreur). Un champ absent, trois
   symptomes, et aucun qui nomme sa cause.

   Elle est donc appelee pour CHAQUE profil adopte, et `migrateProfile` la
   termine. Idempotente par construction. */
export function normaliserProfil(profile) {
  if (!profile || typeof profile !== "object") return profile;
  if (!Array.isArray(profile.hf)) profile.hf = [];
  if (!Array.isArray(profile.vus)) profile.vus = [];
  if (!Array.isArray(profile.debloquees)) profile.debloquees = [];
  if (!Array.isArray(profile.equipes)) profile.equipes = [];
  if (!Array.isArray(profile.cadres) || profile.cadres.length === 0) {
    profile.cadres = [CADRE_DEFAUT];
  }
  if (typeof profile.cadreActif !== "string") profile.cadreActif = CADRE_DEFAUT;
  if (!profile.stats || typeof profile.stats !== "object") {
    profile.stats = statsVierges();
  }
  // (`bannedCards` a disparu : le ban est par manche et gratuit — champ mort
  //  chez les comptes qui en portent encore un)
  return profile;
}

export function migrateProfile(profile, from) {
  if (!profile || typeof profile !== "object") return false;
  if (from === PROG_CFG.VERSION) return false;
  if (from < 3 || from >= PROG_CFG.VERSION) return false;

  if (from === 3 && Array.isArray(profile.milestones)) {
    profile.milestones = [...new Set(profile.milestones
      .map(id => JALONS_V3.get(id) ?? id))];
  }

  const best = profile.best ?? (profile.best = {});
  if (best.level === undefined) best.level = 0;
  if (best.segment === undefined) best.segment = 0;
  if (!profile.bestFinal || typeof profile.bestFinal !== "object") profile.bestFinal = {};

  if (!profile.commun || typeof profile.commun !== "object") profile.commun = {};
  if (!Array.isArray(profile.confort)) profile.confort = [];

  /* v6 -> v7 : ON NE RETIRE JAMAIS UN DEBLOCAGE ACQUIS. La garantie ne passe
     PAS par une correspondance jalon -> haut fait qu'il faudrait maintenir :
     on releve carte par carte ce que le compte avait ouvert, et cette liste
     le suit pour toujours. Les hauts faits que les donnees stockees prouvent
     sont accordes par-dessus. */
  if (from < 7) {
    profile.debloquees = v6Ouvertes(profile.milestones);
    const jalons = new Set(profile.milestones ?? []);
    const hf = new Set(profile.hf ?? []);
    let bosses = 0;
    for (const id of jalons) if (id.startsWith("boss_")) bosses++;
    if (bosses >= 1) hf.add("premier_sang");
    if (bosses >= 5) hf.add("bestiaire1");
    if (bosses >= BOSS_ROSTER.length) hf.add("bestiaire2");
    if (jalons.has("sans_chute")) hf.add("debout");
    if (jalons.has("kills500")) hf.add("moisson");
    if ((profile.runs | 0) >= 1) hf.add("recrue");
    profile.hf = [...hf];
  }

  /* v7 -> v8 : LES RECORDS RETROUVENT LEUR EFFECTIF. La clef etait la difficulte
     SEULE, donc un profil n avait qu un record par mode et un bon temps a quatre
     effacait definitivement le record solo. `players` etait deja stocke : la
     migration est donc sans perte POUR CE QUI RESTE — les records ecrases avant
     ce lot le sont pour de bon, et ca s ecrit au lieu de se masquer.
     `players` absent ou nul vaut 1 : un record ecrit avant que le champ existe
     vient forcement d une manche jouee, donc d au moins un joueur. */
  if (from < 8 && profile.bestFinal && typeof profile.bestFinal === "object") {
    const neuf = {};
    for (const [k, e] of Object.entries(profile.bestFinal)) {
      if (!e || typeof e !== "object") continue;
      const clef = k.includes(":") ? k : clefRecord(Number(k) | 0, e.players || 1);
      const cur = neuf[clef];
      if (!cur || e.time < cur.time) neuf[clef] = e;
    }
    profile.bestFinal = neuf;
  }

  /* v8 -> v9 : AUCUN ACHAT N EST PERDU, SEULE L ACTIVATION CHANGE. Deux bornes
     arrivent en meme temps — les emplacements passent sous le nombre de lignes, et
     les huit ameliorations hors classe partagent un budget — donc un compte
     complet ne peut plus tout porter. On equipe dans l ORDRE D ACHAT jusqu a la
     borne et on laisse le reste paye et desequipe.

     L ordre d achat n est enregistre qu a l INTERIEUR de chaque groupe : les cles
     de `commun` et le tableau `confort` sont en ordre d insertion, mais rien ne
     date un groupe par rapport a l autre. Les communes passent devant — ce sont
     les lignes de PUISSANCE, et un compte qui perd un confort s en apercoit moins
     qu un compte qui perd ses PV. Derniere lecture de `communOff`, qui devient un
     champ mort.

     `avisMeta` fait ouvrir l ecran une fois avec un bandeau : un joueur qui perd
     des lignes actives sans explication lit un nerf, pas un choix rendu. */
  if (from < 9) {
    const coupees = new Set(profile.communOff ?? []);
    const ordre = [
      ...Object.keys(profile.commun).filter(id => (profile.commun[id] | 0) > 0),
      ...profile.confort,
    ].filter(id => !coupees.has(id));
    profile.equipes = sousBudget(ordre, profile);
    let trop = ordre.length > profile.equipes.length;

    const max = slotsFor(profile);
    for (const cp of Object.values(profile.classes ?? {})) {
      if (!Array.isArray(cp?.equipped) || cp.equipped.length <= max) continue;
      cp.equipped = cp.equipped.slice(0, max);
      trop = true;
    }
    if (trop) profile.avisMeta = 1;
  }

  normaliserProfil(profile);
  return true;
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


  function adoptRow(row) {
    const lower = String(row.pseudo ?? "").toLowerCase();
    if (!lower) return 0;
    const connue = row.version >= 3 && row.version < PROG_CFG.VERSION;
    if (typeof row.version !== "number" || row.version > PROG_CFG.VERSION) {
      frozen.add(lower);
      return 0;
    }
    const migre = connue && migrateProfile(row.data, row.version);
    normaliserProfil(row.data);
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
      profile: reset ? profilNeuf(affichage) : row.data,
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
  if (BAC) {
    log("BAC=1 — bac a sable : tout profil neuf nait avec les noyaux et les hauts "
      + "faits, POUR LES TESTS");
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
      profile: profilNeuf(pseudo),
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
