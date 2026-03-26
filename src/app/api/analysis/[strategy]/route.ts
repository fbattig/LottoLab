import { NextRequest, NextResponse } from "next/server";
import { getGame, getParsedDraws } from "@/lib/db/queries";
import { analyzeFrequency } from "@/lib/analysis/frequency";
import { analyzeSkipHit } from "@/lib/analysis/skip-hit";
import { analyzeSumTotal } from "@/lib/analysis/sum-total";
import { analyzeOddEven } from "@/lib/analysis/odd-even";
import { analyzeHighLow } from "@/lib/analysis/high-low";
import { analyzeNumberGroups } from "@/lib/analysis/number-groups";
import { analyzeLastDigit } from "@/lib/analysis/last-digit";
import { analyzeConsecutive } from "@/lib/analysis/consecutive";
import { analyzePositional } from "@/lib/analysis/positional";
import type { AnalysisConfig } from "@/lib/analysis/types";

const ANALYZERS: Record<string, (draws: { numbers: number[] }[], config: AnalysisConfig) => unknown> = {
  frequency: analyzeFrequency,
  "skip-hit": analyzeSkipHit,
  "sum-total": analyzeSumTotal,
  "odd-even": analyzeOddEven,
  "high-low": analyzeHighLow,
  groups: analyzeNumberGroups,
  "last-digit": analyzeLastDigit,
  consecutive: analyzeConsecutive,
  positional: analyzePositional,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ strategy: string }> }
) {
  const { strategy } = await params;
  const { searchParams } = new URL(request.url);
  const gameSlug = searchParams.get("game");
  const windowSize = parseInt(searchParams.get("window") ?? "20") || undefined;

  if (!gameSlug) {
    return NextResponse.json({ error: "game parameter required" }, { status: 400 });
  }

  const analyzer = ANALYZERS[strategy];
  if (!analyzer) {
    return NextResponse.json({ error: `Unknown strategy: ${strategy}` }, { status: 400 });
  }

  const game = getGame(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const draws = getParsedDraws(game.id, windowSize);
  if (draws.length < 5) {
    return NextResponse.json({ error: "Insufficient draw data" }, { status: 400 });
  }

  const config: AnalysisConfig = {
    gameId: game.id,
    gameSlug: game.slug,
    pickCount: game.pickCount,
    numberRange: game.numberRange,
    windowSize: windowSize ?? draws.length,
  };

  const result = analyzer(draws, config);
  return NextResponse.json({ strategy, game: gameSlug, windowSize: config.windowSize, result });
}
