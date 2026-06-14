"use client";
import { useSidebar } from "@/hooks/useSidebar";
import { GridBackground } from "@/components/ui/media/grid-background";
import { AppShellChrome } from "./chrome/AppShellChrome";
import { MainLayout } from "./chrome/MainLayout";
import { DesktopShellInit } from "./init/DesktopShellInit";
import { FloatingActions } from "./overlays/FloatingActions";
import { FeedbackDialogWrapper } from "./overlays/FeedbackDialog";
export function LayoutShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isOpen } = useSidebar();
  return (
    <div
      className="shell-layout relative flex min-h-screen min-h-[100dvh] flex-col"
      data-sidebar-expanded={isOpen}
    >
      <DesktopShellInit />
      <GridBackground className="absolute inset-0 z-0 min-h-full" />
      <AppShellChrome />
      <MainLayout className="relative z-[1] min-h-0 flex-1">
        {children}
      </MainLayout>
      <FloatingActions />
      <FeedbackDialogWrapper />
    </div>
  );
}
