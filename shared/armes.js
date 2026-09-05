import { nombre, t, tf } from "./i18n.js";
import { fmtM } from "./units.js";

/* Regles et invariants : docs/regles/CONTENU.md. */

export const ARME_CFG = {
  OFFRES: 3,
  RELANCES: 1,

  // canon d'assaut : la rampe est le dialogue permanent entre le danger qui
  // approche et le compteur qui monte. La RETOMBEE PROGRESSIVE est essentielle —
  // sans elle, esquiver une mecanique de boss couterait toute la puissance
  // accumulee et l'arme serait injouable sur les onze boss.
  // MESURE : le pilote ne tient la rampe que 39 % du temps, et payait 38 % de
  // survie pour 41 % de degats — le trajet etait perdant. 1,6 s rend une station
  // COURTE payante, ce qui est le geste que l arme doit enseigner.
  RAMPE_MONTEE: 1.6,
  RAMPE_CHUTE: 1.2,
  RAMPE_MAX: 2.0,
  RAMPE_SEUIL: 12,
  // LA RAMPE SE LIT DANS LES BALLES, plus seulement dans un anneau : la meme
  // jauge dit desormais les degats ET la gerbe. ~9 degres a rampe nulle.
  ASSAUT_DISPERSION: 0.16,

  // laser : la MEME ressource est un malus en horde et un bonus sur boss. Une
  // mecanique, deux lectures selon le contexte.
  CHALEUR_MONTEE: 1 / 4.2,
  // TIRER DANS LE VIDE ETAIT GRATUIT : la jauge ne montait que dans les moments
  // ou le joueur gagnait deja, donc jamais dans ceux ou il aurait appris qu'elle
  // existe. Le faisceau chauffe tant qu'il est ACTIF, plus lentement a vide.
  CHALEUR_MONTEE_VIDE: 1 / 7.0,
  CHALEUR_CHUTE: 1 / 2.6,
  CHALEUR_MUET: 1.5,
  CHALEUR_BONUS: 0.25,
  /* LE BONUS DE LA CHAMBRE THERMIQUE EST PLUS HAUT QUE CELUI DU LASER, et ce
     n est pas de la generosite. Le faisceau ne rate jamais et sature sa jauge
     tout seul : son +25 % est acquis. Une arme a coups discrets ne chauffe que
     si le joueur TIENT la gachette, et il doit la relacher avant la saturation
     — la jauge passe donc son temps a mi-course.
     La simulation du plan 26 mesure le prix de cet ecart : a +55 %, un joueur
     PARFAIT rendait 72,3 de DPS contre 75,0 en automatique, donc la carte
     etait strictement PIRE que de ne pas la prendre. A +70 % il repasse devant
     d environ 5 %, et l ecart parfait/moyen ne bouge presque pas — il tient au
     taux d occupation, pas au bonus final. On regle donc le PLANCHER ici. */
  CHALEUR_BONUS_MANUEL: 0.70,
  LASER_TICK: 0.1,
  // MESURE : a 18 px la nappe ne delivrait que 0,51 du nominal en horde — le
  // faisceau ne rate jamais SA cible, encore faut-il qu'il en rencontre
  LASER_LARGEUR: 22,

  // un rebond de base, le second s'achete ; saut local (220, pas 260)
  TESLA_REBONDS: 1,
  TESLA_PERTE: 0.30,
  // la distance de SAUT d'un rebond, pas la portee : celle-la vient de la table
  /* 220 -> 380 : LA DETTE DE LA LIGNE DE VUE, PAYEE SUR UN LEVIER MESURE. Borner
     l arc aux obstacles coute 0,16 de V au tesla ; le SAUT est le seul levier
     HORDE PURE — contre une cible unique l arc n a nulle part ou sauter, et `Db`
     reste a 74 pour TOUTES les valeurs essayees, la ou la portee le fait monter a
     89. Courbe monotone a 6 graines x 15 min : 220 -> -0,162, 300 -> -0,082,
     340 -> -0,074, 380 -> -0,022. Aucune des neuf autres armes ne bouge. */
  TESLA_SAUT: 380,
  // sans cette marge, « ca ne peut pas rater » devient « ca rate tout le temps »
  TESLA_ACCROCHE: 40,

  // lame : les PV sont INTRINSEQUES a l'arme, pas une carte. C'est ce qui la
  // rend jouable au contact des le premier choix, sans dependre d'un tirage.
  LAME_ARC: Math.PI * 0.6,
  LAME_HP: 0.40,
  LAME_MARQUE: 0.08,
  LAME_MARQUE_MAX: 5,
  LAME_MARQUE_TEMPS: 3,

  // le tir est automatique : la jauge est une horloge, pas une manipulation
  RAIL_CHARGE: 0.95,

  // siege : six obus puis une fenetre ou l'on ne rend rien. Le bouclier ne
  // supprime pas la vulnerabilite, il l'empeche d'etre letale — on encaisse
  // pendant qu'on recharge, on ne repond pas.
  SIEGE_CHARGEUR: 6,
  SIEGE_RECHARGE: 1.8,
  SIEGE_BOUCLIER: 20,
  SIEGE_GARDE: 3,
  // le souffle est une PART du direct, pas son jumeau : a valeur egale l'obus
  // comptait deux fois sur un meme corps, et le banc le mesurait a 2,0 x nominal
  SIEGE_SOUFFLE: 0.5,

  // dispersion : la balle unique se scinde a distance FIXE. C'est le seul
  // chiffre que le joueur doit apprendre — de pres le porteur seul touche, de
  // loin la gerbe s'est deja ecartee. Le porteur vaut deux plombs.
  DISP_SCISSION: 260,
  DISP_PORTEUR: 2,
  DISP_ARC: 0.80,
  // le 3/4 supprime la divergence : les plombs partent en faisceau parallele,
  // assez large pour couvrir un boss, trop etroit pour ratisser une horde
  DISP_DROITE: 44,

  // ce qu'un canon en plus ajoute a une arme a plombs
  CANON_PLOMBS: 2,

  // degats par seconde du sillon ; la duree est celle de toute brulure
  RAIL_SILLON: 14,
  PREC_FROID: 3,

  // prime de difficulte : ecart max 17 %, le tir standard reste a 1,00
  PRIME_D: 0.04,
  // la part de la gerbe qui porte sur une CIBLE UNIQUE : 110 % mesures au banc
  // pour 219 % de dps nominal, donc un plomb sur deux — voir `conversionBoss`
  DISP_GERBE: 0.50,
  TOLERANCE_V: 0.05,
  /* CE QUE LA MESURE SAIT RESOUDRE, ET C EST DEUX FOIS LA TOLERANCE. Le meme
     verificateur, rejoue a 3, 6 et 12 manches sur le MEME code, a rendu trois
     listes differentes : cinq armes, puis sept, puis cinq — et une seule arme
     commune aux trois series au-dela de 10 points d ecart. Toutes celles qui
     ENTRAIENT et SORTAIENT du rouge etaient a 5-9 points de leur cible.
     La tolerance dit ce qu on ACCEPTE ; la resolution dit ce que l instrument
     peut DISTINGUER, et les confondre fait rougir du bruit. Entre les deux, le
     verdict est une NOTE : « trop juste pour conclure a ce nombre de manches ».
     Le contrat `{ err, note }` existe deja pour exactement ca — `verifierBoss`
     comptait sept problemes la ou il y en avait cinq. */
  RESOLUTION_V: 0.10,
  // les boss sont un CINQUIEME du temps de manche
  PART_BOSS: 0.2,
  // taux de change deja equilibre entre PV et degats (`CONVERT_DMG_REF`) : on
  // ne tranche pas une valeur d'echange a la main, on reutilise celle qui l'est
  PV_PAR_DPS: 200,
};

