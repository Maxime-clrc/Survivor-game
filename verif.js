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

   SAUF `sprites.js`, ET C EST L EXCEPTION QUI SE MESURE : il ne touche au DOM
   qu au FOUR, pas a l import, donc `verifierSilhouettes` ne demande rien d autre
   que de resoudre les specificateurs ABSOLUS du client. Il etait ecrit, exporte,
   et APPELE PAR PERSONNE — exactement le defaut que ce fichier existe pour
   fermer, et la seule chose qui garde les corps distinguables quand on en ajoute
   un de plus.
   =========================================================================== */

/* LE FAUX DOM ET LA RACINE DU CLIENT VIENNENT D UN SEUL ENDROIT. Ce fichier en
   tenait sa propre moitie — un `AudioContext`, un `document` a un seul appel — et
   renoncait aux neuf verificateurs de rendu faute du reste. `verif_dom.js` porte
   les deux, donc ils entrent. */
import "./verif_dom.js";

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
import * as B2 from "./shared/biomes.js";
import { verifierConditions, verifierPartage } from "./shared/custom.js";
import { verifierContrats } from "./shared/timeline.js";
import * as TL from "./shared/timeline.js";
import { constantesMortes } from "./constantes_check.js";
import { verifierRapport } from "./rapport.js";
import { verifierDessin } from "./verif_dessin.js";

const { recettes } = await import("./public/audio.js");
const S = await import("./public/sprites.js");
/* LES MODULES DE RENDU, POUR DE VRAI. Les charger EST le premier critere : une
   table qui reference un identifiant absent ne se leve qu a l evaluation, et
   c est le seul defaut de ce depot que `node --check` laisse passer entier. */
const RENDU = ["stage", "material", "props", "blocs", "dangers", "decor",
               "lumiere", "fx", "actors", "boss", "world"];
const rendu = {};
const SANS_MODULE = ["le module de rendu n a pas charge — voir « modulesRendu »"];
const renduEchecs = [];
for (const m of RENDU) {
  try { rendu[m] = await import(`./public/render/${m}.js`); }
  catch (e) { renduEchecs.push(`render/${m}.js — ${e.message}`); }
}

/* Trois verificateurs de `bosses.js` rendent `{ ok, err }` et non un tableau : ils
   servaient aussi a INSPECTER (les formes, les paires compatibles). On lit `err`
   sans toucher a leur forme — la suite s'adapte a ses membres, pas l'inverse.
   `note` porte ce qui N EST PAS un rouge : un echantillon trop maigre est un
   defaut de la MESURE, pas du jeu, et `verifierBoss` en comptait deux comme des
   problemes — sept la ou il y en a cinq. On les affiche, on ne les compte pas. */
const soucisDe = r => Array.isArray(r) ? r : (r?.err ?? []);
const notesDe = r => Array.isArray(r) ? [] : (r?.note ?? []);

/* TOUS LES BATTEMENTS DE TOUS LES SCRIPTS, A PLAT. `verifierTableDirector`
   croise les champs que le script porte avec ceux que le Director a le droit de
   toucher : sans la liste reelle, il ne verifierait qu une moitie du contrat. */
