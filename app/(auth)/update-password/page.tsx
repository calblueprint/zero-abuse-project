import { requireVerifiedAuthUser } from "@/lib/auth/user";
import { UpdatePasswordForm } from "./update-password-form";

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