/* Aucun coefficient sous 0,2 ; seuls `perforation` et `ricochet` ont droit au
   zero. Ce sont DEUX axes parce que `pierce` et `chain` sont deux cles de
   `mods` : un coefficient unique tuait le rebond du railgun avec sa perforation. */
const ECH = (degats, cadence, portee, zone, perforation, ricochet, critique) =>
  ({ degats, cadence, portee, zone, perforation, ricochet, critique });

/* Cinq exigences a 0 / 0,5 / 1, notees sur des MECANIQUES : « y a-t-il une jauge »
   a une reponse dans le code, donc la note se rejoue pour une onzieme arme. */
const EXIGE = (visee, anticipation, position, ressource, vulnerabilite) =>
  ({ visee, anticipation, position, ressource, vulnerabilite });

export const ARMES = [
  {
    id: "standard", nom: "Tir standard", tir: "balle",
    interval: 0.16, degats: 12, portee: 1.0,
    resume: "la reference : aucune contrainte, aucun avantage",
    exige: EXIGE(0.5, 0, 0, 0, 0),
    ech: ECH(1.0, 1.0, 1.0, 0.3, 1.0, 1.0, 1.0),
  },
  {
    id: "assaut", nom: "Canon d'assaut", tir: "balle", axe: "mouvement",
    // MESURE : la gerbe fait tomber V de 1,046 a 0,926 pour une cible qui monte
    // a 1,08. La compensation porte sur le NOMINAL, seul terme que la dispersion
    // n'ait pas touche — 6 -> 7 rend 1,08 au banc.
    interval: 0.11, degats: 7, portee: 0.8,
    rampe: true, famille: true,
    resume: "les dégâts montent tant que tu ne bouges pas, et retombent doucement",
    contrainte: "la rampe se perd en se déplaçant",
    // la visee monte de 0,5 a 1 avec la gerbe : il faut desormais CHOISIR entre
    // tirer et bouger, ce qui fait un axe de plus a piloter
    exige: EXIGE(1, 0, 1, 0.5, 0),
    ech: ECH(1.2, 1.1, 0.8, 0.2, 0.9, 0.9, 1.0),
  },
  {
    id: "laser", nom: "Canon laser", tir: "faisceau", axe: "ressource",
    // 77 m SORTAIENT DE L ECRAN A TOUS LES COUPS : la vue fait 1600 px, le
    // joueur en voit 800 devant lui, le faisceau en parcourait 1536. Une portee
    // dont on ne voit jamais la fin EST une portee illimitee. 43 m tombent juste
    // au-dela du demi-ecran : elle s'apprend en la voyant s'arreter.
    /* 75 -> 72, EN DEUX PASSES, ET LA PREMIERE A DEPASSE. Mesure a douze
       manches : 115 % delivre pour une cible de 106 %, et le laser est la seule
       arme rouge aux trois tailles d echantillon (3, 6 et 12) — ce n est pas du
       bruit. Le multiplicateur du releve donnait 69 ; a 69 il rendait 95 %, donc
       la reponse du faisceau N EST PAS LINEAIRE en degats : -8 % de degats ont
       coute -20 % de debit horde, parce qu un faisceau qui tue moins vite garde
       ses cibles devant lui plus longtemps. 72 est l interpolation des deux
       points mesures, pas une moyenne choisie. */
    interval: 0, degats: 72, portee: 0.9,
    chaleur: true, perforeTout: true, famille: true,
    resume: "un faisceau continu qui traverse une file entière et ne rate jamais",
    contrainte: "il chauffe, et se tait 1,5 s à saturation",
    exige: EXIGE(0, 0, 0, 1, 1),
    /* SA CADENCE ETAIT A 0,4 ET IL N EN LIT AUCUNE. `_faisceauInterne` avance sur
       `LASER_TICK` et ne touche jamais a `fireIntervalMul` : la seule arme a
       intervalle NUL n a pas d intervalle a raccourcir, ce que `litCadence` dit
       deja. Le coefficient promettait donc 40 % d un gain qui n arrive jamais —
       quatre cartes mortes dans son offre, et un `powerIndex` qui montait sans
       que rien ne monte. Zero est la seule valeur vraie, et c est la meme raison
       qui met deja la perforation et le ricochet a zero ailleurs. */
    ech: ECH(1.2, 0.0, 1.3, 0.2, 0.0, 0.0, 0.6),
  },
  {
    id: "tesla", nom: "Tesla", tir: "arc", axe: "visee",
    // MESURE : 1,40 delivre pour une cible de 1,02 — l ecart releve en 0.15.9
    // n avait jamais ete paye, et il tenait dans la portee et la cadence. Le
    // coup ne bouge pas : sur une arme qui enchaine, le levier est le rythme et
    // la distance. 34 m et 0,42 s rendent 0,99 (5 graines x 10 min).
    interval: 0.42, degats: 18.4, portee: 0.70,
    rebonds: true, critBase: 0, famille: true,
    resume: "un trait qui se disperse en arcs sur les corps voisins",
    contrainte: "aucun coup critique, et chaque saut perd 30 %",
    exige: EXIGE(0.5, 0, 0.5, 0, 0),
    ech: ECH(0.7, 1.2, 0.5, 1.2, 0.0, 0.0, 0.2),
  },
  {
    id: "lame", nom: "Lame tournoyante", tir: "arc_sol", axe: "distance",
    /* SON EXCES EST EN HORDE, DONC LA CORRECTION EST LE RAYON ET PAS LES DEGATS.
       Mesure a douze manches : 116 % delivre pour une cible de 102 %, mais son
       debit sur CIBLE UNIQUE etait deja au plancher (51 % du tir standard au
       banc, 53 % au modele, pour un plancher de 60 %). Baisser ses degats la
       faisait passer sous ce plancher — un balayage qui ne peut plus rien contre
       un boss n est plus une arme, c est un outil de nettoyage. Le rayon ne
       touche QUE la horde : 0,25 -> 0,227, soit l aire multipliee par 0,824. */
    interval: 0.40, degats: 13.2, portee: 0.227,
    // le rayon du balayage EST la portee de la table : 110 px etait un nombre
    // invente a cote d une colonne qui disait deja combien
    rayon: true,
    lame: true, hpBonus: ARME_CFG.LAME_HP, famille: true,
    resume: "un balayage qui touche tout autour de toi, et +40 % de PV max",
    contrainte: "portée nulle : il faut être au contact",
    exige: EXIGE(0, 0, 1, 0, 0),
    ech: ECH(1.3, 1.3, 0.2, 0.8, 0.0, 0.0, 1.0),
  },

  {
    id: "dispersion", nom: "Fusil à dispersion", tir: "balle", axe: "distance",
    famille: true,
    /* 6,2 -> 8,75, et c est la plus grosse correction du depot. Mesure a douze
       manches : 75 % delivre pour une cible de 106 %, soit 31 points sous sa
       cible — trois fois l ecart de n importe quelle autre arme, et le SEUL
       chiffre identique aux trois tailles d echantillon (0,30 / 0,30 / 0,308).
       Elle est faible partout, pas seulement sur la horde : 77 de debit sur
       cible unique contre 99 au tir standard. x1,410. */
    interval: 0.32, degats: 8.75, plombs: 6, portee: 0.5,
    scission: ARME_CFG.DISP_SCISSION, porteur: ARME_CFG.DISP_PORTEUR,
    resume: "une balle qui se scinde en six plombs à mi-portée",
    contrainte: "inoffensive de près, dispersée de loin",
    exige: EXIGE(0.5, 0.5, 1, 0, 0),
    ech: ECH(0.9, 0.8, 0.7, 0.6, 0.6, 0.6, 0.8),
  },
  {
    id: "railgun", nom: "Railgun", tir: "balle", axe: "ressource",
    // MESURE : 140 / 1,6 = 87,5 de dps nominal, contre 85,7 avant la charge —
    // le lot d'equilibrage repart donc du meme point.
    interval: ARME_CFG.RAIL_CHARGE, degats: 53, portee: 1.8, perforeTout: true,
    charge: true, famille: true,
    resume: "un rail qui traverse tout, et une charge qu'on voit venir",
    contrainte: "une charge avant chaque tir",
    exige: EXIGE(0.5, 1, 0, 0.5, 1),
    ech: ECH(1.5, 0.3, 1.5, 0.2, 0.0, 2.0, 1.4),
  },
  {
    id: "grenade", nom: "Lance-grenades", tir: "grenade", axe: "distance",
    famille: true,
    /* MESURE : x1,88 de survie et 1 063 kills contre 416 au tir standard. Ce
       n est pas son dps qui deborde (0,67 en cible unique), c est sa SURFACE —
       et `verifierArmes()` a refuse la premiere coupe, qui portait sur les
       degats et le faisait tomber a 53 % de la reference en cible unique. La
       coupe porte donc sur le RAYON, la ou le debordement se mesure. */
    interval: 0.80, degats: 50, portee: 0.9, souffle: 68,
    resume: "un projectile lent qui explose",
    contrainte: "il faut anticiper la trajectoire",
    exige: EXIGE(0.5, 1, 0, 0, 0),
    ech: ECH(1.1, 0.5, 0.8, 0.9, 0.0, 0.0, 0.6),
  },

  {
    id: "siege", nom: "Fusil de siège", tir: "balle", axe: "ressource",
    interval: 0.90, degats: 36, portee: 1.2,
    // UN OBUS FAIT LES DEUX : le direct puis le souffle. Il vole DROIT et vite,
    // la ou la grenade est lobee et lente ; il est consomme au contact, donc ni
    // perforation ni ricochet n'ont ou s'appliquer.
    souffle: 48, obus: true, souffleDmg: ARME_CFG.SIEGE_SOUFFLE,
    chargeur: ARME_CFG.SIEGE_CHARGEUR, recharge: ARME_CFG.SIEGE_RECHARGE,
    bouclier: ARME_CFG.SIEGE_BOUCLIER, rechargeGarde: ARME_CFG.SIEGE_GARDE,
    critBase: 0.15, famille: true,
    resume: "six obus explosifs, puis une recharge à couvert",
    contrainte: "1,8 s sans rien rendre tous les six tirs",
    exige: EXIGE(0.5, 0, 0, 0.5, 1),
    ech: ECH(1.4, 0.3, 1.1, 0.4, 0.0, 0.0, 1.3),
  },
  {
    id: "precision", nom: "Fusil de précision", tir: "balle", axe: "visee",
    interval: 0.55, degats: 28.5, portee: 2.2,
    perce: 2, critBase: 0.20, famille: true,
    resume: "un tir long qui traverse un ennemi, et qui critique souvent",
    contrainte: "cadence lente : chaque tir doit porter",
    // la zone tombe au PLANCHER et non a zero : un tir unique tire peu d'une
    // carte de rayon, mais le vol de vie et la brulure y passent encore
    exige: EXIGE(1, 0, 0.5, 0, 0.5),
    ech: ECH(1.5, 0.4, 1.6, 0.2, 1.4, 1.4, 1.4),
  },
];

