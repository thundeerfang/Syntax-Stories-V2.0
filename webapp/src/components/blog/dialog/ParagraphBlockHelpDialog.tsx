'use client';

import type { ComponentType, ReactNode } from 'react';
import { Type, Keyboard, List, Link2, AtSign, Save } from 'lucide-react';
import { Dialog, DIALOG_FOOTER_ACTIONS_CLASS } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

export interface ParagraphBlockHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

function Section({
  icon: Icon,
  title,
  children,
}: Readonly<{
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}>) {
  return (
    <section className="mt-4 border-t border-border/40 pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-foreground mb-2">
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        {title}
      </h3>
      <div className="text-xs text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export function ParagraphBlockHelpDialog({ open, onClose }: Readonly<ParagraphBlockHelpDialogProps>) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="paragraph-help-dialog-title"
      titleIcon={<Type aria-hidden />}
      title="Paragraph block"
      description="How to use this editor."
      panelClassName={cn('max-w-2xl max-h-[85vh] flex flex-col overflow-hidden')}
      contentClassName="flex min-h-0 flex-1 flex-col p-0"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-6">
      <Section icon={Keyboard} title="Line breaks & paragraphs">
        <p>
          Press <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">Enter</kbd> to start a
          new paragraph or a new list item when you are inside a list.
        </p>
        <p>
          Extra blank lines are normalized: you will not stack many empty rows—only one empty line is kept at a time in
          most cases.
        </p>
      </Section>

      <Section icon={List} title="Lists">
        <p>
          Start a line with <code className="text-[11px] bg-muted px-1 py-0.5 rounded">1. </code> (number, dot, space) for a
          numbered list, or <code className="text-[11px] bg-muted px-1 py-0.5 rounded">- </code> for bullets—then keep typing.
        </p>
        <p>
          When the list keeps going with the next number or bullet, press{' '}
          <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">Enter</kbd> to stop that and
          return to normal paragraphs—often on an empty line at the end of the list, or press Enter again if a new empty
          list row appears first.
        </p>
        <p>
          <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">Backspace</kbd> at the
          start of an empty list line can merge or lift in some cases, but exiting list continuation is usually done with
          Enter, not Backspace.
        </p>
      </Section>

      <Section icon={Link2} title="Formatting & links">
        <p>Use the toolbar for bold, italic, underline, and links. Ctrl/Cmd-click a link to open it in a new tab.</p>
        <p>Pasted plain text that looks like a list (e.g. lines starting with <code className="text-[11px] bg-muted px-1 rounded">1.</code> or{' '}
          <code className="text-[11px] bg-muted px-1 rounded">-</code>) can turn into a real list automatically.</p>
      </Section>

      <Section icon={AtSign} title="Mentions & GIFs">
        <p>
          Use the toolbar buttons to insert a <strong className="text-foreground">mention</strong> or{' '}
          <strong className="text-foreground">GIF</strong>. Search picks from your app’s GIF search and user search.
        </p>
      </Section>

      <Section icon={Save} title="Saving">
        <p>Your draft saves as you edit. You do not need a separate “save paragraph” action for the rich text itself.</p>
      </Section>
      </div>
      <footer className={cn(DIALOG_FOOTER_ACTIONS_CLASS, 'px-6')}>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-none border-2 border-black bg-primary py-2.5 text-sm font-black uppercase text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:brightness-110 active:translate-x-px active:translate-y-px active:shadow-none"
        >
          Got it
        </button>
      </footer>
    </Dialog>
  );
}
