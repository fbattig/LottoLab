import { getGame, getParsedDraws, buildAnalysisConfig } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import SumHistogram from "@/components/charts/SumHistogram";
import { analyzeSumTotal } from "@/lib/analysis/sum-total";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
}

export default async function SumTotalPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();

  const draws = getParsedDraws(game.id);

  const config = buildAnalysisConfig(game, draws.length);

  const result = draws.length >= 5 ? analyzeSumTotal(draws, config) : null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Sum Total Analysis</h2>
        <p className="text-sm text-muted mt-1">
          Optimal sum range for winning combinations across {draws.length} draws
        </p>
      </div>

      {result ? (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="p-4 rounded-lg bg-card-bg border border-card-border">
              <p className="text-xs text-muted">Mean Sum</p>
              <p className="text-xl font-bold">{result.mean.toFixed(1)}</p>
            </div>
            <div className="p-4 rounded-lg bg-card-bg border border-card-border">
              <p className="text-xs text-muted">Std Dev</p>
              <p className="text-xl font-bold">{result.stdDev.toFixed(1)}</p>
            </div>
            <div className="p-4 rounded-lg bg-accent-green/10 border border-accent-green/20">
              <p className="text-xs text-accent-green">Optimal Range</p>
              <p className="text-xl font-bold text-accent-green">
                {Math.round(result.optimalLow)}–{Math.round(result.optimalHigh)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card-bg border border-card-border">
              <p className="text-xs text-muted">In Range</p>
              <p className="text-xl font-bold">{result.inRangePercentage.toFixed(1)}%</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card-bg border border-card-border mb-6">
            <SumHistogram
              data={result.distribution}
              optimalLow={result.optimalLow}
              optimalHigh={result.optimalHigh}
            />
          </div>

          <div className="rounded-lg bg-card-bg border border-card-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="text-left p-3">Sum</th>
                  <th className="text-left p-3">Count</th>
                  <th className="text-left p-3">Percentage</th>
                  <th className="text-left p-3">In Range</th>
                </tr>
              </thead>
              <tbody>
                {result.distribution
                  .filter((d) => d.count > 0)
                  .map((d) => (
                    <tr key={d.sum} className="border-b border-card-border/50 hover:bg-background/50">
                      <td className="p-3 font-semibold">{d.sum}</td>
                      <td className="p-3">{d.count}</td>
                      <td className="p-3 text-muted">{d.percentage.toFixed(1)}%</td>
                      <td className="p-3">
                        {d.sum >= result.optimalLow && d.sum <= result.optimalHigh && (
                          <span className="text-xs px-2 py-0.5 rounded bg-accent-green/20 text-accent-green">YES</span>
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
