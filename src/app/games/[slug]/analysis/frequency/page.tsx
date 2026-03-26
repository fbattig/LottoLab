import { getGame, getParsedDraws, buildAnalysisConfig } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import WindowSizeSelector from "@/components/ui/WindowSizeSelector";
import FrequencyBarChart from "@/components/charts/FrequencyBarChart";
import { analyzeFrequency } from "@/lib/analysis/frequency";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
}

export default async function FrequencyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const game = getGame(slug);
  if (!game) notFound();

  const windowSize = parseInt(sp.window ?? "20") || undefined;
  const draws = getParsedDraws(game.id, windowSize);

  const config = buildAnalysisConfig(game, windowSize ?? draws.length);

  const results = draws.length >= 5 ? analyzeFrequency(draws, config) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Frequency Analysis</h2>
          <p className="text-sm text-muted mt-1">
            Hot, warm, and cold numbers based on {draws.length} draws
          </p>
        </div>
        <WindowSizeSelector basePath={`/games/${slug}/analysis/frequency`} />
      </div>

      {results.length > 0 ? (
        <>
          <div className="p-4 rounded-xl bg-card-bg border border-card-border mb-6">
            <FrequencyBarChart
              data={results.map((r) => ({
                number: r.number,
                frequency: r.frequency,
                classification: r.classification,
              }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-accent-green/10 border border-accent-green/20">
              <h4 className="text-xs font-semibold text-accent-green mb-2">HOT Numbers</h4>
              <div className="flex flex-wrap gap-1">
                {results
                  .filter((r) => r.classification === "HOT")
                  .map((r) => (
                    <span key={r.number} className="px-2 py-0.5 text-xs rounded bg-accent-green/20 text-accent-green">
                      {r.number} ({r.frequency})
                    </span>
                  ))}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
              <h4 className="text-xs font-semibold text-accent-gold mb-2">WARM Numbers</h4>
              <div className="flex flex-wrap gap-1">
                {results
                  .filter((r) => r.classification === "WARM")
                  .map((r) => (
                    <span key={r.number} className="px-2 py-0.5 text-xs rounded bg-accent-gold/20 text-accent-gold">
                      {r.number} ({r.frequency})
                    </span>
                  ))}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-accent-red/10 border border-accent-red/20">
              <h4 className="text-xs font-semibold text-accent-red mb-2">COLD Numbers</h4>
              <div className="flex flex-wrap gap-1">
                {results
                  .filter((r) => r.classification === "COLD")
                  .map((r) => (
                    <span key={r.number} className="px-2 py-0.5 text-xs rounded bg-accent-red/20 text-accent-red">
                      {r.number} ({r.frequency})
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-card-bg border border-card-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="text-left p-3">Rank</th>
                  <th className="text-left p-3">Number</th>
                  <th className="text-left p-3">Frequency</th>
                  <th className="text-left p-3">Percentage</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.number} className="border-b border-card-border/50 hover:bg-background/50">
                    <td className="p-3 text-xs">{r.rank}</td>
                    <td className="p-3 font-semibold">{r.number}</td>
                    <td className="p-3">{r.frequency}</td>
                    <td className="p-3 text-muted">{r.percentage.toFixed(1)}%</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        r.classification === "HOT"
                          ? "bg-accent-green/20 text-accent-green"
                          : r.classification === "WARM"
                          ? "bg-accent-gold/20 text-accent-gold"
                          : "bg-accent-red/20 text-accent-red"
                      }`}>
                        {r.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="p-8 rounded-xl bg-card-bg border border-card-border text-center">
          <p className="text-muted">Need at least 5 draws for analysis. Sync data first.</p>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
