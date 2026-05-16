'use client';

import { useSidebar } from '@/hooks/useSidebar';
import { cn } from '@/lib/utils';

export function MainLayout({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  const { isOpen } = useSidebar();

  return (
    <main className={cn('relative flex w-full min-h-0 min-w-0 flex-1 flex-col items-stretch', className)}>
      <div
        className={cn(
          'relative flex min-h-0 max-w-none flex-1 flex-col items-stretch overflow-x-hidden',
          /* `w-full` + horizontal margin overflows the viewport; width must subtract the sidebar offset. */
          isOpen ? 'ml-60 w-[calc(100%-15rem)]' : 'ml-[52px] w-[calc(100%-52px)]',
          'px-0 pb-4  sm:pb-5  lg:pb-6',
          'transition-[margin-left,width] duration-300 ease-in-out',
        )}
      >
        <div className="relative z-[1] flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col items-stretch overflow-x-hidden">
          {children}
        </div>
      </div>
    </main>
  );
}
