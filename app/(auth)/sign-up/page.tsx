import Link from "next/link";
import { signUp } from "@/actions/auth/actions";
import EmailPasswordForm from "@/app/(auth)/_components/EmailPasswordForm";

export default function SignUpPage() {
  return (
    <main>
      <h1>Create an account</h1>
      <EmailPasswordForm action={signUp} submitLabel="Sign up" />
      <p>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
