CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`details` text,
	`ipAddress` varchar(45),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `data_classification` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`classification` enum('public','internal','confidential') NOT NULL DEFAULT 'public',
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_classification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`date` timestamp NOT NULL,
	`category` varchar(100) NOT NULL,
	`checklist` json NOT NULL,
	`notes` text,
	`attachments` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exemption_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` varchar(50) NOT NULL,
	`year` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`reason` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exemption_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faq` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` varchar(500) NOT NULL,
	`answer` text NOT NULL,
	`relatedRuleIds` json NOT NULL,
	`relatedPostIds` json NOT NULL,
	`isHypothesis` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faq_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `handover_bag_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`location` varchar(255) NOT NULL,
	`isChecked` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handover_bag_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` varchar(50) NOT NULL,
	`moveInDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `households_id` PRIMARY KEY(`id`),
	CONSTRAINT `households_householdId_unique` UNIQUE(`householdId`)
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
	`tags` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leader_rotation_logic` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`logic` json NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leader_rotation_logic_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leader_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`primaryHouseholdId` varchar(50) NOT NULL,
	`backupHouseholdId` varchar(50) NOT NULL,
	`status` enum('draft','conditional','confirmed') NOT NULL DEFAULT 'draft',
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leader_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member_top_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`weekStartDate` timestamp NOT NULL,
	`thisWeekTasks` json NOT NULL,
	`topPriorities` json NOT NULL,
	`unresolvedIssues` json NOT NULL,
	`pendingReplies` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_top_summary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pending_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`toWhom` varchar(100) NOT NULL,
	`status` enum('pending','resolved','transferred') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`transferredToNextYear` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pending_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`tags` json NOT NULL,
	`year` int NOT NULL,
	`category` enum('inquiry','answer','decision','pending','trouble','improvement') NOT NULL,
	`status` enum('draft','pending','published') NOT NULL DEFAULT 'draft',
	`authorId` int NOT NULL,
	`authorRole` enum('editor','admin') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	`relatedLinks` json NOT NULL,
	`isHypothesis` boolean NOT NULL DEFAULT false,
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
	`attachments` json NOT NULL,
	`linkedInventoryIds` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `river_cleaning_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rule_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`details` text NOT NULL,
	`reason` text,
	`changedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rule_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('decided','pending') NOT NULL DEFAULT 'decided',
	`summary` text NOT NULL,
	`details` text NOT NULL,
	`evidenceLinks` json NOT NULL,
	`isHypothesis` boolean NOT NULL DEFAULT false,
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
	`tags` json NOT NULL,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('public','member','editor','admin') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `vault_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(100) NOT NULL,
	`key` varchar(255) NOT NULL,
	`maskedValue` varchar(500) NOT NULL,
	`actualValue` text NOT NULL,
	`classification` enum('internal','confidential') NOT NULL DEFAULT 'confidential',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vault_entries_id` PRIMARY KEY(`id`)
);
