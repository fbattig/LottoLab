"use client";

import { useRouter, useSearchParams } from "next/navigation";

const WINDOW_SIZES = [10, 20, 30, 50, 100, 0];
const LABELS: Record<number, string> = {
  10: "Last 10",
  20: "Last 20",
  30: "Last 30",
  50: "Last 50",
  100: "Last 100",
  0: "All",
};

export default function WindowSizeSelector({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = parseInt(searchParams.get("window") ?? "20");

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted mr-2">Window:</span>
      {WINDOW_SIZES.map((size) => (
        <button
          key={size}
          onClick={() =>
            router.push(`${basePath}?window=${size}`)
          }
          className={`px-2 py-1 text-xs rounded transition-colors ${
            current === size
              ? "bg-accent-blue text-white"
              : "bg-card-bg border border-card-border text-muted hover:text-foreground"
          }`}
        >
          {LABELS[size]}
        </button>
      ))}
    </div>
  );
}
