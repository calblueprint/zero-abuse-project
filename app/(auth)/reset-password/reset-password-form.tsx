"use client";

import { FormEvent, useEffect } from "react";
import { requestPasswordReset } from "@/actions/auth/actions";
import {
  removeSessionValue,
  setSessionValue,
  useSessionValue,
} from "../session-value";
import {
  Body,
  CenterLink,
  Dialog,
  DialogTitle,
  ErrorText,
  Field,
  Fields,
  Heading,
  Input,
  Label,
  Overlay,
  PrimaryButton,
} from "../ui";

const EMAIL_KEY = "zap-reset-email";
const RESENT_KEY = "zap-reset-resent";

export function ResetPasswordForm({ error }: { error?: string }) {
  const email = useSessionValue(EMAIL_KEY);
  const emailInvalid = error === "invalid-email" || error === "reset-failed";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    setSessionValue(EMAIL_KEY, email.trim());
    removeSessionValue(RESENT_KEY);
    if (!email.trim()) {
      event.preventDefault();
    }
  }

  return (
    <form action={requestPasswordReset} onSubmit={onSubmit}>
      <Heading>Forgot password?</Heading>
      <Body>Enter your email to receive a reset link.</Body>
      <Fields>
        <Field>
          <Label htmlFor="email">Organization email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="you@organization.org"
            value={email}
            $invalid={emailInvalid}
            aria-invalid={emailInvalid}
            onChange={event => setSessionValue(EMAIL_KEY, event.target.value)}
            required
          />
          {error === "invalid-email" ? (
            <ErrorText role="alert">Enter a valid email address.</ErrorText>
          ) : null}
          {error === "reset-failed" ? (
            <ErrorText role="alert">
              Unable to send a reset email. Please try again.
            </ErrorText>
          ) : null}
        </Field>
      </Fields>
      <PrimaryButton type="submit">Send reset link</PrimaryButton>
      <CenterLink href="/login">Back to log in</CenterLink>
    </form>
  );
}

export function CheckEmail() {
  const email = useSessionValue(EMAIL_KEY);
  const open = useSessionValue(RESENT_KEY) === "1";

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        removeSessionValue(RESENT_KEY);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closeResent() {
    removeSessionValue(RESENT_KEY);
  }

  function onResend(event: FormEvent<HTMLFormElement>) {
    if (!email) {
      event.preventDefault();
      return;
    }

    setSessionValue(RESENT_KEY, "1");
  }

  return (
    <>
      <Heading>Check your email</Heading>
      <Body>If your email is registered, a reset link is on its way.</Body>
      <form action={requestPasswordReset} onSubmit={onResend}>
        <input type="hidden" name="email" value={email} />
        <PrimaryButton type="submit">Resend reset link</PrimaryButton>
      </form>
      <CenterLink href="/reset-password">Use a different email</CenterLink>
      {open ? (
        <Overlay onMouseDown={closeResent}>
          <Dialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-resent-title"
            aria-describedby="link-resent-body"
            onMouseDown={event => event.stopPropagation()}
          >
            <DialogTitle id="link-resent-title">Link resent</DialogTitle>
            <Body id="link-resent-body">
              If your email is registered, a new reset link is on its way.
            </Body>
            <PrimaryButton type="button" onClick={closeResent}>
              Okay
            </PrimaryButton>
          </Dialog>
        </Overlay>
      ) : null}
    </>
  );
}
