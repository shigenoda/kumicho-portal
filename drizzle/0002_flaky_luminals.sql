ALTER TABLE `events` MODIFY COLUMN `checklist` json NOT NULL;--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `attachments` json NOT NULL;--> statement-breakpoint
ALTER TABLE `faq` MODIFY COLUMN `relatedRuleIds` json NOT NULL;--> statement-breakpoint
ALTER TABLE `faq` MODIFY COLUMN `relatedPostIds` json NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory` MODIFY COLUMN `tags` json NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `tags` json NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `relatedLinks` json NOT NULL;--> statement-breakpoint
ALTER TABLE `river_cleaning_runs` MODIFY COLUMN `attachments` json NOT NULL;--> statement-breakpoint
ALTER TABLE `river_cleaning_runs` MODIFY COLUMN `linkedInventoryIds` json NOT NULL;--> statement-breakpoint
ALTER TABLE `rules` MODIFY COLUMN `evidenceLinks` json NOT NULL;--> statement-breakpoint
ALTER TABLE `templates` MODIFY COLUMN `tags` json NOT NULL;