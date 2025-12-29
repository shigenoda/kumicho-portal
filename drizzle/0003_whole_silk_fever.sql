CREATE TABLE `resident_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` varchar(50) NOT NULL,
	`email` varchar(320) NOT NULL,
	`registeredBy` int NOT NULL,
	`registeredAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resident_emails_id` PRIMARY KEY(`id`)
);
