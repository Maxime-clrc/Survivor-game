/* ===========================================================================
   PERSISTANCE DE LA PROGRESSION (lot D) — cote serveur uniquement.

   Un seul fichier, `data/progress.json`, ecrit par le processus qui sert deja
   le jeu. Trois risques traites des la premiere ligne :

     - le VERSIONNAGE : le champ `version` est present des la premiere
       ecriture, et une version inconnue est ignoree en journalisant — le
       premier changement de format n'efface pas la progression du groupe ;
     - l'ECRITURE ATOMIQUE : on ecrit dans `progress.json.tmp` puis on renomme.
       Une coupure en pleine ecriture sur le fichier unique emporterait toute
       la progression ; le renommage est atomique sur les systemes de fichiers
       courants (et `fs.rename` remplace la cible existante, y compris sous
       Windows) ;
     - un fichier CORROMPU OU ABSENT ne bloque jamais le demarrage : on repart
       d'un fichier neuf en journalisant l'incident.

   L'ecriture est synchrone et c'est assume : elle n'a lieu qu'au salon, a la
   fin d'une manche ou au depart d'un joueur — JAMAIS pendant une vague, ou un
   acces disque dans la boucle de simulation produirait un a-coup visible.

   REPLIQUE SUPABASE (facultative). Le fichier local reste la source chaude ;
   Supabase n'est qu'une copie de secours hors machine, pour survivre a une
   reinstallation du VPS. Quatre regles :

     - elle n'existe que si la configuration est fournie : variables
       d'environnement SUPABASE_URL / SUPABASE_SERVICE_KEY, ou a defaut le
       fichier `data/supabase.json` ({"url": ..., "key": ...}) — un fichier a
       cote de progress.json plutot qu'une configuration systemd/pm2, parce que
       poser un fichier est le seul geste qu'on peut demander sans connaitre le
       mode de lancement du serveur. `data/` est dans le .gitignore : la cle ne
       peut pas partir dans le depot. Sans l'un ni l'autre, ce module se
       comporte exactement comme avant, et le jeu reste jouable en LAN sans
       internet ;
     - le push suit chaque save(), en ASYNCHRONE et sans jamais bloquer ni
       planter : un echec reseau se journalise et la vie continue. Les pushes
       sont serialises (un seul en vol, le suivant attend) parce que deux
       reponses HTTP peuvent se croiser et une vieille ecraserait la neuve ;
     - la recuperation ne se tente QUE si le fichier local manque ou est
       invalide : un fichier present et sain a toujours raison, meme si la
       replique est plus recente — c'est lui que le serveur vient d'ecrire ;
     - la replique est UNE ligne (`account_id` = "serveur") qui porte le
       fichier entier, et non une ligne par joueur : memes semantiques que le
       fichier (versionnage compris), un seul upsert atomique, et le tableau
       de bord Supabase sait toujours requeter dans le jsonb. */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join } from "node:path";
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

/* Les variables d'environnement priment (elles permettent de tester avec un
   autre projet sans toucher au fichier) ; le fichier `data/supabase.json` est
   le chemin ordinaire sur le VPS. Un fichier illisible ou incomplet se
   journalise et desactive la replique — jamais de crash au boot. */
function remoteConfig(env, dir, log) {
  let url = env.SUPABASE_URL;
  let key = env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    try {
      const raw = JSON.parse(readFileSync(join(dir, "supabase.json"), "utf8"));
      url = raw?.url;
      key = raw?.key;
      if (!url || !key) {
        log("data/supabase.json présent mais incomplet (attendu : url et key) — réplique désactivée");
        return null;
      }
    } catch (e) {
      if (e.code !== "ENOENT") {
        log(`data/supabase.json illisible (${e.message}) — réplique désactivée`);
      }
      return null;
    }
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

export function createStore(root, log = console.log) {
  const dir = join(root, "data");
  const file = join(dir, "progress.json");
  const remote = remoteConfig(process.env, dir, log);

  /* `data` n'est JAMAIS reassigne : server.js garde la reference retournee,
     et la recuperation Supabase mute ses proprietes en place. */
  const data = { version: PROG_CFG.VERSION, players: {} };
  let localOk = false;

  function validate(raw) {
    if (!raw || typeof raw !== "object" || !raw.players || typeof raw.players !== "object") return false;
    if (raw.version !== PROG_CFG.VERSION) {
      // Migration explicite : la seule version connue est la premiere. Une
      // version future ajoutera son cas ICI plutot que d'ecraser le fichier.
      log(`progression en version ${raw.version} inconnue — ignorée, progression neuve`);
      return false;
    }
    return true;
  }

  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    if (validate(raw)) {
      data.version = raw.version;
      data.players = raw.players;
      localOk = true;
    }
  } catch (e) {
    if (e.code !== "ENOENT") {
      log(`progress.json illisible (${e.message}) — progression neuve`);
    }
  }

  /* Push serialise : un seul en vol. `dirty` retient qu'un save() a eu lieu
     pendant l'envoi — on repartira avec l'etat le plus recent, pas celui du
     moment de la demande. */
  let pushing = false;
  let dirty = false;
  function push() {
    if (!remote) return;
    if (pushing) {
      dirty = true;
      return;
    }
    pushing = true;
    const row = [{ account_id: REMOTE_ROW, data, updated_at: new Date().toISOString() }];
    restCall(remote, "POST", "/rest/v1/progress", row, err => {
      pushing = false;
      if (err) log(`réplique Supabase : envoi impossible (${err.message})`);
      if (dirty) {
        dirty = false;
        push();
      }
    });
  }

  function save() {
    try {
      mkdirSync(dir, { recursive: true });
      const tmp = file + ".tmp";
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, file);
    } catch (e) {
      // Un disque plein ou un droit manquant ne doit pas tuer le serveur en
      // pleine partie : on journalise, la progression vivra en memoire.
      log(`écriture de progress.json impossible : ${e.message}`);
    }
    // Le push part meme si le disque a echoue : la replique devient alors la
    // seule copie qui survivra a un redemarrage.
    push();
  }

  /* Recuperation au boot, seulement sans fichier local sain. Elle arrive une
     ou deux secondes apres le demarrage : si un joueur s'est connecte entre
     temps, son profil neuf a raison et la replique ne comble que les absents. */
  if (remote && !localOk) {
    const path = `/rest/v1/progress?account_id=eq.${REMOTE_ROW}&select=data`;
    restCall(remote, "GET", path, null, (err, out) => {
      if (err) {
        log(`réplique Supabase : récupération impossible (${err.message})`);
        return;
      }
      let raw;
      try {
        raw = JSON.parse(out)[0]?.data;
      } catch {
        raw = null;
      }
      if (!raw) return; // pas de ligne : premier lancement, rien a recuperer
      if (!validate(raw)) return;
      let adopted = 0;
      for (const [uid, p] of Object.entries(raw.players)) {
        if (!data.players[uid]) {
          data.players[uid] = p;
          adopted++;
        }
      }
      if (adopted > 0) {
        log(`réplique Supabase : ${adopted} profil(s) récupéré(s)`);
        save(); // grave la recuperation sur disque sans attendre une fin de manche
      }
    });
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

  return { data, save, profileFor, claimPseudo, recoverUid };
}
