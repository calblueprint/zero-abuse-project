import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth/actions";
import EmailForm from "@/app/(auth)/_components/EmailForm";

export default function ResetPasswordPage() {
  return (
    <main>
      <h1>Reset your password</h1>
      <p>Enter your email and we will send you a password reset link.</p>
      <EmailForm action={requestPasswordReset} />
      <p>
        <Link href="/login">Return to sign in</Link>
      </p>
    </main>
  );
}
