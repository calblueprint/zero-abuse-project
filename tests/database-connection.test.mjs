import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { Client } from "pg";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("../db/index.ts", import.meta.url), "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  },
).outputText;

function connection(databaseUrl) {
  let options;
  const handlers = new Map();
  runInNewContext(source, {
    exports: {},
    URL,
    console,
    process: { env: { DATABASE_URL: databaseUrl } },
    require(name) {
      if (name === "pg")
        return {
          Pool: class {
            constructor(config) {
              options = config;
            }
            on(event, listener) {
              handlers.set(event, listener);
            }
          },
        };
      if (name === "drizzle-orm/node-postgres") return { drizzle: () => ({}) };
      if (["server-only", "./schema", "./relations"].includes(name)) return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { options, handlers };
}

test("configured connection URI is preserved for transaction, session, and custom endpoints", () => {
  for (const url of [
    "postgres://postgres.test:p%40ss@aws-0-test.pooler.supabase.com:6543/postgres?application_name=test",
    "postgres://u:p@aws-0-test.pooler.supabase.com:5432/db",
    "postgres://u:p@database.example.com:6543/db",
  ]) {
    const { options, handlers } = connection(url);
    assert.equal(options.connectionString, url);
    assert.equal(options.max, 1);
    assert.equal(options.idleTimeoutMillis, 5000);
    assert.equal(options.connectionTimeoutMillis, 10000);
    assert.equal(options.ssl.rejectUnauthorized, false);
    assert.equal(typeof handlers.get("error"), "function");
  }
});

test("driver queues concurrent commands instead of pipelining them", () => {
  const { options } = connection("postgres://u:p@database.example.com:6543/db");
  assert.equal(options.pipeline, false);
  assert.equal(new Client(options).pipeline, false);
});

test("local databases retain non-TLS support and missing configuration fails early", () => {
  assert.equal(
    connection("postgres://u:p@localhost:5432/db").options.ssl,
    false,
  );
  assert.throws(() => connection(undefined), /DATABASE_URL is not set/);
});
