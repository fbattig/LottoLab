import { getGame, getParsedDraws, buildAnalysisConfig } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import WindowSizeSelector from "@/components/ui/WindowSizeSelector";
import { analyzeNumberGroups } from "@/lib/analysis/number-groups";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
}

export default async function GroupsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const game = getGame(slug);
  if (!game) notFound();

  const windowSize = parseInt(sp.window ?? "20") || undefined;
  const draws = getParsedDraws(game.id, windowSize);

  const config = buildAnalysisConfig(game, windowSize ?? draws.length);

  const results = draws.length >= 5 ? analyzeNumberGroups(draws, config) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Number Groups</h2>
          <p className="text-sm text-muted mt-1">
            Decade group coverage in {draws.length} draws
          </p>
        </div>
        <WindowSizeSelector basePath={`/games/${slug}/analysis/groups`} />
      </div>

      {results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {results.map((g) => (
              <div
                key={g.group}
                className={`p-4 rounded-xl border text-center ${
                  g.isHot
                    ? "bg-accent-green/10 border-accent-green/30"
                    : "bg-card-bg border-card-border"
                }`}
              >
                <p className="text-xs text-muted">{g.range}</p>
                <p className="text-2xl font-bold mt-1">{g.frequency}</p>
                <p className="text-xs text-muted">{g.percentage.toFixed(1)}%</p>
                {g.isHot && (
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-accent-green/20 text-accent-green">
                    HOT
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-card-bg border border-card-border mb-6">
            <h4 className="text-sm font-semibold mb-3">Group Coverage</h4>
            <div className="space-y-2">
              {results.map((g) => (
                <div key={g.group} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-muted">{g.range}</span>
                  <div className="flex-1 h-4 rounded bg-background overflow-hidden">
                    <div
                      className={`h-full rounded ${g.isHot ? "bg-accent-green" : "bg-accent-blue"}`}
                      style={{ width: `${Math.min(100, g.percentage * 2)}%` }}
                    />
                  </div>
                  <span className="text-xs w-12 text-right">{g.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">
              Good combinations cover at least 3–4 different decade groups.
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
