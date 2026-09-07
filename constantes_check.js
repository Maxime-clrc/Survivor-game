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

/* TROIS TABLES MANQUAIENT A CETTE LISTE, ET C EST LE MEME DEFAUT QUE CELUI QUE
   CE FICHIER EXISTE POUR ATTRAPER : `ATK_CFG`, `BORNE_CFG` et `MINI_CFG` ont ete
   ajoutees par des lots successifs sans que personne les inscrive, donc leurs
   constantes mortes n auraient rien leve. Une liste tenue a la main est une
   liste qu on oublie ; celle-ci est au moins verifiee a chaque commit. */
const TABLES = ["CFG", "CARD_CFG", "SKILL_CFG", "STATUS_CFG", "BOSS_CFG", "TL_CFG",
  "TRAIT_CFG", "BIOME_CFG", "ARME_CFG", "HF_CFG", "PROG_CFG", "RELIC_CFG",
  "NAV_CFG", "PILOT_CFG", "ROLE_CFG", "ATK_CFG", "BORNE_CFG", "MINI_CFG",
  "LOOT_CFG", "TENSION_CFG"];

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


/* ===========================================================================
   ET LE SYMETRIQUE : UNE VALEUR ECRITE EN DUR LA OU UN POINT DE PASSAGE EXISTE.

   Une constante sans lecteur ment sur ce que le jeu fait ; un litteral pose a
   cote d une constante fait DIVERGER ce qui devrait etre unique, et il ne leve
   pas davantage. Mesure a l ouverture du lot 35 : l ombre portee d un prop
   s ecrivait avec DIX-SEPT opacites differentes, de 0,16 a 0,55 — un facteur 3,4
   entre deux objets poses cote a cote. `lumDir()` unifiait deja la DIRECTION de
   l ombre, et le depot dit pourquoi : deux ombres qui divergent sur le meme
   ecran est LE defaut visible d un rendu 2D. L opacite, elle, n avait pas de
   point de passage.

   MEME PLACE QUE LE RESTE DU FICHIER : ca lit les SOURCES, ce qu un navigateur
   ne peut pas faire. La regle est nommee par son POINT DE PASSAGE, pas par un
   fichier : le jour ou l ombre d un prop se dessine ailleurs, la regle suit.
   =========================================================================== */
const DUR = [
  { quoi: "l opacite de l ombre d un prop", ou: "render/props.js",
    motif: /alpha\(PROP\.ombre,\s*[0-9]/g, passage: "ombre()" },
];

const sep = process.platform === "win32" ? "\\" : "/";

export function litterauxEnDur() {
  const src = sources();
  const trouves = [];
  for (const regle of DUR) {
    for (const [nom, s] of src) {
      if (!nom.split(sep).join("/").endsWith(regle.ou)) continue;
      const n = (s.match(regle.motif) ?? []).length;
      if (n > 0) trouves.push({ ...regle, nom, n });
    }
  }
  return trouves;
}

const direct = process.argv[1] && import.meta.url.endsWith(
  process.argv[1].replace(/\\/g, "/").split("/").pop());
if (direct) {
  const morts = await constantesMortes();
  const durs = litterauxEnDur();
  if (morts.length === 0 && durs.length === 0) {
    console.log("\n  constantes-check : aucune constante sans lecteur,"
      + " aucun litteral hors de son point de passage. OK\n");
  } else {
    if (morts.length) {
      console.log(`\n  constantes-check : ${morts.length} sans lecteur\n`);
      for (const m of morts) console.log(`    ${m.table}.${m.clef} — ${m.pourquoi}`);
    }
    if (durs.length) {
      console.log(`\n  constantes-check : ${durs.length} litteral(aux) hors point de passage\n`);
      for (const d of durs) {
        console.log(`    ${d.nom} : ${d.n} fois ${d.quoi} en dur — passer par \`${d.passage}\``);
      }
    }
    console.log();
    process.exitCode = 1;
  }
}
