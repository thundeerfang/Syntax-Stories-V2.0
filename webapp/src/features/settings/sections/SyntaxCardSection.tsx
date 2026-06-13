'use client';

import React from 'react';
import { CreditCard } from 'lucide-react';
import { useSettingsAuthSlice } from '@/hooks/useSettingsAuthSlice';
import { SyntaxCardPanel } from '@/features/profile';
import {
  SettingsSectionHeading,
  SettingsTabPanel,
  SettingsTabRoot,
} from '@/app/settings/settings-list/SettingsSectionHeading';

export function SyntaxCardContent() {
  const { user } = useSettingsAuthSlice();

  return (
    <SettingsTabRoot>
      <SettingsSectionHeading
        icon={<CreditCard />}
        title="Syntax DevCard"
        description="Your square developer identity card — export as PNG and share on X, Instagram, or Facebook."
      />

      <SettingsTabPanel className="space-y-5">
        <SyntaxCardPanel
          username={user?.username ?? ''}
          fullName={user?.fullName ?? user?.username ?? 'Developer'}
          profileImg={user?.profileImg}
          coverBanner={user?.coverBanner}
          userId={String((user as { _id?: string; id?: string })?._id ?? (user as { id?: string })?.id ?? '') || null}
        />
      </SettingsTabPanel>
    </SettingsTabRoot>
  );
}
