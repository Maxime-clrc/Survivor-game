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

/* CE QUE LE COMPTE RENDU CHERCHE DE LUI-MEME.

   « Trois images au-dessus de 33 ms, toutes pendant une nova a 190 corps » est une
   information ; un tableau de 1 800 durees d image n en est pas une. Cette
   section est la seule du compte rendu qui LIT au lieu de presenter, et c est
   pour elle que le plan 32 existe : la trace serveur sait ce qui se passait a la
   seconde pres, le releve client sait ce que la machine rendait, et personne ne
   croisait les deux.

   UNE ANOMALIE NON DETECTEE EST UN DEFAUT ; UNE ANOMALIE DETECTEE TROP SOUVENT
   EST UN BRUIT. Si une ligne sort dans TOUS les comptes rendus, ce n est plus une
   anomalie — c est un reglage a corriger ou un seuil a relever. Les seuils sont
   donc declares ici, jamais ecrits dans le code de detection : on les relit, on
   les discute, on les bouge d un endroit. */
const ANO = {
  IMAGE_MS: 33,          // une image au-dela ne tient pas les 30 im/s
  IMAGES_MIN: 3,         // en deca, c est un hoquet, pas une anomalie
  PLAFOND_PART: 0.98,    // « au plafond » = a 2 % pres
  PLAFOND_S: 20,         // ... et tenu si longtemps
  ATERRE_S: 25,          // personne n a pu venir relever
  MUET_S: 45,            // une arme qui n inflige rien pendant ce temps
  TENSION_S: 90,         // une tension basse dix secondes n est rien
  BOSS_MECA_MIN: 1,      // une mecanique jamais posee est un reglage mort
};

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
    this.tensionBasMax = 0;
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
    // L INSTANT PRECEDENT SE PREND AVANT que le cumul de DPS ne le remplace :
    // lu apres, l ecart valait toujours ZERO et toutes les anomalies de duree
    // restaient muettes — un defaut qui ne se voit que sur une manche malade.
    const tPrec = this.dernier ? this.dernier.t : null;
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

    /* LES DUREES SE COMPTENT SUR L ECART ENTRE DEUX ECHANTILLONS, jamais sur
       leur NOMBRE : la trace est nominalement a 1 Hz, mais une manche en pause ou
       un ecran de cartes decalent l horloge, et compter les echantillons ferait
       mentir toutes les anomalies de duree. */
    const dt = tPrec === null ? 0 : Math.max(0, Math.min(30, (o.t ?? 0) - tPrec));
    if ((o.pop ?? 0) >= (o.plafond ?? 0) * ANO.PLAFOND_PART && (o.plafond ?? 0) > 0) {
      s.plafondS += dt;
    }
    if (this.tensionBas0 === undefined) this.tensionBas0 = 0;
    this.tensionBas0 = (o.tensionBas ?? 0);
    if (this.tensionBas0 > this.tensionBasMax) this.tensionBasMax = this.tensionBas0;

    for (const p of o.joueurs ?? []) {
      const j = this._joueur(p.id);
      const avant = j.degats;
      j.degats = p.degats ?? j.degats;
      j.soins = p.soins ?? j.soins;
      j.kills = p.kills ?? j.kills;
      j.morts = p.morts ?? j.morts;
      j.puissance = p.puissance ?? j.puissance;
      if ((p.aterre ?? 0) === 1) {
        j.aterreT++;
        j.aterreS += dt;
        if (j.aterreS > j.aterreMax) j.aterreMax = j.aterreS;
      } else {
        j.aterreS = 0;
      }
      if (j.degats <= avant) {
        j.muetS += dt;
        if (j.muetS > j.muetMax) j.muetMax = j.muetS;
      } else {
        j.muetS = 0;
      }
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

  /* LES ANOMALIES, ET CHACUNE PORTE SON CONTEXTE. Un instant sans ce qui se
     passait a cet instant n est pas exploitable : c est precisement ce que le
     croisement trace serveur / releve client rend possible, et c est pour ca
     qu il fallait les deux. */
  _anomalies() {
    const out = [];
    const seg = [...this.segments.entries()].sort((a, b) => a[0] - b[0]);

    // 1 · les images qui sautent, avec ce que la simulation faisait a ce moment
    for (const [id, fenetres] of this.perf) {
      for (const f of fenetres) {
        if (f.msMax < ANO.IMAGE_MS) continue;
        const s = this.segments.get(f.seg);
        const ctx = s
          ? `${n1(s.pop / Math.max(1, s.n))} corps en moyenne, pointe ${s.popMax}`
            + (s.evenements.size ? `, événement ${[...s.evenements].join("/")}` : "")
            + (s.meteos.size ? `, météo ${[...s.meteos].join("/")}` : "")
          : "contexte inconnu";
        out.push(`**image** — ${this._nom(id)} : pointe à ${f.msMax} ms au segment`
          + ` ${f.seg} (p99 ${f.ms99} ms, ${f.fps99} im/s) · ${ctx}`);
      }
    }

    // 2 · le plafond tenu : la difficulte cesse de monter sans que personne le voie
    for (const [i, s] of seg) {
      if (s.plafondS >= ANO.PLAFOND_S) {
        out.push(`**plafond** — segment ${i} : population au plafond (${s.plafond})`
          + ` pendant ${Math.round(s.plafondS)} s. Le budget d'apparition demande`
          + " plus que le moteur ne rend, et la difficulté cesse d'augmenter");
      }
    }

    // 3 · a terre longtemps : personne n a pu venir, et REVIVE_RADIUS vaut 96
    for (const j of (this.joueurs ? this.joueurs.values() : [])) {
      if (j.aterreMax >= ANO.ATERRE_S) {
        out.push(`**à terre** — ${this._nom(j.id)} : ${Math.round(j.aterreMax)} s`
          + " au sol d'affilée. Personne n'a pu venir le relever");
      }
      if (j.muetMax >= ANO.MUET_S && j.degats > 0) {
        out.push(`**arme muette** — ${this._nom(j.id)} : ${Math.round(j.muetMax)} s`
          + " sans infliger un dégât. À terre, hors de portée, ou un défaut");
      }
    }

    // 4 · la tension plate, et on le sait AVANT que le Director existe
    if (this.tensionBasMax >= ANO.TENSION_S) {
      out.push(`**tension plate** — ${Math.round(this.tensionBasMax)} s sous le`
        + " seuil bas d'affilée. La manche est plate à cet endroit");
    }

    // 5 · une mecanique de boss jamais posee est un reglage mort
    const meca = this.fin?.mecaniques ?? [];
    const jamais = meca.filter(m => (m[1] ?? 0) < ANO.BOSS_MECA_MIN).map(m => m[0]);
    if (jamais.length > 0 && meca.length > 0) {
      out.push(`**mécanique morte** — ${jamais.length} mécanique(s) jamais posée(s)`
        + ` sur la manche : ${jamais.join(", ")}`);
    }

    return out;
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
        plafondS: 0,
      });
    }
    return this.segments.get(k);
  }

  _joueur(id) {
    if (!this.joueurs) this.joueurs = new Map();
    if (!this.joueurs.has(id)) {
      this.joueurs.set(id, { id, degats: 0, soins: 0, kills: 0, morts: 0,
                             puissance: 0, aterreT: 0,
                             aterreS: 0, aterreMax: 0, muetS: 0, muetMax: 0 });
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

    const anomalies = this._anomalies();
    L.push("## Anomalies");
    L.push("");
    if (anomalies.length === 0) {
      L.push("*Rien à signaler.*");
    } else {
      for (const a of anomalies) L.push(`- ${a}`);
    }
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
                fps50: 120 - id * 40, fps99: 55 - id * 20, ms99: 18, msMax: 28,
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
  const fenetres = (texte.match(/[|] 18 [|] 28 [|]/g) ?? []).length;
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

  /* LES DEUX MOITIES DU CRITERE D ANOMALIE, et la premiere compte plus que la
     seconde : une section toujours pleine ne sera plus lue. La manche ci-dessus
     est SAINE — population sous le plafond, personne a terre, tension qui bouge —
     et elle ne doit rien produire. */
  const iAno = texte.split("\n").indexOf("## Anomalies");
  if (iAno < 0) soucis.push("la section des anomalies manque");
  else if (!texte.split("\n")[iAno + 2].startsWith("*Rien")) {
    soucis.push("une manche saine produit des anomalies : "
      + texte.split("\n")[iAno + 2]);
  }

  // ... et une manche fabriquee avec des defauts CONNUS doit les faire sortir.
  const mal = new Rapport();
  mal.ligne({ k: "debut", graine: 1, difficulte: 1, variante: "normal", biome: 0,
              effectif: 2, joueurs: [{ id: 1, cls: 0 }, { id: 2, cls: 2 }] });
  for (let t = 0; t <= 600; t++) {
    mal.ligne({ k: "e", t, seg: 1, niveau: 5, xp: t * 10, pop: 370, plafond: 370,
                vivants: 1, kills: t, meteo: -1, ev: -1, tensionBas: t,
                joueurs: [
                  { id: 1, degats: 0, kills: 0, morts: 1, aterre: 1, puissance: 1 },
                  { id: 2, degats: t * 50, kills: t, morts: 0, aterre: 0, puissance: 1.5 },
                ] });
  }
  mal.ligne({ k: "fin", cause: "defaite", t: 600, segment: 1, niveau: 5, victoire: 0,
              kills: 600, boss: 0, mecaniques: [[0, 0, 0], [1, 4, 1]], lignes: [] });
  const a = mal._anomalies().join("\n");
  for (const [quoi, motif] of [["plafond", /plafond/], ["à terre", /à terre/],
                               ["tension plate", /tension plate/],
                               ["mécanique morte", /mécanique morte/]]) {
    if (!motif.test(a)) soucis.push(`une manche malade ne signale pas « ${quoi} »`);
  }
  return soucis;
}
