import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { predictions, draws } from "@/lib/db/schema";
import { getGame, getOrderedParsedDraws, buildAnalysisConfig } from "@/lib/db/queries";
import { generateQuickPicks } from "@/lib/analysis/quick-picks";
import { checkWin } from "@/lib/analysis/prize-check";
import type { LatestDraw } from "@/lib/analysis/prize-check";
import { eq, and, desc, gte, asc } from "drizzle-orm";
import { ensureDb } from "@/lib/db/migrate";

const DUAL_DRAW_GAMES = new Set(["daily-keno", "pick-2", "pick-3", "pick-4"]);

interface NextTarget {
  date: string;
  drawNumber: string | null;
}

function getNextTarget(
  gameSlug: string,
  latestDraw: { drawDate: string; drawNumber: string | null },
  drawDaysJson: string | null
): NextTarget {
  if (DUAL_DRAW_GAMES.has(gameSlug)) {
    if (latestDraw.drawNumber === "MIDDAY") {
      // MIDDAY just happened → next is EVENING same day
      return { date: latestDraw.drawDate, drawNumber: "EVENING" };
    }
    // EVENING (or null) → next is MIDDAY of next draw day
    const nextDate = getNextDrawDate(latestDraw.drawDate, drawDaysJson);
    return { date: nextDate, drawNumber: "MIDDAY" };
  }
  // Single-draw games
  const nextDate = getNextDrawDate(latestDraw.drawDate, drawDaysJson);
  return { date: nextDate, drawNumber: null };
}

function getNextDrawDate(latestDrawDate: string, drawDaysJson: string | null): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let drawDays: string[];
  try {
    drawDays = drawDaysJson ? JSON.parse(drawDaysJson) : [];
  } catch {
    drawDays = [];
  }

  if (drawDays.length === 0) {
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

  // Group by forDrawDate + forDrawNumber
  const batchMap = new Map<string, typeof saved>();
  for (const pred of saved) {
    const key = `${pred.forDrawDate ?? ""}|${pred.forDrawNumber ?? ""}`;
    if (!batchMap.has(key)) batchMap.set(key, []);
    batchMap.get(key)!.push(pred);
  }

  const batches = [];
  for (const [, preds] of batchMap) {
    const forDrawDate = preds[0].forDrawDate;
    const forDrawNumber = preds[0].forDrawNumber;
    const createdAt = preds[0].createdAt;

    let checkedDraw: LatestDraw | null = null;
    if (forDrawDate) {
      // Match against the specific draw (date + drawNumber)
      let query = db
        .select()
        .from(draws)
        .where(
          forDrawNumber
            ? and(
                eq(draws.gameId, game.id),
                eq(draws.drawDate, forDrawDate),
                eq(draws.drawNumber, forDrawNumber)
              )
            : and(eq(draws.gameId, game.id), gte(draws.drawDate, forDrawDate))
        )
        .orderBy(draws.drawDate)
        .limit(1);

      const draw = query.get();
      if (draw) {
        checkedDraw = {
          drawDate: draw.drawDate,
          numbers: JSON.parse(draw.numbers),
          bonusNumber: draw.bonusNumber ?? undefined,
        };
      }
    }

    const picks = preds
      .map((p) => ({
        id: p.id,
        numbers: JSON.parse(p.numbers) as number[],
        rationale: p.rationale ?? "",
        score: p.score ?? 0,
      }))
      .sort((a, b) => b.score - a.score);

    const winResults = checkedDraw
      ? picks.map((pick) => checkWin(gameSlug, pick.numbers, checkedDraw!))
      : null;

    batches.push({
      forDrawDate,
      forDrawNumber,
      createdAt,
      drawsAnalyzed: preds[0].drawsAnalyzed ?? 0,
      picks,
      checkedDraw,
      winResults,
    });
  }

  return NextResponse.json({ batches });
}

// DELETE — clear predictions for a game
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameSlug = searchParams.get("game");
  const forDate = searchParams.get("forDate");
  const forDrawNum = searchParams.get("forDrawNumber");

  if (!gameSlug) {
    return NextResponse.json({ error: "game parameter required" }, { status: 400 });
  }

  ensureDb();
  const game = getGame(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (forDate) {
    const conditions = [eq(predictions.gameId, game.id), eq(predictions.forDrawDate, forDate)];
    if (forDrawNum) {
      conditions.push(eq(predictions.forDrawNumber, forDrawNum));
    }
    db.delete(predictions).where(and(...conditions)).run();
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

  // Use ordered draws for dual-draw games (correct MIDDAY/EVENING chronology)
  const allDraws = getOrderedParsedDraws(game.id);
  if (allDraws.length < 10) {
    return NextResponse.json(
      { error: "Need at least 10 draws for predictions. Sync data first." },
      { status: 400 }
    );
  }

  const latestDraw = allDraws[0];
  const target = getNextTarget(gameSlug, latestDraw, game.drawDays);

  // Check if picks already exist for this target
  const conditions = [
    eq(predictions.gameId, game.id),
    eq(predictions.forDrawDate, target.date),
  ];
  if (target.drawNumber) {
    conditions.push(eq(predictions.forDrawNumber, target.drawNumber));
  }
  const existing = db
    .select()
    .from(predictions)
    .where(and(...conditions))
    .limit(1)
    .get();

  if (existing) {
    const label = target.drawNumber ? `${target.date} ${target.drawNumber}` : target.date;
    return NextResponse.json(
      { error: `Picks already generated for ${label}. Delete them first to regenerate.` },
      { status: 409 }
    );
  }

  const config = buildAnalysisConfig(game, allDraws.length);
  const result = generateQuickPicks(allDraws, config);

  for (const pick of result.picks) {
    db.insert(predictions)
      .values({
        gameId: game.id,
        numbers: JSON.stringify(pick.numbers),
        rationale: pick.rationale,
        score: pick.score,
        drawsAnalyzed: result.drawsAnalyzed,
        forDrawDate: target.date,
        forDrawNumber: target.drawNumber,
      })
      .run();
  }

  return NextResponse.json({
    success: true,
    count: result.picks.length,
    forDrawDate: target.date,
    forDrawNumber: target.drawNumber,
  });
}
