/* ===========================================================================
   GARDE-FOU DE VERSION — `npm run version-check`, a lancer avant de pousser.

   Il existe parce que la detection d'onglet perime posee au lot O est
   SILENCIEUSEMENT INUTILE si personne ne bumpe : le client compare sa `VERSION`
   a celle du serveur, donc deux codes differents portant le meme numero ne
   declenchent aucune mention ambre. Rien ne le signale — c'est exactement le
   defaut que `package.json`, fige a 0.6.0 depuis le premier commit, avait.

   Le script ne modifie RIEN. Il dit non, il ne bumpe pas a la place : un bump
   automatique choisirait un numero sans savoir quel lot il livre, or c'est
   precisement ce que la table d'historique de `shared/version.js` doit porter.

   Zero dependance, comme le reste du depot : `node:child_process` et rien
   d'autre. Ce fichier est a la racine et non dans un `tools/` — l'arborescence
   est plate (server.js, hub.js, room.js, progress_store.js), on ne cree pas un
   dossier pour un fichier.
   =========================================================================== */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { VERSION } from "./shared/version.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const VERSION_FILE = "shared/version.js";

function gitRaw(args) {
  return execFileSync("git", args,
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/* Pour les sorties d'UNE valeur (un hash, une liste de chemins) : le `trim`
   enleve le saut de ligne final. */
function git(args) {
  return gitRaw(args).trim();
}

/* Ce qui compte comme SOURCE DEPLOYEE. Les documents en sont dehors : un plan
   ajoute sous `docs/` ou une mesure corrigee dans le LISEZMOI ne change pas une
   ligne de ce que le navigateur execute, et exiger un bump pour eux ferait
   perdre au signal toute sa valeur — on finirait par bumper sans regarder. */
const SOURCE_EXT = [".js", ".css", ".html"];

function isSource(path) {
  if (path.startsWith("docs/") || path.endsWith(".md")) return false;
  return SOURCE_EXT.some(ext => path.endsWith(ext));
}

/* Le travail NON COMMITE compte, et ce n'est pas un supplement de confort : on
   lance ce script avant de pousser, donc le changement a attraper n'est
   justement pas encore dans l'historique. `--porcelain` donne deux colonnes
   d'etat puis le chemin ; un renommage s'ecrit « ancien -> nouveau », et c'est
   la destination qui nous interesse.

   `gitRaw` et SURTOUT PAS `git` : le `trim` de ce dernier enleve l'espace de
   tete de la PREMIERE ligne — « ` M chemin` » devient « `M chemin` », le prefixe
   d'etat passe de trois a deux caracteres, et le `slice(3)` rogne alors la
   premiere lettre du chemin. Le bug a existe : il ne touchait qu'une entree sur
   N, celle du haut, ce qui le rendait facile a prendre pour un defaut
   d'affichage. Dans ce format la colonne est significative. */
function workingTree() {
  const out = [];
  for (const line of gitRaw(["status", "--porcelain"]).split("\n")) {
    if (!line.trim()) continue;
    const path = line.slice(3).trim().replace(/^.*? -> /, "").replace(/^"|"$/g, "");
    out.push(path);
  }
  return out;
}

function fail(msg) {
  console.error(`\n  version-check : ${msg}\n`);
  process.exit(1);
}

/* --- 1. package.json doit s'accorder ---------------------------------------
   Meme controle que le garde-fou de demarrage de `server.js`, mais AVANT le
   deploiement : le decouvrir dans un journal de boot, c'est le decouvrir apres
   que les joueurs sont dessus. */
const pkgVersion = JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8")).version;
if (pkgVersion !== VERSION) {
  fail(`package.json annonce ${pkgVersion}, ${VERSION_FILE} annonce ${VERSION}`
    + ` — aligne package.json (c'est ${VERSION_FILE} qui fait foi)`);
}

/* --- 2. depuis quand la constante n'a-t-elle pas bouge ? -------------------
   Le dernier commit qui a touche le fichier de version EST le dernier bump :
   on ne peut pas modifier la constante sans modifier le fichier. */
let base = "";
try {
  base = git(["log", "-1", "--format=%H", "--", VERSION_FILE]);
} catch (err) {
  fail(`git indisponible ou hors depot (${err.message.trim().split("\n")[0]})`);
}

/* Vide = le fichier n'a jamais ete commite, donc il est en train d'etre
   introduit et le bump est dans ce commit-ci. C'etait l'etat du depot au moment
   ou le lot O a ete ecrit, et un script qui echoue sur son propre lot fondateur
   serait abandonne le jour meme. */
if (!base) {
  console.log(`\n  version-check : ${VERSION_FILE} pas encore commite`
    + ` — le bump vers ${VERSION} est dans ce commit. OK\n`);
  process.exit(0);
}

/* --- 3. les sources ont-elles bouge depuis ? ------------------------------- */
const committed = git(["diff", "--name-only", `${base}..HEAD`]).split("\n").filter(Boolean);

/* `VERSION_FILE` ne peut PAS apparaitre dans `base..HEAD` : `base` est par
   construction le dernier commit qui l'a touche, et la plage l'exclut. Il n'y
   arrive donc que par le travail non commite — c'est-a-dire par le bump qu'on
   est en train de faire, et c'est exactement le signal cherche. */
const dirty = workingTree();
const bumped = dirty.includes(VERSION_FILE);

const changed = [...new Set([...committed, ...dirty])].filter(isSource);

if (changed.length && !bumped) {
  fail(`${changed.length} fichier(s) source modifie(s) depuis le dernier bump`
    + ` (${base.slice(0, 7)}) sans que ${VERSION_FILE} suive :\n`
    + changed.map(f => `      ${f}`).join("\n")
    + `\n\n  Un lot livre = un bump. Incremente ${VERSION_FILE} et ajoute sa ligne`
    + `\n  a la table d'historique, puis aligne package.json.`);
}

console.log(`\n  version-check : v${VERSION}`
  + `${bumped ? " (bump en cours)" : ""}`
  + `${changed.length ? "" : " — aucune source modifiee depuis le dernier bump"}. OK\n`);
