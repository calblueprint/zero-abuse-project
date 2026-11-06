ALTER TABLE "sources" ALTER COLUMN "is_active" SET DEFAULT true;--> statement-breakpoint
UPDATE "sources" SET "is_active" = true WHERE "is_active" IS NULL;--> statement-breakpoint
ALTER TABLE "sources" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "added_by" uuid;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;