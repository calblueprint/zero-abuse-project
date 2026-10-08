"use client";

import { signIn } from "@/actions/auth/actions";
import { setSessionValue, useSessionValue } from "../session-value";
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
  PrimaryButton,
} from "../ui";

const EMAIL_KEY = "zap-login-email";

type LoginNotice = {
  text: string;
  tone: "error" | "muted";
};

export function LoginForm({
  credentialsError,
  notice,
}: {
  credentialsError: boolean;
  notice: LoginNotice | null;
}) {
  const email = useSessionValue(EMAIL_KEY);

  return (
    <form
      action={signIn}
      onSubmit={() => {
        setSessionValue(EMAIL_KEY, email.trim());
      }}
    >
      <Heading>Log in</Heading>
      {notice?.tone === "muted" ? <Body>{notice.text}</Body> : null}
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
            onChange={event => setSessionValue(EMAIL_KEY, event.target.value)}
            required
          />
        </Field>
        <Field>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            $invalid={credentialsError}
            aria-invalid={credentialsError}
            required
          />
          <MetaRow>
            {credentialsError ? (
              <ErrorText role="alert">
                Email or password is incorrect.
              </ErrorText>
            ) : notice?.tone === "error" ? (
              <ErrorText role="alert">{notice.text}</ErrorText>
            ) : null}
            <InlineLink href="/reset-password">Forgot password?</InlineLink>
          </MetaRow>
        </Field>
      </Fields>
      <PrimaryButton type="submit">Log in</PrimaryButton>
      <CenterLink href="/sign-up">Create account</CenterLink>
    </form>
  );
}
