CREATE TABLE "item_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"raw_extracted" jsonb NOT NULL,
	"country_code" text,
	"state_code" text,
	"county_fips" text,
	"county_name" text,
	"city" text,
	"regions" text[] DEFAULT '{}'::text[] NOT NULL,
	"resolution_status" text NOT NULL,
	CONSTRAINT "item_locations_status_check" CHECK ("item_locations"."resolution_status" IN ('resolved', 'partial', 'ambiguous', 'unmatched', 'conflict')),
	CONSTRAINT "item_locations_country_code_check" CHECK ("item_locations"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "item_locations_state_code_check" CHECK ("item_locations"."state_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "item_locations_county_fips_check" CHECK ("item_locations"."county_fips" ~ '^[0-9]{5}$')
);
--> statement-breakpoint
ALTER TABLE "item_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "item_locations" ADD CONSTRAINT "item_locations_item_id_itel_items_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."itel_items"("item_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_locations_item_id_idx" ON "item_locations" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_locations_country_state_idx" ON "item_locations" USING btree ("country_code","state_code");--> statement-breakpoint
CREATE INDEX "item_locations_county_fips_idx" ON "item_locations" USING btree ("county_fips");--> statement-breakpoint
CREATE INDEX "item_locations_city_idx" ON "item_locations" USING btree ("state_code","city");