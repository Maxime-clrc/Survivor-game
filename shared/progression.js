/* ===========================================================================
   PROGRESSION PERMANENTE (lot D du plan v3) — module pur, importe par le
   serveur ET le navigateur, sur le modele de `cards.js` : aucune reference au
   DOM, au reseau ni au systeme de fichiers. La PERSISTANCE (lecture, ecriture
   atomique) vit dans `progress_store.js`, cote serveur uniquement — ce module
   ne connait que les tables et les regles.

   Decisions verrouillees du plan, a ne pas rouvrir sans raison :
     - les cartes sont absorbees par la difficulte, la META NE L'EST PAS :
       `_playerPower` lit `p.powerMods` (cartes + classe) et jamais les mods
       enrichis par `applyMeta` — c'est ce qui fait qu'on se sent reellement
       plus fort au lieu de courir sur un tapis roulant ;
     - plafonnement par EMPLACEMENTS, pas par valeurs : on debloque
       definitivement, on n'equipe que N lignes par partie ;
     - emplacements propres a chaque classe, monnaie commune au compte ;
     - la monnaie vient de la performance d'EQUIPE, versee a parts egales —
       jamais des kills individuels : le soigneur tue peu par construction ;
     - les cartes se deverrouillent par JALONS, pas par monnaie : deux
       systemes qui puiseraient dans la meme bourse feraient acheter la
       puissance d'abord et ne montrer les nouvelles cartes jamais.
   =========================================================================== */

import { CARDS, CARD_CFG, RARITY } from "./cards.js";
import { SKILL_CFG } from "./classes.js";
import { BOSS_ROSTER } from "./bosses.js";

