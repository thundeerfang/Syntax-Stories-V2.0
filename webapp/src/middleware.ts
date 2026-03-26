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
  if (/\bEdge\/(1[0-8]|[0-9]{1,2})\./i.test(ua) && !/\bEdg\//i.test(ua)) return true;

  // Windows XP / Server 2003
  if (/Windows NT 5\.[12]/i.test(ua)) return true;

  // Windows Vista, 7, 8, 8.1
  if (/Windows NT 6\.[0-3]/i.test(ua)) return true;

  // macOS 10.12 and older, and 10.13 High Sierra (do not match 10.14+ — many modern UAs still claim 10.15)
  if (/Mac OS X 10[._](?:[0-9]|1[0-2])(?:[._]\d+)*/i.test(ua)) return true;
  if (/Mac OS X 10[._]13(?:[._]\d+)*/i.test(ua)) return true;

  // Very old Safari (e.g. ≤12) on any macOS — Version/12.x or lower in WebKit UA
  const ver = ua.match(/\bVersion\/(\d+)/i);
  if (ver && /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) {
    const major = parseInt(ver[1], 10);
    if (Number.isFinite(major) && major <= 12) return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
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
     */
    '/((?!_next/static|_next/image|unsupported\\.html|favicon\\.ico|favicon/|svg/|icons/|developers/).*)',
  ],
};
