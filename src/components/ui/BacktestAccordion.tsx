"use client";

import { useState } from "react";
import NumberBall from "./NumberBall";

interface WinResult {
  isWin: boolean;
  matchType: string;
  matchCount: number;
  prize: number;
  matchedNumbers: number[];
}

interface BacktestPick {
  numbers: number[];
  rationale: string;
  score: number;
  winResult: WinResult;
}

interface BacktestDrawResult {
  drawDate: string;
  drawNumber: string;
  actualNumbers: number[];
  drawsUsedForPrediction: number;
  picks: BacktestPick[];
  totalPrize: number;
  wins: number;
  bestMatchCount: number;
}

interface BacktestDayResult {
  date: string;
  midday: BacktestDrawResult | null;
  evening: BacktestDrawResult | null;
  dayTotalPrize: number;
  dayWins: number;
}

interface BacktestSummary {
  totalDrawsTested: number;
  totalPicks: number;
  totalWins: number;
  totalPrize: number;
  winRate: number;
  matchDistribution: Record<number, number>;
}

interface BacktestResponse {
  summary: BacktestSummary;
  days: BacktestDayResult[];
}

interface Props {
  gameSlug: string;
  gameName: string;
  ticketPrice: number;
}

export default function BacktestAccordion({ gameSlug, gameName, ticketPrice }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BacktestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(20);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedDraw, setExpandedDraw] = useState<string | null>(null);

  async function runBacktest() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/backtest?game=${gameSlug}&days=${days}`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json as BacktestResponse);
        if (json.days?.length > 0) {
          setExpandedDay(json.days[json.days.length - 1].date);
        }
      }
    } catch {
      setError("Failed to run backtest");
    } finally {
      setLoading(false);
    }
  }

  const toggleDay = (date: string) => {
    setExpandedDay(expandedDay === date ? null : date);
    setExpandedDraw(null);
  };

  const toggleDraw = (key: string) => {
    setExpandedDraw(expandedDraw === key ? null : key);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={runBacktest}
          disabled={loading}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors"
        >
          {loading ? "Running Backtest..." : `Run Backtest (${days} days)`}
        </button>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 text-sm rounded-lg bg-card-bg border border-card-border text-foreground"
        >
          <option value={10}>10 days</option>
          <option value={20}>20 days</option>
          <option value={30}>30 days</option>
        </select>
        {loading && (
          <span className="text-xs text-muted animate-pulse">
            Analyzing {days * 2} draws...
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-sm text-accent-red">
          {error}
        </div>
      )}

      {data && <SummaryCard summary={data.summary} ticketPrice={ticketPrice} />}

      {data && data.days.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold text-muted mb-3">
            Day-by-Day Results
          </h3>
          {data.days.map((day) => (
            <DayAccordion
              key={day.date}
              day={day}
              isExpanded={expandedDay === day.date}
              onToggle={() => toggleDay(day.date)}
              expandedDraw={expandedDraw}
              onToggleDraw={toggleDraw}
            />
          ))}
        </div>
      )}

      {data && (
        <p className="mt-4 text-[10px] text-muted">
          Disclaimer: Lottery draws are random. Backtesting results do not
          predict future performance. For entertainment only.
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  summary,
  ticketPrice,
}: {
  summary: BacktestSummary;
  ticketPrice: number;
}) {
  const totalCost = summary.totalPicks * ticketPrice;
  const net = summary.totalPrize - totalCost;
  const roi = totalCost > 0 ? Math.round((net / totalCost) * 1000) / 10 : 0;

  const matchEntries = Object.entries(summary.matchDistribution)
    .map(([k, v]) => [Number(k), v] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
      <StatCard label="Draws Tested" value={summary.totalDrawsTested} />
      <StatCard label="Picks Generated" value={summary.totalPicks} />
      <StatCard
        label="Wins"
        value={`${summary.totalWins} (${summary.winRate}%)`}
        accent={summary.totalWins > 0 ? "green" : undefined}
      />
      <StatCard
        label="Total Prize"
        value={`$${summary.totalPrize.toLocaleString()}`}
        accent={summary.totalPrize > 0 ? "gold" : undefined}
      />
      <StatCard
        label="Total Cost"
        value={`$${totalCost.toLocaleString()}`}
      />
      <StatCard
        label="Net Return"
        value={`${net >= 0 ? "+" : ""}$${net.toLocaleString()}`}
        accent={net >= 0 ? "green" : "red"}
      />
      <StatCard
        label="ROI"
        value={`${roi >= 0 ? "+" : ""}${roi}%`}
        accent={roi >= 0 ? "green" : "red"}
      />
      <div className="p-3 rounded-lg bg-card-bg border border-card-border">
        <p className="text-[10px] text-muted mb-1">Match Distribution</p>
        <div className="flex flex-wrap gap-1">
          {matchEntries.map(([count, freq]) => (
            <span
              key={count}
              className="text-[10px] px-1.5 py-0.5 rounded bg-background"
            >
              {count}:{freq}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "green" | "gold" | "red";
}) {
  const colorClass =
    accent === "green"
      ? "text-accent-green"
      : accent === "gold"
        ? "text-accent-gold"
        : accent === "red"
          ? "text-accent-red"
          : "";

  return (
    <div className="p-3 rounded-lg bg-card-bg border border-card-border">
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`text-sm font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

