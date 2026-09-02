import { nombre, t, tf } from "./i18n.js";
import { fmtM } from "./units.js";
import { BOSS_ROSTER } from "./bosses.js";
import { CADRE_ANIMES, CADRE_EMPLACEMENTS, CADRE_MARQUEURS_2, CADRE_SKIN } from "./palette.js";

/* LES HAUTS FAITS OUVRENT DES PORTES, ILS NE DONNENT PAS DE PUISSANCE. Les
   noyaux sont une courbe, les hauts faits sont des marches ; une puissance qui
   arrive par marches cree des falaises. Une arme debloquee doit encore etre
   choisie et jouee, une ligne coute toujours des noyaux, un cadre ne change
   rien.

   TOUTE RECOMPENSE EST NOMMEE. `armes.filter((_, k) => k % 2 === 0)` dependait
   d'une POSITION dans `CARDS` : passer de trois a dix armes decalait la parite
   et reverrouillait des cartes chez tous les comptes existants. */

export const HF_CFG = {
  PRES: 120,
  LOIN: 700,
  FENETRE_CRIT: 60,
  FENETRE_KILL: 30,
  ECONOMIE_KILLS: 100,
  // MESURE : 118 tirs pour 100 kills en mediane (40 joueurs-manches, normal,
  // pilote). Le seuil se pose SOUS la mediane, sinon il ne teste rien.
  ECONOMIE_TIRS: 90,
  SANS_FAILLE_SEGMENT: 3,
  BAS_PV: 0.25,
  FOUDROYANT: 65,
  ARMES_TOTAL: 8,
};

export const HF_SIMPLE = 0, HF_INTER = 1, HF_DEFI = 2;
export const HF_NIVEAUX = ["simple", "intermédiaire", "défi"];
export const hfNiveauLabel = i => t(`hf.niveau.${i}`, HF_NIVEAUX[i] ?? "");

/* Un cadre ne touche a aucun equilibrage, donc il peut se mettre derriere
   n'importe quelle exigence, y compris deraisonnable. C'est ce qui permet
   d'avoir de vrais defis sans jamais creer d'ecart de puissance. */
export const CADRE_DEFAUT = "defaut";
export const CADRES = [
  { id: "defaut", nom: "Aucun" },
  { id: "sobre", nom: "Sobre" },
  { id: "depouille", nom: "Dépouillé" },
  { id: "immacule", nom: "Immaculé" },
  { id: "foudroyant", nom: "Foudroyant" },
  { id: "arsenal", nom: "Arsenal" },
  { id: "ermite", nom: "Ermite" },
  { id: "insomniaque", nom: "Insomniaque" },
  { id: "intact", nom: "Intact" },
  { id: "chasseur", nom: "Chasseur" },
  { id: "or", nom: "Or" },
  { id: "phalange", nom: "Phalange" },
  { id: "prismatique", nom: "Prismatique" },
];
export const CADRE_BY_ID = new Map(CADRES.map(c => [c.id, c]));
export const cadreNom = id => t(`cadre.${id}.nom`, CADRE_BY_ID.get(id)?.nom ?? id);

const LEG = [
  ["echo", "instinct", "contrat", "essaim"],
  ["sentence_capitale", "pacte_de_fer", "coeur_forge", "chaine_assaut"],
  ["constitution", "vif_argent", "voeu_partage", "ancre_souveraine"],
  ["sanctuaire_absolu", "salve_totale", "phalange", "dynamo"],
  ["horizon", "fournaise", "faucheuse", "cataclysme"],
];

/* `jauge` rend la progression CHIFFREE : un haut fait cache est une loterie, pas
   un objectif. Absente, l'exigence est binaire et `fait` tranche.
   `diffMin` est un PLANCHER : jouer en cauchemar valide ce qui demande normal.

   LES SEUILS SONT MESURES, PAS POSES. 40 joueurs-manches en normal, pilote, a un
   et a quatre joueurs : un seuil « en une manche » vise 1,3 fois la mediane —
   en dessous c'est une formalite, au-dela de deux fois c'est du grattage. Les
   CUMULS se lisent en nombre de manches, pas en valeur absolue. Chiffres releves
   dans LISEZMOI.md.
   PREFERER UN RYTHME A UN TOTAL BRUT : un total depend de la duree de la manche,
   de l'effectif et de la difficulte, un rythme d'aucun des trois. */
