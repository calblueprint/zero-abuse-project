"use client";

import type { StaticImageData } from "next/image";
import type { SourceType } from "./validation";
import type { CrawlHealth, SourceRecord } from "./view";
import Image from "next/image";
import styled, { css } from "styled-components";
import DelayedDot from "@/assets/icons/dot-delayed.svg";
import HealthyDot from "@/assets/icons/dot-healthy.svg";
import PausedDot from "@/assets/icons/dot-paused.svg";
import MoreIcon from "@/assets/icons/more.svg";
import LocalDate from "@/components/LocalDate";
import useAnchoredPopover from "@/lib/hooks/useAnchoredPopover";
import COLORS from "@/styles/colors";
import { popoverSurface } from "@/styles/popover";
import { SecondaryButton, Tag } from "./styles";
import { displayUrl, formatTimeAgo, getCrawlHealth } from "./view";

type SourcesTableProps = {
  rows: SourceRecord[];
  now: number;
  // Disables every row's action while a status change is saving.
  pendingId: string | null;
  onDeactivate: (source: SourceRecord) => void;
  onReactivate: (source: SourceRecord) => void;
};

const TYPE_COLORS: Record<SourceType, { tint: string; text: string }> = {
  Agency: { tint: COLORS.agencyTint, text: COLORS.agencyText },
  News: { tint: COLORS.newsTint, text: COLORS.newsText },
  Research: { tint: COLORS.researchTint, text: COLORS.researchText },
  Platform: { tint: COLORS.platformTint, text: COLORS.platformText },
};

const HEALTH_DOTS: Record<CrawlHealth["status"], StaticImageData> = {
  healthy: HealthyDot,
  delayed: DelayedDot,
  "not-crawled": PausedDot,
  paused: PausedDot,
};

export default function SourcesTable({
  rows,
  now,
  pendingId,
  onDeactivate,
  onReactivate,
}: SourcesTableProps) {
  return (
    <Scroller>
      <Table>
        <colgroup>
          <col style={{ width: 282 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 88 }} />
          <col style={{ width: 112 }} />
          <col style={{ width: 194 }} />
          <col style={{ width: 124 }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <Th scope="col">Source</Th>
            <Th scope="col">Type</Th>
            <Th scope="col">Tier</Th>
            <Th scope="col">Status</Th>
            <Th scope="col">Crawl health</Th>
            <Th scope="col">Last crawled</Th>
            <Th scope="col">
              <VisuallyHidden>Actions</VisuallyHidden>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(source => (
            <SourceRow
              key={source.sourceId}
              source={source}
              now={now}
              actionsDisabled={pendingId !== null}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
            />
          ))}
        </tbody>
      </Table>
    </Scroller>
  );
}

type SourceRowProps = {
  source: SourceRecord;
  now: number;
  actionsDisabled: boolean;
  onDeactivate: (source: SourceRecord) => void;
  onReactivate: (source: SourceRecord) => void;
};

function SourceRow({
  source,
  now,
  actionsDisabled,
  onDeactivate,
  onReactivate,
}: SourceRowProps) {
  const health = getCrawlHealth(source, now);
  // Rows saved with another type (or none) get the neutral tag.
  const typeColors =
    source.type && Object.hasOwn(TYPE_COLORS, source.type)
      ? TYPE_COLORS[source.type as SourceType]
      : undefined;
  const timeAgo = source.lastCrawledAt
    ? formatTimeAgo(source.lastCrawledAt, now)
    : null;

  return (
    <tr data-source-id={source.sourceId}>
      <Td>
        <SourceName title={source.name}>{source.name}</SourceName>
        {source.baseUrl && (
          <SourceUrl href={source.baseUrl} target="_blank" rel="noreferrer">
            {displayUrl(source.baseUrl)}
          </SourceUrl>
        )}
      </Td>
      <Td>
        {source.type ? (
          <Tag
            $tint={typeColors?.tint ?? COLORS.tintNeutral}
            $text={typeColors?.text ?? COLORS.secondaryText}
          >
            {source.type}
          </Tag>
        ) : (
          <Muted>—</Muted>
        )}
      </Td>
      <Td>
        <Body>{source.tier ? `Tier ${source.tier}` : <Muted>—</Muted>}</Body>
      </Td>
      <Td>
        {source.isActive ? (
          <Tag $tint={COLORS.verifiedTint} $text={COLORS.verifiedText}>
            Active
          </Tag>
        ) : (
          <Tag $tint={COLORS.tintNeutral} $text={COLORS.secondaryText}>
            Inactive
          </Tag>
        )}
      </Td>
      <Td>
        <Health>
          <Image src={HEALTH_DOTS[health.status]} alt="" width={8} height={8} />
          {health.label}
        </Health>
      </Td>
      <Td>
        <Meta>
          {!source.lastCrawledAt
            ? "Never"
            : (timeAgo ?? (
                <LocalDate
                  value={source.lastCrawledAt}
                  locale="en-GB"
                  options={{ day: "numeric", month: "short" }}
                />
              ))}
        </Meta>
      </Td>
      <Td>
        <Actions>
          {source.isActive ? (
            <RowMenu
              source={source}
              disabled={actionsDisabled}
              onDeactivate={onDeactivate}
            />
          ) : (
            <SecondaryButton
              type="button"
              $compact
              disabled={actionsDisabled}
              aria-label={`Reactivate ${source.name}`}
              onClick={() => onReactivate(source)}
            >
              Reactivate
            </SecondaryButton>
          )}
        </Actions>
      </Td>
    </tr>
  );
}

