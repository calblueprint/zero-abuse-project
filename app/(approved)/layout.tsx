import type { ReactNode } from "react";
import { requireVerifiedAuthUser } from "@/lib/auth";

type ApprovedLayoutProps = {
  children: ReactNode;
};

export default async function ApprovedLayout({
  children,
}: ApprovedLayoutProps) {
  await requireVerifiedAuthUser();

  return children;
}
