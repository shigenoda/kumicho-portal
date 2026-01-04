ALTER TABLE "users" ALTER COLUMN "openId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "passwordHash" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");