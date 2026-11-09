import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL(
    "../../app/(authenticated)/(approved)/intelligence/upload/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function setup({
  duplicate = false,
  concurrentDuplicate = false,
  result = {
    status: "ready",
    intelligence: {
      title: "Research",
      summary: "Child protection findings",
      platform: [],
    },
  },
} = {}) {
  const writes = [];
  let processed = 0;
  let selects = 0;
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selects++;
            return duplicate || (concurrentDuplicate && selects === 2)
              ? [{ id: "existing" }]
              : [];
          },
        }),
      }),
    }),
    execute: async () => {},
    insert: table => ({
      values: values => ({
        returning: async () => {
          writes.push({ table, values });
          return [{ id: "new-id" }];
        },
      }),
    }),
    transaction: async callback => callback(db),
  };
  const modules = {
    "node:crypto": { createHash },
    "next/navigation": { unstable_rethrow: () => {} },
    "drizzle-orm": { eq: () => {}, sql: () => {} },
    "@/db": { db },
    "@/db/schema": { itelItems: {}, sources: {} },
    "@/lib/auth/access": {
      requireApprovedUser: async () => ({ userId: "approved-user" }),
    },
    "@/lib/intelligence-library/process-document": {
      DocumentProcessingError: class extends Error {},
      processDocument: async () => {
        processed++;
        return result;
      },
    },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: name => {
      if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
      return modules[name];
    },
    Buffer,
    File,
    Response,
    URL,
    Date,
  });
  return { post: exports.POST, writes, processed: () => processed };
}

function request({
  origin = "http://localhost",
  filename = "report.txt",
  text = "Private full source text",
  date = "",
  url = "",
} = {}) {
  const form = new FormData();
  form.set("file", new File([text], filename));
  form.set("sourceName", "Publisher");
  form.set("sourceUrl", url);
  form.set("publishedDate", date);
  return new Request("http://localhost/intelligence/upload", {
    method: "POST",
    headers: { origin },
    body: form,
  });
}

test("rejects cross-origin uploads before processing", async () => {
  const state = setup();
  assert.equal(
    (await state.post(request({ origin: "https://other.test" }))).status,
    403,
  );
  assert.equal(state.processed(), 0);
});

test("rejects unsupported files and invalid source metadata", async () => {
  for (const input of [
    { filename: "x.exe" },
    { text: "" },
    { date: "2026-02-30" },
    { url: "javascript:alert(1)" },
  ]) {
    const state = setup();
    assert.equal((await state.post(request(input))).status, 400);
    assert.equal(state.processed(), 0);
  }
});

test("bounds multipart size before processing", async () => {
  const state = setup();
  assert.equal(
    (await state.post(request({ text: "x".repeat(9 * 1024 * 1024) }))).status,
    413,
  );
  assert.equal(state.processed(), 0);
});

test("existing hash avoids model calls and database writes", async () => {
  const state = setup({ duplicate: true });
  const response = await state.post(request());
  assert.equal((await response.json()).status, "duplicate");
  assert.equal(state.processed(), 0);
  assert.equal(state.writes.length, 0);
});

test("failed documents leave no database rows", async () => {
  const state = setup({ result: { status: "failed", message: "Reason" } });
  assert.equal((await (await state.post(request())).json()).status, "failed");
  assert.equal(state.writes.length, 0);
});

test("saves intel and metadata without storing original bytes or full text", async () => {
  const state = setup();
  const response = await state.post(request());
  assert.equal((await response.json()).status, "saved");
  const item = state.writes[1].values;
  assert.equal(item.sourceUrl, null);
  assert.equal(item.publishedAt, null);
  assert.equal(item.uploadFilename, "report.txt");
  assert.equal(item.uploadHash.length, 64);
  assert.equal(item.tldr, "Child protection findings");
  assert.equal(state.writes[0].values.addedBy, "approved-user");
  assert.ok(!JSON.stringify(state.writes).includes("Private full source text"));
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("concurrent duplicate check avoids inserting another source or item", async () => {
  const state = setup({ concurrentDuplicate: true });
  assert.equal(
    (await (await state.post(request())).json()).status,
    "duplicate",
  );
  assert.equal(state.writes.length, 0);
});
