import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { isUuid } from "../lib/validation/uuid.ts";

const require = createRequire(import.meta.url);
const origin = "https://app.example.com";
const itemId = "aa000046-2001-4000-8000-000000000001";
const sourceUrl = "https://source.example.com/article";
const route = ts.transpileModule(
  readFileSync(
    new URL(
      "../app/(authenticated)/(approved)/intelligence/items/open/route.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function loadRoute(t) {
  const authorize = t.mock.fn(async () => {});
  const getSource = t.mock.fn(async () => sourceUrl);
  const record = t.mock.fn(async () => true);
  const modules = {
    "next/navigation": require("next/navigation"),
    "next/server": require("next/server"),
    "@/db/queries/intelligence-library": {
      getIntelligenceItemSourceUrl: getSource,
    },
    "@/db/queries/recently-accessed": { recordRecentlyAccessed: record },
    "@/lib/auth/access": { requireApprovedUser: authorize },
    "@/lib/validation/uuid": { isUuid },
  };
  const exports = {};
  // Compile only the handler so these tests never connect to a database.
  runInNewContext(route, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(modules, name), `Unexpected import: ${name}`);
      return modules[name];
    },
    URL,
    Response,
    console: { error() {}, warn() {} },
  });
  return { POST: exports.POST, authorize, getSource, record };
}

function request(ids = [itemId], requestOrigin = origin, requestUrl = origin) {
  const body = new FormData();
  for (const id of ids) body.append("itemId", id);
  return new Request(`${requestUrl}/intelligence/items/open`, {
    method: "POST",
    headers: requestOrigin ? { origin: requestOrigin } : {},
    body,
  });
}

test("records the item and redirects with GET", async t => {
  const { POST, authorize, getSource, record } = loadRoute(t);
  const response = await POST(request());
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), sourceUrl);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(authorize.mock.callCount(), 1);
  assert.deepEqual(Array.from(getSource.mock.calls[0].arguments), [itemId]);
  assert.deepEqual(Array.from(record.mock.calls[0].arguments), [itemId]);
});

test("rejects missing or foreign origins before authorization", async t => {
  for (const requestOrigin of [null, "null", "https://other.example.com"]) {
    const { POST, authorize, getSource, record } = loadRoute(t);
    assert.equal((await POST(request([itemId], requestOrigin))).status, 403);
    assert.equal(authorize.mock.callCount(), 0);
    assert.equal(getSource.mock.callCount(), 0);
    assert.equal(record.mock.callCount(), 0);
  }
});

test("rejects missing, duplicate, invalid, and file-valued IDs", async t => {
  for (const ids of [[], [itemId, itemId], ["invalid"], [new Blob([itemId])]]) {
    const { POST, getSource, record } = loadRoute(t);
    assert.equal((await POST(request(ids))).status, 400);
    assert.equal(getSource.mock.callCount(), 0);
    assert.equal(record.mock.callCount(), 0);
  }
});

test("rejects malformed request bodies", async t => {
  const { POST } = loadRoute(t);
  const malformed = new Request(`${origin}/intelligence/items/open`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal((await POST(malformed)).status, 400);
});

test("uses the receiving origin without requiring a site URL setting", async t => {
  for (const requestOrigin of [
    origin,
    "http://localhost:3000",
    "https://preview.example.com",
  ]) {
    const { POST } = loadRoute(t);
    const response = await POST(
      request([itemId], requestOrigin, requestOrigin),
    );
    assert.equal(response.status, 303);
  }
});

test("does not query items when authorization fails", async t => {
  const { POST, authorize, getSource, record } = loadRoute(t);
  const error = new Error("Access denied");
  authorize.mock.mockImplementation(async () => {
    throw error;
  });
  await assert.rejects(POST(request()), error);
  assert.equal(getSource.mock.callCount(), 0);
  assert.equal(record.mock.callCount(), 0);
});

test("missing items and failed lookups do not write history", async t => {
  for (const status of [404, 500]) {
    const { POST, getSource, record } = loadRoute(t);
    getSource.mock.mockImplementation(async () => {
      if (status === 500) throw new Error("Database unavailable");
      return null;
    });
    assert.equal((await POST(request())).status, status);
    assert.equal(record.mock.callCount(), 0);
  }
});

test("rejects malformed and unsafe source URLs before writing history", async t => {
  for (const url of ["", "/relative", "javascript:alert(1)", "file:///tmp/a"]) {
    const { POST, getSource, record } = loadRoute(t);
    getSource.mock.mockImplementation(async () => url);
    assert.equal((await POST(request())).status, 422);
    assert.equal(record.mock.callCount(), 0);
  }
});

test("opens the source even if history cannot be saved", async t => {
  for (const throws of [false, true]) {
    const { POST, record } = loadRoute(t);
    record.mock.mockImplementation(async () => {
      if (throws) throw new Error("Database unavailable");
      return false;
    });
    const response = await POST(request());
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), sourceUrl);
  }
});

test("preserves authentication redirects during a history write", async t => {
  const { POST, record } = loadRoute(t);
  let redirectError;
  try {
    require("next/navigation").redirect("/login");
  } catch (error) {
    redirectError = error;
  }
  assert.ok(redirectError);
  record.mock.mockImplementation(async () => {
    throw redirectError;
  });
  await assert.rejects(POST(request()), error => error === redirectError);
});

test("library source forms preserve Origin", () => {
  function loadComponent(path) {
    const exports = {};
    const code = ts.transpileModule(
      readFileSync(new URL(path, import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      },
    ).outputText;
    runInNewContext(code, {
      exports,
      require(name) {
        if (name.startsWith("./"))
          return loadComponent(
            `../components/intelligence-library/${name.slice(2)}.tsx`,
          );
        if (name === "@/lib/intelligence-library/filters")
          return loadComponent("../lib/intelligence-library/filters.ts");
        if (name === "@/lib/intelligence-library/taxonomy")
          return loadComponent("../lib/intelligence-library/taxonomy.ts");
        if (name === "@/lib/validation/uuid")
          return loadComponent("../lib/validation/uuid.ts");
        if (name === "@/styles/colors")
          return loadComponent("../styles/colors.ts");
        return require(name);
      },
    });
    return exports;
  }
  const exports = loadComponent(
    "../components/intelligence-library/IntelligenceLibrary.tsx",
  );
  const filterNames = [
    "exploitationTypes",
    "platforms",
    "technologies",
    "affectedPopulations",
    "offenderTactics",
    "geographies",
    "intelTypes",
    "zapRelevances",
    "sourceIds",
  ];
  const filters = Object.fromEntries(filterNames.map(name => [name, []]));
  const item = title => ({
    itemId,
    title,
    sourceName: "Test source",
    publishedAt: null,
    tldr: null,
  });
  const html = renderToStaticMarkup(
    createElement(exports.default, {
      filters,
      options: { ...filters, sources: [] },
      items: [item("Library item")],
    }),
  );
  assert.ok(!html.includes("Recently accessed"));
  const forms = html.match(
    /<form[^>]*action="\/intelligence\/items\/open"[^>]*>/g,
  );
  assert.equal(forms.length, 1);
  for (const form of forms) {
    assert.match(form, /method="POST"/);
    assert.match(form, /rel="noopener"/);
    assert.doesNotMatch(form, /noreferrer/);
  }
});
