import { redirect } from "next/navigation";
import { requireAccessUser } from "@/lib/auth/access";

export default async function WaitingForApprovalPage() {
  const user = await requireAccessUser();

  if (user.approvalStatus === "approved") {
    redirect("/");
  }

  if (user.approvalStatus === "rejected") {
    redirect("/access-rejected");
  }

  return <main>Waiting for approval</main>;
}
