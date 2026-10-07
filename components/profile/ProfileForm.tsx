"use client";

import type { ProfileFields, ProfileState } from "@/actions/profile/validation";
import { useActionState } from "react";
import { onboardingFieldLimits } from "@/actions/onboarding/validation";
import { profileFieldLimits } from "@/actions/profile/validation";

type ProfileFormProps = {
  action: (
    prevState: ProfileState,
    formData: FormData,
  ) => Promise<ProfileState>;
  initialFields: ProfileFields;
};

export default function ProfileForm({
  action,
  initialFields,
}: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(action, {
    fields: initialFields,
  });

  return (
    <form action={formAction} noValidate>
      <div>
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          name="firstName"
          autoComplete="given-name"
          defaultValue={state.fields?.firstName}
          aria-describedby={
            state.errors?.firstName ? "firstName-error" : undefined
          }
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
          aria-describedby={
            state.errors?.lastName ? "lastName-error" : undefined
          }
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
          aria-describedby={state.errors?.phone ? "phone-error" : undefined}
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
          aria-describedby={
            state.errors?.organization ? "organization-error" : undefined
          }
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
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.fields?.email}
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          aria-invalid={Boolean(state.errors?.email)}
          maxLength={profileFieldLimits.email}
          required
        />
        {state.errors?.email && (
          <p id="email-error" role="alert">
            {state.errors.email}
          </p>
        )}
      </div>
      {state.errors?.form && <p role="alert">{state.errors.form}</p>}
      {state.message && <p role="status">{state.message}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
