/* ===========================================================================
   LE SOL — grille, vignettage, obstacles, dangers
   LA couche a ouvrir pour un travail graphique sur les cartes. Elle ne dessine
   que ce qui est SOUS les entites, sur `#cvUnder`, et elle ne decide de rien :
   la geometrie vient de `buildBiome`, l'etat d'un danger de `hazardState`.
   =========================================================================== */

import { BIOME_CFG, CFG, HZ_EMBER, HZ_GEYSER, HZ_SLIP, HZ_SLOW, WX_BRUME, hazardState } from "/shared/game_state.js";
import { BIOME, BOSS, SURFACE, WALL, ZONE, alpha } from "/shared/palette.js";
import { drawGridPings } from "./fx.js";
import { GRID_FINE, GRID_MAJOR, camera, ctx, decor, hazardsActifs, obstaclesActifs, setVignette, vignette, weather } from "./stage.js";

export function drawGrid() {
  // Seuls les traits du RECTANGLE DE VUE sont traces (lot I) : la grille de
  // toute la salle, c'est trois fois plus de lignes dans chaque dimension
  // pour des traits que personne ne voit. Les traits restent alignes sur la
  // salle (multiples de la maille), pas sur la vue — la grille est le sol, il
  // ne glisse pas avec la camera.
  const vx0 = camera.x0, vx1 = camera.x0 + CFG.VIEW_W;
  const vy0 = camera.y0, vy1 = camera.y0 + CFG.VIEW_H;
  const lines = (step) => {
    ctx.beginPath();
    for (let x = Math.max(step, Math.ceil(vx0 / step) * step); x < Math.min(CFG.ARENA_W, vx1 + step); x += step) {
      ctx.moveTo(x + .5, vy0); ctx.lineTo(x + .5, vy1);
    }
    for (let y = Math.max(step, Math.ceil(vy0 / step) * step); y < Math.min(CFG.ARENA_H, vy1 + step); y += step) {
      ctx.moveTo(vx0, y + .5); ctx.lineTo(vx1, y + .5);
    }
    ctx.stroke();
  };
  ctx.lineWidth = 1;

  /* SECTIONS ETEINTES (lot T, cauchemar) : une ligne FINE sur `skip` n'est pas
     tracee. C'est purement visuel — la machine est abimee — et jamais un trou
     dans la graduation : les traits MARQUES tous les 20 m sont tous la, dans les
     trois modes. Sans eux, « rayon 6 m » cesserait de vouloir dire quelque chose
     a l'ecran, ce qui est la seule raison d'etre de la grille.
     Deterministe et non aleatoire : une grille qui scintille d'une image a
     l'autre attire l'oeil sur le decor, exactement l'inverse du but. */
  const skip = decor.skip;
  ctx.strokeStyle = decor.gridFine;
  ctx.beginPath();
  let n = 0;
  for (let x = GRID_FINE; x < CFG.ARENA_W; x += GRID_FINE, n++) {
    if (skip && n % skip === 1) continue;
    ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, CFG.ARENA_H);
  }
  n = 0;
  for (let y = GRID_FINE; y < CFG.ARENA_H; y += GRID_FINE, n++) {
    if (skip && n % skip === 2) continue;
    ctx.moveTo(0, y + .5); ctx.lineTo(CFG.ARENA_W, y + .5);
  }
  ctx.stroke();

  ctx.strokeStyle = decor.gridMajor;
  ctx.beginPath();
  for (let x = GRID_MAJOR; x < CFG.ARENA_W; x += GRID_MAJOR) {
    ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, CFG.ARENA_H);
  }
  for (let y = GRID_MAJOR; y < CFG.ARENA_H; y += GRID_MAJOR) {
    ctx.moveTo(0, y + .5); ctx.lineTo(CFG.ARENA_W, y + .5);
  }
  ctx.stroke();

  drawGridPings();
}
/* VIGNETTAGE. Il concentre le regard et masque les apparitions hors champ.
   Peint APRES le monde et avant rien d'autre : c'est du decor, il ne doit
   jamais passer devant une consigne — mais celles-ci sont dans le DOM, donc
   au-dessus par construction. Son degrade est mis en cache (`vignette`, declare
   tout en haut du module avec `decor`).

   SA FORCE ET SON ETENDUE VIENNENT DU MODE (lot T) : leger en calme, fort en
   cauchemar. Et en cauchemar seulement, il PULSE lentement — c'est la seule
   animation d'ambiance du jeu, et elle est volontairement sous le seuil de la
   conscience : on la sent respirer, on ne la regarde pas. Une pulsation lisible
   serait un ornement superpose au jeu, ce que la charte refuse.

   La pulsation interdit le cache : le degrade change a chaque image. Elle ne
   coute que dans le mode qui la demande — les deux autres gardent le cache. */
