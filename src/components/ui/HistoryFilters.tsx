"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  slug: string;
  search?: string;
  from?: string;
  to?: string;
}

export default function HistoryFilters({ slug, search, from, to }: Props) {
  const router = useRouter();
  const [searchNum, setSearchNum] = useState(search ?? "");
  const [fromDate, setFromDate] = useState(from ?? "");
  const [toDate, setToDate] = useState(to ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (searchNum) params.set("search", searchNum);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const qs = params.toString();
    router.push(`/games/${slug}/history${qs ? `?${qs}` : ""}`);
  }

  function clear() {
    setSearchNum("");
    setFromDate("");
    setToDate("");
    router.push(`/games/${slug}/history`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4 p-4 rounded-lg bg-card-bg border border-card-border">
      <div>
        <label className="block text-xs text-muted mb-1">Search Number</label>
        <input
          type="number"
          value={searchNum}
          onChange={(e) => setSearchNum(e.target.value)}
          placeholder="e.g. 17"
          className="w-24 px-2 py-1.5 text-sm rounded bg-background border border-card-border text-foreground"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">From Date</label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-2 py-1.5 text-sm rounded bg-background border border-card-border text-foreground"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">To Date</label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-2 py-1.5 text-sm rounded bg-background border border-card-border text-foreground"
        />
      </div>
      <button
        onClick={apply}
        className="px-3 py-1.5 text-sm rounded bg-accent-blue text-white hover:bg-accent-blue/80"
      >
        Filter
      </button>
      <button
        onClick={clear}
        className="px-3 py-1.5 text-sm rounded bg-card-border text-muted hover:text-foreground"
      >
        Clear
      </button>
    </div>
  );
}
