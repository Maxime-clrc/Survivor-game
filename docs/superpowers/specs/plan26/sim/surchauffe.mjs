const DT = 1/60;
const BASE_INTERVAL = 0.16;
const BASE_DPS = 12 / BASE_INTERVAL; // 75, verifie

const HEAT_PER_SHOT = 0.09;
const HEAT_FALLOFF = 1/2.6;
const OVERHEAT_LOCK = 1.5;
const DMG_BONUS_AT_MAX = 0.55;

function simCarte({ name, clickFn, duration = 120 }) {
  let t = 0, heat = 0, muet = 0, cd = 0, shots = 0, dmg = 0, overheats = 0, highBand = 0, lockedTime = 0;
  while (t < duration) {
    muet = Math.max(0, muet - DT);
    cd = Math.max(0, cd - DT);
    if (muet > 0) lockedTime += DT;
    const wantsToClick = clickFn(t, heat);
    if (wantsToClick && cd <= 0 && muet <= 0) {
      cd = BASE_INTERVAL;
      shots++;
      dmg += 12 * (1 + heat * DMG_BONUS_AT_MAX);
      heat = Math.min(1, heat + HEAT_PER_SHOT);
      if (heat >= 1) { muet = OVERHEAT_LOCK; overheats++; }
    } else {
      heat = Math.max(0, heat - DT * HEAT_FALLOFF);
    }
    if (heat >= 0.8) highBand += DT;
    t += DT;
  }
  return { name, shots, dps: dmg / duration, overheats, pctHighBand: 100*highBand/duration, pctLocked: 100*lockedTime/duration };
}

let seed = 7;
function rnd() { seed = (seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; }

const parfait = simCarte({ name: "carte — joueur parfait (seuil 0.90 strict)", clickFn: (t, heat) => heat < 0.90 });
const bon     = simCarte({ name: "carte — bon joueur (seuil 0.85 +/- bruit, 5% clics rates)", clickFn: (t, heat) => heat < (0.85 + 0.10*(rnd()-0.5)) && rnd() > 0.05 });
const moyen   = simCarte({ name: "carte — joueur moyen (seuil 0.70 +/- bruit, 15% clics rates)", clickFn: (t, heat) => heat < (0.70 + 0.20*(rnd()-0.5)) && rnd() > 0.15 });
const bourrin = simCarte({ name: "carte — bourrinage (clic permanent, ignore la jauge)", clickFn: () => true });
const timide  = simCarte({ name: "carte — joueur timide (seuil 0.40, sous-exploite)", clickFn: (t, heat) => heat < 0.40 });

console.log("DPS base (sans carte, tir auto):", BASE_DPS.toFixed(1));
console.log("");
for (const r of [parfait, bon, moyen, bourrin, timide]) {
  console.log(r.name);
  console.log("  DPS=" + r.dps.toFixed(1),
    "(" + (100*(r.dps/BASE_DPS-1)).toFixed(1) + "% vs base)",
    "tirs/2min=" + r.shots,
    "surchauffes/2min=" + r.overheats,
    "%temps>=0.8=" + r.pctHighBand.toFixed(1),
    "%temps verrouille=" + r.pctLocked.toFixed(1));
}
console.log("");
console.log("Ecart parfait/moyen:", (100*(parfait.dps/moyen.dps-1)).toFixed(1) + "%");
console.log("Ecart parfait/bourrin:", (100*(parfait.dps/bourrin.dps-1)).toFixed(1) + "%");
