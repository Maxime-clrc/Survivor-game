import { ENEMY_TYPES } from "./enemies.js";
import { EVENTS, GEOMETRIES } from "./timeline.js";

/* LE DIRECTOR — SA LISTE FERMEE, ET RIEN D AUTRE POUR L INSTANT.

   CE FICHIER EST LE CONTRAT, PAS LA POLITIQUE. Il dit ce qu un Director a le
   droit de choisir et comment on le verifie ; ce qu il choisit VRAIMENT est le
   lot suivant. L ordre n est pas cosmetique : un Director ecrit avant son
   contrat derive en silence, parce qu il n existe aucun moment ou quelqu un
   compare ce qu il fait a ce qu il devrait pouvoir faire.

   QUATRE LEVIERS, UNE FOIS PAR BATTEMENT — 60 s, le grain auquel le script
   exprime deja son budget :

     COMPOSITION  quels types dans le battement
     GEOMETRIE    par ou ils arrivent
     ELITE        une de plus, une de moins, aucune
     EVENEMENT    en proposer un, ou rien

   ET CE QU IL NE CHOISIT JAMAIS EST ECRIT ICI PARCE QUE C EST LA QUE CA SE
   VERIFIE :
     le `rate` — c est le BUDGET, et `verifierScript()` en tient les sommes ;
     les PV, la vitesse, les degats — ce sont les leviers de la DIFFICULTE, et
       les melanger rendrait un mode illisible ;
     la respiration — elle est ecrite dans le script, et un Director qui
       pourrait OTER de la pression pourrait rendre une manche plus facile que
       ce qui est ecrit ;
     le plafond de population — c est une limite de MOTEUR.

   `validerDecision` ne lit pas cette liste : elle COMPARE le battement avant et
   apres. Une liste d interdits se contourne en ajoutant un champ ; une
   comparaison, non. */

export const DIR_LEVIERS = ["types", "geom", "elite", "event"];

/* CE QU UN BATTEMENT PORTE ET QUE LA DECISION NE DOIT JAMAIS DEPLACER. Releve
   sur les entrees reelles du script, pas declare : un champ ajoute au script
   sans etre ajoute ici serait librement modifiable par le Director, en silence.
   `verifierTableDirector` croise les deux sens — et il a deja servi : `rateMul`
   y figurait, alors qu il appartient aux EVENEMENTS et qu aucun battement ne le
   porte. Proteger un champ qui n existe pas donne l illusion d une couverture. */
export const DIR_INTOUCHABLE = ["rate", "minPlayers", "fallback"];

// une de plus, une de moins, aucune — et rien d autre
export const ELITE_CHOIX = [-1, 0, 1];

export const DECISION_NEUTRE = Object.freeze({
  types: null, geom: null, elite: 0, event: null,
});

/* LE COUT D UN CORPS EST L INVERSE DE SON ABONDANCE, ET IL N Y A DONC RIEN A
   ECRIRE. `share` dit quelle part du plafond un type a le droit d occuper : le
   fantassin 1,00, le colosse 0,22. Un type rare est un type cher, et le rapport
   des deux EST le prix. Une colonne de cout a cote de `share` serait un SECOND
   systeme d equilibrage a tenir d accord avec le premier — on n en diverge que
   si une mesure le demande, et alors elle sera ecrite. */
const SHARE_REF = ENEMY_TYPES[0].share;
export const coutType = i => {
  const s = ENEMY_TYPES[i]?.share;
  return s > 0 ? SHARE_REF / s : 0;
};

/* CE QUE LE DIRECTOR REGARDE. Six grandeurs, toutes deja calculees : trois par
   `_tension()` depuis le plan 32, deux par le chargement, une par la horde.
   L INDICE DE SURVIE EST LA POUR NE PAS CONFONDRE deux equipes que la tension
   seule rend identiques : une equipe fragile qui encaisse et une equipe
   cuirassee qui s ennuie ont la meme tension basse et n appellent pas la meme
   reponse. */
export function contexteVide() {
  return {
    tensionMoy: 0, tensionMax: 0, tensionBasT: 0,
    depuisElite: 0, depuisEvent: 0, survie: 1,
    minute: 0, joueurs: 1, corps: 0,
  };
}

/* APPLIQUER, ET C EST LE SEUL POINT OU UNE DECISION TOUCHE LE JEU. Elle rend
   une COPIE : le battement du script est une entree de table partagee entre
   toutes les salles d un processus, et l ecrire en place ferait qu une manche
   change le script d une autre. Le plan 31 a paye exactement cette panne pour
   le hasard. */
export function appliquerDecision(entry, d) {
  if (!entry || !d) return entry;
  if (d.types === null && d.geom === null && d.elite === 0 && d.event === null) {
    return entry;
  }
  const out = { ...entry };
  if (d.geom !== null) out.geom = d.geom;
  if (d.types !== null) out.types = d.types;
  // `event` A TROIS ETATS ET PAS DEUX : `null` laisse le script decider, -1
  // RETIRE l evenement qu il avait prevu, un index en propose un. Un booleen
  // aurait confondu « je ne dis rien » et « je n en veux pas ».
  if (d.event !== null) out.event = d.event < 0 ? undefined : d.event;
  if (d.elite !== 0) out.elite = d.elite;
  return out;
}

