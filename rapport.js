/* ===========================================================================
   LE COMPTE RENDU D'UNE MANCHE. Serveur SEUL, module pur : il ne connait ni la
   salle, ni la socket, ni le disque — on lui donne les MEMES lignes que la trace
   et il rend du texte.

   C'EST UNE REDUCTION DE LA TRACE, JAMAIS UNE SECONDE COLLECTE. Deux raisons, et
   la seconde est la vraie : on n'instrumente pas deux fois, et le compte rendu ne
   PEUT PAS diverger de ce que le fichier contient. `Room.traceLigne()` pousse
   chaque ligne dans les deux, dans cet ordre, et rien d'autre n'ecrit ici.

   ET IL EST BORNE. Trente minutes a 1 Hz font 1 800 echantillons : illisible et
   couteux a coller dans une conversation. On ne garde donc jamais les
   echantillons — on les AGREGE par segment a l'arrivee, et le texte final tient
   en quelques dizaines de lignes quelle que soit la duree.

   AUCUN PSEUDO. Le compte rendu est fait pour etre colle ailleurs : chaque joueur
   y apparait par sa CLASSE et sa COULEUR (« Rempart bleu »). C'est plus lisible
   pour l'analyse, et ca evite de coller quatre noms dans une conversation.
   =========================================================================== */

import { VERSION } from "./shared/version.js";

// LES NOMS DE COULEUR SONT ICI ET PAS DANS LA PALETTE : la palette porte des
// hexadecimaux, pas des mots, et ces mots-la ne s'affichent jamais dans le jeu.
const COULEURS = ["bleu", "ambre", "vert", "rose", "cyan", "violet", "rouge", "or"];
const CLASSES_NOM = ["Rempart", "Soigneur", "Tireur"];
const DIFF_NOM = ["calme", "normal", "cauchemar"];
// meme ordre que `DEALT_SOURCES` : le compte rendu ne lit pas le module de
// simulation, il lit des lignes de trace, et l ordre est ce qui les relie.
const DEALT_NOM = ["arme", "invoc", "zone", "brûlure", "souffle", "ricochet", "compét."];
// meme ordre que `DAMAGE_SOURCES`, pour la meme raison.
const SUBI_NOM = ["contact", "projectile", "zone", "mécanique", "brûlure",
                  "explosion", "environnement"];
const CONTRIB_NOM = { evites: "évités", proteges: "protégés",
                      detournes: "détournés", permis: "permis" };
const BIOME_NOM = ["usine", "fonderie", "nebuleuse", "ville", "serre"];

