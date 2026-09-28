import "server-only";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireVerifiedAuthUser } from "@/lib/auth";

const approvalStatuses = ["pending", "approved", "rejected"] as const;

export type ApprovalStatus = (typeof approvalStatuses)[number];

type AccessUser = {
  userId: string;
  email: string;
  isAdmin: boolean;
  approvalStatus: ApprovalStatus;
};

function isApprovalStatus(value: string): value is ApprovalStatus {
  return approvalStatuses.includes(value as ApprovalStatus);
}

function accessValuesForEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@").at(-1);

  return domain === "zeroabuseproject.org"
    ? { isAdmin: true, approvalStatus: "approved" as const }
    : { isAdmin: false, approvalStatus: "pending" as const };
}

export async function ensureAccessUser(): Promise<AccessUser> {
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

  if (existingUser.approvalStatus !== null) {
    return toAccessUser(existingUser, authUser.email);
  }

  const [initializedUser] = await db
    .update(users)
    .set(accessValuesForEmail(authUser.email))
    .where(and(eq(users.userId, authUser.id), isNull(users.approvalStatus)))
    .returning({
      userId: users.userId,
      isAdmin: users.isAdmin,
      approvalStatus: users.approvalStatus,
    });

  if (initializedUser) {
    return toAccessUser(initializedUser, authUser.email);
  }

  const [accessUser] = await db
    .select({
      userId: users.userId,
      isAdmin: users.isAdmin,
      approvalStatus: users.approvalStatus,
    })
    .from(users)
    .where(eq(users.userId, authUser.id))
    .limit(1);

  if (!accessUser) {
    redirect("/onboarding");
  }

  return toAccessUser(accessUser, authUser.email);
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
  const user = await ensureAccessUser();

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
