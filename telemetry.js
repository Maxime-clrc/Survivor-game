
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// UNE LIGNE = UN OBJET JSON. Le format existe pour etre relu par un script de
// mesure, pas par un humain : `readFile().split("\n").map(JSON.parse)` suffit,
// et une manche interrompue laisse un fichier exploitable au lieu d'un JSON
// tronque. C'est la seule raison de ne pas ecrire un tableau.
export const TRACE_DIR = process.env.TRACE_DIR || "traces";

const FLUSH_MS = 2000;
// une manche complete echantillonnee a 1 Hz en produit ~3300 : le plafond n'est
// la que pour qu'une boucle folle ne remplisse pas un disque.
const LIGNES_MAX = 200000;

export function nomTrace(code, round) {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
    + `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
    + `-${code}-m${round}.jsonl`;
}

export class Trace {
  constructor(fichier, journal = () => {}) {
    this.chemin = join(TRACE_DIR, fichier);
    this.journal = journal;
    this.tampon = [];
    this.n = 0;
    this.timer = null;
    this.mort = false;
    this.enVol = Promise.resolve();
  }

  ligne(obj) {
    if (this.mort) return;
    if (++this.n > LIGNES_MAX) {
      this.mort = true;
      this.journal(`trace ${this.chemin} : plafond de lignes atteint, arret`);
      return;
    }
    try {
      this.tampon.push(JSON.stringify(obj));
    } catch (e) {
      this.journal(`trace ${this.chemin} : ligne illisible (${e.message})`);
      return;
    }
    if (!this.timer) {
      this.timer = setTimeout(() => this.vider(), FLUSH_MS);
      this.timer.unref?.();
    }
  }

  // UNE ECRITURE RATEE NE TUE JAMAIS UNE PARTIE : on journalise et on coupe la
  // trace, la salle continue.
  vider() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.tampon.length === 0) return this.enVol;
    const bloc = this.tampon.join("\n") + "\n";
    this.tampon.length = 0;
    this.enVol = this.enVol
      .then(() => mkdir(TRACE_DIR, { recursive: true }))
      .then(() => appendFile(this.chemin, bloc, "utf8"))
      .catch(e => {
        this.mort = true;
        this.journal(`trace ${this.chemin} : ${e.message}`);
      });
    return this.enVol;
  }

  async fermer() {
    await this.vider();
    return this.chemin;
  }
}