export const ARME_BY_ID = new Map(ARMES.map(a => [a.id, a]));
export const ARME_DEFAUT = "standard";
export const armeAt = id => ARME_BY_ID.get(id) ?? ARME_BY_ID.get(ARME_DEFAUT);

export const armeNom = id => t(`arme.${id}.nom`, ARME_BY_ID.get(id)?.nom ?? id);
export const armeResume = id => t(`arme.${id}.resume`, ARME_BY_ID.get(id)?.resume ?? "");
export const armeContrainte = id =>
  ARME_BY_ID.get(id)?.contrainte
    ? t(`arme.${id}.contrainte`, ARME_BY_ID.get(id).contrainte)
    : "";

/* Ce que l'ecran de choix montre en clair : la fiche chiffree, composee des
   constantes et jamais recopiee. */
export function armeFiche(id) {
  const a = armeAt(id);
  const dps = a.interval > 0
    ? a.degats * (a.plombs ?? 1) / a.interval
    : a.degats;
  return {
    cadence: a.interval > 0
      ? tf("arme.fiche.interval", "{0} s entre deux tirs", { "0": nombre(a.interval) })
      : t("arme.fiche.continu", "tir continu"),
    degats: a.plombs
      ? tf("arme.fiche.plombs", "{0} × {1} dégâts", { "0": a.plombs, "1": a.degats })
      : tf("arme.fiche.degats", "{0} dégâts", { "0": a.degats }),
    dps: tf("arme.fiche.dps", "≈ {0} dégâts/s", { "0": Math.round(dps) }),
    portee: tf("arme.fiche.portee", "portée ×{0}", { "0": nombre(a.portee) }),
  };
}

