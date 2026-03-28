import type { AnalysisConfig } from "./types";

interface ParsedDraw {
  numbers: number[];
}

export interface PatternSummary {
  hotDigits: { number: number; frequency: number }[];
  coldDigits: { number: number; frequency: number }[];
  dueDigits: { number: number; skip: number; avgSkip: number }[];
  topPairs: { numbers: number[]; count: number }[];
  sumRange: { low: number; high: number; peak: number };
  oddEvenBest: string;
  doublesRate: number;
  consecutiveRate: number;
}

export interface PredictedPick {
  numbers: number[];
  rationale: string;
  score: number;
}

export interface QuickPickResult {
  pattern: PatternSummary;
  picks: PredictedPick[];
  drawsAnalyzed: number;
}

export function generateQuickPicks(
  draws: ParsedDraw[],
  config: AnalysisConfig
): QuickPickResult {
  const { pickCount, numberRange, minNumber, allowDuplicates } = config;
  const totalDraws = draws.length;

  // --- Frequency analysis ---
  const totalNumbers = numberRange - minNumber + 1;
  const freq = new Map<number, number>();
  for (let n = minNumber; n <= numberRange; n++) freq.set(n, 0);
  for (const d of draws) for (const n of d.numbers) freq.set(n, (freq.get(n) ?? 0) + 1);

  const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  const hotThreshold = Math.ceil(totalNumbers / 3);
  const hotDigits = sorted.slice(0, hotThreshold).map(([number, frequency]) => ({ number, frequency }));
  const coldDigits = sorted.slice(-hotThreshold).map(([number, frequency]) => ({ number, frequency }));

  // --- Recent hot (last 50 draws) ---
  const recentWindow = Math.min(50, totalDraws);
  const recentFreq = new Map<number, number>();
  for (let n = minNumber; n <= numberRange; n++) recentFreq.set(n, 0);
  for (let i = 0; i < recentWindow; i++) {
    for (const n of draws[i].numbers) recentFreq.set(n, (recentFreq.get(n) ?? 0) + 1);
  }
  const recentSorted = Array.from(recentFreq.entries()).sort((a, b) => b[1] - a[1]);
  const recentHot = new Set(recentSorted.slice(0, Math.ceil(totalNumbers / 3)).map(([n]) => n));

  // --- Skip / Due analysis ---
  const lastSeen = new Map<number, number>();
  for (let n = minNumber; n <= numberRange; n++) lastSeen.set(n, totalDraws);
  for (let i = 0; i < totalDraws; i++) {
    for (const n of draws[i].numbers) {
      if (lastSeen.get(n) === totalDraws) lastSeen.set(n, i);
    }
  }

  const avgSkips = new Map<number, number>();
  for (let n = minNumber; n <= numberRange; n++) {
    const f = freq.get(n) ?? 0;
    avgSkips.set(n, f > 0 ? totalDraws / f : totalDraws);
  }

  const dueDigits = Array.from(lastSeen.entries())
    .filter(([n, skip]) => skip > (avgSkips.get(n) ?? 0))
    .map(([number, skip]) => ({ number, skip, avgSkip: Math.round((avgSkips.get(number) ?? 0) * 10) / 10 }))
    .sort((a, b) => b.skip - a.skip);

  // --- Sum analysis ---
  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0));
  const sumCounts = new Map<number, number>();
  for (const s of sums) sumCounts.set(s, (sumCounts.get(s) ?? 0) + 1);
  const sumEntries = Array.from(sumCounts.entries()).sort((a, b) => b[1] - a[1]);
  const peakSum = sumEntries[0]?.[0] ?? 0;
  // Find range covering ~60% of draws
  const sumSorted = Array.from(sumCounts.entries()).sort((a, b) => a[0] - b[0]);
  let cumulative = 0;
  let sumLow = 0, sumHigh = 0;
  const target = totalDraws * 0.3; // find the 30th percentile start
  for (const [s, c] of sumSorted) {
    cumulative += c;
    if (cumulative >= target && sumLow === 0) sumLow = s;
    if (cumulative >= totalDraws - target) { sumHigh = s; break; }
  }

  // --- Odd/Even ---
  const oeCounts = new Map<string, number>();
  for (const d of draws) {
    const odd = d.numbers.filter(n => n % 2 !== 0).length;
    const key = `${odd}/${pickCount - odd}`;
    oeCounts.set(key, (oeCounts.get(key) ?? 0) + 1);
  }
  const oeBest = Array.from(oeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  // --- Top pairs/combos ---
  const comboFreq = new Map<string, number>();
  for (const d of draws) {
    const key = d.numbers.join(",");
    comboFreq.set(key, (comboFreq.get(key) ?? 0) + 1);
  }
  const topPairs = Array.from(comboFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ numbers: key.split(",").map(Number), count }));

  // --- Doubles / Consecutive rates ---
  let doubles = 0, consecutives = 0;
  for (const d of draws) {
    const nums = d.numbers;
    const uniqueSet = new Set(nums);
    if (uniqueSet.size < nums.length) doubles++;
    const sorted = [...nums].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] === 1) { consecutives++; break; }
    }
  }

  // --- Positional analysis ---
  const posFreq: Map<number, number>[] = [];
  for (let p = 0; p < pickCount; p++) {
    const pf = new Map<number, number>();
    for (let n = minNumber; n <= numberRange; n++) pf.set(n, 0);
    for (const d of draws) {
      if (d.numbers[p] !== undefined) pf.set(d.numbers[p], (pf.get(d.numbers[p]) ?? 0) + 1);
    }
    posFreq.push(pf);
  }

  const pattern: PatternSummary = {
    hotDigits,
    coldDigits,
    dueDigits,
    topPairs,
    sumRange: { low: sumLow, high: sumHigh, peak: peakSum },
    oddEvenBest: oeBest,
    doublesRate: Math.round((doubles / totalDraws) * 1000) / 10,
    consecutiveRate: Math.round((consecutives / totalDraws) * 1000) / 10,
  };

  // --- Generate 5 picks with different strategies ---
  const picks: PredictedPick[] = [];

  // Strategy 1: Hot + Due blend (best overall)
  picks.push(generateHotDuePick(config, recentSorted, dueDigits, sumLow, sumHigh, posFreq, "Hot recent digits + most overdue numbers"));

  // Strategy 2: Pure positional (best number per position)
  picks.push(generatePositionalPick(config, posFreq, sumLow, sumHigh, "Top positional frequency per slot"));

  // Strategy 3: Top historical combo variant
  picks.push(generateHistoricalPick(config, topPairs, recentHot, dueDigits, "Based on most frequent historical combinations"));

  // Strategy 4: Due numbers focus
  picks.push(generateDueFocusPick(config, dueDigits, recentSorted, sumLow, sumHigh, "Overdue numbers primed for return"));

  // Strategy 5: Balanced mix (optimal sum + odd/even + group coverage)
  picks.push(generateBalancedPick(config, recentSorted, dueDigits, sumLow, sumHigh, oeBest, "Balanced: optimal sum, odd/even, group coverage"));

  // Sort numbers ascending in each pick, then score
  for (const pick of picks) {
    pick.numbers.sort((a, b) => a - b);
    pick.score = scorePick(pick.numbers, config, recentFreq, lastSeen, avgSkips, sumLow, sumHigh);
  }

  // Deduplicate picks
  const seen = new Set<string>();
  const uniquePicks: PredictedPick[] = [];
  for (const pick of picks) {
    const key = pick.numbers.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      uniquePicks.push(pick);
    }
  }

  // If duplicates removed, generate extra random picks from hot+due pool to fill back to 5
  while (uniquePicks.length < 5) {
    const pool = [
      ...recentSorted.slice(0, Math.ceil(totalNumbers / 2)).map(([n]) => n),
      ...dueDigits.map(d => d.number),
    ];
    const nums: number[] = [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const n of shuffled) {
      if (nums.length >= pickCount) break;
      if (allowDuplicates || !nums.includes(n)) nums.push(n);
    }
    if (nums.length === pickCount) {
      nums.sort((a, b) => a - b);
      const key = nums.join(",");
      if (!seen.has(key)) {
        seen.add(key);
        uniquePicks.push({
          numbers: nums,
          rationale: "Random hot/due pool selection",
          score: scorePick(nums, config, recentFreq, lastSeen, avgSkips, sumLow, sumHigh),
        });
      }
    }
  }

  uniquePicks.sort((a, b) => b.score - a.score);

  return { pattern, picks: uniquePicks.slice(0, 5), drawsAnalyzed: totalDraws };
}

