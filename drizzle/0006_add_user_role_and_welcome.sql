ALTER TABLE "users" ADD COLUMN "role" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "welcome_seen_at" timestamp with time zone;--> statement-breakpoint
-- Users who were approved before the welcome page existed have already been
-- using the app, so mark the welcome page as seen for them.
UPDATE "users" SET "welcome_seen_at" = now()
WHERE "approval_status" = 'approved' AND "onboarding_complete" = true;
