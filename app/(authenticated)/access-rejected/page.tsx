import { redirect } from "next/navigation";
import { requireAccessUser } from "@/lib/auth/access";

export default async function AccessRejectedPage() {
  const user = await requireAccessUser();

  if (user.approvalStatus === "approved") {
    redirect("/");
  }

  if (user.approvalStatus === "pending") {
    redirect("/waiting-for-approval");
  }

  return <main>Your access request was rejected.</main>;
}
