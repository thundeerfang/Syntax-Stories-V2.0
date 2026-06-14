import type { ComponentType } from "react";
import {
  Bookmark,
  Home,
  Repeat2,
  Settings,
  Shield,
  Tags,
  UserPlus,
} from "lucide-react";
export type SidebarNavLink = Readonly<{
  href: string;
  label: string;
  icon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
}>;
export type SidebarAccordionId = "saved";
export type SidebarAccordionConfig = Readonly<{
  id: SidebarAccordionId;
  title: string;
  icon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
}>;
export const SIDEBAR_NAV = {
  main: [
    { href: "/", label: "HOME FEED", icon: Home },
    { href: "/following", label: "FOLLOWING", icon: UserPlus },
    { href: "/squads", label: "SQUADS", icon: Shield },
    { href: "/topics", label: "BROWSE TOPICS", icon: Tags },
    { href: "/reposts", label: "REPOSTS", icon: Repeat2 },
  ],
  utility: [{ href: "/settings", label: "Settings", icon: Settings }],
  accordions: [{ id: "saved" as const, title: "Saved blogs", icon: Bookmark }],
} as const satisfies {
  main: ReadonlyArray<SidebarNavLink>;
  utility: ReadonlyArray<SidebarNavLink>;
  accordions: ReadonlyArray<SidebarAccordionConfig>;
};