export function drawVignette() {
  const puls = decor.pulse > 0
    ? 1 + decor.pulse * Math.sin(performance.now() / 2600)
    : 1;
  /* BRUME (lot V). LE PIEGE DU LOT, et il tient en une ligne : une meteo qui
     touche la visibilite ne doit JAMAIS masquer un telegraphe de boss ni un
     marqueur pose sur un joueur. Elle assombrit donc les BORDS — ou rien
     d'important ne se joue — et RECULE le depart du degrade, ce qui laisse le
     centre strictement aussi net qu'avant.

     LE DEGRADE EST EN REPERE DE VUE (lot I) et non de salle : un vignettage est
     un effet d'ECRAN, il suit la camera. Construit sur l'arene entiere, il
     aurait assombri un coin de la salle au lieu du bord de l'image — et sur
     4800 x 2700 le joueur n'aurait jamais vu que du noir ou que du clair.
     Il est mis en cache et seulement retranslate ; la pulsation de cauchemar et
     la brume sont les deux seules choses qui le font reconstruire, et ce sont
     justement les deux qui changent a l'image. */
  const fog = weather?.id === WX_BRUME;
  if (!vignette || decor.pulse > 0 || fog) {
    const r = Math.hypot(CFG.VIEW_W, CFG.VIEW_H) / 2;
    const from = decor.vignetteFrom + (fog ? BIOME_CFG.FOG_FROM : 0);
    const amt = decor.vignette * puls * (fog ? BIOME_CFG.FOG_VIGNETTE : 1);
    setVignette(ctx.createRadialGradient(
      CFG.VIEW_W / 2, CFG.VIEW_H / 2, r * Math.min(0.9, from),
      CFG.VIEW_W / 2, CFG.VIEW_H / 2, r));
    vignette.addColorStop(0, alpha(SURFACE.void, 0));
    vignette.addColorStop(1, alpha(SURFACE.void, Math.min(1, amt)));
  }
  ctx.save();
  ctx.translate(camera.x0, camera.y0);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.restore();
}
/* Constriction. La couronne interdite est ASSOMBRIE et non peinte en rouge :
   le rouge est deja la couleur de tout ce qui explose, et une bande rouge
   permanente sur le pourtour aurait rendu illisible la seule chose qui compte
   pendant un combat, les annonces. Le palier a venir, lui, est en pointilles
   rouges : c'est une annonce, il en porte le langage. */
export function drawArenaBounds(b) {
  if (!b) return;
  const full = b.x0 <= 0 && b.y0 <= 0 && b.x1 >= CFG.ARENA_W && b.y1 >= CFG.ARENA_H;

  if (!full) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
    ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.fillStyle = alpha(SURFACE.void, 0.72);
    ctx.fill("evenodd");
    ctx.restore();

    ctx.strokeStyle = alpha(ZONE.edge, 0.75);
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x0 + 1.5, b.y0 + 1.5, b.x1 - b.x0 - 3, b.y1 - b.y0 - 3);
  }

  if (b.warn > 0) {
    ctx.strokeStyle = BOSS.barWarn;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(b.nx0, b.ny0, b.nx1 - b.nx0, b.ny1 - b.ny0);
    ctx.setLineDash([]);
  }
}
/* Murs de verrouillage. Ils BLOQUENT et ne blessent pas : d'ou une couleur
   franchement differente de tout ce qui explose, et un aplat plein plutot
   qu'un contour — on doit lire « obstacle », jamais « zone a esquiver ». */
