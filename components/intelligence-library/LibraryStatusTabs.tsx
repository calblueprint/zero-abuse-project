import styled from "styled-components";
import { TabButton, TabRow } from "@/components/Tabs";
import COLORS from "@/styles/colors";

export default function LibraryStatusTabs<Status extends string>({
  statuses,
  status,
  counts,
  onChange,
  label,
}: {
  statuses: readonly Status[];
  status: Status;
  counts: Partial<Record<Status, number>>;
  onChange: (status: Status) => void;
  label: string;
}) {
  return (
    <StatusTabs as="nav" aria-label={label}>
      {statuses.map(value => (
        <StatusTab
          key={value}
          $selected={status === value}
          aria-pressed={status === value}
          type="button"
          onClick={() => onChange(value)}
        >
          {value}
          {value !== "Archived" && counts[value] !== undefined && (
            <StatusCount $tone={value}>{counts[value]}</StatusCount>
          )}
        </StatusTab>
      ))}
    </StatusTabs>
  );
}

const StatusTabs = styled(TabRow)`
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const StatusTab = styled(TabButton)`
  border-bottom-width: 2px;
  border-bottom-style: solid;
  border-bottom-color: ${p => (p.$selected ? COLORS.actionNavy : "transparent")};
`;

const StatusCount = styled.span<{ $tone: string }>`
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  ${p => (p.$tone === "Needs your review" ? "background:#fbeda3;color:#5c4800;" : p.$tone === "Saved" ? "background:#f8d9cf;color:#8c3523;" : p.$tone === "Confirmed" ? "background:#d5ecdc;color:#1b6140;" : `background:#f3f6fa;color:${COLORS.mutedText};`)}
`;
