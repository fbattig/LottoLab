import type { AnalysisConfig } from "./types";
import { generateQuickPicks } from "./quick-picks";
import { checkWin } from "./prize-check";
import type { WinResult } from "./prize-check";

interface OrderedDraw {
  drawDate: string;
  drawNumber: string | null;
  numbers: number[];
  bonusNumber: number | null;
}

export interface BacktestPick {
  numbers: number[];
  rationale: string;
  score: number;
  winResult: WinResult;
}

export interface BacktestDrawResult {
  drawDate: string;
  drawNumber: string;
  actualNumbers: number[];
  drawsUsedForPrediction: number;
  picks: BacktestPick[];
  totalPrize: number;
  wins: number;
  bestMatchCount: number;
}

export interface BacktestDayResult {
  date: string;
  midday: BacktestDrawResult | null;
  evening: BacktestDrawResult | null;
  dayTotalPrize: number;
  dayWins: number;
}

export interface BacktestSummary {
  totalDrawsTested: number;
  totalPicks: number;
  totalWins: number;
  totalPrize: number;
  winRate: number;
  matchDistribution: Record<number, number>;
}

export interface BacktestResponse {
  summary: BacktestSummary;
  days: BacktestDayResult[];
}

export function runBacktest(
  allDraws: OrderedDraw[],
  config: AnalysisConfig,
  gameSlug: string,
  days: number
): BacktestResponse {
  // allDraws is ordered most-recent-first:
  // [newest EVENING, newest MIDDAY, prev EVENING, prev MIDDAY, ...]
  // For same date: EVENING before MIDDAY (asc drawNumber: E < M)

  // Collect unique dates (most recent first from the array)
  const datesSeen = new Set<string>();
  const recentDates: string[] = [];
  for (const d of allDraws) {
    if (!datesSeen.has(d.drawDate)) {
      datesSeen.add(d.drawDate);
      recentDates.push(d.drawDate);
    }
    if (recentDates.length > days) break;
  }

  const targetDates = new Set(recentDates.slice(0, days));

  const drawResults: BacktestDrawResult[] = [];
  const matchDistribution: Record<number, number> = {};

  for (let i = 0; i < allDraws.length; i++) {
    const draw = allDraws[i];
    if (!targetDates.has(draw.drawDate)) continue;
    if (!draw.drawNumber) continue; // skip draws without MIDDAY/EVENING

    const historicalDraws = allDraws.slice(i + 1);
    if (historicalDraws.length < 10) continue;

    const analysisConfig: AnalysisConfig = {
      ...config,
      windowSize: historicalDraws.length,
    };

    const result = generateQuickPicks(historicalDraws, analysisConfig);

    const picks: BacktestPick[] = result.picks.map((pick) => {
      const winResult = checkWin(gameSlug, pick.numbers, {
        drawDate: draw.drawDate,
        numbers: draw.numbers,
        bonusNumber: draw.bonusNumber ?? undefined,
      });
      matchDistribution[winResult.matchCount] =
        (matchDistribution[winResult.matchCount] ?? 0) + 1;
      return {
        numbers: pick.numbers,
        rationale: pick.rationale,
        score: pick.score,
        winResult,
      };
    });

    const totalPrize = picks.reduce((s, p) => s + p.winResult.prize, 0);
    const wins = picks.filter((p) => p.winResult.isWin).length;
    const bestMatchCount = Math.max(...picks.map((p) => p.winResult.matchCount));

    drawResults.push({
      drawDate: draw.drawDate,
      drawNumber: draw.drawNumber,
      actualNumbers: draw.numbers,
      drawsUsedForPrediction: historicalDraws.length,
      picks,
      totalPrize,
      wins,
      bestMatchCount,
    });
  }

  // Group by date into day results, oldest first
  const dayMap = new Map<string, BacktestDayResult>();
  for (const dr of drawResults) {
    if (!dayMap.has(dr.drawDate)) {
      dayMap.set(dr.drawDate, {
        date: dr.drawDate,
        midday: null,
        evening: null,
        dayTotalPrize: 0,
        dayWins: 0,
      });
    }
    const day = dayMap.get(dr.drawDate)!;
    if (dr.drawNumber === "MIDDAY") day.midday = dr;
    else if (dr.drawNumber === "EVENING") day.evening = dr;
    day.dayTotalPrize += dr.totalPrize;
    day.dayWins += dr.wins;
  }

  const days_list = Array.from(dayMap.values()).sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  const totalDrawsTested = drawResults.length;
  const totalPicks = drawResults.reduce((s, d) => s + d.picks.length, 0);
  const totalWins = drawResults.reduce((s, d) => s + d.wins, 0);
  const totalPrize = drawResults.reduce((s, d) => s + d.totalPrize, 0);

  return {
    summary: {
      totalDrawsTested,
      totalPicks,
      totalWins,
      totalPrize,
      winRate: totalPicks > 0 ? Math.round((totalWins / totalPicks) * 1000) / 10 : 0,
      matchDistribution,
    },
    days: days_list,
  };
}
