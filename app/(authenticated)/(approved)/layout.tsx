import type { ReactNode } from "react";
import { requireApprovedUser } from "@/lib/auth/access";

type ApprovedLayoutProps = {
  children: ReactNode;
};

export default async function ApprovedLayout({
  children,
}: ApprovedLayoutProps) {
  await requireApprovedUser();

  return children;
}