const battementsDuScript = () => {
  const out = [];
  for (const k of Object.keys(TL.SCRIPTS)) for (const seg of TL.SCRIPTS[k]) out.push(...seg);
  return out;
};

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
  ["classement", () => PR.verifierClassement()],
  ["conditions", () => verifierConditions(CFG.MAX_ENEMIES_HARD_CAP,
    CFG.MAX_ENEMIES_BASE, Math.max(...CFG.MAX_ENEMIES_DIFF))],
  ["rapport", () => verifierRapport()],
  ["ventilation", () => G.verifierVentilation(), true],
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
  /* CINQUANTE GRAINES, ET PLUS TROIS. Avec des variantes tirees PAR CELLULE,
     une graine ne montre qu un assemblage sur des milliers : trois graines
     couvraient le generateur d avant, elles ne couvrent plus celui-ci. Mesure :
     la suite passe de 1 a 2 s, ce qui reste sous le budget du mode rapide. */
  ["biomes", () => G.verifierBiomes(
    Array.from({ length: 50 }, (_, i) => i * 7 + 1))],
  /* PLUS DE GRAINES ICI : l arete de cellule n existe plus, une region est
     uniforme par construction et ce qui se touche est deux REGIONS — c est
     `regions` qui le rejoue sur des graines. Ne reste que ce qui se lit sur la
     TABLE : plancher, plafond, noms, bords declares. */
  ["variantes", () => B2.verifierVariantes()],
  /* MEME TAILLE REELLE, ET POUR UNE RAISON DE PLUS : le miroir de cellule, le
     tremblement de la Friche et le voisinage entre cellules ne se lisent pas
     dans la table. Une superposition de blocs ne leve rien — elle se voit, sur
     une capture d ecran, et c est comme ca qu elle est remontee. */
  /* UNE CARTE PORTE PLUSIEURS BIOMES D UN SEUL THEME, un par region. C est ce
     que ce verificateur mesure, et rien d autre ne le regardait : le decoupage
     est verifie (`districts`), les lois le sont (`variantes`), mais le fait
     qu une region porte UNE loi et que deux voisines en portent deux ne l etait
     pas. */
  ["regions", () => B2.verifierRegions(
    Array.from({ length: 24 }, (_, i) => i * 29 + 1),
    CFG.ARENA_W, CFG.ARENA_H, CFG.VIEW_W, CFG.VIEW_H)],
  ["superpositions", () => B2.verifierSuperpositions(
    Array.from({ length: 50 }, (_, i) => i * 7 + 1),
    CFG.ARENA_W, CFG.ARENA_H, CFG.VIEW_W, CFG.VIEW_H)],
  ["districts", () => B2.verifierDistricts(60,
    Math.round(CFG.ARENA_W / CFG.VIEW_W), Math.round(CFG.ARENA_H / CFG.VIEW_H))],
  /* LA LARGEUR DE PASSAGE, SUR TOUTE LA REGION ET SUR DES GRAINES. Le
     verificateur de navigation ne tournait que sur la graine 7 : avec des
     variantes tirees par cellule, une graine ne couvre presque rien, et un
     couloir se voit en jeu au lieu de se voir ici. */
  ["passages", () => BIOMES.flatMap((b, i) =>
    [0, 1, 2].flatMap(d => [1, 3, 7, 11, 23, 47, 99, 151].flatMap(s =>
      N.verifierNavigation(
        B2.buildBiome(i, d, s, CFG.ARENA_W, CFG.ARENA_H).obstacles,
        CFG.ARENA_W, CFG.ARENA_H).map(m => `${b.key}/d${d}/g${s} : ${m}`))))],
  ["grilles", () => G.verifierGrilles()],
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
  ["determinisme", () => G.verifierDeterminisme(), true],
  ["indices", () => G.verifierIndices(), true],
  ["custom", () => G.verifierCustom(), true],
  ["partage", () => verifierPartage()],
  ["contrats", () => verifierContrats()],
  ["objectifs", () => G.verifierObjectifs()],
  ["proposition", () => G.verifierProposition()],
  ["defense", () => G.verifierDefense()],
  ["minis", () => G.verifierMinis()],
  ["loot", () => G.verifierLoot(C.defaultMods)],
  ["tableDirector", () => G.verifierTableDirector(battementsDuScript())],
  ["etatsDirector", () => G.verifierEtatsDirector()],
  ["director", () => G.verifierDirector(), true],
  ["lootSol", () => G.verifierLootSol()],
  ["silhouettes", () => S.verifierSilhouettes()],
  /* UN MODULE QUI N A PAS CHARGE NE REND PAS "vert". Le repli des onze lignes
     suivantes est une PHRASE, pas un tableau vide : sans ca, une faute qui empeche
     le module de s evaluer eteignait ses propres verificateurs. */
  ["modulesRendu", () => renduEchecs],
  /* ET LE DECOR SE DESSINE VRAIMENT. Charger ne suffit pas : un identifiant
     utilise DANS une fonction et jamais importe ne leve qu a l APPEL, et
     `drawGrid` a livre exactement ca avec la suite entiere au vert. */
  ["dessin", () => verifierDessin()],
  ["zones", () => rendu.props?.verifierZones() ?? SANS_MODULE],
  ["traces", () => rendu.props?.verifierTraces() ?? SANS_MODULE],
  ["semis", () => rendu.props?.verifierSemis() ?? SANS_MODULE],
  ["blocsRendu", () => rendu.blocs?.verifierBlocs() ?? SANS_MODULE],
  ["led", () => rendu.blocs?.verifierLed() ?? SANS_MODULE],
  ["dangersRendu", () => rendu.dangers?.verifierDangers() ?? SANS_MODULE],
  ["amers", () => rendu.decor?.verifierAmers() ?? SANS_MODULE],
  ["baies", () => rendu.decor?.verifierBaies() ?? SANS_MODULE],
  ["matiere", () => rendu.material?.verifierMatiere() ?? SANS_MODULE],
  ["fonds", () => rendu.material?.verifierFonds() ?? SANS_MODULE],
  ["prereglages", () => G.verifierPrereglages(), true],
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
