'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const OFFSET = 8;

function tooltipTransform(side: TooltipProps['side']): string {
  if (side === 'top') return 'translate(-50%, -100%)';
  if (side === 'bottom') return 'translate(-50%, 0)';
  if (side === 'left') return 'translate(-100%, -50%)';
  return 'translate(0, -50%)';
}

export function Tooltip({ content, children, side = 'top', className }: Readonly<TooltipProps>) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (side === 'top') {
      setPos({ x: rect.left + rect.width / 2, y: rect.top - OFFSET });
    } else if (side === 'bottom') {
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + OFFSET });
    } else if (side === 'left') {
      setPos({ x: rect.left - OFFSET, y: rect.top + rect.height / 2 });
    } else {
      setPos({ x: rect.right + OFFSET, y: rect.top + rect.height / 2 });
    }
  };

  const handleMouseEnter = () => {
    setVisible(true);
    updatePosition();
  };

  const handleMouseLeave = () => setVisible(false);

  const transform = tooltipTransform(side);

  const tooltipEl =
    visible &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="fixed z-[100] max-w-xs border-2 border-border bg-card px-3 py-2 text-sm text-card-foreground shadow-md pointer-events-none"
        style={{
          left: pos.x,
          top: pos.y,
          transform,
        }}
        role="tooltip"
      >
        {content}
      </div>,
      document.body
    );

  return (
    <button
      type="button"
      ref={triggerRef}
      className={cn('inline-flex border-0 bg-transparent p-0 font-inherit text-inherit cursor-default', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={updatePosition}
    >
      {children}
      {tooltipEl}
    </button>
  );
}
