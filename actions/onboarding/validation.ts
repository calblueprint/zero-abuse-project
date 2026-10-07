export type OnboardingFields = {
  firstName: string;
  lastName: string;
  phone: string;
  organization: string;
};

export type OnboardingErrors = Partial<
  Record<keyof OnboardingFields, string>
> & {
  form?: string;
};

export type OnboardingState = {
  fields?: OnboardingFields & { email?: string };
  errors?: OnboardingErrors & { email?: string };
  message?: string;
};

export const onboardingFieldLimits = {
  firstName: 100,
  lastName: 100,
  phone: 20,
  organization: 255,
} as const;

type OnboardingParseResult =
  | {
      success: true;
      data: OnboardingFields;
      fields: OnboardingFields;
    }
  | {
      success: false;
      fields: OnboardingFields;
      errors: OnboardingErrors;
    };

export function parseOnboardingFormData(
  formData: FormData,
): OnboardingParseResult {
  const fields: OnboardingFields = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    organization: String(formData.get("organization") ?? ""),
  };
  const phoneDigits = fields.phone.replace(/[\s\-().]/g, "");
  const data: OnboardingFields = {
    firstName: fields.firstName.trim(),
    lastName: fields.lastName.trim(),
    phone: phoneDigits.replace(/^\+?1(?=\d{10}$)/, ""),
    organization: fields.organization.trim(),
  };
  const errors: OnboardingErrors = {};

  if (!data.firstName) {
    errors.firstName = "Enter your first name.";
  } else if (data.firstName.length > onboardingFieldLimits.firstName) {
    errors.firstName = "First name must be 100 characters or fewer.";
  }

  if (!data.lastName) {
    errors.lastName = "Enter your last name.";
  } else if (data.lastName.length > onboardingFieldLimits.lastName) {
    errors.lastName = "Last name must be 100 characters or fewer.";
  }

  if (!fields.phone.trim()) {
    errors.phone = "Enter your phone number.";
  } else if (fields.phone.length > onboardingFieldLimits.phone) {
    errors.phone = "Enter a valid 10-digit US phone number.";
  } else if (!/^\d{10}$/.test(data.phone)) {
    errors.phone = "Enter a valid 10-digit US phone number.";
  }

  if (!data.organization) {
    errors.organization = "Enter your organization.";
  } else if (data.organization.length > onboardingFieldLimits.organization) {
    errors.organization = "Organization must be 255 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, fields, errors };
  }

  return { success: true, data, fields };
}
