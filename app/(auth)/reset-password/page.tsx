import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth/actions";

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-email": "Enter a valid email address.",
  "reset-failed": "Unable to send a reset email. Please try again.",
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { error, message } = await searchParams;

  return (
    <main>
      <h1>Reset your password</h1>
      <p>Enter your email and we will send you a password reset link.</p>
      {error && errorMessages[error] && (
        <p role="alert">{errorMessages[error]}</p>
      )}
      {message === "email-sent" && (
        <p role="status">
          If an account exists for that email, a reset link is on its way.
        </p>
      )}
      <form action={requestPasswordReset}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <button type="submit">Send reset link</button>
      </form>
      <p>
        <Link href="/login">Return to sign in</Link>
      </p>
    </main>
  );
}
