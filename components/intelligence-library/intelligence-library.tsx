"use client";

import type { IntelligenceLibraryItem } from "@/db/queries/intelligence-library";
import type {
  EmergingPattern,
  PatternPriority,
} from "@/lib/intelligence-library/emerging-patterns";
import type { PatternFilters } from "@/lib/intelligence-library/pattern-filters";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
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
  avatarInitials,
  referenceDate = new Date(),
}: {
  initialPatterns: EmergingPattern[];
  intelligenceItems: IntelligenceLibraryItem[];
  avatarInitials: string | null;
  referenceDate?: Date;
}) {
  const [view, setView] = useState<"patterns" | "items">("patterns");
  const [status, setStatus] = useState<Status>("All patterns");
  const [sort, setSort] = useState<SortOption>("Most recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [patterns, setPatterns] = useState(initialPatterns);
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const [draftFilters, setDraftFilters] =
    useState<PatternFilters>(emptyPatternFilters);
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
  const matchingDraftCount = useMemo(
    () =>
      patterns.filter(p =>
        matchesPatternFilters(p, draftFilters, referenceDate),
      ).length,
    [patterns, draftFilters, referenceDate],
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
  const toggleSaved = (id: string) =>
    setPatterns(current =>
      current.map(p => (p.id === id ? { ...p, saved: !p.saved } : p)),
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
  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setStatus("All patterns");
    setPage(0);
    setFiltersOpen(false);
  };
  const resetFilters = () => setDraftFilters(emptyPatternFilters);
  const selectedFilterCount = getActiveFilterCount(appliedFilters);
  const filterOptions = getPatternFilterOptions(patterns);
  const closeFilters = useCallback(() => {
    setDraftFilters(appliedFilters);
    setFiltersOpen(false);
    filterTriggerRef.current?.focus();
  }, [appliedFilters]);

  useEffect(() => {
    if (!filtersOpen) return;
    const dismiss = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape")
        closeFilters();
      if (
        event instanceof MouseEvent &&
        !filterWrapRef.current?.contains(event.target as Node)
      )
        closeFilters();
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("mousedown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("mousedown", dismiss);
    };
  }, [filtersOpen, closeFilters]);

  return (
    <Canvas>
      <TopBar>
        <TopLeft>
          <ZapLogo>zap</ZapLogo>
          <IconButton aria-label="Toggle sidebar" type="button">
            <SidebarIcon />
          </IconButton>
        </TopLeft>
        <TopRight>
          <HelpButton type="button">Help</HelpButton>
          <Avatar
            aria-label={
              avatarInitials
                ? `User profile: ${avatarInitials}`
                : "User profile"
            }
          >
            {avatarInitials ?? <AvatarPlaceholder aria-hidden="true" />}
          </Avatar>
        </TopRight>
      </TopBar>
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
          <PrimaryButton type="button">New pattern</PrimaryButton>
        </PageHeader>
        {view === "items" ? (
          <IntelligenceItemsList items={intelligenceItems} />
        ) : (
          <>
            <Toolbar>
              <SearchField>
                <SearchIcon />
                <input
                  aria-label="Search emerging patterns"
                  placeholder="Search emerging patterns"
                />
              </SearchField>
              <FilterWrap ref={filterWrapRef}>
                <PillButton
                  aria-controls="pattern-filters-popover"
                  aria-expanded={filtersOpen}
                  aria-haspopup="dialog"
                  onClick={() =>
                    filtersOpen ? closeFilters() : setFiltersOpen(true)
                  }
                  ref={filterTriggerRef}
                  type="button"
                >
                  <SlidersIcon />
                  Filters{" "}
                  {selectedFilterCount > 0 && (
                    <FilterBadge>{selectedFilterCount}</FilterBadge>
                  )}
                </PillButton>
                {filtersOpen && (
                  <FiltersPopover
                    aria-label="Pattern filters"
                    id="pattern-filters-popover"
                    role="dialog"
                  >
                    <FilterHeader>
                      <strong>Filters</strong>
                      <ClearButton onClick={resetFilters} type="button">
                        Clear all
                      </ClearButton>
                    </FilterHeader>
                    <FilterBody>
                      <FilterGroup label="Date">
                        <ChipGroup>
                          {dateOptions.map(value => (
                            <FilterChip
                              $active={draftFilters.date === value}
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
                    <FilterFooter>
                      <PrimaryButton onClick={applyFilters} type="button">
                        Show {matchingDraftCount} results
                      </PrimaryButton>
                    </FilterFooter>
                  </FiltersPopover>
                )}
              </FilterWrap>
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
                onClick={() => setPage(p => Math.max(0, p - 1))}
                type="button"
              >
                Previous
              </SecondaryButton>
              <SecondaryButton
                disabled={activePage >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
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
        </IntelligenceItemCard>
      ))}
    </ItemsResults>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <FilterGroupWrap>
      <FilterLabel>{label}</FilterLabel>
      {children}
    </FilterGroupWrap>
  );
}
function FilterOptions({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <FilterGroup label={label}>
      <ChipGroup>
        {options.map(value => (
          <FilterChip
            $active={selected.includes(value)}
            key={value}
            onClick={() => onToggle(value)}
            type="button"
          >
            {value}
          </FilterChip>
        ))}
      </ChipGroup>
    </FilterGroup>
  );
}
function ExpandableFilter({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <MoreFilterRow>
      <button onClick={() => setOpen(value => !value)} type="button">
        <span>{label}</span>
        <span>{selected.length ? `${selected.length} selected` : "Any"}</span>
        <ChevronIcon />
      </button>
      {open && (
        <ChipGroup>
          {options.map(value => (
            <FilterChip
              $active={selected.includes(value)}
              key={value}
              onClick={() => onToggle(value)}
              type="button"
            >
              {value}
            </FilterChip>
          ))}
        </ChipGroup>
      )}
    </MoreFilterRow>
  );
}

function PatternCard({
  pattern,
  onToggleSaved,
}: {
  pattern: EmergingPattern;
  onToggleSaved: (id: string) => void;
}) {
  return (
    <PatternArticle>
      <PatternSummary>
        <PatternTitle>{pattern.title}</PatternTitle>
        <Description>{pattern.description}</Description>
        <Meta>
          Surfaced{" "}
          {new Date(`${pattern.surfacedAt}T00:00:00Z`).toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "short", timeZone: "UTC" },
          )}
        </Meta>
      </PatternSummary>
      <Evidence>
        <EvidenceTitle>
          Built from {pattern.supportingItemCount} items
        </EvidenceTitle>
        <Meta>{pattern.sourceCount} sources</Meta>
      </Evidence>
      <Priority priority={pattern.priority} />
      <ReviewCell>
        <ReviewLine>
          <ReviewDot $confirmed={pattern.reviewStatus === "Confirmed"} />
          {pattern.reviewStatus}
        </ReviewLine>
        {pattern.reviewedBy && <Meta>{pattern.reviewedBy}</Meta>}
      </ReviewCell>
      <Bookmark
        aria-label={pattern.saved ? "Remove saved pattern" : "Save pattern"}
        onClick={() => onToggleSaved(pattern.id)}
        type="button"
      >
        <BookmarkIcon filled={pattern.saved} />
      </Bookmark>
    </PatternArticle>
  );
}
function Priority({ priority }: { priority: PatternPriority }) {
  const filled = priority === "High" ? 3 : priority === "Moderate" ? 2 : 0;
  return (
    <PriorityCell>
      <PriorityBars aria-hidden="true">
        {[6, 9, 12].map((height, index) => (
          <PriorityBar $active={index < filled} $height={height} key={height} />
        ))}
      </PriorityBars>
      <PriorityText $muted={priority === "Unassessed"}>{priority}</PriorityText>
    </PriorityCell>
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
function SlidersIcon() {
  return (
    <IconBox viewBox="0 0 24 24">
      <path d="M4 7h16M4 17h16M9 4v6M15 14v6" />
    </IconBox>
  );
}
function ChevronIcon() {
  return (
    <SmallIcon viewBox="0 0 16 16">
      <path d="m4 6 4 4 4-4" />
    </SmallIcon>
  );
}
function SidebarIcon() {
  return (
    <SmallIcon viewBox="0 0 16 16">
      <rect height="11" rx="1.5" width="12" x="2" y="2.5" />
      <path d="M6 3v10" />
    </SmallIcon>
  );
}
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <SmallIcon $filled={filled} viewBox="0 0 16 16">
      <path d="M4 2.5h8v11l-4-2.5-4 2.5v-11Z" />
    </SmallIcon>
  );
}

const c = {
  ink: "#20252b",
  secondary: "#5f6875",
  muted: "#8791a0",
  navy: "#182c46",
  border: "#e1e5eb",
  control: "#d3d9e2",
  surface: "#fff",
  canvas: "#f3f5f8",
  card: "#f0f3f7",
};
const Canvas = styled.div`
  min-height: 100vh;
  background: ${c.canvas};
  padding: 0 12px 12px;
  color: ${c.ink};
  font-family: "DM Sans", Arial, sans-serif;
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid ${c.navy};
    outline-offset: 2px;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;
const TopBar = styled.header`
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 28px;
  justify-content: space-between;
`;
const TopLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;
const TopRight = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;
const ZapLogo = styled.span`
  padding: 0 6px;
  color: ${c.navy};
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.8px;
  line-height: 28px;
`;
const IconButton = styled.button`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
`;
const HelpButton = styled.button`
  border: 0;
  background: transparent;
  padding: 0;
  color: ${c.secondary};
  font: 400 14px/20px inherit;
  cursor: pointer;
`;
const Avatar = styled.span`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid ${c.border};
  border-radius: 999px;
  background: ${c.surface};
  color: ${c.secondary};
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
`;
const AvatarPlaceholder = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${c.muted};
`;
const Panel = styled.main`
  display: flex;
  min-height: calc(100vh - 72px);
  width: 100%;
  flex-direction: column;
  gap: 24px;
  border: 1px solid ${c.border};
  border-radius: 24px;
  background: ${c.surface};
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
  color: ${c.ink};
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
  border: ${p => (p.$active ? `1px solid ${c.border}` : "1px solid transparent")};
  border-radius: 999px;
  background: ${p => (p.$active ? c.surface : "transparent")};
  box-shadow: ${p => (p.$active ? "0 1px 3px rgba(15,27,45,.06)" : "none")};
  padding: 7px 14px;
  color: ${p => (p.$active ? c.ink : c.secondary)};
  font: 400 14px/20px inherit;
  cursor: pointer;
`;
const MutedCount = styled.span`
  color: ${c.muted};
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
const BaseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  padding: 10px 18px;
  font: 500 14px/20px inherit;
  white-space: nowrap;
  cursor: pointer;
  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;
const PrimaryButton = styled(BaseButton)`
  border: 1px solid ${c.navy};
  background: ${c.navy};
  color: #fff;
  @media (max-width: 800px) {
    margin-left: auto;
  }
`;
const ItemsPlaceholder = styled.div`
  display: grid;
  min-height: 320px;
  place-items: center;
  border: 1px dashed ${c.control};
  border-radius: 14px;
  color: ${c.secondary};
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
  background: ${c.card};
  padding: 24px 20px;
`;
const ItemTitle = styled.h2`
  margin: 0;
  color: ${c.ink};
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.15px;
  line-height: 24px;
`;
const ItemMeta = styled.p`
  margin: 2px 0 0;
  color: ${c.muted};
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
  border: 1px solid ${c.control};
  border-radius: 999px;
  background: ${c.surface};
  padding: 0 16px;
  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: ${c.ink};
    font: 400 14px/20px inherit;
  }
  input::placeholder {
    color: ${c.muted};
    opacity: 1;
  }
`;
const IconBox = styled.svg`
  width: 20px;
  height: 20px;
  flex: none;
  fill: none;
  stroke: ${c.secondary};
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
`;
const SmallIcon = styled.svg<{ $filled?: boolean }>`
  width: 16px;
  height: 16px;
  fill: ${p => (p.$filled ? c.navy : "none")};
  stroke: ${c.secondary};
  stroke-width: 1.35;
  stroke-linecap: round;
  stroke-linejoin: round;
`;
const PillButton = styled.button`
  display: inline-flex;
  height: 40px;
  align-items: center;
  gap: 8px;
  border: 1px solid ${c.control};
  border-radius: 999px;
  background: ${c.surface};
  padding: 0 16px 0 14px;
  color: ${c.ink};
  font: 500 14px/20px inherit;
  cursor: pointer;
`;
const FilterBadge = styled.span`
  border-radius: 999px;
  background: ${c.navy};
  padding: 1px 6px;
  color: #fff;
  font-size: 12px;
  line-height: 16px;
`;
const FilterWrap = styled.div`
  position: relative;
`;
const FiltersPopover = styled.div`
  position: absolute;
  z-index: 4;
  top: 48px;
  left: 0;
  width: 390px;
  max-height: calc(100vh - 130px);
  overflow: auto;
  border: 1px solid ${c.border};
  border-radius: 16px;
  background: ${c.surface};
  box-shadow:
    0 1px 4px rgba(15, 27, 45, 0.06),
    0 12px 32px -8px rgba(15, 27, 45, 0.16);
  @media (max-width: 500px) {
    position: fixed;
    inset: 72px 12px auto;
    width: auto;
    max-height: calc(100vh - 84px);
  }
`;
const FilterHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 18px 6px;
  color: ${c.ink};
  font-size: 14px;
  line-height: 20px;
`;
const ClearButton = styled.button`
  margin-left: auto;
  border: 0;
  background: transparent;
  color: ${c.muted};
  font: 400 13px/18px inherit;
  cursor: pointer;
`;
const FilterBody = styled.div`
  display: grid;
  gap: 16px;
  padding: 10px 18px 18px;
`;
const FilterGroupWrap = styled.div`
  display: grid;
  gap: 8px;
`;
const FilterLabel = styled.span`
  color: ${c.muted};
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
`;
const ChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;
const FilterChip = styled.button<{ $active: boolean }>`
  height: 30px;
  border: ${p => (p.$active ? `1px solid ${c.navy}` : `1px solid ${c.control}`)};
  border-radius: 999px;
  background: ${p => (p.$active ? c.navy : c.surface)};
  padding: 0 12px;
  color: ${p => (p.$active ? "#fff" : c.ink)};
  font: 500 13px/18px inherit;
  cursor: pointer;
`;
const DateInputs = styled.div`
  display: flex;
  gap: 6px;
  input {
    min-width: 0;
    width: 50%;
    height: 32px;
    border: 1px solid ${c.control};
    border-radius: 8px;
    padding: 0 8px;
    color: ${c.ink};
    font: 400 12px/16px inherit;
  }
`;
const MoreFilters = styled.div`
  overflow: hidden;
  border-radius: 12px;
  background: #f8fafc;
`;
const MoreFilterRow = styled.div`
  border-bottom: 1px solid #e8edf2;
  &:last-child {
    border-bottom: 0;
  }
  > button {
    display: flex;
    width: 100%;
    height: 40px;
    align-items: center;
    gap: 8px;
    border: 0;
    background: transparent;
    padding: 0 14px;
    color: ${c.ink};
    font: 400 14px/20px inherit;
    text-align: left;
    cursor: pointer;
  }
  > button span:nth-child(2) {
    margin-left: auto;
    color: ${c.muted};
    font-size: 13px;
  }
  ${ChipGroup} {
    padding: 0 14px 12px;
  }
`;
const FilterFooter = styled.div`
  border-top: 1px solid #e9edf2;
  padding: 14px 18px;
  ${PrimaryButton} {
    width: 100%;
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
    color: ${c.secondary};
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
  border: 1px solid ${c.border};
  border-radius: 12px;
  background: ${c.surface};
  box-shadow: 0 8px 24px rgba(15, 27, 45, 0.12);
  padding: 4px;
`;
const SortMenuItem = styled.button<{ $selected: boolean }>`
  border: 0;
  border-radius: 8px;
  background: ${p => (p.$selected ? c.canvas : "transparent")};
  padding: 9px 12px;
  text-align: left;
  color: ${c.ink};
  font: 400 14px/20px inherit;
  cursor: pointer;
`;
const StatusTabs = styled.nav`
  display: flex;
  gap: 28px;
  overflow-x: auto;
  border-bottom: 1px solid ${c.border};
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
  border-bottom: ${p => (p.$active ? `2px solid ${c.navy}` : "2px solid transparent")};
  background: transparent;
  padding: 0;
  color: ${p => (p.$active ? c.navy : c.secondary)};
  font: 500 14px/20px inherit;
  white-space: nowrap;
  cursor: pointer;
`;
const StatusCount = styled.span<{ $tone: Status }>`
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  ${p => (p.$tone === "Needs your review" ? "background:#fbeda3;color:#5c4800;" : p.$tone === "Saved" ? "background:#f8d9cf;color:#8c3523;" : p.$tone === "Confirmed" ? "background:#d5ecdc;color:#1b6140;" : `background:#f3f6fa;color:${c.muted};`)}
`;
const Results = styled.section`
  display: grid;
  gap: 14px;
`;
const columns = "minmax(260px, 1fr) 210px 128px 168px";
const TableHeader = styled.div`
  display: grid;
  grid-template-columns: ${columns};
  gap: 24px;
  height: 40px;
  align-items: center;
  padding: 0 20px;
  color: ${c.muted};
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  @media (max-width: 920px) {
    display: none;
  }
`;
const PatternArticle = styled.article`
  position: relative;
  display: grid;
  grid-template-columns: ${columns};
  gap: 24px;
  align-items: start;
  border-radius: 14px;
  background: ${c.card};
  padding: 24px 20px;
  @media (max-width: 920px) {
    grid-template-columns: minmax(0, 1fr) 180px;
  }
  @media (max-width: 580px) {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 20px 48px 20px 20px;
  }
`;
const PatternSummary = styled.div`
  display: grid;
  min-width: 0;
  gap: 6px;
`;
const PatternTitle = styled.h2`
  overflow: hidden;
  margin: 0;
  color: ${c.ink};
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.15px;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Description = styled.p`
  margin: 0;
  color: ${c.secondary};
  font-size: 14px;
  line-height: 20px;
`;
const Meta = styled.p`
  margin: 0;
  color: ${c.muted};
  font-size: 13px;
  line-height: 18px;
`;
const Evidence = styled.div`
  display: grid;
  gap: 4px;
  padding-top: 2px;
`;
const EvidenceTitle = styled.p`
  overflow: hidden;
  margin: 0;
  color: ${c.ink};
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const PriorityCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 2px;
`;
const PriorityBars = styled.div`
  display: flex;
  height: 12px;
  align-items: end;
  gap: 2px;
`;
const PriorityBar = styled.span<{ $active: boolean; $height: number }>`
  width: 4px;
  height: ${p => p.$height}px;
  border-radius: 1.5px;
  background: ${p => (p.$active ? c.ink : c.control)};
`;
const PriorityText = styled.span<{ $muted: boolean }>`
  color: ${p => (p.$muted ? c.secondary : c.ink)};
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
`;
const ReviewCell = styled.div`
  display: grid;
  gap: 4px;
  padding-top: 2px;
`;
const ReviewLine = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: ${c.ink};
  font-size: 13px;
  line-height: 18px;
`;
const ReviewDot = styled.span<{ $confirmed: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => (p.$confirmed ? "#1b6140" : "#c98900")};
`;
const Bookmark = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
`;
const EmptyState = styled.p`
  margin: 0;
  border-radius: 14px;
  background: ${c.card};
  padding: 32px 20px;
  color: ${c.secondary};
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
  color: ${c.secondary};
  font-size: 13px;
  line-height: 18px;
`;
const SecondaryButton = styled(BaseButton)`
  border: 1px solid ${c.control};
  background: ${c.surface};
  color: ${c.ink};
`;
