import type { AnalysisConfig, ParsedDraw, RatioData } from "./types";

export function analyzeHighLow(
  draws: ParsedDraw[],
  config: AnalysisConfig
): RatioData[] {
  if (draws.length === 0) return [];

  const midpoint = Math.floor(config.numberRange / 2);
  const ratioCounts = new Map<string, number>();

  for (const draw of draws) {
    const lowCount = draw.numbers.filter((n) => n <= midpoint).length;
    const highCount = config.pickCount - lowCount;
    const ratio = `${highCount}/${lowCount}`;
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
