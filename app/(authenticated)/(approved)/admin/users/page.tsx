import type { AccessCategory } from "./AccessFilters";
import type { PeopleSort } from "./PeopleSortDropdown";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import styled from "styled-components";
import AppShell, { Card } from "@/components/AppShell";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/access";
import AccessFilters from "./AccessFilters";
import { approveUser, restoreUser } from "./actions";
import InvitePerson from "./InvitePerson";
import MemberActions from "./MemberActions";
import PeopleSortDropdown from "./PeopleSortDropdown";
import RejectRequestButton from "./RejectRequest";
import ReviewAccessRequest from "./ReviewAccessRequest";

type TabKey = "requests" | "all" | "admins" | "revoked";
const accessCategoryValues = ["admin", "member", "revoked", "pending"] as const;
type Props = {
  searchParams: Promise<{
    access?: string;
    notice?: string;
    q?: string;
    sort?: string;
    tab?: string;
  }>;
};
type Person = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  role: string | null;
  isAdmin: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  approvalDecidedAt: string | null;
};
const notices = {
  "already-reviewed": "That user has already been reviewed.",
  "invalid-user": "The selected user is invalid.",
  "last-admin": "The last active admin cannot be demoted.",
  "self-change": "You cannot change your own access here.",
  "user-changed": "That user's access has changed. Please try again.",
} as const;
const initials = (user: Person) =>
  `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "?";
const statusLabel = (status: Person["approvalStatus"]) =>
  status === "pending"
    ? "Pending"
    : status === "rejected"
      ? "Revoked"
      : "Member";
const displayDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Date unavailable";

function Actions({ user, adminId }: { user: Person; adminId: string }) {
  if (user.approvalStatus === "pending")
    return (
      <ActionSet>
        <RejectRequestButton applicant={user} />
        <form action={approveUser.bind(null, user.userId)}>
          <Action $primary type="submit">
            Approve
          </Action>
        </form>
      </ActionSet>
    );
  if (user.approvalStatus === "rejected")
    return (
      <ActionSet>
        <form action={restoreUser.bind(null, user.userId)}>
          <Action $primary type="submit">
            Restore
          </Action>
        </form>
      </ActionSet>
    );
  if (user.isAdmin && user.userId !== adminId)
    return (
      <MemberActions
        fullName={`${user.firstName} ${user.lastName}`}
        isAdmin
        userId={user.userId}
      />
    );
  if (!user.isAdmin)
    return (
      <MemberActions
        fullName={`${user.firstName} ${user.lastName}`}
        userId={user.userId}
      />
    );
  return null;
}

function PersonRow({
  user,
  adminId,
  date,
}: {
  user: Person;
  adminId: string;
  date: string | null;
}) {
  return (
    <Row>
      <PersonCell>
        <Avatar aria-hidden="true">{initials(user)}</Avatar>
        <div>
          {user.approvalStatus === "pending" ? (
            <ReviewAccessRequest applicant={user} />
          ) : (
            <Name>
              {user.firstName} {user.lastName}
            </Name>
          )}
          <Muted>{user.email ?? "Email unavailable"}</Muted>
        </div>
      </PersonCell>
      <div>
        <Name>{user.organization ?? "Organization unavailable"}</Name>
        <Muted>
          {user.isAdmin ? "Admin" : (user.role ?? "Role unavailable")}
        </Muted>
      </div>
      <div>
        <Badge $isAdmin={user.isAdmin} $status={user.approvalStatus}>
          {user.approvalStatus === "approved" && user.isAdmin
            ? "Admin"
            : statusLabel(user.approvalStatus)}
        </Badge>
      </div>
      <Muted>{displayDate(date)}</Muted>
      <ActionCell>
        <Actions adminId={adminId} user={user} />
      </ActionCell>
    </Row>
  );
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const admin = await requireAdmin();
  const { access, notice, q, sort, tab } = await searchParams;
  const activeTab: TabKey =
    tab === "all" || tab === "admins" || tab === "revoked" ? tab : "requests";
  const sortKey: PeopleSort = sort === "admins" ? "admins" : "recent";
  const fields = {
    userId: users.userId,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    phone: users.phone,
    organization: users.organization,
    role: users.role,
    isAdmin: users.isAdmin,
    approvalStatus: users.approvalStatus,
    approvalDecidedAt: users.approvalDecidedAt,
  };
  const [pending, admins, guests, revoked] = await Promise.all([
    db.select(fields).from(users).where(eq(users.approvalStatus, "pending")),
    db
      .select(fields)
      .from(users)
      .where(
        and(eq(users.approvalStatus, "approved"), eq(users.isAdmin, true)),
      ),
    db
      .select(fields)
      .from(users)
      .where(
        and(eq(users.approvalStatus, "approved"), eq(users.isAdmin, false)),
      ),
    db.select(fields).from(users).where(eq(users.approvalStatus, "rejected")),
  ]);
  const allCount =
    pending.length + admins.length + guests.length + revoked.length;
  const accessCounts: Record<AccessCategory, number> = {
    admin: admins.length,
    member: guests.length,
    pending: pending.length,
    revoked: revoked.length,
  };
  const accessFilters = Array.from(
    new Set(
      (access?.split(",") ?? []).filter((value): value is AccessCategory =>
        accessCategoryValues.includes(value as AccessCategory),
      ),
    ),
  );
  const tabUsers =
    activeTab === "all"
      ? [...pending, ...admins, ...guests, ...revoked]
      : activeTab === "admins"
        ? admins
        : activeTab === "revoked"
          ? revoked
          : pending;
  const dateColumnLabel =
    activeTab === "requests"
      ? "Requested"
      : activeTab === "revoked"
        ? "Revoked"
        : "Joined";
  const dateForUser = (user: Person) => {
    if (activeTab === "revoked") return user.approvalDecidedAt;
    if (
      (activeTab === "all" || activeTab === "admins") &&
      user.approvalStatus === "approved"
    )
      return user.approvalDecidedAt;
    return null;
  };
  const query = q?.trim().toLocaleLowerCase() ?? "";
  const filteredUsers = tabUsers
    .filter(user => {
      const searchable = [
        user.firstName,
        user.lastName,
        user.email,
        user.organization,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLocaleLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (!accessFilters.length ||
          accessFilters.some(category =>
            category === "admin"
              ? user.approvalStatus === "approved" && user.isAdmin
              : category === "member"
                ? user.approvalStatus === "approved" && !user.isAdmin
                : category === "pending"
                  ? user.approvalStatus === "pending"
                  : user.approvalStatus === "rejected",
          ))
      );
    })
    .sort((left, right) => {
      if (sortKey === "admins" && left.isAdmin !== right.isAdmin)
        return left.isAdmin ? -1 : 1;

      const dateOrder = (right.approvalDecidedAt ?? "").localeCompare(
        left.approvalDecidedAt ?? "",
      );
      return dateOrder;
    });
  const currentParams = new URLSearchParams();
  if (q) currentParams.set("q", q);
  if (accessFilters.length)
    currentParams.set("access", accessFilters.join(","));
  if (sortKey !== "recent") currentParams.set("sort", sortKey);
  const tabHref = (nextTab: TabKey) => {
    const params = new URLSearchParams(currentParams);
    if (nextTab !== "requests") params.set("tab", nextTab);
    return `/admin/users${params.size ? `?${params}` : ""}`;
  };
  return (
    <AppShell
      firstName={admin.firstName}
      isAdmin={admin.isAdmin}
      lastName={admin.lastName}
    >
      <Page>
        <Content>
          <Heading>
            <h1>People</h1>
            <InvitePerson />
          </Heading>
          {notice && Object.hasOwn(notices, notice) && (
            <Notice role="status">
              {notices[notice as keyof typeof notices]}
            </Notice>
          )}
          <Toolbar as="form" aria-label="People list controls" method="get">
            <Search>
              <Icon viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </Icon>
              <SearchInput
                defaultValue={q}
                name="q"
                placeholder="Search by name, email, or organization"
              />
            </Search>
            <AccessFilters applied={accessFilters} counts={accessCounts} />
            <i />
            <PeopleSortDropdown value={sortKey} />
            <input
              name="access"
              type="hidden"
              value={accessFilters.join(",")}
            />
            <input name="sort" type="hidden" value={sortKey} />
            <input
              name="tab"
              type="hidden"
              value={activeTab === "requests" ? "" : activeTab}
            />
          </Toolbar>
          <Tabs aria-label="People categories">
            <Tab
              $active={activeTab === "requests"}
              as={Link}
              href={tabHref("requests")}
            >
              Access requests <Count $requests>{pending.length}</Count>
            </Tab>
            <Tab $active={activeTab === "all"} as={Link} href={tabHref("all")}>
              All <Count>{allCount}</Count>
            </Tab>
            <Tab
              $active={activeTab === "admins"}
              as={Link}
              href={tabHref("admins")}
            >
              Admins <Count>{admins.length}</Count>
            </Tab>
            <Tab
              $active={activeTab === "revoked"}
              as={Link}
              href={tabHref("revoked")}
            >
              Revoked <Count>{revoked.length}</Count>
            </Tab>
          </Tabs>
          <Results aria-label={`${activeTab} people`}>
            <Header aria-hidden="true">
              <span>Person</span>
              <span>Organization and role</span>
              <span>Access</span>
              <span>{dateColumnLabel}</span>
              <span />
            </Header>
            {filteredUsers.length ? (
              filteredUsers.map(user => (
                <PersonRow
                  adminId={admin.userId}
                  date={dateForUser(user)}
                  key={user.userId}
                  user={user}
                />
              ))
            ) : (
              <Empty>No people match the current view.</Empty>
            )}
          </Results>
        </Content>
      </Page>
    </AppShell>
  );
}

const Page = styled(Card)`
  color: #20252b;
