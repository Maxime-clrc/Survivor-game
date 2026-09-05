import { t } from "./i18n.js";

/* LE LOOT — CE QU ON TROUVE, PAR OPPOSITION A CE QU ON CHOISIT.

   TROIS SOURCES DE PUISSANCE DE MANCHE EXISTAIENT, ET AUCUNE NE FAIT CA. La
   carte s offre a chaque niveau et FIGE la manche ; la relique s achete au
   marchand avec des eclats ; l arme se porte. Le loot, lui, TOMBE AU SOL a
   l endroit d un objectif rempli, et il faut passer dessus. C est la seule
   source de puissance qui coute un DEPLACEMENT.

   IL IGNORE `pickupRadius` ET `pickupRadiusMul`, ET C EST TOUT LE LOT. Un bonus
   se ramasse de loin, un loot de pres : le ramassage redevient un GESTE, et
   passer sur un point precis pendant qu une horde arrive est une prise de
   risque, donc une decision. Cette asymetrie doit se DIRE — socle plus petit,
   halo plus serre — sans quoi elle se lit comme un defaut.

   TROIS RANGS, ET LEUR NATURE CHANGE AVEC LE RANG. Le rang 1 est plat et
   cumulable : personne ne refuse +8 % de degats, c est du fond de panier. Le
   rang 2 est une CONVERSION avec contrepartie — c est ce qui rend un loot
   memorable. Le rang 3 est fort et sans contrepartie : sa rarete EST son prix.

   IL VOYAGE COMME UNE LISTE D IDENTIFIANTS, jamais comme des mods — c est deja
   le modele des cartes et des reliques, et le HUD rejoue `myMods` de son cote.

   IL NE VERSE JAMAIS D XP : l XP est le seul canal qui ne peut pas distinguer
   qui a pris le risque. */
export const LOOT_CFG = {
  /* PLUS PETIT QUE `POWERUP_RADIUS` (13), ET DANS LES DEUX CANAUX A LA FOIS :
     c est le rayon DESSINE et c est la portee de ramassage. L asymetrie « un
     bonus se prend de loin, un loot de pres » doit se voir avant d etre subie,
     sinon elle se lit comme un defaut de collision. */
  RAYON: 9,

  /* DES MINUTES, PAS DES SECONDES. `POWERUP_LIFE` vaut 22 s parce qu un bonus
     tombe tout seul et se remplace ; un loot est une recompense gagnee, et la
     faire expirer pendant qu on finit le combat qui l a produite serait la
     retirer deux fois. */
  VIE: 240,

  /* GENEREUX, ET C EST UNE REGLE, PAS UN REGLAGE : un loot qui n apparait pas
     parce que le sol est plein est un loot VOLE. Le plafond ne borne que le
     reseau et le rendu, il ne rationne jamais. */
  MAX_SOL: 24,

  // l ecart entre deux exemplaires d un meme choix : assez pour qu on ne les
  // prenne pas tous les deux d un pas, assez peu pour les voir ensemble.
  ECART: 78,

  // ce que la chance fait au loot : elle MONTE LE RANG, jamais la quantite.
  CHANCE_MAX: 0.5,

  /* LE TARIF DU LOOT DEFENSIF, ET IL PASSE PAR LA RARETE. Le defaut vient de
     `powerIndex` : il est purement offensif et remonte jusqu aux PV du boss,
     donc un loot OFFENSIF paie une partie de lui-meme en grossissant la cible,
     tandis qu un loot DEFENSIF est entierement gratuit. Avec plusieurs loots par
     manche et des joueurs qui apprennent, l optimum devient « tout defensif » :
     ce n est pas un choix, c est un tarif.
     LA RARETE PLUTOT QUE LA VALEUR, parce qu elle laisse au loot defensif sa
     valeur de TROUVAILLE quand il tombe, au lieu d en faire une version tiede de
     l offensif — le meme objet, moins souvent, contre un objet moins bon.
     LA MAGNITUDE EST PROVISOIRE ET C EST ECRIT : aucun bot ne sait exprimer
     l optimum « tout defensif », donc seul le compte rendu de vraies manches
     (plan 32) peut la regler. Ce qui est acquis ici est le LEVIER et son sens. */
  POIDS_DEF: 0.7,

  /* LE POSEUR NE PEUT PAS LE REPRENDRE TOUT DE SUITE. Il se tient dessus : sans
     ce delai, reposer et reprendre seraient la meme image, et le geste
     n existerait pas. Les autres peuvent le prendre immediatement. */
  REPRISE: 4,
};

