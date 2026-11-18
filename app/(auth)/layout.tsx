import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/ui";
import { dmSans } from "@/styles/fonts";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthShell appearance="gradient" className={dmSans.className}>
      {children}
    </AuthShell>
  );
}