/* VALIDER, ET C EST LE VERIFICATEUR DU SYSTEME. Il ne relit pas une liste
   d interdits — il compare le battement AVANT et APRES. Un champ ajoute au
   script demain sera protege sans que personne y pense, ce qu une liste
   d interdits ne fait jamais. */
export function validerDecision(d, entry, roster = null) {
  const soucis = [];
  if (!d || typeof d !== "object") return ["decision absente"];

  for (const k of Object.keys(d)) {
    if (!DIR_LEVIERS.includes(k)) soucis.push(`levier « ${k} » hors de la liste fermee`);
  }
  if (d.geom !== null && d.geom !== undefined && !GEOMETRIES.includes(d.geom)) {
    soucis.push(`geometrie « ${d.geom} » inconnue`);
  }
  if (!ELITE_CHOIX.includes(d.elite ?? 0)) {
    soucis.push(`elite ${d.elite} hors de ${ELITE_CHOIX.join("/")}`);
  }
  if (d.event !== null && d.event !== undefined
      && d.event >= 0 && !EVENTS[d.event]) {
    soucis.push(`evenement ${d.event} inconnu`);
  }
  if (d.types !== null && d.types !== undefined) {
    if (!Array.isArray(d.types)) soucis.push("composition qui n est pas une liste");
    else {
      for (const t of d.types) {
        if (!ENEMY_TYPES[t]) soucis.push(`type ${t} inconnu dans la composition`);
        else if (roster && !roster.includes(t)) {
          soucis.push(`type ${ENEMY_TYPES[t].key} hors du roster du mode`);
        }
      }
    }
  }

  // LA COMPARAISON, et c est elle qui tient le contrat.
  if (entry) {
    const apres = appliquerDecision(entry, d);
    for (const k of DIR_INTOUCHABLE) {
      if (apres[k] !== entry[k]) {
        soucis.push(`la decision deplace « ${k} », qui appartient au script`);
      }
    }
    for (const k of Object.keys(apres)) {
      if (apres[k] === entry[k]) continue;
      if (!DIR_LEVIERS.includes(k)) {
        soucis.push(`la decision ecrit « ${k} », hors de la liste fermee`);
      }
    }
  }
  return soucis;
}

/* CRITERE REJOUABLE DE LA TABLE. Muet = tout va bien. Il ne juge aucune
   decision — il juge que le CONTRAT est bien forme, ce qui est la seule chose
   qu on puisse verifier avant que le Director existe. */
export function verifierTableDirector(entrees = null) {
  const soucis = [];

  if (coutType(0) !== 1) {
    soucis.push(`le fantassin ne coute pas 1 mais ${coutType(0)} — la reference a bouge`);
  }
  for (let i = 0; i < ENEMY_TYPES.length; i++) {
    const c = coutType(i);
    if (ENEMY_TYPES[i].mini) {
      if (c !== 0) soucis.push(`${ENEMY_TYPES[i].key} : un mini-boss a un cout de horde`);
      continue;
    }
    if (!(c > 0) || !Number.isFinite(c)) {
      soucis.push(`${ENEMY_TYPES[i].key} : cout ${c}, la horde ne peut pas l acheter`);
    }
  }

  // LE NEUTRE DOIT ETRE NEUTRE, et c est ce qui garantit qu un Director eteint
  // rend EXACTEMENT le script — donc que `verifierScript` reste un verdict.
  const modele = { rate: 3.2, geom: "bords", minPlayers: 2, fallback: "front" };
  const apres = appliquerDecision(modele, DECISION_NEUTRE);
  if (apres !== modele) soucis.push("la decision neutre recopie le battement au lieu de le rendre");
  for (const k of Object.keys(modele)) {
    if (apres[k] !== modele[k]) soucis.push(`la decision neutre deplace « ${k} »`);
  }
  const nul = validerDecision(DECISION_NEUTRE, modele);
  if (nul.length > 0) soucis.push(`la decision neutre est refusee : ${nul.join(", ")}`);

  /* UNE DECISION HORS LISTE DOIT ETRE REFUSEE, ET ON LE MESURE AU LIEU DE LE
     SUPPOSER : un validateur qui accepte tout est muet, et un validateur muet a
     l air d un systeme sain. */
  const hors = [
    [{ rate: 9 }, "un rate"],
    [{ geom: "spirale" }, "une geometrie inconnue"],
    [{ elite: 4 }, "un ecart d elite hors bornes"],
    [{ types: [99] }, "un type inconnu"],
    [{ hp: 2 }, "des points de vie"],
  ];
  for (const [d, quoi] of hors) {
    if (validerDecision({ ...DECISION_NEUTRE, ...d }, modele).length === 0) {
      soucis.push(`le validateur accepte ${quoi}`);
    }
  }

  // LES DEUX SENS : un champ que le script porte et que la liste des
  // intouchables ignore serait librement modifiable, en silence.
  if (entrees) {
    const vus = new Set();
    for (const e of entrees) for (const k of Object.keys(e)) vus.add(k);
    for (const k of vus) {
      if (!DIR_LEVIERS.includes(k) && !DIR_INTOUCHABLE.includes(k)) {
        soucis.push(`le script porte « ${k} », que ni les leviers ni les intouchables ne couvrent`);
      }
    }
    for (const k of DIR_INTOUCHABLE) {
      if (!vus.has(k)) soucis.push(`« ${k} » est protege mais aucun battement ne le porte`);
    }
  }
  return soucis;
}
