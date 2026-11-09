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

        return (
          <Tab
            key={tab}
            type="button"
            aria-pressed={isSelected}
            $selected={isSelected}
            onClick={() => onSelect(tab)}
          >
            {TAB_LABELS[tab]}
            <Count $tab={tab}>{counts[tab]}</Count>
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

const Count = styled.span<{ $tab: SourceTab }>`
  padding: 1px 8px;
  border-radius: 999px;
  background: ${({ $tab }) =>
    $tab === "needs-attention"
      ? COLORS.reviewTint
      : $tab === "active"
        ? COLORS.verifiedTint
        : $tab === "inactive"
          ? COLORS.flagTint
          : COLORS.tintNeutral};
  color: ${({ $tab }) =>
    $tab === "needs-attention"
      ? COLORS.reviewText
      : $tab === "active"
        ? COLORS.verifiedText
        : $tab === "inactive"
          ? COLORS.flagText
          : COLORS.mutedText};
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
`;
