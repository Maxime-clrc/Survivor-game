/* ===========================================================================
   PERSISTANCE DE LA PROGRESSION (lot D) — cote serveur uniquement.

   SUPABASE EST LA SEULE PERSISTANCE — il n'y a plus de fichier local. L'etat
   chaud vit en memoire (`data`), Supabase en est la copie durable. Ce choix
   supprime le fichier `data/progress.json` et sa mecanique d'ecriture
   atomique : un hebergeur sans disque persistant (conteneur, PaaS) ne peut de
   toute facon rien garantir d'un fichier local entre deux deploiements.

   La configuration passe par les variables d'environnement SUPABASE_URL et
   SUPABASE_SERVICE_KEY, et par RIEN d'autre : c'est le modele de tous les
   hebergeurs modernes, et un fichier de cle qui traine sur disque n'a plus de
   raison d'etre quand le disque n'est plus une source de verite. Sans ces
   variables, le serveur reste jouable en LAN mais la progression ne survit pas
   a un redemarrage — le journal le dit en toutes lettres au boot.

   Trois protections, toutes rendues NECESSAIRES par l'absence de copie disque :

     - le CHARGEMENT PRECEDE L'ECOUTE : `ready` est attendue par server.js
       avant `listen()`. Avant, la recuperation arrivait apres le demarrage et
       « un joueur connecte entre-temps a raison » suffisait, parce que le cas
       normal etait le fichier local. Ici la lecture distante EST le cas
       normal : un joueur qui se connecterait avant elle recevrait un profil
       neuf qui masquerait le sien. `ready` se resout des la PREMIERE tentative,
       succes ou echec — une panne reseau ne doit pas empecher une table en LAN
       de jouer — et les tentatives continuent en arriere-plan ;
     - l'ECRITURE EST SUSPENDUE tant qu'aucune lecture n'a reussi : pousser un
       etat quasi vide par-dessus la seule copie existante est exactement la
       perte de donnees qu'on ne peut plus rattraper. Meme regle si la ligne
       distante porte une version INCONNUE (serveur pas a jour) : on n'ecrase
       jamais un format qu'on ne sait pas lire. Les save() faits pendant la
       suspension sont retenus (`dirty`) et partent des que la lecture aboutit ;
     - l'ENVOI RATE SE REESSAIE tout seul (10 s) : avant, l'echec attendait le
       save() suivant, et le fichier local couvrait l'intervalle. Sans lui, un
       envoi perdu est une fin de manche perdue si le processus s'arrete.

   La recuperation tardive (lecture qui n'aboutit qu'apres des connexions)
   n'adopte un profil distant que si le profil local est VIERGE — aucun noyau,
   aucune manche, aucun achat : dans les secondes qui separent le boot d'une
   lecture retardee, personne n'a pu finir une manche, donc le profil distant a
   raison. Un profil local qui a deja progresse a raison, comme avant.

   La replique reste UNE ligne (`account_id` = "serveur") qui porte tout l'etat,
   et non une ligne par joueur : memes semantiques de versionnage qu'avant, un
   seul upsert atomique, et le tableau de bord Supabase sait requeter le jsonb. */

import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

import { PROG_CFG, newProfile } from "./shared/progression.js";

/* --- compte a pseudo reserve -----------------------------------------------------

   Le pseudo n'est une identite QUE s'il est reserve : un compte peut y attacher
   un pseudo unique et recoit en echange un code secret, affiche une seule fois.
   Pseudo + code permettent de retrouver son compte depuis un autre navigateur —
   c'est le seul probleme qu'on resout : sans ca, changer de machine perdait la
   progression. Pas de mot de passe choisi par le joueur : un code GENERE est un
   mot de passe fort sans politique de force, sans reinitialisation par email,
   sans rien a concevoir autour de l'oubli — on peut re-reserver, ce qui
   regenere un code et invalide l'ancien.

   Le code est hache (scrypt, node:crypto — cote serveur uniquement, ce module
   n'est jamais importe par le navigateur). L'alphabet exclut les caracteres
   ambigus (0/O, 1/I/L) : ce code se recopie a la main depuis un bout de papier. */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 8;

