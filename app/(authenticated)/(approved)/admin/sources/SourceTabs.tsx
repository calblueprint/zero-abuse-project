"use client";

import type { SourceTab } from "./view";
import styled from "styled-components";
import COLORS from "@/styles/colors";
import { SOURCE_TABS } from "./view";

export const TAB_LABELS: Record<SourceTab, string> = {
  "needs-attention": "Needs attention",
  all: "All",
  active: "Active",
  inactive: "Inactive",
};

type SourceTabsProps = {
  selected: SourceTab;
  counts: Record<SourceTab, number>;
  onSelect: (tab: SourceTab) => void;
};

export default function SourceTabs({
  selected,
  counts,
  onSelect,
}: SourceTabsProps) {
  return (
    <Tabs aria-label="Source status">
      {SOURCE_TABS.map(tab => {
        const isSelected = tab === selected;
        // Waiting work stays yellow even when another tab is open.
        const highlight =
          isSelected || (tab === "needs-attention" && counts[tab] > 0);

        return (
          <Tab
            key={tab}
            type="button"
            aria-pressed={isSelected}
            $selected={isSelected}
            onClick={() => onSelect(tab)}
          >
            {TAB_LABELS[tab]}
            <Count $highlight={highlight}>{counts[tab]}</Count>
          </Tab>
        );
      })}
    </Tabs>
  );
}

const Tabs = styled.div`
  display: flex;
  gap: 28px;
  overflow-x: auto;
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

const Tab = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0;
  border: none;
  /* Only the selected tab has the underline, which nudges its label up 1px. */
  border-bottom: ${({ $selected }) =>
    $selected ? `2px solid ${COLORS.actionNavy}` : "none"};
  background: none;
  color: ${({ $selected }) =>
    $selected ? COLORS.actionNavy : COLORS.secondaryText};
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${COLORS.actionNavy};
  }
`;

const Count = styled.span<{ $highlight: boolean }>`
  padding: 1px 8px;
  border-radius: 999px;
  background: ${({ $highlight }) =>
    $highlight ? COLORS.reviewTint : COLORS.surfaceChip};
  color: ${({ $highlight }) =>
    $highlight ? COLORS.reviewText : COLORS.mutedText};
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
`;