const n1 = x => Math.round(x * 10) / 10;
const pct = x => `${Math.round(x * 100)} %`;
const mmss = s => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const mediane = xs => {
  if (xs.length === 0) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

export class Rapport {
  constructor() {
    this.debut = null;
    this.fin = null;
    this.segments = new Map();
    this.boss = [];
    this.bossEnCours = null;
    this.evenements = [];
    this.notables = [];
    this.perf = new Map();
    this.dernier = null;
  }

  /* UNE SEULE PORTE D'ENTREE, et elle recoit exactement ce que le JSONL recoit.
     Une ligne inconnue est ignoree en silence : le jour ou la trace en ajoute une,
     le compte rendu continue de sortir. */
  ligne(o) {
    if (!o || typeof o !== "object") return;
    switch (o.k) {
      case "debut": this.debut = o; break;
      case "fin": this.fin = o; break;
      case "e": this._echantillon(o); break;
      case "bossDebut": this._bossDebut(o); break;
      case "bossFin": this._bossFin(o); break;
      case "barre": if (this.bossEnCours) this.bossEnCours.barres++; break;
      case "mech": this._mech(o); break;
      case "carte": this._carte(o); break;
      case "releve": this._releve(o); break;
      // le niveau et le segment se relisent sur les echantillons : deux lignes
      // de plus dans le texte pour une information deja tabulee
      case "niveau": break;
      case "segment": break;
      default: this._notable(o); break;
    }
  }

  /* UNE FENETRE PAR CLIENT ET PAR SEGMENT — jamais une moyenne. Quatre joueurs
     sont quatre machines : une moyenne d'images par seconde sur des machines
     heterogenes ne veut rien dire, et c'est justement ce qu'on veut savoir en
     LAN — « ca rame » chez tout le monde, ou sur une seule machine ? */
  _releve(o) {
    const k = o.id;
    if (!this.perf.has(k)) this.perf.set(k, []);
    const l = this.perf.get(k);
    if (l.length < 24) l.push(o);
  }

  _echantillon(o) {
    const s = this._segment(o.seg);
    s.n++;
    s.pop += o.pop ?? 0;
    if ((o.pop ?? 0) > s.popMax) s.popMax = o.pop ?? 0;
    s.plafond = o.plafond ?? s.plafond;
    s.niveau = o.niveau ?? s.niveau;
    s.kills = o.kills ?? s.kills;
    if (s.kills0 === null) s.kills0 = o.kills ?? 0;
    if (o.ev >= 0) s.evenements.add(o.ev);
    if (o.meteo >= 0) s.meteos.add(o.meteo);
    if (s.t0 === null) s.t0 = o.t ?? 0;
    s.t1 = o.t ?? s.t1;

    // LE DPS D'EQUIPE SE DEDUIT DE DEUX ECHANTILLONS, il ne se mesure pas : la
    // trace porte des CUMULS, et une difference sur un intervalle connu est plus
    // juste qu'une moyenne de fin de manche — elle ne noie pas les segments
    // calmes dans les denses.
    const total = (o.joueurs ?? []).reduce((a, p) => a + (p.degats ?? 0), 0);
    if (this.dernier && o.t > this.dernier.t) {
      const dt = o.t - this.dernier.t;
      if (dt > 0 && dt < 30) s.dps.push((total - this.dernier.degats) / dt);
    }
    this.dernier = { t: o.t ?? 0, degats: total };

    for (const p of o.joueurs ?? []) {
      const j = this._joueur(p.id);
      j.degats = p.degats ?? j.degats;
      j.soins = p.soins ?? j.soins;
      j.kills = p.kills ?? j.kills;
      j.morts = p.morts ?? j.morts;
      j.puissance = p.puissance ?? j.puissance;
      if ((p.aterre ?? 0) === 1) j.aterreT++;
    }
  }

  _bossDebut(o) {
    this.bossEnCours = { kind: o.kind, t0: o.t ?? 0, segment: o.segment ?? 0,
                         barres: 0, duree: 0, mech0: this._mechTotal() };
  }

  /* LE COMBAT SE FERME SUR `bossFin`, ET SA DUREE VIENT DE LA. La trace la
     calcule deja — la recalculer d'apres les instants de deux lignes donnerait un
     second chiffre pour la meme chose, qui divergerait au premier changement. */
  _bossFin(o) {
    const b = this.bossEnCours ?? { kind: o.kind, t0: o.t ?? 0, barres: 0 };
    b.duree = o.duree ?? 0;
    b.barres = o.barresCassees ?? b.barres;
    const m = this._mechTotal();
    b.mech = m.pose - (b.mech0?.pose ?? 0);
    b.echecs = m.echec - (b.mech0?.echec ?? 0);
    this.boss.push(b);
    this.bossEnCours = null;
  }

  // les lignes `mech` portent des CUMULS par mecanique : on garde le dernier vu
  // de chacune, la somme se fait a la lecture.
  _mech(o) {
    if (!this.mech) this.mech = new Map();
    this.mech.set(o.id, { pose: o.pose ?? 0, echec: o.echec ?? 0 });
  }

  _mechTotal() {
    let pose = 0, echec = 0;
    for (const c of (this.mech ?? new Map()).values()) { pose += c.pose; echec += c.echec; }
    return { pose, echec };
  }

  // la build DATEE : une carte, un instant, un niveau. C est ce qui rattache un
  // saut de DPS a une prise.
  _carte(o) {
    if (!this.cartes) this.cartes = new Map();
    if (!this.cartes.has(o.id)) this.cartes.set(o.id, []);
    const l = this.cartes.get(o.id);
    if (l.length < 40) l.push({ t: o.t ?? 0, carte: o.carte, niveau: o.niveau ?? 0 });
  }

  _notable(o) {
    if (this.notables.length < 40) this.notables.push(o);
  }

  _segment(i) {
    const k = i | 0;
    if (!this.segments.has(k)) {
      this.segments.set(k, {
        n: 0, pop: 0, popMax: 0, plafond: 0, niveau: 0, kills: 0, kills0: null,
        t0: null, t1: 0, dps: [], evenements: new Set(), meteos: new Set(),
      });
    }
    return this.segments.get(k);
  }

  _joueur(id) {
    if (!this.joueurs) this.joueurs = new Map();
    if (!this.joueurs.has(id)) {
      this.joueurs.set(id, { id, degats: 0, soins: 0, kills: 0, morts: 0,
                             puissance: 0, aterreT: 0 });
    }
    return this.joueurs.get(id);
  }

  _nom(id) {
    const d = this.debut?.joueurs?.find(j => j.id === id);
    const cls = CLASSES_NOM[d?.cls ?? 0] ?? "Joueur";
    const i = this.debut?.joueurs?.findIndex(j => j.id === id) ?? 0;
    return `${cls} ${COULEURS[i % COULEURS.length]}`;
  }

  /* CE QUI MERITE UNE LIGNE, ET RIEN D'AUTRE. Le texte est fait pour etre lu par
     un humain ou colle a un modele : des tableaux markdown pour ce qui est
     tabulaire, une phrase pour ce qui ne l'est pas. */
  rendu() {
    if (!this.debut) return "";
    const d = this.debut, f = this.fin;
    const L = [];
    const duree = f ? f.t : (this.dernier?.t ?? 0);

    L.push(`# Compte rendu de manche — ${VERSION}`);
    L.push("");
    L.push(`- **graine** ${d.graine} · **lieu** ${BIOME_NOM[d.biome] ?? d.biome}`
      + ` · **mode** ${DIFF_NOM[d.difficulte] ?? d.difficulte} (${d.variante})`);
    L.push(`- **effectif** ${d.effectif} · **durée** ${mmss(duree)}`
      + ` · **issue** ${f ? f.cause : "en cours"}`
      + (f?.victoire ? " (victoire)" : ""));
    L.push(`- **niveau atteint** ${f ? f.niveau : "?"}`
      + ` · **corps abattus** ${f ? f.kills : "?"}`
      + ` · **boss** ${f ? f.boss : this.boss.length}`);
    L.push("");

    L.push("## Par segment");
    L.push("");
    L.push("| seg | durée | pop. moy | pop. max | plafond | kills | niveau | DPS équipe | événement · météo |");
    L.push("|---|---|---|---|---|---|---|---|---|");
    const segs = [...this.segments.entries()].sort((a, b) => a[0] - b[0]);
    let killsAvant = 0;
    for (const [i, s] of segs) {
      const kills = Math.max(0, s.kills - killsAvant);
      killsAvant = s.kills;
      const ctx = [...s.evenements].map(e => `ev${e}`)
        .concat([...s.meteos].map(m => `mt${m}`)).join(" ") || "—";
      L.push(`| ${i} | ${mmss(Math.max(0, s.t1 - (s.t0 ?? 0)))}`
        + ` | ${n1(s.pop / Math.max(1, s.n))} | ${s.popMax} | ${s.plafond}`
        + ` | ${kills} | ${s.niveau} | ${n1(mediane(s.dps))} | ${ctx} |`);
    }
    L.push("");

    if (this.perf.size > 0) {
      L.push("## Le rendu, par client et par segment");
      L.push("");
      L.push("| client | seg | durée | im/s p50 | im/s p99 | ms p99 | ms max | quads | particules |");
      L.push("|---|---|---|---|---|---|---|---|---|");
      for (const [id, xs] of this.perf) {
        for (const f of xs) {
          L.push(`| ${this._nom(id)} | ${f.seg} | ${mmss(f.s)} | ${f.fps50}`
            + ` | ${f.fps99} | ${f.ms99} | ${f.msMax} | ${f.quads} | ${f.fragMax} |`);
        }
      }
      const pire = [...this.perf.values()].flat()
        .reduce((a, f) => (a === null || f.fps99 < a.fps99 ? f : a), null);
      if (pire) {
        L.push("");
        L.push(`**La pire image** : ${pire.fps99} im/s au p99 au segment ${pire.seg}`
          + ` (${pire.msMax} ms de pointe). C'est la machine la plus faible qui`
          + " décide de l'expérience, pas la moyenne.");
      }
      L.push("");
    }

    L.push("## Par joueur");
    L.push("");
    L.push("| joueur | dégâts | kills | soins | morts | à terre | puissance |");
    L.push("|---|---|---|---|---|---|---|");
    const lignes = f?.lignes ?? [];
    for (const j of (this.joueurs ? [...this.joueurs.values()] : [])) {
      const l = lignes.find(x => x.id === j.id);
      L.push(`| ${this._nom(j.id)} | ${Math.round(l?.degats ?? j.degats)}`
        + ` | ${l?.kills ?? j.kills} | ${Math.round(l?.soins ?? j.soins)}`
        + ` | ${l?.morts ?? j.morts} | ${mmss(j.aterreT)} | ${n1(j.puissance)} |`);
    }
    L.push("");

    /* CE QUE LE JOUEUR INFLIGE, VENTILE. Un total ne dit pas quelle part vient de
       l'arme, des invocations ou du souffle — et c'est exactement ce qui manque
       pour equilibrer une arme sur une VRAIE partie. On n'ecrit que ce qui pese :
       cinq colonnes a zero ne sont pas une information. */
    const vent = lignes.filter(l => (l.degatsPar ?? []).some(v => v > 0));
    if (vent.length > 0) {
      L.push("### Dégâts infligés, ventilés");
      L.push("");
      for (const l of vent) {
        const tot = l.degatsPar.reduce((a, b) => a + b, 0) || 1;
        const par = l.degatsPar
          .map((v, i) => [DEALT_NOM[i] ?? i, v])
          .filter(([, v]) => v / tot >= 0.005)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${k} ${pct(v / tot)}`).join(" · ");
        L.push(`- **${this._nom(l.id)}** — ${Math.round(tot)} · ${par}`);
      }
      L.push("");
    }

    /* LA CONTRIBUTION INDIRECTE ETAIT CALCULEE ET NE SORTAIT NULLE PART : un
       Rempart qui joue parfaitement avait un tableau de fin VIDE. C'est le seul
       role du jeu dont l'apport etait invisible. */
    const contrib = lignes.filter(l => l.contrib
      && Object.values(l.contrib).some(v => v > 0));
    if (contrib.length > 0) {
      L.push("### Contribution indirecte");
      L.push("");
      for (const l of contrib) {
        const par = Object.entries(l.contrib)
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${CONTRIB_NOM[k] ?? k} ${Math.round(v)}`).join(" · ");
        L.push(`- **${this._nom(l.id)}** — ${par}`);
      }
      L.push("");
    }

    if (this.cartes && this.cartes.size > 0) {
      L.push("### Builds, dans l'ordre de prise");
      L.push("");
      for (const [id, prises] of this.cartes) {
        L.push(`- **${this._nom(id)}** — `
          + prises.map(c => `${mmss(c.t)} ${c.carte}`).join(" · "));
      }
      L.push("");
    } else {
      const cartes = lignes.filter(l => (l.cartes ?? []).length > 0);
      if (cartes.length > 0) {
        L.push("### Builds");
        L.push("");
        for (const l of cartes) {
          L.push(`- **${this._nom(l.id)}** — ${(l.cartes ?? []).join(", ")}`);
        }
        L.push("");
      }
    }

    /* `subisPar` EST UN TABLEAU INDEXE PAR `DAMAGE_SOURCES`, pas un objet nomme :
       le lire avec `Object.entries` rendait « 0 0 · 1 0 · 2 0 », c'est-a-dire des
       indices et des zeros. On nomme, et on ne garde que ce qui a blesse. */
    const subis = lignes.filter(l => (l.subisPar ?? []).some(v => v > 0));
    if (subis.length > 0) {
      L.push("### Dégâts subis, par source");
      L.push("");
      for (const l of subis) {
        const par = [...l.subisPar]
          .map((v, i) => [SUBI_NOM[i] ?? i, v])
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([src, v]) => `${src} ${Math.round(v)}`).join(" · ");
        L.push(`- **${this._nom(l.id)}** — ${par}`);
      }
      L.push("");
    }

    if (this.boss.length > 0) {
      L.push("## Par boss");
      L.push("");
      L.push("| boss | durée | barres | mécaniques posées | échecs |");
      L.push("|---|---|---|---|---|");
      for (const b of this.boss) {
        L.push(`| ${b.kind} | ${mmss(b.duree)} | ${b.barres}`
          + ` | ${b.mech ?? 0} | ${b.echecs ?? 0} |`);
      }
      L.push("");
    }

    if (f?.mecaniques?.length) {
      const poses = f.mecaniques.reduce((a, m) => a + (m[1] ?? 0), 0);
      const echecs = f.mecaniques.reduce((a, m) => a + (m[2] ?? 0), 0);
      L.push(`**Mécaniques** — ${poses} posées, ${echecs} échouées`
        + (poses > 0 ? ` (${pct(echecs / poses)} d'échec)` : ""));
      L.push("");
    }

    if (d.tracePar) L.push(`*Mesure armée par ${d.tracePar}.*`);
    return L.join("\n");
  }
}

