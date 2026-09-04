
import { ALERT_ORDER, ALERT_WARN } from "./bosses.js";
import { t, tf } from "./i18n.js";

export const TL_CFG = {
  SEGMENTS: 6,
  SEGMENT_TIME: 300,
  BEATS: 5,
  BEAT_TIME: 60,

  SPAWN_MARGIN: 60,

  RING_RATIO: 0.62,
  RING_CLEAR: 120,
  RING_TRIES: 8,

  PACK: 4,

  EVENT_ANNOUNCE: 2.6,
};

export const SEGMENT_NAMES = [
  "Installation",
  "Emprise",
  "Crise",
  "Ressac",
  "Étau",
  "Apothéose",
];

export function segmentName(segment) {
  const nom = SEGMENT_NAMES[segment - 1];
  return nom
    ? t(`segment.${segment}`, nom)
    : tf("segment.autre", "Segment {n}", { n: segment });
}

export const EV_NUEE = 0;
export const EV_SIEGE = 1;
export const EV_CROISE = 2;
export const EV_CHASSE = 3;
export const EV_ESSAIM = 4;
export const EV_RELAIS = 5;

export const EVENTS = [
  { key: "nuee", nom: "Nuée", level: ALERT_WARN,
    texte: "une nuée arrive — tenez votre position",
    types: [1], rateMul: 2.6, minPlayers: 1, fallback: -1 },

  { key: "siege", nom: "Siège", level: ALERT_WARN,
    texte: "siège de blindés — ne vous laissez pas encercler",
    types: [2], rateMul: 0.38, minPlayers: 1, fallback: -1 },

  { key: "croise", nom: "Tir croisé", level: ALERT_WARN,
    texte: "tir croisé — fermez la distance",
    types: [3, 3, 3, 0], rateMul: 0.9, minPlayers: 1, fallback: -1 },

  { key: "chasse", nom: "Chasse", level: ALERT_ORDER,
    texte: "CONCENTREZ LE FEU sur la cible",
    types: [], rateMul: 0, minPlayers: 1, fallback: -1 },

  /* DEUX TYPES DE PLUS, ET CE SONT DES DONNEES. Un evenement n est qu un tableau
     de types, un multiplicateur de taux et une annonce : rien a ecrire dans la
     simulation. Quatre types pour trente battements imposaient de repeter la
     Nuee ou de laisser 83 % des battements muets ; six types en autorisent DOUZE
     sans qu aucun ne serve plus de deux fois.
     `EVENTS` est APPEND-ONLY — son index circule sur le reseau. */
  { key: "essaim", nom: "Essaim", level: ALERT_WARN,
    texte: "essaim de harceleurs — ne restez pas immobiles",
    types: [9, 9, 1], rateMul: 2.2, minPlayers: 1, fallback: -1 },

  { key: "relais", nom: "Chaîne de relais", level: ALERT_WARN,
    texte: "ils se relaient — coupez la chaîne",
    types: [12, 12, 10], rateMul: 0.8, minPlayers: 1, fallback: -1 },
];

export function eventAt(id) { return EVENTS[id] ?? null; }
export const eventNom = i => t(`event.${EVENTS[i]?.key}.nom`, EVENTS[i]?.nom ?? "");
export const eventTexte = i => t(`event.${EVENTS[i]?.key}.texte`, EVENTS[i]?.texte ?? "");

export const GEOMETRIES = ["bords", "front", "pince", "quatre-fronts", "anneau"];

