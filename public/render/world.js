
import { audioStats } from "/audio.js";
import { resetHud, updateHud } from "/hud.js";
import { setMusicIntensity, setMusicScene } from "/music.js";
import { BOSS_CFG, MECH_JAIL } from "/shared/bosses.js";
import { BIOME_CFG, CFG, WX_BOURRASQUE, biomeAt, weatherAt, weatherFor } from "/shared/game_state.js";
import { COMBAT, WALL, alpha } from "/shared/palette.js";
import { TL_CFG } from "/shared/timeline.js";
import { fmtM } from "/shared/units.js";
import { drawSprite, glActive } from "/sprites.js";
import { INTERP_MS, PERF, PHASE_ROUND, amSpectator, connected, dash, difficulty, latest, lobby, myDashCd, myId, ownedCounts, phase, phaseUnlockText, ping, predicted, setPredicted, signalerErreur, snapshots } from "../core/state.js";
import { alertInfo, alertOrder, alertQueue, alertWarn, bossAnnounce, bossCue, flatten, flushAlerts, flushWorld, interpolated, lastBossId, lastBossPhase, netPerf, netPerfFrame, phaseAnnounce, setAlertInfo, setAlertOrder, setAlertWarn, setBossAnnounce, setBossCue, setLastBossId, setLastBossPhase, setPhaseAnnounce } from "../net/interp.js";
import { ARROW_MARGIN, BOLT_CAPSULE, BOLT_DIAMOND, blastSeen, bulletTrail, drawAnchors, drawBolt, drawBombs, drawBulwarks, drawDrones, drawEffects, drawEnemies, drawHarvests, drawPowerups, drawSancts, drawSoinLinks, drawTurrets, drawZones, pruneTrails, scorches, seenShots, shooterFire, shotTrail, trackShooters, zoneCracks, zoneMotion } from "./actors.js";
import { drawBoss, drawMarkColumns, drawMarks, drawOrbiters, drawPlayers, lastPlayerPos } from "./boss.js";
import { drawArenaBounds, drawFloor, drawGrid, drawHazards, drawObstacles, drawVignette, drawWalls } from "./decor.js";
import { blastMarks, bursts, deaths, dmgAgg, fxWhite, drawBlastMarks, drawBursts, drawDeaths, drawParticles, drawPulse, flushDamage, flushSelf, gridPings, hitQueue, hits, particles, pulse, pump, selfAgg, setZoneFx, shake, stepFeedback, timeWarp, zoneFx } from "./fx.js";
import { biomeIndex, biomeSeed, camera, colorOf, ctx, decor, gl, groundAt, inView, obstaclesActifs, overCtx, ownerColorOf, setCtx, setVignette, setWeather, setWeatherSeg, sol, underCtx, updateCamera, vignette, weather, weatherSeg } from "./stage.js";
import { arenaEl, readMove } from "../ui/dom.js";

export function resetFeedback() {
  pump.reset();
  particles.length = 0;
  deaths.length = 0;
  gridPings.length = 0;
  bursts.length = 0;
  blastMarks.length = 0;
  pulse.t = 0;
  timeWarp.stop = 0; timeWarp.held = 0;
  shooterFire.clear();
  seenShots.clear();
  dmgAgg.clear();
  selfAgg.clear();
  bulletTrail.clear();
  shotTrail.clear();
  lastPlayerPos.clear();
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
const slipV = { x: 0, y: 0 };
let lastFrame = performance.now();
let fps = 0;
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
  if (PERF && dt > 0) fps += (1 / dt - fps) * Math.min(1, dt * 1.5);

  flushWorld(now);

  setMusicIntensity(gameIntensity());
  setMusicScene(phase !== PHASE_ROUND || !latest ? "menu"
    : latest.boss ? "boss" : "horde");

  const enJeu = phase === PHASE_ROUND;
  arenaEl.style.visibility = enJeu ? "" : "hidden";

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

  if (weather?.id === WX_BOURRASQUE) {
    predicted.x += weather.dx * BIOME_CFG.GUST_PUSH * dt;
    predicted.y += weather.dy * BIOME_CFG.GUST_PUSH * dt;
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
function drawScreen(v) {
  const now = performance.now();
  if (alertOrder && now > alertOrder.until) setAlertOrder(null);
  if (alertWarn && now > alertWarn.until) setAlertWarn(null);
  if (alertInfo && now > alertInfo.until) setAlertInfo(null);

  const st = PERF ? audioStats() : null;
  updateHud(v, {
    now, myId, lobby, ping, difficulty, amSpectator,
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
  setCtx(underCtx);
  drawFloor();
  drawGrid();
  drawBlastMarks();

  if (v.slow) {
    ctx.fillStyle = alpha(WALL.fill, 0.06);
    ctx.fillRect(camera.x0, camera.y0, CFG.VIEW_W, CFG.VIEW_H);
  }

  drawArenaBounds(v.bounds);
  drawHazards(v.tm);
  drawZones(v.zones, v.tm);
  drawObstacles(v.cover);
  drawBulwarks(v.bulwarks ?? []);
  drawAnchors(v.anchors ?? []);
  drawSancts(v.sancts ?? []);
  drawTurrets(v.turrets ?? []);
  drawEffects(v.effects);
  drawPowerups(v.powerups);

  pruneTrails(v);
  trackShooters(v);

  drawHarvests(v.harvests ?? []);
  drawBombs(v.bombList ?? []);
  drawMarks(v.marks ?? [], v.playerList);
  drawDeaths();
  drawEnemies(v.enemyList, v);

  setCtx(overCtx);

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
    if (v.boss2) {
      drawBoss({ ...v.boss2, kind: v.boss.kind, phase: v.boss.phase, bars: v.boss.bars,
                 hp: v.boss.hp, maxHp: v.boss.maxHp, twin: 1 });
    }
  }
  drawDrones(v.droneList);

  for (const s of v.shotList) {
    if (!inView(s.x, s.y, 40)) continue;
    drawBolt(s, CFG.SHOT_RADIUS, COMBAT.shot, shotTrail, BOLT_DIAMOND);
  }
  for (const b of v.bulletList) {
    if (!inView(b.x, b.y, 40)) continue;
    drawBolt(b, CFG.BULLET_RADIUS, ownerColorOf(b.owner) ?? COMBAT.bullet,
             bulletTrail, BOLT_CAPSULE);
  }

  drawSoinLinks(v.links, v.playerList, v.enemyList);

  drawPlayers(v.playerList, v.tm, v.marks ?? []);
  drawMarkColumns(v.marks ?? [], v.tm);
  drawOrbiters(v.playerList, v.tm);
  drawWalls(v.walls);
  drawParticles();
  drawBursts();

  drawVignette();
  drawPulse();
  drawAllyArrows(v.playerList);
  if (REPERE) drawRepere();
}
// `?repere` : la MEME croix posee aux memes coordonnees monde sur les trois
// couches. Elles se superposent, ou la bascule WebGL a une transformation a
// elle. Seul critere rejouable de l'alignement, densite de pixels comprise.
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
