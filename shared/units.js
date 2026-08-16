
import { dec } from "./i18n.js";

export const PX_PER_M = 20;

export const toM = px => px / PX_PER_M;

export function fmtM(px) {
  const m = px / PX_PER_M;
  const v = m < 10 ? Math.round(m * 10) / 10 : Math.round(m);
  return (Number.isInteger(v) ? String(v) : dec(v, 1)) + " m";
}
