import { getGame, getParsedDraws } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import WindowSizeSelector from "@/components/ui/WindowSizeSelector";
import PositionalHeatmap from "@/components/charts/PositionalHeatmap";
import { analyzePositional } from "@/lib/analysis/positional";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
}

export default async function PositionalPage({ params, searchParams }: Props) {
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

  const results = draws.length >= 5 ? analyzePositional(draws, config) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Positional Tracking</h2>
          <p className="text-sm text-muted mt-1">
            Most frequent numbers per sorted position in {draws.length} draws
          </p>
        </div>
        <WindowSizeSelector basePath={`/games/${slug}/analysis/positional`} />
      </div>

      {results.length > 0 ? (
        <>
          <div className="p-4 rounded-xl bg-card-bg border border-card-border mb-6">
            <h4 className="text-sm font-semibold mb-3">Position Heatmap — Top 5 per Position</h4>
            <PositionalHeatmap data={results} />
          </div>

          <div className="space-y-4">
            {results.map((pos) => (
              <div key={pos.position} className="rounded-lg bg-card-bg border border-card-border p-4">
                <h4 className="text-sm font-semibold mb-2">
                  Position {pos.position} —{" "}
                  {pos.position === 1
                    ? "Lowest"
                    : pos.position === config.pickCount
                    ? "Highest"
                    : `${pos.position}${
                        pos.position === 2 ? "nd" : pos.position === 3 ? "rd" : "th"
                      } lowest`}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {pos.topNumbers.map((n, i) => (
                    <div
                      key={n.number}
                      className="flex items-center gap-2 px-3 py-1.5 rounded bg-background"
                    >
                      <span className="text-xs text-muted">#{i + 1}</span>
                      <span className="font-semibold">{n.number}</span>
                      <span className="text-xs text-muted">
                        {n.frequency}x ({n.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
