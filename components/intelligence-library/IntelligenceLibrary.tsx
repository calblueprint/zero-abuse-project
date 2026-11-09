"use client";

import type {
  IntelligenceLibraryFilterOptions,
  IntelligenceLibraryItem,
} from "@/db/queries/intelligence-library";
import type { IntelligenceFilters } from "@/lib/intelligence-library/filters";
import { useRef, useState } from "react";
import styled from "styled-components";
import { intelligenceSortOptions } from "@/lib/intelligence-library/filters";
import COLORS from "@/styles/colors";
import {
  ClearButton,
  DateInputs,
  ExpandableFilter,
  FilterGroup,
  MoreFilters,
} from "./FilterControls";
import LibraryStatusTabs from "./LibraryStatusTabs";
import LibraryToolbar from "./LibraryToolbar";
import { BookmarkIcon, Description, FilterBody, FilterHeader } from "./styles";
import ViewSourceButton from "./ViewSourceButton";

type ItemStatus = "All intelligence" | "Saved" | "Confirmed" | "Archived";
const itemStatuses: ItemStatus[] = [
  "All intelligence",
  "Saved",
  "Confirmed",
  "Archived",
];
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

type IntelligenceLibraryProps = {
  filters: IntelligenceFilters;
  items: IntelligenceLibraryItem[];
  options: IntelligenceLibraryFilterOptions;
  action?: string;
  showTitle?: boolean;
};

const formatDateInput = (date: Date | undefined) =>
  date ? date.toISOString().slice(0, 10) : "";

export default function IntelligenceLibrary({
  filters,
  items,
  options,
  action = "/intelligence",
  showTitle = true,
}: IntelligenceLibraryProps) {
  const sortInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ItemStatus>("All intelligence");
  // TODO: Persist item bookmarks per user; local saves reset on page reload.
  const [savedIds, setSavedIds] = useState<string[]>([]);
  // TODO: Load confirmed/archived item states from the real provider when available.
  const counts = {
    "All intelligence": items.length,
    Saved: items.filter(item => savedIds.includes(item.itemId)).length,
    Confirmed: 0,
    Archived: 0,
  };
  const visibleItems =
    status === "All intelligence"
      ? items
      : status === "Saved"
        ? items.filter(item => savedIds.includes(item.itemId))
        : [];
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
    <Container
      as={showTitle ? "main" : "section"}
      $standalone={showTitle}
      aria-label="Intelligence items"
    >
      {showTitle && <h1>Intelligence Library</h1>}
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
      <LibraryStatusTabs
        label="Intelligence item status"
        statuses={itemStatuses}
        status={status}
        counts={counts}
        onChange={setStatus}
      />
      <TableScroll>
        <ItemsTable>
          <thead>
            <tr>
              <th scope="col">Intelligence item</th>
              <th scope="col">Source</th>
              <th scope="col">Published (UTC)</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map(item => (
              <tr key={item.itemId}>
                <td>
                  <ItemTitle>
                    {item.title ?? "Untitled intelligence item"}
                  </ItemTitle>
                  {item.tldr && <Description>{item.tldr}</Description>}
                </td>
                <td>{item.sourceName}</td>
                <td>
                  {item.publishedAt ? (
                    <time dateTime={item.publishedAt}>
                      {new Date(item.publishedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </time>
                  ) : (
                    "Unknown date"
                  )}
                </td>
                <td>
                  <Actions>
                    <ViewSourceButton itemId={item.itemId} />
                    <Bookmark
                      type="button"
                      aria-label={
                        savedIds.includes(item.itemId)
                          ? "Remove saved intelligence item"
                          : "Save intelligence item"
                      }
                      aria-pressed={savedIds.includes(item.itemId)}
                      onClick={() =>
                        setSavedIds(current =>
                          current.includes(item.itemId)
                            ? current.filter(id => id !== item.itemId)
                            : [...current, item.itemId],
                        )
                      }
                    >
                      <BookmarkIcon filled={savedIds.includes(item.itemId)} />
                    </Bookmark>
                  </Actions>
                </td>
              </tr>
            ))}
          </tbody>
        </ItemsTable>
      </TableScroll>
      {!visibleItems.length && (
        <EmptyState>
          {status === "All intelligence"
            ? "No intelligence items match your search and filters."
            : `No ${status.toLowerCase()} intelligence items.`}
        </EmptyState>
      )}
    </Container>
  );
}

const Container = styled.section<{ $standalone: boolean }>`
  display: grid;
  min-width: 0;
  gap: 24px;
  ${p => p.$standalone && "margin: 0 auto; max-width: 1200px; padding: 2rem;"}
`;
const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;
const Bookmark = styled.button`
  display: inline-flex;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
`;
const TableScroll = styled.div`
  min-width: 0;
  overflow-x: auto;
`;
const ItemsTable = styled.table`
  width: 100%;
  min-width: 680px;
  border-collapse: separate;
  border-spacing: 0 14px;
  text-align: left;
  th {
    padding: 0 20px;
    color: ${COLORS.mutedText};
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  td {
    padding: 24px 20px;
    background: #f0f3f7;
    color: ${COLORS.secondaryText};
    font-size: 14px;
    line-height: 20px;
    vertical-align: top;
  }
  td:first-child {
    width: 65%;
    min-width: 260px;
    border-radius: 14px 0 0 14px;
  }
  td:last-child {
    border-radius: 0 14px 14px 0;
    white-space: nowrap;
  }
`;
const ItemTitle = styled.h3`
  margin: 0 0 6px;
  color: ${COLORS.inkText};
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
`;
const EmptyState = styled.p`
  margin: 0;
  border-radius: 14px;
  background: #f0f3f7;
  padding: 32px 20px;
  color: ${COLORS.secondaryText};
  text-align: center;
`;