export const PROG_CFG = {
  // Passe a 2 avec la simplification pseudo+cle (plus de uid ni de tag) :
  // une ligne Supabase ecrite par l'ancien format n'est plus jamais adoptee
  // en silence, `progress_store.js` la voit comme une version inconnue et
  // suspend l'ecriture au lieu d'ecraser ou de melanger les deux modeles.
  /* 3 : comptes pseudo+mot de passe, une ligne Supabase par compte — le
     profil ne porte plus de champ `code` (l'authentification vit dans les
     colonnes de la table, jamais dans le jsonb de progression). */
  /* 4 (lot H) : economie refaite — revenu lineaire plafonne, primes de
     premiere fois supprimees, emplacements par jalons, couts geometriques.
     Migration SECHE cote store : une ligne de version anterieure repart sur
     un profil neuf, l'authentification (colonnes) est conservee — decision du
     porteur, le jeu est en developpement. */
  /* 5 : la vague n'existe plus (plan 5). Les jalons et la monnaie s'indexent
     sur le NIVEAU d'equipe, et `best` porte `level` et `segment` a cote de
     l'ancien `wave`. La migration se fait par ligne, dans `progress_store.js`.

     DEUX branches ont ecrit une « version 4 » differente — le lot H d'un cote,
     le lot Q de l'autre — et c'est exactement le piege que la version est censee
     eviter : deux profils incompatibles portant le meme numero. La fusion tranche
     en montant a 5, et la migration reconnait les deux v4 par leurs CHAMPS
     (`best.level` pour celle du lot Q, son absence pour celle du lot H) plutot
     que par leur numero, qui ne les distingue pas. */
  VERSION: 5,

  /* Emplacements. On debloque definitivement, on equipe partiellement : c'est
     ce qui distingue ce systeme d'une simple echelle — apres cent parties, la
     decision existe toujours, et deux tanks peuvent etre joues differemment.
     Gagnes aux JALONS et plus aux achats (lot H) : avec des couts
     geometriques, « +1 tous les 12 paliers » devenait inatteignable, et lier
     la capacite a la depense cumulait les deux avantages sur la meme tete —
     celui qui a le plus de noyaux avait aussi le plus d'emplacements. */
  SLOTS_BASE: 3,
  SLOTS_MAX: 6,
  SLOTS_BOSSES: 3,           // +1 : trois boss differents vaincus
  SLOTS_RUNS: 25,            // +1 : 25 parties jouees
  // +1 au jalon de NIVEAU (`niveau12`) et non de vague : les vagues n'existent
  // plus, et le niveau est justement ce qui se gagne desormais.
  SLOTS_LEVEL: 12,

  TIERS_MAX: 5,
  /* Geometriques (lot H) : 6 900 la ligne complete. Le revenu etant lineaire,
     c'est la grille qui porte la duree de progression — premier palier a la
     premiere partie, ligne complete vers la dix-huitieme. */
  TIER_COSTS: [200, 420, 880, 1800, 3600],

  /* La monnaie : les NOYAUX, extraits des creatures. Jamais sur les kills
     individuels — NIVEAU atteint et boss vaincus, verses a parts egales.

     DEUX REFONTES SE SONT CROISEES ICI, et la synthese garde le meilleur des
     deux. Le lot H a mesure que le revenu ne devait etre ni cumulatif ni assorti
     de primes : l'ancienne formule sommait les paliers traverses, donc croissait
     au CARRE — 3 100 noyaux des la premiere bonne partie, les deux tiers venant
     des primes de premiere fois — pendant que les couts, eux, sont geometriques.
     Le plan 5 a change l'UNITE : la vague ne veut plus rien dire, toutes les
     equipes voient la meme horde et les six memes segments, alors que le niveau
     se GAGNE.

     On garde donc la FORME du lot H — lineaire, plafonnee, sans prime — et
     l'UNITE du plan 5. La formule du plan 5 etait triangulaire, c'est-a-dire
     exactement ce que le lot H venait de retirer : sa critique valait pour elle
     aussi, changer d'unite ne l'en exemptait pas.

     ETALONNAGE, et il tient au PLAFOND autant qu'aux coefficients. Le lot H
     visait ~290 noyaux bruts pour une bonne partie (vague 17, trois boss). Une
     manche de plan 5 atteint le niveau 15 a 20 en median et 22 a 26 pour une
     manche complete — soit une echelle presque double, parce qu'une manche dure
     desormais trente-sept minutes.

     Les coefficients sont donc RABAISSES pour que le plafond garde son role. A
     10 et 30, une victoire complete en NORMAL donnait deja 616 : le plafond
     mordait sur le cas nominal, ce qui revient a supprimer la difference entre
     une bonne partie et une partie parfaite. A 8 et 25 :

       mediane normal    18 x 8 + 3 x 25 = 219, x1,4 =  307
       complete normal   26 x 8 + 6 x 25 = 358, x1,4 =  501
       complete cauchemar                  358, x2   =  716 -> PLAFONNEE a 600

     Le plafond ne mord plus que sur la victoire complete en cauchemar, ce qui
     est exactement la « soiree exceptionnelle » qu'il est cense borner.

     LES PRIMES DE PREMIERE FOIS ONT DISPARU, y compris celle du boss final que
     le lot W avait ecrite (900). Ce n'est pas une perte : le boss final garde sa
     recompense la ou le depot la met depuis toujours, dans le JALON qui debloque
     des cartes. « Les cartes se debloquent par JALONS, pas par monnaie » — deux
     systemes qui puiseraient dans la meme bourse feraient acheter la puissance
     d'abord et ne montrer les nouvelles cartes jamais. */
  CORE_LEVEL: 8,             // x niveau atteint, sans cumul
  CORE_BOSS: 25,
  CORE_RUN_CAP: 600,         // plafond par partie
  DIFF_MUL: [1, 1.4, 2],     // meme ordre que DIFFICULTIES — la difficulte pese plus

  /* Jalons de deblocage de cartes. */
  KILLS_MILESTONE: 500,      // kills cumules avec une meme classe
  NO_DOWN_MIN_LEVEL: 6,      // « sans etre mis a terre » ne vaut qu'a partir de la

  /* Le tronc de confort : non-puissance, coût fixe, ne consomme AUCUN
     emplacement. Les achats les plus puissants du systeme — la quatrieme
     offre ameliore TOUTES les parties futures — donc des objectifs de moyen
     terme, pas des achats de la troisieme partie. */
  CONFORT_COSTS: { relance: 1200, quatrieme: 2500, ravitaillement: 900 },

  /* Constantes des lignes qui ne se resument pas a un mod existant. */
  CATALYSE_TIME: 3,          // secondes de bonus sur la cible soignee
  THORNS_RADIUS: 80,         // 4 m
  GUARD_RADIUS: 120,         // 6 m
};

/* --- les trois arbres -----------------------------------------------------------

   Principe : chaque arbre renforce ce que la classe fait DEJA, il ne comble pas
   ses faiblesses. Un tank qui achete des degats devient un mauvais tireur ; un
   tank qui achete de la protection d'equipe devient un meilleur tank.

   `apply(m, n)` mute l'objet mods comme les cartes, avec `n` paliers achetes.
   `metaHpRatio` est une cle de travail consommee par `applyMeta` — les PV max
   se rejouent depuis le total de `fullMods`, jamais en increments.
   `desc(n)` rend l'effet TOTAL a n paliers, en chaine affichee (accents). */

