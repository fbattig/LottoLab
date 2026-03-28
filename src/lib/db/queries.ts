import { db } from "./index";
import { games, draws } from "./schema";
import { eq, desc, asc } from "drizzle-orm";
import { ensureDb } from "./migrate";
import type { AnalysisConfig } from "@/lib/analysis/types";

export function getGame(slug: string) {
  ensureDb();
  return db.select().from(games).where(eq(games.slug, slug)).get();
}

export function getDraws(gameId: number, limit?: number) {
  ensureDb();
  let query = db
    .select()
    .from(draws)
    .where(eq(draws.gameId, gameId))
    .orderBy(desc(draws.drawDate));

  if (limit) {
    return query.limit(limit).all();
  }
  return query.all();
}

export function getParsedDraws(gameId: number, windowSize?: number) {
  const rawDraws = getDraws(gameId, windowSize);
  return rawDraws.map((d) => ({
    ...d,
    numbers: JSON.parse(d.numbers) as number[],
  }));
}

export function getOrderedDraws(gameId: number, limit?: number) {
  ensureDb();
  const query = db
    .select()
    .from(draws)
    .where(eq(draws.gameId, gameId))
    .orderBy(desc(draws.drawDate), asc(draws.drawNumber));

  if (limit) {
    return query.limit(limit).all();
  }
  return query.all();
}

export function getOrderedParsedDraws(gameId: number, limit?: number) {
  const rawDraws = getOrderedDraws(gameId, limit);
  return rawDraws.map((d) => ({
    ...d,
    numbers: JSON.parse(d.numbers) as number[],
  }));
}

export function buildAnalysisConfig(
  game: { id: number; slug: string; pickCount: number; numberRange: number; minNumber: number | null; allowDuplicates: boolean | null },
  windowSize: number
): AnalysisConfig {
  return {
    gameId: game.id,
    gameSlug: game.slug,
    pickCount: game.pickCount,
    numberRange: game.numberRange,
    minNumber: game.minNumber ?? 1,
    allowDuplicates: game.allowDuplicates ?? false,
    windowSize,
  };
}
