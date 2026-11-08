import Image from "next/image";
import styled from "styled-components";
import ClockIcon from "@/assets/icons/clock.svg";
import SearchIcon from "@/assets/icons/search.svg";
import COLORS from "@/styles/colors";

// Placeholder until search is built.
const RECENT_SEARCHES = [
  "Financial sextortion",
  "Cryptocurrency payments",
  "Online grooming",
];

export default function SearchHero() {
  return (
    <Composer>
      {/* Search isn't wired up yet, so there's no form to submit. */}
      <SearchBox>
        <Image src={SearchIcon} alt="" width={20} height={20} />
        <SearchInput
          type="search"
          aria-label="Search"
          placeholder="Search topics, platforms, populations, or sources"
        />
      </SearchBox>
      <RecentSearches aria-label="Recent searches">
        {RECENT_SEARCHES.map(search => (
          <RecentSearch key={search}>
            <Image src={ClockIcon} alt="" width={16} height={16} />
            {search}
          </RecentSearch>
        ))}
      </RecentSearches>
    </Composer>
  );
}

const Composer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 999px;
  background: ${COLORS.surface};
  box-shadow:
    0 1px 1px rgba(24, 44, 70, 0.05),
    0 10px 15px rgba(24, 44, 70, 0.07);

  /* Figma's "Search, typing" state: a thicker navy border, padding trimmed to keep the size. */
  &:focus-within {
    padding: 15.5px 23.5px;
    border: 1.5px solid ${COLORS.actionNavy};
  }
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: ${COLORS.inkText};
  font: inherit;
  font-size: 17px;
  line-height: 24px;
  letter-spacing: -0.1px;

  &::placeholder {
    color: ${COLORS.mutedText};
  }
`;

const RecentSearches = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  padding-left: 24px;
  list-style: none;
`;

const RecentSearch = styled.li`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
`;