function DayAccordion({
  day,
  isExpanded,
  onToggle,
  expandedDraw,
  onToggleDraw,
}: {
  day: BacktestDayResult;
  isExpanded: boolean;
  onToggle: () => void;
  expandedDraw: string | null;
  onToggleDraw: (key: string) => void;
}) {
  return (
    <div className="rounded-lg bg-card-bg border border-card-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-background/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{isExpanded ? "▼" : "▸"}</span>
          <span className="text-sm font-semibold">{day.date}</span>
          <span className="text-xs text-muted">
            {(day.midday ? 1 : 0) + (day.evening ? 1 : 0)} draw
            {(day.midday ? 1 : 0) + (day.evening ? 1 : 0) > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {day.dayWins > 0 ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-accent-green/20 text-accent-green">
              {day.dayWins} win{day.dayWins > 1 ? "s" : ""} — $
              {day.dayTotalPrize.toLocaleString()}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-muted">
              No wins
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {day.midday && (
            <DrawSection
              draw={day.midday}
              drawKey={`${day.date}-MIDDAY`}
              isExpanded={expandedDraw === `${day.date}-MIDDAY`}
              onToggle={() => onToggleDraw(`${day.date}-MIDDAY`)}
            />
          )}
          {day.evening && (
            <DrawSection
              draw={day.evening}
              drawKey={`${day.date}-EVENING`}
              isExpanded={expandedDraw === `${day.date}-EVENING`}
              onToggle={() => onToggleDraw(`${day.date}-EVENING`)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DrawSection({
  draw,
  drawKey,
  isExpanded,
  onToggle,
}: {
  draw: BacktestDrawResult;
  drawKey: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-card-border/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2.5 hover:bg-background/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted">
            {isExpanded ? "▼" : "▸"}
          </span>
          <span className="text-xs font-semibold text-accent-blue">
            {draw.drawNumber}
          </span>
          <span className="text-[10px] text-muted">
            ({draw.drawsUsedForPrediction} draws analyzed)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {draw.wins > 0 ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-green/20 text-accent-green">
              {draw.wins} win{draw.wins > 1 ? "s" : ""} — $
              {draw.totalPrize.toLocaleString()}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-muted">
              No wins
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          <div className="flex items-center gap-2 p-2 rounded bg-background border border-card-border/30 text-[10px]">
            <span className="text-muted">Draw result:</span>
            <div className="flex gap-0.5 flex-wrap">
              {draw.actualNumbers.map((n, i) => (
                <NumberBall key={i} number={n} size="sm" />
              ))}
            </div>
          </div>

          {draw.picks.map((pick, i) => {
            const matchedSet = new Set(pick.winResult.matchedNumbers);
            return (
              <div
                key={i}
                className={`flex items-center gap-2 p-2 rounded border ${
                  pick.winResult.isWin
                    ? "bg-accent-green/10 border-accent-green/30"
                    : "bg-background/50 border-card-border/30"
                }`}
              >
                <span className="text-[10px] font-bold text-accent-gold w-5">
                  #{i + 1}
                </span>
                <div className="flex gap-0.5 flex-wrap">
                  {pick.numbers.map((n, j) => (
                    <NumberBall
                      key={j}
                      number={n}
                      size="sm"
                      highlight={matchedSet.has(n)}
                    />
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${
                      pick.winResult.isWin
                        ? "bg-accent-green/20 text-accent-green"
                        : "bg-gray-700/50 text-muted"
                    }`}
                  >
                    {pick.winResult.matchType}
                    {pick.winResult.prize > 0 &&
                      ` — $${pick.winResult.prize.toLocaleString()}`}
                  </span>
                  <span className="text-[10px] text-muted hidden sm:block max-w-[150px] truncate">
                    {pick.rationale}
                  </span>
                  <span className="text-[10px] font-semibold text-accent-gold whitespace-nowrap">
                    {pick.score}pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
