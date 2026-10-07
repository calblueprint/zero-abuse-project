"use client";

import { FormEvent, useState } from "react";
import { signUp } from "@/actions/auth/actions";
import { PASSWORD_HINT, passwordIsValid } from "../password-rules";
import { setSessionValue, useSessionValue } from "../session-value";
import {
  CenterLink,
  ErrorLink,
  ErrorText,
  Field,
  Fields,
  Heading,
  Helper,
  Input,
  Label,
  PasswordInput,
  PasswordRules,
  PrimaryButton,
} from "../ui";

const EMAIL_KEY = "zap-signup-email";

export function SignUpForm({ error }: { error?: string }) {
  const email = useSessionValue(EMAIL_KEY);
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(error === "short-password");

  const emailInvalid =
    error === "email-already-registered" || error === "invalid-email";
  const showRules = submitted;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!passwordIsValid(password)) {
      event.preventDefault();
      setSubmitted(true);
      return;
    }

    setSessionValue(EMAIL_KEY, email.trim());
  }

  return (
    <form action={signUp} onSubmit={onSubmit}>
      <Heading>Create account</Heading>
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
          {error === "email-already-registered" ? (
            <ErrorText role="alert">
              This email already has an account.{" "}
              <ErrorLink href="/login">Log in instead.</ErrorLink>
            </ErrorText>
          ) : null}
          {error === "invalid-email" ? (
            <ErrorText role="alert">Enter a valid email address.</ErrorText>
          ) : null}
        </Field>
        <Field>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />
          <input type="hidden" name="confirmPassword" value={password} />
          {showRules ? (
            <PasswordRules password={password} />
          ) : (
            <Helper>{PASSWORD_HINT}</Helper>
          )}
          {error === "signup-failed" ? (
            <ErrorText role="alert">
              Unable to create your account. Please try again.
            </ErrorText>
          ) : null}
        </Field>
      </Fields>
      <PrimaryButton type="submit">Create account</PrimaryButton>
      <CenterLink href="/login">Back to Log in</CenterLink>
    </form>
  );
}
