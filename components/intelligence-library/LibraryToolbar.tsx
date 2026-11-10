"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";
import COLORS from "@/styles/colors";
import {
  ChevronIcon,
  FilterFooter,
  FiltersPopover,
  PillButton,
  PrimaryButton,
  SearchField,
  SearchIcon,
  SlidersIcon,
  Toolbar,
} from "./styles";

type LibraryToolbarProps = {
  searchInput: InputHTMLAttributes<HTMLInputElement>;
  filterCount: number;
  filterLabel: string;
  filterContent: ReactNode;
  applyLabel: string;
  applyType?: "button" | "submit";
  onApplyFilters?: () => void;
  onFilterDismiss: () => void;
  sort: string;
  sortOptions: readonly string[];
  onSortChange: (sort: string) => void;
};

export default function LibraryToolbar({
  searchInput,
  filterCount,
  filterLabel,
  filterContent,
  applyLabel,
  applyType = "button",
  onApplyFilters,
  onFilterDismiss,
  sort,
  sortOptions,
  onSortChange,
}: LibraryToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);
  const sortWrapRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const filterId = useId();

  useEffect(() => {
    if (!filtersOpen && !sortOpen) return;
    const dismiss = (event: KeyboardEvent | MouseEvent) => {
      const escape = event instanceof KeyboardEvent && event.key === "Escape";
      const outside = event instanceof MouseEvent;
      if (
        filtersOpen &&
        (escape ||
          (outside && !filterWrapRef.current?.contains(event.target as Node)))
      ) {
        onFilterDismiss();
        setFiltersOpen(false);
        if (escape) filterTriggerRef.current?.focus();
      }
      if (
        sortOpen &&
        (escape ||
          (outside && !sortWrapRef.current?.contains(event.target as Node)))
      ) {
        setSortOpen(false);
        if (escape) sortTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("mousedown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("mousedown", dismiss);
    };
  }, [filtersOpen, sortOpen, onFilterDismiss]);

  return (
    <Toolbar>
      <SearchField>
        <SearchIcon />
        <input type="search" {...searchInput} />
      </SearchField>
      <FilterWrap ref={filterWrapRef}>
        <PillButton
          aria-controls={filterId}
          aria-expanded={filtersOpen}
          aria-haspopup="dialog"
          ref={filterTriggerRef}
          type="button"
          onClick={() => {
            if (filtersOpen) onFilterDismiss();
            setFiltersOpen(open => !open);
            setSortOpen(false);
          }}
        >
          <SlidersIcon />
          Filters{filterCount > 0 && <FilterBadge>{filterCount}</FilterBadge>}
        </PillButton>
        <FiltersPopover
          hidden={!filtersOpen}
          role="dialog"
          aria-label={filterLabel}
          id={filterId}
        >
          {filterContent}
          <FilterFooter>
            <PrimaryButton
              type={applyType}
              onClick={() => {
                onApplyFilters?.();
                setFiltersOpen(false);
                filterTriggerRef.current?.focus();
              }}
            >
              {applyLabel}
            </PrimaryButton>
          </FilterFooter>
        </FiltersPopover>
      </FilterWrap>
      <ToolbarSpacer />
      <SortWrap ref={sortWrapRef}>
        <SortButton
          aria-expanded={sortOpen}
          ref={sortTriggerRef}
          onClick={() => setSortOpen(open => !open)}
          type="button"
        >
          <span>Sort</span>
          <strong>{sort}</strong>
          <ChevronIcon />
        </SortButton>
        {sortOpen && (
          <SortMenu aria-label="Sort library" role="group">
            {sortOptions.map(option => (
              <SortMenuItem
                $selected={sort === option}
                aria-pressed={sort === option}
                key={option}
                type="button"
                onClick={() => {
                  onSortChange(option);
                  setSortOpen(false);
                  sortTriggerRef.current?.focus();
                }}
              >
                {option}
              </SortMenuItem>
            ))}
          </SortMenu>
        )}
      </SortWrap>
    </Toolbar>
  );
}

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
