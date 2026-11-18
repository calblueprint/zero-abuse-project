"use client";

import type { IntelligenceLibraryFilterOptions } from "@/db/queries/intelligence-library";
import type { IntelligenceFilters } from "@/lib/intelligence-library/filters";
import { useRef, useState } from "react";
import { intelligenceSortOptions } from "@/lib/intelligence-library/filters";
import {
  ClearButton,
  DateInputs,
  ExpandableFilter,
  FilterGroup,
  MoreFilters,
} from "./FilterControls";
import LibraryToolbar from "./LibraryToolbar";
import { FilterBody, FilterHeader } from "./styles";

type FilterKey =
  | "exploitationTypes"
  | "platforms"
  | "technologies"
  | "affectedPopulations"
  | "offenderTactics"
  | "geographies"
  | "intelTypes"
  | "zapRelevances"
  | "sourceIds";

type FilterDefinition = {
  key: FilterKey;
  label: string;
  name: string;
  options: string[];
};

const formatDateInput = (date: Date | undefined) =>
  date ? date.toISOString().slice(0, 10) : "";

export default function ItemToolbar({
  filters,
  options,
  action,
}: {
  filters: IntelligenceFilters;
  options: IntelligenceLibraryFilterOptions;
  action: string;
}) {
  const sortInputRef = useRef<HTMLInputElement>(null);
  const appliedDraft = {
    ...filters,
    publishedFrom: formatDateInput(filters.publishedFrom),
    publishedTo: formatDateInput(filters.publishedTo),
  };
  const [draft, setDraft] = useState(appliedDraft);
  const toggleFilter = (key: FilterKey, value: string) =>
    setDraft(current => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter(entry => entry !== value)
        : [...current[key], value],
    }));
  const taxonomyFilters: FilterDefinition[] = [
    {
      label: "Exploitation type",
      name: "exploitationType",
      key: "exploitationTypes",
      options: options.exploitationTypes,
    },
    {
      label: "Platform",
      name: "platform",
      key: "platforms",
      options: options.platforms,
    },
    {
      label: "Technology",
      name: "technology",
      key: "technologies",
      options: options.technologies,
    },
    {
      label: "Affected population",
      name: "affectedPopulation",
      key: "affectedPopulations",
      options: options.affectedPopulations,
    },
    {
      label: "Offender tactic",
      name: "offenderTactic",
      key: "offenderTactics",
      options: options.offenderTactics,
    },
    {
      label: "Geography",
      name: "geography",
      key: "geographies",
      options: options.geographies,
    },
    {
      label: "Intelligence type",
      name: "intelType",
      key: "intelTypes",
      options: options.intelTypes,
    },
    {
      label: "ZAP relevance",
      name: "zapRelevance",
      key: "zapRelevances",
      options: options.zapRelevances,
    },
    {
      key: "sourceIds",
      label: "Source",
      name: "sourceId",
      options: options.sources.map(source => source.sourceId),
    },
  ];
  const filterCount =
    taxonomyFilters.filter(filter => filters[filter.key].length > 0).length +
    Number(Boolean(filters.publishedFrom || filters.publishedTo));

  return (
    <form
      action={action}
      method="get"
      role="search"
      aria-label="Search and filter intelligence items"
    >
      <input name="view" type="hidden" value="items" />
      <input
        name="sort"
        type="hidden"
        defaultValue={filters.sort}
        ref={sortInputRef}
      />
      <LibraryToolbar
        searchInput={{
          name: "q",
          defaultValue: filters.search,
          "aria-label": "Search intelligence items",
          placeholder: "Search intelligence items",
        }}
        filterCount={filterCount}
        filterLabel="Intelligence item filters"
        onFilterDismiss={() => setDraft(appliedDraft)}
        sort={filters.sort}
        sortOptions={intelligenceSortOptions}
        onSortChange={value => {
          const input = sortInputRef.current;
          if (input) {
            input.value = value;
            input.form?.requestSubmit();
          }
        }}
        applyLabel="Apply filters"
        applyType="submit"
        filterContent={
          <>
            <FilterHeader>
              <strong>Filters</strong>
              <ClearButton as="a" href={`${action}?view=items`}>
                Clear all
              </ClearButton>
            </FilterHeader>
            <FilterBody>
              <FilterGroup label="Date">
                <DateInputs>
                  <input
                    name="publishedFrom"
                    type="date"
                    aria-label="Published from (UTC)"
                    value={draft.publishedFrom}
                    onChange={event =>
                      setDraft(current => ({
                        ...current,
                        publishedFrom: event.target.value,
                      }))
                    }
                  />
                  <input
                    name="publishedTo"
                    type="date"
                    aria-label="Published to (UTC, inclusive)"
                    value={draft.publishedTo}
                    onChange={event =>
                      setDraft(current => ({
                        ...current,
                        publishedTo: event.target.value,
                      }))
                    }
                  />
                </DateInputs>
              </FilterGroup>
              <MoreFilters>
                {taxonomyFilters.map(filter => (
                  <div key={filter.name}>
                    {draft[filter.key].map(value => (
                      <input
                        type="hidden"
                        key={value}
                        name={filter.name}
                        value={value}
                      />
                    ))}
                    <ExpandableFilter
                      label={filter.label}
                      options={filter.options}
                      selected={draft[filter.key]}
                      onToggle={value => toggleFilter(filter.key, value)}
                      optionLabel={
                        filter.key === "sourceIds"
                          ? value =>
                              options.sources.find(
                                source => source.sourceId === value,
                              )?.name ?? value
                          : undefined
                      }
                    />
                  </div>
                ))}
              </MoreFilters>
            </FilterBody>
          </>
        }
      />
    </form>
  );
}
