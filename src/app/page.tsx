import { db } from "@/lib/db";
import { games, draws, syncLog } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/migrate";
import { eq, desc, count } from "drizzle-orm";
import Link from "next/link";
import Disclaimer from "@/components/ui/Disclaimer";
import NumberBallRow from "@/components/ui/NumberBallRow";

async function getGameStats() {
  ensureDb();

  const allGames = db.select().from(games).all();

  return allGames.map((game) => {
    const totalDraws = db
      .select({ count: count() })
      .from(draws)
      .where(eq(draws.gameId, game.id))
      .get();

    const latestDraw = db
      .select()
      .from(draws)
      .where(eq(draws.gameId, game.id))
      .orderBy(desc(draws.drawDate))
      .limit(1)
      .get();

    const lastSync = db
      .select()
      .from(syncLog)
      .where(eq(syncLog.gameId, game.id))
      .orderBy(desc(syncLog.createdAt))
      .limit(1)
      .get();

    return {
      game,
      totalDraws: totalDraws?.count ?? 0,
      latestDraw: latestDraw ?? null,
      lastSyncDate: lastSync?.createdAt ?? null,
    };
  });
}

function getNextDrawDay(drawDaysJson: string | null): string {
  if (!drawDaysJson) return "—";
  let days: string[];
  try {
    days = JSON.parse(drawDaysJson);
  } catch {
    return "—";
  }
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const now = new Date();
  const today = now.getDay();
  const drawDayNums = days.map((d) => dayMap[d]);
  let minDiff = 7;
  for (const dd of drawDayNums) {
    let diff = dd - today;
    if (diff <= 0) diff += 7;
    if (diff < minDiff) minDiff = diff;
  }
  const next = new Date(now);
  next.setDate(now.getDate() + minDiff);
  return next.toLocaleDateString("en-CA");
}

export default async function DashboardPage() {
  const stats = await getGameStats();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted mt-1">
          Overview of all supported OLG lottery games
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map(({ game, totalDraws, latestDraw, lastSyncDate }) => (
          <Link
            key={game.slug}
            href={`/games/${game.slug}`}
            className="block p-5 rounded-xl bg-card-bg border border-card-border hover:border-accent-gold/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-foreground">{game.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-accent-green/10 text-accent-green">
                Pick {game.pickCount} / {game.numberRange}
              </span>
            </div>

            {latestDraw ? (
              <div className="mb-3">
                <p className="text-xs text-muted mb-1">
                  Latest: {latestDraw.drawDate}
                </p>
                <NumberBallRow
                  numbers={JSON.parse(latestDraw.numbers)}
                  bonus={latestDraw.bonusNumber ?? undefined}
                />
              </div>
            ) : (
              <p className="text-sm text-muted mb-3">No draws synced yet</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-background">
                <p className="text-muted">Total Draws</p>
                <p className="text-lg font-bold text-foreground">
                  {totalDraws.toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded bg-background">
                <p className="text-muted">Next Draw</p>
                <p className="text-sm font-semibold text-accent-gold">
                  {getNextDrawDay(game.drawDays)}
                </p>
              </div>
            </div>

            {lastSyncDate && (
              <p className="text-[10px] text-muted mt-2">
                Last sync: {lastSyncDate}
              </p>
            )}
          </Link>
        ))}
      </div>

      <Disclaimer />
    </div>
  );
}
