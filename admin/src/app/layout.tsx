import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppThemeProvider } from '@/theme/AppThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Syntax Stories — Admin',
  description: 'Help & CMS admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <AppThemeProvider>
          <Providers>{children}</Providers>
        </AppThemeProvider>
      </body>
    </html>
  );
}
