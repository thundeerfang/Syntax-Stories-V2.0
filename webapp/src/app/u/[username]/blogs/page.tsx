'use client';

import { useParams } from 'next/navigation';
import { UserProfileBlogsContent } from '@/features/profile';

export default function UserProfileBlogsPage() {
  const params = useParams();
  const raw = params?.username;
  const username = typeof raw === 'string' ? raw.trim().toLowerCase() : '';

  if (!username) {
    return <p className="px-4 py-16 font-mono text-sm text-muted-foreground">Invalid profile.</p>;
  }

  return <UserProfileBlogsContent username={username} />;
}
