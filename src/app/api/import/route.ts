import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { games, draws, syncLog } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/migrate";
import { parseCsv } from "@/lib/scraper/csv-parser";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    ensureDb();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const gameSlug = formData.get("gameSlug") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, errors: ["No file uploaded"] },
        { status: 400 }
      );
    }

    if (!gameSlug) {
      return NextResponse.json(
        { success: false, errors: ["gameSlug is required"] },
        { status: 400 }
      );
    }

    const game = db.select().from(games).where(eq(games.slug, gameSlug)).get();

    if (!game) {
      return NextResponse.json(
        { success: false, errors: [`Game not found: ${gameSlug}`] },
        { status: 404 }
      );
    }

    const csvText = await file.text();
    const parseResult = parseCsv(
      csvText,
      game.pickCount,
      game.numberRange
    );

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        drawsAdded: 0,
        errors: parseResult.errors,
      });
    }

    let drawsAdded = 0;
    let lastDrawDate = "";
    const insertErrors: string[] = [...parseResult.errors];

    for (const draw of parseResult.draws) {
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
        const message =
          err instanceof Error ? err.message : String(err);
        if (message.includes("UNIQUE constraint failed")) {
          // Skip duplicates silently
          if (!lastDrawDate || draw.drawDate > lastDrawDate) {
            lastDrawDate = draw.drawDate;
          }
        } else {
          insertErrors.push(
            `Failed to insert draw ${draw.drawDate}: ${message}`
          );
        }
      }
    }

    // Log the import
    db.insert(syncLog)
      .values({
        gameId: game.id,
        syncType: "csv-import",
        drawsAdded,
        lastDrawDate: lastDrawDate || null,
        status: drawsAdded > 0 ? "success" : "error",
        errorMessage:
          insertErrors.length > 0
            ? insertErrors.join("; ")
            : null,
      })
      .run();

    return NextResponse.json({
      success: drawsAdded > 0,
      drawsAdded,
      totalParsed: parseResult.draws.length,
      errors: insertErrors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, drawsAdded: 0, errors: [message] },
      { status: 500 }
    );
  }
}
