/* ===========================================================================
   ORCHESTRATION — l'ordre de dessin, la boucle, la prediction
   Le seul module de rendu qui appelle les autres. Il existe parce que
   `resetFeedback` touche les caches de toutes les couches et que la boucle les
   appelle toutes : ecrites ailleurs, elles remontaient une arete depuis chaque
   couche superieure — 22 des 25 cycles mesures venaient de la.
   
   L'ORDRE D'AFFICHAGE EST IMPOSE : sol, zones, bonus, ennemis, projectiles,
   joueurs. `ctx` bascule une fois, juste apres les monstres.
   =========================================================================== */

import { audioStats } from "/audio.js";
import { resetHud, updateHud } from "/hud.js";
import { setMusicIntensity } from "/music.js";
import { BOSS_CFG, MECH_JAIL } from "/shared/bosses.js";
import { BIOME_CFG, CFG, WX_BOURRASQUE, biomeAt, weatherAt, weatherFor } from "/shared/game_state.js";
import { COMBAT, WALL, alpha } from "/shared/palette.js";
import { TL_CFG } from "/shared/timeline.js";
import { fmtM } from "/shared/units.js";
import { glActive } from "/sprites.js";
import { INTERP_MS, PERF, PHASE_ROUND, amSpectator, connected, dash, difficulty, latest, lobby, myDashCd, myId, ownedCounts, phase, phaseUnlockText, ping, predicted, setPredicted, signalerErreur, snapshots } from "../core/state.js";
import { alertInfo, alertOrder, alertQueue, alertWarn, bossAnnounce, bossCue, flatten, flushAlerts, flushWorld, interpolated, lastBossId, lastBossPhase, netPerf, netPerfFrame, phaseAnnounce, setAlertInfo, setAlertOrder, setAlertWarn, setBossAnnounce, setBossCue, setLastBossId, setLastBossPhase, setPhaseAnnounce } from "../net/interp.js";
import { ARROW_MARGIN, BOLT_CAPSULE, BOLT_CROSS, BOLT_DIAMOND, blastSeen, bulletTrail, drawAnchors, drawBolt, drawBombs, drawBulwarks, drawDrones, drawEffects, drawEnemies, drawHarvests, drawHealLinks, drawPowerups, drawSancts, drawTurrets, drawZones, pruneTrails, scorches, seenShots, shooterFire, shotTrail, trackShooters, zoneCracks, zoneMotion } from "./actors.js";
import { drawBoss, drawMarkColumns, drawMarks, drawOrbiters, drawPlayers, lastPlayerPos } from "./boss.js";
import { drawArenaBounds, drawFloor, drawGrid, drawHazards, drawObstacles, drawVignette, drawWalls } from "./decor.js";
import { deaths, dmgAgg, drawBursts, drawDeaths, drawParticles, flushDamage, flushSelf, gridPings, hitQueue, hits, particles, pump, selfAgg, setZoneFx, shake, stepFeedback, zoneFx } from "./fx.js";
import { biomeIndex, biomeSeed, camera, colorOf, ctx, decor, gl, groundAt, inView, obstaclesActifs, overCtx, ownerColorOf, setCtx, setVignette, setWeather, setWeatherSeg, sol, underCtx, updateCamera, vignette, weather, weatherSeg } from "./stage.js";
import { arenaEl, readMove } from "../ui/dom.js";

/* Remise a zero entre deux manches. Sans elle, le premier snapshot d'une
   nouvelle manche se comparait au dernier de la precedente : deux cents morts
   d'un coup, un mur de bruit et trois cents fragments a l'ouverture. */
