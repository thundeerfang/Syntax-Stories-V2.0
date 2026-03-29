'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RetroAccordionProps {
  label: React.ReactNode;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function RetroAccordion({
  label,
  subtitle,
  defaultOpen = false,
  className,
  children,
}: Readonly<RetroAccordionProps>) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('space-y-1', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-2 border-border bg-muted/20 px-3 py-2 text-[11px] font-bold uppercase"
      >
        <div className="flex flex-col text-left">
          <span className="text-primary truncate">{label}</span>
          {subtitle && (
            <span className="text-[10px] font-medium text-muted-foreground normal-case">
              {subtitle}
            </span>
          )}
        </div>
        <ChevronRight
          className={cn(
            'size-3 shrink-0 transition-transform',
            open && 'rotate-90'
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 border-2 border-dashed border-border bg-card/40 p-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

