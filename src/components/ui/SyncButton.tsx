"use client";

import { useState } from "react";

export default function SyncButton({ gameSlug }: { gameSlug: string }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSlug }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ text: `Synced ${data.drawsAdded} draws`, ok: true });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const noSource = data.errors?.some((e: string) => e.includes("No fallback source"));
        setResult({
          text: noSource ? "No online source — use CSV import" : (data.error || "Sync failed"),
          ok: false,
        });
      }
    } catch {
      setResult({ text: "Network error", ok: false });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className={`text-xs ${result.ok ? "text-accent-green" : "text-accent-gold"}`}>
          {result.text}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-blue hover:bg-accent-blue/80 text-white disabled:opacity-50 transition-colors"
      >
        {syncing ? "Syncing..." : "Sync Now"}
      </button>
    </div>
  );
}
