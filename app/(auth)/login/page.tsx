import { redirect } from "next/navigation";
import { StatusBlock } from "@/components/auth/ui";
import { getVerifiedAuthUser } from "@/lib/auth/user";
import { VerificationExpired } from "../sign-up/sign-up-form";
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
        eyebrow="Account recovery"
        title="Password updated"
        description="Sign in with your new password."
        primaryHref="/login"
        primaryLabel="Back to sign in"
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
    return <VerificationExpired />;
  }

  return <LoginForm error={error} />;
}
