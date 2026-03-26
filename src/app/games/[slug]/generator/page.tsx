import { getGame, getParsedDraws } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import GeneratorWizard from "@/components/analysis/GeneratorWizard";
import { buildFilteredPool } from "@/lib/analysis/combined-filter";
import { analyzeOddEven } from "@/lib/analysis/odd-even";
import { analyzeHighLow } from "@/lib/analysis/high-low";
import { analyzeSumTotal } from "@/lib/analysis/sum-total";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function GeneratorPage({ params }: Props) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();

  const draws = getParsedDraws(game.id, 50);

  if (draws.length < 10) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Number Generator</h2>
        <div className="p-8 rounded-xl bg-card-bg border border-card-border text-center">
          <p className="text-muted">
            Need at least 10 draws for the generator. Sync data first.
          </p>
        </div>
        <Disclaimer />
      </div>
    );
  }

  const config = {
    gameId: game.id,
    gameSlug: game.slug,
    pickCount: game.pickCount,
    numberRange: game.numberRange,
    minNumber: game.minNumber ?? 1,
    allowDuplicates: game.allowDuplicates ?? false,
    windowSize: draws.length,
  };

  const pool = buildFilteredPool(draws, config);
  const sumData = analyzeSumTotal(draws, config);
  const oddEvenData = analyzeOddEven(draws, config);
  const highLowData = analyzeHighLow(draws, config);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Number Generator</h2>
        <p className="text-sm text-muted mt-1">
          Combined filter funnel for {game.name} — {draws.length} draws analyzed
        </p>
      </div>

      <GeneratorWizard
        game={{
          slug: game.slug,
          name: game.name,
          pickCount: game.pickCount,
          numberRange: game.numberRange,
          minNumber: game.minNumber ?? 1,
        }}
        pool={pool}
        sumRange={{ low: Math.round(sumData.optimalLow), high: Math.round(sumData.optimalHigh) }}
        topOddEven={oddEvenData.slice(0, 3).map((r) => r.ratio)}
        topHighLow={highLowData.slice(0, 3).map((r) => r.ratio)}
      />

      <Disclaimer />
    </div>
  );
}
