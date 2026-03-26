"use client";

import { useState } from "react";
import NumberBall from "@/components/ui/NumberBall";

interface FilteredPool {
  hotNumbers: number[];
  warmNumbers: number[];
  dueNumbers: number[];
  recommendedPool: number[];
}

interface Props {
  game: {
    slug: string;
    name: string;
    pickCount: number;
    numberRange: number;
    minNumber: number;
  };
  pool: FilteredPool;
  sumRange: { low: number; high: number };
  topOddEven: string[];
  topHighLow: string[];
}

interface GeneratedCombo {
  numbers: number[];
  sumTotal: number;
  sumInRange: boolean;
  oddEvenRatio: string;
  highLowRatio: string;
  groupsCovered: number;
  score: number;
}

export default function GeneratorWizard({
  game,
  pool,
  sumRange,
  topOddEven,
  topHighLow,
}: Props) {
  const [step, setStep] = useState(1);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(
    new Set(pool.recommendedPool)
  );
  const [generating, setGenerating] = useState(false);
  const [combinations, setCombinations] = useState<GeneratedCombo[]>([]);
  const [savedSets, setSavedSets] = useState<number[][]>([]);

  function toggleNumber(n: number) {
    const next = new Set(selectedNumbers);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setSelectedNumbers(next);
  }

  function selectAll(nums: number[]) {
    const next = new Set(selectedNumbers);
    for (const n of nums) next.add(n);
    setSelectedNumbers(next);
  }

  function deselectAll(nums: number[]) {
    const next = new Set(selectedNumbers);
    for (const n of nums) next.delete(n);
    setSelectedNumbers(next);
  }

  async function generate() {
    setGenerating(true);
    const poolArray = Array.from(selectedNumbers).sort((a, b) => a - b);
    const k = game.pickCount;

    // Client-side generation with scoring
    const results: GeneratedCombo[] = [];
    const seen = new Set<string>();
    const maxAttempts = 5000;
    const maxResults = 100;

    for (let i = 0; i < maxAttempts && results.length < maxResults; i++) {
      const combo = randomCombo(poolArray, k);
      const key = combo.join(",");
      if (seen.has(key)) continue;
      seen.add(key);

      const sum = combo.reduce((a, b) => a + b, 0);
      const oddCount = combo.filter((n) => n % 2 !== 0).length;
      const evenCount = k - oddCount;
      const mid = Math.floor(game.numberRange / 2);
      const highCount = combo.filter((n) => n > mid).length;
      const lowCount = k - highCount;
      const groups = new Set(combo.map((n) => Math.floor((n - game.minNumber) / 10)));

      const sumInRange = sum >= sumRange.low && sum <= sumRange.high;
      const oddEvenRatio = `${oddCount}/${evenCount}`;
      const highLowRatio = `${highCount}/${lowCount}`;

      // Score
      let score = 0;
      if (sumInRange) score += 25;
      if (topOddEven.includes(oddEvenRatio)) score += 15;
      if (topHighLow.includes(highLowRatio)) score += 15;
      score += groups.size * 5;

      // Check consecutives
      let consec = 0;
      for (let j = 0; j < combo.length - 1; j++) {
        if (combo[j + 1] - combo[j] === 1) consec++;
      }
      if (consec <= 1) score += 10;

      // Last digit diversity
      const lastDigits = new Set(combo.map((n) => n % 10));
      score += lastDigits.size * 2;

      // Hot number bonus
      const hotCount = combo.filter((n) => pool.hotNumbers.includes(n)).length;
      score += hotCount * 3;

      // Due number bonus
      const dueCount = combo.filter((n) => pool.dueNumbers.includes(n)).length;
      score += dueCount * 2;

      results.push({
        numbers: combo,
        sumTotal: sum,
        sumInRange,
        oddEvenRatio,
        highLowRatio,
        groupsCovered: groups.size,
        score,
      });
    }

    results.sort((a, b) => b.score - a.score);
    setCombinations(results);
    setGenerating(false);
    setStep(7);
  }

  function randomCombo(arr: number[], k: number): number[] {
    const copy = [...arr];
    const result: number[] = [];
    for (let i = 0; i < k; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return result.sort((a, b) => a - b);
  }

  async function saveSelection(numbers: number[]) {
    try {
      await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_selection",
          gameSlug: game.slug,
          numbers,
        }),
      });
      setSavedSets((prev) => [...prev, numbers]);
    } catch {
      // Silently fail
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-6">
        {[1, 2, 3, 4, 5, 6, 7].map((s) => (
          <button
            key={s}
            onClick={() => s < step && setStep(s)}
            className={`flex-1 h-2 rounded-full transition-colors ${
              s <= step ? "bg-accent-gold" : "bg-card-border"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Hot/Cold Review */}
      {step === 1 && (
        <div className="p-5 rounded-xl bg-card-bg border border-card-border">
          <h3 className="text-lg font-semibold mb-4">
            Step 1: Review Hot/Cold Numbers
          </h3>
          <p className="text-xs text-muted mb-4">
            Select numbers to include in your pool. Hot and warm numbers are
            pre-selected.
          </p>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-accent-green">
                HOT ({pool.hotNumbers.length})
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => selectAll(pool.hotNumbers)}
                  className="text-[10px] px-2 py-0.5 rounded bg-accent-green/20 text-accent-green"
                >
                  Select All
                </button>
                <button
                  onClick={() => deselectAll(pool.hotNumbers)}
                  className="text-[10px] px-2 py-0.5 rounded bg-card-border text-muted"
                >
                  Deselect
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pool.hotNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => toggleNumber(n)}
                  className={`transition-all ${selectedNumbers.has(n) ? "scale-110" : "opacity-40"}`}
                >
                  <NumberBall number={n} size="md" highlight={selectedNumbers.has(n)} />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-accent-gold">
                WARM ({pool.warmNumbers.length})
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => selectAll(pool.warmNumbers)}
                  className="text-[10px] px-2 py-0.5 rounded bg-accent-gold/20 text-accent-gold"
                >
                  Select All
                </button>
                <button
                  onClick={() => deselectAll(pool.warmNumbers)}
                  className="text-[10px] px-2 py-0.5 rounded bg-card-border text-muted"
                >
                  Deselect
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pool.warmNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => toggleNumber(n)}
                  className={`transition-all ${selectedNumbers.has(n) ? "scale-110" : "opacity-40"}`}
                >
                  <NumberBall number={n} size="md" highlight={selectedNumbers.has(n)} />
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted">
            Pool: {selectedNumbers.size} numbers selected (need at least{" "}
            {game.pickCount})
          </p>

          <button
            onClick={() => setStep(2)}
            disabled={selectedNumbers.size < game.pickCount}
            className="mt-4 px-6 py-2 rounded-lg bg-accent-gold text-gray-900 font-semibold disabled:opacity-50"
          >
            Next: Due Numbers
          </button>
        </div>
      )}

      {/* Step 2: Due Numbers */}
      {step === 2 && (
        <div className="p-5 rounded-xl bg-card-bg border border-card-border">
          <h3 className="text-lg font-semibold mb-4">
            Step 2: Due Number Adjustments
          </h3>
          <p className="text-xs text-muted mb-4">
            These numbers have been out longer than average. Consider including them.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {pool.dueNumbers.map((n) => (
              <button
                key={n}
                onClick={() => toggleNumber(n)}
                className={`transition-all ${selectedNumbers.has(n) ? "scale-110" : "opacity-40"}`}
              >
                <NumberBall number={n} size="md" highlight={selectedNumbers.has(n)} />
              </button>
            ))}
          </div>

          <p className="text-sm text-muted">
            Pool: {selectedNumbers.size} numbers
          </p>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg bg-card-border text-muted"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 rounded-lg bg-accent-gold text-gray-900 font-semibold"
            >
              Next: Preferences
            </button>
          </div>
        </div>
      )}

      {/* Steps 3-6: Preferences summary */}
      {step >= 3 && step <= 6 && (
        <div className="p-5 rounded-xl bg-card-bg border border-card-border">
          <h3 className="text-lg font-semibold mb-4">
            Step {step}: Filter Preferences
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded bg-background">
              <p className="text-xs text-muted mb-1">Optimal Sum Range</p>
              <p className="font-semibold">
                {sumRange.low} — {sumRange.high}
              </p>
            </div>
            <div className="p-3 rounded bg-background">
              <p className="text-xs text-muted mb-1">Best Odd/Even Ratios</p>
              <p className="font-semibold">{topOddEven.join(", ")}</p>
            </div>
            <div className="p-3 rounded bg-background">
              <p className="text-xs text-muted mb-1">Best High/Low Ratios</p>
              <p className="font-semibold">{topHighLow.join(", ")}</p>
            </div>
            <div className="p-3 rounded bg-background">
              <p className="text-xs text-muted mb-1">Pool Size</p>
              <p className="font-semibold">{selectedNumbers.size} numbers</p>
            </div>
          </div>

          <p className="text-xs text-muted mb-4">
            The generator will score each combination against all criteria above
            and rank them by composite score.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg bg-card-border text-muted"
            >
              Back
            </button>
            <button
              onClick={generate}
              disabled={generating}
              className="px-6 py-2 rounded-lg bg-accent-green text-white font-semibold disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Combinations"}
            </button>
          </div>
        </div>
      )}

      {/* Step 7: Results */}
      {step === 7 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Generated Combinations ({combinations.length})
            </h3>
            <button
              onClick={() => {
                setCombinations([]);
                setStep(3);
              }}
              className="px-4 py-2 text-sm rounded-lg bg-card-border text-muted"
            >
              Regenerate
            </button>
          </div>

          <div className="space-y-2">
            {combinations.slice(0, 50).map((combo, i) => {
              const isSaved = savedSets.some(
                (s) => s.join(",") === combo.numbers.join(",")
              );
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-card-bg border border-card-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted w-6">#{i + 1}</span>
                    <div className="flex gap-1">
                      {combo.numbers.map((n, j) => (
                        <NumberBall key={j} number={n} size="sm" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={combo.sumInRange ? "text-accent-green" : "text-muted"}>
                      Sum: {combo.sumTotal}
                    </span>
                    <span className="text-muted">{combo.oddEvenRatio} O/E</span>
                    <span className="text-muted">{combo.highLowRatio} H/L</span>
                    <span className="text-muted">{combo.groupsCovered}G</span>
                    <span className="font-semibold text-accent-gold">
                      {combo.score}pts
                    </span>
                    <button
                      onClick={() => saveSelection(combo.numbers)}
                      disabled={isSaved}
                      className={`px-2 py-1 rounded text-xs ${
                        isSaved
                          ? "bg-accent-green/20 text-accent-green"
                          : "bg-accent-blue text-white hover:bg-accent-blue/80"
                      }`}
                    >
                      {isSaved ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
