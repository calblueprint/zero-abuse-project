import { updatePassword } from "@/actions/auth/actions";
import { requireVerifiedAuthUser } from "@/lib/auth/user";

type UpdatePasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  "password-mismatch": "Passwords do not match.",
  "short-password": "Password must be at least 8 characters.",
  "update-failed": "Unable to update your password. Please try again.",
};

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  await requireVerifiedAuthUser();
  const { error } = await searchParams;

  return (
    <main>
      <h1>Choose a new password</h1>
      {error && errorMessages[error] && (
        <p role="alert">{errorMessages[error]}</p>
      )}
      <form action={updatePassword}>
        <label htmlFor="password">New password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <label htmlFor="confirmPassword">Confirm new password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <button type="submit">Update password</button>
      </form>
    </main>
  );
}
