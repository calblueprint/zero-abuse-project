import styled from "styled-components";
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
    <StatusTabs aria-label={label}>
      {statuses.map(value => (
        <StatusTab
          key={value}
          $active={status === value}
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

const StatusCount = styled.span<{ $tone: string }>`
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  ${p => (p.$tone === "Needs your review" ? "background:#fbeda3;color:#5c4800;" : p.$tone === "Saved" ? "background:#f8d9cf;color:#8c3523;" : p.$tone === "Confirmed" ? "background:#d5ecdc;color:#1b6140;" : `background:#f3f6fa;color:${COLORS.mutedText};`)}
`;
