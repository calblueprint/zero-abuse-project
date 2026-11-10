import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { drizzle } from "drizzle-orm/postgres-js";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  runInNewContext(code, {
    exports,
    require: name =>
      Object.hasOwn(modules, name) ? modules[name] : require(name),
  });
  return exports;
}

test("geography uses a correlated EXISTS and keeps user values parameterized", async () => {
  const schema = load("../db/schema.ts", {
    "./source-url": load("../db/source-url.ts"),
  });
  const db = drizzle.mock();
  let query;
  db.session.prepareQuery = prepared => {
    query = prepared;
    return {
      setToken() {
        return this;
      },
      execute: async () => [],
    };
  };
  const { getIntelligenceLibraryItems } = load(
    "../db/queries/intelligence-library.ts",
    {
      "server-only": {},
      "@/db": { db },
      "@/db/schema": schema,
      "@/lib/intelligence-library/taxonomy": load(
        "../lib/intelligence-library/taxonomy.ts",
      ),
    },
  );
  const geography = "Oakland'); DROP TABLE item_locations; --";
  await getIntelligenceLibraryItems({
    hasInvalidSourceIds: false,
    exploitationTypes: [],
    platforms: [],
    technologies: [],
    affectedPopulations: [],
    offenderTactics: [],
    geographies: [geography],
    intelTypes: [],
    zapRelevances: [],
    sourceIds: [],
  });
  assert.match(query.sql, /exists \(select .*from "item_locations"/);
  assert.match(
    query.sql,
    /"item_locations"\."item_id" = "itel_items"\."item_id"/,
  );
  assert.match(query.sql, /not exists/);
  assert.doesNotMatch(query.sql, /join "item_locations"/);
  assert.ok(query.params.includes(geography));
  assert.ok(!query.sql.includes(geography));
});
