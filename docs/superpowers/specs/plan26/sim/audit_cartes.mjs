// Rejouer depuis la racine du dépôt : node docs/superpowers/specs/plan26/../../../../sim/audit_cartes.mjs
// (ou copier a cote de shared/cards.js)
import { CARDS } from "../shared/cards.js";

console.log("Total cartes:", CARDS.length);

const byRarity = {};
for (const c of CARDS) byRarity[c.rarity ?? "?"] = (byRarity[c.rarity ?? "?"] || 0) + 1;
console.log("Par rarete:", byRarity);

const byTag = {};
for (const c of CARDS) for (const t of (c.tags || ["(sans tag)"])) byTag[t] = (byTag[t] || 0) + 1;
console.log("Par tag:", byTag);

const pureFlat = CARDS.filter(c =>
  /^[+\u2212-]\s?\d+\s?%[^,]*$/i.test((c.desc || "").split(",")[0]) &&
  !/tant que|sous |par |si |contre |apres|après/i.test(c.desc || "")
);
console.log("\n=== Candidats echelle verticale / filler (stat plate sans condition) ===");
for (const c of pureFlat) console.log(c.id.padEnd(24), "r" + c.rarity, (c.tags || []).join("/").padEnd(12), c.desc);

const cluster = CARDS.filter(c => /port[ée]e|vitesse des balles/i.test(c.desc || ""));
console.log("\n=== Cluster portee/vitesse balles ===");
for (const c of cluster) console.log(c.id.padEnd(24), "r" + c.rarity, c.desc);
