/* ===========================================================================
   LA SUITE DE VERIFICATION, EN UN SEUL POINT D'ENTREE.

   TRENTE-QUATRE VERIFICATEURS VIVAIENT DANS NEUF MODULES ET PERSONNE NE LES
   LANCAIT. Chacun est ecrit a cote de sa donnee — c'est la bonne place, et elle
   ne change pas ici. Ce qui manquait est la liste : sans elle, on rejoue ceux
   auxquels on pense, et les autres derivent en silence.

   DEUX L'AVAIENT DEJA FAIT. Le plan 29 a densifie la mi-manche de 17 % au lot 5 ;
   personne n'a rejoue l'equilibre des armes ni la courbe de progression, et les
   deux etaient rouges quatre lots plus tard — trouves par hasard, en cherchant
   autre chose. C'est le seul defaut de ce depot qu'aucun verificateur ne pouvait
   attraper, parce qu'il est dans l'ABSENCE d'appel.

   LE COUT SEPARE LES DEUX MODES, ET C'EST LA SEULE RAISON. `verifierMarchand`
   simule des manches completes : 861 s a lui seul, contre 12 s pour les vingt-cinq
   verificateurs de TABLE reunis. Un outil qu'on n'ose pas lancer ne se lance pas,
   donc le mode par defaut est celui qu'on peut lancer avant chaque commit.

     node verif.js           les tables et les invariants — quelques secondes
     node verif.js --tout    plus les campagnes simulees — une vingtaine de minutes
     node verif.js --lent    les campagnes seules

   IL NE COUVRE PAS LE RENDU : `verifierTraces`, `verifierZones`, `verifierBlocs`,
   `verifierLed`, `verifierAmers`, `verifierFonds` et `verifierBaies` vivent dans
   `public/render/*`, qui importe `stage.js`, donc le DOM. Les faire tourner ici
   demanderait un faux canvas — un deuxieme systeme a tenir, pour des tables que
   le navigateur verifie deja au chargement.
   =========================================================================== */

import { CFG, GameState, DIFF_NORMAL } from "./shared/game_state.js";
import * as G from "./shared/game_state.js";
import * as C from "./shared/cards.js";
import * as A from "./shared/armes.js";
import * as H from "./shared/hauts_faits.js";
import * as P from "./shared/palette.js";
import * as N from "./shared/navigation.js";
import * as B from "./shared/bosses.js";
import * as E from "./shared/enemies.js";
import * as F from "./shared/feedback.js";
import * as PR from "./shared/progression.js";
import * as R from "./shared/reliques.js";
import { BIOMES } from "./shared/biomes.js";
import { constantesMortes } from "./constantes_check.js";

/* `audio.js` NE DEPEND DE RIEN — sauf d'un `AudioContext`, qu'un script de mesure
   doit lui fournir. C'est la seule facon d'atteindre `recettes()`, et sans elle
   `verifierFeedback` ne croise plus rien : il compare des noms de son CALCULES a
   ceux qui existent, donc une liste vide le rend muet au lieu de bavard. */
globalThis.AudioContext ??= class {
  createGain() { return { connect() {}, gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} } }; }
};
globalThis.window ??= globalThis;
globalThis.document ??= { createElement: () => ({ getContext: () => ({}) }) };
const { recettes } = await import("./public/audio.js");

/* Trois verificateurs de `bosses.js` rendent `{ ok, err }` et non un tableau : ils
   servaient aussi a INSPECTER (les formes, les paires compatibles). On lit `err`
   sans toucher a leur forme — la suite s'adapte a ses membres, pas l'inverse.
   `note` porte ce qui N EST PAS un rouge : un echantillon trop maigre est un
   defaut de la MESURE, pas du jeu, et `verifierBoss` en comptait deux comme des
   problemes — sept la ou il y en a cinq. On les affiche, on ne les compte pas. */
const soucisDe = r => Array.isArray(r) ? r : (r?.err ?? []);
const notesDe = r => Array.isArray(r) ? [] : (r?.note ?? []);

const cardIds = new Set(C.CARDS.map(c => c.id));
const relicIds = new Set(R.RELICS.map(r => r.id));
const armeIds = new Set(A.ARMES.filter(a => a.id !== A.ARME_DEFAUT).map(a => a.id));

// `verifierEffets` mesure les emplacements d'un tuple d'effet : il lui faut une
// partie vivante, pas une table.
function unePartie() {
  const g = new GameState(DIFF_NORMAL);
  g.addPlayer(1, "bot", 0, 0);
  return g;
}

/* LE DRAPEAU `lent` EST MESURE, PAS SUPPOSE. `verifierBoss` lit une table de
   mecaniques et prend 446 s : il rejoue chaque boss en combat. `verifierBiomes`
   genere 200 graines sur cinq lieux et prend 0,0 s. Deviner d'apres le nom
   donnait exactement l'inverse dans les deux cas. */
