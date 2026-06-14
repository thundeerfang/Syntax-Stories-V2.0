"use client";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  Eye,
  Heart,
  Mail,
  Repeat2,
  Settings,
  Tag,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { NotificationIcon } from "@contracts/notificationsApi";
const ICON_MAP: Record<NotificationIcon, LucideIcon> = {
  bell: Bell,
  repeat: Repeat2,
  eye: Eye,
  heart: Heart,
  tag: Tag,
  users: Users,
  trending: TrendingUp,
  "user-plus": UserPlus,
  settings: Settings,
  mail: Mail,
  award: Award,
};
export function notificationIconComponent(
  icon: NotificationIcon | undefined,
): LucideIcon {
  if (icon && ICON_MAP[icon]) return ICON_MAP[icon];
  return Bell;
}
