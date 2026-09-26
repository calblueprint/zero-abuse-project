import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js keeps local secrets in .env.local. The second call also supports a
// regular .env file in CI or other environments without overwriting values.
config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy example.env to .env.local and add your Supabase connection string.",
  );
}

// Drizzle Kit introspection currently fails against Supabase's transaction
// pooler. Use the same shared pooler in session mode for schema operations.
const migrationUrl = new URL(databaseUrl);

if (migrationUrl.port === "6543") {
  migrationUrl.port = "5432";
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["public"],
  introspect: {
    casing: "camel",
  },
  dbCredentials: {
    url: migrationUrl.toString(),
  },
  strict: true,
  verbose: true,
});
