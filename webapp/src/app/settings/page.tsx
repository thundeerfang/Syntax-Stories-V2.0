'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  User,
  CreditCard,
  Briefcase,
  GraduationCap,
  Award,
  Bell,
  Tag,
  Plug,
  ShieldCheck,
  FileText,
  HeadphonesIcon,
  LogOut,
  Camera,
  Code2,
  FolderGit2,
  Settings,
  ChevronDown,
  Mail,
  Monitor,
  Plus,
  Check,
  Link2,
  Unlink,
} from 'lucide-react';
import { PROVIDER_ICONS } from '@/components/icons/SocialProviderIcons';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/hooks/useSidebar';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api/auth';
import { UploadProfilePicDialog, UploadCoverDialog } from '@/components/profile/dialog';
import { getSkillIconUrl, getSkillIconUrlBySlug } from '@/lib/skillIcons';
import { searchTechStack, type TechStackItem } from '@/data/techStack';

type SectionId = string;

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Account',
    items: [
      { id: 'edit-profile', label: 'Edit profile', icon: User },
      { id: 'stack-tools', label: 'Stack & Tools', icon: Tag },
      { id: 'my-setup', label: 'My Setup', icon: Monitor },
      { id: 'work-experiences', label: 'Work Experiences', icon: Briefcase },
      { id: 'education', label: 'Education', icon: GraduationCap },
      { id: 'projects', label: 'Projects', icon: FolderGit2 },
      { id: 'open-source', label: 'Open Source', icon: Code2 },
    ],
  },
  {
    heading: 'Security',
    items: [
      { id: 'security-email', label: 'Update email', icon: Mail },
      { id: 'connected-accounts', label: 'Connected accounts', icon: Plug },
    ],
  },
  {
    heading: 'Other',
    items: [
      { id: 'syntax-card', label: 'Syntax card', icon: CreditCard },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

const accordionVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1 },
};

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4 pt-6 border-t-2 border-border/50 first:border-t-0 first:pt-0">
    <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
    <div className="grid gap-4">{children}</div>
  </div>
);

