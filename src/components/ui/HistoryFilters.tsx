"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface Props {
  slug: string;
  search?: string;
  drawNum?: string;
  from?: string;
  to?: string;
}

export default function HistoryFilters({ slug, search, drawNum, from, to }: Props) {
  const router = useRouter();
  const [searchNum, setSearchNum] = useState(search ?? "");
  const [drawNumber, setDrawNumber] = useState(drawNum ?? "");
  const [fromDate, setFromDate] = useState(from ?? "");
  const [toDate, setToDate] = useState(to ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitial = useRef(true);

  function buildUrl(s: string, d: string, f: string, t: string) {
    const params = new URLSearchParams();
    if (s) params.set("search", s);
    if (d) params.set("draw", d);
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    const qs = params.toString();
    return `/games/${slug}/history${qs ? `?${qs}` : ""}`;
  }

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl(searchNum, drawNumber, fromDate, toDate));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchNum, drawNumber, fromDate, toDate]);

  function clear() {
    setSearchNum("");
    setDrawNumber("");
    setFromDate("");
    setToDate("");
    router.push(`/games/${slug}/history`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4 p-4 rounded-lg bg-card-bg border border-card-border">
      <div>
        <label className="block text-xs text-muted mb-1">Contains Numbers</label>
        <input
          type="text"
          value={searchNum}
          onChange={(e) => setSearchNum(e.target.value)}
          placeholder="e.g. 6,11,33"
          className="w-32 px-2 py-1.5 text-sm rounded bg-background border border-card-border text-foreground"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Draw #</label>
        <input
          type="text"
          value={drawNumber}
          onChange={(e) => setDrawNumber(e.target.value)}
          placeholder="e.g. MIDDAY"
          className="w-28 px-2 py-1.5 text-sm rounded bg-background border border-card-border text-foreground"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">From Date</label>
        <input
          type="date"
          style={{ colorScheme: "dark" }}
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-2 py-1.5 text-sm rounded bg-background border border-card-border text-foreground"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">To Date</label>
        <input
          type="date"
          style={{ colorScheme: "dark" }}
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-2 py-1.5 text-sm rounded bg-background border border-card-border text-foreground"
        />
      </div>
      <button
        onClick={clear}
        className="px-3 py-1.5 text-sm rounded bg-card-border text-muted hover:text-foreground"
      >
        Clear
      </button>
    </div>
  );
}
