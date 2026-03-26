'use client';

import { AuthDialog } from './AuthDialog';

/**
 * Renders the auth dialog. Mount this once in the app layout.
 * Open via useAuthDialogStore().open('login' | 'signup').
 */
export function AuthDialogWrapper() {
  return <AuthDialog />;
}