function SyntaxCardContent() {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Syntax DevCard</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Your developer identity card. This is how you appear across the platform.
        </p>
      </header>

      <div className="max-w-md mx-auto lg:mx-0">
        <div className="relative group">
          {/* Decorative Background Shadow */}
          <div className="absolute inset-0 translate-x-2 translate-y-2 bg-primary border-2 border-black" />
          
          {/* Main Card */}
          <div className="relative border-2 border-black bg-white p-6 transition-transform group-hover:-translate-y-1">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="size-16 border-2 border-black bg-muted overflow-hidden">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Harshit"
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase">Harshit Kushwah</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">@harshitkushwah</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border-2 border-black bg-muted/30 py-3">
                  <p className="text-xl font-black italic leading-none">10</p>
                  <p className="mt-1 text-[8px] font-black uppercase text-muted-foreground">Rep</p>
                </div>
                <div className="border-2 border-black bg-muted/30 py-3">
                  <p className="text-xl font-black italic leading-none">2</p>
                  <p className="mt-1 text-[8px] font-black uppercase text-muted-foreground">Streak</p>
                </div>
                <div className="border-2 border-black bg-muted/30 py-3">
                  <p className="text-xl font-black italic leading-none">7</p>
                  <p className="mt-1 text-[8px] font-black uppercase text-muted-foreground">Reads</p>
                </div>
              </div>

           
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditProfileContent() {
  const { user, updateProfile, refreshUser, token } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [profilePicDialogOpen, setProfilePicDialogOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [profileImg, setProfileImg] = useState(user?.profileImg ?? '');
  const [coverBanner, setCoverBanner] = useState(user?.coverBanner ?? '');
  const [linkedin, setLinkedin] = useState(user?.linkedin ?? '');
  const [github, setGithub] = useState(user?.github ?? '');
  const [instagram, setInstagram] = useState(user?.instagram ?? '');
  const [youtube, setYoutube] = useState(user?.youtube ?? '');
  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setUsername(user?.username ?? '');
    setBio(user?.bio ?? '');
    setProfileImg(user?.profileImg ?? '');
    setCoverBanner(user?.coverBanner ?? '');
    setLinkedin(user?.linkedin ?? '');
    setGithub(user?.github ?? '');
    setInstagram(user?.instagram ?? '');
    setYoutube(user?.youtube ?? '');
  }, [user]);

  const handleCoverUploadSuccess = async (url: string) => {
    setCoverBanner(url);
    try {
      await updateProfile({ coverBanner: url });
    } catch {
      // already set in state; user can Save again if needed
    }
  };

  const handleProfilePicUploadSuccess = async (url: string) => {
    setProfileImg(url);
    try {
      await updateProfile({ profileImg: url });
    } catch {
      // already set in state; user can Save again if needed
    }
  };
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        profileImg: profileImg.trim() || undefined,
        coverBanner: coverBanner.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        github: github.trim() || undefined,
        instagram: instagram.trim() || undefined,
        youtube: youtube.trim() || undefined,
      });
      toast.success('Profile updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">Sign in to edit your profile.</p>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {/* Overlapping header with cover + avatar + edit icons */}
      <section className="rounded-lg border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] overflow-hidden">
        <div className="relative h-40 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          {coverBanner ? (
            <img
              src={coverBanner}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : null}
          <button
            type="button"
            onClick={() => setCoverDialogOpen(true)}
            className="absolute right-3 bottom-3 inline-flex items-center justify-center rounded-full bg-black/70 border border-white/40 text-white size-8 hover:bg-black/90 transition-colors"
            aria-label="Edit cover image"
          >
            <Camera className="size-4" />
          </button>
        </div>
        <div className="px-5 pb-4 pt-0">
          <div className="flex items-end gap-4 -mt-10">
            <div className="relative">
              <div className="size-20 md:size-24 rounded-xl border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] bg-muted overflow-hidden">
                <img
                  src={profileImg || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setProfilePicDialogOpen(true)}
                className="absolute -right-1 -bottom-1 inline-flex items-center justify-center size-7 rounded-full bg-primary text-primary-foreground border border-border shadow-[2px_2px_0px_0px_var(--border)] hover:brightness-110 transition"
                aria-label="Edit profile photo"
              >
                <Camera className="size-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight truncate">
                {user.fullName || user.username || user.email}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-xl">
                Update your photo, cover, bio, username and social links.
              </p>
            </div>
          </div>
        </div>
      </section>

      <UploadCoverDialog
        open={coverDialogOpen}
        onClose={() => setCoverDialogOpen(false)}
        token={token ?? ''}
        onSuccess={handleCoverUploadSuccess}
      />
      <UploadProfilePicDialog
        open={profilePicDialogOpen}
        onClose={() => setProfilePicDialogOpen(false)}
        token={token ?? ''}
        onSuccess={handleProfilePicUploadSuccess}
      />

      {/* Basic info — card */}
      <section className="rounded-lg border-2 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">Basic information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Full name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your display name" className="w-full p-3 border-2 border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm transition-shadow" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. johndoe" className="w-full p-3 border-2 border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm transition-shadow" />
            <p className="text-[9px] text-muted-foreground">Unique, letters and numbers only. No spaces.</p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Short bio</label>
          <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the world what you're building..." className="w-full p-3 border-2 border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm resize-none transition-shadow" />
        </div>
      </section>

      {/* Social links — card */}
      <section className="rounded-lg border-2 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">Social links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">LinkedIn</label>
            <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." className="w-full p-3 border-2 border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">GitHub</label>
            <input type="url" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." className="w-full p-3 border-2 border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Instagram</label>
            <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." className="w-full p-3 border-2 border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">YouTube</label>
            <input type="url" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/..." className="w-full p-3 border-2 border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm" />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => refreshUser()} className="px-5 py-2.5 font-bold text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors rounded-md border border-transparent hover:border-border">
          Reset
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-primary text-primary-foreground border-2 border-border font-black text-[11px] uppercase tracking-widest rounded-md shadow-[4px_4px_0px_0px_var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function SecurityEmailContent() {
  const { user, token, refreshUser } = useAuthStore();
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'enter' | 'verify'>('enter');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendCode = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid new email address.');
      return;
    }
    if (!token) {
      toast.error('You must be logged in to change email.');
      return;
    }
    setSending(true);
    try {
      await authApi.initEmailChange(token, email);
      toast.success('Verification code sent to your current and new email.');
      setStep('verify');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send code.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length !== 6) {
      toast.error('Enter the 6-digit code.');
      return;
    }
    if (!token) return;
    setVerifying(true);
    try {
      await authApi.verifyEmailChange(token, trimmed);
      toast.success('Email updated. All OAuth providers have been unlinked.');
      setNewEmail('');
      setCode('');
      setStep('enter');
      await refreshUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Update email</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Change the email address for your account. A verification code will be sent to your current and new email.
        </p>
      </header>
      <FormSection title="Current email">
        <p className="font-bold text-sm">{user?.email ?? '—'}</p>
      </FormSection>
      <FormSection title="New email">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">New email address</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              disabled={step === 'verify'}
              className="w-full max-w-md p-3 border-2 border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm"
            />
          </div>
          {step === 'enter' ? (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending}
              className="px-4 py-2 rounded-md border-2 border-primary bg-primary text-primary-foreground font-bold text-[10px] uppercase hover:opacity-90 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send verification code'}
            </button>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full max-w-[8rem] p-3 border-2 border-border bg-background rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-sm tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setStep('enter'); setCode(''); }}
                  className="px-4 py-2 rounded-md border-2 border-border font-bold text-[10px] uppercase text-muted-foreground hover:bg-muted/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying}
                  className="px-4 py-2 rounded-md border-2 border-primary bg-primary text-primary-foreground font-bold text-[10px] uppercase hover:opacity-90 disabled:opacity-50"
                >
                  {verifying ? 'Updating…' : 'Verify and update email'}
                </button>
              </div>
            </>
          )}
        </div>
      </FormSection>
      <p className="text-xs text-muted-foreground">After updating, all connected OAuth accounts (Google, GitHub, etc.) will be unlinked. You can connect them again using your new email.</p>
    </div>
  );
}

