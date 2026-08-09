/* ===========================================================================
   LE MONDE — zones, projectiles, structures, ennemis, bonus
   Tout ce qui vit dans l'arene sans etre ni le sol, ni un joueur, ni le boss.
   =========================================================================== */

import { POWERUP_ICON, POWERUP_STYLE, paintIcon } from "/icons.js";
import { RARITY_COLOR } from "/shared/cards.js";
import { SKILL_CFG } from "/shared/classes.js";
import { TRAIT_AURA, TRAIT_CFG, hasTrait } from "/shared/enemies.js";
import { CFG, ENEMY_TYPES, POWERUP_TYPES, traitsOf } from "/shared/game_state.js";
import { BOSS, CLASS_COLOR, ENEMY, FX, OWNED, SURFACE, ZONE, alpha } from "/shared/palette.js";
import { drawSprite, frameOf } from "/sprites.js";
import { EMPTY_SET, bombReadyAt, difficulty, myId } from "../core/state.js";
import { ENEMY_TINT, paintPowerupIcon } from "../net/interp.js";
import { BURST_MAX, HIT_FLASH, HIT_KICK, PARTICLE_MAX, ZONE_FX_MAX, bursts, hits, particles, setZoneFx, zoneFx } from "./fx.js";
import { ELITE_GOLD, camera, ctx, inView, ownerColorOf } from "./stage.js";

/* FLECHES DE COEQUIPIER (lot I). Pour chaque allie hors du rectangle de vue,
   une fleche au bord de l'ecran pointe vers lui, dans SA couleur, avec la
   distance en metres — l'unite de toutes les distances affichees du jeu. La
   position est la projection du vecteur (centre de vue -> allie) sur le
   rectangle de vue retreci d'une marge : la fleche longe le bord, elle ne le
   quitte jamais. Un allie a terre pulse : c'est lui qu'on va chercher. */
export const ARROW_MARGIN = 34;
/* TRAINEES DE PROJECTILE. Le sprite est etire dans son axe, plus une copie a
   30 % d'opacite un cran en arriere : c'est ce qui fait la difference entre une
   balle et un point qui saute d'un endroit a l'autre.

   La direction n'est PAS transmise — les projectiles ne portent que leur
   position, pour la meme raison qu'ils ne portent pas leur proprietaire : un
   champ de plus sur quatre cents balles en vol, vingt fois par seconde. On la
   deduit de l'image precedente, ce qui est exact des le second instantane.

   La TAILLE DE COLLISION ne change pas : elle vit dans la simulation, et un
   projectile qu'on voit plus long que ce qu'il touche est un mensonge dans le
   sens qui pardonne — c'est le seul sens autorise. */
export const bulletTrail = new Map();
export const shotTrail = new Map();
/* LUEUR ADDITIVE. Ce que la bascule a debloque et qui ne servait pas encore :
   un halo qui s'AJOUTE au fond au lieu de le recouvrir. Sur le sol ardoise, dix
   balles groupees se lisent alors comme une gerbe lumineuse et non comme dix
   pastilles, et le tir du soigneur se distingue du tir normal a la luminosite
   autant qu'a la teinte.
   Elle est UNIFORME et non proportionnelle aux degats, contrairement a ce que
   le plan proposait : un projectile ne transporte pas son proprietaire ni ses
   degats, et un champ de plus sur les quatre cents balles en vol, vingt fois
   par seconde, coute plus que l'effet ne rapporte — c'est exactement la raison
   pour laquelle `bd` existe cote boss. */
function boltGlow(b, r, col) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = alpha(col, 0.16);
  ctx.beginPath(); ctx.arc(b.x, b.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/* LOSANGE ETIRE : la forme du projectile HOSTILE. La couleur seule ne suffit
   pas — a 220 ennemis elle se noie, et c'est exactement le moment ou il faut
   distinguer ce qu'on tire de ce qu'on recoit. Une forme, elle, survit a la
   saturation : elle reste lisible en vision peripherique et pour un daltonien.

   Il est trace dans l'axe de vol, comme la capsule du tir allie, et sur le meme
   demi-grand-axe : la taille de collision ne change pas, seule la silhouette. */
function boltDiamond(x, y, ux, uy, r) {
  const px = -uy, py = ux;                  // normale a l'axe
  const long = r * 2.4, wide = r * 0.9;
  ctx.beginPath();
  ctx.moveTo(x + ux * long, y + uy * long);
  ctx.lineTo(x + px * wide, y + py * wide);
  ctx.lineTo(x - ux * long, y - uy * long);
  ctx.lineTo(x - px * wide, y - py * wide);
  ctx.closePath();
  ctx.fill();
}
/* CROIX du tir de soin. Deux `fill()` et non un seul trace a deux sous-traces :
   deux contours parcourus en sens contraires annulent leur zone commune sous la
   regle non nulle, et le centre de la croix — exactement leur intersection —
   serait devenu un trou. Le bug a existe sur trois silhouettes de creature (voir
   `mirrored` dans `sprites.js`) ; ici deux remplissages coutent moins cher que
   de raisonner sur le sens de parcours a chaque reglage.

   Elle est orientee dans l'AXE DE VOL, comme les deux autres silhouettes : une
   croix figee a l'horizontale deviendrait un X sur un tir en diagonale, donc une
   forme differente selon la direction — l'inverse de ce qu'on cherche. */
function boltCross(x, y, ux, uy, r) {
  const px = -uy, py = ux;
  const L = r * 2.0, W = r * 0.5, C = r * 1.25;
  ctx.beginPath();
  ctx.moveTo(x + ux * L + px * W, y + uy * L + py * W);
  ctx.lineTo(x + ux * L - px * W, y + uy * L - py * W);
  ctx.lineTo(x - ux * L - px * W, y - uy * L - py * W);
  ctx.lineTo(x - ux * L + px * W, y - uy * L + py * W);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + px * C + ux * W, y + py * C + uy * W);
  ctx.lineTo(x + px * C - ux * W, y + py * C - uy * W);
  ctx.lineTo(x - px * C - ux * W, y - py * C - uy * W);
  ctx.lineTo(x - px * C + ux * W, y - py * C + uy * W);
  ctx.closePath();
  ctx.fill();
}
/* Les trois silhouettes de projectile. `shape` etait un booleen `diamond` tant
   qu'il n'y avait que deux formes ; c'est la SIGNATURE qu'on etend, jamais une
   exception qu'on ouvre a cote — meme regle que pour `drawSprite`. */
export const BOLT_CAPSULE = 0;   // tir allie de degats
export const BOLT_DIAMOND = 1;   // tir hostile
export const BOLT_CROSS   = 2;   // tir de soin
/* `shape` choisit la silhouette. Un parametre et non trois fonctions — le halo,
   la trainee, la deduction de direction et la purge des tables sont communs, et
   les dupliquer les aurait fait diverger au premier reglage.

   POURQUOI UNE TROISIEME FORME. Le tir de soin se distinguait par sa seule
   COULEUR, et ca marchait tant que le soigneur portait la teinte de son joueur :
   son tir de degats etait magenta ou orange, son tir de soin vert. Depuis que la
   couleur dit la classe, le soigneur est vert en permanence — ses deux tirs sont
   donc deux verts voisins, exactement le defaut que `bullet` et `shot` avaient
   avant d'etre separes, et le pire cas connu de ce depot.

   La reponse est la meme que la fois precedente, et elle est deja ecrite dans la
   charte : la couleur se perd dans le chaos, la forme non — et un daltonien doit
   s'en sortir. La croix n'est pas un dessin invente pour l'occasion, c'est le
   signe du soin deja porte par le bonus au sol, les motes du sanctuaire et le
   HUD. */
export function drawBolt(b, r, col, trail, shape = BOLT_CAPSULE) {
  const prev = trail.get(b.id);
  trail.set(b.id, { x: b.x, y: b.y });

  boltGlow(b, r, col);
  ctx.fillStyle = col;
  if (prev) {
    const dx = b.x - prev.x, dy = b.y - prev.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const ux = dx / d, uy = dy / d;
      if (shape === BOLT_DIAMOND) {
        // La copie en arriere d'abord, sous le corps : elle donne le sens du vol
        // sans qu'on ait a comparer deux images.
        ctx.globalAlpha = 0.3;
        boltDiamond(b.x - ux * r * 3, b.y - uy * r * 3, ux, uy, r * 0.7);
        ctx.globalAlpha = 1;
        boltDiamond(b.x, b.y, ux, uy, r);
        return;
      }
      if (shape === BOLT_CROSS) {
        /* Pas de copie en arriere ici. La croix a deja quatre branches ; une
           seconde croix fantome derriere elle donnait une bouillie ou l'on ne
           lisait plus ni la forme ni le sens du vol. La trainee du soin est
           portee par le halo, qui reste commun aux trois silhouettes. */
        boltCross(b.x, b.y, ux, uy, r);
        return;
      }
      // La copie en arriere : un seul cran, et a 30 % — deux crans donnaient un
      // chapelet de perles au lieu d'une trainee.
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(b.x - ux * r * 3, b.y - uy * r * 3, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      /* Le corps, ETIRE dans l'axe : une capsule tracee au trait, qui coute une
         ligne la ou une ellipse pivotee en coute cinq. Elle est plus FINE que
         le disque d'origine et plus longue — a epaisseur egale, l'allongement
         donnait une pastille et non une balle. La taille de collision, elle, ne
         bouge pas : elle vit dans la simulation. */
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x - ux * r * 2.2, b.y - uy * r * 2.2);
      ctx.lineTo(b.x + ux * r * 0.5, b.y + uy * r * 0.5);
      ctx.stroke();
      ctx.lineCap = "butt";
      return;
    }
  }
  /* Premiere image d'un projectile : la direction n'est pas encore connue (elle
     se deduit de l'image precedente). Le losange se trace alors dans l'axe
     horizontal — une pastille ronde ici aurait fait clignoter la forme d'une
     image sur l'autre, ce qui est pire que pas de distinction du tout. */
  if (shape === BOLT_DIAMOND) { boltDiamond(b.x, b.y, 1, 0, r); return; }
  if (shape === BOLT_CROSS) { boltCross(b.x, b.y, 1, 0, r); return; }
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.fill();
}
/* Les tables de trainee ne grandissent pas indefiniment : une balle disparue ne
   revient jamais, et garder son entree ferait fuir la memoire sur une manche de
   dix minutes. On purge par lot plutot qu'a chaque disparition — parcourir
   quatre cents entrees a chaque image coute plus que de le faire une fois de
   temps en temps. */
