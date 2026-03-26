import type { AnalysisConfig, ParsedDraw, PositionalData } from "./types";

export function analyzePositional(
  draws: ParsedDraw[],
  config: AnalysisConfig
): PositionalData[] {
  if (draws.length === 0) return [];

  const results: PositionalData[] = [];

  for (let pos = 0; pos < config.pickCount; pos++) {
    const freqMap = new Map<number, number>();

    for (const draw of draws) {
      // Numbers should be sorted ascending; position = index in sorted array
      const sorted = [...draw.numbers].sort((a, b) => a - b);
      if (pos < sorted.length) {
        const num = sorted[pos];
        freqMap.set(num, (freqMap.get(num) ?? 0) + 1);
      }
    }

    const entries = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    results.push({
      position: pos + 1,
      topNumbers: entries.map(([number, frequency]) => ({
        number,
        frequency,
        percentage: Math.round((frequency / draws.length) * 10000) / 100,
      })),
    });
  }

  return results;
}
