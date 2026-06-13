export { LayoutShell } from './shell/LayoutShell';
export { MainLayout } from './shell/MainLayout';
export { AppShellChrome } from './shell/AppShellChrome';
export { FloatingActions } from './shell/FloatingActions';

export { Navbar } from './nav/Navbar';
export { SidebarDrawer } from './nav/SidebarDrawer';
export { AccountDropdown } from './nav/AccountDropdown';
export { NotificationsDropdown } from './nav/NotificationsDropdown';

export { Footer } from './footer/Footer';

export { RailFeedEmptyState } from './rail/RailFeedEmptyState';
export type { RailFeedEmptyStateAction, RailFeedEmptyStateProps } from './rail/RailFeedEmptyState';
export { SignInRequiredPanel } from './rail/SignInRequiredPanel';
export type { SignInRequiredPanelProps } from './rail/SignInRequiredPanel';
export { RailFeedErrorState, resolveFeedErrorPresentation } from './rail/RailFeedErrorState';
export type { RailFeedErrorStateProps } from './rail/RailFeedErrorState';
export {
  RailSectionSubheader,
  type RailSectionSubheaderSearchProps,
  type RailSectionSubheaderSortProps,
  type RailSectionSubheaderFilterProps,
} from './rail/RailSectionSubheader';
export {
  RailCountPill,
  RailCountPillLoading,
  RailCountPillPair,
} from './rail/RailCountPill';
export {
  RailListPaginationFooter,
  RailResultRangeBadge,
} from './rail/RailListPaginationFooter';
export { ShellPageIntroHeader } from './rail/ShellPageIntroHeader';
export {
  RectangleAppBreadcrumb,
  type RectangleAppBreadcrumbItem,
} from './rail/RectangleAppBreadcrumb';

export { mainColumnOffsetClass, MAIN_COLUMN_OFFSET_TRANSITION } from './shared';
