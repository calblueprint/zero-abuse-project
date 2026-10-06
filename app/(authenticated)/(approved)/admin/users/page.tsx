import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/access";
import { approveUser, rejectUser } from "./actions";

type AdminUsersPageProps = {
  searchParams: Promise<{ notice?: string }>;
};

const notices = {
  "already-reviewed": "That user has already been reviewed.",
  "invalid-user": "The selected user is invalid.",
} as const;

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  await requireAdmin();
  const { notice } = await searchParams;

  const pendingUsers = await db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      organization: users.organization,
    })
    .from(users)
    .where(eq(users.approvalStatus, "pending"));

  return (
    <main>
      <h1>Pending users</h1>
      {notice && notice in notices && (
        <p role="status">{notices[notice as keyof typeof notices]}</p>
      )}
      {pendingUsers.length === 0 ? (
        <p>No pending users.</p>
      ) : (
        <ul>
          {pendingUsers.map(user => (
            <li key={user.userId}>
              <p>
                {user.firstName} {user.lastName}
              </p>
              <p>{user.email ?? "Email unavailable"}</p>
              <p>{user.organization}</p>
              <p>{user.phone}</p>
              <form action={approveUser.bind(null, user.userId)}>
                <button type="submit">Approve</button>
              </form>
              <form action={rejectUser.bind(null, user.userId)}>
                <button type="submit">Reject</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
