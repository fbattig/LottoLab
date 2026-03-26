import { getGame, getParsedDraws } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import WindowSizeSelector from "@/components/ui/WindowSizeSelector";
import SkipLineChart from "@/components/charts/SkipLineChart";
import { analyzeSkipHit } from "@/lib/analysis/skip-hit";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
}

export default async function SkipHitPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const game = getGame(slug);
  if (!game) notFound();

  const windowSize = parseInt(sp.window ?? "20") || undefined;
  const draws = getParsedDraws(game.id, windowSize);

  const config = {
    gameId: game.id,
    gameSlug: game.slug,
    pickCount: game.pickCount,
    numberRange: game.numberRange,
    windowSize: windowSize ?? draws.length,
  };

  const results = draws.length >= 5 ? analyzeSkipHit(draws, config) : [];
  const dueNumbers = results.filter((r) => r.isDue).sort((a, b) => b.currentSkip - a.currentSkip);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Skip & Hit Analysis</h2>
          <p className="text-sm text-muted mt-1">
            Games out and due number detection across {draws.length} draws
          </p>
        </div>
        <WindowSizeSelector basePath={`/games/${slug}/analysis/skip-hit`} />
      </div>

      {results.length > 0 ? (
        <>
          {dueNumbers.length > 0 && (
            <div className="p-4 rounded-xl bg-accent-gold/10 border border-accent-gold/20 mb-6">
              <h4 className="text-sm font-semibold text-accent-gold mb-2">
                Due Numbers ({dueNumbers.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {dueNumbers.map((r) => (
                  <span key={r.number} className="px-2 py-1 text-xs rounded bg-accent-gold/20 text-accent-gold">
                    {r.number} (out {r.currentSkip}, avg {r.avgSkip.toFixed(1)})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-card-bg border border-card-border mb-6">
            <SkipLineChart
              data={results.map((r) => ({
                number: r.number,
                currentSkip: r.currentSkip,
                avgSkip: Math.round(r.avgSkip * 10) / 10,
                isDue: r.isDue,
              }))}
            />
          </div>

          <div className="rounded-lg bg-card-bg border border-card-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="text-left p-3">Number</th>
                  <th className="text-left p-3">Current Skip</th>
                  <th className="text-left p-3">Avg Skip</th>
                  <th className="text-left p-3">Max Skip</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.number} className="border-b border-card-border/50 hover:bg-background/50">
                    <td className="p-3 font-semibold">{r.number}</td>
                    <td className="p-3">{r.currentSkip}</td>
                    <td className="p-3 text-muted">{r.avgSkip.toFixed(1)}</td>
                    <td className="p-3 text-muted">{r.maxSkip}</td>
                    <td className="p-3">
                      {r.isDue && (
                        <span className="text-xs px-2 py-0.5 rounded bg-accent-gold/20 text-accent-gold">
                          DUE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