export function resetFeedback() {
  pump.reset();
  particles.length = 0;
  deaths.length = 0;
  gridPings.length = 0;
  // La cadence des tireurs est DEDUITE des projectiles observes : gardee d'une
  // manche a l'autre, elle telegraphierait a partir d'un tir qui n'a pas eu
  // lieu dans celle-ci.
  shooterFire.clear();
  seenShots.clear();
  dmgAgg.clear();
  // Un cumul sous le seuil d'affichage attend la fenetre suivante : sans ce
  // vidage, le filet de soin de la manche precedente ressortirait sur la
  // premiere image de la suivante.
  selfAgg.clear();
  bulletTrail.clear();
  shotTrail.clear();
  lastPlayerPos.clear();
  // Lot E : tout ce que les zones ont depose meurt avec la manche — une
  // decoloration ou une direction de courant gardee d'une manche a l'autre
  // commenterait un sol qui n'existe plus.
  zoneCracks.clear();
  zoneMotion.clear();
  blastSeen.clear();
  scorches.length = 0;
  setZoneFx(0);
  resetHud();
  alertQueue.length = 0;
  hits.clear();
  hitQueue.length = 0;
  shake.mag = 0; shake.x = 0; shake.y = 0;
  setAlertOrder(null); setAlertWarn(null); setAlertInfo(null);
  setBossCue(null);
}
// Vitesse portee de la prediction locale. Elle ne sert qu'au sol glissant du
// Metronome et rejoue exactement la formule du serveur — sinon le personnage
// prevu et le personnage reel divergent de plus de 90 px et se recalent sec.
const slipV = { x: 0, y: 0 };
let lastFrame = performance.now();
let fps = 0;
/* LA BOUCLE NE MEURT PLUS SUR UNE EXCEPTION. `requestAnimationFrame` ne se
   reamorce qu'a la fin du corps : n'importe quel jet en cours de route arretait
   le rendu DEFINITIVEMENT, et le joueur ne voyait pas une erreur mais un jeu qui
   ne repond plus — ecran de cartes qui n'apparait pas, pause qui n'ouvre pas,
   HUD fige. Le pire rapport entre la gravite de la cause et celle du symptome.

   Le reamorcage vit donc dans un `finally`, et l'erreur part par le canal deja
   en place (`signalerErreur`, dedupliquee par signature — une erreur de rendu se
   repete soixante fois par seconde, elle ne doit remonter qu'une). Une image
   perdue se voit a peine ; une boucle morte ne se recupere qu'en rechargeant. */
