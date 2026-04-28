'use client';

import Link from 'next/link';

export default function SignInHelpPage() {
  return (
    <div className="mx-auto max-w-prose space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Trouble signing in?</h1>
      <p className="text-muted-foreground">
        If you forgot your email or are having trouble signing in, contact support or try
        signing in with the same email you used when you created your account.
      </p>
      <Link
        href="/login"
        className="inline-block border-2 border-primary bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
      >
        Back to sign in
      </Link>
    </div>
  );
}
