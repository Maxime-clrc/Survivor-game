
import { t } from "/shared/i18n.js";
import { POWERUP_COLOR, EFFECT_COLOR } from "/shared/palette.js";

export const POWERUP_ICON = {
  heal: g => {
    g.fillRect(-1.9, -6, 3.8, 12);
    g.fillRect(-6, -1.9, 12, 3.8);
  },

  damage: g => {
    g.beginPath();
    g.moveTo(0, -7); g.lineTo(2.1, -3.6); g.lineTo(2.1, 2.2);
    g.lineTo(-2.1, 2.2); g.lineTo(-2.1, -3.6);
    g.closePath(); g.fill();
    g.fillRect(-4.6, 2.4, 9.2, 1.8);
    g.fillRect(-1.2, 4.4, 2.4, 2.6);
  },

  rate: g => {
    g.beginPath();
    g.moveTo(1.8, -7); g.lineTo(-4.4, 0.6); g.lineTo(-0.6, 0.6);
    g.lineTo(-1.8, 7);  g.lineTo(4.4, -0.8); g.lineTo(0.6, -0.8);
    g.closePath(); g.fill();
  },

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

  pierce: g => {
    g.lineWidth = 2.2; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(-6.6, 0); g.lineTo(1.4, 0); g.stroke();
    g.beginPath();
    g.moveTo(7, 0); g.lineTo(1.4, -4.2); g.lineTo(1.4, 4.2);
    g.closePath(); g.fill();
    g.globalAlpha *= 0.55;
    g.beginPath(); g.moveTo(-4.4, -3.4); g.lineTo(-1.4, 0); g.lineTo(-4.4, 3.4); g.stroke();
  },

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

  fragment: g => {
    g.beginPath();
    g.moveTo(0, -6.2); g.lineTo(3.4, -0.8); g.lineTo(0, 6.2); g.lineTo(-3.4, -0.8);
    g.closePath(); g.fill();
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.5;
    g.beginPath(); g.moveTo(0, -6.2); g.lineTo(0, 6.2); g.stroke();
    g.globalAlpha = a;
  },

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

/* `nom` EST L'EXPLICATION, et elle tient en deux mots : ce qui se lit au vol au
   moment du ramassage. Un panneau a ouvrir n'existerait pas pour un objet qu'on
   prend en courant. Le francais est ecrit a cote de la donnee et sert de repli,
   la surcharge se fait par cle (`bonus.<type>`). */
export const POWERUP_STYLE = {
  heal:   { color: POWERUP_COLOR.heal, icon: POWERUP_ICON.heal, nom: "soin" },
  damage: { color: POWERUP_COLOR.damage, icon: POWERUP_ICON.damage, nom: "dégâts ×1,8" },
  rate:   { color: POWERUP_COLOR.rate, icon: POWERUP_ICON.rate, nom: "cadence" },
  double: { color: POWERUP_COLOR.double, icon: POWERUP_ICON.double, nom: "canon en plus" },
  shield: { color: POWERUP_COLOR.shield, icon: POWERUP_ICON.shield, nom: "bouclier" },
  slow:   { color: POWERUP_COLOR.slow, icon: POWERUP_ICON.slow, nom: "horde ralentie" },
  pierce: { color: POWERUP_COLOR.pierce, icon: POWERUP_ICON.pierce, nom: "perforant" },
  nova:   { color: POWERUP_COLOR.nova, icon: POWERUP_ICON.nova, nom: "onde de choc" },
  beacon: { color: POWERUP_COLOR.beacon, icon: POWERUP_ICON.beacon, nom: "balise" },
  turret: { color: POWERUP_COLOR.turret, icon: POWERUP_ICON.turret, nom: "tourelle" },
  ricochet: { color: POWERUP_COLOR.ricochet, icon: POWERUP_ICON.ricochet, nom: "ricochet" },
  fragment: { color: POWERUP_COLOR.fragment, icon: POWERUP_ICON.fragment, nom: "éclat" },
  purification: { color: POWERUP_COLOR.purification, icon: POWERUP_ICON.purification, nom: "purification" },
};

export const bonusNom = cle => t(`bonus.${cle}`, POWERUP_STYLE[cle]?.nom ?? "");

/* CE QU UN LOOT AUGMENTE, EN UN SIGNE. Au sol il ne portait que son rang — un a
   trois points — et la couleur de son PROPRIETAIRE : rien sur ce qu il fait, pour
   la seule source de puissance qui coute un DEPLACEMENT.

   NEUF SIGNES POUR SEIZE OBJETS, et c est voulu : ce qui se decide en courant est
   « offensif ou defensif, et sur quel axe », pas le detail du pourcentage — celui-
   la se lit au ramassage et dans la fenetre de build. Les clefs sont celles de
   `LOOT_SIGNES` (`shared/loot.js`), liste FERMEE et verifiee la-bas ; ici on
   dessine, on ne declare pas une seconde fois.

   TROIS SIGNES REPRENNENT UN GLYPHE DE BONUS — degats, cadence, armure — et c est
   la meme raison que la charte : un joueur qui a appris la fleche de cadence sur
   un bonus au sol la relit sur un loot sans rien reapprendre. Les six autres
   n existaient pas. */
export const LOOT_ICON = {
  degats: POWERUP_ICON.damage,
  cadence: POWERUP_ICON.rate,
  armure: POWERUP_ICON.shield,
  zone: POWERUP_ICON.nova,

  // CRITIQUE : un eclat a quatre branches, effile. Ce qui « pique » plutot que ce
  // qui « frappe » — la fleche de cadence et le projectile de degats sont pris.
  critique: g => {
    g.beginPath();
    g.moveTo(0, -7); g.lineTo(1.5, -1.5); g.lineTo(7, 0); g.lineTo(1.5, 1.5);
    g.lineTo(0, 7); g.lineTo(-1.5, 1.5); g.lineTo(-7, 0); g.lineTo(-1.5, -1.5);
    g.closePath(); g.fill();
  },

  // VITESSE : deux chevrons qui filent, et une barre de depart derriere. Meme
  // vocabulaire que le glyphe de dash, parce que c est la meme idee.
  vitesse: g => {
    g.lineWidth = 1.9; g.lineCap = "round"; g.lineJoin = "round";
    for (const dx of [-3.6, 0.4]) {
      g.beginPath();
      g.moveTo(dx, -4.8); g.lineTo(dx + 4.2, 0); g.lineTo(dx, 4.8);
      g.stroke();
    }
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.55;
    g.beginPath(); g.moveTo(-6.4, -3.4); g.lineTo(-6.4, 3.4); g.stroke();
    g.globalAlpha = a;
  },

  // RARETE : une gemme taillee. C est deja la forme de ce qui se ramasse pour sa
  // VALEUR dans ce depot — eclats, cristaux de recolte —, et elle porte l or.
  rarete: g => {
    g.beginPath();
    g.moveTo(0, -6.8); g.lineTo(6.2, -1.8); g.lineTo(3.6, 6.4);
    g.lineTo(-3.6, 6.4); g.lineTo(-6.2, -1.8);
    g.closePath(); g.fill();
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.35;
    g.beginPath();
    g.moveTo(0, -6.8); g.lineTo(-2.6, -1.8); g.lineTo(0, 6.4); g.lineTo(2.6, -1.8);
    g.closePath();
    g.fillStyle = "#000"; g.fill();
    g.globalAlpha = a;
  },

  // ESQUIVE : une silhouette qui SORT du trait — le contour reste, le corps est
  // deja ailleurs. Un bouclier dirait « j encaisse », et c est l inverse.
  esquive: g => {
    g.lineWidth = 1.7; g.lineJoin = "round";
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.45;
    g.beginPath(); g.arc(-3.4, 0, 3.6, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = a;
    g.beginPath(); g.arc(3.2, 0, 3.6, 0, Math.PI * 2); g.fill();
    g.lineWidth = 1.5; g.lineCap = "round";
    g.beginPath();
    g.moveTo(-6.6, -5.6); g.lineTo(-4.4, -5.6);
    g.moveTo(-6.6, 5.6); g.lineTo(-4.4, 5.6);
    g.stroke();
  },

  // VOL DE VIE : une goutte, et la croix de soin dedans. Le glyphe de soin seul
  // dirait « on te rend des PV » ; ici ils sont PRIS a quelqu un.
  vol: g => {
    g.beginPath();
    g.moveTo(0, -7);
    g.bezierCurveTo(4.6, -2.2, 6, 0.8, 6, 2.6);
    g.bezierCurveTo(6, 5.8, 3.2, 7.4, 0, 7.4);
    g.bezierCurveTo(-3.2, 7.4, -6, 5.8, -6, 2.6);
    g.bezierCurveTo(-6, 0.8, -4.6, -2.2, 0, -7);
    g.closePath(); g.fill();
    const a = g.globalAlpha;
    g.globalAlpha = a * 0.9;
    g.fillStyle = "#000";
    g.fillRect(-0.9, -0.4, 1.8, 5.6);
    g.fillRect(-2.9, 1.6, 5.8, 1.8);
    g.globalAlpha = a;
  },
};

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

export const STATUS_ICON = [
  g => {
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(0, -6); g.lineTo(5, -3.4); g.lineTo(5, 1.6);
    g.lineTo(0, 6); g.lineTo(-5, 1.6); g.lineTo(-5, -3.4);
    g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(-1.6, -4.6); g.lineTo(1.4, 0); g.lineTo(-1.4, 5);
    g.stroke();
  },
  g => {
    g.beginPath();
    g.moveTo(0, -6.4);
    g.bezierCurveTo(4.4, -1.6, 4, 5.4, 0, 5.4);
    g.bezierCurveTo(-4, 5.4, -4.4, -1, 0, -6.4);
    g.closePath(); g.fill();
  },
  g => {
    g.lineWidth = 1.8; g.lineCap = "round";
    g.beginPath(); g.arc(-2.6, -2.6, 3, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(2.6, 2.6, 3, 0, Math.PI * 2); g.stroke();
  },
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

// LES COMPETENCES MERITENT LE MEME TRAITEMENT QUE LES BONUS AU SOL. Une lettre
// dans une case est un raccourci clavier, pas une icone : elle ne se reconnait
// pas du coin de l'oeil, et c'est justement la seule facon dont on regarde ses
// recharges. La touche reste ecrite, en petit, dans un coin.
// Cle = `${classe}${rang}`, plus `dash`. Rang 0 et 1 = les deux competences,
// rang 2 = l'ultime.
export const SKILL_ICON = {
  dash: g => {
    g.lineWidth = 1.7; g.lineCap = "round";
    for (const dx of [-4.4, -0.6]) {
      g.beginPath();
      g.moveTo(dx, -4.4); g.lineTo(dx + 4, 0); g.lineTo(dx, 4.4);
      g.stroke();
    }
    g.globalAlpha *= 0.5;
    g.beginPath(); g.moveTo(-6.6, -3); g.lineTo(-6.6, 3); g.stroke();
  },

  // REMPART : un mur bombe, vu de face
  tank0: g => {
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(-6, 4.6); g.lineTo(-6, -1.4);
    g.bezierCurveTo(-3, -6.4, 3, -6.4, 6, -1.4);
    g.lineTo(6, 4.6);
    g.stroke();
    g.fillRect(-6.4, 4.4, 12.8, 2);
  },

  // PROVOCATION : l'onde qui part du porteur
  tank1: g => {
    g.beginPath(); g.arc(0, 0, 2.2, 0, Math.PI * 2); g.fill();
    g.lineWidth = 1.5;
    for (const r of [4.4, 6.8]) {
      g.beginPath(); g.arc(0, 0, r, -0.9, 0.9); g.stroke();
      g.beginPath(); g.arc(0, 0, r, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
    }
  },

  // ANCRE : elle se plante et elle tient
  tank2: g => {
    g.lineWidth = 1.8; g.lineCap = "round";
    g.beginPath(); g.arc(0, -4.4, 2, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, -2.4); g.lineTo(0, 5.4); g.stroke();
    g.beginPath(); g.moveTo(-4.4, -0.6); g.lineTo(4.4, -0.6); g.stroke();
    g.beginPath();
    g.moveTo(-5.4, 1.6); g.bezierCurveTo(-5, 6, 5, 6, 5.4, 1.6);
    g.stroke();
  },

  // MODE SOIN : la croix, dans la bande du lien
  soigneur0: g => {
    g.fillRect(-1.7, -6, 3.4, 12);
    g.fillRect(-6, -1.7, 12, 3.4);
  },

  // VAGUE DE SOIN : la croix, portee par deux ondes qui s'ecartent
  soigneur1: g => {
    g.fillRect(-1.5, -6.6, 3, 6.6);
    g.fillRect(-4.3, -4.8, 8.6, 3);
    g.lineWidth = 1.6;
    g.beginPath(); g.arc(0, -1.2, 5.2, 0.42, Math.PI - 0.42); g.stroke();
    g.beginPath(); g.arc(0, -1.2, 7.6, 0.58, Math.PI - 0.58); g.stroke();
  },

  // SANCTUAIRE : le dome, et ce qu'il abrite
  soigneur2: g => {
    g.lineWidth = 1.8;
    g.beginPath(); g.arc(0, 3, 6.4, Math.PI, 0); g.stroke();
    g.beginPath(); g.moveTo(-7.4, 3); g.lineTo(7.4, 3); g.stroke();
    g.fillRect(-1.2, -2.4, 2.4, 4.4);
    g.fillRect(-3.2, -1.2, 6.4, 2);
  },

  // BOMBE : la charge et sa meche
  dps0: g => {
    g.beginPath(); g.arc(0, 1.8, 4.8, 0, Math.PI * 2); g.fill();
    g.lineWidth = 1.5; g.lineCap = "round";
    g.beginPath();
    g.moveTo(1.6, -2.6); g.bezierCurveTo(4.4, -5, 5.4, -6.4, 4.6, -7);
    g.stroke();
  },

  // SURCHARGE : l'eclair
  dps1: g => {
    g.beginPath();
    g.moveTo(1.6, -7); g.lineTo(-4.6, 0.8); g.lineTo(-0.4, 0.8);
    g.lineTo(-1.6, 7); g.lineTo(4.6, -1); g.lineTo(0.4, -1);
    g.closePath(); g.fill();
  },

  // SALVE : trois pointes qui divergent, la gerbe
  dps2: g => {
    g.lineWidth = 1.5; g.lineCap = "round";
    for (const a of [-0.62, 0, 0.62]) {
      const dx = Math.sin(a), dy = -Math.cos(a);
      const nx = -dy, ny = dx;
      g.beginPath();
      g.moveTo(dx * -6.4, dy * -6.4);
      g.lineTo(dx * 2.6, dy * 2.6);
      g.stroke();
      g.beginPath();
      g.moveTo(dx * 6.6, dy * 6.6);
      g.lineTo(dx * 2.4 + nx * 2.1, dy * 2.4 + ny * 2.1);
      g.lineTo(dx * 2.4 - nx * 2.1, dy * 2.4 - ny * 2.1);
      g.closePath(); g.fill();
    }
  },
};

export const SRC_ICON = [
  g => {
    g.lineWidth = 2; g.lineCap = "round";
    g.beginPath();
    g.moveTo(-5, -6); g.lineTo(-1.5, 0); g.lineTo(-5, 6);
    g.stroke();
    g.beginPath();
    g.moveTo(5, -6); g.lineTo(1.5, 0); g.lineTo(5, 6);
    g.stroke();
  },
  g => {
    g.beginPath();
    g.moveTo(6.5, 0); g.lineTo(0, -3); g.lineTo(-6.5, 0); g.lineTo(0, 3);
    g.closePath(); g.fill();
  },
  g => {
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, 1, 6.5, 3.6, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(0, 1, 2.4, 1.3, 0, 0, Math.PI * 2); g.fill();
  },
  g => {
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(0, -6.5); g.lineTo(6.5, 0); g.lineTo(0, 6.5); g.lineTo(-6.5, 0);
    g.closePath(); g.stroke();
    g.fillRect(-1, -3.4, 2, 4.6);
    g.fillRect(-1, 3, 2, 2);
  },
  g => {
    g.beginPath();
    g.moveTo(0, -6.4);
    g.bezierCurveTo(4.4, -1.6, 4, 5.4, 0, 5.4);
    g.bezierCurveTo(-4, 5.4, -4.4, -1, 0, -6.4);
    g.closePath(); g.fill();
  },
  g => {
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
  g => {
    g.lineWidth = 2; g.lineCap = "round";
    g.beginPath();
    g.moveTo(-6.5, 5.5); g.lineTo(-3, 2.5);
    g.moveTo(6.5, 5.5); g.lineTo(3, 2.5);
    g.stroke();
    g.beginPath();
    g.moveTo(0, 4); g.lineTo(0, -6.5);
    g.moveTo(-2.6, 1.5); g.lineTo(-4, -4.5);
    g.moveTo(2.6, 1.5); g.lineTo(4, -4.5);
    g.stroke();
  },
];

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

const ICON_KEYS = new Map();
let iconSeq = 0;
function iconKey(icon) {
  let k = ICON_KEYS.get(icon);
  if (k === undefined) { k = ++iconSeq; ICON_KEYS.set(icon, k); }
  return k;
}
