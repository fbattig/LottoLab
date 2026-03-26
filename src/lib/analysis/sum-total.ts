import type { AnalysisConfig, ParsedDraw, SumTotalData } from "./types";
import { mean as calcMean, stdDev as calcStdDev } from "../utils/math";

export function analyzeSumTotal(
  draws: ParsedDraw[],
  config: AnalysisConfig
): SumTotalData {
  if (draws.length === 0) {
    return {
      sums: [],
      mean: 0,
      stdDev: 0,
      optimalLow: 0,
      optimalHigh: 0,
      distribution: [],
      inRangePercentage: 0,
    };
  }

  const sums = draws.map((d) =>
    d.numbers.reduce((acc, n) => acc + n, 0)
  );

  const avg = calcMean(sums);
  const sd = calcStdDev(sums);
  const optimalLow = Math.round((avg - 0.8 * sd) * 100) / 100;
  const optimalHigh = Math.round((avg + 0.8 * sd) * 100) / 100;

  // Build histogram with bins of width 10
  const minSum = Math.min(...sums);
  const maxSum = Math.max(...sums);
  const binWidth = 10;
  const binStart = Math.floor(minSum / binWidth) * binWidth;
  const binEnd = Math.ceil((maxSum + 1) / binWidth) * binWidth;

  const bins = new Map<number, number>();
  for (let b = binStart; b < binEnd; b += binWidth) {
    bins.set(b, 0);
  }

  for (const s of sums) {
    const bin = Math.floor(s / binWidth) * binWidth;
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }

  const distribution = Array.from(bins.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([sum, count]) => ({
      sum,
      count,
      percentage: Math.round((count / sums.length) * 10000) / 100,
    }));

  const inRange = sums.filter((s) => s >= optimalLow && s <= optimalHigh).length;
  const inRangePercentage = Math.round((inRange / sums.length) * 10000) / 100;

  return {
    sums,
    mean: Math.round(avg * 100) / 100,
    stdDev: Math.round(sd * 100) / 100,
    optimalLow,
    optimalHigh,
    distribution,
    inRangePercentage,
  };
}
