"use client";

import { useState, useEffect, useCallback } from "react";
import NumberBall from "./NumberBall";

interface PredictedPick {
  id: number;
  numbers: number[];
  rationale: string;
  score: number;
}

interface WinResult {
  isWin: boolean;
  matchType: string;
  matchCount: number;
  prize: number;
  matchedNumbers: number[];
}

interface LatestDraw {
  drawDate: string;
  numbers: number[];
  bonusNumber?: number;
}

interface PredictionBatch {
  forDrawDate: string;
  createdAt: string;
  drawsAnalyzed: number;
  picks: PredictedPick[];
  checkedDraw: LatestDraw | null;
  winResults: WinResult[] | null;
}

export default function QuickPicksButton({ gameSlug }: { gameSlug: string }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [batches, setBatches] = useState<PredictionBatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<number>(0);

  const loadPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quick-picks?game=${gameSlug}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setBatches(data.batches ?? []);
      }
    } catch {
      setError("Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }, [gameSlug]);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  async function generateNew() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/quick-picks?game=${gameSlug}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        await loadPredictions();
        setExpandedBatch(0);
      }
    } catch {
      setError("Failed to generate picks");
    } finally {
      setGenerating(false);
    }
  }

  async function deleteBatch(forDate: string) {
    try {
      await fetch(
        `/api/quick-picks?game=${gameSlug}&forDate=${encodeURIComponent(forDate)}`,
        { method: "DELETE" }
      );
      await loadPredictions();
    } catch {
      setError("Failed to delete predictions");
    }
  }

  async function clearAll() {
    try {
      await fetch(`/api/quick-picks?game=${gameSlug}`, { method: "DELETE" });
      setBatches([]);
    } catch {
      setError("Failed to clear predictions");
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-muted animate-pulse">
        Loading predictions...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={generateNew}
          disabled={generating}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent-gold text-gray-900 hover:bg-accent-gold/80 disabled:opacity-50 transition-colors"
        >
          {generating ? "Analyzing..." : "Generate New Picks"}
        </button>
        {batches.length > 0 && (
          <button
            onClick={clearAll}
            className="px-3 py-2 text-xs rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-sm text-accent-red">
          {error}
        </div>
      )}

      {batches.length === 0 && !error && (
        <p className="mt-3 text-sm text-muted">
          No predictions saved yet. Generate picks to start tracking wins.
        </p>
      )}

      <div className="mt-4 space-y-4">
        {batches.map((batch, batchIdx) => {
          const isExpanded = expandedBatch === batchIdx;
          const totalPrize = batch.winResults
            ? batch.winResults.reduce((sum, w) => sum + w.prize, 0)
            : 0;
          const wins = batch.winResults
            ? batch.winResults.filter((w) => w.isWin).length
            : 0;

          return (
            <div
              key={batch.forDrawDate}
              className="rounded-lg bg-card-bg border border-card-border overflow-hidden"
            >
              {/* Batch header */}
              <button
                onClick={() =>
                  setExpandedBatch(isExpanded ? -1 : batchIdx)
                }
                className="w-full flex items-center justify-between p-3 hover:bg-background/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    Predictions for
                  </span>
                  <span className="text-sm font-semibold">
                    {batch.forDrawDate}
                  </span>
                  <span className="text-xs text-muted">
                    ({batch.picks.length} picks, {batch.drawsAnalyzed} draws analyzed)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {batch.winResults ? (
                    wins > 0 ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-accent-green/20 text-accent-green">
                        {wins} WIN{wins > 1 ? "S" : ""} — $
                        {totalPrize.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-muted">
                        No wins
                      </span>
                    )
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-accent-gold/20 text-accent-gold">
                      Awaiting draw
                    </span>
                  )}
                  <span className="text-muted text-xs">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {/* Checked-against draw */}
                  {batch.checkedDraw && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-card-border text-xs">
                      <span className="text-muted">Draw result</span>
                      <span className="font-semibold">
                        {batch.checkedDraw.drawDate}:
                      </span>
                      <div className="flex gap-1">
                        {batch.checkedDraw.numbers.map((n, i) => (
                          <NumberBall key={i} number={n} size="sm" />
                        ))}
                      </div>
                      {batch.checkedDraw.bonusNumber !== undefined && (
                        <span className="text-muted">
                          + B:{" "}
                          <span className="font-semibold">
                            {batch.checkedDraw.bonusNumber}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  {!batch.checkedDraw && (
                    <div className="p-2 rounded-lg bg-accent-gold/5 border border-accent-gold/20 text-xs text-accent-gold">
                      Next draw result not yet synced. Sync after the draw to see results.
                    </div>
                  )}

                  {/* Pick rows */}
                  {batch.picks.map((pick, i) => {
                    const win = batch.winResults?.[i];
                    const matchedSet = new Set(win?.matchedNumbers ?? []);
                    return (
                      <div
                        key={pick.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          win?.isWin
                            ? "bg-accent-green/10 border-accent-green/40"
                            : win && !win.isWin
                              ? "bg-card-bg border-card-border"
                              : "bg-card-bg border-card-border/50"
                        }`}
                      >
                        <span className="text-sm font-bold text-accent-gold w-6">
                          #{i + 1}
                        </span>
                        <div className="flex gap-1.5">
                          {pick.numbers.map((n, j) => (
                            <NumberBall
                              key={j}
                              number={n}
                              size="md"
                              highlight={
                                batch.checkedDraw !== null &&
                                matchedSet.has(n)
                              }
                            />
                          ))}
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                          {win && (
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                                win.isWin
                                  ? "bg-accent-green/20 text-accent-green"
                                  : "bg-gray-700/50 text-muted"
                              }`}
                            >
                              {win.isWin
                                ? `${win.matchType} — $${win.prize.toLocaleString()}`
                                : win.matchType}
                            </span>
                          )}
                          <span className="text-xs text-muted max-w-[200px] truncate hidden sm:block">
                            {pick.rationale}
                          </span>
                          <span className="text-xs font-semibold text-accent-gold whitespace-nowrap">
                            {pick.score} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Delete batch */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => deleteBatch(batch.forDrawDate)}
                      className="text-[10px] text-accent-red/60 hover:text-accent-red transition-colors"
                    >
                      Delete this batch
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {batches.length > 0 && (
        <p className="mt-4 text-[10px] text-muted">
          Disclaimer: Lottery draws are random. These picks are based on
          historical pattern analysis for entertainment only — no strategy
          guarantees a win.
        </p>
      )}
    </div>
  );
}
