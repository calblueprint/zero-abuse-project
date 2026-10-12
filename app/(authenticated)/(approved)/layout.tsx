import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireApprovedUser } from "@/lib/auth/access";

type ApprovedLayoutProps = {
  children: ReactNode;
};

export default async function ApprovedLayout({
  children,
}: ApprovedLayoutProps) {
  const user = await requireApprovedUser();

  if (!user.welcomeSeenAt) {
    redirect("/welcome");
  }

  return children;
}
