"use client";

import type { SourceTab } from "./view";
import styled from "styled-components";
import { TabButton, TabRow } from "@/components/Tabs";
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
    <TabRow aria-label="Source status">
      {SOURCE_TABS.map(tab => {
        const isSelected = tab === selected;

        return (
          <TabButton
            key={tab}
            type="button"
            aria-pressed={isSelected}
            $selected={isSelected}
            onClick={() => onSelect(tab)}
          >
            {TAB_LABELS[tab]}
            <Count $tab={tab}>{counts[tab]}</Count>
          </TabButton>
        );
      })}
    </TabRow>
  );
}

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
