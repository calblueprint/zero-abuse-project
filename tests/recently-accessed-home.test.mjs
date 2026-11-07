import { createElement } from "react";
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
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      require: name =>
        Object.hasOwn(modules, name) ? modules[name] : require(name),
    },
  );
  return exports;
}

const colors = load("../styles/colors.ts");
const styles = load("../components/home/styles.ts", {
  "@/styles/colors": colors,
});
const RecentlyAccessed = load("../components/home/RecentlyAccessed.tsx", {
  "@/styles/colors": colors,
  "@/components/home/styles": styles,
}).default;

test("welcome history renders actual items in order using the tracked source-opening route", () => {
  const items = [
    {
      itemId: "aa000061-2001-4000-8000-000000000001",
      title: "Most recent item",
      sourceName: "First source",
    },
    {
      itemId: "aa000061-2001-4000-8000-000000000002",
      title: null,
      sourceName: "Second source",
    },
  ];
  const html = renderToStaticMarkup(createElement(RecentlyAccessed, { items }));
  assert.ok(
    html.indexOf("Most recent item") <
      html.indexOf("Untitled intelligence item"),
  );
  assert.match(html, /First source/);
  assert.match(html, /Second source/);
  assert.equal(
    (html.match(/action="\/intelligence\/items\/open"/g) ?? []).length,
    2,
  );
  for (const item of items) assert.ok(html.includes(`value="${item.itemId}"`));
  assert.equal((html.match(/method="POST"/g) ?? []).length, 2);
  assert.equal((html.match(/rel="noopener"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /noreferrer|Today|Yesterday/);
});

test("empty welcome history displays an empty state without placeholder items", () => {
  const html = renderToStaticMarkup(
    createElement(RecentlyAccessed, { items: [] }),
  );
  assert.match(html, /Items you open will appear here/);
  assert.doesNotMatch(html, /<form/);
});