function scorePick(
  numbers: number[],
  config: AnalysisConfig,
  recentFreq: Map<number, number>,
  lastSeen: Map<number, number>,
  avgSkips: Map<number, number>,
  sumLow: number,
  sumHigh: number
): number {
  let score = 0;
  const sum = numbers.reduce((a, b) => a + b, 0);

  // Sum in range bonus
  if (sum >= sumLow && sum <= sumHigh) score += 20;

  // Hot number bonus
  for (const n of numbers) {
    score += (recentFreq.get(n) ?? 0) * 2;
  }

  // Due number bonus
  for (const n of numbers) {
    const skip = lastSeen.get(n) ?? 0;
    const avg = avgSkips.get(n) ?? 1;
    if (skip > avg) score += 5;
  }

  // Odd/even balance
  const odd = numbers.filter(n => n % 2 !== 0).length;
  const even = numbers.length - odd;
  if (Math.abs(odd - even) <= 1) score += 10;

  // Group coverage
  const groups = new Set(numbers.map(n => Math.floor((n - config.minNumber) / 10)));
  score += groups.size * 3;

  return Math.round(score);
}

function generateHotDuePick(
  config: AnalysisConfig,
  recentSorted: [number, number][],
  dueDigits: { number: number; skip: number }[],
  sumLow: number,
  sumHigh: number,
  posFreq: Map<number, number>[],
  rationale: string
): PredictedPick {
  const { pickCount, minNumber, numberRange, allowDuplicates } = config;
  const pool = new Set<number>();

  // Add top recent hot numbers
  for (const [n] of recentSorted.slice(0, Math.ceil(pickCount * 1.5))) pool.add(n);
  // Add top due numbers
  for (const d of dueDigits.slice(0, Math.ceil(pickCount * 0.5))) pool.add(d.number);

  return pickFromPool(Array.from(pool), config, sumLow, sumHigh, posFreq, rationale);
}

