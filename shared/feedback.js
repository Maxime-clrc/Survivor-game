/* ===========================================================================
   LA FICHE DE RETOUR DU COMBAT. Module pur, sur le modele de `palette.js` et
   `units.js` : il ne depend de RIEN et ne connait ni le DOM ni le reseau.

   Deux tables, une seule question : ce qu'une ARME dit en partant, ce qu'une
   CREATURE dit en mourant. Les deux se DEDUISENT d'un champ de mecanique et
   nomment une recette d'`audio.js` — c'est ce qui permet a `verifierFeedback()`
   de croiser tout le vocabulaire sonore du combat en une passe.

   Ce qu'une arme VAUT vit dans `armes.js`. Ce qu'elle DIT vit ici, et les deux
   ne se recopient jamais : la famille se DEDUIT des champs de mecanique, comme
   `silhouetteArme()` deduit la forme du projectile et `canonEffet()` ce qu'un
   canon en plus ajoute. Une onzieme arme herite donc d'un retour coherent sans
   qu'on ajoute une ligne de table.

   TROIS FAMILLES NE SONNENT PAS AU DEPART, et c'est une decision, pas un oubli :
   leur delivrance porte deja le son. Le faisceau est une BOUCLE (`startFaisceau`),
   l'arc du tesla sonne par l'effet 3 (`foudre`), le balayage de la lame par
   l'effet 17. Leur donner en plus un son de depart le doublerait.
   =========================================================================== */

export const FAM_BALISTIQUE = "balistique";
export const FAM_DISPERSION = "dispersion";
export const FAM_RAIL       = "rail";
export const FAM_EXPLOSIF   = "explosif";
export const FAM_OBUS       = "obus";
export const FAM_FAISCEAU   = "faisceau";
export const FAM_ELECTRIQUE = "electrique";
export const FAM_LAME       = "lame";

export function familleDe(a) {
  if (!a) return FAM_BALISTIQUE;
  if (a.chaleur) return FAM_FAISCEAU;
  if (a.lame) return FAM_LAME;
  if (a.rebonds) return FAM_ELECTRIQUE;
  if (a.charge) return FAM_RAIL;
  if (a.plombs) return FAM_DISPERSION;
  // LOBEE ET DIRECTE NE SONNENT PAS PAREIL, et l'ecart ne peut pas venir du
  // poids : les deux saturent `POIDS_MAX`. Le depot les separe deja a l'image —
  // le baril de la grenade TOURNE, l'obus du siege vole DROIT — donc la seule
  // chose qui manquait etait la voix. `obus` passe avant `souffle`, qui les
  // couvre toutes les deux.
  if (a.obus) return FAM_OBUS;
  if (a.souffle) return FAM_EXPLOSIF;
  return FAM_BALISTIQUE;
}

/* `son` est le nom d'une recette d'`audio.js`, et il est aussi la CLE du
   limiteur de voix : quatre joueurs portant la meme famille se partagent une
   place, donc le nombre de voix ne bouge pas avec l'effectif.
   `jitter` est l'ecart de hauteur d'un tir a l'autre — c'est lui qui casse la
   repetition, pas quatre fichiers numerotes.

   `bouche` est la MATIERE du depart, et la FORME se lit sur la famille elle-meme
   plutot que sur un champ : deux endroits ou ecrire « c'est une gerbe » finissent
   par diverger. `null` aux memes trois familles, pour la meme raison qu'au son —
   leur depart existe deja et le doubler serait la meme faute deux fois. */
const BOUCHE = (long, large, vie, fumee, douille, etincelles) =>
  ({ long, large, vie, fumee, douille, etincelles });