export const HAUTS_FAITS = [
  /* --- simples : dire que le systeme existe, recompenser d'avoir joue ------ */
  {
    id: "premier_sang", niveau: HF_SIMPLE, nom: "Premier sang",
    texte: "vaincre un premier boss",
    jauge: s => s.bossTotal, cible: 1,
    reward: { type: "carte", ids: ["symbiose", "austerite", "resonance"] },
  },
  {
    id: "recrue", niveau: HF_SIMPLE, nom: "Recrue",
    texte: "jouer une manche jusqu'à son terme",
    fait: s => s.arretee,
    reward: { type: "ligne", ids: ["tronc"] },
  },
  {
    id: "sur_le_terrain", niveau: HF_SIMPLE, nom: "Sur le terrain",
    texte: "{0} s cumulées sans se déplacer, en une manche",
    vals: () => ({ "0": 90 }),
    jauge: s => s.stillMax, cible: 90,
    reward: { type: "arme", ids: ["assaut"] },
  },
  {
    id: "au_contact", niveau: HF_SIMPLE, nom: "Au contact",
    texte: "{0} ennemis tués à moins de {1}",
    vals: () => ({ "0": 1500, "1": fmtM(HF_CFG.PRES) }),
    jauge: s => s.killsNear, cible: 1500,
    reward: { type: "arme", ids: ["lame"] },
  },
  {
    id: "curieux", niveau: HF_SIMPLE, nom: "Curieux",
    texte: "jouer une manche avec chaque classe",
    jauge: s => s.classes, cible: 3,
    reward: { type: "ligne", ids: ["secours"] },
  },
  {
    id: "collectionneur", niveau: HF_SIMPLE, nom: "Collectionneur",
    texte: "posséder {0} cartes en une manche",
    vals: () => ({ "0": 20 }),
    jauge: s => s.cartesMax, cible: 20,
    reward: { type: "relique", ids: ["silex", "semelle_cloutee", "contrepoids"] },
  },
  {
    id: "prospecteur", niveau: HF_SIMPLE, nom: "Prospecteur",
    texte: "récolter {0} points de récolte",
    vals: () => ({ "0": 150 }),
    jauge: s => s.harvests, cible: 150,
    reward: { type: "relique", ids: ["lame_recolte", "fanion", "cran_arret"] },
  },
  {
    id: "marchand", niveau: HF_SIMPLE, nom: "Marchand",
    texte: "acheter {0} reliques",
    vals: () => ({ "0": 30 }),
    jauge: s => s.relicsBought, cible: 30,
    reward: { type: "relique", ids: ["besace", "crochet", "trousse_campagne"] },
  },
  {
    id: "bestiaire1", niveau: HF_SIMPLE, nom: "Bestiaire I",
    texte: "vaincre {0} types de boss différents",
    vals: () => ({ "0": 5 }),
    jauge: s => s.bossKinds, cible: 5,
    reward: { type: "carte", ids: LEG[0] },
  },
  {
    id: "debrouillard", niveau: HF_SIMPLE, nom: "Débrouillard",
    texte: "utiliser {0} fois une compétence de classe",
    vals: () => ({ "0": 150 }),
    jauge: s => s.skillUses, cible: 150,
    reward: { type: "carte", ids: LEG[1] },
  },

  /* --- intermediaires : orienter vers de nouvelles facons de jouer --------- */
  {
    id: "sans_faille", niveau: HF_INTER, nom: "Sans faille",
    texte: "{0} s consécutives sans subir de dégât, à partir du segment {1}",
    vals: () => ({ "0": 120, "1": HF_CFG.SANS_FAILLE_SEGMENT + 1 }),
    jauge: s => s.sainMax, cible: 120,
    reward: { type: "arme", ids: ["laser"] },
  },
  {
    id: "moisson", niveau: HF_INTER, nom: "Moisson",
    texte: "{0} ennemis tués en {1} s",
    vals: () => ({ "0": 200, "1": HF_CFG.FENETRE_KILL }),
    jauge: s => s.killBest, cible: 200,
    reward: { type: "arme", ids: ["tesla"] },
  },
  {
    id: "economie", niveau: HF_INTER, nom: "Économie de munitions",
    texte: "{0} ennemis tués avec moins de {1} tirs",
    vals: () => ({ "0": HF_CFG.ECONOMIE_KILLS, "1": HF_CFG.ECONOMIE_TIRS }),
    fait: s => s.tirsPourCent > 0 && s.tirsPourCent < HF_CFG.ECONOMIE_TIRS,
    reward: { type: "arme", ids: ["siege"] },
  },
  {
    id: "longue_portee", niveau: HF_INTER, nom: "Longue portée",
    texte: "{0} ennemis tués à plus de {1}",
    vals: () => ({ "0": 250, "1": fmtM(HF_CFG.LOIN) }),
    jauge: s => s.killsFar, cible: 250,
    reward: { type: "arme", ids: ["precision"] },
  },
  {
    id: "perce_ligne", niveau: HF_INTER, nom: "Perce-ligne",
    texte: "{0} ennemis d'un même tir",
    vals: () => ({ "0": 5 }),
    jauge: s => s.percee, cible: 5,
    reward: { type: "arme", ids: ["railgun"] },
  },
  {
    id: "debout", niveau: HF_INTER, nom: "Debout",
    /* IL OUVRE LA DISPERSION : le passer a `complete` enfermerait une ARME
       derriere une victoire sans chute, ce qu aucun haut fait de niveau 0 ou 1
       ne doit faire. Il garde donc `arretee`, et c est son TEXTE qui devient
       vrai. */
    texte: "aller au bout d'une manche sans être mis à terre",
    fait: s => s.arretee && s.chutes === 0,
    reward: { type: "arme", ids: ["dispersion"] },
  },
  {
    id: "demolisseur", niveau: HF_INTER, nom: "Démolisseur",
    texte: "{0} ennemis tués par explosion",
    vals: () => ({ "0": 2500 }),
    jauge: s => s.killsBlast, cible: 2500,
    reward: { type: "arme", ids: ["grenade"] },
  },
  {
    id: "veteran", niveau: HF_INTER, nom: "Vétéran", diffMin: 1,
    texte: "terminer une manche en normal",
    fait: s => s.complete,
    reward: { type: "relique", ids: ["boussole", "marteau_breche", "registre"] },
  },
  {
    id: "chirurgien", niveau: HF_INTER, nom: "Chirurgien",
    texte: "{0} coups critiques en {1} s",
    vals: () => ({ "0": 115, "1": HF_CFG.FENETRE_CRIT }),
    jauge: s => s.critBest, cible: 115,
    reward: { type: "carte", ids: LEG[2] },
  },
  {
    id: "increvable", niveau: HF_INTER, nom: "Increvable",
    texte: "{0} s cumulées sous {1} % de vie, en une manche",
    vals: () => ({ "0": 60, "1": nombre(HF_CFG.BAS_PV * 100) }),
    jauge: s => s.basPvMax, cible: 60,
    reward: { type: "carte", ids: LEG[3] },
  },
  {
    id: "fraternite", niveau: HF_INTER, nom: "Fraternité",
    texte: "relever {0} alliés",
    vals: () => ({ "0": 25 }),
    jauge: s => s.revives, cible: 25,
    reward: { type: "carte", ids: ["reanimateur", "angeGardien"] },
  },
  {
    id: "phalange", niveau: HF_INTER, nom: "Phalange",
    texte: "terminer une manche complète à {0} joueurs",
    vals: () => ({ "0": 4 }),
    fait: s => s.complete && s.joueurs >= 4,
    reward: { type: "carte", ids: ["serment", "porte_voix"] },
  },
  {
    id: "bestiaire2", niveau: HF_INTER, nom: "Bestiaire II",
    texte: "vaincre les {0} types de boss",
    vals: () => ({ "0": BOSS_ROSTER.length }),
    jauge: s => s.bossKinds, cible: BOSS_ROSTER.length,
    reward: { type: "relique", ids: ["serment_de_fer", "coeur_machine", "terre_brulee"] },
  },
  {
    id: "maitre_armes", niveau: HF_INTER, nom: "Maître d'armes",
    texte: "porter une famille de cartes au palier 4",
    fait: s => s.familleMax,
    reward: { type: "carte", ids: LEG[4] },
  },

  /* --- defis : une raison de revenir apres avoir tout vu ------------------- */
  {
    id: "puriste", niveau: HF_DEFI, nom: "Puriste",
    texte: "terminer une manche sans prendre une seule carte épique ni légendaire",
    fait: s => s.complete && s.rareteMax <= 1 && s.cartesMax > 0,
    reward: { type: "cadre", ids: ["sobre"] },
  },
  {
    id: "ascete", niveau: HF_DEFI, nom: "Ascète",
    texte: "vaincre un boss sans utiliser d'ultime",
    fait: s => s.bossSansUlt,
    reward: { type: "cadre", ids: ["depouille"] },
  },
  {
    id: "intouchable", niveau: HF_DEFI, nom: "Intouchable",
    texte: "vaincre un boss sans subir un seul dégât",
    fait: s => s.bossSansDegat,
    reward: { type: "cadre", ids: ["immacule"] },
  },
  {
    id: "foudroyant", niveau: HF_DEFI, nom: "Foudroyant",
    texte: "vaincre un boss en moins de {0} s",
    vals: () => ({ "0": HF_CFG.FOUDROYANT }),
    fait: s => s.bossVite > 0 && s.bossVite < HF_CFG.FOUDROYANT,
    reward: { type: "cadre", ids: ["foudroyant"] },
  },
  {
    id: "armurier", niveau: HF_DEFI, nom: "Armurier",
    texte: "terminer une manche complète avec chacune des {0} armes",
    vals: () => ({ "0": HF_CFG.ARMES_TOTAL }),
    fait: s => s.complete && s.armes >= HF_CFG.ARMES_TOTAL,
    reward: { type: "cadre", ids: ["arsenal"] },
  },
  {
    id: "ermite", niveau: HF_DEFI, nom: "Ermite",
    texte: "terminer une manche complète en solo",
    fait: s => s.complete && s.joueurs === 1,
    reward: { type: "cadre", ids: ["ermite"] },
  },
  {
    id: "nuit_blanche", niveau: HF_DEFI, nom: "Nuit blanche", diffMin: 2,
    texte: "terminer une manche en cauchemar",
    fait: s => s.complete,
    reward: { type: "cadre", ids: ["insomniaque"] },
  },
  {
    id: "sans_egratignure", niveau: HF_DEFI, nom: "Sans une égratignure", diffMin: 2,
    texte: "terminer un segment en cauchemar sans subir de dégât",
    fait: s => s.segmentsSains > 0,
    reward: { type: "cadre", ids: ["intact"] },
  },
  {
    id: "bestiaire3", niveau: HF_DEFI, nom: "Bestiaire III", diffMin: 2,
    texte: "vaincre les {0} boss en cauchemar",
    vals: () => ({ "0": BOSS_ROSTER.length }),
    jauge: s => s.bossKindsDur, cible: BOSS_ROSTER.length,
    reward: { type: "cadre", ids: ["chasseur"] },
  },
  {
    id: "perfection", niveau: HF_DEFI, nom: "Perfection", diffMin: 2,
    texte: "terminer une manche en cauchemar sans être mis à terre",
    fait: s => s.complete && s.chutes === 0,
    reward: { type: "cadre", ids: ["or"] },
  },
  {
    id: "quatuor", niveau: HF_DEFI, nom: "Quatuor", diffMin: 2,
    texte: "terminer une manche en cauchemar à {0} joueurs",
    vals: () => ({ "0": 4 }),
    fait: s => s.complete && s.joueurs >= 4,
    reward: { type: "cadre", ids: ["phalange"] },
  },
  {
    id: "legende", niveau: HF_DEFI, nom: "Légende",
    texte: "obtenir tous les autres hauts faits",
    reward: { type: "cadre", ids: ["prismatique"] },
  },
];

