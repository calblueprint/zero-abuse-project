"use client";

import { useActionState } from "react";
import { updatePassword } from "@/actions/auth/actions";
import { initialAuthActionState } from "@/actions/auth/state";

export default function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    updatePassword,
    initialAuthActionState,
  );

  return (
    <form action={formAction}>
      <label htmlFor="password">New password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <label htmlFor="confirmPassword">Confirm new password</label>
      <input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <button type="submit" disabled={isPending}>
        {isPending ? "Updating..." : "Update password"}
      </button>
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
