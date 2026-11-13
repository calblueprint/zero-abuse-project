"use client";

import type {
  IntelligenceLibraryFilterOptions,
  IntelligenceLibraryItem,
} from "@/db/queries/intelligence-library";
import type { IntelligenceFilters } from "@/lib/intelligence-library/filters";
import { useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import COLORS from "@/styles/colors";
import ItemToolbar from "./ItemToolbar";
import LibraryStatusTabs from "./LibraryStatusTabs";
import { BookmarkIcon, Description } from "./styles";
import ViewSourceButton from "./ViewSourceButton";

type ItemStatus = "All intelligence" | "Saved" | "Confirmed" | "Archived";
const itemStatuses: ItemStatus[] = [
  "All intelligence",
  "Saved",
  "Confirmed",
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
  const [status, setStatus] = useState<ItemStatus>("All intelligence");
  // TODO: Persist item bookmarks per user; local saves reset on page reload.
  const [savedIds, setSavedIds] = useState<string[]>([]);
  // TODO: Load confirmed/archived item states from the real provider when available.
  const counts = {
    "All intelligence": items.length,
    Saved: items.filter(item => savedIds.includes(item.itemId)).length,
    Confirmed: 0,
    Archived: 0,
  };
  const visibleItems =
    status === "All intelligence"
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
              <th scope="col">Source</th>
              <th scope="col">Published (UTC)</th>
              <th scope="col">Actions</th>
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
                <td>{item.sourceName}</td>
                <td>
                  {item.publishedAt ? (
                    <time dateTime={item.publishedAt}>
                      {new Date(item.publishedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </time>
                  ) : (
                    "Unknown date"
                  )}
                </td>
                <td>
                  <Actions>
                    <ViewSourceButton itemId={item.itemId} />
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
                  </Actions>
                </td>
              </tr>
            ))}
          </tbody>
        </ItemsTable>
      </TableScroll>
      {!visibleItems.length && (
        <EmptyState>
          {status === "All intelligence"
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
const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
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
  border-collapse: separate;
  border-spacing: 0 14px;
  text-align: left;
  th {
    padding: 0 20px;
    color: ${COLORS.mutedText};
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  td {
    padding: 24px 20px;
    background: #f0f3f7;
    color: ${COLORS.secondaryText};
    font-size: 14px;
    line-height: 20px;
    vertical-align: top;
  }
  td:first-child {
    width: 65%;
    min-width: 260px;
    border-radius: 14px 0 0 14px;
  }
  td:last-child {
    border-radius: 0 14px 14px 0;
    white-space: nowrap;
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