export const HF_BY_ID = new Map(HAUTS_FAITS.map(h => [h.id, h]));

export const hfNom = id => t(`hf.${id}.nom`, HF_BY_ID.get(id)?.nom ?? id);
export function hfTexte(id) {
  const h = HF_BY_ID.get(id);
  if (!h) return "";
  return h.vals ? tf(`hf.${id}.texte`, h.texte, h.vals()) : t(`hf.${id}.texte`, h.texte);
}

/* Le nom de la recompense se LIT sur le bandeau : un haut fait qui ne dit pas ce
   qu'il donne oblige a aller verifier. Le libelle du type vit ici, l'identifiant
   de l'objet se traduit dans SA table (`cardNom`, `relicNom`, `cadreNom`). */
export const REWARD_LABEL = {
  arme: "arme débloquée", carte: "cartes débloquées",
  ligne: "ligne débloquée", relique: "reliques débloquées",
  cadre: "cadre débloqué",
};
export const rewardLabel = type => t(`hf.reward.${type}`, REWARD_LABEL[type] ?? type);

export function hfProgres(id, stats) {
  const h = HF_BY_ID.get(id);
  if (!h || !h.jauge || !h.cible) return null;
  return { n: Math.min(h.cible, Math.round(h.jauge(stats) || 0)), max: h.cible };
}

