import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Static fallback: /unsupported.html (see public/unsupported.html).
 * Keep in sync when changing redirect target.
 */
const UNSUPPORTED_PATH = '/unsupported.html';

function isLegacyUserAgent(ua: string): boolean {
  if (!ua) return false;

  // Internet Explorer (all versions)
  if (/\bMSIE\b/i.test(ua) || /\bTrident\//i.test(ua)) return true;

  // EdgeHTML (legacy Edge, pre-Chromium): "... Edge/12." .. "Edge/18."
  if (/\bEdge\/(1[0-8]|\d{1,2})\./i.test(ua) && !/\bEdg\//i.test(ua)) return true;

  // Windows XP / Server 2003
  if (/Windows NT 5\.[12]/i.test(ua)) return true;

  // Windows Vista, 7, 8, 8.1
  if (/Windows NT 6\.[0-3]/i.test(ua)) return true;

  // macOS: block 10.13 and older only.
  // Important: UA strings often use "10_15_7" even on newer macOS versions.
  // Parse full numeric segments to avoid partial matches like "10_1" from "10_15_7".
  const mac = /Mac OS X (\d+)[._](\d+)(?:[._](\d+))?/i.exec(ua);
  if (mac) {
    const major = Number.parseInt(mac[1] ?? '', 10);
    const minor = Number.parseInt(mac[2] ?? '', 10);
    if (Number.isFinite(major) && Number.isFinite(minor) && major === 10 && minor <= 13) {
      return true;
    }
  }

  // Very old Safari (e.g. ≤12) on any macOS — Version/12.x or lower in WebKit UA
  const VERSION_RE = /\bVersion\/(\d+)/i;
  const ver = VERSION_RE.exec(ua);
  if (ver && /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) {
    const major = Number.parseInt(ver[1] ?? '', 10);
    if (Number.isFinite(major) && major <= 12) return true;
  }

  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === UNSUPPORTED_PATH || pathname.startsWith('/unsupported')) {
    return NextResponse.next();
  }

  const ua = request.headers.get('user-agent') ?? '';
  if (!isLegacyUserAgent(ua)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = UNSUPPORTED_PATH;
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Skip Next internals, static assets, and the unsupported page itself.
     * Plain string only — Next.js 16 cannot extract String.raw`…` in config (segment config build error).
     */
    '/((?!_next/static|_next/image|unsupported\\.html|favicon\\.ico|favicon/|svg/|icons/|developers/).*)', // NOSONAR — String.raw breaks Next.js 16 config extraction
  ],
};