export function pruneTrails(v) {
  if (bulletTrail.size > 900) {
    bulletTrail.clear();
    for (const b of v.bulletList) bulletTrail.set(b.id, { x: b.x, y: b.y });
  }
  if (shotTrail.size > 400) {
    shotTrail.clear();
    for (const s of v.shotList) shotTrail.set(s.id, { x: s.x, y: s.y });
  }
}
/* Trace le contour d'une zone dans le contexte courant, quelle que soit sa
   forme. L'anneau se dessine en deux cercles de sens opposes : c'est ce qui
   creuse le trou une fois la regle "evenodd" appliquee au remplissage. */
const ZONE_INSET = 3;      // retrait purement visuel, la zone de degats est pleine
function zonePath(z, grow = 1) {
  ctx.beginPath();
  zoneSubPath(z, grow);
}
/* Trace SANS ouvrir de chemin : c'est ce qui permet d'empiler plusieurs zones
   dans un seul `beginPath` et de les remplir d'un coup. Deux mares qui se
   chevauchent donnent alors une seule tache, sans la couture interne qu'un
   remplissage par zone laissait — et une fin de combat de Matriarche compte
   vingt-cinq mares. */
function zoneSubPath(z, grow = 1) {
  if (z.shape === 1) {
    // Les cases du damier se touchent exactement cote serveur ; on les separe
    // ici pour qu'on lise une grille et non un aplat.
    const w = Math.max(4, z.w * grow - ZONE_INSET * 2);
    const h = Math.max(4, z.h * grow - ZONE_INSET * 2);
    rectSub(z.x, z.y, w, h, z.ang || 0);
  } else if (z.shape === 2) {
    ctx.moveTo(z.x + z.r * grow, z.y);
    ctx.arc(z.x, z.y, z.r * grow, 0, Math.PI * 2);
    ctx.moveTo(z.x + z.hole, z.y);
    ctx.arc(z.x, z.y, z.hole, 0, Math.PI * 2, true);
  } else if (z.shape === 3) {
    // Cone : le sommet est au centre de la zone, l'ouverture vaut deux fois
    // `spread`. La pointe est fermee, sinon le remplissage debordait sur la
    // corde et le joueur croyait le sommet sur.
    ctx.moveTo(z.x, z.y);
    ctx.arc(z.x, z.y, z.r * grow, z.ang - z.spread, z.ang + z.spread);
    ctx.closePath();
  } else if (z.shape === 4) {
    // Pac-Man : le disque MOINS le secteur sur. On trace donc le complement,
    // de `ang + spread` a `ang - spread` : ce qui est peint est ce qui blesse,
    // regle valable pour toutes les formes du registre.
    ctx.moveTo(z.x, z.y);
    ctx.arc(z.x, z.y, z.r * grow, z.ang + z.spread, z.ang - z.spread + Math.PI * 2);
    ctx.closePath();
  } else if (z.shape === 5) {
    // Croix : deux bandes croisees, `r` demi-longueur et `h` epaisseur. Les
    // deux rectangles se recouvrent au centre — remplis dans le meme chemin en
    // « nonzero », ils ne laissent aucune couture.
    const len = z.r * grow * 2, th = z.h * grow;
    rectSub(z.x, z.y, len, th, z.ang || 0);
    rectSub(z.x, z.y, th, len, z.ang || 0);
  } else {
    ctx.moveTo(z.x + z.r * grow, z.y);
    ctx.arc(z.x, z.y, z.r * grow, 0, Math.PI * 2);
  }
}
// Rectangle oriente ajoute au chemin courant. `ctx.rect` ne sait pas tourner et
// `save/restore` autour d'un `beginPath` deja ouvert casserait l'empilement.
function rectSub(cx, cy, w, h, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const hw = w / 2, hh = h / 2;
  const pt = (dx, dy) => [cx + dx * c - dy * s, cy + dx * s + dy * c];
  const a = pt(-hw, -hh), b = pt(hw, -hh), d = pt(hw, hh), e = pt(-hw, hh);
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(d[0], d[1]);
  ctx.lineTo(e[0], e[1]);
  ctx.closePath();
}
// L'anneau est la seule forme qui se CREUSE : partout ailleurs les sous-chemins
// doivent s'additionner, sinon la croix perdrait son centre et deux mares qui se
// chevauchent laisseraient un trou exactement la ou elles sont le plus denses.
function zoneRule(z) { return z.shape === 2 ? "evenodd" : "nonzero"; }
/* Plafond de zones DESSINEES. La simulation en autorise davantage (mares,
   exaflares et damier peuvent se croiser) mais au-dela d'une quarantaine le sol
   n'est plus lisible : mieux vaut montrer les plus urgentes que toutes. Le tri
   ne se paie que quand le plafond est franchi. */
const ZONE_DRAW_MAX = 40;
/* Craquelures pre-generees par identifiant de zone : deux zones voisines ne
   sont jamais identiques, et la geometrie ne se recalcule pas a chaque image.
   La table se vide d'un bloc quand elle grossit — les identifiants ne se
   reutilisent pas, une entree morte ne sera jamais relue. */
export const zoneCracks = new Map();
export const zoneMotion = new Map();   // id -> { x, y, dx, dy } : le courant est DEDUIT
export const scorches = [];            // { z, until } : decoloration du sol, 2 s
export const blastSeen = new Map();    // id -> instant de la derniere resolution
// Petit generateur deterministe : la craquelure d'une zone doit etre la meme a
// chaque image, et Math.random ne sait pas promettre ca.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Rayon d'encombrement d'une zone, toutes formes confondues : les craquelures
// et le courant en ont besoin sans vouloir connaitre la geometrie exacte.
function zoneSpan(z) {
  if (z.shape === 1) return Math.max(z.w, z.h) / 2;
  return z.r || 40;
}
function crackSetFor(id) {
  let branches = zoneCracks.get(id);
  if (branches) return branches;
  if (zoneCracks.size > 160) zoneCracks.clear();
  const rnd = mulberry32(id);
  branches = [];
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    let a = (i / n) * Math.PI * 2 + rnd() * 0.9;
    const pts = [];
    let d = 0.10 + rnd() * 0.08;
    while (d < 1) {
      pts.push({ d, a });
      d += 0.14 + rnd() * 0.20;
      a += (rnd() - 0.5) * 0.8;
    }
    pts.push({ d: 1, a });
    branches.push(pts);
  }
  zoneCracks.set(id, branches);
  return branches;
}
/* Le reseau de fissures s'ETEND au rythme du compte a rebours, et sa lueur
   suit la meme rampe non lineaire que le remplissage : lente sur deux tiers,
   brutale sur les 300 dernieres millisecondes. Ecretees a la forme — une
   fissure qui depasse d'un couloir en ferait un disque. */
function drawZoneCracks(z, k, punch) {
  const span = zoneSpan(z);
  const R = span * Math.min(1, k * 1.15);
  if (R < 12) return;
  const branches = crackSetFor(z.id);
  ctx.save();
  zonePath(z);
  ctx.clip(zoneRule(z));
  ctx.strokeStyle = alpha(ZONE.blast, 0.20 + punch * 0.70);
  ctx.lineWidth = 1 + punch * 1.6;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const pts of branches) {
    ctx.moveTo(z.x, z.y);
    for (const pt of pts) {
      if (pt.d * span > R) break;
      ctx.lineTo(z.x + Math.cos(pt.a) * pt.d * span,
                 z.y + Math.sin(pt.a) * pt.d * span);
    }
  }
  ctx.stroke();
  ctx.restore();
}
/* Le courant est DEDUIT du deplacement entre deux images, comme la direction
   des projectiles : un champ de plus sur chaque zone, vingt fois par seconde,
   couterait plus que la deduction. Lisse, parce que les positions arrivent a
   20 Hz et sauteraient. */
function trackZoneMotion(list) {
  for (const z of list) {
    const m = zoneMotion.get(z.id);
    if (!m) { zoneMotion.set(z.id, { x: z.x, y: z.y, dx: 0, dy: 0 }); continue; }
    m.dx = m.dx * 0.85 + (z.x - m.x) * 0.15;
    m.dy = m.dy * 0.85 + (z.y - m.y) * 0.15;
    m.x = z.x; m.y = z.y;
  }
  if (zoneMotion.size > 220) zoneMotion.clear();
}
/* Signature MOBILE : bandes perpendiculaires au deplacement qui defilent plus
   vite que la zone (la sensation de vitesse), trainee qui s'estompe derriere,
   et avant-garde plus lumineuse — on lit la direction A L'ARRET, sur une
   capture. Les exaflares heritent gratuitement de l'orientation : chaque
   explosion successive du meme train suit le meme vecteur. */
