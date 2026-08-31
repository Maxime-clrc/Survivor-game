
import { audioStats, playSound, resetAudioStats, setCharge, setFaisceauChaleur, startCharge, startFaisceau, stopCharge, stopFaisceau } from "/audio.js";
import { resetHud, updateHud } from "/hud.js";
import { setMusicIntensity, setMusicScene } from "/music.js";
import { ARMES } from "/shared/armes.js";
import { BOSS_CFG, MECH_JAIL, estFinal } from "/shared/bosses.js";
import { BIOME_CFG, CFG, SIL_MISSILE, SIL_PORTEUR, weatherFor, windAt } from "/shared/game_state.js";
import { biomeNom, weatherNom } from "/shared/biomes.js";
import { CARD_CFG } from "/shared/cards.js";
import { BOSS, COMBAT, WALL, alpha } from "/shared/palette.js";
import { TL_CFG } from "/shared/timeline.js";
import { fmtM } from "/shared/units.js";
import { drawSprite, glActive } from "/sprites.js";
import { INTERP_MS, PERF, PHASE_ROUND, amSpectator, bancReleve, connected, dash, difficulty, gfx, latest, lobby, myId, ownedCounts, phase, phaseUnlockText, ping, predicted, setBancReleve, setPredicted, signalerErreur, snapshots } from "../core/state.js";
import { alertInfo, alertOrder, alertQueue, alertWarn, bossAnnounce, bossCue, flatten, flushAlerts, flushWorld, interpolated, lastBossId, lastBossPhase, netPerf, netPerfFrame, phaseAnnounce, setAlertInfo, setAlertOrder, setAlertWarn, setBossAnnounce, setBossCue, setLastBossId, setLastBossPhase, setPhaseAnnounce } from "../net/interp.js";
import { ARROW_MARGIN, BOLT_DIAMOND, blastSeen, bulletTrail, drawAnchorChains, drawAnchors, drawArc, drawBolt, drawBombs, drawBonusSignal, drawBulwarks, drawDrones, drawEffects, drawEnemies, drawFinArcs, drawHarvests, drawMissile, drawPowerups, drawSancts, drawSoinLinks, drawTurrets, drawVisee, drawZones, pruneTrails, scorches, seenShots, shooterFire, shotTrail, silhouetteArme, trackShooters, zoneCracks, zoneMotion } from "./actors.js";
import { drawBoss, drawGazeArene, drawGazeCone, drawGazeEcran, drawMarkColumns, drawMarks, drawOrbiters, drawPlayers, drawTwinFocus, faisceauAllume, lastPlayerPos, noeudsSortis, noeudsVus, resetGaze } from "./boss.js";
import { drawArenaBounds, drawAtmosphere, drawBaies, drawCoulee, drawFloor, drawFond, drawGrid, drawObstacles, drawAmer, drawPremierPlan, drawVignette, drawWalls, drawWeather } from "./decor.js";
import { drawHazards } from "./dangers.js";
import { drawLumiere } from "./lumiere.js";
import { drawProps, drawTraces } from "./props.js";
import { PARTICLE_MAX, blastMarks, bossMortQueue, bouches, bursts, dashMarks, deaths, dmgAgg, finArcs, fxWhite, drawBlastMarks, drawBursts, drawDashMarks, drawDeaths, drawParticles, drawPulse, flushDamage, flushSelf, gridPings, hitQueue, hits, particles, pulse, pump, selfAgg, setZoneFx, shake, shieldHit, spawnDashMark, stepFeedback, timeWarp, zoneFx } from "./fx.js";
import { biomeIndex, biomeSeed, camera, colorOf, ctx, decor, gl, groundAt, inView, obstaclesActifs, overCtx, ownerColorOf, setCtx, setVignette, setWeather, setWeatherSeg, sol, underCtx, updateCamera, vignette, weather, weatherSeg } from "./stage.js";
import { arenaEl, cardsEl, merchantEl, readMove } from "../ui/dom.js";

