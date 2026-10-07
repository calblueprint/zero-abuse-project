import type { OnboardingFields } from "@/actions/onboarding/validation";
import { parseOnboardingFormData } from "@/actions/onboarding/validation";

export type ProfileFields = OnboardingFields & {
  email: string;
};

export type ProfileErrors = Partial<Record<keyof ProfileFields, string>> & {
  form?: string;
};

export type ProfileState = {
  fields?: ProfileFields;
  errors?: ProfileErrors;
  message?: string;
};

export const profileFieldLimits = {
  email: 254,
} as const;

type ProfileParseResult =
  | {
      success: true;
      data: ProfileFields;
      fields: ProfileFields;
    }
  | {
      success: false;
      fields: ProfileFields;
      errors: ProfileErrors;
    };

export function parseProfileFormData(formData: FormData): ProfileParseResult {
  const profileResult = parseOnboardingFormData(formData);
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const fields = { ...profileResult.fields, email };
  const errors: ProfileErrors = profileResult.success
    ? {}
    : { ...profileResult.errors };

  if (!email) {
    errors.email = "Enter your email.";
  } else if (
    email.length > profileFieldLimits.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = "Enter a valid email address.";
  }

  if (!profileResult.success || Object.keys(errors).length > 0) {
    return { success: false, fields, errors };
  }

  return {
    success: true,
    data: { ...profileResult.data, email },
    fields,
  };
}
