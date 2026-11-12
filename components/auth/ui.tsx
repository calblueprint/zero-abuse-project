"use client";

import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import styled, { css } from "styled-components";
import ZapLogo from "@/assets/images/zap-logo.jpg";
import { PASSWORD_RULES } from "@/lib/validation/password";
import COLORS from "@/styles/colors";

type AuthAppearance = "classic" | "gradient";

const headingStyles = css`
  margin: 0;
  color: var(--auth-heading, ${COLORS.navy});
  font-size: var(--auth-heading-size, 28px);
  font-weight: var(--auth-heading-weight, 600);
  line-height: var(--auth-heading-line, 36px);
  letter-spacing: var(--auth-heading-letter-spacing, 0);
  text-align: var(--auth-heading-align, left);
`;

const primaryStyles = css`
  display: flex;
  width: 100%;
  height: var(--auth-control-height, 48px);
  margin-top: var(--auth-button-margin-top, 20px);
  padding: 0 16px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--auth-button-radius, 6px);
  background: var(--auth-button, ${COLORS.navy});
  color: var(--auth-button-text, ${COLORS.surface});
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;
  text-decoration: none;
  cursor: pointer;
  &:hover {
    background: var(--auth-button-hover, ${COLORS.navyHover});
  }
  &:focus-visible {
    outline: 2px solid var(--auth-focus, ${COLORS.navy});
    outline-offset: 2px;
  }
  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;

const Shell = styled.div<{ $appearance?: AuthAppearance }>`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  background: ${COLORS.surface};
  color: var(--auth-ink, ${COLORS.ink});
  ${({ $appearance }) =>
    $appearance === "gradient" &&
    css`
      --auth-heading: #20252b;
      --auth-heading-size: 30px;
      --auth-heading-line: 38px;
      --auth-heading-weight: 400;
      --auth-heading-letter-spacing: -0.4px;
      --auth-heading-align: center;
      --auth-body: #5f6875;
      --auth-label: #5f6875;
      --auth-label-size: 14px;
      --auth-ink: #20252b;
      --auth-muted: #5f6875;
      --auth-link: #20252b;
      --auth-link-size: 13px;
      --auth-link-line: 18px;
      --auth-inline-link: #20252b;
      --auth-inline-link-size: 13px;
      --auth-inline-link-width: 150px;
      --auth-placeholder: #8791a0;
      --auth-button: #182c46;
      --auth-button-hover: #121f33;
      --auth-button-text: #ffffff;
      --auth-button-radius: 22px;
      --auth-button-margin-top: 24px;
      --auth-control-height: 44px;
      --auth-focus: #182c46;
      --auth-input-border: #e1e5eb;
      --auth-input-bg: #ffffff;
      --auth-input-radius: 22px;
      --auth-input-padding: 0 8px 0 20px;
      --auth-input-shadow: 0 4px 16px 0 rgba(23, 43, 69, 0.06);
      --auth-column-width: 328px;
      --auth-error: #c2412d;
      --auth-error-size: 13px;
      --auth-success: #1b6140;
      --auth-rule-idle: #8791a0;
      --auth-rule-error: #c2412d;
      --auth-rule-error-icon: #c2412d;
      --auth-surface: #ffffff;
      --auth-overlay: rgba(24, 44, 70, 0.2);
      --auth-overlay-align: center;
      --auth-overlay-padding: 24px;
      --auth-dialog-radius: 16px;
      --auth-dialog-shadow: 0 18px 50px rgba(24, 44, 70, 0.14);
      --auth-stage-padding: 80px 24px 48px;
      --auth-fields-gap: 20px;
      --auth-fields-margin-top: 28px;
      --auth-field-gap: 8px;
      --auth-eyebrow: #8791a0;
      --auth-eyebrow-size: 13px;
      --auth-eyebrow-weight: 400;
      --auth-center-link-margin: 20px;
      background-color: #f7f8fb;
      overflow: hidden;
      background-color: #ffffff;
    `}
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

const HelpMark = styled.span`
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 2;
  color: #8791a0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  pointer-events: none;
`;

const Wash = styled.div`
  position: absolute;
  z-index: 0;
  pointer-events: none;
`;

const BottomWash = styled(Wash)`
  left: 0;
  right: 0;
  bottom: 0;
  height: 420px;
  opacity: 0.65;
  background: linear-gradient(
    180deg,
    rgba(221, 229, 240, 0) 0%,
    rgba(221, 229, 240, 0.45) 55%,
    rgba(204, 215, 231, 0.95) 100%
  );
`;

const AuraBlue = styled(Wash)`
  width: 1587px;
  height: 948px;
  left: -600px;
  top: 150px;
  border-radius: 1587px;
  opacity: 0.95;
  background: radial-gradient(
    50% 50% at 50% 50%,
    rgba(178, 199, 235, 0.85) 0%,
    rgba(178, 199, 235, 0.47) 45%,
    rgba(178, 199, 235, 0.15) 75%,
    rgba(178, 199, 235, 0) 100%
  );
  filter: blur(20px);
`;

const AuraWarm = styled(Wash)`
  width: 1541px;
  height: 889px;
  right: -600px;
  bottom: -360px;
  border-radius: 1541px;
  opacity: 0.65;
  background: radial-gradient(
    50% 50% at 50% 50%,
    rgba(255, 227, 153, 0.75) 0%,
    rgba(255, 227, 153, 0.41) 45%,
    rgba(255, 227, 153, 0.14) 75%,
    rgba(255, 227, 153, 0) 100%
  );
  filter: blur(20px);
`;

const TopLight = styled(Wash)`
  width: 1100px;
  height: 420px;
  left: 50%;
  top: 0;
  border-radius: 1100px;
  background: rgba(255, 255, 255, 0.8);
  filter: blur(60px);
  transform: translateX(-50%);
`;