export function boucleDeRendu(now) {
  try {
    frameBody(now);
  } catch (err) {
    signalerErreur("rendu", err?.message ?? String(err), err?.stack);
  } finally {
    requestAnimationFrame(boucleDeRendu);
  }
}
function frameBody(now) {
  const raw = now - lastFrame;
  const dt = Math.min(raw / 1000, 0.1);
  lastFrame = now;
  if (PERF) netPerfFrame(raw);
  // Moyenne glissante sur environ une seconde : l'inverse du dt brut saute de
  // 45 a 75 d'une image a l'autre et ne se lit pas.
  if (PERF && dt > 0) fps += (1 / dt - fps) * Math.min(1, dt * 1.5);

  /* Hors du `if` : une transition en attente doit sortir meme quand il n'y a
     plus d'instantane a dessiner — c'est precisement le cas de `roundEnd`. */
  flushWorld(now);

  /* L'INTENSITE musicale suit l'etat du jeu, relue a chaque image. C'est une
     cible : le sequenceur glisse vers elle — montee franche, descente lente —
     et chaque couche (kick, basse, charleys, acide) nait au seuil qui la
     concerne. Ici on ne fait que dire au juke-box a quel point ca chauffe. */
  setMusicIntensity(gameIntensity());

  /* L'ARENE NE SE MONTRE QUE PENDANT LA MANCHE, et c'est la boucle qui en
     decide — pas un des quinze chemins qui posent `hidden` sur un ecran.

     Les trois canvas sont sous les menus depuis toujours, et les menus sont
     opaques : tant qu'un seul est affiche, rien ne se voit. Mais une TRANSITION
     croise deux voiles a opacite partielle, et deux couches a 0,67 et 0,69 ne
     valent que 0,90 d'opacite composee — la grille du sol transparait donc
     pendant les trois cents millisecondes du passage, ce qui se lit exactement
     comme « la map du jeu apparait ».

     Le defaut avait deux moitiés, et masquer les traite d'un coup. La grille
     seule dans le cas ordinaire ; mais `latest` n'est PAS vide apres une fin de
     manche — seul `round` le remet a zero — donc la branche du dessus etait
     prise au salon et au bilan, et c'est le MONDE de la derniere image qui se
     redessinait en boucle dessous. `phase` entre donc aussi dans la condition
     de dessin : hors manche, on retombe sur le sol seul.

     `visibility` et non `hidden` : `resize()` lit `clientWidth` sur ces canvas,
     et un `display: none` les rendrait larges de zero le jour ou la fenetre
     change de taille pendant qu'on est au menu. */
  const enJeu = phase === PHASE_ROUND;
  arenaEl.style.visibility = enJeu ? "" : "hidden";

  if (connected && latest && enJeu) {
    const renderTime = now - INTERP_MS;
    if (phase === PHASE_ROUND) {
      stepPrediction(dt);
      updateCamera(dt);
      /* Diffusion des evenements sur l'horloge de RENDU et non a la reception :
         c'est ce qui fait tomber le son sur l'image et non 110 ms avant. */
      pump.pump(snapshots, renderTime);
      flushAlerts(now);
      flushDamage(now);
      flushSelf(now);
    }
    stepFeedback(dt);
    draw(interpolated(renderTime) ?? flatten(latest));
  } else {
    // Hors manche : le sol seul, sur la couche du dessous. Les deux autres sont
    // videes a chaque image — un canvas WebGL qu'on cesse de dessiner garde un
    // contenu indefini, et la derniere image de la manche precedente aurait pu
    // reapparaitre par-dessous le salon. La camera reste ou elle etait : le
    // rectangle de vue est le seul morceau de salle qu'il faut peindre.
    setCtx(underCtx);
    ctx.fillStyle = decor.arena;
    ctx.fillRect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
    drawGrid();
    overCtx.clearRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
    gl?.begin(null, camera.x0, camera.y0);
    gl?.end();
  }
}
function stepPrediction(dt) {
  dash.cd = Math.max(0, dash.cd - dt);
  dash.t = Math.max(0, dash.t - dt);

  const me = latest.players.get(myId);
  if (!me) { setPredicted(null); return; }
  if (!predicted) { setPredicted({ x: me.x, y: me.y }); return; }

  if (me.downed || latest.over) {
    predicted.x = me.x; predicted.y = me.y;
    dash.t = 0;
    return;
  }

  /* Prison : le serveur fige le joueur, la prediction doit le figer aussi.
     Sans ca on jouait quatre secondes a cote de son propre personnage, puis on
     revenait d'un coup dans la cage — le pire des deux mondes. */
  if ((latest.marks ?? []).some(m => m.mech === MECH_JAIL && m.a === myId)) {
    predicted.x = me.x; predicted.y = me.y;
    dash.t = 0;
    slipV.x = 0; slipV.y = 0;
    return;
  }

  // Position d'avant deplacement : elle dit de quel cote d'un mur de
  // verrouillage on se trouvait, exactement comme cote serveur.
  const wasX = predicted.x, wasY = predicted.y;

  if (dash.t > 0) {
    predicted.x += dash.x * CFG.DASH_SPEED * dt;
    predicted.y += dash.y * CFG.DASH_SPEED * dt;
  } else {
    const m = readMove();
    /* SOL DU BIOME (lot V). Le client REJOUE la meme lecture que `_players` — le
       ralentissement multiplie la vitesse, le glissement change la formule. Il
       ne demande rien au serveur : la geometrie est regeneree et un disque ne
       bouge pas. Sans ce rejeu, marcher dans un champ de ralentissement faisait
       diverger la prediction jusqu'au recalage sec, c'est-a-dire exactement le
       bafouillage que la prediction existe pour supprimer. */
    const g = groundAt(predicted.x, predicted.y);
    const sp = CFG.PLAYER_SPEED * g.slow;
    if (latest.slip || g.slip) {
      // Meme formule que `_players` cote serveur : la vitesse REJOINT la
      // consigne au lieu de la prendre.
      const k = Math.min(1, (latest.slip ? BOSS_CFG.SLIP_ACCEL : BIOME_CFG.SLIP_ACCEL) * dt);
      slipV.x += (m.x * sp - slipV.x) * k;
      slipV.y += (m.y * sp - slipV.y) * k;
      predicted.x += slipV.x * dt;
      predicted.y += slipV.y * dt;
    } else {
      slipV.x = m.x * sp;
      slipV.y = m.y * sp;
      predicted.x += m.x * sp * dt;
      predicted.y += m.y * sp * dt;
    }
  }

  /* BOURRASQUE. Sa direction est deterministe (`weatherFor`), donc la prediction
     la rejoue au pixel pres. Elle s'applique DANS la passe de deplacement, avant
     les limites et avant les obstacles — c'est l'ordre du serveur, et l'inverser
     pousserait le personnage dans les piliers une image sur deux. */
  if (weather?.id === WX_BOURRASQUE) {
    predicted.x += weather.dx * BIOME_CFG.GUST_PUSH * dt;
    predicted.y += weather.dy * BIOME_CFG.GUST_PUSH * dt;
  }

  /* Les memes limites que le serveur, et le meme blocage sur les murs. Sans ca,
     la prediction marchait droit dans la couronne d'une constriction ou a
     travers un mur de verrouillage : le rappel la ramenait ensuite en continu,
     ce qui donne exactement le recalage permanent qu'on cherche a eviter. */
  const r = CFG.PLAYER_RADIUS;
  const B = latest.bounds ?? { x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H };
  predicted.x = Math.min(Math.max(predicted.x, B.x0 + r), B.x1 - r);
  predicted.y = Math.min(Math.max(predicted.y, B.y0 + r), B.y1 - r);
  const W = latest.walls;
  if (W) {
    const t = W.t / 2 + r;
    if (Math.abs(predicted.x - W.x) < t) predicted.x = wasX <= W.x ? W.x - t : W.x + t;
    if (Math.abs(predicted.y - W.y) < t) predicted.y = wasY <= W.y ? W.y - t : W.y + t;
  }
  /* Obstacles du biome : meme regle rejouee que `_obstacleBlock`, repoussage par
     axe et du cote d'ou l'on venait. C'est le plus gros risque de recalage
     permanent du lot — un pilier que le serveur bloque et que la prediction
     traverse ramene le personnage en arriere a chaque image. */
  const obs = obstaclesActifs();
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    if (o.maxHp > 0 && (latest.cover?.find(c => c[0] === i)?.[1] ?? 1) <= 0) continue;
    const hw = o.w / 2 + r, hh = o.h / 2 + r;
    const dx = predicted.x - o.x, dy = predicted.y - o.y;
    if (Math.abs(dx) >= hw || Math.abs(dy) >= hh) continue;
    if (hw - Math.abs(dx) <= hh - Math.abs(dy)) predicted.x = wasX <= o.x ? o.x - hw : o.x + hw;
    else predicted.y = wasY <= o.y ? o.y - hh : o.y + hh;
  }

  // Pendant l'esquive, on relache le rappel vers la position serveur : le
  // dash local est en avance d'un aller-retour, le corriger en direct
  // donnerait un mouvement qui bafouille au pire moment.
  const pull = 1 - Math.exp((dash.t > 0 ? -1.2 : -6) * dt);
  predicted.x += (me.x - predicted.x) * pull;
  predicted.y += (me.y - predicted.y) * pull;
}
/* Ce que le jeu dit a la musique : un seul nombre entre 0 et 1. Tres doux au
   salon, montee avec le script, pic sur le boss —
   qui se tend encore a mesure que ses barres tombent, parce que la fin d'un
   combat est son moment le plus dangereux. Les coefficients sont des reglages
   d'oreille, pas de la simulation : ils n'ont rien a faire dans CFG.

   La montee suit le PALIER (segment et beat) et non l'horloge : c'est ce que
   suit la pression, et une intensite indexee sur le temps reel monterait
   pendant les combats de boss, ou l'horloge de horde est justement arretee. */
