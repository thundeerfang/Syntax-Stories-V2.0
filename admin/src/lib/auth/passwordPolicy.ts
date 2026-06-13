export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const ADMIN_OPERATOR_PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'More than 10 characters',
    test: (p) => p.length > 10,
  },
  {
    id: 'lower',
    label: 'At least one lowercase letter',
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: 'upper',
    label: 'At least one uppercase letter',
    test: (p) => /[A-Z]/.test(p),
  },
];

export function isAdminOperatorPasswordValid(password: string): boolean {
  return ADMIN_OPERATOR_PASSWORD_RULES.every((r) => r.test(password));
}
