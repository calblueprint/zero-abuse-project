"use client";

import type {
  IntelligenceLibraryFilterOptions,
  IntelligenceLibraryItem,
} from "@/db/queries/intelligence-library";
import type { IntelligenceFilters } from "@/lib/intelligence-library/filters";
import { useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { formatIntelType } from "@/lib/intelligence-library/format-intel-type";
import COLORS from "@/styles/colors";
import DocumentUpload from "./DocumentUpload";
import ItemToolbar from "./ItemToolbar";
import LibraryStatusTabs from "./LibraryStatusTabs";
import { BookmarkIcon, Description } from "./styles";
import { OpenSourceForm } from "./ViewSourceButton";

type ItemStatus = "All items" | "Saved" | "Verified" | "Archived";
const itemStatuses: ItemStatus[] = [
  "All items",
  "Saved",
  "Verified",
  "Archived",
];
type IntelligenceItemsViewProps = {
  filters: IntelligenceFilters;
  items: IntelligenceLibraryItem[];
  options: IntelligenceLibraryFilterOptions;
  action?: string;
  showTitle?: boolean;
};

export default function IntelligenceItemsView({
  filters,
  items,
  options,
  action = "/intelligence",
  showTitle = true,
}: IntelligenceItemsViewProps) {
  const [status, setStatus] = useState<ItemStatus>("All items");
  // TODO: Persist item bookmarks per user; local saves reset on page reload.
  const [savedIds, setSavedIds] = useState<string[]>([]);
  // TODO: Load confirmed/archived item states from the real provider when available.
  const counts = {
    "All items": items.length,
    Saved: items.filter(item => savedIds.includes(item.itemId)).length,
    Verified: 0,
    Archived: 0,
  };
  const visibleItems =
    status === "All items"
      ? items
      : status === "Saved"
        ? items.filter(item => savedIds.includes(item.itemId))
        : [];

  return (
    <Container
      as={showTitle ? "main" : "section"}
      $standalone={showTitle}
      aria-label="Intelligence items"
    >
      {showTitle && <h1>Intelligence Library</h1>}
      <DocumentUpload />
      <ItemToolbar filters={filters} options={options} action={action} />
      <LibraryStatusTabs
        label="Intelligence item status"
        statuses={itemStatuses}
        status={status}
        counts={counts}
        onChange={setStatus}
      />
      <TableScroll>
        <ItemsTable>
          <thead>
            <tr>
              <th scope="col">Intelligence item</th>
              <th scope="col">Evidence and sources</th>
              <th scope="col">Type</th>
              <th scope="col">Updated</th>
              <th scope="col" aria-label="Bookmark" />
            </tr>
          </thead>
          <tbody>
            {visibleItems.map(item => (
              <tr key={item.itemId}>
                <td>
                  <ItemTitle>
                    <Link href={`/intelligence/items/${item.itemId}`}>
                      {item.title ?? "Untitled intelligence item"}
                    </Link>
                  </ItemTitle>
                  {item.tldr && <Description>{item.tldr}</Description>}
                </td>
                <td>
                  <EvidenceLabel>Single source</EvidenceLabel>
                  {item.uploadFilename && (
                    <Description>{item.uploadFilename}</Description>
                  )}
                  <OpenSourceForm itemId={item.itemId}>
                    <SourceBadge
                      type="submit"
                      disabled={!item.sourceUrl}
                      aria-label={`View source: ${item.sourceName}`}
                    >
                      {item.sourceName}
                    </SourceBadge>
                  </OpenSourceForm>
                </td>
                <td>{formatIntelType(item.intelType) ?? "—"}</td>
                <td>
                  {item.updatedAt ? (
                    <time dateTime={item.updatedAt}>
                      {new Date(item.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </time>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <Bookmark
                    type="button"
                    aria-label={
                      savedIds.includes(item.itemId)
                        ? "Remove saved intelligence item"
                        : "Save intelligence item"
                    }
                    aria-pressed={savedIds.includes(item.itemId)}
                    onClick={() =>
                      setSavedIds(current =>
                        current.includes(item.itemId)
                          ? current.filter(id => id !== item.itemId)
                          : [...current, item.itemId],
                      )
                    }
                  >
                    <BookmarkIcon filled={savedIds.includes(item.itemId)} />
                  </Bookmark>
                </td>
              </tr>
            ))}
          </tbody>
        </ItemsTable>
      </TableScroll>
      {!visibleItems.length && (
        <EmptyState>
          {status === "All items"
            ? "No intelligence items match your search and filters."
            : `No ${status.toLowerCase()} intelligence items.`}
        </EmptyState>
      )}
    </Container>
  );
}

const Container = styled.section<{ $standalone: boolean }>`
  display: grid;
  min-width: 0;
  gap: 24px;
  ${p => p.$standalone && "margin: 0 auto; max-width: 1200px; padding: 2rem;"}
`;
const EvidenceLabel = styled.div`
  margin-bottom: 8px;
  color: ${COLORS.inkText};
`;

const SourceBadge = styled.button`
  max-width: 100%;
  padding: 3px 9px;
  border: 0;
  border-radius: 8px;
  background: ${COLORS.divider};
  color: ${COLORS.ink};
  font: inherit;
  font-size: 13px;
  overflow-wrap: anywhere;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;
const Bookmark = styled.button`
  display: inline-flex;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
`;
const TableScroll = styled.div`
  min-width: 0;
  overflow-x: auto;
`;
const ItemsTable = styled.table`
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
  text-align: left;
  th {
    padding: 16px 20px;
    color: ${COLORS.mutedText};
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  td {
    padding: 16px 20px;
    border-bottom: 1px solid ${COLORS.divider};
    color: ${COLORS.secondaryText};
    font-size: 14px;
    line-height: 20px;
    vertical-align: middle;
  }
  td:first-child {
    width: 44%;
    min-width: 260px;
    overflow-wrap: anywhere;
  }
  td:nth-child(2) {
    width: 22%;
  }
  td:nth-child(3),
  td:nth-child(4) {
    width: 14%;
  }
`;
const ItemTitle = styled.h3`
  margin: 0 0 6px;
  color: ${COLORS.inkText};
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  a {
    color: inherit;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;
const EmptyState = styled.p`
  margin: 0;
  border-radius: 14px;
  background: #f0f3f7;
  padding: 32px 20px;
  color: ${COLORS.secondaryText};
  text-align: center;
`;
