import { db } from "@/lib/db";
import { games, syncLog } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/migrate";
import { eq, desc } from "drizzle-orm";
import Disclaimer from "@/components/ui/Disclaimer";
import SyncButton from "@/components/ui/SyncButton";
import CsvUploadForm from "@/components/ui/CsvUploadForm";

export default async function SyncPage() {
  ensureDb();

  const allGames = db.select().from(games).all();

  const gamesSyncHistory = allGames.map((game) => {
    const logs = db
      .select()
      .from(syncLog)
      .where(eq(syncLog.gameId, game.id))
      .orderBy(desc(syncLog.createdAt))
      .limit(10)
      .all();
    return { game, logs };
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Data Sync</h2>
        <p className="text-sm text-muted mt-1">
          Manage lottery draw data — sync from OLG or import CSV files
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {gamesSyncHistory.map(({ game, logs }) => (
          <div
            key={game.id}
            className="p-5 rounded-xl bg-card-bg border border-card-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{game.name}</h3>
              <SyncButton gameSlug={game.slug} />
            </div>

            {logs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted font-semibold uppercase">
                  Sync History
                </p>
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-xs p-2 rounded bg-background"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          log.status === "success"
                            ? "bg-accent-green"
                            : log.status === "error"
                            ? "bg-accent-red"
                            : "bg-accent-gold"
                        }`}
                      />
                      <span className="text-muted">{log.syncType}</span>
                    </div>
                    <span>
                      +{log.drawsAdded} draws
                    </span>
                    <span className="text-muted">
                      {log.createdAt?.slice(0, 16)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No sync history yet</p>
            )}
          </div>
        ))}
      </div>

      <div className="p-5 rounded-xl bg-card-bg border border-card-border">
        <h3 className="text-lg font-semibold mb-4">CSV Import</h3>
        <p className="text-xs text-muted mb-4">
          Upload a CSV file with draw data. Supported formats:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded bg-background text-xs font-mono">
            <p className="text-muted mb-1">Format 1:</p>
            draw_date,numbers,bonus_number
            <br />
            2024-01-03,&quot;3,12,17,29,38,45&quot;,22
          </div>
          <div className="p-3 rounded bg-background text-xs font-mono">
            <p className="text-muted mb-1">Format 2:</p>
            date,n1,n2,n3,n4,n5,n6,bonus
            <br />
            2024-01-03,3,12,17,29,38,45,22
          </div>
        </div>
        <CsvUploadForm games={allGames.map((g) => ({ slug: g.slug, name: g.name }))} />
      </div>

      <Disclaimer />
    </div>
  );
}
