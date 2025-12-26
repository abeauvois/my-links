-- Add current_step and item_progress columns to ingest_jobs table
-- These columns support real-time item-level progress tracking

ALTER TABLE "ingest_jobs" ADD COLUMN "current_step" varchar(50);
--> statement-breakpoint
ALTER TABLE "ingest_jobs" ADD COLUMN "item_progress" jsonb;
