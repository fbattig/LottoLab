import { getGame, getParsedDraws } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import Disclaimer from "@/components/ui/Disclaimer";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AnalysisDashboardPage({ params }: Props) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();

  const draws = getParsedDraws(game.id, 20);
  const hasData = draws.length >= 10;

  const strategies = [
    {
      slug: "frequency",
      label: "Frequency Analysis",
      desc: "Identify hot, warm, and cold numbers based on how often they appear.",
      color: "accent-red",
    },
    {
      slug: "skip-hit",
      label: "Skip & Hit",
      desc: "Track games-out and find numbers that are overdue.",
      color: "accent-blue",
    },
    {
      slug: "sum-total",
      label: "Sum Total",
      desc: "Find the optimal sum range for winning combinations.",
      color: "accent-green",
    },
    {
      slug: "odd-even",
      label: "Odd/Even Balance",
      desc: "Analyze the distribution of odd vs even numbers.",
      color: "accent-gold",
    },
    {
      slug: "high-low",
      label: "High/Low Balance",
      desc: "Analyze the distribution of high vs low numbers.",
      color: "accent-blue",
    },
    {
      slug: "groups",
      label: "Number Groups",
      desc: "Track which decade groups are hot or cold.",
      color: "accent-green",
    },
    {
      slug: "last-digit",
      label: "Last Digit",
      desc: "Analyze last digit patterns for diversity.",
      color: "accent-red",
    },
    {
      slug: "consecutive",
      label: "Consecutive Numbers",
      desc: "Track how often consecutive pairs appear.",
      color: "accent-gold",
    },
    {
      slug: "positional",
      label: "Positional Tracking",
      desc: "Find the best numbers for each sorted position.",
      color: "accent-blue",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{game.name} — Analysis</h2>
        <p className="text-sm text-muted mt-1">
          {draws.length} draws loaded
          {!hasData && " — sync at least 10 draws for analysis"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {strategies.map((s) => (
          <Link
            key={s.slug}
            href={`/games/${slug}/analysis/${s.slug}`}
            className={`p-5 rounded-xl bg-card-bg border border-card-border hover:border-${s.color}/40 transition-colors group`}
          >
            <h3 className={`font-semibold text-${s.color} group-hover:underline`}>
              {s.label}
            </h3>
            <p className="text-xs text-muted mt-2">{s.desc}</p>
          </Link>
        ))}
      </div>

      <Link
        href={`/games/${slug}/generator`}
        className="block p-5 rounded-xl bg-accent-gold/10 border border-accent-gold/30 hover:border-accent-gold/60 transition-colors text-center"
      >
        <h3 className="text-lg font-bold text-accent-gold">
          Number Generator — Combined Filter
        </h3>
        <p className="text-sm text-muted mt-1">
          Apply all strategies as a cascading filter to generate recommended combinations
        </p>
      </Link>

      <Disclaimer />
    </div>
  );
}
