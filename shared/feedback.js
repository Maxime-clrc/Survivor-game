/* ===========================================================================
   LA FICHE DE RETOUR D'UNE ARME. Module pur, sur le modele de `palette.js` et
   `units.js` : il ne depend de RIEN et ne connait ni le DOM ni le reseau.

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
const BOUCHE = (long, large, vie, fumee, douille, etincelles, recul) =>
  ({ long, large, vie, fumee, douille, etincelles, recul });

export const FEEDBACK = {
  [FAM_BALISTIQUE]: { son: "tir",      jitter: 0.07,
                      bouche: BOUCHE(15, 8, 0.045, 0, 1, 2, 3.4) },
  [FAM_DISPERSION]: { son: "tirGerbe", jitter: 0.05,
                      bouche: BOUCHE(20, 23, 0.075, 2, 1, 5, 8.0) },
  [FAM_RAIL]:       { son: "tirRail",  jitter: 0.03,
                      bouche: BOUCHE(48, 5, 0.060, 0, 0, 3, 7.0) },
  [FAM_EXPLOSIF]:   { son: "tirLourd", jitter: 0.05,
                      bouche: BOUCHE(12, 13, 0.065, 3, 0, 1, 2.6) },
  [FAM_OBUS]:       { son: "tirObus",  jitter: 0.04,
                      bouche: BOUCHE(25, 16, 0.070, 2, 1, 3, 7.5) },
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
