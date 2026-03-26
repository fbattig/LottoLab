import type { AnalysisConfig, NumberScore, ParsedDraw } from "./types";

export function analyzeFrequency(
  draws: ParsedDraw[],
  config: AnalysisConfig
): NumberScore[] {
  const totalDraws = draws.length;
  if (totalDraws === 0) return [];

  const counts = new Map<number, number>();
  for (let n = config.minNumber; n <= config.numberRange; n++) {
    counts.set(n, 0);
  }

  for (const draw of draws) {
    for (const num of draw.numbers) {
      counts.set(num, (counts.get(num) ?? 0) + 1);
    }
  }

  // Compute skip data inline for each number
  const skipMap = new Map<number, { currentSkip: number; avgSkip: number; isDue: boolean }>();
  for (let n = config.minNumber; n <= config.numberRange; n++) {
    const skips: number[] = [];
    let gap = 0;
    // Draws are assumed most-recent-first
    let firstFound = false;
    let currentSkip = totalDraws; // default if never appeared

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

    const avg = skips.length > 0
      ? skips.reduce((a, b) => a + b, 0) / skips.length
      : 0;

    skipMap.set(n, {
      currentSkip,
      avgSkip: Math.round(avg * 100) / 100,
      isDue: currentSkip > avg && avg > 0,
    });
  }

  // Build unsorted scores
  const unsorted: { number: number; frequency: number; percentage: number }[] = [];
  for (let n = config.minNumber; n <= config.numberRange; n++) {
    const freq = counts.get(n) ?? 0;
    unsorted.push({
      number: n,
      frequency: freq,
      percentage: Math.round((freq / totalDraws) * 10000) / 100,
    });
  }

  // Sort by frequency descending for ranking
  unsorted.sort((a, b) => b.frequency - a.frequency || a.number - b.number);

  const total = config.numberRange - config.minNumber + 1;
  const hotThreshold = Math.ceil(total / 3);
  const warmThreshold = Math.ceil((total * 2) / 3);

  const maxFreq = unsorted.length > 0 ? unsorted[0].frequency : 1;

  const scores: NumberScore[] = unsorted.map((entry, index) => {
    const rank = index + 1;
    let classification: "HOT" | "WARM" | "COLD";
    if (rank <= hotThreshold) {
      classification = "HOT";
    } else if (rank <= warmThreshold) {
      classification = "WARM";
    } else {
      classification = "COLD";
    }

    const skip = skipMap.get(entry.number)!;

    return {
      number: entry.number,
      frequency: entry.frequency,
      percentage: entry.percentage,
      rank,
      classification,
      currentSkip: skip.currentSkip,
      avgSkip: skip.avgSkip,
      isDue: skip.isDue,
      compositeScore: maxFreq > 0
        ? Math.round((entry.frequency / maxFreq) * 10000) / 100
        : 0,
    };
  });

  return scores;
}
