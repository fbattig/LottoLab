"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const GAME_NAMES: Record<string, string> = {
  "lotto-649": "Lotto 6/49",
  "lotto-max": "Lotto Max",
  "ontario-49": "Ontario 49",
};

export default function Topbar() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const segments = pathname.split("/").filter(Boolean);
  const gameSlug = segments[0] === "games" ? segments[1] : null;
  const gameName = gameSlug ? GAME_NAMES[gameSlug] : null;

  const pageTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname === "/sync") return "Data Sync";
    if (gameName) {
      if (segments.includes("history")) return `${gameName} — Draw History`;
      if (segments.includes("generator"))
        return `${gameName} — Number Generator`;
      if (segments.includes("analysis")) {
        const strategy = segments[segments.length - 1];
        if (strategy === "analysis") return `${gameName} — Analysis`;
        return `${gameName} — ${strategy
          .split("-")
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(" ")}`;
      }
      return gameName;
    }
    return "LottoLab";
  };

  return (
    <header className="h-14 border-b border-card-border bg-card-bg flex items-center px-4 gap-4 shrink-0">
      <button
        className="lg:hidden text-muted hover:text-foreground"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="text-sm font-semibold text-foreground">{pageTitle()}</h1>
      <div className="ml-auto flex items-center gap-3">
        {gameName && (
          <span className="text-xs px-2 py-1 rounded bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
            {gameName}
          </span>
        )}
      </div>
    </header>
  );
}
