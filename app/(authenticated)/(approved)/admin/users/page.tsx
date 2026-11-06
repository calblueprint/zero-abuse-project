import { and, eq } from "drizzle-orm";
import styled from "styled-components";
import { Button } from "@/components/Button";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/access";
import COLORS from "@/styles/colors";
import { Box } from "@/styles/containers";
import { H1, H2, P1, P2 } from "@/styles/text";
import {
  approveUser,
  demoteUser,
  promoteUser,
  rejectUser,
  restoreUser,
  revokeUser,
} from "./actions";

type AdminUsersPageProps = {
  searchParams: Promise<{ notice?: string }>;
};

const notices = {
  "already-reviewed": "That user has already been reviewed.",
  "invalid-user": "The selected user is invalid.",
  "user-changed": "That user's access has changed. Please try again.",
  "self-change": "You cannot change your own access here.",
  "last-admin": "The last active admin cannot be demoted.",
} as const;

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const admin = await requireAdmin();
  const { notice } = await searchParams;

  const pendingUsers = await db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      organization: users.organization,
      role: users.role,
    })
    .from(users)
    .where(eq(users.approvalStatus, "pending"));

  const adminUsers = await db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      organization: users.organization,
    })
    .from(users)
    .where(and(eq(users.approvalStatus, "approved"), eq(users.isAdmin, true)));

  const externalUsers = await db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      organization: users.organization,
    })
    .from(users)
    .where(and(eq(users.approvalStatus, "approved"), eq(users.isAdmin, false)));

  const rejectedUsers = await db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      organization: users.organization,
    })
    .from(users)
    .where(eq(users.approvalStatus, "rejected"));

  return (
    <Page>
      <Box $maxW="1000px" $mx="auto" $h="auto">
        <PageHeading $color={COLORS.navy} $fontWeight={700}>
          User management
        </PageHeading>
        {notice && Object.hasOwn(notices, notice) && (
          <Notice role="status">
            {notices[notice as keyof typeof notices]}
          </Notice>
        )}
        <Section aria-labelledby="pending-users-heading">
          <SectionHeading
            id="pending-users-heading"
            $color={COLORS.navy}
            $fontWeight={600}
          >
            Pending approval requests
          </SectionHeading>
          {pendingUsers.length === 0 ? (
            <EmptyState>No pending users.</EmptyState>
          ) : (
            <UserList>
              {pendingUsers.map(user => (
                <UserRow key={user.userId}>
                  <UserInfo>
                    <UserName $fontWeight={600}>
                      {user.firstName} {user.lastName}
                    </UserName>
                    <UserDetail>{user.email ?? "Email unavailable"}</UserDetail>
                    <UserDetail>
                      {user.organization ?? "No organization"}
                    </UserDetail>
                    <UserDetail>{user.role ?? "No role"}</UserDetail>
                    {user.phone && <UserDetail>{user.phone}</UserDetail>}
                  </UserInfo>
                  <Actions>
                    <form action={approveUser.bind(null, user.userId)}>
                      <ActionButton type="submit" $primaryColor={COLORS.navy}>
                        Approve
                      </ActionButton>
                    </form>
                    <form action={rejectUser.bind(null, user.userId)}>
                      <ActionButton type="submit" $secondaryColor={COLORS.navy}>
                        Reject
                      </ActionButton>
                    </form>
                  </Actions>
                </UserRow>
              ))}
            </UserList>
          )}
        </Section>
        <Section aria-labelledby="admins-heading">
          <SectionHeading
            id="admins-heading"
            $color={COLORS.navy}
            $fontWeight={600}
          >
            Admins
          </SectionHeading>
          {adminUsers.length === 0 ? (
            <EmptyState>No admins.</EmptyState>
          ) : (
            <UserList>
              {adminUsers.map(user => (
                <UserRow key={user.userId}>
                  <UserInfo>
                    <UserName $fontWeight={600}>
                      {user.firstName} {user.lastName}
                    </UserName>
                    <UserDetail>{user.email ?? "Email unavailable"}</UserDetail>
                    {user.organization && (
                      <UserDetail>{user.organization}</UserDetail>
                    )}
                  </UserInfo>
                  {user.userId !== admin.userId && (
                    <Actions>
                      <form action={demoteUser.bind(null, user.userId)}>
                        <ActionButton
                          type="submit"
                          $secondaryColor={COLORS.navy}
                        >
                          Demote to guest
                        </ActionButton>
                      </form>
                    </Actions>
                  )}
                </UserRow>
              ))}
            </UserList>
          )}
        </Section>
        <Section aria-labelledby="external-users-heading">
          <SectionHeading
            id="external-users-heading"
            $color={COLORS.navy}
            $fontWeight={600}
          >
            External users
          </SectionHeading>
          {externalUsers.length === 0 ? (
            <EmptyState>No external users.</EmptyState>
          ) : (
            <UserList>
              {externalUsers.map(user => (
                <UserRow key={user.userId}>
                  <UserInfo>
                    <UserName $fontWeight={600}>
                      {user.firstName} {user.lastName}
                    </UserName>
                    <UserDetail>{user.email ?? "Email unavailable"}</UserDetail>
                    {user.organization && (
                      <UserDetail>{user.organization}</UserDetail>
                    )}
                  </UserInfo>
                  <Actions>
                    <form action={promoteUser.bind(null, user.userId)}>
                      <ActionButton type="submit" $primaryColor={COLORS.navy}>
                        Promote to admin
                      </ActionButton>
                    </form>
                    <form action={revokeUser.bind(null, user.userId)}>
                      <ActionButton type="submit" $secondaryColor={COLORS.navy}>
                        Revoke access
                      </ActionButton>
                    </form>
                  </Actions>
                </UserRow>
              ))}
            </UserList>
          )}
        </Section>
        <Section aria-labelledby="rejected-users-heading">
          <SectionHeading
            id="rejected-users-heading"
            $color={COLORS.navy}
            $fontWeight={600}
          >
            Rejected users
          </SectionHeading>
          {rejectedUsers.length === 0 ? (
            <EmptyState>No rejected users.</EmptyState>
          ) : (
            <UserList>
              {rejectedUsers.map(user => (
                <UserRow key={user.userId}>
                  <UserInfo>
                    <UserName $fontWeight={600}>
                      {user.firstName} {user.lastName}
                    </UserName>
                    <UserDetail>{user.email ?? "Email unavailable"}</UserDetail>
                    {user.organization && (
                      <UserDetail>{user.organization}</UserDetail>
                    )}
                  </UserInfo>
                  <Actions>
                    <form action={restoreUser.bind(null, user.userId)}>
                      <ActionButton type="submit" $primaryColor={COLORS.navy}>
                        Restore access
                      </ActionButton>
                    </form>
                  </Actions>
                </UserRow>
              ))}
            </UserList>
          )}
        </Section>
      </Box>
    </Page>
  );
}

