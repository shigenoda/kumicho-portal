CREATE TABLE `form_choices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`choiceText` varchar(255) NOT NULL,
	`orderIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `form_choices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `form_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formId` int NOT NULL,
	`questionText` varchar(500) NOT NULL,
	`questionType` enum('single_choice','multiple_choice') NOT NULL DEFAULT 'single_choice',
	`required` boolean NOT NULL DEFAULT true,
	`orderIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `form_response_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`responseId` int NOT NULL,
	`questionId` int NOT NULL,
	`choiceId` int,
	`textAnswer` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `form_response_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `form_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formId` int NOT NULL,
	`userId` int NOT NULL,
	`householdId` varchar(50) NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`createdBy` int NOT NULL,
	`dueDate` timestamp,
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forms_id` PRIMARY KEY(`id`)
);
