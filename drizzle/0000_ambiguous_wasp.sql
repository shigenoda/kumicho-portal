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
ALTER TABLE `faq` ADD `isHypothesis` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `isHypothesis` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `rules` ADD `isHypothesis` boolean DEFAULT false NOT NULL;