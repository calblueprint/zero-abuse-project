"use client";

import type { AuthActionState } from "@/actions/auth/state";
import { useActionState } from "react";
import { initialAuthActionState } from "@/actions/auth/state";

type EmailFormProps = {
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
};

export default function EmailForm({ action }: EmailFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialAuthActionState,
  );

  return (
    <form action={formAction}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send reset link"}
      </button>
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
