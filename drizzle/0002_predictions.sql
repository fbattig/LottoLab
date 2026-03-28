CREATE TABLE `predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL REFERENCES `games`(`id`),
	`numbers` text NOT NULL,
	`rationale` text,
	`score` real,
	`draws_analyzed` integer,
	`for_draw_date` text,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_predictions_game_date` ON `predictions` (`game_id`, `created_at`);
