"use client";

import type { IntelligenceLibraryItem } from "@/db/queries/intelligence-library";
import type { EmergingPattern } from "@/lib/intelligence-library/emerging-patterns";
import type { PatternFilters } from "@/lib/intelligence-library/pattern-filters";
import { useMemo, useState } from "react";
import styled from "styled-components";
import ViewSourceButton from "@/components/intelligence-library/ViewSourceButton";
import TopBar from "@/components/TopBar";
import {
  emptyPatternFilters,
  matchesPatternFilters,
} from "@/lib/intelligence-library/pattern-filters";
import COLORS from "@/styles/colors";
import { dmSans } from "@/styles/fonts";
import PatternCard from "./PatternCard";
import PatternFiltersPopover from "./PatternFiltersPopover";
import {
  BaseButton,
  ChevronIcon,
  CONTROL_BORDER,
  Description,
  IconBox,
  PATTERN_COLUMNS,
  PillButton,
  PrimaryButton,
} from "./styles";

type Status =
  "All patterns" | "Needs your review" | "Saved" | "Confirmed" | "Archived";
type SortOption = "Most recent" | "Oldest" | "Most supporting items";
const PAGE_SIZE = 4;
const statusLabels: Status[] = [
  "All patterns",
  "Needs your review",
  "Saved",
  "Confirmed",
  "Archived",
];

