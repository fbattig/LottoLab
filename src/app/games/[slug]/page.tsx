import { db } from "@/lib/db";
import { games, draws } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/migrate";
import { eq, desc, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import NumberBallRow from "@/components/ui/NumberBallRow";
import Disclaimer from "@/components/ui/Disclaimer";
import SyncButton from "@/components/ui/SyncButton";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function GameOverviewPage({ params }: Props) {
  const { slug } = await params;
  ensureDb();

  const game = db.select().from(games).where(eq(games.slug, slug)).get();
  if (!game) notFound();

  const totalDraws = db
    .select({ count: count() })
    .from(draws)
    .where(eq(draws.gameId, game.id))
    .get();

  const recentDraws = db
    .select()
    .from(draws)
    .where(eq(draws.gameId, game.id))
    .orderBy(desc(draws.drawDate))
    .limit(10)
    .all();

  const oldestDraw = db
    .select()
    .from(draws)
    .where(eq(draws.gameId, game.id))
    .orderBy(draws.drawDate)
    .limit(1)
    .get();

  const strategies = [
    { slug: "frequency", label: "Frequency Analysis", desc: "Hot/Cold numbers" },
    { slug: "skip-hit", label: "Skip & Hit", desc: "Due number detection" },
    { slug: "sum-total", label: "Sum Total", desc: "Optimal sum ranges" },
    { slug: "odd-even", label: "Odd/Even", desc: "Balance analysis" },
    { slug: "high-low", label: "High/Low", desc: "Distribution analysis" },
    { slug: "groups", label: "Number Groups", desc: "Decade coverage" },
    { slug: "last-digit", label: "Last Digit", desc: "Digit diversity" },
    { slug: "consecutive", label: "Consecutive", desc: "Pair patterns" },
    { slug: "positional", label: "Positional", desc: "Position tracking" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{game.name}</h2>
          <p className="text-sm text-muted">
            Pick {game.pickCount} from 1–{game.numberRange}
            {game.hasBonus && " + bonus"} | $
            {game.ticketPrice?.toFixed(2)}/ticket
          </p>
        </div>
        <SyncButton gameSlug={slug} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-lg bg-card-bg border border-card-border">
          <p className="text-xs text-muted">Total Draws</p>
          <p className="text-2xl font-bold">{(totalDraws?.count ?? 0).toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-lg bg-card-bg border border-card-border">
          <p className="text-xs text-muted">Date Range</p>
          <p className="text-sm font-semibold">
            {oldestDraw ? `${oldestDraw.drawDate} — ${recentDraws[0]?.drawDate ?? ""}` : "—"}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-card-bg border border-card-border">
          <p className="text-xs text-muted">Draw Days</p>
          <p className="text-sm font-semibold">
            {game.drawDays ? JSON.parse(game.drawDays).join(", ") : "—"}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Recent Draws</h3>
          <Link
            href={`/games/${slug}/history`}
            className="text-xs text-accent-blue hover:underline"
          >
            View All History
          </Link>
        </div>
        {recentDraws.length === 0 ? (
          <div className="p-8 rounded-lg bg-card-bg border border-card-border text-center">
            <p className="text-muted">No draws yet. Sync data to get started.</p>
          </div>
        ) : (
          <div className="rounded-lg bg-card-bg border border-card-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-muted text-xs">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Draw #</th>
                  <th className="text-left p-3">Numbers</th>
                  <th className="text-right p-3">Jackpot</th>
                </tr>
              </thead>
              <tbody>
                {recentDraws.map((draw) => (
                  <tr key={draw.id} className="border-b border-card-border/50 hover:bg-background/50">
                    <td className="p-3 text-xs">{draw.drawDate}</td>
                    <td className="p-3 text-xs text-muted">{draw.drawNumber ?? "—"}</td>
                    <td className="p-3">
                      <NumberBallRow
                        numbers={JSON.parse(draw.numbers)}
                        bonus={draw.bonusNumber ?? undefined}
                      />
                    </td>
                    <td className="p-3 text-xs text-right text-accent-gold">
                      {draw.jackpotAmount
                        ? `$${(draw.jackpotAmount / 1_000_000).toFixed(1)}M`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Analysis Strategies</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {strategies.map((s) => (
            <Link
              key={s.slug}
              href={`/games/${slug}/analysis/${s.slug}`}
              className="p-4 rounded-lg bg-card-bg border border-card-border hover:border-accent-blue/40 transition-colors"
            >
              <h4 className="font-semibold text-sm">{s.label}</h4>
              <p className="text-xs text-muted mt-1">{s.desc}</p>
            </Link>
          ))}
          <Link
            href={`/games/${slug}/generator`}
            className="p-4 rounded-lg bg-accent-gold/10 border border-accent-gold/30 hover:border-accent-gold/60 transition-colors"
          >
            <h4 className="font-semibold text-sm text-accent-gold">
              Number Generator
            </h4>
            <p className="text-xs text-muted mt-1">
              Combined filter funnel
            </p>
          </Link>
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}
