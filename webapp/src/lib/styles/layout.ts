export const desktopTitleBarControl =
  "desktop-titlebar-control inline-flex shrink-0 items-center justify-center border-2 border-border bg-card text-foreground transition-all hover:border-primary active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";
export const feedbackCaptureHideUi = "invisible pointer-events-none";
export const layout = {
  mainOffset: "shell-main-offset",
  sidebarContentPanel: "sidebar-drawer-content-panel",
  sidebarDrawerFrame: "sidebar-drawer sidebar-drawer-frame",
  sidebarDrawerGeometry: "sidebar-drawer-geometry",
  railPaginationNavBtn: "rail-pagination-nav-btn",
  railPaginationPageBtn: "rail-pagination-page-btn",
  railCountPillSize: "rail-count-pill-size",
  docsPageMinHeight: "docs-page-min-height",
  desktopTitleBarControl,
  feedbackCaptureHideUi,
} as const;
export const SHELL_MAIN_OFFSET_CLASS = layout.mainOffset;
export const SIDEBAR_DRAWER_CONTENT_TRANSITION = layout.sidebarContentPanel;
