import assert from "node:assert/strict";
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
  result = { status: "saved", message: "Document added.", itemId: "new-id" },
} = {}) {
  const calls = [];
  const modules = {
    "next/navigation": { unstable_rethrow: () => {} },
    "@/lib/auth/access": {
      requireApprovedUser: async () => ({ userId: "approved-user" }),
    },
    "@/lib/intelligence-library/process-document": {
      DocumentProcessingError: class extends Error {},
      processDocument: async (...args) => {
        calls.push(args);
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
  return { post: exports.POST, calls, processed: () => calls.length };
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

test("forwards the authenticated uploader and optional metadata to Python", async () => {
  const state = setup();
  const response = await state.post(
    request({ url: "https://example.org/report", date: "2026-11-17" }),
  );
  assert.equal((await response.json()).status, "saved");
  const [bytes, filename, metadata] = state.calls[0];
  assert.equal(bytes.toString(), "Private full source text");
  assert.equal(filename, "report.txt");
  assert.equal(metadata.uploaded_by, "approved-user");
  assert.equal(metadata.source_url, "https://example.org/report");
  assert.equal(metadata.published_at, "2026-11-17T00:00:00.000Z");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("missing source URL and date stay unknown", async () => {
  const state = setup();
  await state.post(request());
  assert.equal(state.calls[0][2].source_url, null);
  assert.equal(state.calls[0][2].published_at, null);
});

test("returns repository outcomes without a separate TypeScript save", async () => {
  for (const status of ["saved", "duplicate", "failed"]) {
    const result = { status, message: "Repository result" };
    const state = setup({ result });
    const response = await state.post(request());
    assert.deepEqual(await response.json(), result);
    assert.equal(response.status, status === "failed" ? 422 : 200);
    assert.equal(state.processed(), 1);
  }
});
