import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { games, draws, syncLog } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/migrate";
import { scrapeOlg } from "@/lib/scraper/olg-scraper";
import { scrapeFallback } from "@/lib/scraper/fallback-scraper";
import { eq } from "drizzle-orm";
import type { ScrapedDraw } from "@/lib/scraper/olg-scraper";

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
    if (source === "olg") {
      result = await scrapeOlg(gameSlug);
    } else {
      // Go straight to fallback (OLG pages are JS-rendered and can't be scraped with Cheerio)
      result = await scrapeFallback(gameSlug);
    }

    let drawsAdded = 0;
    let lastDrawDate = "";

    if (result.success && result.draws.length > 0) {
      for (const draw of result.draws) {
        try {
          db.insert(draws)
            .values({
              gameId: game.id,
              drawDate: draw.drawDate,
              drawNumber: draw.drawNumber ?? null,
              numbers: JSON.stringify(draw.numbers),
              bonusNumber: draw.bonusNumber ?? null,
              jackpotAmount: draw.jackpotAmount ?? null,
            })
            .run();
          drawsAdded++;

          if (!lastDrawDate || draw.drawDate > lastDrawDate) {
            lastDrawDate = draw.drawDate;
          }
        } catch (err) {
          // Skip duplicates (unique constraint violation)
          const message =
            err instanceof Error ? err.message : String(err);
          if (!message.includes("UNIQUE constraint failed")) {
            throw err;
          }
          // Still track the latest date even for duplicates
          if (!lastDrawDate || draw.drawDate > lastDrawDate) {
            lastDrawDate = draw.drawDate;
          }
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
