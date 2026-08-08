/* ===========================================================================
   ICONES — glyphes de bonus, d'effets possedes et d'etats.

   Module PUR au sens du depot : il ne connait ni le reseau, ni le DOM du jeu,
   ni le contexte de rendu de l'arene. Chaque icone est une fonction de trace
   dans une boite de +-7 autour de l'origine ; la couleur est posee par
   l'appelant.

   Pourquoi un module a part : depuis que le HUD est sorti du canvas, les memes
   glyphes sont dessines a DEUX endroits — dans l'arene (bonus au sol, halos
   d'etat) et dans le HUD en DOM (bande d'effets, ligne d'equipe). Recopier
   trois cents lignes de traces pour la seconde moitie les aurait fait diverger
   au premier reglage, exactement comme deux listes de couleurs.
   =========================================================================== */

import { POWERUP_COLOR, EFFECT_COLOR } from "/shared/palette.js";

/* Icones de bonus : dessinees dans une boite de +-7 autour de l'origine, la
   couleur de trait et de remplissage est posee par l'appelant. */
export const POWERUP_ICON = {
  // croix de soin
  heal: g => {
    g.fillRect(-1.9, -6, 3.8, 12);
    g.fillRect(-6, -1.9, 12, 3.8);
  },

  // epee : degats accrus
  damage: g => {
    g.beginPath();
    g.moveTo(0, -7); g.lineTo(2.1, -3.6); g.lineTo(2.1, 2.2);
    g.lineTo(-2.1, 2.2); g.lineTo(-2.1, -3.6);
    g.closePath(); g.fill();
    g.fillRect(-4.6, 2.4, 9.2, 1.8);
    g.fillRect(-1.2, 4.4, 2.4, 2.6);
  },

  // eclair : cadence de tir
  rate: g => {
    g.beginPath();
    g.moveTo(1.8, -7); g.lineTo(-4.4, 0.6); g.lineTo(-0.6, 0.6);
    g.lineTo(-1.8, 7);  g.lineTo(4.4, -0.8); g.lineTo(0.6, -0.8);
    g.closePath(); g.fill();
  },

  // deux projectiles : tir double
  double: g => {
    for (const dx of [-3.4, 3.4]) {
      g.beginPath();
      g.moveTo(dx, -3.6); g.lineTo(dx, 3.6);
      g.lineWidth = 3.4; g.lineCap = "round"; g.stroke();
      g.beginPath();
      g.moveTo(dx, -6.6); g.lineTo(dx + 1.8, -3.4); g.lineTo(dx - 1.8, -3.4);
      g.closePath(); g.fill();
    }
  },

  // ecu : bouclier
  shield: g => {
    g.beginPath();
    g.moveTo(0, -6.6);
    g.lineTo(6, -4);
    g.bezierCurveTo(6, 2.2, 3.4, 5.4, 0, 6.9);
    g.bezierCurveTo(-3.4, 5.4, -6, 2.2, -6, -4);
    g.closePath();
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.4; g.fill(); g.globalAlpha = a;
    g.lineWidth = 2; g.lineJoin = "round"; g.stroke();
    g.beginPath();
    g.moveTo(0, -4.4); g.lineTo(0, 4.2);
    g.lineWidth = 1.6; g.stroke();
  },

  // sablier : ralentissement
  slow: g => {
    g.beginPath();
    g.moveTo(-4.6, -5.4); g.lineTo(4.6, -5.4); g.lineTo(0, 0);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(-4.6, 5.4); g.lineTo(4.6, 5.4); g.lineTo(0, 0);
    g.closePath(); g.fill();
    g.fillRect(-5.6, -7, 11.2, 1.7);
    g.fillRect(-5.6, 5.3, 11.2, 1.7);
  },

  // fleche transpercante : perforation
  pierce: g => {
    g.lineWidth = 2.2; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(-6.6, 0); g.lineTo(1.4, 0); g.stroke();
    g.beginPath();
    g.moveTo(7, 0); g.lineTo(1.4, -4.2); g.lineTo(1.4, 4.2);
    g.closePath(); g.fill();
    g.globalAlpha *= 0.55;
    g.beginPath(); g.moveTo(-4.4, -3.4); g.lineTo(-1.4, 0); g.lineTo(-4.4, 3.4); g.stroke();
  },

  // chevrons montants dans un halo : balise de resurrection
  beacon: g => {
    g.lineWidth = 1.6; g.lineCap = "round"; g.lineJoin = "round";
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.45;
    g.beginPath(); g.arc(0, 1.5, 6.8, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    g.globalAlpha = a;
    g.beginPath();
    g.moveTo(-4.2, -0.6); g.lineTo(0, -5.2); g.lineTo(4.2, -0.6);
    g.stroke();
    g.beginPath();
    g.moveTo(-4.2, 4); g.lineTo(0, -0.6); g.lineTo(4.2, 4);
    g.stroke();
    g.beginPath(); g.arc(0, 6, 1.5, 0, Math.PI * 2); g.fill();
  },

  // socle et canon : tourelle
  turret: g => {
    g.beginPath();
    g.moveTo(-6.4, 3); g.lineTo(6.4, 3); g.lineTo(4.6, 6.6); g.lineTo(-4.6, 6.6);
    g.closePath(); g.fill();
    g.beginPath(); g.arc(0, 0.4, 3.6, 0, Math.PI * 2); g.fill();
    g.fillRect(-1.5, -7, 3, 5.2);
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.5;
    g.lineWidth = 1.4;
    g.beginPath(); g.arc(0, 0.4, 7.4, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
    g.globalAlpha = a;
  },

  // trait qui rebondit entre deux cibles : ricochet
  ricochet: g => {
    g.lineWidth = 1.9; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath();
    g.moveTo(-6.8, -4.4); g.lineTo(1.4, 0.6); g.lineTo(-3.6, 4.6);
    g.stroke();
    g.beginPath(); g.arc(5.2, -1.4, 2.3, 0, Math.PI * 2); g.fill();
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.55;
    g.beginPath(); g.moveTo(1.4, 0.6); g.lineTo(5.2, -1.4); g.stroke();
    g.globalAlpha = a;
  },

  // etoile rayonnante : nova
  nova: g => {
    g.lineWidth = 1.8; g.lineCap = "round";
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const len = i % 2 ? 5.4 : 7.2;
      g.moveTo(Math.cos(a) * 2.8, Math.sin(a) * 2.8);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    }
    g.stroke();
    g.beginPath(); g.arc(0, 0, 2.3, 0, Math.PI * 2); g.fill();
  },

  // eclat facette : fragment de soin laisse par la carte Recolte — plus petit
  // que la croix de heal pour qu'on le reconnaisse comme un sous-produit et
  // non comme le vrai bonus de soin
  fragment: g => {
    g.beginPath();
    g.moveTo(0, -6.2); g.lineTo(3.4, -0.8); g.lineTo(0, 6.2); g.lineTo(-3.4, -0.8);
    g.closePath(); g.fill();
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.5;
    g.beginPath(); g.moveTo(0, -6.2); g.lineTo(0, 6.2); g.stroke();
    g.globalAlpha = a;
  },

  // goutte dans un cercle : purification. Elle ne ressemble a aucune icone de
  // soin — le bonus ne rend pas de PV, et le confondre avec le heal ferait
  // courir dessus au mauvais moment.
  purification: g => {
    g.lineWidth = 1.8;
    g.beginPath(); g.arc(0, 0, 6.6, 0, Math.PI * 2); g.stroke();
    g.beginPath();
    g.moveTo(0, -4.4);
    g.bezierCurveTo(3.4, -0.6, 3.2, 3.4, 0, 3.4);
    g.bezierCurveTo(-3.2, 3.4, -3.4, -0.6, 0, -4.4);
    g.closePath(); g.fill();
  },
};

export const POWERUP_STYLE = {
  heal:   { color: POWERUP_COLOR.heal, icon: POWERUP_ICON.heal   },
  damage: { color: POWERUP_COLOR.damage, icon: POWERUP_ICON.damage },
  rate:   { color: POWERUP_COLOR.rate, icon: POWERUP_ICON.rate   },
  double: { color: POWERUP_COLOR.double, icon: POWERUP_ICON.double },
  shield: { color: POWERUP_COLOR.shield, icon: POWERUP_ICON.shield },
  slow:   { color: POWERUP_COLOR.slow, icon: POWERUP_ICON.slow   },
  pierce: { color: POWERUP_COLOR.pierce, icon: POWERUP_ICON.pierce },
  nova:   { color: POWERUP_COLOR.nova, icon: POWERUP_ICON.nova   },
  beacon: { color: POWERUP_COLOR.beacon, icon: POWERUP_ICON.beacon },
  turret: { color: POWERUP_COLOR.turret, icon: POWERUP_ICON.turret },
  ricochet: { color: POWERUP_COLOR.ricochet, icon: POWERUP_ICON.ricochet },
  // teinte proche du heal mais distincte : c'est un sous-produit de la
  // Recolte, pas le vrai bonus de soin, et les deux peuvent trainer au sol
  // en meme temps.
  fragment: { color: POWERUP_COLOR.fragment, icon: POWERUP_ICON.fragment },
  // Blanc bleute, la seule teinte qui ne soit prise par aucun etat : c'est le
  // bonus qui les efface, il ne doit ressembler a aucun d'eux.
  purification: { color: POWERUP_COLOR.purification, icon: POWERUP_ICON.purification },
};

/* --- effets possedes -----------------------------------------------------------

   Bande d'icones permanentes : UN effet par carte possedee qui a une
   manifestation en jeu. C'est la source de verite de « qu'est-ce que je
   possede », independante de ce qu'on arrive a voir dans l'arene — et c'est
   exactement ce qui manquait : deux cartes qui se dessinent au meme endroit
   (lames orbitales et champ de givre) laissaient un joueur ignorer pendant
   toute une manche qu'il en avait pris une.

   La liste est VOLONTAIREMENT courte. Une icone par carte possedee aurait
   redonne le panneau Tab en plus petit et en permanence : on ne garde que les
   cartes qui produisent quelque chose de visible dans l'arene, celles dont on
   peut se demander « est-ce que je l'ai vraiment ». Les gains chiffres
   (Affutage, Cuir) n'y sont pas — ils n'ont rien a voir a l'ecran.

   Purement CLIENT, comme les sons et les glyphes de marqueur : la liste des
   cartes possedees est deja diffusee, un registre de plus sur le reseau ne
   dirait rien que le client ne sache. */
export const EFFECT_BADGES = [
  { id: "orbiteurs", nom: "lames", color: EFFECT_COLOR.orbiteurs,
    icon: g => {
      g.lineWidth = 1.4;
      g.beginPath(); g.arc(0, 0, 5.4, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(5.4, -2.2); g.lineTo(9, 0); g.lineTo(5.4, 2.2);
      g.closePath(); g.fill();
    } },
  { id: "givre", nom: "givre", color: EFFECT_COLOR.givre,
    icon: g => {
      g.lineWidth = 1.5; g.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        g.beginPath();
        g.moveTo(-Math.cos(a) * 6, -Math.sin(a) * 6);
        g.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
        g.stroke();
      }
      g.lineCap = "butt";
    } },
  { id: "drone", nom: "drone", color: EFFECT_COLOR.drone,
    icon: g => {
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-7, -4); g.lineTo(-3, -1);
      g.moveTo(7, -4); g.lineTo(3, -1); g.stroke();
    } },
  { id: "essaim", nom: "essaim", color: EFFECT_COLOR.essaim,
    icon: g => {
      for (const [dx, dy] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
        g.beginPath(); g.arc(dx, dy, 2, 0, Math.PI * 2); g.fill();
      }
    } },
  { id: "pulsar", nom: "pulsar", color: EFFECT_COLOR.pulsar,
    icon: g => {
      g.lineWidth = 1.4;
      g.beginPath(); g.arc(0, 0, 2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 0.5;
      g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 1;
    } },
  { id: "bouclierRegen", nom: "bouclier", color: EFFECT_COLOR.bouclierRegen,
    icon: POWERUP_ICON.shield },
  { id: "vampirisme", nom: "vampirisme", color: EFFECT_COLOR.vampirisme,
    icon: g => {
      g.beginPath();
      g.moveTo(0, 6.4);
      g.bezierCurveTo(-5.4, 0.6, -3.4, -6.4, 0, -6.4);
      g.bezierCurveTo(3.4, -6.4, 5.4, 0.6, 0, 6.4);
      g.closePath(); g.fill();
    } },
  /* « Vif-argent » n'a pas d'effet dessine a lui : la trainee se confond avec
     le sillage d'esquive que tout le monde laisse. C'est exactement le cas que
     cette bande couvre — un effet qu'on possede sans pouvoir le distinguer a
     l'ecran. */
  { id: "vif_argent", nom: "traînée", color: EFFECT_COLOR.vif_argent,
    icon: g => {
      g.lineWidth = 1.6; g.lineCap = "round";
      for (const dy of [-3.4, 0, 3.4]) {
        g.beginPath(); g.moveTo(-7, dy); g.lineTo(3 - Math.abs(dy) * 0.6, dy); g.stroke();
      }
      g.lineCap = "butt";
      g.beginPath(); g.moveTo(4, -5); g.lineTo(9, 0); g.lineTo(4, 5);
      g.closePath(); g.fill();
    } },
];

/* --- etats ---------------------------------------------------------------------

   Une icone par etat, dessinee au trait comme celles des bonus. Sans lecture
   instantanee de l'etat des allies, la classe de soigneur est injouable : c'est
   pour ca que ce lot livre l'affichage en meme temps que la mecanique et non
   dans une passe de finition. */
export const STATUS_ICON = [
  // Vulnerabilite : bouclier fendu.
  g => {
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(0, -6); g.lineTo(5, -3.4); g.lineTo(5, 1.6);
    g.lineTo(0, 6); g.lineTo(-5, 1.6); g.lineTo(-5, -3.4);
    g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(-1.6, -4.6); g.lineTo(1.4, 0); g.lineTo(-1.4, 5);
    g.stroke();
  },
  // Brulure : flamme.
  g => {
    g.beginPath();
    g.moveTo(0, -6.4);
    g.bezierCurveTo(4.4, -1.6, 4, 5.4, 0, 5.4);
    g.bezierCurveTo(-4, 5.4, -4.4, -1, 0, -6.4);
    g.closePath(); g.fill();
  },
  // Entrave : chaine / maillon barre.
  g => {
    g.lineWidth = 1.8; g.lineCap = "round";
    g.beginPath(); g.arc(-2.6, -2.6, 3, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(2.6, 2.6, 3, 0, Math.PI * 2); g.stroke();
  },
  // Sentence : sablier.
  g => {
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(-4.4, -6); g.lineTo(4.4, -6); g.lineTo(-4.4, 6); g.lineTo(4.4, 6);
    g.closePath(); g.stroke();
    g.beginPath();
    g.moveTo(-2.6, -4.2); g.lineTo(2.6, -4.2); g.lineTo(0, -0.6);
    g.closePath(); g.fill();
  },
];

/* --- provenance des degats subis -----------------------------------------------

   Un glyphe par entree de `DAMAGE_SOURCES` (game_state.js), dans le MEME ORDRE :
   l'index circule dans le snapshot, une icone inseree au milieu ferait mentir
   tous les chiffres rouges d'un coup.

   Ils sont volontairement plus SIMPLES que les icones d'etat : ils apparaissent
   a cote d'un nombre de treize pixels, pendant une demi-seconde, et se lisent
   en vision peripherique. Un glyphe detaille a cette taille est un pate. */
export const SRC_ICON = [
  // Contact : deux mandibules qui se ferment. C'est la horde.
  g => {
    g.lineWidth = 2; g.lineCap = "round";
    g.beginPath();
    g.moveTo(-5, -6); g.lineTo(-1.5, 0); g.lineTo(-5, 6);
    g.stroke();
    g.beginPath();
    g.moveTo(5, -6); g.lineTo(1.5, 0); g.lineTo(5, 6);
    g.stroke();
  },
  // Projectile : le losange du tir hostile, exactement la forme qu'on voit voler.
  g => {
    g.beginPath();
    g.moveTo(6.5, 0); g.lineTo(0, -3); g.lineTo(-6.5, 0); g.lineTo(0, 3);
    g.closePath(); g.fill();
  },
  // Zone au sol : un disque au trait, pose a plat.
  g => {
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, 1, 6.5, 3.6, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(0, 1, 2.4, 1.3, 0, 0, Math.PI * 2); g.fill();
  },
  // Mecanique : le losange d'alerte. C'est le signe des annonces du boss.
  g => {
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(0, -6.5); g.lineTo(6.5, 0); g.lineTo(0, 6.5); g.lineTo(-6.5, 0);
    g.closePath(); g.stroke();
    g.fillRect(-1, -3.4, 2, 4.6);
    g.fillRect(-1, 3, 2, 2);
  },
  // Brulure : la meme flamme que l'etat. Deux dessins pour la meme chose se
  // seraient decorreles au premier reglage.
  g => {
    g.beginPath();
    g.moveTo(0, -6.4);
    g.bezierCurveTo(4.4, -1.6, 4, 5.4, 0, 5.4);
    g.bezierCurveTo(-4, 5.4, -4.4, -1, 0, -6.4);
    g.closePath(); g.fill();
  },
  /* Explosion (lot S). Une etoile a huit branches inegales — c'est la seule
     forme du registre dont le contour part dans toutes les directions, et elle
     se distingue du disque a plat de la zone au sol, qui est justement la
     provenance avec laquelle on risquait de la confondre. Les branches sont
     inegales et TOUJOURS les memes : une etoile reguliere se lit comme un
     symbole, une etoile irreguliere comme un eclatement. */
  g => {
    // Huit pointes, donc SEIZE sommets : une pointe et un creux en alternance.
    // Sans les creux, les rayons inegaux ne donnent qu'un polygone bosselé.
    const tips = [6.9, 5.6, 7.2, 5.9, 6.6, 5.4, 7, 6];
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? tips[i / 2] : 2.6;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath(); g.fill();
  },
  /* Environnement (lot V). Un JET qui monte entre deux levres — la bouche du
     geyser vue de cote. C'est la seule forme du registre qui pointe VERS LE
     HAUT, et c'est ce qui la separe du disque a plat de la zone au sol, la
     provenance avec laquelle on la confondrait sinon : l'une est une flaque
     posee par un boss, l'autre fait partie de la carte et sera encore la au
     meme endroit dans dix minutes. La conduite a tenir differe, donc le glyphe
     aussi. */
  g => {
    g.lineWidth = 2; g.lineCap = "round";
    // Les deux levres, en bas : c'est la geometrie PERMANENTE, celle qu'on
    // apprend a reconnaitre au sol.
    g.beginPath();
    g.moveTo(-6.5, 5.5); g.lineTo(-3, 2.5);
    g.moveTo(6.5, 5.5); g.lineTo(3, 2.5);
    g.stroke();
    // Le jet, en trois traits qui s'ecartent vers le haut.
    g.beginPath();
    g.moveTo(0, 4); g.lineTo(0, -6.5);
    g.moveTo(-2.6, 1.5); g.lineTo(-4, -4.5);
    g.moveTo(2.6, 1.5); g.lineTo(4, -4.5);
    g.stroke();
  },
];

/* Pose un glyphe centre sur (x, y) dans le contexte fourni. Point de passage
   unique du trace : l'arene et le HUD passent tous les deux par ici, sinon
   deux reglages de graisse de trait cohabiteraient. */
export function paintIcon(g, icon, color, x, y, scale, opacite = 1) {
  if (!icon) return;
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  g.globalAlpha = opacite;
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.lineCap = "butt";
  g.lineJoin = "miter";
  icon(g);
  g.restore();
}

/* Le meme glyphe, mais destine au DOM. Le HUD est en elements CSS depuis ce
   lot, et il ne sait pas dessiner un trace.

   Une IMAGE et non un canvas : le HUD reconstruit ses rangees d'icones a
   chaque changement de chargement, et `cloneNode` sur un <canvas> recopie
   l'element sans son contenu — on aurait affiche des carres vides. Une image
   se duplique avec son dessin, et son adresse `data:` est mise en cache par
   (glyphe, couleur, taille) : le trace n'est fait qu'une fois. */
const ICON_CACHE = new Map();

function iconData(icon, color, px) {
  const key = `${iconKey(icon)}|${color}|${px}`;
  let url = ICON_CACHE.get(key);
  if (url) return url;

  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const c = document.createElement("canvas");
  c.width = Math.round(px * dpr);
  c.height = Math.round(px * dpr);
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  // La boite de trace fait 14 unites de cote (+-7) : l'echelle ramene le
  // glyphe a la taille demandee sans le rogner.
  paintIcon(g, icon, color, px / 2, px / 2, px / 16);
  url = c.toDataURL();
  ICON_CACHE.set(key, url);
  return url;
}

export function iconImg(icon, color, px = 16) {
  const img = new Image(px, px);
  img.src = iconData(icon, color, px);
  img.alt = "";
  return img;
}

/* Les fonctions de trace sont anonymes : sans identifiant stable, deux glyphes
   differents de meme couleur et de meme taille se seraient partage une entree
   de cache. On leur en attribue un a la volee, une seule fois. */
const ICON_KEYS = new Map();
let iconSeq = 0;
function iconKey(icon) {
  let k = ICON_KEYS.get(icon);
  if (k === undefined) { k = ++iconSeq; ICON_KEYS.set(icon, k); }
  return k;
}
