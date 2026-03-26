import { getGame, getParsedDraws } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import WindowSizeSelector from "@/components/ui/WindowSizeSelector";
import RatioDonutChart from "@/components/charts/RatioDonutChart";
import { analyzeHighLow } from "@/lib/analysis/high-low";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
}

export default async function HighLowPage({ params, searchParams }: Props) {
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

  const results = draws.length >= 5 ? analyzeHighLow(draws, config) : [];
  const midpoint = Math.floor(game.numberRange / 2);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">High/Low Balance</h2>
          <p className="text-sm text-muted mt-1">
            Low (1–{midpoint}) vs High ({midpoint + 1}–{game.numberRange}) in{" "}
            {draws.length} draws
          </p>
        </div>
        <WindowSizeSelector basePath={`/games/${slug}/analysis/high-low`} />
      </div>

      {results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="p-4 rounded-xl bg-card-bg border border-card-border">
              <RatioDonutChart data={results} title="High/Low Distribution" />
            </div>
            <div className="p-4 rounded-xl bg-card-bg border border-card-border">
              <h4 className="text-sm font-semibold mb-3">Recommendations</h4>
              <div className="space-y-2">
                {results.slice(0, 3).map((r) => (
                  <div key={r.ratio} className="flex items-center justify-between p-2 rounded bg-background">
                    <span className="text-sm font-semibold">{r.ratio} (high/low)</span>
                    <span className="text-sm text-accent-green">{r.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-3">
                A balanced mix of high and low numbers appears most frequently.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-card-bg border border-card-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="text-left p-3">Ratio (High/Low)</th>
                  <th className="text-left p-3">Count</th>
                  <th className="text-left p-3">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.ratio} className="border-b border-card-border/50 hover:bg-background/50">
                    <td className="p-3 font-semibold">{r.ratio}</td>
                    <td className="p-3">{r.count}</td>
                    <td className="p-3 text-muted">{r.percentage.toFixed(1)}%</td>
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
