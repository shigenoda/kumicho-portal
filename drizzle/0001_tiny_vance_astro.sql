CREATE TABLE `changelog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`summary` varchar(255) NOT NULL,
	`date` timestamp NOT NULL DEFAULT (now()),
	`authorId` int NOT NULL,
	`authorRole` enum('member','editor','admin') NOT NULL,
	`relatedEntityType` varchar(100) NOT NULL,
	`relatedEntityId` int,
	CONSTRAINT `changelog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`date` timestamp NOT NULL,
	`category` varchar(100) NOT NULL,
	`checklist` json NOT NULL DEFAULT ('[]'),
	`notes` text,
	`attachments` json NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faq` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` varchar(500) NOT NULL,
	`answer` text NOT NULL,
	`relatedRuleIds` json NOT NULL DEFAULT ('[]'),
	`relatedPostIds` json NOT NULL DEFAULT ('[]'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faq_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`photo` varchar(500),
	`qty` int NOT NULL DEFAULT 0,
	`location` varchar(255) NOT NULL,
	`condition` varchar(100),
	`lastCheckedAt` timestamp,
	`notes` text,
	`tags` json NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`tags` json NOT NULL DEFAULT ('[]'),
	`year` int NOT NULL,
	`category` enum('inquiry','answer','decision','pending','trouble','improvement') NOT NULL,
	`status` enum('draft','pending','published') NOT NULL DEFAULT 'draft',
	`authorId` int NOT NULL,
	`authorRole` enum('editor','admin') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	`relatedLinks` json NOT NULL DEFAULT ('[]'),
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `river_cleaning_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`participantsCount` int,
	`issues` text,
	`whatWorked` text,
	`whatToImprove` text,
	`attachments` json NOT NULL DEFAULT ('[]'),
	`linkedInventoryIds` json NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `river_cleaning_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('decided','pending') NOT NULL DEFAULT 'decided',
	`summary` text NOT NULL,
	`details` text NOT NULL,
	`evidenceLinks` json NOT NULL DEFAULT ('[]'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `secret_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `secret_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`category` varchar(100) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`tags` json NOT NULL DEFAULT ('[]'),
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('public','member','editor','admin') NOT NULL DEFAULT 'member';