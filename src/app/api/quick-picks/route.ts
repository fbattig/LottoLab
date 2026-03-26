import { NextRequest, NextResponse } from "next/server";
import { getGame, getParsedDraws, buildAnalysisConfig } from "@/lib/db/queries";
import { generateQuickPicks } from "@/lib/analysis/quick-picks";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameSlug = searchParams.get("game");

  if (!gameSlug) {
    return NextResponse.json({ error: "game parameter required" }, { status: 400 });
  }

  const game = getGame(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const draws = getParsedDraws(game.id);
  if (draws.length < 10) {
    return NextResponse.json(
      { error: "Need at least 10 draws for predictions. Sync data first." },
      { status: 400 }
    );
  }

  const config = buildAnalysisConfig(game, draws.length);
  const result = generateQuickPicks(draws, config);

  return NextResponse.json(result);
}
