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
  {
    slug: "daily-grand",
    name: "Daily Grand",
    pickCount: 5,
    numberRange: 49,
    hasBonus: true,
    bonusRange: 7,
    drawDays: '["Mon","Thu"]',
    ticketPrice: 3.0,
  },
  {
    slug: "lottario",
    name: "Lottario",
    pickCount: 6,
    numberRange: 45,
    hasBonus: true,
    bonusRange: 45,
    drawDays: '["Sat"]',
    ticketPrice: 1.0,
  },
  {
    slug: "pick-2",
    name: "Pick-2",
    pickCount: 2,
    numberRange: 9,
    minNumber: 0,
    allowDuplicates: true,
    drawDays: '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
    ticketPrice: 1.0,
  },
  {
    slug: "pick-3",
    name: "Pick-3",
    pickCount: 3,
    numberRange: 9,
    minNumber: 0,
    allowDuplicates: true,
    drawDays: '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
    ticketPrice: 1.0,
  },
  {
    slug: "pick-4",
    name: "Pick-4",
    pickCount: 4,
    numberRange: 9,
    minNumber: 0,
    allowDuplicates: true,
    drawDays: '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
    ticketPrice: 1.0,
  },
  {
    slug: "daily-keno",
    name: "Daily Keno",
    pickCount: 20,
    numberRange: 70,
    drawDays: '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
    ticketPrice: 2.0,
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
