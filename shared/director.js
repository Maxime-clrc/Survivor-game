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
    // « L EQUIPE EST-ELLE SEPAREE ? » — la seule grandeur du contexte qui ne
    // decrit pas la pression mais la DECISION des joueurs. Voir `etatDe`.
    separe: false, vivants: 1,
    // « CE BATTEMENT EST-IL UNE RESPIRATION ? » — DEDUIT du script, pas declare :
    // un battement dont le taux RETOMBE par rapport au precedent en est une.
    respire: false,
  };
}

export const DIR_NORMAL = 0, DIR_ENNUI = 1, DIR_SURCHARGE = 2;

/* LES TROIS ETATS, ET LEURS SEUILS. Ces valeurs sont des DEFAUTS RAISONNES, pas
   des relevees : le lot 03 du plan les calibre sur les courbes de tension
   accumulees en vraies parties, et il ne peut pas le faire avant qu il y en ait.
   Elles sont ecrites ici pour que le systeme tourne et se mesure, pas parce
   qu elles seraient justes. */
export const DIR_CFG = {
  /* UNE TENSION BASSE DIX SECONDES N EST RIEN, quatre-vingt-dix c est une manche
     plate. C est la DUREE qui est le signal, et c est pour ca que le plan 32 a
     pose un compteur separe au lieu de relire la valeur. */
  ENNUI_T: 75,

  // au-dela, un joueur se noie — et `tensionMax` suffit : un seul joueur en
  // train de couler EST une surcharge, meme si les trois autres s ennuient
  SURCHARGE: 0.82,

  // ce qu il faut attendre avant de proposer un evenement de sa propre main
  EVENT_FAIM: 200,

  // combien de types compose un battement dirige : trois, jamais un — une
  // monoculture n est pas une composition, c est un evenement sans son nom
  COMPO: 3,
};

/* LA GEOMETRIE, DE LA PLUS SIMPLE A LA PLUS EXIGEANTE. Ce n est pas un
   classement de difficulte au sens des degats : c est le nombre de DIRECTIONS
   que le joueur doit tenir en meme temps. `front` en demande une, `quatre-fronts`
   quatre, et l anneau les demande toutes a la fois. */
export const GEOM_ORDRE = ["front", "bords", "pince", "quatre-fronts", "anneau"];

/* L ETAT, ET LA REGLE MORALE EST DEDANS.

   LE DIRECTOR NE VIENT PAS AU SECOURS D UN GROUPE QUI S EST ISOLE. Sans cette
   ligne, tout le lot 04 du plan 31 est annule : le joueur isole a une tension
   elevee, le Director la lit comme une surcharge, et il ADOUCIT la composition —
   exactement l inverse de l effet voulu.
   UNE EQUIPE EN DIFFICULTE EST UN ACCIDENT, UN JOUEUR QUI S ISOLE EST UNE
   DECISION. On soulage le premier et pas le second, et ce n est pas une punition :
   on ne lui ajoute rien, on s abstient de lui retirer ce qu il a choisi
   d affronter.
   LE CAS LIMITE EST TRANCHE PAR L EFFECTIF VIVANT, PAS PAR CELUI DU GROUPE : un
   joueur seul parce que les trois autres sont morts n a rien choisi. C est
   `vivants` qui decide, et `separe` ne mord que s il reste plusieurs vivants.

   DEUX AGREGATS ET PAS UN, ET C EST UN ECART ASSUME AVEC LEFT 4 DEAD : a 3 600 px
   de separation, un joueur voit 137 corps pendant que l autre en voit 36.
   `tensionMax` dit « trop haut », `tensionMoy` dit « trop bas », et jamais les
   deux en meme temps. */
