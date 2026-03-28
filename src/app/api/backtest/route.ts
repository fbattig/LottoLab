import { NextRequest, NextResponse } from "next/server";
import { getGame, getOrderedParsedDraws, buildAnalysisConfig } from "@/lib/db/queries";
import { runBacktest } from "@/lib/analysis/backtest";
import { ensureDb } from "@/lib/db/migrate";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameSlug = searchParams.get("game");
  const daysParam = searchParams.get("days");

  if (!gameSlug) {
    return NextResponse.json({ error: "game parameter required" }, { status: 400 });
  }

  const days = Math.min(Math.max(parseInt(daysParam ?? "20", 10) || 20, 1), 30);

  ensureDb();
  const game = getGame(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const allDraws = getOrderedParsedDraws(game.id);
  if (allDraws.length < 10) {
    return NextResponse.json(
      { error: "Need at least 10 draws for backtesting. Sync data first." },
      { status: 400 }
    );
  }

  const config = buildAnalysisConfig(game, allDraws.length);
  const result = runBacktest(allDraws, config, gameSlug, days);

  return NextResponse.json(result);
}
