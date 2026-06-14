import { Suspense } from "react";

export default function BookmarksLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
