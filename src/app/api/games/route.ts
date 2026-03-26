import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { games, draws, syncLog } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/migrate";
import { eq, desc, count, max } from "drizzle-orm";

export async function GET() {
  try {
    ensureDb();

    const allGames = db.select().from(games).all();

    const gamesWithStats = allGames.map((game) => {
      const drawStats = db
        .select({
          totalDraws: count(draws.id),
          latestDrawDate: max(draws.drawDate),
        })
        .from(draws)
        .where(eq(draws.gameId, game.id))
        .get();

      const lastSync = db
        .select({
          createdAt: syncLog.createdAt,
        })
        .from(syncLog)
        .where(eq(syncLog.gameId, game.id))
        .orderBy(desc(syncLog.createdAt))
        .limit(1)
        .get();

      return {
        ...game,
        totalDraws: drawStats?.totalDraws ?? 0,
        latestDrawDate: drawStats?.latestDrawDate ?? null,
        lastSyncDate: lastSync?.createdAt ?? null,
      };
    });

    return NextResponse.json({ games: gamesWithStats });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
