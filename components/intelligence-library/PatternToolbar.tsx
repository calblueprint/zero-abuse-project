"use client";

import type { EmergingPattern } from "@/lib/intelligence-library/emerging-patterns";
import type { PatternFilters } from "@/lib/intelligence-library/pattern-filters";
import type { InputHTMLAttributes } from "react";
import { useMemo, useState } from "react";
import {
  dateOptions,
  emptyPatternFilters,
  evidenceOptions,
  getActiveFilterCount,
  getPatternFilterOptions,
  matchesPatternFilters,
  priorityOptions,
  reviewOptions,
} from "@/lib/intelligence-library/pattern-filters";
import {
  ChipGroup,
  ClearButton,
  DateInputs,
  ExpandableFilter,
  FilterChip,
  FilterGroup,
  FilterOptions,
  MoreFilters,
} from "./FilterControls";
import LibraryToolbar from "./LibraryToolbar";
import { FilterBody, FilterHeader } from "./styles";

export default function PatternToolbar({
  patterns,
  appliedFilters,
  onApply,
  referenceDate,
  searchInput,
  sort,
  onSortChange,
}: {
  patterns: EmergingPattern[];
  appliedFilters: PatternFilters;
  onApply: (filters: PatternFilters) => void;
  referenceDate: Date;
  searchInput: InputHTMLAttributes<HTMLInputElement>;
  sort: string;
  onSortChange: (sort: string) => void;
}) {
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const matchingDraftCount = useMemo(
    () =>
      patterns.filter(p =>
        matchesPatternFilters(p, draftFilters, referenceDate),
      ).length,
    [patterns, draftFilters, referenceDate],
  );
  const toggleFilter = (
    key:
      | "priorities"
      | "evidence"
      | "review"
      | "topic"
      | "platform"
      | "population",
    value: string,
  ) =>
    setDraftFilters(current => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter(item => item !== value)
        : [...current[key], value],
    }));
  const selectedFilterCount = getActiveFilterCount(appliedFilters);
  const filterOptions = getPatternFilterOptions(patterns);
  return (
    <LibraryToolbar
      searchInput={searchInput}
      filterCount={selectedFilterCount}
      filterLabel="Pattern filters"
      onFilterDismiss={() => setDraftFilters(appliedFilters)}
      sort={sort}
      sortOptions={["Most recent", "Oldest", "Most supporting items"]}
      onSortChange={onSortChange}
      applyLabel={`Show ${matchingDraftCount} result${matchingDraftCount === 1 ? "" : "s"}`}
      onApplyFilters={() => onApply(draftFilters)}
      filterContent={
        <>
          <FilterHeader>
            <strong>Filters</strong>
            <ClearButton
              onClick={() => setDraftFilters(emptyPatternFilters)}
              type="button"
            >
              Clear all
            </ClearButton>
          </FilterHeader>
          <FilterBody>
            <FilterGroup label="Date">
              <ChipGroup>
                {dateOptions.map(value => (
                  <FilterChip
                    $active={draftFilters.date === value}
                    aria-pressed={draftFilters.date === value}
                    key={value}
                    onClick={() =>
                      setDraftFilters(current => ({
                        ...current,
                        date: current.date === value ? "" : value,
                        customFrom:
                          value === "Custom date range" &&
                          current.date !== value
                            ? current.customFrom
                            : "",
                        customTo:
                          value === "Custom date range" &&
                          current.date !== value
                            ? current.customTo
                            : "",
                      }))
                    }
                    type="button"
                  >
                    {value}
                  </FilterChip>
                ))}
              </ChipGroup>
              {draftFilters.date === "Custom date range" && (
                <DateInputs>
                  <input
                    aria-label="From date"
                    onChange={event =>
                      setDraftFilters(current => ({
                        ...current,
                        customFrom: event.target.value,
                      }))
                    }
                    type="date"
                    value={draftFilters.customFrom}
                  />
                  <input
                    aria-label="To date"
                    onChange={event =>
                      setDraftFilters(current => ({
                        ...current,
                        customTo: event.target.value,
                      }))
                    }
                    type="date"
                    value={draftFilters.customTo}
                  />
                </DateInputs>
              )}
            </FilterGroup>
            <FilterOptions
              label="Priority"
              options={[...priorityOptions]}
              selected={draftFilters.priorities}
              onToggle={value => toggleFilter("priorities", value)}
            />
            <FilterOptions
              label="Evidence"
              options={[...evidenceOptions]}
              selected={draftFilters.evidence}
              onToggle={value => toggleFilter("evidence", value)}
            />
            <FilterOptions
              label="Review"
              options={[...reviewOptions]}
              selected={draftFilters.review}
              onToggle={value => toggleFilter("review", value)}
            />
            <MoreFilters>
              <ExpandableFilter
                label="Topic"
                options={filterOptions.topic}
                selected={draftFilters.topic}
                onToggle={value => toggleFilter("topic", value)}
              />
              <ExpandableFilter
                label="Platform"
                options={filterOptions.platform}
                selected={draftFilters.platform}
                onToggle={value => toggleFilter("platform", value)}
              />
              <ExpandableFilter
                label="Population"
                options={filterOptions.population}
                selected={draftFilters.population}
                onToggle={value => toggleFilter("population", value)}
              />
            </MoreFilters>
          </FilterBody>
        </>
      }
    />
  );
}
