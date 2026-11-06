import type { SearchParams } from "@/lib/validation/search-params";
import type { SourceTier, SourceType } from "./validation";
import { getAllowedValues, getValues } from "@/lib/validation/search-params";
import { SOURCE_TIERS, SOURCE_TYPES } from "./validation";

export type SourceRecord = {
  sourceId: string;
  name: string;
  tier: string | null;
  type: string | null;
  baseUrl: string | null;
  isActive: boolean;
  // ISO strings, so the server and browser parse them the same way.
  lastCrawledAt: string | null;
  addedAt: string | null;
};

export const SOURCE_TABS = [
  "needs-attention",
  "all",
  "active",
  "inactive",
] as const;

export type SourceTab = (typeof SOURCE_TABS)[number];

export const SOURCE_SORTS = ["last-crawled", "name", "tier", "added"] as const;

export type SourceSort = (typeof SOURCE_SORTS)[number];

export const SORT_LABELS: Record<SourceSort, string> = {
  "last-crawled": "Last crawled",
  name: "Name",
  tier: "Tier",
  added: "Recently added",
};

export type SourceView = {
  q: string;
  tab: SourceTab;
  sort: SourceSort;
  tiers: SourceTier[];
  types: SourceType[];
};

const DEFAULT_TAB: SourceTab = "all";
const DEFAULT_SORT: SourceSort = "last-crawled";

export function parseSourceView(params: SearchParams): SourceView {
  return {
    q: getValues(params, "q")[0] ?? "",
    tab: getAllowedValues(params, "tab", SOURCE_TABS)[0] ?? DEFAULT_TAB,
    sort: getAllowedValues(params, "sort", SOURCE_SORTS)[0] ?? DEFAULT_SORT,
    tiers: getAllowedValues(params, "tier", SOURCE_TIERS),
    types: getAllowedValues(params, "type", SOURCE_TYPES),
  };
}

// Query string for the view, leaving out defaults ("" when everything is).
export function toQueryString(view: SourceView): string {
  const params = new URLSearchParams();
  const q = view.q.trim();

  if (q) params.set("q", q);
  if (view.tab !== DEFAULT_TAB) params.set("tab", view.tab);
  if (view.sort !== DEFAULT_SORT) params.set("sort", view.sort);
  SOURCE_TIERS.filter(tier => view.tiers.includes(tier)).forEach(tier =>
    params.append("tier", tier),
  );
  SOURCE_TYPES.filter(type => view.types.includes(type)).forEach(type =>
    params.append("type", type),
  );

  const query = params.toString();
  return query ? `?${query}` : "";
}

// "https://www.fbi.gov/news" → "fbi.gov/news"
export function displayUrl(baseUrl: string): string {
  return baseUrl.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (count: number, unit: string) =>
  `${count} ${unit}${count === 1 ? "" : "s"}`;

export type CrawlHealth = {
  status: "healthy" | "delayed" | "not-crawled" | "paused";
  label: string;
};

// Derived from last_crawled_at until the scraper reports crawl errors.
// Sources are checked daily, so a crawl older than a day is overdue.
export function getCrawlHealth(source: SourceRecord, now: number): CrawlHealth {
  if (!source.isActive) {
    return { status: "paused", label: "Paused" };
  }

  if (!source.lastCrawledAt) {
    return { status: "not-crawled", label: "Not crawled yet" };
  }

  const days = Math.floor((now - Date.parse(source.lastCrawledAt)) / DAY);

  return days < 1
    ? { status: "healthy", label: "Healthy" }
    : { status: "delayed", label: `Delayed ${plural(days, "day")}` };
}

// "Just now", "5 min ago", "2 hours ago", "3 days ago"; null from a week on,
// when the caller shows the date instead.
export function formatTimeAgo(iso: string, now: number): string | null {
  const elapsed = Math.max(now - Date.parse(iso), 0);

  if (elapsed < MINUTE) return "Just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${plural(Math.floor(elapsed / HOUR), "hour")} ago`;
  if (elapsed < 7 * DAY)
    return `${plural(Math.floor(elapsed / DAY), "day")} ago`;
  return null;
}

const matchesTab: Record<
  SourceTab,
  (source: SourceRecord, now: number) => boolean
> = {
  "needs-attention": (source, now) =>
    getCrawlHealth(source, now).status === "delayed",
  all: () => true,
  active: source => source.isActive,
  inactive: source => !source.isActive,
};

// A fixed locale, so the server render and the browser agree on the order.
const byName = (a: SourceRecord, b: SourceRecord) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" });

// Newest first; missing dates last.
const byDateDesc =
  (key: "lastCrawledAt" | "addedAt") => (a: SourceRecord, b: SourceRecord) => {
    const aTime = a[key] ? Date.parse(a[key]) : -Infinity;
    const bTime = b[key] ? Date.parse(b[key]) : -Infinity;
    return bTime - aTime || byName(a, b);
  };

// Tier 1 first; missing or unknown tiers last.
const tierRank = (source: SourceRecord) => {
  const index = SOURCE_TIERS.indexOf(source.tier as SourceTier);
  return index === -1 ? SOURCE_TIERS.length : index;
};

const comparators: Record<
  SourceSort,
  (a: SourceRecord, b: SourceRecord) => number
> = {
  "last-crawled": byDateDesc("lastCrawledAt"),
  name: byName,
  tier: (a, b) => tierRank(a) - tierRank(b) || byName(a, b),
  added: byDateDesc("addedAt"),
};

// Search (name or URL; a pasted URL matches too) plus the Tier/Type filters.
function matchSources(sources: SourceRecord[], view: SourceView) {
  const query = view.q.trim().toLowerCase();
  // "https://www.fbi.gov/news/" → "fbi.gov/news", like displayUrl.
  const urlQuery = query
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .replace(/\/$/, "");

  return sources.filter(
    source =>
      (!query ||
        source.name.toLowerCase().includes(query) ||
        (source.baseUrl !== null &&
          displayUrl(source.baseUrl).toLowerCase().includes(urlQuery))) &&
      (view.tiers.length === 0 ||
        view.tiers.some(tier => tier === source.tier)) &&
      (view.types.length === 0 ||
        view.types.some(type => type === source.type)),
  );
}

/**
 * Applies the search and filters, then the tab and sort. Tab counts follow
 * the search and filters, so each tab shows how many matches it holds.
 */
export function applySourceView(
  sources: SourceRecord[],
  view: SourceView,
  now: number,
) {
  const matched = matchSources(sources, view);
  const counts = Object.fromEntries(
    SOURCE_TABS.map(tab => [
      tab,
      matched.filter(source => matchesTab[tab](source, now)).length,
    ]),
  ) as Record<SourceTab, number>;
  const rows = matched
    .filter(source => matchesTab[view.tab](source, now))
    .sort(comparators[view.sort]);

  return { rows, counts };
}

// How many rows the view's tab would show, without sorting or tab counts.
export function countSourceView(
  sources: SourceRecord[],
  view: SourceView,
  now: number,
) {
  return matchSources(sources, view).filter(source =>
    matchesTab[view.tab](source, now),
  ).length;
}
