import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/actions/auth/actions";
import { getVerifiedAuthUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

const errorMessages: Record<string, string> = {
  "email-not-confirmed":
    "Verify your email address before signing in. Check your inbox for the verification link.",
  "expired-session": "Your session has expired. Please sign in again.",
  "invalid-auth-link": "The authentication link is invalid or has expired.",
  "invalid-credentials": "The email or password is incorrect.",
  "invalid-email": "Enter a valid email address.",
  "missing-password": "Enter your password.",
  "signin-failed": "Unable to start your session. Please try again.",
};

const successMessages: Record<string, string> = {
  "password-updated": "Your password was updated. Please sign in again.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getVerifiedAuthUser()) {
    redirect("/");
  }

  const { error, message } = await searchParams;

  return (
    <main>
      <h1>Sign in</h1>
      {error && errorMessages[error] && (
        <p role="alert">{errorMessages[error]}</p>
      )}
      {message && successMessages[message] && (
        <p role="status">{successMessages[message]}</p>
      )}
      <form action={signIn}>
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
          autoComplete="current-password"
          required
        />
        <button type="submit">Sign in</button>
      </form>
      <p>
        <Link href="/reset-password">Forgot your password?</Link>
      </p>
      <p>
        Need an account? <Link href="/sign-up">Sign up</Link>
      </p>
    </main>
  );
}
