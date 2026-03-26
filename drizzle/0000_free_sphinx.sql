CREATE TABLE `analysis_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`strategy_key` text NOT NULL,
	`window_size` integer,
	`result_data` text NOT NULL,
	`draws_hash` text,
	`computed_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_analysis_cache_lookup` ON `analysis_cache` (`game_id`,`strategy_key`,`window_size`);--> statement-breakpoint
CREATE TABLE `draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`draw_date` text NOT NULL,
	`draw_number` text,
	`numbers` text NOT NULL,
	`bonus_number` integer,
	`encore` text,
	`jackpot_amount` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_draws_game_date_number` ON `draws` (`game_id`,`draw_date`,`draw_number`);--> statement-breakpoint
CREATE INDEX `idx_draws_game_date` ON `draws` (`game_id`,`draw_date`);--> statement-breakpoint
CREATE INDEX `idx_draws_game_id` ON `draws` (`game_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`pick_count` integer NOT NULL,
	`number_range` integer NOT NULL,
	`has_bonus` integer DEFAULT false,
	`bonus_range` integer,
	`draw_days` text,
	`ticket_price` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_slug_unique` ON `games` (`slug`);--> statement-breakpoint
CREATE TABLE `saved_selections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`name` text,
	`numbers` text NOT NULL,
	`strategy_scores` text,
	`composite_score` real,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`sync_type` text NOT NULL,
	`draws_added` integer DEFAULT 0,
	`last_draw_date` text,
	`status` text DEFAULT 'success',
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sync_log_game` ON `sync_log` (`game_id`,`created_at`);