import styled from "styled-components";
import {
  RowMeta,
  RowText,
  RowTitle,
  SectionHeading,
  SectionTitle,
} from "@/components/home/styles";
import COLORS from "@/styles/colors";

// Placeholder rows until recently accessed items are tracked.
const RECENT_ITEMS = [
  {
    title: "Financial sextortion: recent developments",
    kind: "Emerging pattern",
    when: "Today",
  },
  {
    title: "Teen messaging and account protections",
    kind: "Intelligence item",
    when: "Yesterday",
  },
  {
    title: "Research on adolescent online coercion",
    kind: "Intelligence item",
    when: "16 Oct",
  },
];

export default function RecentlyAccessed() {
  return (
    <Section>
      <SectionHeading>
        <SectionTitle>Recently accessed</SectionTitle>
      </SectionHeading>
      <List>
        {RECENT_ITEMS.map(item => (
          <Item key={item.title}>
            <RowText>
              <RowTitle>{item.title}</RowTitle>
              <Meta>
                <span>{item.kind}</span>
                <span>·</span>
                <span>{item.when}</span>
              </Meta>
            </RowText>
          </Item>
        ))}
      </List>
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
