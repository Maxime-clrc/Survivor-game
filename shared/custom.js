/* ===========================================================================
   LE MODE CUSTOM — LA TABLE DES CONDITIONS. Module pur, sur le modele de
   `biomes.js` : il ne depend de RIEN, et surtout pas de `game_state.js`, qui
   l'importe.

   DES RANGS, PAS DES CURSEURS, et le modele est le Pacte de Chatiment de Hades :
   quinze conditions, la plupart a plusieurs rangs, chacun coutant de la Chaleur.
   Trois choses qu'un rang donne et qu'un curseur ne donne pas.

   UN INDICE DE SEVERITE QUI EXISTE SANS ETRE CALCULE — c'est la SOMME des couts.
   Plus honnete qu'un produit de multiplicateurs, parce qu'un cout ecrit a la main
   peut dire ce qu'un produit ne sait pas dire : qu'un rang est dur POUR CERTAINES
   BUILDS, ou qu'il change le jeu sans changer un chiffre.

   UN ESPACE FINI ET COMPARABLE — deux joueurs peuvent se dire « j'ai fait 24 ».

   DES PALIERS DEJA PENSES — un curseur invite a mettre 87 % parce que c'est
   possible ; un rang oblige a decider ce que veut dire chaque cran.

   LA TABLE EST DECLARATIVE, ET C'EST UN CRITERE : un rang ne porte que des
   NOMBRES sous des noms fixes, jamais de logique. Ce qui les applique vit
   ailleurs et ne connait pas les conditions une par une — sinon chaque nouvelle
   condition demanderait du code, et la table cesserait d'etre une table.

   L'AVERTISSEMENT QUE HADES DONNE LUI-MEME, ET IL VAUT DOUBLE ICI : beaucoup de
   conditions sont presque sans effet contre une build et extremement dures contre
   une autre. Avec DIX ARMES et TROIS CLASSES, « +25 % de vitesse ennemie » ne veut
   pas dire la meme chose pour un laser que pour un railgun. L'indice de severite
   est donc une APPROXIMATION, et il se presente comme telle. C'est aussi ce qui
   rend le mode utile a l'equilibrage : un mutateur dont la severite varie de trois
   a un selon l'arme EST un resultat de mesure.
   =========================================================================== */

export const CUSTOM_INDEX = 3;

/* LES CINQ FAMILLES. Elles ne servent qu'a ranger l'interface : rien dans le
   moteur ne les lit, et deux conditions de la meme famille ne s'excluent pas. */
export const FAMILLES = ["horde", "ennemis", "joueurs", "monde", "build"];

/* LE PLANCHER EST UN OU DEUX CRANS SOUS LA REFERENCE, PAS CINQ. Calme est deja a
   `hp 0,78`, `spawn 0,80`, `dmg 0,80` : descendre franchement en dessous ne
   produit plus une partie mais une demonstration. Les rangs negatifs existent,
   ils sont rares, et l'indice de severite passe sous zero — ce qui le dit. */

