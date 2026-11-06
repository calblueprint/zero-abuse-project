import type { LatestTrend } from "@/db/queries/trends";
import Image from "next/image";
import styled from "styled-components";
import HomeGlow from "@/assets/images/home-glow.svg";
import AppShell, { Card } from "@/components/AppShell";
import MetricTiles from "@/components/home/MetricTiles";
import NeedsAttention from "@/components/home/NeedsAttention";
import RecentlyAccessed from "@/components/home/RecentlyAccessed";
import SearchHero from "@/components/home/SearchHero";
import LocalDate from "@/components/LocalDate";
import COLORS from "@/styles/colors";

type HomeViewProps = {
  firstName: string;
  initials: string;
  isAdmin: boolean;
  today: string;
  trends: LatestTrend[];
  totalTrends: number;
};

export default function HomeView({
  firstName,
  initials,
  isAdmin,
  today,
  trends,
  totalTrends,
}: HomeViewProps) {
  return (
    <AppShell initials={initials} isAdmin={isAdmin}>
      <HomeCard>
        <Glow src={HomeGlow} alt="" width={1040} height={290} />
        <Header>
          <DateLine>
            <LocalDate
              value={today}
              locale="en-US"
              options={{ weekday: "long", month: "long", day: "numeric" }}
            />
          </DateLine>
          <Headline>Welcome back, {firstName}</Headline>
        </Header>
        <SearchHero />
        <MetricTiles />
        <Lists>
          <RecentlyAccessed />
          <Divider />
          <NeedsAttention trends={trends} total={totalTrends} />
        </Lists>
      </HomeCard>
    </AppShell>
  );
}

const HomeCard = styled(Card)`
  isolation: isolate;
  gap: 46px;
  padding: 56px 48px 24px;
  overflow: hidden;

  @media (max-width: 600px) {
    padding: 32px 20px 24px;
  }
`;

const Glow = styled(Image)`
  position: absolute;
  top: 124px;
  left: 59px;
  z-index: -1;
  pointer-events: none;
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const DateLine = styled.p`
  min-height: 18px;
  color: ${COLORS.mutedText};
  font-size: 13px;
  line-height: 18px;
`;

const Headline = styled.h1`
  color: ${COLORS.inkText};
  font-size: 56px;
  font-weight: 400;
  line-height: 64px;
  letter-spacing: -0.9px;
  overflow-wrap: anywhere;

  @media (max-width: 600px) {
    font-size: 40px;
    line-height: 48px;
  }
`;

const Lists = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 32px;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Divider = styled.div`
  align-self: stretch;
  flex-shrink: 0;
  width: 1px;
  background: ${COLORS.divider};

  @media (max-width: 900px) {
    display: none;
  }
`;
