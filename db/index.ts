import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const hostname = new URL(databaseUrl).hostname;
const isLocalDatabase = hostname === "localhost" || hostname === "127.0.0.1";

// Supabase's transaction pooler does not support prepared statements. Keeping
// the pool at one connection also prevents each serverless instance from
// exhausting the project's connection limit.
const client = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  ssl: isLocalDatabase ? false : "require",
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