function ConnectedAccountsContent() {
  const { user, logout, token, refreshUser } = useAuthStore();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '') : '';

  const handleDisconnect = async (provider: string) => {
    if (!token) return;
    setDisconnecting(provider);
    try {
      await authApi.disconnectProvider(token, provider);
      toast.success(`${provider} disconnected. You have been logged out.`);
      await logout();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to disconnect.');
    } finally {
      setDisconnecting(null);
    }
  };

  const handleConnect = async (id: string) => {
    if (!token) return;
    if (id === 'apple') {
      if (apiBase) window.location.href = `${apiBase}/auth/apple`;
      return;
    }
    setLinkingProvider(id);
    try {
      const data = await authApi.getLinkRedirectUrl(token, id as 'google' | 'github' | 'facebook' | 'x');
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
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
    { id: 'google', label: 'Google', linked: user?.isGoogleAccount },
    { id: 'github', label: 'GitHub', linked: user?.isGitAccount },
    { id: 'facebook', label: 'Facebook', linked: user?.isFacebookAccount },
    { id: 'x', label: 'X', linked: user?.isXAccount },
    { id: 'apple', label: 'Apple', linked: user?.isAppleAccount },
  ] as const;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Connected accounts</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Link or unlink OAuth providers (Google, GitHub, Facebook, X, Apple). Unlinking will log you out on this device.
        </p>
      </header>
      <FormSection title="Providers">
        <ul className="space-y-3">
          {providers.map(({ id, label, linked }) => {
            const Icon = PROVIDER_ICONS[id] ?? Plug;
            return (
              <li key={id} className="flex items-center justify-between gap-4 p-4 rounded-lg border-2 border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-9 rounded-md bg-background border border-border">
                    <Icon className="size-4 text-muted-foreground" />
                  </span>
                  <span className="font-bold text-sm">{label}</span>
                  {linked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-primary">
                      <Check className="size-3" /> Connected
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {linked ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(id)}
                      disabled={disconnecting === id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border-2 border-destructive text-destructive font-bold text-[10px] uppercase hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <Unlink className="size-3" />
                      {disconnecting === id ? '…' : 'Unlink'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(id)}
                      disabled={linkingProvider !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border-2 border-primary bg-primary text-primary-foreground font-bold text-[10px] uppercase hover:opacity-90 disabled:opacity-50"
                    >
                      <Link2 className="size-3" />
                      {linkingProvider === id ? 'Redirecting…' : 'Connect'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </FormSection>
    </div>
  );
}

function StackAndToolsContent() {
  const { user, updateProfile } = useAuthStore();
  const [items, setItems] = useState<string[]>(user?.stackAndTools ?? []);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const suggestions = useMemo(() => searchTechStack(input, 12), [input]);
  const showSuggestions = open && input.trim().length >= 2;

  useEffect(() => {
    setItems(user?.stackAndTools ?? []);
  }, [user?.stackAndTools]);

  const addByName = (name: string) => {
    if (name && !items.includes(name)) setItems([...items, name]);
    setInput('');
    setOpen(false);
    setHighlight(0);
  };

  const selectSuggestion = (item: TechStackItem) => {
    addByName(item.name);
  };

  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ stackAndTools: items });
      toast.success('Stack & tools updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        const v = input.trim();
        if (v && !items.includes(v)) addByName(v);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h < suggestions.length - 1 ? h + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h > 0 ? h - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectSuggestion(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(0);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Stack & Tools</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">Search and add your tech stack. Suggestions show icon and category (Frontend, Backend, etc.).</p>
      </header>
      <FormSection title="Add tools">
        <div className="flex flex-wrap gap-3">
          {items.map((t, i) => {
            const iconUrl = getSkillIconUrl(t);
            return (
              <span key={i} className="inline-flex items-center gap-2 px-2 py-1.5 border-2 border-border bg-muted/30 font-bold text-[10px] uppercase">
                {iconUrl && (
                  <img src={iconUrl} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                {t}
                <button type="button" onClick={() => remove(i)} className="text-destructive hover:underline ml-0.5">×</button>
              </span>
            );
          })}
        </div>
        <div className="relative mt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            onKeyDown={onKeyDown}
            placeholder="e.g. rea → React, React Native, React Router…"
            className="w-full p-2 border-2 border-border bg-background font-bold text-sm pr-24"
          />
          <button
            type="button"
            onClick={() => { const v = input.trim(); if (v && !items.includes(v)) addByName(v); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 border-2 border-border font-bold text-[10px] uppercase bg-card hover:bg-muted"
          >
            Add
          </button>
          {showSuggestions && (
            <ul className="absolute z-50 left-0 right-0 mt-1 border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] max-h-72 overflow-y-auto">
              {suggestions.map((item, i) => (
                <li key={`${item.name}-${item.category}-${i}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(item); }}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left border-b border-border last:border-b-0',
                      i === highlight ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                    )}
                  >
                    <img
                      src={getSkillIconUrlBySlug(item.slug)}
                      alt=""
                      className="w-8 h-8 object-contain shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="font-bold text-sm flex-1">{item.name}</span>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground shrink-0">{item.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FormSection>
      <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary text-primary-foreground border-2 border-border font-black text-[11px] uppercase">Save</button>
    </div>
  );
}

function MySetupContent() {
  const { user, updateProfile } = useAuthStore();
  const [text, setText] = useState(user?.mySetup ?? '');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setText(user?.mySetup ?? '');
  }, [user?.mySetup]);
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ mySetup: text });
      toast.success('My setup updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">My Setup</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">Share your setup (e.g. editor, OS, hardware).</p>
      </header>
      <FormSection title="Setup description">
        <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe your dev setup..." className="w-full p-2.5 border-2 border-border bg-background font-bold text-sm resize-none" />
      </FormSection>
      <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary text-primary-foreground border-2 border-border font-black text-[11px] uppercase">Save</button>
    </div>
  );
}

function WorkExperiencesContent() {
  const { user, updateProfile } = useAuthStore();
  const [list, setList] = useState<{ company: string; role: string; startDate: string; endDate: string; description: string }[]>(
    (user?.workExperiences ?? []).map((w) => ({ company: w.company ?? '', role: w.role ?? '', startDate: w.startDate ?? '', endDate: w.endDate ?? '', description: w.description ?? '' }))
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setList((user?.workExperiences ?? []).map((w) => ({ company: w.company ?? '', role: w.role ?? '', startDate: w.startDate ?? '', endDate: w.endDate ?? '', description: w.description ?? '' })));
  }, [user?.workExperiences]);
  const add = () => setList([...list, { company: '', role: '', startDate: '', endDate: '', description: '' }]);
  const update = (i: number, field: string, value: string) => {
    setList(list.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };
  const remove = (i: number) => setList(list.filter((_, idx) => idx !== i));
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ workExperiences: list.filter((e) => e.company.trim()) });
      toast.success('Work experiences updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Work experiences</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">Add work experience.</p>
      </header>
      <FormSection title="Entries">
        {list.map((e, i) => (
          <div key={i} className="grid gap-2 p-3 border-2 border-border bg-muted/20">
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Company" value={e.company} onChange={(ev) => update(i, 'company', ev.target.value)} className="p-2 border border-border text-sm" />
              <input placeholder="Role" value={e.role} onChange={(ev) => update(i, 'role', ev.target.value)} className="p-2 border border-border text-sm" />
              <input placeholder="Start" value={e.startDate} onChange={(ev) => update(i, 'startDate', ev.target.value)} className="p-2 border border-border text-sm" />
              <input placeholder="End" value={e.endDate} onChange={(ev) => update(i, 'endDate', ev.target.value)} className="p-2 border border-border text-sm" />
            </div>
            <textarea placeholder="Description" value={e.description} onChange={(ev) => update(i, 'description', ev.target.value)} rows={2} className="p-2 border border-border text-sm resize-none" />
            <div className="flex justify-end">
              <button type="button" onClick={() => remove(i)} className="text-[10px] text-destructive font-bold uppercase">Remove</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={add} className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border font-bold text-[10px] uppercase">
          <Plus className="size-3" /> Add experience
        </button>
      </FormSection>
      <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary text-primary-foreground border-2 border-border font-black text-[11px] uppercase">Save</button>
    </div>
  );
}

function EducationContent() {
  const { user, updateProfile } = useAuthStore();
  const [list, setList] = useState<{ school: string; degree: string; field: string; startYear: number | ''; endYear: number | '' }[]>(
    (user?.education ?? []).map((e) => ({ school: e.school ?? '', degree: e.degree ?? '', field: e.field ?? '', startYear: e.startYear ?? '', endYear: e.endYear ?? '' }))
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setList((user?.education ?? []).map((e) => ({ school: e.school ?? '', degree: e.degree ?? '', field: e.field ?? '', startYear: e.startYear ?? '', endYear: e.endYear ?? '' })));
  }, [user?.education]);
  const add = () => setList([...list, { school: '', degree: '', field: '', startYear: '', endYear: '' }]);
  const update = (i: number, field: string, value: string | number) => {
    setList(list.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };
  const remove = (i: number) => setList(list.filter((_, idx) => idx !== i));
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ education: list.filter((e) => e.school.trim()).map((e) => ({ ...e, startYear: e.startYear === '' ? undefined : e.startYear, endYear: e.endYear === '' ? undefined : e.endYear })) });
      toast.success('Education updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Education</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">Add education.</p>
      </header>
      <FormSection title="Entries">
        {list.map((e, i) => (
          <div key={i} className="grid gap-2 p-3 border-2 border-border bg-muted/20">
            <input placeholder="School" value={e.school} onChange={(ev) => update(i, 'school', ev.target.value)} className="p-2 border border-border text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Degree" value={e.degree} onChange={(ev) => update(i, 'degree', ev.target.value)} className="p-2 border border-border text-sm" />
              <input placeholder="Field" value={e.field} onChange={(ev) => update(i, 'field', ev.target.value)} className="p-2 border border-border text-sm" />
              <input type="number" placeholder="Start year" value={e.startYear} onChange={(ev) => update(i, 'startYear', ev.target.value === '' ? '' : Number(ev.target.value))} className="p-2 border border-border text-sm" />
              <input type="number" placeholder="End year" value={e.endYear} onChange={(ev) => update(i, 'endYear', ev.target.value === '' ? '' : Number(ev.target.value))} className="p-2 border border-border text-sm" />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => remove(i)} className="text-[10px] text-destructive font-bold uppercase">Remove</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={add} className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border font-bold text-[10px] uppercase">
          <Plus className="size-3" /> Add education
        </button>
      </FormSection>
      <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary text-primary-foreground border-2 border-border font-black text-[11px] uppercase">Save</button>
    </div>
  );
}

function ProjectsContent() {
  const { user, updateProfile } = useAuthStore();
  const [list, setList] = useState<{ name: string; url: string; description: string }[]>(
    (user?.projects ?? []).map((p) => ({ name: p.name ?? '', url: p.url ?? '', description: p.description ?? '' }))
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setList((user?.projects ?? []).map((p) => ({ name: p.name ?? '', url: p.url ?? '', description: p.description ?? '' })));
  }, [user?.projects]);
  const add = () => setList([...list, { name: '', url: '', description: '' }]);
  const update = (i: number, field: string, value: string) => {
    setList(list.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };
  const remove = (i: number) => setList(list.filter((_, idx) => idx !== i));
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ projects: list.filter((e) => e.name.trim()) });
      toast.success('Projects updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Projects</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">Add your projects.</p>
      </header>
      <FormSection title="Entries">
        {list.map((e, i) => (
          <div key={i} className="grid gap-2 p-3 border-2 border-border bg-muted/20">
            <input placeholder="Project name" value={e.name} onChange={(ev) => update(i, 'name', ev.target.value)} className="p-2 border border-border text-sm" />
            <input placeholder="URL" value={e.url} onChange={(ev) => update(i, 'url', ev.target.value)} className="p-2 border border-border text-sm" />
            <textarea placeholder="Description" value={e.description} onChange={(ev) => update(i, 'description', ev.target.value)} rows={2} className="p-2 border border-border text-sm resize-none" />
            <div className="flex justify-end">
              <button type="button" onClick={() => remove(i)} className="text-[10px] text-destructive font-bold uppercase">Remove</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={add} className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border font-bold text-[10px] uppercase">
          <Plus className="size-3" /> Add project
        </button>
      </FormSection>
      <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary text-primary-foreground border-2 border-border font-black text-[11px] uppercase">Save</button>
    </div>
  );
}

function OpenSourceContent() {
  const { user, updateProfile } = useAuthStore();
  const [list, setList] = useState<{ repo: string; description: string; url: string }[]>(
    (user?.openSourceContributions ?? []).map((c) => ({ repo: c.repo ?? '', description: c.description ?? '', url: c.url ?? '' }))
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setList((user?.openSourceContributions ?? []).map((c) => ({ repo: c.repo ?? '', description: c.description ?? '', url: c.url ?? '' })));
  }, [user?.openSourceContributions]);
  const add = () => setList([...list, { repo: '', description: '', url: '' }]);
  const update = (i: number, field: string, value: string) => {
    setList(list.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };
  const remove = (i: number) => setList(list.filter((_, idx) => idx !== i));
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ openSourceContributions: list.filter((e) => e.repo?.trim() || e.description?.trim()) });
      toast.success('Open source contributions updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Open source</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">Contribute and share your open source work.</p>
      </header>
      <FormSection title="Contributions">
        {list.map((e, i) => (
          <div key={i} className="grid gap-2 p-3 border-2 border-border bg-muted/20">
            <input placeholder="Repo or project" value={e.repo} onChange={(ev) => update(i, 'repo', ev.target.value)} className="p-2 border border-border text-sm" />
            <input placeholder="URL" value={e.url} onChange={(ev) => update(i, 'url', ev.target.value)} className="p-2 border border-border text-sm" />
            <textarea placeholder="Description" value={e.description} onChange={(ev) => update(i, 'description', ev.target.value)} rows={2} className="p-2 border border-border text-sm resize-none" />
            <div className="flex justify-end">
              <button type="button" onClick={() => remove(i)} className="text-[10px] text-destructive font-bold uppercase">Remove</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={add} className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border font-bold text-[10px] uppercase">
          <Plus className="size-3" /> Add contribution
        </button>
      </FormSection>
      <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary text-primary-foreground border-2 border-border font-black text-[11px] uppercase">Save</button>
    </div>
  );
}

function SkeletonBar({ width = '100%', className }: { width?: string; className?: string }) {
  return (
    <div
      className={cn('h-2.5 rounded-sm bg-muted animate-pulse', className)}
      style={{ width }}
    />
  );
}

function SidebarSkeleton({ itemCount }: { itemCount: number }) {
  return (
    <div className="space-y-4">
      {/* Profile skeleton */}
      <div className="border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-4 flex items-center gap-3">
        <div className="size-10 rounded bg-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBar width="70%" />
          <SkeletonBar width="50%" className="h-2" />
        </div>
      </div>
      {/* Nav skeleton */}
      <div className="border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-3 space-y-2">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-1 py-1.5">
            <div className="size-4 rounded bg-muted animate-pulse shrink-0" />
            <SkeletonBar width={`${45 + Math.random() * 40}%`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CollapsedSkeleton({ itemCount }: { itemCount: number }) {
  return (
    <div className="space-y-4">
      <div className="border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-2 flex justify-center">
        <div className="size-10 rounded bg-muted animate-pulse" />
      </div>
      <div className="border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] py-1">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="flex justify-center py-2.5">
            <div className="size-4 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-3">
        <SkeletonBar width="40%" className="h-6" />
        <SkeletonBar width="65%" className="h-3" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <SkeletonBar width="30%" className="h-2" />
          <div className="h-32 bg-muted/30 rounded-sm" />
        </div>
        <div className="space-y-3">
          <SkeletonBar width="25%" className="h-2" />
          <div className="flex items-center gap-4">
            <div className="size-20 bg-muted/30 rounded-sm" />
            <SkeletonBar width="80px" className="h-8" />
          </div>
        </div>
      </div>
      <div className="space-y-4 pt-6 border-t-2 border-border/20">
        <SkeletonBar width="25%" className="h-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SkeletonBar width="20%" className="h-2" />
            <div className="h-10 bg-muted/30 rounded-sm" />
          </div>
          <div className="space-y-2">
            <SkeletonBar width="20%" className="h-2" />
            <div className="h-10 bg-muted/30 rounded-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <SkeletonBar width="15%" className="h-2" />
          <div className="h-24 bg-muted/30 rounded-sm" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-6 border-t-2 border-border/20">
        <SkeletonBar width="80px" className="h-10" />
        <SkeletonBar width="120px" className="h-10" />
      </div>
    </div>
  );
}

type TransitionPhase = 'idle' | 'fade-out' | 'skeleton' | 'fade-in';

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen: isSidebarOpen } = useSidebar();
  const { user, token, isHydrated, shouldBlock } = useRequireAuth();
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const collapsed = isSidebarOpen;
  const [activeSection, setActiveSection] = useState<SectionId>('edit-profile');
  const [contentLoading, setContentLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Account: true,
    Security: true,
    Other: true,
  });

  useEffect(() => {
    const error = searchParams.get('error');
    const linked = searchParams.get('linked');
    if (error) {
      toast.error(decodeURIComponent(error));
      router.replace('/settings', { scroll: false });
    } else if (linked) {
      refreshUser();
      toast.success(`${decodeURIComponent(linked)} connected successfully.`);
      router.replace('/settings', { scroll: false });
    }
  }, [searchParams, router, refreshUser]);

  const handleSectionChange = (id: SectionId) => {
    if (id === activeSection) return;
    setContentLoading(true);
    setActiveSection(id);
    setTimeout(() => setContentLoading(false), 400);
  };

  const prevCollapsed = useRef(collapsed);
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const [renderCollapsed, setRenderCollapsed] = useState(collapsed);

  const totalItems = NAV_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  useEffect(() => {
    if (prevCollapsed.current === collapsed) return;
    prevCollapsed.current = collapsed;

    setPhase('fade-out');
    const t1 = setTimeout(() => {
      setPhase('skeleton');
      setRenderCollapsed(collapsed);
    }, 150);
    const t2 = setTimeout(() => setPhase('fade-in'), 450);
    const t3 = setTimeout(() => setPhase('idle'), 600);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [collapsed]);

  const toggleGroup = (heading: string) => {
    setOpenGroups((prev) => ({ ...prev, [heading]: !prev[heading] }));
  };

  const activeItemLabel = useMemo(() => {
    return NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeSection)?.label;
  }, [activeSection]);

  // Use skeleton layout instead of a second terminal loader (avoids double loader with GlobalLoaderOverlay)
  if (!isHydrated || shouldBlock) {
    return (
      <div className="min-h-screen text-foreground font-sans">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="grid items-start gap-6 grid-cols-1 lg:grid-cols-[auto_1fr]">
            <aside className={cn('overflow-hidden', collapsed ? 'w-14' : 'w-64')}>
              {collapsed ? (
                <CollapsedSkeleton itemCount={totalItems + 1} />
              ) : (
                <SidebarSkeleton itemCount={totalItems + 1} />
              )}
            </aside>
            <main className="min-w-0">
              <div className="border-2 border-border bg-card p-6 md:p-10 shadow-[8px_8px_0px_0px_var(--border)] min-h-[600px]">
                <ContentSkeleton />
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  const contentOpacity = phase === 'fade-out' || phase === 'skeleton' ? 0 : 1;
  const showSkeleton = phase === 'skeleton';

  return (
    <div className="min-h-screen text-foreground font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid items-start gap-6 grid-cols-1 lg:grid-cols-[auto_1fr]">

          {/* SIDEBAR */}
          <motion.aside
            className="lg:sticky lg:top-8 overflow-hidden"
            animate={{ width: renderCollapsed ? 56 : 256 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {showSkeleton ? (
              renderCollapsed
                ? <CollapsedSkeleton itemCount={totalItems + 1} />
                : <SidebarSkeleton itemCount={totalItems + 1} />
            ) : (
              <div
                className="space-y-4 transition-opacity duration-150 ease-in-out"
                style={{ opacity: contentOpacity }}
              >
                {/* Profile Brief */}
                <div className={cn(
                  'border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-3 overflow-hidden',
                  renderCollapsed ? 'p-2 justify-center' : 'p-4'
                )}>
                  <div className="size-10 border-2 border-border shrink-0 bg-muted overflow-hidden">
                    <img src={user?.profileImg || user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  {!renderCollapsed && (
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase truncate whitespace-nowrap">{user?.fullName || user?.name || 'Account'}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter whitespace-nowrap">@{user?.username || 'user'}</p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <nav className="border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] divide-y-2 divide-border overflow-hidden">
                  {renderCollapsed ? (
                    <>
                      <div className="py-1">
                        {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
                          const Icon = item.icon;
                          const isActive = activeSection === item.id;
                          return (
                            <button
                              key={item.id}
                          onClick={() => handleSectionChange(item.id)}
                          title={item.label}
                              className={cn(
                                'w-full flex items-center justify-center py-2.5 transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                              )}
                            >
                              <Icon className="size-4" />
                            </button>
                          );
                        })}
                      </div>
                      <button title="Log Out" className="w-full flex items-center justify-center py-3 text-destructive hover:bg-destructive/5 transition-colors">
                        <LogOut className="size-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      {NAV_GROUPS.map((group) => {
                        const isOpen = !!openGroups[group.heading];
                        return (
                          <div key={group.heading} className="flex flex-col">
                            <button
                              onClick={() => toggleGroup(group.heading)}
                              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                            >
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                {group.heading}
                              </span>
                              <motion.span
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                              >
                                <ChevronDown className="size-3" />
                              </motion.span>
                            </button>

                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  key="content"
                                  initial="collapsed"
                                  animate="expanded"
                                  exit="collapsed"
                                  variants={accordionVariants}
                                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                  className="overflow-hidden"
                                >
                                  <div className="pb-2">
                                    {group.items.map((item) => {
                                      const Icon = item.icon;
                                      const isActive = activeSection === item.id;
                                      return (
                                        <button
                                          key={item.id}
                                          onClick={() => handleSectionChange(item.id)}
                                          className={cn(
                                            'w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold transition-all border-l-4',
                                            isActive
                                              ? 'bg-primary/5 border-primary text-primary'
                                              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                          )}
                                        >
                                          <Icon className={cn('size-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/60')} />
                                          <span className="whitespace-nowrap">{item.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}

                      <button className="w-full flex items-center gap-3 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5 transition-colors">
                        <LogOut className="size-4" /> Log Out
                      </button>
                    </>
                  )}
                </nav>
              </div>
            )}
          </motion.aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0">
            <div className="border-2 border-border bg-card p-6 md:p-10 shadow-[8px_8px_0px_0px_var(--border)] min-h-[600px]">
              <AnimatePresence mode="wait">
                {contentLoading ? (
                  <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ContentSkeleton />
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeSection === 'edit-profile' && <EditProfileContent />}
                    {activeSection === 'stack-tools' && <StackAndToolsContent />}
                    {activeSection === 'my-setup' && <MySetupContent />}
                    {activeSection === 'work-experiences' && <WorkExperiencesContent />}
                    {activeSection === 'education' && <EducationContent />}
                    {activeSection === 'projects' && <ProjectsContent />}
                    {activeSection === 'open-source' && <OpenSourceContent />}
                    {activeSection === 'security-email' && <SecurityEmailContent />}
                    {activeSection === 'connected-accounts' && <ConnectedAccountsContent />}
                    {activeSection === 'syntax-card' && <SyntaxCardContent />}
                    {activeSection === 'notifications' && (
                      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                        <div className="size-16 bg-muted flex items-center justify-center border-2 border-border mb-4">
                          <Settings className="size-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-black uppercase">{activeItemLabel}</h2>
                        <p className="text-sm text-muted-foreground mt-2 font-medium">Coming soon.</p>
                      </div>
                    )}
                    {!['edit-profile', 'stack-tools', 'my-setup', 'work-experiences', 'education', 'projects', 'open-source', 'security-email', 'connected-accounts', 'syntax-card', 'notifications'].includes(activeSection) && (
                      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                        <div className="size-16 bg-muted flex items-center justify-center border-2 border-border mb-4">
                          <Settings className="size-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-black uppercase">{activeItemLabel}</h2>
                        <p className="text-sm text-muted-foreground mt-2 font-medium">Coming soon.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
