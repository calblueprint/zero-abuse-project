"use client";

import type {
  OnboardingFields,
  OnboardingState,
} from "@/actions/onboarding/validation";
import { useActionState } from "react";
import { submitOnboarding } from "@/actions/onboarding/actions";
import { onboardingFieldLimits } from "@/actions/onboarding/validation";

type OnboardingFormProps = {
  action?: (
    prevState: OnboardingState,
    formData: FormData,
  ) => Promise<OnboardingState>;
  initialFields?: OnboardingFields;
  submitLabel?: string;
};

export default function OnboardingForm({
  action = submitOnboarding,
  initialFields,
  submitLabel = "Continue",
}: OnboardingFormProps) {
  const initialState: OnboardingState = { fields: initialFields };

  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} noValidate>
      <div>
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          name="firstName"
          autoComplete="given-name"
          defaultValue={state.fields?.firstName}
          aria-describedby="firstName-error"
          aria-invalid={Boolean(state.errors?.firstName)}
          maxLength={onboardingFieldLimits.firstName}
          required
        />
        {state.errors?.firstName && (
          <p id="firstName-error" role="alert">
            {state.errors.firstName}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="lastName">Last name</label>
        <input
          id="lastName"
          name="lastName"
          autoComplete="family-name"
          defaultValue={state.fields?.lastName}
          aria-describedby="lastName-error"
          aria-invalid={Boolean(state.errors?.lastName)}
          maxLength={onboardingFieldLimits.lastName}
          required
        />
        {state.errors?.lastName && (
          <p id="lastName-error" role="alert">
            {state.errors.lastName}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={state.fields?.phone}
          aria-describedby="phone-error"
          aria-invalid={Boolean(state.errors?.phone)}
          inputMode="tel"
          maxLength={onboardingFieldLimits.phone}
          required
        />
        {state.errors?.phone && (
          <p id="phone-error" role="alert">
            {state.errors.phone}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="organization">Organization</label>
        <input
          id="organization"
          name="organization"
          autoComplete="organization"
          defaultValue={state.fields?.organization}
          aria-describedby="organization-error"
          aria-invalid={Boolean(state.errors?.organization)}
          maxLength={onboardingFieldLimits.organization}
          required
        />
        {state.errors?.organization && (
          <p id="organization-error" role="alert">
            {state.errors.organization}
          </p>
        )}
      </div>
      {state.errors?.form && <p role="alert">{state.errors.form}</p>}
      {state.message && <p role="status">{state.message}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
