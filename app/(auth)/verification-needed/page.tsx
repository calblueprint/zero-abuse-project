import { redirect } from "next/navigation";
import { resendVerification } from "@/actions/auth/actions";
import {
  Body,
  CenterLink,
  ErrorText,
  Eyebrow,
  Heading,
  SubmitButton,
} from "@/components/auth/ui";
import { ResendVerificationButton } from "./resend-button";

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
      <Eyebrow>Welcome to ZAP</Eyebrow>
      <Heading>Verify your email</Heading>
      <Body style={{ textAlign: "center", marginTop: "20px" }}>
        Open the verification link sent to:
      </Body>
      <Body
        style={{
          textAlign: "center",
          color: "#20252B",
          fontWeight: 500,
          lineHeight: "30px",
        }}
      >
        {email}
      </Body>
      {error === "resend-failed" ? (
        <ErrorText role="alert" style={{ textAlign: "center" }}>
          Unable to resend the verification email. Please try again.
        </ErrorText>
      ) : null}
      {message === "resent" ? (
        <Body
          role="status"
          style={{
            textAlign: "center",
            color: "#1B6140",
            fontWeight: 500,
            lineHeight: "30px",
          }}
        >
          New verification link sent.
        </Body>
      ) : null}
      <ResendVerificationButton
        email={email}
        coolingDown={message === "resent"}
      />
      <CenterLink href="/login">Back to sign in</CenterLink>
    </div>
  );
}
