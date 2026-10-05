import Link from "next/link";
import { signUp } from "@/actions/auth/actions";

type SignUpPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  "email-already-registered":
    "An account already exists with this email. Sign in instead.",
  "invalid-email": "Enter a valid email address.",
  "password-mismatch": "Passwords do not match.",
  "short-password": "Password must be at least 8 characters.",
  "signup-failed": "Unable to create your account. Please try again.",
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error } = await searchParams;

  return (
    <main>
      <h1>Create an account</h1>
      {error && errorMessages[error] && (
        <p role="alert">{errorMessages[error]}</p>
      )}
      <form action={signUp}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <button type="submit">Sign up</button>
      </form>
      <p>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
