/* ===========================================================================
   UNITES D'AFFICHAGE — module pur, importe par `cards.js`, `classes.js` et le
   client. Comme eux, il ne depend de RIEN : c'est ce qui permet de l'importer
   depuis n'importe quel module partage sans creer de cycle.

   LA SIMULATION RESTE EN PIXELS. Ce module ne sert qu'a ecrire un texte
   destine a un joueur. Le pixel n'est pas une unite de jeu : il depend de la
   resolution, il ne se compare a rien, et « ramasse les bonus a 120 px » n'aide
   personne a choisir entre deux cartes.

   NE JAMAIS convertir une constante de `CFG`, `CARD_CFG`, `SKILL_CFG`,
   `STATUS_CFG` ou `BOSS_CFG` : elles sont lues par la simulation, et une
   conversion appliquee la casserait tout l'equilibrage d'un coup.
   =========================================================================== */

/* 20 px/m. Le facteur n'a pas ete choisi rond pour lui-meme : c'est celui qui
   fait tomber juste a la fois l'arene et les rayons existants. 1600 x 900
   donne 80 x 45 m, soit une salle plausible ; 74 px de lames orbitales font
   3,7 m, 160 px de givre 8 m, 400 px de provocation 20 m. Un facteur de 25 ou
   de 16 aurait donne des decimales partout pour la meme lisibilite. */
export const PX_PER_M = 20;

export const toM = px => px / PX_PER_M;

/* Une decimale sous 10 m, un entier au-dela : « 4,4 m » est une distance qu'on
   se represente, alors que « 21,5 m » ne se distingue pas de « 21 m » quand on
   lit une carte en trente secondes. Virgule et non point : c'est une chaine
   AFFICHEE au joueur, elle suit la typographie francaise comme le reste. */
export function fmtM(px) {
  const m = px / PX_PER_M;
  // Arrondi et non `toFixed` : « 8,0 m » se lit comme une precision qu'on n'a
  // pas, alors que le rayon fait exactement huit metres.
  const v = m < 10 ? Math.round(m * 10) / 10 : Math.round(m);
  return String(v).replace(".", ",") + " m";
}