const pct = v => `${String(Math.round(v * 1000) / 10).replace(".", ",")} %`;

export const TREES = {
  tank: [
    { id: "constitution", nom: "Constitution", step: 0.06,
      desc: n => `+${pct(0.06 * n)} de PV max`,
      apply(m, n) { m.metaHpRatio += 0.06 * n; } },
    { id: "alliage", nom: "Alliage", step: 0.02,
      desc: n => `−${pct(1 - Math.pow(0.98, n))} de dégâts subis`,
      apply(m, n) { m.damageTakenMul *= Math.pow(0.98, n); } },
    { id: "ancrage", nom: "Ancrage", step: 0.08,
      desc: n => `+${pct(0.08 * n)} de rayon et de durée du rempart`,
      apply(m, n) {
        m.bulwarkRadiusMul += 0.08 * n;
        m.bulwarkTime += SKILL_CFG.TANK_BULWARK_TIME * 0.08 * n;
      } },
    { id: "defi", nom: "Défi", step: 1,
      desc: n => `−${n} s de recharge de provocation`,
      apply(m, n) { m.tauntCd -= n; } },
    { id: "epines", nom: "Épines", step: 0.04,
      desc: n => `renvoie ${pct(0.04 * n)} des dégâts subis à 4 m`,
      apply(m, n) { m.thorns += 0.04 * n; } },
    { id: "garde", nom: "Garde", step: 0.02,
      desc: n => `les alliés à moins de 6 m subissent −${pct(0.02 * n)}`,
      apply(m, n) { m.guardAura += 0.02 * n; } },
  ],

  soigneur: [
    { id: "vitalite", nom: "Vitalité", step: 0.04,
      desc: n => `+${pct(0.04 * n)} de PV max`,
      apply(m, n) { m.metaHpRatio += 0.04 * n; } },
    { id: "flux", nom: "Flux", step: 0.07,
      desc: n => `+${pct(0.07 * n)} de soins prodigués`,
      apply(m, n) { m.healGivenMul += 0.07 * n; } },
    { id: "portee", nom: "Portée", step: 0.08,
      desc: n => `+${pct(0.08 * n)} de portée et de vitesse du faisceau`,
      apply(m, n) { m.healBeamMul += 0.08 * n; } },
    { id: "releve", nom: "Relève", step: 0.10,
      desc: n => `réanimation +${pct(0.10 * n)}, +${4 * n} PV au relevé`,
      apply(m, n) { m.reviveSpeedMul += 0.10 * n; m.reviveHpBonus += 4 * n; } },
    { id: "osmose", nom: "Osmose", step: 0.04,
      desc: n => `${pct(0.04 * n)} des soins prodigués reviennent en PV`,
      apply(m, n) { m.transfusion += 0.04 * n; } },
    /* La ligne la plus importante du lot : elle rend le soigneur offensif
       INDIRECTEMENT, le seul moyen de le rendre desirable sans en faire un
       tireur. */
    { id: "catalyse", nom: "Catalyse", step: 0.03,
      desc: n => `la cible soignée gagne +${pct(0.03 * n)} de dégâts pendant ${PROG_CFG.CATALYSE_TIME} s`,
      apply(m, n) { m.catalyse += 0.03 * n; } },
  ],

  dps: [
    { id: "calibre", nom: "Calibre", step: 0.04,
      desc: n => `+${pct(0.04 * n)} de dégâts`,
      apply(m, n) { m.damageMul += 0.04 * n; } },
    { id: "precision", nom: "Précision", step: 0.02,
      desc: n => `+${pct(0.02 * n)} de chance critique`,
      apply(m, n) { m.critChance += 0.02 * n; } },
    { id: "letalite", nom: "Létalité", step: 0.08,
      desc: n => `+${pct(0.08 * n)} de dégâts critiques`,
      apply(m, n) { m.critMul += 0.08 * n; } },
    { id: "munitions", nom: "Munitions", step: 0.06,
      desc: n => `+${pct(0.06 * n)} de vitesse et de portée des balles`,
      apply(m, n) { m.bulletSpeedMul += 0.06 * n; m.bulletLifeMul += 0.06 * n; } },
    { id: "charge", nom: "Charge", step: 0.6,
      desc: n => `−${String(0.6 * n).replace(".", ",")} s de recharge de bombe, +${pct(0.05 * n)} de rayon`,
      apply(m, n) { m.bombCdCut += 0.6 * n; m.bombRadiusMul += 0.05 * n; } },
    { id: "surchauffe", nom: "Surchauffe", step: 0.5,
      desc: n => `+${String(0.5 * n).replace(".", ",")} s de durée de surcharge`,
      apply(m, n) { m.overdriveTime += 0.5 * n; } },
  ],
};

