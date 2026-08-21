import { nombre, t, tf } from "./i18n.js";
import { fmtM } from "./units.js";

/* LA VARIETE NE VIENT PAS DU PROJECTILE. Dix armes qui se distinguent par leur
   balle — rapide/lente, une/plusieurs, perforante/explosive — se jouent toutes
   pareil : on vise, on tire, on recule. Elle vient de ce que l'arme exige du
   CORPS et de l'ATTENTION : le mouvement, la ressource, la visee, la distance.

   AUCUNE ARME N'AJOUTE UNE ENTREE, UN BOUTON NI UN GESTE. On vise et on maintient
   le tir, exactement comme avant — c'est l'arme qui se comporte autrement, pas
   le joueur qui apprend une manipulation. */

export const ARME_CFG = {
  OFFRES: 3,
  RELANCES: 1,

  // canon d'assaut : la rampe est le dialogue permanent entre le danger qui
  // approche et le compteur qui monte. La RETOMBEE PROGRESSIVE est essentielle —
  // sans elle, esquiver une mecanique de boss couterait toute la puissance
  // accumulee et l'arme serait injouable sur les onze boss.
  RAMPE_MONTEE: 2.5,
  RAMPE_CHUTE: 1.2,
  RAMPE_MAX: 2.2,
  RAMPE_SEUIL: 12,

  // laser : la MEME ressource est un malus en horde et un bonus sur boss. Une
  // mecanique, deux lectures selon le contexte.
  CHALEUR_MONTEE: 1 / 4.2,
  CHALEUR_CHUTE: 1 / 2.6,
  CHALEUR_MUET: 1.5,
  CHALEUR_BONUS: 0.25,
  LASER_TICK: 0.1,
  LASER_LARGEUR: 18,

  // tesla : ses deux rebonds de base sont volontairement faibles, c'est sa
  // famille qui les monte a cinq.
  TESLA_REBONDS: 2,
  TESLA_PERTE: 0.28,
  // la portee d ACQUISITION vient de la table comme pour toute arme ; celle-ci
  // est la distance de SAUT d un rebond, et rien d autre
  TESLA_SAUT: 260,

  // lame : les PV sont INTRINSEQUES a l'arme, pas une carte. C'est ce qui la
  // rend jouable au contact des le premier choix, sans dependre d'un tirage.
  LAME_ARC: Math.PI * 0.9,
  LAME_RAYON: 110,
  LAME_HP: 0.40,
  LAME_MARQUE: 0.08,
  LAME_MARQUE_MAX: 5,
  LAME_MARQUE_TEMPS: 3,
};

/* Ce que l'arme tire de chaque statistique. UN SEUL POOL DE CARTES : une carte
   de cadence est excellente sur le tesla et presque inutile sur le railgun, sans
   ecrire une carte neuve et sans gonfler le pool.
   Aucun coefficient sous 0,2 — une carte a valeur nulle est un choix vide. Les
   trois zeros de `perforation` sont les exceptions assumees qui rendent le
   tableau reel plutot que decoratif. */
const ECH = (degats, cadence, portee, zone, perforation, critique) =>
  ({ degats, cadence, portee, zone, perforation, critique });

