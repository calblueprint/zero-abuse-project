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

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`;

export const SearchField = styled.label`
  display: flex;
  width: min(480px, 100%);
  min-width: 220px;
  height: 40px;
  align-items: center;
  gap: 10px;
  border: 1px solid ${CONTROL_BORDER};
  border-radius: 999px;
  background: ${COLORS.surface};
  padding: 0 16px;
  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: ${COLORS.inkText};
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
  }
  input::placeholder {
    color: ${COLORS.mutedText};
    opacity: 1;
  }
`;

export function SearchIcon() {
  return (
    <IconBox viewBox="0 0 24 24">
      <circle cx="10.8" cy="10.8" r="5.8" />
      <path d="m15.2 15.2 4.2 4.2" />
    </IconBox>
  );
}

export const FiltersPopover = styled.div`
  position: absolute;
  z-index: 4;
  top: 48px;
  left: 0;
  width: 390px;
  max-height: min(560px, calc(100dvh - 250px));
  overflow: auto;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 16px;
  background: ${COLORS.surface};
  box-shadow:
    0 1px 4px rgba(15, 27, 45, 0.06),
    0 12px 32px -8px rgba(15, 27, 45, 0.16);
  @media (max-width: 500px) {
    position: fixed;
    inset: 72px 12px auto;
    width: auto;
    max-height: calc(100vh - 84px);
  }
`;

export const FilterHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 18px 6px;
  color: ${COLORS.inkText};
  font-size: 14px;
  line-height: 20px;
`;

export const FilterBody = styled.div`
  display: grid;
  gap: 16px;
  padding: 10px 18px 18px;
`;

export const FilterFooter = styled.div`
  border-top: 1px solid #e9edf2;
  padding: 14px 18px;
  ${PrimaryButton} {
    width: 100%;
  }
`;

export function SlidersIcon() {
  return (
    <IconBox viewBox="0 0 24 24">
      <path d="M4 7h16M4 17h16M9 4v6M15 14v6" />
    </IconBox>
  );
}

export function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <SmallIcon $filled={filled} viewBox="0 0 16 16">
      <path d="M4 2.5h8v11l-4-2.5-4 2.5v-11Z" />
    </SmallIcon>
  );
}
