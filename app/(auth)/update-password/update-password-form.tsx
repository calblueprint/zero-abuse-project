"use client";

import { FormEvent, useState } from "react";
import { updatePassword } from "@/actions/auth/actions";
import { PASSWORD_HINT, passwordIsValid } from "../password-rules";
import {
  CenterLink,
  ErrorText,
  Field,
  Fields,
  Heading,
  Helper,
  Label,
  PasswordInput,
  PasswordRules,
  PrimaryButton,
} from "../ui";

export function UpdatePasswordForm({ error }: { error?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(error === "short-password");
  const [showMismatch, setShowMismatch] = useState(
    error === "password-mismatch",
  );

  const showRules = submitted;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const mismatch = password !== confirmPassword;
    if (!passwordIsValid(password) || mismatch) {
      event.preventDefault();
      setSubmitted(true);
      setShowMismatch(mismatch);
      return;
    }

    setShowMismatch(false);
  }

  return (
    <form action={updatePassword} onSubmit={onSubmit}>
      <Heading>Reset password</Heading>
      <Fields>
        <Field>
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Enter a new password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />
        </Field>
        <Field>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            $invalid={showMismatch}
            aria-invalid={showMismatch}
            onChange={event => {
              const next = event.target.value;
              setConfirmPassword(next);
              if (next === password) {
                setShowMismatch(false);
              }
            }}
            required
          />
          {showMismatch ? (
            <ErrorText role="alert">
              Passwords don&apos;t match. Try again.
            </ErrorText>
          ) : null}
          {showRules ? (
            <PasswordRules password={password} />
          ) : (
            <Helper>{PASSWORD_HINT}</Helper>
          )}
          {error === "update-failed" ? (
            <ErrorText role="alert">
              Unable to update your password. Please try again.
            </ErrorText>
          ) : null}
        </Field>
      </Fields>
      <PrimaryButton type="submit">Reset password</PrimaryButton>
      <CenterLink href="/login">Back to log in</CenterLink>
    </form>
  );
}
