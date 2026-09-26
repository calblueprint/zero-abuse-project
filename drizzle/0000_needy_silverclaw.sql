-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "saved_groups" (
	"group_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"item_ids" uuid,
	"description" text,
	"notes" text,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "saved_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"affiliation" varchar,
	"is_admin" boolean,
	"approval_status" varchar,
	"recently_accessed" json
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trends" (
	"trend_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"emerged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signal_status" varchar,
	"evidence_status" varchar,
	"item_ids" uuid,
	"triggered_by" uuid,
	"reviewed_by" uuid,
	"description" text,
	"why_surfaced" text,
	"visibility" varchar,
	"pattern_type" varchar
);
--> statement-breakpoint
ALTER TABLE "trends" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trend_metrics" (
	"trend_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_name" varchar NOT NULL,
	"metric_value" varchar,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "trend_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "itel_items" (
	"item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"source_url" varchar NOT NULL,
	"published_at" timestamp with time zone,
	"added_at" timestamp with time zone,
	"edited_at" timestamp with time zone,
	"title" varchar,
	"tldr" text,
	"embeddings" json,
	"exploitation_type" varchar,
	"platform" varchar,
	"technology" varchar,
	"affected_population" varchar,
	"offender_tactic" varchar,
	"geography" varchar,
	"intel_type" varchar,
	"zap_relevance" varchar
);
--> statement-breakpoint
ALTER TABLE "itel_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sources" (
	"source_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"tier" varchar,
	"type" varchar,
	"base_url" varchar,
	"is_active" boolean,
	"last_crawled_at" timestamp with time zone,
	"added_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saved_groups" ADD CONSTRAINT "saved_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trends" ADD CONSTRAINT "trends_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trends" ADD CONSTRAINT "trends_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_metrics" ADD CONSTRAINT "trend_metrics_trend_id_fkey" FOREIGN KEY ("trend_id") REFERENCES "public"."trends"("trend_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itel_items" ADD CONSTRAINT "itel_items_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("source_id") ON DELETE no action ON UPDATE no action;
*/