/* LE SCRIPT EST UNE TABLE DE DONNEES, ET IL LAISSAIT 83 % DE SES BATTEMENTS
   MUETS : cinq evenements sur trente, une seule geometrie sur cinq jamais tiree,
   et la MEME dent de scie montante repetee six fois.

   TROIS REGLES TENUES PAR `verifierScript` :
   - aucun type d evenement plus de DEUX fois — d ou les six types : quatre n en
     auraient autorise que huit, et repeter la Nuee etait le defaut d origine ;
   - aucune geometrie declaree absente du script — `anneau` etait ecrite,
     IMPLEMENTEE (`_ringPoint`) et jamais tiree ;
   - deux segments consecutifs n ont pas la meme FORME de courbe, la forme etant
     la suite des signes de variation.

   LA SOMME PAR SEGMENT NE BOUGE PAS (6,0 · 10,0 · 12,6 · 14,7 · 17,9 · 20,7) :
   on redistribue la pression a l interieur du segment, on n en ajoute pas. Sans
   ca, tout ce que les lots precedents ont mesure serait a refaire.

   ET LE SOLO NE PERD PLUS DEUX BATTEMENTS. `quatre-fronts` exige trois joueurs ;
   les segments 5 et 6 en portaient DEUX chacun, donc l apogee du solo etait
   doublement degradee. Un des deux devient `anneau`, qui n exige personne. */
