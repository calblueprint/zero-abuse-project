"use client";

import type { OnboardingState } from "@/lib/validation";
import { useActionState } from "react";
import { submitOnboarding } from "@/app/onboarding/actions";

export default function OnboardingForm() {
  const initialState: OnboardingState = {};

  const [state, formAction, isPending] = useActionState(
    submitOnboarding,
    initialState,
  );

  return (
    <form action={formAction} noValidate>
      <div>
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          name="firstName"
          defaultValue={state.fields?.firstName}
        />
        {state.errors?.firstName && <p>{state.errors.firstName}</p>}
      </div>
      <div>
        <label htmlFor="lastName">Last name</label>
        <input
          id="lastName"
          name="lastName"
          defaultValue={state.fields?.lastName}
        />
        {state.errors?.lastName && <p>{state.errors.lastName}</p>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={state.fields?.email}
        />
        {state.errors?.email && <p>{state.errors.email}</p>}
      </div>
      <div>
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={state.fields?.phone}
        />
        {state.errors?.phone && <p>{state.errors.phone}</p>}
      </div>
      <div>
        <label htmlFor="organization">Organization</label>
        <input
          id="organization"
          name="organization"
          defaultValue={state.fields?.organization}
        />
        {state.errors?.organization && <p>{state.errors.organization}</p>}
      </div>
      {state.errors?.form && <p>{state.errors.form}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
