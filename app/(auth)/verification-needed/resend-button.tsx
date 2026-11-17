import { resendVerification } from "@/actions/auth/actions";
import { SubmitButton } from "@/components/auth/ui";

export function ResendVerificationButton({ email }: { email: string }) {
  return (
    <form action={resendVerification}>
      <input type="hidden" name="email" value={email} />
      <SubmitButton pendingLabel="Resending…">
        Resend verification email
      </SubmitButton>
    </form>
  );
}