const Page = styled.main`
  min-height: 100vh;
  padding: 72px 24px;
  background: ${COLORS.background};

  @media (max-width: 600px) {
    padding: 32px 16px;
  }
`;

const PageHeading = styled(H1)`
  margin-bottom: 28px;
`;

const Notice = styled(P1)`
  padding: 14px 18px;
  margin-bottom: 24px;
  color: ${COLORS.ink};
  background: ${COLORS.surface};
  border: 1px solid ${COLORS.border};
  border-radius: 8px;
`;

const Section = styled.section`
  padding: 24px 32px;
  margin-bottom: 24px;
  background: ${COLORS.surface};
  border: 1px solid ${COLORS.border};
  border-radius: 8px;

  @media (max-width: 600px) {
    padding: 20px;
  }
`;

const SectionHeading = styled(H2)`
  margin-bottom: 20px;

  @media (max-width: 600px) {
    font-size: 1.4rem;
  }
`;

const EmptyState = styled(P1)`
  padding: 12px 0;
  color: ${COLORS.gray};
`;

const UserList = styled.ul`
  list-style: none;
`;

const UserRow = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 0;
  border-top: 1px solid ${COLORS.border};

  @media (max-width: 700px) {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
  }
`;

const UserInfo = styled.div`
  min-width: 0;
`;

const UserName = styled(P1)`
  color: ${COLORS.ink};
  overflow-wrap: anywhere;
`;

const UserDetail = styled(P2)`
  margin-top: 5px;
  color: ${COLORS.gray};
  overflow-wrap: anywhere;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;

  @media (max-width: 600px) {
    flex-direction: column;

    form {
      width: 100%;
    }
  }
`;

const ActionButton = styled(Button)`
  width: auto;
  min-width: 124px;
  padding: 0 18px;
  font-weight: 500;

  &:focus-visible {
    outline: 2px solid ${COLORS.navy};
    outline-offset: 2px;
  }

  @media (max-width: 600px) {
    width: 100%;
  }
`;
