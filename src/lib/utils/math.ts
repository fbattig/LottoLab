export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((acc, v) => acc + v, 0) / values.length);
}

export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  // Use the smaller of k and n-k for efficiency
  const r = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < r; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}
