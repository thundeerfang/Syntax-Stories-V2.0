'use client';

import { useState } from 'react';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import { isAdminAuthActive, resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';
import { AdminSidebarNav } from '@/components/ui/AdminSidebarNav';
import { RolesCrudSection } from './RolesCrudSection';
import { CatalogSlugCrudSection } from './CatalogSlugCrudSection';
import { PermissionsCrudSection } from './PermissionsCrudSection';

const ACCESS_NAV = [
  { label: 'Roles', icon: BadgeRoundedIcon },
  { label: 'Resources', icon: CategoryRoundedIcon },
  { label: 'Actions', icon: TouchAppRoundedIcon },
  { label: 'Scope types', icon: LayersRoundedIcon },
  { label: 'Permissions', icon: KeyRoundedIcon },
] as const;

export function AccessControlPanel({ token }: { token: string | null }) {
  const [section, setSection] = useState(0);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  if (!isAdminAuthActive(token, httpOnlyCookies)) return null;

  return (
    <AdminSidebarNav items={[...ACCESS_NAV]} value={section} onChange={setSection}>
      {section === 0 ? <RolesCrudSection token={apiToken} /> : null}
      {section === 1 ? <CatalogSlugCrudSection token={apiToken} variant="resources" /> : null}
      {section === 2 ? <CatalogSlugCrudSection token={apiToken} variant="actions" /> : null}
      {section === 3 ? <CatalogSlugCrudSection token={apiToken} variant="scopes" /> : null}
      {section === 4 ? <PermissionsCrudSection token={apiToken} /> : null}
    </AdminSidebarNav>
  );
}