export function resetFeedback() {
  pump.reset();
  particles.length = 0;
  deaths.length = 0;
  gridPings.length = 0;
  bursts.length = 0;
  blastMarks.length = 0;
  dashMarks.length = 0;
  pulse.t = 0;
  timeWarp.stop = 0; timeWarp.held = 0;
  shooterFire.clear();
  seenShots.clear();
  dmgAgg.clear();
  selfAgg.clear();
  bulletTrail.clear();
  shotTrail.clear();
  lastPlayerPos.clear();
  faisceauAllume.clear();
  noeudsVus.clear();
  noeudsSortis.length = 0;
  zoneCracks.clear();
  zoneMotion.clear();
  blastSeen.clear();
  shieldHit.clear();
  bouches.clear();
  bossMortQueue.length = 0;
  finArcs.length = 0;
  scorches.length = 0;
  setZoneFx(0);
  resetHud();
  alertQueue.length = 0;
  hits.clear();
  hitQueue.length = 0;
  shake.mag = 0; shake.x = 0; shake.y = 0;
  setAlertOrder(null); setAlertWarn(null); setAlertInfo(null);
  setBossCue(null);
  resetGaze();
  stopFaisceau(); faisceauOn = false;
  stopCharge(); chargeOn = false;
  armeResVu = -1; rechargeOn = false;
}
const slipV = { x: 0, y: 0 };
let lastFrame = performance.now();
let fps = 0;
// le temps d'image BRUT, celui qui se sent : `dt` est plafonne a 0,1 s pour la
// simulation, donc il ment justement sur les images qui coutent.
let rawFrame = 0;
/* UNE IMAGE QUI ECHOUE NE DOIT PAS DETRUIRE LA PRECEDENTE. `draw()` commence par
   repeindre le sol et effacer la couche haute ; une exception laisse donc une
   arene VIDE au lieu d'une arene PERIMEE, et le HUD, dessine en dernier, se fige
   sur ses valeurs — d'ou l'image trompeuse « arene vide, HUD plein ».

   TROIS IMAGES ET NON UNE : un accroc isole (contexte WebGL perdu le temps d'une
   image) ne doit pas figer une partie, une panne installee doit se voir. Le
   compteur retombe a zero des qu'une image passe.

   Le gel ne se leve pas. A ce stade le rendu est casse ; le bandeau le dit et
   c'est un rechargement qui repart. */
const RENDU_ECHECS_MAX = 3;
let rendufige = false;
let echecs = 0;
export function boucleDeRendu(now) {
  try {
    frameBody(now);
    echecs = 0;
  } catch (err) {
    signalerErreur("rendu", err?.message ?? String(err), err?.stack);
    if (++echecs >= RENDU_ECHECS_MAX && !rendufige) {
      rendufige = true;
      signalerErreur("rendu",
        `arrete apres ${RENDU_ECHECS_MAX} images en echec — recharge la page`, null);
    }
  } finally {
    requestAnimationFrame(boucleDeRendu);
  }
}
function frameBody(now) {
  const raw = now - lastFrame;
  rawFrame = raw;
  const dt = Math.min(raw / 1000, 0.1);
  lastFrame = now;
  if (PERF) netPerfFrame(raw);
  if (PERF && dt > 0) fps += (1 / dt - fps) * Math.min(1, dt * 1.5);

  flushWorld(now);

  setMusicIntensity(gameIntensity());
  setMusicScene(phase !== PHASE_ROUND || !latest ? "menu"
    : !latest.boss ? "horde"
    : estFinal(latest.boss.kind ?? 0) ? "final" : "boss");

  const enJeu = phase === PHASE_ROUND;
  arenaEl.style.visibility = enJeu ? "" : "hidden";
  routerArme(enJeu);

  if (connected && latest && enJeu) {
    // le hitstop est un RETARD supplementaire de l'horloge de rendu : la
    // simulation ne s'arrete jamais, c'est l'image qui tient.
    const renderTime = now - INTERP_MS - timeWarp.held * 1000;
    if (phase === PHASE_ROUND) {
      stepPrediction(dt);
      updateCamera(dt);
      pump.pump(snapshots, renderTime);
      flushAlerts(now);
      flushDamage(now);
      flushSelf(now);
    }
    stepFeedback(dt);
    draw(interpolated(renderTime) ?? flatten(latest));
  } else {
    setCtx(underCtx);
    ctx.fillStyle = decor.arena;
    ctx.fillRect(0, 0, CFG.ARENA_W, CFG.ARENA_H);
    drawGrid();
    overCtx.clearRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
    gl?.begin(null, camera.x0, camera.y0);
    gl?.end();
  }
}
/* LES RESSOURCES D'ARME PARLENT, ET ELLES NE PARLENT QU'A LEUR PORTEUR.
   `armeRes` circule depuis longtemps (index 36 du tuple joueur) et le client le
   DESSINE deja quatre fois — nappe de chaleur, ligne de charge, anneau de rampe,
   crans de chargeur. Trois de ces quatre lectures etaient MUETTES.

   Un seul point de passage, et il est LOCAL : ce qu'on entend est SA propre
   arme. Quatre joueurs sur quatre railguns ne font pas quatre bourdonnements de
   charge, et aucune de ces voix ne dispute sa place a celles de la horde.
   Le tir est automatique : tant que la nappe est a l'ecran, l'arme tire — la
   meme condition porte donc l'image et le son, et rien de plus ne circule. */
