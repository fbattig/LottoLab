import { db } from "./index";
import { games } from "./schema";
import { eq } from "drizzle-orm";

const SEED_GAMES = [
  {
    slug: "lotto-649",
    name: "Lotto 6/49",
    pickCount: 6,
    numberRange: 49,
    hasBonus: true,
    bonusRange: 49,
    drawDays: '["Wed","Sat"]',
    ticketPrice: 3.0,
  },
  {
    slug: "lotto-max",
    name: "Lotto Max",
    pickCount: 7,
    numberRange: 50,
    hasBonus: true,
    bonusRange: 50,
    drawDays: '["Tue","Fri"]',
    ticketPrice: 5.0,
  },
  {
    slug: "ontario-49",
    name: "Ontario 49",
    pickCount: 6,
    numberRange: 49,
    hasBonus: true,
    bonusRange: 49,
    drawDays: '["Wed","Sat"]',
    ticketPrice: 1.0,
  },
];

export function seedGames() {
  for (const game of SEED_GAMES) {
    const existing = db
      .select()
      .from(games)
      .where(eq(games.slug, game.slug))
      .get();
    if (!existing) {
      db.insert(games).values(game).run();
    }
  }
}