function generatePositionalPick(
  config: AnalysisConfig,
  posFreq: Map<number, number>[],
  sumLow: number,
  sumHigh: number,
  rationale: string
): PredictedPick {
  const numbers: number[] = [];
  for (let p = 0; p < config.pickCount; p++) {
    const sorted = Array.from(posFreq[p].entries()).sort((a, b) => b[1] - a[1]);
    // Pick the top number for this position that isn't already chosen (unless duplicates allowed)
    for (const [n] of sorted) {
      if (config.allowDuplicates || !numbers.includes(n)) {
        numbers.push(n);
        break;
      }
    }
  }
  return { numbers, rationale, score: 0 };
}

function generateHistoricalPick(
  config: AnalysisConfig,
  topPairs: { numbers: number[]; count: number }[],
  recentHot: Set<number>,
  dueDigits: { number: number }[],
  rationale: string
): PredictedPick {
  // Start from the top historical combo, tweak with hot/due
  if (topPairs.length === 0) {
    return { numbers: Array(config.pickCount).fill(config.minNumber), rationale, score: 0 };
  }
  const base = [...topPairs[0].numbers];
  // Replace 1 cold number with a due number if available
  const dueSet = new Set(dueDigits.slice(0, 3).map(d => d.number));
  for (let i = 0; i < base.length && dueSet.size > 0; i++) {
    if (!recentHot.has(base[i])) {
      const replacement = dueSet.values().next().value;
      if (replacement !== undefined) {
        base[i] = replacement;
        dueSet.delete(replacement);
        break;
      }
    }
  }
  return { numbers: base, rationale, score: 0 };
}

