CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`translation_group` text NOT NULL,
	`locale` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`deck` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`category` text DEFAULT 'Essay' NOT NULL,
	`author` text DEFAULT 'Azad Journal' NOT NULL,
	`cover_key` text,
	`cover_tone` text DEFAULT 'sage' NOT NULL,
	`issue` text DEFAULT '01' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `articles_locale_status_date_idx` ON `articles` (`locale`,`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `articles_translation_group_idx` ON `articles` (`translation_group`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`parent_id` text,
	`author_hash` text NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `comments_article_status_date_idx` ON `comments` (`article_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_author_date_idx` ON `comments` (`author_hash`,`created_at`);