function drawZoneFlow(z, tm) {
  const m = zoneMotion.get(z.id);
  if (!m) return;
  const d = Math.hypot(m.dx, m.dy);
  if (d < 0.45) return;
  const ux = m.dx / d, uy = m.dy / d;
  const R = zoneSpan(z);

  // Trainee : deux contours fantomes derriere, sur environ deux longueurs.
  for (let i = 1; i <= 2; i++) {
    ctx.save();
    ctx.translate(-ux * R * 0.55 * i, -uy * R * 0.55 * i);
    ctx.globalAlpha = 0.14 / i;
    ctx.strokeStyle = ZONE.edge;
    ctx.lineWidth = 2;
    zonePath(z);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Bandes de courant, ecretees a la forme.
  ctx.save();
  zonePath(z);
  ctx.clip(zoneRule(z));
  ctx.strokeStyle = alpha(ZONE.edge, 0.30);
  ctx.lineWidth = 2.5;
  const pas = 22;
  const off = (tm * 90) % pas;
  ctx.beginPath();
  for (let s = -R + off - pas; s < R + pas; s += pas) {
    const cx = z.x + ux * s, cy = z.y + uy * s;
    ctx.moveTo(cx - uy * R, cy + ux * R);
    ctx.lineTo(cx + uy * R, cy - ux * R);
  }
  ctx.stroke();
  ctx.restore();

  // Avant-garde : liseré lumineux sur le bord AVANT, plus sombre a l'arriere.
  if (!z.shape || z.shape === 2) {
    const ang = Math.atan2(uy, ux);
    ctx.strokeStyle = alpha(ZONE.blast, 0.65);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, ang - 0.9, ang + 0.9);
    ctx.stroke();
  }
}
/* RESOLUTION d'un telegraphe : onde annulaire qui depasse largement le rayon,
   debris projetes, et une decoloration du sol qui persiste deux secondes — la
   trace de ce qui vient de se passer, celle qui aide a comprendre ce qui nous
   a touche. Declenchee sur le souffle, une fois par detonation : les zones qui
   PULSENT (derive, verrouillage) redetonent et redeclenchent. */
function zoneResolved(z, tm) {
  const last = blastSeen.get(z.id) ?? -9;
  if (tm - last < 0.4) return;
  blastSeen.set(z.id, tm);
  if (blastSeen.size > 220) { const keep = blastSeen.get(z.id); blastSeen.clear(); blastSeen.set(z.id, keep); }

  scorches.push({ z: { ...z }, until: tm + 2 });
  if (scorches.length > 24) scorches.shift();

  const span = zoneSpan(z);
  if (bursts.length < BURST_MAX) {
    bursts.push({ x: z.x, y: z.y, r: span * 0.5, max: span * 1.6, life: 0.35, t: 0.35, col: ZONE.blast });
  }
  for (let i = 0; i < 8 && particles.length < PARTICLE_MAX; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 70 + Math.random() * 120;
    particles.push({
      x: z.x + Math.cos(a) * span * 0.4, y: z.y + Math.sin(a) * span * 0.4,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      life: 0.5, max: 0.5, col: ZONE.blast, size: 2.6,
      // Des ECLATS : une detonation arrache du sol, elle ne fait pas d'etincelles.
      frame: fxShard, ang: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 10,
    });
  }
}
function drawScorches(tm) {
  for (let i = scorches.length - 1; i >= 0; i--) {
    const s = scorches[i];
    if (s.until <= tm || s.until > tm + 2.5) {
      scorches[i] = scorches[scorches.length - 1];
      scorches.pop();
      continue;
    }
    ctx.fillStyle = alpha(SURFACE.void, 0.30 * ((s.until - tm) / 2));
    zonePath(s.z);
    ctx.fill(zoneRule(s.z));
  }
}
// Point aleatoire DANS une zone, pour l'emission de braises. Approximatif sur
// les formes anguleuses — une braise a un centimetre du bord ne ment a
// personne, et l'exactitude couterait un test de forme par particule.
function zoneRandomPoint(z) {
  if (z.shape === 1) {
    const c = Math.cos(z.ang || 0), s = Math.sin(z.ang || 0);
    const dx = (Math.random() - 0.5) * z.w, dy = (Math.random() - 0.5) * z.h;
    return { x: z.x + dx * c - dy * s, y: z.y + dx * s + dy * c };
  }
  const rMin = z.shape === 2 ? (z.hole || 0) : 0;
  const rr = rMin + Math.sqrt(Math.random()) * Math.max(1, (z.r || 40) - rMin);
  const a = Math.random() * Math.PI * 2;
  return { x: z.x + Math.cos(a) * rr, y: z.y + Math.sin(a) * rr };
}
/* Deux temps, deux langages — c'est la condition de reussite du lot. L'arene
   contient deja 200 ennemis, des projectiles et des marqueurs : si l'annonce et
   la zone active se ressemblent, tout le catalogue de motifs devient du bruit.

     ANNONCE : remplissage faible, contour ANIME (pointilles qui defilent), et
               un anneau de compte a rebours quand il y a peu de zones a lire.
     ACTIVE  : remplissage franc, contour fixe, leger pulse.

   Les zones persistantes sont en plus FUSIONNEES : un seul chemin, un contour
   obtenu par dilatation, donc aucune couture entre deux mares qui se touchent. */
export function drawZones(zones, tm = 0) {
  let list = zones;
  if (list.length > ZONE_DRAW_MAX) {
    const rank = z => (z.warn > 0 ? z.warn : z.life > 0 ? 0 : 99);
    list = [...list].sort((a, b) => rank(a) - rank(b)).slice(0, ZONE_DRAW_MAX);
  }

  // La trace des detonations passe SOUS tout le reste : c'est le sol, pas un
  // danger — une decoloration par-dessus une annonce masquerait la suivante.
  drawScorches(tm);
  trackZoneMotion(list);

  /* L'anneau de compte a rebours ne sort que s'il y a peu d'annonces : douze
     anneaux sur un damier disent moins que les douze contours eux-memes, qui
     s'allument deja en meme temps. */
  const ring = list.reduce((n, z) => n + (z.warn > 0 ? 1 : 0), 0) <= 8;

  const persistent = [];
  for (const z of list) {
    if (z.blast > 0.15) zoneResolved(z, tm);
    if (z.warn <= 0 && z.life > 0) { persistent.push(z); continue; }
    if (z.warn > 0) drawZoneWarn(z, tm, ring);
    else {
      const k = Math.max(0, z.blast / 0.25);
      ctx.fillStyle = alpha(ZONE.blast, k * 0.65);
      zonePath(z, z.shape === 1 || z.shape === 5 ? 1 : 1 + (1 - k) * 0.12);
      ctx.fill(zoneRule(z));
    }
  }

  if (persistent.length) drawZonesActive(persistent, tm);

  /* Le courant se dessine PAR-DESSUS la signature de la zone : c'est une
     information de trajectoire, elle vaut pour une annonce qui glisse comme
     pour une mare poursuivante. */
  for (const z of list) drawZoneFlow(z, tm);
}
/* INTENSITE NON LINEAIRE. Le carre de la progression montait deja doucement,
   mais il ne DECOLLAIT jamais : on lisait une jauge au lieu de ressentir une
   echeance. Les 300 dernieres millisecondes valent maintenant a elles seules
   autant que tout le reste de l'annonce — c'est la fenetre ou il faut avoir
   bouge, et c'est la seule chose que le telegraphe doit dire.
   Rendue entre 0 et 1 comme `k*k` l'etait, donc tous les coefficients d'appel
   restent valables. */