const SUITE = [
  ["constantes", () => constantesMortes().then(m =>
    m.map(x => `${x.table}.${x.clef} — ${x.pourquoi}`))],
  ["catalogue", () => C.verifierCatalogue()],
  // au CONTENU COMPLET et au COMPTE NEUF : la carte de rarete 3 de chaque
  // famille est la recompense d un haut fait, donc le bassin le plus maigre est
  // celui d un compte qui commence — et c est le seul que la mesure ignorait.
  ["builds", () => C.verifierBuilds(PR.lockedCards({ hf: [] }))],
  ["pools", () => C.verifierPools()],
  ["cartes", () => G.verifierCartes()],
  ["armes", () => A.verifierArmes(C.CARDS, C.axesDeCarte)],
  ["reliques", () => G.verifierReliques()],
  ["hautsFaits", () => H.verifierHautsFaits(cardIds, relicIds, armeIds)],
  ["codex", () => PR.verifierCodex()],
  ["classes", () => G.verifierClasses(), true],
  ["boss", () => G.verifierBoss(), true],
  ["archetypes", () => B.verifierArchetypes()],
  ["grammaire", () => B.verifierGrammaire()],
  ["prises", () => B.verifierPrises()],
  ["coexistence", () => B.verifierCoexistence()],
  ["fiches", () => E.verifierFiches()],
  ["elites", () => G.verifierElites()],
  ["traits", () => G.verifierTraits(), true],
  ["script", () => G.verifierScript()],
  ["biomes", () => G.verifierBiomes()],
  ["navigation", () => BIOMES.flatMap((b, i) =>
    [0, 1, 2].flatMap(d => N.verifierNavigation(
      new GameState(d, i, 7).obstacles, CFG.ARENA_W, CFG.ARENA_H)
      .map(s => `${b.key}/d${d} : ${s}`)))],
  ["charte", () => P.verifierCharte()],
  ["feedback", () => F.verifierFeedback(A.ARMES, E.ENEMY_TYPES, recettes())],
  ["effets", () => G.verifierEffets(unePartie())],
  ["bonus", () => G.verifierBonus()],
  ["meta", () => G.verifierMeta(), true],
  ["mecaniques", () => G.verifierMecaniques(), true],
  ["deplacement", () => G.verifierDeplacement(), true],
  ["vitesses", () => G.verifierVitesses(), true],
  ["equilibreArmes", () => G.verifierEquilibreArmes(3, 10), true],
  ["contribution", () => G.verifierContribution(), true],
  ["progression", () => G.verifierProgression(), true],
  ["tirageBonus", () => G.verifierTirageBonus(), true],
  ["rythmeBonus", () => G.verifierRythmeBonus(), true],
  ["encerclement", () => G.verifierEncerclement(), true],
  ["population", () => G.verifierPopulation(), true],
  ["marchand", () => G.verifierMarchand(), true],
];

const args = new Set(process.argv.slice(2));
const tout = args.has("--tout");
const lentSeul = args.has("--lent");

console.log();
let rouges = 0, joues = 0;
const debut = Date.now();
for (const [nom, fn, lent] of SUITE) {
  if (lent && !tout && !lentSeul) continue;
  if (!lent && lentSeul) continue;
  const t0 = Date.now();
  /* LE JOURNAL DU POOL APPARTIENT AU SERVEUR EN JEU. `_poolWarn()` ecrit sur la
     console a chaque offre trop maigre : sur une campagne simulee il rend des
     centaines de lignes et noie le resultat. On le COMPTE au lieu de le taire —
     un banc qui trouve un pool vide reste une information. */
  const vraiLog = console.log;
  let bruit = 0;
  console.log = () => { bruit++; };
  let soucis, notes = [];
  try {
    const r = await fn();
    soucis = soucisDe(r);
    notes = notesDe(r);
  } catch (e) {
    soucis = [`a leve : ${e.message}`];
  } finally {
    console.log = vraiLog;
  }
  joues++;
  const s = ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
  const bruitTxt = bruit ? `  (${bruit} ligne(s) de journal)` : "";
  const noteTxt = notes.length ? `  [${notes.length} non mesure(s)]` : "";
  if (!soucis || soucis.length === 0) {
    console.log(`  ${s} s  ${nom.padEnd(16)} vert${noteTxt}${bruitTxt}`);
  } else {
    rouges++;
    console.log(`  ${s} s  ${nom.padEnd(16)} ${soucis.length} PROBLEME(S)${noteTxt}${bruitTxt}`);
    for (const x of soucis) console.log(`             ${x}`);
  }
  for (const x of notes) console.log(`             · ${x}`);
  continue;
}
const total = ((Date.now() - debut) / 1000).toFixed(0);
console.log(`\n  ${joues} verificateurs, ${rouges} rouge(s), ${total} s\n`);
process.exitCode = rouges > 0 ? 1 : 0;
