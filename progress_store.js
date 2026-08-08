/* ===========================================================================
   COMPTES ET PROGRESSION — cote serveur uniquement.

   UNE LIGNE SUPABASE PAR COMPTE (table `comptes`), portant l'authentification
   (colonnes) ET la progression (jsonb `data`). L'ancien modele — une ligne
   unique `serveur` avec tous les profils dans un blob — rendait chaque
   sauvegarde totale et la table illisible ; ici une fin de manche a quatre
   joueurs upserte quatre lignes, et supprimer un compte supprime une ligne.
   La bascule est SECHE (decision actee) : pas de migration depuis l'ancienne
   table `progress`, qui peut etre supprimee du projet Supabase.

   L'identite est pseudo + MOT DE PASSE choisi par le joueur, plus une cle
   generee. Le mot de passe est hache scrypt avec sel par compte, et n'est
   JAMAIS normalise — la normalisation (majuscules, tirets retires) etait
   faite pour une cle recopiee depuis un papier ; appliquee a un mot de passe
   choisi, elle en detruirait l'entropie et « MonPass » vaudrait « monpass ».

   LA SESSION EST UN JETON, pas le mot de passe rejoue : au login reussi le
   serveur emet 32 octets aleatoires, n'en garde que le hachage (sha256 —
   suffisant pour un secret a haute entropie, et gratuit la ou scrypt bloque
   ~50 ms l'event loop a chaque reconnexion silencieuse) et une expiration
   GLISSANTE de 30 jours. Le client range le jeton, jamais le mot de passe.
   Le jeton vit dans la ligne du compte : il survit donc au redeploiement, et
   un login regenere le jeton — le dernier login gagne, l'ancien onglet devra
   retaper son mot de passe.

   L'etat chaud vit en memoire, Supabase est la seule persistance (variables
   SUPABASE_URL / SUPABASE_SERVICE_KEY, rien d'autre). Les protections nees de
   l'absence de copie disque sont conservees a l'identique :

     - le CHARGEMENT PRECEDE L'ECOUTE (`ready` avant listen()), resolu des la
       premiere tentative pour qu'une panne reseau ne prive pas le LAN de jeu ;
     - l'ECRITURE EST SUSPENDUE tant qu'aucune lecture n'a reussi — pousser un
       etat quasi vide par-dessus la seule copie existante est la perte qu'on
       ne rattrape plus. Une ligne de VERSION inconnue est gelee : ni adoptee,
       ni jamais reecrite, et son pseudo reste indisponible ;
     - un ENVOI RATE SE REESSAIE tout seul (10 s) ;
     - les ecritures sont REGROUPEES (fenetre de 2 s) et CIBLEES : seuls les
       comptes marques sales partent, en un seul upsert multi-lignes.

   Le chargement est PAGINE (en-tete Range) : PostgREST plafonne une reponse a
   1000 lignes par defaut, et un chargement silencieusement tronque est
   exactement le bug qu'on ne debogue pas. */

import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { scryptSync, randomBytes, timingSafeEqual, createHash } from "node:crypto";

import { PROG_CFG, newProfile } from "./shared/progression.js";

const REMOTE_TIMEOUT_MS = 3000;
const LOAD_RETRY_MS = 15000;
const PUSH_RETRY_MS = 10000;
const SAVE_BATCH_MS = 2000;
const LOAD_PAGE = 1000;

const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000;   // expiration glissante du jeton

export const PASS_MIN = 8;
export const PASS_MAX = 72;

/* Mot de passe temporaire de la remise a zero admin : minuscules sans
   caracteres ambigus, il se dicte a voix haute et se recopie exactement
   (aucune normalisation ne s'applique aux mots de passe). */
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

/* Variables d'environnement uniquement. Une configuration partielle est un
   accident de deploiement, pas un choix : on le journalise au lieu de le
   confondre avec le mode « sans persistance » assume. */
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

/* Un appel REST vers PostgREST, en modules natifs (node:https) : Node 16 n'a
   pas de fetch global et le depot n'ajoute pas de dependance. Le protocole
   http est accepte uniquement pour pouvoir tester contre un faux Supabase
   local. `done` est garanti appele une seule fois — `error` peut suivre un
   `end` quand la socket meurt en fin d'echange. */
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
  // merge-duplicates : POST devient un upsert sur la cle primaire.
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

