import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { games, draws, syncLog } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/migrate";
import { scrapeOlgApi } from "@/lib/scraper/olg-api";
import { scrapeFallback } from "@/lib/scraper/fallback-scraper";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    ensureDb();

    const body = await request.json();
    const { gameSlug, source } = body as {
      gameSlug: string;
      source?: "olg" | "fallback";
    };

    if (!gameSlug) {
      return NextResponse.json(
        { success: false, error: "gameSlug is required" },
        { status: 400 }
      );
    }

    const game = db.select().from(games).where(eq(games.slug, gameSlug)).get();

    if (!game) {
      return NextResponse.json(
        { success: false, error: `Game not found: ${gameSlug}` },
        { status: 404 }
      );
    }

    let result;
    if (source === "fallback") {
      result = await scrapeFallback(gameSlug);
    } else {
      // Use OLG gateway API (works for all games)
      result = await scrapeOlgApi(gameSlug);
      if (!result.success) {
        // Fall back to lottolore scraping
        result = await scrapeFallback(gameSlug);
      }
    }

    let drawsAdded = 0;
    let lastDrawDate = "";

    if (result.success && result.draws.length > 0) {
      for (const draw of result.draws) {
        const drawNumber = draw.drawNumber ?? null;

        // Check for existing draw (handles NULL draw_number which UNIQUE constraint misses)
        const existing = db
          .select({ id: draws.id })
          .from(draws)
          .where(
            and(
              eq(draws.gameId, game.id),
              eq(draws.drawDate, draw.drawDate),
              drawNumber
                ? eq(draws.drawNumber, drawNumber)
                : isNull(draws.drawNumber)
            )
          )
          .get();

        if (existing) {
          if (!lastDrawDate || draw.drawDate > lastDrawDate) {
            lastDrawDate = draw.drawDate;
          }
          continue;
        }

        try {
          db.insert(draws)
            .values({
              gameId: game.id,
              drawDate: draw.drawDate,
              drawNumber,
              numbers: JSON.stringify(draw.numbers),
              bonusNumber: draw.bonusNumber ?? null,
              jackpotAmount: draw.jackpotAmount ?? null,
            })
            .run();
          drawsAdded++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!message.includes("UNIQUE constraint failed")) throw err;
        }

        if (!lastDrawDate || draw.drawDate > lastDrawDate) {
          lastDrawDate = draw.drawDate;
        }
      }
    }

    // Log the sync
    db.insert(syncLog)
      .values({
        gameId: game.id,
        syncType: result.source || source || "auto",
        drawsAdded,
        lastDrawDate: lastDrawDate || null,
        status: result.success ? "success" : "error",
        errorMessage:
          result.errors.length > 0
            ? result.errors.join("; ")
            : null,
      })
      .run();

    return NextResponse.json({
      success: result.success,
      drawsAdded,
      lastDrawDate: lastDrawDate || null,
      errors: result.errors,
      source: result.source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
