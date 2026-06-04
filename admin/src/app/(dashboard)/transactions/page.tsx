'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Transactions removed from admin nav — billing history is on user detail. */
export default function TransactionsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/subscriptions');
  }, [router]);
  return null;
}