/* CRITERE REJOUABLE DU COMPTE RENDU, et c'est une BORNE : trente minutes a 1 Hz
   font 1 800 echantillons, et le texte doit rester collable. On fabrique une
   manche complete et on compte les lignes. */
export function verifierRapport() {
  const soucis = [];
  const r = new Rapport();
  r.ligne({
    k: "debut", version: VERSION, salle: "TEST", manche: 1, graine: 7919,
    difficulte: 1, variante: "normal", biome: 2, effectif: 4, tracePar: "hote",
    joueurs: [0, 1, 2, 2].map((cls, i) => ({ id: i + 1, nom: `j${i}`, cls, meta: null })),
  });
  for (let t = 0; t <= 1800; t++) {
    r.ligne({
      k: "e", t, seg: Math.min(6, 1 + Math.floor(t / 300)), beat: (t / 60 | 0) % 5,
      niveau: Math.min(30, 1 + (t / 60 | 0)), xp: t * 40, pop: 40 + (t % 97),
      plafond: 370, vivants: 4, kills: t * 3, meteo: t % 300 < 60 ? 0 : -1,
      ev: t % 300 < 30 ? 2 : -1, boss: null,
      joueurs: [1, 2, 3, 4].map(id => ({
        id, hp: 100, max: 100, bouclier: 0, aterre: 0,
        degats: t * 120 * id, soins: t * 3, kills: t, morts: 0, puissance: 1.4,
      })),
    });
  }
  r.ligne({
    k: "fin", cause: "victoire", t: 1800, segment: 6, niveau: 30, victoire: 1,
    kills: 5400, boss: 6, mecaniques: [[0, 12, 3], [1, 8, 1]],
    lignes: [1, 2, 3, 4].map(id => ({
      id, cls: 0, score: 1000, kills: 1800, morts: 1, degats: 216000,
      // MEME FORME QUE LA TRACE : un tableau indexe par `DAMAGE_SOURCES`. Le
      // jour ou la fixture ment sur la forme, le verificateur valide un rendu que
      // la vraie manche ne produira jamais.
      soins: 5400, subisPar: [900, 120, 300, 40, 0, 60, 0],
      cartes: ["blindage", "cadence", "garde"],
      degatsPar: [140000, 20000, 30000, 6000, 18000, 2000, 0],
      contrib: { evites: 1200, proteges: 800, detournes: 300, permis: 150 },
    })),
  });

  for (const id of [1, 2]) {
    for (let seg = 1; seg <= 6; seg++) {
      r.ligne({ k: "releve", id, seg, s: 300, n: 18000, gfx: 3, gl: 1,
                fps50: 120 - id * 40, fps99: 55 - id * 20, ms99: 18, msMax: 44,
                draws: 12, quads: 2400, fragMax: 900 });
    }
  }
  for (let i = 0; i < 8; i++) {
    r.ligne({ k: "carte", t: 120 * i, id: 1 + (i % 4), carte: "c" + i, niveau: 3 + i });
  }

  const texte = r.rendu();
  const n = texte.split("\n").length;
  if (n === 0) soucis.push("le compte rendu est vide");
  if (n > 400) {
    soucis.push(`compte rendu de ${n} lignes pour une manche de 30 min,`
      + " plafond 400 — il doit rester collable dans une conversation");
  }
  if (/j[0-3]\b/.test(texte)) {
    soucis.push("un pseudo apparait dans le compte rendu : il est fait pour etre colle ailleurs");
  }
  if (!texte.includes("## Par segment")) soucis.push("le resume par segment manque");
  if (!texte.includes("Dégâts infligés, ventilés")) {
    soucis.push("la ventilation des degats infliges ne sort pas");
  }
  if (!texte.includes("Contribution indirecte")) {
    soucis.push("la contribution indirecte ne sort pas — un Rempart parfait"
      + " a un compte rendu vide");
  }
  if (!/0:00 c0/.test(texte)) soucis.push("les cartes ne sont pas DATEES");
  const fenetres = (texte.match(/\| 18 \| 44 \|/g) ?? []).length;
  if (fenetres !== 12) {
    soucis.push(`${fenetres} fenetres de releve pour deux clients et six segments,`
      + " attendu 12 — le releve reste PAR CLIENT et PAR SEGMENT, jamais une moyenne");
  }
  if (!texte.includes("La pire image")) {
    soucis.push("la machine la plus faible ne ressort pas : c est elle qui decide"
      + " de l experience, pas la moyenne");
  }
  if (r.segments.size !== 6) {
    soucis.push(`${r.segments.size} segments agreges, attendu 6`);
  }
  const dps = [...r.segments.values()].map(s => mediane(s.dps));
  if (dps.some(v => !(v > 0))) {
    soucis.push("le DPS d'equipe d'un segment vaut zero — il se deduit de deux cumuls");
  }
  return soucis;
}
