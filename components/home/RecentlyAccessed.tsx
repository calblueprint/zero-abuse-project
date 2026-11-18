import type { IntelligenceLibraryItem } from "@/db/queries/intelligence-library";
import Link from "next/link";
import styled from "styled-components";
import {
  RowMeta,
  RowText,
  RowTitle,
  SectionHeading,
  SectionTitle,
} from "@/components/home/styles";
import COLORS from "@/styles/colors";

export default function RecentlyAccessed({
  items,
}: {
  items: IntelligenceLibraryItem[];
}) {
  return (
    <Section>
      <SectionHeading>
        <SectionTitle>Recently accessed</SectionTitle>
      </SectionHeading>
      {items.length === 0 ? (
        <RowMeta>Items you open will appear here.</RowMeta>
      ) : (
        <List>
          {items.map(item => (
            <Item key={item.itemId}>
              <RowText>
                <ItemTitle
                  as={Link}
                  href={`/intelligence/items/${item.itemId}`}
                  title={item.title ?? "Untitled intelligence item"}
                >
                  {item.title ?? "Untitled intelligence item"}
                </ItemTitle>
                <Meta>
                  <span>Intelligence item</span>
                  <span>·</span>
                  <span>{item.sourceName}</span>
                </Meta>
              </RowText>
            </Item>
          ))}
        </List>
      )}
    </Section>
  );
}

const Section = styled.section`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 14px;
  width: 380px;

  @media (max-width: 900px) {
    width: 100%;
  }
`;

const List = styled.ul`
  padding: 6px;
  border-radius: 16px;
  background: ${COLORS.tintSoft};
  list-style: none;
`;

const Meta = styled(RowMeta)`
  display: flex;
  gap: 6px;
`;

const Item = styled.li`
  padding: 0 18px;

  &:not(:last-child) {
    border-bottom: 1px solid ${COLORS.divider};
  }
`;

const ItemTitle = styled(RowTitle)`
  display: block;
  text-decoration: none;
  max-width: 100%;

  &:hover {
    text-decoration: underline;
  }
`;
