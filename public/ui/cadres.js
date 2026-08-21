import { CADRE_SKIN, cadreAccent } from "/shared/palette.js";

/* LES DOUZE INSIGNES. Chacun dit le DEFI, pas le nom du cadre : l'anneau brise
   du Depouille est l'ultime jamais lancee, l'arc ouvert de l'Ermite est le vide
   autour du joueur seul, le cercle vide du Sobre est le rien assume.

   Ils sont poses en MASQUE, pas en <svg> injecte : les trois sites d'appel
   construisent des chaines HTML, et un masque prend `background: var(--cadre)`,
   donc le spectre du Prismatique s'y applique sans un cas particulier.

   viewBox 16x16, trace en noir plein — c'est l'ALPHA qui masque, la couleur du
   trace n'arrive jamais a l'ecran. */
const SVG = (d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#000">${d}</svg>`;
const TRAIT = `fill="none" stroke="#000" stroke-linecap="round"`;

export const INSIGNES = {
  // Sobre — le rien assume : un cercle qui ne contient rien
  cercle: SVG(`<circle cx="8" cy="8" r="5.6" ${TRAIT} stroke-width="1.7"/>`),

  // Depouille — anneau BRISE : l'ultime qu'on n'a jamais lancee
  anneau: SVG(`<circle cx="8" cy="8" r="5.6" ${TRAIT} stroke-width="1.7"
    stroke-dasharray="26 9" transform="rotate(-58 8 8)"/>`),

  // Immacule — surface pleine, aucune entaille
  losange: SVG(`<path d="M8 1.2 14.8 8 8 14.8 1.2 8Z"/>`),

  // Foudroyant — eclair anguleux, aucune courbe
  eclair: SVG(`<path d="M9.7 1 3.3 9.1h3.3l-1 5.9 6.5-8.5H8.9L9.7 1Z"/>`),

  // Arsenal — trois canons en faisceau sur leur ratelier
  ratelier: SVG(`<g ${TRAIT} stroke-width="1.9">
    <path d="M8 13.4V3.2"/><path d="M8 13.4 3.5 4.4"/><path d="M8 13.4 12.5 4.4"/>
    <path d="M3 14.6h10"/></g>`),

  // Ermite — un point, et le vide sur la moitie du tour
  solitude: SVG(`<circle cx="8" cy="8" r="2.2"/>
    <circle cx="8" cy="8" r="6" ${TRAIT} stroke-width="1.6"
      stroke-dasharray="19 19" transform="rotate(-90 8 8)"/>`),

  // Insomniaque — l'oeil BARRE : reprend le signe du Regard, deja connu
  oeil: SVG(`<path d="M1.3 8S4.1 3.5 8 3.5 14.7 8 14.7 8 11.9 12.5 8 12.5 1.3 8 1.3 8Z"
      ${TRAIT} stroke-width="1.5"/>
    <circle cx="8" cy="8" r="2"/>
    <path d="M2.6 13.4 13.4 2.6" ${TRAIT} stroke-width="1.9"/>`),

  // Intact — bouclier plein, aucune fissure
  bouclier: SVG(`<path d="M8 1.1 14 3.3v5.1c0 3.4-2.6 5.6-6 6.5-3.4-.9-6-3.1-6-6.5V3.3L8 1.1Z"/>`),

  // Chasseur — TROPHEE : une pointe traversant un anneau. Pas un croc : le
  // defi est un roster de boss, pas une chasse.
  trophee: SVG(`<circle cx="8" cy="9.6" r="4.3" ${TRAIT} stroke-width="1.7"/>
    <path d="M8 .8 10.1 4.3 8.7 15.2H7.3L5.9 4.3 8 .8Z"/>`),

  // Or — couronne de laurier. Le seul insigne franchement figuratif, et la
  // raison pour laquelle l'insigne est un chemin vectoriel et pas du CSS.
  laurier: SVG(`<g ${TRAIT} stroke-width="1.4">
      <path d="M7 14.6C3 12.9 1.5 9 2.6 4.2"/><path d="M9 14.6C13 12.9 14.5 9 13.4 4.2"/></g>
    <g><ellipse cx="2.6" cy="6" rx="1.9" ry=".95" transform="rotate(-62 2.6 6)"/>
      <ellipse cx="3.3" cy="9.3" rx="1.9" ry=".95" transform="rotate(-42 3.3 9.3)"/>
      <ellipse cx="5" cy="12.3" rx="1.8" ry=".9" transform="rotate(-22 5 12.3)"/>
      <ellipse cx="13.4" cy="6" rx="1.9" ry=".95" transform="rotate(62 13.4 6)"/>
      <ellipse cx="12.7" cy="9.3" rx="1.9" ry=".95" transform="rotate(42 12.7 9.3)"/>
      <ellipse cx="11" cy="12.3" rx="1.8" ry=".9" transform="rotate(22 11 12.3)"/></g>`),

  // Phalange — quatre boucliers serres, en formation et non en rang : un rang
  // de quatre a 16 px ne fait plus que des traits
  phalange: SVG(`<g>
    <path d="M4 1.3 6.6 2.2v2.6c0 1.7-1.3 2.8-2.6 3.3-1.3-.5-2.6-1.6-2.6-3.3V2.2L4 1.3Z"/>
    <path d="M12 1.3 14.6 2.2v2.6c0 1.7-1.3 2.8-2.6 3.3-1.3-.5-2.6-1.6-2.6-3.3V2.2L12 1.3Z"/>
    <path d="M4 8.4 6.6 9.3v2.6c0 1.7-1.3 2.8-2.6 3.3-1.3-.5-2.6-1.6-2.6-3.3V9.3L4 8.4Z"/>
    <path d="M12 8.4 14.6 9.3v2.6c0 1.7-1.3 2.8-2.6 3.3-1.3-.5-2.6-1.6-2.6-3.3V9.3L12 8.4Z"/></g>`),

  // Prismatique — le prisme qui separe un trait en trois. Seul insigne qui
  // prend le spectre au lieu d'un aplat.
  prisme: SVG(`<path d="M7.4 2.6 13 12.6H1.8L7.4 2.6Z" ${TRAIT} stroke-width="1.6" stroke-linejoin="round"/>
    <g ${TRAIT} stroke-width="1.5">
      <path d="M.5 9.4h3.6"/>
      <path d="M11.4 8.2 15.6 6.2"/><path d="M12.2 10.1 15.8 9.7"/><path d="M13 12 15.5 13.2"/></g>`),
};

/* encodeURIComponent plutot qu'un echappement a la main : le `#` des couleurs et
   les chevrons cassent une data-URI, et une table de douze glyphes est douze
   occasions d'en oublier un. */
const masqueDe = (nom) => {
  const svg = INSIGNES[nom];
  return svg ? `url("data:image/svg+xml,${encodeURIComponent(svg)}")` : "none";
};

const ATTRS = ["fond", "bordure", "ornement", "lueur", "palier"];
const VARS = ["--cadre", "--cadre-2", "--cadre-insigne", "--cadre-spectre"];

/* LE POINT DE PASSAGE UNIQUE du cadre a l'ecran.

   `portee` vaut "plaque" (salon, apercu — tout) ou "ligne" (tableau de bilan,
   ou le <td> porte deja la couleur de CLASSE en texte : un fond entrerait en
   concurrence avec elle). C'est UNE regle ecrite une fois, pas douze exceptions
   dans la table.

   Toujours nettoyer d'abord : les lignes de salon se reconstruisent, mais
   `.cadreApercu` et `td.name` peuvent se voir reattribuer un autre cadre. */
export function appliquerCadre(el, id, portee = "plaque") {
  if (!el) return;
  for (const a of ATTRS) el.removeAttribute(`data-cadre-${a}`);
  for (const v of VARS) el.style.removeProperty(v);

  const peau = CADRE_SKIN[id];
  el.classList.toggle("cadre", !!peau);
  if (!peau) return;

  el.dataset.cadrePalier = String(peau.palier);
  el.dataset.cadreBordure = peau.bordure;
  el.dataset.cadreOrnement = peau.ornement;
  el.dataset.cadreLueur = peau.lueur;
  el.dataset.cadreFond = portee === "ligne" ? "aucun" : peau.fond;

  el.style.setProperty("--cadre", peau.teinte);
  el.style.setProperty("--cadre-2", cadreAccent(peau.teinte));
  el.style.setProperty("--cadre-insigne", masqueDe(peau.insigne));
  if (peau.spectre) el.style.setProperty("--cadre-spectre", peau.spectre.join(","));
}
