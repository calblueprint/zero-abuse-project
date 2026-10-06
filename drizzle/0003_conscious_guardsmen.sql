UPDATE "users"
SET "approval_status" = CASE
	WHEN "is_admin" IS TRUE THEN 'approved'
	ELSE 'pending'
END
WHERE "approval_status" IS NULL
	OR "approval_status" NOT IN ('pending', 'approved', 'rejected');--> statement-breakpoint
UPDATE "users" SET "is_admin" = false WHERE "is_admin" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approval_status_check" CHECK ("users"."approval_status" IN ('pending', 'approved', 'rejected'));
