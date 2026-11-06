import styled, { css } from "styled-components";
import COLORS from "@/styles/colors";

const buttonBase = css`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 13px;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

// Figma "HF / Button / Primary"
export const PrimaryButton = styled.button`
  ${buttonBase}
  padding: 9px 17px;
  background: ${COLORS.actionNavy};
  color: ${COLORS.surface};
  /* Light-on-dark text renders heavier than Figma without this. */
  -webkit-font-smoothing: antialiased;

  &:hover:not(:disabled) {
    background: ${COLORS.inkText};
  }
`;

// Figma "HF / Button / Secondary"
export const SecondaryButton = styled.button<{ $compact?: boolean }>`
  ${buttonBase}
  height: ${({ $compact }) => ($compact ? "34px" : "auto")};
  padding: ${({ $compact }) => ($compact ? "0 15px" : "10px 18px")};
  border-color: ${COLORS.borderControl};
  background: ${COLORS.surface};
  color: ${COLORS.inkText};

  &:hover:not(:disabled) {
    background: ${COLORS.tintSoft};
  }
`;

// The dialogs' borderless "Cancel".
export const TextButton = styled.button`
  ${buttonBase}
  height: 42px;
  padding: 0 16px;
  background: none;
  color: ${COLORS.inkText};

  &:hover:not(:disabled) {
    background: ${COLORS.tintSoft};
  }
`;

export const Tag = styled.span<{ $tint: string; $text: string }>`
  display: flex;
  width: fit-content;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  background: ${({ $tint }) => $tint};
  color: ${({ $text }) => $text};
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  white-space: nowrap;
`;
