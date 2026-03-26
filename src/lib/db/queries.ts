import { db } from "./index";
import { games, draws } from "./schema";
import { eq, desc } from "drizzle-orm";
import { ensureDb } from "./migrate";

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
