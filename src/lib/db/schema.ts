import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  pickCount: integer("pick_count").notNull(),
  numberRange: integer("number_range").notNull(),
  hasBonus: integer("has_bonus", { mode: "boolean" }).default(false),
  bonusRange: integer("bonus_range"),
  drawDays: text("draw_days"),
  ticketPrice: real("ticket_price"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const draws = sqliteTable(
  "draws",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    drawDate: text("draw_date").notNull(),
    drawNumber: text("draw_number"),
    numbers: text("numbers").notNull(),
    bonusNumber: integer("bonus_number"),
    encore: text("encore"),
    jackpotAmount: real("jackpot_amount"),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("uq_draws_game_date_number").on(
      table.gameId,
      table.drawDate,
      table.drawNumber
    ),
    index("idx_draws_game_date").on(table.gameId, table.drawDate),
    index("idx_draws_game_id").on(table.gameId),
  ]
);

export const syncLog = sqliteTable(
  "sync_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    syncType: text("sync_type").notNull(),
    drawsAdded: integer("draws_added").default(0),
    lastDrawDate: text("last_draw_date"),
    status: text("status").default("success"),
    errorMessage: text("error_message"),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_sync_log_game").on(table.gameId, table.createdAt),
  ]
);

export const savedSelections = sqliteTable("saved_selections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id),
  name: text("name"),
  numbers: text("numbers").notNull(),
  strategyScores: text("strategy_scores"),
  compositeScore: real("composite_score"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const analysisCache = sqliteTable(
  "analysis_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    strategyKey: text("strategy_key").notNull(),
    windowSize: integer("window_size"),
    resultData: text("result_data").notNull(),
    drawsHash: text("draws_hash"),
    computedAt: text("computed_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("uq_analysis_cache_lookup").on(
      table.gameId,
      table.strategyKey,
      table.windowSize
    ),
  ]
);
