"use client";

import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import styled, { css } from "styled-components";
import ZapLogo from "@/assets/images/zap-logo.jpg";
import COLORS from "@/styles/colors";
import { PASSWORD_RULES } from "./password-rules";

const headingStyles = css`
  margin: 0;
  color: ${COLORS.navy};
  font-size: 28px;
  font-weight: 600;
  line-height: 36px;
`;

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
    cursor: wait;
    opacity: 0.7;
  }
`;

const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${COLORS.surface};
  color: ${COLORS.ink};
`;

const Accent = styled.div`
  height: 4px;
  flex: none;
  background: ${COLORS.navy};
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 72px;
    background: ${COLORS.yellow};
  }
`;

const Stage = styled.main`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
`;

const Column = styled.div`
  width: min(360px, 100%);
`;

const LogoWrap = styled.div`
  margin-bottom: 32px;
`;

export const Heading = styled.h1`
  ${headingStyles}
`;

export const DialogTitle = styled.h2`
  ${headingStyles}
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
  color: ${COLORS.ink};
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

const PasswordFieldWrap = styled.div`
  position: relative;
`;

const PasswordFieldInput = styled(Input)`
  padding-right: 44px;
`;

const PasswordToggle = styled.button`
  position: absolute;
  top: 0;
  right: 4px;
  display: flex;
  width: 40px;
  height: 48px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${COLORS.muted};
  cursor: pointer;

  &:hover {
    color: ${COLORS.ink};
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.navy};
    outline-offset: -4px;
    border-radius: 4px;
  }
`;

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      class="lucide lucide-circle-small preview-icon"><circle 
      cx="12" 
      cy="12" 
      r="6"/>
    </svg>
  );
}

export function PasswordInput(
  props: Omit<ComponentProps<typeof Input>, "type">,
) {
  const [visible, setVisible] = useState(false);

  return (
    <PasswordFieldWrap>
      <PasswordFieldInput {...props} type={visible ? "text" : "password"} />
      <PasswordToggle
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible(current => !current)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </PasswordToggle>
    </PasswordFieldWrap>
  );
}

export const Helper = styled.p`
  margin: 0;
  color: ${COLORS.muted};
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
`;

export const ErrorText = styled.p`
  margin: 0;
  color: ${COLORS.error};
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
`;

export const ErrorLink = styled(Link)`
  color: inherit;
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const RuleList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const Rule = styled.li<{ $tone: "idle" | "error" | "success" }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ $tone }) =>
    $tone === "success"
      ? COLORS.success
      : $tone === "error"
        ? "#A34B47"
        :" #596159"};
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
`;

export const RuleIcon = styled.span<{ $tone: "idle" | "error" | "success" }>`
  display: inline-flex;
  color: ${({ $tone }) =>
    $tone === "success"
      ? COLORS.success
      : $tone === "error"
        ? "#A12E2F"
        : "#596159"};
`;

export const MetaRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

export const PrimaryButton = styled.button`
  ${primaryStyles}
`;

export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <PrimaryButton type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </PrimaryButton>
  );
}

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

export const InlineLink = styled(Link)`
  margin-left: auto;
  color: ${COLORS.navy};
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const CenterLink = styled(Link)`
  display: block;
  margin-top: 16px;
  color: ${COLORS.navy};
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  text-align: center;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
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

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 24px 24px 48px;
  background: rgba(21, 35, 62, 0.28);
`;

export const Dialog = styled.div`
  width: min(360px, 100%);
  padding: 28px 24px 24px;
  border-radius: 8px;
  background: ${COLORS.surface};
  box-shadow: 0 16px 40px rgba(21, 35, 62, 0.18);
`;

export function AuthShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Shell className={className}>
      <Accent />
      <Stage>
        <Column>
          <LogoWrap>
            <Image
              src={ZapLogo}
              alt="Zero Abuse Project"
              width={236}
              height={68}
              priority
              style={{
                width: 236,
                height: 68,
                objectFit: "contain",
                objectPosition: "left center",
              }}
            />
          </LogoWrap>
          {children}
        </Column>
      </Stage>
    </Shell>
  );
}

export function StatusBlock({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  description?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div>
      <Heading>{title}</Heading>
      {description ? <Body>{description}</Body> : null}
      <PrimaryLink href={primaryHref}>{primaryLabel}</PrimaryLink>
      {secondaryHref && secondaryLabel ? (
        <CenterLink href={secondaryHref}>{secondaryLabel}</CenterLink>
      ) : null}
    </div>
  );
}

export function PasswordRules({ password }: { password: string }) {
  const hasTyped = password.length > 0;

  return (
    <RuleList>
      {PASSWORD_RULES.map(rule => {
        const met = rule.test(password);
        const tone = met ? "success" : hasTyped ? "error" : "idle";

        return (
          <Rule key={rule.id} $tone={tone}>
            <RuleIcon $tone={tone}>
              {met ? <CheckIcon /> : <CircleIcon />}
            </RuleIcon>
            {rule.label}
          </Rule>
        );
      })}
    </RuleList>
  );
}