/* Un profil qui n'a RIEN accumule : cree par une connexion arrivee avant que
   la lecture distante n'aboutisse. Seul cas ou le distant a raison sur le
   local — tout champ acquis rend le profil local prioritaire. */
function pristine(p) {
  return p.cores === 0 && p.runs === 0
    && p.milestones.length === 0 && p.confort.length === 0
    && Object.keys(p.classes).length === 0;
}

export function createStore(log = console.log) {
  const remote = remoteConfig(process.env, log);

  /* pseudoLower -> compte. Le profil (progression pure, ce que le jeu
     manipule) vit dans `acc.profile` ; l'authentification vit A COTE, jamais
     dedans — c'est ce qui garantit qu'un hachage ne part jamais dans le jsonb
     ni vers un navigateur. */
  const accounts = new Map();
  /* Pseudos dont la ligne distante porte une version inconnue : ni adoptes,
     ni jamais reecrits, et indisponibles a l'inscription — ecraser un format
     qu'on ne sait pas lire est la perte qu'on ne rattrape plus. */
  const frozen = new Set();

  let loaded = false;
  let pushing = false;
  const dirty = new Set();     // pseudoLower a upserter au prochain envoi
  let batchTimer = null;       // fenetre de regroupement des save()
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

  /* --- ecriture ----------------------------------------------------------------- */

  /* La ligne d'un compte. Serialisation DEFENSIVE : un upsert multi-lignes
     echoue en bloc, une seule ligne malade priverait tous les autres comptes
     de sauvegarde — on l'ecarte en journalisant plutot. */
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
    if (!loaded || pushing) return;   // `dirty` garde la liste, l'envoi suivra
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
        // Les comptes du lot redeviennent sales : rien n'est parti.
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

  /* Marque un compte a sauvegarder. Le regroupement vit ICI : les huit points
     d'appel du hub decrivent une intention (« ce compte doit survivre »), la
     fenetre de 2 s agrege une fin de manche a quatre joueurs — ou quatre
     salles — en un seul envoi. */
  function save(lower) {
    if (!lower || !accounts.has(lower)) return;
    dirty.add(lower);
    if (batchTimer) return;
    batchTimer = setTimeout(() => {
      batchTimer = null;
      push();
    }, SAVE_BATCH_MS);
  }

  /* --- chargement ---------------------------------------------------------------- */

  /* MIGRATION 3 -> 4 (lot Q) : la vague n'existe plus, tout ce qui s'y indexait
     passe au niveau d'equipe. Elle se fait PAR LIGNE, a l'adoption, et la ligne
     migree est marquee sale pour etre reecrite en version 4.

     Deux choses seulement, et aucune n'est une conversion de mesure :

     - les identifiants de JALON changent d'unite. Un compte qui avait deja
       « vague8 » perdrait ses cartes conditionnelles, et un compte qui avait
       deja paye le bonus de « vague10 » le recevrait une seconde fois. On les
       renomme donc a rang egal — le seuil bouge, l'acquis reste.
     - `best.wave` est CONSERVE TEL QUEL, sous son ancien nom. Il n'est pas
       convertible : une vague et un niveau ne mesurent pas la meme chose, et
       une mesure se remesure, elle ne se reecrit pas. `best.level` et
       `best.segment` demarrent a zero.

     Rend vrai si la ligne a ete migree. */
  const JALONS_V3 = new Map([
    ["vague8", "niveau10"],
    ["vague5", "niveau6"], ["vague10", "niveau12"],
    ["vague15", "niveau18"], ["vague20", "niveau24"],
  ]);

  /* Les migrations s'ENCHAINENT au lieu de se remplacer : une ligne de version 3
     traverse 3 -> 4 puis 4 -> 5 dans le meme appel. Ecrire `from !== 4` aurait
     gele toutes les lignes restees en version 3, c'est-a-dire condamne les
     comptes qui ne se sont pas connectes depuis deux lots — le gel est fait pour
     les versions INCONNUES, pas pour les anciennes.

     LE CAS TORDU, et il vient de la fusion : DEUX branches ont ecrit une
     « version 4 » differente. Celle du lot H (economie du Terminal) porte
     `bannedCards` et `bestFinal` mais pas `best.level` ; celle du lot Q (plan 5)
     porte `best.level` et `best.segment` mais aucune des deux autres. Le NUMERO
     ne les distingue donc pas, et c'est exactement ce que le numero est cense
     empecher. On les reconnait a leurs CHAMPS, ce qui est la seule information
     fiable dont on dispose — et la migration est de toute facon idempotente : ce
     qui manque est ajoute, ce qui est la n'est pas touche. */
  function migrate(profile, from) {
    if (!profile || typeof profile !== "object") return false;
    if (from === PROG_CFG.VERSION) return false;
    if (from !== 3 && from !== 4) return false;

    // 3 -> 4 : les jalons changent d'unite, la vague devient le niveau.
    if (from === 3 && Array.isArray(profile.milestones)) {
      profile.milestones = [...new Set(profile.milestones
        .map(id => JALONS_V3.get(id) ?? id))];
    }

    /* -> 5. Tout ce qui suit est un ajout de champ manquant, donc sans risque
       quelle que soit la v4 d'origine. `best.wave` n'est JAMAIS converti : une
       vague et un niveau ne mesurent pas la meme chose, et une mesure se
       remesure — elle ne se reecrit pas. */
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
    /* DEUX DIRECTIONS, DEUX CONDUITES, et la fusion garde la regle du lot H
       pour l'une et la migration du plan 5 pour l'autre.

       Une version FUTURE — serveur en retard sur la donnee — reste GELEE : ni
       adoptee, ni jamais reecrite. Ecraser un format qu'on ne sait pas lire est
       la perte qu'on ne rattrape plus, et c'est la seule regle qui protege un
       deploiement partiel.

       Une version ANTERIEURE connue est MIGREE et non remise a neuf. Le lot H
       avait tranche pour le reset sec, argument valable : le jeu est en
       developpement. Mais la migration existe, elle est ecrite, elle est
       idempotente et elle ne fait qu'ajouter des champs manquants — remettre a
       zero la progression de tout le monde alors qu'on sait la relire serait
       une perte gratuite. Le reset reste le repli des versions qu'on ne sait
       PAS migrer. */
    const connue = row.version === 3 || row.version === 4;
    if (typeof row.version !== "number" || row.version > PROG_CFG.VERSION) {
      frozen.add(lower);
      return 0;
    }
    const migre = connue && migrate(row.data, row.version);
    // Ce qu'on ne sait ni lire ni migrer repart sur un profil neuf, comptes
    // conserves : l'authentification vit dans les COLONNES de la ligne, elle
    // traverse intacte (pseudo, mot de passe, jeton de session).
    const reset = row.version < PROG_CFG.VERSION && !migre;
    const cur = accounts.get(lower);
    if (cur && !pristine(cur.profile)) return 0;   // le local qui a progresse a raison
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
    /* Une ligne migree OU remise a neuf doit repartir : sinon elle serait relue
       dans son ancienne version au prochain demarrage, donc retraitee a chaque
       fois — et gelee le jour ou cette version sortira de la chaine de
       migration, alors qu'elle etait parfaitement lisible. */
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
          resolveReady(); // le serveur demarre : une panne reseau ne prive pas le LAN de jeu
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

        // Page pleine : il peut en rester — on continue. Une page partielle
        // (ou vide) signe la fin de la table.
        if (rows.length === LOAD_PAGE) return page(from + LOAD_PAGE);

        loaded = true;
        noteOk();
        log(total > 0
          ? `comptes Supabase chargés — ${adopted} adopté(s) sur ${total}`
            + (frozen.size > 0 ? `, ${frozen.size} gelé(s) (version inconnue)` : "")
          : "comptes Supabase : table vide, première utilisation");
        if (dirty.size > 0) push();   // les save() retenus pendant la suspension
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

  /* --- identite : inscription, connexion, session -------------------------------

     Tout reste SYNCHRONE sur la memoire, sans await : l'event loop de Node
     serialise les `onmessage`, donc deux inscriptions simultanees du meme
     pseudo se voient l'une l'autre. scrypt bloque ~50 ms — acceptable parce
     que borne (5 essais par connexion, delai par pseudo cote hub) et paye
     seulement a l'inscription et au login : la reconnexion silencieuse par
     jeton passe par sha256. */

  function issueToken(acc) {
    const token = randomBytes(32).toString("base64url");
    acc.jetonHash = hashToken(token);
    acc.jetonExp = Date.now() + TOKEN_TTL_MS;
    return token;
  }

  /* `pseudo` est deja valide en forme par l'appelant (sanitizePseudo), le mot
     de passe deja borne en longueur. « Deja pris » est une reponse NORMALE de
     l'inscription — l'oracle de presence de l'ancien systeme disparait
     volontairement, c'est le compromis de tout systeme a page de creation. */
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

  /* Echec muet : ne dit jamais si c'est le pseudo ou le mot de passe qui
     cloche — l'inscription revele deja les pseudos pris, inutile d'offrir en
     plus une confirmation gratuite a qui essaie des mots de passe. */
  function login(pseudo, pass) {
    const lower = pseudo.toLowerCase();
    const acc = accounts.get(lower);
    if (!acc || !passMatches(acc, pass)) return { ok: false };
    // Nouveau jeton a chaque login : le dernier login gagne, l'ancien jeton
    // meurt — c'est la reponse au « deux onglets, meme compte ».
    const token = issueToken(acc);
    acc.vuLe = new Date().toISOString();
    save(lower);
    return { ok: true, profile: acc.profile, token };
  }

  /* Reconnexion silencieuse. L'expiration est GLISSANTE : chaque retour
     repousse les 30 jours — un habitue ne retape jamais son mot de passe, un
     compte abandonne expire. */
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

  /* Le jeton actif SURVIT au changement de mot de passe : c'est celui qui
     change le mot de passe qui tient la session, le deconnecter n'aurait
     puni que lui. La remise a zero admin, elle, invalide le jeton — le
     titulaire legitime est peut-etre precisement celui qui a perdu l'acces. */
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

  /* --- introspection et administration ------------------------------------------- */

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

  /* Sonde EN DIRECT : une lecture reelle, latence mesuree. Elle ne rapatrie
     que les pseudos — la page admin liste les comptes depuis la memoire, la
     sonde ne repond qu'a « la base est-elle joignable et combien de lignes ». */
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

  /* La vue memoire pour la page admin : jamais de hachage, jamais de jeton —
     seulement ce qu'un operateur lit (qui, combien, quand). */
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

  /* Attend la fin d'un envoi en vol, bornee : son corps est deja serialise et
     atterrirait APRES une suppression, ressuscitant les lignes. Partage par
     reset() et deleteAccount(), qui suppriment tous les deux du distant. */
  function afterPush(fn) {
    const deadline = Date.now() + REMOTE_TIMEOUT_MS + 500;
    const wait = () => {
      if (pushing && Date.now() < deadline) return setTimeout(wait, 50);
      fn();
    };
    wait();
  }

  /* Remise a zero totale : la table ET la memoire, les deux ou rien. Le
     filtre `cree_le=not.is.null` matche toutes les lignes — PostgREST refuse
     selon les versions un DELETE sans filtre, et un filtre toujours-vrai est
     la forme portable. */
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
        // Une table qu'on vient de vider soi-meme est une table lue : si le
        // boot etait encore suspendu, la suppression vaut lecture reussie.
        loaded = true;
        done(null);
      });
    });
  }

  /* Suppression d'UN compte (admin). Memoire d'abord — il ne repartira dans
     aucun envoi — puis la ligne. Sans configuration distante, la memoire
     suffit : c'est tout ce qui existe. */
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

  /* Le filet « mot de passe perdu » sans email : l'operateur genere un mot de
     passe temporaire, affiche UNE fois dans la page admin, que le joueur
     change des sa reconnexion. Le jeton est invalide — le titulaire legitime
     est peut-etre celui qui a perdu l'acces, pas celui qui tient la session. */
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

  /* Vidage final avant l'arret du processus (SIGTERM du redeploiement). UNE
     tentative, bornee — a l'arret, boucler sur des reessais ne ferait que
     retarder le SIGKILL. La fenetre de regroupement est court-circuitee :
     ce qui attendait 2 s part maintenant. */
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

  /* Les PROFILS seuls, jamais les lignes de compte : ni hachage, ni sel, ni
     jeton n'en sortent. Un iterateur et non une copie de tableau — le
     classement (lot N) le parcourt a chaque affichage du hub, et copier
     plusieurs milliers de profils pour en garder dix serait absurde.
     Les comptes GELES (version inconnue) sont exclus : on ne lit pas un
     profil qu'on ne sait pas interpreter. */
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
