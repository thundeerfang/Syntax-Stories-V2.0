import * as React from 'react';
import { AlignLeft, Camera, Film, Gauge, Github, Image as ImageIcon, Minus, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomToolbarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  disabled?: boolean;
  variant?: 'default' | 'primary';
}

interface BottomToolbarProps {
  items?: BottomToolbarItem[];
  onItemClick: (id: string) => void;
  label?: string;
  isSidebarOpen?: boolean;
  maxWidthClassName?: string;
  className?: string;
}

// Default configuration used by the blog write editor (exported for sidebar Tools)
export const DEFAULT_ITEMS: BottomToolbarItem[] = [
  {
    id: 'paragraph',
    label: 'Paragraph',
    icon: AlignLeft,
    description: 'Rich text block with markdown support for long-form writing.',
  },
  {
    id: 'heading',
    label: 'Sub-heading',
    icon: Type,
    description: 'Sub-heading (H2 or H3) below the main title.',
  },
  {
    id: 'partition',
    label: 'Divider',
    icon: Minus,
    description: 'Visual separator to break your story into clear sections.',
  },
  {
    id: 'image',
    label: 'Image block',
    icon: ImageIcon,
    description: 'Upload an image and add alt/caption metadata.',
  },
  {
    id: 'gif',
    label: 'GIF block',
    icon: Gauge,
    description: 'Search and embed a GIF as its own block.',
  },
  {
    id: 'videoEmbed',
    label: 'Video',
    icon: Film,
    description: 'Embed videos from platforms like YouTube or Loom.',
  },
  {
    id: 'githubRepo',
    label: 'GitHub repo',
    icon: Github,
    description: 'Showcase an open-source repository directly in your story.',
  },
  {
    id: 'unsplashImage',
    label: 'Unsplash',
    icon: Camera,
    description: 'Search beautiful photos from Unsplash and insert them as blocks.',
  },
];

/**
 * Compact toolbar item with an info card that appears on hover/focus.
 */
const ToolbarItemCard = ({
  item,
  onClick,
}: {
  item: BottomToolbarItem;
  onClick: (id: string) => void;
}) => {
  const { id, label, icon: Icon, description, disabled } = item;

  return (
    <div className="relative group">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onClick(id)}
        className={cn(
          'flex items-center justify-center rounded-md border border-border bg-card h-8 w-8 text-[11px] font-semibold uppercase tracking-wide shadow-sm',
          'hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors',
          'disabled:opacity-40 disabled:pointer-events-none'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>

      {/* Hover preview card */}
      <div
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 rounded-xl border border-border bg-card text-left shadow-xl',
          'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0',
          'group-focus-within:opacity-100 group-focus-within:translate-y-0',
          'transition-all duration-150 ease-out z-40 overflow-hidden'
        )}
      >
        {/* Header strip */}
        <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 border-b border-border/60">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Block type
            </span>
            <span className="text-xs font-bold leading-tight">{label}</span>
          </div>
        </div>

        {/* Body preview text */}
        {description && (
          <div className="px-3 py-2.5 text-[11px] leading-snug text-muted-foreground bg-card">
            {description}
          </div>
        )}

        {/* Small caret */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 rounded-sm border-l border-b border-border bg-card" />
      </div>
    </div>
  );
};

export function BottomToolbar({
  items,
  onItemClick,
  label = 'Add block:',
  isSidebarOpen = false, // kept for API compatibility (not used in inline layout)
  maxWidthClassName = 'max-w-xl',
  className,
}: BottomToolbarProps) {
  const resolvedItems = items ?? DEFAULT_ITEMS;

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'mx-auto w-full px-4 flex justify-center',
          maxWidthClassName
        )}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-2 px-4 py-2',
            'rounded-xl border-b-4 border-border bg-card/98 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
            'backdrop-blur-sm'
          )}
        >
          {label && (
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
              {label}
            </span>
          )}
          <nav className="flex flex-wrap items-center gap-1.5 justify-end">
            {resolvedItems.map((item) => (
              <ToolbarItemCard
                key={item.id}
                item={item}
                onClick={onItemClick}
              />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}