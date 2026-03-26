import { getGame, getParsedDraws, buildAnalysisConfig } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import WindowSizeSelector from "@/components/ui/WindowSizeSelector";
import RatioDonutChart from "@/components/charts/RatioDonutChart";
import { analyzeOddEven } from "@/lib/analysis/odd-even";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
}

export default async function OddEvenPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const game = getGame(slug);
  if (!game) notFound();

  const windowSize = parseInt(sp.window ?? "20") || undefined;
  const draws = getParsedDraws(game.id, windowSize);

  const config = buildAnalysisConfig(game, windowSize ?? draws.length);

  const results = draws.length >= 5 ? analyzeOddEven(draws, config) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Odd/Even Balance</h2>
          <p className="text-sm text-muted mt-1">
            Distribution of odd vs even numbers in {draws.length} draws
          </p>
        </div>
        <WindowSizeSelector basePath={`/games/${slug}/analysis/odd-even`} />
      </div>

      {results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="p-4 rounded-xl bg-card-bg border border-card-border">
              <RatioDonutChart data={results} title="Odd/Even Distribution" />
            </div>
            <div className="p-4 rounded-xl bg-card-bg border border-card-border">
              <h4 className="text-sm font-semibold mb-3">Recommendations</h4>
              <div className="space-y-2">
                {results.slice(0, 3).map((r) => (
                  <div key={r.ratio} className="flex items-center justify-between p-2 rounded bg-background">
                    <span className="text-sm font-semibold">{r.ratio} (odd/even)</span>
                    <span className="text-sm text-accent-green">{r.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-3">
                The most balanced odd/even ratios appear most frequently. Avoid all-odd or all-even combinations.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-card-bg border border-card-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="text-left p-3">Ratio (Odd/Even)</th>
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