function gameIntensity() {
  if (phase !== PHASE_ROUND || !latest) return 0.05;
  const v = latest;
  const palier = ((v.segment ?? 1) - 1) * TL_CFG.BEATS + (v.beat ?? 0);
  let i = 0.20 + Math.min(0.45, palier * 0.02);
  if (v.boss) {
    const bars = v.boss.bars ?? 1;
    i = Math.max(i, 0.72) + (CFG.BOSS_BARS - bars) * 0.05;
  }
  return Math.max(0.05, Math.min(1, i));
}
/* UNE seule passe. La separation en deux — le monde secoue, l'interface fixe —
   n'a plus lieu d'etre : le HUD est un FRERE du canvas et non son contenu, donc
   il ne peut plus trembler avec lui. Le tressaillement est devenu un
   `transform` CSS sur l'element canvas, que le compositeur applique sans que la
   boucle de jeu ait a redessiner quoi que ce soit.

   Les pourcentages d'une translation CSS se rapportent a la boite de l'element,
   qui fait exactement la taille de l'arene : la conversion monde -> ecran est
   donc une division, et elle reste juste quelle que soit la fenetre. */
function draw(v) {
  /* METEO (lot V) : DEDUITE de `(graine, segment)` et non recue. Elle est
     recalculee au CHANGEMENT DE SEGMENT et pas a chaque image — c'est la meme
     fonction pure que le serveur, mais elle tire un generateur, et la rejouer
     soixante fois par seconde pour une valeur constante sur cinq minutes n'a pas
     de sens. Le segment vient de la cle `sg`, que le client a deja. */
  if ((v.segment ?? 0) !== weatherSeg) {
    setWeatherSeg(v.segment ?? 0);
    setWeather(weatherFor(v.diff ?? difficulty, biomeSeed, weatherSeg));
    setVignette(null);
  }
  // Le fond n'est peint que par la couche du DESSOUS ; les deux autres doivent
  // rester transparentes, sinon elles effacent ce qu'il y a dessous. Le
  // remplissage et le vidage couvrent le RECTANGLE DE VUE — en coordonnees
  // monde sous la transformation camera, c'est exactement tout le canvas.
  // La TEINTE vient du decor de mode (lot T) : elle dit dans quelle difficulte
  // on joue avant meme le premier monstre.
  underCtx.fillStyle = sol.arena;
  underCtx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  overCtx.clearRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  // Le lot WebGL s'ouvre autour de TOUT le monde : les quads sont accumules au
  // fil des appels et vides a la fin, donc leur ordre entre eux est celui du
  // code, mais leur position dans l'empilement est celle du canvas.
  gl?.begin(null, camera.x0, camera.y0);
  drawWorld(v);
  gl?.end();
  applyShake();
  drawScreen(v);
}
let shakeApplied = false;
function applyShake() {
  const on = shake.mag > 0;
  if (!on && !shakeApplied) return;
  shakeApplied = on;
  // Le tressaillement porte sur `#arena` et non sur un canvas : les trois
  // couches doivent bouger ENSEMBLE, au sous-pixel pres.
  // En part de la VUE : la boite de #arena fait un ecran, plus la salle.
  arenaEl.style.transform = on
    ? `scale(1.015) translate(${(shake.x / CFG.VIEW_W * 100).toFixed(3)}%, ` +
      `${(shake.y / CFG.VIEW_H * 100).toFixed(3)}%)`
    : "scale(1.015)";
}
/* Tout ce qui vit sur l'ECRAN et non dans le monde. Le canvas n'en dessine plus
   une ligne — voir `hud.js`. Ce qui reste ici est ce que le HUD ne peut pas
   deduire seul : l'expiration des consignes, l'annonce de phase (qui demande la
   table des boss) et les compteurs locaux. */
