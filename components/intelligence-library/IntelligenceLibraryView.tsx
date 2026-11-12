"use client";

import type {
  IntelligenceLibraryFilterOptions,
  IntelligenceLibraryItem,
} from "@/db/queries/intelligence-library";
import type { EmergingPattern } from "@/lib/intelligence-library/emerging-patterns";
import type { IntelligenceFilters } from "@/lib/intelligence-library/filters";
import type { PatternFilters } from "@/lib/intelligence-library/pattern-filters";
import { useMemo, useState } from "react";
import styled from "styled-components";
import AppShell from "@/components/AppShell";
import {
  emptyPatternFilters,
  matchesPatternFilters,
} from "@/lib/intelligence-library/pattern-filters";
import COLORS from "@/styles/colors";
import IntelligenceItemsView from "./IntelligenceItemsView";
import LibraryStatusTabs from "./LibraryStatusTabs";
import PatternCard from "./PatternCard";
import PatternToolbar from "./PatternToolbar";
import {
  BaseButton,
  CONTROL_BORDER,
  PATTERN_COLUMNS,
  PrimaryButton,
} from "./styles";

type Status =
  "All patterns" | "Needs your review" | "Saved" | "Confirmed" | "Archived";
const PAGE_SIZE = 4;
const statusLabels: Status[] = [
  "All patterns",
  "Needs your review",
  "Saved",
  "Confirmed",
  "Archived",
];

export default function IntelligenceLibraryView({
  initialPatterns,
  intelligenceItems,
  itemFilters,
  itemFilterOptions,
  initialView = "patterns",
  firstName,
  lastName,
  isAdmin,
  referenceDate = new Date(),
}: {
  initialPatterns: EmergingPattern[];
  intelligenceItems: IntelligenceLibraryItem[];
  itemFilters: IntelligenceFilters;
  itemFilterOptions: IntelligenceLibraryFilterOptions;
  initialView?: "patterns" | "items";
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  referenceDate?: Date;
}) {
  const [view, setView] = useState<"patterns" | "items">(initialView);
  const [hasViewedItems, setHasViewedItems] = useState(initialView === "items");
  const [status, setStatus] = useState<Status>("All patterns");
  const [sort, setSort] = useState<string>("Most recent");
  const [search, setSearch] = useState("");
  const [patterns, setPatterns] = useState(initialPatterns);
  const [page, setPage] = useState(0);
  const [appliedFilters, setAppliedFilters] =
    useState<PatternFilters>(emptyPatternFilters);
  const counts = useMemo(
    () => ({
      "All patterns": patterns.length,
      "Needs your review": patterns.filter(
        p => p.reviewStatus === "Needs review" && !p.archived,
      ).length,
      Saved: patterns.filter(p => p.saved && !p.archived).length,
      Confirmed: patterns.filter(
        p => p.reviewStatus === "Confirmed" && !p.archived,
      ).length,
      Archived: patterns.filter(p => p.archived).length,
    }),
    [patterns],
  );
  const searchedPatterns = useMemo(
    () =>
      patterns.filter(p =>
        [p.title, p.description, p.topic, p.platform, p.population].some(
          value => value.toLowerCase().includes(search.trim().toLowerCase()),
        ),
      ),
    [patterns, search],
  );
  const globallyFiltered = useMemo(
    () =>
      searchedPatterns.filter(p =>
        matchesPatternFilters(p, appliedFilters, referenceDate),
      ),
    [searchedPatterns, appliedFilters, referenceDate],
  );
  const filtered = useMemo(
    () =>
      globallyFiltered.filter(p =>
        status === "Needs your review"
          ? p.reviewStatus === "Needs review" && !p.archived
          : status === "Saved"
            ? p.saved && !p.archived
            : status === "Confirmed"
              ? p.reviewStatus === "Confirmed" && !p.archived
              : status === "Archived"
                ? Boolean(p.archived)
                : true,
      ),
    [globallyFiltered, status],
  );
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        sort === "Oldest"
          ? a.surfacedAt.localeCompare(b.surfacedAt)
          : sort === "Most supporting items"
            ? b.supportingItemCount - a.supportingItemCount
            : b.surfacedAt.localeCompare(a.surfacedAt),
      ),
    [filtered, sort],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const activePage = Math.min(page, totalPages - 1);
  const visible = sorted.slice(
    activePage * PAGE_SIZE,
    (activePage + 1) * PAGE_SIZE,
  );
  const first = sorted.length ? activePage * PAGE_SIZE + 1 : 0;
  const last = Math.min((activePage + 1) * PAGE_SIZE, sorted.length);
  const setActiveStatus = (next: Status) => {
    setStatus(next);
    setPage(0);
  };
  const selectSort = (next: string) => {
    setSort(next);
    setPage(0);
  };
  // TODO: Persist saved patterns per user; local changes currently reset on reload.
  const toggleSaved = (id: string) =>
    setPatterns(current =>
      current.map(p => (p.id === id ? { ...p, saved: !p.saved } : p)),
    );
  const applyFilters = (filters: PatternFilters) => {
    setAppliedFilters(filters);
    setStatus("All patterns");
    setPage(0);
  };

  return (
    <AppShell firstName={firstName} lastName={lastName} isAdmin={isAdmin}>
      <Panel aria-labelledby="intelligence-library-title">
        <PageHeader>
          <Title id="intelligence-library-title">Intelligence library</Title>
          <LibrarySwitch aria-label="Library view">
            <SwitchOption
              $active={view === "patterns"}
              onClick={() => setView("patterns")}
              type="button"
            >
              Emerging patterns <MutedCount>{patterns.length}</MutedCount>
            </SwitchOption>
            <SwitchOption
              $active={view === "items"}
              onClick={() => {
                setView("items");
                setHasViewedItems(true);
              }}
              type="button"
            >
              Intelligence items{" "}
              <MutedCount>{intelligenceItems.length}</MutedCount>
            </SwitchOption>
          </LibrarySwitch>
          <HeaderSpacer />
          {/* TODO: Open the pattern creation flow when it is implemented. */}
          <PrimaryButton type="button">New pattern</PrimaryButton>
        </PageHeader>
        <div hidden={view !== "items"}>
          {hasViewedItems && (
            <IntelligenceItemsView
              items={intelligenceItems}
              filters={itemFilters}
              options={itemFilterOptions}
              action="/intelligence-library"
              showTitle={false}
            />
          )}
        </div>
        {view === "patterns" && (
          <>
            <PatternToolbar
              patterns={searchedPatterns}
              appliedFilters={appliedFilters}
              onApply={applyFilters}
              referenceDate={referenceDate}
              searchInput={{
                "aria-label": "Search emerging patterns",
                placeholder: "Search emerging patterns",
                value: search,
                onChange: event => {
                  setSearch(event.target.value);
                  setPage(0);
                },
              }}
              sort={sort}
              onSortChange={selectSort}
            />
            <LibraryStatusTabs
              label="Pattern status"
              statuses={statusLabels}
              status={status}
              counts={counts}
              onChange={setActiveStatus}
            />
            <Results aria-label="Emerging patterns">
              <TableHeader>
                <span>Emerging pattern</span>
                <span>Supporting items</span>
                <span>Priority</span>
                <span>Review status</span>
              </TableHeader>
              {visible.map(pattern => (
                <PatternCard
                  key={pattern.id}
                  onToggleSaved={toggleSaved}
                  pattern={pattern}
                />
              ))}
              {!visible.length && (
                <EmptyState>No patterns in this view.</EmptyState>
              )}
            </Results>
            <Pagination>
              <PaginationText>
                Showing {first} to {last} of {sorted.length}
              </PaginationText>
              <SecondaryButton
                disabled={activePage === 0}
                onClick={() => setPage(Math.max(0, activePage - 1))}
                type="button"
              >
                Previous
              </SecondaryButton>
              <SecondaryButton
                disabled={activePage >= totalPages - 1}
                onClick={() =>
                  setPage(Math.min(totalPages - 1, activePage + 1))
                }
                type="button"
              >
                Next
              </SecondaryButton>
            </Pagination>
          </>
        )}
      </Panel>
    </AppShell>
  );
}