/* La famille se DECLARE : deduite de « n'est pas le tir standard », elle se vide
   des qu'on ajoute une arme, et une famille declaree vide est pire qu'absente. */
export const FAMILLES_D_ARME = new Map(
  ARMES.filter(a => a.famille).map(a => [`arme_${a.id}`, a.id]));

export function familleDeArme(armeId) {
  return ARME_BY_ID.get(armeId)?.famille ? `arme_${armeId}` : null;
}

/* UN CANON EN PLUS N'AJOUTE PAS LA MEME CHOSE PARTOUT. Il n'etait lu que par la
   branche a balles unitaires, donc la carte etait un malus pur ailleurs — et
   retiree du pool, ce qui laissait cinq armes sans carte de projectile. Ce que
   chacune en fait se DEDUIT du tir, elle ne se declare pas a cote. Seule la lame
   n'a rien a multiplier : elle ne lance rien. */
export const canonEffet = a =>
  a.tir === "arc_sol" ? null
    : a.plombs ? "plombs"
    : a.tir === "balle" ? "balle"
    : a.tir;

export const litCanons = a => canonEffet(a) !== null;

/* CE QU'UNE ARME LIT DES BONUS AU SOL, et ce qu'elle n'en lit pas. Un bonus qui
   ne peut rien rendre a l'arme portee est un ramassage perdu, et rien ne le dit :
   la cadence d'un `interval` nul retombe sur le plancher, une balle qui traverse
   deja tout n'a pas de perforation a gagner, un obus consomme au contact n'a
   nulle part ou rebondir. `_contexteBonus()` s'en sert pour PONDERER le tirage,
   jamais pour l'interdire. */
