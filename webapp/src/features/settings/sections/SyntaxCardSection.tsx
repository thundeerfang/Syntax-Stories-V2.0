'use client';

import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { settingsBtnBlockPrimaryMd } from '@/app/settings/buttonStyles';
import { useSettingsAuthSlice } from '@/hooks/useSettingsAuthSlice';
import { SyntaxCardDialog } from '@/features/profile';
import { SettingsSectionHeading, SettingsTabPanel, SettingsTabRoot } from '@/app/settings/settings-list/SettingsSectionHeading';




export function SyntaxCardContent() {
  const { user } = useSettingsAuthSlice();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <SettingsTabRoot>
      <SettingsSectionHeading
        icon={<CreditCard />}
        title="Syntax DevCard"
        description="Your square developer identity card — export as PNG and share on X, Instagram, or Facebook."
      />

      <SettingsTabPanel className="max-w-md space-y-5">
        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
          Pulls your cover, avatar, posts, respects, followers, achievements, blog contribution map, and read streak into one retro card.
        </p>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={cn(
            settingsBtnBlockPrimaryMd,
            'inline-flex items-center gap-2 border-2 border-border font-black text-[11px] uppercase tracking-widest shadow',
          )}
        >
          <CreditCard className="size-4" />
          Open Syntax Card
        </button>
      </SettingsTabPanel>

      <SyntaxCardDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        username={user?.username ?? ''}
        fullName={user?.fullName ?? user?.username ?? 'Developer'}
        profileImg={user?.profileImg}
        coverBanner={user?.coverBanner}
      />
    </SettingsTabRoot>
  );
}

