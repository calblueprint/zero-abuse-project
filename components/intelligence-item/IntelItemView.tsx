"use client";

import type { IntelligenceItemDetail } from "@/db/queries/intelligence-item";
import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { updateIntelItemSummary } from "@/app/(authenticated)/(approved)/intelligence/items/[itemId]/actions";
import ChevronDownSmallIcon from "@/assets/icons/chevron-down-small.svg";
import MoreIcon from "@/assets/icons/more.svg";
import AppShell, { Card } from "@/components/AppShell";
import Toast, { useToast } from "@/components/Toast";
import COLORS from "@/styles/colors";

function formatDate(value: string | null, year = true) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(year ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}

function formatIntelType(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const labels = parsed.filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.trim().length > 0,
        );
        return labels.length ? labels.join(", ") : null;
      }
    } catch {
      // Preserve an older plain-text value if it is not valid JSON.
    }
  }
  return trimmed;
}

export default function IntelItemView({
  item,
  firstName,
  lastName,
  isAdmin,
}: {
  item: IntelligenceItemDetail;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(item.summary);
  const [draft, setDraft] = useState(item.summary ?? "");
  const [editedAt, setEditedAt] = useState(item.editedAt);
  const [pending, startTransition] = useTransition();
  const metadata = [
    formatIntelType(item.intelType),
    formatDate(item.publishedAt),
    "1 source",
    editedAt ? `Updated ${formatDate(editedAt, false)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function save() {
    startTransition(async () => {
      try {
        const result = await updateIntelItemSummary(item.itemId, draft);
        showToast(result.message);
        if (result.ok) {
          setSummary(result.summary ?? draft.trim());
          setEditedAt(result.editedAt ?? editedAt);
          setEditing(false);
          router.refresh();
        }
      } catch {
        showToast("Unable to save the summary. Please try again.");
      }
    });
  }

  return (
    <AppShell firstName={firstName} lastName={lastName} isAdmin={isAdmin}>
      <DetailCard>
        <Column>
          <TopRow>
            <Breadcrumb aria-label="Breadcrumb">
              <Link href="/intelligence-library?view=items">
                Intelligence library
              </Link>
              <span>/</span>
              <Link href="/intelligence-library?view=items">
                Intelligence items
              </Link>
              <span>/</span>
              <span aria-current="page">Item</span>
            </Breadcrumb>
            <Actions>
              <ActionButton
                type="button"
                onClick={save}
                disabled={!editing || pending}
              >
                {pending ? "Saving…" : "Save"}
              </ActionButton>
              {/* TODO: Enable pattern association when its data model and flow exist. */}
              <PatternButton type="button" disabled>
                Add to pattern
              </PatternButton>
              {/* TODO: Add supported item actions to this menu. */}
              <MoreButton type="button" aria-label="More actions" disabled>
                <Image src={MoreIcon} alt="" width={32} height={32} />
              </MoreButton>
            </Actions>
          </TopRow>
          <TitleBlock>
            <h1>{item.title || "Untitled intelligence item"}</h1>
            <Meta>{metadata}</Meta>
          </TitleBlock>
          <SummarySection aria-labelledby="summary-heading">
            <SectionHeader>
              <h2 id="summary-heading">Summary</h2>
              {editing ? (
                <SmallButton
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setDraft(summary ?? "");
                    setEditing(false);
                  }}
                >
                  Cancel
                </SmallButton>
              ) : (
                <SmallButton
                  type="button"
                  onClick={() => {
                    setDraft(summary ?? "");
                    setEditing(true);
                  }}
                >
                  Edit
                </SmallButton>
              )}
            </SectionHeader>
            {editing ? (
              <SummaryInput
                aria-label="Summary"
                value={draft}
                onChange={event => setDraft(event.target.value)}
                disabled={pending}
              />
            ) : (
              <SummaryText>{summary || "No summary yet."}</SummaryText>
            )}
          </SummarySection>
          <SourcesSection aria-labelledby="sources-heading">
            <SectionHeader>
              <SourceHeading>
                <h2 id="sources-heading">Sources</h2>
                <span>1</span>
              </SourceHeading>
              {/* TODO: Enable source association when that workflow is available. */}
              <ActionButton type="button" disabled>
                Add source
              </ActionButton>
            </SectionHeader>
            <form
              action="/intelligence/items/open"
              method="POST"
              target="_blank"
              rel="noopener"
            >
              <input type="hidden" name="itemId" value={item.itemId} />
              <SourceRow
                type="submit"
                aria-label={`Open source: ${item.sourceName}`}
              >
                <SourceText>
                  <strong>{item.sourceName}</strong>
                  <span>
                    {[item.sourceType, formatDate(item.publishedAt, false)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </SourceText>
                <Chevron aria-hidden="true">
                  <Image
                    src={ChevronDownSmallIcon}
                    alt=""
                    width={12}
                    height={12}
                  />
                </Chevron>
              </SourceRow>
            </form>
          </SourcesSection>
          <PatternsSection aria-labelledby="patterns-heading">
            <h2 id="patterns-heading">Used in patterns</h2>
            {/* TODO: Populate this section once pattern associations are available. */}
            <EmptyPatterns />
          </PatternsSection>
        </Column>
      </DetailCard>
      <Toast toast={toast} />
    </AppShell>
  );
}

const DetailCard = styled(Card)`
  align-items: center;
  padding: 32px 60px 80px;
  @media (max-width: 700px) {
    padding: 24px 20px 60px;
  }
`;
const Column = styled.div`
  width: min(760px, 100%);
  display: flex;
  flex-direction: column;
  gap: 28px;
`;
const TopRow = styled.div`
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;
const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${COLORS.mutedText};
  font-size: 13px;
  line-height: 18px;
  a {
    color: inherit;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  [aria-current] {
    color: ${COLORS.secondaryText};
  }
`;
const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;
const ActionButton = styled.button`
  min-height: 40px;
  padding: 10px 18px;
  border: 0;
  border-radius: 10px;
  background: #f3f5f9;
  color: ${COLORS.inkText};
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  &:disabled {
    cursor: default;
  }
`;
const PatternButton = styled(ActionButton)`
  background: #dce1fb;
  color: #2a3799;
`;
const MoreButton = styled(ActionButton)`
  width: 40px;
  height: 40px;
  padding: 4px;
`;
const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  h1 {
    margin: 0;
    color: ${COLORS.inkText};
    font-size: 26px;
    font-weight: 500;
    line-height: 32px;
    letter-spacing: -0.5px;
  }
`;
const Meta = styled.p`
  margin: 0;
  color: ${COLORS.mutedText};
  font-size: 13px;
  line-height: 18px;
`;
const SummarySection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  gap: 12px;
  h2 {
    margin: 0;
    color: ${COLORS.inkText};
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }
`;
const SmallButton = styled(ActionButton)`
  min-height: 28px;
  padding: 5px 12px;
  font-size: 13px;
  line-height: 18px;
`;
const SummaryText = styled.p`
  margin: 0;
  color: ${COLORS.secondaryText};
  font-size: 14px;
  line-height: 20px;
  white-space: pre-wrap;
`;
const SummaryInput = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid ${COLORS.borderControl};
  border-radius: 10px;
  color: ${COLORS.inkText};
  font: inherit;
  font-size: 14px;
  line-height: 20px;
  resize: vertical;
`;
const SourcesSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const SourceHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  span {
    color: ${COLORS.mutedText};
    font-size: 14px;
  }
`;
const SourceRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 70px;
  padding: 14px 0;
  border: 0;
  border-top: 1px solid ${COLORS.divider};
  border-bottom: 1px solid ${COLORS.divider};
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
`;
const SourceText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  strong {
    color: ${COLORS.inkText};
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }
  span {
    color: ${COLORS.mutedText};
    font-size: 13px;
    line-height: 18px;
  }
`;
const Chevron = styled.span`
  display: flex;
  width: 12px;
  height: 12px;
  transform: rotate(-90deg);
`;
const PatternsSection = styled.section`
  h2 {
    margin: 0 0 10px;
    color: ${COLORS.inkText};
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }
`;
const EmptyPatterns = styled.div`
  border-top: 1px solid ${COLORS.divider};
`;
