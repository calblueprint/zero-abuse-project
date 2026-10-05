export type OnboardingFields = {
  firstName: string;
  lastName: string;
  phone: string;
  organization: string;
};

export type OnboardingErrors = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  organization?: string;
  form?: string;
};

export type OnboardingState = {
  fields?: OnboardingFields;
  errors?: OnboardingErrors;
};

export const onboardingFieldLimits = {
  firstName: 100,
  lastName: 100,
  phone: 20,
  organization: 255,
} as const;

export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/[\s\-().]/g, "");
  return digits.replace(/^\+?1(?=\d{10}$)/, "");
}

export function isValidPhoneNumber(phone: string): boolean {
  return /^\d{10}$/.test(normalizePhoneNumber(phone));
}

export function validateOnboardingFields(
  fields: OnboardingFields,
): OnboardingErrors {
  const errors: OnboardingErrors = {};

  if (!fields.firstName.trim()) {
    errors.firstName = "Enter your first name.";
  } else if (fields.firstName.length > onboardingFieldLimits.firstName) {
    errors.firstName = "First name must be 100 characters or fewer.";
  }

  if (!fields.lastName.trim()) {
    errors.lastName = "Enter your last name.";
  } else if (fields.lastName.length > onboardingFieldLimits.lastName) {
    errors.lastName = "Last name must be 100 characters or fewer.";
  }

  if (!fields.phone.trim()) {
    errors.phone = "Enter your phone number.";
  } else if (fields.phone.length > onboardingFieldLimits.phone) {
    errors.phone = "Enter a valid 10-digit US phone number.";
  } else if (!isValidPhoneNumber(fields.phone)) {
    errors.phone = "Enter a valid 10-digit US phone number.";
  }

  if (!fields.organization.trim()) {
    errors.organization = "Enter your organization.";
  } else if (fields.organization.length > onboardingFieldLimits.organization) {
    errors.organization = "Organization must be 255 characters or fewer.";
  }

  return errors;
}