function generateDueFocusPick(
  config: AnalysisConfig,
  dueDigits: { number: number; skip: number }[],
  recentSorted: [number, number][],
  sumLow: number,
  sumHigh: number,
  rationale: string
): PredictedPick {
  const { pickCount, allowDuplicates } = config;
  const numbers: number[] = [];

  // Fill with due numbers first
  for (const d of dueDigits) {
    if (numbers.length >= pickCount) break;
    if (allowDuplicates || !numbers.includes(d.number)) {
      numbers.push(d.number);
    }
  }
  // Fill remaining with hot numbers
  for (const [n] of recentSorted) {
    if (numbers.length >= pickCount) break;
    if (allowDuplicates || !numbers.includes(n)) {
      numbers.push(n);
    }
  }
  // Pad if still short
  while (numbers.length < pickCount) numbers.push(config.minNumber);

  return { numbers, rationale, score: 0 };
}

function generateBalancedPick(
  config: AnalysisConfig,
  recentSorted: [number, number][],
  dueDigits: { number: number }[],
  sumLow: number,
  sumHigh: number,
  oeBest: string,
  rationale: string
): PredictedPick {
  const { pickCount, minNumber, numberRange, allowDuplicates } = config;
  const targetSum = Math.round((sumLow + sumHigh) / 2);
  const [oddTarget] = oeBest.split("/").map(Number);

  // Build candidate pool: mix of hot and due
  const candidates: number[] = [];
  for (const [n] of recentSorted.slice(0, Math.ceil((numberRange - minNumber + 1) / 2))) candidates.push(n);
  for (const d of dueDigits.slice(0, 3)) if (!candidates.includes(d.number)) candidates.push(d.number);

  // Try random combinations from pool, pick the one closest to target sum with correct odd/even
  let bestPick: number[] = candidates.slice(0, pickCount);
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 200; attempt++) {
    const pick: number[] = [];
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    for (const n of shuffled) {
      if (pick.length >= pickCount) break;
      if (allowDuplicates || !pick.includes(n)) pick.push(n);
    }
    if (pick.length < pickCount) continue;

    const sum = pick.reduce((a, b) => a + b, 0);
    const odd = pick.filter(n => n % 2 !== 0).length;
    const sumDiff = Math.abs(sum - targetSum);
    const oeDiff = Math.abs(odd - (oddTarget || 0));
    const score = sumDiff + oeDiff * 5;

    if (score < bestScore) {
      bestScore = score;
      bestPick = [...pick];
    }
  }

  return { numbers: bestPick, rationale, score: 0 };
}

function pickFromPool(
  pool: number[],
  config: AnalysisConfig,
  sumLow: number,
  sumHigh: number,
  posFreq: Map<number, number>[],
  rationale: string
): PredictedPick {
  const { pickCount, allowDuplicates } = config;

  // Score each number by positional weight
  const numbers: number[] = [];
  for (let p = 0; p < pickCount; p++) {
    let best = pool[0];
    let bestScore = -1;
    for (const n of pool) {
      if (!allowDuplicates && numbers.includes(n)) continue;
      const posScore = posFreq[p]?.get(n) ?? 0;
      if (posScore > bestScore) {
        bestScore = posScore;
        best = n;
      }
    }
    numbers.push(best);
  }

  return { numbers, rationale, score: 0 };
}
