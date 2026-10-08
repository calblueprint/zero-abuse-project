import { redirect } from "next/navigation";
import { getVerifiedAuthUser } from "@/lib/auth/user";
import { StatusBlock } from "../ui";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

const credentialErrors = new Set([
  "invalid-credentials",
  "invalid-email",
  "missing-password",
  "signin-failed",
]);

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getVerifiedAuthUser()) {
    redirect("/");
  }

  const { error, message } = await searchParams;

  if (message === "password-updated") {
    return (
      <StatusBlock
        title="Password reset"
        primaryHref="/login"
        primaryLabel="Log in"
      />
    );
  }

  if (error === "invalid-auth-link") {
    return (
      <StatusBlock
        title="Link expired"
        description="Request a new reset link."
        primaryHref="/reset-password"
        primaryLabel="Send a new link"
        secondaryHref="/login"
        secondaryLabel="Back to log in"
      />
    );
  }

  const notice =
    error === "email-not-confirmed"
      ? {
          text: "Verify your email address before signing in.",
          tone: "error" as const,
        }
      : error === "expired-session"
        ? {
            text: "Your session has expired. Please sign in again.",
            tone: "muted" as const,
          }
        : null;

  return (
    <LoginForm
      credentialsError={credentialErrors.has(error ?? "")}
      notice={notice}
    />
  );
}
