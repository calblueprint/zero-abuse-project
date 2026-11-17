import styled from "styled-components";
import COLORS from "@/styles/colors";

export const TabRow = styled.div`
  display: flex;
  gap: 28px;
  overflow-x: auto;
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

export const TabButton = styled.button<{ $selected: boolean }>`
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
