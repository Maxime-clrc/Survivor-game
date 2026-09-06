/* ===========================================================================
   I18N — le francais reste ECRIT A COTE DE SA DONNEE (tables, markup) et sert
   de repli ; une langue etrangere est une SURCHARGE par cle. Une cle absente
   rend le repli, donc une traduction incomplete degrade proprement au lieu de
   trouer l'ecran.

   Module pur : aucune dependance hors du dictionnaire, aucune reference au DOM
   (la traduction du markup vit dans `public/ui/dom.js`). Le serveur peut donc
   l'importer sans qu'un `localStorage` absent ne le fasse lever.
   =========================================================================== */

import { EN } from "./lang/en.js";

export const LANGS = ["fr", "en"];
export const LANG_DEFAUT = "fr";
export const LANG_NOM = { fr: "Français", en: "English" };

const DICTS = { en: EN };
const CLE = "survivor.lang";

const abonnes = new Set();
let langue = LANG_DEFAUT;

function lire() {
  try {
    const v = localStorage.getItem(CLE);
    return LANGS.includes(v) ? v : null;
  } catch { return null; }
}
langue = lire() ?? LANG_DEFAUT;

export function getLang() { return langue; }

/* LES CLEFS QU UNE LANGUE PORTE. Il n existe aucun moyen de savoir qu une clef
   MANQUE : `t()` replie sur le francais et ne dit rien, ce qui est exactement le
   comportement voulu en jeu et exactement ce qui rend un oubli invisible. Un
   verificateur qui veut croiser une table avec le dictionnaire a donc besoin de
   le LIRE — et il ne peut pas importer `lang/en.js` lui-meme sans doubler la
   source. Ce module reste le seul point d entree de la langue. */
export function clefsDe(code) { return Object.keys(DICTS[code] ?? {}); }

export function setLang(code) {
  if (!LANGS.includes(code) || code === langue) return;
  langue = code;
  try { localStorage.setItem(CLE, code); } catch {}
  for (const fn of abonnes) fn(code);
}

export function onLangChange(fn) {
  abonnes.add(fn);
  return () => abonnes.delete(fn);
}

export function t(cle, repli = cle) {
  const v = DICTS[langue]?.[cle];
  return typeof v === "string" ? v : repli;
}

/* `{nom}` dans le texte, `{ nom: valeur }` a l'appel. Le repli francais porte
   les memes marqueurs : c'est ce qui permet de traduire une phrase dont l'ordre
   des mots change, la ou une concatenation le figerait. */
export function tf(cle, repli, vals) {
  return t(cle, repli).replace(/\{(\w+)\}/g, (m, k) => (k in vals ? String(vals[k]) : m));
}

/* Le pluriel n'a pas la meme regle partout : le francais bascule a 2, l'anglais
   a tout ce qui n'est pas 1. La forme se choisit donc dans la langue AFFICHEE,
   et les deux formes portent le suffixe `.un` / `.n`. */
const PLURIEL = { fr: n => n > 1, en: n => n !== 1 };

/* Le separateur decimal appartient a la langue, pas au nombre : « ×1,84 » en
   francais, « ×1.84 » en anglais. Point de passage unique de tout decimal
   affiche. */
const DECIMALE = { fr: ",", en: "." };

export function dec(v, d = 2) {
  return v.toFixed(d).replace(".", DECIMALE[langue] ?? ".");
}

/* Un nombre d'affichage : entier tel quel, sinon UNE decimale. Il arrondit
   avant de formater — `0,6 * 3` vaut 1,7999999999999998 en flottant, et ca
   s'affichait tel quel dans l'arbre de progression. */
export function nombre(v) {
  const x = Math.round(v * 10) / 10;
  return Number.isInteger(x) ? String(x) : dec(x, 1);
}

/* L'ordinal n'est pas un suffixe universel : le francais distingue le premier du
   reste, l'anglais distingue 1/2/3 puis les adolescents. */
const ORDINAL = {
  fr: n => n === 1 ? "1ʳᵉ" : `${n}ᵉ`,
  en: n => {
    const d = n % 10, c = n % 100;
    if (c >= 11 && c <= 13) return `${n}th`;
    return `${n}${d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"}`;
  },
};

export function ordinal(n) {
  return (ORDINAL[langue] ?? ORDINAL.fr)(n);
}

export function tn(base, repliUn, repliN, n, vals = {}) {
  const plur = (PLURIEL[langue] ?? PLURIEL.fr)(n);
  return tf(`${base}.${plur ? "n" : "un"}`, plur ? repliN : repliUn, { n, ...vals });
}
