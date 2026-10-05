"use client";

import type { AuthActionState } from "@/actions/auth/state";
import { useActionState } from "react";
import { initialAuthActionState } from "@/actions/auth/state";

type EmailPasswordFormProps = {
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  submitLabel: string;
};

export default function EmailPasswordForm({
  action,
  submitLabel,
}: EmailPasswordFormProps) {
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
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={
          submitLabel === "Sign up" ? "new-password" : "current-password"
        }
        minLength={submitLabel === "Sign up" ? 8 : undefined}
        required
      />
      <button type="submit" disabled={isPending}>
        {isPending ? "Please wait..." : submitLabel}
      </button>
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
