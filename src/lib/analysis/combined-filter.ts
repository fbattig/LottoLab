import { AnalysisConfig, NumberScore, CombinationScore } from "./types";
import { analyzeFrequency } from "./frequency";
import { analyzeSkipHit } from "./skip-hit";
import { analyzeSumTotal } from "./sum-total";
import { analyzeOddEven } from "./odd-even";
import { analyzeHighLow } from "./high-low";
import { analyzeNumberGroups } from "./number-groups";

interface ParsedDraw {
  numbers: number[];
}

const DEFAULT_WEIGHTS = {
  frequency: 0.25,
  skipHit: 0.2,
  sumTotal: 0.15,
  oddEven: 0.1,
  highLow: 0.1,
  numberGroups: 0.1,
  lastDigit: 0.05,
  consecutive: 0.05,
};

export interface FilteredPool {
  numbers: NumberScore[];
  hotNumbers: number[];
  warmNumbers: number[];
  dueNumbers: number[];
  recommendedPool: number[];
}

export function buildFilteredPool(
  draws: ParsedDraw[],
  config: AnalysisConfig
): FilteredPool {
  const freq = analyzeFrequency(draws, config);
  const skipHit = analyzeSkipHit(draws, config);

  const hotNumbers = freq
    .filter((n) => n.classification === "HOT")
    .map((n) => n.number);
  const warmNumbers = freq
    .filter((n) => n.classification === "WARM")
    .map((n) => n.number);
  const dueNumbers = skipHit
    .filter((n) => n.isDue)
    .map((n) => n.number);

  // Recommended pool: all HOT + WARM numbers, with due numbers boosted
  const poolSet = new Set([...hotNumbers, ...warmNumbers]);
  // Also add due numbers even if cold
  for (const n of dueNumbers) {
    poolSet.add(n);
  }

  const recommendedPool = Array.from(poolSet).sort((a, b) => a - b);

  return {
    numbers: freq,
    hotNumbers,
    warmNumbers,
    dueNumbers,
    recommendedPool,
  };
}

export function scoreCombination(
  numbers: number[],
  config: AnalysisConfig,
  draws: ParsedDraw[]
): CombinationScore {
  const sorted = [...numbers].sort((a, b) => a - b);
  const sumTotal = sorted.reduce((a, b) => a + b, 0);

  // Sum total check
  const sumData = analyzeSumTotal(draws, config);
  const sumInRange =
    sumTotal >= sumData.optimalLow && sumTotal <= sumData.optimalHigh;

  // Odd/even
  const oddCount = sorted.filter((n) => n % 2 !== 0).length;
  const evenCount = sorted.length - oddCount;
  const oddEvenRatio = `${oddCount}/${evenCount}`;
  const oddEvenOptimal =
    Math.abs(oddCount - evenCount) <= 2;

  // High/low
  const mid = Math.floor(config.numberRange / 2);
  const lowCount = sorted.filter((n) => n <= mid).length;
  const highCount = sorted.length - lowCount;
  const highLowRatio = `${highCount}/${lowCount}`;
  const highLowOptimal = Math.abs(highCount - lowCount) <= 2;

  // Groups covered
  const groups = new Set(sorted.map((n) => Math.floor((n - 1) / 10)));
  const groupsCovered = groups.size;

  // Consecutive check
  let consecutivePairs = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] === 1) consecutivePairs++;
  }
  const hasConsecutives = consecutivePairs > 0;

  // Last digit diversity
  const lastDigits = new Set(sorted.map((n) => n % 10));
  const lastDigitDiversity = lastDigits.size;

  // Composite score (0-100)
  let score = 0;
  if (sumInRange) score += DEFAULT_WEIGHTS.sumTotal * 100;
  if (oddEvenOptimal) score += DEFAULT_WEIGHTS.oddEven * 100;
  if (highLowOptimal) score += DEFAULT_WEIGHTS.highLow * 100;
  score += (groupsCovered / 5) * DEFAULT_WEIGHTS.numberGroups * 100;
  score +=
    (lastDigitDiversity / sorted.length) * DEFAULT_WEIGHTS.lastDigit * 100;
  if (consecutivePairs <= 1) score += DEFAULT_WEIGHTS.consecutive * 100;

  // Frequency score - average frequency rank of selected numbers
  const freq = analyzeFrequency(draws, config);
  const freqMap = new Map(freq.map((f) => [f.number, f]));
  const avgComposite =
    sorted.reduce((sum, n) => sum + (freqMap.get(n)?.compositeScore ?? 0), 0) /
    sorted.length;
  score += (avgComposite / 100) * DEFAULT_WEIGHTS.frequency * 100;

  // Skip/hit bonus
  const skipHit = analyzeSkipHit(draws, config);
  const skipMap = new Map(skipHit.map((s) => [s.number, s]));
  const dueCount = sorted.filter((n) => skipMap.get(n)?.isDue).length;
  score += (dueCount / sorted.length) * DEFAULT_WEIGHTS.skipHit * 100;

  return {
    numbers: sorted,
    sumTotal,
    sumInRange,
    oddEvenRatio,
    oddEvenOptimal,
    highLowRatio,
    highLowOptimal,
    groupsCovered,
    hasConsecutives,
    lastDigitDiversity,
    compositeScore: Math.round(score * 10) / 10,
  };
}

export function generateAndScoreCombinations(
  pool: number[],
  config: AnalysisConfig,
  draws: ParsedDraw[],
  maxCombinations: number = 1000
): CombinationScore[] {
  const results: CombinationScore[] = [];
  const k = config.pickCount;

  if (pool.length < k) return results;

  // For large pools, use random sampling instead of exhaustive generation
  const totalCombos = binomial(pool.length, k);

  if (totalCombos <= maxCombinations) {
    // Generate all combinations
    const combo = new Array(k);
    function* gen(start: number, depth: number): Generator<number[]> {
      if (depth === k) {
        yield [...combo];
        return;
      }
      for (let i = start; i <= pool.length - (k - depth); i++) {
        combo[depth] = pool[i];
        yield* gen(i + 1, depth + 1);
      }
    }

    for (const c of gen(0, 0)) {
      results.push(scoreCombination(c, config, draws));
    }
  } else {
    // Random sampling
    const seen = new Set<string>();
    let attempts = 0;
    while (results.length < maxCombinations && attempts < maxCombinations * 3) {
      attempts++;
      const combo = randomCombination(pool, k);
      const key = combo.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(scoreCombination(combo, config, draws));
    }
  }

  results.sort((a, b) => b.compositeScore - a.compositeScore);
  return results;
}

function randomCombination(pool: number[], k: number): number[] {
  const copy = [...pool];
  const result: number[] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result.sort((a, b) => a - b);
}

function binomial(n: number, k: number): number {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}
