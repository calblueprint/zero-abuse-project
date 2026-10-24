import { DM_Sans, Raleway } from "next/font/google";

export const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  axes: ["opsz"],
});
