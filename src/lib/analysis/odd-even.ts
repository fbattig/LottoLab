import type { AnalysisConfig, ParsedDraw, RatioData } from "./types";

export function analyzeOddEven(
  draws: ParsedDraw[],
  config: AnalysisConfig
): RatioData[] {
  if (draws.length === 0) return [];

  const ratioCounts = new Map<string, number>();

  for (const draw of draws) {
    const oddCount = draw.numbers.filter((n) => n % 2 !== 0).length;
    const evenCount = config.pickCount - oddCount;
    const ratio = `${oddCount}/${evenCount}`;
    ratioCounts.set(ratio, (ratioCounts.get(ratio) ?? 0) + 1);
  }

  const results: RatioData[] = Array.from(ratioCounts.entries()).map(
    ([ratio, count]) => ({
      ratio,
      count,
      percentage: Math.round((count / draws.length) * 10000) / 100,
    })
  );

  results.sort((a, b) => b.percentage - a.percentage);

  return results;
}
