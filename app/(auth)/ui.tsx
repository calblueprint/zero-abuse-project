"use client";

import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styled, { css } from "styled-components";
import ZapLogo from "@/assets/images/zap-logo.jpg";
import { PASSWORD_RULES } from "./password-rules";

const headingStyles = css`
  margin: 0;
  color: #002f6d;
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
  background: #002f6d;
  color: #ffffff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    background: #002454;
  }

  &:focus-visible {
    outline: 2px solid #002f6d;
    outline-offset: 2px;
  }
`;

const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #15233e;
`;

const Accent = styled.div`
  height: 4px;
  flex: none;
  background: #002f6d;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 72px;
    background: #ffd400;
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
  color: #53627a;
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
  color: #15233e;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
`;

export const Input = styled.input<{ $invalid?: boolean }>`
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border-radius: 6px;
  border: 1px solid ${({ $invalid }) => ($invalid ? "#a12e2f" : "#cfd4de")};
  background: #fbfcfc;
  color: #15233e;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;

  &::placeholder {
    color: #53627a;
    opacity: 1;
  }

  &:focus {
    outline: 2px solid ${({ $invalid }) => ($invalid ? "#a12e2f" : "#002f6d")};
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
  color: #53627a;
  cursor: pointer;

  &:hover {
    color: #15233e;
  }

  &:focus-visible {
    outline: 2px solid #002f6d;
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
  color: #53627a;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
`;

export const ErrorText = styled.p`
  margin: 0;
  color: #a12e2f;
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
  padding-left: 18px;
`;

export const Rule = styled.li<{ $met: boolean }>`
  color: ${({ $met }) => ($met ? "#1f7a4d" : "#a12e2f")};
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
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

export const PrimaryLink = styled(Link)`
  ${primaryStyles}
`;

export const InlineLink = styled(Link)`
  margin-left: auto;
  color: #002f6d;
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
  color: #002f6d;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  text-align: center;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
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
  background: #ffffff;
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
  return (
    <RuleList>
      {PASSWORD_RULES.map(rule => {
        const met = rule.test(password);
        return (
          <Rule key={rule.id} $met={met}>
            {rule.label}
          </Rule>
        );
      })}
    </RuleList>
  );
}
