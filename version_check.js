
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

function git(args) {
  return gitRaw(args).trim();
}

const SOURCE_EXT = [".js", ".css", ".html"];

function isSource(path) {
  if (path.startsWith("docs/") || path.endsWith(".md")) return false;
  return SOURCE_EXT.some(ext => path.endsWith(ext));
}

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

const pkgVersion = JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8")).version;
if (pkgVersion !== VERSION) {
  fail(`package.json annonce ${pkgVersion}, ${VERSION_FILE} annonce ${VERSION}`
    + ` — aligne package.json (c'est ${VERSION_FILE} qui fait foi)`);
}

let base = "";
try {
  base = git(["log", "-1", "--format=%H", "--", VERSION_FILE]);
} catch (err) {
  fail(`git indisponible ou hors depot (${err.message.trim().split("\n")[0]})`);
}

if (!base) {
  console.log(`\n  version-check : ${VERSION_FILE} pas encore commite`
    + ` — le bump vers ${VERSION} est dans ce commit. OK\n`);
  process.exit(0);
}

const committed = git(["diff", "--name-only", `${base}..HEAD`]).split("\n").filter(Boolean);

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