export const litCadence = a => a.interval > 0;
export const litPerce = a => a.tir === "balle" && !a.perforeTout && !a.obus;
/* DEUX SENS DE « REBOND », ET ILS NE PARTAGENT AUCUNE LIGNE DE CODE.
   Ici c est le rebond SUR LE DECOR : `m.bounce` voyage sur la balle et se
   resout contre les bornes et les obstacles. Il n existe donc que pour une arme
   qui lance une balle, et pas pour un obus, qui est consomme au contact — pire,
   `bounce` le fait REBONDIR sur le mur au lieu d exploser, donc la carte lui
   retire son souffle.
   L autre sens est le rebond ENTRE CIBLES : `mods.chain` pour une balle,
   `ARME_CFG.TESLA_REBONDS` pour l arc. Le tesla porte le second et pas le
   premier — c est pour ca que son `ech.ricochet` est a zero alors qu il est
   l arme qui rebondit le plus. */
export const litRebond = a => a.tir === "balle" && !a.obus;

/* QUAND UN COEFFICIENT A ZERO EST UNE VERITE ET NON UN OUBLI. Une seule table,
   lue par `verifierArmes` : la capacite decide, jamais un nom d axe. */
const ZERO_LEGITIME = {
  perforation: a => !litPerce(a),
  /* MEME PREDICAT QUE `litRebond`, RAISON DIFFERENTE : le ricochet de l echelle
     est le rebond ENTRE CIBLES (`mods.chain`), pas sur le decor. Les deux
     exigent aujourd hui la meme chose — une balle qui SURVIT a son impact — donc
     une seule fonction ; une arme dont l obus ricocherait sans exploser les
     separerait, et c est le jour ou il faudra deux noms. */
  ricochet: a => !litRebond(a),
  cadence: a => !litCadence(a),
};

