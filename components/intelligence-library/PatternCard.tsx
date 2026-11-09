import type {
  EmergingPattern,
  PatternPriority,
} from "@/lib/intelligence-library/emerging-patterns";
import styled from "styled-components";
import COLORS from "@/styles/colors";
import {
  CONTROL_BORDER,
  Description,
  PATTERN_COLUMNS,
  SmallIcon,
} from "./styles";

export default function PatternCard({
  pattern,
  onToggleSaved,
}: {
  pattern: EmergingPattern;
  onToggleSaved: (id: string) => void;
}) {
  return (
    <PatternArticle>
      <PatternSummary>
        <PatternTitle>{pattern.title}</PatternTitle>
        <Description>{pattern.description}</Description>
        <Meta>
          Surfaced{" "}
          {new Date(`${pattern.surfacedAt}T00:00:00Z`).toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "short", timeZone: "UTC" },
          )}
        </Meta>
      </PatternSummary>
      <Evidence>
        <EvidenceTitle>
          Built from {pattern.supportingItemCount} items
        </EvidenceTitle>
        <Meta>{pattern.sourceCount} sources</Meta>
      </Evidence>
      <Priority priority={pattern.priority} />
      <ReviewCell>
        <ReviewLine>
          <ReviewDot $confirmed={pattern.reviewStatus === "Confirmed"} />
          {pattern.reviewStatus}
        </ReviewLine>
        {pattern.reviewedBy && <Meta>{pattern.reviewedBy}</Meta>}
      </ReviewCell>
      <Bookmark
        aria-label={pattern.saved ? "Remove saved pattern" : "Save pattern"}
        onClick={() => onToggleSaved(pattern.id)}
        type="button"
      >
        <BookmarkIcon filled={pattern.saved} />
      </Bookmark>
    </PatternArticle>
  );
}
function Priority({ priority }: { priority: PatternPriority }) {
  const filled = priority === "High" ? 3 : priority === "Moderate" ? 2 : 0;
  return (
    <PriorityCell>
      <PriorityBars aria-hidden="true">
        {[6, 9, 12].map((height, index) => (
          <PriorityBar $active={index < filled} $height={height} key={height} />
        ))}
      </PriorityBars>
      <PriorityText $muted={priority === "Unassessed"}>{priority}</PriorityText>
    </PriorityCell>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <SmallIcon $filled={filled} viewBox="0 0 16 16">
      <path d="M4 2.5h8v11l-4-2.5-4 2.5v-11Z" />
    </SmallIcon>
  );
}

const PatternArticle = styled.article`
  position: relative;
  display: grid;
  grid-template-columns: ${PATTERN_COLUMNS};
  gap: 24px;
  align-items: start;
  border-radius: 14px;
  background: #f0f3f7;
  padding: 24px 20px;
  @media (max-width: 920px) {
    grid-template-columns: minmax(0, 1fr) 180px;
  }
  @media (max-width: 580px) {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 20px 48px 20px 20px;
  }
`;
const PatternSummary = styled.div`
  display: grid;
  min-width: 0;
  gap: 6px;
`;
const PatternTitle = styled.h2`
  overflow: hidden;
  margin: 0;
  color: ${COLORS.inkText};
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.15px;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Meta = styled.p`
  margin: 0;
  color: ${COLORS.mutedText};
  font-size: 13px;
  line-height: 18px;
`;
const Evidence = styled.div`
  display: grid;
  gap: 4px;
  padding-top: 2px;
`;
const EvidenceTitle = styled.p`
  overflow: hidden;
  margin: 0;
  color: ${COLORS.inkText};
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const PriorityCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 2px;
`;
const PriorityBars = styled.div`
  display: flex;
  height: 12px;
  align-items: end;
  gap: 2px;
`;
const PriorityBar = styled.span<{ $active: boolean; $height: number }>`
  width: 4px;
  height: ${p => p.$height}px;
  border-radius: 1.5px;
  background: ${p => (p.$active ? COLORS.inkText : CONTROL_BORDER)};
`;
const PriorityText = styled.span<{ $muted: boolean }>`
  color: ${p => (p.$muted ? COLORS.secondaryText : COLORS.inkText)};
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
`;
const ReviewCell = styled.div`
  display: grid;
  gap: 4px;
  padding-top: 2px;
`;
const ReviewLine = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: ${COLORS.inkText};
  font-size: 13px;
  line-height: 18px;
`;
const ReviewDot = styled.span<{ $confirmed: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => (p.$confirmed ? "#1b6140" : "#c98900")};
`;
const Bookmark = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
`;
