import type { CSSProperties } from "react";
export const shellNavInner = "shell-nav-inner";
export const shellRailFrost = "shell-rail-frost";
export const shellRailFrostStyle: CSSProperties = {
  backgroundColor: "var(--rail-frost-bg)",
  backdropFilter: "saturate(2.0) blur(10px)",
  WebkitBackdropFilter: "saturate(2.0) blur(10px)",
};
export const shellContentRail = "shell-content-rail";
export const shellContentMeasure = "shell-content-measure";
export const shell = {
  navInner: shellNavInner,
  railFrost: shellRailFrost,
  railFrostStyle: shellRailFrostStyle,
  contentRail: shellContentRail,
  contentMeasure: shellContentMeasure,
} as const;
export const SHELL_NAV_INNER_CLASS = shellNavInner;
export const SHELL_RAIL_FROST_CLASS = shellRailFrost;
export const SHELL_RAIL_FROST_STYLE = shellRailFrostStyle;
export const SHELL_CONTENT_RAIL_CLASS = shellContentRail;
export const SHELL_CONTENT_MEASURE_CLASS = shellContentMeasure;