export const FEEDBACK = {
  [FAM_BALISTIQUE]: { son: "tir",      jitter: 0.07,
                      bouche: BOUCHE(15, 8, 0.045, 0, 1, 2) },
  [FAM_DISPERSION]: { son: "tirGerbe", jitter: 0.05,
                      bouche: BOUCHE(20, 23, 0.075, 2, 1, 5) },
  [FAM_RAIL]:       { son: "tirRail",  jitter: 0.03,
                      bouche: BOUCHE(48, 5, 0.060, 0, 0, 3) },
  [FAM_EXPLOSIF]:   { son: "tirLourd", jitter: 0.05,
                      bouche: BOUCHE(12, 13, 0.065, 3, 0, 1) },
  [FAM_OBUS]:       { son: "tirObus",  jitter: 0.04,
                      bouche: BOUCHE(25, 16, 0.070, 2, 1, 3) },
  [FAM_FAISCEAU]:   { son: null,       jitter: 0, bouche: null },
  [FAM_ELECTRIQUE]: { son: null,       jitter: 0, bouche: null },
  [FAM_LAME]:       { son: null,       jitter: 0, bouche: null },
};

export const ficheDe = a => FEEDBACK[familleDe(a)];

/* LE POIDS D'UN COUP EST SA CADENCE, et il se releve au lieu de se declarer.
   C'est le budget de frequence de `RENDU.md` applique a l'arme plutot qu'a
   l'evenement : une arme qui part neuf fois par seconde ne peut pas payer le
   meme depart qu'une qui part une fois. La racine ecrase l'ecart — le rapport
   d'intervalle va de 1 a 9, celui du retour doit rester lisible.

   La saturation en haut est VOULUE : un fusil de precision a 0,55 s et un
   railgun a 0,95 s doivent tous deux se lire « lourd », et rien au-dela. */
export const POIDS_MIN = 0.3;
export const POIDS_MAX = 1.7;
const POIDS_REF = 0.16;
export function poids(a) {
  if (!a || !(a.interval > 0)) return POIDS_MIN;
  return Math.max(POIDS_MIN, Math.min(POIDS_MAX, Math.sqrt(a.interval / POIDS_REF)));
}

/* LE POIDS MODULE, LA FAMILLE DECIDE. Le multiplicateur reste faible a dessein :
   la famille porte deja l'ecart entre une gerbe et une aiguille, et l'echelle ne
   sert qu'a separer les armes DEDANS — trois seulement partagent une famille. Un
   facteur franc les aurait fait changer de famille a l'oeil. */
export const echelleBouche = a => 0.75 + 0.25 * poids(a);

/* CE QU'UNE CREATURE EST FAITE SE DEDUIT DE CE QU'ELLE FAIT. Aucun champ neuf
   dans le bestiaire : celle qui SE DIVISE est un sac, celles qui SOIGNENT ou
   PORTENT UNE AURA tiennent de l'energie, les autres ont une carapace.

   L'axe est la MATIERE, pas le metal contre l'organique : la charte dit que
   l'arene est une machine et que les monstres sont ce qui s'y est introduit. Il
   n'y a pas d'ennemi en tole a differencier.

   La table dit le COMPORTEMENT d'un fragment, pas sa case d'atlas : `fx_shard`
   et `fx_glow` sont assignes a la construction de l'atlas, donc ils se lisent a
   l'appel. Elle vit ICI et non a cote de `DEATH_BURST` parce que `son` doit
   pouvoir se croiser avec `audio.js` sans charger le rendu. */
export const MAT_CARAPACE = 0, MAT_ORGANIQUE = 1, MAT_ENERGIE = 2;

/* `touche` EST L'AUTRE MOITIE DE LA MEME QUESTION. La table disait ce qu'une
   creature fait en MOURANT ; ce qu'elle fait quand on la TOUCHE sortait d'une
   seule recette blanche, donc frapper un couvain et frapper un colosse rendait
   exactement la meme image. Le PALIER dit combien le coup a coute, la MATIERE
   dit a quoi il s'est heurte — deux axes, aucun ne redit l'autre, et l'identite
   de l'arme reste ou elle est : dans la bouche et dans la silhouette.

   AUCUNE PARTICULE DE PLUS : `PALIER` decide toujours du compte, du cone et de
   la vitesse ; la matiere ne fait que les plier. `debris` dit si quelque chose
   se DETACHE — un champ d'energie ne laisse pas de poussiere de beton. */
