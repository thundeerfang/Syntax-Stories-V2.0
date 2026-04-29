import Link from 'next/link';
import { Wallet } from 'lucide-react';

export default function WalletPage() {
  return (
    <div className="mx-auto flex min-h-[min(70vh,36rem)] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex size-16 items-center justify-center border-2 border-border bg-muted/30 shadow-[4px_4px_0_0_var(--border)]">
        <Wallet className="size-8 text-primary" strokeWidth={2} aria-hidden />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Wallet</p>
      <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
        Coming soon
      </h1>
      <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground">
        Balances, rewards, and payouts will live here. Check back after the next release.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex items-center justify-center border-2 border-border bg-card px-6 py-3 text-[10px] font-black uppercase tracking-widest text-foreground shadow-[3px_3px_0_0_var(--border)] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
      >
        Back to home
      </Link>
    </div>
  );
}
