/* ===========================================================================
   UNE CONSTANTE SANS LECTEUR NE LEVE RIEN, ET C'EST LE RISQUE N°1 DU DEPOT.

   Elle ne casse pas : elle reste dans la table, elle se lit comme un reglage,
   et elle ment sur ce que le jeu fait. Six cas trouves au balayage du plan 29 —
   un bloc `CFG.SEAL_*` double de `BOSS_CFG.SEAL_*`, un cooldown de touche sur un
   drone qui se consomme, une intensite de ralentissement que le canal global
   portait deja, une purge comptee en touches remplacee par une purge comptee en
   temps. Aucun n'a ete trouve en jouant.

   IL VIT ICI ET NON DANS `shared/` : il lit les SOURCES avec `node:fs`, ce qu'un
   navigateur ne peut pas faire. Meme place que `version_check.js`, meme forme —
   un outil de depot, pas du code de jeu.

   DEUX FACONS DE LIRE UNE CONSTANTE, ET IL FAUT LES DEUX. `CFG.TICK` se compte
   litteralement ; `C.GUST_PERIOD` passe par un alias local, et sept constantes de
   meteo se lisent ainsi. Un balayage qui ignore les alias rend sept faux positifs
   et devient inutilisable — donc on accepte `.CLEF` dans le fichier QUI DEFINIT
   la table, et nulle part ailleurs.
   =========================================================================== */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));

const TABLES = ["CFG", "CARD_CFG", "SKILL_CFG", "STATUS_CFG", "BOSS_CFG", "TL_CFG",
  "TRAIT_CFG", "BIOME_CFG", "ARME_CFG", "HF_CFG", "PROG_CFG", "RELIC_CFG",
  "NAV_CFG", "PILOT_CFG", "ROLE_CFG"];

const MODULES = ["game_state.js", "cards.js", "classes.js", "statuses.js",
  "bosses.js", "timeline.js", "enemies.js", "biomes.js", "armes.js",
  "hauts_faits.js", "progression.js", "reliques.js", "navigation.js"];

const IGNORE = new Set(["node_modules", "docs", "traces", ".git"]);
const MOT = /[A-Za-z0-9_$]/;

function sources() {
  const out = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (IGNORE.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|html)$/.test(e.name) && e.name !== "version.js") {
        out.push([p, readFileSync(p, "utf8")]);
      }
    }
  })(ROOT);
  return out;
}

// une occurrence n'en est une que si elle n'est pas un morceau d'un nom plus
// long : `CFG.SEAL_RADIUS` se trouve dans `BOSS_CFG.SEAL_RADIUS`, et le bloc
// mort de `CFG` s'est cache derriere celui de `BOSS_CFG` pendant tout un plan.
function occurrences(texte, motif, bordGauche = true) {
  let n = 0, i = 0;
  for (;;) {
    i = texte.indexOf(motif, i);
    if (i < 0) return n;
    const avant = texte[i - 1], apres = texte[i + motif.length];
    const gauche = !bordGauche || !avant || !MOT.test(avant);
    if (gauche && (!apres || !MOT.test(apres))) n++;
    i += motif.length;
  }
}

export async function constantesMortes() {
  const src = sources();
  const morts = [];

  for (const table of TABLES) {
    let obj = null;
    for (const m of MODULES) {
      const mod = await import(new URL(`./shared/${m}`, import.meta.url));
      if (mod[table]) { obj = mod[table]; break; }
    }
    if (!obj) { morts.push({ table, clef: "", pourquoi: "table introuvable" }); continue; }
    /* LE PROPRIETAIRE EST CELUI QUI LA DEFINIT, PAS CELUI QUI LA REEXPORTE :
       `game_state.js` reexporte `BIOME_CFG`, donc le premier module qui repond a
       l import n'est pas le fichier ou vivent les alias. */
    const proprietaire = src.find(([, s]) => s.includes(`const ${table} = {`))?.[1] ?? "";

    for (const clef of Object.keys(obj)) {
      let n = 0;
      for (const [, s] of src) n += occurrences(s, `${table}.${clef}`);
      if (n > 0) continue;
      // lecture par alias, admise dans le seul fichier qui declare la table :
      // la definition elle-meme s'ecrit `CLEF:` et ne compte donc pas.
      // le bord GAUCHE ne se teste pas ici : le caractere qui precede est
      // justement l alias (`C` dans `C.GUST_PERIOD`), donc l exiger vide la regle.
      if (occurrences(proprietaire, `.${clef}`, false) > 0) continue;
      morts.push({ table, clef, pourquoi: "aucun lecteur" });
    }
  }
  return morts;
}

const direct = process.argv[1] && import.meta.url.endsWith(
  process.argv[1].replace(/\\/g, "/").split("/").pop());
if (direct) {
  const morts = await constantesMortes();
  if (morts.length === 0) {
    console.log("\n  constantes-check : aucune constante sans lecteur. OK\n");
  } else {
    console.log(`\n  constantes-check : ${morts.length} sans lecteur\n`);
    for (const m of morts) console.log(`    ${m.table}.${m.clef} — ${m.pourquoi}`);
    console.log();
    process.exitCode = 1;
  }
}
