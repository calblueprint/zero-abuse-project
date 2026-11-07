import styled, { css } from "styled-components";
import COLORS from "@/styles/colors";

const ellipsis = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const SectionHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

export const SectionTitle = styled.h2`
  color: ${COLORS.inkText};
  font-size: 15px;
  font-weight: 500;
  line-height: 22px;
  letter-spacing: -0.1px;
`;

export const RowText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 14px 0;
`;

export const RowTitle = styled.p`
  ${ellipsis}
  color: ${COLORS.inkText};
  font-size: 14px;
  line-height: 20px;
`;

export const RowMeta = styled.p`
  ${ellipsis}
  color: ${COLORS.mutedText};
  font-size: 13px;
  line-height: 18px;
`;
