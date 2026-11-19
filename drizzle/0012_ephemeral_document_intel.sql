ALTER TABLE "itel_items" ALTER COLUMN "source_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "itel_items" ADD COLUMN "upload_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "itel_items" ADD COLUMN "upload_filename" varchar;--> statement-breakpoint
ALTER TABLE "itel_items" ADD CONSTRAINT "itel_items_upload_hash_unique" UNIQUE("upload_hash");