ALTER TABLE "users" ALTER COLUMN "is_admin" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_admin" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "approval_status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "approval_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar;--> statement-breakpoint
UPDATE "users" AS profile
SET "email" = lower(trim(auth_user.email))
FROM auth.users AS auth_user
WHERE auth_user.id = profile.user_id;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "approval_decided_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "approval_decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approval_decided_by_fkey" FOREIGN KEY ("approval_decided_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;
