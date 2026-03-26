"use client";

import { useState } from "react";
import NumberBall from "./NumberBall";

interface PatternSummary {
  hotDigits: { number: number; frequency: number }[];
  coldDigits: { number: number; frequency: number }[];
  dueDigits: { number: number; skip: number; avgSkip: number }[];
  topPairs: { numbers: number[]; count: number }[];
  sumRange: { low: number; high: number; peak: number };
  oddEvenBest: string;
  doublesRate: number;
  consecutiveRate: number;
}

interface PredictedPick {
  numbers: number[];
  rationale: string;
  score: number;
}

interface QuickPickResult {
  pattern: PatternSummary;
  picks: PredictedPick[];
  drawsAnalyzed: number;
}

export default function QuickPicksButton({ gameSlug }: { gameSlug: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickPickResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPatterns, setShowPatterns] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/quick-picks?game=${gameSlug}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to generate picks");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={loading}
        className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent-gold text-gray-900 hover:bg-accent-gold/80 disabled:opacity-50 transition-colors"
      >
        {loading ? "Analyzing..." : "Quick Picks"}
      </button>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-sm text-accent-red">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-accent-gold">
              5 Predicted Picks
            </h3>
            <span className="text-xs text-muted">
              Based on {result.drawsAnalyzed} draws analyzed
            </span>
          </div>

          <div className="space-y-2">
            {result.picks.map((pick, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-card-bg border border-card-border"
              >
                <span className="text-sm font-bold text-accent-gold w-6">
                  #{i + 1}
                </span>
                <div className="flex gap-1.5">
                  {pick.numbers.map((n, j) => (
                    <NumberBall key={j} number={n} size="md" />
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-xs text-muted max-w-[250px] truncate hidden sm:block">
                    {pick.rationale}
                  </span>
                  <span className="text-xs font-semibold text-accent-gold whitespace-nowrap">
                    {pick.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowPatterns(!showPatterns)}
            className="text-xs text-accent-blue hover:underline"
          >
            {showPatterns ? "Hide pattern analysis" : "Show pattern analysis"}
          </button>

          {showPatterns && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-card-bg border border-card-border">
                <h4 className="text-xs font-semibold text-accent-green mb-2">
                  Hot Numbers (Recent)
                </h4>
                <div className="flex flex-wrap gap-1">
                  {result.pattern.hotDigits.map((d) => (
                    <span
                      key={d.number}
                      className="px-2 py-0.5 text-xs rounded bg-accent-green/20 text-accent-green"
                    >
                      {d.number} ({d.frequency}x)
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card-bg border border-card-border">
                <h4 className="text-xs font-semibold text-accent-gold mb-2">
                  Due Numbers (Overdue)
                </h4>
                <div className="flex flex-wrap gap-1">
                  {result.pattern.dueDigits.slice(0, 6).map((d) => (
                    <span
                      key={d.number}
                      className="px-2 py-0.5 text-xs rounded bg-accent-gold/20 text-accent-gold"
                    >
                      {d.number} ({d.skip} out, avg {d.avgSkip})
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card-bg border border-card-border">
                <h4 className="text-xs font-semibold text-accent-blue mb-2">
                  Optimal Sum Range
                </h4>
                <p className="text-sm">
                  <span className="font-bold">{result.pattern.sumRange.low}–{result.pattern.sumRange.high}</span>
                  <span className="text-muted ml-2">(peak: {result.pattern.sumRange.peak})</span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card-bg border border-card-border">
                <h4 className="text-xs font-semibold text-accent-blue mb-2">
                  Patterns
                </h4>
                <div className="text-xs space-y-1">
                  <p>Best odd/even: <span className="font-semibold">{result.pattern.oddEvenBest}</span></p>
                  <p>Doubles rate: <span className="font-semibold">{result.pattern.doublesRate}%</span></p>
                  <p>Consecutive rate: <span className="font-semibold">{result.pattern.consecutiveRate}%</span></p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card-bg border border-card-border md:col-span-2">
                <h4 className="text-xs font-semibold text-muted mb-2">
                  Top Historical Combinations
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.pattern.topPairs.slice(0, 8).map((p, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs rounded bg-background flex items-center gap-1"
                    >
                      [{p.numbers.join(",")}]
                      <span className="text-muted">{p.count}x</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted">
            Disclaimer: Lottery draws are random. These picks are based on historical pattern
            analysis for entertainment only — no strategy guarantees a win.
          </p>
        </div>
      )}
    </div>
  );
}
