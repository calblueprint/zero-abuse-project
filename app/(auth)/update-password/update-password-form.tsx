"use client";

import { FormEvent, useState } from "react";
import { signOut, updatePassword } from "@/actions/auth/actions";
import {

  passwordIsValid,
} from "@/components/auth/password-rules";
import {
  CenterButton,
  ErrorText,
  Field,
  Fields,
  Heading,
  Helper,
  Label,
  PasswordInput,
  PasswordRules,
  SubmitButton,
} from "@/components/auth/ui";

export function UpdatePasswordForm({ error }: { error?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(error === "short-password");
  const [showMismatch, setShowMismatch] = useState(
    error === "password-mismatch",
  );


  const passwordInvalid = submitted && !passwordIsValid(password);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter?.getAttribute("name") === "cancel") {
      return;
    }

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
            $invalid={passwordInvalid}
            aria-invalid={passwordInvalid}
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
          <PasswordRules password={password} />
          {error === "update-failed" ? (
            <ErrorText role="alert">
              Unable to update your password. Please try again.
            </ErrorText>
          ) : null}
        </Field>
      </Fields>
      <SubmitButton pendingLabel="Resetting password…">
        Reset password
      </SubmitButton>
      <CenterButton
        type="submit"
        name="cancel"
        formAction={signOut}
        formNoValidate
      >
        Back to log in
      </CenterButton>
    </form>
  );
}
