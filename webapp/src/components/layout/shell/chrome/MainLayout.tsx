"use client";
import { useDesktopShell } from "@/hooks/useDesktopShell";
import { cn } from "@/lib/core/utils";
import { layout } from "@/lib/styles";
import { Footer } from "../../footer/Footer";
export function MainLayout({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  const isDesktop = useDesktopShell();
  return (
    <main
      className={cn(
        "relative flex w-full min-h-0 min-w-0 flex-1 flex-col items-stretch",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex min-h-0 max-w-none flex-1 flex-col items-stretch overflow-x-hidden",
          layout.mainOffset,
        )}
      >
        <div className="relative z-[1] flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col items-stretch overflow-x-hidden px-0 pb-4 sm:pb-5 lg:pb-6">
          {children}
        </div>
        {!isDesktop ? <Footer /> : null}
      </div>
    </main>
  );
}
