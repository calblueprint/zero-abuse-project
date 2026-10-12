import { CheckEmail, ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { error, message } = await searchParams;

  if (message === "email-sent" || message === "resent") {
    return <CheckEmail key={message} resent={message === "resent"} />;
  }

  return <ResetPasswordForm error={error} />;
}
