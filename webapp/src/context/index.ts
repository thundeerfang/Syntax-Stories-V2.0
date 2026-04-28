/**
 * Re-exports for backwards compatibility.
 * State is now managed by Zustand stores (see @/store).
 */
export { useAuth } from '@/hooks/useAuth';
export { useTheme } from '@/hooks/useTheme';
export { useSidebar } from '@/hooks/useSidebar';
export { AuthProvider, useAuthContext } from './AuthContext';
export { useRequireAuth } from '@/hooks/useRequireAuth';