/* Le tronc de confort, commun aux trois classes. Non-puissance : aucun de ces
   trois achats n'entre dans `applyMeta`, ils sont lus par le serveur (relance,
   quatrieme offre) ou a l'inscription du joueur (ravitaillement). */
export const CONFORT = [
  { id: "relance", nom: "Relance",
    desc: "une relance de tirage de carte par partie" },
  { id: "quatrieme", nom: "Quatrième offre",
    desc: "quatre cartes proposées au lieu de trois" },
  { id: "ravitaillement", nom: "Ravitaillement initial",
    desc: "un bonus au sol dès le début de la manche" },
];

/* --- application des paliers equipes -------------------------------------------

   En AVAL de `fullMods` et jamais dedans : `p.powerMods` garde le resultat de
   fullMods (cartes + classe), c'est lui que lit `_playerPower` — la meta est
   ainsi exclue de la difficulte par construction, pas par soustraction.
   L'objet mods est copie a plat : il ne contient que des scalaires et une
   chaine d'arme, et muter l'original ferait pointer powerMods et mods sur le
   meme objet. */
export function applyMeta(mods, maxHp, clsId, lines) {
  const m = { ...mods, metaHpRatio: 0 };
  const tree = TREES[clsId] ?? [];
  for (const line of tree) {
    const n = Math.min(lines[line.id] | 0, PROG_CFG.TIERS_MAX);
    if (n > 0) line.apply(m, n);
  }
  /* Les memes plafonds que `computeMods`, pour les mods que la meta touche :
     la meta s'ajoute APRES le plafonnement des cartes, elle ne doit pas le
     contourner. */
  m.critChance = Math.min(CARD_CFG.CRIT_CHANCE_CAP, m.critChance);
  m.damageTakenMul = Math.max(CARD_CFG.DAMAGE_TAKEN_FLOOR, m.damageTakenMul);
  const hp = Math.round(maxHp * (1 + m.metaHpRatio));
  delete m.metaHpRatio;
  return { mods: m, maxHp: hp };
}

/* Emplacements disponibles : la base, plus les JALONS du compte (lot H) —
   vague 10 atteinte, trois boss differents vaincus, 25 parties jouees. La
   fonction prend desormais le PROFIL entier et non le profil de classe : la
   capacite est une propriete du compte, les listes equipees restent par
   classe. Les jalons de boss sont COMPTES depuis les jalons `boss_N` deja
   poses pour les legendaires — pas de second marqueur a synchroniser. */
export function slotsFor(profile) {
  const ms = profile?.milestones ?? [];
  let n = PROG_CFG.SLOTS_BASE;
  if (ms.includes(`niveau${PROG_CFG.SLOTS_LEVEL}`)) n++;
  let bosses = 0;
  for (const id of ms) if (id.startsWith("boss_")) bosses++;
  if (bosses >= PROG_CFG.SLOTS_BOSSES) n++;
  if ((profile?.runs | 0) >= PROG_CFG.SLOTS_RUNS) n++;
  return Math.min(PROG_CFG.SLOTS_MAX, n);
}

export function tierCost(currentTier) {
  return PROG_CFG.TIER_COSTS[currentTier] ?? Infinity;
}

/* --- deblocage de cartes par jalons --------------------------------------------

   Ce qui est verrouille au depart : les LEGENDAIRES, les ARMES de remplacement
   et les cartes CONDITIONNELLES. Tout le socle reste accessible — effet
   secondaire precieux : un nouveau joueur decouvre un pool plus simple, c'est
   de l'onboarding sans ecrire une ligne de tutoriel.

   Les groupes sont CALCULES depuis la table des cartes et non recopies : une
   liste d'identifiants ecrite ici aurait diverge a la premiere carte ajoutee
   (le lot C vient justement d'ajouter trois legendaires). */
// Les armes sont TOUTES legendaires aujourd'hui : les tenir a part d'abord,
// sinon le groupe des legendaires les absorbe et le jalon des armes ne
// debloque rien — c'est arrive, l'ecran affichait « (0 carte) ».
const armes = CARDS
  .filter(c => c.remplaceArme && !c.fallback)
  .map(c => c.id);
