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

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
