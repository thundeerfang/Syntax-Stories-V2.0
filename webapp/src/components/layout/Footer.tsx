'use client';

import Link from 'next/link';

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t-2 border-border bg-background py-8">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-8 space-y-4">
        
        {/* Line 1: Brand and Primary Links */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-black italic tracking-tighter text-foreground uppercase border-2 border-transparent hover:border-primary px-2 transition-all no-underline"
            >
              Syntax_Stories
            </Link>
            <div className="hidden sm:block h-4 w-[2px] bg-border" />
            <nav className="flex gap-4">
              {['About', 'Contact', 'API', 'Docs'].map((label) => (
                <Link
                  key={label}
                  href={`/${label.toLowerCase()}`}
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">
              System_Status: <span className="text-primary">Operational</span>
            </p>
            <div className="flex gap-1 items-center">
              <div className="size-2 border border-border bg-primary/20" />
              <div className="size-2 border border-border bg-primary/60" />
              <div className="size-2 border border-border bg-primary" />
            </div>
          </div>
        </div>

        {/* Line 2: Legal and Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t-2 border-border/50">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            © {currentYear} Syntax_Stories_Corp // All_Rights_Reserved
          </p>
          
          <div className="flex gap-6">
            <Link
              href="/terms"
              className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:underline decoration-2 underline-offset-4"
            >
              Terms.txt
            </Link>
            <Link
              href="/privacy"
              className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:underline decoration-2 underline-offset-4"
            >
              Privacy.md
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}