function drawScreen(v) {
  const now = performance.now();
  if (alertOrder && now > alertOrder.until) setAlertOrder(null);
  if (alertWarn && now > alertWarn.until) setAlertWarn(null);
  if (alertInfo && now > alertInfo.until) setAlertInfo(null);

  const st = PERF ? audioStats() : null;
  updateHud(v, {
    now, myId, lobby, ping, difficulty, amSpectator,
    /* BIOME et METEO (lot V). Deux chaines et non deux index : le HUD n'a pas a
       importer une table de plus pour afficher un nom, et c'est le client qui
       tient deja la geometrie. La meteo est absente hors cauchemar et un segment
       sur trois — le HUD n'ecrit alors rien du tout. */
    biomeNom: biomeAt(biomeIndex).nom,
    meteoNom: weather ? weatherAt(weather.id)?.nom ?? "" : "",
    myColor: colorOf(myId),
    dashCd: myDashCd,
    counts: ownedCounts(myId),
    alertOrder, alertWarn, alertInfo,
    bossAnnounce, phaseAnnounce,
    phaseText: v.boss && v.boss.phase > 0
      ? phaseUnlockText(v.boss.kind ?? 0, v.boss.phase) : "",
    perf: PERF, fps, particles: particles.length,
    renderer: glActive() ? "GL" : "2D",
    draws: gl?.draws ?? 0, quads: gl?.quads ?? 0,
    voices: st ? st.active : 0, peak: st ? st.peak : 0,
    net: netPerf.txt,
  });
}
function drawWorld(v) {
  /* LA LIGNE DE PARTAGE. Tout ce qui suit vit SOUS les entites : sol, zones,
     telegraphes, projectiles, marqueurs. Elle bascule une seule fois, juste
     apres les monstres — voir plus bas. */
  setCtx(underCtx);
  /* La MATIERE d'abord, la graduation par-dessus. L'ordre n'est pas indifferent :
     la grille existe pour rendre les distances lisibles, le sol pour dire ou
     l'on est — un decor pose sur une graduation supprime la graduation. */
  drawFloor();
  drawGrid();

  if (v.slow) {
    ctx.fillStyle = alpha(WALL.fill, 0.06);
    ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  }

  // La couronne interdite passe SOUS les zones : c'est le sol lui-meme, et une
  // annonce dessinee dessous serait invisible exactement la ou il faut encore
  // pouvoir la lire — au moment ou on court pour rentrer.
  drawArenaBounds(v.bounds);
  /* BIOME (lot V). Les dangers passent SOUS les zones de boss, et c'est impose :
     un danger d'environnement est du SOL (regle 1 du lot), une zone de boss est
     une annonce. Dessine par-dessus, un geyser masquerait exactement ce qu'il
     faut regarder — c'est le raisonnement deja tenu pour `drawEffects`, qui
     reste volontairement sous les entites. */
  drawHazards(v.tm);
  drawZones(v.zones, v.tm);
  /* Les obstacles APRES les zones : ils sont de la matiere pleine, et une
     annonce de boss peinte par-dessus un pilier laisserait croire qu'on peut y
     entrer. Ils restent sur `#cvUnder` avec le reste du lot — c'est un critere
     d'acceptation, et ils ne peuvent de toute facon jamais recouvrir une entite,
     qui n'entre pas dedans. */
  drawObstacles(v.cover);
  // Le rempart passe SOUS les entites : c'est un marquage de sol, et il occupe
  // 6,5 m de rayon (11 m ancre) — dessine par-dessus, il masquait exactement
  // les ennemis qu'il attire.
  drawBulwarks(v.bulwarks ?? []);
  // Ancre et sanctuaire (lot C) : des marquages de sol, comme le rempart, et
  // pour la meme raison — dessines par-dessus, ils masqueraient exactement ce
  // qu'ils retiennent ou protegent.
  drawAnchors(v.anchors ?? []);
  drawSancts(v.sancts ?? []);
  drawTurrets(v.turrets ?? []);
  drawEffects(v.effects);
  drawPowerups(v.powerups);

  pruneTrails(v);
  // Les tireurs se telegraphent depuis les projectiles observes : il faut donc
  // regarder les projectiles AVANT de dessiner les ennemis. Le suivi ne dessine
  // rien, il n'a donc rien a voir avec la couche courante.
  trackShooters(v);

  drawHarvests(v.harvests ?? []);
  drawBombs(v.bombList ?? []);
  // Les marqueurs de mecanique passent SOUS les entites, comme le rempart :
  // un cercle de regroupement de 135 px de rayon dessine par-dessus masquait
  // exactement les joueurs qu'il demande de compter.
  drawMarks(v.marks ?? [], v.playerList);
  // Les depouilles passent SOUS les vivants : une sequence de mort dessinee
  // par-dessus la horde qui avance masquerait ce qui arrive.
  drawDeaths();
  drawEnemies(v.enemyList, v);

  /* BASCULE VERS LA COUCHE DU DESSUS. Tout ce qui suit passait deja par-dessus
     les monstres dans l'ordre de dessin d'origine : boss, drones, anneaux de
     joueur, barres, noms, lames orbitales, murs, fragments, vignettage. Le seul
     ecart assume est que les anneaux d'un joueur passent desormais AU-DESSUS de
     son propre sprite au lieu de dessous — ils vivent a 18 px et plus du centre
     pour un personnage de 14 px de rayon, le recouvrement se compte en un ou
     deux pixels. */
  setCtx(overCtx);

  /* Le FILET DE SOIN du medic (lot M), PAR-DESSUS la horde : c'est lui qui
     permet de reperer le soigneur ennemi dans la melee et de couper le soin
     en priorite — dessine dessous, il disparaissait sous les corps qu'il
     soigne. Vert ennemi, pas le vert HEAL : ce soin-la est une menace. */
  drawHealLinks(v.enemyList);

  if (v.boss) {
    if (v.boss.id !== lastBossId) {
      setLastBossId(v.boss.id);
      setBossAnnounce(performance.now());
      setLastBossPhase(0);
    }
    if (v.boss.phase > lastBossPhase) {
      setLastBossPhase(v.boss.phase);
      setPhaseAnnounce(performance.now());
    }
    drawBoss(v.boss);
    /* Le second Jumeau passe par la MEME routine : c'est le meme adversaire, et
       `twin` n'y choisit que la moitie de motif a dessiner. `kind` doit etre
       repris de `boss` — le snapshot ne le porte pas deux fois, et sans lui le
       second Jumeau se serait dessine en Ravageur. */
    if (v.boss2) {
      drawBoss({ ...v.boss2, kind: v.boss.kind, phase: v.boss.phase, bars: v.boss.bars,
                 hp: v.boss.hp, maxHp: v.boss.maxHp, twin: 1 });
    }
  }
  drawDrones(v.droneList);

  /* LES PROJECTILES PASSENT AU-DESSUS DES ENNEMIS, et c'est un changement d'ordre
     assume : ils etaient sous la horde, donc une balle disparaissait derriere le
     premier corps rencontre et on ne voyait plus ce qu'on tirait. L'ordre impose
     par le lot est : sol -> zones -> bonus -> ennemis -> projectiles -> joueurs.

     `drawEffects` reste, lui, SOUS les entites, contre la lettre de l'ordre :
     une nova de 250 px de rayon dessinee par-dessus masquerait exactement les
     joueurs que le lot vient de rendre identifiables. Une onde est un ornement
     de sol, un projectile est une entite — la ligne de partage est la. */
  for (const s of v.shotList) {
    if (!inView(s.x, s.y, 40)) continue;
    // Rouge franc ET losange : deux signaux pour la meme information, parce
    // qu'aucun des deux ne suffit seul a 220 ennemis.
    drawBolt(s, CFG.SHOT_RADIUS, COMBAT.shot, shotTrail, BOLT_DIAMOND);
  }
  for (const b of v.bulletList) {
    if (!inView(b.x, b.y, 40)) continue;
    /* La balle prend LA COULEUR DE SON TIREUR. Elle repond du meme coup a deux
       questions : « est-ce a moi que ca fait mal » et « qui a tire ca » — la
       seconde n'avait aucune reponse en cooperatif.
       Le projectile de soin garde le vert, mais il porte surtout une CROIX : sa
       couleur ne le distingue plus du tir de degats du soigneur, qui est vert
       lui aussi depuis que la teinte dit la classe. La forme le fait, et elle
       survit au chaos et au daltonisme — meme raison que le losange hostile.

       `ownerColorOf` et non `colorOf` : un proprietaire inconnu — serveur
       anterieur au lot, ou tireur deja deconnecte dont les balles volent encore
       — doit retomber sur l'ambre d'origine et non emprunter la couleur du
       premier joueur venu, qui serait un mensonge sur qui a tire. */
    drawBolt(b, CFG.BULLET_RADIUS + (b.heal ? 1.5 : 0),
             b.heal ? COMBAT.bulletHeal : (ownerColorOf(b.owner) ?? COMBAT.bullet),
             bulletTrail, b.heal ? BOLT_CROSS : BOLT_CAPSULE);
  }

  drawPlayers(v.playerList, v.tm, v.marks ?? []);
  /* Colonnes lumineuses des marqueurs accueillants (lot E) : le seul element
     autorise a depasser en hauteur, donc dessine PAR-DESSUS la horde — le
     disque du marqueur, lui, reste sous les entites, comme documente. */
  drawMarkColumns(v.marks ?? [], v.tm);
  // Les lames orbitales par-dessus tout le monde : c'est la bande de rayon la
  // plus disputee de l'ecran (givre, rempart, marqueurs) et la seule qui dise
  // au joueur qu'il possede la carte.
  drawOrbiters(v.playerList, v.tm);
  // Les murs passent PAR-DESSUS les entites : ils sont infranchissables, et un
  // ennemi dessine devant laissait croire qu'on pouvait le rejoindre.
  drawWalls(v.walls);
  // Fragments par-dessus tout le monde : ce sont des confirmations, elles ne
  // doivent jamais passer derriere ce qu'elles confirment. Les chiffres de
  // degats, eux, sont montes d'un cran : ils vivent dans le DOM par-dessus le
  // canvas, donc au-dessus de tout par construction.
  drawParticles();
  // Les ondes annulaires par-dessus les fragments : elles bornent la gerbe, et
  // une onde dessinee dessous se serait perdue dedans.
  drawBursts();

  // Le vignettage ferme le monde. Il vient en dernier parce qu'il assombrit
  // TOUT ce qui precede : place plus tot, il aurait laisse les entites des
  // bords a pleine luminosite sur un sol deja eteint.
  drawVignette();
  // Les fleches d'allies hors champ APRES le vignettage : ce sont des
  // indicateurs d'ecran, pas des elements du monde — assombries, elles
  // perdraient exactement la lisibilite qui les justifie.
  drawAllyArrows(v.playerList);
}
function drawAllyArrows(players) {
  if (phase !== PHASE_ROUND) return;
  const me = predicted ?? { x: camera.x, y: camera.y };
  for (const p of players) {
    if (p.id === myId) continue;
    if (inView(p.x, p.y, -20)) continue;
    const dx = p.x - camera.x, dy = p.y - camera.y;
    const ang = Math.atan2(dy, dx);
    const hw = CFG.VIEW_W / 2 - ARROW_MARGIN, hh = CFG.VIEW_H / 2 - ARROW_MARGIN;
    const k = Math.min(hw / Math.max(Math.abs(dx), 1e-6),
                       hh / Math.max(Math.abs(dy), 1e-6));
    const ax = camera.x + dx * k, ay = camera.y + dy * k;
    const col = colorOf(p.id);
    const pulse = p.downed ? 0.45 + 0.4 * Math.sin(performance.now() / 160) : 1;

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.9 * pulse;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-7, -8);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = col;
    ctx.font = "700 13px ui-monospace, Menlo, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(fmtM(Math.hypot(p.x - me.x, p.y - me.y)),
                 ax, ay + (ay < camera.y ? 26 : -16));
    ctx.restore();
  }
}
