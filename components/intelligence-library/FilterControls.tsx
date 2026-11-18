import type { ReactNode } from "react";
import { useState } from "react";
import styled from "styled-components";
import COLORS from "@/styles/colors";
import { ChevronIcon, CONTROL_BORDER } from "./styles";

export function FilterGroup({
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
export function FilterOptions({
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
            aria-pressed={selected.includes(value)}
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
export function ExpandableFilter({
  label,
  options,
  selected,
  onToggle,
  optionLabel = value => value,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  optionLabel?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <MoreFilterRow>
      <button
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        type="button"
      >
        <span>{label}</span>
        <span>{selected.length ? `${selected.length} selected` : "Any"}</span>
        <ChevronIcon />
      </button>
      {open && (
        <ChipGroup>
          {options.map(value => (
            <FilterChip
              $active={selected.includes(value)}
              aria-pressed={selected.includes(value)}
              key={value}
              onClick={() => onToggle(value)}
              type="button"
            >
              {optionLabel(value)}
            </FilterChip>
          ))}
        </ChipGroup>
      )}
    </MoreFilterRow>
  );
}

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
export const ChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;
export const FilterChip = styled.button<{ $active: boolean }>`
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
export const DateInputs = styled.div`
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
export const MoreFilters = styled.div`
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

export const ClearButton = styled.button`
  text-decoration: none;
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
