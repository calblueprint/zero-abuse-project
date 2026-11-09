"use client";

import type { EmergingPattern } from "@/lib/intelligence-library/emerging-patterns";
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
import COLORS from "@/styles/colors";
import {
  ChevronIcon,
  CONTROL_BORDER,
  IconBox,
  PillButton,
  PrimaryButton,
} from "./styles";

export default function PatternFiltersPopover({
  patterns,
  appliedFilters,
  onApply,
  referenceDate,
}: {
  patterns: EmergingPattern[];
  appliedFilters: PatternFilters;
  onApply: (filters: PatternFilters) => void;
  referenceDate: Date;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
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
  const applyFilters = () => {
    onApply(draftFilters);
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
    <FilterWrap ref={filterWrapRef}>
      <PillButton
        aria-controls="pattern-filters-popover"
        aria-expanded={filtersOpen}
        aria-haspopup="dialog"
        onClick={() => (filtersOpen ? closeFilters() : setFiltersOpen(true))}
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

function SlidersIcon() {
  return (
    <IconBox viewBox="0 0 24 24">
      <path d="M4 7h16M4 17h16M9 4v6M15 14v6" />
    </IconBox>
  );
}
const FilterBadge = styled.span`
  border-radius: 999px;
  background: ${COLORS.actionNavy};
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
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 16px;
  background: ${COLORS.surface};
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
  color: ${COLORS.inkText};
  font-size: 14px;
  line-height: 20px;
`;
const ClearButton = styled.button`
  margin-left: auto;
  border: 0;
  background: transparent;
  color: ${COLORS.mutedText};
  font-family: inherit;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
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
  color: ${COLORS.mutedText};
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
  border: ${p => (p.$active ? `1px solid ${COLORS.actionNavy}` : `1px solid ${CONTROL_BORDER}`)};
  border-radius: 999px;
  background: ${p => (p.$active ? COLORS.actionNavy : COLORS.surface)};
  padding: 0 12px;
  color: ${p => (p.$active ? "#fff" : COLORS.inkText)};
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  cursor: pointer;
`;
const DateInputs = styled.div`
  display: flex;
  gap: 6px;
  input {
    min-width: 0;
    width: 50%;
    height: 32px;
    border: 1px solid ${CONTROL_BORDER};
    border-radius: 8px;
    padding: 0 8px;
    color: ${COLORS.inkText};
    font-family: inherit;
    font-size: 12px;
    font-weight: 400;
    line-height: 16px;
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
    color: ${COLORS.inkText};
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    text-align: left;
    cursor: pointer;
  }
  > button span:nth-child(2) {
    margin-left: auto;
    color: ${COLORS.mutedText};
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
