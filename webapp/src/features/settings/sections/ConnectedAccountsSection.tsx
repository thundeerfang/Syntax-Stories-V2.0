'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plug } from 'lucide-react';
import { PROVIDER_ICONS } from '@/components/icons/SocialProviderIcons';
import { cn } from '@/lib/core/utils';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api/auth';
import { markOAuthNavigationPending } from '@/lib/auth/oauthNavigation';
import { GithubConnectLottie } from '@/components/ui/lottie';
import { SettingsSectionHeading, SettingsTabPanel, SettingsTabRoot } from '@/app/settings/settings-list/SettingsSectionHeading';




export function ConnectedAccountsContent() {
  const { user, logout, token } = useAuthStore();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Unlinking ${provider} will log you out. Continue?`)) return;
    if (!token) return;
    setDisconnecting(provider);
    try {
      await authApi.disconnectProvider(token, provider);
      toast.success('Connection severed. Logging out...');
      setTimeout(() => logout(), 1500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to disconnect.');
      setDisconnecting(null);
    }
  };

  const handleConnect = async (id: string) => {
    if (!token) return;
    setLinkingProvider(id);
    try {
      const data = await authApi.getLinkRedirectUrl(token, id as 'google' | 'github' | 'facebook' | 'x' | 'discord');
      if (data.redirectUrl) {
        markOAuthNavigationPending();
        globalThis.location.assign(data.redirectUrl);
        return;
      }
      toast.error(data.message ?? 'Could not start linking');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start linking');
    } finally {
      setLinkingProvider(null);
    }
  };

  const providers = [
    { id: 'google', label: 'Google Cloud', linked: user?.isGoogleAccount, color: '#4285F4' },
    { id: 'github', label: 'GitHub Source', linked: user?.isGitAccount, color: '#24292F' },
    { id: 'x', label: 'X (Twitter)', linked: user?.isXAccount, color: '#000000' },
    { id: 'facebook', label: 'Meta / FB', linked: user?.isFacebookAccount, color: '#1877F2' },
    { id: 'discord', label: 'Discord', linked: user?.isDiscordAccount, color: '#5865F2' },
  ] as const;

  return (
    <SettingsTabRoot>
      <SettingsSectionHeading
        icon={<Plug />}
        title="Connected Nodes"
        description="Manage your external authentication modules."
      />

      <SettingsTabPanel>
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((p) => {
          const Icon = PROVIDER_ICONS[p.id] ?? Plug;
          return (
            <div
              key={p.id}
              className={cn(
                "group relative border-4 p-5 transition-all",
                p.linked ? "border-primary bg-primary/5 shadow" : "border-border bg-background"
              )}
            >
              {/* Status Light */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[8px] font-black uppercase tracking-tighter",
                    p.linked ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {p.linked
                    ? "LINKED"
                    : linkingProvider === p.id
                      ? "LINKING..."
                      : "OFFLINE"}
                </span>
                <div
                  className={cn(
                    "size-2 border border-black",
                    p.linked
                      ? "bg-primary animate-pulse"
                      : linkingProvider === p.id
                        ? "bg-yellow-400 animate-pulse"
                        : "bg-muted"
                  )}
                />
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div
                  className={cn(
                    'flex shrink-0 items-center justify-center border-2 border-black shadow',
                    p.id === 'github' && !p.linked ? 'size-16 overflow-hidden' : 'size-12',
                    p.linked ? 'bg-primary text-primary-foreground' : 'bg-muted/20 text-muted-foreground',
                  )}
                >
                  {p.id === 'github' && !p.linked ? (
                    <GithubConnectLottie size={56} />
                  ) : p.id === 'google' ? (
                    <span className="flex items-center justify-center bg-white p-1.5">
                      <Icon className="size-6" />
                    </span>
                  ) : (
                    <Icon className="size-6" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase leading-none">{p.label}</h4>
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                    {p.linked ? `Active Session` : 'No connection'}
                  </p>
                </div>
              </div>

              {p.linked ? (
                <button
                  type="button"
                  onClick={() => handleDisconnect(p.id)}
                  disabled={!!disconnecting}
                  className="w-full py-2 border-2 border-destructive text-destructive font-black text-[10px] uppercase tracking-widest hover:bg-destructive hover:text-white transition-all disabled:opacity-50"
                >
                  {disconnecting === p.id ? 'SEVERING...' : 'Sever Connection'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnect(p.id)}
                  disabled={!!linkingProvider}
                  className="w-full py-2 border-2 border-black bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-50 shadow active:shadow-none"
                >
                  {linkingProvider === p.id ? 'REDIRECTING...' : 'Establish Link'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      </SettingsTabPanel>
    </SettingsTabRoot>
  );
}

