import { eq } from "drizzle-orm";
import { requireAdmin } from "@/actions/auth/access";
import { db } from "@/db";
import { users } from "@/db/schema";
import { approveUser, rejectUser } from "./actions";

export default async function AdminUsersPage() {
  await requireAdmin();

  const pendingUsers = await db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      organization: users.organization,
    })
    .from(users)
    .where(eq(users.approvalStatus, "pending"));

  return (
    <main>
      <h1>Pending users</h1>
      {pendingUsers.length === 0 ? (
        <p>No pending users.</p>
      ) : (
        <ul>
          {pendingUsers.map(user => (
            <li key={user.userId}>
              <p>
                {user.firstName} {user.lastName}
              </p>
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
