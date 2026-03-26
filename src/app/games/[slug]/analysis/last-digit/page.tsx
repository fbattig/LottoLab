import { getGame, getParsedDraws } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import WindowSizeSelector from "@/components/ui/WindowSizeSelector";
import { analyzeLastDigit } from "@/lib/analysis/last-digit";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
}

export default async function LastDigitPage({ params, searchParams }: Props) {
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

  const results = draws.length >= 5 ? analyzeLastDigit(draws, config) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Last Digit Analysis</h2>
          <p className="text-sm text-muted mt-1">
            Distribution of last digits (0–9) in {draws.length} draws
          </p>
        </div>
        <WindowSizeSelector basePath={`/games/${slug}/analysis/last-digit`} />
      </div>

      {results.length > 0 ? (
        <>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-6">
            {results.map((d) => (
              <div
                key={d.digit}
                className="p-3 rounded-lg bg-card-bg border border-card-border text-center"
              >
                <p className="text-xl font-bold">{d.digit}</p>
                <p className="text-xs text-muted">{d.frequency}</p>
                <p className="text-[10px] text-muted">{d.percentage.toFixed(1)}%</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-card-bg border border-card-border mb-6">
            <h4 className="text-sm font-semibold mb-3">Last Digit Distribution</h4>
            <div className="space-y-2">
              {results.map((d) => (
                <div key={d.digit} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-semibold text-center">{d.digit}</span>
                  <div className="flex-1 h-4 rounded bg-background overflow-hidden">
                    <div
                      className="h-full rounded bg-accent-blue"
                      style={{ width: `${Math.min(100, d.percentage * 3)}%` }}
                    />
                  </div>
                  <span className="text-xs w-16 text-right">{d.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">
              Diversify last digits in your selections. Avoid picking multiple numbers ending in the same digit.
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
