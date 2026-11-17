import styled, { css } from "styled-components";
import COLORS from "@/styles/colors";

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 720px;
  max-width: 100%;
`;

export const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

export const SectionTitle = styled.h2`
  color: ${COLORS.inkText};
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: -0.15px;
`;

export const InfoList = styled.dl`
  display: flex;
  flex-direction: column;
`;

export const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid ${COLORS.divider};

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
`;

export const InfoLabel = styled.dt`
  flex-shrink: 0;
  width: 200px;
  color: ${COLORS.mutedText};
  font-size: 13px;
  line-height: 18px;
`;

export const InfoValue = styled.dd`
  flex: 1;
  min-width: 0;
  margin: 0;
  color: ${COLORS.inkText};
  font-size: 14px;
  line-height: 20px;
  overflow-wrap: anywhere;
`;

export const fieldBox = css<{ $invalid?: boolean }>`
  width: 100%;
  height: 44px;
  padding: 0 16px;
  border: 1px solid
    ${({ $invalid }) => ($invalid ? COLORS.error : "transparent")};
  border-radius: 10px;
  background: ${COLORS.fieldFill};
  color: ${COLORS.inkText};
  font: inherit;
  font-size: 14px;
  line-height: 20px;

  &::placeholder {
    color: ${COLORS.mutedText};
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid
      ${({ $invalid }) => ($invalid ? COLORS.error : COLORS.actionNavy)};
    outline-offset: 1px;
  }
`;

export const FieldInput = styled.input<{ $invalid?: boolean }>`
  ${fieldBox}
`;

export const Hint = styled.p`
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
`;

export const ErrorText = styled.p`
  color: ${COLORS.error};
  font-size: 12px;
  line-height: 18px;
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;
