import type { AnalysisConfig, ConsecutiveData, ParsedDraw } from "./types";

export function analyzeConsecutive(
  draws: ParsedDraw[],
  config: AnalysisConfig
): ConsecutiveData[] {
  if (draws.length === 0) return [];

  const pairCounts = new Map<number, number>();

  for (const draw of draws) {
    // Numbers should already be sorted ascending
    const sorted = [...draw.numbers].sort((a, b) => a - b);
    let pairs = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] === 1) {
        pairs++;
      }
    }
    pairCounts.set(pairs, (pairCounts.get(pairs) ?? 0) + 1);
  }

  // Build results for all pair counts from 0 to max observed
  const maxPairs = Math.max(...Array.from(pairCounts.keys()), 0);
  const results: ConsecutiveData[] = [];

  for (let p = 0; p <= maxPairs; p++) {
    const count = pairCounts.get(p) ?? 0;
    results.push({
      pairCount: p,
      count,
      percentage: Math.round((count / draws.length) * 10000) / 100,
    });
  }

  return results;
}
