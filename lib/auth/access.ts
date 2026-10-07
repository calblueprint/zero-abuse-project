import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { approvalStatuses, users } from "@/db/schema";
import { requireVerifiedAuthUser } from "@/lib/auth";

export type ApprovalStatus = (typeof approvalStatuses)[number];

type AccessUser = {
  userId: string;
  email: string;
  isAdmin: boolean;
  approvalStatus: ApprovalStatus;
};

export type InitialUserAccess = Pick<AccessUser, "isAdmin" | "approvalStatus">;

function isApprovalStatus(value: string): value is ApprovalStatus {
  return approvalStatuses.includes(value as ApprovalStatus);
}

export function getInitialUserAccess(email: string): InitialUserAccess {
  const domain = email.trim().toLowerCase().split("@").at(-1);

  return domain === "zeroabuseproject.org"
    ? { isAdmin: true, approvalStatus: "approved" as const }
    : { isAdmin: false, approvalStatus: "pending" as const };
}

export async function requireAccessUser(): Promise<AccessUser> {
  const authUser = await requireVerifiedAuthUser();
  const [existingUser] = await db
    .select({
      userId: users.userId,
      onboardingComplete: users.onboardingComplete,
      isAdmin: users.isAdmin,
      approvalStatus: users.approvalStatus,
    })
    .from(users)
    .where(eq(users.userId, authUser.id))
    .limit(1);

  if (!existingUser?.onboardingComplete) {
    redirect("/onboarding");
  }

  return toAccessUser(existingUser, authUser.email);
}

function toAccessUser(
  user: {
    userId: string;
    isAdmin: boolean | null;
    approvalStatus: string | null;
  },
  email: string,
): AccessUser {
  if (
    user.isAdmin === null ||
    !user.approvalStatus ||
    !isApprovalStatus(user.approvalStatus)
  ) {
    throw new Error("User access state is invalid");
  }

  return {
    userId: user.userId,
    email,
    isAdmin: user.isAdmin,
    approvalStatus: user.approvalStatus,
  };
}

export async function requireApprovedUser(): Promise<AccessUser> {
  const user = await requireAccessUser();

  if (user.approvalStatus === "pending") {
    redirect("/waiting-for-approval");
  }

  if (user.approvalStatus === "rejected") {
    redirect("/access-rejected");
  }

  return user;
}

export async function requireAdmin(): Promise<AccessUser> {
  const user = await requireApprovedUser();

  if (!user.isAdmin) {
    redirect("/");
  }

  return user;
}
