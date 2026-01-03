CREATE TYPE "public"."author_role" AS ENUM('member', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('inquiry', 'answer', 'decision', 'pending', 'trouble', 'improvement');--> statement-breakpoint
CREATE TYPE "public"."classification" AS ENUM('public', 'internal', 'confidential');--> statement-breakpoint
CREATE TYPE "public"."exemption_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."pending_status" AS ENUM('pending', 'resolved', 'transferred');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('single_choice', 'multiple_choice');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('public', 'member', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'conditional', 'confirmed', 'pending', 'published', 'decided', 'active', 'closed');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"entityType" varchar(100) NOT NULL,
	"entityId" integer NOT NULL,
	"details" text,
	"ipAddress" varchar(45),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog" (
	"id" serial PRIMARY KEY NOT NULL,
	"summary" varchar(255) NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"authorId" integer NOT NULL,
	"authorRole" "author_role" NOT NULL,
	"relatedEntityType" varchar(100) NOT NULL,
	"relatedEntityId" integer
);
--> statement-breakpoint
CREATE TABLE "data_classification" (
	"id" serial PRIMARY KEY NOT NULL,
	"entityType" varchar(100) NOT NULL,
	"entityId" integer NOT NULL,
	"classification" "classification" DEFAULT 'public' NOT NULL,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"date" timestamp NOT NULL,
	"category" varchar(100) NOT NULL,
	"checklist" jsonb NOT NULL,
	"notes" text,
	"attachments" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exemption_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"householdId" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"reason" text,
	"status" "exemption_status" DEFAULT 'pending' NOT NULL,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" varchar(500) NOT NULL,
	"answer" text NOT NULL,
	"relatedRuleIds" jsonb NOT NULL,
	"relatedPostIds" jsonb NOT NULL,
	"isHypothesis" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_choices" (
	"id" serial PRIMARY KEY NOT NULL,
	"questionId" integer NOT NULL,
	"choiceText" varchar(255) NOT NULL,
	"orderIndex" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"formId" integer NOT NULL,
	"questionText" varchar(500) NOT NULL,
	"questionType" "question_type" DEFAULT 'single_choice' NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"orderIndex" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_response_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"responseId" integer NOT NULL,
	"questionId" integer NOT NULL,
	"choiceId" integer,
	"textAnswer" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"formId" integer NOT NULL,
	"userId" integer NOT NULL,
	"householdId" varchar(50) NOT NULL,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"createdBy" integer NOT NULL,
	"dueDate" timestamp,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handover_bag_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"location" varchar(255) NOT NULL,
	"isChecked" boolean DEFAULT false NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" serial PRIMARY KEY NOT NULL,
	"householdId" varchar(50) NOT NULL,
	"moveInDate" timestamp,
	"leaderHistoryCount" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "households_householdId_unique" UNIQUE("householdId")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"photo" varchar(500),
	"qty" integer DEFAULT 0 NOT NULL,
	"location" varchar(255) NOT NULL,
	"condition" varchar(100),
	"lastCheckedAt" timestamp,
	"notes" text,
	"tags" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leader_rotation_logic" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"logic" jsonb NOT NULL,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leader_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"primaryHouseholdId" varchar(50) NOT NULL,
	"backupHouseholdId" varchar(50) NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_top_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"weekStartDate" timestamp NOT NULL,
	"thisWeekTasks" jsonb NOT NULL,
	"topPriorities" jsonb NOT NULL,
	"unresolvedIssues" jsonb NOT NULL,
	"pendingReplies" jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"toWhom" varchar(100) NOT NULL,
	"status" "pending_status" DEFAULT 'pending' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp,
	"transferredToNextYear" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"tags" jsonb NOT NULL,
	"year" integer NOT NULL,
	"category" "category" NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"authorId" integer NOT NULL,
	"authorRole" "author_role" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"publishedAt" timestamp,
	"relatedLinks" jsonb NOT NULL,
	"isHypothesis" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resident_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"householdId" varchar(50) NOT NULL,
	"email" varchar(320) NOT NULL,
	"registeredBy" integer NOT NULL,
	"registeredAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "river_cleaning_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"participantsCount" integer,
	"issues" text,
	"whatWorked" text,
	"whatToImprove" text,
	"attachments" jsonb NOT NULL,
	"linkedInventoryIds" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ruleId" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text NOT NULL,
	"details" text NOT NULL,
	"reason" text,
	"changedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'decided' NOT NULL,
	"summary" text NOT NULL,
	"details" text NOT NULL,
	"evidenceLinks" jsonb NOT NULL,
	"isHypothesis" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secret_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"tags" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"householdId" varchar(50),
	"role" "role" DEFAULT 'member' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "vault_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(100) NOT NULL,
	"key" varchar(255) NOT NULL,
	"maskedValue" varchar(500) NOT NULL,
	"actualValue" text NOT NULL,
	"classification" "classification" DEFAULT 'confidential' NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
