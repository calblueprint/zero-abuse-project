import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  runInNewContext(code, {
    exports,
    URLSearchParams,
    require: name =>
      Object.hasOwn(modules, name) ? modules[name] : require(name),
  });
  return exports;
}

test("People accepts repeated query parameters and fetches the directory once", async t => {
  const from = t.mock.fn(async () => [
    {
      userId: "1",
      firstName: "Alex",
      lastName: "Ng",
      approvalStatus: "approved",
      isAdmin: false,
    },
    {
      userId: "2",
      firstName: "Sam",
      lastName: "Lee",
      approvalStatus: "pending",
      isAdmin: false,
    },
  ]);
  const placeholder = () => null;
  const { default: page } = load(
    "../app/(authenticated)/(approved)/admin/users/page.tsx",
    {
      "@/components/AppShell": {
        __esModule: true,
        default: ({ children }) => children,
        Card: "main",
      },
      "@/db": { db: { select: () => ({ from }) } },
      "@/db/schema": { users: {} },
      "@/lib/auth/access": { requireAdmin: async () => ({ userId: "admin" }) },
      "@/lib/utils": load("../lib/utils.ts"),
      "@/lib/validation/search-params": load(
        "../lib/validation/search-params.ts",
      ),
      "./AccessFilters": placeholder,
      "./actions": {},
      "./InvitePerson": placeholder,
      "./MemberActions": placeholder,
      "./PeopleSortDropdown": placeholder,
      "./RejectRequest": placeholder,
      "./ReviewAccessRequest": placeholder,
    },
  );
  const html = renderToStaticMarkup(
    await page({
      searchParams: Promise.resolve({
        tab: "all",
        q: ["Alex", "Sam"],
        access: ["member", "pending"],
      }),
    }),
  );
  assert.equal(from.mock.callCount(), 1);
  assert.match(html, /Alex Ng/);
  assert.doesNotMatch(html, /Sam Lee/);
});
