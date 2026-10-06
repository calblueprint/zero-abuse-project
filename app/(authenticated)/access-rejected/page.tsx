import { redirect } from "next/navigation";
import { ensureAccessUser } from "@/actions/auth/access";

export default async function AccessRejectedPage() {
  const user = await ensureAccessUser();

  if (user.approvalStatus === "approved") {
    redirect("/");
  }

  if (user.approvalStatus === "pending") {
    redirect("/waiting-for-approval");
  }

  return <main>Your access request was rejected.</main>;
}
