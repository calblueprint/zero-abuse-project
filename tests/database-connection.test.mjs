import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("../db/index.ts", import.meta.url), "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  },
).outputText;

function connection(databaseUrl) {
  let actual;
  runInNewContext(source, {
    exports: {},
    URL,
    process: { env: { DATABASE_URL: databaseUrl } },
    require(name) {
      if (name === "postgres") {
        return (url, options) => {
          actual = { url: new URL(url), options };
          return {};
        };
      }
      if (name === "drizzle-orm/postgres-js") return { drizzle: () => ({}) };
      if (["server-only", "./schema", "./relations"].includes(name)) return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return actual;
}

test("shared transaction pooler uses session mode and retains credentials and URL options", () => {
  const { url, options } = connection(
    "postgres://postgres.test:p%40ss@aws-0-test.pooler.supabase.com:6543/postgres?application_name=test",
  );
  assert.equal(url.port, "5432");
  assert.equal(url.username, "postgres.test");
  assert.equal(decodeURIComponent(url.password), "p@ss");
  assert.equal(url.pathname, "/postgres");
  assert.equal(url.searchParams.get("application_name"), "test");
  assert.equal(options.ssl, "require");
  assert.equal(options.max, 1);
  assert.equal(options.idle_timeout, 5);
  assert.equal(options.connect_timeout, 10);
});

test("custom endpoints and existing session poolers keep their configured ports", () => {
  for (const host of ["database.example.com", "db.test.supabase.co"]) {
    assert.equal(connection(`postgres://u:p@${host}:6543/db`).url.port, "6543");
  }
  assert.equal(
    connection("postgres://u:p@aws-0-test.pooler.supabase.com:5432/db").url
      .port,
    "5432",
  );
});

test("local databases retain non-TLS support and missing configuration fails early", () => {
  assert.equal(
    connection("postgres://u:p@localhost:5432/db").options.ssl,
    false,
  );
  assert.throws(() => connection(undefined), /DATABASE_URL is not set/);
});