function generateCode() {
  const bytes = randomBytes(CODE_LEN);
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s.slice(0, 4) + "-" + s.slice(4);
}

// La comparaison tolere ce qu'un humain tape : tirets, espaces, minuscules.
function normalizeCode(v) {
  return String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashCode(code, saltHex) {
  return scryptSync(normalizeCode(code), Buffer.from(saltHex, "hex"), 32).toString("hex");
}

const REMOTE_ROW = "serveur";
const REMOTE_TIMEOUT_MS = 3000;
const LOAD_RETRY_MS = 15000;
const PUSH_RETRY_MS = 10000;

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
function restCall(cfg, method, path, body, done) {
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
   local — tout champ acquis rend le profil local prioritaire, comme avant. */
function pristine(p) {
  return p.cores === 0 && p.runs === 0 && !p.pseudo
    && p.milestones.length === 0 && p.confort.length === 0
    && Object.keys(p.classes).length === 0;
}

export function createStore(log = console.log) {
  const remote = remoteConfig(process.env, log);

  /* `data` n'est JAMAIS reassigne : server.js garde la reference retournee,
     et le chargement Supabase mute ses proprietes en place. */
  const data = { version: PROG_CFG.VERSION, players: {} };

  /* `loaded` garde l'ecriture fermee tant qu'aucune lecture n'a reussi — la
     protection centrale du module, voir l'en-tete. Sans configuration, il n'y
     a rien a proteger : la progression vit et meurt avec le processus. */
  let loaded = false;

  let pushing = false;
  let dirty = false;
  let retryTimer = null;

  /* Sante des echanges, pour la page admin : dernier succes, dernier echec.
     Releves dans push() et attemptLoad(), les deux seuls chemins reseau. */
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

  function push() {
    if (!remote) return;
    if (!loaded || pushing) {
      dirty = true;
      return;
    }
    pushing = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    const row = [{ account_id: REMOTE_ROW, data, updated_at: new Date().toISOString() }];
    restCall(remote, "POST", "/rest/v1/progress", row, err => {
      pushing = false;
      if (err) {
        noteError(err);
        log(`progression Supabase : envoi impossible (${err.message}) — nouvel essai dans ${PUSH_RETRY_MS / 1000} s`);
        // Sans copie disque, un envoi perdu ne peut plus attendre le save()
        // suivant : le reessai est porte par un minuteur, un seul a la fois.
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            push();
          }, PUSH_RETRY_MS);
        }
        return;
      }
      noteOk();
      if (dirty) {
        dirty = false;
        push();
      }
    });
  }

  // Le nom reste `save` : les huit points d'appel de server.js decrivent une
  // intention (« cet etat doit survivre »), pas un moyen.
  function save() {
    push();
  }

  function attemptLoad(resolveReady) {
    const path = `/rest/v1/progress?account_id=eq.${REMOTE_ROW}&select=data`;
    restCall(remote, "GET", path, null, (err, out) => {
      if (err) {
        noteError(err);
        log(`progression Supabase : lecture impossible (${err.message}) — `
          + `nouvel essai dans ${LOAD_RETRY_MS / 1000} s, sauvegarde suspendue d'ici là`);
        setTimeout(() => attemptLoad(resolveReady), LOAD_RETRY_MS);
        resolveReady(); // le serveur demarre : une panne reseau ne prive pas le LAN de jeu
        return;
      }
      let raw = null;
      try {
        raw = JSON.parse(out)[0]?.data;
      } catch {
        raw = null;
      }
      if (raw && raw.version !== PROG_CFG.VERSION) {
        /* Version inconnue : ce serveur est en retard sur la donnee. On
           n'adopte rien et surtout on n'ecrira JAMAIS par-dessus — `loaded`
           reste faux, l'ecriture reste fermee. Une version future ajoutera sa
           migration ICI plutot que d'ecraser la ligne. */
        log(`progression Supabase en version ${raw.version} inconnue — `
          + "sauvegarde suspendue pour ne pas l'écraser (mettre le serveur à jour)");
        resolveReady();
        return;
      }
      let adopted = 0;
      if (raw && raw.players && typeof raw.players === "object") {
        for (const [uid, p] of Object.entries(raw.players)) {
          const cur = data.players[uid];
          if (!cur || pristine(cur)) {
            data.players[uid] = p;
            adopted++;
          }
        }
      }
      loaded = true;
      noteOk();
      log(raw
        ? `progression Supabase chargée — ${adopted} profil(s)`
        : "progression Supabase : table vide, première utilisation");
      // Les save() retenus pendant la suspension partent maintenant.
      if (dirty) {
        dirty = false;
        push();
      }
      resolveReady();
    });
  }

  /* `ready` : attendue par server.js avant listen(). Resolue des la premiere
     tentative — les suivantes, en cas d'echec, continuent en arriere-plan. */
  let ready;
  if (remote) {
    ready = new Promise(resolve => attemptLoad(resolve));
  } else {
    log("aucune configuration Supabase (SUPABASE_URL / SUPABASE_SERVICE_KEY) — "
      + "la progression ne survivra PAS à un redémarrage");
    ready = Promise.resolve();
  }

  /* --- introspection et remise a zero, pour la page admin --------------------- */

  /* Photographie de l'etat interne — aucune requete reseau, c'est la sonde qui
     s'en charge. `dirty` agrege le drapeau et le minuteur de reessai : pour un
     admin, « quelque chose attend de partir » est une seule information. */
  function status() {
    return {
      configured: !!remote,
      loaded,
      pushing,
      pending: dirty || !!retryTimer,
      players: Object.keys(data.players).length,
      lastOkAt,
      lastError,
      lastErrorAt,
    };
  }

  /* Sonde EN DIRECT : une lecture reelle de la ligne, avec latence mesuree.
     C'est la seule reponse honnete a « l'acces a la base est-il ok ? » — les
     compteurs internes disent le passe, la sonde dit maintenant. Elle rend
     aussi la ligne entiere : la page admin est la vue de la table. */
  function probe(done) {
    if (!remote) return done({ ok: false, error: "configuration absente" });
    const t0 = Date.now();
    const path = `/rest/v1/progress?account_id=eq.${REMOTE_ROW}&select=data,updated_at`;
    restCall(remote, "GET", path, null, (err, out) => {
      const ms = Date.now() - t0;
      if (err) {
        noteError(err);
        return done({ ok: false, ms, error: err.message });
      }
      noteOk();
      let row = null;
      try {
        row = JSON.parse(out)[0] ?? null;
      } catch {
        row = null;
      }
      done({ ok: true, ms, row });
    });
  }

  /* Remise a zero : supprime la ligne distante ET vide la memoire, dans cet
     ordre. Les deux ensemble ou rien — supprimer la ligne en laissant la
     memoire ferait tout repousser au save() suivant (le piege documente du
     redemarrage obligatoire, qu'on supprime ici), et vider la memoire sans la
     ligne laisserait l'ancien etat revenir au prochain boot.

     On attend d'abord la fin d'un envoi en vol : son corps est deja serialise,
     il pourrait atterrir APRES la suppression et ressusciter la ligne. Tout
     envoi retenu (dirty, minuteur) est annule pour la meme raison. L'appelant
     doit relier les profils des clients connectes a des objets neufs — les
     references qu'il garde pointent sur l'ancien contenu. */
  function reset(done) {
    if (!remote) return done(new Error("configuration Supabase absente"));
    const deadline = Date.now() + REMOTE_TIMEOUT_MS + 500;
    const wait = () => {
      if (pushing && Date.now() < deadline) return setTimeout(wait, 50);
      dirty = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      restCall(remote, "DELETE", `/rest/v1/progress?account_id=eq.${REMOTE_ROW}`, null, err => {
        if (err) {
          noteError(err);
          return done(err);
        }
        noteOk();
        for (const k of Object.keys(data.players)) delete data.players[k];
        // Une table qu'on vient de vider soi-meme est une table lue : si le
        // boot etait encore suspendu, la suppression vaut lecture reussie.
        loaded = true;
        done(null);
      });
    };
    wait();
  }

  /* Vidage final avant l'arret du processus. Ne au deploiement en conteneur :
     la plateforme envoie SIGTERM puis tue, et sans copie disque un envoi en
     vol ou retenu par un minuteur de reessai serait perdu pour de bon. UNE
     tentative, bornee dans le temps — a l'arret, boucler sur des reessais ne
     ferait que retarder le SIGKILL. `done` est toujours appele. */
  function flush(done) {
    if (!remote || !loaded) return done();
    push();
    const deadline = Date.now() + REMOTE_TIMEOUT_MS + 500;
    const wait = () => {
      if ((!pushing && !dirty) || Date.now() > deadline) return done();
      setTimeout(wait, 50);
    };
    wait();
  }

  /* Le PSEUDO n'est pas une identite : n'importe qui peut taper le tien. La
     cle est un identifiant tire au sort a la premiere connexion, stocke dans
     le localStorage du client et envoye au join — le pseudo n'est plus qu'un
     affichage, mis a jour a chaque connexion. */
  function profileFor(uid, name) {
    let p = data.players[uid];
    if (!p) {
      p = newProfile(name);
      data.players[uid] = p;
    } else if (name) {
      p.name = name;
    }
    return p;
  }

  /* Reserve un pseudo pour un compte et rend le code EN CLAIR — la seule fois
     ou il existe hors hachage ; l'appelant l'affiche puis l'oublie. Re-reserver
     (meme pseudo ou un autre) regenere le code : c'est la reponse a « j'ai
     perdu mon papier » sans machinerie de reinitialisation.

     Le pseudo n'est PAS unique : c'est le couple pseudo#tag qui l'est. Le tag
     — quatre chiffres tires au sort — permet a deux personnes de s'appeler
     Kevin sans se marcher dessus. Re-reserver le MEME pseudo garde le tag :
     l'identite que les autres joueurs connaissent ne change pas quand on
     regenere un code perdu. */
  function claimPseudo(uid, pseudo) {
    const p = data.players[uid];
    if (!p) return { error: "compte inconnu" };
    const lower = pseudo.toLowerCase();
    let tag = (p.pseudo && p.pseudo.toLowerCase() === lower && p.tag) ? p.tag : null;
    if (!tag) {
      const taken = new Set();
      for (const [otherUid, other] of Object.entries(data.players)) {
        if (otherUid !== uid && other.pseudo && other.pseudo.toLowerCase() === lower) {
          taken.add(other.tag);
        }
      }
      // 10 000 tags pour une table de LAN : la boucle ne tourne qu'en theorie.
      do {
        tag = String(randomBytes(2).readUInt16BE(0) % 10000).padStart(4, "0");
      } while (taken.has(tag));
    }
    const code = generateCode();
    const salt = randomBytes(16).toString("hex");
    p.pseudo = pseudo;
    p.tag = tag;
    p.code = { salt, hash: hashCode(code, salt) };
    save();
    return { code, tag };
  }

  /* Retrouve l'identifiant d'un compte par pseudo + code. Accepte « Kevin »
     comme « Kevin#4821 » : le code a ~40 bits d'entropie, il designe son
     compte a lui seul — le tag ne sert qu'a restreindre les candidats. On
     essaie donc TOUS les homonymes au lieu de s'arreter au premier : le bon
     compte peut etre le troisieme Kevin. `timingSafeEqual` par principe —
     sur un LAN l'attaque temporelle est theorique, la version sure coute une
     ligne. */
  function recoverUid(pseudoInput, code) {
    const s = String(pseudoInput ?? "");
    const hashIdx = s.indexOf("#");
    const pseudo = (hashIdx >= 0 ? s.slice(0, hashIdx) : s).trim().toLowerCase();
    const tag = hashIdx >= 0 ? s.slice(hashIdx + 1).replace(/\D/g, "") : null;
    if (!pseudo) return null;
    for (const [uid, p] of Object.entries(data.players)) {
      if (!p.pseudo || !p.code || p.pseudo.toLowerCase() !== pseudo) continue;
      if (tag && p.tag !== tag) continue;
      const expected = Buffer.from(p.code.hash, "hex");
      const got = Buffer.from(hashCode(code, p.code.salt), "hex");
      if (expected.length === got.length && timingSafeEqual(expected, got)) return uid;
    }
    return null;
  }

  return { data, ready, save, flush, status, probe, reset, profileFor, claimPseudo, recoverUid };
}