export default function IntelligenceLibraryPage({
  initialPatterns,
  intelligenceItems,
  firstName,
  lastName,
  isAdmin,
  referenceDate = new Date(),
}: {
  initialPatterns: EmergingPattern[];
  intelligenceItems: IntelligenceLibraryItem[];
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  referenceDate?: Date;
}) {
  const [view, setView] = useState<"patterns" | "items">("patterns");
  const [status, setStatus] = useState<Status>("All patterns");
  const [sort, setSort] = useState<SortOption>("Most recent");
  const [sortOpen, setSortOpen] = useState(false);
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
  const globallyFiltered = useMemo(
    () =>
      patterns.filter(p =>
        matchesPatternFilters(p, appliedFilters, referenceDate),
      ),
    [patterns, appliedFilters, referenceDate],
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
  const selectSort = (next: SortOption) => {
    setSort(next);
    setSortOpen(false);
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
    <Canvas className={dmSans.className}>
      <TopBar firstName={firstName} lastName={lastName} isAdmin={isAdmin} />
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
              onClick={() => setView("items")}
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
        {view === "items" ? (
          <IntelligenceItemsList items={intelligenceItems} />
        ) : (
          <>
            <Toolbar>
              <SearchField>
                <SearchIcon />
                {/* TODO: Connect the search input to pattern search. */}
                <input
                  aria-label="Search emerging patterns"
                  placeholder="Search emerging patterns"
                />
              </SearchField>
              <PatternFiltersPopover
                patterns={patterns}
                appliedFilters={appliedFilters}
                onApply={applyFilters}
                referenceDate={referenceDate}
              />
              <ToolbarSpacer />
              <SortWrap>
                <SortButton
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen(open => !open)}
                  type="button"
                >
                  <span>Sort</span>
                  <strong>{sort}</strong>
                  <ChevronIcon />
                </SortButton>
                {sortOpen && (
                  <SortMenu aria-label="Sort patterns">
                    {(
                      [
                        "Most recent",
                        "Oldest",
                        "Most supporting items",
                      ] as SortOption[]
                    ).map(option => (
                      <SortMenuItem
                        $selected={sort === option}
                        key={option}
                        onClick={() => selectSort(option)}
                        type="button"
                      >
                        {option}
                      </SortMenuItem>
                    ))}
                  </SortMenu>
                )}
              </SortWrap>
            </Toolbar>
            <StatusTabs aria-label="Pattern status">
              {statusLabels.map(label => (
                <StatusTab
                  $active={status === label}
                  key={label}
                  onClick={() => setActiveStatus(label)}
                  type="button"
                >
                  {label}
                  {label !== "Archived" && (
                    <StatusCount $tone={label}>{counts[label]}</StatusCount>
                  )}
                </StatusTab>
              ))}
            </StatusTabs>
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
    </Canvas>
  );
}

function IntelligenceItemsList({
  items,
}: {
  items: IntelligenceLibraryItem[];
}) {
  if (!items.length) {
    return (
      <ItemsPlaceholder>No intelligence items are available.</ItemsPlaceholder>
    );
  }

  return (
    <ItemsResults aria-label="Intelligence items">
      {items.map(item => (
        <IntelligenceItemCard key={item.itemId}>
          <ItemTitle>{item.title ?? "Untitled intelligence item"}</ItemTitle>
          {item.tldr && <Description>{item.tldr}</Description>}
          <ItemMeta>
            {item.sourceName}
            {item.publishedAt &&
              ` · ${new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`}
          </ItemMeta>
          <ViewSourceButton itemId={item.itemId} />
        </IntelligenceItemCard>
      ))}
    </ItemsResults>
  );
}

function SearchIcon() {
  return (
    <IconBox viewBox="0 0 24 24">
      <circle cx="10.8" cy="10.8" r="5.8" />
      <path d="m15.2 15.2 4.2 4.2" />
    </IconBox>
  );
}
const Canvas = styled.div`
  min-height: 100vh;
  background: ${COLORS.canvas};
  padding: 0 12px 12px;
  color: ${COLORS.inkText};
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid ${COLORS.actionNavy};
    outline-offset: 2px;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;
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
const ItemsPlaceholder = styled.div`
  display: grid;
  min-height: 320px;
  place-items: center;
  border: 1px dashed ${CONTROL_BORDER};
  border-radius: 14px;
  color: ${COLORS.secondaryText};
  font-size: 14px;
`;
const ItemsResults = styled.section`
  display: grid;
  gap: 14px;
`;
const IntelligenceItemCard = styled.article`
  display: grid;
  gap: 6px;
  border-radius: 14px;
  background: #f0f3f7;
  padding: 24px 20px;
`;
const ItemTitle = styled.h2`
  margin: 0;
  color: ${COLORS.inkText};
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.15px;
  line-height: 24px;
`;
const ItemMeta = styled.p`
  margin: 2px 0 0;
  color: ${COLORS.mutedText};
  font-size: 13px;
  line-height: 18px;
`;
const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`;
const SearchField = styled.label`
  display: flex;
  width: min(480px, 100%);
  min-width: 220px;
  height: 40px;
  align-items: center;
  gap: 10px;
  border: 1px solid ${CONTROL_BORDER};
  border-radius: 999px;
  background: ${COLORS.surface};
  padding: 0 16px;
  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: ${COLORS.inkText};
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
  }
  input::placeholder {
    color: ${COLORS.mutedText};
    opacity: 1;
  }
`;
const ToolbarSpacer = styled.div`
  flex: 1 1 0;
  min-width: 12px;
  @media (max-width: 640px) {
    display: none;
  }
`;
const SortWrap = styled.div`
  position: relative;
  margin-left: auto;
`;
const SortButton = styled(PillButton)`
  height: 36px;
  gap: 6px;
  padding: 0 12px 0 16px;
  font-weight: 400;
  span {
    color: ${COLORS.secondaryText};
  }
  strong {
    font-weight: 500;
  }
`;
const SortMenu = styled.div`
  position: absolute;
  z-index: 2;
  right: 0;
  top: 42px;
  display: grid;
  min-width: 190px;
  overflow: hidden;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 12px;
  background: ${COLORS.surface};
  box-shadow: 0 8px 24px rgba(15, 27, 45, 0.12);
  padding: 4px;
`;
const SortMenuItem = styled.button<{ $selected: boolean }>`
  border: 0;
  border-radius: 8px;
  background: ${p => (p.$selected ? COLORS.canvas : "transparent")};
  padding: 9px 12px;
  text-align: left;
  color: ${COLORS.inkText};
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  cursor: pointer;
`;
const StatusTabs = styled.nav`
  display: flex;
  gap: 28px;
  overflow-x: auto;
  border-bottom: 1px solid ${COLORS.borderDefault};
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;
const StatusTab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  height: 44px;
  flex: none;
  align-items: center;
  gap: 8px;
  border: 0;
  border-bottom: ${p => (p.$active ? `2px solid ${COLORS.actionNavy}` : "2px solid transparent")};
  background: transparent;
  padding: 0;
  color: ${p => (p.$active ? COLORS.actionNavy : COLORS.secondaryText)};
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;
`;
const StatusCount = styled.span<{ $tone: Status }>`
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  ${p => (p.$tone === "Needs your review" ? "background:#fbeda3;color:#5c4800;" : p.$tone === "Saved" ? "background:#f8d9cf;color:#8c3523;" : p.$tone === "Confirmed" ? "background:#d5ecdc;color:#1b6140;" : `background:#f3f6fa;color:${COLORS.mutedText};`)}
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
