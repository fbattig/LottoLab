import type { AnalysisConfig, GroupData, ParsedDraw } from "./types";

export function analyzeNumberGroups(
  draws: ParsedDraw[],
  config: AnalysisConfig
): GroupData[] {
  if (draws.length === 0) return [];

  // Build decade groups up to numberRange
  const groupDefs: { group: string; range: string; low: number; high: number }[] = [];
  for (let start = 1; start <= config.numberRange; start += 10) {
    const end = Math.min(start + 8, config.numberRange);
    const label = start === 1 ? "1-9" : `${start}-${start + 9}`;
    const rangeStr = `${start}-${Math.min(start + 9, config.numberRange)}`;
    groupDefs.push({
      group: label,
      range: rangeStr,
      low: start,
      high: Math.min(start + 9, config.numberRange),
    });
  }

  const groupCounts = new Map<string, number>();
  for (const g of groupDefs) {
    groupCounts.set(g.group, 0);
  }

  let totalNumbers = 0;
  for (const draw of draws) {
    for (const num of draw.numbers) {
      totalNumbers++;
      for (const g of groupDefs) {
        if (num >= g.low && num <= g.high) {
          groupCounts.set(g.group, (groupCounts.get(g.group) ?? 0) + 1);
          break;
        }
      }
    }
  }

  const avgFrequency = totalNumbers / groupDefs.length;

  const results: GroupData[] = groupDefs.map((g) => {
    const freq = groupCounts.get(g.group) ?? 0;
    return {
      group: g.group,
      range: g.range,
      frequency: freq,
      percentage: totalNumbers > 0
        ? Math.round((freq / totalNumbers) * 10000) / 100
        : 0,
      isHot: freq > avgFrequency,
    };
  });

  return results;
}
