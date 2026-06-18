export const squads = {
  cornerIconBtn: "corner-icon-btn",
  cornerIconBtnJoin: "corner-icon-btn-join",
  cornerIconBtnOpen: "corner-icon-btn-open",
  discoverCardSlide: "squad-discover-card-slide",
  discoverCardGrid: "squad-discover-card-grid",
  /** Card cap: compact below lg; 27.2rem fits ~3-up on wide rails. */
  discoverCardMax:
    "w-full max-w-[min(100%,23.5rem)] lg:max-w-[27.2rem]",
  /** Fixed card height so layout stays stable with or without a banner. */
  discoverCardMinH: "min-h-[17.5rem]",
  discoverCardBanner: "relative h-[7rem] w-full shrink-0 overflow-hidden md:h-[8rem]",
  discoverCardBodyOverlap:
    "relative -mt-14 flex flex-col bg-transparent px-4 pt-0 md:-mt-16 md:px-5",
  discoverCardIcon:
    "relative z-30 shrink-0 overflow-hidden border-[3px] border-border bg-card size-[3rem] md:size-[4rem]",
} as const;