export const SCRIPT = [
  // 1 · montee franche : c est le segment qui apprend
  [
    { rate: 0.6, geom: "bords" },
    { rate: 0.9, geom: "bords" },
    { rate: 1.2, geom: "front", event: EV_SIEGE },
    { rate: 1.5, geom: "bords" },
    { rate: 1.8, geom: "pince" },
  ],
  // 2 · creux au deuxieme, puis montee
  [
    { rate: 1.6, geom: "bords", event: EV_SIEGE },
    { rate: 1.2, geom: "front" },
    { rate: 2.0, geom: "pince", event: EV_RELAIS },
    { rate: 2.5, geom: "anneau" },
    { rate: 2.7, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
  // 3 · plateau, puis pic
  [
    { rate: 2.1, geom: "front", event: EV_RELAIS },
    { rate: 2.3, geom: "pince" },
    { rate: 2.2, geom: "bords", event: EV_CROISE },
    { rate: 2.6, geom: "quatre-fronts", minPlayers: 3, fallback: "front" },
    { rate: 3.4, geom: "pince" },
  ],
  // 4 · dents de scie
  [
    { rate: 2.6, geom: "bords" },
    { rate: 2.1, geom: "anneau", event: EV_CROISE },
    { rate: 3.2, geom: "front" },
    { rate: 2.6, geom: "pince", event: EV_ESSAIM },
    { rate: 4.2, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
  // 5 · montee, respiration, pic
  [
    { rate: 3.2, geom: "pince" },
    { rate: 3.8, geom: "quatre-fronts", minPlayers: 3, fallback: "front", event: EV_CHASSE },
    { rate: 2.7, geom: "bords" },
    { rate: 3.6, geom: "anneau", event: EV_ESSAIM },
    { rate: 4.6, geom: "pince" },
  ],
  // 6 · crescendo continu jusqu au final
  [
    { rate: 3.4, geom: "front", event: EV_NUEE },
    { rate: 3.7, geom: "bords" },
    { rate: 4.0, geom: "pince", event: EV_NUEE },
    { rate: 4.6, geom: "anneau" },
    { rate: 5.0, geom: "quatre-fronts", minPlayers: 3, fallback: "pince" },
  ],
];

const GEOM_CALME = { pince: "front", "quatre-fronts": "front", anneau: "bords" };
const GEOM_CAUCHEMAR = { bords: "front", front: "pince", pince: "quatre-fronts" };

function derive(nom) {
  const dur = nom === "cauchemar";
  const doux = nom === "calme";
  return SCRIPT.map(seg => seg.map(b => {
    let geom = b.geom;
    if (doux) geom = GEOM_CALME[geom] ?? geom;
    else if (dur) geom = GEOM_CAUCHEMAR[geom] ?? geom;
    const out = { ...b, geom };
    if (out.fallback) out.fallback = doux ? (GEOM_CALME[out.fallback] ?? out.fallback)
      : dur ? (GEOM_CAUCHEMAR[out.fallback] ?? out.fallback)
      : out.fallback;
    return out;
  }));
}

export const SCRIPTS = {
  calme: derive("calme"),
  normal: derive("normal"),
  cauchemar: derive("cauchemar"),
};

const REPLI = { rate: 1.0, geom: "bords" };

export function beatAt(script, segment, beat) {
  const table = SCRIPTS[script] ?? SCRIPTS.normal;
  const seg = table[segment - 1];
  if (!seg) return REPLI;
  return seg[Math.max(0, Math.min(seg.length - 1, beat))] ?? REPLI;
}

export function adaptEntry(entry, alive) {
  if (!entry) return REPLI;
  if (!entry.minPlayers || alive >= entry.minPlayers) return entry;
  const back = entry.fallback;
  if (!back || !GEOMETRIES.includes(back)) return { ...entry, geom: "bords" };
  return { ...entry, geom: back };
}

export function adaptEvent(id, alive) {
  const def = EVENTS[id];
  if (!def) return -1;
  if (alive >= def.minPlayers) return id;
  const back = def.fallback ?? -1;
  if (back < 0) return -1;
  const bd = EVENTS[back];
  return bd && alive >= bd.minPlayers ? back : -1;
}

/* LE CRITERE REJOUABLE DU SCRIPT. Il ne verifiait que la POSE d un evenement ;
   il verifie desormais aussi ce qui faisait qu un script correct pouvait rester
   pauvre — un type repete, une geometrie ecrite et jamais tiree, six segments de
   meme forme, et une apogee amputee en solo. */
export function verifierScript() {
  const soucis = [];
  for (const [nom, table] of Object.entries(SCRIPTS)) {
    let precedent = -9;
    const parType = new Map();
    const tirees = new Set();
    table.forEach((seg, s) => seg.forEach((b, i) => {
      const ou = `${nom} ${s + 1}.${i + 1}`;
      tirees.add(b.geom);
      if (b.fallback) tirees.add(b.fallback);
      if (b.event === undefined) return;
      if (!EVENTS[b.event]) soucis.push(`${ou} : evenement inconnu ${b.event}`);
      else parType.set(b.event, (parType.get(b.event) ?? 0) + 1);
      if (i === TL_CFG.BEATS - 1) soucis.push(`${ou} : evenement sur un crescendo`);
      const idx = s * TL_CFG.BEATS + i;
      if (idx - precedent < 2) soucis.push(`${ou} : deux evenements consecutifs`);
      precedent = idx;
    }));

    // UN TYPE REPETE TROIS FOIS N EST PLUS UNE VARIETE, c est un remplissage
    for (const [id, n] of parType) {
      if (n > 2) soucis.push(`${nom} : « ${EVENTS[id].key} » sert ${n} fois`);
    }

    /* UNE GEOMETRIE DECLAREE ET JAMAIS TIREE EST DU CODE MORT QUE RIEN NE
       SIGNALE : `anneau` etait ecrite, implementee et absente des trois scripts.
       Les scripts DERIVES remappent (`GEOM_CALME`, `GEOM_CAUCHEMAR`), donc le
       critere porte sur la table SOURCE, seule a devoir tout couvrir. */
    if (nom === "normal") {
      for (const g of GEOMETRIES) {
        if (!tirees.has(g)) soucis.push(`${nom} : geometrie « ${g} » jamais tiree`);
      }
    }

    /* DEUX SEGMENTS CONSECUTIFS DE MEME FORME sont le meme segment joue deux
       fois. La forme est la suite des signes de variation, pas les valeurs. */
    const forme = seg => seg.slice(1)
      .map((b, i) => b.rate > seg[i].rate ? "+" : b.rate < seg[i].rate ? "-" : "=").join("");
    for (let s = 1; s < table.length; s++) {
      if (forme(table[s]) === forme(table[s - 1])) {
        soucis.push(`${nom} : segments ${s} et ${s + 1} ont la meme forme (${forme(table[s])})`);
      }
    }

    /* EN SOLO, UN SEGMENT NE PERD PAS DEUX BATTEMENTS. `quatre-fronts` exige
       trois joueurs ; les segments 5 et 6 en portaient deux chacun, donc l apogee
       du solo etait doublement degradee — et le repli est SILENCIEUX. */
    table.forEach((seg, s) => {
      const replis = seg.filter(b => (b.minPlayers ?? 1) > 1).length;
      if (replis > 1) {
        soucis.push(`${nom} : segment ${s + 1} perd ${replis} battements en solo`);
      }
    });

    /* LA PRESSION EFFECTIVE MONTE D UN SEGMENT AU SUIVANT. Un evenement
       MULTIPLIE le taux — de x0,38 pour le siege a x2,6 pour la nuee —, donc une
       somme de base croissante ne dit rien de ce que la manche fait sentir. Casser
       la monotonie DANS un segment est le but ; la casser ENTRE eux ferait
       redescendre la manche. */
    const pression = seg => seg.reduce((a, b) =>
      a + b.rate * (b.event !== undefined ? (EVENTS[b.event]?.rateMul ?? 1) : 1), 0);
    for (let s = 1; s < table.length; s++) {
      const av = pression(table[s - 1]), ap = pression(table[s]);
      if (ap < av) {
        soucis.push(`${nom} : la pression retombe du segment ${s} au ${s + 1}`
          + ` (${av.toFixed(1)} -> ${ap.toFixed(1)})`);
      }
    }
  }
  return soucis;
}

/* ===========================================================================
   LES CONTRATS. Meme forme que `EVENTS` — une table purement declarative — mais
   une table SEPAREE, et c'est un choix : un evenement remplace la COMPOSITION du
   battement (`types`, `rateMul`), un contrat ne touche a RIEN du budget de
   pression. Les melanger ferait qu'accepter un contrat changerait la horde, et
   `verifierScript()` mesurerait alors deux choses a la fois.

   `CONTRATS` EST APPEND-ONLY, comme `EVENTS` : son index circule dans
   l'instantane et dans la trace.

   UN CONTRAT SE LIT EN UNE PHRASE ET SE FAIT SANS QUITTER LONGTEMPS CE QU'ON
   FAISAIT. Le fond du jeu reste la horde, et deux derives symetriques le
   detruiraient : trop dur, il devient un combat et dilue le mini-boss, qui doit
   rester la seule menace nommee qu'on va chercher ; trop nombreux, il devient
   obligatoire, et un objectif obligatoire n'est plus une decision, c'est une
   corvee.

   AUCUN OBJECTIF NE DEMANDE D'INSTRUMENTER LA SIMULATION, et c'est le critere de
   selection : les cinq compteurs existent deja (kills, elites, temps, presence,
   cible designee). Un objectif qui demanderait un compteur neuf sort de la table.
   =========================================================================== */

export const CONTRAT_COMMUN = 0;
export const CONTRAT_RARE = 1;
export const CONTRAT_DANGEREUX = 2;
export const CONTRAT_MAUDIT = 3;

/* LES QUATRE RARETES NE CHANGENT PAS QUE LA QUANTITE, ELLES CHANGENT LA FORME.
   Plus le joueur accepte de mettre la manche en danger, plus la recompense change
   la FORME de sa run et pas seulement ses chiffres. Le `loot` est declare ici et
   n'est pas encore verse : c'est le plan 35 qui le branchera, et le declarer
   maintenant evite d'ecrire deux fois la table des recompenses. */
export const RARETES = [
  { key: "commun", nom: "Contrat", eclats: 26, loot: null, poids: 52 },
  { key: "rare", nom: "Contrat rare", eclats: 40, loot: { rang: 1, choix: 2 }, poids: 30 },
  { key: "dangereux", nom: "Contrat dangereux", eclats: 62,
    loot: { rang: 2, choix: 1, contrepartie: 1 }, poids: 14 },
  { key: "maudit", nom: "Contrat maudit", eclats: 95,
    loot: { rang: 3, choix: 2, multiple: 1 }, poids: 4 },
];

export const OBJ_KILLS = 0;
export const OBJ_ELITES = 1;
export const OBJ_TENIR = 2;
export const OBJ_ZONE = 3;

/* `duree` EST UNE ECHEANCE, PAS UNE DUREE D'OBJECTIF : c'est le temps qu'on a
   pour le remplir. `seuil` est ce qu'il faut atteindre, et il est ecrit PAR
   RARETE parce qu'un meme objectif ne vaut pas le meme prix a deux raretes. */
export const CONTRATS = [
  { key: "nettoyage", obj: OBJ_KILLS, nom: "Nettoyage",
    texte: "abattez {n} corps avant l'échéance",
    seuils: [60, 90, 130, 180], duree: 90 },

  { key: "decapitation", obj: OBJ_ELITES, nom: "Décapitation",
    texte: "abattez {n} élites avant l'échéance",
    seuils: [1, 2, 3, 4], duree: 150 },

  { key: "position", obj: OBJ_ZONE, nom: "Position tenue",
    texte: "tenez la borne {n} secondes",
    seuils: [20, 30, 40, 55], duree: 120 },

  { key: "endurance", obj: OBJ_TENIR, nom: "Endurance",
    texte: "survivez {n} secondes, personne à terre",
    seuils: [45, 60, 80, 100], duree: 110 },
];

export const contratAt = i => CONTRATS[i] ?? null;
export const rareteAt = i => RARETES[i] ?? RARETES[0];

/* CRITERE REJOUABLE DE LA TABLE. Un seuil qui redescend d'une rarete a la
   suivante rendrait le contrat plus DUR moins payant ; une echeance trop courte
   pour son seuil le rendrait infaisable sans que rien le dise — et un contrat
   infaisable ne se distingue pas d'un joueur qui a mal joue. */
export function verifierContrats() {
  const soucis = [];
  const cles = new Set();
  for (const c of CONTRATS) {
    if (cles.has(c.key)) soucis.push(`contrat en double : ${c.key}`);
    cles.add(c.key);
    if (c.seuils.length !== RARETES.length) {
      soucis.push(`${c.key} : ${c.seuils.length} seuils pour ${RARETES.length} raretes`);
    }
    for (let i = 1; i < c.seuils.length; i++) {
      if (c.seuils[i] <= c.seuils[i - 1]) {
        soucis.push(`${c.key} : le seuil ne monte pas de la rarete ${i - 1} a ${i}`);
      }
    }
    if (!c.texte.includes("{n}")) soucis.push(`${c.key} : le texte ne dit pas son seuil`);
    // UN OBJECTIF DE TEMPS NE PEUT PAS DEMANDER PLUS QUE SON ECHEANCE.
    if ((c.obj === OBJ_TENIR || c.obj === OBJ_ZONE)
        && c.seuils[c.seuils.length - 1] >= c.duree) {
      soucis.push(`${c.key} : le seuil maximal (${c.seuils[c.seuils.length - 1]} s)`
        + ` atteint ou depasse l echeance (${c.duree} s) — infaisable`);
    }
  }
  let poids = 0;
  for (const r of RARETES) {
    poids += r.poids;
    if (r.poids <= 0) soucis.push(`rarete ${r.key} : poids nul, elle ne sort jamais`);
    if (r.eclats <= 0) soucis.push(`rarete ${r.key} : aucune recompense`);
  }
  for (let i = 1; i < RARETES.length; i++) {
    if (RARETES[i].eclats <= RARETES[i - 1].eclats) {
      soucis.push(`rarete ${RARETES[i].key} : elle paie moins que la precedente`);
    }
    if (RARETES[i].poids >= RARETES[i - 1].poids) {
      soucis.push(`rarete ${RARETES[i].key} : elle sort aussi souvent que la precedente`);
    }
  }
  if (poids <= 0) soucis.push("aucune rarete n est tirable");
  return soucis;
}
