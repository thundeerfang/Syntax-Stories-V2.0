'use client';

import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

export interface MediaFullViewDialogProps {
  open: boolean;
  onClose: () => void;
  src: string;
  title?: string;
  altText?: string;
}

export function MediaFullViewDialog({ open, onClose, src, title, altText }: Readonly<MediaFullViewDialogProps>) {
  const isImage = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(src) || src.startsWith('data:image');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="media-fullview-title"
      panelClassName={cn(
        'pointer-events-auto max-w-[90vw] max-h-[90vh] w-fit overflow-auto',
        'border-4 border-border bg-card shadow-xl'
      )}
      contentClassName="p-4"
      backdropClassName="fixed inset-0 z-[102] bg-black/70"
      showCloseButton={true}
    >
      <div className="flex flex-col gap-2">
        {title && <p className="text-sm font-bold uppercase">{title}</p>}
        {isImage ? (
          <img src={src} alt={altText ?? title ?? 'Media'} className="max-w-full max-h-[80vh] w-auto h-auto object-contain" />
        ) : (
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline break-all">
            {src}
          </a>
        )}
      </div>
    </Dialog>
  );
}