/* --- BIOME (lot V) : obstacles et dangers -----------------------------------

   Tout ce qui suit vit sur `#cvUnder`, le canvas 2D du bas. C'est un critere
   d'acceptation et non une preference : un danger d'environnement est du SOL, et
   le mettre sur `#cv` le ferait passer AU-DESSUS des entites — un geyser
   dessine par-dessus la horde masquerait exactement ce qu'il faut voir. Meme
   raisonnement que `drawEffects`.

   LA REGLE 1 EST DANS CE DESSIN, pas seulement dans la simulation : un danger
   d'environnement s'annonce par sa GEOMETRIE PERMANENTE, jamais par un compte a
   rebours. La bouche du geyser est donc toujours visible ; seul son jet est
   intermittent. Le canal du telegraphe instantane appartient au boss et ne se
   partage pas — un cercle ambre qui se remplit en 1,4 s est indistinguable
   d'une zone de Ravageur, et le joueur cesserait de savoir lequel il regarde. */
export function drawObstacles(cover) {
  const list = obstaclesActifs();
  if (!list.length) return;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    // `cover` est une liste CREUSE : la plupart des obstacles n'y figurent pas,
    // et deux biomes sur trois n'ont aucune couverture destructible.
    const k = o.maxHp > 0 ? (cover?.find(c => c[0] === i)?.[1] ?? 1) : 1;
    if (o.maxHp > 0 && k <= 0) continue;      // abattu : il n'existe plus
    const x = o.x - o.w / 2, y = o.y - o.h / 2;

    ctx.fillStyle = o.maxHp > 0 ? BIOME.cover : BIOME.block;
    ctx.fillRect(x, y, o.w, o.h);
    /* Arete haut-gauche eclairee : la meme direction de lumiere que les
       creatures (`sprites.js`), sinon le decor et les monstres semblent eclaires
       par deux soleils. Deux traits et non un degrade — c'est du decor, il ne
       doit pas attirer l'oeil. */
    ctx.strokeStyle = alpha(o.maxHp > 0 ? BIOME.coverEdge : BIOME.blockEdge, 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + o.h); ctx.lineTo(x, y); ctx.lineTo(x + o.w, y);
    ctx.stroke();

    /* Un mur destructible RESTE un mur : il ne devient pas ambre parce qu'on
       peut le casser — un lisere suffit a dire qu'il cede, et changer sa couleur
       l'aurait fait entrer dans la grammaire du danger, ou il n'a rien a faire.
       Le lisere se CREUSE a mesure qu'il encaisse : c'est la seule jauge du jeu
       qui n'est pas une barre, parce qu'un mur n'est pas une entite. */
    if (o.maxHp > 0) {
      ctx.strokeStyle = alpha(BIOME.coverEdge, 0.85);
      ctx.lineWidth = 2;
      ctx.setLineDash([Math.max(3, 14 * k), 6]);
      ctx.strokeRect(x + 1, y + 1, o.w - 2, o.h - 2);
      ctx.setLineDash([]);
    }
  }
}
export function drawHazards(tm) {
  const list = hazardsActifs();
  if (!list.length) return;

  for (const h of list) {
    const st = hazardState(h, tm);

    /* CHAMPS QUI NE BLESSENT PAS. Ni ambre ni rouge : ils ne disent pas
       « sortir », ils disent « ici ca traine ». Un disque teinte SANS anneau —
       la bande de rayon autour d'un personnage est deja saturee, et un anneau de
       plus au sol se serait confondu avec un rempart. */
    if (h.kind === HZ_SLOW || h.kind === HZ_SLIP) {
      const col = h.kind === HZ_SLOW ? BIOME.slow : BIOME.slip;
      ctx.fillStyle = alpha(col, 0.10);
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
      /* Hachures pour le glissant, points pour le ralentissement : la SIGNATURE
         avant la couleur, comme pour les zones. Deux disques bleu-gris voisins
         ne se distingueraient pas en pleine melee. */
      ctx.strokeStyle = alpha(col, 0.22);
      ctx.lineWidth = 1;
      ctx.save();
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.clip();
      if (h.kind === HZ_SLIP) {
        for (let d = -h.r; d <= h.r; d += 13) {
          ctx.beginPath();
          ctx.moveTo(h.x + d, h.y - h.r); ctx.lineTo(h.x + d + h.r, h.y + h.r);
          ctx.stroke();
        }
      } else {
        for (let d = -h.r; d <= h.r; d += 16) {
          ctx.beginPath();
          ctx.moveTo(h.x - h.r, h.y + d); ctx.lineTo(h.x + h.r, h.y + d);
          ctx.stroke();
        }
      }
      ctx.restore();
      continue;
    }

    /* GEOMETRIE PERMANENTE. Elle est dessinee QUE LE DANGER SOIT ACTIF OU NON,
       et c'est toute la regle 1 : on apprend la carte, on ne lit pas un compte a
       rebours. Un anneau eteint pour la bouche du geyser, le RAIL entier pour la
       braise — sans le rail, une braise qui derive redevient une zone mobile de
       boss, c'est-a-dire le vocabulaire qu'on refuse. */
    if (h.kind === HZ_EMBER) {
      ctx.strokeStyle = alpha(BIOME.hazardIdle, 0.75);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(h.x - h.dx * h.span, h.y - h.dy * h.span);
      ctx.lineTo(h.x + h.dx * h.span, h.y + h.dy * h.span);
      ctx.stroke();
    } else {
      ctx.strokeStyle = alpha(BIOME.hazardIdle, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.stroke();
    }

    if (!st.on) continue;

    /* PARTIE ACTIVE. `st.k` porte la montee et la retombee du jet : c'est du
       DESSIN et rien d'autre, la zone qui blesse est pleine des la premiere
       image. `ZONE_FORGIVE` est le seul endroit du jeu autorise a faire differer
       l'affiche et la logique, et il pardonne dans l'autre sens. */
    const k = st.k;
    ctx.fillStyle = alpha(BIOME.hazard, 0.20 * k);
    ctx.beginPath(); ctx.arc(st.x, st.y, h.r * k, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(BIOME.hazard, 0.75 * k);
    ctx.lineWidth = 2;
    ctx.stroke();

    /* Le geyser PULSE, la flaque non. Le premier est intermittent et sa
       pulsation dit « c'est en train de souffler » ; la seconde est permanente et
       une pulsation lui donnerait un rythme qu'elle n'a pas. C'est la meme
       distinction que les signatures de zone du lot E. */
    if (h.kind === HZ_GEYSER) {
      const puls = 0.5 + 0.5 * Math.sin(tm * 9);
      ctx.fillStyle = alpha(BIOME.hazard, 0.28 * k * puls);
      ctx.beginPath(); ctx.arc(st.x, st.y, h.r * 0.55 * k, 0, Math.PI * 2); ctx.fill();
    }
  }
}
export function drawWalls(w) {
  if (!w) return;
  const t = w.t;
  ctx.fillStyle = alpha(WALL.fill, 0.30);
  ctx.fillRect(w.x - t / 2, 0, t, CFG.ARENA_H);
  ctx.fillRect(0, w.y - t / 2, CFG.ARENA_W, t);
  ctx.strokeStyle = alpha(WALL.edge, 0.85);
  ctx.lineWidth = 2;
  ctx.strokeRect(w.x - t / 2, 0, t, CFG.ARENA_H);
  ctx.strokeRect(0, w.y - t / 2, CFG.ARENA_W, t);
}
