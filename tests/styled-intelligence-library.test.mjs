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
        target: ts.ScriptTarget.ESNext,
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
const libraryStyles = load("../components/intelligence-library/styles.tsx", {
  "@/styles/colors": colors,
});
const libraryModules = {
  "@/styles/colors": colors,
  "@/lib/intelligence-library/pattern-filters": filters,
  "./styles": libraryStyles,
};
const PatternCard = load(
  "../components/intelligence-library/PatternCard.tsx",
  libraryModules,
);
const FilterControls = load(
  "../components/intelligence-library/FilterControls.tsx",
  libraryModules,
);
const LibraryToolbar = load(
  "../components/intelligence-library/LibraryToolbar.tsx",
  libraryModules,
);
const LibraryStatusTabs = load(
  "../components/intelligence-library/LibraryStatusTabs.tsx",
  libraryModules,
);
Object.assign(libraryModules, {
  "./FilterControls": FilterControls,
  "./LibraryToolbar": LibraryToolbar,
  "./LibraryStatusTabs": LibraryStatusTabs,
});
const PatternToolbar = load(
  "../components/intelligence-library/PatternToolbar.tsx",
  libraryModules,
);
const taxonomy = load("../lib/intelligence-library/taxonomy.ts");
const itemFiltersParser = load("../lib/intelligence-library/filters.ts", {
  "@/lib/validation/search-params": load("../lib/validation/search-params.ts"),
  "@/lib/intelligence-library/taxonomy": taxonomy,
  "@/lib/validation/uuid": load("../lib/validation/uuid.ts"),
});
const emptyItemFilters = itemFiltersParser.parseIntelligenceFilters({});
const itemOptions = {
  exploitationTypes: [],
  platforms: [],
  technologies: [],
  affectedPopulations: [],
  offenderTactics: [],
  geographies: [],
  intelTypes: [],
  zapRelevances: [],
  sources: [],
};
const ItemToolbar = load("../components/intelligence-library/ItemToolbar.tsx", {
  ...libraryModules,
  "@/lib/intelligence-library/filters": itemFiltersParser,
});
Object.assign(libraryModules, { "./ItemToolbar": ItemToolbar });
const IntelligenceItemsView = load(
  "../components/intelligence-library/IntelligenceItemsView.tsx",
  {
    ...libraryModules,
    "./ViewSourceButton": sourceButton,
    "@/lib/intelligence-library/filters": itemFiltersParser,
  },
);
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
function statefulComponent(path, modules) {
  const states = [];
  let cursor = 0;
  const component = load(path, {
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
      useId: () => "test-filters",
    },
    ...modules,
  }).default;
  return props => {
    cursor = 0;
    return component(props);
  };
}
function pageHarness(isAdmin = true) {
  const component = statefulComponent(
    "../components/intelligence-library/IntelligenceLibraryView.tsx",
    {
      ...libraryModules,
      "./PatternCard": PatternCard,
      "./IntelligenceItemsView": IntelligenceItemsView,
      "./PatternToolbar": PatternToolbar,
      "@/components/intelligence-library/ViewSourceButton": sourceButton,
      "@/components/TopBar": TopBar,
      "@/styles/fonts": { dmSans: { className: "dm-sans-test" } },
    },
  );
  return () => {
    return component({
      initialPatterns: patterns,
      itemFilters: emptyItemFilters,
      itemFilterOptions: itemOptions,
      intelligenceItems: [
        {
          itemId: "aa000061-2001-4000-8000-000000000001",
          title: "Test item",
          sourceName: "Test source",
          publishedAt: null,
        },
      ],
      firstName: "Nataliia",
      lastName: "Kulieshova",
      isAdmin,
    });
  };
}
function nodes(element) {
  if (!element || typeof element !== "object" || element.props?.hidden)
    return [];
  if (element.type === LibraryStatusTabs.default)
    return nodes(element.type(element.props));
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

test("shared top bar derives initials from names, trimming spaces and preserving Unicode", () => {
  for (const [firstName, lastName, expected] of [
    ["Nataliia", "Kulieshova", "NK"],
    ["  nataliia ", " kulieshova  ", "NK"],
    ["Nataliia", "", "N"],
    ["😀Alex", "Ng", "😀N"],
  ]) {
    const html = renderToStaticMarkup(
      React.createElement(TopBar.default, {
        firstName,
        lastName,
        isAdmin: false,
      }),
    );
    const avatar = html.match(/<a\b[^>]*aria-label="Profile"[^>]*>(.*?)<\/a>/);
    assert.ok(avatar);
    assert.equal(avatar[1], expected);
  }
});

test("filter drafts apply only on confirmation and dismissal discards edits", () => {
  const component = statefulComponent(
    "../components/intelligence-library/PatternToolbar.tsx",
    libraryModules,
  );
  let appliedFilters = filters.emptyPatternFilters;
  const toolbar = () =>
    component({
      patterns,
      appliedFilters,
      referenceDate: new Date("2026-11-09T00:00:00Z"),
      searchInput: {},
      sort: "Most recent",
      onSortChange() {},
      onApply: value => {
        appliedFilters = value;
      },
    });
  const render = () => toolbar().props.filterContent;
  click(render, "30 days");
  assert.equal(appliedFilters.date, "");
  toolbar().props.onFilterDismiss();
  assert.equal(
    nodes(render()).find(node => text(node) === "30 days").props.$active,
    false,
  );
  click(render, "30 days");
  toolbar().props.onApplyFilters();
  assert.equal(appliedFilters.date, "30 days");
  click(render, "Clear all");
  assert.equal(appliedFilters.date, "30 days");
  toolbar().props.onApplyFilters();
  assert.equal(appliedFilters.date, "");
});

test("item view includes search, taxonomy filters and item-specific column headings", () => {
  const render = pageHarness();
  click(render, "Intelligence items");
  const html = renderToStaticMarkup(render());
  assert.match(html, /action="\/intelligence-library"/);
  assert.match(html, /aria-label="Search intelligence items"/);
  assert.match(html, /name="q"/);
  assert.match(html, /name="view"[^>]*value="items"/);
  for (const field of [
    "sourceId",
    "platform",
    "exploitationType",
    "publishedFrom",
    "publishedTo",
  ]) {
    assert.ok(
      html.includes(
        field.startsWith("published")
          ? `name="${field}"`
          : field === "sourceId"
            ? ">Source<"
            : field === "platform"
              ? ">Platform<"
              : ">Exploitation type<",
      ),
    );
  }
  for (const title of [
    "Intelligence item",
    "Source",
    "Published (UTC)",
    "Actions",
  ]) {
    assert.ok(html.includes(`<th scope="col">${title}</th>`));
  }
  assert.doesNotMatch(html, /Supporting items|Review status/);
  for (const label of ["Saved", "Confirmed", "Archived"])
    assert.ok(html.includes(label));
});

test("styled route applies item search and filters and stays on the items tab", async () => {
  let requestedFilters;
  const page = load(
    "../app/(authenticated)/(approved)/intelligence-library/page.tsx",
    {
      "@/components/intelligence-library/IntelligenceLibraryView": () => null,
      "@/db/queries/intelligence-library": {
        getIntelligenceLibraryItems: async filters => {
          requestedFilters = filters;
          return [];
        },
        getIntelligenceLibraryFilterOptions: async () => itemOptions,
      },
      "@/lib/auth/access": {
        requireApprovedUser: async () => ({
          firstName: "Test",
          lastName: "User",
          isAdmin: false,
        }),
      },
      "@/lib/intelligence-library/emerging-patterns": {
        getEmergingPatterns: async () => [],
      },
      "@/lib/intelligence-library/filters": itemFiltersParser,
    },
  ).default;
  const result = await page({
    searchParams: Promise.resolve({
      view: "items",
      q: "  teen safety  ",
      sourceId: "aa000061-2001-4000-8000-000000000001",
      publishedTo: "2026-10-31",
    }),
  });
  assert.equal(result.props.initialView, "items");
  assert.equal(requestedFilters.search, "teen safety");
  assert.equal(
    requestedFilters.sourceIds[0],
    "aa000061-2001-4000-8000-000000000001",
  );
  assert.equal(
    requestedFilters.publishedTo.toISOString(),
    "2026-10-31T00:00:00.000Z",
  );
});

test("item search treats wildcard characters literally and preserves source/date constraints", async () => {
  const { pgTable, text, PgDialect } = require("drizzle-orm/pg-core");
  const fields = [
    "itemId",
    "sourceId",
    "sourceUrl",
    "publishedAt",
    "title",
    "tldr",
    "exploitationType",
    "platform",
    "technology",
    "affectedPopulation",
    "offenderTactic",
    "geography",
    "intelType",
    "zapRelevance",
  ];
  const itelItems = pgTable(
    "itel_items",
    Object.fromEntries(fields.map(name => [name, text(name)])),
  );
  const sources = pgTable("sources", {
    sourceId: text("sourceId"),
    name: text("name"),
  });
  let query;
  let ordering;
  const builder = {
    from() {
      return this;
    },
    innerJoin() {
      return this;
    },
    where(condition) {
      query = new PgDialect().sqlToQuery(condition);
      return this;
    },
    orderBy(...values) {
      ordering = values.map(value => new PgDialect().sqlToQuery(value).sql);
      return [];
    },
  };
  const repository = load("../db/queries/intelligence-library.ts", {
    "server-only": {},
    "@/db": { db: { select: () => builder } },
    "@/db/schema": { itelItems, sources },
    "@/lib/intelligence-library/taxonomy": taxonomy,
  });
  const filters = itemFiltersParser.parseIntelligenceFilters({
    q: "100%_\\off",
    sourceId: "aa000061-2001-4000-8000-000000000001",
    publishedTo: "2026-10-31",
  });
  await repository.getIntelligenceLibraryItems(filters);
  assert.match(query.sql, /"itel_items"\."title" ilike/);
  assert.match(query.sql, /"sources"\."name" ilike/);
  assert.equal(query.params[0], "%100\\%\\_\\\\off%");
  assert.ok(query.params.includes(filters.sourceIds[0]));
  assert.ok(query.params.includes("2026-11-01T00:00:00.000Z"));
  assert.match(query.sql, / and /);
  assert.match(ordering[0], /"publishedAt" desc nulls last/);
  await repository.getIntelligenceLibraryItems({ ...filters, sort: "Oldest" });
  assert.match(ordering[0], /"publishedAt" asc/);
  await repository.getIntelligenceLibraryItems({ ...filters, sort: "Title" });
  assert.match(ordering[0], /"title" asc/);
});

test("shared toolbar selects sorting and discards filters when toggled closed", () => {
  const component = statefulComponent(
    "../components/intelligence-library/LibraryToolbar.tsx",
    libraryModules,
  );
  let sort = "Most recent";
  let dismissed = 0;
  const render = () =>
    component({
      searchInput: { "aria-label": "Search items" },
      filterLabel: "Item filters",
      filterCount: 0,
      filterContent: null,
      applyLabel: "Apply filters",
      onFilterDismiss: () => dismissed++,
      sort,
      sortOptions: ["Most recent", "Oldest"],
      onSortChange: value => {
        sort = value;
      },
    });
  click(render, "Sort");
  click(render, "Oldest");
  assert.equal(sort, "Oldest");
  click(render, "Filters");
  click(render, "Filters");
  assert.equal(dismissed, 1);
});

test("item bookmarks populate Saved and do not populate Confirmed or Archived", () => {
  const component = statefulComponent(
    "../components/intelligence-library/IntelligenceItemsView.tsx",
    {
      ...libraryModules,
      "./ViewSourceButton": sourceButton,
      "@/lib/intelligence-library/filters": itemFiltersParser,
    },
  );
  const render = () =>
    component({
      filters: emptyItemFilters,
      items: [
        {
          itemId: "item-1",
          title: "Test item",
          sourceName: "Test source",
          publishedAt: null,
        },
      ],
      options: itemOptions,
    });
  const save = nodes(render()).find(
    node => node.props["aria-label"] === "Save intelligence item",
  );
  save.props.onClick();
  click(render, "Saved");
  assert.match(renderToStaticMarkup(render()), /Test item/);
  nodes(render())
    .find(node => node.props["aria-label"] === "Remove saved intelligence item")
    .props.onClick();
  assert.match(renderToStaticMarkup(render()), /No saved intelligence items/);
  click(render, "Confirmed");
  assert.match(
    renderToStaticMarkup(render()),
    /No confirmed intelligence items/,
  );
  click(render, "Archived");
  assert.match(
    renderToStaticMarkup(render()),
    /No archived intelligence items/,
  );
});

test("invalid item sorting falls back to most recent", () => {
  assert.equal(
    itemFiltersParser.parseIntelligenceFilters({ sort: "DROP TABLE" }).sort,
    "Most recent",
  );
  assert.equal(
    itemFiltersParser.parseIntelligenceFilters({ sort: "Oldest" }).sort,
    "Oldest",
  );
});

test("pattern search updates the results and filter preview together", () => {
  const render = pageHarness();
  const toolbar = () =>
    nodes(render()).find(node => node.type === PatternToolbar.default);
  toolbar().props.searchInput.onChange({ target: { value: "Pattern 8" } });
  assert.equal(pagination(render), "Showing 1 to 1 of 1");
  assert.equal(toolbar().props.patterns.length, 1);
});

test("item toolbar owns filter drafts and restores applied values on dismissal", () => {
  const component = statefulComponent(
    "../components/intelligence-library/ItemToolbar.tsx",
    {
      ...libraryModules,
      "@/lib/intelligence-library/filters": itemFiltersParser,
    },
  );
  const applied = itemFiltersParser.parseIntelligenceFilters({
    publishedTo: "2026-10-16",
  });
  const render = () =>
    component({
      filters: applied,
      options: itemOptions,
      action: "/intelligence-library",
    });
  const toolbar = () =>
    nodes(render()).find(node => node.type === LibraryToolbar.default).props;
  const dateInput = () =>
    nodes(toolbar().filterContent).find(
      node => node.props.name === "publishedTo",
    );
  dateInput().props.onChange({ target: { value: "2026-10-15" } });
  const platform = nodes(toolbar().filterContent).find(
    node => node.props.label === "Platform",
  );
  platform.props.onToggle("Discord");
  assert.equal(dateInput().props.value, "2026-10-15");
  assert.ok(
    nodes(toolbar().filterContent).some(
      node => node.props.name === "platform" && node.props.value === "Discord",
    ),
  );
  assert.equal(applied.publishedTo.toISOString(), "2026-10-16T00:00:00.000Z");
  toolbar().onFilterDismiss();
  assert.equal(dateInput().props.value, "2026-10-16");
  assert.equal(
    nodes(toolbar().filterContent).some(node => node.props.name === "platform"),
    false,
  );
  assert.equal(render().props.action, "/intelligence-library");
});
