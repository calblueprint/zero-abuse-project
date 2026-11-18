import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyPatternFilters,
  matchesPatternFilters,
} from "../lib/intelligence-library/pattern-filters.ts";

const pattern = {
  id: "pattern",
  title: "Pattern",
  description: "Test",
  surfacedAt: "2026-10-15",
  supportingItemCount: 4,
  sourceCount: 2,
  priority: "High",
  reviewStatus: "Confirmed",
  review: "Reviewed",
  evidence: "Corroborated",
  topic: "Topic",
  platform: "Platform",
  population: "Population",
  saved: false,
  archived: false,
};
const referenceDate = new Date("2026-10-31T00:00:00Z");
const filters = overrides => ({ ...emptyPatternFilters, ...overrides });

test("supports OR within categories and AND across categories", () => {
  assert.equal(
    matchesPatternFilters(
      pattern,
      filters({ priorities: ["High", "Moderate"] }),
      referenceDate,
    ),
    true,
  );
  assert.equal(
    matchesPatternFilters(
      pattern,
      filters({ priorities: ["High"], evidence: ["Single source"] }),
      referenceDate,
    ),
    false,
  );
});
test("only applies custom bounds when Custom date range is selected", () => {
  assert.equal(
    matchesPatternFilters(
      pattern,
      filters({ customFrom: "2026-10-20" }),
      referenceDate,
    ),
    true,
  );
  assert.equal(
    matchesPatternFilters(
      pattern,
      filters({ date: "Custom date range", customFrom: "2026-10-20" }),
      referenceDate,
    ),
    false,
  );
});
test("uses deterministic relative and inclusive custom-date boundaries", () => {
  assert.equal(
    matchesPatternFilters(pattern, filters({ date: "30 days" }), referenceDate),
    true,
  );
  assert.equal(
    matchesPatternFilters(
      pattern,
      filters({
        date: "Custom date range",
        customFrom: "2026-10-15",
        customTo: "2026-10-15",
      }),
      referenceDate,
    ),
    true,
  );
});
