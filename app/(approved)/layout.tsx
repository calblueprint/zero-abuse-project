import type { ReactNode } from "react";
import { requireApprovedUser } from "@/actions/auth/access";

type ApprovedLayoutProps = {
  children: ReactNode;
};

export default async function ApprovedLayout({
  children,
}: ApprovedLayoutProps) {
  await requireApprovedUser();

  return children;
}
