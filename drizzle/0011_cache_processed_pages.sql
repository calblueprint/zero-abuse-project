CREATE TABLE "processed_pages" (
	"source_url" text PRIMARY KEY NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"assessment_key" varchar(64) NOT NULL,
	"relevance" varchar NOT NULL,
	"relevance_reason" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_pages_relevance_check" CHECK ("processed_pages"."relevance" IN ('relevant', 'irrelevant'))
);
--> statement-breakpoint
ALTER TABLE "processed_pages" ENABLE ROW LEVEL SECURITY;