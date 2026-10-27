"use client";

import { FormEvent, useState } from "react";
import { signUp } from "@/actions/auth/actions";
import { passwordIsValid } from "@/components/auth/password-rules";
import {
  CenterLink,
  ErrorLink,
  ErrorText,
  Field,
  Fields,
  Heading,
  Input,
  Label,
  PasswordInput,
  PasswordRules,
  SubmitButton,
} from "@/components/auth/ui";
import { setSessionValue, useSessionValue } from "../session-value";

const EMAIL_KEY = "zap-signup-email";

export function SignUpForm({ error }: { error?: string }) {
  const email = useSessionValue(EMAIL_KEY);
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(error === "short-password");

  const emailInvalid =
    error === "email-already-registered" || error === "invalid-email";
  const passwordInvalid = submitted && !passwordIsValid(password);

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
            $invalid={passwordInvalid}
            aria-invalid={passwordInvalid}
            onChange={event => setPassword(event.target.value)}
            required
          />
          <input type="hidden" name="confirmPassword" value={password} />

          <PasswordRules password={password} />
          {error === "signup-failed" ? (
            <ErrorText role="alert">
              Unable to create your account. Please try again.
            </ErrorText>
          ) : null}
          {error === "password-mismatch" ? (
            <ErrorText role="alert">
              Password confirmation failed. Please try again.
            </ErrorText>
          ) : null}
        </Field>
      </Fields>
      <SubmitButton pendingLabel="Creating account…">
        Create account
      </SubmitButton>
      <CenterLink href="/login">Back to Log in</CenterLink>
    </form>
  );
}
