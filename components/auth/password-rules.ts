type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_HINT =
  "Atleast 8 characters, Contains a special character (e.g. ^&*), Atleast 1 number, Atleast 1 lowercase character, Atleast 1 uppercase character";
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "8+ characters",
    test: password => password.length >= 8,
  },

  {
    id: "special_char",
    label: "Contains atleast 1 special character",
    test: password => /[^A-Za-z0-9]/.test(password),
  },
  {
    id: "number",
    label: "Contains a number",
    test: password => /\d/.test(password),
  },
  {
    id: "lowercase",
    label: "Contains atleast 1 lowercase",
    test: password => /[a-z]/.test(password),
  },
  {
    id: "uppercase",
    label: "Contains atleast 1 uppercase",
    test: password => /[A-Z]/.test(password),
  },
];

export function passwordIsValid(password: string) {
  return PASSWORD_RULES.every(rule => rule.test(password));
}