const TOUCHE = (eclat, teinte, vite, tenue, taille, freine, monte, gonfle, a0, debris) =>
  ({ eclat, teinte, vite, tenue, taille, freine, monte, gonfle, a0, debris });

export const MATIERE = [
  { spin: 14, grow: 0,  a0: 1,    drag: 0.90, son: "mort",
    touche: TOUCHE(0, 0, 1.00, 1.00, 1.00, 0.90,  0,  0, 1.00, 1) },
  { spin: 0,  grow: 30, a0: 0.70, drag: 0.80, son: "mortMou",
    touche: TOUCHE(1, 1, 0.55, 1.55, 1.45, 0.80,  0, 26, 0.80, 0) },
  { spin: 0,  grow: 0,  a0: 0.95, drag: 0.95, son: "mortEnergie",
    touche: TOUCHE(1, 1, 0.85, 1.30, 1.15, 0.94, 46,  0, 0.90, 0) },
];
export const matiereDe = d =>
  d?.splits ? MAT_ORGANIQUE
  : (d?.heal || d?.auraRadius || d?.egideRadius || d?.lienRange) ? MAT_ENERGIE
  : MAT_CARAPACE;

/* L'ACTE FINAL : CE QUE LA CREATURE TENAIT, ET QUI LA SURVIT D'UN INSTANT.

   La mort a deja ses quatre temps — trois images de depouille, l'eclat de type,
   la matiere, le flux d'XP. Ce qui manquait est la CONSEQUENCE : ce que le corps
   maintenait pour les autres ne s'arrete pas en silence.

   CINQ LIGNES DU BESTIAIRE SUR QUATORZE, et c'est la condition pour que ce soit
   un fait notable. Un acte de fermeture sur tous les types serait un evenement
   de palier 2 a 20-60 par seconde : ce n'est plus une information, c'est du
   bruit. Il se DEDUIT de ce que la creature tenait, exactement comme la matiere
   se deduit de ce qu'elle fait — aucun champ neuf dans le bestiaire.

   L'ordre compte : un relais n'a pas d'aura, un choeur n'a pas de lien, et seuls
   le colosse et le mini-boss passent le seuil de masse. Le rayon est
   celui du TYPE et non de l'instance : une elite ne change pas d'acte, elle joue
   le sien en plus gros. */
export const FIN_AUCUN = 0, FIN_ARC = 1, FIN_CHAMP = 2, FIN_MASSE = 3;
const FIN_MASSE_R = 20;
export const finalDe = d =>
  d?.lienRange ? FIN_ARC
  : (d?.auraRadius || d?.egideRadius) ? FIN_CHAMP
  : (d?.r ?? 0) >= FIN_MASSE_R ? FIN_MASSE
  : FIN_AUCUN;

/* Le RAYON que l'acte doit couvrir, et il est deja dans le bestiaire : le champ
   qu'on voyait tenir est celui qui se retracte, le lien celui qui se rompt. */
export const finalRayon = d =>
  d?.lienRange ?? d?.auraRadius ?? d?.egideRadius ?? (d?.r ?? 0) * 3;

/* CE QU'UN BONUS AU SOL DIT. Troisieme sujet du meme module, et la meme regle
   qu'aux deux autres : la FAMILLE porte la matiere, le TYPE porte la teinte.
   Treize disques identiques ne se separaient que par leur icone, or on ramasse
   un bonus en courant — l'icone est ce qu'on lit en dernier.

   Trois familles, parce qu'il y a trois choses qu'un bonus peut faire : rendre
   quelque chose au CORPS, armer le TIR pour un temps, poser quelque chose dans
   l'ARENE. Elle se declare, elle ne se deduit pas : `POWERUP_TYPES` est une liste
   de clefs et n'a aucun champ de mecanique d'ou tirer quoi que ce soit.

   `son` est aussi la CLE du limiteur — elle est la MEME pour les trois : un
   ramassage est un ramassage, l'identite ne se paie pas en voix. */
