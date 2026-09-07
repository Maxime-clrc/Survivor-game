/* ===========================================================================
   LE HARNAIS DOM DE PAPIER.

   NEUF VERIFICATEURS DE RENDU ETAIENT ECRITS, EXPORTES, ET APPELES PAR PERSONNE.
   `verifierZones`, `verifierTraces`, `verifierBlocs`, `verifierLed`, `verifierAmers`,
   `verifierBaies`, `verifierFonds`, `verifierMatiere` et `verifierDangers` vivent
   dans `public/render/*`, qui importe `stage.js`, donc le DOM — et `verif.js` y
   renoncait pour cette seule raison. C est exactement le defaut que `verif.js`
   existe pour fermer, sous une autre forme : l ABSENCE d appel.

   IL NE DESSINE RIEN, IL CHARGE. Un canvas de papier suffit : ces verificateurs
   croisent des TABLES, ils ne peignent pas. Et LE CHARGEMENT LUI-MEME EST UN
   CRITERE — `node --check` ne voit qu une syntaxe, alors que ce qui casse un
   module de rendu est une table qui reference un identifiant absent, et ca ne se
   leve qu a l EVALUATION. Les cinq modules de rendu que la carte composee a
   touches sont passes par la avant d etre livres.

   TOUT CE QUI EST STUBBE L EST EN `??=` : un appelant qui a deja pose son propre
   faux DOM garde le sien.
   =========================================================================== */
import { registerHooks } from "node:module";

// LA RACINE DU DEPOT, pas un chemin ecrit : ce fichier vit a cote de `verif.js`.
const RACINE = new URL("./", import.meta.url);

const c2d = new Proxy({}, {
  get: (t, k) => {
    if (k === "canvas") return { width: 2, height: 2 };
    if (k === "measureText") return () => ({ width: 10 });
    if (k === "createLinearGradient" || k === "createRadialGradient") {
      return () => ({ addColorStop() {} });
    }
    if (k === "createPattern") return () => ({ setTransform() {} });
    if (k === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
    /* UNE VRAIE IMAGEDATA, ET C EST LE MASQUE DE FONDU QUI L EXIGE. Le proxy rend
       une FONCTION pour toute clef inconnue : `img.data.fill(255)` levait donc un
       TypeError des que `drawFloor` avait deux regions en vue — c est-a-dire
       partout ou ce lot agit. */
    if (k === "createImageData") {
      return (w, h) => ({ width: w, height: h,
                          data: new Uint8ClampedArray(Math.max(4, (w | 0) * (h | 0) * 4)) });
    }
    if (k === "getTransform") return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    if (typeof k === "string" && (k === "fillStyle" || k === "strokeStyle"
      || k === "globalAlpha" || k === "lineWidth" || k === "font"
      || k === "globalCompositeOperation" || k === "textAlign" || k === "lineCap"
      || k === "lineJoin" || k === "filter" || k === "textBaseline"
      || k === "shadowBlur" || k === "shadowColor" || k === "imageSmoothingEnabled"
      || k === "miterLimit" || k === "lineDashOffset")) return "";
    return () => c2d;
  },
  set: () => true,
});

const noeud = () => ({
  getContext: () => c2d,
  getBoundingClientRect: () => ({ width: 1600, height: 900, left: 0, top: 0 }),
  style: new Proxy({}, { get: () => () => {}, set: () => true }),
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  dataset: {}, children: [], childNodes: [],
  addEventListener() {}, removeEventListener() {},
  appendChild(x) { return x; }, removeChild(x) { return x; }, remove() {},
  insertBefore(x) { return x; }, setAttribute() {}, removeAttribute() {},
  append() {}, prepend() {}, replaceChildren() {}, after() {}, before() {},
  getAttribute: () => null, hasAttribute: () => false, closest: () => null,
  scrollIntoView() {}, animate: () => ({ finished: Promise.resolve(), cancel() {} }),
  querySelector: () => noeud(), querySelectorAll: () => [],
  cloneNode: () => noeud(), focus() {}, blur() {}, click() {},
  width: 1600, height: 900, textContent: "", innerHTML: "", value: "",
  parentNode: null, offsetWidth: 100, offsetHeight: 100,
  get firstChild() { return noeud(); },
  get firstElementChild() { return noeud(); },
  get lastElementChild() { return noeud(); },
});

globalThis.window ??= globalThis;
globalThis.self ??= globalThis;
globalThis.location ??= { href: "http://localhost/", protocol: "http:",
                          host: "localhost", search: "", hash: "", pathname: "/" };
globalThis.navigator ??= { userAgent: "node", language: "fr" };
globalThis.devicePixelRatio ??= 1;
globalThis.performance ??= { now: () => 0 };
globalThis.requestAnimationFrame ??= () => 0;
globalThis.cancelAnimationFrame ??= () => {};
globalThis.addEventListener ??= () => {};
globalThis.removeEventListener ??= () => {};
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.getComputedStyle ??= () => ({ getPropertyValue: () => "0px",
  width: "100px", height: "100px", fontSize: "14px", color: "#fff" });
globalThis.MutationObserver ??= class { observe() {} disconnect() {} };
globalThis.ResizeObserver ??= class { observe() {} disconnect() {} };
globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} };
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {} });
globalThis.AudioContext ??= class {
  createGain() { return { connect() {}, gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} } }; }
};
globalThis.Image ??= class { set src(_) {} };
globalThis.WebSocket ??= class { send() {} close() {} addEventListener() {} };
globalThis.document ??= {
  createElement: noeud, createElementNS: noeud, createTextNode: () => ({}),
  documentElement: noeud(), body: noeud(), head: noeud(),
  getElementById: noeud, querySelector: noeud, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, fonts: { ready: Promise.resolve() },
  readyState: "complete", visibilityState: "visible",
};

registerHooks({
  resolve(spec, ctx, suivant) {
    if (!spec.startsWith("/")) return suivant(spec, ctx);
    const rel = spec.slice(1);
    return { url: new URL(rel.startsWith("shared/") ? rel : "public/" + rel, RACINE).href,
             shortCircuit: true };
  },
});

export async function charger(chemin) {
  return import(new URL(chemin, RACINE).href);
}