const legendaires = CARDS
  .filter(c => c.rarity === RARITY.LEGENDAIRE && !c.fallback && !c.remplaceArme)
  .map(c => c.id);
const conditionnelles = CARDS
  .filter(c => c.applyAfter && c.rarity !== RARITY.LEGENDAIRE && !c.remplaceArme)
  .map(c => c.id);

/* Les legendaires se repartissent sur les cinq boss INTERMEDIAIRES, en
   tourniquet : chaque premiere victoire en libere deux ou trois, et l'ordre des
   combats n'a pas d'importance.

   Le diviseur est GELE a cinq et ne suit pas `BOSS_ROSTER.length`, qui vaut six
   depuis le lot W. Ce n'est pas une commodite : le partage decide quelles cartes
   un compte a deja debloquees, et passer de cinq a six paquets aurait REVERROUILLE
   des cartes chez tout le monde — un compte qui avait battu les boss 0, 1 et 2
   detenait les paquets 0, 1, 2 d'un partage en cinq, qui ne sont pas les paquets
   0, 1, 2 d'un partage en six. Une table de deblocage ne se reordonne pas plus
   qu'un tableau dont l'index circule. */
const LEGENDARY_SPLIT = 5;
const legendairesDuBoss = i => legendaires.filter((_, k) => k % LEGENDARY_SPLIT === i);

export const MILESTONES = [
  // L'identifiant a change avec l'unite (« vague8 » -> « niveau10 ») : la
  // migration de version 4 le reecrit dans les profils, sinon un compte qui
  // avait deja le jalon perdait ses cartes conditionnelles.
  { id: "niveau10", label: "atteindre le niveau 10", unlocks: conditionnelles },
  /* Un jalon par boss, l'identifiant portant son INDEX de roster : `boss_5` est
     donc le boss final depuis le lot W, et il arrive sans migration puisque
     personne ne l'avait.

     Sa recompense n'est pas un sixieme paquet de legendaires — il n'en reste
     aucun, le partage est gele a cinq — mais LES DEUX PAQUETS D'ARMES d'un coup,
     que `sans_chute` et `kills500` se partagent autrement. C'est cohérent avec ce
     qu'il est : le seul accomplissement du jeu plus dur que les deux autres
     reunis, et une troisieme route vers les memes cartes plutot qu'un quatrieme
     lot a inventer. Aucun compte existant n'y perd quoi que ce soit — un jalon
     n'ajoute que des deblocages. */
  ...BOSS_ROSTER.map((b, i) => ({
    id: `boss_${i}`, label: `vaincre ${b.nom}`,
    unlocks: i < LEGENDARY_SPLIT ? legendairesDuBoss(i) : armes,
  })),
  { id: "sans_chute",
    label: `terminer une manche (niveau ${PROG_CFG.NO_DOWN_MIN_LEVEL}+) sans être mis à terre`,
    unlocks: armes.filter((_, k) => k % 2 === 0) },
  { id: "kills500",
    label: `tuer ${PROG_CFG.KILLS_MILESTONE} ennemis avec une même classe`,
    unlocks: armes.filter((_, k) => k % 2 === 1) },
];

const MILESTONE_BY_ID = new Map(MILESTONES.map(m => [m.id, m]));

/* Cartes encore verrouillees pour un compte, d'apres ses jalons accomplis.
   Rend un Set d'identifiants, consomme par `eligibleCards`. */
export function lockedCards(milestonesDone = []) {
  const locked = new Set([...legendaires, ...armes, ...conditionnelles]);
  for (const id of milestonesDone) {
    const m = MILESTONE_BY_ID.get(id);
    if (m) for (const cardId of m.unlocks) locked.delete(cardId);
  }
  return locked;
}

/* --- monnaie --------------------------------------------------------------------

   LINEAIRE (lot H) et indexee sur le NIVEAU (plan 5) : on paie le niveau
   ATTEINT, pas la somme des niveaux traverses — une somme croit au carre et
   distance des couts geometriques. Verse a parts EGALES : la fonction ne prend
   rien d'individuel, et c'est voulu. Le plafond s'applique au TOTAL multiplie :
   une soiree exceptionnelle ne doit pas effacer un mois de progression. */
export function coresForRun(level, bossKills, diffIndex) {
  const base = PROG_CFG.CORE_LEVEL * level + PROG_CFG.CORE_BOSS * bossKills;
  return Math.min(PROG_CFG.CORE_RUN_CAP,
    Math.round(base * (PROG_CFG.DIFF_MUL[diffIndex] ?? 1)));
}

