import type { AnalysisConfig, ParsedDraw, SkipData } from "./types";

export function analyzeSkipHit(
  draws: ParsedDraw[],
  config: AnalysisConfig
): SkipData[] {
  const totalDraws = draws.length;
  const results: SkipData[] = [];

  for (let n = config.minNumber; n <= config.numberRange; n++) {
    const skips: number[] = [];
    let gap = 0;
    let currentSkip = totalDraws;
    let firstFound = false;

    // Walk draws most-recent-first (index 0 = latest)
    for (let i = 0; i < totalDraws; i++) {
      if (draws[i].numbers.includes(n)) {
        if (!firstFound) {
          currentSkip = i;
          firstFound = true;
        }
        skips.push(gap);
        gap = 0;
      } else {
        gap++;
      }
    }

    // If the number was never found, currentSkip stays at totalDraws
    // and skips is empty
    const avgSkip = skips.length > 0
      ? Math.round((skips.reduce((a, b) => a + b, 0) / skips.length) * 100) / 100
      : 0;

    const maxSkip = skips.length > 0 ? Math.max(...skips) : 0;

    results.push({
      number: n,
      currentSkip,
      avgSkip,
      maxSkip,
      skips,
      isDue: avgSkip > 0 && currentSkip > avgSkip,
    });
  }

  return results;
}
