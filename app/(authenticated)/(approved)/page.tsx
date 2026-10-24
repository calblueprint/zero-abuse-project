import HomeView from "@/components/home/HomeView";
import { getLatestTrends } from "@/db/queries/trends";
import { requireApprovedUser } from "@/lib/auth/access";

export default async function Home() {
  const user = await requireApprovedUser();
  const { trends, total } = await getLatestTrends(3);
  // Array.from keeps characters outside the BMP whole.
  const initials = [user.firstName, user.lastName]
    .map(name => Array.from(name)[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <HomeView
      firstName={user.firstName}
      initials={initials}
      isAdmin={user.isAdmin}
      today={new Date().toISOString()}
      trends={trends}
      totalTrends={total}
    />
  );
}
