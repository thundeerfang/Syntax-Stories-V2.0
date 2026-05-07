'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Flame, Loader2 } from 'lucide-react';
import { followApi, type ReadStreakPayload } from '@/api/follow';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { SettingsSectionHeading } from './settings-list/SettingsSectionHeading';
import {
  SettingsFullWidthSegmentedControl,
  SettingsMetricCard,
} from './settings-list/SettingsFullWidthSegmentedControl';
import { settingsBtnBlockPrimaryMd } from './buttonStyles';
import { cn } from '@/lib/utils';

type Mode = 'daily' | 'weekly' | 'monthly';

function modeLabel(m: Mode): string {
  if (m === 'daily') return 'Daily';
  if (m === 'weekly') return 'Weekly';
  return 'Monthly';
}

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function BlogStreakSettingsContent() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const username = user?.username?.trim() ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payload, setPayload] = useState<ReadStreakPayload | null>(null);
  const [mode, setMode] = useState<Mode>('daily');

  useEffect(() => {
    const m = user?.blogStreakMode;
    if (m === 'weekly' || m === 'monthly' || m === 'daily') setMode(m);
  }, [user?.blogStreakMode]);

  const load = useCallback(async () => {
    if (!username) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await followApi.getPublicProfile(username);
      if (res.success && res.readStreak) setPayload(res.readStreak);
    } catch {
      toast.error('Could not load streak data');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMode = async (next: Mode) => {
    if (!token) {
      toast.error('Sign in required');
      return;
    }
    if (next === mode) return;
    setSaving(true);
    try {
      await authApi.updateProfileSection(token, 'blog-streak', {
        blogStreakMode: next,
        expectedProfileVersion: user?.profileVersion,
      });
      setMode(next);
      await refreshUser();
      toast.success('Read streak display updated');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !payload) {
    return (
      <div className="flex items-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="font-mono text-[10px] uppercase tracking-widest">Loading read streaks…</span>
      </div>
    );
  }

  const modes: Mode[] = ['daily', 'weekly', 'monthly'];

  return (
    <div className="w-full min-w-0 space-y-8">
      <SettingsSectionHeading
        icon={<Flame className="size-5" />}
        title="Blog read streak"
        description="One UTC day = you view one published post. Your profile shows your streak (daily/weekly/monthly) from the same history."
      />

      <div className="w-full min-w-0 space-y-2">
        <SettingsFullWidthSegmentedControl
          label="Profile display"
          value={mode}
          disabled={saving}
          options={MODE_OPTIONS}
          onValueChange={(v) => {
            if (v === 'daily' || v === 'weekly' || v === 'monthly') void saveMode(v);
          }}
        />
      
      </div>

      <div className="w-full min-w-0 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current & longest</p>
        <div
          className={cn(
            'grid w-full min-w-0 gap-3',
            '[grid-template-columns:repeat(auto-fit,minmax(min(100%,10.5rem),1fr))]',
          )}
        >
          {modes.map((m) => {
            const row = payload?.byMode[m];
            const isSel = mode === m;
            return (
              <SettingsMetricCard key={m} title={modeLabel(m)} highlighted={isSel}>
                <p className="mt-2 text-2xl font-black italic tabular-nums">{row?.current ?? 0}</p>
                <p className="text-[8px] font-bold uppercase text-muted-foreground mt-1">current</p>
                <p className="mt-3 text-lg font-black tabular-nums">{row?.longest ?? 0}</p>
                <p className="text-[8px] font-bold uppercase text-muted-foreground">longest</p>
              </SettingsMetricCard>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          className={cn(settingsBtnBlockPrimaryMd)}
          disabled={loading}
          onClick={() => void load()}
        >
          Refresh numbers
        </button>
      </div>
    </div>
  );
}
