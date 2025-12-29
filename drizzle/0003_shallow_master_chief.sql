CREATE TABLE `inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` varchar(50) NOT NULL,
	`year` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` enum('participation','opinion','repair','other') NOT NULL DEFAULT 'other',
	`status` enum('pending','replied','closed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inquiry_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inquiryId` int NOT NULL,
	`repliedByHouseholdId` varchar(50) NOT NULL,
	`replyContent` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inquiry_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inquiry_replies` ADD CONSTRAINT `inquiry_replies_inquiryId_inquiries_id_fk` FOREIGN KEY (`inquiryId`) REFERENCES `inquiries`(`id`) ON DELETE cascade ON UPDATE no action;