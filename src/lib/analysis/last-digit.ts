import type { AnalysisConfig, LastDigitData, ParsedDraw } from "./types";

export function analyzeLastDigit(
  draws: ParsedDraw[],
  config: AnalysisConfig
): LastDigitData[] {
  if (draws.length === 0) return [];

  const digitCounts = new Map<number, number>();
  for (let d = 0; d <= 9; d++) {
    digitCounts.set(d, 0);
  }

  let totalNumbers = 0;
  for (const draw of draws) {
    for (const num of draw.numbers) {
      totalNumbers++;
      const lastDigit = num % 10;
      digitCounts.set(lastDigit, (digitCounts.get(lastDigit) ?? 0) + 1);
    }
  }

  const results: LastDigitData[] = Array.from(digitCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([digit, frequency]) => ({
      digit,
      frequency,
      percentage: totalNumbers > 0
        ? Math.round((frequency / totalNumbers) * 10000) / 100
        : 0,
    }));

  return results;
}
