CREATE TABLE `attendance_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`householdId` varchar(50) NOT NULL,
	`response` enum('attend','absent','undecided') NOT NULL,
	`respondentName` varchar(100),
	`notes` text,
	`respondedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `edit_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('create','update','delete') NOT NULL,
	`previousValue` json,
	`newValue` json,
	`changedBy` int,
	`changedByName` varchar(100),
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	CONSTRAINT `edit_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `household_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` varchar(50) NOT NULL,
	`email` varchar(320) NOT NULL,
	`isVerified` boolean NOT NULL DEFAULT false,
	`verificationToken` varchar(100),
	`notificationEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `household_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `household_emails_householdId_unique` UNIQUE(`householdId`)
);
--> statement-breakpoint
CREATE TABLE `reminder_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`householdId` varchar(50) NOT NULL,
	`email` varchar(320) NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('sent','failed','bounced') NOT NULL DEFAULT 'sent',
	`errorMessage` text,
	CONSTRAINT `reminder_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `river_cleaning_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`year` int NOT NULL,
	`scheduledDate` timestamp NOT NULL,
	`deadline` timestamp NOT NULL,
	`description` text,
	`status` enum('draft','open','closed','completed') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `river_cleaning_events_id` PRIMARY KEY(`id`)
);
