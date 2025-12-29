CREATE TABLE `exemption_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` varchar(50) NOT NULL,
	`exemptionTypeCode` varchar(10) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`reviewDate` timestamp,
	`status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exemption_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exemption_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`autoApply` boolean NOT NULL DEFAULT false,
	`durationMonths` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exemption_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `exemption_types_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `leader_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` varchar(50) NOT NULL,
	`year` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leader_history_id` PRIMARY KEY(`id`)
);
