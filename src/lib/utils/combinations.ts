export function* generateCombinations(
  pool: number[],
  k: number
): Generator<number[]> {
  const n = pool.length;
  if (k < 0 || k > n) return;
  if (k === 0) {
    yield [];
    return;
  }

  // Iterative combination generation using indices
  const indices = Array.from({ length: k }, (_, i) => i);

  while (true) {
    yield indices.map((i) => pool[i]);

    // Find the rightmost index that can be incremented
    let i = k - 1;
    while (i >= 0 && indices[i] === i + n - k) {
      i--;
    }

    if (i < 0) break;

    indices[i]++;
    for (let j = i + 1; j < k; j++) {
      indices[j] = indices[j - 1] + 1;
    }
  }
}
