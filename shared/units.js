
export const PX_PER_M = 20;

export const toM = px => px / PX_PER_M;

export function fmtM(px) {
  const m = px / PX_PER_M;
  const v = m < 10 ? Math.round(m * 10) / 10 : Math.round(m);
  return String(v).replace(".", ",") + " m";
}
