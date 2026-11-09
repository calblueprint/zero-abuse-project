import styled from "styled-components";
import COLORS from "@/styles/colors";

export const CONTROL_BORDER = "#d3d9e2";
export const PATTERN_COLUMNS = "minmax(260px, 1fr) 210px 128px 168px";

export const BaseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  padding: 10px 18px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;
  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

export const PrimaryButton = styled(BaseButton)`
  border: 1px solid ${COLORS.actionNavy};
  background: ${COLORS.actionNavy};
  color: #fff;
  @media (max-width: 800px) {
    margin-left: auto;
  }
`;

export const IconBox = styled.svg`
  width: 20px;
  height: 20px;
  flex: none;
  fill: none;
  stroke: ${COLORS.secondaryText};
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

export const SmallIcon = styled.svg<{ $filled?: boolean }>`
  width: 16px;
  height: 16px;
  fill: ${p => (p.$filled ? COLORS.actionNavy : "none")};
  stroke: ${COLORS.secondaryText};
  stroke-width: 1.35;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

export const PillButton = styled.button`
  display: inline-flex;
  height: 40px;
  align-items: center;
  gap: 8px;
  border: 1px solid ${CONTROL_BORDER};
  border-radius: 999px;
  background: ${COLORS.surface};
  padding: 0 16px 0 14px;
  color: ${COLORS.inkText};
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
`;

export const Description = styled.p`
  margin: 0;
  color: ${COLORS.secondaryText};
  font-size: 14px;
  line-height: 20px;
`;

export function ChevronIcon() {
  return (
    <SmallIcon viewBox="0 0 16 16">
      <path d="m4 6 4 4 4-4" />
    </SmallIcon>
  );
}