export const BON_SURVIE = 0, BON_ARME = 1, BON_TERRAIN = 2;

export const BONUS_FAM = {
  heal: BON_SURVIE, shield: BON_SURVIE, fragment: BON_SURVIE,
  purification: BON_SURVIE, beacon: BON_SURVIE,
  damage: BON_ARME, rate: BON_ARME, double: BON_ARME,
  pierce: BON_ARME, ricochet: BON_ARME,
  slow: BON_TERRAIN, nova: BON_TERRAIN, turret: BON_TERRAIN,
};

/* `cotes` = la forme du socle : 0 le disque, 6 l'hexagone, 4 le losange. Elle
   est ce qui se lit de loin, avant la teinte et bien avant l'icone. */
export const BONUS = [
  { cle: "survie",  cotes: 0, son: "bonusSurvie",  eclats: 8,  vite: 44 },
  { cle: "arme",    cotes: 6, son: "bonusArme",    eclats: 10, vite: 66 },
  { cle: "terrain", cotes: 4, son: "bonusTerrain", eclats: 9,  vite: 54 },
];

/* LE RANG DIT LA RARETE, et il ne se donne qu'a ce qui change une situation au
   lieu d'en ameliorer une : relever l'equipe, faucher l'ecran, laver les etats.
   Trois sur treize — un rang donne a la moitie du catalogue ne dit plus rien. */
export const BONUS_RANG = { beacon: 1, nova: 1, purification: 1 };

export const bonusFamille = cle => BONUS[BONUS_FAM[cle] ?? BON_SURVIE];
export const bonusRang = cle => BONUS_RANG[cle] ?? 0;

/* CE QU'UN BOSS DIT EN ARRIVANT, ET EN SE BRISANT. Quatrieme sujet du module, et
   la meme regle qu'aux trois autres : la voix se DEDUIT, elle ne se declare pas
   boss par boss. Onze boss partageaient UN son d'arrivee et UN son de rupture —
   c'etait le seul canal d'identite qui n'avait rien a lui.

   L'ARCHETYPE EST LA MATIERE. C'est deja ce qui separe les boss dans le depot :
   `ARCHETYPES` dit comment chacun DEFORME l'arene, et `verifierArchetypes()`
   refuse que deux boss de pool en partagent un. Deduire la voix de la se paie
   donc une seule fois : un dixieme boss de pool arrive avec sa voix.

   LES BARRES SONT L'ECHELLE. Trois finaux partagent « fixe » — le roster le
   permet, un seul sort par manche — mais ils n'ont pas le meme nombre de
   barres : 5 au Recitant, 6 au Silence, 8 a l'Amalgame. La hauteur descend et la
   duree monte avec, donc les onze arrivees se separent quand meme.

   UNE SEULE RECETTE, NEUF JEUX DE PARAMETRES. Neuf recettes ecrites a la main
   auraient neuf enveloppes a tenir d'accord ; ici la table porte les nombres et
   `audio.js` porte la forme, exactement comme `BOUCHE` pour les armes. */
const VOIX = (f0, f1, type, dur, harm, gainHarm, bruit, battement) =>
  ({ son: "bossVoix", f0, f1, type, dur, harm, gainHarm, bruit, battement });

