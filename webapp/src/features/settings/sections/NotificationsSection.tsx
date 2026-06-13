'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Award,
  Bell,
  Flame,
  Heart,
  Settings,
  Tag,
  UserPlus,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { Switch } from '@/components/retroui/Switch';
import { useAuthStore } from '@/store/auth';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/api/notifications';
import {
  SettingsSectionHeading,
  SettingsTabPanel,
  SettingsTabRoot,
} from '@/app/settings/settings-list/SettingsSectionHeading';

type ToggleKey = keyof NotificationPreferences;

type PrefItem = {
  key: ToggleKey;
  label: string;
  hint: string;
  icon: ReactNode;
};

const CATEGORY_PREFS: PrefItem[] = [
  {
    key: 'milestonesEnabled',
    label: 'Engagement milestones',
    hint: 'Reposts, views, and respects at 100 / 500 / 1K.',
    icon: <Heart className="size-4" strokeWidth={2.5} />,
  },
  {
    key: 'achievementsEnabled',
    label: 'Achievements',
    hint: 'Badge unlocks, XP, and level-up alerts.',
    icon: <Award className="size-4" strokeWidth={2.5} />,
  },
  {
    key: 'followingEnabled',
    label: 'Following feed',
    hint: 'New posts from people you follow.',
    icon: <Users className="size-4" strokeWidth={2.5} />,
  },
  {
    key: 'categoriesEnabled',
    label: 'Categories',
    hint: 'Posts in categories you follow.',
    icon: <Tag className="size-4" strokeWidth={2.5} />,
  },
  {
    key: 'tagsEnabled',
    label: 'Topics & tags',
    hint: 'Posts on topics you follow.',
    icon: <Tag className="size-4" strokeWidth={2.5} />,
  },
  {
    key: 'squadsEnabled',
    label: 'Squads',
    hint: 'New squad posts and squad milestones.',
    icon: <Users className="size-4" strokeWidth={2.5} />,
  },
  {
    key: 'trendingEnabled',
    label: 'Trending',
    hint: 'When your posts hit the trending section.',
    icon: <Flame className="size-4" strokeWidth={2.5} />,
  },
  {
    key: 'referralsEnabled',
    label: 'Invites',
    hint: 'When a friend accepts your invite.',
    icon: <UserPlus className="size-4" strokeWidth={2.5} />,
  },
  {
    key: 'settingsEnabled',
    label: 'Account & settings',
    hint: 'Profile, education, email, and settings changes.',
    icon: <Settings className="size-4" strokeWidth={2.5} />,
  },
];

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  inAppEnabled: true,
  milestonesEnabled: true,
  followingEnabled: true,
  trendingEnabled: true,
  settingsEnabled: true,
  referralsEnabled: true,
  squadsEnabled: true,
  categoriesEnabled: true,
  tagsEnabled: true,
  achievementsEnabled: true,
};

function NotificationPrefCard({
  item,
  checked,
  disabled,
  onChange,
}: {
  item: PrefItem;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 border-4 border-border bg-card p-4 pl-4 pr-4 shadow-sm transition-colors',
        checked && 'border-primary/40 bg-primary/[0.03]'
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center border-2 border-border shadow-sm',
          checked ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground'
        )}
      >
        {item.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-foreground leading-snug">
          {item.label}
        </p>
        <p className="mt-1 text-[10px] font-medium leading-relaxed text-muted-foreground">
          {item.hint}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-center">
        <span
          className={cn(
            'text-[9px] font-black uppercase tracking-tighter',
            checked ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {checked ? 'On' : 'Off'}
        </span>
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          aria-label={`${item.label} notifications`}
        />
      </div>
    </div>
  );
}

export function NotificationsSettingsContent() {
  const token = useAuthStore((s) => s.token);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ToggleKey | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const p = await fetchNotificationPreferences(token);
      setPrefs(p);
    } catch {
      toast.error('Could not load notification preferences.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (key: ToggleKey, value: boolean) => {
    if (!token || !prefs) return;
    setSavingKey(key);
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    try {
      const updated = await updateNotificationPreferences(token, { [key]: value });
      setPrefs(updated);
      toast.success('Preference saved', { id: `notif-pref-${key}` });
    } catch {
      setPrefs(prev);
      toast.error('Could not save preference.');
    } finally {
      setSavingKey(null);
    }
  };

  const effectivePrefs = prefs ?? DEFAULT_NOTIFICATION_PREFS;
  const inAppOn = effectivePrefs.inAppEnabled;
  const prefsReady = prefs !== null && !loading;

  return (
    <SettingsTabRoot className="w-full min-w-0 -mr-6 pr-0 md:-mr-10">
      <SettingsSectionHeading
        icon={<Bell className="size-5" />}
        title="Notification preferences"
        description="Choose what shows in your bell inbox and as live toasts."
      />

      <SettingsTabPanel className="w-full min-w-0 pr-0">
        {/* Master delivery */}
        <section className="border-4 border-border bg-card pl-4 pr-0 py-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pr-4">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center border-2 border-border shadow-sm',
                  inAppOn ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground'
                )}
              >
                <Bell className="size-4" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-foreground">
                  In-app alerts
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  Bell inbox and live toasts while you are signed in.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:pl-4">
              <span
                className={cn(
                  'text-[9px] font-black uppercase tracking-tighter',
                  inAppOn ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {inAppOn ? 'On' : 'Off'}
              </span>
              <Switch
                checked={inAppOn}
                disabled={!prefsReady || savingKey !== null}
                onCheckedChange={(v) => void patch('inAppEnabled', v)}
                aria-label="In-app alerts"
              />
            </div>
          </div>
        </section>

        <div className="w-full min-w-0 space-y-3 pr-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Alert categories
          </p>
          <div
            className={cn(
              'grid w-full min-w-0 gap-3 pr-0',
              '[grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]',
              'md:grid-cols-2',
              !inAppOn && 'pointer-events-none opacity-50'
            )}
            aria-disabled={!inAppOn}
          >
            {CATEGORY_PREFS.map((item) => (
              <NotificationPrefCard
                key={item.key}
                item={item}
                checked={effectivePrefs[item.key]}
                disabled={!prefsReady || !inAppOn || savingKey !== null}
                onChange={(v) => void patch(item.key, v)}
              />
            ))}
          </div>
        </div>
      </SettingsTabPanel>
    </SettingsTabRoot>
  );
}
