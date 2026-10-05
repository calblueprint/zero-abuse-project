import Link from "next/link";
import { redirect } from "next/navigation";
import { resendVerification } from "@/actions/auth/actions";

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
    <main>
      <h1>Verify your email</h1>
      <p>
        We sent a verification link to {email}. Check your inbox to continue.
      </p>
      {error === "resend-failed" && (
        <p role="alert">Unable to resend the email. Please try again.</p>
      )}
      {message === "resent" && (
        <p role="status">The verification email was resent.</p>
      )}
      <form action={resendVerification}>
        <input type="hidden" name="email" value={email} />
        <button type="submit">Resend verification email</button>
      </form>
      <p>
        <Link href="/sign-up">Use another account</Link>
      </p>
    </main>
  );
}