const ZONE_PUNCH = 0.3;               // secondes de la montee brutale
function warnRamp(k, warn) {
  const doux = k * k * 0.55;
  if (warn > ZONE_PUNCH) return doux;
  return doux + (1 - warn / ZONE_PUNCH) * 0.45;
}
function drawZoneWarn(z, tm, ring) {
  const k = 1 - z.warn / (z.warn0 || CFG.ZONE_WARN);
  const imminent = z.warn < 0.35;
  const punch = warnRamp(k, z.warn);

  /* Etincelles qui MONTENT de la zone pendant la fenetre brutale. Elles ne
     coutent rien — memes particules, meme lot que les entites — et elles font
     regarder la zone au moment ou le contour seul ne suffit plus. Une seule
     tous les quelques images : une gerbe continue aurait masque le sol qu'on
     demande justement de lire. */
  if (z.warn <= ZONE_PUNCH && particles.length < PARTICLE_MAX && Math.random() < 0.35) {
    const rad = Math.max(8, z.r || 40);
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * rad;
    particles.push({
      x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d,
      vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 40,
      lift: 90, life: 0.45, max: 0.45, col: ZONE.imminent, size: 4.5,
      // Une braise est de la LUMIERE qui monte, pas un debris qui retombe.
      frame: fxGlow,
    });
  }

  // Remplissage volontairement PAUVRE : c'est le contour qui porte l'annonce,
  // et c'est ce qui la distingue d'une zone active a 45 %.
  if (z.prox) {
    // Degats de proximite : le degrade EST l'information. Un aplat aurait dit
    // « toute la zone fait mal », alors que seul le centre est letal.
    const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, Math.max(1, z.r));
    g.addColorStop(0, alpha(ZONE.imminent, 0.10 + punch * 0.30));
    g.addColorStop(1, alpha(ZONE.imminent, 0.02 + punch * 0.05));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = alpha(BOSS.skin, 0.03 + punch * 0.13);
  }
  zonePath(z);
  ctx.fill(zoneRule(z));

  /* Craquelures (lot E). C'est la SIGNATURE de l'imminent : un reseau de
     fissures qui s'ouvre depuis le centre au rythme du compte a rebours, la ou
     le persistant a ses braises et le mobile son courant. Le remplissage reste
     pauvre — les fissures disent l'echeance, pas la surface. */
  drawZoneCracks(z, k, punch);

  ctx.strokeStyle = imminent ? BOSS.barWarn : BOSS.skin;
  ctx.globalAlpha = 0.5 + k * 0.5;
  ctx.lineWidth = imminent ? 3 : 2;
  // Les pointilles DEFILENT : un contour anime se distingue au premier coup
  // d'oeil d'un contour fixe, meme du coin de l'oeil, meme sur une forme qu'on
  // n'a jamais vue.
  ctx.setLineDash(imminent ? [] : [7, 6]);
  ctx.lineDashOffset = imminent ? 0 : -tm * 26;
  zonePath(z);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.globalAlpha = 1;

  /* Arc de progression, au centre de la zone quelle que soit sa forme. Un arc
     epousant le CONTOUR n'avait aucun sens sur un rectangle ou un couloir long
     de toute l'arene — c'est la raison pour laquelle il avait ete retire. Au
     centre, il vaut pour les six formes et se lit sans compter les images. */
  if (ring) {
    ctx.strokeStyle = imminent ? BOSS.barWarn : BOSS.barRing;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(z.x, z.y, 15, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    ctx.stroke();
  }

  /* Une zone qui PULSE (dérive, verrouillage) a une annonce ET un souffle en
     meme temps : son compte a rebours est relance des la detonation. Ne
     dessiner que l'annonce donnait un danger qui ne se voyait jamais exploser. */
  if (z.blast > 0) {
    ctx.fillStyle = alpha(ZONE.blast, Math.max(0, z.blast / 0.25) * 0.5);
    zonePath(z);
    ctx.fill(zoneRule(z));
  }
}
/* Zones persistantes, toutes ensemble. Le contour vient d'une DILATATION du
   meme chemin plutot que d'un `stroke` : sur douze mares qui se chevauchent,
   un trait par mare redessinait chaque cercle a l'interieur de la tache et on
   ne voyait plus ou finissait la surface dangereuse. */
function drawZonesActive(list, tm) {
  /* La pulsation est SYNCHRONISEE sur le tic de degats (ZONE_TICK) et non sur
     une sinusoide decorative : on voit QUAND ca frappe, ce qui rend le danger
     previsible au lieu de continu. Un eclat bref a chaque palier, puis la
     surface retombe. */
  const tick = CFG.ZONE_TICK || 0.25;
  const ph = (tm % tick) / tick;
  const pulse = 0.88 + 0.12 * Math.max(0, 1 - ph * 2.5);

  /* Braises et fumee (lot E) : la signature du persistant. Emission cadencee —
     duree de vie x debit tient chaque zone sous la quarantaine de particules —
     et budget global a part (`zoneFx`), pour que vingt-cinq mares de fin de
     Matriarche ne volent pas les fragments des morts. La fumee ne sort QUE
     ici : jamais sur un telegraphe. */
  for (const z of list) {
    if (zoneFx >= ZONE_FX_MAX || particles.length >= PARTICLE_MAX) break;
    if (Math.random() < 0.55) {
      const pt = zoneRandomPoint(z);
      particles.push({
        x: pt.x, y: pt.y,
        vx: (Math.random() - 0.5) * 12, vy: -14 - Math.random() * 18,
        lift: 26, life: 0.9 + Math.random() * 0.5, max: 1.4,
        col: ZONE.blast, size: 4, zfx: 1, frame: fxGlow,
      });
      setZoneFx(zoneFx + 1);
    }
    if (Math.random() < 0.16 && zoneFx < ZONE_FX_MAX && particles.length < PARTICLE_MAX) {
      const pt = zoneRandomPoint(z);
      particles.push({
        x: pt.x, y: pt.y,
        vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 10,
        lift: 14, life: 1.6 + Math.random() * 0.6, max: 2.2,
        /* La fumee reutilise le HALO plutot que d'ajouter une quatrieme case :
           un degradé radial large et peu opaque EST une bouffee de fumee, et la
           regle de budget de l'atlas s'applique aussi entre deux usages d'une
           meme forme. Elle gonfle en montant (`grow`), ce qu'une case figee
           n'aurait pas su faire de toute facon. */
        col: SURFACE.line, size: 10 + Math.random() * 5, zfx: 1,
        frame: fxGlow, grow: 9,
      });
      setZoneFx(zoneFx + 1);
    }
  }

  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1.05);
  ctx.fillStyle = alpha(ZONE.edge, 0.34 * pulse);
  ctx.fill("nonzero");

  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1);
  ctx.fillStyle = alpha(ZONE.fill, 0.45 * pulse);
  ctx.fill("nonzero");

  /* TEXTURE QUI DEFILE. C'est le seul moyen de distinguer d'un coup d'oeil
     « active » de « en cours d'annonce » a la peripherie du regard : les deux
     sont des aplats rouges, et seule celle-ci bouge. Des hachures obliques
     tracees en une passe, ecretees a la reunion des zones — un motif par zone
     aurait coute autant de `clip` que de zones, et il y en a douze sur un
     damier.
     Le pas de 14 px et la vitesse de 22 px/s sont ceux du contour pointille de
     l'annonce : deux vitesses differentes a l'ecran auraient donne deux
     mecaniques la ou il n'y en a qu'une. */
  ctx.save();
  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1);
  ctx.clip("nonzero");
  ctx.strokeStyle = alpha(ZONE.persist, 0.22);
  ctx.lineWidth = 3;
  const pas = 14;
  const off = (tm * 22) % pas;
  /* Hachures limitees au RECTANGLE DE VUE (lot I) : sur la salle entiere, le
     balayage diagonal tracait cinq cents segments par flaque et par image.
     `t` est l'abscisse a y = 0, en multiples du pas : les traits restent
     ANCRES AU MONDE — ancres a la vue, ils rampaient avec la camera. */
  const hx0 = camera.x0, hy0 = camera.y0;
  const hx1 = hx0 + CFG.VIEW_W, hy1 = hy0 + CFG.VIEW_H;
  const dia = CFG.VIEW_H;
  ctx.beginPath();
  const base = Math.floor((hx0 - dia - hy0) / pas) * pas;
  for (let t = base; t + hy0 < hx1; t += pas) {
    ctx.moveTo(t + off + hy0, hy0);
    ctx.lineTo(t + off + hy0 + dia, hy1);
  }
  ctx.stroke();
  ctx.restore();

  /* Lisere VIOLET sur le pourtour. Dans la grammaire de marqueurs, le violet
     dit « persistant : ca restera la apres ». Le remplissage garde le rouge du
     danger — repeindre la mare en violet aurait casse la regle qui compte le
     plus, une couleur pour une seule chose. Le violet ne fait donc qu'AJOUTER
     l'information de duree a un danger qui reste un danger. */
  ctx.beginPath();
  for (const z of list) zoneSubPath(z, 1.05);
  ctx.strokeStyle = alpha(ZONE.persist, 0.55 * pulse);
  ctx.lineWidth = 2;
  ctx.stroke();

  /* Fin de vie : les trois dernieres secondes clignotent. Sans ca, une mare
     disparaissait sous les pieds sans prevenir et on apprenait a ne plus s'y
     fier du tout — c'est-a-dire a jouer comme si elle etait permanente. */
  const dying = list.filter(z => z.life > 0 && z.life < 3);
  if (dying.length && Math.sin(tm * 12) > 0) {
    ctx.beginPath();
    for (const z of dying) zoneSubPath(z, 1.05);
    ctx.fillStyle = alpha(ZONE.dying, 0.16);
    ctx.fill("nonzero");
  }
}
/* La tourelle se dessine sous les ennemis : elle fait partie du decor qu'on a
   pose, pas de la mêlée. Son cercle de portee est indispensable — sans lui, on
   ne peut pas decider ou la poser, et c'est tout son interet. */