export const BOSS_VOIX = {
  // il ne bouge pas et il REGARDE : une tenue mince, aucune matiere, l'harmonique
  // haute porte seule. C'est la seule voix sans bruit du jeu.
  guetteur:     VOIX(196, 196, "sine",     1.05, 1.50, 0.26, 0,    0),
  // il CONSTRUIT : creneau, marche descendante, du bruit median comme un moteur
  batisseur:    VOIX(110,  98, "square",   0.95, 2.00, 0.16, 0.22, 0),
  // plusieurs corps, un seul vrai : deux voix a un battement l'une de l'autre
  reflet:       VOIX(165, 165, "triangle", 1.00, 1.50, 0.18, 0.10, 1.03),
  // il occupe un bord et n'en bouge plus : grave tenu, harmonique a l'octave
  ancre:        VOIX( 87,  87, "sawtooth", 1.10, 2.00, 0.24, 0.16, 0),
  // l'espace diminue et ne revient pas : la voix DESCEND
  constricteur: VOIX(110,  73, "sawtooth", 1.00, 1.50, 0.22, 0.18, 0),
  // la horde est son corps : granuleux, un battement serre, du bruit haut
  diffus:       VOIX(131, 124, "triangle", 1.00, 1.50, 0.20, 0.26, 1.01),
  // l'equipe doit se diviser : deux voix a la QUINTE, franchement separees
  multiple:     VOIX(123, 123, "sawtooth", 1.00, 1.50, 0.20, 0.12, 1.50),
  // l'espace se deplace avec lui : la voix MONTE
  mobile:       VOIX( 82, 131, "sawtooth", 0.90, 1.50, 0.18, 0.14, 0),
  // l'espace est neutre : c'est la voix de reference, celle des trois finaux
  fixe:         VOIX( 98,  82, "sawtooth", 1.05, 1.50, 0.30, 0.24, 0),
};

export const BOSS_BARS_REF = 5;
const BOSS_ECHELLE_K = 0.35;

export const voixDe = def => BOSS_VOIX[def?.archetype] ?? BOSS_VOIX.fixe;

/* PLUS DE BARRES, PLUS BAS ET PLUS LONG. La racine ecrase l'ecart comme
   `poids()` le fait pour les armes : de 5 a 8 barres la hauteur ne perd que
   15 %, ce qui suffit a separer deux finaux sans faire de l'Amalgame un autre
   instrument. */
export const echelleBoss = def =>
  Math.pow(BOSS_BARS_REF / Math.max(1, def?.bars ?? BOSS_BARS_REF), BOSS_ECHELLE_K);

/* CE QUI NE LEVE RIEN : un nom de recette faux rend `playSound` a `false` et
   l'evenement devient MUET. C'est exactement la classe de bug que `CLAUDE.md`
   appelle « silence », et la seule facon de la voir est de croiser les tables
   avec ce qu'`audio.js` expose.

   Les tables et le bestiaire arrivent en ARGUMENT : ce module ne depend de rien
   et ne va pas commencer ici. Muet = tout va bien, comme `verifierBiomes()`. */