function hfFait(h, s) {
  if (h.diffMin !== undefined && (s.diff | 0) < h.diffMin) return false;
  if (h.cible !== undefined && h.jauge) return (h.jauge(s) || 0) >= h.cible;
  return !!(h.fait && h.fait(s));
}

/* Point de passage unique de l'obtention. `legende` se resout APRES les autres,
   dans le meme appel : finir la manche qui complete la liste doit la donner. */
export function evaluerHautsFaits(acquis, stats) {
  const done = new Set(acquis ?? []);
  const gagnes = [];
  for (const h of HAUTS_FAITS) {
    if (h.id === "legende" || done.has(h.id)) continue;
    if (hfFait(h, stats)) { gagnes.push(h.id); done.add(h.id); }
  }
  if (!done.has("legende")
      && HAUTS_FAITS.every(h => h.id === "legende" || done.has(h.id))) {
    gagnes.push("legende");
  }
  return gagnes;
}

/* Ce qu'un LOT de hauts faits ouvre. Une carte est verrouillee SI ET SEULEMENT
   SI un haut fait la donne : la liste des verrous se deduit de la table des
   recompenses, elle ne se maintient pas a cote. */
export function recompensesDe(ids) {
  const cartes = new Set(), lignes = new Set(), reliques = new Set(), cadres = new Set();
  for (const id of ids ?? []) {
    const h = HF_BY_ID.get(id);
    if (!h) continue;
    const cible = h.reward.type === "ligne" ? lignes
      : h.reward.type === "relique" ? reliques
      : h.reward.type === "cadre" ? cadres : cartes;
    for (const x of h.reward.ids) cible.add(x);
  }
  return { cartes, lignes, reliques, cadres };
}