export const LOOT_RANGS = 3;

/* CE QU UN LOOT AUGMENTE, ET IL FAUT LE VOIR AVANT DE MARCHER DESSUS. Au sol il
   ne portait que son RANG — un a trois points blancs — et sa couleur etait celle
   de son PROPRIETAIRE : deux informations utiles, aucune sur ce qu il fait. Or le
   loot est la seule source de puissance qui coute un DEPLACEMENT, donc la seule
   ou le joueur doit decider AVANT de l avoir.

   UNE CLEF DE SIGNE, PAS UN GLYPHE : `loot.js` est du domaine partage et ne
   dessine rien. La table de dessin vit dans `public/icons.js`, et
   `verifierLoot` n exige ici qu une clef de la liste FERMEE ci-dessous — une
   faute de frappe rendrait le socle muet sans rien lever, exactement le piege
   que les noms de son ont deja paye. */
export const LOOT_SIGNES = new Set([
  "degats", "cadence", "critique", "armure", "vitesse", "rarete",
  "esquive", "zone", "vol",
]);

/* LE CATALOGUE. `LOOTS` EST ORDONNE ET SON INDEX CIRCULE SUR LE RESEAU :
   append-only, comme `CARDS` et `RELICS`. */
export const LOOTS = [
  // --- rang 1 : plat, cumulable, aucune decision -------------------------
  { id: "oeil", rang: 1, nom: "Œil de visée", axe: "off", signe: "degats",
    desc: "+8 % de dégâts",
    apply: m => { m.damageMul *= 1.08; } },
  { id: "ressort", rang: 1, nom: "Ressort de culasse", axe: "off", signe: "cadence",
    desc: "+6 % de cadence",
    apply: m => { m.fireIntervalMul *= 0.94; } },
  { id: "lentille", rang: 1, nom: "Lentille", axe: "off", signe: "critique",
    desc: "+6 % de chance de critique",
    apply: m => { m.critChance += 0.06; } },
  { id: "plaque_de_champ", rang: 1, nom: "Plaque de champ", axe: "def", signe: "armure",
    desc: "−4 dégâts sur chaque coup reçu",
    apply: m => { m.armure += 4; } },
  { id: "semelle", rang: 1, nom: "Semelle", axe: "mob", signe: "vitesse",
    desc: "+6 % de vitesse",
    apply: m => { m.speedMul *= 1.06; } },
  { id: "filtre", rang: 1, nom: "Filtre de tri", axe: "eco", signe: "rarete",
    desc: "+10 % de rareté sur ce que vous trouvez",
    apply: m => { m.chance += 0.10; } },

  // --- rang 2 : une conversion, et elle COUTE ----------------------------
  { id: "fournaise", rang: 2, nom: "Fournaise", axe: "off", cout: 1, signe: "degats",
    desc: "+22 % de dégâts, −12 % de PV max",
    apply: m => { m.damageMul *= 1.22; m.maxHpMul *= 0.88; } },
  { id: "carapace", rang: 2, nom: "Carapace lestée", axe: "def", cout: 1, signe: "armure",
    desc: "−18 % de dégâts subis, −10 % de dégâts",
    apply: m => { m.damageTakenMul *= 0.82; m.damageMul *= 0.90; } },
  { id: "voile", rang: 2, nom: "Voile", axe: "def", cout: 1, signe: "esquive",
    desc: "+12 % d'esquive, −15 % de PV max",
    apply: m => { m.esquive += 0.12; m.maxHpMul *= 0.85; } },
  { id: "surcharge", rang: 2, nom: "Surcharge", axe: "off", cout: 1, signe: "cadence",
    desc: "+18 % de cadence, +18 % de dégâts subis",
    apply: m => { m.fireIntervalMul *= 0.82; m.damageTakenMul *= 1.18; } },
  { id: "dilatation", rang: 2, nom: "Dilatation", axe: "off", cout: 1, signe: "zone",
    desc: "+25 % de zone, −12 % de dégâts",
    apply: m => { m.areaMul *= 1.25; m.damageMul *= 0.88; } },
  { id: "sangsue", rang: 2, nom: "Sangsue", axe: "def", cout: 1, signe: "vol",
    desc: "+5 % de vol de vie, −8 % de vitesse",
    apply: m => { m.lifesteal += 0.05; m.speedMul *= 0.92; } },

  // --- rang 3 : fort, et sa rarete EST son prix --------------------------
  { id: "noyau_chaud", rang: 3, nom: "Noyau chaud", axe: "off", signe: "degats",
    desc: "+18 % de dégâts et +10 % de cadence",
    apply: m => { m.damageMul *= 1.18; m.fireIntervalMul *= 0.90; } },
  { id: "egide_mobile", rang: 3, nom: "Égide mobile", axe: "def", signe: "esquive",
    desc: "+12 % d'esquive et −5 dégâts par coup",
    apply: m => { m.esquive += 0.12; m.armure += 5; } },
  { id: "prisme", rang: 3, nom: "Prisme", axe: "eco", signe: "rarete",
    desc: "+20 % de rareté et +10 % de chance de critique",
    apply: m => { m.chance += 0.20; m.critChance += 0.10; } },
  { id: "moteur", rang: 3, nom: "Moteur court", axe: "mob", signe: "vitesse",
    desc: "+14 % de vitesse et +14 % de zone",
    apply: m => { m.speedMul *= 1.14; m.areaMul *= 1.14; } },
];