`;
const Content = styled.div`
  width: 100%;
  padding: 36px 48px 24px;
  @media (max-width: 760px) {
    padding: 28px 20px 24px;
  }
`;
const Heading = styled.div`
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 24px;
  h1 {
    font-size: 34px;
    font-weight: 400;
    letter-spacing: -0.4px;
    line-height: 42px;
  }
`;
const Notice = styled.p`
  margin-bottom: 24px;
  padding: 12px 16px;
  color: #5c4800;
  background: #fbeda3;
  border-radius: 10px;
  font-size: 14px;
`;
const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  > i {
    flex: 1;
  }
`;
const Search = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(480px, 52vw);
  height: 40px;
  padding: 0 16px;
  overflow: hidden;
  color: #8791a0;
  background: #f3f5f9;
  border-radius: 10px;
  font-size: 14px;
  white-space: nowrap;
`;
const SearchInput = styled.input`
  width: 100%;
  color: #20252b;
  background: transparent;
  border: 0;
  font: inherit;
  outline: 0;
  &::placeholder {
    color: #8791a0;
  }
`;
const Icon = styled.svg`
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  fill: none;
  stroke: #5f6875;
  stroke-linecap: round;
  stroke-width: 1.8px;
`;
const Tabs = styled.div`
  display: flex;
  gap: 28px;
  height: 45px;
  border-bottom: 1px solid #e1e5eb;
