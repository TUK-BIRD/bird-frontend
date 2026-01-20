export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function normRect(xM: number, yM: number, wM: number, hM: number) {
  const nx = wM >= 0 ? xM : xM + wM;
  const ny = hM >= 0 ? yM : yM + hM;
  return { xM: nx, yM: ny, wM: Math.abs(wM), hM: Math.abs(hM) };
}

export function toFixed2(n: number) {
  return Math.round(n * 100) / 100;
}