// Part d'un joueur qui quitte en cours de manche : le niveau atteint, rien
// d'autre — ni boss ni jalons, qui se constatent a la fin. Meme plafond.
export function coresPartial(level, diffIndex) {
  return Math.min(PROG_CFG.CORE_RUN_CAP,
    Math.round(PROG_CFG.CORE_LEVEL * level * (PROG_CFG.DIFF_MUL[diffIndex] ?? 1)));
}

/* Profil neuf. Le champ `version` vit sur le FICHIER (progress_store), pas sur
   chaque profil. `kills` cumule par classe, pour le jalon des 500. */
/* Simplification pseudo+cle : le pseudo EST le compte, plus un champ `name`
   distinct qui ne servait qu'a l'affichage avant reservation. Le compte
   n'existe qu'a partir du moment ou un pseudo lui est attache — `pseudo` est
   donc pose ici, a la creation, par `progress_store.js#register`. */
export function newProfile(pseudo) {
  return {
    pseudo,
    cores: 0,
    runs: 0,
    /* `wave` reste, VIDE de sens desormais mais jamais reecrit : c'est le
       record historique du modele par vagues, et une mesure se remesure, elle
       ne se convertit pas. Les deux nouvelles unites demarrent a zero. */
    best: { wave: 0, level: 0, segment: 0, score: 0 },
    milestones: [],
    kills: {},           // clsId -> kills cumules
    classes: {},         // clsId -> { tiers: { ligne -> palier }, equipped: [lignes] }
    confort: [],         // identifiants de CONFORT achetes
    /* Cartes bannies (lot J) : identifiants a plat, cloture de dependances
       incluse a l'ecriture. Un profil sans ce champ (v4 d'avant le lot) se
       lit comme une liste vide — les lecteurs font `?? []`. */
    bannedCards: [],
    /* CLASSEMENT AU TEMPS. Deux branches ont ecrit ce record separement et la
       fusion garde les deux arguments, qui portent sur des axes differents.

       PAR DIFFICULTE (lot N) : comparer un temps de « calme » a un temps de
       « cauchemar » n'a aucun sens, et une case unique aurait pousse tout le
       monde a jouer en calme pour figurer au tableau. Cle = index de
       DIFFICULTIES.

       AVEC SON CONTEXTE (lot W) : la difficulte ne suffit pas. Un temps n'est
       comparable qu'a VARIANTE de script, BIOME et EFFECTIF egaux — c'est la
       preoccupation deja ecrite dans plan4, « deux parties identiques en tout
       point peuvent avoir des temps differents », et le lot X en fait un critere
       d'acceptation. Les champs accompagnent donc le record au lieu d'etre
       perdus.

       Et c'est le temps du COMBAT FINAL SEUL, jamais celui pour l'atteindre :
       sous D1 ce dernier vaut 1800 s de horde plus les cinq combats precedents,
       donc il est domine par une constante et ne distinguerait personne.

       Un profil sans ce champ se lit comme un objet vide — meme repli que
       `bannedCards`, aucune migration a ecrire. */
    bestFinal: {},
  };
}

/* Enregistre une victoire finale si elle ameliore le record de SA difficulte.
   Fonction pure sur le profil, comme le reste du module : le hub l'appelle,
   la salle ne connait pas la persistance. Retourne vrai si le record a bouge —
   c'est ce qui decide d'un « nouveau record » a l'ecran. */
export function recordFinal(profile, run, dateISO) {
  if (!profile || !run) return false;
  if (!profile.bestFinal) profile.bestFinal = {};
  const k = String(run.difficulty | 0);
  const cur = profile.bestFinal[k];
  // Le TEMPS fait foi, et seulement lui : c'est un classement de vitesse. Le
  // contexte accompagne le record, il n'entre jamais dans la comparaison — deux
  // biomes differents ne se departagent pas, ils se LISENT.
  if (cur && cur.time <= run.time) return false;
  profile.bestFinal[k] = {
    time: Math.round((run.time ?? 0) * 10) / 10,
    // Le NIVEAU et non la vague : c'est l'unite du plan 5, et la seule des deux
    // qui distingue encore deux equipes.
    level: run.level | 0,
    total: run.total | 0,
    variant: run.variant ?? "",
    biome: run.biome | 0,
    players: run.players | 0,
    date: dateISO,
  };
  return true;
}
