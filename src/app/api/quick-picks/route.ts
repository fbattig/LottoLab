import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { predictions, draws } from "@/lib/db/schema";
import { getGame, getParsedDraws, buildAnalysisConfig } from "@/lib/db/queries";
import { generateQuickPicks } from "@/lib/analysis/quick-picks";
import { checkWin } from "@/lib/analysis/prize-check";
import type { LatestDraw } from "@/lib/analysis/prize-check";
import { eq, and, desc, gte } from "drizzle-orm";
import { ensureDb } from "@/lib/db/migrate";

/**
 * Given the latest draw date and the game's draw-day schedule,
 * compute the next upcoming draw date.
 */
function getNextDrawDate(latestDrawDate: string, drawDaysJson: string | null): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let drawDays: string[];
  try {
    drawDays = drawDaysJson ? JSON.parse(drawDaysJson) : [];
  } catch {
    drawDays = [];
  }

  if (drawDays.length === 0) {
    // Fallback: next day
    const d = new Date(latestDrawDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  const drawDayIndices = new Set(drawDays.map((d) => dayNames.indexOf(d)));
  const current = new Date(latestDrawDate + "T12:00:00");

  for (let offset = 1; offset <= 7; offset++) {
    const next = new Date(current);
    next.setDate(current.getDate() + offset);
    if (drawDayIndices.has(next.getDay())) {
      return next.toISOString().slice(0, 10);
    }
  }

  // Shouldn't happen, but fallback to next day
  const d = new Date(latestDrawDate + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// GET — load saved predictions for a game, check wins against the target draw
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameSlug = searchParams.get("game");

  if (!gameSlug) {
    return NextResponse.json({ error: "game parameter required" }, { status: 400 });
  }

  ensureDb();
  const game = getGame(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const saved = db
    .select()
    .from(predictions)
    .where(eq(predictions.gameId, game.id))
    .orderBy(desc(predictions.createdAt))
    .all();

  if (saved.length === 0) {
    return NextResponse.json({ batches: [] });
  }

  // Group predictions into batches by forDrawDate
  const batchMap = new Map<string, typeof saved>();
  for (const pred of saved) {
    const key = pred.forDrawDate ?? pred.createdAt;
    if (!batchMap.has(key)) batchMap.set(key, []);
    batchMap.get(key)!.push(pred);
  }

  const batches = [];
  for (const [, preds] of batchMap) {
    const forDrawDate = preds[0].forDrawDate;
    const createdAt = preds[0].createdAt;

    // Only check against a draw on or after the target date
    let checkedDraw: LatestDraw | null = null;
    if (forDrawDate) {
      const draw = db
        .select()
        .from(draws)
        .where(
          and(eq(draws.gameId, game.id), gte(draws.drawDate, forDrawDate))
        )
        .orderBy(draws.drawDate)
        .limit(1)
        .get();

      if (draw) {
        checkedDraw = {
          drawDate: draw.drawDate,
          numbers: JSON.parse(draw.numbers),
          bonusNumber: draw.bonusNumber ?? undefined,
        };
      }
    }

    const picks = preds.map((p) => ({
      id: p.id,
      numbers: JSON.parse(p.numbers) as number[],
      rationale: p.rationale ?? "",
      score: p.score ?? 0,
    }));

    const winResults = checkedDraw
      ? picks.map((pick) => checkWin(gameSlug, pick.numbers, checkedDraw!))
      : null;

    batches.push({
      forDrawDate,
      createdAt,
      drawsAnalyzed: preds[0].drawsAnalyzed ?? 0,
      picks,
      checkedDraw,
      winResults,
    });
  }

  return NextResponse.json({ batches });
}

// DELETE — clear predictions for a game (optionally by forDrawDate)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameSlug = searchParams.get("game");
  const forDate = searchParams.get("forDate");

  if (!gameSlug) {
    return NextResponse.json({ error: "game parameter required" }, { status: 400 });
  }

  ensureDb();
  const game = getGame(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (forDate) {
    db.delete(predictions)
      .where(and(eq(predictions.gameId, game.id), eq(predictions.forDrawDate, forDate)))
      .run();
  } else {
    db.delete(predictions).where(eq(predictions.gameId, game.id)).run();
  }

  return NextResponse.json({ success: true });
}

// POST — generate new picks and save to DB
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameSlug = searchParams.get("game");

  if (!gameSlug) {
    return NextResponse.json({ error: "game parameter required" }, { status: 400 });
  }

  ensureDb();
  const game = getGame(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const allDraws = getParsedDraws(game.id);
  if (allDraws.length < 10) {
    return NextResponse.json(
      { error: "Need at least 10 draws for predictions. Sync data first." },
      { status: 400 }
    );
  }

  const config = buildAnalysisConfig(game, allDraws.length);
  const result = generateQuickPicks(allDraws, config);

  // Compute the NEXT draw date — that's the draw these picks are targeting
  const latestDrawDate = allDraws[0].drawDate;
  const nextDrawDate = getNextDrawDate(latestDrawDate, game.drawDays);

  for (const pick of result.picks) {
    db.insert(predictions)
      .values({
        gameId: game.id,
        numbers: JSON.stringify(pick.numbers),
        rationale: pick.rationale,
        score: pick.score,
        drawsAnalyzed: result.drawsAnalyzed,
        forDrawDate: nextDrawDate,
      })
      .run();
  }

  return NextResponse.json({ success: true, count: result.picks.length, forDrawDate: nextDrawDate });
}
