"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/sync", label: "Data Sync", icon: "🔄" },
];

const GAMES = [
  { slug: "lotto-649", name: "Lotto 6/49" },
  { slug: "lotto-max", name: "Lotto Max" },
  { slug: "ontario-49", name: "Ontario 49" },
];

const STRATEGIES = [
  { slug: "frequency", label: "Frequency" },
  { slug: "skip-hit", label: "Skip & Hit" },
  { slug: "sum-total", label: "Sum Total" },
  { slug: "odd-even", label: "Odd/Even" },
  { slug: "high-low", label: "High/Low" },
  { slug: "groups", label: "Number Groups" },
  { slug: "last-digit", label: "Last Digit" },
  { slug: "consecutive", label: "Consecutive" },
  { slug: "positional", label: "Positional" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const activeGame = GAMES.find((g) =>
    pathname.startsWith(`/games/${g.slug}`)
  );

  return (
    <aside className="w-64 bg-sidebar-bg border-r border-card-border flex flex-col h-full overflow-y-auto shrink-0">
      <div className="p-4 border-b border-card-border">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-accent-gold">LottoLab</span>
        </Link>
        <p className="text-xs text-muted mt-1">OLG Analysis Platform</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href
                ? "bg-accent-blue/20 text-accent-blue"
                : "text-muted hover:text-foreground hover:bg-card-bg"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider">
            Games
          </p>
        </div>

        {GAMES.map((game) => (
          <div key={game.slug}>
            <Link
              href={`/games/${game.slug}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeGame?.slug === game.slug
                  ? "bg-accent-gold/10 text-accent-gold"
                  : "text-muted hover:text-foreground hover:bg-card-bg"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-accent-green" />
              {game.name}
            </Link>

            {activeGame?.slug === game.slug && (
              <div className="ml-4 mt-1 space-y-0.5">
                <Link
                  href={`/games/${game.slug}/history`}
                  className={`block px-3 py-1.5 rounded text-xs transition-colors ${
                    pathname.includes("/history")
                      ? "text-accent-blue"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Draw History
                </Link>
                <Link
                  href={`/games/${game.slug}/analysis`}
                  className={`block px-3 py-1.5 rounded text-xs transition-colors ${
                    pathname.includes("/analysis") &&
                    !STRATEGIES.some((s) => pathname.endsWith(s.slug))
                      ? "text-accent-blue"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Analysis Dashboard
                </Link>
                {STRATEGIES.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/games/${game.slug}/analysis/${s.slug}`}
                    className={`block px-3 py-1.5 rounded text-xs transition-colors pl-6 ${
                      pathname.endsWith(s.slug)
                        ? "text-accent-blue"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </Link>
                ))}
                <Link
                  href={`/games/${game.slug}/generator`}
                  className={`block px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    pathname.includes("/generator")
                      ? "text-accent-gold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Number Generator
                </Link>
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-card-border">
        <p className="text-[10px] text-muted leading-tight">
          Disclaimer: For entertainment and educational purposes only. No
          strategy can guarantee winning numbers.
        </p>
      </div>
    </aside>
  );
}
