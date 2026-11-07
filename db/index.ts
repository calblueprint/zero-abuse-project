import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as relations from "./relations";
import * as tables from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add the server-only PostgreSQL connection URI from Supabase's Connect panel; SUPABASE_URL is an HTTP API URL and cannot replace it.",
  );
}

const hostname = new URL(databaseUrl).hostname;
const isLocalDatabase = hostname === "localhost" || hostname === "127.0.0.1";

const client = new Pool({
  connectionString: databaseUrl,
  max: 1,
  // Queue commands on each connection; transaction poolers do not support pipelining.
  pipeline: false,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
  // Preserve the existing encrypted, non-verifying ssl: "require" behavior.
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
});

client.on("error", error => {
  console.error("Idle database connection failed", error);
});

export const db = drizzle(client, {
  schema: {
    ...tables,
    ...relations,
  },
});

export type Database = typeof db;
