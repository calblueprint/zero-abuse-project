"use client";

import type { ReactNode } from "react";
import type { SourceTier, SourceType } from "./validation";
import type { SourceSort, SourceView } from "./view";
import { useState } from "react";
import Image from "next/image";
import styled from "styled-components";
import SearchIcon from "@/assets/icons/search.svg";
import SlidersIcon from "@/assets/icons/sliders.svg";
import SelectMenu from "@/components/SelectMenu";
import useAnchoredPopover from "@/lib/hooks/useAnchoredPopover";
import COLORS from "@/styles/colors";
import { PrimaryButton } from "@/styles/controls";
import { popoverSurface } from "@/styles/popover";
import { SOURCE_TIERS, SOURCE_TYPES } from "./validation";
import { SORT_LABELS, SOURCE_SORTS } from "./view";

type Filters = Pick<SourceView, "tiers" | "types">;

type SourcesToolbarProps = {
  view: SourceView;
  onChange: (patch: Partial<SourceView>) => void;
  // How many rows the current tab would show with these filters.
  countWith: (filters: Filters) => number;
};

const SORT_OPTIONS = SOURCE_SORTS.map(sort => ({
  value: sort,
  label: SORT_LABELS[sort],
}));

export default function SourcesToolbar({
  view,
  onChange,
  countWith,
}: SourcesToolbarProps) {
  return (
    <Toolbar>
      <SearchBox role="search">
        <Image src={SearchIcon} alt="" width={20} height={20} />
        <SearchInput
          type="search"
          aria-label="Search sources"
          placeholder="Search sources"
          value={view.q}
          onChange={event => onChange({ q: event.target.value })}
          onKeyDown={event => {
            if (event.key === "Escape" && view.q) {
              event.preventDefault();
              onChange({ q: "" });
            }
          }}
        />
      </SearchBox>
      <FiltersMenu
        applied={{ tiers: view.tiers, types: view.types }}
        onApply={onChange}
        countWith={countWith}
      />
      <Spacer />
      <SelectMenu
        variant="pill"
        pillLabel="Sort"
        options={SORT_OPTIONS}
        value={view.sort}
        onChange={sort => onChange({ sort: sort as SourceSort })}
      />
    </Toolbar>
  );
}

// Keeps selections in the order they're listed, for stable URLs.
function toggle<T extends string>(all: readonly T[], selected: T[], value: T) {
  return all.filter(item =>
    item === value ? !selected.includes(item) : selected.includes(item),
  );
}

type FiltersMenuProps = {
  applied: Filters;
  onApply: (filters: Filters) => void;
  countWith: (filters: Filters) => number;
};

function FiltersMenu({ applied, onApply, countWith }: FiltersMenuProps) {
  const popover = useAnchoredPopover({ offset: 8 });
  // Choices apply only on "Show results"; closing the panel drops them.
  const [draft, setDraft] = useState(applied);
  const appliedCount = applied.tiers.length + applied.types.length;
  const resultCount = countWith(draft);

  return (
    <>
      <FiltersButton
        {...popover.anchorProps}
        type="button"
        onClick={() => setDraft(applied)}
      >
        <Image src={SlidersIcon} alt="" width={16} height={16} />
        Filters
        {appliedCount > 0 && <AppliedCount>{appliedCount}</AppliedCount>}
      </FiltersButton>
      <Panel {...popover.popoverProps} role="dialog" aria-label="Filters">
        <PanelHeader>
          <PanelTitle>Filters</PanelTitle>
          <ClearAll
            type="button"
            onClick={() => setDraft({ tiers: [], types: [] })}
          >
            Clear all
          </ClearAll>
        </PanelHeader>
        <PanelBody>
          <ChipGroup label="Tier">
            {SOURCE_TIERS.map(tier => (
              <Chip
                key={tier}
                selected={draft.tiers.includes(tier)}
                onClick={() =>
                  setDraft(current => ({
                    ...current,
                    tiers: toggle<SourceTier>(
                      SOURCE_TIERS,
                      current.tiers,
                      tier,
                    ),
                  }))
                }
              >
                Tier {tier}
              </Chip>
            ))}
          </ChipGroup>
          <ChipGroup label="Type">
            {SOURCE_TYPES.map(type => (
              <Chip
                key={type}
                selected={draft.types.includes(type)}
                onClick={() =>
                  setDraft(current => ({
                    ...current,
                    types: toggle<SourceType>(
                      SOURCE_TYPES,
                      current.types,
                      type,
                    ),
                  }))
                }
              >
                {type}
              </Chip>
            ))}
          </ChipGroup>
        </PanelBody>
        <PanelFooter>
          <ShowResults
            type="button"
            onClick={() => {
              onApply(draft);
              popover.close();
            }}
          >
            {/* One text node: Chrome drops the space between JSX parts here. */}
            {`Show ${resultCount} ${resultCount === 1 ? "result" : "results"}`}
          </ShowResults>
        </PanelFooter>
      </Panel>
    </>
  );
}

function ChipGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Group role="group" aria-label={label}>
      <GroupLabel aria-hidden>{label}</GroupLabel>
      <Chips>{children}</Chips>
    </Group>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <ChipButton
      type="button"
      aria-pressed={selected}
      $selected={selected}
      onClick={onClick}
    >
      {children}
    </ChipButton>
  );
}

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const SearchBox = styled.div`
  display: flex;
  flex: 0 1 480px;
  align-items: center;
  gap: 10px;
  min-width: 200px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid ${COLORS.borderControl};
  border-radius: 999px;
  background: ${COLORS.surface};

  &:focus-within {
    border-color: ${COLORS.actionNavy};
    box-shadow: 0 0 0 0.5px ${COLORS.actionNavy};
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
  font-size: 14px;
  line-height: 20px;

  &::placeholder {
    color: ${COLORS.mutedText};
  }

  &::-webkit-search-cancel-button {
    appearance: none;
  }
`;

const FiltersButton = styled.button`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px 0 14px;
  border: 1px solid ${COLORS.borderControl};
  border-radius: 999px;
  background: ${COLORS.surface};
  color: ${COLORS.inkText};
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
`;

const AppliedCount = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  background: ${COLORS.actionNavy};
  color: ${COLORS.surface};
  -webkit-font-smoothing: antialiased;
  font-size: 12px;
  line-height: 16px;
`;

const Spacer = styled.div`
  flex: 1;
`;

const Panel = styled.div`
  ${popoverSurface}
  width: 380px;
  max-width: calc(100vw - 24px);
  padding: 0;
  border-color: ${COLORS.borderDefault};
  border-radius: 16px;
  box-shadow:
    0 1px 4px rgba(15, 27, 45, 0.06),
    0 12px 32px -8px rgba(15, 27, 45, 0.16);

  &:popover-open {
    display: flex;
    flex-direction: column;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 6px;
`;

const PanelTitle = styled.h2`
  color: ${COLORS.inkText};
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
`;

const ClearAll = styled.button`
  padding: 0;
  border: none;
  background: none;
  color: ${COLORS.mutedText};
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;

  &:hover {
    color: ${COLORS.inkText};
  }
`;

const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px 18px 18px;
  border-bottom: 1px solid ${COLORS.divider};
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const GroupLabel = styled.span`
  color: ${COLORS.mutedText};
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ChipButton = styled.button<{ $selected: boolean }>`
  height: 30px;
  padding: 0 12px;
  border: 1px solid
    ${({ $selected }) => ($selected ? COLORS.actionNavy : COLORS.borderControl)};
  border-radius: 999px;
  background: ${({ $selected }) =>
    $selected ? COLORS.actionNavy : COLORS.surface};
  color: ${({ $selected }) => ($selected ? COLORS.surface : COLORS.inkText)};
  -webkit-font-smoothing: ${({ $selected }) =>
    $selected ? "antialiased" : "auto"};
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  cursor: pointer;
`;

const PanelFooter = styled.div`
  display: flex;
  padding: 14px 18px;
`;

const ShowResults = styled(PrimaryButton)`
  flex: 1;
`;
