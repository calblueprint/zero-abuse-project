import { requireVerifiedAuthUser } from "@/lib/auth/user";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata = { title: "Update your password" };

type UpdatePasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  await requireVerifiedAuthUser();
  const { error } = await searchParams;

  return <UpdatePasswordForm error={error} />;
}
