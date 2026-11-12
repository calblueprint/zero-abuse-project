"use client";

import { FormEvent, useState, useSyncExternalStore } from "react";
import { resendVerification, signUp } from "@/actions/auth/actions";
import {
  Body,
  CenterLink,
  ErrorLink,
  ErrorText,
  Eyebrow,
  Field,
  Fields,
  Heading,
  Input,
  Label,
  PasswordInput,
  PasswordRules,
  SubmitButton,
} from "@/components/auth/ui";
import { validateEmail } from "@/lib/validation/email";
import { passwordIsValid } from "@/lib/validation/password";
import { setSessionValue, useSessionValue } from "../session-value";

const EMAIL_KEY = "zap-signup-email";

export function VerificationExpired() {
  const email = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem(EMAIL_KEY) ?? "",
    () => "",
  );
  return (
    <div>
      <Eyebrow>Welcome to ZAP</Eyebrow>
      <Heading>Verification link expired</Heading>
      <Body style={{ textAlign: "center", lineHeight: "20px" }}>
        Request a new verification link for
      </Body>

      <Body
        style={{
          textAlign: "center",
          color: "#20252B",
          fontWeight: 500,
          lineHeight: "20px",
        }}
      >
        {email}
      </Body>
      <form action={resendVerification}>
        <input type="hidden" name="email" value={email} />
        <SubmitButton pendingLabel="Sending…">
          Send a new verification email
        </SubmitButton>
      </form>
      <CenterLink href="/login">Back to sign in</CenterLink>
    </div>
  );
}

export function SignUpForm({ error }: { error?: string }) {
  const email = useSessionValue(EMAIL_KEY);
  localStorage.setItem(EMAIL_KEY, email.trim());
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(error === "invalid-password");

  const [emailError, setEmailError] = useState(
    error === "invalid-email" ? "Enter a valid email address." : undefined,
  );
  const emailInvalid =
    Boolean(emailError) || error === "email-already-registered";
  const passwordInvalid = submitted && !passwordIsValid(password);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const nextEmailError = validateEmail(email);

    if (nextEmailError || !passwordIsValid(password)) {
      event.preventDefault();
      setEmailError(nextEmailError);
      setSubmitted(true);
      return;
    }

    setEmailError(undefined);
    setSessionValue(EMAIL_KEY, email.trim());
  }

  return (
    <form action={signUp} onSubmit={onSubmit} noValidate>
      <Eyebrow>Welcome to Zap</Eyebrow>
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
            onChange={event => {
              setSessionValue(EMAIL_KEY, event.target.value);
              setEmailError(undefined);
            }}
            required
          />
          {error === "email-already-registered" ? (
            <ErrorText role="alert">
              This email already has an account.{" "}
              <ErrorLink href="/login">Log in instead.</ErrorLink>
            </ErrorText>
          ) : null}
          {emailError ? <ErrorText role="alert">{emailError}</ErrorText> : null}
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