export function verifierFeedback(armes = [], types = [], recettes = [],
  bonusCles = [], boss = [], archetypes = null) {
  const soucis = [];
  const dispo = new Set(recettes);

  for (const [cle, v] of Object.entries(BOSS_VOIX)) {
    if (recettes.length && !dispo.has(v.son)) {
      soucis.push(`voix ${cle} : recette « ${v.son} » absente d'audio.js`);
    }
    if (!(v.f0 > 0) || !(v.f1 > 0)) soucis.push(`voix ${cle} : sans fondamentale`);
    if (!(v.dur > 0.5 && v.dur < 2)) soucis.push(`voix ${cle} : duree ${v.dur} hors bornes`);
    if (!(v.harm > 0)) soucis.push(`voix ${cle} : harmonique ${v.harm}`);
    if (!(v.bruit >= 0) || !(v.battement >= 0)) {
      soucis.push(`voix ${cle} : bruit ${v.bruit}, battement ${v.battement}`);
    }
  }
  // un archetype du jeu sans voix rendrait la voix de repli, donc DEUX boss
  // identiques a l'oreille sans que rien ne le dise.
  for (const cle of Object.keys(archetypes ?? {})) {
    if (!BOSS_VOIX[cle]) soucis.push(`archetype ${cle} : aucune voix`);
  }
  // et deux boss de POOL qui sonnent pareil sont le defaut que ce lot ferme :
  // meme matiere ET meme echelle.
  const vus = new Map();
  for (const b of boss) {
    const cle = `${b.archetype}|${b.bars ?? BOSS_BARS_REF}`;
    if (vus.has(cle)) soucis.push(`${b.key} et ${vus.get(cle)} : meme voix (${cle})`);
    else vus.set(cle, b.key);
  }

  for (const [cle, f] of Object.entries(FEEDBACK)) {
    // une famille a son depart ENTIER ou pas de depart du tout : une voix sans
    // bouche, ou l'inverse, est une famille livree a moitie.
    if ((f.son === null) !== (f.bouche === null)) {
      soucis.push(`${cle} : son et bouche ne s'accordent pas`);
    }
    if (f.son !== null && recettes.length && !dispo.has(f.son)) {
      soucis.push(`${cle} : recette « ${f.son} » absente d'audio.js`);
    }
    if (!f.bouche) continue;
    const b = f.bouche;
    for (const [champ, v] of Object.entries(b)) {
      if (!(v >= 0)) soucis.push(`${cle}.bouche.${champ} = ${v}`);
    }
    if (!(b.long > 0) || !(b.large > 0)) soucis.push(`${cle} : bouche sans forme`);
    if (!(b.vie > 0.02 && b.vie < 0.2)) soucis.push(`${cle} : vie ${b.vie} hors bornes`);
  }

  for (let i = 0; i < MATIERE.length; i++) {
    if (recettes.length && !dispo.has(MATIERE[i].son)) {
      soucis.push(`matiere ${i} : recette « ${MATIERE[i].son} » absente d'audio.js`);
    }
    const T = MATIERE[i].touche;
    if (!T) { soucis.push(`matiere ${i} : aucune touche`); continue; }
    for (const [champ, v] of Object.entries(T)) {
      if (!(v >= 0)) soucis.push(`matiere ${i}.touche.${champ} = ${v}`);
    }
    // une touche qui n'avance pas, ne dure pas ou n'a pas de corps n'est pas une
    // touche : c'est la seule facon de voir un zero pose par distraction
    if (!(T.vite > 0) || !(T.tenue > 0) || !(T.taille > 0)) {
      soucis.push(`matiere ${i} : touche sans corps`);
    }
    if (!(T.freine > 0 && T.freine <= 1)) soucis.push(`matiere ${i} : freine ${T.freine}`);
    if (!(T.a0 > 0 && T.a0 <= 1)) soucis.push(`matiere ${i} : a0 ${T.a0}`);
  }

  for (const a of armes) {
    const f = FEEDBACK[familleDe(a)];
    if (!f) { soucis.push(`${a.id} : famille inconnue`); continue; }
    const w = poids(a);
    if (!(w >= POIDS_MIN && w <= POIDS_MAX)) soucis.push(`${a.id} : poids ${w}`);
  }

  for (let i = 0; i < types.length; i++) {
    if (!MATIERE[matiereDe(types[i])]) soucis.push(`${types[i].key} : matiere inconnue`);
  }

  for (const f of BONUS) {
    if (recettes.length && !dispo.has(f.son)) {
      soucis.push(`bonus ${f.cle} : recette « ${f.son} » absente d'audio.js`);
    }
    if (!(f.eclats > 0) || !(f.vite > 0)) soucis.push(`bonus ${f.cle} : gerbe sans corps`);
  }
  if (recettes.length && !dispo.has("bonusNe")) {
    soucis.push("bonus : recette « bonusNe » absente d'audio.js");
  }
  for (const cle of bonusCles) {
    if (BONUS_FAM[cle] === undefined) soucis.push(`bonus ${cle} : sans famille`);
  }

  return soucis;
}
