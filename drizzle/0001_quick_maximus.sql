DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'users'
			AND column_name = 'name'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'users'
			AND column_name = 'first_name'
	) THEN
		ALTER TABLE "users" RENAME COLUMN "name" TO "first_name";
	END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'users'
			AND column_name = 'affiliation'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'users'
			AND column_name = 'organization'
	) THEN
		ALTER TABLE "users" RENAME COLUMN "affiliation" TO "organization";
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" varchar;--> statement-breakpoint
UPDATE "users" SET "last_name" = '' WHERE "last_name" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_complete" boolean;--> statement-breakpoint
UPDATE "users"
SET "onboarding_complete" = false
WHERE "onboarding_complete" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "onboarding_complete" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "onboarding_complete" SET NOT NULL;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'users_user_id_users_id_fk'
			AND conrelid = 'public.users'::regclass
	) THEN
		ALTER TABLE "users"
			ADD CONSTRAINT "users_user_id_users_id_fk"
			FOREIGN KEY ("user_id")
			REFERENCES "auth"."users"("id")
			ON DELETE cascade
			ON UPDATE no action
			NOT VALID;
	END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM public.users AS profile
		LEFT JOIN auth.users AS auth_user ON auth_user.id = profile.user_id
		WHERE auth_user.id IS NULL
	) THEN
		ALTER TABLE "users"
			VALIDATE CONSTRAINT "users_user_id_users_id_fk";
	END IF;
END $$;
