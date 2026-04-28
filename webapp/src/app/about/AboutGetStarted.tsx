'use client';

import { useAuthDialogStore } from '@/store/authDialog';
import { Button } from '@/components/ui';

export function AboutGetStarted() {
  const open = useAuthDialogStore((s) => s.open);
  return (
    <Button variant="primary" onClick={() => open('signup')}>
      Get started
    </Button>
  );
}
