import type { ReactNode } from "react";
import { Raleway } from "next/font/google";
import { AuthShell } from "./ui";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell className={raleway.className}>{children}</AuthShell>;
}
