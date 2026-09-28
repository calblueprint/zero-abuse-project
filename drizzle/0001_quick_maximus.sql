ALTER TABLE "users" RENAME COLUMN "name" TO "first_name";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "affiliation" TO "organization";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;