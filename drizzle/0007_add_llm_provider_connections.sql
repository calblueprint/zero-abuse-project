CREATE TABLE "llm_provider_connections" (
	"connection_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_type" varchar NOT NULL,
	"base_url" varchar NOT NULL,
	"model_id" varchar NOT NULL,
	"encrypted_api_key" text,
	"api_key_hint" varchar,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"capabilities" json DEFAULT '{}'::json NOT NULL,
	"last_test_status" varchar DEFAULT 'untested' NOT NULL,
	"last_tested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "llm_provider_connections_provider_type_check" CHECK ("llm_provider_connections"."provider_type" IN ('openai', 'openrouter', 'ollama', 'lm_studio', 'openai_compatible')),
	CONSTRAINT "llm_provider_connections_test_status_check" CHECK ("llm_provider_connections"."last_test_status" IN ('untested', 'success', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "llm_provider_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "llm_provider_connections" ADD CONSTRAINT "llm_provider_connections_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "llm_provider_connections_user_id_idx" ON "llm_provider_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_provider_connections_one_default_per_user_idx" ON "llm_provider_connections" USING btree ("user_id") WHERE "llm_provider_connections"."is_default" = true;