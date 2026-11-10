"use client";

import type { OnboardingFields } from "@/actions/onboarding/validation";
import type { ProfileState } from "@/actions/profile/actions";
import type { ComponentProps, Ref } from "react";
import type { ProfileDetails } from "./ProfileView";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { unstable_rethrow } from "next/navigation";
import styled from "styled-components";
import {
  onboardingFieldLimits,
  parseOnboardingFormData,
} from "@/actions/onboarding/validation";
import { submitProfileUpdate } from "@/actions/profile/actions";
import COLORS from "@/styles/colors";
import { SoftButton, TextButton } from "@/styles/controls";
import { Actions, ErrorText, fieldBox, FieldInput, Hint } from "./styles";

type FieldName = keyof OnboardingFields | "email";

type FieldProps = {
  id: string;
  name: FieldName;
  defaultValue?: string;
  error?: string;
  errorId: string;
};

type DetailsFormProps = {
  profile: ProfileDetails;
  onCancel: () => void;
  onSaved: (result: ProfileState) => void;
};

export default function DetailsForm({
  profile,
  onCancel,
  onSaved,
}: DetailsFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (
      previousState: ProfileState,
      formData: FormData,
    ): Promise<ProfileState> => {
      let result: ProfileState;
      try {
        result = await submitProfileUpdate(previousState, formData);
      } catch (error) {
        unstable_rethrow(error);
        // The request itself failed. Keep what was typed, since React
        // resets the form after the action.
        return {
          fields: {
            ...parseOnboardingFormData(formData).fields,
            email: String(formData.get("email") ?? ""),
          },
          errors: { form: "Something went wrong. Please try again." },
        };
      }

      if (result.status) {
        startTransition(() => onSaved(result));
      }

      return result;
    },
    {
      fields: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        organization: profile.organization,
        role: profile.role,
      },
    },
  );
  const id = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [changingEmail, setChangingEmail] = useState(false);
  const emailEditable = changingEmail || Boolean(state.errors?.email);
  const { fields, errors } = state;

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    if (changingEmail) {
      emailRef.current?.focus();
      emailRef.current?.select();
    }
  }, [changingEmail]);

  const fieldProps = (name: FieldName): FieldProps => ({
    id: `${id}-${name}`,
    name,
    defaultValue: fields?.[name],
    error: errors?.[name],
    errorId: `${id}-${name}-error`,
  });

  return (
    <Form action={formAction} noValidate>
      <Grid>
        <TextField
          label="First name"
          field={fieldProps("firstName")}
          ref={firstFieldRef}
          autoComplete="given-name"
          maxLength={onboardingFieldLimits.firstName}
          required
        />
        <TextField
          label="Last name"
          field={fieldProps("lastName")}
          autoComplete="family-name"
          maxLength={onboardingFieldLimits.lastName}
          required
        />
        <EmailField
          field={fieldProps("email")}
          ref={emailRef}
          editable={emailEditable}
          pendingEmail={profile.pendingEmail}
          onChange={() => setChangingEmail(true)}
        />
        <TextField
          label="Phone"
          field={fieldProps("phone")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={onboardingFieldLimits.phone}
          required
        />
        <TextField
          label="Organization"
          field={fieldProps("organization")}
          autoComplete="organization"
          maxLength={onboardingFieldLimits.organization}
        />
        <TextField
          label="Role in organization"
          field={fieldProps("role")}
          autoComplete="organization-title"
          maxLength={onboardingFieldLimits.role}
        />
      </Grid>
      {errors?.form && <ErrorText role="alert">{errors.form}</ErrorText>}
      {state.message && <Hint role="status">{state.message}</Hint>}
      <Actions>
        <TextButton type="button" onClick={onCancel} disabled={isPending}>
          Cancel
        </TextButton>
        <SoftButton type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </SoftButton>
      </Actions>
    </Form>
  );
}

function TextField({
  label,
  field,
  ref,
  ...inputProps
}: {
  label: string;
  field: FieldProps;
  ref?: Ref<HTMLInputElement>;
} & Omit<ComponentProps<"input">, "id" | "name" | "defaultValue" | "ref">) {
  return (
    <Field>
      <Label htmlFor={field.id}>{label}</Label>
      <FieldInput
        ref={ref}
        id={field.id}
        name={field.name}
        defaultValue={field.defaultValue}
        aria-invalid={Boolean(field.error) || undefined}
        aria-describedby={field.error ? field.errorId : undefined}
        $invalid={Boolean(field.error)}
        {...inputProps}
      />
      {field.error && <ErrorText id={field.errorId}>{field.error}</ErrorText>}
    </Field>
  );
}

function EmailField({
  field,
  ref,
  editable,
  pendingEmail,
  onChange,
}: {
  field: FieldProps;
  ref: Ref<HTMLInputElement>;
  editable: boolean;
  pendingEmail: string | null;
  onChange: () => void;
}) {
  const pendingId = `${field.id}-pending`;
  const describedBy =
    [field.error && field.errorId, pendingEmail && pendingId]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <Field>
      <Label htmlFor={field.id}>Email</Label>
      <EmailBox $invalid={Boolean(field.error)}>
        <EmailInput
          ref={ref}
          id={field.id}
          name={field.name}
          type="email"
          autoComplete="email"
          defaultValue={field.defaultValue}
          readOnly={!editable}
          required
          aria-invalid={Boolean(field.error) || undefined}
          aria-describedby={describedBy}
        />
        {!editable && (
          <ChangeButton
            type="button"
            aria-label="Change email"
            onClick={onChange}
          >
            Change
          </ChangeButton>
        )}
      </EmailBox>
      {field.error && <ErrorText id={field.errorId}>{field.error}</ErrorText>}
      {pendingEmail && (
        <Hint id={pendingId}>
          {pendingEmail} is waiting for confirmation. Changing your email again
          sends new links.
        </Hint>
      )}
    </Field>
  );
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 28px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 16px;

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const Label = styled.label`
  color: ${COLORS.inkText};
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
`;

const EmailBox = styled.div<{ $invalid?: boolean }>`
  ${fieldBox}
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;

  &:focus-within {
    outline: 2px solid
      ${({ $invalid }) => ($invalid ? COLORS.error : COLORS.actionNavy)};
    outline-offset: 1px;
  }
`;

const EmailInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 0 0 16px;
  border: none;
  background: none;
  color: inherit;
  font: inherit;

  &:only-child {
    padding-right: 16px;
  }

  &:focus-visible {
    outline: none;
  }
`;

const ChangeButton = styled.button`
  flex-shrink: 0;
  height: 100%;
  padding: 0 16px 0 0;
  border: none;
  background: none;
  color: ${COLORS.secondaryText};
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;

  &:hover {
    color: ${COLORS.inkText};
  }
`;