export const LOOT_BY_ID = new Map(LOOTS.map(l => [l.id, l]));
export const lootAt = i => LOOTS[i] ?? null;
export const lootIndex = id => LOOTS.findIndex(l => l.id === id);

export const lootNom = id => t(`loot.${id}.nom`, LOOT_BY_ID.get(id)?.nom ?? id);
export const lootDesc = id => t(`loot.${id}.desc`, LOOT_BY_ID.get(id)?.desc ?? "");

/* LA CHANCE MONTE LE RANG, JAMAIS LA QUANTITE. C est la promesse du lot 03 —
   « elle agit sur la RARETE seule » — et c est ici qu elle se tient pour le
   loot. Plafonnee, sinon une build de chance transformerait tout objectif en
   rang 3 et le rang cesserait de vouloir dire quelque chose. */
export function rangTire(rang, chance, alea) {
  if (alea() < Math.min(LOOT_CFG.CHANCE_MAX, Math.max(0, chance))) {
    return Math.min(LOOT_RANGS, rang + 1);
  }
  return rang;
}

// le poids d un objet dans son rang : la DEFENSE tombe moins souvent, et c est
// le seul tarif du systeme — voir `POIDS_DEF`.
export const poidsLoot = l => (l.axe === "def" ? LOOT_CFG.POIDS_DEF : 1);

/* LE TIRAGE. `exclus` evite de proposer deux fois le meme objet dans le meme
   choix : deux exemplaires identiques ne sont pas un choix. */
export function tirerLoot(rang, alea, exclus = null) {
  let pool = LOOTS.filter(l => l.rang === rang && !(exclus && exclus.has(l.id)));
  if (pool.length === 0) pool = LOOTS.filter(l => l.rang === rang);
  if (pool.length === 0) pool = LOOTS;
  let total = 0;
  for (const l of pool) total += poidsLoot(l);
  let roll = alea() * total;
  for (const l of pool) {
    roll -= poidsLoot(l);
    if (roll <= 0) return l;
  }
  return pool[pool.length - 1];
}

/* L APPLICATION, ET ELLE S INSERE ENTRE LA META ET LES RELIQUES.

   `maxHpMul` EST POSE ET LU ICI, ET IL EST UNE PART. Les conversions de rang 2
   qui prennent des PV le font en pourcentage et jamais en points : un cout plat
   serait ecrasant a la premiere minute et invisible a la trentieme,
   c est-a-dire l inverse de ce qu on demande a une contrepartie. Le plafond de
   PV reste le DERNIER mot — il passe apres les reliques. */
export function appliquerLoot(mods, maxHp, ids) {
  if (!ids || ids.length === 0) return { mods, maxHp };
  for (const id of ids) LOOT_BY_ID.get(id)?.apply(mods);
  const mul = mods.maxHpMul ?? 1;
  return { mods, maxHp: mul === 1 ? maxHp : Math.max(1, maxHp * mul) };
}

