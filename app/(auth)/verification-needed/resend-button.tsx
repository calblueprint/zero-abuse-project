"use client";

import { useEffect, useState } from "react";
import { resendVerification } from "@/actions/auth/actions";
import { PrimaryButton, SubmitButton } from "@/components/auth/ui";

export function ResendVerificationButton({
  email,
  coolingDown,
}: {
  email: string;
  coolingDown: boolean;
}) {
  const [seconds, setSeconds] = useState(coolingDown ? 30 : 0);

  useEffect(() => {
    if (seconds === 0) {
      return;
    }

    const id = window.setTimeout(() => {
      setSeconds(current => current - 1);
    }, 1000);

    return () => window.clearTimeout(id);
  }, [seconds]);

  return (
    <form action={resendVerification}>
      <input type="hidden" name="email" value={email} />
      {seconds > 0 ? (
        <PrimaryButton
          type="button"
          disabled
          style={{
            background: "#E1E5EB",
            color: "#8791A0",
            cursor: "not-allowed",
            opacity: 1,
          }}
        >
          Resend available in {seconds}s
        </PrimaryButton>
      ) : (
        <SubmitButton pendingLabel="Resending…">
          Resend verification email
        </SubmitButton>
      )}
    </form>
  );
}
