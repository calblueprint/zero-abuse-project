import type { LatestTrend } from "@/db/queries/trends";
import styled, { css } from "styled-components";
import {
  RowMeta,
  RowText,
  RowTitle,
  SectionHeading,
  SectionTitle,
} from "@/components/home/styles";
import LocalDate from "@/components/LocalDate";
import COLORS from "@/styles/colors";

type NeedsAttentionProps = {
  trends: LatestTrend[];
  total: number;
};

export default function NeedsAttention({ trends, total }: NeedsAttentionProps) {
  return (
    <Section>
      <SectionHeading>
        <SectionTitle>Needs your attention</SectionTitle>
        {total > 0 && (
          <Count>
            Showing {trends.length} of {total}
          </Count>
        )}
      </SectionHeading>
      {trends.length === 0 ? (
        <Empty>No emerging patterns yet.</Empty>
      ) : (
        <List>
          {trends.map(trend => (
            <Card key={trend.trendId}>
              <RowText>
                <RowTitle title={trend.title}>{trend.title}</RowTitle>
                <RowMeta>
                  Built from {trend.itemCount}{" "}
                  {trend.itemCount === 1 ? "item" : "items"}
                  {trend.emergedAt && (
                    <>
                      {" "}
                      · Surfaced{" "}
                      <LocalDate
                        value={trend.emergedAt}
                        locale="en-GB"
                        options={{ day: "numeric", month: "short" }}
                      />
                    </>
                  )}
                </RowMeta>
              </RowText>
            </Card>
          ))}
        </List>
      )}
    </Section>
  );
}

const Section = styled.section`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
`;

const Count = styled.p`
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
  white-space: nowrap;
`;

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
`;

const cardStyles = css`
  padding: 0 18px;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
  background: ${COLORS.surface};
`;

const Card = styled.li`
  ${cardStyles}
`;

const Empty = styled.p`
  ${cardStyles}
  padding-block: 14px;
  color: ${COLORS.mutedText};
  font-size: 14px;
  line-height: 20px;
`;
