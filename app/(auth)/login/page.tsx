import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/actions/auth/actions";
import EmailPasswordForm from "@/app/(auth)/_components/EmailPasswordForm";
import { getVerifiedAuthUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-auth-link": "The authentication link is invalid or has expired.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getVerifiedAuthUser()) {
    redirect("/");
  }

  const { error } = await searchParams;
  const errorMessage = error ? errorMessages[error] : undefined;

  return (
    <main>
      <h1>Sign in</h1>
      {errorMessage && <p role="alert">{errorMessage}</p>}
      <EmailPasswordForm action={signIn} submitLabel="Sign in" />
      <p>
        <Link href="/reset-password">Forgot your password?</Link>
      </p>
      <p>
        Need an account? <Link href="/sign-up">Sign up</Link>
      </p>
    </main>
  );
}