let faisceauOn = false, chargeOn = false;
let armeResVu = -1, rechargeOn = false;
function routerArme(enJeu) {
  const me = enJeu && connected ? latest?.players?.get(myId) : null;
  const a = me ? ARMES[me.arme] : null;
  const vivant = !!me && !me.downed;

  if (vivant && a?.chaleur && me.armeRes < 1) {
    if (!faisceauOn) { startFaisceau(); faisceauOn = true; }
    setFaisceauChaleur(me.armeRes);
  } else if (faisceauOn) {
    // la saturation coupe NET, tout le reste s'eteint
    stopFaisceau(!!a?.chaleur && me?.armeRes >= 1);
    faisceauOn = false;
  }

  /* LA CHARGE EST LA MEME HORLOGE QUE LA LIGNE DE TIR QUI SE REMPLIT : l'oeil et
     l'oreille lisent `armeRes`, donc ils ne peuvent pas se contredire. Elle
     s'arrete a 0,98 — la fin de la montee appartient au claquement du depart. */
  if (vivant && a?.charge && me.armeRes < 0.98) {
    if (!chargeOn) { startCharge(); chargeOn = true; }
    setCharge(me.armeRes);
  } else if (chargeOn) {
    stopCharge();
    chargeOn = false;
  }

  /* LE CHARGEUR SE COMPTE A L'OREILLE, et le SENS DU PAS suffit a le lire :
     `armeRes` descend par crans tant qu'il reste des obus, et monte en continu
     pendant la recharge. Aucun champ ne s'ouvre, aucun front ne vient du
     serveur — la fenetre de 1,8 s ou l'arme ne rend rien s'annonce et se ferme. */
  if (vivant && a?.chargeur) {
    const r = me.armeRes;
    if (armeResVu >= 0) {
      const dernier = 1 / a.chargeur;
      if (r > armeResVu + 0.001) {
        if (!rechargeOn) { rechargeOn = true; playSound("recharge"); }
      } else if (r < armeResVu - 0.001
                 && r > 0 && r <= dernier + 0.001 && armeResVu > dernier + 0.001) {
        playSound("dernierCoup");
      }
      if (rechargeOn && r >= 0.999) { rechargeOn = false; playSound("rechargeFin"); }
    }
    armeResVu = r;
  } else {
    armeResVu = -1;
    rechargeOn = false;
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

  if ((latest.marks ?? []).some(m => m.mech === MECH_JAIL && m.a === myId)) {
    predicted.x = me.x; predicted.y = me.y;
    dash.t = 0;
    slipV.x = 0; slipV.y = 0;
    return;
  }

  const wasX = predicted.x, wasY = predicted.y;

  if (dash.t > 0) {
    predicted.x += dash.x * CFG.DASH_SPEED * dt;
    predicted.y += dash.y * CFG.DASH_SPEED * dt;
  } else {
    const m = readMove();
    const g = groundAt(predicted.x, predicted.y);
    const sp = CFG.PLAYER_SPEED * g.slow;
    if (latest.slip || g.slip) {
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

  const vent = windAt(weather, latest.tm ?? 0);
  if (vent) {
    const k = BIOME_CFG.GUST_PUSH * vent.force * dt;
    predicted.x += vent.dx * k;
    predicted.y += vent.dy * k;
  }

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

  const pull = 1 - Math.exp((dash.t > 0 ? -1.2 : -6) * dt);
  predicted.x += (me.x - predicted.x) * pull;
  predicted.y += (me.y - predicted.y) * pull;
}
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
function draw(v) {
  if (rendufige) return;
  if ((v.segment ?? 0) !== weatherSeg) {
    setWeatherSeg(v.segment ?? 0);
    setWeather(weatherFor(v.diff ?? difficulty, biomeSeed, weatherSeg));
    setVignette(null);
  }
  underCtx.fillStyle = sol.arena;
  underCtx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  overCtx.clearRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
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
  arenaEl.style.transform = on
    ? `scale(1.015) translate(${(shake.x / CFG.VIEW_W * 100).toFixed(3)}%, ` +
      `${(shake.y / CFG.VIEW_H * 100).toFixed(3)}%)`
    : "scale(1.015)";
}
/* DIX SECONDES, UNE LIGNE. `?perf` MONTRE les chiffres, il ne les RETIENT pas :
   quatre densites fois cinq paliers de qualite font vingt relevés, et recopier a
   la main un compteur qui bouge en donne vingt dont aucun n'est comparable au
   suivant.

   LE PIRE CENTILE COMPTE PLUS QUE LA MOYENNE. Un rendu qui tient 60 images par
   seconde en moyenne mais tombe a 22 sur les souffles est pire qu'un rendu plat
   a 50 — et c'est la mediane qui le cache.

   LE p95 NE SUFFIT PAS, ET SON PROPRE CONTROLE L'A MONTRE : sur 105 images dont
   5 a 45 ms, la pointe pese 4,76 % et le p95 tombe JUSTE EN DESSOUS d'elle, donc
   il rend 60 images par seconde sur un echantillon qui en perd cinq. Une mesure
   qui rate exactement ce qu'elle cherche est pire qu'une mesure absente. La
   ligne porte donc le p99 ET le MAXIMUM : le p99 dit ce qui se sent a la
   manette, le maximum dit s'il existe une image qui saute.

   Aucune allocation par image : trois tableaux poses au demarrage, remplis en
   place, tries une seule fois a l'echeance. */
const REL = { dt: [], frag: [], draws: [], quads: [], n: 0 };
function relCentile(a, p) {
  const t = a.slice(0, REL.n).sort((x, y) => x - y);
  return t[Math.min(t.length - 1, Math.max(0, Math.round((t.length - 1) * p)))] ?? 0;
}
function relMoy(a) {
  let s = 0;
  for (let i = 0; i < REL.n; i++) s += a[i];
  return REL.n ? s / REL.n : 0;
}
function relever(now, raw, st) {
  if (REL.n === 0) resetAudioStats();
  if (REL.n < 4096) {
    REL.dt[REL.n] = raw;
    REL.frag[REL.n] = particles.length;
    REL.draws[REL.n] = gl?.draws ?? 0;
    REL.quads[REL.n] = gl?.quads ?? 0;
    REL.n++;
  }
  if (now < bancReleve) return;
  setBancReleve(0);
  const me = latest?.players?.get(myId);
  const arme = me ? (ARMES[me.arme]?.id ?? "?") : "?";
  const pop = latest?.enemies?.size ?? 0;
  const ligne = "| " + [
    ["low", "medium", "high", "ultra"][gfx] ?? gfx,
    glActive() ? "GL" : "2D",
    arme,
    pop,
    Math.round(1000 / Math.max(0.001, relCentile(REL.dt, 0.5))),
    Math.round(1000 / Math.max(0.001, relCentile(REL.dt, 0.99))),
    relCentile(REL.dt, 0.99).toFixed(1),
    relCentile(REL.dt, 1).toFixed(1),
    Math.round(relMoy(REL.draws)),
    Math.round(relMoy(REL.quads)),
    relCentile(REL.frag, 1),
    st ? st.peak : 0,
    st ? Math.round(st.dropped / (BANC_RELEVE_S)) : 0,
    st ? (st.stolen / BANC_RELEVE_S).toFixed(1) : 0,
  ].join(" | ") + " |";
  REL.n = 0;
  console.log(ligne);
  if (navigator.clipboard) navigator.clipboard.writeText(ligne).catch(() => { });
  const el = document.getElementById("bancDit");
  if (el) el.textContent = ligne;
}
const BANC_RELEVE_S = 10;

function drawScreen(v) {
  const now = performance.now();
  if (alertOrder && now > alertOrder.until) setAlertOrder(null);
  if (alertWarn && now > alertWarn.until) setAlertWarn(null);
  if (alertInfo && now > alertInfo.until) setAlertInfo(null);

  const st = PERF || bancReleve > 0 ? audioStats() : null;
  if (bancReleve > 0) relever(now, rawFrame, st);
  updateHud(v, {
    now, myId, lobby, ping, difficulty, amSpectator,
    // le bandeau ne recouvre jamais une decision : il attend que l'ecran de
    // cartes ou le marchand se referme
    ecranOuvert: !cardsEl.hidden || !merchantEl.hidden,
    biomeNom: biomeNom(biomeIndex),
    meteoNom: weather ? weatherNom(weather.id) : "",
    myColor: colorOf(myId),
    camX: camera.x0, camY: camera.y0,
    counts: ownedCounts(myId),
    alertOrder, alertWarn, alertInfo,
    bossAnnounce, phaseAnnounce,
    phaseText: v.boss && v.boss.phase > 0
      ? phaseUnlockText(v.boss.kind ?? 0, v.boss.phase) : "",
    perf: PERF, fps, particles: particles.length, fragMax: PARTICLE_MAX,
    // TOUT CE QUE LE PLAN 15 A OUVERT, EN UN SEUL NOMBRE : souffles, depouilles,
    // bouches, echeances de mort de boss, touches en attente d'etalement. Un
    // effet qui fuit se voit ici avant de se voir a l'image.
    fx: bursts.length + deaths.length + bouches.size
      + bossMortQueue.length + hitQueue.length + finArcs.length,
    renderer: glActive() ? "GL" : "2D",
    draws: gl?.draws ?? 0, quads: gl?.quads ?? 0,
    voices: st ? st.active : 0, peak: st ? st.peak : 0,
    refus: st ? st.dropped : 0, vols: st ? st.stolen : 0,
    net: netPerf.txt,
  });
}
function drawWorld(v) {
  setCtx(underCtx);
  // le fond passe AVANT la matiere : le plancher de la Nebuleuse est presque
  // opaque, donc ce qui reste dessous est ce qui a une surface — la nebuleuse et
  // son gaz. Le CIEL, lui, se regarde par une baie, et une baie repeint le fond
  // a pleine valeur PAR-DESSUS le plancher : c'est du verre, pas un trou.
  drawFond();
  drawFloor();
  drawBaies();
  drawCoulee();
  drawAmer();
  drawGrid();
  drawProps();
  // LA LUMIERE S'ARRETE ICI. Tout ce qui suit est du gameplay — marques,
  // dangers, zones, telegraphes, obstacles — et n'est donc JAMAIS assombri.
  // La hierarchie de lisibilite tient par l'ordre de dessin, pas par un reglage.
  drawLumiere(v);
  drawBlastMarks();
  for (const p of v.playerList) {
    if (!p.dashing || p.downed || !ownedCounts(p.id).has("vif_argent")) continue;
    spawnDashMark(p.x, p.y, CARD_CFG.VIF_ARGENT_RADIUS,
                  ownerColorOf(p.id) ?? COMBAT.bullet, p.id);
  }
  drawDashMarks();
  // la pulsation du regard passe AVANT tout telegraphe au sol : c'est par
  // construction, et non par reglage d'opacite, qu'elle n'en masque aucun.
  drawGazeArene(v);

  if (v.slow) {
    ctx.fillStyle = alpha(WALL.fill, 0.06);
    ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  }

  drawArenaBounds(v.bounds);
  drawHazards(v.tm);
  drawWeather(v.tm ?? 0);
  drawAtmosphere(v.tm ?? 0);
  drawZones(v.zones, v.tm);
  drawObstacles(v.cover);
  drawVisee(v.playerList);
  drawBulwarks(v.bulwarks ?? []);
  drawAnchors(v.anchors ?? []);
  drawAnchorChains(v.anchors ?? [], v.enemyList);
  drawSancts(v.sancts ?? []);
  drawTurrets(v.turrets ?? []);
  drawEffects(v.effects);
  drawPowerups(v.powerups);

  pruneTrails(v);
  trackShooters(v);

  drawHarvests(v.harvests ?? []);
  drawBombs(v.bombList ?? []);
  drawMarks(v.marks ?? [], v.playerList);
  drawGazeCone(v);
  drawDeaths();
  // l'acte final passe AVEC les depouilles : c'est la meme mort, et il doit
  // rester sous les corps vivants comme elles.
  drawFinArcs();
  drawEnemies(v.enemyList, v);

  setCtx(overCtx);

  // LA PREMIERE CHOSE DE `#cv`, donc la plus basse au-dessus des corps : le
  // signal d'un bonus passe devant la horde, et devant rien d'autre.
  drawBonusSignal(v.powerups);

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
    drawBoss(v.boss, v.tm ?? 0);
    if (v.boss2) {
      // brulure et vulnerabilite suivent la barre : `_damage` redirige le jumeau
      // vers le boss avant de lire l etat, donc les deux corps le partagent.
      drawBoss({ ...v.boss2, kind: v.boss.kind, phase: v.boss.phase, bars: v.boss.bars,
                 hp: v.boss.hp, maxHp: v.boss.maxHp, twin: 1,
                 burn: v.boss.burn, vuln: v.boss.vuln }, v.tm ?? 0);
      drawTwinLink(v.boss, v.boss2);
      drawTwinFocus(v.boss, v.boss2);
    }
  }
  drawDrones(v.droneList);

  for (const s of v.shotList) {
    if (!inView(s.x, s.y, 40)) continue;
    drawBolt(s, CFG.SHOT_RADIUS, COMBAT.shot, shotTrail, BOLT_DIAMOND);
  }
  const armeDe = new Map(v.playerList.map(p => [p.id, ARMES[p.arme]]));
  for (const b of v.bulletList) {
    if (!inView(b.x, b.y, 40)) continue;
    const col = ownerColorOf(b.owner) ?? COMBAT.bullet;
    if (b.sil === SIL_MISSILE) { drawMissile(b, col); continue; }
    const [forme, taille] = silhouetteArme(armeDe.get(b.owner));
    // LE PORTEUR EST GROS, LES PLOMBS SONT FINS : sans cet ecart le joueur ne
    // voit pas ce qui se scinde, et la distance de scission ne s'apprend pas
    drawBolt(b, CFG.BULLET_RADIUS * (b.sil === SIL_PORTEUR ? 1.8 : taille), col,
             bulletTrail, forme);
  }

  drawSoinLinks(v.links, v.playerList, v.enemyList, v.sancts ?? []);

  drawPlayers(v.playerList, v.tm, v.marks ?? []);
  drawMarkColumns(v.marks ?? [], v.tm);
  drawOrbiters(v.playerList, v.tm);
  drawWalls(v.walls);
  drawParticles();
  drawBursts();

  drawVignette();
  drawPremierPlan(v);
  drawGazeEcran();
  drawPulse();
  drawAllyArrows(v.playerList);
  if (REPERE) drawRepere();
}
// `?repere` : la MEME croix posee aux memes coordonnees monde sur les trois
// couches. Elles se superposent, ou la bascule WebGL a une transformation a
// elle. Seul critere rejouable de l'alignement, densite de pixels comprise.
// MULTIPLE : le lien des Jumeaux est visible EN PERMANENCE, pas seulement
// pendant `MECH_LINK`. Le joueur doit voir POURQUOI il faut les separer sans
// qu'on le lui dise — et il se coupe des qu'ils sont assez loin.
function drawTwinLink(a, b) {
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  if (d > BOSS_CFG.TWIN_HEAL_RANGE) return;
  const k = 1 - d / BOSS_CFG.TWIN_HEAL_RANGE;
  // le flux va DANS LES DEUX SENS par alternance : c'est un echange, pas un don.
  drawArc("twin", a.x, a.y, b.x, b.y, {
    col: BOSS.twinEdge, coeur: COMBAT.flash,
    amp: 0.05 + 0.05 * k, width: 1.6 + 2.6 * k, branches: 1, cut: 0,
    flow: { col: COMBAT.flash, hz: 1.1 + k, n: 2 + Math.round(k * 3),
            size: 2 + k * 2, sens: (performance.now() / 2200 | 0) % 2 ? -1 : 1 },
  });
}
const REPERE = location.search.includes("repere");
function drawRepere() {
  const pas = 400;
  const bras = 26;
  const x0 = Math.floor(camera.x0 / pas) * pas;
  const y0 = Math.floor(camera.y0 / pas) * pas;
  for (let x = x0; x < camera.x0 + CFG.VIEW_W + pas; x += pas) {
    for (let y = y0; y < camera.y0 + CFG.VIEW_H + pas; y += pas) {
      for (const c of [underCtx, overCtx]) {
        c.strokeStyle = c === underCtx ? "#ff2d55" : "#00e5ff";
        c.lineWidth = c === underCtx ? 4 : 1.5;
        c.beginPath();
        c.moveTo(x - bras, y); c.lineTo(x + bras, y);
        c.moveTo(x, y - bras); c.lineTo(x, y + bras);
        c.stroke();
      }
      drawSprite(ctx, fxWhite, x, y, { scaleX: bras / 8, scaleY: 0.35, alpha: 0.9 });
      drawSprite(ctx, fxWhite, x, y, { scaleX: 0.35, scaleY: bras / 8, alpha: 0.9 });
    }
  }
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
