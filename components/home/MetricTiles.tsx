import Image from "next/image";
import styled from "styled-components";
import ConfirmedIcon from "@/assets/icons/metric-confirmed.svg";
import NewPatternsIcon from "@/assets/icons/metric-new-patterns.svg";
import ReviewIcon from "@/assets/icons/metric-review.svg";
import SavedIcon from "@/assets/icons/metric-saved.svg";
import COLORS from "@/styles/colors";

// Placeholder values until these metrics exist.
const METRICS = [
  {
    label: "Needs your review",
    value: 5,
    caption: "Patterns waiting for you",
    icon: ReviewIcon,
    tint: COLORS.reviewTint,
    text: COLORS.reviewText,
  },
  {
    label: "New patterns",
    value: 4,
    caption: "Surfaced this week",
    icon: NewPatternsIcon,
    tint: COLORS.aiTint,
    text: COLORS.aiText,
  },
  {
    label: "Saved",
    value: 4,
    caption: "Bookmarked by you",
    icon: SavedIcon,
    tint: COLORS.flagTint,
    text: COLORS.flagText,
  },
  {
    label: "Confirmed this week",
    value: 2,
    caption: "Reviewed and confirmed",
    icon: ConfirmedIcon,
    tint: COLORS.verifiedTint,
    text: COLORS.verifiedText,
  },
];

export default function MetricTiles() {
  return (
    <Tiles>
      {METRICS.map(metric => (
        <Tile key={metric.label} $tint={metric.tint}>
          <LabelRow>
            <TileIcon src={metric.icon} alt="" width={16} height={16} />
            <Label $color={metric.text}>{metric.label}</Label>
          </LabelRow>
          <ValueRow>
            <Value>{metric.value}</Value>
            <Caption $color={metric.text}>{metric.caption}</Caption>
          </ValueRow>
        </Tile>
      ))}
    </Tiles>
  );
}

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-top: 52px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 20px;
  }
`;

const Tile = styled.div<{ $tint: string }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 20px;
  background: ${({ $tint }) => $tint};
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TileIcon = styled(Image)`
  flex-shrink: 0;
`;

const Label = styled.p<{ $color: string }>`
  flex: 1;
  min-width: 0;
  color: ${({ $color }) => $color};
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  letter-spacing: 1px;
  text-align: right;
  text-transform: uppercase;
  /* letter-spacing also trails the last letter; pull it back so the text ends flush right. */
  margin-right: -1px;
`;

const ValueRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Value = styled.p`
  color: ${COLORS.inkText};
  font-size: 40px;
  font-weight: 600;
  line-height: 44px;
  letter-spacing: -0.6px;
`;

const Caption = styled.p<{ $color: string }>`
  color: ${({ $color }) => $color};
  font-size: 13px;
  line-height: 18px;
`;