const Panel = styled.main`
  display: flex;
  min-height: calc(100vh - 72px);
  width: 100%;
  flex-direction: column;
  gap: 24px;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 24px;
  background: ${COLORS.surface};
  box-shadow:
    0 8px 120px rgba(77, 117, 204, 0.07),
    0 4px 40px -2px rgba(77, 117, 204, 0.07);
  padding: 36px 48px 24px;
  @media (max-width: 720px) {
    padding: 28px 20px 20px;
  }
`;
const PageHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 28px;
  min-width: 0;
  @media (max-width: 800px) {
    flex-wrap: wrap;
    gap: 16px;
  }
`;
const Title = styled.h1`
  margin: 0;
  color: ${COLORS.inkText};
  font-size: 34px;
  font-weight: 400;
  letter-spacing: -0.4px;
  line-height: 42px;
  white-space: nowrap;
`;
const LibrarySwitch = styled.div`
  display: flex;
  gap: 2px;
  border-radius: 999px;
  background: #f3f5fa;
  padding: 3px;
  white-space: nowrap;
  overflow: auto;
`;
const SwitchOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  border: ${p => (p.$active ? `1px solid ${COLORS.borderDefault}` : "1px solid transparent")};
  border-radius: 999px;
  background: ${p => (p.$active ? COLORS.surface : "transparent")};
  box-shadow: ${p => (p.$active ? "0 1px 3px rgba(15,27,45,.06)" : "none")};
  padding: 7px 14px;
  color: ${p => (p.$active ? COLORS.inkText : COLORS.secondaryText)};
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  cursor: pointer;
`;
const MutedCount = styled.span`
  color: ${COLORS.mutedText};
  font-size: 13px;
  line-height: 18px;
`;
const HeaderSpacer = styled.div`
  flex: 1 1 0;
  min-width: 12px;
  @media (max-width: 800px) {
    display: none;
  }
`;
const Results = styled.section`
  display: grid;
  gap: 14px;
`;
const TableHeader = styled.div`
  display: grid;
  grid-template-columns: ${PATTERN_COLUMNS};
  gap: 24px;
  height: 40px;
  align-items: center;
  padding: 0 20px;
  color: ${COLORS.mutedText};
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  @media (max-width: 920px) {
    display: none;
  }
`;
const EmptyState = styled.p`
  margin: 0;
  border-radius: 14px;
  background: #f0f3f7;
  padding: 32px 20px;
  color: ${COLORS.secondaryText};
  font-size: 14px;
  text-align: center;
`;
const Pagination = styled.footer`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const PaginationText = styled.p`
  flex: 1;
  margin: 0;
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
`;
const SecondaryButton = styled(BaseButton)`
  border: 1px solid ${CONTROL_BORDER};
  background: ${COLORS.surface};
  color: ${COLORS.inkText};
`;
