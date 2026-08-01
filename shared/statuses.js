/* ===========================================================================
   ETATS — module pur, importe par le serveur ET par le navigateur.
   Sur le modele exact de `cards.js` et `classes.js` : il ne depend de rien,
   surtout pas de `game_state.js`, qui l'importe — un cycle d'import casserait
   le chargement des modules dans le navigateur.

   QUATRE etats, pas plus. La tentation etait d'en ecrire dix : immobilite,
   fuite, sceau (blocage des competences), contagion, aveuglement. Aucun ne
   tient dans ce jeu-ci :

   - immobilite / fuite (le couple de FFXIV) : rester immobile deux secondes au
     milieu de 200 ennemis est une condamnation, pas une consigne ;
   - sceau : invisible, il frustre sans rien apprendre ;
   - contagion : elle suppose un systeme de dispersion des joueurs qui n'existe
     pas ;
   - aveuglement (portee reduite) : trop discret pour se lire en pleine action.

   Les quatre retenus tiennent sur les seuls verbes du jeu : encaisser, bouger,
   tirer.
   =========================================================================== */

/* `STATUSES` est un TABLEAU ORDONNE et son index sert de bit dans le masque du
   snapshot : ne jamais inserer au milieu, ajouter a la fin. Meme invariant que
   POWERUP_TYPES, ENEMY_TYPES, DIFFICULTIES et CLASSES. */
export const STATUS_VULN = 0;
export const STATUS_BURN = 1;
export const STATUS_ROOT = 2;
export const STATUS_DOOM = 3;

export const STATUSES = [
  {
    id: STATUS_VULN, key: "vuln", nom: "Vulnérabilité",
    /* La piece maitresse, et le seul etat qui n'expire pas vite. Elle
       transforme toute mecanique « quelqu'un doit encaisser » en decision
       d'equipe : celui qui encaisse deux fois de suite ne peut pas encaisser
       une troisieme, donc quelqu'un d'autre doit prendre le relais. C'est le
       seul etat qui cree de la rotation. */
    stacks: 3, time: 20, lethal: false,
    desc: "+25 % de dégâts subis par cumul",
    couleur: "#f4b04a",
  },
  {
    id: STATUS_BURN, key: "burn", nom: "Brûlure",
    stacks: 1, time: 5, lethal: false,
    desc: "6 dégâts par seconde",
    couleur: "#ff8f4d",
  },
  {
    id: STATUS_ROOT, key: "root", nom: "Entrave",
    stacks: 1, time: 6, lethal: false,
    desc: "vitesse −40 %",
    couleur: "#9fb4ff",
  },
  {
    id: STATUS_DOOM, key: "doom", nom: "Sentence",
    /* Le seul etat letal, et le seul qui ne puisse pas expirer sans devenir
       decoratif. Il n'apparait donc QUE si l'equipe compte un soigneur — voir
       `needsHealer` cote game_state : affaiblir arbitrairement la menace aurait
       ete moins honnete que de ne pas la poser du tout. */
    stacks: 1, time: 8, lethal: true,
    desc: "mort à échéance sauf si soigné à plein",
    couleur: "#ff6b8a",
  },
];

export const STATUS_BY_KEY = new Map(STATUSES.map(s => [s.key, s.id]));

export function statusAt(id) { return STATUSES[id] ?? null; }
export function statusBit(id) { return 1 << id; }

/* Priorite de purge. UN SEUL etat par purge, jamais tout d'un coup : sans cette
   regle les cumuls ne veulent plus rien dire, et le soigneur annule
   mecaniquement tout le travail du boss. */
export const PURGE_ORDER = [STATUS_DOOM, STATUS_BURN, STATUS_ROOT, STATUS_VULN];

export const STATUS_CFG = {
  VULN_PER_STACK: 0.25,      // degats subis en plus, par cumul
  BURN_DPS: 6,
  ROOT_SLOW: 0.40,           // part de vitesse perdue
  // Sentence : elle ne tue pas sec, elle MET A TERRE. Voir _statuses() — un
  // joueur tue net par un decompte qu'il n'a pas pu purger n'apprend rien, et
  // la manche s'arrete sur une equipe qui n'a pas failli.
  DOOM_HEAL_RATIO: 1,        // part des PV max a atteindre pour y survivre

  /* Purge par insistance. DEUX impacts sur le meme allie en moins de trois
     secondes : c'est ce qui rend le mode soin plus interessant qu'un robinet de
     PV — il faut choisir une cible et rester dessus, alors que le jeu pousse a
     arroser. Et c'est coherent avec la contrainte du projectile qui s'arrete
     sur les ennemis : purger quelqu'un derriere la horde devient un probleme de
     position. */
  PURGE_HITS: 2,
  PURGE_WINDOW: 3,

  // Recharge par elite, sinon l'application tourne en boucle au contact : une
  // elite collee a un joueur reposait son etat soixante fois par seconde.
  ELITE_STATUS_CD: 4,

  // Usure imposee par certains boss (lot 4). Le Miasme ne vaut QUE parce qu'il
  // existe un moyen de le gerer : pris seul il punit tout le monde egalement
  // sans creuser l'ecart entre un joueur qui lit les annonces et un joueur qui
  // les ignore, qui est la mesure de reference du depot.
  BOSS_MIASMA_EVERY: 25,

  // Rempart du tank : une purge a l'entree, une seule fois par joueur et par
  // pose. Donne une raison de plus de s'y regrouper aux equipes sans soigneur.
  BULWARK_PURGE: 1,

  // Le bonus de Purification sort plus souvent quand personne ne peut purger.
  // C'est le filet des equipes sans soigneur, pas une rotation de plus.
  PURIFY_CHANCE: 0.06,
  PURIFY_CHANCE_NO_HEALER: 0.16,
};

/* Etats appliques au contact par les elites. C'est ce qui donne enfin une
   raison de les traiter en priorite plutot que de les ignorer. La table est
   indexee par la CLE du type d'ennemi et non par son index : `statuses.js` ne
   connait pas l'ordre de `ENEMY_TYPES` et n'a pas a le connaitre. */
export const ELITE_STATUS = {
  runner: STATUS_ROOT,
  tank: STATUS_VULN,
  shooter: STATUS_BURN,
  // grunt et brood : aucun. Une elite de base qui pose un etat aurait rendu
  // l'etat banal, et un etat banal ne se lit plus.
};

/* Etats cote ENNEMI. Ils n'ont pas de `Map` de statuts : la brulure des
   munitions incendiaires et la vulnerabilite du Detonateur vivent depuis le
   depart en deux champs legers (`e.burn`, `e.vulnUntil`), et payer une Map par
   ennemi sur les 200 de l'arene, vingt fois par seconde, pour deux effets qui
   n'en concernent qu'une poignee ne se justifie pas.

   Ce qui compte est qu'il n'existe qu'UNE definition de « cet ennemi est
   affecte par un etat », partagee par toutes les cartes qui la lisent
   (« Catalyseur » aujourd'hui, les suivantes demain) : c'est cette fonction. */
export function enemyStatusMask(e, time) {
  let mask = 0;
  if (e.burn) mask |= statusBit(STATUS_BURN);
  if (e.vulnUntil > time) mask |= statusBit(STATUS_VULN);
  return mask;
}