`;
const Tab = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 45px;
  color: ${p => (p.$active ? "#182c46" : "#5f6875")};
  border-bottom: ${p => (p.$active ? "2px solid #182c46" : "2px solid transparent")};
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
`;
const Count = styled.span<{ $requests?: boolean }>`
  min-width: 24px;
  padding: 1px 8px;
  color: ${p => (p.$requests ? "#5c4800" : "#8791a0")};
  background: ${p => (p.$requests ? "#fbeda3" : "#eef2f6")};
  border-radius: 999px;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  text-align: center;
`;
const Results = styled.section`
  margin-top: 24px;
  overflow-x: auto;
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns:
    minmax(260px, 1.25fr) minmax(220px, 1fr)
    92px 120px minmax(150px, auto);
  gap: 24px;
  min-width: 940px;
`;
const Header = styled(Grid)`
  align-items: center;
  height: 40px;
  padding: 0 20px;
  color: #8791a0;
  font-size: 13px;
  line-height: 18px;
`;
const Row = styled(Grid)`
  box-sizing: border-box;
  align-items: center;
  min-height: 69px;
  padding: 14px 20px;
  border-top: 1px solid #e1e5eb;
`;
const PersonCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;
const Avatar = styled.div`
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  color: #2a3799;
  background: #dce1fb;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
`;
const Name = styled.p`
  overflow-wrap: anywhere;
  color: #20252b;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
`;
const Muted = styled.p`
  overflow-wrap: anywhere;
  color: #5f6875;
  font-size: 13px;
  line-height: 18px;
`;
const Badge = styled.span<{
  $isAdmin: boolean;
  $status: Person["approvalStatus"];
}>`
  display: inline-flex;
  padding: 2px 8px;
  color: ${p => (p.$status === "pending" ? "#5c4800" : p.$status === "rejected" ? "#c2412d" : p.$isAdmin ? "#2a3799" : "#5f6875")};
  background: ${p => (p.$status === "pending" ? "#fbeda3" : p.$status === "rejected" ? "#fde8e5" : p.$isAdmin ? "#dce1fb" : "#f3f6fa")};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
`;
const ActionCell = styled.div`
  justify-self: end;
`;
const ActionSet = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
`;
const Action = styled.button<{ $primary?: boolean }>`
  min-height: 32px;
  padding: 6px 12px;
  color: ${p => (p.$primary ? "#2a3799" : "#5f6875")};
  background: ${p => (p.$primary ? "#dce1fb" : "#fff")};
  border: 1px solid ${p => (p.$primary ? "#dce1fb" : "#e1e5eb")};
  border-radius: 8px;
  cursor: pointer;
  font: 500 13px/18px inherit;
`;
const Empty = styled.p`
  min-width: 940px;
  padding: 24px 20px;
  color: #5f6875;
  border-top: 1px solid #e1e5eb;
  font-size: 14px;
`;
