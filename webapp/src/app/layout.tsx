import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout";
import { StoreHydration } from "@/components/StoreHydration";
import { AuthDialogWrapper } from "@/features/auth";
import { SearchDialogWrapper } from "@/components/search";
import { SonnerToaster } from "@/components/retroui";
import { UiProcessingShield } from "@/components/ui/feedback";
import { Providers } from "./providers";
import { ConnectivityGate } from "@/features/connectivity";
import { MobileAppScreenLock, StorageGate } from "@/features/platform";
import { NotificationRealtimeBridge } from "@/components/notifications/NotificationRealtimeBridge";
import { GlobalEngagementEffects } from "@/components/effects";
import {
  AchievementCelebrationHost,
  AchievementRealtimeBridge,
} from "@/components/achievements";
import { NavigationRecovery } from "@/components/shell/NavigationRecovery";
import { LegalReconsentGate } from "@/components/legal/LegalReconsentGate";

import { MOBILE_BROWSER_LOCK_BOOTSTRAP_SCRIPT } from "@/lib/dom/mobileBrowserLockBootstrap";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const SITE_URL = "https://syntax-stories.vercel.app";
const META_IMAGE_URL =
  "https://res.cloudinary.com/dr2bxpjjz/image/upload/v1782037183/SYNTAX_STORIES_1_l3rw3r.png";
const SITE_TITLE =
  "Syntax Stories - Developer Blogs, Squads & Coding Community";
const SITE_DESCRIPTION =
  "Syntax Stories is a developer community for writing technical blogs, discovering coding stories, joining squads, tracking achievements, and sharing your programming journey.";

/** Inline in <head> so it runs before paint; avoids next/script in <body> (React 19 + RSC warnings). */
const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var raw=localStorage.getItem('syntax-stories-theme');var resolved=null;if(raw){var p=JSON.parse(raw);var stored=p&&p.state&&p.state.theme;if(stored==='dark'||stored==='light')resolved=stored;else if(stored==='system'||!stored)resolved=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(!resolved)resolved=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.toggle('dark',resolved==='dark');document.documentElement.style.colorScheme=resolved;}catch(e){var fb=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.toggle('dark',fb==='dark');document.documentElement.style.colorScheme=fb;}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Syntax Stories",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Syntax Stories",
  authors: [
    { name: "Harshit Kushwah" },
    { name: "Somya" },
    { name: "Vijay" },
  ],
  creator: "Harshit Kushwah, Somya, Vijay",
  publisher: "Syntax Stories",
  keywords: [
    "Syntax Stories",
    "developer community",
    "programming blogs",
    "coding stories",
    "web development",
    "developer squads",
    "tech articles",
    "Flutter",
    "Next.js",
    "full-stack development",
  ],
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Syntax Stories",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: META_IMAGE_URL,
        width: 1024,
        height: 576,
        alt: "Syntax Stories developer community preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [META_IMAGE_URL],
  },
  appleWebApp: {
    capable: true,
    title: "Syntax Stories",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          id="syntax-stories-theme-init"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
        <script
          id="syntax-stories-mobile-lock-init"
          dangerouslySetInnerHTML={{
            __html: MOBILE_BROWSER_LOCK_BOOTSTRAP_SCRIPT,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          <NavigationRecovery />
          <UiProcessingShield />
          <StoreHydration />
          <AuthDialogWrapper />
          <SearchDialogWrapper />
          <SonnerToaster />
          <NotificationRealtimeBridge />
          <LegalReconsentGate />
          <LayoutShell>{children}</LayoutShell>
          <AchievementCelebrationHost />
          <AchievementRealtimeBridge />
          <GlobalEngagementEffects />
          <MobileAppScreenLock />
          <ConnectivityGate />
          <StorageGate />
        </Providers>
      </body>
    </html>
  );
}
