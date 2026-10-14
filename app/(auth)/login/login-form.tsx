"use client";

import { signIn } from "@/actions/auth/actions";
import {
  Body,
  CenterLink,
  ErrorText,
  Field,
  Fields,
  Heading,
  InlineLink,
  Input,
  Label,
  MetaRow,
  PasswordInput,
  SubmitButton,
} from "@/components/auth/ui";
import { setSessionValue, useSessionValue } from "../session-value";

const EMAIL_KEY = "zap-login-email";

const fieldErrors: Record<string, string> = {
  "invalid-credentials": "Email or password is incorrect.",
  "invalid-email": "Enter a valid email address.",
  "missing-password": "Enter your password.",
  "signin-failed": "Unable to sign in. Please try again.",
  "email-not-confirmed": "Verify your email address before signing in.",
};

export function LoginForm({ error }: { error?: string }) {
  const email = useSessionValue(EMAIL_KEY);
  const credentialsError = error === "invalid-credentials";
  const emailInvalid = credentialsError || error === "invalid-email";
  const passwordInvalid = credentialsError || error === "missing-password";
  const emailError = error === "invalid-email" ? fieldErrors[error] : null;
  const formError =
    error && error !== "invalid-email" ? fieldErrors[error] : null;

  return (
    <form
      action={signIn}
      onSubmit={() => {
        setSessionValue(EMAIL_KEY, email.trim());
      }}
    >
      <Heading>Log in</Heading>
      {error === "expired-session" ? (
        <Body role="status">
          Your session has expired. Please sign in again.
        </Body>
      ) : null}
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
            aria-describedby={emailError ? "login-email-error" : undefined}
            onChange={event => setSessionValue(EMAIL_KEY, event.target.value)}
            required
          />
          {emailError ? (
            <ErrorText id="login-email-error" role="alert">
              {emailError}
            </ErrorText>
          ) : null}
        </Field>
        <Field>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            $invalid={passwordInvalid}
            aria-invalid={passwordInvalid}
            aria-describedby={formError ? "login-form-error" : undefined}
            required
          />
          <MetaRow>
            {formError ? (
              <ErrorText id="login-form-error" role="alert">
                {formError}
              </ErrorText>
            ) : null}
            <InlineLink href="/reset-password">Forgot password?</InlineLink>
          </MetaRow>
        </Field>
      </Fields>
      <SubmitButton pendingLabel="Logging in…">Log in</SubmitButton>
      <CenterLink href="/sign-up">Create account</CenterLink>
    </form>
  );
}
