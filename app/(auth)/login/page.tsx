import { redirect } from "next/navigation";
import { StatusBlock } from "@/components/auth/ui";
import { getVerifiedAuthUser } from "@/lib/auth/user";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getVerifiedAuthUser()) {
    redirect("/");
  }

  const { error, message } = await searchParams;

  if (message === "password-updated") {
    return (
      <StatusBlock
        title="Password reset"
        description="Your password was updated. Sign in with your new password."
        primaryHref="/login"
        primaryLabel="Log in"
      />
    );
  }

  if (error === "invalid-reset-link") {
    return (
      <StatusBlock
        title="Reset link expired"
        description="Request a new reset link."
        primaryHref="/reset-password"
        primaryLabel="Send a new link"
        secondaryHref="/login"
        secondaryLabel="Back to log in"
      />
    );
  }

  if (error === "invalid-auth-link") {
    return (
      <StatusBlock
        title="Link expired"
        description="This authentication link is invalid or has expired."
        primaryHref="/login"
        primaryLabel="Back to log in"
        secondaryHref="/sign-up"
        secondaryLabel="Create an account"
      />
    );
  }

  return <LoginForm error={error} />;
}