export const ARMES = [
  {
    id: "standard", nom: "Tir standard", tir: "balle",
    interval: 0.16, degats: 12, portee: 1.0,
    resume: "la reference : aucune contrainte, aucun avantage",
    ech: ECH(1.0, 1.0, 1.0, 0.3, 1.0, 1.0),
  },
  {
    id: "assaut", nom: "Canon d'assaut", tir: "balle", axe: "mouvement",
    interval: 0.11, degats: 8, portee: 0.8,
    rampe: true,
    resume: "les dégâts montent tant que tu ne bouges pas, et retombent doucement",
    contrainte: "la rampe se perd en se déplaçant",
    ech: ECH(1.2, 1.1, 0.8, 0.2, 0.9, 1.0),
  },
  {
    id: "laser", nom: "Canon laser", tir: "faisceau", axe: "ressource",
    interval: 0, degats: 90, portee: 1.6,
    chaleur: true, perforeTout: true,
    resume: "un faisceau continu qui traverse une file entière et ne rate jamais",
    contrainte: "il chauffe, et se tait 1,5 s à saturation",
    ech: ECH(1.2, 0.4, 1.3, 0.2, 1.5, 0.6),
  },
  {
    id: "tesla", nom: "Tesla", tir: "arc", axe: "visee",
    interval: 0.30, degats: 10, portee: 0.7,
    rebonds: true, critBase: 0, sansVisee: true,
    resume: "des arcs qui sautent seuls d'un ennemi à l'autre, sans viser",
    contrainte: "aucun coup critique, et peu de dégâts par cible",
    ech: ECH(0.7, 1.2, 0.5, 1.2, 0.0, 0.2),
  },
  {
    id: "lame", nom: "Lame tournoyante", tir: "arc_sol", axe: "distance",
    interval: 0.40, degats: 14, portee: 0.25,
    lame: true, hpBonus: ARME_CFG.LAME_HP,
    resume: "un balayage qui touche tout autour de toi, et +40 % de PV max",
    contrainte: "portée nulle : il faut être au contact",
    ech: ECH(1.3, 1.3, 0.2, 0.8, 0.0, 1.0),
  },

  /* Les trois armes du depot d'avant, entrees dans la table : elles etaient des
     cartes legendaires, elles deviennent des choix de depart comme les autres. */
  {
    id: "dispersion", nom: "Fusil à dispersion", tir: "balle", axe: "distance",
    interval: 0.50, degats: 6, plombs: 6, portee: 0.5,
    resume: "six plombs en cône, qui convergent de près",
    contrainte: "portée courte",
    ech: ECH(0.9, 0.8, 0.7, 0.6, 0.6, 0.8),
    // les plombs CONVERGENT sous cette distance : un boss n a pas de flancs, et
    // une arme qui ne peut pas concentrer sa gerbe tombe sous le plancher
    convergence: 250,
  },
  {
    id: "railgun", nom: "Railgun", tir: "balle", axe: "ressource",
    interval: 0.70, degats: 60, portee: 1.8, perforeTout: true,
    resume: "un rail qui traverse tout, sans limite de cibles",
    contrainte: "une charge avant chaque tir",
    ech: ECH(1.5, 0.3, 1.5, 0.2, 2.0, 1.4),
  },
  {
    id: "grenade", nom: "Lance-grenades", tir: "grenade", axe: "distance",
    interval: 0.80, degats: 40, portee: 0.9,
    resume: "un projectile lent qui explose",
    contrainte: "il faut anticiper la trajectoire",
    ech: ECH(1.1, 0.5, 0.8, 1.5, 0.0, 0.6),
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

/* LA FAMILLE DE L'ARME PORTEE EST GARANTIE DANS LE POOL, celles des autres en
   sont retirees : plus de manche condamnee par un tirage qui ne coopere pas.
   Ce sont aussi les seules cartes du catalogue qui ne peuvent JAMAIS faire
   doublon, puisque chacune n'existe que dans le contexte d'une arme. */
export const FAMILLES_D_ARME = new Map(
  ARMES.filter(a => a.id !== ARME_DEFAUT).map(a => [`arme_${a.id}`, a.id]));

export function familleDeArme(armeId) {
  return armeId && armeId !== ARME_DEFAUT ? `arme_${armeId}` : null;
}

/* POINT DE PASSAGE UNIQUE DE L'ECHELLE. Une arme ne change pas ce qu'une carte
   FAIT, elle change ce qu'elle lui RAPPORTE. Le multiplicatif se rescale sur son
   ecart a 1 ; la cadence se rescale sur sa REDUCTION, parce que `fireIntervalMul`
   descend quand la cadence monte — appliquer le coefficient a la valeur brute
   inverserait le sens du levier sur toute arme lente. */
export function appliquerEchelle(mods, armeId) {
  const a = ARME_BY_ID.get(armeId);
  if (!a || a.id === ARME_DEFAUT) return mods;
  const e = a.ech;

  mods.damageMul = 1 + (mods.damageMul - 1) * e.degats;
  mods.fireIntervalMul = 1 - (1 - mods.fireIntervalMul) * e.cadence;
  mods.bulletLifeMul = 1 + (mods.bulletLifeMul - 1) * e.portee;
  mods.areaMul = 1 + (mods.areaMul - 1) * e.zone;
  mods.pierce = Math.round(mods.pierce * e.perforation);
  mods.chain = Math.round(mods.chain * e.perforation);

  const critBase = a.critBase ?? null;
  const socle = critBase === null ? mods.critBase : critBase;
  mods.critChance = Math.max(0, socle + (mods.critChance - mods.critBase) * e.critique);
  mods.critMul = 1 + (mods.critMul - 1) * e.critique;

  if (a.hpBonus) mods.maxHpRatio += a.hpBonus;
  return mods;
}

export const dpsBase = a =>
  a.interval > 0 ? a.degats * (a.plombs ?? 1) / a.interval : a.degats;

/* Ce qu'une arme rend CONTRE UNE CIBLE UNIQUE, conversion comprise. Le laser est
   le modele : la meme ressource est un malus en horde et un bonus sur boss. */
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
  // les coups repetes de la lame EMPILENT une marque
  if (a.lame) return 1 + ARME_CFG.LAME_MARQUE * ARME_CFG.LAME_MARQUE_MAX;
  return 1;
}

/* Critere rejouable, sur le modele de `verifierBiomes()`. */
export function verifierArmes() {
  const out = [];
  const vus = new Set();
  const AXES = ["degats", "cadence", "portee", "zone", "perforation", "critique"];

  for (const a of ARMES) {
    if (vus.has(a.id)) out.push(`${a.id} : identifiant en double`);
    vus.add(a.id);
    for (const k of AXES) {
      const v = a.ech?.[k];
      if (typeof v !== "number") { out.push(`${a.id} : coefficient « ${k} » absent`); continue; }
      // une carte a valeur nulle est un choix vide : seule la perforation a le
      // droit de tomber a zero, et c'est ce qui rend le tableau reel
      if (v === 0 && k !== "perforation") out.push(`${a.id} : « ${k} » à zéro`);
      else if (v > 0 && v < 0.2) out.push(`${a.id} : « ${k} » sous 0,2 (${v})`);
    }
    if (a.id !== ARME_DEFAUT && !a.axe) out.push(`${a.id} : aucun axe de gameplay`);
    if (a.id !== ARME_DEFAUT && !a.contrainte) out.push(`${a.id} : aucune contrainte`);
    if (!(a.degats > 0)) out.push(`${a.id} : dégâts nuls`);
    if (a.interval < 0) out.push(`${a.id} : intervalle négatif`);
  }

  /* LES BOSS SONT UN CINQUIEME DU TEMPS DE MANCHE, contre une CIBLE UNIQUE. Une
     arme qui saute entre les cibles n'a rien a sauter face a un boss — d'ou les
     conversions du plan, et d'ou ce critere : aucune arme ne descend sous 60 %
     de la reference dans l'UN DES DEUX contextes. La conversion se CALCULE ici,
     elle ne se declare pas : un chiffre declare a cote de la mecanique derive. */
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

  // les quatre axes du plan doivent tous etre couverts, sinon la selection ne
  // vaut rien : dix armes du meme axe ne font qu'une arme
  const axes = new Set(ARMES.filter(a => a.axe).map(a => a.axe));
  for (const k of ["mouvement", "ressource", "visee", "distance"]) {
    if (!axes.has(k)) out.push(`aucune arme sur l'axe « ${k} »`);
  }

  return out;
}
