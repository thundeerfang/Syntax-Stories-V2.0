'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { blogDetailPath } from '@/lib/users/userProfilePath';

/** Legacy URL — blogs live under /blogs, not under users. */
export default function UserPostRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const postId = typeof params.postId === 'string' ? params.postId : '';

  useEffect(() => {
    if (postId) router.replace(blogDetailPath(postId));
    else router.replace('/blogs');
  }, [router, postId]);

  return null;
}
