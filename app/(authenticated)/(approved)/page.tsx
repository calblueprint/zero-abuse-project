import HomeView from "@/components/home/HomeView";
import { getLatestTrends } from "@/db/queries/trends";
import { requireApprovedUser } from "@/lib/auth/access";
import { getInitials } from "@/lib/utils";

export default async function Home() {
  const user = await requireApprovedUser();
  const { trends, total } = await getLatestTrends(3);
  return (
    <HomeView
      firstName={user.firstName}
      initials={getInitials(user.firstName, user.lastName)}
      isAdmin={user.isAdmin}
      today={new Date().toISOString()}
      trends={trends}
      totalTrends={total}
    />
  );
}
