'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Loader from 'react-loaders';
import 'loaders.css/loaders.min.css';

const TITLE = 'SYSTEM SYNTAX STORIES — BASH';
const MIN_SHOW_MS = 5000;
const FADE_DURATION_MS = 300;

const PATH_MAP: Record<string, string> = {
  about: 'about', profile: 'profile', settings: 'settings', login: 'login',
  signup: 'signup', explore: 'explore', trending: 'trending', u: 'profile',
  terms: 'terms', policy: 'policy', privacy: 'privacy',
};

export function pathnameToPageName(pathname: string): string {
  if (!pathname || pathname === '/') return 'home';
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'app';
  return PATH_MAP[segment] ?? segment;
}

type GlobalLoaderProps = { pageName?: string; status?: string };

export function GlobalLoader({ pageName = 'app', status }: GlobalLoaderProps) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots((p) => (p.length >= 3 ? '' : p + '.')), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[300px] w-full p-4">
      <div className="loader-scale-in relative mx-auto w-full max-w-[480px] rounded-lg overflow-hidden bg-[#0d0d0f] border border-white/10 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.7)]">
        <div className="bg-[#1a1a1c] flex items-center px-4 py-3 border-b border-white/5">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57] opacity-80 hover:opacity-100 transition-opacity" />
            <div className="h-3 w-3 rounded-full bg-[#febc2e] opacity-80 hover:opacity-100 transition-opacity" />
            <div className="h-3 w-3 rounded-full bg-[#28c840] opacity-80 hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex-1 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{TITLE}</div>
          <div className="w-12" />
        </div>
        <div className="p-6 font-mono text-[13px] leading-relaxed relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,118,0.02))] bg-[length:100%_4px,3px_100%]" />
          <div className="space-y-1.5 mb-6">
            <div className="flex gap-2 opacity-50">
              <span className="text-[#b967ff]">➜</span>
              <span className="text-[#27c93f]">~/projects/syntax</span>
              <span className="text-white/70">git checkout main</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#b967ff]">➜</span>
              <span className="text-[#27c93f]">~/projects/syntax</span>
              <span className="text-white/90">npm run build:{pageName}</span>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="terminal-loader-pacman-refined">
                <Loader type="pacman" active />
              </div>
              <div className="flex flex-col">
                <span className="text-[#b967ff] font-bold tracking-tight">
                  {status || `INITIALIZING_${pageName.toUpperCase()}`}
                  <span className="inline-block w-2 ml-1">{dots}</span>
                </span>
                <span className="text-[11px] text-white/30 uppercase tracking-widest">Memory: 256MB / Latency: 14ms</span>
              </div>
            </div>
            <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#b967ff] animate-progress-loading shadow-[0_0_8px_#b967ff]" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 opacity-50 text-[11px]">
            <span className="text-white/40">Status:</span>
            <span className="text-[#27c93f]">Active</span>
            <span className="w-2 h-4 bg-[#b967ff] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function GlobalLoaderOverlay() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [pageName, setPageName] = useState('app');
  const prevPathRef = useRef<string | null>(null);
  const shownAtRef = useRef(0);

  useEffect(() => {
    const name = pathnameToPageName(pathname);
    const isInitial = prevPathRef.current === null;
    const isAuthCallback = pathname.includes('-callback');
    prevPathRef.current = pathname;
    setPageName(name);
    setExiting(false);
    if (isInitial || isAuthCallback) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const hide = () => {
      const elapsed = Date.now() - shownAtRef.current;
      timeouts.push(setTimeout(() => {
        setExiting(true);
        timeouts.push(setTimeout(() => setShow(false), FADE_DURATION_MS));
      }, Math.max(0, MIN_SHOW_MS - elapsed)));
    };
    shownAtRef.current = Date.now();
    setShow(true);
    hide();
    return () => timeouts.forEach(clearTimeout);
  }, [pathname]);

  useEffect(() => {
    if (show) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [show]);

  if (!show) return null;
  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md transition-opacity duration-300 ease-out overflow-hidden ${exiting ? 'opacity-0' : 'opacity-100 loader-overlay-in'}`}
      aria-live="polite"
      aria-busy="true"
    >
      <div className={exiting ? 'opacity-0 transition-opacity duration-300' : 'loader-scale-in'}>
        <GlobalLoader pageName={pageName} />
      </div>
    </div>
  );
}

type TerminalLoaderPageProps = { pageName?: string; inline?: boolean };

export function TerminalLoaderPage({ pageName = 'app', inline = false }: TerminalLoaderPageProps) {
  const content = <GlobalLoader pageName={pageName} />;
  if (inline) return <div className="flex items-center justify-center py-12">{content}</div>;
  return <div className="min-h-screen flex items-center justify-center bg-background p-4">{content}</div>;
}
