ALTER TABLE "trends" ALTER COLUMN "item_ids" SET DATA TYPE uuid[] USING CASE WHEN "item_ids" IS NULL THEN NULL ELSE ARRAY["item_ids"] END;--> statement-breakpoint
ALTER TABLE "trends" ADD COLUMN "title" varchar NOT NULL;
