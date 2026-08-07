/* Instrumentation de diagnostic — ETEINTE par defaut, activee par PERF=1.

   Elle existe pour une raison precise : le depot n'avait AUCUNE mesure
   serveur, et le lag rapporte ne montre de pic ni en CPU ni en RAM, ni sur le
   VPS ni sur les postes. Sans chiffres aux frontieres — duree de tour,
   espacement REEL de diffusion, poids d'instantane, compression reellement
   negociee, saturation de socket — on ne peut que deviner quelle couche
   decroche, et six suspects produisent exactement le meme graphe plat.

   Elle s'allume depuis la PAGE ADMIN, a chaud, sans redemarrage ni variable
   d'environnement a poser sur la machine d'hebergement — c'est la surface
   d'operateur qui existe deja. `PERF=1` reste accepte pour fixer l'etat de
   DEPART, ce qui sert aux tests en ligne de commande.

   `PERF_ON` est un `let` exporte et non un `const` : les liaisons de module ES
   sont VIVANTES, donc `room.js` et `ws_lite.js` voient la nouvelle valeur sans
   qu'on ait a leur passer quoi que ce soit. C'est aussi pourquoi les
   echantillonneurs sont crees INCONDITIONNELLEMENT chez leurs proprietaires :
   alloues seulement quand la mesure est active, ils vaudraient `null` pour
   toujours quand on l'allume apres le demarrage. Eteinte, la mesure coute un
   test de booleen par tour de boucle. */
export let PERF_ON = process.env.PERF === "1";

export function setPerf(on) {
  PERF_ON = !!on;
  return PERF_ON;
}

/* Periode du rapport. Une seconde : assez court pour suivre une vague qui
   apparait, assez long pour que le journal reste lisible a plusieurs salles. */
export const PERF_REPORT_S = 1;

/* Fenetre d'echantillons : min, max, moyenne, p99.

   La moyenne SEULE ne dit rien d'un lag par saccades — c'est precisement le
   cas ou elle reste plate pendant que le maximum decroche. C'est pour ca que
   les quatre sortent ensemble, jamais la moyenne toute seule. */
export class Sampler {
  constructor() { this.v = []; }

  add(x) { this.v.push(x); }
  reset() { this.v.length = 0; }

  stats() {
    const v = this.v;
    if (v.length === 0) return { n: 0, min: 0, max: 0, moy: 0, p99: 0 };
    let min = Infinity, max = -Infinity, sum = 0;
    for (const x of v) {
      if (x < min) min = x;
      if (x > max) max = x;
      sum += x;
    }
    /* p99 sur une copie triee. La fenetre fait au plus ~120 valeurs par
       seconde : un tri par seconde ne se mesure pas, et l'ecrire en selection
       rapide serait du code a deboguer pour rien. */
    const s = [...v].sort((a, b) => a - b);
    return {
      n: v.length,
      min, max,
      moy: sum / v.length,
      p99: s[Math.min(s.length - 1, Math.floor(s.length * 0.99))],
    };
  }
}

/* Millisecondes depuis le demarrage du module, en flottant.

   `Date.now()` a une resolution de 1 ms, et l'ecart qu'on cherche a mesurer —
   49,2 ms contre 57,4 ms d'espacement de diffusion — se joue a 8 ms : la
   resolution suffirait tout juste et la mesure serait bruitee pour rien.
   La soustraction se fait en bigint AVANT la conversion : `hrtime` compte les
   nanosecondes depuis le demarrage de la machine, ce qui depasse la precision
   entiere d'un flottant au bout de quelques mois d'uptime. */
const ORIGIN = process.hrtime.bigint();

export function nowMs() {
  return Number(process.hrtime.bigint() - ORIGIN) / 1e6;
}

export const f1 = x => x.toFixed(1);
