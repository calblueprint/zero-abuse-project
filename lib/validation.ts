export type OnboardingFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
};

export type OnboardingErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  form?: string;
};

export type OnboardingState = {
  fields?: OnboardingFields;
  errors?: OnboardingErrors;
};

export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/[\s\-().]/g, "");
  return digits.replace(/^\+?1(?=\d{10}$)/, "");
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhoneNumber(phone: string): boolean {
  return /^\d{10}$/.test(normalizePhoneNumber(phone));
}

export function validateOnboardingFields(
  fields: OnboardingFields,
): OnboardingErrors {
  const errors: OnboardingErrors = {};

  for (const key in fields) {
    if (fields[key as keyof OnboardingFields].trim() === "") {
      errors[key as keyof OnboardingErrors] = `${key} is required.`;
    }
  }

  if (fields.email.trim() && !isValidEmail(fields.email.trim())) {
    errors.email = "Invalid email address.";
  }

  if (fields.phone.trim() && !isValidPhoneNumber(fields.phone)) {
    errors.phone = "Invalid phone number.";
  }

  return errors;
}
