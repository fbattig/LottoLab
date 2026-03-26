import { getGame, getParsedDraws } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import { analyzeConsecutive } from "@/lib/analysis/consecutive";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
}

export default async function ConsecutivePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();

  const draws = getParsedDraws(game.id);

  const config = {
    gameId: game.id,
    gameSlug: game.slug,
    pickCount: game.pickCount,
    numberRange: game.numberRange,
    windowSize: draws.length,
  };

  const results = draws.length >= 5 ? analyzeConsecutive(draws, config) : [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Consecutive Number Analysis</h2>
        <p className="text-sm text-muted mt-1">
          How often consecutive pairs appear in {draws.length} draws
        </p>
      </div>

      {results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {results.map((r) => (
              <div
                key={r.pairCount}
                className="p-5 rounded-xl bg-card-bg border border-card-border text-center"
              >
                <p className="text-3xl font-bold">{r.percentage.toFixed(1)}%</p>
                <p className="text-sm text-muted mt-1">
                  {r.pairCount === 0
                    ? "No consecutives"
                    : r.pairCount === 1
                    ? "1 consecutive pair"
                    : `${r.pairCount}+ consecutive pairs`}
                </p>
                <p className="text-xs text-muted mt-1">{r.count} draws</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-card-bg border border-card-border mb-6">
            <h4 className="text-sm font-semibold mb-3">Distribution</h4>
            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.pairCount} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-muted">
                    {r.pairCount === 0
                      ? "No pairs"
                      : r.pairCount === 1
                      ? "1 pair"
                      : `${r.pairCount}+ pairs`}
                  </span>
                  <div className="flex-1 h-6 rounded bg-background overflow-hidden">
                    <div
                      className="h-full rounded bg-accent-blue flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(2, r.percentage)}%` }}
                    >
                      {r.percentage > 10 && (
                        <span className="text-[10px] text-white">{r.percentage.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs w-12 text-right">{r.count}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-4">
              Most winning draws contain 0 or 1 consecutive pair. Having 1 pair is common and acceptable.
            </p>
          </div>
        </>
      ) : (
        <div className="p-8 rounded-xl bg-card-bg border border-card-border text-center">
          <p className="text-muted">Need at least 5 draws for analysis.</p>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
