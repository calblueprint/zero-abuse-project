import { resendVerification } from "@/actions/auth/actions";
import {
  Body,
  CenterLink,
  Eyebrow,
  Field,
  Fields,
  Heading,
  Input,
  Label,
  SubmitButton,
} from "@/components/auth/ui";

export default function VerificationExpired() {
  return (
    <form action={resendVerification}>
      <Eyebrow>Welcome to ZAP</Eyebrow>
      <Heading>Link expired</Heading>
      <Body>
        This link is invalid or expired. If you’re verifying a new account,
        request a new link below.
      </Body>
      <Fields>
        <Field>
          <Label htmlFor="verification-email">Email address</Label>
          <Input
            id="verification-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
      </Fields>
      <SubmitButton pendingLabel="Sending…">
        Send a new verification email
      </SubmitButton>
      <CenterLink href="/login">Back to sign in</CenterLink>
    </form>
  );
}
