import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";
import { seedGames } from "./seed";
import path from "path";

let migrated = false;

export function ensureDb() {
  if (migrated) return;
  migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  seedGames();
  migrated = true;
}