/* Ce que `extraBarrels` multiplie, arme par arme : `powerIndex()` et le panneau
   de stats lisent la MEME fonction que `_volley`, sinon les trois divergent. */
export function canonGain(a, extra) {
  if (!(extra > 0)) return 1;
  const e = canonEffet(a);
  if (e === null) return 1;
  if (e === "plombs") return (a.plombs + ARME_CFG.CANON_PLOMBS * extra) / a.plombs;
  return 1 + extra;
}

/* Point de passage unique de l'echelle. La cadence se rescale sur sa REDUCTION :
   `fireIntervalMul` descend quand la cadence monte, donc l'appliquer a la valeur
   brute inverserait le levier sur toute arme lente. */
export function appliquerEchelle(mods, armeId) {
  const a = ARME_BY_ID.get(armeId);
  if (!a || a.id === ARME_DEFAUT) return mods;
  const e = a.ech;

  mods.damageMul = 1 + (mods.damageMul - 1) * e.degats;
  mods.fireIntervalMul = 1 - (1 - mods.fireIntervalMul) * e.cadence;
  mods.bulletLifeMul = 1 + (mods.bulletLifeMul - 1) * e.portee;
  mods.areaMul = 1 + (mods.areaMul - 1) * e.zone;
  mods.pierce = Math.round(mods.pierce * e.perforation);
  mods.chain = Math.round(mods.chain * e.ricochet);

  const critBase = a.critBase ?? null;
  const socle = critBase === null ? mods.critBase : critBase;
  mods.critChance = Math.max(0, socle + (mods.critChance - mods.critBase) * e.critique);
  mods.critMul = 1 + (mods.critMul - 1) * e.critique;

  if (a.hpBonus) mods.maxHpRatio += a.hpBonus;
  // INTRINSEQUE a l'arme, pas une carte : sans reserve propre, « bouclier x3 »
  // ne vaudrait rien pour un chargement qui n'a pas pris de carte de bouclier
  if (a.bouclier) mods.shieldPool += a.bouclier;
  return mods;
}

/* Le rayon du balayage se deduit de la portee, mais un RAYON n est pas une
   PORTEE DE BALLE : un disque de 240 px balaye toutes les 0,4 s tient 2,04 fois
   plus longtemps que le tir standard, la ou 110 px n en tenait que 0,66. Le
   facteur est donc MESURE, pas suppose. */
export const LAME_UTILE = 0.65;
export const lameRayon = a => 640 * 1.5 * a.portee * LAME_UTILE;

export const difficulte = a =>
  Object.values(a.exige ?? {}).reduce((somme, v) => somme + v, 0);

/* La cible de CHAQUE arme depend de ce qu'elle exige. Fourchette reelle :
   0,95 a 1,17 — le tir standard a 1,00, personne au-dela de 1,17. */
export const cibleArme = a => 1 + ARME_CFG.PRIME_D * (difficulte(a) - 0.5);

/* La SURVIE qu'une arme donne, en part de DPS de reference. On ne tranche pas
   un taux de change a la main : c'est celui des cartes de conversion, deja
   equilibre — s'il est faux, il est faux partout, ce qui se corrige a un seul
   endroit. Le bouclier de recharge est pondere par la part du cycle qu'il
   couvre : trois fois la reserve pendant 1,8 s sur 6 s n'est pas trois fois la
   reserve. */
export function survieArme(a, hpClasse) {
  let pv = (a.hpBonus ?? 0) * hpClasse + (a.bouclier ?? 0);
  if (a.bouclier && a.chargeur) {
    const cycle = a.chargeur * a.interval + a.recharge;
    pv += a.bouclier * ((a.rechargeGarde ?? 1) - 1) * (a.recharge / cycle);
  }
  return pv / ARME_CFG.PV_PAR_DPS;
}

export const dpsBase = a =>
  a.interval > 0 ? a.degats * (a.plombs ?? 1) / a.interval : a.degats;

/* Ce qu'une arme rend CONTRE UNE CIBLE UNIQUE. Elle se CALCULE a partir de la
   mecanique. L'UPTIME n'y est PAS : terme a part du modele, l'inclure ici le
   compterait deux fois.
   MESURE au banc (boss fige, horde videe, critique coupe, 300 s, en part du tir
   standard) : standard 1,00 · assaut 0,98 · laser 1,18 · tesla 2,21 · lame 1,40
   · dispersion 1,01 · railgun 1,04 · grenade 1,04. */