export const CONDITIONS = [
  {
    key: "densite", famille: "horde", nom: "Marée",
    resume: "ce que le script fait naître par seconde",
    rangs: [
      { cout: -2, mods: { spawn: 0.85 }, dit: "−15 % d'apparitions" },
      { cout: 2, mods: { spawn: 1.15 }, dit: "+15 % d'apparitions" },
      { cout: 2, mods: { spawn: 1.35 }, dit: "+35 % d'apparitions" },
      { cout: 3, mods: { spawn: 1.6 }, dit: "+60 % d'apparitions" },
    ],
  },
  {
    key: "plafond", famille: "horde", nom: "Cohue",
    resume: "combien de corps peuvent tenir à l'écran en même temps",
    rangs: [
      { cout: 2, mods: { cap: 1.15 }, dit: "+15 % de plafond de population" },
      { cout: 3, mods: { cap: 1.35 }, dit: "+35 % de plafond de population" },
    ],
  },
  {
    key: "elites", famille: "horde", nom: "Meute",
    resume: "à quelle cadence les élites arrivent",
    rangs: [
      { cout: 2, mods: { elite: 0.8 }, dit: "élites 25 % plus fréquentes" },
      { cout: 3, mods: { elite: 0.62 }, dit: "élites 60 % plus fréquentes" },
      { cout: 4, mods: { elite: 0.45 }, dit: "élites deux fois plus fréquentes" },
    ],
  },
  {
    key: "vitalite", famille: "ennemis", nom: "Carapace",
    resume: "les points de vie de la horde",
    rangs: [
      { cout: -2, mods: { hp: 0.85 }, dit: "−15 % de PV" },
      { cout: 2, mods: { hp: 1.2 }, dit: "+20 % de PV" },
      { cout: 3, mods: { hp: 1.45 }, dit: "+45 % de PV" },
      { cout: 4, mods: { hp: 1.75 }, dit: "+75 % de PV" },
    ],
  },
  {
    /* CHER, ET POUR UNE RAISON ECRITE : la vitesse est le mutateur dont l'effet
       depend le plus de l'arme portee. Une arme a cible unique et longue portee y
       perd tout, une arme de zone au contact n'y perd presque rien — donc il sera
       pris par ceux a qui il ne coute rien. */
    key: "vitesse", famille: "ennemis", nom: "Ruée",
    resume: "la vitesse de la horde — cher, parce que l'arme décide de son coût",
    rangs: [
      { cout: 3, mods: { speed: 1.12 }, dit: "+12 % de vitesse" },
      { cout: 4, mods: { speed: 1.25 }, dit: "+25 % de vitesse" },
    ],
  },
  {
    key: "frappe", famille: "ennemis", nom: "Morsure",
    resume: "ce qu'un coup de la horde retire",
    rangs: [
      { cout: 2, mods: { dmg: 1.25 }, dit: "+25 % de dégâts" },
      { cout: 3, mods: { dmg: 1.5 }, dit: "+50 % de dégâts" },
      { cout: 4, mods: { dmg: 2 }, dit: "dégâts doublés" },
    ],
  },
  {
    key: "fragilite", famille: "joueurs", nom: "Chair tendre",
    resume: "ce que vous encaissez, avant vos réductions",
    rangs: [
      { cout: 3, mods: { subis: 1.25 }, dit: "+25 % de dégâts subis" },
      { cout: 5, mods: { subis: 1.6 }, dit: "+60 % de dégâts subis" },
    ],
  },
  {
    key: "sursis", famille: "joueurs", nom: "Sursis court",
    resume: "combien de temps il faut pour relever, et avec quels PV",
    rangs: [
      { cout: 2, mods: { relever: 1.5, releveHp: 0.75 }, dit: "relevé 50 % plus long, 34 % des PV" },
      { cout: 3, mods: { relever: 2, releveHp: 0.5 }, dit: "relevé deux fois plus long, 22 % des PV" },
    ],
  },
  {
    key: "sol", famille: "monde", nom: "Terrain hostile",
    resume: "les dangers du lieu, et ce qu'ils coûtent",
    rangs: [
      { cout: 2, mods: { hasards: 1.35 }, dit: "dangers 35 % plus nombreux" },
      { cout: 3, mods: { hasards: 1.8 }, dit: "dangers 80 % plus nombreux" },
    ],
  },
  {
    key: "avarice", famille: "build", nom: "Avarice",
    resume: "à quelle vitesse les cartes arrivent",
    rangs: [
      { cout: -2, mods: { xp: 0.85 }, dit: "niveaux 15 % moins chers" },
      { cout: 3, mods: { xp: 1.15 }, dit: "niveaux 15 % plus chers" },
      { cout: 4, mods: { xp: 1.35 }, dit: "niveaux 35 % plus chers" },
    ],
  },
  {
    /* LE SCRIPT EST UNE CONDITION COMME LES AUTRES, et c'est la ligne qui
       multiplie par trois l'espace du mode : « courbe calme, ennemis de
       cauchemar » n'existe dans aucun des trois modes. */
    key: "script", famille: "build", nom: "Déroulé",
    resume: "la courbe de la manche : d'où ça vient, à quelle cadence",
    rangs: [
      { cout: -2, mods: { script: "calme" }, dit: "courbe calme" },
      { cout: 3, mods: { script: "cauchemar" }, dit: "courbe cauchemar" },
    ],
  },
];

export const conditionAt = key => CONDITIONS.find(c => c.key === key) ?? null;

/* L'INDICE DE SEVERITE EST UNE SOMME, ET RIEN D'AUTRE. `choix` est
   `{ clef: rang }`, le rang etant l'index dans `rangs` — jamais un objet
   d'effets : ce qui circule doit rester un entier, sinon le partage devient un
   format a valider et la table cesse d'etre la seule verite. */
export function severite(choix) {
  let n = 0;
  for (const [key, rang] of Object.entries(choix ?? {})) {
    const c = conditionAt(key);
    const r = c?.rangs?.[rang | 0];
    if (r) n += r.cout;
  }
  return n;
}

/* LES EFFETS D'UN CHOIX, FUSIONNES. Multiplicatif pour tout ce qui est un
   coefficient, remplacement pour ce qui est un nom (le script). Aucun cas
   particulier par condition : une condition de plus est une ligne de TABLE, pas
   une ligne de code. */
export function effetsDe(choix) {
  const out = {};
  for (const [key, rang] of Object.entries(choix ?? {})) {
    const c = conditionAt(key);
    const r = c?.rangs?.[rang | 0];
    if (!r) continue;
    for (const [k, v] of Object.entries(r.mods)) {
      if (typeof v === "string") out[k] = v;
      else out[k] = (out[k] ?? 1) * v;
    }
  }
  return out;
}

