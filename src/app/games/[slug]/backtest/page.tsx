import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/migrate";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import BacktestAccordion from "@/components/ui/BacktestAccordion";
import Disclaimer from "@/components/ui/Disclaimer";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BacktestPage({ params }: Props) {
  const { slug } = await params;
  ensureDb();

  const game = db.select().from(games).where(eq(games.slug, slug)).get();
  if (!game) notFound();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Backtesting</h2>
        <p className="text-sm text-muted">
          {game.name} — simulate pick generation against past draws
        </p>
      </div>

      <BacktestAccordion
        gameSlug={slug}
        gameName={game.name}
        ticketPrice={game.ticketPrice ?? 1}
      />

      <Disclaimer />
    </div>
  );
}