export const TOUTES_RECOMPENSES = recompensesDe(HAUTS_FAITS.map(h => h.id));

/* CE QU UN HAUT FAIT A LE DROIT DE PORTER. L invariant « ils ouvrent des
   portes, ils ne donnent pas de puissance » est tenu depuis toujours et rien
   ne le verifiait : il suffisait d ajouter `mods`, `bonus` ou `gain` a une
   entree pour qu une puissance permanente entre par la porte de service, sans
   qu aucune erreur ne se leve. La liste blanche rend le champ inconnu
   IMPOSSIBLE ; `REWARD_LABEL` ferme deja les types, et une recompense ne peut
   donc designer qu un objet NOMME d une des cinq tables. */
const CLEFS_HF = new Set([
  "id", "niveau", "nom", "texte", "vals", "jauge", "cible", "fait",
  "diffMin", "reward",
]);

/* Critere rejouable, sur le modele de `verifierBiomes()`. */
export function verifierHautsFaits(cardIds = null, relicIds = null, armeIds = null) {
  const out = [];
  const vus = new Set();
  const objets = new Map();

  for (const h of HAUTS_FAITS) {
    if (vus.has(h.id)) out.push(`${h.id} : identifiant en double`);
    vus.add(h.id);
    if (!h.reward || !Array.isArray(h.reward.ids) || h.reward.ids.length === 0) {
      out.push(`${h.id} : aucune récompense`);
      continue;
    }
    for (const k of Object.keys(h)) {
      if (!CLEFS_HF.has(k)) out.push(`${h.id} : champ « ${k} » hors de la liste blanche`);
    }
    if (!REWARD_LABEL[h.reward.type]) out.push(`${h.id} : type « ${h.reward.type} » inconnu`);
    if (h.cible === undefined && !h.fait && h.id !== "legende") {
      out.push(`${h.id} : ni cible ni prédicat`);
    }
    if (h.cible !== undefined && !h.jauge) out.push(`${h.id} : cible sans jauge`);
    // carte « Phalange », cadre « Phalange » et haut fait « Phalange » cohabitent :
    // trois tables, trois espaces de noms. Le doublon qui compte est deux hauts
    // faits qui donnent le MEME objet du MEME type.
    for (const x of h.reward.ids) {
      const clef = `${h.reward.type}:${x}`;
      if (objets.has(clef)) {
        out.push(`${h.reward.type} « ${x} » donné deux fois : ${objets.get(clef)} et ${h.id}`);
      }
      objets.set(clef, h.id);
    }
    // les armes vivent en simple et intermediaire, jamais en defi : une arme
    // derriere un exploit laisserait le choix de depart pauvre pendant des
    // dizaines de manches
    if (h.reward.type === "arme" && h.niveau === HF_DEFI) {
      out.push(`${h.id} : une arme ne se met pas derrière un défi`);
    }
    // les cadres vivent en defi, jamais ailleurs : c'est ce qui leur donne leur
    // valeur, un cadre se voit et tout le monde sait ce qu'il a coute
    if (h.reward.type === "cadre" && h.niveau !== HF_DEFI) {
      out.push(`${h.id} : un cadre ne se donne qu'en défi`);
    }
    if (h.reward.type === "cadre") {
      for (const x of h.reward.ids) {
        if (!CADRE_BY_ID.has(x)) out.push(`${h.id} : cadre « ${x} » absent de CADRES`);
      }
    }
  }

  /* LE PALIER SE CROISE AVEC L'EXIGENCE, il ne se declare pas : sans ce test
     l'echelle du materiau se defait au prochain defi ajoute. */
  for (const c of CADRES) {
    if (c.id === CADRE_DEFAUT) continue;
    if (!objets.has(`cadre:${c.id}`)) out.push(`cadre « ${c.id} » : aucun haut fait ne le donne`);
    const peau = CADRE_SKIN[c.id];
    if (!peau) { out.push(`cadre « ${c.id} » : aucune peau dans CADRE_SKIN`); continue; }
    for (const e of CADRE_EMPLACEMENTS) {
      if (!peau[e]) out.push(`cadre « ${c.id} » : emplacement « ${e} » vide`);
    }

    const par = HF_BY_ID.get(objets.get(`cadre:${c.id}`));
    const attendu = par?.id === "legende" ? 3 : par?.diffMin === 2 ? 2 : 1;
    if (peau.palier !== attendu) {
      out.push(`cadre « ${c.id} » : palier ${peau.palier} pour une exigence de palier ${attendu}`);
    }

    const slots = [peau.silhouette, peau.fond, peau.bordure, peau.ornement, peau.lueur];
    const anime = slots.find(v => CADRE_ANIMES.includes(v));
    const marque = slots.find(v => CADRE_MARQUEURS_2.includes(v));
    if (peau.palier < 3 && anime) out.push(`cadre « ${c.id} » : « ${anime} » est réservé au palier 3`);
    if (peau.palier === 1 && marque) out.push(`cadre « ${c.id} » : « ${marque} » est réservé au palier 2`);
    if (peau.palier === 2 && !marque) out.push(`cadre « ${c.id} » : palier 2 sans marqueur de palier 2`);
  }
  for (const id of Object.keys(CADRE_SKIN)) {
    if (!CADRE_BY_ID.has(id)) out.push(`peau « ${id} » : absente de CADRES`);
  }
  const sommet = Object.values(CADRE_SKIN).filter(p => p.palier === 3).length;
  if (sommet !== 1) out.push(`palier 3 : ${sommet} cadres au lieu d'un seul`);

  if (cardIds) {
    for (const h of HAUTS_FAITS) {
      if (h.reward.type !== "carte") continue;
      for (const x of h.reward.ids) {
        if (!cardIds.has(x)) out.push(`${h.id} : carte « ${x} » inconnue`);
      }
    }
  }
  if (relicIds) {
    for (const h of HAUTS_FAITS) {
      if (h.reward.type !== "relique") continue;
      for (const x of h.reward.ids) {
        if (!relicIds.has(x)) out.push(`${h.id} : relique « ${x} » inconnue`);
      }
    }
  }
  /* Le troisieme bloc de validation, celui qui n'avait jamais ete ecrit : deux
     hauts faits donnent une arme que la table ne contient pas, `armeAt` retombe
     en silence sur le tir standard, et le joueur voit « arme debloquee » pour
     une arme qui ne sera jamais proposee. Et l'INVERSE, qui manquait aussi :
     une arme ajoutee sans haut fait est jouable par personne, et personne ne le
     sait. `armeIds` porte les armes AUTRES que le tir standard. */
  if (armeIds) {
    const donnees = new Set();
    for (const h of HAUTS_FAITS) {
      if (h.reward.type !== "arme") continue;
      for (const x of h.reward.ids) {
        if (!armeIds.has(x)) out.push(`${h.id} : arme « ${x} » inconnue`);
        donnees.add(x);
      }
    }
    for (const x of armeIds) {
      if (!donnees.has(x)) out.push(`arme « ${x} » : aucun haut fait ne la donne`);
    }
  }

  /* UNE CONDITION QUI PARLE DE LA MANCHE ENTIERE DOIT LIRE `complete`, et ca se
     MESURE : on evalue sur des etats identiques et genereux dont on ne fait
     varier que l issue. Une condition qui change de verdict avec `arretee` parle
     de la FIN de la manche ; si elle ne change pas avec `complete`, elle confond
     « terminee » et « gagnee » — et `arretee` vaut vrai des que la manche
     s arrete, donc en MOURANT. Sept hauts faits ecrivaient « terminer une
     manche » comme ca, dont quatre DEFIS qui tombaient a la premiere manche.
     LA REGLE S ARRETE A L ACCES, et c est le seul endroit ou elle doit s arreter :
     `recrue` ouvre une ligne, `debout` ouvre une ARME. Durcir l un des deux
     reviendrait a enfermer du contenu de depart derriere une victoire, ce qu aucun
     haut fait ne doit faire — l exemption se lit donc sur la RECOMPENSE, jamais
     sur une liste d identifiants.
     Et elle ne dit RIEN des defis d exploit ponctuel — un boss sans ultime, un
     segment sans degat — qui ne lisent ni l un ni l autre. */
  const genereux = (arretee, complete) => ({
    arretee, complete, diff: 2, joueurs: 4, chutes: 0, niveau: 99,
    kills: 1e6, stillMax: 1e6, basPvMax: 1e6, sainMax: 1e6, killsNear: 1e6,
    killsFar: 1e6, killsBlast: 1e6, percee: 1e6, critBest: 1e6, killBest: 1e6,
    tirsPourCent: 1, harvests: 1e6, revives: 1e6, relicsBought: 1e6,
    skillUses: 1e6, cartesMax: 1e6, rareteMax: 0, familleMax: true, armes: 1e6,
    segmentsSains: 1e6, bossSansUlt: true, bossSansDegat: true, bossVite: 1,
    bossTotal: 1e6, bossKinds: 1e6, bossKindsDur: 1e6, classes: 1e6,
  });
  const OUVRE_UN_ACCES = new Set(["arme", "ligne"]);
  for (const h of HAUTS_FAITS) {
    if (h.id === "legende" || !h.fait) continue;
    if (OUVRE_UN_ACCES.has(h.reward.type)) continue;
    const litArretee = h.fait(genereux(true, true)) !== h.fait(genereux(false, true));
    const litComplete = h.fait(genereux(true, true)) !== h.fait(genereux(true, false));
    if (litArretee && !litComplete) {
      out.push(`${h.id} : parle de la fin de manche sans distinguer la victoire`
        + ` — il tombe sur une manche PERDUE`);
    }
  }

  const parNiveau = [0, 0, 0];
  for (const h of HAUTS_FAITS) parNiveau[h.niveau]++;
  if (parNiveau.some(n => n === 0)) out.push(`un niveau d'exigence est vide : ${parNiveau}`);

  return out;
}
