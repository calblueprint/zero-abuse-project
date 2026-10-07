export function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return "Enter your email.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address.";
  }

  return undefined;
}
