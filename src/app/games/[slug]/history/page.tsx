import { db } from "@/lib/db";
import { games, draws } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/migrate";
import { eq, desc, gte, lte, like, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import NumberBallRow from "@/components/ui/NumberBallRow";
import Disclaimer from "@/components/ui/Disclaimer";
import HistoryFilters from "@/components/ui/HistoryFilters";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; search?: string; draw?: string; from?: string; to?: string }>;
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
  const drawNum = sp.draw;
  const fromDate = sp.from;
  const toDate = sp.to;

  // Build SQL conditions
  const conditions = [eq(draws.gameId, game.id)];
  if (fromDate) conditions.push(gte(draws.drawDate, fromDate));
  if (toDate) conditions.push(lte(draws.drawDate, toDate));
  if (drawNum) conditions.push(like(draws.drawNumber, `%${drawNum}%`));

  let allDraws = db
    .select()
    .from(draws)
    .where(and(...conditions))
    .orderBy(desc(draws.drawDate))
    .all();

  // Filter by number(s) in JS — supports comma-separated (e.g. "6,11,33")
  if (searchNum) {
    const searchNums = searchNum
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    if (searchNums.length > 0) {
      allDraws = allDraws.filter((d) => {
        const nums = JSON.parse(d.numbers) as number[];
        return searchNums.every((n) => nums.includes(n));
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

      <HistoryFilters slug={slug} search={searchNum} drawNum={drawNum} from={fromDate} to={toDate} />

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
              href={`/games/${slug}/history?page=${page - 1}${searchNum ? `&search=${searchNum}` : ""}${drawNum ? `&draw=${drawNum}` : ""}${fromDate ? `&from=${fromDate}` : ""}${toDate ? `&to=${toDate}` : ""}`}
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
              href={`/games/${slug}/history?page=${page + 1}${searchNum ? `&search=${searchNum}` : ""}${drawNum ? `&draw=${drawNum}` : ""}${fromDate ? `&from=${fromDate}` : ""}${toDate ? `&to=${toDate}` : ""}`}
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
