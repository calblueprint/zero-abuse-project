"use client";

import type { SourceStatusResult } from "./actions";
import type { SourceRecord, SourceTab, SourceView } from "./view";
import { startTransition, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import styled from "styled-components";
import EmptySearchIcon from "@/assets/icons/empty-search.svg";
import { Card } from "@/components/AppShell";
import Modal from "@/components/Modal";
import Toast, { useToast } from "@/components/Toast";
import { toSearchParams } from "@/lib/validation/search-params";
import COLORS from "@/styles/colors";
import { PrimaryButton, SecondaryButton, TextButton } from "@/styles/controls";
import { deactivateSource, reactivateSource } from "./actions";
import AddSourceForm from "./AddSourceForm";
import SourcesTable from "./SourcesTable";
import SourcesToolbar from "./SourcesToolbar";
import SourceTabs from "./SourceTabs";
import {
  applySourceView,
  countSourceView,
  parseSourceView,
  toQueryString,
} from "./view";

type SourcesViewProps = {
  sources: SourceRecord[];
  // The server's render time, so relative times match during hydration.
  now: string;
};

const MINUTE = 60_000;

const EMPTY_TABS: Record<SourceTab, { title: string; body: string }> = {
  "needs-attention": {
    title: "Nothing needs attention",
    body: "No active source is overdue for a crawl.",
  },
  all: { title: "No sources", body: "" },
  active: { title: "No active sources", body: "" },
  inactive: { title: "No inactive sources", body: "" },
};

export default function SourcesView({ sources, now }: SourcesViewProps) {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();
  const [view, setView] = useState(() =>
    parseSourceView(toSearchParams(searchParams)),
  );
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  // The query string ("" or "?…") this view last wrote with replaceState.
  const [writtenQuery, setWrittenQuery] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deactivating, setDeactivating] = useState<SourceRecord | null>(null);
  // One status change at a time: Next stalled when a second server action
  // started while the first was still in flight.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [clientNow, setClientNow] = useState(0);
  // The row whose button a status change swaps out, to put focus back on.
  const focusAfterChange = useRef<{
    id: string;
    wasActive: boolean;
    failed?: boolean;
  } | null>(null);
  const { toast, showToast } = useToast();
  const nowMs = Math.max(Date.parse(now), clientNow);
  const { rows, counts } = applySourceView(sources, view, nowMs);
  const query = view.q.trim();
  const hasFilters = view.tiers.length > 0 || view.types.length > 0;

  // A navigation (e.g. the top bar's Sources link) changed the URL: follow
  // it. Our own replaceState also shows up here, sometimes after more typing,
  // so a URL this view wrote itself must not reset the view.
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    const incoming = urlQuery && `?${urlQuery}`;

    if (incoming !== writtenQuery && incoming !== toQueryString(view)) {
      setView(parseSourceView(toSearchParams(searchParams)));
    }
  }

  // Keep "2 hours ago" and crawl health current while the page stays open.
  useEffect(() => {
    const timer = setInterval(() => setClientNow(Date.now()), MINUTE);
    return () => clearInterval(timer);
  }, []);

  // A status change disables and then swaps the row's button, or moves the
  // row to another tab, which drops focus to <body>. Once the new row state
  // arrives (or the change fails), focus the row's button, or the selected
  // tab when the row has left.
  useEffect(() => {
    const change = focusAfterChange.current;

    if (!change || pendingId === change.id) return;

    const source = sources.find(item => item.sourceId === change.id);
    if (!change.failed && source && source.isActive === change.wasActive) {
      return;
    }

    focusAfterChange.current = null;

    if (document.activeElement && document.activeElement !== document.body) {
      return;
    }

    const target =
      document.querySelector<HTMLElement>(
        `tr[data-source-id="${change.id}"] button`,
      ) ??
      document.querySelector<HTMLElement>(
        '[aria-label="Source status"] [aria-pressed="true"]',
      );
    target?.focus();
  }, [sources, pendingId]);

  // Mirror the view into the URL so a refresh or shared link keeps it.
  // Debounced, since Safari throttles rapid history updates while typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      const { pathname, search } = window.location;
      const next = toQueryString(view);

      if (next !== search) {
        setWrittenQuery(next);
        window.history.replaceState(null, "", `${pathname}${next}`);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [view]);

  const updateView = (patch: Partial<SourceView>) =>
    setView(current => ({ ...current, ...patch }));

  // The action isn't wrapped in an async startTransition, so this view's
  // own updates aren't held back by Next's transition for the refresh.
  const changeStatus = async (
    source: SourceRecord,
    action: (sourceId: string) => Promise<SourceStatusResult>,
  ) => {
    const id = source.sourceId;

    if (pendingId) return;

    focusAfterChange.current = { id, wasActive: source.isActive };
    setPendingId(id);

    let result: SourceStatusResult;
    try {
      result = await action(id);
    } catch {
      result = {
        ok: false,
        message: "Something went wrong. Please try again.",
      };
    }

    // Lands together with the refreshed rows.
    startTransition(() => {
      if (!result.ok && focusAfterChange.current) {
        focusAfterChange.current.failed = true;
      }
      setPendingId(null);
      showToast(result.message);
    });
  };

  const emptyState = () => {
    if (sources.length === 0) {
      return (
        <EmptyState>
          <EmptyTitle>No sources yet</EmptyTitle>
          <EmptyBody>Add a source and ZAP starts crawling it.</EmptyBody>
          <EmptyAction>
            <SecondaryButton type="button" onClick={() => setIsAdding(true)}>
              Add source
            </SecondaryButton>
          </EmptyAction>
        </EmptyState>
      );
    }

    // Nothing matches in any tab; otherwise the tab is just empty.
    if ((query || hasFilters) && counts.all === 0) {
      return (
        <EmptyState>
          <Image src={EmptySearchIcon} alt="" width={40} height={40} />
          <EmptyTitle>
            {query
              ? `No sources match “${query}”`
              : "No sources match these filters"}
          </EmptyTitle>
          <EmptyBody>
            {query
              ? "Try different words, or clear the search to see everything."
              : "Try fewer filters, or clear them to see everything."}
          </EmptyBody>
          <EmptyAction>
            <SecondaryButton
              type="button"
              onClick={() =>
                updateView(query ? { q: "" } : { tiers: [], types: [] })
              }
            >
              {query ? "Clear search" : "Clear filters"}
            </SecondaryButton>
          </EmptyAction>
        </EmptyState>
      );
    }

    const { title, body } = EMPTY_TABS[view.tab];
    return (
      <EmptyState>
        <EmptyTitle>{title}</EmptyTitle>
        {body && <EmptyBody>{body}</EmptyBody>}
      </EmptyState>
    );
  };

  return (
    <SourcesCard>
      <Heading>
        <Title>Sources</Title>
        <PrimaryButton
          type="button"
          disabled={pendingId !== null}
          onClick={() => setIsAdding(true)}
        >
          Add source
        </PrimaryButton>
      </Heading>
      <SourcesToolbar
        view={view}
        onChange={updateView}
        countWith={filters =>
          countSourceView(sources, { ...view, ...filters }, nowMs)
        }
      />
      <SourceTabs
        selected={view.tab}
        counts={counts}
        onSelect={tab => updateView({ tab })}
      />
      {rows.length > 0 ? (
        <SourcesTable
          rows={rows}
          now={nowMs}
          pendingId={pendingId}
          onDeactivate={setDeactivating}
          onReactivate={source => changeStatus(source, reactivateSource)}
        />
      ) : (
        emptyState()
      )}

      <Modal
        open={isAdding}
        onClose={() => setIsAdding(false)}
        width={600}
        title="Add source"
        description="ZAP crawls the site and adds new pages to the library."
      >
        <AddSourceForm
          onCancel={() => setIsAdding(false)}
          onSaved={status => {
            setIsAdding(false);
            showToast(
              status === "added" ? "Source added" : "Source reactivated",
            );
          }}
        />
      </Modal>

      <Modal
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        width={480}
        title={deactivating && `Deactivate ${deactivating.name}?`}
        description="ZAP stops crawling it. Items already in the library stay."
      >
        <DialogActions>
          <TextButton
            type="button"
            data-autofocus
            onClick={() => setDeactivating(null)}
          >
            Cancel
          </TextButton>
          <PrimaryButton
            type="button"
            onClick={() => {
              if (deactivating) {
                // Close first so focus returns to the row while it updates.
                setDeactivating(null);
                changeStatus(deactivating, deactivateSource);
              }
            }}
          >
            Deactivate
          </PrimaryButton>
        </DialogActions>
      </Modal>

      <Toast toast={toast} />
    </SourcesCard>
  );
}

const SourcesCard = styled(Card)`
  gap: 24px;
  padding: 36px 48px 24px;

  @media (max-width: 600px) {
    padding: 28px 20px 24px;
  }
`;

const Heading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
`;

const Title = styled.h1`
  color: ${COLORS.inkText};
  font-size: 34px;
  font-weight: 400;
  line-height: 42px;
  letter-spacing: -0.4px;
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 72px;
  text-align: center;
`;

const EmptyTitle = styled.p`
  color: ${COLORS.inkText};
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
  letter-spacing: -0.2px;
  overflow-wrap: anywhere;
`;

const EmptyBody = styled.p`
  color: ${COLORS.secondaryText};
  font-size: 14px;
  line-height: 20px;
`;

const EmptyAction = styled.div`
  padding-top: 12px;
`;
