import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as relations from "./relations";
import * as tables from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add the server-only PostgreSQL connection URI from Supabase's Connect panel; SUPABASE_URL is an HTTP API URL and cannot replace it.",
  );
}

const connectionUrl = new URL(databaseUrl);
const hostname = connectionUrl.hostname;
const isLocalDatabase = hostname === "localhost" || hostname === "127.0.0.1";

// Postgres.js pipelining is incompatible with Supabase's shared transaction pooler.
if (
  hostname.endsWith(".pooler.supabase.com") &&
  connectionUrl.port === "6543"
) {
  connectionUrl.port = "5432";
}

const client = postgres(connectionUrl.toString(), {
  max: 1,
  prepare: false,
  idle_timeout: 5,
  connect_timeout: 10,
  ssl: isLocalDatabase ? false : "require",
});

export const db = drizzle(client, {
  schema: {
    ...tables,
    ...relations,
  },
});

export type Database = typeof db;