/* CRITERE REJOUABLE. Muet = tout va bien.

   UN `apply` QUI ECRIT UNE CLEF ABSENTE DE `defaultMods()` NE LEVE RIEN : la
   clef apparait, personne ne la lit, et le loot devient un objet DECORATIF que
   le joueur croit avoir gagne. On MESURE les clefs avant et apres au lieu de
   tenir une seconde liste, qui pourrirait au premier ajout. */
export function verifierLoot(defaut) {
  const soucis = [];
  const ids = new Set();
  const parRang = new Array(LOOT_RANGS + 1).fill(0);
  const connues = new Set(Object.keys(defaut()));

  for (const l of LOOTS) {
    if (ids.has(l.id)) soucis.push(`${l.id} : identifiant en double`);
    ids.add(l.id);
    if (!l.nom) soucis.push(`${l.id} : sans nom`);
    if (!l.desc) soucis.push(`${l.id} : sans description`);
    if (!(l.rang >= 1 && l.rang <= LOOT_RANGS)) {
      soucis.push(`${l.id} : rang ${l.rang} hors des ${LOOT_RANGS} rangs`);
      continue;
    }
    parRang[l.rang]++;

    const m = defaut();
    const avant = new Map(Object.entries(m));
    l.apply(m);
    let touche = 0;
    for (const [k, v] of Object.entries(m)) {
      if (!connues.has(k)) {
        soucis.push(`${l.id} : ecrit « ${k} », que personne ne lit`);
        continue;
      }
      if (avant.get(k) !== v) touche++;
    }
    if (touche === 0) soucis.push(`${l.id} : ne change aucune statistique`);

    /* LE RANG 2 EST UNE CONVERSION, DONC IL COUTE. Un rang 2 sans contrepartie
       serait un rang 3 mal range, et le joueur apprendrait que « dangereux » ne
       veut rien dire. */
    if (l.rang === 2 && !l.cout) soucis.push(`${l.id} : rang 2 sans contrepartie`);
    if (l.rang !== 2 && l.cout) soucis.push(`${l.id} : contrepartie hors du rang 2`);

    /* UN LOOT SANS SIGNE EST UN SOCLE MUET, et rien ne le leve : le rendu
       replie sur les points de rang et le joueur ne voit plus ce que l objet
       augmente — c est-a-dire l etat d avant ce lot, pour cette fiche-la
       seulement, donc invisible a la relecture. */
    if (!l.signe) soucis.push(`${l.id} : aucun signe`);
    else if (!LOOT_SIGNES.has(l.signe)) {
      soucis.push(`${l.id} : signe « ${l.signe} » hors de la liste fermee`);
    }
    if (!["off", "def", "mob", "eco"].includes(l.axe)) {
      soucis.push(`${l.id} : axe « ${l.axe} » inconnu`);
    }
  }

  // chaque rang doit pouvoir offrir un choix de deux sans doublon
  for (let r = 1; r <= LOOT_RANGS; r++) {
    if (parRang[r] < 3) soucis.push(`rang ${r} : ${parRang[r]} objets, il en faut 3`);
  }

  /* LE TARIF DEFENSIF DOIT MORDRE, ET IL DOIT MORDRE PARTOUT. Un rang sans
     aucun objet defensif rendrait le tarif muet pour ce rang, et le joueur
     apprendrait que la defense se paie a un palier et pas a l autre. */
  for (let r = 1; r <= LOOT_RANGS; r++) {
    const dedans = LOOTS.filter(l => l.rang === r);
    const def = dedans.filter(l => l.axe === "def");
    if (def.length === 0) { soucis.push(`rang ${r} : aucun objet defensif`); continue; }
    const total = dedans.reduce((s, l) => s + poidsLoot(l), 0);
    const partDef = def.reduce((s, l) => s + poidsLoot(l), 0) / total;
    const partPlate = def.length / dedans.length;
    if (!(partDef < partPlate - 1e-9)) {
      soucis.push(`rang ${r} : la defense tombe autant qu au tirage plat`
        + ` (${(100 * partDef).toFixed(1)} % contre ${(100 * partPlate).toFixed(1)} %)`);
    }
  }
  return soucis;
}