/* LE MODE EST CONSTRUIT AU LANCEMENT, ET IL APPARTIENT A LA SALLE. Ecrire dans
   `DIFFICULTIES[3]` serait exactement la panne que le plan 31 a corrigee pour le
   hasard : seize salles d'un meme processus se partageraient un objet, et deux
   customs simultanes se mentiraient l'un a l'autre. L'objet construit voyage donc
   par le constructeur de `GameState`, jamais par la table.

   RIEN D'AUTRE NE CHANGE DANS LA SIMULATION : elle lit une difficulte, elle ne
   demande pas d'ou elle vient. C'est ce qui rend le mode presque gratuit — et
   c'est aussi ce qui le rend dangereux, parce qu'une difficulte qui ment ne
   leverait rien. D'ou le critere : custom(normal) DOIT rendre normal. */
export function construireCustom(base, choix) {
  const e = effetsDe(choix);
  const d = {
    ...base,
    key: "custom",
    label: "sur mesure",
    custom: 1,
    rangs: { ...(choix ?? {}) },
    severite: severite(choix),
    script: typeof e.script === "string" ? e.script : base.script,
    hp: base.hp * (e.hp ?? 1),
    spawn: base.spawn * (e.spawn ?? 1),
    dmg: base.dmg * (e.dmg ?? 1),
    speed: base.speed * (e.speed ?? 1),
    boss: base.boss * (e.hp ?? 1),
    // ce qui n'existe pas dans les trois modes et que seul le custom lit
    cap: e.cap ?? 1,
    elite: e.elite ?? 1,
    subis: e.subis ?? 1,
    relever: e.relever ?? 1,
    releveHp: e.releveHp ?? 1,
    hasards: e.hasards ?? 1,
    xp: e.xp ?? 1,
  };
  return d;
}

// le pire choix possible : tous les rangs les plus chers de chaque condition.
export function choixMaximal() {
  const out = {};
  for (const c of CONDITIONS) {
    let best = 0;
    c.rangs.forEach((r, i) => { if (r.cout > c.rangs[best].cout) best = i; });
    out[c.key] = best;
  }
  return out;
}

/* CRITERE REJOUABLE DE LA TABLE. Trois choses, et la troisieme est celle qui
   protege le moteur : `MAX_ENEMIES_HARD_CAP` n'est pas un reglage de difficulte,
   c'est le point au-dela duquel le rendu et le reseau lachent — et l'echec y est
   SILENCIEUX. Le maximum global doit donc rester atteignable sans le depasser.
   Les deux bornes arrivent en ARGUMENT : ce module ne depend de rien, et surtout
   pas de celui qui l'importe. */
export function verifierConditions(hardCap, capBase, capDiffMax) {
  const soucis = [];
  const vues = new Set();

  for (const c of CONDITIONS) {
    if (vues.has(c.key)) soucis.push(`condition en double : ${c.key}`);
    vues.add(c.key);
    if (!FAMILLES.includes(c.famille)) {
      soucis.push(`${c.key} : famille inconnue « ${c.famille} »`);
    }
    if (c.rangs.length === 0) soucis.push(`${c.key} : aucun rang`);

    const vus = [];
    c.rangs.forEach((r, i) => {
      // UN RANG GRATUIT EST TOUJOURS PRIS : il n'est donc pas un choix.
      if (r.cout === 0) soucis.push(`${c.key} rang ${i} : cout nul`);
      if (!r.dit) soucis.push(`${c.key} rang ${i} : rien a afficher au joueur`);
      const signature = JSON.stringify(r.mods);
      if (Object.keys(r.mods).length === 0) {
        soucis.push(`${c.key} rang ${i} : aucun effet`);
      }
      if (vus.includes(signature)) {
        soucis.push(`${c.key} rang ${i} : effet identique a un rang precedent`);
      }
      vus.push(signature);
      for (const v of Object.values(r.mods)) {
        if (typeof v !== "number" && typeof v !== "string") {
          soucis.push(`${c.key} rang ${i} : un effet n'est ni un nombre ni un nom`
            + " — la table doit rester declarative");
        }
      }
    });

    // les rangs positifs se lisent de haut en bas : un cout qui redescend ferait
    // d'un rang plus dur un rang moins cher.
    const positifs = c.rangs.filter(r => r.cout > 0);
    for (let i = 1; i < positifs.length; i++) {
      if (positifs[i].cout < positifs[i - 1].cout) {
        soucis.push(`${c.key} : le cout redescend au rang ${i}`);
      }
    }
  }

  const pire = choixMaximal();
  const eff = effetsDe(pire);
  const cap = Math.round(capBase * capDiffMax * (eff.cap ?? 1));
  if (cap > hardCap) {
    soucis.push(`le choix maximal demande un plafond de ${cap} corps pour une`
      + ` limite MOTEUR de ${hardCap} — au-dela, le rendu et le reseau lachent,`
      + " et l'echec est silencieux");
  }
  if (severite(pire) < 20) {
    soucis.push(`le maximum de severite vaut ${severite(pire)} : l'espace du mode`
      + " est trop plat pour que deux reglages se comparent");
  }
  return soucis;
}
