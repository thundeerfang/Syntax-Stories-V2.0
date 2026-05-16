import { createElement, type ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Box,
  BrainCircuit,
  Cpu,
  Database,
  Globe,
  Layers,
  Terminal,
  Workflow,
  Zap,
} from 'lucide-react';

const MARKETING_ICONS: Record<string, LucideIcon> = {
  Globe,
  Layers,
  Terminal,
  Database,
  Zap,
  Box,
  BrainCircuit,
  Workflow,
  Cpu,
};

export function marketingIcon(key: string | undefined): LucideIcon {
  if (!key) return Globe;
  return MARKETING_ICONS[key] ?? Globe;
}

/** Renders a marketing icon by key without creating component types during parent render. */
export function MarketingIcon({
  name,
  className,
}: Readonly<{ name?: string; className?: string }>): ReactElement {
  return createElement(marketingIcon(name), { className });
}
