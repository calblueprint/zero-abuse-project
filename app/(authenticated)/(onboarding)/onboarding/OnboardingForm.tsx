"use client";

import type {
  OnboardingErrors,
  OnboardingFields,
  OnboardingState,
} from "@/actions/onboarding/validation";
import type { ComponentProps, FormEvent } from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { submitOnboarding } from "@/actions/onboarding/actions";
import {
  onboardingFieldLimits,
  parseOnboardingFormData,
} from "@/actions/onboarding/validation";
import {
  Body,
  ErrorText,
  Eyebrow,
  Field,
  Fields,
  Heading,
  Input,
  Label,
  PrimaryButton,
  TextButton,
} from "@/components/auth/ui";
import COLORS from "@/styles/colors";

type OnboardingFormProps = {
  action?: (
    prevState: OnboardingState,
    formData: FormData,
  ) => Promise<OnboardingState>;
  initialFields?: OnboardingFields & { email?: string };
  submitLabel?: string;
  showEmail?: boolean;
  splitSteps?: boolean;
};

const stepOneFields = ["firstName", "lastName", "phone"] as const;

export default function OnboardingForm({
  action = submitOnboarding,
  initialFields,
  submitLabel = "Continue",
  showEmail = false,
  splitSteps = false,
}: OnboardingFormProps) {
  const initialState: OnboardingState = { fields: initialFields };

  const [state, formAction, isPending] = useActionState(action, initialState);
  const [step, setStep] = useState<1 | 2>(1);
  const [stepErrors, setStepErrors] = useState<OnboardingErrors | null>(null);
  const [lastState, setLastState] = useState(state);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);

  if (state !== lastState) {
    setLastState(state);
    setStepErrors(null);
    if (stepOneFields.some(field => state.errors?.[field])) {
      setStep(1);
    }
  }

  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      headingRef.current?.focus();
    }
  }, [step]);

  const errors: OnboardingErrors = { ...state.errors };
  if (stepErrors) {
    stepOneFields.forEach(field => {
      errors[field] = stepErrors[field];
    });
  }
  const onStepOne = splitSteps && step === 1;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!onStepOne) {
      return;
    }

    event.preventDefault();
    const result = parseOnboardingFormData(new FormData(event.currentTarget));
    const stepOneErrors: OnboardingErrors = {};
    if (!result.success) {
      stepOneFields.forEach(field => {
        if (result.errors[field]) stepOneErrors[field] = result.errors[field];
      });
    }
    setStepErrors(stepOneErrors);

    if (Object.keys(stepOneErrors).length === 0) {
      setStep(2);
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate>
      {splitSteps && (
        <>
          <Eyebrow>{step === 1 ? "1 of 2" : "2 of 2 · Optional"}</Eyebrow>
          <StepHeading ref={headingRef} tabIndex={-1}>
            {step === 1 ? "Welcome to ZAP" : "Your organization"}
          </StepHeading>
          <Body>
            {step === 1
              ? "Tell us a little about yourself."
              : "Add a little context for your team."}
          </Body>
        </>
      )}

      <StepFields hidden={splitSteps && step !== 1}>
        <TextField
          name="firstName"
          label="First name"
          placeholder="Enter your first name"
          autoComplete="given-name"
          defaultValue={state.fields?.firstName}
          maxLength={onboardingFieldLimits.firstName}
          required
          error={errors.firstName}
        />
        <TextField
          name="lastName"
          label="Last name"
          placeholder="Enter your last name"
          autoComplete="family-name"
          defaultValue={state.fields?.lastName}
          maxLength={onboardingFieldLimits.lastName}
          required
          error={errors.lastName}
        />
        <TextField
          name="phone"
          label="Phone"
          placeholder="(555) 555-5555"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={state.fields?.phone}
          maxLength={onboardingFieldLimits.phone}
          required
          error={errors.phone}
        />
      </StepFields>

      <StepFields hidden={splitSteps && step !== 2}>
        <TextField
          name="organization"
          label="Organization (optional)"
          placeholder="Organization name"
          autoComplete="organization"
          defaultValue={state.fields?.organization}
          maxLength={onboardingFieldLimits.organization}
          error={errors.organization}
        />
        <TextField
          name="role"
          label="Role (optional)"
          placeholder="Your role"
          autoComplete="organization-title"
          defaultValue={state.fields?.role}
          maxLength={onboardingFieldLimits.role}
          error={errors.role}
        />
        {showEmail && (
          <TextField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            defaultValue={state.fields?.email}
            required
            error={state.errors?.email}
          />
        )}
      </StepFields>

      {errors.form && <FormMessage role="alert">{errors.form}</FormMessage>}
      {state.message && <Body role="status">{state.message}</Body>}

      {onStepOne ? (
        <PrimaryButton type="submit">Continue</PrimaryButton>
      ) : (
        <PrimaryButton type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </PrimaryButton>
      )}
      {splitSteps && step === 2 && (
        <BackButton
          type="button"
          onClick={() => setStep(1)}
          disabled={isPending}
        >
          Back
        </BackButton>
      )}
    </form>
  );
}

function TextField({
  name,
  label,
  error,
  ...inputProps
}: {
  name: keyof OnboardingFields | "email";
  label: string;
  error?: string;
} & Omit<ComponentProps<typeof Input>, "id" | "name">) {
  const errorId = `${name}-error`;

  return (
    <Field>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
        $invalid={Boolean(error)}
        {...inputProps}
      />
      {error && (
        <ErrorText id={errorId} role="alert">
          {error}
        </ErrorText>
      )}
    </Field>
  );
}

const StepHeading = styled(Heading)`
  &:focus {
    outline: none;
  }
`;

const StepFields = styled(Fields)`
  &[hidden] {
    display: none;
  }
`;

const FormMessage = styled(ErrorText)`
  margin-top: 16px;
`;

const BackButton = styled(TextButton)`
  display: block;
  margin-top: 16px;
  color: ${COLORS.muted};
`;
