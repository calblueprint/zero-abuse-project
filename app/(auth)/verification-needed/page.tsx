import { redirect } from "next/navigation";
import { resendVerification } from "@/actions/auth/actions";
import {
  Body,
  CenterLink,
  ErrorText,
  Heading,
  SubmitButton,
} from "@/components/auth/ui";

type VerificationNeededPageProps = {
  searchParams: Promise<{
    email?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function VerificationNeededPage({
  searchParams,
}: VerificationNeededPageProps) {
  const { email, error, message } = await searchParams;

  if (!email) {
    redirect("/sign-up");
  }

  return (
    <div>
      <Heading>Verify your email</Heading>
      <Body>We sent a verification link to {email}. Check your inbox.</Body>
      {error === "resend-failed" ? (
        <ErrorText role="alert">
          Unable to resend the verification email. Please try again.
        </ErrorText>
      ) : null}
      {message === "resent" ? (
        <Body role="status">The verification email was resent.</Body>
      ) : null}
      <form action={resendVerification}>
        <input type="hidden" name="email" value={email} />
        <SubmitButton pendingLabel="Resending…">
          Resend verification email
        </SubmitButton>
      </form>
      <CenterLink href="/sign-up">Use a different account</CenterLink>
      <CenterLink href="/login">Back to log in</CenterLink>
    </div>
  );
}