type RowMenuProps = {
  source: SourceRecord;
  disabled: boolean;
  onDeactivate: (source: SourceRecord) => void;
};

function RowMenu({ source, disabled, onDeactivate }: RowMenuProps) {
  const menu = useAnchoredPopover({ align: "end" });

  return (
    <>
      <MoreButton
        {...menu.anchorProps}
        type="button"
        disabled={disabled}
        aria-label={`Actions for ${source.name}`}
      >
        <Image src={MoreIcon} alt="" width={32} height={32} />
      </MoreButton>
      <Menu {...menu.popoverProps}>
        {/* Crawl logs and editing come with the source detail page. */}
        <MenuItem type="button" disabled>
          View crawl log
        </MenuItem>
        <MenuItem type="button" disabled>
          Edit details
        </MenuItem>
        <MenuItem
          type="button"
          $danger
          onClick={() => {
            menu.close();
            menu.anchorRef.current?.focus();
            onDeactivate(source);
          }}
        >
          Deactivate
        </MenuItem>
      </Menu>
    </>
  );
}

// Positioned so the visually hidden header label is clipped here too.
const Scroller = styled.div`
  position: relative;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  min-width: 960px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
`;

const cell = css`
  padding: 0 12px;

  &:first-child {
    padding-left: 20px;
  }

  &:last-child {
    padding-right: 20px;
  }
`;

const Th = styled.th`
  ${cell}
  height: 40px;
  color: ${COLORS.mutedText};
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  text-align: left;
  white-space: nowrap;
`;

// Cell content is block-level so rows keep Figma's 69px height.
const Td = styled.td`
  ${cell}
  padding-top: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid ${COLORS.divider};
  font-size: 14px;
  line-height: 20px;
  vertical-align: middle;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const ellipsis = css`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SourceName = styled.p`
  ${ellipsis}
  color: ${COLORS.inkText};
  font-size: 15px;
  font-weight: 500;
  line-height: 22px;
  letter-spacing: -0.1px;
`;

const SourceUrl = styled.a`
  ${ellipsis}
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Body = styled.span`
  display: block;
  color: ${COLORS.inkText};
  font-size: 14px;
  line-height: 20px;
  white-space: nowrap;
`;

const Meta = styled.span`
  display: block;
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
  white-space: nowrap;
`;

const Muted = styled.span`
  color: ${COLORS.mutedText};
`;

const Health = styled(Meta)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MoreButton = styled.button`
  display: flex;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${COLORS.canvas};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Menu = styled.div`
  ${popoverSurface}
  width: 220px;
  padding: 6px;
  border-radius: 12px;
  box-shadow: 0 12px 16px rgba(0, 0, 0, 0.14);

  &:popover-open {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: none;
  color: ${({ $danger }) => ($danger ? COLORS.flagCoral : COLORS.inkText)};
  font: inherit;
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled),
  &:focus-visible {
    background: ${COLORS.canvas};
    outline: none;
  }

  &:disabled {
    color: ${COLORS.mutedText};
    cursor: not-allowed;
  }
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;