export function etatDe(ctx, cfg = DIR_CFG) {
  /* LA RESPIRATION EST ECRITE DANS LE SCRIPT, ET LE DIRECTOR S EFFACE DEVANT.
     C est le quatrieme etat de la table, et sa reponse est « ce que le script
     prevoyait DEJA » : un Director qui durcirait un battement de repit ne
     ferait pas une manche plus interessante, il retirerait le repit — et un
     rythme sans creux n est plus un rythme. */
  if (ctx.respire) return DIR_NORMAL;
  const isole = ctx.separe && ctx.vivants > 1;
  if (ctx.tensionMax >= cfg.SURCHARGE && !isole) return DIR_SURCHARGE;
  if (ctx.tensionBasT >= cfg.ENNUI_T) return DIR_ENNUI;
  return DIR_NORMAL;
}

/* LA COMPOSITION, TIREE DANS LA MOITIE CHERE OU LA MOITIE BON MARCHE DU ROSTER.
   Le cout est l inverse de l abondance, donc la moitie chere est la moitie rare,
   donc la plus dure. On tire DANS une moitie au lieu de prendre les trois plus
   chers : trois fois le meme battement donnerait trois fois le meme corps. */
function composer(roster, dur, alea, n) {
  const dispo = roster.filter(i => coutType(i) > 0);
  if (dispo.length === 0) return null;
  const tries = [...dispo].sort((a, b) => coutType(a) - coutType(b));
  const moitie = dur
    ? tries.slice(Math.floor(tries.length / 2))
    : tries.slice(0, Math.max(1, Math.ceil(tries.length / 2)));
  const out = [];
  for (let i = 0; i < n; i++) out.push(moitie[Math.floor(alea() * moitie.length)]);
  return out;
}

/* DECIDER. Rendue PURE et deterministe : elle ne lit que le contexte et tire
   dans l `alea` de la salle, jamais dans `Math.random` — sinon deux manches de
   meme graine divergent et le plan 31 lot 02 ne sert a rien.

   L ENNUI EPUISE LES LEVIERS DE FORME AVANT TOUT LEVIER DE QUANTITE, et c est
   la garantie qu une equipe forte recoit une manche plus INTERESSANTE et non une
   manche plus LONGUE. Le budget ne bouge pas : `rate` n est pas dans la liste.
   LA SURCHARGE NE RETIRE JAMAIS D ENNEMIS non plus — elle change par ou ils
   arrivent et ce qu ils sont. Le compte est le budget, et le budget appartient
   au script. */
export function decider(ctx, entry, roster, alea, evenements = EVENTS, cfg = DIR_CFG) {
  /* L ETAT SORT A COTE DE LA DECISION, JAMAIS DEDANS. Une decision ne porte
     que ses quatre leviers — `validerDecision` refuse tout le reste, et c est
     exactement ce qu on lui demande. Le journal garde les deux. */
  const etat = etatDe(ctx, cfg);
  if (etat === DIR_NORMAL || !entry) return { d: DECISION_NEUTRE, etat };

  const d = { ...DECISION_NEUTRE };
  if (etat === DIR_ENNUI) {
    d.types = composer(roster, true, alea, cfg.COMPO);
    d.elite = 1;
    // une geometrie PLUS exigeante que celle du script, jamais moins
    const i = GEOM_ORDRE.indexOf(entry.geom);
    if (i >= 0 && i < GEOM_ORDRE.length - 1) d.geom = GEOM_ORDRE[i + 1];
    if (entry.event === undefined && ctx.depuisEvent >= cfg.EVENT_FAIM) {
      const ids = evenements.map((_, k) => k).filter(k => evenements[k]);
      if (ids.length > 0) d.event = ids[Math.floor(alea() * ids.length)];
    }
  } else {
    d.types = composer(roster, false, alea, cfg.COMPO);
    d.elite = -1;
    // UN SEUL COTE : c est la seule geometrie qui laisse une direction libre,
    // donc la seule qui rende une sortie possible sans rien retirer.
    d.geom = GEOM_ORDRE[0];
  }
  return { d, etat };
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
