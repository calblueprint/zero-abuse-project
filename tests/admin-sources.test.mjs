import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function load(relativePath, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(code, {
    exports,
    require: name =>
      Object.hasOwn(modules, name) ? modules[name] : require(name),
    URL,
  });
  return exports;
}

for (const isActive of [true, false]) {
  test(`existing ${isActive ? "active" : "inactive"} source is matched before insertion`, async t => {
    const source = {
      sourceId: "aa000047-2001-4000-8000-000000000001",
      name: "Existing source",
      isActive,
    };
    const insert = t.mock.fn(() => {
      throw new Error("An existing source must not reach insertion");
    });
    const db = {
      insert,
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({ limit: async () => [source] }),
          }),
        }),
      }),
    };
    const { addSource } = load(
      "../app/(authenticated)/(approved)/admin/sources/actions.ts",
      {
        "@/db": { db },
        "@/db/schema": { sources: {} },
        "@/db/source-url": load("../db/source-url.ts"),
        "@/lib/auth/access": {
          requireAdmin: async () => ({ userId: source.sourceId }),
        },
        "@/lib/validation/uuid": load("../lib/validation/uuid.ts"),
        "./validation": load(
          "../app/(authenticated)/(approved)/admin/sources/validation.ts",
        ),
        "next/cache": {
          revalidatePath: () => assert.fail("Unexpected revalidation"),
        },
        "next/navigation": {
          redirect: () => assert.fail("Unexpected redirect"),
        },
      },
    );
    const form = new FormData();
    for (const [key, value] of Object.entries({
      name: "Duplicate source",
      tier: "1",
      type: "News",
      url: "example.com/",
    }))
      form.set(key, value);

    const result = await addSource({}, form);
    assert.equal(insert.mock.callCount(), 0);
    if (isActive) {
      assert.match(result.errors.url, /already exists/);
    } else {
      assert.equal(result.inactiveMatch.sourceId, source.sourceId);
    }
  });
}
