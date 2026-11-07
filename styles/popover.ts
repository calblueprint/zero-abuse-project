import { css } from "styled-components";
import COLORS from "@/styles/colors";

// Resets the browser's centered [popover] box so useAnchoredPopover can place
// it. Set `display` under :popover-open only, or the popover never hides.
export const popoverSurface = css`
  position: fixed;
  inset: auto;
  margin: 0;
  overflow: visible;
  border: 1px solid ${COLORS.divider};
  background: ${COLORS.surface};
  color: ${COLORS.inkText};
`;
