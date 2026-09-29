import { redirect } from "next/navigation";
import { ensureAccessUser } from "@/actions/auth/access";

export default async function WaitingForApprovalPage() {
  const user = await ensureAccessUser();

  if (user.approvalStatus === "approved") {
    redirect("/");
  }

  if (user.approvalStatus === "rejected") {
    redirect("/access-rejected");
  }

  return <main>Waiting for approval</main>;
}
