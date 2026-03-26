import { db } from "@/lib/db";
import { games, draws } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/migrate";
import { eq, desc, like, count, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import NumberBallRow from "@/components/ui/NumberBallRow";
import Disclaimer from "@/components/ui/Disclaimer";
import HistoryFilters from "@/components/ui/HistoryFilters";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; search?: string; from?: string; to?: string }>;
}

const PAGE_SIZE = 50;

export default async function HistoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  ensureDb();

  const game = db.select().from(games).where(eq(games.slug, slug)).get();
  if (!game) notFound();

  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const searchNum = sp.search;
  const fromDate = sp.from;
  const toDate = sp.to;

  const conditions = [eq(draws.gameId, game.id)];
  if (fromDate) {
    conditions.push(
      // draw_date >= fromDate
      // Using raw sql via like won't work, but we can filter in the query
      // Actually drizzle supports gte with text comparison for ISO dates
    );
  }

  // Build the query with filters
  let query = db
    .select()
    .from(draws)
    .where(eq(draws.gameId, game.id))
    .orderBy(desc(draws.drawDate));

  // Get all draws (we'll filter in JS for search/date since drizzle sqlite has limited operators)
  let allDraws = query.all();

  if (fromDate) {
    allDraws = allDraws.filter((d) => d.drawDate >= fromDate);
  }
  if (toDate) {
    allDraws = allDraws.filter((d) => d.drawDate <= toDate);
  }
  if (searchNum) {
    const num = parseInt(searchNum);
    if (!isNaN(num)) {
      allDraws = allDraws.filter((d) => {
        const nums = JSON.parse(d.numbers) as number[];
        return nums.includes(num);
      });
    }
  }

  const totalFiltered = allDraws.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pagedDraws = allDraws.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{game.name} — Draw History</h2>
        <p className="text-sm text-muted mt-1">
          {totalFiltered.toLocaleString()} draws
        </p>
      </div>

      <HistoryFilters slug={slug} search={searchNum} from={fromDate} to={toDate} />

      <div className="rounded-lg bg-card-bg border border-card-border overflow-hidden mb-4">
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
            {pagedDraws.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted">
                  No draws found. Sync data first.
                </td>
              </tr>
            ) : (
              pagedDraws.map((draw) => (
                <tr
                  key={draw.id}
                  className="border-b border-card-border/50 hover:bg-background/50"
                >
                  <td className="p-3 text-xs">{draw.drawDate}</td>
                  <td className="p-3 text-xs text-muted">
                    {draw.drawNumber ?? "—"}
                  </td>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={`/games/${slug}/history?page=${page - 1}${searchNum ? `&search=${searchNum}` : ""}${fromDate ? `&from=${fromDate}` : ""}${toDate ? `&to=${toDate}` : ""}`}
              className="px-3 py-1 text-xs rounded bg-card-bg border border-card-border hover:border-accent-blue"
            >
              Previous
            </a>
          )}
          <span className="text-xs text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/games/${slug}/history?page=${page + 1}${searchNum ? `&search=${searchNum}` : ""}${fromDate ? `&from=${fromDate}` : ""}${toDate ? `&to=${toDate}` : ""}`}
              className="px-3 py-1 text-xs rounded bg-card-bg border border-card-border hover:border-accent-blue"
            >
              Next
            </a>
          )}
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
