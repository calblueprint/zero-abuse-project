import UpdatePasswordForm from "@/app/(auth)/_components/UpdatePasswordForm";
import { requireVerifiedAuthUser } from "@/lib/auth";

export default async function UpdatePasswordPage() {
  await requireVerifiedAuthUser();

  return (
    <main>
      <h1>Choose a new password</h1>
      <UpdatePasswordForm />
    </main>
  );
}