export function conversionBoss(a) {
  if (a.rebonds) {
    // les arcs REVIENNENT sur la meme cible, avec la perte par rebond
    let k = 1, garde = 1;
    for (let i = 0; i < ARME_CFG.TESLA_REBONDS; i++) {
      garde *= 1 - ARME_CFG.TESLA_PERTE;
      k += garde;
    }
    return k;
  }
  /* UN OBUS FRAPPE DEUX FOIS LE MEME CORPS : le direct, puis un souffle qui
     couvre forcement la cible qu'il vient de toucher. `dpsBase` ne connait que
     le direct, donc sans cette ligne le siege se lit a 53 % de la reference en
     cible unique alors que le banc en mesure 80 %. */
  if (a.obus) return 1 + (a.souffleDmg ?? 1);
  // les coups repetes de la lame EMPILENT une marque
  if (a.lame) return 1 + ARME_CFG.LAME_MARQUE * ARME_CFG.LAME_MARQUE_MAX;
  /* LE FAISCEAU NE RATE JAMAIS, donc contre une cible unique la chaleur SATURE :
     le cycle va du plancher que le mutisme laisse jusqu'a 1, et le bonus se paie
     sur sa moyenne. La meme ressource est un malus en horde et un bonus sur boss. */
  if (a.chaleur) {
    const plancher = Math.max(0, 1 - ARME_CFG.CHALEUR_MUET * ARME_CFG.CHALEUR_CHUTE);
    return 1 + ((plancher + 1) / 2) * ARME_CFG.CHALEUR_BONUS;
  }
  /* LA GERBE NE MET PAS SES SIX PLOMBS DANS LE MEME CORPS, ET LE MODELE LE
     CROYAIT. `dpsBase` compte `degats x plombs`, donc il lisait la dispersion a
     219 % de la reference sur cible unique la ou le banc en mesure 110 %
     (`mesureArmeBoss` : 109,0 contre 98,7). La ligne d avant affirmait meme le
     contraire — « la gerbe couvre un boss a la scission sans depasser » — et
     c est ce que la mesure a dementi. Le terme est le rapport des deux : la
     moitie de la gerbe porte. Sans lui, le garde-fou du dps nominal refusait une
     arme que le banc trouve juste. */
  if ((a.plombs ?? 1) > 1) return ARME_CFG.DISP_GERBE;
  // les trois autres rendent 1, et c'est MESURE : la perforation du railgun n'a
  // rien a traverser sur un corps, et la rampe de l'assaut vaut autant en horde
  return 1;
}

/* Critere rejouable, sur le modele de `verifierBiomes()`. Le catalogue lui est
   PASSE et non importe : `cards.js` importe deja ce module, et le cycle inverse
   n'existe pas. Meme idiome que `verifierHautsFaits(cardIds, …)`. */
/* CE QUE CHAQUE ARME TIRE, FIGE. Une seconde source de verite est normalement
   le defaut a eviter ; ici elle est le TEST, et c est sa raison d etre. `tir`
   est le champ qui aiguille `_volleyInterne` : le changer sur une arme la fait
   basculer d une branche a l autre — d une balle a un arc, d un obus a une
   grenade — sans qu aucune erreur ne se leve, et les trois lecteurs qui en
   dependent (`canonEffet`, `litPerce`/`litRebond`, `ficheDe` d `feedback.js`)
   suivent en silence. Une arme NOUVELLE s ajoute ici en meme temps qu ailleurs :
   la table refuse aussi l arme qu elle ne connait pas. */
const TIR_FIGE = {
  standard: "balle", assaut: "balle", laser: "faisceau", tesla: "arc",
  lame: "arc_sol", dispersion: "balle", railgun: "balle", grenade: "grenade",
  siege: "balle", precision: "balle",
};

