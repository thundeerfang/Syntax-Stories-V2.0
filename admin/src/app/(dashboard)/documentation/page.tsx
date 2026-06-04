'use client';

import { Suspense } from 'react';
import { CircularProgress, Stack } from '@mui/material';
import { DocumentationHub } from '@/components/documentation/DocumentationHub';

function DocumentationHubFallback() {
  return (
    <Stack alignItems="center" py={6}>
      <CircularProgress size={28} />
    </Stack>
  );
}

export default function DocumentationPage() {
  return (
    <Suspense fallback={<DocumentationHubFallback />}>
      <DocumentationHub />
    </Suspense>
  );
}
