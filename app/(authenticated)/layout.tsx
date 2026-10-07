import type { ReactNode } from "react";
import { requireVerifiedAuthUser } from "@/lib/auth/user";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export default async function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  await requireVerifiedAuthUser();

  return children;
}
