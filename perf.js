export let PERF_ON = process.env.PERF === "1";

export function setPerf(on) {
  PERF_ON = !!on;
  return PERF_ON;
}

export const PERF_REPORT_S = 1;

export class Sampler {
  constructor() { this.v = []; }

  add(x) { this.v.push(x); }
  reset() { this.v.length = 0; }

  stats() {
    const v = this.v;
    if (v.length === 0) return { n: 0, min: 0, max: 0, moy: 0, p99: 0 };
    let min = Infinity, max = -Infinity, sum = 0;
    for (const x of v) {
      if (x < min) min = x;
      if (x > max) max = x;
      sum += x;
    }
    const s = [...v].sort((a, b) => a - b);
    return {
      n: v.length,
      min, max,
      moy: sum / v.length,
      p99: s[Math.min(s.length - 1, Math.floor(s.length * 0.99))],
    };
  }
}

const ORIGIN = process.hrtime.bigint();

export function nowMs() {
  return Number(process.hrtime.bigint() - ORIGIN) / 1e6;
}

export const f1 = x => x.toFixed(1);
