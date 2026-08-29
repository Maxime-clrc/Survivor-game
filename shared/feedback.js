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

/* CE QUI NE LEVE RIEN : un nom de recette faux rend `playSound` a `false` et
   l'evenement devient MUET. C'est exactement la classe de bug que `CLAUDE.md`
   appelle « silence », et la seule facon de la voir est de croiser les tables
   avec ce qu'`audio.js` expose.

   Les tables et le bestiaire arrivent en ARGUMENT : ce module ne depend de rien
   et ne va pas commencer ici. Muet = tout va bien, comme `verifierBiomes()`. */
export function verifierFeedback(armes = [], types = [], recettes = []) {
  const soucis = [];
  const dispo = new Set(recettes);

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

  return soucis;
}
