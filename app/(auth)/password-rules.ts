export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_HINT = "8+ characters.";

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "8+ characters",
    test: password => password.length >= 8,
  },
];

export function passwordIsValid(password: string) {
  return PASSWORD_RULES.every(rule => rule.test(password));
}
