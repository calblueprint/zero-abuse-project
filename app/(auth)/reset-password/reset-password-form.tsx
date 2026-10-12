"use client";

import { FormEvent, useEffect, useState } from "react";
import { requestPasswordReset } from "@/actions/auth/actions";
import { setSessionValue, useSessionValue } from "../session-value";
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
  SubmitButton,
} from "../ui";

const EMAIL_KEY = "zap-reset-email";

export function ResetPasswordForm({ error }: { error?: string }) {
  const email = useSessionValue(EMAIL_KEY);
  const emailInvalid = error === "invalid-email" || error === "reset-failed";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    setSessionValue(EMAIL_KEY, email.trim());
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
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
      <CenterLink href="/login">Back to log in</CenterLink>
    </form>
  );
}

export function CheckEmail({ resent }: { resent: boolean }) {
  const email = useSessionValue(EMAIL_KEY);
  const [open, setOpen] = useState(resent);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closeResent() {
    setOpen(false);
  }

  return (
    <>
      <Heading>Check your email</Heading>
      <Body>If your email is registered, a reset link is on its way.</Body>
      {email ? (
        <form action={requestPasswordReset}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="intent" value="resend" />
          <SubmitButton pendingLabel="Resending…">
            Resend reset link
          </SubmitButton>
        </form>
      ) : null}
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
