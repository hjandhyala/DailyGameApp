CREATE TABLE `daily_active` (
	`day` text NOT NULL,
	`device_hash` text NOT NULL,
	PRIMARY KEY(`day`, `device_hash`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`hash` text PRIMARY KEY NOT NULL,
	`platform` text DEFAULT 'unknown' NOT NULL,
	`first_seen_day` text NOT NULL,
	`last_seen_day` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `devices_first_seen_idx` ON `devices` (`first_seen_day`);--> statement-breakpoint
CREATE TABLE `favorite_marks` (
	`game_id` text NOT NULL,
	`device_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`game_id`, `device_hash`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`host` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`icon_url` text,
	`category` text DEFAULT 'other' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`report_count` integer DEFAULT 0 NOT NULL,
	`favorite_count` integer DEFAULT 0 NOT NULL,
	`submitter_hash` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_slug_idx` ON `games` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `games_normalized_url_idx` ON `games` (`normalized_url`);--> statement-breakpoint
CREATE INDEX `games_status_idx` ON `games` (`status`);--> statement-breakpoint
CREATE TABLE `play_events` (
	`day` text NOT NULL,
	`device_hash` text NOT NULL,
	`game_id` text NOT NULL,
	PRIMARY KEY(`day`, `device_hash`, `game_id`)
);
--> statement-breakpoint
CREATE INDEX `play_events_game_idx` ON `play_events` (`game_id`,`day`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`reporter_hash` text NOT NULL,
	`reason` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_game_reporter_idx` ON `reports` (`game_id`,`reporter_hash`);--> statement-breakpoint
CREATE TABLE `sync_records` (
	`space_id` text NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`seq` integer NOT NULL,
	PRIMARY KEY(`space_id`, `kind`, `key`),
	FOREIGN KEY (`space_id`) REFERENCES `sync_spaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sync_records_seq_idx` ON `sync_records` (`space_id`,`seq`);--> statement-breakpoint
CREATE TABLE `sync_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`seq` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