export function drawTurrets(list) {
  const col = POWERUP_STYLE.turret.color;
  for (const t of list) {
    const fading = t.k < 0.25;                 // clignote sur la fin
    const blink = fading ? 0.35 + 0.65 * Math.abs(Math.sin(performance.now() / 110)) : 1;

    ctx.globalAlpha = 0.13 * blink;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.arc(t.x, t.y, CFG.TURRET_RANGE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.globalAlpha = blink;

    ctx.fillStyle = alpha(SURFACE.void, 0.85);
    ctx.beginPath(); ctx.arc(0, 0, CFG.TURRET_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.rotate(t.ang ?? 0);
    ctx.fillStyle = col;
    ctx.fillRect(2, -2.5, CFG.TURRET_RADIUS + 5, 5);
    ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // arc de vie restante autour du socle
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.75 * blink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, CFG.TURRET_RADIUS + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t.k);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
/* Drones : `owner` permet de retrouver la couleur du proprietaire via le
   meme chemin que colorOf (lobby -> colorIndex -> PLAYER_COLORS), pour que
   chacun reconnaisse ses propres drones en pleine melee. Repli sur une
   teinte neutre par espece quand le proprietaire est inconnu (parti du
   salon, ou tuple d'ancienne version sans `owner`) : le soutien tire de loin
   donc reste visible, le mini-drone d'essaim fonce au contact donc reste
   petit et effile. */
const DRONE_COLOR = { 0: OWNED.droneAtk, 1: OWNED.droneSwarm };
export function drawDrones(list) {
  for (const d of list) {
    const col = ownerColorOf(d.owner) ?? DRONE_COLOR[d.kind] ?? OWNED.orphan;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.ang ?? 0);

    if (d.kind === 1) {
      // essaim : dard effile, se consume au contact
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(7, 0); ctx.lineTo(-4, -3.4); ctx.lineTo(-1.2, 0); ctx.lineTo(-4, 3.4);
      ctx.closePath(); ctx.fill();
    } else {
      // soutien : losange qui tire de loin, plus massif que le mini-drone
      ctx.fillStyle = alpha(SURFACE.void, 0.85);
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(0, -6); ctx.lineTo(-8, 0); ctx.lineTo(0, 6);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
export function drawEffects(effects) {
  for (const f of effects) {
    const grow = 1 - f.k;                    // k va de 1 a 0

    if (f.kind === 1) {
      // balayage d'arrivee du boss : voile blanc puis onde large
      ctx.fillStyle = alpha(FX.veil, f.k * 0.16);
      ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);

      ctx.strokeStyle = alpha(FX.flash, f.k * 0.85);
      ctx.lineWidth = 14 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(BOSS.skin, f.k * 0.8);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.86, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 3) {
      // ricochet : arc entre deux cibles, avec une cassure au milieu pour
      // qu'on lise un rebond et pas un rayon
      const mx = (f.x + f.x2) / 2, my = (f.y + f.y2) / 2;
      const nx = -(f.y2 - f.y), ny = f.x2 - f.x;
      const nd = Math.hypot(nx, ny) || 1;
      const off = 14 * (1 - f.k);

      ctx.strokeStyle = alpha(FX.ricochet, f.k);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(mx + (nx / nd) * off, my + (ny / nd) * off);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();

      ctx.fillStyle = alpha(FX.ricochetCore, f.k * 0.9);
      ctx.beginPath(); ctx.arc(f.x2, f.y2, 3.5, 0, Math.PI * 2); ctx.fill();
      continue;
    }

    if (f.kind === 13) {
      // Salve (lot C) : rayon de verrouillage du tireur vers sa cible, plus un
      // losange qui marque la cible touchee. Droit et non casse — c'est un
      // verrouillage, pas un rebond, et la difference doit se lire.
      ctx.strokeStyle = alpha(CLASS_COLOR.dps, f.k * 0.8);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(f.x2, f.y2);
      ctx.lineTo(f.x, f.y);
      ctx.stroke();

      const s = 6 + 6 * f.k;
      ctx.strokeStyle = alpha(CLASS_COLOR.dps, f.k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - s);
      ctx.lineTo(f.x + s, f.y);
      ctx.lineTo(f.x, f.y + s);
      ctx.lineTo(f.x - s, f.y);
      ctx.closePath();
      ctx.stroke();
      continue;
    }

    if (f.kind === 14) {
      /* ABSORPTION DU BOUCLIER (lot S). Sans ce retour, le joueur qui tire de
         face sur un bulwark ne voit strictement rien se passer et conclut a un
         bug — c'est la raison d'etre de l'effet, pas un ornement.

         Il est pose au POINT D'IMPACT, qui est deja sur le bouclier : la
         position dit donc a elle seule de quel cote la protection se trouve, et
         il n'y a aucune direction a transmettre. Teinte du type et non blanc
         generique, pour qu'on relie l'echec a son porteur — un flash blanc de
         plus dans une melee ne veut rien dire.

         Bref (0,18 s) et petit : il se produit a la cadence du tir, donc
         plusieurs fois par seconde, et tout ce qui se repete a cette frequence
         doit rester sous le seuil du tressaillement. */
      ctx.strokeStyle = alpha(ENEMY_TINT[6], f.k);
      ctx.lineWidth = 3 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.35 + grow * 0.65), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 4) {
      // balise : double anneau vert qui se resserre sur le releve
      ctx.strokeStyle = alpha(FX.heal, f.k * 0.95);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.2 + grow * 0.8), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(FX.healSoft, f.k * 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1 - grow * 0.75), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 5) {
      // elite abattue : eclat dore, le butin est juste dessous
      ctx.strokeStyle = alpha(FX.elite, f.k * 0.9);
      ctx.lineWidth = 3 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.2 + grow * 0.8), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 6) {
      // rupture d'une barre du boss : souffle blanc puis onde rouge
      ctx.fillStyle = alpha(FX.veil, f.k * 0.12);
      ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);

      ctx.strokeStyle = alpha(FX.elite, f.k * 0.95);
      ctx.lineWidth = 12 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(BOSS.skin, f.k * 0.8);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 7) {
      // explosion de grenade : souffle bref et dense, chaud pour se
      // distinguer des ondes froides du pulsar et de la riposte
      ctx.fillStyle = alpha(FX.blastFill, f.k * 0.35);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = alpha(FX.blastEdge, f.k * 0.9);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 8) {
      // onde blanche : pulsar, onde de mort et riposte partagent ce rendu —
      // trois declencheurs differents pour le meme signal, le joueur n'a pas
      // besoin de distinguer la source pour comprendre qu'une zone vient d'agir
      ctx.strokeStyle = alpha(FX.wave, f.k * 0.85);
      ctx.lineWidth = 4 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(BOSS.twin, f.k * 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 9) {
      // pose d'un rempart : l'anneau se REFERME vers le rayon final, la zone
      // reste ensuite dessinee par drawBulwarks
      ctx.strokeStyle = alpha(CLASS_COLOR.tank, f.k * 0.9);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1.35 - grow * 0.35), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 10) {
      // provocation : onde large qui part du tank, dans sa couleur de classe —
      // c'est la seule competence dont l'effet est de deplacer la horde, elle
      // doit se voir depuis n'importe ou dans l'arene
      ctx.strokeStyle = alpha(CLASS_COLOR.tank, f.k * 0.75);
      ctx.lineWidth = 8 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(FX.flash, f.k * 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 11) {
      // vague de soin : anneau vert plein, distinct de l'onde blanche des
      // cartes qui, elle, fait des degats
      ctx.fillStyle = alpha(FX.heal, f.k * 0.10);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = alpha(FX.heal, f.k * 0.9);
      ctx.lineWidth = 5 * f.k + 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 12) {
      // explosion de bombe : meme famille chaude que la grenade mais plus
      // large et plus dense — c'est la plus grosse frappe ponctuelle du jeu
      ctx.fillStyle = alpha(FX.bombFill, f.k * 0.42);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = alpha(FX.bombEdge, f.k * 0.95);
      ctx.lineWidth = 7 * f.k + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * grow, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 14) {
      // recolte aboutie (lot I) : onde doree — la teinte des legendaires, la
      // meme que le point recolte, pour que le gain se lise d'un coup d'oeil
      ctx.strokeStyle = alpha(HARVEST_GOLD, f.k * 0.9);
      ctx.lineWidth = 4 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.2 + grow * 0.8), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (f.kind === 2) {
      // montee de niveau : anneau dore qui s'ouvre vers l'exterieur
      ctx.strokeStyle = alpha(FX.level, f.k * 0.9);
      ctx.lineWidth = 4 * f.k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.15 + grow * 0.85), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = alpha(FX.levelSoft, f.k * 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.15 + grow * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    ctx.strokeStyle = alpha(FX.nova, f.k * 0.9);
    ctx.lineWidth = 6 * f.k + 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * (0.25 + grow * 0.75), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = alpha(FX.novaSoft, f.k * 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * (0.25 + grow * 0.62), 0, Math.PI * 2);
    ctx.stroke();
  }
}
/* Rempart du tank. Le contour est plein et la surface a peine teintee : la
   zone doit se lire d'un coup d'oeil depuis l'autre bout de l'arene sans
   masquer ce qui se passe dedans — c'est precisement dedans qu'on se bat. */
export function drawBulwarks(list) {
  for (const b of list) {
    const opacite = 0.35 + b.k * 0.45;
    ctx.fillStyle = alpha(CLASS_COLOR.tank, 0.05 + b.k * 0.04);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = alpha(CLASS_COLOR.tank, opacite);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();

    // Arc de duree restante, sur le bord : le tank doit savoir quand replier
    // sans quitter des yeux le centre de sa zone.
    ctx.strokeStyle = alpha(OWNED.bulwarkArc, 0.85);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.k);
    ctx.stroke();
  }
}
/* Ancre du tank (lot C). Le langage est celui du rempart — disque discret,
   anneau a la couleur de classe, arc de duree — avec DEUX ajouts qui disent la
   mecanique : la laisse (anneau pointille au double du rayon, la ou les
   ennemis captures butent) et des crampons vers l'interieur, qui disent
   « retenue » la ou le rempart dit « abri ». */
export function drawAnchors(list) {
  for (const an of list) {
    // Zone de capture.
    ctx.fillStyle = alpha(CLASS_COLOR.tank, 0.04 + an.k * 0.04);
    ctx.beginPath(); ctx.arc(an.x, an.y, an.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.30 + an.k * 0.45);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(an.x, an.y, an.r, 0, Math.PI * 2); ctx.stroke();

    // La laisse : c'est elle que les allies lisent pour savoir ou la horde
    // s'arretera. Pointillee — elle ne bloque pas les joueurs, elle retient.
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(an.x, an.y, an.r * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Crampons : six ticks orientes vers le centre.
    ctx.strokeStyle = alpha(CLASS_COLOR.tank, 0.7);
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(an.x + Math.cos(a) * an.r, an.y + Math.sin(a) * an.r);
      ctx.lineTo(an.x + Math.cos(a) * (an.r - 10), an.y + Math.sin(a) * (an.r - 10));
      ctx.stroke();
    }

    // Arc de duree restante, sur le bord, comme le rempart.
    ctx.strokeStyle = alpha(OWNED.bulwarkArc, 0.85);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(an.x, an.y, an.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * an.k);
    ctx.stroke();
  }
}
/* Nombre de croix qui montent dans un sanctuaire. Sept : en dessous on lit des
   accidents isoles, au-dela la surface du dome se remplit et le liseré
   exterieur — qui porte l'information tactique — passe au second plan. */
const SANCT_MOTES = 7;
/* Duree d'une montee, en secondes. Lente : ce n'est pas une gerbe, c'est une
   respiration. A moins d'une seconde on lit un jaillissement, donc un effet
   ponctuel, alors que le sanctuaire dure. */
const SANCT_RISE = 2.6;
/* Sanctuaire du soigneur (lot C).

   Il portait la couleur de CLASSE, comme le rempart et l'ancre, au motif que
   l'identite dit qui protege. C'etait la bonne regle pour les deux autres et la
   mauvaise pour celui-la : le rempart et l'ancre deplacent ou retiennent, le
   sanctuaire SOIGNE. Il porte donc le vert du soin, comme la vague, la balise et
   les chiffres — et le disque bleu-menthe ne se confond plus avec le rempart,
   qui est l'autre grand disque pose au sol.

   Le bord reste double : le liseré exterieur marque la limite ou les projectiles
   ennemis meurent, c'est l'information tactique du dome.

   LES CROIX QUI MONTENT sont sa signature. Un disque vert clair et un disque
   bleu clair au sol se distinguent mal en pleine melee, alors que du mouvement
   se lit par-dessus n'importe quel encombrement — c'est le meme raisonnement que
   pour les signatures de zone du lot E, ou une zone se reconnait a son
   comportement avant sa couleur. La croix, elle, n'est pas un glyphe invente
   pour l'occasion : c'est `POWERUP_ICON.heal`, deja LE signe du soin dans
   l'arene et dans le HUD.

   Aucune allocation, aucune liste : la position de chaque croix est une fonction
   de l'identifiant du sanctuaire, de son rang et du temps. Les particules du jeu
   passent par `particles`, qui a un plafond et un cout de gestion ; ici sept
   croix par dome n'ont ni a naitre, ni a mourir, ni a etre comptees. */
export function drawSancts(list) {
  const t = performance.now() / 1000;
  for (const sa of list) {
    ctx.fillStyle = alpha(FX.heal, 0.05 + sa.k * 0.04);
    ctx.beginPath(); ctx.arc(sa.x, sa.y, sa.r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = alpha(FX.heal, 0.35 + sa.k * 0.45);
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sa.x, sa.y, sa.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = alpha(FX.heal, 0.18);
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(sa.x, sa.y, sa.r - 5, 0, Math.PI * 2); ctx.stroke();

    for (let i = 0; i < SANCT_MOTES; i++) {
      /* Phase decalee par rang : en phase, les sept croix montent comme une
         seule barre et le dome clignote au lieu de respirer. Le decalage est
         aussi fonction de l'identifiant, sinon deux sanctuaires poses en meme
         temps battent a l'unisson. */
      const ph = ((t / SANCT_RISE) + i / SANCT_MOTES + sa.id * 0.137) % 1;
      // Montee du bas vers le haut du disque, sur 1,4 rayon.
      const dy = sa.r * (0.7 - ph * 1.4);
      /* La demi-largeur disponible A CETTE HAUTEUR, pour qu'aucune croix ne sorte
         du dome : c'est la corde du cercle. Le 0,78 garde une marge sous le
         liseré, qu'une croix posee dessus rendrait illisible. */
      const lim = Math.sqrt(Math.max(0, sa.r * sa.r - dy * dy)) * 0.78;
      // L'angle propre a la croix la place a gauche ou a droite, et l'oscillation
      // lente la fait deriver : une montee strictement verticale lit comme une
      // animation en boucle, ce qu'elle est, et le mouvement doit le cacher.
      const dx = Math.cos(sa.id * 1.7 + i * 2.399963 + Math.sin(t * 0.6 + i) * 0.35) * lim;
      // Apparition et disparition par les deux bouts : une croix qui surgit ou
      // se coupe net au bord trahit la boucle.
      const a = Math.sin(ph * Math.PI);
      paintIcon(ctx, POWERUP_ICON.heal, FX.heal,
        sa.x + dx, sa.y + dy, 0.42, a * 0.55 * (0.4 + sa.k * 0.6));
    }

    // Arc de duree restante — meme grammaire que le rempart et l'ancre.
    ctx.strokeStyle = alpha(OWNED.bulwarkArc, 0.85);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(sa.x, sa.y, sa.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sa.k);
    ctx.stroke();
  }
}
/* Bombe en vol. Le compte a rebours se lit sur l'anneau qui se referme : le
   delai de detonation est toute la competence, le cacher en ferait un clic
   gagnant sans anticipation — pour celui qui la lance comme pour les autres. */
/* La bombe est desormais VISEE, donc son point de chute est une information et
   non une devinette. On le dessine avec la grammaire des annonces de boss —
   cercle au sol a la couleur de danger, arc de progression sur le pourtour —
   parce que c'est exactement le meme contrat : « ceci va exploser ici, dans ce
   delai ». Un langage visuel de plus pour la meme promesse aurait demande a
   chacun d'apprendre deux fois la meme chose.

   Le cercle passe SOUS les entites, comme le rempart et les marqueurs : dessine
   par-dessus, il masquait l'amas d'ennemis qu'on vise. */
export function drawBombs(list) {
  for (const b of list) {
    const k = 1 - b.k;                      // 0 au lancer, 1 a l'explosion
    const r = SKILL_CFG.DPS_BOMB_RADIUS;

    // Point de chute : disque plein tres discret, contour net, arc de compte a
    // rebours qui se remplit. Le remplissage monte avec l'attente, ce qui rend
    // l'imminence lisible sans regarder l'arc.
    ctx.fillStyle = alpha(OWNED.bomb, 0.05 + k * 0.10);
    ctx.beginPath(); ctx.arc(b.tx, b.ty, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(OWNED.bomb, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(b.tx, b.ty, r, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = OWNED.bomb;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.tx, b.ty, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.stroke();

    // Le projectile lui-meme, en vol vers ce cercle.
    ctx.fillStyle = OWNED.bomb;
    ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
  }
}
/* Anneau de portee maximale, pour le seul tireur et pour lui seul. Deux
   secondes apres une fin de recharge, puis il disparait : la portee est une
   information dont on a besoin AU MOMENT de decider si l'amas est atteignable,
   pas en permanence — affiche tout le temps, c'est un cercle de plus a lire
   dans une arene qui en compte deja beaucoup. */
const BOMB_RANGE_SHOW_MS = 2000;
export function drawBombRange(x, y) {
  const age = performance.now() - bombReadyAt;
  if (age > BOMB_RANGE_SHOW_MS) return;
  const fade = 1 - age / BOMB_RANGE_SHOW_MS;

  ctx.strokeStyle = alpha(OWNED.bomb, 0.30 * fade);
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(x, y, SKILL_CFG.DPS_BOMB_RANGE_MAX, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}
export function drawPowerups(list) {
  const now = performance.now();
  for (const w of list) {
    if (!inView(w.x, w.y, 60)) continue;
    const st = POWERUP_STYLE[POWERUP_TYPES[w.type]] ?? POWERUP_STYLE.heal;
    const r = CFG.POWERUP_RADIUS;
    const pulse = 1 + Math.sin(now / 260 + w.id) * 0.1;
    const bob = Math.sin(now / 520 + w.id * 1.7) * 1.6;   // leger flottement
    const y = w.y + bob;

    ctx.strokeStyle = st.color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(w.x, y, r * 1.9 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;

    // ombre au sol : garde le repere de position malgre le flottement
    ctx.fillStyle = alpha(SURFACE.shadow, 0.28);
    ctx.beginPath();
    ctx.ellipse(w.x, w.y + r * 0.95, r * 0.62, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // pastille ronde sombre : l'icone se lit mieux sur un fond plein
    ctx.fillStyle = alpha(SURFACE.void, 0.82);
    ctx.beginPath(); ctx.arc(w.x, y, r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    paintPowerupIcon(st, w.x, y, (r / 8.6) * pulse);
  }
}
/* POINTS DE RECOLTE (lot I). L'or des legendaires, deliberement : la meme
   teinte dit « rarete et valeur » dans tout le jeu, et elle n'appartient a
   aucune couleur fonctionnelle de l'arene. Des LOSANGES et non des cercles —
   le seul cercle du jeu est une entite vivante, un cristal est une structure.
   Le halo pulse pour se reperer a distance : c'est le signal d'exploration,
   il doit se voir du bord de l'ecran. */
const HARVEST_GOLD = RARITY_COLOR[3];
export function drawHarvests(list) {
  if (list.length === 0) return;
  const now = performance.now();
  for (const h of list) {
    if (!inView(h.x, h.y, 120)) continue;
    const pulse = 0.5 + 0.5 * Math.sin(now / 300 + h.id);

    // halo de reperage, large et doux
    ctx.strokeStyle = HARVEST_GOLD;
    ctx.globalAlpha = 0.14 + pulse * 0.18;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const hr = 30 + pulse * 6;
    ctx.moveTo(h.x, h.y - hr); ctx.lineTo(h.x + hr, h.y);
    ctx.lineTo(h.x, h.y + hr); ctx.lineTo(h.x - hr, h.y);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (h.kind === 0) {
      // cristal : un losange plein, qui s'eteint a mesure qu'on le grignote
      const r = 14;
      ctx.fillStyle = alpha(HARVEST_GOLD, 0.25 + 0.55 * h.k);
      ctx.strokeStyle = HARVEST_GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - r); ctx.lineTo(h.x + r * 0.7, h.y);
      ctx.lineTo(h.x, h.y + r); ctx.lineTo(h.x - r * 0.7, h.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // jauge de PV, comme un ennemi : meme langage, meme position
      if (h.k < 1) {
        ctx.fillStyle = alpha(SURFACE.shadow, 0.45);
        ctx.fillRect(h.x - r, h.y - r - 9, r * 2, 3);
        ctx.fillStyle = HARVEST_GOLD;
        ctx.fillRect(h.x - r, h.y - r - 9, r * 2 * h.k, 3);
      }
    } else {
      // amas : trois petits losanges, et l'anneau de canalisation en arc —
      // c'est la jauge du geste « rester dessus », pas une barre de PV
      for (let i = 0; i < 3; i++) {
        const a = i * (Math.PI * 2 / 3) + 0.6;
        const cx2 = h.x + Math.cos(a) * 9, cy2 = h.y + Math.sin(a) * 9;
        const r = 6;
        ctx.fillStyle = alpha(HARVEST_GOLD, 0.6);
        ctx.beginPath();
        ctx.moveTo(cx2, cy2 - r); ctx.lineTo(cx2 + r * 0.7, cy2);
        ctx.lineTo(cx2, cy2 + r); ctx.lineTo(cx2 - r * 0.7, cy2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = alpha(HARVEST_GOLD, 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, h.y, CFG.HARVEST_CHANNEL_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      if (h.k > 0) {
        ctx.strokeStyle = HARVEST_GOLD;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(h.x, h.y, CFG.HARVEST_CHANNEL_RADIUS, -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * Math.min(1, h.k));
        ctx.stroke();
      }
    }
  }
}
/* Filet de soin du medic (lot M). La cible voyage en fin de tuple ennemi
   (index 8, coupe quand nul) : seuls les medics en train de soigner le
   paient. Le trace est une ligne ondulee — un filet, pas un rayon : le rayon
   droit est le langage des verrouillages (salve, ricochet), celui-ci NOURRIT. */
export function drawHealLinks(list) {
  let byId = null;
  const t = performance.now() / 1000;
  for (const e of list) {
    if (!e.healTarget) continue;
    if (byId === null) {
      byId = new Map();
      for (const o of list) byId.set(o.id, o);
    }
    const target = byId.get(e.healTarget);
    if (!target) continue;
    if (!inView(e.x, e.y, 200) && !inView(target.x, target.y, 200)) continue;

    const dx = target.x - e.x, dy = target.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    ctx.strokeStyle = alpha(ENEMY_TINT[7] ?? ENEMY.base, 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    const STEPS = 8;
    for (let i = 1; i <= STEPS; i++) {
      const k = i / STEPS;
      const wob = Math.sin(k * Math.PI * 3 + t * 6 + e.id) * 5 * Math.sin(k * Math.PI);
      ctx.lineTo(e.x + dx * k + nx * wob, e.y + dy * k + ny * wob);
    }
    ctx.stroke();
    // la pastille au bout : ou va le soin
    ctx.fillStyle = alpha(ENEMY_TINT[7] ?? ENEMY.base, 0.85);
    ctx.beginPath();
    ctx.arc(target.x, target.y, 3.5 + Math.sin(t * 8 + e.id) * 1, 0, Math.PI * 2);
    ctx.fill();
  }
}
/* Trois principes d'animation, choisis pour leur rapport effet / effort. Aucun
   ne coute une image d'atlas de plus.

   ANTICIPATION — une image avant l'action principale, ou la creature fait le
   mouvement inverse. Sans elle, les actions semblent se teleporter. Ce n'est
   pas du style : c'est aussi un telegraphe de jeu, et il est plus marque sur
   les attaques dangereuses.

   ECRASEMENT ET ETIREMENT — gratuit via `scale`. Une creature qui se deplace
   s'etire de 6 % dans son axe, une creature touchee s'ecrase de 12 %.

   ACTION SECONDAIRE — les fragments d'impact et de mort, ailleurs dans ce
   fichier. C'est le meilleur investissement de toute la partie.

   La respiration est DESYNCHRONISEE par identifiant : deux cents creatures qui
   respirent en phase produisent une pulsation collective qui saute aux yeux. */
const BREATH_HZ = 1.2;
/* Cadence des tireurs, DEDUITE et non transmise. Ajouter une recharge au tuple
   d'ennemi couterait un nombre sur chacun des deux cents ennemis, vingt fois
   par seconde — exactement ce que le depot refuse pour le rang d'elite, et pour
   un seul type sur cinq.

   On observe donc l'apparition d'un projectile ennemi pres d'un tireur : c'est
   la date de son dernier tir. La cadence etant fixe, la SUIVANTE est connue des
   le second tir, et l'anticipation qui la precede est alors exacte. Avant le
   premier tir, le tireur reste au repos — un telegraphe qui devine serait pire
   que pas de telegraphe. */
export const shooterFire = new Map();   // id d'ennemi -> date du dernier tir
export const seenShots = new Set();
export function trackShooters(v) {
  for (const s of v.shotList) {
    if (seenShots.has(s.id)) continue;
    seenShots.add(s.id);
    let best = 40 * 40, who = 0;
    for (const e of v.enemyList) {
      if (e.type !== 3) continue;
      const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2;
      if (d < best) { best = d; who = e.id; }
    }
    if (who) shooterFire.set(who, performance.now());
  }
  // Le jeu d'identifiants ne grandit pas indefiniment : au-dela de quelques
  // centaines de projectiles disparus, on repart du jeu vivant.
  if (seenShots.size > 600) {
    seenShots.clear();
    for (const s of v.shotList) seenShots.add(s.id);
  }
}
const SHOOTER_AIM = 400;         // duree de la visee, en millisecondes
const SHOOTER_RECOIL = 160;      // duree de la pose de tir
function enemyFrame(e, t, def, ctxInfo) {
  const base = `e${e.type}_`;

  // Le brood gonfle avant d'eclater : c'est l'anticipation la plus utile du
  // jeu, elle vaut un avertissement.
  if (e.type === 4 && e.hp / e.maxHp < 0.12) return frameOf(base + "open");

  /* KAMIKAZE : les pointes se deploient sous 40 % de PV. Il explose a la mort
     quelle qu'en soit la cause, donc « bas en PV » EST l'imminence — c'est la
     meme lecture que le gonflement du brood, et elle se deduit des PV que le
     snapshot porte deja. */
  if (e.type === 5 && e.hp / e.maxHp < 0.4) return frameOf(base + "open");

  /* BULWARK : la plaque se cale quand le joueur local est REELLEMENT dans
     l'angle protege. Deduit et non transmis — le client a la position, l'angle
     et l'ouverture du bouclier, exactement les trois valeurs dont le serveur se
     sert dans `_bulletHitEnemy`. C'est le seul retour qui dise « ton tir ne
     passera pas d'ici » AVANT d'avoir tire. */
  if (e.type === 6 && ctxInfo?.blocked) return frameOf(base + "open");

  /* CHOEUR : la couronne se dresse quand il couvre reellement quelqu'un. Un
     porteur isole garde sa couronne baissee, ce qui rend lisible d'un coup d'oeil
     lequel des deux choeurs est en train de tenir le paquet. */
  if (e.type === 8 && ctxInfo?.covering) return frameOf(base + "open");

  if (e.type === 3) {
    const last = shooterFire.get(e.id);
    if (last !== undefined) {
      const since = performance.now() - last;
      if (since < SHOOTER_RECOIL) return frameOf(base + "open");   // canon avance
      const untilNext = def.shootCd * 1000 - since;
      if (untilNext > 0 && untilNext < SHOOTER_AIM) {
        return frameOf(base + "walkB");                            // canon recule
      }
    }
    return frameOf(base + "idle");
  }

  // Les autres alternent leurs deux images de marche, a une cadence
  // proportionnelle a leur vitesse.
  const step = Math.floor(t * def.speed / 90) & 1;
  return frameOf(base + (step ? "walkA" : "walkB"));
}
/* COUVERTURE D'AURA, deduite et non transmise. Le serveur la releve une fois par
   tick dans `_auraPass` ; le client refait exactement le meme calcul a partir de
   ce qu'il a deja — les positions, les types, et la difficulte. Zero octet de
   reseau pour un effet qui concerne potentiellement toute la horde, ce qui est
   precisement l'argument du systeme de traits.

   Rend un Set d'identifiants couverts et un Set de porteurs ACTIFS (ceux qui
   couvrent au moins un autre). Le second sert a dresser la couronne du choeur :
   un porteur isole ne doit pas se vanter. */
const auraCovered = new Set();
const auraActive = new Set();
function auraPass(list, diff) {
  auraCovered.clear();
  auraActive.clear();
  const src = [];
  for (const e of list) {
    const def = ENEMY_TYPES[e.type];
    if (!def) continue;
    if (def.auraRadius) src.push({ e, r: def.auraRadius });
    else if (hasTrait(traitsOf(diff, e.type), TRAIT_AURA)) {
      src.push({ e, r: TRAIT_CFG.AURA_RADIUS });
    }
  }
  if (src.length === 0) return;
  for (const s of src) {
    const r2 = s.r * s.r;
    for (const e of list) {
      if (e === s.e) continue;
      if ((e.x - s.e.x) ** 2 + (e.y - s.e.y) ** 2 > r2) continue;
      auraCovered.add(e.id);
      auraActive.add(s.e.id);
    }
  }
}
/* LIEN DE SOIN DU MEDIC. Deduit lui aussi : le client cherche le voisin blesse
   le plus proche dans la portee du type, c'est-a-dire la meme regle que
   `_medic`. Un desaccord ponctuel avec le serveur ne coute rien — ce filet dit
   « il y a un soigneur la-bas », pas « c'est exactement cette cible ».

   Il se coupe quand le medic vient d'etre touche, et le client sait le dire sans
   qu'on lui transmette quoi que ce soit : `hits` porte deja les impacts, deduits
   du compteur de touches. C'est le retour visible de la rupture de soin — sans
   lui, s'acharner sur un medic ne produirait aucun signe.

   Il est trace dans la TEINTE DU TYPE et jamais en `HEAL` : le vert du soin
   promet un gain au joueur, et celui-la soigne l'adversaire. */
function drawMedicLinks(list, now) {
  for (const m of list) {
    if (m.type !== 7) continue;
    if (hits.has(m.id)) continue;
    const def = ENEMY_TYPES[7];
    let best = null, bd = def.healRange * def.healRange;
    for (const o of list) {
      if (o === m || o.hp >= o.maxHp) continue;
      const d2 = (o.x - m.x) ** 2 + (o.y - m.y) ** 2;
      if (d2 < bd) { bd = d2; best = o; }
    }
    if (!best) continue;
    // Depart au CROCHET du mat et non au centre du corps : c'est la que le
    // sprite pose son point emetteur, et deux origines differentes se verraient.
    const ca = Math.cos(m.ang ?? 0), sa = Math.sin(m.ang ?? 0);
    const ox = m.x + 8.5 * ca - (-21) * sa;
    const oy = m.y + 8.5 * sa + (-21) * ca;
    const flow = (now / 260) % 1;
    ctx.strokeStyle = ENEMY_TINT[7];
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(now / 130);
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -flow * 11;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(best.x, best.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}
export function drawEnemies(list, view) {
  const t = performance.now();
  const ts = t / 1000;
  const diff = view?.diff ?? difficulty;
  const windup = view?.windup ?? EMPTY_SET;
  auraPass(list, diff);
  drawMedicLinks(list, t);
  const me = view?.playerList?.find(p => p.id === myId);

  for (const e of list) {
    // Culling (lot I) : hors du rectangle de vue, rien a dessiner. La marge
    // couvre le plus grand sprite avec son halo — une entite ne doit jamais
    // apparaitre ou disparaitre visiblement au bord de l'ecran.
    if (!inView(e.x, e.y)) continue;
    const def = ENEMY_TYPES[e.type] ?? ENEMY_TYPES[0];
    const r = e.elite ? def.r * CFG.ELITE_RADIUS_MUL : def.r;

    /* Retour d'impact : eclair blanc et recul de quelques pixels dans l'axe du
       tir. Le recul ne deplace QUE le sprite, jamais la barre de vie ni les
       halos — la position reelle de l'ennemi ne bouge pas, et un marqueur qui
       sautille dirait le contraire. */
    const hit = hits.get(e.id);
    const flash = hit ? Math.max(0, (hit.until - t) / (HIT_FLASH * 1000)) : 0;
    const kx = flash > 0 ? hit.dx * HIT_KICK * flash : 0;
    const ky = flash > 0 ? hit.dy * HIT_KICK * flash : 0;

    // L'elite doit se reperer dans une foule de deux cents silhouettes : un
    // halo qui pulse et un lisere dore, lisibles meme au milieu de la masse.
    if (e.elite) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 240 + e.id);
      ctx.strokeStyle = ELITE_GOLD;
      ctx.globalAlpha = 0.3 + pulse * 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r + 6 + pulse * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* Respiration, etirement et ecrasement, tous les trois par `scale` : le
       budget d'atlas ne paie QUE les changements de forme. Le dephasage par
       identifiant est indispensable — en phase, deux cents creatures pulsent
       ensemble et l'arene respire comme un seul organisme. */
    let breath = 1 + 0.03 * Math.sin(ts * BREATH_HZ * Math.PI * 2 + e.id * 1.7);
    let squash = flash > 0 ? 0.12 * flash : 0;

    /* AURA RECUE : un lisere, jamais un disque au sol. Un grand disque de plus
       entrerait en concurrence avec les zones de boss et le rempart, et le
       budget de lisibilite est deja depense a deux cents ennemis. Le lisere se
       lit sur la creature elle-meme — c'est ELLE qui encaisse moins, l'endroit
       ou l'information compte est sur son corps.

       BANDE DE RAYON EXCLUSIVE, comme tout ce qui s'enroule autour d'une
       entite : `r + 10`, au-dela du halo d'elite qui vit entre `r + 6` et
       `r + 8`. Deux anneaux au meme rayon reviennent a en perdre un, et une
       elite couverte est precisement la cible dont on veut lire les deux
       informations. */
    if (auraCovered.has(e.id)) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 380 + e.id);
      ctx.strokeStyle = ENEMY_TINT[8];
      ctx.globalAlpha = 0.3 + pulse * 0.25;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, r + 10, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* ANTICIPATION DE RUEE. La creature se RAMASSE : ecrasee dans l'axe de sa
       course et etiree en travers, ce qui est exactement l'inverse de la pose de
       detente — c'est le vocabulaire deja etabli pour les boss (« le brood
       gonfle avant d'eclater, le tireur recule son canon, le tank rentre ses
       plaques »). Un `scale` et aucune image d'atlas : ne pas stocker en image
       ce qu'une transformation sait faire.

       C'est la SEULE information de trait qui vienne du reseau (`wu`), et elle y
       vient parce qu'une position ne dit pas qu'un mouvement se prepare. */
    if (windup.has(e.id)) {
      const gather = 0.55 + 0.45 * Math.sin(t / 60);
      squash = 0;
      breath *= 1 + 0.06 * gather;
    }

    /* KAMIKAZE : la pulsation ACCELERE a mesure que ses PV descendent. Un indice
       progressif de danger plutot qu'un seuil — le joueur doit sentir qu'il
       s'approche du point de rupture, pas le decouvrir a l'instant ou il y
       arrive. Deduit des PV, comme le gonflement du brood. */
    if (e.type === 5) {
      const ready = 1 - Math.min(1, e.hp / Math.max(1, e.maxHp));
      breath *= 1 + 0.09 * ready * (0.5 + 0.5 * Math.sin(t / (140 - ready * 95)));
    }

    // Le rang d'elite est une ECHELLE et un contour, pas une image de plus :
    // la taille est le signal le plus rapide a lire dans une foule de deux
    // cents, et les collisions restent sur le rayon logique.
    let gain = (e.elite ? CFG.ELITE_RADIUS_MUL : 1) * breath;
    /* Kamikaze (lot M) : pulsation CROISSANTE a mesure que les PV tombent —
       l'indice progressif de danger, meme principe que le gonflement du brood
       avant scission. Un kamikaze presque mort bat visiblement plus fort. */
    if (def.blastRadius) {
      const worn = 1 - Math.max(0, e.hp / e.maxHp);
      gain *= 1 + worn * 0.14 * (0.5 + 0.5 * Math.sin(t / (90 - worn * 50) + e.id));
    }

    /* Le joueur local est-il DANS l'angle du bouclier ? La meme mesure que
       `_bulletHitEnemy` cote serveur, refaite ici : angle du centre de l'ennemi
       vers le joueur, replie dans [-pi, pi], compare a la demi-ouverture. */
    let blocked = false;
    if (e.type === 6 && me) {
      let off = Math.atan2(me.y - e.y, me.x - e.x) - (e.ang ?? 0);
      while (off > Math.PI) off -= Math.PI * 2;
      while (off < -Math.PI) off += Math.PI * 2;
      blocked = Math.abs(off) <= (def.shieldArc * Math.PI) / 360;
    }

    drawSprite(ctx, enemyFrame(e, ts, def, { blocked, covering: auraActive.has(e.id) }),
      e.x + kx, e.y + ky, {
      angle: e.ang ?? 0,
      scaleX: gain * (1 + squash * 0.5) * (windup.has(e.id) ? 0.86 : 1),
      scaleY: gain * (1 - squash) * (windup.has(e.id) ? 1.14 : 1),
      flash,
    });

    if (e.hp < e.maxHp) {
      const w = r * 2;
      const tx = e.x - r, ty = e.y - r - 9;
      ctx.fillStyle = alpha(SURFACE.shadow, 0.45);
      ctx.fillRect(tx, ty, w, 3);
      ctx.fillStyle = e.elite ? ELITE_GOLD : (ENEMY_TINT[e.type] ?? ENEMY_TINT[0]);
      ctx.fillRect(tx, ty, w * (e.hp / e.maxHp), 3);
    }
  }
}