const Stage = styled.main`
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
`;

const Column = styled.div`
  width: min(var(--auth-column-width, 360px), 100%);
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
  color: var(--auth-body, ${COLORS.muted});
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
`;

export const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--auth-fields-gap, 16px);
  margin-top: var(--auth-fields-margin-top, 20px);
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--auth-field-gap, 6px);
`;

export const Label = styled.label`
  color: var(--auth-label, ${COLORS.ink});
  font-size: var(--auth-label-size, 13px);
  font-weight: 500;
  line-height: 20px;
`;

export const Input = styled.input<{ $invalid?: boolean }>`
  width: 100%;
  height: var(--auth-control-height, 48px);
  padding: var(--auth-input-padding, 0 16px);
  border-radius: var(--auth-input-radius, 6px);
  border: 1px solid var(--auth-input-border, ${COLORS.inputBorder});
  background: var(--auth-input-bg, ${COLORS.inputBackground});
  box-shadow: var(--auth-input-shadow, none);
  color: var(--auth-ink, ${COLORS.ink});
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.45;

  &::placeholder {
    color: var(--auth-placeholder, ${COLORS.muted});
    opacity: 1;
  }

  &:focus {
    outline: 2px solid var(--auth-focus, ${COLORS.navy});
    outline-offset: 1px;
  }

  ${({ $invalid }) =>
    $invalid &&
    css`
      border-color: var(--auth-error, ${COLORS.error});
      &:focus {
        outline-color: var(--auth-error, ${COLORS.error});
      }
    `}
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
  height: var(--auth-control-height, 48px);
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--auth-placeholder, ${COLORS.muted});
  cursor: pointer;

  &:hover {
    color: var(--auth-ink, ${COLORS.ink});
  }

  &:focus-visible {
    outline: 2px solid var(--auth-focus, ${COLORS.navy});
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="6" />
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
  color: var(--auth-muted, ${COLORS.muted});
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
`;

export const ErrorText = styled.p`
  margin: 0;
  color: var(--auth-error, ${COLORS.error});
  font-size: var(--auth-error-size, 12px);
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
      ? `var(--auth-success, ${COLORS.success})`
      : $tone === "error"
        ? "var(--auth-rule-error, #A34B47)"
        : "var(--auth-rule-idle, #596159)"};
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
`;

export const RuleIcon = styled.span<{ $tone: "idle" | "error" | "success" }>`
  display: inline-flex;
  color: ${({ $tone }) =>
    $tone === "success"
      ? `var(--auth-success, ${COLORS.success})`
      : $tone === "error"
        ? "var(--auth-rule-error-icon, #A12E2F)"
        : "var(--auth-rule-idle, #596159)"};
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
  color: var(--auth-link, ${COLORS.navy});
  font-family: inherit;
  font-size: var(--auth-link-size, 13px);
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid var(--auth-focus, ${COLORS.navy});
    outline-offset: 2px;
    border-radius: 2px;
  }
`;

export const InlineLink = styled(Link)`
  margin-left: auto;
  width: var(--auth-inline-link-width, auto);
  flex-shrink: 0;
  color: var(--auth-inline-link, ${COLORS.navy});
  font-size: var(--auth-inline-link-size, 13px);
  font-weight: 500;
  line-height: var(--auth-link-line, 20px);
  text-align: center;
  white-space: nowrap;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;
export const CenterLink = styled(Link)`
  display: block;
  margin-top: var(--auth-center-link-margin, 16px);
  color: var(--auth-link, ${COLORS.navy});
  font-size: var(--auth-link-size, 13px);
  font-weight: 500;
  line-height: var(--auth-link-line, 20px);
  text-align: center;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;
export const CenterButton = styled(TextButton)`
  display: block;
  width: 100%;
  margin-top: var(--auth-center-link-margin, 16px);
  text-align: center;
`;
export const Eyebrow = styled.p`
  margin: 0 0 8px;
  color: var(--auth-eyebrow, ${COLORS.muted});
  font-size: var(--auth-eyebrow-size, 12px);
  font-weight: var(--auth-eyebrow-weight, 500);
  line-height: 18px;
  text-align: var(--auth-heading-align, left);
`;
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: var(--auth-overlay-align, flex-end);
  justify-content: center;
  padding: var(--auth-overlay-padding, 24px 24px 48px);
  background: var(--auth-overlay, rgba(21, 35, 62, 0.28));
`;
export const Dialog = styled.div`
  width: min(360px, 100%);
  padding: 28px 24px 24px;
  border-radius: var(--auth-dialog-radius, 8px);
  background: var(--auth-surface, ${COLORS.surface});
  box-shadow: var(--auth-dialog-shadow, 0 16px 40px rgba(21, 35, 62, 0.18));
`;

export function AuthShell({
  appearance = "classic",
  className,
  children,
}: {
  appearance?: AuthAppearance;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Shell className={className} $appearance={appearance}>
      {appearance === "gradient" ? (
        <>
          <BottomWash />
          <AuraBlue />
          <AuraWarm />
          <TopLight />
        </>
      ) : (
        <Accent />
      )}
      <Stage>
        <Column>
          {appearance === "classic" ? (
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
          ) : null}
          {children}
        </Column>
      </Stage>
      {appearance === "gradient" ? <HelpMark>Help</HelpMark> : null}
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
  eyebrow,
}: {
  title: string;
  description?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  eyebrow?: string;
}) {
  return (
    <div>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Heading>{title}</Heading>
      {description ? (
        <Body style={{ textAlign: "center" }}>{description}</Body>
      ) : null}
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