export function verifierArmes(cards = null, axesDeCarte = null) {
  const out = [];
  const vus = new Set();
  const AXES = ["degats", "cadence", "portee", "zone", "perforation", "ricochet", "critique"];

  for (const a of ARMES) {
    if (vus.has(a.id)) out.push(`${a.id} : identifiant en double`);
    vus.add(a.id);
    for (const k of AXES) {
      const v = a.ech?.[k];
      if (typeof v !== "number") { out.push(`${a.id} : coefficient « ${k} » absent`); continue; }
      // une carte a valeur nulle est un choix vide : un coefficient ne tombe a
      // zero que si l ARME n a pas la capacite — pas de projectile, donc ni file
      // a traverser ni corps ou rebondir ; pas d intervalle, donc pas de cadence
      // a raccourcir. L exemption se LIT sur la capacite au lieu de se declarer
      // par une liste de noms, sinon la prochaine arme la rouvre en silence.
      if (v === 0 && !ZERO_LEGITIME[k]?.(a)) out.push(`${a.id} : « ${k} » à zéro`);
      else if (v > 0 && v < 0.2) out.push(`${a.id} : « ${k} » sous 0,2 (${v})`);
    }
    for (const k of ["visee", "anticipation", "position", "ressource", "vulnerabilite"]) {
      const v = a.exige?.[k];
      if (v !== 0 && v !== 0.5 && v !== 1) out.push(`${a.id} : exigence « ${k} » absente ou hors barème`);
    }
    if (a.id !== ARME_DEFAUT && !a.axe) out.push(`${a.id} : aucun axe de gameplay`);
    if (a.id !== ARME_DEFAUT && !a.contrainte) out.push(`${a.id} : aucune contrainte`);
    if (!(a.degats > 0)) out.push(`${a.id} : dégâts nuls`);
    if (a.interval < 0) out.push(`${a.id} : intervalle négatif`);
    const fige = TIR_FIGE[a.id];
    if (fige === undefined) out.push(`${a.id} : absente de TIR_FIGE`);
    else if (fige !== a.tir) out.push(`${a.id} : tir « ${a.tir} » au lieu de « ${fige} »`);
  }

  /* LES BOSS SONT UN CINQUIEME DU TEMPS DE MANCHE, contre une CIBLE UNIQUE. Une
     arme qui saute entre les cibles n'a rien a sauter face a un boss — d'ou les
     conversions du plan, et d'ou ce garde-fou : aucune arme ne descend sous 60 %
     de la reference dans l'UN DES DEUX contextes. La conversion se CALCULE ici,
     elle ne se declare pas : un chiffre declare a cote de la mecanique derive.
     CE CRITERE NE SUFFIT PAS ET NE L'A JAMAIS FAIT : il ne connait qu'un nombre,
     le dps nominal, et il est reste muet pendant que le tesla dominait et que la
     grenade faisait x1,88 de survie. Ce qui tranche est `verifierEquilibreArmes`
     (`game_state.js`), qui MESURE. Celui-ci ne refuse plus qu'une fiche absurde. */
  for (const id of Object.keys(TIR_FIGE)) {
    if (!ARME_BY_ID.has(id)) out.push(`TIR_FIGE : « ${id} » n'est plus une arme`);
  }

  const dpsRef = dpsBase(armeAt(ARME_DEFAUT));
  for (const a of ARMES) {
    const mono = dpsBase(a) * conversionBoss(a) / dpsRef;
    if (mono < 0.6) {
      out.push(`${a.id} : ${Math.round(mono * 100)} % de la référence sur cible unique,`
        + ` sous le plancher de 60 %`);
    }
    if (mono > 1.6) {
      out.push(`${a.id} : ${Math.round(mono * 100)} % de la référence, au-dessus du plafond`);
    }
  }

  /* UNE FAMILLE DECLAREE ET VIDE EST PIRE QU'UNE FAMILLE ABSENTE, et une arme
     sans famille a un pool strictement plus pauvre que le tir standard des que
     les autres armes en ont une. Les deux moities du critere : toute arme en
     declare une, et toute famille declaree porte ses quatre paliers. */
  if (cards) {
    for (const a of ARMES) {
      if (a.id !== ARME_DEFAUT && !a.famille) {
        out.push(`${a.id} : aucune famille de cartes`);
      }
    }
    for (const [f, id] of FAMILLES_D_ARME) {
      const n = cards.filter(c => c.family === f).length;
      if (n !== 4) out.push(`${id} : famille « ${f} » à ${n} cartes au lieu de 4`);
    }

    /* UN LEVIER OFFENSIF HORS DU TABLEAU EST INVISIBLE A TOUT L'EQUILIBRAGE PAR
       ARME : c'est par la que « Second canon » est passe, penalite pour cinq
       armes et benefice pour trois. `horsEchelle` est une exemption EXPLICITE —
       le porteur ecrit qu'il a regarde. Une carte de famille d'arme n'en a pas
       besoin : l'arme EST son contexte. */
    if (axesDeCarte) {
      for (const c of cards) {
        if (!c.tags?.includes("off") || c.horsEchelle) continue;
        if (c.family && FAMILLES_D_ARME.has(c.family)) continue;
        if (axesDeCarte(c).length === 0) {
          out.push(`carte « ${c.id} » : offensive et hors du tableau d'échelle`);
        }
      }
    }
  }

  // les quatre axes du plan doivent tous etre couverts, sinon la selection ne
  // vaut rien : dix armes du meme axe ne font qu'une arme
  const axes = new Set(ARMES.filter(a => a.axe).map(a => a.axe));
  for (const k of ["mouvement", "ressource", "visee", "distance"]) {
    if (!axes.has(k)) out.push(`aucune arme sur l'axe « ${k} »`);
  }

  return out;
}
