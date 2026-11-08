import * as React from "react";
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
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  runInNewContext(code, {
    exports,
    require: name =>
      Object.hasOwn(modules, name) ? modules[name] : require(name),
  });
  return exports;
}
const colors = load("../styles/colors.ts");
const TopBar = load("../components/TopBar.tsx", {
  "@/styles/colors": colors,
  "@/assets/icons/sidebar-toggle.svg": "/sidebar.svg",
  "next/navigation": { usePathname: () => "/intelligence-library" },
  "next/image": props => React.createElement("img", props),
});
const sourceButton = load(
  "../components/intelligence-library/ViewSourceButton.tsx",
);
const filters = load("../lib/intelligence-library/pattern-filters.ts");
const patterns = Array.from({ length: 9 }, (_, i) => ({
  id: `pattern-${i}`,
  title: `Pattern ${i}`,
  description: "Test pattern",
  surfacedAt: "2026-10-15",
  supportingItemCount: 1,
  sourceCount: 1,
  priority: "High",
  reviewStatus: "Confirmed",
  review: "Reviewed",
  evidence: "Corroborated",
  topic: "Topic",
  platform: "Platform",
  population: "Population",
  saved: true,
  archived: false,
}));
function pageHarness(isAdmin = true) {
  const states = [];
  let cursor = 0;
  const component = load(
    "../components/intelligence-library/intelligence-library.tsx",
    {
      react: {
        ...React,
        useState(initial) {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [
            states[index],
            value => {
              states[index] =
                typeof value === "function" ? value(states[index]) : value;
            },
          ];
        },
        useMemo: fn => fn(),
        useCallback: fn => fn,
        useEffect() {},
        useRef: () => ({ current: null }),
      },
      "@/components/intelligence-library/ViewSourceButton": sourceButton,
      "@/components/TopBar": TopBar,
      "@/styles/colors": colors,
      "@/styles/fonts": { dmSans: { className: "dm-sans-test" } },
      "@/lib/intelligence-library/pattern-filters": filters,
    },
  ).default;
  return () => {
    cursor = 0;
    return component({
      initialPatterns: patterns,
      intelligenceItems: [
        {
          itemId: "aa000061-2001-4000-8000-000000000001",
          title: "Test item",
          sourceName: "Test source",
          publishedAt: null,
        },
      ],
      avatarInitials: "NK",
      isAdmin,
    });
  };
}
function nodes(element) {
  if (!element || typeof element !== "object") return [];
  return [
    element,
    ...React.Children.toArray(element.props?.children).flatMap(nodes),
  ];
}
function text(element) {
  if (typeof element === "string" || typeof element === "number")
    return String(element);
  return React.Children.toArray(element?.props?.children).map(text).join("");
}
function click(render, label) {
  const button = nodes(render()).find(
    node => node.props.onClick && text(node).startsWith(label),
  );
  assert.ok(button, `Missing button: ${label}`);
  button.props.onClick();
}
function pagination(render) {
  return text(
    nodes(render()).find(
      node =>
        Array.isArray(node.props.children) &&
        node.props.children[0] === "Showing ",
    ),
  );
}

test("Previous moves back after the only item on the last Saved page is removed", () => {
  const render = pageHarness();
  click(render, "Saved");
  click(render, "Next");
  click(render, "Next");
  assert.equal(pagination(render), "Showing 9 to 9 of 9");
  const lastCard = nodes(render()).find(
    node => node.type.name === "PatternCard",
  );
  lastCard.props.onToggleSaved(lastCard.props.pattern.id);
  assert.equal(pagination(render), "Showing 5 to 8 of 8");
  click(render, "Previous");
  assert.equal(pagination(render), "Showing 1 to 4 of 8");
});

test("styled item cards use tracked source forms without stripping Origin", () => {
  const render = pageHarness();
  click(render, "Intelligence items");
  const html = renderToStaticMarkup(render());
  assert.match(html, /action="\/intelligence\/items\/open"/);
  assert.match(html, /method="POST"/);
  assert.match(
    html,
    /name="itemId"[^>]*value="aa000061-2001-4000-8000-000000000001"/,
  );
  assert.match(html, /rel="noopener"/);
  assert.doesNotMatch(html, /noreferrer/);
});

test("shared navigation exposes admin tabs only to admins and loads the shared font", () => {
  for (const isAdmin of [true, false]) {
    const html = renderToStaticMarkup(pageHarness(isAdmin)());
    assert.equal(html.includes('href="/admin/sources"'), isAdmin);
    assert.equal(html.includes('href="/admin/users"'), isAdmin);
    assert.match(html, /href="\/profile"/);
    const libraryLink = html.match(
      /<a\b[^>]*href="\/intelligence-library"[^>]*>/,
    )?.[0];
    assert.ok(libraryLink);
    assert.match(libraryLink, /aria-current="page"/);
    assert.match(html, /class="[^"]*dm-sans-test/);
  }
});
