"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import COLORS from "@/styles/colors";

const primaryStyles = css`
  display: flex;
  width: 100%;
  height: 48px;
  margin-top: 20px;
  padding: 0 16px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: ${COLORS.navy};
  color: ${COLORS.surface};
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    background: ${COLORS.navyHover};
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.navy};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Heading = styled.h1`
  margin: 0;
  color: ${COLORS.navy};
  font-size: 28px;
  font-weight: 600;
  line-height: 36px;
`;

export const Body = styled.p`
  margin: 8px 0 0;
  color: ${COLORS.muted};
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
`;

export const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const Label = styled.label`
  color: ${COLORS.navy};
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
`;

export const Input = styled.input<{ $invalid?: boolean }>`
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border-radius: 6px;
  border: 1px solid
    ${({ $invalid }) => ($invalid ? COLORS.error : COLORS.inputBorder)};
  background: ${COLORS.inputBackground};
  color: ${COLORS.ink};
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;

  &::placeholder {
    color: ${COLORS.muted};
    opacity: 1;
  }

  &:focus {
    outline: 2px solid
      ${({ $invalid }) => ($invalid ? COLORS.error : COLORS.navy)};
    outline-offset: 1px;
  }
`;

export const ErrorText = styled.p`
  margin: 0;
  color: ${COLORS.error};
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
`;

export const PrimaryButton = styled.button`
  ${primaryStyles}
`;

export const PrimaryLink = styled(Link)`
  ${primaryStyles}
`;

export const TextButton = styled.button`
  padding: 0;
  border: 0;
  background: none;
  color: ${COLORS.navy};
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.navy};
    outline-offset: 2px;
    border-radius: 2px;
  }
`;

export const CenterButton = styled(TextButton)`
  display: block;
  width: 100%;
  margin-top: 16px;
  text-align: center;
`;

export const Eyebrow = styled.p`
  margin: 0 0 8px;
  color: ${COLORS.muted};
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
`;
